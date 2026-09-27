/**
 * table 导出（D8 `exportable`）的纯函数与下载通道。
 *
 * 与核心渲染解耦：本模块只做「矩阵 → 文本（CSV / Excel）→ 触发下载」，
 * 不感知表格 DOM。核心（oas-table.ts）负责从当前可见数据集抽出矩阵
 * （表头 + 数据行），导出能力在其上组装。
 *
 * 方案：CSV 走 RFC 4180 转义（逗号/引号/换行）；Excel 走 SpreadsheetML 2003
 * XML（`application/vnd.ms-excel` + `.xls`）——零依赖、Excel/WPS 可直接打开。
 */

/** 导出格式 */
export type ExportFormat = 'csv' | 'excel'

/** 合法格式全集（顺序即工具栏默认渲染顺序） */
export const EXPORT_FORMATS: readonly ExportFormat[] = ['csv', 'excel']

/** 各格式下载 MIME（CSV 带 charset，Excel 用 SpreadsheetML 的 ms-excel 类型） */
export const EXPORT_MIME: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  excel: 'application/vnd.ms-excel',
}

/** 各格式文件扩展名（Excel 走 `.xls`：SpreadsheetML 是 Excel 2003 XML 格式） */
export const EXPORT_EXT: Record<ExportFormat, string> = {
  csv: 'csv',
  excel: 'xls',
}

/** 导出矩阵：表头文本 + 数据行（单元格文本，已按列顺序展开） */
export interface ExportMatrix {
  headers: string[]
  rows: string[][]
}

/** 单个格式归一化：`xls` 视作 `excel`；非法回落 CSV */
export function normalizeExportFormat(raw: string): ExportFormat {
  const v = raw.trim().toLowerCase()
  return v === 'excel' || v === 'xls' ? 'excel' : 'csv'
}

/**
 * 解析 `export-format` 值（逗号分隔多格式，如 `"csv,excel"`）：
 * 逐项归一化、去重、按 EXPORT_FORMATS 顺序稳定输出；空/全非法回落 `['csv']`。
 */
export function parseExportFormats(raw: string): ExportFormat[] {
  const picked = new Set<ExportFormat>()
  for (const part of raw.split(',')) {
    const v = part.trim().toLowerCase()
    if (v === '') continue
    if (v === 'csv' || v === 'excel' || v === 'xls') picked.add(normalizeExportFormat(v))
  }
  const out = EXPORT_FORMATS.filter((f) => picked.has(f))
  return out.length > 0 ? out : ['csv']
}

/** 文件名净化：去掉路径分隔符与文件系统保留字符（`\ / : * ? " < > |`），空值回落 fallback */
export function sanitizeFileName(raw: string, fallback = 'export'): string {
  const cleaned = raw
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
  return cleaned === '' ? fallback : cleaned
}

/**
 * CSV 单元格转义（RFC 4180）：含分隔符 / 双引号 / 换行（LF/CR）时整体加引号，
 * 内部双引号翻倍。其余原样返回（不无谓加引号，保证可读性）。
 * 公式注入防护：以 `=` `+` `-` `@` 开头的值前置单引号（Excel/Sheets 打开导出
 * CSV 会按公式执行——导出内容常含用户输入，属 CSV injection 经典面）。
 */
export function escapeCsvField(value: string, delimiter = ','): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  const needsQuote = safe.includes(delimiter) || safe.includes('"') || safe.includes('\n') || safe.includes('\r')
  return needsQuote ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV 序列化；`bom` 为 true 时前置 UTF-8 BOM（Excel 双击打开中文不乱码） */
export function toCSV(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  options: { bom?: boolean; delimiter?: string; eol?: string } = {},
): string {
  const delimiter = options.delimiter ?? ','
  const eol = options.eol ?? '\r\n'
  const line = (cells: readonly string[]): string => cells.map((c) => escapeCsvField(c, delimiter)).join(delimiter)
  const body = [line(headers), ...rows.map(line)].join(eol)
  return `${options.bom ? '\uFEFF' : ''}${body}`
}

/** XML 文本 / 属性值转义（SpreadsheetML 用） */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Excel（SpreadsheetML 2003）序列化：单 Worksheet + 表头加粗样式。
 * 单元格一律 String 型（数值/日期由 Excel 按文本呈现，避免区域设置导致的小数/日期歧义）。
 */
export function toExcelXml(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  options: { sheetName?: string } = {},
): string {
  const sheetName = options.sheetName ?? 'Sheet1'
  const cell = (value: string, styleId?: string): string =>
    `<Cell${styleId ? ` ss:StyleID="${styleId}"` : ''}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
  const row = (cells: readonly string[], styleId?: string): string =>
    `   <Row>${cells.map((c) => cell(c, styleId)).join('')}</Row>`
  const lines = [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    ' <Styles>',
    '  <Style ss:ID="oas-header"><Font ss:Bold="1"/></Style>',
    ' </Styles>',
    ` <Worksheet ss:Name="${escapeXml(sheetName)}">`,
    '  <Table>',
    row(headers, 'oas-header'),
    ...rows.map((r) => row(r)),
    '  </Table>',
    ' </Worksheet>',
    '</Workbook>',
  ]
  return lines.join('\n')
}

/**
 * 触发浏览器下载（Blob + 临时 `<a download>`）。返回是否成功发起下载：
 * 非 DOM 环境 / Blob 不可用 / createObjectURL 不可用时返回 false（调用方据此降级，
 * 例如仅返回文本由宿主自行处理）。
 */
export function downloadText(content: string, fileName: string, format: ExportFormat): boolean {
  if (typeof Blob === 'undefined' || typeof document === 'undefined') return false
  let url = ''
  try {
    const blob = new Blob([content], { type: EXPORT_MIME[format] })
    url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : ''
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.style.display = 'none'
    // 挂载后再点击（部分环境对游离锚点的下载触发不一致），点击后即移除
    document.body.appendChild(a)
    a.click()
    a.remove()
    // 延迟释放：同任务内立即 revoke 在部分浏览器会取消尚未开始的下载（下个宏任务释放更稳）
    if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
    return true
  } catch {
    return false
  }
}
