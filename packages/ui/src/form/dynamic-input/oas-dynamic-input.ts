import { OASElement } from '@oas-ui/core'
import '../input/index.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.rows {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.row oas-input {
  flex: 1;
}
.remove {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-md);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-lg);
  font-family: inherit;
  flex: none;
}
.remove:hover:not(:disabled) {
  color: var(--oas-color-danger);
  background: var(--oas-color-bg-hover);
}
.remove:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.remove:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.add {
  appearance: none;
  border: 1px dashed var(--oas-color-border);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-md);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-3);
  font-family: inherit;
}
.add:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.add:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
`

const REMOVE_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M3 5 L13 5 M5.5 5 L6.5 14 L9.5 14 L10.5 5 M6 5 L6 3 L10 3 L10 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

export class OASDynamicInput extends OASElement {
  static override get observedAttributes(): string[] {
    return ['min', 'max', 'default-value', 'disabled', 'model-value']
  }

  private rowsEl: HTMLElement | null = null
  private addBtn: HTMLButtonElement | null = null
  private rows: HTMLElement[] = []
  private values: string[] = []
  private lastWrittenAttr: string | null = null

  get modelValue(): string[] {
    return this.values.slice()
  }

  set modelValue(v: string[]) {
    this.values = (Array.isArray(v) ? v : []).map((x) => String(x))
    this.writeBack()
    this.syncRows()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="rows" part="rows"></div>
      <button class="add" part="add" type="button"></button>
    `
  }

  /** 缓存节点引用 + 绑定行输入/删除/添加事件 + 接管快照已有行（render 与水合路径共用） */
  private bind(): void {
    this.rowsEl = this.shadow.querySelector('.rows')
    this.addBtn = this.shadow.querySelector('.add')

    // 水合接管：SSR 快照已按 model-value 渲染行，采纳为 rows 引用，避免 syncRows 重复追加
    if (this.rowsEl) {
      this.rows = [...this.rowsEl.querySelectorAll<HTMLElement>(':scope > .row')]
    }

    this.rowsEl?.addEventListener(
      'oas-input',
      ((e: CustomEvent<{ value: string }>) => this.handleRowInput(e)) as EventListener,
    )
    this.rowsEl?.addEventListener('click', (e: MouseEvent) => this.handleClick(e))
    this.addBtn?.addEventListener('click', () => this.handleAdd())
    this.onCleanup(() => {
      this.rows = []
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（rows 容器与添加按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.rows')) return false
    if (!this.shadow.querySelector('.add')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseValues()
    this.syncRows()
  }

  /** 属性通道：外部写 model-value 属性（JSON）时采用，自己写回的跳过 */
  private parseValues(): void {
    const raw = this.getAttribute('model-value')
    if (raw == null || raw === this.lastWrittenAttr) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.values = parsed.map((v) => (typeof v === 'string' ? v : String(v)))
      }
    } catch {
      /* 非法 JSON 忽略，保持内部值 */
    }
  }

  private minValue(): number {
    return Math.max(0, Number(this.getAttr('min', '0')) || 0)
  }

  private maxValue(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return Number.POSITIVE_INFINITY
    return Math.max(0, Number(raw) || 0)
  }

  private syncRows(): void {
    const rowsEl = this.rowsEl
    if (!rowsEl) return
    const max = this.maxValue()
    const min = this.minValue()
    const disabled = this.hasAttr('disabled')

    // 边界：超长截断、不足补足 min
    if (this.values.length > max) this.values = this.values.slice(0, max)
    while (this.values.length < min) this.values.push(this.getAttr('default-value', ''))

    // 结构同步（仅在长度变化时增删行，保留既有行引用）
    while (this.rows.length < this.values.length) this.appendRow()
    while (this.rows.length > this.values.length) {
      const last = this.rows.pop()
      last?.remove()
    }

    this.rows.forEach((row, i) => {
      const input = row.querySelector('oas-input')
      const value = this.values[i] ?? ''
      if (input && input.getAttribute('value') !== value) input.setAttribute('value', value)
      if (input) {
        if (disabled) input.setAttribute('disabled', '')
        else input.removeAttribute('disabled')
      }
      const btn = row.querySelector<HTMLButtonElement>('.remove')
      if (btn) {
        btn.disabled = disabled || this.values.length <= min
        btn.setAttribute('aria-label', this.t('dynamicInput.remove'))
      }
    })

    const addBtn = this.addBtn
    if (addBtn) {
      addBtn.disabled = disabled || this.values.length >= max
      addBtn.textContent = ''
      const icon = this.buildAddIcon()
      icon.style.verticalAlign = '-2px'
      icon.style.marginRight = 'var(--oas-space-1)'
      addBtn.appendChild(icon)
      const span = document.createElement('span')
      span.textContent = this.t('dynamicInput.add')
      addBtn.appendChild(span)
    }
  }

  private buildAddIcon(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '12')
    svg.setAttribute('height', '12')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', 'M8 3 L8 13 M3 8 L13 8')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.4')
    path.setAttribute('stroke-linecap', 'round')
    svg.appendChild(path)
    return svg
  }

  private appendRow(): void {
    const rowsEl = this.rowsEl
    if (!rowsEl) return
    const row = document.createElement('div')
    row.className = 'row'
    const input = document.createElement('oas-input')
    input.setAttribute('part', 'row-input')
    row.appendChild(input)
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'remove'
    btn.innerHTML = REMOVE_ICON
    row.appendChild(btn)
    rowsEl.appendChild(row)
    this.rows.push(row)
  }

  private handleClick(e: MouseEvent): void {
    const path = e.composedPath() as Element[]
    const btn = path.find((n) => n instanceof Element && n.classList.contains('remove'))
    if (!btn) return
    const row = path.find((n) => n instanceof Element && n.classList.contains('row'))
    const idx = row ? this.rows.indexOf(row as HTMLElement) : -1
    if (idx >= 0) this.removeRow(idx)
  }

  private handleRowInput(e: CustomEvent<{ value: string }>): void {
    const path = e.composedPath() as Element[]
    const row = path.find((n) => n instanceof Element && n.classList.contains('row'))
    const idx = row ? this.rows.indexOf(row as HTMLElement) : -1
    if (idx < 0) return
    this.values[idx] = String(e.detail.value ?? '')
    this.writeBack()
    this.emitChange()
  }

  private handleAdd(): void {
    if (this.hasAttr('disabled')) return
    if (this.values.length >= this.maxValue()) return
    this.values.push(this.getAttr('default-value', ''))
    this.writeBack()
    this.syncRows()
    this.emitChange()
    const last = this.rows[this.rows.length - 1]
    const input = last?.querySelector('oas-input')
    input?.shadowRoot?.querySelector<HTMLInputElement>('input')?.focus()
  }

  private removeRow(idx: number): void {
    if (this.values.length <= this.minValue()) return
    this.values.splice(idx, 1)
    const row = this.rows[idx]
    row?.remove()
    this.rows.splice(idx, 1)
    this.writeBack()
    this.syncRows()
    this.emitChange()
  }

  private writeBack(): void {
    this.lastWrittenAttr = JSON.stringify(this.values)
    this.setAttribute('model-value', this.lastWrittenAttr)
  }

  private emitChange(): void {
    this.emit('change', { value: this.values.slice() })
  }
}
