/**
 * `oas-floating-panel` 几何纯函数（零 DOM）。
 *
 * 坐标空间：`x` / `y` 为相对宿主锚点的像素偏移（宿主零尺寸、position: relative；框体 absolute）。
 * 所有输出取整（Math.round），保证 SSR / 客户端 / 测试同一输入得到同一结果。
 *
 * 规则：
 * - 尺寸只受 `min` / `max` 约束；`min > max` 时以 `min` 为准（退化不产生负尺寸）。
 * - 边界只夹取「移动后的位置」或「被拖动的边」，不压缩尺寸；面板大于边界时贴起始边。
 * - min 与边界冲突时 min 优先（允许溢出边界，避免出现不可用尺寸）。
 * - 非有限 / 非法输入一律回落缺省值，组件不因宿主数据崩坏。
 */

export interface PanelRect {
  x: number
  y: number
  width: number
  height: number
}

/** 边界矩形（与 PanelRect 同形；独立别名表达语义） */
export type BoundaryRect = PanelRect

export interface SizeLimits {
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
}

/** 八向缩放手柄：四边 + 四角 */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export type KeyboardDirection = 'ltr' | 'rtl'

export interface KeyboardOptions {
  direction?: KeyboardDirection
  /** 单步像素（默认 8；非正/非法回落 8） */
  step?: number
  limits?: SizeLimits
  boundary?: BoundaryRect | null
  padding?: number
}

export interface SizePair {
  width: number
  height: number
}

export const DEFAULT_RECT: PanelRect = { x: 48, y: 48, width: 420, height: 300 }
export const DEFAULT_MIN_SIZE: SizePair = { width: 160, height: 96 }
export const DEFAULT_KEYBOARD_STEP = 8

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function round(value: number): number {
  return Math.round(value)
}

/** 解析 `"x,y,width,height"`（逗号或空白分隔）；不合法整体回落 */
export function parseRect(raw: string | null | undefined, fallback: PanelRect = DEFAULT_RECT): PanelRect {
  const parts = String(raw ?? '')
    .trim()
    .split(/[\s,]+/)
    .filter((part) => part !== '')
  if (parts.length !== 4) return { ...fallback }
  const values = parts.map(Number)
  if (!values.every((v) => isFiniteNumber(v))) return { ...fallback }
  const [x, y, width, height] = values as [number, number, number, number]
  if (width <= 0 || height <= 0) return { ...fallback }
  return { x: round(x), y: round(y), width: round(width), height: round(height) }
}

/** 序列化为属性串（取整） */
export function formatRect(rect: PanelRect): string {
  return `${round(rect.x)},${round(rect.y)},${round(rect.width)},${round(rect.height)}`
}

/**
 * 解析 `"宽,高"`（单值应用到宽高）；空/非法/非正 → fallback（null 表示调用方无一等默认值）。
 */
export function parseSizePair(raw: string | null | undefined, fallback: SizePair | null): SizePair | null {
  const parts = String(raw ?? '')
    .trim()
    .split(/[\s,]+/)
    .filter((part) => part !== '')
  if (parts.length === 0 || parts.length > 2) return fallback ? { ...fallback } : null
  const values = parts.map(Number)
  if (!values.every((v) => isFiniteNumber(v) && v > 0)) return fallback ? { ...fallback } : null
  const width = values[0]!
  const height = values.length === 2 ? values[1]! : width
  return { width: round(width), height: round(height) }
}

/** 解析 min/max 为生效限值；min > max 时 max 抬到 min */
export function resolveLimits(minRaw: string | null | undefined, maxRaw: string | null | undefined): SizeLimits {
  const min = parseSizePair(minRaw, DEFAULT_MIN_SIZE) ?? DEFAULT_MIN_SIZE
  const max = parseSizePair(maxRaw, null)
  const minWidth = Math.max(1, round(min.width))
  const minHeight = Math.max(1, round(min.height))
  return {
    minWidth,
    minHeight,
    maxWidth: Math.max(minWidth, max ? round(max.width) : Number.POSITIVE_INFINITY),
    maxHeight: Math.max(minHeight, max ? round(max.height) : Number.POSITIVE_INFINITY),
  }
}

