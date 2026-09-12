import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDynamicTags } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDynamicTags {
  const el = new OASDynamicTags()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function tagEls(el: OASDynamicTags): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="listitem"]')]
}

function inputEl(el: OASDynamicTags): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('input')!
}

function removeBtn(el: OASDynamicTags, idx: number): HTMLButtonElement {
  return tagEls(el)[idx]!.querySelector<HTMLButtonElement>('.tag-remove')!
}

function pressKey(el: OASDynamicTags, keyName: string): void {
  inputEl(el).dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }))
}

function typeValue(el: OASDynamicTags, value: string): void {
  inputEl(el).value = value
}

describe('OASDynamicTags', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('model-value（JSON）渲染标签，容器 role=list、标签 role=listitem', async () => {
    const el = mount({ 'model-value': '["vue","react"]' })
    await Promise.resolve()
    expect(tagEls(el).length).toBe(2)
    expect(el.shadowRoot!.querySelector('[part="tags"]')!.getAttribute('role')).toBe('list')
    expect(tagEls(el)[0]!.getAttribute('role')).toBe('listitem')
  })

  it('Enter 提交新增标签，清空输入，派发 oas-add + oas-change', () => {
    const el = mount()
    const events: string[] = []
    el.addEventListener('oas-add', () => events.push('add'))
    el.addEventListener('oas-change', () => events.push('change'))
    typeValue(el, 'svelte')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('svelte')
    expect(inputEl(el).value).toBe('')
    expect(events).toEqual(['add', 'change'])
  })

  it('逗号提交新增标签', () => {
    const el = mount()
    typeValue(el, 'solid')
    pressKey(el, ',')
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('solid')
  })

  it('空输入按 Backspace 删除最后一个标签，派发 oas-remove', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    let detail: unknown
    el.addEventListener('oas-remove', (e: Event) => (detail = (e as CustomEvent).detail))
    pressKey(el, 'Backspace')
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('a')
    expect(detail).toEqual({ value: 'b' })
  })

  it('默认不允许重复：重复提交不新增，输入框标记 aria-invalid', () => {
    const el = mount({ 'model-value': '["a"]' })
    typeValue(el, 'a')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(1)
    expect(inputEl(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('allow-duplicate 时允许重复', () => {
    const el = mount({ 'model-value': '["a"]', 'allow-duplicate': '' })
    typeValue(el, 'a')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(2)
  })

  it('达到 max 后输入框禁用', () => {
    const el = mount({ max: '2', 'model-value': '["a","b"]' })
    expect(inputEl(el).disabled).toBe(true)
  })

  it('未达 max 输入框可用', () => {
    const el = mount({ max: '3', 'model-value': '["a"]' })
    expect(inputEl(el).disabled).toBe(false)
  })

  it('点击标签删除按钮移除标签并派发 oas-remove + oas-change', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    const events: string[] = []
    el.addEventListener('oas-remove', () => events.push('remove'))
    el.addEventListener('oas-change', () => events.push('change'))
    removeBtn(el, 0).click()
    expect(tagEls(el).length).toBe(1)
    expect(tagEls(el)[0]!.textContent).toContain('b')
    expect(events).toEqual(['remove', 'change'])
  })

  it('placeholder 透传到输入框', () => {
    const el = mount({ placeholder: '请输入标签' })
    expect(inputEl(el).placeholder).toBe('请输入标签')
  })

  it('disabled 时输入框与删除按钮禁用', () => {
    const el = mount({ disabled: '', 'model-value': '["a"]' })
    expect(inputEl(el).disabled).toBe(true)
    expect(removeBtn(el, 0).disabled).toBe(true)
  })

  it('删除按钮可聚焦且带 aria-label', () => {
    const el = mount({ 'model-value': '["a"]' })
    const btn = removeBtn(el, 0)
    expect(btn.getAttribute('aria-label')).toBe('移除 a')
    btn.focus()
    expect(el.shadowRoot!.activeElement).toBe(btn)
  })

  it('受控：外部设置 modelValue 属性即时同步', () => {
    const el = mount()
    el.modelValue = ['x']
    expect(tagEls(el).length).toBe(1)
    expect(el.getAttribute('model-value')).toContain('x')
  })

  it('空值输入 Enter 不新增标签', () => {
    const el = mount()
    typeValue(el, '   ')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(0)
  })
})

describe('OASDynamicTags separator / add-on-paste', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function paste(el: OASDynamicTags, text: string): void {
    const ev = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => text } })
    inputEl(el).dispatchEvent(ev)
  }

  it('separator=";" 时分号提交，默认逗号不再提交', () => {
    const el = mount({ separator: ';' })
    typeValue(el, 'a')
    pressKey(el, ';')
    expect(tagEls(el).length).toBe(1)
    const el2 = mount({ separator: ';' })
    typeValue(el2, 'a')
    pressKey(el2, ',')
    expect(tagEls(el2).length).toBe(0)
  })

  it('separator=" " 时空格提交（覆盖 Enter|Space 触发键场景）', () => {
    const el = mount({ separator: ' ' })
    typeValue(el, 'a')
    pressKey(el, ' ')
    expect(tagEls(el).length).toBe(1)
  })

  it('separator="" 时仅 Enter 提交', () => {
    const el = mount({ separator: '' })
    typeValue(el, 'a')
    pressKey(el, ',')
    expect(tagEls(el).length).toBe(0)
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(1)
  })

  it('粘贴含分隔符文本批量建标签（默认开启）', () => {
    const el = mount()
    paste(el, 'a, b ,c')
    expect(el.modelValue).toEqual(['a', 'b', 'c'])
  })

  it('粘贴批量项逐个查重：已存在的跳过', () => {
    const el = mount({ 'model-value': '["a"]' })
    paste(el, 'a,b')
    expect(el.modelValue).toEqual(['a', 'b'])
  })

  it('粘贴批量项受 max 截断', () => {
    const el = mount({ max: '2' })
    paste(el, 'a,b,c')
    expect(el.modelValue).toEqual(['a', 'b'])
  })

  it('粘贴文本不含分隔符时不自动建标签', () => {
    const el = mount()
    paste(el, 'hello')
    expect(tagEls(el).length).toBe(0)
  })

  it('add-on-paste=false 时粘贴不拆分', () => {
    const el = mount({ 'add-on-paste': 'false' })
    paste(el, 'a,b')
    expect(tagEls(el).length).toBe(0)
  })
})

