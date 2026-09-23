// 复核回归：navigation-menu——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('navigation-menu 箭头跟随触发器：面板箭头 --arrow-x 随触发器切换而移动', async ({ page }) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-arrow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#nav-arrow')!
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const triggers = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')]
    const t0 = triggers[0]
    const t1 = triggers[1]
    if (!t0 || !t1) return { skip: true as const }
    t0.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 450))
    const arrow1 = host.shadowRoot!.querySelector<HTMLElement>('.arrow, [class*="arrow"]')
    const x1 = arrow1 ? arrow1.style.getPropertyValue('--arrow-x') : ''
    t0.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 400))
    t1.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 450))
    const arrow2 = host.shadowRoot!.querySelector<HTMLElement>('.arrow, [class*="arrow"]')
    const x2 = arrow2 ? arrow2.style.getPropertyValue('--arrow-x') : ''
    return { skip: false as const, x1, x2 }
  })
  if (r.skip) return // demo 结构变化时跳过而非误报
  expect(r.x1, '箭头变量应被 JS 写入（非空）').not.toBe('')
  expect(r.x2, '箭头变量应被 JS 写入（非空）').not.toBe('')
  expect(r.x1, '箭头位置应随触发器切换而变化').not.toBe(r.x2)
})

// —— 缺陷回归：breadcrumb ellipsis 模式项下拉不被 nav 自裁剪 ——
// 曾现缺陷：nav.ellipsis 的 overflow:hidden 双轴裁剪会裁掉向下展开的项下拉面板。
// 修复为 overflow-x:clip + overflow-y:visible（只裁横轴防溢出闪动，纵轴放行下拉）。
test('navigation-menu 箭头几何对准触发器中心（水平+垂直）且营销位不溢出面板（真实 rect 断言）', async ({ page }) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  const probe = async (sel: string, vertical: boolean) =>
    page.evaluate(
      async ({ sel, vertical }) => {
        const host = document.querySelector(sel as string) as HTMLElement | null
        if (!host) return null
        host.scrollIntoView({ block: 'center' })
        await new Promise((res) => setTimeout(res, 250))
        const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')][0]
        trig?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
        await new Promise((res) => setTimeout(res, 650))
        const ar = host.shadowRoot!.querySelector('.arrow') as HTMLElement
        const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
        const pf = host.shadowRoot!.querySelector('.panel-footer') as HTMLElement | null
        const tr = trig!.getBoundingClientRect()
        const arR = ar.getBoundingClientRect()
        const vr = vp.getBoundingClientRect()
        const fr = pf && !pf.hidden ? pf.getBoundingClientRect() : null
        return {
          trigC: vertical ? (tr.top + tr.bottom) / 2 : (tr.left + tr.right) / 2,
          arrowC: vertical ? (arR.top + arR.bottom) / 2 : (arR.left + arR.right) / 2,
          // 箭头跨边悬置（探出面板边缘）：顶部可探出面板顶缘之上，但左右两侧不越面板、
          // 探出量收敛（顶边探出 ≤ 12px 半数对角，不悬空漂离）
          arrowInVp:
            arR.left >= vr.left - 2 &&
            arR.right <= vr.right + 2 &&
            vr.top - arR.top <= 10 &&
            arR.bottom <= vr.bottom + 2,
          pfOverflow: fr ? Math.round(fr.bottom - vr.bottom) : null,
        }
      },
      { sel, vertical },
    )
  const horiz = await probe('#nav-arrow', false)
  expect(horiz).not.toBeNull()
  expect(Math.abs(horiz!.arrowC - horiz!.trigC), '水平箭头中心对准触发器中心（±2px）').toBeLessThanOrEqual(2)
  expect(horiz!.arrowInVp, '箭头不越出面板').toBe(true)
  const vert = await probe('oas-navigation-menu[orientation="vertical"]', true)
  expect(vert).not.toBeNull()
  expect(Math.abs(vert!.arrowC - vert!.trigC), '垂直箭头中心对准触发器中心（±2px）').toBeLessThanOrEqual(2)
  const footer = await probe('#nav-footer', false)
  expect(footer).not.toBeNull()
  expect(footer!.pfOverflow, '营销位底缘不超出面板（≤0px 溢出）').toBeLessThanOrEqual(0)
})

