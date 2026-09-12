import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTreeSelect } from './index.js'

const OPTIONS = JSON.stringify([
  {
    label: '前端',
    value: 'fe',
    children: [
      {
        label: '框架',
        value: 'framework',
        children: [
          { label: 'React', value: 'react' },
          { label: 'Vue', value: 'vue' },
        ],
      },
      { label: '样式', value: 'css' },
    ],
  },
  { label: '后端', value: 'be', children: [{ label: 'Node', value: 'node' }] },
])

function mount(attrs: Record<string, string> = {}): OASTreeSelect {
  const el = new OASTreeSelect()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASTreeSelect): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function nodes(el: OASTreeSelect): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('.node')] as HTMLElement[]
}

function byLabel(el: OASTreeSelect, label: string): HTMLElement {
  return [...el.shadowRoot!.querySelectorAll('.node')].find((n) => n.textContent?.includes(label)) as HTMLElement
}

function rowLabels(el: OASTreeSelect): string {
  return nodes(el)
    .map((n) => n.querySelector('.label')?.textContent ?? '')
    .join('|')
}

describe('OASTreeSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger + 树面板，点击展开显示树节点', async () => {
    const el = mount()
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    trigger(el).click()
    expect(nodes(el).length).toBeGreaterThanOrEqual(2)
  })

  it('多选：勾选叶子更新 value 数组并派发 oas-change（含 labels）', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    byLabel(el, '前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel(el, '框架')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel(el, 'React').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toContain('react')
    expect(detail).toEqual({ value: ['react'], labels: ['React'] })
  })

  it('多选勾选父节点级联选中全部子节点', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    const fe = nodes(el)[0]!
    fe.click()
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value).toContain('fe')
    expect(value).toContain('framework')
    expect(value).toContain('react')
    expect(value).toContain('css')
  })

  it('单选：点击节点 value 为该值并关闭', () => {
    const el = mount()
    trigger(el).click()
    const fe = nodes(el)[0]!
    fe.querySelector('.toggle')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const cssNode = [...el.shadowRoot!.querySelectorAll('.node')].find((n) =>
      n.textContent?.includes('样式'),
    ) as HTMLElement
    cssNode.click()
    expect(el.getAttribute('value')).toBe('css')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })

  it('多选回显为 chip 标签（可单个移除）', () => {
    const el = mount({ multiple: '', value: '["vue","react"]' })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip:not(.chip-plus)')]
    expect(chips.length).toBe(2)
    expect(chips[0]!.textContent).toContain('Vue')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(chips[1]!.querySelector('button') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['vue'])
    expect(detail).toEqual({ value: ['vue'], labels: ['Vue'] })
  })

  it('多选 Backspace 删除末尾值', () => {
    const el = mount({ multiple: '', value: '["vue","react"]' })
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['vue'])
  })

  it('max-tag-count：超出数量折叠为 +N（title 含隐藏标签）', () => {
    const el = mount({ multiple: '', value: '["vue","react","css"]', 'max-tag-count': '1' })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip:not(.chip-plus)')]
    expect(chips.length).toBe(1)
    const plus = el.shadowRoot!.querySelector('.chip-plus')!
    expect(plus.textContent).toBe('+2')
    expect(plus.getAttribute('title')).toContain('React')
    expect(plus.getAttribute('title')).toContain('样式')
  })
})

describe('OASTreeSelect 勾选策略（check-strategy）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const openAndExpand = (el: OASTreeSelect): void => {
    trigger(el).click()
    byLabel(el, '前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel(el, '框架')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  it('all（默认）：勾选父级 value 含父级与全部后代', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['fe', 'framework', 'react', 'vue', 'css'])
  })

  it('parent：勾选父级 value 只含父级', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['fe'])
  })

  it('child：勾选父级 value 只含叶子', () => {
    const el = mount({ multiple: '', 'check-strategy': 'child' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react', 'vue', 'css'])
  })

  it('parent：逐个勾选叶子，子级全选后 value 收敛为父级', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent' })
    openAndExpand(el)
    byLabel(el, 'React').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react'])
    byLabel(el, 'Vue').click()
    // 兄弟叶子全选 → 框架自动全选，value 以框架代表
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['framework'])
    byLabel(el, '样式').click()
    // 前端全部子级勾选 → 收敛为前端
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['fe'])
  })

  it('parent：勾选父级后取消一个叶子 → value 收敛为剩余子级父节点', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent', value: '["fe"]' })
    openAndExpand(el)
    byLabel(el, '样式').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['framework'])
  })

  it('受控：parent 策略外部设置父级 value → 子节点勾选展示且 value 不漂移', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent', value: '["fe"]' })
    openAndExpand(el)
    const fe = byLabel(el, '前端')
    expect(fe.querySelector('.check')!.classList.contains('checked')).toBe(true)
    expect(byLabel(el, '框架').querySelector('.check')!.classList.contains('checked')).toBe(true)
    expect(byLabel(el, '样式').querySelector('.check')!.classList.contains('checked')).toBe(true)
    expect(el.getAttribute('value')).toBe('["fe"]')
  })
})

