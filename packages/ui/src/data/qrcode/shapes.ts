/**
 * 二维码「形状化渲染」纯函数层（美化维度，与编码器 qr.ts 解耦）。
 *
 * 定位：`oas-qrcode` 的渲染参数化——数据区按 `dot-shape` 生成、三个定位图形（7×7）
 * 按 `corner-shape` 生成、中心 logo 区域可跳过模块（`icon-hide-dots`）。
 *
 * 体积策略：square 沿用 run-length 合并单 path（同旧实现，体积极小）；rounded / dots 无法用
 * run-length 表达（圆点带间隙、圆角需弧线），采用「合并路径 + pattern 网格平铺」——
 * 合并路径（square 同款 run-length）划定填充区域，defs 里 1×1 `userSpaceOnUse` pattern
 * 平铺模块原型；原型完整落在各自模块格内，区域裁剪永不切割原型，与逐模块绘制逐几何等价，
 * 总量回落 square 量级（旧逐模块 `<use>` 时代 125×125 实测约 305 KB，约为 square 合并路径的 5 倍）。
 *
 * 坐标系：1 单位 = 1 模块；`offset` 为静区（margin）偏移，与组件 viewBox 一致。
 */
export type DotShape = 'square' | 'rounded' | 'dots'
export type CornerShape = 'square' | 'rounded'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** 定位图形边长（模块）：QR 标准的 7×7 */
const FINDER = 7
/** 数据模块圆角半径（模块单位；>0.5 会削掉模块大半，视觉与识别都变差） */
const DATA_ROUNDED_RADIUS = 0.35
/** 圆点半径（模块单位；留 0.1 间隙，避免相邻圆点粘连成糊块） */
const DOT_RADIUS = 0.45
/** 定位图形圆角（外框 7×7）：1.6 视觉上接近「胶囊角」，且保证环宽视觉均匀 */
const FINDER_OUTER_RADIUS = 1.6
/** 定位图形内圈 / 内点圆角 */
const FINDER_INNER_RADIUS = 0.6

/** 是否落在三个定位图形区域内（左上 / 右上 / 左下 各 7×7） */
export function isFinderModule(size: number, x: number, y: number): boolean {
  const top = y < FINDER
  const bottom = y >= size - FINDER
  const left = x < FINDER
  const right = x >= size - FINDER
  return (top && left) || (top && right) || (bottom && left)
}

/** 模块（x,y 处 1×1 方格）是否与矩形框相交（用于 icon-hide-dots 跳过模块） */
function overlaps(box: Box, x: number, y: number): boolean {
  return x + 1 > box.x && x < box.x + box.w && y + 1 > box.y && y < box.y + box.h
}

/** 居中正方形盒（模块坐标）：中心 logo 的覆盖范围（含 pad） */
export function centeredBox(size: number, side: number, pad = 0): Box {
  const s = side + pad * 2
  return { x: (size - s) / 2, y: (size - s) / 2, w: s, h: s }
}

/**
 * 数据区路径（square）：run-length 合并单 path，排除定位图形区与可选 icon 区。
 * 与旧实现逐像素等价（定位区改由 finderPath 单独绘制，形状与模块栅格一致）。
 */
export function dataPath(modules: Uint8Array, size: number, offset: number, skip?: Box | null): string {
  let d = ''
  for (let y = 0; y < size; y++) {
    let start = -1
    for (let x = 0; x <= size; x++) {
      const dark =
        x < size && modules[y * size + x] === 1 && !isFinderModule(size, x, y) && !(skip ? overlaps(skip, x, y) : false)
      if (dark && start < 0) start = x
      if (!dark && start >= 0) {
        const len = x - start
        d += `M${start + offset} ${y + offset}h${len}v1h-${len}z`
        start = -1
      }
    }
  }
  return d
}

/** defs 中的模块 pattern（rounded = 圆角方块 / dots = 圆点）：1×1 网格平铺原型，fill 显式直注
 *（pattern 内容不继承引用元素的 fill）；网格锚定原点（无 x/y 偏移），dataPath 的整数格坐标天然对齐 */
export function modulePatternDef(dotShape: DotShape, id = 'oas-qr-pat', fill = 'currentColor'): string {
  const geometry =
    dotShape === 'dots'
      ? `<circle cx="0.5" cy="0.5" r="${DOT_RADIUS}" fill="${fill}"/>`
      : `<rect width="1" height="1" rx="${DATA_ROUNDED_RADIUS}" fill="${fill}"/>`
  return `<pattern id="${id}" width="1" height="1" patternUnits="userSpaceOnUse">${geometry}</pattern>`
}

