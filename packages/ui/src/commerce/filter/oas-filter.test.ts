import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASFilter, type FilterConditions, type FilterGroup, type FilterSortOption } from './index.js'

const GROUPS = JSON.stringify([
  {
    key: 'brand',
    label: '品牌',
    multiple: true,
    options: [
      { value: 'a', label: '品牌A' },
      { value: 'b', label: '品牌B' },
      { value: 'c', label: '品牌C', disabled: true },
    ],
  },
  {
    key: 'color',
    label: '颜色',
    multiple: false,
    options: [
      { value: 'red', label: '红色' },
      { value: 'blue', label: '蓝色' },
    ],
  },
] satisfies FilterGroup[])

function mount(attrs: Record<string, string> = {}): OASFilter {
  const el = new OASFilter()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASFilter, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

function parts(el: OASFilter, name: string): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>(`[part="${name}"]`)]
}

/** 面板内指定组的选项按钮（data-group / data-value 定位） */
function option(el: OASFilter, group: string, value: string): HTMLButtonElement | null {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(
    `[part="option"][data-group="${group}"][data-value="${value}"]`,
  )
}

function chip(el: OASFilter, group: string, value: string): HTMLButtonElement | null {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`[part="chip"][data-group="${group}"][data-value="${value}"]`)
}

