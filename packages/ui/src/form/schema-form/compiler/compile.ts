/**
 * 编译层入口：schema + uiSchema（一次编译）→ 渲染计划 RenderPlan。
 *
 * 职责：$ref 急切展开 / 路径归一 / uiSchema 对齐校验（路径存在性 + 未知键 devWarn）/
 * 默认 widget 映射 / 字段校验关键字编译 / reactions 编译 / 嵌套数组名约定 / schema default 汇总。
 * 纯函数：无 DOM、无组件实例依赖（node 环境可直接单测）。
 */
import type {
  ArrayPlan,
  ArrayRules,
  CompileResult,
  FieldPlan,
  FieldRules,
  GroupPlan,
  JsonSchema,
  PlanNode,
  UiNode,
} from './types.js'
import { resolveSchemaRefs } from './refs.js'
import { canonicalDslPath, parseDslPath, WILDCARD } from './path.js'
import { isObjectArray, resolveWidget, schemaType } from './widgets.js'
import { FORMATS } from './validate.js'
import { compileReactions, type UiReactionSource } from './reactions.js'

const UI_KEYS = new Set(['widget', 'layout', 'options', 'reactions', 'keepValueOnHidden'])
const INDEX_PLACEHOLDER = '{index}'

export interface CompileOptions {
  /** devWarn 出口（编译告警：未知 widget / uiSchema 路径不存在 / reactions 词表越界等） */
  onWarn?: (message: string) => void
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 有效类型：显式 type 优先，其次按 properties / items 推断 */
function effectiveType(schema: JsonSchema): string | null {
  const declared = schemaType(schema)
  if (declared !== null) return declared
  if (isPlainObject(schema.properties)) return 'object'
  if (schema.items !== undefined) return 'array'
  return null
}

function joinName(prefix: string, key: string): string {
  return prefix === '' ? key : `${prefix}.${key}`
}

function joinPath(prefix: string, key: string): string {
  return prefix === '' ? key : `${prefix}.${key}`
}

/** 标签：schema title 优先，否则用字段键（不伪造文案） */
function labelOf(schema: JsonSchema, key: string, ui: UiNode | null): string {
  if (typeof ui?.layout?.title === 'string' && ui.layout.title !== '') return ui.layout.title
  if (typeof schema.title === 'string' && schema.title !== '') return schema.title
  return key
}

function helpOf(schema: JsonSchema): string | undefined {
  return typeof schema.description === 'string' && schema.description !== '' ? schema.description : undefined
}

function spanOf(ui: UiNode | null): number | undefined {
  const raw = ui?.layout?.span
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 24) return undefined
  return raw
}

function staticDisabled(ui: UiNode | null): boolean {
  const raw = ui?.options?.disabled
  return raw === true || raw === 'true' || raw === ''
}

/** 字段校验关键字编译（invalid pattern 只告警不阻断，其余关键字原样带出） */
function compileRules(schema: JsonSchema, required: boolean, warnings: string[], path: string): FieldRules {
  const rules: FieldRules = {}
  if (required) rules.required = true
  if (typeof schema.minLength === 'number') rules.minLength = schema.minLength
  if (typeof schema.maxLength === 'number') rules.maxLength = schema.maxLength
  if (typeof schema.pattern === 'string') {
    try {
      new RegExp(schema.pattern)
      rules.pattern = schema.pattern
    } catch {
      warnings.push(`schema.pattern 非法正则已忽略（${path}）：${schema.pattern}`)
    }
  }
  if (typeof schema.format === 'string') {
    if ((FORMATS as readonly string[]).includes(schema.format)) rules.format = schema.format
    else warnings.push(`schema.format 不在 V1 冻结清单（${path}）：${schema.format}`)
  }
  if (Array.isArray(schema.enum)) rules.enum = schema.enum
  if (schema.const !== undefined) rules.const = schema.const
  if (schema.if !== undefined) {
    rules.condition = { if: schema.if as JsonSchema, then: schema.then as JsonSchema, else: schema.else as JsonSchema }
  }
  return rules
}

