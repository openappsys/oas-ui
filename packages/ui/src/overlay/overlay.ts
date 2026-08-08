/**
 * overlay 管理器：
 * - body 级统一容器，浮层挂载于此（跨 Shadow DOM）；存在 app 容器时挂到 app 内（就近）
 * - z-index 递增分配，默认取 --oas-z-overlay token
 * - onOutside：点击浮层外部（composedPath 检测）时回调
 * - destroyOverlay：一次性销毁全部浮层与监听
 */
import { resolveMessageHost } from '../floating/app/app-host.js'

const CONTAINER_TAG = 'oas-overlay-container'

interface OverlayOptions {
  onOutside?: () => void
  zIndex?: number
}

let container: HTMLElement | null = null
let currentZ = 0
let outsideHandlers = new Map<HTMLElement, () => void>()

function ensureContainer(): HTMLElement {
  if (container && container.isConnected) return container
  container = document.createElement(CONTAINER_TAG)
  container.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 0;'
  resolveMessageHost().appendChild(container)
  return container
}

function baseZ(): number {
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
      document.addEventListener('click', handleOutside, true)
    }
  }
  return el
}

function handleOutside(e: MouseEvent): void {
  const path = e.composedPath()
  for (const [el, handler] of outsideHandlers) {
    if (!path.includes(el)) handler()
  }
}

export function removeOverlay(el: HTMLElement): void {
  el.remove()
  if (outsideHandlers.delete(el) && outsideHandlers.size === 0) {
    document.removeEventListener('click', handleOutside, true)
  }
}

export function destroyOverlay(): void {
  if (container) container.remove()
  container = null
  currentZ = 0
  outsideHandlers = new Map()
  document.removeEventListener('click', handleOutside, true)
}
