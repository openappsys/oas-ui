// 复核回归：tooltip——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('tooltip virtual 坐标跟随：鼠标移入画布 tooltip 跟随显示、移出隐藏（Vue demo 属性存活 + 可见反馈）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  // oas-tooltip host 零尺寸（inline-block 无内容），waitForSelector 默认等可见会超时 → 等 attached + shadowRoot
  await page.waitForSelector('#tt-follow', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#tt-follow', {
    timeout: 15000,
  })
  // virtual / virtual-x / virtual-y 在 Vue demo 中存活（不被剥离）
  const attrs = await page.evaluate(() => {
    const t = document.querySelector('#tt-follow')!
    return {
      virtual: t.getAttribute('virtual'),
      x: t.getAttribute('virtual-x'),
      y: t.getAttribute('virtual-y'),
    }
  })
  expect(attrs.virtual, 'virtual 被 Vue 剥离').not.toBeNull()
  expect(attrs.x).toBe('0')
  expect(attrs.y).toBe('0')

  // 画布滚到视口中央（避开粘性页头拦截指针）
  const canvas = page.locator('#vp-canvas')
  await canvas.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    document.querySelector('#vp-canvas')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)
  const box = await canvas.boundingBox()

  // 监听 oas-open-change 计数（demo 可见反馈：状态 tag 跟随中/未跟随）
  await page.evaluate(() => {
    ;(window as any).__tipOpenCount = 0
    document.querySelector('#tt-follow')!.addEventListener('oas-open-change', () => {
      ;(window as any).__tipOpenCount++
    })
  })

  // 移入画布 → tooltip 按坐标跟随显示
  await page.mouse.move(box!.x + 60, box!.y + 40)
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-follow')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return tip?.getAttribute('aria-hidden') === 'false' && tip?.style.top !== ''
  })
  const r = await page.evaluate(() => {
    const t = document.querySelector('#tt-follow')!
    const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const tb = tip.getBoundingClientRect()
    return {
      openCount: (window as any).__tipOpenCount,
      status: document.querySelector('#tt-follow-status')?.textContent ?? '',
      content: tip.textContent,
      placement: tip.getAttribute('data-placement'),
      top: parseFloat(tip.style.top),
      left: parseFloat(tip.style.left),
      inViewport:
        tb.top >= 0 &&
        tb.left >= 0 &&
        tb.bottom <= window.innerHeight &&
        tb.right <= window.innerWidth,
    }
  })
  expect(r.openCount, '鼠标移入应派发 oas-open-change').toBeGreaterThan(0)
  expect(r.status, 'demo 状态 tag 应有可见反馈').toContain('跟随')
  expect(r.content).toContain('坐标') // 内容实时更新
  expect(r.placement).toBe('bottom')
  expect(r.top, 'tooltip 应定位在鼠标下方').toBeGreaterThan(0)
  expect(r.left).toBeGreaterThan(0)
  expect(r.inViewport, 'tooltip 不应溢出视口').toBe(true)

  // 移出画布 → tooltip 隐藏 + 状态反馈复位
  await page.mouse.move(box!.x + box!.width + 60, box!.y + 40)
  await page.waitForFunction(
    () =>
      document
        .querySelector('#tt-follow')
        ?.shadowRoot?.querySelector('[part="tip"]')
        ?.getAttribute('aria-hidden') === 'true',
  )
  const closed = await page.evaluate(
    () => document.querySelector('#tt-follow-status')?.textContent ?? '',
  )
  expect(closed).toContain('未跟随')
})

