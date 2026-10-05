/**
 * 触屏 tap 统一通道（coarse pointer 降级共享实现）。
 *
 * 背景：Gecko 对「裸文本节点直接落在 slot」的触屏命中会静默丢弃整串 touch 事件
 *（无 touchstart/touchend → 无兼容性 mouse events → 无 click——Firefox 移动仿真
 * 全链实证：文本子节点仅 pointerdown/up 达，span/button 子节点全链达）。pointer 事件
 * 在该路径下始终可达，故 coarse 下的 tap 切换统一改用 pointerup 判定，与引擎无关。
 *
 * 防双触发：Chromium 等引擎 tap 后 click 与 pointerup 连发——pointerup 已切换时给
 * click 打标忽略（300ms 窗口）。fine pointer 场景不走本通道（纯 click 语义不变）。
 */

/** 最近一次 pointerup 已处理的 tap（target → 时间戳），click 侧用于去重 */
const handledTaps = new WeakMap<EventTarget, number>()
const DEDUP_MS = 300

/** coarse 环境判定（matchMedia 缺失环境视为非 coarse——SSR/happy-dom 安全） */
function isCoarse(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true
}

/**
 * 绑定触屏 tap：pointerup 触发 handler（文本节点路径可靠），同一次手势的 compat click
 * 由 clickIgnorable() 判定忽略。返回解绑函数。
 *
 * 绑定无条件、判定按运行时 coarse 环境门控（fine pointer 下 pointerup 不接管）——
 * fine 场景维持纯 click 语义：① 右/中键 pointerup 不会误触发（右键无 compat click，
 * 行为与修复前一致）；② click 通道携带真实 MouseEvent（split 的 oas-action
 * originalEvent 完整）；③ 键盘 Enter 的 click 不受 dedup 残留影响。
 */
export function bindCoarseTap(el: EventTarget, handler: () => void): () => void {
  const onUp = (e: Event): void => {
    if (!isCoarse()) return
    // timeStamp 可能为 0（部分合成事件）：?? 不兜底 0，显式判正
    const ts = (e as PointerEvent).timeStamp
    handledTaps.set(el, ts > 0 ? ts : Date.now())
    handler()
  }
  el.addEventListener('pointerup', onUp)
  return () => el.removeEventListener('pointerup', onUp)
}

/** click 是否应忽略（同一 anchor 的 pointerup 刚已处理过本次 tap） */
export function clickIgnorable(el: EventTarget, e: Event): boolean {
  const t = handledTaps.get(el)
  if (t == null) return false
  const now = (e as MouseEvent).timeStamp ?? Date.now()
  return now - t < DEDUP_MS
}
