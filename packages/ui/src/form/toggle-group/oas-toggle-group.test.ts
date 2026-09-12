import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASToggleGroup } from './index.js'

const ITEMS = JSON.stringify([
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
])

function mount(attrs: Record<string, string> = {}): OASToggleGroup {
  const el = new OASToggleGroup()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function group(el: OASToggleGroup): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="group"]')!
}

function buttons(el: OASToggleGroup): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="item"]')] as HTMLButtonElement[]
}

function key(el: OASToggleGroup, k: string): void {
  group(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
}

describe('OASToggleGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 items 为 radio 语义按钮，aria-checked 跟随 value', () => {
    const el = mount({ value: 'week' })
    const btns = buttons(el)
    expect(btns.length).toBe(3)
    expect(group(el).getAttribute('role')).toBe('radiogroup')
    expect(btns[0]!.getAttribute('role')).toBe('radio')
    expect(btns[0]!.getAttribute('aria-checked')).toBe('false')
    expect(btns[1]!.getAttribute('aria-checked')).toBe('true')
    expect(btns[2]!.getAttribute('aria-checked')).toBe('false')
  })

  it('roving tabindex：单选模式仅选中项可聚焦', () => {
    const el = mount({ value: 'week' })
    const btns = buttons(el)
    expect(btns[0]!.tabIndex).toBe(-1)
    expect(btns[1]!.tabIndex).toBe(0)
    expect(btns[2]!.tabIndex).toBe(-1)
  })

  it('点击切换 value 并派发 oas-change（单选）', () => {
    const el = mount({ value: 'day' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    buttons(el)[2]!.click()
    expect(el.getAttribute('value')).toBe('month')
    expect(detail).toEqual({ value: 'month' })
    expect(buttons(el)[2]!.getAttribute('aria-checked')).toBe('true')
    expect(buttons(el)[0]!.getAttribute('aria-checked')).toBe('false')
  })

  it('单选：点击已选中项不重复派发', () => {
    const el = mount({ value: 'day' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    buttons(el)[0]!.click()
    expect(fired).toBe(0)
  })

  it('disabled 项不可选且 aria-disabled 同步', () => {
    const el = mount({
      items: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
      ]),
    })
    expect(buttons(el)[1]!.getAttribute('aria-disabled')).toBe('true')
    expect(buttons(el)[1]!.tabIndex).toBe(-1)
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    buttons(el)[1]!.click()
    expect(fired).toBe(0)
  })

  it('multiple：checkbox 语义，点击切换多选数组', () => {
    const el = mount({ multiple: '', value: '["day"]' })
    const btns = buttons(el)
    expect(group(el).getAttribute('role')).toBe('group')
    expect(btns[0]!.getAttribute('role')).toBe('checkbox')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[1]!.click()
    expect(el.getAttribute('value')).toBe('["day","week"]')
    expect(detail).toEqual({ value: ['day', 'week'] })
    btns[0]!.click()
    expect(detail).toEqual({ value: ['week'] })
    expect(btns[0]!.getAttribute('aria-checked')).toBe('false')
  })

  it('键盘方向键：单选移动并选中', () => {
    const el = mount({ value: 'day' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowRight')
    expect(el.getAttribute('value')).toBe('week')
    expect(detail).toEqual({ value: 'week' })
    expect(buttons(el)[1]!.getAttribute('aria-checked')).toBe('true')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[1])
    key(el, 'ArrowLeft')
    expect(el.getAttribute('value')).toBe('day')
  })

  it('键盘：多选方向键仅移动焦点，Space 切换选中', () => {
    const el = mount({ multiple: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[1])
    expect(detail).toBeUndefined()
    key(el, ' ')
    expect(detail).toEqual({ value: ['week'] })
  })

  it('value 属性变化增量更新，不重建按钮引用', () => {
    const el = mount({ value: 'day' })
    const first = buttons(el)[0]
    el.setAttribute('value', 'week')
    expect(buttons(el)[0]).toBe(first)
    expect(buttons(el)[1]!.getAttribute('aria-checked')).toBe('true')
    expect(buttons(el)[1]!.tabIndex).toBe(0)
  })

  it('items 属性变化重建列表', () => {
    const el = mount()
    const first = buttons(el)[0]
    el.setAttribute('items', JSON.stringify([{ label: 'x', value: 'x' }]))
    expect(buttons(el)[0]).not.toBe(first)
    expect(buttons(el).length).toBe(1)
  })

  it('空 items 渲染空组不报错', () => {
    const el = mount({ items: '[]' })
    expect(buttons(el).length).toBe(0)
  })
})

describe('OASToggleGroup 子元素声明式通道（oas-toggle-item）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 以 oas-toggle-item 子元素构建切换组，opts: [value, label, extraAttrs?] */
  function childGroup(
    opts: Array<[string, string, Record<string, string>?]>,
    hostAttrs: Record<string, string> = {},
  ): OASToggleGroup {
    const el = new OASToggleGroup()
    for (const [k, v] of Object.entries(hostAttrs)) el.setAttribute(k, v)
    for (const [value, label, attrs] of opts) {
      const item = document.createElement('oas-toggle-item')
      item.setAttribute('value', value)
      item.textContent = label
      for (const [k, v] of Object.entries(attrs ?? {})) item.setAttribute(k, v)
      el.appendChild(item)
    }
    document.body.appendChild(el)
    return el
  }

  it('基础：oas-toggle-item 解析渲染，单选 radio 语义 + aria-checked 跟随 value', () => {
    const el = childGroup(
      [
        ['day', '日'],
        ['week', '周'],
        ['month', '月'],
      ],
      { value: 'week' },
    )
    const btns = buttons(el)
    expect(btns.length).toBe(3)
    expect(btns.map((b) => b.textContent)).toEqual(['日', '周', '月'])
    expect(group(el).getAttribute('role')).toBe('radiogroup')
    expect(btns[0]!.getAttribute('role')).toBe('radio')
    expect(btns[0]!.getAttribute('aria-checked')).toBe('false')
    expect(btns[1]!.getAttribute('aria-checked')).toBe('true')
    // 点击切换 + oas-change（与 items 通道一致）
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[2]!.click()
    expect(el.getAttribute('value')).toBe('month')
    expect(detail).toEqual({ value: 'month' })
  })

  it('items 显式优先：items 属性并存时子元素被忽略', () => {
    const el = new OASToggleGroup()
    el.setAttribute('items', ITEMS)
    const item = document.createElement('oas-toggle-item')
    item.setAttribute('value', 'child-only')
    item.textContent = '子元素独有'
    el.appendChild(item)
    document.body.appendChild(el)
    const btns = buttons(el)
    expect(btns.length).toBe(3)
    expect(btns.every((b) => b.textContent !== '子元素独有')).toBe(true)
  })

  it('属性映射：disabled 拦截选择 + aria-disabled + tabindex=-1，不参与键盘导航', () => {
    const el = childGroup([
      ['a', 'A'],
      ['b', 'B', { disabled: '' }],
    ])
    const btns = buttons(el)
    expect(btns[1]!.getAttribute('aria-disabled')).toBe('true')
    expect(btns[1]!.tabIndex).toBe(-1)
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    btns[1]!.click()
    expect(fired).toBe(0)
    // 键盘方向键跳过禁用项
    key(el, 'ArrowRight')
    expect(btns[0]!.getAttribute('aria-checked')).toBe('true')
  })

  it('MutationObserver：运行时 append oas-toggle-item 后刷新出现新按钮', async () => {
    const el = childGroup([['a', 'A']])
    expect(buttons(el).length).toBe(1)
    const item = document.createElement('oas-toggle-item')
    item.setAttribute('value', 'b')
    item.textContent = 'B'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    expect(buttons(el).length).toBe(2)
    expect(buttons(el)[1]!.textContent).toBe('B')
  })

  it('multiple 语义在子元素通道下不变：checkbox 多选切换 + value 数组', () => {
    const el = childGroup(
      [
        ['bold', '加粗'],
        ['italic', '斜体'],
      ],
      { multiple: '', value: '["bold"]' },
    )
    const btns = buttons(el)
    expect(group(el).getAttribute('role')).toBe('group')
    expect(btns[0]!.getAttribute('role')).toBe('checkbox')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[1]!.click()
    expect(el.getAttribute('value')).toBe('["bold","italic"]')
    expect(detail).toEqual({ value: ['bold', 'italic'] })
    btns[0]!.click()
    expect(detail).toEqual({ value: ['italic'] })
    expect(btns[0]!.getAttribute('aria-checked')).toBe('false')
  })
})

function styleText(el: OASToggleGroup): string {
  return el.shadowRoot!.querySelector('style')!.textContent ?? ''
}

describe('OASToggleGroup 尺寸与形态（size / vertical / attached / spread）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size 镜像 data-size：缺省 medium，非法回落 medium', () => {
    expect(mount({ size: 'small' }).getAttribute('data-size')).toBe('small')
    expect(mount({ size: 'large' }).getAttribute('data-size')).toBe('large')
    expect(mount().getAttribute('data-size')).toBe('medium')
    expect(mount({ size: 'xxl' }).getAttribute('data-size')).toBe('medium')
  })

  it('就近读取 config-provider 注入 size', () => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('size', 'large')
    document.body.appendChild(provider)
    const el = new OASToggleGroup()
    el.setAttribute('items', ITEMS)
    provider.appendChild(el)
    expect(el.getAttribute('data-size')).toBe('large')
  })

  it('CSS：size 档控高/字号走 token', () => {
    const css = styleText(mount())
    expect(css).toMatch(/:host\(\[data-size='small'\]\) \.item\s*{[^}]*--oas-control-height-sm[^}]*--oas-font-size-sm/)
    expect(css).toMatch(/:host\(\[data-size='large'\]\) \.item\s*{[^}]*--oas-control-height-lg[^}]*--oas-font-size-lg/)
  })

  it('vertical：aria-orientation 同步 + CSS 纵向规则', () => {
    const el = mount({ vertical: '' })
    expect(group(el).getAttribute('aria-orientation')).toBe('vertical')
    expect(styleText(el)).toMatch(/:host\(\[vertical\]\) \.group\s*{[^}]*flex-direction:\s*column/)
    el.removeAttribute('vertical')
    expect(group(el).getAttribute('aria-orientation')).toBe(null)
  })

  it('attached：CSS 贴合规则（gap 归零 + 邻接负 margin 逻辑属性 + 圆角合并）', () => {
    const css = styleText(mount({ attached: '' }))
    expect(css).toMatch(/:host\(\[attached\]\) \.group\s*{[^}]*gap:\s*0/)
    expect(css).toMatch(/:host\(\[attached\]\) \.item ~ \.item\s*{[^}]*margin-inline-start:\s*-1px/)
    expect(css).toMatch(/border-start-start-radius:\s*0/)
  })

  it('attached 纵向：margin-block-start 负边距 + 上下圆角合并', () => {
    const css = styleText(mount({ attached: '', vertical: '' }))
    expect(css).toMatch(/:host\(\[attached\]\[vertical\]\) \.item ~ \.item\s*{[^}]*margin-block-start:\s*-1px/)
  })

  it('spread：CSS 满宽均分规则（host flex + item flex 1）', () => {
    const css = styleText(mount({ spread: '' }))
    expect(css).toMatch(/:host\(\[spread\]\)\s*{[^}]*width:\s*100%/)
    expect(css).toMatch(/:host\(\[spread\]\) \.item\s*{[^}]*flex:\s*1 1 0/)
  })
})

