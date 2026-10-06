/**
 * 一维条码编码器 —— 纯 TypeScript、零依赖实现（第一期 6 码制）。
 *
 * 定位：`oas-barcode` 组件的纯函数编码层（与渲染/组件状态解耦，可独立单测）。
 * 码制规则全部取自公开行业标准（GS1 General Specifications / ISO/IEC 15417 Code128 /
 * ISO/IEC 16388 Code39 / ISO/IEC 15420 EAN·UPC / ITF-14 交插 2of5），码表为标准事实数据，
 * 实现为本项目原创。
 *
 * 范围（第一期）：
 * - `code128`：auto 子集自动切换（A/B/C），全 ASCII 可打印 + 控制字符
 * - `ean13` / `ean8` / `upca`：L/G/R 三套奇偶编码 + GS1 mod10 校验位（缺位自动补、
 *   全码给出则校验合法性）
 * - `code39`：43 字符定长表（2:1 宽窄比），自动大写化，首尾起止符不进显示文本
 * - `itf14`：交插 2of5 + mod10（固定 13+1 位）
 *
 * 错误模型：非法输入抛 `BarcodeEncodeError`，`reason` 三类（charset / length / checksum），
 * 组件层捕获后渲染错误占位并派发 `oas-invalid` 事件。
 *
 * 产物模型：`runs`（条/空宽度序列，X 单位，下标偶数=条、奇数=空，恒以条开头以条结尾）+
 * 护条延伸信息 + HRI 文字分段（模块坐标）。渲染层只需按序画矩形，不感知码制差异。
 */

export type BarcodeFormat = 'code128' | 'ean13' | 'ean8' | 'upca' | 'code39' | 'itf14'

/** 第一期支持的码制清单（顺序即文档展示顺序） */
export const BARCODE_FORMATS: readonly BarcodeFormat[] = ['code128', 'ean13', 'ean8', 'upca', 'code39', 'itf14']

/** 非法输入失败原因：字符集不符 / 位数不符 / 校验位不符 */
export type InvalidReason = 'charset' | 'length' | 'checksum'

/** 编码错误（组件层按 reason 渲染占位并派发 oas-invalid） */
export class BarcodeEncodeError extends Error {
  constructor(
    public readonly reason: InvalidReason,
    message: string,
  ) {
    super(message)
    this.name = 'BarcodeEncodeError'
  }
}

/** HRI 文字分段（模块坐标：start 起点模数、width 跨度模数） */
export interface TextSegment {
  value: string
  start: number
  width: number
}

/** 编码产物（与码制无关的统一形状，渲染层唯一输入） */
export interface EncodeResult {
  /** 条/空宽度序列（X 单位）：下标偶数=条、奇数=空；恒以条开头以条结尾 */
  runs: number[]
  /** 需向下延伸的条下标（bars 序列中的序号；EAN/UPC 护条） */
  guards: number[]
  /** 护条向下延伸量（X 单位；非 EAN 系为 0） */
  guardExtend: number
  /** 码体总模数（不含静区） */
  modules: number
  /** 码体内 HRI 分段（模块坐标） */
  text: TextSegment[]
  /** 护条外侧数字（EAN-13 首位 / UPC-A 首末位；渲染在扩展静区沟槽内） */
  outside: { left?: string; right?: string }
  /** 展示文本（含自动补算的校验位；aria-label/文档用） */
  display: string
  /** 仅 code128：符号值序列（含起始符与校验符，不含停止符），供高级宿主自渲染 */
  symbols?: number[]
}

/** 是否为纯数字串 */
function isDigits(s: string): boolean {
  return /^[0-9]*$/.test(s)
}

/** 数字串校验：非数字抛 charset */
function requireDigits(s: string, format: string): void {
  if (!isDigits(s)) throw new BarcodeEncodeError('charset', `${format} 仅接受数字，收到：${JSON.stringify(s)}`)
}

/**
 * GS1 mod10 校验位（EAN-13/8、UPC-A、GTIN-14 通用）：
 * 自数据末位起 3/1 交替加权求和，check = (10 - sum mod 10) mod 10。
 */
export function gs1CheckDigit(digits: string): string {
  let sum = 0
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) {
    sum += (digits.charCodeAt(i) - 48) * w
  }
  return String((10 - (sum % 10)) % 10)
}

/**
 * GS1 校验位三态校验（组件错误模型）：
 * `expected` 位数（12/7/11/13）数据自动补位；`expected + 1` 全码给出则校验合法性。
 */
