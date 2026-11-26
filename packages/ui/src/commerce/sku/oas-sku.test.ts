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
    expect((part(el, 'quantity-input') as HTMLInputElement).min, '数量控件随面板搬移照常可用').toBe('1')
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

  // -------------------------------------------------------------------------
  // 回归：popup 关闭态可聚焦性 / 读屏树（bottom-sheet 关闭态只有 translateY(100%)
  // 移屏外，自身不带 hidden——承载件 hidden 必须由宿主在关闭收尾补上）
  // -------------------------------------------------------------------------

  /** 模拟真实浏览器滑出过渡收尾：TransitionEvent 形态（composed 冒泡 + propertyName） */
  function dispatchSlideEnd(sheet: Element): void {
    const inner = (sheet as HTMLElement).shadowRoot!.querySelector('.sheet')!
    const ev = new Event('transitionend', { bubbles: true, composed: true })
    Object.defineProperty(ev, 'propertyName', { value: 'transform' })
    inner.dispatchEvent(ev)
  }

  it('popup 关闭态：承载件 hidden（radio/数量/按钮退出 Tab 序与读屏树），打开恢复可见', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    // 初始关闭：同帧 hidden（不进读屏树，Tab 不可达——display:none 语义）
    expect(sheet.hasAttribute('hidden'), '初始关闭态承载件必须隐藏').toBe(true)
    // 打开：hidden 移除（面板可见可交互）
    el.openOverlay()
    expect(sheet.hasAttribute('hidden'), '打开后承载件可见').toBe(false)
    expect(sheet.hasAttribute('open')).toBe(true)
    // 关闭：滑出过渡播放中不立即隐藏（保留滑出动画），收尾后 hidden
    el.closeOverlay()
    expect(sheet.hasAttribute('open')).toBe(false)
    expect(sheet.hasAttribute('hidden'), '滑出过渡播放期间不提前隐藏').toBe(false)
    dispatchSlideEnd(sheet)
    expect(sheet.hasAttribute('hidden'), '过渡收尾后承载件隐藏（Tab 序/读屏树移除）').toBe(true)
  })

  it('popup 关闭收尾兜底：transitionend 不触发（reduced-motion/环境无过渡）时兜底计时隐藏', async () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    el.openOverlay()
    el.closeOverlay()
    expect(sheet.hasAttribute('hidden')).toBe(false)
    // 不派发 transitionend：兜底计时（180ms 过渡 + 余量）到点收尾
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(sheet.hasAttribute('hidden'), '兜底计时到点必须隐藏').toBe(true)
  })

  it('popup 关闭后焦点回带触发器（不滞留屏外抽屉），焦点已离开时不抢焦点', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)
    el.openOverlay()
    const panel = part(el, 'panel')!
    const inPanel = el.shadowRoot!.activeElement ?? document.activeElement
    expect(panel.contains(inPanel), '前置：打开后焦点移入面板').toBe(true)
    // 关闭：焦点回带打开前的触发器（display:none 前移回，不滞留屏外抽屉）
    el.closeOverlay()
    expect(document.activeElement, '焦点必须回带触发器').toBe(trigger)
    trigger.remove()

    // 焦点已被宿主移到别处：关闭不得抢焦点
    const el2 = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const trigger2 = document.createElement('button')
    document.body.appendChild(trigger2)
    trigger2.focus()
    el2.openOverlay()
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    elsewhere.focus()
    el2.closeOverlay()
    expect(document.activeElement, '焦点已在弹层外时关闭不得回带').toBe(elsewhere)
    elsewhere.remove()
    trigger2.remove()
  })

  it('快速关→开：取消待生效的隐藏收尾，弹层保持可见（不闪断）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    el.openOverlay()
    el.closeOverlay()
    // 滑出未收尾就重开：pending 隐藏必须作废
    el.openOverlay()
    expect(sheet.hasAttribute('hidden'), '重开后不得被待收尾隐藏').toBe(false)
    // 待收尾的兜底计时到点也不得隐藏（已取消）
    dispatchSlideEnd(sheet)
    expect(sheet.hasAttribute('hidden')).toBe(false)
  })

  it('收尾窗口内 observed 属性更新不砍断滑出动画（update 重入不得同帧 hidden）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    el.openOverlay()
    el.closeOverlay()
    expect(el.hasAttribute('open')).toBe(false)
    // 滑出播放中（收尾未落定）受控宿主回写 value/quantity → update() 重入
    el.setAttribute('quantity', '2')
    expect(sheet.hasAttribute('hidden'), '滑出播放中 update 重入不得同帧隐藏（砍断动画）').toBe(false)
    // 收尾完成（滑出结束事件）才落 hidden
    dispatchSlideEnd(sheet)
    expect(sheet.hasAttribute('hidden')).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // 修复批回归（补审）：反复开合不得累积断开清理回调
  // ---------------------------------------------------------------------------

  it('反复开合弹层不累积 onCleanup 注册（隐藏收尾用单次句柄）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    // cleanupFns 是 OASElement 的私有成员（运行时是普通字段），这里直接读长度做泄漏观测
    const internals = el as unknown as { cleanupFns: Array<() => void> }
    expect(internals.cleanupFns.length, '前置：bind 只注册一条断开清理').toBe(1)
    const base = internals.cleanupFns.length
    for (let i = 0; i < 4; i++) {
      el.openOverlay()
      el.closeOverlay()
    }
    expect(internals.cleanupFns.length, '开合不得追加 onCleanup 注册（否则随交互次数单调增长）').toBe(base)
    // 末次关闭的滑出动画仍在播（收尾未到点，不得提前 hidden）
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    expect(sheet.hasAttribute('hidden')).toBe(false)
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

// ---------------------------------------------------------------------------
// 形态切换收口（本批：焦点保持 / open 悬空真值收口）
// ---------------------------------------------------------------------------

describe('oas-sku 形态切换收口', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('popup→embedded 搬移面板后焦点保持（焦点元素跟着面板走，不丢到 body）', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    el.openOverlay()
    const radio = optionInput(el, 0, '红')
    radio.focus()
    expect(el.shadowRoot!.querySelector('oas-bottom-sheet')!.contains(radio)).toBe(true)
    // shadow 内焦点在 document 层面表现为 host，这里直接按 shadowRoot.activeElement 断言
    expect(el.shadowRoot!.activeElement, '聚焦已落在该单选上').toBe(radio)

    // 切到内嵌（显式 layout 与视口越界走同一搬移路径）
    el.setAttribute('layout', 'embedded')
    expect(part(el, 'panel-host')!.contains(radio), '面板搬回内嵌容器').toBe(true)
    expect(el.shadowRoot!.activeElement, '搬移前聚焦的单选在搬移后仍是活跃元素（焦点不掉到 body/host）').toBe(radio)
  })

  it('popup→embedded 切换时 open 悬空真值收口：open 回写 false 并派发 oas-open-change', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'popup' })
    el.openOverlay()
    expect(el.hasAttribute('open')).toBe(true)
    const events: Array<{ open: boolean }> = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent<{ open: boolean }>).detail))

    el.setAttribute('layout', 'embedded')
    expect(el.hasAttribute('open'), '承载切换后弹层已隐藏，open 不得残留悬空真值').toBe(false)
    expect(events, '同步派发一次 open 变化（受控宿主据此清滚动锁/遮罩态）').toEqual([{ open: false }])
    expect(el.shadowRoot!.querySelector('oas-bottom-sheet')!.hasAttribute('open')).toBe(false)
  })

  it('挂载时预置 open + 内嵌形态：作为待生效意图保留，不抹除也不派事件', () => {
    const el = new OASSku()
    el.setAttribute('specs', SPECS)
    el.setAttribute('skus', SKUS)
    el.setAttribute('layout', 'embedded')
    el.setAttribute('open', '')
    const events: unknown[] = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent).detail))
    document.body.appendChild(el)
    // 内嵌形态不承载弹层，但 `open` 是宿主的开合意图：抹掉会让「切到 popup 自动弹开」失效
    expect(el.hasAttribute('open'), '内嵌形态下宿主的 open 意图必须保留').toBe(true)
    expect(events, '受控属性写入不派发 open 变化').toEqual([])
  })

  it('内嵌形态运行时写 open：保留且静默；切到 popup 即自动弹开', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'embedded' })
    const events: unknown[] = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent).detail))
    el.setAttribute('open', '')
    expect(el.hasAttribute('open'), '受控写入静默生效').toBe(true)
    expect(events, '受控属性写入不派发').toEqual([])

    el.setAttribute('layout', 'popup')
    const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
    expect(sheet.hasAttribute('open'), '待生效的 open 在切到 popup 时自动弹开').toBe(true)
  })

  it('收口只作用于「popup 且已打开」的切换：embedded 内部更新不改写 open', () => {
    const el = mount({ specs: SPECS, skus: SKUS, layout: 'embedded', open: '' })
    const events: unknown[] = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent).detail))
    el.setAttribute('quantity', '3')
    el.setAttribute('disabled', '')
    el.removeAttribute('disabled')
    expect(el.hasAttribute('open'), '内嵌形态的常规更新不得顺手清掉 open 意图').toBe(true)
    expect(events).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 多组场景（6 规格组真实服装类目）：架构维度无关性的工程验证。
