import { OASElement } from '@oas-ui/core'

/** 提示词建议项；字符串等价于 { label: value, value } */
export type PromptInputSuggestion = string | { label?: string; value: string }
export interface PromptInputSubmitDetail {
  value: string
}
export interface PromptInputSuggestionDetail {
  value: string
  label: string
}

const STYLE = `
:host {
  display: block;
  color: var(--oas-color-text-primary);
  font-family: inherit;
}
:host([hidden]) {
  display: none !important;
}
.composer {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg-elevated, var(--oas-color-bg));
  box-shadow: var(--oas-shadow-sm, none);
}
.composer:focus-within {
  border-color: var(--oas-color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
}
.row {
  display: flex;
  align-items: flex-end;
  gap: var(--oas-space-2);
  min-width: 0;
}
.textarea {
  flex: 1;
  min-width: 0;
  resize: none;
  border: 0;
  outline: 0;
  padding: var(--oas-space-1) var(--oas-space-2);
  max-height: 160px;
  min-height: 36px;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 1.5;
}
.textarea::placeholder {
  color: var(--oas-color-text-secondary);
}
.actions {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: none;
}
.send,
.stop {
  appearance: none;
  border: 0;
  border-radius: var(--oas-radius-full, 999px);
  padding: 0 var(--oas-space-3);
  min-height: 32px;
  cursor: pointer;
  font: inherit;
  font-size: var(--oas-font-size-sm);
}
.send {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.stop {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.send:focus-visible,
.stop:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
}
.suggestion {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary-strong);
  padding: 0 var(--oas-space-2);
  min-height: 28px;
  cursor: pointer;
  font: inherit;
  font-size: var(--oas-font-size-xs);
}
.suggestion:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-primary);
}
.suggestion:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
.prefix[hidden],
.footer[hidden],
.suggestions[hidden] {
  display: none !important;
}
.prefix,
.footer,
.suggestions {
  min-width: 0;
}
`

/**
 * oas-prompt-input — AI/会话输入框（composer）
 *
 * 属性：
 * - `value`：当前文本（property 双向；attribute 作为初始值）
 * - `placeholder`：占位文案（缺省 i18n promptInput.placeholder）
 * - `disabled` / `readonly`：禁用 / 只读
 * - `loading`：生成中；发送钮切换为「停止」
 * - `maxlength` / `rows`：原生 textarea 限制
 * - `suggestions`：JSON 数组，字符串或 `{ label?, value }`
 * - `submit-on-enter`（默认 true）/ `clear-on-submit`（默认 true）
 *
 * 事件：
 * - `oas-submit` detail `{ value }`
 * - `oas-stop`（loading 时点停止）
 * - `oas-suggestion-select` detail `{ value, label }`
 *
 * 插槽：`prefix` / `actions` / `footer`
 */
