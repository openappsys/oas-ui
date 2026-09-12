import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASRadio, OASRadioGroup } from './index.js'

function mountRadio(attrs: Record<string, string> = {}, slot = '选项'): OASRadio {
  const el = new OASRadio()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function native(el: OASRadio): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASRadio', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 radio，value 属性透传', async () => {
    const el = mountRadio({ value: 'a' }, 'A')
    const input = native(el)
    await Promise.resolve()
    expect(input.type).toBe('radio')
    expect(el.getAttribute('value')).toBe('a')
    expect(el.textContent).toContain('A')
  })

  it('checked 受控同步，点击后选中', () => {
    const el = mountRadio()
    expect(native(el).checked).toBe(false)
    native(el).click()
    expect(native(el).checked).toBe(true)
    expect(el.hasAttribute('checked')).toBe(true)
  })

  it('disabled 不可交互', () => {
    const el = mountRadio({ disabled: '', checked: '' })
    const input = native(el)
    input.click()
    expect(input.checked).toBe(true)
  })

  it('同名 radio 互斥：选中第二个后第一个取消选中', () => {
    const a = mountRadio({ name: 'g', value: 'a' }, 'A')
    const b = mountRadio({ name: 'g', value: 'b' }, 'B')
    native(b).click()
    expect(native(a).checked).toBe(false)
    expect(a.hasAttribute('checked')).toBe(false)
    expect(native(b).checked).toBe(true)
    expect(b.hasAttribute('checked')).toBe(true)
  })

  it('无 name 的 radio 不受同名互斥影响', () => {
    const a = mountRadio({}, 'A')
    const b = mountRadio({ name: 'g', value: 'b' }, 'B')
    native(b).click()
    expect(native(a).checked).toBe(false)
  })
})

describe('OASRadio 尺寸档（size）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size 镜像 data-size，默认 medium，非法回落', () => {
    expect(mountRadio().getAttribute('data-size')).toBe('medium')
    expect(mountRadio({ size: 'small' }).getAttribute('data-size')).toBe('small')
    expect(mountRadio({ size: 'large' }).getAttribute('data-size')).toBe('large')
    expect(mountRadio({ size: 'huge' }).getAttribute('data-size')).toBe('medium')
  })
})

describe('OASRadio 只读（readonly）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('readonly 点击不选中，aria-readonly 同步，可聚焦', () => {
    const el = mountRadio({ readonly: '' })
    const input = native(el)
    expect(input.getAttribute('aria-readonly')).toBe('true')
    input.click()
    expect(input.checked).toBe(false)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(input)
  })

  it('readonly 已选项点击保持选中', () => {
    const el = mountRadio({ readonly: '', checked: '' })
    native(el).click()
    expect(native(el).checked).toBe(true)
  })
})

describe('OASRadio 校验态（status，含单项级）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('status 镜像 data-status；error 联动 aria-invalid', () => {
    const el = mountRadio({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(el.getAttribute('aria-invalid')).toBe('true')
    el.setAttribute('status', '')
    expect(el.getAttribute('data-status')).toBe(null)
    expect(el.getAttribute('aria-invalid')).toBe(null)
  })

  it('组级 status 下发子项，单项显式 status 优先', () => {
    const g = new OASRadioGroup()
    g.setAttribute('status', 'error')
    g.innerHTML = `<oas-radio value="a">A</oas-radio><oas-radio value="b" status="success">B</oas-radio>`
    document.body.appendChild(g)
    const [a, b] = [...g.querySelectorAll('oas-radio')]
    expect(a!.getAttribute('data-group-status')).toBe('error')
    expect(a!.getAttribute('data-status')).toBe('error')
    expect(b!.getAttribute('data-status')).toBe('success')
  })
})

