/**
 * 路径工具（编译层纯函数）：DSL 书写面 → 段数组 → 规范键。
 *
 * 唯一用户可见语法：点号 + 方括号下标（`users[0].name`），数组内通配 `users[].name`；
 * `#/` JSON Pointer 只存在于数据 schema 内部（$ref / $defs），不作条件注解书写面。
 * 数组行内模板渲染路径用 `{index}` 占位（form-list 替换），匹配时与 `[]` 同视作通配。
 */

/** 保留键段：与 form 内核 parseNamePath 同判据（原型污染防护） */
const FORBIDDEN_SEGMENT = new Set(['__proto__', 'prototype', 'constructor'])

/** 通配段标记（`[]` 与 `{index}` 归一） */
export const WILDCARD = '[]'
const INDEX_PLACEHOLDER = '{index}'

/**
 * 解析 DSL 路径为段数组：`users[0].name` → ['users','0','name']；`users[].name` → ['users','[]','name']；
 * `matrix.{index}.x` → ['matrix','[]','x']。空路径 / 非法段返回 null。
 */
export function parseDslPath(path: string): string[] | null {
  if (typeof path !== 'string') return null
  const trimmed = path.trim()
  if (trimmed === '' || trimmed === '$self') return null
  const segments = trimmed
    .replace(/\{index\}/g, '.[]')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[\s*\]/g, '.[]')
    .split('.')
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (segments.length === 0) return null
  if (segments.some((s) => FORBIDDEN_SEGMENT.has(s))) return null
  return segments
}

/** 段数组 → 规范键（`[]` 保留通配语义） */
export function joinDslPath(segments: string[]): string {
  return segments.join('.')
}

/** DSL 路径规范化；非法返回 null */
export function canonicalDslPath(path: string): string | null {
  const segments = parseDslPath(path)
  return segments === null ? null : joinDslPath(segments)
}

/** 路径是否含通配段 */
export function hasWildcard(path: string): boolean {
  const segments = parseDslPath(path)
  return segments !== null && segments.includes(WILDCARD)
}

/** 段级匹配：通配段匹配任意段，其余按字面量（数字按字符串比） */
function segmentMatches(pattern: string, actual: string): boolean {
  return pattern === WILDCARD || pattern === actual
}

/**
 * 前缀匹配（控件/联动效果的作用面判定）：
 * - `users` 匹配 `users` / `users.0` / `users.0.name`（容器效果作用于整棵子树）；
 * - `users.[].name` 匹配 `users.0.name` / `users.12.name`，不匹配 `users.0.first`；
 * - 精确同段数时退化为等值判定。
 */
export function pathPatternMatches(pattern: string, path: string): boolean {
  const p = parseDslPath(pattern)
  const a = parseDslPath(path)
  if (p === null || a === null) return false
  if (p.length > a.length) return false
  for (let i = 0; i < p.length; i++) {
    if (!segmentMatches(p[i]!, a[i]!)) return false
  }
  return true
}

/**
 * 依赖命中（依赖图定向刷新）：
 * - 依赖与变更路径互为前缀（含通配）即认为受影响——`users.[].name` 命中 `users.0.name` 的变更，
 *   也命中 `users` 数组重编号（`users.0` vs `users` 前缀关系）；
 * - 数组重编号后依赖按通配重绑（`[]` 段恒通配任意下标）。
 */
export function pathDependencyMatches(dep: string, changed: string): boolean {
  return pathPatternMatches(dep, changed) || pathPatternMatches(changed, dep)
}
