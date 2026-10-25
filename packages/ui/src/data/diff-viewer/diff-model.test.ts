import { describe, expect, it } from 'vitest'
import { buildDiffRows, buildSplitRows, diffLines, inlineSegments, splitLines, type DiffLine } from './diff-model.js'

/** 参考实现：经典 LCS 动态规划（仅用于随机对拍，规模小） */
function lcsOps(a: string[], b: string[]): Array<'equal' | 'delete' | 'insert'> {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const ops: Array<'equal' | 'delete' | 'insert'> = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push('equal')
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push('delete')
      i++
    } else {
      ops.push('insert')
      j++
    }
  }
  while (i < a.length) {
    ops.push('delete')
    i++
  }
  while (j < b.length) {
    ops.push('insert')
    j++
  }
  return ops
}

function opsOf(lines: DiffLine[]): Array<'equal' | 'delete' | 'insert'> {
  return lines.map((line) => line.op)
}

describe('splitLines', () => {
  it('归一 CRLF/CR，忽略末尾换行产生的空行', () => {
    expect(splitLines('a\r\nb\rc\n')).toEqual(['a', 'b', 'c'])
    expect(splitLines('a\n\n')).toEqual(['a', ''])
    expect(splitLines('')).toEqual([])
  })
})

describe('diffLines', () => {
  it('相同内容全部 equal，行号连续', () => {
    const result = diffLines('a\nb', 'a\nb')
    expect(opsOf(result.lines)).toEqual(['equal', 'equal'])
    expect(result.lines.map((line) => [line.beforeNo, line.afterNo])).toEqual([
      [1, 1],
      [2, 2],
    ])
    expect([result.added, result.removed, result.unchanged]).toEqual([0, 0, 2])
    expect(result.degraded).toBe(false)
  })

  it('替换行产出 delete + insert，并标出真实行号', () => {
    const result = diffLines('a\nb\nc', 'a\nx\nc')
    expect(opsOf(result.lines)).toEqual(['equal', 'delete', 'insert', 'equal'])
    const [del, ins] = result.lines.filter((line) => line.op !== 'equal')
    expect(del).toMatchObject({ beforeNo: 2, afterNo: null, text: 'b' })
    expect(ins).toMatchObject({ beforeNo: null, afterNo: 2, text: 'x' })
    expect([result.added, result.removed, result.unchanged]).toEqual([1, 1, 2])
  })

  it('首尾与中间插入/删除保持行号正确', () => {
    const inserted = diffLines('a\nb', 'x\na\nb\ny')
    expect(opsOf(inserted.lines)).toEqual(['insert', 'equal', 'equal', 'insert'])
    expect(inserted.lines.map((line) => [line.beforeNo, line.afterNo])).toEqual([
      [null, 1],
      [1, 2],
      [2, 3],
      [null, 4],
    ])

    const removed = diffLines('a\nb\nc', 'a\nc')
    expect(opsOf(removed.lines)).toEqual(['equal', 'delete', 'equal'])
    expect(removed.lines[1]).toMatchObject({ beforeNo: 2, afterNo: null, text: 'b' })
  })

  it('随机对拍：编辑操作最少且可还原两侧文本', () => {
    let seed = 20261024
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const pick = (pool: string[]) => pool[Math.floor(rand() * pool.length)]!
    for (let round = 0; round < 300; round++) {
      const a = Array.from({ length: Math.floor(rand() * 9) }, () => pick(['a', 'b', 'c', 'd']))
      const b = Array.from({ length: Math.floor(rand() * 9) }, () => pick(['a', 'b', 'c', 'd']))
      const result = diffLines(a.join('\n'), b.join('\n'))
      const reference = lcsOps(a, b)
      const referenceEdits = reference.filter((op) => op !== 'equal').length
      const actualEdits = result.lines.filter((line) => line.op !== 'equal').length
      expect(actualEdits).toBe(referenceEdits)
      // 最短编辑脚本可能不唯一，只校验编辑数与两侧可还原性
      expect(result.lines.filter((line) => line.op !== 'insert').map((line) => line.text)).toEqual(a)
      expect(result.lines.filter((line) => line.op !== 'delete').map((line) => line.text)).toEqual(b)
    }
  })

  it('ignoreWhitespace 归一空白差异但保留原文', () => {
    const result = diffLines('a   b\nc', 'a b\nc', { ignoreWhitespace: true })
    expect(opsOf(result.lines)).toEqual(['equal', 'equal'])
    expect(result.lines[0]!.text).toBe('a   b')
    expect(result.lines[1]!.beforeNo).toBe(2)

    const strict = diffLines('a   b', 'a b')
    expect(strict.added + strict.removed).toBe(2)
  })

  it('超出 maxEdits 时降级为整块替换且不抛错', () => {
    const a = Array.from({ length: 40 }, (_, i) => `old-${i}`).join('\n')
    const b = Array.from({ length: 40 }, (_, i) => `new-${i}`).join('\n')
    const result = diffLines(a, b, { maxEdits: 5 })
    expect(result.degraded).toBe(true)
    expect(result.removed).toBe(40)
    expect(result.added).toBe(40)
    expect(result.unchanged).toBe(0)
  })

  it('maxEdits 足够时不降级', () => {
    const result = diffLines('a\nb\nc\nd', 'a\nx\nc\nd', { maxEdits: 100 })
    expect(result.degraded).toBe(false)
    expect(result.added).toBe(1)
    expect(result.removed).toBe(1)
  })
})

