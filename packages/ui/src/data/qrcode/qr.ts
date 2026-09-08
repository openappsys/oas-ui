/**
 * 二维码编码器 —— 纯 TypeScript、零依赖实现（QR ISO/IEC 18004）。
 *
 * 架构决策（选型取舍，见 PRD v1.4 qrcode）：
 * - 目标：零依赖原则约束下，不引入第三方 qrcode 库；
 * - 范围：**纠错级别 L/M/Q/H 全实现**，版本 1–40（v40-L 字节容量 2953）；
 *   数字/字母数字/字节三种模式自动选择；
 * - 数据表（每版本 RS 块规格 / 块数 / 余数位 / 对齐坐标）全部取自公开标准
 *   （ISO/IEC 18004 附录）；
 * - 完整性保障：全部级别对照独立标准参考实现产出的**已知答案矩阵**做了逐位单测
 *   交叉验证（格式信息 32 条全表 + 多级别多版本矩阵向量），另保留矩阵回读自检，
 *   保证产物可被标准扫码器识别；
 * - 已知限制：内容超出所选级别容量抛 QR_TOO_LONG_ERROR（组件层渲染「内容过长」占位）。
 */

/** 错误：内容超出所选纠错级别、版本 1–40 的容量 */
export const QR_TOO_LONG_ERROR = 'QR_TOO_LONG'

/** 编码模式 */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte'

/** 纠错级别（四级别全实现） */
export type QrErrorCorrection = 'l' | 'm' | 'q' | 'h'

/** 编码结果 */
export interface QRResult {
  version: number
  /** 矩阵边长 = 17 + 4*version */
  size: number
  /** size × size 模块矩阵，1 = 深色 */
  modules: Uint8Array
  /** 选中掩码 0–7 */
  mask: number
  /** 最终码字流（数据 + ECC 交错后），用于回读自检 */
  codewords: number[]
  /** 余数位数量（码字后补 0） */
  remainderBits: number
}

/* ------------------------------------------------------------------ *
 * 常量表（版本 1–40，L/M/Q/H 四级别；数据取自 ISO/IEC 18004 附录）
 * ------------------------------------------------------------------ */

/**
 * 每个版本、每个纠错级别的 RS 块规格：每块 ECC 码字数。
 * 数组下标 = 版本号（下标 0 占位）。
 */
const ECC_CODEWORDS_PER_BLOCK: Record<QrErrorCorrection, number[]> = {
  l: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  m: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  h: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
}

/** 每个版本、每个纠错级别的 RS 块数（数组下标 = 版本号，下标 0 占位） */
const NUM_ERROR_CORRECTION_BLOCKS: Record<QrErrorCorrection, number[]> = {
  l: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  m: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  h: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
}

/** 纠错级别 → 格式信息 2 位指示 */
const FORMAT_ECBITS: Record<QrErrorCorrection, number> = {
  m: 0b00,
  l: 0b01,
  h: 0b10,
  q: 0b11,
}

/** 模式指示（4 bit） */
const MODE_INDICATOR: Record<QrMode, number> = {
  numeric: 0b0001,
  alphanumeric: 0b0010,
  byte: 0b0100,
}

/** 字母数字字符表（45 个） */
const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

/* ------------------------------------------------------------------ *
 * 版本推导量（公式取自公开标准）
 * ------------------------------------------------------------------ */

/** 对齐图形中心坐标（版本 1 无；其余按标准步长公式推导） */
function alignmentPositions(version: number): number[] {
  if (version === 1) return []
  const size = 17 + 4 * version
  const numAlign = Math.floor(version / 7) + 2
  const step = Math.floor((version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2
  const result = [6]
  for (let i = numAlign - 2; i >= 0; i--) {
    result.push(size - 7 - i * step)
  }
  return result.sort((a, b) => a - b)
}

/** 原始数据模块位数（含余数位；标准附录公式） */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (version >= 7) result -= 36
  }
  return result
}

/** 每个版本的总码字数（数据 + ECC） */
function totalCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8)
}