// 组件按 specs 数组 + 组合键字典 + 渲染循环实现，逻辑维度无关；此前工程验证只锁过
// 2-3 组。这里用 6 组真实服装数据（颜色 / 尺码 / 领型 / 袖型 / 披肩 / 材质）锁定：
// 多组渲染、全选精确定位、部分选择的可行性引导、售罄组合禁用、value 多键回写。
// ---------------------------------------------------------------------------

/** 真实服装 6 售卖维度。全笛卡尔积 = 3×4×3×2×2×2 = 288 组合，组合表只录热门子集 */
function clothingSpecs(): SkuSpecGroup[] {
  return [
    {
      key: 'color',
      label: '颜色',
      values: [
        { value: 'black', label: '黑' },
        { value: 'white', label: '白' },
        { value: 'ivory', label: '米' },
      ],
    },
    { key: 'size', label: '尺码', values: ['S', 'M', 'L', 'XL'].map((v) => ({ value: v, label: v })) },
    {
      key: 'collar',
      label: '领型',
      values: [
        { value: 'crew', label: '圆领' },
        { value: 'vneck', label: 'V领' },
        { value: 'polo', label: '翻领' },
      ],
    },
    {
      key: 'sleeve',
      label: '袖型',
      values: [
        { value: 'long', label: '长袖' },
        { value: 'short', label: '短袖' },
      ],
    },
    {
      key: 'shawl',
      label: '披肩',
      values: [
        { value: 'none', label: '无' },
        { value: 'with', label: '有' },
      ],
    },
    {
      key: 'material',
      label: '材质',
      values: [
        { value: 'cotton', label: '棉' },
        { value: 'poly', label: '聚酯' },
      ],
    },
  ]
}

