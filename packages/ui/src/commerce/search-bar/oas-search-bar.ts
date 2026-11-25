import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { closePath } from '@oas-ui/icons/icons/close'
import { searchPath } from '@oas-ui/icons/icons/search'

/**
 * oas-search-bar —— 搜索栏（commerce 族）。
 *
 * 移动端搜索惯例封装：胶囊输入框（内置放大镜占位图标）+ 清除钮 + 搜索钮 + 取消钮
 * （`hide-cancel` 隐藏）+ 下方惯例面板——聚焦展开，空值时显示历史词 / 热门词插槽
 * 容器、有值时切换到联想位插槽容器（与主流电商 App 搜索页一致的分组切换）。
 *
 * 与 oas-input 的边界：oas-input 是通用文本输入（前后缀 / 加删格式 / 表单校验 /
 * clearable），search-bar 不重复这些能力，只做「搜索页惯例」——Enter / 搜索钮触发
 * `oas-search`、取消钮退出搜索态、历史词 / 热门词 / 联想位的槽位与显隐分组、持久化
 * 归宿主（组件不存历史，宿主自行写入 localStorage 并渲染进插槽）。需要完整输入能力
 * 的搜索场景用 oas-input 组装（`prefix-icon="search"` + `enterkeyhint="search"`），
 * search-bar 管的是触发语义与槽位惯例，不是输入控件本体。
 *
 * 属性（kebab-case）：
 * - `value`：当前输入值。property 双通道：`value`（get+set 访问器，写反射 attribute）。
 *   输入过程实时回写 attribute 并派 `oas-input`（宿主可做联想渲染），不派 `oas-search`。
 * - `placeholder`：占位文案，缺省 i18n `searchBar.placeholder`（「搜索商品」）。
 * - `disabled`：输入与全部按钮禁用（config-provider 注入 `disabled` 同样生效）。
 * - `hide-cancel`：隐藏取消钮（嵌入工具条等已有退出途径的场合）。
 *
 * 事件（bubbles + composed）：
 * - `oas-input`：输入实时，`detail: { value }`；清除钮同样派发（只听 oas-input 的宿主
 *   不漏清除）。
 * - `oas-search`：Enter 或搜索钮，`detail: { value }`；空值不派发（无意义空搜索）。
 * - `oas-cancel`：取消钮，`detail: { value }` 携带清空前值（宿主可按需恢复），组件
 *   随即清空 value 并收起面板。
 *
 * 插槽（惯例面板三个分组容器，显隐由组件按值驱动）：
 * - `history`：历史词（空值 + 聚焦时显示）。持久化归宿主：宿主渲染 chips 并自行记录。
 * - `hot`：热门词（空值 + 聚焦时显示，与 history 同容器组并列）。
 * - `suggestions`：联想位（有值 + 聚焦时显示；宿主监听 `oas-input` 动态渲染）。
 * - 三个插槽全空时面板永不展开。
 *
 * a11y：输入框 `type="search"`（隐式 searchbox 语义）+ `aria-label`（i18n
 * `searchBar.label`，不依赖 placeholder）+ `enterkeyhint="search"`（移动虚拟键盘
 * 显示「搜索」）；搜索钮 / 清除钮图标无可见文字，`aria-label` 分别取 i18n
 * `searchBar.search` / `searchBar.clear`；取消钮可见文本「取消」天然可读；Esc 收起
 * 面板；面板容器 `pointerdown` preventDefault——插槽内容（历史词按钮等）点击不先
 * 失焦（宿主插槽内若放输入类元素需自行管理焦点）。颜色全走 token，布局走逻辑属性
 * （RTL 安全）。
 */
