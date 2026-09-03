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
  /* border-box：width="trigger"/数字宽定制按视觉外宽对齐（content-box 下 offsetWidth
     会多出 padding，导致"与触发同宽"实际更宽） */
  box-sizing: border-box;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-tooltip, 1080));
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
     （top 系从底边展开、bottom 系从顶边展开，left/right 同理）。
     时长/缓动/动画名走 CSS 变量开口（--oas-tooltip-duration/--oas-tooltip-easing/
     --oas-tooltip-animation），宿主在 <oas-tooltip> 上设置即可穿透（CSS 变量继承过 shadow）；
     --oas-tooltip-animation: none 可关闭进场动画（配合 reduced-motion 兜底） */
  transform-origin: center;
  transition:
    opacity var(--oas-tooltip-duration, 0.15s) var(--oas-tooltip-easing, ease),
    transform var(--oas-tooltip-duration, 0.15s) var(--oas-tooltip-easing, ease);
}
.tip[aria-hidden='true'] {
  display: none;
}
.tip.tip-enter {
  animation: var(--oas-tooltip-animation, oas-tooltip-in) var(--oas-tooltip-duration, 0.15s)
    var(--oas-tooltip-easing, ease);
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
/* 箭头：尺寸走 CSS 变量 token --oas-tooltip-arrow-size（默认 12px，宿主可穿透定制），
   正方形旋转 45°，底色与气泡同色，按 data-placement 落在面板对应边上，尖端指向锚点中心。
   merge 直角三角形态是独立视觉（贴角共边几何按 8px 盒校准，不随 --oas-tooltip-arrow-size 走，
   其契约见 merge 段注释）。 */
.arrow {
  position: absolute;
  width: var(--oas-tooltip-arrow-size, 12px);
  height: var(--oas-tooltip-arrow-size, 12px);
  background: var(--oas-tooltip-bg, var(--oas-color-text-primary));
  transform: rotate(45deg);
  pointer-events: none;
}
/* ===== 主轴悬边（12 向通用：bottom 系悬顶边、top 系悬底边、left 系悬右边、right 系悬左边） =====
   悬边量 = 箭头尺寸/2 的负值（盒跨面板边一半在外一半在内，旋转后菱心骑边、尖端外探） */
.tip[data-placement^='bottom'] .arrow {
  top: calc(var(--oas-tooltip-arrow-size, 12px) / -2);
}
.tip[data-placement^='top'] .arrow {
  bottom: calc(var(--oas-tooltip-arrow-size, 12px) / -2);
}
.tip[data-placement^='left'] .arrow {
  right: calc(var(--oas-tooltip-arrow-size, 12px) / -2);
}
.tip[data-placement^='right'] .arrow {
  left: calc(var(--oas-tooltip-arrow-size, 12px) / -2);
}
/* ===== 交叉轴（12 向：center 居中、start 靠起点侧 16px、end 靠终点侧 16px） ===== */
.tip[data-placement='top'] .arrow,
.tip[data-placement='bottom'] .arrow {
  left: calc(50% - var(--oas-tooltip-arrow-size, 12px) / 2);
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
  top: calc(50% - var(--oas-tooltip-arrow-size, 12px) / 2);
}
.tip[data-placement='left-start'] .arrow,
.tip[data-placement='right-start'] .arrow {
  top: 16px;
}
.tip[data-placement='left-end'] .arrow,
.tip[data-placement='right-end'] .arrow {
  bottom: 16px;
}
/* ===== 箭头 merge 模式：直角三角与面板角共边融合（仅 *-start/*-end 生效） =====
   该角 radius 置零；箭头为不旋转的 8px 方块整悬面板外、贴齐角两边（主轴边外 -8px、
   起止侧边线对齐 0），clip-path 裁成直角三角——直角顶点精确落面板角点，两条直角边
   与面板角两边共线，斜边 45° 朝面板内，尖端从角点正交外探 8px 指向锚点侧
   （视觉是「面板角本身伸出的直角尖」）。逐向写死（不能用 $='-start'/'-end' 后缀
   匹配——它对 12 向恒取顶角/恒写水平轴，top 系零错角、left-start 箭头会被拉到
   对侧边、*-end 箭头距角 16px 贴不上）：
   bottom 系悬顶边（start→左上角、end→右上角）、top 系悬底边（start→左下角、
   end→右下角）、left 系悬右边（start→右上角、end→右下角）、right 系悬左边
    （start→左上角、end→左下角） */
/* merge 固定 8px 盒（独立于标准 12px 菱形）：几何契约（直角顶点贴角点 / 边 8px、尖 8px）按 8px 校准，
   不随 .arrow 统一尺寸走——merge 是面板角贴角直角三角，与标准菱形是两套视觉。 */
.tip[data-arrow-position='merge'] .arrow {
  width: 8px;
  height: 8px;
}
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
/* 箭头直角三角贴角：盒整悬面板外（主轴边外 -8px）、起止侧边线贴齐（覆盖 16px 让位
   与 center 居中规则），transform 还原不旋转（覆盖基础菱形 rotate(45deg)），clip-path
   裁直角三角——polygon 的 90° 顶点即面板角点（盒贴角 + 顶点在盒角） */
.tip[data-arrow-position='merge'][data-placement='bottom-start'] .arrow {
  top: -8px;
  left: 0;
  transform: none;
  clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
}
.tip[data-arrow-position='merge'][data-placement='bottom-end'] .arrow {
  top: -8px;
  right: 0;
  transform: none;
  clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
}
.tip[data-arrow-position='merge'][data-placement='top-start'] .arrow {
  bottom: -8px;
  left: 0;
  transform: none;
  clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
}
.tip[data-arrow-position='merge'][data-placement='top-end'] .arrow {
  bottom: -8px;
  right: 0;
  transform: none;
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%);
}
.tip[data-arrow-position='merge'][data-placement='left-start'] .arrow {
  right: -8px;
  top: 0;
  transform: none;
  clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
}
.tip[data-arrow-position='merge'][data-placement='left-end'] .arrow {
  right: -8px;
  bottom: 0;
  transform: none;
  clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
}
.tip[data-arrow-position='merge'][data-placement='right-start'] .arrow {
  left: -8px;
  top: 0;
  transform: none;
  clip-path: polygon(0% 0%, 100% 0%, 100% 100%);
}
.tip[data-arrow-position='merge'][data-placement='right-end'] .arrow {
  left: -8px;
  bottom: 0;
  transform: none;
  clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
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
  top.setOpen(false, 'escape', 'escape-key')
  top.restoreFocus()
}

