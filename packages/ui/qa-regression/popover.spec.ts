// 复核回归：popover——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('popover 嵌套：父关闭级联关闭子层、Esc 逐层关闭、Vue demo 属性存活', async ({ page }) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pop-parent')
  const parent = page.locator('#pop-parent')
  const child = page.locator('#pop-child')
  // 嵌套层级：子 popover 是父的 light DOM 后代，parent.locator('[part=panel]') 会同时匹配
  // 父/子两块面板（pierce 嵌套 shadow），故用 evaluate 精确取各自 shadow 内的面板。
  const panelState = () =>
    page.evaluate(() => {
      const p = document.querySelector('#pop-parent')!.shadowRoot!.querySelector('[part="panel"]')!
      const c = document.querySelector('#pop-child')!.shadowRoot!.querySelector('[part="panel"]')!
      return {
        pAria: p.getAttribute('aria-hidden'),
        cAria: c.getAttribute('aria-hidden'),
      }
    })

  // focus-on-open 属性在 Vue demo 中存活（不被剥离）
  const focusAttr = await parent.evaluate((e) => e.getAttribute('focus-on-open'))
  expect(focusAttr, 'focus-on-open 被 Vue 剥离').not.toBeNull()

  // 同时打开父子 → 子层可见且层级在父之上
  await parent.evaluate((e) => e.setAttribute('open', ''))
  await child.evaluate((e) => e.setAttribute('open', ''))
  await page.waitForFunction(
    () =>
      document
        .querySelector('#pop-child')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.getAttribute('aria-hidden') === 'false',
    null,
    { timeout: 5000 },
  )
  let s = await panelState()
  expect(s.pAria).toBe('false')
  expect(s.cAria).toBe('false')
  const z = await page.evaluate(() => {
    const c = document.querySelector('#pop-child')!.shadowRoot!.querySelector('[part="panel"]')!
    const p = document.querySelector('#pop-parent')!.shadowRoot!.querySelector('[part="panel"]')!
    return { child: getComputedStyle(c).zIndex, parent: getComputedStyle(p).zIndex }
  })
  expect(z.child).toBe(z.parent) // 同 token；子层在父的 stacking context 内，视觉上盖在父之上

  // Esc 一次只关最内层（子），父保持打开
  await page.keyboard.press('Escape')
  s = await panelState()
  expect(s.cAria).toBe('true')
  expect(s.pAria).toBe('false')

  // 再次 Esc 关父层
  await page.keyboard.press('Escape')
  s = await panelState()
  expect(s.pAria).toBe('true')

  // 父关闭级联关闭子层
  await parent.evaluate((e) => e.setAttribute('open', ''))
  await child.evaluate((e) => e.setAttribute('open', ''))
  await page.waitForFunction(
    () =>
      document
        .querySelector('#pop-child')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.getAttribute('aria-hidden') === 'false',
    null,
    { timeout: 5000 },
  )
  await parent.evaluate((e) => e.removeAttribute('open'))
  s = await panelState()
  expect(s.pAria).toBe('true')
  expect(s.cAria, '父关闭应级联关闭子层').toBe('true')
})

