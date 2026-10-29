import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MIN_SIZE,
  DEFAULT_RECT,
  clampSize,
  clampToBoundary,
  formatRect,
  keyboardMove,
  keyboardResize,
  keyboardResizeEdge,
  moveBy,
  normalizeRect,
  parseRect,
  parseSizePair,
  rectEquals,
  resizeBy,
  resolveLimits,
  type PanelRect,
} from './geometry.js'

/**
 * geometry 纯函数测试（零 DOM）。
 *
 * 约定：所有输出取整（Math.round）；边界只夹取「被拖动的边」，不压缩尺寸（尺寸只受 min/max 约束），
 * 与边界冲突时 min 优先（允许溢出边界，防出现负/不可用尺寸）。
 */

const rect = (x: number, y: number, width: number, height: number): PanelRect => ({ x, y, width, height })

describe('parseRect / formatRect', () => {
  it('解析逗号与空格分隔的四元组', () => {
    expect(parseRect('10,20,300,200')).toEqual(rect(10, 20, 300, 200))
    expect(parseRect(' 10 20 300 200 ')).toEqual(rect(10, 20, 300, 200))
    expect(parseRect('10 , 20 ,300, 200')).toEqual(rect(10, 20, 300, 200))
  })

  it('缺省 / 非法 / 非有限 / 非正尺寸回落缺省 rect', () => {
    for (const raw of [null, undefined, '', '  ', '10,20,300', '10,20,300,200,5', 'a,b,c,d', '1e999,0,10,10']) {
      expect(parseRect(raw as string | null | undefined), `raw=${String(raw)}`).toEqual(DEFAULT_RECT)
    }
    expect(parseRect('0,0,0,200')).toEqual(DEFAULT_RECT)
    expect(parseRect('0,0,200,-1')).toEqual(DEFAULT_RECT)
  })

  it('小数输入取整；fallback 可自定义', () => {
    expect(parseRect('10.4,20.6,300.5,200.4')).toEqual(rect(10, 21, 301, 200))
    expect(parseRect('bad', rect(1, 2, 3, 4))).toEqual(rect(1, 2, 3, 4))
  })

  it('formatRect 输出可被 parseRect 还原（往返稳定）', () => {
    const r = rect(12, 34, 560, 480)
    expect(formatRect(r)).toBe('12,34,560,480')
    expect(parseRect(formatRect(r))).toEqual(r)
    expect(formatRect({ x: 1.4, y: 2.6, width: 300.5, height: 200.4 })).toBe('1,3,301,200')
  })
})

describe('parseSizePair / resolveLimits', () => {
  it('单值应用到宽高，双值分开解析，非法回落', () => {
    expect(parseSizePair('200', null)).toEqual({ width: 200, height: 200 })
    expect(parseSizePair('200,120', null)).toEqual({ width: 200, height: 120 })
    expect(parseSizePair('200 120', null)).toEqual({ width: 200, height: 120 })
    expect(parseSizePair('', null)).toBeNull()
    expect(parseSizePair('0,120', null)).toBeNull()
    expect(parseSizePair('abc', { width: 1, height: 1 })).toEqual({ width: 1, height: 1 })
  })

  it('缺省 min 为 160×96，max 缺省不限制', () => {
    expect(resolveLimits(null, null)).toEqual({
      minWidth: DEFAULT_MIN_SIZE.width,
      minHeight: DEFAULT_MIN_SIZE.height,
      maxWidth: Number.POSITIVE_INFINITY,
      maxHeight: Number.POSITIVE_INFINITY,
    })
    expect(resolveLimits('200,120', '640,480')).toEqual({
      minWidth: 200,
      minHeight: 120,
      maxWidth: 640,
      maxHeight: 480,
    })
  })

  it('min > max 退化：以 min 为准（不产生负尺寸）', () => {
    expect(resolveLimits('300,200', '100,50')).toEqual({
      minWidth: 300,
      minHeight: 200,
      maxWidth: 300,
      maxHeight: 200,
    })
    // 单轴退化，另一轴保持
    expect(resolveLimits('300', '500,100')).toEqual({
      minWidth: 300,
      minHeight: 300,
      maxWidth: 500,
      maxHeight: 300,
    })
  })

  it('clampSize 同时受 min/max 约束，min>max 时 min 优先', () => {
    const limits = resolveLimits('160,96', '640,480')
    expect(clampSize(100, 50, limits)).toEqual({ width: 160, height: 96 })
    expect(clampSize(900, 900, limits)).toEqual({ width: 640, height: 480 })
    const degenerate = { minWidth: 300, minHeight: 200, maxWidth: 100, maxHeight: 50 }
    expect(clampSize(50, 50, degenerate)).toEqual({ width: 300, height: 200 })
  })
})

