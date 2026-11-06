// 数据导入 helper（table/import，helper 型 L3，纯函数）：TSV/CSV 文本 → 二维矩阵 → 对象数组。
// 与 clipboard.ts 的 parseTsv 同源复用（TSV 分支直接调用，语义单一真相源）；CSV 走本地
// RFC 4180 状态机（引号内分隔符/换行不分裂、"" 转义引号——parseTsv 无引号语义，故 TSV 以外
// 不复用）。激活唯一入口是显式 import 纯函数，无 HTML/属性触发面，不进 L1/CDN 分包。
// 纯函数零 DOM 依赖：本模块不引用 document / window，可在 SSR / Node 直接调用；唯一平台
// API 是 importTableFile 的 File.text()（File/Blob 为平台标准对象，浏览器与 Node 20+ 均有）。
// 统计如实报告（不静默）：跳过的完全空行 / 行列不齐补齐截断的单元格数都进返回值。
import { parseTsv } from '../advanced/clipboard.js'

export type TableImportDelimiter = '\t' | ',' | ';'

export interface ParseTableTextOptions {
  /**
   * 分隔符：缺省 `'auto'` 嗅探——统计各候选（`\t` / `,` / `;`）在引号外的出现次数，
   * 最多者胜（并列按 `\t` > `,` > `;` 顺序，Excel 粘贴板的标准 TSV 优先）；
   * 全部为零时回落 `'\t'`（此时每行解析为单格）。显式指定时跳过嗅探。
   */
  delimiter?: TableImportDelimiter | 'auto'
}

export interface TableParseResult {
  /** 二维矩阵（TSV/CSV 解析结果；CSV 按引号语义，TSV 直分列） */
  matrix: string[][]
  /** 实际使用的分隔符（`auto` 嗅探结果如实透出） */
  delimiter: TableImportDelimiter
  /** 跳过的**中间**完全空行数（末尾空行按惯例忽略、不计入） */
  skippedRows: number
}

export interface MatrixToRecordsOptions {
  /** 首行是否为表头（列名 → key）；缺省 `true`。`false` 时列名取 `columns` 或生成 `c1..cN` */
  header?: boolean
  /** 显式列名（`header: false` 时生效；长度不足按 `c{列序号}` 补齐） */
  columns?: string[]
}

export interface MatrixRecordsResult {
  /** 对象数组（列名 → key；**值保持字符串**——数值/日期化归宿主，不做魔法类型推断） */
  records: Record<string, string>[]
  /** 最终列名序列（含重名后缀 / 空名补齐后的 key） */
  columns: string[]
  /** 行列不齐单元格计数：数据行缺列补空串 / 超长截断（表头行不参与计数） */
  skippedCells: number
}

export interface TableImportResult extends MatrixRecordsResult {
  /** 实际使用的分隔符 */
  delimiter: TableImportDelimiter
  /** 数据行数（不含表头行；不含跳过的空行） */
  rowCount: number
  /** 跳过的中间完全空行数（末尾空行不计） */
  skippedRows: number
}

/** 候选分隔符（嗅探优先序：\t 最高——Excel 粘贴板 TSV 是表格粘贴的事实标准） */
const CANDIDATES: readonly TableImportDelimiter[] = ['\t', ',', ';']

/**
 * 引号外字符扫描（RFC 4180 口径）：返回 `fn` 对引号外每个字符的累计命中数。
 * `inQuotes` 为 true 时（引号内）跳过；`""` 为转义引号。
 */
function scanOutsideQuotes(text: string, fn: (ch: string) => void): void {
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') i++
      else inQuotes = !inQuotes
      continue
    }
    if (!inQuotes) fn(ch)
  }
}

/** CSV/分号 CSV 解析（RFC 4180 状态机）：引号内分隔符/换行不分裂、`""` 转义引号 */
function parseDelimited(text: string, delimiter: TableImportDelimiter): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const commitCell = (): void => {
    row.push(cell)
    cell = ''
  }
  const commitRow = (): void => {
    commitCell()
    rows.push(row)
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else inQuotes = false
      } else cell += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      commitCell()
    } else if (ch === '\r' || ch === '\n') {
      // CRLF 视为一个行分隔（\r\n 同帧消费）
      if (ch === '\r' && text[i + 1] === '\n') i++
      commitRow()
    } else cell += ch
  }
  commitCell() // 末格（无换行结尾的最后一行在此提交）
  rows.push(row)
  // 末尾空行按惯例忽略（与 parseTsv 同口径：末尾 `[ '' ]` 行剔除）
  while (rows.length > 0 && rows[rows.length - 1]!.length === 1 && rows[rows.length - 1]![0] === '') rows.pop()
  return rows
}

