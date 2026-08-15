import { OASElement } from '@oas-ui/core'

export type BadgeMode = 'count' | 'ribbon'
export type BadgeColor = 'primary' | 'success' | 'warning' | 'danger'
export type BadgePlacement = 'start' | 'end'
/** 缎带纵向位置：hang 挂沿下（默认）/ edge 贴顶边 / cross 骑跨顶边；非法值静默回落 hang */
export type BadgeRibbonPosition = 'hang' | 'edge' | 'cross'
/** 吸引动画：外圈脉冲扩散 / 轻微上下弹跳（仅 count/dot/standalone 徽标，ribbon 不受影响） */
export type BadgeAttention = 'pulse' | 'bounce'
/** 角标四角定位（默认 top-right；非法值静默回落） */
export type BadgeCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
/** 状态点形态（行内独立元素，与角标模式互斥） */
export type BadgeStatus = 'success' | 'processing' | 'default' | 'error' | 'warning'
export type BadgeSize = 'small'
/** 预设色板名（映射 --oas-preset-* token，color 属性支持按名引用；非法名按普通色值处理） */
export type BadgePresetColor =
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

export const BADGE_PRESET_COLORS: readonly BadgePresetColor[] = [
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

const VALID_STATUS: readonly string[] = ['success', 'processing', 'default', 'error', 'warning']
const VALID_ATTENTION: readonly string[] = ['pulse', 'bounce']
const VALID_CORNER: readonly string[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left']

/** corner 平移符号：X 向右为正，Y 向下为正（top 角 Y 为负） */
const CORNER_SIGN: Record<string, { sx: string; sy: string }> = {
  'top-right': { sx: '', sy: '-' },
  'top-left': { sx: '-', sy: '-' },
  'bottom-right': { sx: '', sy: '' },
  'bottom-left': { sx: '-', sy: '' },
}

/** 状态点语义色映射（status 属性） */
const STATUS_COLOR: Record<string, string> = {
  success: 'var(--oas-color-success)',
  processing: 'var(--oas-color-primary)',
  error: 'var(--oas-color-danger)',
  warning: 'var(--oas-color-warning)',
  default: 'var(--oas-color-text-secondary)',
}

/**
 * 自定义色实心底的文字色：按相对亮度取深/浅，保证对比可读。
 * 支持 #rgb/#rrggbb/rgb(a) 解析；其余写法（var()/色名）返回 ''（走 CSS 兜底 token）。
 */
function pickOnColor(color: string): string {
  let r = 0
  let g = 0
  let b = 0
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  const rgb = color.trim().match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (hex) {
    const h = hex[1]!.length === 3 ? hex[1]!.replace(/(.)/g, '$1$1') : hex[1]!
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  } else if (rgb) {
    r = Number(rgb[1])
    g = Number(rgb[2])
    b = Number(rgb[3])
  } else {
    return ''
  }
  // W3C 相对亮度；0.35 阈值：亮底取深字、暗底取白字
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  return lum > 0.35 ? '#18181b' : '#ffffff'
}

/**
 * color 属性解析：4 语义色 → token + on-color；11 预设名 → --oas-preset-* token
 * （on-color 走 text-on-primary，dark 自动切深字）；其余按任意 CSS 色值注入，
 * 实心文字色用 pickOnColor 按底色亮度取黑/白。
 */
function resolveBadgeColor(color: string): { bg: string; on: string } {
  const semantic: Record<string, [string, string]> = {
    primary: ['var(--oas-color-primary)', 'var(--oas-color-text-on-primary)'],
    success: ['var(--oas-color-success)', 'var(--oas-color-text-on-success)'],
    warning: ['var(--oas-color-warning)', 'var(--oas-color-text-on-warning)'],
    danger: ['var(--oas-color-danger)', 'var(--oas-color-text-on-danger)'],
  }
  const s = semantic[color]
  if (s) return { bg: s[0], on: s[1] }
  if ((BADGE_PRESET_COLORS as readonly string[]).includes(color)) {
    return { bg: `var(--oas-preset-${color})`, on: 'var(--oas-color-text-on-primary)' }
  }
  return { bg: color, on: pickOnColor(color) }
}

/** offset 属性解析："x,y" px 数字；非法值返回 null（静默忽略） */
function parseOffset(raw: string): { x: string; y: string } | null {
  const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)$/)
  if (!m) return null
  return { x: m[1]!, y: m[2]! }
}

