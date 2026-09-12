import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTree, type TreeNode } from './index.js'

/** 三叉小树：a(a-1,a-2) b b(c) 均无——见各用例内联数据更清晰 */
const DATA = JSON.stringify([
  { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
  { key: 'b', label: '节点 B' },
])

const CASCADE_DATA = JSON.stringify([
  {
    key: 'a',
    label: '节点 A',
    children: [
      { key: 'a-1', label: '子节点 1' },
      { key: 'a-2', label: '子节点 2' },
    ],
  },
  { key: 'b', label: '节点 B' },
])

function mount(attrs: Record<string, string> = {}): OASTree {
  const el = new OASTree()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!('data' in attrs)) el.setAttribute('data', DATA)
  document.body.appendChild(el)
  return el
}

function rows(el: OASTree): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
}

function labels(el: OASTree): string {
  return rows(el)
    .map((r) => r.querySelector('.label')?.textContent ?? '')
    .join('|')
}

function toggles(el: OASTree): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="toggle"]')]
}

function checkboxes(el: OASTree): HTMLInputElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
}

/** 模拟真实勾选流程：切 checked → 派发 change（触发组件的 toggleCheckByKey） */
function checkBox(el: OASTree, box: HTMLInputElement, next: boolean): void {
  box.checked = next
  box.dispatchEvent(new Event('change'))
}

function expandedOf(el: OASTree): string[] {
  return JSON.parse(el.getAttribute('expanded') ?? '[]') as string[]
}

function checkedOf(el: OASTree): string[] {
  return JSON.parse(el.getAttribute('checked') ?? '[]') as string[]
}

const flushMicro = (): Promise<void> => new Promise((resolve) => queueMicrotask(() => resolve(undefined)))

describe('OASTree 展开（expanded JSON 数组）+ 选中', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('expanded 为 JSON 数组：展开节点显示子节点并写回数组形态', () => {
    const el = mount({ expanded: '["a"]' })
    expect(labels(el)).toBe('节点 A|子节点 1|节点 B')
    expect(el.shadowRoot!.textContent).toContain('子节点 1')
  })

  it('点击展开按钮写入 expanded JSON 数组', () => {
    const el = mount()
    toggles(el)[0]!.click()
    expect(expandedOf(el)).toEqual(['a'])
    expect(labels(el)).toBe('节点 A|子节点 1|节点 B')
    // 收起
    toggles(el)[0]!.click()
    expect(expandedOf(el)).toEqual([])
    expect(labels(el)).toBe('节点 A|节点 B')
  })

  it('点击选中节点派发 oas-select 并写 selected', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    rows(el)[0]!.click()
    expect(detail).toEqual({ key: 'a', selected: true })
    expect(el.getAttribute('selected')).toBe('a')
  })

  it('locale：展开/选择 aria-label 随 setLocale 切换', () => {
    const el = mount({ checkable: '' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label')).toBe('展开/收起')
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.getAttribute('aria-label')).toBe(
      '选择 节点 A',
    )

    setLocale(en)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label')).toBe(
      'Expand/Collapse',
    )
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.getAttribute('aria-label')).toBe(
      'Select 节点 A',
    )

    setLocale('zh-CN')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label')).toBe('展开/收起')
  })
})

describe('OASTree default-expand-all / accordion / expand-trigger / auto-expand-parent', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('default-expand-all：未设 expanded 时全展开；显式 expanded 优先', () => {
    const el = mount({ 'default-expand-all': '', data: CASCADE_DATA })
    expect(labels(el)).toBe('节点 A|子节点 1|子节点 2|节点 B')
    const el2 = mount({ 'default-expand-all': '', expanded: '[]', data: CASCADE_DATA })
    expect(labels(el2)).toBe('节点 A|节点 B')
  })

  it('accordion：展开同父兄弟时收起另一支', () => {
    const data = JSON.stringify([
      { key: 'g1', label: '分组 1', children: [{ key: 'x', label: 'X' }] },
      { key: 'g2', label: '分组 2', children: [{ key: 'y', label: 'Y' }] },
    ])
    const el = mount({ accordion: '', data })
    toggles(el)[0]!.click()
    expect(expandedOf(el)).toEqual(['g1'])
    toggles(el)[1]!.click()
    // g1 收起（同层互斥），g2 展开
    expect(expandedOf(el)).toEqual(['g2'])
    expect(labels(el)).toBe('分组 1|分组 2|Y')
  })

  it('expand-trigger="node"：点击父级标签展开（选中行为不变）', () => {
    const el = mount({ 'expand-trigger': 'node', data: CASCADE_DATA })
    rows(el)[0]!.click()
    expect(el.getAttribute('selected')).toBe('a')
    expect(expandedOf(el)).toEqual(['a'])
    expect(labels(el)).toContain('子节点 1')
  })

  it('expand-trigger 缺省 toggle：点击标签只选中不展开', () => {
    const el = mount({ data: CASCADE_DATA })
    rows(el)[0]!.click()
    expect(expandedOf(el)).toEqual([])
    expect(el.getAttribute('selected')).toBe('a')
  })

  it('auto-expand-parent：外部注入深层 key 时 expanded 自动补全祖先', () => {
    const data = JSON.stringify([
      {
        key: 'p1',
        label: 'P1',
        children: [{ key: 'p1-1', label: 'P1-1', children: [{ key: 'deep', label: 'Deep' }] }],
      },
    ])
    const el = mount({ 'auto-expand-parent': '', data })
    el.setAttribute('expanded', '["deep"]')
    expect([...expandedOf(el)].sort()).toEqual(['deep', 'p1', 'p1-1'])
    expect(labels(el)).toBe('P1|P1-1|Deep')
  })

  it('auto-expand-parent：expanded 首渲染前预置深层 key 同样补全祖先', () => {
    const data = JSON.stringify([
      {
        key: 'p1',
        label: 'P1',
        children: [{ key: 'p1-1', label: 'P1-1', children: [{ key: 'deep', label: 'Deep' }] }],
      },
    ])
    const el = mount({ 'auto-expand-parent': '', expanded: '["deep"]', data })
    expect([...expandedOf(el)].sort()).toEqual(['deep', 'p1', 'p1-1'])
    expect(labels(el)).toBe('P1|P1-1|Deep')
  })
})

