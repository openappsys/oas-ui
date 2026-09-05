import type { ReactiveController } from '@oas-ui/core'
import type { PopoverContextmenuCapability } from './oas-popover.js'

/** 触屏长按触发时长（ms，trigger 含 contextmenu 时生效，移动端无右键的替代） */
const LONG_PRESS_MS = 500
/** 长按期间手指滑动超过该阈值视为滚动手势，取消长按（px） */
const LONG_PRESS_SLIP = 10
/** 响应式断点表（移动优先 min-width，px；协议同 space/grid） */
const BREAKPOINT_PX: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 }

/** contextmenu 能力宿主面（OASPopover 公开实现；controller 仅经此访问宿主，不感知宿主实现细节） */
export interface PopoverContextmenuHost {
  /** 触发元素（长按手势绑定目标；bind 解析后固定） */
  getTriggerAnchor(): Element | null
  /** 右键/长按手势门控：非 virtual / 非 disabled / trigger 含 contextmenu（render-panel 回落 manual） */
  hasContextmenuTrigger(): boolean
  /** 以指针坐标（光标/触点）为锚点打开面板（光标定位；生命周期由宿主 cursorRect 管理） */
  openAtPoint(x: number, y: number): void
  /** 请求宿主重算（断点跨越 matchMedia change 触发 placement/size 生效值重新解析） */
  requestRefresh(): void
  /** 读取宿主属性（long-press-delay 等；宿主为 HTMLElement 直接暴露） */
  getAttribute(name: string): string | null
}

/**
 * contextmenu 能力（contextmenu 能力包）：把「右键光标定位 + 触屏长按 + 断点响应」这组
 * 右键族 machinery 从 OASPopover 外置为 ReactiveController，经能力注册表
 * （oas-popover-capability.js）注入宿主。
 *
 * 边界：`trigger="contextmenu"` 的「右键触发开面板」本身是 core 行为（宿主 bind 内保留，
 * 锚定触发元素打开）；本能力在注入后接管其「光标定位」增强——宿主 bind 的 contextmenu
 * 分支检测到本 controller 即委托 openAtCursor（以右键触点为锚点打开）。
 *
 * - 触屏长按：hostConnected 时向触发元素绑定 touch 系列监听（trigger 含 contextmenu 的
 *   移动端替代）；长按生效以触点为锚点打开（同右键光标定位）。
 * - 断点响应：matchMedia 跨越断点 → host.requestRefresh() 重算 placement/size 断点简写
 *   （生效值解析：宿主 resolveResponsive → 本 controller.resolveResponsive）。
 *
 * 未 import 能力包（core-only）时以上增强全部静默失效（右键仍可基础打开、无长按/断点），
 * 宿主对相应配置 dev 告警提示按需引入（见 oas-popover.ts 的 warnContextmenuCapability）。
 */
