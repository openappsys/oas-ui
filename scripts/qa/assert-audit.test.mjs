import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  analyzeSource,
  applyExceptions,
  applyOsAssertExceptions,
  evaluateCoreGrowth,
  findColorLiterals,
  findConsoleLogs,
  findOsAbsoluteAssertions,
  findTypeEscapes,
  isOsAbsoluteScope,
  loadExceptions,
  loadOsAssertExceptions,
  runMagicSpacingAudit,
  runTwinPredicateAudit,
  runUnusedCssClassAudit,
  stripComments,
  summarize,
} from './assert-audit.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SPEC = 'packages/ui/qa-regression/demo.spec.ts'

const rules = (source) => findOsAbsoluteAssertions(source, SPEC).map((v) => v.rule)

test('识别无 expect、无条件 skip、固定等待与弱断言', () => {
  const result = analyzeSource(
    `
    test('a', async () => { await page.waitForTimeout(10) })
    test('b', async () => { test.skip(true, 'demo 结构未对齐') })
    test('c', async () => { expect(n).toBeGreaterThan(0) })
    `,
    SPEC,
  )
  assert.equal(result.testCount, 3)
  assert.equal(result.expectCount, 1)
  assert.equal(result.zeroExpect, false)
  assert.deepEqual(result.unconditionalSkips, ['demo 结构未对齐'])
  assert.equal(result.waitForTimeout, 1)
  assert.equal(result.weakAssertions, 1)
})

test('忽略 demo-coverage 的合法条件 skip', () => {
  const result = analyzeSource(
    `test('x', () => { test.skip(true, '命令式组件不适用') })`,
    'packages/ui/demo-coverage.spec.ts',
  )
  assert.deepEqual(result.unconditionalSkips, [])
})

/* ------------------------- OS 绝对量断言：正例 ------------------------- */

test('scroll 偏移与常数比较：toBe / toBeCloseTo / 表达式常数都命中', () => {
  assert.deepEqual(
    rules(`
    expect(vp.scrollTop).toBe(696)
  `),
    ['scroll-offset-literal'],
  )
  assert.deepEqual(
    rules(`
    expect(after.scrollLeft).toBeCloseTo(31700, -1)
  `),
    ['scroll-offset-literal'],
  )
  assert.deepEqual(
    rules(`
    expect(vp.scrollTop).toBe(250 * 37)
  `),
    ['scroll-offset-literal'],
  )
})

test('scroll 差值容差写法命中，并指出基准常数', () => {
  const [violation] = findOsAbsoluteAssertions(`expect(Math.abs(after.scrollTop - 60)).toBeLessThanOrEqual(1)`, SPEC)
  assert.equal(violation.rule, 'scroll-offset-literal')
  assert.match(violation.detail, /60/)
  assert.match(violation.message, /语义不变量/)
})

test('window scrollY 与 poll 形式同样命中', () => {
  assert.deepEqual(rules(`expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(700000)`), [
    'scroll-offset-literal',
  ])
  assert.deepEqual(rules(`await expect.poll(scrollTop).toBeGreaterThanOrEqual(100)`), ['scroll-offset-literal'])
})

test('getBoundingClientRect 绝对坐标命中（内联 / 变量 / 解构）', () => {
  assert.deepEqual(rules(`expect(el.getBoundingClientRect().top).toBe(120)`), ['rect-absolute-coord'])
  assert.deepEqual(
    rules(`
      const box = el.getBoundingClientRect()
      expect(box.left).toBe(24)
    `),
    ['rect-absolute-coord'],
  )
  assert.deepEqual(
    rules(`
      const { top } = el.getBoundingClientRect()
      expect(top).toBe(48)
    `),
    ['rect-absolute-coord'],
  )
})

test('滚动差值用「滚动差值」措辞，不与绝对位置混淆', () => {
  const [violation] = findOsAbsoluteAssertions(
    `expect(after.scrollTop - before.scrollTop).toBeGreaterThanOrEqual(300)`,
    SPEC,
  )
  assert.equal(violation.rule, 'scroll-offset-literal')
  assert.match(violation.detail, /滚动差值/)
})