export class OASPromptInput extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'disabled', 'readonly', 'loading', 'maxlength', 'rows', 'suggestions']
  }

  private textareaEl: HTMLTextAreaElement | null = null
  private sendEl: HTMLButtonElement | null = null
  private suggestionsEl: HTMLElement | null = null
  private valueCache = ''
  private valueAttrCache = ''
  private composing = false

  /** 当前文本（读写）；读取文本域实时值，未渲染时读缓存
   * @apiProperty */
  get value(): string {
    return this.textareaEl?.value ?? this.valueCache
  }

  set value(v: string) {
    const next = String(v ?? '')
    this.valueCache = next
    if (this.textareaEl) this.textareaEl.value = next
    this.syncSendState()
    this.autoGrow()
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="composer" part="composer">
        <div class="suggestions" part="suggestions" aria-label="${this.escapeAttr(this.t('promptInput.suggestions'))}"></div>
        <div class="row">
          <div class="prefix" part="prefix" hidden><slot name="prefix"></slot></div>
          <textarea class="textarea" part="textarea" rows="1"></textarea>
          <div class="actions" part="actions">
            <slot name="actions"></slot>
            <button class="send" part="send" type="button"></button>
          </div>
        </div>
        <div class="footer" part="footer" hidden><slot name="footer"></slot></div>
      </div>
    `
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="composer"]')) return false
    this.bind()
    return true
  }

  private escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  }

  private bind(): void {
    this.textareaEl = this.shadow.querySelector<HTMLTextAreaElement>('[part="textarea"]')
    this.sendEl = this.shadow.querySelector<HTMLButtonElement>('[part="send"]')
    this.suggestionsEl = this.shadow.querySelector<HTMLElement>('[part="suggestions"]')
    const textarea = this.textareaEl
    const send = this.sendEl
    if (textarea) {
      textarea.addEventListener('input', () => {
        this.valueCache = textarea.value
        this.syncSendState()
        this.autoGrow()
      })
      textarea.addEventListener('compositionstart', () => {
        this.composing = true
      })
      textarea.addEventListener('compositionend', () => {
        this.composing = false
      })
      textarea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.isComposing || this.composing) return
        if (e.shiftKey || this.getAttr('submit-on-enter', 'true') === 'false') return
        e.preventDefault()
        this.submit()
      })
    }
    if (send) {
      send.addEventListener('click', () => {
        if (this.hasAttr('loading')) this.stop()
        else this.submit()
      })
    }
  }

  protected override update(): void {
    const textarea = this.textareaEl
    const send = this.sendEl
    if (!textarea || !send) return
    const disabled = this.hasAttr('disabled')
    const readonly = this.hasAttr('readonly')
    const loading = this.hasAttr('loading')
    const placeholder = this.getAttr('placeholder', '') || this.t('promptInput.placeholder')
    textarea.placeholder = placeholder
    textarea.setAttribute('aria-label', placeholder)
    textarea.disabled = disabled
    textarea.readOnly = readonly
    const maxlength = Number(this.getAttr('maxlength', ''))
    if (Number.isFinite(maxlength) && maxlength > 0) textarea.maxLength = maxlength
    else textarea.removeAttribute('maxlength')
    const rows = Math.max(1, Math.floor(Number(this.getAttr('rows', '1'))) || 1)
    textarea.rows = rows
    const attrValue = this.getAttr('value', '')
    if (attrValue !== this.valueAttrCache) {
      this.valueAttrCache = attrValue
      this.valueCache = attrValue
      textarea.value = attrValue
    } else if (document.activeElement !== textarea && textarea.value !== this.valueCache) {
      textarea.value = this.valueCache
    }
    send.className = loading ? 'stop' : 'send'
    send.textContent = this.t(loading ? 'promptInput.stop' : 'promptInput.send')
    send.setAttribute('aria-label', send.textContent)
    send.disabled = disabled || readonly || (!loading && this.value.trim() === '')
    this.syncSendState()
    this.renderSuggestions()
    this.syncSlotVisibility()
  }

  private syncSendState(): void {
    if (!this.sendEl) return
    const disabled = this.hasAttr('disabled') || this.hasAttr('readonly')
    this.sendEl.disabled = disabled || (!this.hasAttr('loading') && this.value.trim() === '')
  }

  private syncSlotVisibility(): void {
    for (const name of ['prefix', 'footer']) {
      const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      const wrap = this.shadow.querySelector<HTMLElement>(`.${name}`)
      if (slot && wrap) wrap.hidden = slot.assignedNodes().length === 0
    }
  }

  private suggestionItems(): Array<{ label: string; value: string }> {
    const raw = this.getAttr('suggestions', '')
    if (!raw) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
    if (!Array.isArray(parsed)) return []
    const out: Array<{ label: string; value: string }> = []
    for (const item of parsed) {
      if (typeof item === 'string' && item.trim() !== '') out.push({ label: item, value: item })
      else if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>
        if (typeof record.value !== 'string' || record.value.trim() === '') continue
        const value = record.value.trim()
        out.push({
          label: typeof record.label === 'string' && record.label.trim() ? record.label.trim() : value,
          value,
        })
      }
    }
    return out
  }

  private renderSuggestions(): void {
    const box = this.suggestionsEl
    if (!box) return
    const items = this.suggestionItems()
    box.innerHTML = ''
    box.hidden = items.length === 0
    for (const item of items) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'suggestion'
      button.textContent = item.label
      button.addEventListener('click', () => {
        this.value = item.value
        this.emit('suggestion-select', { value: item.value, label: item.label } satisfies PromptInputSuggestionDetail)
        this.textareaEl?.focus()
      })
      box.appendChild(button)
    }
  }

  private autoGrow(): void {
    const textarea = this.textareaEl
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }

  /** 提交当前文本；空值 / 禁用 / loading 返回 false */
  submit(): boolean {
    if (this.hasAttr('disabled') || this.hasAttr('readonly') || this.hasAttr('loading')) return false
    const value = this.value.trim()
    if (!value) return false
    this.emit('submit', { value } satisfies PromptInputSubmitDetail)
    if (this.getAttr('clear-on-submit', 'true') !== 'false') this.value = ''
    this.textareaEl?.focus()
    return true
  }

  /** 停止生成（仅在 loading 时派发） */
  stop(): void {
    if (!this.hasAttr('loading')) return
    this.emit('stop', {})
  }

  /** 聚焦输入框 */
  focusInput(): void {
    this.textareaEl?.focus()
  }
}
