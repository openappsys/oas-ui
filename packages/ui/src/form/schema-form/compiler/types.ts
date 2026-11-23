/**
 * schema-form 编译层类型（纯数据，无 JSX / 无 DOM 依赖）。
 *
 * 三层契约：数据 schema（JSON Schema 子集）/ UI 注解层（widget / layout / options / reactions）/
 * 联动注解（whenSchema + target + fulfill）。编译一次产出渲染计划（RenderPlan），
 * 运行期只做定向刷新。
 */

import type { ExprProgram } from './expr.js'

/** V1 冻结关键字子集（新增关键字先改设计稿） */
export interface JsonSchema {
  $ref?: string
  $defs?: Record<string, unknown>
  definitions?: Record<string, unknown>
  type?: string | string[]
  format?: string
  enum?: unknown[]
  const?: unknown
  default?: unknown
  title?: string
  description?: string
  required?: string[]
  minLength?: number
  maxLength?: number
  pattern?: string
  items?: unknown
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  properties?: Record<string, unknown>
  if?: unknown
  then?: unknown
  else?: unknown
  [key: string]: unknown
}

/** UI 注解层节点（裸键，无 `ui:` 前缀） */
export interface UiNode {
  widget?: string
  layout?: {
    /** 栅格占列（1-24，oas-form layout=grid 时生效） */
    span?: number
    /** 分组容器（对象节点） */
    type?: 'group' | 'tabs'
    title?: string
    tabs?: Array<{ key: string; title: string; fields?: string[] }>
  }
  options?: Record<string, unknown>
  reactions?: unknown[]
  /** visible:false 时保留值（默认卸载并清值） */
  keepValueOnHidden?: boolean
  [key: string]: unknown
}

/** 联动效果词表（V1 封闭：visible / disabled / required；value 保留但未实现） */
export interface ReactionEffects {
  visible?: boolean
  disabled?: boolean
  required?: boolean
}

export interface CompiledReaction {
  /** 稳定标识（源路径 + 序号），用于去重与调试 */
  key: string
  /** 源字段路径（reactions 挂在源字段的 uiSchema 节点上），`[]` 为数组通配 */
  sourcePath: string
  /** 条件作用域：`$self` 已在编译期解析为 sourcePath（表达式轨同样取源字段路径） */
  scope: string
  /** 条件 schema（已展开 $ref）——`conditionKind: 'expr'` 时为空对象占位 */
  condition: JsonSchema
  /** 条件轨：`'schema'` = whenSchema（缺省）；`'expr'` = when 受限表达式 */
  conditionKind?: 'schema' | 'expr'
  /** 表达式 AST（`conditionKind === 'expr'`）；求值器按源字段值解析 `$self` */
  expr?: ExprProgram
  /** 依赖的字段路径（含通配），驱动依赖图定向刷新；宿主函数轨道为空 + `dynamic` */
  deps: string[]
  /** 依赖面不可静态提取（用到宿主注册函数）：任何值变化都重算该条 reaction */
  dynamic?: boolean
  /** 作用目标（含通配），多 target 展开 */
  targets: string[]
  fulfill: ReactionEffects
  /** 显式 otherwise；缺省键回落静态注解值（幂等、与求值顺序无关） */
  otherwise: ReactionEffects
}

/** 单字段校验关键字（编译产物，供迷你校验器按序求值） */
export interface FieldRules {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  enum?: unknown[]
  const?: unknown
  /** if/then/else 条件（条件成立时叠加 then 的校验） */
  condition?: { if: JsonSchema; then?: JsonSchema; else?: JsonSchema }
}

export interface WidgetSpec {
  tag: string
  props: Record<string, string>
}

interface NodeBase {
  /** keyed 复用稳定键（根路径 / 容器路径 + 类型） */
  key: string
  /** 绝对路径（数组行内为 `users.{index}.name` 形式；展示与调试口径） */
  path: string
  label: string
  help?: string
  /** 静态注解值（reactions 的 otherwise 缺省回落目标） */
  staticVisible: boolean
  staticDisabled: boolean
  staticRequired: boolean
  /** visible:false 时保留值（数组行内默认保留键位，见 ArrayNode） */
  keepValueOnHidden: boolean
  /** 栅格占列（1-24） */
  span?: number
}

export interface FieldPlan extends NodeBase {
  kind: 'field'
  /** 渲染用 name 属性（数组行内为裸相对名 `name` / `address.city`） */
  name: string
  widget: WidgetSpec
  schema: JsonSchema
  rules: FieldRules
  /** 数组内字段：隐藏时保留键位（空串）而非删键 */
  inArrayRow: boolean
}

export interface GroupPlan extends NodeBase {
  kind: 'group'
  children: PlanNode[]
}

export interface TabsPlan extends NodeBase {
  kind: 'tabs'
  tabs: Array<{ key: string; title: string; children: PlanNode[] }>
}

export interface ArrayRules {
  required?: boolean
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
}

export interface ArrayPlan extends NodeBase {
  kind: 'array'
  /** form-list 的 name（根数组 `users`，嵌套数组 `matrix.{index}`） */
  name: string
  items: JsonSchema
  /** 行内子节点（name 为裸相对名，由 form-list 自动加前缀） */
  children: PlanNode[]
  arrayRules: ArrayRules
}

export type PlanNode = FieldPlan | GroupPlan | TabsPlan | ArrayPlan

export interface CompileResult {
  plan: PlanNode[]
  /** schema `default` 汇总出的嵌套初始值（宿主 initialValues 优先） */
  defaults: Record<string, unknown>
  reactions: CompiledReaction[]
  warnings: string[]
  /** 编译失败（schema 非法 / 循环 $ref）时的可展示原因；plan 为空 */
  error?: string
}
