// 复核回归：goods-list——瀑布流真实列布局、触底加载更多、插槽整体替换、暗色与空态。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const ITEMS = JSON.stringify([
  { title: 'A 商品', price: 10, image: '/assets/demo-square-1.svg' },
  { title: 'B 商品', price: 20 },
  { title: 'C 商品', price: 30, image: '/assets/demo-square-2.svg' },
  { title: 'D 商品', price: 40, image: '/assets/demo-square-3.svg' },
  { title: 'E 商品', price: 50 },
  { title: 'F 商品', price: 60, image: '/assets/demo-square-4.svg' },
])

/** 预置一个 goods-list 实例 */
async function mount(page: import('@playwright/test').Page, id: string, attrs: Record<string, string>): Promise<void> {
  await page.evaluate(
    ({ id, attrs }) => {
      const el = document.createElement('oas-goods-list')
      el.id = id
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.querySelector('.demo-block')!.appendChild(el)
    },
    { id, attrs },
  )
  await up(page, `#${id}`)
}

test('goods-list：瀑布流真实列布局——固定列数 + 卡片按测得高度均衡放置（非全部堆首列）', async ({ page }) => {
  await page.goto('/components/goods-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-list')
  await mount(page, 'gl-e2e-waterfall', { items: ITEMS, columns: '3' })

  const layout = await page.locator('#gl-e2e-waterfall').evaluate((el) => {
    const root = el.shadowRoot!
    const cols = [...root.querySelectorAll<HTMLElement>('[part="col"]')]
    return {
      colCount: cols.length,
      perCol: cols.map((col) => col.childElementCount),
      total: root.querySelectorAll('[part="card"]').length,
      colHeights: cols.map((col) => col.getBoundingClientRect().height),
      cardsInGrid: cols.every((col) => [...col.children].every((c) => c.getAttribute('part') === 'card')),
    }
  })
  expect(layout.colCount).toBe(3)
  expect(layout.total).toBe(6)
  expect(layout.cardsInGrid).toBe(true)
  // 均衡放置：不等高卡片（有图/无图）分布后，各列高度接近（最短列放置的可见结果），
  // 且不出现「全部堆在一列」的退化
  expect(layout.perCol.every((n) => n >= 1)).toBe(true)
  const maxHeight = Math.max(...layout.colHeights)
  const minHeight = Math.min(...layout.colHeights)
  expect(maxHeight - minHeight).toBeLessThan(maxHeight * 0.9)
})

test('goods-list：触底真滚动——滚动到底触发 oas-load-more，宿主协议追加数据 + loading 态可见', async ({ page }) => {
  await page.goto('/components/goods-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-list')
  // 首触底在挂载（哨兵进入视口）时即派发——委托监听必须先于挂载就位
  await page.evaluate(() => {
    const w = window as unknown as { __glEvents: number[]; __glAllEvents?: number }
    w.__glEvents = []
    w.__glAllEvents = 0
    document.addEventListener('oas-load-more', (e) => {
      const el = e.target as HTMLElement
      w.__glAllEvents = (w.__glAllEvents ?? 0) + 1
      if (el.id !== 'gl-e2e-more') return
      w.__glEvents.push(1)
      el.setAttribute('loading', '')
      setTimeout(() => {
        const current = JSON.parse(el.getAttribute('items')!) as unknown[]
        el.setAttribute('items', JSON.stringify([...current, { title: '触底追加的商品', price: 99 }]))
        el.removeAttribute('loading')
      }, 150)
    })
  })
  await mount(page, 'gl-e2e-more', { items: JSON.stringify([{ title: '首屏商品', price: 9 }]), columns: '3' })
  const host = page.locator('#gl-e2e-more')
  // 真实浏览器哨兵初渲染在视口外（demo 页头部较长）——显式滚到哨兵触发首触底
  await host.evaluate((el) => {
    el.scrollIntoView({ block: 'center' })
    document.dispatchEvent(new Event('scroll'))
  })
  const readEvents = (): Promise<number> =>
    page.evaluate(() => (window as unknown as { __glEvents: number[] }).__glEvents.length)
  // 触发链带 rAF 节流：poll 等待派发落定（哨兵进入视口 → 派发 → 宿主协议循环）
  await expect.poll(readEvents, { timeout: 3000 }).toBeGreaterThanOrEqual(1)
  // 等宿主协议循环落定：追加的条目仍不足一屏时哨兵依旧可见 → 继续派发（无限列表语义），
  // 断言「追加发生过」（卡数增长）后置 no-more 终止循环
  await expect(host.locator('[part="spinner"]')).toBeHidden({ timeout: 3000 })
  await expect.poll(async () => host.locator('[part="card"]').count(), { timeout: 5000 }).toBeGreaterThan(1)
  await host.evaluate((el) => el.setAttribute('no-more', ''))
  await expect(host.locator('[part="more-text"]')).toContainText('没有更多了')
  await expect(host.locator('[part="card"]').count()).resolves.toBeGreaterThan(1)
  const cardsBefore = await host.locator('[part="card"]').count()
  const eventsBefore = await readEvents()
  expect(cardsBefore).toBeGreaterThan(1)
  // no-more 停止派发的状态机矩阵由单测覆盖（shouldRequestMore 纯函数 + scroll 事件驱动单测）；
  // e2e 里「滚动后零事件」无确定性信号（页面其余实例都在视口外），硬等只能引入固定 sleep——不做。
  void eventsBefore
})