test('两个 rect 的相对距离常数也命中', () => {
  const [violation] = findOsAbsoluteAssertions(
    `
    const a = el.getBoundingClientRect()
    const b = dot.getBoundingClientRect()
    expect(a.y + a.height - b.y).toBeLessThanOrEqual(40)
    `,
    SPEC,
  )
  assert.equal(violation.rule, 'rect-absolute-coord')
  assert.match(violation.detail, /相对距离/)
})

test('count/Count 命名的变量与 ≥3 整数常数等值比较命中', () => {
  assert.deepEqual(rules(`expect(dropCount).toBe(8)`), ['count-literal'])
  assert.deepEqual(rules(`expect(r.dropCount).toBe(8)`), ['count-literal'])
  assert.deepEqual(rules(`expect(await headerCount()).toEqual(3)`), ['count-literal'])
  const [violation] = findOsAbsoluteAssertions(`expect(r.visCount).toBe(7)`, SPEC)
  assert.equal(violation.layoutSensitive, true, '视口相关计数应标记为高危')
})

test('.length 计数形态命中（数据驱动计数 / px 固定布局窗口数）', () => {
  assert.deepEqual(rules(`expect(rows.length).toBe(12)`), ['count-literal'])
  assert.deepEqual(rules(`expect(document.querySelectorAll('[role="row"]').length).toBe(7)`), ['count-literal'])
  assert.deepEqual(rules(`expect(Object.keys(map).length).toEqual(5)`), ['count-literal'])
})

test('.count() 显式计数 API 命中；小数/小于 3/字符串比较不命中', () => {
  assert.deepEqual(rules(`expect(dict.count()).toBe(9)`), ['count-literal'])
  assert.deepEqual(rules(`expect(rows.length).toBe(2)`), [])
  assert.deepEqual(rules(`expect(rows.length).toBe(3.5)`), [])
  assert.deepEqual(rules(`expect(rows.length).toBe('12')`), [])
})

test('命中位置的行号指向 matcher 行，且带可操作报错文案', () => {
  const [violation] = findOsAbsoluteAssertions(
    `test('x', async () => {
  await expect
    .poll(() => vp.scrollTop)
    .toBe(696)
})`,
    SPEC,
  )
  assert.equal(violation.line, 4)
  assert.match(violation.message, /demo\.spec\.ts:4/)
  assert.match(violation.message, /scroll-offset-literal/)
  assert.match(violation.message, /差值/)
})

/* ------------------------- OS 绝对量断言：负例 ------------------------- */

test('scroll 回到 0 / 小容差 / 无字面量不命中', () => {
  assert.deepEqual(rules(`expect(vp.scrollTop).toBe(0)`), [])
  assert.deepEqual(rules(`expect(vp.scrollTop).not.toBe(0)`), [])
  assert.deepEqual(rules(`expect(vp.scrollTop).toBeLessThan(5)`), [])
  assert.deepEqual(rules(`expect(vp.scrollHeight - vp.clientHeight).toBe(box.height)`), [])
  assert.deepEqual(rules(`expect(after.scrollTop).toBe(after2.scrollTop)`), [])
})

test('rect 的 width/height 与小于阈值的坐标不命中', () => {
  assert.deepEqual(rules(`expect(box.width).toBe(320)`), [])
  assert.deepEqual(rules(`expect(box.height).toBeGreaterThanOrEqual(32)`), [])
  assert.deepEqual(rules(`expect(box.top).toBe(0)`), [])
  assert.deepEqual(rules(`expect(box.left).toBeLessThan(2)`), [])
})

test('非 count 命名、字符串期望值、小常数不命中', () => {
  assert.deepEqual(rules(`expect(items).toHaveLength(5)`), [])
  assert.deepEqual(rules(`expect(r.count).toBe('5')`), [])
  assert.deepEqual(rules(`expect(r.count).toBe(2)`), [])
  assert.deepEqual(rules(`expect(total).toBe(42)`), [])
  assert.deepEqual(rules(`expect(counts).toEqual({ light: 18, dark: 18 })`), [])
})

