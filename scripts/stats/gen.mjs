#!/usr/bin/env node
/**
 * 官网首页统计数字生成（spec §5）。数据源全部为 git 内文件/目录，不依赖构建产物：
 *   - components：packages/ui/src/<group>/<component> 组件目录数（口径：组目录下含 index.ts 的直接子目录）
 *   - cdnGzipKB：docs/perf-baseline.json 的 size.packages['@oas-ui/ui'].cdn.gzipBytes（perf:size 产出）
 *   - locales：packages/i18n/src 下语言包文件（zh-CN.ts / en.ts 等，排除 index/types/registry*）
 *   - tests：packages/ 下全部 *.spec.ts（e2e）与 *.test.ts（单测，排除 node_modules/dist）中 it(/test( 声明计数（近似口径）
 *   - version：packages/ui/package.json 的 version
 * 产物：packages/docs/docs/.vitepress/generated/stats.json（进 git）。
 * 刻意不含时间戳：stats:check 用 git diff --exit-code 防漂移，时间戳会造成永假失败。
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = join(ROOT, 'packages/docs/docs/.vitepress/generated/stats.json')

// 1) 组件目录数
const UI_SRC = join(ROOT, 'packages/ui/src')
let components = 0
for (const group of readdirSync(UI_SRC, { withFileTypes: true })) {
  if (!group.isDirectory()) continue
  const groupDir = join(UI_SRC, group.name)
  for (const c of readdirSync(groupDir, { withFileTypes: true })) {
    if (c.isDirectory() && existsSync(join(groupDir, c.name, 'index.ts'))) components++
  }
}

// 2) CDN 单文件 gzip（读 perf 基线，保证 CI diff 稳定）
const baseline = JSON.parse(readFileSync(join(ROOT, 'docs/perf-baseline.json'), 'utf8'))
const cdnGzipBytes = baseline.size.packages['@oas-ui/ui'].cdn.gzipBytes
const cdnGzipKB = Math.round(cdnGzipBytes / 102.4) / 10 // 一位小数

// 3) 语言包数（文件名形如 zh-CN.ts / en.ts；排除 index/types/registry*）
const I18N_SRC = join(ROOT, 'packages/i18n/src')
const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?\.ts$/
const locales = readdirSync(I18N_SRC).filter((f) => LOCALE_RE.test(f)).length

// 4) 测试用例数（单测 *.test.ts + e2e *.spec.ts；it(/test( 行首声明，it.each 等模板写法不计，近似口径可接受）
function collectSpecs(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) collectSpecs(full, out)
    else if (e.name.endsWith('.spec.ts') || e.name.endsWith('.test.ts')) out.push(full)
  }
  return out
}
const specFiles = collectSpecs(join(ROOT, 'packages'), [])
const CASE_RE = /^\s*(it|test)\(/gm
let tests = 0
for (const f of specFiles) {
  const m = readFileSync(f, 'utf8').match(CASE_RE)
  if (m) tests += m.length
}

// 5) 版本
const version = JSON.parse(readFileSync(join(ROOT, 'packages/ui/package.json'), 'utf8')).version

const stats = { components, cdnGzipKB, locales, tests, version }
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(stats, null, 2)}\n`)
console.log(`[stats] ${JSON.stringify(stats)}\n[stats] 已写入 ${OUT}`)
