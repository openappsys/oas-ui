import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  font-size: var(--oas-font-size-lg);
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
}
:host([hidden]) {
  display: none;
}
[part='value'] {
  line-height: 1;
}
`

/** 默认动画时长（毫秒） */
const DEFAULT_DURATION = 1500

/** 缓动函数：ease-out cubic（先快后慢） */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** prefers-reduced-motion 探测（happy-dom 等环境可能缺失 matchMedia） */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/**
 * oas-number-animation —— 数字滚动动画（从当前值缓动到目标值）。
 *
 * 属性（kebab-case）：
 * - `value`：目标数值；非法按 0
 * - `duration`：动画时长（毫秒），默认 1500；0 直接跳目标
 * - `to-fixed`：小数位（Number.prototype.toFixed）；缺省整数显示（四舍五入）
 *
 * 事件：`oas-finish`，detail `{ value: 目标值 }`，动画抵达目标时派发一次；
 * `prefers-reduced-motion` 时直接跳目标并同样派发。
 *
 * 实现：requestAnimationFrame + easeOutCubic 缓动；中途改 value 从当前显示值续动；
 * rAF 经 onCleanup 取消，断开连接无泄漏。
 */
export class OASNumberAnimation extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'duration', 'to-fixed']
  }

  private raf = 0
  private from = 0
  private to = 0
  private _duration = DEFAULT_DURATION

  /** Vue/React 会把 duration 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get duration(): number {
    return this._duration
  }
  set duration(value: number | string) {
    this.setAttribute('duration', String(value))
  }
  private startedAt = 0
  private current = 0
  /** 已抵达/正在动画的目标值；null 表示尚未初始化 */
  private lastTarget: number | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="value" part="value"></span>
    `
  }

  /** 缓存节点引用 + 注册清理（render 与水合路径共用；动画 rAF 在 update 内启动） */
  private bind(): void {
    this.onCleanup(() => this.stop())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（value 节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="value"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const display = this.shadow.querySelector<HTMLElement>('[part="value"]')
    if (!display) return

    const target = this.resolveValue()
    const duration = this.resolveDuration()

    // 减动偏好或 0 时长：直接跳目标
    if (prefersReducedMotion() || duration <= 0) {
      this.stop()
      const changed = this.lastTarget !== target
      this.current = target
      this.from = target
      this.to = target
      this._duration = duration
      this.lastTarget = target
      this.renderText()
      if (changed) this.emit('finish', { value: target })
      return
    }

    // 目标未变：仅刷新显示，不重启动画
    if (this.lastTarget === target) {
      this._duration = duration
      this.renderText()
      return
    }

    // 从当前显示值续动到新目标
    this.stop()
    this.from = this.lastTarget === null ? 0 : this.current
    this.to = target
    // 起点即目标（如挂载时 value=0）：定值不启动动画
    if (this.from === this.to) {
      this.current = this.to
      this._duration = duration
      this.lastTarget = target
      this.renderText()
      return
    }
    this._duration = duration
    this.lastTarget = target
    // -1 表示尚未开始（首帧 ts 可能为 0，不能用 0 作哨兵）
    this.startedAt = -1
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (ts: number): void => {
    if (this.startedAt < 0) this.startedAt = ts
    const p = Math.min(1, (ts - this.startedAt) / this._duration)
    this.current = this.from + (this.to - this.from) * easeOutCubic(p)
    this.renderText()
    if (p >= 1) {
      this.current = this.to
      this.renderText()
      this.raf = 0
      this.emit('finish', { value: this.to })
      return
    }
    this.raf = requestAnimationFrame(this.tick)
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private renderText(): void {
    const el = this.shadow.querySelector<HTMLElement>('[part="value"]')
    if (!el) return
    el.textContent = this.format(this.current)
  }

  private format(n: number): string {
    const raw = this.getAttr('to-fixed', '')
    const fixed = raw === '' ? NaN : Number(raw)
    if (Number.isFinite(fixed) && fixed >= 0) return n.toFixed(fixed)
    // 未指定 to-fixed：整数显示（四舍五入）
    return String(Math.round(n))
  }

  private resolveValue(): number {
    const n = Number(this.getAttr('value', '0'))
    return Number.isFinite(n) ? n : 0
  }

  private resolveDuration(): number {
    const n = Number(this.getAttr('duration', String(DEFAULT_DURATION)))
    if (!Number.isFinite(n)) return DEFAULT_DURATION
    return Math.max(0, n)
  }
}
