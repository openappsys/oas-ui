export type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'

export interface PositionResult {
  top: number
  left: number
  placement: Placement
}

export interface Viewport {
  width: number
  height: number
}

/** 浮层定位选项：skidding 交叉轴偏移（px，正方向：top/bottom 向右、left/right 向下）；collisionPadding 视口避让边距 */
export interface PositionOptions {
  skidding?: number
  collisionPadding?: number
}

const GAP = 8
const DEFAULT_PADDING = 4

/** placement 拆分为主方向 + 对齐方式：top-start → { main: 'top', align: 'start' } */
function splitPlacement(placement: Placement): {
  main: 'top' | 'bottom' | 'left' | 'right'
  align: 'start' | 'end' | 'center'
} {
  const [main, align] = placement.split('-') as [Placement, string | undefined]
  return {
    main: (['top', 'bottom', 'left', 'right'].includes(main) ? main : 'top') as
      | 'top'
      | 'bottom'
      | 'left'
      | 'right',
    align: align === 'start' || align === 'end' ? align : 'center',
  }
}

function joinPlacement(main: 'top' | 'bottom' | 'left' | 'right', align: 'start' | 'end' | 'center'): Placement {
  return align === 'center' ? main : `${main}-${align}`
}

/**
 * 计算浮层位置：锚点锚定 + 边距 + 空间不足时沿主轴翻转 + 视口避让。
 *
 * 支持 12 向 placement：主方向（top/bottom/left/right）× 对齐（start/end/center）。
 * start 对齐 = 面板边缘对齐锚点对应边缘（top-start：面板左缘对齐锚点左缘）；
 * end 对齐 = 面板另一侧边缘对齐锚点对应边缘；center（省略 -start/-end）= 居中。
 * 翻转（主轴空间不足）保留对齐方式：top-start → bottom-start。
 *
 * @param adjustOverflow 视口自动调整（默认 true）：true 时空间不足沿主轴翻转、
 *   并夹取到视口边缘 collisionPadding（默认 4px）内；false 时保持声明 placement 不做翻转、不避让
 *   （浮层可能溢出视口）。
 * @param options.skidding 交叉轴偏移（px）：top/bottom 系列沿水平轴（正右负左），
 *   left/right 系列沿垂直轴（正下负上）。不随翻转反向（对齐语义固定）。
 * @param options.collisionPadding 视口避让边距（px），默认 4
 */
export function computePosition(
  anchor: DOMRect,
  popup: DOMRect,
  placement: Placement,
  viewport: Viewport,
  gap = GAP,
  adjustOverflow = true,
  options: PositionOptions = {},
): PositionResult {
  const { main, align } = splitPlacement(placement)
  const skidding = options.skidding ?? 0
  const padding = options.collisionPadding ?? DEFAULT_PADDING
  let actualMain: 'top' | 'bottom' | 'left' | 'right' = main
  let actualAlign: 'start' | 'end' | 'center' = align

  const anchorCenterX = anchor.left + anchor.width / 2
  const anchorCenterY = anchor.top + anchor.height / 2

  if (adjustOverflow) {
    const fits = (m: 'top' | 'bottom' | 'left' | 'right'): boolean => {
      switch (m) {
        case 'top':
          return anchor.top - popup.height - gap >= 0
        case 'bottom':
          return anchor.bottom + popup.height + gap <= viewport.height
        case 'left':
          return anchor.left - popup.width - gap >= 0
        case 'right':
          return anchor.right + popup.width + gap <= viewport.width
      }
    }

    if (!fits(actualMain)) {
      const flipped: Record<'top' | 'bottom' | 'left' | 'right', 'top' | 'bottom' | 'left' | 'right'> = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      }
      const flippedMain = flipped[actualMain]
      if (fits(flippedMain)) actualMain = flippedMain
    }
  }

  // 主轴坐标：top/bottom 用 top，left/right 用 left
  let top = 0
  let left = 0

  if (actualMain === 'top' || actualMain === 'bottom') {
    // 交叉轴 = 水平：start → 面板左缘对齐锚点左缘；end → 面板右缘对齐锚点右缘；center → 居中
    let x = 0
    switch (actualAlign) {
      case 'start':
        x = anchor.left
        break
      case 'end':
        x = anchor.right - popup.width
        break
      default:
        x = anchorCenterX - popup.width / 2
    }
    x += skidding
    left = x
    top = actualMain === 'top' ? anchor.top - popup.height - gap : anchor.bottom + gap
  } else {
    // 交叉轴 = 垂直：start → 面板顶缘对齐锚点顶缘；end → 面板底缘对齐锚点底缘；center → 居中
    let y = 0
    switch (actualAlign) {
      case 'start':
        y = anchor.top
        break
      case 'end':
        y = anchor.bottom - popup.height
        break
      default:
        y = anchorCenterY - popup.height / 2
    }
    y += skidding
    top = y
    left = actualMain === 'left' ? anchor.left - popup.width - gap : anchor.right + gap
  }

  if (adjustOverflow) {
    left = Math.max(padding, Math.min(left, viewport.width - popup.width - padding))
    top = Math.max(padding, Math.min(top, viewport.height - popup.height - padding))
  }
  return { top, left, placement: joinPlacement(actualMain, actualAlign) }
}
