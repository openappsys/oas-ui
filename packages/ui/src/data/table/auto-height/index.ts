import type { ReactiveController } from '@oas-ui/core/oas-element'
import { registerTableCapability } from '../oas-table-capability.js'
import type { TableAutoHeightCapability } from '../oas-table.js'
import { HeightCache, computeDynamicWindow } from '../../virtual-list/dynamic-height.js'

/**
 * table 逐行动态行高能力（注册型 L3）：import 本模块一次即激活 `row-auto-height` 属性。
 *
 * 职责（核心接缝在 oas-table.ts：几何消费 / 身份锚定 / tbody-only 重建都由核心承担）：
 * - HeightCache 前缀和几何（实测优先 + 预估兜底，与列宽前缀和同一现成模块）；
 * - ResizeObserver 生命周期：每次 tbody 重建后重新观测渲染行（滚动帧整帧重建，观察须随帧刷新）；
 * - 测量批次合并：同帧多次回调合并为一次 requestAutoHeightSync（锚定补偿由核心做）；
 * - 收缩探测：tr 内联高在表格布局里是 min 语义（只增不减），轮询放行一行的高限让内容
 *   重新表达真高——变矮的行在数帧内被 RO 捕获收敛（Excel auto-fit 同款行为）。
 *
 * 体积：注册型 L3，不 import 本模块时 table 链仅承担核心判空钩子（亚 KB 常数）。
 */

/** 核心暴露给能力的最小宿主面（避免环依赖：不 import OASTable 类型） */
interface AutoHeightHost {
  requestAutoHeightSync(): void
}

/** 每帧放行重测的行数（收缩轮询的节奏：每帧一行，N 行视口 N 帧全覆盖） */
const SHRINK_PROBE_PER_RENDER = 1

class TableAutoHeightController implements TableAutoHeightCapability, ReactiveController {
  private readonly cache = new HeightCache()
  private observer: ResizeObserver | null = null
  /** 待同帧合并的测量（displayIdx -> height），rAF _flush 时统一回填 */
  private pending = new Map<number, number>()
  private flushScheduled = false
  /** 收缩轮询游标（渲染行内轮转） */
  private probeCursor = 0
  private lastRendered: HTMLTableRowElement[] = []

  constructor(private readonly host: AutoHeightHost) {}

  // ---------- TableAutoHeightCapability ----------

  configure(count: number, estimated: number): void {
    this.cache.configure(count, estimated)
  }

  measure(i: number, h: number): boolean {
    return this.cache.measure(i, h)
  }

  /** 展示结构失效：清实测高回退预估（HeightCache 只在行数变化时自清，结构变化须显式重置） */
  invalidate(): void {
    this.cache.reset()
  }

  offsets(): number[] {
    return this.cache.offsets()
  }

  offsetOf(i: number): number {
    return this.cache.offsetOf(i)
  }

  heightAt(i: number): number {
    return this.cache.heightAt(i)
  }

  total(): number {
    return this.cache.total()
  }

  window(scrollTop: number, viewport: number): { start: number; end: number } {
    return computeDynamicWindow(this.cache.offsets(), this.cache.length, scrollTop, viewport)
  }

  afterRender(body: HTMLElement): void {
    // 观测随帧刷新：回收旧行，观测新渲染的数据行（spacer/expand 行无 data-oas-display-idx）
    const rows = [...body.querySelectorAll<HTMLTableRowElement>('tr[data-oas-display-idx]')]
    this.lastRendered = rows
    if (!this.observer) return
    // 行数 = 窗口大小且整帧重建：disconnect + observe 全量重观测比差量维护更简单可靠
    this.observer.disconnect()
    for (const tr of rows) this.observer.observe(tr)
    // 收缩轮询放行：tr 内联高是 min 语义，清空一行的高限让内容表达真高（变矮则下帧收敛）。
    // 游标跨渲染持续轮转（不在此重置）——每次渲染放行一行，N 行视口 N 帧全覆盖；
    // 重置的话视口再大也只反复探首行（二轮交叉审 I-2）
    for (let k = 0; k < SHRINK_PROBE_PER_RENDER && rows.length > 0; k++) {
      const tr = rows[this.probeCursor % rows.length]!
      this.probeCursor += 1
      tr.style.height = ''
    }
  }

  // ---------- ReactiveController ----------

  hostConnected(): void {
    if (typeof ResizeObserver === 'undefined') return
    this.observer = new ResizeObserver((entries) => this.onResize(entries))
  }

  hostDisconnected(): void {
    this.observer?.disconnect()
    this.observer = null
    this.pending.clear()
    this.lastRendered = []
  }

  // ---------- 内部 ----------

  private onResize(entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      const tr = entry.target as HTMLTableRowElement
      const idx = Number(tr.dataset.oasDisplayIdx)
      if (!Number.isInteger(idx)) continue
      // borderBoxSize 跨引擎口径不一（happy-dom 为 stub）：优先 getBoundingClientRect，
      // 与 virtual-list 的测量闭环同款回退
      const h =
        typeof tr.getBoundingClientRect === 'function'
          ? tr.getBoundingClientRect().height
          : (entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect?.height ?? 0)
      if (h > 0) this.pending.set(idx, h)
    }
    if (this.pending.size === 0 || this.flushScheduled) return
    this.flushScheduled = true
    requestAnimationFrame(() => {
      this.flushScheduled = false
      let changed = false
      for (const [idx, h] of this.pending) {
        if (this.cache.measure(idx, h)) changed = true
      }
      this.pending.clear()
      // 锚定补偿 + tbody-only 重建由核心承担（编辑中的行核心自行跳过）
      if (changed) this.host.requestAutoHeightSync()
    })
  }
}

registerTableCapability('auto-height', (host) => new TableAutoHeightController(host as AutoHeightHost))
