import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { addOutsideDismiss, removeOutsideDismiss } from '../../shared/outside-dismiss.js'
import { stableHash36 } from '../../shared/stable-id.js'
import { parseJsonArray } from '../../shared/json-array.js'

/**
 * oas-filter —— 列表页筛选栏（commerce 族）。
 *
 * 电商列表页筛选闭环：排序项（常显）+ 条件面板（下拉贴底 / 半屏抽屉两形态）+
 * 已选条件回显 chips（逐项撤销）+ 一键重置。值契约 = `conditions` JSON 双通道
 * （受控宿主可接管；非受控下用户交互后组件回写 attribute，开箱即用）。
 *
 * 本体只承载大众功能集（architecture §3.1 族级包体分级）；「条件持久化 / 服务端筛选
 * 协议 / 分页联动」等重增强预留为能力子路径面（见 README「预留能力面」）。
 *
 * 属性（kebab-case）：
 * - `sorts`：JSON 数组排序项 `[{ key, label, toggled? }]`；`toggled` 项支持升 / 降 toggle
 *   （首次点击降序、再点升序）。缺省三件套：综合 / 销量 / 价格（价格 toggled）。
 *   property 双通道：`sorts`（数组或 JSON 字符串，写即反射 attribute）。
 * - `groups`：JSON 数组条件组 `[{ key, label, multiple?, options: [{ value, label, disabled? }] }]`。
 *   单选组（multiple 缺省 false）点已选项取消；多选组 toggle。property 双通道：`groups`。
 * - `conditions`：当前值 `{ sort?, order?, groups? }`（order 仅 toggled 排序项有意义：
 *   `asc` / `desc`；groups 为 `{ 组key: [值…] }`——单选组恒 ≤1 项）。
 *   用户交互后组件回写该 attribute 并派发 `oas-change`；宿主写入只同步视图不派发
 *   （受控与非受控同一属性通道）。property 双通道：`conditions`。
 * - `panel`：面板形态 `dropdown`（缺省，贴底下拉）/ `drawer`（半屏抽屉，窄屏建议）；
 *   非法值回落 dropdown 并告警一次。
 * - `open`：面板展开态（attribute 存在性布尔）。用户 / `setOpen()` 开合回写并派发
 *   `oas-open-change`；宿主直写只同步视图。property 双通道：`open`。
 *
 * 方法：
 * - `setOpen(open: boolean)`：编程式开合（等价用户交互：回写 `open` + 派发 `oas-open-change`
 *   + 焦点管理）。宿主受控场景可直接写 `open` attribute（静默）。
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：排序 / 条件 / 撤销 / 重置后派发，`detail: { sort, order, groups, summary }`；
 *   summary 为汇总摘要文本（含排序方向与「组名：选项」），供宿主 aria-live 播报。
 *   宿主写 `conditions` / `open` attribute 不派发。
 * - `oas-open-change`：用户 / `setOpen()` 开合面板后派发，`detail: { open }`。
 *
 * 插槽：无（面板内容全部由 `groups` 数据驱动渲染）。
 *
 * a11y：
 * - 排序行 `role="radiogroup"` + 项 `role="radio"` + `aria-checked`；toggled 项选中时
 *   `aria-label` 附方向文本（「价格，降序」），读屏可感知升降。
 * - 单选组容器 `role="radiogroup"`、多选组容器 `role="group"`（各带组名 `aria-label`）；
 *   选项 `role="radio"` / `role="checkbox"` + `aria-checked`，Tab 全可达，
 *   组内方向键移动焦点（不触发选择）。
 * - 触发器 `aria-haspopup` + `aria-expanded` + `aria-controls`；可访问名从可见内容推导
 *   （排序标签 + 计数徽标，不用 aria-label 包裹避免与可见文本不一致——WCAG 2.5.3）。
 * - 开面板聚焦首个可聚焦条件；Esc 关闭回触发器；dropdown 外点关闭 + 视口空间翻转
 *   （下方放不下贴顶展开）；drawer 面板为模态对话框（`role="dialog"` + `aria-modal="true"`，
 *   Tab / Shift+Tab 焦点循环限制在面板内），遮罩 / 「完成」按钮关闭。
 *   chips 为可聚焦按钮，`aria-label` = i18n「移除 {条件名}」，撤销后焦点迁相邻 chip。
 * - 汇总摘要渲染进 `role="status"` + `aria-live="polite"` 活区（视觉隐藏）。
 * 布局走逻辑属性（RTL 安全），颜色全走 token。
 */

export interface FilterSortOption {
  key: string
  label: string
  /** 支持升 / 降 toggle（如价格）：首次点击降序，再点升序 */
  toggled?: boolean
}

export interface FilterGroupOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FilterGroup {
  key: string
  label: string
  /** 多选组；缺省 false = 单选组 */
  multiple?: boolean
  options: FilterGroupOption[]
}

export interface FilterConditions {
  sort?: string
  order?: 'asc' | 'desc'
  groups?: Record<string, string[]>
}

export interface FilterChangeDetail {
  sort: string
  order: 'asc' | 'desc' | null
  groups: Record<string, string[]>
  summary: string
}

export interface FilterOpenDetail {
  open: boolean
}

export type FilterPanel = 'dropdown' | 'drawer'

