import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSelect } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

function mount(attrs: Record<string, string> = {}): OASSelect {
  const el = new OASSelect()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASSelect): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function open(el: OASSelect): void {
  trigger(el).click()
}

describe('OASSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger，未选择显示 placeholder，含 combobox 角色', async () => {
    const el = mount({ placeholder: '请选择' })
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    expect(trigger(el).textContent).toContain('请选择')
  })

  it('value 匹配时显示选项 label', () => {
    const el = mount({ value: 'banana' })
    expect(trigger(el).textContent).toContain('香蕉')
  })

  it('点击展开下拉，aria-expanded 同步', () => {
    const el = mount()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    const listbox = el.shadowRoot!.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox!.querySelectorAll('[role="option"]').length).toBe(3)
  })

  it('选择选项后更新 value 并关闭下拉，派发 oas-change', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(options[1] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('banana')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(detail).toEqual({ value: 'banana' })
  })

  it('Esc 关闭下拉', () => {
    const el = mount()
    open(el)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('多选：multiple 时选择叠加，chip 显示选中项', () => {
    const el = mount({ multiple: '' })
    open(el)
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(options[0] as HTMLElement).click()
    ;(options[1] as HTMLElement).click()
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value).toEqual(['apple', 'banana'])
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(2)
  })

  it('回归：多选 chip 渲染 label + 移除按钮（button ×），样式含固定高度与间距', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana']) })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip')]
    expect(chips.length).toBe(2)
    const chip = chips[0]!
    const label = chip.children[0] as HTMLElement
    const rm = chip.children[1] as HTMLButtonElement
    expect(label.textContent).toBe('苹果')
    expect(rm.textContent).toBe('×')
    expect(rm.getAttribute('aria-label')).toBeTruthy()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const chipRule = style.match(/\.chip\s*\{[^}]*\}/)?.[0] ?? ''
    expect(chipRule).toContain('box-sizing: border-box')
    expect(chipRule).toContain('height: 20px')
    expect(chipRule).toContain('gap: var(--oas-space-1)')
  })

  it('回归：多选 chip 移除按钮可点击移除对应值', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana']) })
    el.shadowRoot!.querySelector<HTMLButtonElement>('.chip button')!.click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['banana'])
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(1)
  })

  it('disabled 时 trigger 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })

  it('属性变化增量更新：改 options 或 value 即时反映', () => {
    const el = mount()
    const btn = trigger(el)
    el.setAttribute('value', 'orange')
    expect(trigger(el)).toBe(btn)
    expect(trigger(el).textContent).toContain('橙子')
  })

  it('searchable：显示搜索框，输入过滤选项', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    expect(searchInput.hidden).toBe(false)
    searchInput.value = '香'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    const options = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(options.length).toBe(1)
    expect(options[0]!.textContent).toContain('香蕉')
  })

  it('searchable：无匹配时显示空态', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '不存在的'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.textContent).toContain('无匹配选项')
  })

  it('分组：渲染组标题（不可选），组内选项缩进，键盘导航跨组连续', () => {
    const grouped = JSON.stringify([
      { group: '温带水果', label: '苹果', value: 'apple' },
      { group: '温带水果', label: '香蕉', value: 'banana' },
      { group: '热带水果', label: '橙子', value: 'orange' },
      { group: '热带水果', label: '芒果', value: 'mango' },
    ])
    const el = mount({ options: grouped })
    open(el)
    const headers = [...el.shadowRoot!.querySelectorAll('.option-group')].map((h) => h.textContent)
    expect(headers).toEqual(['温带水果', '热带水果'])
    // 组标题不可选：仅可选项具备 role="option"，且组内选项有缩进标记
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(4)
    expect(el.shadowRoot!.querySelectorAll('.option.grouped').length).toBe(4)
    // 从第一组最后一项跨到第二组第一项
    const btn = trigger(el)
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const active = el.shadowRoot!.querySelector('.option.active')!
    expect(active.textContent).toContain('橙子')
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

  it('remote：loading 时下拉显示加载占位', () => {
    const el = mount({ remote: '', searchable: '' })
    open(el)
    el.setAttribute('loading', '')
    expect(el.shadowRoot!.textContent).toContain('加载中…')
  })

  it('remote：本地不过滤选项，输入派发 oas-input 供宿主请求', () => {
    const el = mount({ remote: '', searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    let inputDetail: unknown
    el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
    // 关键词在本地下拉中不存在，但 remote 不做本地过滤，全部选项仍渲染
    searchInput.value = '不存在的'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(3)
    expect(inputDetail).toEqual({ value: '不存在的' })
  })

  it('max-tag-count：多选超过数量折叠为 +N', () => {
    const el = mount({
      multiple: '',
      'max-tag-count': '2',
      value: JSON.stringify(['apple', 'banana', 'orange']),
    })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip')]
    expect(chips.length).toBe(3)
    expect(chips[2]!.textContent).toBe('+1')
  })

  it('默认：无 max-tag-count 时多标签不折叠（value 容器 wrap、无 +N chip）', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana', 'orange']) })
    // 全部标签原样渲染，不出现折叠计数 chip
    const chips = [...el.shadowRoot!.querySelectorAll('.chip')]
    expect(chips.length).toBe(3)
    expect(el.shadowRoot!.querySelectorAll('.chip-plus').length).toBe(0)
    // value 容器为换行模式，且没有单行 overflow 裁剪
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const valueRule = style.match(/\.value\s*\{[^}]*\}/)?.[0] ?? ''
    expect(valueRule).toContain('flex-wrap: wrap')
    expect(valueRule).not.toContain('overflow: hidden')
    // 折叠模式（nowrap + overflow hidden）仅绑定到显式设置 max-tag-count 的宿主
    const collapseRule = style.match(/:host\(\[max-tag-count\]\)\s*\.value\s*\{[^}]*\}/)?.[0] ?? ''
    expect(collapseRule).toContain('flex-wrap: nowrap')
    expect(collapseRule).toContain('overflow: hidden')
  })

  it('动态加 max-tag-count：从换行模式切换为折叠模式，+N 出现', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana', 'orange']) })
    expect(el.shadowRoot!.querySelectorAll('.chip-plus').length).toBe(0)
    el.setAttribute('max-tag-count', '2')
    const chips = [...el.shadowRoot!.querySelectorAll('.chip')]
    expect(chips.length).toBe(3)
    expect(chips[2]!.textContent).toBe('+1')
  })

  it('allow-create：无匹配时显示「创建 xxx」项，点击创建并纳入选中', () => {
    const el = mount({ 'allow-create': '', searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '火龙果'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    const createRow = el.shadowRoot!.querySelector<HTMLElement>('.create-option')!
    expect(createRow.textContent).toContain('创建 火龙果')
    let changeDetail: unknown
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    createRow.click()
    expect(el.getAttribute('value')).toBe('火龙果')
    expect(trigger(el).textContent).toContain('火龙果')
    expect(changeDetail).toEqual({ value: '火龙果' })
  })

  it('allow-create：键盘 Enter 创建新选项', () => {
    const el = mount({ 'allow-create': '', searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '奇异果'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('奇异果')
  })

  it('键盘：展开态按 Enter 选中高亮项（回归：此前 Enter 分支为死代码）', () => {
    const el = mount()
    open(el)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('banana')
  })

  it('键盘：搜索框内 ↑/↓ 移动高亮', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const active = el.shadowRoot!.querySelector('.option.active')!
    expect(active.textContent).toContain('香蕉')
  })
})

describe('OASSelect 声明式数据通道与真水合', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('property 赋值优先：options setter 单向反射 attribute，getter 返回解析数组', () => {
    const el = new OASSelect()
    document.body.appendChild(el)
    const options = [
      { label: '苹果', value: 'apple' },
      { label: '香蕉', value: 'banana' },
    ]
    el.options = options
    // setter 反射 attribute（attribute 为唯一权威数据源，无回写循环）
    expect(el.getAttribute('options')).toBe(JSON.stringify(options))
    expect(el.options).toEqual(options)
    // 触发渲染：打开下拉可见选项
    open(el)
    const optionRows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(optionRows.length).toBe(2)
    expect(optionRows[0]!.textContent).toContain('苹果')
  })

  it('属性变化驱动重渲染：setAttribute options 后选项即时更新', () => {
    const el = mount()
    el.setAttribute('options', JSON.stringify([{ label: '葡萄', value: 'grape' }]))
    open(el)
    const optionRows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(optionRows.length).toBe(1)
    expect(optionRows[0]!.textContent).toContain('葡萄')
  })

  it('非法 JSON 容错：options 非 JSON 时无选项，不抛错', () => {
    const el = new OASSelect()
    el.setAttribute('options', '[{bad json')
    document.body.appendChild(el)
    open(el)
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(0)
    expect(trigger(el).textContent).toContain('请选择')
  })

  it('真水合：DSD 快照存在时 hydrate 接管，shadow 不重建（style 引用保持）、交互完整恢复', () => {
    // 模拟浏览器 DSD upgrade：构造器 attachShadow 后注入「SSR 快照 + 指纹 meta」
    const snap = new OASSelect()
    snap.shadowRoot!.innerHTML = `
      <meta data-oas-ssr="oas-select" data-oas-ssr-v="1">
      <style>.probe-style { color: red; }</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox"
          aria-haspopup="listbox" aria-expanded="false">
          <span class="value" part="value"></span>
          <span class="clear-btn" part="clear" role="button" tabindex="-1" hidden aria-label=""></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false"></svg>
        </button>
        <div class="dropdown" part="dropdown">
          <input class="search-input" part="search-input" type="text" hidden />
          <div class="listbox" part="listbox" role="listbox"></div>
          <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
        </div>
      </div>`
    const styleSnap = snap.shadowRoot!.querySelector('style')!
    snap.setAttribute('options', OPTIONS)
    document.body.appendChild(snap) // connectedCallback → tryHydrate
    // hydrate 接管：style 引用保持同一对象（shadow 未重建）
    expect(snap.shadowRoot!.querySelector('style')).toBe(styleSnap)
    // 指纹 meta 已移除
    expect(snap.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    // 交互完整恢复：点击展开 + 选中选项派发 oas-change
    open(snap)
    expect(trigger(snap).getAttribute('aria-expanded')).toBe('true')
    let changeDetail: unknown
    snap.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    const rows = snap.shadowRoot!.querySelectorAll('[role="option"]')
    ;(rows[1] as HTMLElement).click()
    expect(snap.getAttribute('value')).toBe('banana')
    expect(changeDetail).toEqual({ value: 'banana' })
  })

  it('真水合回退：快照缺关键结构时回退 render 全量重建，功能仍正常', () => {
    const snap = new OASSelect()
    // 指纹命中但结构不完整（无 .trigger）→ hydrate 返回 false → render 重建
    snap.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-select" data-oas-ssr-v="1"><span>broken</span>'
    snap.setAttribute('options', OPTIONS)
    document.body.appendChild(snap)
    expect(snap.shadowRoot!.querySelector('.trigger')).not.toBeNull()
    expect(snap.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    open(snap)
    expect(snap.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(3)
  })
})

describe('OASSelect focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 trigger', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(
      el.shadowRoot!.querySelector('button[part="trigger"]'),
    )
  })
})