describe('OASTreeSelect 搜索过滤（filterable）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function searchInput(el: OASTreeSelect): HTMLInputElement {
    return el.shadowRoot!.querySelector('input.search-input')!
  }

  function type(el: OASTreeSelect, text: string): void {
    const input = searchInput(el)
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  it('filterable：面板顶部搜索框，命中节点 + 祖先保留（未展开也显示）', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    const input = searchInput(el)
    expect(input.hidden).toBe(false)
    type(el, 'React')
    // 树未展开任何节点，过滤模式自动展示命中路径：前端 / 框架 / React
    expect(rowLabels(el)).toBe('前端|框架|React')
  })

  it('filterable：宽松匹配——命中父级时含全部后代', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    type(el, '前端')
    expect(rowLabels(el)).toBe('前端|框架|React|Vue|样式')
  })

  it('filterable：派发 oas-search；无匹配显示空态', () => {
    const el = mount({ filterable: '' })
    let keyword = ''
    el.addEventListener('oas-search', (e: Event) => (keyword = (e as CustomEvent).detail.value))
    trigger(el).click()
    type(el, 'zzz')
    expect(keyword).toBe('zzz')
    expect(nodes(el).length).toBe(0)
    const empty = el.shadowRoot!.querySelector('.empty') as HTMLElement
    expect(empty.hidden).toBe(false)
  })

  it('filterable：过滤后勾选正常；选中后默认清空搜索词', () => {
    const el = mount({ multiple: '', filterable: '' })
    trigger(el).click()
    type(el, 'React')
    byLabel(el, 'React').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react'])
    expect(searchInput(el).value).toBe('')
  })

  it('filterable：reserve-keyword 选中后保留搜索词', () => {
    const el = mount({ multiple: '', filterable: '', 'reserve-keyword': '' })
    trigger(el).click()
    type(el, 'React')
    byLabel(el, 'React').click()
    expect(searchInput(el).value).toBe('React')
  })

  it('filterable：el.filter 自定义过滤函数', () => {
    const el = mount({ filterable: '' })
    el.filter = (label: string) => label === '样式'
    trigger(el).click()
    type(el, 'x') // 关键词无意义，命中与否全由自定义函数决定
    expect(rowLabels(el)).toBe('前端|样式')
  })

  it('filterable：搜索框键盘 ↑/↓/Enter 可导航选择', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    type(el, 'React')
    const input = searchInput(el)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('react')
  })
})

describe('OASTreeSelect check-strictly（父子解联）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('勾选不级联：value 即勾选集合', () => {
    const el = mount({ multiple: '', 'check-strictly': '' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['fe'])
  })

  it('无 half 态：子级部分勾选时父级复选框不置 half', () => {
    const el = mount({ multiple: '', 'check-strictly': '' })
    trigger(el).click()
    byLabel(el, '前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel(el, '样式').click()
    const feCheck = byLabel(el, '前端').querySelector('.check')!
    expect(feCheck.classList.contains('checked')).toBe(false)
    expect(feCheck.classList.contains('half')).toBe(false)
  })

  it('strictly 下逐个勾选保持独立：value 按树序累积', () => {
    const el = mount({ multiple: '', 'check-strictly': '' })
    trigger(el).click()
    byLabel(el, '前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel(el, '样式').click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['fe', 'css'])
  })

  it('strictly + chip 移除直接删值', () => {
    const el = mount({ multiple: '', 'check-strictly': '', value: '["fe","css"]' })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip:not(.chip-plus)')]
    ;(chips[0]!.querySelector('button') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['css'])
  })
})

