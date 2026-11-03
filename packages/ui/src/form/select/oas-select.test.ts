import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { registerIcon } from '@oas-ui/icons/runtime'
import { OASSelect } from './index.js'
import '../../framework/config-provider/index.js'

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
    expect(listbox!.querySelectorAll('[role="option"]').length).toBe(3)
  })

  it('下拉 fixed 定位：逃出祖先 overflow 容器，不再贡献溢出逼出滚动条（与 combobox 同思路）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.dropdown\s*\{[^}]*position:\s*fixed/)
    open(el)
    // positionDropdown 锚定 trigger 写入定位（happy-dom 无布局、矩形为 0，仍应设置而不抛错）
    const d = el.shadowRoot!.querySelector<HTMLElement>('.dropdown')!
    expect(typeof d.style.top).toBe('string')
    expect(typeof d.style.left).toBe('string')
    expect(d.style.minWidth).not.toBe('')
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
    expect(detail).toEqual({ value: 'banana', option: { label: '香蕉', value: 'banana' } })
  })

  // 协作缺陷回归：oas-modal 的 dialog 会 stopPropagation 拦截 click 冒泡，
  // 浮层 outside-close 必须用 document capture 监听（capture 在 bubble 拦截前触发），
  // 否则 modal 内 select 点击外部永不关闭（实测：分类下拉点面板外不收）
  it('宿主容器拦截 click 冒泡时（modal dialog 场景），点击外部仍关闭下拉', async () => {
    const host = document.createElement('div')
    host.addEventListener('click', (e) => e.stopPropagation())
    document.body.appendChild(host)
    const el = mount()
    host.appendChild(el)
    await Promise.resolve()
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    // 点击宿主内、组件外——bubble 被宿主拦截，document capture 监听应仍收到并关闭
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
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
    expect(rm.getAttribute('aria-label')).toBe('移除 苹果')
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
    expect(changeDetail).toEqual({ value: '', option: null })
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
    expect(inputDetail).toEqual({ value: '不存在的', source: 'search' })
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

  it('负值/非法值钳制：max-tag-count="-1" 视为未设置（不折叠，与 cascader/combobox 同口径）', () => {
    const el = mount({ multiple: '', 'max-tag-count': '-1', value: JSON.stringify(['apple', 'banana', 'orange']) })
    expect(el.shadowRoot!.querySelectorAll('.chip-plus').length).toBe(0)
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
    // allow-create 的 option 已在创建时纳入 _options，detail 携带完整对象
    expect(changeDetail).toEqual({ value: '火龙果', option: { label: '火龙果', value: '火龙果' } })
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

  it('回归：allow-create 创建项持久（源数据每轮重解析不丢失，重开下拉仍可见）', () => {
    const el = mount({ 'allow-create': '', searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '火龙果'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    el.shadowRoot!.querySelector<HTMLElement>('.create-option')!.click()
    expect(el.getAttribute('value')).toBe('火龙果')
    // 触发一轮源重解析（属性变化 → update → parseOptions），创建项不应被源数据抹掉
    el.setAttribute('placeholder', '再触发一轮更新')
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows.some((r) => r.textContent!.includes('火龙果'))).toBe(true)
    expect(trigger(el).textContent).toContain('火龙果')
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
    expect(changeDetail).toEqual({ value: 'banana', option: { label: '香蕉', value: 'banana' } })
  })

  it('真水合回退：快照缺关键结构时回退 render 全量重建，功能仍正常', () => {
    const snap = new OASSelect()
    // 指纹命中但结构不完整（无 .trigger）→ hydrate 返回 false → render 重建
    snap.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-select" data-oas-ssr-v="1"><span>broken</span>'
    snap.setAttribute('options', OPTIONS)
    document.body.appendChild(snap)
    expect(snap.shadowRoot!.querySelectorAll('.trigger').length).toBe(1)
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
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('button[part="trigger"]'))
  })
})

describe('OASSelect Option.icon 数据通道', () => {
  const ICON_OPTIONS = JSON.stringify([
    { label: '苹果', value: 'apple', icon: 'select-option-apple' },
    { label: '香蕉', value: 'banana', icon: 'select-option-banana' },
  ])

  beforeEach(() => {
    document.body.innerHTML = ''
    registerIcon('select-option-apple', '<path d="M1 1 L15 15"/>')
    registerIcon('select-option-banana', '<path d="M2 2 L14 14"/>')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('options JSON 的 icon 渲染为下拉项 leading SVG 与单选触发器图标，装饰性不进可访问名', () => {
    const el = mount({ value: 'apple', options: ICON_OPTIONS })
    open(el)
    const icon = el.shadowRoot!.querySelector<HTMLElement>('[role="option"] .option-icon')
    expect(!!icon, '下拉项应渲染 Option.icon').toBe(true)
    expect(icon!.classList.contains('option-icon')).toBe(true)
    expect(icon!.getAttribute('aria-hidden')).toBe('true')
    expect(icon!.querySelector('svg path')!.getAttribute('d')).toBe('M1 1 L15 15')
    expect(icon!.querySelector('[data-option-label]')).toBeNull()

    const valueIcon = trigger(el).querySelector<HTMLElement>('.value-icon')
    expect(!!valueIcon, '单选触发器应渲染选中项 icon').toBe(true)
    expect(valueIcon!.classList.contains('value-icon')).toBe(true)
    expect(valueIcon!.getAttribute('aria-hidden')).toBe('true')
    expect(valueIcon!.querySelector('svg path')!.getAttribute('d')).toBe('M1 1 L15 15')
  })

  it('multiple chip 渲染选中项 icon，移除按钮仍保留', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana']), options: ICON_OPTIONS })
    const chips = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.chip')]
    expect(chips.length).toBe(2)
    expect(chips.every((chip) => chip.querySelector<HTMLElement>('.chip-icon')?.querySelector('svg'))).toBe(true)
    expect(chips.every((chip) => chip.querySelector('.chip-icon')!.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(chips.every((chip) => chip.querySelector('button[aria-label]'))).toBe(true)
  })

  it('未知 icon 回退纯文本并仅 devWarn 一次', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({
      options: JSON.stringify([{ label: '缺失', value: 'missing', icon: 'select-option-icon-missing-e2e' }]),
    })
    open(el)
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(el.shadowRoot!.querySelector('[role="option"] .option-icon')).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('select-option-icon-missing-e2e')
    warn.mockRestore()
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
    expect(first.querySelectorAll('.opt-icon').length).toBe(1)
    expect(first.querySelector('[data-option-label]')!.textContent).toBe('苹果')
  })

  it('Option.icon 与 option 模板并存：内置 leading icon + 模板 label 内容', () => {
    registerIcon('select-template-option-icon', '<path d="M1 1 L15 15"/>')
    const el = new OASSelect()
    el.setAttribute('options', JSON.stringify([{ label: '苹果', value: 'apple', icon: 'select-template-option-icon' }]))
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'option')
    tpl.innerHTML = '<span class="opt-custom">自定义：</span><span data-option-label></span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    open(el)
    const row = el.shadowRoot!.querySelector('[role="option"]')!
    expect(row.querySelector('.option-icon svg path')!.getAttribute('d')).toBe('M1 1 L15 15')
    expect(row.querySelector('.opt-custom')!.textContent).toBe('自定义：')
    expect(row.querySelector('[data-option-label]')!.textContent).toBe('苹果')
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
    expect(chip.querySelectorAll('.tag-ic').length).toBe(1)
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
    return JSON.stringify(Array.from({ length: n }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })))
  }

  function vlistOf(el: OASSelect): HTMLElement {
    return el.shadowRoot!.querySelector('oas-virtual-list')!
  }

  function virtualRows(el: OASSelect): HTMLElement[] {
    return [...vlistOf(el).shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
  }

  const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

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
    expect(vp.scrollTop).toBe(696)
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
    expect(detail).toEqual({ value: 'v8', option: { label: '选项 8', value: 'v8' } })
  })

  it('virtual：Option.icon 在虚拟行内同一渲染', () => {
    registerIcon('select-virtual-first', '<path d="M1 1 L15 15"/>')
    const options = JSON.stringify([
      { label: '带图标', value: 'first', icon: 'select-virtual-first' },
      { label: '普通', value: 'second' },
    ])
    const el = mount({ virtual: '', options })
    open(el)
    const rows = virtualRows(el)
    expect(rows[0]!.querySelector('.option-icon svg path')!.getAttribute('d')).toBe('M1 1 L15 15')
    expect(rows[1]!.querySelector('.option-icon')).toBeNull()
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

describe('OASSelect 子元素声明式通道（oas-option）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 以 oas-option 子元素构建 select（子元素通道），opts: [value, label, extraAttrs?] */
  function childSelect(
    opts: Array<[string, string, Record<string, string>?]>,
    hostAttrs: Record<string, string> = {},
  ): OASSelect {
    const el = new OASSelect()
    for (const [k, v] of Object.entries(hostAttrs)) el.setAttribute(k, v)
    for (const [value, label, attrs] of opts) {
      const opt = document.createElement('oas-option')
      opt.setAttribute('value', value)
      opt.textContent = label
      for (const [k, v] of Object.entries(attrs ?? {})) opt.setAttribute(k, v)
      el.appendChild(opt)
    }
    document.body.appendChild(el)
    return el
  }

  function vlistOf(el: OASSelect): HTMLElement {
    return el.shadowRoot!.querySelector('oas-virtual-list')!
  }

  it('基础：oas-option 混排（含 group 分组标题）解析渲染，打开下拉选项齐全', () => {
    const el = childSelect([
      ['apple', '苹果', { group: '温带水果' }],
      ['banana', '香蕉', { group: '温带水果' }],
      ['orange', '橙子', { group: '热带水果' }],
      ['other', '其他'],
    ])
    open(el)
    const headers = [...el.shadowRoot!.querySelectorAll('.option-group')].map((h) => h.textContent)
    expect(headers).toEqual(['温带水果', '热带水果'])
    // 组标题不可选（无 role=option），组内选项缩进
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(4)
    expect(el.shadowRoot!.querySelectorAll('.option.grouped').length).toBe(3)
    expect(trigger(el).textContent).toContain('请选择')
  })

  it('options 显式优先：options 属性并存时子元素被忽略', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    const opt = document.createElement('oas-option')
    opt.setAttribute('value', 'child-only')
    opt.textContent = '子元素独有'
    el.appendChild(opt)
    document.body.appendChild(el)
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows.length).toBe(3)
    expect(rows.every((r) => !r.textContent!.includes('子元素独有'))).toBe(true)
  })

  it('属性映射：disabled 拦截选择，aria-disabled 同步', () => {
    const el = childSelect([
      ['apple', '苹果'],
      ['banana', '香蕉', { disabled: '' }],
    ])
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows[1]!.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    ;(rows[1] as HTMLElement).click()
    expect(fired).toBe(0)
    expect(el.getAttribute('value')).toBeNull()
  })

  it('属性映射：icon 进入数据模型，运行时改写属性后下拉同步刷新', async () => {
    registerIcon('select-child-apple', '<path d="M1 1 L15 15"/>')
    registerIcon('select-child-banana', '<path d="M2 2 L14 14"/>')
    const el = childSelect([['apple', '苹果', { icon: 'select-child-apple' }]])
    open(el)
    expect(el.shadowRoot!.querySelector('[role="option"] .option-icon svg path')!.getAttribute('d')).toBe('M1 1 L15 15')
    const opt = el.querySelector('oas-option')!
    opt.setAttribute('icon', 'select-child-banana')
    await new Promise((r) => setTimeout(r, 0))
    const icon = el.shadowRoot!.querySelector<HTMLElement>('[role="option"] .option-icon svg path')
    expect(icon!.getAttribute('d')).toBe('M2 2 L14 14')
  })

  it('MutationObserver：运行时 append oas-option 后下拉刷新', async () => {
    const el = childSelect([['apple', '苹果']])
    open(el)
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(1)
    const opt = document.createElement('oas-option')
    opt.setAttribute('value', 'grape')
    opt.textContent = '葡萄'
    el.appendChild(opt)
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(2)
    expect(el.shadowRoot!.textContent).toContain('葡萄')
  })

  it('选中/事件：点选子元素通道项派发 oas-change，detail 与 options 通道一致', () => {
    const el = childSelect([
      ['apple', '苹果'],
      ['banana', '香蕉'],
      ['orange', '橙子'],
    ])
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    ;(rows[1] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('banana')
    expect(trigger(el).textContent).toContain('香蕉')
    expect(detail).toEqual({ value: 'banana', option: { label: '香蕉', value: 'banana' } })
    // 多选：detail 为数组 + options 携带完整对象，与 options 通道一致
    const el2 = childSelect(
      [
        ['apple', '苹果'],
        ['banana', '香蕉'],
      ],
      { multiple: '' },
    )
    open(el2)
    let multiDetail: unknown
    el2.addEventListener('oas-change', (e: Event) => (multiDetail = (e as CustomEvent).detail))
    const rows2 = [...el2.shadowRoot!.querySelectorAll('[role="option"]')]
    ;(rows2[0] as HTMLElement).click()
    ;(rows2[1] as HTMLElement).click()
    expect(multiDetail).toEqual({
      value: ['apple', 'banana'],
      options: [
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana' },
      ],
    })
  })

  it('虚拟滚动模式与子元素通道共存：数据入口在收敛点之前，两路径均吃到子元素数据', () => {
    const el = childSelect(
      [
        ['apple', '苹果'],
        ['banana', '香蕉'],
      ],
      { virtual: '' },
    )
    open(el)
    // 虚拟路径：vlist 可见且窗口行渲染（非虚拟 listbox 隐藏）
    const vlist = vlistOf(el)
    expect(vlist.hidden).toBe(false)
    const rows = [...vlist.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(rows.length).toBe(2)
    expect(rows[0]!.textContent).toContain('苹果')
  })
})

describe('OASSelect 全局禁用注入（config-provider disabled）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('provider disabled：select trigger 无显式 disabled 时继承禁用', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    cp.appendChild(el)
    document.body.appendChild(cp)

    expect(trigger(el).disabled).toBe(true)
  })

  it('provider disabled + disabled-skip：trigger 保持可用', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    el.setAttribute('disabled-skip', '')
    cp.appendChild(el)
    document.body.appendChild(cp)

    expect(trigger(el).disabled).toBe(false)
  })

  it('provider disabled 时点击 trigger 不展开下拉', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    cp.appendChild(el)
    document.body.appendChild(cp)

    open(el)
    const dropdown = el.shadowRoot!.querySelector<HTMLElement>('.dropdown')!
    expect(dropdown.classList.contains('open')).toBe(false)
  })
})