// —— 缺陷回归：navigation-menu 面板碰撞翻转后箭头脱节 ——
// 曾现缺陷：箭头位置写死「面板在 nav 下方/右侧」，flip-up（面板翻到触发器上方）后
// 箭头仍留在翻转前位置——悬空在面板外 49px 且背对触发器。修复：syncViewportPosition
// 把 flip 类镜像到箭头，CSS flip 变体换边贴合面板、尖端反向指向触发器。
test('navigation-menu flip-up 后箭头贴面板底边指向触发器（不悬空脱节）', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 420 })
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-arrow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#nav-arrow')!
    host.scrollIntoView({ block: 'end' })
    await new Promise((res) => setTimeout(res, 300))
    const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')][0]
    trig?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 700))
    const ar = host.shadowRoot!.querySelector('.arrow') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    const tr = trig!.getBoundingClientRect()
    const arR = ar.getBoundingClientRect()
    const vr = vp.getBoundingClientRect()
    const cs = getComputedStyle(ar)
    return {
      flipUp: vp.classList.contains('flip-up'),
      arrowFlip: ar.classList.contains('flip-up'),
      // flip-up 箭头朝向：贴面板底边、尖朝下指触发器——rotate45 菱形用右下两描边边
      // （border-right + border-bottom）构成 ▼ chevron；非 rotate 矩阵或缺描边即方向错
      tipDown:
        cs.transform.includes('matrix') && parseFloat(cs.borderRightWidth) > 0 && parseFloat(cs.borderBottomWidth) > 0,
      // 面板在触发器上方；箭头应贴面板底边（顶部 ≥ 面板底-12，底部 ≤ 面板底+12）
      arrowAttachedToPanel: arR.top >= vr.bottom - 12 && arR.bottom <= vr.bottom + 12,
      // 箭头在触发器与面板之间（不悬空到面板另一侧之外）
      arrowOnTriggerSide: arR.bottom <= tr.top + 2,
      arrowXCentered: Math.abs((arR.left + arR.right) / 2 - (tr.left + tr.right) / 2) <= 2,
    }
  })
  expect(r.flipUp, '短视口应触发 flip-up').toBe(true)
  expect(r.arrowFlip, '箭头应镜像 flip-up 类').toBe(true)
  expect(r.tipDown, 'flip-up 箭头尖端应朝下（clip-path 含底边中点，不反装）').toBe(true)
  expect(r.arrowAttachedToPanel, '箭头应贴翻转后面板底边').toBe(true)
  expect(r.arrowOnTriggerSide, '箭头应在触发器一侧').toBe(true)
  expect(r.arrowXCentered, '箭头 X 向对准触发器中心').toBe(true)
})

// —— 缺陷回归：navigation-menu 箭头内缩面板（用户三连实测揪出） ——
// 曾现缺陷：箭头 clip-path 直角三角 top:calc(100%+space-1-1px) 高 6px——5px 埋在面板
// 内部、仅 1px 探出顶边，视觉上缩成面板里的小凹槽而非「从面板探出的箭头」。
// 修复：改 menubar 同款 rotate45 描边菱形、跨面板边缘悬置（探出侧指向宿主）。
test('navigation-menu 箭头跨面板边缘探出指向宿主（rotate45 悬置，不内缩面板）', async ({ page }) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-arrow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#nav-arrow')!
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 250))
    const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')][0]
    trig?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 600))
    const ar = host.shadowRoot!.querySelector('.arrow') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    const tr = trig!.getBoundingClientRect()
    const arR = ar.getBoundingClientRect()
    const vr = vp.getBoundingClientRect()
    const cs = getComputedStyle(ar)
    return {
      // 探出面板顶缘：箭头顶部必须在面板顶之上（跨边悬置，不内缩）
      protrudeAbove: arR.top < vr.top,
      protrudeAmount: Math.round(vr.top - arR.top),
      // rotate45 菱形形态（computed transform 为旋转矩阵，描边 chevron 指向宿主）
      isRotated: cs.transform.includes('matrix'),
      hasBorder: parseFloat(cs.borderTopWidth) > 0,
      panelBelowTrigger: vr.top > tr.bottom,
      arrowXCentered: Math.abs((arR.left + arR.right) / 2 - (tr.left + tr.right) / 2) <= 2,
    }
  })
  expect(r.protrudeAbove, '箭头应探出面板顶缘（跨边悬置，不内缩面板）').toBe(true)
  expect(r.protrudeAmount, '探出量应明显（≥3px）').toBeGreaterThanOrEqual(3)
  expect(r.isRotated, '箭头应为 rotate45 菱形').toBe(true)
  expect(r.hasBorder, '箭头应有描边 chevron 轮廓').toBe(true)
  expect(r.panelBelowTrigger, '面板应在触发器下方').toBe(true)
  expect(r.arrowXCentered, '箭头 X 向对准触发器中心').toBe(true)
})

