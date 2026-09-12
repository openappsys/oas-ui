import { OASElement } from '@oas-ui/core'

/**
 * 尺寸档位：对齐全局 control-height token（ui-spec §2.1）
 * small=24px / medium=32px（默认）/ large=40px
 */
type PinSize = 'small' | 'medium' | 'large'
/** 形态档位：outlined 描边（默认）/ filled 填充 / underlined 下划线 */
type PinVariant = 'outlined' | 'filled' | 'underlined'
/**
 * 字符约束语义档（非原生 type 透传）：
 * - number：仅数字 [0-9]（默认，OTP 主场景），联动 inputmode=numeric
 * - alphanumeric：字母 + 数字
 * - text：任意字符
 * 内部格子恒为原生 text/password 输入（原生 number 允许 e/E/±/.，不可用）
 */
type PinType = 'number' | 'text' | 'alphanumeric'

const VALID_SIZES: readonly string[] = ['small', 'medium', 'large']
const VALID_VARIANTS: readonly string[] = ['outlined', 'filled', 'underlined']
const VALID_TYPES: readonly string[] = ['number', 'text', 'alphanumeric']

/** 非法枚举值告警去重（同值只 warn 一次） */
const warned = new Set<string>()
function warnOnce(msg: string): void {
  if (!warned.has(msg)) {
    warned.add(msg)
    console.warn(msg)
  }
}