test('tooltip virtual-anchor：hover 图表点位 tooltip 锚定该点显示、切换点位跟随', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#tt-anchor', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#tt-anchor', {
    timeout: 15000,
  })
  const attrs = await page.evaluate(() => {
    const t = document.querySelector('#tt-anchor')!
    return { virtual: t.getAttribute('virtual'), anchor: t.getAttribute('virtual-anchor') }
  })
  expect(attrs.virtual, 'virtual 被 Vue 剥离').not.toBeNull()
  expect(attrs.anchor).toBe('#vp-dot-0')

  await page.evaluate(() => {
    document.querySelector('#vp-chart')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)

  // hover 点位 0 → tooltip 锚定显示（placement=top，气泡在点位上方）
  await page.locator('#vp-dot-0').hover()
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-anchor')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return tip?.getAttribute('aria-hidden') === 'false'
  })
  const r0 = await page.evaluate(() => {
    const t = document.querySelector('#tt-anchor')!
    const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const tb = tip.getBoundingClientRect()
    const db = document.getElementById('vp-dot-0')!.getBoundingClientRect()
    return {
      content: tip.textContent,
      placement: tip.getAttribute('data-placement'),
      anchor: t.getAttribute('virtual-anchor'),
      aboveDot: Math.abs(tb.bottom - db.top) < 30, // 气泡底 ≈ 点位顶（8px gap）
    }
  })
  expect(r0.content).toContain('Q1')
  expect(r0.placement).toBe('top')
  expect(r0.anchor).toBe('#vp-dot-0')
  expect(r0.aboveDot, 'tooltip 应锚定在点位上方').toBe(true)

  // 切到点位 2 → virtual-anchor 与内容同步更新（跟随移动）
  await page.locator('#vp-dot-2').hover()
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-anchor')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return tip?.textContent?.includes('Q3') ?? false
  })
  const r1 = await page.evaluate(() => {
    const t = document.querySelector('#tt-anchor')!
    return {
      anchor: t.getAttribute('virtual-anchor'),
      content: t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!.textContent,
    }
  })
  expect(r1.anchor).toBe('#vp-dot-2')
  expect(r1.content).toContain('Q3')
})

// —— tooltip 定位一致性回归：hover 与 focus(click) 两条触发路径 ——
// 曾现缺陷：tip-enter 进场动画 scale(0.9) 污染 getBoundingClientRect（打开瞬间按缩小
// ~10% 的尺寸计算居中/间距），且 click → focusin 的同值 setAttribute('open') 仍触发
// attributeChangedCallback 重定位（Chromium 实测）——两条路径测量时机不同，
// 同一 placement 落点分歧（hover 打开后点击会跳位、间距/居中偏差随 tip 尺寸放大）。
test('tooltip 触发路径一致性：hover 与 click 打开的落点/方向逐像素一致（placement=top 上方 8px 居中）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  const SEL = 'oas-tooltip[placement="top"]'
  await page.waitForSelector(SEL, { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, SEL, {
    timeout: 15000,
  })
  const btn = page.locator(`${SEL} > *`).first()
  await btn.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)

  const read = () =>
    page.evaluate((s) => {
      const t = document.querySelector(s)!
      const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
      const anchor = t.querySelector(':scope > *')!
      const tb = tip.getBoundingClientRect()
      const ab = anchor.getBoundingClientRect()
      return {
        placement: tip.getAttribute('data-placement'),
        inlineTop: tip.style.top,
        inlineLeft: tip.style.left,
        gapAbove: Math.round(ab.top - tb.bottom),
        centerOff: Math.round(ab.left + ab.width / 2 - (tb.left + tb.width / 2)),
      }
    }, SEL)
  const waitOpen = () =>
    page.waitForFunction((s) => {
      const tip = document.querySelector(s)?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
      return !!tip && tip.getAttribute('aria-hidden') === 'false' && tip.style.top !== ''
    }, SEL)
  const waitClosed = () =>
    page.waitForFunction((s) => {
      const tip = document.querySelector(s)?.shadowRoot?.querySelector('[part="tip"]')
      return tip?.getAttribute('aria-hidden') === 'true'
    }, SEL)

  // hover 打开 → 等进场动画结束再量（动画中 rect 被 scale 污染）
  await btn.hover()
  await waitOpen()
  await page.waitForTimeout(250)
  const hoverState = await read()
  expect(hoverState.placement).toBe('top')
  expect(hoverState.gapAbove, 'placement=top 间距应精确 10px').toBe(10)
  expect(hoverState.centerOff, '浮层应水平居中于锚点').toBe(0)

  // 移开关闭 → click 重新打开（mousedown → focusin 路径）
  await page.mouse.move(8, 8)
  await waitClosed()
  await btn.click()
  await waitOpen()
  await page.waitForTimeout(250)
  const clickState = await read()
  expect(clickState.placement).toBe('top')
  expect(clickState.gapAbove).toBe(10)
  expect(clickState.centerOff).toBe(0)
  // 同一 placement 两条触发路径落点逐像素一致
  expect(clickState.inlineTop).toBe(hoverState.inlineTop)
  expect(clickState.inlineLeft).toBe(hoverState.inlineLeft)
})

