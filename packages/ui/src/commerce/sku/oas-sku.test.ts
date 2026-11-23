import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASSku, type SkuItem, type SkuSpecGroup } from './index.js'

const SPECS = JSON.stringify([
  { key: 'color', label: '颜色', values: ['红', '蓝'] },
  { key: 'size', label: '尺码', values: ['S', 'M'] },
])

const SKUS = JSON.stringify([
  { id: 'red-s', specs: { color: '红', size: 'S' }, price: 99, stock: 5 },
  { id: 'red-m', specs: { color: '红', size: 'M' }, price: 109, stock: 0 },
  { id: 'blue-s', specs: { color: '蓝', size: 'S' }, price: 119, stock: 2 },
  { id: 'blue-m', specs: { color: '蓝', size: 'M' }, price: 129, stock: 3 },
])

function mount(attrs: Record<string, string> = {}): OASSku {
  const el = new OASSku()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASSku, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

function groups(el: OASSku): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="group"]')]
}

function optionInput(el: OASSku, groupIndex: number, value: string): HTMLInputElement {
  return groups(el)[groupIndex]!.querySelector<HTMLInputElement>(`input[value="${value}"]`)!
}

function optionLabel(el: OASSku, groupIndex: number, value: string): HTMLElement {
  return groups(el)[groupIndex]!.querySelector<HTMLElement>(`[part="option"][data-value="${value}"]`)!
}

