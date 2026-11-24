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
 * - `items`：声明式弹幕数据（JSON 数组，字符串或 `{ text, color?, key? }`）——语义对齐
 *   `addBatch`：属性变化时把数组条目批量入队（追加，不清空在场）；另有同名 get/set
 *   访问器（赋数组自动 JSON 序列化反射 attribute），框架双向绑定不用手写 stringify
 * - `auto-play`：布尔，循环播放——**本轮声明条目全部播完**（队列空且无在场循环条目）后把
 *   `items` 重新入队（只循环声明的数据；`add()` 手动加的条目不参与循环也不阻塞轮次；
 *   `clear()` 只清在场与排队，声明数据仍在，想要永久停止请移除 `items` 或 `auto-play`）
 * - `banned-words`：屏蔽词（逗号分隔，或 JSON 数组字符串；大小写不敏感）。命中的条目
 *   **不入队不渲染**（`add` / `addBatch` / `items` / auto-play 重灌同一入队判据）；已在场的条目不回溯移除
 * - `likeable`：每条弹幕带点赞控件（心形按钮，点按切换点赞态）——点赞状态按 `key`（缺省按文本）
 *   记忆，消失后重新出现仍保留；派发 `oas-like`。未开该属性时渲染与现状一致（零视觉漂移）
 *
 * 方法：
 * - `add(text, options?)`：追加一条（options: `{ color?, key? }`）
 * - `addBatch(items)`：批量追加（字符串或 `{ text, color?, key? }`）
 * - `pause()` / `resume()`：暂停 / 继续（写入/移除 paused 属性）
 * - `clear()`：清空在场与排队弹幕
 * - `isLiked(key)` / `likeCount(key)`：查询点赞态与点赞数（`likeable` 场景宿主回显）
 *
 * 事件（bubbles + composed）：
 * - `oas-item-click`：点击弹幕，detail `{ text, key, color }`
 * - `oas-like`：点按点赞控件，detail `{ text, key, color, liked, count }`（liked = 切换后的状态）
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
.text {
  display: inline;
}
/* 点赞控件：与文本同基线的小按钮；未赞描边心形，点赞后实心主色（形状差异即状态差异） */
.like {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin-inline-start: var(--oas-space-1);
  padding: 0;
  width: 1.35em;
  height: 1.35em;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  flex: none;
}
.like svg {
  width: 100%;
  height: 100%;
  display: block;
}
.like svg path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.like[data-liked='true'] svg path {
  fill: currentColor;
  stroke: currentColor;
}
.like:hover {
  color: var(--oas-color-primary);
}
.like[data-liked='true'] {
  color: var(--oas-color-primary);
}
.like:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
  /** 来自 `items` 声明数据（auto-play 的循环轮次归属；`add()` 手动条目不带） */
  loop?: boolean
}

interface ActiveItem extends QueuedItem {
  el: HTMLElement
  track: number
  endAt: number
  /** 完整动画时长（ms）：重连时按剩余时间反推应处的动画进度 */
  duration: number
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
    return [
      'tracks',
      'speed',
      'gap',
      'max-active',
      'paused',
      'height',
      'accessible',
      'items',
      'auto-play',
      'likeable',
      'banned-words',
    ]
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
  /** items 上次应用的属性原文（变化才重新入队，避免重复 update 重复添加） */
  private lastItemsRaw = ''
  /** 声明式条目（auto-play 循环的数据源） */
  private declaredItems: BarrageItemInput[] = []
  /** 点赞态与计数（键 = key ‖ text）；跨条目生命周期保留 */
  private likes = new Map<string, { liked: boolean; count: number }>()
  /** 屏蔽词解析缓存（按 banned-words 原文） */
  private bannedCache: { raw: string; words: string[] } = { raw: '', words: [] }

  // -------------------------------------------------------------------------
  // property 通道（items：框架把静态属性写成 property 时的数据入口）
  // -------------------------------------------------------------------------