/** 尺寸夹取（min 优先于 max；非法限值按 min 收敛） */
export function clampSize(width: number, height: number, limits: SizeLimits): SizePair {
  const minWidth = isFiniteNumber(limits.minWidth) ? Math.max(1, limits.minWidth) : DEFAULT_MIN_SIZE.width
  const minHeight = isFiniteNumber(limits.minHeight) ? Math.max(1, limits.minHeight) : DEFAULT_MIN_SIZE.height
  const maxWidth = Math.max(minWidth, isFiniteNumber(limits.maxWidth) ? limits.maxWidth : Number.POSITIVE_INFINITY)
  const maxHeight = Math.max(minHeight, isFiniteNumber(limits.maxHeight) ? limits.maxHeight : Number.POSITIVE_INFINITY)
  return {
    width: round(Math.min(maxWidth, Math.max(minWidth, width))),
    height: round(Math.min(maxHeight, Math.max(minHeight, height))),
  }
}

/** 归一化：非有限字段回落，尺寸夹取，输出取整 */
export function normalizeRect(
  input: Partial<PanelRect> | null | undefined,
  limits: SizeLimits,
  fallback: PanelRect = DEFAULT_RECT,
): PanelRect {
  const source = input ?? {}
  const x = isFiniteNumber(source.x) ? source.x : fallback.x
  const y = isFiniteNumber(source.y) ? source.y : fallback.y
  const width = isFiniteNumber(source.width) ? source.width : fallback.width
  const height = isFiniteNumber(source.height) ? source.height : fallback.height
  const size = clampSize(width, height, limits)
  return { x: round(x), y: round(y), width: size.width, height: size.height }
}

function normalizePadding(padding: number | undefined): number {
  return isFiniteNumber(padding) && padding > 0 ? round(padding) : 0
}

/**
 * 位置夹取到边界内（工作区坐标系与 rect 同空间）。
 * 边界零尺寸/缺失视为不可测，原样返回（不把面板吸到 0,0）。
 */
export function clampToBoundary(
  rect: PanelRect,
  boundary: BoundaryRect | null | undefined,
  padding?: number,
): PanelRect {
  const out: PanelRect = { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) }
  if (!boundary || boundary.width <= 0 || boundary.height <= 0) return out
  const pad = normalizePadding(padding)
  const minX = boundary.x + pad
  const maxX = boundary.x + boundary.width - pad - out.width
  const minY = boundary.y + pad
  const maxY = boundary.y + boundary.height - pad - out.height
  out.x = round(maxX < minX ? minX : Math.min(maxX, Math.max(minX, out.x)))
  out.y = round(maxY < minY ? minY : Math.min(maxY, Math.max(minY, out.y)))
  return out
}

/** 相对移动（不改变尺寸），受边界夹取 */
export function moveBy(
  rect: PanelRect,
  dx: number,
  dy: number,
  boundary?: BoundaryRect | null,
  padding?: number,
): PanelRect {
  const moved: PanelRect = {
    x: round(rect.x + (isFiniteNumber(dx) ? dx : 0)),
    y: round(rect.y + (isFiniteNumber(dy) ? dy : 0)),
    width: round(rect.width),
    height: round(rect.height),
  }
  return clampToBoundary(moved, boundary, padding)
}