// ============ 全局单例 skipDelay：记录上次关闭时刻，连续悬停跳过 open-delay ============
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
      // 触发方式 / 延迟
      'trigger',
      'open-delay',
      'close-delay',
      'touch-delay',
      // 延迟组
      'skip-delay-duration',
      // disabled / interactive / contextmenu / touch
      'disabled',
      'interactive',
      // 挂载点
      'append-to',
      // 双轴偏移 / 碰撞细调
      'offset',
      'skidding',
      'collision-padding',
      // 颜色变体 / max-width
      'color',
      'max-width',
      // fresh / auto-close / trigger-keys / merge
      'fresh',
      'auto-close',
      'trigger-keys',
      'arrow-position',
      // —— 增强批（2026-09）：滚动关闭 / a11y 语义 / 箭头偏移 / 宽随触发 / 定位高级 / 光标跟随 ——
      'close-on-scroll',
      'a11y',
      'arrow-offset',
      'width',
      'fallback-placements',
      'collision-boundary',
      'fallback-axis-side',
      'follow-cursor',
    ]
  }

  private tipEl: HTMLElement | null = null
  private anchor: Element | null = null
  /** 上次 open 状态（null = 未初始化，首帧不派发事件） */
  private prevOpen: boolean | null = null
  /** Esc 关闭后 restoreFocus 的 focusin 会重新触发打开——关闭瞬间置位，忽略下一条 focusin */
  private suppressFocusOpen = false
  /** virtual-anchor 元素跟随的监听是否已挂 */
  private followOpen = false
  private followRaf = 0
  /** 延迟显示/隐藏定时器（经 onCleanup 清理，无孤儿） */
  private showTimer: ReturnType<typeof setTimeout> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  /** touch 长按定时器 */
  private touchTimer: ReturnType<typeof setTimeout> | null = null
  /** auto-close 定时器 */
  private autoTimer: ReturnType<typeof setTimeout> | null = null
  /** 富内容插槽 */
  private contentSlot: HTMLSlotElement | null = null
  /** append-to：portal host 容器（目标容器内的 div + 独立 shadow，样式作用域保真） */
  private portalHost: HTMLElement | null = null
  /** tip 唯一 id（aria-describedby/labelledby 指向，A6） */
  private tipId = ''
  /** 打开原因追踪：oas-open-change detail 携带触发来源/原因（emit 后清空） */
  private lastSource = ''
  private lastReason = ''
  /** 锚点 a11y 关联属性的原值缓存（aria-describedby / aria-labelledby）：打开前读取、关闭时还原 */
  private ariaOriginal: Record<string, string | null> = {}
  /** follow-cursor：最近一次光标视口坐标（rAF 节流写入，定位走 virtual 点通道） */
  private cursorX = NaN
  private cursorY = NaN
  private cursorRaf = 0
  /** collision-boundary property 通道持有的元素（优先于属性选择器，同 hover-card 模式） */
  private collisionBoundaryEl: Element | null = null

  /** collision-boundary property 通道（宿主直接传元素；与属性选择器并存，property 优先） */
  get collisionBoundary(): Element | null {
    return this.collisionBoundaryEl
  }

  set collisionBoundary(el: Element | null) {
    this.collisionBoundaryEl = el
    if (this.tipEl && this.hasAttr('open')) this.position()
  }

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
      // interactive：tip 自身 mouseenter 取消关闭、mouseleave 排程关闭
      this.tipEl.addEventListener('mouseenter', () => {
        if (this.hasAttr('interactive')) this.cancelHide()
      })
      this.tipEl.addEventListener('mouseleave', () => {
        if (this.hasAttr('interactive')) this.scheduleHide('hover')
      })
    }

    // 触发系统：统一绑定所有通道，handler 内按 trigger 属性启停（属性变化无需重绑）
    this.anchor?.addEventListener('mouseenter', () => this.scheduleShow('hover'))
    this.anchor?.addEventListener('mouseleave', () => this.scheduleHide('hover'))
    this.anchor?.addEventListener('focusin', () => {
      // Esc 关闭还原焦点后，下一条 focusin 是"还原"而非用户交互——跳过
      if (this.suppressFocusOpen) {
        this.suppressFocusOpen = false
        return
      }
      this.scheduleShow('focus')
    })
    this.anchor?.addEventListener('focusout', () => this.scheduleHide('focus'))
    this.anchor?.addEventListener('click', () => {
      if (!this.triggerHas('click')) return
      if (this.hasAttr('open')) this.setOpen(false, 'click')
      else this.setOpen(true, 'click')
    })
    this.anchor?.addEventListener('contextmenu', () => {
      if (!this.triggerHas('contextmenu')) return
      // 不 preventDefault：保留浏览器系统菜单，仅打开 tooltip
      this.setOpen(true, 'contextmenu')
    })
    this.anchor?.addEventListener('keydown', (e) => this.onTriggerKey(e as KeyboardEvent))
    // touch 长按：pointerdown 起 timer，up/cancel/leave 取消
    this.anchor?.addEventListener('pointerdown', (e) => this.onTouchStart(e as PointerEvent))
    this.anchor?.addEventListener('pointerup', () => this.cancelTouch())
    this.anchor?.addEventListener('pointercancel', () => this.cancelTouch())
    this.anchor?.addEventListener('pointerleave', () => this.cancelTouch())
    // follow-cursor：光标在锚点范围内移动 → 内部记录光标坐标并重定位（rAF 节流）
    this.anchor?.addEventListener('pointermove', (e) => this.onCursorMove(e as PointerEvent))

    // 清理：定时器 + 模块级浮层栈 + 全局监听（滚动重定位/外点关闭）+ portal host
    this.onCleanup(() => {
      this.cancelShow()
      this.cancelHide()
      this.cancelTouch()
      if (this.autoTimer) clearTimeout(this.autoTimer)
      unregisterTip(this)
      this.untrackScroll()
      document.removeEventListener('pointerdown', this.onDocPointerDown, true)
      this.destroyPortal()
    })
  }

  /** follow-cursor：光标在锚点上移动时记录坐标（rAF 节流写入，打开时重定位） */
  private onCursorMove(e: PointerEvent): void {
    if (!this.hasAttr('follow-cursor')) return
    if (e.pointerType === 'mouse' || e.pointerType === '') {
      this.cursorX = e.clientX
      this.cursorY = e.clientY
      if (!this.hasAttr('open')) return
      cancelAnimationFrame(this.cursorRaf)
      this.cursorRaf = requestAnimationFrame(() => {
        if (!this.tipEl || !this.hasAttr('open')) return
        this.position()
      })
    }
  }

  /** trigger-keys：焦点在触发元素上时按指定键打开 */
  private onTriggerKey(e: KeyboardEvent): void {
    const keys = this.getAttr('trigger-keys', '').split(/\s+/).filter(Boolean)
    if (keys.length && keys.includes(e.key)) {
      this.setOpen(true, 'key')
    }
  }

  /** touch 长按：pointerdown 起 touch-delay 定时（默认 500ms），到点打开。
      仅在指针类型非鼠标时生效（桌面 mouse 不参与长按，touch/pen 才触发） */
  private onTouchStart(e: PointerEvent): void {
    if (e.pointerType === 'mouse') return // 桌面鼠标不走长按（touch/pen 才触发）
    if (!this.triggerHas('touch')) return
    this.cancelTouch()
    const delay = this.getNum('touch-delay', 500)
    this.touchTimer = setTimeout(() => this.setOpen(true, 'touch', 'long-press'), delay)
  }

  private cancelTouch(): void {
    if (this.touchTimer) {
      clearTimeout(this.touchTimer)
      this.touchTimer = null
    }
  }

  /** trigger 空格分隔多选：trigger="hover click" → hover/click 双通道。
      缺省 = hover focus touch（touch 并入默认：触屏长按开箱即用，桌面鼠标被 onTouchStart 过滤） */
  private triggerHas(name: string): boolean {
    if (this.hasAttr('virtual')) return false
    const raw = this.getAttr('trigger', 'hover focus touch')
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
   * source/reason 记录打开原因供 oas-open-change detail（emit 后清空）。
   * 公开（模块级 Esc 处理器需跨实例调用）。
   */
  setOpen(open: boolean, source = '', reason = ''): void {
    if (this.hasAttr('virtual')) return
    if (this.hasAttr('disabled')) return
    if (source) {
      this.lastSource = source
      this.lastReason = reason
    }
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
   * 延迟打开：open-delay ms 后 open；skipDelay 命中时跳过延迟立即打开。
   * hover 快速切换（open 定时未到又离开）会被 scheduleHide 取消，无残留定时器。
   * P18：focus 通道不走 open-delay（键盘用户已主动定位，等待无信息量）——
   * 跳过延迟立即打开；skipDelay 仅作用于连续 hover。
   */
  private scheduleShow(trigger: 'hover' | 'focus'): void {
    if (!this.triggerHas(trigger)) return
    if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
    this.cancelHide()
    this.cancelShow()
    if (trigger === 'focus') {
      this.setOpen(true, 'focus')
      return
    }
    const skip = shouldSkipDelay(this.getNum('skip-delay-duration', 300))
    const delay = skip ? 0 : this.getNum('open-delay', 0)
    if (delay <= 0) {
      this.setOpen(true, 'hover')
      return
    }
    this.showTimer = setTimeout(() => this.setOpen(true, 'hover', 'delay'), delay)
  }

  /** 延迟关闭：close-delay ms 后 close。P17 校准结论（档案）：默认值保持 0（浮层
      pointer-events:none 不拦截指针，移出即关对点击穿透友好）；富内容/可悬停场景
      建议显式 close-delay + interactive 组合（文档引导，破坏面零） */
  private scheduleHide(trigger: 'hover' | 'focus'): void {
    if (!this.triggerHas(trigger)) return
    if (this.hasAttr('virtual')) return
    this.cancelShow()
    this.cancelHide()
    const delay = this.getNum('close-delay', 0)
    if (delay <= 0) {
      this.setOpen(false, trigger)
      return
    }
    this.hideTimer = setTimeout(() => this.setOpen(false, trigger, 'delay'), delay)
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

  /** a11y 语义模式：description（默认，锚点挂 aria-describedby）/ label（锚点挂 aria-labelledby 作可访问名） */
  private a11yMode(): 'description' | 'label' {
    return this.getAttr('a11y', 'description') === 'label' ? 'label' : 'description'
  }

  /** 当前 a11y 模式对应的关联属性名 */
  private ariaAttrName(): string {
    return this.a11yMode() === 'label' ? 'aria-labelledby' : 'aria-describedby'
  }

  /**
   * a11y 关联（P3）：打开时触发元素挂 tip id（role=tooltip 的语义关系）——
   * description（默认）挂 aria-describedby（描述语义）；label 挂 aria-labelledby
   * （可访问名语义，icon-only 触发器场景）。
   * 修复曾现覆盖缺陷：打开前缓存锚点同属性原值，关闭时还原而非无条件 remove
   * （保存原值、关闭还原）——不破坏宿主自设的 a11y 关联；description ↔ label
   * 运行时切换先把另一属性的临时值还原，避免双挂残留。虚拟模式无触发元素，跳过。
   */
  private syncDescribedBy(open: boolean): void {
    if (this.hasAttr('virtual')) return
    if (!this.anchor) return
    if (open) {
      const attr = this.ariaAttrName()
      // 模式切换：先把另一关联属性的 tooltip 临时值还原为原值，避免双属性同挂
      for (const cached of Object.keys(this.ariaOriginal)) {
        if (cached === attr) continue
        const original = this.ariaOriginal[cached]
        if (original == null) this.anchor.removeAttribute(cached)
        else this.anchor.setAttribute(cached, original)
        delete this.ariaOriginal[cached]
      }
      if (!(attr in this.ariaOriginal)) this.ariaOriginal[attr] = this.anchor.getAttribute(attr)
      this.anchor.setAttribute(attr, this.tipId)
    } else {
      for (const attr of Object.keys(this.ariaOriginal)) {
        const original = this.ariaOriginal[attr]
        if (original == null) this.anchor.removeAttribute(attr)
        else this.anchor.setAttribute(attr, original)
      }
      this.ariaOriginal = {}
    }
  }

  /**
   * append-to 挂载点：把 tip 移入目标容器内的 portal host（div + 独立 open shadow，
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
    if (this.portalHost && this.portalHost.parentElement === target) {
      this.bridgeSlotContent(this.portalHost)
      return
    }
    this.destroyPortal()
    const host = document.createElement('div')
    host.setAttribute('data-oas-tooltip-portal', '')
    host.style.cssText =
      'position: fixed; inset: 0; pointer-events: none; z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-tooltip, 1080));'
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    root.appendChild(this.tipEl)
    this.portalHost = host
    this.bridgeSlotContent(host)
  }

  /**
   * slot 桥接（与 popover P2 同族修复）：tip 内 <slot name="content"> 的分配只看「直接
   * host」——tip 搬进 portal shadow 后宿主 light DOM 的 [slot=content] 节点分配不到
   * （富内容在 portal 下不显示）。桥接：把这些节点同步移入 portal host 的 light DOM
   * （物理同 host，分配恢复），拆除时移回宿主。幂等（已在 host 内为 no-op）。
   */
  private bridgeSlotContent(host: HTMLElement): void {
    for (const n of this.querySelectorAll<HTMLElement>('[slot="content"]')) {
      host.appendChild(n)
    }
  }

  private destroyPortal(): void {
    if (this.portalHost) {
      // tip 移回原 shadow（保留其内部结构；STYLE 在原 shadow 内）
      if (this.tipEl && this.portalHost.shadowRoot?.contains(this.tipEl)) {
        this.shadow.appendChild(this.tipEl)
      }
      for (const n of this.portalHost.querySelectorAll<HTMLElement>('[slot="content"]')) {
        this.appendChild(n)
      }
      this.portalHost.remove()
      this.portalHost = null
    }
  }

  /** 富内容源切换：slot 有 assignedNodes → 隐藏属性文本容器；否则显示属性文本 */
  private syncContent(): void {
    if (!this.tipEl || !this.contentSlot) return
    const hasRich = this.contentSlot.assignedNodes({ flatten: true }).length > 0
    const textEl = this.tipEl.querySelector<HTMLElement>('.tip-content')
    if (!textEl) return
    textEl.hidden = hasRich
  }

  /**
   * 颜色变体（ui-spec §4.1 协议）：语义 4 色 + 11 预设名 + 任意 CSS 色值。
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
    const preset = /^(magenta|red|volcano|orange|gold|lime|green|cyan|blue|geekblue|purple)$/.test(
      color,
    )
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

  /** max-width：数字补 px 或 CSS 长度（token 开口 --oas-tooltip-max-width 兜底 240px） */
  private syncMaxWidth(): void {
    if (!this.tipEl) return
    const raw = this.getAttr('max-width', '')
    if (!raw) {
      this.tipEl.style.maxWidth = ''
      return
    }
    this.tipEl.style.maxWidth = /^\d+$/.test(raw) ? `${raw}px` : raw
  }

  /**
   * 宽度定制（P8，与库内 popover/hover-card 宽语义一致）：width 数字 → px；'trigger' → 与触发
   * 元素同宽；其余按 CSS 值（如 50%、240px）。未设置清空内联。虚拟 0 尺寸点位（宽 0）
   * 视为未设置。宽随触发器仍受 --oas-tooltip-max-width（默认 240px）封顶，需更宽可配。
   */
  private syncWidth(): void {
    if (!this.tipEl) return
    const raw = this.getAttr('width', '').trim()
    if (!raw) {
      this.tipEl.style.width = ''
      return
    }
    if (raw === 'trigger') {
      const r = this.anchorRect()
      if (r && r.width > 0) this.tipEl.style.width = `${r.width}px`
      else this.tipEl.style.width = ''
      return
    }
    this.tipEl.style.width = /^\d+$/.test(raw) ? `${raw}px` : raw
  }

  /** auto-close：打开后 auto-close ms 自动关闭（0 或缺省 = 不自动关闭） */
  private syncAutoClose(open: boolean): void {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer)
      this.autoTimer = null
    }
    if (!open) return
    const ms = this.getNum('auto-close', 0)
    if (ms > 0) this.autoTimer = setTimeout(() => this.setOpen(false, 'auto-close', 'timeout'), ms)
  }

  protected override update(): void {
    if (!this.tipEl) return
    const open = this.hasAttr('open') && !this.hasAttr('disabled')
    this.tipEl.setAttribute('aria-hidden', String(!open))
    // 动画：打开时加 tip-enter（播放方向感知进场动画）；关闭移除
    this.tipEl.classList.toggle('tip-enter', open)
    // disabled：禁用时数据属性同步（供 :host 无感知时的样式/语义钩子）
    this.tipEl.setAttribute('data-interactive', this.hasAttr('interactive') ? 'true' : 'false')
    // merge 箭头：data-arrow-position 同步（CSS 按 placement 选择器融合）
    this.tipEl.setAttribute('data-arrow-position', this.getAttr('arrow-position', 'center'))
    // 内容：fresh 默认 true（关闭时也持续更新）；fresh="false" 仅打开时写入
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
    // 颜色变体 / max-width
    this.syncColor()
    this.syncMaxWidth()
    // 宽随触发器 / a11y 关联 / auto-close
    this.syncWidth()
    this.syncDescribedBy(open)
    this.syncAutoClose(open)
    // open 状态迁移（受控 setAttribute 与触发都会走到这里）→ oas-open-change
    if (this.prevOpen !== null && this.prevOpen !== open) {
      // detail 携带触发来源/原因（P9）：无 source 记录 = 外部受控 setAttribute 路径
      const source = this.lastSource || 'attribute'
      const reason = this.lastReason || (source === 'attribute' ? 'attribute' : '')
      this.emit('open-change', { open, source, reason })
      this.lastSource = ''
      this.lastReason = ''
    }
    this.prevOpen = open
    // 模块级浮层栈（Esc 关闭用）：打开注册、关闭注销
    if (open) registerTip(this)
    else unregisterTip(this)
    // append-to 挂载点
    this.ensurePortal()
    this.syncScrollFollow(open)
    this.syncOutsideDismiss(open)
    if (!open) return
    this.position()
  }

  /** arrow 布尔属性：默认 true（显示箭头），仅 arrow="false" 隐藏 */
  private showArrow(): boolean {
    return this.getAttr('arrow', 'true') !== 'false'
  }

  /** 计算当前锚点矩形：虚拟坐标 > follow-cursor 光标（内部 virtual 点通道）> 虚拟锚点元素 > 默认宿主锚点 */
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
    // follow-cursor：光标坐标作为 0 尺寸点位（与 virtual-x/y 同通道，rAF 节流更新）
    if (this.hasAttr('follow-cursor') && Number.isFinite(this.cursorX) && Number.isFinite(this.cursorY)) {
      return { left: this.cursorX, top: this.cursorY, right: this.cursorX, bottom: this.cursorY, width: 0, height: 0 } as DOMRect
    }
    return this.anchor?.getBoundingClientRect() ?? null
  }

  /** placement 主向拆分（auto 前缀先行解析为四向后已无 auto） */
  private mainOf(p: string): 'top' | 'bottom' | 'left' | 'right' {
    const m = /^(top|bottom|left|right)/.exec(p.trim())?.[0]
    return m && (m === 'top' || m === 'bottom' || m === 'left' || m === 'right')
      ? m
      : 'top'
  }

  /** 主向对侧翻转（保留 -start/-end 对齐后缀）：bottom-start → top-start */
  private flipPlacement(p: string): string {
    const flip: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
    const base = this.mainOf(p)
    return flip[base] + p.slice(base.length)
  }

  /** 跨轴回退：主轴两侧都不足时转到交叉轴方向（fallback-axis-side start→left/top，end→right/bottom），
      对齐后缀保留（对齐语义不变：仍对齐锚点同一边缘） */
  private crossAxisPlacement(p: string, side: 'start' | 'end'): string {
    const base = this.mainOf(p)
    const vertical = base === 'top' || base === 'bottom'
    const cross = vertical ? (side === 'start' ? 'left' : 'right') : side === 'start' ? 'top' : 'bottom'
    return cross + p.slice(base.length)
  }

  /** fallback-placements：回退序列（空格或逗号分隔的 12 向 placement），空 = 引擎默认翻转 */
  private fallbackList(): string[] {
    return this.getAttr('fallback-placements', '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  /** 某 placement 主轴方向在边界矩形内是否放得下（含 offset 间距 + collision-padding 边距） */
  private fitsMainAxis(
    p: string,
    anchorRect: DOMRect,
    popupRect: DOMRect,
    gap: number,
    padding: number,
    b: { left: number; top: number; right: number; bottom: number },
  ): boolean {
    switch (this.mainOf(p)) {
      case 'top':
        return anchorRect.top - popupRect.height - gap >= b.top + padding
      case 'bottom':
        return anchorRect.bottom + popupRect.height + gap <= b.bottom - padding
      case 'left':
        return anchorRect.left - popupRect.width - gap >= b.left + padding
      default:
        return anchorRect.right + popupRect.width + gap <= b.right - padding
    }
  }

  /** placement 请求（auto 前缀只在 auto-adjust=true 下择优；false 回落 top 声明语义） */
  private resolveRequestedPlacement(): string {
    const p = this.getAttr('placement', 'top')
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    if (p.startsWith('auto') && !autoAdjust) return 'top'
    return p
  }

  /**
   * auto 自适应：四向择优——首选「放得下」的边，全部放不下取主轴可用空间最大者
   * （动态定向到空间充足的一侧）。-start/-end 后缀保留对齐。
   */
  private pickAutoPlacement(
    requested: string,
    anchorRect: DOMRect,
    popupRect: DOMRect,
    gap: number,
    padding: number,
    b: { left: number; top: number; right: number; bottom: number },
  ): string {
    const suffix = requested.slice('auto'.length) // '' | '-start' | '-end'
    const bases: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right']
    const spaceOf = (base: string): number => {
      switch (base) {
        case 'top':
          return anchorRect.top - b.top - gap
        case 'bottom':
          return b.bottom - anchorRect.bottom - gap
        case 'left':
          return anchorRect.left - b.left - gap
        default:
          return b.right - anchorRect.right - gap
      }
    }
    let best = bases[0]
    let bestScore = -Infinity
    for (const base of bases) {
      const cand = base + suffix
      const space = spaceOf(base)
      const score = this.fitsMainAxis(cand, anchorRect, popupRect, gap, padding, b)
        ? Number.MAX_SAFE_INTEGER + space
        : space
      if (score > bestScore) {
        bestScore = score
        best = base
      }
    }
    return best + suffix
  }

  /** 碰撞边界矩形：property 通道元素 > collision-boundary 属性选择器 > 视口（0 原点） */
  private resolveBoundary(): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
    const el = this.collisionBoundaryEl ?? this.resolveBoundaryFromAttr()
    if (el) {
      const r = el.getBoundingClientRect()
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      }
    }
    return {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  private resolveBoundaryFromAttr(): Element | null {
    const sel = this.getAttr('collision-boundary', '').trim()
    if (!sel) return null
    try {
      return document.querySelector(sel)
    } catch {
      return null // 非法选择器：回落视口
    }
  }

  /**
   * 定位写入：锚点矩形 + placement → computePosition（offset/skidding/collisionPadding）。
   * P6 高级项（引擎能力在组件层透传组织）：
   * - placement='auto'（含 auto-start/auto-end）→ 四向择优产出实际方向；
   * - fallback-placements 回退序列：请求 + 回退逐项按主轴空间 fit，首个 fit 者胜出，
   *   全不 fit 取序列末位（引擎夹取兜底）；
   * - fallback-axis-side：主轴两侧都不足时的跨轴回退（追加序列末尾最低优先）；
   * - collision-boundary：把碰撞/夹取边界从视口换成指定元素 rect——引擎的 viewport
   *   坐标系从 0 起，把锚点/浮层矩形平移到边界局部坐标、结果平移回视口（视口边界
   *   0 原点时零平移，与旧路径逐位一致）。
   */
  private position(): void {
    if (!this.tipEl) return
    const anchorRect = this.anchorRect()
    if (!anchorRect) return
    const popup = this.popupRect()
    const gap = this.getNum('offset', 10)
    const skidding = this.getNum('skidding', 0)
    const padding = this.getNum('collision-padding', 4)
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const boundary = this.resolveBoundary()
    const requested = this.resolveRequestedPlacement()

    // 组件层候选解析（仅高级项激活时参与；纯 12 向请求交给引擎翻转，路径与旧实现一致）
    let actual = requested
    if (requested.startsWith('auto') && autoAdjust) {
      actual = this.pickAutoPlacement(requested, anchorRect, popup, gap, padding, boundary)
    } else if (autoAdjust) {
      const fallbacks = this.fallbackList()
      const axisSide = this.getAttr('fallback-axis-side', 'none')
      if (fallbacks.length > 0 || axisSide !== 'none') {
        const candidates: string[] = []
        if (fallbacks.length > 0) candidates.push(requested, ...fallbacks)
        else candidates.push(requested, this.flipPlacement(requested))
        if (axisSide === 'start' || axisSide === 'end') {
          candidates.push(this.crossAxisPlacement(requested, axisSide))
        }
        actual =
          candidates.find((p) => this.fitsMainAxis(p, anchorRect, popup, gap, padding, boundary)) ??
          candidates[candidates.length - 1]!
      }
    }

    // 碰撞边界非视口 → 平移坐标进边界局部系（引擎 viewport 从 0 起）；视口边界不平移（零漂移）
    const customBoundary =
      boundary.left !== 0 ||
      boundary.top !== 0 ||
      boundary.width !== window.innerWidth ||
      boundary.height !== window.innerHeight
    const anchorForEngine: DOMRect = customBoundary
      ? (({ left: anchorRect.left - boundary.left, top: anchorRect.top - boundary.top, right: anchorRect.right - boundary.left, bottom: anchorRect.bottom - boundary.top, width: anchorRect.width, height: anchorRect.height }) as DOMRect)
      : anchorRect
    const popupForEngine: DOMRect = customBoundary
      ? (({ left: popup.left - boundary.left, top: popup.top - boundary.top, right: popup.right - boundary.left, bottom: popup.bottom - boundary.top, width: popup.width, height: popup.height }) as DOMRect)
      : popup
    const {
      top,
      left,
      placement: actualPlacement,
    } = computePosition(
      anchorForEngine,
      popupForEngine,
      actual as Placement,
      { width: customBoundary ? boundary.width : window.innerWidth, height: customBoundary ? boundary.height : window.innerHeight },
      gap,
      autoAdjust,
      { skidding, collisionPadding: padding },
    )
    this.tipEl.style.top = `${customBoundary ? top + boundary.top : top}px`
    this.tipEl.style.left = `${customBoundary ? left + boundary.left : left}px`
    this.tipEl.setAttribute('data-placement', actualPlacement)
    this.syncRadiusCap(actualPlacement)
    this.positionArrow(anchorRect, actualPlacement)
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
    const arrowPos = this.getAttr('arrow-position', 'center')
    // merge：箭头由 CSS 钉死面板角点（直角三角贴角共边），内联偏移会让三角盒
    // 脱离角点、破坏共边衔接——跳过指向计算
    if (arrowPos === 'merge') return
    const vertical = actual.startsWith('top') || actual.startsWith('bottom')
    // side（P4）：箭头吸附到「锚点中心投影所在半区」对应的面板端（靠边而不指中心）。
    // arrow-offset 控制箭头盒距面板端的间距（px，默认 4 防探出圆角的夹取安全量），
    // 仅 side 态生效（center/merge 忽略）。
    if (arrowPos === 'side') {
      const rawSize = parseFloat(
        typeof getComputedStyle === 'function'
          ? getComputedStyle(arrow).getPropertyValue('--oas-tooltip-arrow-size')
          : '',
      )
      const arrowSize = Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 12
      const rect = this.tipEl.getBoundingClientRect()
      const crossSize = vertical
        ? this.tipEl.offsetWidth || rect.width
        : this.tipEl.offsetHeight || rect.height
      const popupStart = vertical
        ? parseFloat(this.tipEl.style.left)
        : parseFloat(this.tipEl.style.top)
      if (!Number.isFinite(popupStart) || !Number.isFinite(crossSize) || crossSize <= 0) return
      const anchorCrossCenter = vertical
        ? anchorRect.left + anchorRect.width / 2
        : anchorRect.top + anchorRect.height / 2
      const local = anchorCrossCenter - popupStart
      const offset = this.getNum('arrow-offset', 4)
      const pos = local > crossSize / 2 ? crossSize - arrowSize - offset : offset
      if (vertical) arrow.style.left = `${pos}px`
      else arrow.style.top = `${pos}px`
      return
    }
    if (!this.hasAttr('arrow-point-at-center')) return
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
   * 滚动/尺寸变化跟随（P1a 泛化）：打开期间监听 scroll（capture 捕获嵌套容器滚动）
   * 与 resize，rAF 节流重定位——普通锚点 / virtual-anchor 元素都跟随（视口坐标变化则
   * 锚点矩形变化，需重算）。仅虚拟坐标点模式无需跟随（视口坐标不随滚动变化）；
   * 但 close-on-scroll（P1b）打开时强制监听——滚动即关。
   */
  private syncScrollFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    const track = open && (this.hasAttr('close-on-scroll') || !this.hasVirtualPoint())
    if (track && !this.followOpen) {
      this.followOpen = true
      window.addEventListener('scroll', this.onFollowScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onFollowScroll)
    } else if (!track && this.followOpen) {
      this.untrackScroll()
    }
  }

  /** 摘下滚动/resize 监听（幂等） */
  private untrackScroll(): void {
    if (!this.followOpen) return
    this.followOpen = false
    window.removeEventListener('scroll', this.onFollowScroll, { capture: true })
    window.removeEventListener('resize', this.onFollowScroll)
    cancelAnimationFrame(this.followRaf)
  }

  private hasVirtualPoint(): boolean {
    const x = parseFloat(this.getAttr('virtual-x'))
    const y = parseFloat(this.getAttr('virtual-y'))
    return Number.isFinite(x) && Number.isFinite(y)
  }

  private onFollowScroll = (e: Event): void => {
    // close-on-scroll：滚动（非 resize）即关——首个 scroll 命中直接关，不再重定位
    if (this.hasAttr('close-on-scroll')) {
      if (e.type === 'scroll') {
        this.setOpen(false, 'scroll', 'scroll')
        return
      }
      // resize 仅走重定位
    }
    cancelAnimationFrame(this.followRaf)
    this.followRaf = requestAnimationFrame(() => {
      if (!this.tipEl || !this.hasAttr('open')) return
      this.position()
    })
  }

  /**
   * 外部 pointerdown 关闭（P2）：trigger 含 click/contextmenu 且打开时，命中浮层与
   * 锚点之外的指针按下即关（light dismiss）。用 pointerdown
   * 而非 click：响应更及时，且打开自身那一次 pointerdown 早于 open 注册（时序安全）。
   * 命中检测走 composedPath——浮层 portal 到 body 后路径仍含浮层元素自身。
   */
  private syncOutsideDismiss(open: boolean): void {
    const engage = open && !this.hasAttr('virtual') && (this.triggerHas('click') || this.triggerHas('contextmenu'))
    if (engage) document.addEventListener('pointerdown', this.onDocPointerDown, true)
    else document.removeEventListener('pointerdown', this.onDocPointerDown, true)
  }

  private onDocPointerDown = (e: PointerEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (path.includes(this)) return // 锚点（host light DOM，含触发元素）
    if (this.tipEl && path.includes(this.tipEl)) return // 浮层自身（shadow 内 / portal 后路径都含元素）
    this.setOpen(false, 'outside', 'outside-pointer')
  }
}
