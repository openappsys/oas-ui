// 复核回归：cart——勾选联动与合计、库存上限钳制、删除（按钮 / 滑动）、空态与禁用态。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 读合计金额的整数部分文本（oas-price 的分段结构：part="amount" 为整数位） */
async function subtotalText(page: import('@playwright/test').Page, hostSel: string): Promise<string> {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel) as HTMLElement | null
    const price = host?.shadowRoot?.querySelector('[part="subtotal"] oas-price') as HTMLElement | null
    const amount = price?.shadowRoot?.querySelector('[part="amount"]')
    return amount?.textContent ?? ''
  }, hostSel)
}

test('cart：勾选条目联动合计与全选半选态，条目 checkbox 与组件状态一致', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const cart = page.locator('#cart-basic')
  // 初始：a 选中（99*2=198），b/c 未选
  await expect.poll(() => subtotalText(page, '#cart-basic')).toBe('198')
  const all = cart.locator('[part="select-all"]')
  expect(await all.evaluate((el) => (el as HTMLInputElement).indeterminate)).toBe(true)

  // 勾第二件（199）→ 合计 397
  await cart.locator('[part="item"]').nth(1).locator('[part="item-check"]').click()
  await expect.poll(() => subtotalText(page, '#cart-basic')).toBe('397')
  expect(await all.evaluate((el) => (el as HTMLInputElement).indeterminate)).toBe(true)

  // 点全选 → 三件全选（99*2 + 199 + 59 = 456），半选转全选
  await all.click()
  await expect.poll(() => subtotalText(page, '#cart-basic')).toBe('456')
  expect(await all.evaluate((el) => (el as HTMLInputElement).checked)).toBe(true)
  expect(await all.evaluate((el) => (el as HTMLInputElement).indeterminate)).toBe(false)

  // 事件反馈可见
  await expect(page.locator('#cart-basic-out')).toContainText('oas-change')
  await expect(page.locator('#cart-basic-out')).toContainText('已选 3 件')
})

test('cart：数量步进受 maxQuantity 钳制，到顶加号禁用且再点无效', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const row = page.locator('#cart-limit').locator('[part="item"]').first()
  const qty = row.locator('[part="quantity"]')
  const plus = row.locator('[part="plus"]')

  await expect(qty).toHaveValue('1')
  await plus.click()
  await plus.click()
  await expect(qty).toHaveValue('3')
  // 到上限：加号禁用，再点不涨
  await expect(plus).toBeDisabled()
  await plus.click({ force: true })
  await expect(qty).toHaveValue('3')

  // 减到 1 后减号禁用
  const minus = row.locator('[part="minus"]')
  await minus.click()
  await minus.click()
  await expect(qty).toHaveValue('1')
  await expect(minus).toBeDisabled()
})

test('cart：按钮删除移除条目并更新 oas-remove 反馈', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-button')
  await expect(host.locator('[part="item"]')).toHaveCount(1)
  await host.locator('[part="remove"]').click()
  await expect(host.locator('[part="item"]')).toHaveCount(0)
  await expect(page.locator('#cart-delete-out')).toContainText('oas-remove')
  await expect(page.locator('#cart-delete-out')).toContainText('删除后剩 0 件')
  // 空态文案可见（而不是空白块）
  await expect(host.locator('[part="empty"]')).toBeVisible()
})

test('cart：滑动删除——真实拖拽露出删除钮，再点删除即移除条目', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-swipe')
  const inner = host.locator('[part="item-inner"]').first()
  // demo 页很长：先滚进视口（鼠标事件落在视口外会被丢弃）
  await inner.scrollIntoViewIfNeeded()
  const box = (await inner.boundingBox())!
  // 按住条目主体（避开右侧步进器）向左拖 90px（越过 72/2 阈值 → 吸附展开）
  await page.mouse.move(box.x + 120, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 30, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()

  // 拖拽落定后条目内容层位移到 -72px（删除钮完全露出）
  await expect
    .poll(() =>
      inner.evaluate((el) => {
        const t = (el as HTMLElement).style.transform
        return t
      }),
    )
    .toBe('translateX(-72px)')

  await expect(host.locator('[part="item"]')).toHaveCount(2)
  await host.locator('[part="swipe-remove"]').first().click()
  await expect(host.locator('[part="item"]')).toHaveCount(1)
  await expect(page.locator('#cart-delete-out')).toContainText('删除后剩 1 件')
})

