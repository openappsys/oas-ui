import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASForm } from './index.js'
import { OASFormItem } from '../form-item/index.js'
import { OASInput } from '../input/index.js'
import { OASSwitch } from '../switch/index.js'
import { OASCheckboxGroup } from '../checkbox/index.js'

/** 显式构造元素（happy-dom 下解析式创建的自定义元素升级时机不稳定） */
function fieldItem(label: string, name: string, value = ''): OASFormItem {
  const item = new OASFormItem()
  item.setAttribute('label', label)
  const input = new OASInput()
  input.setAttribute('name', name)
  input.setAttribute('value', value)
  item.appendChild(input)
  return item
}

function mountForm(): OASForm {
  const form = new OASForm()
  form.initialValues = { name: '初始', users: [{ nick: 'A' }], vip: false }
  form.appendChild(fieldItem('姓名', 'name'))
  form.appendChild(fieldItem('昵称', 'users.0.nick'))
  form.appendChild(fieldItem('邮箱', 'users.1.mail'))
  const item = new OASFormItem()
  item.setAttribute('label', '会员')
  const toggle = new OASSwitch()
  toggle.setAttribute('name', 'vip')
  item.appendChild(toggle)
  form.appendChild(item)
  document.body.appendChild(form)
  return form
}

function widget(form: OASForm, name: string): OASInput | OASSwitch {
  return form.querySelector<OASInput | OASSwitch>(`[name="${name}"]`)!
}

describe('OASForm.setValues（受控写通道）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('按嵌套路径写字段（点号 / 方括号书写面等价），走 writer 注册表', () => {
    const form = mountForm()
    form.setValues({ name: '王五', users: [{ nick: 'B' }] })
    expect(widget(form, 'name').getAttribute('value')).toBe('王五')
    expect(widget(form, 'users.0.nick').getAttribute('value')).toBe('B')
    const values = form.getValues() as { name: string; users: Array<Record<string, string>> }
    expect(values.name).toBe('王五')
    expect(values.users[0]).toEqual({ nick: 'B' })
  })

  it('布尔 / 数字 / null 按控件通道写入（switch 走 checked，数字字符串化，null 为空串）', () => {
    const form = mountForm()
    form.setValues({ vip: true })
    expect(widget(form, 'vip').hasAttribute('checked')).toBe(true)
    form.setValues({ vip: false })
    expect(widget(form, 'vip').hasAttribute('checked')).toBe(false)
    form.setValues({ name: 42 })
    expect(widget(form, 'name').getAttribute('value')).toBe('42')
    form.setValues({ name: null })
    expect(widget(form, 'name').getAttribute('value')).toBe('')
  })

  it('写入不派发 oas-values-change（程序化写与 initial-values 同口径）', () => {
    const form = mountForm()
    const events: string[] = []
    form.addEventListener('oas-values-change', () => events.push('change'))
    form.setValues({ name: '静默', users: [{ nick: 'C' }, { mail: 'c@example.com' }] })
    expect(events).toEqual([])
  })

  it('未渲染的路径与保留键段跳过（不抛错、不污染原型）', () => {
    const form = mountForm()
    const patch = JSON.parse('{"missing":"x","__proto__":{"hacked":1},"users":[{"nick":"D"},{"nick":"E"}]}') as Record<
      string,
      unknown
    >
    expect(() => form.setValues(patch)).not.toThrow()
    expect(({} as Record<string, unknown>).hacked).toBeUndefined()
    const values = form.getValues() as { users: Array<Record<string, string>> }
    expect(values.users[0]).toEqual({ nick: 'D' })
  })

  it('已渲染字段本身就是数组值容器时整值写入（不按下标拆成假路径）', () => {
    const form = mountForm()
    const item = new OASFormItem()
    item.setAttribute('label', '标签')
    const group = new OASCheckboxGroup()
    group.setAttribute('name', 'tags')
    group.setAttribute(
      'options',
      JSON.stringify([
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
      ]),
    )
    item.appendChild(group)
    form.appendChild(item)

    form.setValues({ tags: ['a', 'b'] })
    expect(group.getAttribute('value')).toBe('["a","b"]')
    form.setValues({ tags: ['b'] })
    expect(group.getAttribute('value')).toBe('["b"]')
    form.setValues({ tags: null })
    expect(group.getAttribute('value')).toBe('')
  })

  it('非字段容器（如 form-list 行键）仍按下标下钻写行字段', () => {
    const form = mountForm()
    form.setValues({ users: [{ nick: 'Z' }, { mail: 'z@example.com' }] })
    expect(widget(form, 'users.0.nick').getAttribute('value')).toBe('Z')
    expect(widget(form, 'users.1.mail').getAttribute('value')).toBe('z@example.com')
  })

  it('不改变 reset 基线：reset 仍回 initialValues', () => {
    const form = mountForm()
    expect(widget(form, 'name').getAttribute('value')).toBe('初始')
    form.setValues({ name: '改了' })
    form.reset()
    expect(widget(form, 'name').getAttribute('value')).toBe('初始')
  })

  it('非对象入参：devWarn 且忽略（不打断调用方）', () => {
    const form = mountForm()
    expect(() => form.setValues(null as unknown as Record<string, unknown>)).not.toThrow()
    expect(widget(form, 'name').getAttribute('value')).toBe('初始')
  })
})