describe('OASSelect 自定义选项渲染（template slot + 渲染事件）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('template[slot="option"] 克隆到选项行，data-option-label 绑定 label', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'option')
    tpl.innerHTML = '<span class="opt-icon">🍎</span><span data-option-label></span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    open(el)
    const first = el.shadowRoot!.querySelector('[role="option"]')!
    expect(first.querySelector('.opt-icon')).not.toBeNull()
    expect(first.querySelector('[data-option-label]')!.textContent).toBe('苹果')
  })

  it('oas-option-render 派发 { index, option, element }，宿主可改写选项内容', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    const seen: Array<{ index: number; value: string }> = []
    el.addEventListener('oas-option-render', (e: Event) => {
      const d = (e as CustomEvent).detail
      seen.push({ index: d.index, value: d.option.value })
      d.element.innerHTML = ''
      d.element.textContent = `⭐ ${d.option.label}`
    })
    document.body.appendChild(el)
    open(el)
    // 每次渲染窗口都会派发（挂载渲染 + 展开后重渲染）；内容按 option 绑定
    expect(seen.some((s) => s.index === 0 && s.value === 'apple')).toBe(true)
    expect(seen.some((s) => s.index === 1 && s.value === 'banana')).toBe(true)
    expect(seen.some((s) => s.index === 2 && s.value === 'orange')).toBe(true)
    expect(el.shadowRoot!.querySelector('[role="option"]')!.textContent).toContain('⭐ 苹果')
  })

  it('template[slot="tag"] 克隆到多选 chip，data-tag-label 绑定 label', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    el.setAttribute('multiple', '')
    el.setAttribute('value', JSON.stringify(['apple', 'banana']))
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'tag')
    tpl.innerHTML = '<span class="tag-ic">#</span><span data-tag-label></span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    const chip = el.shadowRoot!.querySelector('.chip')!
    expect(chip.querySelector('.tag-ic')).not.toBeNull()
    expect(chip.querySelector('[data-tag-label]')!.textContent).toBe('苹果')
  })

  it('oas-tag-render 派发 { value, label, element }，宿主可改写标签内容', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    el.setAttribute('multiple', '')
    el.setAttribute('value', JSON.stringify(['apple']))
    const seen: Array<{ value: string; label: string }> = []
    el.addEventListener('oas-tag-render', (e: Event) => {
      const d = (e as CustomEvent).detail
      seen.push({ value: d.value, label: d.label })
      d.element.innerHTML = ''
      d.element.textContent = `🏷 ${d.label}`
    })
    document.body.appendChild(el)
    expect(seen[0]).toEqual({ value: 'apple', label: '苹果' })
    expect(el.shadowRoot!.querySelector('.chip')!.textContent).toContain('🏷 苹果')
  })
})

