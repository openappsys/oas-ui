import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTransfer } from './index.js'

const DATA = [
  { key: 'a', label: '苹果' },
  { key: 'b', label: '香蕉' },
  { key: 'c', label: '橙子', disabled: true },
]

function mount(attrs: Record<string, string> = {}): OASTransfer {
  const el = new OASTransfer()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  el.data = DATA
  return el
}

function leftOptions(el: OASTransfer): NodeListOf<Element> {
  return el.shadowRoot!.querySelectorAll('.listbox.left .option')
}

function rightOptions(el: OASTransfer): NodeListOf<Element> {
  return el.shadowRoot!.querySelectorAll('.listbox.right .option')
}

function toRightBtn(el: OASTransfer): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.to-right')!
}

function toLeftBtn(el: OASTransfer): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.to-left')!
}

describe('OASTransfer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('data 属性渲染左右面板，value 中的 key 出现在右侧', async () => {
    const el = mount()
    await Promise.resolve()
    expect(leftOptions(el).length).toBe(3)
    expect(rightOptions(el).length).toBe(0)
    expect(leftOptions(el)[0]!.textContent).toContain('苹果')
  })

  it('value 预置时右侧展示对应项', () => {
    const el = mount({ value: '["a","c"]' })
    expect(rightOptions(el).length).toBe(2)
    expect(rightOptions(el)[0]!.textContent).toContain('苹果')
    expect(leftOptions(el).length).toBe(1)
    expect(leftOptions(el)[0]!.textContent).toContain('香蕉')
  })

  it('选中后点向右按钮：移动并派发 oas-change（value 更新）', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(toRightBtn(el).disabled).toBe(false)
    toRightBtn(el).click()
    expect(detail).toEqual({ value: ['a'] })
    expect(el.getAttribute('value')).toBe('["a"]')
    expect(rightOptions(el).length).toBe(1)
    expect(leftOptions(el).length).toBe(2)
  })

  it('disabled 项不可选中，穿梭按钮随选中清空禁用', () => {
    const el = mount()
    ;(leftOptions(el)[2] as HTMLElement).click() // c 是 disabled
    expect(
      el.shadowRoot!.querySelector('.listbox.left .option[aria-disabled="true"]'),
    ).not.toBeNull()
    expect(toRightBtn(el).disabled).toBe(true)
  })

  it('右侧选中后点向左按钮移回左侧', () => {
    const el = mount({ value: '["a"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(rightOptions(el)[0] as HTMLElement).click()
    toLeftBtn(el).click()
    expect(detail).toEqual({ value: [] })
    expect(leftOptions(el).length).toBe(3)
  })

  it('全选 checkbox 选中全部可见项，再点向右全部移动', () => {
    const el = mount()
    const check = el.shadowRoot!.querySelector<HTMLInputElement>('.check-left')!
    check.click()
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('true')
    toRightBtn(el).click()
    expect(rightOptions(el).length).toBe(2) // disabled 的 c 不移动
    expect(leftOptions(el).length).toBe(1)
  })

  it('searchable：显示搜索框并过滤面板', () => {
    const el = mount({ searchable: '' })
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    expect(search.hidden).toBe(false)
    search.value = '香'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    const options = [...leftOptions(el)]
    expect(options.length).toBe(1)
    expect(options[0]!.textContent).toContain('香蕉')
  })

  it('键盘：方向键移动选中，Enter 穿梭', () => {
    const el = mount()
    const lb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.left')!
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(leftOptions(el)[1]!.getAttribute('aria-selected')).toBe('true')
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ value: ['b'] })
  })

  it('titles 属性（JSON）驱动面板标题', () => {
    const el = mount({ titles: '["可选","已选"]' })
    expect(el.shadowRoot!.querySelector('.title.source')!.textContent).toBe('可选')
    expect(el.shadowRoot!.querySelector('.title.target')!.textContent).toBe('已选')
  })

  it('searchable：默认大小写不敏感，case-sensitive 开启后区分大小写', () => {
    const data = [
      { key: 'a', label: 'Apple' },
      { key: 'b', label: 'apricot' },
    ]
    const searchOf = (el: OASTransfer) =>
      el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!

    // 默认：'ap' 大小写不敏感命中两项
    const el1 = new OASTransfer()
    el1.setAttribute('searchable', '')
    document.body.appendChild(el1)
    el1.data = data
    searchOf(el1).value = 'ap'
    searchOf(el1).dispatchEvent(new Event('input', { bubbles: true }))
    expect(leftOptions(el1).length).toBe(2)

    // case-sensitive：'ap' 只命中 'apricot'（Apple 大写 A 不匹配）
    const el2 = new OASTransfer()
    el2.setAttribute('searchable', '')
    el2.setAttribute('case-sensitive', '')
    document.body.appendChild(el2)
    el2.data = data
    searchOf(el2).value = 'ap'
    searchOf(el2).dispatchEvent(new Event('input', { bubbles: true }))
    expect(leftOptions(el2).length).toBe(1)
    expect(leftOptions(el2)[0]!.textContent).toContain('apricot')
  })

  it('searchable：过滤后全选只选中可见项，穿梭只移动可见选中', () => {
    const el = mount({ searchable: '' })
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    search.value = '香'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    expect(leftOptions(el).length).toBe(1) // 只剩香蕉
    el.shadowRoot!.querySelector<HTMLInputElement>('.check-left')!.click()
    toRightBtn(el).click()
    expect(el.getAttribute('value')).toBe('["b"]')
    // 过滤词清除后：被过滤掉的 a/c 未被移动
    search.value = ''
    search.dispatchEvent(new Event('input', { bubbles: true }))
    expect(leftOptions(el).length).toBe(2)
  })

  it('searchable：无匹配显示 noMatch 文案（与空数据 empty 区分）', () => {
    const el = mount({ searchable: '' })
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    search.value = 'zzz'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    const empty = el.shadowRoot!.querySelector('.listbox.left .empty')!
    expect(empty.textContent).toBe('未找到匹配项')
  })

  it('one-way：左侧展示全部数据、已穿梭项禁用；右侧无移除按钮', () => {
    const el = mount({ value: '["a"]', 'one-way': '' })
    // 左侧仍含 3 项，其中已穿梭的 a 禁用且视为已选中
    const left = [...leftOptions(el)]
    expect(left.length).toBe(3)
    const rowA = left.find((r) => r.textContent!.includes('苹果'))!
    expect(rowA.getAttribute('aria-disabled')).toBe('true')
    expect(rowA.getAttribute('aria-selected')).toBe('true')
    // 右侧只含 a
    expect(rightOptions(el).length).toBe(1)
    // 移除按钮隐藏
    expect(toLeftBtn(el).hidden).toBe(true)
    // 右侧全选 checkbox 禁用
    const check = el.shadowRoot!.querySelector<HTMLInputElement>('.check-right')!
    expect(check.disabled).toBe(true)
  })

  it('one-way：右侧不可选择、向左按钮点击无效果', () => {
    const el = mount({ value: '["a"]', 'one-way': '' })
    ;(rightOptions(el)[0] as HTMLElement).click()
    toLeftBtn(el).click()
    expect(el.getAttribute('value')).toBe('["a"]')
    expect(el.shadowRoot!.querySelector('.listbox.right .option[aria-selected="true"]')).toBeNull()
  })

  it('one-way：左侧穿梭后该选项在左侧变为禁用且 value 更新', () => {
    const el = mount({ 'one-way': '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(leftOptions(el)[0] as HTMLElement).click() // 苹果
    toRightBtn(el).click()
    expect(detail).toEqual({ value: ['a'] })
    expect(el.getAttribute('value')).toBe('["a"]')
    const rowA = [...leftOptions(el)].find((r) => r.textContent!.includes('苹果'))!
    expect(rowA.getAttribute('aria-disabled')).toBe('true')
    expect(rowA.getAttribute('aria-selected')).toBe('true')
    expect(rightOptions(el).length).toBe(1)
  })

  it('one-way：左侧全选只选未穿梭项', () => {
    const el = mount({ value: '["a"]', 'one-way': '' })
    el.shadowRoot!.querySelector<HTMLInputElement>('.check-left')!.click()
    toRightBtn(el).click()
    // 可选的只剩 b（a 已穿梭禁用、c 数据禁用）
    expect(el.getAttribute('value')).toBe('["a","b"]')
  })

  it('one-way：右侧键盘 Enter 不移回、方向键不产生选中', () => {
    const el = mount({ value: '["a"]', 'one-way': '' })
    const rb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.right')!
    rb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('["a"]')
    rb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(el.shadowRoot!.querySelector('.listbox.right .option[aria-selected="true"]')).toBeNull()
  })

  it('受控模式：外部改 value 属性驱动面板同步', () => {
    const el = mount({ value: '["a"]' })
    el.setAttribute('value', '["a","b"]')
    expect(rightOptions(el).length).toBe(2)
    expect(leftOptions(el).length).toBe(1)
    expect(leftOptions(el)[0]!.textContent).toContain('橙子')
  })

  // ---------- 虚拟滚动（virtual） ----------

  const BIG = Array.from({ length: 5000 }, (_, i) => ({ key: `k${i}`, label: `Item ${i}` }))

  const flushRaf = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  function leftVlist(el: OASTransfer): Element {
    return el.shadowRoot!.querySelector('.vlist-left')!
  }

  function leftVRows(el: OASTransfer): Element[] {
    return [...leftVlist(el).shadowRoot!.querySelectorAll('[part="item"] .option')]
  }

  function viewportOf(el: OASTransfer, side: 'left' | 'right'): HTMLElement {
    const vlist = el.shadowRoot!.querySelector(`.vlist-${side}`)!
    return vlist.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
  }

  it('virtual：5000 项窗口化渲染，行数受限、padding 撑滚动高度', () => {
    const el = new OASTransfer()
    el.setAttribute('virtual', '')
    document.body.appendChild(el)
    el.data = BIG
    const rows = leftVRows(el)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThan(30)
    const vroot = leftVlist(el).shadowRoot!
    const inner = vroot.querySelector<HTMLElement>('[part="inner"]')!
    expect(inner.style.height).toBe(`${5000 * 36}px`)
    expect(vroot.querySelector<HTMLElement>('[part="padding-bottom"]')!.style.height).not.toBe(
      '0px',
    )
  })

  it('virtual：点击行选中并穿梭，滚动后选中态保持', async () => {
    const el = new OASTransfer()
    el.setAttribute('virtual', '')
    document.body.appendChild(el)
    el.data = BIG
    ;(leftVRows(el)[0] as HTMLElement).click()
    expect(leftVRows(el)[0]!.getAttribute('aria-selected')).toBe('true')
    toRightBtn(el).click()
    expect(el.getAttribute('value')).toBe('["k0"]')
    // 右侧为虚拟面板：行渲染在 vlist shadow 内
    const vrootR = el.shadowRoot!.querySelector('.vlist-right')!.shadowRoot!
    const rightRows = vrootR.querySelectorAll('[part="item"] .option')
    expect(rightRows.length).toBe(1)
    expect(rightRows[0]!.textContent).toContain('Item 0')
    // 滚动后窗口平移，回顶部后首项是 k1（k0 已移走）
    const vp = viewportOf(el, 'left')
    vp.scrollTop = 1000
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(leftVRows(el).length).toBeGreaterThan(0)
    vp.scrollTop = 0
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(leftVRows(el)[0]!.getAttribute('data-key')).toBe('k1')
  })

  it('virtual：键盘导航选中并穿梭', () => {
    const el = new OASTransfer()
    el.setAttribute('virtual', '')
    document.body.appendChild(el)
    el.data = BIG
    const vp = viewportOf(el, 'left')
    vp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    vp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const selected = (k: string) =>
      leftVRows(el).some(
        (r) => r.getAttribute('data-key') === k && r.getAttribute('aria-selected') === 'true',
      )
    expect(selected('k1')).toBe(true)
    vp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('["k1"]')
  })

  it('virtual + searchable：过滤后窗口按子集渲染', () => {
    const el = new OASTransfer()
    el.setAttribute('virtual', '')
    el.setAttribute('searchable', '')
    document.body.appendChild(el)
    el.data = Array.from({ length: 1000 }, (_, i) => ({ key: `k${i}`, label: `Item ${i}` }))
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    search.value = 'Item 19'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    // 'Item 19' 命中 Item 19 + Item 190-199 = 11 项（0-999 范围内）
    const rows = leftVRows(el)
    expect(rows.length).toBe(11)
    const vroot = leftVlist(el).shadowRoot!
    expect(vroot.querySelector<HTMLElement>('[part="inner"]')!.style.height).toBe(`${11 * 36}px`)
  })

  it('virtual + searchable：搜索无匹配回落静态空态文案', () => {
    const el = new OASTransfer()
    el.setAttribute('virtual', '')
    el.setAttribute('searchable', '')
    document.body.appendChild(el)
    el.data = [
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
    ]
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    search.value = 'zzz'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    const empty = el.shadowRoot!.querySelector('.listbox.left .empty')!
    expect(empty.textContent).toBe('未找到匹配项')
  })
})

