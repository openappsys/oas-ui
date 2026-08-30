import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASPagination } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPagination {
  const el = new OASPagination()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.total) el.setAttribute('total', '100')
  if (!attrs['page-size']) el.setAttribute('page-size', '10')
  document.body.appendChild(el)
  return el
}

function pages(el: OASPagination): string[] {
  return [...el.shadowRoot!.querySelectorAll('[part="page"]')].map((p) => p.textContent ?? '')
}

function jumperInput(el: OASPagination): HTMLInputElement {
  return el.shadowRoot!.querySelector('[part="jumper"] input') as HTMLInputElement
}

describe('OASPagination', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染页码与前后按钮，当前页标记', () => {
    const el = mount({ current: '1' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThanOrEqual(3)
    expect(el.shadowRoot!.querySelector('.ellipsis')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')!.textContent).toBe(
      '1',
    )
  })

  it('下一页切换并派发 oas-change', () => {
    const el = mount({ current: '1' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(detail).toEqual({ page: 2 })
    expect(el.getAttribute('current')).toBe('2')
  })

  it('末页后下一页不可用', () => {
    const el = mount({ current: '10' })
    const next = el.shadowRoot!.querySelector('[part="next"]') as HTMLButtonElement
    expect(next.disabled).toBe(true)
  })

  it('show-total：显示「共 N 条」总数文案', () => {
    const el = mount({ 'show-total': '', total: '150' })
    const total = el.shadowRoot!.querySelector('[part="total"]')
    expect(total).not.toBeNull()
    expect(total!.textContent).toBe('共 150 条')
  })

  it('未设置 show-total 时不渲染总数文案', () => {
    const el = mount({ total: '150' })
    expect(el.shadowRoot!.querySelector('[part="total"]')).toBeNull()
  })

  it('page-sizes：渲染下拉选项并选中当前每页条数', () => {
    const el = mount({ 'page-sizes': '[10,20,50]' })
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.options.length).toBe(3)
    expect([...select.options].map((o) => o.value)).toEqual(['10', '20', '50'])
    expect(select.value).toBe('10')
    expect(select.getAttribute('aria-label')).toBe('每页条数')
  })

  it('page-sizes：当前每页条数不在选项内时自动补入并选中', () => {
    const el = mount({ 'page-sizes': '[10,20,50]', 'page-size': '30' })
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    expect(select.options.length).toBe(4)
    expect(select.value).toBe('30')
  })

  it('page-sizes：切换派发 { page: 1, pageSize } 并回到第 1 页', () => {
    const el = mount({ 'page-sizes': '[10,20,50]', current: '3' })
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    select.value = '50'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(detail).toEqual({ page: 1, pageSize: 50 })
    expect(el.getAttribute('current')).toBe('1')
    expect(el.getAttribute('page-size')).toBe('50')
  })

  it('page-sizes：非法 JSON / 空数组不渲染下拉', () => {
    const el = mount({ 'page-sizes': 'not-json' })
    expect(el.shadowRoot!.querySelector('[part="size"]')).toBeNull()
    const el2 = mount({ 'page-sizes': '[]', total: '100' })
    expect(el2.shadowRoot!.querySelector('[part="size"]')).toBeNull()
  })

  it('show-jumper：渲染「跳至 __ 页」输入框', () => {
    const el = mount({ 'show-jumper': '' })
    const input = jumperInput(el)
    expect(input).not.toBeNull()
    const jumper = el.shadowRoot!.querySelector('[part="jumper"]')
    expect(jumper!.textContent).toContain('跳至')
    expect(jumper!.textContent).toContain('页')
  })

  it('show-jumper：回车跳转并派发 { page, pageSize }', () => {
    const el = mount({ 'show-jumper': '', current: '1' })
    const input = jumperInput(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    input.value = '3'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ page: 3, pageSize: 10 })
    expect(el.getAttribute('current')).toBe('3')
  })

  it('show-jumper：越界输入夹取到 [1, 最大页]', () => {
    const el = mount({ 'show-jumper': '', current: '1' }) // total 100 / pageSize 10 → 10 页
    let details: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
    // 每次回车后组件会重建节点，需重新获取 input
    let input = jumperInput(el)
    input.value = '99'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(details[0]).toEqual({ page: 10, pageSize: 10 })
    input = jumperInput(el)
    input.value = '-5'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(details[1]).toEqual({ page: 1, pageSize: 10 })
    expect(el.getAttribute('current')).toBe('1')
  })

  it('show-jumper：空 / 非法输入不派发', () => {
    const el = mount({ 'show-jumper': '', current: '1' })
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    const input = jumperInput(el)
    input.value = 'abc'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    input.value = '   '
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(fired).toBe(false)
  })

  // ===== 批次 5：disabled 全局禁用 =====

  it('disabled：分页钮全部禁用并带 aria-disabled，下拉与跳转输入禁用', () => {
    const el = mount({
      disabled: '',
      total: '100',
      current: '5',
      'page-sizes': '[10,20]',
      'show-jumper': '',
    })
    const buttons = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')]
    expect(buttons.length).toBeGreaterThan(0)
    for (const b of buttons) {
      expect(b.disabled).toBe(true)
      expect(b.getAttribute('aria-disabled')).toBe('true')
    }
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    expect(select.disabled).toBe(true)
    expect(jumperInput(el).disabled).toBe(true)
  })

  it('disabled：点击翻页不派发事件且 current 不变', () => {
    const el = mount({ disabled: '', current: '1' })
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLButtonElement).click()
    expect(fired).toBe(false)
    expect(el.getAttribute('current')).toBe('1')
  })

  // ===== 批次 6：size 五档（xs/sm/md/lg/xl，默认 md）=====

  it('size：默认 md（data-size 回落 md，基准 control-height-md）', () => {
    const el = mount({ total: '100' })
    expect(el.getAttribute('data-size')).toBe('md')
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toMatch(/--oas-pagination-height: var\(--oas-control-height-md\)/)
    expect(style).toMatch(/:host\(\[data-size='xs'\]\)/)
  })

  it('size：xs/sm/lg/xl 合法值映射到 data-size', () => {
    for (const s of ['xs', 'sm', 'lg', 'xl']) {
      const el = mount({ size: s, total: '100' })
      expect(el.getAttribute('data-size')).toBe(s)
    }
  })

  it('size：非法值回落 md 并 console 告警（对齐 button 做法）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'big' })
    expect(el.getAttribute('data-size')).toBe('md')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[oas-pagination] 非法 size "big"，已回落 md'),
    )
    warn.mockRestore()
  })

  // ===== 批次 7：simple 极简模式 =====

  it('simple：只渲染前后钮与「当前/总页数」文本，无页码与省略号', () => {
    const el = mount({ simple: '', total: '100', current: '3' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(0)
    expect(el.shadowRoot!.querySelector('.ellipsis')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="simple"]')!.textContent).toBe('3 / 10')
    expect(el.shadowRoot!.querySelector('[part="prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="next"]')).not.toBeNull()
  })

  it('simple：与 siblings/省略算法互斥（simple 优先）', () => {
    const el = mount({ simple: '', siblings: '2', total: '500', current: '25' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(0)
    expect(el.shadowRoot!.querySelector('.ellipsis')).toBeNull()
  })

  it('simple：show-jumper 可叠加显示', () => {
    const el = mount({ simple: '', 'show-jumper': '' })
    expect(jumperInput(el)).not.toBeNull()
  })

  it('simple：show-edges 不叠加（极简形态无首末页钮）', () => {
    const el = mount({ simple: '', 'show-edges': '', total: '100', current: '5' })
    expect(el.shadowRoot!.querySelector('[part="first"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="last"]')).toBeNull()
  })

  // ===== 批次 8：show-edges 首/末页钮 =====

  it('show-edges：渲染首末页钮，边界处禁用，aria-label 走 i18n', () => {
    const el = mount({ 'show-edges': '', total: '100', current: '5' })
    const first = el.shadowRoot!.querySelector('[part="first"]') as HTMLButtonElement
    const last = el.shadowRoot!.querySelector('[part="last"]') as HTMLButtonElement
    expect(first).not.toBeNull()
    expect(last).not.toBeNull()
    expect(first.getAttribute('aria-label')).toBe('首页')
    expect(last.getAttribute('aria-label')).toBe('末页')
    expect(first.disabled).toBe(false)
    expect(last.disabled).toBe(false)
    const elFirst = mount({ 'show-edges': '', total: '100', current: '1' })
    expect(
      (elFirst.shadowRoot!.querySelector('[part="first"]') as HTMLButtonElement).disabled,
    ).toBe(true)
    const elLast = mount({ 'show-edges': '', total: '100', current: '10' })
    expect(
      (elLast.shadowRoot!.querySelector('[part="last"]') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('show-edges：点击首/末页跳转并派发 { page }', () => {
    const el = mount({ 'show-edges': '', total: '100', current: '5' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="last"]') as HTMLElement).click()
    expect(detail).toEqual({ page: 10 })
    expect(el.getAttribute('current')).toBe('10')
  })

  // ===== 批次 9：hide-on-single =====

  it('hide-on-single：单页时不渲染组件（host hidden 且无按钮）', () => {
    const el = mount({ 'hide-on-single': '', total: '8', 'page-size': '10' })
    expect(el.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelectorAll('button').length).toBe(0)
  })

  it('hide-on-single：total 增大后超过单页恢复渲染', () => {
    const el = mount({ 'hide-on-single': '', total: '8', 'page-size': '10' })
    expect(el.hasAttribute('hidden')).toBe(true)
    el.setAttribute('total', '50')
    expect(el.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThanOrEqual(3)
  })

  it('未设置 hide-on-single：单页正常渲染', () => {
    const el = mount({ total: '8', 'page-size': '10' })
    expect(el.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelectorAll('button').length).toBeGreaterThan(0)
  })

  // ===== 批次 10：prev-icon / next-icon 具名插槽 =====

  it('prev-icon/next-icon：无插槽内容时默认箭头兜底', () => {
    const el = mount({ total: '100' })
    const prevSlot = el.shadowRoot!.querySelector('[part="prev"] slot') as HTMLSlotElement
    const nextSlot = el.shadowRoot!.querySelector('[part="next"] slot') as HTMLSlotElement
    expect(prevSlot.textContent).toContain('‹')
    expect(nextSlot.textContent).toContain('›')
    expect(prevSlot.assignedNodes().length).toBe(0)
  })

  it('prev-icon/next-icon：插槽内容替换默认箭头', () => {
    const el = mount({ total: '100' })
    const prevIcon = document.createElement('span')
    prevIcon.textContent = '«'
    prevIcon.setAttribute('slot', 'prev-icon')
    const nextIcon = document.createElement('span')
    nextIcon.textContent = '»'
    nextIcon.setAttribute('slot', 'next-icon')
    el.append(prevIcon, nextIcon)
    // 触发重渲：按钮内新建 slot 参与插槽分配
    el.setAttribute('current', '2')
    const prevSlot = el.shadowRoot!.querySelector('[part="prev"] slot') as HTMLSlotElement
    const nextSlot = el.shadowRoot!.querySelector('[part="next"] slot') as HTMLSlotElement
    expect(prevSlot.assignedNodes()).toContain(prevIcon)
    expect(nextSlot.assignedNodes()).toContain(nextIcon)
  })

  // ===== 批次 11：total 具名插槽 =====

  it('total 插槽：show-total 下插槽内容替换内置总数文案', () => {
    const el = mount({ 'show-total': '', total: '150' })
    const custom = document.createElement('span')
    custom.textContent = '自定义 150'
    custom.setAttribute('slot', 'total')
    el.append(custom)
    el.setAttribute('current', '2')
    const totalEl = el.shadowRoot!.querySelector('[part="total"]')!
    expect((totalEl.querySelector('slot') as HTMLSlotElement).assignedNodes()).toContain(custom)
  })

  it('total 插槽：仅有插槽内容（无 show-total）也渲染总条数', () => {
    const el = mount({ total: '150' })
    const custom = document.createElement('span')
    custom.textContent = '自定义'
    custom.setAttribute('slot', 'total')
    el.append(custom)
    el.setAttribute('current', '2')
    expect(el.shadowRoot!.querySelector('[part="total"]')).not.toBeNull()
  })

  // ===== 批次 12：oas-before-change 翻页前拦截 =====

  it('oas-before-change：翻页前派发 { page }，默认放行', () => {
    const el = mount({ current: '1' })
    let before: unknown
    el.addEventListener('oas-before-change', (e: Event) => (before = (e as CustomEvent).detail))
    let changed = 0
    el.addEventListener('oas-change', () => changed++)
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(before).toEqual({ page: 2 })
    expect(el.getAttribute('current')).toBe('2')
    expect(changed).toBe(1)
  })

  it('oas-before-change：preventDefault 取消翻页（current 不变、不派发 change）', () => {
    const el = mount({ current: '1' })
    el.addEventListener('oas-before-change', (e: Event) => e.preventDefault())
    let changed = 0
    el.addEventListener('oas-change', () => changed++)
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(el.getAttribute('current')).toBe('1')
    expect(changed).toBe(0)
  })

  it('oas-before-change：快速跳转同样可被拦截', () => {
    const el = mount({ 'show-jumper': '', current: '1' })
    el.addEventListener('oas-before-change', (e: Event) => e.preventDefault())
    let changed = 0
    el.addEventListener('oas-change', () => changed++)
    const input = jumperInput(el)
    input.value = '3'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('current')).toBe('1')
    expect(changed).toBe(0)
  })

  it('oas-before-change：切换每页条数不拦截（不派发 before-change）', () => {
    const el = mount({ 'page-sizes': '[10,20]', current: '3' })
    let before = 0
    el.addEventListener('oas-before-change', () => before++)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    select.value = '20'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(before).toBe(0)
    expect(detail).toEqual({ page: 1, pageSize: 20 })
  })

  // ===== 批次 13：受控模式 =====

  it('受控：外部设置 current 属性驱动视图跳页', () => {
    const el = mount({ current: '1' })
    el.setAttribute('current', '5')
    const active = el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')
    expect(active?.textContent).toBe('5')
  })

  it('受控：外部设置 current 越界自动夹取到 [1, 最大页]', () => {
    const el = mount({ current: '1' })
    el.setAttribute('current', '99')
    const active = el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')
    expect(active?.textContent).toBe('10')
  })

  it('当前页高亮：aria-current 按钮命中 .btn 高亮规则（背景主色 + on-primary 文字色，回归：选择器曾误写 .page 致高亮失效）', () => {
    const el = mount({ total: '100' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('.btn[aria-current=\'true\']')
    expect(css).not.toContain('.page[aria-current')
    const active = el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')!
    expect(active.classList.contains('btn')).toBe(true)
  })
})
