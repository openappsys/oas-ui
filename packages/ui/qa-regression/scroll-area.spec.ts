// 复核回归：scroll-area——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

test('scroll-area 横向可滚：滚轮增量横向滚动 + 横向/纵向 thumb 可拖拽', async ({ page }) => {
  // 曾现 bug：thumb 完全无拖拽实现（mousedown 无响应）；横向仅溢出时原生纵向滚轮
  // 不滚动横向轴，用户"滚不动"。修复：thumb 拖拽 + 滚轮纵向增量转译横向。
  await page.goto('/components/scroll-area.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-scroll-area')
  await page.waitForTimeout(600)

  // 横向 demo（第 2 个 oas-scroll-area）：纵向滚轮 → 横向滚动
  const area = page.locator('oas-scroll-area').nth(1)
  await area.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const r = await area.evaluate((el) => {
    const vp = el.shadowRoot!.querySelector('[part=viewport]')!
    const br = vp.getBoundingClientRect()
    return { x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const afterWheel = await area.evaluate((el) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollLeft)
  expect(afterWheel).toBeGreaterThan(0)

  // 横向 thumb 拖拽：scrollLeft 变化
  const h = await area.evaluate((el) => {
    const vp = el.shadowRoot!.querySelector('[part=viewport]')!
    const before = vp.scrollLeft
    const thumbEl = el.shadowRoot!.querySelector('[part=thumb-h]')!
    const br = thumbEl.getBoundingClientRect()
    return { before, x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(h.x + 30, h.y + h.h / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + h.w / 2, h.y + h.h / 2, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const afterHDrag = await area.evaluate((el) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollLeft)
  expect(afterHDrag).not.toBe(h.before)

  // 纵向 thumb 拖拽（基础 demo，第 1 个）：scrollTop 增大
  // 注意：scrollIntoView 时 thumb 起点可能落在文档站粘性页头之下，pointerdown 被页头截走；
  // 把 host 移到固定坐标（避开页头）再拖，保证拖拽真实发生在 thumb 上。
  const area0 = page.locator('oas-scroll-area').nth(0)
  await area0.evaluate((el) => {
    el.style.cssText = 'position: fixed; left: 80px; top: 300px; z-index: 9999'
  })
  await page.waitForTimeout(300)
  const v = await area0.evaluate((el) => {
    const vp = el.shadowRoot!.querySelector('[part=viewport]')!
    const before = vp.scrollTop
    const thumbEl = el.shadowRoot!.querySelector('[part=thumb-v]')!
    const br = thumbEl.getBoundingClientRect()
    return { before, x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(v.x + v.w / 2, v.y + 10)
  await page.mouse.down()
  await page.mouse.move(v.x + v.w / 2, v.y + v.h - 10, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const afterVDrag = await area0.evaluate((el) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollTop)
  expect(afterVDrag).toBeGreaterThan(v.before)
})

// —— type 四档显示模式（auto-hide 扩枚举批）——
// auto-hide 布尔扩为 type=auto|always|scroll|hover。锁各档用户可见行为：
// always 常显（默认不变）、auto 滚动/悬停显示后延时隐藏（兼容映射）、
// scroll 仅滚动显示（悬停不出）、hover 悬停显示离开即隐。断言含 computed opacity（真实可见性）。
test('scroll-area type 四档显示模式行为正确（always/auto/scroll/hover）', async ({ page }) => {
  await page.goto('/components/scroll-area.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-scroll-area')
  await page.waitForTimeout(600)

  const peekState = (loc: ReturnType<typeof page.locator>) =>
    loc.evaluate((el) => {
      const t = el.shadowRoot!.querySelector('.track-v')!
      return { peek: t.classList.contains('peek'), opacity: Number(getComputedStyle(t).opacity) }
    })

  // always（基础用法 demo，无 type 属性 = 默认）：溢出常显
  const alwaysArea = page.locator('oas-scroll-area').first()
  await alwaysArea.scrollIntoViewIfNeeded()
  const always = await peekState(alwaysArea)
  expect(always.peek).toBe(true)
  expect(always.opacity).toBeGreaterThan(0)

  // hover：悬停显示（opacity > 0），移开立即隐藏
  const hoverArea = page.locator('oas-scroll-area[type="hover"]')
  await hoverArea.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  expect((await peekState(hoverArea)).peek).toBe(false)
  const hr = await hoverArea.evaluate((el) => {
    const b = el.shadowRoot!.querySelector('[part=viewport]')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(hr.x, hr.y)
  await page.waitForTimeout(300)
  const hoverShown = await peekState(hoverArea)
  expect(hoverShown.peek).toBe(true)
  expect(hoverShown.opacity).toBeGreaterThan(0)
  await page.mouse.move(10, 10)
  await page.waitForTimeout(300)
  expect((await peekState(hoverArea)).peek).toBe(false)

  // scroll：悬停不显示，滚动显示，停止后延时隐藏
  const scrollArea = page.locator('oas-scroll-area[type="scroll"]')
  await scrollArea.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const sr = await scrollArea.evaluate((el) => {
    const b = el.shadowRoot!.querySelector('[part=viewport]')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(sr.x, sr.y)
  await page.waitForTimeout(200)
  expect((await peekState(scrollArea)).peek).toBe(false)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  expect((await peekState(scrollArea)).peek).toBe(true)
  await page.waitForTimeout(1200)
  expect((await peekState(scrollArea)).peek).toBe(false)

  // auto（兼容旧 auto-hide 语义）：滚动显示，停止后延时隐藏
  const autoArea = page.locator('oas-scroll-area[type="auto"]')
  await autoArea.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const ar = await autoArea.evaluate((el) => {
    const b = el.shadowRoot!.querySelector('[part=viewport]')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(ar.x, ar.y)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  expect((await peekState(autoArea)).peek).toBe(true)
  await page.waitForTimeout(1200)
  expect((await peekState(autoArea)).peek).toBe(false)
})

// —— 缺陷 8：多级子菜单视口边界翻转 ——
// 曾现 bug：ContextMenu/Menu/Dropdown 的多级子菜单一律向右展开，贴近视口右缘时被子菜单
// 顶出屏幕被裁剪。修复：展开前检测视口剩余空间，右侧不足向左翻转（flip-left）、
// 底部不足向上翻转（flip-up），三级及以上逐级检测。断言：可见子菜单完整落在视口内。

/** 收集所有可见子菜单的矩形（递归遍历 open shadow root；原生 querySelectorAll 不穿透 shadow） */
