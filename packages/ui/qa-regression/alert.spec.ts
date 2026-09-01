// 复核回归：alert——历史缺陷固化断言（关闭真正隐藏 / 退场过渡收尾 / 受控重开闭环 / demo 属性存活）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('alert 关闭后真正隐藏：closeable 点击关闭按钮 host 视觉消失（:host([hidden]) 兜底 author display 规则）', async ({
  page,
}) => {
  await page.goto('/components/alert.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-alert[closeable]')
  const firstCloseable = page.locator('oas-alert[closeable]').first()
  const host = firstCloseable
  // 点击关闭按钮：shadow 内 [part=close]
  await host.locator('[part="close"]').click()
  // host 应视觉消失（此前 :host{display:block} 覆盖 UA [hidden]，点击后仍可见——已修复）
  await expect(host).toBeHidden()
  expect(await host.getAttribute('hidden')).not.toBeNull()
})

test('alert 退场过渡收尾：data-closing 移除、open 属性回写移除、最终隐藏态落定', async ({ page }) => {
  await page.goto('/components/alert.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#alert-reopen')
  const host = page.locator('#alert-reopen')
  await host.locator('[part="close"]').click()
  // 过渡结束后（toBeHidden 自动等待）：data-closing 已移除（[hidden] 单独生效）、open 被移除
  await expect(host).toBeHidden()
  expect(await host.getAttribute('data-closing')).toBeNull()
  expect(await host.getAttribute('hidden')).not.toBeNull()
  expect(await host.getAttribute('open')).toBeNull()
})

test('alert 受控重开：关闭后 demo 按钮重设 open 恢复可见（oas-open-change 闭环可见反馈）', async ({
  page,
}) => {
  await page.goto('/components/alert.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#alert-reopen')
  const host = page.locator('#alert-reopen')
  await host.locator('[part="close"]').click()
  await expect(host).toBeHidden()
  // demo 的「重新打开」按钮：真点按钮（用户视角可交互）→ 设置 open → 重新可见
  await page.locator('#alert-reopen-btn').click()
  await expect(host).toBeVisible()
  expect(await host.getAttribute('hidden')).toBeNull()
})

test('alert demo 属性存活（Vue 不剥离）：close-text / max-line / banner / border 均在宿主上', async ({
  page,
}) => {
  await page.goto('/components/alert.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-alert[close-text]')
  expect(await page.locator('oas-alert[close-text]').count()).toBeGreaterThan(0)
  expect(await page.locator('oas-alert[max-line]').count()).toBeGreaterThan(0)
  expect(await page.locator('oas-alert[banner]').count()).toBeGreaterThan(0)
  expect(await page.locator('oas-alert[border]').count()).toBeGreaterThan(0)
  expect(await page.locator('oas-alert[center]').count()).toBeGreaterThan(0)
  expect(await page.locator('oas-alert[variant="filled"]').count()).toBeGreaterThan(0)
  // close-text 文案渲染进关闭按钮
  const customClose = page.locator('oas-alert[close-text]').first()
  await expect(customClose.locator('[part="close"]')).toContainText('知道了')
})