test('注释与字符串里的绝对量不误报', () => {
  assert.deepEqual(rules(`// expect(vp.scrollTop).toBe(696)`), [])
  assert.deepEqual(rules(`expect(msg).toBe('expect(vp.scrollTop).toBe(696)')`), [])
  assert.deepEqual(rules(`/* expect(box.top).toBe(120) */`), [])
})

test('happy-dom 单测不在 OS 绝对量扫描范围', () => {
  assert.equal(isOsAbsoluteScope(SPEC), true)
  assert.equal(isOsAbsoluteScope('packages/ui/visual.spec.ts'), true)
  assert.equal(isOsAbsoluteScope('packages/docs/guide/demo.spec.ts'), true)
  assert.equal(isOsAbsoluteScope('packages/ui/src/layout/scroll-area/oas-scroll-area.test.ts'), false)
  const result = analyzeSource(`expect(vp.scrollTop).toBe(300)`, 'packages/ui/src/a/b.test.ts')
  assert.deepEqual(result.osAbsoluteAssertions, [])
})

/* --------------------------- 例外登记与汇总 --------------------------- */

test('例外必须写明 reason，缺字段直接报错', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oas-qa-audit-'))
  const file = join(dir, 'exceptions.json')
  writeFileSync(file, JSON.stringify({ exceptions: [{ file: SPEC, rule: 'count-literal', line: 1 }] }))
  assert.throws(() => loadOsAssertExceptions(file), /reason/)
})

test('登记例外后不再计数，未命中的例外报 stale', () => {
  const violations = findOsAbsoluteAssertions(`expect(dropCount).toBe(8)`, SPEC)
  const hit = applyOsAssertExceptions(
    [{ file: SPEC, violations }],
    [{ file: SPEC, rule: 'count-literal', snippet: 'expect(dropCount).toBe(8)', reason: '数据驱动，与布局无关' }],
  )
  assert.equal(hit.violations.length, 0)
  assert.equal(hit.stale.length, 0)

  const miss = applyOsAssertExceptions(
    [{ file: SPEC, violations }],
    [{ file: SPEC, rule: 'count-literal', snippet: 'expect(gone).toBe(9)', reason: '已经删掉的断言' }],
  )
  assert.equal(miss.violations.length, 1)
  assert.equal(miss.stale.length, 1)
})

test('汇总计数', () => {
  const summary = summarize([
    {
      file: 'a',
      testCount: 2,
      expectCount: 2,
      zeroExpect: false,
      unconditionalSkips: [],
      waitForTimeout: 1,
      weakAssertions: 1,
      eventLengthOnly: 0,
      osAbsoluteAssertions: [],
    },
    {
      file: 'b',
      testCount: 1,
      expectCount: 0,
      zeroExpect: true,
      unconditionalSkips: ['x'],
      waitForTimeout: 0,
      weakAssertions: 0,
      eventLengthOnly: 1,
      osAbsoluteAssertions: [{ file: 'b', line: 1, rule: 'count-literal', detail: 'x', snippet: 'x' }],
    },
  ])
  assert.equal(summary.files, 2)
  assert.equal(summary.zeroExpectFiles, 1)
  assert.equal(summary.unconditionalSkips, 1)
  assert.equal(summary.waitForTimeout, 1)
  assert.equal(summary.weakAssertions, 1)
  assert.equal(summary.osAbsoluteAssertions, 1)
})

/* ------------------------- 源码守卫：硬编码色值 ------------------------- */

const SRC = 'packages/ui/src/basic/x/oas-x.ts'

test('stripComments 抹注释但保留字符串与模板字符串内容', () => {
  const src = `// a #fff\nconst s = '#0b6cff'\n/* b #123456 */\nconst t = \`color: #18181b; /* css 注释 #ff0000 */\${x}\``
  const stripped = stripComments(src)
  assert.ok(!stripped.includes('#fff'), '行注释被抹掉')
  assert.ok(!stripped.includes('#123456'), '块注释被抹掉')
  assert.ok(stripped.includes('#0b6cff'), '单引号字符串保留')
  assert.ok(stripped.includes('#18181b'), '模板字符串内容保留')
  assert.ok(!stripped.includes('#ff0000'), '模板里的 CSS 注释被抹掉')
  assert.equal(stripped.split('\n').length, src.split('\n').length, '行数不变（行号可反查）')
})

