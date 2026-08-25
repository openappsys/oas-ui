import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASMenubar } from './index.js'

// 文件级钩子：覆盖所有 describe（含新增能力测试块）。
// happy-dom 缺陷规避：Document 内部 activeElement symbol 跨测试残留指向已移除
// 子树时，ShadowRoot.activeElement 遍历会崩溃（blur 因 symbol≠getter 结果是 no-op，
// 用 body.focus() 覆盖 symbol 复位）
beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.focus()
  document.body.innerHTML = ''
})

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
  {
    label: '视图',
    value: 'view',
    accessKey: 'v',
    children: [{ label: '全屏', value: 'fullscreen' }],
  },
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
  // 排除水平溢出收纳项「···」（非数据项，part 相同但 data-value="__more__"）
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="top-item"]')].filter(
    (b) => b.dataset.value !== '__more__',
  )
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

  it('click 首开：无开态时 hover 顶级项不展开（需点击首开）', () => {
    const el = mount()
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(topItems(el)[1]!.getAttribute('aria-expanded')).toBe('false')
    expect(openSubmenus(el).length).toBe(0)
  })

  it('click 首开：有开态后 hover 顶级项切换', () => {
    const el = mount()
    topItems(el)[0]!.click()
    expect(openSubmenus(el).length).toBe(1)
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(topItems(el)[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(topItems(el)[1]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('鼠标移出菜单栏收起全部（click 首开后）', () => {
    const el = mount()
    topItems(el)[0]!.click()
    expect(openSubmenus(el).length).toBe(1)
    bar(el).dispatchEvent(new MouseEvent('mouseleave'))
    expect(openSubmenus(el).length).toBe(0)
    expect(el.getAttribute('open')).toBe('')
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
    el.setAttribute(
      'items',
      JSON.stringify([
        { label: '帮助', value: 'help', children: [{ label: '关于', value: 'about' }] },
      ]),
    )
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
    expect(
      el
        .shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="insert-date"]')!
        .getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      el
        .shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="insert-time"]')!
        .getAttribute('aria-checked'),
    ).toBe('false')
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

  it('子菜单视口翻转：样式表含 flip 规则，展开时检测不抛错（行为验证见 qa-regression e2e）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.submenu .submenu.flip-left')
    expect(css).toContain('.submenu.flip-right')
    expect(css).toContain('.submenu.flip-up')
    // 展开一级与级联后 syncSubmenuPositions 在 happy-dom 下安全执行（rect 全 0 不误判翻转）
    const editTop = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="top-item"][data-value="edit"]',
    )!
    editTop.click()
    const insertItem = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="item"][data-value="insert"]',
    )
    expect(insertItem).not.toBeNull()
  })

  // ===== #4 多 radio 组独立 value 作用域（group 项 value 字段作为组 id）=====

  const GROUP_ITEMS = JSON.stringify([
    {
      label: '视图',
      value: 'view',
      accessKey: 'v',
      children: [
        {
          type: 'group',
          label: '模式',
          value: 'mode',
          children: [
            { label: '编辑', value: 'edit' },
            { label: '预览', value: 'preview' },
          ],
        },
        {
          type: 'group',
          label: '主题',
          value: 'theme',
          children: [
            { label: '浅色', value: 'light' },
            { label: '暗色', value: 'dark' },
          ],
        },
      ],
    },
  ])

  it('#4 JSON value 按组作用域：两组各自独立勾选', () => {
    const el = mount({ items: GROUP_ITEMS, value: '{"mode":"preview","theme":"dark"}' })
    const edit = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="edit"]')!
    const preview = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="item"][data-value="preview"]',
    )!
    const light = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="light"]')!
    const dark = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="dark"]')!
    expect(preview.getAttribute('aria-checked')).toBe('true')
    expect(edit.getAttribute('aria-checked')).toBe('false')
    expect(dark.getAttribute('aria-checked')).toBe('true')
    expect(light.getAttribute('aria-checked')).toBe('false')
  })

  it('#4 字符串 value 不穿透组作用域：组内叶子不被全局字符串命中', () => {
    const el = mount({ items: GROUP_ITEMS, value: 'preview' })
    const edit = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="edit"]')!
    const preview = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="item"][data-value="preview"]',
    )!
    const light = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="light"]')!
    const dark = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="dark"]')!
    // 全部叶子都在组内（scope=mode/theme），字符串 value 只命中根作用域，故组内都不勾选（隔离）
    expect(preview.getAttribute('aria-checked')).toBe('false')
    expect(edit.getAttribute('aria-checked')).toBe('false')
    expect(light.getAttribute('aria-checked')).toBe('false')
    expect(dark.getAttribute('aria-checked')).toBe('false')
  })

  it('#4 无组 items + 字符串 value：根作用域叶子按现有全局命中（兼容）', () => {
    const el = mount({ value: 'open' }) // 默认 ITEMS 无 group
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    const newItem = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    expect(open.getAttribute('aria-checked')).toBe('true')
    expect(newItem.getAttribute('aria-checked')).toBe('false')
  })

  it('#4 组内点击写回该组 value（JSON 对象），不影响另一组', () => {
    const el = mount({ items: GROUP_ITEMS, value: '{"mode":"preview","theme":"light"}' })
    const dark = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="dark"]')!
    dark.click()
    // 写回 JSON：mode 组保持 preview，theme 组更新为 dark
    const v = JSON.parse(el.getAttribute('value')!)
    expect(v.mode).toBe('preview')
    expect(v.theme).toBe('dark')
    // 勾选同步
    const preview = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="item"][data-value="preview"]',
    )!
    expect(preview.getAttribute('aria-checked')).toBe('true')
    expect(dark.getAttribute('aria-checked')).toBe('true')
    const light = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="light"]')!
    expect(light.getAttribute('aria-checked')).toBe('false')
  })

  // ===== #5 动作项 kind =====

  const ACTION_ITEMS = JSON.stringify([
    {
      label: '文件',
      value: 'file',
      accessKey: 'f',
      children: [
        { label: '打开', value: 'open', kind: 'action' },
        { label: '保存', value: 'save', kind: 'action' },
        { type: 'divider' },
        { label: '模式', value: 'mode', kind: 'radio' },
        { label: '主题', value: 'theme', kind: 'radio' },
      ],
    },
  ])

  it('#5 kind=action 渲染为 menuitem（无 radio 勾选态、无 aria-checked）', () => {
    const el = mount({ items: ACTION_ITEMS, value: 'mode' })
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    expect(open.getAttribute('role')).toBe('menuitem')
    expect(open.hasAttribute('aria-checked')).toBe(false)
    expect(open.querySelector('.check')).toBeNull()
    const mode = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="mode"]')!
    expect(mode.getAttribute('role')).toBe('menuitemradio')
    expect(mode.getAttribute('aria-checked')).toBe('true')
  })

  it('#5 kind=action 点击不写回 value、不打勾，只 emit oas-select(kind=action)', () => {
    const el = mount({ items: ACTION_ITEMS, value: 'mode' })
    const events: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => events.push((e as CustomEvent).detail))
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    open.click()
    expect(el.getAttribute('value')).toBe('mode') // 未改变
    expect(open.getAttribute('aria-checked')).toBeNull()
    expect(events).toEqual([{ value: 'open', kind: 'action' }])
  })

  it('#5 默认 kind=radio：不带 kind 字段的叶子保持现有行为', () => {
    const el = mount() // 默认 ITEMS 无 kind 字段
    const newItem = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    expect(newItem.getAttribute('role')).toBe('menuitemradio')
    newItem.click()
    expect(el.getAttribute('value')).toBe('new')
    expect(newItem.getAttribute('aria-checked')).toBe('true')
  })

  // ===== #2 shortcut =====

  const SHORTCUT_ITEMS = JSON.stringify([
    {
      label: '文件',
      value: 'file',
      accessKey: 'f',
      children: [
        { label: '新建', value: 'new', shortcut: 'Ctrl+N' },
        { label: '打开', value: 'open', shortcut: 'Ctrl+O' },
        { type: 'divider' },
        { label: '保存', value: 'save', shortcut: 'Ctrl+S', kind: 'action' },
      ],
    },
  ])

  it('#2 shortcut 渲染为右侧 kbd 提示', () => {
    const el = mount({ items: SHORTCUT_ITEMS })
    const newItem = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    const kbd = newItem.querySelector('.shortcut')
    expect(kbd).not.toBeNull()
    expect(kbd!.textContent).toBe('Ctrl+N')
  })

  it('#2 document keydown 命中 shortcut 触发对应项 select', () => {
    const el = mount({ items: SHORTCUT_ITEMS })
    const events: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => events.push((e as CustomEvent).detail))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }))
    expect(events).toEqual([{ value: 'new' }])
    expect(el.getAttribute('value')).toBe('new')
  })

  it('#2 shortcut 不响应无修饰键的裸字母键', () => {
    const el = mount({ items: SHORTCUT_ITEMS })
    let count = 0
    el.addEventListener('oas-select', () => count++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }))
    expect(count).toBe(0)
  })

  it('#19 单键功能键（F1-F12）shortcut 绑定并触发（无修饰键）', () => {
    const el = mount({
      items: JSON.stringify([{ label: '刷新', value: 'refresh', shortcut: 'F9' }]),
    })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }))
    expect(detail).toEqual({ value: 'refresh' })
  })

  it('#19 单键非功能键（Delete/字母等）不绑定、仅展示——不劫持全局输入', () => {
    const el = mount({
      items: JSON.stringify([{ label: '删除', value: 'delete', shortcut: 'Delete' }]),
    })
    let count = 0
    el.addEventListener('oas-select', () => count++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    expect(count).toBe(0)
  })

  it('#2 命中 shortcut 时 preventDefault（不触发浏览器默认）', () => {
    const el = mount({ items: SHORTCUT_ITEMS })
    const ev = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
    document.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })
})

