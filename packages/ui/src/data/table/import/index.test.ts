// 数据导入（table/import，helper 型 L3）：文本 → 二维矩阵 → 对象数组。
// TSV 分支复用 advanced/clipboard 的 parseTsv（单一真相源），CSV 走本地 RFC 4180 状态机；
// 分隔符 auto 嗅探（\t / , / ;，引号外计数）；行列不齐/空行如实计数（不静默丢数据）。
// RED：模块未实现，本文件锁契约。纯函数零 DOM 依赖（可在 SSR / Node 直接调用）。
import { describe, it, expect } from 'vitest'
import { parseTableText, matrixToRecords, importTableText, importTableFile } from './index.js'
import { parseTsv } from '../advanced/clipboard.js'

describe('table/import parseTableText（文本 → 二维矩阵）', () => {
  it('① TSV：按 \t 分列；CRLF 归一；末尾空行忽略——与 parseTsv 同源', () => {
    const r = parseTableText('a\tb\tc\r\n1\t2\t3\r\n\r\n')
    expect(r.delimiter).toBe('\t')
    expect(r.matrix).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
    expect(r.skippedRows).toBe(0)
    // 与 parseTsv 逐值一致（复用同一实现）
    expect(r.matrix).toEqual(parseTsv('a\tb\tc\r\n1\t2\t3'))
  })

  it('② CSV：引号内逗号/换行不分裂；"" 转义引号（RFC 4180）', () => {
    const r = parseTableText('name,note\n"张三","说 ""你好"", 加油"\n"李,四","多\n行"')
    expect(r.delimiter).toBe(',')
    expect(r.matrix).toEqual([
      ['name', 'note'],
      ['张三', '说 "你好", 加油'],
      ['李,四', '多\n行'],
    ])
  })

  it('③ 分号 CSV：嗅探 ; 为分隔符（引号内 ; 不分裂）', () => {
    const r = parseTableText('a;b\n1;"x;y"')
    expect(r.delimiter).toBe(';')
    expect(r.matrix).toEqual([
      ['a', 'b'],
      ['1', 'x;y'],
    ])
  })

  it('④ auto 嗅探：\t 优先于 ,（Excel 粘贴板 TSV 标准格式优先）；显式 delimiter 跳过嗅探', () => {
    // \t 与 , 同时在场：计数相同时 \t 胜（候选序优先）
    expect(parseTableText('a\tb,c\n1\t2,3').delimiter).toBe('\t')
    // , 计数更多 → , 胜
    expect(parseTableText('a,b,c\n1,2,3').delimiter).toBe(',')
    // 显式指定：不做嗅探，直接按指定分隔符解析
    expect(parseTableText('a,b', { delimiter: '\t' }).matrix).toEqual([['a,b']])
    expect(parseTableText('a\tb', { delimiter: ',' }).matrix).toEqual([['a\tb']])
  })

  it('⑤ 无分隔符：回落单列矩阵（每行一格），delimiter 如实报 \t', () => {
    const r = parseTableText('甲\n乙\n丙')
    expect(r.delimiter).toBe('\t')
    expect(r.matrix).toEqual([['甲'], ['乙'], ['丙']])
  })

  it('⑥ 中间完全空行：剔除并计入 skippedRows（末尾空行不算）——不静默', () => {
    const r = parseTableText('a,b\n1,2\n\n3,4\n')
    expect(r.matrix).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ])
    expect(r.skippedRows).toBe(1)
    expect(parseTableText('a,b\n1,2\n\n\n').skippedRows).toBe(0) // 末尾空行忽略不计
  })

  it('⑦ 空文本：空矩阵、零计数', () => {
    expect(parseTableText('')).toEqual({ matrix: [], delimiter: '\t', skippedRows: 0 })
    expect(parseTableText('\n\n')).toEqual({ matrix: [], delimiter: '\t', skippedRows: 0 })
  })
})

