/**
 * listbox 键盘导航内核：键序解析 + index 推进（回绕 / 跳过不可用 / Home-End / RTL 镜像）。
 *
 * 五处 roving / 方向键实现原先各自持有一份推进逻辑（select 下拉、invoice 已保存抬头弹层、
 * filter 组内选项与排序行、order-list 页签、time-select 三组），纯逻辑重复、语义变体分散：
 * - 回绕：select / invoice / order-list / time-select 回绕；filter clamp
 * - Home/End：order-list / time-select 支持；其余不拦
 * - RTL 镜像：time-select 已镜像；order-list 页签与 filter 缺（本次统一后对齐）
 * - 激活语义（manual / follows-focus / enter-select）与焦点载体（activedescendant /
 *   DOM focus / roving tabindex）是组件语义，**不进内核**——内核只回答「目标 index 是几」。
 * - search-bar 联想面板是插槽容器（只处理 Enter / Esc，无选项列表、无方向键导航）——
 *   不属内核范围（盘点 §4 明确排除项），接入面为 5 组 / 7 处调用。
 *
 * 本模块是纯函数（零 DOM）：count / current / rtl / 可用性谓词全部由组件传入。
 *
 * 体积账（gz 实测）：442 B（`dist/shared/listbox.js`，gzipSync 默认档；纯函数，无默认导出对象，
 * 随五处接入组件链进既有预算档）。
 */

/** 内核默认识别的键集（组件可用 `keys` 收窄声明） */
const DEFAULT_KEYS: readonly string[] = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

export interface RovingMoveOptions {
  /** 可导航项数 */
  count: number
  /** 当前 index（-1 = 无当前项） */
  current: number
  /** 回绕（默认 true；filter 传 false） */
  wrap?: boolean
  /** RTL 镜像左右键（默认 false；语义：视觉向右 = index -1） */
  rtl?: boolean
  /** 本组件监听 / 支持的键集（缺省全六键；收窄即「不支持 Home/End」等变体） */
  keys?: readonly string[]
  /** 跳过不可用项（disabled）：返回 true 表示该 index 不可达 */
  skip?: (index: number) => boolean
}

/**
 * 解析方向键移动目标。
 *
 * @returns 目标 index；非监听键 / 无可导航项 / 全部不可用 → null（调用方不拦截默认动作）
 */
export function resolveRovingMove(key: string, options: RovingMoveOptions): number | null {
  const n = options.count
  if (n <= 0) return null
  const keys = options.keys ?? DEFAULT_KEYS
  if (!keys.includes(key)) return null
  const skip = options.skip
  const wrap = options.wrap ?? true

  if (key === 'Home') {
    for (let i = 0; i < n; i++) if (!skip || !skip(i)) return i
    return null
  }
  if (key === 'End') {
    for (let i = n - 1; i >= 0; i--) if (!skip || !skip(i)) return i
    return null
  }

  const rtl = options.rtl ?? false
  let delta: 1 | -1
  if (key === 'ArrowDown') delta = 1
  else if (key === 'ArrowUp') delta = -1
  else if (key === 'ArrowRight') delta = rtl ? -1 : 1
  else delta = rtl ? 1 : -1 // ArrowLeft

  const from = options.current
  let cursor = from
  for (let step = 0; step < n; step++) {
    const raw = cursor + delta
    if (!wrap && (raw < 0 || raw >= n)) return Math.min(Math.max(from, 0), n - 1)
    cursor = wrap ? ((raw % n) + n) % n : raw
    if (!skip || !skip(cursor)) return cursor
  }
  return null
}
