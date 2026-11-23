import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { stableHash36 } from '../../shared/stable-id.js'
import { OASForm } from '../form/index.js'
import { writeFormControlValue } from '../form/index.js'
import type { FormError } from '../form/index.js'
import {
  canonicalDslPath,
  compileSchema,
  createReactionEngine,
  deepEqual,
  getConverter,
  getOptionSource,
  getTransformer,
  isEmptyValue,
  joinDslPath,
  parseDslPath,
  pathDependencyMatches,
  pathPatternMatches,
  projectValue,
  projectValues,
  validateValue,
  type ArrayPlan,
  type CompileResult,
  type FieldPlan,
  type GroupPlan,
  type JsonSchema,
  type PlanNode,
  type ReactionEffects,
  type ReactionEffectsMap,
  type ReactionEngine,
  type TabsPlan,
  type ValueHook,
  type ValueTransformPlan,
} from './compiler/index.js'

/**
 * oas-schema-form —— JSON 声明式表单（V1a）。
 *
 * 一份 `schema` + 可选 `uiSchema` → 编译为渲染计划 → 挂载到 form 族控件树：
 * 值管理 / 字段校验状态走 `oas-form` 内核（本组件渲染的字段即内核的 light DOM 子节点），
 * 错误注入 / 数组级校验 / 联动求值 / 编译由本组件承载。
 *
 * 值契约：`getValues()` / `oas-submit` 载荷遵循 form 内核字符串语义（叶子恒为字符串，数组出 JSON 串）；
 * 求值与校验前按 schema `type` 做只读投影归一，提交值不变。
 */