// —— popover P1 补缺：嵌套浮层（nested）+ 虚拟触发（virtual）——
// 曾现缺口：popover 面板内无法再开子浮层（父关闭时子面板残留）、无图表/画布坐标提示能力。
// 本次补：父关闭级联关闭子层、Esc 逐层关闭并还原焦点；virtual 模式（同 tooltip 的
// virtual-x/virtual-y/virtual-anchor）+ oas-open-change。

test('tooltip 箭头：#tt-follow 打开后 .arrow 可见且位于面板顶部居中（placement=bottom 尖端朝上指向锚点）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#tt-follow', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#tt-follow', {
    timeout: 15000,
  })
  const canvas = page.locator('#vp-canvas')
  await canvas.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    document.querySelector('#vp-canvas')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 60, box.y + 40)
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-follow')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return (
      tip?.getAttribute('aria-hidden') === 'false' &&
      tip.querySelector('[data-popper-arrow]') != null
    )
  })
  const r = await page.evaluate(() => {
    const t = document.querySelector('#tt-follow')!
    const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = tip.querySelector<HTMLElement>('[data-popper-arrow]')!
    const tb = tip.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    return {
      placement: tip.getAttribute('data-placement'),
      arrowPart: arrow.getAttribute('part'),
      arrowVisible: ab.width > 0 && ab.height > 0,
      arrowAtTop: ab.top <= tb.top + 2, // 箭头横跨面板顶边（top: -4px → 旋转后更靠上）
      arrowCentered: Math.abs(ab.left + ab.width / 2 - (tb.left + tb.width / 2)) <= 6,
      arrowProtrudes: ab.top < tb.top, // 箭头尖端探出面板外沿
    }
  })
  expect(r.placement, '画布中部 placement=bottom 不翻转').toBe('bottom')
  expect(r.arrowPart).toBe('arrow')
  expect(r.arrowVisible, '箭头应真实渲染（宽高 > 0）').toBe(true)
  expect(r.arrowAtTop, 'bottom placement 箭头应在面板顶部').toBe(true)
  expect(r.arrowCentered, '箭头应水平居中指向锚点').toBe(true)
  expect(r.arrowProtrudes, '箭头尖端应探出面板外沿').toBe(true)
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-tooltip-arrow.png' })
})

test('tooltip arrow="false"：打开后无可见箭头元素（hidden 属性 + 0 尺寸，part 保留）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tt-arrow-off')
  await page.evaluate(() => {
    document.querySelector('#tt-arrow-off')!.setAttribute('open', '')
  })
  const tip = page.locator('#tt-arrow-off [part="tip"]')
  await expect(tip).toHaveAttribute('aria-hidden', 'false')
  const r = await page.evaluate(() => {
    const host = document.querySelector('#tt-arrow-off')!
    const t = host.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const ab = arrow.getBoundingClientRect()
    return {
      part: arrow.getAttribute('part'),
      hidden: arrow.hidden,
      hasHidden: arrow.hasAttribute('hidden'),
      w: ab.width,
      h: ab.height,
    }
  })
  expect(r.part, 'arrow="false" 时 ::part(arrow) 仍保留').toBe('arrow')
  expect(r.hidden, 'arrow="false" 箭头应带 hidden 属性').toBe(true)
  expect(r.hasHidden).toBe(true)
  expect(r.w, 'hidden 箭头不应渲染（宽 0）').toBe(0)
  expect(r.h, 'hidden 箭头不应渲染（高 0）').toBe(0)
})

