/**
 * FNV-1a 32 位字符串散列（base36）。
 *
 * 用途：SSR 快照中的元素 id 需要跨进程逐字节确定（同一属性输入 → 同一 id），
 * 不能用模块级自增计数。由身份属性串派生短 id，同页属性相同的实例各自 shadow
 * 隔离（aria-activedescendant 在 shadow 内解析），实际碰撞概率可忽略。
 */
export function stableHash36(seed: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  // 无符号化后转 base36（恒为正、字母数字，可安全用于 id）
  return (hash >>> 0).toString(36)
}