/** 每个版本的数据码字数（按纠错级别） */
function dataCodewords(version: number, ec: QrErrorCorrection): number {
  return totalCodewords(version) - ECC_CODEWORDS_PER_BLOCK[ec][version]! * NUM_ERROR_CORRECTION_BLOCKS[ec][version]!
}

/** 余数位数量（标准附录：v2–6 为 7，v14–20 为 3，v21–27 为 4，v28–34 为 3，其余 0） */
function remainderBits(version: number): number {
  if (version >= 2 && version <= 6) return 7
  if (version >= 14 && version <= 20) return 3
  if (version >= 21 && version <= 27) return 4
  if (version >= 28 && version <= 34) return 3
  return 0
}

/* ------------------------------------------------------------------ *
 * GF(256) 对数/反对数表（本原多项式 0x11D）
 * ------------------------------------------------------------------ */

const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
let gfReady = false

function initGF(): void {
  if (gfReady) return
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255] ?? 0
  gfReady = true
}

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[(LOG[a] ?? 0) + (LOG[b] ?? 0)] ?? 0
}

/* ------------------------------------------------------------------ *
 * Reed-Solomon 纠错编码
 * ------------------------------------------------------------------ */

/** 生成器多项式系数（最高次在前），次数 = degree */
function makeGenerator(degree: number): number[] {
  initGF()
  let result: number[] = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(result.length + 1).fill(0)
    for (let j = 0; j < result.length; j++) {
      // (x + α^i) · R(x)：x·r[j] 落在 j 位，α^i·r[j] 落在 j+1 位（保持首项为 1）
      next[j] = (next[j] ?? 0) ^ result[j]!
      next[j + 1] = (next[j + 1] ?? 0) ^ gmul(result[j]!, EXP[i]!)
    }
    result = next
  }
  return result
}

/** 计算 data 的 ecc 个纠错码字（GF(256) 多项式长除法） */
export function rsEncode(data: number[], eccCount: number): number[] {
  const gen = makeGenerator(eccCount)
  const padded = data.concat(new Array<number>(eccCount).fill(0))
  const result = padded.slice()
  for (let i = 0; i < padded.length - gen.length + 1; i++) {
    const factor = result[i]
    if (factor === undefined || factor === 0) continue
    for (let j = 0; j < gen.length; j++) {
      result[i + j]! ^= gmul(gen[j]!, factor)
    }
  }
  return result.slice(padded.length - gen.length + 1)
}

/* ------------------------------------------------------------------ *
 * 格式信息 / 版本信息（BCH 长除法）
 * ------------------------------------------------------------------ */

/**
 * 格式信息 15 位：(EC 2bit + 掩码 3bit) << 10 | BCH 余数，再异或 0x5412。
 * EC 级别指示：L=01 / M=00 / Q=11 / H=10（标准表）。
 */
export function formatBits(mask: number, ec: QrErrorCorrection = 'l'): number {
  const data = (FORMAT_ECBITS[ec] << 3) | mask
  let rem = data << 10
  const gen = 0x537
  for (let bit = 14; bit >= 10; bit--) {
    if ((rem >>> bit) & 1) rem ^= gen << (bit - 10)
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412
}

/** 版本信息 18 位：6bit 版本号 << 12 | BCH(18,6) 余数 */
export function versionInfoBits(version: number): number {
  let rem = version << 12
  const gen = 0x1f25
  for (let bit = 17; bit >= 12; bit--) {
    if ((rem >>> bit) & 1) rem ^= gen << (bit - 12)
  }
  return (version << 12) | (rem & 0xfff)
}

/* ------------------------------------------------------------------ *
 * 数据编码（模式选择 + 位流 + 填充）
 * ------------------------------------------------------------------ */

function detectMode(value: string): QrMode {
  if (/^[0-9]+$/.test(value)) return 'numeric'
  if (/^[0-9A-Z $%*+\-./:]+$/.test(value)) return 'alphanumeric'
  return 'byte'
}

/** 字符计数指示位长度（按版本分组 1–9 / 10–26 / 27–40） */
function countIndicatorBits(mode: QrMode, version: number): number {
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2
  if (mode === 'numeric') return [10, 12, 14][group]!
  if (mode === 'alphanumeric') return [9, 11, 13][group]!
  return [8, 16, 16][group]!
}

/** 内容数据位长度（不含模式/计数指示） */
function dataBitLength(mode: QrMode, n: number): number {
  if (mode === 'numeric') {
    return Math.floor(n / 3) * 10 + (n % 3 === 1 ? 4 : n % 3 === 2 ? 7 : 0)
  }
  if (mode === 'alphanumeric') {
    return Math.floor(n / 2) * 11 + (n % 2 === 1 ? 6 : 0)
  }
  return n * 8
}

/** 选择能容纳内容的最小版本（1–40），放不下抛 QR_TOO_LONG */
function pickVersion(mode: QrMode, dataChars: number, ec: QrErrorCorrection): number {
  for (let v = 1; v <= 40; v++) {
    const capacity = dataCodewords(v, ec) * 8
    const required = 4 + countIndicatorBits(mode, v) + dataBitLength(mode, dataChars)
    if (required <= capacity) return v
  }
  throw new Error(QR_TOO_LONG_ERROR)
}

function pushBits(bits: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1)
}