function withCheckDigit(value: string, expected: number, format: string): string {
  requireDigits(value, format)
  if (value.length !== expected && value.length !== expected + 1) {
    throw new BarcodeEncodeError(
      'length',
      `${format} 需要 ${expected}（自动补校验位）或 ${expected + 1} 位（含校验位），收到 ${value.length} 位`,
    )
  }
  if (value.length === expected) return value + gs1CheckDigit(value)
  const check = gs1CheckDigit(value.slice(0, expected))
  if (value[expected] !== check) {
    throw new BarcodeEncodeError('checksum', `${format} 校验位不符：末位应为 ${check}，收到 ${value[expected]}`)
  }
  return value
}

/* ------------------------------------------------------------------ *
 * CODE128（ISO/IEC 15417；auto A/B/C）
 * ------------------------------------------------------------------ */

/** 107 个符号的条空宽度表（6 位：条空条空条空；含起始符 103–105，不含停止符） */
const CODE128_PATTERNS: readonly string[] = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  // 起始符：103=Start A、104=Start B、105=Start C
  '211412',
  '211214',
  '211232',
]
/** 停止符（7 位宽：13 模） */
const CODE128_STOP = '2331112'

/** Code128 校验符：Σ(符号值 × 序号) mod 103（起始符序号 1） */
function code128Checksum(symbols: number[]): number {
  let sum = symbols[0]!
  for (let i = 1; i < symbols.length; i++) sum += symbols[i]! * i
  return sum % 103
}

/**
 * Code128 auto 子集自动切换：
 * - 起始：≥4 位数字开头 → C；首字符为控制符（<32）→ A；否则 B
 * - C 段吃满两位对；退出时下一字符 <32 切 A、否则切 B（尾随单数字由 B 吸收）
 * - B 段遇控制符切 A；数字串 ≥6 位、或 ≥4 位且恰在结尾且为偶数 → 切 C（收益为正才切）
 * - A 段覆盖 ASCII 0–95（控制符 +64），≥96 回 B；数字串切换规则同 B
 */
function code128Symbols(data: string): number[] {
  if (data.length === 0) throw new BarcodeEncodeError('length', 'CODE128 内容不能为空')
  for (const ch of data) {
    if ((ch.codePointAt(0) ?? 0) > 126) {
      throw new BarcodeEncodeError('charset', `CODE128 仅支持 ASCII（0–126），收到：${JSON.stringify(ch)}`)
    }
  }
  const isDigit = (i: number): boolean => i < data.length && data[i]! >= '0' && data[i]! <= '9'
  const digitRun = (i: number): number => {
    let n = 0
    while (isDigit(i + n)) n++
    return n
  }
  const toC = data.charCodeAt(0) >= 48 && data.charCodeAt(0) <= 57 && digitRun(0) >= 4

  const symbols: number[] = [toC ? 105 : data.charCodeAt(0) < 32 ? 103 : 104]
  let mode: 'A' | 'B' | 'C' = toC ? 'C' : data.charCodeAt(0) < 32 ? 'A' : 'B'
  let i = 0
  while (i < data.length) {
    if (mode === 'C') {
      if (isDigit(i) && isDigit(i + 1)) {
        symbols.push(Number(data.slice(i, i + 2)))
        i += 2
        continue
      }
      // 退出 C：按下一字符选子集（尾随单数字落入 B 吸收）
      if (i < data.length && data.charCodeAt(i) < 32) {
        symbols.push(101)
        mode = 'A'
      } else {
        symbols.push(100)
        mode = 'B'
      }
      continue
    }
    const c = data.charCodeAt(i)
    if (mode === 'B') {
      if (c < 32) {
        symbols.push(101)
        mode = 'A'
        continue
      }
    } else if (c > 95) {
      // A 段：≥96（小写等）超出 A 覆盖面，回 B
      symbols.push(100)
      mode = 'B'
      continue
    }
    const run = digitRun(i)
    const atEnd = i + run === data.length
    if (run >= 6 || (run >= 4 && atEnd && run % 2 === 0)) {
      symbols.push(99)
      mode = 'C'
      continue
    }
    symbols.push(mode === 'A' ? (c <= 31 ? c + 64 : c - 32) : c - 32)
    i += 1
  }
  symbols.push(code128Checksum(symbols))
  return symbols
}

/* ------------------------------------------------------------------ *
 * EAN-13 / EAN-8 / UPC-A（ISO/IEC 15420；GS1 GenSpec）
 * ------------------------------------------------------------------ */

