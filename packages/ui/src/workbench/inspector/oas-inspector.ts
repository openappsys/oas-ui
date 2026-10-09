import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  background: var(--oas-inspector-bg, color-mix(in srgb, var(--oas-color-text-primary) 3%, var(--oas-color-bg)));
  box-sizing: border-box;
  width: var(--oas-inspector-width, 280px);
  font-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
/* density 档：行高/间距 token 通道（行/分节子件经 CSS 变量继承，跨 shadow 生效） */
:host([data-density='compact']) {
  --oas-inspector-row-height: 24px;
  --oas-inspector-section-header-height: 28px;
  --oas-inspector-gap: var(--oas-space-1);
}
:host([data-density='default']) {
  --oas-inspector-row-height: 28px;
  --oas-inspector-section-header-height: 36px;
  --oas-inspector-gap: var(--oas-space-2);
}
/* 栏位方向钩子：右栏分隔线在 inline-start（内侧缘），左栏在 inline-end（RTL 自动镜像） */
:host([data-side='right']) {
  border-inline-start: 1px solid var(--oas-color-border);
}
:host([data-side='left']) {
  border-inline-end: 1px solid var(--oas-color-border);
}
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}
.header,
.footer {
  flex-shrink: 0;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-block-end: 1px solid var(--oas-color-border);
}
.footer {
  border-block-end: none;
  border-block-start: 1px solid var(--oas-color-border);
}
.header[hidden],
.footer[hidden] {
  display: none;
}
.tabs {
  flex-shrink: 0;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-block-end: 1px solid var(--oas-color-border);
}
.tabs[hidden] {
  display: none;
}
.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--oas-inspector-gap, var(--oas-space-2)) var(--oas-space-3);
}
.body[hidden] {
  display: none;
}
.empty {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  text-align: center;
  padding: var(--oas-space-4);
}
.empty[hidden] {
  display: none;
}
`

/**
 * oas-inspector —— 属性检视面板（设计工具右侧栏语义）。
 *
 * 与 oas-sidebar（导航菜单）的分工：inspector 是上下文属性编辑——tab 条 + 可折叠分节 +
 * 标签/控件行；sidebar 是 items/选中/嵌套导航。
 *
 * 属性（kebab-case）：
 * - `side`：`right`（默认）/ `left`（仅分隔线方向语义钩子，定位由宿主布局决定）；非法值回落并告警
 * - `active-tab`：与 `slot="tabs"` 内的 oas-inspector-tabs 双向协调的受控通道——在场即下发给子件
 *   `value`，子件选中变化冒泡上来即反射回本属性（值不同才写，天然收敛）
 * - `density`：`default`（默认）/ `compact`（行高 24px / 分节头 28px / 间距收窄，token 通道下发子件）
 * - `empty`：布尔，无选中态——默认插槽隐藏、`empty` 插槽（缺省内置文案）显示
 * - `label`：可访问名称（缺省走 i18n「属性面板」）
 *
 * 插槽：`tabs`（tab 条，配 oas-inspector-tabs）、默认（分节/内容）、`header`、`footer`、
 * `empty`（无选中态内容，覆盖内置文案）。
 *
 * a11y：`role="complementary"` + aria-label；RTL：`data-rtl` 钩子 + 全逻辑属性布局。
 * 子件事件（oas-change / oas-toggle / oas-row-reset）bubbles + composed 自然冒泡，
 * 容器与宿主均可监听。
 */
export class OASInspector extends OASElement {
  static override get observedAttributes(): string[] {
    return ['side', 'active-tab', 'density', 'empty', 'label', 'dir']
  }

  private panelEl: HTMLElement | null = null
  private bodyEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null

  private static readonly VALID_SIDES = ['right', 'left'] as const
  private static readonly VALID_DENSITY = ['default', 'compact'] as const
  private static warnedSides = new Set<string>()
  private static warnedDensities = new Set<string>()

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <aside class="panel" part="panel" role="complementary">
        <div class="header" part="header" hidden><slot name="header"></slot></div>
        <div class="tabs" part="tabs" hidden><slot name="tabs"></slot></div>
        <div class="empty" part="empty" hidden><slot name="empty"></slot><span data-fallback></span></div>
        <div class="body" part="body"><slot></slot></div>
        <div class="footer" part="footer" hidden><slot name="footer"></slot></div>
      </aside>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.panelEl = this.shadow.querySelector('[part="panel"]')
    this.bodyEl = this.shadow.querySelector('[part="body"]')
    this.emptyEl = this.shadow.querySelector('[part="empty"]')
    for (const s of this.shadow.querySelectorAll('slot')) {
      s.addEventListener('slotchange', () => this.update())
    }
    // tab 通道协调：子件 oas-inspector-tabs 选中变化冒泡上来 → 反射 active-tab（属性即状态）；
    // 容器 active-tab 变化在 update() 中下发子件 value（两向都只在值不同才写，天然收敛无环）。
    this.addEventListener('oas-change', (e) => {
      const target = e.target as Element | null
      if (target?.tagName?.toLowerCase() !== 'oas-inspector-tabs') return
      const value = (e as CustomEvent<{ value?: unknown }>).detail?.value
      if (typeof value === 'string' && this.getAttribute('active-tab') !== value) {
        this.setAttribute('active-tab', value)
      }
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（panel + slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="panel"]')) return false
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    // side / density 钩子（非法值回落 + dev 告警，同值去重）
    const side = this.getAttr('side', 'right')
    if ((OASInspector.VALID_SIDES as readonly string[]).includes(side)) this.dataset.side = side
    else {
      this.dataset.side = 'right'
      if (!OASInspector.warnedSides.has(side) && side !== '') {
        OASInspector.warnedSides.add(side)
        console.warn(`[oas-inspector] 非法 side "${side}"，已回落 right；合法值：right/left`)
      }
    }
    const density = this.getAttr('density', 'default')
    if ((OASInspector.VALID_DENSITY as readonly string[]).includes(density)) this.dataset.density = density
    else {
      this.dataset.density = 'default'
      if (!OASInspector.warnedDensities.has(density) && density !== '') {
        OASInspector.warnedDensities.add(density)
        console.warn(`[oas-inspector] 非法 density "${density}"，已回落 default；合法值：default/compact`)
      }
    }
    // 可访问名称：label 属性 > i18n 默认（locale 反应式）
    this.panelEl?.setAttribute('aria-label', this.getAttr('label', '') || this.t('inspector.label'))
    // 空态：empty 属性在场 → 默认插槽隐藏、空态显示（插槽内容覆盖内置文案）
    const isEmpty = this.hasAttr('empty')
    if (this.bodyEl) this.bodyEl.hidden = isEmpty
    if (this.emptyEl) {
      this.emptyEl.hidden = !isEmpty
      if (isEmpty) {
        const emptySlot = this.emptyEl.querySelector<HTMLSlotElement>('slot[name="empty"]')
        const hasCustom = emptySlot ? this.hasSlotContent(emptySlot) : false
        // 内置文案挂在 slot fallback 外的文本位（有自定义内容时隐藏）
        let fallback = this.emptyEl.querySelector<HTMLElement>('[data-fallback]')
        if (!fallback) {
          fallback = document.createElement('span')
          fallback.setAttribute('data-fallback', '')
          this.emptyEl.appendChild(fallback)
        }
        fallback.textContent = this.t('inspector.empty')
        fallback.hidden = hasCustom
      }
    }
    // header/footer 空态：无内容时不渲染容器
    this.syncEdgeHidden('header')
    this.syncEdgeHidden('footer')
    const tabsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="tabs"]')
    const tabsWrap = this.shadow.querySelector<HTMLElement>('[part="tabs"]')
    if (tabsWrap && tabsSlot) tabsWrap.hidden = !this.hasSlotContent(tabsSlot)
    // active-tab 下发：受控通道（在场即把值写给 oas-inspector-tabs，缺省不动子件内部态）
    this.syncActiveTab()
  }

  /** active-tab → oas-inspector-tabs.value 下发（值不同才写；缺省/相等时零操作） */
  private syncActiveTab(): void {
    const activeTab = this.getAttribute('active-tab')
    if (activeTab == null) return
    const tabs = this.querySelector('oas-inspector-tabs')
    if (tabs && tabs.getAttribute('value') !== activeTab) tabs.setAttribute('value', activeTab)
  }

  /** 边缘插槽区（header/footer）空态：无真实内容时隐藏容器 */
  private syncEdgeHidden(name: 'header' | 'footer'): void {
    const wrap = this.shadow.querySelector<HTMLElement>(`[part="${name}"]`)
    const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
    if (wrap && slot) wrap.hidden = !this.hasSlotContent(slot)
  }

  /** 插槽是否有「真实内容」：注释节点与纯空白文本不算（对齐 app-bar 判据） */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    const nodes = slot.assignedNodes({ flatten: true })
    return nodes.length > 0 && nodes.some((n) => this.isRealNode(n))
  }

  private isRealNode(node: Node): boolean {
    if (node.nodeType === Node.COMMENT_NODE) return false
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName.includes('-')) return true
      return el.childNodes.length === 0 || [...el.childNodes].some((c) => this.isRealNode(c))
    }
    return true
  }
}
