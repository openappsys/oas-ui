// 复核回归：hover-card——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('hover-card collision-boundary：边界在页面中部时卡片被夹取在边界容器 rect 内（真实几何断言）', async ({
  page,
}) => {
  await page.goto('/components/hover-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-hover-card[collision-boundary]')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('oas-hover-card[collision-boundary]')!
    ;(host.firstElementChild as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await new Promise((res) => setTimeout(res, 500))
    const card = host.shadowRoot!.querySelector('.card') as HTMLElement
    const box = document.querySelector('#hc-cb-box') as HTMLElement
    const c = card.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    return {
      open: card.getAttribute('aria-hidden') === 'false',
      card: { l: c.left, t: c.top, r: c.right, b: c.bottom },
      box: { l: b.left, t: b.top, r: b.right, b: b.bottom },
    }
  })
  expect(r.open).toBe(true)
  // 卡片完整落在边界容器 rect 内（允许 0.5px 亚像素误差）
  expect(r.card.l).toBeGreaterThanOrEqual(r.box.l - 0.5)
  expect(r.card.r).toBeLessThanOrEqual(r.box.r + 0.5)
  expect(r.card.t).toBeGreaterThanOrEqual(r.box.t - 0.5)
  expect(r.card.b).toBeLessThanOrEqual(r.box.b + 0.5)
})

// —— 缺陷回归：hover-card arrow-merge 箭头形态（与 tooltip/popover merge 同款缺陷族）——
// 曾现缺陷：arrow-merge 沿用 8×8 方块 rotate(45deg) 旋转菱形、菱心骑在面板角点上、尖端
// 沿 45° 斜向凸出——不指向锚点，观感「怪」；且旧规则基向前缀 + 后缀匹配 + 半宽 -4px 骑角，
// 后缀让位边与居中 calc 同设 left/top 时 over-constrained，*-end 让位边被忽略、箭头
// 留在居中位贴不上角。改为直角三角贴角共边（通用形态，同 popover 描边续接方案）：
// 不旋转方块整悬面板外贴角 + clip-path 裁直角三角——直角顶点贴面板角点，两直角边与面板
// 角两边共线，尖端正交外探 8px 指向锚点侧。面板有 1px 描边：箭头贴角让位 1px（直角顶点
// 压进面板描边带 1px、起止侧边对齐面板边），两条直角边描边与面板描边带共带续接，斜边不描边。