type ClothingRow = {
  specs: Record<string, string>
  price: number
  stock: number
  image?: string
  imageAlt?: string
}

/**
 * 热门组合子集（31 条，含 5 条售罄 stock:0）。真实分布约束：
 * - 披肩款只有圆领长袖棉（黑/白/米）——「V领 + 有披肩」「翻领 + 有披肩」不存在任何组合；
 * - V 领只有短袖且无披肩；翻领棉只有米色长袖一条；
 * - 售罄 5 条：圆领长袖棉黑/白 XL、翻领短袖聚酯白 L、圆领长袖棉披肩白 L、翻领长袖聚酯黑 L
 *   （黑 XL 翻领短袖聚酯在库 stock 2，不算售罄）。
 */
function clothingSkus(): SkuItem[] {
  const rows: ClothingRow[] = [
    // 圆领长袖棉（基础款 黑/白/米）
    {
      specs: { color: 'black', size: 'S', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 12,
    },
    {
      specs: { color: 'black', size: 'M', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 7,
      image: '/img/sku-multi-black-m.svg',
      imageAlt: '黑色圆领长袖棉 T恤 M 码',
    },
    {
      specs: { color: 'black', size: 'L', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 5,
    },
    {
      specs: { color: 'black', size: 'XL', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 0,
    },
    {
      specs: { color: 'white', size: 'S', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 8,
    },
    {
      specs: { color: 'white', size: 'M', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 6,
    },
    {
      specs: { color: 'white', size: 'L', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 4,
    },
    {
      specs: { color: 'white', size: 'XL', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 199,
      stock: 0,
    },
    {
      specs: { color: 'ivory', size: 'M', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 209,
      stock: 3,
    },
    {
      specs: { color: 'ivory', size: 'L', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 209,
      stock: 2,
    },
    // 圆领长袖聚酯（速干款）
    {
      specs: { color: 'black', size: 'M', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'poly' },
      price: 159,
      stock: 1,
    },
    // 圆领短袖棉
    {
      specs: { color: 'black', size: 'M', collar: 'crew', sleeve: 'short', shawl: 'none', material: 'cotton' },
      price: 129,
      stock: 9,
    },
    {
      specs: { color: 'black', size: 'L', collar: 'crew', sleeve: 'short', shawl: 'none', material: 'cotton' },
      price: 129,
      stock: 6,
    },
    {
      specs: { color: 'black', size: 'XL', collar: 'crew', sleeve: 'short', shawl: 'none', material: 'cotton' },
      price: 129,
      stock: 3,
    },
    {
      specs: { color: 'white', size: 'S', collar: 'crew', sleeve: 'short', shawl: 'none', material: 'cotton' },
      price: 129,
      stock: 7,
    },
    {
      specs: { color: 'white', size: 'M', collar: 'crew', sleeve: 'short', shawl: 'none', material: 'cotton' },
      price: 129,
      stock: 5,
    },
    // V领短袖棉
    {
      specs: { color: 'black', size: 'M', collar: 'vneck', sleeve: 'short', shawl: 'none', material: 'cotton' },
      price: 139,
      stock: 4,
    },
    {
      specs: { color: 'black', size: 'L', collar: 'vneck', sleeve: 'short', shawl: 'none', material: 'cotton' },
      price: 139,
      stock: 3,
    },
    // V领短袖聚酯
    {
      specs: { color: 'black', size: 'S', collar: 'vneck', sleeve: 'short', shawl: 'none', material: 'poly' },
      price: 119,
      stock: 2,
    },
    {
      specs: { color: 'white', size: 'M', collar: 'vneck', sleeve: 'short', shawl: 'none', material: 'poly' },
      price: 119,
      stock: 1,
    },
    // 翻领短袖聚酯（polo）
    {
      specs: { color: 'black', size: 'M', collar: 'polo', sleeve: 'short', shawl: 'none', material: 'poly' },
      price: 169,
      stock: 5,
    },
    {
      specs: { color: 'black', size: 'L', collar: 'polo', sleeve: 'short', shawl: 'none', material: 'poly' },
      price: 169,
      stock: 4,
    },
    {
      specs: { color: 'black', size: 'XL', collar: 'polo', sleeve: 'short', shawl: 'none', material: 'poly' },
      price: 169,
      stock: 2,
    },
    {
      specs: { color: 'white', size: 'M', collar: 'polo', sleeve: 'short', shawl: 'none', material: 'poly' },
      price: 169,
      stock: 3,
    },
    {
      specs: { color: 'white', size: 'L', collar: 'polo', sleeve: 'short', shawl: 'none', material: 'poly' },
      price: 169,
      stock: 0,
    },
    // 翻领长袖棉（米色一条）
    {
      specs: { color: 'ivory', size: 'L', collar: 'polo', sleeve: 'long', shawl: 'none', material: 'cotton' },
      price: 219,
      stock: 1,
    },
    // 披肩款（只有圆领长袖棉）
    {
      specs: { color: 'black', size: 'M', collar: 'crew', sleeve: 'long', shawl: 'with', material: 'cotton' },
      price: 259,
      stock: 3,
    },
    {
      specs: { color: 'black', size: 'L', collar: 'crew', sleeve: 'long', shawl: 'with', material: 'cotton' },
      price: 259,
      stock: 2,
    },
    {
      specs: { color: 'ivory', size: 'M', collar: 'crew', sleeve: 'long', shawl: 'with', material: 'cotton' },
      price: 269,
      stock: 1,
    },
    {
      specs: { color: 'white', size: 'L', collar: 'crew', sleeve: 'long', shawl: 'with', material: 'cotton' },
      price: 259,
      stock: 0,
    },
    // 翻领长袖聚酯（售罄，组合存在但不可选）
    {
      specs: { color: 'black', size: 'L', collar: 'polo', sleeve: 'long', shawl: 'none', material: 'poly' },
      price: 189,
      stock: 0,
    },
  ]
  return rows.map((row, i) => ({
    id: `cloth-${String(i + 1).padStart(2, '0')}`,
    specs: row.specs,
    price: row.price,
    stock: row.stock,
    image: row.image ?? '',
    imageAlt: row.imageAlt ?? '',
  }))
}

describe('oas-sku 多组场景（6 规格组服装类目）', () => {
  function mountClothing(attrs: Record<string, string> = {}): OASSku {
    return mount({
      specs: JSON.stringify(clothingSpecs()),
      skus: JSON.stringify(clothingSkus()),
      ...attrs,
    })
  }

  it('6 规格组全渲染：fieldset 数 = 6，legend 顺序与各组选项数逐组正确', () => {
    const el = mountClothing()
    const list = groups(el)
    expect(list).toHaveLength(6)
    expect(list.map((g) => g.querySelector('legend')!.textContent)).toEqual([
      '颜色',
      '尺码',
      '领型',
      '袖型',
      '披肩',
      '材质',
    ])
    expect(list.map((g) => g.querySelectorAll('input[type="radio"]').length)).toEqual([3, 4, 3, 2, 2, 2])
  })

  it('6 组全选：精确定位组合表热门子集的价格 / 库存 / 图片', () => {
    const el = mountClothing({
      value: JSON.stringify({
        color: 'black',
        size: 'M',
        collar: 'crew',
        sleeve: 'long',
        shawl: 'none',
        material: 'cotton',
      }),
    })
    const price = el.shadowRoot!.querySelector('oas-price')!
    expect(price.hasAttribute('hidden')).toBe(false)
    expect(price.getAttribute('value')).toBe('199')
    expect(part(el, 'sold-out')!.hidden).toBe(true)
    const thumb = el.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
    expect(thumb.getAttribute('src')).toBe('/img/sku-multi-black-m.svg')
    expect(thumb.getAttribute('alt')).toBe('黑色圆领长袖棉 T恤 M 码')
  })

  it('组合表外的预置 value：其余维度全置灰，已选项自身标缺货（disabled + checked），同组改选圆领可原地退出', () => {
    // 交互路径点不出「V领 + 有披肩」：先选任一项，另一项立即 disabled（算法对已选维度做全约束）。
    // 该状态只能由宿主受控 value 预置产生（深链 / 缓存旧值）——这里按真实到达形态预置，
    // 不用 choose() 直接改写 disabled radio 绕过语义。
    const el = mountClothing({ value: JSON.stringify({ collar: 'vneck', shawl: 'with' }) })
    // 其余组没有任何选项能走到「V领 + 有披肩」的在库组合 → 全部禁用并标缺货
    for (const size of ['S', 'M', 'L', 'XL']) {
      expect(optionInput(el, 1, size).disabled, `尺码 ${size}`).toBe(true)
      expect(optionLabel(el, 1, size).textContent).toContain('缺货')
    }
    expect(optionLabel(el, 0, 'black').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 0, 'white').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 3, 'long').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 5, 'cotton').getAttribute('data-available')).toBe('false')
    // 已选项自身同样走不到在库组合：标缺货 + disabled，但选中态保留（用户从这里改选退出）
    expect(optionLabel(el, 2, 'vneck').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 2, 'vneck').getAttribute('data-checked')).toBe('true')
    expect(optionInput(el, 2, 'vneck').disabled).toBe(true)
    expect(optionLabel(el, 4, 'with').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 4, 'with').getAttribute('data-checked')).toBe('true')
    // 同组退出路径：圆领 + 有披肩 有在库组合（黑 M/L、米 M）；披肩改选「无」同样可达
    expect(optionLabel(el, 2, 'crew').getAttribute('data-available')).toBe('true')
    expect(optionLabel(el, 2, 'polo').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 4, 'none').getAttribute('data-available')).toBe('true')
    // 改选圆领（enabled 项的真实交互）后其余维度恢复可选（部分尺码仍受组合表约束：S 无披肩款 → 仍禁用）
    choose(optionInput(el, 2, 'crew'))
    expect(optionInput(el, 1, 'M').disabled).toBe(false)
    expect(optionInput(el, 1, 'L').disabled).toBe(false)
    expect(optionInput(el, 1, 'S').disabled).toBe(true)
    expect(optionInput(el, 3, 'long').disabled).toBe(false)
    expect(optionInput(el, 5, 'cotton').disabled).toBe(false)
  })

  it('多组联动收敛：选「米 + 圆领」后短袖 / 聚酯走不到在库组合置灰', () => {
    const el = mountClothing({ value: JSON.stringify({ color: 'ivory', collar: 'crew' }) })
    // 米色圆领只有长袖棉（含披肩款）→ 短袖、聚酯全缺货
    expect(optionLabel(el, 3, 'short').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 3, 'short').textContent).toContain('缺货')
    expect(optionLabel(el, 3, 'long').getAttribute('data-available')).toBe('true')
    expect(optionLabel(el, 5, 'poly').getAttribute('data-available')).toBe('false')
    expect(optionLabel(el, 5, 'cotton').getAttribute('data-available')).toBe('true')
  })

  it('售罄组合：部分选择时 XL 置灰标缺货；全选后缺货提示 + 数量禁用 + 价格保留', () => {
    const partial = mountClothing({
      value: JSON.stringify({ color: 'black', collar: 'crew', sleeve: 'long', shawl: 'none', material: 'cotton' }),
    })
    // 5/6 组选中：XL 售罄（stock 0）→ 置灰标缺货；S/M/L 有库存可选
    expect(optionInput(partial, 1, 'XL').disabled).toBe(true)
    expect(optionLabel(partial, 1, 'XL').textContent).toContain('缺货')
    expect(optionInput(partial, 1, 'L').disabled).toBe(false)
    expect(optionInput(partial, 1, 'S').disabled).toBe(false)

    const full = mountClothing({
      value: JSON.stringify({
        color: 'black',
        size: 'XL',
        collar: 'crew',
        sleeve: 'long',
        shawl: 'none',
        material: 'cotton',
      }),
    })
    expect(part(full, 'sold-out')!.hidden).toBe(false)
    expect(part(full, 'sold-out')!.textContent).toBe('缺货')
    expect((part(full, 'quantity-input') as HTMLInputElement).disabled).toBe(true)
    expect((part(full, 'plus') as HTMLButtonElement).disabled).toBe(true)
    expect(full.shadowRoot!.querySelector('oas-price')!.getAttribute('value')).toBe('199')
  })

  it('逐组选择：value 字典回写 6 键齐全且与所选组合一致，命中在库组合后数量按库存钳制', () => {
    const el = mountClothing()
    choose(optionInput(el, 0, 'ivory'))
    expect(Object.keys(JSON.parse(el.getAttribute('value')!))).toEqual(['color'])
    choose(optionInput(el, 1, 'M'))
    choose(optionInput(el, 2, 'crew'))
    choose(optionInput(el, 3, 'long'))
    choose(optionInput(el, 4, 'with'))
    choose(optionInput(el, 5, 'cotton'))
    expect(JSON.parse(el.getAttribute('value')!)).toEqual({
      color: 'ivory',
      size: 'M',
      collar: 'crew',
      sleeve: 'long',
      shawl: 'with',
      material: 'cotton',
    })
    // 命中米色披肩款 M（269 / 库存 1）：价格联动 + 数量到顶禁用
    expect(el.shadowRoot!.querySelector('oas-price')!.getAttribute('value')).toBe('269')
    expect((part(el, 'quantity-input') as HTMLInputElement).value).toBe('1')
    expect((part(el, 'plus') as HTMLButtonElement).disabled).toBe(true)
  })
})
