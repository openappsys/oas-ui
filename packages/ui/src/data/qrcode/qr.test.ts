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
 *   v7 版本信息串 000111110010010100；
 * - 完整矩阵级已知答案向量见 qr-vectors.test.ts（四级别 × 多版本，独立参考实现产出）。
 */

describe('QR 编码器（纯 TS 零依赖，L/M/Q/H 全级别，版本 1–40）', () => {
  it('「HELLO WORLD」字母数字模式：数据码字与标准参考一致（含 0xEC/0x11 填充）', () => {
    const { codewords, mode, version, dataCodewords } = encodeDataCodewords('HELLO WORLD', 'l')
    expect(mode).toBe('alphanumeric')
    expect(version).toBe(1)
    expect(dataCodewords).toBe(19)
    expect(codewords).toEqual([
      0x20, 0x5b, 0x0b, 0x78, 0xd1, 0x72, 0xdc, 0x4d, 0x43, 0x40, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec,
    ])
  })

  it('Reed-Solomon 纠错码字与 thonky 1-M 示例（10 ECC）一致', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]
    expect(rsEncode(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23])
  })

  it('格式信息 BCH：(L, mask=4) 与教程最终串 0x662F 一致', () => {
    expect(formatBits(4)).toBe(0x662f)
  })

  it('格式信息 BCH 全表：4 级别 × 8 掩码与标准 15 位串一致（EC 指示 L=01/M=00/Q=11/H=10）', () => {
    // 标准格式信息表（每级别掩码 0–7 的 15 位串，按格式信息第一拷贝位序读回的值）
    const TABLE: Record<string, number[]> = {
      l: [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
      m: [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0],
      q: [0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed],
      h: [0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b],
    }
    for (const [ec, values] of Object.entries(TABLE)) {
      for (let mask = 0; mask < 8; mask++) {
        expect(formatBits(mask, ec as 'l' | 'm' | 'q' | 'h')).toBe(values[mask])
      }
    }
  })

  it('格式信息随纠错级别变化：同掩码下四级别两两不同（无静默归一）', () => {
    const values = (['l', 'm', 'q', 'h'] as const).map((ec) => formatBits(0, ec))
    expect(new Set(values).size).toBe(4)
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
    assertReadback(encodeQR('https://example.com/oas-ui', 'l'))
  })

  it('内容变长自动升级版本', () => {
    const short = encodeQR('hi', 'l')
    const long = encodeQR('https://example.com/very/long/path?key=value#fragment-to-grow', 'l')
    expect(short.version).toBe(1)
    expect(long.version).toBeGreaterThan(short.version)
    expect(long.size).toBe(17 + 4 * long.version)
  })

  it('超过 L 级 v40 字节容量抛出 QR_TOO_LONG（版本 1–40 全表容量上限）', () => {
    // v40-L 字节容量 2953；更高版本不存在 → 超出即抛
    expect(() => encodeQR('x'.repeat(2954), 'l')).toThrow(QR_TOO_LONG_ERROR)
  })

  it('纠错级别影响容量：同内容 M/Q/H 选版本更高（或同级），数据码字数更少', () => {
    // 「HELLO WORLD」74 数据位：L/M/Q 装入 v1，H（v1 仅 72 位容量）升入 v2
    expect(encodeQR('HELLO WORLD', 'l').version).toBe(1)
    expect(encodeQR('HELLO WORLD', 'm').version).toBe(1)
    expect(encodeQR('HELLO WORLD', 'q').version).toBe(1)
    expect(encodeQR('HELLO WORLD', 'h').version).toBe(2)
    expect(encodeDataCodewords('HELLO WORLD', 'h').dataCodewords).toBeLessThan(
      encodeDataCodewords('HELLO WORLD', 'l').dataCodewords,
    )
  })

  it('矩阵回读校验（放置/掩码/交错正确性）对四级别全通过', () => {
    for (const ec of ['l', 'm', 'q', 'h'] as const) {
      const qr = encodeQR('https://example.com/oas-ui', ec)
      assertReadback(qr)
    }
  })

  it('短块/长块不等分版本交错正确（v7-Q：6 块 2 短 4 长）', () => {
    const qr = encodeQR('x'.repeat(80), 'q')
    expect(qr.version).toBe(7)
    assertReadback(qr)
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

/** 矩阵回读自检：按 zigzag 顺序读出数据区模块、逆掩码还原，应与码字流逐字节一致 */
function assertReadback(qr: ReturnType<typeof encodeQR>): void {
  const size = qr.size

  // 按放置顺序读回所有数据区模块（仅非函数模块），先存（x, y）
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
}