test('tooltip arrow-point-at-center：面板被视口边缘避让 clamp 偏移后，箭头仍指向锚点中心', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tt-arrow-center')
  // 把触发元素钉到视口左缘（placement 默认 top）：面板水平居中会被 clamp 到视口左缘，
  // 默认箭头会随面板中心偏移（脱离锚点），arrow-point-at-center 箭头必须仍指向锚点中心
  await page.evaluate(() => {
    const host = document.querySelector('#tt-arrow-center')!
    // 锚点是 oas-button 自定义元素宿主（内部 button 在它自己的 shadow 里）
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '12px'
    btn.style.top = '200px'
    host.setAttribute('open', '')
  })
  const tip = page.locator('#tt-arrow-center [part="tip"]')
  await expect(tip).toHaveAttribute('aria-hidden', 'false')
  // tooltip 新增入场动画（fade/scale 150ms）：动画进行中面板/箭头的 getBoundingClientRect
  // 受 transform 缩放影响会偏几 px，等动画播完再量几何（静止态箭头精确指向锚点中心，已实测）
  await page.waitForTimeout(250)
  const r = await page.evaluate(() => {
    const host = document.querySelector('#tt-arrow-center')!
    const t = host.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const btn = host.querySelector('oas-button')!
    const tb = t.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    const bb = btn.getBoundingClientRect()
    return {
      placement: t.getAttribute('data-placement'),
      arrowVisible: ab.width > 0 && ab.height > 0,
      arrowCenterX: ab.left + ab.width / 2,
      btnCenterX: bb.left + bb.width / 2,
      panelClamped: tb.left < 20, // 面板确实被 clamp 到视口左缘（偏移发生）
    }
  })
  expect(r.placement, 'placement 默认 top 不应翻转').toBe('top')
  expect(r.arrowVisible, 'point-at-center 箭头应真实渲染').toBe(true)
  expect(r.panelClamped, '触发元素钉在视口左缘时面板应被 clamp 偏移').toBe(true)
  expect(
    Math.abs(r.arrowCenterX - r.btnCenterX),
    `箭头中心(${r.arrowCenterX.toFixed(1)})应指向锚点中心(${r.btnCenterX.toFixed(1)})`,
  ).toBeLessThanOrEqual(6)
})

// —— 缺陷回归：tooltip 箭头形态（用户反馈「底部箭头形态异常」同类缺陷族）——
// 曾现缺陷 1：hover 打开时 tip-enter 动画 scale(0.9) 污染定位测量，气泡按缩小 10% 的
// 尺寸落位 → 气泡中线偏离锚点中线 ~4px、主轴间距缩水 ~3.2px，箭头尖端（探出 5.66px）
// 反向扎进锚点按钮（gap 8−5.66=2.34px 被吃成负值）——肉眼观感即「箭头偏移/压按钮/变形」。
// 曾现缺陷 2：merge 贴角规则用 $='-start'/'-end' 后缀匹配、恒置零顶角、恒写水平轴——
// top 系零错角（圆角残留 × 菱形交界豁口）、left-start 箭头被拉到对侧边、*-end 箭头距角
// 16px 贴不上（12 向仅 bottom 两向正确）。
// 曾现缺陷 3：窄气泡（交叉轴 < 箭头底宽 8√2≈11.31 + 2×radius）圆角曲线侵入箭头底边
// 衔接区，接缝两侧各 ~1.5px 凹口（空内容 16px 气泡像素剖面 14.13→11.1 骤缩实测）。
// 曾现缺陷 4（用户两轮反馈）：merge 修正后箭头仍是 8×8 方块 rotate(45deg) 旋转菱形，
// 菱心骑在角点上、尖端沿 45° 斜向凸出——斜向不指向锚点，观感「怪」。改为直角三角贴角
// 共边（通用形态）：箭头不旋转、整悬面板外贴角 + clip-path 裁直角三角——直角顶点
// 精确落面板角点，两直角边与角两边共线，尖端正交外探 8px 指向锚点侧。