describe('OASToggleGroup mandatory（不可全空）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('布尔：多选最后一项不可取消（value 不变、不派发事件）', () => {
    const el = mount({ multiple: '', mandatory: '', value: '["day"]' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    buttons(el)[0]!.click()
    expect(el.getAttribute('value')).toBe('["day"]')
    expect(fired).toBe(0)
    expect(buttons(el)[0]!.getAttribute('aria-checked')).toBe('true')
  })

  it('布尔：多项选中时仍可取消至只剩一项', () => {
    const el = mount({ multiple: '', mandatory: '', value: '["day","week"]' })
    buttons(el)[0]!.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['week'])
  })

  it('布尔：键盘 Space 同样拦截最后一项取消', () => {
    const el = mount({ multiple: '', mandatory: '', value: '["day"]' })
    key(el, 'ArrowRight')
    key(el, 'ArrowLeft')
    key(el, ' ')
    expect(el.getAttribute('value')).toBe('["day"]')
  })

  it('布尔：单选模式无感（现状保持，点已选无操作）', () => {
    const el = mount({ mandatory: '', value: 'day' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    buttons(el)[0]!.click()
    expect(el.getAttribute('value')).toBe('day')
    expect(fired).toBe(0)
  })

  it('force：空 value 自动选第一个非禁用项并回写（不派发 oas-change）', () => {
    const el = mount({ mandatory: 'force' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    expect(el.getAttribute('value')).toBe('day')
    expect(fired).toBe(0)
    expect(buttons(el)[0]!.getAttribute('aria-checked')).toBe('true')
  })

  it('force：首项禁用时跳过选第一个可用项', () => {
    const el = mount({
      mandatory: 'force',
      items: JSON.stringify([
        { label: 'a', value: 'a', disabled: true },
        { label: 'b', value: 'b' },
        { label: 'c', value: 'c' },
      ]),
    })
    expect(el.getAttribute('value')).toBe('b')
    expect(buttons(el)[1]!.getAttribute('aria-checked')).toBe('true')
  })

  it('force：multiple 空数组自动选第一项（数组回写）', () => {
    const el = mount({ multiple: '', mandatory: 'force' })
    expect(el.getAttribute('value')).toBe('["day"]')
  })

  it('force：外部清空 value 后再兜底', () => {
    const el = mount({ mandatory: 'force', value: 'week' })
    el.setAttribute('value', '')
    expect(el.getAttribute('value')).toBe('day')
  })

  it('force：value 指向不存在项时视为空态兜底', () => {
    const el = mount({ mandatory: 'force', value: 'ghost' })
    expect(el.getAttribute('value')).toBe('day')
  })

  it('force 蕴含布尔拦截：唯一选中项不可取消', () => {
    const el = mount({ multiple: '', mandatory: 'force', value: '["week"]' })
    buttons(el)[1]!.click()
    expect(el.getAttribute('value')).toBe('["week"]')
  })

  it('缺省（无 mandatory）：空态保持为空，行为不变', () => {
    const el = mount()
    expect(el.getAttribute('value') ?? '').toBe('')
  })
})

describe('OASToggleGroup max-count（多选上限）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('达上限：未选项置灰 aria-disabled，点击拦截并派发 oas-exceed-limit（detail 带值与上限）', () => {
    const el = mount({ multiple: '', 'max-count': '2', value: '["day","week"]' })
    const btns = buttons(el)
    expect(btns[2]!.getAttribute('aria-disabled')).toBe('true')
    let detail: unknown
    el.addEventListener('oas-exceed-limit', (e: Event) => (detail = (e as CustomEvent).detail))
    btns[2]!.click()
    expect(el.getAttribute('value')).toBe('["day","week"]')
    expect(detail).toEqual({ value: 'month', max: 2 })
  })

  it('达上限：已选项仍可取消', () => {
    const el = mount({ multiple: '', 'max-count': '2', value: '["day","week"]' })
    buttons(el)[0]!.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['week'])
  })

  it('取消一项后未选项恢复可选', () => {
    const el = mount({ multiple: '', 'max-count': '2', value: '["day","week"]' })
    buttons(el)[0]!.click()
    expect(buttons(el)[2]!.getAttribute('aria-disabled')).toBe('false')
    buttons(el)[2]!.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['week', 'month'])
  })

  it('键盘 Space 超限同样拦截派发', () => {
    const el = mount({ multiple: '', 'max-count': '1', value: '["day"]' })
    let fired = 0
    el.addEventListener('oas-exceed-limit', () => fired++)
    key(el, 'ArrowRight')
    key(el, ' ')
    expect(fired).toBe(1)
    expect(el.getAttribute('value')).toBe('["day"]')
  })

  it('未达上限时无置灰', () => {
    const el = mount({ multiple: '', 'max-count': '3', value: '["day"]' })
    expect(buttons(el)[1]!.getAttribute('aria-disabled')).toBe('false')
  })

  it('单选模式 max-count 不生效', () => {
    const el = mount({ 'max-count': '1', value: 'day' })
    let fired = 0
    el.addEventListener('oas-exceed-limit', () => fired++)
    buttons(el)[1]!.click()
    expect(el.getAttribute('value')).toBe('week')
    expect(fired).toBe(0)
  })

  it('非法/0 值视为无上限', () => {
    const a = mount({ multiple: '', 'max-count': 'abc', value: '["day","week"]' })
    expect(buttons(a)[2]!.getAttribute('aria-disabled')).toBe('false')
    const b = mount({ multiple: '', 'max-count': '0', value: '["day","week"]' })
    expect(buttons(b)[2]!.getAttribute('aria-disabled')).toBe('false')
  })
})

