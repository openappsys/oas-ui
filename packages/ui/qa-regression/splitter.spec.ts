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

// —— Task 8B：storage-key opt-in 尺寸持久化（真实刷新恢复 / 优先级 / 写入合并） ——
const PERSIST_KEY = 'oas-splitter-docs-persist'
const PERSIST_MULTI_KEY = 'oas-splitter-docs-persist-multi'

async function openPersistDemo(page: import('@playwright/test').Page): Promise<void> {
  // 先等首屏动态模块装载完成再 reload：Firefox 会把导航中止的动态 import 记为 console error
  await page.goto('/components/splitter.html', { waitUntil: 'load' })
  await page.waitForFunction(
    () => document.querySelector('#splitter-persist-demo')?.shadowRoot?.querySelector('[part="splitter"]') != null,
    undefined,
    { timeout: 15000 },
  )
  await page.evaluate(
    ([legacy, multi]: [string, string]) => {
      localStorage.removeItem(legacy)
      localStorage.removeItem(`${legacy}-b`)
      localStorage.removeItem(multi)
    },
    [PERSIST_KEY, PERSIST_MULTI_KEY] as [string, string],
  )
  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(
    () => {
      const sp = document.querySelector('#splitter-persist-demo')
      return sp?.shadowRoot?.querySelector('[part="splitter"]') != null
    },
    undefined,
    { timeout: 15000 },
  )
}

test('splitter storage-key：真实拖拽落盘 → 刷新恢复；显式初值优先；改 key 不重载；dark/RTL 一致', async ({ page }) => {
  const noise: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') noise.push(m.text())
  })
  page.on('pageerror', (e) => noise.push(e.message))

  await openPersistDemo(page)
  const dragged = await page.evaluate(async (key) => {
    const sp = document.querySelector('#splitter-persist-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const sep = sp.shadowRoot.querySelector('[part="splitter"]') as HTMLElement
    const rect = sep.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const before = Number(sp.getAttribute('percent') ?? '50')
    sep.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }))
    for (let i = 1; i <= 8; i++) {
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 12, clientY: cy }))
      await new Promise((r) => setTimeout(r, 16))
    }
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 96, clientY: cy }))
    await new Promise((r) => setTimeout(r, 80))
    const pane = sp.shadowRoot.querySelector('.pane') as HTMLElement
    return {
      before,
      after: Number(sp.getAttribute('percent')),
      flex: pane.style.flex,
      raw: localStorage.getItem(key),
    }
  }, PERSIST_KEY)

  expect(dragged.after, '真实拖拽应改写 percent').toBeGreaterThan(dragged.before)
  const snapshot = JSON.parse(dragged.raw ?? 'null') as { v: number; mode: string; percent: number }
  expect(snapshot, '应写入版本化快照').toMatchObject({ v: 1, mode: 'legacy' })
  expect(snapshot.percent).toBeCloseTo(dragged.after, 1)

  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(
    () => document.querySelector('#splitter-persist-demo')?.shadowRoot?.querySelector('[part="splitter"]') != null,
    undefined,
    { timeout: 15000 },
  )
  await page.waitForTimeout(150)
  const restored = await page.evaluate(() => {
    const sp = document.querySelector('#splitter-persist-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const pane = sp.shadowRoot.querySelector('.pane') as HTMLElement
    return { percent: Number(sp.getAttribute('percent') ?? '50'), flex: pane.style.flex }
  })
  expect(restored.percent, '刷新后应恢复存储尺寸').toBeCloseTo(dragged.after, 1)
  expect(restored.flex).toContain(`${Math.round(restored.percent * 100) / 100}%`)

  // 显式初始属性优先于存储
  const explicit = await page.evaluate(async (key) => {
    const el = document.createElement('oas-splitter') as HTMLElement & { shadowRoot: ShadowRoot }
    el.setAttribute('storage-key', key)
    el.setAttribute('percent', '30')
    el.innerHTML = '<div slot="left">左</div><div slot="right">右</div>'
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 120))
    const pane = el.shadowRoot.querySelector('.pane') as HTMLElement
    const out = { percent: el.getAttribute('percent'), flex: pane.style.flex }
    el.remove()
    return out
  }, PERSIST_KEY)
  expect(explicit.percent, '显式 percent 不得被存储覆盖').toBe('30')
  expect(explicit.flex).toBe('0 0 30%')

  // 改 key 不自动重载
  const keyChanged = await page.evaluate(async (key) => {
    localStorage.setItem(`${key}-b`, JSON.stringify({ v: 1, mode: 'legacy', percent: 20 }))
    const el = document.createElement('oas-splitter') as HTMLElement & { shadowRoot: ShadowRoot }
    el.setAttribute('storage-key', key)
    el.innerHTML = '<div slot="left">左</div><div slot="right">右</div>'
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 120))
    const before = el.getAttribute('percent')
    el.setAttribute('storage-key', `${key}-b`)
    await new Promise((r) => setTimeout(r, 300))
    const after = el.getAttribute('percent')
    el.remove()
    return { before, after }
  }, PERSIST_KEY)
  expect(Number(keyChanged.before)).toBeCloseTo(dragged.after, 1)
  expect(keyChanged.after, '改 storage-key 不得自动重载').toBe(keyChanged.before)

  // dark / RTL 不改变恢复后的比例、console 零告警
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(250)
  const darkPercent = await page.evaluate(() => {
    const sp = document.querySelector('#splitter-persist-demo')
    return Number(sp?.getAttribute('percent') ?? '50')
  })
  expect(darkPercent).toBeCloseTo(restored.percent, 1)
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  await page.waitForTimeout(150)
  const rtlPercent = await page.evaluate(() => {
    const sp = document.querySelector('#splitter-persist-demo')
    return Number(sp?.getAttribute('percent') ?? '50')
  })
  expect(rtlPercent).toBeCloseTo(restored.percent, 1)
  expect(noise, '持久化链路 console 零告警').toEqual([])
})