// ===== checkbox 复选项（复用 oas-menu kind=checkbox） =====

const CHECKBOX_ITEMS = JSON.stringify([
  {
    label: '文件',
    value: 'file',
    accessKey: 'f',
    children: [
      { label: '显示网格线', value: 'grid', kind: 'checkbox' },
      { label: '自动换行', value: 'wrap', kind: 'checkbox' },
      { type: 'divider' },
      { label: '保存', value: 'save', kind: 'action' },
      { label: '打开', value: 'open' },
    ],
  },
])

describe('checkbox 复选项', () => {
  it('渲染 menuitemcheckbox + aria-checked 由 value 数组驱动', () => {
    const el = mount({ items: CHECKBOX_ITEMS, value: '["grid"]' })
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    expect(grid.getAttribute('role')).toBe('menuitemcheckbox')
    expect(grid.getAttribute('aria-checked')).toBe('true')
    expect(grid.querySelector('.check--box')).not.toBeNull()
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="wrap"]')!
    expect(wrap.getAttribute('aria-checked')).toBe('false')
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    expect(open.getAttribute('role')).toBe('menuitemradio')
    expect(open.querySelector('.check--box')).toBeNull()
  })

  it('点击切换勾选：value 写回数组 + oas-select detail 带 checked', () => {
    const el = mount({ items: CHECKBOX_ITEMS, value: '["grid"]' })
    const details: unknown[] = []
    el.addEventListener('oas-select', (e) => details.push((e as CustomEvent).detail))
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="wrap"]')!
    wrap.click()
    const v = JSON.parse(el.getAttribute('value')!)
    expect(v).toEqual(['grid', 'wrap'])
    expect(details).toEqual([{ value: 'wrap', checked: true }])
    expect(wrap.getAttribute('aria-checked')).toBe('true')
  })

  it('取消勾选从勾选集移除（checked: false）', () => {
    const el = mount({ items: CHECKBOX_ITEMS, value: '["grid","wrap"]' })
    const details: unknown[] = []
    el.addEventListener('oas-select', (e) => details.push((e as CustomEvent).detail))
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    grid.click()
    const v = JSON.parse(el.getAttribute('value')!)
    expect(v).toEqual(['wrap'])
    expect(details).toEqual([{ value: 'grid', checked: false }])
  })

  it('勾选切换不收起子菜单（连续勾选场景，对比 radio 收起）', () => {
    const el = mount({ items: CHECKBOX_ITEMS })
    topItems(el)[0]!.click()
    expect(openSubmenus(el).length).toBe(1)
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    grid.click()
    expect(openSubmenus(el).length).toBe(1)
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    open.click()
    expect(openSubmenus(el).length).toBe(0)
  })
})

