// 复核回归：virtual-list——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('virtual-list 独立页：items 升级前赋值回收 + 视口高度受限', async ({ page }) => {
  // 曾现 bug：demo 在 onMounted 用 basic.items = [...] 赋值，若此时组件未升级
  // （模块动态 import 与 onMounted 时序竞争），自有属性遮蔽原型 setter → 不渲染。
  // 另有视口 height 不落 CSS 高度的同款撑高问题。
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-virtual-list')
  await page.waitForTimeout(600)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-virtual-list')].map((vlist) => {
      const viewport = vlist.shadowRoot!.querySelector('[part=viewport]')
      return {
        itemCount: vlist.shadowRoot!.querySelectorAll('[part=item]').length,
        viewportHeight: viewport?.getBoundingClientRect().height ?? -1,
        scrollable: viewport ? viewport.scrollHeight > viewport.clientHeight : true,
      }
    }),
  )
  expect(r.length).toBeGreaterThan(0)
  for (const [i, v] of r.entries()) {
    expect(v.itemCount, `第 ${i} 个 virtual-list 未渲染`).toBeGreaterThan(0)
    if (v.viewportHeight >= 0) expect(v.viewportHeight).toBeLessThanOrEqual(400)
    expect(v.scrollable).toBe(true)
  }
})

test('virtual-list 滚轮增量滚动不失控（overflow-anchor 回归）', async ({ page }) => {
  // 曾现 bug：虚拟滚动重渲染触发 Chrome 滚动锚定，滚轮增量逐帧放大（120 → 1056 → 2784），
  // 表现为"滚一下直接滚到底/越滚越快"。修复：.viewport/.inner 加 overflow-anchor: none。
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#vl-basic')
  await page.waitForTimeout(600)
  const box = await page.locator('#vl-basic').boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 50)
  const scrollTop = () =>
    page.evaluate(() => {
      const el = document.querySelector('#vl-basic')!
      return el.shadowRoot!.querySelector('[part=viewport]')!.scrollTop
    })
  const s0 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s1 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s2 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s3 = await scrollTop()
  const d1 = s1 - s0
  const d2 = s2 - s1
  const d3 = s3 - s2
  // 每格滚轮应基本按增量前进（120 上下），绝不失控放大
  expect(d1).toBeGreaterThanOrEqual(100)
  expect(d2).toBeGreaterThanOrEqual(100)
  expect(d3).toBeGreaterThanOrEqual(100)
  expect(d2).toBeLessThanOrEqual(240)
  expect(d3).toBeLessThanOrEqual(240)
})

test('virtual-list buffer 宿主 property 遮蔽原型方法后渲染不崩（命名冲突回归）', async ({ page }) => {
  // 曾现 bug：私有方法 buffer() 与公开 attribute buffer 同名，React/Vue 对自定义元素同名
  // 绑定走 property 通道（el.buffer = 8 在实例挂自有属性遮蔽原型方法），连接即渲染时
  // this.buffer() 抛 TypeError 崩溃。修复=私有方法改名 bufferSize()，attribute 语义不变。
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-virtual-list')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-virtual-list')
    el.setAttribute('height', '100')
    el.setAttribute('item-height', '20')
    el.setAttribute('buffer', '8')
    el.setAttribute('items', JSON.stringify(Array.from({ length: 100 }, (_, i) => i)))
    ;(el as unknown as { buffer: number }).buffer = 8 // 模拟宿主 property 通道
    document.body.appendChild(el)
    const count = el.shadowRoot!.querySelectorAll('[part="item"]').length
    const first = el.shadowRoot!.querySelector('[part="item"]')?.getAttribute('data-index')
    el.remove()
    return { count, first }
  })
  expect(r.count, '连接即渲染不抛错且按 buffer=8 生效（13 = 5 可见 + 上下 8）').toBe(13)
  expect(r.first, '首项索引 0').toBe('0')
})

test('virtual-list 动态行高：不等高行实测渲染 + 总高修正 + scrollToIndex 定位', async ({ page }) => {
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#vl-dyn')
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const el = document.querySelector('#vl-dyn')!
    const items = [...el.shadowRoot!.querySelectorAll('[part="item"]')] as HTMLElement[]
    const heights = items.map((it) => it.getBoundingClientRect().height)
    const inner = el.shadowRoot!.querySelector('[part="inner"]') as HTMLElement
    const viewport = el.shadowRoot!.querySelector('[part="viewport"]') as HTMLElement
    return {
      count: items.length,
      heights,
      allDistinct: new Set(heights.map((h) => Math.round(h))).size > 1,
      innerH: inner.getBoundingClientRect().height,
      inlineLock: items.every((it) => it.style.height === ''),
      scrollable: viewport.scrollHeight > viewport.clientHeight,
    }
  })
  // 行不锁高（无内联 height）且实测行高有差异（1/2/3 行描述文本混排）
  expect(r.count).toBeGreaterThan(0)
  expect(r.inlineLock).toBe(true)
  expect(r.allDistinct).toBe(true)
  expect(r.scrollable).toBe(true)

  // scrollToIndex 动态模式：跳转后目标行出现在视口内
  await page.evaluate(() => {
    const el = document.querySelector('#vl-dyn') as unknown as {
      scrollToIndex: (i: number, o?: { align?: string }) => void
    }
    el.scrollToIndex(40, { align: 'start' })
  })
  await page.waitForTimeout(400)
  const pos = await page.evaluate(() => {
    const el = document.querySelector('#vl-dyn')!
    const viewport = el.shadowRoot!.querySelector('[part="viewport"]') as HTMLElement
    const target = el.shadowRoot!.querySelector('[part="item"][data-index="40"]') as HTMLElement
    return {
      scrollTop: viewport.scrollTop,
      hasTarget: !!target,
      targetTop: target ? target.getBoundingClientRect().top - viewport.getBoundingClientRect().top : -1,
    }
  })
  expect(pos.hasTarget).toBe(true)
  expect(pos.scrollTop).toBeGreaterThan(0)
  expect(pos.targetTop).toBeGreaterThanOrEqual(-1)
  expect(pos.targetTop).toBeLessThan(80)
})