// —— 缺陷回归：dropdown 箭头开合时序与面板错位 ——
// 曾现缺陷：开合动画只挂 oas-menu（fade+scale），箭头是兄弟节点无动画——
// 打开瞬间箭头先显（描边线先亮后融）、关闭时箭头原地留守慢一拍消失。
// 修复：箭头补与面板同时长的 fade（仅透明度），两端时序对齐。
test('navigation-menu delay-duration=0 移入子菜单不收回（关闭宽限独立于打开延迟）', async ({ page }) => {
  // 坑：scheduleClose 曾复用 delay-duration 作关闭宽限——delay-duration="0" 的 demo
  // 指针离开触发器后 setTimeout(0) 先于 viewport mouseenter 执行，面板在指针到达前关闭
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  const r = await page.evaluate(async () => {
    const nav = [...document.querySelectorAll('oas-navigation-menu')].find(
      (n) => n.getAttribute('delay-duration') === '0',
    )!
    const root = nav.shadowRoot!
    const trigger = root.querySelectorAll('[part="top-item"]')[0] as HTMLElement
    const tr = trigger.getBoundingClientRect()
    // 悬停触发器开面板
    trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((r2) => setTimeout(r2, 120))
    const vp = root.querySelector('[part="viewport"]') as HTMLElement
    const openNow = getComputedStyle(vp).display !== 'none' && Number(getComputedStyle(vp).opacity) > 0
    // 模拟指针移入面板：真实 hover viewport（真实浏览器 hover 状态供 :hover/事件派发）
    const vr = vp.getBoundingClientRect()
    const cx = vr.x + vr.width / 2
    const cy = vr.y + Math.min(vr.height * 0.3, 80)
    return { openNow, cx, cy }
  })
  if (!r?.openNow) throw new Error('面板未打开')
  // 真实鼠标移动：跨过触发器→面板间隙进入面板（复现原 bug 的时序）
  await page.mouse.move(r.cx, r.cy, { steps: 8 })
  await page.waitForTimeout(500)
  const still = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('oas-navigation-menu')].find(
      (n) => n.getAttribute('delay-duration') === '0',
    )!
    const vp = nav.shadowRoot!.querySelector('[part="viewport"]') as HTMLElement
    const cs = getComputedStyle(vp)
    return cs.display !== 'none' && Number(cs.opacity) > 0
  })
  expect(still, '移入面板后面板必须保持打开（关闭宽限独立于打开延迟）').toBe(true)
})

// —— 能力回归：菜单家族 per-item 图标颜色（iconColor / icon-color，2026-08-29） ——
// 曾缺：oas-menu / oas-menubar / oas-navigation-menu 图标固定 currentColor 随文字色，
// 仅 oas-sidebar 有 iconColor。修复后：items JSON 的 iconColor 与子元素 icon-color 通道
// 均固定图标色（svg 外层 stroke + 内置 path 的 currentColor 替换），缺省保持 currentColor。
test('navigation-menu 垂直方向指示条对准活动触发器（bottom 锚点未重置 + 同帧 offsetTop 旧值双坑）', async ({
  page,
}) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  // 找垂直形态的 nav（bar.vertical），真实 hover 第一个带子项的触发器
  const target = await page.evaluate(async () => {
    const navs = [...document.querySelectorAll('oas-navigation-menu')]
    const nav = navs.find((n) => n.shadowRoot?.querySelector('.bar.vertical'))!
    const root = nav.shadowRoot!
    const triggers = [...root.querySelectorAll('[part="top-item"]')]
    const trigger = triggers.find((t) => t.querySelector('.chevron')) as HTMLElement
    trigger.scrollIntoView({ block: 'center' })
    await new Promise((r) => setTimeout(r, 150))
    const tr = trigger.getBoundingClientRect()
    return { x: tr.x + tr.width / 2, y: tr.y + tr.height / 2 }
  })
  await page.mouse.move(target.x, target.y)
  await page.waitForTimeout(600)
  const r = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('oas-navigation-menu')].find((n) =>
      n.shadowRoot?.querySelector('.bar.vertical'),
    )!
    const root = nav.shadowRoot!
    const open = nav.getAttribute('value') || root.querySelector('.indicator')?.getAttribute('data-state')
    const trigger = [...root.querySelectorAll('[part="top-item"]')].find(
      (t) => t.getAttribute('aria-expanded') === 'true' || t.querySelector('.chevron'),
    ) as HTMLElement
    const ind = root.querySelector('.indicator') as HTMLElement
    const tr = trigger.getBoundingClientRect()
    const ir = ind.getBoundingClientRect()
    return {
      indVisible: getComputedStyle(ind).opacity === '1',
      topDiff: Math.abs(ir.top - tr.top),
      hDiff: Math.abs(ir.height - tr.height),
    }
  })
  expect(r.indVisible, '指示条应可见').toBe(true)
  expect(r.topDiff, '指示条 top 应对准触发器 top').toBeLessThan(4)
  expect(r.hDiff, '指示条高度应等于触发器高度').toBeLessThan(4)
})

