/**
 * 共享浮层设施（内部模块，不经公开入口导出）。
 *
 * 背景：modal / drawer / tour / dropdown / context-menu / sidebar 曾各自监听 document keydown
 * 处理 Esc、各自维护 body 滚动锁计数。后果：
 * - 多层浮层同开时一次 Esc 同时关闭多层（每个组件都看到同一个事件）；
 * - modal 与 drawer 两套独立计数锁互相覆盖原值 → 某些关闭顺序下 body 永久锁死；
 * - tour 直接写 `body.style.overflow = ''` 抹掉宿主已有的 inline 值。
 *
 * 本模块是唯一收口点：
 * - Esc 层栈：后进先出，最上层消费后 preventDefault + stopImmediatePropagation；
 *   `handle()` 返回 false 表示「本层不处理」交给下一层；`active()` 为 false 时整层跳过
 *   （抽屉在可见模态之下时不抢 Esc）；`promoteEscapeLayer()` 让非模态族把已压栈的层提到栈顶
 *   （Esc 顺序跟随视觉置前，而非打开先后）。
 * - body 滚动锁：跨组件引用计数，最后一个释放时精确恢复宿主 inline 原值
 *   （overflow + padding-right 滚动条补偿）。
 */

/** Esc 层：由打开中的浮层压栈/退栈 */
export interface OverlayEscapeLayer {
  /** 调试标识（不参与逻辑） */
  name?: string
  /** 处理 Esc；返回 false 表示不消费、交给下一层（其余返回值均视为已消费） */
  handle: () => boolean | void
  /** 动态活性判断：返回 false 时本次 Esc 跳过该层（不调用 handle） */
  active?: () => boolean
}

const escapeLayers: OverlayEscapeLayer[] = []
let escapeListenerBound = false

/** 唯一的文档级 Esc 监听：从栈顶向下寻找第一个可处理层，消费后阻断其余监听 */
function onDocumentKeydown(e: KeyboardEvent): void {
  // 输入法组合中的 Esc 用于取消组合，不关闭浮层
  if (e.key !== 'Escape' || e.isComposing) return
  for (let i = escapeLayers.length - 1; i >= 0; i--) {
    const layer = escapeLayers[i]!
    if (layer.active && !layer.active()) continue
    const consumed = layer.handle()
    if (consumed === false) continue
    e.preventDefault()
    // 同一节点上后注册的 document 监听（宿主/其他组件）不再收到本次 Esc
    e.stopImmediatePropagation()
    return
  }
}

/**
 * 压入 Esc 层，返回释放函数（幂等）。
 * 释放函数必须在浮层关闭/断开连接时调用，否则会残留「幽灵层」吞掉后续 Esc。
 */
export function pushEscapeLayer(layer: OverlayEscapeLayer): () => void {
  escapeLayers.push(layer)
  if (!escapeListenerBound && typeof document !== 'undefined') {
    document.addEventListener('keydown', onDocumentKeydown)
    escapeListenerBound = true
  }
  let released = false
  return () => {
    if (released) return
    released = true
    const idx = escapeLayers.indexOf(layer)
    if (idx >= 0) escapeLayers.splice(idx, 1)
    if (escapeLayers.length === 0 && escapeListenerBound && typeof document !== 'undefined') {
      document.removeEventListener('keydown', onDocumentKeydown)
      escapeListenerBound = false
    }
  }
}

/**
 * 把已压栈的 Esc 层移到栈顶（幂等）。
 *
 * 适用场景：同一族多个非模态面板按「打开先后」压层，但用户点 A 把它置前后，视觉最前的是 A，
 * 一次 Esc 应当关 A 而不是后开的 B——Esc 顺序必须跟随激活顺序，不能停留在打开顺序。
 * 未压栈（已释放）时返回 false，不会凭空复活幽灵层。
 */
export function promoteEscapeLayer(layer: OverlayEscapeLayer): boolean {
  const idx = escapeLayers.indexOf(layer)
  if (idx < 0) return false
  if (idx !== escapeLayers.length - 1) {
    escapeLayers.splice(idx, 1)
    escapeLayers.push(layer)
  }
  return true
}

/** 引用计数状态 */
let scrollLockDepth = 0
let originalOverflow = ''
let originalPaddingRight = ''

/** 滚动条宽度：视口宽 - 文档宽（桌面端约 8-17px，移动端 0） */
function scrollbarWidth(): number {
  if (typeof window === 'undefined' || typeof document.documentElement === 'undefined') return 0
  const w = window.innerWidth - document.documentElement.clientWidth
  return w > 0 ? w : 0
}

/**
 * 锁定 body 滚动（跨组件共享引用计数），返回释放函数（幂等）。
 * 首层持锁时记录宿主 inline 原值并补偿滚动条宽度；最后一层释放时精确还原原值。
 */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (scrollLockDepth === 0) {
    originalOverflow = document.body.style.overflow
    originalPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    const gap = scrollbarWidth()
    document.body.style.paddingRight =
      gap > 0 ? `calc(${originalPaddingRight || '0px'} + ${gap}px)` : originalPaddingRight
  }
  scrollLockDepth++
  let released = false
  return () => {
    if (released) return
    released = true
    scrollLockDepth = Math.max(0, scrollLockDepth - 1)
    if (scrollLockDepth === 0) {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }
}