/**
 * 数据编码 → 填充后的数据码字（含 0xEC/0x11 交替填充）。
 * 供组件与测试共用；返回选中的版本与模式。
 */
export function encodeDataCodewords(
  value: string,
  ecLevel: QrErrorCorrection = 'l',
): { codewords: number[]; mode: QrMode; version: number; dataCodewords: number } {
  const mode = detectMode(value)
  // 字节模式按 UTF-8 字节数计（计数指示与容量均为字节口径，ISO 标准定义）
  const bytes = mode === 'byte' ? new TextEncoder().encode(value) : null
  const n = bytes ? bytes.length : value.length
  const version = pickVersion(mode, n, ecLevel)
  const bits: number[] = []

  pushBits(bits, MODE_INDICATOR[mode], 4)
  pushBits(bits, n, countIndicatorBits(mode, version))

  if (mode === 'numeric') {
    for (let i = 0; i < n; i += 3) {
      const group = value.slice(i, i + 3)
      if (group.length === 3) pushBits(bits, Number(group), 10)
      else if (group.length === 2) pushBits(bits, Number(group), 7)
      else pushBits(bits, Number(group), 4)
    }
  } else if (mode === 'alphanumeric') {
    let i = 0
    for (; i + 1 < n; i += 2) {
      const pair =
        ALPHANUMERIC_CHARS.indexOf(value.charAt(i)) * 45 +
        ALPHANUMERIC_CHARS.indexOf(value.charAt(i + 1))
      pushBits(bits, pair, 11)
    }
    if (i < n) pushBits(bits, ALPHANUMERIC_CHARS.indexOf(value.charAt(i)), 6)
  } else {
    const bytes = new TextEncoder().encode(value)
    for (const b of bytes) pushBits(bits, b, 8)
  }

  const capacity = dataCodewords(version, ecLevel) * 8
  // 结束符（最多 4 位，不超出容量）
  const terminator = Math.min(4, capacity - bits.length)
  for (let i = 0; i < terminator; i++) bits.push(0)
  // 字节对齐
  while (bits.length % 8 !== 0) bits.push(0)

  const codewords: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0
    for (let k = 0; k < 8; k++) byte = (byte << 1) | (bits[i + k] ?? 0)
    codewords.push(byte)
  }
  // 交替填充码字
  while (codewords.length < dataCodewords(version, ecLevel)) {
    codewords.push(0xec)
    if (codewords.length < dataCodewords(version, ecLevel)) codewords.push(0x11)
  }
  return { codewords, mode, version, dataCodewords: dataCodewords(version, ecLevel) }
}

/* ------------------------------------------------------------------ *
 * 模块放置
 * ------------------------------------------------------------------ */

