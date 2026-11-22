import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { isRtl } from '../../shared/direction.js'

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
 * 无障碍：默认舞台 `aria-hidden="true"`（装饰性弹幕，弹幕项不可聚焦）；`accessible` 开启后为
 * `role="log"` 活区，每条弹幕为 `role="button"` + `tabindex="0"`，Enter / Space 等价点击派发
 * `oas-item-click`。
 * `prefers-reduced-motion` 下动画时长缩短为瞬时（弹幕直接消失，不横向移动），JS 离场计时与
 * 轨道排期同步按同一口径收短，不占用同屏容量。
 *
 * RTL：书写方向为 RTL 时切换 `data-rtl`，动画改用镜像关键帧 `oas-barrage-move-rtl`
 * （自左进场、向右飞出）——`inset-inline-start: 100%` 在 RTL 下贴左缘，原负向平移会让
 * 弹幕整条飞在舞台左侧外不可见。
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
/* RTL 镜像：inset-inline-start: 100% 在 RTL 下映射为 right:100%（贴左缘外侧），
   原始关键帧的负向 x 平移会让弹幕「从左侧进场再往左飞」——整条不可见。
   镜像关键帧改为右向平移（自左进场、向右飞出），与 LTR 的进场/退场对称。 */
:host([data-rtl]) .item {
  animation-name: oas-barrage-move-rtl;
}
@keyframes oas-barrage-move-rtl {
  from {
    transform: translate(0, -50%);
  }
  to {
    transform: translate(calc(100% + var(--oas-barrage-stage-width, 800px)), -50%);
  }
}
.stage.paused .item {
  animation-play-state: paused;
}
/* reduced-motion：动画瞬时收束（弹幕直接消失，不横向漂移）。
   JS 侧离场/排期计时同步按同一口径收短（见 REDUCED_MOTION_MS），否则在场条目
   会以秒级时长占据同屏容量（max-active）与轨道排期。 */
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

/** reduced-motion 下的离场时长（ms）：与 CSS `animation-duration: 0.01ms !important` 同口径 */
const REDUCED_MOTION_MS = 20

/** 非法数值属性告警去重（同一属性+原值只报一次，避免排期每次重算刷屏） */
const warnedNumerics = new Set<string>()

function warnNumeric(attr: string, raw: string, fallback: string): void {
  const key = `${attr}=${raw}`
  if (warnedNumerics.has(key)) return
  warnedNumerics.add(key)
  devWarn(`[oas-barrage] ${attr}="${raw}" 非法，已回落 ${fallback}`)
}

/** 轨道数：正整数，非法回落默认 3 */
export function resolveBarrageTracks(raw: string): number {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) {
    if (raw.trim() !== '') warnNumeric('tracks', raw, '3（正整数）')
    return 3
  }
  return Math.min(20, n)
}

/** 速度：正数（px/s），非法回落 120 */
export function resolveBarrageSpeed(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    if (raw.trim() !== '') warnNumeric('speed', raw, '120（正数 px/s）')
    return 120
  }
  return n
}

/** 同轨道间距：非负，非法回落 48 */
export function resolveBarrageGap(raw: string): number {
  if (raw.trim() === '') return 48
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    warnNumeric('gap', raw, '48（非负 px）')
    return 48
  }
  return n
}

