export type Placement = 'top' | 'bottom' | 'left' | 'right'

export interface PositionResult {
  top: number
  left: number
  placement: Placement
}

export interface Viewport {
  width: number
  height: number
}

const GAP = 8

/**
 * 计算浮层位置：锚点锚定 + 边距 + 空间不足时沿主轴翻转 + 视口避让。
 *
 * @param adjustOverflow 视口自动调整（默认 true）：true 时空间不足沿主轴翻转、
 *   并夹取到视口边缘 4px 内；false 时保持声明 placement 不做翻转、不避让
 *   （浮层可能溢出视口）。
 */
export function computePosition(
  anchor: DOMRect,
  popup: DOMRect,
  placement: Placement,
  viewport: Viewport,
  gap = GAP,
  adjustOverflow = true,
): PositionResult {
  let actual: Placement = placement
  let top = 0
  let left = 0

  const anchorCenterX = anchor.left + anchor.width / 2
  const anchorCenterY = anchor.top + anchor.height / 2

  if (adjustOverflow) {
    const fits = (p: Placement): boolean => {
      switch (p) {
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

    if (!fits(actual)) {
      const flipped: Record<Placement, Placement> = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      }
      if (fits(flipped[actual])) actual = flipped[actual]
    }
  }

  switch (actual) {
    case 'top':
      top = anchor.top - popup.height - gap
      left = anchorCenterX - popup.width / 2
      break
    case 'bottom':
      top = anchor.bottom + gap
      left = anchorCenterX - popup.width / 2
      break
    case 'left':
      left = anchor.left - popup.width - gap
      top = anchorCenterY - popup.height / 2
      break
    case 'right':
      left = anchor.right + gap
      top = anchorCenterY - popup.height / 2
      break
  }

  if (adjustOverflow) {
    left = Math.max(4, Math.min(left, viewport.width - popup.width - 4))
    top = Math.max(4, Math.min(top, viewport.height - popup.height - 4))
  }
  return { top, left, placement: actual }
}
