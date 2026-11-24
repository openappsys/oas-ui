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
