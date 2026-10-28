#!/usr/bin/env node
/**
 * 把 perf-baseline.md 的数据生成块刷新为当前基线（`pnpm perf:docs`）。
 *
 * 数据真源：docs/perf-baseline.json（由 perf:size / perf:bench --update-baseline 写入）
 * + lib/render-budgets.mjs（渲染阈值）。只替换 BEGIN/END 生成块标记之间的内容，
 * 手写叙述区一律不动。一致性校验在 `perf:size` 内置（checkPerfDocs）——生成块与基线
 * 漂移会在 CI 报红，本脚本只用于显式刷新（不自动跑，防止测量噪音直接洗进文档）。
 *
 * 顺序惯例：改影响体积的代码 → `pnpm build` → `pnpm perf:size --update-baseline`
 * （+ 需要刷新渲染数据时 `pnpm perf:bench --update-baseline`）→ `pnpm perf:docs`。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib/baseline.mjs'
import { applyBlocks, buildAllBlocks } from './lib/baseline-docs.mjs'

const mdPath = join(ROOT, 'docs/perf-baseline.md')
const json = JSON.parse(readFileSync(join(ROOT, 'docs/perf-baseline.json'), 'utf8'))
const blocks = buildAllBlocks(json)
const before = readFileSync(mdPath, 'utf8')
const after = applyBlocks(before, blocks)
writeFileSync(mdPath, after)
const changed = DOC_DIFF(before, after)
console.log(`[perf:docs] 已刷新 perf-baseline.md 生成块（${changed} 处内容变化）`)

function DOC_DIFF(before, after) {
  if (before === after) return 0
  const lines = (text) => text.split('\n')
  const a = lines(before)
  const b = lines(after)
  let diff = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) diff++
  }
  return diff
}
