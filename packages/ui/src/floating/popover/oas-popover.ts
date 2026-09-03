import { OASElement } from '@oas-ui/core'
import { iconRegistry } from '@oas-ui/icons'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

/** 面板与触发器的默认间距（offset 主轴缺省值，与 computePosition 的 GAP 一致） */
const GAP = 8
/** 箭头尺寸（8px 菱形）与箭头中心到面板圆角边的最短距离 */
const ARROW_SIZE = 12
const ARROW_PAD = 8
/** 开合动画时长（ms）：入场/退场 keyframes 与 JS 退场隐藏延时共用，改这里需同步下方 CSS 的 `animation` 时长 */
const ANIM_MS = 150
/** hover 触发开/合防抖延时缺省值（ms）：无延时 hover 会闪开闪关 */
const HOVER_DELAY = 150
const HOVER_HIDE_DELAY = 100
/** 视口边缘夹取默认边距（px），collision-padding 属性可配 */
const COLLISION_PAD = 4
/** 触屏长按触发时长（ms，trigger 含 contextmenu 时生效，移动端无右键的替代） */
const LONG_PRESS_MS = 500
/** 长按期间手指滑动超过该阈值视为滚动手势，取消长按（px） */
const LONG_PRESS_SLIP = 10
/** mousedown 触发后同一次按压内合成 click 的吞没时间窗（ms，防双路径叠加切换） */
const MOUSE_SUPPRESS_MS = 350
/** 面板 id 文档唯一计数器（aria-controls 跨树引用需要文档级唯一） */
let panelUid = 0

/** 响应式断点表（移动优先 min-width，px；协议同 space/grid） */
const BREAKPOINT_PX: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 }

/** 面板全部命名 slot（portal 桥接 / destroy-on-hide 暂存 / hide-empty 判空共用） */
const SLOT_NAMES = ['content', 'title', 'header', 'footer', 'description'] as const

/** SLOT_NAMES 的联合选择器（querySelector 用） */
const SLOT_SELECTOR = SLOT_NAMES.map((n) => `[slot="${n}"]`).join(', ')

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
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  /* 面板组件级变量（宿主可覆写，fallback 走全局 token——dark 主题由 token 变体自动跟随）：
     --pop-bg/--pop-border 为面板与箭头共用的内部派生变量，颜色变体只覆写这两个变量 */
  --pop-bg: var(--oas-popover-bg, var(--oas-color-bg));
  --pop-border: var(--oas-popover-border, var(--oas-color-border));
  background: var(--pop-bg);
  border: 1px solid var(--pop-border);
  border-radius: var(--oas-popover-radius, var(--oas-radius-md));
  box-shadow: var(--oas-popover-shadow, 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent));
  padding: var(--oas-popover-padding, var(--oas-space-4));
  min-width: var(--oas-popover-min-width, 200px);
  color: var(--oas-color-text-primary);
  outline: none;
  /* portal（append-to）时 host 为 pointer-events:none（不吞页面指针），
     面板显式 auto 保持可交互；非 portal 下与默认值等价 */
  pointer-events: auto;
}
/* 尺寸档（size，默认 medium）：只覆写 --oas-popover-* 档位变量，非法值回落 medium */
.panel[data-size='small'] {
  --oas-popover-padding: var(--oas-space-2);
  --oas-popover-min-width: 160px;
  --oas-popover-font-size: var(--oas-font-size-sm);
}
.panel[data-size='large'] {
  --oas-popover-padding: var(--oas-space-6);
  --oas-popover-min-width: 280px;
  --oas-popover-font-size: var(--oas-font-size-lg);
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
  z-index: calc(calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040)) + 1);
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
  font-size: var(--oas-popover-font-size, var(--oas-font-size-md));
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
  font-size: var(--oas-popover-font-size, var(--oas-font-size-md));
  line-height: 1.6;
}
/* 补充说明区（slot="description"）：次要文本，aria-describedby 关联 */
.description {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  line-height: 1.6;
  color: var(--oas-color-text-secondary);
}
.description.oas-empty {
  display: none;
}
/* 底部操作区（slot="footer"）：与正文以分隔线区隔 */
.foot {
  margin-top: var(--oas-space-2);
  padding-top: var(--oas-space-3);
  border-top: 1px solid var(--pop-border);
}
.foot.oas-empty {
  display: none;
}
/* scrollable：面板内滚动——头/尾固定、正文区滚动（flex 列布局 + min-height:0 让
   overflow 生效；max-height 由 JS 按 available-height / 视口约束写入） */