/** 同屏上限：0 = 不限；非法/负数回落 0 */
export function resolveBarrageMaxActive(raw: string): number {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) {
    if (raw.trim() !== '') warnNumeric('max-active', raw, '0（0 = 不限）')
    return 0
  }
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
    this.stageEl?.addEventListener('keydown', (e) => this.onStageKeydown(e as KeyboardEvent))
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

  private resolveSpeed(): number {
    return resolveBarrageSpeed(this.getAttr('speed', ''))
  }

  private resolveGap(): number {
    return resolveBarrageGap(this.getAttr('gap', ''))
  }

  private resolveMaxActive(): number {
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

  /** 在场条目是否进入读屏（accessible 开启）：决定弹幕项可否 Tab 聚焦 */
  private isAccessible(): boolean {
    return this.hasAttribute('accessible')
  }

  /** reduced-motion：动画被 CSS 压成瞬时，JS 离场/排期计时必须同口径收短，否则容量被空中条目占住 */
  private prefersReducedMotion(): boolean {
    try {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    } catch {
      return false
    }
  }

  private pump(): void {
    if (!this.isConnected || this.pausedInternal) return
    if (this.pumpTimer) {
      clearTimeout(this.pumpTimer)
      this.pumpTimer = null
    }
    const max = this.resolveMaxActive()
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
    const speed = this.resolveSpeed()
    const el = document.createElement('span')
    el.className = 'item'
    el.setAttribute('part', 'item')
    el.textContent = item.text
    if (item.key) el.dataset.key = item.key
    if (item.color) el.style.setProperty('--oas-barrage-item-color', resolveItemColor(item.color))
    this.applyItemA11y(el)
    trackEl.appendChild(el)

    const width = el.offsetWidth > 0 ? el.offsetWidth : estimateBarrageWidth(item.text)
    const stageWidth = this.stageWidth()
    this.syncStageWidth()
    el.style.setProperty('--oas-barrage-stage-width', `${stageWidth}px`)
    const reduced = this.prefersReducedMotion()
    const duration = reduced ? REDUCED_MOTION_MS : ((stageWidth + width) / speed) * 1000
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
    // 排期同理：reduced-motion 下条目瞬时消失，轨道无需按物理间距等待
    this.trackNextAt[track] = now + (reduced ? REDUCED_MOTION_MS : ((width + this.resolveGap()) / speed) * 1000)
    this.armTimer(active, duration)
  }

  /**
   * 弹幕项的可交互无障碍形态：
   * - `accessible` 开启（舞台为 role="log" 活区）→ 项为 `role="button"` + tabindex=0，
   *   Enter / Space 等价点击派发 `oas-item-click`（键盘可达）；
   * - 缺省（装饰性弹幕，舞台 aria-hidden）→ 不加 tabindex：aria-hidden 容器内不得含
   *   可聚焦元素（axe `aria-hidden-focus`），装饰态不提供键盘焦点。
   */
  private applyItemA11y(el: HTMLElement): void {
    if (this.isAccessible()) {
      el.setAttribute('role', 'button')
      el.tabIndex = 0
    } else {
      el.removeAttribute('tabindex')
      el.removeAttribute('role')
    }
  }

  /** accessible 切换后同步既有在场项的可聚焦形态 */
  private syncItemsA11y(): void {
    for (const item of this.active) this.applyItemA11y(item.el)
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
    this.emitItemClick(target)
  }

  /** Enter / Space 等价点击（accessible 下弹幕项可聚焦，键盘必须能触发同一条事件） */
  private onStageKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const target = (e.target as HTMLElement | null)?.closest?.('.item') as HTMLElement | null
    if (!target) return
    e.preventDefault()
    this.emitItemClick(target)
  }

  private emitItemClick(el: HTMLElement): void {
    const item = this.itemByEl.get(el)
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
      warnNumeric('height', heightRaw, '200px（纯数字按 px 或 CSS 长度）')
      this.style.removeProperty('--oas-barrage-height')
    }

    const stage = this.stageEl
    if (stage) {
      const accessible = this.isAccessible()
      if (accessible) {
        stage.removeAttribute('aria-hidden')
        stage.setAttribute('role', 'log')
        stage.setAttribute('aria-live', 'polite')
      } else {
        stage.setAttribute('aria-hidden', 'true')
        stage.removeAttribute('role')
        stage.removeAttribute('aria-live')
      }
      this.syncItemsA11y()
    }

    // RTL 镜像钩子：仅 toggle 属性，:host([data-rtl]) 就地切换镜像关键帧
    //（书写方向变化来自 dir 祖先 / config-provider / locale，均会重新进入 update）
    this.toggleAttribute('data-rtl', isRtl(this))

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
