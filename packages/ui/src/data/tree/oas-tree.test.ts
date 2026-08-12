import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTree } from './index.js'

const DATA = JSON.stringify([
  { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
  { key: 'b', label: '节点 B' },
])

function mount(attrs: Record<string, string> = {}): OASTree {
  const el = new OASTree()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.data) el.setAttribute('data', DATA)
  document.body.appendChild(el)
  return el
}

function rows(el: OASTree): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
}

describe('OASTree', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染根节点，子节点默认收起', () => {
    const el = mount()
    expect(rows(el).length).toBe(2)
    expect(el.shadowRoot!.textContent).toContain('节点 A')
    expect(el.shadowRoot!.textContent).not.toContain('子节点 1')
  })

  it('点击展开按钮显示子节点', () => {
    const el = mount()
    ;(el.shadowRoot!.querySelector('[part="toggle"]') as HTMLElement).click()
    expect(el.shadowRoot!.textContent).toContain('子节点 1')
  })

  it('点击选中节点派发 oas-select', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    rows(el)[0]!.click()
    expect(detail).toEqual({ key: 'a', selected: true })
  })

  it('locale：展开/选择 aria-label 随 setLocale 切换', () => {
    const el = mount({ checkable: '' })
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label'),
    ).toBe('展开/收起')
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('选择 节点 A')

    setLocale(en)
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label'),
    ).toBe('Expand/Collapse')
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('Select 节点 A')

    setLocale('zh-CN')
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label'),
    ).toBe('展开/收起')
  })

  it('点击复选框：更新 checked 属性、派发 oas-check、重建后 √ 恢复', () => {
    const el = mount({ checkable: '', expanded: 'a' })
    let checkDetail: unknown
    let selectFired = 0
    el.addEventListener('oas-check', (e: Event) => (checkDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-select', () => selectFired++)

    const boxes = (): HTMLInputElement[] => [
      ...(el.shadowRoot!.querySelectorAll(
        'input[type="checkbox"]',
      ) as NodeListOf<HTMLInputElement>),
    ]
    // 初始：a 未勾选、a-1 未勾选、a-2 未勾选
    expect(boxes().map((b) => b.checked)).toEqual([false, false, false])

    // 模拟真实浏览器勾选流程：先切换 checked，再派发 change
    const boxA1 = boxes()[1]!
    boxA1.checked = true
    boxA1.dispatchEvent(new Event('change'))

    expect(el.getAttribute('checked')).toBe('a-1')
    expect(checkDetail).toEqual({ key: 'a-1', checked: true })
    // 点击复选框不应触发行选中（select 与 check 互不干扰）
    expect(selectFired).toBe(0)
    // update() 重建后新复选框应恢复勾选（√ 显示）
    expect(boxes()[1]!.checked).toBe(true)

    // 取消勾选
    const boxA1After = boxes()[1]!
    boxA1After.checked = false
    boxA1After.dispatchEvent(new Event('change'))
    expect(el.getAttribute('checked')).toBe('')
    expect(boxes()[1]!.checked).toBe(false)
  })

  it('点击复选框不触发行选中（stopPropagation）', () => {
    const el = mount({ checkable: '' })
    let selectDetail: unknown
    el.addEventListener('oas-select', (e: Event) => (selectDetail = (e as CustomEvent).detail))
    const box = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    box.click()
    expect(selectDetail).toBeUndefined()
    expect(el.getAttribute('selected')).toBeNull()
  })
})

const LAZY_DATA = JSON.stringify([
  { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
  { key: 'b', label: '节点 B' },
  { key: 'c', label: '节点 C', isLeaf: true },
])

function toggles(el: OASTree): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="toggle"]')]
}

describe('OASTree 懒加载', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('lazy：未加载节点显示展开按钮，isLeaf 节点不显示', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    // a（有 children）+ b（未加载，懒加载可展开）= 2 个可见展开按钮；c 为显式叶子 → 隐藏
    expect(toggles(el).length).toBe(2)
    // 非 lazy 模式下 b、c 均为叶子，只有 a 有展开按钮
    const plain = mount({ data: LAZY_DATA })
    expect(toggles(plain).length).toBe(1)
  })

  it('lazy：展开未加载节点派发 oas-load、显示加载占位，回填后子节点可见', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    let loadDetail: unknown
    el.addEventListener('oas-load', (e: Event) => (loadDetail = (e as CustomEvent).detail))

    toggles(el)[1]!.click() // b 的展开按钮
    expect(loadDetail).toEqual({ key: 'b' })
    expect(el.getAttribute('expanded')).toContain('b')
    // 加载中占位（spinner 占住原展开按钮的槽位，行高/对齐不变）
    const spinner = el.shadowRoot!.querySelector<HTMLElement>('[part="spinner"]')
    expect(spinner).not.toBeNull()
    expect(spinner!.getAttribute('aria-label')).toBe('加载中…')

    // 宿主回填子节点：b 获得 children → 加载态清除、b-1 因 expanded 直接可见
    const loaded = JSON.stringify([
      { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
      { key: 'b', label: '节点 B', children: [{ key: 'b-1', label: '子节点 b-1' }] },
      { key: 'c', label: '节点 C', isLeaf: true },
    ])
    el.setAttribute('data', loaded)
    expect(el.shadowRoot!.querySelector('[part="spinner"]')).toBeNull()
    expect(el.shadowRoot!.textContent).toContain('子节点 b-1')
  })

  it('lazy：load 属性回调触发（与 oas-load 事件并存）', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    let viaProp: unknown
    let viaEvent = 0
    el.load = (payload) => (viaProp = payload)
    el.addEventListener('oas-load', () => viaEvent++)
    toggles(el)[1]!.click()
    expect(viaProp).toEqual({ key: 'b' })
    expect(viaEvent).toBe(1)
  })

  it('lazy：已加载节点（有 children）展开不触发 oas-load', () => {
    const el = mount({ lazy: '', data: LAZY_DATA })
    let fired = 0
    el.addEventListener('oas-load', () => fired++)
    toggles(el)[0]!.click() // a 已有 children，普通展开
    expect(fired).toBe(0)
    expect(el.getAttribute('expanded')).toContain('a')
  })
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

