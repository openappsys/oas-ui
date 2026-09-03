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

// ===== 二期能力回归（P3 动画事件 / P8 no-mask / P16 钳制 / P18 trigger / P19 断点尺寸 /
//       P21 confirm-on-enter / P23 shake / P27 close-icon / P34 options） =====

/** 给页面注入「读最后一条 oas-message 文本」助手（waitForFunction 无法引用 Node 作用域函数） */
async function exposeMessageReader(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    ;(window as any).lastMsgText = () => {
      const msgs = document.querySelectorAll('oas-message')
      return msgs[msgs.length - 1]?.shadowRoot?.textContent ?? ''
    }
  })
}

test('modal 开合动画：oas-opened / oas-closed 在动画结束后派发（右上角消息可见）', async ({
  page,
}) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await exposeMessageReader(page)
  await page.evaluate(() => {
    document.querySelector('#modal-anim')?.setAttribute('visible', '')
  })
  // oas-opened：动画结束后才出现
  await page.waitForFunction(
    () => document.querySelectorAll('oas-message').length > 0 && (window as any).lastMsgText().includes('oas-opened'),
    null,
    { timeout: 5000 },
  )
  // Esc 关闭 → oas-closed（动画结束后派发）
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => document.querySelectorAll('oas-message').length > 0 && (window as any).lastMsgText().includes('oas-closed'),
    null,
    { timeout: 5000 },
  )
  expect(
    await page.evaluate(() => !document.querySelector('#modal-anim')?.hasAttribute('visible')),
  ).toBe(true)
})

test('modal 声明式 trigger：点击绑定元素自动 setAttribute visible（受控模型不变）', async ({
  page,
}) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.locator('#modal-trigger-btn').click()
  await page.waitForFunction(() => document.querySelector('#modal-triggered[visible]') != null, null, {
    timeout: 5000,
  })
})

test('modal no-mask 非模态：遮罩隐藏 + 打开不抢焦点（页面其余部分可交互）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.locator('oas-button', { hasText: '非模态' }).click()
  await page.waitForFunction(() => document.querySelector('#modal-nonmask[visible]') != null)
  const r = await page.evaluate(() => {
    const m = document.querySelector('#modal-nonmask')!
    const mask = m.shadowRoot!.querySelector<HTMLElement>('.mask')
    return {
      maskHidden: mask?.hidden === true || mask == null,
      activeTag: (document.activeElement as HTMLElement | null)?.tagName ?? '',
    }
  })
  expect(r.maskHidden).toBe(true)
  // 打开不抢焦点：焦点仍留在触发按钮（oas-button 宿主）
  expect(r.activeTag.toLowerCase()).toContain('oas-button')
})

test('modal size 预设：sm=400px / lg=720px（内联宽度生效）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.evaluate(() => {
    document.querySelector('#modal-size-sm')?.setAttribute('visible', '')
    document.querySelector('#modal-size-lg')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-size-sm[visible]') != null)
  const widths = await page.evaluate(() => {
    const sm = document.querySelector('#modal-size-sm')!
    const lg = document.querySelector('#modal-size-lg')!
    return {
      sm: (sm.shadowRoot!.querySelector('.dialog') as HTMLElement).style.width,
      lg: (lg.shadowRoot!.querySelector('.dialog') as HTMLElement).style.width,
    }
  })
  expect(widths.sm).toBe('400px')
  expect(widths.lg).toBe('720px')
})

