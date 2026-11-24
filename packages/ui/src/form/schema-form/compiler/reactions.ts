/**
 * 联动注解编译与求值（`reactions`）。
 *
 * 语义（设计稿冻结）：
 * - `reactions` 挂在**源字段的 uiSchema 节点**；条件里的路径恒为**表单数据根路径**，
 *   本字段用保留 token `$self`。
 * - `target: string | string[]`；`fulfill` 键封闭词表 V1 = `visible / disabled / required`
 *   （`value` 保留但未实现 → 编译期 devWarn，禁止静默失效）；未知键编译期 devWarn。
 * - `otherwise` 缺省 = **回到静态注解值**（幂等、与求值顺序无关）。
 * - 禁止跨 reactions 写同一目标同一属性（后者胜 + devWarn 一次）。
 * - 循环依赖守卫：定点迭代 ≤8 轮，不收敛 devWarn 并保留最后一轮。
 */
import type { CompiledReaction, JsonSchema, PlanNode, ReactionEffects } from './types.js'
import { canonicalDslPath, parseDslPath, pathDependencyMatches, pathPatternMatches, WILDCARD } from './path.js'
import { projectValues, validateValue } from './validate.js'
import { compileExpression, evaluateCondition, evaluateExpression, type ExprProgram } from './expr.js'

const ALLOWED_FULFILL = new Set(['visible', 'disabled', 'required', 'value'])
/** `value` 自 V2 起转正：字符串按表达式编译，字面量（数字 / 布尔 / null）直接写入 */
const VALUE_KEY = 'value'
const MAX_ROUNDS = 8

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 递归收集条件 schema 依赖的路径（`properties` / `required` / `items` 展开为通配） */
function collectDependencyPaths(schema: unknown, scope: string, out: Set<string>): void {
  if (!isPlainObject(schema)) return
  const s = schema as JsonSchema
  // 条件节点自身也是依赖（对象整体变化 / 叶子值变化都要重算）
  if (scope !== '') out.add(scope)
  if (isPlainObject(s.properties)) {
    for (const [key, child] of Object.entries(s.properties)) {
      const childPath = `${scope}.${key}`
      out.add(childPath)
      collectDependencyPaths(child, childPath, out)
    }
  }
  if (Array.isArray(s.required)) {
    for (const key of s.required) if (typeof key === 'string') out.add(`${scope}.${key}`)
  }
  if (isPlainObject(s.items)) {
    const itemPath = `${scope}.${WILDCARD}`
    out.add(itemPath)
    collectDependencyPaths(s.items, itemPath, out)
  }
  if (isPlainObject(s.if)) collectDependencyPaths(s.if, scope, out)
  if (isPlainObject(s.then)) collectDependencyPaths(s.then, scope, out)
  if (isPlainObject(s.else)) collectDependencyPaths(s.else, scope, out)
}

/**
 * 值联动表达式的编译口径（fulfill / otherwise 共用）：
 * - 字符串 → 表达式（静态依赖并入 reaction 依赖图；宿主函数轨道标 dynamic）；
 * - 数字 / 布尔 / null → 字面量（不进表达式，靠 effectsOf 带入）；
 * - 其它形态 → 告警丢弃。
 * 编译失败只返回 undefined（丢弃该值效果），不影响同一 reaction 的其余效果。
 */
function compileValueExpression(
  raw: unknown,
  slot: 'fulfill' | 'otherwise',
  key: string,
  sourcePath: string,
  exists: ((path: string) => boolean) | undefined,
  deps: Set<string>,
  warnings: string[],
  markDynamic: () => void,
): ExprProgram | undefined {
  if (typeof raw === 'string') {
    const compiled = compileExpression(raw, { self: sourcePath, exists })
    if (!compiled.program) {
      warnings.push(`reaction.${slot}.value 表达式编译失败（${key}）：${compiled.error}`)
      return undefined
    }
    for (const dep of compiled.deps) deps.add(dep)
    if (compiled.dynamic) markDynamic()
    return compiled.program
  }
  if (raw === null || typeof raw === 'number' || typeof raw === 'boolean') return undefined
  warnings.push(`reaction.${slot}.value 只支持表达式字符串或数字/布尔/null 字面量（${key}）：${JSON.stringify(raw)}`)
  return undefined
}

