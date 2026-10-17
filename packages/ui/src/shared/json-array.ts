/**
 * 解析 JSON 数组参数：接受数组或 JSON 字符串，其他（非法/非数组）回落 `[]`，不抛异常。
 *
 * 用途：数据型属性既有 attribute（JSON 字符串）通道，也有 property 通道；部分框架
 * （如 Vue 对自定义元素）会把模板里的静态 attribute 直接写成 property——此时 setter
 * 会收到字符串。统一用它把两种通道归一，避免「SPA 跳转后数据变空」。
 */
export function parseJsonArray<T = unknown>(v: unknown, onInvalid?: () => void): T[] {
  try {
    if (Array.isArray(v)) return v as T[]
  } catch {
    // revoked Proxy：Array.isArray 会抛，按无效输入处理
    onInvalid?.()
    return []
  }
  if (typeof v !== 'string') {
    onInvalid?.()
    return []
  }
  if (v.trim() === '') return []
  try {
    const parsed: unknown = JSON.parse(v)
    if (Array.isArray(parsed)) return parsed as T[]
    onInvalid?.()
    return []
  } catch {
    onInvalid?.()
    return []
  }
}