function normalizeEnum(raw: string, valid: readonly string[], fallback: string, label: string): string {
  if (valid.includes(raw)) return raw
  warnOnce(`[oas-pin-input] 非法 ${label} "${raw}"，已回落 ${fallback}；合法值：${valid.join('/')}`)
  return fallback
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrap {
  position: relative;
  display: inline-flex;
}
.container {
  display: inline-flex;
  gap: var(--oas-space-2);
  --pin-cell-w: 44px;
  --pin-font: var(--oas-font-size-lg);
}
input {
  appearance: none;
  box-sizing: border-box;
  width: var(--pin-cell-w);
  height: var(--oas-control-height-md);
  text-align: center;
  font-size: var(--pin-font);
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

/* ===== size 档位（medium 为基线，零回归） ===== */
.container[data-size='small'] {
  --pin-cell-w: 32px;
  --pin-font: var(--oas-font-size-md);
}
.container[data-size='small'] input {
  height: var(--oas-control-height-sm);
}
.container[data-size='large'] {
  --pin-cell-w: 56px;
  --pin-font: var(--oas-font-size-xl);
}
.container[data-size='large'] input {
  height: var(--oas-control-height-lg);
}

/* ===== variant 形态 ===== */
.container[data-variant='filled'] input {
  background: var(--oas-color-bg-hover);
  border-color: transparent;
}
.container[data-variant='filled'] input:hover {
  border-color: var(--oas-color-border);
}
.container[data-variant='underlined'] input {
  border: none;
  border-block-end: 1px solid var(--oas-color-border);
  border-radius: 0;
  background: transparent;
}
.container[data-variant='underlined'] input:hover {
  border-block-end-color: var(--oas-color-primary);
}
.container[data-variant='underlined'] input:focus {
  outline: none;
  border-block-end-color: var(--oas-color-primary);
  box-shadow: 0 1px 0 0 var(--oas-color-primary);
}

/* ===== attached 连体（格间无间距共享边框，仅端点圆角） ===== */
.container[data-attached] {
  gap: 0;
}
.container[data-attached] input {
  position: relative;
}
.container[data-attached] input ~ input {
  margin-inline-start: -1px;
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
.container[data-attached] input:not(:last-of-type) {
  border-start-end-radius: 0;
  border-end-end-radius: 0;
}
.container[data-attached] input:focus {
  z-index: 1;
}

/* ===== 分隔符 ===== */
.separator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--pin-font);
  user-select: none;
}

/* ===== 状态色（声明于 variant 之后：同优先级时 error 覆盖 success 覆盖形态） ===== */
:host([success]) .container input {
  border-color: var(--oas-color-success);
}
:host([success]) .container input:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([aria-invalid='true']) .container input {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .container input:focus {
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

/* ===== loading 提交中态（容器遮罩 spinner） ===== */
.spinner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.spinner::after {
  content: '';
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  animation: oas-pin-input-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-pin-input-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASPinInput extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'length',
      'value',
      'mask',
      'disabled',
      'readonly',
      'type',
      'aria-invalid',
      'disabled-skip',
      'otp',
      'separator',
      'separator-after',
      'size',
      'placeholder',
      'variant',
      'attached',
      'loading',
      'pattern',
    ]
  }

  private container: HTMLElement | null = null
  private spinner: HTMLElement | null = null
  private cells: HTMLInputElement[] = []
  private currentLength = 0
  /** 焦点当前是否在组件内部（格间移动不算进出，兼防 relatedTarget 缺失的环境差异） */
  private focusInside = false
  /** 组件获焦时的值快照：失焦时对比决定是否派发 oas-change（commit 语义） */
  private focusSnapshot: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrap">
        <div class="container" part="container" role="group"></div>
        <span class="spinner" part="spinner" aria-hidden="true" hidden></span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定键盘/粘贴/输入/焦点事件（render 与水合路径共用） */
  private bind(): void {
    this.container = this.shadow.querySelector('.container')
    this.spinner = this.shadow.querySelector('.spinner')
    this.container?.addEventListener('keydown', (e: KeyboardEvent) => this.onKeydown(e))
    this.container?.addEventListener('paste', (e: ClipboardEvent) => this.onPaste(e))
    this.container?.addEventListener('input', (e: Event) => this.onInput(e))
    this.container?.addEventListener('focusin', (e: Event) => this.onFocusIn(e as FocusEvent))
    this.container?.addEventListener('focusout', (e: Event) => this.onFocusOut(e as FocusEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
    // autofocus：首连即聚焦首个空格（一次性，不随属性变化重触发）
    if (this.hasAttr('autofocus')) this.focusFirstEmpty()
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
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）；loading 期间一并锁格
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    const loading = this.hasAttr('loading')
    const masked = this.hasAttr('mask')
    const type = masked ? 'password' : 'text'
    const semanticType = this.normalizeType()
    // inputmode 联动：number 弹数字键盘；text/alphanumeric 用默认全键盘
    const inputMode = masked ? '' : semanticType === 'number' ? 'numeric' : ''
    const otp = this.hasAttr('otp')
    const placeholder = this.getAttr('placeholder', '')
    const size = normalizeEnum(this.getAttr('size', 'medium') || 'medium', VALID_SIZES, 'medium', 'size')
    const variant = normalizeEnum(
      this.getAttr('variant', 'outlined') || 'outlined',
      VALID_VARIANTS,
      'outlined',
      'variant',
    )
    const attached = this.hasAttr('attached')
    const invalid = this.getAttr('aria-invalid', '')

    if (length !== this.currentLength) this.buildCells(length)

    // value 分发同步过滤：type/pattern 约束对受控初值同样生效（展示层过滤，不回写宿主属性）
    const code = this.filterText(this.getAttr('value', '')).slice(0, length)
    this.cells.forEach((cell, i) => {
      const ch = code[i] ?? ''
      if (cell.value !== ch) cell.value = ch
      cell.disabled = disabled || loading
      cell.readOnly = readonly
      cell.type = type
      if (inputMode) cell.setAttribute('inputmode', inputMode)
      else cell.removeAttribute('inputmode')
      cell.autocomplete = otp ? 'one-time-code' : 'off'
      cell.placeholder = placeholder
      cell.setAttribute('aria-label', this.t('pinInput.digit', { position: i + 1 }))
      if (invalid !== '') cell.setAttribute('aria-invalid', invalid)
      else cell.removeAttribute('aria-invalid')
    })
    container.setAttribute('aria-label', this.t('pinInput.group'))
    if (invalid !== '') container.setAttribute('aria-invalid', invalid)
    else container.removeAttribute('aria-invalid')

    container.setAttribute('data-size', size)
    container.setAttribute('data-variant', variant)
    if (attached) container.setAttribute('data-attached', '')
    else container.removeAttribute('data-attached')

    if (loading) container.setAttribute('aria-busy', 'true')
    else container.removeAttribute('aria-busy')
    if (this.spinner) this.spinner.hidden = !loading

    this.syncSeparators()
  }

  /** 语义化 type 归一化（非法值回落 number 并单次告警） */
  private normalizeType(): PinType {
    return normalizeEnum(this.getAttr('type', 'number') || 'number', VALID_TYPES, 'number', 'type') as PinType
  }

  /**
   * 逐字符约束正则：pattern 优先（非法正则告警后回落 type 档），
   * number=[0-9] / alphanumeric=[a-zA-Z0-9] / text=不过滤
   */
  private charsetFilter(): RegExp | null {
    const pattern = this.getAttr('pattern', '').trim()
    if (pattern !== '') {
      try {
        return new RegExp(pattern)
      } catch {
        warnOnce(`[oas-pin-input] 非法 pattern "${pattern}"，已忽略并回落 type 字符约束`)
      }
    }
    const t = this.normalizeType()
    if (t === 'text') return null
    if (t === 'alphanumeric') return /[a-zA-Z0-9]/
    return /[0-9]/
  }

  /** 过滤文本：保留约束内字符（粘贴清洗与 value 分发共用） */
  private filterText(text: string): string {
    const re = this.charsetFilter()
    if (!re) return text
    return Array.from(text)
      .filter((ch) => re.test(ch))
      .join('')
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

  /** 分隔符同步（幂等）：separator 为空全移除；separator-after 缺省=每相邻对之间 */
  private syncSeparators(): void {
    const container = this.container
    if (!container) return
    for (const node of [...container.querySelectorAll('.separator')]) node.remove()
    const sep = this.getAttr('separator', '')
    if (sep === '') return
    const raw = this.getAttr('separator-after', '').trim()
    const positions =
      raw === ''
        ? Array.from({ length: this.currentLength - 1 }, (_, i) => i + 1)
        : raw
            .split(',')
            .map((part) => Number(part.trim()))
            .filter((n) => Number.isInteger(n) && n >= 1 && n < this.currentLength)
    for (const pos of positions) {
      const cell = this.cells[pos - 1]
      if (!cell) continue
      const span = document.createElement('span')
      span.className = 'separator'
      span.setAttribute('part', 'separator')
      span.setAttribute('aria-hidden', 'true')
      span.textContent = sep
      cell.after(span)
    }
  }

  /** 组件当前值（各格拼接） */
  private getValue(): string {
    return this.cells.map((c) => c.value).join('')
  }

  /** 交互锁定：禁用注入 / 只读 / loading 提交中 */
  private get locked(): boolean {
    return this.injectDisabled() || this.hasAttr('readonly') || this.hasAttr('loading')
  }

  /** RTL 判定：就近 [dir] 祖先（含 documentElement），方向键/视觉序随写作方向反转 */
  private isRTL(): boolean {
    const host = this.closest('[dir]')
    const dir = (
      host?.getAttribute('dir') ??
      this.ownerDocument?.documentElement.getAttribute('dir') ??
      'ltr'
    ).toLowerCase()
    return dir === 'rtl'
  }

  /**
   * 组件级聚焦：`focus()` 无参聚焦首个空格（全部填满时聚焦末格）；`focus(index)` 聚焦指定格
   * （越界回落默认策略）；传原生 FocusOptions（如 `{ preventScroll: true }`）转发宿主元素原生聚焦。
   */
  override focus(indexOrOptions?: number | FocusOptions): void {
    if (typeof indexOrOptions === 'object' && indexOrOptions !== null) {
      super.focus(indexOrOptions)
      return
    }
    const index = indexOrOptions
    if (typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < this.cells.length) {
      this.cells[index]?.focus()
      return
    }
    this.focusFirstEmpty()
  }

  /** 缺省聚焦策略：首个空格，全部填满时聚焦末格 */
  private focusFirstEmpty(): void {
    if (!this.cells.length) return
    const target = this.cells.find((c) => c.value === '') ?? this.cells[this.cells.length - 1]
    target?.focus()
  }

  /** 使当前活动格失焦 */
  override blur(): void {
    const active = this.shadow.activeElement as HTMLElement | null
    active?.blur()
  }

  private onKeydown(e: KeyboardEvent): void {
    if (this.locked) return
    const idx = this.cells.indexOf(e.target as HTMLInputElement)
    if (idx < 0) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      // RTL 下视觉序反转：ArrowLeft 前进、ArrowRight 后退
      const forward = this.isRTL() ? e.key === 'ArrowLeft' : e.key === 'ArrowRight'
      const next = forward ? Math.min(this.cells.length - 1, idx + 1) : Math.max(0, idx - 1)
      this.cells[next]?.focus()
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
    if (this.locked) return
    const idx = this.cells.indexOf(e.target as HTMLInputElement)
    if (idx < 0) return
    const cell = this.cells[idx]
    if (!cell) return
    // 兜底归一化：每格最多一个字符 + 逐字符约束过滤（自动填充/多字符输入）
    cell.value = this.filterText(cell.value).slice(-1)
    this.commitFromCells(idx, true)
  }

  private onPaste(e: ClipboardEvent): void {
    if (this.locked) return
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text) return
    e.preventDefault()
    const idx = this.cells.indexOf(document.activeElement as HTMLInputElement)
    const start = idx >= 0 ? idx : 0
    // 粘贴分发同步过滤（等价 sanitizeValue：约束外字符直接剔除）
    const chars = this.filterText(text.trim())
      .slice(0, this.currentLength - start)
      .split('')
    chars.forEach((ch, i) => {
      const cell = this.cells[start + i]
      if (cell) cell.value = ch
    })
    this.cells[Math.min(start + chars.length, this.currentLength - 1)]?.focus()
    this.commitFromCells(start)
  }

  /** 组件级获焦：记录焦点在组件内 + 快照当前值（change commit 对比基准）并派发 oas-focus；格间移动不派发 */
  private onFocusIn(e: FocusEvent): void {
    const idx = this.cells.indexOf(e.target as HTMLInputElement)
    if (idx < 0) return
    if (this.focusInside) return
    this.focusInside = true
    this.focusSnapshot = this.getValue()
    this.emit('focus', { index: idx })
  }

  /** 组件级失焦：值相对获焦快照有变化才派发 oas-change（先 change 后 blur，对齐原生顺序） */
  private onFocusOut(e: FocusEvent): void {
    const idx = this.cells.indexOf(e.target as HTMLInputElement)
    if (idx < 0) return
    if (this.isCell(e.relatedTarget)) return
    this.focusInside = false
    const current = this.getValue()
    if (this.focusSnapshot !== null && current !== this.focusSnapshot) {
      this.emit('change', { value: current })
    }
    this.focusSnapshot = null
    this.emit('blur', { index: idx })
  }

  private isCell(node: EventTarget | null): boolean {
    return !!node && this.cells.includes(node as HTMLInputElement)
  }

  private commitFromCells(idx: number, advance = false): void {
    const code = this.getValue()
    const prev = this.getAttr('value', '')
    this.setAttribute('value', code)
    this.emit('input', { value: code, index: idx })
    const nowComplete = code.length === this.currentLength
    const wasComplete = prev.length === this.currentLength
    if (nowComplete && !wasComplete) {
      this.emit('complete', { value: code })
      if (this.hasAttr('auto-submit')) this.autoRequestSubmit()
    }
    if (advance) {
      const next = this.cells.findIndex((c, i) => i > idx && c.value === '')
      if (next >= 0) this.cells[next]?.focus()
    }
  }

  /** 填满自动提交：显式 opt-in（auto-submit），调关联 form 的 requestSubmit（触发 submit 事件与约束校验）；无 form 时 no-op */
  private autoRequestSubmit(): void {
    const form = this.closest('form')
    if (!form) return
    if (typeof form.requestSubmit === 'function') form.requestSubmit()
  }
}
