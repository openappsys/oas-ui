/**
 * 文本 Diff 纯模型：行切分、Myers 行级差异、词级高亮、折叠布局、并排配对。
 *
 * 不依赖 DOM，便于单测与后续复用（SSR 快照、CLI 工具）。
 * 算法为零依赖自研实现：行级 Myers O(ND)，超出 `maxEdits` 降级为整块替换；
 * 词级仅做共同前缀/后缀裁剪（不引入第三方 diff 库）。
 */

export type DiffOp = 'equal' | 'insert' | 'delete'

/** 词级片段：changed=true 表示该片段属于变化区间 */
export interface DiffSegment {
  text: string
  changed: boolean
}

/** 一行差异（统一视图的原始行序列） */
export interface DiffLine {
  op: DiffOp
  /** 旧文本行号（1 基；新增行为 null） */
  beforeNo: number | null
  /** 新文本行号（1 基；删除行为 null） */
  afterNo: number | null
  text: string
  /** 词级高亮片段（仅成对替换行有；行数不等的替换块不提供） */
  segments?: DiffSegment[]
}

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
  hunks: number
}

export interface DiffLineRow extends DiffLine {
  kind: 'line'
  /** 稳定行 id（虚拟滚动/aria-activedescendant 用，按当前布局重新编号） */
  id: string
}

export interface DiffFoldRow {
  kind: 'fold'
  id: string
  /** 折叠区间序号（按未修改区块出现顺序，展开集合以此为键，展开后保持稳定） */
  index: number
  /** 被折叠的首行在完整行序列中的下标 */
  start: number
  /** 被折叠的行数 */
  count: number
  /** 折叠区间首行的旧/新行号（1 基；无对应侧为 null） */
  beforeNo: number | null
  afterNo: number | null
  /** 相邻变更块序号（文末折叠取最后一个；无变更块为 -1） */
  hunkIndex: number
}

export type DiffRow = DiffLineRow | DiffFoldRow

export interface DiffHunk {
  index: number
  /** 旧文本行号（纯新增块取前一行的行号） */
  beforeStart: number
  beforeCount: number
  afterStart: number
  afterCount: number
  /** 该变更块首行在 rows 中的下标（折叠态也有效，用于 scrollToChange） */
  startRow: number
}

export interface DiffLayout {
  rows: DiffRow[]
  /** 当前布局里可折叠的区间（即使已展开也列出，供 expandAll 用） */
  folds: DiffFoldRow[]
  hunks: DiffHunk[]
  stats: DiffStats
  degraded: boolean
}

export interface DiffOptions {
  context?: number
  ignoreWhitespace?: boolean
  maxEdits?: number
  /** 已展开的折叠区间序号集合 */
  expandedFolds?: Iterable<number>
}

export interface DiffLinesResult {
  lines: DiffLine[]
  added: number
  removed: number
  unchanged: number
  degraded: boolean
}

/** 切分文本为行：归一 CRLF/CR，末尾换行不额外产生空行 */
export function splitLines(text: string): string[] {
  if (text === '') return []
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

/** 比较键：ignoreWhitespace 时归一空白（显示仍用原文） */
function compareKey(text: string, ignoreWhitespace: boolean): string {
  return ignoreWhitespace ? text.replace(/\s+/g, ' ').trim() : text
}

interface Op {
  op: DiffOp
  a?: number
  b?: number
}

/**
 * Myers O(ND)：只对裁剪共同前缀/后缀后的中段计算。
 * 返回 null 表示编辑距离超过 limit（调用方降级）。
 */
function myers(a: string[], b: string[], limit: number): Op[] | null {
  const n = a.length
  const m = b.length
  if (n === 0) return b.map((_, index) => ({ op: 'insert' as const, b: index }))
  if (m === 0) return a.map((_, index) => ({ op: 'delete' as const, a: index }))
  const maxD = Math.min(limit, n + m)
  const offset = maxD
  const width = 2 * maxD + 1
  const v = new Int32Array(width)
  const trace: Int32Array[] = []

  for (let d = 0; d <= maxD; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)) {
        x = v[offset + k + 1]!
      } else {
        x = v[offset + k - 1]! + 1
      }
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[offset + k] = x
      if (x >= n && y >= m) {
        trace.push(v.slice())
        return backtrack(trace, n, m, offset)
      }
    }
    trace.push(v.slice())
  }
  return null
}

