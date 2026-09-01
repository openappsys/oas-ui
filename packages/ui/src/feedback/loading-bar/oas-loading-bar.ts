import { OASElement } from '@oas-ui/core'

/**
 * oas-loading-bar —— 页面/局部容器顶部的加载进度条（命令式 API 驱动）。
 *
 * 能力约定：
 * - 会话计数：多次 start 并发计数，最后一个 finish/error 才收尾（P1）
 * - position：top（默认）/bottom 两向，不做垂直条（P3）
 * - local：挂载到指定容器时相对容器定位（P4 由服务层设置）
 * - 增量控制：increment/set/decrement + start(speed) 推进节拍可配（P5）
 * - 生命周期事件：oas-start / oas-finish / oas-error + active 活动态查询（P6）
 * - 动画只走 transform/opacity：推进 scaleX、收尾满格 + 淡出（P7）
 * - 视觉 token：颜色/高度/层级全部 CSS 变量开口（P8）
 * - reverse / RTL：反向推进 + 逻辑属性布局（P9）
 * - error 兜底：未 start 直接 error 以错误态满格收尾，不闪烁（P10）
 */

/** 自动推进封顶（收尾前不显满，finish/error 才补满格） */
const AUTO_CAP = 90
/** 收尾淡出时长（ms），与 CSS `--oas-transition-base` 档位无关的独立节奏 */
const LEAVE_MS = 240
/** 收尾后移除延时（须 ≥ 淡出时长，保证动画完整展示） */
const REMOVE_DELAY = 280
/** speed 节拍夹取范围（ms/拍） */
const SPEED_MIN = 50
const SPEED_MAX = 5000

const STYLE = `
:host {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  inset-inline-end: 0;
  height: var(--oas-loading-bar-height, 3px);
  z-index: var(--oas-loading-bar-z-index, calc(var(--oas-z-index-base, 0) + var(--oas-z-message, 1060)));
  pointer-events: none;
  font-family: inherit;
  opacity: 1;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out);
}
:host([position='bottom']) {
  inset-block-start: auto;
  inset-block-end: 0;
}
/* 局部容器模式：相对容器定位（容器需为定位上下文） */
:host([local]) {
  position: absolute;
}
.track {
  position: absolute;
  inset-block: 0;
  inset-inline: 0;
  background: var(--oas-loading-bar-color, var(--oas-color-primary));
  transform: scaleX(var(--lb-p, 0));
  transform-origin: 0 50%;
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
  will-change: transform;
}
/* 反向推进：从行内末端生长；RTL 下行内起点在右，默认即从右生长 */
:host([reverse]) .track,
:host(:dir(rtl)) .track {
  transform-origin: 100% 50%;
}
:host([reverse]:dir(rtl)) .track {
  transform-origin: 0 50%;
}
.track[data-status='error'] {
  background: var(--oas-loading-bar-error-color, var(--oas-color-danger));
}
/* 收尾：满格快进 + 淡出（transform/opacity 过渡，不走 width/background 动画） */
:host([data-leaving]) .track {
  transition: transform 120ms var(--oas-ease-out);
}
:host([data-leaving]) {
  opacity: 0;
  transition: opacity ${LEAVE_MS}ms var(--oas-ease-out);
}
/* 动效偏好减弱：过渡瞬时完成 */
@media (prefers-reduced-motion: reduce) {
  :host([data-leaving]),
  :host([data-leaving]) .track {
    transition: none;
  }
}
`