test('tooltip 箭头形态（用户场景）：top 方向底部箭头完整菱形、悬底边居中、尖端距锚点 2.34px 不相交', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tooltip[placement="top"]')
  // 「四个方向」demo 的 上 按钮（placement="top"，tooltip 在按钮上方 → 箭头悬气泡底边）
  const host = page.locator('oas-tooltip[placement="top"]').first()
  const anchor = host.locator(':scope > oas-button')
  await anchor.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const box = (await anchor.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
  await page.waitForTimeout(300) // 等进场动画（150ms）播完取静止态
  const r = await host.evaluate((el) => {
    const t = el.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const an = el.querySelector('oas-button')!
    const tb = t.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    const bb = an.getBoundingClientRect()
    const tm = getComputedStyle(arrow).transform.match(/matrix\(([^)]+)\)/)
    const n = tm?.[1]?.split(',').map(Number) ?? []
    const pureRot =
      n.length === 6 &&
      Math.abs(n[0]! - n[3]!) < 0.01 &&
      Math.abs(n[1]! + n[2]!) < 0.01 &&
      Math.abs(n[0]! * n[3]! - n[1]! * n[2]! - 1) < 0.01 &&
      n[4] === 0 &&
      n[5] === 0
    return {
      placement: t.getAttribute('data-placement'),
      arrowW: ab.width,
      arrowH: ab.height,
      // 菱心（rect 中心）应恰落气泡底边，且与气泡中线重合
      centerOnEdge: Math.abs((ab.top + ab.bottom) / 2 - tb.bottom),
      arrowVsTipCenter: Math.abs((ab.left + ab.right) / 2 - (tb.left + tb.right) / 2),
      // 尖端（rect.bottom）到锚点顶边 = offset 8 − 半对角线 5.66 = 2.34
      apexGap: bb.top - ab.bottom,
      tipVsAnchorCenter: Math.abs((tb.left + tb.right) / 2 - (bb.left + bb.right) / 2),
      overlap: !(
        ab.right <= bb.left ||
        ab.left >= bb.right ||
        ab.bottom <= bb.top ||
        ab.top >= bb.bottom
      ),
      pureRot,
    }
  })
  expect(r.placement).toBe('top')
  expect(r.arrowW, '旋转方块 bounding rect 宽 ≈ 12√2').toBeCloseTo(16.97, 1)
  expect(r.arrowH, '旋转方块 bounding rect 高 ≈ 12√2').toBeCloseTo(16.97, 1)
  expect(r.pureRot, '箭头 transform 应为纯 rotate(45deg)（无缩放/平移残留）').toBe(true)
  expect(r.centerOnEdge, '菱心应悬在气泡底边上').toBeLessThanOrEqual(0.7)
  expect(r.arrowVsTipCenter, '箭头应居气泡中线').toBeLessThanOrEqual(0.7)
  expect(
    r.tipVsAnchorCenter,
    '气泡中线应对齐锚点中线（动画污染测量曾致 ~4px 偏移）',
  ).toBeLessThanOrEqual(0.7)
  // 修复前（scale 污染测量）：gap = 8 − 3.2 − 5.66 ≈ −0.86（扎进按钮）
  expect(r.apexGap, `箭头尖端距锚点应为 2.34px（实测 ${r.apexGap.toFixed(2)}）`).toBeGreaterThan(
    1.5,
  )
  expect(r.apexGap).toBeLessThan(3.2)
  expect(r.overlap, '箭头不得与锚点按钮相交').toBe(false)
  await page.mouse.move(8, 8)
})