describe('OASSelect 尺寸与校验态（size / status）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('新属性进入 observedAttributes', () => {
    expect(OASSelect.observedAttributes).toEqual(
      expect.arrayContaining(['size', 'status', 'open', 'max-count', 'placement', 'readonly', 'debounce']),
    )
  })

  it('size 默认 medium（data-size 镜像）', () => {
    const el = mount()
    expect(el.getAttribute('data-size')).toBe('medium')
  })

  it('size=small/large 镜像 data-size，非法值回落 medium', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'large')
    expect(el.getAttribute('data-size')).toBe('large')
    el.setAttribute('size', 'huge')
    expect(el.getAttribute('data-size')).toBe('medium')
  })

  it('size 就近读取 config-provider 注入（与全局密度联动）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'small')
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    cp.appendChild(el)
    document.body.appendChild(cp)
    expect(el.getAttribute('data-size')).toBe('small')
  })

  it('size 样式规则存在（small/large 控高 token + chip 联动）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-size='small']")
    expect(css).toContain("[data-size='large']")
    expect(css).toContain('var(--oas-control-height-sm)')
    expect(css).toContain('var(--oas-control-height-lg)')
  })

  it('status=error：data-status 镜像 + 宿主标 aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(el.getAttribute('aria-invalid')).toBe('true')
  })

  it('status=warning/success：镜像 data-status，不标 aria-invalid', () => {
    const warn = mount({ status: 'warning' })
    expect(warn.getAttribute('data-status')).toBe('warning')
    expect(warn.hasAttribute('aria-invalid')).toBe(false)
    const ok = mount({ status: 'success' })
    expect(ok.getAttribute('data-status')).toBe('success')
    expect(ok.hasAttribute('aria-invalid')).toBe(false)
  })

  it('移除 status 后镜像与 aria-invalid 清理', () => {
    const el = mount({ status: 'error' })
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
    expect(el.hasAttribute('aria-invalid')).toBe(false)
  })

  it('宿主自带 aria-invalid 时移除 status 不误删宿主的 aria-invalid（所有权分离）', () => {
    const el = mount({ 'aria-invalid': 'true' })
    expect(el.hasAttribute('aria-invalid')).toBe(true)
    el.setAttribute('status', 'error')
    el.removeAttribute('status')
    // aria-invalid 由宿主设置，status 不拥有所有权，清理不动它
    expect(el.getAttribute('aria-invalid')).toBe('true')
  })

  it('status 样式规则存在（error/warning/success）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-status='error']")
    expect(css).toContain("[data-status='warning']")
    expect(css).toContain("[data-status='success']")
  })
})

describe('OASSelect 下拉头尾与空态插槽（header / footer / empty）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('template[slot="header"] 克隆进下拉头部（搜索框之下、选项之上），无模板时容器隐藏', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'header')
    tpl.innerHTML = '<label class="hdr"><input type="checkbox" />全选</label>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    open(el)
    const header = el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!
    expect(header.hidden).toBe(false)
    expect(header.querySelectorAll('.hdr').length).toBe(1)
    // 位置：搜索框（searchable 时）与选项列表之间
    el.setAttribute('searchable', '')
    const dropdown = el.shadowRoot!.querySelector('.dropdown')!
    const children = [...dropdown.children].map((c) => c.className || c.tagName)
    expect(children.indexOf('search-input')).toBeLessThan(children.indexOf('dropdown-header'))
    expect(children.indexOf('dropdown-header')).toBeLessThan(children.indexOf('listbox'))
  })

  it('template[slot="footer"] 克隆进下拉尾部', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'footer')
    tpl.innerHTML = '<button class="ftr-add" type="button">创建团队</button>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    open(el)
    const footer = el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!
    expect(footer.hidden).toBe(false)
    expect(footer.querySelectorAll('.ftr-add').length).toBe(1)
    const dropdown = el.shadowRoot!.querySelector('.dropdown')!
    const children = [...dropdown.children].map((c) => c.className || c.tagName)
    expect(children.indexOf('vlist')).toBeLessThan(children.indexOf('dropdown-footer'))
  })

  it('无模板时 header/footer 容器隐藏（不占位）', () => {
    const el = mount()
    open(el)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="footer"]')!.hidden).toBe(true)
  })

  it('动态移除模板 → 头尾容器回到隐藏（MutationObserver 通道）', async () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'header')
    tpl.innerHTML = '<span class="hdr">头部</span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    open(el)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!.hidden).toBe(false)
    tpl.remove()
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="header"]')!.hidden).toBe(true)
  })

  it('template[slot="empty"] 覆盖默认空态与无匹配文案', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    el.setAttribute('searchable', '')
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'empty')
    tpl.innerHTML = '<span class="custom-empty">没有找到任何水果</span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    open(el)
    // 空选项：自定义空态替代「暂无数据」
    el.setAttribute('options', '[]')
    expect(el.shadowRoot!.querySelectorAll('.custom-empty').length).toBe(1)
    // 搜索无匹配：自定义空态替代「无匹配选项」
    el.setAttribute('options', OPTIONS)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = '不存在的'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('.custom-empty').length).toBe(1)
  })
})

