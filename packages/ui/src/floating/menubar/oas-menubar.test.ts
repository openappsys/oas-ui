import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { OASMenubar } from './index.js'

const ITEMS = JSON.stringify([
  {
    label: '文件',
    value: 'file',
    accessKey: 'f',
    children: [
      { label: '新建', value: 'new' },
      { label: '打开', value: 'open' },
      { label: '关闭', value: 'close', disabled: true },
    ],
  },
  {
    label: '编辑',
    value: 'edit',
    accessKey: 'e',
    children: [
      { label: '撤销', value: 'undo' },
      {
        label: '插入',
        value: 'insert',
        children: [
          { label: '日期', value: 'insert-date' },
          { label: '时间', value: 'insert-time' },
        ],
      },
    ],
  },
  { label: '视图', value: 'view', accessKey: 'v', children: [{ label: '全屏', value: 'fullscreen' }] },
])

function mount(attrs: Record<string, string> = {}): OASMenubar {
  const el = new OASMenubar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function bar(el: OASMenubar): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
}

function topItems(el: OASMenubar): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="top-item"]')]
}

/** 所有子菜单项（含级联层级） */
function subItems(el: OASMenubar): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
}

function openSubmenus(el: OASMenubar): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="submenu"].open')]
}

function key(el: OASMenubar, k: string, opts: KeyboardEventInit = {}): void {
  bar(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, ...opts }))
}