function arrayRulesOf(schema: JsonSchema, required: boolean): ArrayRules {
  const rules: ArrayRules = {}
  if (required) rules.required = true
  if (typeof schema.minItems === 'number') rules.minItems = schema.minItems
  if (typeof schema.maxItems === 'number') rules.maxItems = schema.maxItems
  if (schema.uniqueItems === true) rules.uniqueItems = true
  return rules
}

/** schema `default` 汇总为嵌套初始值（宿主 initialValues 优先，见组件） */
function collectDefaults(schema: unknown): unknown {
  if (!isPlainObject(schema)) return undefined
  const s = schema as JsonSchema
  if (s.default !== undefined) return s.default
  const type = effectiveType(s)
  if (type === 'object' && isPlainObject(s.properties)) {
    const out: Record<string, unknown> = {}
    let has = false
    for (const [key, child] of Object.entries(s.properties)) {
      const value = collectDefaults(child)
      if (value !== undefined) {
        out[key] = value
        has = true
      }
    }
    return has ? out : undefined
  }
  if (type === 'array') return undefined
  return undefined
}

interface BuildContext {
  uiMap: Map<string, UiNode>
  uiUsed: Set<string>
  warnings: string[]
  reactions: UiReactionSource[]
}

/** uiSchema 路径查找（规范化键；不存在返回 null） */
function uiAt(ctx: BuildContext, path: string): UiNode | null {
  const canonical = canonicalDslPath(path)
  if (canonical === null) return null
  const node = ctx.uiMap.get(canonical)
  if (!node) return null
  ctx.uiUsed.add(canonical)
  return node
}

/** 采集该 ui 节点的 reactions（挂在节点自身；数组通配路径原样保留） */
function collectReactions(ctx: BuildContext, path: string, ui: UiNode | null): void {
  if (!ui || !Array.isArray(ui.reactions) || ui.reactions.length === 0) return
  ctx.reactions.push({ path, reactions: ui.reactions })
}

/** 构建字段节点 */
function buildField(
  schema: JsonSchema,
  ctx: BuildContext,
  name: string,
  path: string,
  key: string,
  ui: UiNode | null,
  required: boolean,
  inArrayRow: boolean,
): FieldPlan | null {
  const widget = resolveWidget(schema, { widget: ui?.widget, options: ui?.options }, path, ctx.warnings)
  if (!widget) return null
  collectReactions(ctx, path, ui)
  return {
    kind: 'field',
    key: `field:${path}`,
    path,
    name,
    label: labelOf(schema, key, ui),
    help: helpOf(schema),
    widget,
    schema,
    rules: compileRules(schema, required, ctx.warnings, path),
    staticVisible: true,
    staticDisabled: staticDisabled(ui),
    staticRequired: required,
    keepValueOnHidden: ui?.keepValueOnHidden === true,
    span: spanOf(ui),
    inArrayRow,
  }
}

/** 构建数组节点（对象数组 → form-list；行内字段名裸名，由 form-list 加前缀） */
function buildArray(
  schema: JsonSchema,
  ctx: BuildContext,
  name: string,
  path: string,
  key: string,
  ui: UiNode | null,
  required: boolean,
  nested: boolean,
): ArrayPlan {
  const items = (isPlainObject(schema.items) ? schema.items : {}) as JsonSchema
  const itemNamePrefix = ''
  const itemPathPrefix = `${path}.[]`
  const children: PlanNode[] = []
  if (isObjectArray(schema)) {
    const requiredKeys = new Set(
      Array.isArray(items.required) ? items.required.filter((k): k is string => typeof k === 'string') : [],
    )
    const props = isPlainObject(items.properties) ? (items.properties as Record<string, JsonSchema>) : {}
    for (const [childKey, childSchema] of Object.entries(props)) {
      children.push(
        ...buildChild(childSchema, ctx, itemNamePrefix, itemPathPrefix, childKey, requiredKeys.has(childKey), true),
      )
    }
  }
  collectReactions(ctx, path, ui)
  return {
    kind: 'array',
    key: `array:${path}`,
    path,
    // 嵌套数组（行内）：模板名带 {index}，外层 form-list 替换为行号；根数组用裸名（form-list 自带前缀）
    name: nested ? `${name}.${INDEX_PLACEHOLDER}` : name,
    label: labelOf(schema, key, ui),
    help: helpOf(schema),
    items,
    children,
    arrayRules: arrayRulesOf(schema, required),
    staticVisible: true,
    staticDisabled: staticDisabled(ui),
    staticRequired: required,
    // 数组行内字段卸载保留键位（PRD 写死）；数组容器自身的保留策略跟随注解
    keepValueOnHidden: ui?.keepValueOnHidden === true,
    span: spanOf(ui),
  }
}