describe('OASSelect 受控展开（open + oas-open-change）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('非受控展开/收起均派发 oas-open-change（detail.open）', () => {
    const el = mount()
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    open(el)
    expect(events).toEqual([true])
    trigger(el).click()
    expect(events).toEqual([true, false])
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('设置 open 属性直接展开（受控声明式）', () => {
    const el = mount({ open: '' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.dropdown')!.classList.contains('open')).toBe(true)
  })

  it('open property 通道反射 attribute（宿主框架 :open 绑定）', () => {
    const el = mount()
    el.open = true
    expect(el.hasAttribute('open')).toBe(true)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    el.open = false
    expect(el.hasAttribute('open')).toBe(false)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it("I-1 open property 四态：''/true 展开，false/'false' 收起（presence 语义）", () => {
    const el = mount()
    // ''：Vue 静态 `<oas-select open>` 经 property 写入的形态——必须视为展开
    el.open = ''
    expect(el.hasAttribute('open'), "property '' 应落地 open 属性").toBe(true)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    el.open = true
    expect(el.hasAttribute('open')).toBe(true)
    el.open = false
    expect(el.hasAttribute('open')).toBe(false)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    el.open = 'false'
    expect(el.hasAttribute('open'), "'false' 应视为收起").toBe(false)
  })

  it("I-1 元素已连接后写入 '' 不删属性（hydration 顺序安全）", () => {
    const el = mount()
    expect(el.hasAttribute('open')).toBe(false)
    el.open = ''
    expect(el.hasAttribute('open')).toBe(true)
    // 已展开后再写 ''：幂等保持，不触发 remove→set 抖动
    el.open = ''
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.getAttribute('open')).toBe('')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('open property 关闭：非受控展开态下 el.open = false 直接收起（removeAttribute 无回调路径）', () => {
    const el = mount()
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    el.open = false
    expect(el.hasAttribute('open')).toBe(false)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('受控 open：点击 trigger 只派发事件不强制写回（属性在场仍展开），宿主移除属性后收起', () => {
    const el = mount({ open: '' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    trigger(el).click()
    expect(events).toEqual([false])
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    el.removeAttribute('open')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('受控 open：点击外部只派发事件，属性移除后收起', () => {
    const el = mount({ open: '' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(events).toEqual([false])
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    el.removeAttribute('open')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('Esc 关闭派发 oas-open-change(false)（非受控）', () => {
    const el = mount()
    open(el)
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(events).toEqual([false])
  })

  it('单选选中后收起并派发 oas-open-change(false)', () => {
    const el = mount()
    open(el)
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    const rows = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(rows[0] as HTMLElement).click()
    expect(events).toEqual([false])
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })
})

describe('OASSelect 多选上限（max-count + oas-exceed-limit）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('多选达上限后未选项禁用置灰（aria-disabled），已选项不受影响', () => {
    const el = mount({
      multiple: '',
      'max-count': '2',
      value: JSON.stringify(['apple', 'banana']),
    })
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows[0]!.getAttribute('aria-disabled')).toBe('false')
    expect(rows[1]!.getAttribute('aria-disabled')).toBe('false')
    expect(rows[2]!.getAttribute('aria-disabled')).toBe('true')
  })

  it('点击超限项不改变 value，派发 oas-exceed-limit（detail 带值与上限）', () => {
    const el = mount({
      multiple: '',
      'max-count': '2',
      value: JSON.stringify(['apple', 'banana']),
    })
    open(el)
    let detail: unknown
    el.addEventListener('oas-exceed-limit', (e: Event) => (detail = (e as CustomEvent).detail))
    const rows = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(rows[2] as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['apple', 'banana'])
    expect(detail).toEqual({ value: 'orange', max: 2 })
  })

  it('上限内正常选择；取消一项后恢复可选（动态联动）', () => {
    const el = mount({ multiple: '', 'max-count': '1' })
    open(el)
    const rows = () => [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    ;(rows()[0] as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['apple'])
    // 达上限：其余禁用
    expect(rows()[1]!.getAttribute('aria-disabled')).toBe('true')
    // 取消已选项（点击已选行）：允许
    ;(rows()[0] as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual([])
    expect(rows()[1]!.getAttribute('aria-disabled')).toBe('false')
  })

  it('键盘 Enter 在超限项上同样拦截并派发事件', () => {
    const el = mount({
      multiple: '',
      'max-count': '1',
      value: JSON.stringify(['apple']),
    })
    open(el)
    let fired = 0
    el.addEventListener('oas-exceed-limit', () => fired++)
    // activeIndex 初始指向已选 apple(0)，下移到 banana
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(fired).toBe(1)
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['apple'])
  })

  it('chip 移除不受上限影响', () => {
    const el = mount({
      multiple: '',
      'max-count': '1',
      value: JSON.stringify(['apple']),
    })
    el.shadowRoot!.querySelector<HTMLButtonElement>('.chip button')!.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual([])
  })

  it('单选模式 max-count 不生效（行为不变）', () => {
    const el = mount({ 'max-count': '1' })
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows.every((r) => r.getAttribute('aria-disabled') === 'false')).toBe(true)
    ;(rows[2] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('orange')
  })

  it('allow-create 达上限时不创建并派发 oas-exceed-limit', () => {
    const el = mount({
      multiple: '',
      'max-count': '1',
      'allow-create': '',
      searchable: '',
      value: JSON.stringify(['apple']),
    })
    open(el)
    let fired = 0
    el.addEventListener('oas-exceed-limit', () => fired++)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = '火龙果'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    el.shadowRoot!.querySelector<HTMLElement>('.create-option')!.click()
    expect(fired).toBe(1)
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['apple'])
  })
})

describe('OASSelect 自定义过滤（filterMethod property 通道）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('el.filterMethod 自定义本地过滤（按 value 匹配演示）', () => {
    const el = mount({ searchable: '' })
    el.filterMethod = (query: string, option: { label: string; value: string }) =>
      option.value.includes(query.toLowerCase())
    open(el)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = 'APP'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows.length).toBe(1)
    expect(rows[0]!.textContent).toContain('苹果')
  })

  it('filterMethod 收到原始查询词（未转小写）与完整 option 对象', () => {
    const el = mount({ searchable: '' })
    const seen: Array<{ q: string; label: string; value: string }> = []
    el.filterMethod = (q: string, o: { label: string; value: string }) => {
      seen.push({ q, label: o.label, value: o.value })
      return true
    }
    open(el)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = 'APP'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    // 每轮渲染会多次调用（renderListbox/syncActive 各一次）；契约是每个选项都被咨询且收到原始词
    const forQuery = seen.filter((s) => s.q === 'APP')
    expect(forQuery.length).toBeGreaterThanOrEqual(3)
    expect([...new Set(forQuery.map((s) => s.value))].sort()).toEqual(['apple', 'banana', 'orange'])
  })

  it('filterMethod 全 false → 空态', () => {
    const el = mount({ searchable: '' })
    el.filterMethod = () => false
    open(el)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = '任意'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(0)
    expect(el.shadowRoot!.textContent).toContain('无匹配选项')
  })

  it('置 null 回落默认 label includes 过滤', () => {
    const el = mount({ searchable: '' })
    el.filterMethod = () => false
    el.filterMethod = null
    open(el)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = '香'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(1)
  })

  it('remote 模式 filterMethod 不生效（数据面过滤交给宿主）', () => {
    const el = mount({ remote: '', searchable: '' })
    el.filterMethod = () => false
    open(el)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = '任意'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(3)
  })
})

describe('OASSelect 展开方向（placement）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** happy-dom 无布局（矩形全 0）：top=锚点上缘-面板高-间距=-8px，bottom=锚点下缘+间距=8px */
  function dropdownTop(el: OASSelect): string {
    return el.shadowRoot!.querySelector<HTMLElement>('.dropdown')!.style.top
  }

  it('placement=top 强制上方（不自动翻转）', () => {
    const el = mount({ placement: 'top' })
    open(el)
    expect(dropdownTop(el)).toBe('-8px')
  })

  it('placement=bottom 强制下方；auto（默认）下方优先', () => {
    const el = mount({ placement: 'bottom' })
    open(el)
    expect(dropdownTop(el)).toBe('8px')
    const auto = mount()
    open(auto)
    expect(dropdownTop(auto)).toBe('8px')
  })

  it('非法 placement 回落 auto', () => {
    const el = mount({ placement: 'left' })
    open(el)
    expect(dropdownTop(el)).toBe('8px')
  })

  it('placement 变化增量生效（top → bottom 重定位）', () => {
    const el = mount({ placement: 'top' })
    open(el)
    expect(dropdownTop(el)).toBe('-8px')
    el.setAttribute('placement', 'bottom')
    expect(dropdownTop(el)).toBe('8px')
  })
})

describe('OASSelect 只读（readonly）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('readonly：trigger 可聚焦未禁用，点击/键盘不展开，标 aria-readonly', () => {
    const el = mount({ readonly: '', value: 'apple' })
    const btn = trigger(el)
    expect(btn.disabled).toBe(false)
    expect(btn.getAttribute('aria-readonly')).toBe('true')
    btn.click()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('readonly + clearable：不显示清空按钮（值只读不可改）', () => {
    const el = mount({ readonly: '', clearable: '', value: 'apple' })
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
  })

  it('非 readonly 时无 aria-readonly 残留', () => {
    const el = mount()
    expect(trigger(el).hasAttribute('aria-readonly')).toBe(false)
  })

  it('移除 readonly 后恢复可展开', () => {
    const el = mount({ readonly: '' })
    el.removeAttribute('readonly')
    expect(trigger(el).getAttribute('aria-readonly')).toBe(null)
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('OASSelect change detail 携带完整 option', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('多选 detail.options 携带完整 option 对象数组（含 group/disabled 字段）', () => {
    const grouped = JSON.stringify([
      { group: '温带', label: '苹果', value: 'apple' },
      { group: '热带', label: '香蕉', value: 'banana' },
    ])
    const el = mount({ multiple: '', options: grouped })
    open(el)
    let detail: any
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const rows = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(rows[0] as HTMLElement).click()
    ;(rows[1] as HTMLElement).click()
    expect(detail.options).toEqual([
      { group: '温带', label: '苹果', value: 'apple' },
      { group: '热带', label: '香蕉', value: 'banana' },
    ])
  })

  it('值不在 options 时 option 为 null（清空外部预设值场景）', () => {
    const el = mount({ clearable: '', value: 'ghost' })
    let detail: any
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(detail).toEqual({ value: '', option: null })
  })

  it('多选清空 detail.options 为空数组', () => {
    const el = mount({ multiple: '', clearable: '', value: JSON.stringify(['apple']) })
    let detail: any
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(detail).toEqual({ value: [], options: [] })
  })
})

describe('OASSelect 焦点事件（oas-focus / oas-blur）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('trigger 聚焦派发 oas-focus，失焦派发 oas-blur', () => {
    const el = mount()
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    const btn = trigger(el)
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(events).toEqual(['focus'])
    btn.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    expect(events).toEqual(['focus', 'blur'])
  })

  it('组件内部焦点转移（trigger↔搜索框）不派发 blur，离开组件才派发一次 blur', () => {
    const el = mount({ searchable: '' })
    open(el)
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    const btn = trigger(el)
    const si = el.shadowRoot!.querySelector<HTMLElement>('[part="search-input"]')!
    // 组件内互转：trigger → 搜索框 → trigger（relatedTarget 始终在组件内）
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    btn.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: si }))
    si.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    si.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: btn }))
    // 内部转移期间绝不派发 blur；focus 至多一次（是否已聚焦取决于 open 时的真实焦点，不作假设）
    expect(events.filter((e) => e === 'blur')).toEqual([])
    expect(events.filter((e) => e === 'focus').length).toBeLessThanOrEqual(1)
    // 离开组件：派发一次 blur
    si.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }))
    expect(events.filter((e) => e === 'blur')).toEqual(['blur'])
  })
})

