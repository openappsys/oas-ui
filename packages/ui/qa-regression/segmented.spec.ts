// 复核回归：segmented——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { up } from './helpers'

test('segmented 未选中项文字对比度达标（text-primary，axe 色彩对比回归）', async ({ page }) => {
  // 曾现 bug：oas-segmented 未选中项用 --oas-color-text-secondary（#71717a）落在
  // --oas-color-bg-hover（#f4f4f5）上对比度 4.39:1 < 4.5:1，form.html 栅格表单 demo
  // 用 segmented 切 label-align 时被 axe 审计揪出；修复为 text-primary。
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-segmented#form-align-switch')
  const r = await page.evaluate(() => {
    const seg = document.querySelector('#form-align-switch')!
    const root = seg.shadowRoot!
    const items = [...root.querySelectorAll<HTMLElement>('[part="item"]')]
    const group = root.querySelector<HTMLElement>('.group')!
    return {
      unselectedColor: getComputedStyle(items[1]!).color,
      groupBg: getComputedStyle(group).backgroundColor, // 轨道色，item 与之构成对比对
      selectedChecked: items.find((b) => b.querySelector('input')!.checked)?.querySelector('input')?.checked ?? null,
    }
  })
  // 未选中项应为 text-primary（#18181b），而非 text-secondary（#71717a）——
  // 与 bg-hover 轨道（#f4f4f5）的对比从 4.39:1 提升到 >15:1
  expect(r.unselectedColor).toBe('rgb(24, 24, 27)')
  expect(r.groupBg).toBe('rgb(244, 244, 245)')
  expect(r.selectedChecked).toBe(true)
})

// ===== 宿主可访问名转发：aria-label → 内部 radiogroup =====
// 选项文本是每个 radio 的名称，组本身无可见名称来源；不转发则读屏只播报「单选组」。
test('segmented 宿主 aria-label 转发到内部 radiogroup、运行时更新生效、axe 无违规', async ({ page }) => {
  await page.goto('/components/segmented.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-segmented'))
  await page.evaluate(() => {
    document.getElementById('e2e-seg-name')?.remove()
    const el = document.createElement('oas-segmented')
    el.id = 'e2e-seg-name'
    el.setAttribute('aria-label', '时间粒度')
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: '日', value: 'day' },
        { label: '周', value: 'week' },
        { label: '月', value: 'month' },
      ]),
    )
    el.style.cssText = 'position: fixed; top: 140px; left: 50%; transform: translateX(-50%); z-index: 2147483000'
    document.body.appendChild(el)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-segmented#e2e-seg-name')
    return !!el?.shadowRoot?.querySelector('[role="radiogroup"][aria-label]')
  })

  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-segmented#e2e-seg-name')! as HTMLElement & { shadowRoot: ShadowRoot }
    const group = el.shadowRoot.querySelector('[role="radiogroup"]') as HTMLElement
    return {
      inner: group.getAttribute('aria-label'),
      host: el.getAttribute('aria-label'),
      orientation: group.getAttribute('aria-orientation'),
      radios: el.shadowRoot.querySelectorAll('.item input[type="radio"]').length,
    }
  })
  expect(r.inner, '宿主 aria-label 应转发到内部 radiogroup').toBe('时间粒度')
  expect(r.host, '宿主属性保留（宿主框架下不剥离）').toBe('时间粒度')
  expect(r.orientation, '转发不覆盖既有 aria-orientation').toBe('horizontal')
  expect(r.radios, '选项仍为单选控件').toBe(3)

  const updated = await page.evaluate(() => {
    const el = document.querySelector('oas-segmented#e2e-seg-name')! as HTMLElement & { shadowRoot: ShadowRoot }
    el.setAttribute('aria-label', '视图切换')
    return (el.shadowRoot.querySelector('[role="radiogroup"]') as HTMLElement).getAttribute('aria-label')
  })
  expect(updated, '运行时更新 aria-label 即时转发').toBe('视图切换')

  const a11y = await new AxeBuilder({ page })
    .include('#e2e-seg-name')
    // 对比度由主题/视觉专项覆盖（dynamic 元素背景随主题变化会引入无关噪声）
    .disableRules(['color-contrast'])
    .analyze()
  expect(
    a11y.violations.map((v) => `${v.id}: ${v.nodes.length}`),
    '宿主命名转发不应引入 axe 违规',
  ).toEqual([])
})