describe('OASTreeSelect 懒加载（lazy / load）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('展开未加载节点触发 oas-load + el.load，展开处显示 spinner', () => {
    const el = mount({ lazy: '', options: JSON.stringify([{ label: '根', value: 'root' }]) })
    let eventValue = ''
    let propValue = ''
    el.addEventListener('oas-load', (e: Event) => (eventValue = (e as CustomEvent).detail.value))
    el.load = (payload: { value: string }) => (propValue = payload.value)
    trigger(el).click()
    expect(nodes(el)[0]!.querySelector('.toggle')).toBeTruthy() // 未加载节点有展开箭头
    nodes(el)[0]!
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(eventValue).toBe('root')
    expect(propValue).toBe('root')
    expect(el.shadowRoot!.querySelector('.toggle-spinner')).toBeTruthy()
  })

  it('宿主回填 children 后 spinner 消失、子节点渲染', () => {
    const el = mount({ lazy: '', options: JSON.stringify([{ label: '根', value: 'root' }]) })
    trigger(el).click()
    nodes(el)[0]!
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    el.options = [{ label: '根', value: 'root', children: [{ label: '子级', value: 'c1' }] }]
    expect(el.shadowRoot!.querySelector('.toggle-spinner')).toBe(null)
    expect(rowLabels(el)).toBe('根|子级')
  })

  it('isLeaf 节点不显示展开箭头（不可展开）', () => {
    const el = mount({
      lazy: '',
      options: JSON.stringify([{ label: '叶', value: 'leaf', isLeaf: true }]),
    })
    trigger(el).click()
    const toggle = nodes(el)[0]!.querySelector('.toggle')!
    expect(toggle.classList.contains('leaf')).toBe(true)
  })
})

describe('OASTreeSelect clearable / size / status / field-names', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('clearable：有值显示清除按钮，点击清空并派发 oas-clear / oas-change', () => {
    const el = mount({ clearable: '', value: 'vue' })
    const clearBtn = el.shadowRoot!.querySelector('.clear-btn') as HTMLElement
    expect(clearBtn.hidden).toBe(false)
    let cleared: unknown
    let changed: unknown
    el.addEventListener('oas-clear', (e: Event) => (cleared = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changed = (e as CustomEvent).detail))
    clearBtn.click()
    expect(el.getAttribute('value')).toBe('')
    expect(cleared).toEqual({ value: 'vue' })
    expect(changed).toEqual({ value: '', labels: [] })
  })

  it('clearable：多选清空为 []；无值/禁用时不显示', () => {
    const el = mount({ clearable: '', multiple: '', value: '["vue"]' })
    const clearBtn = el.shadowRoot!.querySelector('.clear-btn') as HTMLElement
    clearBtn.click()
    expect(el.getAttribute('value')).toBe('[]')
    const el2 = mount({ clearable: '' })
    expect((el2.shadowRoot!.querySelector('.clear-btn') as HTMLElement).hidden).toBe(true)
    const el3 = mount({ clearable: '', disabled: '', value: 'vue' })
    expect((el3.shadowRoot!.querySelector('.clear-btn') as HTMLElement).hidden).toBe(true)
  })

  it('size：映射 data-size 宿主属性（默认无）', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'large')
    expect(el.getAttribute('data-size')).toBe('large')
    el.setAttribute('size', 'medium')
    expect(el.hasAttribute('data-size')).toBe(false)
  })

  it('status：映射 data-status 宿主属性', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    el.setAttribute('status', 'warning')
    expect(el.getAttribute('data-status')).toBe('warning')
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
  })

  it('field-names：字段别名读树（label/value/children/disabled）', () => {
    const data = JSON.stringify([
      { name: '前端', id: 'fe', subs: [{ name: 'Vue', id: 'vue' }] },
      { name: '禁用项', id: 'dis', off: true },
    ])
    const el = mount({
      options: data,
      'field-names': '{"label":"name","value":"id","children":"subs","disabled":"off"}',
    })
    trigger(el).click()
    expect(rowLabels(el)).toBe('前端|禁用项')
    byLabel(el, '前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel(el, 'Vue').click()
    expect(el.getAttribute('value')).toBe('vue')
    expect(trigger(el).textContent).toContain('Vue')
    // 别名 disabled 生效：禁用项 aria-disabled
    expect(byLabel(el, '禁用项').getAttribute('aria-disabled')).toBe('true')
  })
})

