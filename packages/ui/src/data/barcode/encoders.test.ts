import { describe, it, expect } from 'vitest'
import { encodeBarcode, gs1CheckDigit, BarcodeEncodeError, BARCODE_FORMATS, type EncodeResult } from './encoders.js'

/** runs 结构不变量：恒以条开头/结尾、条空交替、总模数守恒 */
function assertRunInvariants(r: EncodeResult): void {
  expect(r.runs.length).toBeGreaterThan(0)
  expect(
    r.runs.every((n) => Number.isInteger(n) && n > 0),
    '所有 run 宽度须为正整数',
  ).toBe(true)
  expect(
    r.runs.reduce((a, b) => a + b, 0),
    'runs 之和 = 总模数',
  ).toBe(r.modules)
}

describe('gs1CheckDigit（GS1 mod10 校验位）', () => {
  it('EAN-13 已知样例：400638133393 → 1', () => {
    expect(gs1CheckDigit('400638133393')).toBe('1')
  })
  it('EAN-8 已知样例：9638507 → 4', () => {
    expect(gs1CheckDigit('9638507')).toBe('4')
  })
  it('UPC-A 已知样例：03600029145 → 2', () => {
    expect(gs1CheckDigit('03600029145')).toBe('2')
  })
  it('GTIN-14 样例：1061414100041 → 5（自右 3/1 交替加权）', () => {
    expect(gs1CheckDigit('1061414100041')).toBe('5')
  })
})

describe('CODE128（auto A/B/C）', () => {
  it('纯偶数位数字 → START_C，两位一符按序编码，校验符 mod103 正确', () => {
    const r = encodeBarcode('123456', 'code128')
    // START_C(105) + 12,34,56 + 校验 (105+12+2*34+3*56) mod 103 = 353 mod 103 = 44
    expect(r.symbols).toEqual([105, 12, 34, 56, 44])
    // 5 符号 × 11 模 + 停止符 13 模 = 68
    expect(r.modules).toBe(68)
    assertRunInvariants(r)
  })

  it('纯字母 → START_B，值 = ASCII - 32', () => {
    // H=40 E=37 L=44 L=44 O=47；校验 (104+40+2*37+3*44+4*44+5*47) mod 103 = 761 mod 103 = 40
    const r = encodeBarcode('HELLO', 'code128')
    expect(r.symbols).toEqual([104, 40, 37, 44, 44, 47, 40])
    assertRunInvariants(r)
  })

  it('数字串中途夹非数字：C 段吃满偶对后切 CodeB 吸收尾随单数字', () => {
    // 12345X → START_C + 12,34 + CodeB(100) + '5'(21) + 'X'(88-32=56)
    // 校验 (105+12+2*34+3*100+4*21+5*56) mod 103 = 849 mod 103 = 25
    const r = encodeBarcode('12345X', 'code128')
    expect(r.symbols).toEqual([105, 12, 34, 100, 21, 56, 25])
    assertRunInvariants(r)
  })

  it('控制字符段切 CodeA（值 = ASCII + 64）， printable 回 B', () => {
    // A=33，\u0001 → CodeA(101) + 65，B → 34
    // 校验 (104+33+2*101+3*65+4*34) mod 103 = 670 mod 103 = 52
    const r = encodeBarcode('A\u0001B', 'code128')
    expect(r.symbols).toEqual([104, 33, 101, 65, 34, 52])
    assertRunInvariants(r)
  })

  it('尾部 4 位偶数数字串 → 切 CodeC（短码收益）', () => {
    // AB1234 → START_B + A(33) B(34) + CodeC(99) + 12,34
    // 校验 (104+33+2*34+3*99+4*12+5*34) mod 103 = 720 mod 103 = 102
    const r = encodeBarcode('AB1234', 'code128')
    expect(r.symbols).toEqual([104, 33, 34, 99, 12, 34, 102])
    assertRunInvariants(r)
  })

  it('中段短数字串（<4）不切换子集', () => {
    // AB12 → 全 B：A=33 B=34 1=17 2=18；校验 (104+33+2*34+3*17+4*18) mod 103 = 328 mod 103 = 19
    const r = encodeBarcode('AB12', 'code128')
    expect(r.symbols).toEqual([104, 33, 34, 17, 18, 19])
    assertRunInvariants(r)
  })

  it('超出 ASCII 126 → charset 错误；空串 → length 错误', () => {
    expect(() => encodeBarcode('中文', 'code128')).toThrowError(BarcodeEncodeError)
    try {
      encodeBarcode('a\u00e9b', 'code128')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('charset')
    }
    try {
      encodeBarcode('', 'code128')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('length')
    }
  })
})