describe('OASRadio checked-icon 插槽与 description / label-position / variant', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('checked-icon 插槽内容在场时镜像 data-custom-checked-icon', () => {
    const el = new OASRadio()
    el.textContent = '选项'
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'checked-icon')
    tpl.innerHTML = '<svg>●</svg>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    expect(el.getAttribute('data-custom-checked-icon')).toBe('')
  })

  it('template[slot] 指示器内容克隆展开进指示器容器', () => {
    const el = new OASRadio()
    el.textContent = '选项'
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'checked-icon')
    tpl.innerHTML = '<span class="dot">◉</span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    const holder = el.shadowRoot!.querySelector('.indicator-checked')!.querySelector('.indicator-tpl')
    expect(holder).not.toBeNull()
    expect(holder!.querySelector('.dot')).not.toBeNull()
  })

  it('description 属性渲染次要文本，无则隐藏', () => {
    const el = mountRadio({}, '主文案')
    el.setAttribute('description', '副文本')
    const desc = el.shadowRoot!.querySelector('.description') as HTMLElement
    expect(desc.hidden).toBe(false)
    expect(desc.textContent).toContain('副文本')
    el.removeAttribute('description')
    expect((el.shadowRoot!.querySelector('.description') as HTMLElement).hidden).toBe(true)
  })

  it('组件永不写 description slot 的子树（slotchange 自激死循环回归防护）', () => {
    const el = mountRadio({}, '主文案')
    el.setAttribute('description', '副文本')
    el.setAttribute('description', '再改一次')
    const descSlot = el.shadowRoot!.querySelector('slot[name="description"]')!
    expect(descSlot.childNodes.length).toBe(0)
  })

  it('label-position 属性透传存活（视觉由 CSS 切换）', () => {
    expect(mountRadio({ 'label-position': 'start' }).getAttribute('label-position')).toBe('start')
  })

  it('variant 镜像 data-variant，非法回落 default', () => {
    expect(mountRadio({ variant: 'card' }).getAttribute('data-variant')).toBe('card')
    expect(mountRadio({ variant: 'pill' }).getAttribute('data-variant')).toBe('default')
  })
})

describe('OASRadio focus / blur 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('input 聚焦/失焦派发 oas-focus / oas-blur', () => {
    const el = mountRadio()
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    native(el).focus()
    native(el).blur()
    expect(events).toEqual(['focus', 'blur'])
  })
})

describe('OASRadioGroup', () => {
  function mountGroup(): OASRadioGroup {
    const el = new OASRadioGroup()
    el.setAttribute('value', 'a')
    el.innerHTML = `
      <oas-radio value="a">A</oas-radio>
      <oas-radio value="b">B</oas-radio>
    `
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('fieldset 组织，value 驱动子项选中', async () => {
    const el = mountGroup()
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('fieldset')).not.toBeNull()
    const a = el.querySelector('oas-radio[value="a"]')!
    expect(a.hasAttribute('checked')).toBe(true)
  })

  it('选择子项后 group value 更新为该项值', () => {
    const el = mountGroup()
    const b = el.querySelector('oas-radio[value="b"]')!
    ;(b.shadowRoot!.querySelector('input')! as HTMLInputElement).click()
    expect(el.getAttribute('value')).toBe('b')
  })
})

