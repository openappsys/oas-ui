/**
 * auto-height 几何纯函数：动态行高的锚定数学（无 DOM 依赖，可独立单测）。
 *
 * 动态行高下滚动位置必须用「行身份 + 行内偏移」锚定，而不是像素 scrollTop 直接恢复：
 * 测量回填 / 宿主回填会改变前缀和，同一 scrollTop 对应的视觉内容已漂移。
 * 锚定行 = 包含 scrollTop 的行（prefix[i] <= scrollTop < prefix[i+1]，跨视口顶的行也算）；
 * 行内偏移 = scrollTop - prefix[i]（该行内部的像素位置）。
 *
 * 两个已知陷阱（评审论证记录，勿踩回）：
 * - 不许用「首可见行顶」锚定：wrap 长行可高于视口，顶锚定会让视口内容跳；
 * - 不许用「行底越过 scrollTop」的宽松判据后取上一行：跨顶行自身变高会多补偿一行。
 */

/** 锚点：展示序行下标 + 行内像素偏移 */
export interface RowAnchor {
  index: number
  offset: number
}

/**
 * 定位 scrollTop 所在锚定行与行内偏移。
 * prefix 为行顶偏移数组（长度 count+1，prefix[0]=0）；scrollTop 钳到 [0, 总行高]。
 * 边界语义：scrollTop 恰等于某行底（=下一行顶）→ 锚到**下一行** offset=0——该行从视口顶开始，
 * 与 computeDynamicWindow 的首可见行口径一致（行底严格越过 scrollTop），稳定不回跳。
 * 空表返回 { index: 0, offset: 0 }。
 */
export function locateAnchor(prefix: number[], scrollTop: number): RowAnchor {
  const count = prefix.length - 1
  if (count <= 0) return { index: 0, offset: 0 }
  const total = prefix[count] ?? 0
  const top = Math.min(Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0), total)
  // 二分：首个「行底 > top」的行（包含 top 的行；恰在边界时取下一行）
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((prefix[mid + 1] ?? 0) > top) hi = mid
    else lo = mid + 1
  }
  const index = Math.min(lo, count - 1)
  const rowTop = prefix[index] ?? 0
  return { index, offset: top - rowTop }
}

/**
 * 高度修正后按锚点恢复 scrollTop：newScrollTop = prefix[anchor.index] + anchor.offset。
 * - index 越界（锚定行被删/展示集缩短）→ 钳到最后一个存在的行，offset 保留但钳到该行当前高内；
 * - offset 超出该行新高度（行变矮）→ 钳到行底（不溢出到下一行，避免补偿过头）。
 * 空表返回 0。
 */
export function restoreAnchor(prefix: number[], anchor: RowAnchor): number {
  const count = prefix.length - 1
  if (count <= 0) return 0
  const i = Math.min(Math.max(0, Math.trunc(anchor.index) || 0), count - 1)
  const rowTop = prefix[i] ?? 0
  const rowBottom = prefix[i + 1] ?? rowTop
  const rowH = Math.max(0, rowBottom - rowTop)
  const raw = Number.isFinite(anchor.offset) ? anchor.offset : 0
  const offset = Math.min(Math.max(0, raw), rowH)
  return rowTop + offset
}