describe('table/import matrixToRecords（矩阵 → 对象数组）', () => {
  it('① header:true：首行列名 → key；值保持字符串', () => {
    const r = matrixToRecords([
      ['姓名', '年龄'],
      ['张三', '30'],
      ['李四', '25'],
    ])
    expect(r.columns).toEqual(['姓名', '年龄'])
    expect(r.records).toEqual([
      { 姓名: '张三', 年龄: '30' },
      { 姓名: '李四', 年龄: '25' },
    ])
    expect(r.skippedCells).toBe(0)
  })

  it('② 重名列加后缀：首个原名、第 N 次出现 name.2 / name.3', () => {
    const r = matrixToRecords([
      ['name', 'age', 'name'],
      ['a', '1', 'x'],
    ])
    expect(r.columns).toEqual(['name', 'age', 'name.2'])
    expect(r.records).toEqual([{ name: 'a', age: '1', 'name.2': 'x' }])
  })

  it('③ 空列名生成 c{列序号}；header:false 用 columns 或生成 c1..cN', () => {
    // 首行含空名
    const r1 = matrixToRecords([
      ['name', ''],
      ['a', 'b'],
    ])
    expect(r1.columns).toEqual(['name', 'c2'])
    // header:false + 显式 columns（不足补 cN）
    const r2 = matrixToRecords([['a', 'b', 'c']], { header: false, columns: ['x', 'y'] })
    expect(r2.columns).toEqual(['x', 'y', 'c3'])
    expect(r2.records).toEqual([{ x: 'a', y: 'b', c3: 'c' }])
    // header:false 无 columns：全 c1..cN
    const r3 = matrixToRecords(
      [
        ['a', 'b'],
        ['1', '2'],
      ],
      { header: false },
    )
    expect(r3.columns).toEqual(['c1', 'c2'])
    expect(r3.records).toEqual([
      { c1: 'a', c2: 'b' },
      { c1: '1', c2: '2' },
    ])
  })

  it('④ 行长不齐如实计数：缺列补空串、超长截断 → skippedCells（不静默）', () => {
    const r = matrixToRecords([
      ['a', 'b', 'c'],
      ['1', '2'], // 缺 1 列 → 补 ''
      ['3', '4', '5', '6'], // 超 1 列 → 截断 '6'
    ])
    expect(r.records).toEqual([
      { a: '1', b: '2', c: '' },
      { a: '3', b: '4', c: '5' },
    ])
    expect(r.skippedCells).toBe(2)
  })

  it('⑤ 列名 trim；表头行不计入 records；空矩阵 → 空结果', () => {
    const r = matrixToRecords([
      [' name ', ' age '],
      ['a', '1'],
    ])
    expect(r.columns).toEqual(['name', 'age'])
    expect(r.records).toHaveLength(1)
    expect(matrixToRecords([])).toEqual({ records: [], columns: [], skippedCells: 0 })
  })
})

describe('table/import importTableText / importTableFile（组合入口）', () => {
  it('① importTableText：parse + records 组合，统计如实透出', () => {
    const r = importTableText('姓名,年龄,城市\n张三,30,北京\n\n李四,25,上海,多余')
    expect(r.delimiter).toBe(',')
    expect(r.columns).toEqual(['姓名', '年龄', '城市'])
    expect(r.records).toEqual([
      { 姓名: '张三', 年龄: '30', 城市: '北京' },
      { 姓名: '李四', 年龄: '25', 城市: '上海' },
    ])
    expect(r.rowCount).toBe(2)
    expect(r.skippedRows).toBe(1)
    expect(r.skippedCells).toBe(1)
  })

  it('② importTableFile：File 走 file.text()（TSV 文件端到端）', async () => {
    const file = new File(['name\tage\ncarol\t31'], 'people.tsv', { type: 'text/tab-separated-values' })
    const r = await importTableFile(file)
    expect(r.columns).toEqual(['name', 'age'])
    expect(r.records).toEqual([{ name: 'carol', age: '31' }])
    expect(r.delimiter).toBe('\t')
  })

  it('③ 选项透传：header:false + 显式 delimiter', () => {
    const r = importTableText('a;b', { header: false, delimiter: ';' })
    expect(r.delimiter).toBe(';')
    expect(r.records).toEqual([{ c1: 'a', c2: 'b' }])
  })

  it('④ 纯函数零 DOM 依赖：不触碰 document/window（SSR / Node 可直接调用）', () => {
    // 本文件在 happy-dom 环境跑——仅调用即证可用；parse/matrixToRecords 不读任何全局 UI 对象，
    // 其实现不引用 document / window（源码级约束，见 index.ts）
    expect(importTableText('name,age\nann,3')).toEqual({
      records: [{ name: 'ann', age: '3' }],
      columns: ['name', 'age'],
      delimiter: ',',
      rowCount: 1,
      skippedRows: 0,
      skippedCells: 0,
    })
  })
})
