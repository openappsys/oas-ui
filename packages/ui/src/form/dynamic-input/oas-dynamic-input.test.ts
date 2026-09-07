import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDynamicInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDynamicInput {
  const el = new OASDynamicInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function rows(el: OASDynamicInput): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.row')]
}

function rowInput(el: OASDynamicInput, idx: number): Element {
  return rows(el)[idx]!.querySelector('oas-input')!
}

function rowValue(el: OASDynamicInput, idx: number): string {
  return rowInput(el, idx).getAttribute('value') ?? ''
}

function addBtn(el: OASDynamicInput): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.add')!
}

function removeBtn(el: OASDynamicInput, idx: number): HTMLButtonElement {
  return rows(el)[idx]!.querySelector<HTMLButtonElement>('.remove')!
}

function typeRow(el: OASDynamicInput, idx: number, value: string): void {
  const inner = rowInput(el, idx)
  inner.dispatchEvent(
    new CustomEvent('oas-input', { detail: { value }, bubbles: true, composed: true }),
  )
}

describe('OASDynamicInput', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('model-value 属性（JSON）渲染多行', async () => {
    const el = mount({ 'model-value': '["a","b"]' })
    await Promise.resolve()
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 0)).toBe('a')
    expect(rowValue(el, 1)).toBe('b')
  })

  it('无 model-value 时渲染 0 行（空态），含添加按钮', () => {
    const el = mount()
    expect(rows(el).length).toBe(0)
    expect(addBtn(el).textContent).toBe('添加')
  })

  it('点击添加追加一行，值为 default-value', () => {
    const el = mount({ 'default-value': '默认' })
    addBtn(el).click()
    expect(rows(el).length).toBe(1)
    expect(rowValue(el, 0)).toBe('默认')
  })

  it('点击删除移除对应行并派发 oas-change', () => {
    const el = mount({ 'model-value': '["a","b","c"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    removeBtn(el, 1).click()
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 0)).toBe('a')
    expect(rowValue(el, 1)).toBe('c')
    expect(detail).toEqual({ value: ['a', 'c'] })
  })

  it('min 下补足行数，且达到 min 时删除按钮禁用', () => {
    const el = mount({ min: '2', 'model-value': '["a"]' })
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 1)).toBe('')
    expect(removeBtn(el, 0).disabled).toBe(true)
    expect(removeBtn(el, 1).disabled).toBe(true)
  })

  it('min=0 且空列表时最后一行（无行）不报错', () => {
    const el = mount()
    expect(rows(el).length).toBe(0)
  })

  it('max 达到后添加按钮禁用', () => {
    const el = mount({ max: '2', 'model-value': '["a","b"]' })
    expect(addBtn(el).disabled).toBe(true)
  })

  it('max 超限时截断 model-value', () => {
    const el = mount({ max: '2', 'model-value': '["a","b","c"]' })
    expect(rows(el).length).toBe(2)
  })

  it('行内输入更新数组并派发 oas-change', () => {
    const el = mount({ 'model-value': '["a"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    typeRow(el, 0, 'abc')
    expect(detail).toEqual({ value: ['abc'] })
    expect(el.modelValue).toEqual(['abc'])
  })

  it('disabled 时行内输入与添加/删除按钮全部禁用', () => {
    const el = mount({ disabled: '', 'model-value': '["a"]' })
    expect(rowInput(el, 0).hasAttribute('disabled')).toBe(true)
    expect(removeBtn(el, 0).disabled).toBe(true)
    expect(addBtn(el).disabled).toBe(true)
  })

  it('受控：外部设置 modelValue 属性即时同步行', () => {
    const el = mount()
    el.modelValue = ['x', 'y']
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 0)).toBe('x')
    expect(rowValue(el, 1)).toBe('y')
  })

  it('添加/删除后模型写回属性（受控通道）', () => {
    const el = mount()
    addBtn(el).click()
    expect(JSON.parse(el.getAttribute('model-value') ?? '[]')).toEqual([''])
  })

  it('删除按钮有可访问名称', () => {
    const el = mount({ 'model-value': '["a"]' })
    expect(removeBtn(el, 0).getAttribute('aria-label')).toBe('删除')
  })
})

