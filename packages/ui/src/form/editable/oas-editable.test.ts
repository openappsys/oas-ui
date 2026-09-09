import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASEditable } from './index.js'

function mount(attrs: Record<string, string> = {}): OASEditable {
  const el = new OASEditable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function display(el: OASEditable): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="display"]')!
}

function field(el: OASEditable): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('input')!
}

function okBtn(el: OASEditable): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.ok')!
}

function cancelBtn(el: OASEditable): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.cancel')!
}

function pressField(el: OASEditable, keyName: string): void {
  field(el).dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
  )
}

function pressDisplay(el: OASEditable, keyName: string): void {
  display(el).dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
  )
}

describe('OASEditable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('展示态：显示 value，role=button，aria-label=编辑', async () => {
    const el = mount({ value: 'hello' })
    await Promise.resolve()
    expect(display(el).textContent).toBe('hello')
    expect(display(el).getAttribute('role')).toBe('button')
    expect(display(el).getAttribute('aria-label')).toBe('编辑')
  })

  it('空值展示 placeholder', () => {
    const el = mount({ placeholder: '点击编辑' })
    expect(display(el).textContent).toBe('点击编辑')
  })

  it('点击展示态进入编辑，输入框聚焦并带值', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    expect(display(el).hidden).toBe(true)
    expect(field(el).hidden).toBe(false)
    expect(field(el).value).toBe('hello')
  })

  it('展示态 Enter/空格进入编辑', () => {
    const el = mount({ value: 'x' })
    pressDisplay(el, 'Enter')
    expect(field(el).hidden).toBe(false)
    const el2 = mount({ value: 'x' })
    const d2 = display(el2)
    d2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(field(el2).hidden).toBe(false)
  })

  it('编辑态 Enter 提交并派发 oas-change', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    field(el).value = 'world'
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    pressField(el, 'Enter')
    expect(detail).toEqual({ value: 'world' })
    expect(el.getAttribute('value')).toBe('world')
    expect(display(el).textContent).toBe('world')
  })

  it('编辑态 Esc 还原旧值并派发 oas-cancel', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    field(el).value = 'changed'
    let detail: unknown
    el.addEventListener('oas-cancel', (e: Event) => (detail = (e as CustomEvent).detail))
    pressField(el, 'Escape')
    expect(detail).not.toBeUndefined()
    expect(el.getAttribute('value')).toBe('hello')
    expect(display(el).textContent).toBe('hello')
  })

  it('空值提交：还原旧值并派发 oas-cancel（默认非破坏）', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    field(el).value = ''
    let cancelled = false
    el.addEventListener('oas-cancel', () => (cancelled = true))
    pressField(el, 'Enter')
    expect(cancelled).toBe(true)
    expect(el.getAttribute('value')).toBe('hello')
    expect(display(el).textContent).toBe('hello')
  })

  it('submit-on-enter=false 时 Enter 不提交', () => {
    const el = mount({ value: 'a', 'submit-on-enter': 'false' })
    display(el).click()
    field(el).value = 'b'
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    pressField(el, 'Enter')
    expect(detail).toBeUndefined()
  })

  it('点击确认按钮提交、取消按钮还原', () => {
    const el = mount({ value: 'a' })
    display(el).click()
    field(el).value = 'b'
    okBtn(el).click()
    expect(el.getAttribute('value')).toBe('b')
    const el2 = mount({ value: 'c' })
    display(el2).click()
    field(el2).value = 'd'
    cancelBtn(el2).click()
    expect(el2.getAttribute('value')).toBe('c')
  })

  it('maxlength 透传到输入框', () => {
    const el = mount({ maxlength: '10' })
    display(el).click()
    expect(field(el).maxLength).toBe(10)
  })

  it('disabled 时不可进入编辑', () => {
    const el = mount({ disabled: '', value: 'x' })
    display(el).click()
    expect(display(el).hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.edit')!.hidden).toBe(true)
  })

  it('编辑态输入框保持 aria-label=编辑', () => {
    const el = mount({ value: 'x' })
    display(el).click()
    expect(field(el).getAttribute('aria-label')).toBe('编辑')
  })

  it('值未变化提交不派发事件', () => {
    const el = mount({ value: 'same' })
    display(el).click()
    field(el).value = 'same'
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    el.addEventListener('oas-cancel', () => (fired = true))
    pressField(el, 'Enter')
    expect(fired).toBe(false)
  })
})

describe('OASEditable submit-on-blur 四态', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function blurField(el: OASEditable): void {
    field(el).dispatchEvent(new FocusEvent('blur', { relatedTarget: document.body }))
  }

  it('默认 blur 提交（现状行为）', () => {
    const el = mount({ value: 'a' })
    display(el).click()
    field(el).value = 'b'
    blurField(el)
    expect(el.getAttribute('value')).toBe('b')
  })

  it('submit-on-blur=false：blur 不提交、保持编辑态', () => {
    const el = mount({ value: 'a', 'submit-on-blur': 'false' })
    display(el).click()
    field(el).value = 'b'
    blurField(el)
    expect(el.getAttribute('value')).toBe('a')
    expect(display(el).hidden).toBe(true)
  })

  it('submit-on-enter=false + submit-on-blur=false：仅按钮提交', () => {
    const el = mount({ value: 'a', 'submit-on-enter': 'false', 'submit-on-blur': 'false' })
    display(el).click()
    field(el).value = 'b'
    pressField(el, 'Enter')
    blurField(el)
    expect(el.getAttribute('value')).toBe('a')
    okBtn(el).click()
    expect(el.getAttribute('value')).toBe('b')
  })
})

