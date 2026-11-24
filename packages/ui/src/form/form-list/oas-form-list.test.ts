import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    expect(addBtn(el).tagName).toBe('BUTTON')
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
    expect(frame.querySelectorAll(`slot[name="${slotName}"]`).length).toBe(1)
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

  it('add-text / remove-text 覆盖按钮文案与可访问名（schema-form 注入 i18n 文案用）', () => {
    const el = makeList(
      { min: '1', 'add-text': '添加成员', 'remove-text': '删除成员' },
      '<oas-input name="users.{index}.name"></oas-input>',
    )
    expect(addBtn(el).textContent).toContain('添加成员')
    expect(removeBtn(el, 0).getAttribute('aria-label')).toBe('删除成员')
  })

  it('remove-text 运行时变更：既有行的可访问名跟着刷新（不重连、不加行）', () => {
    const el = makeList({ min: '2', 'remove-text': '删除成员' }, '<oas-input name="users.{index}.name"></oas-input>')
    expect(removeBtn(el, 0).getAttribute('aria-label')).toBe('删除成员')
    expect(removeBtn(el, 1).getAttribute('aria-label')).toBe('删除成员')
    el.setAttribute('remove-text', '移除这一项')
    expect(removeBtn(el, 0).getAttribute('aria-label')).toBe('移除这一项')
    expect(removeBtn(el, 1).getAttribute('aria-label')).toBe('移除这一项')
    // 移除属性回落到 i18n 默认文案（两个按钮同时更新）
    el.removeAttribute('remove-text')
    const fallback = removeBtn(el, 0).getAttribute('aria-label')
    expect(fallback).not.toBe('移除这一项')
    expect(removeBtn(el, 1).getAttribute('aria-label')).toBe(fallback)
  })

  it('collision-guard：私有解析方法不与 attribute camelCase 撞名（addText / removeText）', () => {
    // 框架按「key in el」走 property 写入时，同名实例方法会被 own property 遮蔽 → this.addText() TypeError
    const proto = OASFormList.prototype as unknown as Record<string, unknown>
    for (const name of ['addText', 'removeText']) {
      expect(
        proto[name],
        `${name} 不得作为实例成员存在（撞 add-text / remove-text 的 camelCase，改名 resolveAddText / resolveRemoveText）`,
      ).toBeUndefined()
    }
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
    expect(style!.tagName).toBe('STYLE')
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
    expect(el.shadowRoot!.querySelectorAll('.add').length).toBe(1)
    expect(rows(el).length).toBe(1)
  })
})