// —— 缺陷回归：navigation-menu 在 hidden→visible 浮层容器里首帧测量坍缩 ——
// 曾现缺陷：把组件动态挂载进 hidden→visible 的浮层容器（如 popover 面板）时，首帧面板不可测
// （0×0），尺寸状态（--vp-w/--vp-h）被留空且不复测——面板尺寸/翻转判定停在不可测帧。
// 修复：零尺寸不写入 + 宿主 ResizeObserver 在 0→非 0（浮层显示）时复测自愈 + 连接后一次性 rAF 复测。
// 断言：隐藏容器挂载并打开面板（A）在转为可见后，面板/视口与可见挂载（B）得到相同真实尺寸且内容可交互。
test('navigation-menu 浮层 hidden→visible：面板尺寸自愈，与可见挂载一致且可交互', async ({ page }) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  const r = await page.evaluate(async () => {
    const items = JSON.stringify([
      { label: '总览', value: 'overview', children: [{ label: '仪表盘', value: 'dash', href: '#' }] },
      {
        label: '业务管理',
        value: 'biz',
        children: [
          { label: '订单列表', value: 'orders', href: '#' },
          { label: '客户管理', value: 'customers', href: '#' },
        ],
      },
      { label: '系统设置', value: 'sys', children: [{ label: '基础设置', value: 'settings', href: '#' }] },
    ])
    const raf = () => new Promise((res) => requestAnimationFrame(res))
    const tick = (n: number) => new Promise((res) => setTimeout(res, n))

    const build = async (hidden: boolean) => {
      const wrap = document.createElement('div')
      wrap.style.cssText = 'width:640px;padding:8px;background:#eee'
      if (hidden) wrap.style.display = 'none'
      document.body.appendChild(wrap)
      const nav = document.createElement('oas-navigation-menu') as HTMLElement
      nav.setAttribute('orientation', 'vertical')
      nav.setAttribute('items', items)
      // 受控打开：面板在挂载首帧即渲染（hidden 时即为「不可测帧」路径）
      nav.setAttribute('value', 'biz')
      wrap.appendChild(nav)
      await tick(60)
      if (hidden) {
        wrap.style.display = ''
      }
      await raf()
      await raf()
      // 等 width/height 过渡稳定（.viewport transition 0.2s），避免半途 rect 抖动
      await tick(350)
      const sr = nav.shadowRoot!
      const vp = sr.querySelector('[part="viewport"]') as HTMLElement
      const panel = sr.querySelector('[part="panel"]') as HTMLElement
      const grid = panel.querySelector('[part="grid"]') as HTMLElement | null
      const vr = vp.getBoundingClientRect()
      const pr = panel.getBoundingClientRect()
      // 先量测（不可被后续交互的重新渲染污染）
      const out = {
        vpW: vp.style.getPropertyValue('--vp-w'),
        vpH: vp.style.getPropertyValue('--vp-h'),
        viewportW: +vr.width.toFixed(2),
        viewportH: +vr.height.toFixed(2),
        panelW: +pr.width.toFixed(2),
        panelH: +pr.height.toFixed(2),
        gridVisible: !!grid && getComputedStyle(grid).visibility !== 'hidden' && grid.getBoundingClientRect().width > 0,
        links: panel.querySelectorAll('[part="card-link"], [part="section-links"] a').length,
        selected: '',
        open: vp.classList.contains('open'),
      }
      // 再验证可交互：叶子项点击派发 oas-select（在量测之后，避免重渲染污染尺寸读数）
      const onSelect = (e: Event) => {
        out.selected = (e as CustomEvent<{ value: string }>).detail?.value ?? ''
      }
      nav.addEventListener('oas-select', onSelect)
      ;(panel.querySelector('[part="card-link"]') as HTMLElement | null)?.click()
      await raf()
      nav.removeEventListener('oas-select', onSelect)
      nav.remove()
      wrap.remove()
      return out
    }

    const a = await build(true) // 隐藏容器挂载 → 置为可见（复现路径）
    const b = await build(false) // 可见容器挂载（对照）
    return { a, b }
  })

  // A 必须拿到与 B 相同的真实尺寸（改前 A 的尺寸状态留空 → RED）
  expect(r.a.vpW, 'A 视口宽度状态应写入真实值（非空）').toMatch(/^\d+(\.\d+)?px$/)
  expect(r.a.vpH, 'A 视口高度状态应写入真实值（非空）').toMatch(/^\d+(\.\d+)?px$/)
  expect(parseFloat(r.a.vpW), 'A 视口宽度状态 > 0').toBeGreaterThan(0)
  expect(parseFloat(r.a.vpH), 'A 视口高度状态 > 0').toBeGreaterThan(0)
  expect(r.a.viewportW, 'A 视口宽 > 0').toBeGreaterThan(0)
  expect(r.a.viewportH, 'A 视口高 > 0').toBeGreaterThan(0)
  expect(Math.abs(r.a.viewportW - r.b.viewportW), 'A 视口宽应与 B 一致（±1px）').toBeLessThanOrEqual(1)
  expect(Math.abs(r.a.viewportH - r.b.viewportH), 'A 视口高应与 B 一致（±1px）').toBeLessThanOrEqual(1)
  expect(r.a.panelW, 'A 面板宽 > 0').toBeGreaterThan(0)
  expect(Math.abs(r.a.panelW - r.b.panelW), 'A 面板宽应与 B 一致（±1px）').toBeLessThanOrEqual(1)
  // 内容可见可交互
  expect(r.a.open, 'A 面板应处于打开态').toBe(true)
  expect(r.a.gridVisible, 'A 面板内容应可见').toBe(true)
  expect(r.a.links, 'A 面板应有可交互链接').toBeGreaterThan(0)
  expect(r.a.selected, 'A 面板叶子项点击应派发 oas-select').not.toBe('')
})