describe('OASTree 勾选级联（checkable / check-strategy / check-strictly / half）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('点击复选框：更新 checked（JSON 数组）、派发 oas-check、重建后状态恢复、不触发行选中', () => {
    const el = mount({ checkable: '', expanded: '["a"]', data: CASCADE_DATA })
    let checkDetail: unknown
    let selectFired = 0
    el.addEventListener('oas-check', (e: Event) => (checkDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-select', () => selectFired++)
    // 可见行 a/a-1/a-2/b → 复选框同序
    checkBox(el, checkboxes(el)[1]!, true) // a-1
    expect(checkedOf(el)).toEqual(['a-1'])
    expect(checkDetail).toEqual({ key: 'a-1', checked: true })
    expect(selectFired).toBe(0)
    // 重建后新复选框恢复勾选
    expect(checkboxes(el)[1]!.checked).toBe(true)
    // 半选：父级 a 未全选 → indeterminate
    expect(checkboxes(el)[0]!.indeterminate).toBe(true)

    checkBox(el, checkboxes(el)[1]!, false)
    expect(checkedOf(el)).toEqual([])
    expect(checkboxes(el)[1]!.checked).toBe(false)
    expect(checkboxes(el)[0]!.indeterminate).toBe(false)
  })

  it('级联：勾选父级 → 全部子级勾选；取消父级 → 全部取消', () => {
    const el = mount({ checkable: '', expanded: '["a"]', data: CASCADE_DATA })
    checkBox(el, checkboxes(el)[0]!, true) // a
    expect(checkedOf(el)).toEqual(['a', 'a-1', 'a-2'])
    // 重建后 a/a-1/a-2 勾选（b 未勾）
    expect(
      checkboxes(el)
        .slice(0, 3)
        .map((b) => b.checked),
    ).toEqual([true, true, true])
    expect(checkboxes(el)[0]!.indeterminate).toBe(false)

    checkBox(el, checkboxes(el)[0]!, false)
    expect(checkedOf(el)).toEqual([])
  })

  it('级联：子级部分勾选 → 父级 half（indeterminate）', () => {
    const el = mount({ checkable: '', expanded: '["a"]', data: CASCADE_DATA })
    checkBox(el, checkboxes(el)[1]!, true) // a-1
    expect(checkedOf(el)).toEqual(['a-1'])
    expect(checkboxes(el)[0]!.checked).toBe(false)
    expect(checkboxes(el)[0]!.indeterminate).toBe(true)
    // 补齐兄弟 → 父级全勾
    checkBox(el, checkboxes(el)[2]!, true) // a-2
    expect(checkedOf(el)).toEqual(['a', 'a-1', 'a-2'])
    expect(checkboxes(el)[0]!.indeterminate).toBe(false)
  })

  it('check-strategy="parent"：导出值只含父级（展示仍级联）', () => {
    const el = mount({
      checkable: '',
      'check-strategy': 'parent',
      expanded: '["a"]',
      data: CASCADE_DATA,
    })
    checkBox(el, checkboxes(el)[0]!, true)
    expect(checkedOf(el)).toEqual(['a'])
    expect(checkboxes(el)[1]!.checked).toBe(true)
  })

  it('check-strategy="child"：导出值只含叶子', () => {
    const el = mount({
      checkable: '',
      'check-strategy': 'child',
      expanded: '["a"]',
      data: CASCADE_DATA,
    })
    checkBox(el, checkboxes(el)[0]!, true)
    expect(checkedOf(el)).toEqual(['a-1', 'a-2'])
  })

  it('check-strictly：勾选不级联、无 half', () => {
    const el = mount({ checkable: '', 'check-strictly': '', expanded: '["a"]', data: CASCADE_DATA })
    checkBox(el, checkboxes(el)[0]!, true)
    expect(checkedOf(el)).toEqual(['a'])
    checkBox(el, checkboxes(el)[1]!, true)
    expect(checkedOf(el)).toEqual(['a', 'a-1'])
    expect(checkboxes(el)[0]!.indeterminate).toBe(false)
  })

  it('级联语义对齐 tree-select：父值受控回填 → 子级展示勾选', () => {
    const el = mount({ checkable: '', expanded: '["a"]', data: CASCADE_DATA })
    el.setAttribute('checked', '["a"]')
    expect(
      checkboxes(el)
        .slice(0, 3)
        .map((b) => b.checked),
    ).toEqual([true, true, true])
    expect(el.getAttribute('checked')).toBe('["a"]') // 受控值不回写漂移（展示层闭包）
  })
})

