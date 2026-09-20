// 复核回归：kbd——keys 语义映射、slot 优先、variant/size/color 动态同步固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('kbd keys 语义键名映射：符号 + abbr 全称、字面键直出、加号连接、slot 内容优先', async ({ page }) => {
  await page.goto('/components/kbd.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kbd')
  const r = await page.evaluate(() => {
    const combo = [...document.querySelectorAll('oas-kbd')].find((el) => el.getAttribute('keys') === 'command shift k')!
    const keys = combo.shadowRoot!.querySelector('[part="keys"]')!
    const caps = [...keys.querySelectorAll<HTMLElement>('.key')]
    const slotKbd = [...document.querySelectorAll('oas-kbd')].find((el) => (el.textContent ?? '').includes('⌘C'))!
    return {
      capCount: caps.length,
      symbol: caps[0]!.textContent,
      abbrTitle: caps[0]!.querySelector('abbr')?.getAttribute('title') ?? '',
      literal: caps[2]!.textContent,
      sepCount: keys.querySelectorAll('.sep').length,
      slotKeysHidden: slotKbd.shadowRoot!.querySelector<HTMLElement>('[part="keys"]')!.hidden,
    }
  })
  expect(r.capCount, 'keys 按空格拆分三键').toBe(3)
  expect(r.symbol, 'command → ⌘ 符号').toBe('⌘')
  expect(r.abbrTitle, '键帽内 abbr title 提供读屏全称').toBe('Command')
  expect(r.literal, '未命中映射的键名按字面渲染').toBe('k')
  expect(r.sepCount, '多键间以 + 连接').toBe(2)
  expect(r.slotKeysHidden, 'slot 有内容时 keys 通道隐藏（slot 优先）').toBe(true)
})

test('kbd variant/size/color：静态档位 class 正确、连接后改属性 class 即时同步、预设色映射 token', async ({ page }) => {
  await page.goto('/components/kbd.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kbd')
  const r = await page.evaluate(() => {
    const kbdOf = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('[part="kbd"]')!
    const preset = document.querySelector('oas-kbd[color="red"]')!
    const outline = document.querySelector('oas-kbd[variant="outline"]')!
    // 动态同步：取首个无变体/尺寸/颜色的键帽，连接后改属性
    const dyn = [...document.querySelectorAll('oas-kbd')].find(
      (el) => !el.hasAttribute('variant') && !el.hasAttribute('size') && !el.hasAttribute('color'),
    )!
    dyn.setAttribute('variant', 'subtle')
    dyn.setAttribute('size', 'large')
    return {
      presetHasColor: kbdOf(preset).classList.contains('has-color'),
      presetVar: kbdOf(preset).style.getPropertyValue('--oas-kbd-color'),
      outlineClass: kbdOf(outline).className,
    }
  })
  expect(r.presetHasColor, 'color 预设名生效（has-color 染色钩子）').toBe(true)
  expect(r.presetVar, '预设色映射 --oas-preset-* token（文字走达标 -text token）').toContain('--oas-preset-red')
  expect(r.outlineClass, 'variant=outline 挂形态 class').toBe('outline')

  await expect
    .poll(() =>
      page.evaluate(() => {
        const dyn = [...document.querySelectorAll('oas-kbd')].find((el) => !el.hasAttribute('color'))!
        return dyn.shadowRoot!.querySelector('[part="kbd"]')!.className
      }),
    )
    .toBe('subtle large')
})
