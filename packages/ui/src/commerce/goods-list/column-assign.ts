/**
 * oas-goods-list 纯函数内核 —— 列分配 / 自适应列数。
 *
 * 与组件解耦（零 DOM 依赖）：瀑布流「列均衡分配」按累计高度最短列放置；
 * `columns="auto"` 按容器宽断点取列数。
 *
 * 触底判定 `shouldRequestMore` 已随触底协议内核下沉 `shared/bottom-reach.ts`
 * （goods-list / order-list 共用单一真源），此处保留 re-export 以免破坏既有导入面。
 */

/** 容器宽 → auto 列数断点：<640 → 2 列，<1024 → 3 列，其余 4 列；非法宽回落 2 列 */
export function resolveAutoColumns(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 2
  if (width < 640) return 2
  if (width < 1024) return 3
  return 4
}

/**
 * 列均衡分配：逐项放入累计高度最短的一列（并列入最左列；全 0 高度退化为轮转，
 * 保证 happy-dom / 未布局时分布仍均匀）。返回每项所在列下标。
 */
export function assignColumns(heights: readonly number[], columns: number): number[] {
  const n = Math.max(1, Math.floor(columns))
  const totals = new Array<number>(n).fill(0)
  const out: number[] = []
  let zeroCursor = 0
  for (const h of heights) {
    const height = Number.isFinite(h) && h > 0 ? h : 0
    if (height === 0) {
      // 未布局 / 无高度信息：轮转分配（均匀分布，不集中于首列）
      out.push(zeroCursor % n)
      zeroCursor++
      continue
    }
    let best = 0
    for (let c = 1; c < n; c++) {
      if (totals[c]! < totals[best]!) best = c
    }
    out.push(best)
    totals[best]! += height
  }
  return out
}

/** 列数解析：'auto' / 缺省 → 容器自适应；数值 → clamp 1–8；非法回落 auto */
export function resolveColumns(raw: string, hostWidth: number): { columns: number; mode: 'fixed' | 'auto' } {
  const value = raw.trim()
  if (value === '' || value === 'auto') return { columns: resolveAutoColumns(hostWidth), mode: 'auto' }
  const n = Number(value)
  if (Number.isInteger(n) && n >= 1 && n <= 8) return { columns: n, mode: 'fixed' }
  return { columns: resolveAutoColumns(hostWidth), mode: 'auto' }
}

/** 加载更多触底判定（实现居 shared/bottom-reach.ts；此处 re-export 保留既有导入面） */
export { shouldRequestMore } from '../../shared/bottom-reach.js'
