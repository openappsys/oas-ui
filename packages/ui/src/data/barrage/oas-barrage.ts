import { OASElement } from '@oas-ui/core/oas-element'

/**
 * oas-barrage —— 弹幕（流式轨道 / 速度与密度控制 / 防重叠）。
 *
 * 每条弹幕占一个轨道、从右向左匀速漂过；同一轨道按「前一条完全进场 + 最小间距」
 * 排期，避免追尾重叠；`max-active` 控制同屏密度，超出的进入队列等待。
 *
 * 属性（kebab-case）：
 * - `tracks`：轨道数（正整数，默认 3）
 * - `speed`：漂移速度（像素/秒，默认 120）
 * - `gap`：同轨道相邻弹幕的最小水平间距（px，默认 48）
 * - `max-active`：同屏最大条数（0 = 不限，默认 0）
 * - `paused`：受控暂停（在场=暂停；CSS 动画与排期计时同时暂停）
 * - `height`：舞台高度（纯数字按 px，亦接受 CSS 长度；默认 200px）
 * - `accessible`：布尔，存在时弹幕进入读屏（`role="log"` + `aria-live="polite"`）；
 *   缺省 `aria-hidden`，避免装饰性弹幕持续打扰读屏
 *
 * 方法：
 * - `add(text, options?)`：追加一条（options: `{ color?, key? }`）
 * - `addBatch(items)`：批量追加（字符串或 `{ text, color?, key? }`）
 * - `pause()` / `resume()`：暂停 / 继续（写入/移除 paused 属性）
 * - `clear()`：清空在场与排队弹幕
 *
 * 事件（bubbles + composed）：
 * - `oas-item-click`：点击弹幕，detail `{ text, key, color }`
 *
 * 无障碍：默认舞台 `aria-hidden="true"`；`accessible` 开启后为 `role="log"` 活区。
 * `prefers-reduced-motion` 下动画时长缩短为瞬时（弹幕直接消失，不横向移动）。
 */

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  position: relative;
}
:host([hidden]) {
  display: none;
}
.stage {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-barrage-height, 200px);
  border-radius: var(--oas-radius-md);
  background: var(--oas-barrage-bg, transparent);
  color: var(--oas-barrage-color, var(--oas-color-text-primary));
}
.track {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: calc(100% / var(--oas-barrage-tracks, 3));
}
.item {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 100%;
  display: inline-flex;
  align-items: center;
  max-width: none;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: 999px;
  background: var(--oas-barrage-item-bg, color-mix(in srgb, var(--oas-color-overlay) 24%, transparent));
  color: var(--oas-barrage-item-color, var(--oas-color-text-primary));
  font-size: var(--oas-barrage-font-size, var(--oas-font-size-md));
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
  transform: translate(0, -50%);
  will-change: transform;
  animation-name: oas-barrage-move;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
.item:hover {
  background: var(--oas-barrage-item-hover-bg, color-mix(in srgb, var(--oas-color-overlay) 36%, transparent));
}
@keyframes oas-barrage-move {
  from {
    transform: translate(0, -50%);
  }
  to {
    transform: translate(calc(-100% - var(--oas-barrage-stage-width, 800px)), -50%);
  }
}
.stage.paused .item {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .item {
    animation-duration: 0.01ms !important;
  }
}
`

export interface BarrageItemOptions {
  color?: string
  key?: string
}

export interface BarrageItemInput extends BarrageItemOptions {
  text: string
}

export interface BarrageItemDetail {
  text: string
  key: string
  color: string
}

interface QueuedItem {
  text: string
  key: string
  color: string
}

interface ActiveItem extends QueuedItem {
  el: HTMLElement
  track: number
  endAt: number
  /** 暂停时保存的剩余时长（ms）；运行时为 null */
  remaining: number | null
  timer: ReturnType<typeof setTimeout> | null
}

const PRESET_NAMES = new Set([
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
])

const FALLBACK_STAGE_WIDTH = 800

/** 轨道数：正整数，非法回落默认 3 */
export function resolveBarrageTracks(raw: string): number {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return 3
  return Math.min(20, n)
}

/** 速度：正数（px/s），非法回落 120 */
export function resolveBarrageSpeed(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 120
  return n
}

/** 同轨道间距：非负，非法回落 48 */
export function resolveBarrageGap(raw: string): number {
  if (raw.trim() === '') return 48
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 48
  return n
}

/** 同屏上限：0 = 不限；非法/负数回落 0 */
export function resolveBarrageMaxActive(raw: string): number {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

/** 文本宽度估算（测量不可用时的回退：中文按 1em、其它按 0.6em） */
export function estimateBarrageWidth(text: string, fontSize = 14): number {
  let units = 0
  for (const ch of text) units += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.6
  return Math.ceil(units * fontSize) + 24
}

/** 预设名取 -text 安全档，其余按任意 CSS 色值直接注入 */
function resolveItemColor(raw: string): string {
  return PRESET_NAMES.has(raw) ? `var(--oas-preset-${raw}-text)` : raw
}

const LENGTH_RE = /^(?:\d*\.?\d+(?:px|rem|em|vh|vw|vmin|vmax|%)?|(?:calc|min|max|clamp|var)\(.+\))$/

export class OASBarrage extends OASElement {
  static override get observedAttributes(): string[] {
    return ['tracks', 'speed', 'gap', 'max-active', 'paused', 'height', 'accessible']
  }

  private stageEl: HTMLElement | null = null
  private trackEls: HTMLElement[] = []
  private builtTracks = -1
  private queue: QueuedItem[] = []
  private active: ActiveItem[] = []
  private trackNextAt: number[] = []
  private pumpTimer: ReturnType<typeof setTimeout> | null = null
  private resizeObserver: ResizeObserver | null = null
  private itemByEl = new WeakMap<HTMLElement, ActiveItem>()
  private pausedInternal = false
  private pausedAt = 0
  private lastPausedAttr = false

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="stage" part="stage"></div>
    `
  }

  private bind(): void {
    this.stageEl = this.shadow.querySelector<HTMLElement>('.stage')
    this.stageEl?.addEventListener('click', (e) => this.onStageClick(e))
    if (typeof ResizeObserver !== 'undefined' && this.stageEl) {
      this.resizeObserver = new ResizeObserver(() => this.syncStageWidth())
      this.resizeObserver.observe(this.stageEl)
    }
    this.onCleanup(() => {
      this.clearTimers()
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.armActiveTimers()
    this.pump()
  }

  // ---- 公开 API ----

  /** 追加一条弹幕；空文本忽略 */
  add(text: string, options: BarrageItemOptions = {}): void {
    if (typeof text !== 'string' || text.trim() === '') return
    this.queue.push({
      text,
      key: options.key ?? '',
      color: options.color ?? '',
    })
    this.pump()
  }

  /** 批量追加（字符串或 `{ text, color?, key? }`） */
  addBatch(items: Array<string | BarrageItemInput>): void {
    for (const item of items) {
      if (typeof item === 'string') this.add(item)
      else if (item && typeof item.text === 'string') this.add(item.text, { color: item.color, key: item.key })
    }
  }

  /** 暂停：CSS 动画与排期计时一起冻结 */
  pause(): void {
    this.setAttribute('paused', '')
  }

  /** 继续 */
  resume(): void {
    this.removeAttribute('paused')
  }

  /** 清空在场与排队弹幕，轨道重新可用 */
  clear(): void {
    this.queue.length = 0
    for (const item of this.active) {
      if (item.timer) clearTimeout(item.timer)
      item.el.remove()
    }
    this.active.length = 0
    this.trackNextAt.fill(0)
    if (this.pumpTimer) clearTimeout(this.pumpTimer)
    this.pumpTimer = null
  }

  // ---- 轨道与排期 ----

  private trackCount(): number {
    return resolveBarrageTracks(this.getAttr('tracks', ''))
  }

  private speed(): number {
    return resolveBarrageSpeed(this.getAttr('speed', ''))
  }

  private gap(): number {
    return resolveBarrageGap(this.getAttr('gap', ''))
  }

  private maxActive(): number {
    return resolveBarrageMaxActive(this.getAttr('max-active', ''))
  }

  private buildTracks(count: number): void {
    const stage = this.stageEl
    if (!stage) return
    if (this.builtTracks === count) return
    // 轨道数变化：既有弹幕的轨道归属失效，先清空再重建（文档明示）
    this.clear()
    stage.replaceChildren()
    this.trackEls = []
    for (let i = 0; i < count; i++) {
      const track = document.createElement('div')
      track.className = 'track'
      track.setAttribute('part', 'track')
      track.dataset.index = String(i)
      stage.appendChild(track)
      this.trackEls.push(track)
    }
    this.trackNextAt = new Array(count).fill(0)
    this.builtTracks = count
    stage.style.setProperty('--oas-barrage-tracks', String(count))
  }

  private stageWidth(): number {
    const width = this.stageEl?.clientWidth ?? 0
    return width > 0 ? width : FALLBACK_STAGE_WIDTH
  }

  private syncStageWidth(): void {
    this.stageEl?.style.setProperty('--oas-barrage-stage-width', `${this.stageWidth()}px`)
  }

  private pump(): void {
    if (!this.isConnected || this.pausedInternal) return
    if (this.pumpTimer) {
      clearTimeout(this.pumpTimer)
      this.pumpTimer = null
    }
    const max = this.maxActive()
    while (this.queue.length > 0) {
      if (max > 0 && this.active.length >= max) return
      const now = Date.now()
      let index = -1
      for (let i = 0; i < this.trackNextAt.length; i++) {
        if ((this.trackNextAt[i] ?? 0) <= now) {
          index = i
          break
        }
      }
      if (index < 0) {
        const next = Math.min(...this.trackNextAt)
        this.pumpTimer = setTimeout(
          () => {
            this.pumpTimer = null
            this.pump()
          },
          Math.max(0, next - now),
        )
        return
      }
      const item = this.queue.shift()
      if (!item) return
      this.mount(item, index, now)
    }
  }

  private mount(item: QueuedItem, track: number, now: number): void {
    const trackEl = this.trackEls[track]
    if (!trackEl) return
    const speed = this.speed()
    const el = document.createElement('span')
    el.className = 'item'
    el.setAttribute('part', 'item')
    el.textContent = item.text
    if (item.key) el.dataset.key = item.key
    if (item.color) el.style.setProperty('--oas-barrage-item-color', resolveItemColor(item.color))
    trackEl.appendChild(el)

    const width = el.offsetWidth > 0 ? el.offsetWidth : estimateBarrageWidth(item.text)
    const stageWidth = this.stageWidth()
    this.syncStageWidth()
    el.style.setProperty('--oas-barrage-stage-width', `${stageWidth}px`)
    const duration = ((stageWidth + width) / speed) * 1000
    el.style.animationDuration = `${duration}ms`

    const active: ActiveItem = {
      ...item,
      el,
      track,
      endAt: now + duration,
      remaining: null,
      timer: null,
    }
    this.active.push(active)
    this.itemByEl.set(el, active)
    this.trackNextAt[track] = now + ((width + this.gap()) / speed) * 1000
    this.armTimer(active, duration)
  }

  private armTimer(item: ActiveItem, ms: number): void {
    item.timer = setTimeout(() => {
      item.timer = null
      this.endItem(item)
    }, ms)
  }

  private armActiveTimers(): void {
    const now = Date.now()
    for (const item of this.active) {
      if (item.timer) continue
      if (this.pausedInternal) continue
      const remaining = item.remaining ?? Math.max(0, item.endAt - now)
      this.armTimer(item, remaining)
    }
  }

  private endItem(item: ActiveItem): void {
    const index = this.active.indexOf(item)
    if (index >= 0) this.active.splice(index, 1)
    this.itemByEl.delete(item.el)
    item.el.remove()
    this.pump()
  }

  private clearTimers(): void {
    if (this.pumpTimer) clearTimeout(this.pumpTimer)
    this.pumpTimer = null
    for (const item of this.active) {
      if (item.timer) clearTimeout(item.timer)
      item.timer = null
    }
  }

  private pauseInternal(): void {
    if (this.pausedInternal) return
    this.pausedInternal = true
    this.pausedAt = Date.now()
    if (this.pumpTimer) {
      clearTimeout(this.pumpTimer)
      this.pumpTimer = null
    }
    for (const item of this.active) {
      if (item.timer) clearTimeout(item.timer)
      item.timer = null
      item.remaining = Math.max(0, item.endAt - this.pausedAt)
    }
    this.stageEl?.classList.add('paused')
  }

  private resumeInternal(): void {
    if (!this.pausedInternal) return
    this.pausedInternal = false
    const now = Date.now()
    const delta = now - this.pausedAt
    for (let i = 0; i < this.trackNextAt.length; i++) this.trackNextAt[i] = (this.trackNextAt[i] ?? 0) + delta
    for (const item of this.active) {
      const remaining = item.remaining ?? 0
      item.remaining = null
      item.endAt = now + remaining
      this.armTimer(item, remaining)
    }
    this.stageEl?.classList.remove('paused')
    this.pump()
  }

  private onStageClick(e: Event): void {
    const target = (e.target as HTMLElement | null)?.closest?.('.item') as HTMLElement | null
    if (!target) return
    const item = this.itemByEl.get(target)
    if (!item) return
    this.emit('item-click', { text: item.text, key: item.key, color: item.color })
  }

  protected override update(): void {
    this.buildTracks(this.trackCount())
    this.syncStageWidth()

    const heightRaw = this.getAttr('height', '').trim()
    if (heightRaw === '') {
      this.style.removeProperty('--oas-barrage-height')
    } else if (/^\d*\.?\d+$/.test(heightRaw)) {
      this.style.setProperty('--oas-barrage-height', `${heightRaw}px`)
    } else if (LENGTH_RE.test(heightRaw)) {
      this.style.setProperty('--oas-barrage-height', heightRaw)
    } else {
      this.style.removeProperty('--oas-barrage-height')
    }

    const stage = this.stageEl
    if (stage) {
      const accessible = this.hasAttribute('accessible')
      if (accessible) {
        stage.removeAttribute('aria-hidden')
        stage.setAttribute('role', 'log')
        stage.setAttribute('aria-live', 'polite')
      } else {
        stage.setAttribute('aria-hidden', 'true')
        stage.removeAttribute('role')
        stage.removeAttribute('aria-live')
      }
    }

    const paused = this.hasAttribute('paused')
    if (paused !== this.lastPausedAttr) {
      this.lastPausedAttr = paused
      if (paused) this.pauseInternal()
      else this.resumeInternal()
    }

    // 新排队项可能因上限/参数变化获得放行机会
    if (!this.pausedInternal && this.queue.length > 0) this.pump()
  }
}