describe('OASDynamicInput preset=pair 键值对行', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function rowKeys(el: OASDynamicInput, idx: number): Element {
    return rows(el)[idx]!.querySelector('[part="row-key"]')!
  }

  function rowValues(el: OASDynamicInput, idx: number): Element {
    return rows(el)[idx]!.querySelector('[part="row-value"]')!
  }

  it('pair 预设：每行渲染 key/value 两个输入框，值通道为对象数组', () => {
    const el = mount({ preset: 'pair', 'model-value': '[{"key":"HOST","value":"localhost"}]' })
    expect(rows(el).length).toBe(1)
    expect(rowKeys(el, 0).getAttribute('value')).toBe('HOST')
    expect(rowValues(el, 0).getAttribute('value')).toBe('localhost')
    expect(el.modelValue).toEqual([{ key: 'HOST', value: 'localhost' }])
  })

  it('key-placeholder / value-placeholder 透传到对应输入框', () => {
    const el = mount({
      preset: 'pair',
      'key-placeholder': '参数名',
      'value-placeholder': '参数值',
    })
    addBtn(el).click()
    expect(rowKeys(el, 0).getAttribute('placeholder')).toBe('参数名')
    expect(rowValues(el, 0).getAttribute('placeholder')).toBe('参数值')
  })

  it('行内 key/value 输入更新对象值并派发 oas-change', () => {
    const el = mount({ preset: 'pair' })
    addBtn(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    rowKeys(el, 0).dispatchEvent(
      new CustomEvent('oas-input', { detail: { value: 'PORT' }, bubbles: true, composed: true }),
    )
    rowValues(el, 0).dispatchEvent(
      new CustomEvent('oas-input', { detail: { value: '8080' }, bubbles: true, composed: true }),
    )
    expect(el.modelValue).toEqual([{ key: 'PORT', value: '8080' }])
    expect(detail).toEqual({ value: [{ key: 'PORT', value: '8080' }] })
  })

  it('pair 新增行初值为 {key:"", value:""}', () => {
    const el = mount({ preset: 'pair' })
    addBtn(el).click()
    expect(el.modelValue).toEqual([{ key: '', value: '' }])
  })

  it('切换 preset：input→pair 映射为 {key: 原值, value: ""}', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    el.setAttribute('preset', 'pair')
    expect(el.modelValue).toEqual([
      { key: 'a', value: '' },
      { key: 'b', value: '' },
    ])
  })

  it('切换 preset：pair→input 映射为 key（key 空时回落 value）', () => {
    const el = mount({
      preset: 'pair',
      'model-value': '[{"key":"a","value":"1"},{"key":"","value":"2"}]',
    })
    el.setAttribute('preset', 'input')
    expect(el.modelValue).toEqual(['a', '2'])
  })
})