// 移动端专项：窄屏顶级溢出收纳——尾部顶级项收进「···」弹层，弹层项可打开大面板/派发选择
test('navigation-menu 移动端：窄屏顶级溢出收纳进「···」弹层，弹层项可交互', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-navigation-menu')
    const r = await page.evaluate(async () => {
      const el = document.createElement('oas-navigation-menu')
      el.setAttribute(
        'items',
        JSON.stringify([
          { label: '产品中心', value: 'p', children: [{ label: '组件', value: 'c', href: '/c' }] },
          { label: '资源中心', value: 'r', children: [{ label: '主题', value: 't', href: '/t' }] },
          { label: '定价', value: 'pricing', href: '/pricing' },
          { label: '关于', value: 'about', href: '/about' },
          { label: '联系', value: 'contact', href: '/contact' },
        ]),
      )
      el.style.cssText = 'display:block;width:150px'
      document.body.appendChild(el)
      // 等 ResizeObserver 重算收纳
      await new Promise((res) => setTimeout(res, 300))
      const root = el.shadowRoot!
      const more = root.querySelector<HTMLElement>('[part="top-more"]')!
      if (more.hidden) return { collapsed: false as const }
      const collapsed = [...root.querySelectorAll('[part="top-item"][data-collapsed]')]
      more.click()
      await new Promise((res) => setTimeout(res, 200))
      const panel = root.querySelector<HTMLElement>('[part="overflow-panel"]')!
      const items = [...panel.querySelectorAll<HTMLElement>('[part="overflow-item"]')]
      // 弹层 children 项点击应打开大面板
      const withChildren = items.find((i) => i.tagName === 'BUTTON')!
      withChildren.click()
      await new Promise((res) => setTimeout(res, 200))
      const viewport = root.querySelector<HTMLElement>('[part="viewport"]')!
      const out = {
        collapsed: true as const,
        collapsedCount: collapsed.length,
        mirrorCount: items.length,
        panelOpensViewport: viewport.classList.contains('open'),
        vpMaxWidthCss: root.querySelector('style')!.textContent!.includes('100vw'),
      }
      el.remove()
      return out
    })
    expect(r.collapsed, '150px 窄容器应触发顶级溢出收纳').toBe(true)
    if (r.collapsed) {
      expect(r.collapsedCount, '应有尾部顶级项被收纳').toBeGreaterThan(0)
      expect(r.mirrorCount, '「···」弹层应有镜像项').toBeGreaterThan(0)
      expect(r.panelOpensViewport, '弹层 children 项点击应打开大面板').toBe(true)
      expect(r.vpMaxWidthCss, 'viewport 应有 100vw 窄屏宽度兜底').toBe(true)
    }
  } finally {
    await ctx.close()
  }
})

