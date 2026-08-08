import { OASElement } from '@oas-ui/core'

/**
 * 时长 token 格式化：DD/D（天）、HH/H（小时）、mm/m（分）、ss/s（秒）。
 * - 模板含 D/DD 时 HH 为当天内小时（0-23），天单列
 * - 模板不含 D/DD 时天滚入小时（如 25:01:01）
 * 非负；负数按 0。
 */
export function formatDuration(ms: number, format: string): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSec / 86400)
  const withinDayHours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const hours = /D/.test(format) ? withinDayHours : days * 24 + withinDayHours
  const map: Record<string, string> = {
    DD: String(days).padStart(2, '0'),
    D: String(days),
    HH: String(hours).padStart(2, '0'),
    H: String(hours),
    mm: String(minutes).padStart(2, '0'),
    m: String(minutes),
    ss: String(seconds).padStart(2, '0'),
    s: String(seconds),
  }
  return format.replace(/DD|D|HH|H|mm|m|ss|s/g, (token) => map[token] ?? token)
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  font-size: var(--oas-font-size-lg);
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
}
[part='display'] {
  line-height: 1;
}
`

export class OASCountdown extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'format']
  }

  private timer: ReturnType<typeof setInterval> | null = null
  private endAt = 0
  private finished = false
  private lastValue: number | null = null
  /** 刚重置后的完整值：首次 tick 前保持整值显示，避免 endAt-Date.now() 毫秒漂移少 1 秒 */
  private pendingStart: number | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <span class="display" part="display" aria-live="off"></span>
    `
    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
    })
    this.update()
  }

  protected override update(): void {
    const value = Math.max(0, Number(this.getAttr('value', '0')) || 0)
    if (value !== this.lastValue) {
      this.lastValue = value
      this.endAt = Date.now() + value
      this.finished = value <= 0
      this.pendingStart = value
    } else if (!this.finished && this.endAt - Date.now() <= 0) {
      // 断开期间已过截止点：重连即时收尾
      this.finished = true
      this.emit('finish')
    }
    this.renderDisplay()
    this.schedule()
  }

  private renderDisplay(): void {
    const el = this.shadow.querySelector<HTMLElement>('[part="display"]')
    if (!el) return
    const remaining = this.finished
      ? 0
      : this.pendingStart ?? Math.max(0, this.endAt - Date.now())
    el.textContent = formatDuration(remaining, this.getAttr('format', 'HH:mm:ss'))
  }

  private schedule(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.finished) return
    this.timer = setInterval(() => {
      this.pendingStart = null
      const remaining = Math.max(0, this.endAt - Date.now())
      this.renderDisplay()
      if (remaining <= 0) {
        this.finished = true
        if (this.timer) clearInterval(this.timer)
        this.emit('finish')
      }
    }, 250)
  }
}