/** 左侧奇（L）/ 偶（G）奇偶编码与右侧（R）编码（7 位模块串） */
const EAN_L: readonly string[] = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
]
const EAN_G: readonly string[] = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
]
const EAN_R: readonly string[] = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
]
/** 首位数字 → 左侧 6 位的 L/G 奇偶模式 */
const EAN13_PARITY: readonly string[] = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
]

/** 位串压缩为条/空 run 序列（位串恒以 1 开头） */
function compressBits(bits: string): number[] {
  const runs: number[] = []
  let cur = 1
  for (let i = 1; i < bits.length; i++) {
    if ((bits[i] === '1') === (bits[i - 1] === '1')) cur++
    else {
      runs.push(cur)
      cur = 1
    }
  }
  runs.push(cur)
  return runs
}

/** 模块坐标处的条序号（bars = 偶数 run 下标 / 2） */
function barIndexAtModule(runs: number[], module: number): number {
  let pos = 0
  for (let j = 0; j < runs.length; j++) {
    if (pos <= module && module < pos + runs[j]!) return j / 2
    pos += runs[j]!
  }
  return (runs.length - 1) / 2
}

/** EAN 系结构编码：位串拼装 + 护条条序号 + HRI 分段 */
function encodeEanModules(bits: string, guardModules: Array<[number, number]>): { runs: number[]; guards: number[] } {
  const runs = compressBits(bits)
  const guards: number[] = []
  for (const [a, b] of guardModules) {
    guards.push(barIndexAtModule(runs, a), barIndexAtModule(runs, b))
  }
  return { runs, guards: [...new Set(guards)] }
}

function encodeEan13(value: string): EncodeResult {
  const data = withCheckDigit(value, 12, 'EAN-13')
  const parity = EAN13_PARITY[Number(data[0])]!
  const left = data.slice(1, 7)
  const right = data.slice(7)
  let bits = '101'
  for (let k = 0; k < 6; k++) bits += parity[k] === 'L' ? EAN_L[Number(left[k])] : EAN_G[Number(left[k])]
  bits += '01010'
  for (const ch of right) bits += EAN_R[Number(ch)]
  bits += '101'
  // 护条：左起 0/2、中央 46/48、右收 92/94（向下延伸 5X）
  const { runs, guards } = encodeEanModules(bits, [
    [0, 2],
    [46, 48],
    [92, 94],
  ])
  return {
    runs,
    guards,
    guardExtend: 5,
    modules: 95,
    text: [
      { value: left, start: 3, width: 42 },
      { value: right, start: 50, width: 42 },
    ],
    outside: { left: data[0] },
    display: data,
  }
}

function encodeEan8(value: string): EncodeResult {
  const data = withCheckDigit(value, 7, 'EAN-8')
  let bits = '101'
  for (const ch of data.slice(0, 4)) bits += EAN_L[Number(ch)]
  bits += '01010'
  for (const ch of data.slice(4)) bits += EAN_R[Number(ch)]
  bits += '101'
  const { runs, guards } = encodeEanModules(bits, [
    [0, 2],
    [31, 33],
    [64, 66],
  ])
  return {
    runs,
    guards,
    guardExtend: 5,
    modules: 67,
    text: [
      { value: data.slice(0, 4), start: 3, width: 28 },
      { value: data.slice(4), start: 36, width: 28 },
    ],
    outside: {},
    display: data,
  }
}

function encodeUpca(value: string): EncodeResult {
  const data = withCheckDigit(value, 11, 'UPC-A')
  // UPC-A ⊂ EAN-13（首位 0 退化形态）：条空模块序列按 EAN-13 全码生成
  const ean = encodeEan13('0' + data)
  return {
    ...ean,
    // HRI 版式按 UPC-A：首位/末位在护条外侧，中部两组各 5 位
    text: [
      { value: data.slice(1, 6), start: 3, width: 42 },
      { value: data.slice(6, 11), start: 50, width: 42 },
    ],
    outside: { left: data[0], right: data[11] },
    display: data,
  }
}

/* ------------------------------------------------------------------ *
 * CODE39（ISO/IEC 16388；43 字符 + 起止符）
 * ------------------------------------------------------------------ */

/** 9 元素表（条空交替，1=宽 0=窄；每字符恰 3 宽），起止符 `*` 不作数据字符 */
const CODE39_PATTERNS: Readonly<Record<string, string>> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  $: '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '010000110',
  '*': '010010100',
}

