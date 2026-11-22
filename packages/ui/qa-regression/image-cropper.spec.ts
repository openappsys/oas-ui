// 复核回归：image-cropper——旋转/裁剪框键盘操作与确认裁剪的可见反馈。

import { test, expect } from '@playwright/test'
import { realClick, up } from './helpers'

test('image-cropper：旋转按钮真实改变图片变换并派发可见变化', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-event')

  await realClick(page, '#ic-event', '[data-act="rotate"]')
  const state = await page.evaluate(() => {
    const host = document.querySelector('#ic-event')!
    const root = host.shadowRoot!
    return {
      rotation: (host as HTMLElement & { rotation: number }).rotation,
      transform: root.querySelector<HTMLImageElement>('[part="image"]')!.style.transform,
      feedback: document.querySelector('#ic-event-out')!.textContent ?? '',
    }
  })
  expect(state.rotation).toBe(90)
  expect(state.transform).toContain('rotate(90deg)')
  expect(state.feedback).toContain('oas-change')
})

test('image-cropper：裁剪框可聚焦并用方向键移动（真实按键）', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-square')

  const before = await page.evaluate(() => {
    const host = document.querySelector('#ic-square')!
    const frame = host.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    frame.focus()
    return Number.parseFloat(frame.style.left)
  })
  await page.keyboard.press('ArrowRight')
  const after = await page.evaluate(() =>
    Number.parseFloat(
      document.querySelector('#ic-square')!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!.style.left,
    ),
  )
  expect(after).toBeGreaterThan(before)
})

test('image-cropper：确认裁剪产出 Blob 并在 demo 中显示尺寸', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-free')
  // 等图片加载完成（natual size 就绪才可能产出 blob）
  await page.waitForFunction(
    () => {
      const img = document.querySelector('#ic-free')!.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
      return img.complete && img.naturalWidth > 0
    },
    { timeout: 15000 },
  )
  await realClick(page, '#ic-free', '[data-act="confirm"]')
  await page.waitForFunction(() => (document.querySelector('#ic-free-out')?.textContent ?? '').includes('已裁剪'), {
    timeout: 15000,
  })
  const feedback = await page.evaluate(() => document.querySelector('#ic-free-out')!.textContent ?? '')
  expect(feedback).not.toContain('blob 不可用')
})
