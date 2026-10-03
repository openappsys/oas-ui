import { OASElement } from '@oas-ui/core'

/** 表单控件读取器：返回该控件的表单值（字符串形态；复杂控件返回 JSON 字符串） */
type FormControlReader = (el: Element) => string

/** 表单控件写入器：把初始值/reset 值写回控件（与读取器同通道：value / model-value / checked） */
type FormControlWriter = (el: Element, value: string) => void

/**
 * 表单控件注册表：collectFields 收集这些 tag 下带 `name` 的元素，并用其读取器取值。
 * 内置常用控件 + 特殊通道（transfer 用 model-value、switch 用 checked 态），可 registerFormControl 扩展。
 */
const FORM_CONTROLS = new Map<string, FormControlReader>()

const FORM_CONTROL_WRITERS = new Map<string, FormControlWriter>()

/** 值安全归一：`[`/`{` 前缀（数组/对象 JSON）重新 stringify，保持合法 JSON */
function normalizeValue(raw: string): string {
  if (raw === '') return ''
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      return JSON.stringify(JSON.parse(raw))
    } catch {
      return raw
    }
  }
  return raw
}

const defaultReader: FormControlReader = (el) => normalizeValue(el.getAttribute('value') ?? '')

const defaultWriter: FormControlWriter = (el, value) => el.setAttribute('value', value)

/** 数字路径段（数组下标） */
const INDEX_SEGMENT = /^\d+$/

/** 名称路径缓存：嵌套解析在提交/值同步高频路径上，避免重复解析 */
const NAME_PATH_CACHE = new Map<string, string[]>()

/**
 * 字段 name 路径解析（嵌套 values 语义，D10）：
 * `users.0.name` / `users[0].name` / `a[0][1].b` → 段数组；数字段即数组下标。
 * 不含路径语法的普通名解析为单段——组装结果与扁平结构一致，既有用法天然向后兼容。
 * 安全：保留键段（`__proto__`/`prototype`/`constructor`）整块拒绝（返回 null）——
 * 否则 `__proto__.x` 路径会把值写到 Object.prototype 上（原型污染，coder review 实测复现）。
 */
const FORBIDDEN_SEGMENT = new Set(['__proto__', 'prototype', 'constructor'])
export function parseNamePath(name: string): string[] | null {
  const cached = NAME_PATH_CACHE.get(name)
  if (cached) return cached.length > 0 ? cached : null
  const segments = name
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((s) => s !== '')
  if (segments.some((s) => FORBIDDEN_SEGMENT.has(s))) {
    NAME_PATH_CACHE.set(name, [])
    return null
  }
  const result = segments.length > 0 ? segments : [name]
  NAME_PATH_CACHE.set(name, result)
  return result
}

/** 按路径段读取嵌套值（中途缺失返回 undefined） */
function readPath(source: Record<string, unknown> | undefined, segments: string[]): unknown {
  let current: unknown = source
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined
    // 只读自有属性（原型链上的 toString 等继承成员不是数据——否则继承函数会被当字段值）
    if (!Object.hasOwn(current, segment)) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

/** 按路径段写入嵌套值（中途结构缺失时按下一段类型自动创建数组/对象） */
function writePath(target: Record<string, unknown>, segments: string[], value: string): void {
  let cursor: unknown = target
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!
    const childIsIndex = INDEX_SEGMENT.test(segments[i + 1]!)
    const container = cursor as Record<string, unknown>
    let next: unknown = container[segment]
    if (next === null || typeof next !== 'object') {
      next = childIsIndex ? [] : {}
      container[segment] = next
    }
    cursor = next
  }
  const last = segments[segments.length - 1]!
  ;(cursor as Record<string, unknown>)[last] = value
}

function register(tags: string[], reader?: FormControlReader, writer?: FormControlWriter): void {
  for (const t of tags) {
    FORM_CONTROLS.set(t, reader ?? defaultReader)
    if (writer) FORM_CONTROL_WRITERS.set(t, writer)
  }
}