describe('normalizeRect', () => {
  const limits = resolveLimits('160,96', '640,480')

  it('缺失/非有限字段回落，尺寸夹取到 min/max，输出取整', () => {
    expect(normalizeRect({ x: 10.4, y: 20.6 }, limits)).toEqual(rect(10, 21, 420, 300))
    expect(normalizeRect({ width: 100, height: 50 }, limits)).toEqual(rect(48, 48, 160, 96))
    expect(normalizeRect({ width: 1000, height: 1000 }, limits)).toEqual(rect(48, 48, 640, 480))
    expect(normalizeRect({ x: Number.NaN, y: 10, width: Number.POSITIVE_INFINITY, height: 200 }, limits)).toEqual(
      rect(48, 10, 420, 200),
    )
  })

  it('min>max 的 limits 也按 min 收敛', () => {
    const degenerate = { minWidth: 300, minHeight: 200, maxWidth: 100, maxHeight: 50 }
    expect(normalizeRect({ x: 0, y: 0, width: 120, height: 120 }, degenerate)).toEqual(rect(0, 0, 300, 200))
  })

  it('rectEquals 对取整后的值判等', () => {
    expect(rectEquals(rect(1, 2, 3, 4), rect(1, 2, 3, 4))).toBe(true)
    expect(rectEquals(rect(1, 2, 3, 4), rect(1, 2, 3, 5))).toBe(false)
  })
})

describe('clampToBoundary / moveBy', () => {
  const boundary = { x: 0, y: 0, width: 500, height: 400 }

  it('四边夹取（含 padding）', () => {
    expect(moveBy(rect(100, 100, 200, 100), -300, -300, boundary, 10)).toEqual(rect(10, 10, 200, 100))
    expect(moveBy(rect(100, 100, 200, 100), 300, 300, boundary, 10)).toEqual(rect(290, 290, 200, 100))
    expect(moveBy(rect(100, 100, 200, 100), 20, 20, boundary, 0)).toEqual(rect(120, 120, 200, 100))
  })

  it('负 padding 按 0 处理；缺失/零尺寸边界不夹取', () => {
    expect(clampToBoundary(rect(-50, -50, 200, 100), boundary, -20)).toEqual(rect(0, 0, 200, 100))
    expect(clampToBoundary(rect(-50, -50, 200, 100), null, 10)).toEqual(rect(-50, -50, 200, 100))
    expect(clampToBoundary(rect(-50, -50, 200, 100), { x: 0, y: 0, width: 0, height: 0 }, 10)).toEqual(
      rect(-50, -50, 200, 100),
    )
  })

  it('面板大于边界：贴起始边（不压缩尺寸）', () => {
    const big = rect(0, 0, 600, 500)
    expect(moveBy(big, 30, 30, { x: 0, y: 0, width: 300, height: 200 }, 10)).toEqual(rect(10, 10, 600, 500))
  })

  it('边界非零原点：按边界偏移夹取', () => {
    const b = { x: 200, y: 100, width: 400, height: 300 }
    expect(moveBy(rect(200, 100, 200, 100), -999, -999, b, 0)).toEqual(rect(200, 100, 200, 100))
    expect(moveBy(rect(200, 100, 200, 100), 999, 999, b, 0)).toEqual(rect(400, 300, 200, 100))
  })
})

