import { OASElement } from '@oas-ui/core/oas-element'
import { normalizeChoice } from '../../shared/choice.js'
import { devWarn } from '../../shared/dev-warn.js'

/** size 尺寸档（对齐 oas-input / oas-dynamic-tags：small/medium/large，控高走 --oas-control-height-* token） */
const VALID_SIZES = ['small', 'medium', 'large'] as const

/**
 * 邮箱格式校验（内联校验用，刻意保持务实口径）：
 * 本地部分允许字母数字与 ._ % + - 常见符号；域名允许字母数字与 -，至少一段后缀（TLD ≥2 位）。
 * 不追求 RFC 5322 全覆盖——收件人场景的可读误判率优先，宿主可通过 oas-invalid 自行裁决。
 */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

/** 粘贴拆分隔符：分号 / 逗号 / 换行 / 空白（邮箱本地语义不含这些字符，可安全切分） */
const PASTIT_SEP_RE = /[;,\s]+/

/** 输入法组合态判定：isComposing 或旧浏览器 keyCode 229 均视为组合中（Enter 选词不触发提交） */
function isComposing(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

function isEmail(value: string): boolean {
  return EMAIL_RE.test(value)
}

const STYLE = `
  :host {
    display: inline-flex;
    flex-direction: column;
    gap: var(--oas-space-1);
    font-family: inherit;
    max-width: 100%;
    /* 尺寸档内部控高变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
    --_ch: var(--oas-control-height-md);
    --_fs: var(--oas-font-size-md);
  }
  :host([hidden]) {
    display: none;
  }
  :host([data-size='small']) {
    --_ch: var(--oas-control-height-sm);
    --_fs: var(--oas-font-size-sm);
  }
  :host([data-size='large']) {
    --_ch: var(--oas-control-height-lg);
    --_fs: var(--oas-font-size-lg);
  }
  /* 控件盒：chips 与无边框弹性输入同居（输入框语义的单控件形态） */
  .control {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--oas-space-1);
    box-sizing: border-box;
    padding: var(--oas-space-1) var(--oas-space-2);
    min-height: var(--_ch);
    border: 1px solid var(--oas-color-border);
    border-radius: var(--oas-radius-md);
    background: var(--oas-color-bg);
    color: var(--oas-color-text-primary);
    font-size: var(--_fs);
    cursor: text;
    transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
      box-shadow var(--oas-transition-fast) var(--oas-ease-out);
  }
  .control:hover {
    border-color: var(--oas-color-primary);
  }
  .control:focus-within {
    border-color: var(--oas-color-primary);
    box-shadow: var(--oas-focus-ring);
  }
  .control:has(input:disabled) {
    cursor: not-allowed;
    background: var(--oas-color-bg-disabled);
  }
  /* chips 容器：display:contents 无盒，chip 直接参与控件盒 flex 排布 */
  .chips {
    display: contents;
  }
  .chip {
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
  /* 非法邮箱 chip：红描边（danger token），title 携带 i18n 提示 */
  .chip[data-invalid='true'] {
    border-color: var(--oas-color-danger);
  }
  .chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chip-remove {
    appearance: none;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--oas-color-text-secondary);
    border-radius: 50%;
    flex: none;
    position: relative;
  }
  .chip-remove:hover:not(:disabled) {
    color: var(--oas-color-text-primary);
  }
  .chip-remove:disabled {
    cursor: not-allowed;
    color: var(--oas-color-text-disabled);
  }
  .chip-remove:focus-visible {
    outline: none;
    box-shadow: var(--oas-focus-ring);
  }
  .chip-remove[hidden] {
    display: none;
  }
  /* 原位编辑输入框：嵌入 chip 内无边框小输入（Backspace 回编辑通道） */
  .chip-edit {
    appearance: none;
    border: none;
    background: transparent;
    padding: 0;
    min-width: 5em;
    max-width: 100%;
    font: inherit;
    color: var(--oas-color-text-primary);
  }
  .chip-edit:focus {
    outline: none;
  }
  input.chip-input {
    appearance: none;
    border: none;
    background: transparent;
    outline: none;
    padding: 0;
    margin: 0;
    flex: 1 1 6em;
    min-width: 6em;
    height: calc(var(--_ch) - 10px);
    color: var(--oas-color-text-primary);
    font-size: var(--_fs);
    font-family: inherit;
  }
  input.chip-input::placeholder {
    color: var(--oas-color-text-secondary);
  }
  input.chip-input:disabled {
    cursor: not-allowed;
    color: var(--oas-color-text-disabled);
  }
  input.chip-input[hidden] {
    display: none;
  }
  .hint {
    display: block;
    color: var(--oas-color-danger);
    font-size: var(--oas-font-size-sm);
  }
  .hint[hidden] {
    display: none;
  }
  /* ---- 触屏（pointer: coarse）：chip 抬高 + 删除钮热区 ≥44px ----
     置于样式表末尾：coarse 规则须覆盖上方基础尺寸规则（同优先级，后写胜出） */
  @media (pointer: coarse) {
    .chip {
      min-height: var(--oas-touch-target-min, 44px);
    }
    .chip-remove {
      width: var(--oas-touch-target-min, 44px);
      align-self: stretch;
      height: auto;
    }
  }

  @media (forced-colors: active) {
    /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
    .chip-remove:focus-visible,
    .chip-edit:focus {
      outline: 1px solid CanvasText;
      outline-offset: 1px;
      box-shadow: none;
    }
  }
`

const CLOSE_ICON = `
<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
  <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`

/**
 * 收件人 chips 输入：chip 与无边框输入同居一个控件盒。
 *
 * - 成 chip：Enter / `,` / `；`；粘贴按 分号/逗号/换行/空白 自动拆分批量成 chip
 * - 回编辑：输入为空时 Backspace 把上一 chip 变为可编辑文本（Enter/失焦提交、Esc 取消、清空=删除）
 * - 内联校验：非法邮箱 chip 红描边（danger token）+ 派发 oas-invalid（detail { value, index }，
 *   仅用户交互路径派发、重渲染/受控写入不重复派发——幂等）；不拦截提交语义，受控数据宿主裁决
 * - `value` 双通道：property 为 string[]，attribute 为 JSON 序列化字符串
 * - `max` 上限：超出派发 oas-exceed-limit（detail { value, max }）且不再新增
 * - 重复值静默去重（实例级一次 devWarn）
 *
 * 事件：oas-change { value, trigger: add | remove | edit | paste }、oas-add、oas-remove、
 * oas-invalid、oas-exceed-limit、oas-focus、oas-blur。
 */
export class OASChipsInput extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'max', 'placeholder', 'disabled', 'readonly', 'size']
  }

  private controlEl: HTMLElement | null = null
  private chipsEl: HTMLElement | null = null
  private inputEl: HTMLInputElement | null = null
  private hintEl: HTMLElement | null = null
  private chips: string[] = []
  private lastWrittenAttr: string | null = null
  private chipsKey = ''
  private hintTimer: number | null = null
  /** 原位编辑中的 chip 下标（null = 无编辑态） */
  private editingIndex: number | null = null
  /** 重复值 devWarn 实例级只报一次 */
  private dupWarned = false

  /**
   * @apiProperty 当前值：邮箱字符串数组（attribute 通道为 JSON 序列化字符串）。
   * 程序性写值即生效语义（受控）：归一化、回写 `value` 属性并重建 chips，不派发任何事件。
   */
  get value(): string[] {
    return this.chips.slice()
  }

  set value(v: string[]) {
    this.chips = (Array.isArray(v) ? v : []).map((x) => String(x))
    this.editingIndex = null
    this.chipsKey = ''
    this.writeBack()
    this.syncChips()
    this.syncInputState()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="control" part="control">
        <span class="chips" part="chips" role="list"></span>
        <input class="chip-input" part="input" autocomplete="off" />
      </div>
      <span class="hint" role="alert" hidden></span>
    `
  }

  /** 缓存节点引用 + 绑定输入/删除/编辑事件（render 与水合路径共用） */
  private bind(): void {
    this.controlEl = this.shadow.querySelector('.control')
    this.chipsEl = this.shadow.querySelector('.chips')
    this.inputEl = this.shadow.querySelector('.chip-input')
    this.hintEl = this.shadow.querySelector('.hint')

    this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => this.onKeydown(e))
    this.inputEl?.addEventListener('input', () => this.hideHint())
    this.inputEl?.addEventListener('focus', () => this.emit('focus'))
    this.inputEl?.addEventListener('blur', () => this.emit('blur'))
    this.inputEl?.addEventListener('paste', (e: ClipboardEvent) => this.onPaste(e))
    // 点控件盒空白处把焦点还给输入框（单控件心智）
    this.controlEl?.addEventListener('click', (e: MouseEvent) => {
      if (e.target === this.controlEl) this.inputEl?.focus()
    })
    this.chipsEl?.addEventListener('click', (e: MouseEvent) => this.handleChipsClick(e))
    this.onCleanup(() => {
      if (this.hintTimer != null) window.clearTimeout(this.hintTimer)
      this.hintTimer = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（控件盒与输入框存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.control')) return false
    if (!this.shadow.querySelector('.chip-input')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseValue()
    this.syncChips()
    this.syncInputState()
  }

  private parseValue(): void {
    const raw = this.getAttribute('value')
    if (raw == null || raw === this.lastWrittenAttr) return
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        this.chips = parsed.map((v) => (typeof v === 'string' ? v : String(v)))
        this.chipsKey = ''
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

  /** 组级冻结判定：disabled / readonly 均禁输入、删除与编辑 */
  private isFrozen(): boolean {
    return this.injectDisabled() || this.hasAttr('readonly')
  }

  /** chip 的非法邮箱提示文案（title 与 hint 共用） */
  private invalidMessage(): string {
    return this.t('chipsInput.invalidEmail')
  }

  private syncChips(): void {
    const chipsEl = this.chipsEl
    if (!chipsEl) return
    const nextKey = `${JSON.stringify(this.chips)}|${this.editingIndex ?? -1}`
    if (nextKey === this.chipsKey) return
    this.chipsKey = nextKey

    chipsEl.innerHTML = ''
    this.chips.forEach((label, idx) => {
      chipsEl.appendChild(this.buildChip(label, idx))
    })
  }

  /** 单个 chip 构建：编辑态渲染原位输入框；非法邮箱 data-invalid 红描边 + title 提示 */
  private buildChip(label: string, idx: number): HTMLElement {
    const item = document.createElement('span')
    item.className = 'chip'
    item.setAttribute('part', 'chip')
    item.setAttribute('role', 'listitem')

    if (this.editingIndex === idx) {
      const edit = document.createElement('input')
      edit.className = 'chip-edit'
      edit.setAttribute('part', 'chip-edit')
      edit.setAttribute('aria-label', this.t('chipsInput.editLabel'))
      edit.value = label
      edit.addEventListener('keydown', (e: KeyboardEvent) => this.onEditKeydown(e, idx))
      edit.addEventListener('blur', () => {
        if (this.editingIndex === idx) this.commitEdit(idx)
      })
      item.appendChild(edit)
      return item
    }

    const invalid = !isEmail(label)
    if (invalid) {
      item.setAttribute('data-invalid', 'true')
      item.setAttribute('title', this.invalidMessage())
    }

    const text = document.createElement('span')
    text.className = 'chip-label'
    text.textContent = label
    item.appendChild(text)

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'chip-remove'
    btn.setAttribute('part', 'chip-remove')
    btn.setAttribute('aria-label', this.t('chipsInput.remove', { label }))
    btn.innerHTML = CLOSE_ICON
    item.appendChild(btn)

    return item
  }

  private syncInputState(): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    inputEl.disabled = disabled
    inputEl.hidden = readonly
    inputEl.placeholder = this.getAttr('placeholder', '') || this.t('chipsInput.placeholder')
    inputEl.setAttribute('aria-label', this.t('chipsInput.inputLabel'))

    // 宿主态镜像：size（就近读取注入，与全局密度联动）/ readonly
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    if (readonly) this.setAttribute('aria-readonly', 'true')
    else this.removeAttribute('aria-readonly')

    const chipNodes = [...(this.chipsEl?.querySelectorAll<HTMLElement>('.chip') ?? [])]
    chipNodes.forEach((chip) => {
      const btn = chip.querySelector<HTMLButtonElement>('.chip-remove')
      if (btn) {
        btn.disabled = disabled
        btn.hidden = readonly
      }
    })
  }

  // ---------- 成 chip（Enter / 逗号 / 分号） ----------

  private onKeydown(e: KeyboardEvent): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    // IME 组合态防护：中文输入法 Enter/分隔符选词确认不触发提交（isComposing / keyCode 229）
    if (isComposing(e)) return
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      this.commitInput()
    } else if (e.key === 'Backspace' && inputEl.value === '' && this.chips.length > 0) {
      // 输入为空时 Backspace 回编辑上一 chip（变为可编辑文本）
      e.preventDefault()
      this.startEdit(this.chips.length - 1)
    }
  }

  private commitInput(): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    const value = inputEl.value.trim()
    if (value === '') return
    if (!this.tryAdd(value)) {
      // 未新增（超限/重复）：清空输入让用户继续（重复静默、超限已提示）
      if (this.chips.includes(value) || this.chips.length >= this.maxValue()) inputEl.value = ''
      return
    }
    inputEl.value = ''
    this.afterMutation('add', value)
  }

  /** 粘贴拆分：文本含分隔符（分号/逗号/换行/空白）时批量建 chip，否则保持原生插入 */
  private onPaste(e: ClipboardEvent): void {
    const text = e.clipboardData?.getData('text') ?? ''
    if (!PASTIT_SEP_RE.test(text)) return
    e.preventDefault()
    const pieces = text
      .split(PASTIT_SEP_RE)
      .map((s) => s.trim())
      .filter((s) => s !== '')
    let added = false
    for (const piece of pieces) {
      if (this.tryAdd(piece)) {
        this.emit('add', { value: piece, index: this.chips.length - 1 })
        added = true
      }
    }
    if (added) {
      this.writeBack()
      this.chipsKey = ''
      this.syncChips()
      this.syncInputState()
      this.emitChange('paste')
    }
  }

  /**
   * 校验并追加（不触发同步/事件，供单条与批量共用）：上限 > 重复 > 追加 > 邮箱校验。
   * 上限拦截派发 oas-exceed-limit；重复静默去重（实例级一次 devWarn）；
   * 非法邮箱照常成 chip（不拦截提交语义）并派发 oas-invalid。
   */
  private tryAdd(value: string): boolean {
    if (value === '') return false
    if (this.chips.length >= this.maxValue()) {
      this.emit('exceed-limit', { value, max: this.maxValue() })
      this.showHint(this.t('chipsInput.exceedLimit', { max: this.maxValue() }))
      return false
    }
    if (this.chips.includes(value)) {
      this.warnDuplicate(value)
      return false
    }
    this.chips.push(value)
    if (!isEmail(value)) {
      this.emit('invalid', { value, index: this.chips.length - 1 })
      this.showHint(this.invalidMessage())
    }
    return true
  }

  private warnDuplicate(value: string): void {
    if (this.dupWarned) return
    this.dupWarned = true
    devWarn(`[oas-chips-input] 重复值已静默去重：${value}`)
  }

  // ---------- 删除与回编辑 ----------

  private handleChipsClick(e: MouseEvent): void {
    const path = e.composedPath() as Element[]
    const btn = path.find((n) => n instanceof Element && n.classList.contains('chip-remove'))
    if (!btn) return
    const item = path.find((n) => n instanceof Element && n.classList.contains('chip'))
    const idx = item ? [...this.chipsEl!.querySelectorAll('.chip')].indexOf(item) : -1
    if (idx >= 0) this.removeChip(idx)
  }

  private removeChip(idx: number): void {
    if (idx < 0 || idx >= this.chips.length) return
    if (this.isFrozen()) return
    const removed = this.chips[idx]!
    this.chips.splice(idx, 1)
    if (this.editingIndex === idx) this.editingIndex = null
    this.writeBack()
    this.chipsKey = ''
    this.syncChips()
    this.syncInputState()
    this.emit('remove', { value: removed, index: idx })
    this.emitChange('remove')
  }

  private startEdit(idx: number): void {
    if (this.isFrozen()) return
    if (idx < 0 || idx >= this.chips.length) return
    this.editingIndex = idx
    this.chipsKey = ''
    this.syncChips()
    const edit = this.chipsEl?.querySelector<HTMLInputElement>('.chip-edit')
    edit?.focus()
    edit?.select()
  }

  private onEditKeydown(e: KeyboardEvent, idx: number): void {
    if (isComposing(e)) return
    if (e.key === 'Enter') {
      e.preventDefault()
      this.commitEdit(idx)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.cancelEdit()
      this.inputEl?.focus()
    }
  }

  /**
   * 提交编辑：空值=删除该 chip；同旧值还原退出；与其他 chip 重复静默去重还原；
   * 成功写入并走邮箱校验（非法派发 oas-invalid），派发 oas-change(trigger=edit)。
   */
  private commitEdit(idx: number): void {
    if (this.editingIndex !== idx) return
    const edit = this.chipsEl?.querySelector<HTMLInputElement>('.chip-edit')
    const oldValue = this.chips[idx] ?? ''
    const value = (edit?.value ?? '').trim()
    if (value === oldValue) {
      this.cancelEdit()
      this.inputEl?.focus()
      return
    }
    if (value === '') {
      this.editingIndex = null
      this.removeChip(idx)
      this.inputEl?.focus()
      return
    }
    if (this.chips.some((c, i) => i !== idx && c === value)) {
      this.warnDuplicate(value)
      this.cancelEdit()
      this.inputEl?.focus()
      return
    }
    this.chips[idx] = value
    this.editingIndex = null
    if (!isEmail(value)) {
      this.emit('invalid', { value, index: idx })
      this.showHint(this.invalidMessage())
    }
    this.writeBack()
    this.chipsKey = ''
    this.syncChips()
    this.syncInputState()
    this.emitChange('edit')
    this.inputEl?.focus()
  }

  private cancelEdit(): void {
    this.editingIndex = null
    this.chipsKey = ''
    this.syncChips()
    this.syncInputState()
  }

  // ---------- 值通道与提示 ----------

  /** 单条新增成功后的统一收尾（批量粘贴路径在 onPaste 内自行批量收尾） */
  private afterMutation(trigger: string, added: string): void {
    this.writeBack()
    this.chipsKey = ''
    this.syncChips()
    this.syncInputState()
    this.emit('add', { value: added, index: this.chips.length - 1 })
    this.emitChange(trigger)
  }

  private writeBack(): void {
    this.lastWrittenAttr = JSON.stringify(this.chips)
    this.setAttribute('value', this.lastWrittenAttr)
  }

  private emitChange(trigger: string): void {
    this.emit('change', { value: this.chips.slice(), trigger })
  }

  /** 展示校验提示：hint 文案（danger 色，2s 自动隐藏；输入即清除） */
  private showHint(message: string): void {
    const hintEl = this.hintEl
    if (hintEl) {
      hintEl.textContent = message
      hintEl.hidden = false
    }
    if (this.hintTimer != null) window.clearTimeout(this.hintTimer)
    this.hintTimer = window.setTimeout(() => this.hideHint(), 2000)
  }

  private hideHint(): void {
    if (this.hintTimer != null) {
      window.clearTimeout(this.hintTimer)
      this.hintTimer = null
    }
    if (this.hintEl) this.hintEl.hidden = true
  }
}
