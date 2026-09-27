import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASFormList } from './index.js'
import { OASForm } from '../form/index.js'
import '../input/index.js'

function makeList(attrs: Record<string, string> = {}, templateHTML = ''): OASFormList {
  const el = new OASFormList()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (templateHTML !== '') {
    const tpl = document.createElement('template')
    tpl.innerHTML = templateHTML
    el.appendChild(tpl)
  }
  document.body.appendChild(el)
  return el
}

function rows(el: OASFormList): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>('[data-oas-form-list-item]')]
}

function frames(el: OASFormList): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')]
}

function addBtn(el: OASFormList): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.add')!
}

function removeBtn(el: OASFormList, idx: number): HTMLButtonElement {
  return frames(el)[idx]!.querySelector<HTMLButtonElement>('.remove')!
}

/** 第 idx 行内的字段（按模板字段顺序） */
function rowFields(el: OASFormList, idx: number): Element[] {
  return [...rows(el)[idx]!.querySelectorAll('[name]')]
}

describe('OASFormList 基础结构', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无 template：0 行、add 按钮在场、无阴影行帧', () => {
    const el = makeList()
    expect(rows(el).length).toBe(0)
    expect(frames(el).length).toBe(0)
    expect(addBtn(el)).not.toBeNull()
    expect(addBtn(el).textContent).toContain('添加')
  })

  it('min 补足行数：每行克隆 template 并按 {index} 占位索引化字段 name', () => {
    const el = makeList({ min: '2' }, '<oas-input name="users.{index}.name"></oas-input>')
    expect(rows(el).length).toBe(2)
    expect(frames(el).length).toBe(2)
    expect(rowFields(el, 0)[0]!.getAttribute('name')).toBe('users.0.name')
    expect(rowFields(el, 1)[0]!.getAttribute('name')).toBe('users.1.name')
  })

  it('name 前缀模式：list name + 模板裸 name → listName.N.name', () => {
    const el = makeList(
      { name: 'members', min: '1' },
      '<oas-input name="name"></oas-input><oas-input name="age"></oas-input>',
    )
    const fields = rowFields(el, 0)
    expect(fields[0]!.getAttribute('name')).toBe('members.0.name')
    expect(fields[1]!.getAttribute('name')).toBe('members.0.age')
  })

  it('无 name 且无 {index}：字段 name 原样克隆（不索引化）', () => {
    const el = makeList({ min: '2' }, '<oas-input name="plain"></oas-input>')
    expect(rowFields(el, 0)[0]!.getAttribute('name')).toBe('plain')
    expect(rowFields(el, 1)[0]!.getAttribute('name')).toBe('plain')
  })

  it('行 wrapper 带 slot 指向阴影帧的具名 slot（视觉帧在 shadow、字段在 light DOM）', () => {
    const el = makeList({ min: '1' }, '<oas-input name="users.{index}.name"></oas-input>')
    const wrapper = rows(el)[0]!
    const slotName = wrapper.getAttribute('slot')!
    expect(slotName).not.toBe('')
    const frame = frames(el)[0]!
    expect(frame.querySelector(`slot[name="${slotName}"]`)).not.toBeNull()
  })

  it('独立使用（不在 oas-form 内）不报错', () => {
    const el = makeList({ min: '1' }, '<oas-input name="users.{index}.name"></oas-input>')
    expect(rows(el).length).toBe(1)
  })
})