describe('OASDynamicInput template[slot=row] 行内容自定义', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountWithRowTpl(attrs: Record<string, string> = {}): OASDynamicInput {
    const el = mount(attrs)
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'row')
    tpl.innerHTML = '<span class="custom-row"><span data-row-value></span></span>'
    el.appendChild(tpl)
    // 模板后挂：观察器触发重建
    return el
  }

  it('row 模板克隆到每行，data-row-value 绑定行值；删除按钮保留组件侧', async () => {
    const el = mount({ 'model-value': '["a","b"]' })
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'row')
    tpl.innerHTML = '<span class="custom-row"><span data-row-value></span></span>'
    el.appendChild(tpl)
    await Promise.resolve()
    expect(rows(el)[0]!.querySelector('.custom-row')).not.toBeNull()
    expect(rows(el)[0]!.querySelector('[data-row-value]')!.textContent).toBe('a')
    expect(rows(el)[1]!.querySelector('[data-row-value]')!.textContent).toBe('b')
    expect(rows(el)[0]!.querySelector('.remove')).not.toBeNull()
  })

  it('row 模板行内的 oas-input 输入事件仍走值通道（composed 委托）', async () => {
    const el = mount({ 'model-value': '["a"]' })
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'row')
    tpl.innerHTML = '<oas-input part="row-input"></oas-input>'
    el.appendChild(tpl)
    await Promise.resolve()
    const inner = rows(el)[0]!.querySelector('oas-input')!
    inner.dispatchEvent(
      new CustomEvent('oas-input', { detail: { value: 'changed' }, bubbles: true, composed: true }),
    )
    expect(el.modelValue).toEqual(['changed'])
  })

  it('克隆后派发 oas-row-render（detail 含 index/value/element）', async () => {
    const el = mount({ 'model-value': '["x"]' })
    const details: unknown[] = []
    el.addEventListener('oas-row-render', (e: Event) => details.push((e as CustomEvent).detail))
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'row')
    tpl.innerHTML = '<span class="custom-row"></span>'
    el.appendChild(tpl)
    await Promise.resolve()
    el.modelValue = ['x', 'y']
    expect(details.length).toBe(2)
    expect(details[0]).toMatchObject({ index: 0, value: 'x' })
    expect(details[1]).toMatchObject({ index: 1, value: 'y' })
  })

  it('模板移除后回落默认行（oas-input 预设）', async () => {
    const el = mountWithRowTpl({ 'model-value': '["a"]' })
    await Promise.resolve()
    expect(rows(el)[0]!.querySelector('.custom-row')).not.toBeNull()
    el.querySelector('template[slot="row"]')!.remove()
    await Promise.resolve()
    expect(rows(el)[0]!.querySelector('.custom-row')).toBeNull()
    expect(rows(el)[0]!.querySelector('oas-input')).not.toBeNull()
  })
})

describe('OASDynamicInput sortable 按钮排序', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function moveUp(el: OASDynamicInput, idx: number): HTMLButtonElement {
    return rows(el)[idx]!.querySelector<HTMLButtonElement>('.move-up')!
  }

  function moveDown(el: OASDynamicInput, idx: number): HTMLButtonElement {
    return rows(el)[idx]!.querySelector<HTMLButtonElement>('.move-down')!
  }

  it('sortable 时每行渲染上移/下移按钮；首行上移禁用、末行下移禁用', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b","c"]' })
    expect(moveUp(el, 0).disabled).toBe(true)
    expect(moveDown(el, 0).disabled).toBe(false)
    expect(moveUp(el, 1).disabled).toBe(false)
    expect(moveDown(el, 1).disabled).toBe(false)
    expect(moveUp(el, 2).disabled).toBe(false)
    expect(moveDown(el, 2).disabled).toBe(true)
  })

  it('未设 sortable 时无排序按钮', () => {
    const el = mount({ 'model-value': '["a"]' })
    expect(rows(el)[0]!.querySelector('.move-up')).toBeNull()
  })

  it('点击下移交换相邻行值并派发 oas-change', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b","c"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    moveDown(el, 0).click()
    expect(el.modelValue).toEqual(['b', 'a', 'c'])
    expect(detail).toEqual({ value: ['b', 'a', 'c'] })
  })

  it('点击上移交换相邻行值', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b","c"]' })
    moveUp(el, 2).click()
    expect(el.modelValue).toEqual(['a', 'c', 'b'])
  })

  it('min 限制不影响排序按钮（排序不减行数）', () => {
    const el = mount({ sortable: '', min: '2', 'model-value': '["a","b"]' })
    expect(moveUp(el, 0).disabled).toBe(true) // 首行边界
    expect(moveUp(el, 1).disabled).toBe(false)
    expect(moveDown(el, 1).disabled).toBe(true) // 末行边界
    expect(moveDown(el, 0).disabled).toBe(false)
  })

  it('disabled 时排序按钮禁用', () => {
    const el = mount({ sortable: '', disabled: '', 'model-value': '["a","b"]' })
    expect(moveUp(el, 1).disabled).toBe(true)
    expect(moveDown(el, 0).disabled).toBe(true)
  })

  it('后加 sortable 属性：既有行补出排序按钮', async () => {
    const el = mount({ 'model-value': '["a","b"]' })
    expect(rows(el)[0]!.querySelector('.move-up')).toBeNull()
    el.setAttribute('sortable', '')
    await Promise.resolve()
    expect(rows(el)[0]!.querySelector('.move-up')).not.toBeNull()
    expect(moveUp(el, 0).disabled).toBe(true)
    expect(moveDown(el, 1).disabled).toBe(true)
  })

  it('排序按钮有可访问名称（i18n key 注册前回落 key 字符串）', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b"]' })
    expect(moveUp(el, 1).getAttribute('aria-label')).toBe('上移')
    expect(moveDown(el, 0).getAttribute('aria-label')).toBe('下移')
  })
})

