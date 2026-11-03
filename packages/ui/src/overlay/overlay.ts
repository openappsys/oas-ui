/**
 * overlay 管理器：
 * - body 级统一容器，浮层挂载于此（跨 Shadow DOM）；存在 app 容器时挂到 app 内（就近）
 * - z-index 递增分配，默认取 --oas-z-overlay token
 * - onOutside：点击浮层外部（composedPath 检测）时回调
 * - destroyOverlay：一次性销毁全部浮层与监听
 */
import { resolveMessageHost } from '../framework/app/app-host.js'
import { addOutsideDismiss, removeOutsideDismiss } from '../shared/outside-dismiss.js'

const CONTAINER_TAG = 'oas-overlay-container'

interface OverlayOptions {
  onOutside?: () => void
  zIndex?: number
}

let container: HTMLElement | null = null
let currentZ = 0
let outsideHandlers = new Map<HTMLElement, () => void>()

/** 触屏同一手势的双通道去重窗口（pointerup 与紧随的合成 click 视为同一次 tap） */
const OUTSIDE_DEDUPE_MS = 500
/** 上一个被接受的外点通道与时刻：另一通道在窗口内到达即视为同一手势的第二次到达 */
let lastOutsideChannel: 'click' | 'pointerup' | '' = ''
let lastOutsideAt = 0

function ensureContainer(): HTMLElement {
  if (container && container.isConnected) return container
  container = document.createElement(CONTAINER_TAG)
  container.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 0;'
  resolveMessageHost().appendChild(container)
  return container
}

/** 浮层 z-index 起始值：优先 --oas-z-index-base（config-provider z-index 全局起始值，写在 documentElement 时生效），
 *  否则 --oas-z-overlay token，最后回落硬编码 1040 */
function baseZ(): number {
  const baseRaw = getComputedStyle(document.documentElement).getPropertyValue('--oas-z-index-base').trim()
  const base = Number(baseRaw)
  if (Number.isFinite(base) && base > 0) return base
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--oas-z-overlay').trim()
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? 1040 : parsed
}

export function createOverlay(el: HTMLElement, options: OverlayOptions = {}): HTMLElement {
  const host = ensureContainer()
  const z = options.zIndex ?? Math.max(baseZ(), currentZ + 1)
  currentZ = Math.max(currentZ, z)
  el.style.zIndex = String(z)
  el.style.pointerEvents = 'auto'
  host.appendChild(el)

  if (options.onOutside) {
    outsideHandlers.set(el, options.onOutside)
    if (outsideHandlers.size === 1) {
      addOutsideDismiss(handleOutside)
    }
  }
  return el
}

function handleOutside(e: MouseEvent): void {
  // 触屏同一次 tap 双通道到达（coarse pointerup + 合成 click），已去重：另一通道在窗口内
  // 视为同一手势的第二次到达，忽略（不刷新时刻，避免连带吞掉随后的真实手势）。
  const channel: 'click' | 'pointerup' = e.type === 'pointerup' ? 'pointerup' : 'click'
  const now = performance.now()
  if (lastOutsideChannel && lastOutsideChannel !== channel && now - lastOutsideAt < OUTSIDE_DEDUPE_MS) return
  lastOutsideChannel = channel
  lastOutsideAt = now
  const path = e.composedPath()
  for (const [el, handler] of outsideHandlers) {
    if (!path.includes(el)) handler()
  }
}

/** 重置去重状态（浮层全部移除后，下一位消费者不继承上一手势的通道） */
function resetOutsideDedupe(): void {
  lastOutsideChannel = ''
  lastOutsideAt = 0
}

export function removeOverlay(el: HTMLElement): void {
  el.remove()
  if (outsideHandlers.delete(el) && outsideHandlers.size === 0) {
    removeOutsideDismiss(handleOutside)
    resetOutsideDedupe()
  }
}

export function destroyOverlay(): void {
  if (container) container.remove()
  container = null
  currentZ = 0
  outsideHandlers = new Map()
  removeOutsideDismiss(handleOutside)
  resetOutsideDedupe()
}