export interface SearchDetail {
  value: string
}
export interface CancelDetail {
  value: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  min-width: 0;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-width: 0;
}
.field {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
  box-sizing: border-box;
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg-hover);
  height: var(--oas-control-height-md, 32px);
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.field:focus-within {
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg);
}
:host([disabled]) .field {
  opacity: 0.6;
  cursor: not-allowed;
}
.lead-icon {
  display: inline-flex;
  flex: none;
  color: var(--oas-color-text-secondary);
}
.lead-icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.input {
  flex: 1 1 auto;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--oas-font-size-sm);
  outline: none;
}
.input::placeholder {
  color: var(--oas-color-text-tertiary, var(--oas-color-text-secondary));
}
.input::-webkit-search-cancel-button {
  display: none;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  box-sizing: border-box;
  min-height: var(--oas-control-height-md, 32px);
  padding: 0 var(--oas-space-2);
  border: 0;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-secondary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  transition: color var(--oas-transition-fast) var(--oas-ease-out), background var(--oas-transition-fast) var(--oas-ease-out);
}
.btn:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.btn svg {
  display: block;
  width: 1.05em;
  height: 1.05em;
}
.clear[hidden] {
  display: none;
}
.go {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.go:hover {
  background: var(--oas-color-primary-hover, var(--oas-color-primary));
  color: var(--oas-color-text-on-primary);
}
.cancel {
  padding-inline: var(--oas-space-1);
}
.cancel[hidden] {
  display: none;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  box-sizing: border-box;
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.panel[hidden] {
  display: none;
}
.slot-group {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  min-width: 0;
}
.slot-group[hidden] {
  display: none;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (forced-colors: active) {
  .field:focus-within {
    outline: 1px solid CanvasText;
  }
  .btn:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
}
`

export class OASSearchBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'disabled', 'hide-cancel']
  }

  private inputEl: HTMLInputElement | null = null
  private clearEl: HTMLButtonElement | null = null
  private goEl: HTMLButtonElement | null = null
  private cancelEl: HTMLButtonElement | null = null
  private panelEl: HTMLElement | null = null
  private groupEls: Record<string, HTMLElement | null> = {}
  private leadEl: HTMLElement | null = null
  /** 面板展开态（聚焦驱动；Esc / 取消收起后重新聚焦才再展开） */
  private panelOpen = false

  // -------------------------------------------------------------------------
  // property 通道
  // -------------------------------------------------------------------------

  /**
   * @apiProperty 当前输入值：get+set 双通道（写反射 attribute），赋值即生效不派发事件
   */
  get value(): string {
    return this.getAttr('value')
  }

  set value(v: string | number) {
    this.setAttribute('value', String(v ?? ''))
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <section class="wrap" part="wrap">
        <div class="bar" part="bar">
          <div class="field" part="field">
            <span class="lead-icon" part="lead-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" focusable="false">${searchPath}</svg>
            </span>
            <input class="input" part="input" type="search" enterkeyhint="search" autocomplete="off" aria-label="" />
            <button class="btn clear" part="clear" type="button" tabindex="-1" aria-label="" hidden>
              <svg viewBox="0 0 16 16" fill="none" focusable="false" aria-hidden="true">${closePath}</svg>
            </button>
          </div>
          <button class="btn go" part="go" type="button" aria-label="">
            <svg viewBox="0 0 16 16" fill="none" focusable="false" aria-hidden="true">${searchPath}</svg>
          </button>
          <button class="btn cancel" part="cancel" type="button" hidden></button>
        </div>
        <div class="panel" part="panel" hidden>
          <div class="slot-group" data-slot-group="suggestions" part="suggestions" hidden>
            <slot name="suggestions"></slot>
          </div>
          <div class="slot-group" data-slot-group="history" part="history" hidden>
            <slot name="history"></slot>
          </div>
          <div class="slot-group" data-slot-group="hot" part="hot" hidden>
            <slot name="hot"></slot>
          </div>
        </div>
      </section>
    `
  }

  private bind(): void {
    this.inputEl = this.shadow.querySelector<HTMLInputElement>('[part="input"]')
    this.clearEl = this.shadow.querySelector<HTMLButtonElement>('[part="clear"]')
    this.goEl = this.shadow.querySelector<HTMLButtonElement>('[part="go"]')
    this.cancelEl = this.shadow.querySelector<HTMLButtonElement>('[part="cancel"]')
    this.panelEl = this.shadow.querySelector<HTMLElement>('[part="panel"]')
    this.leadEl = this.shadow.querySelector<HTMLElement>('[part="lead-icon"]')
    this.groupEls = {}
    for (const el of this.shadow.querySelectorAll<HTMLElement>('[data-slot-group]')) {
      this.groupEls[el.getAttribute('data-slot-group') ?? ''] = el
    }

    this.inputEl?.addEventListener('input', this.onInput)
    this.inputEl?.addEventListener('keydown', this.onKeydown)
    this.inputEl?.addEventListener('focus', this.onFocus)
    this.inputEl?.addEventListener('blur', this.onBlur)
    this.clearEl?.addEventListener('click', this.onClear)
    this.goEl?.addEventListener('click', this.onGo)
    this.cancelEl?.addEventListener('click', this.onCancel)
    // 插槽内容点击不先失焦（历史词可点中）：面板 pointerdown 阻止默认（不阻止 click）
    this.panelEl?.addEventListener('pointerdown', (e) => e.preventDefault())
    // 插槽内容增删 → 分组可见性重算（宿主动态渲染联想/历史词）
    for (const slot of this.shadow.querySelectorAll<HTMLSlotElement>('slot[name]')) {
      slot.addEventListener('slotchange', this.onSlotChange)
    }
  }

  private readonly onSlotChange = (): void => {
    this.update()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  // -------------------------------------------------------------------------
  // 渲染同步
  // -------------------------------------------------------------------------

  protected override update(): void {
    if (!this.inputEl) return
    const disabled = this.injectDisabled()
    const value = this.getAttr('value')
    this.inputEl.disabled = disabled
    this.inputEl.setAttribute('aria-label', this.t('searchBar.label'))
    this.inputEl.setAttribute('placeholder', this.getAttr('placeholder', this.t('searchBar.placeholder')))
    if (this.inputEl.value !== value) this.inputEl.value = value
    if (this.leadEl) this.leadEl.hidden = value !== ''
    // 清除钮：有值且未禁用时显示（tabindex=-1 不进 Tab 序，Enter 直达搜索）
    if (this.clearEl) {
      this.clearEl.hidden = value === '' || disabled
      this.clearEl.disabled = disabled
      this.clearEl.setAttribute('aria-label', this.t('searchBar.clear'))
    }
    if (this.goEl) {
      this.goEl.disabled = disabled
      this.goEl.setAttribute('aria-label', this.t('searchBar.search'))
    }
    if (this.cancelEl) {
      this.cancelEl.hidden = this.hasAttr('hide-cancel')
      this.cancelEl.disabled = disabled
      this.cancelEl.textContent = this.t('searchBar.cancel')
    }
    this.syncPanel()
  }

  /** 面板三组显隐：面板开且插槽有内容才可见；组内按「空值=历史/热门，有值=联想」切换 */
  private syncPanel(): void {
    const panel = this.panelEl
    if (!panel) return
    const hasAnySlot =
      this.groupHasContent('suggestions') || this.groupHasContent('history') || this.groupHasContent('hot')
    const open = this.panelOpen && hasAnySlot && !this.injectDisabled()
    panel.hidden = !open
    const hasValue = this.getAttr('value').trim() !== ''
    this.setGroup('suggestions', open, hasValue)
    this.setGroup('history', open, !hasValue)
    this.setGroup('hot', open, !hasValue)
  }

  private setGroup(name: string, panelOpen: boolean, visible: boolean): void {
    const el = this.groupEls[name]
    if (!el) return
    const hasContent = this.groupHasContent(name)
    el.hidden = !panelOpen || !visible || !hasContent
  }

  private groupHasContent(name: string): boolean {
    const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
    if (!slot) return false
    return slot
      .assignedNodes({ flatten: true })
      .some((n) => (n.textContent ?? '').trim() !== '' || n.nodeType === Node.ELEMENT_NODE)
  }

  // -------------------------------------------------------------------------
  // 交互
  // -------------------------------------------------------------------------

  private readonly onInput = (): void => {
    const raw = this.inputEl?.value ?? ''
    this.setAttribute('value', raw)
    this.emit('input', { value: raw } satisfies SearchDetail)
  }

  private readonly onKeydown = (e: Event): void => {
    const key = (e as KeyboardEvent).key
    if (key === 'Enter') {
      e.preventDefault()
      this.fireSearch()
      return
    }
    if (key === 'Escape') {
      // Esc 收起面板（不派搜索）；重新聚焦才再展开
      this.panelOpen = false
      this.syncPanel()
    }
  }

  private readonly onFocus = (): void => {
    this.panelOpen = true
    this.syncPanel()
  }

  private readonly onBlur = (): void => {
    // 失焦收起（重新聚焦再展开）
    this.panelOpen = false
    this.syncPanel()
  }

  private readonly onClear = (): void => {
    if (this.injectDisabled()) return
    this.setAttribute('value', '')
    if (this.inputEl) {
      this.inputEl.value = ''
      this.inputEl.focus()
    }
    this.emit('input', { value: '' } satisfies SearchDetail)
  }

  private readonly onGo = (): void => {
    this.fireSearch()
  }

  /** 搜索触发：空值不派发；面板收起（搜索即退出挑选态） */
  private fireSearch(): void {
    if (this.injectDisabled()) return
    const value = this.getAttr('value').trim()
    if (value === '') {
      if (!this.hasAttr('value')) {
        devWarn('[oas-search-bar] 空搜索不派发 oas-search（value 为空）')
      }
      return
    }
    this.panelOpen = false
    this.syncPanel()
    this.emit('search', { value } satisfies SearchDetail)
  }

  private readonly onCancel = (): void => {
    if (this.injectDisabled()) return
    const before = this.getAttr('value')
    this.setAttribute('value', '')
    if (this.inputEl) {
      this.inputEl.value = ''
      this.inputEl.blur()
    }
    this.panelOpen = false
    this.syncPanel()
    this.emit('cancel', { value: before } satisfies CancelDetail)
  }
}
