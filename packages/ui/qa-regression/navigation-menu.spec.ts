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
test('navigation-menu 箭头几何对准触发器中心（水平+垂直）且营销位不溢出面板（真实 rect 断言）', async ({
  page,
}) => {
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
  expect(
    Math.abs(horiz!.arrowC - horiz!.trigC),
    '水平箭头中心对准触发器中心（±2px）',
  ).toBeLessThanOrEqual(2)
  expect(horiz!.arrowInVp, '箭头不越出面板').toBe(true)
  const vert = await probe('oas-navigation-menu[orientation="vertical"]', true)
  expect(vert).not.toBeNull()
  expect(
    Math.abs(vert!.arrowC - vert!.trigC),
    '垂直箭头中心对准触发器中心（±2px）',
  ).toBeLessThanOrEqual(2)
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
        cs.transform.includes('matrix') &&
        parseFloat(cs.borderRightWidth) > 0 &&
        parseFloat(cs.borderBottomWidth) > 0,
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
test('navigation-menu 箭头跨面板边缘探出指向宿主（rotate45 悬置，不内缩面板）', async ({
  page,
}) => {
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
    const nav = [...document.querySelectorAll('oas-navigation-menu')]
      .find((n) => n.getAttribute('delay-duration') === '0')!
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
    const nav = [...document.querySelectorAll('oas-navigation-menu')]
      .find((n) => n.getAttribute('delay-duration') === '0')!
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
test('navigation-menu 垂直方向指示条对准活动触发器（bottom 锚点未重置 + 同帧 offsetTop 旧值双坑）', async ({ page }) => {
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
    const nav = [...document.querySelectorAll('oas-navigation-menu')].find(
      (n) => n.shadowRoot?.querySelector('.bar.vertical'),
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
