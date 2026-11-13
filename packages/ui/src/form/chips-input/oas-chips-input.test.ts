import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASChipsInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASChipsInput {
  const el = new OASChipsInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function chipEls(el: OASChipsInput): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="listitem"]')]
}

function inputEl(el: OASChipsInput): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('.chip-input')!
}

function removeBtn(el: OASChipsInput, idx: number): HTMLButtonElement {
  return chipEls(el)[idx]!.querySelector<HTMLButtonElement>('.chip-remove')!
}

function editInput(el: OASChipsInput): HTMLInputElement | null {
  return el.shadowRoot!.querySelector<HTMLInputElement>('.chip-edit')
}

function pressKey(el: OASChipsInput, keyName: string): void {
  inputEl(el).dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }))
}

function typeValue(el: OASChipsInput, value: string): void {
  inputEl(el).value = value
}

function paste(el: OASChipsInput, text: string): boolean {
  const ev = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'clipboardData', { value: { getData: () => text } })
  return inputEl(el).dispatchEvent(ev)
}

describe('OASChipsInput 渲染与值通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('value（JSON attribute）渲染 chips，容器 role=list、chip role=listitem', () => {
    const el = mount({ value: '["a@b.co","c@d.co"]' })
    expect(chipEls(el).length).toBe(2)
    expect(el.shadowRoot!.querySelector('[part="chips"]')!.getAttribute('role')).toBe('list')
    expect(chipEls(el)[0]!.getAttribute('role')).toBe('listitem')
    expect(chipEls(el)[0]!.textContent).toContain('a@b.co')
  })

  it('property value 读取返回副本；写入回写 attribute 并重建，不派发事件', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    el.value = ['x@y.co', 'z@w.co']
    expect(el.value).toEqual(['x@y.co', 'z@w.co'])
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['x@y.co', 'z@w.co'])
    expect(chipEls(el).length).toBe(2)
    expect(fired).toBe(0)
    // 副本语义：改返回数组不影响内部
    const got = el.value
    got.push('evil')
    expect(el.value).toEqual(['x@y.co', 'z@w.co'])
  })

  it("'value' in el === true（原型访问器，非实例 expando）", () => {
    const el = mount()
    expect('value' in el).toBe(true)
    el.value = ['a@b.co']
    expect(Object.hasOwn(el, 'value')).toBe(false)
  })

  it("observedAttributes 含 'name'（oas-form 收集链的字段键）", () => {
    expect(OASChipsInput.observedAttributes).toContain('name')
  })

  it('非法 JSON attribute 忽略（空数组渲染）', () => {
    const el = mount({ value: 'not-json' })
    expect(chipEls(el).length).toBe(0)
    expect(el.value).toEqual([])
  })

  it('placeholder 缺省走 i18n 文案，属性优先', () => {
    const el = mount()
    expect(inputEl(el).placeholder).toBe('输入邮箱，回车添加')
    const el2 = mount({ placeholder: '自定义' })
    expect(inputEl(el2).placeholder).toBe('自定义')
  })

  it('输入框 aria-label 走 i18n，删除按钮 aria-label 带值', () => {
    const el = mount({ value: '["a@b.co"]' })
    expect(inputEl(el).getAttribute('aria-label')).toBe('添加收件人')
    expect(removeBtn(el, 0).getAttribute('aria-label')).toBe('移除 a@b.co')
  })
})