describe('OASTree 节点级 disabled / selectable / disableCheckbox / 整树 disabled', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const MIXED = JSON.stringify([
    { key: 'ok', label: '可用' },
    { key: 'dis', label: '禁用', disabled: true },
    {
      key: 'p',
      label: '父',
      children: [
        { key: 'c1', label: '子1' },
        { key: 'c2', label: '子2', disableCheckbox: true },
      ],
    },
    { key: 'no-sel', label: '不可选', selectable: false },
  ])

  it('disabled 节点：data-disabled、点击不选中', () => {
    const el = mount({ data: MIXED })
    const disRow = rows(el)[1]!
    expect(disRow.getAttribute('data-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    disRow.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('selected')).toBeNull()
  })

  it('selectable=false：点击不选中（勾选/展开不受影响）', () => {
    const el = mount({ checkable: '', data: MIXED })
    rows(el)[3]!.click()
    expect(el.getAttribute('selected')).toBeNull()
    checkBox(el, checkboxes(el)[3]!, true)
    expect(checkedOf(el)).toEqual(['no-sel'])
  })

  it('disableCheckbox：复选框 disabled、级联跳过、不参与父级收敛', () => {
    const data = JSON.stringify([
      {
        key: 'p',
        label: '父',
        children: [
          { key: 'c1', label: '子1' },
          { key: 'c2', label: '子2', disableCheckbox: true },
        ],
      },
    ])
    const el = mount({ checkable: '', expanded: '["p"]', data })
    const c2row = rows(el).find((r) => r.getAttribute('data-key') === 'c2')!
    const c2box = c2row.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(c2box.disabled).toBe(true)
    // disableCheckbox 节点自身不可勾选（change 被守卫拦截）
    checkBox(el, c2box, true)
    expect(checkedOf(el)).toEqual([])
    // 勾选父级：级联跳过 disableCheckbox 子级
    const pbox = rows(el)[0]!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    checkBox(el, pbox, true)
    expect(checkedOf(el)).toEqual(['p', 'c1'])
    const rebuiltC2 = rows(el)
      .find((r) => r.getAttribute('data-key') === 'c2')!
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(rebuiltC2.checked).toBe(false)
    expect(rebuiltC2.disabled).toBe(true)
  })

  it('整树 disabled：不可选中/不可展开/不可勾选', () => {
    const el = mount({ disabled: '', checkable: '', data: CASCADE_DATA })
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    expect(toggles(el)[0]).toBeTruthy() // 展开箭头仍在（视觉稳定），点击被守卫拦截
    rows(el)[0]!.click()
    toggles(el)[0]!.click()
    checkBox(el, checkboxes(el)[0]!, true)
    expect(fired).toBe(0)
    expect(el.getAttribute('selected')).toBeNull()
    expect(expandedOf(el)).toEqual([])
    expect(checkedOf(el)).toEqual([])
  })
})

describe('OASTree 点选多选（multiple）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('multiple：selected 为 JSON 数组，再点取消', () => {
    const el = mount({ multiple: '', data: CASCADE_DATA })
    rows(el)[0]!.click()
    rows(el)[1]!.click()
    expect(JSON.parse(el.getAttribute('selected') ?? '[]')).toEqual(['a', 'b'])
    rows(el)[0]!.click()
    expect(JSON.parse(el.getAttribute('selected') ?? '[]')).toEqual(['b'])
  })

  it('multiple：oas-select 带 selected 布尔随切换', () => {
    const el = mount({ multiple: '' })
    const details: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => details.push((e as CustomEvent).detail))
    rows(el)[0]!.click()
    rows(el)[0]!.click()
    expect(details).toEqual([
      { key: 'a', selected: true },
      { key: 'a', selected: false },
    ])
  })
})

describe('OASTree 树内过滤（filter / filter-highlight / filterNode）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const BIG = JSON.stringify([
    {
      key: 'fe',
      label: '前端',
      children: [
        { key: 'react', label: 'React' },
        { key: 'vue', label: 'Vue' },
      ],
    },
    { key: 'be', label: '后端', children: [{ key: 'node', label: 'Node' }] },
  ])

  it('filter：命中节点 + 祖先保留，未展开也显示路径', () => {
    const el = mount({ filter: 'React', data: BIG })
    expect(labels(el)).toBe('前端|React')
    expect(el.shadowRoot!.textContent).not.toContain('Vue')
  })

  it('filter：命中父级时含全部后代；不依赖 expanded', () => {
    const el = mount({ filter: '前端', data: BIG })
    expect(labels(el)).toBe('前端|React|Vue')
  })

  it('filter：清除词恢复全量树；无命中显示空态', () => {
    const el = mount({ filter: 'zzz', data: BIG })
    expect(rows(el).length).toBe(0)
    const empty = el.shadowRoot!.querySelector<HTMLElement>('.empty')!
    expect(empty.hidden).toBe(false)
    el.removeAttribute('filter')
    expect(labels(el)).toBe('前端|后端')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.empty')!.hidden).toBe(true)
  })

  it('filter-highlight：默认 label 文本命中片段包 <mark>', () => {
    const el = mount({ filter: 're', 'filter-highlight': '', data: BIG })
    const marks = el.shadowRoot!.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
    expect([...marks].some((m) => m.textContent === 'Re')).toBe(true)
  })

  it('filterNode 自定义过滤函数：与关键词无关', () => {
    const el = mount({ filter: 'x', data: BIG })
    el.filterNode = (label: string) => label === 'Vue'
    el.setAttribute('filter', 'x')
    expect(labels(el)).toBe('前端|Vue')
  })
})

describe('OASTree 懒加载（lazy / load / 失败重试）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const LAZY_DATA = JSON.stringify([
    { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
    { key: 'b', label: '节点 B' },
    { key: 'c', label: '节点 C', isLeaf: true },
  ])

  it('lazy：未加载节点显示展开按钮，isLeaf 不显示', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    expect(toggles(el).length).toBe(2) // a(有 children) + b(未加载)
    const plain = mount({ data: LAZY_DATA })
    expect(toggles(plain).length).toBe(1)
  })

  it('lazy：展开未加载节点派发 oas-load、显示 loading，回填后子节点可见', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    let loadDetail: unknown
    el.addEventListener('oas-load', (e: Event) => (loadDetail = (e as CustomEvent).detail))
    toggles(el)[1]!.click() // b
    expect(loadDetail).toEqual({ key: 'b' })
    expect(expandedOf(el)).toEqual(['b'])
    const spinner = el.shadowRoot!.querySelector<HTMLElement>('[part="spinner"]')
    expect(spinner).not.toBeNull()
    expect(spinner!.getAttribute('aria-label')).toBe('加载中…')

    const loaded = JSON.stringify([
      { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
      { key: 'b', label: '节点 B', children: [{ key: 'b-1', label: '子节点 b-1' }] },
      { key: 'c', label: '节点 C', isLeaf: true },
    ])
    el.setAttribute('data', loaded)
    expect(el.shadowRoot!.querySelector('[part="spinner"]')).toBeNull()
    expect(el.shadowRoot!.textContent).toContain('子节点 b-1')
  })

  it('load 属性回调触发（与 oas-load 事件并存）', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    let viaProp: unknown
    let viaEvent = 0
    el.load = (payload) => {
      viaProp = payload
    }
    el.addEventListener('oas-load', () => viaEvent++)
    toggles(el)[1]!.click()
    expect(viaProp).toEqual({ key: 'b' })
    expect(viaEvent).toBe(1)
  })

  it('load 返回 Promise reject：清 loading、回滚 expanded、派发 oas-load-error、再点重试', async () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    el.load = () => Promise.reject(new Error('网络错误'))
    let errDetail: unknown
    el.addEventListener('oas-load-error', (e: Event) => (errDetail = (e as CustomEvent).detail))
    toggles(el)[1]!.click()
    await flushMicro()
    await flushMicro()
    expect(el.shadowRoot!.querySelector('[part="spinner"]')).toBeNull()
    expect(expandedOf(el)).toEqual([])
    expect(errDetail).toEqual({ key: 'b', error: '网络错误' })
    // 恢复可点 → 重试再次触发加载
    el.load = () => undefined
    let loaded = 0
    el.addEventListener('oas-load', () => loaded++)
    toggles(el)[1]!.click()
    expect(loaded).toBe(1)
  })

  it('load 同步抛错同样走失败回滚', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    el.load = () => {
      throw new Error('boom')
    }
    toggles(el)[1]!.click()
    expect(expandedOf(el)).toEqual([])
  })

  it('已加载节点（有 children）展开不触发 oas-load', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    let fired = 0
    el.addEventListener('oas-load', () => fired++)
    toggles(el)[0]!.click()
    expect(fired).toBe(0)
    expect(expandedOf(el)).toEqual(['a'])
  })
})