// ---- disabled 禁用 ----
describe('OASTransfer disabled', () => {
  it('disabled：行点击无选中、穿梭按钮禁用、全选禁用、键盘无效、宿主镜像 data-disabled', () => {
    const el = mount({ disabled: '' })
    expect(el.hasAttribute('data-disabled')).toBe(true)
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('false')
    expect(toRightBtn(el).disabled).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('.check-left')!.disabled).toBe(true)
    const lb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.left')!
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(
      el.shadowRoot!.querySelector('.listbox.left .option[aria-selected="true"]'),
    ).toBeNull()
  })

  it('disabled：searchable 搜索框禁用', () => {
    const el = mount({ disabled: '', searchable: '' })
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!.disabled).toBe(true)
  })

  it('移除 disabled 后恢复交互', () => {
    const el = mount({ disabled: '' })
    el.removeAttribute('disabled')
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('true')
    expect(el.hasAttribute('data-disabled')).toBe(false)
  })
})

// ---- target-sort 目标顺序策略 ----
describe('OASTransfer target-sort', () => {
  it('默认 original：穿梭后 value 与右侧显示都按数据源顺序', () => {
    const el = mount({ value: '["c"]' })
    // 左侧可选 a、b（c 已在右侧）
    ;(leftOptions(el)[0] as HTMLElement).click() // a
    toRightBtn(el).click()
    expect(el.getAttribute('value')).toBe('["a","c"]')
    const right = [...rightOptions(el)]
    expect(right.map((r) => r.textContent)).toEqual(['苹果', '橙子'])
  })

  it('push：新穿梭项追加 value 尾部（旧行为兼容锁定）', () => {
    const el = mount({ 'target-sort': 'push', value: '["c"]' })
    ;(leftOptions(el)[0] as HTMLElement).click() // a
    toRightBtn(el).click()
    expect(el.getAttribute('value')).toBe('["c","a"]')
    expect([...rightOptions(el)].map((r) => r.textContent)).toEqual(['橙子', '苹果'])
  })

  it('unshift：新穿梭项依次插入 value 头部', () => {
    const el = mount({ 'target-sort': 'unshift' })
    ;(leftOptions(el)[0] as HTMLElement).click() // a
    toRightBtn(el).click()
    ;(leftOptions(el)[0] as HTMLElement).click() // b（a 已右移，左侧首项是 b）
    toRightBtn(el).click()
    expect(el.getAttribute('value')).toBe('["b","a"]')
    expect([...rightOptions(el)].map((r) => r.textContent)).toEqual(['香蕉', '苹果'])
  })

  it('original：预置乱序 value 时显示按数据源顺序重排', () => {
    const el = mount({ value: '["c","a"]' })
    expect([...rightOptions(el)].map((r) => r.textContent)).toEqual(['苹果', '橙子'])
  })

  it('push：预置乱序 value 保持 value 顺序显示', () => {
    const el = mount({ 'target-sort': 'push', value: '["c","a"]' })
    expect([...rightOptions(el)].map((r) => r.textContent)).toEqual(['橙子', '苹果'])
  })
})

