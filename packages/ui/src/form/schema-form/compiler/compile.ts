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
  TableColumn,
  UiNode,
  ValueTransformPlan,
} from './types.js'
import { resolveSchemaRefs } from './refs.js'
import { canonicalDslPath, parseDslPath, WILDCARD } from './path.js'
import { isObjectArray, resolveWidget, resolveWidgetOverride, schemaType } from './widgets.js'
import { FORMATS } from './validate.js'
import { compileReactions, type UiReactionSource } from './reactions.js'

const UI_KEYS = new Set([
  'widget',
  'layout',
  'options',
  'reactions',
  'keepValueOnHidden',
  // 值变换双钩子（V2 批 2）：裸键，注册名由 registerSchemaConverter / registerSchemaTransformer 解析
  'convert',
  'transform',
  // array-table 列级注解（仅表格数组的直接列消费；其它节点出现即告警忽略）
  'width',
  'align',
  'hidden',
])

/** V2 未承接的数据 schema 关键字：显式告知（其余未知关键字按 JSON Schema 放行） */
const V2_SCHEMA_KEYS = ['convertValue', 'transform', 'dataSource'] as const

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

/** 保留键段：原型污染面（JSON.parse 的 `__proto__` 是自有键，直接赋值会改写原型） */
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

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
      // 保留键段整段跳过：`out['__proto__'] = ...` 会改写结果对象原型（宿主 schema 来自 JSON）
      if (RESERVED_KEYS.has(key)) continue
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
  transforms: ValueTransformPlan[]
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

/**
 * 采集值变换钩子（`convert` / `transform` 注册名）：只对**叶子字段**有效——
 * convert 的输出是组件值字符串，作用于容器（对象/数组）没有语义落点，命中即告警忽略。
 */