const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.body {
  /* 透传参与内层 form 的布局：grid 模式下 span 才能落到字段/容器（否则 body 自身占一列） */
  display: contents;
}
.group {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  min-width: 0;
}
.group-title {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.group-title[hidden] {
  display: none;
}
.array {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  min-width: 0;
}
.array-title {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.array-error {
  color: var(--oas-color-danger);
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
}
.array-error[hidden] {
  display: none;
}
.array-empty {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.array-empty[hidden] {
  display: none;
}
/* ---- 标签页容器：角色语义 + 键盘可达（方向键 / Home / End） ---- */
.tabs {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  min-width: 0;
}
.tablist {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
  border-bottom: 1px solid var(--oas-color-border);
}
.tab {
  appearance: none;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--oas-color-text-secondary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  padding: var(--oas-space-2) var(--oas-space-3);
  cursor: pointer;
  border-start-start-radius: var(--oas-radius-sm);
  border-start-end-radius: var(--oas-radius-sm);
}
.tab:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.tab[aria-selected='true'] {
  color: var(--oas-color-primary);
  border-bottom-color: var(--oas-color-primary);
  font-weight: 600;
}
.tab:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.tabs-title {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.tabpanel[hidden] {
  display: none;
}
.empty {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  padding: var(--oas-space-4) 0;
}
.empty[hidden] {
  display: none;
}
/* ---- 异步选项状态块（失败 + 重试 / 空态）：挂在控件所在 form-item 内 ---- */
.options-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-2);
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.options-status-message {
  color: var(--oas-color-danger);
}
.options-retry {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  background: transparent;
  color: var(--oas-color-primary);
  cursor: pointer;
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  font: inherit;
  font-size: var(--oas-font-size-sm);
}
.options-retry:hover {
  background: var(--oas-color-bg-hover);
}
.options-retry:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
@media (forced-colors: active) {
  .tab:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

/** 清值二次传播的轮次上限（与全量求值的定点迭代同量级，防病态联动死循环） */
const CLEAR_PROPAGATION_ROUNDS = 8

export class OASSchemaForm extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'schema',
      'ui-schema',
      'initial-values',
      'values',
      'layout',
      'label-align',
      'label-width',
      'size',
      'disabled',
      'validate-trigger',
    ]
  }

  private formEl: OASForm | null = null
  private bodyEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null

  /** 双通道：property 优先（对象），attribute 为 JSON 字符串（SSR 可序列化） */
  private _schemaProp: unknown = null
  private _uiSchemaProp: unknown = null
  private _initialProp: Record<string, unknown> | null = null
  /** property 写入时的 attribute 原文：attribute 之后变化即失效（防 attr/prop 漂移） */
  private _schemaPropAttr: string | null = null
  private _uiPropAttr: string | null = null
  private _initialPropAttr: string | null = null
  private _schemaVersion = 0
  private _uiVersion = 0
  private _initialVersion = 0
  /** 受控值（property 优先；attribute 为 JSON 字符串） */
  private _valuesProp: Record<string, unknown> | null = null
  private _valuesPropAttr: string | null = null
  private _valuesVersion = 0
  /** 已应用的受控值（diff 写基线）与来源标记（宿主写期间不回派事件、不叠联动） */
  private appliedValues: Record<string, unknown> | null = null
  private appliedValuesKey: string | null = null
  private applyingHostValues = false
  /** 脏态基线：挂载基线的扁平字符串快照（内核之外的明确一小块） */
  private pristineSnapshot = new Map<string, string>()
  private _dirty = false

  /** 编译缓存（schema/uiSchema 身份变化才重编译） */
  private compiled: CompileResult | null = null
  private compiledKey: string | null = null
  /** 上次渲染所用的结构键（决定是否需要重建 DOM，避免属性微调抖掉焦点） */
  private renderedKey: string | null = null
  /** 上次重建时的初始值通道身份（仅当它变化时，初始值才允许覆盖快照里的用户编辑） */
  private renderedInitialKey: string | null = null
  /** 渲染态：表格单元格抑制自身标签（列头已承载标签与必填标记） */
  private suppressCellLabels = false

  private engine: ReactionEngine | null = null
  private effects = new Map<string, ReactionEffects>()
  private nodeByKey = new Map<string, PlanNode>()
  /** 异步选项：路径级请求序号（晚到响应丢弃） + 代次（卸载/重连后一律丢弃） */
  private optionSeq = new Map<string, number>()
  private optionGeneration = 0
  /** 重建期间去重：同名 + 同路径 + 同依赖值的请求复用同一 Promise */
  private optionPending = new Map<string, Promise<unknown[]>>()
  private optionErrors = new Set<string>()
  /** bind() 的清理函数是否已登记（重连再 bind 时不重复登记，避免 cleanupFns 无限增长） */
  private bindCleanupRegistered = false
  /** 数组元素 → 具体路径（根数组 `users`，嵌套 `users.0.matrix`） */
  private arrayPathOf = new WeakMap<Element, string>()
  private arrayErrorPaths = new Set<string>()
  /** 卸载占位（保持文档序，复显时插回原位） */
  private placeholders = new WeakMap<Element, Comment>()
  /** 已卸载（不在文档）的字段：可见性回转时按效果复显 */
  private unmountedFields = new Set<HTMLElement>()

  // ---------- property 通道 ----------

  get schema(): unknown {
    return this._schemaProp !== null && this.getAttribute('schema') === this._schemaPropAttr
      ? this._schemaProp
      : this.parseJsonAttr(this.getAttribute('schema'))
  }
  set schema(value: unknown) {
    if (typeof value === 'string') {
      this.setAttribute('schema', value)
      return
    }
    this._schemaProp = value
    this._schemaPropAttr = this.getAttribute('schema')
    this._schemaVersion += 1
    if (this.hasRendered) this.update()
  }

  get uiSchema(): unknown {
    return this._uiSchemaProp !== null && this.getAttribute('ui-schema') === this._uiPropAttr
      ? this._uiSchemaProp
      : this.parseJsonAttr(this.getAttribute('ui-schema'))
  }
  set uiSchema(value: unknown) {
    if (typeof value === 'string') {
      this.setAttribute('ui-schema', value)
      return
    }
    this._uiSchemaProp = value
    this._uiPropAttr = this.getAttribute('ui-schema')
    this._uiVersion += 1
    if (this.hasRendered) this.update()
  }

  /** 非受控一次性基线（schema default 兜底合并；宿主值优先） */
  get initialValues(): Record<string, unknown> {
    return this._initialProp !== null && this.getAttribute('initial-values') === this._initialPropAttr
      ? this._initialProp
      : this.parseObjectAttr(this.getAttribute('initial-values'))
  }
  set initialValues(value: Record<string, unknown> | string) {
    if (typeof value === 'string') {
      this.setAttribute('initial-values', value)
      return
    }
    this._initialProp = value
    this._initialPropAttr = this.getAttribute('initial-values')
    this._initialVersion += 1
    if (this.hasRendered) this.update()
  }

  /**
   * 受控值（V1b）：property（对象）+ attribute（JSON 字符串）双通道。
   *
   * 受控模式下本属性是字段值来源：挂载时作为基线，之后每次变化按**叶子路径 diff 写**
   * （只写变化路径，不重建 DOM、不打断焦点）；值树在**恰为已渲染字段名**的节点整值下发
   * （数组值字段如 `array of enum` → `oas-checkbox-group` 宿主写 `['a','b']` 即整写；
   * 对象数组容器键照常下钻到行字段）；宿主写不派发 `oas-values-change`（防回环）。
   * 与 `initialValues` 同时提供时 `values` 优先（受控覆盖非受控基线）。
   */
  get values(): Record<string, unknown> {
    if (this._valuesProp !== null && this.getAttribute('values') === this._valuesPropAttr) return this._valuesProp
    return this.parseObjectAttr(this.getAttribute('values'))
  }
  set values(value: Record<string, unknown> | string) {
    if (typeof value === 'string') {
      this.setAttribute('values', value)
      return
    }
    this._valuesProp = value
    this._valuesPropAttr = this.getAttribute('values')
    this._valuesVersion += 1
    if (this.hasRendered) this.update()
  }

  private parseJsonAttr(raw: string | null): unknown {
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  private parseObjectAttr(raw: string | null): Record<string, unknown> {
    const parsed = this.parseJsonAttr(raw)
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  }

  // ---------- 骨架 ----------

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <oas-form part="form" novalidate>
        <div class="body" part="body"></div>
      </oas-form>
      <div class="empty" part="empty" role="status" hidden></div>
    `
  }

  /** 缓存节点引用 + 绑定值变化/数组增删（render / 水合 / 重连路径共用，幂等） */
  private bind(): void {
    this.formEl = this.shadow.querySelector('oas-form')
    this.bodyEl = this.shadow.querySelector('.body')
    this.emptyEl = this.shadow.querySelector('.empty')
    const form = this.formEl
    if (!form) return
    // 处理器用实例字段（稳定引用）：重连再次 bind 时 addEventListener 按「同 target 同 handler」去重，
    // 不会叠出双份联动/数组增删刷新
    form.addEventListener('oas-values-change', this.handleValuesEvent)
    form.addEventListener('oas-add', this.handleArrayMutationEvent)
    form.addEventListener('oas-remove', this.handleArrayMutationEvent)
    form.addEventListener('oas-duplicate', this.handleArrayMutationEvent)
    form.addEventListener('oas-move', this.handleArrayMutationEvent)
    // 出向变换：提交 / 校验失败载荷就地改写（内层监听 → 先于宿主拿到事件）
    form.addEventListener('oas-submit', this.handleOutboundEvent)
    form.addEventListener('oas-validate-fail', this.handleOutboundEvent)
    if (this.bindCleanupRegistered) return
    this.bindCleanupRegistered = true
    this.onCleanup(() => {
      this.bindCleanupRegistered = false
      form.removeEventListener('oas-values-change', this.handleValuesEvent)
      form.removeEventListener('oas-add', this.handleArrayMutationEvent)
      form.removeEventListener('oas-remove', this.handleArrayMutationEvent)
      form.removeEventListener('oas-duplicate', this.handleArrayMutationEvent)
      form.removeEventListener('oas-move', this.handleArrayMutationEvent)
      form.removeEventListener('oas-submit', this.handleOutboundEvent)
      form.removeEventListener('oas-validate-fail', this.handleOutboundEvent)
      this.optionGeneration += 1
    })
  }

  private readonly handleValuesEvent = (event: Event): void => {
    this.onValuesChange(event)
    this.rewriteEventOutbound(event)
  }
  private readonly handleArrayMutationEvent = (event: Event): void => this.onArrayMutation(event)
  private readonly handleOutboundEvent = (event: Event): void => this.rewriteEventOutbound(event)

  /** 断开重连：cleanup 已摘除监听 → 重绑（否则联动求值与数组增删刷新永久失效） */
  protected override onReconnect(): void {
    this.bind()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照骨架后接管，内容由 update 重建（与 SSR 输出同构） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('oas-form')) return false
    if (!this.shadow.querySelector('.body')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.forwardFormAttributes()
    const compiled = this.compile()
    if (!compiled) return
    const key = this.structureKey()
    if (key !== this.renderedKey) {
      // 受控 values 与结构变化同时到达：行数以宿主值为准（行数快照会让「初始 1 行 / 值 3 行」错配）
      const valuesChanged = this.appliedValuesKey !== null && this.valuesKey() !== this.appliedValuesKey
      this.renderedKey = key
      this.appliedValuesKey = this.valuesKey()
      this.rebuild({ restoreRows: !valuesChanged })
    } else {
      this.indexArrayNodes()
      this.syncArrayStates()
      // 受控 values 变化：按叶子 diff 写（不重建 DOM、不打断焦点）
      if (this.valuesKey() !== this.appliedValuesKey) {
        this.appliedValuesKey = this.valuesKey()
        this.applyHostValues()
      }
    }
    this.syncEmptyState()
  }

  /** 结构键：schema/uiSchema/initialValues 任一变化即重建 DOM（布局类属性变化不重建） */
  private structureKey(): string {
    return [
      this.getAttribute('schema') ?? '',
      this.getAttribute('ui-schema') ?? '',
      this.initialKey(),
      this._schemaVersion,
      this._uiVersion,
    ].join('\u0000')
  }

  /** 初始值通道身份（attribute 原文 + property 写入次数） */
  private initialKey(): string {
    return `${this.getAttribute('initial-values') ?? ''}\u0000${this._initialVersion}`
  }

  /** 受控值通道身份（attribute 原文 + property 写入次数） */
  private valuesKey(): string {
    return `${this.getAttribute('values') ?? ''}\u0000${this._valuesVersion}`
  }

  /** 宿主是否提供受控值（property 或 attribute 任一在场；空对象也算受控） */
  private hasHostValues(): boolean {
    return this._valuesProp !== null || this.getAttribute('values') !== null
  }

  /** 当前通道基线：受控 values 优先，否则 initialValues */
  private baselineValues(): Record<string, unknown> {
    return this.hasHostValues() ? this.values : this.initialValues
  }

  /** 布局/尺寸等表级属性透传给内层 oas-form（grid span / label-align / 禁用链路复用内核） */
  private forwardFormAttributes(): void {
    const form = this.formEl
    if (!form) return
    for (const name of ['layout', 'label-align', 'label-width', 'size', 'disabled', 'validate-trigger']) {
      const value = this.getAttribute(name)
      if (value === null) form.removeAttribute(name)
      else if (form.getAttribute(name) !== value) form.setAttribute(name, value)
    }
  }

  // ---------- 编译 ----------

  private compile(): CompileResult | null {
    const rawSchema = this.schema
    const rawUi = this.uiSchema
    const key = [
      this.getAttribute('schema') ?? '',
      this.getAttribute('ui-schema') ?? '',
      this._schemaVersion,
      this._uiVersion,
    ].join('\u0000')
    if (this.compiled && this.compiledKey === key) return this.compiled
    const result = compileSchema(rawSchema, rawUi, {
      onWarn: (message) => devWarn(`[oas-schema-form] ${message}`),
    })
    this.compiled = result
    this.compiledKey = key
    this.engine = createReactionEngine(result.plan, result.reactions, {
      onWarn: (message) => devWarn(`[oas-schema-form] ${message}`),
    })
    this.indexPlan()
    return result
  }

  private indexPlan(): void {
    this.nodeByKey.clear()
    const walk = (nodes: PlanNode[]): void => {
      for (const node of nodes) {
        this.nodeByKey.set(node.key, node)
        if (node.kind === 'group') walk(node.children)
        else if (node.kind === 'array') walk(node.children)
        else if (node.kind === 'tabs') for (const tab of node.tabs) walk(tab.children)
      }
    }
    walk(this.compiled?.plan ?? [])
  }

  // ---------- 渲染 ----------

  /**
   * 结构重建：快照当前值 → 重建 DOM → 回填值（结构变化时值不丢）。
   *
   * 行数快照（V2 批 1）：重建前从 DOM 现取各数组的行数，重建后按快照恢复（超出初始长度的行空值填充）。
   * 「不建常驻 map」——断开保留的 DOM 就是快照来源，常驻态只会与 reset / 重连打架。
   * `restoreRows: false` = 忽略快照（reset 行数回初始；受控 values 写入 / 初始值通道变化由 update 传入）。
   */
  private rebuild(options: { restoreRows?: boolean } = {}): void {
    const form = this.formEl
    const body = this.bodyEl
    const compiled = this.compiled
    if (!form || !body || !compiled) return
    const rowCounts = options.restoreRows === false ? null : this.captureRowCounts()
    const snapshot = form.getValues()
    // 初始值通道是否变化决定「initial 胜还是快照胜」：只有宿主改写 initialValues 时才允许
    // 用初始值覆盖快照——schema/uiSchema 等其它结构变化触发的重建必须保留用户编辑。
    // 受控 values 模式下宿主值恒为来源（每次重建都以它为准）。
    const controlled = this.hasHostValues()
    const initialKey = this.initialKey()
    const initialChanged = this.renderedInitialKey !== null && this.renderedInitialKey !== initialKey
    this.renderedInitialKey = initialKey
    body.textContent = ''
    this.unmountedFields.clear()
    this.arrayErrorPaths.clear()
    this.arrayPathOf = new WeakMap()
    if (compiled.error) {
      form.rules = {}
      this.syncEmptyState()
      return
    }
    for (const node of compiled.plan) body.appendChild(this.renderNode(node))
    // 基线 = schema default ← 宿主通道（受控 values 优先，否则 initialValues）
    const merged = mergeDeep(
      cloneJson(compiled.defaults) as Record<string, unknown>,
      this.convertInbound(this.baselineValues()),
    )
    form.initialValues = merged
    // 行数：初始数组长度 ∪ 结构重建行数快照（initialChanged 时快照作废，交给初始值）
    this.syncArrayRows(merged, initialChanged ? null : rowCounts)
    form.reapplyInitialValues()
    this.applySnapshotValues(snapshot, merged, controlled || initialChanged)
    this.appliedValues = controlled ? (cloneJson(this.values) as Record<string, unknown>) : null
    this.pristineSnapshot = new Map(flattenValues(this.kernelValues()))
    this.syncDirty()
    this.syncRules()
    this.evaluateEffects()
    this.syncArrayStates()
    // 异步选项源：结构重建后统一加载（同一轮内重复请求按去重键合并）
    this.loadAllOptionSources()
  }

  /** 结构重建行数快照：当前 DOM 各数组（具体路径）的行数 */
  private captureRowCounts(): Map<string, number> {
    const counts = new Map<string, number>()
    this.indexArrayNodes()
    for (const [element, path] of this.arrayNodes()) {
      counts.set(path, element.querySelectorAll(':scope > [data-oas-form-list-item]').length)
    }
    return counts
  }

  private renderNode(node: PlanNode): HTMLElement {
    if (node.kind === 'field') return this.renderField(node)
    if (node.kind === 'group') return this.renderGroup(node)
    if (node.kind === 'array') return this.renderArray(node)
    return this.renderTabs(node)
  }

  private renderField(node: FieldPlan): HTMLElement {
    const item = document.createElement('oas-form-item')
    item.setAttribute('data-schema-key', node.key)
    // 表格单元格：列头已承载标签与必填标记，单元格自身不重复渲染（含必填星号）
    if (this.suppressCellLabels) {
      item.setAttribute('data-schema-cell', '')
    } else {
      item.setAttribute('label', node.label)
      if (node.staticRequired) item.setAttribute('required', '')
    }
    if (node.help) item.setAttribute('help', node.help)
    if (node.span) item.setAttribute('span', String(node.span))
    if (node.staticRequired) item.setAttribute('required', '')
    const widget = document.createElement(node.widget.tag)
    widget.setAttribute('data-schema-widget', node.name)
    widget.setAttribute('name', node.name)
    for (const [key, value] of Object.entries(node.widget.props)) widget.setAttribute(key, value)
    item.appendChild(widget)
    return item
  }

  private renderGroup(node: GroupPlan): HTMLElement {
    const el = document.createElement('div')
    el.className = 'group'
    el.setAttribute('part', 'group')
    el.setAttribute('data-schema-key', node.key)
    if (node.span) el.style.gridColumn = `span ${node.span}`
    const title = document.createElement('div')
    title.className = 'group-title'
    title.setAttribute('part', 'group-title')
    title.textContent = node.label
    title.hidden = node.label === ''
    el.appendChild(title)
    for (const child of node.children) el.appendChild(this.renderNode(child))
    return el
  }

  private renderTabs(node: TabsPlan): HTMLElement {
    const el = document.createElement('div')
    el.className = 'tabs'
    el.setAttribute('part', 'tabs')
    el.setAttribute('data-schema-key', node.key)
    if (node.span) el.style.gridColumn = `span ${node.span}`
    if (node.label !== '') {
      const title = document.createElement('div')
      title.className = 'tabs-title'
      title.setAttribute('part', 'tabs-title')
      title.textContent = node.label
      el.appendChild(title)
    }
    const list = document.createElement('div')
    list.className = 'tablist'
    list.setAttribute('part', 'tablist')
    list.setAttribute('role', 'tablist')
    list.setAttribute('aria-label', node.label || this.t('schemaForm.tabsLabel'))
    const panels = document.createElement('div')
    panels.className = 'panels'
    const baseId = stableHash36(node.key)
    const activeKey = node.tabs[0]?.key ?? ''
    let activeIndex = 0
    node.tabs.forEach((tab, index) => {
      const tabId = `oas-schema-tab-${baseId}-${index}`
      const panelId = `oas-schema-panel-${baseId}-${index}`
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'tab'
      button.setAttribute('part', 'tab')
      button.setAttribute('role', 'tab')
      button.id = tabId
      button.setAttribute('aria-controls', panelId)
      button.setAttribute('aria-selected', String(tab.key === activeKey))
      button.tabIndex = tab.key === activeKey ? 0 : -1
      button.textContent = tab.title
      button.addEventListener('click', () => {
        activeIndex = index
        this.activateTab(el, node, activeIndex)
      })
      list.appendChild(button)

      const panel = document.createElement('div')
      panel.className = 'tabpanel'
      panel.setAttribute('part', 'tabpanel')
      panel.setAttribute('role', 'tabpanel')
      panel.id = panelId
      panel.setAttribute('aria-labelledby', tabId)
      panel.hidden = tab.key !== activeKey
      panel.setAttribute('data-tab-index', String(index))
      for (const child of tab.children) panel.appendChild(this.renderNode(child))
      panels.appendChild(panel)
    })
    // 方向键 / Home / End 切页（Enter/Space 由原生 button 承担）
    list.addEventListener('keydown', (event) => {
      const e = event as KeyboardEvent
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
      const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      if (buttons.length === 0) return
      e.preventDefault()
      const current = buttons.findIndex((button) => button.getAttribute('aria-selected') === 'true')
      let next = current < 0 ? 0 : current
      if (e.key === 'Home') next = 0
      else if (e.key === 'End') next = buttons.length - 1
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (next + 1) % buttons.length
      else next = (next - 1 + buttons.length) % buttons.length
      this.activateTab(el, node, next)
      buttons[next]?.focus()
    })
    el.appendChild(list)
    el.appendChild(panels)
    return el
  }

  /** 切换标签页（面板常驻不卸载，值不丢；读屏 aria 同步） */
  private activateTab(container: HTMLElement, node: TabsPlan, index: number): void {
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index))
      button.tabIndex = i === index ? 0 : -1
    })
    for (const panel of container.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
      panel.hidden = panel.getAttribute('data-tab-index') !== String(index)
    }
    void node
  }

  private renderArray(node: ArrayPlan): HTMLElement {
    const container = document.createElement('div')
    container.className = 'array'
    container.setAttribute('part', 'array')
    container.setAttribute('data-schema-key', node.key)
    if (node.span) container.style.gridColumn = `span ${node.span}`
    const title = document.createElement('div')
    title.className = 'array-title'
    title.setAttribute('part', 'array-title')
    title.textContent = node.label
    title.hidden = node.label === ''
    container.appendChild(title)

    // 空态提示放在列表之前：列表的「添加一项」按钮在其下方，文案里的方向词才成立。
    // 表格自带表体空态（role=row 占位），不再叠一层文案。
    if (node.table !== true) {
      const empty = document.createElement('div')
      empty.className = 'array-empty'
      empty.setAttribute('part', 'array-empty')
      empty.textContent = this.t('schemaForm.emptyArray')
      container.appendChild(empty)
    }

    const list = document.createElement(node.table === true ? 'oas-array-table' : 'oas-form-list')
    list.setAttribute('part', 'list')
    list.setAttribute('data-schema-array-key', node.key)
    list.setAttribute('name', node.name)
    // 增删按钮可访问名走 schemaForm.*（i18n），由容器的可选属性承接
    list.setAttribute('add-text', this.t(node.table === true ? 'schemaForm.rowAdd' : 'schemaForm.addItem'))
    list.setAttribute('remove-text', this.t(node.table === true ? 'schemaForm.rowRemove' : 'schemaForm.removeItem'))
    // 行操作三钮（复制 / 上移 / 下移）：两种容器同一套语义
    list.setAttribute('duplicate-text', this.t('schemaForm.rowDuplicate'))
    list.setAttribute('move-up-text', this.t('schemaForm.rowUp'))
    list.setAttribute('move-down-text', this.t('schemaForm.rowDown'))
    if (node.table === true) {
      list.setAttribute('label', node.label)
      list.setAttribute('columns', JSON.stringify(node.columns ?? []))
    }
    // 行模板：行内字段裸名（form-list 自动加前缀）；嵌套数组名带 {index}（外层替换）。
    // 表格单元格不渲染自己的标签（列头已承载），必填标记转到列头 `*`
    const template = document.createElement('template')
    const previousSuppress = this.suppressCellLabels
    this.suppressCellLabels = node.table === true
    try {
      for (const child of node.children) template.content.appendChild(this.renderNode(child))
    } finally {
      this.suppressCellLabels = previousSuppress
    }
    list.appendChild(template)
    container.appendChild(list)

    const error = document.createElement('div')
    error.className = 'array-error'
    error.setAttribute('part', 'array-error')
    error.setAttribute('role', 'alert')
    error.hidden = true
    container.appendChild(error)
    return container
  }

  /** 空数组提示显隐（零行时非空白渲染） */
  private syncArrayStates(): void {
    if (!this.bodyEl) return
    for (const list of this.bodyEl.querySelectorAll<HTMLElement>('[data-schema-array-key]')) {
      const container = list.parentElement
      const empty = container?.querySelector<HTMLElement>(':scope > [part="array-empty"]')
      if (!empty) continue
      const rows = list.querySelectorAll(':scope > [data-oas-form-list-item]').length
      empty.hidden = rows > 0
    }
  }

  // ---------- 内核原始值 / 值变换双钩子（V2 批 2）----------

  /** 内核原始值（字符串语义；值变换的出向改写不落在这里） */
  private kernelValues(): Record<string, unknown> {
    return this.formEl?.getValues() ?? {}
  }

  /** 编译产物里是否有该方向的钩子（无钩子时零开销短路） */
  private hasHook(kind: 'convert' | 'transform'): boolean {
    const plans = this.compiled?.transforms
    if (!plans || plans.length === 0) return false
    return plans.some((plan) => (kind === 'convert' ? plan.convert : plan.transform) !== undefined)
  }

  /** 具体路径命中的钩子（通配路径按 pathPatternMatches 匹配；后定义者覆盖先定义者） */
  private hookFor(path: string, kind: 'convert' | 'transform'): ValueHook | null {
    const plans = this.compiled?.transforms
    if (!plans || plans.length === 0) return null
    let name: string | undefined
    for (const plan of plans) {
      if (!pathPatternMatches(plan.path, path)) continue
      const candidate = kind === 'convert' ? plan.convert : plan.transform
      if (candidate !== undefined) name = candidate
    }
    if (name === undefined) return null
    return kind === 'convert' ? getConverter(name) : getTransformer(name)
  }

  /** 钩子调用：空串 / 缺省不调用（防 `moneyToCents(undefined)` 之类得出 NaN）；抛错回落恒等 */
  private runHook(hook: ValueHook, value: unknown, path: string, whole: Record<string, unknown>): unknown {
    if (value === undefined || value === '') return value
    try {
      return hook(value, path, whole)
    } catch (error) {
      devWarn(`[oas-schema-form] 值变换钩子执行失败（${path}）：${String(error)}，已按恒等回落`)
      return value
    }
  }

  /**
   * 按编译产物把钩子应用到整棵值树：**在字段路径处整值替换并停止下钻**（convert/transform 的
   * 输出即该字段的组件值，继续下钻会把结果当容器再拆），其余节点递归。
   */
  private mapHookValues(
    tree: Record<string, unknown>,
    kind: 'convert' | 'transform',
    whole: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!this.hasHook(kind)) return tree
    const walk = (value: unknown, path: string): unknown => {
      if (path !== '') {
        const hook = this.hookFor(path, kind)
        if (hook) return this.runHook(hook, value, path, whole)
      }
      if (Array.isArray(value)) {
        return value.map((item, index) => walk(item, `${path === '' ? '' : `${path}.`}${index}`))
      }
      if (isPlainObject(value)) {
        const out: Record<string, unknown> = {}
        for (const [key, child] of Object.entries(value)) {
          if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
          out[key] = walk(child, path === '' ? key : `${path}.${key}`)
        }
        return out
      }
      return value
    }
    const result = walk(tree, '')
    return isPlainObject(result) ? result : tree
  }

  /** 入向：宿主值 → 组件值（initialValues 回填、受控 values、setValues） */
  private convertInbound(values: Record<string, unknown>): Record<string, unknown> {
    return this.mapHookValues(values, 'convert', values)
  }

  /** 出向：组件值 → 宿主值（事件载荷与公开 getValues） */
  private transformOutbound(values: Record<string, unknown>): Record<string, unknown> {
    return this.mapHookValues(values, 'transform', values)
  }

  /** 事件载荷就地改写（冒泡顺序先于宿主、target 不变、不停冒泡） */
  private rewriteEventOutbound(event: Event): void {
    if (!this.hasHook('transform')) return
    const detail = (event as CustomEvent<Record<string, unknown>>).detail
    if (!detail || typeof detail !== 'object') return
    const raw = this.kernelValues()
    if ('values' in detail) detail.values = this.transformOutbound(raw)
    if (typeof detail.name === 'string' && 'value' in detail) {
      const hook = this.hookFor(detail.name, 'transform')
      if (hook) detail.value = this.runHook(hook, detail.value, detail.name, raw)
    }
  }

  /** 单叶子入向换算（受控 diff 写用；通配路径命中） */
  private convertLeaf(path: string, value: unknown, whole: Record<string, unknown>): unknown {
    const hook = this.hookFor(path, 'convert')
    return hook ? this.runHook(hook, value, path, whole) : value
  }

  // ---------- 异步选项源（V2 批 2 窄面）----------

  /** 已渲染且声明了 `options.source` 的字段（[控件, 计划, 具体路径]） */
  private *optionBindings(): Generator<[HTMLElement, FieldPlan, string]> {
    if (!this.bodyEl) return
    for (const element of this.bodyEl.querySelectorAll<HTMLElement>('[data-schema-key]')) {
      const node = this.nodeByKey.get(element.getAttribute('data-schema-key') ?? '')
      if (!node || node.kind !== 'field' || !node.optionsSource) continue
      const widget = element.querySelector<HTMLElement>('[data-schema-widget]')
      const name = widget?.getAttribute('name') ?? ''
      if (!widget || name === '') continue
      yield [widget, node, name]
    }
  }

  /** 依赖值快照（去重键用） */
  private depValuesKey(deps: string[]): string {
    const values = this.projectedValues()
    return JSON.stringify(
      deps.map((dep) => {
        const path = parseDslPath(dep)
        return path === null ? undefined : readPath(values, path)
      }),
    )
  }

  /** 加载全部选项源（结构重建后调用；同一轮内的重复请求按去重键合并） */
  private loadAllOptionSources(): void {
    for (const [widget, node, path] of this.optionBindings()) void this.loadOptions(widget, node, path)
  }

  /** 依赖变化触发的重载（A 变 → 重载 B 的选项） */
  private reloadOptionDependents(changedName: string): void {
    for (const [widget, node, path] of this.optionBindings()) {
      const deps = node.optionsSource?.deps ?? []
      if (!deps.some((dep) => pathDependencyMatches(dep, changedName))) continue
      void this.loadOptions(widget, node, path)
    }
  }

  /**
   * 加载单个字段的异步选项。
   *
   * 竞态口径（设计稿 v2）：**seq 序号守卫**（晚到响应丢弃）+ **重建期间去重**（同名/同路径/同依赖值
   * 复用同一 Promise，避免结构重建抖出重复请求）+ **卸载后丢弃**（代次 + `isConnected`）。
   * 失败态 = 控件下方状态块（错误文案 + 重试按钮，i18n）；空结果 = 空态文案。
   */
  private async loadOptions(widget: HTMLElement, node: FieldPlan, path: string, force = false): Promise<void> {
    const source = node.optionsSource
    if (!source) return
    const seq = (this.optionSeq.get(path) ?? 0) + 1
    this.optionSeq.set(path, seq)
    const generation = this.optionGeneration
    this.setOptionsLoading(widget, true)
    const key = `${source.name}\u0000${path}\u0000${this.depValuesKey(source.deps)}`
    let options: unknown[] = []
    let failed = false
    try {
      const fn = getOptionSource(source.name)
      if (!fn) throw new Error(`options.source "${source.name}" 未注册`)
      let pending = force ? undefined : this.optionPending.get(key)
      if (!pending) {
        pending = Promise.resolve(fn(this.projectedValues(), path))
        this.optionPending.set(key, pending)
        const cleanup = (): void => {
          this.optionPending.delete(key)
        }
        pending.then(cleanup, cleanup)
      }
      const loaded = await pending
      options = Array.isArray(loaded) ? loaded : []
    } catch (error) {
      failed = true
      devWarn(`[oas-schema-form] 选项源 "${source.name}" 加载失败（${path}）：${String(error)}`)
    }
    // 竞态守卫：代次变化（卸载/重连）、序号被后续请求顶替、控件已离场 → 丢弃本次结果
    if (generation !== this.optionGeneration || this.optionSeq.get(path) !== seq || !widget.isConnected) return
    this.setOptionsLoading(widget, false)
    if (failed) {
      this.optionErrors.add(path)
      this.renderOptionsStatus(widget, path, 'error')
      return
    }
    this.optionErrors.delete(path)
    widget.setAttribute('options', JSON.stringify(options))
    this.renderOptionsStatus(widget, path, options.length === 0 ? 'empty' : null)
  }

  /** loading 态承载：select 沿用自身 loading（带 i18n 文案），单选/多选组新增 loading 布尔属性 */
  private setOptionsLoading(widget: HTMLElement, loading: boolean): void {
    const tag = widget.tagName.toLowerCase()
    if (tag === 'oas-select') {
      if (loading) {
        widget.setAttribute('loading-text', this.t('schemaForm.optionsLoading'))
        widget.setAttribute('loading', '')
      } else {
        widget.removeAttribute('loading')
      }
      return
    }
    if (tag === 'oas-radio-group' || tag === 'oas-checkbox-group') {
      widget.toggleAttribute('loading', loading)
    }
  }

  /** 选项状态块（失败 / 空态；加载中由控件自身 loading 承载）：挂在控件所在 form-item 内 */
  private renderOptionsStatus(widget: HTMLElement, path: string, state: 'error' | 'empty' | null): void {
    const item = widget.closest('oas-form-item')
    if (!item) return
    let box = item.querySelector<HTMLElement>(':scope > [part="options-status"]')
    if (state === null) {
      box?.remove()
      return
    }
    if (!box) {
      box = document.createElement('div')
      box.className = 'options-status'
      box.setAttribute('part', 'options-status')
      item.appendChild(box)
    }
    box.textContent = ''
    if (state === 'empty') {
      box.setAttribute('role', 'status')
      box.textContent = this.t('schemaForm.optionsEmpty')
      return
    }
    box.setAttribute('role', 'alert')
    const message = document.createElement('span')
    message.className = 'options-status-message'
    message.textContent = this.t('schemaForm.optionsFailed')
    const hint = document.createElement('span')
    hint.className = 'options-status-hint'
    hint.textContent = this.t('schemaForm.optionsFailedHint')
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'options-retry'
    retry.setAttribute('part', 'options-retry')
    retry.textContent = this.t('schemaForm.optionsRetry')
    retry.addEventListener('click', () => this.reloadOptions(path))
    box.appendChild(message)
    box.appendChild(hint)
    box.appendChild(retry)
  }

  /**
   * 按数组长度 + 结构重建行数快照设置 `rows`（逐层；嵌套数组随外层行展开）：
   * 目标行数 = max(初始数组长度, 快照行数)。`min` 不再由本组件下发——删行下界归容器（默认 0），
   * `minItems` 违规交给数组级校验报错，不再被「唯一行删不掉」锁住。
   */
  private syncArrayRows(initial: Record<string, unknown>, rowCounts: Map<string, number> | null): void {
    for (let pass = 0; pass < 4; pass++) {
      this.indexArrayNodes()
      let changed = false
      for (const [element, path] of this.arrayNodes()) {
        if (!element.isConnected) continue
        const value = readPath(initial, parseDslPath(path) ?? [])
        const length = Array.isArray(value) ? value.length : 0
        const target = Math.max(length, rowCounts?.get(path) ?? 0)
        if (element.getAttribute('rows') !== String(target)) {
          element.setAttribute('rows', String(target))
          changed = true
        }
      }
      if (!changed) break
    }
  }

  /** 当前 DOM 中的数组元素与具体路径（嵌套数组按外层行号展开） */
  private *arrayNodes(): Generator<[HTMLElement, string]> {
    if (!this.bodyEl) return
    for (const element of this.bodyEl.querySelectorAll<HTMLElement>('[data-schema-array-key]')) {
      const path = this.arrayPathOf.get(element)
      if (path) yield [element, path]
    }
  }

  /** 数组路径索引（先外层后内层：嵌套数组依赖外层行号） */
  private indexArrayNodes(): void {
    if (!this.bodyEl) return
    const visit = (list: HTMLElement, prefix: string): void => {
      const key = list.getAttribute('data-schema-array-key') ?? ''
      const node = this.nodeByKey.get(key)
      if (!node || node.kind !== 'array') return
      const relative = node.name.replace(/\.\{index\}$/, '')
      const path = prefix === '' ? relative : `${prefix}.${relative}`
      this.arrayPathOf.set(list, path)
      const wrappers = Array.from(list.querySelectorAll(':scope > [data-oas-form-list-item]'))
      wrappers.forEach((wrapper, index) => {
        for (const child of wrapper.querySelectorAll<HTMLElement>('[data-schema-array-key]')) {
          const nearest = child.parentElement?.closest('[data-oas-form-list-item]')
          if (nearest !== wrapper) continue
          visit(child, `${path}.${index}`)
        }
      })
    }
    for (const top of this.bodyEl.querySelectorAll<HTMLElement>('[data-schema-array-key]')) {
      // 顶层数组：不在任何行内（嵌套数组由 visit 递归处理）
      if (top.parentElement?.closest('[data-oas-form-list-item]')) continue
      visit(top, '')
    }
  }

  /** 行内元素的具体路径（外层行号 + 相对名） */
  private rowPathOf(wrapper: Element): string | null {
    const list = wrapper.parentElement
    if (!list) return null
    const listPath = this.arrayPathOf.get(list)
    if (!listPath) return null
    const wrappers = Array.from(list.querySelectorAll(':scope > [data-oas-form-list-item]'))
    const index = wrappers.indexOf(wrapper as HTMLElement)
    return index < 0 ? null : `${listPath}.${index}`
  }

  /** 元素具体路径：行内字段/容器按外层行号展开 */
  private concretePathOf(element: Element, node: PlanNode): string {
    const wrapper = element.closest('[data-oas-form-list-item]')
    if (!wrapper) return node.path
    const rowPath = this.rowPathOf(wrapper)
    if (!rowPath) return node.path
    // 相对名：节点绝对通配路径去掉最后一个数组通配之前的部分
    const segments = parseDslPath(node.path)
    if (segments === null) return node.path
    const lastWildcard = segments.lastIndexOf('[]')
    const relative = segments.slice(lastWildcard + 1).join('.')
    return relative === '' ? rowPath : `${rowPath}.${relative}`
  }

  /**
   * 回填快照值（结构重建后已填值不丢）：空值与「本次由 initialValues 变化覆盖的路径」不再回填。
   *
   * `initialWins` 仅在初始值通道本次发生变化时为 true——结构键的其它部分（schema / uiSchema）
   * 变化触发的重建必须让快照（用户编辑）胜过 initialValues，否则加一个无关字段就会把用户
   * 已改的字段回压成初始值。
   */
  private applySnapshotValues(
    snapshot: Record<string, unknown>,
    initial: Record<string, unknown>,
    initialWins: boolean,
  ): void {
    const form = this.formEl
    if (!form) return
    for (const [name, raw] of flattenValues(snapshot)) {
      // 空串 = 字段未编辑（fresh 状态），不回填（否则会把新写入的初始值覆盖成空）
      if (raw === '') continue
      // 初始值通道本次变化：显式覆盖的路径以初始值为准（初始值变化触发重建时快照不能回压）
      if (initialWins) {
        const path = parseDslPath(name)
        if (path !== null && readPath(initial, path) !== undefined) continue
      }
      // 属性选择器转义：路径里的 `\` 与 `"` 都可能出现（自定义 widget 的 name），
      // 只转义引号会让反斜杠逃出字符串边界、选择器解析失败或误匹配（先转义反斜杠）
      const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const element = form.querySelector<HTMLElement>(`[name="${escaped}"]`)
      if (!element) continue
      // upload 的读值是「派生只读汇总」（仅 File 元数据，文件体不可序列化）：回填无法还原文件，
      // 只会把 initial-values 刚恢复的回显记录清空——与内核 NO_WRITEBACK_CONTROLS 同判据，跳过
      if (element.tagName.toLowerCase() === 'oas-upload') continue
      this.writeWidgetValue(element, raw)
    }
  }

  /**
   * 控件写值：优先走 form 内核 writer 注册表（`model-value` 通道 / checked 态 / property setter /
   * 宿主自定义 writer 都只有这条通道能落值），取不到 writer 才回落 `setAttribute('value')`。
   * 直接 setAttribute 会让自定义 writer 件在结构重建时静默回退初始值。
   */
  private writeWidgetValue(element: HTMLElement, value: string): void {
    if (writeFormControlValue(element, value)) return
    element.setAttribute('value', value)
  }

  // ---------- 受控值（V1b）----------

  /**
   * 宿主 values 变化：只写**变化叶子**（diff 写），数组先按长度补行再写。
   * 写入期间置来源标记：程序化写不产生字段编辑事件，若未来控件补发事件也不会被当成用户编辑。
   */
  private applyHostValues(): void {
    const form = this.formEl
    const compiled = this.compiled
    if (!form || !compiled || compiled.error) return
    const nextAll = this.values
    const prevAll = this.appliedValues ?? {}
    const patch: Record<string, unknown> = {}
    let changed = false
    // 已渲染字段名：值树在**恰为该字段名**的节点上整值下发（不拍平成下标叶子）。
    // 标量数组字段（array of enum → oas-checkbox-group 单字段 `tags`）宿主写
    // `{ tags: ['a'] }` 时按 `tags` 整写；对象数组的容器键（`users`）不在字段表内，
    // 照常下钻到行字段 `users.0.nick`。
    const rendered = new Set(flattenValues(form.getValues()).map(([path]) => path))
    const current = new Map(flattenRawValues(nextAll, '', rendered))
    const previous = new Map(flattenRawValues(prevAll, '', rendered))
    for (const [path, value] of current) {
      const before = previous.get(path)
      if (before !== undefined && String(before) === String(value)) continue
      // 入向换算在「写入组件前」一步发生：宿主原始值 → 组件值
      setLeaf(patch, path.split('.'), this.convertLeaf(path, value, nextAll))
      changed = true
    }
    // 宿主删除键：清空对应字段（受控模式下「消失」等价于清空，而不是保留旧值）
    for (const path of previous.keys()) {
      if (current.has(path)) continue
      setLeaf(patch, path.split('.'), null)
      changed = true
    }
    this.applyingHostValues = true
    try {
      this.syncHostArrayRows(nextAll)
      if (changed) form.setValues(patch)
      this.appliedValues = cloneJson(nextAll) as Record<string, unknown>
    } finally {
      this.applyingHostValues = false
    }
    this.indexArrayNodes()
    this.syncRules()
    this.syncArrayStates()
    this.evaluateEffects()
    this.syncDirty()
  }

  /** 受控数组按长度收敛行数（增补空行 / 删除多余行：宿主删行留空行的缺陷同批修） */
  private syncHostArrayRows(values: Record<string, unknown>): void {
    for (let pass = 0; pass < 4; pass++) {
      this.indexArrayNodes()
      let changed = false
      for (const [element, path] of this.arrayNodes()) {
        if (!element.isConnected) continue
        const value = readPath(values, parseDslPath(path) ?? [])
        if (!Array.isArray(value)) continue
        const target = value.length
        if (element.getAttribute('rows') !== String(target)) element.setAttribute('rows', String(target))
        const before = element.querySelectorAll(':scope > [data-oas-form-list-item]').length
        const sized = element as HTMLElement & { setRowCount?: (count: number) => void }
        sized.setRowCount?.(target)
        const after = element.querySelectorAll(':scope > [data-oas-form-list-item]').length
        if (after !== before) changed = true
      }
      if (!changed) break
    }
  }

  /** 脏态：当前值扁平快照 vs 挂载基线（内核之外的一小块自持状态） */
  private syncDirty(): void {
    const now = new Map(flattenValues(this.kernelValues()))
    let dirty = now.size !== this.pristineSnapshot.size
    if (!dirty) {
      for (const [path, value] of now) {
        if (this.pristineSnapshot.get(path) !== value) {
          dirty = true
          break
        }
      }
    }
    this._dirty = dirty
  }

  /** 是否与挂载基线不同（受控模式下基线 = 宿主 values） */
  get dirty(): boolean {
    return this._dirty
  }

  // ---------- 联动求值与效果应用 ----------

  private rootSchemaValue(): unknown {
    return this.schema
  }

  private projectedValues(): Record<string, unknown> {
    const raw = this.formEl?.getValues() ?? {}
    const schema = this.rootSchemaValue()
    const projected = schema && typeof schema === 'object' ? projectValues(schema, raw) : raw
    return projected !== null && typeof projected === 'object' && !Array.isArray(projected)
      ? (projected as Record<string, unknown>)
      : {}
  }

  /** 全量求值并应用（首帧 / 结构重建 / 校验后） */
  private evaluateEffects(): void {
    const engine = this.engine
    if (!engine || !this.compiled || this.compiled.error) return
    this.effects = engine.evaluate(this.projectedValues())
    this.applyEffects()
  }

  /** 值变化：依赖图命中才重算（未命中不刷新视觉） */
  private onValuesChange(event: Event): void {
    const detail = (event as CustomEvent<{ name?: unknown }>).detail
    const name = detail?.name
    const engine = this.engine
    if (!engine || typeof name !== 'string') return
    // 宿主写入期间的合成事件按来源标记跳过（宿主写不回派事件防回环）
    if (this.applyingHostValues) return
    this.syncDirty()
    const next = engine.evaluateChanged(this.projectedValues(), name)
    // 值依赖的异步选项：命中声明的 sourceDeps 才 reload（A 变 → 重载 B 的选项）
    this.reloadOptionDependents(name)
    if (next === null) return
    this.effects = next
    const cleared = this.applyEffects()
    if (cleared.length > 0) this.propagateClearedEffects(cleared)
  }

  /**
   * 清值二次传播：联动把字段值清空（隐藏字段 → 空串）后，依赖该字段的下游 reaction 必须重算。
   *
   * 定向刷新只重算「依赖本次变更路径」的 reactions；被清值的字段是**下游**（如 A 隐藏 B，
   * C 的条件读 B），它的值变化没有对应的 values-change 事件，若不补一轮求值，C 会停在
   * 「B 还有值」时算出的旧效果（星号/禁用残留）。按轮次推进并限制往返次数，
   * 与全量求值的定点迭代同口径（8 轮上限）。
   */
  private propagateClearedEffects(names: string[]): void {
    const engine = this.engine
    if (!engine) return
    const pending = [...names]
    const visited = new Set(names)
    for (let round = 0; round < CLEAR_PROPAGATION_ROUNDS && pending.length > 0; round++) {
      const batch = pending.splice(0, pending.length)
      let next: ReactionEffectsMap | null = null
      for (const path of batch) {
        const result = engine.evaluateChanged(this.projectedValues(), path)
        if (result !== null) next = result
      }
      if (next === null) continue
      this.effects = next
      for (const cleared of this.applyEffects()) {
        if (visited.has(cleared)) continue
        visited.add(cleared)
        pending.push(cleared)
      }
    }
  }

  /**
   * 数组增删 / 复制 / 移动：行号重绑 → 重索引 / 规则键重挂 / 清错误 → 值同步。
   *
   * 错误清理扩到**该数组的字段级**：内核 errors 按旧 name 挂在元素上，重编号后错位
   * （删掉第 1 行后，原 `users.1.nick` 的红字仍显示在新第 1 行上），必须随重编号一起清。
   * 值同步：行操作会改值但不派发 `oas-values-change`（事件契约不变），脏态 / 联动 / 受控
   * appliedValues 必须在此显式刷新，否则宿主下一次写同值会被当成「无变化」而静默丢弃。
   */
  private onArrayMutation(event: Event): void {
    const list = event.target instanceof Element ? event.target : null
    // 路径必须在重索引之前取：删行会让内层数组的具体路径整体前移
    const mutatedPath = list ? this.arrayPathOf.get(list) : undefined
    this.indexArrayNodes()
    this.syncRules()
    this.clearArrayErrorVisuals()
    if (list) this.clearArrayFieldErrors(list, mutatedPath)
    this.syncArrayStates()
    this.evaluateEffects()
    this.syncDirty()
    // 受控模式：行操作后把内核当前值当作新的写基线（宿主下次写树时只 diff 真实差异）
    if (this.hasHostValues()) this.appliedValues = cloneJson(this.kernelValues()) as Record<string, unknown>
  }

  /** 清该数组的字段级错误视觉（注入项走内核，规则错误在下次校验时重算） */
  private clearArrayFieldErrors(list: Element, path: string | undefined): void {
    const form = this.formEl
    if (form && path) {
      const prefix = `${path}.`
      const injected = Object.keys(form.getErrors()).filter((name) => name.startsWith(prefix))
      if (injected.length > 0) form.clearErrors(injected)
    }
    for (const item of list.querySelectorAll<HTMLElement>('oas-form-item')) {
      ;(item as HTMLElement & { setError?: (message: string | null) => void }).setError?.(null)
    }
    for (const widget of list.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
      widget.removeAttribute('aria-invalid')
    }
  }

  /** 效果查找：effect 键（具体路径或通配模式）命中元素具体路径 */
  private effectFor(path: string): ReactionEffects | undefined {
    let merged: ReactionEffects | undefined
    for (const [key, effects] of this.effects) {
      if (pathPatternMatches(key, path)) merged = { ...merged, ...effects }
    }
    return merged
  }

  /** 应用可见/禁用/必填效果（文档序遍历，容器效果通过祖先标记向下传导）；返回本轮被清值的字段名 */
  private applyEffects(): string[] {
    const body = this.bodyEl
    if (!body) return []
    const cleared: string[] = []
    for (const element of body.querySelectorAll<HTMLElement>('[data-schema-key]')) {
      const name = this.applyNodeEffect(element)
      if (name !== null) cleared.push(name)
    }
    // 被卸载（不在文档里）的字段仍需按效果复显：非行内字段卸载后由占位注释保留位置
    for (const element of this.unmountedFields) {
      if (element.isConnected) continue
      const name = this.applyNodeEffect(element)
      if (name !== null) cleared.push(name)
    }
    return cleared
  }

  /** 单节点效果应用（字段态 / 容器态）；返回被清值的字段名（无清值返回 null） */
  private applyNodeEffect(element: HTMLElement): string | null {
    const key = element.getAttribute('data-schema-key') ?? ''
    const node = this.nodeByKey.get(key)
    if (!node) return null
    const isField = element.tagName.toLowerCase() === 'oas-form-item'
    const path = this.concretePathOf(element, node)
    const own = this.effectFor(path) ?? {}
    const ancestorHidden = element.parentElement?.closest('[data-schema-hidden]') != null
    const ancestorDisabled = element.parentElement?.closest('[data-schema-disabled]') != null

    const visible = (own.visible ?? node.staticVisible) && !ancestorHidden
    const disabled = (own.disabled ?? node.staticDisabled) || ancestorDisabled
    const required = own.required ?? node.staticRequired

    element.toggleAttribute('data-schema-hidden', !visible)
    element.toggleAttribute('data-schema-disabled', disabled)

    if (isField) {
      return this.applyFieldState(element, node as FieldPlan, visible, disabled, required)
    }
    element.hidden = !visible
    if (node.kind === 'array') {
      const list = element.querySelector<HTMLElement>('[data-schema-array-key]')
      if (list) list.toggleAttribute('disabled', disabled)
    }
    return null
  }

  /** 字段态：可见（卸载/清值/保键位）、禁用、必填 + aria-required 同步；返回被清值的字段名 */
  private applyFieldState(
    item: HTMLElement,
    node: FieldPlan,
    visible: boolean,
    disabled: boolean,
    required: boolean,
  ): string | null {
    const widget = item.querySelector<HTMLElement>('[data-schema-widget]')
    // 表格单元格不渲染自身标签：必填标记由列头 `*` 承担（避免单元格里出现孤立星号）
    item.toggleAttribute('required', required && !item.hasAttribute('data-schema-cell'))
    if (widget) {
      widget.toggleAttribute('disabled', disabled)
      if (required) widget.setAttribute('aria-required', 'true')
      else widget.removeAttribute('aria-required')
    }
    if (visible) {
      this.remount(item)
      item.hidden = false
      return null
    }
    // 生效字段名按控件上的 name 属性取（数组行由 form-list 重绑为具体路径，node.name 是模板名）
    const fieldName = widget?.getAttribute('name') ?? node.name
    if (node.inArrayRow || node.keepValueOnHidden) {
      // 数组行内字段卸载保留键位（空串而非删键，行间键形状一致）；keepValueOnHidden 保留值只隐藏
      if (!node.keepValueOnHidden && widget) {
        this.writeWidgetValue(widget, '')
        item.hidden = true
        return fieldName
      }
      item.hidden = true
      return null
    }
    // 非行内字段直接卸载：值随之从快照消失（对下游 reaction 等价于清值）
    this.unmount(item)
    return fieldName
  }

  private unmount(item: HTMLElement): void {
    if (!item.isConnected) return
    const placeholder = document.createComment('schema-form-unmounted')
    item.parentNode?.insertBefore(placeholder, item)
    this.placeholders.set(item, placeholder)
    this.unmountedFields.add(item)
    item.remove()
  }

  private remount(item: HTMLElement): void {
    if (item.isConnected) return
    const placeholder = this.placeholders.get(item)
    if (!placeholder?.parentNode) return
    placeholder.parentNode.insertBefore(item, placeholder)
    placeholder.remove()
    this.placeholders.delete(item)
    this.unmountedFields.delete(item)
  }

  // ---------- 校验 ----------

  /** 字段校验器注册（数组行按具体 name 展开；行增删后重挂） */
  private syncRules(): void {
    const form = this.formEl
    const compiled = this.compiled
    if (!form || !compiled || compiled.error) return
    const rules: Record<string, Array<{ validator: (value: string) => string | true }>> = {}
    const register = (node: FieldPlan, name: string): void => {
      rules[name] = [
        {
          validator: (value: string) => this.validateFieldValue(node, value, name) ?? true,
        },
      ]
    }
    const visit = (nodes: PlanNode[], prefix: string): void => {
      for (const node of nodes) {
        if (node.kind === 'field') {
          register(node, prefix === '' ? node.name : `${prefix}.${node.name}`)
          continue
        }
        if (node.kind === 'group') {
          visit(node.children, prefix)
          continue
        }
        if (node.kind === 'tabs') {
          for (const tab of node.tabs) visit(tab.children, prefix)
          continue
        }
        for (const [element, path] of this.arrayNodes()) {
          if (element.getAttribute('data-schema-array-key') !== node.key) continue
          // 数组元素代表数组本身；行内字段按当前行数逐行展开为 `users.0.nick`
          const rows = element.querySelectorAll(':scope > [data-oas-form-list-item]').length
          for (let i = 0; i < rows; i++) visit(node.children, `${path}.${i}`)
        }
      }
    }
    visit(compiled.plan, '')
    form.rules = rules
  }

  /** 单字段校验：只读投影 → required（静态 ∪ 联动效果）→ 关键字校验 → i18n 文案 */
  private validateFieldValue(node: FieldPlan, raw: string, concreteName: string): string | null {
    const effect = this.effectFor(concreteName)
    if (effect?.visible === false) return null
    const projected = projectValue(node.schema, raw)
    // 必填判据合并联动效果：fulfill required:true 必须真拦截（只落属性/aria 不参与校验 = 假必填）
    const required = typeof effect?.required === 'boolean' ? effect.required : node.rules.required
    if (required && isEmptyValue(projected)) return this.t('schemaForm.required')
    const issue = validateValue(node.schema, projected)
    if (!issue) return null
    return this.t(issue.messageKey, issue.params)
  }

  /**
   * 数组级校验（required / minItems / maxItems / uniqueItems）→ 注入数组路径 + 渲染错误条。
   * 返回 false 表示存在数组级问题（供 validate 汇总；错误注入仍走内核通道）。
   */
  private syncArrayErrors(): boolean {
    const form = this.formEl
    if (!form || !this.compiled || this.compiled.error) return true
    const projected = this.projectedValues()
    const issues: FormError[] = []
    const visuals: Array<{ path: string; message: string }> = []
    for (const [element, path] of this.arrayNodes()) {
      const key = element.getAttribute('data-schema-array-key') ?? ''
      const node = this.nodeByKey.get(key)
      if (!node || node.kind !== 'array') continue
      const value = readPath(projected, parseDslPath(path) ?? [])
      const message = this.validateArray(node, value, path)
      if (message === null) continue
      issues.push({ path, message })
      visuals.push({ path, message })
    }
    this.clearArrayErrorVisuals()
    for (const { path, message } of visuals) {
      const element = this.arrayErrorElFor(path)
      if (!element) continue
      element.textContent = message
      element.hidden = false
    }
    for (const issue of issues) this.arrayErrorPaths.add(issue.path)
    if (issues.length > 0) form.setErrors(issues)
    return issues.length === 0
  }

  /** 单个数组规则求值（返回首个错误文案）；`path` 用于取联动效果（required 可被 reactions 改写） */
  private validateArray(node: ArrayPlan, value: unknown, path: string): string | null {
    const items = Array.isArray(value) ? value : []
    const rules = node.arrayRules
    const effect = this.effectFor(path)
    // 与字段同判据：联动卸载（visible:false）的数组不参与校验
    if (effect?.visible === false) return null
    const required = typeof effect?.required === 'boolean' ? effect.required : rules.required
    if (required && items.length === 0) return this.t('schemaForm.required')
    if (typeof rules.minItems === 'number' && items.length < rules.minItems) {
      return this.t('schemaForm.minItems', { min: rules.minItems })
    }
    if (typeof rules.maxItems === 'number' && items.length > rules.maxItems) {
      return this.t('schemaForm.maxItems', { max: rules.maxItems })
    }
    if (rules.uniqueItems) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          // 深比较而非 JSON.stringify：键序不同（{a,b} vs {b,a}）应判为重复，字符串化会漏
          if (deepEqual(items[i], items[j])) return this.t('schemaForm.uniqueItems')
        }
      }
    }
    return null
  }

  /** 具体路径 → 数组错误条元素（嵌套数组按外层行号定位） */
  private arrayErrorElFor(path: string): HTMLElement | null {
    for (const [element, elementPath] of this.arrayNodes()) {
      if (elementPath !== path) continue
      return element.parentElement?.querySelector<HTMLElement>(':scope > [part="array-error"]') ?? null
    }
    return null
  }

  /** 清数组级错误（视觉 + 注入项） */
  private clearArrayErrorVisuals(): void {
    if (!this.bodyEl) return
    for (const element of this.bodyEl.querySelectorAll<HTMLElement>('[part="array-error"]')) {
      element.textContent = ''
      element.hidden = true
    }
    const form = this.formEl
    if (form && this.arrayErrorPaths.size > 0) form.clearErrors([...this.arrayErrorPaths])
    this.arrayErrorPaths.clear()
  }

  // ---------- 空态 ----------

  private syncEmptyState(): void {
    const empty = this.emptyEl
    if (!empty) return
    const compiled = this.compiled
    const hasFields = (compiled?.plan.length ?? 0) > 0 && !compiled?.error
    empty.hidden = hasFields
    if (hasFields) {
      empty.textContent = ''
      empty.removeAttribute('title')
      return
    }
    empty.textContent = compiled?.error ? this.t('schemaForm.emptySchema') : this.t('schemaForm.emptyFields')
    if (compiled?.error) empty.setAttribute('title', compiled.error)
    else empty.removeAttribute('title')
  }

  // ---------- 公开方法 ----------

  /**
   * 提交：联动求值 → **内核字段校验** → 数组级校验并注入 → 委托内核提交。
   *
   * 时序对齐 PRD（先内核 validate、后数组级）：数组级错误在最终 submit 之前注入，内核对
   * 字段错误与注入项做并集判定——两者任一失败都只派发 `oas-validate-fail`（载荷含并集）。
   * `form.validate()` 只做校验不派发事件，因此提交事件契约不变（内核 requestSubmit 派发）。
   */
  submit(): void {
    this.evaluateEffects()
    const form = this.formEl
    if (!form) return
    void form.validate().then(() => {
      // 等待期间结构重建/断开：旧的 form 引用已失效，放弃本次提交
      if (this.formEl !== form) return
      this.syncArrayErrors()
      form.submit()
    })
  }

  /**
   * 校验：联动求值 → **内核字段校验** → 数组级校验（错误并集），返回是否全部通过。
   *
   * 先清上一轮数组级注入：内核 validate 会把注入项并入本次结论（陈旧数组错误不得冒充字段校验结果）。
   */
  async validate(): Promise<boolean> {
    this.evaluateEffects()
    const form = this.formEl
    if (!form) return true
    this.clearArrayErrorVisuals()
    const kernelOk = await form.validate()
    const arrayOk = this.syncArrayErrors()
    return kernelOk && arrayOk
  }

  /** 全表当前值（form 内核字符串语义：叶子恒为字符串，数组出 JSON 串）；出向变换在此应用 */
  getValues(): Record<string, unknown> {
    return this.transformOutbound(this.kernelValues())
  }

  /**
   * 手动重载异步选项（`options.source`）：省略 path = 全部重载。
   * 与自动加载共用同一套竞态守卫（序号 / 去重 / 卸载丢弃）。
   */
  reloadOptions(path?: string): void {
    for (const [widget, node, bound] of this.optionBindings()) {
      if (path !== undefined && bound !== path) continue
      // 手动刷新强制发起新请求（不复用进行中的同类请求）
      void this.loadOptions(widget, node, bound, true)
    }
  }

  /** 受控写通道：按路径写字段（走内核 `oas-form.setValues`；宿主写不派发事件、不重建 DOM） */
  setValues(patch: Record<string, unknown>): void {
    if (!isPlainObject(patch)) {
      devWarn('[oas-schema-form] setValues 需要普通对象，已忽略本次调用')
      return
    }
    // 入向换算后写入组件（appliedValues 仍按宿主原值记基线，diff 口径不变）
    const converted = this.convertInbound(patch)
    this.applyingHostValues = true
    try {
      this.indexArrayNodes()
      this.syncHostArrayRows(converted)
      this.formEl?.setValues(converted)
      const merged = mergeDeep(
        cloneJson(this.appliedValues ?? {}) as Record<string, unknown>,
        cloneJson(patch) as Record<string, unknown>,
      )
      this.appliedValues = merged
    } finally {
      this.applyingHostValues = false
    }
    this.indexArrayNodes()
    this.syncRules()
    this.syncArrayStates()
    this.evaluateEffects()
    this.syncDirty()
  }

  /** 注入错误（服务端校验结果）；路径归一与优先级语义由 form 内核承载 */
  setErrors(list: FormError[]): void {
    this.formEl?.setErrors(list)
  }

  /** 清除注入错误（paths 省略 = 清全部）：清后该字段回落规则错误 */
  clearErrors(paths?: string[]): void {
    this.formEl?.clearErrors(paths)
  }

  /** 重置：回初始值、清错误、数组行数回初始长度（不派发事件；行数快照在此 bypass） */
  reset(): void {
    if (!this.compiled) return
    this.clearArrayErrorVisuals()
    this.rebuild({ restoreRows: false })
    this.formEl?.reset()
    this.syncDirty()
    this.evaluateEffects()
  }

  override disconnectedCallback(): void {
    this.compiled = null
    this.compiledKey = null
    this.renderedKey = null
    this.engine = null
    this.nodeByKey.clear()
    this.effects.clear()
    this.appliedValues = null
    this.appliedValuesKey = null
    this.pristineSnapshot.clear()
    this._dirty = false
    super.disconnectedCallback()
  }
}

