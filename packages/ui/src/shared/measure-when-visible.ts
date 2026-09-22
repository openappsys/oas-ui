/**
 * measure-when-visible —— 「不可测（隐藏/零尺寸容器）→ 可测」的尺寸自愈助手。
 *
 * 背景：组件在 `display:none` / 0 尺寸祖先里首帧测量会拿到 0。若此刻把 0 写入状态，
 * 容器转可见后又没有复测触发点，状态就永久留空/坍缩（墨水条不显示、面板尺寸为空、
 * 多行字段高被裁）。该病在三处独立复发（导航墨迹、浮层尺寸、字段自高），故收敛为
 * 单一职责助手，避免每个组件各写一份「待测标记 + 懒建观察器 + 一次性 rAF」。
 *
 * 语义：
 * - 调用方提供 `measure()`：读尺寸并写状态，返回「本次是否测到有效值」（true=已写入有效值）。
 *   助手**不**代调用方执行首次测量——调用方已在判定「不可测」后调用本函数，助手只安排重试。
 * - `measure()` 返回 false：保持待测；助手不写任何值（调用方负责保留上一次有效值）。
 * - `measure()` 返回 true：链路收敛（断开观察器、取消 rAF），并回调 `onSettle`。
 * - 触发：① ResizeObserver 观察 host（0→非 0 自然触发）；② 连接后**一次** rAF。
 *   不轮询、不用魔数定时。
 * - 懒建：仅在首次判定「不可测」时创建观察器；测到即断开；返回的 disposer 幂等，
 *   由调用方在 `onCleanup` 中注册（断连清理）。
 *
 * 重新武装：一次「不可测 → 可测」收敛后链路即完成。若元素再次进入不可测（再次隐藏后
 * 布局变化），调用方在 `onSettle` 里复位自身句柄，下次判定不可测时重新调用本函数即可。
 */

/** 测量回调：读尺寸并写状态，返回是否测到有效值（true=已写入） */
export type MeasureFn = () => boolean

/** 幂等释放函数 */
export type MeasureDisposer = () => void

/** 可注入环境（单测注入假实现，避免依赖真实计时/布局） */
export interface MeasureWhenVisibleEnv {
  ResizeObserver: typeof ResizeObserver | undefined
  requestAnimationFrame: ((cb: () => void) => number) | undefined
  cancelAnimationFrame: ((id: number) => void) | undefined
}

export interface MeasureWhenVisibleOptions {
  /**
   * 是否由助手创建 ResizeObserver 观察 host（默认 true，懒建）。
   * 宿主已有自己的尺寸观察器、且其回调会调用同一 `measure` 时置 false，复用其触发信号，
   * 避免对同一宿主重复观察。
   */
  observeResize?: boolean
  /** 是否安排「连接后一次性 rAF」复测（默认 true；仅当仍待测） */
  rafRetry?: boolean
  /** 测到有效值、链路收敛时回调（供调用方复位自身句柄，以便后续再次自愈） */
  onSettle?: () => void
  /** 环境注入（单测用；缺省取全局） */
  env?: Partial<MeasureWhenVisibleEnv>
}

/** 解析实际使用的环境：显式注入优先，否则取全局（缺失则视为不可用并降级） */
function resolveEnv(overrides?: Partial<MeasureWhenVisibleEnv>): MeasureWhenVisibleEnv {
  return {
    ResizeObserver: overrides?.ResizeObserver ?? (typeof ResizeObserver === 'undefined' ? undefined : ResizeObserver),
    requestAnimationFrame:
      overrides?.requestAnimationFrame ??
      (typeof requestAnimationFrame === 'undefined' ? undefined : (cb) => requestAnimationFrame(cb)),
    cancelAnimationFrame:
      overrides?.cancelAnimationFrame ??
      (typeof cancelAnimationFrame === 'undefined' ? undefined : (id) => cancelAnimationFrame(id)),
  }
}

/**
 * 建立「可测时自动复测」链路，返回幂等 disposer。
 *
 * @param host 尺寸观察对象（一般为组件宿主）
 * @param measure 读尺寸并写状态；返回本次是否测到有效值
 */
export function onMeasurable(
  host: HTMLElement,
  measure: MeasureFn,
  options: MeasureWhenVisibleOptions = {},
): MeasureDisposer {
  const env = resolveEnv(options.env)
  const observeResize = options.observeResize !== false
  const rafRetry = options.rafRetry !== false

  let observer: ResizeObserver | null = null
  let rafId: number | null = null
  let settled = false
  let disposed = false
  /** 构造期标记：此间触发的 run 一律延后，避免同步注入的 rAF/观察器在调用方句柄赋值前重入 */
  let constructing = true
  let replay = false

  const cancelRaf = (): void => {
    if (rafId == null) return
    env.cancelAnimationFrame?.(rafId)
    rafId = null
  }

  const settle = (): void => {
    if (settled || disposed) return
    settled = true
    observer?.disconnect()
    observer = null
    cancelRaf()
    options.onSettle?.()
  }

  const run = (): void => {
    if (disposed || settled) return
    // 同步回调（测试替身）发生在 onMeasurable 返回前——此刻调用方尚未保存 disposer，
    // 直接 measure 会经其「不可测 → 重新武装」路径无限递归；记下待构造完成后重放。
    if (constructing) {
      replay = true
      return
    }
    if (measure()) settle()
  }

  // 懒建观察器（仅不可测时才走到这里）；0→非 0 的宿主尺寸变化会再次触发 run
  if (observeResize && env.ResizeObserver) {
    observer = new env.ResizeObserver(() => run())
    observer.observe(host)
  }
  // 连接后一次性 rAF（首帧可能早于布局落定）；同一待测期只安排一次
  if (rafRetry && env.requestAnimationFrame && host.isConnected) {
    const id = env.requestAnimationFrame(() => {
      rafId = null
      run()
    })
    // 异步 rAF 才需要保留句柄（同步 rAF 的回调已执行，rafId 被其置空）
    if (rafId == null && !settled && !disposed) rafId = id
  }
  constructing = false
  // 构造期被同步触发的复测，延到微任务（调用方句柄已赋值）再执行
  if (replay) queueMicrotask(run)

  return (): void => {
    if (disposed) return
    disposed = true
    observer?.disconnect()
    observer = null
    cancelRaf()
  }
}
