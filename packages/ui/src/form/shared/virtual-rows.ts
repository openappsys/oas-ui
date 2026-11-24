/**
 * virtual-rows —— form-list / array-table 虚拟滚动的纯逻辑内核（无 DOM 依赖，可独立单测）。
 *
 * 与表单数组行匹配的模型（借鉴 data/virtual-list 的「高度表 + 前缀和」思路，按行操作语义重写）：
 * - 每行高度 = 实测值（窗口内挂载后量得）或预估高；
 * - 行间距（gap）计入节距：`offsetOf(i)` = 行高前缀和 + `gap × i`（每行后跟一个 gap 槽位），
 *   `total()` 去掉末行后的悬挂 gap（末行之后视觉上没有间距）——虚拟内容总高与全量渲染一致；
 * - `offsetOf(i)` / `total()` 用前缀和增量缓存维持 O(1) 查询；
 * - **行增删按下标平移实测高**（数组表单的插入 / 删除 / 受控缩容是常态操作，
 *   通用虚拟列表的「整表 reset」会丢光实测值 → 滚动条跳动，这里按操作语义精确平移）；
 * - `windowFor(scrollTop, viewport, overscan)` 二分求可视窗口（上下各扩 overscan 行）。
 *
 * 字段留在 light DOM 是表单语义铁律，虚拟化只窗口化 shadow 内的 slot 帧：
 * 未 slot 的行 wrapper 不渲染、零布局成本，值 / 校验 / name 重编号不受影响。
 */

export interface VirtualWindow {
  start: number
  /** 半开区间上界（不含） */
  end: number
}

/** 视口测不到时的兜底可视行数（SSR / happy-dom / 首帧测量前）：按预估高折算约一屏 */
const FALLBACK_MIN_ROWS = 8

export class RowHeightModel {
  private heights = new Map<number, number>()
  private prefix: number[] = [0]
  /** 需要增量重算前缀和的最早下标（含） */
  private dirtyFrom = 0
  private estimated: number
  private count = 0
  /** 行间距（px，行与行的视觉间隙）；计入节距，末行后的悬挂 gap 由 total() 去除 */
  private gap = 0

  constructor(estimated = 56) {
    this.estimated = Math.max(1, Number.isFinite(estimated) ? estimated : 56)
  }

  get length(): number {
    return this.count
  }

  /** 行间距变化：全部前缀和失效（实测高不受影响） */
  setGap(px: number): void {
    const next = Number.isFinite(px) && px > 0 ? px : 0
    if (next === this.gap) return
    this.gap = next
    this.dirtyFrom = 0
  }

  /** 行数收敛：增长保留既有实测高，缩减截掉越界实测高 */
  setCount(n: number): void {
    const next = Math.max(0, Number.isFinite(n) ? Math.trunc(n) : 0)
    if (next === this.count) return
    if (next < this.count) {
      for (const key of this.heights.keys()) {
        if (key >= next) this.heights.delete(key)
      }
    }
    this.count = next
    this.prefix = new Array(next + 1).fill(0)
    this.dirtyFrom = 0
  }

  /** 预估高变化：全部未测行失效（实测行不受影响） */
  setEstimated(px: number): void {
    const next = Math.max(1, Number.isFinite(px) ? px : 56)
    if (next === this.estimated) return
    this.estimated = next
    this.dirtyFrom = 0
  }

  /** 第 i 行生效高度：实测值优先，缺省预估高 */
  heightAt(i: number): number {
    return this.heights.get(i) ?? this.estimated
  }

  /** 记录第 i 行实测高；与现值差异 <0.5px 视为未变（返回 false，避免测量回写风暴） */
  measure(i: number, h: number): boolean {
    if (!Number.isInteger(i) || i < 0 || i >= this.count) return false
    if (!Number.isFinite(h) || h <= 0) return false
    const old = this.heightAt(i)
    if (Math.abs(h - old) < 0.5) return false
    this.heights.set(i, h)
    if (i + 1 < this.dirtyFrom) this.dirtyFrom = i + 1
    return true
  }

