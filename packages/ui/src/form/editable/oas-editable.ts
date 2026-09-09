import { OASElement } from '@oas-ui/core'

/** size 尺寸档（对齐 oas-input：small/medium/large，控高走 --oas-control-height-* token） */
const VALID_SIZES = ['small', 'medium', 'large'] as const
/** status 校验态：success / warning / error */
const VALID_STATUSES = ['error', 'warning', 'success'] as const
/** 触发方式：text 点文本进编辑 / icon 尾部铅笔按钮进编辑（防误触）/ dblclick 双击进编辑（单击选中文本不误触，Enter/Space 聚焦时进编辑为键盘逃生） */
const VALID_TRIGGERS = ['text', 'icon', 'dblclick'] as const

/** 判定编辑字段是否多行（tagName 判定——SSR DOM 环境无 HTMLTextAreaElement 全局，instanceof 会 ReferenceError） */
function isTextarea(el: HTMLInputElement | HTMLTextAreaElement): el is HTMLTextAreaElement {
  return el.tagName === 'TEXTAREA'
}

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认（非法值不告警，保持输出干净） */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
}

/** 输入法组合态判定：isComposing 或旧浏览器 keyCode 229 均视为组合中（选词 Enter 不触发提交） */
function isComposing(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

const STYLE = `
 :host {
  display: inline-block;
  font-family: inherit;
  /* 尺寸档内部控高/字号变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
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
.display {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 60px;
  min-height: var(--_ch);
  box-sizing: border-box;
  padding: 2px var(--oas-space-1);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  font-size: var(--_fs);
}
.display:hover {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-border);
}
.display:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.display.placeholder {
  color: var(--oas-color-text-secondary);
}
/* 自定义展示模板（template[slot="display"]）渲染容器 */
.display-custom {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
}
/* icon 触发：文本区纯展示（不可点），铅笔按钮承载交互 */
:host([data-trigger='icon']) .display {
  cursor: default;
}
:host([data-trigger='icon']) .display:hover {
  background: transparent;
  border-color: transparent;
}
:host([disabled]) .display {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
:host([disabled]) .display:hover {
  background: transparent;
  border-color: transparent;
}
/* readonly：可读不可编辑，光标默认、无 hover 反馈（与 disabled 的降饱和分立） */
:host([readonly]) .display {
  cursor: default;
}
:host([readonly]) .display:hover {
  background: transparent;
  border-color: transparent;
}
.trigger-icon {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary);
  border-radius: var(--oas-radius-sm);
  flex: none;
}
.trigger-icon:hover:not(:disabled) {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.trigger-icon:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.trigger-icon:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger-icon[hidden] {
  display: none;
}
.edit {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--oas-space-1);
}
.edit[hidden] {
  display: none;
}
:is(input, textarea) {
  appearance: none;
  box-sizing: border-box;
  height: var(--_ch);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--_fs);
  font-family: inherit;
  min-width: 140px;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
textarea {
  height: auto;
  min-height: var(--_ch);
  padding-block: calc((var(--_ch) - var(--oas-font-size-md) * 1.4) / 2);
  resize: none;
  overflow: hidden;
  line-height: 1.4;
  display: block;
}
:is(input, textarea):focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:is(input, textarea):disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
/* ---- status 校验态：编辑框边框着色 + 展示态文本辅助色 ---- */
:host([data-status='success']) :is(input, textarea) {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) :is(input, textarea):focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='success']) .display {
  color: var(--oas-color-success-text);
}
:host([data-status='warning']) :is(input, textarea) {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) :is(input, textarea):focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='warning']) .display {
  color: var(--oas-color-warning-text);
}
:host([data-status='error']) :is(input, textarea) {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) :is(input, textarea):focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([data-status='error']) .display {
  color: var(--oas-color-danger-text);
}
.action {
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
  flex: none;
}
.action:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.action:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.action:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.action.ok:hover:not(:disabled) {
  color: var(--oas-color-primary);
}
.action.cancel:hover:not(:disabled) {
  color: var(--oas-color-danger);
}
`

const OK_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const CANCEL_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`

const PENCIL_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3.5 12.5 L4 10.3 L10.6 3.7 L12.3 5.4 L5.7 12 Z M11.3 3 L13 4.7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`

export class OASEditable extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'disabled',
      'submit-on-enter',
      'maxlength',
      'submit-on-blur',
      'editing',
      'default-editing',
      'readonly',
      'status',
      'size',
      'multiline',
      'trigger',
      'allow-empty',
    ]
  }

  private displayEl: HTMLElement | null = null
  private editEl: HTMLElement | null = null
  private fieldEl: HTMLInputElement | HTMLTextAreaElement | null = null
  private pencilEl: HTMLButtonElement | null = null
  private editing = false
  /** default-editing 仅首次消费（退出后不因属性在场而重复进入） */
  private defaultEditingApplied = false
  /** light DOM 观察器：template[slot="display"/"ok-icon"/"cancel-icon"] 增删 → 重刷展示态 */
  private childObserver: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致（快照为展示态） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="display" part="display" role="button" tabindex="0">
        <button class="trigger-icon" part="trigger-icon" type="button" hidden></button>
      </span>
      <span class="edit" part="edit" hidden>
        <input part="field" />
        <button class="action ok" part="ok" type="button"></button>
        <button class="action cancel" part="cancel" type="button"></button>
      </span>
    `
  }

  /** 缓存节点引用 + 绑定进入编辑/提交/取消事件（render 与水合路径共用；field 监听在 ensureField） */
  private bind(): void {
    this.displayEl = this.shadow.querySelector('.display')
    this.editEl = this.shadow.querySelector('.edit')
    this.pencilEl = this.shadow.querySelector('.trigger-icon')

    this.displayEl?.addEventListener('click', () => this.handleDisplayActivate('click'))
    this.displayEl?.addEventListener('dblclick', () => this.handleDisplayActivate('dblclick'))
    this.displayEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.handleDisplayActivate('key')
      }
    })
    this.pencilEl?.addEventListener('click', () => this.enterEdit())
    this.pencilEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.enterEdit()
      }
    })
    const okBtn = this.shadow.querySelector<HTMLButtonElement>('.ok')
    const cancelBtn = this.shadow.querySelector<HTMLButtonElement>('.cancel')
    okBtn?.addEventListener('click', () => this.submit())
    cancelBtn?.addEventListener('click', () => this.cancel())

    // 展示态/按钮图标模板增删 → 重刷（模板在 light DOM，内容渲染时克隆）
    if (!this.childObserver) {
      const observer = new MutationObserver(() => this.update())
      observer.observe(this, { childList: true, subtree: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（display 与编辑态容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.display')) return false
    if (!this.shadow.querySelector('.edit')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.displayEl || !this.editEl) return
    // 编辑字段先就位（default-editing / editing 受控的进入路径依赖 fieldEl）
    this.ensureField()
    // default-editing：挂载即编辑（仅首次）
    if (!this.defaultEditingApplied && this.hasAttr('default-editing')) {
      this.defaultEditingApplied = true
      this.enterEdit()
    }
    // editing 受控同步：宿主加属性进入；移除属性走取消路径退出（非破坏）
    const wantEditing = this.hasAttr('editing')
    if (wantEditing && !this.editing) this.enterEdit()
    else if (!wantEditing && this.editing) this.exitControlled()

    this.syncDisplay()
    this.syncMirror()
  }

  /** 编辑字段确保：multiline 切 textarea、单行切 input（替换时重挂监听） */
  private ensureField(): void {
    const editEl = this.editEl
    if (!editEl) return
    const wantTextarea = this.hasAttr('multiline')
    const current =
      this.fieldEl ??
      (editEl.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement | null)
    const isTextarea = current?.tagName === 'TEXTAREA'
    if (current && ((wantTextarea && isTextarea) || (!wantTextarea && !isTextarea))) {
      if (this.fieldEl === current) return
      // 采纳模板/快照里的 input，挂监听（一次性）
      this.bindField(current)
      return
    }
    current?.remove()
    const field = wantTextarea
      ? document.createElement('textarea')
      : document.createElement('input')
    this.bindField(field)
    editEl.insertBefore(field, editEl.firstChild)
  }

  private bindField(field: HTMLInputElement | HTMLTextAreaElement): void {
    field.setAttribute('part', 'field')
    field.addEventListener('keydown', (e) => this.onFieldKeydown(e as KeyboardEvent))
    field.addEventListener('blur', (e) => this.handleBlur(e as FocusEvent))
    if (isTextarea(field)) {
      field.rows = 1
      field.addEventListener('input', () => this.autoResize())
    }
    this.fieldEl = field
    if (this.editing) {
      field.value = this.getAttr('value', '')
      field.focus()
    }
  }

  /** 多行自适应高：最小 1 行随内容长高（对齐 autoResize 语义） */
  private autoResize(): void {
    const field = this.fieldEl
    if (!field || !isTextarea(field)) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }

  /** 展示态内容：template[slot=display] 克隆 + data-display-value/placeholder 绑定，缺省纯文本 */
  private syncDisplay(): void {
    const displayEl = this.displayEl
    if (!displayEl) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const pencil = this.pencilEl
    // 清旧内容（保留铅笔按钮）
    for (const child of [...displayEl.childNodes]) {
      if (child !== pencil) child.remove()
    }
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="display"]')
    if (tpl instanceof HTMLTemplateElement) {
      const holder = document.createElement('span')
      holder.className = 'display-custom'
      holder.appendChild(tpl.content.cloneNode(true))
      const bindValue = holder.querySelector('[data-display-value]')
      if (bindValue) bindValue.textContent = value
      const bindPlaceholder = holder.querySelector('[data-display-placeholder]')
      if (bindPlaceholder) bindPlaceholder.textContent = placeholder
      displayEl.insertBefore(holder, pencil)
      displayEl.classList.toggle('placeholder', false)
      return
    }
    displayEl.insertBefore(document.createTextNode(value !== '' ? value : placeholder), pencil)
    displayEl.classList.toggle('placeholder', value === '')
  }

  /** 宿主态镜像（size/status/readonly/trigger）+ field/按钮属性同步 */
  private syncMirror(): void {
    const displayEl = this.displayEl
    const fieldEl = this.fieldEl
    if (!displayEl || !fieldEl) return
    const disabled = this.hasAttr('disabled')
    const readonly = this.hasAttr('readonly')

    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    const trigger = normalizeChoice(this.getAttr('trigger', ''), 'text', VALID_TRIGGERS)
    this.setAttribute('data-trigger', trigger)

    if (trigger === 'icon') {
      displayEl.removeAttribute('role')
      displayEl.removeAttribute('tabindex')
    } else {
      displayEl.setAttribute('role', 'button')
      displayEl.tabIndex = disabled ? -1 : 0
    }
    displayEl.setAttribute('aria-label', this.t('editable.edit'))
    displayEl.setAttribute('aria-disabled', String(disabled))
    if (readonly) displayEl.setAttribute('aria-readonly', 'true')
    else displayEl.removeAttribute('aria-readonly')

    if (this.pencilEl) {
      this.pencilEl.innerHTML = PENCIL_ICON
      this.pencilEl.setAttribute('aria-label', this.t('editable.edit'))
      this.pencilEl.disabled = disabled || readonly
      this.pencilEl.hidden = trigger !== 'icon'
    }

    fieldEl.placeholder = this.getAttr('placeholder', '')
    ;(fieldEl as HTMLInputElement).disabled = disabled
    const ml = this.getAttr('maxlength', '')
    if (ml !== '') fieldEl.maxLength = Number(ml)
    else fieldEl.removeAttribute('maxlength')
    fieldEl.setAttribute('aria-label', this.t('editable.edit'))
    if (status === 'error') fieldEl.setAttribute('aria-invalid', 'true')
    else fieldEl.removeAttribute('aria-invalid')
    if (isTextarea(fieldEl) && this.editing) this.autoResize()

    const okBtn = this.shadow.querySelector<HTMLButtonElement>('.ok')
    const cancelBtn = this.shadow.querySelector<HTMLButtonElement>('.cancel')
    if (okBtn) {
      okBtn.disabled = disabled
      okBtn.setAttribute('aria-label', this.t('editable.submit'))
      this.fillActionIcon(okBtn, 'ok-icon', OK_ICON)
    }
    if (cancelBtn) {
      cancelBtn.disabled = disabled
      cancelBtn.setAttribute('aria-label', this.t('editable.cancel'))
      this.fillActionIcon(cancelBtn, 'cancel-icon', CANCEL_ICON)
    }
  }

  /** 确认/取消按钮图标：template[slot] 克隆优先，缺省回落内置 SVG */
  private fillActionIcon(btn: HTMLButtonElement, slotName: string, fallback: string): void {
    const tpl = this.querySelector<HTMLTemplateElement>(`template[slot="${slotName}"]`)
    if (tpl instanceof HTMLTemplateElement) {
      btn.innerHTML = ''
      btn.appendChild(tpl.content.cloneNode(true))
    } else if (!btn.innerHTML) {
      btn.innerHTML = fallback
    }
  }

  private submitOnEnter(): boolean {
    return this.getAttr('submit-on-enter', 'true') !== 'false'
  }

  private submitOnBlur(): boolean {
    return this.getAttr('submit-on-blur', 'true') !== 'false'
  }

  /** 展示态激活：按 trigger 与事件类型分流——
      text：click / Enter / Space 进编辑
      icon：文本区纯展示（交互在铅笔按钮），此处不触发
      dblclick：dblclick 进编辑（click 不触发，防与选中文本冲突）；Enter / Space（聚焦时）进编辑为键盘逃生 */
  private handleDisplayActivate(evt: 'click' | 'dblclick' | 'key'): void {
    const trigger = normalizeChoice(this.getAttr('trigger', ''), 'text', VALID_TRIGGERS)
    if (trigger === 'icon') return
    const activatorMatch =
      (trigger === 'text' && (evt === 'click' || evt === 'key')) ||
      (trigger === 'dblclick' && (evt === 'dblclick' || evt === 'key'))
    if (!activatorMatch) return
    this.enterEdit()
  }

  private enterEdit(): void {
    if (this.hasAttr('disabled') || this.hasAttr('readonly')) return
    if (this.editing) return
    const fieldEl = this.fieldEl
    if (!fieldEl) return
    this.editing = true
    if (this.displayEl) this.displayEl.hidden = true
    if (this.editEl) this.editEl.hidden = false
    fieldEl.value = this.getAttr('value', '')
    this.setAttribute('editing', '')
    this.emit('editing', { editing: true })
    fieldEl.focus()
    fieldEl.select()
    if (isTextarea(fieldEl)) this.autoResize()
  }

  private exitEdit(): void {
    this.editing = false
    if (this.editEl) this.editEl.hidden = true
    if (this.displayEl) this.displayEl.hidden = false
    this.removeAttribute('editing')
    this.emit('editing', { editing: false })
  }

  /** 受控退出（宿主移除 editing 属性）：统一走取消路径（非破坏） */
  private exitControlled(): void {
    this.cancel()
  }

  private submit(): void {
    if (!this.editing) return
    const oldValue = this.getAttr('value', '')
    const next = this.fieldEl?.value ?? ''
    this.exitEdit()
    if (next === '' && !this.hasAttr('allow-empty')) {
      // 默认非破坏：空值提交还原旧值并派发 oas-cancel
      this.emit('cancel', { value: oldValue })
      this.focusTrigger()
      return
    }
    if (next !== oldValue) {
      this.setAttribute('value', next)
      this.emit('change', { value: next })
    }
    this.focusTrigger()
  }

  private cancel(): void {
    if (!this.editing) return
    this.exitEdit()
    this.emit('cancel', { value: this.getAttr('value', '') })
    this.focusTrigger()
  }

  /** 提交/取消后焦点归还触发元素（icon 模式还铅笔按钮，text 模式还展示区） */
  private focusTrigger(): void {
    const trigger = normalizeChoice(this.getAttr('trigger', ''), 'text', VALID_TRIGGERS)
    if (trigger === 'icon' && this.pencilEl) this.pencilEl.focus()
    else this.displayEl?.focus()
  }

  private onFieldKeydown(e: KeyboardEvent): void {
    // IME 组合态防护：选词确认的 Enter 不触发提交
    if (isComposing(e)) return
    if (this.hasAttr('multiline')) {
      // 多行：Enter 换行（不拦截）、Ctrl/⌘+Enter 提交、Esc 取消
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.submit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.cancel()
      }
      return
    }
    if (e.key === 'Enter') {
      if (this.submitOnEnter()) {
        e.preventDefault()
        this.submit()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.cancel()
    }
  }

  private handleBlur(e: FocusEvent): void {
    if (!this.editing) return
    const related = e.relatedTarget as Node | null
    // 焦点移到自身内部的确认/取消/铅笔按钮时交给按钮 click，避免双重提交
    if (related && this.shadow.contains(related)) return
    // submit-on-blur=false：blur 不提交也不退出（必须显式点确认/取消按钮）
    if (this.submitOnBlur()) this.submit()
  }
}