test('popover virtual：virtual-x/virtual-y 定位 + 锚点元素跟随 + oas-open-change 可见反馈', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  // oas-popover host 零尺寸（inline-block 无内容），waitForSelector 默认等可见会超时 → 等 attached + shadowRoot
  await page.waitForSelector('#pop-point', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#pop-point', {
    timeout: 15000,
  })
  const point = page.locator('#pop-point')

  // virtual / virtual-x / virtual-y 在 Vue demo 中存活（不被剥离）
  const attrs = await point.evaluate((e) => ({
    virtual: e.getAttribute('virtual'),
    x: e.getAttribute('virtual-x'),
    y: e.getAttribute('virtual-y'),
  }))
  expect(attrs.virtual, 'virtual 被 Vue 剥离').not.toBeNull()
  expect(attrs.x).toBe('160')
  expect(attrs.y).toBe('90')

  // 按坐标打开：placement=right → 面板左缘 = 160 + 8（gap），垂直居中于锚点
  await point.evaluate((e) => e.setAttribute('open', ''))
  const panel = point.locator('[part="panel"]')
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await expect(panel).toHaveAttribute('data-placement', 'right')
  const box = (await panel.boundingBox())!
  expect(Math.abs(box.x - 168)).toBeLessThanOrEqual(2)
  expect(Math.abs(box.y - (90 - box.height / 2))).toBeLessThanOrEqual(2)

  // oas-open-change 可见反馈：demo 状态 tag 回显 open
  await page.waitForFunction(
    () => document.getElementById('pop-point-status')?.textContent === 'open: true',
    null,
    { timeout: 5000 },
  )

  // 外部点击不关闭（虚拟模式生命周期由宿主控制）
  await page.mouse.click(5, 5)
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await point.evaluate((e) => e.removeAttribute('open'))

  // 换坐标重新打开：virtual-x/y 更新后 open 应重定位（宿主 mousemove 场景）
  await point.evaluate((e) => e.setAttribute('virtual-x', '700'))
  await point.evaluate((e) => e.setAttribute('virtual-y', '500'))
  await point.evaluate((e) => e.setAttribute('open', ''))
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await page.waitForFunction(
    () => {
      const p = document
        .querySelector('#pop-point')!
        .shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
      return p.style.left === '708px' // 700 + 8（gap）
    },
    null,
    { timeout: 5000 },
  )
  const box2 = (await panel.boundingBox())!
  expect(Math.abs(box2.x - 708)).toBeLessThanOrEqual(2)
  expect(Math.abs(box2.y - (500 - box2.height / 2))).toBeLessThanOrEqual(2)
  await point.evaluate((e) => e.removeAttribute('open'))

  // 虚拟锚点元素跟随：hover 点位 → 面板锚定该点（placement=top，气泡在点位上方）
  const chart = page.locator('#pop-chart')
  await chart.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    document.querySelector('#pop-chart')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)
  await page.locator('#pop-dot-0').hover()
  const anchorPanel = page.locator('#pop-anchor [part="panel"]')
  await expect(anchorPanel).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 })
  const anchorBox = (await anchorPanel.boundingBox())!
  const dotBox = (await page.locator('#pop-dot-0').boundingBox())!
  expect(anchorBox.y + anchorBox.height - dotBox.y).toBeLessThanOrEqual(40) // 气泡底 ≈ 点位顶（8px gap）
  // 切到点位 1 → 面板跟随
  await page.locator('#pop-dot-1').hover()
  await page.waitForFunction(() => {
    const t = document.querySelector('#pop-anchor')!
    return t.getAttribute('virtual-anchor') === '#pop-dot-1'
  })
})

// —— tree-select P1 补缺：勾选策略（check-strategy）+ 虚拟滚动（virtual）——
// 曾现缺口：多选只有父子级联一种取值模型、无 check-strategy 取值策略（parent 只父级 / child 只叶子）；万级数据下拉无窗口化渲染。
// 本批补：策略对比 demo 值回显、虚拟滚动窗口化渲染 + 滚动窗口平移 + 键盘导航 ARIA。

test('popover.md 虚拟画布：#virt-canvas 有可见宽度且提示文字单行居中（不竖排）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#virt-canvas', { timeout: 15000 })
  const r = await page.evaluate(() => {
    const canvas = document.getElementById('virt-canvas')!
    const p = canvas.querySelector('p')!
    const c = canvas.getBoundingClientRect()
    // Range 包围全部文本：单行时 rect 高≈字号、宽≈整句；竖排（每字一行）时 高≈句长×行高、宽≈单字
    const range = document.createRange()
    range.selectNodeContents(p)
    const t = range.getBoundingClientRect()
    return {
      canvasWidth: c.width,
      text: (p.textContent ?? '').trim(),
      textWidth: t.width,
      textHeight: t.height,
    }
  })
  expect(r.canvasWidth, '画布在 flex 容器里不应坍缩为 0').toBeGreaterThan(200)
  expect(r.text).toContain('移动鼠标')
  // 单行（不竖排）：文本包围盒宽度 ≥ 5 个汉字（约 70px）、高度 < 30px（1~2 行）
  expect(r.textWidth, '文字应单行横向排列，而非每字一行竖排').toBeGreaterThan(70)
  expect(r.textHeight).toBeLessThan(30)
})