export class OASLoadingBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['position', 'reverse', 'speed', 'status', 'local']
  }

  private track: HTMLElement | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private removeTimer: ReturnType<typeof setTimeout> | null = null
  /** 活跃会话计数：start +1，finish/error -1，归零才收尾 */
  private sessionCount = 0
  /** 批次内是否发生过 error：任一 error 决定收尾终态 */
  private terminalError = false
  /** 当前进度 0–100 */
  private progress = 0
  /** 推进节拍（ms/拍），update() 从 speed 属性同步 */
  private tickMs = 200
  /** 是否处于收尾淡出中（拒绝重复收尾/推进） */
  private leaving = false

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="track" part="track" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
    `
    this.track = this.shadow.querySelector('.track')
    // 断开连接时统一清理推进/移除计时器
    this.onCleanup(() => {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
      if (this.removeTimer) {
        clearTimeout(this.removeTimer)
        this.removeTimer = null
      }
    })
    this.update()
  }

  protected override update(): void {
    // speed 属性 → 节拍（夹取防跑飞）
    const speed = Number(this.getAttr('speed', '200')) || 200
    this.tickMs = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed))
    // 活动态同步到 aria-busy（动态状态读屏同步）
    this.setAttribute('aria-busy', this.active ? 'true' : 'false')
    if (!this.track) return
    this.track.style.setProperty('--lb-p', String(this.progress / 100))
    this.track.setAttribute('aria-valuenow', String(Math.round(this.progress)))
    this.track.setAttribute('data-status', this.getAttr('status', ''))
  }

  /** 当前是否有活跃会话（start 后 true，收尾后 false） */
  get active(): boolean {
    return this.sessionCount > 0 && !this.leaving
  }

  /** 当前活跃会话数（并发 start 计数，供查询） */
  get sessions(): number {
    return this.sessionCount
  }

  /** 开始一个加载会话：并发计数 +1；首个会话触发推进与 oas-start */
  start(speed?: number): void {
    if (typeof speed === 'number' && speed > 0) this.setAttribute('speed', String(speed))
    // 收尾淡出途中重新开始：取消移除、复位视觉
    if (this.leaving) {
      if (this.removeTimer) {
        clearTimeout(this.removeTimer)
        this.removeTimer = null
      }
      this.leaving = false
      this.removeAttribute('data-leaving')
      this.removeAttribute('status')
      this.progress = 0
    }
    const first = this.sessionCount === 0
    this.sessionCount++
    if (first) {
      this.terminalError = false
      this.schedule()
      this.emit('start', { count: this.sessionCount })
    }
    this.update()
  }

  /** 完成一个会话：并发计数 -1；仅最后一个 finish 触发收尾 */
  finish(): void {
    if (this.sessionCount > 0) this.sessionCount--
    if (this.sessionCount === 0) this.complete('success')
    else this.update()
  }

  /**
   * 失败收尾：并发计数 -1；批次内任一 error 决定最终终态。
   * 未 start 直接调用为兜底场景——不推进、直接错误态满格收尾（不闪烁）。
   */
  error(): void {
    if (this.sessionCount > 0) {
      this.terminalError = true
      this.sessionCount--
      if (this.sessionCount > 0) {
        this.update()
        return
      }
      this.complete('error')
      return
    }
    this.complete('error')
  }

  /** 手动推进 step（默认随机 0–10）；夹取 0–100 */
  increment(step?: number): void {
    const s = step ?? Math.random() * 10
    this.setProgress(this.progress + s)
  }

  /** 精确设置进度（0–100 夹取） */
  set(percent: number): void {
    this.setProgress(percent)
  }

  /** 手动回退 step（默认随机 0–10）；夹取 0–100 */
  decrement(step?: number): void {
    const s = step ?? Math.random() * 10
    this.setProgress(this.progress - s)
  }

  private setProgress(value: number): void {
    this.progress = Math.min(100, Math.max(0, value))
    this.update()
  }

  /** 自动推进：逼近 90% 封顶的渐进曲线（快—慢） + 轻微抖动 */
  private tick(): void {
    if (this.leaving || this.sessionCount === 0) return
    const remaining = AUTO_CAP - this.progress
    this.progress = Math.min(
      AUTO_CAP,
      this.progress + Math.max(0.3, remaining * 0.12 + (Math.random() - 0.35) * 4),
    )
    this.update()
    this.schedule()
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.tick(), this.tickMs)
  }

  /** 收尾统一出口：满格 + 终态视觉 + 淡出 + 生命周期事件 + 延时移除 */
  private complete(status: 'success' | 'error'): void {
    if (this.leaving) return
    this.leaving = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.progress = 100
    const isError = status === 'error' || this.terminalError
    if (isError) this.setAttribute('status', 'error')
    else this.removeAttribute('status')
    this.setAttribute('data-leaving', '')
    this.update()
    this.emit(isError ? 'error' : 'finish', { count: this.sessionCount })
    this.removeTimer = setTimeout(() => this.remove(), REMOVE_DELAY)
  }
}