  /** 在第 i 位插入一行：i 及之后的实测高整体后移（新行落预估） */
  insertAt(i: number): void {
    const at = Math.min(Math.max(0, Math.trunc(i) || 0), this.count)
    const shifted = new Map<number, number>()
    for (const [key, h] of this.heights) {
      shifted.set(key >= at ? key + 1 : key, h)
    }
    this.heights = shifted
    this.count += 1
    this.prefix = new Array(this.count + 1).fill(0)
    this.dirtyFrom = 0
  }

  /** 删除第 i 行：其实测高丢弃，其后整体前移 */
  removeAt(i: number): void {
    if (!Number.isInteger(i) || i < 0 || i >= this.count) return
    const shifted = new Map<number, number>()
    for (const [key, h] of this.heights) {
      if (key === i) continue
      shifted.set(key > i ? key - 1 : key, h)
    }
    this.heights = shifted
    this.count -= 1
    this.prefix = new Array(this.count + 1).fill(0)
    this.dirtyFrom = 0
  }

  /** 交换两行的实测高（行值交换语义：内容互换、高度随内容互换） */
  swapAt(a: number, b: number): void {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return
    if (a < 0 || b < 0 || a >= this.count || b >= this.count) return
    const heightA = this.heights.get(a)
    const heightB = this.heights.get(b)
    if (heightA === undefined && heightB === undefined) return
    if (heightB === undefined) this.heights.delete(a)
    else this.heights.set(a, heightB)
    if (heightA === undefined) this.heights.delete(b)
    else this.heights.set(b, heightA)
    this.dirtyFrom = Math.min(this.dirtyFrom, Math.min(a, b) + 1)
  }

  /** 增量重算前缀和（从 dirtyFrom 起）：节距 = 行高 + 行间距（每行后跟一个 gap 槽位） */
  private sync(): void {
    const from = Math.min(this.dirtyFrom, this.count)
    if (from === 0) this.prefix[0] = 0
    for (let i = Math.max(1, from); i <= this.count; i++) {
      this.prefix[i] = (this.prefix[i - 1] ?? 0) + this.heightAt(i - 1) + this.gap
    }
    this.dirtyFrom = this.count
  }

  /** 第 i 行顶部偏移 */
  offsetOf(i: number): number {
    this.sync()
    return this.prefix[Math.min(Math.max(0, i), this.count)] ?? 0
  }

  /** 滚动内容总高 = 行高前缀和 + 行间 gap 总数（末行之后没有 gap，悬挂槽位去除） */
  total(): number {
    if (this.count <= 0) return 0
    return Math.max(0, this.offsetOf(this.count) - this.gap)
  }
}

/**
 * 可视窗口计算：scrollTop 决定首可见行（首个「行底 > scrollTop」的行），
 * 视口底决定末可见行（首个「行顶 ≥ scrollTop + viewport」的行），上下各扩 overscan 行。
 * viewport ≤ 0（测量不可用）时按兜底行数渲染顶部窗口，保证 SSR / 测试环境有确定输出。
 */
export function windowFor(model: RowHeightModel, scrollTop: number, viewport: number, overscan: number): VirtualWindow {
  const count = model.length
  if (count <= 0) return { start: 0, end: 0 }
  const vh = Math.max(0, Number.isFinite(viewport) ? viewport : 0)
  const buf = Math.max(0, Number.isFinite(overscan) ? Math.trunc(overscan) : 0)
  const total = model.total()
  const minRows = FALLBACK_MIN_ROWS + buf
  if (vh <= 0) {
    return { start: 0, end: Math.min(count, minRows) }
  }
  const top = Math.min(Math.max(0, Math.trunc(scrollTop) || 0), Math.max(0, total - vh))
  // 二分：首个「行底 > top」的行（首可见行）
  let lo = 0
  let hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (model.offsetOf(mid + 1) > top) hi = mid
    else lo = mid + 1
  }
  const firstVisible = lo
  // 二分：首个「行顶 ≥ top + vh」的行（末可见行的下一个）
  const limit = top + vh
  lo = firstVisible
  hi = count
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (model.offsetOf(mid) >= limit) hi = mid
    else lo = mid + 1
  }
  return { start: Math.max(0, firstVisible - buf), end: Math.min(count, lo + buf) }
}