describe('OASTree 拖拽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('draggable：before/after/inner 三种落点均派发 oas-node-drop', () => {
    const el = mount({ draggable: '', expanded: 'a' })
    const r = rows(el) // a, a-1, b
    const details: unknown[] = []
    el.addEventListener('oas-node-drop', (e: Event) => details.push((e as CustomEvent).detail))

    // before：目标行上半区
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[1]!.getBoundingClientRect = () => rect100()
    r[1]!.dispatchEvent(dropEvent('dragover', 10))
    expect(r[1]!.classList.contains('drop-before')).toBe(true)
    r[1]!.dispatchEvent(dropEvent('drop', 10))
    expect(details[0]).toEqual({ dragKey: 'a', dropKey: 'a-1', position: 'before' })

    // after：目标行下半区
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[2]!.getBoundingClientRect = () => rect100()
    r[2]!.dispatchEvent(dropEvent('dragover', 90))
    expect(r[2]!.classList.contains('drop-after')).toBe(true)
    r[2]!.dispatchEvent(dropEvent('drop', 90))
    expect(details[1]).toEqual({ dragKey: 'a', dropKey: 'b', position: 'after' })

    // inner：可展开目标行中部（a 有 children）
    r[1]!.dispatchEvent(dropEvent('dragstart', 0)) // 拖动 a-1
    r[0]!.getBoundingClientRect = () => rect100()
    r[0]!.dispatchEvent(dropEvent('dragover', 50))
    expect(r[0]!.classList.contains('drop-inner')).toBe(true)
    r[0]!.dispatchEvent(dropEvent('drop', 50))
    expect(details[2]).toEqual({ dragKey: 'a-1', dropKey: 'a', position: 'inner' })
  })

  it('draggable：拖放自身不派发事件', () => {
    const el = mount({ draggable: '' })
    const r = rows(el)
    let fired = 0
    el.addEventListener('oas-node-drop', () => fired++)
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[0]!.dispatchEvent(dropEvent('dragover', 50))
    r[0]!.dispatchEvent(dropEvent('drop', 50))
    expect(fired).toBe(0)
  })

  it('draggable：dragend 清空拖拽反馈标记', () => {
    const el = mount({ draggable: '', expanded: 'a' })
    const r = rows(el)
    r[0]!.dispatchEvent(dropEvent('dragstart', 0))
    r[1]!.getBoundingClientRect = () => rect100()
    r[1]!.dispatchEvent(dropEvent('dragover', 10))
    expect(r[1]!.classList.contains('drop-before')).toBe(true)
    r[0]!.dispatchEvent(dropEvent('dragend', 0))
    expect(r[1]!.classList.contains('drop-before')).toBe(false)
  })

  it('draggable：拖到根容器空白处派发 oas-node-drop（dropKey 为空，inner）', () => {
    const el = mount({ draggable: '' })
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

function virtualViewport(el: OASTree): HTMLElement {
  const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
  return vlist.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
}

const flushRaf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

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
    // 可见 ceil(200/32)=7 + 下方 buffer 4 = 11 行
    expect(virtualRows(el).length).toBe(11)
    expect(virtualRows(el)[0]!.textContent).toContain('节点 0')
  })

  it('虚拟化下点击展开按钮显示子节点', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    const toggle = virtualRows(el)[0]!.querySelector<HTMLButtonElement>('.toggle')!
    toggle.click()
    expect(el.getAttribute('expanded')).toContain('n0')
    // n0-c 插入索引 1，仍在顶部窗口内
    expect(virtualRows(el)[1]!.textContent).toContain('子节点 0-c')
  })

  it('虚拟化：滚动后窗口重算且展开状态保持', async () => {
    const el = mount({ height: '100', 'row-height': '32', data: BIG_DATA, expanded: 'n0' })
    const vp = virtualViewport(el)
    vp.scrollTop = 320
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // floor(320/32)-4 = 6；展开后平铺顺序：n0(0) n0-c(1) n1(2) n2(3) n3(4) n4(5) n5(6)…
    expect(virtualRows(el)[0]!.textContent).toContain('节点 5')
    expect(el.getAttribute('expanded')).toBe('n0')
  })

  it('虚拟化：checkable 勾选写回 checked 属性并恢复勾选态', () => {
    const el = mount({ height: '200', 'row-height': '32', checkable: '', data: BIG_DATA })
    const box = virtualRows(el)[0]!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    box.checked = true
    box.dispatchEvent(new Event('change'))
    expect(el.getAttribute('checked')).toBe('n0')
    const rebuilt = virtualRows(el)[0]!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(rebuilt.checked).toBe(true)
  })

  it('虚拟化：点击行选中并派发 oas-select', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const row = virtualRows(el)[0]!.querySelector<HTMLElement>('.row')!
    row.click()
    expect(el.getAttribute('selected')).toBe('n0')
    expect(detail).toEqual({ key: 'n0', selected: true })
  })

  it('height 移除后回退全量渲染', () => {
    const el = mount({ height: '200', 'row-height': '32', data: BIG_DATA })
    el.removeAttribute('height')
    expect(rows(el).length).toBe(100)
    expect((el.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement).hidden).toBe(true)
  })
})

