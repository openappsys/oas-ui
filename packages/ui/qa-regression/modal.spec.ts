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

// —— 一期能力回归（prompt / before-close / 滚动锁 / footer 插槽 / append-to / 关闭来源）——

test('modal prompt：校验失败保持打开 + 错误可见，修正后可提交成功', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).openPromptValidated !== 'undefined', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    ;(window as any).openPromptValidated()
  })
  await page.waitForFunction(
    () => document.querySelector('oas-modal[visible]')?.querySelector('input') != null,
    null,
    { timeout: 5000 },
  )
  // 输入过短 → 确定 → 校验失败：对话框保持打开、错误文案可见（role=alert）
  await page.evaluate(() => {
    const m = document.querySelector('oas-modal[visible]')!
    const input = m.querySelector('input')!
    input.value = 'ab'
    ;(m.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  await page.waitForFunction(() => {
    const m = document.querySelector('oas-modal[visible]')
    const err = m?.querySelector('.oas-modal-prompt-error') as HTMLElement | null
    return err != null && !err.hidden && (err.textContent ?? '').length > 0
  })
  const keptOpen = await page.evaluate(
    () => document.querySelector('oas-modal[visible]') != null,
  )
  expect(keptOpen).toBe(true)
  // 修正输入 → 错误清除 → 再次确定 → 成功关闭
  await page.evaluate(() => {
    const m = document.querySelector('oas-modal[visible]')!
    const input = m.querySelector('input')!
    input.value = 'valid-name'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    ;(m.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelector('oas-modal[visible]') == null,
    null,
    { timeout: 5000 },
  )
})

test('modal before-close：取消类关闭被拦截（visible 保持 + 警告消息可见）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    document.querySelector('#modal-guard')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-guard[visible]') != null)
  // Esc 关闭被拦截：仍可见 + 右上角出现警告消息
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => document.querySelectorAll('oas-message').length > 0,
    null,
    { timeout: 5000 },
  )
  const stillVisible = await page.evaluate(() =>
    document.querySelector('#modal-guard')?.hasAttribute('visible'),
  )
  expect(stillVisible).toBe(true)
})

test('modal 滚动锁：打开锁 body overflow、关闭还原', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  await page.evaluate(() => {
    document.querySelector('#modal-scroll')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-scroll[visible]') != null)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.evaluate(() => {
    document.querySelector('#modal-scroll')?.removeAttribute('visible')
  })
  await page.waitForFunction(() => !document.querySelector('#modal-scroll')?.hasAttribute('visible'))
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('modal footer 插槽：有内容时内置确定/取消按钮隐藏', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  await page.evaluate(() => {
    document.querySelector('#modal-footer')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => {
    const m = document.querySelector('#modal-footer')
    const actions = m?.shadowRoot?.querySelector<HTMLElement>('[part="footer-actions"]')
    return actions != null && actions.hidden
  })
})

test('modal append-to：dialog/mask 挂载到 portal host（body 级容器）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  await page.evaluate(() => {
    document.querySelector('#modal-portal')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () => document.querySelector('[data-oas-modal-portal]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const portal = document.querySelector('[data-oas-modal-portal]')
    return {
      dialogInPortal: portal?.shadowRoot?.querySelector('.dialog') != null,
      maskInPortal: portal?.shadowRoot?.querySelector('.mask') != null,
    }
  })
  expect(r.dialogInPortal).toBe(true)
  expect(r.maskInPortal).toBe(true)
})

test('modal 关闭来源：oas-close 带 source/action，demo 右上角有反馈消息', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    document.querySelector('#modal-source')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-source[visible]') != null)
  // 点 ✕ → oas-close(source=close-btn, action=close) → 消息出现且含来源
  await page.evaluate(() => {
    const m = document.querySelector('#modal-source')!
    ;(m.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () =>
      document.querySelectorAll('oas-message').length > 0 &&
      !document.querySelector('#modal-source')?.hasAttribute('visible'),
    null,
    { timeout: 5000 },
  )
  const msgText = await page.evaluate(() => {
    const msgs = document.querySelectorAll('oas-message')
    return msgs[msgs.length - 1]?.shadowRoot?.textContent ?? ''
  })
  expect(msgText).toContain('close-btn')
})
