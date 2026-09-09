/**
 * dynamic-height —— 虚拟列表动态行高的纯逻辑模块（无 DOM 依赖，可独立单测）。
 *
 * 模型：每行高度 = 已实测值（ResizeObserver 回写）或预估值（estimated-item-height）。
 * 用「高度表 + 前缀和增量缓存」把「第 i 行顶部偏移 / 总高」维持在 O(1) 查询：
 * - measure(i, h)：记录第 i 行实测高，失效其后前缀和（下次查询前增量重算）
 * - offsetOf(i)：第 i 行顶部偏移（已测行真实高 + 未测行预估高累加）
 * - total：全部行总高（滚动条长度）
 * - 数据替换/预估值变化时整体失效重算
 */

import type { VirtualWindow } from './oas-virtual-list.js'

export class HeightCache {
  private heights = new Map<number, number>()
  private prefix: number[] = []
  /** 需要增量重算前缀和的最早下标（含） */
  private dirtyFrom = 0
  private estimated = 36
  private count = 0

  /** 设定行数与预估行高（行数变 → 重置高度表与前缀和；预估值变 → 前缀和整体失效） */
  configure(count: number, estimated: number): void {
    const n = Math.max(0, Math.trunc(count) || 0)
    const est = Math.max(1, Number.isFinite(estimated) ? estimated : 36)
    if (n !== this.count) {
      this.count = n
      this.heights.clear()
      this.prefix = new Array(n + 1).fill(0)
      this.dirtyFrom = 0
    }
    if (est !== this.estimated) {
      this.estimated = est
      this.dirtyFrom = 0
    }
  }

  /** 第 i 行生效高度：实测值优先，缺省预估值 */
  heightAt(i: number): number {
    return this.heights.get(i) ?? this.estimated
  }

  /** 记录第 i 行实测高度；与现值差异 <0.5px 视为未变（返回 false） */
  measure(i: number, h: number): boolean {
    if (!Number.isFinite(i) || i < 0 || i >= this.count || !Number.isFinite(h) || h <= 0) {
      return false
    }
    const old = this.heightAt(i)
    if (Math.abs(h - old) < 0.5) return false
    this.heights.set(i, h)
    if (i + 1 < this.dirtyFrom) this.dirtyFrom = i + 1
    return true
  }

  /** 增量重算前缀和（从 dirtyFrom 起），之后 offsetOf/total 即最新 */
  private sync(): void {
    const from = Math.min(this.dirtyFrom, this.count)
    if (from === 0) this.prefix[0] = 0
    const start = Math.max(1, from)
    for (let i = start; i <= this.count; i++) {
      this.prefix[i] = (this.prefix[i - 1] ?? 0) + this.heightAt(i - 1)
    }
    this.dirtyFrom = this.count
  }

  /** 第 i 行顶部偏移 */
  offsetOf(i: number): number {
    this.sync()
    return this.prefix[Math.min(Math.max(0, i), this.count)] ?? 0
  }

  /** 全部行总高 */
  total(): number {
    return this.offsetOf(this.count)
  }
}

/**
 * 动态行高窗口计算：scrollTop 决定首可见行（首行底越过 scrollTop），
 * 视口底决定末可见行（末行顶低于 scrollTop+viewport），buffer 上下预渲染。
 * prefix 为行偏移数组（长度 count+1，prefix[0]=0），由 HeightCache 维护。
 */
export function computeDynamicWindow(
  prefix: number[],
  count: number,
  scrollTop: number,
  viewport: number,
  buffer = 4,
): VirtualWindow {
  if (!count || count <= 0) return { start: 0, end: 0 }
  const vh = Math.max(0, Number.isFinite(viewport) ? viewport : 0)
  const buf = Math.max(0, Number.isFinite(buffer) ? buffer : 0)
  const total = prefix[count] ?? 0
  const top = Math.min(Math.max(0, scrollTop), Math.max(0, total - vh))
  // 二分：首个「行底 > top」的行（首可见行）
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((prefix[mid + 1] ?? 0) > top) hi = mid
    else lo = mid + 1
  }
  const firstVisible = lo
  // 二分：首个「行顶 >= top+vh」的行（末可见行的下一个）
  const limit = top + vh
  lo = firstVisible
  hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((prefix[mid] ?? 0) >= limit) hi = mid
    else lo = mid + 1
  }
  const start = Math.max(0, firstVisible - buf)
  const end = Math.min(count, lo + buf)
  return { start, end }
}