describe('resizeBy：四边与四角', () => {
  const limits = resolveLimits('100,80', '300,250')
  const base = rect(100, 100, 200, 150)

  it('四角缩放（对角固定）', () => {
    expect(resizeBy(base, 'se', 50, 50, limits)).toEqual(rect(100, 100, 250, 200))
    expect(resizeBy(base, 'nw', -20, -20, limits)).toEqual(rect(80, 80, 220, 170))
    expect(resizeBy(base, 'ne', 30, -30, limits)).toEqual(rect(100, 70, 230, 180))
    expect(resizeBy(base, 'sw', -30, 30, limits)).toEqual(rect(70, 100, 230, 180))
  })

  it('四边缩放（对边固定）', () => {
    expect(resizeBy(base, 'e', 50, 0, limits)).toEqual(rect(100, 100, 250, 150))
    expect(resizeBy(base, 'w', -50, 0, limits)).toEqual(rect(50, 100, 250, 150))
    expect(resizeBy(base, 's', 0, 50, limits)).toEqual(rect(100, 100, 200, 200))
    expect(resizeBy(base, 'n', 0, -50, limits)).toEqual(rect(100, 50, 200, 200))
  })

  it('缩到 min：拖动边停在 min 处，对边不动', () => {
    expect(resizeBy(base, 'e', -150, 0, limits)).toEqual(rect(100, 100, 100, 150))
    expect(resizeBy(base, 'w', 150, 0, limits)).toEqual(rect(200, 100, 100, 150))
    expect(resizeBy(base, 'n', 0, 100, limits)).toEqual(rect(100, 170, 200, 80))
    expect(resizeBy(base, 's', 0, -200, limits)).toEqual(rect(100, 100, 200, 80))
  })

  it('放大到 max：尺寸封顶，拖动边回退', () => {
    expect(resizeBy(base, 'e', 500, 0, limits)).toEqual(rect(100, 100, 300, 150))
    expect(resizeBy(base, 'w', -500, 0, limits)).toEqual(rect(0, 100, 300, 150))
    expect(resizeBy(base, 's', 0, 500, limits)).toEqual(rect(100, 100, 200, 250))
  })

  it('min > max：按 min 收敛（不产生负尺寸）', () => {
    const degenerate = resolveLimits('200,150', '100,80')
    expect(resizeBy(base, 'e', -50, 0, degenerate)).toEqual(rect(100, 100, 200, 150))
    expect(resizeBy(base, 'e', 50, 0, degenerate)).toEqual(rect(100, 100, 200, 150))
  })

  it('边界夹取：拖动边不越界；min 与边界冲突时 min 优先', () => {
    const b = { x: 0, y: 0, width: 500, height: 400 }
    const roomy = resolveLimits('100,80', '1000,1000')
    expect(resizeBy(base, 'w', -300, 0, roomy, b, 10)).toEqual(rect(10, 100, 290, 150))
    expect(resizeBy(base, 'e', 300, 0, roomy, b, 10)).toEqual(rect(100, 100, 390, 150))
    expect(resizeBy(base, 'nw', -300, -300, roomy, b, 10)).toEqual(rect(10, 10, 290, 240))
    // 极小边界：右侧只剩 10px，小于 min → min 优先（允许溢出边界）
    const tiny = { x: 0, y: 0, width: 120, height: 120 }
    expect(resizeBy(base, 'e', 50, 0, limits, tiny, 10)).toEqual(rect(100, 100, 100, 150))
  })

  it('零尺寸边界与负 padding 不破坏结果', () => {
    expect(resizeBy(base, 'se', 20, 20, limits, { x: 0, y: 0, width: 0, height: 0 }, 10)).toEqual(
      rect(100, 100, 220, 170),
    )
    expect(resizeBy(base, 'w', -20, 0, limits, null, -10)).toEqual(rect(80, 100, 220, 150))
  })
})

