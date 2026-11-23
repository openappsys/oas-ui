/**
 * `$ref` 编译期急切展开（V1 只支持本地引用）。
 *
 * 契约：`#/$defs/x` 与 `#/definitions/x` 均收（JSON Pointer 通用解析，支持嵌套键）；
 * 循环 `$ref` 编译期报错（V1 不支持递归树）；`$ref` 兄弟键仅 `title / description / default`
 * 允许并存（覆盖目标值），其余兄弟键 devWarn（提示而非静默丢弃）。
 */
import type { JsonSchema } from './types.js'

export interface RefExpandResult {
  schema: JsonSchema | null
  errors: string[]
  warnings: string[]
}

const ALLOWED_SIBLINGS = new Set(['$ref', 'title', 'description', 'default'])
const MAX_DEPTH = 64

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** JSON Pointer（`/a/b/0`）在 root 上解析；失败返回 undefined */
function resolvePointer(root: unknown, pointer: string): unknown {
  const parts = pointer
    .replace(/^\//, '')
    .split('/')
    .filter((p) => p !== '')
    .map((p) => decodeURIComponent(p).replace(/~1/g, '/').replace(/~0/g, '~'))
  let cursor: unknown = root
  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    if (Array.isArray(cursor)) {
      const index = Number(part)
      if (!Number.isInteger(index) || index < 0 || index >= cursor.length) return undefined
      cursor = cursor[index]
      continue
    }
    if (!Object.hasOwn(cursor as Record<string, unknown>, part)) return undefined
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return cursor
}

/** 递归展开：`stack` 为当前展开链上的引用指针（循环检测） */
function expandNode(
  node: unknown,
  root: JsonSchema,
  stack: string[],
  depth: number,
  errors: string[],
  warnings: string[],
  warnOnce: Set<string>,
): unknown {
  if (depth > MAX_DEPTH) {
    errors.push(`$ref 展开层级超过 ${MAX_DEPTH} 层，疑似循环引用`)
    return {}
  }
  if (Array.isArray(node)) {
    return node.map((item) => expandNode(item, root, stack, depth + 1, errors, warnings, warnOnce))
  }
  if (!isPlainObject(node)) return node

  if (typeof node.$ref === 'string') {
    const ref = node.$ref
    if (!ref.startsWith('#')) {
      errors.push(`不支持远程 $ref："${ref}"（V1 仅本地 #/$defs 或 #/definitions）`)
      return {}
    }
    if (stack.includes(ref)) {
      errors.push(`循环 $ref："${[...stack, ref].join(' → ')}"（V1 不支持递归结构）`)
      return {}
    }
    const target = resolvePointer(root, ref.slice(1))
    if (target === undefined) {
      errors.push(`$ref 目标不存在："${ref}"`)
      return {}
    }
    for (const key of Object.keys(node)) {
      if (!ALLOWED_SIBLINGS.has(key) && !warnOnce.has(`${ref}:${key}`)) {
        warnOnce.add(`${ref}:${key}`)
        warnings.push(`$ref 兄弟键 "${key}" 被忽略（仅允许 title / description / default 并存）：${ref}`)
      }
    }
    const expanded = expandNode(target, root, [...stack, ref], depth + 1, errors, warnings, warnOnce)
    if (!isPlainObject(expanded)) return expanded
    // 兄弟键覆盖：title / description / default 显式给出时优先
    const merged: Record<string, unknown> = { ...expanded }
    for (const key of ['title', 'description', 'default']) {
      if (node[key] !== undefined) merged[key] = node[key]
    }
    return merged
  }

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    // $defs / definitions 本身不再展开（只作为引用源），原样保留
    if (key === '$defs' || key === 'definitions') {
      out[key] = value
      continue
    }
    out[key] = expandNode(value, root, stack, depth + 1, errors, warnings, warnOnce)
  }
  return out
}

/**
 * 展开 schema 内的全部本地 `$ref`。返回新对象（不改入参）；失败时 `schema` 为 null 并带 errors。
 */
export function resolveSchemaRefs(input: unknown): RefExpandResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (!isPlainObject(input)) {
    return { schema: null, errors: ['schema 必须是对象'], warnings }
  }
  const root = input as JsonSchema
  const expanded = expandNode(root, root, [], 0, errors, warnings, new Set())
  return {
    schema: errors.length === 0 && isPlainObject(expanded) ? (expanded as JsonSchema) : null,
    errors,
    warnings,
  }
}