test('modal fullscreen-breakpoint：视口窄于阈值自动全屏、拉宽自动还原', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.evaluate(() => {
    document.querySelector('#modal-bp')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-bp[visible]') != null)
  // 宽视口：常规对话框
  const wide = await page.evaluate(() => {
    const m = document.querySelector('#modal-bp')!
    const d = m.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    return { fs: d.hasAttribute('data-fullscreen'), w: d.style.width }
  })
  expect(wide.fs).toBe(false)
  expect(wide.w).toBe('640px')
  // 收窄视口（低于 800 阈值）→ 自动全屏 + 忽略内联宽度
  await page.setViewportSize({ width: 700, height: 900 })
  await page.waitForFunction(() => {
    const m = document.querySelector('#modal-bp')
    return m?.shadowRoot?.querySelector('.dialog[data-fullscreen]') != null
  })
  // 拉宽还原
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForFunction(() => {
    const m = document.querySelector('#modal-bp')
    return m?.shadowRoot?.querySelector('.dialog[data-fullscreen]') == null
  })
})

test('modal shake 防误关：取消类关闭被拦截时抖动 + 对话框保持打开（可见反馈）', async ({
  page,
}) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await exposeMessageReader(page)
  await page.evaluate(() => {
    document.querySelector('#modal-shake')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-shake[visible]') != null)
  // 同一 evaluate 内点击取消并立即读 shake class（CSS 动画结束后 class 移除，避免竞态）
  const r = await page.evaluate(() => {
    const m = document.querySelector('#modal-shake')!
    ;(m.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
    const dialog = m.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    return { shaking: dialog.classList.contains('oas-shake'), visible: m.hasAttribute('visible') }
  })
  expect(r.visible).toBe(true)
  expect(r.shaking).toBe(true)
  // 拦截提示消息可见
  await page.waitForFunction(
    () => document.querySelectorAll('oas-message').length > 0 && (window as any).lastMsgText().includes('不可关闭'),
    null,
    { timeout: 5000 },
  )
})

test('modal confirm-on-enter：内容区回车触发确定（消息反馈 + 关闭）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await exposeMessageReader(page)
  await page.evaluate(() => {
    document.querySelector('#modal-enter')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-enter[visible]') != null)
  // 点击正文空白区让焦点离开按钮 → Enter = 确定
  await page.locator('#modal-enter p').click()
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () =>
      !document.querySelector('#modal-enter')?.hasAttribute('visible') &&
      document.querySelectorAll('oas-message').length > 0 &&
      (window as any).lastMsgText().includes('回车确认成功'),
    null,
    { timeout: 5000 },
  )
})

test('modal close-icon 插槽：slot 内容分配进关闭按钮（默认 ✕ 可被覆盖）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.evaluate(() => {
    document.querySelector('#modal-closeicon')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-closeicon[visible]') != null)
  const r = await page.evaluate(() => {
    const m = document.querySelector('#modal-closeicon')!
    const slot = m.shadowRoot!.querySelector('slot[name="close-icon"]') as HTMLSlotElement
    const assigned = slot?.assignedNodes() ?? []
    return { assigned: assigned.length, text: (assigned[0] as HTMLElement | null)?.textContent ?? '' }
  })
  expect(r.assigned).toBeGreaterThan(0)
  expect(r.text).toContain('✕')
})

test('modal options radio：打开选择框默认选中中档，确定后消息回显选中值', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).openOptionsRadio !== 'undefined', null, {
    timeout: 10000,
  })
  await exposeMessageReader(page)
  await page.evaluate(() => {
    ;(window as any).openOptionsRadio()
  })
  await page.waitForFunction(() => {
    const m = document.querySelector('oas-modal[visible]')
    return m != null && m.querySelectorAll('.oas-modal-opt-input').length === 4
  })
  // 切到「高」再确定 → 消息含 high
  await page.evaluate(() => {
    const m = document.querySelector('oas-modal[visible]')!
    const inputs = [...m.querySelectorAll<HTMLInputElement>('.oas-modal-opt-input')]
    inputs[2]!.click()
    ;(m.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelectorAll('oas-message').length > 0 && (window as any).lastMsgText().includes('high'),
    null,
    { timeout: 5000 },
  )
  // options 对话框在关闭动画结束后卸载
  await page.waitForFunction(() => document.querySelector('oas-modal[visible]') == null, null, {
    timeout: 5000,
  })
})

test('modal 拖拽钳制：大幅拖出视口后对话框仍完整留在视口内（可找回）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.evaluate(() => {
    document.querySelector('#modal-clamp')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => document.querySelector('#modal-clamp[visible]') != null)
  const box = await page.evaluate(() => {
    const m = document.querySelector('#modal-clamp')!
    const header = m.shadowRoot!.querySelector('.header')!
    const d = header.getBoundingClientRect()
    return { x: d.x + d.width / 2, y: d.y + d.height / 2 }
  })
  await page.mouse.move(box.x, box.y)
  await page.mouse.down()
  await page.mouse.move(box.x + 3000, box.y + 2000, { steps: 8 })
  await page.mouse.up()
  const rect = await page.evaluate(() => {
    const m = document.querySelector('#modal-clamp')!
    const d = m.shadowRoot!.querySelector<HTMLElement>('.dialog')!.getBoundingClientRect()
    return { left: d.left, top: d.top, right: d.right, bottom: d.bottom, vw: innerWidth, vh: innerHeight }
  })
  expect(rect.left).toBeGreaterThanOrEqual(0)
  expect(rect.top).toBeGreaterThanOrEqual(0)
  expect(rect.right).toBeLessThanOrEqual(rect.vw + 1)
  expect(rect.bottom).toBeLessThanOrEqual(rect.vh + 1)
})