describe('OASFormList rows / min 拆分与行操作（V2 批 1）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function actionBtn(el: OASFormList, idx: number, action: string): HTMLButtonElement {
    return frames(el)[idx]!.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!
  }

  function liveText(el: OASFormList): string {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="live"]')!.textContent ?? ''
  }

  it('rows 决定初始行数、min 只作删行下界：初始 1 行可删空（minItems 归校验层）', () => {
    const el = makeList({ name: 'users', rows: '1' }, '<oas-input name="nick"></oas-input>')
    expect(rows(el).length).toBe(1)
    expect(actionBtn(el, 0, 'remove').disabled).toBe(false)
    actionBtn(el, 0, 'remove').click()
    expect(rows(el).length).toBe(0)
  })

  it('rows 缺省时 min 仍兼作初始行数（既有用法向后兼容）', () => {
    const el = makeList({ min: '3' }, '<oas-input name="name"></oas-input>')
    expect(rows(el).length).toBe(3)
  })

  it('复制行：插入下一行、值 JSON 深拷贝、oas-duplicate {from,to} + 播报', () => {
    const el = makeList({ name: 'users', rows: '2' }, '<oas-input name="nick"></oas-input>')
    rowFields(el, 0)[0]!.setAttribute('value', 'A')
    rowFields(el, 1)[0]!.setAttribute('value', 'B')
    const events: unknown[] = []
    el.addEventListener('oas-duplicate', (e) => events.push((e as CustomEvent).detail))
    actionBtn(el, 0, 'duplicate').click()
    expect(events).toEqual([{ from: 0, to: 1 }])
    expect(rows(el).length).toBe(3)
    expect(rowFields(el, 1)[0]!.getAttribute('name')).toBe('users.1.nick')
    expect(rowFields(el, 1)[0]!.getAttribute('value')).toBe('A')
    expect(rowFields(el, 2)[0]!.getAttribute('value')).toBe('B')
    expect(liveText(el)).toContain('已复制第 2 行')
  })

  it('上移 / 下移：值交换（DOM 顺序不动）+ oas-move {from,to} + 焦点跟随', () => {
    const el = makeList({ name: 'users', rows: '2' }, '<oas-input name="nick"></oas-input>')
    rowFields(el, 0)[0]!.setAttribute('value', 'A')
    rowFields(el, 1)[0]!.setAttribute('value', 'B')
    const events: unknown[] = []
    el.addEventListener('oas-move', (e) => events.push((e as CustomEvent).detail))
    actionBtn(el, 1, 'move-up').click()
    expect(events).toEqual([{ from: 1, to: 0 }])
    expect(rowFields(el, 0)[0]!.getAttribute('value')).toBe('B')
    expect(rowFields(el, 1)[0]!.getAttribute('value')).toBe('A')
    // 首行的上移已禁用 → 焦点退到该行「下移」（可撤销刚做的移动）
    expect(el.shadowRoot!.activeElement).toBe(actionBtn(el, 0, 'move-down'))
    expect(liveText(el)).toContain('第 2 行已移动到第 1 行')
  })

  it('setRowCount 收敛行数（增补 / 缩减，不派发事件，重编号即时）', () => {
    const el = makeList({ name: 'users', rows: '1' }, '<oas-input name="nick"></oas-input>')
    const events: unknown[] = []
    el.addEventListener('oas-add', (e) => events.push(e))
    el.addEventListener('oas-remove', (e) => events.push(e))
    el.setRowCount(3)
    expect(rows(el).length).toBe(3)
    el.setRowCount(1)
    expect(rows(el).length).toBe(1)
    expect(rowFields(el, 0)[0]!.getAttribute('name')).toBe('users.0.nick')
    expect(events).toHaveLength(0)
  })

  it('insertRowAt 在指定位置插行并重编号（后续行值随行保留）', () => {
    const el = makeList({ name: 'users', rows: '2' }, '<oas-input name="nick"></oas-input>')
    rowFields(el, 0)[0]!.setAttribute('value', 'A')
    rowFields(el, 1)[0]!.setAttribute('value', 'B')
    expect(el.insertRowAt(1)).toBe(true)
    expect(rows(el).length).toBe(3)
    expect(rowFields(el, 2)[0]!.getAttribute('name')).toBe('users.2.nick')
    expect(rowFields(el, 2)[0]!.getAttribute('value')).toBe('B')
  })

  it('断开重连：观察器重挂、行不重复创建（行数不翻倍）、行操作可用', () => {
    const el = makeList({ name: 'users', rows: '1' }, '<oas-input name="nick"></oas-input>')
    el.remove()
    document.body.appendChild(el)
    expect(rows(el).length).toBe(1)
    actionBtn(el, 0, 'duplicate').click()
    expect(rows(el).length).toBe(2)
  })
})

