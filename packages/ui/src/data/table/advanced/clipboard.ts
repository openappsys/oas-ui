export interface TsvColumn {
  key: string
  title?: string
}

function escapeCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  // TSV 单元格内的制表符/换行替换为空格，避免破坏列/行结构
  return text.replace(/[\t\r\n]+/g, ' ')
}

/**
 * 把行数据导出为 TSV（可直接粘贴到表格软件）。
 * 默认带表头；列顺序由 columns 决定。
 */
export function toTsv(
  rows: readonly Record<string, unknown>[],
  columns: readonly TsvColumn[],
  options: { header?: boolean } = {},
): string {
  const lines: string[] = []
  if (options.header !== false) lines.push(columns.map((column) => escapeCell(column.title ?? column.key)).join('\t'))
  for (const row of rows) lines.push(columns.map((column) => escapeCell(row[column.key])).join('\t'))
  return lines.join('\n')
}

/** 解析 TSV 为二维字符串数组；保留空单元格，忽略末尾空行 */
export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines.map((line) => line.split('\t'))
}