describe('OASChipsInput 成 chip（Enter / 逗号 / 分号）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('Enter 成 chip：清空输入，派发 oas-add + oas-change(trigger=add)', () => {
    const el = mount()
    const events: string[] = []
    let addDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-add', (e: Event) => {
      events.push('add')
      addDetail = (e as CustomEvent).detail
    })
    el.addEventListener('oas-change', (e: Event) => {
      events.push('change')
      changeDetail = (e as CustomEvent).detail
    })
    typeValue(el, 'a@b.co')
    pressKey(el, 'Enter')
    expect(chipEls(el).length).toBe(1)
    expect(inputEl(el).value).toBe('')
    expect(events).toEqual(['add', 'change'])
    expect(addDetail).toEqual({ value: 'a@b.co', index: 0 })
    expect(changeDetail).toEqual({ value: ['a@b.co'], trigger: 'add' })
  })

  it('逗号 / 分号 成 chip', () => {
    const el = mount()
    typeValue(el, 'a@b.co')
    pressKey(el, ',')
    expect(chipEls(el).length).toBe(1)
    typeValue(el, 'c@d.co')
    pressKey(el, ';')
    expect(chipEls(el).length).toBe(2)
    expect(el.value).toEqual(['a@b.co', 'c@d.co'])
  })

  it('首尾空白 trim 后成 chip；空输入不新增', () => {
    const el = mount()
    typeValue(el, '  a@b.co  ')
    pressKey(el, 'Enter')
    expect(el.value).toEqual(['a@b.co'])
    typeValue(el, '   ')
    pressKey(el, 'Enter')
    expect(el.value).toEqual(['a@b.co'])
  })

  it('IME 组合态（isComposing / keyCode 229）下 Enter 与分隔符不成 chip', () => {
    const el = mount()
    typeValue(el, '中文')
    inputEl(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true }),
    )
    expect(chipEls(el).length).toBe(0)
    const ev = new KeyboardEvent('keydown', { key: ',', bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'keyCode', { value: 229 })
    inputEl(el).dispatchEvent(ev)
    expect(chipEls(el).length).toBe(0)
  })

  it('oas-change bubbles + composed', () => {
    const el = mount()
    const seen: Event[] = []
    document.body.addEventListener('oas-change', (e) => seen.push(e))
    typeValue(el, 'a@b.co')
    pressKey(el, 'Enter')
    expect(seen[0]?.bubbles).toBe(true)
    expect(seen[0]?.composed).toBe(true)
  })
})

describe('OASChipsInput 粘贴拆分', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('分号 / 逗号 / 换行 / 空白分隔的粘贴文本拆成多个 chip', () => {
    const el = mount()
    paste(el, 'a@b.co; c@d.co,e@f.co\n g@h.co\ti@j.co')
    expect(el.value).toEqual(['a@b.co', 'c@d.co', 'e@f.co', 'g@h.co', 'i@j.co'])
  })

  it('全角分号 / 全角逗号（中文 IME）同样拆分与成 chip（T15）', () => {
    const el = mount()
    paste(el, 'a@b.co；c@d.co，e@f.co')
    expect(el.value).toEqual(['a@b.co', 'c@d.co', 'e@f.co'])
    typeValue(el, 'g@h.co')
    pressKey(el, '；')
    expect(el.value).toEqual(['a@b.co', 'c@d.co', 'e@f.co', 'g@h.co'])
  })

  it('粘贴含分隔符时拦截默认插入（preventDefault），oas-change 仅一次（trigger=paste）', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
    const notPrevented = paste(el, 'a@b.co,b@c.co')
    expect(notPrevented).toBe(false)
    expect(details).toEqual([{ value: ['a@b.co', 'b@c.co'], trigger: 'paste' }])
  })

  it('粘贴不含分隔符时不拦截（保持原生插入），不建 chip', () => {
    const el = mount()
    const notPrevented = paste(el, 'a@b.co')
    expect(notPrevented).toBe(true)
    expect(chipEls(el).length).toBe(0)
  })

  it('粘贴批量逐项去重、受 max 截断并派发 oas-exceed-limit', () => {
    const el = mount({ value: '["a@b.co"]', max: '3' })
    const exceeded: unknown[] = []
    el.addEventListener('oas-exceed-limit', (e: Event) => exceeded.push((e as CustomEvent).detail))
    paste(el, 'a@b.co,c@d.co,e@f.co,g@h.co')
    expect(el.value).toEqual(['a@b.co', 'c@d.co', 'e@f.co'])
    // 超限的 g@h.co 被拦截并派发（重复项 a@b.co 走静默去重，不占上限也不派发）
    expect(exceeded).toEqual([{ value: 'g@h.co', max: 3 }])
  })
})

