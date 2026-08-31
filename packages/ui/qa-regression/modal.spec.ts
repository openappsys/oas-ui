// 复核回归：modal——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('modal fullscreen：铺满视口、无圆角、width 被忽略、Esc/遮罩关闭照常', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal[fullscreen]')
  await page.evaluate(() => {
    document.querySelector('#modal-fullscreen')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#modal-fullscreen')
        ?.shadowRoot?.querySelector('.dialog[data-fullscreen]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('#modal-fullscreen')!
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    const d = dialog.getBoundingClientRect()
    return {
      left: d.left,
      top: d.top,
      right: d.right,
      bottom: d.bottom,
      vw: window.innerWidth,
      vh: window.innerHeight,
      radius: getComputedStyle(dialog).borderRadius,
      inlineWidth: dialog.style.width,
      ariaModal: dialog.getAttribute('aria-modal'),
      ariaHidden: dialog.getAttribute('aria-hidden'),
    }
  })
  expect(r.left).toBeLessThanOrEqual(1)
  expect(r.top).toBeLessThanOrEqual(1)
  expect(r.right).toBeGreaterThanOrEqual(r.vw - 1)
  expect(r.bottom).toBeGreaterThanOrEqual(r.vh - 1)
  expect(r.radius).toBe('0px') // 无圆角
  expect(r.inlineWidth).toBe('') // width 属性被忽略
  expect(r.ariaModal).toBe('true')
  expect(r.ariaHidden).toBe('false')
  // Esc 关闭照常
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => !document.querySelector('#modal-fullscreen')?.hasAttribute('visible'),
    null,
    { timeout: 5000 },
  )
})

test('modal 命令式确认 loading：确定进入 loading、1.5s 后自动关闭并弹出成功 message', async ({
  page,
}) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  // 注意：openConfirmLoading 返回 confirm 的 Promise（settle 于确定/取消），
  // 用块语句包裹避免 page.evaluate 等待该 Promise
  await page.evaluate(() => {
    ;(window as any).openConfirmLoading()
  })
  await page.waitForFunction(() => document.querySelector('oas-modal[visible]') != null, null, {
    timeout: 5000,
  })
  // 点击确定 → 对话框保持打开并进入 loading（OK 禁用 + aria-busy + spinner 可见）
  await page.evaluate(() => {
    const m = document.querySelector('oas-modal[visible]')!
    ;(m.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => {
      const m = document.querySelector('oas-modal[visible]')
      const ok = m?.shadowRoot?.querySelector<HTMLButtonElement>('[part="ok"]')
      const spinner = m?.shadowRoot?.querySelector('[part="ok"] .spinner')
      return (
        ok != null &&
        ok.disabled &&
        ok.getAttribute('aria-busy') === 'true' &&
        spinner != null &&
        !spinner.hasAttribute('hidden')
      )
    },
    null,
    { timeout: 5000 },
  )
  // onOk resolve（1.5s）后自动关闭并弹成功 message
  await page.waitForFunction(
    () =>
      document.querySelector('oas-modal[visible]') == null &&
      document.querySelectorAll('oas-message').length > 0,
    null,
    { timeout: 8000 },
  )
})

test('modal 视口高度保护：dialog 限高 + body 可滚动（小窗口内容不溢出）', async ({ page }) => {
  // 集成反馈固化：曾只限宽不限高，窗口比 modal 矮时标题/关闭钮被裁出视口够不到
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  // 打开第一个基础 modal
  await page
    .locator('oas-button', { hasText: /基础|打开/ })
    .first()
    .click()
  await page.waitForFunction(() => {
    const m = document.querySelector('oas-modal[visible]')
    return m?.shadowRoot?.querySelector('[part="dialog"]') != null
  })
  const r = await page.evaluate(() => {
    const m = document.querySelector('oas-modal[visible]')!
    const dialog = m.shadowRoot!.querySelector('[part="dialog"]') as HTMLElement
    const body = m.shadowRoot!.querySelector('[part="body"]') as HTMLElement
    return {
      maxHeight: getComputedStyle(dialog).maxHeight,
      display: getComputedStyle(dialog).display,
      overflowY: getComputedStyle(body).overflowY,
    }
  })
  expect(r.maxHeight).not.toBe('none')
  expect(r.display).toBe('flex')
  expect(r.overflowY).toBe('auto')
})