// 内置常用控件（默认读 value 属性）
register([
  'oas-input',
  'oas-textarea',
  'oas-select',
  'oas-auto-complete',
  'oas-cascader',
  'oas-tree-select',
  'oas-input-number',
  'oas-radio',
  'oas-radio-group',
  'oas-date-picker',
  'oas-slider',
  'oas-rate',
  'oas-pin-input',
  'oas-dynamic-tags',
  'oas-combobox',
])
// 特殊 value 通道
register(
  ['oas-transfer'],
  (el) => normalizeValue(el.getAttribute('model-value') ?? ''),
  (el, v) => el.setAttribute('model-value', v),
)
register(
  ['oas-dynamic-input'],
  (el) => normalizeValue(el.getAttribute('model-value') ?? ''),
  (el, v) => el.setAttribute('model-value', v),
)
register(['oas-checkbox'], undefined, (el, v) => {
  // 走 property setter：true-value/false-value 映射与布尔分发在 setter 内（setAttribute 会绕过，
  // initial-values/reset 无法驱动 checked 态——实抓）
  ;(el as unknown as { value: string }).value = v
})
register(
  ['oas-switch'],
  (el) => (el.hasAttribute('checked') ? 'true' : 'false'),
  (el, v) => el.toggleAttribute('checked', v === 'true'),
)

/** 注册额外的表单控件（供自定义/未内置控件被 collectFields 收集）；返回注销函数 */
export function registerFormControl(
  tagName: string,
  reader?: (el: Element) => string | null,
  writer?: FormControlWriter,
): () => void {
  const tag = tagName.toLowerCase()
  FORM_CONTROLS.set(tag, reader ? (el) => reader(el) ?? '' : defaultReader)
  if (writer) FORM_CONTROL_WRITERS.set(tag, writer)
  else FORM_CONTROL_WRITERS.delete(tag)
  return () => {
    FORM_CONTROLS.delete(tag)
    FORM_CONTROL_WRITERS.delete(tag)
  }
}

/** 校验触发时机 */
export type ValidateTrigger = 'change' | 'blur' | 'input'

const TRIGGERS: ValidateTrigger[] = ['change', 'blur', 'input']

export interface Rule {
  required?: boolean
  message?: string
  minLength?: number
  maxLength?: number
  pattern?: string
  /** 自定义校验函数（property 通道；返回 true 通过 / string 为错误消息 / Promise 异步），在既有规则之后执行 */
  validator?: (value: string, values: Record<string, string>) => true | string | Promise<true | string>
  /** 字段级校验触发时机，覆盖表级 validate-trigger */
  validateTrigger?: ValidateTrigger
}

export type Rules = Record<string, Rule[]>

/**
 * 校验文案模板（validate-messages）：按规则类型覆盖 locale 默认文案。
 * 模板支持 `${min}` / `${max}` / `${value}` 占位插值；`default` 作为未命中具体 key 时的兜底。
 * property 通道为主（对象），字符串反射到 attribute（JSON）统一解析。
 */
export interface ValidateMessages {
  required?: string
  minLength?: string
  maxLength?: string
  pattern?: string
  /** 其余规则失败的兜底模板 */
  default?: string
}

/** 表级 size 下发档位白名单（非法值不下发） */
const VALID_FORM_SIZES = ['small', 'medium', 'large'] as const

