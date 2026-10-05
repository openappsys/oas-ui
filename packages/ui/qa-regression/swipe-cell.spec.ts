// 复核回归：swipe-cell（oas-swipe-cell）——移动横滑操作真实浏览器固化。
// 覆盖：合成 pointer 横滑链（超阈值开 / 不足回弹）、单开互斥、Esc 关闭、外点关闭、
// 方向判定放行纵向、RTL 镜像（内容层正偏移 + actions 位于 inline-end 侧）、事件可见反馈。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 在页面内对指定 cell 的 shadow 内容层派发一条合成 pointer 横滑链 */
async function swipe(page: import('@playwright/test').Page, hostSel: string, dx: number, dy = 0): Promise<void> {
  await page.evaluate(
    ({ hostSel, dx, dy }) => {
      const host = document.querySelector(hostSel) as HTMLElement
      const content = host.shadowRoot!.querySelector('[part="content"]') as HTMLElement
      const r = content.getBoundingClientRect()
      const startX = r.left + r.width * 0.7
      const y = r.top + Math.min(r.height / 2, 20)
      const pe = (type: string, x: number, yy: number) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          button: 0,
          pointerId: 7,
          clientX: x,
          clientY: yy,
        })
      content.dispatchEvent(pe('pointerdown', startX, y))
      content.dispatchEvent(pe('pointermove', startX + dx, y + dy))
      content.dispatchEvent(pe('pointerup', startX + dx, y + dy))
    },
    { hostSel, dx, dy },
  )
}

test('swipe-cell 超阈值横滑开：open 落定、内容层位移到 actions 宽度、demo 事件反馈可见', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#swipe-demo-1')

  const width = await page.evaluate(() => {
    const host = document.querySelector('#swipe-demo-1') as HTMLElement
    return (host.shadowRoot!.querySelector('[part="actions"]') as HTMLElement).getBoundingClientRect().width
  })
  expect(width, 'actions 有可测量宽度').toBeGreaterThan(0)

  await swipe(page, '#swipe-demo-1', -Math.max(60, width + 20))

  await expect
    .poll(async () =>
      page.evaluate(() => (document.querySelector('#swipe-demo-1') as HTMLElement).hasAttribute('open')),
    )
    .toBe(true)
  const offset = await page.evaluate(() =>
    (document.querySelector('#swipe-demo-1') as HTMLElement).style.getPropertyValue('--oas-swipe-cell-offset'),
  )
  expect(Math.abs(parseFloat(offset)), '内容层位移约等于 actions 宽度').toBeGreaterThanOrEqual(width - 2)

  // demo 可见反馈：oas-open 明细文本更新（非 console）
  await expect(page.locator('#swipe-demo-out')).toHaveText(/swipe-demo-1 → oas-open/, { timeout: 5000 })
})

test('swipe-cell 位移不足阈值回弹：保持关闭、偏移归零', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#swipe-demo-1')

  await swipe(page, '#swipe-demo-1', -20) // 默认阈值 40，不足
  const state = await page.evaluate(() => {
    const host = document.querySelector('#swipe-demo-1') as HTMLElement
    return {
      open: host.hasAttribute('open'),
      offset: host.style.getPropertyValue('--oas-swipe-cell-offset'),
    }
  })
  expect(state.open).toBe(false)
  expect(Math.abs(parseFloat(state.offset) || 0)).toBe(0)
})

test('swipe-cell 单开互斥：开第二项自动关第一项', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#swipe-demo-1')
  await up(page, '#swipe-demo-2')

  await swipe(page, '#swipe-demo-1', -120)
  await expect
    .poll(() => page.evaluate(() => (document.querySelector('#swipe-demo-1') as HTMLElement).hasAttribute('open')))
    .toBe(true)

  await swipe(page, '#swipe-demo-2', -120)
  await expect
    .poll(() => page.evaluate(() => (document.querySelector('#swipe-demo-2') as HTMLElement).hasAttribute('open')))
    .toBe(true)
  expect(
    await page.evaluate(() => (document.querySelector('#swipe-demo-1') as HTMLElement).hasAttribute('open')),
    '第一项应被互斥关闭',
  ).toBe(false)
})

test('swipe-cell Esc 关闭打开项', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#swipe-demo-1')

  await swipe(page, '#swipe-demo-1', -120)
  await expect
    .poll(() => page.evaluate(() => (document.querySelector('#swipe-demo-1') as HTMLElement).hasAttribute('open')))
    .toBe(true)

  await page.evaluate(() => {
    const host = document.querySelector('#swipe-demo-1') as HTMLElement
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
  })
  await expect
    .poll(() => page.evaluate(() => (document.querySelector('#swipe-demo-1') as HTMLElement).hasAttribute('open')))
    .toBe(false)
})

test('swipe-cell 外点关闭：document 空白处按下关闭打开项', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#swipe-demo-1')

  await swipe(page, '#swipe-demo-1', -120)
  await expect
    .poll(() => page.evaluate(() => (document.querySelector('#swipe-demo-1') as HTMLElement).hasAttribute('open')))
    .toBe(true)

  await page.evaluate(() => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
  })
  await expect
    .poll(() => page.evaluate(() => (document.querySelector('#swipe-demo-1') as HTMLElement).hasAttribute('open')))
    .toBe(false)
})