describe('OASTreeSelect 受控开合（open / oas-open-change）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 属性存在 → 初始展开面板', () => {
    const el = mount({ open: '' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(nodes(el).length).toBeGreaterThanOrEqual(2)
  })

  it('受控模式：点击 trigger 面板不自行关闭，派发 oas-open-change 由宿主回写', () => {
    const el = mount({ open: '' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    trigger(el).click()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(events).toEqual([false])
    el.setAttribute('open', 'false')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('open="false" 受控关闭：点击仅派发事件不展开', () => {
    const el = mount({ open: 'false' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    trigger(el).click()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(events).toEqual([true])
  })

  it('非受控：开合同样派发 oas-open-change', () => {
    const el = mount()
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e: Event) => events.push((e as CustomEvent).detail.open))
    trigger(el).click()
    expect(events).toEqual([true])
    trigger(el).click()
    expect(events).toEqual([true, false])
  })
})

describe('OASTreeSelect 展开行为（default-expand-all / expand-trigger / tree-lines）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('default-expand-all：未设 expanded 时首次打开全量展开', () => {
    const el = mount({ 'default-expand-all': '' })
    trigger(el).click()
    expect(rowLabels(el)).toBe('前端|框架|React|Vue|样式|后端|Node')
  })

  it('default-expand-all：显式 expanded 属性优先', () => {
    const el = mount({ 'default-expand-all': '', expanded: '[]' })
    trigger(el).click()
    expect(rowLabels(el)).toBe('前端|后端')
  })

  it('expand-trigger="node"：点击父级标签同时展开（选中行为不变）', () => {
    const el = mount({ 'expand-trigger': 'node' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(el.getAttribute('value')).toBe('fe')
    expect(rowLabels(el)).toBe('前端|框架|样式|后端')
  })

  it('tree-lines：深度 > 0 的行渲染缩进引导线占位', () => {
    const el = mount({ 'tree-lines': '', expanded: '["fe"]' })
    trigger(el).click()
    const fe = byLabel(el, '前端')
    expect(fe.querySelectorAll('.indent').length).toBe(0)
    const framework = byLabel(el, '框架')
    expect(framework.querySelectorAll('.indent').length).toBe(1)
    const el2 = mount({ expanded: '["fe"]' })
    trigger(el2).click()
    expect(byLabel(el2, '框架').querySelectorAll('.indent').length).toBe(1) // 占位恒在
  })
})

describe('OASTreeSelect 多选上限（max）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('达到上限后未选项禁用且不可再勾选（上限按勾选数量计）', () => {
    const el = mount({
      multiple: '',
      'check-strictly': '',
      max: '2',
      expanded: '["fe","framework"]',
    })
    trigger(el).click()
    byLabel(el, 'React').click()
    byLabel(el, 'Vue').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react', 'vue'])
    const css = byLabel(el, '样式')
    expect(css.getAttribute('aria-disabled')).toBe('true')
    css.click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react', 'vue'])
    // 已选项仍可取消
    byLabel(el, 'Vue').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react'])
  })

  it('级联模式上限按勾选复选框数量计：会触发父级收敛的第三勾被拦截', () => {
    const el = mount({ multiple: '', max: '2', expanded: '["fe","framework"]' })
    trigger(el).click()
    byLabel(el, 'React').click()
    byLabel(el, '样式').click()
    // react + css 分属不同父级，勾选集合恰为 2；all 策略下未全选的父级不进值
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react', 'css'])
    // 勾 Vue 会收敛出 framework（第 3 个勾）→ 达上限被拦截
    expect(byLabel(el, 'Vue').getAttribute('aria-disabled')).toBe('true')
    byLabel(el, 'Vue').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react', 'css'])
  })
})

describe('OASTreeSelect 回显增强（show-path / cache-data / prefix / suffix）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('show-path：单选回显为完整路径（默认分隔符 " / "）', () => {
    const el = mount({ value: 'vue', 'show-path': '' })
    expect(trigger(el).textContent).toContain('前端 / 框架 / Vue')
  })

  it('show-path：separator 自定义分隔符', () => {
    const el = mount({ value: 'vue', 'show-path': '', separator: '-' })
    expect(trigger(el).textContent).toContain('前端-框架-Vue')
  })

  it('cache-data：未加载/树外值的 label 回显兜底', () => {
    const el = mount({
      multiple: '',
      value: '["ghost","vue"]',
      'cache-data': '[{"value":"ghost","label":"幽灵节点"}]',
    })
    const chips = [...el.shadowRoot!.querySelectorAll('.chip:not(.chip-plus)')]
    expect(chips[0]!.textContent).toContain('幽灵节点')
    expect(chips[1]!.textContent).toContain('Vue')
  })

  it('prefix / suffix：文本属性渲染前后缀', () => {
    const el = mount({ prefix: '部门', suffix: '必填' })
    expect(trigger(el).textContent).toContain('部门')
    expect(trigger(el).textContent).toContain('必填')
  })

  it('field-names：切换别名后同一 options 按新字段重新解析', () => {
    const data = JSON.stringify([{ name: '前端', id: 'fe', subs: [{ name: 'Vue', id: 'vue' }] }])
    const el = mount({ options: data })
    trigger(el).click()
    // 默认字段名下无有效节点（value 字段缺失）
    expect(nodes(el).length).toBe(0)
    el.setAttribute('field-names', '{"label":"name","value":"id","children":"subs"}')
    expect(rowLabels(el)).toBe('前端')
  })

  it('prefix / suffix：同名插槽模板优先', () => {
    const el = new OASTreeSelect()
    el.setAttribute('options', OPTIONS)
    el.innerHTML = '<template slot="prefix"><b>P</b></template>'
    document.body.appendChild(el)
    expect(trigger(el).querySelector('.prefix b')?.textContent).toBe('P')
  })
})