/** 构造单个子节点（对象属性 / 数组项） */
function buildChild(
  schema: JsonSchema,
  ctx: BuildContext,
  namePrefix: string,
  pathPrefix: string,
  key: string,
  required: boolean,
  inArrayRow: boolean,
): PlanNode[] {
  const name = joinName(namePrefix, key)
  const path = joinPath(pathPrefix, key)
  const ui = uiAt(ctx, path)
  if (ui) {
    for (const unknownKey of Object.keys(ui)) {
      if (!UI_KEYS.has(unknownKey)) ctx.warnings.push(`uiSchema 节点含未知键 "${unknownKey}"（${path}）`)
    }
  }
  const type = effectiveType(schema)

  if (type === 'object') {
    return [buildObject(schema, ctx, name, path, key, ui, required, inArrayRow)]
  }
  if (type === 'array' && isObjectArray(schema)) {
    return [buildArray(schema, ctx, name, path, key, ui, required, inArrayRow)]
  }
  const field = buildField(schema, ctx, name, path, key, ui, required, inArrayRow)
  return field ? [field] : []
}

/** 对象节点：默认分组容器；`layout.type='tabs'` 时产出标签页容器 */
function buildObject(
  schema: JsonSchema,
  ctx: BuildContext,
  name: string,
  path: string,
  key: string,
  ui: UiNode | null,
  required: boolean,
  inArrayRow: boolean,
): PlanNode {
  const props = isPlainObject(schema.properties) ? (schema.properties as Record<string, JsonSchema>) : {}
  const requiredKeys = new Set(
    Array.isArray(schema.required) ? schema.required.filter((k): k is string => typeof k === 'string') : [],
  )
  const childPathPrefix = path
  const childNamePrefix = name
  const buildOne = (childKey: string): PlanNode[] =>
    buildChild(
      props[childKey]!,
      ctx,
      childNamePrefix,
      childPathPrefix,
      childKey,
      requiredKeys.has(childKey),
      inArrayRow,
    )

  collectReactions(ctx, path, ui)

  if (ui?.layout?.type === 'tabs') {
    const tabsRaw = Array.isArray(ui.layout.tabs) ? ui.layout.tabs : []
    const tabs: Array<{ key: string; title: string; children: PlanNode[] }> = []
    const used = new Set<string>()
    for (const tab of tabsRaw) {
      if (!tab || typeof tab.key !== 'string') continue
      const keys = Array.isArray(tab.fields)
        ? tab.fields.filter((k): k is string => typeof k === 'string' && Object.hasOwn(props, k))
        : []
      const children: PlanNode[] = []
      for (const childKey of keys) {
        if (used.has(childKey)) continue
        used.add(childKey)
        children.push(...buildOne(childKey))
      }
      tabs.push({ key: tab.key, title: typeof tab.title === 'string' ? tab.title : tab.key, children })
    }
    // 未被任何标签页列出的字段并入首个标签页（不静默丢字段；空 tabs 场景退化为分组）
    if (tabs.length > 0) {
      const rest = Object.keys(props).filter((childKey) => !used.has(childKey))
      if (rest.length > 0) {
        ctx.warnings.push(`layout.tabs 未覆盖字段 [${rest.join(', ')}]（${path}），已并入首个标签页`)
        for (const childKey of rest) tabs[0]!.children.push(...buildOne(childKey))
      }
      return {
        kind: 'tabs',
        key: `tabs:${path}`,
        path,
        label: labelOf(schema, key, ui),
        help: helpOf(schema),
        tabs,
        staticVisible: true,
        staticDisabled: staticDisabled(ui),
        staticRequired: required,
        keepValueOnHidden: ui?.keepValueOnHidden === true,
        span: spanOf(ui),
      }
    }
    ctx.warnings.push(`layout.type='tabs' 未提供有效 tabs（${path}），已按分组容器渲染`)
  }

  const children: PlanNode[] = []
  for (const childKey of Object.keys(props)) children.push(...buildOne(childKey))
  const group: GroupPlan = {
    kind: 'group',
    key: `group:${path}`,
    path,
    label: labelOf(schema, key, ui),
    help: helpOf(schema),
    children,
    staticVisible: true,
    staticDisabled: staticDisabled(ui),
    staticRequired: required,
    keepValueOnHidden: ui?.keepValueOnHidden === true,
    span: spanOf(ui),
  }
  return group
}