// ---- item 插槽（template 克隆） ----
describe('OASTransfer item 插槽', () => {
  it('template[slot="item"] 克隆进静态行，[data-item-label] 绑定选项文本', () => {
    const el = mount()
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'item')
    tpl.innerHTML = '<oas-icon name="user"></oas-icon><span data-item-label></span>'
    el.appendChild(tpl)
    el.setAttribute('titles', '["可选","已选"]') // 触发 update 重渲
    const first = leftOptions(el)[0]!
    expect(first.querySelector('oas-icon')).not.toBeNull()
    expect(first.querySelector('[data-item-label]')!.textContent).toBe('苹果')
  })

  it('虚拟模式：template 克隆进 vlist shadow 内的行（跨 shadow 克隆可行）', () => {
    const el = new OASTransfer()
    el.setAttribute('virtual', '')
    document.body.appendChild(el)
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'item')
    tpl.innerHTML = '<em class="tick">✓</em><span data-item-label></span>'
    el.appendChild(tpl)
    el.data = Array.from({ length: 100 }, (_, i) => ({ key: `k${i}`, label: `Item ${i}` }))
    const row = el.shadowRoot!.querySelector('.vlist-left')!.shadowRoot!.querySelectorAll(
      '[part="item"] .option',
    )[0]!
    expect(row.querySelector('.tick')).not.toBeNull()
    expect(row.querySelector('[data-item-label]')!.textContent).toBe('Item 0')
  })
})