describe('OASSelect 远程防抖（debounce）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('remote + debounce：窗口内多次输入只派发一次 oas-input（末次值）', async () => {
    const el = mount({ remote: '', searchable: '', debounce: '50' })
    open(el)
    const inputs: string[] = []
    el.addEventListener('oas-input', (e: Event) => inputs.push((e as CustomEvent).detail.value))
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = 'a'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    si.value = 'ap'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    si.value = 'app'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    expect(inputs).toEqual([])
    await new Promise((r) => setTimeout(r, 90))
    expect(inputs).toEqual(['app'])
  })

  it('debounce 默认 0：立即派发（现状不干扰）', () => {
    const el = mount({ remote: '', searchable: '' })
    open(el)
    const inputs: string[] = []
    el.addEventListener('oas-input', (e: Event) => inputs.push((e as CustomEvent).detail.value))
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = 'a'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    expect(inputs).toEqual(['a'])
  })

  it('本地搜索不受 debounce 影响（过滤即时）', () => {
    const el = mount({ searchable: '', debounce: '100' })
    open(el)
    const si = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    si.value = '香'
    si.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(1)
  })
})

describe('OASSelect 下拉高度 CSS 变量', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('CSS 变量开口：.listbox max-height 走 --oas-select-dropdown-height（默认 240px）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const rule = css.match(/\.listbox\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toContain('max-height: var(--oas-select-dropdown-height, 240px)')
    expect(css).toContain('--oas-select-dropdown-height: 240px')
  })

  it('虚拟模式 vlist 高度跟随 CSS 变量（宿主覆盖生效）', () => {
    const many = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })))
    const el = mount({ virtual: '', options: many })
    el.style.setProperty('--oas-select-dropdown-height', '300px')
    open(el)
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    expect(vlist.getAttribute('height')).toBe('300')
  })

  it('虚拟模式默认高度 240', () => {
    const many = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })))
    const el = mount({ virtual: '', options: many })
    open(el)
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    expect(vlist.getAttribute('height')).toBe('240')
  })

  it('触摸目标：coarse pointer 媒体查询进样式表，option 最小高度走 --oas-touch-target-min（默认 44px）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('@media (pointer: coarse)')
    expect(css).toContain('var(--oas-touch-target-min, 44px)')
  })
})

