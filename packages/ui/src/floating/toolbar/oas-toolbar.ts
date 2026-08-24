import { OASElement } from '@oas-ui/core'
import { OASToolbarToggle } from './oas-toolbar-toggle.js'

const STYLE = `
:host {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  max-width: 100%;
  /* 水平溢出收纳前提：容器宽度受宿主约束。overflow-x: clip 只裁横轴、纵轴放行，
     （hidden 会双轴裁剪，把向下浮出的「···」弹层裁掉）；弹层打开时切 overflow: visible */
  overflow-x: clip;
  overflow-y: visible;
  position: relative;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  box-sizing: border-box;
}
:host([hidden]) {
  display: none;
}
/* 子项防收缩：flex 默认 shrink=1 会把项压扁（scrollWidth 恒等于 clientWidth），
   溢出收纳的 scrollWidth>clientWidth 判定永不触发、按钮被挤成窄条——
   防收缩后溢出真实出现，超宽项由 syncOverflow 收进「···」 */
::slotted(*) {
  flex-shrink: 0;
}
:host([orientation='vertical']) {
  flex-direction: column;
  align-items: stretch;
}
/* 贴边形态：容器化工具栏外观（边框 + 圆角 + 底色 + 内边距），适合直接贴在其他
   工具栏/面板边上（编辑器顶部工具条等场景）。全走 token：dark 下
   --oas-color-border / --oas-color-bg-elevated 由主题表切变体，自动跟随。
   纯 CSS 属性选择器，无需 observedAttributes（与 data-toolbar-ignore 同类） */
:host([is-attached]) {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  padding: var(--oas-space-1);
}
/* 参与 roving 的插槽子元素：焦点环由 toolbar 统一提供 */
::slotted(:focus-visible) {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 链接项（a[href]，JS 打 part="link"）：显式链接样式 */
::slotted(a[part='link']) {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-md);
  color: var(--oas-color-primary);
  text-decoration: none;
}
::slotted(a[part='link']:hover) {
  color: var(--oas-color-primary-hover);
  text-decoration: underline;
  background: var(--oas-color-bg-hover);
}
/* 整栏禁用：子项统一降饱和（内置部件/原生 disabled 项另有自身禁用态） */
:host([disabled]) {
  cursor: not-allowed;
}
:host([disabled]) ::slotted(*) {
  opacity: 0.6;
}
/* size 档位：gap 微调 + native button 尺寸（内置部件自行读取 toolbar size） */
:host([size='small']) {
  gap: var(--oas-space-1);
}
:host([size='large']) {
  gap: var(--oas-space-2);
}
:host([size='small']) ::slotted(button) {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
:host([size='large']) ::slotted(button) {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-4);
}
/* 溢出收纳：被收项隐藏；「···」按钮 + 弹层 */
::slotted([data-collapsed]) {
  display: none !important;
}
.more {
  appearance: none;
  box-sizing: border-box;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-2);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
}
.more:hover {
  background: var(--oas-color-bg-hover);
}
.more:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.more[hidden] {
  display: none;
}
.more.child-selected {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.more-panel {
  position: absolute;
  top: calc(100% + var(--oas-space-1));
  right: 0;
  z-index: 10;
  min-width: 140px;
  max-height: 320px;
  overflow-y: auto;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg-elevated);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}
/* 弹层向下展开超出视口下缘时向上翻转（max-height 320px 兜底保留） */
.more-panel.flip-up {
  top: auto;
  bottom: calc(100% + var(--oas-space-1));
}
.more-panel[hidden] {
  display: none;
}
.mirror {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  text-align: left;
  padding: var(--oas-space-1_5) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  white-space: nowrap;
}
.mirror:hover {
  background: var(--oas-color-bg-hover);
}
.mirror:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.mirror:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
/* 镜像勾选项：menuitemcheckbox 语义，勾选由 CSS 前置样式表达（token 取色，替代文本前缀） */
.mirror[aria-checked='true']::before {
  content: '✓';
  margin-inline-end: var(--oas-space-1);
  color: var(--oas-color-primary);
  font-weight: 600;
}
/* 弹层打开时：溢出裁剪让位，弹层可见（含向左超出宿主左缘的部分） */
:host(.overflow-open) {
  z-index: 20;
  overflow: visible;
}
`

