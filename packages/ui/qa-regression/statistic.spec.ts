// 复核回归：statistic——loading 骨架与数值互斥显隐（首份回归固化）。
// 缺陷背景：update() 只切骨架 hidden，数值区内容可见性由 slot 判空决定，
// 导致 loading 时骨架与数值文本同时可见（用户看到两行重叠/并排）。
// 断言走真实布局（getBoundingClientRect + computed display），不接受「textContent 还在但看不见」。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('statistic loading：骨架真实可见、数值区（含 slot="value" 自定义内容）不可见；取消 loading 恢复', async ({
  page,
}) => {
  await page.goto('/components/statistic.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-statistic[loading]')

  // 注入受控实例：属性值 + slot 自定义值两路覆盖（slot 节点只有靠隐藏整个容器才藏得住）
  await page.evaluate(() => {
    const mk = (id: string, withSlot: boolean): void => {
      const el = document.createElement('oas-statistic')
      el.id = id
      el.setAttribute('value', '8846')
      el.setAttribute('loading', '')
      if (withSlot) el.innerHTML = '<span slot="value">自定义值</span>'
      document.body.insertBefore(el, document.body.firstChild)
    }
    mk('stat-loading-reg', false)
    mk('stat-loading-slot-reg', true)
  })
  await up(page, '#stat-loading-reg')
  await up(page, '#stat-loading-slot-reg')

  const read = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement
      const root = el.shadowRoot!
      const inner = root.querySelector('[part="value-inner"]') as HTMLElement
      const sk = root.querySelector('oas-skeleton') as HTMLElement
      const slotted = el.querySelector<HTMLElement>('[slot="value"]')
      const ir = inner.getBoundingClientRect()
      const sr = sk.getBoundingClientRect()
      const cr = slotted?.getBoundingClientRect()
      return {
        innerHiddenAttr: inner.hasAttribute('hidden'),
        innerDisplay: getComputedStyle(inner).display,
        innerW: ir.width,
        innerH: ir.height,
        skHiddenAttr: sk.hasAttribute('hidden'),
        skDisplay: getComputedStyle(sk).display,
        skW: sr.width,
        skH: sr.height,
        slotW: cr ? cr.width : null,
        slotH: cr ? cr.height : null,
        text: (inner.textContent ?? '').trim(),
      }
    }, sel)

  // 文档站 demo（<oas-statistic value="8846" loading>）同样互斥；
  // 注入实例插在 body 最前，必须排除它们，避免泛选择器实际又读到注入元素（假绿）
  const demo = await read('oas-statistic[loading]:not(#stat-loading-reg):not(#stat-loading-slot-reg)')
  expect(demo.skDisplay, 'loading 时骨架应显示').not.toBe('none')
  expect(demo.skW, '骨架应有实际宽度').toBeGreaterThan(0)
  expect(demo.innerDisplay, 'loading 时数值区应不可见').toBe('none')
  expect(demo.innerW, '数值区实际宽度应为 0').toBe(0)

  const attrCase = await read('#stat-loading-reg')
  expect(attrCase.skHiddenAttr, 'loading 时骨架不得带 hidden').toBe(false)
  expect(attrCase.skDisplay).not.toBe('none')
  expect(attrCase.skW, '骨架应有实际宽度').toBeGreaterThan(0)
  expect(attrCase.skH, '骨架应有实际高度').toBeGreaterThan(0)
  expect(attrCase.innerHiddenAttr, 'loading 时数值区容器应带 hidden').toBe(true)
  expect(attrCase.innerDisplay, 'loading 时数值区容器 computed display 应为 none').toBe('none')
  expect(attrCase.innerH, '数值区实际高度应为 0（不占位）').toBe(0)
  expect(attrCase.text, '数值文本仍在 DOM（隐藏靠容器，数据不变）').toContain('8,846')

  const slotCase = await read('#stat-loading-slot-reg')
  expect(slotCase.innerHiddenAttr, 'slot="value" 自定义内容同样不得与骨架并存').toBe(true)
  expect(slotCase.innerDisplay).toBe('none')
  // 分发节点本身在 light DOM，其可见性由 slot 所在的 hidden 容器决定 → 实际布局尺寸归零
  expect(slotCase.slotW, 'slot="value" 分发内容实际宽度应为 0').toBe(0)
  expect(slotCase.slotH, 'slot="value" 分发内容实际高度应为 0').toBe(0)
  expect(
    await page.evaluate(() => document.querySelector('#stat-loading-slot-reg')!.textContent ?? ''),
    '宿主 slot 节点仍在（数据不被搬走）',
  ).toContain('自定义值')

  // 取消 loading → 数值恢复可见、骨架隐藏
  await page.evaluate(() => document.querySelector('#stat-loading-reg')!.removeAttribute('loading'))
  await page.waitForFunction(() => {
    const el = document.querySelector('#stat-loading-reg') as HTMLElement
    const root = el.shadowRoot!
    const inner = root.querySelector('[part="value-inner"]') as HTMLElement
    const sk = root.querySelector('oas-skeleton') as HTMLElement
    return getComputedStyle(inner).display !== 'none' && getComputedStyle(sk).display === 'none'
  })
  const restored = await read('#stat-loading-reg')
  expect(restored.innerW, '取消 loading 后数值区应有实际宽度').toBeGreaterThan(0)
  expect(restored.skHiddenAttr, '取消 loading 后骨架应隐藏').toBe(true)
})
