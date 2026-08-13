import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'
import type { OASTabPanel } from './oas-tab-panel.js'

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.tablist {
  display: flex;
  border-bottom: 1px solid var(--oas-color-border);
  margin: 0;
  padding: 0;
  list-style: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-2) var(--oas-space-4);
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
  border-bottom-color: var(--oas-color-primary);
  font-weight: 500;
}
.panel {
  padding-top: var(--oas-space-4);
}

/* 图标 tab：icon 属性 / slot="icon" 渲染的图标位（装饰性，读屏隐藏） */
.tab-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: var(--oas-font-size-md);
  color: inherit;
}
.tab-icon svg {
  display: block;
}

/* 新增按钮（addable）：native button，+ 图标，focus 环可见 */
.tab-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 24px;
  height: 24px;
  margin-inline-start: var(--oas-space-1);
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
}
.tab-add:hover {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.tab-add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}

/* tab 徽标：数字/文本小圆角标签 */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  white-space: nowrap;
}

/* 关闭按钮：span（非原生 button）——原生 button 会被 axe 视为 tablist 的
   不允许子元素/与 role=tab 构成交互嵌套；tabindex=-1 可脚本聚焦（读屏可激活），
   不进 Tab 顺序（避免嵌套交互违规），Enter/Space 由组件内 keydown 处理 */
.tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
}
.tab-close:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.tab-close:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}