test('splitter storage-key：折叠前尺寸刷新恢复（legacy）+ 多面板 sizes 完整往返', async ({ page }) => {
  await openPersistDemo(page)
  const collapsed = await page.evaluate(async () => {
    const sp = document.querySelector('#splitter-persist-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    sp.scrollIntoView({ block: 'center' })
    const sep = sp.shadowRoot.querySelector('[part="splitter"]') as HTMLElement
    for (let i = 0; i < 10; i++) {
      sep.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    }
    await new Promise((r) => setTimeout(r, 200))
    const btn = sep.parentElement?.querySelector(':scope > .collapse-btn') as HTMLButtonElement
    btn.click()
    await new Promise((r) => setTimeout(r, 220))
    const pane = sp.shadowRoot.querySelector('.pane') as HTMLElement
    return {
      percent: sp.getAttribute('percent'),
      collapsed: sp.hasAttribute('collapsed'),
      flex: pane.style.flex,
      raw: localStorage.getItem('oas-splitter-docs-persist'),
    }
  })
  expect(collapsed.collapsed, '折叠应回写 collapsed 属性').toBe(true)
  expect(collapsed.flex, '折叠面板尺寸归零').toBe('0 0 0%')
  const snap = JSON.parse(collapsed.raw ?? 'null') as {
    v: number
    mode: string
    percent: number
    collapsed: number[]
    prev: Record<string, number>
  }
  expect(snap, '折叠快照含版本/模式/折叠索引/折叠前尺寸').toMatchObject({
    v: 1,
    mode: 'legacy',
    percent: 40,
    collapsed: [0],
  })
  expect(snap.prev['0']).toBe(40)

  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(
    () => {
      const sp = document.querySelector('#splitter-persist-demo')
      return sp?.shadowRoot?.querySelector('[part="splitter"]') != null && sp.hasAttribute('collapsed')
    },
    undefined,
    { timeout: 15000 },
  )
  const expanded = await page.evaluate(async () => {
    const sp = document.querySelector('#splitter-persist-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const sep = sp.shadowRoot.querySelector('[part="splitter"]') as HTMLElement
    const btn = sep.parentElement?.querySelector(':scope > .collapse-btn') as HTMLButtonElement
    btn.click()
    await new Promise((r) => setTimeout(r, 80))
    const pane = sp.shadowRoot.querySelector('.pane') as HTMLElement
    return { percent: Number(sp.getAttribute('percent')), flex: pane.style.flex }
  })
  expect(expanded.percent, '展开后回到折叠前 percent').toBe(40)
  expect(expanded.flex).toBe('0 0 40%')

  // 多面板：真实拖拽中间分隔条 → 刷新完整往返
  const multi = await page.evaluate(async (key) => {
    const sp = document.querySelector('#splitter-persist-multi') as HTMLElement & { shadowRoot: ShadowRoot }
    sp.scrollIntoView({ block: 'center' })
    await new Promise((r) => setTimeout(r, 150))
    const sep = sp.shadowRoot.querySelectorAll('[part="splitter"]')[1] as HTMLElement
    const rect = sep.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    sep.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }))
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + 40, clientY: cy }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 40, clientY: cy }))
    await new Promise((r) => setTimeout(r, 80))
    return { sizes: sp.getAttribute('sizes'), raw: localStorage.getItem(key) }
  }, PERSIST_MULTI_KEY)
  const multiSnap = JSON.parse(multi.raw ?? 'null') as { v: number; mode: string; sizes: number[] }
  expect(multiSnap).toMatchObject({ v: 1, mode: 'multi' })
  expect(multiSnap.sizes.length, '多面板快照应含全部面板').toBe(3)

  await page.reload({ waitUntil: 'load' })
  await page.waitForFunction(
    () => document.querySelector('#splitter-persist-multi')?.shadowRoot?.querySelector('[part="splitter"]') != null,
    undefined,
    { timeout: 15000 },
  )
  await page.waitForTimeout(150)
  const multiRestored = await page.evaluate(() => {
    const sp = document.querySelector('#splitter-persist-multi') as HTMLElement & { shadowRoot: ShadowRoot }
    const panes = sp.shadowRoot.querySelectorAll('.pane')
    return {
      sizes: sp.getAttribute('sizes'),
      flexes: Array.from(panes).map((p) => (p as HTMLElement).style.flex),
    }
  })
  expect(multiRestored.sizes, '多面板 sizes 刷新后完整恢复').toBe(multi.sizes)
  expect(multiRestored.flexes.length).toBe(3)
})

