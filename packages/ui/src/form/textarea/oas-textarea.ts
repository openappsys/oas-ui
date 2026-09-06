import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.root {
  display: block;
}
.inner {
  position: relative;
  display: block;
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
textarea:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
textarea:disabled:hover {
  border-color: var(--oas-color-border);
}

/* ---- variant 形态（outlined 默认走基础样式） ---- */
:host([data-variant='filled']) textarea {
  background: var(--oas-color-bg-hover);
  border-color: transparent;
}
:host([data-variant='filled']) textarea:hover {
  border-color: var(--oas-color-primary);
}
:host([data-variant='filled']) textarea:disabled {
  background: var(--oas-color-bg-disabled);
}
:host([data-variant='borderless']) textarea {
  background: transparent;
  border-color: transparent;
}
:host([data-variant='borderless']) textarea:hover,
:host([data-variant='borderless']) textarea:disabled:hover {
  border-color: transparent;
}

/* ---- size 尺寸档位（字号/内边距/最小高度联动；medium 默认走基础样式） ---- */
:host([data-size='small']) textarea {
  min-height: var(--oas-control-height-sm);
  padding: var(--oas-space-1) var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) textarea {
  min-height: var(--oas-control-height-lg);
  padding: var(--oas-space-3) var(--oas-space-4);
  font-size: var(--oas-font-size-lg);
}

/* ---- status 校验态（置于 variant 之后：叠加时校验色优先；宿主 aria-invalid 由 form-item 写入，保留兼容） ---- */
:host([data-status='error']) textarea,
:host([aria-invalid='true']) textarea {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) textarea:focus,
:host([aria-invalid='true']) textarea:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([data-status='warning']) textarea {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) textarea:focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='success']) textarea {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) textarea:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}

/* ---- 清除按钮（右上角：避开 resize 手柄与滚动条） ---- */
.clear-btn {
  position: absolute;
  top: var(--oas-space-2);
  right: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  border-radius: 50%;
  z-index: 2;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}