/** 圆角矩形子路径（r<=0 时等价于直角矩形；r 自动收敛到半宽/半高） */
function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  if (rr <= 0) return `M${x} ${y}h${w}v${h}h-${w}z`
  // 数值收敛到 4 位小数：避免 0.6000000000000001 这类浮点噪声进路径（体积 + 可读性）
  const n = (v: number): number => Number(v.toFixed(4))
  const hw = n(w - 2 * rr)
  const hh = n(h - 2 * rr)
  const R = n(rr)
  return (
    `M${n(x + rr)} ${y}h${hw}a${R} ${R} 0 0 1 ${R} ${R}` +
    `v${hh}a${R} ${R} 0 0 1 -${R} ${R}` +
    `h-${hw}a${R} ${R} 0 0 1 -${R} -${R}` +
    `v-${hh}a${R} ${R} 0 0 1 ${R} -${R}z`
  )
}

/**
 * 三个定位图形：每处 = 外 7×7 环（evenodd 挖空 5×5）+ 内 3×3 内点，共 3 个子路径。
 * `square` 与模块栅格逐像素等价（直角环 + 直角内点）；`rounded` 换圆角。
 */
export function finderPath(size: number, offset: number, cornerShape: CornerShape): string {
  const outer = cornerShape === 'rounded' ? FINDER_OUTER_RADIUS : 0
  const inner = cornerShape === 'rounded' ? FINDER_INNER_RADIUS : 0
  const origins: Array<[number, number]> = [
    [0, 0],
    [size - FINDER, 0],
    [0, size - FINDER],
  ]
  let d = ''
  for (const [ox, oy] of origins) {
    const x = ox + offset
    const y = oy + offset
    // 外框 + 挖空（evenodd）→ 环；再叠内 3×3（位于洞内，evenodd 下重新填充）
    d += roundRect(x, y, FINDER, FINDER, outer)
    d += roundRect(x + 1, y + 1, FINDER - 2, FINDER - 2, Math.max(0, outer - 1))
    d += roundRect(x + 2, y + 2, 3, 3, inner)
  }
  return d
}

/** userSpaceOnUse 映射的目标方区域（模块单位）：形状化模式下渐变跨整码连续 */
export interface GradientArea {
  x: number
  y: number
  size: number
}

/**
 * 线性渐变 defs（前景色渐变）：`stops` 为颜色数组（≥2，均匀分布）。
 * 角度采用 CSS 约定（0deg = 自下而上，90deg = 自左向右）。
 * 缺省 objectBoundingBox（相对填充元素 bbox，square 直填模式用）；
 * 传 `area` 时转 gradientUnits="userSpaceOnUse" 并把坐标映射进该方区域——
 * pattern 内容是逐模块小几何，objectBoundingBox 会退化为「每模块各自套全渐变」，
 * 必须用 userSpace 才能得到跨整码连续的渐变。
 */
export function linearGradientDef(
  stops: readonly string[],
  angleDeg: number,
  id = 'oas-qr-grad',
  area?: GradientArea,
): string {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  const compact = (v: number): number => Number(v.toFixed(4))
  const x1 = area ? compact(area.x + (0.5 - dx / 2) * area.size) : (0.5 - dx / 2).toFixed(4)
  const y1 = area ? compact(area.y + (0.5 - dy / 2) * area.size) : (0.5 - dy / 2).toFixed(4)
  const x2 = area ? compact(area.x + (0.5 + dx / 2) * area.size) : (0.5 + dx / 2).toFixed(4)
  const y2 = area ? compact(area.y + (0.5 + dy / 2) * area.size) : (0.5 + dy / 2).toFixed(4)
  const units = area ? ' gradientUnits="userSpaceOnUse"' : ''
  const n = stops.length
  const stopsMarkup = stops
    .map(
      (color, i) => `<stop offset="${n > 1 ? (i / (n - 1)).toFixed(4) : '0'}" stop-color="${escapeAttrValue(color)}"/>`,
    )
    .join('')
  return `<linearGradient id="${id}"${units} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsMarkup}</linearGradient>`
}

/** 转义双引号（颜色值理论上不含，但宿主输入不可信） */
function escapeAttrValue(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
