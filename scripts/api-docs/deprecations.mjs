#!/usr/bin/env node
/**
 * 废弃 API 台账生成/校验。
 *
 * - 台账唯一来源：docs/deprecations.json
 * - 源码对账：normalizeLegacyAlias(primary, legacy) 调用必须登记
 * - manifest 对账：alias 的 canonical 必须出现在对应 tag 的 attrs/props/events/methods
 * - 版本纪律：removeIn 只能是 null 或高于当前版本的 major；唯一豁免是 `package-export`
 *   面经用户批准的单点例外（`minorException`，见 deprecations-core.mjs 与台账
 *   DEP-EXPORT-0001）——组件 API 面的 minor/patch 移除一律拒绝。
 *
 * 用法：
 *   node scripts/api-docs/deprecations.mjs          # 写 docs/deprecations.md
 *   node scripts/api-docs/deprecations.mjs --check  # 只校验，不写
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectProblems, isApprovedMinorException } from './deprecations-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const LEDGER = join(ROOT, 'docs/deprecations.json')
const OUT = join(ROOT, 'docs/deprecations.md')
const MANIFEST_DIR = join(ROOT, 'docs/api-manifest')
const CHECK = process.argv.includes('--check')

const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'))
const currentVersion = JSON.parse(readFileSync(join(ROOT, 'packages/ui/package.json'), 'utf8')).version
const manifest = {}
for (const tag of JSON.parse(readFileSync(join(MANIFEST_DIR, 'index.json'), 'utf8'))) {
  const file = join(MANIFEST_DIR, `${tag}.json`)
  if (existsSync(file)) manifest[tag] = JSON.parse(readFileSync(file, 'utf8'))
}

// 源码 normalizeLegacyAlias 调用扫描
const sourceCalls = []
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) {
      const src = readFileSync(path, 'utf8')
      for (const match of src.matchAll(/normalizeLegacyAlias\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g)) {
        sourceCalls.push({
          file: relative(ROOT, path).replaceAll('\\', '/'),
          canonical: match[1],
          legacy: match[2],
        })
      }
    }
  }
}
walk(join(ROOT, 'packages/ui/src'))

const problems = collectProblems({ entries: ledger.entries, currentVersion, manifest, sourceCalls })

const rows = ledger.entries
  .map(
    (e) =>
      `| \`${e.id}\` | \`${e.tag}\` | ${e.surface} | \`${e.legacy}\` | ${e.canonical ? `\`${e.canonical}\`` : '—'} | ${e.state} | ${e.removeIn ?? '未定'} |`,
  )
  .join('\n')
const exceptionNotes = ledger.entries
  .filter(isApprovedMinorException)
  .map(
    (e) =>
      `- \`${e.id}\`（${e.legacy}，removeIn ${e.removeIn}）：${e.minorException.reason}（批准：${e.minorException.approvedBy ?? '未记录'}）`,
  )
  .join('\n')
const md = `# 废弃 API 台账

> 生成物：\`pnpm deprecations:gen\`。禁止手改；改 \`docs/deprecations.json\` 后重新生成。
> 当前版本：${currentVersion}。\`removeIn\` 为空表示长期兼容或尚未排期；非空必须是高于当前版本的 major。
> 唯一例外：\`package-export\` 面可经用户批准携带 \`minorException\`（必填理由）在非 major 版本移除——单点豁免，不构成先例；组件 API 面（attribute/prop/event/method/css-var/export）不适用，checker 一律拒绝。

| ID | 组件/入口 | 面 | 旧写法 | 迁移目标 | 状态 | 移除版本 |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
${exceptionNotes ? `\n**经批准的 minor 移除例外**（单点豁免）：\n\n${exceptionNotes}\n` : ''}`

if (problems.length) {
  console.error(`[deprecations] ${problems.length} 个问题：`)
  for (const problem of problems) console.error(`  - ${problem}`)
  if (CHECK) process.exit(1)
}

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== md) {
    console.error('[deprecations] docs/deprecations.md 与台账不一致，请运行 pnpm deprecations:gen')
    process.exit(1)
  }
  console.log(`[deprecations] ${ledger.entries.length} 条台账 ✅`)
} else {
  writeFileSync(OUT, md)
  console.log(`[deprecations] 写入 ${ledger.entries.length} 条 -> docs/deprecations.md`)
}
