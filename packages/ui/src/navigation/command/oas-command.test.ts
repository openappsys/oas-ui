import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASCommand, type CommandItem } from './index.js'

const ITEMS = JSON.stringify([
  { label: '新建文件', value: 'new-file', keywords: ['create', 'file'] },
  { label: '打开文件', value: 'open-file', group: '文件' },
  { label: '保存文件', value: 'save', group: '文件' },
  { label: '撤销', value: 'undo', group: '编辑' },
])

function mount(attrs: Record<string, string> = {}): OASCommand {
  const el = new OASCommand()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function overlay(el: OASCommand): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')!
}

function search(el: OASCommand): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('[part="search"]')!
}

function options(el: OASCommand): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
}

function fireInput(el: OASCommand, value: string): void {
  search(el).value = value
  search(el).dispatchEvent(new Event('input'))
}

/** shadow 内查询（happy-dom 的 querySelector 返回 Element，统一收窄到 HTMLElement 才能访问 .hidden） */
function q(el: OASCommand, sel: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(sel)
}

function esc(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

function arrow(el: OASCommand, key: 'ArrowDown' | 'ArrowUp' | 'Enter' | 'Backspace'): void {
  search(el).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function lastEvent<T>(el: OASCommand, type: string): CustomEvent<T> | null {
  let out: CustomEvent<T> | null = null
  el.addEventListener(type, (e: Event) => (out = e as CustomEvent<T>))
  return out
}

describe('OASCommand', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    try {
      localStorage.clear()
    } catch {
      /* 无 localStorage 环境跳过 */
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认关闭；open 后显示面板并自动聚焦搜索框', () => {
    const el = mount()
    expect(overlay(el).hidden).toBe(true)
    el.setAttribute('open', '')
    expect(overlay(el).hidden).toBe(false)
    // happy-dom 下 document.activeElement 回退到宿主，用 shadowRoot.activeElement 断言真实聚焦元素
    expect(el.shadowRoot!.activeElement).toBe(search(el))
  })

  it('渲染 items 为选项（role=listbox/option）', () => {
    const el = mount({ open: '' })
    expect(el.shadowRoot!.querySelectorAll('[role="listbox"]').length).toBe(1)
    expect(options(el).length).toBe(4)
    expect(options(el)[0]!.getAttribute('role')).toBe('option')
  })

  it('渲染分组标题（group）', () => {
    const el = mount({ open: '' })
    const groups = [...el.shadowRoot!.querySelectorAll('.group')].map((g) => g.textContent)
    expect(groups).toEqual(['文件', '编辑'])
  })

  it('搜索按 label 过滤', () => {
    const el = mount({ open: '' })
    fireInput(el, '打开')
    expect(options(el).map((o) => o.textContent)).toEqual(['打开文件'])
  })

  it('搜索匹配 keywords', () => {
    const el = mount({ open: '' })
    fireInput(el, 'create')
    expect(options(el).map((o) => o.textContent)).toEqual(['新建文件'])
  })

  it('无匹配显示空态文案（含搜索词）', () => {
    const el = mount({ open: '' })
    fireInput(el, 'zzz')
    expect(options(el).length).toBe(0)
    const emptyText = q(el, '.empty-text')!
    expect(emptyText.textContent).toBe('未找到与「zzz」匹配的命令')
    expect(q(el, '.empty')!.hidden).toBe(false)
  })

  it('空查询 + 无 items 显示基础空态文案', () => {
    const el = mount({ open: '', items: '[]' })
    expect(el.shadowRoot!.querySelector('.empty-text')!.textContent).toBe('无匹配命令')
  })

  it('搜索后分组标题跟随过滤结果', () => {
    const el = mount({ open: '' })
    fireInput(el, '文件')
    expect(options(el).map((o) => o.textContent)).toEqual(['新建文件', '打开文件', '保存文件'])
    expect(el.shadowRoot!.querySelectorAll('.group').length).toBe(1)
  })

  it('ArrowDown/ArrowUp 移动高亮，aria-activedescendant 跟随', () => {
    const el = mount({ open: '' })
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(options(el)[1]!.classList.contains('active')).toBe(true)
    expect(search(el).getAttribute('aria-activedescendant')).toBe(options(el)[1]!.id)
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(options(el)[0]!.classList.contains('active')).toBe(true)
  })

  it('Enter 执行当前项：派发 oas-select 并关闭', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'ArrowDown')
    arrow(el, 'Enter')
    expect(detail).toEqual({ value: 'open-file' })
    expect(overlay(el).hidden).toBe(true)
    expect(el.hasAttribute('open')).toBe(false)
  })

  // ============ activeIndex 与过滤结果竞态（Enter 命中旧索引） ============

  /** 重排样本：过滤 'file' 后顺序变为 File A → File B → Zulu（keywords 命中的排最后） */
  const REORDER_ITEMS = JSON.stringify([
    { label: 'Zulu', value: 'zulu', keywords: ['file'] },
    { label: 'Yankee', value: 'yankee' },
    { label: 'Xray', value: 'xray' },
    { label: 'File A', value: 'file-a' },
    { label: 'File B', value: 'file-b' },
  ])

  it('过滤结果重排：activeIndex 归零，Enter 命中当前首项而非旧索引项', () => {
    const el = mount({ open: '', items: REORDER_ITEMS })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    // 旧索引 1 = Yankee
    arrow(el, 'ArrowDown')
    expect(options(el)[1]!.getAttribute('data-value')).toBe('yankee')
    // 受控 value 外部回写（非输入事件路径）：结果重排且长度变化
    el.setAttribute('value', 'file')
    expect(options(el).map((o) => o.getAttribute('data-value'))).toEqual(['file-a', 'file-b', 'zulu'])
    // 旧 activeIndex=1 会落到 File B；归零后应是首项 File A
    expect(options(el)[0]!.classList.contains('active')).toBe(true)
    expect(options(el)[1]!.classList.contains('active')).toBe(false)
    arrow(el, 'Enter')
    expect(detail).toEqual({ value: 'file-a' })
  })

  it('过滤结果缩短：activeIndex 夹取到有效范围（0），Enter 命中当前首项', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'ArrowDown')
    arrow(el, 'ArrowDown')
    expect(options(el)[2]!.classList.contains('active')).toBe(true)
    // 缩到 1 项：旧索引 2 越界
    el.setAttribute('value', '撤销')
    expect(options(el).map((o) => o.getAttribute('data-value'))).toEqual(['undo'])
    expect(options(el)[0]!.classList.contains('active')).toBe(true)
    arrow(el, 'Enter')
    expect(detail).toEqual({ value: 'undo' })
  })

  it('items 列表重建：activeIndex 归零，Enter 命中新列表首项', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'ArrowDown')
    arrow(el, 'ArrowDown')
    expect(options(el)[2]!.getAttribute('data-value')).toBe('save')
    el.setAttribute(
      'items',
      JSON.stringify([
        { label: '甲', value: 'a' },
        { label: '乙', value: 'b' },
        { label: '丙', value: 'c' },
        { label: '丁', value: 'd' },
      ]),
    )
    expect(options(el)[0]!.classList.contains('active')).toBe(true)
    // 键盘上下移动语义不变：归零后 ArrowDown 落到第二项
    arrow(el, 'ArrowDown')
    expect(options(el)[1]!.classList.contains('active')).toBe(true)
    arrow(el, 'Enter')
    expect(detail).toEqual({ value: 'b' })
  })

  it('列表未变化的重渲染不清除方向键高亮（仅结果变化才归零）', () => {
    const el = mount({ open: '' })
    arrow(el, 'ArrowDown')
    expect(options(el)[1]!.classList.contains('active')).toBe(true)
    // 与列表内容无关的属性变化 → update/renderList 重跑，但不该抹掉当前高亮
    el.setAttribute('close-on-select', 'false')
    expect(options(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('点击选项同样选中并关闭', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[0]!.click()
    expect(detail).toEqual({ value: 'new-file' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('Escape 关闭面板', () => {
    const el = mount({ open: '' })
    esc()
    expect(overlay(el).hidden).toBe(true)
  })

  it('⌘K / Ctrl+K 切换打开状态', () => {
    const el = mount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('焦点陷阱：Tab 在搜索框与选项之间循环', () => {
    const el = mount({ open: '' })
    search(el).focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(options(el)[0])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(options(el)[1])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(el.shadowRoot!.activeElement).toBe(options(el)[0])
  })

  it('disabled 项 Enter 不可选中', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '只读项', value: 'ro', disabled: true },
        { label: '可用项', value: 'ok' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    // 初始 active=0（只读项），Enter 不可选中
    arrow(el, 'Enter')
    expect(fired).toBe(0)
  })

  it('方向键跳过 disabled 项', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '可用项1', value: 'a' },
        { label: '只读项', value: 'ro', disabled: true },
        { label: '可用项2', value: 'b' },
      ]),
    })
    arrow(el, 'ArrowDown')
    expect(options(el)[2]!.classList.contains('active')).toBe(true)
  })

  it('items 数据变化增量重渲染', () => {
    const el = mount({ open: '' })
    el.setAttribute(
      'items',
      JSON.stringify([
        { label: '新增', value: 'add' },
        { label: '删除', value: 'del' },
      ]),
    )
    expect(options(el).map((o) => o.textContent)).toEqual(['新增', '删除'])
  })

  // ============ 图标 / 快捷键标注 / description / 分隔符 ============

  it('项图标（icon 字段渲染 svg）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '打开文件', value: 'open', icon: 'M4 4 L12 12' }]),
    })
    const svg = options(el)[0]!.querySelector('.option-icon svg')
    expect(svg!.tagName.toLowerCase()).toBe('svg')
    expect(options(el)[0]!.textContent).toBe('打开文件')
  })

  it('快捷键标注（shortcut 字段渲染右对齐 kbd）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '打开文件', value: 'open', shortcut: 'ctrl+p' }]),
    })
    const kbd = options(el)[0]!.querySelector('.option-shortcut kbd')!
    expect(kbd.textContent).toContain('⌃')
    expect(kbd.textContent).toContain('P')
  })

  it('meta+p 快捷键显示 ⌘ 符号', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '打开文件', value: 'open', shortcut: 'meta+p' }]),
    })
    expect(options(el)[0]!.querySelector('.option-shortcut kbd')!.textContent).toContain('⌘')
  })

  it('description 副标题渲染', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '打开文件', value: 'open', description: '打开最近文档' }]),
    })
    expect(options(el)[0]!.querySelector('.option-desc')!.textContent).toBe('打开最近文档')
  })

  it('separator 项渲染分隔行且不可导航/不可选中', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: 'A', value: 'a' },
        { label: '', value: 'sep', separator: true },
        { label: 'B', value: 'b' },
      ]),
    })
    expect(el.shadowRoot!.querySelectorAll('[part="separator"]').length).toBe(1)
    expect(options(el).map((o) => o.getAttribute('data-value'))).toEqual(['a', 'b'])
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    // 方向键不落在分隔行（A → B 直接跳）
    arrow(el, 'ArrowDown')
    expect(options(el)[1]!.classList.contains('active')).toBe(true)
    expect(fired).toBe(0)
  })

  // ============ loading 态 ============

  it('loading 态：显示占位行并置 aria-busy', () => {
    const el = mount({ open: '', loading: '' })
    expect(el.shadowRoot!.querySelector('[role="listbox"]')!.getAttribute('aria-busy')).toBe('true')
    expect(el.shadowRoot!.querySelectorAll('.loading-row').length).toBe(1)
    expect(options(el).length).toBe(0)
  })

  // ============ should-filter=false 外部过滤 ============

  it('should-filter=false：输入不本地过滤，全部项保留 + 派发 oas-input', () => {
    const el = mount({ open: '', 'should-filter': 'false' })
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    fireInput(el, '文件')
    expect(detail).toEqual({ value: '文件' })
    expect(options(el).length).toBe(4)
  })

  // ============ 空态插槽 ============

  it('空态插槽：slot="empty" 内容替换默认空态文案', () => {
    const el = mount({ open: '' })
    const custom = document.createElement('div')
    custom.slot = 'empty'
    custom.textContent = '自定义空态'
    el.appendChild(custom)
    fireInput(el, 'zzz')
    const emptyEl = q(el, '.empty')!
    expect(emptyEl.hidden).toBe(false)
    expect(q(el, '.empty-text')!.hidden).toBe(true)
    const slot = q(el, 'slot[name="empty"]') as HTMLSlotElement
    expect(slot.assignedNodes().length).toBe(1)
    expect(slot.assignedNodes()[0]!.textContent).toBe('自定义空态')
  })

  // ============ hotkey 可配置/可关 ============

  it('hotkey 可配置：ctrl+shift+p 才触发', () => {
    const el = mount({ hotkey: 'ctrl+shift+p' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, shiftKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
    // 缺 shift 不触发（严格匹配）
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, shiftKey: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('hotkey 支持多快捷键（逗号分隔）', () => {
    const el = mount({ hotkey: 'ctrl+k, alt+p' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', altKey: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('hotkey="false" 关闭内置监听', () => {
    const el = mount({ hotkey: 'false' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('hotkey 区分显式 meta 与 ctrl（meta+k 不匹配 ctrl 组合）', () => {
    const el = mount({ hotkey: 'meta+k' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  // ============ oas-open-change 事件 ============

  it('oas-open-change：打开与关闭各派发一次', () => {
    const el = mount()
    const opened: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => opened.push((e as CustomEvent<{ open: boolean }>).detail.open))
    el.setAttribute('open', '')
    expect(opened).toEqual([true])
    esc()
    expect(opened).toEqual([true, false])
  })

  it('oas-open-change：选择命令关闭时同样派发', () => {
    const el = mount({ open: '' })
    let detail: { open: boolean } | null = null
    el.addEventListener('oas-open-change', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[0]!.click()
    expect(detail).toEqual({ open: false })
  })

  // ============ 匹配字符高亮 ============

  it('匹配字符高亮：搜索词包 mark 标签，textContent 保持完整', () => {
    const el = mount({ open: '' })
    fireInput(el, '打开')
    const row = options(el)[0]!
    const mark = row.querySelector('mark.hl')!
    expect(mark.textContent).toBe('打开')
    expect(row.textContent).toBe('打开文件')
  })

  // ============ 匹配度打分排序 ============

  it('匹配度打分：label 包含 > keywords 命中，最匹配项排前', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '新建文档', value: 'a', keywords: ['文件'] },
        { label: '打开文件', value: 'b' },
        { label: '关闭', value: 'c' },
      ]),
    })
    fireInput(el, '文件')
    expect(options(el).map((o) => o.textContent)).toEqual(['打开文件', '新建文档'])
  })

  it('label 前缀命中 > label 中间命中', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '打开文件', value: 'b' },
        { label: '文件管理', value: 'a' },
      ]),
    })
    fireInput(el, '文件')
    expect(options(el).map((o) => o.textContent)).toEqual(['文件管理', '打开文件'])
  })

  // ============ limit 渲染上限 ============

  it('limit 限制渲染条数', () => {
    const items = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })))
    const el = mount({ open: '', items, limit: '3' })
    expect(options(el).length).toBe(3)
  })

  // ============ 自定义过滤函数（filter property） ============

  it('filter property 函数接管过滤', () => {
    const el = mount({ open: '' })
    const received: { query: string; count: number }[] = []
    el.filter = (query, items) => {
      received.push({ query, count: items.length })
      return items.filter((i) => i.value === 'open-file')
    }
    // 赋值即触发一次重渲染（query 为空），清空计数只看输入后的调用
    received.length = 0
    fireInput(el, '任意词')
    expect(received).toEqual([{ query: '任意词', count: 4 }])
    expect(options(el).map((o) => o.textContent)).toEqual(['打开文件'])
  })

  // ============ footer ============

  it('footer：打开时显示默认快捷键提示条（含 locale 文案）', () => {
    const el = mount({ open: '' })
    const footer = q(el, '.footer')!
    expect(footer.hidden).toBe(false)
    const hints = q(el, '.hints')!
    expect(hints.hidden).toBe(false)
    expect(hints.textContent).toContain('选择')
    expect(hints.textContent).toContain('执行')
    expect(hints.textContent).toContain('关闭')
  })

  it('footer 插槽：slot="footer" 内容替换提示条', () => {
    const el = mount({ open: '' })
    const custom = document.createElement('div')
    custom.slot = 'footer'
    custom.textContent = '自定义底部'
    el.appendChild(custom)
    expect(q(el, '.hints')!.hidden).toBe(true)
    const slot = q(el, 'slot[name="footer"]') as HTMLSlotElement
    expect(slot.assignedNodes().length).toBe(1)
  })

  it('footer：面板关闭时隐藏', () => {
    const el = mount()
    expect(q(el, '.footer')!.hidden).toBe(true)
    el.setAttribute('open', '')
    expect(q(el, '.footer')!.hidden).toBe(false)
  })

  // ============ value 受控（搜索词双向） ============

  it('value 受控：初始值同步输入框并过滤', () => {
    const el = mount({ open: '', value: '打开' })
    expect(search(el).value).toBe('打开')
    expect(options(el).map((o) => o.textContent)).toEqual(['打开文件'])
  })

  it('value 受控：输入派发 oas-input 且不改属性（宿主回写才生效）', () => {
    const el = mount({ open: '', value: '打开' })
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    fireInput(el, '保存')
    expect(detail).toEqual({ value: '保存' })
    expect(el.getAttribute('value')).toBe('打开')
    // 内部仍实时过滤（宿主回写前也保持响应）
    expect(options(el).map((o) => o.textContent)).toEqual(['保存文件'])
  })

  it('value 受控：外部改属性 → 输入框与列表同步', () => {
    const el = mount({ open: '', value: '打开' })
    el.setAttribute('value', '撤销')
    expect(search(el).value).toBe('撤销')
    expect(options(el).map((o) => o.textContent)).toEqual(['撤销'])
  })

  it('非受控输入不写回 value 属性', () => {
    const el = mount({ open: '' })
    fireInput(el, '打开')
    expect(el.hasAttribute('value')).toBe(false)
  })

  // ============ selected 受控（选中项） ============

  it('selected 受控：外部值定位高亮项', () => {
    const el = mount({ open: '', selected: 'open-file' })
    expect(options(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('selected 受控：方向键派发 oas-active 且不改属性', () => {
    const el = mount({ open: '', selected: 'open-file' })
    let detail: unknown
    el.addEventListener('oas-active', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'ArrowDown')
    expect(detail).toEqual({ value: 'save' })
    expect(el.getAttribute('selected')).toBe('open-file')
  })

  it('非受控方向键同样派发 oas-active', () => {
    const el = mount({ open: '' })
    let detail: unknown
    el.addEventListener('oas-active', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'ArrowDown')
    expect(detail).toEqual({ value: 'open-file' })
  })

  // ============ close-on-select ============

  it('close-on-select="false"：选中后不关闭', () => {
    const el = mount({ open: '', 'close-on-select': 'false' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[0]!.click()
    expect(detail).toEqual({ value: 'new-file' })
    expect(el.hasAttribute('open')).toBe(true)
  })

  // ============ forceMount ============

  it('forceMount 项忽略过滤强制显示（创建型入口）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '打开', value: 'open' },
        { label: '创建「xyz」', value: 'create', forceMount: true },
      ]),
    })
    fireInput(el, 'zzz')
    expect(options(el).map((o) => o.textContent)).toEqual(['创建「xyz」'])
  })

  // ============ 嵌套页面 / 面包屑回退 ============

  it('page 子页：进入子页渲染子项 + 面包屑 + oas-page-change(push)', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '更改主题',
          value: 'theme',
          page: [
            { label: '浅色', value: 'light' },
            { label: '深色', value: 'dark' },
          ],
        },
        { label: '打开', value: 'open' },
      ]),
    })
    let detail: unknown
    el.addEventListener('oas-page-change', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'Enter')
    expect(detail).toEqual({ title: '更改主题', depth: 1, direction: 'push' })
    expect(options(el).map((o) => o.textContent)).toEqual(['浅色', '深色'])
    expect(q(el, '.breadcrumb')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector('.crumbs')!.textContent).toContain('更改主题')
  })

  it('Esc 从子页回退到根（不直接关闭）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '更改主题',
          value: 'theme',
          page: [{ label: '浅色', value: 'light' }],
        },
        { label: '打开', value: 'open' },
      ]),
    })
    let detail: unknown
    el.addEventListener('oas-page-change', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'Enter')
    esc()
    expect(detail).toEqual({ title: '更改主题', depth: 0, direction: 'pop' })
    expect(options(el).map((o) => o.textContent)).toEqual(['更改主题', '打开'])
    // 根层 Esc 才关闭
    esc()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('面包屑返回按钮回退', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '更改主题',
          value: 'theme',
          page: [{ label: '浅色', value: 'light' }],
        },
      ]),
    })
    arrow(el, 'Enter')
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="back"]')!.click()
    expect(options(el).map((o) => o.textContent)).toEqual(['更改主题'])
    expect(q(el, '.breadcrumb')!.hidden).toBe(true)
  })

  it('空搜索词 Backspace 回退子页', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '更改主题',
          value: 'theme',
          page: [{ label: '浅色', value: 'light' }],
        },
      ]),
    })
    arrow(el, 'Enter')
    arrow(el, 'Backspace')
    expect(options(el).map((o) => o.textContent)).toEqual(['更改主题'])
  })

  it('子页内输入搜索词后 Backspace 先删字不回退', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '更改主题',
          value: 'theme',
          page: [{ label: '浅色', value: 'light' }],
        },
      ]),
    })
    arrow(el, 'Enter')
    fireInput(el, '浅')
    expect(options(el).map((o) => o.textContent)).toEqual(['浅色'])
    arrow(el, 'Backspace')
    // 有搜索词：Backspace 不触发回退（搜索词仍在，列表保持过滤）
    expect(options(el).map((o) => o.textContent)).toEqual(['浅色'])
  })

  it('重新打开面板回到根页', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '更改主题',
          value: 'theme',
          page: [{ label: '浅色', value: 'light' }],
        },
      ]),
    })
    arrow(el, 'Enter')
    esc()
    el.setAttribute('open', '')
    expect(options(el).map((o) => o.textContent)).toEqual(['更改主题'])
    expect(q(el, '.breadcrumb')!.hidden).toBe(true)
  })

  // ============ 最近使用 / 历史 ============

  it('recent：选中项记录并按最近优先置顶（去重）', () => {
    const el = mount({ open: '', recent: '' })
    // 依次选中 打开文件 → 保存文件
    options(el)[1]!.click()
    el.setAttribute('open', '')
    options(el)[2]!.click()
    // 重新打开：最近组 [保存文件, 打开文件] 置顶，且原分组不再重复
    el.setAttribute('open', '')
    const labels = options(el).map((o) => o.textContent)
    expect(labels.slice(0, 2)).toEqual(['保存文件', '打开文件'])
    expect(el.shadowRoot!.querySelectorAll('.group')[0]!.textContent).toBe('最近使用')
    // 剩余项不含重复（新建文件 / 撤销；sort 按 UTF-16 码元排序）
    expect(labels.slice(2).sort()).toEqual(['新建文件', '撤销'].sort())
  })

  it('recent：点击最近项可直接执行', () => {
    const el = mount({ open: '', recent: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[1]!.click()
    el.setAttribute('open', '')
    options(el)[0]!.click()
    expect(detail).toEqual({ value: 'open-file' })
  })

  it('recent-storage-key：localStorage 持久化跨实例恢复', () => {
    const el = mount({ open: '', recent: '', 'recent-storage-key': 'demo' })
    options(el)[1]!.click()
    el.remove()
    const el2 = mount({ open: '', recent: '', 'recent-storage-key': 'demo' })
    expect(options(el2)[0]!.textContent).toBe('打开文件')
  })

  // ============ 视图插槽（Raycast 风格面板内视图） ============

  it('view 视图：选中进入视图插槽 + oas-view-change，Esc 回退', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '部署设置', value: 'deploy', view: 'deploy' }]),
    })
    const form = document.createElement('div')
    form.slot = 'view-deploy'
    form.textContent = '表单内容'
    el.appendChild(form)
    let detail: unknown
    el.addEventListener('oas-view-change', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[0]!.click()
    expect(detail).toEqual({ view: 'deploy', title: '部署设置' })
    expect(q(el, '.view')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelectorAll('slot[name="view-deploy"]').length).toBe(1)
    expect(q(el, '.list')!.hidden).toBe(true)
    // Esc 回退列表
    esc()
    expect(q(el, '.view')!.hidden).toBe(true)
    expect(options(el).length).toBe(1)
  })

  // ============ 多选命令（multiple） ============

  it('multiple：点击切换勾选并派发 oas-change', () => {
    const el = mount({ open: '', multiple: '' })
    const values: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => values.push((e as CustomEvent).detail))
    options(el)[0]!.click()
    expect(values[0]).toEqual({ values: ['new-file'] })
    expect(options(el)[0]!.querySelector<HTMLElement>('.check')!.hidden).toBe(false)
    options(el)[1]!.click()
    expect(values[1]).toEqual({ values: ['new-file', 'open-file'] })
    // 再点取消
    options(el)[0]!.click()
    expect(values[2]).toEqual({ values: ['open-file'] })
  })

  it('multiple：确认按钮批量执行 oas-select { values } 并关闭', () => {
    const el = mount({ open: '', multiple: '' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[0]!.click()
    options(el)[1]!.click()
    const confirmBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="confirm"]')!
    expect(confirmBtn.hidden).toBe(false)
    expect(confirmBtn.textContent).toContain('2')
    confirmBtn.click()
    expect(detail).toEqual({ values: ['new-file', 'open-file'] })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('multiple：无勾选时确认按钮隐藏', () => {
    const el = mount({ open: '', multiple: '' })
    expect(q(el, '[part="confirm"]')!.hidden).toBe(true)
  })

  it('multiple：Enter 切换勾选而非执行', () => {
    const el = mount({ open: '', multiple: '' })
    let selected = 0
    el.addEventListener('oas-select', () => selected++)
    arrow(el, 'Enter')
    expect(selected).toBe(0)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.check')!.hidden).toBe(false)
  })

  // ============ 虚拟滚动 ============

  it('virtual：只渲染可见窗口（不渲染全量）', () => {
    const items = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })))
    const el = mount({ open: '', virtual: '', items })
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    expect((vlist as HTMLElement).hidden).toBe(false)
    const rows = [...vlist.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    expect(rows.length).toBeLessThan(100)
    expect(rows.length, '虚拟窗口行数（视口 + 双侧 buffer）').toBe(13)
  })

  it('virtual：键盘导航滚动窗口使高亮可见', async () => {
    const items = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })))
    const el = mount({ open: '', virtual: '', items })
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    for (let i = 0; i < 25; i++) arrow(el, 'ArrowDown')
    const vp = vlist.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    expect(vp.scrollTop).toBe(696)
    vp.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    const rows = [...vlist.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    const activeRow = rows.find((r) => r.classList.contains('active'))
    expect(activeRow?.getAttribute('data-index')).toBe('25')
  })

  it('virtual + 分组：回退非虚拟全量渲染（组标题保留）', () => {
    const items = JSON.stringify([
      { label: '命令 0', value: 'c0', group: 'A' },
      { label: '命令 1', value: 'c1', group: 'A' },
      { label: '命令 2', value: 'c2', group: 'B' },
    ])
    const el = mount({ open: '', virtual: '', items })
    expect(q(el, 'oas-virtual-list')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelectorAll('.group').length).toBe(2)
    expect(options(el).length).toBe(3)
  })

  // ============ 事件防抖防漏 ============

  it('property items 赋值（Vue 桥接通道）', () => {
    const el = mount({ open: '' })
    el.items = [
      { label: '属性项', value: 'prop' },
      { label: '属性项2', value: 'prop2' },
    ]
    expect(options(el).map((o) => o.textContent)).toEqual(['属性项', '属性项2'])
    expect(el.getAttribute('items')).toContain('prop2')
  })

  it('query 公共 getter 可读当前搜索词（空态插槽宿主读取）', () => {
    const el = mount({ open: '' })
    expect(el.query).toBe('')
    fireInput(el, '打开')
    expect(el.query).toBe('打开')
  })

  // ============ 断开重连后 document keydown 幂等重挂 ============

  it('断开重连后 hotkey / Esc 仍生效（document keydown 幂等重挂，update() 恢复）', () => {
    const el = mount()
    el.remove()
    document.body.appendChild(el)
    // 重连后 Ctrl+K 唤起
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
    // Esc 关闭
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('open')).toBe(false)
  })

  // ============ 面板开合过渡动画 ============

  it('开合过渡动画：overlay fade + panel 轻微上移（仅 transform/opacity），reduced-motion 关闭', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('@keyframes oas-command-fade')
    expect(style).toContain('@keyframes oas-command-rise')
    expect(style).toMatch(/transform:\s*translateY\(8px\)/)
    expect(style).toContain('prefers-reduced-motion')
    // 动画只动 transform/opacity（不碰布局属性，杜绝污染测量）
    const rise = style.match(/@keyframes oas-command-rise\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(rise).not.toMatch(/opacity|top|left|width|height|margin|padding/)
    expect(rise).toMatch(/translateY/)
    const fade = style.match(/@keyframes oas-command-fade\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(fade).toMatch(/opacity/)
    expect(fade).not.toMatch(/transform/)
  })

  // ============ search aria-controls ============

  it('search aria-controls 指向 listbox 容器 id（value 身份派生，SSR 确定性）', () => {
    const el = mount({ open: '' })
    const list = q(el, '[part="list"]')!
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.id).toMatch(/^oas-command-list-[0-9a-z]+$/)
    expect(search(el).getAttribute('aria-controls')).toBe(list.id)
  })

  it('aria-controls 在虚拟滚动模式指向虚拟列表容器', () => {
    const items = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })))
    const el = mount({ open: '', virtual: '', items })
    const vlist = el.shadowRoot!.querySelector<HTMLElement>('oas-virtual-list')!
    expect(search(el).getAttribute('aria-controls')).toBe(vlist.id)
  })

  it('多个实例 listbox id：同 value 确定性一致（各自 shadow 内解析，aria-controls 指向自身 list）', () => {
    const a = mount({ open: '' })
    const b = mount({ open: '' })
    const la = q(a, '[part="list"]')!
    const lb = q(b, '[part="list"]')!
    // 维护批 M2 fix round：id 由 value 身份派生——同属性实例 id 一致（SSR 可复现）；
    // 各自 shadow 内解析，aria-controls 均指向自身 shadow 的 list，无串扰
    expect(la.id).toBe(lb.id)
    expect(search(a).getAttribute('aria-controls')).toBe(la.id)
    expect(search(b).getAttribute('aria-controls')).toBe(lb.id)
  })

  it('不同 value 的实例 listbox id 不同（身份属性参与派生）', () => {
    const a = mount({ open: '', value: 'first' })
    const b = mount({ open: '', value: 'second' })
    expect(q(a, '[part="list"]')!.id).not.toBe(q(b, '[part="list"]')!.id)
  })

  // ============ append-to（portal host 独立 shadow + STYLE 注入 + 插槽桥接） ============

  it('append-to：overlay 移入目标容器 portal host（独立 shadow + STYLE 注入），关闭移回无孤儿', () => {
    const target = document.createElement('div')
    target.id = 'cmd-target'
    document.body.appendChild(target)
    const el = mount({ open: '', 'append-to': '#cmd-target' })
    const host = target.querySelector<HTMLElement>('[data-oas-command-portal]')
    // overlay 整体移入 portal shadow（样式作用域保真）
    const hostOverlay = host!.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')
    expect(hostOverlay!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')).toBeNull()
    const portalCss = host!.shadowRoot!.querySelector('style')!.textContent!
    expect(portalCss).toContain('.panel')
    // host 为 pointer-events:none（不吞页面指针），overlay 显式恢复可交互（pointer-events 可继承）
    expect(portalCss).toMatch(/\.overlay\s*\{[^}]*pointer-events:\s*auto/)
    // 关闭：overlay 移回原 shadow，host 移除
    el.removeAttribute('open')
    expect(el.shadowRoot!.querySelectorAll<HTMLElement>('[part="overlay"]').length).toBe(1)
    expect(target.querySelector('[data-oas-command-portal]')).toBeNull()
  })

  it('append-to + slot="footer"：插槽节点桥接到 portal host light DOM，跨 host 分配不断供', () => {
    const target = document.createElement('div')
    target.id = 'cmd-target-2'
    document.body.appendChild(target)
    const el = mount({ open: '', 'append-to': '#cmd-target-2' })
    const custom = document.createElement('span')
    custom.slot = 'footer'
    custom.textContent = '自定义底部'
    el.appendChild(custom)
    // 触发重渲染让 syncPortal 把新插入的插槽节点桥接进 host
    el.setAttribute('items', JSON.stringify([{ label: 'x', value: 'y' }]))
    const host = target.querySelector<HTMLElement>('[data-oas-command-portal]')!
    expect(host.contains(custom)).toBe(true)
    const slot = host.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="footer"]')!
    expect(slot.assignedNodes()).toContain(custom)
    // 自定义底部替换默认提示条（跨 host 分配仍生效）
    expect(host.shadowRoot!.querySelector<HTMLElement>('.hints')!.hidden).toBe(true)
    // 关闭：插槽节点移回宿主，host 无孤儿
    el.removeAttribute('open')
    expect(el.contains(custom)).toBe(true)
    expect(target.querySelector('[data-oas-command-portal]')).toBeNull()
  })

  it('append-to：Tab 焦点陷阱在 portal 模式仍生效（按 portal shadow activeElement 定位循环）', () => {
    const target = document.createElement('div')
    target.id = 'cmd-target-3'
    document.body.appendChild(target)
    const el = mount({ open: '', 'append-to': '#cmd-target-3' })
    const host = target.querySelector<HTMLElement>('[data-oas-command-portal]')!
    const searchInPortal = host.shadowRoot!.querySelector<HTMLInputElement>('[part="search"]')!
    searchInPortal.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    const rows = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    expect(host.shadowRoot!.activeElement).toBe(rows[0])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(host.shadowRoot!.activeElement).toBe(rows[1])
  })

  it('append-to 未命中容器：静默回退自身 shadow（不抛错不孤儿）', () => {
    const el = mount({ open: '', 'append-to': '#cmd-missing' })
    expect(el.shadowRoot!.querySelectorAll<HTMLElement>('[part="overlay"]').length).toBe(1)
    expect(document.querySelector('[data-oas-command-portal]')).toBeNull()
  })
})

