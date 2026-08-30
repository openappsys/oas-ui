import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
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
    vi.unstubAllGlobals()
  })

  it('渲染页码与前后按钮，当前页标记', () => {
    const el = mount({ current: '1' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThanOrEqual(3)
    expect(el.shadowRoot!.querySelector('[part="ellipsis"]')).not.toBeNull()
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
    expect(el.shadowRoot!.querySelector('[part="ellipsis"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="simple"]')!.textContent).toBe('3 / 10')
    expect(el.shadowRoot!.querySelector('[part="prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="next"]')).not.toBeNull()
  })

  it('simple：与 siblings/省略算法互斥（simple 优先）', () => {
    const el = mount({ simple: '', siblings: '2', total: '500', current: '25' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(0)
    expect(el.shadowRoot!.querySelector('[part="ellipsis"]')).toBeNull()
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

  // ===== 批次 14：pager-count 页码按钮上限 =====

  it('pager-count：默认不设时行为不变（siblings 候选集未超上限，100 页仍 5 个页码钮）', () => {
    const el = mount({ total: '1000', current: '45' })
    expect(pages(el)).toEqual(['1', '44', '45', '46', '100'])
    expect(el.shadowRoot!.querySelectorAll('[part="ellipsis"]').length).toBe(2)
  })

  it('pager-count：超过上限按当前页居中收缩窗口，省略号两端至少留 2 页', () => {
    // siblings="2" 候选集 7 个 > 5，截断到 5 个
    const el = mount({ 'pager-count': '5', siblings: '2', total: '1000', current: '45' })
    expect(pages(el)).toEqual(['1', '2', '45', '99', '100'])
    expect(el.shadowRoot!.querySelectorAll('[part="ellipsis"]').length).toBe(2)
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(5)
  })

  it('pager-count：截断优先于 siblings（siblings="2" + pager-count="5" 仍只显示 5 个）', () => {
    const el = mount({ 'pager-count': '5', siblings: '2', total: '1000', current: '45' })
    expect(pages(el)).toEqual(['1', '2', '45', '99', '100'])
    // 对照：不设 pager-count 时 siblings="2" 显示 7 个
    const el2 = mount({ siblings: '2', total: '1000', current: '45' })
    expect(pages(el2)).toEqual(['1', '43', '44', '45', '46', '47', '100'])
  })

  it('pager-count：渲染页码数不超过上限（siblings="4" 候选 11 个，pager-count="9" 截断到 9 个）', () => {
    const el = mount({ 'pager-count': '9', siblings: '4', total: '1000', current: '45' })
    expect(pages(el)).toEqual(['1', '2', '43', '44', '45', '46', '47', '99', '100'])
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(9)
  })

  it('pager-count：低于最小值 5 回落 5 并 console 告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // siblings="2" 候选集 7 个，回落后的 5 仍触发截断
    const el = mount({ 'pager-count': '3', siblings: '2', total: '1000', current: '45' })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[oas-pagination] 非法 pager-count "3"'),
    )
    expect(pages(el)).toEqual(['1', '2', '45', '99', '100'])
    warn.mockRestore()
  })

  it('pager-count：非法值告警同值去重、不同值各告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount({ 'pager-count': '4', total: '1000', current: '45' })
    mount({ 'pager-count': '4', total: '1000', current: '45' })
    mount({ 'pager-count': '1', total: '1000', current: '45' })
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('pager-count：pageCount ≤ pager-count 时不触发截断（siblings 算法原样渲染，可全量铺开）', () => {
    // 10 页 ≤ 20：候选集即全部页码，无省略
    const el = mount({ 'pager-count': '20', siblings: '4', total: '100', current: '5' })
    expect(pages(el)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
    expect(el.shadowRoot!.querySelector('[part="ellipsis"]')).toBeNull()
    // 10 页 ≤ 20：正常省略算法不被 cap 改变
    const el2 = mount({ 'pager-count': '20', total: '100', current: '5' })
    expect(pages(el2)).toEqual(['1', '4', '5', '6', '10'])
  })

  it('pager-count：截断时当前页贴近左/右边缘仍保持首尾可达', () => {
    const elLeft = mount({ 'pager-count': '5', siblings: '20', total: '1000', current: '3' })
    expect(pages(elLeft)).toEqual(['1', '2', '3', '99', '100'])
    const elRight = mount({ 'pager-count': '5', siblings: '20', total: '1000', current: '98' })
    expect(pages(elRight)).toEqual(['1', '2', '98', '99', '100'])
    const elFirst = mount({ 'pager-count': '5', siblings: '20', total: '1000', current: '1' })
    expect(pages(elFirst)).toEqual(['1', '2', '99', '100'])
    expect(elFirst.shadowRoot!.querySelectorAll('[part="page"]').length).toBeLessThanOrEqual(5)
  })

  it('pager-count：show-edges 组合下仅限制页码钮，首/末/前/后钮不受影响', () => {
    const el = mount({ 'show-edges': '', 'pager-count': '5', siblings: '2', total: '1000', current: '45' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(5)
    expect(el.shadowRoot!.querySelector('[part="first"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="last"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="next"]')).not.toBeNull()
  })

  it('pager-count：simple 极简模式无页码序列，不受影响', () => {
    const el = mount({ simple: '', 'pager-count': '5', total: '1000', current: '45' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(0)
    expect(el.shadowRoot!.querySelector('[part="ellipsis"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="simple"]')!.textContent).toBe('45 / 100')
  })

  it('pager-count：hide-on-single 组合下单页仍隐藏', () => {
    const el = mount({ 'hide-on-single': '', 'pager-count': '5', total: '8' })
    expect(el.hasAttribute('hidden')).toBe(true)
  })

  // ===== 批次 15：href-template 链接模式 =====

  it('href-template：页码/前后/首末钮渲染为 <a>，href 模板替换 {page}', () => {
    const el = mount({
      'href-template': '/products?page={page}',
      'show-edges': '',
      total: '100',
      current: '5',
    })
    const href = (part: string): string | null =>
      el.shadowRoot!.querySelector(`[part="${part}"]`)?.getAttribute('href') ?? null
    expect(href('first')).toBe('/products?page=1')
    expect(href('prev')).toBe('/products?page=4')
    expect(href('next')).toBe('/products?page=6')
    expect(href('last')).toBe('/products?page=10')
    // 当前页（5）也在页码链中
    expect(el.shadowRoot!.querySelector('[part="page"][aria-current="page"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('a').length).toBeGreaterThan(0)
    expect(el.shadowRoot!.querySelector('button')).toBeNull()
  })

  it('href-template：当前页 a 带 aria-current="page"', () => {
    const el = mount({ 'href-template': '/p?page={page}', total: '100', current: '5' })
    const active = el.shadowRoot!.querySelector('a[aria-current="page"]')
    expect(active).not.toBeNull()
    expect(active!.textContent).toBe('5')
  })

  it('href-template：disabled 时降级 span（不可点、无 href、aria-disabled）', () => {
    const el = mount({
      'href-template': '/p?page={page}',
      disabled: '',
      'show-edges': '',
      total: '100',
      current: '5',
    })
    expect(el.shadowRoot!.querySelector('a')).toBeNull()
    const spans = el.shadowRoot!.querySelectorAll('.group span.btn')
    expect(spans.length).toBeGreaterThan(0)
    for (const s of [...spans]) {
      expect(s.hasAttribute('href')).toBe(false)
      expect(s.getAttribute('aria-disabled')).toBe('true')
    }
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(fired).toBe(false)
    expect(el.getAttribute('current')).toBe('5')
  })

  it('href-template：边界禁用（首页 prev）降级 span，其余仍为链接', () => {
    const el = mount({ 'href-template': '/p?page={page}', total: '100', current: '1' })
    const prev = el.shadowRoot!.querySelector('[part="prev"]')!
    expect(prev.tagName).toBe('SPAN')
    expect(prev.getAttribute('aria-disabled')).toBe('true')
    expect(el.shadowRoot!.querySelector('[part="next"]')!.tagName).toBe('A')
  })

  it('href-template：点击链接派发 oas-change 且 current 更新（语义不变）', () => {
    const el = mount({ 'href-template': '/p?page={page}', total: '100', current: '5' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(detail).toEqual({ page: 6 })
    expect(el.getAttribute('current')).toBe('6')
  })

  it('href-template：修饰键点击（ctrl）不触发翻页，交给浏览器原生处理', () => {
    const el = mount({ 'href-template': '/p?page={page}', total: '100', current: '5' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    const next = el.shadowRoot!.querySelector('[part="next"]') as HTMLAnchorElement
    next.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))
    expect(fired).toBe(0)
    expect(el.getAttribute('current')).toBe('5')
  })

  it('href-template：target 属性透传 a', () => {
    const el = mount({
      'href-template': '/p?page={page}',
      target: '_blank',
      'show-edges': '',
      total: '100',
      current: '3',
    })
    const anchors = el.shadowRoot!.querySelectorAll('a')
    expect(anchors.length).toBeGreaterThan(0)
    for (const a of [...anchors]) expect(a.getAttribute('target')).toBe('_blank')
  })

  it('href-template：before-change 取消时阻止原生导航（preventDefault）且 current 不变', () => {
    const el = mount({ 'href-template': '/p?page={page}', total: '100', current: '1' })
    el.addEventListener('oas-before-change', (e: Event) => e.preventDefault())
    let changed = 0
    el.addEventListener('oas-change', () => changed++)
    const next = el.shadowRoot!.querySelector('[part="next"]') as HTMLAnchorElement
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
    next.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    expect(changed).toBe(0)
    expect(el.getAttribute('current')).toBe('1')
  })

  it('href-template：simple 模式同样生效（前后钮为链接）', () => {
    const el = mount({ 'href-template': '/p?page={page}', simple: '', total: '100', current: '3' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(0)
    expect(el.shadowRoot!.querySelector('[part="simple"]')!.textContent).toBe('3 / 10')
    expect(
      (el.shadowRoot!.querySelector('[part="prev"]') as HTMLAnchorElement).getAttribute('href'),
    ).toBe('/p?page=2')
    expect(
      (el.shadowRoot!.querySelector('[part="next"]') as HTMLAnchorElement).getAttribute('href'),
    ).toBe('/p?page=4')
    expect(el.shadowRoot!.querySelector('button')).toBeNull()
  })

  // ===== 批次 16：responsive 窄屏自动切 simple =====

  it('responsive：窄于 640 自动按 simple 渲染，恢复宽度后还原（RO 回调驱动）', () => {
    let roCb: (() => void) | null = null
    class FakeRO {
      cb: () => void
      constructor(cb: () => void) {
        this.cb = cb
        roCb = cb
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    const el = mount({ responsive: '', total: '100', current: '5' })
    // clientWidth=0（未布局/SSR）不误判为窄
    expect(el.shadowRoot!.querySelector('[part="simple"]')).toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThan(0)
    Object.defineProperty(el, 'clientWidth', { value: 480, configurable: true })
    roCb!()
    expect(el.shadowRoot!.querySelector('[part="simple"]')!.textContent).toBe('5 / 10')
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(0)
    Object.defineProperty(el, 'clientWidth', { value: 900, configurable: true })
    roCb!()
    expect(el.shadowRoot!.querySelector('[part="simple"]')).toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThan(0)
  })

  it('responsive：与 hide-on-single 不冲突（单页仍隐藏）', () => {
    let roCb: (() => void) | null = null
    class FakeRO {
      cb: () => void
      constructor(cb: () => void) {
        this.cb = cb
        roCb = cb
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    const el = mount({ responsive: '', 'hide-on-single': '', total: '8', 'page-size': '10' })
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
    roCb!()
    expect(el.hasAttribute('hidden')).toBe(true)
  })

  it('responsive：断开连接清理 ResizeObserver', () => {
    class FakeRO {
      constructor(_cb: () => void) {}
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
    const el = mount({ responsive: '', total: '100' })
    const spy = vi.spyOn(FakeRO.prototype, 'disconnect')
    el.remove()
    expect(spy).toHaveBeenCalled()
  })

  // ===== 批次 17：省略号可点跳页 =====

  it('省略号：渲染为 button（part=ellipsis，class btn）', () => {
    const el = mount({ total: '1000', current: '5' })
    const ells = el.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    expect(ells.length).toBe(2)
    for (const e of [...ells]) {
      expect(e.tagName).toBe('BUTTON')
      expect(e.classList.contains('btn')).toBe(true)
    }
  })

  it('省略号：点击向该侧跳 siblings+1 页（左侧向后、右侧向前）', () => {
    const el = mount({ total: '1000', current: '5' }) // siblings=1：页码 [1,4,5,6,100]
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const ells = el.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    ;(ells[0] as HTMLElement).click() // 左省略号（隐藏 2..3）→ 5-2=3
    expect(detail).toEqual({ page: 3 })
    expect(el.getAttribute('current')).toBe('3')

    const el2 = mount({ total: '1000', current: '5' })
    let detail2: unknown
    el2.addEventListener('oas-change', (e: Event) => (detail2 = (e as CustomEvent).detail))
    const ells2 = el2.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    ;(ells2[1] as HTMLElement).click() // 右省略号（隐藏 7..99）→ 5+2=7
    expect(detail2).toEqual({ page: 7 })
    expect(el2.getAttribute('current')).toBe('7')
  })

  it('省略号：跳页目标始终夹取在 [1, pageCount] 内', () => {
    const el = mount({ total: '1000', current: '2' }) // 页码 [1,2,3,100]，右省略号 → 2+2=4
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const ells = el.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    expect(ells.length).toBe(1)
    ;(ells[0] as HTMLElement).click()
    expect(detail).toEqual({ page: 4 })

    const elLast = mount({ total: '1000', current: '100' }) // 页码 [1,98,99,100]，左省略号 → 100-2=98
    let detailLast: unknown
    elLast.addEventListener('oas-change', (e: Event) => (detailLast = (e as CustomEvent).detail))
    const ellsLast = elLast.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    expect(ellsLast.length).toBe(1)
    ;(ellsLast[0] as HTMLElement).click()
    expect(detailLast).toEqual({ page: 98 })
  })

  it('省略号：before-change 拦截生效（current 不变、不派发 change）', () => {
    const el = mount({ total: '1000', current: '5' })
    el.addEventListener('oas-before-change', (e: Event) => e.preventDefault())
    let changed = 0
    el.addEventListener('oas-change', () => changed++)
    const ells = el.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    ;(ells[1] as HTMLElement).click()
    expect(el.getAttribute('current')).toBe('5')
    expect(changed).toBe(0)
  })

  it('省略号：aria-label 走 i18n（zh 向前跳页/向后跳页）', () => {
    const el = mount({ total: '1000', current: '5' })
    const ells = el.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    expect((ells[0] as HTMLElement).getAttribute('aria-label')).toBe('向后跳页')
    expect((ells[1] as HTMLElement).getAttribute('aria-label')).toBe('向前跳页')
  })

  it('省略号：aria-label 走 i18n（en Jump forward/backward，setLocale 切换生效）', () => {
    setLocale(en)
    const el = mount({ total: '1000', current: '5' })
    const ells = el.shadowRoot!.querySelectorAll('[part="ellipsis"]')
    expect((ells[0] as HTMLElement).getAttribute('aria-label')).toBe('Jump backward')
    expect((ells[1] as HTMLElement).getAttribute('aria-label')).toBe('Jump forward')
    setLocale('zh-CN')
  })

  // ===== 批次 18：page-item 插槽模板（占位符克隆） =====

  it('page-item：克隆插槽内容并按页替换 {page} 文本', () => {
    const el = mount({ total: '100', current: '5' })
    const tpl = document.createElement('span')
    tpl.setAttribute('slot', 'page-item')
    tpl.textContent = '第 {page} 页'
    el.append(tpl)
    el.setAttribute('current', '5')
    const pageBtns = [...el.shadowRoot!.querySelectorAll('[part="page"]')]
    expect(pageBtns.length).toBeGreaterThan(0)
    const texts = pageBtns.map((b) => b.textContent!.replace(/^第 (\d+) 页$/, '$1'))
    expect(texts).toEqual(['1', '4', '5', '6', '10'])
    // 内容来自克隆：与 light DOM 模板不是同一节点，模板占位符原样保留
    expect(pageBtns[0]!.querySelector('span')).not.toBe(tpl)
    expect(tpl.textContent).toBe('第 {page} 页')
    for (const b of pageBtns) expect(b.textContent).not.toContain('{page}')
  })

  it('page-item：克隆剥离 hidden/slot 属性（模板本体 hidden 不带到按钮内）', () => {
    const el = mount({ total: '100', current: '5' })
    const tpl = document.createElement('span')
    tpl.setAttribute('slot', 'page-item')
    tpl.setAttribute('hidden', '')
    tpl.textContent = '第 {page} 页'
    el.append(tpl)
    el.setAttribute('current', '5')
    const pageBtns = [...el.shadowRoot!.querySelectorAll('[part="page"]')]
    expect(pageBtns.length).toBeGreaterThan(0)
    for (const b of pageBtns) {
      const clone = b.querySelector('span')
      expect(clone).not.toBeNull()
      expect(clone!.hasAttribute('hidden')).toBe(false)
      expect(clone!.hasAttribute('slot')).toBe(false)
    }
    expect(tpl.hasAttribute('hidden')).toBe(true) // 模板本体仍隐藏
  })

  it('page-item：未提供插槽时按钮显示纯页码数字（现状回退）', () => {
    const el = mount({ total: '100', current: '5' })
    expect(pages(el)).toEqual(['1', '4', '5', '6', '10'])
    expect(el.querySelector('[slot="page-item"]')).toBeNull()
  })

  it('page-item：点击行为不变（翻页派发 oas-change）', () => {
    const el = mount({ total: '100', current: '1' })
    const tpl = document.createElement('span')
    tpl.setAttribute('slot', 'page-item')
    tpl.textContent = 'P{page}'
    el.append(tpl)
    el.setAttribute('current', '1')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(detail).toEqual({ page: 2 })
    expect(el.getAttribute('current')).toBe('2')
  })

  it('page-item：占位符替换仅走 textContent（属性中的 {page} 不被替换，防注入）', () => {
    const el = mount({ total: '100', current: '5' })
    const tpl = document.createElement('span')
    tpl.setAttribute('slot', 'page-item')
    const inner = document.createElement('b')
    inner.textContent = '第 {page} 页'
    inner.setAttribute('data-page', '{page}')
    tpl.append(inner)
    el.append(tpl)
    el.setAttribute('current', '5')
    const pageBtns = [...el.shadowRoot!.querySelectorAll('[part="page"]')]
    expect(pageBtns.length).toBeGreaterThan(0)
    for (const b of pageBtns) {
      const cloneInner = b.querySelector('b')
      expect(cloneInner!.textContent).toMatch(/^第 \d+ 页$/) // 文本节点被替换
      expect(cloneInner!.getAttribute('data-page')).toBe('{page}') // 属性保持原样
    }
  })

  // ===== 批次 19：show-more 总数未知形态 =====

  it('show-more：total 未知（≤0）时渲染「上一页 / 更多 / 下一页」三钮，无页码序列与总数', () => {
    const el = mount({ 'show-more': '', total: '0' })
    expect(el.shadowRoot!.querySelector('[part="prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="more"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="next"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBe(0)
    expect(el.shadowRoot!.querySelector('[part="ellipsis"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="total"]')).toBeNull()
  })

  it('show-more：更多钮为不可点状态指示（disabled + aria-disabled，part=more，文案走 i18n「更多」）', () => {
    const el = mount({ 'show-more': '', total: '0' })
    const more = el.shadowRoot!.querySelector('[part="more"]') as HTMLButtonElement
    expect(more).not.toBeNull()
    expect(more.disabled).toBe(true)
    expect(more.getAttribute('aria-disabled')).toBe('true')
    expect(more.textContent).toBe('更多')
    expect(more.classList.contains('btn')).toBe(true)
  })

  it('show-more：prev/next 点击派发 oas-change{page} 并累加 current', () => {
    const el = mount({ 'show-more': '', total: '0', current: '3' })
    let details: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(details[0]).toEqual({ page: 4 })
    expect(el.getAttribute('current')).toBe('4')
    ;(el.shadowRoot!.querySelector('[part="prev"]') as HTMLElement).click()
    expect(details[1]).toEqual({ page: 3 })
    expect(el.getAttribute('current')).toBe('3')
  })

  it('show-more：current=1 时 prev 禁用，current>1 可点；next 始终可点', () => {
    const elFirst = mount({ 'show-more': '', total: '0', current: '1' })
    expect((elFirst.shadowRoot!.querySelector('[part="prev"]') as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect((elFirst.shadowRoot!.querySelector('[part="next"]') as HTMLButtonElement).disabled).toBe(
      false,
    )
    const elMid = mount({ 'show-more': '', total: '0', current: '2' })
    expect((elMid.shadowRoot!.querySelector('[part="prev"]') as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('show-more：current 无上界夹取（外部设大值保持为事实状态，不受总页数约束）', () => {
    const el = mount({ 'show-more': '', total: '0', current: '99' })
    expect(el.getAttribute('current')).toBe('99')
    expect(el.shadowRoot!.querySelector('[part="next"]')).not.toBeNull()
  })

  it('show-more：total>0 时无效（正常页码渲染，无更多钮）', () => {
    const el = mount({ 'show-more': '', total: '100', current: '5' })
    expect(el.shadowRoot!.querySelector('[part="more"]')).toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThan(0)
    const active = el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')
    expect(active?.textContent).toBe('5')
  })

  it('show-more：show-jumper 与 page-sizes 隐藏（无总页数不可跳、不可切条数）', () => {
    const el = mount({
      'show-more': '',
      total: '0',
      'show-jumper': '',
      'page-sizes': '[10,20,50]',
    })
    expect(el.shadowRoot!.querySelector('[part="jumper"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="size"]')).toBeNull()
  })

  it('show-more：hide-on-single 不适用（total 未知不算单页，组件不隐藏）', () => {
    const el = mount({ 'show-more': '', 'hide-on-single': '', total: '0' })
    expect(el.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="more"]')).not.toBeNull()
  })

  it('show-more：total 未设置（视为未知）时同样生效', () => {
    const el = new OASPagination()
    el.setAttribute('show-more', '')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="more"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="next"]')).not.toBeNull()
  })

  it('show-more：更多钮文案走 i18n（en More）', () => {
    setLocale(en)
    const el = mount({ 'show-more': '', total: '0' })
    expect((el.shadowRoot!.querySelector('[part="more"]') as HTMLButtonElement).textContent).toBe(
      'More',
    )
    setLocale('zh-CN')
  })

  // ===== 批次 20：total-boundary 条数切换器自动显隐阈值 =====

  it('total-boundary：total ≤ 阈值时隐藏条数切换器（有 page-sizes 也不渲染）', () => {
    const el = mount({ 'page-sizes': '[10,20,50]', 'total-boundary': '50', total: '30' })
    expect(el.shadowRoot!.querySelector('[part="size"]')).toBeNull()
  })

  it('total-boundary：total > 阈值时渲染条数切换器', () => {
    const el = mount({ 'page-sizes': '[10,20,50]', 'total-boundary': '50', total: '100' })
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.options.length).toBe(3)
  })

  it('total-boundary：未设置时维持现状（有 page-sizes 即显示，零回归）', () => {
    const el = mount({ 'page-sizes': '[10,20,50]', total: '30' })
    expect(el.shadowRoot!.querySelector('[part="size"]')).not.toBeNull()
  })

  it('total-boundary：切换器显隐切换时 current 保持夹取正确', () => {
    const el = mount({ 'page-sizes': '[10,20]', 'total-boundary': '50', total: '30', current: '9' })
    // total=30 ≤ 50：切换器隐藏；pageCount=3，current 夹取到 3
    expect(el.shadowRoot!.querySelector('[part="size"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')!.textContent).toBe(
      '3',
    )
    // total 增大到 100 > 50：切换器显示，current 属性 9 在 10 页内合法 → 视图第 9 页
    el.setAttribute('total', '100')
    expect(el.shadowRoot!.querySelector('[part="size"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')!.textContent).toBe(
      '9',
    )
  })

  it('total-boundary：非法值（非数字）忽略，有 page-sizes 即显示', () => {
    const el = mount({ 'page-sizes': '[10,20]', 'total-boundary': 'abc', total: '10' })
    expect(el.shadowRoot!.querySelector('[part="size"]')).not.toBeNull()
  })

  it('total-boundary：空字符串属性（total-boundary=""）按 0 处理（total>0 才显示）', () => {
    const el = mount({ 'page-sizes': '[10,20]', 'total-boundary': '', total: '0' })
    expect(el.shadowRoot!.querySelector('[part="size"]')).toBeNull()
    const el2 = mount({ 'page-sizes': '[10,20]', 'total-boundary': '', total: '10' })
    expect(el2.shadowRoot!.querySelector('[part="size"]')).not.toBeNull()
  })
})