describe('OASDynamicInput 新增属性与事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('placeholder 透传到行内输入框', () => {
    const el = mount({ placeholder: '请输入链接' })
    addBtn(el).click()
    expect(rowInput(el, 0).getAttribute('placeholder')).toBe('请输入链接')
  })

  it('添加行派发 oas-add（detail {index}）', () => {
    const el = mount({ 'model-value': '["a"]' })
    let detail: unknown
    el.addEventListener('oas-add', (e: Event) => (detail = (e as CustomEvent).detail))
    addBtn(el).click()
    expect(detail).toEqual({ index: 1 })
  })

  it('删除行派发 oas-remove（detail {index, value}）', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    let detail: unknown
    el.addEventListener('oas-remove', (e: Event) => (detail = (e as CustomEvent).detail))
    removeBtn(el, 0).click()
    expect(detail).toEqual({ index: 0, value: 'a' })
  })

  it('size 镜像 data-size 并透传行内 oas-input', () => {
    const el = mount({ size: 'small', 'model-value': '["a"]' })
    expect(el.getAttribute('data-size')).toBe('small')
    expect(rowInput(el, 0).getAttribute('size')).toBe('small')
  })

  it('非法 size 回落 medium', () => {
    const el = mount({ size: 'huge', 'model-value': '["a"]' })
    expect(el.getAttribute('data-size')).toBe('medium')
  })

  it('status 镜像 data-status 并透传行内 oas-input', () => {
    const el = mount({ status: 'error', 'model-value': '["a"]' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(rowInput(el, 0).getAttribute('status')).toBe('error')
  })

  it('行内输入框聚焦派发 oas-focus（detail {index}），内部事件不外泄', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    const details: unknown[] = []
    el.addEventListener('oas-focus', (e: Event) => details.push((e as CustomEvent).detail))
    const leaks: unknown[] = []
    el.addEventListener('oas-input', (e: Event) => leaks.push((e as CustomEvent).detail))
    rowInput(el, 1).dispatchEvent(
      new CustomEvent('oas-focus', { detail: { value: 'b' }, bubbles: true, composed: true }),
    )
    expect(details).toEqual([{ index: 1 }])
    expect(leaks).toEqual([])
  })

  it('行内输入框失焦派发 oas-blur（detail {index}）', () => {
    const el = mount({ 'model-value': '["a"]' })
    let detail: unknown
    el.addEventListener('oas-blur', (e: Event) => (detail = (e as CustomEvent).detail))
    rowInput(el, 0).dispatchEvent(
      new CustomEvent('oas-blur', { detail: { value: 'a' }, bubbles: true, composed: true }),
    )
    expect(detail).toEqual({ index: 0 })
  })

  it('readonly：行内输入只读、增删按钮禁用', () => {
    const el = mount({ readonly: '', 'model-value': '["a"]' })
    expect(rowInput(el, 0).hasAttribute('readonly')).toBe(true)
    expect(removeBtn(el, 0).disabled).toBe(true)
    expect(addBtn(el).disabled).toBe(true)
  })
})
