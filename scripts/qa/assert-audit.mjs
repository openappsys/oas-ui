#!/usr/bin/env node
/**
 * 测试断言质量审计（只读）。
 *
 * 目标不是把所有弱断言一次清零，而是让“新增假绿”可见：
 * - 无 expect 的测试文件；
 * - 运行时无条件 test.skip(true, ...)；
 * - 固定 waitForTimeout；
 * - 只断言存在/大于 0/truthy 的弱断言；
 * - 事件只断言 length 的模式（启发式）。
 *
 * 用法：
 *   node scripts/qa/assert-audit.mjs
 *   node scripts/qa/assert-audit.mjs --json
 *   node scripts/qa/assert-audit.mjs --check
 *   node scripts/qa/assert-audit.mjs --check --max-wait 400 --max-weak 380
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_ROOTS = ['packages/ui/qa-regression', 'packages/ui/src']
const IGNORE_SKIP_FILES = new Set(['packages/ui/demo-coverage.spec.ts'])
// 视觉截图 spec 只产出人工复核素材，不承担断言；不是“忘了写 expect”
const INTENTIONAL_ZERO_EXPECT = new Set(['packages/ui/visual.spec.ts'])

export function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (/\.(?:spec|test)\.ts$/.test(entry.name)) out.push(path)
  }
  return out
}

export function analyzeSource(source, file = '') {
  const testCount = (source.match(/\b(?:test|it)(?:\.(?!skip\b)\w+)?\s*\(/g) ?? []).length
  const expectCount = (source.match(/\bexpect\s*\(/g) ?? []).length
  const unconditionalSkips = [...source.matchAll(/test\.skip\(true\s*,\s*['"`]([^'"`]*)/g)].map((m) => m[1])
  const waitForTimeout = (source.match(/\bwaitForTimeout\s*\(/g) ?? []).length
  const weakAssertions = (source.match(/toBeGreaterThan\(0\)|toBeTruthy\(\)|not\.toBeNull\(\)/g) ?? []).length
  const eventLengthOnly = (source.match(/expect\([^\n]*\b(?:events|fired)\b[^\n]*\.length[^\n]*\)\s*\.toBe\(/g) ?? [])
    .length
  return {
    file,
    testCount,
    expectCount,
    zeroExpect: testCount > 0 && expectCount === 0 && !INTENTIONAL_ZERO_EXPECT.has(file),
    unconditionalSkips: IGNORE_SKIP_FILES.has(file) ? [] : unconditionalSkips,
    waitForTimeout,
    weakAssertions,
    eventLengthOnly,
  }
}

export function audit(roots = DEFAULT_ROOTS) {
  const files = roots.flatMap((root) => walk(join(ROOT, root)))
  // 顶层 e2e spec（visual-states/smoke/interaction 等）不在 qa-regression 下，也要纳入
  for (const name of readdirSync(join(ROOT, 'packages/ui'))) {
    if (/\.spec\.ts$/.test(name)) files.push(join(ROOT, 'packages/ui', name))
  }
  return files
    .map((file) => analyzeSource(readFileSync(file, 'utf8'), relative(ROOT, file).replaceAll('\\', '/')))
    .sort((a, b) => a.file.localeCompare(b.file))
}

export function summarize(results) {
  return results.reduce(
    (acc, item) => ({
      files: acc.files + 1,
      tests: acc.tests + item.testCount,
      expects: acc.expects + item.expectCount,
      zeroExpectFiles: acc.zeroExpectFiles + (item.zeroExpect ? 1 : 0),
      unconditionalSkips: acc.unconditionalSkips + item.unconditionalSkips.length,
      waitForTimeout: acc.waitForTimeout + item.waitForTimeout,
      weakAssertions: acc.weakAssertions + item.weakAssertions,
      eventLengthOnly: acc.eventLengthOnly + item.eventLengthOnly,
    }),
    {
      files: 0,
      tests: 0,
      expects: 0,
      zeroExpectFiles: 0,
      unconditionalSkips: 0,
      waitForTimeout: 0,
      weakAssertions: 0,
      eventLengthOnly: 0,
    },
  )
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? Number(process.argv[index + 1]) : fallback
}

function main() {
  const results = audit()
  const summary = summarize(results)
  const check = process.argv.includes('--check')
  const maxWait = argValue('--max-wait', 413)
  const maxWeak = argValue('--max-weak', 1840)

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ summary, results }, null, 2))
  } else {
    console.log(`[qa:audit] ${summary.files} 文件 / ${summary.tests} 测试 / ${summary.expects} expect`)
    console.log(
      `  无 expect 文件 ${summary.zeroExpectFiles}；无条件 skip ${summary.unconditionalSkips}；waitForTimeout ${summary.waitForTimeout}；弱断言 ${summary.weakAssertions}；事件只断 length ${summary.eventLengthOnly}`,
    )
    if (!check || process.env.QA_AUDIT_VERBOSE === '1') {
      const noisy = results.filter(
        (item) =>
          item.zeroExpect ||
          item.unconditionalSkips.length > 0 ||
          item.eventLengthOnly > 0 ||
          item.weakAssertions > 0 ||
          item.waitForTimeout > 0,
      )
      for (const item of noisy.slice(0, 20)) {
        console.log(
          `  ${item.file}: tests=${item.testCount} expect=${item.expectCount} skip=${item.unconditionalSkips.length} wait=${item.waitForTimeout} weak=${item.weakAssertions} eventLen=${item.eventLengthOnly}`,
        )
      }
      if (noisy.length > 20) console.log(`  ... 另有 ${noisy.length - 20} 个文件`)
    }
  }

  if (check) {
    const problems = []
    if (summary.zeroExpectFiles > 0) problems.push(`无 expect 文件 ${summary.zeroExpectFiles}`)
    if (summary.unconditionalSkips > 0) {
      problems.push(`无条件 test.skip(true) ${summary.unconditionalSkips}`)
    }
    if (summary.waitForTimeout > maxWait) {
      problems.push(`waitForTimeout ${summary.waitForTimeout} > ${maxWait}`)
    }
    if (summary.weakAssertions > maxWeak) {
      problems.push(`弱断言 ${summary.weakAssertions} > ${maxWeak}`)
    }
    if (problems.length) {
      console.error(`[qa:audit] 未通过：${problems.join('；')}`)
      process.exit(1)
    }
    console.log('[qa:audit] 通过')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