test('硬编码色值：样式文本里的 hex / rgb() / rgba( 命中', () => {
  const hits = findColorLiterals(
    `
    const css = \`
      color: #1a1a1a;
      box-shadow: 0 1px 0 rgb(255 255 255 / 0.35);
      background: rgba(0, 0, 0, 0.12);
    \`
    `,
    SRC,
  )
  assert.equal(hits.length, 3)
  assert.deepEqual(
    hits.map((h) => h.line),
    [3, 4, 5],
  )
  assert.match(hits[0].message, /color-literal/)
  assert.match(hits[0].message, /token/)
  assert.equal(hits[0].rule, 'color-literal')
})

test('硬编码色值：3/4/6/8 位 hex 与 rgb ( 空格变体都命中', () => {
  const hits = findColorLiterals(
    `
      color: #fff;
      color: #abcd;
      color: #a1b2c3;
      color: #a1b2c3d4;
      color: rgb( 1, 2, 3 );
    `,
    SRC,
  )
  assert.equal(hits.length, 5)
})

test('硬编码色值：注释、token 定义行、currentColor/transparent 不命中', () => {
  const hits = findColorLiterals(
    `
    // 注释里的 #fff 不算
    /* 块注释里的 #0b6cff 不算 */
    --oas-color-primary: #0b6cff;
    color: currentColor;
    background: transparent;
    const doc = '注释说明：对 #18181b 底色不达标'
    `,
    SRC,
  )
  assert.equal(hits.length, 1, '字符串里的色值仍命中（style 文本载体不豁免），注释/token 定义行豁免')
  assert.equal(hits[0].line, 7)
})

test('硬编码色值：单行多条命中合并为一条违规（便于按 文件:行 登记例外）', () => {
  const [hit] = findColorLiterals('color-mix(in srgb, #43484f 50%, #b2bac5);', SRC)
  assert.equal(hit.line, 1)
  assert.match(hit.detail, /× 2/)
})

/* ------------------------- 源码守卫：类型逃逸 ------------------------- */

test('类型逃逸：六种形态全部命中并给出种类', () => {
  const hits = findTypeEscapes(
    `
    const a = x as any
    const b: any = y
    const c: any[] = []
    const d: Record<string, any> = {}
    // @ts-ignore
    const e = f()
    // @ts-expect-error 说明
    const g = h()
    const arr = ids as any[]
    `,
    SRC,
  )
  assert.equal(hits.length, 7)
  assert.deepEqual(
    hits.map((h) => h.detail),
    [
      'as any 逃逸',
      ': any 逃逸',
      'any[] 逃逸',
      'Record<string, any> 逃逸',
      '@ts-ignore 指令',
      '@ts-expect-error 指令',
      'as any[] 逃逸',
    ],
  )
  assert.match(hits[0].message, /unknown/)
})

test('类型逃逸：unknown、Record<string, unknown>、注释与字符串里的 any 不命中', () => {
  const hits = findTypeEscapes(
    `
    const a: unknown = x
    const b: Record<string, unknown> = {}
    // 注释里说 as any 不算逃逸
    const s = '字面量 : any 不算'
    function many(): anyish { return 1 }
    const t: anyValue = 1
    `,
    SRC,
  )
  assert.equal(hits.length, 0)
})

/* ------------------------- 源码守卫：console.log ------------------------- */

test('console.log 命中；console.warn/error、devWarn、注释与字符串不命中', () => {
  const hits = findConsoleLogs(
    `
    console.log('debug')
    console.warn('warn')
    console.error('err')
    devWarn('dev')
    // 注释里的 console.log( 不算
    const s = '字符串里的 console.log( 不算'
    `,
    SRC,
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0].line, 2)
  assert.match(hits[0].message, /devWarn/)
})

