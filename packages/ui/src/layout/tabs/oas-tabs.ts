import { OASElement } from '@oas-ui/core'
import type { OASTabPanel } from './oas-tab-panel.js'

const STYLE = `
:host {
  display: block;
  width: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
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
  color: #fff;
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  white-space: nowrap;
}

/* 关闭按钮（span role=button，避免 button 嵌套被解析器挤出） */
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
    return ['active', 'type', 'closable', 'tab-position']
  }

  private panels: OASTabPanel[] = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tablist" part="tablist" role="tablist"></div>
      <div class="panel" part="panel"><slot></slot></div>
    `
    this.shadow
      .querySelector('.tablist')
      ?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 宿主增删 oas-tab-panel（如 closable 场景外部移除面板）时增量刷新标签栏
    const observer = new MutationObserver(() => this.update())
    observer.observe(this, { childList: true })
    this.onCleanup(() => observer.disconnect())
    this.update()
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
    tablist.className = `tablist${vertical ? ' tablist--vertical' : ''}`
    tablist.innerHTML = ''
    const active = this.getAttr('active', '')
    let firstValue = ''
    this.panels.forEach((panel, idx) => {
      const value = panel.getAttribute('value') ?? ''
      if (idx === 0) firstValue = value
      const btn = document.createElement('button')
      btn.className = 'tab'
      btn.classList.toggle('tab--card', type === 'card')
      btn.setAttribute('part', 'tab')
      btn.setAttribute('role', 'tab')
      btn.setAttribute('aria-selected', String(value === (active || firstValue)))

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

      // 关闭按钮：span role=button（避免 button 内嵌 button 被解析器挤出）
      if (closable) {
        const close = document.createElement('span')
        close.className = 'tab-close'
        close.setAttribute('role', 'button')
        close.setAttribute('tabindex', '0')
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

      btn.addEventListener('click', () => {
        this.setAttribute('active', value)
        this.emit('change', { value })
        this.update()
      })
      tablist.appendChild(btn)
    })
    const selected = active || firstValue
    for (const panel of this.panels) {
      const isActive = panel.getAttribute('value') === selected
      panel.hidden = !isActive
    }
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
  }
}