/** 参与工具栏导航的角色（native 控件按标签判断） */
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'menuitem',
  'combobox',
  'slider',
  'spinbutton',
  'tab',
])

export class OASToolbar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['orientation', 'loop', 'disabled', 'focusable-when-disabled', 'size']
  }

  private moreBtn: HTMLButtonElement | null = null
  private morePanel: HTMLElement | null = null
  /** 水平溢出收纳的 ResizeObserver（容器宽度变化时重算收纳） */
  private overflowObserver: ResizeObserver | null = null
  /** document 外点关闭器与 ResizeObserver 是否已注册（断开重连由 update 幂等恢复） */
  private boundExternals = false
  /** 弹层是否打开（「···」点开/收起） */
  private moreOpen = false
  /** focusable-when-disabled 模式下由本组件打 aria-disabled 的项（解除禁用时恢复） */
  private disabledMarked = new Set<HTMLElement>()
  /** far 分组中被本组件设置 margin 的项（重算时复位） */
  private farMarked = new Set<HTMLElement>()

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot name="start"></slot>
      <slot></slot>
      <slot name="end"></slot>
      <button class="more" part="more" type="button" aria-haspopup="menu" aria-expanded="false" hidden>···</button>
      <div class="more-panel" part="more-panel" role="menu" hidden></div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.setAttribute('role', 'toolbar')
    // 三个插槽（start/默认/end）任一内容变化都触发全量同步
    for (const s of this.shadow.querySelectorAll<HTMLSlotElement>('slot')) {
      s.addEventListener('slotchange', () => {
        this.syncSize()
        this.syncFar()
        this.syncLinkParts()
        this.syncRoving()
        this.syncOverflow()
      })
    }
    this.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 「···」弹层交互：点按开合、内部键盘导航、外部点击关闭（document 监听由 update 幂等恢复）
    this.moreBtn = this.shadow.querySelector('.more')
    this.morePanel = this.shadow.querySelector('.more-panel')
    this.moreBtn?.addEventListener('click', () => {
      if (this.moreOpen) this.closeMore(true)
      else this.openMore()
    })
    this.morePanel?.addEventListener('keydown', (e) => this.handlePanelKey(e as KeyboardEvent))
    // focusable-when-disabled：禁用但可聚焦，点击拦截（capture 先于子元素处理器）
    this.addEventListener(
      'click',
      (e) => {
        if (this.hasAttr('disabled') && this.hasAttr('focusable-when-disabled')) {
          e.preventDefault()
          e.stopPropagation()
        }
      },
      true,
    )
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.setAttribute('aria-label', this.t('toolbar.label'))
    const orientation = this.getAttr('orientation', 'horizontal')
    this.setAttribute('aria-orientation', orientation)
    this.classList.toggle('vertical', orientation === 'vertical')
    // 「···」可访问名称（locale 反应式）
    if (this.moreBtn) this.moreBtn.setAttribute('aria-label', this.t('toolbar.more'))
    if (this.morePanel) this.morePanel.setAttribute('aria-label', this.t('toolbar.more'))
    this.syncDisabled()
    this.syncSize()
    this.syncFar()
    this.syncLinkParts()
    this.syncRoving()
    this.syncOverflow()
    // document 外点关闭器 + ResizeObserver：断开重连由 update 幂等恢复（防重连后丢失）
    this.syncExternalListeners()
  }

  /**
   * 幂等注册/恢复「document 级」监听（参照 back-top updateScrollTarget 的 update() 恢复模式）：
   * - document pointerdown 弹层外点关闭器
   * - ResizeObserver 宽度变化重算收纳
   *
   * 为什么在 update() 恢复：断连时 onCleanup 会移除它们，重连只走 update()（rendered 已 true
   * 不再跑 render/bind）——若只注册在 bind()，重连后弹层外点关闭与宽度重算永久丢失。
   * boundExternals 守卫保证同一连接周期只注册一次（属性变化触发多次 update 不重复注册）。
   */
  private syncExternalListeners(): void {
    if (this.boundExternals) return
    const onDocPointer = (e: PointerEvent): void => {
      if (!this.moreOpen) return
      const path = e.composedPath()
      if (path.includes(this)) return
      this.closeMore()
    }
    document.addEventListener('pointerdown', onDocPointer)
    this.onCleanup(() => {
      document.removeEventListener('pointerdown', onDocPointer)
      this.boundExternals = false
      this.closeMore()
    })
    // 水平溢出收纳：容器宽度变化时重算收纳
    if (typeof ResizeObserver !== 'undefined') {
      this.overflowObserver = new ResizeObserver(() => this.syncOverflow())
      this.overflowObserver.observe(this)
      this.onCleanup(() => {
        this.overflowObserver?.disconnect()
        this.overflowObserver = null
      })
    }
    this.boundExternals = true
  }

  /** 整栏禁用：aria-disabled + inert（真禁用）/ focusable-when-disabled（可聚焦禁交互） */
  private syncDisabled(): void {
    const disabled = this.hasAttr('disabled')
    const focusable = this.hasAttr('focusable-when-disabled')
    if (disabled) this.setAttribute('aria-disabled', 'true')
    else this.removeAttribute('aria-disabled')
    if (disabled && !focusable) this.setAttribute('inert', '')
    else this.removeAttribute('inert')
    if (disabled && focusable) {
      // focusable-when-disabled：给所有 roving 项打 aria-disabled（保持可聚焦，视觉禁用）
      for (const el of this.items()) {
        if (!el.hasAttribute('aria-disabled')) {
          el.setAttribute('aria-disabled', 'true')
          this.disabledMarked.add(el)
        }
      }
    } else {
      for (const el of this.disabledMarked) el.removeAttribute('aria-disabled')
      this.disabledMarked.clear()
    }
  }

  /** size → CSS 变量 + 每个 roving 项 data-size（native button 的 ::slotted 尺寸钩子） */
  private syncSize(): void {
    const size = this.getAttr('size', '')
    if (size === 'small' || size === 'medium' || size === 'large') {
      this.style.setProperty('--oas-toolbar-size', size)
    } else {
      this.style.removeProperty('--oas-toolbar-size')
    }
    for (const el of this.items()) el.setAttribute('data-size', size || 'medium')
  }

  /** far 分组：首个 data-toolbar-far 子项 margin auto 推到远端（横向右/纵向下） */
  private syncFar(): void {
    for (const el of this.farMarked) {
      el.style.removeProperty('margin-inline-start')
      el.style.removeProperty('margin-block-start')
    }
    this.farMarked.clear()
    const vertical = this.getAttr('orientation', 'horizontal') === 'vertical'
    const prop = vertical ? 'margin-block-start' : 'margin-inline-start'
    const firstFar = [...this.children].find((c) => c.hasAttribute('data-toolbar-far'))
    if (firstFar) {
      ;(firstFar as HTMLElement).style.setProperty(prop, 'auto')
      this.farMarked.add(firstFar as HTMLElement)
    }
  }

  /** 链接项（a[href]）显式 part="link"（供 ::slotted 链接样式，不覆盖已有 part） */
  private syncLinkParts(): void {
    for (const c of this.children) {
      if (c.tagName === 'A' && c.hasAttribute('href') && !c.hasAttribute('part')) {
        c.setAttribute('part', 'link')
      }
    }
  }

  /**
   * 参与 roving 的可导航项（light DOM 直接子元素）：
   * - native 控件（button/input/select/textarea/a[href]）
   * - 交互 role（button/checkbox/…）
   * - 自定义元素（tag 含 '-'，如 oas-button / oas-toolbar-toggle / oas-toolbar-input）
   * 排除：oas-toolbar-separator（结构分隔符，即使 ignore 属性尚未同步也按 tag 排除）、
   *       data-toolbar-ignore / aria-hidden / disabled；
   *       aria-disabled 仅在 focusable-when-disabled 模式下放行（禁用仍可聚焦）。
   */
  private items(): HTMLElement[] {
    const focusableDisabled = this.hasAttr('disabled') && this.hasAttr('focusable-when-disabled')
    return (
      [...this.children]
        .filter((c): c is HTMLElement => {
          const el = c as HTMLElement
          if (el.tagName === 'OAS-TOOLBAR-SEPARATOR') return false
          if (el.hasAttribute('data-toolbar-ignore')) return false
          if (el.hasAttribute('aria-hidden')) return false
          if (el.hasAttribute('disabled')) return false
          if (el.getAttribute('aria-disabled') === 'true' && !focusableDisabled) return false
          const tag = el.tagName
          const role = el.getAttribute('role')
          if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')
            return true
          if (tag === 'A' && el.hasAttribute('href')) return true
          if (role && INTERACTIVE_ROLES.has(role)) return true
          if (tag.includes('-')) return true
          return false
        })
        // 按视觉顺序排序：slot="start" → 默认 → slot="end"（与 shadow 内插槽渲染顺序一致，
        // 保证 roving/溢出收纳的索引与用户看到的位置一致）
        .sort((a, b) => this.slotRank(a) - this.slotRank(b))
    )
  }

  /** 插槽视觉位次：start 前部 / 默认中部 / end 尾端 */
  private slotRank(el: HTMLElement): number {
    const s = el.getAttribute('slot')
    if (s === 'start') return 0
    if (s === 'end') return 2
    return 1
  }

  /** roving tabindex：只把当前项放入 Tab 序列，其余 -1；整栏真禁用时不设 tabindex */
  private syncRoving(): void {
    const focusableDisabled = this.hasAttr('disabled') && this.hasAttr('focusable-when-disabled')
    if (this.hasAttr('disabled') && !focusableDisabled) {
      for (const c of this.children) {
        if (c.hasAttribute('tabindex')) c.removeAttribute('tabindex')
      }
      return
    }
    const list = this.items()
    const ae = document.activeElement as HTMLElement | null
    let focusIdx = list.findIndex((el) => el === ae || el.shadowRoot?.contains(ae))
    if (focusIdx < 0) focusIdx = 0
    list.forEach((el, i) => {
      el.setAttribute('tabindex', i === focusIdx ? '0' : '-1')
    })
  }

  private handleKey(e: KeyboardEvent): void {
    const ae = document.activeElement as HTMLElement | null
    if (!ae) return
    // 焦点在本组件自身 shadow（「···」按钮/弹层）：方向键由弹层键盘接管
    if (this.shadow.contains(ae)) return
    // 焦点在文本编辑控件：方向键由输入/文本编辑消费（roving 豁免）
    if (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable) return
    const list = this.items()
    if (list.length === 0) return
    const cur = list.findIndex((el) => el === ae || el.shadowRoot?.contains(ae))
    // 复合部件（toggle 组/输入框）：内部焦点时方向键由部件接管（组内 roving/文本编辑）
    if (cur >= 0) {
      const curEl = list[cur] as HTMLElement | undefined
      if (
        curEl?.shadowRoot?.activeElement &&
        (curEl.tagName === 'OAS-TOOLBAR-TOGGLE' || curEl.tagName === 'OAS-TOOLBAR-INPUT')
      ) {
        return
      }
    }
    const loop = this.getAttr('loop', '') !== 'false'
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (cur < 0) {
        this.focusTo(0)
      } else if (cur + 1 >= list.length) {
        if (loop) this.focusTo(0)
      } else {
        this.focusTo(cur + 1)
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (cur < 0) {
        this.focusTo(list.length - 1)
      } else if (cur - 1 < 0) {
        if (loop) this.focusTo(list.length - 1)
      } else {
        this.focusTo(cur - 1)
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.focusTo(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.focusTo(list.length - 1)
    }
  }

  private focusTo(idx: number): void {
    const el = this.items()[idx]
    if (!el) return
    el.focus()
    this.syncRoving()
  }

  // ========== 水平溢出收纳（窄容器收进「···」弹层） ==========

  /**
   * 重算溢出收纳：容器宽度不足时，超出项打 data-collapsed 隐藏并镜像进「···」弹层。
   * 公开：宿主可在布局变化后手动触发（ResizeObserver 已自动监听）。
   */
  syncOverflow(): void {
    const moreBtn = this.moreBtn
    const panel = this.morePanel
    if (!moreBtn || !panel) return
    if (this.getAttr('orientation', 'horizontal') === 'vertical') {
      moreBtn.hidden = true
      this.closeMore()
      return
    }
    const list = this.items()
    // 先复位再测量：collapsed 项 display:none 宽为 0，直接量会把已收纳态误判成无溢出
    for (const t of list) t.removeAttribute('data-collapsed')
    if (list.length === 0) {
      moreBtn.hidden = true
      this.closeMore()
      return
    }
    // SSR/未布局环境（clientWidth 为 0）不判定溢出——否则 happy-dom 下 offsetWidth=0 而 gap>0，
    // 从第二项起全部误标 data-collapsed，SSR 快照隐藏它们，水合后测量恢复 → 布局漂移
    const avail = this.clientWidth
    if (avail <= 0) {
      moreBtn.hidden = true
      this.closeMore()
      return
    }
    // 显示「···」量出其宽度（有溢出时它要占位，可用宽度须扣除；无溢出最后会再隐藏）
    moreBtn.hidden = false
    const moreWidth = moreBtn.offsetWidth
    // 溢出判定用 scrollWidth > clientWidth（真实溢出）而非「项宽+gap 累加 vs clientWidth」——
    // shrink-to-fit 容器（inline-flex 无宽度约束）内容恒等于容器宽，累加算法会因
    // gap 生效时机（token 注入早晚）产生假溢出，把永远装得下的项误收（SSR 水合后布局漂移）
    const realOverflow = this.scrollWidth > this.clientWidth + 1
    // flex gap 不占 offsetWidth，按计算样式解析（未解析时兜底 --oas-space-1 = 4px）
    let gap = 4
    const gapRaw = getComputedStyle(this).gap
    const gm = /([\d.]+)px/.exec(gapRaw || '')
    if (gm) gap = Number(gm[1])
    const calc = (availWidth: number): number => {
      let acc = 0
      for (let i = 0; i < list.length; i++) {
        acc += list[i]!.offsetWidth + (i > 0 ? gap : 0)
        if (acc > availWidth) return i
      }
      return -1
    }
    let firstOverflow = realOverflow ? calc(avail) : -1
    if (firstOverflow !== -1 && moreWidth > 0) {
      // 有溢出：「···」自身占 moreWidth，重算首个溢出项；兜底至少收一项腾位
      firstOverflow = calc(avail - moreWidth)
      if (firstOverflow === -1) firstOverflow = list.length - 1
    }
    if (firstOverflow === -1) {
      moreBtn.hidden = true
      this.closeMore()
      return
    }
    list.forEach((t, i) => t.toggleAttribute('data-collapsed', i >= firstOverflow))
    moreBtn.hidden = false
    moreBtn.setAttribute('aria-expanded', this.moreOpen ? 'true' : 'false')
    // 「···」高亮：当前选中项被收纳时（toggle 组内选中项在弹层里，条上无指示）
    const selectedInside = this.hasSelectedInside(list, firstOverflow)
    moreBtn.classList.toggle('child-selected', selectedInside)
    if (selectedInside) moreBtn.setAttribute('aria-current', 'true')
    else moreBtn.removeAttribute('aria-current')
    this.renderMoreMirror(list.slice(firstOverflow))
  }

  /** 被收纳项里是否有选中态（单选 toggle 组的选中值被收时「···」高亮） */
  private hasSelectedInside(list: HTMLElement[], from: number): boolean {
    for (const t of list.slice(from)) {
      if (t.tagName === 'OAS-TOOLBAR-TOGGLE') {
        const v = (t as unknown as OASToolbarToggle).selectedValues
        if (v.length > 0) return true
      }
    }
    return false
  }

  /** 弹层镜像：被收项 → role=menuitem 按钮（toggle 项为 menuitemcheckbox），点击派发到原控件 */
  private renderMoreMirror(collapsed: HTMLElement[]): void {
    const panel = this.morePanel
    if (!panel) return
    panel.innerHTML = ''
    for (const t of collapsed) {
      if (t.tagName === 'OAS-TOOLBAR-TOGGLE') {
        const toggle = t as unknown as OASToolbarToggle
        const selected = toggle.selectedValues
        for (const item of toggle.items) {
          const btn = this.createMirrorButton(item.label, t, item.value)
          if (item.disabled) btn.disabled = true
          // toggle 镜像项语义：menuitemcheckbox + aria-checked（勾选由 CSS 前置样式表达）
          btn.setAttribute('role', 'menuitemcheckbox')
          btn.setAttribute('aria-checked', String(selected.includes(item.value)))
          btn.textContent = item.label
          panel.appendChild(btn)
        }
        continue
      }
      const btn = this.createMirrorButton(this.itemLabel(t), t)
      // 输入框无法在弹层里输入：镜像项禁用（仅提示存在）
      if (t.tagName === 'OAS-TOOLBAR-INPUT') btn.disabled = true
      panel.appendChild(btn)
    }
  }

  private createMirrorButton(
    label: string,
    origin: HTMLElement,
    value?: string,
  ): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'mirror'
    btn.setAttribute('role', 'menuitem')
    btn.setAttribute('part', 'mirror-item')
    btn.textContent = label
    btn.addEventListener('click', () => {
      this.invokeOrigin(origin, value)
      this.closeMore(true)
    })
    return btn
  }

  private invokeOrigin(origin: HTMLElement, value?: string): void {
    if (origin.tagName === 'OAS-TOOLBAR-TOGGLE' && value != null) {
      ;(origin as unknown as { selectValue(v: string): void }).selectValue(value)
      return
    }
    origin.click()
  }

  /** 镜像项标签：aria-label > 文本 > placeholder（输入框）> 兜底 */
  private itemLabel(el: HTMLElement): string {
    const label = el.getAttribute('aria-label')
    if (label) return label
    const text = (el.textContent ?? '').trim()
    if (text) return text
    if (el.tagName === 'OAS-TOOLBAR-INPUT') {
      return el.getAttribute('placeholder') || this.t('toolbar.input')
    }
    return this.t('toolbar.item')
  }

  private openMore(): void {
    if (!this.morePanel || !this.moreBtn) return
    this.moreOpen = true
    this.morePanel.hidden = false
    this.moreBtn.setAttribute('aria-expanded', 'true')
    this.classList.add('overflow-open')
    // 视口下缘翻转（防御：面板固定向下展开，底部超视口时向上弹；max-height 320px 兜底保留）
    const rect = this.morePanel.getBoundingClientRect()
    this.morePanel.classList.toggle('flip-up', rect.bottom > (window.innerHeight || 0))
    const first = this.morePanel.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])',
    )
    first?.focus()
  }

  /** 收起弹层；returnFocus 时把焦点还给「···」按钮 */
  private closeMore(returnFocus = false): void {
    if (!this.moreOpen) return
    this.moreOpen = false
    if (this.morePanel) this.morePanel.hidden = true
    if (this.moreBtn) {
      this.moreBtn.setAttribute('aria-expanded', 'false')
      if (returnFocus) this.moreBtn.focus()
    }
    this.classList.remove('overflow-open')
  }

  /** 弹层键盘：Esc 关闭回焦（无镜像项时也生效）；方向键移动、Home/End、Enter/Space 选择 */
  private handlePanelKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.closeMore(true)
      return
    }
    const items = [
      ...this.morePanel!.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])',
      ),
    ]
    if (items.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      this.movePanelFocus(items, 1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      this.movePanelFocus(items, -1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  private movePanelFocus(items: HTMLButtonElement[], dir: 1 | -1): void {
    const cur = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = items[(cur + dir + items.length) % items.length]
    next?.focus()
  }
}
