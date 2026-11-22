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

// 回归（history：zoom setter 走 setZoom → 派发 oas-change；宿主在事件里回写 el.zoom 造成同帧同步
// 递归爆栈）。真实浏览器下复现宿主双向绑定形态：事件回写不得抛错、不得无限派发。
test('image-cropper：宿主在 oas-change 里回写 el.zoom 不递归爆栈（真实浏览器）', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-event')
  const result = await page.evaluate(() => {
    const host = document.querySelector('#ic-event') as HTMLElement & { zoom: number }
    let calls = 0
    host.addEventListener('oas-change', (e) => {
      calls++
      const detail = (e as CustomEvent<{ zoom: number }>).detail
      host.zoom = detail.zoom
    })
    let error = ''
    try {
      const slider = host.shadowRoot!.querySelector<HTMLInputElement>('[part="zoom"]')!
      slider.value = '2'
      slider.dispatchEvent(new Event('input', { bubbles: true }))
      slider.dispatchEvent(new Event('change', { bubbles: true }))
    } catch (err) {
      error = String(err)
    }
    return { calls, error, zoom: host.zoom }
  })
  expect(result.error, '属性回写不得抛错（爆栈会在此暴露）').toBe('')
  expect(result.zoom).toBe(2)
  // 用户交互的一次提交只应产生一次 oas-change（回写不再派发）
  expect(result.calls).toBe(1)
})

// 回归（history：加载失败只派发 oas-error，舞台残留破图）。错误态必须可见且不留破图。
test('image-cropper：加载失败显示错误文案且不残留破图', async ({ page }) => {
  await page.goto('/components/image-cropper.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ic-error')
  await page.waitForFunction(() => (document.querySelector('#ic-error-out')?.textContent ?? '').includes('oas-error'), {
    timeout: 15000,
  })
  const state = await page.evaluate(() => {
    const host = document.querySelector('#ic-error') as HTMLElement & { shadowRoot: ShadowRoot }
    const root = host.shadowRoot
    const empty = root.querySelector<HTMLElement>('[part="empty"]')!
    const img = root.querySelector<HTMLImageElement>('[part="image"]')!
    const frame = root.querySelector<HTMLElement>('[part="frame"]')!
    const box = (el: HTMLElement) => el.getBoundingClientRect()
    const emptyBox = box(empty)
    return {
      text: empty.textContent ?? '',
      emptyVisible: emptyBox.width > 0 && emptyBox.height > 0,
      state: empty.dataset.state ?? '',
      imgHidden: img.hidden,
      frameVisible: box(frame).width > 0 && box(frame).height > 0,
      stageError: host.shadowRoot!.querySelector<HTMLElement>('[part="stage"]')!.hasAttribute('data-error'),
    }
  })
  expect(state.text).toContain('图片加载失败')
  expect(state.emptyVisible, '错误文案必须可见').toBe(true)
  expect(state.state).toBe('error')
  expect(state.imgHidden, '破图必须隐藏').toBe(true)
  expect(state.frameVisible, '错误态不显示裁剪框').toBe(false)
  expect(state.stageError).toBe(true)
})