// ===== 子元素声明式通道（oas-command-item） =====
// 与 menu/menubar 同范式：items 属性显式设置时数据驱动优先，否则解析子元素收敛到同一渲染路径

/** 子元素通道挂载：innerHTML 填 light DOM 子元素后 append（触发 render → 解析） */
function mountCommandChildren(html: string, attrs: Record<string, string> = {}): OASCommand {
  const el = document.createElement('oas-command') as OASCommand
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('子元素声明式通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    try {
      localStorage.clear()
    } catch {
      /* 无 localStorage 环境跳过 */
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('基础：普通项/分组/separator/shortcut/description 混排渲染与 items 通道一致', () => {
    const el = mountCommandChildren(
      `
      <oas-command-item value="new-file" group="文件" shortcut="meta+n" description="创建空白文档">新建文件</oas-command-item>
      <oas-command-item value="open-file" group="文件" shortcut="ctrl+o">打开文件</oas-command-item>
      <oas-command-item value="sep1" separator>分隔</oas-command-item>
      <oas-command-item value="undo" group="编辑" shortcut="ctrl+z">撤销</oas-command-item>
      `,
      { open: '' },
    )
    const labels = options(el).map((o) => o.querySelector('.option-label')?.textContent)
    expect(labels).toEqual(['新建文件', '打开文件', '撤销'])
    // 分组标题（group 属性映射）
    expect([...el.shadowRoot!.querySelectorAll('.group')].map((g) => g.textContent)).toEqual(['文件', '编辑'])
    // separator 渲染分隔行且不进选项序列
    expect(el.shadowRoot!.querySelectorAll('[part="separator"]').length).toBe(1)
    expect(options(el).length).toBe(3)
    // shortcut kbd（meta → ⌘ 符号映射与 items 通道一致）
    const kbd = options(el)[0]!.querySelector('.option-shortcut kbd')!
    expect(kbd.textContent).toContain('⌘')
    // description 副标题
    expect(options(el)[0]!.querySelector('.option-desc')!.textContent).toBe('创建空白文档')
  })

  it('items 属性显式设置时优先（子元素被忽略）', () => {
    const el = mountCommandChildren(`<oas-command-item value="child">子元素项</oas-command-item>`, {
      open: '',
      items: JSON.stringify([
        { label: '数据项', value: 'data' },
        { label: '末项', value: 'last' },
      ]),
    })
    expect(options(el).map((o) => o.querySelector('.option-label')?.textContent)).toEqual(['数据项', '末项'])
    expect(el.shadowRoot!.querySelector('[data-value="child"]')).toBeNull()
  })

  it('属性映射：keywords 参与搜索、disabled 拦截、forceMount 不过滤', () => {
    const el = mountCommandChildren(
      `
      <oas-command-item value="new" keywords="create, file">新建文件</oas-command-item>
      <oas-command-item value="open">打开文件</oas-command-item>
      <oas-command-item value="ro" disabled>只读项</oas-command-item>
      <oas-command-item value="create-x" force-mount>创建「xyz」</oas-command-item>
      `,
      { open: '' },
    )
    // keywords：逗号拆分 trim 去空，输入关键词词能搜到 label 之外的项（forceMount 项无条件追加尾部）
    fireInput(el, 'create')
    expect(options(el).map((o) => o.textContent)).toEqual(['新建文件', '创建「xyz」'])
    // disabled：方向键跳过（0 新建文件 → 1 打开文件 → 跳过只读项落到 forceMount 项）
    fireInput(el, '')
    arrow(el, 'ArrowDown')
    arrow(el, 'ArrowDown')
    expect(options(el)[3]!.classList.contains('active')).toBe(true)
    // forceMount：无匹配搜索词时仍强制显示
    fireInput(el, 'zzz')
    expect(options(el).map((o) => o.textContent)).toEqual(['创建「xyz」'])
  })

  it('page 子页：带子项的载体 → 选中进入子页、面包屑回退正常', () => {
    const el = mountCommandChildren(
      `
      <oas-command-item value="theme">更改主题
        <oas-command-item value="light">浅色</oas-command-item>
        <oas-command-item value="dark">深色</oas-command-item>
      </oas-command-item>
      <oas-command-item value="open">打开</oas-command-item>
      `,
      { open: '' },
    )
    // 根页 label 不含嵌套子页文本（childLabel 跳过嵌套载体）
    expect(options(el).map((o) => o.querySelector('.option-label')?.textContent)).toEqual(['更改主题', '打开'])
    let detail: unknown
    el.addEventListener('oas-page-change', (e: Event) => (detail = (e as CustomEvent).detail))
    arrow(el, 'Enter')
    expect(detail).toEqual({ title: '更改主题', depth: 1, direction: 'push' })
    expect(options(el).map((o) => o.textContent)).toEqual(['浅色', '深色'])
    expect(q(el, '.breadcrumb')!.hidden).toBe(false)
    // 面包屑返回按钮回退根页
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="back"]')!.click()
    expect(options(el).map((o) => o.querySelector('.option-label')?.textContent)).toEqual(['更改主题', '打开'])
    expect(q(el, '.breadcrumb')!.hidden).toBe(true)
  })

  it('MutationObserver：运行时 append 载体后列表刷新', async () => {
    const el = mountCommandChildren(`<oas-command-item value="a">命令 A</oas-command-item>`, {
      open: '',
    })
    expect(options(el).length).toBe(1)
    const item = document.createElement('oas-command-item')
    item.setAttribute('value', 'b')
    item.textContent = '命令 B'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    expect(options(el).map((o) => o.textContent)).toEqual(['命令 A', '命令 B'])
  })

  it('MutationObserver：运行时修改载体 label 文本后列表刷新', async () => {
    const el = mountCommandChildren(`<oas-command-item value="a">命令 A</oas-command-item>`, {
      open: '',
    })
    expect(options(el).map((o) => o.textContent)).toEqual(['命令 A'])
    const item = el.querySelector('oas-command-item')!
    item.textContent = '命令 A′'
    await new Promise((r) => setTimeout(r, 0))
    expect(options(el).map((o) => o.textContent)).toEqual(['命令 A′'])
  })

  it('view 字段：选中进入面板内嵌视图插槽路径不变', () => {
    const el = mountCommandChildren(`<oas-command-item value="deploy" view="deploy">部署应用</oas-command-item>`, {
      open: '',
    })
    const form = document.createElement('div')
    form.slot = 'view-deploy'
    form.textContent = '表单内容'
    el.appendChild(form)
    let detail: unknown
    el.addEventListener('oas-view-change', (e: Event) => (detail = (e as CustomEvent).detail))
    options(el)[0]!.click()
    expect(detail).toEqual({ view: 'deploy', title: '部署应用' })
    expect(q(el, '.view')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelectorAll('slot[name="view-deploy"]').length).toBe(1)
    expect(q(el, '.list')!.hidden).toBe(true)
  })

  it('防自身动作循环：插槽桥接（append-to）不吞子元素通道响应', async () => {
    const target = document.createElement('div')
    target.id = 'cmd-guard'
    document.body.appendChild(target)
    const el = mountCommandChildren(
      `<oas-command-item value="a">命令 A</oas-command-item>
       <span slot="footer">自定义底部</span>`,
      { open: '', 'append-to': '#cmd-guard' },
    )
    // 首次渲染已把 footer 插槽节点桥接进 portal host（组件自身对 light DOM 的写入）——
    // 该 childList 突变被 isChildChannelMutation 过滤，不产生无谓重渲染/循环
    await new Promise((r) => setTimeout(r, 0))
    const host = target.querySelector<HTMLElement>('[data-oas-command-portal]')!
    expect(host.shadowRoot!.querySelectorAll('slot[name="footer"]').length).toBe(1)
    // 随后 append 数据载体，子元素通道仍正常响应（portal 模式下列表在 portal shadow 内）
    const item = document.createElement('oas-command-item')
    item.setAttribute('value', 'b')
    item.textContent = '命令 B'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    const portalOpts = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    expect(portalOpts.map((o) => o.textContent)).toEqual(['命令 A', '命令 B'])
  })
})