// ---- oas-select-change / oas-search 事件 ----
describe('OASTransfer 事件（select-change / search）', () => {
  it('点行派发 oas-select-change（side + selected）', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-select-change', (e: Event) => details.push((e as CustomEvent).detail))
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(details.at(-1)).toEqual({ side: 'left', selected: ['a'] })
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(details.at(-1)).toEqual({ side: 'left', selected: [] })
  })

  it('全选派发 oas-select-change（可见可选项全集）', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-select-change', (e: Event) => details.push((e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLInputElement>('.check-left')!.click()
    expect(details.at(-1)).toEqual({ side: 'left', selected: ['a', 'b'] })
  })

  it('键盘选中同样派发 oas-select-change', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-select-change', (e: Event) => details.push((e as CustomEvent).detail))
    const lb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.left')!
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(details.at(-1)).toEqual({ side: 'left', selected: ['a'] })
  })

  it('搜索输入派发 oas-search（side + 原始 query）', () => {
    const el = mount({ searchable: '' })
    const details: unknown[] = []
    el.addEventListener('oas-search', (e: Event) => details.push((e as CustomEvent).detail))
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    search.value = '香'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    expect(details).toEqual([{ side: 'left', query: '香' }])
  })
})

// ---- 面板头计数 ----
describe('OASTransfer 面板头计数', () => {
  it('面板头显示 已选/可见 N/M 计数并随选中变化', () => {
    const el = mount()
    const countOf = () => el.shadowRoot!.querySelector<HTMLElement>('.panel-head .count')!
    expect(countOf().textContent).toMatch(/^0\/3$/)
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(countOf().textContent).toMatch(/^1\/3$/)
    // 右侧面板同样计数
    const rightCount = el.shadowRoot!.querySelectorAll<HTMLElement>('.panel-head .count')[1]!
    expect(rightCount.textContent).toMatch(/^0\/0$/)
  })

  it('过滤态计数跟随可见项', () => {
    const el = mount({ searchable: '' })
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    search.value = '香'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    const countOf = () => el.shadowRoot!.querySelector<HTMLElement>('.panel-head .count')!
    expect(countOf().textContent).toMatch(/^0\/1$/)
  })

  it('one-way 右侧只读面板隐藏计数（与全选一致）', () => {
    const el = mount({ 'one-way': '', value: '["a"]' })
    const rightCount = el.shadowRoot!.querySelectorAll<HTMLElement>('.panel-head .count')[1]!
    expect(rightCount.hidden).toBe(true)
  })
})