describe('OASMenubar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染顶级菜单，role=menubar + aria-label', () => {
    const el = mount()
    expect(bar(el).getAttribute('role')).toBe('menubar')
    expect(bar(el).getAttribute('aria-label')).toBe('菜单栏')
    expect(topItems(el).length).toBe(3)
    expect(topItems(el)[0]!.getAttribute('role')).toBe('menuitem')
  })

  it('点击顶级项展开子菜单，再点收起', () => {
    const el = mount()
    const first = topItems(el)[0]!
    first.click()
    expect(first.getAttribute('aria-expanded')).toBe('true')
    expect(openSubmenus(el).length).toBe(1)
    first.click()
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(openSubmenus(el).length).toBe(0)
  })

  it('hover 顶级项展开子菜单', () => {
    const el = mount()
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(topItems(el)[1]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('鼠标移出菜单栏收起全部', () => {
    const el = mount()
    topItems(el)[0]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(openSubmenus(el).length).toBe(1)
    bar(el).dispatchEvent(new MouseEvent('mouseleave'))
    expect(openSubmenus(el).length).toBe(0)
  })

  it('方向键在顶级项间移动（active 高亮）', () => {
    const el = mount()
    key(el, 'ArrowRight')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowRight')
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowLeft')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('ArrowDown 打开子菜单并聚焦第一子项', () => {
    const el = mount()
    key(el, 'ArrowDown')
    expect(topItems(el)[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.activeElement).toBe(subItems(el)[0])
    expect(subItems(el)[0]!.classList.contains('active')).toBe(true)
  })

  it('子菜单内 ArrowDown 移动、Enter 选中：派发 oas-select 并收起', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowDown') // 打开 文件
    key(el, 'ArrowDown') // 新建 → 打开
    key(el, 'Enter')
    expect(detail).toEqual({ value: 'open' })
    expect(openSubmenus(el).length).toBe(0)
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[0])
  })

  it('键盘导航跳过 disabled 子项', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 文件
    key(el, 'ArrowDown') // 新建
    key(el, 'ArrowDown') // 跳过 关闭(disabled) 回到 新建
    expect(subItems(el)[0]!.classList.contains('active')).toBe(true)
  })

  it('Escape 关闭子菜单并聚焦回顶级项', () => {
    const el = mount()
    key(el, 'ArrowDown')
    expect(openSubmenus(el).length).toBe(1)
    key(el, 'Escape')
    expect(openSubmenus(el).length).toBe(0)
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[0])
  })

  it('ArrowRight 进入级联子菜单，ArrowLeft 逐级返回', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 文件
    key(el, 'ArrowLeft') // 返回顶级
    key(el, 'ArrowRight') // 移到 编辑
    key(el, 'ArrowDown') // 打开 编辑
    key(el, 'ArrowDown') // 撤销 → 插入
    key(el, 'ArrowRight') // 进入 插入 子菜单
    expect(openSubmenus(el).length).toBe(2) // 编辑 + 插入
    expect(el.shadowRoot!.activeElement!.textContent).toContain('日期')
    key(el, 'ArrowLeft') // 返回 插入
    expect(openSubmenus(el).length).toBe(1)
    expect(el.shadowRoot!.activeElement!.textContent).toContain('插入')
  })

  it('子菜单内 ArrowRight 到叶子项时移到下一个顶级项并收起', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 文件
    key(el, 'Enter') // 选中 新建（叶子）→ 收起 + 聚焦回 文件
    key(el, 'ArrowRight') // 移到 编辑
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('Alt + accessKey 打开对应顶级菜单', () => {
    const el = mount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', altKey: true }))
    expect(topItems(el)[1]!.getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.activeElement!.textContent).toContain('撤销')
  })

  it('Alt 单独按下聚焦菜单栏第一项', () => {
    const el = mount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true }))
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[0])
  })

  it('焦点陷阱：子菜单打开时 Tab 在子项间循环', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 文件，聚焦 新建
    const items = subItems(el)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(items[1]) // 打开
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(items[0]) // 循环回 新建
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(el.shadowRoot!.activeElement).toBe(items[1]) // Shift+Tab 反向
  })

  it('roving tabindex：仅当前顶级项可 Tab 到达', () => {
    const el = mount()
    const items = topItems(el)
    expect(items[0]!.getAttribute('tabindex')).toBe('0')
    expect(items[1]!.getAttribute('tabindex')).toBe('-1')
    key(el, 'ArrowRight')
    expect(items[0]!.getAttribute('tabindex')).toBe('-1')
    expect(items[1]!.getAttribute('tabindex')).toBe('0')
  })

  it('items 数据变化增量重渲染', () => {
    const el = mount()
    el.setAttribute('items', JSON.stringify([{ label: '帮助', value: 'help', children: [{ label: '关于', value: 'about' }] }]))
    expect(topItems(el).length).toBe(1)
    expect(topItems(el)[0]!.textContent).toBe('帮助')
  })

  it('value 在 observedAttributes 中（受控属性被观察）', () => {
    expect(OASMenubar.observedAttributes).toContain('value')
  })

  it('受控：外部 setAttribute(value) 即时同步勾选态（不重建 DOM）', () => {
    const el = mount()
    const refs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    const openItem = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    const newItem = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    expect(openItem.getAttribute('aria-checked')).toBe('false')

    el.setAttribute('value', 'open')
    expect(openItem.getAttribute('aria-checked')).toBe('true')
    expect(newItem.getAttribute('aria-checked')).toBe('false')

    el.setAttribute('value', 'new')
    expect(openItem.getAttribute('aria-checked')).toBe('false')
    expect(newItem.getAttribute('aria-checked')).toBe('true')

    // 增量同步：DOM 元素引用保持（未整体重建）
    expect([...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]).toEqual(refs)
  })

  it('受控：value 支持级联子菜单叶子项', () => {
    const el = mount()
    el.setAttribute('value', 'insert-date')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="insert-date"]')!.getAttribute('aria-checked')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="insert-time"]')!.getAttribute('aria-checked')).toBe('false')
  })

  it('非受控：内部点击叶子项写回 value 并派发 oas-select', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const newItem = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    newItem.click()
    expect(el.getAttribute('value')).toBe('new')
    expect(detail).toEqual({ value: 'new' })
    expect(newItem.getAttribute('aria-checked')).toBe('true')
  })
})