describe('OASToggleGroup 项图标（icon / icon-only / ariaLabel）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('items icon 字段渲染内联 SVG + has-icon 类', () => {
    const el = mount({
      items: JSON.stringify([{ label: '列表', value: 'list', icon: 'menu' }]),
    })
    const b = buttons(el)[0]!
    expect(b.classList.contains('has-icon')).toBe(true)
    expect(b.querySelector('.icon svg')!.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(b.querySelector('.icon')!.getAttribute('aria-hidden')).toBe('true')
    expect(b.textContent).toBe('列表')
  })

  it('icon-only 项（无 label）：icon-only 类 + aria-label 兜底图标名', () => {
    const el = mount({
      items: JSON.stringify([{ value: 'list', icon: 'menu' }]),
    })
    const b = buttons(el)[0]!
    expect(b.classList.contains('icon-only')).toBe(true)
    expect(b.getAttribute('aria-label')).toBe('menu')
  })

  it('ariaLabel 字段覆盖可访问名（有 label 时也生效）', () => {
    const el = mount({
      items: JSON.stringify([{ label: '列表', value: 'list', icon: 'menu', ariaLabel: '切换列表视图' }]),
    })
    expect(buttons(el)[0]!.getAttribute('aria-label')).toBe('切换列表视图')
  })

  it('非法图标名静默按纯文字处理', () => {
    const el = mount({
      items: JSON.stringify([{ label: 'x', value: 'x', icon: 'nope' }]),
    })
    const b = buttons(el)[0]!
    expect(b.classList.contains('has-icon')).toBe(false)
    expect(b.querySelector('.icon')).toBe(null)
  })

  it('子元素通道：icon 属性解析渲染，aria-label 属性映射 ariaLabel', () => {
    const el = new OASToggleGroup()
    const a = document.createElement('oas-toggle-item')
    a.setAttribute('value', 'list')
    a.setAttribute('icon', 'menu')
    a.textContent = '列表'
    el.appendChild(a)
    const b = document.createElement('oas-toggle-item')
    b.setAttribute('value', 'star')
    b.setAttribute('icon', 'star')
    b.setAttribute('aria-label', '切换收藏视图')
    el.appendChild(b)
    document.body.appendChild(el)
    const btns = buttons(el)
    expect(btns[0]!.classList.contains('has-icon')).toBe(true)
    expect(btns[0]!.querySelector('.icon svg')).not.toBe(null)
    expect(btns[1]!.classList.contains('icon-only')).toBe(true)
    expect(btns[1]!.getAttribute('aria-label')).toBe('切换收藏视图')
  })

  it('CSS：icon-only 等宽 + 图标文字间距', () => {
    const css = styleText(mount())
    expect(css).toMatch(/\.item\.icon-only\s*{[^}]*aspect-ratio:\s*1/)
    expect(css).toMatch(/\.item\.has-icon\s*{[^}]*gap/)
  })
})