describe('OASChipsInput 删除与回编辑', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('× 钮单独删除 chip，派发 oas-remove + oas-change(trigger=remove)', () => {
    const el = mount({ value: '["a@b.co","c@d.co"]' })
    const events: string[] = []
    let removeDetail: unknown
    el.addEventListener('oas-remove', (e: Event) => {
      events.push('remove')
      removeDetail = (e as CustomEvent).detail
    })
    el.addEventListener('oas-change', () => events.push('change'))
    removeBtn(el, 0).click()
    expect(el.value).toEqual(['c@d.co'])
    expect(events).toEqual(['remove', 'change'])
    expect(removeDetail).toEqual({ value: 'a@b.co', index: 0 })
  })

  it('输入为空时 Backspace 回编辑上一 chip（变为可编辑文本并聚焦带值）', () => {
    const el = mount({ value: '["a@b.co","c@d.co"]' })
    pressKey(el, 'Backspace')
    const edit = editInput(el)
    expect(edit?.value, '回编辑输入框带原值').toBe('c@d.co')
    expect(el.shadowRoot!.activeElement).toBe(edit)
  })

  it('回编辑后 Enter 提交修改，派发 oas-change(trigger=edit)', () => {
    const el = mount({ value: '["a@b.co","c@d.co"]' })
    let changeDetail: unknown
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    pressKey(el, 'Backspace')
    editInput(el)!.value = 'x@y.co'
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.value).toEqual(['a@b.co', 'x@y.co'])
    expect(changeDetail).toEqual({ value: ['a@b.co', 'x@y.co'], trigger: 'edit' })
    expect(editInput(el)).toBeNull()
  })

  it('回编辑后 Esc 取消还原', () => {
    const el = mount({ value: '["a@b.co"]' })
    pressKey(el, 'Backspace')
    editInput(el)!.value = 'changed@x.co'
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(el.value).toEqual(['a@b.co'])
    expect(editInput(el)).toBeNull()
  })

  it('回编辑后清空提交 = 删除该 chip（oas-remove）', () => {
    const el = mount({ value: '["a@b.co","c@d.co"]' })
    const events: string[] = []
    el.addEventListener('oas-remove', () => events.push('remove'))
    pressKey(el, 'Backspace')
    editInput(el)!.value = '  '
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.value).toEqual(['a@b.co'])
    expect(events).toEqual(['remove'])
    expect(editInput(el)).toBeNull()
  })

  it('回编辑提交为与其他 chip 重复的值：静默去重还原旧值（devWarn 一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ value: '["a@b.co","c@d.co"]' })
      pressKey(el, 'Backspace')
      editInput(el)!.value = 'a@b.co'
      editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      expect(el.value).toEqual(['a@b.co', 'c@d.co'])
      expect(editInput(el)).toBeNull()
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('空输入无 chip 时 Backspace 无操作', () => {
    const el = mount()
    pressKey(el, 'Backspace')
    expect(editInput(el)).toBeNull()
    expect(el.value).toEqual([])
  })

  it('回归：blur 发起的编辑提交不抢回焦点（点页面任意位置一次即可离开）', () => {
    const el = mount({ value: '["a@b.co"]' })
    pressKey(el, 'Backspace')
    editInput(el)!.value = 'x@y.co'
    // 用户编辑 chip 后点击页面任意位置：blur 提交，焦点不得被拽回主输入框
    editInput(el)!.dispatchEvent(new FocusEvent('blur'))
    expect(el.value).toEqual(['x@y.co'])
    expect(el.shadowRoot!.activeElement).not.toBe(inputEl(el))
  })

  it('键盘 Enter 发起的编辑提交仍回焦点到主输入框（连续输入心智）', () => {
    const el = mount({ value: '["a@b.co"]' })
    pressKey(el, 'Backspace')
    editInput(el)!.value = 'x@y.co'
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.value).toEqual(['x@y.co'])
    expect(el.shadowRoot!.activeElement).toBe(inputEl(el))
  })
})