function encodeCode39(value: string): EncodeResult {
  const text = value.toUpperCase()
  if (text.length === 0) throw new BarcodeEncodeError('length', 'CODE39 内容不能为空')
  for (const ch of text) {
    if (!(ch in CODE39_PATTERNS) || ch === '*') {
      throw new BarcodeEncodeError('charset', `CODE39 仅接受 0-9 A-Z 空格与 -.$/+%，收到：${JSON.stringify(ch)}`)
    }
  }
  const runs: number[] = []
  const pushChar = (ch: string): void => {
    const pattern = CODE39_PATTERNS[ch]!
    for (let k = 0; k < 9; k++) runs.push(pattern[k] === '1' ? 2 : 1)
  }
  for (let k = 0; k < text.length; k++) {
    if (k > 0) runs.push(1) // 字符间隔（1 窄空）
    pushChar(text[k]!)
  }
  // 首尾起止符（module 数 +2 字符 +2 间隔）
  const withDelimiters = (): number[] => {
    const out: number[] = []
    pushCharInto(out, '*')
    out.push(1)
    for (const r of runs) out.push(r)
    out.push(1)
    pushCharInto(out, '*')
    return out
  }
  function pushCharInto(target: number[], ch: string): void {
    const pattern = CODE39_PATTERNS[ch]!
    for (let k = 0; k < 9; k++) target.push(pattern[k] === '1' ? 2 : 1)
  }
  const all = withDelimiters()
  const modules = all.reduce((a, b) => a + b, 0)
  return {
    runs: all,
    guards: [],
    guardExtend: 0,
    modules,
    text: [{ value: text, start: 0, width: modules }],
    outside: {},
    display: text,
  }
}

/* ------------------------------------------------------------------ *
 * ITF-14（GS1 GenSpec；交插 2of5 + mod10，固定 13+1 位）
 * ------------------------------------------------------------------ */

/** 数字 → 5 元素宽窄表（1=窄 2=宽；每数字恰 2 宽） */
const ITF_PATTERNS: readonly string[] = [
  'nnwwn', // 0
  'wnnnw', // 1
  'nwnnw', // 2
  'wwnnn', // 3
  'nnwnw', // 4
  'wnwnn', // 5
  'nwwnn', // 6
  'nnnww', // 7
  'wnnwn', // 8
  'nwnwn', // 9
]

const itfWidth = (ch: string): number[] => [...ITF_PATTERNS[Number(ch)]!].map((c) => (c === 'w' ? 2 : 1))

function encodeItf14(value: string): EncodeResult {
  const data = withCheckDigit(value, 13, 'ITF-14')
  const runs: number[] = [1, 1] // 起始：窄条 + 窄空
  for (let k = 0; k < 14; k += 2) {
    const bars = itfWidth(data[k]!)
    const spaces = itfWidth(data[k + 1]!)
    for (let j = 0; j < 5; j++) {
      runs.push(bars[j]!, spaces[j]!)
    }
  }
  runs.push(2, 1, 1) // 停止：宽条 + 窄空 + 窄条
  return {
    runs,
    guards: [],
    guardExtend: 0,
    // 起点 2 + 7 对 × 14（每数字 2 宽 3 窄 = 7X）+ 停止 4 = 104X
    modules: 104,
    text: [{ value: data, start: 0, width: 104 }],
    outside: {},
    display: data,
  }
}

/* ------------------------------------------------------------------ *
 * 分发入口
 * ------------------------------------------------------------------ */

/** 按码制编码；未知码制硬失败（组件层负责归一回退 code128） */
export function encodeBarcode(value: string, format: BarcodeFormat): EncodeResult {
  switch (format) {
    case 'code128': {
      const symbols = code128Symbols(value)
      const runs: number[] = []
      for (const s of symbols) {
        for (const ch of CODE128_PATTERNS[s]!) runs.push(Number(ch))
      }
      for (const ch of CODE128_STOP) runs.push(Number(ch))
      const modules = runs.reduce((a, b) => a + b, 0)
      return {
        runs,
        guards: [],
        guardExtend: 0,
        modules,
        text: [{ value, start: 0, width: modules }],
        outside: {},
        display: value,
        symbols,
      }
    }
    case 'ean13':
      return encodeEan13(value)
    case 'ean8':
      return encodeEan8(value)
    case 'upca':
      return encodeUpca(value)
    case 'code39':
      return encodeCode39(value)
    case 'itf14':
      return encodeItf14(value)
    default:
      throw new Error(`unknown format: ${String(format)}`)
  }
}