describe('OASTree 命令式方法（expandAll / collapseAll / expand / collapse）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('expandAll / collapseAll：写 expanded JSON 数组', () => {
    const el = mount({ data: CASCADE_DATA })
    el.expandAll()
    expect(expandedOf(el)).toEqual(['a'])
    expect(labels(el)).toContain('子节点 1')
    el.collapseAll()
    expect(expandedOf(el)).toEqual([])
    expect(labels(el)).toBe('节点 A|节点 B')
  })

  it('expand(keys) / collapse(keys)：按 key 集操作', () => {
    const data = JSON.stringify([
      { key: 'a', label: 'A', children: [{ key: 'a-1', label: 'A1' }] },
      { key: 'b', label: 'B', children: [{ key: 'b-1', label: 'B1' }] },
    ])
    const el = mount({ data })
    el.expand(['a', 'b'])
    expect(expandedOf(el)).toEqual(['a', 'b'])
    el.collapse(['a'])
    expect(expandedOf(el)).toEqual(['b'])
  })
})

describe('OASTree field-names / tree-lines / empty', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('field-names：key/label/children/disabled/isLeaf 别名归一', () => {
    const data = JSON.stringify([
      {
        id: 'dept',
        name: '部门',
        subs: [
          { id: 'alice', name: 'Alice' },
          { id: 'bob', name: 'Bob', off: true },
        ],
      },
    ])
    const el = mount({
      data,
      'field-names': '{"key":"id","label":"name","children":"subs","disabled":"off","isLeaf":"leaf"}',
    })
    expect(labels(el)).toBe('部门')
    toggles(el)[0]!.click()
    expect(labels(el)).toBe('部门|Alice|Bob')
    expect(rows(el)[2]!.getAttribute('data-disabled')).toBe('true')
    rows(el)[1]!.click()
    expect(el.getAttribute('selected')).toBe('alice')
  })

  it('tree-lines：深度 > 0 的行渲染缩进占位（引导线容器）', () => {
    const el = mount({ 'tree-lines': '', expanded: '["a"]', data: CASCADE_DATA })
    const a = rows(el)[0]!
    expect(a.querySelectorAll('.indent').length).toBe(0)
    const a1 = rows(el)[1]!
    expect(a1.querySelectorAll('.indent').length).toBe(1)
    const a2 = rows(el)[2]!
    expect(a2.querySelectorAll('.indent').length).toBe(1)
    // 非 tree-lines 时占位仍存在（行结构稳定）
    const plain = mount({ expanded: '["a"]', data: CASCADE_DATA })
    expect(plain.shadowRoot!.querySelectorAll('[part="row"] .indent').length).toBeGreaterThan(0)
  })

  it('空数据 / empty 属性 / template[slot=empty] 空态', () => {
    const el = mount({ empty: '树是空的', data: '[]' })
    const empty = el.shadowRoot!.querySelector<HTMLElement>('.empty')!
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).toBe('树是空的')

    const withSlot = new OASTree()
    withSlot.setAttribute('data', '[]')
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'empty')
    tpl.innerHTML = '<i class="custom-empty">无节点</i>'
    withSlot.appendChild(tpl)
    document.body.appendChild(withSlot)
    expect(withSlot.shadowRoot!.querySelector('.empty .custom-empty')).not.toBeNull()
  })
})

