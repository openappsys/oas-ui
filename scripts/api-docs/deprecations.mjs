#!/usr/bin/env node
/**
 * 废弃 API 台账生成/校验。
 *
 * - 台账唯一来源：docs/deprecations.json
 * - 源码对账：normalizeLegacyAlias(primary, legacy) 调用必须登记
 * - manifest 对账：alias 的 canonical 必须出现在对应 tag 的 attrs/props/events/methods
 * - 版本纪律：removeIn 只能是 null 或高于当前版本的 major
 *
 * 用法：
 *   node scripts/api-docs/deprecations.mjs          # 写 docs/deprecations.md
 *   node scripts/api-docs/deprecations.mjs --check  # 只校验，不写
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const problems = []
const ids = new Set()
for (const entry of ledger.entries) {
  if (ids.has(entry.id)) problems.push(`重复 id：${entry.id}`)
  ids.add(entry.id)
  if (entry.removeIn != null) {
    const major = Number(String(entry.removeIn).split('.')[0])
    const currentMajor = Number(String(currentVersion).split('.')[0])
    if (!Number.isFinite(major) || major <= currentMajor) {
      problems.push(`${entry.id} removeIn=${entry.removeIn} 必须是高于 ${currentVersion} 的 major`)
    }
  }
  if (entry.tag.startsWith('@')) continue
  const man = manifest[entry.tag]
  if (!man) {
    problems.push(`${entry.id} tag 不存在于 manifest：${entry.tag}`)
    continue
  }
  if (entry.state === 'removed' || !entry.canonical) continue
  const names =
    entry.surface === 'event'
      ? new Set(man.events.map((e) => e.name))
      : entry.surface === 'method'
        ? new Set((man.methods ?? []).map((m) => m.name))
        : new Set([...man.attrs.map((a) => a.name), ...man.props.map((p) => p.name)])
  if (!names.has(entry.canonical)) {
    problems.push(`${entry.id} canonical ${entry.canonical} 不在 ${entry.tag} 的 API 中`)
  }
}

// 源码 normalizeLegacyAlias 调用对账
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

for (const call of sourceCalls) {
  const tags = Object.entries(manifest)
    .filter(([, man]) => man.sourceFile === call.file)
    .map(([tag]) => tag)
  const hit = ledger.entries.some(
    (entry) =>
      tags.includes(entry.tag) &&
      entry.legacy === call.legacy &&
      entry.canonical === call.canonical &&
      entry.state !== 'removed',
  )
  if (!hit) {
    problems.push(
      `未登记别名：${call.file} :: ${call.legacy} -> ${call.canonical}（tag: ${tags.join(', ') || '未知'}）`,
    )
  }
}

const rows = ledger.entries
  .map(
    (e) =>
      `| \`${e.id}\` | \`${e.tag}\` | ${e.surface} | \`${e.legacy}\` | ${e.canonical ? `\`${e.canonical}\`` : '—'} | ${e.state} | ${e.removeIn ?? '未定'} |`,
  )
  .join('\n')
const md = `# 废弃 API 台账

> 生成物：\`pnpm deprecations:gen\`。禁止手改；改 \`docs/deprecations.json\` 后重新生成。
> 当前版本：${currentVersion}。\`removeIn\` 为空表示长期兼容或尚未排期；非空必须是高于当前版本的 major。

| ID | 组件/入口 | 面 | 旧写法 | 迁移目标 | 状态 | 移除版本 |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`

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
