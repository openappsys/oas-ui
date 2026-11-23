import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASForm } from './index.js'
import { OASFormItem } from '../form-item/index.js'
import { OASInput } from '../input/index.js'
import { OASCheckboxGroup } from '../checkbox/index.js'
import { OASTimePicker } from '../time-picker/index.js'
import { OASMatrix } from '../matrix/index.js'
import { OASRank } from '../rank/index.js'

/** 挂一个带 form-item 的表单：字段 name 用 bracket 语法的行级路径场景。
 * 显式构造元素（而非 innerHTML 解析）——happy-dom 下解析式创建的自定义元素升级时机不稳定，
 * 显式构造与组件真实渲染路径（document.createElement）同构。 */
function mountForm(rules: Record<string, unknown> = {}): OASForm {
  const form = new OASForm()
  form.setAttribute('rules', JSON.stringify(rules))
  form.appendChild(fieldItem('姓名', 'users[0].name'))
  form.appendChild(fieldItem('邮箱', 'email'))
  document.body.appendChild(form)
  return form
}

function fieldItem(label: string, name: string, value = ''): OASFormItem {
  const item = new OASFormItem()
  item.setAttribute('label', label)
  const input = new OASInput()
  input.setAttribute('name', name)
  input.setAttribute('value', value)
  item.appendChild(input)
  return item
}

function findInput(form: OASForm, name: string): OASInput {
  return form.querySelector<OASInput>(`oas-input[name="${name}"]`)!
}

function findItem(form: OASForm, name: string): OASFormItem {
  return form.querySelector<OASInput>(`oas-input[name="${name}"]`)!.closest('oas-form-item') as OASFormItem
}

function itemError(item: OASFormItem): HTMLElement {
  return item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
}

function itemWarning(item: OASFormItem): HTMLElement {
  return item.shadowRoot!.querySelector<HTMLElement>('[part="warning"]')!
}

