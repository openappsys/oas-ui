import { OASElement } from '@oas-ui/core'
import { lookupIcon } from '../../basic/icon/oas-icon.js'

/** 预设色板名（映射 --oas-preset-* token，color/track-color 属性支持按名引用；非法名按普通色值处理） */
export type ProgressPresetColor =
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'

export const PROGRESS_PRESET_COLORS: readonly ProgressPresetColor[] = [
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
]

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  /* 条纹周期默认随轨道高度自适应（2.5 倍高度），可整体覆盖 */
  --oas-progress-stripe-size: calc(var(--oas-progress-height, var(--oas-space-2)) * 2.5);
}
/* 状态色统一走 --oas-progress-color（host 层定义，bar/环/分段/缓冲/图标全继承）；
   color 属性注入 host 内联变量，具体度更高，优先于状态规则 */
:host([data-status='success']),
:host(.done) {
  --oas-progress-color: var(--oas-color-success);
}
:host([data-status='warning']) {
  --oas-progress-color: var(--oas-color-warning);
}
:host([data-status='error']) {
  --oas-progress-color: var(--oas-color-danger);
}
/* line 形态 */
.track {
  position: relative;
  height: var(--oas-progress-height, var(--oas-space-2));
  background: var(--oas-progress-track-color, var(--oas-color-bg-hover));
  border-radius: var(--oas-radius-full, 999px);
  overflow: hidden;
}
.track[hidden] {
  display: none;
}
/* 缓冲层：主进度条下方浅色段（line 限定），bar 后声明故 bar 覆盖其上 */
.buffer {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  background: var(
    --oas-progress-buffer-color,
    color-mix(in srgb, var(--oas-progress-color, var(--oas-color-primary)) 35%, transparent)
  );
  border-radius: inherit;
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
.bar {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  background-color: var(--oas-progress-color, var(--oas-color-primary));
  border-radius: inherit;
  transition: width var(--oas-transition-base) var(--oas-ease-out);
}
/* color 传渐变串：渐变只能作 background-image，纯色层置空避免底色外露 */
.bar.gradient {
  background-color: transparent;
  background-image: var(--oas-progress-color);
}
/* 条纹（line 限定）：与主色叠层的斜纹，密度随高度自适应 */
.bar.striped {
  background-image: linear-gradient(
    45deg,
    color-mix(in srgb, var(--oas-progress-stripe-color, var(--oas-color-bg)) 22%, transparent) 25%,
    transparent 25%,
    transparent 50%,
    color-mix(in srgb, var(--oas-progress-stripe-color, var(--oas-color-bg)) 22%, transparent) 50%,
    color-mix(in srgb, var(--oas-progress-stripe-color, var(--oas-color-bg)) 22%, transparent) 75%,
    transparent 75%
  );
  background-size: var(--oas-progress-stripe-size) var(--oas-progress-stripe-size);
}
.bar.striped.gradient {
  background-image: var(--oas-progress-color);
}
.bar.striped-flow {
  animation: oas-progress-stripe-flow
    var(--oas-progress-duration, 1.2s) linear infinite;
}
@keyframes oas-progress-stripe-flow {
  from {
    background-position: 0 0;
  }
  to {
    background-position: var(--oas-progress-stripe-size) 0;
  }
}
/* 不确定态（indeterminate）：宽度交由类样式接管，滑块循环扫过轨道 */
.bar.indeterminate {
  width: 40%;
  animation: oas-progress-indeterminate
    var(--oas-progress-duration, 1.2s) var(--oas-ease-in-out) infinite;
}
@keyframes oas-progress-indeterminate {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
}
/* 步进分段（line 限定）：等分段 flex，亮段走主色，暗段透出轨道色 */
.steps {
  position: absolute;
  inset: 0;
  display: flex;
  gap: var(--oas-progress-step-gap, var(--oas-space-1));
}
.step {
  flex: 1;
  border-radius: var(--oas-radius-full, 999px);
  background: transparent;
  transition: background-color var(--oas-transition-base) var(--oas-ease-out);
}
.step.active {
  background-color: var(--oas-progress-color, var(--oas-color-primary));
}
/* 内嵌文本（line 限定）：条内居中，色默认取底色 token（light 白 / dark 深底在亮条上均可读） */
.inside {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-progress-inside-color, var(--oas-color-bg));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* 外部文本（line 默认）：轨道下方右侧，slot 与内置值并排 */
.text {
  margin-top: var(--oas-space-1);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
/* circle 形态 */
.circle {
  position: relative;
  display: inline-block;
}
.circle[hidden] {
  display: none;
}
.circle .track-circle {
  fill: none;
  stroke: var(--oas-progress-track-color, var(--oas-color-bg-hover));
}
.circle .bar-circle {
  fill: none;
  stroke: var(--oas-progress-color, var(--oas-color-primary));
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset var(--oas-transition-base) var(--oas-ease-out);
}
/* 仪表盘形态：起始角 135°（左下象限），270° 可用弧、底部开口 */
.circle[data-type='dashboard'] .bar-circle {
  transform: rotate(135deg);
}
/* 不确定态（circle）：分段弧旋转；dashboard 起始角不同（135°），独立关键帧 */
.circle.indeterminate .bar-circle {
  animation: oas-progress-spin-circle var(--oas-progress-duration, 1.2s) linear infinite;
}
@keyframes oas-progress-spin-circle {
  from {
    transform: rotate(-90deg);
  }
  to {
    transform: rotate(270deg);
  }
}
.circle.indeterminate[data-type='dashboard'] .bar-circle {
  animation-name: oas-progress-spin-dashboard;
}
@keyframes oas-progress-spin-dashboard {
  from {
    transform: rotate(135deg);
  }
  to {
    transform: rotate(495deg);
  }
}
.circle-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  font-variant-numeric: tabular-nums;
}
/* 状态图标（circle/dashboard）：success/error/warning/完成态替代百分比，色走状态色变量 */
.circle-icon {
  display: inline-flex;
  color: var(--oas-progress-color, var(--oas-color-primary));
  font-size: calc(var(--oas-font-size-sm) * 1.25);
  line-height: 1;
}
.circle-icon svg {
  display: block;
}
`

export class OASProgress extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'percent',
      'value',
      'status',
      'no-text',
      'show-text',
      'type',
      'size',
      'stroke-width',
      'max',
      'label',
      'color',
      'track-color',
      'striped',
      'striped-flow',
      'steps',
      'buffer',
      'text-inside',
      'indeterminate',
      'stroke-linecap',
    ]
  }

  private bar: HTMLElement | null = null
  private track: HTMLElement | null = null
  private text: HTMLElement | null = null
  private textValue: HTMLElement | null = null
  private bufferEl: HTMLElement | null = null
  private stepsEl: HTMLElement | null = null
  private insideEl: HTMLElement | null = null
  private insideValue: HTMLElement | null = null
  private circle: HTMLElement | null = null
  private circleText: HTMLElement | null = null
  private circleValue: HTMLElement | null = null
  private circleIcon: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="track" part="track">
        <div class="buffer" part="buffer" aria-hidden="true" hidden></div>
        <div class="bar" part="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
        <div class="steps" part="steps" aria-hidden="true" hidden></div>
        <div class="inside" part="inside" hidden><span class="inside-value"></span></div>
      </div>
      <div class="text" part="text"><span class="text-value">0%</span><slot></slot></div>
      <div class="circle" part="circle" role="progressbar" aria-valuemin="0" aria-valuemax="100" hidden>
        <svg class="svg" viewBox="0 0 48 48">
          <circle class="track-circle" part="circle-track" cx="24" cy="24" r="21"></circle>
          <circle class="bar-circle" part="circle-bar" cx="24" cy="24" r="21"></circle>
        </svg>
        <div class="circle-text" part="circle-text"><span class="circle-value">0%</span><span class="circle-icon" aria-hidden="true"></span></div>
      </div>
    `
  }

  /** 缓存节点引用 + slotchange 监听（render 与水合路径共用；监听挂在 shadow 内部节点上，随元素整体回收） */
  private bind(): void {
    this.bar = this.shadow.querySelector<HTMLElement>('[part="bar"]')
    this.track = this.shadow.querySelector<HTMLElement>('.track')
    this.text = this.shadow.querySelector<HTMLElement>('[part="text"]')
    this.textValue = this.shadow.querySelector<HTMLElement>('.text-value')
    this.bufferEl = this.shadow.querySelector<HTMLElement>('[part="buffer"]')
    this.stepsEl = this.shadow.querySelector<HTMLElement>('[part="steps"]')
    this.insideEl = this.shadow.querySelector<HTMLElement>('[part="inside"]')
    this.insideValue = this.shadow.querySelector<HTMLElement>('.inside-value')
    this.circle = this.shadow.querySelector<HTMLElement>('[part="circle"]')
    this.circleText = this.shadow.querySelector<HTMLElement>('.circle-text')
    this.circleValue = this.shadow.querySelector<HTMLElement>('.circle-value')
    this.circleIcon = this.shadow.querySelector<HTMLElement>('.circle-icon')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot')
    this.slotEl?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（bar 与 circle 关键部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="bar"]')) return false
    if (!this.shadow.querySelector('[part="circle"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const max = this.parseMax()
    const value = this.clampValue(this.readValue(), max)
    const percent = (value / max) * 100
    const status = this.getAttr('status', '')
    const type = this.parseType()
    const showText = !this.hasAttr('no-text') && this.getAttr('show-text', 'true') !== 'false'
    const textInside = type === 'line' && this.hasAttr('text-inside')
    const slotHas = this.hasSlotContent()
    // 不确定态：忽略 percent/steps/buffer/striped，摘除 aria-valuenow（APG）
    const indeterminate = this.hasAttr('indeterminate')

    // 状态色统一变量：host 层 data-status + done（bar/bar-circle 上保留同名 data-status 作样式钩子）
    this.setStatusAttr(this, status)
    this.setDoneClass(this, percent >= 100 && !status)

    // 默认 slot 归位：line 外部文本区 / line 条内（text-inside）/ 圆心
    this.placeSlot(type, textInside)

    this.updateLine(type, value, percent, max, status, showText, textInside, slotHas, indeterminate)
    this.updateCircle(type, value, percent, max, status, showText, slotHas, indeterminate)
    this.applyLineHeight(type)
    this.applyColorVars()
  }

  /** 解析 type：line / circle / dashboard（dashboard 渲染复用 circle 结构） */
  private parseType(): 'line' | 'circle' | 'dashboard' {
    const t = this.getAttr('type', 'line')
    return t === 'circle' || t === 'dashboard' ? t : 'line'
  }

  /** 状态属性写入：空态摘除而非写空串（SSR 序列化不出 data-status="" 噪声） */
  private setStatusAttr(el: HTMLElement | SVGElement, status: string): void {
    if (status) el.setAttribute('data-status', status)
    else el.removeAttribute('data-status')
  }

  /** 完成态类名标记：仅在实际置位/清除时碰 classList（空态访问 classList 会在 SSR DOM 留下 class="" 噪声） */
  private setDoneClass(el: HTMLElement | SVGElement, done: boolean): void {
    const marked = this.doneMarked.has(el)
    if (done && !marked) {
      el.classList.add('done')
      this.doneMarked.add(el)
    } else if (!done && marked) {
      el.classList.remove('done')
      this.doneMarked.delete(el)
    }
  }

  /** setDoneClass 的置位记录（避免空态碰 classList） */
  private doneMarked = new WeakSet<HTMLElement | SVGElement>()

  /** 解析 max 值域上限：非正数/非法值回退 100 */
  private parseMax(): number {
    const n = Number(this.getAttr('max', '100'))
    return n > 0 ? n : 100
  }

  /** value 夹取 0–max */
  private clampValue(value: number, max: number): number {
    return Math.min(max, Math.max(0, value))
  }

  /**
   * 当前进度值：percent 属性存在时优先；否则读 value（percent 的别名）。
   * deterministic：只读不反射、不同步。宿主直觉写 value 不会静默无效
   */
  private readValue(): number {
    const raw = this.hasAttr('percent') ? this.getAttr('percent', '0') : this.getAttr('value', '0')
    return Number(raw) || 0
  }

  /** label 属性 → 无障碍名（写入当前 progressbar 容器） */
  private applyAriaLabel(el: Element, name: string): void {
    const label = this.getAttr(name, '')
    if (label) el.setAttribute('aria-label', label)
    else el.removeAttribute('aria-label')
  }

  /** 默认 slot 内容检测（元素或有非空文本节点即视为有内容） */
  private hasSlotContent(): boolean {
    if (!this.slotEl) return false
    return this.slotEl
      .assignedNodes({ flatten: true })
      .some(
        (n) => n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && !!(n.textContent ?? '').trim()),
      )
  }

  /** slot 物理归位（幂等：已在目标容器则不动，避免 slotchange 重入抖动） */
  private placeSlot(type: 'line' | 'circle' | 'dashboard', textInside: boolean): void {
    if (!this.slotEl) return
    const target = type === 'line' ? (textInside ? this.insideEl : this.text) : this.circleText
    if (target && this.slotEl.parentElement !== target) target.appendChild(this.slotEl)
  }

  private updateLine(
    type: 'line' | 'circle' | 'dashboard',
    value: number,
    percent: number,
    max: number,
    status: string,
    showText: boolean,
    textInside: boolean,
    slotHas: boolean,
    indeterminate: boolean,
  ): void {
    const stepsCount = indeterminate ? 0 : this.parseSteps()

    if (this.track) this.track.hidden = type !== 'line'

    if (this.bar) {
      // steps 模式下连续 bar 让位（宽度归零）；不确定态宽度交由 CSS 类接管；
      // 条纹/渐变类名同步（不确定态压制条纹）
      const striped = !indeterminate && (this.hasAttr('striped') || this.hasAttr('striped-flow'))
      this.bar.style.width = indeterminate ? '' : stepsCount > 0 ? '0%' : `${percent}%`
      this.bar.classList.toggle('indeterminate', indeterminate && type === 'line')
      this.bar.classList.toggle('striped', striped)
      this.bar.classList.toggle('striped-flow', striped && this.hasAttr('striped-flow'))
      this.bar.classList.toggle('gradient', /gradient\(/.test(this.getAttr('color', '')))
      if (indeterminate) this.bar.removeAttribute('aria-valuenow')
      else this.bar.setAttribute('aria-valuenow', String(value))
      this.bar.setAttribute('aria-valuemax', String(max))
      this.applyAriaLabel(this.bar, 'label')
      this.bar.classList.toggle('done', percent >= 100 && !status)
      this.setStatusAttr(this.bar, status)
    }

    if (this.bufferEl) {
      const raw = this.getAttr('buffer', '')
      const bufValue = raw === '' ? null : this.clampValue(Number(raw) || 0, max)
      this.bufferEl.hidden = bufValue === null || type !== 'line' || stepsCount > 0 || indeterminate
      this.bufferEl.style.width = bufValue === null ? '' : `${(bufValue / max) * 100}%`
    }

    if (this.stepsEl) {
      this.stepsEl.hidden = !(type === 'line' && stepsCount > 0)
      if (stepsCount > 0 && type === 'line') {
        const active = Math.round((percent / 100) * stepsCount)
        this.stepsEl.replaceChildren(
          ...Array.from({ length: stepsCount }, (_, i) => {
            const seg = document.createElement('div')
            seg.className = i < active ? 'step active' : 'step'
            return seg
          }),
        )
      } else {
        this.stepsEl.replaceChildren()
      }
    }

    const label = `${Math.round(percent)}%`
    if (this.text) {
      this.text.hidden = !showText || textInside
      this.textValue!.hidden = slotHas || indeterminate
      this.textValue!.textContent = label
    }
    if (this.insideEl) {
      this.insideEl.hidden = !showText || !textInside
      this.insideValue!.hidden = slotHas || indeterminate
      this.insideValue!.textContent = label
    }
  }

  /** 解析 steps：整数且 ≥2 才生效（上限 100 防滥用），否则 0（连续 bar） */
  private parseSteps(): number {
    const n = Number(this.getAttr('steps', ''))
    if (!Number.isInteger(n) || n < 2) return 0
    return Math.min(n, 100)
  }

  /** line 轨道高度：显式 stroke-width > size 档位 > text-inside 自动提升 > 默认；circle 不注入 */
  private applyLineHeight(type: 'line' | 'circle' | 'dashboard'): void {
    if (type !== 'line') {
      this.style.removeProperty('--oas-progress-height')
      return
    }
    const sw = Number(this.getAttr('stroke-width', ''))
    const size = this.getAttr('size', '')
    let height = ''
    if (this.getAttr('stroke-width', '') !== '' && !Number.isNaN(sw) && sw > 0) {
      height = `${sw}px`
    } else if (size === 'small') {
      height = 'var(--oas-space-1)'
    } else if (size === 'large') {
      height = 'var(--oas-space-3)'
    } else if (this.hasAttr('text-inside')) {
      height = 'calc(var(--oas-font-size-sm) + 2 * var(--oas-space-1))'
    } else if (size === 'medium') {
      height = 'var(--oas-space-2)'
    }
    if (height) this.style.setProperty('--oas-progress-height', height)
    else this.style.removeProperty('--oas-progress-height')
  }

  /** color / track-color：预设名解析为 --oas-preset-* 变量，否则按 CSS 色串/渐变串原值注入 host 内联变量 */
  private applyColorVars(): void {
    const color = this.getAttr('color', '')
    const trackColor = this.getAttr('track-color', '')
    this.setPresetVar('--oas-progress-color', color)
    this.setPresetVar('--oas-progress-track-color', trackColor)
  }

  /** 按 color 属性统一协议注入/清理一个变量（空值清理，预设名转 token，其余原值） */
  private setPresetVar(varName: string, value: string): void {
    if (!value) {
      this.style.removeProperty(varName)
      return
    }
    const base = (PROGRESS_PRESET_COLORS as readonly string[]).includes(value) ? `var(--oas-preset-${value})` : value
    this.style.setProperty(varName, base)
  }

  private updateCircle(
    type: 'line' | 'circle' | 'dashboard',
    value: number,
    percent: number,
    max: number,
    status: string,
    showText: boolean,
    slotHas: boolean,
    indeterminate: boolean,
  ): void {
    if (!this.circle) return
    this.circle.hidden = type === 'line'
    this.circle.setAttribute('data-type', type === 'dashboard' ? 'dashboard' : 'circle')
    this.circle.classList.toggle('indeterminate', indeterminate && type !== 'line')
    if (type === 'line') return

    const size = Math.max(0, Number(this.getAttr('size', '48')) || 48)
    const strokeWidth = Math.max(0, Number(this.getAttr('stroke-width', '6')) || 6)
    const radius = Math.max(1, (size - strokeWidth) / 2)
    const circumference = 2 * Math.PI * radius
    // dashboard：270° 可用弧（底部 90° 开口）；circle：整周
    const arc = type === 'dashboard' ? circumference * 0.75 : circumference

    const svg = this.shadow.querySelector<SVGSVGElement>('.circle svg')
    if (svg) {
      svg.setAttribute('width', String(size))
      svg.setAttribute('height', String(size))
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    }
    const center = size / 2
    const trackCircle = this.shadow.querySelector('.circle .track-circle')
    const barCircle = this.shadow.querySelector('.circle .bar-circle')
    // 不确定态：弧压成 1/4 分段旋转；确定态：可用弧按 percent 偏移
    const barDash = indeterminate ? `${arc * 0.25} ${arc * 0.75}` : String(arc)
    for (const ring of [trackCircle, barCircle]) {
      ring?.setAttribute('cx', String(center))
      ring?.setAttribute('cy', String(center))
      ring?.setAttribute('r', String(radius))
      ring?.setAttribute('stroke-width', String(strokeWidth))
      ring?.setAttribute('stroke-dasharray', ring === barCircle ? barDash : String(arc))
    }
    barCircle?.setAttribute('stroke-dashoffset', indeterminate ? '0' : String(arc * (1 - percent / 100)))
    barCircle?.setAttribute('stroke-linecap', this.getAttr('stroke-linecap', 'round') === 'butt' ? 'butt' : 'round')
    barCircle?.classList.toggle('done', percent >= 100 && !status)
    if (barCircle) this.setStatusAttr(barCircle as SVGElement, status)

    // 圆心内容三优先级：slot > 状态图标 > 百分比
    const iconName = this.statusIconName(status, percent, indeterminate, slotHas)
    if (this.circleIcon) {
      const path = iconName ? lookupIcon(iconName) : undefined
      if (iconName && path) {
        const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svgIcon.setAttribute('viewBox', '0 0 16 16')
        svgIcon.setAttribute('width', '1em')
        svgIcon.setAttribute('height', '1em')
        svgIcon.setAttribute('aria-hidden', 'true')
        svgIcon.setAttribute('focusable', 'false')
        svgIcon.innerHTML = path
        this.circleIcon.replaceChildren(svgIcon)
      } else {
        this.circleIcon.replaceChildren()
      }
    }
    if (this.circleText) {
      this.circleText.hidden = !showText
      this.circleValue!.hidden = slotHas || indeterminate || !!iconName
      this.circleValue!.textContent = `${Math.round(percent)}%`
    }
    this.applyAriaLabel(this.circle, 'label')
    if (indeterminate) this.circle.removeAttribute('aria-valuenow')
    else this.circle.setAttribute('aria-valuenow', String(value))
    this.circle.setAttribute('aria-valuemax', String(max))
  }

  /** 圆心状态图标名：slot > 图标 > 百分比 的优先级中返回图标名或 null */
  private statusIconName(status: string, percent: number, indeterminate: boolean, slotHas: boolean): string | null {
    if (indeterminate || slotHas) return null
    if (status === 'success') return 'check-circle'
    if (status === 'error') return 'close-circle'
    if (status === 'warning') return 'warning'
    if (!status && percent >= 100) return 'check-circle'
    return null
  }
}
