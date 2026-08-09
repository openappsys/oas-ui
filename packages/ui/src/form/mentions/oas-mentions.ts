import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

interface Option {
  label: string
  value: string
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrapper {
  position: relative;
}
textarea {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
textarea:hover {
  border-color: var(--oas-color-primary);
}
textarea:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:host([aria-invalid='true']) textarea {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) textarea:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
textarea:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
textarea:disabled:hover {
  border-color: var(--oas-color-border);
}
.panel {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  padding: var(--oas-space-1);
  min-width: 160px;
  max-height: 240px;
  overflow-y: auto;
  display: none;
}
.panel.open {
  display: block;
}
.option {
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.option:hover,
.option.active {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASMentions extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'options', 'prefix', 'placeholder', 'disabled', 'label']
  }

  private ta: HTMLTextAreaElement | null = null
  private panel: HTMLElement | null = null
  private _options: Option[] = []

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): Option[] {
    return this._options
  }
  set options(value: Option[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** Element 内建只读 getter prefix 会让 Vue 走 property 赋值；访问器遮蔽并反射到 attribute */
  override get prefix(): string {
    return this.getAttr('prefix', '')
  }
  override set prefix(value: string) {
    this.setAttribute('prefix', value)
  }
  private activeIndex = 0
  private openState = false
  /** 当前提及片段的起始下标（prefix 字符位置），-1 表示无触发 */
  private queryStart = -1
  /** prefix 之后、光标之前的关键词 */
  private queryText = ''

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <textarea part="textarea" role="combobox" aria-autocomplete="list"
          aria-haspopup="listbox" aria-expanded="false" aria-controls="mention-list"></textarea>
        <div class="panel" part="panel" role="listbox" id="mention-list" aria-hidden="true"></div>
      </div>
    `
    this.ta = this.shadow.querySelector('textarea')
    this.panel = this.shadow.querySelector('.panel')

    this.ta?.addEventListener('input', () => {
      this.emit('input', { value: this.ta!.value })
      this.scanMention()
    })
    this.ta?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick))
    this.update()
  }

  protected override update(): void {
    this.parseOptions()
    const t = this.ta
    if (!t) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    if (t.value !== value) t.value = value
    t.placeholder = placeholder
    t.disabled = this.hasAttr('disabled')
    // 内置文案走 locale registry（label/placeholder 属性优先，setLocale 切换自动刷新）
    t.setAttribute(
      'aria-label',
      this.getAttr('label', placeholder) || this.t('mentions.defaultLabel'),
    )
    // 浮层开着时，options/文案变化即时刷新列表
    if (this.openState) this.renderPanel()
  }

  /** 从光标向前扫描：找到 prefix 且前缀为空白/行首、后续无空白的关键词段 */
  private scanMention(): void {
    const t = this.ta
    if (!t) return
    const prefix = this.getAttr('prefix', '@')
    if (!prefix) {
      this.close()
      return
    }
    const pos = t.selectionStart ?? t.value.length
    const text = t.value
    let start = -1
    let idx = text.lastIndexOf(prefix, pos - 1)
    while (idx !== -1) {
      const before = idx === 0 ? '' : (text[idx - 1] ?? '')
      const segment = text.slice(idx + prefix.length, pos)
      if ((before === '' || /\s/.test(before)) && !/\s/.test(segment)) {
        start = idx
        break
      }
      if (idx === 0) break
      idx = text.lastIndexOf(prefix, idx - 1)
    }
    if (start === -1) {
      this.close()
      return
    }
    this.queryStart = start
    this.queryText = text.slice(start + prefix.length, pos)
    this.open()
  }

  private open(): void {
    this.openState = true
    this.renderPanel()
    document.addEventListener('click', this.handleOutsideClick)
  }

  private close(): void {
    if (!this.openState) return
    this.openState = false
    this.syncOpen()
    document.removeEventListener('click', this.handleOutsideClick)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.close()
    }
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.openState) return
    const list = this.filtered()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.activeIndex = (this.activeIndex + 1) % Math.max(list.length, 1)
      this.renderPanel()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.activeIndex =
        (this.activeIndex - 1 + Math.max(list.length, 1)) % Math.max(list.length, 1)
      this.renderPanel()
    } else if (e.key === 'Enter') {
      if (list.length > 0) {
        e.preventDefault()
        this.select(list[this.activeIndex]!)
      }
    } else if (e.key === 'Escape') {
      this.close()
    }
  }

  private filtered(): Option[] {
    const q = this.queryText.trim().toLowerCase()
    if (!q) return this._options
    return this._options.filter((o) => o.label.toLowerCase().includes(q))
  }

  private renderPanel(): void {
    const panel = this.panel
    if (!panel) return
    panel.innerHTML = ''
    const list = this.filtered()
    this.activeIndex = Math.min(this.activeIndex, Math.max(list.length - 1, 0))

    if (list.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('mentions.noMatch')
      panel.appendChild(empty)
    } else {
      for (const [idx, option] of list.entries()) {
        const row = document.createElement('div')
        row.className = 'option'
        row.setAttribute('part', 'option')
        row.setAttribute('role', 'option')
        row.id = `mention-option-${idx}`
        if (idx === this.activeIndex) row.classList.add('active')
        row.textContent = option.label
        row.addEventListener('click', () => this.select(option))
        row.addEventListener('mousemove', () => {
          this.activeIndex = idx
          this.renderPanel()
        })
        panel.appendChild(row)
      }
    }
    this.syncOpen()
    this.positionPanel()
  }

  private syncOpen(): void {
    if (!this.panel || !this.ta) return
    this.panel.classList.toggle('open', this.openState)
    this.panel.setAttribute('aria-hidden', String(!this.openState))
    this.ta.setAttribute('aria-expanded', String(this.openState))
    const active = this.panel.querySelector<HTMLElement>('.option.active')
    if (this.openState && active) this.ta.setAttribute('aria-activedescendant', active.id)
    else this.ta.removeAttribute('aria-activedescendant')
  }

  /** 复用浮层定位引擎：锚定 textarea 下方，空间不足自动翻转/避让 */
  private positionPanel(): void {
    if (!this.panel || !this.ta || !this.openState) return
    const anchorRect = this.ta.getBoundingClientRect()
    const panelRect = this.panel.getBoundingClientRect()
    const { top, left } = computePosition(
      anchorRect,
      panelRect,
      'bottom' as Placement,
      { width: window.innerWidth, height: window.innerHeight },
    )
    this.panel.style.top = `${top}px`
    this.panel.style.left = `${left}px`
  }

  /** 选中项并入文本：替换 prefix+关键词片段为 @label+空格 */
  private select(option: Option): void {
    const t = this.ta
    if (!t || this.queryStart === -1) return
    const prefix = this.getAttr('prefix', '@')
    const start = this.queryStart
    const end = start + prefix.length + this.queryText.length
    const next = t.value.slice(0, start) + prefix + option.label + ' ' + t.value.slice(end)
    t.value = next
    this.setAttribute('value', next)
    const caret = start + prefix.length + option.label.length + 1
    t.setSelectionRange(caret, caret)
    this.emit('select', { value: option.value, label: option.label })
    this.emit('change', { value: next })
    this.close()
    t.focus()
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this._options = Array.isArray(parsed)
        ? parsed.filter((o): o is Option => o && typeof o.value === 'string')
        : []
    } catch {
      this._options = []
    }
  }
}