describe('OASTree 拖拽（draggable + allowDrop/allowDrag 守卫）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function rect100(): DOMRect {
    return {
      top: 0,
      bottom: 100,
      left: 0,
      right: 100,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    } as DOMRect
  }

  function dropEvent(type: string, clientY: number): MouseEvent {
    return new MouseEvent(type, { bubbles: true, cancelable: true, clientY })
  }

  it('draggable：before/after/inner 三种落点均派发 oas-node-drop', () => {
    const el = mount({ draggable: '', expanded: '["a"]', data: CASCADE_DATA })
    const r = rows(el) // a, a-1, a-2, b
    const details: unknown[] = []
    el.addEventListener('oas-node-drop', (e: Event) => details.push((e as CustomEvent).detail))

    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[1]!.getBoundingClientRect = () => rect100()
    r[1]!.dispatchEvent(dropEvent('dragover', 10))
    expect(r[1]!.classList.contains('drop-before')).toBe(true)
    r[1]!.dispatchEvent(dropEvent('drop', 10))
    expect(details[0]).toEqual({ dragKey: 'a', dropKey: 'a-1', position: 'before' })

    r[3]!.dispatchEvent(dropEvent('dragstart', 0))
    r[0]!.getBoundingClientRect = () => rect100()
    r[0]!.dispatchEvent(dropEvent('dragover', 50))
    expect(r[0]!.classList.contains('drop-inner')).toBe(true)
    r[0]!.dispatchEvent(dropEvent('drop', 50))
    expect(details[1]).toEqual({ dragKey: 'b', dropKey: 'a', position: 'inner' })
  })

  it('allowDrop 守卫：返回 false 拒绝落点（无插入线、不派发）', () => {
    const el = mount({ draggable: '', expanded: '["a"]', data: CASCADE_DATA })
    el.allowDrop = ({ dropKey }) => dropKey !== 'a'
    const details: unknown[] = []
    el.addEventListener('oas-node-drop', (e: Event) => details.push((e as CustomEvent).detail))
    const r = rows(el) // a, a-1, a-2, b
    // 允许落 b（不可展开 → after 落点）
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[3]!.getBoundingClientRect = () => rect100()
    r[3]!.dispatchEvent(dropEvent('dragover', 90))
    expect(r[3]!.classList.contains('drop-after')).toBe(true)
    r[3]!.dispatchEvent(dropEvent('drop', 90))
    expect(details[0]).toEqual({ dragKey: 'a', dropKey: 'b', position: 'after' })

    // 拒绝落 a
    r[1]!.dispatchEvent(dropEvent('dragstart', 0))
    r[0]!.getBoundingClientRect = () => rect100()
    r[0]!.dispatchEvent(dropEvent('dragover', 50))
    expect(r[0]!.classList.contains('drop-inner')).toBe(false)
    r[0]!.dispatchEvent(dropEvent('drop', 50))
    expect(details.length).toBe(1)
  })

  it('allowDrag 守卫：返回 false 节点不可拖拽（dragstart 不生效）', () => {
    const el = mount({ draggable: '', data: CASCADE_DATA })
    el.allowDrag = (node) => node.key !== 'b'
    el.setAttribute('data', el.getAttribute('data')!) // 守卫在 render 时生效 → 重刷重建行
    const r = rows(el)
    // b 被禁拖：dragstart 无 dragKey → 拖到 a 不出现落点、不派发
    const details: unknown[] = []
    el.addEventListener('oas-node-drop', (e: Event) => details.push((e as CustomEvent).detail))
    r[1]!.dispatchEvent(dropEvent('dragstart', 0))
    r[0]!.getBoundingClientRect = () => rect100()
    r[0]!.dispatchEvent(dropEvent('dragover', 50))
    expect(r[0]!.classList.contains('drop-inner')).toBe(false)
    // a 可拖：dragstart 生效 → 落到 b（after）
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[1]!.getBoundingClientRect = () => rect100()
    r[1]!.dispatchEvent(dropEvent('dragover', 90))
    expect(r[1]!.classList.contains('drop-after')).toBe(true)
    r[1]!.dispatchEvent(dropEvent('drop', 90))
    expect(details[0]).toEqual({ dragKey: 'a', dropKey: 'b', position: 'after' })
  })

  it('dragend 清空拖拽反馈标记', () => {
    const el = mount({ draggable: '', expanded: '["a"]', data: CASCADE_DATA })
    const r = rows(el)
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[1]!.getBoundingClientRect = () => rect100()
    r[1]!.dispatchEvent(dropEvent('dragover', 10))
    expect(r[1]!.classList.contains('drop-before')).toBe(true)
    r[0]!.dispatchEvent(dropEvent('dragend', 0))
    expect(r[1]!.classList.contains('drop-before')).toBe(false)
  })

  it('拖到根容器空白处派发 oas-node-drop（dropKey 为空，inner）', () => {
    const el = mount({ draggable: '', data: CASCADE_DATA })
    const r = rows(el)
    let detail: unknown
    el.addEventListener('oas-node-drop', (e: Event) => (detail = (e as CustomEvent).detail))
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    const tree = el.shadowRoot!.querySelector<HTMLElement>('.tree')!
    tree.dispatchEvent(dropEvent('dragover', 0))
    expect(tree.classList.contains('drop-inner')).toBe(true)
    tree.dispatchEvent(dropEvent('drop', 0))
    expect(detail).toEqual({ dragKey: 'a', dropKey: '', position: 'inner' })
  })
})

const BIG_DATA = JSON.stringify(
  Array.from({ length: 100 }, (_, i) => ({
    key: `n${i}`,
    label: `节点 ${i}`,
    ...(i % 10 === 0 ? { children: [{ key: `n${i}-c`, label: `子节点 ${i}-c` }] } : {}),
  })),
)

function virtualRows(el: OASTree): HTMLElement[] {
  const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
  return [...vlist.shadowRoot!.querySelectorAll('[part="item"]')] as HTMLElement[]
}

const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

describe('OASTree 虚拟化', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('height 开启虚拟化：仅渲染可见窗口行', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement
    expect(vlist.hidden).toBe(false)
    expect((el.shadowRoot!.querySelector('.tree') as HTMLElement).hidden).toBe(true)
    expect(virtualRows(el).length).toBe(11) // ceil(200/32)=7 + buffer 4
    expect(virtualRows(el)[0]!.textContent).toContain('节点 0')
  })

  it('虚拟化：vlist 视口不携带 tabindex（tree 行自有 roving tabindex，经公共契约关闭视口聚焦）', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    const vp = el
      .shadowRoot!.querySelector('oas-virtual-list')!
      .shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    expect(vp.getAttribute('tabindex')).toBeNull()
  })

  it('虚拟化下点击展开按钮写入 JSON 数组 expanded', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    const toggle = virtualRows(el)[0]!.querySelector<HTMLButtonElement>('.toggle')!
    toggle.click()
    expect(expandedOf(el)).toEqual(['n0'])
    expect(virtualRows(el)[1]!.textContent).toContain('子节点 0-c')
  })

  it('虚拟化：滚动后窗口重算且展开状态保持', async () => {
    const el = mount({ height: '100', 'row-height': '32', data: BIG_DATA, expanded: '["n0"]' })
    const vp = el
      .shadowRoot!.querySelector('oas-virtual-list')!
      .shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    vp.scrollTop = 320
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(virtualRows(el)[0]!.textContent).toContain('节点 5')
    expect(expandedOf(el)).toEqual(['n0'])
  })

  it('虚拟化：checkable 勾选写回 checked 数组并恢复', () => {
    const el = mount({ height: '200', 'row-height': '32', checkable: '', data: BIG_DATA })
    const box = virtualRows(el)[0]!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    checkBox(el, box, true)
    expect(checkedOf(el)).toEqual(['n0', 'n0-c'])
    const rebuilt = virtualRows(el)[0]!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(rebuilt.checked).toBe(true)
  })

  it('height 移除后回退全量渲染', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    el.removeAttribute('height')
    expect(rows(el).length).toBe(100)
    expect((el.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement).hidden).toBe(true)
  })

  it('scrollTo(key)：虚拟模式滚动视口到目标行', async () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    el.scrollTo('n80')
    await flushMicro()
    const vp = el
      .shadowRoot!.querySelector('oas-virtual-list')!
      .shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    // 视口滚向 n80 所在位置（窗口 buffer 影响精确上限，断言已大幅下滚）
    expect(vp.scrollTop).toBeGreaterThan(2000)
  })
})