test('popover 箭头：#pop-point 打开后 .arrow 可见且位于面板左缘居中（placement=right 面板在锚点右侧，尖端朝左指向锚点）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#pop-point', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#pop-point', {
    timeout: 15000,
  })
  const point = page.locator('#pop-point')
  await point.evaluate((e) => e.setAttribute('open', ''))
  const panel = point.locator('[part="panel"]')
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await expect(panel).toHaveAttribute('data-placement', 'right')
  const r = await point.evaluate((pop) => {
    const p = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')!
    const pb = p.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    return {
      arrowPart: arrow.getAttribute('part'),
      arrowVisible: ab.width > 0 && ab.height > 0,
      arrowAtLeft: ab.left <= pb.left + 2, // 箭头横跨面板左边（left: -4px → 旋转后更靠左）
      arrowCentered: Math.abs(ab.top + ab.height / 2 - (pb.top + pb.height / 2)) <= 6,
      arrowProtrudes: ab.left < pb.left, // 尖端探出面板外沿指向锚点
    }
  })
  expect(r.arrowPart).toBe('arrow')
  expect(r.arrowVisible, '箭头应真实渲染（宽高 > 0）').toBe(true)
  expect(r.arrowAtLeft, 'right placement 箭头应在面板左缘').toBe(true)
  expect(r.arrowCentered, '箭头应垂直居中指向锚点').toBe(true)
  expect(r.arrowProtrudes, '箭头尖端应探出面板外沿').toBe(true)
  await point.evaluate((e) => e.removeAttribute('open'))
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-popover-arrow.png' })
})

// —— 缺陷回归：tooltip/popover 箭头能力补齐（arrow 显隐 / arrow-point-at-center / auto-adjust-overflow）——
// 曾现缺口：箭头固定渲染无显隐控制；箭头始终随面板居中，视口边缘避让导致面板偏移后
// 不再指向锚点中心。本次补：arrow="false" 隐藏箭头（元素与 ::part(arrow) 保留）、
// arrow-point-at-center 在面板被 clamp 时仍指向锚点中心。

test('popover arrow-merge 直角三角贴角共边 8 向：直角点贴面板角点（描边带让位 1px）、两直角边共线、尖端正交指向锚点侧、描边仅直角两边（真级联逐向验证）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-popover[arrow-merge]')
  await page.evaluate(() => {
    // 锚点钉视口中央：排除 auto-adjust 翻转/避让对 8 向的干扰
    const host = document.querySelector('oas-popover[arrow-merge]')!
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '540px'
    btn.style.top = '340px'
  })
  const results = await page.evaluate(async () => {
    const host = document.querySelector('oas-popover[arrow-merge]')!
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
      await new Promise((res) => setTimeout(res, 60))
      const panel = host.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
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
      // 描边色与面板描边同源（--pop-border）
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
    expect(r.strokeSameAsPanel, `${r.p} 描边色应与面板描边同源（--pop-border）`).toBe(true)
    expect(r.cornerZero, `${r.p} 对应角 radius 应置零`).toBe(true)
  }
})