describe('OASRadioGroup 组级能力', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountGroup(attrs: Record<string, string> = {}): OASRadioGroup {
    const el = new OASRadioGroup()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = `
      <oas-radio value="a">A</oas-radio>
      <oas-radio value="b">B</oas-radio>
      <oas-radio value="c" disabled>C（禁用）</oas-radio>
    `
    document.body.appendChild(el)
    return el
  }

  function itemInput(el: OASRadioGroup, value: string): HTMLInputElement {
    const item = el.querySelector(`oas-radio[value="${value}"]`)!
    return item.shadowRoot!.querySelector('input')!
  }

  it('子项点击只派发一次组 oas-change（重复挂监听债修复）', () => {
    const el = mountGroup({ value: 'a' })
    let count = 0
    // 只计组自身派发的 oas-change（子项事件 bubbles 穿过组 host，属正常传播不算）
    el.addEventListener('oas-change', (e) => {
      if (e.target === el) count++
    })
    el.setAttribute('value', 'b')
    el.setAttribute('value', 'a')
    itemInput(el, 'b').click()
    expect(count).toBe(1)
  })

  it('组级 disabled 不抹掉子项自身 disabled', () => {
    const el = mountGroup()
    expect(itemInput(el, 'c').disabled).toBe(true)
    expect(itemInput(el, 'a').disabled).toBe(false)
    el.setAttribute('disabled', '')
    expect(itemInput(el, 'a').disabled).toBe(true)
  })

  it('组级 size/readonly 下发子项', () => {
    const el = mountGroup({ size: 'small', readonly: '' })
    const a = el.querySelector('oas-radio[value="a"]')!
    expect(a.getAttribute('data-group-size')).toBe('small')
    expect(a.getAttribute('data-group-readonly')).toBe('')
    a.setAttribute('size', 'large')
    expect(a.getAttribute('data-size')).toBe('large')
  })

  it('组级 readonly 下发后子项不可切换', () => {
    const el = mountGroup({ readonly: '' })
    itemInput(el, 'a').click()
    expect(itemInput(el, 'a').checked).toBe(false)
  })

  it('direction 镜像 data-direction，默认 vertical', () => {
    expect(mountGroup().getAttribute('data-direction')).toBe('vertical')
    expect(mountGroup({ direction: 'horizontal' }).getAttribute('data-direction')).toBe('horizontal')
  })

  it('options 数据通道渲染子项并可交互', () => {
    const el = mountGroup({
      value: 'x',
      options: JSON.stringify([
        { label: '选项X', value: 'x' },
        { label: '选项Y', value: 'y', description: 'Y 的说明' },
        { label: '选项Z', value: 'z', disabled: true },
      ]),
    })
    const options = el.shadowRoot!.querySelector('.options')!
    expect(options).not.toBeNull()
    const items = [...options.querySelectorAll('oas-radio')]
    expect(items.length).toBe(3)
    expect(items[0]!.hasAttribute('checked')).toBe(true)
    expect(items[1]!.getAttribute('description')).toBe('Y 的说明')
    expect(items[2]!.hasAttribute('disabled')).toBe(true)
    ;(items[1]!.shadowRoot!.querySelector('input')! as HTMLInputElement).click()
    expect(el.getAttribute('value')).toBe('y')
  })

  it('组级 focus/blur：子项聚焦派发 oas-focus，离开派发 oas-blur', () => {
    const el = mountGroup()
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    itemInput(el, 'a').focus()
    expect(events).toEqual(['focus'])
    itemInput(el, 'a').blur()
    expect(events).toEqual(['focus', 'blur'])
  })
})