// ===== typeahead 字符定位 =====

describe('typeahead 字符定位', () => {
  it('顶级菜单行按字符跳转（startsWith）', () => {
    const el = mount()
    key(el, '编')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('顶级菜单行连续字符缓冲匹配（"编辑" 命中 label 前缀）', () => {
    const el = mount()
    key(el, '编')
    key(el, '辑')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('子菜单内按字符跳转（startsWith 优先）', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 文件
    key(el, '打')
    expect(subItems(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('typeahead 跳过 disabled 项', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 文件
    key(el, '关') // 关闭(disabled) 被跳过，无命中则保持原项
    expect(subItems(el)[0]!.classList.contains('active')).toBe(true)
  })
})

// ===== 打开项受控（open 属性 + oas-open-change） =====

describe('打开项受控 open', () => {
  it('open 列入 observedAttributes', () => {
    expect(OASMenubar.observedAttributes).toContain('open')
  })

  it('外部 setAttribute(open) 打开/切换/关闭顶级菜单', () => {
    const el = mount()
    el.setAttribute('open', 'file')
    expect(topItems(el)[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(openSubmenus(el).length).toBe(1)
    el.setAttribute('open', 'edit')
    expect(topItems(el)[1]!.getAttribute('aria-expanded')).toBe('true')
    expect(topItems(el)[0]!.getAttribute('aria-expanded')).toBe('false')
    el.setAttribute('open', '')
    expect(openSubmenus(el).length).toBe(0)
  })

  it('内部点击写回 open 属性并派发 oas-open-change（detail.value + open）', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-open-change', (e) => details.push((e as CustomEvent).detail))
    topItems(el)[1]!.click()
    expect(el.getAttribute('open')).toBe('edit')
    expect(details).toEqual([{ value: 'edit', open: true }])
    topItems(el)[1]!.click()
    expect(el.getAttribute('open')).toBe('')
    expect(details).toEqual([
      { value: 'edit', open: true },
      { value: '', open: false },
    ])
  })

  it('hover 切换顶级菜单也派发 oas-open-change', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-open-change', (e) => details.push((e as CustomEvent).detail))
    topItems(el)[0]!.click()
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(details.at(-1)).toEqual({ value: 'edit', open: true })
  })

  it('外部 setAttribute(open) 也派发 oas-open-change（库内受控约定，同 dropdown）', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-open-change', (e) => details.push((e as CustomEvent).detail))
    el.setAttribute('open', 'file')
    expect(details).toEqual([{ value: 'file', open: true }])
  })
})

// ===== trigger 配置 =====

describe('trigger 触发方式', () => {
  it('trigger="hover" 保持 hover 直开（无需先点击）', () => {
    const el = mount({ trigger: 'hover' })
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(topItems(el)[1]!.getAttribute('aria-expanded')).toBe('true')
    expect(openSubmenus(el).length).toBe(1)
  })
})

// ===== 图标（顶级项 + 子项 icon） =====

describe('图标 icon', () => {
  const ICON_ITEMS = JSON.stringify([
    {
      label: '文件',
      value: 'file',
      icon: 'gear',
      children: [{ label: '新建', value: 'new', icon: 'plus' }],
    },
  ])
  it('顶级项与子项渲染 SVG 图标', () => {
    const el = mount({ items: ICON_ITEMS })
    const top = topItems(el)[0]!
    expect(top.querySelector('svg')).not.toBeNull()
    const sub = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    expect(sub.querySelector('svg')).not.toBeNull()
  })
})

// ===== loop 循环开关 =====

describe('loop 循环导航开关', () => {
  it('loop="false"：顶级移动至边界停止不循环', () => {
    const el = mount({ loop: 'false' })
    key(el, 'ArrowLeft') // 已在 0，不循环到末尾
    expect(topItems(el)[0]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowRight')
    key(el, 'ArrowRight')
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowRight') // 边界停止
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
  })

  it('缺省 loop 循环（现有行为保持）', () => {
    const el = mount()
    key(el, 'ArrowLeft') // 从 0 循环到末尾
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
  })
})

// ===== 整栏 disabled =====

describe('整栏 disabled', () => {
  const DISABLED_SHORTCUT_ITEMS = JSON.stringify([
    {
      label: '文件',
      value: 'file',
      accessKey: 'f',
      children: [
        { label: '新建', value: 'new', shortcut: 'Ctrl+N' },
        { label: '保存', value: 'save', shortcut: 'Ctrl+S', kind: 'action' },
      ],
    },
  ])

  it('disabled：点击/键盘/shortcut/accessKey 全部拦截 + aria-disabled', () => {
    const el = mount({ items: DISABLED_SHORTCUT_ITEMS, disabled: '' })
    const events: unknown[] = []
    el.addEventListener('oas-select', (e) => events.push((e as CustomEvent).detail))
    expect(bar(el).getAttribute('aria-disabled')).toBe('true')
    topItems(el)[0]!.click()
    expect(openSubmenus(el).length).toBe(0)
    key(el, 'ArrowRight')
    // 仅 1 个顶级项：键盘不移动、无新项获得 active
    expect(topItems(el).length).toBe(1)
    expect(topItems(el)[0]!.classList.contains('active')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }))
    expect(events).toEqual([])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', altKey: true }))
    expect(openSubmenus(el).length).toBe(0)
  })
})

// ===== 弹出定位 side/align/offset =====

describe('弹出定位 side/align/offset', () => {
  function firstSub(el: OASMenubar): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"][data-parent="file"]')!
  }

  it('side/align 类 + offset 变量应用到一级下拉', () => {
    const el = mount({ side: 'top', align: 'end', offset: '8' })
    topItems(el)[0]!.click()
    const sub = firstSub(el)
    expect(sub.classList.contains('side-top')).toBe(true)
    expect(sub.classList.contains('align-end')).toBe(true)
    expect(sub.style.getPropertyValue('--popup-offset')).toBe('8px')
  })

  it('缺省 side=bottom align=start（水平）', () => {
    const el = mount()
    topItems(el)[0]!.click()
    const sub = firstSub(el)
    expect(sub.classList.contains('side-bottom')).toBe(true)
    expect(sub.classList.contains('align-start')).toBe(true)
  })

  it('orientation="vertical" 缺省 side=right', () => {
    const el = mount({ orientation: 'vertical' })
    topItems(el)[0]!.click()
    expect(firstSub(el).classList.contains('side-right')).toBe(true)
  })
})

// ===== close-on-select 勾选不收起策略 =====

describe('close-on-select', () => {
  it('缺省选中收起（桌面菜单栏共识）', () => {
    const el = mount()
    topItems(el)[0]!.click()
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    open.click()
    expect(openSubmenus(el).length).toBe(0)
  })

  it('close-on-select="false"：选中叶子后子菜单保持展开（连选场景）', () => {
    const el = mount({ 'close-on-select': 'false' })
    topItems(el)[0]!.click()
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    open.click()
    expect(openSubmenus(el).length).toBe(1)
    const newItem = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    newItem.click()
    expect(openSubmenus(el).length).toBe(1)
  })
})

// ===== 竖排 orientation =====

describe('orientation="vertical"', () => {
  it('bar 竖排 + 键盘上下移动顶级、右键开子菜单、左键返回', () => {
    const el = mount({ orientation: 'vertical' })
    expect(bar(el).classList.contains('vertical')).toBe(true)
    key(el, 'ArrowDown')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowRight') // 打开 编辑 子菜单
    expect(topItems(el)[1]!.getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.activeElement!.textContent).toContain('撤销')
    key(el, 'ArrowLeft') // 返回顶级
    expect(openSubmenus(el).length).toBe(0)
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[1])
  })
})

// ===== breakpoint 移动端汉堡收纳 =====

describe('breakpoint 移动端汉堡', () => {
  const origMq = window.matchMedia
  afterEach(() => {
    window.matchMedia = origMq
  })

  function stubMatchMedia(matches: boolean): void {
    window.matchMedia = ((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => true,
    })) as unknown as typeof window.matchMedia
  }

  it('窄宽（<=breakpoint）：bar 隐藏、汉堡按钮渲染，点击展开汉堡菜单', () => {
    stubMatchMedia(true)
    const el = mount({ breakpoint: '600' })
    expect(el.classList.contains('oas-menubar--mobile')).toBe(true)
    expect(bar(el).classList.contains('mobile')).toBe(true)
    const burger = el.shadowRoot!.querySelector<HTMLElement>('[part="hamburger"]')!
    expect(burger).not.toBeNull()
    burger.click()
    const panel = el.shadowRoot!.querySelector<HTMLElement>('.hamburger-panel')!
    expect(panel.classList.contains('open')).toBe(true)
    expect(burger.getAttribute('aria-expanded')).toBe('true')
    expect(panel.querySelectorAll<HTMLElement>('[part="item"]').length).toBeGreaterThan(0)
    // 点击叶子项 → oas-select + 面板收起
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    panel.querySelector<HTMLElement>('[part="item"][data-value="new"]')!.click()
    expect(detail).toEqual({ value: 'new' })
    expect(panel.classList.contains('open')).toBe(false)
  })

  it('宽屏（>breakpoint）：汉堡隐藏、正常 bar', () => {
    stubMatchMedia(false)
    const el = mount({ breakpoint: '600' })
    expect(el.classList.contains('oas-menubar--mobile')).toBe(false)
    expect(bar(el).classList.contains('mobile')).toBe(false)
  })
})

// ===== show-arrow 与方向感知动画 =====

describe('show-arrow 与方向感知动画', () => {
  it('样式表含箭头规则、pop keyframes 与 reduced-motion 降级', () => {
    const el = mount({ 'show-arrow': '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/show-arrow/)
    expect(css).toMatch(/@keyframes oas-menubar-pop/)
    expect(css).toMatch(/prefers-reduced-motion/)
  })

  it('展开时按弹出方向设置 transform-origin（方向感知）', () => {
    const el = mount()
    topItems(el)[0]!.click()
    const sub = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"][data-parent="file"]')!
    expect(sub.style.transformOrigin).toContain('top') // side=bottom → 顶部开口
  })
})

// ===== 子项/顶级叶子 href 真链接 =====

const HREF_ITEMS = JSON.stringify([
  {
    label: '文件',
    value: 'file',
    accessKey: 'f',
    children: [
      { label: '打开文档', value: 'open', href: '/docs/open' },
      { label: '外链', value: 'ext', href: 'https://example.com/x', target: '_blank' },
      { label: '普通项', value: 'plain' },
    ],
  },
  { label: '帮助', value: 'help', href: '/help' },
])

describe('href 真链接', () => {
  it('叶子项带 href 渲染为 <a>（保留 part/data-value 供键盘与同步定位）', () => {
    const el = mount({ items: HREF_ITEMS })
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    expect(open.tagName).toBe('A')
    expect(open.getAttribute('href')).toBe('/docs/open')
    expect(open.getAttribute('part')).toBe('item')
    const plain = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="plain"]')!
    expect(plain.tagName).toBe('LI')
  })

  it('顶级叶子带 href 渲染为 <a>（有子菜单的仍是 button）', () => {
    const el = mount({ items: HREF_ITEMS })
    const help = topItems(el)[1]!
    expect(help.tagName).toBe('A')
    expect(help.getAttribute('href')).toBe('/help')
    expect(help.getAttribute('role')).toBe('menuitem')
    expect(help.getAttribute('tabindex')).toBe('-1') // roving 语义保留
    expect(topItems(el)[0]!.tagName).toBe('BUTTON') // 有子菜单仍是触发器
  })

  it('target="_blank" 自动补 rel="noopener"', () => {
    const el = mount({ items: HREF_ITEMS })
    const ext = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="ext"]')!
    expect(ext.getAttribute('target')).toBe('_blank')
    expect(ext.getAttribute('rel')).toMatch(/noopener/)
  })

  it('href 叶子点击仍派发 oas-select 并写回 value（链接默认跳转不拦截）', () => {
    const el = mount({ items: HREF_ITEMS })
    const events: unknown[] = []
    el.addEventListener('oas-select', (e) => events.push((e as CustomEvent).detail))
    const open = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="open"]')!
    open.click()
    expect(events).toEqual([{ value: 'open' }])
    expect(el.getAttribute('value')).toBe('open')
  })

  it('href 叶子键盘可达：Enter 选中派发 oas-select（键盘导航链路不因标签变化断裂）', () => {
    const el = mount({ items: HREF_ITEMS })
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowDown') // 打开 文件，聚焦首子项 打开文档（href 叶子）
    key(el, 'Enter')
    expect(detail).toEqual({ value: 'open' })
  })
})

