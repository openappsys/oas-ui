// 复核回归：alert——历史缺陷固化断言。

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