/**
 * 就绪门：把滑动 demo 的条目滚进视口，再等缩略图解码完成。
 *
 * 顺序不能反。缩略图是 `loading="lazy"`（组件内建），三个引擎的懒加载触发阈值不同：
 * Chromium 会提前预取离屏懒图（scrollY=0、缩略图位于 y≈2857 时也照拉），Firefox / WebKit
 * 只在元素接近视口时才发起请求（实测此刻 firefox `complete` 恒 false，webkit 只完成其中一张）。
 * 因此「先等 `complete` 再滚动」在 firefox / webkit 上永远等不到——旧写法只在 chromium 侥幸成立。
 * 先滚动再等解码，既能保证懒图真的开始加载，也能让迟到的解码位移落在取坐标之前。
 */
async function settleSwipeRow(page: import('@playwright/test').Page, inner: import('@playwright/test').Locator) {
  await inner.scrollIntoViewIfNeeded()
  await page.waitForFunction(
    () => {
      const root = document.getElementById('cart-delete-swipe')?.shadowRoot
      const imgs = root ? [...root.querySelectorAll('img')] : []
      return imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 0)
    },
    { timeout: 15000 },
  )
}

// 回归（本批修复）：起手点落在**商品缩略图上**也必须能滑动删除。
// 修复前 `<img>` 未禁原生拖拽：按住缩略图横移会走浏览器图片拖拽
// （实测 pointerdown → pointermove → dragstart → pointercancel），滑动会话被 cancel 收掉，
// 缩略图那一段（行宽 574px 时约左侧 100px）滑不出删除钮。
test('cart：从缩略图上起手滑动同样能露出删除钮并进入可删除态', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-swipe')
  const inner = host.locator('[part="item-inner"]').first()
  const thumb = host.locator('[part="thumb"]').first()
  await settleSwipeRow(page, inner)
  await thumb.hover() // 指针落到缩略图中心（命中检查由 Playwright 保证）
  const box = (await thumb.boundingBox())!

  await page.mouse.down()
  await page.mouse.move(box.x - 20, box.y + box.height / 2, { steps: 8 })
  await expect
    .poll(() => inner.evaluate((el) => el.getAttribute('data-dragging')), {
      message: '缩略图上按下 + 横移必须建立滑动会话（不得被原生图片拖拽 dragstart 接管）',
    })
    .toBe('true')
  await page.mouse.up()

  await expect
    .poll(() => inner.evaluate((el) => (el as HTMLElement).style.transform), {
      message: '从缩略图起手的滑动必须吸附展开（删除钮完全露出）',
    })
    .toBe('translateX(-72px)')

  // 进入可删除态：露出的删除钮可点，且真的移除条目
  await expect(host.locator('[part="item"]')).toHaveCount(2)
  await host.locator('[part="swipe-remove"]').first().click()
  await expect(host.locator('[part="item"]')).toHaveCount(1)
})

