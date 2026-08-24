import { OASElement } from '@oas-ui/core'
import { iconRegistry } from '@oas-ui/icons'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

/** 面板与触发器的默认间距（offset 主轴缺省值，与 computePosition 的 GAP 一致） */
const GAP = 8
/** 箭头尺寸（8px 菱形）与箭头中心到面板圆角边的最短距离 */
const ARROW_SIZE = 8
const ARROW_PAD = 8
/** 开合动画时长（ms）：入场/退场 keyframes 与 JS 退场隐藏延时共用，改这里需同步下方 CSS 的 `animation` 时长 */
const ANIM_MS = 150
/** hover 触发开/合防抖延时缺省值（ms）：无延时 hover 会闪开闪关 */
const HOVER_DELAY = 150
const HOVER_HIDE_DELAY = 100
/** 视口边缘夹取默认边距（px），collision-padding 属性可配 */
const COLLISION_PAD = 4

/** 12 向 placement 的主轴基向（跨轴对齐后缀 -start/-end 由定位引擎另行应用） */
type PlacementBase = 'top' | 'bottom' | 'left' | 'right'
/** 交叉轴对齐后缀：''=居中，start/end=面板边贴合锚点边 */
type Align = '' | 'start' | 'end'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
/* 整体禁用：视觉降饱和（ui-spec disabled 状态约定）+ 交互由 JS 全部拦截 */
:host([disabled]) {
  opacity: 0.6;
  cursor: not-allowed;
}
.panel {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
  /* 面板与箭头共用 --pop-bg / --pop-border（颜色变体只覆写这两个变量，箭头描边自动跟随） */
  --pop-bg: var(--oas-color-bg);
  --pop-border: var(--oas-color-border);
  background: var(--pop-bg);
  border: 1px solid var(--pop-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  padding: var(--oas-space-4);
  min-width: 200px;
  color: var(--oas-color-text-primary);
  outline: none;
  /* portal（append-to）时 host 为 pointer-events:none（不吞页面指针），
     面板显式 auto 保持可交互；非 portal 下与默认值等价 */
  pointer-events: auto;
}
.panel[aria-hidden='true'] {
  display: none;
}
/* 退场动画期间（oas-closing）：语义上已关闭（aria-hidden 立即落地，AT 不滞后），
   视觉上继续显示播完反向动画 */
.panel[aria-hidden='true'].oas-closing {
  display: block;
}
.panel[hidden] {
  display: none;
}
/* modal 形态：面板抬到遮罩之上（遮罩走 --oas-z-overlay，面板在其 +1 层） */
.panel.oas-modal {
  z-index: calc(var(--oas-z-overlay, 1040) + 1);
}
/* 颜色变体：语义色 tint 底 + 语义色描边，全部由 token 派生的 color-mix 构成，
   dark 主题自动跟随（token 已含 dark 变体）；箭头底色/描边走同一组 --pop-* 变量 */
.panel[data-color='primary'] {
  --pop-bg: color-mix(in srgb, var(--oas-color-primary) 10%, var(--oas-color-bg));
  --pop-border: color-mix(in srgb, var(--oas-color-primary) 40%, transparent);
}
.panel[data-color='success'] {
  --pop-bg: color-mix(in srgb, var(--oas-color-success) 10%, var(--oas-color-bg));
  --pop-border: color-mix(in srgb, var(--oas-color-success) 40%, transparent);
}
.panel[data-color='warning'] {
  --pop-bg: color-mix(in srgb, var(--oas-color-warning) 10%, var(--oas-color-bg));
  --pop-border: color-mix(in srgb, var(--oas-color-warning) 40%, transparent);
}
.panel[data-color='danger'] {
  --pop-bg: color-mix(in srgb, var(--oas-color-danger) 10%, var(--oas-color-bg));
  --pop-border: color-mix(in srgb, var(--oas-color-danger) 40%, transparent);
}
/* 头部：标题 + 关闭按钮（closable 时显示） */
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--oas-space-2);
  margin-bottom: var(--oas-space-2);
}
.head.oas-empty {
  display: none;
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-md);
}
.title:empty {
  display: none;
}
.close-btn {
  display: none;
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary);
  padding: 0;
  width: 18px;
  height: 18px;
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
}
.panel.oas-closable .close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover:not([hidden]) {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.close-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.close-btn[hidden] {
  display: none;
}
.close-btn svg {
  display: block;
  width: 1em;
  height: 1em;
}
.body {
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
/* 开合动画：入场/退场 fade+scale，动画放在内层 .panel-inner 上、且 .panel 自身不参与 transform，
   保证定位计算读到的面板矩形不受缩放动画影响；transform-origin 由 JS 按 placement 写入
   --oas-origin-x/y（自定义属性继承到内层），决定「从哪条边向外展开」 */
.panel-inner {
  transform-origin: var(--oas-origin-x, center) var(--oas-origin-y, center);
}
.panel:not([aria-hidden='true']) .panel-inner {
  animation: oas-pop-in ${ANIM_MS}ms var(--oas-ease-out);
}
.panel.oas-closing .panel-inner {
  animation: oas-pop-out ${ANIM_MS}ms var(--oas-ease-in-out);
}
@keyframes oas-pop-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes oas-pop-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.96);
  }
}
/* 减少动效偏好：禁用开合动画（退场时 JS 检测到 reduce 直接隐藏，不等动画时长） */
@media (prefers-reduced-motion: reduce) {
  .panel-inner {
    animation: none;
  }
}
/* 箭头：8px 菱形旋转 45°，底色与面板同色（--pop-bg），按 data-placement 基向落在面板对应边上，
   尖端指向触发元素。旋转后原 border-top/right/bottom/left 依次对应菱形右上/右下/左下/左上边，
   取「汇于尖端」的两条外露边带边框色（--pop-border），与面板 1px 描边无缝衔接。
   十字轴默认居中（var(--arrow-x/y) 兜底 calc(50% - 4px)）；arrow-point-at-center 时由 JS
   写内联偏移，面板被视口避让偏移后箭头仍指向触发元素。
   12 向 placement 使 data-placement 带 -start/-end 后缀，落边规则用属性前缀匹配（^=）。 */
.arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  background: var(--pop-bg);
  transform: rotate(45deg);
  pointer-events: none;
}
/* placement 基向=bottom：面板在触发元素下方 → 箭头悬面板顶边、尖朝上 → 外露边=右上(border-top)+左上(border-left) */
.panel[data-placement^='bottom'] .arrow {
  top: -6px;
  left: var(--arrow-x, calc(50% - 4px));
  border-top: 1px solid var(--pop-border);
  border-left: 1px solid var(--pop-border);
}
/* placement 基向=top：面板在触发元素上方 → 箭头悬面板底边、尖朝下 → 外露边=右下(border-right)+左下(border-bottom) */
.panel[data-placement^='top'] .arrow {
  bottom: -6px;
  left: var(--arrow-x, calc(50% - 4px));
  border-right: 1px solid var(--pop-border);
  border-bottom: 1px solid var(--pop-border);
}
/* placement 基向=left：面板在触发元素左侧 → 箭头悬面板右边、尖朝右 → 外露边=右上(border-top)+右下(border-right) */
.panel[data-placement^='left'] .arrow {
  right: -6px;
  top: var(--arrow-y, calc(50% - 4px));
  border-top: 1px solid var(--pop-border);
  border-right: 1px solid var(--pop-border);
}
/* placement 基向=right：面板在触发元素右侧 → 箭头悬面板左边、尖朝左 → 外露边=左上(border-left)+左下(border-bottom) */
.panel[data-placement^='right'] .arrow {
  left: -6px;
  top: var(--arrow-y, calc(50% - 4px));
  border-left: 1px solid var(--pop-border);
  border-bottom: 1px solid var(--pop-border);
}
 /* arrow-merge：直角三角与面板角共边融合（通用形态，仅 *-start/*-end 生效，
     center placement 不触发）。箭头为不旋转的 8px 方块整悬面板外、贴齐角两边，clip-path
     裁成直角三角——直角顶点贴面板角点，两条直角边与面板角两边共线，斜边 45° 朝面板内，
     尖端从角点正交外探 8px 指向锚点侧（视觉是「面板角本身伸出的直角尖」）。
     面板有 1px 描边，箭头描边策略（汇于尖端的两条外露边都要有轮廓线，同菱形箭头惯例）：
     - 直角边（贴面板边）：border 1px（--pop-border），盒贴角让位 1px（主轴边外 -8px 压进
       面板描边带、起止侧边 -1px）后与面板描边带共带续接；
     - 斜边（汇于尖端的主要外露边）：45°/135° 渐变带补 1px 法向线——斜边恰为盒的对角线，
       垂直于渐变轴且落在 50% 等值线上，clip 保留三角内侧 1px。主对角线（左上→右下）
       配 45deg、反对角线配 135deg。曾缺陷：斜边不描边，尖端轮廓缺失，观感是
       「无轮廓的白色补丁」而非箭头（用户实测 P3）。
     逐向写死（不能用 $='-start'/'-end' 后缀匹配——它对 12 向恒取顶角/恒写水平轴，
     见 tooltip 同款教训）：bottom 系悬顶边（start→左上角、end→右上角）、top 系
     悬底边（start→左下角、end→右下角）、left 系悬右边（start→右上角、end→右下角）、
     right 系悬左边（start→左上角、end→左下角） */
 .panel[data-placement='bottom-start'][data-arrow-merge] .arrow {
   top: -8px;
   left: -1px;
   transform: none;
   border: none;
   border-left: 1px solid var(--pop-border);
   border-bottom: 1px solid var(--pop-border);
   background: linear-gradient(45deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
 }
 .panel[data-placement='bottom-end'][data-arrow-merge] .arrow {
   top: -8px;
   right: -1px;
   left: auto;
   transform: none;
   border: none;
   border-right: 1px solid var(--pop-border);
   border-bottom: 1px solid var(--pop-border);
   background: linear-gradient(135deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
 }
 .panel[data-placement='top-start'][data-arrow-merge] .arrow {
   bottom: -8px;
   left: -1px;
   transform: none;
   border: none;
   border-left: 1px solid var(--pop-border);
   border-top: 1px solid var(--pop-border);
   background: linear-gradient(135deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
 }
 .panel[data-placement='top-end'][data-arrow-merge] .arrow {
   bottom: -8px;
   right: -1px;
   left: auto;
   transform: none;
   border: none;
   border-right: 1px solid var(--pop-border);
   border-top: 1px solid var(--pop-border);
   background: linear-gradient(45deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 100% 100%);
 }
 .panel[data-placement='left-start'][data-arrow-merge] .arrow {
   right: -8px;
   top: -1px;
   transform: none;
   border: none;
   border-top: 1px solid var(--pop-border);
   border-left: 1px solid var(--pop-border);
   background: linear-gradient(135deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
 }
 .panel[data-placement='left-end'][data-arrow-merge] .arrow {
   right: -8px;
   bottom: -1px;
   top: auto;
   transform: none;
   border: none;
   border-bottom: 1px solid var(--pop-border);
   border-left: 1px solid var(--pop-border);
   background: linear-gradient(45deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
 }
 .panel[data-placement='right-start'][data-arrow-merge] .arrow {
   left: -8px;
   top: -1px;
   transform: none;
   border: none;
   border-top: 1px solid var(--pop-border);
   border-right: 1px solid var(--pop-border);
   background: linear-gradient(45deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 100% 100%);
 }
 .panel[data-placement='right-end'][data-arrow-merge] .arrow {
   left: -8px;
   bottom: -1px;
   top: auto;
   transform: none;
   border: none;
   border-bottom: 1px solid var(--pop-border);
   border-right: 1px solid var(--pop-border);
   background: linear-gradient(135deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
 }
.panel[data-placement='bottom-start'][data-arrow-merge] {
  border-top-left-radius: 0;
}
.panel[data-placement='bottom-end'][data-arrow-merge] {
  border-top-right-radius: 0;
}
.panel[data-placement='top-start'][data-arrow-merge] {
  border-bottom-left-radius: 0;
}
.panel[data-placement='top-end'][data-arrow-merge] {
  border-bottom-right-radius: 0;
}
.panel[data-placement='left-start'][data-arrow-merge] {
  border-top-right-radius: 0;
}
.panel[data-placement='left-end'][data-arrow-merge] {
  border-bottom-right-radius: 0;
}
.panel[data-placement='right-start'][data-arrow-merge] {
  border-top-left-radius: 0;
}
.panel[data-placement='right-end'][data-arrow-merge] {
  border-bottom-left-radius: 0;
}
/* modal 遮罩：固定铺满视口，z 低于面板（--oas-z-overlay）；JS 控制 oas-show 类显隐 */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--oas-z-overlay, 1040);
  background: var(--oas-color-overlay);
  display: none;
}
.backdrop.oas-show {
  display: block;
}
`

/**
 * modal 化滚动锁：不移除滚动条（overflow:hidden 会移除滚动条→视口变宽→页面/固定元素位移），
 * 改为拦截滚动行为（wheel / touchmove / 滚动方向键），滚动条保持可见 → 视口宽度不变 → 零位移。
 * 计数器保证多个 modal 同时打开时，只有最后一个关闭才解除拦截。模式同 oas-backdrop 的 lock-scroll。
 */
let modalScrollCount = 0

const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

function preventModalScroll(e: Event): void {
  e.preventDefault()
}

function preventModalScrollKeydown(e: KeyboardEvent): void {
  const t = e.target as HTMLElement | null
  // 输入类控件内不拦截（保留正常输入），仅拦截会滚动页面的按键
  if (
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable)
  )
    return
  if (SCROLL_KEYS.has(e.key)) e.preventDefault()
}

function lockModalScroll(): void {
  if (modalScrollCount === 0) {
    window.addEventListener('wheel', preventModalScroll, { passive: false })
    window.addEventListener('touchmove', preventModalScroll, { passive: false })
    window.addEventListener('keydown', preventModalScrollKeydown, { passive: false })
  }
  modalScrollCount++
}

function unlockModalScroll(): void {
  modalScrollCount = Math.max(0, modalScrollCount - 1)
  if (modalScrollCount === 0) {
    window.removeEventListener('wheel', preventModalScroll)
    window.removeEventListener('touchmove', preventModalScroll)
    window.removeEventListener('keydown', preventModalScrollKeydown)
  }
}

// 模块级浮层栈：所有打开中的 popover 按打开先后排序（后开者在上），
// 共享一个 document keydown 处理器——一次 Esc 只关闭最顶层（嵌套时即最内层），
// 实现「嵌套下 Esc 关闭层级」。栈空时自动移除监听，无孤儿。
const openLayers: OASPopover[] = []

function registerLayer(p: OASPopover): void {
  if (openLayers.includes(p)) return
  openLayers.push(p)
  if (openLayers.length === 1) document.addEventListener('keydown', onDocumentKey)
}

function unregisterLayer(p: OASPopover): void {
  const i = openLayers.indexOf(p)
  if (i === -1) return
  openLayers.splice(i, 1)
  if (openLayers.length === 0) document.removeEventListener('keydown', onDocumentKey)
}

function onDocumentKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  const top = openLayers[openLayers.length - 1]
  if (!top) return
  top.removeAttribute('open')
  top.restoreFocus()
}

export class OASPopover extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'title',
      'content',
      'placement',
      'virtual',
      'virtual-x',
      'virtual-y',
      'virtual-anchor',
      'focus-on-open',
      'arrow',
      'arrow-point-at-center',
      'auto-adjust-overflow',
      // —— A2/A3/触发方式与延迟 ——
      'trigger',
      'hover-delay',
      'hover-hide-delay',
      'open-delay',
      'close-delay',
      'disabled',
      // —— 宽度 / 双轴偏移 ——
      'width',
      'offset',
      // —— 初始焦点 ——
      'initial-focus',
      // —— portal ——
      'append-to',
      // —— 碰撞细调 ——
      'collision-padding',
      'fallback-placements',
      'hide-when-detached',
      // —— 关闭按钮 / 声明式关层 / 颜色变体 ——
      'closable',
      'color',
      // —— modal / trigger-keys / fresh / auto-close / arrow-merge ——
      'modal',
      'trigger-keys',
      'fresh',
      'auto-close',
      'arrow-merge',
    ]
  }

  private panel: HTMLElement | null = null
  private backdrop: HTMLElement | null = null
  private closeBtn: HTMLButtonElement | null = null
  private anchor: Element | null = null
  /** 上一次 update() 的 open 状态，用于区分「打开瞬间」与「已打开后的属性微调」 */
  private wasOpen = false
  /** 上次 open 状态（null = 未初始化，首帧不派发事件，同 tooltip） */
  private prevOpen: boolean | null = null
  /** 内容是否已写入过（fresh 冻结语义：关闭状态非 fresh 时不重写内容，首次连接需写以覆盖 SSR 初始值） */
  private contentWritten = false
  /** hover 开/合防抖计时器 + 通用开/合延迟计时器 */
  private openTimer: ReturnType<typeof setTimeout> | null = null
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  /** 退场动画结束后的隐藏延时计时器 */
  private closeAnimTimer: ReturnType<typeof setTimeout> | null = null
  /** auto-close 自动关闭计时器 */
  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null
  /** modal 焦点陷阱监听是否已挂 */
  private trapBound = false
  /** 滚动/尺寸变化重定位监听是否已挂 */
  private scrollFollow = false
  private scrollRaf = 0
  /** modal 滚动锁是否已挂（幂等守卫：open 期间多次 update 不重复加锁） */
  private modalLocked = false
  /** append-to：portal host 容器（目标容器内的 div + 独立 shadow，样式作用域保真） */
  private portalHost: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const closeIcon = iconRegistry['close'] ?? ''
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="panel" part="panel" role="dialog" aria-hidden="true">
        <div class="panel-inner" part="inner">
          <div class="head" part="head">
            <div class="title" part="title" id="pop-title"></div>
            <button class="close-btn" part="close" type="button" aria-label="关闭" hidden>
              <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${closeIcon}</svg>
            </button>
          </div>
          <div class="body" part="body"><div class="content" part="content"></div><slot name="content"></slot></div>
        </div>
        <span class="arrow" part="arrow" data-popper-arrow aria-hidden="true"></span>
      </div>
      <div class="backdrop" part="backdrop" aria-hidden="true"></div>
    `
  }

  /** 缓存节点引用 + 绑定触发/外部点击 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.panel = this.shadow.querySelector('.panel')
    this.backdrop = this.shadow.querySelector('.backdrop')
    this.closeBtn = this.shadow.querySelector<HTMLButtonElement>('.close-btn')
    this.anchor = this.querySelector(':scope > *') ?? this

    // —— 触发方式（trigger，空格分隔多选；运行时改 trigger 走同一监听，处理内按当前属性 gate）——
    this.anchor?.addEventListener('click', () => {
      if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
      if (!this.hasTrigger('click')) return
      this.toggle()
    })
    this.anchor?.addEventListener('contextmenu', (e) => {
      if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
      if (!this.hasTrigger('contextmenu')) return
      e.preventDefault()
      this.setOpen(true)
    })
    // hover 触发：悬停宿主（含触发元素）开、移出宿主/浮层面板关；面板入/出也监听，
    // 使悬停区域 = 宿主 + 面板（跨 8px 间隙移动不闪关）
    this.addEventListener('mouseenter', this.onHoverEnter)
    this.addEventListener('mouseleave', this.onHoverLeave)
    this.panel?.addEventListener('mouseenter', this.onPanelEnter)
    this.panel?.addEventListener('mouseleave', this.onPanelLeave)
    // focus 触发：聚焦开、失焦（焦点移出宿主/面板）关
    this.addEventListener('focusin', this.onFocusIn)
    this.addEventListener('focusout', this.onFocusOut)
    // trigger-keys：指定按键在触发元素聚焦时切换开合
    this.anchor?.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent
      const keys = this.getAttr('trigger-keys', '').split(/\s+/).filter(Boolean)
      if (!keys.includes(ke.key)) return
      if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
      e.preventDefault()
      this.toggle()
    })
    // 外部点击关闭（面板移入 body 后 composedPath 仍含面板自身，见 handleOutside）
    this.onCleanup(() => unregisterLayer(this))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    // 关闭按钮
    this.closeBtn?.addEventListener('click', () => {
      this.removeAttribute('open')
      this.restoreFocus()
    })
    // 声明式关层：内容内 data-popover="close" 元素点击即关。
    // 双绑宿主 + 面板：宿主监听覆盖常规场景（happy-dom 亦不实现 slotted 事件穿 shadow），
    // 面板监听覆盖 append-to portal 后（面板在 body，事件不再经宿主）；open 守卫保证双触发幂等
    const onDeclarativeClose = (e: MouseEvent): void => {
      if (!this.hasAttr('open')) return
      const closer = e
        .composedPath()
        .find(
          (n) =>
            n instanceof HTMLElement &&
            n.hasAttribute('data-popover') &&
            n.getAttribute('data-popover') === 'close',
        )
      if (!closer) return
      this.removeAttribute('open')
      this.restoreFocus()
    }
    this.addEventListener('click', onDeclarativeClose)
    this.panel?.addEventListener('click', onDeclarativeClose)
    // modal backdrop 点击关闭（点击遮罩即点击外部）
    this.backdrop?.addEventListener('click', () => {
      if (!this.hasAttr('modal')) return
      this.removeAttribute('open')
      this.restoreFocus()
    })
    // 计时器统一清理（hover 防抖 + 通用延迟 + 退场隐藏 + auto-close），断开连接无孤儿
    this.onCleanup(() => {
      if (this.openTimer) clearTimeout(this.openTimer)
      if (this.closeTimer) clearTimeout(this.closeTimer)
      if (this.closeAnimTimer) clearTimeout(this.closeAnimTimer)
      if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer)
    })
    // modal 滚动锁与焦点陷阱随打开挂接，断开连接兜底解除（open 期间直接拔 DOM 不留孤儿）
    this.onCleanup(() => {
      if (this.trapBound) document.removeEventListener('keydown', this.onTrapKey)
      if (this.modalLocked) {
        this.modalLocked = false
        unlockModalScroll()
      }
    })
    // 滚动/尺寸变化重定位监听（scroll 用 capture 捕获嵌套容器滚动）
    this.onCleanup(() => {
      window.removeEventListener('scroll', this.onScroll, { capture: true })
      window.removeEventListener('resize', this.onScroll)
    })
    // portal 拆除兜底（disconnectedCallback 已显式调用，cleanup 再兜一层，幂等无孤儿）
    this.onCleanup(() => this.destroyPortal())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（面板骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.panel')) return false
    this.bind()
    return true
  }

  /** 断开连接时拆除 portal（面板与 slot 节点移回、host 移除，不留孤儿于 body） */
  override disconnectedCallback(): void {
    this.destroyPortal()
    this.scrollFollow = false
    super.disconnectedCallback()
  }

  // —— 触发方式（trigger）——

  /** trigger 触发方式列表：'click'/'hover'/'focus'/'contextmenu'/'manual' 空格分隔多选，默认 click */
  private triggerList(): string[] {
    return this.getAttr('trigger', 'click').split(/\s+/).filter(Boolean)
  }

  private hasTrigger(t: 'click' | 'hover' | 'focus' | 'contextmenu'): boolean {
    return this.triggerList().includes(t)
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.requestClose()
    else this.requestOpen()
  }

  /** open 状态写入（受控 setAttribute 与各触发路径都汇聚到这里，更新统一派发 oas-open-change） */
  private setOpen(open: boolean): void {
    if (open) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  /** 通用开请求：open-delay 延迟（hover 路径回落 hover-delay，见 openDelay） */
  private requestOpen(hover = false): void {
    if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
    this.clearCloseTimer()
    const delay = this.openDelay(hover)
    if (delay > 0) {
      this.clearOpenTimer()
      this.openTimer = setTimeout(() => this.setOpen(true), delay)
    } else {
      this.setOpen(true)
    }
  }

  /** 通用关请求：close-delay 延迟（hover 路径回落 hover-hide-delay） */
  private requestClose(hover = false): void {
    if (this.hasAttr('virtual')) return
    this.clearOpenTimer()
    const delay = this.closeDelay(hover)
    if (delay > 0) {
      this.clearCloseTimer()
      this.closeTimer = setTimeout(() => this.setOpen(false), delay)
    } else {
      this.setOpen(false)
    }
  }

  /** 开延迟：hover 路径优先 hover-delay，回落 open-delay，再回落默认 150；非 hover 用 open-delay（默认 0） */
  private openDelay(hover: boolean): number {
    if (hover) {
      const h = Number.parseInt(this.getAttr('hover-delay', ''), 10)
      if (Number.isFinite(h) && h >= 0) return h
      const g = Number.parseInt(this.getAttr('open-delay', ''), 10)
      if (Number.isFinite(g) && g >= 0) return g
      return HOVER_DELAY
    }
    const n = Number.parseInt(this.getAttr('open-delay', ''), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  /** 关延迟：hover 路径优先 hover-hide-delay，回落 close-delay，再回落默认 100；非 hover 用 close-delay（默认 0） */
  private closeDelay(hover: boolean): number {
    if (hover) {
      const h = Number.parseInt(this.getAttr('hover-hide-delay', ''), 10)
      if (Number.isFinite(h) && h >= 0) return h
      const g = Number.parseInt(this.getAttr('close-delay', ''), 10)
      if (Number.isFinite(g) && g >= 0) return g
      return HOVER_HIDE_DELAY
    }
    const n = Number.parseInt(this.getAttr('close-delay', ''), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  private clearOpenTimer(): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
  }

  private onHoverEnter = (): void => {
    if (this.hasTrigger('hover')) this.requestOpen(true)
  }

  private onHoverLeave = (e: MouseEvent): void => {
    if (!this.hasTrigger('hover')) return
    // 指针移到浮层面板（shadow 内）或宿主 light DOM 内不关：悬停区域 = 宿主 + 面板
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.requestClose(true)
  }

  private onPanelEnter = (): void => {
    if (!this.hasTrigger('hover')) return
    this.clearCloseTimer()
  }

  private onPanelLeave = (e: MouseEvent): void => {
    if (!this.hasTrigger('hover')) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.requestClose(true)
  }

  /** 指针/焦点移到的目标是否仍在「宿主 + 浮层面板」区域内（跨 shadow 时 relatedTarget 已 retarget 到 shadow host） */
  private hoverTargetInside(rel: EventTarget | null): boolean {
    return !!rel && rel instanceof Node && (this.contains(rel) || this.shadow.contains(rel))
  }

  private onFocusIn = (): void => {
    if (this.hasTrigger('focus')) this.requestOpen()
  }

  private onFocusOut = (e: FocusEvent): void => {
    if (!this.hasTrigger('focus')) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.requestClose()
  }

  // —— 外部点击 / Esc / 焦点还原 ——

  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    // 面板（含 portal 到 body 后）与宿主都在路径内视为内部点击
    if (path.includes(this) || path.includes(this.panel as unknown as EventTarget)) return
    if (path.some((n) => n instanceof Node && this.shadow.contains(n))) return
    this.removeAttribute('open')
  }

  /**
   * Esc 关闭后焦点还原到触发元素（公开：模块级 Esc 处理器与宿主均可调用）。
   * virtual 模式无真实锚点，跳过（宿主自行管理焦点）。
   */
  restoreFocus(): void {
    if (this.hasAttr('virtual')) return
    ;(this.anchor as HTMLElement | null)?.focus()
  }

  // —— 定位（12 向 / 双轴偏移 / 碰撞细调 / 宽度）——

  /** 虚拟锚点矩形（同 tooltip 的 virtual 语义）：virtual-x/y 视口坐标 > virtual-anchor 元素选择器 > 无锚点 */
  private virtualRect(): DOMRect | null {
    const x = parseFloat(this.getAttr('virtual-x'))
    const y = parseFloat(this.getAttr('virtual-y'))
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { left: x, top: y, right: x, bottom: y, width: 0, height: 0 } as DOMRect
    }
    const sel = this.getAttr('virtual-anchor')
    if (sel) {
      const el = document.querySelector(sel)
      if (el) return el.getBoundingClientRect()
    }
    return null
  }

  /** 计算当前锚点矩形：虚拟坐标 > 虚拟锚点元素 > 默认宿主锚点 */
  private anchorRect(): DOMRect | null {
    if (this.hasAttr('virtual')) return this.virtualRect()
    return this.anchor?.getBoundingClientRect() ?? null
  }

  /** offset 双轴偏移：主轴 distance + 交叉轴 skid（"12" 或 "12, 20"），缺省 8 / 0 */
  private parseOffset(): { distance: number; skid: number } {
    const d = Number.parseInt(this.getAttr('offset', String(GAP)).split(',')[0]?.trim() ?? '', 10)
    const s = Number.parseInt(this.getAttr('offset', String(GAP)).split(',')[1]?.trim() ?? '', 10)
    const distance = Number.isFinite(d) && d >= 0 ? d : GAP
    const skid = Number.isFinite(s) ? s : 0
    return { distance, skid }
  }

  /** collision-padding：视口边缘夹取边距（px），默认 4 */
  private collisionPadding(): number {
    const n = Number.parseInt(this.getAttr('collision-padding', ''), 10)
    return Number.isFinite(n) && n >= 0 ? n : COLLISION_PAD
  }

  /** fallback-placements：回退序列（逗号或空格分隔），空 = 走默认翻转 */
  private fallbackList(): string[] {
    return this.getAttr('fallback-placements', '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  /** 某 placement 的主轴基向在视口内是否放得下（含间距，边距按 collision-padding） */
  private fitsMain(
    placement: string,
    anchorRect: DOMRect,
    panelRect: DOMRect,
    distance: number,
    padding: number,
    viewport: { width: number; height: number },
  ): boolean {
    const main = /^(top|bottom|left|right)/.exec(placement.trim())?.[1] as PlacementBase | undefined
    switch (main) {
      case 'top':
        return anchorRect.top - panelRect.height - distance >= padding
      case 'bottom':
        return anchorRect.bottom + panelRect.height + distance <= viewport.height - padding
      case 'left':
        return anchorRect.left - panelRect.width - distance >= padding
      case 'right':
        return anchorRect.right + panelRect.width + distance <= viewport.width - padding
      default:
        return false
    }
  }

  /** 锚点矩形与视口是否有交集（hide-when-detached 判定） */
  private detached(anchorRect: DOMRect, viewport: { width: number; height: number }): boolean {
    return (
      anchorRect.left > viewport.width ||
      anchorRect.right < 0 ||
      anchorRect.top > viewport.height ||
      anchorRect.bottom < 0
    )
  }

  /**
   * 面板定位：委托共享定位引擎 computePosition（12 向 placement + 主轴翻转保留对齐后缀 +
   * 交叉轴 skidding + collisionPadding 视口夹取），双轴偏移 offset 拆为 gap 与 skidding 传入。
   * fallback-placements 非空时（自定义回退序列）：请求 + 回退逐项 fit，首个 fit 者胜出，
   * 全不 fit 取序列末位（引擎夹取兜底）；未设置回退序列走引擎默认主轴翻转。
   * hide-when-detached：锚点完全脱离视口时面板隐藏。
   */
  private position(): void {
    if (!this.panel) return
    const anchorRect = this.anchorRect()
    if (!anchorRect) return
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    // hide-when-detached：锚点完全脱离视口 → 面板隐藏（打开语义保留，避免孤悬屏外）
    if (this.hasAttr('hide-when-detached')) {
      this.panel.hidden = this.detached(anchorRect, viewport)
      if (this.panel.hidden) return
    }
    const panelRect = this.panel.getBoundingClientRect()
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const padding = this.collisionPadding()
    const { distance, skid } = this.parseOffset()
    const requested = this.getAttr('placement', 'top')
    const fallbacks = this.fallbackList()

    let actual = requested
    if (fallbacks.length > 0) {
      if (autoAdjust) {
        const candidates = [requested, ...fallbacks]
        actual =
          candidates.find((p) =>
            this.fitsMain(p, anchorRect, panelRect, distance, padding, viewport),
          ) ?? candidates[candidates.length - 1]!
      } else {
        actual = requested
      }
    }

    const r = computePosition(
      anchorRect,
      panelRect,
      actual as Placement,
      viewport,
      distance,
      autoAdjust,
      {
        skidding: skid,
        collisionPadding: padding,
      },
    )
    this.panel.style.top = `${r.top}px`
    this.panel.style.left = `${r.left}px`
    this.panel.setAttribute('data-placement', r.placement)
    this.setAnimOrigin(r.placement)
    this.positionArrow(anchorRect, r.placement)
  }

  /**
   * 开合动画原点（transform-origin）随 placement 感知方向：
   * 主轴方向决定「从哪条边向外展开」（bottom 系列从顶边、top 系列从底边、left 系列从右边、right 系列从左边），
   * -start/-end 把交叉轴原点贴到对齐边，未对齐时居中。写入 --oas-origin-x/y，内层 .panel-inner 继承消费。
   */
  private setAnimOrigin(placement: string): void {
    const base = placement.startsWith('top')
      ? 'top'
      : placement.startsWith('bottom')
        ? 'bottom'
        : placement.startsWith('left')
          ? 'left'
          : 'right'
    const align: Align = placement.endsWith('-start')
      ? 'start'
      : placement.endsWith('-end')
        ? 'end'
        : ''
    const cross = (s: string, e: string): string =>
      align === 'start' ? s : align === 'end' ? e : 'center'
    const originX =
      base === 'top' || base === 'bottom'
        ? cross('left', 'right')
        : base === 'left'
          ? 'right'
          : 'left'
    const originY =
      base === 'left' || base === 'right'
        ? cross('top', 'bottom')
        : base === 'top'
          ? 'bottom'
          : 'top'
    this.panel?.style.setProperty('--oas-origin-x', originX)
    this.panel?.style.setProperty('--oas-origin-y', originY)
  }

  /** arrow 布尔属性：默认 true（显示箭头），仅 arrow="false" 隐藏 */
  private showArrow(): boolean {
    return this.getAttr('arrow', 'true') !== 'false'
  }

  /**
   * 箭头定位：箭头永远指向锚点在面板指向边的中心投影（夹取在面板边内）——面板被
   * 视口边缘 clamp 平移后箭头仍跟随锚点，不停在面板中点。
   * 全 placement 生效（center 未 clamp 时计算值即面板中心，与 CSS 兜底一致）；
   * arrow-merge 除外：箭头由 CSS 钉死面板角点（直角三角贴角共边），内联偏移会让三角盒
   * 脱离角点、破坏与面板角的共边衔接——跳过指向计算。
   * 12 向 placement 下按基向判断主轴（data-placement 前缀匹配）。
   */
  private positionArrow(anchorRect: DOMRect, placement: string): void {
    if (!this.panel) return
    const arrow = this.panel.querySelector<HTMLElement>('[data-popper-arrow]')
    if (!arrow) return
    arrow.style.removeProperty('--arrow-x')
    arrow.style.removeProperty('--arrow-y')
    if (!this.showArrow()) return
    if (this.hasAttr('arrow-merge')) return
    const panelRect = this.panel.getBoundingClientRect()
    const clampV = (v: number, max: number): number => Math.max(ARROW_PAD, Math.min(v, max))
    if (placement.startsWith('top') || placement.startsWith('bottom')) {
      const center = anchorRect.left + anchorRect.width / 2
      const x = clampV(
        center - panelRect.left - ARROW_SIZE / 2,
        panelRect.width - ARROW_PAD - ARROW_SIZE,
      )
      arrow.style.setProperty('--arrow-x', `${x}px`)
    } else {
      const center = anchorRect.top + anchorRect.height / 2
      const y = clampV(
        center - panelRect.top - ARROW_SIZE / 2,
        panelRect.height - ARROW_PAD - ARROW_SIZE,
      )
      arrow.style.setProperty('--arrow-y', `${y}px`)
    }
  }

  /**
   * 宽度定制：width 数字 → px；'trigger' → 与触发元素同宽；其余按 CSS 值（如 50%、240px）。
   * 虚拟 0 尺寸点位（宽 0）视为未设置，保留 min-width 兜底。
   */
  private syncWidth(): void {
    if (!this.panel) return
    const raw = this.getAttr('width', '').trim()
    if (!raw) {
      this.panel.style.width = ''
      return
    }
    if (raw === 'trigger') {
      const r = this.anchorRect()
      if (r && r.width > 0) this.panel.style.width = `${r.width}px`
      return
    }
    const n = Number(raw)
    this.panel.style.width = Number.isFinite(n) && raw !== '' ? `${n}px` : raw
  }

  // —— 初始焦点与焦点移入 ——

  /**
   * 打开瞬间的焦点策略（优先级：modal 必聚焦 > initial-focus 指定选择器 > focus-on-open 首个可聚焦）：
   * - modal：焦点必须进面板（遮罩 + 焦点锁的模态语义），走 focusPanel
   * - initial-focus：按选择器定位元素（宿主 light DOM 优先，含 slot 内容），解析不到回落
   * - focus-on-open：面板内首个可聚焦元素
   */
  private applyInitialFocus(): void {
    if (this.hasAttr('modal')) {
      this.focusPanel()
      return
    }
    const sel = this.getAttr('initial-focus', '').trim()
    if (sel) {
      const target =
        this.querySelector<HTMLElement>(sel) ?? document.querySelector<HTMLElement>(sel)
      if (target) {
        target.focus()
        return
      }
    }
    if (this.hasAttr('focus-on-open')) this.focusPanel()
  }

  /**
   * 把焦点移入面板内容（键盘可达）：
   * 优先面板内（shadow + 命名插槽 light DOM）第一个可聚焦元素；
   * 无可聚焦元素时让面板自身可编程聚焦（tabindex=-1，不进 Tab 序）。
   */
  private focusPanel(): void {
    if (!this.panel) return
    const sel = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const inShadow = this.panel.querySelector<HTMLElement>(sel)
    if (inShadow && !inShadow.hasAttribute('hidden')) {
      inShadow.focus()
      return
    }
    const slot = this.panel.querySelector<HTMLSlotElement>('slot[name="content"]')
    const nodes = slot ? slot.assignedNodes({ flatten: true }) : []
    for (const n of nodes) {
      if (!(n instanceof HTMLElement)) continue
      const f = n.matches(sel) ? n : n.querySelector<HTMLElement>(sel)
      if (f) {
        f.focus()
        return
      }
    }
    this.panel.setAttribute('tabindex', '-1')
    this.panel.focus()
  }

  // —— portal（append-to）——

  /**
   * portal 挂载（样式作用域保真 + slot 内容桥接）：
   * 打开且设置 append-to 时，面板移入目标容器内的 portal host（div + 独立 open shadow，
   * STYLE 注入其中）。曾缺陷：裸 appendChild 到 body——面板脱离 shadow 树后 scoped CSS
   * 全部失效（position:fixed / 背景 / 边框 / 圆角丢失），以 static 掉到文档流末尾、
   * 随页面滚动乱飘（「Portal 面板不能稳定」）。定位基于视口坐标（fixed），移出后计算
   * 不受宿主影响；关闭移回原 shadow，host 销毁无孤儿。
   * host 不吞指针（pointer-events:none），面板自身显式 auto（STYLE .panel 规则）保持可交互；
   * modal 形态 host z 序抬到遮罩（--oas-z-overlay）之上，普通形态 --oas-z-dropdown。
   * slot 桥接：面板内 <slot name="content"> 的分配只看「直接 host」——面板搬进新 shadow 后
   * 原宿主 light DOM 的 [slot=content] 节点分配不到。桥接做法：把这些节点同步移入 portal
   * host 的 light DOM（物理同 host，分配恢复），关闭时移回宿主。
   */
  private syncPortal(open: boolean): void {
    const sel = this.getAttr('append-to', '').trim()
    if (!sel || !this.panel || !open) {
      this.destroyPortal()
      return
    }
    const target = sel === 'body' ? document.body : document.querySelector(sel)
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
    host.setAttribute('data-oas-popover-portal', '')
    host.style.cssText = `position: fixed; inset: 0; pointer-events: none; z-index: ${
      this.hasAttr('modal') ? 'calc(var(--oas-z-overlay, 1040) + 1)' : 'var(--oas-z-dropdown, 1000)'
    };`
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    root.appendChild(this.panel)
    this.portalHost = host
    this.bridgeSlotContent(host)
  }

  /** slot 桥接：宿主 light DOM 的 [slot=content] 节点移入 portal host light DOM（幂等，已在内为 no-op） */
  private bridgeSlotContent(host: HTMLElement): void {
    for (const n of this.querySelectorAll<HTMLElement>('[slot="content"]')) {
      host.appendChild(n)
    }
  }

  /** portal 拆除：面板移回原 shadow（引用与监听保留），slot 节点移回宿主，host 移除无孤儿 */
  private destroyPortal(): void {
    const host = this.portalHost
    if (!host) return
    this.portalHost = null
    if (this.panel && host.shadowRoot?.contains(this.panel)) {
      this.shadow.appendChild(this.panel)
    }
    for (const n of host.querySelectorAll<HTMLElement>('[slot="content"]')) {
      this.appendChild(n)
    }
    host.remove()
  }

  // —— modal——

  /**
   * modal 化同步：backdrop 显隐 + aria-modal + 滚动锁 + 焦点陷阱。
   * 滚动锁带幂等守卫（open 期间多次 update 不重复加锁，关闭/断开恰好解一次）；
   * 陷阱仅最上层 modal 接管（openLayers 栈序，嵌套时内层优先）。
   */
  private syncModal(open: boolean): void {
    const isModal = this.hasAttr('modal') && open
    this.panel?.classList.toggle('oas-modal', isModal)
    if (isModal) this.panel?.setAttribute('aria-modal', 'true')
    else this.panel?.removeAttribute('aria-modal')
    this.backdrop?.classList.toggle('oas-show', isModal)
    if (isModal && !this.trapBound) {
      this.trapBound = true
      document.addEventListener('keydown', this.onTrapKey)
    } else if (!isModal && this.trapBound) {
      this.trapBound = false
      document.removeEventListener('keydown', this.onTrapKey)
    }
    if (isModal && !this.modalLocked) {
      this.modalLocked = true
      lockModalScroll()
    } else if (!isModal && this.modalLocked) {
      this.modalLocked = false
      unlockModalScroll()
    }
  }

  /** 当前是否为最上层打开的 modal（嵌套时仅最内层 modal 接管焦点陷阱） */
  private isTopModal(): boolean {
    const modals = openLayers.filter((l) => l.hasAttr('modal') && l.hasAttr('open'))
    return modals[modals.length - 1] === this
  }

  /** 面板可聚焦区域：shadow 内可聚焦元素 + slot 内容（host light DOM）中可聚焦元素 */
  private getFocusables(): HTMLElement[] {
    const sel = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const out: HTMLElement[] = []
    if (this.panel) {
      for (const el of this.panel.querySelectorAll<HTMLElement>(sel)) {
        if (!el.hidden) out.push(el)
      }
    }
    for (const n of this.querySelectorAll<HTMLElement>('[slot="content"]')) {
      // slot 内容自身即可聚焦元素（如 <button slot="content">）也要计入
      if (!n.hidden && n.matches(sel)) out.push(n)
      for (const el of n.querySelectorAll<HTMLElement>(sel)) {
        if (!el.hidden) out.push(el)
      }
    }
    return out
  }

  /** 焦点是否落在面板可聚焦区域内（穿透 slot 内容与嵌套 shadow） */
  private isWithinPanel(node: Node | null): boolean {
    while (node) {
      if (node === this.panel) return true
      if (node instanceof ShadowRoot) node = node.host
      else if (node instanceof HTMLElement && node.getAttribute('slot') === 'content') return true
      else node = node.parentNode
    }
    return false
  }

  /** happy-dom 会把 shadow 内焦点 retarget 到宿主，需回退 shadowRoot.activeElement 取真实焦点 */
  private resolveActive(): HTMLElement | null {
    const ae = document.activeElement
    if (!ae) return null
    if (this.shadow.contains(ae)) return ae as HTMLElement
    if (ae === this) return this.shadow.activeElement as HTMLElement | null
    return ae as HTMLElement
  }

  /** 焦点陷阱：Tab/Shift+Tab 在面板内循环，焦点逃逸则拉回；多实例仅最上层 modal 接管 */
  private onTrapKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return
    if (!this.isTopModal()) return
    const focusables = this.getFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = this.resolveActive()
    if (active == null || !this.isWithinPanel(active)) {
      e.preventDefault()
      first.focus()
      return
    }
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
      return
    }
    if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  // —— 内容（fresh C2）/ 其余属性同步 ——

  /**
   * fresh 语义：默认（无 fresh）关闭状态下不重写 content/title（冻结，打开时写入最新值）；
   * fresh 开启时关闭状态也持续更新。首次写入始终放行（覆盖 SSR 初始内容）。
   */
  private syncText(): void {
    if (!this.panel) return
    const open = this.hasAttr('open')
    if (!open && !this.hasAttr('fresh') && this.contentWritten) return
    this.contentWritten = true
    // 从 this.panel 查（而非 this.shadow）：portal（append-to）期间面板在 portal host 的
    // shadow 内，原 shadow 查询会落空
    const titleEl = this.panel.querySelector<HTMLElement>('[part="title"]')!
    const title = this.getAttr('title', '')
    titleEl.textContent = title
    if (title) this.panel.setAttribute('aria-labelledby', 'pop-title')
    else this.panel.removeAttribute('aria-labelledby')
    this.panel.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
      'content',
      '',
    )
  }

  /** 头部显隐：无标题且非 closable 时整行折叠（关闭按钮仍保留在 DOM）；
   *  closable 时面板挂 oas-closable 类——close-btn 默认 display:none，
   *  可见性由 `.panel.oas-closable .close-btn` 规则驱动（hidden 只管冗余语义） */
  private syncHead(): void {
    const head = this.panel?.querySelector<HTMLElement>('.head')
    if (!head) return
    head.classList.toggle(
      'oas-empty',
      this.getAttr('title', '') === '' && !this.hasAttr('closable'),
    )
    this.panel?.classList.toggle('oas-closable', this.hasAttr('closable'))
    this.closeBtn?.toggleAttribute('hidden', !this.hasAttr('closable'))
    this.closeBtn?.setAttribute('aria-label', this.t('popover.close'))
  }

  /** 颜色变体：合法语义色写 data-color（CSS 走 token 派生变量），未知值保持中性 */
  private syncColor(): void {
    const c = this.getAttr('color', '').trim()
    const valid = c === 'primary' || c === 'success' || c === 'warning' || c === 'danger'
    if (valid) this.panel?.setAttribute('data-color', c)
    else this.panel?.removeAttribute('data-color')
  }

  /** arrow-merge：面板写 data-arrow-merge，CSS 仅在 *-start/*-end 位置应用直角三角贴角共边与圆角归零 */
  private syncArrowMerge(): void {
    this.panel?.toggleAttribute('data-arrow-merge', this.hasAttr('arrow-merge'))
  }

  /** auto-close：打开后计时自动关闭（open 期间重设；关闭/重开时清理） */
  private syncAutoClose(open: boolean): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer)
      this.autoCloseTimer = null
    }
    if (!open) return
    const ms = Number.parseInt(this.getAttr('auto-close', ''), 10)
    if (Number.isFinite(ms) && ms > 0) {
      this.autoCloseTimer = setTimeout(() => this.removeAttribute('open'), ms)
    }
  }

  // —— 滚动/尺寸变化重定位 ——

  /**
   * 滚动/窗口尺寸变化时重定位：打开期间监听 scroll（capture 捕获嵌套容器滚动）与 resize，
   * rAF 节流。虚拟坐标点（视口坐标不随滚动变化）不跟随；真实锚点 / virtual-anchor 元素跟随。
   */
  private syncScrollFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    const track = open && !this.hasVirtualPoint()
    if (track && !this.scrollFollow) {
      this.scrollFollow = true
      window.addEventListener('scroll', this.onScroll, { capture: true, passive: true })
      window.addEventListener('resize', this.onScroll)
    } else if (!track && this.scrollFollow) {
      this.scrollFollow = false
      window.removeEventListener('scroll', this.onScroll, { capture: true })
      window.removeEventListener('resize', this.onScroll)
    }
  }

  private hasVirtualPoint(): boolean {
    const x = parseFloat(this.getAttr('virtual-x'))
    const y = parseFloat(this.getAttr('virtual-y'))
    return Number.isFinite(x) && Number.isFinite(y)
  }

  private onScroll = (): void => {
    cancelAnimationFrame(this.scrollRaf)
    this.scrollRaf = requestAnimationFrame(() => {
      if (!this.panel || !this.hasAttr('open')) return
      this.position()
    })
  }

  /** 父层关闭时级联关闭嵌套子浮层（popover / tooltip / hover-card / dropdown / popconfirm） */
  private closeNested(): void {
    this.querySelectorAll<HTMLElement>(
      'oas-popover, oas-tooltip, oas-hover-card, oas-dropdown, oas-popconfirm',
    ).forEach((el) => el.removeAttribute('open'))
  }

  /** 退场动画：aria-hidden 立即落地（语义状态不滞后于动画，Esc 栈/测试契约同步可见），
      挂 oas-closing 类让面板保持显示播完反向 fade/scale，动画时长后清类。 */
  private playClose(): void {
    const panel = this.panel
    if (!panel) return
    panel.setAttribute('aria-hidden', 'true')
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    panel.classList.add('oas-closing')
    if (this.closeAnimTimer) clearTimeout(this.closeAnimTimer)
    this.closeAnimTimer = setTimeout(() => {
      this.closeAnimTimer = null
      // 退场期间被重开：open 分支已移除 oas-closing，这里只兜底
      if (this.hasAttr('open')) return
      panel.classList.remove('oas-closing')
    }, ANIM_MS)
  }

  protected override update(): void {
    if (!this.panel) return
    const open = this.hasAttr('open')
    // 整体禁用：aria-disabled 同步（仅 disabled 时设置，避免 SSR 快照宿主带 aria-disabled="false"；
    // 视觉降饱和走 CSS :host([disabled])）
    if (this.hasAttr('disabled')) this.setAttribute('aria-disabled', 'true')
    else this.removeAttribute('aria-disabled')
    // 内容与头部（fresh 冻结语义见 syncText）
    this.syncText()
    this.syncHead()
    this.syncColor()
    this.syncArrowMerge()
    // 箭头显隐：arrow 布尔属性默认 true（显示），arrow="false" 隐藏；元素与 ::part(arrow) 保留
    const arrowEl = this.panel.querySelector<HTMLElement>('[data-popper-arrow]')
    if (arrowEl) arrowEl.hidden = !this.showArrow()
    // open 状态迁移 → oas-open-change（受控 setAttribute 与点击触发都会走到这里，同 tooltip）
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open
    if (open) {
      if (!this.wasOpen) {
        registerLayer(this)
        // 打开瞬间：焦点策略（modal 必聚焦 > initial-focus > focus-on-open）
        this.applyInitialFocus()
      }
      // virtual 模式下生命周期由宿主控制，不注册外部点击关闭
      if (!this.hasAttr('virtual')) document.addEventListener('click', this.handleOutside)
      else document.removeEventListener('click', this.handleOutside)
      this.panel.classList.remove('oas-closing')
      this.panel.setAttribute('aria-hidden', 'false')
      this.syncWidth()
      this.syncPortal(true)
      this.syncModal(true)
      this.position()
      this.syncScrollFollow(true)
      this.syncAutoClose(true)
    } else {
      this.clearOpenTimer()
      this.clearCloseTimer()
      this.syncAutoClose(false)
      if (this.wasOpen) {
        this.playClose()
      } else {
        this.panel.setAttribute('aria-hidden', 'true')
      }
      if (this.wasOpen) this.closeNested()
      unregisterLayer(this)
      document.removeEventListener('click', this.handleOutside)
      this.syncPortal(false)
      this.syncModal(false)
      this.syncScrollFollow(false)
    }
    this.wasOpen = open
  }
}