async function settled(): Promise<void> {
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

describe('oas-filter', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  // —— 排序 ——

  it('缺省渲染三件套排序项（综合 / 销量 / 价格），价格支持升降切换，综合默认选中', () => {
    const el = mount()
    const sorts = parts(el, 'sort-item')
    expect(sorts).toHaveLength(3)
    expect(sorts.map((s) => s.textContent)).toEqual(['综合', '销量', '价格'])
    expect(sorts[2]!.getAttribute('data-toggled')).toBe('true')
    expect(sorts[0]!.getAttribute('aria-checked')).toBe('true')
    expect(sorts[1]!.getAttribute('aria-checked')).toBe('false')
  })

  it('点排序项回写 conditions 并派发 oas-change（detail 含 sort / order / groups / summary）', async () => {
    const el = mount({ groups: GROUPS })
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    const sales = parts(el, 'sort-item')[1]!
    sales.click()
    await settled()
    expect(events).toHaveLength(1)
    const detail = events[0] as {
      sort: string
      order: string | null
      groups: Record<string, string[]>
      summary: string
    }
    expect(detail.sort).toBe('sales')
    expect(detail.order).toBeNull()
    expect(detail.groups).toEqual({})
    expect(el.conditions).toEqual({ sort: 'sales' })
    // 回写 attribute（非受控开箱即用）
    expect(JSON.parse(el.getAttribute('conditions')!)).toEqual({ sort: 'sales' })
  })

  it('价格项首次点击降序、再次点击升序（toggled 升降 toggle）', async () => {
    const el = mount()
    const price = () => parts(el, 'sort-item')[2]!
    price().click()
    expect(el.conditions.order).toBe('desc')
    price().click()
    expect(el.conditions.order).toBe('asc')
    price().click()
    expect(el.conditions.order).toBe('desc')
    // 方向进 summary（aria-live 摘要）
    expect(part(el, 'live')!.textContent).toContain('降序')
  })

  it('非 toggled 排序项重复点击不翻方向、不重复派发', async () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-change', () => events.push(1))
    const sales = () => parts(el, 'sort-item')[1]!
    sales().click()
    sales().click()
    expect(events).toHaveLength(1)
    expect(el.conditions.order).toBeUndefined()
  })

  it('sorts 配置可整体替换（JSON 双通道 property），非法 JSON 告警一次并回落缺省', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ sorts: '[{"key":"new","label":"最新"},{"key":"hot","label":"热度","toggled":true}]' })
    const sorts = parts(el, 'sort-item')
    expect(sorts.map((s) => s.textContent)).toEqual(['最新', '热度'])
    // property 通道
    const next: FilterSortOption[] = [{ key: 'x', label: 'X' }]
    el.sorts = next
    expect(parts(el, 'sort-item').map((s) => s.textContent)).toEqual(['X'])
    expect(JSON.parse(el.getAttribute('sorts')!)).toEqual(next)
    // 非法 JSON
    const el2 = mount({ sorts: '{bad' })
    expect(parts(el2, 'sort-item')).toHaveLength(3)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  // —— 条件组 ——

  it('多选组：勾选互不挤占，disabled 选项不可点', async () => {
    const el = mount({ groups: GROUPS })
    el.setOpen(true)
    await settled()
    const a = option(el, 'brand', 'a')!
    const b = option(el, 'brand', 'b')!
    a.click()
    b.click()
    await settled()
    expect(a.getAttribute('aria-checked')).toBe('true')
    expect(b.getAttribute('aria-checked')).toBe('true')
    expect(el.conditions.groups?.brand).toEqual(['a', 'b'])
    const c = option(el, 'brand', 'c')!
    expect(c.disabled).toBe(true)
    c.click()
    expect(el.conditions.groups?.brand).toEqual(['a', 'b'])
  })

  it('单选组：互斥选择，点已选项取消（回到不限）', async () => {
    const el = mount({ groups: GROUPS })
    el.setOpen(true)
    await settled()
    const red = option(el, 'color', 'red')!
    const blue = option(el, 'color', 'blue')!
    red.click()
    expect(el.conditions.groups?.color).toEqual(['red'])
    blue.click()
    expect(el.conditions.groups?.color).toEqual(['blue'])
    expect(red.getAttribute('aria-checked')).toBe('false')
    blue.click()
    expect(el.conditions.groups?.color).toEqual([])
    expect(blue.getAttribute('aria-checked')).toBe('false')
  })

  // —— 已选回显 ——

  it('已选条件回显 chips 逐项可撤销 + 一键重置（aria-label 带「移除 条件名」）', async () => {
    const el = mount({ groups: GROUPS })
    el.setOpen(true)
    option(el, 'brand', 'a')!.click()
    option(el, 'color', 'red')!.click()
    await settled()
    const chipA = chip(el, 'brand', 'a')!
    expect(chipA).toBeInstanceOf(HTMLButtonElement)
    expect(chipA.getAttribute('aria-label')).toBe('移除 品牌：品牌A')
    expect(chip(el, 'color', 'red')).toBeInstanceOf(HTMLButtonElement)
    // 撤销一枚
    chipA.click()
    await settled()
    expect(chip(el, 'brand', 'a')).toBeNull()
    expect(el.conditions.groups?.brand).toEqual([])
    // 一键重置（含排序回默认）
    el.setAttribute('conditions', JSON.stringify({ sort: 'price', order: 'desc', groups: { color: ['red'] } }))
    await settled()
    part(el, 'reset')!.click()
    await settled()
    expect(el.conditions).toEqual({})
    expect(parts(el, 'chip')).toHaveLength(0)
  })

  // —— conditions 双通道 ——

  it('conditions 受控双通道：property setter 反射 attribute，宿主写回不派发 oas-change', async () => {
    const el = mount({ groups: GROUPS })
    const events: unknown[] = []
    el.addEventListener('oas-change', () => events.push(1))
    const value: FilterConditions = { sort: 'price', order: 'asc', groups: { brand: ['a'] } }
    el.conditions = value
    await settled()
    expect(JSON.parse(el.getAttribute('conditions')!)).toEqual(value)
    expect(el.conditions).toEqual(value)
    expect(events).toHaveLength(0)
    // 预置选中 → chips 直接回显
    expect(chip(el, 'brand', 'a')).toBeInstanceOf(HTMLButtonElement)
    // 属性变化同步排序行选中
    expect(parts(el, 'sort-item')[2]!.getAttribute('aria-checked')).toBe('true')
  })

  it('conditions 非法 JSON 告警一次并按空条件处理', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ conditions: '{bad' })
    expect(el.conditions).toEqual({})
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('oas-filter')
  })

  it('单选组多值截断：devWarn 一次，清洗结果回写 attribute（getter 与 attribute 一致）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ groups: GROUPS, conditions: JSON.stringify({ groups: { color: ['red', 'blue'] } }) })
    await settled()
    // 单选组恒 ≤1 项：保留首个
    expect(el.conditions.groups?.color).toEqual(['red'])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    // 清洗结果回写 attribute：getter 与 attribute 完全一致（宿主写脏值被规整）
    expect(JSON.parse(el.getAttribute('conditions')!)).toEqual({ groups: { color: ['red'] } })
    // 再次读取不再告警（一次性）
    el.conditions
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('sorts 缺 label 的项被跳过并一次性告警；groups 选项缺 value / label 被跳过并一次性告警', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ sorts: '[{"key":"x"},{"key":"y","label":"Y"},{"key":"z","label":"Z"}]' })
    expect(parts(el, 'sort-item').map((s) => s.textContent)).toEqual(['Y', 'Z'])
    // groups：缺 value 的选项跳过；组缺 label 整组跳过
    const el2 = mount({
      groups: JSON.stringify([
        { key: 'g1', label: '组一', options: [{ value: 'a', label: 'A' }, { label: '无值' }, { value: 'b' }] },
        { key: 'g2', options: [{ value: 'c', label: 'C' }] },
        { key: 'g3', label: '', options: [{ value: 'd', label: 'D' }] },
      ]),
    })
    el2.setOpen(true)
    await settled()
    const group1 = parts(el2, 'group')[0]!
    expect(group1.getAttribute('aria-label')).toBe('组一')
    // 仅剩合法选项 a
    expect([...group1.querySelectorAll('[part="option"]')]).toHaveLength(1)
    expect(parts(el2, 'group')).toHaveLength(1)
    // 两处解析告警各一次（sorts / groups 独立计数）
    expect(warnSpy.mock.calls.filter((c) => String(c[0]).includes('sorts'))).toHaveLength(1)
    expect(warnSpy.mock.calls.filter((c) => String(c[0]).includes('groups'))).toHaveLength(1)
  })

  it('chips 撤销后焦点迁到相邻 chip；撤销最后一枚焦点回触发器', async () => {
    const el = mount({ groups: GROUPS, conditions: JSON.stringify({ groups: { brand: ['a', 'b'], color: ['red'] } }) })
    await settled()
    const chipA = chip(el, 'brand', 'a')!
    chipA.focus()
    chipA.click()
    await settled()
    // 第一枚撤掉后焦点落到原第二枚（brand:b）
    expect(el.shadowRoot!.activeElement).toBe(chip(el, 'brand', 'b'))
    // 撤到只剩一枚再撤 → 焦点回触发器
    chip(el, 'brand', 'b')!.click()
    const last = chip(el, 'color', 'red')!
    last.focus()
    last.click()
    await settled()
    expect(parts(el, 'chip')).toHaveLength(0)
    expect(el.shadowRoot!.activeElement).toBe(part(el, 'trigger'))
  })

  // —— 面板形态与开合 ——

  it('open 双通道：setOpen 回写 attribute 并派发 oas-open-change；宿主写 attribute 不派发', async () => {
    const el = mount({ groups: GROUPS })
    const events: string[] = []
    el.addEventListener('oas-open-change', (e) => events.push(String((e as CustomEvent).detail.open)))
    el.setOpen(true)
    await settled()
    expect(events).toEqual(['true'])
    expect(el.hasAttribute('open')).toBe(true)
    expect(part(el, 'trigger')!.getAttribute('aria-expanded')).toBe('true')
    el.setOpen(false)
    await settled()
    expect(events).toEqual(['true', 'false'])
    expect(el.hasAttribute('open')).toBe(false)
    // 宿主直写不派发
    el.setAttribute('open', '')
    await settled()
    expect(events).toEqual(['true', 'false'])
    el.removeAttribute('open')
  })

  it('dropdown 形态（缺省）：触发器带 aria-haspopup；panel 为内联定位容器', () => {
    const el = mount({ groups: GROUPS })
    const trigger = part(el, 'trigger')!
    expect(trigger.getAttribute('aria-haspopup')).toBe('true')
    expect(part(el, 'panel')!.getAttribute('data-form')).toBe('dropdown')
  })

  it('drawer 形态：panel 带 data-form=drawer 与遮罩，完成按钮关闭并回写 open', async () => {
    const el = mount({ groups: GROUPS, panel: 'drawer' })
    el.setOpen(true)
    await settled()
    expect(part(el, 'panel')!.getAttribute('data-form')).toBe('drawer')
    expect(part(el, 'mask')).toBeInstanceOf(HTMLButtonElement)
    const done = part(el, 'done')!
    expect(done.textContent).toBe('完成')
    done.click()
    await settled()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('drawer 形态补 dialog 语义：role=dialog + aria-modal=true，dropdown 形态不挂 dialog', async () => {
    const drawer = mount({ groups: GROUPS, panel: 'drawer' })
    drawer.setOpen(true)
    await settled()
    expect(part(drawer, 'panel')!.getAttribute('role')).toBe('dialog')
    expect(part(drawer, 'panel')!.getAttribute('aria-modal')).toBe('true')
    drawer.setOpen(false)
    await settled()
    // dropdown（缺省）非模态，无 dialog 语义
    const dropdown = mount({ groups: GROUPS })
    dropdown.setOpen(true)
    await settled()
    expect(part(dropdown, 'panel')!.getAttribute('role')).toBeNull()
    expect(part(dropdown, 'panel')!.getAttribute('aria-modal')).toBeNull()
  })

  it('drawer 焦点陷阱：Tab / Shift+Tab 循环限制在面板内', async () => {
    const el = mount({ groups: GROUPS, panel: 'drawer' })
    el.setOpen(true)
    await settled()
    const panel = part(el, 'panel')!
    // 可聚焦集合与组件陷阱同口径：未禁用选项 + 「完成」按钮
    const focusables = [...panel.querySelectorAll<HTMLElement>('[part="option"]:not([disabled]), [part="done"]')]
    const last = focusables[focusables.length - 1]!
    const first = focusables[0]!
    // 焦点在最后一个可聚焦项 → Tab 循回首
    last.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(first)
    // 焦点在首项 → Shift+Tab 循环到末项
    first.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(last)
    // 焦点游离面板外（如触发器）→ Tab 拉回面板首项
    part(el, 'trigger')!.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(first)
    void panel
  })

  it('面板打开聚焦首个条件选项，Esc 关闭并焦点回触发器（dropdown 形态）', async () => {
    const el = mount({ groups: GROUPS })
    const trigger = part(el, 'trigger')!
    trigger.focus()
    trigger.click()
    await settled()
    const firstOption = option(el, 'brand', 'a')!
    expect(el.shadowRoot!.activeElement).toBe(firstOption)
    // Esc 关闭
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settled()
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(trigger)
  })

  it('触发器显示已选计数徽标（conditions 预置时直接可见）', async () => {
    const el = mount({ groups: GROUPS, conditions: JSON.stringify({ groups: { brand: ['a', 'b'], color: ['red'] } }) })
    await settled()
    const badge = part(el, 'badge')!
    expect(badge.hidden).toBe(false)
    expect(badge.textContent).toBe('3')
  })

  it('触发器可访问名来自可见内容（不用 aria-label，避免 label-in-name 不一致）', async () => {
    const el = mount({ groups: GROUPS, conditions: JSON.stringify({ groups: { brand: ['a', 'b'] } }) })
    await settled()
    const trigger = part(el, 'trigger')!
    expect(trigger.hasAttribute('aria-label')).toBe(false)
    // 可见文本 = 排序标签 + 计数徽标，可访问名从内容推导（所见即所读）
    expect(trigger.textContent).toContain('筛选')
    expect(trigger.textContent).toContain('2')
  })

  // —— groups 配置 ——

  it('groups 非法 JSON 告警一次按空处理；空组配置时触发器隐藏（无可筛条件）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ groups: '[{bad' })
    expect(parts(el, 'group')).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    const el2 = mount({})
    expect(part(el2, 'trigger')!.hidden).toBe(true)
  })

  it('组容器语义：单选组 role=radiogroup、多选组 role=group，均带组名 aria-label', () => {
    const el = mount({ groups: GROUPS })
    el.setOpen(true)
    const groupBoxes = parts(el, 'group')
    expect(groupBoxes).toHaveLength(2)
    expect(groupBoxes[0]!.getAttribute('role')).toBe('group')
    expect(groupBoxes[0]!.getAttribute('aria-label')).toBe('品牌')
    expect(groupBoxes[1]!.getAttribute('role')).toBe('radiogroup')
    expect(groupBoxes[1]!.getAttribute('aria-label')).toBe('颜色')
  })

  // —— 键盘 ——

  it('组内方向键移动焦点（不触发选择）', async () => {
    const el = mount({ groups: GROUPS })
    el.setOpen(true)
    await settled()
    const a = option(el, 'brand', 'a')!
    const b = option(el, 'brand', 'b')!
    a.focus()
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(b)
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    expect(el.shadowRoot!.activeElement).toBe(a)
    expect(el.conditions.groups ?? {}).toEqual({})
  })

  // —— summary / aria-live ——

  it('summary 汇总排序方向与各组选中值（供宿主 aria-live 播报）', async () => {
    const el = mount({ groups: GROUPS })
    el.setOpen(true)
    option(el, 'brand', 'a')!.click()
    option(el, 'color', 'red')!.click()
    await settled()
    const live = part(el, 'live')!.textContent ?? ''
    expect(live).toContain('品牌：品牌A')
    expect(live).toContain('颜色：红色')
    el.setAttribute('conditions', JSON.stringify({ sort: 'price', order: 'asc', groups: {} }))
    await settled()
    expect(part(el, 'live')!.textContent).toContain('价格 升序')
  })

  // —— RTL ——

  it('RTL 容器下组件渲染与交互不受方向影响（逻辑属性布局）', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    try {
      const el = mount({ groups: GROUPS })
      el.setOpen(true)
      option(el, 'color', 'blue')!.click()
      await settled()
      expect(el.conditions.groups?.color).toEqual(['blue'])
      expect(chip(el, 'color', 'blue')).toBeInstanceOf(HTMLButtonElement)
    } finally {
      document.documentElement.removeAttribute('dir')
    }
  })

  // —— 断连清理 ——

  it('断开重连后面板状态与监听正常（外点关闭可再挂）', async () => {
    const el = mount({ groups: GROUPS })
    el.setOpen(true)
    await settled()
    el.remove()
    document.body.appendChild(el)
    await settled()
    expect(el.hasAttribute('open')).toBe(true)
    // 重新外点可关闭
    document.body.click()
    await settled()
    expect(el.hasAttribute('open')).toBe(false)
  })
})