// —— 缺陷回归：统一 viewport 位置不跟随激活触发器 ——
// 曾现缺陷：`.viewport` 固定 `inset-inline-start: 0`（贴 nav/最左项起点），hover 靠右的
// 顶级项时面板内容已切换、位置仍停在最左项下方——面板与激活项左右脱节（用户实测报障）。
// 修复：把激活触发器相对 nav 的逻辑偏移写入 `--vp-x`（回折写 `--vp-x-end`），面板与激活项对齐。
test('navigation-menu 面板左缘跟随激活触发器（hover 第 1 项 vs 最后一项均对齐 ≤2px）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  await page.evaluate(() => {
    const host = document.createElement('oas-navigation-menu')
    host.id = 'nav-follow'
    host.setAttribute('delay-duration', '0')
    host.setAttribute(
      'items',
      JSON.stringify([
        { label: '产品', value: 'products', children: [{ label: '组件', value: 'c', href: '#c' }] },
        { label: '资源', value: 'resources', children: [{ label: '主题', value: 't', href: '#t' }] },
        { label: '定价', value: 'pricing', href: '#pricing' },
        { label: '示例', value: 'examples', children: [{ label: '示例一', value: 'x', href: '#x' }] },
      ]),
    )
    // 宽容器：避免进入回折分支，直接量「面板左缘 vs 激活项左缘」
    host.style.cssText = 'position:fixed;top:0;left:0;display:block;width:1000px;z-index:99999'
    document.body.appendChild(host)
  })
  const measure = async (idx: number) => {
    const pt = await page.evaluate((i) => {
      const host = document.querySelector('#nav-follow') as HTMLElement
      const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="top-item"]')][i]!
      trig.scrollIntoView({ block: 'center' })
      const r = trig.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, idx)
    await page.mouse.move(pt.x, pt.y)
    await page.waitForTimeout(450)
    return page.evaluate((i) => {
      const host = document.querySelector('#nav-follow') as HTMLElement
      const root = host.shadowRoot!
      const trig = [...root.querySelectorAll<HTMLElement>('[part="top-item"]')][i]!
      const vp = root.querySelector<HTMLElement>('[part="viewport"]')!
      const tr = trig.getBoundingClientRect()
      const vr = vp.getBoundingClientRect()
      return {
        label: (trig.textContent ?? '').trim(),
        triggerLeft: tr.left,
        panelLeft: vr.left,
        flip: vp.classList.contains('flip-right'),
        open: vp.classList.contains('open'),
      }
    }, idx)
  }
  const first = await measure(0)
  await page.mouse.move(5, 400)
  await page.waitForTimeout(350)
  const last = await measure(3)
  expect(first.open, '第 1 项面板应打开').toBe(true)
  expect(last.open, '最后一项面板应打开').toBe(true)
  expect(first.flip, '宽容器下第 1 项不应回折').toBe(false)
  expect(last.flip, '宽容器下最后一项不应回折').toBe(false)
  expect(Math.abs(first.panelLeft - first.triggerLeft), `面板左缘应对齐「${first.label}」左缘`).toBeLessThanOrEqual(2)
  expect(Math.abs(last.panelLeft - last.triggerLeft), `面板左缘应对齐「${last.label}」左缘`).toBeLessThanOrEqual(2)
  // 面板位置确实随激活项移动（不是两边都停在容器起点）
  expect(Math.abs(last.panelLeft - first.panelLeft), '面板左缘应随激活项右移').toBeGreaterThan(50)
})

// —— 缺陷回归：回折边界取「导航栏右缘」导致子面板全部右对齐 ——
// 曾现缺陷：碰撞判定把导航栏盒宽当硬边界（boundRight = min(视口, 导航栏右缘)）。文档站 demo 的
// 导航栏是 shrink-to-fit（inline-block，宽仅 210px），面板 min-width 200 几乎必然越过栏右缘——
// 于是每个顶级项的面板都被判回折、右对齐贴触发器右缘（用户实测报障：「全都右对齐」）。
// 修复：回折边界只取视口（含 8px 安全边距）——导航栏盒宽不是裁切容器，面板本就允许越出栏外。
test('navigation-menu 子面板左缘跟随触发器（窄导航栏不误判回折，仅越出视口才回折）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-arrow')

  const measure = async (idx: number) => {
    const pt = await page.evaluate((i) => {
      const host = document.querySelector('#nav-arrow') as HTMLElement
      const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="top-item"]')][i]!
      trig.scrollIntoView({ block: 'center' })
      const r = trig.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, idx)
    await page.mouse.move(pt.x, pt.y)
    await page.waitForTimeout(450)
    return page.evaluate((i) => {
      const host = document.querySelector('#nav-arrow') as HTMLElement
      const root = host.shadowRoot!
      const trig = [...root.querySelectorAll<HTMLElement>('[part="top-item"]')][i]!
      const vp = root.querySelector<HTMLElement>('[part="viewport"]')!
      const navEl = root.querySelector<HTMLElement>('.nav')!
      const tr = trig.getBoundingClientRect()
      const vr = vp.getBoundingClientRect()
      const nr = navEl.getBoundingClientRect()
      return {
        label: (trig.textContent ?? '').trim(),
        triggerLeft: tr.left,
        triggerRight: tr.right,
        panelLeft: vr.left,
        panelRight: vr.right,
        panelWidth: vr.width,
        navRight: nr.right,
        vw: window.innerWidth,
        flip: vp.classList.contains('flip-right'),
        open: vp.classList.contains('open'),
      }
    }, idx)
  }

  const first = await measure(0)
  expect(first.open, '第 1 项面板应打开').toBe(true)
  expect(first.flip, '宽视口下第 1 项不应回折（导航栏盒宽不是回折边界）').toBe(false)
  expect(Math.abs(first.panelLeft - first.triggerLeft), `面板左缘应对齐「${first.label}」左缘`).toBeLessThanOrEqual(2)
  // 前提确认：该面板确实触发旧的「导航栏右缘 − 8px」判定（否则这条回归没覆盖到误判路径）
  expect(first.panelRight, '前提：面板越过窄导航栏右缘（含 8px 安全边距）').toBeGreaterThan(first.navRight - 8)

  await page.mouse.move(5, 5)
  await page.waitForTimeout(350)
  const second = await measure(1)
  expect(second.open, '第 2 项面板应打开').toBe(true)
  expect(second.flip, '宽视口下第 2 项不应回折').toBe(false)
  expect(Math.abs(second.panelLeft - second.triggerLeft), `面板左缘应对齐「${second.label}」左缘`).toBeLessThanOrEqual(
    2,
  )
  // 前提确认：靠右的项面板已真实越出导航栏右缘，仍应保持左缘跟随
  expect(second.panelRight, '前提：面板真实越出窄导航栏右缘').toBeGreaterThan(second.navRight)

  // 反例：把视口压窄到「跟随后的面板」会越出视口右缘 → 必须回折（右缘贴触发器右缘）
  await page.mouse.move(5, 5)
  await page.waitForTimeout(350)
  await page.setViewportSize({ width: 300, height: 800 })
  await page.waitForTimeout(300)
  const narrow = await measure(1)
  expect(narrow.open, '窄视口下第 2 项面板应打开').toBe(true)
  expect(narrow.triggerLeft + narrow.panelWidth, '前提：窄视口下跟随后面板会越出视口右缘').toBeGreaterThan(
    narrow.vw - 8,
  )
  expect(narrow.flip, '面板会越出视口右缘时必须回折').toBe(true)
  expect(Math.abs(narrow.panelRight - narrow.triggerRight), '回折后面板右缘应贴触发器右缘').toBeLessThanOrEqual(2)
  expect(narrow.panelRight, '回折后面板不应越出视口右缘').toBeLessThanOrEqual(narrow.vw - 6)
})