// ===== divider 语义互斥 =====

describe('divider 语义', () => {
  it('divider 只保留 role=separator，不设 aria-hidden（二者互斥，aria-hidden 会让 role 对 AT 失效）', () => {
    const el = mount({
      items: JSON.stringify([
        {
          label: '文件',
          value: 'file',
          children: [
            { label: '新建', value: 'new' },
            { type: 'divider' },
            { label: '退出', value: 'quit' },
          ],
        },
      ]),
    })
    const divider = el.shadowRoot!.querySelector<HTMLElement>('[part="divider"]')!
    expect(divider.getAttribute('role')).toBe('separator')
    expect(divider.hasAttribute('aria-hidden')).toBe(false)
  })
})

// ===== 测量污染修复：syncSubmenuPositions 用 offsetWidth/offsetHeight =====

describe('子菜单测量用 offsetWidth（transform 免疫）', () => {
  it('宽度测量走 offsetWidth：rect 全 0（happy-dom 无布局）时仍能按 offsetWidth 判定右侧翻转', () => {
    const el = mount()
    topItems(el)[0]!.click()
    const sub = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"][data-parent="file"]')!
    // 模拟：子菜单很宽/很高（offsetWidth/offsetHeight），视口很小——若用 rect.width/height（=0）不会翻转
    Object.defineProperty(sub, 'offsetWidth', { value: 500, configurable: true })
    Object.defineProperty(sub, 'offsetHeight', { value: 600, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 400, configurable: true })
    topItems(el)[0]!.click() // 收起
    topItems(el)[0]!.click() // 重新展开触发 syncSubmenuPositions
    expect(sub.classList.contains('flip-right')).toBe(true)
    expect(sub.classList.contains('flip-up')).toBe(true) // 底部高度也按 offsetHeight 判定
  })
})