.panel[data-scrollable] .panel-inner {
  display: flex;
  flex-direction: column;
}
.panel[data-scrollable] .body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
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
  left: var(--arrow-x, calc(50% - 6px));
  border-top: 1px solid var(--pop-border);
  border-left: 1px solid var(--pop-border);
}
/* placement 基向=top：面板在触发元素上方 → 箭头悬面板底边、尖朝下 → 外露边=右下(border-right)+左下(border-bottom) */
.panel[data-placement^='top'] .arrow {
  bottom: -6px;
  left: var(--arrow-x, calc(50% - 6px));
  border-right: 1px solid var(--pop-border);
  border-bottom: 1px solid var(--pop-border);
}
/* placement 基向=left：面板在触发元素左侧 → 箭头悬面板右边、尖朝右 → 外露边=右上(border-top)+右下(border-right) */
.panel[data-placement^='left'] .arrow {
  right: -6px;
  top: var(--arrow-y, calc(50% - 6px));
  border-top: 1px solid var(--pop-border);
  border-right: 1px solid var(--pop-border);
}
/* placement 基向=right：面板在触发元素右侧 → 箭头悬面板左边、尖朝左 → 外露边=左上(border-left)+左下(border-bottom) */
.panel[data-placement^='right'] .arrow {
  left: -6px;
  top: var(--arrow-y, calc(50% - 6px));
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
       「无轮廓的白色补丁」而非箭头（实测 P3）。
     逐向写死（不能用 $='-start'/'-end' 后缀匹配——它对 12 向恒取顶角/恒写水平轴，
     见 tooltip 同款教训）：bottom 系悬顶边（start→左上角、end→右上角）、top 系
     悬底边（start→左下角、end→右下角）、left 系悬右边（start→右上角、end→右下角）、
      right 系悬左边（start→左上角、end→左下角） */
  /* merge 固定 8px 盒（独立于标准 12px 菱形）：8px 贴角几何契约按 8px 校准。
     贴边（靠面板的那条边）是融合边——不应有描边线，只在外露的两条边（一条直角边 + 斜边）留描边，
     才能像 tooltip 那样干净地和面板角融合。 */
  .panel[data-arrow-merge] .arrow {
    width: 8px;
    height: 8px;
  }
  .panel[data-placement='bottom-start'][data-arrow-merge] .arrow {
   top: -8px;
   left: -1px;
   transform: none;
   border: none;
   border-left: 1px solid var(--pop-border);

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

   background: linear-gradient(135deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
 }
 .panel[data-placement='top-start'][data-arrow-merge] .arrow {
   bottom: -8px;
   left: -1px;
   transform: none;
   border: none;
   border-left: 1px solid var(--pop-border);

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

   background: linear-gradient(45deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 100% 0%, 100% 100%);
 }
 .panel[data-placement='left-start'][data-arrow-merge] .arrow {
   right: -8px;
   top: -1px;
   transform: none;
   border: none;
   border-top: 1px solid var(--pop-border);

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

   background: linear-gradient(45deg, var(--pop-bg) 0 calc(50% - 1px), var(--pop-border) calc(50% - 1px) calc(50% + 1px), var(--pop-bg) calc(50% + 1px));
   clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
 }
 .panel[data-placement='right-start'][data-arrow-merge] .arrow {
   left: -8px;
   top: -1px;
   transform: none;
   border: none;
   border-top: 1px solid var(--pop-border);

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
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040));
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
  // P4：从栈顶向下找最近一个可 Esc 关闭的层（close-on-escape=false 的层跳过不挡下层）；
  // P5：closeWith 内派发 oas-before-close，preventDefault 即拦截（顶层拦截优先，不继续关下层）
  for (let i = openLayers.length - 1; i >= 0; i--) {
    const top = openLayers[i]
    if (!top) continue
    if (top.getAttribute('close-on-escape') === 'false') continue
    if (top.closeWith('escape')) top.restoreFocus()
    return
  }
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
      // —— 能力增强批次：焦点陷阱 / 关闭开关 / 尺寸 / 高度约束 / 滚动 ——
      'trap-focus',
      'close-on-outside',
      'close-on-escape',
      'size',
      'available-height',
      'scrollable',
      'close-on-scroll',
      // —— 能力增强批次：焦点归还 / 空态 / 粘滞 / 选择关闭 / 内容销毁 / 断点 / 纯面板 ——
      'final-focus',
      'hide-empty',
      'sticky',
      'dismiss-on-select',
      'destroy-on-hide',
      'render-panel',
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
  /** title 吸收缓存：宿主原生 title 被移除后的标题真值（null=无标题）。
   *  fresh 冻结下 titleCache 随冻结 gate 一起冻结（缓存不更新、DOM 不重写），语义不变 */
  private titleCache: string | null = null

  /** 标题插槽是否有真实内容（元素节点或非空白文本）——slot 覆盖属性文案的判空依据 */
  private hasTitleSlotContent(slot: HTMLSlotElement): boolean {
    return slot
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '')
  }

  /** 任意命名 slot 是否有真实内容（元素节点或非空白文本）——header/footer/description 判空通用 */
  private slotHasContent(slot: HTMLSlotElement): boolean {
    return this.hasTitleSlotContent(slot)
  }

  /** P15 hide-empty 判空：无标题/正文/任一命名 slot 内容即空面板（closable 关闭按钮不算内容） */
  private isEmptyPopup(): boolean {
    if ((this.titleCache ?? '') !== '') return false
    if (this.getAttr('content', '') !== '') return false
    for (const n of this.querySelectorAll<HTMLElement>(SLOT_SELECTOR)) {
      if ((n.textContent ?? '').trim() !== '' || n.childElementCount > 0) return false
    }
    return true
  }

  // —— P22 destroy-on-hide：关闭后销毁内容（slot 节点 slot 名改写脱离分配 + hidden，属性文本清空）——

  /** 销毁面板内容：宿主 light DOM 节点不删（宿主资产），改写 slot 名脱离面板分配并 hidden */
  private stashSlots(): void {
    for (const n of this.querySelectorAll<HTMLElement>(SLOT_SELECTOR)) {
      n.dataset.oasPopoverStash = n.getAttribute('slot') ?? 'content'
      n.setAttribute('slot', 'oas-popover-stash')
      n.hidden = true
    }
  }

  /** 打开瞬间恢复挂载：slot 名还原、hidden 摘除（分配恢复） */
  private unstashSlots(): void {
    for (const n of this.querySelectorAll<HTMLElement>('[slot="oas-popover-stash"]')) {
      const orig = n.dataset.oasPopoverStash ?? 'content'
      delete n.dataset.oasPopoverStash
      n.setAttribute('slot', orig)
      n.hidden = false
    }
  }

  /** 关闭时销毁面板内容呈现（重开由 update 恢复挂载并按属性重写） */
  private destroyContent(): void {
    if (!this.panel) return
    this.destroyed = true
    this.stashSlots()
    const contentEl = this.panel.querySelector<HTMLElement>('[part="content"]')
    if (contentEl) contentEl.textContent = ''
    const fallback = this.panel.querySelector<HTMLElement>('.title-text')
    if (fallback) fallback.textContent = ''
    this.contentWritten = false
    this.syncHead()
    this.syncFoot()
    this.syncDescription()
  }
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
  /** contextmenu / 触屏长按的光标触点矩形（打开期间按光标定位，关闭清除；滚动重定位回到锚点）。
   *  保持到关闭而非一次性消费：title 吸收（removeAttribute('title') → attributeChangedCallback）
   *  会触发嵌套 update（外层 wasOpen 尚未置 true），一次性消费会让嵌套轮回落锚点定位覆盖光标 */
  private cursorRect: DOMRect | null = null
  /** 触屏长按计时器与 armed 状态（长按生效后 touchmove 阻止页面滚动） */
  private longPressTimer: ReturnType<typeof setTimeout> | null = null
  private longPressArmed = false
  private longPressX = 0
  private longPressY = 0
  /** mousedown 触发的时间戳：同一次按压的合成 click 在时间窗内吞没（防双路径叠加切换） */
  private lastMousedownToggle = 0
  /** trigger-keys 切换的时间戳：同一次按键的合成 click 在时间窗内吞没（P2 幂等守卫） */
  private lastKeydownToggle = 0
  /** 打开瞬间的页面 scrollY：滞留 scroll 事件（滚动发生在打开前、事件 task 异步派发晚于
   *  打开执行，scrollY 与打开时相同）不构成有效滚动，不重定位/不触发 close-on-scroll */
  private openScrollY = Number.NaN
  /** destroy-on-hide：内容已销毁（打开瞬间恢复挂载） */
  private destroyed = false
  /** P13 关闭后焦点归还目标（property 通道，优先于 final-focus 选择器属性） */
  finalFocusEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    const closeIcon = iconRegistry['close'] ?? ''
    return `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="panel" part="panel" role="dialog" aria-hidden="true">
        <div class="panel-inner" part="inner">
          <div class="head" part="head" id="pop-head">
            <div class="title" id="pop-title" part="title"><slot name="title"><span class="title-text"></span></slot></div>
            <slot name="header"></slot>
            <button class="close-btn" part="close" type="button" aria-label="关闭" hidden>
              <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">${closeIcon}</svg>
            </button>
          </div>
          <div class="body" part="body"><div class="content" part="content"></div><slot name="content"></slot></div>
          <div class="description" id="pop-desc" part="description"><slot name="description"></slot></div>
          <div class="foot" part="foot"><slot name="footer"></slot></div>
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

    // 面板 id 文档唯一（aria-controls 跨 shadow 树引用需要文档级唯一）；SSR 水合快照复用已有 id。
    // 已占用时递增重试：防御 SSR 快照 id（panel-1…）与客户端动态挂载实例计数器撞号
    if (this.panel && !this.panel.id) {
      let id = `oas-popover-panel-${++panelUid}`
      while (typeof document !== 'undefined' && document.getElementById(id)) {
        id = `oas-popover-panel-${++panelUid}`
      }
      this.panel.id = id
    }
    // P1 绑定时机：触发元素挂 aria-haspopup（开/关态的 expanded/controls 在 update 同步）
    this.syncAnchorAria(false)

    // —— 触发方式（trigger，空格分隔多选；运行时改 trigger 走同一监听，处理内按当前属性 gate）——
    this.anchor?.addEventListener('click', () => {
      // mousedown / trigger-keys 切换后同一次按压的合成 click 吞没（时间窗守卫，防双路径叠加切换）
      const now = performance.now()
      if (now - this.lastMousedownToggle < MOUSE_SUPPRESS_MS) return
      if (now - this.lastKeydownToggle < MOUSE_SUPPRESS_MS) return
      if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
      if (!this.hasTrigger('click')) return
      this.toggle()
    })
    // P24 mousedown 触发：按下即切换（无需抬起，比 click 快一拍）
    this.anchor?.addEventListener('mousedown', (e) => {
      if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
      if (!this.hasTrigger('mousedown')) return
      e.preventDefault()
      this.lastMousedownToggle = performance.now()
      this.toggle()
    })
    this.anchor?.addEventListener('contextmenu', (e) => {
      if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
      if (!this.hasTrigger('contextmenu')) return
      e.preventDefault()
      // P20 光标定位：右键触点缓存，打开期间按光标定位（关闭清除；滚动重定位回到锚点）
      const me = e as MouseEvent
      this.cursorRect = {
        left: me.clientX,
        top: me.clientY,
        right: me.clientX,
        bottom: me.clientY,
        width: 0,
        height: 0,
      } as DOMRect
      this.requestOpen()
    })
    // P20 触屏长按（trigger 含 contextmenu 时，移动端无右键的替代）
    this.anchor?.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false })
    this.anchor?.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false })
    this.anchor?.addEventListener('touchend', () => this.clearLongPress())
    this.anchor?.addEventListener('touchcancel', () => this.clearLongPress())
    // hover 触发：悬停宿主（含触发元素）开、移出宿主/浮层面板关；面板入/出也监听，
    // 使悬停区域 = 宿主 + 面板（跨 8px 间隙移动不闪关）
    this.addEventListener('mouseenter', this.onHoverEnter)
    this.addEventListener('mouseleave', this.onHoverLeave)
    this.panel?.addEventListener('mouseenter', this.onPanelEnter)
    this.panel?.addEventListener('mouseleave', this.onPanelLeave)
    // 命名 slot 内容增减时重刷面板（遵守 fresh 冻结语义——关闭态非 fresh 且
    // 已写入过内容时，slot 变更不重写面板，与 syncText 冻结 gate 一致；打开/首次写入正常同步）
    this.panel?.querySelectorAll('slot').forEach((s) =>
      s.addEventListener('slotchange', () => {
        if (!this.hasAttr('open') && !this.hasAttr('fresh') && this.contentWritten) return
        this.update()
      }),
    )
    // focus 触发：聚焦开、失焦（焦点移出宿主/面板）关
    this.addEventListener('focusin', this.onFocusIn)
    this.addEventListener('focusout', this.onFocusOut)
    // trigger-keys：指定按键在触发元素聚焦时切换开合（P2 默认 Enter/Space，可覆盖）
    this.anchor?.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent
      if (this.hasAttr('render-panel')) return
      const keys = this.getAttr('trigger-keys', 'Enter Space')
        .split(/\s+/)
        .filter(Boolean)
        .map((k) => (k === 'Space' ? ' ' : k)) // 空格键的 key 值是字面空格
      if (!keys.includes(ke.key)) return
      if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
      if (ke.repeat) return
      // P2 幂等守卫：preventDefault 阻止原生 button 的 Enter/Space 合成 click（单路径）；
      // 时间窗再吞没残余合成 click（个别浏览器 keyup 期派发 click 的边缘行为），open 态不重复触发
      e.preventDefault()
      this.lastKeydownToggle = performance.now()
      this.toggle()
    })
    // 外部点击关闭（面板移入 body 后 composedPath 仍含面板自身，见 handleOutside）
    this.onCleanup(() => unregisterLayer(this))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside, true))
    // 关闭按钮（P5：统一走可取消关闭入口）
    this.closeBtn?.addEventListener('click', () => {
      if (this.closeWith('close-btn')) this.restoreFocus()
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
      if (this.closeWith('declarative')) this.restoreFocus()
    }
    this.addEventListener('click', onDeclarativeClose)
    this.panel?.addEventListener('click', onDeclarativeClose)
    // P21 dismiss-on-select：面板内容点击（命名 slot 内容 / 面板内部）视为完成选择即关闭
    // （可被 before-close 拦截）。触发元素（默认 slot）不触发——点开即关是反直觉的荒谬行为
    const onDismissSelect = (e: MouseEvent): void => {
      if (!this.hasAttr('open') || !this.hasAttr('dismiss-on-select')) return
      const path = e.composedPath()
      const inPanel = path.includes(this.panel as unknown as EventTarget)
      const inNamedSlot = path.some(
        (n) =>
          n instanceof HTMLElement &&
          (SLOT_NAMES as readonly string[]).includes(n.getAttribute('slot') ?? ''),
      )
      if (!inPanel && !inNamedSlot) return
      this.closeWith('dismiss')
    }
    this.addEventListener('click', onDismissSelect)
    // modal backdrop 点击关闭（点击遮罩即点击外部；P5 可取消）
    this.backdrop?.addEventListener('click', () => {
      if (!this.hasAttr('modal')) return
      this.closeWith('backdrop')
    })
    // P23 断点响应：断点简写属性（placement/size）依赖 matchMedia 变化触发重算
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mqls = Object.values(BREAKPOINT_PX).map((px) =>
        window.matchMedia(`(min-width: ${px}px)`),
      )
      for (const m of mqls) m.addEventListener('change', this.onBreakpointChange)
      this.onCleanup(() => {
        for (const m of mqls) m.removeEventListener('change', this.onBreakpointChange)
      })
    }
    // 计时器统一清理（hover 防抖 + 通用延迟 + 退场隐藏 + auto-close + 触屏长按），断开连接无孤儿
    this.onCleanup(() => {
      if (this.openTimer) clearTimeout(this.openTimer)
      if (this.closeTimer) clearTimeout(this.closeTimer)
      if (this.closeAnimTimer) clearTimeout(this.closeAnimTimer)
      if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer)
      if (this.longPressTimer) clearTimeout(this.longPressTimer)
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

  /** 真水合：校验 SSR 快照结构（面板骨架存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——从快照标题区恢复缓存，
   *  防水合后首次 update 把标题清掉（fresh 冻结 gate 对缓存同样生效） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.panel')) return false
    const snapTitle = this.shadow.querySelector('[part="title"]')?.textContent ?? ''
    if (snapTitle !== '') this.titleCache = snapTitle
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

  /** trigger 触发方式列表：'click'/'hover'/'focus'/'contextmenu'/'mousedown'/'manual' 空格分隔多选，默认 click；
   *  P25 render-panel：纯面板渲染无触发语义，一律按 manual 处理 */
  private triggerList(): string[] {
    if (this.hasAttr('render-panel')) return ['manual']
    return this.getAttr('trigger', 'click').split(/\s+/).filter(Boolean)
  }

  private hasTrigger(t: 'click' | 'hover' | 'focus' | 'contextmenu' | 'mousedown'): boolean {
    return this.triggerList().includes(t)
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.requestClose(false, 'trigger')
    else this.requestOpen()
  }

  /** open 状态写入（受控 setAttribute 与各触发路径都汇聚到这里，更新统一派发 oas-open-change） */
  private setOpen(open: boolean): void {
    if (open) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  /**
   * P5 统一关闭入口（可取消）：派发 cancelable 的 oas-before-close（detail.source 标注来源），
   * preventDefault 即阻止关闭。各关闭入口（trigger / outside / escape / close-btn /
   * declarative / backdrop / auto / dismiss / scroll）全部汇聚到这里。
   * 公开：模块级 Esc 处理器（openLayers 栈）调用。
   */
  closeWith(source: string): boolean {
    if (!this.hasAttr('open')) return false
    if (!this.emit('before-close', { source }, { cancelable: true })) return false
    this.removeAttribute('open')
    return true
  }

  /** 可取消检查（不实际关闭）：requestClose 延迟路径在计时前拦截 */
  private canClose(source: string): boolean {
    if (!this.hasAttr('open')) return false
    return this.emit('before-close', { source }, { cancelable: true })
  }

  /** 通用开请求：open-delay 延迟（hover 路径回落 hover-delay，见 openDelay）；
   *  P15 hide-empty：无内容面板不打开（受控 setAttribute 不拦——面板视觉 gate 见 update） */
  private requestOpen(hover = false): void {
    if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
    if (this.hasAttr('hide-empty') && this.isEmptyPopup()) return
    this.clearCloseTimer()
    const delay = this.openDelay(hover)
    if (delay > 0) {
      this.clearOpenTimer()
      this.openTimer = setTimeout(() => this.setOpen(true), delay)
    } else {
      this.setOpen(true)
    }
  }

  /** 通用关请求：close-delay 延迟（hover 路径回落 hover-hide-delay）；P5 计时前拦截 */
  private requestClose(hover = false, source = 'trigger'): void {
    if (this.hasAttr('virtual')) return
    if (!this.canClose(source)) return
    this.clearOpenTimer()
    const delay = this.closeDelay(hover)
    if (delay > 0) {
      this.clearCloseTimer()
      this.closeTimer = setTimeout(() => {
        if (this.hasAttr('open')) this.setOpen(false)
      }, delay)
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
    // P4 close-on-outside 开关（默认 true 保持现行为）
    if (this.getAttr('close-on-outside', 'true') === 'false') return
    const path = e.composedPath()
    // 面板（含 portal 到 body 后）与宿主都在路径内视为内部点击
    if (path.includes(this) || path.includes(this.panel as unknown as EventTarget)) return
    if (path.some((n) => n instanceof Node && this.shadow.contains(n))) return
    this.closeWith('outside')
  }

  /**
   * Esc 关闭后焦点还原到触发元素（公开：模块级 Esc 处理器与宿主均可调用）。
   * P13 final-focus：归还目标可配——finalFocusEl property > final-focus 选择器 > 触发元素。
   * virtual 模式无真实锚点，跳过（宿主自行管理焦点；配置了 final-focus/finalFocusEl 仍生效）。
   */
  restoreFocus(): void {
    const sel = this.getAttr('final-focus', '').trim()
    const target = this.finalFocusEl ?? (sel ? document.querySelector<HTMLElement>(sel) : null)
    if (target) {
      target.focus()
      return
    }
    if (this.hasAttr('virtual')) return
    ;(this.anchor as HTMLElement | null)?.focus()
  }

  /** P1 触发元素 ARIA 关联三时机（绑定/开/关）：haspopup + expanded（随面板实际可见态）+ controls（面板 id）。
   *  virtual（宿主自管触发器）与 render-panel（无触发语义）跳过；
   *  SSR 渲染端跳过（快照为关闭态骨架，浏览器水合后 bind/update 补齐——同测量组件未校正态惯例） */
  private syncAnchorAria(showPanel: boolean): void {
    if (
      typeof window !== 'undefined' &&
      (window as unknown as Record<string, unknown>).__OAS_SSR__ === true
    )
      return
    const anchor = this.anchor
    if (!anchor || !(anchor instanceof HTMLElement)) return
    if (this.hasAttr('virtual') || this.hasAttr('render-panel') || anchor === this) return
    anchor.setAttribute('aria-haspopup', 'dialog')
    anchor.setAttribute('aria-expanded', String(showPanel))
    if (this.panel?.id) anchor.setAttribute('aria-controls', this.panel.id)
  }

  // —— P20 触屏长按（trigger 含 contextmenu 时；移动端无右键的替代） ——

  private onTouchStart(e: Event): void {
    if (!this.hasTrigger('contextmenu')) return
    if (this.hasAttr('virtual') || this.hasAttr('disabled')) return
    const touch = (e as TouchEvent).touches ? Array.from((e as TouchEvent).touches)[0] : undefined
    if (!touch) return
    this.longPressX = touch.clientX
    this.longPressY = touch.clientY
    this.clearLongPress()
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null
      this.longPressArmed = true
      // 长按生效：以触点为光标点打开（同右键光标定位）
      this.cursorRect = {
        left: this.longPressX,
        top: this.longPressY,
        right: this.longPressX,
        bottom: this.longPressY,
        width: 0,
        height: 0,
      } as DOMRect
      this.requestOpen()
    }, LONG_PRESS_MS)
  }

  private onTouchMove(e: Event): void {
    // 长按已生效：阻止默认（防止手指移动带动页面滚动，fixed 面板与滚动脱节）
    if (this.longPressArmed) {
      e.preventDefault()
      return
    }
    if (!this.longPressTimer) return
    const touch = (e as TouchEvent).touches ? Array.from((e as TouchEvent).touches)[0] : undefined
    if (!touch) return
    // 滑动超阈值视为滚动手势，取消长按
    const dx = touch.clientX - this.longPressX
    const dy = touch.clientY - this.longPressY
    if (Math.hypot(dx, dy) > LONG_PRESS_SLIP) this.clearLongPress()
  }

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    this.longPressArmed = false
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

  /** 计算当前锚点矩形：虚拟坐标 > 虚拟锚点元素 > 默认宿主锚点。
   *  P25 render-panel：无触发语义，定位回落 virtual 坐标/锚点（无则不定位，宿主用 append-to 自行摆放） */
  private anchorRect(): DOMRect | null {
    if (this.hasAttr('virtual') || this.hasAttr('render-panel')) return this.virtualRect()
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
   * hide-when-detached：锚点完全脱离视口时面板隐藏（P18 sticky=always 优先——贴边不隐藏）。
   * anchorOverride：P20 光标触点矩形（contextmenu/长按打开瞬间一次性消费）。
   */
  private position(anchorOverride?: DOMRect): void {
    if (!this.panel) return
    let anchorRect = anchorOverride ?? this.anchorRect()
    if (!anchorRect) return
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const sticky = this.getAttr('sticky', 'partial')
    const detachedNow = this.detached(anchorRect, viewport)
    // hide-when-detached：锚点完全脱离视口 → 面板隐藏（打开语义保留，避免孤悬屏外）；
    // sticky=always 优先（锚点滚出后贴视口边缘不消失）
    if (this.hasAttr('hide-when-detached') && sticky !== 'always') {
      this.panel.hidden = detachedNow
      if (detachedNow) return
    }
    // P18 sticky=always 且锚点脱离：锚点矩形夹到视口内（面板贴边保位），
    // 跳过主动翻转（按声明 placement 保位，避免滚动时对向翻转跳动；引擎夹取仍生效）
    const stickToEdge = sticky === 'always' && detachedNow
    if (stickToEdge) anchorRect = this.clampRectToViewport(anchorRect, viewport)
    const panelRect = this.panel.getBoundingClientRect()
    const autoAdjust = this.getAttr('auto-adjust-overflow', 'true') !== 'false'
    const padding = this.collisionPadding()
    const { distance, skid } = this.parseOffset()
    // P23 断点简写解析（"bottom md:right" 按当前视口宽度取生效值）
    const requested = this.resolveResponsive(this.getAttr('placement', 'top'))
    const fallbacks = this.fallbackList()

    let actual = requested
    if (fallbacks.length > 0) {
      if (autoAdjust && !stickToEdge) {
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
    this.syncMaxHeight(r.placement, anchorRect)
  }

  /** 锚点矩形夹取到视口内（sticky=always 贴边保位的锚点侧等价矩形） */
  private clampRectToViewport(
    r: DOMRect,
    viewport: { width: number; height: number },
  ): DOMRect {
    const pad = this.collisionPadding()
    const w = Math.min(r.width, viewport.width - pad * 2)
    const h = Math.min(r.height, viewport.height - pad * 2)
    const left = Math.max(pad, Math.min(r.left, viewport.width - pad - w))
    const top = Math.max(pad, Math.min(r.top, viewport.height - pad - h))
    return { left, top, right: left + w, bottom: top + h, width: w, height: h } as DOMRect
  }

  /**
   * P9 available-height / P10 scrollable：面板最大高度约束。
   * available-height → 主轴方向视口剩余空间；scrollable 单独开启时兜底同值（滚动有界）；
   * 两者都未开启不约束（现行为）。水平放置（left/right）按视口高约束。
   */
  private syncMaxHeight(placement: string, anchorRect: DOMRect): void {
    if (!this.panel) return
    const constrain = this.hasAttr('available-height') || this.hasAttr('scrollable')
    if (!constrain) {
      this.panel.style.maxHeight = ''
      return
    }
    const pad = this.collisionPadding()
    const { distance } = this.parseOffset()
    const vh = window.innerHeight
    let avail: number
    if (placement.startsWith('top')) avail = anchorRect.top - distance - pad
    else if (placement.startsWith('bottom')) avail = vh - anchorRect.bottom - distance - pad
    else avail = vh - pad * 2
    this.panel.style.maxHeight = `${Math.max(avail, 0)}px`
  }

  // —— P23 断点响应（协议同 space/grid：基础值 + 空格分隔 `断点:值`，mobile-first min-width） ——

  /** 断点简写解析：按当前视口宽度取生效值（多断点最宽命中胜出；非法断点名忽略回落基础值） */
  private resolveResponsive(raw: string): string {
    if (!raw.includes(' ')) return raw
    const tokens = raw.trim().split(/\s+/)
    let base = ''
    if (tokens[0] && !tokens[0].includes(':')) base = tokens.shift()!
    const w = window.innerWidth
    let value = base
    let best = -1
    for (const t of tokens) {
      const idx = t.indexOf(':')
      const name = t.slice(0, idx)
      const bp = BREAKPOINT_PX[name]
      if (bp == null) continue
      if (w >= bp && bp >= best) {
        best = bp
        value = t.slice(idx + 1)
      }
    }
    return value
  }

  /** 断点跨越（matchMedia change）→ 重算生效值（placement/size 断点简写） */
  private onBreakpointChange = (): void => {
    this.update()
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
      this.hasAttr('modal') ? 'calc(calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040)) + 1)' : 'calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000))'
    };`
    target.appendChild(host)
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${STYLE}</style>`
    root.appendChild(this.panel)
    this.portalHost = host
    this.bridgeSlotContent(host)
  }

  /** slot 桥接：宿主 light DOM 的全部命名 slot 节点移入 portal host light DOM（幂等，已在内为 no-op） */
  private bridgeSlotContent(host: HTMLElement): void {
    for (const n of this.querySelectorAll<HTMLElement>(SLOT_SELECTOR)) {
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
    for (const n of host.querySelectorAll<HTMLElement>(SLOT_SELECTOR)) {
      this.appendChild(n)
    }
    host.remove()
  }

  // —— modal——

  /**
   * modal 化同步：backdrop 显隐 + aria-modal + 滚动锁 + 焦点陷阱。
   * P3 trap-focus：焦点陷阱与遮罩解耦——modal 或 trap-focus 任一开启都挂陷阱
   * （表单浮层 Tab 不逃逸，无需遮罩）；遮罩/aria-modal/滚动锁仍为 modal 专属。
   * 滚动锁带幂等守卫（open 期间多次 update 不重复加锁，关闭/断开恰好解一次）；
   * 陷阱仅最上层接管（openLayers 栈序，嵌套时内层优先）。
   */
  private syncModal(show: boolean): void {
    const isModal = this.hasAttr('modal') && show
    const trap = show && (isModal || this.hasAttr('trap-focus'))
    this.panel?.classList.toggle('oas-modal', isModal)
    if (isModal) this.panel?.setAttribute('aria-modal', 'true')
    else this.panel?.removeAttribute('aria-modal')
    this.backdrop?.classList.toggle('oas-show', isModal)
    if (trap && !this.trapBound) {
      this.trapBound = true
      document.addEventListener('keydown', this.onTrapKey)
    } else if (!trap && this.trapBound) {
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

  /** 当前是否为最上层需要接管焦点陷阱的层（modal 或 trap-focus；嵌套时仅最内层接管） */
  private isTopModal(): boolean {
    const trappable = openLayers.filter(
      (l) =>
        l.hasAttribute('open') && (l.hasAttribute('modal') || l.hasAttribute('trap-focus')),
    )
    return trappable[trappable.length - 1] === this
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
    for (const n of this.querySelectorAll<HTMLElement>(SLOT_SELECTOR)) {
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
      else if (
        node instanceof HTMLElement &&
        (SLOT_NAMES as readonly string[]).includes(node.getAttribute('slot') ?? '')
      )
        return true
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
   * title 吸收：title 渲染进可见标题区后即从宿主移除（card 同款状态机）——吸收块位于
   * 冻结 gate 之后，fresh 冻结期间缓存与 DOM 一并冻结（冻结对缓存生效，语义不变）；
   * 打开/首次写入时吸收并缓存驱动渲染，宿主无残留原生悬浮提示。
   */
  private syncText(): void {
    if (!this.panel) return
    // P22 destroy-on-hide：销毁后关闭态不重写（打开瞬间 update 开头恢复挂载并复位标志）
    if (this.destroyed && !this.hasAttr('open')) return
    const open = this.hasAttr('open')
    if (!open && !this.hasAttr('fresh') && this.contentWritten) return
    this.contentWritten = true
    // 状态机：属性在场（含空串）= 宿主意图（写入新值/空串清空）→ 更新缓存并移除；
    // 属性缺席 = 内部吸收后的常态（或宿主 removeAttribute，此时保持已渲染标题，
    // 清空请用 title=""）。缓存驱动渲染，吸收触发的二次 update 幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? null : raw
      this.removeAttribute('title')
    }
    // 从 this.panel 查（而非 this.shadow）：portal（append-to）期间面板在 portal host 的
    // shadow 内，原 shadow 查询会落空
    // title 双通道：属性文本写入兜底 span；slot="title" 有真实内容时以插槽为准（兜底隐藏）。
    // P11 header 接管：slot="header" 有内容时整个标题区让位（兜底一并隐藏）
    const titleEl = this.panel.querySelector<HTMLElement>('[part="title"]')
    const titleSlot = this.panel.querySelector<HTMLSlotElement>('slot[name="title"]')
    const titleFallback = this.panel.querySelector<HTMLElement>('.title-text')
    const headerSlot = this.panel.querySelector<HTMLSlotElement>('slot[name="header"]')
    const hasHeader = headerSlot ? this.slotHasContent(headerSlot) : false
    const title = this.titleCache ?? ''
    let hasSlotTitle = false
    if (titleEl && titleSlot && titleFallback) {
      hasSlotTitle = this.hasTitleSlotContent(titleSlot)
      titleFallback.textContent = title
      titleFallback.hidden = hasSlotTitle || hasHeader
    } else if (titleEl) {
      // 降级：无 slot 结构（旧版 SSR 快照）直接写标题区文本
      titleEl.textContent = title
    }
    this.panel.querySelector<HTMLElement>('[part="content"]')!.textContent = this.getAttr(
      'content',
      '',
    )
  }

  /** 头部显隐：无标题且非 closable 时整行折叠（关闭按钮仍保留在 DOM）；
   *  closable 时面板挂 oas-closable 类——close-btn 默认 display:none，
   *  可见性由 `.panel.oas-closable .close-btn` 规则驱动（hidden 只管冗余语义）。
   *  标题判空走双通道：titleCache（属性通道）或 title 插槽有真实内容都算有标题；
   *  P11 header 插槽有内容时接管头部（标题区让位、head 不折叠、aria-labelledby 指向 head 容器）；
   *  syncText 先于本方法执行（吸收已更新缓存；冻结期间缓存与 DOM 同步冻结，
   *  判空与所见一致） */
  private syncHead(): void {
    const head = this.panel?.querySelector<HTMLElement>('.head')
    if (!head) return
    const titleSlot = this.panel?.querySelector<HTMLSlotElement>('slot[name="title"]')
    const headerSlot = this.panel?.querySelector<HTMLSlotElement>('slot[name="header"]')
    const hasSlotTitle = titleSlot ? this.hasTitleSlotContent(titleSlot) : false
    const hasHeader = headerSlot ? this.slotHasContent(headerSlot) : false
    const hasTitle = (this.titleCache ?? '') !== '' || hasSlotTitle
    const titleEl = this.panel?.querySelector<HTMLElement>('[part="title"]')
    if (titleEl) titleEl.hidden = hasHeader && !hasSlotTitle ? true : false
    head.classList.toggle('oas-empty', !hasTitle && !hasHeader && !this.hasAttr('closable'))
    // aria-labelledby：header 接管时指向 head 容器（header 内容构成可访问名），否则指向标题区
    if (hasHeader) this.panel?.setAttribute('aria-labelledby', 'pop-head')
    else if (hasTitle) this.panel?.setAttribute('aria-labelledby', 'pop-title')
    else this.panel?.removeAttribute('aria-labelledby')
    this.panel?.classList.toggle('oas-closable', this.hasAttr('closable'))
    this.closeBtn?.toggleAttribute('hidden', !this.hasAttr('closable'))
    this.closeBtn?.setAttribute('aria-label', this.t('popover.close'))
  }

  /** P11 footer：底部操作区显隐（slot="footer" 有真实内容才显示） */
  private syncFoot(): void {
    const foot = this.panel?.querySelector<HTMLElement>('[part="foot"]')
    if (!foot) return
    const slot = foot.querySelector<HTMLSlotElement>('slot[name="footer"]')
    const has = slot ? this.slotHasContent(slot) : false
    foot.classList.toggle('oas-empty', !has)
  }

  /** P7 description：补充说明区显隐 + 面板 aria-describedby 关联（有内容才关联） */
  private syncDescription(): void {
    const box = this.panel?.querySelector<HTMLElement>('[part="description"]')
    if (!box || !this.panel) return
    const slot = box.querySelector<HTMLSlotElement>('slot[name="description"]')
    const has = slot ? this.slotHasContent(slot) : false
    box.classList.toggle('oas-empty', !has)
    if (has) this.panel.setAttribute('aria-describedby', box.id)
    else this.panel.removeAttribute('aria-describedby')
  }

  /** P6 size 尺寸档（small/medium/large）：面板写 data-size（CSS 档位变量覆写）；非法值回落 medium。
   *  P23 断点简写（"small md:large"）按当前视口宽度取生效值 */
  private syncSize(): void {
    const raw = this.resolveResponsive(this.getAttr('size', 'medium')).trim()
    const s = raw === 'small' || raw === 'large' ? raw : 'medium'
    this.panel?.setAttribute('data-size', s)
  }

  /** P10 scrollable：面板内滚动开关（data-scrollable → CSS flex 列布局 + body 区 overflow） */
  private syncScrollable(): void {
    this.panel?.toggleAttribute('data-scrollable', this.hasAttr('scrollable'))
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

  /** auto-close：打开后计时自动关闭（open 期间重设；关闭/重开时清理）；P5 可被 before-close 拦截 */
  private syncAutoClose(open: boolean): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer)
      this.autoCloseTimer = null
    }
    if (!open) return
    const ms = Number.parseInt(this.getAttr('auto-close', ''), 10)
    if (Number.isFinite(ms) && ms > 0) {
      this.autoCloseTimer = setTimeout(() => this.closeWith('auto'), ms)
    }
  }

  // —— 滚动/尺寸变化重定位 ——

  /**
   * 滚动/窗口尺寸变化时重定位：打开期间监听 scroll（capture 捕获嵌套容器滚动）与 resize，
   * rAF 节流。虚拟坐标点（视口坐标不随滚动变化）不跟随；真实锚点 / virtual-anchor 元素跟随。
   * P14 close-on-scroll：滚动即关闭（可取消）优先于重定位。
   * P18 sticky=off：不挂监听（syncScrollFollow gate）。
   */
  private syncScrollFollow(open: boolean): void {
    if (typeof window === 'undefined') return
    const track =
      open && !this.hasVirtualPoint() && this.getAttr('sticky', 'partial') !== 'off'
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
      // 滞留 scroll 事件防御：滚动发生在打开之前（scroll 事件 task 异步派发、晚于打开执行，
      // 如 scrollIntoViewIfNeeded 后立即触发打开），scrollY 与打开瞬间相同 → 无有效滚动，
      // 不重定位（会把 contextmenu/长按的光标定位覆盖回锚点）也不触发 close-on-scroll
      if (Number.isFinite(this.openScrollY) && window.scrollY === this.openScrollY) return
      // P14 close-on-scroll：滚动即关闭（可取消），优先于跟随重定位
      if (this.hasAttr('close-on-scroll')) {
        this.closeWith('scroll')
        return
      }
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
    // P22 destroy-on-hide：打开瞬间恢复内容挂载（unstash 后 syncText 按首次写入路径重写）
    if (open && this.destroyed) {
      this.destroyed = false
      this.unstashSlots()
      this.contentWritten = false
    }
    // P15 hide-empty：无内容面板不显示（触发路径 requestOpen 已拦；受控 setAttribute 在此视觉 gate）
    const showPanel = open && !(this.hasAttr('hide-empty') && this.isEmptyPopup())
    // 整体禁用：aria-disabled 同步（仅 disabled 时设置，避免 SSR 快照宿主带 aria-disabled="false"；
    // 视觉降饱和走 CSS :host([disabled])）
    if (this.hasAttr('disabled')) this.setAttribute('aria-disabled', 'true')
    else this.removeAttribute('aria-disabled')
    // 内容与头部（fresh 冻结语义见 syncText）
    this.syncText()
    this.syncHead()
    this.syncFoot()
    this.syncDescription()
    this.syncSize()
    this.syncScrollable()
    this.syncColor()
    this.syncArrowMerge()
    // P1 触发元素 ARIA 关联（expanded 随面板实际可见态）
    this.syncAnchorAria(showPanel)
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
        // 打开瞬间记录页面 scrollY（滞留 scroll 事件防御，见 onScroll）
        this.openScrollY = typeof window !== 'undefined' ? window.scrollY : Number.NaN
      }
      // virtual 模式下生命周期由宿主控制，不注册外部点击关闭
      if (!this.hasAttr('virtual')) document.addEventListener('click', this.handleOutside, true)
      else document.removeEventListener('click', this.handleOutside, true)
      this.panel.classList.remove('oas-closing')
      this.panel.setAttribute('aria-hidden', String(!showPanel))
      this.syncWidth()
      this.syncPortal(showPanel)
      this.syncModal(showPanel)
      // 打开瞬间的焦点策略（modal 必聚焦 > initial-focus > focus-on-open）——在面板
      // aria-hidden=false（display 解除）之后执行：真实浏览器对 display:none 元素的
      // focus() 静默失败（面板 fallback 聚焦路径曾收不进焦点，e2e 实测）
      if (!this.wasOpen) {
        this.applyInitialFocus()
      }
      // P20 光标触点：contextmenu/触屏长按打开期间一律按光标定位（cursorRect 生命周期 =
      // 写入 → 打开期间持续生效 → 关闭清除。不能只看「打开瞬间」：title 吸收的
      // removeAttribute 会触发嵌套 update（完整跑完并置 wasOpen=true），外层余下
      // 分支会以锚点定位覆盖光标）；滚动/尺寸重定位走 onScroll 的锚点路径（光标无滚动语义）
      if (this.cursorRect) {
        this.position(this.cursorRect)
      } else {
        this.position()
      }
      this.syncScrollFollow(showPanel)
      this.syncAutoClose(showPanel)
    } else {
      this.clearOpenTimer()
      this.clearCloseTimer()
      this.syncAutoClose(false)
      // P20 光标触点随关闭清除（下次 contextmenu/长按重新写入）
      this.cursorRect = null
      if (this.wasOpen) {
        this.playClose()
        // P22 destroy-on-hide：关闭即销毁内容呈现（DOM 卸载，重开恢复挂载）
        if (this.hasAttr('destroy-on-hide')) this.destroyContent()
      } else {
        this.panel.setAttribute('aria-hidden', 'true')
      }
      if (this.wasOpen) this.closeNested()
      unregisterLayer(this)
      document.removeEventListener('click', this.handleOutside, true)
      this.syncPortal(false)
      this.syncModal(false)
      this.syncScrollFollow(false)
    }
    this.wasOpen = open
  }
}