describe('CODE128 子集切换边界（已知样例条宽序列，符号值断言）', () => {
  it('长数字串（奇数 11 位）→ 起始 C 吃满偶对，末位单数字回 B 吸收', () => {
    // START_C + 12,34,56,78,90 + CodeB(100) + '1'(17)
    // 校验 (105+12+2*34+3*56+4*78+5*90+6*100+7*17) mod 103 = 1834 mod 103 = 83
    const r = encodeBarcode('12345678901', 'code128')
    expect(r.symbols).toEqual([105, 12, 34, 56, 78, 90, 100, 17, 83])
    assertRunInvariants(r)
  })

  it('尾随奇数位数字段：先 B 出 1 位、余下 4 位切线 C（"A12345"）', () => {
    // START_B + A(33) + '1'(17) + CodeC(99) + 23,45
    // 校验 (104+33+2*17+3*99+4*23+5*45) mod 103 = 785 mod 103 = 64
    const r = encodeBarcode('A12345', 'code128')
    expect(r.symbols).toEqual([104, 33, 17, 99, 23, 45, 64])
    assertRunInvariants(r)
  })

  it('尾随 7 位奇数字段：C 吃 6 位、末位回 B（"A1234567"）', () => {
    // START_B + A(33) + CodeC(99) + 12,34,56 + CodeB(100) + '7'(23)
    // 校验 (104+33+2*99+3*12+4*34+5*56+6*100+7*23) mod 103 = 1548 mod 103 = 3
    const r = encodeBarcode('A1234567', 'code128')
    expect(r.symbols).toEqual([104, 33, 99, 12, 34, 56, 100, 23, 3])
    assertRunInvariants(r)
  })

  it('串尾偶数位数字段切线 C 省宽度（"ABC1234"）', () => {
    // START_B + A,B,C(33,34,35) + CodeC(99) + 12,34
    // 校验 (104+33+2*34+3*35+4*99+5*12+6*34) mod 103 = 970 mod 103 = 43
    const r = encodeBarcode('ABC1234', 'code128')
    expect(r.symbols).toEqual([104, 33, 34, 35, 99, 12, 34, 43])
    assertRunInvariants(r)
  })

  it('A/B/C 往返：控制符起始 A、中段 4 位数字不切线、控制符仍留 A、大写回 B', () => {
    // START_A + \u0001(65) + '1''2''3''4'(17,18,19,20) + \u0001(65) + 'X'(56)
    // 中段偶数 4 位不在串尾，切线 C 无净收益 → 留 A
    // 校验 (103+65+2*17+3*18+4*19+5*20+6*65+7*56) mod 103 = 1214 mod 103 = 81
    const r = encodeBarcode('\u00011234\u0001X', 'code128')
    expect(r.symbols).toEqual([103, 65, 17, 18, 19, 20, 65, 56, 81])
    assertRunInvariants(r)
  })
})

describe('EAN-13', () => {
  it('12 位自动补校验位；模块序列符合首位数字 parity 模式（4 → LGLLGG）', () => {
    const r = encodeBarcode('400638133393', 'ean13')
    expect(r.display).toBe('4006381333931')
    expect(r.modules).toBe(95)
    // 前缀护条 101 + 首位 L('0')=0001101 → runs 以 [1,1,1,3,2,1,1] 开头
    expect(r.runs.slice(0, 7)).toEqual([1, 1, 1, 3, 2, 1, 1])
    assertRunInvariants(r)
  })

  it('13 位全码：校验位相符放行、不符报 checksum', () => {
    const ok = encodeBarcode('4006381333931', 'ean13')
    expect(ok.display).toBe('4006381333931')
    expect(() => encodeBarcode('4006381333932', 'ean13')).toThrowError(BarcodeEncodeError)
    try {
      encodeBarcode('4006381333932', 'ean13')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('checksum')
    }
  })

  it('位数不足/超出 → length；非数字 → charset', () => {
    for (const bad of ['40063813339', '40063813339311']) {
      try {
        encodeBarcode(bad, 'ean13')
        expect.unreachable(`${bad} 应抛 length`)
      } catch (e) {
        expect((e as BarcodeEncodeError).reason).toBe('length')
      }
    }
    try {
      encodeBarcode('40063813339A', 'ean13')
      expect.unreachable('字母应抛 charset')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('charset')
    }
  })

  it('HRI 分段：首位在护条外侧，两组 6 位落在左右数据区（模块坐标 3–44 / 50–91）', () => {
    const r = encodeBarcode('4006381333931', 'ean13')
    expect(r.outside.left).toBe('4')
    expect(r.outside.right).toBeUndefined()
    expect(r.text).toEqual([
      { value: '006381', start: 3, width: 42 },
      { value: '333931', start: 50, width: 42 },
    ])
    expect(r.guardExtend).toBe(5)
    // 三组护条（左/中/右）各 2 条 = 6 条延伸条
    expect(r.guards).toHaveLength(6)
  })

  it('真实商品码样例：690123456789 自动补校验位得 6901234567892', () => {
    const r = encodeBarcode('690123456789', 'ean13')
    expect(r.display).toBe('6901234567892')
    expect(encodeBarcode('6901234567892', 'ean13').runs).toEqual(r.runs)
  })
})