function backtrack(trace: Int32Array[], n: number, m: number, offset: number): Op[] {
  const ops: Op[] = []
  let x = n
  let y = m
  for (let d = trace.length - 1; d > 0; d--) {
    const prev = trace[d - 1]!
    const k = x - y
    let prevK: number
    if (k === -d || (k !== d && prev[offset + k - 1]! < prev[offset + k + 1]!)) {
      prevK = k + 1
    } else {
      prevK = k - 1
    }
    const prevX = prev[offset + prevK]!
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      ops.push({ op: 'equal', a: x - 1, b: y - 1 })
      x--
      y--
    }
    if (x === prevX) {
      ops.push({ op: 'insert', b: y - 1 })
      y--
    } else {
      ops.push({ op: 'delete', a: x - 1 })
      x--
    }
  }
  while (x > 0 && y > 0) {
    ops.push({ op: 'equal', a: x - 1, b: y - 1 })
    x--
    y--
  }
  while (x > 0) {
    ops.push({ op: 'delete', a: x - 1 })
    x--
  }
  while (y > 0) {
    ops.push({ op: 'insert', b: y - 1 })
    y--
  }
  return ops.reverse()
}

const MAX_EDITS_DEFAULT = 1000

/** 行级差异（不折叠、不配对词级片段） */
export function diffLines(before: string, after: string, options: DiffOptions = {}): DiffLinesResult {
  const ignoreWhitespace = options.ignoreWhitespace ?? false
  const maxEdits = Math.max(1, options.maxEdits ?? MAX_EDITS_DEFAULT)
  const aLines = splitLines(before)
  const bLines = splitLines(after)
  const a = aLines.map((line) => compareKey(line, ignoreWhitespace))
  const b = bLines.map((line) => compareKey(line, ignoreWhitespace))

  // 裁剪共同前缀/后缀：常规编辑只对少量行计算，显著降低内存占用
  let prefix = 0
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
  let suffix = 0
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++
  }

  const aMid = a.slice(prefix, a.length - suffix)
  const bMid = b.slice(prefix, b.length - suffix)
  const midOps = myers(aMid, bMid, maxEdits)
  const degraded = midOps === null

  const ops: Op[] = []
  for (let i = 0; i < prefix; i++) ops.push({ op: 'equal', a: i, b: i })
  if (midOps) {
    for (const op of midOps) {
      ops.push({
        op: op.op,
        ...(op.a === undefined ? {} : { a: op.a + prefix }),
        ...(op.b === undefined ? {} : { b: op.b + prefix }),
      })
    }
  } else {
    // 降级：中段整块替换（删除全部 → 新增全部），仍保留共同前后缀
    for (let i = 0; i < aMid.length; i++) ops.push({ op: 'delete', a: prefix + i })
    for (let i = 0; i < bMid.length; i++) ops.push({ op: 'insert', b: prefix + i })
  }
  for (let i = 0; i < suffix; i++) {
    ops.push({
      op: 'equal',
      a: a.length - suffix + i,
      b: b.length - suffix + i,
    })
  }

  const lines: DiffLine[] = ops.map((op) => ({
    op: op.op,
    beforeNo: op.op === 'insert' ? null : (op.a ?? 0) + 1,
    afterNo: op.op === 'delete' ? null : (op.b ?? 0) + 1,
    text: op.op === 'insert' ? bLines[op.b ?? 0]! : aLines[op.a ?? 0]!,
  }))

  let added = 0
  let removed = 0
  let unchanged = 0
  for (const line of lines) {
    if (line.op === 'insert') added++
    else if (line.op === 'delete') removed++
    else unchanged++
  }
  return { lines, added, removed, unchanged, degraded }
}

const TOKEN_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[A-Za-z_]+|[0-9]+|\s+|[^\s]/gu

function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? []
}

function pruneSegments(segments: DiffSegment[]): DiffSegment[] {
  const out: DiffSegment[] = []
  for (const segment of segments) {
    if (segment.text === '') continue
    const last = out[out.length - 1]
    if (last && last.changed === segment.changed) last.text += segment.text
    else out.push({ ...segment })
  }
  return out
}

