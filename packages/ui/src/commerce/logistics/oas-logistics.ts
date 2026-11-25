import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { parseJsonArray } from '../../shared/json-array.js'

/**
 * oas-logistics —— 物流时间线（commerce 族）。
 *
 * 节点时间线：`steps` JSON 双通道（最新在前惯例）`[{ state?, time?, desc?, title? }]`，
 * `reverse` 属性翻转渲染方向（宿主数据为时间正序时用）；当前节点高亮
 * （`state: 'done' | 'current' | 'pending'`，缺省按序推导）；折叠（`collapsed` 只显示
 * 最新 2 条 + 「展开全部 N 条」切换）；动作插槽（复制单号 / 复制地址——宿主给复制逻辑，
 * 组件提供槽位与动作区样式）。
 *
 * 状态推导规则（可测、可解释）：
 * - 全部未声明 state → 轨迹型缺省：首条（数据最新）= current，其余 = done；
 * - 有显式声明 → 未声明条目以「首个显式 current / pending 条目」为界：渲染声明序在其
 *   之前的未声明条目 = done，之后的 = pending；只有 done 声明时未声明条目 = done；
 * - 非法 state 字符串视同未声明并一次性 devWarn。
 *
 * 属性（kebab-case）：
 * - `steps`：JSON 数组（缺 `title` 且缺 `desc` 的条目忽略；非法 JSON 告警一次按空处理，
 *   渲染空态）。property 双通道：`steps`。
 * - `reverse`：翻转渲染序（aria-current 跟随语义节点而非 DOM 位置）。
 * - `collapsed`：折叠态（只看最新 2 条）。用户点击切换时组件回写 attribute 并派
 *   `oas-toggle`（宿主直写静默不派发——受控与非受控同一通道不回环）。
 *
 * 事件（bubbles + composed）：
 * - `oas-toggle`：用户点展开 / 收起切换，`detail: { collapsed }`（切换后的状态）；
 *   order-card 同名事件惯例。
 *
 * 插槽：
 * - `actions`：动作区（复制单号 / 复制地址等按钮——按钮文案与复制逻辑归宿主，组件提供
 *   槽位容器与间距样式；插槽无内容时动作区整体隐藏）。
 *
 * a11y：时间线为 `ol > li` 合法组合（ol 天然 list 语义 + `aria-label` i18n
 * `logistics.label`；**切换钮 / 动作区 / 空态都在 ol 之外**——非条目节点不进列表语义，
 * 对齐品类首波 C3 教训）；当前节点 `aria-current="step"`；每个 li 的 `aria-label`
 * 携带状态文本（i18n stateDone / stateCurrent / statePending——节点状态不只靠颜色，
 * 读屏可读；视觉上 current 点径更大 + 标题加重）；切换钮可见文本即状态（展开全部 N 条 /
 * 收起）；动作区 `role="group"` + `aria-label`。颜色全走 token，布局走逻辑属性（RTL
 * 安全）。
 */
export type LogisticsStepState = 'done' | 'current' | 'pending'

export interface LogisticsStep {
  /** 节点状态；缺省按序推导（见类注释推导规则） */
  state?: LogisticsStepState
  /** 时间文本（如「11-24 18:20」） */
  time?: string
  /** 描述文本 */
  desc?: string
  /** 节点标题（与 desc 至少其一，否则条目忽略） */
  title?: string
}

export interface LogisticsToggleDetail {
  collapsed: boolean
}

const VALID_STATES: readonly string[] = ['done', 'current', 'pending']
/** 折叠态保留的条数（只看最新 2 条） */
const COLLAPSED_COUNT = 2

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
  gap: var(--oas-space-3);
  min-width: 0;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}
