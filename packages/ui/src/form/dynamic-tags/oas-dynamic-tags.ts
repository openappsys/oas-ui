import { OASElement } from '@oas-ui/core'

/** size 尺寸档（对齐 oas-input：small/medium/large，控高走 --oas-control-height-* token） */
const VALID_SIZES = ['small', 'medium', 'large'] as const
/** status 校验态：success / warning / error */
const VALID_STATUSES = ['error', 'warning', 'success'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认（非法值不告警，保持输出干净） */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
}

/** 输入法组合态判定：isComposing 或旧浏览器 keyCode 229 均视为组合中（Enter 选词不触发提交） */
function isComposing(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

const STYLE = `
 :host {
  display: inline-flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  font-family: inherit;
  max-width: 100%;
  /* 尺寸档内部控高变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
  --_ch: var(--oas-control-height-md);
  --_fs: var(--oas-font-size-md);
}
:host([data-size='small']) {
  --_ch: var(--oas-control-height-sm);
  --_fs: var(--oas-font-size-sm);
}
:host([data-size='large']) {
  --_ch: var(--oas-control-height-lg);
  --_fs: var(--oas-font-size-lg);
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
.tag[draggable='true'] {
  cursor: grab;
}
.tag.dragging {
  opacity: 0.5;
}
.tag-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 自定义标签模板（template[slot="tag"]）渲染容器：内容横向排布、各自省略 */
.tag-custom {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
}
.tag-custom > * {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 原位编辑输入框：嵌入标签内无边框小输入 */
.tag-edit {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  min-width: 5em;
  max-width: 100%;
  font: inherit;
  color: var(--oas-color-text-primary);
}
.tag-edit:focus {
  outline: none;
}
/* 折叠计数标签（+N）：次要色 chip，title 悬浮展开隐藏标签 */
.tag-overflow {
  display: inline-flex;
  align-items: center;
  padding: 1px var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-tag, var(--oas-color-bg-hover));
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: var(--oas-font-size-sm);
  flex: none;
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
.tag-remove[hidden] {
  display: none;
}
.entry {
  position: relative;
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  height: var(--_ch);
  padding: 0 var(--oas-space-3);
  padding-inline-end: calc(var(--oas-space-3) + var(--oas-entry-pad, 0px));
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--_fs);
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
input[hidden] {
  display: none;
}
/* ---- status 校验态：success / warning / error（置于基础规则后统一胜出） ---- */
:host([data-status='success']) input {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) input:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) input {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) input:focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) input {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
/* 清空按钮：绝对定位输入框右侧（有值且可交互时显示） */
.clear {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  position: absolute;
  inset-inline-end: var(--oas-space-2);
  top: calc((var(--_ch) - 16px) / 2);
  color: var(--oas-color-text-secondary);
  border-radius: var(--oas-radius-sm);
}
.clear:hover {
  color: var(--oas-color-text-primary);
}
.clear:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear[hidden] {
  display: none;
}
.clear svg {
  width: 12px;
  height: 12px;
  display: block;
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

const CLEAR_ICON = `
<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
  <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4"/>
  <path d="M5.6 5.6 L10.4 10.4 M10.4 5.6 L5.6 10.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
</svg>`

export class OASDynamicTags extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'model-value',
      'max',
      'allow-duplicate',
      'disabled',
      'placeholder',
      'disabled-skip',
      'separator',
      'add-on-paste',
      'save-on-blur',
      'sortable',
      'max-tag-count',
      'size',
      'status',
      'readonly',
      'clearable',
      'maxlength',
      'pattern',
    ]
  }

  private tagsEl: HTMLElement | null = null
  private inputEl: HTMLInputElement | null = null
  private hintEl: HTMLElement | null = null
  private clearEl: HTMLButtonElement | null = null
  private tags: string[] = []
  private lastWrittenAttr: string | null = null
  private tagsKey = ''
  private hintTimer: number | null = null
  /** 原位编辑中的标签下标（null = 无编辑态） */
  private editingIndex: number | null = null
  /** 拖拽排序：dragstart 源下标 */
  private dragIndex: number | null = null
  /** light DOM 观察器：template[slot="tag"/"prefix"/"suffix"] 增删 → 重建 */
  private childObserver: MutationObserver | null = null

  get modelValue(): string[] {
    return this.tags.slice()
  }

  set modelValue(v: string[]) {
    this.tags = (Array.isArray(v) ? v : []).map((x) => String(x))
    this.editingIndex = null
    this.tagsKey = ''
    this.writeBack()
    this.syncTags()
    this.syncInputState()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="tags" part="tags" role="list"></div>
      <div class="entry">
        <input class="tag-input" part="input" autocomplete="off" />
        <button class="clear" part="clear" type="button" hidden></button>
        <span class="hint" role="alert" hidden></span>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/删除/排序/编辑/清空事件（render 与水合路径共用） */
  private bind(): void {
    this.tagsEl = this.shadow.querySelector('.tags')
    this.inputEl = this.shadow.querySelector('.tag-input')
    this.hintEl = this.shadow.querySelector('.hint')
    this.clearEl = this.shadow.querySelector('.clear')

    this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => this.onKeydown(e))
    this.inputEl?.addEventListener('input', () => this.hideHint())
    this.inputEl?.addEventListener('focus', () => this.emit('focus'))
    this.inputEl?.addEventListener('blur', () => this.onInputBlur())
    this.inputEl?.addEventListener('paste', (e: ClipboardEvent) => this.onPaste(e))
    this.tagsEl?.addEventListener('click', (e: MouseEvent) => this.handleClick(e))
    this.tagsEl?.addEventListener('dblclick', (e: MouseEvent) => this.handleDblClick(e))
    this.tagsEl?.addEventListener('keydown', (e: KeyboardEvent) => this.onTagsKeydown(e))
    this.tagsEl?.addEventListener('dragstart', (e: Event) => this.handleDragStart(e))
    this.tagsEl?.addEventListener('dragover', (e: Event) => this.handleDragOver(e))
    this.tagsEl?.addEventListener('drop', (e: Event) => this.handleDrop(e))
    this.tagsEl?.addEventListener('dragend', () => this.clearDragState())
    this.clearEl?.addEventListener('click', () => this.clearAll())
    if (this.clearEl) this.clearEl.innerHTML = CLEAR_ICON

    // 标签模板增删 → 重建（模板在 light DOM，标签内容渲染时克隆）
    if (!this.childObserver) {
      const observer = new MutationObserver(() => this.update())
      observer.observe(this, { childList: true, subtree: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
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

  /** 真水合：校验 SSR 快照结构（tags 容器与输入框存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tags')) return false
    if (!this.shadow.querySelector('.tag-input')) return false
    this.bind()
    return true
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

  /** 组级冻结判定：disabled / readonly 均禁输入、删除、排序与编辑 */
  private isFrozen(): boolean {
    return this.injectDisabled() || this.hasAttr('readonly')
  }

  private maxTagCountValue(): number {
    if (!this.hasAttr('max-tag-count')) return Number.POSITIVE_INFINITY
    return Math.max(0, Number.parseInt(this.getAttr('max-tag-count', ''), 10) || 0)
  }

  private saveOnBlur(): boolean {
    return this.getAttr('save-on-blur', 'true') !== 'false'
  }

  private addOnPaste(): boolean {
    return this.getAttr('add-on-paste', 'true') !== 'false'
  }

  private separator(): string {
    return this.getAttr('separator', ',')
  }

  private syncTags(): void {
    const tagsEl = this.tagsEl
    if (!tagsEl) return
    const tpl = this.querySelector('template[slot="tag"]') ? '1' : '0'
    const prefixTpl = this.querySelector('template[slot="prefix"]') ? 'p' : ''
    const suffixTpl = this.querySelector('template[slot="suffix"]') ? 's' : ''
    const limit = this.maxTagCountValue()
    const nextKey = `${JSON.stringify(this.tags)}|${tpl}${prefixTpl}${suffixTpl}|${limit}|${this.editingIndex ?? -1}`
    if (nextKey === this.tagsKey) return
    this.tagsKey = nextKey

    tagsEl.innerHTML = ''

    // prefix 插槽：克隆到标签容器首位
    const prefixTemplate = this.querySelector<HTMLTemplateElement>('template[slot="prefix"]')
    if (prefixTemplate instanceof HTMLTemplateElement) {
      const holder = document.createElement('span')
      holder.className = 'slot-prefix'
      holder.appendChild(prefixTemplate.content.cloneNode(true))
      tagsEl.appendChild(holder)
    }

    const shown = this.tags.slice(0, limit)
    shown.forEach((label, idx) => {
      tagsEl.appendChild(this.buildTag(label, idx))
    })

    // 超量折叠：+N 计数标签，title 悬浮展开隐藏标签（宿主可用 oas-tooltip 组合更强展示）
    if (shown.length < this.tags.length) {
      const overflow = document.createElement('span')
      overflow.className = 'tag-overflow'
      overflow.textContent = `+${this.tags.length - shown.length}`
      overflow.setAttribute('title', this.tags.slice(shown.length).join(this.t('treeSelect.join')))
      tagsEl.appendChild(overflow)
    }

    // suffix 插槽：克隆到标签容器末位
    const suffixTemplate = this.querySelector<HTMLTemplateElement>('template[slot="suffix"]')
    if (suffixTemplate instanceof HTMLTemplateElement) {
      const holder = document.createElement('span')
      holder.className = 'slot-suffix'
      holder.appendChild(suffixTemplate.content.cloneNode(true))
      tagsEl.appendChild(holder)
    }
  }

  /** 单个标签构建：编辑态渲染原位输入框；自定义模板克隆 + data-tag-label 绑定；移除按钮保留组件侧 */
  private buildTag(label: string, idx: number): HTMLElement {
    const item = document.createElement('span')
    item.className = 'tag'
    item.setAttribute('part', 'tag')
    item.setAttribute('role', 'listitem')

    if (this.editingIndex === idx) {
      const edit = document.createElement('input')
      edit.className = 'tag-edit'
      edit.setAttribute('part', 'tag-edit')
      edit.setAttribute('aria-label', this.t('dynamicTags.inputLabel'))
      edit.value = label
      edit.addEventListener('keydown', (e: KeyboardEvent) => this.onEditKeydown(e, idx))
      edit.addEventListener('blur', () => {
        if (this.editingIndex === idx) {
          if (this.saveOnBlur()) this.commitEdit(idx, true)
          else this.cancelEdit()
        }
      })
      item.appendChild(edit)
      return item
    }

    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="tag"]')
    if (tpl instanceof HTMLTemplateElement) {
      const holder = document.createElement('span')
      holder.className = 'tag-custom'
      holder.appendChild(tpl.content.cloneNode(true))
      const binder = holder.querySelector('[data-tag-label]')
      if (binder) binder.textContent = label
      item.appendChild(holder)
    } else {
      const text = document.createElement('span')
      text.className = 'tag-label'
      text.textContent = label
      item.appendChild(text)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tag-remove'
    btn.setAttribute('part', 'tag-remove')
    btn.setAttribute('aria-label', this.t('dynamicTags.remove', { label }))
    btn.innerHTML = CLOSE_ICON
    item.appendChild(btn)

    return item
  }

  private syncInputState(): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    const overMax = this.tags.length >= this.maxValue()
    inputEl.disabled = disabled || overMax
    inputEl.hidden = readonly
    inputEl.placeholder = this.getAttr('placeholder', '')
    inputEl.setAttribute('aria-label', this.t('dynamicTags.inputLabel'))
    const ml = this.getAttr('maxlength', '')
    if (ml !== '') inputEl.maxLength = Number(ml)
    else inputEl.removeAttribute('maxlength')

    // 宿主态镜像：size（就近读取注入，与全局密度联动）/ status / readonly
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') inputEl.setAttribute('aria-invalid', 'true')
    else if (!this.hintVisible()) inputEl.removeAttribute('aria-invalid')
    if (readonly) this.setAttribute('aria-readonly', 'true')
    else this.removeAttribute('aria-readonly')

    const frozen = disabled || readonly
    const sortable = this.hasAttr('sortable')
    const interactive = sortable && !frozen
    const chips = [...(this.tagsEl?.querySelectorAll<HTMLElement>('.tag') ?? [])]
    for (const chip of chips) {
      const btn = chip.querySelector<HTMLButtonElement>('.tag-remove')
      if (btn) {
        btn.disabled = disabled
        btn.hidden = readonly
      }
      if (interactive) {
        chip.setAttribute('tabindex', '-1')
        chip.draggable = true
      } else {
        chip.removeAttribute('tabindex')
        chip.draggable = false
      }
    }

    if (this.clearEl) {
      this.clearEl.innerHTML = CLEAR_ICON
      this.clearEl.setAttribute('aria-label', this.t('input.clear'))
      this.clearEl.hidden = !(this.hasAttr('clearable') && this.tags.length > 0 && !frozen)
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    // IME 组合态防护：中文输入法 Enter/分隔符选词确认不触发提交（isComposing / keyCode 229）
    if (isComposing(e)) return
    const sep = this.separator()
    if (e.key === 'Enter' || (sep !== '' && e.key === sep)) {
      e.preventDefault()
      this.addTag(inputEl.value)
    } else if (e.key === 'Backspace' && inputEl.value === '') {
      e.preventDefault()
      this.removeLastTag()
    } else if (
      this.hasAttr('sortable') &&
      inputEl.value === '' &&
      (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
    ) {
      // 空输入时方向键进入标签导航（← 末尾 / → 首个）
      const chips = [...(this.tagsEl?.querySelectorAll<HTMLElement>('.tag') ?? [])]
      const target = e.key === 'ArrowLeft' ? chips[chips.length - 1] : chips[0]
      if (target) {
        e.preventDefault()
        target.focus()
      }
    }
  }

  /** 输入框失焦：派发 oas-blur；save-on-blur（默认 true）把残留文本提交为标签，false 丢弃 */
  private onInputBlur(): void {
    this.emit('blur')
    const inputEl = this.inputEl
    if (!inputEl) return
    if (this.saveOnBlur() && inputEl.value.trim() !== '') {
      this.addTag(inputEl.value)
    }
  }

  /** 粘贴拆分：文本含分隔符时批量建标签（逐项查重/上限/格式校验），否则保持原生插入 */
  private onPaste(e: ClipboardEvent): void {
    if (!this.addOnPaste()) return
    const sep = this.separator()
    if (sep === '') return
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text.includes(sep)) return
    e.preventDefault()
    const pieces = text
      .split(sep)
      .map((s) => s.trim())
      .filter((s) => s !== '')
    let added = false
    for (const piece of pieces) {
      if (this.tryAdd(piece, true)) {
        this.emit('add', { value: piece })
        added = true
      }
    }
    if (added) {
      this.writeBack()
      this.tagsKey = ''
      this.syncTags()
      this.syncInputState()
      this.emitChange('add')
    }
  }

  /** 校验并追加（不触发同步/事件，供单条与批量共用）：上限 > 格式 > 查重 > before-add 否决 */
  private tryAdd(value: string, silent: boolean): boolean {
    if (value === '') return false
    if (this.tags.length >= this.maxValue()) return false
    if (!this.patternOk(value)) {
      if (!silent) this.showHint(this.t('dynamicTags.patternMismatch'))
      return false
    }
    if (!this.hasAttr('allow-duplicate') && this.tags.includes(value)) {
      if (!silent) this.showHint(this.t('dynamicTags.duplicate'))
      return false
    }
    if (!this.emit('before-add', { value }, { cancelable: true })) return false
    this.tags.push(value)
    return true
  }

  private patternOk(value: string): boolean {
    const raw = this.getAttr('pattern', '')
    if (raw === '') return true
    try {
      return new RegExp(raw).test(value)
    } catch {
      /* 非法正则忽略（视作无约束） */
      return true
    }
  }

  private addTag(raw: string): void {
    const inputEl = this.inputEl
    if (!inputEl) return
    const value = raw.trim()
    if (!this.tryAdd(value, false)) return
    this.writeBack()
    this.tagsKey = ''
    this.syncTags()
    inputEl.value = ''
    this.syncInputState()
    this.emit('add', { value })
    this.emitChange('add')
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
    const idx = item ? [...this.tagsEl!.querySelectorAll('.tag')].indexOf(item) : -1
    if (idx >= 0) this.removeTag(idx)
  }

  private removeTag(idx: number): void {
    if (idx < 0 || idx >= this.tags.length) return
    if (this.isFrozen()) return
    const removed = this.tags[idx]!
    this.tags.splice(idx, 1)
    if (this.editingIndex === idx) this.editingIndex = null
    this.writeBack()
    this.tagsKey = ''
    this.syncTags()
    this.syncInputState()
    this.emit('remove', { value: removed })
    this.emitChange('remove')
  }

  /** 一键清空：派发 oas-clear 与 change(trigger=clear) */
  private clearAll(): void {
    if (this.isFrozen()) return
    if (this.tags.length === 0) return
    this.tags = []
    this.editingIndex = null
    this.writeBack()
    this.tagsKey = ''
    this.syncTags()
    this.syncInputState()
    this.emit('clear', {})
    this.emitChange('clear')
  }

  // ---------- 排序（键盘 Alt+←/→ + HTML5 拖拽） ----------

  /** 标签键盘事件：Enter 进编辑、←/→ 遍历、Alt+←/→ 重排（对齐标签键盘协议） */
  private onTagsKeydown(e: KeyboardEvent): void {
    if (isComposing(e)) return
    const path = e.composedPath() as Element[]
    // 焦点在移除按钮或编辑输入框上时走各自的原生语义
    if (
      path.some(
        (n) =>
          n instanceof Element &&
          (n.classList.contains('tag-remove') || n.classList.contains('tag-edit')),
      )
    ) {
      return
    }
    const chip = path.find((n) => n instanceof Element && n.classList.contains('tag'))
    if (!chip) return
    const chips = [...(this.tagsEl?.querySelectorAll<HTMLElement>('.tag') ?? [])]
    const idx = chips.indexOf(chip as HTMLElement)
    if (idx < 0) return
    const frozen = this.isFrozen()
    const sortable = this.hasAttr('sortable') && !frozen

    if (e.key === 'Enter') {
      e.preventDefault()
      this.startEdit(idx)
      return
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const delta = e.key === 'ArrowLeft' ? -1 : 1
    if (e.altKey && sortable) {
      const to = idx + delta
      if (to < 0 || to >= this.tags.length) return
      this.sortTag(idx, to)
      // 重建后重查目标 chip（旧引用已脱离 DOM，focus 无效）
      const fresh = [...(this.tagsEl?.querySelectorAll<HTMLElement>('.tag') ?? [])]
      fresh[to]?.focus()
      return
    }
    const to = idx + delta
    if (to < 0 || to >= chips.length) this.inputEl?.focus()
    else chips[to]?.focus()
  }

  /** 重排：移动下标并派发 change(trigger=sort) */
  private sortTag(from: number, to: number): void {
    if (from === to) return
    if (from < 0 || from >= this.tags.length || to < 0 || to >= this.tags.length) return
    const [moved] = this.tags.splice(from, 1)
    this.tags.splice(to, 0, moved!)
    this.editingIndex = null
    this.writeBack()
    this.tagsKey = ''
    this.syncTags()
    this.syncInputState()
    this.emitChange('sort')
  }

  private handleDragStart(e: Event): void {
    if (!this.hasAttr('sortable') || this.isFrozen()) return
    const path = e.composedPath() as Element[]
    const chip = path.find((n) => n instanceof Element && n.classList.contains('tag'))
    if (!chip) return
    const chips = [...(this.tagsEl?.querySelectorAll<HTMLElement>('.tag') ?? [])]
    const idx = chips.indexOf(chip as HTMLElement)
    if (idx < 0) return
    this.dragIndex = idx
    chip.classList.add('dragging')
    const dt = (e as DragEvent).dataTransfer
    if (dt) {
      try {
        dt.setData('text/plain', this.tags[idx] ?? '')
        dt.effectAllowed = 'move'
      } catch {
        /* 某些环境不允许在 synthetic 事件外setData，忽略 */
      }
    }
  }

  private handleDragOver(e: Event): void {
    if (this.dragIndex == null) return
    e.preventDefault()
  }

  private handleDrop(e: Event): void {
    if (this.dragIndex == null) return
    e.preventDefault()
    const path = e.composedPath() as Element[]
    const chip = path.find((n) => n instanceof Element && n.classList.contains('tag'))
    const chips = [...(this.tagsEl?.querySelectorAll<HTMLElement>('.tag') ?? [])]
    const to = chip ? chips.indexOf(chip as HTMLElement) : -1
    const from = this.dragIndex
    this.clearDragState()
    if (to < 0 || from === to) return
    this.sortTag(from, to)
  }

  private clearDragState(): void {
    this.dragIndex = null
    this.tagsEl?.querySelectorAll('.tag.dragging').forEach((el) => el.classList.remove('dragging'))
  }

  // ---------- 编辑现有标签（双击 / 聚焦后 Enter） ----------

  private handleDblClick(e: MouseEvent): void {
    const path = e.composedPath() as Element[]
    if (path.some((n) => n instanceof Element && n.classList.contains('tag-remove'))) return
    const chip = path.find((n) => n instanceof Element && n.classList.contains('tag'))
    if (!chip) return
    const chips = [...(this.tagsEl?.querySelectorAll<HTMLElement>('.tag') ?? [])]
    const idx = chips.indexOf(chip as HTMLElement)
    if (idx >= 0) this.startEdit(idx)
  }

  private startEdit(idx: number): void {
    if (this.isFrozen()) return
    if (idx < 0 || idx >= this.tags.length) return
    this.editingIndex = idx
    this.tagsKey = ''
    this.syncTags()
    this.syncInputState()
    const edit = this.tagsEl?.querySelector<HTMLInputElement>('.tag-edit')
    edit?.focus()
    edit?.select()
  }

  private onEditKeydown(e: KeyboardEvent, idx: number): void {
    if (isComposing(e)) return
    if (e.key === 'Enter') {
      e.preventDefault()
      this.commitEdit(idx, false)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.cancelEdit()
    }
  }

  /**
   * 提交编辑：空值还原旧值退出；重复/格式不符时——失焦路径还原退出、Enter 路径提示并保持编辑。
   * 成功时派发 oas-edit 与 oas-change(trigger=edit)。
   */
  private commitEdit(idx: number, fromBlur: boolean): void {
    if (this.editingIndex !== idx) return
    const edit = this.tagsEl?.querySelector<HTMLInputElement>('.tag-edit')
    const oldValue = this.tags[idx] ?? ''
    const value = (edit?.value ?? '').trim()
    const fail = (reason: string): void => {
      if (fromBlur) this.cancelEdit()
      else this.showHint(reason, edit)
    }
    if (value === '' || value === oldValue) {
      this.cancelEdit()
      return
    }
    if (!this.patternOk(value)) {
      fail(this.t('dynamicTags.patternMismatch'))
      return
    }
    if (!this.hasAttr('allow-duplicate') && this.tags.includes(value)) {
      fail(this.t('dynamicTags.duplicate'))
      return
    }
    this.tags[idx] = value
    this.editingIndex = null
    this.writeBack()
    this.tagsKey = ''
    this.syncTags()
    this.syncInputState()
    this.emit('edit', { index: idx, value, oldValue })
    this.emitChange('edit')
    this.inputEl?.focus()
  }

  private cancelEdit(): void {
    this.editingIndex = null
    this.tagsKey = ''
    this.syncTags()
    this.syncInputState()
  }

  // ---------- 值通道与提示 ----------

  private writeBack(): void {
    this.lastWrittenAttr = JSON.stringify(this.tags)
    this.setAttribute('model-value', this.lastWrittenAttr)
  }

  private emitChange(trigger: string): void {
    this.emit('change', { value: this.tags.slice(), trigger })
  }

  private hintVisible(): boolean {
    return this.hintEl != null && !this.hintEl.hidden
  }

  /** 展示校验提示：hint 文案 + aria-invalid（默认主输入框，编辑态可指定编辑输入框） */
  private showHint(message: string, target?: HTMLInputElement | null): void {
    const hintEl = this.hintEl
    if (hintEl) {
      hintEl.textContent = message
      hintEl.hidden = false
    }
    ;(target ?? this.inputEl)?.setAttribute('aria-invalid', 'true')
    if (this.hintTimer != null) window.clearTimeout(this.hintTimer)
    this.hintTimer = window.setTimeout(() => this.hideHint(), 2000)
  }

  private hideHint(): void {
    if (this.hintTimer != null) {
      window.clearTimeout(this.hintTimer)
      this.hintTimer = null
    }
    if (this.hintEl) this.hintEl.hidden = true
    this.inputEl?.removeAttribute('aria-invalid')
  }
}