/* ---- show-count 字数统计（框外右下，n/max 口径，超限 danger；aria-live 读屏播报） ---- */
.count {
  display: block;
  margin-top: var(--oas-space-1, 4px);
  text-align: right;
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
  color: var(--oas-color-text-secondary);
}
.count[data-over='true'] {
  color: var(--oas-color-danger);
}
.count[hidden] {
  display: none;
}
`

/**
 * size 档位 → 上下内边距合计（px）。
 * 与 CSS token 对应：small=--oas-space-1(4px)×2、medium=--oas-space-2(8px)×2、large=--oas-space-3(12px)×2。
 * 仅作为 getComputedStyle 读不到时的回退（happy-dom/SSR 环境不解析 var()）。
 */
const PADDING_V_BY_SIZE: Record<string, number> = { small: 8, medium: 16, large: 24 }

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
      'disabled-skip',
      'maxlength',
      'show-count',
      'status',
      'size',
      'variant',
      'clearable',
      'label',
      'name',
      'autofocus',
      'minlength',
      'required',
      'spellcheck',
      'wrap',
    ]
  }

  private ta: HTMLTextAreaElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private countEl: HTMLElement | null = null
  /** 水合首帧的测量写入是否已延迟登记（autosize 高度依据 scrollHeight，SSR 无法预知真实内容高度） */
  private resizeRafScheduled = false
  private hydratedFirstFrameApplied = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <div class="inner" part="inner">
          <textarea part="textarea"></textarea>
          <button class="clear-btn" part="clear" type="button" hidden>
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
              <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <span class="count" part="count" hidden aria-live="polite"></span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/清除/焦点事件（render 与水合路径共用） */
  private bind(): void {
    this.ta = this.shadow.querySelector('textarea')
    this.clearBtn = this.shadow.querySelector('.clear-btn')
    this.countEl = this.shadow.querySelector('.count')

    this.ta?.addEventListener('input', () => {
      this.emit('input', { value: this.ta!.value })
      this.syncClearVisibility()
      this.syncCount()
      this.autoResize()
    })
    this.ta?.addEventListener('focus', () => this.emit('focus', { value: this.ta!.value }))
    this.ta?.addEventListener('blur', () => this.emit('blur', { value: this.ta!.value }))
    // 原生 change 只在「失焦且值较聚焦时已变」触发，直接等价提交语义
    this.ta?.addEventListener('change', () => this.emit('change', { value: this.ta!.value }))
    this.clearBtn?.addEventListener('click', () => {
      if (!this.ta) return
      this.ta.value = ''
      this.emit('clear', { originalEvent: new MouseEvent('click') })
      // 值已变，实时通道同步派发（与 input 清除行为同构，只听 oas-input 的宿主不能漏掉清除）
      this.emit('input', { value: this.ta.value })
      this.ta.focus()
      this.syncClearVisibility()
      this.syncCount()
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
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')

    // 镜像最终禁用态到宿主 data-disabled（供 :host([data-disabled]) 样式消费，覆盖注入场景）
    this.toggleAttribute('data-disabled', disabled)

    if (t.value !== value) t.value = value
    t.placeholder = placeholder
    t.disabled = disabled
    t.readOnly = readonly

    // 原生属性透传白名单（缺省移除，交还原生默认）
    this.passThrough(t)

    // 可访问名称：label 属性 > placeholder > locale 默认文案
    t.setAttribute('aria-label', this.getAttr('label', placeholder) || this.t('textarea.defaultLabel'))

    // 校验态：宿主 data-status 驱动样式；error 同步 textarea aria-invalid（warning/success 语义上非 invalid）
    const status = this.normalizedStatus()
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') t.setAttribute('aria-invalid', 'true')
    else t.removeAttribute('aria-invalid')

    // 尺寸/形态反射宿主 data-*（非法值回落默认档）
    this.setAttribute('data-size', this.normalizedSize())
    this.setAttribute('data-variant', this.normalizedVariant())

    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      this.clearBtn.hidden = !this.shouldShowClear()
    }

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

    this.syncCount()
  }

  /** 原生属性透传：宿主属性 → 内部 textarea（字符串值原样，布尔属性存在即透传） */
  private passThrough(t: HTMLTextAreaElement): void {
    for (const attr of ['maxlength', 'name', 'minlength', 'spellcheck', 'wrap'] as const) {
      const v = this.getAttr(attr, '')
      if (v === '') t.removeAttribute(attr)
      else t.setAttribute(attr, v)
    }
    for (const attr of ['autofocus', 'required'] as const) {
      if (this.hasAttr(attr)) t.setAttribute(attr, '')
      else t.removeAttribute(attr)
    }
  }

  private normalizedStatus(): string {
    const s = this.getAttr('status', '')
    return s === 'error' || s === 'warning' || s === 'success' ? s : ''
  }

  private normalizedSize(): string {
    const s = this.getAttr('size', 'medium')
    return s === 'small' || s === 'large' ? s : 'medium'
  }

  private normalizedVariant(): string {
    const v = this.getAttr('variant', 'outlined')
    return v === 'filled' || v === 'borderless' ? v : 'outlined'
  }

  private shouldShowClear(): boolean {
    return (
      this.hasAttr('clearable') &&
      !this.injectDisabled() &&
      !this.hasAttr('readonly') &&
      this.ta !== null &&
      this.ta.value !== ''
    )
  }

  private syncClearVisibility(): void {
    if (this.clearBtn) this.clearBtn.hidden = !this.shouldShowClear()
  }

  /** show-count 字数统计：框外右下显示 当前长度/maxlength（无 maxlength 只显示当前长度），超限标 danger */
  private syncCount(): void {
    if (!this.countEl || !this.ta) return
    const show = this.hasAttr('show-count')
    this.countEl.hidden = !show
    if (!show) return
    const maxlength = this.getAttr('maxlength', '')
    const len = this.ta.value.length
    this.countEl.textContent = maxlength === '' ? String(len) : `${len}/${maxlength}`
    if (maxlength !== '' && len > Number(maxlength)) {
      this.countEl.setAttribute('data-over', 'true')
    } else {
      this.countEl.removeAttribute('data-over')
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

  /** max-rows 显式 "0" = 不封顶（主流「autosize 裸开无限增长」形态的显式出口；缺省仍默认 6） */
  private maxRowsUnlimited(): boolean {
    const raw = this.getAttr('max-rows', '')
    return raw !== '' && Number(raw) === 0
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

  /** 上下内边距合计：优先读计算样式（真实浏览器解析 token），读不到回退 size 档位映射 */
  private paddingV(): number {
    const t = this.ta
    if (t) {
      const cs = getComputedStyle(t)
      const pt = parseFloat(cs.paddingTop)
      const pb = parseFloat(cs.paddingBottom)
      // 合计为 0 视为未解析（本组件各档位上下内边距恒 ≥ 4px）
      if (Number.isFinite(pt) && Number.isFinite(pb) && pt + pb > 0) return pt + pb
    }
    return PADDING_V_BY_SIZE[this.normalizedSize()] ?? 16
  }

  /**
   * 高度自适应（增量渲染：只改 style.height，不重建 DOM）。
   * 范围 clamp 到 [min-rows, max-rows]，超出 max-rows 出滚动条，空态回 min-rows；
   * max-rows="0" 显式无上限：不封顶增长、不出滚动条。
   */
  private autoResize(): void {
    const t = this.ta
    if (!t || !this.autosizeEnabled()) return
    const lh = this.lineHeight()
    const minRows = this.minRows()
    const minH = Math.round(lh * minRows + this.paddingV())
    t.style.minHeight = `${minH}px`
    if (this.maxRowsUnlimited()) {
      t.style.maxHeight = ''
      t.style.height = 'auto'
      t.style.height = `${Math.max(t.scrollHeight, minH)}px`
      t.style.overflowY = 'hidden'
      return
    }
    const maxRows = Math.max(this.maxRows(), minRows)
    const maxH = Math.round(lh * maxRows + this.paddingV())
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

  override blur(): void {
    this.shadow.querySelector<HTMLTextAreaElement>('textarea')?.blur()
  }

  /** 选中文本（委托内部 textarea） */
  select(): void {
    this.shadow.querySelector<HTMLTextAreaElement>('textarea')?.select()
  }
}