test('cart：滑动拖拽移出列表后松手仍正确结算（pointer capture）', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-swipe')
  const inner = host.locator('[part="item-inner"]').first()
  await inner.scrollIntoViewIfNeeded()
  const box = (await inner.boundingBox())!
  // 按住向左拖过阈值（吸附展开），然后把指针移出列表范围（下方）继续拖回，再松手
  await page.mouse.move(box.x + 120, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 30, box.y + box.height / 2, { steps: 6 })
  await page.mouse.move(box.x + 100, box.y + box.height + 120, { steps: 6 })
  // 松手前先锚定拖拽态确实激活（与几何无关）：保证后面的结算断言有对比意义
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).getAttribute('data-dragging') ?? '')).toBe('true')
  await page.mouse.up()

  // 捕获生效：结算照常发生——最终 dx = -20 未过吸附阈值 → 回弹关闭（无位移），
  // 且无 data-dragging 残留。修复前 pointerup 落在列表外，滑动状态卡在半途
  // （data-dragging 残留 + transform 停留在列表内最后一次的 translateX(-72px)）。
  await expect
    .poll(() =>
      inner.evaluate((el) => {
        const row = el as HTMLElement
        return `${row.getAttribute('data-dragging') ?? ''}|${row.style.transform}`
      }),
    )
    .toBe('|')

  // 结算后条目仍可正常交互（点击不误触删除）
  await expect(host.locator('[part="item"]')).toHaveCount(2)
})

test('cart：滑动过半松手吸附到完全露出；已展开拖回过半回弹关闭（落定不取跟手值）', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-swipe')
  const inner = host.locator('[part="item-inner"]').first()
  await inner.scrollIntoViewIfNeeded()
  const box = (await inner.boundingBox())!
  // 向左拖 50px（过半 36、未满 72）松手：落定必须吸附到完全露出 -72px，
  // 而非跟手 clamp 值 -50px（修复前删除钮半露）
  await page.mouse.move(box.x + 120, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 70, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).style.transform)).toBe('translateX(-72px)')

  // 已展开后向右拖回过半（dx=+50）松手：回弹关闭（修复前停半路 -12px）
  await page.mouse.move(box.x + 120, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 170, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).style.transform)).toBe('')
})

test('cart：禁用条目不计合计且不可勾选；空态渲染文案与插槽', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  // 禁用条目 demo：第一条 disabled（99），其余两条 59 + 29（后两条未选中）
  const disabledRow = page.locator('#cart-disabled').locator('[part="item"]').first()
  await expect(disabledRow.locator('[part="item-check"]')).toBeDisabled()
  await expect(disabledRow.locator('[part="plus"]')).toBeDisabled()
  await expect(disabledRow.locator('[part="item-check"]')).not.toBeChecked()
  // 失效商品必须能清掉：条目级 disabled 不禁用删除钮
  await expect(disabledRow.locator('[part="remove"]')).toBeEnabled()
  await disabledRow.locator('[part="remove"]').click()
  await expect(page.locator('#cart-disabled').locator('[part="item"]')).toHaveCount(2)

  // 宿主 disabled：整单只读
  const hostDisabled = page.locator('#cart-disabled-host')
  await expect(hostDisabled.locator('[part="select-all"]')).toBeDisabled()
  await expect(hostDisabled.locator('[part="plus"]')).toBeDisabled()

  // 空态：缺省文案 + 自定义插槽两种都可见
  const emptyDefault = page.locator('#cart-empty-default').locator('[part="empty"]')
  await expect(emptyDefault).toBeVisible()
  await expect(emptyDefault).toHaveText('购物车还是空的')
  const emptySlotContent = page.locator('#cart-empty-slot > div[slot="empty"]')
  await expect(emptySlotContent).toBeVisible()
  await expect(emptySlotContent).toContainText('购物车空空如也')
})

// ---------------------------------------------------------------------------
// 本批回归（commerce 增强子批）：pointercancel 单独结算 / 多点触控守卫 / 点行体收起
// ---------------------------------------------------------------------------