describe('OASSelect form-associated（原生表单集成）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** happy-dom 不支持 attachInternals → 替身注入验证 plumbing；真实原生关联走浏览器 e2e */
  const fakeInternals = (el: OASSelect) => {
    const fake = { setFormValue: vi.fn(), setValidity: vi.fn(), labels: null, form: null }
    ;(el as unknown as { internals_: unknown }).internals_ = fake
    return fake
  }

  it('静态声明 formAssociated = true；required/name 进入 observedAttributes；无 ElementInternals 环境降级', () => {
    expect((OASSelect as unknown as { formAssociated: boolean }).formAssociated).toBe(true)
    expect(OASSelect.observedAttributes).toEqual(expect.arrayContaining(['required', 'name']))
    const el = mount({})
    expect(el.labels).toBeNull()
    expect(el.form).toBeNull()
  })

  it('单选提交：选中值字符串；无选中提交 null（FormData 不含此项）', () => {
    const named = mount({ value: 'apple', name: 'fruit' })
    const fakeNamed = fakeInternals(named)
    named.setAttribute('size', 'small') // 触发 update → 同步 FormData
    expect(fakeNamed.setFormValue).toHaveBeenLastCalledWith('apple')

    const empty = mount({})
    const fakeEmpty = fakeInternals(empty)
    empty.setAttribute('size', 'small')
    expect(fakeEmpty.setFormValue).toHaveBeenLastCalledWith(null)
  })

  it('点击选中同步 FormData（单选）', () => {
    const el = mount()
    const fake = fakeInternals(el)
    open(el)
    const rows = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(rows[1] as HTMLElement).click()
    expect(fake.setFormValue).toHaveBeenLastCalledWith('banana')
  })

  it('受控 value 写入同步 FormData（单选/多选）', () => {
    const el = mount({ name: 'fruit' })
    const fake = fakeInternals(el)
    el.setAttribute('value', 'orange')
    expect(fake.setFormValue).toHaveBeenLastCalledWith('orange')

    const multi = mount({ multiple: '', name: 'tags' })
    const fakeMulti = fakeInternals(multi)
    multi.setAttribute('value', JSON.stringify(['apple']))
    const arg = fakeMulti.setFormValue.mock.calls.at(-1)?.[0]
    expect(arg).toBeInstanceOf(FormData)
    expect((arg as FormData).getAll('tags')).toEqual(['apple'])
  })

  it('多选提交同名多条 FormData（key=name 属性），无选中提交 null', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple', 'banana']), name: 'tags' })
    const fake = fakeInternals(el)
    el.setAttribute('size', 'small')
    const arg = fake.setFormValue.mock.calls.at(-1)?.[0]
    expect(arg).toBeInstanceOf(FormData)
    expect((arg as FormData).getAll('tags')).toEqual(['apple', 'banana'])

    const empty = mount({ multiple: '', name: 'tags' })
    const fakeEmpty = fakeInternals(empty)
    empty.setAttribute('size', 'small')
    expect(fakeEmpty.setFormValue).toHaveBeenLastCalledWith(null)
  })

  it('回归：多选无 name 不注入空名 entry（setFormValue(null)）——FormData 通道由组件自建，不受浏览器「无 name 不提交」兜底保护', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple']) }) // 无 name
    const fake = fakeInternals(el)
    el.setAttribute('size', 'small') // 触发 update → 同步 FormData
    expect(fake.setFormValue).toHaveBeenLastCalledWith(null)
  })

  it('回归：多选无 name + required + 有选中不误报 valueMissing（校验按选中集判定，不按 FormData null）', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['apple']), required: '' }) // 无 name
    const fake = fakeInternals(el)
    el.setAttribute('size', 'small')
    expect(fake.setValidity.mock.lastCall?.[0]).toEqual({})
    // 取消全部选中后才报 valueMissing
    el.setAttribute('value', '[]')
    expect(fake.setValidity.mock.lastCall?.[0]).toEqual({ valueMissing: true })
  })

  it('多选逐项点击同步：FormData 跟随选中集增减', () => {
    const el = mount({ multiple: '', name: 'tags' })
    const fake = fakeInternals(el)
    open(el)
    const rows = () => [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    ;(rows()[0] as HTMLElement).click()
    let arg = fake.setFormValue.mock.calls.at(-1)?.[0] as FormData
    expect(arg).toBeInstanceOf(FormData)
    expect(arg.getAll('tags')).toEqual(['apple'])
    ;(rows()[1] as HTMLElement).click()
    arg = fake.setFormValue.mock.calls.at(-1)?.[0] as FormData
    expect(arg.getAll('tags')).toEqual(['apple', 'banana'])
  })

  it('清空按钮同步 null（单选）/ 空集（多选）', () => {
    const single = mount({ clearable: '', value: 'apple', name: 'fruit' })
    const fakeSingle = fakeInternals(single)
    single.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(fakeSingle.setFormValue).toHaveBeenLastCalledWith(null)

    const multi = mount({ multiple: '', clearable: '', value: JSON.stringify(['apple']), name: 'tags' })
    const fakeMulti = fakeInternals(multi)
    multi.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(fakeMulti.setFormValue).toHaveBeenLastCalledWith(null)
  })

  it('formResetCallback：用户选过后恢复初始基线（空），不派发事件，reset 后可继续选择', () => {
    const el = mount({ name: 'fruit' })
    const fake = fakeInternals(el)
    let changes = 0
    el.addEventListener('oas-change', () => changes++)
    open(el)
    ;(el.shadowRoot!.querySelectorAll('[role="option"]')[0] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('apple')
    el.formResetCallback()
    expect(el.hasAttribute('value')).toBe(false)
    expect(trigger(el).textContent).toContain('请选择')
    expect(fake.setFormValue).toHaveBeenLastCalledWith(null)
    // 计数 = 1 全部来自上面的用户点击；reset 本身不再派发（与原生 reset 一致）
    expect(changes, 'reset 不派发 oas-change').toBe(1)
    // reset 已清脏：行为可重复（再选 → 再 reset 回空基线）
    open(el)
    ;(el.shadowRoot!.querySelectorAll('[role="option"]')[2] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('orange')
    el.formResetCallback()
    expect(el.hasAttribute('value')).toBe(false)
  })

  it('受控写入刷新基线：reset 恢复受控写入后的值，不是挂载初值', () => {
    const el = mount({ name: 'fruit' })
    el.setAttribute('value', 'apple') // 受控写入建立新基线
    open(el)
    ;(el.shadowRoot!.querySelectorAll('[role="option"]')[1] as HTMLElement).click() // 用户选 banana（置脏）
    expect(el.getAttribute('value')).toBe('banana')
    el.formResetCallback()
    expect(el.getAttribute('value')).toBe('apple')
    expect(trigger(el).textContent).toContain('苹果')
  })

  it('多选 reset：恢复初始选中集（FormData 回到基线条目）', () => {
    const el = mount({ multiple: '', value: JSON.stringify(['banana']), name: 'tags' })
    const fake = fakeInternals(el)
    open(el)
    ;(el.shadowRoot!.querySelectorAll('[role="option"]')[0] as HTMLElement).click() // 用户加选 apple
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['banana', 'apple'])
    el.formResetCallback()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['banana'])
    const arg = fake.setFormValue.mock.calls.at(-1)?.[0] as FormData
    expect(arg.getAll('tags')).toEqual(['banana'])
  })

  it('required：无选中 valueMissing（message 非空），选中后恢复合法', () => {
    const el = mount({ required: '', name: 'fruit' })
    const fake = fakeInternals(el)
    el.setAttribute('size', 'small') // 触发 update → 校验链同步
    // flag 为 true 时 message 按 Chromium 契约必须非空（基类 setValidity 会显式补 anchor 实参，只查前两个参数）
    const missing = fake.setValidity.mock.calls.at(-1)
    expect(missing?.[0]).toEqual({ valueMissing: true })
    expect(typeof missing?.[1]).toBe('string')
    expect(missing?.[1] as string).toMatch(/\S/)
    open(el)
    ;(el.shadowRoot!.querySelectorAll('[role="option"]')[0] as HTMLElement).click()
    expect(fake.setValidity).toHaveBeenLastCalledWith({})
  })

  it('formDisabledCallback：表单链路禁用并入（不回写 disabled 属性防自锁），解除后恢复', () => {
    const el = mount({})
    el.formDisabledCallback(true)
    expect(el.hasAttribute('disabled'), '不回写 disabled 属性（自锁防线）').toBe(false)
    expect(trigger(el).disabled).toBe(true)
    el.formDisabledCallback(false)
    expect(trigger(el).disabled).toBe(false)
  })

  it('label 点击（派到宿主的 click）聚焦 shadow 内 trigger；点击 trigger 本身不重复聚焦', () => {
    const el = mount({})
    const spy = vi.spyOn(trigger(el), 'focus')
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockClear()
    trigger(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(spy).not.toHaveBeenCalled()
  })

  it('focus() 转到 shadow 内 trigger', () => {
    const el = mount({})
    const spy = vi.spyOn(trigger(el), 'focus')
    el.focus()
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

// ---- 能力缺口 P1：label 表单标签属性 / variant 三值变体 ----

describe('OASSelect label / variant（能力缺口 P1）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function styleText(el: OASSelect): string {
    return el.shadowRoot!.querySelector('style')?.textContent ?? ''
  }

  it('label/variant 进入 observedAttributes', () => {
    const attrs = OASSelect.observedAttributes
    expect(attrs).toContain('label')
    expect(attrs).toContain('variant')
  })

  it('label 成为 trigger 的 aria-label（优先于 placeholder）', () => {
    const el = mount({ label: '所属城市', placeholder: '请选择' })
    expect(trigger(el).getAttribute('aria-label')).toBe('所属城市')
  })

  it('无 label 时 aria-label 回落 placeholder（现状不变）', () => {
    const el = mount({ placeholder: '请选择' })
    expect(trigger(el).getAttribute('aria-label')).toBe('请选择')
  })

  it('label 属性增量更新，不重建 trigger', () => {
    const el = mount({ label: 'a' })
    const t = trigger(el)
    el.setAttribute('label', 'b')
    expect(trigger(el)).toBe(t)
    expect(t.getAttribute('aria-label')).toBe('b')
  })

  it('variant 默认 outlined（data-variant 镜像，对齐 input 枚举）', () => {
    const el = mount()
    expect(el.getAttribute('data-variant')).toBe('outlined')
  })

  it('variant=filled/borderless 镜像 data-variant，非法值静默回落 outlined', () => {
    const el = mount({ variant: 'filled' })
    expect(el.getAttribute('data-variant')).toBe('filled')
    el.setAttribute('variant', 'borderless')
    expect(el.getAttribute('data-variant')).toBe('borderless')
    el.setAttribute('variant', 'fancy')
    expect(el.getAttribute('data-variant')).toBe('outlined')
  })

  it('variant 形态样式规则存在（filled/borderless，颜色只走 token）', () => {
    const el = mount({ variant: 'filled' })
    const css = styleText(el)
    expect(css).toContain("[data-variant='filled']")
    expect(css).toContain("[data-variant='borderless']")
    expect(css).toContain('var(--oas-color-bg-hover)')
  })

  it('variant 规则位于 status 规则之前（同特异性时 status 语义色胜出）', () => {
    const el = mount({ variant: 'filled' })
    const css = styleText(el)
    expect(css.indexOf("[data-variant='filled']")).toBeLessThan(css.indexOf("[data-status='error']"))
  })
})

// ---- 能力缺口 P2：select 长尾组 ----

describe('OASSelect 长尾组（能力缺口 P2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function styleText(el: OASSelect): string {
    return el.shadowRoot!.querySelector('style')?.textContent ?? ''
  }

  function searchInput(el: OASSelect): HTMLInputElement {
    return el.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!
  }

  function setSearchQuery(el: OASSelect, v: string): void {
    const input = searchInput(el)
    input.value = v
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  /** 选项行 label 文本（排除行尾 ✓ 勾选符） */
  function optionLabels(el: OASSelect): string[] {
    return [...el.shadowRoot!.querySelectorAll('[role="option"]')].map(
      (o) => o.querySelector('.option-label')?.textContent ?? '',
    )
  }

  function appendSlot(el: OASSelect, slot: string, html: string): void {
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', slot)
    tpl.innerHTML = html
    el.appendChild(tpl)
  }

  it('长尾属性进入 observedAttributes', () => {
    const attrs = OASSelect.observedAttributes
    for (const a of [
      'input-value',
      'show-arrow',
      'autofocus',
      'default-active-first-option',
      'loading-text',
      'reserve-keyword',
      'tabindex',
      'auto-width',
      'hint',
    ]) {
      expect(attrs, a).toContain(a)
    }
  })

  // ---- show-arrow ----

  it('show-arrow="false" 隐藏默认 chevron（svg 写 hidden 属性），缺省显示', () => {
    const off = mount({ 'show-arrow': 'false' })
    expect(trigger(off).querySelector('.chevron')!.hasAttribute('hidden')).toBe(true)
    const on = mount()
    expect(trigger(on).querySelector('.chevron')!.hasAttribute('hidden')).toBe(false)
  })

  // ---- suffix-icon / clear-icon / prefix / suffix 插槽 ----

  it('template[slot="suffix-icon"] 替换默认 chevron，展开旋转样式作用于自定义图标容器', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    appendSlot(el, 'suffix-icon', '<i class="my-ic">▲</i>')
    document.body.appendChild(el)
    const box = trigger(el).querySelector<HTMLElement>('.suffix-icon')!
    const chevron = trigger(el).querySelector('.chevron')!
    expect(box.hidden).toBe(false)
    expect(box.querySelectorAll('.my-ic').length).toBe(1)
    expect(chevron.hasAttribute('hidden')).toBe(true)
    // 旋转样式挂在容器上（跟随展开态翻转）
    expect(styleText(el)).toContain(".trigger[aria-expanded='true'] .suffix-icon")
  })

  it('无 suffix-icon 模板时容器隐藏、chevron 恢复显示', () => {
    const el = mount()
    const box = trigger(el).querySelector<HTMLElement>('.suffix-icon')!
    expect(box.hidden).toBe(true)
    expect(trigger(el).querySelector('.chevron')!.hasAttribute('hidden')).toBe(false)
  })

  it('template[slot="clear-icon"] 替换清空按钮默认 × 图标', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    el.setAttribute('clearable', '')
    el.setAttribute('value', 'apple')
    appendSlot(el, 'clear-icon', '<b class="my-clear">✕</b>')
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector<HTMLElement>('.clear-btn')!
    expect(btn.hidden).toBe(false)
    expect(btn.querySelectorAll('.my-clear').length).toBe(1)
    expect(btn.querySelector('svg')!.hasAttribute('hidden')).toBe(true)
  })

  it('template[slot="prefix"] / template[slot="suffix"] 渲染进触发器前后缀，缺省隐藏', () => {
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    appendSlot(el, 'prefix', '<span class="my-prefix">¥</span>')
    appendSlot(el, 'suffix', '<span class="my-suffix">元</span>')
    document.body.appendChild(el)
    const prefix = trigger(el).querySelector<HTMLElement>('.prefix')!
    const suffix = trigger(el).querySelector<HTMLElement>('.suffix')!
    expect(prefix.hidden).toBe(false)
    expect(prefix.querySelectorAll('.my-prefix').length).toBe(1)
    expect(suffix.hidden).toBe(false)
    expect(suffix.querySelectorAll('.my-suffix').length).toBe(1)
    // 前缀在值之前、后缀在清空按钮之后
    const valueEl = trigger(el).querySelector('.value')!
    expect(prefix.nextElementSibling).toBe(valueEl)
    const bare = mount()
    expect(trigger(bare).querySelector<HTMLElement>('.prefix')!.hidden).toBe(true)
    expect(trigger(bare).querySelector<HTMLElement>('.suffix')!.hidden).toBe(true)
  })

  it('slot 模板子节点直插后仍可克隆，且不改动宿主模板 DOM', () => {
    // Vue 等框架 CSR 直插 template 元素时子节点落在元素 childNodes（content 为空）；真实浏览器形态由
    // qa-regression e2e 覆盖，这里守住非破坏性克隆与四条触发器插槽的接线。
    const el = new OASSelect()
    el.setAttribute('options', OPTIONS)
    el.setAttribute('clearable', '')
    el.setAttribute('value', 'apple')
    const cases: Array<[string, string, string]> = [
      ['prefix', '<span class="csr-prefix">📍</span>', '.csr-prefix'],
      ['suffix', '<span class="csr-suffix">城市</span>', '.csr-suffix'],
      ['suffix-icon', '<span class="csr-arrow">⌄</span>', '.csr-arrow'],
      ['clear-icon', '<span class="csr-clear">✕</span>', '.csr-clear'],
    ]
    for (const [slot, html, probe] of cases) {
      const tpl = document.createElement('template')
      tpl.setAttribute('slot', slot)
      const holder = document.createElement('span')
      holder.innerHTML = html
      while (holder.firstChild) tpl.insertBefore(holder.firstChild, null)
      el.appendChild(tpl)
    }
    document.body.appendChild(el)
    const root = el.shadowRoot!
    expect(root.querySelector('.csr-prefix')?.textContent).toBe('📍')
    expect(root.querySelector('.csr-suffix')?.textContent).toBe('城市')
    expect(root.querySelector('.csr-arrow')?.textContent).toBe('⌄')
    expect(root.querySelector('.csr-clear')?.textContent).toBe('✕')
    // 非破坏性：宿主模板子节点保留（happy-dom 会把插入重定向到 content，CSR 直插形态由 e2e 覆盖）
    expect(el.querySelector<HTMLTemplateElement>('template[slot="prefix"]')!.content.childNodes.length).toBe(1)
  })

  // ---- input-value（filterable 输入值受控） ----

  it('input-value 预设：打开后搜索框带初始值并参与过滤', () => {
    const el = mount({ searchable: '', 'input-value': '苹' })
    open(el)
    expect(searchInput(el).value).toBe('苹')
    // 过滤生效：只留 label 含「苹」的选项
    expect(optionLabels(el)).toEqual(['苹果'])
  })

  it('输入时写回 input-value 属性并派发 oas-input-value-change', () => {
    const el = mount({ searchable: '' })
    open(el)
    const events: string[] = []
    el.addEventListener('oas-input-value-change', (e: Event) => {
      events.push((e as CustomEvent).detail.value)
    })
    setSearchQuery(el, '香')
    expect(el.getAttribute('input-value')).toBe('香')
    expect(events).toEqual(['香'])
  })

  it('展开中外部改 input-value：搜索框同步且列表重过滤', () => {
    const el = mount({ searchable: '' })
    open(el)
    el.setAttribute('input-value', '橙')
    expect(searchInput(el).value).toBe('橙')
    expect(optionLabels(el)).toEqual(['橙子'])
  })

  // ---- reserve-keyword（多选选中后默认清空搜索词，设置后保留） ----

  it('多选搜索选中后默认清空搜索词（列表恢复全量）', () => {
    const el = mount({ multiple: '', searchable: '' })
    open(el)
    setSearchQuery(el, '苹')
    ;(el.shadowRoot!.querySelector('[role="option"]') as HTMLElement).click()
    expect(searchInput(el).value).toBe('')
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(3)
  })

  it('reserve-keyword：多选搜索选中后保留搜索词（列表保持过滤）', () => {
    const el = mount({ multiple: '', searchable: '', 'reserve-keyword': '' })
    open(el)
    setSearchQuery(el, '苹')
    ;(el.shadowRoot!.querySelector('[role="option"]') as HTMLElement).click()
    expect(searchInput(el).value).toBe('苹')
    expect(optionLabels(el)).toEqual(['苹果'])
  })

  // ---- default-active-first-option ----

  it('default-active-first-option：展开高亮首项而非当前选中项', () => {
    const el = mount({ value: 'orange', 'default-active-first-option': '' })
    open(el)
    const active = el.shadowRoot!.querySelector('[role="option"].active')
    expect(active?.textContent).toContain('苹果')
  })

  it('缺省行为不变：展开高亮当前选中项', () => {
    const el = mount({ value: 'orange' })
    open(el)
    const active = el.shadowRoot!.querySelector('[role="option"].active')
    expect(active?.textContent).toContain('橙子')
  })

  // ---- loading-text ----

  it('loading-text 覆盖默认加载文案', () => {
    const el = mount({ remote: '', loading: '', 'loading-text': '数据加载中…' })
    open(el)
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toBe('数据加载中…')
  })

  // ---- autofocus ----

  it('autofocus：挂载后自动聚焦 trigger', async () => {
    const el = mount({ autofocus: '' })
    await Promise.resolve()
    expect(el.shadowRoot!.activeElement).toBe(trigger(el))
  })

  // ---- tabindex 透传 ----

  it('tabindex 委托到内部 trigger（宿主移除防双 Tab 停靠点）', () => {
    const el = mount({ tabindex: '3' })
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(trigger(el).tabIndex).toBe(3)
    // 宿主重新设置 → 再次委托
    el.setAttribute('tabindex', '-1')
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(trigger(el).tabIndex).toBe(-1)
  })

  // ---- auto-width ----

  it('auto-width：宿主宽度随内容收缩（width auto 样式生效）', () => {
    const el = mount({ 'auto-width': '' })
    expect(styleText(el)).toContain(':host([auto-width])')
  })

  // ---- hint ----

  it('hint 渲染触发器下方提示文案，aria-describedby 关联可读', () => {
    const el = mount({ hint: '选择常驻城市' })
    const hint = el.shadowRoot!.querySelector<HTMLElement>('.hint')!
    expect(hint.hidden).toBe(false)
    expect(hint.textContent).toBe('选择常驻城市')
    expect(trigger(el).getAttribute('aria-describedby')).toBe(hint.id)
    el.removeAttribute('hint')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.hint')!.hidden).toBe(true)
    expect(trigger(el).hasAttribute('aria-describedby')).toBe(false)
  })

  // ---- oas-create ----

  it('allow-create 创建新选项时派发 oas-create（detail 携带创建文本）', () => {
    const el = mount({ 'allow-create': '', searchable: '' })
    open(el)
    const events: unknown[] = []
    el.addEventListener('oas-create', (e: Event) => events.push((e as CustomEvent).detail))
    setSearchQuery(el, '榴莲')
    ;(el.shadowRoot!.querySelector('.create-option') as HTMLElement).click()
    expect(events).toEqual([{ value: '榴莲', label: '榴莲' }])
    expect(el.getAttribute('value')).toBe('榴莲')
  })
})

