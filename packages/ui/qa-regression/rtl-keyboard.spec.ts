import { expect, test } from '@playwright/test'
import { up } from './helpers'

// RTL 键盘回归：浏览器真实方向键事件 + 组件 RTL 镜像逻辑，补单测无法覆盖的
// 「焦点落在 shadow 内、方向键由浏览器/组件共同裁决」路径。

test('tabs：dir=rtl 下 ArrowRight 移向上一个 tab', async ({ page }) => {
  await page.addInitScript(() => document.documentElement.setAttribute('dir', 'rtl'))
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs')
  const result = await page.evaluate(async () => {
    const el = document.querySelector('oas-tabs') as HTMLElement & { shadowRoot: ShadowRoot }
    // 宿主在运行时把会话/页面切到 RTL：用带 dir 的父容器重新挂载，触发 connectedCallback 重算方向
    const rtlHost = document.createElement('div')
    rtlHost.setAttribute('dir', 'rtl')
    el.replaceWith(rtlHost)
    rtlHost.appendChild(el)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const before = [...el.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"][data-value]')]
    el.setAttribute('active', before[1]?.getAttribute('data-value') ?? '')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const tabs = [...el.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"][data-value]')]
    const tablist = el.shadowRoot.querySelector<HTMLElement>('[role="tablist"]')!
    tabs[1]?.focus()
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    const after = [...el.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"][data-value]')]
    return {
      rtl: el.hasAttribute('data-rtl'),
      focused: after.findIndex((tab) => tab === el.shadowRoot.activeElement),
    }
  })
  expect(result.rtl, 'tabs 应识别 documentElement 的 dir=rtl').toBe(true)
  expect(result.focused, 'RTL 下 ArrowRight 应向左移动（上一个 tab）').toBe(0)
})

test('slider：dir=rtl 下 ArrowRight 降低数值（视觉方向一致）', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider')
  const result = await page.evaluate(async () => {
    const el = [...document.querySelectorAll<HTMLElement & { shadowRoot: ShadowRoot }>('oas-slider')].find(
      (host) =>
        !host.hasAttribute('range') &&
        !host.hasAttribute('vertical') &&
        !host.hasAttribute('reverse') &&
        !host.hasAttribute('disabled'),
    )
    if (!el) return null
    el.setAttribute('dir', 'rtl')
    el.setAttribute('value', '50')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const input = el.shadowRoot.querySelector<HTMLInputElement>('[data-role="range"]')
    if (!input) return null
    input.focus()
    return { before: Number(input.value), dir: input.dir }
  })
  expect(result, '需要至少一个可用的水平 slider').not.toBeNull()
  expect(result!.dir).toBe('rtl')
  await page.keyboard.press('ArrowRight')
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[dir="rtl"]') as HTMLElement & { shadowRoot: ShadowRoot }
    return Number(el.shadowRoot.querySelector<HTMLInputElement>('[data-role="range"]')!.value)
  })
  expect(after, 'RTL 下 ArrowRight 应向低值方向移动').toBe(result!.before - 1)
})