describe('OASDynamicTags save-on-blur（行为变更：默认 true）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认失焦保存：blur 把残留文本提交为标签', () => {
    const el = mount()
    typeValue(el, 'draft')
    inputEl(el).dispatchEvent(new FocusEvent('blur'))
    expect(el.modelValue).toEqual(['draft'])
    expect(inputEl(el).value).toBe('')
  })

  it('save-on-blur=false：失焦静默丢弃（旧行为）', () => {
    const el = mount({ 'save-on-blur': 'false' })
    typeValue(el, 'draft')
    inputEl(el).dispatchEvent(new FocusEvent('blur'))
    expect(el.modelValue).toEqual([])
  })

  it('失焦保存空文本不建标签', () => {
    const el = mount()
    typeValue(el, '   ')
    inputEl(el).dispatchEvent(new FocusEvent('blur'))
    expect(el.modelValue).toEqual([])
  })
})

describe('OASDynamicTags IME 组合态防护', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('输入法组合中按 Enter（选词确认）不建标签', () => {
    const el = mount()
    typeValue(el, '中文')
    inputEl(el).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        isComposing: true,
      }),
    )
    expect(tagEls(el).length).toBe(0)
    expect(inputEl(el).value).toBe('中文')
  })

  it('组合结束后按 Enter 正常建标签', () => {
    const el = mount()
    typeValue(el, '中文')
    inputEl(el).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        isComposing: true,
      }),
    )
    pressKey(el, 'Enter')
    expect(el.modelValue).toEqual(['中文'])
  })

  it('输入法组合中按分隔符不建标签', () => {
    const el = mount()
    typeValue(el, '中,文')
    inputEl(el).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: ',',
        bubbles: true,
        cancelable: true,
        isComposing: true,
      }),
    )
    expect(tagEls(el).length).toBe(0)
  })

  it('keyCode 229（旧浏览器组合态标记）不触发提交', () => {
    const el = mount()
    typeValue(el, 'a')
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'keyCode', { value: 229 })
    inputEl(el).dispatchEvent(ev)
    expect(tagEls(el).length).toBe(0)
  })
})