/** 模板插值：`${key}` 替换为 params[key]，未命中的占位原样保留（自有键判定，原型链成员不命中） */
function interpolate(tpl: string, params: Record<string, string | number>): string {
  return tpl.replace(/\$\{(\w+)\}/g, (m, k) => (Object.hasOwn(params, k) ? String(params[k]) : m))
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
form {
  display: block;
}
`

export class OASForm extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'rules',
      'layout',
      'gap',
      'label-align',
      'label-width',
      'inline',
      'disabled',
      'scroll-to-first-error',
      'validate-trigger',
      'initial-values',
      'size',
      'colon',
      'validate-messages',
    ]
  }

  private form: HTMLFormElement | null = null
  private _rules: Rules = {}
  /** rules property 通道（validator 等函数不可 JSON 序列化，仅存内存） */
  private _rulesProp: Rules | null = null
  private _rulesAttrRaw: string | null = null
  private _initialValues: Record<string, unknown> = {}
  private _initialProp: Record<string, unknown> | null = null
  private _initialAttrRaw: string | null = null
  /** 初始值写入标记：property 通道写入后强制下次 update 重放 */
  private _initialDirty = false
  /** 上次初始值写入的来源标记（attribute 原文；undefined 表示从未写入） */
  private _initialSource: string | null | undefined = undefined
  /** reset 基线：挂载时各字段初始值（initial-values 优先，否则取字段当前值） */
  private _initialSnapshot: Record<string, string> = {}
  private errors: Record<string, string> = Object.create(null)
  /** 当前生效的校验文案模板（attribute 解析或 property 通道，property 优先） */
  private _validateMessages: ValidateMessages = {}
  private _validateMessagesProp: ValidateMessages | null = null
  private _validateMessagesAttrRaw: string | null = null

  /** 单字段触发校验的序号令牌（异步 validator 竞态防护：只认最新一次结果） */
  private fieldValidateSeq = new Map<string, number>()

  /** Vue/React 会把 rules 识别为实例属性走 property 赋值；对象走 property 通道（支持 validator），字符串反射到 attribute */
  get rules(): Rules {
    return this._rules
  }
  set rules(value: Rules | string) {
    if (typeof value === 'string') {
      this.setAttribute('rules', value)
      return
    }
    this._rulesProp = value
    this._rulesAttrRaw = this.getAttribute('rules')
    if (this.hasRendered) this.update()
  }

  /** 表单初始值：JSON attribute + property 双通道，property 优先 */
  get initialValues(): Record<string, unknown> {
    return this._initialValues
  }
  set initialValues(value: Record<string, unknown> | string) {
    if (typeof value === 'string') {
      this.setAttribute('initial-values', value)
      return
    }
    this._initialProp = value
    this._initialAttrRaw = this.getAttribute('initial-values')
    this._initialDirty = true
    if (this.hasRendered) this.update()
  }

  /** 校验文案模板：property（对象，推荐）+ attribute（JSON 字符串）双通道，property 优先 */
  get validateMessages(): ValidateMessages {
    return this._validateMessages
  }
  set validateMessages(value: ValidateMessages | string) {
    if (typeof value === 'string') {
      this.setAttribute('validate-messages', value)
      return
    }
    this._validateMessagesProp = value
    this._validateMessagesAttrRaw = this.getAttribute('validate-messages')
    if (this.hasRendered) this.update()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <form part="form" novalidate>
        <slot></slot>
      </form>
    `
  }

  /** 缓存节点引用 + 绑定提交/字段值同步/校验触发事件（render 与水合路径共用） */
  private bind(): void {
    this.form = this.shadow.querySelector('form')
    this.form?.addEventListener('submit', (e: SubmitEvent) => {
      e.preventDefault()
      this.validateAndSubmit()
    })
    this.addEventListener('oas-input', ((e: CustomEvent<{ value: string }>) => {
      const target = e.composedPath()[0]
      if (target instanceof Element && this.contains(target)) {
        const written = String(e.detail.value)
        target.setAttribute('value', written)
        this.emitValuesChange(target.getAttribute('name'), written)
      }
    }) as EventListener)
    this.addEventListener('oas-change', ((e: CustomEvent) => {
      const target = e.composedPath()[0]
      if (!(target instanceof Element) || !this.contains(target)) return
      const detail = e.detail as Record<string, unknown> | null
      // detail 无 value 键的事件（如 calendar range 的 { start, end }）不参与值同步——
      // 读 undefined 会把字段刚写入的 value 抹成 ''（form × calendar range 交叉实抓）
      if (!detail || !('value' in detail)) return
      const v = detail.value
      // null（空值语义，如 input-number 未填）写空串而非 'null' 字符串
      const written = v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v)
      target.setAttribute('value', written)
      this.emitValuesChange(target.getAttribute('name'), written)
    }) as EventListener)
    // 校验触发时机：事件与 effectiveTrigger 匹配的字段做单字段校验（注册在值同步之后，读到的是新值）
    const triggerEvents: Array<[string, ValidateTrigger]> = [
      ['oas-change', 'change'],
      ['oas-blur', 'blur'],
      ['oas-input', 'input'],
    ]
    for (const [event, trigger] of triggerEvents) {
      this.addEventListener(event, ((e: CustomEvent) => {
        const target = e.composedPath()[0]
        if (!(target instanceof Element) || !this.contains(target)) return
        const name = target.getAttribute('name')
        if (!name) return
        if (this.effectiveTrigger(name) !== trigger) return
        this.validateFieldByTrigger(name, target)
      }) as EventListener)
    }
    // 实时清错：已显示错误的字段在输入时复校（改对即清），不改动 validate-trigger 语义。
    // 否则残留错误文案要等到用户点击按钮触发的 blur 才被移除，那一瞬的布局位移会把
    // 按钮从指针下顶走，click 落到最近公共祖先（form）而非按钮，吞掉这次提交。
    this.addEventListener('oas-input', ((e: CustomEvent) => {
      const target = e.composedPath()[0]
      if (!(target instanceof Element) || !this.contains(target)) return
      const name = target.getAttribute('name')
      if (!name || this.effectiveTrigger(name) === 'input') return
      if (!Object.hasOwn(this.errors, name)) return
      this.validateFieldByTrigger(name, target)
    }) as EventListener)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（form 元素存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('form')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseRules()
    this.parseInitialValues()
    this.parseValidateMessages()
    this.applyLayout()
    this.syncSizeToFields()
    this.maybeApplyInitialValues()
    this.syncDisabledToFields()
  }

  override disconnectedCallback(): void {
    // 对齐原生 fieldset 移除语义：离开表单即解除表单链路禁用（不自锁，重连后 update 重新同步）
    for (const { element } of this.collectFields()) {
      const field = element as { formDisabledCallback?: (d: boolean) => void }
      if (typeof field.formDisabledCallback === 'function') field.formDisabledCallback(false)
    }
    super.disconnectedCallback()
  }

  /**
   * 布局策略（优先级：inline > layout）：
   * - inline：form 元素为可换行 flex 行，项间距取 gap（默认 var(--oas-space-4)），
   *   标签强制左侧、label-width 自动（由 form-item 感知本属性自行适配）；
   * - layout="grid"：form 元素为 24 列 grid（gap 生效）；
   * - 其他值（含非法值）回退 vertical 块级。
   * 布局属性变化时通知各 form-item 重刷感知。
   */
  private applyLayout(): void {
    if (!this.form) return
    if (this.hasAttr('inline')) {
      this.form.style.display = 'flex'
      this.form.style.flexWrap = 'wrap'
      this.form.style.alignItems = 'flex-start'
      this.form.style.gap = this.getAttr('gap', 'var(--oas-space-4)')
      // 行内强制标签左侧；布局以 CSS 变量暴露，供消费者/主题层读取
      this.style.setProperty('--oas-form-layout', 'inline')
      this.style.setProperty('--oas-form-label-align', 'left')
    } else {
      this.style.removeProperty('--oas-form-layout')
      const layout = this.getAttr('layout', 'vertical')
      if (layout === 'grid') {
        this.form.style.display = 'grid'
        this.form.style.gridTemplateColumns = 'repeat(24, 1fr)'
        this.form.style.gap = this.getAttr('gap', '0')
        this.style.setProperty('--oas-form-layout', 'grid')
      } else {
        this.form.style.display = 'block'
        this.form.style.flexWrap = ''
        this.form.style.alignItems = ''
        this.form.style.gridTemplateColumns = ''
        this.form.style.gap = ''
        this.style.setProperty('--oas-form-layout', 'vertical')
      }
      // label-align 以 CSS 变量暴露（默认 top），供消费者/主题层读取；form-item 自身走 closest 读取
      const labelAlign = this.getAttr('label-align', 'top')
      if (labelAlign === 'left' || labelAlign === 'right' || labelAlign === 'top') {
        this.style.setProperty('--oas-form-label-align', labelAlign)
      } else {
        this.style.setProperty('--oas-form-label-align', 'top')
      }
    }
    for (const item of this.querySelectorAll('oas-form-item')) {
      ;(item as unknown as { refreshLayout?: () => void }).refreshLayout?.()
    }
  }

  private parseRules(): void {
    const raw = this.getAttribute('rules')
    if (this._rulesProp !== null && raw === this._rulesAttrRaw) {
      // property 通道保留引用语义（宿主原地改顶层键即时生效的既有契约；读点 Object.hasOwn 守卫已兜住原型链穿透）
      this._rules = this._rulesProp
      return
    }
    if (raw !== this._rulesAttrRaw) {
      this._rulesProp = null
      this._rulesAttrRaw = raw
    }
    try {
      const parsed = JSON.parse(raw ?? '{}') as Rules
      // 普通原型拷贝（getter 不暴露 null-proto 对象——宿主 hasOwnProperty/toString 可用）；
      // 继承成员穿透由两个读点的 Object.hasOwn 守卫兜底（null-proto 曾致 el.rules.hasOwnProperty 抛错）
      this._rules = parsed !== null && typeof parsed === 'object' ? Object.assign({}, parsed) : {}
    } catch {
      this._rules = {}
    }
  }

  private parseInitialValues(): void {
    const raw = this.getAttribute('initial-values')
    if (this._initialProp !== null && raw === this._initialAttrRaw) {
      this._initialValues = this._initialProp
      return
    }
    if (raw !== this._initialAttrRaw) {
      this._initialProp = null
      this._initialAttrRaw = raw
    }
    try {
      const parsed = JSON.parse(raw ?? '{}') as unknown
      this._initialValues =
        parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {}
    } catch {
      this._initialValues = {}
    }
  }

  /** 解析校验文案模板（attribute JSON / property 双通道，property 优先，非法 JSON 静默清空） */
  private parseValidateMessages(): void {
    const raw = this.getAttribute('validate-messages')
    if (this._validateMessagesProp !== null && raw === this._validateMessagesAttrRaw) {
      this._validateMessages = this._validateMessagesProp
      return
    }
    if (raw !== this._validateMessagesAttrRaw) {
      this._validateMessagesProp = null
      this._validateMessagesAttrRaw = raw
    }
    try {
      const parsed = JSON.parse(raw ?? '{}') as unknown
      this._validateMessages =
        parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ValidateMessages) : {}
    } catch {
      this._validateMessages = {}
    }
  }

  /**
   * 表级 size 下发：给收集到的字段控件注入 data-form-size（通道属性，不回写字段自身 size）。
   * 字段自身显式 size 优先（跳过不下发）；form size 缺席/非法值时清除下发标记。
   * 字段消费链：自身 size > data-form-size > config-provider 注入 > 默认档。
   */
  private syncSizeToFields(): void {
    const raw = this.getAttribute('size')
    const valid =
      raw != null && raw !== '' && (VALID_FORM_SIZES as readonly string[]).includes(raw) ? (raw as string) : null
    // 尺寸下发面向全部注册控件（含无 name 的展示性控件——不参与值收集但视觉应随表级尺寸）
    const selector = [...FORM_CONTROLS.keys()].join(',')
    for (const element of this.querySelectorAll(selector)) {
      const own = element.getAttribute('size')
      const effective = valid !== null && (own == null || own === '') ? valid : null
      if (effective !== null) element.setAttribute('data-form-size', effective)
      else element.removeAttribute('data-form-size')
      // 动态下发通道：属性变化不触发字段重渲染（data-form-size 不在字段 observedAttributes），
      // form-associated 字段经 formSizeCallback 立即重渲染；其余注册控件兜底 requestUpdate
      const el = element as { formSizeCallback?: (s: string | null) => void; requestUpdate?: () => void }
      if (typeof el.formSizeCallback === 'function') el.formSizeCallback(effective)
      else if (typeof el.requestUpdate === 'function') el.requestUpdate()
    }
  }

  private collectFields(): Array<{ name: string; element: Element }> {
    const fields: Array<{ name: string; element: Element }> = []
    const selector = [...FORM_CONTROLS.keys()].join(',')
    for (const element of this.querySelectorAll(selector)) {
      const name = element.getAttribute('name')
      if (name) fields.push({ name, element })
    }
    return fields
  }

  private readValue(element: Element): string {
    const reader = FORM_CONTROLS.get(element.tagName.toLowerCase()) ?? defaultReader
    return reader(element)
  }

  private writeValue(element: Element, value: string): void {
    const writer = FORM_CONTROL_WRITERS.get(element.tagName.toLowerCase()) ?? defaultWriter
    writer(element, value)
  }

  private snapshotValues(): Record<string, string> {
    const values: Record<string, string> = Object.create(null)
    for (const { name, element } of this.collectFields()) values[name] = this.readValue(element)
    return values
  }

  /** 扁平快照 → 嵌套结构（点路径语法组装；普通名保持原样）。叶子值维持字符串形态不变；
   *  含保留键段（__proto__ 等）的路径被 parseNamePath 拒绝（null）——跳过该字段（不污染原型） */
  private nestValues(flat: Record<string, string>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(flat)) {
      const path = parseNamePath(name)
      if (path === null) continue
      writePath(out, path, value)
    }
    return out
  }

  private stringifyInitial(v: unknown): string {
    if (v === null || v === undefined) return ''
    return typeof v === 'string' ? v : JSON.stringify(v)
  }

  /** 挂载后写入初始值（来源变化或 property 通道写入时重放，平时不碰用户编辑值） */
  private maybeApplyInitialValues(): void {
    const raw = this.getAttribute('initial-values')
    if (!this._initialDirty && raw === this._initialSource) return
    this._initialSnapshot = Object.create(null)
    this.applyInitialToFields(true)
    this._initialSource = raw
    this._initialDirty = false
  }

  /**
   * 按路径读取 initial-values 并写入字段（forceAll=true 全量重建基线；
   * false 只处理基线中还没有的字段——供 oas-form-list 等动态字段容器在创建字段后补放）。
   */
  private applyInitialToFields(forceAll: boolean): void {
    const source = this._initialValues
    for (const { name, element } of this.collectFields()) {
      if (!forceAll && Object.hasOwn(this._initialSnapshot, name)) continue
      // 保留键段路径（__proto__ 等）parseNamePath 判 null——null 不得进 readPath
      // （空数组会让 readPath 返回整个 initial-values 对象，写进字段）
      const path = parseNamePath(name)
      if (path === null) continue
      const v = readPath(source, path)
      const initial = v === undefined ? this.readValue(element) : this.stringifyInitial(v)
      this._initialSnapshot[name] = initial
      if (v !== undefined) this.writeValue(element, initial)
    }
  }

  /**
   * 为「初始值基线建立后才出现的字段」补写 initial-values（oas-form-list 等动态字段容器
   * 在首次创建行后调用）。已有基线的字段不重写（保护用户已编辑值）；表级 disabled 在场时
   * 同步到新字段（行创建晚于表级 syncDisabled 的补位）。无新字段时为安全空操作。
   */
  reapplyInitialValues(): void {
    const disabled = this.hasAttr('disabled')
    for (const { name, element } of this.collectFields()) {
      if (Object.hasOwn(this._initialSnapshot, name)) continue
      const path = parseNamePath(name)
      if (path === null) continue
      const v = readPath(this._initialValues, path)
      const initial = v === undefined ? this.readValue(element) : this.stringifyInitial(v)
      this._initialSnapshot[name] = initial
      if (v !== undefined) this.writeValue(element, initial)
      if (disabled) {
        const field = element as { formDisabledCallback?: (d: boolean) => void }
        if (typeof field.formDisabledCallback === 'function') field.formDisabledCallback(true)
      }
    }
  }

  /** 表单级 disabled 同步到所有字段：经 OASFormElement.formDisabledCallback 通道（字段内部并入 injectDisabled 解析），不回写 disabled 属性防自锁 */
  private syncDisabledToFields(): void {
    const disabled = this.hasAttr('disabled')
    for (const { element } of this.collectFields()) {
      const field = element as { formDisabledCallback?: (d: boolean) => void }
      if (typeof field.formDisabledCallback === 'function') field.formDisabledCallback(disabled)
    }
  }

  /** 字段最终禁用态：form-associated 字段读其 injectDisabled 解析结果（自身 disabled > 表单链路 > provider 注入 > 豁免），未升级元素按属性回退 */
  private isFieldDisabled(element: Element): boolean {
    const field = element as { injectDisabled?: () => boolean }
    if (typeof field.injectDisabled === 'function') return field.injectDisabled()
    return element.hasAttribute('disabled') || this.hasAttr('disabled')
  }

  private effectiveTrigger(name: string): ValidateTrigger {
    for (const rule of (Object.hasOwn(this._rules, name) ? this._rules[name] : undefined) ?? []) {
      if (rule.validateTrigger !== undefined && TRIGGERS.includes(rule.validateTrigger)) return rule.validateTrigger
    }
    const level = this.getAttr('validate-trigger', 'input')
    return TRIGGERS.includes(level as ValidateTrigger) ? (level as ValidateTrigger) : 'input'
  }

  /** 单字段校验（validate-trigger 触发）：只更新该字段错误态，不派发表级事件 */
  private validateFieldByTrigger(name: string, element: Element): void {
    if (this.isFieldDisabled(element)) return
    // 异步竞态防护：连续触发时只认最新一次的结果（慢的旧 Promise 后落地不得覆盖新状态）
    const seq = (this.fieldValidateSeq.get(name) ?? 0) + 1
    this.fieldValidateSeq.set(name, seq)
    const apply = (message: string | null): void => {
      if (message === null) {
        delete this.errors[name]
        element.removeAttribute('aria-invalid')
        this.syncErrorText(element, null)
        return
      }
      this.errors[name] = message
      element.setAttribute('aria-invalid', 'true')
      this.syncErrorText(element, message)
    }
    const result = this.firstFieldError(name, this.snapshotValues())
    if (typeof result === 'string') apply(result)
    else if (result === null) apply(null)
    else
      void result.then((r) => {
        if (this.fieldValidateSeq.get(name) === seq) apply(r)
      })
  }

  /** 单字段首个错误：无 → null；同步 → string；含异步 validator → Promise */
  private firstFieldError(name: string, values: Record<string, string>): string | null | Promise<string | null> {
    const value = values[name] ?? ''
    for (const rule of (Object.hasOwn(this._rules, name) ? this._rules[name] : undefined) ?? []) {
      const result = this.evalRule(rule, value, values)
      if (result !== null) return result
    }
    return null
  }

  /** 单条 rule 求值：required/minLength/maxLength/pattern 先行，validator 最后跑 */
  private evalRule(rule: Rule, value: string, values: Record<string, string>): string | null | Promise<string | null> {
    if (rule.required && value === '') return this.ruleMessage('required', { value }, rule)
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return this.ruleMessage('minLength', { value, min: rule.minLength }, rule)
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return this.ruleMessage('maxLength', { value, max: rule.maxLength }, rule)
    }
    if (rule.pattern && value !== '') {
      try {
        if (!new RegExp(rule.pattern).test(value)) return this.ruleMessage('pattern', { value }, rule)
      } catch {
        // 非法正则视为通过（既有行为）
      }
    }
    if (rule.validator) {
      // 传给宿主 validator 的 values 转普通原型（同 detail 判据）
      const result = rule.validator(value, { ...values })
      const failed = this.validatorFallback(rule)
      const normalize = (r: true | string): string | null => (r === true ? null : typeof r === 'string' ? r : failed)
      if (result instanceof Promise) return result.then(normalize)
      return normalize(result)
    }
    return null
  }

  /** 规则失败文案优先级：rule.message 显式消息 > validate-messages 模板（${min}/${max}/${value} 插值）> locale 默认 */
  private ruleMessage(key: keyof ValidateMessages, params: Record<string, string | number>, rule: Rule): string {
    if (typeof rule.message === 'string' && rule.message !== '') return rule.message
    const tpl = this._validateMessages[key] ?? this._validateMessages.default
    if (typeof tpl === 'string' && tpl !== '') return interpolate(tpl, params)
    return this.t('form.validationFailed')
  }

  /** validator 未返回 string 时的失败文案：rule.message > default 模板 > locale 默认 */
  private validatorFallback(rule: Rule): string {
    if (typeof rule.message === 'string' && rule.message !== '') return rule.message
    const dflt = this._validateMessages.default
    if (typeof dflt === 'string' && dflt !== '') return interpolate(dflt, { value: '' })
    return this.t('form.validationFailed')
  }

  private validateAndSubmit(): void {
    const values = this.snapshotValues()
    this.errors = Object.create(null)
    const fields = this.collectFields()
    // 提交为最高优先级：作废所有在途的字段级异步校验。默认 input 档下每次击键都可能起一笔
    // 异步校验，若用户在它落地前提交，其延迟结果会在 finalize 之后写回，覆盖提交终态
    // （提交通过却仍标红 / 提交失败的错误被静默清掉）——实抓竞态。
    // 用 clear() 而非按 name 逐个 bump：可一并覆盖「在途期间被移除/改名、collectFields 收不到」的字段
    this.fieldValidateSeq.clear()
    const invalid: Array<{ name: string; element: Element; message: string }> = []
    const asyncJobs: Array<{ name: string; element: Element; promise: Promise<string | null> }> = []

    for (const { name, element } of fields) {
      if (this.isFieldDisabled(element)) continue
      const result = this.firstFieldError(name, values)
      if (result === null) continue
      if (typeof result === 'string') invalid.push({ name, element, message: result })
      else asyncJobs.push({ name, element, promise: result })
    }

    if (asyncJobs.length === 0) {
      this.finalizeValidation(values, fields, invalid)
      return
    }
    void Promise.all(asyncJobs.map((job) => job.promise.then((message) => ({ job, message })))).then((resolved) => {
      for (const { job, message } of resolved) {
        if (message !== null) invalid.push({ name: job.name, element: job.element, message })
      }
      // 混合同步/异步 validator 时按字段 DOM 序重排——scroll-to-first-error 的「首错」
      // 必须是文档序第一个错误字段（同步项先入队、异步 append 在后会错位）
      const order = new Map(fields.map((f, i) => [f.name, i]))
      invalid.sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0))
      this.finalizeValidation(values, fields, invalid)
    })
  }

  /** 校验收尾：aria/错误文案同步 → 派发事件 → scroll-to-first-error 定位 */
  private finalizeValidation(
    values: Record<string, string>,
    fields: Array<{ name: string; element: Element }>,
    invalid: Array<{ name: string; element: Element; message: string }>,
  ): void {
    this.errors = Object.create(null)
    for (const { name, message } of invalid) this.errors[name] = message
    for (const { name, element } of fields) {
      const bad = Object.hasOwn(this.errors, name)
      if (bad) element.setAttribute('aria-invalid', 'true')
      else element.removeAttribute('aria-invalid')
      this.syncErrorText(element, bad ? this.errors[name]! : null)
    }
    if (invalid.length === 0) {
      this.emit('submit', { values: this.nestValues(values) })
    } else {
      // 载荷出包转普通原型（宿主对 detail.errors 调 hasOwnProperty/toString 不应炸——与 el.rules getter 同判据）
      this.emit('validate-fail', { errors: { ...this.errors }, values: this.nestValues(values) })
      if (this.hasAttr('scroll-to-first-error')) this.revealField(invalid[0]!.element)
    }
  }

  /** 聚焦首个错误字段控件并滚动进视口；prefers-reduced-motion 时瞬跳 */
  private revealField(element: Element): void {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    ;(element as HTMLElement).focus?.({ preventScroll: true })
    element.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  }

  /** 值变化统一出口：派发 oas-values-change（values 为全表当前值快照，嵌套结构） */
  private emitValuesChange(name: string | null, value: string): void {
    if (!name) return
    const flat = this.snapshotValues()
    this.emit('values-change', { name, value, values: this.nestValues(flat) })
  }

  /**
   * 同步错误提示。字段被 oas-form-item 包裹时写入 form-item 的错误位（shadow 内更新）；
   * 裸字段保持既有行为——在字段 host 后插入内联 token 样式 div（自动跟随暗色/高对比主题）。
   * 校验失败时插入/更新，通过时移除。
   */
  private syncErrorText(element: Element, message: string | null): void {
    const item = element.closest('oas-form-item') as (Element & { setError?: (m: string | null) => void }) | null
    if (item?.setError) {
      item.setError(message)
      return
    }
    const next = element.nextElementSibling
    const existing = next && next.classList.contains('error-text') ? (next as HTMLElement) : null
    if (message === null) {
      existing?.remove()
      return
    }
    const el = existing ?? document.createElement('div')
    if (!existing) {
      el.className = 'error-text'
      el.style.color = 'var(--oas-color-danger)'
      el.style.fontSize = 'var(--oas-font-size-sm)'
      el.style.marginTop = 'var(--oas-space-1)'
      element.insertAdjacentElement('afterend', el)
    }
    el.textContent = message
  }

  getErrors(): Record<string, string> {
    return { ...this.errors }
  }

  /**
   * 公开提交入口：委托内部 form 的 requestSubmit()。
   *
   * shadow 边界内包 `<form part="form">` 后，light DOM 的按钮（含 oas-button）不再具备原生
   * submit 语义；宿主请在按钮点击等时机调用本方法。走 requestSubmit 而非直接调
   * validateAndSubmit，以保留原生 submit 事件与 submitter 语义（内部 listener 统一在
   * `submit` 事件上做校验与派发 oas-submit / oas-validate-fail）。
   */
  submit(): void {
    this.form?.requestSubmit()
  }

  /** 重置回初始值（与 form-associated reset 基线语义一致：回初始值、清除校验错误态、不派发任何事件） */
  reset(): void {
    const fields = this.collectFields()
    // 同提交：作废在途字段级异步校验（clear 覆盖全部，含移除/改名字段），避免其延迟结果在重置后再写回（幽灵错误态）
    this.fieldValidateSeq.clear()
    for (const { name, element } of fields) {
      this.writeValue(element, this._initialSnapshot[name] ?? '')
    }
    this.errors = Object.create(null)
    for (const { element } of fields) {
      element.removeAttribute('aria-invalid')
      this.syncErrorText(element, null)
    }
  }
}