describe('OASForm.setErrors / clearErrors（错误注入通道）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('路径经 parseNamePath 归一：users[0].name 命中 users.0.name 字段并立即上屏', () => {
    const form = mountForm()
    const input = findInput(form, 'users[0].name')
    form.setErrors([{ path: 'users[0].name', message: '服务端：姓名已存在' }])
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(itemError(findItem(form, 'users[0].name')).hidden).toBe(false)
    expect(itemError(findItem(form, 'users[0].name')).textContent).toContain('服务端：姓名已存在')
    expect(form.getErrors()['users[0].name']).toBe('服务端：姓名已存在')
  })

  it('点号与方括号两种书写面等价（users.0.name 注入命中 users[0].name 字段）', () => {
    const form = mountForm()
    form.setErrors([{ path: 'users.0.name', message: '点号路径命中' }])
    expect(itemError(findItem(form, 'users[0].name')).textContent).toContain('点号路径命中')
  })

  it('注入错误阻断 validate：无规则也返回 false 并进 errors 载荷', async () => {
    const form = mountForm()
    form.setErrors([{ path: 'email', message: '服务端拒绝' }])
    await expect(form.validate()).resolves.toBe(false)
    expect(form.getErrors().email).toBe('服务端拒绝')
    // 校验后注入项仍在（直到值变化）
    expect(findInput(form, 'email').getAttribute('aria-invalid')).toBe('true')
  })

  it('服务端错误优先于规则错误：同路径并存时显示注入文案，值变后回落规则错误', () => {
    const form = mountForm({ email: [{ required: true, message: '请填写邮箱' }] })
    const input = findInput(form, 'email')
    form.setErrors([{ path: 'email', message: '服务端：邮箱被占用' }])
    expect(itemError(findItem(form, 'email')).textContent).toContain('服务端：邮箱被占用')

    // 用户改值（走真实事件链）→ 注入项清除，回落规则错误（空值仍是必填）
    input.setAttribute('value', '')
    input.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: '' } }))
    expect(itemError(findItem(form, 'email')).textContent).toContain('请填写邮箱')
    expect(itemError(findItem(form, 'email')).textContent).not.toContain('服务端')
  })

  it('值变后注入清除且规则通过：错误态与 aria-invalid 一并消失', () => {
    const form = mountForm()
    const input = findInput(form, 'email')
    form.setErrors([{ path: 'email', message: '服务端拒绝' }])
    expect(input.getAttribute('aria-invalid')).toBe('true')
    input.setAttribute('value', 'a@b.c')
    input.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: 'a@b.c' } }))
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    expect(itemError(findItem(form, 'email')).hidden).toBe(true)
    expect(form.getErrors().email).toBeUndefined()
  })

  it('warning 不阻断校验、不置 aria-invalid，走 role=status 弱播报位', async () => {
    const form = mountForm({ email: [{ required: true, message: '请填写邮箱' }] })
    const input = findInput(form, 'email')
    input.setAttribute('value', 'a@b.c')
    form.setErrors([{ path: 'email', message: '该邮箱域名不常见', severity: 'warning' }])
    const item = findItem(form, 'email')
    const warning = itemWarning(item)
    expect(warning.hidden).toBe(false)
    expect(warning.getAttribute('role')).toBe('status')
    expect(warning.textContent).toContain('该邮箱域名不常见')
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    await expect(form.validate()).resolves.toBe(true)
    // validate 后 warning 仍在（不是校验失败态）
    expect(itemWarning(item).hidden).toBe(false)
  })

  it('同路径 error 与 warning 并存时 error 独占显示（不叠两条）', async () => {
    const form = mountForm({ email: [{ required: true, message: '请填写邮箱' }] })
    const item = findItem(form, 'email')
    form.setErrors([{ path: 'email', message: '建议使用企业邮箱', severity: 'warning' }])
    expect(itemWarning(item).hidden).toBe(false)
    // 注入 error 覆盖同路径 warning
    form.setErrors([{ path: 'email', message: '服务端拒绝' }])
    expect(itemError(item).hidden).toBe(false)
    expect(itemWarning(item).hidden).toBe(true)
    await form.validate()
    expect(itemError(item).hidden).toBe(false)
    expect(itemWarning(item).hidden).toBe(true)
  })

  it('数组路径（无字段元素）照样进 validate-fail errors 载荷', async () => {
    const form = new OASForm()
    form.appendChild(fieldItem('成员', 'users[0].name', 'x'))
    document.body.appendChild(form)
    form.setErrors([{ path: 'users', message: '至少添加一位成员' }])
    let detail: { errors: Record<string, string> } | null = null
    form.addEventListener('oas-validate-fail', (e) => {
      detail = (e as CustomEvent<{ errors: Record<string, string> }>).detail
    })
    form.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(detail!.errors.users).toBe('至少添加一位成员')
  })

  it('clearErrors(paths) 只清指定路径；省略参数清全部', () => {
    const form = mountForm()
    form.setErrors([
      { path: 'users[0].name', message: 'A' },
      { path: 'email', message: 'B' },
    ])
    form.clearErrors(['users.0.name'])
    expect(itemError(findItem(form, 'users[0].name')).hidden).toBe(true)
    expect(itemError(findItem(form, 'email')).hidden).toBe(false)
    form.clearErrors()
    expect(itemError(findItem(form, 'email')).hidden).toBe(true)
    expect(form.getErrors()).toEqual({})
  })

  it('clearErrors 后回落规则错误（有规则时错误位仍是规则文案）', async () => {
    const form = mountForm({ email: [{ required: true, message: '请填写邮箱' }] })
    form.setErrors([{ path: 'email', message: '服务端拒绝' }])
    form.clearErrors(['email'])
    await Promise.resolve()
    expect(itemError(findItem(form, 'email')).textContent).toContain('请填写邮箱')
  })

  it('reset 清空注入错误（不跨重置残留）', () => {
    const form = mountForm()
    form.setErrors([{ path: 'email', message: '服务端拒绝' }])
    expect(itemError(findItem(form, 'email')).hidden).toBe(false)
    form.reset()
    expect(itemError(findItem(form, 'email')).hidden).toBe(true)
    expect(form.getErrors()).toEqual({})
  })

  it('保留键路径整条拒绝（不污染原型、不进 errors）', () => {
    const form = mountForm()
    form.setErrors([{ path: '__proto__.x', message: '恶意' }])
    expect(({} as Record<string, unknown>).x).toBeUndefined()
    expect(form.getErrors()).toEqual({})
  })

  it('提交路径：异步 validator 失败 + 同名字段注入错误 → 载荷取注入消息（注入优先，与 validate() 同口径）', async () => {
    const form = new OASForm()
    form.appendChild(fieldItem('邮箱', 'email', 'x'))
    document.body.appendChild(form)
    form.rules = { email: [{ validator: () => Promise.resolve('异步规则失败') }] }
    form.setErrors([{ path: 'email', message: '服务端：邮箱被占用' }])
    const failed = new Promise<Record<string, string>>((resolve) => {
      form.addEventListener('oas-validate-fail', (e) => {
        resolve((e as CustomEvent<{ errors: Record<string, string> }>).detail.errors)
      })
    })
    form.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    // 异步规则文案不得覆盖注入文案（旧实现先并入注入再 append 异步 → 后者覆盖后者）
    expect(await failed).toEqual({ email: '服务端：邮箱被占用' })
    expect(itemError(findItem(form, 'email')).textContent).toContain('服务端：邮箱被占用')
    // validate() 路径同口径（注入优先）
    await expect(form.validate()).resolves.toBe(false)
    expect(form.getErrors().email).toBe('服务端：邮箱被占用')
  })

  it('数组级注入错误（无字段元素）不抢占 scroll-to-first-error 定位', async () => {
    const form = new OASForm()
    form.setAttribute('scroll-to-first-error', '')
    form.appendChild(fieldItem('姓名', 'users[0].name'))
    document.body.appendChild(form)
    form.rules = { 'users[0].name': [{ validator: () => Promise.resolve('异步错') }] }
    form.setErrors([{ path: 'users', message: '至少添加一位成员' }])
    const scrollCalls: Element[] = []
    const orig = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element) {
      scrollCalls.push(this)
    }
    try {
      form.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
      await new Promise((r) => setTimeout(r, 20))
    } finally {
      Element.prototype.scrollIntoView = orig
    }
    const input = findInput(form, 'users[0].name')
    expect(form.getErrors().users).toBe('至少添加一位成员')
    // 首个滚动定位必须是带字段元素的错误（数组级注入错误没有可聚焦落点，不得吞掉定位）
    expect(scrollCalls).toEqual([input])
  })
})