/**
 * 文本 → 二维矩阵（纯函数）。
 * - TSV 分支复用 `parseTsv`（CRLF 归一 + 末尾空行忽略，语义同源）；
 * - `,` / `;` 走本地 RFC 4180 状态机（引号语义）；
 * - 中间完全空行（解析后为单空格的行）剔除并计入 `skippedRows`——数据不静默丢失。
 */
export function parseTableText(text: string, options: ParseTableTextOptions = {}): TableParseResult {
  const raw = options.delimiter ?? 'auto'
  let delimiter: TableImportDelimiter
  if (raw === 'auto') {
    // 引号外计数嗅探：引号内的分隔符是数据不是结构（"说 ""你好"", 加油" 里的逗号不能当列界）
    const counts = new Map<TableImportDelimiter, number>()
    for (const c of CANDIDATES) counts.set(c, 0)
    scanOutsideQuotes(text, (ch) => {
      if (ch === '\t' || ch === ',' || ch === ';') counts.set(ch, (counts.get(ch) ?? 0) + 1)
    })
    let best: TableImportDelimiter = '\t'
    let bestCount = 0
    for (const c of CANDIDATES) {
      const n = counts.get(c) ?? 0
      if (n > bestCount) {
        best = c
        bestCount = n
      }
    }
    delimiter = best // 全零时保持 '\t'（每行单格回落）
  } else {
    delimiter = raw
  }
  const parsed = delimiter === '\t' ? parseTsv(text) : parseDelimited(text, delimiter)
  // 中间完全空行：剔除 + 计数（末尾空行解析层已剔除；此处只剩中间的）
  let skippedRows = 0
  const matrix = parsed.filter((row) => {
    if (row.length === 1 && row[0] === '') {
      skippedRows++
      return false
    }
    return true
  })
  return { matrix, delimiter, skippedRows }
}

/**
 * 矩阵 → 对象数组（纯函数）。
 * - `header: true`（缺省）：首行为列名——trim 后为 key；空名按列序生成 `c{序号}`；
 *   重名第 N 次（N≥2）出现追加 `.N` 后缀（首个保留原名）；
 * - `header: false`：列名取 `columns`（不足按 `c{列序号}` 补齐），未提供则全 `c1..cN`；
 * - 列数基准：header 模式为表头行长度；无表头模式为全矩阵最大行长度。数据行缺列补空串、
 *   超长截断，计数进 `skippedCells`（如实报告）；
 * - 值保持字符串——数值/日期化归宿主（不做魔法类型推断）。
 */
export function matrixToRecords(
  matrix: readonly (readonly string[])[],
  options: MatrixToRecordsOptions = {},
): MatrixRecordsResult {
  if (matrix.length === 0) return { records: [], columns: [], skippedCells: 0 }
  const header = options.header !== false
  const explicit = options.columns
  const width = header ? matrix[0]!.length : Math.max(...matrix.map((r) => r.length))
  // 列名解析：首行表头（trim；空名 c{序号}）或显式 columns / 生成序列；重名追加 .N
  const columns: string[] = []
  const seen = new Map<string, number>()
  for (let i = 0; i < width; i++) {
    let name: string
    if (header) {
      name = (matrix[0]![i] ?? '').trim()
      if (name === '') name = `c${i + 1}`
    } else if (explicit && i < explicit.length) {
      name = explicit[i]!
    } else {
      name = `c${i + 1}`
    }
    const n = (seen.get(name) ?? 0) + 1
    seen.set(name, n)
    columns.push(n === 1 ? name : `${name}.${n}`)
  }
  const rows = header ? matrix.slice(1) : matrix
  let skippedCells = 0
  const records = rows.map((row) => {
    const record: Record<string, string> = {}
    for (let i = 0; i < width; i++) record[columns[i]!] = i < row.length ? (row[i] ?? '') : ''
    if (row.length < width) skippedCells += width - row.length
    else if (row.length > width) skippedCells += row.length - width
    return record
  })
  return { records, columns, skippedCells }
}

/**
 * 组合入口：文本 → 对象数组（parse + records 两步合一），统计如实透出。
 * 适合粘贴板文本（宿主自行 `navigator.clipboard.readText()` 后传入——本模块不读粘贴板）。
 */
export function importTableText(
  text: string,
  options: ParseTableTextOptions & MatrixToRecordsOptions = {},
): TableImportResult {
  const { matrix, delimiter, skippedRows } = parseTableText(text, { delimiter: options.delimiter })
  const { records, columns, skippedCells } = matrixToRecords(matrix, {
    header: options.header,
    columns: options.columns,
  })
  return { records, columns, delimiter, rowCount: records.length, skippedRows, skippedCells }
}

/** File 入口：`file.text()` 后走 `importTableText`（文本读取交给平台 File 对象，其余纯函数）。 */
export async function importTableFile(
  file: File,
  options: ParseTableTextOptions & MatrixToRecordsOptions = {},
): Promise<TableImportResult> {
  return importTableText(await file.text(), options)
}