describe('OASDynamicTags sortable 排序', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function chip(el: OASDynamicTags, idx: number): HTMLElement {
    return tagEls(el)[idx]!
  }

  function pressChip(el: OASDynamicTags, idx: number, key: string, alt = false): void {
    chip(el, idx).dispatchEvent(new KeyboardEvent('keydown', { key, altKey: alt, bubbles: true, cancelable: true }))
  }

  it('sortable 时标签可聚焦（tabindex=-1）且 draggable', () => {
    const el = mount({ sortable: '', 'model-value': '["a"]' })
    expect(chip(el, 0).getAttribute('tabindex')).toBe('-1')
    expect(chip(el, 0).draggable).toBe(true)
  })

  it('未设 sortable 时标签不可聚焦不拖拽', () => {
    const el = mount({ 'model-value': '["a"]' })
    expect(chip(el, 0).getAttribute('tabindex')).toBeNull()
    expect(chip(el, 0).draggable).toBe(false)
  })

  it('空输入 ArrowLeft 聚焦末尾标签', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b"]' })
    pressKey(el, 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(chip(el, 1))
  })

  it('标签 ArrowRight 遍历，末尾回到输入框', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b"]' })
    chip(el, 0).focus()
    pressChip(el, 0, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(chip(el, 1))
    pressChip(el, 1, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(inputEl(el))
  })

  it('Alt+ArrowRight 与右侧交换并派发 oas-change（trigger=sort）', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b","c"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    chip(el, 0).focus()
    pressChip(el, 0, 'ArrowRight', true)
    expect(el.modelValue).toEqual(['b', 'a', 'c'])
    expect(detail).toEqual({ value: ['b', 'a', 'c'], trigger: 'sort' })
    // 焦点跟随被移动的标签（现为 index 1）
    expect(el.shadowRoot!.activeElement).toBe(chip(el, 1))
  })

  it('Alt+ArrowLeft 与左侧交换；首行边界不动', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b"]' })
    chip(el, 1).focus()
    pressChip(el, 1, 'ArrowLeft', true)
    expect(el.modelValue).toEqual(['b', 'a'])
    pressChip(el, 0, 'ArrowLeft', true)
    expect(el.modelValue).toEqual(['b', 'a'])
  })

  it('拖拽机制：dragstart + drop 目标标签重排（trigger=sort）', () => {
    const el = mount({ sortable: '', 'model-value': '["a","b","c"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    chip(el, 0).dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }))
    chip(el, 2).dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
    chip(el, 2).dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    expect(el.modelValue).toEqual(['b', 'c', 'a'])
    expect(detail).toEqual({ value: ['b', 'c', 'a'], trigger: 'sort' })
  })

  it('disabled 时不可排序（无 draggable）', () => {
    const el = mount({ sortable: '', disabled: '', 'model-value': '["a"]' })
    expect(chip(el, 0).draggable).toBe(false)
  })
})

describe('OASDynamicTags max-tag-count 超量折叠', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('超出数量折叠为 +N，title 含隐藏标签', () => {
    const el = mount({ 'max-tag-count': '2', 'model-value': '["a","b","c","d"]' })
    expect(tagEls(el).length).toBe(2)
    const overflow = el.shadowRoot!.querySelector('.tag-overflow')!
    expect(overflow.textContent).toBe('+2')
    expect(overflow.getAttribute('title')).toContain('c')
    expect(overflow.getAttribute('title')).toContain('d')
  })

  it('未设置时不折叠', () => {
    const el = mount({ 'model-value': '["a","b","c"]' })
    expect(tagEls(el).length).toBe(3)
    expect(el.shadowRoot!.querySelector('.tag-overflow')).toBeNull()
  })

  it('折叠不改变 model-value', () => {
    const el = mount({ 'max-tag-count': '1', 'model-value': '["a","b"]' })
    expect(el.modelValue).toEqual(['a', 'b'])
  })

  it('后加 max-tag-count：既有标签切换为折叠形态', async () => {
    const el = mount({ 'model-value': '["a","b","c"]' })
    expect(tagEls(el).length).toBe(3)
    el.setAttribute('max-tag-count', '1')
    await Promise.resolve()
    expect(tagEls(el).length).toBe(1)
    expect(el.shadowRoot!.querySelector('.tag-overflow')!.textContent).toBe('+2')
  })
})