describe('inlineSegments', () => {
  it('只高亮变化片段，共同前缀/后缀保持未变', () => {
    const { before, after } = inlineSegments('const a = 1', 'const a = 2')
    expect(before.map((seg) => [seg.text, seg.changed])).toEqual([
      ['const a = ', false],
      ['1', true],
    ])
    expect(after.map((seg) => [seg.text, seg.changed])).toEqual([
      ['const a = ', false],
      ['2', true],
    ])
  })

  it('CJK 按单字拆分，避免整行标红', () => {
    const { before, after } = inlineSegments('名称：旧值', '名称：新值')
    expect(before).toEqual([
      { text: '名称：', changed: false },
      { text: '旧', changed: true },
      { text: '值', changed: false },
    ])
    expect(after).toEqual([
      { text: '名称：', changed: false },
      { text: '新', changed: true },
      { text: '值', changed: false },
    ])
  })

  it('完全不同时整行高亮；相同则单段未变', () => {
    expect(inlineSegments('abc', 'xyz')).toEqual({
      before: [{ text: 'abc', changed: true }],
      after: [{ text: 'xyz', changed: true }],
    })
    expect(inlineSegments('same', 'same')).toEqual({
      before: [{ text: 'same', changed: false }],
      after: [{ text: 'same', changed: false }],
    })
  })

  it('一行是另一行前缀时，短行无变化片段', () => {
    const { before, after } = inlineSegments('abc', 'abc def')
    expect(before).toEqual([{ text: 'abc', changed: false }])
    expect(after).toEqual([
      { text: 'abc', changed: false },
      { text: ' def', changed: true },
    ])
  })
})