/** 按边缩放：对边固定；先夹取 min/max，再夹取边界（min 优先），输出取整 */
export function resizeBy(
  rect: PanelRect,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  limits: SizeLimits,
  boundary?: BoundaryRect | null,
  padding?: number,
): PanelRect {
  const normalized = normalizeRect(rect, limits, rect)
  let left = normalized.x
  let top = normalized.y
  let right = normalized.x + normalized.width
  let bottom = normalized.y + normalized.height

  const ddx = isFiniteNumber(dx) ? dx : 0
  const ddy = isFiniteNumber(dy) ? dy : 0
  const west = edge.includes('w')
  const east = edge.includes('e')
  const north = edge.includes('n')
  const south = edge.includes('s')

  if (west) left += ddx
  if (east) right += ddx
  if (north) top += ddy
  if (south) bottom += ddy

  const minWidth = Math.max(1, limits.minWidth)
  const minHeight = Math.max(1, limits.minHeight)
  const maxWidth = Math.max(minWidth, limits.maxWidth)
  const maxHeight = Math.max(minHeight, limits.maxHeight)

  // 尺寸夹取：拖动边回退，对边保持不动（min > max 时等价于固定为 min）
  let width = right - left
  let height = bottom - top
  if (width < minWidth) {
    if (west) left = right - minWidth
    else right = left + minWidth
  } else if (width > maxWidth) {
    if (west) left = right - maxWidth
    else right = left + maxWidth
  }
  width = right - left
  height = bottom - top
  if (height < minHeight) {
    if (north) top = bottom - minHeight
    else bottom = top + minHeight
  } else if (height > maxHeight) {
    if (north) top = bottom - maxHeight
    else bottom = top + maxHeight
  }
  width = right - left
  height = bottom - top

  // 边界夹取：只夹被拖动的边；随后若与 min 冲突则 min 优先（允许溢出边界）
  if (boundary && boundary.width > 0 && boundary.height > 0) {
    const pad = normalizePadding(padding)
    if (west) left = Math.max(left, boundary.x + pad)
    if (east) right = Math.min(right, boundary.x + boundary.width - pad)
    if (north) top = Math.max(top, boundary.y + pad)
    if (south) bottom = Math.min(bottom, boundary.y + boundary.height - pad)
    if (right - left < minWidth) {
      if (west) left = right - minWidth
      else right = left + minWidth
    }
    if (bottom - top < minHeight) {
      if (north) top = bottom - minHeight
      else bottom = top + minHeight
    }
  }

  return {
    x: round(left),
    y: round(top),
    width: round(right - left),
    height: round(bottom - top),
  }
}

function normalizeStep(step: number | undefined): number {
  return isFiniteNumber(step) && step > 0 ? round(step) : DEFAULT_KEYBOARD_STEP
}

function keyboardDirection(options: KeyboardOptions): KeyboardDirection {
  return options.direction === 'rtl' ? 'rtl' : 'ltr'
}

/**
 * 键盘移动：方向键平移；RTL 下水平方向镜像（右方向键朝书写前进方向）。
 * 返回 null 表示按键不归本组件处理。
 */
export function keyboardMove(rect: PanelRect, key: string, options: KeyboardOptions = {}): PanelRect | null {
  const step = normalizeStep(options.step)
  const rtl = keyboardDirection(options) === 'rtl'
  let dx = 0
  let dy = 0
  switch (key) {
    case 'ArrowLeft':
      dx = rtl ? step : -step
      break
    case 'ArrowRight':
      dx = rtl ? -step : step
      break
    case 'ArrowUp':
      dy = -step
      break
    case 'ArrowDown':
      dy = step
      break
    default:
      return null
  }
  return moveBy(rect, dx, dy, options.boundary, options.padding)
}

/**
 * 键盘缩放（Shift + 方向键），与指针等价：
 * - LTR：→ 扩东缘 / ← 收东缘（西缘推进）；RTL 镜像（→ 扩西缘 / ← 收西缘）
 * - ↓ 扩南缘 / ↑ 收南缘（北缘推进）
 * 返回 null 表示按键不归本组件处理。
 */
export function keyboardResize(rect: PanelRect, key: string, options: KeyboardOptions = {}): PanelRect | null {
  const step = normalizeStep(options.step)
  const rtl = keyboardDirection(options) === 'rtl'
  const limits = options.limits ?? resolveLimits(null, null)
  const edge = keyboardResizeEdge(key, rtl ? 'rtl' : 'ltr')
  if (!edge) return null
  let dx = 0
  let dy = 0
  switch (key) {
    case 'ArrowRight':
      dx = rtl ? -step : step
      break
    case 'ArrowLeft':
      dx = rtl ? -step : step
      break
    case 'ArrowDown':
      dy = step
      break
    case 'ArrowUp':
      dy = step
      break
  }
  return resizeBy(rect, edge, dx, dy, limits, options.boundary, options.padding)
}

/** Shift + 方向键对应的缩放边（RTL 镜像水平语义）；非方向键返回 null */
export function keyboardResizeEdge(key: string, direction: KeyboardDirection = 'ltr'): ResizeEdge | null {
  const rtl = direction === 'rtl'
  switch (key) {
    case 'ArrowRight':
      return rtl ? 'w' : 'e'
    case 'ArrowLeft':
      return rtl ? 'e' : 'w'
    case 'ArrowDown':
      return 's'
    case 'ArrowUp':
      return 'n'
    default:
      return null
  }
}

/** 矩形值相等（字段均为取整后的整数） */
export function rectEquals(a: PanelRect, b: PanelRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}
