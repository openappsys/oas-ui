import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.container {
  display: inline-flex;
  gap: var(--oas-space-2);
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 44px;
  height: var(--oas-control-height-md);
  text-align: center;
  font-size: var(--oas-font-size-lg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
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
:host([aria-invalid='true']) input {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
input:read-only {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-secondary);
}
`

export class OASPinInput extends OASElement {
  static override get observedAttributes(): string[] {
    return ['length', 'value', 'mask', 'disabled', 'readonly', 'type', 'aria-invalid', 'disabled-skip']
  }

  private container: HTMLElement | null = null
  private cells: HTMLInputElement[] = []
  private currentLength = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="container" part="container" role="group"></div>
    `
  }

  /** 缓存节点引用 + 绑定键盘/粘贴/输入事件（render 与水合路径共用） */
  private bind(): void {
    this.container = this.shadow.querySelector('.container')
    this.container?.addEventListener('keydown', (e: KeyboardEvent) => this.onKeydown(e))
    this.container?.addEventListener('paste', (e: ClipboardEvent) => this.onPaste(e))
    this.container?.addEventListener('input', (e: Event) => this.onInput(e))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（container 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.container')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const container = this.container
    if (!container) return
    const length = Math.max(1, Number(this.getAttr('length', '6')) || 6)
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    const type = this.hasAttr('mask') ? 'password' : this.getAttr('type', 'text')

    if (length !== this.currentLength) this.buildCells(length)

    const code = this.getAttr('value', '').slice(0, length)
    const invalid = this.getAttr('aria-invalid', '')
    this.cells.forEach((cell, i) => {
      const ch = code[i] ?? ''
      if (cell.value !== ch) cell.value = ch
      cell.disabled = disabled
      cell.readOnly = readonly
      cell.type = type
      cell.setAttribute('aria-label', this.t('pinInput.digit', { position: i + 1 }))
      if (invalid !== '') cell.setAttribute('aria-invalid', invalid)
      else cell.removeAttribute('aria-invalid')
    })
    container.setAttribute('aria-label', this.t('pinInput.group'))
    if (invalid !== '') container.setAttribute('aria-invalid', invalid)
    else container.removeAttribute('aria-invalid')
  }

  private buildCells(length: number): void {
    const container = this.container
    if (!container) return
    container.innerHTML = ''
    this.cells = []
    this.currentLength = length
    for (let i = 0; i < length; i++) {
      const input = document.createElement('input')
      input.setAttribute('part', 'cell')
      input.maxLength = 1
      input.autocomplete = 'off'
      input.spellcheck = false
      // 聚焦时全选：重复输入可直接覆盖
      input.addEventListener('focus', () => input.select())
      container.appendChild(input)
      this.cells.push(input)
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const idx = this.cells.indexOf(e.target as HTMLInputElement)
    if (idx < 0) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      this.cells[Math.max(0, idx - 1)]?.focus()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      this.cells[Math.min(this.cells.length - 1, idx + 1)]?.focus()
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      this.handleBackspace(idx)
    } else if (e.key === 'Delete') {
      e.preventDefault()
      const cell = this.cells[idx]
      if (cell) cell.value = ''
      this.commitFromCells(idx)
    }
  }

  private handleBackspace(idx: number): void {
    const cell = this.cells[idx]
    if (!cell) return
    if (cell.value !== '') {
      cell.value = ''
      if (idx > 0) this.cells[idx - 1]?.focus()
    } else if (idx > 0) {
      const prev = this.cells[idx - 1]
      if (prev) {
        prev.value = ''
        prev.focus()
      }
    }
    this.commitFromCells(idx)
  }

  private onInput(e: Event): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const idx = this.cells.indexOf(e.target as HTMLInputElement)
    if (idx < 0) return
    const cell = this.cells[idx]
    if (!cell) return
    // 兜底归一化：每格最多一个字符（正常粘贴已由 paste 分发，这里防多字符输入）
    if (cell.value.length > 1) cell.value = cell.value.slice(-1)
    this.commitFromCells(idx, true)
  }

  private onPaste(e: ClipboardEvent): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text) return
    e.preventDefault()
    const idx = this.cells.indexOf(document.activeElement as HTMLInputElement)
    const start = idx >= 0 ? idx : 0
    const chars = text
      .trim()
      .slice(0, this.currentLength - start)
      .split('')
    chars.forEach((ch, i) => {
      const cell = this.cells[start + i]
      if (cell) cell.value = ch
    })
    this.cells[Math.min(start + chars.length, this.currentLength - 1)]?.focus()
    this.commitFromCells(start)
  }

  private commitFromCells(idx: number, advance = false): void {
    const code = this.cells.map((c) => c.value).join('')
    const prev = this.getAttr('value', '')
    this.setAttribute('value', code)
    this.emit('input', { value: code, index: idx })
    const nowComplete = code.length === this.currentLength
    const wasComplete = prev.length === this.currentLength
    if (nowComplete && !wasComplete) {
      this.emit('change', { value: code })
      this.emit('complete', { value: code })
    }
    if (advance) {
      const next = this.cells.findIndex((c, i) => i > idx && c.value === '')
      if (next >= 0) this.cells[next]?.focus()
    }
  }
}