// ===== 移动端触摸目标（coarse pointer 抬升 ≥44px） =====

describe('OASCommand 触摸目标（coarse pointer 抬升）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('coarse pointer 媒体查询进样式表，选项行最小高度走 --oas-touch-target-min（默认 44px）', () => {
    const el = mount({ open: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('@media (pointer: coarse)')
    expect(css).toContain('var(--oas-touch-target-min, 44px)')
    const coarse = css.split('@media (pointer: coarse)')[1]!
    expect(coarse).toContain('.option')
    expect(coarse).toContain('.back')
    expect(coarse).toContain('min-height')
  })

  it('virtual：coarse pointer 下虚拟行高抬到触摸目标下限（步长与实际行高不错位）', () => {
    vi.stubGlobal('matchMedia', ((query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia)
    const items = JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })))
    const el = mount({ open: '', virtual: '', items })
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    // item-height 默认 36，coarse 下抬到 44（--oas-touch-target-min 默认值）
    expect(vlist.getAttribute('item-height')).toBe('44')
    const elCustom = mount({ open: '', virtual: '', items, 'item-height': '56' })
    const vlistCustom = elCustom.shadowRoot!.querySelector('oas-virtual-list')!
    // 宿主显式行高大于触摸下限时尊重宿主值
    expect(vlistCustom.getAttribute('item-height')).toBe('56')
  })
})

