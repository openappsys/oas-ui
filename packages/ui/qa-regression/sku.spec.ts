// 复核回归：sku——缺货置灰、切换颜色后可选、价格联动、数量库存上限。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('sku：缺货选项置灰并标缺货，切换颜色后可选，价格与数量上限随 sku 联动', async ({ page }) => {
  await page.goto('/components/sku.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-sku')

  const host = page.locator('#sku-basic')
  const option = (value: string) => host.locator(`[part="option"][data-value="${value}"]`)

  // 选中曜石黑：该颜色下 M 码无库存 → 置灰 + 缺货（可选路径提示）
  await option('曜石黑').click()
  await expect(option('M')).toHaveAttribute('data-available', 'false')
  await expect(option('M')).toContainText('缺货')
  await expect(option('S')).toHaveAttribute('data-available', 'true')

  // 切到雾霭白：M 码有库存 → 可选，价格随组合联动
  await option('雾霭白').click()
  await expect(option('M')).toHaveAttribute('data-available', 'true')
  await option('M').click()
  await expect(page.locator('#sku-basic-out')).toContainText('329')

  // 换尺码后切回曜石黑：价格随组合更新（S 码在黑/白均有库存）
  await option('S').click()
  await option('曜石黑').click()
  await expect(page.locator('#sku-basic-out')).toContainText('299')

  // 数量上限 = 库存 2：加到 2 后加号禁用
  const qty = page.locator('#sku-qty')
  await qty.locator('[part="plus"]').click()
  await expect(qty.locator('[part="quantity-input"]')).toHaveValue('2')
  await expect(qty.locator('[part="plus"]')).toBeDisabled()
  await expect(page.locator('#sku-qty-out')).toContainText('2')
})

// 回归（本轮新增能力）：layout="popup" 用 bottom-sheet 承载同一面板——真实上滑面板可见、
// 面板内可正常选择、Esc 走 bottom-sheet 协议关闭并回写 open。
test('sku popup：底部弹层承载同一面板，选择可用，Esc 关闭并回写 open', async ({ page }) => {
  await page.goto('/components/sku.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sku-popup')

  const host = page.locator('#sku-popup')
  const openHost = page.locator('#sku-popup-open')
  const out = page.locator('#sku-popup-out')

  // 未打开：承载件隐藏、面板不在屏内
  const closed = await host.evaluate((el) => {
    const root = (el as HTMLElement).shadowRoot!
    const sheet = root.querySelector('oas-bottom-sheet') as HTMLElement
    const panel = root.querySelector('[part="panel"]') as HTMLElement
    return {
      panelInSheet: sheet.contains(panel),
      sheetOpen: sheet.hasAttribute('open'),
      sheetHidden: sheet.hidden,
    }
  })
  expect(closed.panelInSheet, 'popup 形态面板必须在 sheet 的 light DOM（内容复用不复制）').toBe(true)
  expect(closed.sheetOpen).toBe(false)
  expect(await host.evaluate((el) => (el as HTMLElement).shadowRoot!.querySelectorAll('[part="panel"]').length)).toBe(1)

  await openHost.click()
  await expect(host).toHaveAttribute('open', '')
  await expect(out).toContainText('弹层已打开')

  // 面板真的升到视口底部（用户可见）：inner sheet 贴底、宽度铺满、有高度
  const geom = await host.evaluate((el) => {
    const root = (el as HTMLElement).shadowRoot!
    const sheetHost = root.querySelector('oas-bottom-sheet') as HTMLElement
    const sheet = sheetHost.shadowRoot!.querySelector('.sheet') as HTMLElement
    const frame = sheet.getBoundingClientRect()
    return {
      top: frame.top,
      bottom: frame.bottom,
      left: frame.left,
      width: frame.width,
      height: frame.height,
      vw: window.innerWidth,
      vh: window.innerHeight,
    }
  })
  expect(geom.height, '弹层必须有可见高度').toBeGreaterThan(80)
  expect(geom.bottom, '弹层贴视口底部').toBeGreaterThan(geom.vh - 4)
  expect(geom.top, '弹层若未升起会停在视口下方（translateY(100%)）').toBeLessThan(geom.vh - 40)
  expect(geom.width).toBeGreaterThan(geom.vw / 2)

  // 面板内交互照常：选颜色 + 尺码 → 价格联动
  await host.locator('[part="option"][data-value="雾霭白"]').click()
  await host.locator('[part="option"][data-value="M"]').click()
  await expect(out).toContainText('329')

  // Esc 走 bottom-sheet 协议：容器派发 oas-close，组件收起并回写 open
  await page.keyboard.press('Escape')
  await expect(host).not.toHaveAttribute('open')
  await expect(out).toContainText('esc')

  const afterClose = await host.evaluate((el) => {
    const root = (el as HTMLElement).shadowRoot!
    const sheet = root.querySelector('oas-bottom-sheet') as HTMLElement
    const frame = (sheet.shadowRoot!.querySelector('.sheet') as HTMLElement).getBoundingClientRect()
    return { sheetOpen: sheet.hasAttribute('open'), top: frame.top, vh: window.innerHeight }
  })
  expect(afterClose.sheetOpen).toBe(false)
  expect(afterClose.top, '关闭后抽屉必须滑出视口').toBeGreaterThanOrEqual(afterClose.vh - 2)
})