test('tooltip merge 直角三角贴角共边 8 向：直角点贴面板角点、两直角边共线、尖端正交指向锚点侧（真级联逐向验证）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tt-arrow-default')
  await page.evaluate(() => {
    // 锚点钉视口中央：排除 auto-adjust 翻转/避让对 8 向的干扰
    const host = document.querySelector('#tt-arrow-default')!
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '560px'
    btn.style.top = '380px'
  })
  const results = await page.evaluate(async () => {
    const host = document.querySelector('#tt-arrow-default')!
    // 每向几何契约：cornerEdges 面板角点（tip rect 边）、edge 贴边腿位移（沿面板边向内 8px）、
    // tip 尖端位移（角点正交外探 8px 指向锚点侧）、flush 盒贴角（[箭头边, 面板边]）、
    // cornerProp 应置零的角 radius
    const cases: Array<{
      p: string
      cornerEdges: ['left' | 'right', 'top' | 'bottom']
      edge: [number, number]
      tip: [number, number]
      flush: Array<['left' | 'right' | 'top' | 'bottom', 'left' | 'right' | 'top' | 'bottom']>
      cornerProp: string
    }> = [
      {
        p: 'bottom-start',
        cornerEdges: ['left', 'top'],
        edge: [8, 0],
        tip: [0, -8],
        flush: [
          ['left', 'left'],
          ['bottom', 'top'],
        ],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'bottom-end',
        cornerEdges: ['right', 'top'],
        edge: [-8, 0],
        tip: [0, -8],
        flush: [
          ['right', 'right'],
          ['bottom', 'top'],
        ],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'top-start',
        cornerEdges: ['left', 'bottom'],
        edge: [8, 0],
        tip: [0, 8],
        flush: [
          ['left', 'left'],
          ['top', 'bottom'],
        ],
        cornerProp: 'borderBottomLeftRadius',
      },
      {
        p: 'top-end',
        cornerEdges: ['right', 'bottom'],
        edge: [-8, 0],
        tip: [0, 8],
        flush: [
          ['right', 'right'],
          ['top', 'bottom'],
        ],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'left-start',
        cornerEdges: ['right', 'top'],
        edge: [0, 8],
        tip: [8, 0],
        flush: [
          ['left', 'right'],
          ['top', 'top'],
        ],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'left-end',
        cornerEdges: ['right', 'bottom'],
        edge: [0, -8],
        tip: [8, 0],
        flush: [
          ['left', 'right'],
          ['bottom', 'bottom'],
        ],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'right-start',
        cornerEdges: ['left', 'top'],
        edge: [0, 8],
        tip: [-8, 0],
        flush: [
          ['right', 'left'],
          ['top', 'top'],
        ],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'right-end',
        cornerEdges: ['left', 'bottom'],
        edge: [0, -8],
        tip: [-8, 0],
        flush: [
          ['right', 'left'],
          ['bottom', 'bottom'],
        ],
        cornerProp: 'borderBottomLeftRadius',
      },
    ]
    const out: Array<Record<string, string | number | boolean>> = []
    for (const c of cases) {
      host.setAttribute('placement', c.p)
      host.setAttribute('arrow-position', 'merge')
      host.setAttribute('open', '')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      await new Promise((res) => setTimeout(res, 60))
      const t = host.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
      const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
      const tb = t.getBoundingClientRect()
      const ab = arrow.getBoundingClientRect()
      const cs = getComputedStyle(arrow)
      // clip-path polygon 顶点（百分比）→ 页面坐标
      let verts: number[][] = []
      const m = cs.clipPath && cs.clipPath.match(/polygon\(([^)]+)\)/)
      if (m) {
        verts = m[1]!.split(',').map((v) => {
          const [xs, ys] = v.trim().split(/\s+/)
          const fx = xs!.endsWith('%') ? (parseFloat(xs!) / 100) * ab.width : parseFloat(xs!)
          const fy = ys!.endsWith('%') ? (parseFloat(ys!) / 100) * ab.height : parseFloat(ys!)
          return [ab.left + fx, ab.top + fy]
        })
      }
      // 直角顶点（与另两顶点向量内积为 0）到面板角点的偏差
      const corner: [number, number] = [tb[c.cornerEdges[0]], tb[c.cornerEdges[1]]]
      let rv: number[] | null = null
      let others: number[][] = []
      if (verts.length === 3) {
        for (let i = 0; i < 3; i++) {
          const a = verts[(i + 1) % 3]!
          const b = verts[(i + 2) % 3]!
          const v = verts[i]!
          if (
            Math.abs((a[0]! - v[0]!) * (b[0]! - v[0]!) + (a[1]! - v[1]!) * (b[1]! - v[1]!)) < 0.01
          ) {
            rv = v
            others = verts.filter((_, j) => j !== i)
          }
        }
      }
      const near = (v: number[], exp: [number, number]) =>
        Math.abs(v[0]! - (rv![0]! + exp[0])) <= 0.5 && Math.abs(v[1]! - (rv![1]! + exp[1])) <= 0.5
      out.push({
        p: c.p,
        actual: t.getAttribute('data-placement') ?? '',
        transformNone: cs.transform === 'none',
        hasPolygon: verts.length === 3,
        // 直角点与面板角点重合
        rdx: rv ? +(rv[0]! - corner[0]).toFixed(2) : NaN,
        rdy: rv ? +(rv[1]! - corner[1]).toFixed(2) : NaN,
        // 盒贴角：主轴边外悬 + 起止侧边线贴齐
        fdx: +c.flush.map(([ak, tk]) => ab[ak] - tb[tk])[0]!.toFixed(2),
        fdy: +c.flush.map(([ak, tk]) => ab[ak] - tb[tk])[1]!.toFixed(2),
        // 两直角边：一条沿面板边向内 8px（共边）、一条正交外探 8px 尖端（指向锚点侧）
        legsOk:
          rv !== null &&
          ((near(others[0]!, c.edge) && near(others[1]!, c.tip)) ||
            (near(others[0]!, c.tip) && near(others[1]!, c.edge))),
        cornerZero: getComputedStyle(t)[c.cornerProp as 'borderTopLeftRadius'] === '0px',
      })
      host.removeAttribute('open')
      await new Promise((res) => setTimeout(res, 40))
    }
    // 还原 demo 现场属性
    host.removeAttribute('arrow-position')
    host.setAttribute('placement', 'top')
    return out
  })
  for (const r of results) {
    expect(r.actual, `${r.p} 中置视口不应翻转`).toBe(r.p)
    expect(r.transformNone, `${r.p} 箭头不旋转（直角三角形态）`).toBe(true)
    expect(r.hasPolygon, `${r.p} clip-path 应裁出三角`).toBe(true)
    expect(Math.abs(r.rdx as number), `${r.p} 三角直角点应与面板角点重合 X`).toBeLessThanOrEqual(
      0.5,
    )
    expect(Math.abs(r.rdy as number), `${r.p} 三角直角点应与面板角点重合 Y`).toBeLessThanOrEqual(
      0.5,
    )
    expect(
      Math.abs(r.fdx as number),
      `${r.p} 箭头盒应贴角（主轴外悬/侧边贴齐）X`,
    ).toBeLessThanOrEqual(0.5)
    expect(
      Math.abs(r.fdy as number),
      `${r.p} 箭头盒应贴角（主轴外悬/侧边贴齐）Y`,
    ).toBeLessThanOrEqual(0.5)
    expect(r.legsOk, `${r.p} 直角边与面板边共边 + 尖端正交外探 8px 指向锚点侧`).toBe(true)
    expect(r.cornerZero, `${r.p} 对应角 radius 应置零`).toBe(true)
  }
})

