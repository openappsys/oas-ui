import { OASElement } from '@oas-ui/core'
import { resolveLocale } from '../../form/calendar/date-grid.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* 大数字默认档位固定（语义同 h1，不随外层 font-size 意外变化）；
     定制开口：组件级变量 --oas-number-animation-font（如 32px） */
  font-size: var(--oas-number-animation-font, var(--oas-font-size-lg));
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

/**
 * 缓动四档枚举（克制，linear/ease-out/ease-in-out/spring）；
 * 非法值回落 ease-out。spring 为轻度过冲回弹（easeOutBack，c1=1.2）。
 */
const EASING: Record<string, (t: number) => number> = {
  linear: (t) => t,
  'ease-out': easeOutCubic,
  'ease-in': (t) => t * t * t,
  'ease-in-out': (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  spring: (t) => {
    const c1 = 1.2
    return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
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
 * oas-number-animation —— 数字滚动动画（从起始值缓动到目标值）。
 *
 * 属性（kebab-case）：
 * - `value`：目标数值；非法按 0
 * - `from`：起始值（默认 0）；仅新一轮起播生效（首轮起播点/续动不中途改起点）
 * - `duration`：动画时长（毫秒），默认 1500；0 直接跳目标
 * - `to-fixed`：小数位（Number.prototype.toFixed）；缺省整数显示（四舍五入）
 * - `easing`：缓动档 `linear` / `ease-out`（默认）/ `ease-in` / `ease-in-out` / `spring`
 * - `active`：受控播放（默认 true）；false 停帧在当前值，false→true 从当前值续动到目标
 * - `group-separator`：千分位分组（`"true"` 开启，Intl locale 感知；默认关闭）
 *
 * 事件：`oas-finish`，detail `{ value: 目标值 }`，每轮起播至多派发一次；
 * `prefers-reduced-motion` 时直接跳目标并同样派发。
 *
 * 方法：`play()` 手动重播一轮（从 `from` 起播；播放中防重入）。
 *
 * 实现：requestAnimationFrame + 缓动插值；中途改 value 从当前显示值续动；
 * rAF 经 onCleanup 取消，断开连接无泄漏。
 */
export class OASNumberAnimation extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'from', 'duration', 'to-fixed', 'easing', 'active', 'group-separator']
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
  /** 上一轮 update 时的 active 态（边沿检测：false→true 触发播放） */
  private wasActive = true
  /** 千分位格式化器缓存（Intl.NumberFormat 每帧构造有开销，按 locale|小数位 键控缓存） */
  private formatter: { key: string; fmt: Intl.NumberFormat } | null = null

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

  /** active 受控：缺席（默认）或任意非 "false" 值为播放；"false" 为停帧 */
  private isActive(): boolean {
    return !this.hasAttribute('active') || this.getAttr('active', '') !== 'false'
  }

  protected override update(): void {
    const display = this.shadow.querySelector<HTMLElement>('[part="value"]')
    if (!display) return

    const target = this.resolveValue()
    const duration = this.resolveDuration()

    // active=false：停帧（取消 rAF，保持当前显示值）；从未起播时静态显示起始值
    if (!this.isActive()) {
      this.stop()
      if (this.lastTarget === null) {
        this.current = this.resolveFrom()
        this.from = this.current
        this.to = target
        this._duration = duration
        this.lastTarget = target
        this.renderText()
      }
      this.wasActive = false
      return
    }

    // false→true 边沿：从当前显示值续动到目标（暂停恢复 / 延迟触发同路径）
    if (!this.wasActive && this.lastTarget !== null && this.current !== target) {
      this.wasActive = true
      this.startRound(this.current, target, duration)
      return
    }
    this.wasActive = true

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

    // 新一轮起播：首轮起点取 from 属性；目标变化续动轮起点为当前显示值
    const from = this.lastTarget === null ? this.resolveFrom() : this.current
    this.startRound(from, target, duration)
  }

  /** 手动重播一轮：从 from 起播到目标；播放中防重入（每轮至多一次 oas-finish） */
  play(): void {
    if (this.raf) return
    const target = this.resolveValue()
    const duration = this.resolveDuration()
    this.wasActive = true
    if (prefersReducedMotion() || duration <= 0) {
      this.stop()
      const changed = this.current !== target || this.lastTarget !== target
      this.current = target
      this.from = target
      this.to = target
      this._duration = duration
      this.lastTarget = target
      this.renderText()
      if (changed) this.emit('finish', { value: target })
      return
    }
    this.startRound(this.resolveFrom(), target, duration)
  }

  /** 起播一轮：起点即目标时定值不启动动画（不派发 finish，与挂载即定值同语义） */
  private startRound(from: number, to: number, duration: number): void {
    this.stop()
    this.from = from
    this.to = to
    this._duration = duration
    this.lastTarget = to
    if (from === to) {
      this.current = to
      this.renderText()
      return
    }
    // -1 表示尚未开始（首帧 ts 可能为 0，不能用 0 作哨兵）
    this.startedAt = -1
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (ts: number): void => {
    if (this.startedAt < 0) this.startedAt = ts
    const p = Math.min(1, (ts - this.startedAt) / this._duration)
    const ease = EASING[this.getAttr('easing', 'ease-out')] ?? easeOutCubic
    this.current = this.from + (this.to - this.from) * ease(p)
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
    const digits = Number.isFinite(fixed) && fixed >= 0 ? Math.min(20, Math.floor(fixed)) : 0
    // 千分位：Intl locale 感知（config-provider / setLocale），格式化器按 locale|小数位 缓存
    if (this.getAttr('group-separator', '') === 'true') {
      const locale = resolveLocale(this)
      const key = `${locale}|${digits}`
      if (!this.formatter || this.formatter.key !== key) {
        this.formatter = {
          key,
          fmt: new Intl.NumberFormat(locale, {
            useGrouping: true,
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          }),
        }
      }
      return this.formatter.fmt.format(n)
    }
    if (Number.isFinite(fixed) && fixed >= 0) return n.toFixed(digits)
    // 未指定 to-fixed：整数显示（四舍五入）
    return String(Math.round(n))
  }

  private resolveValue(): number {
    const n = Number(this.getAttr('value', '0'))
    return Number.isFinite(n) ? n : 0
  }

  private resolveFrom(): number {
    const n = Number(this.getAttr('from', '0'))
    return Number.isFinite(n) ? n : 0
  }

  private resolveDuration(): number {
    const n = Number(this.getAttr('duration', String(DEFAULT_DURATION)))
    if (!Number.isFinite(n)) return DEFAULT_DURATION
    return Math.max(0, n)
  }
}
