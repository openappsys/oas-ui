import type { ReactiveController } from '@oas-ui/core'
import {
  parseColor,
  formatColor,
  formatSwatch,
  rgbToHsv,
  hsvToRgb,
  xyToSv,
  hueFromY,
  parseGradient,
  formatGradient,
  gradientAt,
  insertStop,
  removeStopAt,
  moveStop,
  type RGBA,
  type GradientStop,
  type FormatOptions,
} from './color.js'
import type { ColorPickerDesignerCapability } from './oas-color-picker.js'

/**
 * color-picker designer 能力（2D 色域 + hue 竖条 + gradient 多 stop 编辑器）。
 *
 * 把「2D 饱和度-亮度色域面板 / hue 竖条 / 渐变（mode=gradient）多 stop 增删拖拽 /
 * linear-gradient 值输出」的 machinery 从 OASColorPicker 外置为 ReactiveController，
 * 经能力注册表（oas-color-picker-capability.js）注入宿主；宿主 import
 * `@oas-ui/ui/form/color-picker/designer` 即注册，未 import 时这些能力不产生任何代码路径。
 *
 * 与 table edit 能力同构：controller 只经 ColorPickerDesignerHost 面访问宿主（读属性、
 * 提交颜色、刷新控件、翻译），不感知宿主内部实现。宿主在渲染/更新管线的分支点调用
 * 本 controller 实现的 ColorPickerDesignerCapability 方法完成委托。
 *
 * 边界：core 共用（swatch 预设 / hex/RGB 输入 / alpha / 定位引擎）留在 OASColorPicker；
 * color.ts 颜色数学库共享不抽。hostConnected 绑定的 DOM（.sv2d/.hue/.grad）由宿主模板
 * 在注册该能力时按需输出；快照/水合场景下节点缺失则静默跳过（能力降级，不抛错）。
 */

/** 宿主能力面（OASColorPicker 公开实现；controller 仅经此访问宿主） */
export interface ColorPickerDesignerHost {
  /** 宿主是否锁定（disabled/readonly + config-provider 注入）——交互入口守卫 */
  isLocked(): boolean
  /** 当前单色编辑色（single 模式权威值；designer 非渐变时的 sv/hue 编辑基准） */
  colorValue(): RGBA
  /** 记录宿主当前编辑色（渐变编辑后同步单色快照，保持模式切换的一致展示） */
  setColorValue(color: RGBA): void
  /** 统一提交入口（单色直接提交 / 渐变改写活动 stop 后序列化）——宿主内路由 */
  commitColor(rgba: RGBA): void
  /** 重绘宿主核心控件（RGB/hex/clear 等）——designer 内部状态变化后请宿主刷新 */
  refreshControls(): void
  /** 宿主翻译（designer 动态 aria/文案用） */
  translateText(key: string, params?: Record<string, string | number>): string
}

/** 渐变 stop 最小/最大数量（编辑器内受控，保证至少双 stop 语义完整） */
const MIN_GRAD_STOPS = 2
const MAX_GRAD_STOPS = 8

/** 2D 色域 / hue 竖条方向键微调步长（s/v/hue） */
const KEY_STEP = 0.01
const HUE_KEY_STEP = 1

/** 内部缺省色：value 为空/非法时面板通道的起始值（与宿主单色缺省一致） */
const DEFAULT_COLOR: RGBA = { r: 0, g: 102, b: 255, a: 1 }

/** hue 竖条背景：顶部 360°（红）→ 底部 0°（红）的彩虹；stop 百分比与 thumb 位置一致
    （hue h 的视觉位置 y = (360 - h)/360，故 stop 颜色按 y 升序排列） */
function hueGradientCss(): string {
  const stops = [
    [360, '#ff0000'],
    [300, '#ff00ff'],
    [240, '#0000ff'],
    [180, '#00ffff'],
    [120, '#00ff00'],
    [60, '#ffff00'],
    [0, '#ff0000'],
  ] as const
  const parts = stops.map(([h, c]) => `${c} ${Math.round(((360 - h) / 360) * 1000) / 10}%`)
  return `linear-gradient(to bottom, ${parts.join(', ')})`
}