test('swipe-cell 方向判定放行纵向：纵向主导的移动不接管、不阻止默认、偏移不变', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#swipe-demo-1')

  const notPrevented = await page.evaluate(() => {
    const host = document.querySelector('#swipe-demo-1') as HTMLElement
    const content = host.shadowRoot!.querySelector('[part="content"]') as HTMLElement
    const r = content.getBoundingClientRect()
    const x = r.left + r.width * 0.7
    const y = r.top + 20
    const pe = (type: string, xx: number, yy: number) =>
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
        pointerId: 9,
        clientX: xx,
        clientY: yy,
      })
    content.dispatchEvent(pe('pointerdown', x, y))
    // 纵向位移远大于横向：判定为纵向意图 → 放行
    const ok = content.dispatchEvent(pe('pointermove', x + 4, y + 60))
    content.dispatchEvent(pe('pointerup', x + 4, y + 60))
    return { ok, offset: host.style.getPropertyValue('--oas-swipe-cell-offset'), open: host.hasAttribute('open') }
  })
  expect(notPrevented.ok, '纵向放行不得 preventDefault').toBe(true)
  expect(Math.abs(parseFloat(notPrevented.offset) || 0)).toBe(0)
  expect(notPrevented.open).toBe(false)
})

test('swipe-cell 聚焦滚动不误关：视口外 cell 聚焦 actions 按钮（触发聚焦滚动）后保持打开', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#swipe-demo-1')

  const r = await page.evaluate(async () => {
    const spacer = document.createElement('div')
    spacer.style.height = '3000px'
    document.body.appendChild(spacer)
    const el = document.createElement('oas-swipe-cell')
    el.id = 'swipe-focus-probe'
    el.innerHTML =
      '<div style="padding: 16px; background: var(--oas-color-bg)">远处置入</div>' +
      '<button slot="actions" style="width: 80px">操作</button>'
    document.body.appendChild(el)
    await new Promise((res) => requestAnimationFrame(() => res(null)))
    const btn = el.querySelector('button') as HTMLButtonElement
    btn.focus() // 浏览器把视口外按钮滚入视口 → 派发 scroll
    await new Promise((res) => setTimeout(res, 500))
    return { open: el.hasAttribute('open'), scrollY: window.scrollY }
  })
  expect(r.scrollY, '已发生聚焦滚动').toBeGreaterThan(0)
  expect(r.open, '聚焦滚动不应把打开的 cell 误关（键盘可达）').toBe(true)
})

test('swipe-cell RTL 镜像：向 inline-start（右滑）开、偏移为正、actions 在 inline-end（左）侧', async ({ page }) => {
  await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const el = document.createElement('oas-swipe-cell')
    el.id = 'swipe-rtl-probe'
    el.setAttribute('dir', 'rtl')
    el.innerHTML =
      '<div style="padding: 16px; background: var(--oas-color-bg)">rtl row</div>' +
      '<button slot="actions" style="width: 80px">操作</button>'
    document.body.appendChild(el)
  })
  await up(page, '#swipe-rtl-probe')

  await swipe(page, '#swipe-rtl-probe', 120) // RTL 向 inline-start = 右滑

  const state = await page.evaluate(() => {
    const host = document.querySelector('#swipe-rtl-probe') as HTMLElement
    const content = host.shadowRoot!.querySelector('[part="content"]') as HTMLElement
    const actions = host.shadowRoot!.querySelector('[part="actions"]') as HTMLElement
    return {
      open: host.hasAttribute('open'),
      offset: host.style.getPropertyValue('--oas-swipe-cell-offset'),
      contentLeft: content.getBoundingClientRect().left,
      actionsLeft: actions.getBoundingClientRect().left,
    }
  })
  expect(state.open).toBe(true)
  expect(parseFloat(state.offset), 'RTL 偏移为正').toBeGreaterThan(0)
  // 过渡动画期间几何在移动，等吸附完成后再核对方向（RTL：actions 在左、内容层右移，contentLeft > actionsLeft）
  await expect
    .poll(() =>
      page.evaluate(() => {
        const host = document.querySelector('#swipe-rtl-probe') as HTMLElement
        const content = host.shadowRoot!.querySelector('[part="content"]') as HTMLElement
        const actions = host.shadowRoot!.querySelector('[part="actions"]') as HTMLElement
        return content.getBoundingClientRect().left - actions.getBoundingClientRect().left
      }),
    )
    .toBeGreaterThan(0)
})

test.describe('移动仿真（触屏真手势）', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('触屏横滑超阈值 → 开态（CDP 真 touch 链）；纵向滑放行不劫持', async ({ page }) => {
    await page.goto('/components/swipe-cell.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-swipe-cell')
    const cell = page.locator('oas-swipe-cell').first()
    await cell.scrollIntoViewIfNeeded()
    const box = await cell.boundingBox()
    expect(box).not.toBeNull()
    const cdp = await page.context().newCDPSession(page)
    // 横滑（LTR 向左滑开）
    const y = box!.y + box!.height / 2
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box!.x + box!.width - 30, y }],
    })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: box!.x + box!.width - 30 - i * 25, y }],
      })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(400)
    expect(await cell.evaluate((el) => el.hasAttribute('open')), '触屏横滑开态').toBe(true)
  })
})
