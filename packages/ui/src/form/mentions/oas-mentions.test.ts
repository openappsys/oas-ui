import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASMentions } from './index.js'

const OPTIONS = JSON.stringify([
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Banana', value: 'banana' },
])

function mount(attrs: Record<string, string> = {}): OASMentions {
  const el = new OASMentions()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function ta(el: OASMentions): HTMLTextAreaElement {
  return el.shadowRoot!.querySelector('textarea')!
}

/** 模拟输入：设置 value + 光标到末尾 + 派发 input */
function type(el: OASMentions, value: string): HTMLTextAreaElement {
  const t = ta(el)
  t.value = value
  t.selectionStart = t.selectionEnd = value.length
  t.dispatchEvent(new Event('input'))
  return t
}

function key(t: HTMLTextAreaElement, key: string): void {
  t.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

function keyup(t: HTMLTextAreaElement, key: string): void {
  t.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
}

function panel(el: OASMentions): HTMLElement {
  return el.shadowRoot!.querySelector('[part="panel"]')!
}

function openState(el: OASMentions): boolean {
  return panel(el).classList.contains('open')
}

function rows(el: OASMentions): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('.option'))
}

/** 把光标放到指定下标（配合 keyup/mouseup 触发重扫） */
function placeCaret(t: HTMLTextAreaElement, pos: number): void {
  t.selectionStart = t.selectionEnd = pos
}