function collectValueHooks(ctx: BuildContext, path: string, ui: UiNode | null): void {
  if (!ui) return
  const entry: ValueTransformPlan = { path }
  if (ui.convert !== undefined) {
    if (typeof ui.convert === 'string' && ui.convert !== '') entry.convert = ui.convert
    else ctx.warnings.push(`uiSchema.convert 必须是注册名（非空字符串），已忽略（${path}）`)
  }
  if (ui.transform !== undefined) {
    if (typeof ui.transform === 'string' && ui.transform !== '') entry.transform = ui.transform
    else ctx.warnings.push(`uiSchema.transform 必须是注册名（非空字符串），已忽略（${path}）`)
  }
  if (entry.convert !== undefined || entry.transform !== undefined) ctx.transforms.push(entry)
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
  collectValueHooks(ctx, path, ui)
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
  table = false,
): ArrayPlan {
  const items = (isPlainObject(schema.items) ? schema.items : {}) as JsonSchema
  const itemNamePrefix = ''
  const itemPathPrefix = `${path}.[]`
  const children: PlanNode[] = []
  const columns: TableColumn[] = []
  if (isObjectArray(schema)) {
    const requiredKeys = new Set(
      Array.isArray(items.required) ? items.required.filter((k): k is string => typeof k === 'string') : [],
    )
    const props = isPlainObject(items.properties) ? (items.properties as Record<string, JsonSchema>) : {}
    for (const [childKey, childSchema] of Object.entries(props)) {
      const childNodes = buildChild(
        childSchema,
        ctx,
        itemNamePrefix,
        itemPathPrefix,
        childKey,
        requiredKeys.has(childKey),
        true,
        table,
      )
      children.push(...childNodes)
      if (table) {
        const columnUi = uiAt(ctx, joinPath(itemPathPrefix, childKey))
        columns.push({
          key: childKey,
          label: labelOf(childSchema, childKey, columnUi),
          width: columnUi?.width,
          align:
            columnUi?.align === 'center' || columnUi?.align === 'right'
              ? columnUi.align
              : columnUi?.align === 'left'
                ? 'left'
                : undefined,
          hidden: columnUi?.hidden === true,
        })
      }
    }
  }
  collectReactions(ctx, path, ui)
  return {
    kind: 'array',
    key: `array:${path}`,
    path,
    // 数组 list 一律用**裸相对名**：外层 form-list 会按「自己的完整名 + 行号」加前缀，
    // 嵌套 list 运行时名因此已是完整路径（`users.0.matrix`），逐层成立。
    // 注：设计稿示例的 `matrix.{index}` 会让外层替换成 `matrix.0`、丢掉父级前缀，
    // 实测会产生 `matrix.0.0.label`（缺少 users.0），故按「内层 list 自带前缀」的语义取裸名。
    name,
    label: labelOf(schema, key, ui),
    help: helpOf(schema),
    items,
    children,
    arrayRules: arrayRulesOf(schema, required),
    table: table || undefined,
    columns: table ? columns : undefined,
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
  inTableColumn = false,
): PlanNode[] {
  const name = joinName(namePrefix, key)
  const path = joinPath(pathPrefix, key)
  const ui = uiAt(ctx, path)
  if (ui) {
    for (const unknownKey of Object.keys(ui)) {
      if (!UI_KEYS.has(unknownKey)) {
        ctx.warnings.push(`uiSchema 节点含未知键 "${unknownKey}"（${path}）`)
      }
    }
    if (!inTableColumn && (ui.width !== undefined || ui.align !== undefined || ui.hidden !== undefined)) {
      ctx.warnings.push(`uiSchema 列级注解（width / align / hidden）仅对 array-table 的直接列生效，已忽略（${path}）`)
    }
  }
  for (const v2Key of V2_SCHEMA_KEYS) {
    if (schema[v2Key] !== undefined) {
      ctx.warnings.push(`schema.${v2Key} 不属于 V1/V2 冻结关键字，已忽略（${path}）`)
    }
  }
  const type = effectiveType(schema)
  if (
    (ui?.convert !== undefined || ui?.transform !== undefined) &&
    (type === 'object' || type === 'array') &&
    resolveWidgetOverride(ui?.widget) === null
  ) {
    ctx.warnings.push(`uiSchema.convert / transform 仅对叶子字段生效，容器节点已忽略（${path}）`)
  }
  // 行内编辑表格：对象数组 + `widget: 'array-table'` 走表格容器（其余形态在 resolveWidget 里告警回落）
  if (ui?.widget === 'array-table' && type === 'array' && isObjectArray(schema)) {
    return [buildArray(schema, ctx, name, path, key, ui, required, true)]
  }
  // uiSchema.widget 覆盖优先于容器判定：object / 对象数组被 widget 接管时按单控件渲染
  //（matrix 的值是对象，没有这条通道就只会渲染成分组容器、控件永远不出现）
  const overridden = resolveWidgetOverride(ui?.widget) !== null

  if (type === 'object' && !overridden) {
    return [buildObject(schema, ctx, name, path, key, ui, required, inArrayRow)]
  }
  if (type === 'array' && isObjectArray(schema) && !overridden) {
    return [buildArray(schema, ctx, name, path, key, ui, required)]
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
        ctx.warnings.push(`标签页布局（layout.tabs）未覆盖字段 [${rest.join(', ')}]（${path}），已并入首个标签页`)
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
    ctx.warnings.push(`标签页布局（layout.type='tabs'）未提供有效 tabs（${path}），已按分组容器渲染`)
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

/** 表达式轨的字段存在性判定（数据 schema 面；数组下标与通配均落到 items） */
function pathExistsInSchema(root: JsonSchema, path: string): boolean {
  const segments = parseDslPath(path)
  if (segments === null) return false
  let node: JsonSchema = root
  for (const segment of segments) {
    if (segment === WILDCARD || /^\d+$/.test(segment)) {
      if (!isPlainObject(node.items)) return false
      node = node.items as JsonSchema
      continue
    }
    const props = node.properties
    if (!isPlainObject(props) || !Object.hasOwn(props, segment)) return false
    node = props[segment] as JsonSchema
  }
  return true
}

/** 编译入口 */
export function compileSchema(rawSchema: unknown, rawUiSchema?: unknown, options: CompileOptions = {}): CompileResult {
  const warnings: string[] = []
  const warn = (message: string): void => {
    warnings.push(message)
  }
  // 告警统一在返回前一次性投递（去重保序）：既有实现里大量告警经 ctx.warnings 直接入数组，
  // 逐点回调会漏投——统一出口保证「编译告警 = devWarn」口径一致（V1b 表达式/自定义 widget 依赖它）。
  const finish = (result: CompileResult): CompileResult => {
    for (const message of new Set(warnings)) options.onWarn?.(message)
    return result
  }

  const expanded = resolveSchemaRefs(rawSchema)
  for (const warning of expanded.warnings) warn(warning)
  if (expanded.schema === null) {
    const error = expanded.errors.join('；') || 'schema 非法'
    warn(`schema 编译失败：${error}`)
    return finish({ plan: [], defaults: {}, reactions: [], transforms: [], warnings, error })
  }
  const schema = expanded.schema

  const rootType = effectiveType(schema)
  if (rootType !== 'object') {
    warn('schema 根节点必须是 object（V1 表单根是字段集合）')
    return finish({
      plan: [],
      defaults: {},
      reactions: [],
      transforms: [],
      warnings,
      error: 'schema 根节点必须是 object',
    })
  }

  const ctx: BuildContext = {
    uiMap: parseUiSchema(rawUiSchema, warnings),
    uiUsed: new Set(),
    warnings,
    reactions: [],
    transforms: [],
  }

  const rootPath = ''
  const props = isPlainObject(schema.properties) ? (schema.properties as Record<string, JsonSchema>) : {}
  const requiredKeys = new Set(
    Array.isArray(schema.required) ? schema.required.filter((k): k is string => typeof k === 'string') : [],
  )
  const plan: PlanNode[] = []
  // 根路径（''）没有合法书写面（parseDslPath 把空路径判为非法），故不支持根级 uiSchema 注解；
  // 用户写 `''` 会在 parseUiSchema 处得到「路径非法」告警——reactions 必须挂在具名字段上。
  for (const [key, childSchema] of Object.entries(props)) {
    plan.push(...buildChild(childSchema, ctx, '', rootPath, key, requiredKeys.has(key), false))
  }

  // uiSchema 对齐校验：未被任何节点消费的路径 → 数据 schema 里不存在（拼写错误防静默失效）
  for (const path of ctx.uiMap.keys()) {
    if (!ctx.uiUsed.has(path)) warn(`uiSchema 路径在数据 schema 中不存在："${path}"（注解不会生效）`)
  }

  const reactionWarnings: string[] = []
  const reactions = compileReactions(ctx.reactions, reactionWarnings, {
    pathExists: (path) => pathExistsInSchema(schema, path),
  })
  for (const warning of reactionWarnings) warn(warning)

  const defaultsRaw = collectDefaults(schema)
  const defaults = isPlainObject(defaultsRaw) ? defaultsRaw : {}

  return finish({ plan, defaults, reactions, transforms: ctx.transforms, warnings })
}

/** 路径工具再导出（组件/测试共用同一实现，避免口径漂移） */
export { canonicalDslPath, parseDslPath, pathPatternMatches, WILDCARD } from './path.js'
