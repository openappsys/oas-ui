import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
/* hidden 语义防御：UA 的 [hidden] display:none 是 UA 样式，:host 的 display:inline-block 会压过它——
   显式补 :host([hidden]) 规则保住 hidden 语义（label 等组件模板里 hidden 的 tooltip 包裹层不应占位） */
:host([hidden]) {
  display: none;
}
.tip {
  position: fixed;
  z-index: var(--oas-z-tooltip, 1080);
  padding: var(--oas-space-1) var(--oas-space-2);
  /* 圆角封顶（箭头接缝防收腰）：箭头底宽 = 8px 方形旋转 45° 的对角投影 8√2 ≈ 11.31px，
     气泡交叉轴直边段（尺寸 − 2×radius）小于它时，圆角曲线侵入箭头底边衔接区，接缝两侧
     出现凹口（空内容等窄气泡尤为明显）。--oas-tip-cross 由 position() 写入实际交叉轴
     布局尺寸，radius 封顶保证直边段 ≥ 箭头底宽；变量缺省 999px → 不封顶（token 定制保真） */
  border-radius: max(0px, min(var(--oas-radius-sm), calc((var(--oas-tip-cross, 999px) - 11.31px) / 2)));
  background: var(--oas-tooltip-bg, var(--oas-color-text-primary));
  color: var(--oas-tooltip-color, var(--oas-color-bg));
  font-size: var(--oas-font-size-sm);
  max-width: var(--oas-tooltip-max-width, 240px);
  pointer-events: none;
  /* 方向感知开合动画：进场 scale(0.9→1) + fade，transform-origin 随 data-placement
     （top 系从底边展开、bottom 系从顶边展开，left/right 同理） */
  transform-origin: center;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tip[aria-hidden='true'] {
  display: none;
}
.tip.tip-enter {
  animation: oas-tooltip-in 0.15s ease;
}
@keyframes oas-tooltip-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.tip[data-placement^='top'] {
  transform-origin: bottom center;
}
.tip[data-placement^='bottom'] {
  transform-origin: top center;
}
.tip[data-placement^='left'] {
  transform-origin: right center;
}
.tip[data-placement^='right'] {
  transform-origin: left center;
}
/* interactive：浮层可悬停（内含链接可达）——机制开关在 JS 同步 data-interactive */
.tip[data-interactive='true'] {
  pointer-events: auto;
}
/* 箭头：8px 正方形旋转 45°，底色与气泡同色，按 data-placement 落在面板对应边上，尖端指向锚点中心 */
.arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--oas-tooltip-bg, var(--oas-color-text-primary));
  transform: rotate(45deg);
  pointer-events: none;
}
/* ===== 主轴悬边（12 向通用：bottom 系悬顶边、top 系悬底边、left 系悬右边、right 系悬左边） ===== */
.tip[data-placement^='bottom'] .arrow {
  top: -4px;
}
.tip[data-placement^='top'] .arrow {
  bottom: -4px;
}
.tip[data-placement^='left'] .arrow {
  right: -4px;
}
.tip[data-placement^='right'] .arrow {
  left: -4px;
}
/* ===== 交叉轴（12 向：center 居中、start 靠起点侧 16px、end 靠终点侧 16px） ===== */
.tip[data-placement='top'] .arrow,
.tip[data-placement='bottom'] .arrow {
  left: calc(50% - 4px);
}
.tip[data-placement='top-start'] .arrow,
.tip[data-placement='bottom-start'] .arrow {
  left: 16px;
}
.tip[data-placement='top-end'] .arrow,
.tip[data-placement='bottom-end'] .arrow {
  right: 16px;
}
.tip[data-placement='left'] .arrow,
.tip[data-placement='right'] .arrow {
  top: calc(50% - 4px);
}
.tip[data-placement='left-start'] .arrow,
.tip[data-placement='right-start'] .arrow {
  top: 16px;
}
.tip[data-placement='left-end'] .arrow,
.tip[data-placement='right-end'] .arrow {
  bottom: 16px;
}
/* ===== C1 箭头 merge 模式：箭头与面板圆角融合成直角三角（仅 *-start/*-end 生效） =====
   箭头菱心骑在「主轴边 × 起止侧」的角点上，该角 radius 置零，箭头斜边与面板边缘拼成
   直角三角尖角。逐角写死（不能用 $='-start'/'-end' 后缀匹配——它对 12 向恒取顶角/恒写
   水平轴，top 系零错角、left-start 箭头会被拉到对侧边、*-end 箭头距角 16px 贴不上）：
   bottom 系悬顶边（start→左上角、end→右上角）、top 系悬底边（start→左下角、end→右下角）、
   left 系悬右边（start→右上角、end→右下角）、right 系悬左边（start→左上角、end→左下角） */
