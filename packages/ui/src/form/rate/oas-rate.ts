import { OASElement } from '@oas-ui/core'
// 复用 oas-tooltip 作为逐星提示浮层（浅集成：virtual 点定位，确保其已注册）
import '../../feedback/tooltip/index.js'

const STAR = `
<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false">
  <path d="M8 2.4 L9.9 6.2 L14 6.8 L11 9.7 L11.6 13.8 L8 12 L4.4 13.8 L5 9.7 L2 6.8 L6.1 6.2 Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`

type RateSize = 'small' | 'medium' | 'large'
const VALID_RATE_SIZES: readonly RateSize[] = ['small', 'medium', 'large']
const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重，同控件惯例） */
function normalizeRateSize(raw: string): RateSize {
  if ((VALID_RATE_SIZES as readonly string[]).includes(raw)) return raw as RateSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-rate] 非法 size "${raw}"，已回落 medium；合法值：small/medium/large`)
  }
  return 'medium'
}

/** 预设色板名（映射 --oas-preset-* token，color/void-color/colors 支持按名引用；统一协议见 ui-spec §4.1） */
const RATE_COLOR_PRESETS =
  /^(magenta|red|volcano|orange|gold|lime|green|cyan|blue|geekblue|purple)$/

function resolveColorValue(raw: string): string {
  return RATE_COLOR_PRESETS.test(raw) ? `var(--oas-preset-${raw})` : raw
}

const warnedJson = new Set<string>()

/** JSON 数组属性解析（icons/colors）：空值返回 null；非法 JSON / 非数组忽略 + dev 告警（同值去重） */
function parseJsonArray(kind: string, raw: string): string[] | null {
  if (!raw.trim()) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!Array.isArray(v)) throw new Error('not an array')
    return v.filter((x): x is string => typeof x === 'string')
  } catch {
    const key = `${kind}:${raw}`
    if (!warnedJson.has(key)) {
      warnedJson.add(key)
      console.warn(`[oas-rate] 非法 ${kind} JSON 数组（应为字符串数组），已忽略`)
    }
    return null
  }
}

/** 星形图标内容源：html 字符串 / 克隆节点组 / 逐位命名插槽（三者互斥） */
type IconSource = { html?: string; nodes?: Node[]; slotName?: string }

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  /* 尺寸档位变量（宿主可直接覆盖做细调）：small=16 / medium=20（默认）/ large=28 */
  --oas-rate-star-size: 20px;
}
:host([data-size='small']) {
  --oas-rate-star-size: 16px;
}
:host([data-size='large']) {
  --oas-rate-star-size: 28px;
}
.rate {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.slider {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.star {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: var(--oas-rate-star-size);
  line-height: 1;
  color: var(--oas-rate-void, var(--oas-color-border));
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.star svg {
  width: 1em;
  height: 1em;
}
/* 部分填充：覆盖层叠加在基座图标上，clip-path 垂直分割保留左侧填充（激活色），
   右侧透出基座的未激活色 → 左亮右暗；填充宽度 = 小数部分（0.5 走 CSS 默认，其余内联覆盖） */
.star .half-fill {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  clip-path: inset(0 50% 0 0);
  color: var(--oas-rate-active, var(--oas-color-warning));
  pointer-events: none;
}
.star:hover {
  transform: scale(1.1);
}
.star.active {
  color: var(--oas-rate-active, var(--oas-color-warning));
}
.star:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: 2px;
}
:host([disabled]) .star,
:host([data-disabled]) .star {
  cursor: not-allowed;
  opacity: 0.7;
}
/* readonly：独立于 disabled——不变灰、不可交互但正常展示（值仍随表单体系提交） */
:host([data-readonly]) .star {
  cursor: default;
}
:host([data-readonly]) .star:hover {
  transform: none;
}
/* 右侧辅助信息（texts/show-text、show-score 数值模板） */
.text {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
}
.text:empty {
  display: none;
}
`