test('splitter storage-key：拖拽写入合并（多次 pointermove 只落盘一次）', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __oasSplitterWrites?: number }
    w.__oasSplitterWrites = 0
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      if (String(key).startsWith('oas-splitter-')) w.__oasSplitterWrites = (w.__oasSplitterWrites ?? 0) + 1
      return original.call(this, key, value)
    }
  })
  await openPersistDemo(page)
  const r = await page.evaluate(async () => {
    const w = window as unknown as { __oasSplitterWrites?: number }
    w.__oasSplitterWrites = 0
    const sp = document.querySelector('#splitter-persist-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    sp.scrollIntoView({ block: 'center' })
    await new Promise((r) => setTimeout(r, 200))
    const sep = sp.shadowRoot.querySelector('[part="splitter"]') as HTMLElement
    const rect = sep.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    sep.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }))
    for (let i = 1; i <= 12; i++) {
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 8, clientY: cy }))
    }
    const during = w.__oasSplitterWrites ?? 0
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 96, clientY: cy }))
    await new Promise((r) => setTimeout(r, 160))
    return {
      during,
      total: w.__oasSplitterWrites ?? 0,
      raw: localStorage.getItem('oas-splitter-docs-persist'),
    }
  })
  expect(r.during, 'pointermove 阶段不得逐帧同步写').toBe(0)
  expect(r.total, 'pointerup 合并落盘一次').toBe(1)
  expect(JSON.parse(r.raw ?? 'null')).toMatchObject({ v: 1, mode: 'legacy' })
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