describe('OASChipsInput 邮箱内联校验', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('非法邮箱成 chip 不拦截提交语义：chip 照建，红描边（data-invalid），派发 oas-invalid', () => {
    const el = mount()
    const invalids: unknown[] = []
    el.addEventListener('oas-invalid', (e: Event) => invalids.push((e as CustomEvent).detail))
    typeValue(el, 'not-an-email')
    pressKey(el, 'Enter')
    expect(chipEls(el).length).toBe(1)
    expect(chipEls(el)[0]!.getAttribute('data-invalid')).toBe('true')
    expect(invalids).toEqual([{ value: 'not-an-email', index: 0 }])
  })

  it('合法邮箱不派发 oas-invalid、无 data-invalid', () => {
    const el = mount()
    const invalids: unknown[] = []
    el.addEventListener('oas-invalid', (e: Event) => invalids.push((e as CustomEvent).detail))
    typeValue(el, 'a@b.co')
    pressKey(el, 'Enter')
    expect(invalids).toEqual([])
    expect(chipEls(el)[0]!.hasAttribute('data-invalid')).toBe(false)
  })

  it('oas-invalid 幂等：重渲染（size 变化）不重复派发；程序写 value 含非法不派发', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-invalid', () => fired++)
    typeValue(el, 'bad')
    pressKey(el, 'Enter')
    expect(fired).toBe(1)
    el.setAttribute('size', 'large')
    expect(fired, '重渲染不重复派发').toBe(1)
    el.value = ['also-bad']
    expect(fired, '受控写入不派发（宿主裁决）').toBe(1)
  })

  it('粘贴批量中的非法项逐枚派发 oas-invalid（index 为最终位次）', () => {
    const el = mount()
    const invalids: unknown[] = []
    el.addEventListener('oas-invalid', (e: Event) => invalids.push((e as CustomEvent).detail))
    paste(el, 'a@b.co, bad1, c@d.co, bad2')
    expect(el.value).toEqual(['a@b.co', 'bad1', 'c@d.co', 'bad2'])
    expect(invalids).toEqual([
      { value: 'bad1', index: 1 },
      { value: 'bad2', index: 3 },
    ])
  })

  it('回编辑提交非法值：派发 oas-invalid（新 index），chip 红描边', () => {
    const el = mount({ value: '["a@b.co"]' })
    const invalids: unknown[] = []
    el.addEventListener('oas-invalid', (e: Event) => invalids.push((e as CustomEvent).detail))
    pressKey(el, 'Backspace')
    editInput(el)!.value = 'oops'
    editInput(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.value).toEqual(['oops'])
    expect(invalids).toEqual([{ value: 'oops', index: 0 }])
    expect(chipEls(el)[0]!.getAttribute('data-invalid')).toBe('true')
  })

  it('非法 chip 的 title 携带 i18n 提示文案', () => {
    const el = mount({ value: '["bad"]' })
    expect(chipEls(el)[0]!.getAttribute('title')).toBe('邮箱格式不正确')
  })
})

describe('OASChipsInput max 上限', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('达上限后 Enter 不再新增，派发 oas-exceed-limit（detail { value, max }）', () => {
    const el = mount({ value: '["a@b.co"]', max: '1' })
    const exceeded: unknown[] = []
    el.addEventListener('oas-exceed-limit', (e: Event) => exceeded.push((e as CustomEvent).detail))
    typeValue(el, 'c@d.co')
    pressKey(el, 'Enter')
    expect(el.value).toEqual(['a@b.co'])
    expect(exceeded).toEqual([{ value: 'c@d.co', max: 1 }])
  })

  it('达上限后仍可删除 chip', () => {
    const el = mount({ value: '["a@b.co"]', max: '1' })
    removeBtn(el, 0).click()
    expect(el.value).toEqual([])
  })
})

describe('OASChipsInput 重复值静默去重', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('重复 Enter 不新增、无 oas-add，devWarn 仅一次（实例级）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ value: '["a@b.co"]' })
      let addFired = 0
      el.addEventListener('oas-add', () => addFired++)
      typeValue(el, 'a@b.co')
      pressKey(el, 'Enter')
      expect(el.value).toEqual(['a@b.co'])
      expect(addFired).toBe(0)
      expect(warn).toHaveBeenCalledTimes(1)
      // 再次重复：仍静默去重，不重复告警
      typeValue(el, 'a@b.co')
      pressKey(el, 'Enter')
      expect(el.value).toEqual(['a@b.co'])
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('OASChipsInput disabled / readonly / size', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('disabled：输入框与删除按钮禁用', () => {
    const el = mount({ disabled: '', value: '["a@b.co"]' })
    expect(inputEl(el).disabled).toBe(true)
    expect(removeBtn(el, 0).disabled).toBe(true)
  })

  it('readonly：输入框与删除按钮隐藏，宿主 aria-readonly', () => {
    const el = mount({ readonly: '', value: '["a@b.co"]' })
    expect(inputEl(el).hidden).toBe(true)
    expect(removeBtn(el, 0).hidden).toBe(true)
    expect(el.getAttribute('aria-readonly')).toBe('true')
  })

  it('size 镜像 data-size，非法值回落 medium', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    const el2 = mount({ size: 'xx' })
    expect(el2.getAttribute('data-size')).toBe('medium')
  })

  it('focus / blur 事件派发', () => {
    const el = mount()
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    inputEl(el).dispatchEvent(new FocusEvent('focus'))
    inputEl(el).dispatchEvent(new FocusEvent('blur'))
    expect(events).toEqual(['focus', 'blur'])
  })
})