// —— 缺陷回归：popover arrow-merge 箭头形态（与 tooltip merge 同款缺陷族）——
// 曾现缺陷：arrow-merge 沿用 8×8 方块 rotate(45deg) 旋转菱形、菱心骑在面板角点上、尖端
// 沿 45° 斜向凸出——不指向锚点，观感「怪」；且旧规则基向前缀匹配 + 半宽 -4px 骑角，
// over-constrained 下 *-end 让位边失效。改为直角三角贴角共边（通用形态）：不旋转
// 方块整悬面板外贴角 + clip-path 裁直角三角——直角顶点贴面板角点，两直角边与面板角两边
// 共线，尖端正交外探 8px 指向锚点侧。popover 面板有 1px 描边：箭头贴角让位 1px（直角
// 顶点压进面板描边带 1px、起止侧边对齐面板边），两条直角边描边（--pop-border）与面板
// 描边带共带续接，斜边不描边。

test('tooltip 窄气泡圆角封顶：空内容 16px 气泡 radius 收到 (16−11.31)/2≈2.34px，箭头底边与直边段齐宽', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const h = Array.from(document.querySelectorAll('oas-tooltip')).find((x) =>
        x.textContent?.includes('无内容提示'),
      )
      return h?.shadowRoot != null
    },
    undefined,
    { timeout: 15000 },
  )
  const host = page.locator('oas-tooltip', { hasText: '无内容提示' })
  await host.locator(':scope > oas-button').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await host.evaluate((el) => el.setAttribute('open', ''))
  await page.waitForTimeout(300) // 等动画播完（offset* 本不受影响，取静止态断言收敛值）
  const r = await host.evaluate((el) => {
    const t = el.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const tb = t.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    return {
      width: tb.width,
      crossVar: t.style.getPropertyValue('--oas-tip-cross'),
      radius: parseFloat(getComputedStyle(t).borderRadius),
      arrowW: ab.width,
    }
  })
  expect(r.width, '空内容气泡应只有 padding 宽（16px）').toBeCloseTo(16, 0)
  expect(r.crossVar, 'position() 应写入交叉轴布局尺寸').toBe('16px')
  expect(r.radius, `radius 应封顶 2.34px（实测 ${r.radius}）`).toBeCloseTo(2.34, 1)
  expect(r.arrowW).toBeCloseTo(16.97, 1)
  await host.evaluate((el) => el.removeAttribute('open'))
})

// —— dropdown 箭头——
// 面板带指向触发元素的箭头（默认显示）；arrow="false" 隐藏（骨架保留）。
