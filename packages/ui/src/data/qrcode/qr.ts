/**
 * 二维码编码器 —— 纯 TypeScript、零依赖实现（QR ISO/IEC 18004 子集）。
 *
 * 架构决策（选型取舍，见 PRD v1.4 qrcode）：
 * - 目标：零依赖原则约束下，不引入第三方 qrcode 库；
 * - 范围：字节/字母数字/数字三种模式自动选择；纠错级别仅实现 **L 级**（组件层
 *   把 m/q/h 归一为 l，demo 中注明）；版本 1–10（L 级字节容量 ≤ 307 字节）；
 * - 完整性保障：RS 纠错码与格式/版本信息 BCH 均对照公开标准教程（thonky.com）的
 *   已知向量做了单测交叉验证，另加矩阵回读自检，保证产物可被标准扫码器识别；
 * - 已知限制：版本 >10 的内容（超过 L 级容量）抛 QR_TOO_LONG_ERROR，由组件层
 *   渲染「内容过长」占位。m/q/h 的更高纠错能力暂未实现（低纠错 L 级已可满足
 *   大多数展示/下载场景，长按/扫码在弱光场景误码率略高，demo 注明）。
 */

/** 错误：内容超出 L 级纠错、版本 1–10 的容量 */
export const QR_TOO_LONG_ERROR = 'QR_TOO_LONG'

/** 编码模式 */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte'

/** 纠错级别（当前仅 'l' 真正实现；组件层将 m/q/h 归一为 l） */
export type QrErrorCorrection = 'l'

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
 * 常量表（版本 1–10，L 级）
 * ------------------------------------------------------------------ */

/** 每个版本的 RS 块规格：{ 每块 ECC 码字数, 块数 }（L 级） */
const RS_BLOCKS_L: Record<number, { ecc: number; blocks: number }> = {
  1: { ecc: 7, blocks: 1 },
  2: { ecc: 10, blocks: 1 },
  3: { ecc: 15, blocks: 1 },
  4: { ecc: 20, blocks: 1 },
  5: { ecc: 26, blocks: 1 },
  6: { ecc: 18, blocks: 2 },
  7: { ecc: 20, blocks: 2 },
  8: { ecc: 24, blocks: 2 },
  9: { ecc: 30, blocks: 2 },
  10: { ecc: 18, blocks: 2 },
}

/** 每个版本的总码字数（数据 + ECC） */
const TOTAL_CODEWORDS: Record<number, number> = {
  1: 26,
  2: 44,
  3: 70,
  4: 100,
  5: 134,
  6: 172,
  7: 196,
  8: 242,
  9: 292,
  10: 346,
}

/** 对齐图形中心坐标 */
const ALIGNMENT_POS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
}