/* ------------------------- 核文件行数防增量 ------------------------- */

const BASELINE = 7123
const CORES = 'packages/ui/src/data/table/oas-table.ts'

/** 造一个 N 行的临时源文件（行尾换行 = 文件末尾的空 terminator，不是额外一行）。 */
function writeLines(dir, name, count, eol = '\n') {
  const file = join(dir, name)
  writeFileSync(file, Array.from({ length: count }, (_, i) => `// line ${i + 1}`).join(eol) + eol)
  return file
}

test('核文件行数：等于基线不超限（相等边界不误报）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oas-core-growth-'))
  const result = evaluateCoreGrowth({ filePath: writeLines(dir, 'core.ts', BASELINE), baselineLines: BASELINE })
  assert.deepEqual(result, { file: join(dir, 'core.ts'), current: BASELINE, limit: BASELINE, exceeded: false })
})

test('核文件行数：少于基线不超限', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oas-core-growth-'))
  const result = evaluateCoreGrowth({ filePath: writeLines(dir, 'core.ts', BASELINE - 120), baselineLines: BASELINE })
  assert.equal(result.current, BASELINE - 120)
  assert.equal(result.exceeded, false)
})

test('核文件行数：多 1 行即超限（零增量容忍）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oas-core-growth-'))
  const result = evaluateCoreGrowth({ filePath: writeLines(dir, 'core.ts', BASELINE + 1), baselineLines: BASELINE })
  assert.equal(result.current, BASELINE + 1)
  assert.equal(result.limit, BASELINE)
  assert.equal(result.exceeded, true)
})

test('核文件行数：CRLF 与 LF 口径一致，末尾无换行不丢最后一行', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oas-core-growth-'))
  const crlf = writeLines(dir, 'crlf.ts', BASELINE, '\r\n')
  const noEol = join(dir, 'no-eol.ts')
  writeFileSync(noEol, Array.from({ length: BASELINE }, (_, i) => `// line ${i + 1}`).join('\n'))
  assert.equal(evaluateCoreGrowth({ filePath: crlf, baselineLines: BASELINE }).current, BASELINE)
  assert.equal(evaluateCoreGrowth({ filePath: noEol, baselineLines: BASELINE }).current, BASELINE)
})

test('核文件缺失时报错并带路径，不静默通过', () => {
  const missing = join(mkdtempSync(join(tmpdir(), 'oas-core-growth-')), 'gone.ts')
  assert.throws(
    () => evaluateCoreGrowth({ filePath: missing, baselineLines: BASELINE }),
    (error) => {
      assert.ok(error.message.includes(missing), '报错必须带文件路径')
      return true
    },
  )
})

test('核文件行数：基线非法直接报错（缺字段/NaN 不得静默放行）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oas-core-growth-'))
  const file = writeLines(dir, 'core.ts', 10)
  for (const baselineLines of [undefined, Number.NaN, -1, 3.5, '10']) {
    assert.throws(() => evaluateCoreGrowth({ filePath: file, baselineLines }), /baselineLines/)
  }
})

test('核文件行数：真实核文件未超基线（基线 JSON 与源文件同口径）', () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const baseline = JSON.parse(readFileSync(join(repoRoot, 'scripts/qa/core-growth-baseline.json'), 'utf8'))
  const result = evaluateCoreGrowth({ filePath: CORES, baselineLines: baseline.oasTableCoreLines })
  assert.equal(
    result.exceeded,
    false,
    `核文件 ${result.current} 行 > 基线 ${result.limit}：新逻辑外置到独立模块，或人工调基线并写清理由`,
  )
  assert.equal(result.file, CORES)
})

/* ------------------------- 源码守卫：例外登记 ------------------------- */

test('色值例外必须写明 reason 且需要 line 或 snippet（整文件豁免不允许）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oas-qa-guard-'))
  const noReason = join(dir, 'no-reason.json')
  writeFileSync(noReason, JSON.stringify({ exceptions: [{ file: SRC, line: 1 }] }))
  assert.throws(() => loadExceptions(noReason), /reason/)
  const wholeFile = join(dir, 'whole-file.json')
  writeFileSync(wholeFile, JSON.stringify({ exceptions: [{ file: SRC, reason: '整文件豁免' }] }))
  assert.throws(() => loadExceptions(wholeFile), /line 或 snippet/)
})

