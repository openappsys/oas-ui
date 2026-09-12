import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASStatistic } from './index.js'

function mount(attrs: Record<string, string> = {}): OASStatistic {
  const el = new OASStatistic()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function valueEl(el: OASStatistic): HTMLElement {
  return el.shadowRoot!.querySelector('[part="value"]')!
}

function text(el: OASStatistic): string {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="statistic"]')!.textContent!
}

describe('OASStatistic', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('Intl.NumberFormat 千分位分组（默认开启）', () => {
    const el = mount({ value: '1234567.8', precision: '1' })
    expect(valueEl(el).textContent).toBe('1,234,567.8')
  })

  it('precision 控制小数位并四舍五入', () => {
    const el = mount({ value: '12345.678', precision: '2' })
    expect(valueEl(el).textContent).toBe('12,345.68')
    el.setAttribute('precision', '0')
    expect(valueEl(el).textContent).toBe('12,346')
  })

  it('group-separator=false 关闭千分位', () => {
    const el = mount({ value: '1234567', 'group-separator': 'false' })
    expect(valueEl(el).textContent).toBe('1234567')
  })

  it('prefix / suffix 拼接在数值两侧', () => {
    const el = mount({ value: '12', prefix: '¥', suffix: '元' })
    expect(text(el)).toContain('¥')
    expect(text(el)).toContain('元')
    expect(text(el).indexOf('¥')).toBeLessThan(text(el).indexOf('12'))
    expect(text(el).indexOf('12')).toBeLessThan(text(el).indexOf('元'))
  })

  it('loading 渲染骨架占位，非 loading 渲染数值', () => {
    const el = mount({ value: '123', loading: '' })
    const skeleton = el.shadowRoot!.querySelector('oas-skeleton')!
    expect(skeleton.hasAttribute('hidden')).toBe(false)
    el.removeAttribute('loading')
    expect(el.shadowRoot!.querySelector('oas-skeleton')!.hasAttribute('hidden')).toBe(true)
    expect(valueEl(el).textContent).toContain('123')
  })

  it('config-provider 注入 locale 生效（de-DE 分隔符）', () => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('locale', 'de-DE')
    const el = new OASStatistic()
    el.setAttribute('value', '12345.6')
    el.setAttribute('precision', '2')
    provider.appendChild(el)
    document.body.appendChild(provider)
    expect(valueEl(el).textContent).toBe('12.345,60')
  })

  it('setLocale(en) 后仍按 locale 格式化', () => {
    const el = mount({ value: '1234567.8', precision: '1' })
    expect(valueEl(el).textContent).toBe('1,234,567.8')
    setLocale(en)
    expect(valueEl(el).textContent).toBe('1,234,567.8')
    setLocale('zh-CN')
    expect(valueEl(el).textContent).toBe('1,234,567.8')
  })

  it('受控：外部改 value / precision 即时重渲染', () => {
    const el = mount({ value: '100', precision: '1' })
    expect(valueEl(el).textContent).toBe('100.0')
    el.setAttribute('value', '200.55')
    expect(valueEl(el).textContent).toBe('200.6')
  })

  // ---- slot 内容分发（prefix / suffix slot，attribute 通道保留为 fallback） ----

  it('无 slot 分发时回落 attribute 文本（fallback 渲染，现状行为不变）', () => {
    const el = mount({ value: '12', prefix: '¥', suffix: '元' })
    const prefixSlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="prefix"]')!
    const suffixSlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="suffix"]')!
    expect(prefixSlot.assignedNodes().length).toBe(0)
    expect(suffixSlot.assignedNodes().length).toBe(0)
    expect(text(el)).toContain('¥')
    expect(text(el)).toContain('元')
  })

  it('slot 分发内容替换 fallback（attribute 文本不再渲染，分发优先）', async () => {
    const el = mount({ value: '12', prefix: '¥' })
    const icon = document.createElement('span')
    icon.textContent = '💰'
    icon.setAttribute('slot', 'prefix')
    el.appendChild(icon)
    await new Promise((r) => setTimeout(r, 0))
    const prefixSlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="prefix"]')!
    expect(prefixSlot.assignedNodes()).toContain(icon)
    expect(prefixSlot.assignedNodes().length).toBe(1)
    // fallback 文本仍写入（分发时不渲染，更新无害）
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('[part="prefix"] [data-fallback]')!
    expect(fallback.textContent).toBe('¥')
  })

  it('suffix slot 同样支持分发', async () => {
    const el = mount({ value: '12', suffix: '元' })
    const tag = document.createElement('span')
    tag.textContent = 'K'
    tag.setAttribute('slot', 'suffix')
    el.appendChild(tag)
    await new Promise((r) => setTimeout(r, 0))
    const suffixSlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="suffix"]')!
    expect(suffixSlot.assignedNodes()).toContain(tag)
  })

  // ---- title / extra 结构三分区（属性 + slot 双通道；title 走原生全局属性吸收） ----

  function partEl(el: OASStatistic, part: string): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)!
  }

  it('title 属性渲染标题区并从宿主吸收（避免原生悬停提示）', () => {
    const el = mount({ value: '12', title: '总收入' })
    expect(partEl(el, 'title').textContent).toContain('总收入')
    // 吸收：title 从宿主移除（原生全局属性悬停提示与可见标题重复）
    expect(el.hasAttribute('title')).toBe(false)
    // 纵向结构：标题在数值行之前
    const order = ['title', 'value'].map((p) => partEl(el, p))
    const stat = el.shadowRoot!.querySelector('[part="statistic"]')!
    expect(
      order.every((node, i) => i === 0 || stat.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })

  it('title="" 清空标题区（隐藏标题行）', () => {
    const el = mount({ value: '12', title: '总收入' })
    el.setAttribute('title', '')
    expect(partEl(el, 'title').hidden).toBe(true)
  })

  it('slot="title" 分发优先于属性文本', async () => {
    const el = mount({ value: '12', title: '属性标题' })
    const rich = document.createElement('strong')
    rich.textContent = '插槽标题'
    rich.setAttribute('slot', 'title')
    el.appendChild(rich)
    await new Promise((r) => setTimeout(r, 0))
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="title"]')!
    expect(slot.assignedNodes()).toContain(rich)
    // 兜底文本写入但隐藏（分发优先）
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('[part="title"] [data-fallback]')!
    expect(fallback.hidden).toBe(true)
  })

  it('extra 属性渲染数值下方额外区', () => {
    const el = mount({ value: '12', extra: '较昨日 +24%' })
    expect(partEl(el, 'extra').textContent).toContain('较昨日 +24%')
    // extra 非原生全局属性：留在宿主上保持受控
    expect(el.hasAttribute('extra')).toBe(true)
  })

  it('slot="extra" 分发替换属性文本', async () => {
    const el = mount({ value: '12', extra: '属性脚注' })
    const foot = document.createElement('em')
    foot.textContent = '插槽脚注'
    foot.setAttribute('slot', 'extra')
    el.appendChild(foot)
    await new Promise((r) => setTimeout(r, 0))
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="extra"]')!
    expect(slot.assignedNodes()).toContain(foot)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="extra"] [data-fallback]')!.hidden).toBe(true)
  })

  // ---- trend 趋势指示（箭头 + token 涨跌色） ----

  it('trend="up" 显示上升箭头，trend="down" 显示下降箭头', () => {
    const up = mount({ value: '12', trend: 'up' })
    const trendUp = partEl(up, 'trend')
    expect(trendUp.hidden).toBe(false)
    expect(trendUp.querySelector('svg')).not.toBeNull()
    const down = mount({ value: '12', trend: 'down' })
    expect(partEl(down, 'trend').hidden).toBe(false)
    up.removeAttribute('trend')
    expect(partEl(up, 'trend').hidden).toBe(true)
  })

  // ---- slot="value" 自定义数值呈现 ----

  it('slot="value" 分发时隐藏 Intl 格式化兜底文本', async () => {
    const el = mount({ value: '1234.5', precision: '1' })
    const custom = document.createElement('span')
    custom.textContent = '自定义'
    custom.setAttribute('slot', 'value')
    el.appendChild(custom)
    await new Promise((r) => setTimeout(r, 0))
    const fallback = el.shadowRoot!.querySelector<HTMLElement>('[part="value"] [data-fallback]')!
    expect(fallback.hidden).toBe(true)
    expect(fallback.textContent).toBe('1,234.5')
  })

  it('loading 时骨架显示、value 区内容隐藏；取消后恢复', () => {
    const el = mount({ value: '123', loading: '' })
    expect(el.shadowRoot!.querySelector('oas-skeleton')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('oas-skeleton')!.hasAttribute('hidden')).toBe(false)
    el.removeAttribute('loading')
    expect(el.shadowRoot!.querySelector('oas-skeleton')!.hasAttribute('hidden')).toBe(true)
    expect(partEl(el, 'value').textContent).toContain('123')
  })

  // ---- DSD 水合：快照标题区恢复吸收缓存 ----

  it('水合：SSR 快照含标题文本时恢复 title 缓存（宿主无 title 属性）', () => {
    const ref = mount({ value: '12', title: '快照标题' })
    const snap = ref.shadowRoot!.innerHTML
    ref.remove()

    const el = new OASStatistic()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-statistic" data-oas-ssr-v="1">${snap}`
    el.setAttribute('value', '12')
    document.body.appendChild(el)
    expect(partEl(el, 'title').textContent).toContain('快照标题')
    expect(el.hasAttribute('title')).toBe(false)
  })

  it('内部 part 的 hidden 显隐有 CSS 兜底（作者层 display 规则不得压过 hidden 属性）', () => {
    // 回归：曾现 [part=trend] display:inline-flex 压过 hidden 属性，基础 demo 里骨架与涨跌箭头恒可见
    const el = document.createElement('oas-statistic') as HTMLElement & {
      shadowRoot: ShadowRoot
    }
    el.setAttribute('value', '1128')
    document.body.appendChild(el)
    const css = el.shadowRoot.querySelector('style')!.textContent!
    expect(css).toMatch(/\[hidden\]\s*\{\s*display:\s*none\s*!important/)
    el.remove()
  })
})