describe('OASTreeSelect 面板增强（loading / empty / header / footer / node 渲染）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('loading：面板显示加载遮罩', () => {
    const el = mount({ loading: '' })
    const mask = el.shadowRoot!.querySelector('.loading') as HTMLElement
    expect(mask.hidden).toBe(false)
    el.removeAttribute('loading')
    expect((el.shadowRoot!.querySelector('.loading') as HTMLElement).hidden).toBe(true)
  })

  it('empty：自定义空态文案', () => {
    const el = mount({ empty: '树是空的', options: '[]' })
    trigger(el).click()
    const empty = el.shadowRoot!.querySelector('.empty') as HTMLElement
    expect(empty.textContent).toBe('树是空的')
  })

  it('template[slot=empty]：插槽空态优先', () => {
    const el = new OASTreeSelect()
    el.setAttribute('options', '[]')
    el.innerHTML = '<template slot="empty"><i class="custom-empty">无</i></template>'
    document.body.appendChild(el)
    trigger(el).click()
    expect(el.shadowRoot!.querySelector('.empty .custom-empty')).toBeTruthy()
  })

  it('template[slot=header] / [slot=footer]：面板头尾内容', () => {
    const el = new OASTreeSelect()
    el.setAttribute('options', OPTIONS)
    el.innerHTML = [
      '<template slot="header"><span class="hd">面板头</span></template>',
      '<template slot="footer"><span class="ft">面板尾</span></template>',
    ].join('')
    document.body.appendChild(el)
    const header = el.shadowRoot!.querySelector('.panel-header') as HTMLElement
    const footer = el.shadowRoot!.querySelector('.panel-footer') as HTMLElement
    expect(header.hidden).toBe(false)
    expect(header.querySelector('.hd')).toBeTruthy()
    expect(footer.hidden).toBe(false)
    expect(footer.querySelector('.ft')).toBeTruthy()
    // 无模板时隐藏
    const el2 = mount()
    expect((el2.shadowRoot!.querySelector('.panel-header') as HTMLElement).hidden).toBe(true)
  })

  it('oas-node-render：每个节点行派发渲染事件（node/element/level 可改写）', () => {
    const el = mount()
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-node-render', (e: Event) =>
      details.push((e as CustomEvent).detail as Record<string, unknown>),
    )
    trigger(el).click()
    expect(details.length).toBeGreaterThanOrEqual(2)
    expect((details[0]!['node'] as Record<string, unknown>).value).toBe('fe')
    expect(details[0]!['level']).toBe(1)
    expect(details[0]!['element']).toBeTruthy()
  })

  it('template[slot=node]：自定义节点模板 + data-node-label 绑定', () => {
    const el = new OASTreeSelect()
    el.setAttribute('options', OPTIONS)
    el.innerHTML = '<template slot="node"><span class="node-custom"><b data-node-label></b></span></template>'
    document.body.appendChild(el)
    trigger(el).click()
    const label = byLabel(el, '前端').querySelector('.label')!
    expect(label.querySelector('.node-custom')).toBeTruthy()
    expect(label.querySelector('[data-node-label]')!.textContent).toBe('前端')
  })
})

describe('OASTreeSelect 弹层定位（fixed + 视口计算）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('打开面板后以 fixed 定位锚定 trigger（inline top/left/width 写入）', () => {
    const el = mount()
    trigger(el).click()
    const dropdown = el.shadowRoot!.querySelector('.dropdown') as HTMLElement
    expect(dropdown.classList.contains('open')).toBe(true)
    expect(dropdown.style.top).not.toBe('')
    expect(dropdown.style.left).not.toBe('')
    expect(dropdown.style.width).not.toBe('')
  })
})

