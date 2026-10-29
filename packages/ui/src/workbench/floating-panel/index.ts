import { OASFloatingPanel } from './oas-floating-panel.js'

if (!customElements.get('oas-floating-panel')) {
  customElements.define('oas-floating-panel', OASFloatingPanel)
}

export { OASFloatingPanel }
export type {
  FloatingPanelActionSource,
  FloatingPanelActivateDetail,
  FloatingPanelActivateSource,
  FloatingPanelBeforeCloseDetail,
  FloatingPanelCloseReason,
  FloatingPanelMoveDetail,
  FloatingPanelOpenChangeDetail,
  FloatingPanelResizeDetail,
  FloatingPanelTransformSource,
} from './oas-floating-panel.js'
export type { BoundaryRect, KeyboardDirection, PanelRect, ResizeEdge, SizeLimits, SizePair } from './geometry.js'

export interface FloatingPanelProps {
  /** 打开态（唯一状态源；外部写属性静默吸收） */
  open?: boolean
  /** `x,y,width,height`（相对宿主锚点的像素坐标；缺省 48,48,420,300） */
  rect?: string
  /** 标题文本（title 插槽覆盖） */
  'panel-title'?: string
  /** 标题栏拖动 + 框体聚焦时方向键移动 */
  movable?: boolean
  /** 八向手柄 + Shift+方向键缩放 */
  resizable?: boolean
  /** 边界：viewport（默认）或 CSS 选择器（只约束交互） */
  boundary?: string
  /** 边界内缩像素（非负；非法回落 0） */
  'boundary-padding'?: number
  /** 最小尺寸 `宽,高`（缺省 160,96） */
  min?: string
  /** 最大尺寸 `宽,高`（缺省不限制） */
  max?: string
  /** 打开时聚焦的选择器（light DOM 或 shadow 内） */
  'initial-focus'?: string
}

export interface FloatingPanelEventMap {
  'oas-before-close': CustomEvent<import('./oas-floating-panel.js').FloatingPanelBeforeCloseDetail>
  'oas-open-change': CustomEvent<import('./oas-floating-panel.js').FloatingPanelOpenChangeDetail>
  'oas-move': CustomEvent<import('./oas-floating-panel.js').FloatingPanelMoveDetail>
  'oas-resize': CustomEvent<import('./oas-floating-panel.js').FloatingPanelResizeDetail>
  'oas-activate': CustomEvent<import('./oas-floating-panel.js').FloatingPanelActivateDetail>
}