const PANELS: readonly string[] = ['dropdown', 'drawer']

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  min-width: 0;
  position: relative;
}
.sorts {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
  overflow-x: auto;
}
.sort-item {
  display: inline-flex;
  align-items: center;
  flex: none;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
}
.sort-item:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.sort-item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.sort-item[aria-checked='true'] {
  color: var(--oas-color-primary-text);
  font-weight: 600;
}
.sort-item:disabled {
  cursor: default;
  color: var(--oas-color-text-secondary);
  opacity: 0.6;
}
.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: none;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
}
.trigger:hover {
  background: var(--oas-color-bg-hover);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger[hidden] {
  display: none;
}
.trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary-text);
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25em;
  padding-inline: var(--oas-space-1);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xs);
  font-variant-numeric: tabular-nums;
}
.badge[hidden] {
  display: none;
}
.caret {
  width: 1em;
  height: 1em;
  fill: currentColor;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger[aria-expanded='true'] .caret {
  transform: rotate(180deg);
}
.chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--oas-space-1) var(--oas-space-2);
  padding-block-start: var(--oas-space-2);
}
.chips[hidden] {
  display: none;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  cursor: pointer;
}
.chip:hover {
  background: var(--oas-color-bg-active, var(--oas-color-bg-hover));
  color: var(--oas-color-text-primary);
}
.chip:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.chip-x {
  width: 0.9em;
  height: 0.9em;
  fill: currentColor;
}
.reset {
  display: inline-flex;
  align-items: center;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  background: none;
  color: var(--oas-color-primary-text);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  cursor: pointer;
}
.reset:hover {
  text-decoration: underline;
}
.reset:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.panel {
  position: absolute;
  inset-inline: 0;
  top: 100%;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  max-height: 70vh;
  overflow-y: auto;
  margin-block-start: var(--oas-space-1);
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-shadow: var(--oas-shadow-sm);
}
/* 下方空间不足且上方更宽裕时贴顶展开（视口空间翻转） */
.panel[data-flip='up'] {
  top: auto;
  inset-block-end: 100%;
  margin-block-start: 0;
  margin-block-end: var(--oas-space-1);
}
.panel[hidden] {
  display: none;
}
.panel[data-form='drawer'] {
  position: fixed;
  inset-inline: 0;
  inset-block-end: 0;
  top: auto;
  z-index: 60;
  max-height: 70vh;
  overflow-y: auto;
  margin: 0;
  border-block-end: none;
  border-radius: var(--oas-radius-lg) var(--oas-radius-lg) 0 0;
  box-shadow: var(--oas-shadow-md, var(--oas-shadow-sm));
  padding-block-end: var(--oas-space-4);
}
.mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  border: none;
  padding: 0;
  background: var(--oas-color-overlay);
  cursor: default;
}
.mask[hidden] {
  display: none;
}
.mask:focus-visible {
  outline: none;
}
.group {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  margin: 0;
  padding: 0;
  border: none;
  min-width: 0;
}
.group[hidden] {
  display: none;
}
.group-label {
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.group-label[hidden] {
  display: none;
}
.options {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--oas-space-1) var(--oas-space-2);
}
.option {
  display: inline-flex;
  align-items: center;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  cursor: pointer;
}
.option:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.option:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.option[aria-checked='true'] {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 10%, var(--oas-color-bg));
  color: var(--oas-color-primary-text);
  font-weight: 600;
}
.option:disabled {
  cursor: default;
  opacity: 0.5;
}
.done-row {
  display: flex;
  justify-content: flex-end;
  padding-block-start: var(--oas-space-2);
  border-block-start: 1px solid var(--oas-color-border);
}
.done-row[hidden] {
  display: none;
}
.done {
  flex: 1 1 auto;
  padding: var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1.5;
  cursor: pointer;
}
.done:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 88%, var(--oas-color-text-primary));
}
.done:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.live {
  margin: 0;
  border: 0;
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .caret {
    transition: none;
  }
}

