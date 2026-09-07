import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCombobox } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

function mount(attrs: Record<string, string> = {}): OASCombobox {
  const el = new OASCombobox()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function input(el: OASCombobox): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

function open(el: OASCombobox): void {
  input(el).dispatchEvent(new FocusEvent('focus'))
}

function optionRows(el: OASCombobox): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
}

describe('OASCombobox', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染输入框即控件：role=combobox、aria-expanded=false、aria-controls、显示 placeholder', () => {
    const el = mount({ placeholder: '请选择' })
    const i = input(el)
    expect(i.getAttribute('role')).toBe('combobox')
    expect(i.getAttribute('aria-expanded')).toBe('false')
    expect(i.getAttribute('aria-controls')).toBe('combobox-list')
    expect(i.getAttribute('aria-autocomplete')).toBe('list')
    expect(i.placeholder).toBe('请选择')
    expect(el.shadowRoot!.querySelector('[role="listbox"]')).not.toBeNull()
  })

  it('value 匹配时输入框显示选项 label（而非 value）', () => {
    const el = mount({ value: 'banana' })
    expect(input(el).value).toBe('香蕉')
  })

  it('聚焦展开下拉，选项渲染为 role=option，aria-expanded 同步', () => {
    const el = mount()
    open(el)
    expect(input(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector('.dropdown')!.classList.contains('open')).toBe(true)
    expect(optionRows(el).length).toBe(3)
  })

  it('点击选项：value 置 option.value、输入框显示 label、关闭下拉、派发 oas-change', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    optionRows(el)[1]!.click()
    expect(el.getAttribute('value')).toBe('banana')
    expect(input(el).value).toBe('香蕉')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(detail).toEqual({ value: 'banana' })
  })

  it('点击禁用选项不选中，且渲染 aria-disabled', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana', disabled: true },
      ]),
    })
    open(el)
    expect(el.shadowRoot!.querySelector('[aria-disabled="true"]')).not.toBeNull()
    optionRows(el)[1]!.click()
    expect(el.getAttribute('value')).toBeNull()
  })

  it('输入实时过滤 label，派发 oas-input（detail 为过滤词）', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).value = '香'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    expect(optionRows(el).length).toBe(1)
    expect(optionRows(el)[0]!.textContent).toContain('香蕉')
    expect(detail).toEqual({ value: '香' })
  })

  it('filterable=false：输入不过滤，全部选项仍渲染', () => {
    const el = mount({ filterable: 'false' })
    open(el)
    input(el).value = '不存在的'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    expect(optionRows(el).length).toBe(3)
  })

  it('过滤无匹配时显示 combobox.noMatch 空态（role=status）', () => {
    const el = mount()
    open(el)
    input(el).value = '不存在的'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    const status = el.shadowRoot!.querySelector('[role="status"]')!
    expect(status.textContent).toContain('无匹配选项')
  })

  it('options 为空时显示 combobox.empty 空态（role=status）', () => {
    const el = mount({ options: '[]' })
    open(el)
    const status = el.shadowRoot!.querySelector('[role="status"]')!
    expect(status.textContent).toContain('暂无选项')
  })

  it('回归：options 为空时输入也不切换为 noMatch（保持 empty 文案）', () => {
    const el = mount({ options: '[]' })
    open(el)
    input(el).value = '任意输入'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    const status = el.shadowRoot!.querySelector('[role="status"]')!
    expect(status.textContent).toContain('暂无选项')
  })

  it('loading 时下拉显示 combobox.loading 加载占位', () => {
    const el = mount({ loading: '' })
    open(el)
    expect(el.shadowRoot!.textContent).toContain('加载中…')
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(0)
  })

  it('键盘：↑↓ 移动高亮，aria-activedescendant 跟随，Enter 选中高亮项', () => {
    const el = mount()
    open(el)
    const i = input(el)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const active = el.shadowRoot!.querySelector('.option.active')!
    expect(active.textContent).toContain('橙子')
    expect(i.getAttribute('aria-activedescendant')).toBe(active.id)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('orange')
    expect(i.value).toBe('橙子')
  })

  it('键盘：Enter 落到禁用项时不选中（跳过）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana', disabled: true },
        { label: '橙子', value: 'orange' },
      ]),
    })
    open(el)
    const i = input(el)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    // 高亮可以移动到禁用项，但 Enter 不选中
    expect(el.shadowRoot!.querySelector('.option.active')!.textContent).toContain('香蕉')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBeNull()
  })

  it('键盘：Esc 关闭并回退为当前选中项 label（默认非破坏）', () => {
    const el = mount({ value: 'banana' })
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(input(el).value).toBe('香蕉')
  })

  it('失焦未选中时回退为当前选中项 label 并关闭', () => {
    const el = mount({ value: 'apple' })
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(input(el).value).toBe('苹果')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('失焦未选中且无值时回退为空', () => {
    const el = mount()
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(input(el).value).toBe('')
  })

  it('disabled：不可输入、聚焦不展开', () => {
    const el = mount({ disabled: '', value: 'apple' })
    expect(input(el).disabled).toBe(true)
    input(el).dispatchEvent(new FocusEvent('focus'))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('clearable：有值时显示清空按钮，点击清空并派发 oas-clear / oas-change', () => {
    const el = mount({ clearable: '', value: 'apple' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!
    expect(clearBtn.hidden).toBe(false)
    let clearDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-clear', (e: Event) => (clearDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    clearBtn.click()
    expect(el.getAttribute('value')).toBeNull()
    expect(input(el).value).toBe('')
    expect(clearDetail).toEqual({ value: 'apple' })
    expect(changeDetail).toEqual({ value: '' })
    expect(clearBtn.hidden).toBe(true)
  })

  it('clearable：无值 / 禁用时不显示清空按钮', () => {
    const el = mount({ clearable: '' })
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
    const el2 = mount({ clearable: '', disabled: '', value: 'apple' })
    expect(el2.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
  })

  it('受控：外部改 value 属性即时回填 label（增量更新，不重建 shadow DOM）', () => {
    const el = mount()
    const i = input(el)
    el.setAttribute('value', 'orange')
    expect(input(el)).toBe(i)
    expect(i.value).toBe('橙子')
  })

  it('点击组件外部关闭并回退', () => {
    const el = mount({ value: 'banana' })
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(input(el).value).toBe('香蕉')
  })

  it('重新打开下拉时下拉仍渲染选项（open/close 可往返）', () => {
    const el = mount()
    open(el)
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    open(el)
    expect(optionRows(el).length).toBe(3)
  })
})

describe('OASCombobox 能力并集：group / size / status / filter / open / virtual / readonly', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const GROUPED = JSON.stringify([
    { group: '温带水果', label: '苹果', value: 'apple' },
    { group: '温带水果', label: '梨', value: 'pear' },
    { group: '热带水果', label: '香蕉', value: 'banana' },
  ])

  // ---- group 分组 ----

  it('group：组标题渲染（不可选）、组内选项缩进类，键盘导航跨组连续', () => {
    const el = mount({ options: GROUPED })
    open(el)
    const groups = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.option-group')]
    expect(groups.map((g) => g.textContent)).toEqual(['温带水果', '热带水果'])
    expect(groups.every((g) => g.getAttribute('role') !== 'option')).toBe(true)
    const list = optionRows(el)
    expect(list.length).toBe(3)
    expect(list.every((r) => r.classList.contains('grouped'))).toBe(true)
    // ↓ 两次到第三项（组标题不占导航位）
    const i = input(el)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(i.getAttribute('aria-activedescendant')).toBe('combobox-option-2')
  })

  // ---- size / status ----

  it('size：data-size 镜像，非法值回落 medium，样式档位规则存在', () => {
    expect(mount().getAttribute('data-size')).toBe('medium')
    expect(mount({ size: 'small' }).getAttribute('data-size')).toBe('small')
    expect(mount({ size: 'large' }).getAttribute('data-size')).toBe('large')
    expect(mount({ size: 'huge' }).getAttribute('data-size')).toBe('medium')
    const css = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-size='small']")
    expect(css).toContain("[data-size='large']")
  })

  it('status：data-status 镜像；error 同步内层 input aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(input(el).getAttribute('aria-invalid')).toBe('true')
    expect(mount({ status: 'warning' }).getAttribute('data-status')).toBe('warning')
    expect(mount({ status: 'success' }).getAttribute('data-status')).toBe('success')
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
    expect(input(el).hasAttribute('aria-invalid')).toBe(false)
    const css = mount().shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-status='error']")
    expect(css).toContain("[data-status='warning']")
    expect(css).toContain("[data-status='success']")
  })

  // ---- el.filter 自定义过滤函数（JS property 通道） ----

  it('el.filter：自定义过滤函数接管本地过滤，置 null 恢复默认', () => {
    const el = mount()
    open(el)
    // 自定义：按 value 前缀过滤（而非 label 子串）
    el.filter = (option, query) => option.value.startsWith(query)
    input(el).value = 'ba'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    expect(optionRows(el).length).toBe(1)
    expect(optionRows(el)[0]!.textContent).toContain('香蕉')
    // 置 null 恢复默认 label 子串过滤
    el.filter = null
    input(el).value = 'ba'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    expect(optionRows(el).length).toBe(0) // label 无「ba」子串 → 无匹配
    expect(el.shadowRoot!.querySelector('[role="status"]')!.textContent).toContain('无匹配选项')
  })

  it('el.filter：filterable="false" 时忽略自定义过滤（不做本地过滤）', () => {
    const el = mount({ filterable: 'false' })
    el.filter = (option, query) => option.value.startsWith(query)
    open(el)
    input(el).value = 'ba'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    expect(optionRows(el).length).toBe(3)
  })

  // ---- 受控 open + oas-open-change ----

  it('受控 open：宿主 setAttribute/removeAttribute 驱动展开收起', () => {
    const el = mount()
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    el.setAttribute('open', '')
    expect(input(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector('.dropdown')!.classList.contains('open')).toBe(true)
    expect(optionRows(el).length).toBe(3)
    el.removeAttribute('open')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('oas-open-change：内部开合与宿主驱动都派发（首帧挂载不派发）', () => {
    const el = mount()
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) =>
      events.push((e as CustomEvent).detail.open),
    )
    // 聚焦展开 → true
    open(el)
    expect(events).toEqual([true])
    expect(el.hasAttribute('open')).toBe(true)
    // 选中关闭 → false（属性同步移除）
    optionRows(el)[1]!.click()
    expect(events).toEqual([true, false])
    expect(el.hasAttribute('open')).toBe(false)
    // Esc / 失焦同样派发
    open(el)
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(events).toEqual([true, false, true, false])
  })

  // ---- readonly ----

  it('readonly：输入只读、聚焦不展开、键盘不展开不选中', () => {
    const el = mount({ readonly: '', value: 'apple' })
    const i = input(el)
    expect(i.readOnly).toBe(true)
    expect(i.value).toBe('苹果')
    i.dispatchEvent(new FocusEvent('focus'))
    expect(i.getAttribute('aria-expanded')).toBe('false')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('apple')
    expect(i.getAttribute('aria-expanded')).toBe('false')
  })

  it('readonly 下显式设置 open 属性不展开（只读优先）', () => {
    const el = mount({ readonly: '' })
    el.setAttribute('open', '')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
  })
})

describe('OASCombobox 虚拟滚动（virtual）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function manyOptions(n: number): string {
    return JSON.stringify(
      Array.from({ length: n }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })),
    )
  }

  function vlistOf(el: OASCombobox): HTMLElement {
    return el.shadowRoot!.querySelector('oas-virtual-list')!
  }

  function virtualRows(el: OASCombobox): HTMLElement[] {
    return [...vlistOf(el).shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
  }

  const flushRaf = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  it('virtual：仅渲染可见窗口 + buffer，非 virtual 全量渲染', () => {
    const el = mount({ virtual: '', options: manyOptions(100) })
    open(el)
    expect(vlistOf(el).hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.listbox')!.hidden).toBe(true)
    const rows = virtualRows(el)
    // 视口 240 / item-height 36 ≈ 7 项 + buffer 4 → 11
    expect(rows.length).toBe(11)
    expect(rows[0]!.getAttribute('data-index')).toBe('0')
    const el2 = mount({ options: manyOptions(100) })
    open(el2)
    expect(vlistOf(el2).hidden).toBe(true)
    expect(el2.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(100)
  })

  it('virtual：键盘导航窗口跟随，aria-activedescendant 保持指向', async () => {
    const el = mount({ virtual: '', options: manyOptions(100) })
    open(el)
    const i = input(el)
    for (let k = 0; k < 25; k++) {
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    }
    expect(i.getAttribute('aria-activedescendant')).toBe('combobox-option-25')
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    expect(vp.scrollTop).toBeGreaterThan(0)
    // happy-dom 不自动触发 scroll：手动派发后窗口重算，高亮项在窗口内
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const activeRow = virtualRows(el).find((r) => r.classList.contains('active'))
    expect(activeRow?.getAttribute('data-index')).toBe('25')
  })

  it('virtual：点击窗口内行选中并写回 value + oas-change', () => {
    const el = mount({ virtual: '', options: manyOptions(100) })
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const row8 = virtualRows(el).find((r) => r.getAttribute('data-index') === '8')!
    row8.click()
    expect(el.getAttribute('value')).toBe('v8')
    expect(detail).toEqual({ value: 'v8' })
    expect(input(el).value).toBe('选项 8')
  })

  it('virtual：过滤后虚拟列表跟随过滤子集', () => {
    const el = mount({ virtual: '', options: manyOptions(100) })
    open(el)
    input(el).value = '选项 5'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    const rows = virtualRows(el)
    // 匹配：选项 5 + 选项 50~59，共 11 项
    expect(rows.length).toBe(11)
    expect(rows.every((r) => r.textContent!.includes('选项 5'))).toBe(true)
  })

  it('virtual + 分组：带 group 的选项回退全量渲染（组标题保留）', () => {
    const grouped = JSON.stringify(
      Array.from({ length: 20 }, (_, i) => ({
        group: i < 10 ? 'A 组' : 'B 组',
        label: `选项 ${i}`,
        value: `v${i}`,
      })),
    )
    const el = mount({ virtual: '', options: grouped })
    open(el)
    expect(vlistOf(el).hidden).toBe(true)
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(20)
    expect(el.shadowRoot!.querySelectorAll('.option-group').length).toBe(2)
  })

  it('virtual：受控 value 预选展开时窗口滚到选中项', async () => {
    const el = mount({ virtual: '', options: manyOptions(100), value: 'v40' })
    open(el)
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const rows = virtualRows(el)
    const sel = rows.find((r) => r.getAttribute('aria-selected') === 'true')
    expect(sel?.getAttribute('data-index')).toBe('40')
  })
})
