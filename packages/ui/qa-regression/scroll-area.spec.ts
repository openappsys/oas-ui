// 复核回归：scroll-area——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

test('scroll-area 横向可滚：滚轮增量横向滚动 + 横向/纵向 thumb 可拖拽', async ({ page }) => {
  // 曾现 bug：thumb 完全无拖拽实现（mousedown 无响应）；横向仅溢出时原生纵向滚轮
  // 不滚动横向轴，用户"滚不动"。修复：thumb 拖拽 + 滚轮纵向增量转译横向。
  await page.goto('/components/scroll-area.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-scroll-area')

  // 横向 demo（第 2 个 oas-scroll-area）：纵向滚轮 → 横向滚动
  const area = page.locator('oas-scroll-area').nth(1)
  // 布局就绪的真实信号：viewport 出现横向溢出（后续滚轮/拖拽断言的前提条件）
  await expect
    .poll(() =>
      area.evaluate((el) => {
        const vp = el.shadowRoot!.querySelector('[part=viewport]')!
        return vp.scrollWidth > vp.clientWidth
      }),
    )
    .toBe(true)
  await area.scrollIntoViewIfNeeded()
  const r = await area.evaluate((el) => {
    const vp = el.shadowRoot!.querySelector('[part=viewport]')!
    const br = vp.getBoundingClientRect()
    return { x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2)
  await page.mouse.wheel(0, 120)
  // 滚轮纵向增量转译为横向滚动：轮询至 scrollLeft 真实变化（scroll 事件异步到达）
  await expect
    .poll(() => area.evaluate((el) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollLeft > 0))
    .toBe(true)

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
  // 轮询至 scrollLeft 偏离拖拽前位置（pointerup 后位置更新异步完成）
  const hBefore = h.before
  await expect
    .poll(() =>
      area.evaluate((el, before) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollLeft !== before, hBefore),
    )
    .toBe(true)

  // 纵向 thumb 拖拽（基础 demo，第 1 个）：scrollTop 增大
  // 注意：scrollIntoView 时 thumb 起点可能落在文档站粘性页头之下，pointerdown 被页头截走；
  // 把 host 移到固定坐标（避开页头）再拖，保证拖拽真实发生在 thumb 上。
  const area0 = page.locator('oas-scroll-area').nth(0)
  await area0.evaluate((el) => {
    el.style.cssText = 'position: fixed; left: 80px; top: 300px; z-index: 9999'
  })
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
  // 轮询至 scrollTop 大于拖拽前（向下拖动 thumb → 内容下滚）
  const vBefore = v.before
  await expect
    .poll(() =>
      area0.evaluate((el, before) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollTop > before, vBefore),
    )
    .toBe(true)
})

// —— type 四档显示模式（auto-hide 扩枚举批）——
// auto-hide 布尔扩为 type=auto|always|scroll|hover。锁各档用户可见行为：
// always 常显（默认不变）、auto 滚动/悬停显示后延时隐藏（兼容映射）、
// scroll 仅滚动显示（悬停不出）、hover 悬停显示离开即隐。断言含 computed opacity（真实可见性）。
test('scroll-area type 四档显示模式行为正确（always/auto/scroll/hover）', async ({ page }) => {
  await page.goto('/components/scroll-area.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-scroll-area')

  const peekState = (loc: ReturnType<typeof page.locator>) =>
    loc.evaluate((el) => {
      const t = el.shadowRoot!.querySelector('.track-v')!
      return { peek: t.classList.contains('peek'), opacity: Number(getComputedStyle(t).opacity) }
    })
  // 显示 = peek 类已加 + 过渡至少走过一帧（opacity 从 0 起步，首帧仍为 0，必须轮询到 > 0）
  const shown = (loc: ReturnType<typeof page.locator>) =>
    expect
      .poll(async () => {
        const s = await peekState(loc)
        return s.peek && s.opacity > 0
      })
      .toBe(true)
  // 隐藏 = peek 类已移除（HIDE_DELAY 800ms 后或 pointerleave 立即）
  const hidden = (loc: ReturnType<typeof page.locator>) =>
    expect.poll(async () => (await peekState(loc)).peek).toBe(false)

  // always（基础用法 demo，无 type 属性 = 默认）：溢出常显
  const alwaysArea = page.locator('oas-scroll-area').first()
  await alwaysArea.scrollIntoViewIfNeeded()
  await shown(alwaysArea)
  const always = await peekState(alwaysArea)
  expect(always.peek).toBe(true)
  await expect.poll(async () => (await peekState(alwaysArea)).opacity, { timeout: 5000 }).toBe(1)

  // hover：悬停显示（opacity > 0），移开立即隐藏
  const hoverArea = page.locator('oas-scroll-area[type="hover"]')
  await hoverArea.scrollIntoViewIfNeeded()
  // 初始（未悬停）即隐藏：scrollIntoView 只滚页面、不触发组件内部滚动，peek 从未加过
  expect((await peekState(hoverArea)).peek).toBe(false)
  const hr = await hoverArea.evaluate((el) => {
    const b = el.shadowRoot!.querySelector('[part=viewport]')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(hr.x, hr.y)
  await shown(hoverArea)
  const hoverShown = await peekState(hoverArea)
  expect(hoverShown.peek).toBe(true)
  await expect.poll(async () => (await peekState(hoverArea)).opacity, { timeout: 5000 }).toBe(1)
  await page.mouse.move(10, 10)
  await hidden(hoverArea)
  expect((await peekState(hoverArea)).peek).toBe(false)

  // scroll：悬停不显示，滚动显示，停止后延时隐藏
  const scrollArea = page.locator('oas-scroll-area[type="scroll"]')
  await scrollArea.scrollIntoViewIfNeeded()
  expect((await peekState(scrollArea)).peek).toBe(false)
  const sr = await scrollArea.evaluate((el) => {
    const b = el.shadowRoot!.querySelector('[part=viewport]')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(sr.x, sr.y)
  // scroll 档对 pointerenter 不响应（源码仅 auto/hover 分支），悬停本身不显示
  expect((await peekState(scrollArea)).peek).toBe(false)
  await page.mouse.wheel(0, 120)
  await shown(scrollArea)
  expect((await peekState(scrollArea)).peek).toBe(true)
  await hidden(scrollArea)
  expect((await peekState(scrollArea)).peek).toBe(false)

  // auto（兼容旧 auto-hide 语义）：滚动显示，停止后延时隐藏
  const autoArea = page.locator('oas-scroll-area[type="auto"]')
  await autoArea.scrollIntoViewIfNeeded()
  const ar = await autoArea.evaluate((el) => {
    const b = el.shadowRoot!.querySelector('[part=viewport]')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(ar.x, ar.y)
  await page.mouse.wheel(0, 120)
  await shown(autoArea)
  expect((await peekState(autoArea)).peek).toBe(true)
  await hidden(autoArea)
  expect((await peekState(autoArea)).peek).toBe(false)
})

// hover 档：拖拽 thumb 中指针移出容器 → 松手补隐藏（回归：曾滞留可见不消失）
test('scroll-area hover 档：拖拽中指针移出，松手补隐藏', async ({ page }) => {
  await page.goto('/components/scroll-area.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-scroll-area')
  const area = page.locator('oas-scroll-area[type="hover"]')
  await area.scrollIntoViewIfNeeded()
  const c = await area.evaluate((el) => {
    const b = el.shadowRoot!.querySelector('[part=viewport]')!.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(c.x, c.y)
  // 隐藏态轨道 pointer-events: none，必须等悬停 peek 生效后 thumb 才能命中 pointerdown
  await expect
    .poll(() => area.evaluate((el) => el.shadowRoot!.querySelector('.track-v')!.classList.contains('peek')))
    .toBe(true)
  const t = await area.evaluate((el) => {
    const th = el.shadowRoot!.querySelector('[part=thumb-v]')!
    const b = th.getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  })
  await page.mouse.move(t.x, t.y)
  await page.mouse.down()
  await page.mouse.move(t.x, t.y + 20, { steps: 3 })
  await page.mouse.move(10, 10, { steps: 3 }) // 拖拽中移出容器
  await page.mouse.up()
  await expect
    .poll(
      () => area.evaluate((el) => el.shadowRoot!.querySelector('.track-v')!.classList.contains('peek')),
      'hover 档拖拽移出后松手应隐藏（不滞留）',
    )
    .toBe(false)
})

// —— 缺陷 8：多级子菜单视口边界翻转 ——
// 曾现 bug：ContextMenu/Menu/Dropdown 的多级子菜单一律向右展开，贴近视口右缘时被子菜单
// 顶出屏幕被裁剪。修复：展开前检测视口剩余空间，右侧不足向左翻转（flip-left）、
// 底部不足向上翻转（flip-up），三级及以上逐级检测。断言：可见子菜单完整落在视口内。

/** 收集所有可见子菜单的矩形（递归遍历 open shadow root；原生 querySelectorAll 不穿透 shadow） */