// ===== checkbox indeterminate 半选 =====

const INDETERMINATE_ITEMS = JSON.stringify([
  {
    label: '视图',
    value: 'view',
    accessKey: 'v',
    children: [
      { label: '全选', value: 'all', kind: 'checkbox', indeterminate: true },
      { label: '网格线', value: 'grid', kind: 'checkbox' },
    ],
  },
])

describe('checkbox indeterminate 半选', () => {
  it('indeterminate: true → aria-checked="mixed"，渲染半选减号视觉 CSS', () => {
    const el = mount({ items: INDETERMINATE_ITEMS })
    const all = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="all"]')!
    expect(all.getAttribute('role')).toBe('menuitemcheckbox')
    expect(all.getAttribute('aria-checked')).toBe('mixed')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/aria-checked='mixed'/)
  })

  it('普通 checkbox 不受影响（aria-checked 仍为 true/false）', () => {
    const el = mount({ items: INDETERMINATE_ITEMS, value: '["grid"]' })
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    expect(grid.getAttribute('aria-checked')).toBe('true')
  })
})

// ===== start/end 命名插槽（logo/头像位） =====

describe('start/end 插槽', () => {
  it('bar 内渲染 slot="start"/"end" 容器；无内容时隐藏', () => {
    const el = mount()
    const start = el.shadowRoot!.querySelector<HTMLElement>('[part="bar-start"]')!
    const end = el.shadowRoot!.querySelector<HTMLElement>('[part="bar-end"]')!
    expect(start).not.toBeNull()
    expect(end).not.toBeNull()
    expect(start.hidden).toBe(true)
    expect(end.hidden).toBe(true)
    expect(start.querySelector('slot')!.getAttribute('name')).toBe('start')
  })

  it('有插槽内容时容器显示，键盘方向键跳过装饰内容', () => {
    const el = mount()
    const logo = document.createElement('span')
    logo.slot = 'start'
    logo.textContent = 'LOGO'
    el.appendChild(logo)
    el.setAttribute('items', el.getAttribute('items')!) // 触发 update 重算插槽容器
    const start = el.shadowRoot!.querySelector<HTMLElement>('[part="bar-start"]')!
    expect(start.hidden).toBe(false)
    // 键盘导航：焦点只在导航树（top-item/子项）间移动，不落入插槽容器
    key(el, 'ArrowRight')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowRight')
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowDown') // 打开 视图 子菜单，聚焦首子项
    const openSub = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"].open')!
    expect(openSub.contains(el.shadowRoot!.activeElement)).toBe(true)
    expect(el.shadowRoot!.activeElement!.getAttribute('part')).toBe('item')
  })
})

