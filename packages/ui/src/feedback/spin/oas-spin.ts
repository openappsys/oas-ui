import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
/* block 块级：宿主占满一行，wrap 撑满宿主 */
:host([block]) {
  display: block;
}
:host([block]) .wrap {
  width: 100%;
}
.wrap {
  position: relative;
  display: inline-block;
}
.mask {
  position: absolute;
  inset: 0;
  background: var(--oas-spin-mask-bg, color-mix(in srgb, var(--oas-color-bg) 70%, transparent));
  display: none;
  z-index: 1;
}
.wrap.spinning .mask {
  display: block;
}
/* show-overlay="false"：包裹态关闭遮罩（写在 spinning 规则之后以同特异性取胜） */
.wrap.no-overlay .mask {
  display: none;
}
/* fullscreen：fixed 全屏遮罩 + 内容居中；z-index 走变量开口 */
:host([fullscreen]) .wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--oas-spin-z-index, 3500);
}
/* 全屏下 body 不再绝对居中（wrap 已 flex 居中） */
:host([fullscreen]) .wrap > .body {
  position: static;
  transform: none;
}
/* body：指示器与 tip 文案的布局容器（tip-position 控制排布方向） */
.wrap > .body {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
}
.wrap.spinning > .body,
.wrap.empty > .body {
  display: flex;
}
/* 独立态（未包裹内容）：body 随内容自然排版 */
.wrap.empty > .body {
  display: inline-flex;
  position: static;
}
/* 包裹态：body 绝对居中盖在内容上 */
.wrap:not(.empty) > .body {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  flex-direction: column;
}
.body[data-tip-position='above'] { flex-direction: column-reverse; }
.body[data-tip-position='below'] { flex-direction: column; }
.body[data-tip-position='before'] { flex-direction: row-reverse; }
.body[data-tip-position='after'] { flex-direction: row; }
.wrap.hide-icon .indicator {
  display: none;
}
.indicator {
  display: inline-block;
  flex: none;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  border: var(--oas-spin-border-width, 3px) solid var(--oas-spin-track-color, var(--oas-color-bg-hover));
  border-top-color: var(--oas-spin-indicator-color, var(--oas-color-primary));
  border-radius: 50%;
  animation: oas-spin-rotate var(--oas-spin-duration, 0.8s) linear infinite;
}
/* inherit-color：指示色继承宿主文字色（属性级开关，优先于变量开口） */
:host([inherit-color]) .wrap .indicator {
  border-top-color: currentcolor;
}
:host([inherit-color]) .wrap .indicator .dots i,
:host([inherit-color]) .wrap .indicator .bars i {
  background: currentcolor;
}
/* 五档尺寸：xs/small/medium/large/xl；旧缩写 sm/md/lg 保留别名兼容（CSS 两组选择器并存） */
.indicator[data-size='xs'] { width: var(--oas-control-height-xs); height: var(--oas-control-height-xs); border-width: var(--oas-spin-border-width, 2px); }
.indicator[data-size='sm'],
.indicator[data-size='small'] { width: var(--oas-control-height-sm); height: var(--oas-control-height-sm); border-width: var(--oas-spin-border-width, 2px); }
.indicator[data-size='md'],
.indicator[data-size='medium'] { width: var(--oas-control-height-md); height: var(--oas-control-height-md); }
.indicator[data-size='lg'],
.indicator[data-size='large'] { width: var(--oas-control-height-lg); height: var(--oas-control-height-lg); }
.indicator[data-size='xl'] { width: var(--oas-control-height-xl); height: var(--oas-control-height-xl); }
/* dot 点状形态：三点脉冲错峰（尺寸沿用 size 体系，容器填满 indicator） */
.indicator .dots {
  display: none;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 12%;
}
.indicator[data-variant='dot'] {
  border: none;
  animation: none;
}
.indicator[data-variant='dot'] .dots {
  display: inline-flex;
}
.dots i {
  flex: none;
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--oas-spin-indicator-color, var(--oas-color-primary));
  animation: oas-spin-dot var(--oas-spin-duration, 0.8s) ease-in-out infinite;
}
.dots i:nth-child(2) { animation-delay: calc(var(--oas-spin-duration, 0.8s) * 0.2); }
.dots i:nth-child(3) { animation-delay: calc(var(--oas-spin-duration, 0.8s) * 0.4); }
/* bars 条状形态：三竖条伸缩错峰 */
.indicator .bars {
  display: none;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 16%;
}
.indicator[data-variant='bars'] {
  border: none;
  animation: none;
}
.indicator[data-variant='bars'] .bars {
  display: inline-flex;
}
.bars i {
  flex: none;
  width: 16%;
  height: 100%;
  border-radius: 999px;
  background: var(--oas-spin-indicator-color, var(--oas-color-primary));
  animation: oas-spin-bar var(--oas-spin-duration, 0.8s) ease-in-out infinite;
}
.bars i:nth-child(2) { animation-delay: calc(var(--oas-spin-duration, 0.8s) * 0.15); }
.bars i:nth-child(3) { animation-delay: calc(var(--oas-spin-duration, 0.8s) * 0.3); }
/* percent determinate：SVG 进度环取代一切形态（icon 插槽优先级更高，见 custom-icon 规则） */
.indicator .progress {
  display: none;
  width: 100%;
  height: 100%;
}
.indicator.determinate {
  border: none;
  animation: none;
}
/* determinate 规则置于 variant 规则之后：percent 覆盖 dot/bars 形态 */
.indicator.determinate .dots,
.indicator.determinate .bars {
  display: none;
}
.indicator.determinate .progress {
  display: block;
}
.indicator.custom-icon .progress {
  display: none;
}
.progress circle {
  fill: none;
}
.progress .progress-track {
  stroke: var(--oas-spin-track-color, var(--oas-color-bg-hover));
  stroke-width: var(--oas-spin-border-width, 3px);
}
.progress .progress-bar {
  stroke: var(--oas-spin-indicator-color, var(--oas-color-primary));
  stroke-width: var(--oas-spin-border-width, 3px);
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset var(--oas-transition-base) var(--oas-ease-out);
}
:host([inherit-color]) .wrap .indicator .progress .progress-bar {
  stroke: currentcolor;
}
/* 自定义指示器：icon 插槽分配时隐藏默认环，尺寸由内容自带（档位 w/h 与边框全部让位） */
.indicator .custom {
  display: none;
  line-height: 0;
}
.indicator.custom-icon,
.indicator.global-icon {
  border: none;
  animation: none;
  width: auto;
  height: auto;
  background: none;
}
.indicator.custom-icon .custom,
.indicator.global-icon .custom {
  display: inline-flex;
}
/* rotate 属性只作用于自定义指示器（默认环恒旋转；gif/静态 SVG 不写即静止） */
.custom[data-rotate] {
  animation: oas-spin-rotate var(--oas-spin-duration, 0.8s) linear infinite;
}
/* tip 加载文案：属性纯文本走 tip-text，富内容走具名 tip 插槽（插槽优先） */
.tip {
  display: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
}
.tip.has-tip {
  display: block;
}
.tip-text {
  white-space: nowrap;
}
@keyframes oas-spin-rotate {
  to { transform: rotate(360deg); }
}
@keyframes oas-spin-dot {
  0%, 100% { opacity: 0.35; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes oas-spin-bar {
  0%, 100% { transform: scaleY(0.4); opacity: 0.55; }
  50% { transform: scaleY(1); opacity: 1; }
}
/* 读屏可读文本：视觉隐藏但保留在可访问树（role=status 播报内容） */
.vh {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
/* prefers-reduced-motion 降级：旋转/脉冲动画停用（静态显示指示器形态） */
@media (prefers-reduced-motion: reduce) {
  .indicator,
  .custom[data-rotate],
  .dots i,
  .bars i {
    animation: none;
  }
}
/* paused 属性：冻结一切循环动画（保留当前帧，与 reduced-motion 的回初态不同） */
:host([paused]) .wrap .indicator,
:host([paused]) .wrap .custom[data-rotate],
:host([paused]) .wrap .dots i,
:host([paused]) .wrap .bars i {
  animation-play-state: paused;
}
`

/** 五档 + 旧缩写别名统一归一化为全拼（sm→small、md→medium、lg→large） */
const SPIN_SIZE_ALIASES: Record<string, string> = {
  xs: 'xs',
  sm: 'small',
  small: 'small',
  md: 'medium',
  medium: 'medium',
  lg: 'large',
  large: 'large',
  xl: 'xl',
}

/** 纯数字尺寸（按 px 解释），不允许负值 */
const SIZE_NUM_RE = /^\d+(?:\.\d+)?$/
/** 常见 CSS 长度单位（不允许负值） */
const SIZE_UNIT_RE = /^\d+(?:\.\d+)?(?:px|rem|em|%|vw|vh|vmin|vmax|ch|ex|cm|mm|q|in|pt|pc)$/

/** 非法 size 告警去重（同值只警一次，与 button 族惯例一致） */
const warnedSpinSizes = new Set<string>()

/** variant 白名单与非法值告警去重 */
const SPIN_VARIANTS = new Set(['ring', 'dot', 'bars'])
const warnedSpinVariants = new Set<string>()

/** percent determinate 进度环：viewBox 48×48、r=21 的圆周长 */
const SPIN_CIRCUMFERENCE = 2 * Math.PI * 21

/** 'auto' 模拟进度的推进节拍与上限 */
const AUTO_TICK_MS = 500
const AUTO_CEILING = 90

/** 非法 percent 告警去重 */
const warnedSpinPercents = new Set<string>()

/** 全局默认指示器 HTML（受控常量：宿主代码经 setDefaultIndicator 注册，null 恢复内置环） */
let globalIndicatorHtml: string | null = null

/** variant 解析：ring（默认，边框环）/dot（三点脉冲）/bars（三条伸缩）；非法值回落 ring + 告警一次 */
function parseSpinVariant(raw: string): string {
  if (raw === '') return 'ring'
  if (SPIN_VARIANTS.has(raw)) return raw
  if (!warnedSpinVariants.has(raw)) {
    warnedSpinVariants.add(raw)
    console.warn(`[oas-spin] 非法 variant "${raw}"，已回落 ring；合法值：ring/dot/bars`)
  }
  return 'ring'
}

type SpinSize =
  | { kind: 'tier'; value: string } // 归一化档位名（走 data-size 档位 CSS）
  | { kind: 'custom'; value: string } // 任意 CSS 尺寸（走内联 width/height）
  | { kind: 'invalid'; raw: string } // 非法（回落 medium + console.warn 一次）

/** size 解析：档位命名 → 任意 CSS 尺寸（纯数字按 px / 带单位直取 / calc()）→ 非法回落 */
function parseSpinSize(raw: string): SpinSize {
  if (raw === '') return { kind: 'tier', value: 'medium' }
  const tier = SPIN_SIZE_ALIASES[raw]
  if (tier) return { kind: 'tier', value: tier }
  if (SIZE_NUM_RE.test(raw)) return { kind: 'custom', value: `${raw}px` }
  if (SIZE_UNIT_RE.test(raw)) return { kind: 'custom', value: raw }
  if (raw.trim().startsWith('calc(')) return { kind: 'custom', value: raw }
  return { kind: 'invalid', raw }
}

export class OASSpin extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'size',
      'spinning',
      'delay',
      'tip',
      'tip-position',
      'hide-icon',
      'rotate',
      'show-overlay',
      'aria-label',
      'fullscreen',
      'variant',
      'percent',
      // 以下为纯 CSS 响应属性（:host 属性选择器），列出以保证 API 表完整与增量更新
      'paused',
      'inherit-color',
      'block',
    ]
  }

  /** delay 防闪烁定时器（spinning 置位后延迟激活视觉，断开连接时清理） */
  private delayTimer: ReturnType<typeof setTimeout> | null = null
  /** 上次 update 的 spinning/delay 快照：仅这两者变化时重调度 timer，其余属性变化不打断计时 */
  private prevSpinning = false
  private prevDelay = -1
  /** 视觉激活态（spinning 经 delay 后的真实显示状态），auto 进度推进以此为前提 */
  private active = false
  /** percent='auto' 模拟进度的当前值与推进定时器 */
  private autoPercent = 0
  private autoTimer: ReturnType<typeof setInterval> | null = null
  /** percent 属性是否为 'auto'（模拟进度模式标记） */
  private isAutoPercent = false

  /**
   * 注册全局默认指示器：此后新建的 oas-spin 在未用 icon 插槽时渲染注册的 HTML
   * 替代内置环（品牌加载动画场景）。传 null/'' 恢复内置环。
   * 优先级：icon 插槽 > 全局默认 > 内置环；rotate 属性对全局默认同样生效。
   * SSR 提示：模板为纯函数读取注册值，服务端渲染前注册可保证快照一致，
   * 前后端注册不一致时按水合回退路径全量重建（行为正确，仅多一次重建）。
   */
  static setDefaultIndicator(html: string | null): void {
    globalIndicatorHtml = html != null && html !== '' ? html : null
  }

  /**
   * 命令式全屏加载：创建 fullscreen + spinning 实例挂到 body，返回 close 句柄。
   * 可多次调用叠用（多个句柄各自关闭）；SSR/Node 环境不可用（抛错防静默失效）。
   * 已知限制：fixed 定位在宿主祖先链有 transform/filter 时会改为相对该祖先（containing block 陷阱）。
   */
  static fullscreen(options?: { tip?: string; delay?: number }): { close(): void } {
    if (typeof document === 'undefined') {
      throw new Error('[oas-spin] fullscreen() 仅在浏览器环境可用（SSR 请用声明式标记）')
    }
    const el = new OASSpin()
    el.setAttribute('fullscreen', '')
    el.setAttribute('spinning', '')
    if (options?.tip != null && options.tip !== '') el.setAttribute('tip', options.tip)
    if (options?.delay != null && options.delay > 0) el.setAttribute('delay', String(options.delay))
    document.body.appendChild(el)
    return {
      close: () => {
        el.remove()
      },
    }
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap">
        <div class="mask" part="mask"></div>
        <slot></slot>
        <div class="body" part="body" data-tip-position="below">
          <span class="indicator" part="indicator" data-size="${this.templateSize()}" data-variant="ring" role="status">
            <span class="dots" part="dots"><i></i><i></i><i></i></span>
            <span class="bars" part="bars"><i></i><i></i><i></i></span>
            <svg class="progress" part="progress" viewBox="0 0 48 48" aria-hidden="true">
              <circle class="progress-track" part="progress-track" cx="24" cy="24" r="21"></circle>
              <circle class="progress-bar" part="progress-bar" cx="24" cy="24" r="21" vector-effect="non-scaling-stroke"></circle>
            </svg>
            <span class="custom" part="custom"><slot name="icon"></slot>${globalIndicatorHtml != null ? `<span class="g-indicator" part="global-icon">${globalIndicatorHtml}</span>` : ''}</span>
            <span class="vh" part="label"></span>
          </span>
          <div class="tip" part="tip">
            <slot name="tip"></slot>
            <span class="tip-text" part="tip-text" hidden></span>
          </div>
        </div>
      </div>
    `
  }

  /** SSR 首帧 data-size：档位归一化名，任意值/非法为 custom/medium（客户端 update 修正内联尺寸） */
  private templateSize(): string {
    const parsed = parseSpinSize(this.getAttr('size', 'md'))
    if (parsed.kind === 'tier') return parsed.value
    if (parsed.kind === 'custom') return 'custom'
    return 'medium'
  }

  /** size 应用：档位走 data-size（CSS 档位选择器），任意值走内联宽高（data-size=custom） */
  private applySize(indicator: HTMLElement): void {
    const parsed = parseSpinSize(this.getAttr('size', 'md'))
    if (parsed.kind === 'invalid') {
      if (!warnedSpinSizes.has(parsed.raw)) {
        warnedSpinSizes.add(parsed.raw)
        console.warn(
          `[oas-spin] 非法 size "${parsed.raw}"，已回落 medium；合法值：xs/small/medium/large/xl 档位，或 CSS 尺寸（28 / 28px / 2rem / calc()）`,
        )
      }
      indicator.setAttribute('data-size', 'medium')
      indicator.style.removeProperty('width')
      indicator.style.removeProperty('height')
      return
    }
    if (parsed.kind === 'tier') {
      indicator.setAttribute('data-size', parsed.value)
      indicator.style.removeProperty('width')
      indicator.style.removeProperty('height')
      return
    }
    indicator.setAttribute('data-size', 'custom')
    indicator.style.setProperty('width', parsed.value)
    indicator.style.setProperty('height', parsed.value)
  }

  /** 插槽变化同步（默认插槽影响 empty 态、tip/icon 插槽影响文案与形态）；注册 timer 清理 */
  private bind(): void {
    this.shadow.querySelector('slot')?.addEventListener('slotchange', () => this.update())
    this.shadow.querySelector('slot[name="tip"]')?.addEventListener('slotchange', () => this.update())
    this.shadow.querySelector('slot[name="icon"]')?.addEventListener('slotchange', () => this.update())
    this.onCleanup(() => {
      this.clearDelayTimer()
      this.clearAutoTimer()
      this.autoPercent = 0
      // 快照失效：重连后首个 update 重新走状态机（恢复 delay 计时）
      this.prevSpinning = false
      this.prevDelay = -1
    })
  }

  private clearAutoTimer(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer)
      this.autoTimer = null
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（wrap 容器与 indicator 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="wrap"]')) return false
    if (!this.shadow.querySelector('[part="indicator"]')) return false
    this.bind()
    return true
  }

  /** 解析 delay 属性：正数毫秒有效，0/负数/非法值视为无延迟 */
  private parseDelay(): number {
    const n = Number(this.getAttr('delay', ''))
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  private clearDelayTimer(): void {
    if (this.delayTimer) {
      clearTimeout(this.delayTimer)
      this.delayTimer = null
    }
  }

  /** 视觉激活态（经 delay 防闪烁后）落到 wrap.spinning class；auto 模拟进度随之启停 */
  private setActive(active: boolean): void {
    this.active = active
    this.shadow.querySelector('[part="wrap"]')?.classList.toggle('spinning', active)
    this.syncAutoProgress()
  }

  protected override update(): void {
    const spinning = this.hasAttr('spinning')
    const delay = this.parseDelay()

    // 防闪烁状态机：spinning/delay 任一变化才重调度，避免无关属性更新打断计时
    if (spinning !== this.prevSpinning || delay !== this.prevDelay) {
      this.prevSpinning = spinning
      this.prevDelay = delay
      this.clearDelayTimer()
      if (spinning && delay > 0) {
        this.setActive(false)
        this.delayTimer = setTimeout(() => {
          this.delayTimer = null
          this.setActive(true)
        }, delay)
      } else {
        this.setActive(spinning)
      }
    }

    // aria-busy 是语义状态：随 spinning 立即同步，不等视觉 delay
    this.setAttribute('aria-busy', String(spinning))
    const wrap = this.shadow.querySelector('[part="wrap"]')
    if (wrap) {
      const hasContent = (
        this.shadow.querySelector('slot') as HTMLSlotElement | null
      )?.assignedNodes().length
        ? true
        : false
      wrap.classList.toggle('empty', !hasContent)
      wrap.classList.toggle('hide-icon', this.hasAttr('hide-icon'))
      // show-overlay 默认开；显式 "false" 关闭包裹遮罩
      wrap.classList.toggle('no-overlay', this.getAttr('show-overlay', 'true') === 'false')
    }
    this.syncTip()
    const indicator = this.shadow.querySelector<HTMLElement>('[part="indicator"]')
    if (indicator) {
      const hasIcon = (
        this.shadow.querySelector('slot[name="icon"]') as HTMLSlotElement | null
      )?.assignedNodes({ flatten: true }).length
        ? true
        : false
      indicator.classList.toggle('custom-icon', hasIcon)
      // 全局默认指示器仅在未用 icon 插槽时生效（插槽优先）
      indicator.classList.toggle('global-icon', !hasIcon && globalIndicatorHtml != null)
      this.applySize(indicator)
      indicator.setAttribute('data-variant', parseSpinVariant(this.getAttr('variant', 'ring')))
      // 读屏可访问名：宿主 aria-label 优先同步（覆盖内部兜底文本的播报）
      const hostLabel = this.getAttribute('aria-label')
      if (hostLabel != null && hostLabel !== '') indicator.setAttribute('aria-label', hostLabel)
      else indicator.removeAttribute('aria-label')
      this.syncPercent(indicator, hasIcon)
    }
    this.syncSrLabel()
    this.shadow
      .querySelector('[part="custom"]')
      ?.toggleAttribute('data-rotate', this.hasAttr('rotate'))
  }

  /**
   * percent determinate 同步：
   * - 数字 0-100（夹取）：SVG 进度环 + role=progressbar + aria 三件套
   * - 'auto'：视觉激活期间自动推进（上限 90，结束后冻结，再次激活从头推进）
   * - icon 插槽分配时 percent 让位（自定义指示器优先）
   * - 非法值忽略 + 告警一次
   */
  private syncPercent(indicator: HTMLElement, hasIcon: boolean): void {
    const raw = this.getAttr('percent', '')
    const bar = this.shadow.querySelector<SVGCircleElement>('[part="progress-bar"]')
    let isAuto = false
    let value = -1
    if (raw === 'auto') {
      isAuto = true
      // 模拟进度只在视觉激活期间有意义：未激活/延迟等待时保持 indeterminate 形态
      value = this.active ? this.autoPercent : -1
    } else if (raw !== '') {
      const n = Number(raw)
      if (Number.isFinite(n)) value = Math.min(100, Math.max(0, n))
      else if (!warnedSpinPercents.has(raw)) {
        warnedSpinPercents.add(raw)
        console.warn(`[oas-spin] 非法 percent "${raw}"，已忽略；合法值：0-100 数字或 "auto"`)
      }
    }
    const determinate = value >= 0 && !hasIcon
    indicator.classList.toggle('determinate', determinate)
    indicator.setAttribute('role', determinate ? 'progressbar' : 'status')
    if (!determinate) {
      indicator.removeAttribute('aria-valuemin')
      indicator.removeAttribute('aria-valuemax')
      indicator.removeAttribute('aria-valuenow')
    } else {
      indicator.setAttribute('aria-valuemin', '0')
      indicator.setAttribute('aria-valuemax', '100')
      indicator.setAttribute('aria-valuenow', String(Math.round(value)))
      if (bar) {
        bar.setAttribute('stroke-dasharray', String(SPIN_CIRCUMFERENCE))
        bar.setAttribute(
          'stroke-dashoffset',
          String(SPIN_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, value)) / 100)),
        )
      }
    }
    this.isAutoPercent = isAuto
    this.syncAutoProgress()
  }

  /** 'auto' 模拟进度启停：视觉激活且 percent='auto' 时推进，否则停表；冻结值保留 */
  private syncAutoProgress(): void {
    const shouldRun = this.isAutoPercent && this.active && this.isConnected
    if (shouldRun && !this.autoTimer) {
      this.autoTimer = setInterval(() => {
        this.autoPercent = Math.min(
          AUTO_CEILING,
          this.autoPercent + Math.max(1, (AUTO_CEILING - this.autoPercent) * 0.12),
        )
        const indicator = this.shadow.querySelector<HTMLElement>('[part="indicator"]')
        const bar = this.shadow.querySelector<SVGCircleElement>('[part="progress-bar"]')
        if (indicator) indicator.setAttribute('aria-valuenow', String(Math.round(this.autoPercent)))
        if (bar) {
          bar.setAttribute(
            'stroke-dashoffset',
            String(SPIN_CIRCUMFERENCE * (1 - this.autoPercent / 100)),
          )
        }
      }, AUTO_TICK_MS)
    } else if (!shouldRun && this.autoTimer) {
      clearInterval(this.autoTimer)
      this.autoTimer = null
      // spinning 结束归零：下次激活从头推进
      if (!this.active) this.autoPercent = 0
    }
  }

  /**
   * 读屏文本同步（role=status 的播报内容）：
   * tip 属性 > tip 具名插槽文本 > locale 兜底文案（loading.loading）
   */
  private syncSrLabel(): void {
    const label = this.shadow.querySelector('[part="label"]')
    if (!label) return
    const attrTip = this.getAttr('tip', '')
    if (attrTip !== '') {
      label.textContent = attrTip
      return
    }
    const tipSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="tip"]')
    const slotText = tipSlot?.assignedNodes({ flatten: true }).map((n) => n.textContent ?? '').join('').trim() ?? ''
    label.textContent = slotText !== '' ? slotText : this.t('loading.loading')
  }

  /** tip 文案同步：具名 tip 插槽分配时优先（tip-text 隐藏），否则渲染 tip 属性纯文本 */
  private syncTip(): void {
    const tipEl = this.shadow.querySelector('[part="tip"]')
    const textEl = this.shadow.querySelector<HTMLElement>('[part="tip-text"]')
    if (!tipEl || !textEl) return
    const hasSlotTip = (
      this.shadow.querySelector('slot[name="tip"]') as HTMLSlotElement | null
    )?.assignedNodes({ flatten: true }).length
      ? true
      : false
    const attrTip = this.getAttr('tip', '')
    const hasTip = hasSlotTip || attrTip !== ''
    tipEl.classList.toggle('has-tip', hasTip)
    // 属性纯文本用 textContent 注入（不解析 HTML），插槽分配时隐藏属性文本
    textEl.textContent = attrTip
    textEl.hidden = hasSlotTip || attrTip === ''
    const body = this.shadow.querySelector('[part="body"]')
    const pos = this.getAttr('tip-position', 'below')
    body?.setAttribute(
      'data-tip-position',
      pos === 'above' || pos === 'before' || pos === 'after' ? pos : 'below',
    )
  }
}