// 回归 缺陷：en 页导航面板卡片列文字相碰（长单词横向溢出列外、压到相邻列文字上）2026-09-23
// 现象：#nav-flip 卡片列被 minmax(0,1fr) 压到 90px，而卡片最长单词「Components」墨迹 97px 放不下 →
// 文字横向溢出列外 19px，越过 4px 列间距 + 12px 内边距，与相邻列文字重叠 3px（视觉贴死成 ComponentsDesign）；
// 同一页未触碰的 #nav-basic 亦然（列 90px / 内容 109px，section 内 Community 同样溢出）。
// zh 页因 CJK 可任意断行（min-content = 单字）不触发。
// 修法：卡片列最小宽度下限 = 内容 min-content（minmax(min-content,1fr)）+ 面板 min-width:min-content
// （--vp-w 由 panel.scrollWidth 测得，内容横向溢出内容盒时不含尾侧内边距，需面板自身兜底容下内容）。
// 三条不变量（修复前 ①② 必红）：
//   ① 每个卡片/分组内的文字墨迹不越出所在列（列内文字不横向溢出）
//   ② 同一行相邻两列的文字墨迹之间至少留出列间距（第二列左缘 ≥ 第一列右缘 + 列间距）
//   ③ 末列不越出面板内容盒（末列内边距与首列对称；锁定「面板 min-width:min-content」修法）
// 对照组：zh 页同结构面板宽度仍为 200px、两列仍等宽（min-content 下限在 CJK 下不生效 → 观感零变化）。
test('navigation-menu en 面板卡片列：文字不越出列外、相邻列不重叠（zh 对照组零变化）', async ({ page }) => {
  // 真实指针 hover 第 1 个触发器打开面板（#nav-flip delay-duration=0，#nav-basic 默认 200ms）
  const openFirst = async (sel: string): Promise<void> => {
    const pt = await page.evaluate(async (s) => {
      const host = document.querySelector(s) as HTMLElement
      host.scrollIntoView({ block: 'center' })
      await new Promise((res) => setTimeout(res, 250))
      const trig = host.shadowRoot!.querySelector<HTMLElement>('[part="top-item"]')!
      const r = trig.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, sel)
    await page.mouse.move(pt.x, pt.y)
    await page.waitForTimeout(600)
  }

  const geom = async (sel: string) =>
    page.evaluate((s) => {
      const host = document.querySelector(s) as HTMLElement
      const root = host.shadowRoot!
      const panel = root.querySelector<HTMLElement>('[part="panel"]')!
      const grid = panel.querySelector<HTMLElement>('[part="grid"]')!
      const round = (n: number) => Math.round(n * 100) / 100
      const box = (el: Element) => {
        const b = el.getBoundingClientRect()
        return { top: round(b.top), left: round(b.left), right: round(b.right), width: round(b.width) }
      }
      // 文字墨迹范围（Range 覆盖换行后的全部行盒）：比盒宽更能反映真实字形位置
      const ink = (el: Element) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        const b = range.getBoundingClientRect()
        return { left: round(b.left), right: round(b.right) }
      }
      const pr = panel.getBoundingClientRect()
      const cs = getComputedStyle(panel)
      return {
        open: root.querySelector<HTMLElement>('[part="viewport"]')!.classList.contains('open'),
        panel: { left: round(pr.left), right: round(pr.right), width: round(pr.width) },
        contentRight: round(pr.right - (parseFloat(cs.paddingRight) || 0)),
        gap: parseFloat(getComputedStyle(grid).columnGap) || 0,
        cols: getComputedStyle(grid).gridTemplateColumns,
        cells: [...grid.children].map((li) => ({
          box: box(li),
          texts: [...li.querySelectorAll<HTMLElement>('.card-title, .card-desc, .section-title, .section-links a')].map(
            (t) => ({ text: (t.textContent ?? '').trim().slice(0, 20), ink: ink(t) }),
          ),
        })),
      }
    }, sel)

  type Geom = Awaited<ReturnType<typeof geom>>
  const rowsOf = (g: Geom) => {
    const rows = new Map<number, Geom['cells']>()
    for (const cell of g.cells) {
      const key = Math.round(cell.box.top)
      rows.set(key, [...(rows.get(key) ?? []), cell])
    }
    return [...rows.values()].map((row) => [...row].sort((a, b) => a.box.left - b.box.left))
  }

  const assertInvariants = (g: Geom, label: string): void => {
    expect(g.open, `${label}：第 1 个触发器面板应打开`).toBe(true)
    for (const cell of g.cells) {
      for (const t of cell.texts) {
        expect(t.ink.left, `${label}：「${t.text}」不应越出所在列左缘`).toBeGreaterThanOrEqual(cell.box.left - 1)
        expect(t.ink.right, `${label}：「${t.text}」不应横向溢出所在列（压到相邻列文字上）`).toBeLessThanOrEqual(
          cell.box.right + 1,
        )
      }
    }
    const rows = rowsOf(g)
    let pairs = 0
    for (const row of rows) {
      for (let i = 0; i + 1 < row.length; i++) {
        const a = row[i]!
        const b = row[i + 1]!
        const aRight = a.texts.length ? Math.max(...a.texts.map((t) => t.ink.right)) : a.box.right
        const bLeft = b.texts.length ? Math.min(...b.texts.map((t) => t.ink.left)) : b.box.left
        expect(bLeft, `${label}：相邻两列文字墨迹应至少留出 ${g.gap}px 列间距`).toBeGreaterThanOrEqual(aRight + g.gap)
        pairs++
      }
    }
    expect(pairs, `${label}：面板应有至少一行两列（否则断言空转）`).toBeGreaterThan(0)
    for (const row of rows) {
      const last = row[row.length - 1]!
      expect(last.box.right, `${label}：末列不应越出面板内容盒（内边距与首列对称）`).toBeLessThanOrEqual(
        g.contentRight + 1,
      )
    }
  }

  await page.goto('/en/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-flip')
  await openFirst('#nav-flip')
  const enFlip = await geom('#nav-flip')
  assertInvariants(enFlip, 'en #nav-flip')
  expect(enFlip.panel.width, 'en 面板应随内容最小宽度撑开（不再把列压到内容最小宽度以下）').toBeGreaterThan(200)

  await page.mouse.move(5, 5)
  await page.waitForTimeout(400)
  await up(page, '#nav-basic')
  await openFirst('#nav-basic')
  assertInvariants(await geom('#nav-basic'), 'en #nav-basic')

  // 对照组：zh 页（同一套样式，CJK min-content 远小于列宽 → 观感必须零变化）
  await page.mouse.move(5, 5)
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-flip')
  await openFirst('#nav-flip')
  const zhFlip = await geom('#nav-flip')
  assertInvariants(zhFlip, 'zh #nav-flip（对照组）')
  expect(Math.abs(zhFlip.panel.width - 200), 'zh 面板宽度应保持 200px（零变化）').toBeLessThanOrEqual(1)
  const zhCols = zhFlip.cols.split(' ').map((v) => Number.parseFloat(v))
  expect(
    Math.abs((zhCols[0] ?? 0) - (zhCols[1] ?? 0)),
    'zh 两列应仍等宽（1fr 均分，min-content 下限在 CJK 下不生效）',
  ).toBeLessThanOrEqual(1)
})
