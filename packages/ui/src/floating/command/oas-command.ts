import { OASElement } from '@oas-ui/core'

export interface CommandItem {
  /** 显示文案 */
  label: string
  /** 选中值（oas-select detail.value） */
  value: string
  /** 搜索关键词（可选），参与 label 之外的匹配 */
  keywords?: string[]
  /** 分组名（可选），同组项渲染分组标题 */
  group?: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.overlay {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  z-index: var(--oas-z-modal, 1050);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 20vh;
}
.overlay[hidden] {
  display: none;
}
.panel {
  box-sizing: border-box;
  width: 560px;
  max-width: 90vw;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  color: var(--oas-color-text-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.search {
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-lg);
  padding: 0 var(--oas-space-3);
  border: none;
  border-bottom: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg);
  font-family: inherit;
  outline: none;
}
.search:focus {
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
.list {
  max-height: 40vh;
  overflow-y: auto;
  padding: var(--oas-space-1);
}
.group {
  padding: var(--oas-space-2) var(--oas-space-3) var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
.option {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.option:hover {
  background: var(--oas-color-bg-hover);
}
.option.active,
.option.active:hover {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.empty {
  padding: var(--oas-space-5);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASCommand extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'open']
  }

  private itemsList: CommandItem[] = []
  private overlayEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private listEl: HTMLElement | null = null
  private searchEl: HTMLInputElement | null = null
  /** 当前过滤后可见项（不含分组标题），与渲染顺序一一对应 */
  private visibleItems: CommandItem[] = []
  private activeIndex = 0
  private query = ''
  private wasOpen = false
  private previousFocus: HTMLElement | null = null
  private optionSeq = 0

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="overlay" part="overlay" hidden>
        <div class="panel" part="panel" role="dialog" aria-modal="true">
          <input class="search" part="search" type="text" role="combobox"
            aria-autocomplete="list" aria-expanded="true" />
          <div class="list" part="list" role="listbox"></div>
        </div>
      </div>
    `
    this.overlayEl = this.shadow.querySelector('.overlay')
    this.panelEl = this.shadow.querySelector('.panel')
    this.listEl = this.shadow.querySelector('.list')
    this.searchEl = this.shadow.querySelector('.search')

    this.searchEl?.addEventListener('input', () => {
      this.query = this.searchEl?.value ?? ''
      this.activeIndex = 0
      this.renderList()
    })
    this.searchEl?.addEventListener('keydown', (e) => this.handleSearchKey(e as KeyboardEvent))
    // 点击遮罩空白处关闭
    this.overlayEl?.addEventListener('click', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('overlay')) this.close()
    })

    const onDocumentKey = (e: KeyboardEvent): void => {
      // ⌘K / Ctrl+K 切换
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        this.toggle()
        return
      }
      if (e.key === 'Escape' && this.hasAttr('open')) {
        e.preventDefault()
        this.close()
        return
      }
      // 焦点陷阱：打开时 Tab 在面板内循环
      if (e.key === 'Tab' && this.hasAttr('open')) this.trapTab(e)
    }
    document.addEventListener('keydown', onDocumentKey)
    this.onCleanup(() => document.removeEventListener('keydown', onDocumentKey))
    this.update()
  }

  protected override update(): void {
    this.parseItems()
    const open = this.hasAttr('open')
    if (this.overlayEl) this.overlayEl.hidden = !open
    if (this.panelEl) this.panelEl.setAttribute('aria-label', this.t('command.label'))
    if (this.searchEl) {
      this.searchEl.setAttribute('aria-label', this.t('command.search'))
      this.searchEl.placeholder = this.t('command.placeholder')
    }
    // 打开：记录来源焦点并聚焦输入框；关闭：归还焦点
    if (open && !this.wasOpen) {
      this.wasOpen = true
      this.previousFocus = document.activeElement as HTMLElement
      this.query = ''
      this.activeIndex = 0
      if (this.searchEl) {
        this.searchEl.value = ''
        this.searchEl.focus()
      }
    } else if (!open && this.wasOpen) {
      this.wasOpen = false
      this.previousFocus?.focus()
      this.previousFocus = null
    }
    this.renderList()
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.close()
    else this.setAttribute('open', '')
  }

  private close(): void {
    this.removeAttribute('open')
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter(
            (i): i is CommandItem =>
              !!i && typeof i === 'object' && typeof i.label === 'string' && typeof i.value === 'string',
          )
        : []
    } catch {
      this.itemsList = []
    }
  }

  private handleSearchKey(e: KeyboardEvent): void {
    const n = this.visibleItems.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(1, n)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(-1, n)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      this.selectActive()
    }
  }

  private moveActive(dir: 1 | -1, n: number): void {
    if (n === 0) return
    // 跳过 disabled 项（最多绕一圈回到自身）
    for (let i = 1; i <= n; i++) {
      const idx = (this.activeIndex + dir * i + n) % n
      if (!this.visibleItems[idx]!.disabled) {
        this.activeIndex = idx
        break
      }
    }
    this.renderList()
  }

  private selectActive(): void {
    const item = this.visibleItems[this.activeIndex]
    if (item) this.select(item)
  }

  private select(item: CommandItem): void {
    if (item.disabled) return
    this.emit('select', { value: item.value })
    this.close()
  }

  private renderList(): void {
    const listEl = this.listEl
    if (!listEl) return
    listEl.innerHTML = ''
    this.visibleItems = []

    const q = this.query.trim().toLowerCase()
    const matches = (item: CommandItem): boolean => {
      if (!q) return true
      if (item.label.toLowerCase().includes(q)) return true
      return (item.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    }
    const filtered = this.itemsList.filter((i) => matches(i))

    let prevGroup: string | undefined
    let shown = 0
    for (const item of filtered) {
      // 分组标题：group 变化时插入（空分组不渲染）
      if (item.group !== prevGroup && item.group) {
        const g = document.createElement('div')
        g.className = 'group'
        g.setAttribute('role', 'presentation')
        g.textContent = item.group
        listEl.appendChild(g)
        prevGroup = item.group
      }
      const row = document.createElement('div')
      row.className = 'option'
      row.setAttribute('part', 'option')
      row.setAttribute('role', 'option')
      row.setAttribute('aria-disabled', String(item.disabled ?? false))
      row.setAttribute('aria-selected', String(shown === this.activeIndex))
      row.setAttribute('tabindex', '-1')
      row.id = `oas-command-opt-${this.optionSeq++}`
      row.textContent = item.label
      if (shown === this.activeIndex) row.classList.add('active')
      row.addEventListener('click', () => this.select(item))
      row.addEventListener('mousemove', () => {
        if (item.disabled) return
        this.activeIndex = shown
        this.syncActive()
      })
      listEl.appendChild(row)
      this.visibleItems.push(item)
      shown++
    }

    if (this.visibleItems.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('command.empty')
      listEl.appendChild(empty)
      this.searchEl?.removeAttribute('aria-activedescendant')
      return
    }
    this.syncActive()
  }

  /** 高亮同步（不重建 DOM）：class / aria-selected / aria-activedescendant */
  private syncActive(): void {
    if (!this.listEl) return
    const rows = [...this.listEl.querySelectorAll<HTMLElement>('[part="option"]')]
    rows.forEach((r, idx) => {
      r.classList.toggle('active', idx === this.activeIndex)
      r.setAttribute('aria-selected', String(idx === this.activeIndex))
    })
    const activeRow = rows[this.activeIndex]
    if (activeRow && this.searchEl) {
      this.searchEl.setAttribute('aria-activedescendant', activeRow.id)
    } else {
      this.searchEl?.removeAttribute('aria-activedescendant')
    }
  }

  /** 焦点陷阱：Tab / Shift+Tab 在搜索框与可见选项间循环 */
  private trapTab(e: KeyboardEvent): void {
    const focusable = [
      this.searchEl,
      ...(this.listEl?.querySelectorAll<HTMLElement>(
        '[part="option"]:not([aria-disabled="true"])',
      ) ?? []),
    ].filter((el): el is HTMLElement => el !== null)
    if (focusable.length === 0) return
    e.preventDefault()
    // 用 shadow.activeElement 定位：happy-dom 下 document.activeElement 只会回到宿主，
    // 真实浏览器里两者一致（取 shadow 内真实聚焦元素）。
    const current = focusable.indexOf(this.shadow.activeElement as HTMLElement)
    const next = e.shiftKey
      ? (current - 1 + focusable.length) % focusable.length
      : (current + 1) % focusable.length
    focusable[next]?.focus()
  }
}