describe('OASTree 键盘 roving（↑↓ 移动 / → 展开 / ← 收起 / Home / End）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function press(el: OASTree, rowIndex: number, key: string): void {
    rows(el)[rowIndex]!.focus()
    rows(el)[rowIndex]!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }))
  }

  it('方向键 ↓ 移动 roving 焦点（tabindex 随行）', () => {
    const el = mount({ data: CASCADE_DATA })
    press(el, 0, 'ArrowDown')
    expect(rows(el)[1]!.tabIndex).toBe(0)
    expect(rows(el)[0]!.tabIndex).toBe(-1)
  })

  it('→ 展开节点、← 收起节点', () => {
    const el = mount({ data: CASCADE_DATA })
    press(el, 0, 'ArrowRight')
    expect(expandedOf(el)).toEqual(['a'])
    press(el, 0, 'ArrowLeft')
    expect(expandedOf(el)).toEqual([])
  })

  it('Home / End 跳到首尾行', () => {
    const el = mount({ expanded: '["a"]', data: CASCADE_DATA }) // a, a-1, a-2, b
    press(el, 0, 'End')
    expect(rows(el)[3]!.tabIndex).toBe(0)
    press(el, 3, 'Home')
    expect(rows(el)[0]!.tabIndex).toBe(0)
  })

  it('Space 勾选（checkable）/ Enter 选中', () => {
    const el = mount({ checkable: '', data: CASCADE_DATA }) // a, b
    press(el, 1, ' ')
    expect(checkedOf(el)).toEqual(['b'])
    press(el, 0, 'Enter')
    expect(el.getAttribute('selected')).toBe('a')
  })
})

describe('OASTree 声明式数据通道 / 水合 / 自定义渲染 / 目录', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('property 赋值 data 单向反射 attribute；getter 返回解析数组', () => {
    const el = new OASTree()
    document.body.appendChild(el)
    const data = [{ key: 'a', label: '属性节点' }]
    el.data = data
    expect(el.getAttribute('data')).toBe(JSON.stringify(data))
    expect(rows(el)[0]!.textContent).toContain('属性节点')
    expect(el.data).toEqual(data)
  })

  it('非法 JSON data 容错为空树', () => {
    const el = new OASTree()
    el.setAttribute('data', '[{bad json')
    document.body.appendChild(el)
    expect(rows(el).length).toBe(0)
  })

  it('真水合：DSD 快照接管，交互恢复', () => {
    const snap = new OASTree()
    snap.shadowRoot!.innerHTML = `
      <meta data-oas-ssr="oas-tree" data-oas-ssr-v="1">
      <style>.probe-style { color: red; }</style>
      <div class="tree" part="tree" role="tree"></div>
      <oas-virtual-list part="virtual" hidden></oas-virtual-list>
      <div class="empty" part="empty" hidden></div>`
    const styleSnap = snap.shadowRoot!.querySelector('style')!
    document.body.appendChild(snap)
    expect(snap.shadowRoot!.querySelector('style')).toBe(styleSnap)
    expect(snap.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    snap.setAttribute('data', JSON.stringify([{ key: 'a', label: '水合节点' }]))
    expect(rows(snap)[0]!.textContent).toContain('水合节点')
    let detail: unknown
    snap.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    rows(snap)[0]!.click()
    expect(detail).toEqual({ key: 'a', selected: true })
  })

  function tpl(slot: string, html: string): HTMLTemplateElement {
    const t = document.createElement('template')
    t.setAttribute('slot', slot)
    t.innerHTML = html
    return t
  }

  it('template[slot="node"]：骨架克隆 + [data-node-label] 绑定', () => {
    const el = mount()
    el.appendChild(tpl('node', '<svg class="glyph"></svg><span data-node-label></span>'))
    el.setAttribute('data', el.getAttribute('data')!)
    const label = el.shadowRoot!.querySelector<HTMLElement>('[part="row"] .label')!
    expect(label.querySelector('svg.glyph')).not.toBeNull()
    expect(label.querySelector('[data-node-label]')!.textContent).toBe('节点 A')
  })

  it('oas-node-render：每行派发 { node, element }', () => {
    const el = mount()
    const details: Array<{ node: TreeNode; element: HTMLElement }> = []
    el.addEventListener('oas-node-render', (e: Event) => details.push((e as CustomEvent).detail as never))
    el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.click()
    expect(details.length).toBe(3)
    expect(details[0]!.node.key).toBe('a')
    expect(details[0]!.element.classList.contains('label')).toBe(true)
  })

  it('无 template 时 label 回落纯文本；toggle 模板替换默认箭头', () => {
    const el = mount()
    expect(rows(el)[0]!.querySelector('.label')!.textContent).toBe('节点 A')
    el.appendChild(tpl('toggle', '<svg class="chev"></svg>'))
    el.setAttribute('data', el.getAttribute('data')!)
    const toggle = el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!
    expect(toggle.querySelector('svg.chev')).not.toBeNull()
    expect(toggle.textContent!.includes('›')).toBe(false)
  })

  it('目录模式：文件夹/文件图标随展开切换，懒加载未加载视为文件夹', () => {
    const dirData = JSON.stringify([
      {
        key: 'src',
        label: 'src',
        children: [{ key: 'index.ts', label: 'index.ts', isLeaf: true }],
      },
      { key: 'package.json', label: 'package.json', isLeaf: true },
    ])
    const el = mount({ directory: '', data: dirData })
    const kind = (i: number): string | null =>
      rows(el)[i]!.querySelector('[part="node-icon"]')?.getAttribute('data-kind') ?? null
    expect(kind(0)).toBe('folder')
    expect(kind(1)).toBe('file')
    rows(el)[0]!.querySelector<HTMLElement>('[part="toggle"]')!.click()
    expect(kind(0)).toBe('folder-open')
    expect(rows(el)[1]!.querySelector('[part="node-icon"]')?.getAttribute('data-kind')).toBe('file')
  })

  it('label 防压扁：.label 显式 flex:1 1 auto + min-width（普通与虚拟两路）', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toMatch(/\.label\s*\{[^}]*flex:\s*1\s+1\s+auto/)
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    const vStyle = vlist.shadowRoot!.querySelector('style[data-oas-tree-rows]')!.textContent!
    expect(vStyle).toMatch(/\.label\s*\{[^}]*flex:\s*1\s+1\s+auto/)
  })

  it('虚拟化下自定义节点模板同样生效', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    el.appendChild(tpl('node', '<span data-node-label></span>'))
    el.setAttribute('data', el.getAttribute('data')!)
    const label = virtualRows(el)[0]!.querySelector<HTMLElement>('.label')!
    expect(label.querySelector('[data-node-label]')!.textContent).toContain('节点')
  })
})