// ===== 属性-方法撞名回归（observedAttributes 的 camelCase 与原型方法同名） =====
//
// 机制：宿主框架按 camelCase 做 property 桥接或用户 JS 写 `el.xxx = ...` 会在实例上
// 建自有属性遮蔽原型同名方法，组件内部 `this.xxx()` 随后抛 TypeError。
// 私有方法已改名（recentStorageKey → recentStorageKeyValue）。
describe('OASCommand 属性-方法撞名回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    try {
      localStorage.clear()
    } catch {
      /* 忽略不可用环境 */
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('property 写入 recentStorageKey 后最近使用加载路径不抛错', () => {
    const el = mount({ open: '' })
    ;(el as unknown as Record<string, unknown>).recentStorageKey = 'x'
    expect(() => el.setAttribute('recent', '')).not.toThrow()
    expect(options(el).length, '默认 4 个命令选项').toBe(4)
  })
})

// ===== 多级导航（children 声明式 + levelLoader 动态子级） =====
//
// 契约：children 声明式多级（选中进入下一级，不派发 oas-select，派发 oas-navigate
// { path, level }）；levelLoader 命令式动态子级（声明式优先；Promise 显示加载态；
// 抛错/非法返回 → 错误行 + 重试；同 path 缓存不重复调）；面包屑各级可点跳转；
// Esc 逐级返回（顶层 Esc 关闭不变）；Right/Left 进入/返回。
// 向后兼容：现有 items 无 children 行为一字不变（page/view/select 全链路）。