/** 判断 (x, y) 是否为功能模块（定位/时序/对齐/格式/版本/暗模块区域） */
export function isFunctionModule(version: number, x: number, y: number): boolean {
  const size = 17 + 4 * version
  // 定位图形 + 分隔符（四角 8×8：7×7 定位 + 右/下 1 分隔条）
  if (x < 8 && y < 8) return true
  if (x >= size - 8 && y < 8) return true
  if (x < 8 && y >= size - 8) return true
  // 时序图形（行/列 6）
  if (x === 6 || y === 6) return true
  // 对齐图形（5×5 区域；跳过三个与定位图形重叠的角）
  const centers = alignmentPositions(version)
  if (centers.length > 0) {
    const last = centers.length - 1
    for (let i = 0; i < centers.length; i++) {
      for (let j = 0; j < centers.length; j++) {
        const corner = (i === 0 && j === 0) || (i === last && j === 0) || (i === 0 && j === last)
        if (corner) continue
        const cx = centers[i]!
        const cy = centers[j]!
        if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) return true
      }
    }
  }
  // 格式信息区域（两拷贝 + 暗模块）
  const fmtTopLeft = (x === 8 && y >= 0 && y <= 8) || (y === 8 && x >= 0 && x <= 8)
  const fmtOther = (y === 8 && x >= size - 8) || (x === 8 && y >= size - 8)
  if (fmtTopLeft || fmtOther) return true
  // 版本信息区域（v ≥ 7）
  if (version >= 7) {
    if (x >= size - 11 && x <= size - 9 && y <= 5) return true
    if (y >= size - 11 && y <= size - 9 && x <= 5) return true
  }
  return false
}

/** 绘制定位图形（含 1 模块白色分隔符），left/top 为 7×7 左上角 */
function drawFinder(modules: Uint8Array, size: number, left: number, top: number): void {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const x = left + dx
      const y = top + dy
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      const inFinder = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6
      let dark = 0
      if (inFinder) {
        const border = dx === 0 || dx === 6 || dy === 0 || dy === 6
        const center = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
        dark = border || center ? 1 : 0
      }
      modules[y * size + x] = dark
    }
  }
}

function drawAlignment(modules: Uint8Array, size: number, version: number): void {
  const centers = alignmentPositions(version)
  if (centers.length === 0) return
  const last = centers.length - 1
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      // 跳过与定位图形重叠的三个角
      const corner = (i === 0 && j === 0) || (i === last && j === 0) || (i === 0 && j === last)
      if (corner) continue
      const cx = centers[i]!
      const cy = centers[j]!
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dark = Math.max(Math.abs(dx), Math.abs(dy)) !== 1 ? 1 : 0
          modules[(cy + dy) * size + (cx + dx)] = dark
        }
      }
    }
  }
}

function drawTiming(modules: Uint8Array, size: number): void {
  for (let i = 8; i < size - 8; i++) {
    modules[i * size + 6] = i % 2 === 0 ? 1 : 0
    modules[6 * size + i] = i % 2 === 0 ? 1 : 0
  }
}

function drawFormatBits(
  modules: Uint8Array,
  size: number,
  version: number,
  mask: number,
  ec: QrErrorCorrection,
): void {
  const bits = formatBits(mask, ec)
  const getBit = (v: number, i: number): number => (v >>> i) & 1
  // 第一拷贝（左上附近）
  for (let i = 0; i <= 5; i++) modules[i * size + 8] = getBit(bits, i)
  modules[7 * size + 8] = getBit(bits, 6)
  modules[8 * size + 8] = getBit(bits, 7)
  modules[8 * size + 7] = getBit(bits, 8)
  for (let i = 9; i < 15; i++) modules[8 * size + (14 - i)] = getBit(bits, i)
  // 第二拷贝（右上/左下附近）
  for (let i = 0; i < 8; i++) modules[8 * size + (size - 1 - i)] = getBit(bits, i)
  for (let i = 8; i < 15; i++) modules[(size - 15 + i) * size + 8] = getBit(bits, i)
  // 暗模块（恒为深色）：(x=8, y=4*version+9)
  modules[(4 * version + 9) * size + 8] = 1
}

function drawVersion(modules: Uint8Array, size: number, version: number): void {
  if (version < 7) return
  const bits = versionInfoBits(version)
  for (let i = 0; i < 18; i++) {
    const dark = (bits >>> i) & 1
    const a = size - 11 + (i % 3)
    const b = Math.floor(i / 3)
    modules[b * size + a] = dark
    modules[a * size + b] = dark
  }
}

