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
    expect(
      el.shadowRoot!.querySelector('.listbox.right .option[aria-selected="true"]'),
    ).toBeNull()
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
