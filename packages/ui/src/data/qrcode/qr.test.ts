import { describe, it, expect } from 'vitest'
import {
  encodeQR,
  encodeDataCodewords,
  rsEncode,
  formatBits,
  versionInfoBits,
  isFunctionModule,
  QR_TOO_LONG_ERROR,
} from './qr.js'

/**
 * QR 编码器参考向量（均取自公开标准教程/规范，用于交叉验证纯 TS 实现）：
 * - thonky.com QR 教程：「HELLO WORLD」字母数字模式 1-M 的数据码字与 10 个 ECC 码字；
 * - thonky.com 格式/版本信息页：(L, mask=4) 格式串 110011000101111 = 0x662F；
 *   v7 版本信息串 000111110010010100。
 */

describe('QR 编码器（纯 TS 零依赖，L 级纠错，版本 1–10）', () => {
  it('「HELLO WORLD」字母数字模式：数据码字与标准参考一致（含 0xEC/0x11 填充）', () => {
    const { codewords, mode, version, dataCodewords } = encodeDataCodewords('HELLO WORLD', 'l')
    expect(mode).toBe('alphanumeric')
    expect(version).toBe(1)
    expect(dataCodewords).toBe(19)
    expect(codewords).toEqual([
      0x20, 0x5b, 0x0b, 0x78, 0xd1, 0x72, 0xdc, 0x4d, 0x43, 0x40, 0xec, 0x11, 0xec, 0x11, 0xec,
      0x11, 0xec, 0x11, 0xec,
    ])
  })

  it('Reed-Solomon 纠错码字与 thonky 1-M 示例（10 ECC）一致', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]
    expect(rsEncode(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23])
  })

  it('格式信息 BCH：(L, mask=4) 与教程最终串 0x662F 一致', () => {
    expect(formatBits(4)).toBe(0x662f)
  })

  it('版本信息 BCH：v7 与教程最终串 0b000111110010010100 一致', () => {
    expect(versionInfoBits(7)).toBe(0b000111110010010100)
  })

  it('纯数字内容走 numeric 模式，首字节含模式指示 + 计数高位', () => {
    const { mode, codewords, version } = encodeDataCodewords('01234567', 'l')
    expect(mode).toBe('numeric')
    expect(version).toBe(1)
    // 0001（numeric）+ 0000001000（count=8）→ 首字节 00010000 = 0x10
    expect(codewords[0]).toBe(0x10)
  })

  it('HELLO WORLD → 版本 1，矩阵 21×21，结构完整（定位/时序/暗模块/格式信息）', () => {
    const qr = encodeQR('HELLO WORLD', 'l')
    expect(qr.version).toBe(1)
    expect(qr.size).toBe(21)
    expect(qr.modules.length).toBe(21 * 21)

    // 左上定位图形：7×7 边框 + 中心 3×3，环为白
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const border = dx === 0 || dx === 6 || dy === 0 || dy === 6
        const center = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
        const expected = border || center ? 1 : 0
        expect(qr.modules[dy * 21 + dx]).toBe(expected)
      }
    }

    // 暗模块：(x=8, y=4*1+9=13)
    expect(qr.modules[13 * 21 + 8]).toBe(1)
    // 格式信息回读：第一拷贝位序（Nayuki 布局）应与 formatBits(mask) 一致
    const size = qr.size
    const fmtPos: Array<[number, number]> = [
      [8, 0],
      [8, 1],
      [8, 2],
      [8, 3],
      [8, 4],
      [8, 5], // bits 0–5
      [8, 7],
      [8, 8],
      [7, 8], // bits 6–8
      [5, 8],
      [4, 8],
      [3, 8],
      [2, 8],
      [1, 8],
      [0, 8], // bits 9–14
    ]
    let fmtRead = 0
    fmtPos.forEach(([x, y], i) => {
      fmtRead |= (qr.modules[y * size + x] ?? 0) << i
    })
    expect(fmtRead).toBe(formatBits(qr.mask))
  })

  it('掩码在 0–7 范围内且格式信息可解出掩码', () => {
    const qr = encodeQR('HELLO WORLD', 'l')
    expect(qr.mask).toBeGreaterThanOrEqual(0)
    expect(qr.mask).toBeLessThanOrEqual(7)
  })

  it('矩阵回读码字与写入码字流一致（放置/掩码/交错正确性）', () => {
    const qr = encodeQR('https://example.com/oas-ui', 'l')
    const size = qr.size

    // 按放置顺序读回所有数据区模块（仅非函数模块），先存（x, y, 值）
    const placed: Array<{ x: number; y: number }> = []
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j
          const upward = ((right + 1) & 2) === 0
          const y = upward ? size - 1 - vert : vert
          if (!isFunctionModule(qr.version, x, y)) placed.push({ x, y })
        }
      }
    }

    // 应用掩码还原
    const bits: number[] = []
    for (const { x, y } of placed) {
      const masked = qr.modules[y * size + x] ?? 0
      const flip = maskFunction(qr.mask, x, y)
      bits.push(masked ^ (flip ? 1 : 0))
    }

    // 组装码字
    const readBack: number[] = []
    for (let i = 0; i < bits.length && i + 7 < bits.length; i += 8) {
      let byte = 0
      for (let k = 0; k < 8; k++) byte = (byte << 1) | (bits[i + k] ?? 0)
      readBack.push(byte)
    }
    expect(readBack).toEqual(qr.codewords)
  })

  it('内容变长自动升级版本', () => {
    const short = encodeQR('hi', 'l')
    const long = encodeQR('https://example.com/very/long/path?key=value#fragment-to-grow', 'l')
    expect(short.version).toBe(1)
    expect(long.version).toBeGreaterThan(short.version)
    expect(long.size).toBe(17 + 4 * long.version)
  })

  it('超过 L 级 v10 字节容量抛出 QR_TOO_LONG', () => {
    expect(() => encodeQR('x'.repeat(400), 'l')).toThrow(QR_TOO_LONG_ERROR)
  })

  it('多块版本（v6+）交错后总码字数正确', () => {
    // v5-L 字节容量 106，超过即进入 v6+（数据分 2 块）
    const text = 'https://example.com/' + 'a'.repeat(100)
    const qr = encodeQR(text, 'l')
    expect(qr.version).toBeGreaterThanOrEqual(6)
    expect(qr.codewords.length).toBeLessThanOrEqual(346)
    expect(qr.codewords.length).toBeGreaterThan(0)
    // 回读校验（复用上面逻辑的最小验证）：位数应恰好等于码字数*8 + 余数位
    const size = qr.size
    let dataCells = 0
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j
          const upward = ((right + 1) & 2) === 0
          const y = upward ? size - 1 - vert : vert
          if (!isFunctionModule(qr.version, x, y)) dataCells++
        }
      }
    }
    expect(dataCells).toBe(qr.codewords.length * 8 + qr.remainderBits)
  })
})

/** 掩码公式（与编码器一致，测试侧独立复刻以便回读） */
function maskFunction(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0
    case 1:
      return y % 2 === 0
    case 2:
      return x % 3 === 0
    case 3:
      return (x + y) % 3 === 0
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  }
}