// ---- I4：清空按钮键盘可达（Tab 序 + 可读名称 + Enter/Space 清空） ----

describe('OASSelect 清空按钮键盘可达（I4）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('clear-btn 进入 Tab 序（tabIndex 0）、有可读名称、Enter 清空', () => {
    const el = mount({ clearable: '', value: 'apple' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!
    expect(clearBtn.getAttribute('tabindex')).toBe('0')
    expect(clearBtn.tabIndex).toBe(0)
    expect(clearBtn.getAttribute('aria-label')).toBe('清除')
    clearBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.getAttribute('value')).toBeNull()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.activeElement, '清空后焦点交还 trigger').toBe(trigger(el))
  })

  it('clear-btn Space 同样清空，且不触发触发器展开', () => {
    const el = mount({ clearable: '', value: 'banana' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!
    clearBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(el.getAttribute('value')).toBeNull()
    expect(trigger(el).getAttribute('aria-expanded'), 'Space 不应冒泡成展开').toBe('false')
  })

  it('面板展开时清空按钮仍在 Tab 序（既有面板键盘流不变）', () => {
    const el = mount({ clearable: '', value: 'apple', searchable: '' })
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.tabIndex).toBe(0)
  })
})

// ---- 能力缺口 D20：hide-selected（多选时已选选项从下拉列表隐藏） ----