/** 数据位 zigzag 放置 */
function drawCodewords(
  modules: Uint8Array,
  func: Uint8Array,
  size: number,
  codewords: number[],
): void {
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? size - 1 - vert : vert
        if (func[y * size + x]) continue
        if (i < codewords.length * 8) {
          modules[y * size + x] = (codewords[i >>> 3]! >>> (7 - (i & 7))) & 1
          i++
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 掩码与罚分（罚分规则按标准附录：N1 连续同色 / N2 2×2 同色块 /
 * N3 1:1:3:1:1 探测图形 / N4 深色占比；N3 用游程历史计数）
 * ------------------------------------------------------------------ */

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

const PENALTY_N1 = 3
const PENALTY_N2 = 3
const PENALTY_N3 = 40
const PENALTY_N4 = 10

/** 单行/单列的游程历史（长度 7，头部为最近一次游程） */
class RunHistory {
  private readonly runs: number[] = [0, 0, 0, 0, 0, 0, 0]

  /** 压入一个游程长度；首个游程（历史全 0）按边界留白处理，长度加矩阵边长 */
  push(len: number, size: number): void {
    let v = len
    if (this.runs[0] === 0) v += size
    this.runs.pop()
    this.runs.unshift(v)
  }

  /**
   * 计数 1:1:3:1:1 探测图形（核心：runs[2]=runs[4]=runs[5]=n、runs[3]=3n），
   * 两侧留白分别满足 ≥4n 与 ≥n 各计一次。
   */
  countPatterns(): number {
    const n = this.runs[1]!
    if (n <= 0) return 0
    const core =
      this.runs[2] === n && this.runs[4] === n && this.runs[5] === n && this.runs[3] === n * 3
    if (!core) return 0
    let count = 0
    if (this.runs[0]! >= n * 4 && this.runs[6]! >= n) count++
    if (this.runs[6]! >= n * 4 && this.runs[0]! >= n) count++
    return count
  }
}

function penaltyScore(modules: Uint8Array, size: number): number {
  const get = (x: number, y: number): number => modules[y * size + x] ?? 0
  let result = 0

  // N1 + N3：逐行、逐列扫描游程
  const scanLine = (getCell: (i: number) => number): void => {
    let runColor = 0
    let run = 0
    const history = new RunHistory()
    for (let i = 0; i < size; i++) {
      const cell = getCell(i)
      if (cell === runColor) {
        run++
        if (run === 5) result += PENALTY_N1
        else if (run > 5) result += 1
      } else {
        history.push(run, size)
        if (runColor === 0) result += history.countPatterns() * PENALTY_N3
        runColor = cell
        run = 1
      }
    }
    // 行尾：结束当前游程（暗游程先入历史），边界按整行留白计
    if (runColor === 1) {
      history.push(run, size)
      run = 0
    }
    run += size
    history.push(run, size)
    result += history.countPatterns() * PENALTY_N3
  }
  for (let y = 0; y < size; y++) scanLine((i) => get(i, y))
  for (let x = 0; x < size; x++) scanLine((i) => get(x, i))

  // N2：2×2 同色块
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = get(x, y)
      if (c === get(x + 1, y) && c === get(x, y + 1) && c === get(x + 1, y + 1)) result += PENALTY_N2
    }
  }

  // N4：深色占比（45%–55% 为基准，每偏离 5% 计 10 分）
  let dark = 0
  for (let i = 0; i < modules.length; i++) dark += modules[i] ?? 0
  const total = size * size
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1
  result += Math.max(0, k) * PENALTY_N4
  return result
}

/* ------------------------------------------------------------------ *
 * 主入口
 * ------------------------------------------------------------------ */

/**
 * 数据码字 + ECC 分块交错（短块/长块拆分，标准交错顺序）。
 * data 长度必须等于该版本/级别的数据码字数。
 */