test('色值例外按 文件:行 剔除命中，未命中的例外报 stale；snippet 匹配行号漂移安全', () => {
  const violations = findColorLiterals('color: #1a1a1a;', SRC)
  assert.equal(violations.length, 1)
  const hit = applyExceptions(violations, [{ file: SRC, line: 1, reason: '合法：测试样例' }])
  assert.equal(hit.violations.length, 0)
  assert.equal(hit.stale.length, 0)

  const drifted = applyExceptions(violations, [{ file: SRC, snippet: 'color: #1a1a1a;', reason: '合法：测试样例' }])
  assert.equal(drifted.violations.length, 0, 'snippet 匹配不受行号漂移影响')

  const miss = applyExceptions(violations, [{ file: SRC, line: 9, reason: '已经删掉的色值' }])
  assert.equal(miss.violations.length, 1)
  assert.equal(miss.stale.length, 1)
})

/* ------------------------- 未使用 CSS 类（hygiene 接线） ------------------------- */

test('未使用 CSS 类维度：真实仓库例外后零增量、无陈旧，例外与原始命中一一对应', () => {
  const result = runUnusedCssClassAudit()
  assert.equal(
    result.exceptions,
    result.raw,
    `例外数（${result.exceptions}）必须与原始命中（${result.raw}）一一对应：每条真实候选都须登记精确例外，不多不少`,
  )
  assert.deepEqual(
    result.violations,
    [],
    `存在未登记的未使用类：${result.violations.map((v) => `${v.file}:${v.className}`).join(', ')}`,
  )
  assert.deepEqual(
    result.stale.map((e) => `${e.file}:${e.class}`),
    [],
    '例外表存在已不再命中的陈旧条目，须删除',
  )
})

/* ------------------------- 魔法间距尺寸（hygiene 接线） ------------------------- */

test('魔法间距维度：真实仓库例外后零增量、无陈旧，例外与原始命中一一对应', () => {
  const result = runMagicSpacingAudit()
  assert.equal(
    result.exceptions,
    result.raw,
    `例外数（${result.exceptions}）必须与原始命中（${result.raw}）一一对应：每条真实候选都须登记精确例外，不多不少`,
  )
  assert.deepEqual(
    result.violations,
    [],
    `存在未登记的直接像素间距：${result.violations.map((v) => `${v.file}:${v.property}: ${v.value}`).join('；')}`,
  )
  assert.deepEqual(
    result.stale.map((e) => `${e.file}:${e.property}: ${e.value}`),
    [],
    '例外表存在已不再命中的陈旧条目，须删除',
  )
})

/* ------------------------- 孪生协议判定（hygiene 接线） ------------------------- */

test('孪生协议判定维度：真实仓库例外后零增量、无陈旧，例外与原始命中一一对应', () => {
  const result = runTwinPredicateAudit()
  // 例外与命中必须一一对应：raw 归零而例外仍留在表里会由 stale 断言拦下，不是空跑通过
  assert.equal(
    result.exceptions,
    result.raw,
    `例外数（${result.exceptions}）必须与原始命中（${result.raw}）一一对应：每条真实候选都须登记精确例外，不多不少`,
  )
  assert.deepEqual(
    result.violations,
    [],
    `存在未登记的孪生判定：${result.violations.map((v) => `${v.file}:${v.line} ×${v.count} ${v.predicate}`).join('；')}`,
  )
  assert.deepEqual(
    result.stale.map((e) => `${e.file} ×${e.count} ${e.predicate}`),
    [],
    '例外表存在已不再命中或副本数变化的陈旧条目，须复核删除/更新',
  )
})

