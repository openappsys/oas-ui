import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  analyzeSource,
  applyOsAssertExceptions,
  findOsAbsoluteAssertions,
  isOsAbsoluteScope,
  loadOsAssertExceptions,
  summarize,
} from './assert-audit.mjs'

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