describe('OASRadioGroup 键盘组模式（roving tabindex + 方向键循环）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountGroup(attrs: Record<string, string> = {}): OASRadioGroup {
    const el = new OASRadioGroup()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = `
      <oas-radio value="a">A</oas-radio>
      <oas-radio value="b">B</oas-radio>
      <oas-radio value="c" disabled>C（禁用）</oas-radio>
      <oas-radio value="d">D</oas-radio>
    `
    document.body.appendChild(el)
    return el
  }

  function itemInput(el: OASRadioGroup, value: string): HTMLInputElement {
    const item = el.querySelector(`oas-radio[value="${value}"]`)!
    return item.shadowRoot!.querySelector('input')!
  }

  function key(el: OASRadioGroup, keyName: string, fromValue: string): void {
    const host = el.querySelector(`oas-radio[value="${fromValue}"]`)!
    host.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: keyName,
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
  }

  it('roving tabindex：选中项为唯一 Tab 停靠点，未选中项 -1', () => {
    const el = mountGroup({ value: 'b' })
    expect(itemInput(el, 'b').tabIndex).toBe(0)
    expect(itemInput(el, 'a').tabIndex).toBe(-1)
    expect(itemInput(el, 'd').tabIndex).toBe(-1)
  })

  it('无选中时首个可用项为 Tab 停靠点', () => {
    const el = mountGroup()
    expect(itemInput(el, 'a').tabIndex).toBe(0)
    expect(itemInput(el, 'b').tabIndex).toBe(-1)
  })

  it('ArrowDown 移动到下一可用项并即选中，roving 随之更新', () => {
    const el = mountGroup({ value: 'a' })
    key(el, 'ArrowDown', 'a')
    expect(el.getAttribute('value')).toBe('b')
    expect(itemInput(el, 'b').tabIndex).toBe(0)
    expect(itemInput(el, 'a').tabIndex).toBe(-1)
    const b = el.querySelector('oas-radio[value="b"]')!
    expect(b.hasAttribute('checked')).toBe(true)
  })

  it('ArrowDown 跳过禁用项', () => {
    const el = mountGroup({ value: 'b' })
    key(el, 'ArrowDown', 'b')
    expect(el.getAttribute('value')).toBe('d')
  })

  it('末项 ArrowDown 循环回首项', () => {
    const el = mountGroup({ value: 'd' })
    key(el, 'ArrowDown', 'd')
    expect(el.getAttribute('value')).toBe('a')
  })

  it('ArrowUp 反向移动并循环', () => {
    const el = mountGroup({ value: 'a' })
    key(el, 'ArrowUp', 'a')
    expect(el.getAttribute('value')).toBe('d')
    key(el, 'ArrowUp', 'd')
    expect(el.getAttribute('value')).toBe('b')
  })

  it('ArrowRight / ArrowLeft 与纵向键等价', () => {
    const el = mountGroup({ value: 'a' })
    key(el, 'ArrowRight', 'a')
    expect(el.getAttribute('value')).toBe('b')
    key(el, 'ArrowLeft', 'b')
    expect(el.getAttribute('value')).toBe('a')
  })

  it('Home / End 跳首末可用项', () => {
    const el = mountGroup({ value: 'b' })
    key(el, 'End', 'b')
    expect(el.getAttribute('value')).toBe('d')
    key(el, 'Home', 'd')
    expect(el.getAttribute('value')).toBe('a')
  })

  it('方向键选中派发组 oas-change', () => {
    const el = mountGroup({ value: 'a' })
    let fired = 0
    // 只计组自身派发的 oas-change（子项事件 bubbles 穿过组 host，属正常传播不算）
    el.addEventListener('oas-change', (e) => {
      if (e.target === el) fired++
    })
    key(el, 'ArrowDown', 'a')
    expect(fired).toBe(1)
  })

  it('焦点随移动转移到目标项 input', () => {
    const el = mountGroup({ value: 'a' })
    key(el, 'ArrowDown', 'a')
    expect(el.querySelector('oas-radio[value="b"]')!.shadowRoot!.activeElement).toBe(itemInput(el, 'b'))
  })

  it('组级 readonly 时方向键不切换', () => {
    const el = mountGroup({ value: 'a', readonly: '' })
    key(el, 'ArrowDown', 'a')
    expect(el.getAttribute('value')).toBe('a')
  })

  it('组级 disabled 时方向键不响应', () => {
    const el = mountGroup({ value: 'a', disabled: '' })
    key(el, 'ArrowDown', 'a')
    expect(el.getAttribute('value')).toBe('a')
  })

  it('选中变化后 roving 停靠点跟随（点击路径）', () => {
    const el = mountGroup({ value: 'a' })
    itemInput(el, 'd').click()
    expect(itemInput(el, 'd').tabIndex).toBe(0)
    expect(itemInput(el, 'a').tabIndex).toBe(-1)
  })

  it('options 通道渲染的子项同样参与键盘导航', () => {
    const el = new OASRadioGroup()
    el.setAttribute('value', 'x')
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: 'X', value: 'x' },
        { label: 'Y', value: 'y' },
      ]),
    )
    document.body.appendChild(el)
    const items = [...el.shadowRoot!.querySelectorAll('oas-radio')]
    items[0]!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    )
    expect(el.getAttribute('value')).toBe('y')
  })
})

describe('OASRadio focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内原生 radio', () => {
    const el = new OASRadio()
    el.textContent = '选项 A'
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('input'))
  })
})