describe('OASDynamicTags size/status/readonly/clearable/maxlength', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function clearBtn(el: OASDynamicTags): HTMLButtonElement {
    return el.shadowRoot!.querySelector<HTMLButtonElement>('.clear')!
  }

  it('size 镜像 data-size，非法值回落 medium', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    const el2 = mount({ size: 'xx' })
    expect(el2.getAttribute('data-size')).toBe('medium')
  })

  it('status 镜像 data-status，error 时输入框 aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(inputEl(el).getAttribute('aria-invalid')).toBe('true')
    const el2 = mount({ status: 'warning' })
    expect(el2.getAttribute('data-status')).toBe('warning')
    expect(inputEl(el2).hasAttribute('aria-invalid')).toBe(false)
  })

  it('readonly：输入框隐藏、移除按钮隐藏', () => {
    const el = mount({ readonly: '', 'model-value': '["a"]' })
    expect(inputEl(el).hidden).toBe(true)
    expect(removeBtn(el, 0).hidden).toBe(true)
    expect(el.getAttribute('aria-readonly')).toBe('true')
  })

  it('clearable：有值时显示清空按钮，点击清空并派发 oas-clear + change(trigger=clear)', () => {
    const el = mount({ clearable: '', 'model-value': '["a","b"]' })
    const btn = clearBtn(el)
    expect(btn.hidden).toBe(false)
    const events: string[] = []
    let detail: unknown
    el.addEventListener('oas-clear', () => events.push('clear'))
    el.addEventListener('oas-change', (e: Event) => {
      events.push('change')
      detail = (e as CustomEvent).detail
    })
    btn.click()
    expect(el.modelValue).toEqual([])
    expect(events).toEqual(['clear', 'change'])
    expect(detail).toEqual({ value: [], trigger: 'clear' })
  })

  it('clearable 空值/禁用/只读时按钮隐藏', () => {
    const el = mount({ clearable: '' })
    expect(clearBtn(el).hidden).toBe(true)
    const el2 = mount({ clearable: '', disabled: '', 'model-value': '["a"]' })
    expect(clearBtn(el2).hidden).toBe(true)
    const el3 = mount({ clearable: '', readonly: '', 'model-value': '["a"]' })
    expect(clearBtn(el3).hidden).toBe(true)
  })

  it('maxlength 透传输入框', () => {
    const el = mount({ maxlength: '5' })
    expect(inputEl(el).maxLength).toBe(5)
  })
})

describe('OASDynamicTags tag 插槽 / prefix / suffix', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('template[slot=tag] 克隆到标签，data-tag-label 绑定，移除按钮保留', async () => {
    const el = mount({ 'model-value': '["a","b"]' })
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'tag')
    tpl.innerHTML = '<span class="my-tag">🏷 <span data-tag-label></span></span>'
    el.appendChild(tpl)
    await Promise.resolve()
    const first = tagEls(el)[0]!
    expect(first.querySelector('.my-tag')).not.toBeNull()
    expect(first.querySelector('[data-tag-label]')!.textContent).toBe('a')
    expect(first.querySelector('.tag-remove')).not.toBeNull()
  })

  it('template[slot=prefix] / [slot=suffix] 克隆到容器首尾', async () => {
    const el = mount({ 'model-value': '["a"]' })
    const p = document.createElement('template')
    p.setAttribute('slot', 'prefix')
    p.innerHTML = '<span class="pfx">收件人</span>'
    const s = document.createElement('template')
    s.setAttribute('slot', 'suffix')
    s.innerHTML = '<span class="sfx">@</span>'
    el.append(p, s)
    await Promise.resolve()
    const tagsBox = el.shadowRoot!.querySelector('.tags')!
    expect(tagsBox.querySelector('.pfx')).not.toBeNull()
    expect(tagsBox.querySelector('.sfx')).not.toBeNull()
    expect(tagsBox.firstElementChild!.classList.contains('slot-prefix')).toBe(true)
    expect(tagsBox.lastElementChild!.classList.contains('slot-suffix')).toBe(true)
  })
})

describe('OASDynamicTags validate（pattern / oas-before-add）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('pattern 不匹配：拒绝添加并标记 aria-invalid + 提示', () => {
    const el = mount({ pattern: '^\\d+$' })
    typeValue(el, 'abc')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(0)
    expect(inputEl(el).getAttribute('aria-invalid')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.hint')!.hidden).toBe(false)
  })

  it('pattern 匹配：正常添加', () => {
    const el = mount({ pattern: '^\\d+$' })
    typeValue(el, '123')
    pressKey(el, 'Enter')
    expect(el.modelValue).toEqual(['123'])
  })

  it('oas-before-add preventDefault 拦截添加', () => {
    const el = mount()
    let vetoed: unknown
    el.addEventListener('oas-before-add', (e: Event) => {
      vetoed = (e as CustomEvent).detail
      e.preventDefault()
    })
    typeValue(el, 'bad')
    pressKey(el, 'Enter')
    expect(tagEls(el).length).toBe(0)
    expect(vetoed).toEqual({ value: 'bad' })
  })

  it('粘贴批量同样走 pattern 校验（不匹配项跳过）', () => {
    const el = mount({ pattern: '^\\d+$' })
    const ev = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => '1,a,2' } })
    inputEl(el).dispatchEvent(ev)
    expect(el.modelValue).toEqual(['1', '2'])
  })
})