// —— 缺陷回归：hover-card collision-boundary 坐标系 ——
// 曾现缺陷：碰撞边界解析只取目标元素 rect 的宽高、丢原点，夹取与翻转按视口 (0,0) 原点系
// 折算——边界位于页面中部时卡片被夹到视口左上角（完全脱离边界容器与锚点）。
// 修复：边界解析保留完整 rect（left/top/right/bottom），fits 判定与夹取均以边界原点计算。
test('popover 12 向箭头对准锚点：demo 4 实例箭头中心落在锚点投影区间内（曾恒居中脱离锚点）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  const firstSel = '.demo-block__body oas-popover[placement="bottom-start"]'
  await page.locator(firstSel).first().waitFor({ state: 'attached', timeout: 15000 })
  await page.waitForFunction(
    () =>
      document.querySelectorAll('oas-popover').length > 0 &&
      [...document.querySelectorAll('oas-popover')].every(
        (e) => (e as HTMLElement).shadowRoot != null,
      ),
  )
  for (const pl of ['bottom-start', 'bottom-end', 'right-start', 'top-end']) {
    const sel = `.demo-block__body oas-popover[placement="${pl}"]`
    const pop = page.locator(sel).first()
    await pop.scrollIntoViewIfNeeded()
    await pop.click()
    await page.waitForTimeout(350)
    const r = await page.evaluate((s) => {
      const pop = document.querySelector(s)!
      const panel = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
      const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
      const anchor = pop.querySelector<HTMLElement>(':scope > *')!
      const ab = arrow.getBoundingClientRect()
      const nb = anchor.getBoundingClientRect()
      const placement = panel.getAttribute('data-placement')!
      const vertical = placement.startsWith('top') || placement.startsWith('bottom')
      const cx = ab.left + ab.width / 2
      const cy = ab.top + ab.height / 2
      return vertical
        ? { ok: cx >= nb.left - 2 && cx <= nb.right + 2 }
        : { ok: cy >= nb.top - 2 && cy <= nb.bottom + 2 }
    }, sel)
    expect(r.ok, `${pl} 箭头中心应落在锚点投影区间内`).toBe(true)
    await page.evaluate((s) => document.querySelector(s)!.removeAttribute('open'), sel)
    await page.waitForTimeout(120)
  }
})

test('popover portal 样式保真：append-to 面板 fixed + 有背景边框，滚动跟随锚点（曾 scoped CSS 全失效掉文档流末尾）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('oas-popover[append-to="body"]', { timeout: 15000 })
  await page.waitForFunction(() => {
    const e = document.querySelector('oas-popover[append-to="body"]')
    return !!e && (e as HTMLElement).shadowRoot != null
  })
  const sel = 'oas-popover[append-to="body"]'
  const pop = page.locator(sel).first()
  await pop.scrollIntoViewIfNeeded()
  await pop.click()
  await page.waitForTimeout(350)
  const r1 = await page.evaluate((s) => {
    const pop = document.querySelector(s)!
    const host = document.querySelector<HTMLElement>('[data-oas-popover-portal]')
    const panel =
      (host?.shadowRoot?.querySelector<HTMLElement>('[part="panel"]') ?? null) ||
      pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const cs = getComputedStyle(panel)
    const anchor = pop.querySelector<HTMLElement>(':scope > *')!
    return {
      hostInBody: !!host && document.body.contains(host),
      panelInHostShadow: !!host?.shadowRoot?.contains(panel),
      position: cs.position,
      hasBg: cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
      hasBorder: cs.borderTopWidth !== '0px',
      gapOk:
        Math.abs(panel.getBoundingClientRect().top - anchor.getBoundingClientRect().bottom - 8) <=
        2,
    }
  }, sel)
  expect(r1.hostInBody, 'portal host 应挂在 body').toBe(true)
  expect(r1.panelInHostShadow, '面板应在 portal host 的独立 shadow 内（样式作用域保真）').toBe(true)
  expect(r1.position, '面板应保持 fixed（曾失效为 static）').toBe('fixed')
  expect(r1.hasBg, '面板应有背景色（曾透明）').toBe(true)
  expect(r1.hasBorder, '面板应有边框（曾无边框）').toBe(true)
  expect(r1.gapOk, '面板应在锚点下方 8px').toBe(true)
  // 滚动跟随：面板与锚点视口坐标同步
  await page.evaluate(() => window.scrollBy(0, 300))
  await page.waitForTimeout(400)
  const r2 = await page.evaluate((s) => {
    const pop = document.querySelector(s)!
    const host = document.querySelector<HTMLElement>('[data-oas-popover-portal]')
    const panel = host?.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')!
    const anchor = pop.querySelector<HTMLElement>(':scope > *')!
    return (
      Math.abs(panel.getBoundingClientRect().top - anchor.getBoundingClientRect().bottom - 8) <= 2
    )
  }, sel)
  expect(r2, '滚动后面板应跟随锚点（曾乱飘）').toBe(true)
  await page.evaluate((s) => document.querySelector(s)!.removeAttribute('open'), sel)
})