/** 词级高亮：共同前缀/后缀在 token 边界裁剪，仅中间变化片段标红 */
export function inlineSegments(before: string, after: string): { before: DiffSegment[]; after: DiffSegment[] } {
  const a = tokenize(before)
  const b = tokenize(after)
  let prefix = 0
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
  let suffix = 0
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++
  }
  const build = (tokens: string[]): DiffSegment[] =>
    pruneSegments([
      { text: tokens.slice(0, prefix).join(''), changed: false },
      { text: tokens.slice(prefix, tokens.length - suffix).join(''), changed: true },
      { text: tokens.slice(tokens.length - suffix).join(''), changed: false },
    ])
  return { before: build(a), after: build(b) }
}

/** 给成对替换行写入词级片段；行数不等的替换块保持行级高亮 */
function annotateInline(lines: DiffLine[]): DiffLine[] {
  const annotated = lines.map((line) => ({ ...line }))
  let i = 0
  while (i < annotated.length) {
    if (annotated[i]!.op === 'equal') {
      i++
      continue
    }
    let end = i
    while (end < annotated.length && annotated[end]!.op !== 'equal') end++
    const deletes = annotated.slice(i, end).filter((line) => line.op === 'delete')
    const inserts = annotated.slice(i, end).filter((line) => line.op === 'insert')
    if (deletes.length > 0 && deletes.length === inserts.length) {
      for (let k = 0; k < deletes.length; k++) {
        const paired = inlineSegments(deletes[k]!.text, inserts[k]!.text)
        deletes[k]!.segments = paired.before
        inserts[k]!.segments = paired.after
      }
    }
    i = end
  }
  return annotated
}

function buildHunks(lines: DiffLine[], firstRowOfLine: number[], rowCount: number): DiffHunk[] {
  const hunks: DiffHunk[] = []
  let i = 0
  while (i < lines.length) {
    if (lines[i]!.op === 'equal') {
      i++
      continue
    }
    const startLine = i
    const startRow = firstRowOfLine[startLine] ?? rowCount
    let beforeStart = 0
    let beforeCount = 0
    let afterStart = 0
    let afterCount = 0
    while (i < lines.length && lines[i]!.op !== 'equal') {
      const line = lines[i]!
      if (line.op === 'delete') {
        if (beforeCount === 0) beforeStart = line.beforeNo ?? 0
        beforeCount++
      } else {
        if (afterCount === 0) afterStart = line.afterNo ?? 0
        afterCount++
      }
      i++
    }
    if (beforeCount === 0) {
      const prev = lines[startLine - 1]
      beforeStart = prev?.beforeNo ?? 0
    }
    if (afterCount === 0) {
      const prev = lines[startLine - 1]
      afterStart = prev?.afterNo ?? 0
    }
    hunks.push({
      index: hunks.length,
      beforeStart,
      beforeCount,
      afterStart,
      afterCount,
      startRow,
    })
  }
  return hunks
}

