// 复核回归：qrcode——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('qrcode：role=img 与 aria-label 落在图形元素上，expired 刷新按钮仍可点并派发 oas-refresh', async ({ page }) => {
  // 曾现风险：图形语义挂在外层容器 → 与容器内刷新按钮构成交互嵌套（axe: nested-interactive）；
  // 修法是把 role=img 挪到 <svg> 自身，本断言同时固化解耦与刷新行为不回归
  await page.goto('/components/qrcode.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#qrcode-status')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#qrcode-status') as HTMLElement & { shadowRoot: ShadowRoot }
    const wrapper = host.shadowRoot.querySelector('[part="wrapper"]') as HTMLElement
    const svg = host.shadowRoot.querySelector('svg') as SVGSVGElement
    const refresh = host.shadowRoot.querySelector('[part="refresh"]') as HTMLButtonElement
    let fired = 0
    host.addEventListener('oas-refresh', () => fired++)
    const label = svg.getAttribute('aria-label')
    // 点前读可见性：demo 的 refresh 处理会把状态切走
    const refreshHidden = refresh.hidden
    refresh.click()
    await new Promise((res) => setTimeout(res, 0))
    return {
      wrapperRole: wrapper.getAttribute('role'),
      svgRole: svg.getAttribute('role'),
      label,
      refreshHidden,
      fired,
    }
  })
  expect(r.wrapperRole, '容器保持普通容器语义').toBe(null)
  expect(r.svgRole, '图形语义挂在 <svg> 上').toBe('img')
  expect(r.label, '图形元素应有可访问名').toBeTruthy()
  expect(r.refreshHidden, 'expired 状态下刷新按钮可见').toBe(false)
  expect(r.fired, '点击刷新按钮应派发 oas-refresh').toBe(1)
})