function addEccAndInterleave(
  data: number[],
  version: number,
  ec: QrErrorCorrection,
): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ec][version]!
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[ec][version]!
  const rawCodewords = totalCodewords(version)
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks)
  const shortBlockLen = Math.floor(rawCodewords / numBlocks)

  interface Block {
    data: number[]
    ecc: number[]
    short: boolean
  }
  const blocks: Block[] = []
  let offset = 0
  for (let i = 0; i < numBlocks; i++) {
    const isShort = i < numShortBlocks
    const dataLen = shortBlockLen - eccPerBlock + (isShort ? 0 : 1)
    const blockData = data.slice(offset, offset + dataLen)
    offset += dataLen
    blocks.push({ data: blockData, ecc: rsEncode(blockData, eccPerBlock), short: isShort })
  }

  // 交错：先按数据位字节序交错（短块最后一字节为占位，跳过），再交错 ECC
  const result: number[] = []
  const maxDataLen = shortBlockLen - eccPerBlock + 1
  for (let i = 0; i < maxDataLen; i++) {
    for (let j = 0; j < numBlocks; j++) {
      const block = blocks[j]!
      // 跳过短块的占位字节位（短块数据比长块少 1 字节）
      if (i === maxDataLen - 1 && block.short) continue
      if (i < block.data.length) result.push(block.data[i]!)
    }
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (let j = 0; j < numBlocks; j++) {
      result.push(blocks[j]!.ecc[i]!)
    }
  }
  return result
}

/**
 * 编码 value 为 QR 矩阵（纠错级别 l/m/q/h，版本 1–40）。
 * - 空串会选版本 1（仅模式/计数/终止位），调用方应自行拦截空态；
 * - 内容超出容量抛 QR_TOO_LONG_ERROR。
 */
export function encodeQR(value: string, ecLevel: QrErrorCorrection = 'l'): QRResult {
  const ec = normalizeEc(ecLevel)
  const { codewords: dataWords, version } = encodeDataCodewords(value, ec)
  const finalCodewords = addEccAndInterleave(dataWords, version, ec)

  const size = 17 + 4 * version
  // 函数模块标记 + 初步矩阵
  const func = new Uint8Array(size * size)
  const base = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFunctionModule(version, x, y)) func[y * size + x] = 1
    }
  }
  drawFinder(base, size, 0, 0)
  drawFinder(base, size, size - 7, 0)
  drawFinder(base, size, 0, size - 7)
  drawAlignment(base, size, version)
  drawTiming(base, size)
  // 暗模块（恒深色，函数模块）随基础矩阵就位——掩码罚分计入它
  base[(4 * version + 9) * size + 8] = 1
  drawCodewords(base, func, size, finalCodewords)

  // 8 种掩码选罚分最低（标准流程：候选掩码应用后先绘该掩码的格式信息再计罚分，
  // 格式信息两位拷贝参与 N1/N2/N3/N4 全部罚分规则）
  let bestMask = 0
  let bestScore = Infinity
  let bestModules = new Uint8Array(size * size)
  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.slice()
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!func[y * size + x] && maskFunction(mask, x, y)) {
          candidate[y * size + x] = (candidate[y * size + x] ?? 0) ^ 1
        }
      }
    }
    drawFormatBits(candidate, size, version, mask, ec)
    const score = penaltyScore(candidate, size)
    if (score < bestScore) {
      bestScore = score
      bestMask = mask
      bestModules = candidate
    }
  }

  // 格式/版本信息（覆盖数据区）
  drawFormatBits(bestModules, size, version, bestMask, ec)
  drawVersion(bestModules, size, version)

  return {
    version,
    size,
    modules: bestModules,
    mask: bestMask,
    codewords: finalCodewords,
    remainderBits: remainderBits(version),
  }
}

/** 纠错级别归一：非法值回落 l（组件属性宽松解析） */
function normalizeEc(ec: QrErrorCorrection): QrErrorCorrection {
  return ec === 'm' || ec === 'q' || ec === 'h' ? ec : 'l'
}

/**
 * 将模块矩阵转为 SVG path 字符串（按行合并水平深色段，体积最小）。
 * 配合 viewBox="0 0 N N" 渲染即得二维码；offset 用于静区内边距平移。
 */
export function matrixToPath(modules: Uint8Array, size: number, offset = 0): string {
  let d = ''
  for (let y = 0; y < size; y++) {
    let start = -1
    for (let x = 0; x <= size; x++) {
      const dark = x < size && modules[y * size + x] === 1
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