describe('OASEditable editing 受控 / default-editing', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('宿主设 editing 属性进入编辑态并派发 oas-editing', () => {
    const el = mount({ value: 'a' })
    const states: unknown[] = []
    el.addEventListener('oas-editing', (e: Event) => states.push((e as CustomEvent).detail))
    el.setAttribute('editing', '')
    expect(display(el).hidden).toBe(true)
    expect(states).toEqual([{ editing: true }])
  })

  it('宿主移除 editing 属性退出编辑（走取消路径，非破坏）', () => {
    const el = mount({ value: 'a' })
    el.setAttribute('editing', '')
    field(el).value = 'changed'
    let cancelled = false
    const states: unknown[] = []
    el.addEventListener('oas-cancel', () => (cancelled = true))
    el.addEventListener('oas-editing', (e: Event) => states.push((e as CustomEvent).detail))
    el.removeAttribute('editing')
    expect(el.getAttribute('value')).toBe('a')
    expect(cancelled).toBe(true)
    expect(states).toEqual([{ editing: false }])
  })

  it('default-editing：挂载即编辑态', () => {
    const el = mount({ value: 'a', 'default-editing': '' })
    expect(display(el).hidden).toBe(true)
    expect(field(el).value).toBe('a')
  })

  it('内部进入/退出编辑时 editing 属性反射', () => {
    const el = mount({ value: 'a' })
    display(el).click()
    expect(el.hasAttribute('editing')).toBe(true)
    pressField(el, 'Escape')
    expect(el.hasAttribute('editing')).toBe(false)
  })

  it('disabled 下宿主设 editing 不进入编辑', () => {
    const el = mount({ value: 'a', disabled: '' })
    el.setAttribute('editing', '')
    expect(display(el).hidden).toBe(false)
  })
})

describe('OASEditable readonly / status / size', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('readonly：可聚焦但不可进入编辑，aria-readonly', () => {
    const el = mount({ value: 'a', readonly: '' })
    expect(display(el).getAttribute('aria-readonly')).toBe('true')
    expect(display(el).tabIndex).toBe(0)
    display(el).click()
    expect(display(el).hidden).toBe(false)
  })

  it('status=error 镜像 data-status 且编辑框 aria-invalid', () => {
    const el = mount({ value: 'a', status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    display(el).click()
    expect(field(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('非法 status 不镜像', () => {
    const el = mount({ value: 'a', status: 'oops' })
    expect(el.hasAttribute('data-status')).toBe(false)
  })

  it('size 镜像 data-size，非法回落 medium', () => {
    const el = mount({ value: 'a', size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    const el2 = mount({ value: 'a', size: 'xx' })
    expect(el2.getAttribute('data-size')).toBe('medium')
  })
})

describe('OASEditable display 插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('template[slot=display] 克隆展示态内容，data-display-value 绑定值', async () => {
    const el = mount({ value: '张三' })
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'display')
    tpl.innerHTML = '<span class="rich">👤 <span data-display-value></span></span>'
    el.appendChild(tpl)
    await Promise.resolve()
    expect(display(el).querySelector('.rich')).not.toBeNull()
    expect(display(el).querySelector('[data-display-value]')!.textContent).toBe('张三')
  })

  it('display 插槽下仍可点击进入编辑', async () => {
    const el = mount({ value: 'a' })
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'display')
    tpl.innerHTML = '<span class="rich"><span data-display-value></span></span>'
    el.appendChild(tpl)
    await Promise.resolve()
    display(el).click()
    expect(display(el).hidden).toBe(true)
  })
})

describe('OASEditable multiline 多行编辑', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function textarea(el: OASEditable): HTMLTextAreaElement {
    return el.shadowRoot!.querySelector<HTMLTextAreaElement>('textarea')!
  }

  function pressMulti(el: OASEditable, key: string, ctrl = false): void {
    textarea(el).dispatchEvent(
      new KeyboardEvent('keydown', { key, ctrlKey: ctrl, bubbles: true, cancelable: true }),
    )
  }

  it('multiline 渲染 textarea 而非 input', () => {
    const el = mount({ value: 'a', multiline: '' })
    display(el).click()
    expect(textarea(el)).not.toBeNull()
    expect(el.shadowRoot!.querySelector('input')).toBeNull()
  })

  it('Enter 换行不提交，Ctrl+Enter 提交', () => {
    const el = mount({ value: 'a', multiline: '' })
    display(el).click()
    textarea(el).value = 'line1'
    pressMulti(el, 'Enter')
    expect(display(el).hidden).toBe(true)
    pressMulti(el, 'Enter', true)
    expect(el.getAttribute('value')).toBe('line1')
  })

  it('metaKey+Enter（⌘）提交', () => {
    const el = mount({ value: 'a', multiline: '' })
    display(el).click()
    textarea(el).value = 'b'
    textarea(el).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(el.getAttribute('value')).toBe('b')
  })

  it('Esc 取消', () => {
    const el = mount({ value: 'a', multiline: '' })
    display(el).click()
    textarea(el).value = 'changed'
    pressMulti(el, 'Escape')
    expect(el.getAttribute('value')).toBe('a')
  })

  it('IME 组合中 Ctrl+Enter 不提交（选词确认不误触）', () => {
    const el = mount({ value: 'a', multiline: '' })
    display(el).click()
    textarea(el).value = '中文'
    textarea(el).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(el.getAttribute('value')).toBe('a')
    expect(display(el).hidden).toBe(true)
  })
})

describe('OASEditable trigger=icon 图标触发', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function pencil(el: OASEditable): HTMLButtonElement {
    return el.shadowRoot!.querySelector<HTMLButtonElement>('.trigger-icon')!
  }

  it('默认 text 触发：无铅笔按钮，展示态 role=button', () => {
    const el = mount({ value: 'a' })
    expect(pencil(el).hidden).toBe(true)
    expect(display(el).getAttribute('role')).toBe('button')
  })

  it('icon 触发：点文本不进编辑，点铅笔进入', () => {
    const el = mount({ value: 'a', trigger: 'icon' })
    expect(pencil(el).hidden).toBe(false)
    expect(display(el).getAttribute('role')).toBeNull()
    display(el).click()
    expect(display(el).hidden).toBe(false)
    pencil(el).click()
    expect(display(el).hidden).toBe(true)
  })

  it('铅笔按钮键盘可达（Enter/空格进入编辑）', () => {
    const el = mount({ value: 'a', trigger: 'icon' })
    pencil(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    expect(display(el).hidden).toBe(true)
    const el2 = mount({ value: 'a', trigger: 'icon' })
    pencil(el2).dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
    )
    expect(display(el2).hidden).toBe(true)
  })
})