/** uiSchema 解析：非法形态静默回落空注解（不阻断编译，但告警） */
function parseUiSchema(raw: unknown, warnings: string[]): Map<string, UiNode> {
  const map = new Map<string, UiNode>()
  if (raw === undefined || raw === null) return map
  if (!isPlainObject(raw)) {
    warnings.push('uiSchema 必须是对象（路径 → 注解），已按空注解处理')
    return map
  }
  for (const [path, node] of Object.entries(raw)) {
    const canonical = canonicalDslPath(path)
    if (canonical === null) {
      warnings.push(`uiSchema 路径非法："${path}"（保留键段或语法错误），已忽略`)
      continue
    }
    if (!isPlainObject(node)) {
      warnings.push(`uiSchema["${path}"] 必须是对象注解，已忽略`)
      continue
    }
    map.set(canonical, node as UiNode)
  }
  return map
}

/** 编译入口 */
export function compileSchema(rawSchema: unknown, rawUiSchema?: unknown, options: CompileOptions = {}): CompileResult {
  const warnings: string[] = []
  const warn = (message: string): void => {
    warnings.push(message)
    options.onWarn?.(message)
  }

  const expanded = resolveSchemaRefs(rawSchema)
  for (const warning of expanded.warnings) warn(warning)
  if (expanded.schema === null) {
    const error = expanded.errors.join('；') || 'schema 非法'
    warn(`schema 编译失败：${error}`)
    return { plan: [], defaults: {}, reactions: [], warnings, error }
  }
  const schema = expanded.schema

  const rootType = effectiveType(schema)
  if (rootType !== 'object') {
    warn('schema 根节点必须是 object（V1 表单根是字段集合）')
    return { plan: [], defaults: {}, reactions: [], warnings, error: 'schema 根节点必须是 object' }
  }

  const ctx: BuildContext = {
    uiMap: parseUiSchema(rawUiSchema, warnings),
    uiUsed: new Set(),
    warnings,
    reactions: [],
  }

  const rootPath = ''
  const props = isPlainObject(schema.properties) ? (schema.properties as Record<string, JsonSchema>) : {}
  const requiredKeys = new Set(
    Array.isArray(schema.required) ? schema.required.filter((k): k is string => typeof k === 'string') : [],
  )
  const plan: PlanNode[] = []
  const rootUi = uiAt(ctx, '')
  collectReactions(ctx, '', rootUi)
  for (const [key, childSchema] of Object.entries(props)) {
    plan.push(...buildChild(childSchema, ctx, '', rootPath, key, requiredKeys.has(key), false))
  }

  // uiSchema 对齐校验：未被任何节点消费的路径 → 数据 schema 里不存在（拼写错误防静默失效）
  for (const path of ctx.uiMap.keys()) {
    if (!ctx.uiUsed.has(path)) warn(`uiSchema 路径在数据 schema 中不存在："${path}"（注解不会生效）`)
  }

  const reactionWarnings: string[] = []
  const reactions = compileReactions(ctx.reactions, reactionWarnings)
  for (const warning of reactionWarnings) warn(warning)

  const defaultsRaw = collectDefaults(schema)
  const defaults = isPlainObject(defaultsRaw) ? defaultsRaw : {}

  return { plan, defaults, reactions, warnings }
}

/** 路径工具再导出（组件/测试共用同一实现，避免口径漂移） */
export { canonicalDslPath, parseDslPath, pathPatternMatches, WILDCARD } from './path.js'