/** flush microtask + timer（loader Promise 与 setTimeout 混用场景） */
function flush(): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, 0))
}

describe('OASCommand 多级导航', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    try {
      localStorage.clear()
    } catch {
      /* 忽略不可用环境 */
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 三级树：项目 → Alpha → 打开主页；Beta 为叶子命令 */
  const TREE = JSON.stringify([
    {
      label: '项目',
      value: 'projects',
      children: [
        {
          label: 'Alpha',
          value: 'alpha',
          children: [{ label: '打开主页', value: 'alpha-home' }],
        },
        { label: 'Beta', value: 'beta' },
      ],
    },
    { label: '打开设置', value: 'settings' },
  ])

  /** loader 系列树：项目（声明式子级）→ Alpha（children:[] 动态占位，进入触发 loader）；Beta 叶子 */
  const LOADER_TREE = JSON.stringify([
    {
      label: '项目',
      value: 'projects',
      children: [
        { label: 'Alpha', value: 'alpha', children: [] },
        { label: 'Beta', value: 'beta' },
      ],
    },
    { label: '打开设置', value: 'settings' },
  ])

  /** 进入 Alpha 的 loader 级：Enter 项目（声明式第 1 级，Alpha 初始高亮）→ Enter Alpha */
  function enterAlpha(el: OASCommand): void {
    arrow(el, 'Enter') // 项目
    arrow(el, 'Enter') // Alpha
  }

  function navigateEvents(el: OASCommand): Array<{ path: string[]; level: number }> {
    const out: Array<{ path: string[]; level: number }> = []
    el.addEventListener('oas-navigate', (e: Event) => out.push((e as CustomEvent).detail))
    return out
  }

  function crumbs(el: OASCommand): HTMLElement[] {
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.crumb')]
  }

  function crumbButtons(el: OASCommand): HTMLButtonElement[] {
    return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.crumb')]
  }

  it('children 声明式：Enter 进入子级渲染子项，不派发 oas-select、派发 oas-navigate { path, level }', () => {
    const el = mount({ open: '', items: TREE })
    const selects: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => selects.push((e as CustomEvent).detail))
    const nav = navigateEvents(el)
    arrow(el, 'Enter') // 项目
    expect(options(el).map((o) => o.textContent)).toEqual(['Alpha', 'Beta'])
    expect(selects.length).toBe(0)
    expect(nav).toEqual([{ path: ['projects'], level: 1 }])
    expect(q(el, '.breadcrumb')!.hidden).toBe(false)
  })

  it('路径累积：三级导航 path 逐步累积；Esc 逐级回退且 oas-navigate 跟随，顶层 Esc 才关闭', () => {
    const el = mount({ open: '', items: TREE, 'close-on-select': 'false' })
    const nav = navigateEvents(el)
    arrow(el, 'Enter') // → 第 1 级
    arrow(el, 'Enter') // Alpha → 第 2 级
    expect(options(el).map((o) => o.textContent)).toEqual(['打开主页'])
    expect(nav[1]).toEqual({ path: ['projects', 'alpha'], level: 2 })
    // 第三级项是叶子：Enter 执行（select 而非 navigate）
    const selects: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => selects.push((e as CustomEvent).detail))
    arrow(el, 'Enter')
    expect(selects.length).toBe(1)
    esc() // 回到第 1 级（oas-navigate 跟随返回后的层级路径）
    expect(nav[2]).toEqual({ path: ['projects'], level: 1 })
    esc() // 回到根
    expect(nav[3]).toEqual({ path: [], level: 0 })
    expect(q(el, '.breadcrumb')!.hidden).toBe(true)
    esc() // 根层关闭
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('children 清洗：非法项丢弃（label/value 非字符串），合法子级保留', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '父级',
          value: 'parent',
          children: [{ label: '合法', value: 'ok' }, { value: 'no-label' }, { label: 'no-value' }, null, 'str', 42],
        },
      ]),
    })
    arrow(el, 'Enter')
    expect(options(el).map((o) => o.textContent)).toEqual(['合法'])
  })

  it('children 深度上限 8 层：第 8 层可达，更深层截断（截断项为普通命令）', () => {
    // 构造 10 层链：L1(根，第 0 层) → L2(第 1 层) → … → L9(第 8 层) → L10(第 9 层，应截断)
    let item: Record<string, unknown> = { label: 'L10', value: 'l10' }
    for (let i = 9; i >= 1; i--) item = { label: `L${i}`, value: `l${i}`, children: [item] }
    const el = mount({ open: '', items: JSON.stringify([item]) })
    // 逐级进入 8 次：到达第 8 层（L9 所在级）
    for (let level = 1; level <= 8; level++) arrow(el, 'Enter')
    expect(options(el).map((o) => o.textContent)).toEqual(['L9'])
    const selects: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => selects.push((e as CustomEvent).detail))
    arrow(el, 'Enter') // L9 的 children（第 9 层）被截断 → 普通命令执行
    expect(selects.length).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('面包屑各级标题可点击跳转（第 2 级 crumb 点击回第 1 级），当前级为 aria-current 非交互 span', () => {
    const el = mount({ open: '', items: TREE })
    arrow(el, 'Enter')
    arrow(el, 'Enter') // 第 2 级
    const list = crumbs(el)
    expect(list.length).toBe(2)
    // 第 1 级 crumb 是可点按钮；当前级是 aria-current span
    expect(crumbButtons(el).length).toBe(1)
    expect(list[1]!.getAttribute('aria-current')).toBe('location')
    crumbButtons(el)[0]!.click()
    expect(options(el).map((o) => o.textContent)).toEqual(['Alpha', 'Beta'])
    expect(q(el, '.breadcrumb')!.hidden).toBe(false)
  })

  it('面包屑首层图标：入口项 icon 渲染；无 icon 显示内置根图标；次层无 icon 不显示', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '工作区',
          value: 'ws',
          icon: 'M4 4h16v16H4z',
          children: [{ label: '深一层', value: 'deep', children: [{ label: '末梢', value: 'leaf' }] }],
        },
      ]),
    })
    arrow(el, 'Enter')
    let icons = el.shadowRoot!.querySelectorAll<SVGElement>('.crumb svg')
    expect(icons.length).toBe(1)
    expect(icons[0]!.querySelector('path')?.getAttribute('d')).toBe('M4 4h16v16H4z')
    arrow(el, 'Enter')
    icons = el.shadowRoot!.querySelectorAll<SVGElement>('.crumb svg')
    // 第 2 级 crumb（deep 无 icon）不新增图标；首层图标保留
    expect(icons.length).toBe(1)
    expect(icons[0]!.querySelector('path')?.getAttribute('d')).toBe('M4 4h16v16H4z')
    // 无 icon 入口：首层显示内置根图标（svg 存在）
    const el2 = mount({ open: '', items: TREE })
    arrow(el2, 'Enter')
    expect(el2.shadowRoot!.querySelectorAll('.crumb svg').length).toBe(1)
  })

  it('面包屑 nav 语义 + 面板 aria-label 带层级路径；返回根层恢复基础 label', () => {
    const el = mount({ open: '', items: TREE })
    const panel = q(el, '.panel')!
    expect(panel.getAttribute('aria-label')).toBe('命令面板')
    arrow(el, 'Enter')
    const bc = q(el, '.breadcrumb')!
    expect(bc.getAttribute('role')).toBe('navigation')
    expect(panel.getAttribute('aria-label')).toBe('命令面板 — 项目')
    arrow(el, 'Enter')
    expect(panel.getAttribute('aria-label')).toBe('命令面板 — 项目 / Alpha')
    esc()
    expect(panel.getAttribute('aria-label')).toBe('命令面板 — 项目')
  })

  it('ArrowRight 进入子级 / ArrowLeft 返回上级（有子级时才接管，叶子不动光标）', () => {
    const el = mount({ open: '', items: TREE })
    // 叶子项（打开设置高亮中）ArrowRight 不接管
    arrow(el, 'ArrowDown') // 移到 打开设置
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(q(el, '.breadcrumb')!.hidden).toBe(true)
    // ArrowRight 进入
    arrow(el, 'ArrowUp')
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(options(el).map((o) => o.textContent)).toEqual(['Alpha', 'Beta'])
    // ArrowLeft 返回
    search(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(options(el).map((o) => o.textContent)).toEqual(['项目', '打开设置'])
  })

  it('search aria-keyshortcuts 标注键盘操作', () => {
    const el = mount({ open: '', items: TREE })
    const keys = search(el).getAttribute('aria-keyshortcuts') ?? ''
    for (const k of ['ArrowDown', 'ArrowUp', 'Enter', 'ArrowRight', 'ArrowLeft', 'Escape', 'Backspace']) {
      expect(keys).toContain(k)
    }
  })

  it('每级独立过滤：子级搜索只过滤当前级，返回后搜索词清空且父级列表完整', () => {
    const el = mount({ open: '', items: TREE })
    arrow(el, 'Enter')
    fireInput(el, 'alpha')
    expect(options(el).map((o) => o.textContent)).toEqual(['Alpha'])
    arrow(el, 'Enter')
    expect(options(el).map((o) => o.textContent)).toEqual(['打开主页'])
    fireInput(el, '主页')
    expect(options(el).map((o) => o.textContent)).toEqual(['打开主页'])
    arrow(el, 'Backspace') // 有搜索词：Backspace 不回退，列表保持过滤
    expect(options(el).map((o) => o.textContent)).toEqual(['打开主页'])
    // 清空后返回：搜索词复位，父级列表完整
    fireInput(el, '')
    arrow(el, 'Backspace')
    expect(options(el).map((o) => o.textContent)).toEqual(['Alpha', 'Beta'])
    expect(search(el).value).toBe('')
  })

  it('子级空结果显示「返回上级」行，点击回退；根层空态无该行', () => {
    const el = mount({ open: '', items: TREE })
    arrow(el, 'Enter')
    fireInput(el, 'zzz')
    const backRow = q(el, '[part="empty-back"]')!
    expect(backRow.hidden).toBe(false)
    expect(backRow.textContent).toBe('返回上一级')
    backRow.click()
    expect(options(el).map((o) => o.textContent)).toEqual(['项目', '打开设置'])
    // 根层空态：无返回行
    fireInput(el, 'zzz')
    expect(q(el, '[part="empty-back"]')!.hidden).toBe(true)
  })

  it('空 children（[]）无 loader：视为普通命令正常执行（向后兼容）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '占位', value: 'placeholder', children: [] }]),
    })
    const selects: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => selects.push((e as CustomEvent).detail))
    arrow(el, 'Enter')
    expect(selects.length).toBe(1)
    expect(q(el, '.breadcrumb')!.hidden).toBe(true)
  })

  it('空 children（[]）+ levelLoader：进入动态子级（loader 按路径调用）', async () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '动态', value: 'dyn', children: [] }]),
    }) as OASCommand & { levelLoader: unknown }
    const calls: Array<{ path: string[]; index: number }> = []
    el.levelLoader = (ctx: { path: string[]; index: number }) => {
      calls.push({ path: ctx.path, index: ctx.index })
      return [{ label: '动态子项', value: 'dyn-child' }]
    }
    const nav = navigateEvents(el)
    arrow(el, 'Enter')
    await flush()
    expect(calls).toEqual([{ path: ['dyn'], index: 0 }])
    expect(options(el).map((o) => o.textContent)).toEqual(['动态子项'])
    expect(nav).toEqual([{ path: ['dyn'], level: 1 }])
  })

  it('loader 同步返回：直接渲染子级，不显示加载行', async () => {
    const el = mount({ open: '', items: LOADER_TREE }) as OASCommand & { levelLoader: unknown }
    el.levelLoader = () => [{ label: '同步子项', value: 's1' }]
    enterAlpha(el)
    await flush()
    expect(options(el).map((o) => o.textContent)).toEqual(['同步子项'])
    expect(q(el, '.loading-row')).toBeNull()
  })

  it('loader Promise：先显示加载行 + aria-busy，resolve 后渲染子级', async () => {
    const el = mount({ open: '', items: LOADER_TREE }) as OASCommand & { levelLoader: unknown }
    let resolve!: (v: CommandItem[]) => void
    el.levelLoader = () =>
      new Promise<CommandItem[]>((r) => {
        resolve = r
      })
    enterAlpha(el)
    await flush() // loader 已被调用（Promise pending）
    expect(q(el, '[part="loading"]')?.textContent).toContain('正在加载命令…')
    expect(q(el, '.list')!.getAttribute('aria-busy')).toBe('true')
    resolve([{ label: '异步子项', value: 'a1' }])
    await flush()
    expect(options(el).map((o) => o.textContent)).toEqual(['异步子项'])
    expect(q(el, '.list')!.hasAttribute('aria-busy')).toBe(false)
  })

  it('loader 缓存：同 path 退出再进只调用一次；换 loader 自动清缓存', async () => {
    const el = mount({ open: '', items: LOADER_TREE }) as OASCommand & { levelLoader: unknown }
    let calls = 0
    el.levelLoader = () => {
      calls++
      return [{ label: `子项 ${calls}`, value: 'c1' }]
    }
    enterAlpha(el)
    await flush()
    esc() // 回到第 1 级（Alpha 初始高亮）
    await flush()
    arrow(el, 'Enter') // 再进 Alpha：缓存命中，loader 不再调用
    await flush()
    expect(calls).toBe(1)
    expect(options(el).map((o) => o.textContent)).toEqual(['子项 1'])
    // 换 loader：缓存清空，同 path 重新调用
    el.levelLoader = () => [{ label: '新 loader', value: 'c2' }]
    esc() // 回到第 1 级
    await flush()
    arrow(el, 'Enter') // Alpha：cache miss → 新 loader
    await flush()
    expect(options(el).map((o) => o.textContent)).toEqual(['新 loader'])
  })

  it('loader reject：错误行 + 重试按钮（i18n 文案），重试成功后渲染子级', async () => {
    const el = mount({ open: '', items: LOADER_TREE }) as OASCommand & { levelLoader: unknown }
    let fail = true
    el.levelLoader = () =>
      fail ? Promise.reject(new Error('boom')) : Promise.resolve([{ label: '重试成功', value: 'r1' }])
    enterAlpha(el)
    await flush()
    expect(q(el, '[part="error-row"]')?.textContent).toContain('加载失败')
    const retry = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="retry"]')!
    expect(retry.textContent).toBe('重试')
    fail = false
    retry.click()
    await flush()
    expect(options(el).map((o) => o.textContent)).toEqual(['重试成功'])
  })

  it('loader 返回非数组：错误行（不进缓存）', async () => {
    const el = mount({ open: '', items: LOADER_TREE }) as OASCommand & { levelLoader: unknown }
    let calls = 0
    el.levelLoader = (() => {
      calls++
      return 'not-an-array'
    }) as unknown as () => CommandItem[]
    enterAlpha(el)
    await flush()
    expect(q(el, '[part="error-row"]')?.textContent).toContain('加载失败')
    // 非法结果不缓存：重试再次调用
    ;(el as unknown as { levelLoader: () => unknown }).levelLoader = () => {
      calls++
      return [{ label: '第二次成功', value: 'ok' }]
    }
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="retry"]')!.click()
    await flush()
    expect(options(el).map((o) => o.textContent)).toEqual(['第二次成功'])
    expect(calls).toBe(2)
  })

  it('loader 结果清洗：非法项丢弃，合法项渲染', async () => {
    const el = mount({ open: '', items: LOADER_TREE }) as OASCommand & { levelLoader: unknown }
    el.levelLoader = () =>
      Promise.resolve([{ label: '好', value: 'good' }, { value: 'bad' }, 3, undefined] as unknown as CommandItem[])
    enterAlpha(el)
    await flush()
    expect(options(el).map((o) => o.textContent)).toEqual(['好'])
  })

  it('loader pending 期间返回上级：过期结果不应用、不写缓存（再进重新调用）', async () => {
    const el = mount({ open: '', items: LOADER_TREE }) as OASCommand & { levelLoader: unknown }
    let calls = 0
    let resolve!: (v: CommandItem[]) => void
    el.levelLoader = () =>
      new Promise<CommandItem[]>((r) => {
        calls++
        resolve = r
      })
    enterAlpha(el) // Alpha pending
    await flush() // loader 已被调用
    esc() // pending 中返回第 1 级
    resolve([{ label: '过期结果', value: 'stale' }])
    await flush()
    // 第 1 级列表不受过期结果影响
    expect(options(el).map((o) => o.textContent)).toEqual(['Alpha', 'Beta'])
    arrow(el, 'Enter') // 再进 Alpha：过期结果未写缓存 → 第二次调用
    await flush()
    expect(calls).toBe(2)
    expect(q(el, '[part="loading"]')?.textContent).toContain('正在加载命令…')
    resolve([{ label: '新鲜结果', value: 'fresh' }])
    await flush()
    expect(options(el).map((o) => o.textContent)).toEqual(['新鲜结果'])
  })

  it('children 与 page 同存：children 优先（进入派 oas-navigate 而非 oas-page-change）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '双通道',
          value: 'both',
          page: [{ label: 'page 子项', value: 'p1' }],
          children: [{ label: 'children 子项', value: 'c1' }],
        },
      ]),
    })
    const pages: unknown[] = []
    el.addEventListener('oas-page-change', (e: Event) => pages.push((e as CustomEvent).detail))
    const nav = navigateEvents(el)
    arrow(el, 'Enter')
    expect(options(el).map((o) => o.textContent)).toEqual(['children 子项'])
    expect(nav.length).toBe(1)
    expect(pages.length).toBe(0)
  })

  it('page 通道行为不变：进出仍派发 oas-page-change（面包屑与 Esc 回退不受 children 改造影响）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        { label: '更改主题', value: 'theme', page: [{ label: '浅色', value: 'light' }] },
        { label: '打开', value: 'open' },
      ]),
    })
    const pages: unknown[] = []
    el.addEventListener('oas-page-change', (e: Event) => pages.push((e as CustomEvent).detail))
    const nav = navigateEvents(el)
    arrow(el, 'Enter')
    expect(pages).toEqual([{ title: '更改主题', depth: 1, direction: 'push' }])
    expect(nav.length).toBe(0)
    esc()
    expect(pages[1]).toEqual({ title: '更改主题', depth: 0, direction: 'pop' })
    expect(options(el).map((o) => o.textContent)).toEqual(['更改主题', '打开'])
  })

  it('面包屑跳转跨多级（第 3 级点第 1 级 crumb 一次回两级），事件统一派发一次', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '一级',
          value: 'l1',
          children: [
            {
              label: '二级',
              value: 'l2',
              children: [{ label: '三级', value: 'l3', children: [{ label: '末梢', value: 'leaf' }] }],
            },
          ],
        },
      ]),
    })
    const nav = navigateEvents(el)
    arrow(el, 'Enter') // 第 1 级
    arrow(el, 'Enter') // 第 2 级
    arrow(el, 'Enter') // 第 3 级
    expect(options(el).map((o) => o.textContent)).toEqual(['末梢'])
    // crumb = [一级(btn), 二级(btn), 三级(current)]
    expect(crumbs(el).length).toBe(3)
    expect(crumbButtons(el).length).toBe(2)
    crumbButtons(el)[0]!.click() // 一级 → 回两级
    expect(options(el).map((o) => o.textContent)).toEqual(['二级'])
    // 3 次进入 + 1 次跳转（统一一次事件，不逐级派发）
    expect(nav.length).toBe(4)
    expect(nav[3]).toEqual({ path: ['l1'], level: 1 })
  })

  it('view 页 crumb 为当前级非交互（不可点跳回已离开视图），children 级内 view 正常进出', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([
        {
          label: '项目',
          value: 'projects',
          children: [{ label: '部署', value: 'deploy', view: 'deploy' }],
        },
      ]),
    })
    el.innerHTML = '<div slot="view-deploy">部署表单</div>'
    arrow(el, 'Enter') // children 级
    expect(options(el).map((o) => o.textContent)).toEqual(['部署'])
    arrow(el, 'Enter') // 进入 view
    const views = el.shadowRoot!.querySelectorAll<HTMLElement>('.crumb')
    expect(views.length).toBe(2)
    expect(crumbButtons(el).length).toBe(1) // 仅第 1 级可点
    esc() // 退出 view 回 children 级
    expect(options(el).map((o) => o.textContent)).toEqual(['部署'])
  })
})
