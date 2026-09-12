import { OASElement } from '@oas-ui/core'

/** 相机图标（trigger 遮罩默认内容，原创 SVG；stroke=currentColor 随遮罩文字色） */
const CAMERA_SVG =
  '<svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1.8 5.7c0-.66.54-1.2 1.2-1.2h2.02l1.06-1.55h3.84l1.06 1.55h2.02c.66 0 1.2.54 1.2 1.2v5.8c0 .66-.54 1.2-1.2 1.2H3c-.66 0-1.2-.54-1.2-1.2V5.7Z"/><circle cx="8" cy="8.7" r="2.1"/></svg>'

/** size 枚举别名 → px（对齐 ui-spec §2.1 尺寸梯度；数字用法优先保留） */
const SIZE_ALIASES: Record<string, number> = {
  small: 24,
  medium: 32,
  large: 40,
}

/** 预设色板名（映射 --oas-preset-* token，color 属性支持按名引用；非法名按普通色值处理） */
const AVATAR_PRESET_COLORS: readonly string[] = [
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

/** text 多字收缩下限（px）：保证极小头像里的可读性 */
const TEXT_FLOOR_PX = 10
/** 收缩测量最大迭代次数（防御异常测量死循环） */
const TEXT_FIT_MAX_ITER = 40

/**
 * size 解析：枚举别名（small/medium/large）→ 数字档；数字字符串直用；
 * 非法值回落 32（medium 档，兼容历史默认）。
 */
function resolveSize(raw: string): number {
  const alias = SIZE_ALIASES[raw.trim()]
  if (alias) return alias
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 32
}

/**
 * 自定义色实心底的文字色：按相对亮度取深/浅，保证对比可读。
 * 支持 #rgb/#rrggbb/rgb(a) 解析；其余写法（var()/色名）返回 ''（由调用方回落 token）。
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
 * color 属性解析（ui-spec §4.1 统一协议）：
 * 4 语义色 → token + on-token；11 预设名 → --oas-preset-* token（dark 自动切深字）；
 * 其余按任意 CSS 色值注入，文字色用 pickOnColor 按底色亮度取黑/白（解析不了回落 on-primary token）。
 */
function resolveAvatarColor(color: string): { bg: string; on: string } {
  const semantic: Record<string, [string, string]> = {
    primary: ['var(--oas-color-primary)', 'var(--oas-color-text-on-primary)'],
    success: ['var(--oas-color-success)', 'var(--oas-color-text-on-success)'],
    warning: ['var(--oas-color-warning)', 'var(--oas-color-text-on-warning)'],
    danger: ['var(--oas-color-danger)', 'var(--oas-color-text-on-danger)'],
  }
  const s = semantic[color]
  if (s) return { bg: s[0]!, on: s[1]! }
  if ((AVATAR_PRESET_COLORS as readonly string[]).includes(color)) {
    return { bg: `var(--oas-preset-${color})`, on: 'var(--oas-color-text-on-primary)' }
  }
  return { bg: color, on: pickOnColor(color) || 'var(--oas-color-text-on-primary)' }
}

const STYLE = `
:host {
  position: relative;
  display: inline-block;
  border-radius: 50%;
  background: var(--oas-avatar-bg, var(--oas-color-primary));
  color: var(--oas-avatar-on-color, var(--oas-color-text-on-primary));
  font-family: inherit;
  user-select: none;
  flex-shrink: 0;
}
/* 形态：square 直角 / round 小圆角 token / 缺省（circle）50% 圆形（属性选择器，零 JS 同步成本） */
:host([shape="square"]) {
  border-radius: 0;
}
:host([shape="round"]) {
  border-radius: var(--oas-radius-md);
}
:host([hidden]) {
  display: none;
}
img,
.fallback,
.trigger {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-radius: inherit;
}
img {
  object-fit: cover;
}
.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
/* icon 层与首字符同处 fallback 容器：icon 显式给出时不截首字（text 隐藏） */
.fallback .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
}
.fallback .icon svg,
.fallback .icon oas-icon {
  font-size: calc(var(--oas-avatar-size, 32px) * 0.5);
}
/* 多字 text 收缩测量需要可靠盒模型：inline-block + 不换行 + 裁切防溢出邻居 */
.fallback .text {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  /* 收缩到下限仍超宽时省略号收尾（避免半字裁切）；全文经 title/textContent 保留 */
  text-overflow: ellipsis;
  line-height: 1;
}
[hidden] {
  display: none !important;
}
/* 换头像入口：hover / focus-visible 显形；空 slot 节点启用（默认相机图标兜底） */
.trigger {
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: color-mix(in srgb, var(--oas-color-bg-elevated) 82%, transparent);
  color: var(--oas-color-text-primary);
  font-size: calc(var(--oas-avatar-size, 32px) * 0.36);
  font-family: inherit;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity var(--oas-transition-fast) var(--oas-ease-out),
    visibility var(--oas-transition-fast);
}
.trigger svg {
  display: block;
}
/* 默认相机图标与自定义遮罩内容互斥：slot 有实质内容时隐藏默认图标。
   （slot 兜底内容在存在 assigned 节点时不渲染，默认图标改由兄弟节点承载） */
.trigger-default {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.trigger.has-content .trigger-default {
  display: none;
}
:host(:hover) .trigger,
.trigger:focus-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 角标：视觉对齐 oas-badge（danger 底 + on-danger 字，dot 8px 圆点），尺寸随头像 size 缩放 */
.badge {
  position: absolute;
  z-index: 1;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 var(--oas-space-1);
  border-radius: 8px;
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
}
.badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 50%;
}
.badge.color-primary {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.badge.color-success {
  background: var(--oas-color-success);
  color: var(--oas-color-text-on-success);
}
.badge.color-warning {
  background: var(--oas-color-warning);
  color: var(--oas-color-text-on-warning);
}
.badge.placement-top-right {
  top: 0;
  inset-inline-end: 0;
  transform: translate(50%, -50%);
}
.badge.placement-bottom-right {
  bottom: 0;
  inset-inline-end: 0;
  transform: translate(50%, 50%);
}
`

/**
 * oas-avatar —— 头像（v1.6 P0 增强：徽标叠加 + 加载失败回退；本轮增强：形态/尺寸枚举/
 * 颜色协议/回退图/icon 插槽/fit/多字自适应/换头像入口）。
 *
 * 形态：`shape="circle|square|round"` 纯 CSS 属性选择器（square 直角 / round 走 radius token）。
 * 尺寸：`size` 支持数字 px 与枚举别名 small/medium/large（24/32/40）。
 * 颜色：`color` 走 ui-spec §4.1 统一协议（语义色 / 11 预设名 / 任意色值 + 对比色自动选取），
 * 经 --oas-avatar-bg / --oas-avatar-on-color 变量注入（CSS 变量开口，宿主可直接覆盖）。
 *
 * 徽标：`badge` 文本或布尔（空值显示小圆点）、`badge-dot` 圆点变体、
 * `badge-color` 彩色、`badge-placement` 位置（top-right/bottom-right）；
 * 视觉对齐 oas-badge（同一套 danger 底 / on-* 字 token），尺寸随头像 size 缩放。
 *
 * 回退链：图片 `error` → 派发 `oas-error`（detail 含失败 URL）→ `fallback` 属性（回退图 URL）
 * 重试一次 → `fallback` 命名插槽 → 内容首字符 → `?`；
 * `failed` / `fallbackTried` 状态保持，仅 `src` 变化时重置重新加载。
 * `slot="icon"` 显式图标层（给出即不截首字）；`fit` 映射 img object-fit（默认 cover）。
 * `slot="trigger"` 换头像入口：hover / focus-visible 显形遮罩（空节点启用默认相机图标），
 * 点击派发 `oas-trigger`（上传宿主自理）。
 *
 * 模板常驻 img + fallback 容器 + trigger 遮罩（badge 组件同款「骨架常驻、hidden 切换」模式），
 * 动态增删 src 无需重建 shadow，DSD 快照结构稳定。
 */
export class OASAvatar extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'src',
      'size',
      'alt',
      'badge',
      'badge-dot',
      'badge-color',
      'badge-placement',
      'text',
      'shape',
      'fallback',
      'fit',
      'color',
    ]
  }

  /** 图片加载失败态（仅 src 变化时重置） */
  private failed = false
  /** fallback 回退图是否已重试过（防止回退图自身 error 无限重试） */
  private fallbackTried = false
  private lastSrc = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <img part="image" alt="">
      <span class="fallback" part="fallback">
        <span class="icon" part="icon" hidden><slot name="icon"></slot></span>
        <slot name="fallback"></slot>
        <span class="text" part="text"></span>
      </span>
      <button class="trigger" part="trigger" type="button" aria-label="${this.t('avatar.changeAvatar')}" hidden><span class="trigger-default" part="trigger-default" aria-hidden="true">${CAMERA_SVG}</span><slot name="trigger"></slot></button>
      <span class="badge" part="badge" hidden></span>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('img')?.addEventListener('error', () => this.handleImgError())
    // 宿主侧 fallback / icon / trigger 命名插槽增删内容（slotchange 异步）时刷新占位
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="fallback"]')
      ?.addEventListener('slotchange', () => this.update())
    this.shadow.querySelector<HTMLSlotElement>('slot[name="icon"]')?.addEventListener('slotchange', () => this.update())
    this.shadow
      .querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.addEventListener('slotchange', () => this.update())
    // 换头像入口：点击派发 oas-trigger（上传逻辑宿主自理）
    this.shadow.querySelector('[part="trigger"]')?.addEventListener('click', () => {
      this.emit('trigger', { source: this })
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（img 与 fallback 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('img')) return false
    if (!this.shadow.querySelector('[part="fallback"]')) return false
    this.bind()
    return true
  }

  private handleImgError(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    const failedSrc = img?.getAttribute('src') ?? ''
    // 每次失败都派发（主图与回退图各一次），detail.src 为失败的 URL（宿主可埋点/自定义回退）
    this.emit('error', { src: failedSrc })
    const fallback = this.getAttr('fallback', '').trim()
    if (fallback && !this.fallbackTried) {
      // 回退图重试一次：img 保持可见，失败态不置位
      this.fallbackTried = true
      if (img) img.setAttribute('src', fallback)
      return
    }
    this.failed = true
    this.sync()
  }

  /** 统一可见性：无 src 或加载失败 → 显示 fallback 占位；否则显示 img */
  private sync(): void {
    const img = this.shadow.querySelector<HTMLImageElement>('img')
    const fb = this.shadow.querySelector<HTMLElement>('[part="fallback"]')
    if (!fb) return
    const hasSrc = this.getAttr('src', '') !== ''
    const showFallback = !hasSrc || this.failed
    if (img) img.hidden = showFallback
    fb.hidden = !showFallback

    const assigned = (name: string): boolean => {
      const slot = this.shadow.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
      return slot
        ? slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
        : false
    }
    // icon 显式给出时优先于首字符（不截首字）；其次 fallback 命名插槽；最后内置 text
    const hasIcon = assigned('icon')
    const icon = fb.querySelector<HTMLElement>('[part="icon"]')
    if (icon) icon.hidden = !hasIcon
    const text = fb.querySelector<HTMLElement>('[part="text"]')
    if (text) text.hidden = hasIcon || assigned('fallback')
  }

  /** 换头像入口显隐：slot="trigger" 有任何节点（含空节点占位）即启用；有实质内容时隐藏默认相机图标 */
  private syncTrigger(): void {
    const trigger = this.shadow.querySelector<HTMLElement>('[part="trigger"]')
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    if (!trigger || !slot) return
    const nodes = slot.assignedNodes()
    const active = nodes.some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
    trigger.hidden = !active
    const hasContent = nodes.some(
      (n) => (n.textContent ?? '').trim() !== '' || (n.nodeType === Node.ELEMENT_NODE && n.childNodes.length > 0),
    )
    trigger.classList.toggle('has-content', hasContent)
    trigger.setAttribute('aria-label', this.t('avatar.changeAvatar'))
  }

  /** color 属性同步（ui-spec §4.1 统一协议，变量注入含 CSS 开口） */
  private syncColor(): void {
    const color = this.getAttr('color', '').trim()
    if (!color) {
      this.style.removeProperty('--oas-avatar-bg')
      this.style.removeProperty('--oas-avatar-on-color')
      return
    }
    const { bg, on } = resolveAvatarColor(color)
    this.style.setProperty('--oas-avatar-bg', bg)
    this.style.setProperty('--oas-avatar-on-color', on)
  }

  /** text 多字收缩：从基准字号递减直到内容宽度装得下（scrollWidth 实测，下限 TEXT_FLOOR_PX） */
  private fitText(textEl: HTMLElement, container: HTMLElement, sizePx: number): void {
    const base = Math.max(12, sizePx * 0.4)
    let fs = base
    textEl.style.fontSize = `${fs}px`
    let guard = 0
    while (textEl.scrollWidth > container.clientWidth && fs > TEXT_FLOOR_PX && guard < TEXT_FIT_MAX_ITER) {
      fs = Math.max(TEXT_FLOOR_PX, fs - 1)
      textEl.style.fontSize = `${fs}px`
      guard++
    }
  }

  /** 角标同步：显隐 / dot 变体 / 颜色 / 位置 / 随头像 size 缩放 */
  private syncBadge(size: string): void {
    const badgeEl = this.shadow.querySelector<HTMLElement>('[part="badge"]')
    if (!badgeEl) return
    const hasBadge = this.hasAttr('badge') || this.hasAttr('badge-dot')
    badgeEl.hidden = !hasBadge
    if (!hasBadge) return

    const badgeText = this.getAttr('badge', '')
    const dot = this.hasAttr('badge-dot') || (this.hasAttr('badge') && badgeText === '')
    badgeEl.classList.toggle('dot', dot)

    const color = this.getAttr('badge-color', 'danger')
    badgeEl.classList.toggle('color-primary', color === 'primary')
    badgeEl.classList.toggle('color-success', color === 'success')
    badgeEl.classList.toggle('color-warning', color === 'warning')
    badgeEl.classList.toggle('color-danger', color !== 'primary' && color !== 'success' && color !== 'warning')

    const placement = this.getAttr('badge-placement', 'top-right')
    badgeEl.classList.toggle('placement-top-right', placement !== 'bottom-right')
    badgeEl.classList.toggle('placement-bottom-right', placement === 'bottom-right')

    const n = Number(size) || 32
    const bs = Math.max(12, Math.min(22, Math.round(n * 0.5)))
    if (dot) {
      const ds = Math.max(6, Math.round(bs * 0.5))
      badgeEl.style.width = `${ds}px`
      badgeEl.style.height = `${ds}px`
      badgeEl.style.minWidth = `${ds}px`
      badgeEl.style.borderRadius = '50%'
      badgeEl.style.lineHeight = 'normal'
      badgeEl.style.padding = '0'
      badgeEl.style.fontSize = ''
      badgeEl.textContent = ''
    } else {
      // 清除 dot 分支残留的内联样式（width/padding），回落到 CSS 默认（width auto、padding 0 4px）
      badgeEl.style.width = ''
      badgeEl.style.height = `${bs}px`
      badgeEl.style.minWidth = `${bs}px`
      badgeEl.style.lineHeight = `${bs}px`
      badgeEl.style.fontSize = `${Math.max(10, Math.round(bs * 0.75))}px`
      badgeEl.style.borderRadius = `${Math.round(bs / 2)}px`
      badgeEl.style.padding = ''
      badgeEl.textContent = badgeText
    }
  }

  protected override update(): void {
    const px = resolveSize(this.getAttr('size', '32'))
    const size = String(px)
    this.style.width = `${size}px`
    this.style.height = `${size}px`
    this.style.setProperty('--oas-avatar-size', `${size}px`)

    const img = this.shadow.querySelector('img')
    if (img) {
      const src = this.getAttr('src', '')
      if (src !== this.lastSrc) {
        this.lastSrc = src
        this.failed = false
        this.fallbackTried = false
      }
      img.setAttribute('src', src)
      img.setAttribute('alt', this.getAttr('alt', this.t('avatar.defaultAlt')))
      // fit 映射 object-fit（默认 cover 兼容现状；非法值由 CSS 基类兜底）
      img.style.objectFit = this.getAttr('fit', '') || 'cover'
    }
    const fb = this.shadow.querySelector<HTMLElement>('[part="fallback"]')
    const text = this.shadow.querySelector<HTMLElement>('[part="text"]')
    if (text) {
      // 首字符契约（克制版）：响应式 `text` 属性多字时渲染全量并收缩到容器内；
      // 单字/无 text 属性回落宿主 textContent 首字符（连接时快照，后续改 textContent 需用 `text` 属性）
      const attrText = this.getAttr('text', '').trim()
      if (attrText.length > 1) {
        text.textContent = attrText
        this.fitText(text, fb ?? text, px)
      } else {
        const source = attrText || (this.textContent ?? '')
        text.textContent = source.trim().charAt(0) || '?'
        text.style.fontSize = `${Math.max(12, px * 0.4)}px`
      }
    }

    this.sync()
    this.syncTrigger()
    this.syncColor()
    this.syncBadge(size)
  }
}