describe('OASFormList 虚拟滚动（virtual，v2.6.9 批 A）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 大列表挂载：原生 input 模板（轻量），行数 / 属性可调 */
  function makeBig(count: number, attrs: Record<string, string> = {}): OASFormList {
    return makeList({ name: 'users', rows: String(count), ...attrs }, '<input name="nick">')
  }

  function scroller(el: OASFormList): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('.items')!
  }

  function mountFrames(el: OASFormList): HTMLElement[] {
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')]
  }

  function spacerHeight(el: OASFormList, which: 'top' | 'bottom'): number {
    const node = el.shadowRoot!.querySelector<HTMLElement>(`[data-vspacer="${which}"]`)
    return node ? Number(parseFloat(node.style.height)) : Number.NaN
  }

  /** 设置滚动位置并派发 scroll（模拟用户滚动） */
  function scrollTo(el: OASFormList, top: number): void {
    const sc = scroller(el)
    sc.scrollTop = top
    sc.dispatchEvent(new Event('scroll'))
  }

  /**
   * 模拟真实浏览器的盒高：窗口计算与 `.items` 盒高同源（clientHeight），happy-dom 无布局恒 0，
   * 组件回落兜底窗口；需要确定窗口规模的用例用桩供给盒高（等价于真实浏览器的 max-height 生效）。
   * 桩设置后派发一次 scroll 触发重算（等价真实浏览器盒高变化后的同步）。
   */
  function stubViewport(el: OASFormList, height: number): void {
    Object.defineProperty(scroller(el), 'clientHeight', { value: height, configurable: true })
    scroller(el).dispatchEvent(new Event('scroll'))
  }

  it('缺省关（零漂移）：无 spacer 节点、无滚动容器类、帧数=行数（全量帧）', () => {
    const el = makeBig(5)
    expect(el.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(0)
    expect(mountFrames(el).length).toBe(5)
    expect(scroller(el).classList.contains('vscroll')).toBe(false)
    expect(rows(el).length).toBe(5)
  })

  it('virtual 开启：1000 行 light DOM 齐全（rowCount=1000）但挂载帧有界', () => {
    const el = makeBig(1000, { virtual: '', 'viewport-height': '320' })
    stubViewport(el, 320)
    expect(el.rowCount).toBe(1000)
    expect(rows(el).length).toBe(1000)
    // viewport 320 / 预估 56 → 行 5 顶 280 < 320（部分可见）→ 基窗 6 行 + overscan 5×2 = 11 帧
    expect(mountFrames(el).length).toBe(11)
  })

  it('1000 行性能冒烟：shadow 内渲染节点数有界（窗口化生效）', () => {
    const el = makeBig(1000, { virtual: '', 'viewport-height': '320' })
    // shadow 内 input 节点数（帧只挂窗口行）远小于 light DOM 的 1000
    const shadowInputs = el.shadowRoot!.querySelectorAll('input').length
    expect(shadowInputs).toBeLessThan(50)
    // 帧内 slot 分配的 light DOM 行 = 1000（值语义不丢）
    const lightInputs = el.querySelectorAll('input').length
    expect(lightInputs).toBe(1000)
  })

  it('窗口外字段仍索引化：name 重编号覆盖全量行（users.999.nick 在场）', () => {
    const el = makeBig(1000, { virtual: '', 'viewport-height': '320' })
    const last = rows(el)[999]!.querySelector('input')!
    expect(last.getAttribute('name')).toBe('users.999.nick')
  })

  it('滚动重算：scrollTop 变化 → 窗口平移、spacer 高度更新、首帧 spacer 反映偏移', () => {
    const el = makeBig(200, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    stubViewport(el, 320)
    // 顶部：top spacer = 0
    expect(spacerHeight(el, 'top')).toBe(0)
    scrollTo(el, 2000)
    // 2000/50 = 40 → 首可见行 40，start = 35（overscan 5）→ top spacer = 35×50
    expect(spacerHeight(el, 'top')).toBe(1750)
    const first = mountFrames(el)[0]!
    expect(Number(first.dataset.rowIndex)).toBe(35)
    scrollTo(el, 0)
    expect(spacerHeight(el, 'top')).toBe(0)
  })

  it('总高稳定：bottom spacer + 窗口 + top spacer 对齐全量高度（滚动条真实）', () => {
    const el = makeBig(100, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    stubViewport(el, 320)
    scrollTo(el, 1000)
    const top = spacerHeight(el, 'top')
    const bottom = spacerHeight(el, 'bottom')
    // scrollTop=1000/50 → 首可见行 20，start = 20-5 = 15 → top = 750；
    // limit=1320 → 末可见行 26，end = 27+5 = 32 → bottom = 5000 - 1600 = 3400
    expect(top).toBe(750)
    expect(bottom).toBe(3400)
  })

  it('overscan 属性可调：overscan=0 帧数收敛到可视行', () => {
    const wide = makeBig(200, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50', overscan: '0' })
    const narrow = makeBig(200, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50', overscan: '20' })
    stubViewport(wide, 320)
    stubViewport(narrow, 320)
    expect(mountFrames(wide).length).toBeLessThan(mountFrames(narrow).length)
  })

  it('viewport-height 与盒高同源：属性写进内联 max-height，窗口规模随盒高走', () => {
    // 属性在场 → 内联 max-height 同步（盒高不再停留 CSS 缺省 320px——尾部行不可达的根因）
    const small = makeBig(200, { virtual: '', 'viewport-height': '100', 'estimated-row-height': '50' })
    stubViewport(small, 100)
    expect(scroller(small).style.maxHeight).toBe('100px')
    const large = makeBig(200, { virtual: '', 'viewport-height': '900', 'estimated-row-height': '50' })
    stubViewport(large, 900)
    expect(scroller(large).style.maxHeight).toBe('900px')
    expect(mountFrames(small).length).toBeLessThan(mountFrames(large).length)
    // 确定帧数：viewport 100/50 → 行 0..1 可视（行 2 顶 100 = 视口底不计）→ 2 + 底部 overscan 5 = 7；
    // 900/50 → 18 行可视 + 5 = 23（顶部 overscan 越过列表头被夹掉）
    expect(mountFrames(small).length).toBe(7)
    expect(mountFrames(large).length).toBe(23)
  })

  it('空列表 spacer 无悬挂间隙：virtual + 0 行 → 上下 spacer 均 0（不凭空造末行 gap）', () => {
    // 真实主题里窗口容器是 flex + gap 8px；happy-dom 的 getComputedStyle 不解析 gap，这里桩供给
    // 「行间距 8px」——旧实现空列表的 bottom = 0 − 0 + gap = 8px 可被判出
    vi.stubGlobal('getComputedStyle', () => ({ rowGap: '8px' }) as unknown as CSSStyleDeclaration)
    try {
      const el = makeBig(0, { virtual: '', 'viewport-height': '320' })
      expect(spacerHeight(el, 'top')).toBe(0)
      expect(spacerHeight(el, 'bottom'), '空列表不凭空产生末行悬挂 gap').toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('首帧盒高重读：0 行 → 300 行后按定稿视口重排（不再只挂 1 行 + 下方大段空白）', () => {
    const el = makeBig(0, { virtual: '', 'viewport-height': '600', 'estimated-row-height': '40' })
    const sc = scroller(el)
    let reads = 0
    // 真实浏览器盒高 = min(内容高, max-height)：空列表撑不满 max-height（只剩几个 px），
    // spacer 落位后内容高够长、盒高才等于 600。getter 忠实模拟这条布局反馈。
    Object.defineProperty(sc, 'clientHeight', {
      configurable: true,
      get() {
        reads += 1
        const content = [...sc.querySelectorAll<HTMLElement>('[data-vspacer]')].reduce(
          (sum, node) => sum + (parseFloat(node.style.height) || 0),
          0,
        )
        return content > 0 ? 600 : 8
      },
    })
    el.setRowCount(300)
    // 600 / 40 = 15 行可视 + overscan 5 → 帧覆盖整屏（旧实现按 8px 旧视口只挂 1+5 = 6 帧）
    expect(mountFrames(el).length).toBeGreaterThanOrEqual(15)
    // 下 spacer = 总高 300×40 − 窗口末行偏移 20×40 = 11200（全量高度由窗口 + 上下 spacer 拼齐）
    expect(spacerHeight(el, 'bottom'), '下 spacer 用定稿窗口补齐总高').toBe(11200)
    expect(reads, '盒高重读收敛有界（至多两轮）').toBeLessThanOrEqual(3)
  })

  it('viewport-height 属性移除 / 非法：清内联回落实测盒高，非法值单次告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = makeBig(20, { virtual: '', 'viewport-height': '240' })
      expect(scroller(el).style.maxHeight).toBe('240px')
      el.removeAttribute('viewport-height')
      expect(scroller(el).style.maxHeight, '属性移除清内联，回落 CSS 缺省').toBe('')
      el.setAttribute('viewport-height', 'abc')
      expect(scroller(el).style.maxHeight, '非法值清内联（按实测盒高处理）').toBe('')
      expect(warnSpy.mock.calls.some((args) => String(args[0]).includes('viewport-height'))).toBe(true)
      // 同原文只告警一次（换原文 'def' 不再计；'abc' 再次出现不重复告警）
      el.setAttribute('viewport-height', 'def')
      el.setAttribute('viewport-height', 'abc')
      const warns = warnSpy.mock.calls.filter((args) => String(args[0]).includes('"abc"')).length
      expect(warns).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('虚拟态行操作：删除可视行 → oas-remove、剩余行重编号、值随行保留', () => {
    const el = makeBig(60, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    rows(el)[0]!.querySelector('input')!.setAttribute('value', 'doomed')
    rows(el)[5]!.querySelector('input')!.setAttribute('value', 'keepme')
    let detail: unknown
    el.addEventListener('oas-remove', (e) => (detail = (e as CustomEvent).detail))
    mountFrames(el)
      .find((f) => f.dataset.rowIndex === '0')!
      .querySelector<HTMLButtonElement>('[data-action="remove"]')!
      .click()
    expect(el.rowCount).toBe(59)
    expect(detail).toEqual({ index: 0 })
    // 原第 5 行（keepme）前移到第 4 行：值随行保留、name 重编号
    expect(rows(el)[4]!.querySelector('input')!.getAttribute('value')).toBe('keepme')
    expect(rows(el)[4]!.querySelector('input')!.getAttribute('name')).toBe('users.4.nick')
    expect(rows(el)[0]!.querySelector('input')!.getAttribute('value')).not.toBe('doomed')
  })

  it('虚拟态程序化通道：setRowCount / insertRowAt（越窗行）正常且不派发事件', () => {
    const el = makeBig(50, { virtual: '', 'viewport-height': '320' })
    const events: string[] = []
    el.addEventListener('oas-add', () => events.push('add'))
    el.addEventListener('oas-remove', () => events.push('remove'))
    el.setRowCount(80)
    expect(el.rowCount).toBe(80)
    expect(rows(el)[79]!.querySelector('input')!.getAttribute('name')).toBe('users.79.nick')
    el.setRowCount(10)
    expect(el.rowCount).toBe(10)
    expect(el.insertRowAt(3)).toBe(true)
    expect(rows(el)[3]!.querySelector('input')!.getAttribute('name')).toBe('users.3.nick')
    expect(events).toEqual([])
  })

  it('虚拟态主表收集：窗口外字段值进提交 values（受控/校验语义不变）', () => {
    const form = new OASForm()
    form.innerHTML =
      '<oas-form-list name="users" rows="40" virtual viewport-height="200" estimated-row-height="50"><template><oas-input name="nick"></oas-input></template></oas-form-list>'
    document.body.appendChild(form)
    const list = form.querySelector('oas-form-list')!
    const inputs = [...list.querySelectorAll('oas-input')]
    expect(inputs.length).toBe(40)
    inputs[0]!.setAttribute('value', 'first')
    inputs[39]!.setAttribute('value', 'last')
    let detail: unknown
    form.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    form.submit()
    const values = (detail as { values: { users: Array<{ nick: string }> } }).values
    expect(values.users.length).toBe(40)
    expect(values.users[0]!.nick).toBe('first')
    expect(values.users[39]!.nick).toBe('last')
  })

  it('关闭虚拟零漂移：移除 virtual 属性恢复全量帧并拆掉 spacer、清内联视口高', () => {
    const el = makeBig(30, { virtual: '', 'viewport-height': '320' })
    expect(el.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(2)
    expect(scroller(el).style.maxHeight).toBe('320px')
    el.removeAttribute('virtual')
    expect(el.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(0)
    expect(mountFrames(el).length).toBe(30)
    expect(scroller(el).classList.contains('vscroll')).toBe(false)
    expect(scroller(el).style.maxHeight, '内联视口高随虚拟关闭清除（不残留）').toBe('')
  })

  it('虚拟态 focusAction 窗口外静默跳过：复制窗口末行（新行在窗口外）不抛错、焦点不动', () => {
    const el = makeBig(30, { virtual: '', 'viewport-height': '120', 'estimated-row-height': '50', overscan: '0' })
    stubViewport(el, 120)
    // viewport 120 / est 50 → 首个行顶 ≥ 120 = 行 3（150）→ 窗口 = 行 0..2（overscan 0）
    const windowIndexes = mountFrames(el).map((f) => Number(f.dataset.rowIndex))
    const tail = windowIndexes[windowIndexes.length - 1]!
    expect(tail).toBe(2)
    rows(el)[tail]!.querySelector('input')!.setAttribute('value', 'copy-me')
    let detail: unknown
    el.addEventListener('oas-duplicate', (e) => (detail = (e as CustomEvent).detail))
    const focusBefore = document.activeElement
    mountFrames(el)
      .find((f) => f.dataset.rowIndex === String(tail))!
      .querySelector<HTMLButtonElement>('[data-action="duplicate"]')!
      .click()
    // 新行插到窗口末行的下一位置（窗口外）：oas-duplicate 照常派发、值照常复制
    expect(detail).toEqual({ from: tail, to: tail + 1 })
    expect(el.rowCount).toBe(31)
    expect(rows(el)[tail + 1]!.querySelector('input')!.getAttribute('value')).toBe('copy-me')
    // 窗口未随插入平移（scrollTop 未变）：新行帧未挂载，focusAction 静默跳过、焦点不动、不抛错
    const newFrame = mountFrames(el).some((f) => Number(f.dataset.rowIndex) === tail + 1)
    expect(newFrame, '滚动位置未变时新行仍在窗口外（帧不挂载）').toBe(false)
    expect(document.activeElement).toBe(focusBefore)
  })

  it('虚拟态添加行：新行滚入视口、窗口重算挂载新帧、焦点落新行首字段（用户可见反馈）', () => {
    const el = makeBig(30, { virtual: '', 'estimated-row-height': '50', overscan: '0' })
    stubViewport(el, 150)
    let added: unknown
    el.addEventListener('oas-add', (e) => (added = (e as CustomEvent).detail))
    const addBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!
    expect(addBtn.tagName).toBe('BUTTON')
    addBtn.click()
    expect(added).toEqual({ index: 30 })
    expect(el.rowCount).toBe(31)
    // 新行 30 顶 1500、高 50 > 视口底 150 → scrollTop 收到行底贴视口底：1500+50-150 = 1400
    expect(scroller(el).scrollTop).toBe(1400)
    // 窗口随 scrollTop 平移：新行帧已挂载（28..30）
    const indexes = mountFrames(el).map((f) => Number(f.dataset.rowIndex))
    expect(indexes).toContain(30)
    // 焦点落在新行首字段（原生 input 模板）
    const newRowInput = rows(el)[30]!.querySelector('input')!
    expect(document.activeElement).toBe(newRowInput)
  })

  it('行操作（复制/移动）在虚拟态可用且高度模型同步', () => {
    const el = makeBig(60, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    rows(el)[4]!.querySelector('input')!.setAttribute('value', 'A')
    let moved: unknown
    el.addEventListener('oas-duplicate', (e) => (moved = (e as CustomEvent).detail))
    mountFrames(el)
      .find((f) => f.dataset.rowIndex === '4')!
      .querySelector<HTMLButtonElement>('[data-action="duplicate"]')!
      .click()
    expect(moved).toEqual({ from: 4, to: 5 })
    expect(el.rowCount).toBe(61)
    expect(rows(el)[5]!.querySelector('input')!.getAttribute('value')).toBe('A')
    expect(rows(el)[5]!.querySelector('input')!.getAttribute('name')).toBe('users.5.nick')
  })

  it('DSD 水合：virtual 开启的快照命中后接管，窗口重建正常', () => {
    const ref = makeBig(10, { virtual: '', 'viewport-height': '120' })
    const snapshot = ref.shadowRoot!.innerHTML
    const el = new OASFormList()
    el.setAttribute('name', 'users')
    el.setAttribute('rows', '10')
    el.setAttribute('virtual', '')
    el.setAttribute('viewport-height', '120')
    const tpl = document.createElement('template')
    tpl.innerHTML = '<input name="nick">'
    el.appendChild(tpl)
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-form-list" data-oas-ssr-v="1">${snapshot}`
    document.body.appendChild(el)
    stubViewport(el, 120)
    scrollTo(el, 0)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.rowCount).toBe(10)
    // viewport 120 / 预估 56 = 3 行可见（行 3 顶 168 ≥ 120）→ 基窗 3 + overscan 5×2 = 8 帧（全量 10 行不挂载）
    expect(mountFrames(el).length).toBe(8)
    expect(mountFrames(el).length).toBeLessThan(10)
  })
})