function effectsOf(raw: unknown, withValue = false): ReactionEffects {
  const out: ReactionEffects = {}
  if (!isPlainObject(raw)) return out
  for (const key of ['visible', 'disabled', 'required'] as const) {
    const value = raw[key]
    if (typeof value === 'boolean') out[key] = value
  }
  // 值联动：字面量（数字 / 布尔 / null）直接带出；字符串在编译处按表达式接管（不进 fulfill）
  if (withValue && Object.hasOwn(raw, VALUE_KEY)) {
    const value = raw[VALUE_KEY]
    if (value === null || typeof value === 'number' || typeof value === 'boolean') out.value = value
  }
  return out
}

export interface UiReactionSource {
  /** uiSchema 节点路径（源字段绝对路径，含 `[]` 通配时按通配编译） */
  path: string
  reactions: unknown[]
}

export interface ReactionCompileOptions {
  /** 表达式轨的字段存在性校验（数据 schema 面）；未知字段 → 编译告警并降级该条 reaction */
  pathExists?: (path: string) => boolean
}

/**
 * 编译 reactions 列表。`warnings` 收集 devWarn 文案（去重由调用方保证）。
 */
export function compileReactions(
  sources: UiReactionSource[],
  warnings: string[],
  options: ReactionCompileOptions = {},
): CompiledReaction[] {
  const out: CompiledReaction[] = []
  const claimed = new Set<string>()
  for (const source of sources) {
    const sourcePath = canonicalDslPath(source.path)
    if (sourcePath === null) {
      warnings.push(`reactions 挂在非法路径 "${source.path}"，已忽略`)
      continue
    }
    source.reactions.forEach((raw, index) => {
      const key = `${sourcePath}#${index}`
      if (!isPlainObject(raw)) {
        warnings.push(`reaction 必须是对象（${key}）`)
        return
      }
      if (raw.when !== undefined && raw.whenSchema !== undefined) {
        warnings.push(`reaction 同时提供 when 与 whenSchema（二选一），已忽略（${key}）`)
        return
      }
      // 条件双轨（表达力不同，不宣传等价）：whenSchema 为一等轨；when 为受限表达式轨
      let scope: string
      let condition: JsonSchema = {}
      let conditionKind: 'schema' | 'expr' = 'schema'
      let expr: ExprProgram | undefined
      let dynamic = false
      const deps = new Set<string>()
      if (raw.when !== undefined) {
        if (typeof raw.when !== 'string' || raw.when.trim() === '') {
          warnings.push(`reaction.when 必须是非空字符串（${key}）`)
          return
        }
        const compiled = compileExpression(raw.when, { self: sourcePath, exists: options.pathExists })
        if (!compiled.program) {
          warnings.push(`reaction.when 表达式编译失败（${key}）：${compiled.error}`)
          return
        }
        scope = sourcePath
        conditionKind = 'expr'
        expr = compiled.program
        dynamic = compiled.dynamic
        for (const dep of compiled.deps) deps.add(dep)
      } else {
        const when = raw.whenSchema
        if (!isPlainObject(when) || !isPlainObject(when.schema)) {
          warnings.push(`reaction 缺少 whenSchema.schema 或形态非法（${key}）——支持 whenSchema 或 when 两条轨`)
          return
        }
        const scopeRaw = typeof when.scope === 'string' && when.scope !== '' ? when.scope : '$self'
        const resolvedScope = scopeRaw === '$self' ? sourcePath : canonicalDslPath(scopeRaw)
        if (resolvedScope === null) {
          warnings.push(`reaction 的 scope 路径非法："${scopeRaw}"（${key}）`)
          return
        }
        scope = resolvedScope
        condition = when.schema as JsonSchema
        collectDependencyPaths(when.schema, scope, deps)
      }
      const targetsRaw = raw.target
      const targetsList = Array.isArray(targetsRaw) ? targetsRaw : [targetsRaw]
      const targets: string[] = []
      let invalidTarget = false
      for (const target of targetsList) {
        const canonical = typeof target === 'string' ? canonicalDslPath(target) : null
        if (canonical === null) {
          warnings.push(`reaction 的 target 路径非法："${String(target)}"（${key}）`)
          invalidTarget = true
          continue
        }
        targets.push(canonical)
      }
      if (invalidTarget && targets.length === 0) return
      const fulfillRaw = raw.fulfill
      if (!isPlainObject(fulfillRaw)) {
        warnings.push(`reaction 缺少 fulfill（${key}）`)
        return
      }
      for (const effectKey of Object.keys(fulfillRaw)) {
        if (!ALLOWED_FULFILL.has(effectKey)) {
          warnings.push(`reaction.fulfill 未知键 "${effectKey}" 已忽略（${key}）`)
        }
      }
      const fulfill = effectsOf(fulfillRaw, true)
      const otherwise = effectsOf(raw.otherwise, true)
      // 值联动（V2 转正）：字符串 = 表达式轨（与 when 同一编译器），数字/布尔/null = 字面量。
      // 表达式编译失败只丢弃 value（其余效果照常生效），避免一条写值语法错连坐可见性效果。
      let valueExpr: ExprProgram | undefined
      if (Object.hasOwn(fulfillRaw, VALUE_KEY)) {
        valueExpr = compileValueExpression(
          fulfillRaw.value,
          'fulfill',
          key,
          sourcePath,
          options.pathExists,
          deps,
          warnings,
          () => {
            dynamic = true
          },
        )
      }
      let otherwiseValueExpr: ExprProgram | undefined
      if (isPlainObject(raw.otherwise) && Object.hasOwn(raw.otherwise, VALUE_KEY)) {
        otherwiseValueExpr = compileValueExpression(
          raw.otherwise.value,
          'otherwise',
          key,
          sourcePath,
          options.pathExists,
          deps,
          warnings,
          () => {
            dynamic = true
          },
        )
      }
      for (const target of targets) {
        const effectKeys = valueExpr !== undefined ? [...Object.keys(fulfill), VALUE_KEY] : Object.keys(fulfill)
        for (const effectKey of effectKeys) {
          const claim = `${target}|${effectKey}`
          if (claimed.has(claim)) {
            warnings.push(`多条 reactions 写同一目标同一属性（${target}.${effectKey}），后者胜`)
          }
          claimed.add(claim)
        }
      }
      out.push({
        key,
        sourcePath,
        scope,
        condition,
        conditionKind,
        expr,
        deps: [...deps],
        dynamic,
        targets,
        fulfill,
        otherwise,
        valueExpr,
        otherwiseValueExpr,
      })
    })
  }
  return out
}