// ---- empty 空态插槽 ----
describe('OASTransfer empty 插槽', () => {
  it('template[slot="empty"] 自定义空态与无匹配态', () => {
    const el = new OASTransfer()
    el.setAttribute('searchable', '')
    document.body.appendChild(el)
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'empty')
    tpl.innerHTML = '<div class="custom-empty">暂无数据，请从左侧选择</div>'
    el.appendChild(tpl)
    el.data = [] // data setter → update → 空态重渲（template 已在场）
    const empty = el.shadowRoot!.querySelector('.listbox.left .empty')!
    expect(empty.querySelector('.custom-empty')).not.toBeNull()
    // 无匹配态同样走插槽
    el.data = [{ key: 'a', label: '苹果' }]
    const search = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    search.value = 'zzz'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    const noMatch = el.shadowRoot!.querySelector('.listbox.left .empty')!
    expect(noMatch.querySelector('.custom-empty')).not.toBeNull()
  })
})

// ---- simple 选中即移动 ----
describe('OASTransfer simple', () => {
  it('点左侧行即右移（免按钮），中央穿梭按钮隐藏', () => {
    const el = mount({ simple: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    expect(el.shadowRoot!.querySelector<HTMLElement>('.actions')!.hidden).toBe(true)
    ;(leftOptions(el)[0] as HTMLElement).click()
    expect(detail).toEqual({ value: ['a'] })
    expect(rightOptions(el).length).toBe(1)
    expect(leftOptions(el).length).toBe(2)
  })

  it('点右侧行即左移', () => {
    const el = mount({ simple: '' })
    ;(leftOptions(el)[0] as HTMLElement).click()
    ;(rightOptions(el)[0] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('[]')
    expect(leftOptions(el).length).toBe(3)
  })

  it('simple + one-way：右侧点击无效（只读）', () => {
    const el = mount({ simple: '', 'one-way': '', value: '["a"]' })
    ;(rightOptions(el)[0] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('["a"]')
  })

  it('simple 遵循 target-sort（unshift 插头部）', () => {
    const el = mount({ simple: '', 'target-sort': 'unshift' })
    ;(leftOptions(el)[0] as HTMLElement).click() // a
    ;(leftOptions(el)[0] as HTMLElement).click() // b
    expect(el.getAttribute('value')).toBe('["b","a"]')
  })
})

// ---- target-draggable 目标侧拖拽排序 + 键盘替代 ----
describe('OASTransfer target-draggable', () => {
  function fireDrag(row: Element, type: string, dataTransfer?: unknown, clientY = 10): Event {
    const e = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(e, 'clientY', { value: clientY })
    if (dataTransfer !== undefined) {
      Object.defineProperty(e, 'dataTransfer', { value: dataTransfer })
    }
    row.dispatchEvent(e)
    return e
  }

  const dt = (key = 'a') => ({
    setData: () => {},
    getData: () => key,
    effectAllowed: '',
    dropEffect: '',
  })

  it('右侧行落 draggable；original 模式（顺序由数据源决定）不启用拖拽', () => {
    const el = mount({ value: '["a","b"]', 'target-sort': 'push', 'target-draggable': '' })
    expect(rightOptions(el)[0]!.getAttribute('draggable')).toBe('true')
    const el2 = mount({ value: '["a","b"]', 'target-draggable': '' }) // 默认 original
    expect(rightOptions(el2)[0]!.getAttribute('draggable')).toBe(null)
  })

  it('拖拽 a 到 c 之后：value 重排并派发 oas-change', () => {
    const el = mount({ value: '["a","b","c"]', 'target-sort': 'push', 'target-draggable': '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const rows = () => [...rightOptions(el)]
    fireDrag(rows()[0]!, 'dragstart', dt())
    const over = fireDrag(rows()[2]!, 'dragover', dt(), 10)
    expect(over.defaultPrevented).toBe(true)
    expect(rows()[2]!.classList.contains('drop-after')).toBe(true)
    fireDrag(rows()[2]!, 'drop', dt(), 10)
    expect(detail).toEqual({ value: ['b', 'c', 'a'] })
    expect([...rightOptions(el)].map((r) => r.textContent)).toEqual(['香蕉', '橙子', '苹果'])
  })

  it('拖拽指示类在 dragleave/drop 后清除', () => {
    const el = mount({ value: '["a","b","c"]', 'target-sort': 'push', 'target-draggable': '' })
    const rows = () => [...rightOptions(el)]
    fireDrag(rows()[0]!, 'dragstart', dt())
    fireDrag(rows()[2]!, 'dragover', dt(), 10)
    expect(rows()[2]!.classList.contains('drop-after')).toBe(true)
    fireDrag(rows()[2]!, 'dragleave')
    expect(rows()[2]!.classList.contains('drop-after')).toBe(false)
  })

  it('disabled 时不可拖（无 draggable）', () => {
    const el = mount({
      value: '["a"]',
      'target-sort': 'push',
      'target-draggable': '',
      disabled: '',
    })
    expect(rightOptions(el)[0]!.getAttribute('draggable')).toBe(null)
  })

  it('键盘替代：Alt+↓/↑ 移动选中项（右侧）', () => {
    const el = mount({ value: '["a","b","c"]', 'target-sort': 'push', 'target-draggable': '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const rb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.right')!
    // 选中 a 作为 active 项
    ;(rightOptions(el)[0] as HTMLElement).click()
    rb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
    expect(detail).toEqual({ value: ['b', 'a', 'c'] })
    rb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }))
    expect(el.getAttribute('value')).toBe('["a","b","c"]')
  })

  it('虚拟模式拖拽：data-key 定位不受窗口影响', () => {
    const el = new OASTransfer()
    el.setAttribute('virtual', '')
    el.setAttribute('target-sort', 'push')
    el.setAttribute('target-draggable', '')
    document.body.appendChild(el)
    el.data = Array.from({ length: 100 }, (_, i) => ({ key: `k${i}`, label: `Item ${i}` }))
    const leftRows = () =>
      [...el.shadowRoot!.querySelector('.vlist-left')!.shadowRoot!.querySelectorAll('[part="item"] .option')]
    // 先用键盘穿梭 k0：ArrowDown 选中首项 + Enter
    const vp = el.shadowRoot!.querySelector('.vlist-left')!.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    vp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    vp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('["k0"]')
    // 再选 k1（k0 已移走，左首行是 k1）
    vp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    vp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('["k0","k1"]')
    const vrootR = el.shadowRoot!.querySelector('.vlist-right')!.shadowRoot!
    const rightRows = () => [...vrootR.querySelectorAll('[part="item"] .option')]
    expect(rightRows().length).toBe(2)
    fireDrag(rightRows()[0]!, 'dragstart', dt('k0'))
    fireDrag(rightRows()[1]!, 'dragover', dt('k0'), 10)
    fireDrag(rightRows()[1]!, 'drop', dt('k0'), 10)
    expect(el.getAttribute('value')).toBe('["k1","k0"]')
  })
})

// ---- 键盘补强：ctrl+A 全选 / Space 切换 ----
describe('OASTransfer 键盘（ctrl+A / Space）', () => {
  it('ctrl+A 全选可见可选项，再按全清', () => {
    const el = mount()
    const details: unknown[] = []
    el.addEventListener('oas-select-change', (e: Event) => details.push((e as CustomEvent).detail))
    const lb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.left')!
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    expect(details.at(-1)).toEqual({ side: 'left', selected: ['a', 'b'] })
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('true')
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    expect(details.at(-1)).toEqual({ side: 'left', selected: [] })
  })

  it('Space 切换当前选中项', () => {
    const el = mount()
    const lb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.left')!
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('true')
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('false')
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('true')
  })

  it('one-way 右侧 ctrl+A / Space 无效', () => {
    const el = mount({ 'one-way': '', value: '["a"]' })
    const rb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.right')!
    rb.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    rb.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(el.getAttribute('value')).toBe('["a"]')
    expect(el.shadowRoot!.querySelector('.listbox.right .option[aria-selected="true"]')).toBeNull()
  })

  it('disabled 时 ctrl+A / Space 无效', () => {
    const el = mount({ disabled: '' })
    const lb = el.shadowRoot!.querySelector<HTMLElement>('.listbox.left')!
    lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    expect(leftOptions(el)[0]!.getAttribute('aria-selected')).toBe('false')
  })
})