// ===== 水平溢出收纳（ellipsis） =====

const MANY_ITEMS = JSON.stringify([
  { label: '首页', value: 'home' },
  { label: '产品', value: 'products', children: [{ label: '组件', value: 'components' }] },
  { label: '解决方案', value: 'solutions' },
  { label: '开发者文档', value: 'docs' },
  { label: '关于我们', value: 'about' },
])

describe('水平溢出收纳（ellipsis）', () => {
  it('水平模式渲染「···」收纳项（默认隐藏）；竖排不渲染', () => {
    const el = mount({ items: MANY_ITEMS })
    const more = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="top-item"][data-value="__more__"]',
    )
    expect(more).not.toBeNull()
    expect(more!.hidden).toBe(true)
    const v = mount({ items: MANY_ITEMS, orientation: 'vertical' })
    expect(v.shadowRoot!.querySelector('[data-value="__more__"]')).toBeNull()
  })

  it('零宽环境（SSR/未布局）不判定溢出：clientWidth=0 时项保持可见、「···」保持隐藏，不把误判的收纳态烤进快照', async () => {
    const el = mount({ items: MANY_ITEMS })
    const itemsEl = el.shadowRoot!.querySelector<HTMLElement>('.bar-items')!
    // 模拟 SSR shim 环境：容器 clientWidth=0（无布局）但项 offsetWidth 可读
    // （shim 的元素属性返回非零 offsetWidth，零宽守卫必须拦住这种假溢出）
    Object.defineProperty(itemsEl, 'clientWidth', { value: 0, configurable: true })
    const wraps = [...itemsEl.querySelectorAll<HTMLElement>(':scope > .top-wrap')]
    for (const w of wraps)
      Object.defineProperty(w, 'offsetWidth', { value: 60, configurable: true })
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => requestAnimationFrame(r))
    const collapsed = [...itemsEl.querySelectorAll(':scope > .top-wrap[data-collapsed]')]
    const more = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="top-item"][data-value="__more__"]',
    )
    expect(collapsed, '零宽环境不得给项标 data-collapsed（快照会烤进误判态）').toHaveLength(0)
    expect(more!.hidden, '零宽环境「···」保持隐藏').toBe(true)
  })

  it('容器不足时超宽项收进「···」（data-collapsed + 弹层镜像），点击镜像项派发 oas-select', async () => {
    const el = mount({ items: MANY_ITEMS })
    const itemsEl = el.shadowRoot!.querySelector<HTMLElement>('.bar-items')!
    Object.defineProperty(itemsEl, 'clientWidth', { value: 120, configurable: true })
    const wraps = [...itemsEl.querySelectorAll<HTMLElement>(':scope > .top-wrap')]
    const dataWraps = wraps.filter((w) => w.dataset.value !== '__more__')
    for (const w of dataWraps)
      Object.defineProperty(w, 'offsetWidth', { value: 60, configurable: true })
    const moreWrap = itemsEl.querySelector<HTMLElement>(':scope > .top-wrap[data-value="__more__"]')
    Object.defineProperty(moreWrap!, 'offsetWidth', { value: 40, configurable: true })
    await new Promise((r) => requestAnimationFrame(r))
    const collapsed = dataWraps.filter((w) => w.hasAttribute('data-collapsed'))
    expect(collapsed.length).toBeGreaterThan(0)
    const more = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="top-item"][data-value="__more__"]',
    )!
    expect(more.hidden).toBe(false)
    // 打开「···」弹层：显示被收项镜像
    more.click()
    expect(more.getAttribute('aria-expanded')).toBe('true')
    const moreSub = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="submenu"][data-parent="__more__"]',
    )!
    expect(moreSub.classList.contains('open')).toBe(true)
    const mirrors = moreSub.querySelectorAll<HTMLElement>('[part="item"]')
    expect(mirrors.length).toBe(collapsed.length)
    // 点击镜像项 → oas-select + 收起
    const events: unknown[] = []
    el.addEventListener('oas-select', (e) => events.push((e as CustomEvent).detail))
    ;(mirrors[0] as HTMLElement).click()
    expect(events.length).toBe(1)
    expect(more.getAttribute('aria-expanded')).toBe('false')
  })

  it('选中项被收纳时「···」高亮（child-selected + aria-current）', async () => {
    const el = mount({ items: MANY_ITEMS })
    const itemsEl = el.shadowRoot!.querySelector<HTMLElement>('.bar-items')!
    Object.defineProperty(itemsEl, 'clientWidth', { value: 80, configurable: true })
    const wraps = [...itemsEl.querySelectorAll<HTMLElement>(':scope > .top-wrap')]
    const dataWraps = wraps.filter((w) => w.dataset.value !== '__more__')
    for (const w of dataWraps)
      Object.defineProperty(w, 'offsetWidth', { value: 60, configurable: true })
    await new Promise((r) => requestAnimationFrame(r))
    el.setAttribute('value', 'solutions') // 被收纳项
    await new Promise((r) => requestAnimationFrame(r)) // 等重算「···」高亮
    const more = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="top-item"][data-value="__more__"]',
    )!
    expect(more.classList.contains('child-selected')).toBe(true)
    expect(more.getAttribute('aria-current')).toBe('true')
  })

  it('无溢出时「···」保持隐藏，所有项留在条上', async () => {
    const el = mount({ items: MANY_ITEMS })
    await new Promise((r) => requestAnimationFrame(r))
    const more = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="top-item"][data-value="__more__"]',
    )!
    expect(more.hidden).toBe(true)
    const collapsed = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.top-wrap[data-collapsed]')]
    expect(collapsed.length).toBe(0)
  })

  it('键盘可达：End 移到「···」，ArrowDown 打开弹层聚焦首镜像项，Esc 收回', async () => {
    const el = mount({ items: MANY_ITEMS })
    const itemsEl = el.shadowRoot!.querySelector<HTMLElement>('.bar-items')!
    Object.defineProperty(itemsEl, 'clientWidth', { value: 80, configurable: true })
    const wraps = [...itemsEl.querySelectorAll<HTMLElement>(':scope > .top-wrap')]
    const dataWraps = wraps.filter((w) => w.dataset.value !== '__more__')
    for (const w of dataWraps)
      Object.defineProperty(w, 'offsetWidth', { value: 60, configurable: true })
    await new Promise((r) => requestAnimationFrame(r))
    const more = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="top-item"][data-value="__more__"]',
    )!
    key(el, 'End') // 「···」在顶级导航序列末位，End 直接落到它
    expect(more.classList.contains('active')).toBe(true)
    key(el, 'ArrowDown') // 打开弹层并聚焦首镜像项
    expect(more.getAttribute('aria-expanded')).toBe('true')
    const mirrors = el.shadowRoot!.querySelectorAll<HTMLElement>(
      '[part="submenu"][data-parent="__more__"] [part="item"]',
    )
    expect(mirrors.length).toBeGreaterThan(0)
    expect(el.shadowRoot!.activeElement).toBe(mirrors[0])
    key(el, 'Escape') // 收回并聚焦回「···」
    expect(more.getAttribute('aria-expanded')).toBe('false')
    expect(el.shadowRoot!.activeElement).toBe(more)
  })
})