const STYLE = `
:host {
  display: inline-block;
  position: relative;
  font-family: inherit;
}
.badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  min-width: 16px;
  height: 16px;
  box-sizing: border-box;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-badge-bg, var(--oas-color-danger));
  color: var(--oas-badge-on-color, var(--oas-color-text-on-danger));
  font-size: var(--oas-font-size-xs);
  line-height: 16px;
  text-align: center;
  white-space: nowrap;
}
.badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}
.badge.small {
  min-width: 13px;
  height: 13px;
  line-height: 13px;
  border-radius: 7px;
  font-size: 10px;
  padding: 0 3px;
}
.badge.small.dot {
  min-width: 6px;
  width: 6px;
  height: 6px;
}
/* corner 四角：仅切换 anchor 定位（translate 由 JS 内联写入，保证与 offset/overlap 叠加） */
.badge.corner-top-left {
  right: auto;
  left: 0;
}
.badge.corner-bottom-right {
  top: auto;
  bottom: 0;
}
.badge.corner-bottom-left {
  top: auto;
  bottom: 0;
  right: auto;
  left: 0;
}
/* attention 吸引动画：pulse 外圈脉冲扩散（颜色走 --oas-badge-pulse-color，默认跟随徽章底色） */
.badge.attention-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 2px var(--oas-badge-pulse-color, var(--oas-badge-bg, var(--oas-color-danger)));
  animation: oas-badge-attn-pulse 2.2s var(--oas-ease-in-out) infinite;
  pointer-events: none;
}
@keyframes oas-badge-attn-pulse {
  0% {
    opacity: 0.55;
    transform: scale(1);
  }
  60%,
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}
/* attention：bounce 轻微弹跳；动画覆盖内联 transform 期间用 --oas-badge-pos 保留基址（含 corner/offset 平移） */
.badge.attention-bounce {
  animation: oas-badge-attn-bounce 1.4s var(--oas-ease-in-out) infinite;
}
@keyframes oas-badge-attn-bounce {
  0%,
  100% {
    transform: var(--oas-badge-pos, translate(50%, -50%));
  }
  50% {
    transform: var(--oas-badge-pos, translate(50%, -50%)) translateY(-25%);
  }
}
/* standalone 独立徽标：默认插槽无内容时回落静态行内展示（角标定位失效，作为独立元素放在文本流/菜单行） */
.badge.standalone {
  position: static;
  transform: none;
  display: inline-flex;
  align-items: center;
  margin-inline-start: var(--oas-space-1);
  vertical-align: middle;
}
.badge[hidden] {
  display: none;
}
/* ===== status 状态点：行内独立元素（非角标定位），与 ribbon/dot/count 互斥 ===== */
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
}
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--oas-status-color, var(--oas-color-text-secondary));
  flex-shrink: 0;
}
.status.processing .status-dot {
  animation: oas-badge-pulse 1.4s var(--oas-ease-in-out) infinite;
}
@keyframes oas-badge-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.65);
  }
}
@media (prefers-reduced-motion: reduce) {
  .status.processing .status-dot,
  .badge.attention-pulse::after,
  .badge.attention-bounce {
    animation: none;
  }
}
.status[hidden] {
  display: none;
}
/* 缎带：卡片上沿角标，斜角折叠效果（corner 三角 + brightness 折叠阴影） */
.ribbon {
  position: absolute;
  top: var(--oas-space-2);
  z-index: 1;
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  height: var(--oas-control-height-xs);
  line-height: var(--oas-control-height-xs);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
  /* color 与背景同色：corner 经 currentColor 继承同色后由 brightness 压暗成折叠；
     color 属性（语义色 class / 预设名 / 任意色值）经 --oas-badge-bg 变量覆盖 */
  color: var(--oas-badge-bg, var(--oas-color-danger));
  background-color: var(--oas-badge-bg, var(--oas-color-danger));
  border-radius: var(--oas-radius-sm);
}
/* ribbon-position 三选：hang（默认，基类 top）挂沿下 / edge 贴顶边 / cross 骑跨顶边；
   仅改纵向 top，与 placement（横向锚点）正交，非法值回落基类 hang */
.ribbon.position-edge {
  top: 0;
}
.ribbon.position-cross {
  top: -6px;
}
.ribbon-text {
  color: var(--oas-badge-on-color, var(--oas-color-text-on-danger));
}
.ribbon.color-primary {
  color: var(--oas-color-primary);
  background-color: var(--oas-color-primary);
}
.ribbon.color-primary .ribbon-text {
  color: var(--oas-color-text-on-primary);
}
.ribbon.color-success {
  color: var(--oas-color-success);
  background-color: var(--oas-color-success);
}
.ribbon.color-success .ribbon-text {
  color: var(--oas-color-text-on-success);
}
.ribbon.color-warning {
  color: var(--oas-color-warning);
  background-color: var(--oas-color-warning);
}
.ribbon.color-warning .ribbon-text {
  color: var(--oas-color-text-on-warning);
}
/* 折叠角：尖三角（clip-path 三点三角，顶边沿缎带下沿、斜边折向内下），
   经 currentColor 继承缎带底色 + brightness 压暗成折叠阴影；
   start 侧必须显式镜像（clip-path 走元素本地坐标，不随锚点自动翻转——曾现 bug） */
.ribbon-corner {
  position: absolute;
  top: 100%;
  width: var(--oas-space-2);
  height: var(--oas-space-2);
  background: currentColor;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  filter: brightness(75%);
}
.ribbon.placement-end {
  inset-inline-end: calc(var(--oas-space-2) * -1);
  border-end-end-radius: 0;
}
.ribbon.placement-end .ribbon-corner {
  inset-inline-end: 0;
}
.ribbon.placement-start {
  inset-inline-start: calc(var(--oas-space-2) * -1);
  border-end-start-radius: 0;
}
.ribbon.placement-start .ribbon-corner {
  inset-inline-start: 0;
  /* 折叠三角随侧镜像：start 侧直角在右上（clip-path 不随锚点自动镜像，需显式翻） */
  clip-path: polygon(100% 0, 0 0, 100% 100%);
}
.ribbon[hidden] {
  display: none;
}
`

