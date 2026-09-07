// 复核回归：date-picker——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('date-picker / time-picker 面板贴输入框下方（:host 为定位祖先）', async ({ page }) => {
  // 曾现 bug：:host 缺 position: relative，[part=dropdown] 的 absolute 定位基准逃逸出 shadow，
  // top: calc(100% + 4px) 相对页面底部定位，面板掉到页面底部。
  // 修复：:host 补 position: relative；本测试锁定「dropdown 有定位祖先」不变量。
  for (const name of ['date-picker', 'time-picker'] as const) {
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    await up(page, `oas-${name}`)
    const host = page.locator(`oas-${name}`).first()
    await host.locator('[part="trigger"]').click()
    await page.waitForFunction(
      (sel) =>
        document
          .querySelector(sel)
          ?.shadowRoot?.querySelector('[part="dropdown"]')
          ?.classList.contains('open'),
      `oas-${name}`,
      { timeout: 5000 },
    )
    const r = await host.evaluate((el) => {
      const root = el.shadowRoot!
      const dropdown = root.querySelector<HTMLElement>('[part="dropdown"]')!
      const trigger = root.querySelector<HTMLElement>('[part="trigger"]')!
      const d = dropdown.getBoundingClientRect()
      const t = trigger.getBoundingClientRect()
      return {
        hostPosition: getComputedStyle(el).position,
        dropdownPosition: getComputedStyle(dropdown).position,
        placement: dropdown.getAttribute('data-placement'),
        dropdownTop: d.top,
        dropdownBottom: d.bottom,
        triggerBottom: t.bottom,
        triggerTop: t.top,
        inViewport: d.right <= window.innerWidth && d.left >= 0,
      }
    })
    // 两组件统一走库内浮层定位引擎（fixed + computePosition 锚定触发器，逃出祖先 overflow）
    // ——锁定架构不变量：fixed 定位 + 面板与触发器相邻（下翻 gap=4 在下；下方空间不足自动
    // 上翻 gap=4 在上，两种朝向均合法）+ 视口内不裁 + 碰撞翻转钩子可读（data-placement）
    expect(r.dropdownPosition, `${name} dropdown 应为 fixed 定位`).toBe('fixed')
    expect(r.placement, `${name} 应有 data-placement 定位钩子`).toBeTruthy()
    const gap =
      r.dropdownTop - r.triggerBottom >= 0 ? r.dropdownTop - r.triggerBottom : r.triggerTop - r.dropdownBottom
    expect(gap, `${name} 面板应与触发器相邻（gap 4，下翻或上翻）`).toBeCloseTo(4, 1)
    expect(r.inViewport, `${name} 面板应完整在视口内`).toBe(true)
  }
})