test('popover closable：右上角 ✕ 按钮真实可见（display 非 none 且有尺寸，曾 CSS 类钩子缺失永不显示）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('oas-popover[closable]', { timeout: 15000 })
  await page.waitForFunction(() => {
    const e = document.querySelector('oas-popover[closable]')
    return !!e && (e as HTMLElement).shadowRoot != null
  })
  const sel = 'oas-popover[closable]'
  const pop = page.locator(sel).first()
  await pop.scrollIntoViewIfNeeded()
  await pop.click()
  await page.waitForTimeout(350)
  const r = await page.evaluate((s) => {
    const pop = document.querySelector(s)!
    const panel = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const btn = panel.querySelector<HTMLElement>('[part="close"]')!
    const cs = getComputedStyle(btn)
    const b = btn.getBoundingClientRect()
    const pb = panel.getBoundingClientRect()
    return {
      display: cs.display,
      visible: b.width > 0 && b.height > 0,
      atTopRight: b.right <= pb.right + 2 && b.top >= pb.top && b.top <= pb.top + 24,
    }
  }, sel)
  expect(
    r.display,
    '✕ 应可见（display 非 none，曾规则钩子 .panel.oas-closable 无人挂类）',
  ).not.toBe('none')
  expect(r.visible, '✕ 应有渲染尺寸').toBe(true)
  expect(r.atTopRight, '✕ 应位于面板右上角').toBe(true)
  await page.evaluate((s) => document.querySelector(s)!.removeAttribute('open'), sel)
})

test('popover virtual 定点：(160,90) 标记点可见且箭头对准该点（曾无标记、对准哪里不可感知）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#pop-point', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => {
    const e = document.querySelector('#pop-point')
    return !!e && (e as HTMLElement).shadowRoot != null
  })
  await page.evaluate(() => {
    document.getElementById('pop-point')!.scrollIntoView({ block: 'center' })
    ;(window as unknown as { popPointShow: (x: number, y: number) => void }).popPointShow(160, 90)
  })
  await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const pop = document.getElementById('pop-point')!
    const panel = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
    const mark = document.getElementById('pop-point-mark')!
    const ab = arrow.getBoundingClientRect()
    const mb = mark.getBoundingClientRect()
    const cs = getComputedStyle(mark)
    return {
      markVisible: cs.opacity !== '0' && mb.width > 0,
      markCenter: { x: mb.left + mb.width / 2, y: mb.top + mb.height / 2 },
      arrowCenter: { x: ab.left + ab.width / 2, y: ab.top + ab.height / 2 },
    }
  })
  expect(r.markVisible, '虚拟锚点标记应可见').toBe(true)
  expect(Math.abs(r.markCenter.x - 160), '标记中心应在视口 x=160').toBeLessThanOrEqual(1)
  expect(Math.abs(r.markCenter.y - 90), '标记中心应在视口 y=90').toBeLessThanOrEqual(1)
  // placement=right：箭头垂直中心对准点 y=90
  expect(Math.abs(r.arrowCenter.y - 90), '箭头应对准虚拟锚点坐标点（P6 定夺）').toBeLessThanOrEqual(
    3,
  )
  await page.evaluate(() => {
    ;(window as unknown as { popPointHide: () => void }).popPointHide()
  })
})

// —— 缺陷回归：navigation-menu 面板箭头跟随触发器 ——
// 曾现缺陷：CSS 引用 var(--arrow-x,24px)/var(--arrow-y,24px) 但 JS 从未写入，
// 箭头永远停在 24px 默认位、不指向打开的触发器。修复后按当前触发器中心写入变量。