test('hover-card arrow-merge 直角三角贴角共边 8 向：直角点贴面板角点（描边带让位 1px）、两直角边共线、尖端正交指向锚点侧、描边仅直角两边（真级联逐向验证）', async ({
  page,
}) => {
  await page.goto('/components/hover-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-hover-card[arrow-merge]')
  await page.evaluate(() => {
    // 锚点钉视口中央：排除 auto-adjust 翻转/避让对 8 向的干扰
    const host = document.querySelector('oas-hover-card[arrow-merge]')!
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '540px'
    btn.style.top = '340px'
  })
  const results = await page.evaluate(async () => {
    const host = document.querySelector('oas-hover-card[arrow-merge]')!
    // 每向几何契约（面板有 1px 描边，箭头贴角让位 1px）：
    // cornerEdges 面板角点（panel rect 边）；vDelta 直角顶点相对角点位移（主轴压进描边带
    // 1px、起止侧贴齐 0）；edge 贴边腿顶点相对直角点位移（沿面板边 8px，与真实边段共线）；
    // tip 尖端相对直角点位移（正交外探 8px 指向锚点侧）；legs 直角两边的描边（其余边 0）；
    // cornerProp 应置零的角 radius
    const cases: Array<{
      p: string
      cornerEdges: ['left' | 'right', 'top' | 'bottom']
      vDelta: [number, number]
      edge: [number, number]
      tip: [number, number]
      legs: [string, string]
      cornerProp: string
    }> = [
      {
        p: 'bottom-start',
        cornerEdges: ['left', 'top'],
        vDelta: [0, 1],
        edge: [8, 0],
        tip: [0, -8],
        legs: ['borderLeftWidth', 'borderBottomWidth'],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'bottom-end',
        cornerEdges: ['right', 'top'],
        vDelta: [0, 1],
        edge: [-8, 0],
        tip: [0, -8],
        legs: ['borderRightWidth', 'borderBottomWidth'],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'top-start',
        cornerEdges: ['left', 'bottom'],
        vDelta: [0, -1],
        edge: [8, 0],
        tip: [0, 8],
        legs: ['borderLeftWidth', 'borderTopWidth'],
        cornerProp: 'borderBottomLeftRadius',
      },
      {
        p: 'top-end',
        cornerEdges: ['right', 'bottom'],
        vDelta: [0, -1],
        edge: [-8, 0],
        tip: [0, 8],
        legs: ['borderRightWidth', 'borderTopWidth'],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'left-start',
        cornerEdges: ['right', 'top'],
        vDelta: [-1, 0],
        edge: [0, 8],
        tip: [8, 0],
        legs: ['borderTopWidth', 'borderLeftWidth'],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'left-end',
        cornerEdges: ['right', 'bottom'],
        vDelta: [-1, 0],
        edge: [0, -8],
        tip: [8, 0],
        legs: ['borderBottomWidth', 'borderLeftWidth'],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'right-start',
        cornerEdges: ['left', 'top'],
        vDelta: [1, 0],
        edge: [0, 8],
        tip: [-8, 0],
        legs: ['borderTopWidth', 'borderRightWidth'],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'right-end',
        cornerEdges: ['left', 'bottom'],
        vDelta: [1, 0],
        edge: [0, -8],
        tip: [-8, 0],
        legs: ['borderBottomWidth', 'borderRightWidth'],
        cornerProp: 'borderBottomLeftRadius',
      },
    ]
    const out: Array<Record<string, string | number | boolean>> = []
    for (const c of cases) {
      host.setAttribute('placement', c.p)
      host.setAttribute('open', '')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      // hover-card 入场动画 150ms 直接作用在 .card 上（transform: scale），transform-origin
      // 恰为 merge 角点（scale 不变点）但盒与面板 rect 仍被缩放污染——等动画播完取静止态
      await new Promise((res) => setTimeout(res, 220))
      const panel = host.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!
      const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
      const tb = panel.getBoundingClientRect()
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
      // 直角顶点（与另两顶点向量内积为 0）
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
      // 描边：仅外露直角边 1px；贴面板的融合边无描边（斜边走渐变，非 border）
      const widths: Record<string, string> = {
        borderTopWidth: cs.borderTopWidth,
        borderRightWidth: cs.borderRightWidth,
        borderBottomWidth: cs.borderBottomWidth,
        borderLeftWidth: cs.borderLeftWidth,
      }
      const legsOnly = widths[c.legs[0]!] === '1px' && widths[c.legs[1]!] === '0px'
      const othersZero = Object.entries(widths)
        .filter(([k]) => !c.legs.includes(k))
        .every(([, w]) => w === '0px')
      // 描边色与面板描边同源（--oas-color-border）
      const legColor = cs[c.legs[0]!.replace('Width', 'Color') as 'borderTopColor']
      out.push({
        p: c.p,
        actual: panel.getAttribute('data-placement') ?? '',
        transformNone: cs.transform === 'none',
        hasPolygon: verts.length === 3,
        boxW: +ab.width.toFixed(2),
        boxH: +ab.height.toFixed(2),
        // 直角点贴面板角点（主轴压进描边带 1px、起止侧贴齐 0）
        rdx: rv ? +(rv[0]! - corner[0]).toFixed(2) : NaN,
        rdy: rv ? +(rv[1]! - corner[1]).toFixed(2) : NaN,
        vdx: +c.vDelta[0],
        vdy: +c.vDelta[1],
        // 两直角边：一条沿面板边向内 8px（共边）、一条正交外探 8px 尖端（指向锚点侧）
        legsOk:
          rv !== null &&
          ((near(others[0]!, c.edge) && near(others[1]!, c.tip)) ||
            (near(others[0]!, c.tip) && near(others[1]!, c.edge))),
        legsOnly,
        othersZero,
        strokeSameAsPanel: legColor === getComputedStyle(panel).borderTopColor,
        cornerZero: getComputedStyle(panel)[c.cornerProp as 'borderTopLeftRadius'] === '0px',
      })
      host.removeAttribute('open')
      await new Promise((res) => setTimeout(res, 40))
    }
    // 还原 demo 现场属性
    host.setAttribute('placement', 'bottom-start')
    return out
  })
  for (const r of results) {
    expect(r.actual, `${r.p} 中置视口不应翻转`).toBe(r.p)
    expect(r.transformNone, `${r.p} 箭头不旋转（直角三角形态）`).toBe(true)
    expect(r.hasPolygon, `${r.p} clip-path 应裁出三角`).toBe(true)
    expect(r.boxW, `${r.p} 箭头盒应为 8px 宽（不旋转）`).toBeCloseTo(8, 1)
    expect(r.boxH, `${r.p} 箭头盒应为 8px 高（不旋转）`).toBeCloseTo(8, 1)
    expect(r.rdx, `${r.p} 直角点相对面板角点 X 应为 ${r.vdx}（描边带让位）`).toBeCloseTo(
      r.vdx as number,
      1,
    )
    expect(r.rdy, `${r.p} 直角点相对面板角点 Y 应为 ${r.vdy}（描边带让位）`).toBeCloseTo(
      r.vdy as number,
      1,
    )
    expect(r.legsOk, `${r.p} 直角边与面板边共边 + 尖端正交外探 8px 指向锚点侧`).toBe(true)
    expect(r.legsOnly, `${r.p} 外露直角边描边 1px、贴面板融合边无描边`).toBe(true)
    expect(r.othersZero, `${r.p} 斜边与其余边不得有描边`).toBe(true)
    expect(r.strokeSameAsPanel, `${r.p} 描边色应与面板描边同源（--oas-color-border）`).toBe(true)
    expect(r.cornerZero, `${r.p} 对应角 radius 应置零`).toBe(true)
  }
})

