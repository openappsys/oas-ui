/**
 * 行键计算（内部工具，非公开 API）。
 *
 * `row-key` 指定字段缺省（null/undefined）时，键回退为行对象的 `JSON.stringify` 结果。
 * 回退序列化是热路径开销：同一行对象在一次渲染管线里会被可见行过滤（visibleFlat）、
 * 行渲染（buildRow）、全选态判定等多处取键——5000 行时曾重复序列化约 1 万次。
 *
 * 用 WeakMap 按行对象缓存回退结果：同一对象只序列化一次，命中后直接复用。
 * 语义约束（与 row-key 现有语义一致）：回退键由行对象「当时的内容」派生，**对象内容原地
 * 变更不会重算**——宿主改行数据必须换新对象（或改用显式 row-key 字段），与 row-key
 * 取值本身的自洽要求相同；元素移除后 WeakMap 条目随对象回收，无泄漏。
 */

/** 回退键缓存：行对象 → 序列化键（模块级共享，跨实例复用同一批行对象时同样命中） */
const fallbackKeys = new WeakMap<object, string>()

/**
 * 取行键：`row[rowKey]` 命中（非 null/undefined）时直接 `String()`；
 * 否则回退 `String(JSON.stringify(row))` 并按对象缓存。
 *
 * 单次取值与旧实现 `String(row[rowKey] ?? JSON.stringify(row))` 一致；对象内容原地变更
 * 不重算（须换新对象，见文件头语义约束）。
 */
export function rowKeyValue(row: Record<string, unknown>, rowKey: string): string {
  const value = row[rowKey]
  if (value !== null && value !== undefined) return String(value)
  const cacheable = typeof row === 'object' && row !== null
  if (cacheable) {
    const cached = fallbackKeys.get(row)
    if (cached !== undefined) return cached
  }
  const fallback = String(JSON.stringify(row))
  if (cacheable) fallbackKeys.set(row, fallback)
  return fallback
}