// ---------- 纯工具 ----------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function cloneJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return {}
  }
}

/** 深合并（后者胜；数组/原始值覆盖；保留键段跳过） */
function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    if (isPlainObject(value)) {
      const base = isPlainObject(target[key]) ? (target[key] as Record<string, unknown>) : {}
      target[key] = mergeDeep(base, value)
    } else {
      target[key] = value
    }
  }
  return target
}

/** 嵌套值按点号路径读取 */
function readPath(source: unknown, segments: string[]): unknown {
  let cursor: unknown = source
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    if (!Object.hasOwn(cursor, segment)) return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

/** 嵌套值 → [点号路径, 字符串值]（数组按下标展开；只收集标量叶子） */
function flattenValues(values: unknown, prefix = ''): Array<[string, string]> {
  const out: Array<[string, string]> = []
  if (values === null || values === undefined) return out
  if (typeof values !== 'object') {
    if (prefix !== '') out.push([prefix, String(values)])
    return out
  }
  if (Array.isArray(values)) {
    values.forEach((item, index) => {
      out.push(...flattenValues(item, prefix === '' ? String(index) : `${prefix}.${index}`))
    })
    return out
  }
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    out.push(...flattenValues(value, prefix === '' ? key : `${prefix}.${key}`))
  }
  return out
}

