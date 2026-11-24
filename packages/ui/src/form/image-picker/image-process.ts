/**
 * image-process —— image-picker 自动压缩 + EXIF 方向修正（纯逻辑 + canvas 管线）。
 *
 * 纪律：
 * - `compress` 关闭（缺省）= 调用方不进本模块，文件通道逐字节等价；
 * - 输出仍为 File（PNG 保留透明走 png 重编码；JPEG/WebP 按 quality 重编码；其余类型不动）；
 * - EXIF Orientation 1-8 全支持（canvas 重绘矩阵）；方向 1 / 无 EXIF / 非 JPEG 不动方向；
 * - 任何一步不可用（无 canvas / 解码失败）→ 返回 null，调用方保留原文件（零破坏降级）。
 */

export interface CompressOptions {
  /** JPEG/WebP 重编码质量（0 < q ≤ 1） */
  quality: number
  /** 最长边像素上限（正整数；超出才等比缩） */
  maxDimension: number
}

export const DEFAULT_COMPRESS_OPTIONS: CompressOptions = { quality: 0.8, maxDimension: 4096 }

/** 压缩元信息（进 `oas-change` detail.compressed；原尺寸 → 压缩后尺寸 + 方向修正） */
export interface CompressMeta {
  originalWidth: number
  originalHeight: number
  width: number
  height: number
  /** 应用的 EXIF 方向（1 = 无修正） */
  orientation: number
  quality: number
}

/**
 * 解析 `compress` 属性：空串 = 开启缺省档；JSON 对象覆盖字段（`quality` / `max-dimension`）；
 * 非法（坏 JSON / 非对象 / 字段越界）→ null（关闭；由组件 devWarn 一次）。
 */
export function parseCompressAttr(raw: string): CompressOptions | null {
  if (raw.trim() === '') return { ...DEFAULT_COMPRESS_OPTIONS }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  const quality = record['quality'] === undefined ? DEFAULT_COMPRESS_OPTIONS.quality : record['quality']
  const maxDimension =
    record['max-dimension'] === undefined ? DEFAULT_COMPRESS_OPTIONS.maxDimension : record['max-dimension']
  if (typeof quality !== 'number' || !Number.isFinite(quality) || quality <= 0 || quality > 1) return null
  if (
    typeof maxDimension !== 'number' ||
    !Number.isInteger(maxDimension) ||
    maxDimension <= 0 ||
    maxDimension > 20000
  ) {
    return null
  }
  return { quality, maxDimension }
}

/**
 * 从 JPEG 字节读 EXIF Orientation（tag 0x0112，SHORT）。
 * 非 JPEG / 无 APP1 EXIF / 无该标签 / 数据截断 → 1（不做方向修正）。
 */
export function parseExifOrientation(bytes: Uint8Array): number {
  // JPEG 魔数 FFD8 + 保守长度校验
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1
  let i = 2
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) break
    const marker = bytes[i + 1]
    // EOI / SOS 之后不再扫段
    if (marker === 0xd9 || marker === 0xda) break
    const size = (bytes[i + 2] ?? 0) * 256 + (bytes[i + 3] ?? 0)
    if (size < 2) break
    // APP1 + "Exif\0\0"
    if (marker === 0xe1 && size >= 8) {
      const body = bytes.subarray(i + 4, Math.min(i + 2 + size, bytes.length))
      if (
        body.length > 8 &&
        body[0] === 0x45 &&
        body[1] === 0x78 &&
        body[2] === 0x69 &&
        body[3] === 0x66 &&
        body[4] === 0x00 &&
        body[5] === 0x00
      ) {
        return readOrientationFromTiff(body.subarray(6))
      }
    }
    i += 2 + size
  }
  return 1
}

/** TIFF 结构里找 IFD0 的 Orientation（0x0112） */
function readOrientationFromTiff(tiff: Uint8Array): number {
  if (tiff.length < 8) return 1
  const be = tiff[0] === 0x4d && tiff[1] === 0x4d
  const le = tiff[0] === 0x49 && tiff[1] === 0x49
  if (!be && !le) return 1
  const u16 = (offset: number): number =>
    be ? (tiff[offset] ?? 0) * 256 + (tiff[offset + 1] ?? 0) : (tiff[offset] ?? 0) + (tiff[offset + 1] ?? 0) * 256
  const u32 = (offset: number): number =>
    be
      ? ((tiff[offset] ?? 0) << 24) |
        ((tiff[offset + 1] ?? 0) << 16) |
        ((tiff[offset + 2] ?? 0) << 8) |
        (tiff[offset + 3] ?? 0)
      : ((tiff[offset] ?? 0) |
          ((tiff[offset + 1] ?? 0) << 8) |
          ((tiff[offset + 2] ?? 0) << 16) |
          ((tiff[offset + 3] ?? 0) << 24)) >>>
        0
  const ifdOffset = u32(4)
  if (ifdOffset + 2 > tiff.length) return 1
  const entryCount = u16(ifdOffset)
  for (let e = 0; e < entryCount; e++) {
    const entry = ifdOffset + 2 + e * 12
    if (entry + 12 > tiff.length) return 1
    const tag = u16(entry)
    if (tag !== 0x0112) continue
    // SHORT：值内联在 value 字段前 2 字节（按端序）
    const value = be ? u16(entry + 8) : u16(entry + 8)
    return value >= 1 && value <= 8 ? value : 1
  }
  return 1
}