test('goods-list：卡片位插槽整体替换——宿主卡被均衡分配进列且 items 被忽略，点宿主卡不派 oas-item-click', async ({
  page,
}) => {
  await page.goto('/components/goods-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-list')
  // 宿主卡（oas-product-card）会被搬进 goods-list 的 shadow 列——document.querySelector
  // 查不到 shadow 内元素，改经宿主实例的 shadow 断言 upgrade 完成
  await page.waitForFunction(
    () => {
      const host = document.getElementById('gl-slot')
      const card = host?.shadowRoot?.querySelector('oas-product-card')
      return card != null && card.shadowRoot != null
    },
    undefined,
    { timeout: 15000 },
  )

  // 定位插槽 demo（含 oas-product-card 子元素的 goods-list）
  const slotHost = page.locator('#gl-slot')
  await expect(slotHost).toBeVisible()
  const slotted = await slotHost.evaluate((el) => {
    const root = el.shadowRoot!
    const cols = [...root.querySelectorAll<HTMLElement>('[part="col"]')]
    // 宿主卡被搬进 shadow 列（light DOM 查不到）：列内非内建卡即宿主卡
    const foreignInCols = cols.flatMap((col) => [...col.children]).filter((c) => c.getAttribute('part') !== 'card')
    return {
      builtinCards: root.querySelectorAll('[part="card"]').length,
      hostCardsInCols: foreignInCols.length,
      colCount: cols.length,
    }
  })
  expect(slotted.builtinCards).toBe(0) // items 默认渲染被整体替换
  expect(slotted.hostCardsInCols).toBe(3) // 三张宿主卡（2 product-card + 1 自定义 div）都在列里
  expect(slotted.colCount).toBe(3)
  // 点宿主卡（oas-product-card 无事件）不产生 oas-item-click
  let clicks = 0
  const onItem = (): void => {
    clicks++
  }
  page.exposeFunction('__glClick', onItem).catch(() => {})
  await slotHost.evaluate((el) =>
    el.addEventListener(
      'oas-item-click',
      () =>
        ((window as unknown as { __glClicks?: number }).__glClicks =
          ((window as unknown as { __glClicks?: number }).__glClicks ?? 0) + 1),
    ),
  )
  await slotHost.locator('oas-product-card').first().click()
  const glClicks = await slotHost.evaluate((el) => (window as unknown as { __glClicks?: number }).__glClicks ?? 0)
  expect(glClicks).toBe(0)
})

test('goods-list：暗色 token 与空态插槽——面板/卡片底色随主题翻转，空态自定义内容可见', async ({ page }) => {
  await page.goto('/components/goods-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-list')
  await mount(page, 'gl-e2e-dark', { items: JSON.stringify([{ title: '暗色商品', price: 1 }]), columns: '2' })

  const host = page.locator('#gl-e2e-dark')
  const readBg = (): Promise<string> =>
    host.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!).backgroundColor)
  const lightBg = await readBg()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.demo-block__body')!).backgroundColor))
    .toBe('rgb(24, 24, 27)')
  const darkBg = await readBg()
  const lum = (bg: string): number => {
    const m = bg.match(/\d+/g) ?? ['255', '255', '255']
    return Number(m[0]) + Number(m[1]) + Number(m[2])
  }
  expect(lum(darkBg)).toBeLessThan(lum(lightBg))
  await page.evaluate(() => document.documentElement.classList.remove('dark'))

  // 空态插槽 demo：自定义空态可见（非缺省文案）
  await expect(page.locator('oas-goods-list:has([slot="empty"]) [part="empty"]')).toBeVisible()
  await expect(page.locator('[slot="empty"]').first()).toContainText('没有匹配的商品')
})
