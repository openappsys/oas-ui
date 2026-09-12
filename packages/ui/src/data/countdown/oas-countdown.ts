import { OASElement } from '@oas-ui/core'

/**
 * 时长 token 格式化：DD/D（天）、HH/H（小时）、mm/m（分）、ss/s（秒）、SSS（毫秒，3 位补零）。
 * - 模板含 D/DD 时 HH 为当天内小时（0-23），天单列
 * - 模板不含 D/DD 时天滚入小时（如 25:01:01）
 * 非负；负数按 0。
 */
export function formatDuration(ms: number, format: string): string {
  const clamped = Math.max(0, ms)
  const totalSec = Math.floor(clamped / 1000)
  const millis = Math.floor(clamped - totalSec * 1000)
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
    SSS: String(millis).padStart(3, '0'),
  }
  return format.replace(/DD|D|HH|H|mm|m|ss|s|SSS/g, (token) => map[token] ?? token)
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* 大数字默认档位固定（语义同 h1，不随外层 font-size 意外变化）；
     定制开口：组件级变量 --oas-countdown-font（如 32px） */
  font-size: var(--oas-countdown-font, var(--oas-font-size-lg));
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
}
:host([hidden]) {
  display: none;
}
[part='countdown'] {
  display: inline-flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
[part='title'] {
  font-size: var(--oas-font-size-md);
  font-weight: 400;
  color: var(--oas-color-text-secondary);
}
[part='body'] {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1);
}
[part='prefix'],
[part='suffix'] {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
[part='display'] {
  line-height: 1;
}
`

export class OASCountdown extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'format', 'active', 'title', 'prefix-text', 'suffix-text', 'type', 'start']
  }

  private timer: ReturnType<typeof setInterval> | null = null
  private endAt = 0
  private finished = false
  private lastValue: number | null = null
  /** 刚重置后的完整值：首次 tick 前保持整值显示，避免 endAt-Date.now() 毫秒漂移少 1 秒 */
  private pendingStart: number | null = null
  /** 暂停态：active 移除/置 "false" 时固化计时真值，恢复时按固化值续走（真暂停语义） */
  private paused = false
  /** 暂停期间（与刚重置时）的剩余时长真值（倒计时） */
  private remaining = 0

  /** 正计时（type="countup"）状态：lastStart 跟踪 start 属性变化（变化即重置计时）；
   *  startAt 为当前走时段起点时间戳，elapsed 为已累计毫秒（暂停时冻结），
   *  pendingElapsed 为刚重置/起段的整值（首次 tick 前保持整值显示） */
  private lastStart: number | null = null
  private startAt = 0
  private elapsed = 0
  private pendingElapsed: number | null = null
  /** 上次 update 的模式：type 切换时双模式计数状态各自重初始化，避免残留状态串扰 */
  private lastMode: 'countdown' | 'countup' | '' = ''

  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题）。
   *  title 是原生全局属性——残留会让悬停弹出浏览器原生提示（与可见标题重复的视觉干扰），
   *  按库内既有约定（list-item/statistic 同构）渲染进标题区后即从宿主移除。 */
  private titleCache: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="countdown" part="countdown">
        <div class="title" part="title" hidden><slot name="title"><span class="title-text" data-fallback></span></slot></div>
        <div class="body" part="body">
          <span class="prefix" part="prefix" hidden><slot name="prefix"><span data-fallback></span></slot></span>
          <span class="display" part="display" aria-live="off"></span>
          <span class="suffix" part="suffix" hidden><slot name="suffix"><span data-fallback></span></slot></span>
        </div>
      </div>
    `
  }

  /** 插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private slotHasContent(slot: HTMLSlotElement | null): boolean {
    if (!slot) return false
    return slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 缓存节点引用 + 注册清理（render 与水合路径共用；countdown 无交互事件，仅定时器） */
  private bind(): void {
    this.onCleanup(() => {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
    })
    for (const sel of ['slot[name="title"]', 'slot[name="prefix"]', 'slot[name="suffix"]']) {
      this.shadow.querySelector<HTMLSlotElement>(sel)?.addEventListener('slotchange', () => this.update())
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（display 存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="display"]')) return false
    const snapTitle = this.shadow.querySelector('[part="title"] [data-fallback]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
    this.bind()
    return true
  }

  /** active 受控：缺席（默认）或任意非 "false" 值为走表；"false" 为暂停 */
  private isActive(): boolean {
    return !this.hasAttribute('active') || this.getAttr('active', '') !== 'false'
  }

  /** 正计时模式：type="countup" 从 start（默认 0）往上递增，无终止点 */
  private isCountup(): boolean {
    return this.getAttr('type', '').trim().toLowerCase() === 'countup'
  }

  /** 正计时当前已计时真值（ms）：走表段按时间戳推算，暂停/待起段用固化值 */
  private countupNow(): number {
    return this.paused ? this.elapsed : (this.pendingElapsed ?? this.elapsed + (Date.now() - this.startAt))
  }

  /** tick 粒度：模板含 SSS 毫秒 token 时按 50ms 刷新，否则 250ms（秒边界对齐） */
  private tickMs(): number {
    return this.getAttr('format', 'HH:mm:ss').includes('SSS') ? 50 : 250
  }

  protected override update(): void {
    this.normalizeLegacyAlias('prefix-text', 'prefix')
    this.normalizeLegacyAlias('suffix-text', 'suffix')

    const mode = this.isCountup() ? 'countup' : 'countdown'
    if (mode !== this.lastMode) {
      // 模式切换：进入的模式按初值重建计数状态（倒计时不残留 endAt，正计时反之）
      this.lastMode = mode
      if (mode === 'countdown') this.lastValue = null
      else this.lastStart = null
    }
    if (mode === 'countup') this.updateCountup()
    else this.updateCountdown()
    this.syncActive()

    this.renderDisplay()
    this.schedule()
  }

  /** 倒计时状态推进：value 变化重置；断开期间已过截止点的重连即时收尾 */
  private updateCountdown(): void {
    const value = Math.max(0, Number(this.getAttr('value', '0')) || 0)
    if (value !== this.lastValue) {
      const wasPaused = this.paused
      this.lastValue = value
      this.endAt = Date.now() + value
      this.finished = value <= 0
      this.pendingStart = value
      // 暂停期间宿主改 value：重置剩余时长，保持暂停态
      this.paused = wasPaused
      this.remaining = value
    } else if (!this.finished && !this.paused && this.endAt - Date.now() <= 0) {
      // 断开期间已过截止点：重连即时收尾
      this.finished = true
      this.remaining = 0
      this.emit('finish')
    }
  }

  /** 正计时状态推进：start 变化即重置（保持暂停态）；无终止点，无需收尾分支 */
  private updateCountup(): void {
    const start = Math.max(0, Number(this.getAttr('start', '0')) || 0)
    if (start !== this.lastStart) {
      const wasPaused = this.paused
      this.lastStart = start
      this.elapsed = start
      this.startAt = Date.now()
      this.pendingElapsed = start
      this.paused = wasPaused
    }
  }

  /** active 受控暂停/恢复（两种模式同语义：暂停期间不计时已走过，恢复续走不重置） */
  private syncActive(): void {
    if (!this.isActive() && !this.paused && !this.finished) {
      this.paused = true
      if (this.isCountup()) {
        this.elapsed = this.pendingElapsed ?? this.elapsed + (Date.now() - this.startAt)
        this.pendingElapsed = null
      } else {
        this.remaining = this.pendingStart ?? Math.max(0, this.endAt - Date.now())
        this.pendingStart = null
      }
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    } else if (this.isActive() && this.paused) {
      this.paused = false
      if (this.isCountup()) this.startAt = Date.now()
      else this.endAt = Date.now() + this.remaining
    }
  }

  /** 命令式重置：倒计时回到 value 初值、正计时回到 start 初值重新计时；
   *  active=false（暂停）时只归位不启动 */
  reset(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.isCountup()) {
      const start = Math.max(0, Number(this.getAttr('start', '0')) || 0)
      this.lastStart = start
      this.elapsed = start
      this.startAt = Date.now()
      this.pendingElapsed = start
      this.renderDisplay()
      this.schedule()
      return
    }
    const value = Math.max(0, Number(this.getAttr('value', '0')) || 0)
    this.lastValue = value
    this.remaining = value
    this.endAt = Date.now() + value
    this.finished = value <= 0
    this.pendingStart = value
    this.renderDisplay()
    this.schedule()
  }

  /** 渲染显示值；返回显示文本是否发生变化（oas-change 节流派发依据） */
  private renderDisplay(): boolean {
    const el = this.shadow.querySelector<HTMLElement>('[part="display"]')
    if (!el) return false
    const current = this.isCountup()
      ? this.countupNow()
      : this.finished
        ? 0
        : this.paused
          ? this.remaining
          : (this.pendingStart ?? Math.max(0, this.endAt - Date.now()))
    const next = formatDuration(current, this.getAttr('format', 'HH:mm:ss'))
    const changed = el.textContent !== next
    el.textContent = next
    this.syncHeader()
    return changed
  }

  /** title/prefix/suffix 双通道：属性文本兜底；同名 slot 分发优先（title 走原生吸收） */
  private syncHeader(): void {
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    const titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    const titleSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.shadow.querySelector<HTMLElement>('[part="title"] [data-fallback]')
    if (titleEl && titleSlot && titleFallback) {
      titleFallback.textContent = this.titleCache ?? ''
      const hasTitle = this.slotHasContent(titleSlot) || this.titleCache !== null
      titleFallback.hidden = this.slotHasContent(titleSlot)
      titleEl.hidden = !hasTitle
    }
    for (const [part, attrName] of [
      ['prefix', 'prefix-text'],
      ['suffix', 'suffix-text'],
    ] as const) {
      const affixEl = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      const affixSlot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${part}"]`)
      const affixFallback = this.shadow.querySelector<HTMLElement>(`[part="${part}"] [data-fallback]`)
      if (!affixEl || !affixSlot || !affixFallback) continue
      const attr = this.getAttr(attrName, '')
      affixFallback.textContent = attr
      const hasAffix = this.slotHasContent(affixSlot) || attr !== ''
      affixFallback.hidden = this.slotHasContent(affixSlot)
      affixEl.hidden = !hasAffix
    }
  }

  private schedule(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (this.finished || this.paused || !this.isActive()) return
    this.timer = setInterval(() => {
      if (this.isCountup()) {
        // 正计时：无终止点；显示文本变化时节流派发 oas-change（detail.value 为已计时 ms）
        this.pendingElapsed = null
        const current = this.elapsed + (Date.now() - this.startAt)
        const changed = this.renderDisplay()
        if (changed) this.emit('change', { value: current })
        return
      }
      this.pendingStart = null
      const remaining = Math.max(0, this.endAt - Date.now())
      const changed = this.renderDisplay()
      // 计时变化节流派发：仅显示文本变化才派 oas-change（detail 为剩余 ms）
      if (changed && remaining > 0) this.emit('change', { value: remaining })
      if (remaining <= 0) {
        this.finished = true
        this.remaining = 0
        if (this.timer) clearInterval(this.timer)
        this.timer = null
        this.emit('finish')
      }
    }, this.tickMs())
  }
}
