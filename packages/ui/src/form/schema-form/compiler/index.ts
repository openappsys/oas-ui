/**
 * schema-form 编译层公共出口（纯函数，无 DOM 依赖）。
 */
export { compileSchema } from './compile.js'
export type { CompileOptions } from './compile.js'
export { resolveSchemaRefs } from './refs.js'
export type { RefExpandResult } from './refs.js'
export {
  canonicalDslPath,
  hasWildcard,
  joinDslPath,
  parseDslPath,
  pathDependencyMatches,
  pathPatternMatches,
  WILDCARD,
} from './path.js'
export {
  checkFormat,
  deepEqual,
  isEmptyValue,
  projectValue,
  projectValues,
  validateValue,
  FORMATS,
} from './validate.js'
export type { SchemaIssue } from './validate.js'
export { resolveWidget, KNOWN_WIDGETS, isObjectArray, schemaType } from './widgets.js'
export { compileReactions, createReactionEngine, projectForCondition } from './reactions.js'
export type { ReactionEngine, ReactionEffectsMap, UiReactionSource } from './reactions.js'
export type {
  ArrayPlan,
  ArrayRules,
  CompileResult,
  CompiledReaction,
  FieldPlan,
  FieldRules,
  GroupPlan,
  JsonSchema,
  PlanNode,
  ReactionEffects,
  TabsPlan,
  UiNode,
  WidgetSpec,
} from './types.js'