export interface OrientationMatrix {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
  /** 重绘画布宽（方向 5-8 与源宽高互换） */
  width: number
  height: number
}

/**
 * EXIF 方向 → canvas setTransform 矩阵（把带方向的源绘制为视觉正立）。
 * 未知方向回落恒等（不抛错、不换轴）。
 */
export function orientationTransform(orientation: number, w: number, h: number): OrientationMatrix {
  switch (orientation) {
    case 2: // 水平镜像
      return { a: -1, b: 0, c: 0, d: 1, e: w, f: 0, width: w, height: h }
    case 3: // 旋转 180°
      return { a: -1, b: 0, c: 0, d: -1, e: w, f: h, width: w, height: h }
    case 4: // 垂直镜像
      return { a: 1, b: 0, c: 0, d: -1, e: 0, f: h, width: w, height: h }
    case 5: // 主对角线转置
      return { a: 0, b: 1, c: 1, d: 0, e: 0, f: 0, width: h, height: w }
    case 6: // 旋转 90° CW
      return { a: 0, b: 1, c: -1, d: 0, e: h, f: 0, width: h, height: w }
    case 7: // 反对角线镜像
      return { a: 0, b: -1, c: -1, d: 0, e: h, f: w, width: h, height: w }
    case 8: // 旋转 90° CCW
      return { a: 0, b: -1, c: 1, d: 0, e: 0, f: w, width: h, height: w }
    default: // 1 / 未知：恒等
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, width: w, height: h }
  }
}

/** 可压缩类型：JPEG / PNG（透明保留）/ WebP；其余（GIF / SVG 等）不动 */
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface DecodedImage {
  width: number
  height: number
}

/** 解码文件为可用位图（优先 Image.decode；失败返回 null） */
async function decodeFile(file: File): Promise<DecodedImage | null> {
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : ''
  if (!url) return null
  try {
    const image = new Image()
    image.src = url
    if (typeof image.decode === 'function') {
      await image.decode()
    } else {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('image-load-failed'))
      })
    }
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!width || !height) return null
    return { width, height }
  } catch {
    return null
  } finally {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // 环境不支持时忽略
    }
  }
}

/**
 * 单文件压缩 + EXIF 修正。返回 null = 不处理（类型不支持 / 解码失败 / canvas 不可用），
 * 调用方保留原文件、元信息位记 null。PNG 无缩放且方向 1 时保留原文件（重编码无收益）。
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions,
): Promise<{ file: File; meta: CompressMeta } | null> {
  const type = (file.type || '').toLowerCase()
  if (!COMPRESSIBLE_TYPES.has(type)) return null
  const decoded = await decodeFile(file)
  if (!decoded) return null
  const orientation = type === 'image/jpeg' ? parseExifOrientation(await fileBytes(file)) : 1
  const scale = Math.min(1, options.maxDimension / Math.max(decoded.width, decoded.height))
  const targetWidth = Math.max(1, Math.round(decoded.width * scale))
  const targetHeight = Math.max(1, Math.round(decoded.height * scale))
  const needsResize = targetWidth !== decoded.width || targetHeight !== decoded.height
  const needsOrientation = orientation !== 1
  const meta: CompressMeta = {
    originalWidth: decoded.width,
    originalHeight: decoded.height,
    width: needsOrientation && orientation >= 5 ? targetHeight : targetWidth,
    height: needsOrientation && orientation >= 5 ? targetWidth : targetHeight,
    orientation,
    quality: options.quality,
  }
  // PNG：无缩放且无方向修正 → 保留原文件（重编码无收益还可能变大）
  if (type === 'image/png' && !needsResize && !needsOrientation) {
    return { file, meta }
  }
  const canvas = document.createElement('canvas')
  const context: CanvasRenderingContext2D | null =
    typeof canvas.getContext === 'function' ? (canvas.getContext('2d') as CanvasRenderingContext2D | null) : null
  if (!context || typeof canvas.toBlob !== 'function') return null
  const matrix = orientationTransform(orientation, targetWidth, targetHeight)
  canvas.width = matrix.width
  canvas.height = matrix.height
  context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
  const image = await decodeToImageElement(file)
  if (!image) return null
  context.drawImage(image, 0, 0, targetWidth, targetHeight)
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((result) => resolve(result), type, type === 'image/png' ? undefined : options.quality)
    } catch {
      resolve(null)
    }
  })
  if (!blob) return null
  const next = new File([blob], file.name, { type, lastModified: file.lastModified })
  return { file: next, meta }
}

/** 读文件字节（EXIF 解析用；FileReader 不可用返回空 → 方向回落 1） */
async function fileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') {
    try {
      return new Uint8Array(await file.arrayBuffer())
    } catch {
      return new Uint8Array(0)
    }
  }
  return new Uint8Array(0)
}

/** 解码为 ImageElement（重绘 drawImage 用；happy-dom / 解码失败返回 null） */
async function decodeToImageElement(file: File): Promise<HTMLImageElement | null> {
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : ''
  if (!url) return null
  try {
    const image = new Image()
    image.src = url
    if (typeof image.decode === 'function') {
      await image.decode()
    } else {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('image-load-failed'))
      })
    }
    return image
  } catch {
    return null
  } finally {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // 环境不支持时忽略
    }
  }
}