describe('空容器归一：required 不放过「零作答」', () => {
  const ROWS = JSON.stringify([{ key: 'speed', label: '响应速度' }])
  const COLUMNS = JSON.stringify([{ key: 'good', label: '好' }])
  const OPTIONS = JSON.stringify([{ key: 'a', label: '苹果' }])
  const GROUP_OPTIONS = JSON.stringify([{ label: 'A', value: 'a' }])

  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('matrix value="{}" / rank、checkbox-group "[]" / 范围 time-picker 读取为空串', () => {
    const form = new OASForm()
    form.innerHTML = `
      <oas-matrix name="grid" rows='${ROWS}' columns='${COLUMNS}' value='{}'></oas-matrix>
      <oas-rank name="order" options='${OPTIONS}' value='[]'></oas-rank>
      <oas-checkbox-group name="tags" options='${GROUP_OPTIONS}' value='[]'></oas-checkbox-group>
      <oas-time-picker name="at" is-range value='["",""]'></oas-time-picker>
    `
    document.body.appendChild(form)
    expect(form.getValues()).toEqual({ grid: '', order: '', tags: '', at: '' })
  })

  it('required 规则对四类空容器判失败（有值时照常通过）', async () => {
    const form = new OASForm()
    form.setAttribute(
      'rules',
      JSON.stringify({
        grid: [{ required: true, message: '请作答矩阵' }],
        order: [{ required: true, message: '请排序' }],
        tags: [{ required: true, message: '请选择' }],
        at: [{ required: true, message: '请选时间' }],
      }),
    )
    form.innerHTML = `
      <oas-matrix name="grid" rows='${ROWS}' columns='${COLUMNS}' value='{}'></oas-matrix>
      <oas-rank name="order" options='${OPTIONS}' value='[]'></oas-rank>
      <oas-checkbox-group name="tags" options='${GROUP_OPTIONS}' value='[]'></oas-checkbox-group>
      <oas-time-picker name="at" is-range value='["",""]'></oas-time-picker>
    `
    document.body.appendChild(form)
    await expect(form.validate()).resolves.toBe(false)
    expect(Object.keys(form.getErrors()).sort()).toEqual(['at', 'grid', 'order', 'tags'])

    // 有作答即通过（归一不吞真实值）
    form.innerHTML = `
      <oas-matrix name="grid" rows='${ROWS}' columns='${COLUMNS}' value='{"speed":"good"}'></oas-matrix>
      <oas-rank name="order" options='${OPTIONS}' value='["a"]'></oas-rank>
      <oas-checkbox-group name="tags" options='${GROUP_OPTIONS}' value='["a"]'></oas-checkbox-group>
      <oas-time-picker name="at" is-range value='["09:00","11:00"]'></oas-time-picker>
    `
    await expect(form.validate()).resolves.toBe(true)
    expect(form.getErrors()).toEqual({})
  })
})