describe('OASSelect 虚拟滚动（virtual）', () => {
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

  function vlistOf(el: OASSelect): HTMLElement {
    return el.shadowRoot!.querySelector('oas-virtual-list')!
  }

  function virtualRows(el: OASSelect): HTMLElement[] {
    return [...vlistOf(el).shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
  }

  const flushRaf = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  it('virtual：仅渲染可见窗口 + buffer，不渲染全量；非 virtual 全量渲染', () => {
    const el = mount({ virtual: '', options: manyOptions(100) })
    open(el)
    const rows = virtualRows(el)
    // 视口 240 / item-height 36 ≈ 7 项 + 上下 buffer 4 → start 0, end ceil(240/36)+4=11
    expect(rows.length).toBe(11)
    expect(rows[0]!.getAttribute('data-index')).toBe('0')
    // 非虚拟：全量渲染
    const el2 = mount({ options: manyOptions(100) })
    open(el2)
    expect(el2.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(100)
  })

  it('virtual：滚动后窗口平移，padding 撑起滚动高度', async () => {
    const el = mount({ virtual: '', options: manyOptions(1000) })
    open(el)
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    vp.scrollTop = 3600
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const rows = virtualRows(el)
    expect(rows.length).toBe(15) // 96..110
    expect(rows[0]!.getAttribute('data-index')).toBe('96')
    const pads = vlistOf(el).shadowRoot!.querySelectorAll('.padding')
    expect((pads[0] as HTMLElement).style.height).toBe('3456px') // 96 * 36
  })

  it('virtual：键盘导航滚动窗口使高亮可见，aria-activedescendant 跟随', async () => {
    const el = mount({ virtual: '', options: manyOptions(100) })
    open(el)
    const btn = trigger(el)
    for (let i = 0; i < 25; i++) {
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    }
    expect(btn.getAttribute('aria-activedescendant')).toBe('opt-25')
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    expect(vp.scrollTop).toBeGreaterThan(0)
    // happy-dom 不自动触发 scroll：手动派发后窗口重算，高亮项应在窗口内
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const rows = virtualRows(el)
    const activeRow = rows.find((r) => r.classList.contains('active'))
    expect(activeRow?.getAttribute('data-index')).toBe('25')
    expect(activeRow?.getAttribute('aria-selected')).toBe('false')
  })

  it('virtual：受控 value 同步 aria-selected；点击非受控写回 value + oas-change', () => {
    const el = mount({ virtual: '', options: manyOptions(100), value: 'v5' })
    open(el)
    expect(trigger(el).getAttribute('aria-activedescendant')).toBe('opt-5')
    // 受控：外部改 value → 选中项 aria-selected 同步
    el.setAttribute('value', 'v7')
    const sel = virtualRows(el).filter((r) => r.getAttribute('aria-selected') === 'true')
    expect(sel.length).toBe(1)
    expect(sel[0]!.getAttribute('data-index')).toBe('7')
    // 非受控：点击选中 → 写回 value + 派发 oas-change
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const row8 = virtualRows(el).find((r) => r.getAttribute('data-index') === '8')
    ;(row8 as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('v8')
    expect(detail).toEqual({ value: 'v8' })
  })

  it('virtual：searchable 过滤后虚拟列表跟随过滤子集', () => {
    const el = mount({ virtual: '', searchable: '', options: manyOptions(100) })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '选项 5'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    const rows = virtualRows(el)
    // 匹配：选项 5 + 选项 50~59，共 11 项，窗口全量渲染
    expect(rows.length).toBe(11)
    expect(rows.every((r) => r.textContent!.includes('选项 5'))).toBe(true)
  })

  it('virtual：无匹配时回退直接渲染（allow-create 创建行可交互）', () => {
    const el = mount({
      virtual: '',
      'allow-create': '',
      searchable: '',
      options: manyOptions(100),
    })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '不存在项'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(vlistOf(el).hidden).toBe(true)
    const createRow = el.shadowRoot!.querySelector<HTMLElement>('.create-option')!
    expect(createRow).not.toBeNull()
    createRow.click()
    expect(el.getAttribute('value')).toBe('不存在项')
  })

  it('virtual + 分组：带 group 的选项回退非虚拟全量渲染（组标题保留）', () => {
    const grouped = JSON.stringify([
      { group: '温带', label: '苹果', value: 'apple' },
      { group: '温带', label: '梨', value: 'pear' },
      { group: '热带', label: '香蕉', value: 'banana' },
    ])
    const el = mount({ virtual: '', options: grouped })
    open(el)
    expect(el.shadowRoot!.querySelectorAll('.option-group').length).toBe(2)
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(3)
    expect(vlistOf(el).hidden).toBe(true)
  })
})
