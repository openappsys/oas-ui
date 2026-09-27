// 复核回归：splitter——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('oas-splitter + sidebar：拖拽分割条 sidebar 宽度实时跟随（不被窄面板遮住）', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  // 等 splitter 与其内部 sidebar 升级
  await page.waitForFunction(
    () => {
      const sp = document.querySelector('oas-splitter')
      const sb = sp?.querySelector('oas-sidebar')
      return sp?.shadowRoot != null && sb?.shadowRoot != null
    },
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(async () => {
    const sp = document.querySelector('oas-splitter')!
    const sb = sp.querySelector('oas-sidebar')! as HTMLElement
    sp.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const handle = sp.shadowRoot!.querySelector('[part="splitter"]') as HTMLElement
    const rect = handle.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const w0 = Math.round(sb.getBoundingClientRect().width)
    const inlineVar0 = sb.style.getPropertyValue('--oas-sidebar-width')
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }))
    const widths: number[] = []
    for (let i = 1; i <= 4; i++) {
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 30, clientY: cy }))
      await new Promise((res) => setTimeout(res, 60))
      widths.push(Math.round(sb.getBoundingClientRect().width))
    }
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 120, clientY: cy }))
    return { w0, widths, inlineVar0, percentAfter: sp.getAttribute('percent') }
  })
  // width="100%" 属性存活（update 不清除），sidebar 填满左面板
  expect(r.inlineVar0, 'sidebar 应保留 width=100%（不被 update 清掉）').toBe('100%')
  // 左面板 22%（splitter 宽 638 级），sidebar 不应是默认 220px 固定宽被遮住
  expect(r.w0, 'sidebar 初宽应≈左面板宽（220px 以下，非固定 220px 被遮）').toBeLessThan(220)
  // 拖拽中宽度实时变化且单调递增
  expect(r.widths.length, '拖拽采样应有宽度读数').toBeGreaterThan(0)
  const finalW = r.widths[r.widths.length - 1]!
  expect(finalW, '拖拽后 sidebar 应变宽').toBeGreaterThan(r.w0)
  const mono = r.widths.every((w, i) => i === 0 || w >= r.widths[i - 1]!)
  expect(mono, '拖拽过程宽度应单调不减小').toBe(true)
  expect(r.percentAfter, 'percent 应随拖拽增大').not.toBe('22')
})

// —— 缺陷回归：sidebar resizable 边缘拖拽调宽（内置 rail 形态） ——
// 设计定夺：拖拽调宽内置（resizable rail）优于 splitter 组合（组合有 width="100%" 写法
// 门槛 + 强制 split-pane 布局）。本断言真实拖拽 rail 边缘，验证宽度实时跟随并写回 width 属性。

test('splitter：折叠按钮与 separator 同级（不构成交互嵌套）且点击仍能折叠面板', async ({ page }) => {
  await page.goto('/components/splitter.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('oas-splitter[collapsible]')?.shadowRoot != null, undefined, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const sp = document.querySelector('oas-splitter[collapsible]') as HTMLElement & { shadowRoot: ShadowRoot }
    const sep = sp.shadowRoot.querySelector('[part="splitter"]') as HTMLElement
    const btn = sep.parentElement?.querySelector(':scope > .collapse-btn') as HTMLButtonElement | null
    const pane = sp.shadowRoot.querySelector('.pane') as HTMLElement
    const sb = sep.getBoundingClientRect()
    const bb = btn?.getBoundingClientRect()
    const flexBefore = pane.style.flex
    btn?.click()
    return {
      hasBtn: btn != null,
      nested: btn ? sep.contains(btn) : true,
      centered:
        bb != null &&
        Math.abs(sb.x + sb.width / 2 - (bb.x + bb.width / 2)) <= 2 &&
        Math.abs(sb.y + sb.height / 2 - (bb.y + bb.height / 2)) <= 2,
      btnVisible: bb != null && bb.width > 0 && bb.height > 0,
      flexBefore,
      flexAfter: pane.style.flex,
      collapsedAttr: sp.hasAttribute('collapsed'),
    }
  })
  expect(r.hasBtn, 'collapsible 下应有折叠按钮').toBe(true)
  expect(r.nested, '折叠按钮不能是 separator 的后代（axe: nested-interactive）').toBe(false)
  expect(r.centered && r.btnVisible, '折叠按钮应可见且居中压在分隔条上（移出 separator 后仍靠 .sep 定位）').toBe(true)
  expect(r.collapsedAttr, '点击折叠按钮应收起面板并回写 collapsed').toBe(true)
  expect(r.flexAfter, '折叠后该面板尺寸归零').toBe('0 0 0%')
})