describe('buildDiffRows', () => {
  const lines = (...values: string[]) => values.join('\n')

  it('折叠未修改区块：保留 context 行并给出可展开计数', () => {
    const before = lines('1', '2', '3', '4', '5', '6', 'old', 'a', 'b', 'c', 'd', 'e', 'f')
    const after = lines('1', '2', '3', '4', '5', '6', 'new', 'a', 'b', 'c', 'd', 'e', 'f')
    const result = buildDiffRows(before, after, { context: 2 })
    const folds = result.rows.filter((row) => row.kind === 'fold')
    expect(folds.length).toBe(2)
    expect(folds[0]).toMatchObject({ kind: 'fold', count: 4, start: 0, index: 0 })
    expect(folds[1]).toMatchObject({ kind: 'fold', count: 4, index: 1 })
    expect(result.rows.some((row) => row.kind === 'line' && row.text === '6')).toBe(true)
    expect(result.rows.some((row) => row.kind === 'line' && row.text === '1')).toBe(false)
  })

  it('context 足够大时全部展开、无折叠行', () => {
    const result = buildDiffRows(lines('1', '2', '3', 'old', 'x'), lines('1', '2', '3', 'new', 'x'), {
      context: 3,
    })
    expect(result.rows.every((row) => row.kind === 'line')).toBe(true)
    expect(result.rows).toHaveLength(6)
  })

  it('context=0 只保留变更行本身', () => {
    const result = buildDiffRows(lines('1', '2', 'old', '3', '4'), lines('1', '2', 'new', '3', '4'), {
      context: 0,
    })
    const kinds = result.rows.map((row) => (row.kind === 'fold' ? `fold:${row.count}` : row.op))
    expect(kinds).toEqual(['fold:2', 'delete', 'insert', 'fold:2'])
  })

  it('expandedFolds 展开指定折叠块', () => {
    const before = lines('1', '2', '3', '4', 'old', '5', '6')
    const after = lines('1', '2', '3', '4', 'new', '5', '6')
    const collapsed = buildDiffRows(before, after, { context: 1 })
    const foldIds = collapsed.folds.map((fold) => fold.index)
    expect(foldIds.length).toBe(2)
    const expanded = buildDiffRows(before, after, { context: 1, expandedFolds: [foldIds[0]!] })
    expect(expanded.rows.filter((row) => row.kind === 'fold')).toHaveLength(2)
    expect(expanded.rows.some((row) => row.kind === 'line' && row.text === '1')).toBe(true)
  })

  it('统计变更块与位置', () => {
    const before = lines('a', 'old1', 'b', 'c', 'old2', 'd')
    const after = lines('a', 'new1', 'b', 'c', 'new2', 'd')
    const result = buildDiffRows(before, after, { context: 3 })
    expect(result.hunks).toHaveLength(2)
    expect(result.hunks[0]).toMatchObject({ index: 0, beforeStart: 2, beforeCount: 1, afterStart: 2, afterCount: 1 })
    expect(result.hunks[1]).toMatchObject({ index: 1, beforeStart: 5, beforeCount: 1, afterStart: 5, afterCount: 1 })
    expect(result.rows.find((row) => row.kind === 'line' && row.text === 'old1')).toMatchObject({
      segments: [
        { text: 'old', changed: true },
        { text: '1', changed: false },
      ],
    })
    expect(result.stats).toEqual({ added: 2, removed: 2, unchanged: 4, hunks: 2 })
  })

  it('行数不等的替换块只做行级高亮', () => {
    const result = buildDiffRows(lines('old-a', 'old-b'), lines('new-a'), { context: 3 })
    const changed = result.rows.filter((row) => row.kind === 'line' && row.op !== 'equal')
    expect(changed.every((row) => row.kind === 'line' && row.segments === undefined)).toBe(true)
  })

  it('空文本不产生行', () => {
    const result = buildDiffRows('', '', { context: 3 })
    expect(result.rows).toEqual([])
    expect(result.stats).toEqual({ added: 0, removed: 0, unchanged: 0, hunks: 0 })
  })

  it('完全相同内容不折叠（无变更时保留全部行）', () => {
    const result = buildDiffRows('a\nb\nc', 'a\nb\nc', { context: 0 })
    expect(result.rows).toHaveLength(3)
    expect(result.folds).toEqual([])
    expect(result.rows.every((row) => row.kind === 'line')).toBe(true)
  })
})

describe('buildSplitRows', () => {
  it('删除/新增按序配对，多余侧留空', () => {
    const rows = buildSplitRows(buildDiffRows('old-a\nold-b\nkeep', 'new-a\nkeep').rows)
    const pairs = rows.map((row) => {
      if (row.kind === 'fold') return 'fold'
      return [row.before?.text ?? null, row.after?.text ?? null]
    })
    expect(pairs).toEqual([
      ['old-a', 'new-a'],
      ['old-b', null],
      ['keep', 'keep'],
    ])
  })

  it('连续的删除与新增合并成同一对齐块', () => {
    const rows = buildSplitRows(buildDiffRows('a\nx\ny\nb', 'a\nz\nb').rows)
    expect(rows).toHaveLength(4)
    expect(rows[1]).toMatchObject({ kind: 'line' })
    if (rows[1]!.kind === 'line') {
      expect(rows[1]!.before?.text).toBe('x')
      expect(rows[1]!.after?.text).toBe('z')
    }
    if (rows[2]!.kind === 'line') {
      expect(rows[2]!.before?.text).toBe('y')
      expect(rows[2]!.after).toBeNull()
    }
  })
})
