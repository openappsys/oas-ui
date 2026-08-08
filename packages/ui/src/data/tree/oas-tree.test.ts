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