.item {
  position: relative;
  display: flex;
  gap: var(--oas-space-3);
  padding-block: var(--oas-space-2);
  min-width: 0;
}
/* 连接线：画在 li 的竖向伪元素上（最后一个节点不画） */
.item::before {
  content: '';
  position: absolute;
  inset-inline-start: 5px;
  inset-block-start: 24px;
  inset-block-end: -8px;
  width: 2px;
  background: var(--oas-color-border);
}
.item:last-child::before {
  display: none;
}
.dot {
  flex: none;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  margin-block-start: 3px;
  border-radius: var(--oas-radius-full, 999px);
  border: 2px solid var(--oas-color-border);
  background: var(--oas-color-bg);
}
.item[data-state='done'] .dot {
  border-color: var(--oas-color-success);
  background: var(--oas-color-success);
}
.item[data-state='current'] .dot {
  width: 14px;
  height: 14px;
  margin-block-start: 2px;
  border-color: var(--oas-color-primary);
  background: var(--oas-color-primary);
  box-shadow: 0 0 0 3px var(--oas-color-primary-alpha, color-mix(in srgb, var(--oas-color-primary) 18%, transparent));
}
.item[data-state='pending'] .dot {
  border-color: var(--oas-color-border);
  background: var(--oas-color-bg);
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  min-width: 0;
  flex: 1 1 auto;
}
.title {
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  color: var(--oas-color-text-primary);
  overflow-wrap: anywhere;
}
.item[data-state='current'] .title {
  font-weight: 600;
}
.item[data-state='pending'] .title {
  color: var(--oas-color-text-tertiary, var(--oas-color-text-secondary));
}
.time {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.desc {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  overflow-wrap: anywhere;
}
.time[hidden],
.desc[hidden] {
  display: none;
}
.toggle {
  align-self: flex-start;
  box-sizing: border-box;
  min-height: var(--oas-control-height-sm, 24px);
  padding: 0 var(--oas-space-2);
  border: 0;
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-primary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.toggle:hover {
  background: var(--oas-color-bg-hover);
}
.toggle:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.toggle[hidden] {
  display: none;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-2);
}
.actions[hidden] {
  display: none;
}
.empty {
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  text-align: center;
}
.empty[hidden] {
  display: none;
}
@media (forced-colors: active) {
  .toggle:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
  .item::before {
    background: CanvasText;
  }
}
`

export class OASLogistics extends OASElement {
  static override get observedAttributes(): string[] {
    return ['steps', 'reverse', 'collapsed']
  }

  private timelineEl: HTMLElement | null = null
  private toggleEl: HTMLButtonElement | null = null
  private actionsEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private actionsSlot: HTMLSlotElement | null = null

  private warnedSteps = false
  private warnedState = false

  // -------------------------------------------------------------------------
  // property 通道
  // -------------------------------------------------------------------------

  /**
   * @apiProperty 物流节点数据：get+set 双通道（数组或 JSON 字符串），赋值即生效不派发事件
   */
  get steps(): LogisticsStep[] {
    return this.parseSteps()
  }

  set steps(value: LogisticsStep[] | string) {
    this.setAttribute('steps', typeof value === 'string' ? value : JSON.stringify(value ?? []))
  }

  /**
   * @apiProperty 折叠态：get+set 双通道（写反射 attribute），赋值静默不派发事件
   */
  get collapsed(): boolean {
    return this.hasAttr('collapsed')
  }

  set collapsed(v: boolean) {
    if (v) this.setAttribute('collapsed', '')
    else this.removeAttribute('collapsed')
  }

  // -------------------------------------------------------------------------
  // 数据解析
  // -------------------------------------------------------------------------

  private parseSteps(): LogisticsStep[] {
    return parseJsonArray<LogisticsStep>(this.getAttr('steps'), () => {
      if (!this.warnedSteps) {
        this.warnedSteps = true
        devWarn('[oas-logistics] steps 不是合法 JSON 数组，已按空列表处理')
      }
    }).filter(
      (it): it is LogisticsStep =>
        typeof it === 'object' &&
        it !== null &&
        // 条目最小可识别单元：title 或 desc 至少其一非空
        ((typeof (it as LogisticsStep).title === 'string' && (it as LogisticsStep).title !== '') ||
          (typeof (it as LogisticsStep).desc === 'string' && (it as LogisticsStep).desc !== '')),
    )
  }

  /** 状态推导（规则见类注释）：返回与 steps 等长的状态数组 */
  private resolveStates(steps: LogisticsStep[]): LogisticsStepState[] {
    const declared = steps.map((s) =>
      VALID_STATES.includes(String(s.state)) ? (s.state as LogisticsStepState) : undefined,
    )
    // 非法 state 告警一次
    if (!this.warnedState && steps.some((s) => s.state !== undefined && !VALID_STATES.includes(String(s.state)))) {
      this.warnedState = true
      const bad = steps.find((s) => s.state !== undefined && !VALID_STATES.includes(String(s.state)))
      devWarn(`[oas-logistics] state "${String(bad?.state)}" 非法（done / current / pending），已按未声明处理`)
    }
    const declaredIdx = declared.findIndex((s) => s !== undefined)
    if (declaredIdx < 0) {
      // 全部未声明：首条 current（数据最新），其余 done
      return steps.map((_, i) => (i === 0 ? 'current' : 'done'))
    }
    const firstOpen = declared.findIndex((s) => s === 'current' || s === 'pending')
    return declared.map((s, i) => {
      if (s) return s
      if (firstOpen < 0) return 'done'
      return i < firstOpen ? 'done' : 'pending'
    })
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <section class="wrap" part="wrap">
        <div class="actions" part="actions" role="group" aria-label="" hidden>
          <slot name="actions"></slot>
        </div>
        <ol class="timeline" part="timeline" aria-label=""></ol>
        <button class="toggle" part="toggle" type="button" hidden></button>
        <div class="empty" part="empty" hidden></div>
      </section>
    `
  }

  private bind(): void {
    this.timelineEl = this.shadow.querySelector<HTMLElement>('[part="timeline"]')
    this.toggleEl = this.shadow.querySelector<HTMLButtonElement>('[part="toggle"]')
    this.actionsEl = this.shadow.querySelector<HTMLElement>('[part="actions"]')
    this.emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    this.actionsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')

    this.toggleEl?.addEventListener('click', this.onToggle)
    this.actionsSlot?.addEventListener('slotchange', this.onSlotChange)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private readonly onSlotChange = (): void => {
    this.update()
  }

  // -------------------------------------------------------------------------
  // 渲染同步
  // -------------------------------------------------------------------------

  protected override update(): void {
    const timeline = this.timelineEl
    if (!timeline) return
    timeline.setAttribute('aria-label', this.t('logistics.label'))

    const steps = this.parseSteps()
    const states = this.resolveStates(steps)
    // 渲染方向：reverse 翻转显示序；折叠永远截取数据前 2 条（最新），再按方向渲染
    const collapsed = this.hasAttr('collapsed')
    const truncated = collapsed && steps.length > COLLAPSED_COUNT ? steps.slice(0, COLLAPSED_COUNT) : steps
    const stateSlice = collapsed && steps.length > COLLAPSED_COUNT ? states.slice(0, COLLAPSED_COUNT) : states
    const rendered = this.hasAttr('reverse')
      ? truncated.map((s, i) => ({ step: s, state: stateSlice[i]! })).reverse()
      : truncated.map((s, i) => ({ step: s, state: stateSlice[i]! }))

    // 签名比对：内容没变不重建 li（折叠切换 / reverse 才重建）
    const signature = JSON.stringify([rendered, collapsed])
    if (signature !== timeline.dataset.sig) {
      timeline.dataset.sig = signature
      const fragment = document.createDocumentFragment()
      for (const { step, state } of rendered) {
        fragment.appendChild(this.buildItem(step, state))
      }
      timeline.replaceChildren(fragment)
    }

    this.syncToggle(steps.length, collapsed)
    this.syncActions()
    this.syncEmpty(steps.length)
  }

  private buildItem(step: LogisticsStep, state: LogisticsStepState): HTMLElement {
    const li = document.createElement('li')
    li.className = 'item'
    li.setAttribute('part', 'item')
    li.setAttribute('data-state', state)
    if (state === 'current') li.setAttribute('aria-current', 'step')
    // 状态文本进可访问名（不只靠颜色）；title/desc 拼接保证读屏有完整内容
    const stateText =
      state === 'current'
        ? this.t('logistics.stateCurrent')
        : state === 'pending'
          ? this.t('logistics.statePending')
          : this.t('logistics.stateDone')
    const labelParts = [step.title ?? '', step.time ?? '', step.desc ?? '', stateText].filter((s) => s !== '')
    li.setAttribute('aria-label', labelParts.join('，'))

    const dot = document.createElement('span')
    dot.className = 'dot'
    dot.setAttribute('part', 'dot')
    dot.setAttribute('aria-hidden', 'true')
    li.appendChild(dot)

    const body = document.createElement('div')
    body.className = 'body'
    li.appendChild(body)

    if (step.title) {
      const title = document.createElement('div')
      title.className = 'title'
      title.setAttribute('part', 'title')
      title.textContent = step.title
      body.appendChild(title)
    }
    if (step.time) {
      const time = document.createElement('time')
      time.className = 'time'
      time.setAttribute('part', 'time')
      time.textContent = step.time
      body.appendChild(time)
    }
    if (step.desc) {
      const desc = document.createElement('div')
      desc.className = 'desc'
      desc.setAttribute('part', 'desc')
      desc.textContent = step.desc
      body.appendChild(desc)
    }
    return li
  }

  /** 切换钮：steps > 折叠阈值才显示；文案随态（展开全部 N 条 / 收起） */
  private syncToggle(total: number, collapsed: boolean): void {
    const toggle = this.toggleEl
    if (!toggle) return
    toggle.hidden = total <= COLLAPSED_COUNT
    toggle.textContent = collapsed ? this.t('logistics.expand', { count: total }) : this.t('logistics.collapse')
  }

  private syncActions(): void {
    if (!this.actionsEl) return
    const hasSlot =
      this.actionsSlot
        ?.assignedNodes({ flatten: true })
        .some((n) => (n.textContent ?? '').trim() !== '' || n.nodeType === Node.ELEMENT_NODE) ?? false
    this.actionsEl.hidden = !hasSlot
    this.actionsEl.setAttribute('aria-label', this.t('logistics.actionsLabel'))
  }

  private syncEmpty(count: number): void {
    if (!this.emptyEl) return
    this.emptyEl.hidden = count > 0
    if (count === 0) this.emptyEl.textContent = this.t('logistics.empty')
  }

  // -------------------------------------------------------------------------
  // 交互
  // -------------------------------------------------------------------------

  private readonly onToggle = (): void => {
    // 用户切换：回写 attribute + 派发（宿主直写 collapsed 静默——不回环）
    const next = !this.hasAttr('collapsed')
    if (next) this.setAttribute('collapsed', '')
    else this.removeAttribute('collapsed')
    this.update()
    this.emit('toggle', { collapsed: next } satisfies LogisticsToggleDetail)
  }
}