@media (forced-colors: active) {
  .trigger:focus-visible,
  .sort-item:focus-visible,
  .chip:focus-visible,
  .reset:focus-visible,
  .option:focus-visible,
  .done:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
}
`

/** chip 图标（×，原创路径） */
const CHIP_X_PATH =
  '<path d="M4.1 4.1a.9.9 0 0 1 1.27 0L8 6.73l2.63-2.63a.9.9 0 1 1 1.27 1.27L9.27 8l2.63 2.63a.9.9 0 1 1-1.27 1.27L8 9.27l-2.63 2.63a.9.9 0 1 1-1.27-1.27L6.73 8 4.1 5.37a.9.9 0 0 1 0-1.27Z"/>'
/** 下拉 caret 图标（原创路径） */
const CARET_PATH =
  '<path d="M3.2 5.8a.8.8 0 0 1 1.13-.07L8 8.96l3.67-3.23a.8.8 0 1 1 1.06 1.2l-4.2 3.7a.8.8 0 0 1-1.06 0l-4.2-3.7a.8.8 0 0 1-.07-1.13Z"/>'

export class OASFilter extends OASElement {
  static override get observedAttributes(): string[] {
    return ['sorts', 'groups', 'conditions', 'panel', 'open']
  }

  private barEl: HTMLElement | null = null
  private sortsEl: HTMLElement | null = null
  private triggerEl: HTMLButtonElement | null = null
  private badgeEl: HTMLElement | null = null
  private chipsEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private maskEl: HTMLButtonElement | null = null
  private groupsBoxEl: HTMLElement | null = null
  private doneRowEl: HTMLElement | null = null
  private doneEl: HTMLButtonElement | null = null
  private liveEl: HTMLElement | null = null

  private warnedSorts = false
  private warnedGroups = false
  private warnedConditions = false
  private warnedPanel = false
  /** 结构校验告警（缺 label / value 等），与「非法 JSON」告警分开计数，各一次 */
  private warnedSortsShape = false
  private warnedGroupsShape = false
  private warnedConditionsShape = false

  /** 面板组区块渲染签名（groups JSON 变化才重建选项，保焦点与选中态增量同步） */
  private groupsSignature = ''
  /** chips 渲染签名（选中集变化才重建 chips） */
  private chipsSignature = ''
  /** open 状态监听是否已挂（外点 + Esc） */
  private openListenersBound = false
  /** 断连清理是否已注册（防开合循环重复注册 onCleanup） */
  private openCleanupRegistered = false
  /** 打开前的焦点元素（关闭时焦点回带） */
  private openTriggerFocus: HTMLElement | null = null

  /** 外点关闭 handler（openListeners 生命周期内挂 / 摘） */
  private readonly onOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (path.includes(this)) return
    this.setOpen(false)
  }

  private readonly onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.isOpen) {
      e.stopPropagation()
      this.setOpen(false)
      this.restoreFocusToTrigger()
      return
    }
    // drawer 是模态对话框：Tab 循环限制在面板内（I8 焦点陷阱）
    if (e.key === 'Tab' && this.isOpen && this.resolvePanel() === 'drawer') {
      this.trapDrawerFocus(e)
    }
  }

  /** drawer 焦点陷阱：Tab / Shift+Tab 在面板可聚焦项内循环；游离面板外的焦点拉回首项 */
  private trapDrawerFocus(e: KeyboardEvent): void {
    const panel = this.panelEl
    if (!panel) return
    const focusables = [...panel.querySelectorAll<HTMLElement>('[part="option"]:not([disabled]), [part="done"]')]
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = this.deepActiveElement()
    const inside = active != null && panel.contains(active)
    if (!inside || (!e.shiftKey && active === last)) {
      e.preventDefault()
      first.focus({ preventScroll: true })
    } else if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus({ preventScroll: true })
    }
  }

  // -------------------------------------------------------------------------
  // property 通道（attribute camelCase 双通道，collision-guard 豁免面）
  // -------------------------------------------------------------------------

  /**
   * @apiProperty 排序项配置：get+set 双通道（数组或 JSON 字符串），写即反射 `sorts` attribute
   */
  get sorts(): FilterSortOption[] {
    return this.parseSorts()
  }

  set sorts(value: FilterSortOption[] | string) {
    this.setAttribute('sorts', typeof value === 'string' ? value : JSON.stringify(value ?? []))
  }

  /**
   * @apiProperty 条件组配置：get+set 双通道（数组或 JSON 字符串），写即反射 `groups` attribute
   */
  get groups(): FilterGroup[] {
    return this.parseGroups()
  }

  set groups(value: FilterGroup[] | string) {
    this.setAttribute('groups', typeof value === 'string' ? value : JSON.stringify(value ?? []))
  }

  /**
   * @apiProperty 当前值：get+set 双通道（对象或 JSON 字符串），写即反射 `conditions` attribute
   * （宿主受控写入不派发 oas-change；用户交互由组件回写并派发）
   */
  get conditions(): FilterConditions {
    return this.parseConditions()
  }

  set conditions(value: FilterConditions | string) {
    this.setAttribute('conditions', typeof value === 'string' ? value : JSON.stringify(value ?? {}))
  }

  /**
   * @apiProperty 面板展开态：get+set 双通道（布尔），写即反射 `open` attribute
   * （受控写入静默；用户交互 / setOpen() 才派发 oas-open-change）
   */
  get open(): boolean {
    return this.isOpen
  }

  set open(value: boolean) {
    this.toggleAttribute('open', value)
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar">
        <div class="sorts" part="sorts" role="radiogroup"></div>
        <button class="trigger" part="trigger" type="button" aria-haspopup="true" aria-expanded="false" hidden>
          <span class="trigger-label"></span>
          <span class="badge" part="badge" hidden></span>
          <svg class="caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${CARET_PATH}</svg>
        </button>
        <div class="panel" part="panel" data-form="dropdown" hidden>
          <div class="groups-box"></div>
          <div class="done-row" part="done-row" hidden>
            <button class="done" part="done" type="button"></button>
          </div>
        </div>
      </div>
      <div class="chips" part="chips" hidden></div>
      <button class="mask" part="mask" type="button" aria-label="" tabindex="-1" hidden></button>
      <p class="live" part="live" role="status" aria-live="polite"></p>
    `
  }

  private bind(): void {
    this.barEl = this.shadow.querySelector<HTMLElement>('[part="bar"]')
    this.sortsEl = this.shadow.querySelector<HTMLElement>('[part="sorts"]')
    this.triggerEl = this.shadow.querySelector<HTMLButtonElement>('[part="trigger"]')
    this.badgeEl = this.shadow.querySelector<HTMLElement>('[part="badge"]')
    this.chipsEl = this.shadow.querySelector<HTMLElement>('[part="chips"]')
    this.panelEl = this.shadow.querySelector<HTMLElement>('[part="panel"]')
    this.maskEl = this.shadow.querySelector<HTMLButtonElement>('[part="mask"]')
    this.groupsBoxEl = this.shadow.querySelector<HTMLElement>('.groups-box')
    this.doneRowEl = this.shadow.querySelector<HTMLElement>('[part="done-row"]')
    this.doneEl = this.shadow.querySelector<HTMLButtonElement>('[part="done"]')
    this.liveEl = this.shadow.querySelector<HTMLElement>('[part="live"]')

    this.triggerEl?.addEventListener('click', this.onTriggerClick)
    this.maskEl?.addEventListener('click', this.onMaskClick)
    this.doneEl?.addEventListener('click', this.onDoneClick)
    this.sortsEl?.addEventListener('click', this.onSortsClick)
    this.sortsEl?.addEventListener('keydown', this.onSortsKeydown)
    this.groupsBoxEl?.addEventListener('click', this.onOptionClick)
    this.groupsBoxEl?.addEventListener('keydown', this.onOptionKeydown)
    this.chipsEl?.addEventListener('click', this.onChipClick)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
    // 重连后按当前 open 恢复全局监听（disconnectedCallback 已摘）
    if (this.isOpen) this.bindOpenListeners()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unbindOpenListeners()
  }

  // -------------------------------------------------------------------------
  // 数据解析
  // -------------------------------------------------------------------------

  private parseSorts(): FilterSortOption[] {
    const raw = this.getAttr('sorts').trim()
    if (raw === '') return this.defaultSorts()
    const parsed = parseJsonArray<FilterSortOption>(raw, () => {
      if (!this.warnedSorts) {
        this.warnedSorts = true
        devWarn('[oas-filter] sorts 不是合法 JSON 数组，已回落缺省排序项')
      }
    })
    const valid: FilterSortOption[] = []
    for (const s of parsed) {
      if (
        typeof s === 'object' &&
        s !== null &&
        typeof (s as FilterSortOption).key === 'string' &&
        (s as FilterSortOption).key !== '' &&
        typeof (s as FilterSortOption).label === 'string' &&
        (s as FilterSortOption).label !== ''
      ) {
        valid.push(s)
      }
    }
    if (valid.length !== parsed.length && !this.warnedSortsShape) {
      this.warnedSortsShape = true
      devWarn('[oas-filter] sorts 存在缺 key / label 的条目，已跳过（一次告警）')
    }
    return valid.length > 0 ? valid : this.defaultSorts()
  }

  /** 缺省排序三件套（文案走 i18n，非硬编码） */
  private defaultSorts(): FilterSortOption[] {
    return [
      { key: 'default', label: this.t('filter.sortComposite') },
      { key: 'sales', label: this.t('filter.sortSales') },
      { key: 'price', label: this.t('filter.sortPrice'), toggled: true },
    ]
  }

  private parseGroups(): FilterGroup[] {
    const raw = this.getAttr('groups').trim()
    if (raw === '') return []
    const parsed = parseJsonArray<FilterGroup>(raw, () => {
      if (!this.warnedGroups) {
        this.warnedGroups = true
        devWarn('[oas-filter] groups 不是合法 JSON 数组，已按空条件组处理')
      }
    })
    const valid: FilterGroup[] = []
    for (const g of parsed) {
      if (
        typeof g !== 'object' ||
        g === null ||
        typeof (g as FilterGroup).key !== 'string' ||
        (g as FilterGroup).key === '' ||
        typeof (g as FilterGroup).label !== 'string' ||
        (g as FilterGroup).label === '' ||
        !Array.isArray((g as FilterGroup).options)
      ) {
        continue
      }
      const options = g.options.filter(
        (o): o is FilterGroupOption =>
          typeof o === 'object' &&
          o !== null &&
          typeof o.value === 'string' &&
          o.value !== '' &&
          typeof o.label === 'string' &&
          o.label !== '',
      )
      if (options.length === 0) continue
      valid.push({ ...g, options })
    }
    if (valid.length !== parsed.length && !this.warnedGroupsShape) {
      this.warnedGroupsShape = true
      devWarn('[oas-filter] groups 存在缺 key / label 或无合法选项的条目，已跳过（一次告警）')
    }
    return valid
  }

  private parseConditions(): FilterConditions {
    const raw = this.getAttr('conditions').trim()
    if (raw === '') return {}
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const clean = this.sanitizeConditions(parsed as FilterConditions)
        // 清洗结果回写 attribute：getter 与 attribute 一致（宿主写脏值被规整）；
        // 清洗幂等——回写后的值再清洗结果不变，不会循环触发
        const cleanJson = JSON.stringify(clean)
        if (cleanJson !== JSON.stringify(parsed)) this.setAttribute('conditions', cleanJson)
        return clean
      }
    } catch {
      // 落到统一告警
    }
    if (!this.warnedConditions) {
      this.warnedConditions = true
      devWarn('[oas-filter] conditions 不是合法 JSON 对象，已按空条件处理')
    }
    return {}
  }

  /** conditions 清洗：剔除未知键与非法值（groups 只留字符串数组，单选组限 1 项） */
  private sanitizeConditions(raw: FilterConditions): FilterConditions {
    const out: FilterConditions = {}
    if (typeof raw.sort === 'string' && raw.sort !== '') out.sort = raw.sort
    if (raw.order === 'asc' || raw.order === 'desc') out.order = raw.order
    if (raw.groups && typeof raw.groups === 'object' && !Array.isArray(raw.groups)) {
      const groups: Record<string, string[]> = {}
      for (const [key, values] of Object.entries(raw.groups)) {
        if (!Array.isArray(values)) continue
        const strs = values.filter((v): v is string => typeof v === 'string')
        const def = this.parseGroups().find((g) => g.key === key)
        if (def?.multiple) {
          groups[key] = strs
        } else {
          // 单选组恒 ≤1 项：超出部分截断并告警一次（空数组保留——「取消」语义的回显契约）
          if (strs.length > 1 && !this.warnedConditionsShape) {
            this.warnedConditionsShape = true
            devWarn(`[oas-filter] conditions.groups.${key} 是单选组，多值已截断为首个（一次告警）`)
          }
          groups[key] = strs.slice(0, 1)
        }
      }
      if (Object.keys(groups).length > 0) out.groups = groups
    }
    return out
  }

  private resolvePanel(): FilterPanel {
    const raw = this.getAttr('panel').trim()
    if (raw === '' || raw === 'dropdown') return 'dropdown'
    if (raw === 'drawer') return 'drawer'
    if (!this.warnedPanel) {
      this.warnedPanel = true
      devWarn(`[oas-filter] panel "${raw}" 非法（dropdown / drawer），已回落 dropdown`)
    }
    return 'dropdown'
  }

  // -------------------------------------------------------------------------
  // 状态访问
  // -------------------------------------------------------------------------

  private get isOpen(): boolean {
    return this.hasAttr('open')
  }

  /** 当前排序配置项（conditions.sort 无匹配时回落第一项） */
  private activeSort(): FilterSortOption {
    const sorts = this.parseSorts()
    const key = this.parseConditions().sort ?? ''
    return sorts.find((s) => s.key === key) ?? sorts[0]!
  }

  /** 选中值总数（触发器徽标） */
  private selectedCount(): number {
    const groups = this.parseConditions().groups ?? {}
    let n = 0
    for (const values of Object.values(groups)) n += values.length
    return n
  }

  /** 汇总摘要文本（排序方向 + 各组「组名：选项」；空条件返回空串） */
  private buildSummary(): string {
    const conditions = this.parseConditions()
    const parts: string[] = []
    const sort = this.activeSort()
    if (sort.key !== '' && (conditions.sort ?? '') === sort.key && sort.key !== this.defaultSorts()[0]!.key) {
      if (sort.toggled) {
        const dir = conditions.order === 'asc' ? this.t('filter.asc') : this.t('filter.desc')
        parts.push(`${sort.label} ${dir}`)
      } else {
        parts.push(sort.label)
      }
    }
    const defs = this.parseGroups()
    const selected = conditions.groups ?? {}
    for (const def of defs) {
      const values = selected[def.key] ?? []
      if (values.length === 0) continue
      const labels = values.map((v) => def.options.find((o) => o.value === v)?.label ?? v).join('、')
      parts.push(`${def.label}：${labels}`)
    }
    return parts.join('；')
  }

  // -------------------------------------------------------------------------
  // 渲染同步
  // -------------------------------------------------------------------------

  protected override update(): void {
    if (!this.barEl) return
    this.syncSorts()
    this.syncTrigger()
    this.syncChips()
    this.syncPanel()
    this.syncLive()
  }

  /** 排序行：项集合按签名重建，选中态 / 方向 aria-label 增量同步 */
  private syncSorts(): void {
    const box = this.sortsEl
    if (!box) return
    const sorts = this.parseSorts()
    const conditions = this.parseConditions()
    const signature = JSON.stringify(sorts)
    if (box.childElementCount !== sorts.length || box.getAttribute('data-signature') !== signature) {
      box.replaceChildren(...sorts.map((s) => this.buildSortItem(s)))
      box.setAttribute('data-signature', signature)
      box.setAttribute('aria-label', this.t('filter.sortLabel'))
    }
    const items = [...box.querySelectorAll<HTMLButtonElement>('[part="sort-item"]')]
    for (const item of items) {
      const def = sorts.find((s) => s.key === item.dataset.key)
      if (!def) continue
      const active = (conditions.sort ?? sorts[0]!.key) === def.key
      item.setAttribute('aria-checked', String(active))
      if (active && def.toggled) {
        const dir = conditions.order === 'asc' ? this.t('filter.asc') : this.t('filter.desc')
        item.setAttribute('aria-label', `${def.label}，${dir}`)
      } else {
        item.setAttribute('aria-label', def.label)
      }
    }
  }

  private buildSortItem(def: FilterSortOption): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'sort-item'
    b.setAttribute('part', 'sort-item')
    b.setAttribute('role', 'radio')
    b.tabIndex = 0
    b.dataset.key = def.key
    if (def.toggled) b.setAttribute('data-toggled', 'true')
    b.textContent = def.label
    return b
  }

  private syncTrigger(): void {
    const trigger = this.triggerEl
    if (!trigger) return
    const hasGroups = this.parseGroups().length > 0
    trigger.hidden = !hasGroups
    const label = trigger.querySelector<HTMLElement>('.trigger-label')
    if (label) label.textContent = this.t('filter.label')
    const count = this.selectedCount()
    if (this.badgeEl) {
      this.badgeEl.hidden = count === 0
      this.badgeEl.textContent = count > 0 ? String(count) : ''
    }
    // 可访问名从可见内容推导（排序标签 + 计数徽标）——避免 aria-label 与可见文本
    // 不一致违反 WCAG 2.5.3（label-in-name）：所见即所读
    const panelId = this.panelId()
    trigger.setAttribute('aria-controls', panelId)
    if (this.panelEl) this.panelEl.id = panelId
    trigger.setAttribute('aria-expanded', String(this.isOpen))
  }

  private panelId(): string {
    return `oas-filter-${stableHash36(`${this.getAttr('groups')}|${this.getAttr('sorts')}`)}-panel`
  }

  /** chips 区：选中集签名变化才重建 */
  private syncChips(): void {
    const box = this.chipsEl
    if (!box) return
    const defs = this.parseGroups()
    const selected = this.parseConditions().groups ?? {}
    type ChipDef = { group: string; value: string; text: string }
    const chips: ChipDef[] = []
    for (const def of defs) {
      for (const value of selected[def.key] ?? []) {
        const label = def.options.find((o) => o.value === value)?.label ?? value
        chips.push({ group: def.key, value, text: `${def.label}：${label}` })
      }
    }
    const signature = JSON.stringify(chips)
    if (signature === this.chipsSignature) {
      box.hidden = chips.length === 0
      return
    }
    this.chipsSignature = signature
    box.replaceChildren(
      ...chips.map((c) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'chip'
        b.setAttribute('part', 'chip')
        b.dataset.group = c.group
        b.dataset.value = c.value
        b.setAttribute('aria-label', this.t('filter.removeChip', { name: c.text }))
        const text = document.createElement('span')
        text.textContent = c.text
        const x = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        x.setAttribute('class', 'chip-x')
        x.setAttribute('viewBox', '0 0 16 16')
        x.setAttribute('aria-hidden', 'true')
        x.innerHTML = CHIP_X_PATH
        b.append(text, x)
        return b
      }),
    )
    if (chips.length > 0) {
      const reset = document.createElement('button')
      reset.type = 'button'
      reset.className = 'reset'
      reset.setAttribute('part', 'reset')
      reset.textContent = this.t('filter.reset')
      box.appendChild(reset)
    }
    box.hidden = chips.length === 0
  }

  /** 面板：形态 / 显隐 / 组区块 / drawer 出口 */
  private syncPanel(): void {
    const panel = this.panelEl
    if (!panel) return
    const form = this.resolvePanel()
    panel.setAttribute('data-form', form)
    const open = this.isOpen
    panel.hidden = !open
    // drawer 是模态对话框（半屏遮罩交互面）；dropdown 非模态不挂 dialog 语义
    if (form === 'drawer') {
      panel.setAttribute('role', 'dialog')
      panel.setAttribute('aria-modal', 'true')
      panel.setAttribute('aria-label', this.t('filter.panelLabel'))
    } else {
      panel.removeAttribute('role')
      panel.removeAttribute('aria-modal')
      panel.removeAttribute('aria-label')
    }
    if (this.maskEl) {
      this.maskEl.hidden = !(open && form === 'drawer')
      this.maskEl.setAttribute('aria-label', this.t('filter.panelLabel'))
    }
    this.syncGroupsBox()
    this.syncPanelFlip()
    const isDrawer = open && form === 'drawer'
    if (this.doneRowEl) this.doneRowEl.hidden = !isDrawer
    if (this.doneEl && this.doneEl.textContent === '') this.doneEl.textContent = this.t('filter.done')
    if (open && !this.openListenersBound) this.bindOpenListeners()
    if (!open && this.openListenersBound) this.unbindOpenListeners()
  }

  /**
   * dropdown 贴底锚定 + 视口翻转：先按向下形态测量（重置 data-flip），
   * 下方放不下且上方更宽裕时翻到栏上方。happy-dom / 未布局时测量值全 0，
   * 条件不成立维持向下（退化安全）。
   */
  private syncPanelFlip(): void {
    const panel = this.panelEl
    const bar = this.barEl
    if (!panel || !bar) return
    if (!this.isOpen || this.resolvePanel() !== 'dropdown') {
      panel.removeAttribute('data-flip')
      return
    }
    panel.removeAttribute('data-flip')
    const barRect = bar.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    const below = window.innerHeight - barRect.bottom
    const above = barRect.top
    if (panelRect.height > 0 && below < panelRect.height && above > below) {
      panel.setAttribute('data-flip', 'up')
    }
  }

  /** 组区块：签名变化才重建（重建后选中态由同一签名推导），增量只同步 aria-checked */
  private syncGroupsBox(): void {
    const box = this.groupsBoxEl
    if (!box) return
    const defs = this.parseGroups()
    const signature = JSON.stringify(defs)
    if (box.getAttribute('data-signature') !== signature) {
      this.groupsSignature = signature
      box.setAttribute('data-signature', signature)
      box.replaceChildren(...defs.map((def) => this.buildGroup(def)))
    }
    const selected = this.parseConditions().groups ?? {}
    for (const opt of box.querySelectorAll<HTMLButtonElement>('[part="option"]')) {
      const values = selected[opt.dataset.group ?? ''] ?? []
      opt.setAttribute('aria-checked', String(values.includes(opt.dataset.value ?? '')))
    }
  }

  private buildGroup(def: FilterGroup): HTMLElement {
    const box = document.createElement('div')
    box.className = 'group'
    box.setAttribute('part', 'group')
    box.setAttribute('role', def.multiple ? 'group' : 'radiogroup')
    box.setAttribute('aria-label', def.label)
    box.dataset.key = def.key

    const label = document.createElement('div')
    label.className = 'group-label'
    label.setAttribute('part', 'group-label')
    label.textContent = def.label
    box.appendChild(label)

    const options = document.createElement('div')
    options.className = 'options'
    options.setAttribute('part', 'options')
    for (const opt of def.options) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'option'
      b.setAttribute('part', 'option')
      b.setAttribute('role', def.multiple ? 'checkbox' : 'radio')
      b.tabIndex = 0
      b.dataset.group = def.key
      b.dataset.value = opt.value
      b.textContent = opt.label
      if (opt.disabled) b.disabled = true
      options.appendChild(b)
    }
    box.appendChild(options)
    return box
  }

  private syncLive(): void {
    if (this.liveEl) this.liveEl.textContent = this.buildSummary()
  }

  // -------------------------------------------------------------------------
  // 开合与监听生命周期
  // -------------------------------------------------------------------------

  private bindOpenListeners(): void {
    if (this.openListenersBound) return
    this.openListenersBound = true
    document.addEventListener('keydown', this.onDocKeydown, true)
    addOutsideDismiss(this.onOutsideClick)
    // 断连清理只注册一次（开合循环反复 bind/unbind 不得使 cleanup 单调增长）
    if (!this.openCleanupRegistered) {
      this.openCleanupRegistered = true
      this.onCleanup(() => this.unbindOpenListeners())
    }
  }

  private unbindOpenListeners(): void {
    if (!this.openListenersBound) return
    this.openListenersBound = false
    document.removeEventListener('keydown', this.onDocKeydown, true)
    removeOutsideDismiss(this.onOutsideClick)
  }

  /**
   * 编程式开合（等价用户交互）：回写 `open` attribute + 派发 `oas-open-change` +
   * 焦点管理（开 → 聚焦首个条件；关 → 焦点回触发器）。
   */
  setOpen(open: boolean): void {
    const changed = open !== this.isOpen
    this.toggleAttribute('open', open)
    if (!changed) return
    if (open) {
      this.openTriggerFocus = this.deepActiveElement()
      this.focusFirstOption()
    } else {
      this.restoreFocusToTrigger()
    }
    this.emit('open-change', { open } satisfies FilterOpenDetail)
  }

  /** 深层 activeElement（穿透 shadow root；环境差异兜底回落 document.activeElement） */
  private deepActiveElement(): HTMLElement | null {
    let active: Element | null = typeof document !== 'undefined' ? document.activeElement : null
    try {
      while (active instanceof Element && active.shadowRoot?.activeElement) {
        active = active.shadowRoot.activeElement
      }
    } catch {
      // happy-dom 等环境读深层焦点可能抛错，回落外层
    }
    return active instanceof HTMLElement ? active : null
  }

  private focusFirstOption(): void {
    const first = this.shadow.querySelector<HTMLElement>('[part="option"]:not([disabled])')
    first?.focus({ preventScroll: true })
  }

  /**
   * 关闭后把焦点收回触发器。归属判定：
   * - 焦点在面板内 / 在遮罩上（用户交互路径）→ 收回；
   * - 焦点「无主」（null / body / documentElement）→ 收回——面板隐藏时浏览器会把焦点
   *   回收到 body，若不认这一档，遮罩点击关闭后焦点就永久停在 body（键盘用户失位）；
   * - 焦点已落到页面其它可聚焦元素（用户点了别处触发的「外点关闭」）→ 不抢焦点。
   */
  private restoreFocusToTrigger(): void {
    const trigger = this.triggerEl
    if (!trigger || trigger.hidden) return
    const active = this.deepActiveElement()
    const loose =
      active == null ||
      (typeof document !== 'undefined' && (active === document.body || active === document.documentElement))
    const inside = active != null && (this.panelEl?.contains(active) || this.maskEl === active)
    if (loose || inside) trigger.focus({ preventScroll: true })
  }

  // -------------------------------------------------------------------------
  // 交互
  // -------------------------------------------------------------------------

  private onTriggerClick = (): void => {
    this.setOpen(!this.isOpen)
  }

  private onMaskClick = (): void => {
    this.setOpen(false)
  }

  private onDoneClick = (): void => {
    this.setOpen(false)
  }

  private onSortsClick = (e: MouseEvent): void => {
    const item = (e.target as Element | null)?.closest<HTMLButtonElement>('[part="sort-item"]')
    if (!item || item.disabled) return
    this.applySort(item.dataset.key ?? '')
  }

  private onSortsKeydown = (e: KeyboardEvent): void => {
    this.moveFocusWithin(this.sortsEl, e)
  }

  /** 点排序项：同项 toggled 翻方向；换项落默认方向（toggled 项首次=降序） */
  private applySort(key: string): void {
    const sorts = this.parseSorts()
    const def = sorts.find((s) => s.key === key)
    if (!def) return
    const conditions = this.parseConditions()
    const sameKey = (conditions.sort ?? sorts[0]!.key) === key
    if (sameKey && !def.toggled) return
    const next: FilterConditions = { ...conditions, sort: key }
    if (def.toggled) {
      const prevOrder = sameKey ? (conditions.order ?? 'desc') : 'desc'
      next.order = sameKey && prevOrder === 'desc' ? 'asc' : 'desc'
    } else {
      delete next.order
    }
    this.conditions = next
    this.emitChange()
  }

  private onOptionClick = (e: MouseEvent): void => {
    const opt = (e.target as Element | null)?.closest<HTMLButtonElement>('[part="option"]')
    if (!opt || opt.disabled) return
    this.applyOption(opt.dataset.group ?? '', opt.dataset.value ?? '')
  }

  private onOptionKeydown = (e: KeyboardEvent): void => {
    this.moveFocusWithin(this.groupsBoxEl, e)
  }

  /** 选中 / 取消一个条件值（单选组互斥 + 已选再点取消） */
  private applyOption(groupKey: string, value: string): void {
    const def = this.parseGroups().find((g) => g.key === groupKey)
    if (!def) return
    const conditions = this.parseConditions()
    const groups: Record<string, string[]> = { ...(conditions.groups ?? {}) }
    const current = groups[groupKey] ?? []
    if (def.multiple) {
      groups[groupKey] = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    } else {
      groups[groupKey] = current.includes(value) ? [] : [value]
    }
    this.conditions = { ...conditions, groups }
    this.emitChange()
  }

  private onChipClick = (e: MouseEvent): void => {
    const target = e.target as Element | null
    const chipEl = target?.closest<HTMLButtonElement>('[part="chip"]')
    if (chipEl) {
      this.removeValue(chipEl.dataset.group ?? '', chipEl.dataset.value ?? '')
      return
    }
    const resetEl = target?.closest<HTMLButtonElement>('[part="reset"]')
    if (resetEl) this.resetAll()
  }

  /** 撤销一个已选值（chips 逐项撤销；焦点迁到相邻 chip，无相邻回触发器） */
  private removeValue(groupKey: string, value: string): void {
    const chips = [...(this.chipsEl?.querySelectorAll<HTMLButtonElement>('[part="chip"]') ?? [])]
    const idx = chips.findIndex((c) => c.dataset.group === groupKey && c.dataset.value === value)
    if (idx < 0) return
    const conditions = this.parseConditions()
    const groups: Record<string, string[]> = { ...(conditions.groups ?? {}) }
    const current = groups[groupKey] ?? []
    if (!current.includes(value)) return
    groups[groupKey] = current.filter((v) => v !== value)
    this.conditions = { ...conditions, groups }
    this.emitChange()
    // conditions 写入已同步重建 chips：焦点迁到同位置的下一枚（无则最后一枚），全撤完回触发器
    const rest = [...(this.chipsEl?.querySelectorAll<HTMLButtonElement>('[part="chip"]') ?? [])]
    const target = rest[Math.min(idx, rest.length - 1)] ?? this.triggerEl
    target?.focus({ preventScroll: true })
  }

  /** 一键重置：清全部条件 + 排序回缺省首项（空 conditions 语义，读数回落由 activeSort 承担） */
  private resetAll(): void {
    this.conditions = {}
    this.emitChange()
  }

  /** 值变化收口：统一派发 oas-change（detail 含排序 / 各组选中值 / 摘要文本） */
  private emitChange(): void {
    const conditions = this.parseConditions()
    this.emit('change', {
      sort: conditions.sort ?? this.parseSorts()[0]?.key ?? '',
      order: conditions.order ?? null,
      groups: conditions.groups ?? {},
      summary: this.buildSummary(),
    } satisfies FilterChangeDetail)
  }

  /** 组内 / 排序行方向键焦点移动（不触发选择；Tab 语义不受影响） */
  private moveFocusWithin(box: HTMLElement | null, e: KeyboardEvent): void {
    if (!box) return
    const key = e.key
    const forward = key === 'ArrowDown' || key === 'ArrowRight'
    const backward = key === 'ArrowUp' || key === 'ArrowLeft'
    if (!forward && !backward) return
    const items = [
      ...box.querySelectorAll<HTMLElement>('[part="sort-item"]:not([disabled]), [part="option"]:not([disabled])'),
    ]
    const active = this.deepActiveElement()
    const idx = items.findIndex((el) => el === active)
    if (idx < 0) return
    e.preventDefault()
    e.stopPropagation()
    const next = forward ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0)
    items[next]?.focus({ preventScroll: true })
  }
}
