/**
 * JSON 查看器纯模型（无 DOM / 无组件状态）。
 *
 * 约定：
 * - 路径统一单引号 JSONPath：`$`、`$['a.b'][0]`；解析额外接受点号简写 `$.a.b`。
 * - 树按数据原顺序构建；不支持的值（undefined / 函数 / Symbol / BigInt）按 null 展示，
 *   与 JSON 序列化语义保持一致。
 * - 搜索只匹配对象键与原始值，不对容器做 JSON.stringify（避免大对象热路径）。
 */

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

export interface JsonNode {
  /** 统一 JSONPath（根为 `$`） */
  path: string
  /** 对象键 / 数组下标；根为 null */
  key: string | number | null
  kind: JsonKind
  value: JsonValue
  /** 根为 0 */
  depth: number
  childCount: number
  children: JsonNode[] | null
}

export interface JsonRow {
  node: JsonNode
  expanded: boolean
  /** aria-level（根为 1） */
  level: number
  posinset: number
  setsize: number
}

/** 转义单引号 JSONPath 的字符串段 */
function escapeSegment(segment: string): string {
  return segment.replaceAll('\\', '\\\\').replaceAll("'", "\\'")
}

/** 段数组 → `$['a'][0]` */
export function encodeJsonPath(segments: Array<string | number>): string {
  let out = '$'
  for (const segment of segments) {
    out += typeof segment === 'number' ? `[${segment}]` : `['${escapeSegment(segment)}']`
  }
  return out
}

/** 解析 `$` / `$.a` / `$['a']` / `$["a"]` / `$[0]`；非法返回 null */
export function parseJsonPath(path: string): Array<string | number> | null {
  if (!path.startsWith('$')) return null
  const segments: Array<string | number> = []
  let i = 1
  while (i < path.length) {
    const ch = path[i]
    if (ch === '.') {
      i++
      const start = i
      if (!/[A-Za-z_$]/.test(path[i] ?? '')) return null
      while (i < path.length && /[A-Za-z0-9_$]/.test(path[i]!)) i++
      segments.push(path.slice(start, i))
      continue
    }
    if (ch !== '[') return null
    i++
    const quote = path[i]
    if (quote === "'" || quote === '"') {
      i++
      let value = ''
      let closed = false
      while (i < path.length) {
        const c = path[i]!
        if (c === '\\') {
          const next = path[i + 1]
          if (next === undefined) return null
          value += next
          i += 2
          continue
        }
        if (c === quote) {
          i++
          closed = true
          break
        }
        value += c
        i++
      }
      if (!closed || path[i] !== ']') return null
      i++
      segments.push(value)
      continue
    }
    const start = i
    while (i < path.length && /\d/.test(path[i]!)) i++
    if (i === start || path[i] !== ']') return null
    segments.push(Number(path.slice(start, i)))
    i++
  }
  return segments
}

/** 所有祖先路径（含根、不含自身）；非法返回 [] */
export function collectAncestorPaths(path: string): string[] {
  const segments = parseJsonPath(path)
  if (!segments || segments.length === 0) return []
  const out: string[] = ['$']
  for (let i = 1; i < segments.length; i++) out.push(encodeJsonPath(segments.slice(0, i)))
  return out
}

function kindOf(value: JsonValue): JsonKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  switch (typeof value) {
    case 'object':
      return 'object'
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'null'
  }
}

/** 非 JSON 值按 null 处理，保证树构建不会因宿主传入 undefined/函数而崩 */
function normalizeValue(value: unknown, seen = new WeakSet<object>()): JsonValue {
  if (value === null) return null
  if (Array.isArray(value)) {
    if (seen.has(value)) return null
    seen.add(value)
    const out = value.map((item) => normalizeValue(item, seen))
    seen.delete(value)
    return out
  }
  switch (typeof value) {
    case 'object': {
      if (seen.has(value as object)) return null
      seen.add(value as object)
      const out: Record<string, JsonValue> = Object.create(null)
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (item === undefined) continue
        out[key] = normalizeValue(item, seen)
      }
      seen.delete(value as object)
      return out
    }
    case 'string':
    case 'boolean':
      return value
    case 'number':
      // JSON 没有 NaN/Infinity；宿主 data 传入时按 JSON 序列化语义回落 null
      return Number.isFinite(value) ? value : null
    default:
      return null
  }
}

/** 构建完整树；根路径为 `$` */
export function buildJsonTree(value: unknown): JsonNode | null {
  const normalized = normalizeValue(value)
  const build = (node: JsonValue, key: string | number | null, depth: number, path: string): JsonNode => {
    const kind = kindOf(node)
    const container = kind === 'object' || kind === 'array'
    const children: JsonNode[] | null = container
      ? kind === 'array'
        ? (node as JsonValue[]).map((item, index) => build(item, index, depth + 1, `${path}[${index}]`))
        : Object.entries(node as Record<string, JsonValue>).map(([childKey, item]) =>
            build(item, childKey, depth + 1, `${path}['${escapeSegment(childKey)}']`),
          )
      : null
    return {
      path,
      key,
      kind,
      value: node,
      depth,
      childCount: children?.length ?? 0,
      children,
    }
  }
  return build(normalized, null, 0, '$')
}

/** 按展开状态生成可见行（前序） */
export function flattenVisible(root: JsonNode, isExpanded: (path: string) => boolean): JsonRow[] {
  const rows: JsonRow[] = []
  const walk = (node: JsonNode, posinset: number, setsize: number): void => {
    const expanded = (node.children?.length ?? 0) > 0 && isExpanded(node.path)
    rows.push({
      node,
      expanded,
      level: node.depth + 1,
      posinset,
      setsize,
    })
    if (!expanded || !node.children) return
    node.children.forEach((child, index) => walk(child, index + 1, node.children!.length))
  }
  walk(root, 1, 1)
  return rows
}

/** 搜索键与原始值（大小写不敏感子串），按文档顺序返回路径 */
export function searchJson(root: JsonNode, query: string): string[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const out: string[] = []
  const walk = (node: JsonNode): void => {
    // 数组下标不是对象键，不参与搜索；只匹配对象字符串键
    const keyHit = typeof node.key === 'string' && node.key.toLowerCase().includes(needle)
    const valueHit =
      node.kind !== 'object' && node.kind !== 'array' && String(node.value).toLowerCase().includes(needle)
    if (keyHit || valueHit) out.push(node.path)
    for (const child of node.children ?? []) walk(child)
  }
  walk(root)
  return out
}

/** 原始值原文（string 不带引号）；容器格式化 JSON */
export function serializeValue(value: JsonValue, indent = 2): string {
  const kind = kindOf(value)
  if (kind === 'object' || kind === 'array') return JSON.stringify(value, null, indent)
  if (kind === 'null') return 'null'
  if (typeof value === 'number' && !Number.isFinite(value)) return 'null'
  return String(value)
}

/** 一律 JSON 序列化（string 带引号） */
export function serializeJson(value: JsonValue, indent = 2): string {
  return JSON.stringify(value, null, indent) ?? 'null'
}