// ---------- 求值 ----------

/** 路径读取（只读自有属性，防原型链穿透） */
function readPath(source: unknown, segments: string[]): unknown {
  let cursor: unknown = source
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    if (!Object.hasOwn(cursor, segment)) return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

/** 把含通配的路径展开为数据中的具体路径（通配段取数字下标） */
function expandPattern(segments: string[], values: unknown): { path: string[]; binding: string[] }[] {
  const results: Array<{ path: string[]; binding: string[] }> = []
  const walk = (index: number, current: unknown, acc: string[], binding: string[]): void => {
    if (index === segments.length) {
      results.push({ path: acc, binding })
      return
    }
    const segment = segments[index]!
    if (segment === WILDCARD) {
      if (!Array.isArray(current)) return
      for (let i = 0; i < current.length; i++) {
        walk(index + 1, current[i], [...acc, String(i)], [...binding, String(i)])
      }
      return
    }
    if (current === null || typeof current !== 'object') return
    const next = Array.isArray(current) ? current[Number(segment)] : (current as Record<string, unknown>)[segment]
    walk(index + 1, next, [...acc, segment], binding)
  }
  walk(0, values, [], [])
  return results
}

/** 目标路径套用绑定值（通配段按出现顺序替换） */
function bindTarget(segments: string[], binding: string[]): string[] {
  let cursor = 0
  return segments.map((segment) => (segment === WILDCARD ? (binding[cursor++] ?? WILDCARD) : segment))
}

/** 按路径写入/删除嵌套值（visible:false 的反馈通道：清值参与下一轮求值） */
function clearPath(target: Record<string, unknown>, segments: string[]): void {
  let cursor: unknown = target
  for (let i = 0; i < segments.length - 1; i++) {
    if (cursor === null || typeof cursor !== 'object') return
    const next = (cursor as Record<string, unknown>)[segments[i]!]
    if (next === undefined) return
    cursor = next
  }
  if (cursor === null || typeof cursor !== 'object') return
  const last = segments[segments.length - 1]!
  if (Array.isArray(cursor)) delete cursor[Number(last)]
  else delete (cursor as Record<string, unknown>)[last]
}

/** 按路径写入嵌套值（值联动的反馈通道：写入的值参与下一轮求值） */
function writePath(target: Record<string, unknown>, segments: string[], value: unknown): void {
  if (segments.length === 0) return
  let cursor: unknown = target
  for (let i = 0; i < segments.length - 1; i++) {
    if (cursor === null || typeof cursor !== 'object') return
    const segment = segments[i]!
    const next = (cursor as Record<string, unknown>)[segment]
    if (next === null || typeof next !== 'object') {
      ;(cursor as Record<string, unknown>)[segment] = {}
    }
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  if (cursor === null || typeof cursor !== 'object') return
  ;(cursor as Record<string, unknown>)[segments[segments.length - 1]!] = value
}

export type ReactionEffectsMap = Map<string, ReactionEffects>

export interface ReactionEngine {
  /** 全量求值（首帧 / 结构变化） */
  evaluate(values: Record<string, unknown>): ReactionEffectsMap
  /** 定向求值（值变化：只重算依赖命中的 reactions；无命中返回 null 表示无需刷新） */
  evaluateChanged(values: Record<string, unknown>, changedPath: string): ReactionEffectsMap | null
  /** 命中该变更路径的 reaction 序号（调试 / 依赖图断言用） */
  impacted(changedPath: string): number[]
}

/** 从计划树收集静态注解值（otherwise 缺省回落目标） */
function collectStatic(nodes: PlanNode[], out: Array<{ path: string; effects: ReactionEffects }>): void {
  for (const node of nodes) {
    out.push({
      path: node.path,
      effects: { visible: node.staticVisible, disabled: node.staticDisabled, required: node.staticRequired },
    })
    if (node.kind === 'group') collectStatic(node.children, out)
    else if (node.kind === 'array') collectStatic(node.children, out)
    else if (node.kind === 'tabs') for (const tab of node.tabs) collectStatic(tab.children, out)
  }
}

function staticEffect(
  statics: Array<{ path: string; effects: ReactionEffects }>,
  target: string,
  key: 'visible' | 'disabled' | 'required',
): boolean | undefined {
  for (const entry of statics) {
    if (pathPatternMatches(target, entry.path)) return entry.effects[key]
  }
  return undefined
}

/** 该条 reaction 是否声明了值联动（表达式 / fulfill 字面量 / otherwise 字面量） */
function hasValueEffect(reaction: CompiledReaction): boolean {
  return (
    reaction.valueExpr !== undefined ||
    reaction.otherwiseValueExpr !== undefined ||
    Object.hasOwn(reaction.fulfill, VALUE_KEY) ||
    Object.hasOwn(reaction.otherwise, VALUE_KEY)
  )
}

/** 单个 reaction 的一轮求值结果 */
function evaluateReaction(
  reaction: CompiledReaction,
  values: Record<string, unknown>,
  statics: Array<{ path: string; effects: ReactionEffects }>,
  warnings: (msg: string) => void,
  warnedScopes: Set<string>,
): Map<string, ReactionEffects> {
  const out = new Map<string, ReactionEffects>()
  const scopeSegments = parseDslPath(reaction.scope)
  if (scopeSegments === null) return out
  const scopes = scopeSegments.includes(WILDCARD)
    ? expandPattern(scopeSegments, values)
    : [{ path: scopeSegments, binding: [] as string[] }]
  for (const scope of scopes) {
    const value = readPath(values, scope.path)
    let failed: boolean
    if (reaction.conditionKind === 'expr' && reaction.expr) {
      // 表达式轨：异常（宿主函数抛错）按条件不成立处理并提示一次，避免整棵求值链中断
      try {
        failed = !evaluateCondition(reaction.expr, { values, self: value })
      } catch (error) {
        if (!warnedScopes.has(reaction.key)) {
          warnedScopes.add(reaction.key)
          warnings(`reaction ${reaction.key} 的表达式求值失败（${String(error)}），按条件不成立处理`)
        }
        failed = true
      }
    } else {
      failed = validateValue(reaction.condition, value) !== null
    }
    for (const targetPattern of reaction.targets) {
      const targetSegments = parseDslPath(targetPattern)
      if (targetSegments === null) continue
      const concrete = bindTarget(targetSegments, scope.binding)
      const key = concrete.join('.')
      const effects = out.get(key) ?? {}
      // 只声明过的键才参与（fulfill ∪ otherwise）；未声明的键保持静态注解不动
      for (const effectKey of ['visible', 'disabled', 'required'] as const) {
        const matched = reaction.fulfill[effectKey]
        const explicitOtherwise = Object.hasOwn(reaction.otherwise, effectKey)
        if (matched === undefined && !explicitOtherwise) continue
        const fallback = explicitOtherwise
          ? reaction.otherwise[effectKey]
          : staticEffect(statics, targetPattern, effectKey)
        effects[effectKey] = failed
          ? (fallback ?? staticEffect(statics, targetPattern, effectKey))
          : (matched ?? fallback)
      }
      // 值联动：条件成立写 fulfill.value（表达式优先）；不成立时若声明了 otherwise.value
      // （表达式或字面量）则写回落值；都没有 → 不产生值效果（保持当前值）。
      if (hasValueEffect(reaction)) {
        let valueFailed = false
        let next: unknown
        let hasNext = false
        if (!failed) {
          if (reaction.valueExpr) {
            try {
              next = evaluateExpression(reaction.valueExpr, { values, self: value })
              hasNext = true
            } catch (error) {
              valueFailed = true
              const warnKey = `${reaction.key}#value`
              if (!warnedScopes.has(warnKey)) {
                warnedScopes.add(warnKey)
                warnings(`reaction ${reaction.key} 的写值表达式求值失败（${String(error)}），按无值处理`)
              }
            }
          } else if (Object.hasOwn(reaction.fulfill, VALUE_KEY)) {
            next = reaction.fulfill[VALUE_KEY]
            hasNext = true
          }
        }
        if (failed || valueFailed) {
          if (reaction.otherwiseValueExpr) {
            try {
              next = evaluateExpression(reaction.otherwiseValueExpr, { values, self: value })
              hasNext = true
            } catch (error) {
              const warnKey = `${reaction.key}#otherwiseValue`
              if (!warnedScopes.has(warnKey)) {
                warnedScopes.add(warnKey)
                warnings(`reaction ${reaction.key} 的否则值表达式求值失败（${String(error)}），按无值处理`)
              }
            }
          } else if (Object.hasOwn(reaction.otherwise, VALUE_KEY)) {
            next = reaction.otherwise[VALUE_KEY]
            hasNext = true
          }
        }
        if (hasNext && next !== undefined) effects.value = next
      }
      // 没有任何效果键命中的目标不产生空条目（否则 get(target) 会返回 {}）
      if (Object.keys(effects).length > 0) out.set(key, effects)
    }
  }
  if (scopeSegments.includes(WILDCARD) && scopes.length === 0) {
    // 数组为空：条件无从求值，按「条件不成立」回落静态值（不改动静态注解；同 reaction 只提示一次）
    if (!warnedScopes.has(reaction.key)) {
      warnedScopes.add(reaction.key)
      warnings(`reaction ${reaction.key} 的通配 scope 在数据中无匹配项，按条件不成立处理`)
    }
  }
  return out
}

/**
 * 创建求值引擎。
 * - `evaluate(values)`：全量求值（≤8 轮定点迭代；visible:false 目标的值在下一轮参与求值时被清空，
 *   模拟真实卸载后的值语义，从而暴露「可见性 → 值 → 条件」环）。
 * - `evaluateChanged(values, changedPath)`：只重算依赖命中的 reactions，未命中返回 null。
 */
export function createReactionEngine(
  nodes: PlanNode[],
  reactions: CompiledReaction[],
  options: { onWarn?: (msg: string) => void; maxRounds?: number } = {},
): ReactionEngine {
  const maxRounds = options.maxRounds ?? MAX_ROUNDS
  const statics: Array<{ path: string; effects: ReactionEffects }> = []
  collectStatic(nodes, statics)
  const warn = (msg: string): void => options.onWarn?.(msg)
  /** 通配 scope 空数据的提示去重（每轮求值重复触发时只提示一次） */
  const warnedScopes = new Set<string>()
  /** 每条 reaction 上一次求值结果（定向刷新时合并） */
  const perReaction = new Map<number, ReactionEffectsMap>()

  const flatten = (): ReactionEffectsMap => {
    const merged = new Map<string, ReactionEffects>()
    // 编译顺序即应用顺序（后者胜），与冲突告警口径一致
    for (let i = 0; i < reactions.length; i++) {
      const result = perReaction.get(i)
      if (!result) continue
      for (const [path, effects] of result) {
        const prev = merged.get(path)
        merged.set(path, prev ? { ...prev, ...effects } : { ...effects })
      }
    }
    return merged
  }

  const runAll = (values: Record<string, unknown>): ReactionEffectsMap => {
    let working = values
    let last = new Map<number, ReactionEffectsMap>()
    for (let round = 0; round < maxRounds; round++) {
      const next = new Map<number, ReactionEffectsMap>()
      for (let i = 0; i < reactions.length; i++) {
        next.set(i, evaluateReaction(reactions[i]!, working, statics, warn, warnedScopes))
      }
      // 收敛判定：效果完全一致即稳定（JSON 比较，字段顺序由固定遍历顺序保证）
      const same =
        last.size === next.size &&
        [...next].every(
          ([i, map]) => JSON.stringify(mapToObject(map)) === JSON.stringify(mapToObject(last.get(i) ?? new Map())),
        )
      last = next
      if (same) break
      if (round === maxRounds - 1) {
        warn(`reactions 依赖在 ${maxRounds} 轮内未收敛，保留最后一轮结果`)
        break
      }
      // 反馈：visible:false 的目标在下一轮求值前清值（模拟卸载后的值语义）；
      // 值联动写入的目标在下一轮参与求值（模拟真实写值后的重算）。
      // 隐藏优先于写值：卸载目标的写值不反馈，否则「隐藏但被写值」会让下游读到不该存在的值。
      const hidden = new Set<string>()
      const writes = new Map<string, unknown>()
      for (const map of next.values()) {
        for (const [path, effects] of map) {
          if (effects.visible === false) hidden.add(path)
          if (Object.hasOwn(effects, 'value')) writes.set(path, effects.value)
        }
      }
      if (hidden.size === 0 && writes.size === 0) continue
      const clone = JSON.parse(JSON.stringify(working)) as Record<string, unknown>
      for (const path of hidden) {
        const segments = parseDslPath(path)
        if (segments !== null) clearPath(clone, segments)
      }
      for (const [path, value] of writes) {
        if (hidden.has(path)) continue
        const segments = parseDslPath(path)
        if (segments !== null) writePath(clone, segments, value)
      }
      working = clone
    }
    perReaction.clear()
    for (const [i, map] of last) perReaction.set(i, map)
    return flatten()
  }

  return {
    evaluate(values) {
      return runAll(values)
    },
    evaluateChanged(values, changedPath) {
      const hit = this.impacted(changedPath)
      if (hit.length === 0) return null
      for (const index of hit) {
        perReaction.set(index, evaluateReaction(reactions[index]!, values, statics, warn, warnedScopes))
      }
      return flatten()
    },
    impacted(changedPath) {
      const normalized = canonicalDslPath(changedPath)
      if (normalized === null) return []
      const out: number[] = []
      reactions.forEach((reaction, index) => {
        // 宿主函数轨道无静态依赖面：任何值变化都重算
        if (reaction.dynamic) {
          out.push(index)
          return
        }
        if (reaction.deps.some((dep) => pathDependencyMatches(dep, normalized))) out.push(index)
      })
      return out
    },
  }
}

/** Map → 普通对象（稳定比较用） */
function mapToObject(map: ReactionEffectsMap): Record<string, ReactionEffects> {
  const out: Record<string, ReactionEffects> = {}
  for (const [key, value] of map) out[key] = value
  return out
}

/** 计划树投影（whenSchema 条件求值用：按 schema 做只读投影） */
export function projectForCondition(schema: unknown, values: Record<string, unknown>): Record<string, unknown> {
  const projected = projectValues(schema, values)
  return isPlainObject(projected) ? projected : {}
}