describe('OASTree 声明式数据通道与真水合', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('property 赋值优先：data setter 单向反射 attribute，getter 返回解析数组', () => {
    const el = new OASTree()
    document.body.appendChild(el)
    const data = [{ key: 'a', label: '属性节点', children: [{ key: 'a-1', label: '子节点 1' }] }]
    el.data = data
    // setter 反射 attribute（attribute 为唯一权威数据源）
    expect(el.getAttribute('data')).toBe(JSON.stringify(data))
    // attributeChangedCallback → update() → 行渲染
    expect(rows(el)[0]!.textContent).toContain('属性节点')
    // getter 返回 parse 后的数组（与 table 先例一致）
    expect(el.data).toEqual(data)
  })

  it('属性变化驱动重渲染：setAttribute data 后行内容即时更新', () => {
    const el = mount()
    expect(rows(el)[0]!.textContent).toContain('节点 A')
    el.setAttribute(
      'data',
      JSON.stringify([
        { key: 'x', label: '新节点' },
        { key: 'y', label: '另一节点' },
      ]),
    )
    const r = rows(el)
    expect(r.length).toBe(2)
    expect(r[0]!.textContent).toContain('新节点')
    expect(r[0]!.textContent).not.toContain('节点 A')
  })

  it('非法 JSON 容错：data 非 JSON 时渲染空树，不抛错', () => {
    const el = new OASTree()
    el.setAttribute('data', '[{bad json')
    document.body.appendChild(el)
    expect(rows(el).length).toBe(0)
    expect(el.shadowRoot!.textContent).not.toContain('bad')
  })

  it('真水合：DSD 快照存在时 hydrate 接管，shadow 不重建（style 引用保持）、行数据照常渲染', () => {
    // 模拟浏览器 DSD upgrade：构造器 attachShadow 后注入「SSR 快照 + 指纹 meta」
    const snap = new OASTree()
    snap.shadowRoot!.innerHTML = `
      <meta data-oas-ssr="oas-tree" data-oas-ssr-v="1">
      <style>.probe-style { color: red; }</style>
      <div class="tree" part="tree" role="tree"></div>
      <oas-virtual-list part="virtual" hidden></oas-virtual-list>`
    const styleSnap = snap.shadowRoot!.querySelector('style')!
    document.body.appendChild(snap) // connectedCallback → tryHydrate
    // hydrate 接管：style 引用保持同一对象（shadow 未重建）
    expect(snap.shadowRoot!.querySelector('style')).toBe(styleSnap)
    // 指纹 meta 已移除
    expect(snap.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    // 属性驱动的数据行照常增量写入（update 只重建 .tree 内容）
    snap.setAttribute('data', JSON.stringify([{ key: 'a', label: '水合节点' }]))
    expect(snap.shadowRoot!.querySelector('style')).toBe(styleSnap)
    expect(rows(snap)[0]!.textContent).toContain('水合节点')
    // 交互完整恢复：点击选中派发 oas-select
    let detail: unknown
    snap.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    rows(snap)[0]!.click()
    expect(detail).toEqual({ key: 'a', selected: true })
  })

  it('真水合回退：快照缺关键结构时回退 render 全量重建，功能仍正常', () => {
    const snap = new OASTree()
    // 指纹命中但结构不完整（无 .tree 容器）→ hydrate 返回 false → render 重建
    snap.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-tree" data-oas-ssr-v="1"><span>broken</span>'
    document.body.appendChild(snap)
    expect(snap.shadowRoot!.querySelector('.tree')).not.toBeNull()
    expect(snap.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    snap.setAttribute('data', JSON.stringify([{ key: 'a', label: '回退节点' }]))
    expect(rows(snap)[0]!.textContent).toContain('回退节点')
  })
})
