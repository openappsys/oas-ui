import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { OASCommand } from './index.js'

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
    expect(el.shadowRoot!.querySelector('[role="listbox"]')).not.toBeNull()
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
    expect(svg).not.toBeNull()
    expect(options(el)[0]!.textContent).toBe('打开文件')
  })

  it('快捷键标注（shortcut 字段渲染右对齐 kbd）', () => {
    const el = mount({
      open: '',
      items: JSON.stringify([{ label: '打开文件', value: 'open', shortcut: 'ctrl+p' }]),
    })
    const kbd = options(el)[0]!.querySelector('.option-shortcut kbd')!
    expect(kbd).not.toBeNull()
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
    expect(el.shadowRoot!.querySelector('.loading-row')).not.toBeNull()
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
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, shiftKey: true }),
    )
    expect(el.hasAttribute('open')).toBe(true)
    // 缺 shift 不触发（严格匹配）
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }))
    expect(el.hasAttribute('open')).toBe(true)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, shiftKey: true }),
    )
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
    el.addEventListener('oas-open-change', (e: Event) =>
      opened.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
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
    expect(mark).not.toBeNull()
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
    const items = JSON.stringify(
      Array.from({ length: 100 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })),
    )
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
    expect(el.shadowRoot!.querySelector('slot[name="view-deploy"]')).not.toBeNull()
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
    const items = JSON.stringify(
      Array.from({ length: 1000 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })),
    )
    const el = mount({ open: '', virtual: '', items })
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    expect((vlist as HTMLElement).hidden).toBe(false)
    const rows = [...vlist.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    expect(rows.length).toBeLessThan(100)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('virtual：键盘导航滚动窗口使高亮可见', async () => {
    const items = JSON.stringify(
      Array.from({ length: 1000 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })),
    )
    const el = mount({ open: '', virtual: '', items })
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    for (let i = 0; i < 25; i++) arrow(el, 'ArrowDown')
    const vp = vlist.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    expect(vp.scrollTop).toBeGreaterThan(0)
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

  it('search aria-controls 指向 listbox 容器 id（组件内生成唯一 id）', () => {
    const el = mount({ open: '' })
    const list = q(el, '[part="list"]')!
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.id).toMatch(/^oas-command-list-\d+$/)
    expect(search(el).getAttribute('aria-controls')).toBe(list.id)
  })

  it('aria-controls 在虚拟滚动模式指向虚拟列表容器', () => {
    const items = JSON.stringify(
      Array.from({ length: 1000 }, (_, i) => ({ label: `命令 ${i}`, value: `c${i}` })),
    )
    const el = mount({ open: '', virtual: '', items })
    const vlist = el.shadowRoot!.querySelector<HTMLElement>('oas-virtual-list')!
    expect(search(el).getAttribute('aria-controls')).toBe(vlist.id)
  })

  it('多个实例 listbox id 唯一', () => {
    const a = mount({ open: '' })
    const b = mount({ open: '' })
    const la = q(a, '[part="list"]')!
    const lb = q(b, '[part="list"]')!
    expect(la.id).not.toBe(lb.id)
  })

  // ============ append-to（portal host 独立 shadow + STYLE 注入 + 插槽桥接） ============

  it('append-to：overlay 移入目标容器 portal host（独立 shadow + STYLE 注入），关闭移回无孤儿', () => {
    const target = document.createElement('div')
    target.id = 'cmd-target'
    document.body.appendChild(target)
    const el = mount({ open: '', 'append-to': '#cmd-target' })
    const host = target.querySelector<HTMLElement>('[data-oas-command-portal]')
    expect(host).not.toBeNull()
    // overlay 整体移入 portal shadow（样式作用域保真）
    const hostOverlay = host!.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')
    expect(hostOverlay).not.toBeNull()
    expect(hostOverlay!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')).toBeNull()
    const portalCss = host!.shadowRoot!.querySelector('style')!.textContent!
    expect(portalCss).toContain('.panel')
    // host 为 pointer-events:none（不吞页面指针），overlay 显式恢复可交互（pointer-events 可继承）
    expect(portalCss).toMatch(/\.overlay\s*\{[^}]*pointer-events:\s*auto/)
    // 关闭：overlay 移回原 shadow，host 移除
    el.removeAttribute('open')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')).not.toBeNull()
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
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')).not.toBeNull()
    expect(document.querySelector('[data-oas-command-portal]')).toBeNull()
  })
})