describe('OASEditable allow-empty / 图标插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认空值提交还原旧值（非破坏）；allow-empty 时空值照常提交', () => {
    const el = mount({ value: 'a' })
    display(el).click()
    field(el).value = ''
    let changed = false
    el.addEventListener('oas-change', () => (changed = true))
    pressField(el, 'Enter')
    expect(changed).toBe(false)
    expect(el.getAttribute('value')).toBe('a')

    const el2 = mount({ value: 'a', 'allow-empty': '' })
    display(el2).click()
    field(el2).value = ''
    let detail: unknown
    el2.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    pressField(el2, 'Enter')
    expect(detail).toEqual({ value: '' })
    expect(el2.getAttribute('value')).toBe('')
    expect(display(el2).textContent).toBe('')
  })

  it('template[slot=ok-icon] / [slot=cancel-icon] 替换默认按钮图标', async () => {
    const el = mount({ value: 'a' })
    const ok = document.createElement('template')
    ok.setAttribute('slot', 'ok-icon')
    ok.innerHTML = '<span class="my-ok">✓</span>'
    const cancel = document.createElement('template')
    cancel.setAttribute('slot', 'cancel-icon')
    cancel.innerHTML = '<span class="my-cancel">✗</span>'
    el.append(ok, cancel)
    await Promise.resolve()
    display(el).click()
    expect(okBtn(el).querySelector('.my-ok')).not.toBeNull()
    expect(cancelBtn(el).querySelector('.my-cancel')).not.toBeNull()
  })
})

describe('OASEditable oas-editing 事件（进入/退出各一次）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('进入编辑派发 {editing:true}，提交退出派发 {editing:false}', () => {
    const el = mount({ value: 'a' })
    const states: unknown[] = []
    el.addEventListener('oas-editing', (e: Event) => states.push((e as CustomEvent).detail))
    display(el).click()
    field(el).value = 'b'
    pressField(el, 'Enter')
    expect(states).toEqual([{ editing: true }, { editing: false }])
  })
})

describe('OASEditable trigger=dblclick 双击触发', () => {
  beforeEach(() => { document.body.innerHTML = '' })
  afterEach(() => { document.body.innerHTML = '' })

  it('dblclick 触发：单击不进编辑，双击进入', () => {
    const el = mount({ value: 'a', trigger: 'dblclick' })
    expect(display(el).getAttribute('role')).toBe('button')
    display(el).click()
    expect(display(el).hidden).toBe(false) // 单击不触发
    display(el).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(display(el).hidden).toBe(true) // 双击进入编辑
  })

  it('dblclick 触发：Enter/空格聚焦时进编辑（键盘逃生）', () => {
    const el = mount({ value: 'a', trigger: 'dblclick' })
    display(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(display(el).hidden).toBe(true)
  })

  it('dblclick 触发：icon 模式下双击不进编辑（铅笔承担）', () => {
    const el = mount({ value: 'a', trigger: 'icon' })
    display(el).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(display(el).hidden).toBe(false)
  })
})