  /** 声明式弹幕数据（读=解析结果；写=接受（字符串 | 条目）数组或 JSON 字符串，反射 `items` attribute） */
  get items(): Array<string | BarrageItemInput> {
    return this.declaredItems
  }
  set items(value: Array<string | BarrageItemInput> | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="stage" part="stage"></div>
    `
  }

  private bind(): void {
    this.stageEl = this.shadow.querySelector<HTMLElement>('.stage')
    this.stageEl?.addEventListener('click', this.onStageClick)
    this.stageEl?.addEventListener('keydown', this.onStageKeydown)
    this.observeStage()
    this.onCleanup(() => this.teardown())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /**
   * 断开重连：disconnectedCallback 已摘掉计时器 / 观察器 / 清理钩子，重连必须重新挂上
   * （否则二次断开开始泄漏），并按 epoch 重算在场弹幕的动画进度与离场计时。
   */
  protected override onReconnect(): void {
    this.observeStage()
    this.onCleanup(() => this.teardown())
    this.resyncActive()
    this.armActiveTimers()
    this.pump()
  }

  /** 观察舞台尺寸（幂等：复用已建实例，从不重复观察） */
  private observeStage(): void {
    if (!this.stageEl || typeof ResizeObserver === 'undefined') return
    if (!this.resizeObserver) this.resizeObserver = new ResizeObserver(() => this.syncStageWidth())
    this.resizeObserver.observe(this.stageEl)
  }

  /** 断开连接的统一清理（重连后由 onReconnect 重新注册，二次断开同样生效） */
  private teardown(): void {
    this.clearTimers()
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  // ---- 公开 API ----

  /** 追加一条弹幕；空文本与被屏蔽词命中的文本忽略 */
  add(text: string, options: BarrageItemOptions = {}): void {
    if (!this.enqueue({ text, key: options.key ?? '', color: options.color ?? '' })) return
    this.pump()
  }

  /**
   * 入队唯一收口：空文本与屏蔽词判据（`add` / `addBatch` / `items` / auto-play 重灌共用）。
   * 返回是否真的入队。
   */
  private enqueue(item: QueuedItem): boolean {
    if (typeof item.text !== 'string' || item.text.trim() === '') return false
    if (this.isBanned(item.text)) return false
    this.queue.push(item)
    return true
  }

  /** 查询点赞态（键 = key，缺省按文本；与 oas-like 的 detail 口径一致） */
  isLiked(key: string): boolean {
    return this.likes.get(key)?.liked === true
  }

  /** 查询点赞数 */
  likeCount(key: string): number {
    return this.likes.get(key)?.count ?? 0
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
    this.refillDeclared()
  }

  /**
   * auto-play 重灌。两个守卫都是必须的：
   * - **屏蔽词**：重灌与 `add` / `addBatch` / `items` 走同一 `enqueue` 判据，否则循环会把已过滤掉的内容重新灌回来；
   * - **时机**：只在本轮声明条目**全部播完**（队列空 + 无在场循环条目）时重灌。首轮排空的瞬间就补，
   *   会让同一条弹幕双份在场、独占双倍轨道。
   */
  private refillDeclared(): void {
    if (this.pausedInternal) return
    if (!this.hasAttribute('auto-play') || this.declaredItems.length === 0) return
    if (this.queue.length > 0) return
    if (this.active.some((item) => item.loop)) return
    for (const declared of this.declaredItems) {
      this.enqueue({ text: declared.text, key: declared.key ?? '', color: declared.color ?? '', loop: true })
    }
    if (this.queue.length > 0) this.pump()
  }

  private mount(item: QueuedItem, track: number, now: number): void {
    const trackEl = this.trackEls[track]
    if (!trackEl) return
    const speed = this.resolveSpeed()
    const el = document.createElement('span')
    el.className = 'item'
    el.setAttribute('part', 'item')
    const text = document.createElement('span')
    text.className = 'text'
    text.textContent = item.text
    el.appendChild(text)
    if (this.hasAttribute('likeable')) el.appendChild(this.renderLike(item))
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
      duration,
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
   * - `accessible` 开启（舞台为 role="log" 活区）且未开 `likeable` → 项为 `role="button"` + tabindex=0，
   *   Enter / Space 等价点击派发 `oas-item-click`（键盘可达）；
   * - `accessible` + `likeable` → 项本身不再承载 button 语义（避免嵌套交互控件触发 axe
   *   nested-interactive），改由点赞控件承担键盘交互；
   * - 缺省（装饰性弹幕，舞台 aria-hidden）→ 不加 tabindex：aria-hidden 容器内不得含
   *   可聚焦元素（axe `aria-hidden-focus`），装饰态不提供键盘焦点。
   */
  private applyItemA11y(el: HTMLElement): void {
    if (this.isAccessible() && !this.hasAttribute('likeable')) {
      el.setAttribute('role', 'button')
      el.tabIndex = 0
    } else {
      el.removeAttribute('tabindex')
      el.removeAttribute('role')
    }
  }

  /** accessible 切换后同步既有在场项的可聚焦形态 */
  private syncItemsA11y(): void {
    for (const item of this.active) {
      this.applyItemA11y(item.el)
      const like = item.el.querySelector<HTMLElement>('[part="like"]')
      if (like) this.syncLikeA11y(like, item)
    }
  }

  // ---------- 点赞 / 屏蔽词 ----------

  /** 点赞身份：显式 key 优先，缺省按文本（与 oas-like detail 的 key 口径一致） */
  private likeIdentity(item: { text: string; key: string }): string {
    return item.key !== '' ? item.key : item.text
  }

  /** 点赞控件：语义与可聚焦性按 accessible 切换；装饰态鼠标可点但读屏不可达。
   * 心形路径为本库自绘（16 视口），未赞描边 / 已赞实心由 CSS 按 `data-liked` 切换 */
  private renderLike(item: QueuedItem): HTMLElement {
    const like = document.createElement('span')
    like.className = 'like'
    like.setAttribute('part', 'like')
    like.innerHTML =
      '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<path d="M8 13.4 C6.1 11.8 2.9 9.3 2.9 6.6 C2.9 4.9 4.2 3.7 5.8 3.7 C6.7 3.7 7.5 4.1 8 4.8 C8.5 4.1 9.3 3.7 10.2 3.7 C11.8 3.7 13.1 4.9 13.1 6.6 C13.1 9.3 9.9 11.8 8 13.4 Z" />' +
      '</svg>'
    this.syncLikeA11y(like, item)
    return like
  }

  /** 同步点赞控件的状态与语义（accessible 下为键盘可达的 button 角色） */
  private syncLikeA11y(like: HTMLElement, item: { text: string; key: string }): void {
    const state = this.likes.get(this.likeIdentity(item)) ?? { liked: false, count: 0 }
    if (state.liked) like.setAttribute('data-liked', 'true')
    else like.removeAttribute('data-liked')
    if (this.isAccessible()) {
      like.removeAttribute('aria-hidden')
      like.setAttribute('role', 'button')
      like.setAttribute('tabindex', '0')
      like.setAttribute('aria-pressed', String(state.liked))
      like.setAttribute('aria-label', this.t(state.liked ? 'barrage.unlike' : 'barrage.like'))
    } else {
      like.setAttribute('aria-hidden', 'true')
      like.removeAttribute('role')
      like.removeAttribute('tabindex')
      like.removeAttribute('aria-pressed')
      like.removeAttribute('aria-label')
    }
  }

  /** 运行时切换 likeable：既有在场条目补 / 撤点赞控件，状态按记忆回填 */
  private syncLikeControls(): void {
    const likeable = this.hasAttribute('likeable')
    for (const item of this.active) {
      const existing = item.el.querySelector<HTMLElement>('[part="like"]')
      if (likeable && !existing) item.el.appendChild(this.renderLike(item))
      else if (!likeable && existing) existing.remove()
      else if (existing) this.syncLikeA11y(existing, item)
    }
  }

  /** 切换点赞态并派发 oas-like（detail: { text, key, color, liked, count }） */
  private toggleLike(active: ActiveItem): void {
    const id = this.likeIdentity(active)
    const prev = this.likes.get(id) ?? { liked: false, count: 0 }
    const next = { liked: !prev.liked, count: Math.max(0, prev.count + (prev.liked ? -1 : 1)) }
    this.likes.set(id, next)
    const like = active.el.querySelector<HTMLElement>('[part="like"]')
    if (like) this.syncLikeA11y(like, active)
    this.emit('like', { text: active.text, key: active.key, color: active.color, liked: next.liked, count: next.count })
  }

  /** 屏蔽词解析（逗号分隔或 JSON 数组；按属性原文缓存）
   * （名字刻意避开 `bannedWords`：框架按「key in el」把 attribute 写成 property 时会遮蔽同名方法） */
  private parseBannedWords(): string[] {
    const raw = this.getAttr('banned-words', '')
    if (raw === this.bannedCache.raw) return this.bannedCache.words
    let words: string[] = []
    const trimmed = raw.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          words = parsed.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim())
        } else {
          warnNumeric('banned-words', raw, '逗号分隔字符串或 JSON 数组')
        }
      } catch {
        warnNumeric('banned-words', raw, '逗号分隔字符串或 JSON 数组')
      }
    } else if (trimmed !== '') {
      words = trimmed.split(/[,，]/).map((entry) => entry.trim())
    }
    words = words.filter((entry) => entry !== '')
    this.bannedCache = { raw, words }
    return words
  }

  /** 文本是否命中屏蔽词（大小写不敏感；命中即不入队不渲染） */
  private isBanned(text: string): boolean {
    const words = this.parseBannedWords()
    if (words.length === 0) return false
    const lowered = text.toLowerCase()
    return words.some((word) => lowered.includes(word.toLowerCase()))
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

  /**
   * 断开重连的计时对齐（epoch 重算）：CSS 动画在宿主脱离文档再挂回后会从头播放，
   * 而 JS 离场计时按绝对时间（`endAt`）继续——只重挂不定进度，弹幕会从起点重跑却在
   * 原定时刻被移除。重连时按每条的实际剩余时间（暂停中取暂停快照）把动画定到对应进度，
   * 剩余 ≤ 0 的立即退场；其余在场条目一律保留（不整体清空）。
   * 轨道排期用绝对 epoch，过期轨道自然放行排队项，无需重排。
   */
  private resyncActive(): void {
    const now = Date.now()
    for (const item of [...this.active]) {
      const remaining = item.remaining ?? Math.max(0, item.endAt - now)
      if (remaining <= 0) {
        this.endItem(item)
        continue
      }
      const duration = item.duration > 0 ? item.duration : remaining
      this.restartAnimationAt(item.el, Math.max(0, duration - remaining))
    }
  }

  /**
   * 重启 CSS 动画并定位到指定进度（负向 animation-delay）。
   * 先置 `animation-name: none` 并强制重排，让浏览器丢弃上一轮动画状态，
   * 再恢复样式表关键帧（内联名移除）并按已流逝时长负延迟起播。
   */
  private restartAnimationAt(el: HTMLElement, offset: number): void {
    el.style.animationName = 'none'
    void el.offsetWidth
    el.style.removeProperty('animation-name')
    el.style.animationDelay = offset > 0 ? `-${offset}ms` : ''
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

  private onStageClick = (e: Event): void => {
    const like = (e.target as HTMLElement | null)?.closest?.('[part="like"]') as HTMLElement | null
    if (like) {
      const item = this.itemByEl.get(like.closest('.item') as HTMLElement)
      if (item) this.toggleLike(item)
      return
    }
    const target = (e.target as HTMLElement | null)?.closest?.('.item') as HTMLElement | null
    if (!target) return
    this.emitItemClick(target)
  }

  /** Enter / Space 等价点击（accessible 下弹幕项 / 点赞控件可聚焦，键盘必须能触发同一条事件） */
  private onStageKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const like = (e.target as HTMLElement | null)?.closest?.('[part="like"]') as HTMLElement | null
    if (like) {
      e.preventDefault()
      const item = this.itemByEl.get(like.closest('.item') as HTMLElement)
      if (item) this.toggleLike(item)
      return
    }
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
      this.syncLikeControls()
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
    this.syncDeclaredItems()
    if (
      !this.pausedInternal &&
      (this.queue.length > 0 || (this.hasAttribute('auto-play') && this.declaredItems.length > 0))
    ) {
      this.pump()
    }
  }

  /** items 属性解析 + 增量入队（对齐 addBatch：只追加新条目，不清空在场、不重复入队旧条目） */
  private syncDeclaredItems(): void {
    const raw = this.getAttr('items', '')
    if (raw === this.lastItemsRaw) return
    this.lastItemsRaw = raw
    if (raw.trim() === '') {
      this.declaredItems = []
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      devWarn(
        '[oas-barrage] items 不是合法 JSON 数组，已忽略；示例：["弹幕文本"] 或 [{"text":"弹幕","color":"blue","key":"k1"}]',
      )
      this.declaredItems = []
      return
    }
    if (!Array.isArray(parsed)) {
      devWarn('[oas-barrage] items 必须是数组，已忽略')
      this.declaredItems = []
      return
    }
    const normalized = parsed
      .map((item) => (typeof item === 'string' ? { text: item } : item))
      .filter((item): item is BarrageItemInput => !!item && typeof (item as BarrageItemInput).text === 'string')
    const identity = (item: BarrageItemInput): string => JSON.stringify([item.text, item.color ?? '', item.key ?? ''])
    const previous = new Set(this.declaredItems.map(identity))
    const fresh = normalized.filter((item) => !previous.has(identity(item)))
    this.declaredItems = normalized
    // 声明条目带 loop 标记：auto-play 的重灌时机按「本轮声明条目是否全部离场」判定，
    // 手动 add() 的条目不计入轮次（不阻塞循环）。
    for (const item of fresh) {
      this.enqueue({ text: item.text, key: item.key ?? '', color: item.color ?? '', loop: true })
    }
  }
}