// ===== typeaheadTimer 断开清理 =====

describe('typeaheadTimer 断开清理', () => {
  it('断开连接时清理 typeahead 定时器（advanceTimers 不抛错、无残留）', () => {
    vi.useFakeTimers()
    const el = mount()
    key(el, '文') // 触发 typeahead 缓冲 + 500ms 定时器
    el.remove()
    expect(() => vi.advanceTimersByTime(600)).not.toThrow()
    vi.useRealTimers()
  })
})

// ===== 子元素声明式通道（oas-menubar-item / oas-menubar-group / oas-menubar-divider） =====
// 与 breadcrumb 试点同范式：items 属性显式设置时数据驱动优先，否则解析子元素收敛到同一渲染路径

/** 子元素通道挂载：innerHTML 填 light DOM 子元素后 append（触发 render → 解析），不设 items 属性 */
function mountMenubarChildren(
  html: string,
  attrs: Record<string, string> = {},
): OASMenubar {
  const el = document.createElement('oas-menubar') as OASMenubar
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('子元素声明式通道', () => {
  it('基础：顶级项/子菜单/分组/divider/嵌套子菜单混排解析渲染，子菜单嵌套可展开', () => {
    const el = mountMenubarChildren(`
      <oas-menubar-item value="file">文件
        <oas-menubar-item value="new">新建</oas-menubar-item>
        <oas-menubar-group label="最近">
          <oas-menubar-item value="recent-a">项目A</oas-menubar-item>
        </oas-menubar-group>
        <oas-menubar-divider></oas-menubar-divider>
        <oas-menubar-item value="quit">退出</oas-menubar-item>
      </oas-menubar-item>
      <oas-menubar-item value="edit">编辑
        <oas-menubar-item value="zoom">缩放
          <oas-menubar-item value="zoom-in">放大</oas-menubar-item>
        </oas-menubar-item>
      </oas-menubar-item>
    `)
    expect(topItems(el).length).toBe(2)
    expect(topItems(el)[0]!.dataset.value).toBe('file')
    expect(topItems(el)[0]!.getAttribute('role')).toBe('menuitem')
    topItems(el)[0]!.click()
    expect(openSubmenus(el).length).toBe(1)
    // 子菜单内：叶子项/组标题/分隔线齐备（作用域限定 bar——hamburger 面板内是同一份 items 副本）
    const fileSub = el.shadowRoot!.querySelector(
      '[part="bar"] .top-wrap[data-value="file"] > [part="submenu"]',
    )!
    expect(fileSub.querySelector('.group-label')).not.toBeNull()
    expect(fileSub.querySelectorAll('[part="divider"]').length).toBe(1)
    const newItem = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="item"][data-value="new"]',
    )!
    expect(newItem.getAttribute('role')).toBe('menuitemradio')
    // 嵌套子菜单：点「缩放」展开级联
    el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="zoom"]')!.click()
    expect(openSubmenus(el).length).toBe(2)
    const zoomIn = el.shadowRoot!.querySelector<HTMLElement>(
      '[part="item"][data-value="zoom-in"]',
    )!
    expect(zoomIn).not.toBeNull()
    zoomIn.click()
    expect(el.getAttribute('value')).toBe('zoom-in')
  })

  it('items 属性显式设置时优先（子元素被忽略）', () => {
    const el = mountMenubarChildren(
      `<oas-menubar-item value="home">首页</oas-menubar-item>`,
      { items: JSON.stringify([{ label: '数据项', value: 'data' }]) },
    )
    expect(topItems(el).length).toBe(1)
    expect(topItems(el)[0]!.dataset.value).toBe('data')
    expect(topItems(el)[0]!.textContent).toBe('数据项')
    expect(el.shadowRoot!.querySelector('[part="top-item"][data-value="home"]')).toBeNull()
  })

  it('属性映射：shortcut 字段映射（kbd 渲染 + document 快捷键触发）、checkbox indeterminate、danger、href', () => {
    const el = mountMenubarChildren(`
      <oas-menubar-item value="edit">编辑
        <oas-menubar-item value="save" shortcut="Ctrl+S">保存</oas-menubar-item>
        <oas-menubar-item value="all" kind="checkbox" indeterminate>全选</oas-menubar-item>
        <oas-menubar-item value="grid" kind="checkbox">网格</oas-menubar-item>
        <oas-menubar-item value="del" danger>删除</oas-menubar-item>
        <oas-menubar-item value="docs" href="/guide">文档</oas-menubar-item>
      </oas-menubar-item>
    `)
    const root = el.shadowRoot!
    // shortcut：kbd 提示 + document 级 keydown 触发 select
    const save = root.querySelector<HTMLElement>('[part="item"][data-value="save"]')!
    expect(save.querySelector('.shortcut')!.textContent).toBe('Ctrl+S')
    const events: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => events.push((e as CustomEvent).detail))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
    expect(events).toEqual([{ value: 'save' }])
    // checkbox indeterminate：aria-checked=mixed + dataset.mixed
    const all = root.querySelector<HTMLElement>('[part="item"][data-value="all"]')!
    expect(all.getAttribute('role')).toBe('menuitemcheckbox')
    expect(all.getAttribute('aria-checked')).toBe('mixed')
    expect(all.dataset.mixed).toBe('true')
    // checkbox 普通勾选：点击写回数组
    const grid = root.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    expect(grid.getAttribute('role')).toBe('menuitemcheckbox')
    grid.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['grid'])
    // danger 红字类
    expect(
      root.querySelector('[part="item"][data-value="del"]')!.classList.contains('danger'),
    ).toBe(true)
    // href 链接项渲染为 <a>
    const docs = root.querySelector<HTMLAnchorElement>('[part="item"][data-value="docs"]')!
    expect(docs.tagName).toBe('A')
    expect(docs.getAttribute('href')).toBe('/guide')
  })

  it('MutationObserver：运行时 append oas-menubar-item 后菜单栏刷新出现新顶级项', async () => {
    const el = mountMenubarChildren(`<oas-menubar-item value="file">文件</oas-menubar-item>`)
    expect(topItems(el).length).toBe(1)
    const item = document.createElement('oas-menubar-item')
    item.setAttribute('value', 'edit')
    item.textContent = '编辑'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    expect(topItems(el).length).toBe(2)
    expect(
      el.shadowRoot!.querySelector('[part="top-item"][data-value="edit"]'),
    ).not.toBeNull()
  })

  it('value 勾选语义：radio 组单选 + checkbox 数组（子元素通道下与 items 通道一致）', () => {
    const el = mountMenubarChildren(
      `
      <oas-menubar-item value="view">视图
        <oas-menubar-group label="模式" value="mode">
          <oas-menubar-item value="preview">预览</oas-menubar-item>
          <oas-menubar-item value="edit">编辑</oas-menubar-item>
        </oas-menubar-group>
        <oas-menubar-item value="grid" kind="checkbox">网格</oas-menubar-item>
      </oas-menubar-item>
    `,
      { value: '{"mode":"preview"}' },
    )
    const root = el.shadowRoot!
    const preview = root.querySelector<HTMLElement>('[part="item"][data-value="preview"]')!
    const edit = root.querySelector<HTMLElement>('[part="item"][data-value="edit"]')!
    expect(preview.getAttribute('aria-checked')).toBe('true')
    expect(edit.getAttribute('aria-checked')).toBe('false')
    edit.click()
    expect(el.getAttribute('value')).toBe('{"mode":"edit"}')
    // menubar value 变化走 syncSelection 增量同步（不重建 DOM），节点直接读
    expect(edit.getAttribute('aria-checked')).toBe('true')
    expect(preview.getAttribute('aria-checked')).toBe('false')
    // checkbox 数组：初始空集，点击写回数组
    const grid = root.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    grid.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['grid'])
  })
})