// —— PRD P2：disabled 禁用调整（拖拽/键盘冻结 + 光标常态 + aria-disabled） ——
test('splitter disabled：真实拖拽与键盘均冻结、aria-disabled、光标常态（PRD P2）', async ({ page }) => {
  await page.goto('/components/splitter.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('oas-splitter[disabled]')?.shadowRoot != null, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    document.querySelector('oas-splitter[disabled]')!.scrollIntoView({ block: 'center' })
  })
  const r = await page.evaluate(async () => {
    const sp = document.querySelector('oas-splitter[disabled]')! as HTMLElement & { shadowRoot: ShadowRoot }
    const sep = sp.shadowRoot.querySelector('[part="splitter"]') as HTMLElement
    const rect = sep.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const before = sp.getAttribute('percent')
    // 真实指针拖拽序列（pointerdown → move → up）
    sep.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }))
    for (let i = 1; i <= 3; i++) {
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 30, clientY: cy }))
      await new Promise((res) => setTimeout(res, 40))
    }
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 90, clientY: cy }))
    // 键盘调整
    sep.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    return {
      before,
      after: sp.getAttribute('percent'),
      ariaDisabled: sep.getAttribute('aria-disabled'),
      cursor: getComputedStyle(sep).cursor,
      dragging: sp.hasAttribute('dragging'),
      dataDisabled: sp.hasAttribute('data-disabled'),
    }
  })
  expect(r.after, '禁用下拖拽不得改写 percent').toBe(r.before)
  expect(r.ariaDisabled, '分隔条应标记 aria-disabled=true').toBe('true')
  expect(r.cursor, '禁用下光标应为常态').toBe('default')
  expect(r.dragging, '禁用下不得进入拖拽态').toBe(false)
  expect(r.dataDisabled, '禁用态应镜像 data-disabled 供样式消费').toBe(true)
})

// —— PRD D18：snap 吸附档位（拖拽 ±8px 阈值内吸附 + 键盘在档位间落档） ——
test('splitter snap：拖拽靠近档位吸附（snap="25,50,75"），键盘在档位间落档（PRD D18）', async ({ page }) => {
  await page.goto('/components/splitter.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('oas-splitter[snap]')?.shadowRoot != null, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    document.querySelector('oas-splitter[snap]')!.scrollIntoView({ block: 'center' })
  })
  const r = await page.evaluate(async () => {
    const sp = document.querySelector('oas-splitter[snap]')! as HTMLElement & { shadowRoot: ShadowRoot }
    const sep = sp.shadowRoot.querySelector('[part="splitter"]') as HTMLElement
    const rect = sep.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const read = () => Number(sp.getAttribute('percent'))
    // 真实拖拽：+3px（远小于 ±8px 阈值）→ 应吸附回 50 档
    sep.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }))
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + 3, clientY: cy }))
    await new Promise((res) => setTimeout(res, 60))
    const snapped = read()
    // +30px（超出阈值）→ 不吸附（介于 50 与 75 之间）
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + 30, clientY: cy }))
    await new Promise((res) => setTimeout(res, 60))
    const free = read()
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 30, clientY: cy }))
    // 键盘在档位间落档
    sep.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    const nextStop = read()
    sep.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    const prevStop = read()
    return { snapped, free, nextStop, prevStop }
  })
  expect(r.snapped, '拖出 3px（阈值内）应吸附回 50 档').toBe(50)
  expect(r.free, '拖出 30px（阈值外）不应吸附回档位').toBeGreaterThan(50)
  expect(r.free, '阈值外也不应跳到 75 档').toBeLessThan(75)
  expect(r.nextStop, 'ArrowRight 应落 75 档').toBe(75)
  expect(r.prevStop, 'ArrowLeft 应落回 50 档').toBe(50)
})