/* 卡片式（type=card）：标签带边框、激活标签与面板连通、四边有线 */
:host(.oas-tabs--card) .tablist {
  border-bottom: none;
  gap: var(--oas-space-1);
}
:host(.oas-tabs--card) .tab {
  border: 1px solid var(--oas-color-border);
  border-bottom: none;
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
  margin-bottom: -1px;
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
:host(.oas-tabs--card) .tab[aria-selected='true'] {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid var(--oas-color-bg);
  background: var(--oas-color-bg);
}
:host(.oas-tabs--card) .panel {
  margin-top: -1px;
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: 0 var(--oas-radius-md) var(--oas-radius-md) var(--oas-radius-md);
  background: var(--oas-color-bg);
}

/* 标签位置：bottom（面板在上、标签在下） */
:host(.oas-tabs--bottom) {
  display: flex;
  flex-direction: column;
}
:host(.oas-tabs--bottom) .tablist {
  order: 1;
  border-bottom: none;
  border-top: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--bottom) .panel {
  order: 0;
  padding-top: 0;
  padding-bottom: var(--oas-space-4);
}
:host(.oas-tabs--bottom) .tab {
  border-bottom: none;
  border-top: 2px solid transparent;
  margin-bottom: 0;
  margin-top: -1px;
}
:host(.oas-tabs--bottom) .tab[aria-selected='true'] {
  border-bottom-color: transparent;
  border-top-color: var(--oas-color-primary);
}

/* 标签位置：left / right（标签纵向排列、面板在旁） */
:host(.oas-tabs--vertical) {
  display: flex;
  align-items: stretch;
}
:host(.oas-tabs--vertical) .tablist {
  flex-direction: column;
  border-bottom: none;
  flex-shrink: 0;
}
:host(.oas-tabs--vertical) .tab {
  border-bottom: none;
  margin-bottom: 0;
}
:host(.oas-tabs--vertical) .panel {
  padding-top: 0;
  flex: 1;
  min-width: 0;
}
:host(.oas-tabs--left) .tablist {
  border-right: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--left) .tab {
  border-right: 2px solid transparent;
  margin-right: -1px;
}
:host(.oas-tabs--left) .tab[aria-selected='true'] {
  border-right-color: var(--oas-color-primary);
}
:host(.oas-tabs--left) .panel {
  padding-left: var(--oas-space-4);
}
:host(.oas-tabs--right) .tablist {
  order: 1;
  border-left: 1px solid var(--oas-color-border);
}
:host(.oas-tabs--right) .tab {
  border-left: 2px solid transparent;
  margin-left: -1px;
  /* 镜像 left：内容右对齐贴标签栏右边缘 */
  justify-content: flex-end;
}
:host(.oas-tabs--right) .tab[aria-selected='true'] {
  border-left-color: var(--oas-color-primary);
}
:host(.oas-tabs--right) .panel {
  order: 0;
  padding-right: var(--oas-space-4);
}

/* card 卡片式 + bottom：镜像顶部连通 */
:host(.oas-tabs--card.oas-tabs--bottom) .tablist {
  border-top: none;
}
:host(.oas-tabs--card.oas-tabs--bottom) .tab {
  border-bottom: 1px solid var(--oas-color-border);
  border-top: none;
  border-radius: 0 0 var(--oas-radius-md) var(--oas-radius-md);
  margin-bottom: 0;
  margin-top: -1px;
}
:host(.oas-tabs--card.oas-tabs--bottom) .tab[aria-selected='true'] {
  border-top: 1px solid var(--oas-color-bg);
}
:host(.oas-tabs--card.oas-tabs--bottom) .panel {
  margin-top: 0;
  margin-bottom: -1px;
  border-radius: var(--oas-radius-md) var(--oas-radius-md) 0 0;
}

/* card 卡片式 + 纵向：独立盒式（每标签全边框圆角、面板独立） */
:host(.oas-tabs--card.oas-tabs--vertical) .tablist {
  border: none;
  gap: var(--oas-space-1);
}
:host(.oas-tabs--card.oas-tabs--vertical) .tab {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  margin: 0;
  background: var(--oas-color-bg-hover);
}
:host(.oas-tabs--card.oas-tabs--vertical) .tab[aria-selected='true'] {
  border: 1px solid var(--oas-color-primary);
  border-bottom: 1px solid var(--oas-color-primary);
  background: var(--oas-color-bg);
}
:host(.oas-tabs--card.oas-tabs--vertical) .panel {
  margin: 0;
  border-radius: var(--oas-radius-md);
}
`

export class OASTabs extends OASElement {
  static override get observedAttributes(): string[] {
    return ['active', 'type', 'closable', 'addable', 'tab-position']
  }

  private panels: OASTabPanel[] = []
  private observer: MutationObserver | null = null
  /** 新增按钮引用（重建后更新；用于焦点归属捕获与恢复） */
  private addBtn: HTMLButtonElement | null = null
  /** 上次重建时的面板数（判断「点击 + 后宿主是否新增了面板」） */
  private prevPanelCount = -1

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist" role="tablist"></div>
      <div class="panel" part="panel"><slot></slot></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.shadow
      .querySelector('.tablist')
      ?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 宿主增删 oas-tab-panel（如 closable 场景外部移除面板）时增量刷新标签栏
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true })
    this.onCleanup(() => this.observer?.disconnect())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（tablist 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tablist')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.panels = [...this.querySelectorAll('oas-tab-panel')] as OASTabPanel[]
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return
    // 样式变体：line（下划线，默认）/ card（卡片式）
    const type = this.getAttr('type', 'line')
    // 标签栏位置：top（默认）/ left / right / bottom
    const position = this.getAttr('tab-position', 'top')
    const vertical = position === 'left' || position === 'right'
    this.classList.toggle('oas-tabs--card', type === 'card')
    this.classList.toggle('oas-tabs--vertical', vertical)
    this.classList.toggle('oas-tabs--left', position === 'left')
    this.classList.toggle('oas-tabs--right', position === 'right')
    this.classList.toggle('oas-tabs--bottom', position === 'bottom')
    const closable = this.hasAttr('closable')
    const addable = this.hasAttr('addable')

    // 重建前捕获 tablist 内焦点归属（动态增删后焦点恢复的依据）
    const focused = this.captureFocused()
    const added = focused?.type === 'add' && this.panels.length > this.prevPanelCount
    this.prevPanelCount = this.panels.length

    tablist.className = `tablist${vertical ? ' tablist--vertical' : ''}`
    tablist.innerHTML = ''
    const active = this.getAttr('active', '')
    let firstValue = ''
    this.panels.forEach((panel, idx) => {
      const value = panel.getAttribute('value') ?? ''
      if (idx === 0) firstValue = value
      const isSelected = value === (active || firstValue)
      const btn = document.createElement('button')
      btn.className = 'tab'
      btn.classList.toggle('tab--card', type === 'card')
      btn.setAttribute('part', 'tab')
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(isSelected))
      // roving tabindex：仅选中标签进 Tab 顺序，其余 tabindex=-1（动态增删后由
      // restoreFocus 重新落地焦点，Tab/方向键流保持）
      btn.setAttribute('tabindex', isSelected ? '0' : '-1')
      btn.setAttribute('data-value', value)

      // 图标：icon 属性（iconRegistry 内联 SVG）优先；否则取面板直接子元素
      // [slot="icon"] 克隆进图标位（装饰性，读屏隐藏）
      const iconName = panel.getAttribute('icon')
      const iconContent = iconName ? iconRegistry[iconName as IconName] : undefined
      let slotIcon: HTMLElement | null = null
      if (!iconContent) {
        for (const child of panel.children) {
          if (child.getAttribute('slot') === 'icon') {
            slotIcon = child as HTMLElement
            break
          }
        }
      }
      if (iconContent || slotIcon) {
        const iconEl = document.createElement('span')
        iconEl.className = 'tab-icon'
        iconEl.setAttribute('aria-hidden', 'true')
        if (iconContent) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('viewBox', '0 0 16 16')
          svg.setAttribute('width', '1em')
          svg.setAttribute('height', '1em')
          svg.setAttribute('aria-hidden', 'true')
          svg.setAttribute('focusable', 'false')
          svg.innerHTML = iconContent
          iconEl.appendChild(svg)
        } else if (slotIcon) {
          iconEl.appendChild(slotIcon.cloneNode(true))
        }
        btn.appendChild(iconEl)
      }

      const label = document.createElement('span')
      label.className = 'tab-label'
      label.textContent = panel.getAttribute('label') ?? ''
      btn.appendChild(label)

      // 徽标：数字或文本，紧邻标题
      const badge = panel.getAttribute('badge')
      if (badge) {
        const badgeEl = document.createElement('span')
        badgeEl.className = 'tab-badge'
        badgeEl.textContent = badge
        btn.appendChild(badgeEl)
      }

      // 关闭按钮：span tabindex=-1（无 role，避免 axe nested-interactive 判为
      // 可交互控件嵌套 / tablist 不允许子元素）；读屏可经 aria-label 命名并激活，
      // Enter/Space 走组件内 keydown
      if (closable) {
        const close = document.createElement('span')
        close.className = 'tab-close'
        close.setAttribute('tabindex', '-1')
        close.setAttribute('aria-label', this.t('tabs.close'))
        close.innerHTML = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
        close.addEventListener('click', (e: Event) => {
          e.stopPropagation()
          this.emit('close', { key: value })
        })
        close.addEventListener('keydown', (e: Event) => {
          const k = e as KeyboardEvent
          if (k.key !== 'Enter' && k.key !== ' ') return
          k.preventDefault()
          k.stopPropagation()
          this.emit('close', { key: value })
        })
        btn.appendChild(close)
      }

      btn.addEventListener('click', () => this.activate(value))
      tablist.appendChild(btn)
    })

    // 新增按钮（addable）：native button，Enter/Space 原生触发 click → oas-add。
    // 作为 tablist 直接子元素必须声明 role=tab（axe aria-required-children：tablist 只允许
    // tab 子元素）。占位 tab 语义：aria-selected=false + tabindex=0，
    // Tab 键可到达（其余真实标签为 roving tabindex），读屏作为「未选中占位 tab」。
    this.addBtn = null
    if (addable) {
      const add = document.createElement('button')
      add.className = 'tab-add'
      add.setAttribute('part', 'add-button')
      add.setAttribute('role', 'tab')
      add.setAttribute('aria-selected', 'false')
      add.setAttribute('tabindex', '0')
      add.setAttribute('aria-label', this.t('tabs.add'))
      add.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">${iconRegistry['plus']}</svg>`
      add.addEventListener('click', () => {
        this.emit('add', { label: this.t('tabs.newTab') })
      })
      this.addBtn = add
      tablist.appendChild(add)
    }

    const selected = active || firstValue
    for (const panel of this.panels) {
      const isActive = panel.getAttribute('value') === selected
      panel.hidden = !isActive
    }

    // 重建后恢复焦点（点击 + / 关闭 / 方向键切换后焦点不丢）
    this.restoreFocus(focused, added)
  }

  private handleKey(e: KeyboardEvent): void {
    const values = this.panels.map((p) => p.getAttribute('value') ?? '')
    const active = this.getAttr('active', '') || values[0] || ''
    const idx = values.indexOf(active)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.activate(values[(idx + 1) % values.length] ?? '')
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.activate(values[(idx - 1 + values.length) % values.length] ?? '')
    }
  }

  private activate(value: string): void {
    this.setAttribute('active', value)
    this.emit('change', { value })
    this.update()
    // 激活后焦点落到新激活标签（方向键/点击切换时 roving tabindex 同步）
    this.findTabByValue(value)?.focus({ preventScroll: true })
  }

  /**
   * 捕获 tablist 内当前焦点的归属：'add'（+ 按钮）| 'tab'/'close' + 标签 value |
   * null（焦点不在 tablist 内，如初始渲染/宿主聚焦他处）。
   * 注意：焦点在 shadow DOM 内时 document.activeElement 只返回宿主，
   * 必须用 this.shadow.activeElement 才能拿到真正聚焦的元素。
   */
  private captureFocused(): { type: 'tab' | 'close' | 'add'; value: string } | null {
    const tablist = this.shadow.querySelector('.tablist')
    const active = this.shadow.activeElement
    if (!tablist || !tablist.contains(active)) return null
    if (this.addBtn && active === this.addBtn) return { type: 'add', value: '' }
    const btn = (active as HTMLElement).closest('[role="tab"]')
    if (!btn) return null
    const close = (active as HTMLElement).closest('.tab-close')
    return {
      type: close ? 'close' : 'tab',
      value: (btn as HTMLElement).getAttribute('data-value') ?? '',
    }
  }

  /** 重建后按捕获的焦点归属恢复焦点；标签被移除时落到当前选中标签 */
  private restoreFocus(
    focused: { type: 'tab' | 'close' | 'add'; value: string } | null,
    added: boolean,
  ): void {
    if (!focused) return
    if (focused.type === 'add') {
      // + 按钮触发且宿主新增了面板 → 焦点落到新标签（最后追加的面板）；
      // 否则仍留在 + 按钮
      const target = added ? this.lastTabButton() : this.addBtn
      target?.focus({ preventScroll: true })
      return
    }
    const btn = this.findTabByValue(focused.value)
    if (btn) {
      const target = focused.type === 'close' ? btn.querySelector<HTMLElement>('.tab-close') : btn
      ;(target ?? btn).focus({ preventScroll: true })
    } else {
      // 焦点所在标签已被移除 → 落到当前选中标签
      this.shadow
        .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true })
    }
  }

  private findTabByValue(value: string): HTMLElement | null {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return null
    // 限定带 data-value 的真实标签（排除 + 占位 tab）
    for (const el of tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')) {
      if (el.getAttribute('data-value') === value) return el
    }
    return null
  }

  private lastTabButton(): HTMLElement | null {
    const tablist = this.shadow.querySelector('.tablist')
    if (!tablist) return null
    // 限定带 data-value 的真实标签（+ 占位 tab 在末尾，不能作为「最后追加的面板」落焦点）
    const tabs = tablist.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
    return tabs.length ? (tabs[tabs.length - 1] ?? null) : null
  }
}
