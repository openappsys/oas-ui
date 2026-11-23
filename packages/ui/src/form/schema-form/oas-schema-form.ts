import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { stableHash36 } from '../../shared/stable-id.js'
import { OASForm } from '../form/index.js'
import type { FormError } from '../form/index.js'
import {
  canonicalDslPath,
  compileSchema,
  createReactionEngine,
  isEmptyValue,
  joinDslPath,
  parseDslPath,
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
  type ReactionEngine,
  type TabsPlan,
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
@media (forced-colors: active) {
  .tab:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

export class OASSchemaForm extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'schema',
      'ui-schema',
      'initial-values',
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

  /** 编译缓存（schema/uiSchema 身份变化才重编译） */
  private compiled: CompileResult | null = null
  private compiledKey: string | null = null
  /** 上次渲染所用的结构键（决定是否需要重建 DOM，避免属性微调抖掉焦点） */
  private renderedKey: string | null = null

  private engine: ReactionEngine | null = null
  private effects = new Map<string, ReactionEffects>()
  private nodeByKey = new Map<string, PlanNode>()
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

  /** 缓存节点引用 + 绑定值变化/数组增删（render 与水合路径共用） */
  private bind(): void {
    this.formEl = this.shadow.querySelector('oas-form')
    this.bodyEl = this.shadow.querySelector('.body')
    this.emptyEl = this.shadow.querySelector('.empty')
    const form = this.formEl
    if (!form) return
    const onValues = (e: Event): void => this.onValuesChange(e)
    const onArrayMutation = (): void => this.onArrayMutation()
    form.addEventListener('oas-values-change', onValues)
    form.addEventListener('oas-add', onArrayMutation)
    form.addEventListener('oas-remove', onArrayMutation)
    this.onCleanup(() => {
      form.removeEventListener('oas-values-change', onValues)
      form.removeEventListener('oas-add', onArrayMutation)
      form.removeEventListener('oas-remove', onArrayMutation)
    })
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
      this.renderedKey = key
      this.rebuild()
    } else {
      this.indexArrayNodes()
      this.syncArrayStates()
    }
    this.syncEmptyState()
  }

  /** 结构键：schema/uiSchema/initialValues 任一变化即重建 DOM（布局类属性变化不重建） */
  private structureKey(): string {
    return [
      this.getAttribute('schema') ?? '',
      this.getAttribute('ui-schema') ?? '',
      this.getAttribute('initial-values') ?? '',
      this._schemaVersion,
      this._uiVersion,
      this._initialVersion,
    ].join('\u0000')
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

  /** 结构重建：快照当前值 → 重建 DOM → 回填值（结构变化时值不丢） */
  private rebuild(): void {
    const form = this.formEl
    const body = this.bodyEl
    const compiled = this.compiled
    if (!form || !body || !compiled) return
    const snapshot = form.getValues()
    body.textContent = ''
    this.unmountedFields.clear()
    this.arrayErrorPaths.clear()
    if (compiled.error) {
      form.rules = {}
      this.syncEmptyState()
      return
    }
    for (const node of compiled.plan) body.appendChild(this.renderNode(node))
    // 初始值 = schema default ← 宿主 initialValues（宿主优先）
    const merged = mergeDeep(cloneJson(compiled.defaults) as Record<string, unknown>, this.initialValues)
    form.initialValues = merged
    // 行数由初始数组长度驱动（min 兜底；initialValues 有 1 行必须渲染 1 行）
    this.syncArrayMin(merged)
    form.reapplyInitialValues()
    this.applySnapshotValues(snapshot, merged)
    this.syncRules()
    this.evaluateEffects()
    this.syncArrayStates()
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
    item.setAttribute('label', node.label)
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

    const list = document.createElement('oas-form-list')
    list.setAttribute('part', 'list')
    list.setAttribute('data-schema-array-key', node.key)
    list.setAttribute('name', node.name)
    // 增删按钮可访问名走 schemaForm.*（i18n），由 form-list 的可选属性承接
    list.setAttribute('add-text', this.t('schemaForm.addItem'))
    list.setAttribute('remove-text', this.t('schemaForm.removeItem'))
    // 行模板：行内字段裸名（form-list 自动加前缀）；嵌套数组名带 {index}（外层替换）
    const template = document.createElement('template')
    for (const child of node.children) template.content.appendChild(this.renderNode(child))
    list.appendChild(template)
    container.appendChild(list)

    const error = document.createElement('div')
    error.className = 'array-error'
    error.setAttribute('part', 'array-error')
    error.setAttribute('role', 'alert')
    error.hidden = true
    container.appendChild(error)

    const empty = document.createElement('div')
    empty.className = 'array-empty'
    empty.setAttribute('part', 'array-empty')
    empty.textContent = this.t('schemaForm.emptyArray')
    container.appendChild(empty)
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

  // ---------- 初始值 / 行数 ----------

  /** 按初始值数组长度设置 form-list min（逐层；行数由数据驱动，0 行也有占位） */
  private syncArrayMin(initial: Record<string, unknown>): void {
    for (let pass = 0; pass < 4; pass++) {
      this.indexArrayNodes()
      let changed = false
      for (const [element, path] of this.arrayNodes()) {
        const value = readPath(initial, parseDslPath(path) ?? [])
        const length = Array.isArray(value) ? value.length : 0
        if (element.getAttribute('min') !== String(length)) {
          element.setAttribute('min', String(length))
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

  /** 回填快照值（结构重建后已填值不丢）：空值与新增 initialValues 覆盖的路径不再回填 */
  private applySnapshotValues(snapshot: Record<string, unknown>, initial: Record<string, unknown>): void {
    const form = this.formEl
    if (!form) return
    for (const [name, raw] of flattenValues(snapshot)) {
      // 空串 = 字段未编辑（fresh 状态），不回填（否则会把新写入的初始值覆盖成空）
      if (raw === '') continue
      // 新 initialValues 显式覆盖的路径以初始值为准（初始值变化触发重建时快照不能回压）
      const path = parseDslPath(name)
      if (path !== null && readPath(initial, path) !== undefined) continue
      const element = form.querySelector<HTMLElement>(`[name="${name.replace(/"/g, '\\"')}"]`)
      if (!element) continue
      this.writeWidgetValue(element, raw)
    }
  }

  private writeWidgetValue(element: HTMLElement, value: string): void {
    if (element.tagName.toLowerCase() === 'oas-switch') {
      element.toggleAttribute('checked', value === 'true')
      return
    }
    element.setAttribute('value', value)
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
    const next = engine.evaluateChanged(this.projectedValues(), name)
    if (next === null) return
    this.effects = next
    this.applyEffects()
  }

  /** 数组增删：行号重绑 → 重索引/规则键重挂/清数组级错误 */
  private onArrayMutation(): void {
    this.indexArrayNodes()
    this.syncRules()
    this.clearArrayErrorVisuals()
    this.syncArrayStates()
    this.evaluateEffects()
  }

  /** 效果查找：effect 键（具体路径或通配模式）命中元素具体路径 */
  private effectFor(path: string): ReactionEffects | undefined {
    let merged: ReactionEffects | undefined
    for (const [key, effects] of this.effects) {
      if (pathPatternMatches(key, path)) merged = { ...merged, ...effects }
    }
    return merged
  }

  /** 应用可见/禁用/必填效果（文档序遍历，容器效果通过祖先标记向下传导） */
  private applyEffects(): void {
    const body = this.bodyEl
    if (!body) return
    for (const element of body.querySelectorAll<HTMLElement>('[data-schema-key]')) {
      this.applyNodeEffect(element)
    }
    // 被卸载（不在文档里）的字段仍需按效果复显：非行内字段卸载后由占位注释保留位置
    for (const element of this.unmountedFields) {
      if (element.isConnected) continue
      this.applyNodeEffect(element)
    }
  }

  /** 单节点效果应用（字段态 / 容器态） */
  private applyNodeEffect(element: HTMLElement): void {
    const key = element.getAttribute('data-schema-key') ?? ''
    const node = this.nodeByKey.get(key)
    if (!node) return
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
      this.applyFieldState(element, node as FieldPlan, visible, disabled, required)
      return
    }
    element.hidden = !visible
    if (node.kind === 'array') {
      const list = element.querySelector<HTMLElement>('[data-schema-array-key]')
      if (list) list.toggleAttribute('disabled', disabled)
    }
  }

  /** 字段态：可见（卸载/清值/保键位）、禁用、必填 + aria-required 同步 */
  private applyFieldState(
    item: HTMLElement,
    node: FieldPlan,
    visible: boolean,
    disabled: boolean,
    required: boolean,
  ): void {
    const widget = item.querySelector<HTMLElement>('[data-schema-widget]')
    item.toggleAttribute('required', required)
    if (widget) {
      widget.toggleAttribute('disabled', disabled)
      if (required) widget.setAttribute('aria-required', 'true')
      else widget.removeAttribute('aria-required')
    }
    if (visible) {
      this.remount(item)
      item.hidden = false
      return
    }
    if (node.inArrayRow || node.keepValueOnHidden) {
      // 数组行内字段卸载保留键位（空串而非删键，行间键形状一致）；keepValueOnHidden 保留值只隐藏
      if (!node.keepValueOnHidden && widget) this.writeWidgetValue(widget, '')
      item.hidden = true
      return
    }
    this.unmount(item)
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

  /** 单字段校验：只读投影 → required → 关键字校验 → i18n 文案 */
  private validateFieldValue(node: FieldPlan, raw: string, concreteName: string): string | null {
    const effect = this.effectFor(concreteName)
    if (effect?.visible === false) return null
    const projected = projectValue(node.schema, raw)
    if (node.rules.required && isEmptyValue(projected)) return this.t('schemaForm.required')
    const issue = validateValue(node.schema, projected)
    if (!issue) return null
    return this.t(issue.messageKey, issue.params)
  }

  /** 数组级校验（required / minItems / maxItems / uniqueItems）→ 注入数组路径 + 渲染错误条 */
  private syncArrayErrors(): void {
    const form = this.formEl
    if (!form || !this.compiled || this.compiled.error) return
    const projected = this.projectedValues()
    const issues: FormError[] = []
    const visuals: Array<{ path: string; message: string }> = []
    for (const [element, path] of this.arrayNodes()) {
      const key = element.getAttribute('data-schema-array-key') ?? ''
      const node = this.nodeByKey.get(key)
      if (!node || node.kind !== 'array') continue
      const value = readPath(projected, parseDslPath(path) ?? [])
      const message = this.validateArray(node, value)
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
  }

  /** 单个数组规则求值（返回首个错误文案） */
  private validateArray(node: ArrayPlan, value: unknown): string | null {
    const items = Array.isArray(value) ? value : []
    const rules = node.arrayRules
    if (rules.required && items.length === 0) return this.t('schemaForm.required')
    if (typeof rules.minItems === 'number' && items.length < rules.minItems) {
      return this.t('schemaForm.minItems', { min: rules.minItems })
    }
    if (typeof rules.maxItems === 'number' && items.length > rules.maxItems) {
      return this.t('schemaForm.maxItems', { max: rules.maxItems })
    }
    if (rules.uniqueItems) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (JSON.stringify(items[i]) === JSON.stringify(items[j])) return this.t('schemaForm.uniqueItems')
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

  /** 提交：先值归一/联动求值，再数组级校验并注入，最后委托内核提交（事件由内核派发并穿出） */
  submit(): void {
    this.evaluateEffects()
    this.syncArrayErrors()
    this.formEl?.submit()
  }

  /** 校验：联动求值 → 数组级校验 → 内核字段校验（错误并集），返回是否全部通过 */
  async validate(): Promise<boolean> {
    this.evaluateEffects()
    this.syncArrayErrors()
    return this.formEl ? this.formEl.validate() : true
  }

  /** 全表当前值（form 内核字符串语义：叶子恒为字符串，数组出 JSON 串） */
  getValues(): Record<string, unknown> {
    return this.formEl?.getValues() ?? {}
  }

  /** 受控写通道：V1b 能力。V1a 显式未实现 → devWarn，禁止静默失效 */
  setValues(patch: Record<string, unknown>): void {
    void patch
    devWarn('[oas-schema-form] setValues 为 V1b 能力（受控写通道），V1a 未实现——请使用 initialValues 一次性基线')
  }

  /** 注入错误（服务端校验结果）；路径归一与优先级语义由 form 内核承载 */
  setErrors(list: FormError[]): void {
    this.formEl?.setErrors(list)
  }

  /** 清除注入错误（paths 省略 = 清全部）：清后该字段回落规则错误 */
  clearErrors(paths?: string[]): void {
    this.formEl?.clearErrors(paths)
  }

  /** 重置：回初始值、清错误、数组行数回初始长度（不派发事件） */
  reset(): void {
    if (!this.compiled) return
    this.clearArrayErrorVisuals()
    this.rebuild()
    this.formEl?.reset()
    this.evaluateEffects()
  }

  override disconnectedCallback(): void {
    this.compiled = null
    this.compiledKey = null
    this.renderedKey = null
    this.engine = null
    this.nodeByKey.clear()
    this.effects.clear()
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

/** 路径工具再导出（与编译层同一实现，供宿主/测试复用） */
export { canonicalDslPath, joinDslPath, parseDslPath }