/**
 * 嵌套值 → [点号路径, 原始叶子值]（受控 diff 用：保留数字/布尔原值以便按类型写入）。
 * `whole` 命中（路径恰为已渲染字段名）时该子树整值作叶子下发：数组值字段不能按下标拍平，
 * 否则会得到 `tags.0` 这类不存在的字段名，写入被静默丢弃。
 */
function flattenRawValues(
  values: unknown,
  prefix = '',
  whole?: { has(key: string): boolean },
): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = []
  if (values === null || values === undefined) return out
  if (typeof values !== 'object') {
    if (prefix !== '') out.push([prefix, values])
    return out
  }
  if (prefix !== '' && whole?.has(prefix)) {
    out.push([prefix, values])
    return out
  }
  if (Array.isArray(values)) {
    values.forEach((item, index) => {
      out.push(...flattenRawValues(item, prefix === '' ? String(index) : `${prefix}.${index}`, whole))
    })
    return out
  }
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
    out.push(...flattenRawValues(value, prefix === '' ? key : `${prefix}.${key}`, whole))
  }
  return out
}

/** 按路径段写嵌套 patch（中间层缺失自动建对象；保留键段跳过） */
function setLeaf(target: Record<string, unknown>, segments: string[], value: unknown): void {
  if (segments.length === 0 || segments.some((segment) => !segment)) return
  let cursor: Record<string, unknown> = target
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!
    const next = cursor[segment]
    if (!isPlainObject(next)) cursor[segment] = {}
    cursor = cursor[segment] as Record<string, unknown>
  }
  cursor[segments[segments.length - 1]!] = value
}

/** 路径工具再导出（与编译层同一实现，供宿主/测试复用） */
export { canonicalDslPath, joinDslPath, parseDslPath }