test('cart：pointercancel（0 坐标）按手势前状态落定——未展开回弹 0 且后续点击不被吞', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-swipe')
  const inner = host.locator('[part="item-inner"]').first()
  await inner.scrollIntoViewIfNeeded()

  // 挂 item-click 计数器（cancel 不得留下 suppressClick 残留）
  await page.evaluate(() => {
    const w = window as unknown as { __cartItemClicks?: string[] }
    w.__cartItemClicks = []
    document.getElementById('cart-delete-swipe')?.addEventListener('oas-item-click', (e) => {
      ;(w.__cartItemClicks ??= []).push((e as CustomEvent<{ id: string }>).detail.id)
    })
  })

  // 合成手势：按下 + 拖过半 + pointercancel（Safari 类浏览器给 0 坐标）
  await inner.evaluate((el) => {
    const opts = (type: string, x: number, y: number): PointerEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
    })
    el.dispatchEvent(new PointerEvent('pointerdown', opts('pointerdown', 300, 20)))
    el.dispatchEvent(new PointerEvent('pointermove', opts('pointermove', 230, 20)))
    el.dispatchEvent(new PointerEvent('pointercancel', opts('pointercancel', 0, 0)))
  })

  // 未展开的手势 → 回弹关闭（修复前按 cancel 坐标 (0,0) 结算误判成满展开 +72px 方向位移）
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).style.transform)).toBe('')
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).getAttribute('data-dragging') ?? '')).toBe('')

  // cancel 后行体点击照常派发（无 suppressClick 残留）
  await host.locator('[part="item-body"]').first().click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __cartItemClicks?: string[] }).__cartItemClicks))
    .toEqual(['a'])
})

test('cart：多点触控守卫——第二指按下不改写第一行拖拽会话，抬起顺序无关', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-swipe')
  const innerA = host.locator('[part="item-inner"]').first()
  await innerA.scrollIntoViewIfNeeded()

  const state = await page.evaluate(() => {
    const root = document.getElementById('cart-delete-swipe')!.shadowRoot!
    const inners = [...root.querySelectorAll<HTMLElement>('[part="item-inner"]')]
    const opts = (type: string, x: number, y: number, id: number): PointerEventInit => ({
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: id,
      button: 0,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
    })
    // 第一指拖行 A（跟手中）
    inners[0]!.dispatchEvent(new PointerEvent('pointerdown', opts('pointerdown', 300, 20, 1)))
    inners[0]!.dispatchEvent(new PointerEvent('pointermove', opts('pointermove', 260, 20, 1)))
    const aDuring = inners[0]!.getAttribute('data-dragging')
    // 第二指按行 B
    inners[1]!.dispatchEvent(new PointerEvent('pointerdown', opts('pointerdown', 300, 90, 2)))
    const aAfterSecond = inners[0]!.getAttribute('data-dragging')
    const bAfterSecond = inners[1]!.getAttribute('data-dragging')
    // 第二指的 move / up 与会话 pointerId 不匹配
    inners[1]!.dispatchEvent(new PointerEvent('pointermove', opts('pointermove', 250, 90, 2)))
    inners[1]!.dispatchEvent(new PointerEvent('pointerup', opts('pointerup', 250, 90, 2)))
    const aAfterBup = inners[0]!.getAttribute('data-dragging')
    // 第一指抬起（dx=-40 未过半 36 → 回弹 0）
    inners[0]!.dispatchEvent(new PointerEvent('pointerup', opts('pointerup', 265, 20, 1)))
    return {
      aDuring,
      aAfterSecond,
      bAfterSecond,
      aAfterBup,
      aTransform: inners[0]!.style.transform,
      aDragging: inners[0]!.getAttribute('data-dragging'),
      bDragging: inners[1]!.getAttribute('data-dragging'),
    }
  })

  expect(state.aDuring).toBe('true')
  expect(state.aAfterSecond, '第二指按下后行 A 拖拽态不被改写').toBe('true')
  expect(state.bAfterSecond, '第二指不抢会话').toBeNull()
  expect(state.aAfterBup, '第二指抬起不影响行 A').toBe('true')
  expect(state.aDragging, '第一指抬起后正常收尾').toBeNull()
  expect(state.aTransform, 'dx=-30 未过半回弹关闭').toBe('')
  expect(state.bDragging, '行 B 全程无残留').toBeNull()
})