describe('OASToggleGroup 键盘 Home/End', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('单选：Home 选中第一项、End 选中最后项', () => {
    const el = mount({ value: 'week' })
    key(el, 'End')
    expect(el.getAttribute('value')).toBe('month')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[2])
    key(el, 'Home')
    expect(el.getAttribute('value')).toBe('day')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[0])
  })

  it('多选：Home/End 仅移焦点不选中', () => {
    const el = mount({ multiple: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'End')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[2])
    expect(detail).toBeUndefined()
    key(el, 'Home')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[0])
    expect(detail).toBeUndefined()
  })

  it('首项禁用时 Home 落到第一个可用项', () => {
    const el = mount({
      value: 'b',
      items: JSON.stringify([
        { label: 'a', value: 'a', disabled: true },
        { label: 'b', value: 'b' },
        { label: 'c', value: 'c' },
      ]),
    })
    key(el, 'Home')
    expect(el.getAttribute('value')).toBe('b')
    expect(el.shadowRoot!.activeElement).toBe(buttons(el)[1])
  })
})

describe('OASToggleGroup 组可访问名与配色（aria-label / color / status）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('宿主 aria-label 属性覆盖 locale 兜底', () => {
    const el = mount({ 'aria-label': '视图切换' })
    expect(group(el).getAttribute('aria-label')).toBe('视图切换')
    el.removeAttribute('aria-label')
    expect(group(el).getAttribute('aria-label')).not.toBe('视图切换')
  })

  it('color：预设名/字面值注入 host 内联变量（含 on-color 亮度计算）', () => {
    const a = mount({ color: 'geekblue' })
    expect(a.style.getPropertyValue('--oas-toggle-color')).toBe('var(--oas-preset-geekblue)')
    const b = mount({ color: '#7c3aed' })
    expect(b.style.getPropertyValue('--oas-toggle-color')).toBe('#7c3aed')
    expect(b.style.getPropertyValue('--oas-toggle-on-color')).toBe('#ffffff')
    b.removeAttribute('color')
    expect(b.style.getPropertyValue('--oas-toggle-color')).toBe('')
  })

  it('status：镜像 data-status + error 联动 aria-invalid（所有权清理）', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(el.getAttribute('aria-invalid')).toBe('true')
    el.setAttribute('status', 'success')
    expect(el.getAttribute('aria-invalid')).toBe(null)
    el.removeAttribute('status')
    expect(el.getAttribute('data-status')).toBe(null)
  })

  it('CSS：选中态引用 --oas-toggle-color 兜底链 + data-status 边框规则', () => {
    const css = styleText(mount())
    expect(css).toMatch(/\.item\[aria-checked='true'\]\s*{[^}]*var\(--oas-toggle-color,\s*var\(--oas-color-primary\)\)/)
    expect(css).toMatch(/:host\(\[data-status='success'\]\) \.item\s*{[^}]*--oas-color-success/)
    // error 与宿主 aria-invalid 等效通道并列（选择器列表），匹配时允许逗号续行
    expect(css).toMatch(/:host\(\[data-status='error'\]\) \.item[^{]*{[^}]*--oas-color-danger/)
  })
})