describe('OASTreeSelect 虚拟滚动（virtual）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const BIG = JSON.stringify([
    {
      label: 'root',
      value: 'root',
      children: Array.from({ length: 10000 }, (_, i) => ({
        label: `节点 ${i}`,
        value: `n${i}`,
      })),
    },
  ])

  const vlistOf = (el: OASTreeSelect): HTMLElement => el.shadowRoot!.querySelector('oas-virtual-list')!

  const virtualRows = (el: OASTreeSelect): HTMLElement[] => [
    ...vlistOf(el).shadowRoot!.querySelectorAll<HTMLElement>('[role="treeitem"]'),
  ]

  const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  // 非 virtual 分支同步渲染 10001 个节点，jsdom 全量并发下实测 >11s，远超默认 5s 超时
  it('virtual：万级节点仅渲染可见窗口；非 virtual 全量渲染可见行', () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const rows = virtualRows(el)
    // 视口 288 / item-height 36 ≈ 8 项 + 上下 buffer 4 → start 0, end 12
    expect(rows.length).toBe(12)
    expect(rows[0]!.getAttribute('data-index')).toBe('0')
    // 非虚拟：全部可见行渲染（root + 10000 子级）
    const el2 = mount({ multiple: '', expanded: '["root"]', options: BIG })
    trigger(el2).click()
    expect(el2.shadowRoot!.querySelectorAll('[role="treeitem"]').length).toBe(10001)
  }, 30000)

  it('virtual：滚动后窗口平移，padding 撑起滚动高度', async () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    vp.scrollTop = 5000 * 36
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const rows = virtualRows(el)
    expect(rows[0]!.getAttribute('data-index')).toBe('4996')
    expect(rows.length).toBe(16) // 4996..5011
  })

  it('virtual：勾选写回 value，重渲染后勾选态恢复', () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const leaf = virtualRows(el).find((r) => r.getAttribute('data-index') === '1')!
    leaf.click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['n0'])
    const rebuilt = virtualRows(el).find((r) => r.getAttribute('data-index') === '1')!
    expect(rebuilt.querySelector('.check')!.classList.contains('checked')).toBe(true)
  })

  it('virtual：键盘导航移动高亮、滚动进视口、Enter 提交', async () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const btn = trigger(el)
    // 30 次 ↓：activeIndex 0→30（可见列表 index 0 为 root，index 30 = n29）
    for (let i = 0; i < 30; i++) {
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    }
    expect(btn.getAttribute('aria-activedescendant')).toBe('tree-opt-30')
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    expect(vp.scrollTop).toBeGreaterThan(0)
    // happy-dom 不自动触发 scroll：手动派发后窗口重算，高亮项应在窗口内
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const active = virtualRows(el).find((r) => r.classList.contains('active'))
    expect(active?.getAttribute('data-index')).toBe('30')
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['n29'])
  })

  it('virtual：展开/收起重算可见列表', () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    expect(virtualRows(el)[0]!.getAttribute('data-index')).toBe('0')
    // 收起 root → 可见行只剩 root
    virtualRows(el)[0]!
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(virtualRows(el).length).toBe(1)
    // 再展开 → 恢复窗口渲染
    virtualRows(el)[0]!
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(virtualRows(el).length).toBe(12)
  })

  it('virtual + child 策略：勾选父级 value 只含叶子', () => {
    const el = mount({
      multiple: '',
      'check-strategy': 'child',
      virtual: '',
      expanded: '["root"]',
      options: BIG,
    })
    trigger(el).click()
    virtualRows(el)[0]!.click() // 勾选 root
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value.length).toBe(10000)
    expect(value[0]).toBe('n0')
    expect(value[9999]).toBe('n9999')
  })

  it('virtual + filterable：过滤结果进虚拟列表渲染', () => {
    const el = mount({ filterable: '', virtual: '', expanded: '[]', options: BIG })
    trigger(el).click()
    const input = el.shadowRoot!.querySelector('input.search-input') as HTMLInputElement
    input.value = '节点 9999'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const labels = virtualRows(el).map((r) => r.querySelector('.label')?.textContent ?? '')
    expect(labels.join('|')).toBe('root|节点 9999')
  })
})

describe('OASTreeSelect focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 trigger', () => {
    const el = new OASTreeSelect()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('button[part="trigger"]'))
  })
})