/** 模拟用户选择：勾选 + 派发 change */
function choose(input: HTMLInputElement): void {
  input.checked = true
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('oas-sku', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染规格组与选项（label 可缺省回退 key / value）', () => {
    const el = mount({ specs: SPECS, skus: SKUS })
    const list = groups(el)
    expect(list).toHaveLength(2)
    expect(list[0]!.querySelector('[part="group-label"]')!.textContent).toBe('颜色')
    expect(list[1]!.querySelector('[part="group-label"]')!.textContent).toBe('尺码')
    expect(list[0]!.querySelectorAll('input[type="radio"]')).toHaveLength(2)
  })

  it('单选组的 radio name 按实例派生且带组名（多实例互不串选）', () => {
    const a = mount({ specs: SPECS, skus: SKUS })
    const b = mount({ specs: SPECS, skus: SKUS })
    const nameA = optionInput(a, 0, '红').name
    expect(nameA).toContain('color')
    choose(optionInput(a, 0, '红'))
    expect(optionInput(a, 0, '红').checked).toBe(true)
    // 另一实例的同名 radio 不受影响（shadow root 作用域隔离）
    expect(optionInput(b, 0, '红').checked).toBe(false)
  })

  it('部分选择 → 可选路径提示：无在库组合的选项禁用并标「缺货」', () => {
    const el = mount({ specs: SPECS, skus: SKUS, value: JSON.stringify({ color: '红' }) })
    // 红色 + M 无库存 → M 禁用；S 有库存 → 可选
    expect(optionInput(el, 1, 'M').disabled).toBe(true)
    expect(optionInput(el, 1, 'S').disabled).toBe(false)
    expect(optionLabel(el, 1, 'M').textContent).toContain('缺货')
    expect(optionLabel(el, 1, 'S').textContent).not.toContain('缺货')
  })

  it('完整组合：定位 sku 并渲染价格', () => {
    const el = mount({ specs: SPECS, skus: SKUS, value: JSON.stringify({ color: '红', size: 'S' }) })
    const price = el.shadowRoot!.querySelector('oas-price')!
    expect(price.hasAttribute('hidden')).toBe(false)
    expect(price.getAttribute('value')).toBe('99')
    expect(part(el, 'sold-out')!.hidden).toBe(true)
  })

  it('选择选项：回写 value 属性并派发 oas-change（含匹配 sku）', () => {
    const el = mount({ specs: SPECS, skus: SKUS })
    let detail: {
      value?: Record<string, string>
      quantity?: number
      sku?: { id?: string } | null
      change?: string
    } | null = null
    el.addEventListener('oas-change', (e) => {
      detail = (e as CustomEvent).detail
    })
    choose(optionInput(el, 0, '红'))
    expect(JSON.parse(el.getAttribute('value')!)).toEqual({ color: '红' })
    expect(detail).toEqual({ value: { color: '红' }, quantity: 1, sku: null, change: 'spec' })
    choose(optionInput(el, 1, 'S'))
    expect(detail).toEqual({
      value: { color: '红', size: 'S' },
      quantity: 1,
      sku: expect.objectContaining({ id: 'red-s' }),
      change: 'spec',
    })
  })

  it('缺货组合：显示缺货提示，价格保留但数量禁用', () => {
    const el = mount({ specs: SPECS, skus: SKUS, value: JSON.stringify({ color: '红', size: 'M' }) })
    expect(part(el, 'sold-out')!.hidden).toBe(false)
    expect(part(el, 'sold-out')!.textContent).toBe('缺货')
    expect((part(el, 'quantity-input') as HTMLInputElement).disabled).toBe(true)
    expect((part(el, 'plus') as HTMLButtonElement).disabled).toBe(true)
  })

  it('数量步进：加一 / 减一下限 1 / 不超过库存', () => {
    const el = mount({ specs: SPECS, skus: SKUS, value: JSON.stringify({ color: '红', size: 'S' }) })
    const plus = part(el, 'plus') as HTMLButtonElement
    const minus = part(el, 'minus') as HTMLButtonElement
    const input = part(el, 'quantity-input') as HTMLInputElement
    let detail: { quantity?: number; change?: string } | null = null
    el.addEventListener('oas-change', (e) => {
      detail = (e as CustomEvent).detail
    })
    plus.click()
    expect(input.value).toBe('2')
    expect(el.getAttribute('quantity')).toBe('2')
    expect(detail).toEqual(expect.objectContaining({ quantity: 2, change: 'quantity' }))
    minus.click()
    minus.click()
    expect(input.value).toBe('1')
    expect(minus.disabled).toBe(true)
    // 库存 5：从 1 连加到上限后 plus 禁用
    for (let i = 0; i < 10; i++) plus.click()
    expect(input.value).toBe('5')
    expect(plus.disabled).toBe(true)
  })

  it('数量输入框：非法值回 1、超库存钳到库存', () => {
    const el = mount({ specs: SPECS, skus: SKUS, value: JSON.stringify({ color: '蓝', size: 'S' }) })
    const input = part(el, 'quantity-input') as HTMLInputElement
    input.value = 'abc'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(input.value).toBe('1')
    input.value = '99'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(input.value).toBe('2')
  })

  it('程序性写入 value：只渲染不派发事件', () => {
    const el = mount({ specs: SPECS, skus: SKUS })
    let fired = 0
    el.addEventListener('oas-change', () => {
      fired++
    })
    el.setAttribute('value', JSON.stringify({ color: '蓝', size: 'M' }))
    expect(optionInput(el, 0, '蓝').checked).toBe(true)
    expect(optionInput(el, 1, 'M').checked).toBe(true)
    expect(fired).toBe(0)
  })

  it('disabled：全部单选与步进不可用', () => {
    const el = mount({ specs: SPECS, skus: SKUS, disabled: '' })
    expect(optionInput(el, 0, '红').disabled).toBe(true)
    expect((part(el, 'plus') as HTMLButtonElement).disabled).toBe(true)
  })

  it('disabled 视觉：逐控件弱化，不整块降透明度（否则只读说明文字对比度破线）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, disabled: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).not.toMatch(/:host\(\[disabled\]\)\s+\.panel\s*\{[^}]*opacity/)
    expect(css).toMatch(/:host\(\[disabled\]\)\s+\.option\s*\{[^}]*--oas-color-bg-disabled/)
    // 选中项保留主色实线边：禁用后仍要看得出当前选的是哪个组合
    expect(css).toMatch(
      /:host\(\[disabled\]\)\s+\.option\[data-checked='true'\]\s*\{[^}]*border-style:\s*solid[^}]*border-color:\s*var\(--oas-color-primary\)/,
    )
  })

  it('a11y：fieldset/legend 组织规格组，数量控件有关联标签与 i18n 名称', () => {
    const el = mount({ specs: SPECS, skus: SKUS })
    expect(groups(el)[0]!.tagName.toLowerCase()).toBe('fieldset')
    expect(groups(el)[0]!.querySelector('legend')!.textContent).toBe('颜色')
    const input = part(el, 'quantity-input') as HTMLInputElement
    expect(input.getAttribute('aria-labelledby')).toBe(part(el, 'quantity-label')!.id)
    expect(part(el, 'plus')!.getAttribute('aria-label')).toBe('增加数量')
    expect(part(el, 'minus')!.getAttribute('aria-label')).toBe('减少数量')
  })

  it('非法 JSON / 空数据：不抛错，且无规格时不渲染面板', () => {
    const el = mount({ specs: '{bad', skus: 'nope' })
    expect(groups(el)).toHaveLength(0)
    expect(part(el, 'panel')).toBeNull()
  })

  it('样式只走 token 且布局为逻辑方向（RTL 安全）', () => {
    const el = mount({ specs: SPECS, skus: SKUS })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-color-')
    expect(css).not.toMatch(/margin-(left|right)/)
    expect(css).not.toMatch(/padding-(left|right)/)
  })

  // ---------------------------------------------------------------------------
  // 回归：宿主 JSON 值含 CSS 选择器元字符（引号等）不得拼进 querySelector
  // ---------------------------------------------------------------------------
  it('规格值含引号（6"）：再次 update 不抛错且选中态正确同步', () => {
    const specs = JSON.stringify([{ key: 'screen', label: '屏幕', values: ['6"', '7"'] }])
    const skus = JSON.stringify([
      { id: 's6', specs: { screen: '6"' }, price: 10, stock: 2 },
      { id: 's7', specs: { screen: '7"' }, price: 20, stock: 3 },
    ])
    const el = mount({ specs, skus, value: JSON.stringify({ screen: '7"' }) })
    const labels = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    expect(labels[0]!.getAttribute('data-value')).toBe('6"')
    expect(labels[1]!.getAttribute('data-checked')).toBe('true')
    // 第二次 update 走结构未变的增量同步分支（修复前在此抛 DOMException）
    expect(() => el.setAttribute('quantity', '2')).not.toThrow()
    expect(labels[1]!.getAttribute('data-checked')).toBe('true')
    // 程序性换选中值同样不抛错
    expect(() => el.setAttribute('value', JSON.stringify({ screen: '6"' }))).not.toThrow()
    expect(labels[0]!.getAttribute('data-checked')).toBe('true')
    expect(labels[1]!.getAttribute('data-checked')).toBe('false')
  })

  it('规格值含选择器元字符（] [ = \\）不抛错', () => {
    const specs = JSON.stringify([{ key: 'k', label: 'K', values: ['a]b', 'c[=d', 'e\\f'] }])
    const el = mount({ specs })
    expect(() => el.setAttribute('quantity', '3')).not.toThrow()
    expect(el.shadowRoot!.querySelectorAll('[part="option"]')).toHaveLength(3)
  })

  // ---------------------------------------------------------------------------
  // property 通道（框架按「key in el」走 property 赋值时的数据入口）
  // ---------------------------------------------------------------------------
  it('property 通道：specs/skus/value/quantity 均为 get+set 访问器', () => {
    const proto = Object.getOwnPropertyDescriptors(OASSku.prototype)
    for (const key of ['specs', 'skus', 'value', 'quantity']) {
      expect(typeof proto[key], key).toBe('object')
      expect(typeof proto[key]!.get, `${key}.get`).toBe('function')
      expect(typeof proto[key]!.set, `${key}.set`).toBe('function')
    }
  })

  it('property 通道：setter 接受数组/对象并反射 attribute，getter 读回归一后的数据', () => {
    const el = mount()
    el.specs = JSON.parse(SPECS) as SkuSpecGroup[]
    el.skus = JSON.parse(SKUS) as SkuItem[]
    expect(el.getAttribute('specs')).toBe(SPECS)
    expect(el.getAttribute('skus')).toBe(SKUS)
    expect(el.specs.map((g) => g.key)).toEqual(['color', 'size'])
    expect(el.skus.map((s) => s.id)).toEqual(['red-s', 'red-m', 'blue-s', 'blue-m'])
    expect(groups(el)).toHaveLength(2)

    el.value = { color: '蓝', size: 'M' }
    expect(el.getAttribute('value')).toBe(JSON.stringify({ color: '蓝', size: 'M' }))
    expect(el.value).toEqual({ color: '蓝', size: 'M' })
    expect(optionInput(el, 0, '蓝').checked).toBe(true)

    el.quantity = 3
    expect(el.getAttribute('quantity')).toBe('3')
    expect(el.quantity).toBe(3)
    expect((part(el, 'quantity-input') as HTMLInputElement).value).toBe('3')
  })

  it('property 通道：setter 容忍 JSON 字符串（框架静态属性直写 property 的到达形态）', () => {
    const el = mount()
    el.specs = SPECS
    el.skus = SKUS
    el.value = JSON.stringify({ color: '红', size: 'S' })
    el.quantity = '2'
    expect(groups(el)).toHaveLength(2)
    expect(optionInput(el, 1, 'S').checked).toBe(true)
    expect(el.shadowRoot!.querySelector('oas-price')!.getAttribute('value')).toBe('99')
    expect(el.quantity).toBe(2)
  })

  it('locale 缺省读文档 <html lang>（与 price/coupon 同源）', () => {
    const original = document.documentElement.lang
    document.documentElement.lang = 'en-US'
    try {
      const el = mount({ specs: SPECS, skus: SKUS, value: JSON.stringify({ color: '红', size: 'S' }) })
      const price = el.shadowRoot!.querySelector('oas-price')!
      expect(price.getAttribute('locale')).toBe('en-US')
    } finally {
      document.documentElement.lang = original
    }
  })

  // ---------------------------------------------------------------------------
  // 弹层形态（layout=embedded|popup）：同一面板两种承载，走 bottom-sheet 协议
  // ---------------------------------------------------------------------------

  it('缺省 layout=embedded：面板在自身 shadow 内，不进入 bottom-sheet', () => {
    const el = mount({ specs: SPECS, skus: SKUS })
    const panel = part(el, 'panel')!
    const host = part(el, 'panel-host')!
    const sheet = el.shadowRoot!.querySelector<HTMLElement>('oas-bottom-sheet')!
    expect(panel.parentElement).toBe(host)
    expect(sheet.contains(panel)).toBe(false)
    expect(sheet.hasAttribute('open')).toBe(false)
    expect(sheet.hidden, '内嵌形态承载件隐藏（空 dialog 不进读屏树）').toBe(true)
    expect(el.hasAttribute('data-layout-popup')).toBe(false)
  })

  it('layout="popup"：同一面板节点移入 oas-bottom-sheet（内容复用不复制）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const panel = part(el, 'panel')!
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    expect(panel.parentElement, '面板挂进 sheet 的 light DOM（默认 slot）').toBe(sheet)
    expect(el.shadowRoot!.querySelectorAll('[part="panel"]')).toHaveLength(1)
    expect(el.hasAttribute('data-layout-popup')).toBe(true)
    // 面板内容照常可用（组与数量控件都在）
    expect(groups(el)).toHaveLength(2)
    expect(part(el, 'quantity-input')).not.toBeNull()
  })

  it('弹层开合：open 属性驱动 sheet，close 事件按 bottom-sheet 协议回写并派发 oas-open-change', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    const events: Array<{ open: boolean }> = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent<{ open: boolean }>).detail))
    expect(sheet.hasAttribute('open')).toBe(false)

    el.openOverlay()
    expect(el.hasAttribute('open')).toBe(true)
    expect(sheet.hasAttribute('open')).toBe(true)
    expect(events).toEqual([{ open: true }])
    // 幂等：重复打开不再派发
    el.openOverlay()
    expect(events).toHaveLength(1)

    // bottom-sheet 的关闭请求（Esc / 遮罩 / 下滑）→ 宿主移除 open
    sheet.dispatchEvent(new CustomEvent('oas-close', { detail: { reason: 'esc' }, bubbles: true, composed: true }))
    expect(el.hasAttribute('open'), '收到关闭请求后必须收起').toBe(false)
    expect(sheet.hasAttribute('open')).toBe(false)
    expect(events).toEqual([{ open: true }, { open: false }])

    // property 通道：写入静默反射 attribute
    el.open = true
    expect(el.hasAttribute('open')).toBe(true)
    expect(sheet.hasAttribute('open')).toBe(true)
    el.open = false
    expect(el.hasAttribute('open')).toBe(false)
    expect(events).toHaveLength(2)
  })

  it('打开时焦点移入弹层面板（bottom-sheet 协议）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    el.openOverlay()
    // bottom-sheet 打开即聚焦面板首个可聚焦控件，焦点落在面板内部
    const active = el.shadowRoot!.activeElement as HTMLElement | null
    expect(active).not.toBeNull()
    expect(part(el, 'panel')!.contains(active), '焦点必须进入面板（Tab 循环以面板为范围）').toBe(true)
  })

  it('窄屏自动切换弹层形态（≤480px），宽屏回落内嵌；layout="embedded" 强制内嵌', () => {
    const viewport = stubViewport(false)
    try {
      const wide = mount({ specs: SPECS, skus: SKUS })
      const wideSheet = wide.shadowRoot!.querySelector('oas-bottom-sheet')!
      expect(wideSheet.contains(part(wide, 'panel'))).toBe(false)

      viewport.setNarrow(true)
      // 条件越界即时重判形态（不刷新、不需要重挂）
      expect(wideSheet.contains(part(wide, 'panel')), '窄屏应自动切到弹层承载').toBe(true)
      expect(wide.hasAttribute('data-layout-popup')).toBe(true)

      const forced = mount({ specs: SPECS, skus: SKUS, layout: 'embedded' })
      const forcedSheet = forced.shadowRoot!.querySelector('oas-bottom-sheet')!
      expect(forcedSheet.contains(part(forced, 'panel')), '显式 embedded 不被窄屏覆盖').toBe(false)

      viewport.setNarrow(false)
      expect(wideSheet.contains(part(wide, 'panel')), '回到宽屏应恢复内嵌').toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('layout 非法值回落 embedded 并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'sheet' })
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    expect(sheet.contains(part(el, 'panel'))).toBe(false)
    el.setAttribute('quantity', '2')
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('layout')).length).toBe(1)
    warn.mockRestore()
  })

  it('内嵌形态调用开合命令式方法只告警一次，不产生幽灵 open 态', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ specs: SPECS, skus: SKUS })
    let events = 0
    el.addEventListener('oas-open-change', () => events++)
    el.openOverlay()
    el.closeOverlay()
    expect(el.hasAttribute('open')).toBe(false)
    expect(events).toBe(0)
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('layout'))).toHaveLength(1)
    warn.mockRestore()
  })

  it('切换 layout 复用同一面板节点（选中态与数量不丢）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, value: JSON.stringify({ color: '蓝', size: 'M' }), quantity: '2' })
    const panel = part(el, 'panel')!
    el.setAttribute('layout', 'popup')
    expect(part(el, 'panel')).toBe(panel)
    expect(optionInput(el, 0, '蓝').checked).toBe(true)
    expect((part(el, 'quantity-input') as HTMLInputElement).value).toBe('2')
    el.setAttribute('layout', 'embedded')
    expect(part(el, 'panel')).toBe(panel)
    expect(optionInput(el, 1, 'M').checked).toBe(true)
  })
})

/** 视口桩：窄屏判定走 matchMedia('(max-width: 480px)')，可即时切换并触发 change */
function stubViewport(initialNarrow: boolean): { setNarrow: (narrow: boolean) => void } {
  let narrow = initialNarrow
  const listeners = new Set<() => void>()
  const matchMedia = (query: string): MediaQueryList =>
    ({
      get matches() {
        return query.includes('max-width: 480px') ? narrow : false
      },
      media: query,
      onchange: null,
      addEventListener: (type: string, cb: () => void) => {
        if (type === 'change') listeners.add(cb)
      },
      removeEventListener: (type: string, cb: () => void) => {
        if (type === 'change') listeners.delete(cb)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
  vi.stubGlobal('matchMedia', matchMedia)
  return {
    setNarrow(value: boolean): void {
      narrow = value
      for (const cb of [...listeners]) cb()
    },
  }
}