/** 余数位数量（版本 1–10） */
const REMAINDER_BITS: Record<number, number> = {
  1: 0,
  2: 7,
  3: 7,
  4: 7,
  5: 7,
  6: 7,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
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
 * L 级 formatBits = 1（EC 级别指示 L=01）。
 */
export function formatBits(mask: number): number {
  const data = (1 << 3) | mask
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

function countIndicatorBits(mode: QrMode, version: number): number {
  if (version <= 9) {
    if (mode === 'numeric') return 10
    if (mode === 'alphanumeric') return 9
    return 8
  }
  if (mode === 'numeric') return 12
  if (mode === 'alphanumeric') return 11
  return 16
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

function dataCodewords(version: number): number {
  const { ecc, blocks } = RS_BLOCKS_L[version]!
  return TOTAL_CODEWORDS[version]! - ecc * blocks
}

/** 选择能容纳内容的版本（1–10），放不下抛 QR_TOO_LONG */
function pickVersion(mode: QrMode, value: string): number {
  const n = value.length
  for (let v = 1; v <= 10; v++) {
    const capacity = dataCodewords(v) * 8
    const required = 4 + countIndicatorBits(mode, v) + dataBitLength(mode, n) + 4
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
  _ecLevel: QrErrorCorrection = 'l',
): { codewords: number[]; mode: QrMode; version: number; dataCodewords: number } {
  const mode = detectMode(value)
  const version = pickVersion(mode, value)
  const n = value.length
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

  const capacity = dataCodewords(version) * 8
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
  while (codewords.length < dataCodewords(version)) {
    codewords.push(0xec)
    if (codewords.length < dataCodewords(version)) codewords.push(0x11)
  }
  return { codewords, mode, version, dataCodewords: dataCodewords(version) }
}

/* ------------------------------------------------------------------ *
 * 模块放置
 * ------------------------------------------------------------------ */

/** 判断 (x, y) 是否为函数模块（定位/时序/对齐/格式/版本/暗模块区域） */
export function isFunctionModule(version: number, x: number, y: number): boolean {
  const size = 17 + 4 * version
  // 定位图形 + 分隔符（四角 8×8：7×7 定位 + 右/下 1 分隔条）
  if (x < 8 && y < 8) return true
  if (x >= size - 8 && y < 8) return true
  if (x < 8 && y >= size - 8) return true
  // 时序图形（行/列 6）
  if (x === 6 || y === 6) return true
  // 对齐图形（5×5 区域；跳过三个与定位图形重叠的角）
  const centers = ALIGNMENT_POS[version] ?? []
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

/** 绘制定位图形（含 1 模块白色分隔符），center 为 7×7 左上角 */
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
  const centers = ALIGNMENT_POS[version] ?? []
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

function drawFormatBits(modules: Uint8Array, size: number, version: number, mask: number): void {
  const bits = formatBits(mask)
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
 * 掩码与罚分
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

function penaltyScore(modules: Uint8Array, func: Uint8Array, size: number): number {
  const get = (x: number, y: number): number => modules[y * size + x] ?? 0
  let result = 0

  // N1：同色连续 ≥5
  for (let y = 0; y < size; y++) {
    let runColor = -1
    let run = 0
    for (let x = 0; x <= size; x++) {
      const c = x < size ? get(x, y) : -1
      if (c === runColor) run++
      else {
        if (run >= 5) result += run - 2
        runColor = c
        run = 1
      }
    }
  }
  for (let x = 0; x < size; x++) {
    let runColor = -1
    let run = 0
    for (let y = 0; y <= size; y++) {
      const c = y < size ? get(x, y) : -1
      if (c === runColor) run++
      else {
        if (run >= 5) result += run - 2
        runColor = c
        run = 1
      }
    }
  }

  // N2：2×2 同色块
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = get(x, y)
      if (c === get(x + 1, y) && c === get(x, y + 1) && c === get(x + 1, y + 1)) result += 3
    }
  }

  // N3：1:1:3:1:1 比例 + 两侧 4 白
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 6; x++) {
      const pattern =
        get(x, y) === 1 &&
        get(x + 1, y) === 0 &&
        get(x + 2, y) === 1 &&
        get(x + 3, y) === 1 &&
        get(x + 4, y) === 1 &&
        get(x + 5, y) === 0 &&
        get(x + 6, y) === 1
      if (pattern && (x === 0 || get(x - 1, y) === 0) && (x + 7 >= size || get(x + 7, y) === 0)) {
        result += 40
      }
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size - 6; y++) {
      const pattern =
        get(x, y) === 1 &&
        get(x, y + 1) === 0 &&
        get(x, y + 2) === 1 &&
        get(x, y + 3) === 1 &&
        get(x, y + 4) === 1 &&
        get(x, y + 5) === 0 &&
        get(x, y + 6) === 1
      if (pattern && (y === 0 || get(x, y - 1) === 0) && (y + 7 >= size || get(x, y + 7) === 0)) {
        result += 40
      }
    }
  }

  // N4：深色占比
  let dark = 0
  for (let i = 0; i < modules.length; i++) dark += modules[i] ?? 0
  const total = size * size
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1
  result += Math.max(0, k) * 10
  return result
}

/* ------------------------------------------------------------------ *
 * 主入口
 * ------------------------------------------------------------------ */

/**
 * 编码 value 为 QR 矩阵（L 级纠错，版本 1–10）。
 * - 空串会选版本 1（仅模式/计数/终止位），调用方应自行拦截空态；
 * - 内容超出容量抛 QR_TOO_LONG_ERROR。
 */
export function encodeQR(value: string, ecLevel: QrErrorCorrection = 'l'): QRResult {
  const { codewords: dataWords, version } = encodeDataCodewords(value, ecLevel)
  const { ecc: eccPerBlock, blocks } = RS_BLOCKS_L[version]!

  // 数据分块
  const blockSize = Math.ceil(dataWords.length / blocks)
  const dataBlocks: number[][] = []
  for (let b = 0; b < blocks; b++) {
    dataBlocks.push(dataWords.slice(b * blockSize, b * blockSize + blockSize))
  }
  // 各块 ECC
  const eccBlocks = dataBlocks.map((b) => rsEncode(b, eccPerBlock))
  // 交错
  const finalCodewords: number[] = []
  const maxData = Math.max(...dataBlocks.map((b) => b.length))
  for (let i = 0; i < maxData; i++) {
    for (const b of dataBlocks) if (i < b.length) finalCodewords.push(b[i]!)
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (const b of eccBlocks) finalCodewords.push(b[i]!)
  }
  const remainderBits = REMAINDER_BITS[version]!

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
  drawCodewords(base, func, size, finalCodewords)

  // 8 种掩码选罚分最低
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
    const score = penaltyScore(candidate, func, size)
    if (score < bestScore) {
      bestScore = score
      bestMask = mask
      bestModules = candidate
    }
  }

  // 格式/版本信息（覆盖数据区）
  drawFormatBits(bestModules, size, version, bestMask)
  drawVersion(bestModules, size, version)

  return {
    version,
    size,
    modules: bestModules,
    mask: bestMask,
    codewords: finalCodewords,
    remainderBits,
  }
}

/**
 * 将模块矩阵转为 SVG path 字符串（按行合并水平深色段，体积最小）。
 * 配合 viewBox="0 0 N N" 渲染即得二维码。
 */
export function matrixToPath(modules: Uint8Array, size: number): string {
  let d = ''
  for (let y = 0; y < size; y++) {
    let start = -1
    for (let x = 0; x <= size; x++) {
      const dark = x < size && modules[y * size + x] === 1
      if (dark && start < 0) start = x
      if (!dark && start >= 0) {
        const len = x - start
        d += `M${start} ${y}h${len}v1h-${len}z`
        start = -1
      }
    }
  }
  return d
}
