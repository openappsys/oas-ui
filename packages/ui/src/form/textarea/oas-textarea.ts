import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
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
`

const PADDING_V = 16 // --oas-space-2（8px）× 2，上下内边距

export class OASTextarea extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'rows',
      'resize',
      'disabled',
      'readonly',
      'autosize',
      'auto-height',
      'min-rows',
      'max-rows',
    ]
  }

  private ta: HTMLTextAreaElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <textarea part="textarea"></textarea>
    `
    this.ta = this.shadow.querySelector('textarea')
    this.ta?.addEventListener('input', () => {
      this.emit('input', { value: this.ta!.value })
      this.autoResize()
    })
    this.update()
  }

  protected override update(): void {
    const t = this.ta
    if (!t) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const rows = Number(this.getAttr('rows', '3')) || 3
    const resize = this.getAttr('resize', '')
    const disabled = this.hasAttr('disabled')
    const readonly = this.hasAttr('readonly')

    if (t.value !== value) t.value = value
    t.placeholder = placeholder
    t.disabled = disabled
    t.readOnly = readonly

    if (this.autosizeEnabled()) {
      // autosize：高度由 min-rows/max-rows 约束，rows 取 min-rows
      t.rows = this.minRows()
      t.style.resize = 'none'
      this.autoResize()
    } else {
      t.rows = rows
      t.style.resize = resize
      this.resetHeight()
    }
  }

  /** autosize 开启判定：规范命名 autosize，旧属性 auto-height 兼容 */
  private autosizeEnabled(): boolean {
    return this.hasAttr('autosize') || this.hasAttr('auto-height')
  }

  private minRows(): number {
    const n = Number(this.getAttr('min-rows', '1'))
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
  }

  private maxRows(): number {
    const n = Number(this.getAttr('max-rows', '6'))
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 6
  }

  /** 行高估算：优先读计算样式，读不到走 font-size-md(14) × 1.5 默认 */
  private lineHeight(): number {
    const t = this.ta
    if (!t) return 21
    const cs = getComputedStyle(t)
    const lh = parseFloat(cs.lineHeight)
    const fs = parseFloat(cs.fontSize)
    if (Number.isFinite(lh) && lh > 0) {
      // 浏览器中 line-height 计算值为像素（如 21px）；无单位倍数（如 1.5）时乘 font-size 还原
      if (cs.lineHeight.endsWith('px')) return lh
      if (Number.isFinite(fs) && fs > 0) return lh * fs
      return lh * 14
    }
    if (Number.isFinite(fs) && fs > 0) return fs * 1.5
    return 21
  }

  /**
   * 高度自适应（增量渲染：只改 style.height，不重建 DOM）。
   * 范围 clamp 到 [min-rows, max-rows]，超出 max-rows 出滚动条，空态回 min-rows。
   */
  private autoResize(): void {
    const t = this.ta
    if (!t || !this.autosizeEnabled()) return
    const lh = this.lineHeight()
    const minRows = this.minRows()
    const maxRows = Math.max(this.maxRows(), minRows)
    const minH = Math.round(lh * minRows + PADDING_V)
    const maxH = Math.round(lh * maxRows + PADDING_V)
    t.style.minHeight = `${minH}px`
    t.style.maxHeight = `${maxH}px`
    t.style.height = 'auto'
    const target = Math.min(Math.max(t.scrollHeight, minH), maxH)
    t.style.height = `${target}px`
    t.style.overflowY = t.scrollHeight > maxH ? 'auto' : 'hidden'
  }

  /** 退出 autosize 时清掉内联高度，交还给 rows/CSS 控制 */
  private resetHeight(): void {
    const t = this.ta
    if (!t) return
    t.style.height = ''
    t.style.minHeight = ''
    t.style.maxHeight = ''
    t.style.overflowY = ''
  }
}