describe('OASMentions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 textarea，value 受控同步', () => {
    const el = mount({ value: '@Alice ', options: OPTIONS })
    expect(ta(el).tagName).toBe('TEXTAREA')
    expect(ta(el).value).toBe('@Alice ')
  })

  it('输入 prefix（@）后弹出建议浮层，列出全部选项', () => {
    const el = mount({ options: OPTIONS })
    type(el, '你好 @')
    expect(openState(el)).toBe(true)
    expect(rows(el).length).toBe(3)
    expect(ta(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('关键词过滤：prefix 后输入关键字只显示匹配项', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@ap')
    expect(rows(el).length).toBe(2)
    expect(rows(el).map((r) => r.textContent)).toEqual(['Apple', 'Apricot'])
  })

  it('无匹配显示空态', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@zzz')
    const empty = el.shadowRoot!.querySelector('.empty')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toBe('无匹配提及')
  })

  it('无 prefix 触发时浮层不弹出', () => {
    const el = mount({ options: OPTIONS })
    type(el, '普通文本')
    expect(openState(el)).toBe(false)
  })

  it('自定义 trigger 属性生效', () => {
    const el = mount({ options: OPTIONS, trigger: '#' })
    type(el, '任务 #ba')
    expect(rows(el).length).toBe(1)
    expect(rows(el)[0]!.textContent).toBe('Banana')
  })

  it('↑↓ 选择 + Enter 插入选中项（并入文本），oas-select 带完整 option 与 prefix', () => {
    const el = mount({ options: OPTIONS })
    const t = type(el, '@a')
    const selects: unknown[] = []
    const changes: unknown[] = []
    el.addEventListener('oas-select', (e: Event) => selects.push((e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))
    key(t, 'ArrowDown')
    key(t, 'Enter')
    expect(t.value).toBe('@Apricot ')
    expect(selects).toEqual([
      {
        value: 'apricot',
        label: 'Apricot',
        option: { label: 'Apricot', value: 'apricot' },
        prefix: '@',
      },
    ])
    expect(changes).toEqual([{ value: '@Apricot ' }])
    expect(openState(el)).toBe(false)
  })

  it('Enter 插入时替换 prefix+关键词片段，并聚焦回 textarea', () => {
    const el = mount({ options: OPTIONS })
    const t = type(el, '你好 @ap')
    key(t, 'Enter')
    expect(t.value).toBe('你好 @Apple ')
    expect(el.shadowRoot!.activeElement).toBe(t)
  })

  it('Esc 关闭浮层', () => {
    const el = mount({ options: OPTIONS })
    const t = type(el, '@a')
    key(t, 'Escape')
    expect(openState(el)).toBe(false)
    expect(ta(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('外部点击关闭浮层（composedPath 检测）', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@a')
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(openState(el)).toBe(false)
  })

  it('点击选项插入提及', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@ba')
    const row = el.shadowRoot!.querySelector('.option') as HTMLElement
    row.click()
    expect(ta(el).value).toBe('@Banana ')
  })

  it('断开连接后无孤儿监听（外部点击不再抛错/操作）', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@a')
    el.remove()
    expect(() => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow()
  })

  it('外部改 options 属性后过滤刷新（不覆盖正在输入的草稿）', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@l')
    expect(rows(el).map((r) => r.textContent)).toEqual(['Apple'])
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta' },
      ]),
    )
    expect(rows(el).map((r) => r.textContent)).toEqual(['Alpha'])
    // 草稿保护：外部 options/loading 等无关属性变化不清掉用户正在输入的内容
    expect(ta(el).value).toBe('@l')
  })

  it('disabled 透传到 textarea', () => {
    const el = mount({ options: OPTIONS, disabled: '' })
    expect(ta(el).disabled).toBe(true)
  })

  // ---- prefix 数组多触发符 ----

  it('prefix 数组（@/# 双触发符）：各自触发并分流过滤', () => {
    const el = mount({
      prefix: '["@","#"]',
      options: JSON.stringify([
        { label: '张三', value: 'zhangsan' },
        { label: '李四', value: 'lisi' },
        { label: '需求评审', value: 'req-review' },
        { label: '编码实现', value: 'impl' },
      ]),
    })
    type(el, '任务 #需求')
    expect(rows(el).map((r) => r.textContent)).toEqual(['需求评审'])
    type(el, '任务 #需求 @张')
    expect(rows(el).map((r) => r.textContent)).toEqual(['张三'])
  })

  it('trigger property 通道：宿主传数组时 JSON 编码入 attribute', () => {
    const el = mount({ options: OPTIONS })
    el.trigger = ['@', '#']
    expect(el.getAttribute('trigger')).toBe('["@","#"]')
    type(el, '#ba')
    expect(rows(el)[0]!.textContent).toBe('Banana')
  })

  // ---- oas-search（异步建议根因事件） ----

  it('oas-search 派发 detail { query, prefix }：触发/关键词变化才派发', () => {
    const el = mount({ options: OPTIONS })
    const searches: unknown[] = []
    el.addEventListener('oas-search', (e: Event) => searches.push((e as CustomEvent).detail))
    type(el, '@ap')
    // 光标同段重扫（无变化）不重复派发
    placeCaret(ta(el), 3)
    ta(el).dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(searches).toEqual([{ query: 'ap', prefix: '@' }])
    // 关键词变化补发
    type(el, '@app')
    expect(searches).toEqual([
      { query: 'ap', prefix: '@' },
      { query: 'app', prefix: '@' },
    ])
  })

  it('oas-search 携带命中 prefix：@/# 各配独立数据源分流', () => {
    const el = mount({ trigger: '["@","#"]', options: OPTIONS })
    const prefixes: string[] = []
    const queries: string[] = []
    el.addEventListener('oas-search', (e: Event) => {
      const d = (e as CustomEvent).detail
      prefixes.push(d.prefix)
      queries.push(d.query)
    })
    type(el, '任务 #ba')
    type(el, '任务 #ba @app')
    expect(prefixes).toEqual(['#', '@'])
    expect(queries).toEqual(['ba', 'app'])
  })

  // ---- loading 远端加载态 ----

  it('loading 置位时浮层显示加载占位，清掉后回到建议列表', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@')
    el.setAttribute('loading', '')
    expect(rows(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toBe('加载中…')
    el.removeAttribute('loading')
    expect(rows(el).length).toBe(3)
  })

  // ---- 自定义选项渲染 ----

  it('template[slot="option"] 克隆渲染 + data-option-label 绑定', () => {
    const el = mount({ options: OPTIONS })
    el.innerHTML = '<template slot="option"><span class="prefix">🍎</span><span data-option-label></span></template>'
    type(el, '@a')
    const first = rows(el)[0]!
    expect(first.querySelector('[data-option-label]')!.textContent).toBe('Apple')
    expect(first.textContent).toContain('🍎')
  })

  it('oas-option-render 派发 { index, option, element } 供宿主富化（头像等）', () => {
    const el = mount({ options: OPTIONS })
    const renders: unknown[] = []
    el.addEventListener('oas-option-render', (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d.option.value === 'apple') d.element.textContent = `👤 ${d.option.label}`
      renders.push({ index: d.index, value: d.option.value })
    })
    type(el, '@a') // Apple/Apricot/Banana 三个 label 都含 'a'
    const appleRow = rows(el).find((r) => r.textContent === '👤 Apple')
    expect(appleRow).toBeDefined()
    expect(renders.length).toBe(3)
  })

  // ---- disabled 选项 ----

  it('disabled 选项：渲染但不可选（aria-disabled），点击忽略', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'Apple', value: 'apple' },
        { label: '离职成员', value: 'gone', disabled: true },
        { label: 'Apricot', value: 'apricot' },
      ]),
    })
    type(el, '@')
    expect(rows(el).length).toBe(3)
    expect(rows(el)[1]!.getAttribute('aria-disabled')).toBe('true')
    rows(el)[1]!.click()
    expect(ta(el).value).toBe('@') // 未插入
  })

  it('↑↓ 键盘跳过 disabled 项（循环找最近可用）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'Apple', value: 'apple' },
        { label: 'Apricot', value: 'apricot', disabled: true },
        { label: 'Banana', value: 'banana' },
      ]),
    })
    const t = type(el, '@a') // Apple(0) Apricot(1 disabled) Banana(2)
    key(t, 'ArrowDown') // 跳过 Apricot 到 Banana
    key(t, 'Enter')
    expect(t.value).toBe('@Banana ')
  })

  it('Home/End 跳首尾可用项', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'Apple', value: 'apple' },
        { label: 'Apricot', value: 'apricot', disabled: true },
        { label: 'Banana', value: 'banana' },
      ]),
    })
    const t = type(el, '@')
    key(t, 'End')
    key(t, 'Enter')
    expect(t.value).toBe('@Banana ')
    const t2 = type(el, '@')
    key(t2, 'Home')
    key(t2, 'Enter')
    expect(t2.value).toBe('@Apple ')
  })

  it('全部项 disabled 时 Enter 关浮层不误插', () => {
    const el = mount({
      options: JSON.stringify([{ label: 'Apple', value: 'apple', disabled: true }]),
    })
    const t = type(el, '@a')
    key(t, 'Enter')
    expect(t.value).toBe('@a')
    expect(openState(el)).toBe(false)
  })

  // ---- status / size / variant / readonly / clearable ----

  it('status 校验态镜像 data-status；error 联动 aria-invalid（可被表单校验驱动）', () => {
    const el = mount({ options: OPTIONS, status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(ta(el).getAttribute('aria-invalid')).toBe('true')
    el.setAttribute('status', 'warning')
    expect(el.getAttribute('data-status')).toBe('warning')
    expect(ta(el).hasAttribute('aria-invalid')).toBe(false)
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
  })

  it('status 非 error 不覆盖宿主自设 aria-invalid', () => {
    const el = mount({ options: OPTIONS })
    el.setAttribute('aria-invalid', 'true')
    el.setAttribute('status', 'warning')
    expect(ta(el).getAttribute('aria-invalid')).toBe('true')
  })

  it('size 三档镜像 data-size（非法值回落 medium）', () => {
    const small = mount({ options: OPTIONS, size: 'small' })
    expect(small.getAttribute('data-size')).toBe('small')
    const large = mount({ options: OPTIONS, size: 'large' })
    expect(large.getAttribute('data-size')).toBe('large')
    const bogus = mount({ options: OPTIONS, size: 'huge' })
    expect(bogus.getAttribute('data-size')).toBe('medium')
  })

  it('variant 镜像 data-variant（outlined/filled/borderless）', () => {
    const el = mount({ options: OPTIONS, variant: 'filled' })
    expect(el.getAttribute('data-variant')).toBe('filled')
    el.setAttribute('variant', 'borderless')
    expect(el.getAttribute('data-variant')).toBe('borderless')
    const def = mount({ options: OPTIONS })
    expect(def.getAttribute('data-variant')).toBe('outlined')
  })

  it('readonly 透传且不触发扫描（聚焦/输入均不弹层）', () => {
    const el = mount({ options: OPTIONS, readonly: '', value: '@app' })
    const t = ta(el)
    expect(t.readOnly).toBe(true)
    t.dispatchEvent(new FocusEvent('focus'))
    t.dispatchEvent(new Event('input'))
    expect(openState(el)).toBe(false)
  })

  it('clearable：有内容显示清空按钮，点击派发 oas-clear/oas-change 并清空', () => {
    const el = mount({ options: OPTIONS, clearable: '', value: '今天 @张三' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!
    expect(btn.hidden).toBe(false)
    const clears: unknown[] = []
    const changes: unknown[] = []
    el.addEventListener('oas-clear', (e: Event) => clears.push((e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))
    btn.click()
    expect(ta(el).value).toBe('')
    expect(el.hasAttribute('value')).toBe(false)
    expect(clears).toEqual([{ value: '今天 @张三' }])
    expect(changes).toEqual([{ value: '' }])
    expect(btn.hidden).toBe(true)
  })

  it('clearable 在 disabled/readonly/空文本时隐藏清空按钮', () => {
    const dis = mount({ options: OPTIONS, clearable: '', disabled: '', value: 'x' })
    expect(dis.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
    const ro = mount({ options: OPTIONS, clearable: '', readonly: '', value: 'x' })
    expect(ro.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
    const empty = mount({ options: OPTIONS, clearable: '' })
    expect(empty.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
  })

  // ---- split / 默认过滤 / filterOption ----

  it('split 可配：默认空格；换分隔符后扫描断界与插入补位一并跟随', () => {
    const el = mount({ options: OPTIONS, split: '、' })
    // 「、」为分隔符：『任务 @ap、完毕』caret 在「、」前 → 命中 @ap 且后文已分隔不再补
    const t = ta(el)
    t.value = '任务 @ap、完毕'
    placeCaret(t, 6) // '任务 @' 后 ap 结尾（'、' 前）
    t.dispatchEvent(new Event('input'))
    expect(openState(el)).toBe(true)
    key(t, 'Enter')
    expect(t.value).toBe('任务 @Apple、完毕')
  })

  it('默认过滤升格 label‖value（value 命中也可达）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana' },
      ]),
    })
    type(el, '@apple') // 仅 value 命中
    expect(rows(el).length).toBe(1)
    expect(rows(el)[0]!.textContent).toBe('苹果')
  })

  it('el.filterOption 自定义过滤函数（property 通道）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta' },
      ]),
    })
    el.filterOption = (q, o) => o.value.startsWith(q)
    type(el, '@alp')
    expect(rows(el).length).toBe(1)
    expect(rows(el)[0]!.textContent).toBe('Alpha')
  })

  // ---- 空态 / header / footer 插槽 ----

  it('template 空态插槽覆盖默认「无匹配」文案（[slot=empty] 存在时默认隐藏）', () => {
    const el = mount({ options: OPTIONS })
    el.innerHTML = '<span slot="empty">试试别的关键词吧</span>'
    type(el, '@zzz')
    const empty = el.shadowRoot!.querySelector('.empty')!
    expect(empty.querySelector<HTMLElement>('.empty-default')!.hidden).toBe(true)
    expect(empty.querySelector('slot[name="empty"]')).not.toBeNull()
  })

  it('header/footer 插槽随面板展开可见（[slot=...] 提供时容器不 hidden）', () => {
    const el = mount({ options: OPTIONS })
    el.innerHTML = '<span slot="header">输入 @ 提及</span><span slot="footer">共 3 位成员</span>'
    type(el, '@')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.panel-header')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.panel-footer')!.hidden).toBe(false)
  })

  // ---- placement ----

  it('placement=top 强制浮层在锚点上方（computePosition 不翻转避让）', () => {
    const el = mount({ options: OPTIONS, placement: 'top' })
    type(el, '@a')
    expect(panel(el).style.top).toBe('-8px')
  })

  it('placement 默认 auto：下方优先（bottom-start 定位，视口避让 4px）', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@a')
    expect(panel(el).style.top).toBe('8px')
    expect(panel(el).style.left).toBe('4px')
  })

  // ---- focus/blur 事件与方法 ----

  it('focus()/blur() 方法委托内部 textarea', () => {
    const el = mount({ options: OPTIONS })
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(ta(el))
    el.blur()
    expect(el.shadowRoot!.activeElement).toBeNull()
  })

  it('textarea 聚焦/失焦派发 oas-focus / oas-blur，失焦收起浮层', () => {
    const el = mount({ options: OPTIONS })
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    const t = type(el, '@a')
    t.dispatchEvent(new FocusEvent('focus'))
    expect(openState(el)).toBe(true)
    t.dispatchEvent(new FocusEvent('blur'))
    expect(events).toEqual(['focus', 'blur'])
    expect(openState(el)).toBe(false)
  })

  // ---- autosize ----

  /** happy-dom 可解析字体/行高计算值（与 oas-textarea 批同一实测模式）；padding 走 +16 兜底 */
  function lineHeight(t: HTMLTextAreaElement): number {
    const cs = getComputedStyle(t)
    const lh = parseFloat(cs.lineHeight)
    return cs.lineHeight.endsWith('px') ? lh : lh * parseFloat(cs.fontSize)
  }

  it('autosize：空态回 min-rows 高度，min-rows 调整即时生效，退出 autosize 清内联高度', () => {
    const el = mount({ options: OPTIONS, autosize: '' })
    const t = ta(el)
    const lh = lineHeight(t)
    // 空态回 min-rows(1)：height = 行高×1 + 上下内边距(16 兜底)
    expect(t.style.minHeight).toBe(`${Math.round(lh * 1 + 16)}px`)
    expect(parseInt(t.style.height)).toBe(Math.round(lh + 16))
    el.setAttribute('min-rows', '3')
    expect(t.style.minHeight).toBe(`${Math.round(lh * 3 + 16)}px`)
    el.removeAttribute('autosize')
    expect(t.style.height).toBe('')
  })

  it('max-rows="0" 不封顶增长', () => {
    const el = mount({ options: OPTIONS, autosize: '', 'max-rows': '0' })
    const t = ta(el)
    expect(t.style.maxHeight).toBe('')
    expect(t.style.overflowY).toBe('hidden')
  })

  // ===== 机制债回归（行为缺陷修复） =====

  it('① 中文正文紧贴 @ 可触发（不再要求 prefix 前空白/行首）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '张三', value: 'zhangsan' },
        { label: '张伟', value: 'zhangwei' },
      ]),
    })
    type(el, '大家好@张')
    expect(openState(el)).toBe(true)
    expect(rows(el).length).toBe(2)
  })

  it('① 空格/换行截断：关键词段含分隔符则不再触发', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@abc def') // 空格截断
    expect(openState(el)).toBe(false)
    type(el, '@abc\ndef') // 换行截断
    expect(openState(el)).toBe(false)
  })

  it('② IME 组合期：input 不扫描、Enter/↑↓ 不误选中/误换行，组合确认后补扫', () => {
    const el = mount({ options: OPTIONS })
    const t = ta(el)
    const inputs: string[] = []
    el.addEventListener('oas-input', (e: Event) => inputs.push((e as CustomEvent).detail.value))
    t.dispatchEvent(new Event('compositionstart'))
    t.value = '@a'
    t.selectionStart = t.selectionEnd = 2
    t.dispatchEvent(new Event('input')) // 组合期 input：不弹层不派发
    expect(openState(el)).toBe(false)
    expect(inputs).toEqual([])
    key(t, 'ArrowDown') // 组合期键盘：不导航
    key(t, 'Enter') // 组合期 Enter：不误选（交输入法确认候选）
    expect(openState(el)).toBe(false)
    expect(t.value).toBe('@a')
    // 组合确认后以最终文本补扫 → 弹层
    t.value = '@app'
    t.selectionStart = t.selectionEnd = 4
    t.dispatchEvent(new Event('compositionend'))
    expect(openState(el)).toBe(true)
    expect(inputs).toEqual(['@app'])
  })

  it('③ 光标移动/落点重扫：移出触发段关闭、移入触发段重开', () => {
    const el = mount({ options: OPTIONS })
    const t = ta(el)
    // 初始光标在末段（无触发）→ 关闭
    t.value = '见 @ap 下一句'
    placeCaret(t, t.value.length)
    t.dispatchEvent(new Event('input'))
    expect(openState(el)).toBe(false)
    // 鼠标把光标移到 @ap 之后 → 鼠标落点重扫打开
    placeCaret(t, 5) // '@ap' 之后（空格前）
    t.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(openState(el)).toBe(true)
    expect(rows(el).length).toBe(2)
    // 箭头键把光标移回段尾 → keyup 重扫关闭
    placeCaret(t, t.value.length)
    keyup(t, 'ArrowRight')
    expect(openState(el)).toBe(false)
  })

  it('④ 选中插入去重 split：后文已以分隔符开头不再重复补', () => {
    const el = mount({ options: OPTIONS })
    const t = ta(el)
    t.value = 'x @ap x'
    placeCaret(t, 5) // '@ap' 后紧邻空格：空格仍属「下一字符已分隔」
    t.dispatchEvent(new Event('input'))
    expect(openState(el)).toBe(true)
    key(t, 'Enter')
    expect(t.value).toBe('x @Apple x')
    expect(t.value.split(' ').length - 1).toBe(2) // 不产生连续双空格
  })

  it('⑤ 面板 mousemove 增量同步：只移高亮不重建整树', () => {
    const el = mount({ options: OPTIONS })
    type(el, '@')
    const rowsBefore = rows(el)
    const firstRow = rowsBefore[0]!
    // 移到第二项：只改 active class，DOM 节点保持同一引用
    rowsBefore[1]!.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
    const rowsAfter = rows(el)
    expect(rowsAfter[0]).toBe(firstRow)
    expect(rowsAfter.length).toBe(rowsBefore.length)
    expect(rowsAfter[0]!.classList.contains('active')).toBe(false)
    expect(rowsAfter[1]!.classList.contains('active')).toBe(true)
  })

  it('清空/选中后再次输入同一触发词可再次弹层并派发 oas-search', () => {
    const el = mount({ options: OPTIONS })
    const searches: unknown[] = []
    el.addEventListener('oas-search', (e: Event) => searches.push((e as CustomEvent).detail))
    const t = type(el, '@a')
    key(t, 'Escape')
    type(el, '@a') // 重开同一段 → 重新派发
    expect(searches).toEqual([
      { query: 'a', prefix: '@' },
      { query: 'a', prefix: '@' },
    ])
  })

  it('type=input 单行：rows 置 1，data-type 镜像', () => {
    const el = mount({ type: 'input', options: OPTIONS })
    const t = ta(el)
    expect(t.getAttribute('rows')).toBe('1')
    expect(el.getAttribute('data-type')).toBe('input')
  })

  it('type=input 单行：浮层关闭时 Enter 拦截换行', () => {
    const el = mount({ type: 'input', options: OPTIONS })
    const t = ta(el)
    type(el, 'hi')
    const before = t.value
    key(t, 'Enter') // 浮层未开（无 @ 触发）→ 拦截
    expect(t.value).toBe(before)
    expect(t.value).not.toContain('\n')
  })

  it('type 默认 textarea：data-type=textarea', () => {
    const el = mount({ options: OPTIONS })
    expect(el.getAttribute('data-type')).toBe('textarea')
  })

  it('⑥ whole 整段删除：光标在长成员名（含空格）段末尾一次 Backspace 删除 prefix+label', () => {
    const el = mount({
      whole: '',
      options: JSON.stringify([{ label: '张 三', value: 'zhangsan' }]),
    })
    const t = ta(el)
    // 光标紧跟提及段（`@张 三`）之后（无尾随内容），一次删除整段
    t.value = '你好 @张 三'
    t.selectionStart = t.selectionEnd = t.value.length
    t.dispatchEvent(new Event('input'))
    key(t, 'Backspace')
    expect(t.value).toBe('你好 ')
  })

  it('⑥ whole 整段删除：中文正文紧贴 @ 也可整段删', () => {
    const el = mount({ whole: '', options: JSON.stringify([{ label: '张三', value: 'zhangsan' }]) })
    const t = ta(el)
    t.value = '大家好@张三，后面'
    t.selectionStart = t.selectionEnd = t.value.indexOf('，')
    t.dispatchEvent(new Event('input'))
    key(t, 'Backspace')
    expect(t.value).toBe('大家好，后面')
  })

  it('⑥ whole 整段删除：派发 oas-whole-remove（detail 带 option 原对象与 prefix）', () => {
    const el = mount({
      whole: '',
      options: JSON.stringify([{ label: '张三', value: 'zhangsan', dept: '前端组' }]),
    })
    let detail: unknown
    el.addEventListener('oas-whole-remove', (e: Event) => (detail = (e as CustomEvent).detail))
    const t = ta(el)
    t.value = '@张三'
    t.selectionStart = t.selectionEnd = t.value.length
    t.dispatchEvent(new Event('input'))
    key(t, 'Backspace')
    expect(detail).toEqual({
      value: '',
      option: { label: '张三', value: 'zhangsan', dept: '前端组' },
      prefix: '@',
    })
  })

  it('⑥ whole：无 whole 属性时不拦截（交还原生，测试环境原生不删字符故 value 不变）', () => {
    const el = mount({ options: JSON.stringify([{ label: '张三', value: 'zhangsan' }]) })
    const t = ta(el)
    t.value = '@张三'
    t.selectionStart = t.selectionEnd = t.value.length
    t.dispatchEvent(new Event('input'))
    key(t, 'Backspace')
    expect(t.value).toBe('@张三') // 未命中 whole，组件不 PreventDefault
  })

  it('⑥ whole：label 与光标前文本部分重叠时取最长匹配（不误删短名）', () => {
    const el = mount({
      whole: '',
      options: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'ab', value: 'ab' },
      ]),
    })
    const t = ta(el)
    t.value = '@ab'
    t.selectionStart = t.selectionEnd = t.value.length
    t.dispatchEvent(new Event('input'))
    key(t, 'Backspace')
    expect(t.value).toBe('') // 最长 label "ab" 命中，整段删
  })
})