.tip[data-arrow-position='merge'][data-placement='bottom-start'] {
  border-top-left-radius: 0;
}
.tip[data-arrow-position='merge'][data-placement='bottom-end'] {
  border-top-right-radius: 0;
}
.tip[data-arrow-position='merge'][data-placement='top-start'] {
  border-bottom-left-radius: 0;
}
.tip[data-arrow-position='merge'][data-placement='top-end'] {
  border-bottom-right-radius: 0;
}
.tip[data-arrow-position='merge'][data-placement='left-start'] {
  border-top-right-radius: 0;
}
.tip[data-arrow-position='merge'][data-placement='left-end'] {
  border-bottom-right-radius: 0;
}
.tip[data-arrow-position='merge'][data-placement='right-start'] {
  border-top-left-radius: 0;
}
.tip[data-arrow-position='merge'][data-placement='right-end'] {
  border-bottom-left-radius: 0;
}
/* 箭头贴角：交叉轴拉到角点（覆盖 start/end 的 16px 让位规则；主轴悬边规则不变；
   top/bottom 系交叉轴是水平（left/right）、left/right 系是垂直（top/bottom）） */
.tip[data-arrow-position='merge'][data-placement='bottom-start'] .arrow,
.tip[data-arrow-position='merge'][data-placement='top-start'] .arrow {
  left: -4px;
}
.tip[data-arrow-position='merge'][data-placement='bottom-end'] .arrow,
.tip[data-arrow-position='merge'][data-placement='top-end'] .arrow {
  right: -4px;
}
.tip[data-arrow-position='merge'][data-placement='left-start'] .arrow,
.tip[data-arrow-position='merge'][data-placement='right-start'] .arrow {
  top: -4px;
}
.tip[data-arrow-position='merge'][data-placement='left-end'] .arrow,
.tip[data-arrow-position='merge'][data-placement='right-end'] .arrow {
  bottom: -4px;
}
@media (prefers-reduced-motion: reduce) {
  .tip.tip-enter {
    animation: none;
  }
}
`

// ============ 模块级浮层栈：打开中的 tooltip 按打开先后排序，Esc 关闭最顶层 ============
const tipLayers: OAStooltip[] = []

function registerTip(t: OAStooltip): void {
  if (tipLayers.includes(t)) return
  tipLayers.push(t)
  if (tipLayers.length === 1) document.addEventListener('keydown', onTipKey)
}

function unregisterTip(t: OAStooltip): void {
  const i = tipLayers.indexOf(t)
  if (i === -1) return
  tipLayers.splice(i, 1)
  if (tipLayers.length === 0) document.removeEventListener('keydown', onTipKey)
}

function onTipKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  const top = tipLayers[tipLayers.length - 1]
  if (!top) return
  top.setOpen(false)
  top.restoreFocus()
}

// ============ B2 全局单例 skipDelay：记录上次关闭时刻，连续悬停跳过 open-delay ============
let lastCloseAt = 0

export function shouldSkipDelay(duration: number): boolean {
  if (duration <= 0) return false
  return Date.now() - lastCloseAt < duration
}

// tip 唯一 id 生成器（aria-describedby 关联用）
let tipSeq = 0

export class OAStooltip extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'content',
      'placement',
      'virtual',
      'virtual-anchor',
      'virtual-x',
      'virtual-y',
      'arrow',
      'arrow-point-at-center',
      'auto-adjust-overflow',
      // A2 触发方式 / A4 延迟
      'trigger',
      'open-delay',
      'close-delay',
      'touch-delay',
      // B2 延迟组
      'skip-delay-duration',
      // A8 disabled / B3 interactive / B4 contextmenu / B5 touch
      'disabled',
      'interactive',
      // B6 挂载点
      'append-to',
      // B9 双轴偏移 / B13 碰撞细调
      'offset',
      'skidding',
      'collision-padding',
      // B10 颜色变体 / A7 max-width
      'color',
      'max-width',
      // C2 fresh / C3 auto-close / C4 trigger-keys / C1 merge
      'fresh',
      'auto-close',
      'trigger-keys',
      'arrow-position',
    ]
  }

  private tipEl: HTMLElement | null = null
  private anchor: Element | null = null
  /** 上次 open 状态（null = 未初始化，首帧不派发事件） */
  private prevOpen: boolean | null = null
  /** A6 Esc 关闭后 restoreFocus 的 focusin 会重新触发打开——关闭瞬间置位，忽略下一条 focusin */
  private suppressFocusOpen = false
  /** virtual-anchor 元素跟随的监听是否已挂 */
  private followOpen = false
  private followRaf = 0
  /** 延迟显示/隐藏定时器（A4，经 onCleanup 清理，无孤儿） */
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  /** touch 长按定时器（B5） */
  private touchTimer: ReturnType<typeof setTimeout> | null = null
  /** auto-close 定时器（C3） */
  private autoTimer: ReturnType<typeof setTimeout> | null = null
  /** 富内容插槽（A5） */
  private contentSlot: HTMLSlotElement | null = null
  /** B6 append-to：portal host 容器（目标容器内的 div + 独立 shadow，样式作用域保真） */
  private portalHost: HTMLElement | null = null
  /** tip 唯一 id（aria-describedby 指向，A6） */
  private tipId = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="tip" part="tip" role="tooltip" aria-hidden="true">
        <span class="tip-content" part="content"></span>
        <slot name="content"></slot>
        <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
      </div>
    `
  }

  /**
   * 触发元素宿主解析：默认首个子元素；若直接子元素是 disabled 表单控件
   * （不派发 mouse/focus 事件，B12），事件绑定到宿主（oas-tooltip 自身），
   * 让 span 包裹 / 宿主悬停都能触发。无子元素（虚拟/纯受控）也回落宿主。
   */
  private anchorHost(): Element {
    const child = this.querySelector(':scope > *')
    if (
      child &&
      child.matches(
        'button[disabled], input[disabled], select[disabled], textarea[disabled], [aria-disabled="true"]',
      )
    ) {
      return this
    }
    return child ?? this
  }

  /** 缓存节点引用 + 绑定触发事件（render 与水合路径共用；定位只在触发时计算） */
  private bind(): void {
    this.tipEl = this.shadow.querySelector('.tip')
    this.anchor = this.anchorHost()
    if (this.tipEl) {
      this.tipEl.id = `oas-tooltip-tip-${++tipSeq}`
      this.tipId = this.tipEl.id
      // 富内容插槽：slotchange → 内容源切换（属性文本 ↔ 插槽）
      this.contentSlot = this.tipEl.querySelector('slot[name="content"]')
      this.contentSlot?.addEventListener('slotchange', () => this.syncContent())
      // interactive（B3）：tip 自身 mouseenter 取消关闭、mouseleave 排程关闭
      this.tipEl.addEventListener('mouseenter', () => {
        if (this.hasAttr('interactive')) this.cancelHide()
      })
      this.tipEl.addEventListener('mouseleave', () => {
        if (this.hasAttr('interactive')) this.scheduleHide('hover')
      })
    }

    // A2 触发系统：统一绑定所有通道，handler 内按 trigger 属性启停（属性变化无需重绑）
    this.anchor?.addEventListener('mouseenter', () => this.scheduleShow('hover'))
    this.anchor?.addEventListener('mouseleave', () => this.scheduleHide('hover'))
    this.anchor?.addEventListener('focusin', () => {
      // A6 Esc 关闭还原焦点后，下一条 focusin 是"还原"而非用户交互——跳过
      if (this.suppressFocusOpen) {
        this.suppressFocusOpen = false
        return
      }
      this.scheduleShow('focus')
    })
    this.anchor?.addEventListener('focusout', () => this.scheduleHide('focus'))
    this.anchor?.addEventListener('click', () => {
      if (!this.triggerHas('click')) return
      if (this.hasAttr('open')) this.setOpen(false)
      else this.setOpen(true)
    })
    this.anchor?.addEventListener('contextmenu', () => {
      if (!this.triggerHas('contextmenu')) return
      // 不 preventDefault：保留浏览器系统菜单，仅打开 tooltip（B4）
      this.setOpen(true)
    })
    this.anchor?.addEventListener('keydown', (e) => this.onTriggerKey(e as KeyboardEvent))
    // B5 touch 长按：pointerdown 起 timer，up/cancel/leave 取消
    this.anchor?.addEventListener('pointerdown', (e) => this.onTouchStart(e as PointerEvent))
    this.anchor?.addEventListener('pointerup', () => this.cancelTouch())
    this.anchor?.addEventListener('pointercancel', () => this.cancelTouch())
    this.anchor?.addEventListener('pointerleave', () => this.cancelTouch())

    // 清理：定时器 + 模块级浮层栈 + portal host
    this.onCleanup(() => {
      this.cancelShow()
      this.cancelHide()
      this.cancelTouch()
      if (this.autoTimer) clearTimeout(this.autoTimer)
      unregisterTip(this)
      this.destroyPortal()
    })
  }

  /** C4 trigger-keys：焦点在触发元素上时按指定键打开 */
  private onTriggerKey(e: KeyboardEvent): void {
    const keys = this.getAttr('trigger-keys', '').split(/\s+/).filter(Boolean)
    if (keys.length && keys.includes(e.key)) {
      this.setOpen(true)
    }
  }

  /** B5 touch 长按：pointerdown 起 touch-delay 定时（默认 500ms），到点打开 */
  private onTouchStart(e: PointerEvent): void {
    if (!this.triggerHas('touch')) return
    if (e.pointerType === 'mouse') return // 桌面鼠标不走长按（touch/pen 才触发）
    this.cancelTouch()
    const delay = this.getNum('touch-delay', 500)
    this.touchTimer = setTimeout(() => this.setOpen(true), delay)
  }

  private cancelTouch(): void {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer)
      this.touchTimer = null
    }
  }

  /** trigger 空格分隔多选：trigger="hover click" → hover/click 双通道 */
  private triggerHas(name: string): boolean {
    if (this.hasAttr('virtual')) return false
    const raw = this.getAttr('trigger', 'hover focus')
    return raw.split(/\s+/).filter(Boolean).includes(name)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（气泡骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tip')) return false
    this.bind()
    return true
  }

  /**
   * 触发入口。虚拟模式（virtual）不绑定宿主元素，open 完全受外部控制，
   * 因此任何宿主 hover/focus 都不得改 open。manual trigger 时 handler 已过滤。
   * 公开（模块级 Esc 处理器需跨实例调用）。
   */
  setOpen(open: boolean): void {
    if (this.hasAttr('virtual')) return
    if (this.hasAttr('disabled')) return
    if (open) {
      // 状态未变时不重复写属性：同值 setAttribute 也会触发 attributeChangedCallback
      // （Chromium 实测），click → focusin 路径会多跑一次 update/重定位，
      // 与 hover 单开的落点产生分歧
      if (!this.hasAttr('open')) this.setAttribute('open', '')
    } else if (this.hasAttr('open')) {
      this.removeAttribute('open')
      lastCloseAt = Date.now()
    }
  }

  /**
   * A4 延迟打开：open-delay ms 后 open；B2 skipDelay 命中时跳过延迟立即打开。
   * hover 快速切换（open 定时未到又离开）会被 scheduleHide 取消，无残留定时器。
   * focus 通道单独走 open-delay（skipDelay 仅作用于连续 hover）。
   */
  private scheduleShow(trigger: 'hover' | 'focus'): void {
    if (!this.triggerHas(trigger)) return
    if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
    this.cancelHide()
    this.cancelShow()
    const skip = trigger === 'hover' && shouldSkipDelay(this.getNum('skip-delay-duration', 300))
    const delay = skip ? 0 : this.getNum('open-delay', 0)
    if (delay <= 0) {
      this.setOpen(true)
      return
    }
    this.showTimer = setTimeout(() => this.setOpen(true), delay)
  }

  /** A4 延迟关闭：close-delay ms 后 close */
  private scheduleHide(trigger: 'hover' | 'focus'): void {
    if (!this.triggerHas(trigger)) return
    if (this.hasAttr('virtual')) return
    this.cancelShow()
    this.cancelHide()
    const delay = this.getNum('close-delay', 0)
    if (delay <= 0) {
      this.setOpen(false)
      return
    }
    this.hideTimer = setTimeout(() => this.setOpen(false), delay)
  }

  private cancelShow(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer)
      this.showTimer = null
    }
  }

  private cancelHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }

  /** 数字属性解析：空/非法回落默认 */
  private getNum(name: string, fallback: number): number {
    const raw = this.getAttr(name, '')
    if (raw === '') return fallback
    const v = Number(raw)
    return Number.isFinite(v) && v >= 0 ? v : fallback
  }

  /** Esc 关闭后焦点还原到触发元素（公开：模块级 Esc 处理器可调用）。虚拟模式跳过 */
  restoreFocus(): void {
    if (this.hasAttr('virtual')) return
    this.suppressFocusOpen = true
    ;(this.anchor as HTMLElement | null)?.focus()
  }

  /**
   * A6 aria-describedby：打开时触发元素关联 tip id（role=tooltip 的描述关系）。
   * 虚拟模式无触发元素，跳过。关闭时移除（解除关联，避免描述残留）。
   */
  private syncDescribedBy(open: boolean): void {
    if (this.hasAttr('virtual')) return
    if (open) this.anchor?.setAttribute('aria-describedby', this.tipId)
    else this.anchor?.removeAttribute('aria-describedby')
  }

  /**
   * B6 append-to 挂载点：把 tip 移入目标容器内的 portal host（div + 独立 open shadow，
   * STYLE 注入其中保证样式作用域保真）。移入后 ::part(tip) 无法从宿主穿透
   * （跨 shadow 不可用），需用 CSS 变量或类选择器定制——文档明示。
   * append-to 移除时 tip 移回原 shadow，portal host 销毁。
   */
  private ensurePortal(): void {
    const sel = this.getAttr('append-to', '')
    if (!sel || !this.tipEl) {
      this.destroyPortal()
      return
    }
    const target =
      sel === 'body' ? document.body : (document.querySelector(sel) as HTMLElement | null)
    if (!target) {
      this.destroyPortal()
      return
    }
    if (this.portalHost && this.portalHost.parentElement === target) return
    this.destroyPortal()
    const host = document.createElement('div')
    host.setAttribute('data-oas-tooltip-portal', '')
    host.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: var(--oas-z-tooltip, 1080);'
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    root.appendChild(this.tipEl)
    this.portalHost = host
  }

  private destroyPortal(): void {
    if (this.portalHost) {
      // tip 移回原 shadow（保留其内部结构；STYLE 在原 shadow 内）
      if (this.tipEl && this.portalHost.shadowRoot?.contains(this.tipEl)) {
        this.shadow.appendChild(this.tipEl)
      }
      this.portalHost.remove()
      this.portalHost = null
    }
  }

  /** A5 富内容源切换：slot 有 assignedNodes → 隐藏属性文本容器；否则显示属性文本 */
  private syncContent(): void {
    if (!this.tipEl || !this.contentSlot) return
    const hasRich = this.contentSlot.assignedNodes({ flatten: true }).length > 0
    const textEl = this.tipEl.querySelector<HTMLElement>('.tip-content')
    if (!textEl) return
    textEl.hidden = hasRich
  }

  /**
   * B10 颜色变体（ui-spec §4.1 协议）：语义 4 色 + 11 预设名 + 任意 CSS 色值。
   * 通过 tip 上的 --oas-tooltip-bg / --oas-tooltip-color 变量注入（token 引用，含 dark 变体），
   * 箭头底色同 --oas-tooltip-bg。移除 color 属性后清空变量回落默认（text-primary/bg）。
   */
  private syncColor(): void {
    if (!this.tipEl) return
    const color = this.getAttr('color', '')
    if (!color) {
      this.tipEl.style.removeProperty('--oas-tooltip-bg')
      this.tipEl.style.removeProperty('--oas-tooltip-color')
      return
    }
    const semantic: Record<string, [string, string]> = {
      primary: ['var(--oas-color-primary)', 'var(--oas-color-text-on-primary)'],
      success: ['var(--oas-color-success)', 'var(--oas-color-text-on-success)'],
      warning: ['var(--oas-color-warning)', 'var(--oas-color-text-on-warning)'],
      danger: ['var(--oas-color-danger)', 'var(--oas-color-text-on-danger)'],
    }
    const preset =
      /^(magenta|red|volcano|orange|gold|lime|green|cyan|blue|geekblue|purple)$/.test(color)
    const { bg, on } = semantic[color]
      ? { bg: semantic[color][0], on: semantic[color][1] }
      : preset
        ? { bg: `var(--oas-preset-${color})`, on: 'var(--oas-color-text-on-primary)' }
        : { bg: color, on: this.pickOnColor(color) }
    this.tipEl.style.setProperty('--oas-tooltip-bg', bg)
    this.tipEl.style.setProperty('--oas-tooltip-color', on)
  }

  /** 任意色值实心底的文字色：按相对亮度取深/浅（#rgb/#rrggbb/rgb(a) 可解析；其余回落白字 token） */
  private pickOnColor(color: string): string {
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
      return 'var(--oas-color-text-on-primary)'
    }
    const f = (v: number): number => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    const lum = 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    return lum > 0.35 ? 'var(--oas-color-text-primary)' : 'var(--oas-color-text-on-primary)'
  }

  /** A7 max-width：数字补 px 或 CSS 长度（token 开口 --oas-tooltip-max-width 兜底 240px） */
  private syncMaxWidth(): void {
    if (!this.tipEl) return
    const raw = this.getAttr('max-width', '')
    if (!raw) {
      this.tipEl.style.maxWidth = ''
      return
    }
    this.tipEl.style.maxWidth = /^\d+$/.test(raw) ? `${raw}px` : raw
  }

  /** C3 auto-close：打开后 auto-close ms 自动关闭（0 或缺省 = 不自动关闭） */
  private syncAutoClose(open: boolean): void {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer)
      this.autoTimer = null
    }
    if (!open) return
    const ms = this.getNum('auto-close', 0)
    if (ms > 0) this.autoTimer = setTimeout(() => this.setOpen(false), ms)
  }

  protected override update(): void {
    if (!this.tipEl) return
    const open = this.hasAttr('open') && !this.hasAttr('disabled')
    this.tipEl.setAttribute('aria-hidden', String(!open))
    // B1 动画：打开时加 tip-enter（播放方向感知进场动画）；关闭移除
    this.tipEl.classList.toggle('tip-enter', open)
    // A8 disabled：禁用时数据属性同步（供 :host 无感知时的样式/语义钩子）
    this.tipEl.setAttribute('data-interactive', this.hasAttr('interactive') ? 'true' : 'false')
    // C1 merge 箭头：data-arrow-position 同步（CSS 按 placement 选择器融合）
    this.tipEl.setAttribute('data-arrow-position', this.getAttr('arrow-position', 'center'))
    // A5 内容：fresh 默认 true（关闭时也持续更新）；fresh="false" 仅打开时写入
    const fresh = this.getAttr('fresh', 'true') !== 'false'
    if (fresh || open) {
      this.tipEl.querySelector<HTMLElement>('.tip-content')!.textContent = this.getAttr(
        'content',
        '',
      )
    }
    this.syncContent()
    // 箭头显隐：arrow 布尔属性默认 true（显示），arrow="false" 隐藏；元素与 ::part(arrow) 保留
    const arrow = this.tipEl.querySelector<HTMLElement>('[data-popper-arrow]')
    if (arrow) arrow.hidden = !this.showArrow()
    // B10 颜色变体 / A7 max-width
    this.syncColor()
    this.syncMaxWidth()
    // A6 aria-describedby 关联
    this.syncDescribedBy(open)
    // C3 auto-close
    this.syncAutoClose(open)
    // open 状态迁移（受控 setAttribute 与触发都会走到这里）→ oas-open-change
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    // 模块级浮层栈（Esc 关闭用）：打开注册、关闭注销
    if (open) registerTip(this)
    else unregisterTip(this)
    // B6 append-to 挂载点
    this.ensurePortal()
    this.syncFollow(open)
    if (!open) return
    this.position()
  }

  /** arrow 布尔属性：默认 true（显示箭头），仅 arrow="false" 隐藏 */
  private showArrow(): boolean {
    return this.getAttr('arrow', 'true') !== 'false'
  }

  /** 计算当前锚点矩形：虚拟坐标 > 虚拟锚点元素 > 默认宿主锚点 */
  private anchorRect(): DOMRect | null {
    if (this.hasAttr('virtual')) {
      const x = parseFloat(this.getAttr('virtual-x'))
      const y = parseFloat(this.getAttr('virtual-y'))
      if (Number.isFinite(x) && Number.isFinite(y)) {
        // 0 尺寸点位：按鼠标/指定坐标定位（视口坐标）
        return { left: x, top: y, right: x, bottom: y, width: 0, height: 0 } as DOMRect
      }
      const sel = this.getAttr('virtual-anchor')
      if (sel) {
        const el = document.querySelector(sel)
        if (el) return el.getBoundingClientRect()
      }
      return null // 解析失败：不定位（open 仍保持语义，但无锚点）
    }
    return this.anchor?.getBoundingClientRect() ?? null
  }

  /** 定位写入：锚点矩形 + placement（12 向）→ computePosition（offset/skidding/collisionPadding） */
  private position(): void {
    if (!this.tipEl) return
    const anchorRect = this.anchorRect()
    if (!anchorRect) return
    const popup = this.popupRect()
    const placement = this.getAttr('placement', 'top') as Placement
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const offset = this.getNum('offset', 8)
    const skidding = this.getNum('skidding', 0)
    const padding = this.getNum('collision-padding', 4)
    const { top, left, placement: actual } = computePosition(
      anchorRect,
      popup,
      placement,
      { width: window.innerWidth, height: window.innerHeight },
      offset,
      autoAdjust,
      { skidding, collisionPadding: padding },
    )
    this.tipEl.style.top = `${top}px`
    this.tipEl.style.left = `${left}px`
    this.tipEl.setAttribute('data-placement', actual)
    this.syncRadiusCap(actual)
    this.positionArrow(anchorRect, actual)
  }

  /**
   * 窄气泡圆角封顶（箭头接缝防收腰）：气泡交叉轴直边段（尺寸 − 2×radius）小于箭头底宽
   * （8px 方形旋转 45° 的对角投影 8√2 ≈ 11.31px）时，圆角曲线侵入箭头底边衔接区，
   * 接缝两侧出现凹口（空内容等窄气泡尤为明显）。把交叉轴布局尺寸写入
   * --oas-tip-cross，由 .tip 的 border-radius max/min 表达式封顶，保证直边段 ≥ 箭头底宽。
   * 布局尺寸优先 offset*（不受 tip-enter 动画 scale 污染）；无布局尺寸（无布局引擎的
   * 测试环境）时移除变量回落不封顶，token 定制保真。
   */
  private syncRadiusCap(actual: Placement): void {
    if (!this.tipEl) return
    const vertical = actual.startsWith('top') || actual.startsWith('bottom')
    const cross = vertical ? this.tipEl.offsetWidth : this.tipEl.offsetHeight
    if (cross > 0) this.tipEl.style.setProperty('--oas-tip-cross', `${cross}px`)
    else this.tipEl.style.removeProperty('--oas-tip-cross')
  }

  /**
   * 浮层自身尺寸测量：优先 offsetWidth/offsetHeight（布局尺寸，不含 transform）。
   * tip-enter 进场动画的 scale(0.9) 会污染 getBoundingClientRect（打开瞬间的首帧测量
   * 拿到缩小 ~10% 的宽高），导致居中/间距/翻转判定按错误尺寸计算，且不同触发路径
   * （hover 即时打开 vs focus 稍后重定位）测量时机不同会造成落点分歧。
   * offset* 为 0 时（无布局引擎的测试环境 / display:none）回落 getBoundingClientRect。
   */
  private popupRect(): DOMRect {
    const rect = this.tipEl!.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: this.tipEl!.offsetWidth || rect.width,
      height: this.tipEl!.offsetHeight || rect.height,
    } as DOMRect
  }

  /**
   * 箭头交叉轴指向：arrow-point-at-center 时箭头对齐锚点中心（面板被视口避让
   * 偏移后仍指向锚点），默认保持面板交叉轴中心（CSS 规则按 data-placement 定位）。
   * 锚点中心与面板中心重合（未偏移 / virtual 0 尺寸锚点）时不留内联样式，两种模式视觉等价。
   */
  private positionArrow(anchorRect: DOMRect, actual: Placement): void {
    if (!this.tipEl) return
    const arrow = this.tipEl.querySelector<HTMLElement>('[data-popper-arrow]')
    if (!arrow) return
    arrow.style.left = ''
    arrow.style.top = ''
    if (!this.hasAttr('arrow-point-at-center')) return
    const vertical = actual.startsWith('top') || actual.startsWith('bottom')
    const rect = this.tipEl.getBoundingClientRect()
    // 交叉轴尺寸用布局尺寸（offset*，不受进场动画 scale 污染），0 时回落 rect
    const crossSize = vertical
      ? this.tipEl.offsetWidth || rect.width
      : this.tipEl.offsetHeight || rect.height
    const popupEdge = vertical
      ? parseFloat(this.tipEl.style.left)
      : parseFloat(this.tipEl.style.top)
    const anchorCrossCenter = vertical
      ? anchorRect.left + anchorRect.width / 2
      : anchorRect.top + anchorRect.height / 2
    const size = crossSize
    if (!Number.isFinite(size) || size <= 0) return
    // 锚点中心映射到面板局部坐标，夹取到面板内（4px 边距），避免箭头探出面板
    const local = anchorCrossCenter - popupEdge
    const clamped = Math.max(4, Math.min(local, size - 4))
    if (Math.abs(clamped - size / 2) <= 0.5) return // 与面板中心重合 → 走 CSS 居中
    if (vertical) arrow.style.left = `${clamped - 4}px`
    else arrow.style.top = `${clamped - 4}px`
  }

  /**
   * virtual-anchor 元素跟随：锚点元素可能随滚动/缩放移动，打开期间监听
   * scroll（capture 捕获容器滚动）与 resize，rAF 节流重定位。坐标模式与
   * 普通锚点模式无需跟随（视口坐标不随滚动变化）。
   */
  private syncFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    const track =
      open &&
      this.hasAttr('virtual') &&
      !this.hasVirtualPoint() &&
      this.getAttr('virtual-anchor') !== ''
    if (track && !this.followOpen) {
      this.followOpen = true
      window.addEventListener('scroll', this.onFollowScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onFollowScroll)
      this.onCleanup(() => {
        window.removeEventListener('scroll', this.onFollowScroll, { capture: true })
        window.removeEventListener('resize', this.onFollowScroll)
      })
    } else if (!track && this.followOpen) {
      this.followOpen = false
      window.removeEventListener('scroll', this.onFollowScroll, { capture: true })
      window.removeEventListener('resize', this.onFollowScroll)
    }
  }

  private hasVirtualPoint(): boolean {
    const x = parseFloat(this.getAttr('virtual-x'))
    const y = parseFloat(this.getAttr('virtual-y'))
    return Number.isFinite(x) && Number.isFinite(y)
  }

  private onFollowScroll = (): void => {
    cancelAnimationFrame(this.followRaf)
    this.followRaf = requestAnimationFrame(() => {
      if (!this.tipEl || !this.hasAttr('open')) return
      this.position()
    })
  }
}