describe('OASTree 节点重命名（can-rename / 双击 or F2 内联编辑）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** 模拟双击 label：同 key 500ms 窗口内的两次 click（改造为组件手工判定双击） */
  function dblClickLabel(el: OASTree, rowIndex: number): void {
    const fire = (): void => {
      const label = rows(el)[rowIndex]!.querySelector<HTMLElement>('.label')!
      label.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    }
    fire()
    fire() // 第二次仍取重建后同 key 行
  }

  function renameInputOf(el: OASTree): HTMLInputElement | null {
    return el.shadowRoot!.querySelector<HTMLInputElement>('input.rename-input')
  }

  it('can-rename 缺省关：双击 label 不进编辑态（无输入框、仍普通选中）', () => {
    const el = mount({ data: CASCADE_DATA })
    dblClickLabel(el, 0)
    expect(renameInputOf(el)).toBeNull()
    expect(el.getAttribute('selected')).toBe('a')
  })

  it('can-rename 开启：双击 label 进入内联编辑（输入框回显旧 label，可聚焦）', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    let selectCount = 0
    el.addEventListener('oas-select', () => selectCount++)
    dblClickLabel(el, 0)
    const input = renameInputOf(el)
    expect(input).not.toBeNull()
    expect(input!.value).toBe('节点 A')
    // 第二次点击的选中被抑制：选中不取消、oas-select 只随首击触发一次
    expect(el.getAttribute('selected')).toBe('a')
    expect(selectCount).toBe(1)
    input!.focus()
    expect(el.shadowRoot!.activeElement).toBe(input)
    expect(input!.getAttribute('aria-label')).toBe('节点 A')
  })

  it('节点 renamable:false 细粒度禁重命名（双击不进入编辑）', () => {
    const data = JSON.stringify([
      { key: 'ok', label: '可重命名' },
      { key: 'lock', label: '锁定的节点', renamable: false },
    ])
    const el = mount({ 'can-rename': '', data })
    dblClickLabel(el, 1)
    expect(renameInputOf(el)).toBeNull()
    dblClickLabel(el, 0)
    expect(renameInputOf(el)).not.toBeNull()
  })

  it('整树 disabled / 节点 disabled：不可重命名', () => {
    const data = JSON.stringify([
      { key: 'a', label: 'A' },
      { key: 'dis', label: '禁用节点', disabled: true },
    ])
    const dis = mount({ 'can-rename': '', data })
    dblClickLabel(dis, 1)
    expect(renameInputOf(dis)).toBeNull()

    const whole = mount({ 'can-rename': '', disabled: '', data: CASCADE_DATA })
    dblClickLabel(whole, 0)
    expect(renameInputOf(whole)).toBeNull()
  })

  it('Enter 提交（监听先挂）派发事件并退出编辑', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    const details: unknown[] = []
    el.addEventListener('oas-node-rename', (e: Event) => details.push((e as CustomEvent).detail))
    dblClickLabel(el, 0)
    const input = renameInputOf(el)!
    input.value = '新名字'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(details).toEqual([{ key: 'a', label: '新名字', oldLabel: '节点 A' }])
    expect(renameInputOf(el)).toBeNull()
    // 组件不擅自改数据：label 仍显示宿主 data 里的旧值
    const label = rows(el)[0]!.querySelector<HTMLElement>('.label')!
    expect(label.textContent).toBe('节点 A')
  })

  it('宿主受控：监听 oas-node-rename 更新 data 后行内显示新 label', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    el.addEventListener('oas-node-rename', (e: Event) => {
      const { key, label } = (e as CustomEvent).detail
      const data = JSON.parse(el.getAttribute('data')!) as TreeNode[]
      const walk = (list: TreeNode[]): boolean => {
        for (const n of list) {
          if (n.key === key) {
            n.label = label
            return true
          }
          if (n.children && walk(n.children)) return true
        }
        return false
      }
      walk(data)
      el.setAttribute('data', JSON.stringify(data))
    })
    dblClickLabel(el, 0)
    const input = renameInputOf(el)!
    input.value = '宿主更新名'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    const label = rows(el)[0]!.querySelector<HTMLElement>('.label')!
    expect(label.textContent).toBe('宿主更新名')
  })

  it('Escape 取消：不派发事件、还原旧 label、退出编辑', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    const details: unknown[] = []
    el.addEventListener('oas-node-rename', (e: Event) => details.push((e as CustomEvent).detail))
    dblClickLabel(el, 0)
    const input = renameInputOf(el)!
    input.value = '改名失败'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(details.length).toBe(0)
    expect(renameInputOf(el)).toBeNull()
    expect(rows(el)[0]!.querySelector<HTMLElement>('.label')!.textContent).toBe('节点 A')
  })

  it('blur 提交：失焦即派发 oas-node-rename', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    const details: unknown[] = []
    el.addEventListener('oas-node-rename', (e: Event) => details.push((e as CustomEvent).detail))
    dblClickLabel(el, 0)
    const input = renameInputOf(el)!
    input.value = '失焦提交'
    input.dispatchEvent(new FocusEvent('blur'))
    expect(details).toEqual([{ key: 'a', label: '失焦提交', oldLabel: '节点 A' }])
    expect(renameInputOf(el)).toBeNull()
  })

  it('内容未变 / 空内容：静默退出（不派发事件）', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    const details: unknown[] = []
    el.addEventListener('oas-node-rename', (e: Event) => details.push((e as CustomEvent).detail))
    // 未改
    dblClickLabel(el, 0)
    renameInputOf(el)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    // 清空后 Enter → 还原（非破坏默认）
    dblClickLabel(el, 0)
    const input = renameInputOf(el)!
    input.value = ''
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(details.length).toBe(0)
    expect(renameInputOf(el)).toBeNull()
    expect(rows(el)[0]!.querySelector<HTMLElement>('.label')!.textContent).toBe('节点 A')
  })

  it('F2 进入编辑：roving 行上按 F2 内联编辑，Enter 提交后焦点回行', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    rows(el)[0]!.focus()
    rows(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, composed: true }))
    const input = renameInputOf(el)
    expect(input).not.toBeNull()
    expect(input!.value).toBe('节点 A')
    input!.value = 'F2 改名'
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(renameInputOf(el)).toBeNull()
    expect(rows(el)[0]!.tabIndex).toBe(0)
    // 焦点回到行
    expect(el.shadowRoot!.activeElement).toBe(rows(el)[0])
  })

  it('编辑态期间外部 update 重建行：编辑态与输入内容保持', () => {
    const el = mount({ 'can-rename': '', data: CASCADE_DATA })
    dblClickLabel(el, 0)
    const input = renameInputOf(el)!
    input.value = '重命名中'
    input.dispatchEvent(new Event('input'))
    // 重建触发（同 data 重设属性 → update 全量重建行）
    el.setAttribute('data', el.getAttribute('data')!)
    const rebuilt = renameInputOf(el)
    expect(rebuilt).not.toBeNull()
    expect(rebuilt!.value).toBe('重命名中')
  })

  it('编辑态在虚拟行内也能工作：双击 + Enter 提交 + 宿主更新', () => {
    const data = JSON.stringify([
      { key: 'n0', label: '节点 0', children: [{ key: 'n0-c', label: '子节点 0-c' }] },
      { key: 'n1', label: '节点 1' },
    ])
    const el = mount({ 'can-rename': '', height: '200', 'row-height': '32', data })
    el.addEventListener('oas-node-rename', (e: Event) => {
      const { key, label } = (e as CustomEvent).detail
      const list = JSON.parse(data) as TreeNode[]
      list[0]!.label = key === 'n0' ? label : list[0]!.label
      el.setAttribute('data', JSON.stringify(list))
    })
    const fire = (): void => {
      const label = virtualRows(el)[0]!.querySelector<HTMLElement>('.label') as HTMLElement
      label.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    }
    fire()
    fire()
    const input = virtualRows(el)[0]!.querySelector<HTMLInputElement>('input.rename-input')
    expect(input).not.toBeNull()
    input!.value = '虚拟行改名'
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(virtualRows(el)[0]!.textContent).toContain('虚拟行改名')
  })
})