/**
 * 真鼠标把某行滑开（展开删除钮）。
 *
 * 落点与稳定性要点（实测）：
 * - **必须落在行体上，不能落在商品缩略图上**：`<img>` 上按下 + 横移会触发浏览器原生图片拖拽
 *   （实测事件序列 `pointerdown → pointermove → dragstart → pointercancel`），滑动会话被 cancel
 *   直接收掉，`data-dragging` 永远不会置位。行宽 574px 时缩略图占左侧约 100px，故取 ~0.35 宽处。
 * - 不能「取一次 boundingBox 就直接大跨度 move」：冷启动下缩略图解码会带来布局位移，陈旧坐标会
 *   让 pointerdown 落到别的元素上、整条链路静默失效。改为 hover（自带滚动 + 命中检查）→ 取当次
 *   坐标 → 按下后先小位移并断言 `data-dragging` 已置位（越过 4px 阈值才置位，等价于「会话真的
 *   建立了」）→ 再走完位移。
 */
async function swipeOpenRow(page: import('@playwright/test').Page, inner: import('@playwright/test').Locator) {
  const probe = (await inner.boundingBox())!
  const dx = Math.min(200, Math.round(probe.width * 0.35))
  await inner.hover({ position: { x: dx, y: Math.round(probe.height / 2) } })
  const box = (await inner.boundingBox())!
  const x = box.x + dx
  const y = box.y + box.height / 2
  await page.mouse.down()
  await page.mouse.move(x - 8, y, { steps: 2 })
  await expect
    .poll(() => inner.evaluate((el) => el.getAttribute('data-dragging')), {
      message: '按下后首次横移必须建立滑动会话（落点被缩略图原生拖拽接管 / 坐标陈旧都会导致这里的空值）',
    })
    .toBe('true')
  await page.mouse.move(x - 80, y, { steps: 4 })
  await page.mouse.up()
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).style.transform)).toBe('translateX(-72px)')
}

test('cart：展开态点行体收起且不派 oas-item-click；点其他行收起已展开行', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')

  const host = page.locator('#cart-delete-swipe')
  const inner = host.locator('[part="item-inner"]').first()
  // 等 demo 内缩略图解码完成：图片 late-decode 会带来布局位移，让后续绝对坐标失效
  // （必须先滚动、再等——懒加载缩略图离屏时永远不会开始加载，见 settleSwipeRow 注释）
  await settleSwipeRow(page, inner)

  await page.evaluate(() => {
    const w = window as unknown as { __cartItemClicks?: string[] }
    w.__cartItemClicks = []
    document.getElementById('cart-delete-swipe')?.addEventListener('oas-item-click', (e) => {
      ;(w.__cartItemClicks ??= []).push((e as CustomEvent<{ id: string }>).detail.id)
    })
  })

  // 真鼠标滑动展开行 A
  await swipeOpenRow(page, inner)

  // 点已展开行的行体 → 收起，不派 oas-item-click
  await host.locator('[part="item-body"]').first().click()
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).style.transform)).toBe('')
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __cartItemClicks?: string[] }).__cartItemClicks))
    .toEqual([])

  // 再展开行 A，点行 B 的行体 → 行 A 收起 + 行 B 派发 oas-item-click
  await swipeOpenRow(page, inner)
  await host.locator('[part="item-body"]').nth(1).click()
  await expect.poll(() => inner.evaluate((el) => (el as HTMLElement).style.transform)).toBe('')
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __cartItemClicks?: string[] }).__cartItemClicks))
    .toEqual(['b'])
})

// 回归（本批修复）：滑开第二行时收起第一行——修复前两行同时露删除钮（状态只剩新行），
// 用户可见的「同屏至多一行展开」不成立。
test('cart：滑开第二行时收起第一行（同屏至多一行露删除钮）', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cart')
  const host = page.locator('#cart-delete-swipe')
  const innerA = host.locator('[part="item-inner"]').nth(0)
  const innerB = host.locator('[part="item-inner"]').nth(1)
  const transformOf = (locator: import('@playwright/test').Locator) =>
    locator.evaluate((el) => (el as HTMLElement).style.transform)

  await settleSwipeRow(page, innerA)
  await swipeOpenRow(page, innerA)
  expect(await transformOf(innerA)).toBe('translateX(-72px)')

  await swipeOpenRow(page, innerB)
  expect(await transformOf(innerB)).toBe('translateX(-72px)')
  await expect.poll(() => transformOf(innerA), { message: '旧展开行必须同时收起（不得两行同时露删除钮）' }).toBe('')
})