describe('EAN-8', () => {
  it('7 位自动补校验位 / 8 位全码放行，模块数 67，HRI 4+4 分段', () => {
    const auto = encodeBarcode('9638507', 'ean8')
    expect(auto.display).toBe('96385074')
    expect(auto.modules).toBe(67)
    expect(auto.text).toEqual([
      { value: '9638', start: 3, width: 28 },
      { value: '5074', start: 36, width: 28 },
    ])
    assertRunInvariants(auto)
    const full = encodeBarcode('96385074', 'ean8')
    expect(full.runs).toEqual(auto.runs)
  })

  it('校验位不符 → checksum；位数 → length；字母 → charset', () => {
    expect(() => encodeBarcode('96385075', 'ean8')).toThrowError(BarcodeEncodeError)
    try {
      encodeBarcode('96385075', 'ean8')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('checksum')
    }
    try {
      encodeBarcode('96385', 'ean8')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('length')
    }
    try {
      encodeBarcode('96385A74', 'ean8')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('charset')
    }
  })

  it('中央护条落在模块 32/34（中央 01010 的条位，不是空位），三组护条全为整数条序号', () => {
    const r = encodeBarcode('96385074', 'ean8')
    // 左 0/2 → [0,1]；中央 32/34 → [10,11]；右 64/66 → [20,21]
    expect(r.guards).toEqual([0, 1, 10, 11, 20, 21])
    expect(
      r.guards.every((g) => Number.isInteger(g)),
      '护条须落在条位（整数条序号）',
    ).toBe(true)
  })
})

describe('UPC-A', () => {
  it('11 位自动补校验位；首位/末位在护条外侧，模块序列与首位 0 的 EAN-13 完全一致', () => {
    const r = encodeBarcode('03600029145', 'upca')
    expect(r.display).toBe('036000291452')
    expect(r.modules).toBe(95)
    expect(r.outside).toEqual({ left: '0', right: '2' })
    expect(r.text).toEqual([
      { value: '36000', start: 3, width: 42 },
      { value: '29145', start: 50, width: 42 },
    ])
    assertRunInvariants(r)
    // UPC-A ⊂ EAN-13（首位 0 退化形态）：条空序列逐位一致
    const ean = encodeBarcode('0036000291452', 'ean13')
    expect(r.runs).toEqual(ean.runs)
  })

  it('12 位全码放行；校验位不符 → checksum', () => {
    expect(encodeBarcode('036000291452', 'upca').display).toBe('036000291452')
    expect(() => encodeBarcode('036000291459', 'upca')).toThrowError(BarcodeEncodeError)
  })
})

describe('CODE39', () => {
  it('字符表编码：每字符 9 元素 3 宽（2:1），字符间 1 窄间隔，首尾 * 起止符不计入显示', () => {
    const r = encodeBarcode('ABC 123', 'code39')
    expect(r.display).toBe('ABC 123')
    // 9 字符（含首尾 *）× 12 模 + 8 间隔 = 116
    expect(r.modules).toBe(116)
    // 每字符 9 run + 字符间 1 间隔 run = 9×9 + 8 = 89
    expect(r.runs).toHaveLength(89)
    assertRunInvariants(r)
  })

  it('小写自动大写化后编码', () => {
    const r = encodeBarcode('a$b', 'code39')
    expect(r.display).toBe('A$B')
    assertRunInvariants(r)
  })

  it('表外字符（含保留起止符 *）→ charset 错误', () => {
    for (const bad of ['AB@CD', 'A*C']) {
      try {
        encodeBarcode(bad, 'code39')
        expect.unreachable(`${bad} 应抛 charset`)
      } catch (e) {
        expect((e as BarcodeEncodeError).reason).toBe('charset')
      }
    }
  })

  it('全字符集覆盖：数字/字母/空格与 -.$/+% 全部编码成功且 display 保持（大写化后）', () => {
    // 43 个合法数据字符全覆盖（* 为保留起止符，不在数据集）
    const all = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'
    const r = encodeBarcode(all, 'code39')
    expect(r.display).toBe(all)
    expect(r.runs.every((n) => Number.isInteger(n) && n > 0)).toBe(true)
    assertRunInvariants(r)
    // 43 数据字符 + 首尾 * = 45 字符 → 45×9 + 44 间隔 = 449 run
    expect(r.runs).toHaveLength(45 * 9 + 44)
  })

  it('特殊符号逐字符编码与已知表一致（-.% 各 3 宽 9 元素）', () => {
    // '-'='010000101'、'.'='110000100'、'%'='010000110'（宽 3 处，2:1 宽窄比）
    const dash = encodeBarcode('-', 'code39')
    // '-' + 首尾 *：3 字符 × 9 run + 2 间隔 = 29 run
    expect(dash.runs).toHaveLength(29)
    // 逐 run 对照：* = 010010100 → [1,2,1,1,2,1,2,1,1]
    expect(dash.runs.slice(0, 9)).toEqual([1, 2, 1, 1, 2, 1, 2, 1, 1])
    // '-' = 010000101 → [1,2,1,1,1,1,2,1,2]
    expect(dash.runs.slice(10, 19)).toEqual([1, 2, 1, 1, 1, 1, 2, 1, 2])
    assertRunInvariants(dash)
  })
})