describe('OASTree 展开/收起过渡（motion 高度动画）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

  it('motion 缺省关：展开/收起即时生效、不挂 motion 类与入场钩子', () => {
    const el = mount({ data: CASCADE_DATA })
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.tree')!
    expect(wrap.classList.contains('motion')).toBe(false)
    toggles(el)[0]!.click()
    expect(expandedOf(el)).toEqual(['a'])
    expect(labels(el)).toBe('节点 A|子节点 1|子节点 2|节点 B')
    expect(rows(el).filter((r) => r.classList.contains('oas-row-enter')).length).toBe(0)
    toggles(el)[0]!.click()
    expect(expandedOf(el)).toEqual([])
  })

  it('motion 开启：容器挂 motion 类、样式含过渡钩子（fade keyframes 与 leave 类）', () => {
    const el = mount({ motion: '', data: CASCADE_DATA })
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.tree')!
    expect(wrap.classList.contains('motion')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toMatch(/@keyframes oas-tree-row-fade/)
    expect(style).toMatch(/\.oas-row-leave/)
    // 虚拟行样式同样注入钩子
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    const vStyle = vlist.shadowRoot!.querySelector('style[data-oas-tree-rows]')!.textContent!
    expect(vStyle).toMatch(/@keyframes oas-tree-row-fade/)
  })

  it('motion 展开：展开后新增子行带入场钩子类', () => {
    const el = mount({ motion: '', data: CASCADE_DATA })
    toggles(el)[0]!.click()
    expect(expandedOf(el)).toEqual(['a'])
    expect(labels(el)).toBe('节点 A|子节点 1|子节点 2|节点 B')
    const enterRows = rows(el).filter((r) => r.classList.contains('oas-row-enter'))
    expect(enterRows.length).toBeGreaterThanOrEqual(2)
  })

  it('motion 收起：先离场动画（子行保留 + 带 oas-row-leave），动画后收起', async () => {
    const el = mount({ motion: '', expanded: '["a"]', data: CASCADE_DATA })
    expect(labels(el)).toBe('节点 A|子节点 1|子节点 2|节点 B')
    toggles(el)[0]!.click()
    // 离场阶段：expanded 未落库、子行仍在 DOM 并带离场钩子
    expect(expandedOf(el)).toEqual(['a'])
    const leaving = rows(el).filter((r) => r.classList.contains('oas-row-leave'))
    expect(leaving.length).toBeGreaterThanOrEqual(2)
    // 动画时长（--oas-transition-base 兜底 180ms）+ 余量后真正收起
    await wait(320)
    expect(expandedOf(el)).toEqual([])
    expect(labels(el)).toBe('节点 A|节点 B')
  })

  it('motion + 虚拟滚动：motion 类与入场降级 fade 钩子，收起即时', async () => {
    const el = mount({ motion: '', height: '200', 'row-height': '32', data: BIG_DATA })
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement
    expect(vlist.classList.contains('motion')).toBe(true)
    const toggle = virtualRows(el)[0]!.querySelector<HTMLButtonElement>('.toggle')!
    toggle.click()
    expect(expandedOf(el)).toEqual(['n0'])
    const childRow = [...virtualRows(el)].find((r) =>
      r.querySelector<HTMLElement>('.label')!.textContent.includes('子节点 0-c'),
    )
    expect(childRow).toBeTruthy()
    expect(childRow!.querySelector('.row')!.classList.contains('oas-row-fade')).toBe(true)
    // 虚拟模式收起降级即时（不做强行动画）
    virtualRows(el)[0]!.querySelector<HTMLButtonElement>('.toggle')!.click()
    expect(expandedOf(el)).toEqual([])
  })
})