export class OASRate extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'max',
      'disabled',
      'allow-half',
      'allow-clear',
      'icon',
      'disabled-skip',
      'readonly',
      'size',
      'color',
      'void-color',
      'colors',
      'texts',
      'show-text',
      'show-score',
      'score-template',
      'void-icon',
      'icons',
      'highlight-selected-only',
      'tooltips',
    ]
  }

  private slider: HTMLElement | null = null
  private textEl: HTMLElement | null = null
  private iconSlot: HTMLSlotElement | null = null
  private voidSlot: HTMLSlotElement | null = null
  private starEls: HTMLElement[] = []
  /** hover 填充预览值（null = 未悬停）；预览不提交 value */
  private hoverValue: number | null = null
  /** 触屏拖拽状态：dragging 进行中 / dragMoved 越过 slop 阈值 / suppressClick 吞掉拖拽后的合成 click */
  private dragging = false
  private dragMoved = false
  private dragStartX = 0
  private suppressClick = false
  /** icons / colors property 通道（优先于同名 JSON 属性） */
  private iconsProp: string[] | null = null
  private colorsProp: string[] | null = null

  /** 逐值符号 property 通道：el.icons = ['😞','😐','😄']（优先于 icons 属性；非数组静默忽略） */
  get icons(): string[] | null {
    return this.iconsProp
  }

  set icons(v: string[] | null) {
    this.iconsProp = normalizeStringArray(v)
    if (this.hasRendered) this.runUpdateAndNotify()
  }

  /** 分段阈值色 property 通道：el.colors = ['#f50','#faad14','#52c41a']（优先于 colors 属性；非数组静默忽略） */
  get colors(): string[] | null {
    return this.colorsProp
  }

  set colors(v: string[] | null) {
    this.colorsProp = normalizeStringArray(v)
    if (this.hasRendered) this.runUpdateAndNotify()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="rate">
        <span class="slider" part="slider" role="slider" tabindex="0" aria-valuemin="0">
          <slot name="icon" style="display:none" aria-hidden="true"></slot>
          <slot name="void-icon" style="display:none" aria-hidden="true"></slot>
        </span>
        <span class="text" part="text" aria-hidden="true"></span>
      </span>
    `
  }

  /** 缓存节点引用 + 绑定键盘/指针/图标 slot 事件 + 接管快照已有星星（render 与水合路径共用） */
  private bind(): void {
    this.slider = this.shadow.querySelector('.slider')
    this.textEl = this.shadow.querySelector('.text')
    this.iconSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="icon"]')
    this.voidSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="void-icon"]')
    // 水合接管：SSR 快照已含星形（update 在 SSR 端渲染过），采纳并补绑事件，避免 ensureStars 重复追加
    if (this.slider) {
      const existing = [...this.slider.querySelectorAll<HTMLElement>(':scope > .star')]
      existing.forEach((star, idx) => {
        this.attachStar(star, idx + 1)
        this.starEls.push(star)
      })
      // hover 预览离开组件边界 → 回落已提交值
      this.slider.addEventListener('mouseleave', () => this.onSliderLeave())
      this.slider.addEventListener('keydown', (e: KeyboardEvent) => {
        if (!this.isInteractive()) return
        const max = this.maxValue()
        // allow-half：键盘步进 0.5（交互步进固定 0.5）
        const step = this.hasAttr('allow-half') ? 0.5 : 1
        let value = this.currentValue()
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') value = Math.min(value + step, max)
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') value = Math.max(value - step, 0)
        else if (e.key === 'Home') value = 0
        else if (e.key === 'End') value = max
        else return
        e.preventDefault()
        this.setValue(Math.round(value * 2) / 2)
      })
      // 触屏拖拽滑选（pointer 手势连续取值；桌面鼠标走 hover 预览/click 路径）
      this.slider.addEventListener('pointerdown', (e) => this.onPointerDown(e as PointerEvent))
      this.slider.addEventListener('pointermove', (e) => this.onPointerMove(e as PointerEvent))
      this.slider.addEventListener('pointerup', () => this.endDrag())
      this.slider.addEventListener('pointercancel', () => this.endDrag())
      // 拖拽结束后的合成 click 吞掉一次（防 allow-clear 把拖拽结果误清空）
      this.slider.addEventListener(
        'click',
        (e) => {
          if (!this.suppressClick) return
          this.suppressClick = false
          e.stopPropagation()
        },
        true,
      )
    }
    // 图标 slot 内容变化时重绘每颗星的图标
    this.iconSlot?.addEventListener('slotchange', () => this.update())
    this.voidSlot?.addEventListener('slotchange', () => this.update())
    // 逐位插槽（slot="icon-N"）在 light DOM 侧增删时驱动重绘（插槽元素在星内动态创建，无 slotchange 可依）
    const mo = new MutationObserver(() => this.update())
    mo.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'] })
    this.onCleanup(() => mo.disconnect())
  }

  /** 单星事件绑定：click（半区判定）/ mouseenter + mousemove（hover 预览 + 逐星 tooltip） */
  private attachStar(star: HTMLElement, idx: number): void {
    star.addEventListener('click', (e) => this.onStarClick(idx, e as MouseEvent))
    star.addEventListener('mouseenter', (e) => this.onStarHover(idx, e as MouseEvent))
    star.addEventListener('mousemove', (e) => this.onStarHover(idx, e as MouseEvent))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（slider 容器与图标 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.slider')) return false
    if (!this.shadow.querySelector('slot[name="icon"]')) return false
    if (!this.shadow.querySelector('slot[name="void-icon"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.slider) return
    const max = this.maxValue()
    const value = this.currentValue()
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入），并镜像到宿主
    const disabled = this.injectDisabled()
    // readonly 独立于 disabled：不变灰、不响应交互，值正常展示（仍随表单体系提交）
    const readonly = this.hasAttr('readonly')
    this.toggleAttribute('data-disabled', disabled)
    this.toggleAttribute('data-readonly', readonly)
    const sizeRaw = this.getAttr('size', '')
    this.setAttribute('data-size', sizeRaw === '' ? 'medium' : normalizeRateSize(sizeRaw))
    this.slider.setAttribute('aria-disabled', String(disabled))
    if (readonly) this.slider.setAttribute('aria-readonly', 'true')
    else this.slider.removeAttribute('aria-readonly')

    this.ensureStars(max)

    const display = this.displayValue()
    this.syncColors(display, max)
    this.applyIcons()
    this.syncStars()
    this.syncText(display)

    this.slider.setAttribute('aria-valuemax', String(max))
    // aria 反映已提交值（hover 预览仅为视觉态）
    this.slider.setAttribute('aria-valuenow', String(value))
    this.slider.setAttribute('aria-label', this.t('rate.rate'))
    const texts = this.textsList()
    const valuetext = texts.length ? texts[Math.ceil(value) - 1] : undefined
    if (valuetext != null) this.slider.setAttribute('aria-valuetext', valuetext)
    else this.slider.removeAttribute('aria-valuetext')

    this.reconcileTooltip()
  }

  /** 星数变化时增量增删星星；事件只绑定一次 */
  private ensureStars(max: number): void {
    if (!this.slider) return
    while (this.starEls.length < max) {
      const idx = this.starEls.length + 1
      const star = document.createElement('span')
      star.className = 'star'
      star.setAttribute('part', 'star')
      star.tabIndex = -1
      this.attachStar(star, idx)
      this.slider.appendChild(star)
      this.starEls.push(star)
    }
    while (this.starEls.length > max) {
      const star = this.starEls.pop()
      star?.remove()
    }
  }

  /** 交互可用：非 disabled（含注入）且非 readonly */
  private isInteractive(): boolean {
    return !this.injectDisabled() && !this.hasAttr('readonly')
  }

  private onStarClick(idx: number, e: MouseEvent): void {
    if (!this.isInteractive()) return
    let v = idx
    // allow-half：按点击位置半区判定（左半 = idx-0.5，右半 = idx）
    if (this.hasAttr('allow-half')) v = this.halfAwareValue(idx, e)
    // allow-clear（默认 true）：点击得到与当前值相同的结果时清空为 0
    if (this.allowClear() && v === this.currentValue()) {
      this.setValue(0)
    } else {
      this.setValue(v)
    }
  }

  /** 半区判定：clientX 落在星左半（含中点）取 idx-0.5，右半取 idx */
  private halfAwareValue(idx: number, e: MouseEvent): number {
    const star = this.starEls[idx - 1]
    if (!star) return idx
    const rect = star.getBoundingClientRect()
    return e.clientX <= rect.left + rect.width / 2 ? idx - 0.5 : idx
  }

  /** hover 填充预览：mouseenter / mousemove（allow-half 半区重算）；预览不提交 value */
  private onStarHover(idx: number, e: MouseEvent): void {
    if (!this.isInteractive()) return
    let v = idx
    if (this.hasAttr('allow-half')) v = this.halfAwareValue(idx, e)
    if (this.hoverValue === v) return
    this.hoverValue = v
    this.emit('hover', { value: v })
    this.showTip(idx)
    this.update()
  }

  private onSliderLeave(): void {
    if (this.hoverValue === null) return
    this.hoverValue = null
    this.emit('hover', { value: null })
    this.hideTip()
    this.update()
  }

  /** 点击清空是否开启：默认 true，allow-clear="false" 关闭 */
  private allowClear(): boolean {
    return this.getAttr('allow-clear', 'true') !== 'false'
  }

  private currentValue(): number {
    return Number(this.getAttr('value', '0')) || 0
  }

  private maxValue(): number {
    return Number(this.getAttr('max', '5')) || 5
  }

  /** 展示值：hover 预览优先于已提交值（预览盖过 value 显示） */
  private displayValue(): number {
    return this.hoverValue ?? this.currentValue()
  }

  /**
   * 归一化展示值：allow-half 或 readonly 下保留小数（半星/任意小数覆盖层）；
   * 其余场景小数按整星（floor）——与「点击仍整星递增」的交互契约一致。
   */
  private normalizedDisplay(): number {
    const v = this.displayValue()
    return this.hasAttr('allow-half') || this.hasAttr('readonly') ? v : Math.floor(v)
  }

  /** 第 i 星（1-based）填充量 0~1：默认连续填充；highlight-selected-only 仅选中那颗点亮 */
  private fillFor(i: number, value: number): number {
    if (value <= 0) return 0
    if (this.hasAttr('highlight-selected-only')) {
      return i === Math.ceil(value) ? Math.min(Math.max(value - (i - 1), 0), 1) : 0
    }
    return Math.min(Math.max(value - (i - 1), 0), 1)
  }

  private setValue(v: number): void {
    // 值无变化不派发（如 allow-clear=false 时点击已选中的星为 no-op）
    if (this.currentValue() === v) return
    this.setAttribute('value', String(v))
    this.emit('change', { value: v })
  }

  // ===== 图标管线 =====

  /** 第 i 星（1-based）选中态内容源：icons[i] > slot="icon-i" > icon 属性 > slot="icon" > 默认星形 */
  private resolveFullIcon(i: number): IconSource {
    const icons = this.iconsList()
    const entry = icons[i - 1]
    if (entry != null) return { html: entry }
    if (this.querySelector(`:scope > [slot="icon-${i}"]`)) return { slotName: `icon-${i}` }
    const attrIcon = this.getAttr('icon')
    if (attrIcon) return { html: attrIcon }
    const nodes = this.iconSlot ? this.iconSlot.assignedNodes() : []
    if (nodes.length) return { nodes }
    return { html: STAR }
  }

  /** 未选中态内容源：void-icon 属性 > slot="void-icon" > null（未定制时全态同图标，仅颜色区分） */
  private resolveVoidIcon(): IconSource | null {
    const attrVoid = this.getAttr('void-icon')
    if (attrVoid) return { html: attrVoid }
    const nodes = this.voidSlot ? this.voidSlot.assignedNodes() : []
    if (nodes.length) return { nodes }
    return null
  }

  private setStarContent(star: HTMLElement, src: IconSource): void {
    if (src.slotName) {
      star.innerHTML = `<slot name="${src.slotName}"></slot>`
      return
    }
    if (src.nodes) {
      star.innerHTML = ''
      const frag = document.createDocumentFragment()
      for (const node of src.nodes) frag.appendChild(node.cloneNode(true))
      star.appendChild(frag)
      return
    }
    star.innerHTML = src.html ?? STAR
  }

  /** 逐星应用图标：选中星用选中态图标，未选中/半星基座用 void 图标（未定制 void 时同源） */
  private applyIcons(): void {
    const value = this.normalizedDisplay()
    const voidSrc = this.resolveVoidIcon()
    this.starEls.forEach((star, idx) => {
      const fill = this.fillFor(idx + 1, value)
      const src = voidSrc && fill < 1 ? voidSrc : this.resolveFullIcon(idx + 1)
      this.setStarContent(star, src)
    })
  }

  private syncStars(): void {
    const value = this.normalizedDisplay()
    this.starEls.forEach((star, idx) => {
      const fill = this.fillFor(idx + 1, value)
      star.classList.toggle('active', fill >= 1)
      if (fill > 0 && fill < 1) {
        star.classList.add('half')
        this.applyHalfFill(star, fill)
      } else {
        star.classList.remove('half')
        this.removeHalfFill(star)
      }
    })
  }

  /**
   * 部分填充覆盖层：选中态图标叠加 clip-path 后只露出左侧填充段（激活色），
   * 填充宽度 = 小数部分（0.5 走 CSS 默认 50%，其余内联覆盖支持任意小数展示）。
   */
  private applyHalfFill(star: HTMLElement, fill: number): void {
    const i = this.starEls.indexOf(star) + 1
    let fillEl = star.querySelector<HTMLElement>('.half-fill')
    if (!fillEl) {
      fillEl = document.createElement('span')
      fillEl.className = 'half-fill'
      fillEl.setAttribute('aria-hidden', 'true')
      star.appendChild(fillEl)
    }
    const src = this.resolveFullIcon(i)
    if (src.slotName) {
      // 覆盖层不能复用同命 slot（一名一投影）：克隆该插槽已分配节点
      fillEl.innerHTML = ''
      const slotEl = star.querySelector<HTMLSlotElement>(`slot[name="${src.slotName}"]`)
      for (const node of slotEl?.assignedNodes() ?? []) fillEl.appendChild(node.cloneNode(true))
    } else if (src.nodes) {
      fillEl.innerHTML = ''
      const frag = document.createDocumentFragment()
      for (const node of src.nodes) frag.appendChild(node.cloneNode(true))
      fillEl.appendChild(frag)
    } else {
      fillEl.innerHTML = src.html ?? STAR
    }
    if (fill === 0.5) fillEl.style.removeProperty('clip-path')
    else fillEl.style.clipPath = `inset(0 ${Math.round((1 - fill) * 100)}% 0 0)`
  }

  private removeHalfFill(star: HTMLElement): void {
    star.querySelector('.half-fill')?.remove()
  }

  // ===== 颜色 =====

  /** colors 分段阈值色（均分分段）：返回当前分值所处段的颜色（值 0 无激活星返回 null） */
  private segmentColor(v: number, max: number, colors: string[]): string | null {
    if (v <= 0) return null
    const n = colors.length
    for (let i = 1; i < n; i++) {
      if (v <= (max * i) / n) return colors[i - 1]!
    }
    return colors[n - 1] ?? null
  }

  /** 激活/未激活色注入：colors 分段 > color 属性 > 默认 token（预设名映射 --oas-preset-*） */
  private syncColors(display: number, max: number): void {
    const segs = this.colorsList()
    let active = ''
    if (segs.length) {
      const seg = this.segmentColor(display, max, segs)
      if (seg) active = resolveColorValue(seg)
    }
    if (!active) {
      const colorAttr = this.getAttr('color')
      if (colorAttr) active = resolveColorValue(colorAttr)
    }
    if (active) this.style.setProperty('--oas-rate-active', active)
    else this.style.removeProperty('--oas-rate-active')
    const voidRaw = this.getAttr('void-color')
    if (voidRaw) this.style.setProperty('--oas-rate-void', resolveColorValue(voidRaw))
    else this.style.removeProperty('--oas-rate-void')
  }

  // ===== 辅助文案 / 数值模板 =====

  private syncText(display: number): void {
    if (!this.textEl) return
    let text = ''
    if (this.hasAttr('show-score')) {
      const tpl = this.getAttr('score-template', '{value}')
      text = tpl.split('{value}').join(this.formatScore(display))
    } else if (this.hasAttr('show-text')) {
      text = this.textsList()[Math.ceil(display) - 1] ?? ''
    }
    this.textEl.textContent = text
  }

  private scoreFormatter: Intl.NumberFormat | null = null

  /** 分值格式化走 Intl（ui-spec §3：数字一律 Intl，不手写） */
  private formatScore(v: number): string {
    this.scoreFormatter ??= new Intl.NumberFormat()
    return this.scoreFormatter.format(v)
  }

  private textsList(): string[] {
    return splitList(this.getAttr('texts'))
  }

  private tooltipsList(): string[] {
    return splitList(this.getAttr('tooltips'))
  }

  private iconsList(): string[] {
    return this.iconsProp ?? parseJsonArray('icons', this.getAttr('icons')) ?? []
  }

  private colorsList(): string[] {
    return this.colorsProp ?? parseJsonArray('colors', this.getAttr('colors')) ?? []
  }

  // ===== 逐星 tooltip（oas-tooltip 浅集成：virtual 点定位） =====

  /** 按需挂/解 oas-tooltip（幂等）：配置 tooltips 且可交互时挂，移除配置/不可交互时拆——零孤儿浮层 */
  private reconcileTooltip(): void {
    const want = this.tooltipsList().length > 0 && this.isInteractive()
    const tip = this.shadow.querySelector('oas-tooltip')
    if (want && !tip) {
      const t = document.createElement('oas-tooltip')
      t.setAttribute('virtual', '')
      t.setAttribute('placement', 'top')
      this.shadow.appendChild(t)
    } else if (!want && tip) {
      tip.remove()
    }
  }

  /** 悬停第 idx 星：tooltip 锚到星顶部中心（virtual 视口坐标点） */
  private showTip(idx: number): void {
    const tip = this.shadow.querySelector<HTMLElement>('oas-tooltip')
    const content = this.tooltipsList()[idx - 1]
    if (!tip || content == null) return
    const rect = this.starEls[idx - 1]?.getBoundingClientRect()
    if (!rect) return
    tip.setAttribute('content', content)
    tip.setAttribute('virtual-x', String(rect.left + rect.width / 2))
    tip.setAttribute('virtual-y', String(rect.top))
    tip.setAttribute('open', '')
  }

  private hideTip(): void {
    this.shadow.querySelector('oas-tooltip')?.removeAttribute('open')
  }

  // ===== 触屏拖拽滑选 =====

  /** 拖拽启动 slop 阈值（px）：阈值内的微动视为 tap，交给 click 路径（含 allow-clear） */
  private static readonly DRAG_SLOP = 4

  private onPointerDown(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || !this.isInteractive()) return
    // 新手势开始：清掉上一轮拖拽可能残留的 click 吞没标记（有的浏览器拖拽后不派发合成 click）
    this.suppressClick = false
    this.dragging = true
    this.dragMoved = false
    this.dragStartX = e.clientX
    try {
      if (typeof this.slider?.setPointerCapture === 'function') {
        this.slider.setPointerCapture(e.pointerId)
      }
    } catch {
      // 捕获失败不影响拖拽取值（事件仍冒泡到 slider）
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return
    if (Math.abs(e.clientX - this.dragStartX) < OASRate.DRAG_SLOP) return
    this.dragMoved = true
    const v = this.valueFromX(e.clientX)
    if (v != null && v !== this.currentValue()) this.setValue(v)
  }

  private endDrag(): void {
    if (!this.dragging) return
    this.dragging = false
    if (this.dragMoved) this.suppressClick = true
  }

  /** 由指针 x 坐标折算分值：滑出首星左侧为 0；allow-half 按星内半区取 0.5 粒度 */
  private valueFromX(x: number): number | null {
    const rects = this.starEls.map((s) => s.getBoundingClientRect())
    if (!rects.length) return null
    const allowHalf = this.hasAttr('allow-half')
    if (x < rects[0]!.left) return 0
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]!
      if (x <= r.right || i === rects.length - 1) {
        return allowHalf && x <= r.left + r.width / 2 ? i + 0.5 : i + 1
      }
    }
    return null
  }
}

/** 逗号分隔列表属性解析：trim + 去空项 */
function splitList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** property 通道数组归一：仅接受非空字符串数组（宿主框架绑定为字符串等异型静默回落 null） */
function normalizeStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const list = v.filter((x): x is string => typeof x === 'string')
  return list.length ? list : null
}
