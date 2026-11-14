/**
 * 同源接线静态守卫（防复发）：
 *
 * ① 数据层零反向依赖：`model-core/**` 的 import specifier 白名单 = 仅同目录相对导入
 *   （`./xxx.js`）——任何组件层文件（`../oas-table*.js`）、裸包名、node 内置模块一旦出现
 *   即红灯。历史缺陷：group.ts / visible.ts 曾反向 import 组件目录的
 *   `oas-table-row-key.js`，与 architecture「数据层不反向 import 组件」口径相悖。
 * ② 组件壳层薄壳守卫：`oas-table.ts` 不得回流行模型变换实现（比较器 / 展平 / 可见集 /
 *   过滤匹配 / 行键回退缓存的函数级定义），且同源接线 import 必须在场。
 *
 * 扫描器自带正反例自测（防「守卫恒真」）：能抓合成反例、放过合法正例才有效。
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const TABLE_DIR = resolve(__dirname, '..')
const MODEL_CORE_DIR = join(TABLE_DIR, 'model-core')
const OAS_TABLE = join(TABLE_DIR, 'oas-table.ts')

/** 提取一段 TS 源码里的全部 import specifier（静态 from / 副作用 import / 动态 import()）。
 * 先剥离注释（块注释 + 行注释）：文档注释里的用法示例代码不是真 import，不得误报。 */
function importSpecifiers(raw: string): string[] {
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const out: string[] = []
  for (const m of src.matchAll(/from\s*['"]([^'"]+)['"]/g)) out.push(m[1]!)
  for (const m of src.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]!)
  for (const m of src.matchAll(/import\s*['"]([^'"]+)['"]/g)) out.push(m[1]!)
  return out
}

/** 数据层白名单：仅同目录相对导入（`./xxx.js`） */
const MODEL_CORE_SPECIFIER_OK = /^\.\/[a-z][a-z0-9-]*\.js$/

/** 壳层行模型变换实现回流的负向模式（按薄壳后的实际形态设可判定模式，避免误报） */
const SHELL_IMPLEMENTATION_PATTERNS: Array<{ re: RegExp; why: string }> = [
  // 行模型变换/比较器的函数级定义（薄壳只 import 不定义；类方法包装委托不受影响）
  {
    re: /\bfunction\s+(compareRows|codePointCompare|buildFlat|visibleFlat|matchesFilters|resolveSorts|flattenLeaves)\b/,
    why: '行模型变换函数定义回流壳层',
  },
  {
    re: /\bconst\s+(compareRows|codePointCompare|buildFlat|visibleFlat|matchesFilters|resolveSorts|flattenLeaves)\s*=/,
    why: '行模型变换函数字面量回流壳层',
  },
  // 行键回退缓存实现（已迁 model-core/row-key.ts；壳层持 DOM 元素 WeakMap 合法，此模式按
  // 「object 键」精确匹配不会误伤 WeakMap<HTMLTableCellElement, string> 之类）
  { re: /\bfallbackKeys\b/, why: '行键回退缓存实现回流壳层' },
  { re: /new\s+WeakMap<object,\s*string>/, why: '行键回退缓存实现回流壳层' },
  // 内部分页切片公式（数据层 paginate 实现；壳层 windowed 路径不切片）
  { re: /\.slice\(\s*\(\s*current\s*-\s*1\s*\)\s*\*\s*pageSize/, why: '内部分页切片公式回流壳层' },
]

/** 壳层同源接线必须存在的 import 形态（单一真相源：变换全部走 model-core） */
const SHELL_WIRING = [
  /computeDisplayRoots\s+as\s+computeDisplayRootsModel/,
  /buildFlat\s+as\s+buildFlatModel/,
  /visibleFlat\s+as\s+visibleFlatModel/,
  /from\s*['"]\.\/model-core\/index\.js['"]/,
]

describe('同源接线静态守卫（model-core 白名单 + oas-table 薄壳）', () => {
  it('① model-core/** 全部 import 仅同目录相对导入（数据层零反向依赖/零外部依赖）', () => {
    const files = readdirSync(MODEL_CORE_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    // 文件数精确断言：新文件进入 model-core 时红灯提醒维护者过一遍本守卫
    expect(files.length, '扫描面与 model-core 实际文件数一致').toBe(8)
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(join(MODEL_CORE_DIR, f), 'utf8')
      for (const spec of importSpecifiers(src)) {
        if (!MODEL_CORE_SPECIFIER_OK.test(spec)) {
          bad.push(`model-core/${f} → '${spec}'（仅允许 ./xxx.js 同目录相对导入）`)
        }
      }
    }
    expect(bad, '数据层不得 import 组件层/外部包（依赖方向：组件 → 数据层单向）').toEqual([])
  })

  it('② oas-table.ts 无行模型变换实现回流（薄壳负向模式）', () => {
    const src = readFileSync(OAS_TABLE, 'utf8')
    const bad: string[] = []
    src.split('\n').forEach((line, i) => {
      for (const p of SHELL_IMPLEMENTATION_PATTERNS) {
        if (p.re.test(line)) bad.push(`oas-table.ts:${i + 1}（${p.why}）`)
      }
    })
    expect(bad, '行模型变换实现只允许居 model-core（单一真相源）').toEqual([])
  })

  it('③ oas-table.ts 同源接线 import 在场（变换走 model-core 同一份实现）', () => {
    const src = readFileSync(OAS_TABLE, 'utf8')
    for (const w of SHELL_WIRING) {
      expect(w.test(src), `接线缺失：${w}`).toBe(true)
    }
  })

  // —— 扫描器自测（防恒真守卫）：反例必抓、正例必放 ——
  it('扫描器自测：import 白名单反例（组件层反向 / 裸包 / node 内置）全命中', () => {
    const badSpecs = ['../oas-table-row-key.js', '../../shared/slot-template.js', '@oas-ui/core/oas-element', 'node:fs']
    for (const spec of badSpecs) {
      expect(MODEL_CORE_SPECIFIER_OK.test(spec), `反例必抓：${spec}`).toBe(false)
    }
  })

  it('扫描器自测：import 白名单正例（同目录相对）放行', () => {
    for (const spec of ['./types.js', './sort.js', './row-key.js']) {
      expect(MODEL_CORE_SPECIFIER_OK.test(spec), `正例必放：${spec}`).toBe(true)
    }
  })

  it('扫描器自测：壳层负向模式合成反例命中、壳层现状合法形态不误伤', () => {
    const hits = [
      'function compareRows(a, b, sorts, tm) { return 0 }',
      'const visibleFlat = (flat, expanded) => flat',
      'const fallbackKeys = new WeakMap<object, string>()',
      'pageRows = sorted.slice((current - 1) * pageSize, start + pageSize)',
    ]
    for (const line of hits) {
      expect(
        SHELL_IMPLEMENTATION_PATTERNS.some((p) => p.re.test(line)),
        `反例必抓：${line}`,
      ).toBe(true)
    }
    // 壳层现状合法形态（不误伤）：
    const legal = [
      'this.cellDecorators.sort((a, b) => (a.decorateOrder ?? 100) - (b.decorateOrder ?? 100))',
      'const MERGE_VALUE = new WeakMap<HTMLTableCellElement, string>()',
      'private matchesFilters(row, filterValues) { return matchesFilters(row, filterValues, this._columns) }',
    ]
    for (const line of legal) {
      expect(
        SHELL_IMPLEMENTATION_PATTERNS.some((p) => p.re.test(line)),
        `合法形态不误伤：${line}`,
      ).toBe(false)
    }
  })
})