describe('OASSelect hide-selected（能力缺口 D20）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function optionLabels(el: OASSelect): string[] {
    return [...el.shadowRoot!.querySelectorAll('[role="option"] .option-label')].map((n) => n.textContent)
  }

  function setSearchQuery(el: OASSelect, v: string): void {
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!
    input.value = v
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  it('hide-selected 进入 observedAttributes', () => {
    expect(OASSelect.observedAttributes).toContain('hide-selected')
  })

  it('多选 + hide-selected：已选选项从下拉列表隐藏', () => {
    const el = mount({ multiple: '', 'hide-selected': '' })
    open(el)
    expect(optionLabels(el)).toEqual(['苹果', '香蕉', '橙子'])
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(options[0] as HTMLElement).click() // 选中苹果
    expect(optionLabels(el)).toEqual(['香蕉', '橙子'])
  })

  it('取消选择（再点/值移除）后选项回到列表', () => {
    const el = mount({ multiple: '', 'hide-selected': '', value: JSON.stringify(['apple']) })
    open(el)
    expect(optionLabels(el)).toEqual(['香蕉', '橙子'])
    el.setAttribute('value', '[]')
    expect(optionLabels(el)).toEqual(['苹果', '香蕉', '橙子'])
  })

  it('chip 移除按钮取消选择后选项回到列表', () => {
    const el = mount({ multiple: '', 'hide-selected': '', value: JSON.stringify(['apple', 'banana']) })
    open(el)
    expect(optionLabels(el)).toEqual(['橙子'])
    const chipRemove = el.shadowRoot!.querySelector<HTMLButtonElement>('.chip button')!
    chipRemove.click() // 移除第一个 chip（苹果）→ 剩香蕉被隐藏，列表显示苹果 + 橙子
    expect(optionLabels(el)).toEqual(['苹果', '橙子'])
  })

  it('clearable 清空后全部回到列表', () => {
    const el = mount({ multiple: '', 'hide-selected': '', clearable: '', value: JSON.stringify(['apple', 'orange']) })
    open(el)
    expect(optionLabels(el)).toEqual(['香蕉'])
    el.shadowRoot!.querySelector<HTMLElement>('.clear-btn')!.click()
    expect(optionLabels(el)).toEqual(['苹果', '香蕉', '橙子'])
  })

  it('全部隐藏后显示空态，取消后恢复', () => {
    const el = mount({ multiple: '', 'hide-selected': '', value: JSON.stringify(['apple', 'banana', 'orange']) })
    open(el)
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(0)
    expect(el.shadowRoot!.querySelectorAll('.empty').length).toBe(1)
    el.setAttribute('value', '["banana"]')
    expect(optionLabels(el)).toEqual(['苹果', '橙子'])
  })

  it('单选时 hide-selected 不生效（选中项保留在列表）', () => {
    const el = mount({ 'hide-selected': '', value: 'apple' })
    open(el)
    expect(optionLabels(el)).toEqual(['苹果', '香蕉', '橙子'])
  })

  it('搜索过滤与 hide-selected 叠加：隐藏已选项后再按查询词过滤', () => {
    const el = mount({ multiple: '', 'hide-selected': '', searchable: '', value: JSON.stringify(['apple']) })
    open(el)
    setSearchQuery(el, '果')
    expect(optionLabels(el)).toEqual([])
    setSearchQuery(el, '香')
    expect(optionLabels(el)).toEqual(['香蕉'])
  })
})

describe('OASSelect value property（get/set）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('get value 单选读选中值字符串，交互后更新', () => {
    const el = mount({ value: 'apple' })
    expect(el.value).toBe('apple')
    open(el)
    el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')[1]!.click()
    expect(el.value).toBe('banana')
  })

  it('get value 多选读数组；set value 写入 JSON 并同步选中态，不派发事件', () => {
    let fired = 0
    const el = mount({ multiple: '' })
    el.addEventListener('oas-change', () => fired++)
    el.value = ['apple', 'orange']
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['apple', 'orange'])
    expect(el.value).toEqual(['apple', 'orange'])
    expect(fired).toBe(0)
  })

  it('C1 多选 value property 收到 JSON 字符串（SPA 场景）：解析归一，不整串单值/双重编码', () => {
    const el = mount({ multiple: '' })
    el.value = '["apple","orange"]'
    expect(el.getAttribute('value')).toBe('["apple","orange"]')
    expect(el.value).toEqual(['apple', 'orange'])
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(2)
  })

  it('C1 多选 value 字符串：单值仍按单值，非法 JSON 不抛并按单值处理', () => {
    const el = mount({ multiple: '' })
    el.value = 'banana'
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['banana'])
    // 非法 JSON（以 [ 开头但解析失败）按单值处理
    el.value = '[oops'
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['[oops'])
    expect(el.value).toEqual(['[oops'])
  })

  it("'value' in el === true（原型访问器，非实例 expando）", () => {
    const el = mount()
    expect('value' in el).toBe(true)
    expect(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')).toBeDefined()
    el.value = 'banana'
    expect(Object.hasOwn(el, 'value')).toBe(false)
  })
})

describe('OASSelect reserve-width（触发器预留最宽选项，切值不抖）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('设置后写入宿主 CSS 变量（px 正数），移除属性清除', () => {
    const el = mount({ 'reserve-width': '' })
    const v = el.style.getPropertyValue('--oas-select-reserve')
    expect(v).toMatch(/^[\d.]+px$/)
    expect(Number.parseFloat(v), '苹果/香蕉/橙子中最宽标签的预留宽度').toBe(94)
    el.removeAttribute('reserve-width')
    expect(el.style.getPropertyValue('--oas-select-reserve')).toBe('')
  })

  it('量测包含选项与 placeholder（空态也不小于占位文案）', () => {
    const el = mount({ 'reserve-width': '', placeholder: '非常非常长的占位提示文案' })
    expect(Number.parseFloat(el.style.getPropertyValue('--oas-select-reserve')), '长占位文案撑宽预留').toBe(238)
  })

  it('options 变化重测：更宽选项进入后预留宽度增长', () => {
    const el = mount({ 'reserve-width': '' })
    const before = Number.parseFloat(el.style.getPropertyValue('--oas-select-reserve'))
    el.setAttribute('options', JSON.stringify([{ label: '一个特别特别特别长的选项标签', value: 'long' }]))
    const after = Number.parseFloat(el.style.getPropertyValue('--oas-select-reserve'))
    expect(after).toBeGreaterThan(before)
  })

  it('Option.icon 预留宽度计入图标与行 gap（带图标选项不导致切值抖动）', () => {
    const label = '统一长度的选项标签'
    const plain = mount({ 'reserve-width': '', options: JSON.stringify([{ label, value: 'plain' }]) })
    const withIcon = mount({
      'reserve-width': '',
      options: JSON.stringify([{ label, value: 'icon', icon: 'star' }]),
    })
    const plainReserve = Number.parseFloat(plain.style.getPropertyValue('--oas-select-reserve'))
    const iconReserve = Number.parseFloat(withIcon.style.getPropertyValue('--oas-select-reserve'))
    const iconAllowance = iconReserve - plainReserve
    expect(iconAllowance, '预留宽度应补 1em 图标 + gap').toBeGreaterThanOrEqual(18)
    expect(iconAllowance).toBeLessThanOrEqual(40)
  })

  it('与 auto-width 组合：宿主宽度让位后由预留值锁定下限', () => {
    const el = mount({ 'reserve-width': '', 'auto-width': '' })
    expect(el.style.getPropertyValue('--oas-select-reserve')).toMatch(/^[\d.]+px$/)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 锁定走 :host 的 min-width 变量通道（默认 0px 无副作用），不写死宿主盒
    expect(css).toMatch(/:host\s*\{[^}]*min-width:\s*var\(--oas-select-reserve,\s*0px\)/)
  })

  it('无选项且无 placeholder 时写 0px（无预留）', () => {
    const el = mount({ 'reserve-width': '', options: '[]', placeholder: '' })
    expect(el.style.getPropertyValue('--oas-select-reserve')).toBe('0px')
  })
})

// ===== 属性-方法撞名回归（observedAttributes 的 camelCase 与原型方法同名） =====
//
// 机制：宿主框架按 camelCase 做 property 桥接或用户 JS 写 `el.xxx = ...` 会在实例上
// 建自有属性遮蔽原型同名方法，组件内部 `this.xxx()` 随后抛 TypeError。
// 私有方法已改名（showArrow → showArrowOn）。
describe('OASSelect 属性-方法撞名回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('property 写入 showArrow 后箭头显隐路径不抛错', () => {
    const el = mount()
    ;(el as unknown as Record<string, unknown>).showArrow = false
    expect(() => el.setAttribute('show-arrow', 'false')).not.toThrow()
    expect(trigger(el).querySelector('.chevron')!.hasAttribute('hidden')).toBe(true)
  })
})

// ===== variant="chip" 属性面板编辑模式（E 需求）+ Option.dot / Option.avatarText =====