/** 折叠布局：按 context 保留变更两侧行，其余未修改行折叠为单行 */
export function layoutRows(lines: DiffLine[], options: DiffOptions = {}): DiffLayout {
  const context = Math.max(0, options.context ?? 3)
  const expanded = new Set(options.expandedFolds ?? [])
  const annotated = annotateInline(lines)
  const hasChanges = annotated.some((line) => line.op !== 'equal')
  const rows: DiffRow[] = []
  const folds: DiffFoldRow[] = []
  /** 每个原始行下标对应的 rows 下标（折叠行取折叠行本身的位置） */
  const firstRowOfLine: number[] = []
  let equalRun = 0
  let i = 0
  while (i < annotated.length) {
    if (annotated[i]!.op !== 'equal') {
      firstRowOfLine[i] = rows.length
      rows.push({ ...annotated[i]!, kind: 'line', id: `l-${rows.length}` })
      i++
      continue
    }
    let end = i
    while (end < annotated.length && annotated[end]!.op === 'equal') end++
    const runLength = end - i
    const head = hasChanges && i > 0 ? Math.min(context, runLength) : 0
    const tail = hasChanges && end < annotated.length ? Math.min(context, runLength - head) : 0
    const foldCount = hasChanges ? runLength - head - tail : 0
    const runIndex = equalRun++
    for (let k = i; k < i + head; k++) {
      firstRowOfLine[k] = rows.length
      rows.push({ ...annotated[k]!, kind: 'line', id: `l-${rows.length}` })
    }
    if (foldCount > 0) {
      const first = annotated[i + head]!
      const fold: DiffFoldRow = {
        kind: 'fold',
        id: `f-${runIndex}`,
        index: runIndex,
        start: i + head,
        count: foldCount,
        beforeNo: first.beforeNo,
        afterNo: first.afterNo,
        hunkIndex: -1,
      }
      folds.push(fold)
      if (expanded.has(runIndex)) {
        for (let k = i + head; k < end - tail; k++) {
          firstRowOfLine[k] = rows.length
          rows.push({ ...annotated[k]!, kind: 'line', id: `l-${rows.length}` })
        }
      } else {
        for (let k = i + head; k < end - tail; k++) firstRowOfLine[k] = rows.length
        rows.push(fold)
      }
    } else {
      for (let k = i + head; k < end - tail; k++) {
        firstRowOfLine[k] = rows.length
        rows.push({ ...annotated[k]!, kind: 'line', id: `l-${rows.length}` })
      }
    }
    for (let k = end - tail; k < end; k++) {
      firstRowOfLine[k] = rows.length
      rows.push({ ...annotated[k]!, kind: 'line', id: `l-${rows.length}` })
    }
    i = end
  }

  const hunks = buildHunks(annotated, firstRowOfLine, rows.length)
  // 折叠行归属相邻变更块：优先取其后第一个变更块，文末折叠取前一个
  const foldRowIndex = new Map<DiffFoldRow, number>()
  rows.forEach((row, index) => {
    if (row.kind === 'fold') foldRowIndex.set(row, index)
  })
  for (const fold of folds) {
    const position = foldRowIndex.get(fold) ?? 0
    const next = hunks.find((hunk) => hunk.startRow > position)
    fold.hunkIndex = next?.index ?? hunks.length - 1
  }

  let added = 0
  let removed = 0
  let unchanged = 0
  for (const line of annotated) {
    if (line.op === 'insert') added++
    else if (line.op === 'delete') removed++
    else unchanged++
  }
  return {
    rows,
    folds,
    hunks,
    stats: { added, removed, unchanged, hunks: hunks.length },
    degraded: false,
  }
}

/** 构建折叠视图（解析 + 差异 + 布局） */
export function buildDiffRows(
  before: string,
  after: string,
  options: DiffOptions = {},
): DiffLayout & { lines: DiffLine[] } {
  const diff = diffLines(before, after, options)
  const layout = layoutRows(diff.lines, options)
  return { ...layout, degraded: diff.degraded, lines: diff.lines }
}

export interface SplitLineRow {
  kind: 'line'
  id: string
  before: DiffLineRow | null
  after: DiffLineRow | null
}

export type SplitRow = SplitLineRow | DiffFoldRow

export interface SplitLayout {
  rows: SplitRow[]
  /** 统一视图行下标 → 并排行下标（折叠行映射到其所在行；未使用下标为 -1） */
  map: number[]
}

/** 并排视图：连续删除/新增按序配对，行数不等时多余侧留空；同时返回行下标映射 */
export function layoutSplitRows(rows: DiffRow[]): SplitLayout {
  const out: SplitRow[] = []
  const map: number[] = []
  let i = 0
  while (i < rows.length) {
    const row = rows[i]!
    if (row.kind === 'fold' || row.op === 'equal') {
      map[i] = out.length
      out.push(row.kind === 'fold' ? row : { kind: 'line', id: `s-${out.length}`, before: row, after: row })
      i++
      continue
    }
    const start = i
    const deletes: DiffLineRow[] = []
    const inserts: DiffLineRow[] = []
    while (i < rows.length && rows[i]!.kind !== 'fold' && (rows[i] as DiffLineRow).op !== 'equal') {
      const changed = rows[i] as DiffLineRow
      if (changed.op === 'delete') deletes.push(changed)
      else if (changed.op === 'insert') inserts.push(changed)
      i++
    }
    const pairs = Math.max(deletes.length, inserts.length)
    for (let k = 0; k < pairs; k++) {
      map[start + k] = out.length
      out.push({
        kind: 'line',
        id: `s-${out.length}`,
        before: deletes[k] ?? null,
        after: inserts[k] ?? null,
      })
    }
    // 防御：块内未配对到的下标映射到块末行
    for (let k = start + pairs; k < i; k++) map[k] = Math.max(0, out.length - 1)
  }
  return { rows: out, map }
}

/** 并排视图行（只要行数组的兼容入口） */
export function buildSplitRows(rows: DiffRow[]): SplitRow[] {
  return layoutSplitRows(rows).rows
}
