import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSource, summarize } from './assert-audit.mjs'

test('识别无 expect、无条件 skip、固定等待与弱断言', () => {
  const result = analyzeSource(
    `
    test('a', async () => { await page.waitForTimeout(10) })
    test('b', async () => { test.skip(true, 'demo 结构未对齐') })
    test('c', async () => { expect(n).toBeGreaterThan(0) })
    `,
    'packages/ui/qa-regression/demo.spec.ts',
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
    },
  ])
  assert.equal(summary.files, 2)
  assert.equal(summary.zeroExpectFiles, 1)
  assert.equal(summary.unconditionalSkips, 1)
  assert.equal(summary.waitForTimeout, 1)
  assert.equal(summary.weakAssertions, 1)
})