describe('OASFormList 增删行', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('点击 add：追加一行、字段按新索引命名、派发 oas-add {index}、焦点进新行首字段', () => {
    const el = makeList({ min: '1' }, '<oas-input name="users.{index}.name"></oas-input>')
    let detail: unknown
    el.addEventListener('oas-add', (e) => (detail = (e as CustomEvent).detail))
    addBtn(el).click()
    expect(rows(el).length).toBe(2)
    expect(rowFields(el, 1)[0]!.getAttribute('name')).toBe('users.1.name')
    expect(detail).toEqual({ index: 1 })
    expect(document.activeElement).toBe(rows(el)[1]!.querySelector('oas-input'))
  })

  it('点击行内 remove：移除该行、剩余行重新编号、派发 oas-remove {index}', () => {
    const el = makeList({ min: '1' }, '<oas-input name="users.{index}.name"></oas-input>')
    addBtn(el).click()
    addBtn(el).click()
    expect(rows(el).length).toBe(3)
    // 给三行分别填值，验证删除后剩余行值随行保留
    const values = ['A', 'B', 'C']
    rows(el).forEach((row, i) => {
      const input = row.querySelector('oas-input')!
      input.setAttribute('value', values[i]!)
    })
    let detail: unknown
    el.addEventListener('oas-remove', (e) => (detail = (e as CustomEvent).detail))
    removeBtn(el, 0).click()
    expect(rows(el).length).toBe(2)
    expect(detail).toEqual({ index: 0 })
    // 原第 2、3 行变成第 0、1 行：值随行保留、name 重新编号
    expect(rowFields(el, 0)[0]!.getAttribute('value')).toBe('B')
    expect(rowFields(el, 0)[0]!.getAttribute('name')).toBe('users.0.name')
    expect(rowFields(el, 1)[0]!.getAttribute('value')).toBe('C')
    expect(rowFields(el, 1)[0]!.getAttribute('name')).toBe('users.1.name')
  })

  it('max 上限：达到 max 后 add 按钮 disabled、点击不加行', () => {
    const el = makeList({ min: '2', max: '2' }, '<oas-input name="users.{index}.name"></oas-input>')
    expect(addBtn(el).disabled).toBe(true)
    addBtn(el).click()
    expect(rows(el).length).toBe(2)
  })

  it('min 下限：唯一行的 remove 按钮 disabled、点击不删', () => {
    const el = makeList({ min: '1' }, '<oas-input name="users.{index}.name"></oas-input>')
    expect(removeBtn(el, 0).disabled).toBe(true)
    removeBtn(el, 0).click()
    expect(rows(el).length).toBe(1)
  })

  it('disabled：add 与 remove 全部 disabled、点击无效果', () => {
    const el = makeList({ min: '1', disabled: '' }, '<oas-input name="users.{index}.name"></oas-input>')
    expect(addBtn(el).disabled).toBe(true)
    expect(removeBtn(el, 0).disabled).toBe(true)
    addBtn(el).click()
    expect(rows(el).length).toBe(1)
  })

  it('list name 属性运行时变化：既有行字段 name 即时重派生', () => {
    const el = makeList({ name: 'a', min: '1' }, '<oas-input name="name"></oas-input>')
    expect(rowFields(el, 0)[0]!.getAttribute('name')).toBe('a.0.name')
    el.setAttribute('name', 'b')
    expect(rowFields(el, 0)[0]!.getAttribute('name')).toBe('b.0.name')
  })
})