describe('OASDynamicTags 编辑现有标签', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function chip(el: OASDynamicTags, idx: number): HTMLElement {
    return tagEls(el)[idx]!
  }

  function editInput(el: OASDynamicTags): HTMLInputElement | null {
    return el.shadowRoot!.querySelector<HTMLInputElement>('.tag-edit')
  }

  it('双击标签进入编辑：原位变输入框并聚焦带值', () => {
    const el = mount({ 'model-value': '["hello"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    const input = editInput(el)
    expect(input).not.toBeNull()
    expect(input!.value).toBe('hello')
    expect(el.shadowRoot!.activeElement).toBe(input)
  })

  it('Enter 提交编辑：派发 oas-edit 与 oas-change(trigger=edit)', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    editInput(el)!.value = 'z'
    let editDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-edit', (e: Event) => (editDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.modelValue).toEqual(['z', 'b'])
    expect(editDetail).toEqual({ index: 0, value: 'z', oldValue: 'a' })
    expect(changeDetail).toEqual({ value: ['z', 'b'], trigger: 'edit' })
  })

  it('Esc 取消编辑还原', () => {
    const el = mount({ 'model-value': '["a"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    editInput(el)!.value = 'changed'
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(el.modelValue).toEqual(['a'])
    expect(editInput(el)).toBeNull()
  })

  it('编辑为重复值：拒绝并保持编辑态（Enter 路径），编辑框标记 aria-invalid', () => {
    const el = mount({ 'model-value': '["a","b"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    editInput(el)!.value = 'b'
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.modelValue).toEqual(['a', 'b'])
    expect(editInput(el)).not.toBeNull()
    expect(editInput(el)!.getAttribute('aria-invalid')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.hint')!.hidden).toBe(false)
  })

  it('编辑为空值：还原旧值退出编辑', () => {
    const el = mount({ 'model-value': '["a"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    editInput(el)!.value = ' '
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.modelValue).toEqual(['a'])
    expect(editInput(el)).toBeNull()
  })

  it('sortable 下标签聚焦后 Enter 进入编辑', () => {
    const el = mount({ sortable: '', 'model-value': '["a"]' })
    chip(el, 0).focus()
    chip(el, 0).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(editInput(el)).not.toBeNull()
  })

  it('编辑失焦默认提交（save-on-blur=true）', () => {
    const el = mount({ 'model-value': '["a"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    editInput(el)!.value = 'ok'
    editInput(el)!.dispatchEvent(new FocusEvent('blur'))
    expect(el.modelValue).toEqual(['ok'])
  })

  it('编辑失焦 save-on-blur=false 时还原', () => {
    const el = mount({ 'save-on-blur': 'false', 'model-value': '["a"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    editInput(el)!.value = 'ok'
    editInput(el)!.dispatchEvent(new FocusEvent('blur'))
    expect(el.modelValue).toEqual(['a'])
  })

  it('readonly 时不可进入编辑', () => {
    const el = mount({ readonly: '', 'model-value': '["a"]' })
    chip(el, 0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
    expect(editInput(el)).toBeNull()
  })
})

describe('OASDynamicTags change trigger 与 focus/blur', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('add/remove 的 oas-change 带 trigger 字段（向后兼容）', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
    typeValue(el, 'x')
    pressKey(el, 'Enter')
    removeBtn(el, 0).click()
    expect(details).toEqual([
      { value: ['x'], trigger: 'add' },
      { value: [], trigger: 'remove' },
    ])
  })

  it('输入框 focus/blur 派发 oas-focus / oas-blur', () => {
    const el = mount()
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    inputEl(el).dispatchEvent(new FocusEvent('focus'))
    inputEl(el).dispatchEvent(new FocusEvent('blur'))
    expect(events).toEqual(['focus', 'blur'])
  })
})
