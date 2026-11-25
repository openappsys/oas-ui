import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASSearchBar } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSearchBar {
  const el = new OASSearchBar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASSearchBar, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

function inputOf(el: OASSearchBar): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('[part="input"]')!
}

async function settled(): Promise<void> {
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

describe('oas-search-bar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  // —— 结构与缺省 ——

  it('缺省渲染：searchbox 输入框（i18n 可访问名）+ 搜索钮 + 清除钮 + 取消钮；placeholder 缺省走 i18n', () => {
    const el = mount()
    const input = inputOf(el)
    expect(input.getAttribute('type')).toBe('search')
    expect(input.getAttribute('enterkeyhint')).toBe('search')
    // a11y：input 有可访问名（不依赖 placeholder）；搜索/清除钮各有 aria-label
    expect(input.getAttribute('aria-label')).toBe('搜索栏')
    expect(part(el, 'go')!.getAttribute('aria-label')).toBe('搜索')
    expect(part(el, 'clear')!.getAttribute('aria-label')).toBe('清除搜索内容')
    expect(part(el, 'cancel')!.textContent).toContain('取消')
    expect(input.getAttribute('placeholder')).toBe('搜索商品')
  })

  it('搜索钮为图标按钮：part=go 有可见 svg 子节点（非空白胶囊——文档口径「图标」）', () => {
    const el = mount({ value: '外套' })
    const svgs = el.shadowRoot!.querySelectorAll('[part="go"] svg')
    expect(svgs).toHaveLength(1)
    // 图标路径非空（searchPath 含描边圆与手柄，确定性特征断言）
    expect(svgs[0]!.innerHTML).toContain('stroke')
  })

  it('hide-cancel 隐藏取消钮；placeholder 属性覆盖缺省文案', () => {
    const el = mount({ 'hide-cancel': '', placeholder: '搜店铺' })
    expect(part(el, 'cancel')!.hidden).toBe(true)
    expect(inputOf(el).getAttribute('placeholder')).toBe('搜店铺')
    // 无 hide-cancel 时取消钮可见
    const el2 = mount()
    expect(part(el2, 'cancel')!.hidden).toBe(false)
  })

  // —— value 双通道 ——

  it('value 双通道：attribute 与 property 赋值（字符串）一致，getter 回读', () => {
    const el = mount({ value: '初始词' })
    expect(el.value).toBe('初始词')
    el.value = 'property 词'
    expect(el.getAttribute('value')).toBe('property 词')
    expect(el.value).toBe('property 词')
    expect(inputOf(el).value).toBe('property 词')
    el.removeAttribute('value')
    expect(el.value).toBe('')
  })

  it('输入实时回写 value attribute 并派发 oas-input（detail {value}，静默回写不派 oas-search）', () => {
    const el = mount()
    const events: string[] = []
    el.addEventListener('oas-input', () => events.push('input'))
    el.addEventListener('oas-search', () => events.push('search'))
    const input = inputOf(el)
    input.value = '运动鞋'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('运动鞋')
    expect(events).toEqual(['input'])
  })

  // —— 搜索触发 ——

  it('Enter 触发 oas-search（detail {value}）；空值 Enter 不派发', () => {
    const el = mount({ value: '卫衣' })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-search', (e) => detail.push((e as CustomEvent).detail))
    inputOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(detail).toEqual([{ value: '卫衣' }])
    // 空值不派发（无意义的空搜索）
    el.removeAttribute('value')
    inputOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(detail).toHaveLength(1)
  })

  it('搜索钮点击触发 oas-search；disabled 时输入与按钮禁用、不派发', () => {
    const el = mount({ value: '外套' })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-search', (e) => detail.push((e as CustomEvent).detail))
    part(el, 'go')!.click()
    expect(detail).toEqual([{ value: '外套' }])
    el.setAttribute('disabled', '')
    expect(inputOf(el).disabled).toBe(true)
    expect((part(el, 'go') as HTMLButtonElement).disabled).toBe(true)
    expect((part(el, 'clear') as HTMLButtonElement).disabled).toBe(true)
    expect((part(el, 'cancel') as HTMLButtonElement).disabled).toBe(true)
    detail.length = 0
    part(el, 'go')!.click()
    expect(detail).toHaveLength(0)
  })

  // —— 取消与清除 ——

  it('取消钮：派 oas-cancel（detail 携带清空前 value）+ 清空 value + 收起面板', async () => {
    const el = mount({ value: '书包' })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-cancel', (e) => detail.push((e as CustomEvent).detail))
    // 先让面板处于展开态
    const panel = part(el, 'panel')!
    const historyChip = document.createElement('button')
    historyChip.slot = 'history'
    historyChip.textContent = '历史词'
    el.appendChild(historyChip)
    inputOf(el).dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    await settled()
    expect(panel.hidden).toBe(false)
    part(el, 'cancel')!.click()
    expect(detail).toEqual([{ value: '书包' }])
    expect(el.getAttribute('value')).toBe('')
    expect(panel.hidden).toBe(true)
  })

  it('清除钮：清空 value + 派发 oas-input（实时通道同步）+ 焦点回输入框', () => {
    const el = mount({ value: '围巾' })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-input', (e) => detail.push((e as CustomEvent).detail))
    part(el, 'clear')!.click()
    expect(el.getAttribute('value')).toBe('')
    expect(detail).toEqual([{ value: '' }])
    expect(el.shadowRoot!.activeElement).toBe(inputOf(el))
  })

  // —— 面板（历史词 / 热门词 / 联想位） ——

  it('面板：聚焦展开、失焦 / Esc 收起；无插槽内容时聚焦也不展开', async () => {
    const el = mount()
    const panel = part(el, 'panel')!
    // 无插槽内容：聚焦不展开
    inputOf(el).dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    await settled()
    expect(panel.hidden).toBe(true)
    // 有插槽内容：聚焦展开
    const chip = document.createElement('button')
    chip.slot = 'history'
    chip.textContent = '耳机'
    el.appendChild(chip)
    await settled()
    expect(panel.hidden).toBe(false)
    // Esc 收起
    inputOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(panel.hidden).toBe(true)
    // 真实焦点序列重展开（先失焦再聚焦）
    inputOf(el).dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    inputOf(el).dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    await settled()
    expect(panel.hidden).toBe(false)
    // 失焦收起
    inputOf(el).dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    expect(panel.hidden).toBe(true)
  })

  it('空值显示历史/热门容器、隐藏联想容器；有值反之（移动端搜索惯例分组）', async () => {
    const el = mount()
    const mk = (slot: string, text: string): HTMLElement => {
      const node = document.createElement('button')
      node.slot = slot
      node.textContent = text
      el.appendChild(node)
      return node
    }
    mk('history', '历史词')
    mk('hot', '热门词')
    mk('suggestions', '联想词')
    inputOf(el).dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    await settled()
    const sug = el.shadowRoot!.querySelector<HTMLElement>('[data-slot-group="suggestions"]')!
    const his = el.shadowRoot!.querySelector<HTMLElement>('[data-slot-group="history"]')!
    const hot = el.shadowRoot!.querySelector<HTMLElement>('[data-slot-group="hot"]')!
    expect(his.hidden).toBe(false)
    expect(hot.hidden).toBe(false)
    expect(sug.hidden).toBe(true)
    // 有值：分组翻转
    el.setAttribute('value', '蓝牙耳机')
    await settled()
    expect(his.hidden).toBe(true)
    expect(hot.hidden).toBe(true)
    expect(sug.hidden).toBe(false)
  })

  // —— 键盘与清理 ——

  it('输入过程中不派 oas-search；断开重连后交互恢复（onReconnect 幂等重绑）', async () => {
    const el = mount()
    const searches: unknown[] = []
    el.addEventListener('oas-search', (e) => searches.push((e as CustomEvent).detail))
    el.remove()
    document.body.appendChild(el)
    await settled()
    inputOf(el).value = '重连后的词'
    inputOf(el).dispatchEvent(new Event('input', { bubbles: true }))
    inputOf(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(el.getAttribute('value')).toBe('重连后的词')
    expect(searches).toEqual([{ value: '重连后的词' }])
  })

  it('面板 pointerdown 阻止默认（插槽内容点击不先失焦——历史词可点中）', () => {
    const el = mount()
    const panel = part(el, 'panel')!
    const evt = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
    const spy = vi.spyOn(evt, 'preventDefault')
    panel.dispatchEvent(evt)
    expect(spy).toHaveBeenCalled()
  })
})
