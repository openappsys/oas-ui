import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COMPRESS_OPTIONS,
  compressImageFile,
  parseCompressAttr,
  parseExifOrientation,
} from './image-process.js'

/** 构造带 EXIF Orientation 的最小 JPEG：FFD8 + APP1(Exif IFD0 只含 Orientation 短整型) + FFD9 */
function jpegWithOrientation(orientation: number, byteOrder: 'MM' | 'II' = 'MM'): Uint8Array {
  const be = byteOrder === 'MM'
  const head = be ? [0x4d, 0x4d] : [0x49, 0x49]
  const u16 = (value: number): [number, number] =>
    be ? [(value >> 8) & 0xff, value & 0xff] : [value & 0xff, (value >> 8) & 0xff]
  const u32 = (value: number): [number, number, number, number] =>
    be
      ? [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
      : [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]
  // TIFF 头：序(2) + 魔数 0x002A + IFD0 偏移 8；IFD0：项数 1 + 条目(12) + 下一 IFD 0
  const tiff = new Uint8Array(8 + 2 + 12 + 4)
  tiff.set(head, 0)
  tiff.set(u16(0x002a), 2)
  tiff.set(u32(8), 4)
  tiff.set(u16(1), 8) // IFD0 条目数 = 1
  const entry = 10
  tiff.set(u16(0x0112), entry) // tag Orientation
  tiff.set(u16(3), entry + 2) // type SHORT
  tiff.set(u32(1), entry + 4) // count 1
  if (be) {
    tiff[entry + 8] = 0x00
    tiff[entry + 9] = orientation
  } else {
    tiff[entry + 8] = orientation
    tiff[entry + 9] = 0x00
  }
  tiff.set(u32(0), entry + 12) // 下一 IFD = 0
  const exifPayload = new Uint8Array(6 + tiff.length)
  exifPayload.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 0) // "Exif\0\0"
  exifPayload.set(tiff, 6)
  const app1Len = exifPayload.length + 2
  const out = new Uint8Array(4 + 2 + exifPayload.length + 2)
  out[0] = 0xff
  out[1] = 0xd8 // SOI
  out[2] = 0xff
  out[3] = 0xe1 // APP1
  // JPEG 段长度恒为大端（与 TIFF 自身端序无关）
  out[4] = (app1Len >> 8) & 0xff
  out[5] = app1Len & 0xff
  out.set(exifPayload, 6)
  out[out.length - 2] = 0xff
  out[out.length - 1] = 0xd9 // EOI
  return out
}

describe('parseExifOrientation（元信息通道：正立渲染由浏览器解码承担，不再做矩阵转正）', () => {
  it('方向 1-8 全部正确读出（大端 MM）', () => {
    for (const o of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(parseExifOrientation(jpegWithOrientation(o))).toBe(o)
    }
  })

  it('小端 II 同样正确', () => {
    for (const o of [1, 3, 6, 8]) {
      expect(parseExifOrientation(jpegWithOrientation(o, 'II'))).toBe(o)
    }
  })

  it('无 EXIF / 无 Orientation 标签 / 非 JPEG / 截断数据 → 回落 1（无方向标记）', () => {
    expect(parseExifOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe(1)
    // PNG 魔数
    expect(parseExifOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(1)
    // 截断的 EXIF 头
    expect(parseExifOrientation(jpegWithOrientation(6).slice(0, 12))).toBe(1)
    // 空数据
    expect(parseExifOrientation(new Uint8Array(0))).toBe(1)
  })
})

describe('parseCompressAttr（compress 属性解析）', () => {
  it('空串 = 开启缺省档（quality 0.8 / max-dimension 4096）', () => {
    expect(parseCompressAttr('')).toEqual(DEFAULT_COMPRESS_OPTIONS)
  })

  it('JSON 对象：字段覆盖、缺省字段补默认', () => {
    expect(parseCompressAttr('{"quality":0.5}')).toEqual({
      quality: 0.5,
      maxDimension: DEFAULT_COMPRESS_OPTIONS.maxDimension,
    })
    expect(parseCompressAttr('{"max-dimension":1920}')).toEqual({
      quality: DEFAULT_COMPRESS_OPTIONS.quality,
      maxDimension: 1920,
    })
    expect(parseCompressAttr('{"quality":0.7,"max-dimension":1280}')).toEqual({ quality: 0.7, maxDimension: 1280 })
  })

  it('非法 JSON / 非对象 / 非法字段值 → null（关闭，宿主侧告警一次）', () => {
    expect(parseCompressAttr('not-json')).toBeNull()
    expect(parseCompressAttr('true')).toBeNull()
    expect(parseCompressAttr('{"quality":"high"}')).toBeNull()
    expect(parseCompressAttr('{"max-dimension":0}')).toBeNull()
    expect(parseCompressAttr('{"quality":1.5}')).toBeNull()
    expect(parseCompressAttr('{"quality":-0.2}')).toBeNull()
    expect(parseCompressAttr('{"max-dimension":-100}')).toBeNull()
  })
})

describe('compressImageFile（happy-dom：canvas 不可用 → 优雅降级）', () => {
  it('不支持的类型（gif）返回 null（保留原文件）', async () => {
    const gif = new File([new Uint8Array([0x47, 0x49, 0x46, 0x38])], 'a.gif', { type: 'image/gif' })
    expect(await compressImageFile(gif, DEFAULT_COMPRESS_OPTIONS)).toBeNull()
  })

  it('非图片文件返回 null', async () => {
    const text = new File(['hello'], 'a.txt', { type: 'text/plain' })
    expect(await compressImageFile(text, DEFAULT_COMPRESS_OPTIONS)).toBeNull()
  })

  it('canvas 不可用的环境：可解码类型也返回 null（不破坏文件通道）', async () => {
    // 1×1 PNG
    const png = new File(
      [
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00,
          0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
        ]),
      ],
      'a.png',
      { type: 'image/png' },
    )
    // happy-dom 无真实解码器：decode/createObjectURL 通路失败 → null（保留原文件）
    const result = await compressImageFile(png, DEFAULT_COMPRESS_OPTIONS)
    expect(result).toBeNull()
  })

  it('缺省档位契约锁定（文档口径：quality 0.8 / max-dimension 4096）', () => {
    expect(DEFAULT_COMPRESS_OPTIONS).toEqual({ quality: 0.8, maxDimension: 4096 })
    expect(parseCompressAttr('')).toEqual(DEFAULT_COMPRESS_OPTIONS)
  })
})