describe('OASFormList 与主表联动', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountForm(inner: string, attrs: Record<string, string> = {}): OASForm {
    const form = new OASForm()
    for (const [k, v] of Object.entries(attrs)) form.setAttribute(k, v)
    form.innerHTML = inner
    document.body.appendChild(form)
    return form
  }

  it('提交随主表：form-list 行字段被主表收集，values 组装为嵌套数组', () => {
    const form = mountForm(
      `<oas-form-list name="users" min="2"><template><oas-input name="name"></oas-input></template></oas-form-list>`,
    )
    const list = form.querySelector('oas-form-list')!
    const inputs = [...list.querySelectorAll('oas-input')]
    inputs[0]!.setAttribute('value', '张三')
    inputs[1]!.setAttribute('value', '李四')
    let detail: unknown
    form.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    form.submit()
    expect((detail as { values: unknown }).values).toEqual({ users: [{ name: '张三' }, { name: '李四' }] })
  })

  it('initial-values 嵌套写入行字段（行创建后主表补放初始值）', () => {
    const form = mountForm(
      `<oas-form-list name="users" min="2"><template><oas-input name="name"></oas-input></template></oas-form-list>`,
      { 'initial-values': JSON.stringify({ users: [{ name: '张三' }, { name: '李四' }] }) },
    )
    const inputs = [...form.querySelectorAll('oas-form-list oas-input')]
    expect(inputs[0]!.getAttribute('value')).toBe('张三')
    expect(inputs[1]!.getAttribute('value')).toBe('李四')
  })

  it('rules 按行路径校验：users.1.name required 失败不拦截提交修正后通过', () => {
    const form = mountForm(
      `<oas-form-list name="users" min="2"><template><oas-input name="name"></oas-input></template></oas-form-list>`,
      {
        rules: JSON.stringify({
          'users.1.name': [{ required: true, message: '第二行姓名必填' }],
        }),
      },
    )
    const inputs = [...form.querySelectorAll('oas-form-list oas-input')]
    let errors: Record<string, string> = {}
    form.addEventListener('oas-validate-fail', (e) => (errors = (e as CustomEvent).detail.errors))
    form.submit()
    expect(errors['users.1.name']).toBe('第二行姓名必填')
    expect(inputs[1]!.hasAttribute('aria-invalid')).toBe(true)

    inputs[1]!.setAttribute('value', '李四')
    let fired = 0
    form.addEventListener('oas-submit', () => fired++)
    form.submit()
    expect(fired).toBe(1)
  })

  it('行内输入触发主表 oas-values-change，values 为嵌套快照', () => {
    const form = mountForm(
      `<oas-form-list name="users" min="1"><template><oas-input name="name"></oas-input></template></oas-form-list>`,
    )
    const input = form.querySelector('oas-form-list oas-input')!
    let detail: unknown
    form.addEventListener('oas-values-change', (e) => (detail = (e as CustomEvent).detail))
    input.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value: '新值' } }))
    expect((detail as { name: string; values: unknown }).name).toBe('users.0.name')
    expect((detail as { values: unknown }).values).toEqual({ users: [{ name: '新值' }] })
  })

  it('删除行后重新编号：提交 values 与剩余行一致', () => {
    const form = mountForm(
      `<oas-form-list name="users" min="1"><template><oas-input name="name"></oas-input></template></oas-form-list>`,
    )
    const list = form.querySelector('oas-form-list')!
    const add = list.shadowRoot!.querySelector<HTMLButtonElement>('.add')!
    add.click()
    const inputs = [...list.querySelectorAll('oas-input')]
    inputs[0]!.setAttribute('value', '留下的')
    inputs[1]!.setAttribute('value', '被删的')
    // 删第一行：原第二行（被删的）重编号为 users.0
    ;(list.shadowRoot!.querySelectorAll('.item .remove')[0] as HTMLButtonElement).click()
    let detail: unknown
    form.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    form.submit()
    expect((detail as { values: unknown }).values).toEqual({ users: [{ name: '被删的' }] })
  })
})

describe('OASFormList template 后注入与水合', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('template 晚于连接注入（Vue/md 场景）：观察器感知并按 min 建行', async () => {
    const el = new OASFormList()
    el.setAttribute('name', 'members')
    el.setAttribute('min', '1')
    document.body.appendChild(el)
    expect(rows(el).length).toBe(0)
    const tpl = document.createElement('template')
    tpl.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(tpl)
    await new Promise((r) => setTimeout(r, 0))
    expect(rows(el).length).toBe(1)
    expect(el.querySelector('oas-input')!.getAttribute('name')).toBe('members.0.name')
  })

  it('DSD 真水合：快照命中时 hydrate 接管，shadow 不重建（style 引用保持）', () => {
    const ref = makeList({ name: 'members', min: '1' }, '<oas-input name="name"></oas-input>')
    const snapshot = ref.shadowRoot!.innerHTML

    const el = new OASFormList()
    el.setAttribute('name', 'members')
    el.setAttribute('min', '1')
    const tpl = document.createElement('template')
    tpl.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(tpl)
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-form-list" data-oas-ssr-v="1">${snapshot}`
    document.body.appendChild(el)

    const style = el.shadowRoot!.querySelector('style')
    expect(style).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    // 属性变化走增量 update，不重建 shadow（style 引用不变）
    el.setAttribute('min', '2')
    expect(el.shadowRoot!.querySelector('style')).toBe(style)
    expect(frames(el).length).toBe(2)
  })

  it('快照缺关键结构：回退 render 全量重建，功能正常', () => {
    const el = new OASFormList()
    el.setAttribute('min', '1')
    const tpl = document.createElement('template')
    tpl.innerHTML = '<oas-input name="name"></oas-input>'
    el.appendChild(tpl)
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-form-list" data-oas-ssr-v="1"><div></div>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('.add')).not.toBeNull()
    expect(rows(el).length).toBe(1)
  })
})
