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
  /** 水合首帧的测量写入是否已延迟登记（autosize 高度依据 scrollHeight，SSR 无法预知真实内容高度） */
  private resizeRafScheduled = false
  private hydratedFirstFrameApplied = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <textarea part="textarea"></textarea>
    `
  }

  /** 缓存节点引用 + 绑定输入事件（render 与水合路径共用） */
  private bind(): void {
    this.ta = this.shadow.querySelector('textarea')
    this.ta?.addEventListener('input', () => {
      this.emit('input', { value: this.ta!.value })
      this.autoResize()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（textarea 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('textarea')) return false
    this.bind()
    return true
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
      this.maybeAutoResize()
    } else {
      t.rows = rows
      t.style.resize = resize
      this.resetHeight()
    }
  }

  /**
   * autosize 测量写入的 DSD 水合适配：SSR 快照中 scrollHeight 恒 0 → 写入 min-rows 高；
   * 水合首帧若同步测量会写入与快照不同的真实高度（闪动）。故水合场景延迟到首帧后
   * （与 affix 的布局写入治理一致），纯 CSR 或水合后的后续 update 一律同步测量。
   */
  private maybeAutoResize(): void {
    if (this.wasHydrated() && !this.hydratedFirstFrameApplied) {
      this.scheduleHydratedResize()
      return
    }
    this.autoResize()
  }

  /** 水合首帧：测量写入统一延迟到 rAF 校正；期间重复调用一律抑制 */
  private scheduleHydratedResize(): void {
    if (this.resizeRafScheduled) return
    this.resizeRafScheduled = true
    const raf = requestAnimationFrame(() => {
      this.hydratedFirstFrameApplied = true
      this.autoResize()
    })
    this.onCleanup(() => cancelAnimationFrame(raf))
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

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLTextAreaElement>('textarea')?.focus(options)
  }
}