export class ColorPickerDesignerController
  implements ReactiveController, ColorPickerDesignerCapability
{
  private hostEl: HTMLElement & ColorPickerDesignerHost

  /** 渐变模式 stops（mode=gradient 时生效；single 模式保持单色语义） */
  private gradStops: GradientStop[] = []
  /** 渐变当前选中 stop 下标 */
  private activeStop = 0
  /** 渐变 stop DOM 是否已按当前数量建立（数量变化才重建，避免每次更新打断焦点） */
  private gradStopsSig = -1
  /** 2D/hue/stop 拖拽临时态 */
  private dragging: 'sv' | 'hue' | 'grad' | null = null
  private dragIndex = -1
  private rafId: number | null = null
  /** 拖拽 rAF 累积的最新落点动作（pointermove 只更新此闭包，rAF/up 时统一消费） */
  private dragApply: (() => void) | null = null

  /** 已绑定事件的设计器 DOM（hostDisconnected 解绑用；快照/水合缺节点时保持 null） */
  private bound: HTMLElement[] = []

  constructor(host: HTMLElement & ColorPickerDesignerHost) {
    this.hostEl = host
  }

  // ---------- 生命周期：连接时绑定设计器 DOM 交互，断开时解绑 ----------

  hostConnected(): void {
    this.bind()
  }

  hostDisconnected(): void {
    this.unbind()
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.dragApply = null
    this.dragging = null
    this.dragIndex = -1
    document.removeEventListener('pointermove', this.onDragMove)
    document.removeEventListener('pointerup', this.endDrag)
  }

  private root(): ShadowRoot | null {
    return this.hostEl.shadowRoot
  }

  private gradientMode(): boolean {
    return this.hostEl.getAttribute('mode') === 'gradient'
  }

  private alphaEnabled(): boolean {
    return this.hostEl.hasAttribute('show-alpha')
  }

  private isLocked(): boolean {
    return this.hostEl.isLocked()
  }

  private outputOpts(): FormatOptions {
    return {
      format: this.hostEl.getAttribute('color-format') === 'rgb' ? 'rgb' : 'hex',
      uppercase: this.hostEl.hasAttribute('uppercase'),
      alpha: this.alphaEnabled(),
    }
  }

  /** 归一 alpha：show-alpha 关闭时强制 1（与宿主单色通道一致） */
  private normalizeAlpha(rgba: RGBA): RGBA {
    return this.alphaEnabled() ? rgba : { ...rgba, a: 1 }
  }

  /** 当前编辑色：渐变模式取活动 stop，单色模式取宿主单色 */
  private currentEditColor(): RGBA {
    if (this.gradientMode()) {
      const s = this.gradStops[this.activeStop]
      if (s) return s.color
    }
    return this.hostEl.colorValue()
  }

  // ==================== 宿主委托入口（ColorPickerDesignerCapability） ====================

  /** 渐变值同步：value（linear-gradient/纯色/空）→ stops；非渐变 no-op */
  syncValue(): void {
    if (!this.gradientMode()) return
    const raw = this.hostEl.getAttribute('value') ?? ''
    if (!raw.trim()) {
      if (this.gradStops.length === 0) this.seedGradient()
      return
    }
    const parsed = parseGradient(raw)
    if (parsed && parsed.length >= 2) {
      this.gradStops = parsed.map((s) => ({ pos: s.pos, color: this.normalizeAlpha(s.color) }))
      this.activeStop = Math.min(this.activeStop, this.gradStops.length - 1)
      return
    }
    const solid = parseColor(raw)
    if (solid) {
      const c = this.normalizeAlpha(solid)
      this.gradStops = [
        { pos: 0, color: { ...c } },
        { pos: 1, color: { ...c } },
      ]
      this.activeStop = 0
      return
    }
    if (this.gradStops.length === 0) this.seedGradient()
  }

  /** 当前编辑色（宿主通道/hex 输入读取）：渐变模式 = 活动 stop 色；否则 null（宿主单色兜底） */
  editingColor(): RGBA | null {
    if (!this.gradientMode()) return null
    const s = this.gradStops[this.activeStop]
    return s ? { ...s.color } : null
  }

  /** 编辑提交路由：渐变模式改写活动 stop 色并序列化 value；非渐变返回 false（宿主走单色） */
  applyColor(color: RGBA): boolean {
    if (!this.gradientMode()) return false
    if (this.gradStops.length === 0) this.seedGradient()
    const stops = this.gradStops.map((s, i) => ({
      pos: s.pos,
      color: i === this.activeStop ? { ...color } : { ...s.color },
    }))
    this.gradStops = stops
    this.hostEl.setColorValue(color)
    this.commitGradient()
    return true
  }

  /** 渐变编辑区同步（显隐 + stops 手柄/背景 + 移除可用态） */
  syncGradientControls(): void {
    const root = this.root()
    if (!root) return
    const grad = root.querySelector<HTMLElement>('.grad')
    if (!grad) return
    if (!this.gradientMode()) {
      grad.toggleAttribute('hidden', true)
      // 退出渐变模式后，stop 数量签名失效：再进入时强制重建 DOM
      this.gradStopsSig = -1
      return
    }
    grad.toggleAttribute('hidden', false)
    if (this.gradStops.length < 2) this.seedGradient()
    const n = this.gradStops.length
    if (this.activeStop >= n) this.activeStop = n - 1
    const box = root.querySelector<HTMLElement>('.grad-stops')
    if (!box) return
    // 数量变化 → 重建手柄（避免每次 value 同步重建打断拖拽/焦点）
    if (this.gradStopsSig !== n) {
      this.gradStopsSig = n
      box.innerHTML = ''
      for (let i = 0; i < n; i++) {
        const stop = this.gradStops[i]
        if (!stop) continue
        const h = document.createElement('div')
        h.className = 'grad-stop'
        h.setAttribute('role', 'slider')
        h.setAttribute('tabindex', '0')
        h.setAttribute('aria-orientation', 'horizontal')
        h.setAttribute('aria-valuemin', '0')
        h.setAttribute('aria-valuemax', '100')
        // 色标无专属文案 key（i18n 表由主 agent 收口），可访问名用「位置 % + 颜色值」数据自述
        h.setAttribute('aria-label', `${formatColor(stop.color, { alpha: true })} ${Math.round(stop.pos * 100)}%`)
        h.setAttribute('aria-valuetext', `${formatColor(stop.color, { alpha: true })} ${Math.round(stop.pos * 100)}%`)
        box.appendChild(h)
      }
    }
    // 背景
    const bg = root.querySelector<HTMLElement>('.grad-bg')
    if (bg) bg.style.background = this.gradBgCss()
    // 每个手柄位置与颜色
    const handles = box.querySelectorAll<HTMLElement>('.grad-stop')
    for (let i = 0; i < handles.length; i++) {
      const stop = this.gradStops[i]
      const h = handles[i]
      if (!stop || !h) continue
      h.style.left = `${stop.pos * 100}%`
      h.style.backgroundColor = formatSwatch(stop.color)
      h.setAttribute('data-active', String(i === this.activeStop))
      h.setAttribute('aria-valuenow', String(Math.round(stop.pos * 100)))
      h.setAttribute('aria-valuetext', `${formatColor(stop.color, { alpha: true })} ${Math.round(stop.pos * 100)}%`)
    }
    // 移除按钮可用态
    const remove = root.querySelector<HTMLButtonElement>('[part="grad-remove"]')
    if (remove) remove.disabled = this.gradStops.length <= MIN_GRAD_STOPS
  }

  /** trigger 渐变展示（色块渐变背景 + 文本）——渐变模式下覆盖宿主单色 trigger 绘制 */
  paintGradientTrigger(): void {
    const root = this.root()
    if (!root) return
    const swatch = root.querySelector<HTMLElement>('.swatch')
    const text = root.querySelector<HTMLElement>('.hex-text')
    const showText = this.hostEl.getAttribute('show-text') !== 'false'
    const hasValue = (this.hostEl.getAttribute('value') ?? '').trim() !== ''
    if (swatch) {
      swatch.classList.remove('alpha-checker')
      swatch.classList.add('grad-swatch')
      if (hasValue) {
        swatch.style.backgroundImage = formatGradient(this.gradStops, { alpha: true })
        swatch.style.backgroundColor = ''
        swatch.removeAttribute('hidden')
      } else {
        swatch.style.backgroundImage = ''
        swatch.style.backgroundColor = ''
        swatch.setAttribute('hidden', '')
      }
    }
    if (text) {
      if (!showText) {
        text.setAttribute('hidden', '')
      } else {
        text.removeAttribute('hidden')
        text.classList.toggle('placeholder', !hasValue)
        text.textContent = hasValue ? this.gradientDisplayText() : this.hostEl.translateText('colorPicker.empty')
      }
    }
  }

  /** 2D 色域 + hue 竖条绘制（读当前编辑色，更新背景/光标/aria） */
  paintSvHue(): void {
    const root = this.root()
    if (!root) return
    const { r, g, b } = this.currentEditColor()
    const [h, s, v] = rgbToHsv(r, g, b)
    // 2D 色域背景（hue 驱动）+ 光标
    const sv = root.querySelector<HTMLElement>('.sv2d')
    if (sv) {
      sv.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))`
      sv.setAttribute('aria-valuenow', String(Math.round(s * 100)))
      sv.setAttribute(
        'aria-valuetext',
        `${this.hostEl.translateText('colorPicker.saturation')} ${Math.round(s * 100)}%，${this.hostEl.translateText('colorPicker.brightness')} ${Math.round(v * 100)}%`,
      )
      const thumb = sv.querySelector<HTMLElement>('.sv2d-thumb') ?? this.makeSvThumb(sv)
      thumb.style.left = `${s * 100}%`
      thumb.style.top = `${(1 - v) * 100}%`
      thumb.style.backgroundColor = formatSwatch(this.currentEditColor())
    }
    // hue 竖条背景 + 光标
    const hue = root.querySelector<HTMLElement>('.hue')
    if (hue) {
      hue.style.background = hueGradientCss()
      hue.setAttribute('aria-valuenow', String(Math.round(h)))
      const thumb = hue.querySelector<HTMLElement>('.hue-thumb') ?? this.makeHueThumb(hue)
      thumb.style.top = `${((360 - h) / 360) * 100}%`
      thumb.style.backgroundColor = formatSwatch(this.currentEditColor())
    }
  }

  // ==================== DOM 绑定 ====================

  private bind(): void {
    const root = this.root()
    if (!root) return
    const els: HTMLElement[] = []

    const sv = root.querySelector<HTMLElement>('.sv2d')
    if (sv) {
      sv.addEventListener('keydown', this.onSvKey)
      sv.addEventListener('pointerdown', this.onSvPointerDown)
      els.push(sv)
    }
    const hue = root.querySelector<HTMLElement>('.hue')
    if (hue) {
      hue.addEventListener('keydown', this.onHueKey)
      hue.addEventListener('pointerdown', this.onHuePointerDown)
      els.push(hue)
    }
    const gradAdd = root.querySelector<HTMLButtonElement>('[part="grad-add"]')
    if (gradAdd) {
      gradAdd.addEventListener('click', this.addGradStop)
      els.push(gradAdd)
    }
    const gradRemove = root.querySelector<HTMLButtonElement>('[part="grad-remove"]')
    if (gradRemove) {
      gradRemove.addEventListener('click', this.removeActiveStop)
      els.push(gradRemove)
    }
    const gradTrack = root.querySelector<HTMLElement>('.grad-track')
    if (gradTrack) {
      gradTrack.addEventListener('pointerdown', this.onGradPointerDown)
      els.push(gradTrack)
    }
    const gradStops = root.querySelector<HTMLElement>('.grad-stops')
    if (gradStops) {
      gradStops.addEventListener('keydown', this.onGradStopKey)
      // stop 获得焦点（Tab/点按）即选中：编辑面跟随
      gradStops.addEventListener('focusin', this.onGradStopFocusIn)
      els.push(gradStops)
    }
    this.bound = els
  }

  private unbind(): void {
    for (const el of this.bound) {
      el.removeEventListener('keydown', this.onSvKey)
      el.removeEventListener('pointerdown', this.onSvPointerDown)
      el.removeEventListener('keydown', this.onHueKey)
      el.removeEventListener('pointerdown', this.onHuePointerDown)
      el.removeEventListener('click', this.addGradStop)
      el.removeEventListener('click', this.removeActiveStop)
      el.removeEventListener('pointerdown', this.onGradPointerDown)
      el.removeEventListener('keydown', this.onGradStopKey)
      el.removeEventListener('focusin', this.onGradStopFocusIn)
    }
    this.bound = []
  }

  // ---------- 渐变 stop 交互 ----------

  private onGradStopFocusIn = (e: FocusEvent): void => {
    const target = e.target as HTMLElement | null
    const handle = target?.closest?.('.grad-stop')
    if (!handle) return
    const root = this.root()
    if (!root || !root.contains(handle)) return
    const index = Array.from(root.querySelectorAll('.grad-stop')).indexOf(handle)
    if (index >= 0) this.selectStop(index)
  }

  private onGradStopKey = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null
    const handle = target?.closest?.('.grad-stop')
    if (!handle) return
    const root = this.root()
    if (!root || !root.contains(handle)) return
    const index = Array.from(root.querySelectorAll('.grad-stop')).indexOf(handle)
    if (index < 0 || this.isLocked() || !this.gradientMode()) return
    const key = e.key
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault()
      const dir = key === 'ArrowLeft' ? -1 : 1
      const cur = this.gradStops[index]!.pos
      this.gradStops = moveStop(this.gradStops, index, cur + dir * KEY_STEP)
      this.activeStop = index
      this.commitGradient()
    } else if (key === 'Delete' || key === 'Backspace') {
      e.preventDefault()
      this.selectStop(index)
      this.removeActiveStop()
    }
  }

  private onGradPointerDown = (e: PointerEvent): void => {
    if (this.isLocked() || !this.gradientMode()) return
    const root = this.root()
    if (!root) return
    const target = e.target as HTMLElement | null
    const track = target?.closest?.('.grad-track')
    if (!track || !root.contains(track)) return
    const stopEl = target?.closest?.('.grad-stop')
    const rect = track.getBoundingClientRect()
    const pos = rect.width ? (e.clientX - rect.left) / rect.width : 0
    const clampPos = Math.min(Math.max(pos, 0), 1)
    if (stopEl) {
      // 拖拽既有 stop：定位到最近手柄
      const index = Array.from(root.querySelectorAll('.grad-stop')).indexOf(stopEl as HTMLElement)
      if (index >= 0) {
        this.activeStop = index
        this.dragging = 'grad'
        this.dragIndex = index
        this.applyGradPos(clampPos)
        this.attachDragListeners()
      }
    } else {
      // 空白区：距离最近手柄足够远时新增（就近则仅选中）
      const near = this.gradStops.findIndex((s) => Math.abs(s.pos - clampPos) < 0.025)
      if (near >= 0) {
        this.selectStop(near)
      } else {
        this.addStopAt(clampPos)
      }
    }
    e.preventDefault()
  }

  private selectStop(index: number): void {
    if (!this.gradientMode() || this.gradStops.length === 0) return
    this.activeStop = Math.min(Math.max(index, 0), this.gradStops.length - 1)
    // 编辑面（rgb/hex/alpha/2D）跟随活动 stop 色
    this.hostEl.setColorValue(this.currentEditColor())
    this.syncGradientControls()
    this.paintSvHue()
    this.hostEl.refreshControls()
  }

  private addGradStop = (): void => {
    if (this.isLocked() || !this.gradientMode()) return
    if (this.gradStops.length >= MAX_GRAD_STOPS) return
    const pos = this.maxGapPos()
    const color = gradientAt(this.gradStops, pos)
    this.gradStops = insertStop(this.gradStops, pos, this.normalizeAlpha(color))
    this.activeStop = this.gradStops.findIndex((s) => Math.abs(s.pos - pos) < 1e-6)
    if (this.activeStop < 0) this.activeStop = this.gradStops.length - 1
    this.gradStopsSig = -1
    this.commitGradient()
  }

  private removeActiveStop = (): void => {
    if (this.isLocked() || !this.gradientMode()) return
    if (this.gradStops.length <= MIN_GRAD_STOPS) return
    const idx = this.activeStop
    this.gradStops = removeStopAt(this.gradStops, idx)
    this.activeStop = Math.min(idx, this.gradStops.length - 1)
    this.gradStopsSig = -1
    this.commitGradient()
  }

  private addStopAt(pos: number): void {
    if (this.gradStops.length >= MAX_GRAD_STOPS) return
    const color = gradientAt(this.gradStops, pos)
    this.gradStops = insertStop(this.gradStops, pos, this.normalizeAlpha(color))
    this.activeStop = this.gradStops.findIndex((s) => Math.abs(s.pos - pos) < 1e-6)
    if (this.activeStop < 0) this.activeStop = this.gradStops.length - 1
    this.gradStopsSig = -1
    this.commitGradient()
  }

  /** 拖拽中把 stop 移动到 pos（夹取到邻居之间） */
  private applyGradPos(pos: number): void {
    if (this.dragIndex < 0 || !this.gradStops[this.dragIndex]) return
    this.gradStops = moveStop(this.gradStops, this.dragIndex, Math.min(Math.max(pos, 0), 1))
    this.commitGradient()
  }

  /** 最大空隙中点（无空隙取末端外侧） */
  private maxGapPos(): number {
    const n = this.gradStops.length
    if (n === 0) return 0.5
    if (n === 1) return this.gradStops[0]!.pos >= 0.5 ? 0 : 1
    let best = 0
    let bestPos = this.gradStops[0]!.pos / 2
    for (let i = 0; i < n - 1; i++) {
      const a = this.gradStops[i]!.pos
      const b = this.gradStops[i + 1]!.pos
      const gap = b - a
      if (gap > best) {
        best = gap
        bestPos = a + gap / 2
      }
    }
    // 两端外侧空余也算候选
    const first = this.gradStops[0]!.pos
    const last = this.gradStops[n - 1]!.pos
    if (first > best) {
      best = first
      bestPos = first / 2
    }
    if (1 - last > best) {
      best = 1 - last
      bestPos = last + (1 - last) / 2
    }
    return bestPos
  }

  /** 渐变轨道背景（纯色 stop 内插；颜色走 formatSwatch 全精度） */
  private gradBgCss(): string {
    const parts = this.gradStops.map((s) => `${formatSwatch(s.color)} ${Math.round(s.pos * 100)}%`)
    return `linear-gradient(90deg, ${parts.join(', ')})`
  }

  /** rAF 节流：累积最新动作，一帧只消费一次 */
  private scheduleApply(fn: () => void): void {
    this.dragApply = fn
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      if (!this.dragging) return
      const fn2 = this.dragApply
      this.dragApply = null
      if (fn2) fn2()
    })
  }

  /** 提交渐变值（value = formatGradient 规范串；颜色格式沿 color-format/uppercase/show-alpha） */
  private commitGradient(): void {
    if (this.isLocked()) return
    if (this.gradStops.length < 2) return
    const out = formatGradient(this.gradStops, this.outputOpts())
    if (this.hostEl.getAttribute('value') === out) {
      this.hostEl.refreshControls()
      return
    }
    this.hostEl.setAttribute('value', out)
    this.hostEl.dispatchEvent(
      new CustomEvent('oas-change', { bubbles: true, composed: true, detail: { value: out } }),
    )
  }

  // ---------- 渐变值展示 ----------

  private gradientDisplayText(): string {
    const raw = this.hostEl.getAttribute('value') ?? ''
    if (parseGradient(raw)) return raw
    if (parseColor(raw)) return formatColor(this.normalizeAlpha(parseColor(raw)!), this.outputOpts())
    return formatGradient(this.gradStops, this.outputOpts())
  }

  /** 无值时的渐变起始态：默认色铺 0/100 两条 */
  private seedGradient(): void {
    const c = this.normalizeAlpha({ ...DEFAULT_COLOR })
    this.gradStops = [
      { pos: 0, color: { ...c } },
      { pos: 1, color: { ...c } },
    ]
    this.activeStop = 0
  }

  // ==================== 2D 色域 + hue 竖条交互 ====================

  private hsvOfEdit(): [number, number, number] {
    const { r, g, b } = this.currentEditColor()
    return rgbToHsv(r, g, b)
  }

  private onSvKey = (e: KeyboardEvent): void => {
    if (this.isLocked()) return
    const [h, s, v] = this.hsvOfEdit()
    let ns = s
    let nv = v
    const key = e.key
    if (key === 'ArrowLeft') ns = Math.max(0, s - KEY_STEP)
    else if (key === 'ArrowRight') ns = Math.min(1, s + KEY_STEP)
    else if (key === 'ArrowUp') nv = Math.min(1, v + KEY_STEP)
    else if (key === 'ArrowDown') nv = Math.max(0, v - KEY_STEP)
    else if (key === 'Home') ns = 0
    else if (key === 'End') ns = 1
    else return
    e.preventDefault()
    this.commitFromSv(ns, nv)
  }

  private onHueKey = (e: KeyboardEvent): void => {
    if (this.isLocked()) return
    const [h] = this.hsvOfEdit()
    let nh = h
    const key = e.key
    if (key === 'ArrowUp') nh = Math.min(360, h + HUE_KEY_STEP)
    else if (key === 'ArrowDown') nh = Math.max(0, h - HUE_KEY_STEP)
    else if (key === 'Home') nh = 0
    else if (key === 'End') nh = 360
    else return
    e.preventDefault()
    this.commitFromHue(nh)
  }

  private onSvPointerDown = (e: PointerEvent): void => {
    if (this.isLocked()) return
    const sv = this.root()?.querySelector<HTMLElement>('.sv2d')
    if (!sv) return
    sv.focus()
    this.dragging = 'sv'
    this.applySvPointer(e, sv)
    this.attachDragListeners()
    e.preventDefault()
  }

  private onHuePointerDown = (e: PointerEvent): void => {
    if (this.isLocked()) return
    const hue = this.root()?.querySelector<HTMLElement>('.hue')
    if (!hue) return
    hue.focus()
    this.dragging = 'hue'
    this.applyHuePointer(e, hue)
    this.attachDragListeners()
    e.preventDefault()
  }

  private attachDragListeners(): void {
    document.addEventListener('pointermove', this.onDragMove)
    document.addEventListener('pointerup', this.endDrag)
  }

  private onDragMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    if (this.dragging === 'grad') {
      const track = this.root()?.querySelector<HTMLElement>('.grad-track')
      if (!track) return
      const rect = track.getBoundingClientRect()
      if (!rect.width) return
      const pos = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
      this.scheduleApply(() => this.applyGradPos(pos))
      return
    }
    if (this.dragging === 'sv') {
      const sv = this.root()?.querySelector<HTMLElement>('.sv2d')
      if (!sv) return
      const rect = sv.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      const [s, v] = xyToSv(x, y)
      this.scheduleApply(() => this.commitFromSv(s, v))
      return
    }
    if (this.dragging === 'hue') {
      const hue = this.root()?.querySelector<HTMLElement>('.hue')
      if (!hue) return
      const rect = hue.getBoundingClientRect()
      if (!rect.height) return
      const hueVal = hueFromY((e.clientY - rect.top) / rect.height)
      this.scheduleApply(() => this.commitFromHue(hueVal))
    }
  }

  private applySvPointer(e: PointerEvent, sv: HTMLElement): void {
    const rect = sv.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const [s, v] = xyToSv(x, y)
    this.commitFromSv(s, v)
  }

  private applyHuePointer(e: PointerEvent, hue: HTMLElement): void {
    const rect = hue.getBoundingClientRect()
    if (!rect.height) return
    const y = (e.clientY - rect.top) / rect.height
    this.commitFromHue(hueFromY(y))
  }

  private endDrag = (): void => {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (!this.dragging) return
    // 释放前冲刷最后一次 rAF 累积（松手不丢最后一段位置）
    const fn = this.dragApply
    this.dragApply = null
    if (fn) fn()
    this.dragging = null
    this.dragIndex = -1
    document.removeEventListener('pointermove', this.onDragMove)
    document.removeEventListener('pointerup', this.endDrag)
  }

  private commitFromSv(s: number, v: number): void {
    const [h] = this.hsvOfEdit()
    const { r, g, b } = hsvToRgb(h, s, v)
    this.hostEl.commitColor({ r, g, b, a: this.currentEditColor().a })
  }

  private commitFromHue(hue: number): void {
    const [, s, v] = this.hsvOfEdit()
    const { r, g, b } = hsvToRgb(hue, s, v)
    this.hostEl.commitColor({ r, g, b, a: this.currentEditColor().a })
  }

  private makeSvThumb(sv: HTMLElement): HTMLElement {
    const t = document.createElement('div')
    t.className = 'sv2d-thumb'
    t.setAttribute('aria-hidden', 'true')
    sv.appendChild(t)
    return t
  }

  private makeHueThumb(hue: HTMLElement): HTMLElement {
    const t = document.createElement('div')
    t.className = 'hue-thumb'
    t.setAttribute('aria-hidden', 'true')
    hue.appendChild(t)
    return t
  }
}

/** 便捷：构造 designer 能力 controller（供能力注册表 / 组装类 addController 用） */
export function createDesignerController(
  host: HTMLElement & ColorPickerDesignerHost,
): ColorPickerDesignerController {
  return new ColorPickerDesignerController(host)
}
