/**
 * 移动形态（底部抽屉承载）判定 + 变化监听。
 *
 * 判定：coarse pointer（触屏）或窄视口（宽度 <768px）。浮层组件据此把下拉切换为
 * oas-bottom-sheet 底部抽屉承载（移动端）或 fixed 锚定下拉（PC）。
 *
 * 为什么需要监听：该条件依赖「指针类型 + 视口宽度」，二者会随窗口缩放 / 横竖屏 /
 * 设备仿真切换而变。若只在 update()/打开时判定一次，形态会冻结在上次结果——实测
 * PC↔mobile 互相切换不重判定、要刷新才正确。故提供订阅：条件越界时回调，由组件
 * 重新同步形态（含展开态的承载方式）。
 */

/** 窄视口断点（与 isMobileSheet 的 innerWidth<768 等价，用 MQL 以便 change 订阅） */
const NARROW_QUERY = '(max-width: 767px)'
const COARSE_QUERY = '(pointer: coarse)'

/** 当前是否移动形态：coarse pointer（触屏）或窄视口（<768px） */
export function isMobileSheetMode(win: Window = window): boolean {
  if (typeof win === 'undefined' || typeof win.matchMedia !== 'function') return false
  return win.matchMedia(COARSE_QUERY).matches || win.matchMedia(NARROW_QUERY).matches
}

/**
 * 订阅移动形态条件变化（仅在越界时触发，非每帧）。返回清理函数。
 * SSR / 无 matchMedia 环境返回空清理函数。
 */
export function watchMobileSheetMode(onChange: () => void, win: Window = window): () => void {
  if (typeof win === 'undefined' || typeof win.matchMedia !== 'function') return () => {}
  const coarse = win.matchMedia(COARSE_QUERY)
  const narrow = win.matchMedia(NARROW_QUERY)
  const handler = (): void => onChange()
  coarse.addEventListener('change', handler)
  narrow.addEventListener('change', handler)
  return () => {
    coarse.removeEventListener('change', handler)
    narrow.removeEventListener('change', handler)
  }
}
