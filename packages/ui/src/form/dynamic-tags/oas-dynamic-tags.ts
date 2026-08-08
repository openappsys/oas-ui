import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  font-family: inherit;
  max-width: 100%;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: 1px var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-tag, var(--oas-color-bg-hover));
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  line-height: var(--oas-font-size-sm);
  max-width: 100%;
}
.tag-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-remove {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  color: var(--oas-color-text-secondary);
  border-radius: 50%;
  flex: none;
}
.tag-remove:hover:not(:disabled) {
  color: var(--oas-color-text-primary);
}
.tag-remove:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.tag-remove:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.entry {
  position: relative;
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
input:hover {
  border-color: var(--oas-color-primary);
}
input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
input[aria-invalid='true'] {
  border-color: var(--oas-color-danger);
}
input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.hint {
  display: block;
  margin-top: var(--oas-space-1);
  color: var(--oas-color-danger);
  font-size: var(--oas-font-size-sm);
}
.hint[hidden] {
  display: none;
}
`

const CLOSE_ICON = `
<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
  <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`

export class OASDynamicTags extends OASElement {
  static override get observedAttributes(): string[] {
    return ['model-value', 'max', 'allow-duplicate', 'disabled', 'placeholder']
  }

  private tagsEl: HTMLElement | null = null
  private inputEl: HTMLInputElement | null = null
  private hintEl: HTMLElement | null = null
  private tags: string[] = []
  private lastWrittenAttr: string | null = null
  private tagsKey = ''
  private hintTimer: number | null = null

  get modelValue(): string[] {
    return this.tags.slice()
  }

  set modelValue(v: string[]) {
    this.tags = (Array.isArray(v) ? v : []).map((x) => String(x))
    this.tagsKey = ''
    this.writeBack()
    this.syncTags()
    this.syncInputState()
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tags" part="tags" role="list"></div>
      <div class="entry">
        <input class="tag-input" part="input" autocomplete="off" />
        <span class="hint" role="alert" hidden></span>
      </div>
    `
    this.tagsEl = this.shadow.querySelector('.tags')
    this.inputEl = this.shadow.querySelector('.tag-input')
    this.hintEl = this.shadow.querySelector('.hint')

    this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => this.onKeydown(e))
    this.inputEl?.addEventListener('input', () => this.hideDuplicateHint())
    this.tagsEl?.addEventListener('click', (e: MouseEvent) => this.handleClick(e))
    this.onCleanup(() => {
      if (this.hintTimer != null) window.clearTimeout(this.hintTimer)
      this.hintTimer = null
    })
    this.update()
  }

  protected override update(): void {
    this.parseValues()
    this.syncTags()
    this.syncInputState()
  }

  private parseValues(): void {
    const raw = this.getAttribute('model-value')
    if (raw == null || raw === this.lastWrittenAttr) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.tags = parsed.map((v) => (typeof v === 'string' ? v : String(v)))
        this.tagsKey = ''
      }
    } catch {
      /* 非法 JSON 忽略 */
    }
  }

  private maxValue(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return Number.POSITIVE_INFINITY
    return Math.max(0, Number(raw) || 0)
  }

  private syncTags(): void {
    const tagsEl = this.tagsEl
    if (!tagsEl) return
    const nextKey = JSON.stringify(this.tags)
    if (nextKey === this.tagsKey) return
    this.tagsKey = nextKey

    tagsEl.innerHTML = ''
    this.tags.forEach((label) => {
      const item = document.createElement('span')
      item.className = 'tag'
      item.setAttribute('part', 'tag')
      item.setAttribute('role', 'listitem')

      const text = document.createElement('span')
      text.className = 'tag-label'
      text.textContent = label
      item.appendChild(text)

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tag-remove'
      btn.setAttribute('part', 'tag-remove')
      btn.setAttribute('aria-label', this.t('dynamicTags.remove', { label }))
      btn.innerHTML = CLOSE_ICON
      item.appendChild(btn)

      tagsEl.appendChild(item)
    })
  }

  private syncInputState(): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    const disabled = this.hasAttr('disabled')
    const overMax = this.tags.length >= this.maxValue()
    inputEl.disabled = disabled || overMax
    inputEl.placeholder = this.getAttr('placeholder', '')
    inputEl.setAttribute('aria-label', this.t('dynamicTags.inputLabel'))
    const removeBtns = this.tagsEl?.querySelectorAll<HTMLButtonElement>('.tag-remove')
    removeBtns?.forEach((btn) => {
      btn.disabled = disabled
    })
  }

  private onKeydown(e: KeyboardEvent): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      this.addTag(inputEl.value)
    } else if (e.key === 'Backspace' && inputEl.value === '') {
      e.preventDefault()
      this.removeLastTag()
    }
  }

  private addTag(raw: string): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    const value = raw.trim()
    if (value === '') return
    if (this.tags.length >= this.maxValue()) return
    if (!this.hasAttr('allow-duplicate') && this.tags.includes(value)) {
      this.showDuplicateHint()
      return
    }
    this.tags.push(value)
    this.writeBack()
    this.tagsKey = ''
    this.syncTags()
    inputEl.value = ''
    this.syncInputState()
    this.emit('add', { value })
    this.emitChange()
  }

  private removeLastTag(): void {
    if (this.tags.length === 0) return
    this.removeTag(this.tags.length - 1)
  }

  private handleClick(e: MouseEvent): void {
    const path = e.composedPath() as Element[]
    const btn = path.find((n) => n instanceof Element && n.classList.contains('tag-remove'))
    if (!btn) return
    const item = path.find((n) => n instanceof Element && n.classList.contains('tag'))
    const idx = item ? [...this.tagsEl!.children].indexOf(item) : -1
    if (idx >= 0) this.removeTag(idx)
  }

  private removeTag(idx: number): void {
    if (idx < 0 || idx >= this.tags.length) return
    const removed = this.tags[idx]!
    this.tags.splice(idx, 1)
    this.writeBack()
    this.tagsKey = ''
    this.syncTags()
    this.syncInputState()
    this.emit('remove', { value: removed })
    this.emitChange()
  }

  private writeBack(): void {
    this.lastWrittenAttr = JSON.stringify(this.tags)
    this.setAttribute('model-value', this.lastWrittenAttr)
  }

  private emitChange(): void {
    this.emit('change', { value: this.tags.slice() })
  }

  private showDuplicateHint(): void {
    const hintEl = this.hintEl
    if (hintEl) {
      hintEl.textContent = this.t('dynamicTags.duplicate')
      hintEl.hidden = false
    }
    this.inputEl?.setAttribute('aria-invalid', 'true')
    if (this.hintTimer != null) window.clearTimeout(this.hintTimer)
    this.hintTimer = window.setTimeout(() => this.hideDuplicateHint(), 2000)
  }

  private hideDuplicateHint(): void {
    if (this.hintTimer != null) {
      window.clearTimeout(this.hintTimer)
      this.hintTimer = null
    }
    if (this.hintEl) this.hintEl.hidden = true
    this.inputEl?.removeAttribute('aria-invalid')
  }
}