export class OASBadge extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'max',
      'showZero',
      'dot',
      'ribbon',
      'mode',
      'color',
      'placement',
      'text',
      'offset',
      'status',
      'size',
      'attention',
      'corner',
      'overlap',
      'ribbon-position',
    ]
  }

  private badgeEl: HTMLElement | null = null
  private ribbonEl: HTMLElement | null = null
  private ribbonSlotEl: HTMLSlotElement | null = null
  private defaultSlotEl: HTMLSlotElement | null = null
  private statusEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <sup class="badge" part="badge" hidden></sup>
      <span class="status" part="status" hidden>
        <span class="status-dot" part="status-dot" aria-hidden="true"></span>
        <span class="status-text" part="status-text"></span>
      </span>
      <div class="ribbon" part="ribbon" hidden>
        <span class="ribbon-text" part="ribbon-text">
          <slot name="ribbon"></slot>
          <span class="ribbon-fallback" part="ribbon-fallback" hidden></span>
        </span>
        <span class="ribbon-corner" part="ribbon-corner" aria-hidden="true"></span>
      </div>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    this.badgeEl = this.shadow.querySelector('.badge')
    this.ribbonEl = this.shadow.querySelector('.ribbon')
    this.ribbonSlotEl = this.shadow.querySelector<HTMLSlotElement>('slot[name="ribbon"]')
    this.statusEl = this.shadow.querySelector('.status')
    // 默认插槽内容变化（standalone 判定依据）时刷新显隐与定位形态
    this.defaultSlotEl = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    this.defaultSlotEl?.addEventListener('slotchange', () => this.update())
    // 缎带命名插槽增删内容（slotchange 异步触发）时刷新显隐与兜底
    this.ribbonSlotEl?.addEventListener('slotchange', () => this.update())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（徽标节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.badge')) return false
    this.bind()
    return true
  }

  private syncStatus(status: string, statusMode: boolean): void {
    const el = this.statusEl
    if (!el) return
    el.hidden = !statusMode
    if (!statusMode) return
    // 语义 class（success/processing/error/warning/default）+ 颜色变量注入
    for (const name of VALID_STATUS) el.classList.toggle(name, status === name)
    const dot = el.querySelector<HTMLElement>('.status-dot')
    if (dot) {
      const statusColor =
        STATUS_COLOR[status as string] ?? 'var(--oas-color-text-secondary)'
      dot.style.setProperty('--oas-status-color', statusColor)
    }
    const text = el.querySelector<HTMLElement>('.status-text')
    if (text) text.textContent = this.getAttr('text', '')
  }

  private syncRibbon(statusMode: boolean): void {
    const ribbonEl = this.ribbonEl
    const slot = this.ribbonSlotEl
    if (!ribbonEl) return

    const ribbonMode =
      this.hasAttr('ribbon') || (this.getAttr('mode', 'count') as BadgeMode) === 'ribbon'
    const color = this.getAttr('color', 'danger') as BadgeColor | BadgePresetColor
    const placement = this.getAttr('placement', 'end') as BadgePlacement
    const position = this.getAttr('ribbon-position', 'hang') as BadgeRibbonPosition
    const text = this.getAttr('text', '')

    // 语义色 class（兼容）：仅 4 语义色命中；预设名/任意色值走下方变量注入
    ribbonEl.classList.toggle('color-primary', color === 'primary')
    ribbonEl.classList.toggle('color-success', color === 'success')
    ribbonEl.classList.toggle('color-warning', color === 'warning')
    ribbonEl.classList.toggle('color-danger', color === 'danger')
    ribbonEl.classList.toggle('placement-start', placement === 'start')
    ribbonEl.classList.toggle('placement-end', placement !== 'start')
    // ribbon-position 三选：edge/cross 命中间隔类，hang 与非法值均回落基类（不写额外标记）
    ribbonEl.classList.toggle('position-edge', position === 'edge')
    ribbonEl.classList.toggle('position-cross', position === 'cross')

    // color 变量注入（语义色与 class 双保险；预设名/任意色值唯一生效路径）
    const resolved = resolveBadgeColor(color)
    ribbonEl.style.setProperty('--oas-badge-bg', resolved.bg)
    ribbonEl.style.setProperty('--oas-badge-on-color', resolved.on)

    // text 属性走独立兜底元素（不写 slot 节点——写 slot 兜底会在部分浏览器触发
    // slotchange→update 无限循环卡死主线程）；slot 有 assigned 内容时兜底隐藏
    const fallback = ribbonEl.querySelector<HTMLElement>('.ribbon-fallback')
    if (fallback) {
      fallback.textContent = text
      fallback.hidden = text === '' || (slot?.assignedNodes().length ?? 0) > 0
    }

    const hasAssigned = slot ? slot.assignedNodes().length > 0 : false
    // 空态：未启用缎带或没有任何内容（text/slot 均无）时不显示；status 激活时互斥隐藏
    ribbonEl.hidden = statusMode || !ribbonMode || (text === '' && !hasAssigned)
  }

  protected override update(): void {
    const status = this.getAttr('status', '') as BadgeStatus
    const statusMode = (VALID_STATUS as readonly string[]).includes(status)
    this.syncStatus(status, statusMode)

    const el = this.badgeEl
    if (el) {
      // 互斥：status 优先渲染，角标徽标隐藏
      if (statusMode) {
        el.hidden = true
      } else {
        const raw = this.getAttr('value', '')
        const dot = this.hasAttr('dot')
        const showZero = this.hasAttr('showZero')

        const value = raw === '' ? NaN : Number(raw)
        const hasValue = !Number.isNaN(value)

        // standalone：默认插槽无内容时徽标回落为静态行内展示
        const standalone = !this.defaultSlotEl || this.defaultSlotEl.assignedNodes().length === 0
        el.classList.toggle('standalone', standalone)

        // size 小尺寸档
        el.classList.toggle('small', this.getAttr('size', '') === 'small')
        // color 全模式：语义色 / 预设名 / 任意色值；无 color 时移除变量（CSS 回落默认 danger）
        const color = this.getAttr('color', '') as BadgeColor | BadgePresetColor
        if (color) {
          const resolved = resolveBadgeColor(color)
          el.style.setProperty('--oas-badge-bg', resolved.bg)
          el.style.setProperty('--oas-badge-on-color', resolved.on)
        } else {
          el.style.removeProperty('--oas-badge-bg')
          el.style.removeProperty('--oas-badge-on-color')
        }

        // offset：叠加到角标 translate；standalone/非法值静默忽略
        const offset = parseOffset(this.getAttr('offset', ''))
        // corner 四角定位（默认 top-right；非法值静默回落）
        const corner = this.getAttr('corner', 'top-right') as BadgeCorner
        const cornerName = (VALID_CORNER as readonly string[]).includes(corner)
          ? corner
          : 'top-right'
        el.classList.toggle('corner-top-left', cornerName === 'top-left')
        el.classList.toggle('corner-bottom-right', cornerName === 'bottom-right')
        el.classList.toggle('corner-bottom-left', cornerName === 'bottom-left')
        // overlap=circular：包裹圆形内容时平移幅度从 50% 收到 1-√2/2 ≈ 29.29%（几何内收）
        const ratio = this.hasAttr('overlap') ? 29.29 : 50
        const sign = CORNER_SIGN[cornerName]!
        let pos = ''
        if (offset && !standalone) {
          pos = `translate(calc(${sign.sx}${ratio}% + ${offset.x}px), calc(${sign.sy}${ratio}% + ${offset.y}px))`
        } else if (!standalone && (cornerName !== 'top-right' || ratio !== 50)) {
          pos = `translate(${sign.sx}${ratio}%, ${sign.sy}${ratio}%)`
        }
        if (pos) {
          el.style.transform = pos
        } else {
          el.style.removeProperty('transform')
        }

        // attention 吸引动画（pulse 外圈脉冲 / bounce 弹跳）；非法值静默忽略；
        // 仅作用于角标/独立徽标（ribbon 不受影响）。bounce 在动画覆盖 transform 期间
        // 用 --oas-badge-pos 保留基址；独立徽标基址为恒等平移
        const attention = this.getAttr('attention', '') as BadgeAttention
        const validAttention = (VALID_ATTENTION as readonly string[]).includes(attention)
        el.classList.toggle('attention-pulse', validAttention && attention === 'pulse')
        el.classList.toggle('attention-bounce', validAttention && attention === 'bounce')
        if (validAttention && attention === 'bounce') {
          el.style.setProperty(
            '--oas-badge-pos',
            pos || (standalone ? 'translate(0, 0)' : 'translate(50%, -50%)'),
          )
        } else {
          el.style.removeProperty('--oas-badge-pos')
        }

        el.classList.toggle('dot', dot)

        if (dot) {
          el.textContent = ''
          el.hidden = false
        } else if (!hasValue || (value === 0 && !showZero)) {
          el.hidden = true
        } else {
          const max = this.getAttr('max', '')
          const maxNum = max === '' ? NaN : Number(max)
          const display = !Number.isNaN(maxNum) && value > maxNum ? `${maxNum}+` : String(value)
          el.textContent = display
          el.hidden = false
        }
      }
    }

    this.syncRibbon(statusMode)
  }
}