describe('键盘移动 / 缩放（RTL 镜像）', () => {
  const limits = resolveLimits('100,80', '400,300')
  const base = rect(100, 100, 200, 150)

  it('方向键移动，RTL 下水平方向镜像，垂直不变', () => {
    expect(keyboardMove(base, 'ArrowRight', { direction: 'ltr' })).toEqual(rect(108, 100, 200, 150))
    expect(keyboardMove(base, 'ArrowRight', { direction: 'rtl' })).toEqual(rect(92, 100, 200, 150))
    expect(keyboardMove(base, 'ArrowLeft', { direction: 'ltr' })).toEqual(rect(92, 100, 200, 150))
    expect(keyboardMove(base, 'ArrowLeft', { direction: 'rtl' })).toEqual(rect(108, 100, 200, 150))
    expect(keyboardMove(base, 'ArrowUp', { direction: 'rtl' })).toEqual(rect(100, 92, 200, 150))
    expect(keyboardMove(base, 'ArrowDown', { direction: 'ltr' })).toEqual(rect(100, 108, 200, 150))
    expect(keyboardMove(base, 'Enter', {})).toBeNull()
  })

  it('自定义步长与缺省步长', () => {
    expect(keyboardMove(base, 'ArrowRight', { step: 4 })).toEqual(rect(104, 100, 200, 150))
    expect(keyboardMove(base, 'ArrowRight', {})).toEqual(rect(108, 100, 200, 150))
    expect(keyboardMove(base, 'ArrowRight', { step: 0 })).toEqual(rect(108, 100, 200, 150))
    expect(keyboardMove(base, 'ArrowRight', { step: Number.NaN })).toEqual(rect(108, 100, 200, 150))
  })

  it('Shift 方向键缩放：LTR 右扩右缘、左缩右缘；RTL 镜像', () => {
    // LTR：Right 扩东边（宽 +step）
    expect(keyboardResize(base, 'ArrowRight', { direction: 'ltr', limits })).toEqual(rect(100, 100, 208, 150))
    // LTR：Left 收西边（x +step，宽 -step）
    expect(keyboardResize(base, 'ArrowLeft', { direction: 'ltr', limits })).toEqual(rect(108, 100, 192, 150))
    // RTL：Right 扩西边（x -step，宽 +step）
    expect(keyboardResize(base, 'ArrowRight', { direction: 'rtl', limits })).toEqual(rect(92, 100, 208, 150))
    // RTL：Left 收东边（宽 -step，x 不变）
    expect(keyboardResize(base, 'ArrowLeft', { direction: 'rtl', limits })).toEqual(rect(100, 100, 192, 150))
    // 垂直不镜像
    expect(keyboardResize(base, 'ArrowDown', { direction: 'rtl', limits })).toEqual(rect(100, 100, 200, 158))
    expect(keyboardResize(base, 'ArrowUp', { direction: 'ltr', limits })).toEqual(rect(100, 108, 200, 142))
    expect(keyboardResize(base, 'Tab', { limits })).toBeNull()
  })

  it('键盘缩放同样受 min/max 约束', () => {
    const small = rect(100, 100, 100, 80)
    expect(keyboardResize(small, 'ArrowLeft', { direction: 'ltr', limits })).toEqual(rect(100, 100, 100, 80))
    const big = rect(100, 100, 400, 300)
    expect(keyboardResize(big, 'ArrowRight', { direction: 'ltr', limits })).toEqual(rect(100, 100, 400, 300))
  })

  it('keyboardResizeEdge：按键 → 缩放边（RTL 镜像水平）', () => {
    expect(keyboardResizeEdge('ArrowRight', 'ltr')).toBe('e')
    expect(keyboardResizeEdge('ArrowRight', 'rtl')).toBe('w')
    expect(keyboardResizeEdge('ArrowLeft', 'ltr')).toBe('w')
    expect(keyboardResizeEdge('ArrowLeft', 'rtl')).toBe('e')
    expect(keyboardResizeEdge('ArrowDown', 'rtl')).toBe('s')
    expect(keyboardResizeEdge('ArrowUp', 'ltr')).toBe('n')
    expect(keyboardResizeEdge('Enter', 'ltr')).toBeNull()
  })
})
