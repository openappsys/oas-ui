// 复核回归：image-group——共享预览委托 oas-image 的能力透传固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('image-group 共享预览：双指捏合缩放透传生效（委托 oas-image 预览实现）', async ({ page }) => {
  // 固化缺口：图集预览缩放此前只有滚轮/按钮。image 组件补 pinch 后，共享预览宿主
  // （shadow 内隐藏 oas-image）自动继承——本断言防止委托链断裂导致图集预览丢 pinch。
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#image-group-demo')
  await page.locator('#image-group-demo oas-image').first().click()
  await page.waitForSelector('[data-oas-image-preview-portal]', { timeout: 15000 })
  const before = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    return portal.shadowRoot!.querySelector<HTMLElement>('[part="preview-image"]')!.style.transform
  })
  await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const stage = portal.shadowRoot!.querySelector<HTMLElement>('.preview-stage')!
    // 双指：指距 200 → 400（2 倍）
    stage.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 300, button: 0, pointerId: 1 }))
    stage.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, clientY: 300, button: 0, pointerId: 2 }))
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 300, pointerId: 1 }))
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 500, clientY: 300, pointerId: 2 }))
  })
  const after = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    return portal.shadowRoot!.querySelector<HTMLElement>('[part="preview-image"]')!.style.transform
  })
  expect(before).toContain('scale(1)')
  expect(after).toContain('scale(2)')
})