test('qa:audit CLI：文本、阈值与 --json 都带 hygiene 三维度，既有维度不漂移', () => {
  const script = join(ROOT, 'scripts/qa/assert-audit.mjs')
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })

  const json = run('--json')
  assert.equal(json.status, 0, json.stderr)
  const report = JSON.parse(json.stdout)
  // 顶层字段固定为 8 个：没有额外 i18n 死键维度（死键由 i18n 包的 EXPECTED_DEAD 双向断言覆盖）
  assert.deepEqual(Object.keys(report).sort(), [
    'coreGrowth',
    'magicSpacing',
    'osAbsolute',
    'results',
    'sourceGuards',
    'summary',
    'twinPredicates',
    'unusedCssClasses',
  ])
  const hygiene = ['unusedCssClasses', 'magicSpacing', 'twinPredicates']
  for (const dimension of hygiene) {
    const section = report[dimension]
    assert.deepEqual(
      Object.keys(section).sort(),
      ['exceptions', 'raw', 'stale', 'violations'],
      `${dimension} 的 JSON 结构不得漂移`,
    )
    assert.equal(section.exceptions, section.raw, `${dimension} 的例外必须与原始命中一一对应`)
    assert.deepEqual(section.violations, [], `${dimension} 不得有未登记命中`)
    assert.deepEqual(section.stale, [], `${dimension} 不得有陈旧例外`)
  }
  // 既有维度与结构不得漂移
  assert.deepEqual(Object.keys(report.coreGrowth).sort(), ['current', 'exceeded', 'file', 'limit'])
  assert.equal(report.coreGrowth.exceeded, false)
  assert.equal(report.coreGrowth.file, 'packages/ui/src/data/table/oas-table.ts')
  assert.deepEqual(Object.keys(report.sourceGuards).sort(), ['colorLiteral', 'consoleLog', 'ruleMeta', 'typeEscape'])
  assert.deepEqual(report.sourceGuards.typeEscape.violations, [])
  assert.deepEqual(report.sourceGuards.consoleLog.violations, [])
  assert.deepEqual(Object.keys(report.summary).sort(), [
    'eventLengthOnly',
    'expects',
    'files',
    'osAbsoluteAssertions',
    'tests',
    'unconditionalSkips',
    'waitForTimeout',
    'weakAssertions',
    'zeroExpectFiles',
  ])

  const check = run('--check')
  assert.equal(check.status, 0, check.stderr)
  const lines = check.stdout.split(/\r?\n/)
  const countLine = (section, label) =>
    `  ${label}：${section.violations.length}（已剔除登记例外 ${section.raw - section.violations.length}）`
  assert.ok(
    lines.includes(countLine(report.unusedCssClasses, '未使用 CSS 类')),
    `文本统计行必须原样包含未使用 CSS 类：${check.stdout}`,
  )
  assert.ok(
    lines.includes(countLine(report.magicSpacing, '魔法间距')),
    `文本统计行必须原样包含魔法间距：${check.stdout}`,
  )
  assert.ok(
    lines.includes(countLine(report.twinPredicates, '孪生协议判定')),
    `文本统计行必须原样包含孪生协议判定：${check.stdout}`,
  )
  // 阈值行逐段核对：三个 hygiene 维度都以默认 0 出现，且既有阈值项不被挤掉
  const thresholdLine = lines.find((line) => line.startsWith('[qa:audit] 阈值（防增量，非清零）：'))
  assert.ok(thresholdLine, '阈值行必须存在')
  const thresholdSegments = thresholdLine.replace('[qa:audit] 阈值（防增量，非清零）：', '').split('；')
  for (const segment of [
    'waitForTimeout ≤ 26',
    '弱断言 ≤ 0',
    '事件只断 length ≤ 105',
    '硬编码色值 ≤ 0',
    '类型逃逸 ≤ 0',
    'console.log ≤ 0',
    '未使用 CSS 类 ≤ 0',
    '魔法间距 ≤ 0',
    '孪生协议判定 ≤ 0',
    `核文件行数 ≤ ${report.coreGrowth.limit}`,
  ]) {
    assert.ok(thresholdSegments.includes(segment), `阈值行缺少「${segment}」：${thresholdLine}`)
  }
  assert.ok(lines.includes('[qa:audit] 通过'), '--check 通过时必须有通过行')
})