export class PopoverContextmenuController
  implements ReactiveController, PopoverContextmenuCapability
{
  private host: PopoverContextmenuHost
  private anchor: Element | null = null
  private mqls: MediaQueryList[] = []
  /** 触屏长按计时器与 armed 状态（长按生效后 touchmove 阻止页面滚动） */
  private longPressTimer: ReturnType<typeof setTimeout> | null = null
  private longPressArmed = false
  private longPressX = 0
  private longPressY = 0

  constructor(host: PopoverContextmenuHost) {
    this.host = host
  }

  // ==================== 生命周期 ====================

  hostConnected(): void {
    // 重连防御：先拆旧监听再绑（hostDisconnected 已幂等，双保险防重复绑定）
    this.detach()
    this.anchor = this.host.getTriggerAnchor()
    this.anchor?.addEventListener('touchstart', this.onTouchStart, { passive: false })
    this.anchor?.addEventListener('touchmove', this.onTouchMove, { passive: false })
    this.anchor?.addEventListener('touchend', this.clearLongPress)
    this.anchor?.addEventListener('touchcancel', this.clearLongPress)
    this.bindBreakpoints()
  }

  hostDisconnected(): void {
    this.detach()
  }

  private detach(): void {
    this.clearLongPress()
    if (this.anchor) {
      this.anchor.removeEventListener('touchstart', this.onTouchStart)
      this.anchor.removeEventListener('touchmove', this.onTouchMove)
      this.anchor.removeEventListener('touchend', this.clearLongPress)
      this.anchor.removeEventListener('touchcancel', this.clearLongPress)
      this.anchor = null
    }
    for (const m of this.mqls) m.removeEventListener('change', this.onBreakpointChange)
    this.mqls = []
  }

  // ==================== PopoverContextmenuCapability（宿主 bind / resolveResponsive 委托） ====================

  /** 右键光标定位：以右键触点坐标为锚点打开面板（core 已 preventDefault 并过门控） */
  openAtCursor(e: MouseEvent): void {
    this.host.openAtPoint(e.clientX, e.clientY)
  }

  /** 断点简写解析：按当前视口宽度取生效值（多断点最宽命中胜出；非法断点名忽略回落基础值） */
  resolveResponsive(raw: string): string {
    if (!raw.includes(' ')) return raw
    const tokens = raw.trim().split(/\s+/)
    let base = ''
    if (tokens[0] && !tokens[0].includes(':')) base = tokens.shift()!
    const w = typeof window !== 'undefined' ? window.innerWidth : 0
    let value = base
    let best = -1
    for (const t of tokens) {
      const idx = t.indexOf(':')
      const name = t.slice(0, idx)
      const bp = BREAKPOINT_PX[name]
      if (bp == null) continue
      if (w >= bp && bp >= best) {
        best = bp
        value = t.slice(idx + 1)
      }
    }
    return value
  }

  // ==================== 断点响应（matchMedia） ====================

  /** 挂 matchMedia 监听：断点跨越 → 宿主重算（placement/size 断点简写生效值） */
  private bindBreakpoints(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    this.mqls = Object.values(BREAKPOINT_PX).map((px) => window.matchMedia(`(min-width: ${px}px)`))
    for (const m of this.mqls) m.addEventListener('change', this.onBreakpointChange)
  }

  private onBreakpointChange = (): void => {
    this.host.requestRefresh()
  }

  // ==================== 触屏长按（trigger 含 contextmenu 时；移动端无右键的替代） ====================

  private onTouchStart = (e: Event): void => {
    if (!this.host.hasContextmenuTrigger()) return
    const touch = (e as TouchEvent).touches ? Array.from((e as TouchEvent).touches)[0] : undefined
    if (!touch) return
    this.longPressX = touch.clientX
    this.longPressY = touch.clientY
    this.clearLongPress()
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null
      this.longPressArmed = true
      // 长按生效：以触点为光标点打开（同右键光标定位）
      this.host.openAtPoint(this.longPressX, this.longPressY)
    }, this.longPressDelayMs())
  }

  /** 长按触发时长：`long-press-delay` 属性（ms），缺省回落内置默认 500 */
  private longPressDelayMs(): number {
    const v = Number.parseInt(this.host.getAttribute('long-press-delay') ?? '', 10)
    return Number.isFinite(v) && v > 0 ? v : LONG_PRESS_MS
  }

  private onTouchMove = (e: Event): void => {
    // 长按已生效：阻止默认（防止手指移动带动页面滚动，fixed 面板与滚动脱节）
    if (this.longPressArmed) {
      e.preventDefault()
      return
    }
    if (!this.longPressTimer) return
    const touch = (e as TouchEvent).touches ? Array.from((e as TouchEvent).touches)[0] : undefined
    if (!touch) return
    // 滑动超阈值视为滚动手势，取消长按
    const dx = touch.clientX - this.longPressX
    const dy = touch.clientY - this.longPressY
    if (Math.hypot(dx, dy) > LONG_PRESS_SLIP) this.clearLongPress()
  }

  private clearLongPress = (): void => {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    this.longPressArmed = false
  }
}

/** 便捷：构造 contextmenu 能力 controller（供能力注册表 / 组装类 addController 用） */
export function createContextmenuController(host: PopoverContextmenuHost): PopoverContextmenuController {
  return new PopoverContextmenuController(host)
}