// —— T19 L3：batch 能力子路径 demo（能力子路径章节）——
// 勾选 → 点「删除所选」→ executeBatch 编排回写 + oas-batch 反馈可见（条目减少 + 输出行）；
// 禁用条目（勾不中）不被编排误删。
test('cart：批量操作 demo——勾选后删除所选，oas-batch 反馈可见、禁用卡保留', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cart-batch')
  const host = page.locator('#cart-batch')

  // 初始 4 条（含 1 条禁用）
  const itemsBefore = await host.evaluate((el) => JSON.parse(el.getAttribute('items') ?? '[]') as { id: string }[])
  expect(itemsBefore).toHaveLength(4)

  // 再勾选一条（初始 a/b 已勾选；c 未勾选）→ 勾上 c
  const checkC = host.locator('[part="item-check"]').nth(2)
  await checkC.click()
  await expect(checkC).toBeChecked()

  // 点「删除所选」→ a/b/c 被删、禁用 d 保留
  await page.locator('#cart-batch-remove').click()
  await expect
    .poll(() =>
      host.evaluate((el) =>
        (JSON.parse(el.getAttribute('items') ?? '[]') as { id: string; disabled?: boolean }[]).map((i) => i.id),
      ),
    )
    .toEqual(['d'])
  await expect(page.locator('#cart-batch-out')).toContainText('oas-batch')
  await expect(page.locator('#cart-batch-out')).toContainText('成功 3 件')

  // 批量收藏：剩 1 条禁用卡勾不中 → 零操作反馈可见
  await page.locator('#cart-batch-favorite').click()
  await expect(page.locator('#cart-batch-out')).toContainText('成功 0 件')
})

// —— 复核修复批（C1）：config-provider 注入禁用时 executeBatch 必须全部跳过——
// 注入禁用是 provider 属性级判定不写 cart attribute；helper 若只判 attribute 会照删。
// e2e 把 demo 的 batch cart 移进 disabled provider 包裹，点击批量按钮走页面内真实 helper。
test('cart：config-provider 注入禁用——批量操作全跳过、items 零变化', async ({ page }) => {
  await page.goto('/components/cart.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cart-batch')
  const host = page.locator('#cart-batch')

  // 把 cart 移进 disabled provider 包裹（provider 未注册也无妨——判定只看 tag 名与属性）
  await page.evaluate(() => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('disabled', '')
    const cart = document.getElementById('cart-batch')!
    provider.appendChild(cart)
    document.querySelector('.demo-block')!.appendChild(provider)
  })
  await up(page, '#cart-batch')

  const before = await host.evaluate((el) => el.getAttribute('items'))
  // 触发用 DOM API click（诊断实证：DOM 移动后 playwright 坐标点击的 hit-target 派发不稳，
  // capture/bubble 全空；btn.click() 从元素派发事件，capture/bubble/公开 handler 全部一致，
  // 对「注入禁用判定」这一验证目标语义等价）
  await page.evaluate(() => (document.getElementById('cart-batch-remove') as HTMLButtonElement).click())
  // items 零变化（修复前：只判 attribute，注入禁用下照删 4→1）
  expect(await host.evaluate((el) => el.getAttribute('items'))).toBe(before)
  await expect(page.locator('#cart-batch-out')).toContainText('成功 0 件')
  // oas-batch 仍派发（skipped 全量）且本体按钮禁用态一致
  await expect(page.locator('#cart-batch-out')).toContainText('oas-batch')
})
