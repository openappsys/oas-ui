import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n' // 副作用：注册默认 zh-CN translator（内置文案断言依赖）
import { OASDropdown } from './index.js'
import { OASMenu } from '../menu/index.js' // side effect：确保 oas-menu 已注册

const ITEMS = JSON.stringify([
  { label: '编辑', value: 'edit' },
  { label: '删除', value: 'delete' },
])

const NESTED_ITEMS = JSON.stringify([
  {
    label: '文件',
    value: 'file',
    children: [
      {
        label: '新建',
        value: 'new',
        children: [
          { label: '文件', value: 'new-file' },
          { label: '窗口', value: 'new-window' },
        ],
      },
      { label: '打开', value: 'open' },
    ],
  },
  { label: '编辑', value: 'edit' },
])

function mount(attrs: Record<string, string> = {}): OASDropdown {
  const el = new OASDropdown()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  el.innerHTML = `<button>操作</button>`
  document.body.appendChild(el)
  return el
}

/** 浮层锚点容器（fixed 定位，承载内层 oas-menu） */
function anchorEl(el: OASDropdown): HTMLElement {
  return el.shadowRoot!.querySelector('.menu-anchor')!
}

/** 内层 oas-menu 的影子根 */
function innerMenuRoot(el: OASDropdown): ShadowRoot {
  const menu = el.shadowRoot!.querySelector('oas-menu') as OASMenu
  return menu.shadowRoot!
}

describe('OASDropdown', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示浮层菜单（内层 oas-menu 渲染 items）', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
    expect(innerMenuRoot(el).querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('点击触发切换 open', () => {
    const el = mount()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
  })

  it('选择菜单项派发 oas-select 并关闭', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'edit' })
    expect(el.hasAttribute('open')).toBe(false)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('多级子菜单：hover 级联展开内层菜单子菜单，选中叶子项派发 select', async () => {
    const el = mount({ open: '', items: NESTED_ITEMS })
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const root = innerMenuRoot(el)
    const file = root.querySelector<HTMLElement>('[part="item"][data-value="file"]')!
    file.dispatchEvent(new MouseEvent('mouseenter'))
    const newItem = root.querySelector<HTMLElement>('[part="item"][data-value="new"]')!
    expect(newItem).not.toBeNull()
    newItem.dispatchEvent(new MouseEvent('mouseenter'))
    const windowItem = root.querySelector<HTMLElement>('[part="item"][data-value="new-window"]')!
    expect(windowItem).not.toBeNull()
    windowItem.click()
    expect(detail).toEqual({ value: 'new-window' })
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('关闭后重开：不残留级联子菜单展开态', async () => {
    const el = mount({ open: '', items: NESTED_ITEMS })
    await Promise.resolve()
    const root = innerMenuRoot(el)
    root
      .querySelector<HTMLElement>('[part="item"][data-value="file"]')!
      .dispatchEvent(new MouseEvent('mouseenter'))
    expect(root.querySelectorAll('.item.open').length).toBeGreaterThan(0)
    // 外部点击关闭 → 重开：级联展开态应清空
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('open')).toBe(false)
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(root.querySelectorAll('.item.open').length).toBe(0)
  })
})

// —— P1 补缺：下拉按钮（split 模式）——
// 主按钮 + 拆分箭头按钮：点箭头开菜单，主按钮点击派发 oas-action。

describe('OASDropdown split 下拉按钮', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function arrowBtn(el: OASDropdown): HTMLButtonElement {
    return el.shadowRoot!.querySelector<HTMLButtonElement>('.arrow-btn')!
  }

  it('split 属性列入 observedAttributes', () => {
    expect(OASDropdown.observedAttributes).toContain('split')
  })

  it('渲染箭头按钮；非 split 时隐藏（display:none）', () => {
    const plain = mount()
    const arrow = arrowBtn(plain)
    expect(arrow).not.toBeNull()
    expect(arrow.getAttribute('aria-haspopup')).toBe('menu')
    const css = plain.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/:host\(:not\(\[split\]\)\)\s*\.arrow-btn\s*\{[^}]*display:\s*none/)
    const split = mount({ split: '' })
    expect(split.hasAttribute('split')).toBe(true)
  })

  it('split：点主按钮派发 oas-action 且不打开菜单', () => {
    const el = mount({ split: '' })
    let detail: unknown
    el.addEventListener('oas-action', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.querySelector('button') as HTMLElement).click()
    expect(detail).toBeDefined()
    expect(el.hasAttribute('open')).toBe(false)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('split：点箭头按钮切换菜单', () => {
    const el = mount({ split: '' })
    arrowBtn(el).click()
    expect(el.hasAttribute('open')).toBe(true)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(false)
    arrowBtn(el).click()
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('箭头按钮 aria-expanded 随 open 同步，aria-label 走 locale', () => {
    const el = mount({ split: '' })
    expect(arrowBtn(el).getAttribute('aria-expanded')).toBe('false')
    expect(arrowBtn(el).getAttribute('aria-label')).toBe('打开菜单')
    arrowBtn(el).click()
    expect(arrowBtn(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('split：选择菜单项派发 oas-select 并关闭', async () => {
    const el = mount({ split: '' })
    arrowBtn(el).click()
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(innerMenuRoot(el).querySelector('[part="item"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'edit' })
    expect(el.hasAttribute('open')).toBe(false)
    expect(anchorEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('split：打开菜单后点主按钮不开不关，点箭头关闭', () => {
    const el = mount({ split: '' })
    arrowBtn(el).click()
    expect(el.hasAttribute('open')).toBe(true)
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(true)
    arrowBtn(el).click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('非 split：主按钮点击仍是切换菜单（原行为不变）', () => {
    const el = mount()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(true)
  })
})