describe('FORM_CONTROLS 注册补漏（checkbox-group / time-picker）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('oas-checkbox-group 的多选值进表单快照', () => {
    const form = new OASForm()
    form.innerHTML = `
      <oas-checkbox-group name="tags" value='["a","c"]' options='[{"label":"A","value":"a"},{"label":"B","value":"b"},{"label":"C","value":"c"}]'></oas-checkbox-group>
    `
    document.body.appendChild(form)
    // 值契约：form 内核叶子恒为字符串，数组出 JSON 串（schema-form 求值前再做只读投影）
    expect(form.getValues()).toEqual({ tags: '["a","c"]' })
    // 类型可用性（编译期断言，避免 import 被摇掉）
    expect(new OASCheckboxGroup()).toBeInstanceOf(OASCheckboxGroup)
  })

  it('oas-time-picker 的值进表单快照并随 initial-values 写入', () => {
    const form = new OASForm()
    form.setAttribute('initial-values', JSON.stringify({ at: '09:30:00' }))
    form.innerHTML = '<oas-time-picker name="at" value=""></oas-time-picker>'
    document.body.appendChild(form)
    expect(form.getValues()).toEqual({ at: '09:30:00' })
    expect(new OASTimePicker()).toBeInstanceOf(OASTimePicker)
  })
})

describe('FORM_CONTROLS 注册补漏（matrix / rank）', () => {
  const ROWS = JSON.stringify([
    { key: 'speed', label: '响应速度' },
    { key: 'quality', label: '内容质量' },
  ])
  const COLUMNS = JSON.stringify([
    { key: 'bad', label: '差' },
    { key: 'good', label: '好' },
  ])
  const OPTIONS = JSON.stringify([
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
  ])

  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('oas-matrix 带 name 的值进表单快照（value 属性 JSON 串契约）', () => {
    const form = new OASForm()
    form.innerHTML = `<oas-matrix name="grid" rows='${ROWS}' columns='${COLUMNS}' value='{"speed":"good"}'></oas-matrix>`
    document.body.appendChild(form)
    expect(form.getValues()).toEqual({ grid: '{"speed":"good"}' })
    expect(new OASMatrix()).toBeInstanceOf(OASMatrix)
  })

  it('oas-rank 的值随 initial-values 回写，并在快照中按 JSON 串收集', () => {
    const form = new OASForm()
    form.setAttribute('initial-values', JSON.stringify({ order: ['b', 'a'] }))
    form.innerHTML = `<oas-rank name="order" options='${OPTIONS}' value=""></oas-rank>`
    document.body.appendChild(form)
    expect(form.getValues()).toEqual({ order: '["b","a"]' })
    expect(new OASRank()).toBeInstanceOf(OASRank)
  })
})