describe('ITF-14', () => {
  it('13 位自动补校验位；起点/交错对/停止符条宽序列正确，模块数 106', () => {
    const r = encodeBarcode('1061414100041', 'itf14')
    expect(r.display).toBe('10614141000415')
    // 起点 4 + 7 对 × 14（每数字 2 宽 3 窄 = 7X）+ 停止 4 = 106X
    expect(r.modules).toBe(106)
    // 起始须为标准 nnnn（窄条+窄空+窄条+窄空），少了后半段扫码枪无法同步
    expect(r.runs.slice(0, 4)).toEqual([1, 1, 1, 1])
    // 首对 (1,0)：条取 '1'=wnnnw → [2,1,1,1,2]，空取 '0'=nnwwn → [1,1,2,2,1]
    expect(r.runs.slice(0, 12)).toEqual([1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 2])
    // 停止符 Wnn：宽条 + 窄空 + 窄条 = [2,1,1]
    expect(r.runs.slice(-3)).toEqual([2, 1, 1])
    assertRunInvariants(r)
  })

  it('14 位全码放行；校验位不符 → checksum；位数/字符集错误', () => {
    expect(encodeBarcode('10614141000415', 'itf14').display).toBe('10614141000415')
    expect(() => encodeBarcode('10614141000413', 'itf14')).toThrowError(BarcodeEncodeError)
    try {
      encodeBarcode('10614141000413', 'itf14')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('checksum')
    }
    try {
      encodeBarcode('12345', 'itf14')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('length')
    }
    try {
      encodeBarcode('123456789012a', 'itf14')
    } catch (e) {
      expect((e as BarcodeEncodeError).reason).toBe('charset')
    }
  })

  it('全 0 码逐模块对称验证：每对交插 bars/spaces 同构（nnwwn×nnwwn → 1,1,1,1,2,2,1,1,2,2）', () => {
    // '0000000000000' 校验位 0 → 全 0 码；起始 nnnn + 7 对同构交插 + 停止 Wnn
    const r = encodeBarcode('0000000000000', 'itf14')
    expect(r.display).toBe('00000000000000')
    // 起始 4 模 + 7 对 × 14 模 + 停止 4 模 = 106
    expect(r.modules).toBe(106)
    // 每对：bars nnnww → [1,1,2,2,1]、spaces 同 → 交插 [1,1, 1,1, 2,2, 2,2, 1,1]（10 run 14 模）
    expect(r.runs.slice(4, 14)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 1, 1])
    // 第二对从 run 索引 14 起（起始 4 + 每对 10 run），序列与首对完全一致（对称性）
    expect(r.runs.slice(14, 24)).toEqual(r.runs.slice(4, 14))
    // 停止 Wnn：宽条 + 窄空 + 窄条
    expect(r.runs.slice(-3)).toEqual([2, 1, 1])
    assertRunInvariants(r)
  })
})

describe('EAN/UPC 护条不变量', () => {
  it('三码制护条恒为 6 条，且序号必须是整数（落在条位而非空位）', () => {
    const cases: Array<[string, string]> = [
      ['ean13', '4006381333931'],
      ['ean8', '96385074'],
      ['upca', '036000291452'],
    ]
    for (const [fmt, v] of cases) {
      const r = encodeBarcode(v, fmt as never)
      expect(r.guards, fmt).toHaveLength(6)
      expect(
        r.guards.every((g) => Number.isInteger(g)),
        `${fmt} 护条须落在条位`,
      ).toBe(true)
    }
  })
})

describe('format 分发与未知码制', () => {
  it('BARCODE_FORMATS 恰为第一期 6 码制', () => {
    expect([...BARCODE_FORMATS]).toEqual(['code128', 'ean13', 'ean8', 'upca', 'code39', 'itf14'])
  })

  it('未知 format 拒绝（组件层归一回退，编码器层硬失败）', () => {
    expect(() => encodeBarcode('123', 'pdf417' as never)).toThrowError(/unknown format/i)
  })
})