describe('OASSelect variant=chip（属性面板编辑模式）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** workflow 状态场景（贴近属性面板消费）：dot / avatarText / icon 三类首元素混排 */
  const CHIP_OPTIONS = JSON.stringify([
    { label: '待处理', value: 'todo', dot: 'var(--oas-preset-gold)' },
    { label: '进行中', value: 'in-progress', dot: 'var(--oas-preset-blue)' },
    { label: '负责人评审', value: 'review', avatarText: '评审人' },
    { label: '已完成', value: 'done', dot: 'var(--oas-preset-green)', avatarText: '完' },
    { label: '设置', value: 'settings', icon: 'chip-gear' },
  ])

  function chipMount(attrs: Record<string, string> = {}): OASSelect {
    registerIcon('chip-gear', '<path d="M1 1 L15 15"/>')
    return mount({ options: CHIP_OPTIONS, ...attrs })
  }

  it('variant=chip 进入 data-variant 镜像，非法值静默回落 outlined', () => {
    const el = chipMount({ variant: 'chip' })
    expect(el.getAttribute('data-variant')).toBe('chip')
    el.setAttribute('variant', 'fancy')
    expect(el.getAttribute('data-variant')).toBe('outlined')
    el.setAttribute('variant', 'chip')
    expect(el.getAttribute('data-variant')).toBe('chip')
  })

  it('chip 形态样式规则存在：紧凑胶囊高度走 --oas-select-chip-height token、弱底、无边框框选感', () => {
    const el = chipMount({ variant: 'chip' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain("[data-variant='chip']")
    expect(css).toContain('var(--oas-select-chip-height, 24px)')
    const chipRule = css.match(/:host\(\[data-variant='chip'\]\)\s+\.trigger\s*\{[^}]*\}/)?.[0] ?? ''
    expect(chipRule).toContain('border: none')
    expect(chipRule).toContain('var(--oas-color-bg-hover)')
  })

  it('chip 触发器首元素槽优先级：dot > avatarText > icon', () => {
    const dotBoth = chipMount({ variant: 'chip', value: 'done' })
    const t1 = trigger(dotBoth)
    expect(t1.querySelectorAll('.chip-dot').length, 'dot 与 avatarText 同时给时 dot 优先（恰一个色点）').toBe(1)
    expect(t1.querySelectorAll('.chip-avatar').length).toBe(0)
    expect(t1.querySelectorAll('.value-icon').length).toBe(0)

    const avatar = chipMount({ variant: 'chip', value: 'review' })
    const avEl = trigger(avatar).querySelector<HTMLElement>('.chip-avatar')
    expect(avEl?.textContent ?? '', '无 dot 时回落 avatarText 且取首字符').toBe('评')
    expect(avEl?.getAttribute('aria-hidden')).toBe('true')
    expect(trigger(avatar).querySelectorAll('.chip-dot').length).toBe(0)

    registerIcon('chip-gear', '<path d="M1 1 L15 15"/>')
    const icon = chipMount({ variant: 'chip', value: 'settings' })
    const icEl = trigger(icon).querySelector<HTMLElement>('.value-icon')
    expect(icEl?.querySelector('svg path')?.getAttribute('d'), 'dot/avatarText 均无时回落 icon').toBe('M1 1 L15 15')
    expect(trigger(icon).querySelectorAll('.chip-dot').length).toBe(0)
    expect(trigger(icon).querySelectorAll('.chip-avatar').length).toBe(0)
  })

  it('chip 触发器渲染选中项 label + chevron；dot 颜色内联写 background（快照确定性）', () => {
    const el = chipMount({ variant: 'chip', value: 'in-progress' })
    const t = trigger(el)
    const text = t.querySelector<HTMLElement>('.chip-value-text')
    expect(text!.textContent).toBe('进行中')
    const dot = t.querySelector<HTMLElement>('.chip-dot')
    expect(dot?.getAttribute('aria-hidden')).toBe('true')
    expect(dot?.getAttribute('style') ?? '', 'dot 颜色内联写 background（快照确定性）').toContain(
      'var(--oas-preset-blue)',
    )
    expect(t.querySelectorAll('.chevron').length, 'chip 态保留下拉 chevron').toBe(1)
  })

  it('chip 空值态走既有 placeholder 机制（无首元素残留）', () => {
    const el = chipMount({ variant: 'chip', placeholder: '设置状态' })
    const t = trigger(el)
    expect(t.querySelector('.placeholder')!.textContent).toBe('设置状态')
    expect(t.querySelector('.chip-dot')).toBeNull()
    expect(t.querySelector('.chip-avatar')).toBeNull()
    expect(t.querySelector('.chip-value-text')).toBeNull()
  })

  it('chip 单选点选即派发 oas-change（detail 与既有 select 一致）并收起下拉', () => {
    const el = chipMount({ variant: 'chip', value: 'todo' })
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const rows = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(rows[3] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('done')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(detail).toEqual({
      value: 'done',
      option: { label: '已完成', value: 'done', dot: 'var(--oas-preset-green)', avatarText: '完' },
    })
  })

  it('chip 键盘等价：↑↓/Enter/Esc 既有回归不破（关闭态 ↓ 展开、Enter 选中、Esc 关闭）', () => {
    const el = chipMount({ variant: 'chip' })
    const btn = trigger(el)
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.getAttribute('value')).toBe('in-progress')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    open(el)
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('下拉选项行渲染 dot / avatarText 首元素（与 chip 触发器同一优先级）', () => {
    const el = chipMount({ variant: 'chip' })
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    const dotRow = rows[0]!.querySelector<HTMLElement>('.chip-dot')
    expect(dotRow?.getAttribute('style') ?? '', '选项行首渲染 dot 并内联背景').toContain('var(--oas-preset-gold)')
    const avRow = rows[2]!.querySelector<HTMLElement>('.chip-avatar')
    expect(avRow?.textContent).toBe('评')
    expect(rows[3]!.querySelectorAll('.chip-dot').length, '行内同样 dot 优先（dot + avatarText 同时给）').toBe(1)
    const icRow = rows[4]!.querySelector<HTMLElement>('.option-icon')
    expect(icRow?.querySelector('svg path')?.getAttribute('d'), '行内回落 icon').toBe('M1 1 L15 15')
    expect(icRow?.getAttribute('aria-hidden')).toBe('true')
  })

  it('非法值清洗：注入面 dot / 空串 dot / 空白 avatarText / 非字符串值一律丢弃不渲染', () => {
    const bad = JSON.stringify([
      { label: '注入', value: 'bad', dot: 'red; background: url(x)' },
      { label: '空点', value: 'empty-dot', dot: '' },
      { label: '空白头像', value: 'blank-avatar', avatarText: '   ' },
      { label: '非字符串', value: 'num', dot: 123 },
    ])
    const el = chipMount({ variant: 'chip', value: 'bad', options: bad })
    expect(trigger(el).querySelector('.chip-dot')).toBeNull()
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows.every((r) => r.querySelector('.chip-dot') === null)).toBe(true)
    expect(rows.every((r) => r.querySelector('.chip-avatar') === null)).toBe(true)
    let detail: { option: Record<string, unknown> } | undefined
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(rows[0] as HTMLElement).click()
    expect('dot' in detail!.option, '清洗后非法 dot 不进数据模型').toBe(false)
  })

  it('avatarText 多字符取首字符；空选项回落既有纯文本渲染', () => {
    const opts = JSON.stringify([
      { label: '指派', value: 'assign', avatarText: '王大明' },
      { label: '普通', value: 'plain' },
    ])
    const el = chipMount({ variant: 'chip', value: 'assign', options: opts })
    expect(trigger(el).querySelector('.chip-avatar')!.textContent).toBe('王')
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(rows[1]!.querySelector('.chip-avatar')).toBeNull()
    expect(rows[1]!.querySelector('.option-icon')).toBeNull()
  })

  it('chip 与 multiple 组合不冲突：多选标签走既有 chip 通道，触发器同步 chip 形态镜像', () => {
    const el = chipMount({ variant: 'chip', multiple: '' })
    open(el)
    const rows = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(rows[0] as HTMLElement).click()
    ;(rows[4] as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['todo', 'settings'])
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(2)
    expect(el.getAttribute('data-variant')).toBe('chip')
  })

  it('reserve-width 计入 dot/avatarText 首元素宽度（带色点选项预留不塌缩）', () => {
    const label = '统一长度的选项标签'
    const plain = mount({ 'reserve-width': '', options: JSON.stringify([{ label, value: 'plain' }]) })
    const dotted = mount({
      'reserve-width': '',
      options: JSON.stringify([{ label, value: 'dot', dot: '#0f0' }]),
    })
    const plainReserve = Number.parseFloat(plain.style.getPropertyValue('--oas-select-reserve'))
    const dotReserve = Number.parseFloat(dotted.style.getPropertyValue('--oas-select-reserve'))
    expect(dotReserve - plainReserve, '预留宽度应补首元素 + 行 gap').toBeGreaterThanOrEqual(18)
  })
})

describe('OASSelect Option.dot / avatarText 子元素通道（oas-option）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function childChipSelect(): OASSelect {
    const el = new OASSelect()
    el.setAttribute('variant', 'chip')
    const opt1 = document.createElement('oas-option')
    opt1.setAttribute('value', 'low')
    opt1.setAttribute('dot', '#ff0000')
    opt1.textContent = '低'
    const opt2 = document.createElement('oas-option')
    opt2.setAttribute('value', 'user')
    opt2.setAttribute('avatar-text', '李四')
    opt2.textContent = '负责人'
    el.append(opt1, opt2)
    document.body.appendChild(el)
    return el
  }

  it('dot / avatar-text 属性映射进数据模型并渲染', () => {
    const el = childChipSelect()
    open(el)
    const rows = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(
      (rows[0]!.querySelector<HTMLElement>('.chip-dot')?.getAttribute('style') ?? '').toLowerCase(),
      'dot 属性映射并内联渲染',
    ).toContain('#ff0000')
    expect(rows[1]!.querySelector<HTMLElement>('.chip-avatar')?.textContent).toBe('李')
  })

  it('运行时改写 dot 属性后下拉与 chip 触发器同步刷新（MutationObserver 通道）', async () => {
    const el = childChipSelect()
    el.setAttribute('value', 'low')
    open(el)
    expect((trigger(el).querySelector<HTMLElement>('.chip-dot')?.getAttribute('style') ?? '').toLowerCase()).toContain(
      '#ff0000',
    )
    const opt = el.querySelector('oas-option')!
    opt.setAttribute('dot', '#00ff00')
    await new Promise((r) => setTimeout(r, 0))
    expect(
      (trigger(el).querySelector<HTMLElement>('.chip-dot')?.getAttribute('style') ?? '').toLowerCase(),
      '运行时改写 dot 同步刷新',
    ).toContain('#00ff00')
  })
})

// 回归：内建命名回退必须走基类 setFallbackInnerLabel——外部 <label for> 已转发名称时让位。
// 关键路径是 update() 直调：value property setter / locale translator 回调都不经
// runUpdateAndNotify 的尾部 re-sync，直写 setAttribute('aria-label') 会踩掉外部名。
describe('外部 label 命名优先级（update 直调路径）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('外部 <label for> + value property + locale 切换都不踩外部名，解除后恢复回退名', async () => {
    const el = mount()
    el.id = 'select-fa-target'
    const label = document.createElement('label')
    label.htmlFor = 'select-fa-target'
    label.textContent = '城市'
    document.body.append(label)
    await new Promise((r) => setTimeout(r, 0))
    expect(trigger(el).getAttribute('aria-label'), '外部 label 已转发').toBe('城市')

    el.value = 'banana' // property setter → 显式 this.update() 直调（无尾部 re-sync）
    expect(trigger(el).getAttribute('aria-label'), 'value property 赋值不得踩外部名').toBe('城市')

    setLocale(en) // translator 变更 → this.update() 直调
    expect(trigger(el).getAttribute('aria-label'), 'locale 切换不得踩外部名').toBe('城市')

    setLocale('zh-CN')
    label.remove()
    await new Promise((r) => setTimeout(r, 0))
    el.value = 'orange'
    expect(trigger(el).getAttribute('aria-label'), '外部 label 解除后恢复内建回退名').toBe('请选择')
  })
})