test('hover-card 浮层可悬停：触发器 → 卡片跨间隙移动不闪关', async ({ page }) => {
  await page.goto('/components/hover-card.html', { waitUntil: 'domcontentloaded' })
  const sel = 'oas-hover-card:has([slot="content"])'
  await up(page, sel)
  // demo 块可能在首屏下方，先把触发器滚进视口（视口外元素收不到指针事件）
  await page.evaluate((s) => {
    document.querySelector(s)?.querySelector('oas-button')?.scrollIntoView({ block: 'center' })
  }, sel)
  await page.waitForTimeout(300)
  const trigger = await page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    const el = host.querySelector('oas-button') as HTMLElement
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, sel)
  // hover 触发器 → 卡片打开（open-delay 300ms）
  await page.mouse.move(trigger.x, trigger.y)
  await page.waitForFunction(
    (s) => {
      const host = document.querySelector(s) as HTMLElement
      return (
        host?.shadowRoot?.querySelector('[part="card"]')?.getAttribute('aria-hidden') === 'false'
      )
    },
    sel,
    { timeout: 5000 },
  )
  // 读取已打开的卡片区域，指针移入卡片 → 等过 close-delay → 仍打开（不闪关）
  const card = await page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    const el = host?.shadowRoot?.querySelector('[part="card"]') as HTMLElement
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, sel)
  await page.mouse.move(card.x, card.y)
  await page.waitForTimeout(600)
  const stillOpen = await page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    return host?.shadowRoot?.querySelector('[part="card"]')?.getAttribute('aria-hidden') === 'false'
  }, sel)
  expect(stillOpen, '移入卡片后应保持打开（不闪关）').toBe(true)
})
