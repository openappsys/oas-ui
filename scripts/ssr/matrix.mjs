#!/usr/bin/env node
/**
 * 生成/校验 SSR 覆盖矩阵。
 *
 * 数据源（全部从源码/清单重新枚举，不依赖 dist）：
 * - docs/api-manifest/<tag>.json：组件 tag、class、源文件
 * - packages/ssr/src/index.ts：WHITELIST、TAG_ENTRY
 * - packages/ssr/src/not-ssr.ts：NOT_SSR 结构化原因
 * - packages/ssr/ssr-dsd.spec.ts：DSD e2e fixture 是否出现
 * - packages/docs/docs/{,en/}components/*.md：文档页是否存在
 *
 * 用法：
 *   node scripts/ssr/matrix.mjs            # 写 docs/ssr-matrix.{json,md}
 *   node scripts/ssr/matrix.mjs --check    # 只校验，不写；有漂移 exit 1
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NOT_SSR } from '../../packages/ssr/src/not-ssr.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const MANIFEST_DIR = join(ROOT, 'docs/api-manifest')
const SSR_INDEX = join(ROOT, 'packages/ssr/src/index.ts')
const DSD_SPEC = join(ROOT, 'packages/ssr/ssr-dsd.spec.ts')
const DOCS_ZH = join(ROOT, 'packages/docs/docs/components')
const DOCS_EN = join(ROOT, 'packages/docs/docs/en/components')
const OUT_JSON = join(ROOT, 'docs/ssr-matrix.json')
const OUT_MD = join(ROOT, 'docs/ssr-matrix.md')
const CHECK = process.argv.includes('--check')

const read = (path) => readFileSync(path, 'utf8')
const exists = (path) => existsSync(path)

function parseWhitelist() {
  const src = read(SSR_INDEX)
  const block = src.match(/export const WHITELIST = \[([\s\S]*?)\] as const/)
  if (!block) throw new Error('无法解析 WHITELIST')
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

function parseTagEntry() {
  const src = read(SSR_INDEX)
  const block = src.match(/const TAG_ENTRY: Record<WhiteListTag, string> = \{([\s\S]*?)\n\}/)
  if (!block) throw new Error('无法解析 TAG_ENTRY')
  return Object.fromEntries([...block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]))
}

function manifestTags() {
  return JSON.parse(read(join(MANIFEST_DIR, 'index.json')))
}

function familyOf(sourceFile) {
  const parts = sourceFile.split('/')
  const i = parts.indexOf('src')
  return i >= 0 ? parts[i + 1] : 'unknown'
}

function dirOf(sourceFile) {
  const parts = sourceFile.split('/')
  const i = parts.indexOf('src')
  return i >= 0 ? parts.slice(i + 1, -1).join('/') : ''
}

function definesInDir(sourceFile, tag) {
  const dir = join(ROOT, dirname(sourceFile))
  const candidates = [join(dir, 'index.ts'), join(ROOT, sourceFile)]
  return candidates.some((file) => {
    if (!exists(file)) return false
    const src = read(file)
    // 普通组件：customElements.define('oas-x', ...)
    // 多 tag 目录（如 layout）：tag 在数组里，随后循环 define(tag, ...)
    return src.includes(`define('${tag}'`) || (src.includes(`'${tag}'`) && src.includes('customElements.define'))
  })
}

function buildMatrix() {
  const whitelist = parseWhitelist()
  const tagEntry = parseTagEntry()
  const tags = manifestTags()
  const wl = new Set(whitelist)
  const ns = new Map(NOT_SSR.map((entry) => [entry.tag, entry]))
  const dsd = read(DSD_SPEC)

  const problems = []
  const dup = (list, label) => {
    const seen = new Set()
    for (const item of list) {
      if (seen.has(item)) problems.push(`${label} 重复：${item}`)
      seen.add(item)
    }
  }
  dup(whitelist, 'WHITELIST')
  dup(
    NOT_SSR.map((entry) => entry.tag),
    'NOT_SSR',
  )
  for (const tag of wl) {
    if (ns.has(tag)) problems.push(`WHITELIST 与 NOT_SSR 重叠：${tag}`)
    if (!tags.includes(tag)) problems.push(`WHITELIST 有未知 tag：${tag}`)
    if (!(tag in tagEntry)) problems.push(`TAG_ENTRY 缺少：${tag}`)
  }
  for (const tag of ns.keys()) {
    if (!tags.includes(tag)) problems.push(`NOT_SSR 有未知 tag：${tag}`)
  }
  for (const tag of tags) {
    if (!wl.has(tag) && !ns.has(tag)) problems.push(`组件未决策 SSR：${tag}`)
  }
  for (const tag of Object.keys(tagEntry)) {
    if (!wl.has(tag)) problems.push(`TAG_ENTRY 有非白名单 key：${tag}`)
  }

  const components = tags.map((tag) => {
    const manifest = JSON.parse(read(join(MANIFEST_DIR, `${tag}.json`)))
    const sourceFile = manifest.sourceFile
    const page = tag.replace(/^oas-/, '')
    const ssr = wl.has(tag) ? 'whitelist' : 'no-ssr'
    const entry = ns.get(tag)
    const source = exists(join(ROOT, sourceFile)) ? read(join(ROOT, sourceFile)) : ''
    const row = {
      tag,
      family: familyOf(sourceFile),
      dir: dirOf(sourceFile),
      className: manifest.className,
      ssr,
      reason: entry?.reason ?? null,
      parent: entry?.parent ?? null,
      note: entry?.note ?? null,
      entry: ssr === 'whitelist' ? tagEntry[tag] : null,
      hasTemplate: /\btemplate\s*\(/.test(source),
      hasHydrate: /\bhydrate\s*\(/.test(source),
      unitTest: exists(join(ROOT, sourceFile.replace(/\.ts$/, '.test.ts'))),
      dsdFixture: ssr === 'whitelist' ? dsd.includes(tag) : false,
      docsZh: exists(join(DOCS_ZH, `${page}.md`)),
      docsEn: exists(join(DOCS_EN, `${page}.md`)),
    }
    if (ssr === 'whitelist' && !definesInDir(sourceFile, tag)) {
      problems.push(`WHITELIST tag 未在源目录 define：${tag}`)
    }
    if (ssr === 'whitelist' && !row.dsdFixture) {
      problems.push(`WHITELIST tag 未出现在 DSD e2e fixture：${tag}`)
    }
    return row
  })

  return {
    schema: 1,
    totals: {
      components: components.length,
      whitelist: whitelist.length,
      noSsr: NOT_SSR.length,
    },
    components,
    problems,
  }
}

function renderMarkdown(matrix) {
  const lines = [
    '# SSR 覆盖矩阵',
    '',
    '> 生成物：`pnpm ssr:matrix`。禁止手改；改数据源后重新生成。',
    '',
    `- 组件：${matrix.totals.components}`,
    `- SSR 白名单：${matrix.totals.whitelist}`,
    `- 有意不 SSR：${matrix.totals.noSsr}`,
    '',
    '| tag | 族 | 源目录 | SSR | 原因 | 父件 | entry | template | hydrate | 单测 | DSD e2e | 文档 zh/en |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const row of matrix.components) {
    const mark = (value) => (value ? '✅' : '—')
    lines.push(
      `| \`${row.tag}\` | ${row.family} | \`${row.dir}\` | ${row.ssr === 'whitelist' ? '✅ 白名单' : '⛔ 不 SSR'} | ${row.reason ?? '—'} | ${row.parent ?? '—'} | ${row.entry ? `\`${row.entry}\`` : '—'} | ${mark(row.hasTemplate)} | ${mark(row.hasHydrate)} | ${mark(row.unitTest)} | ${mark(row.dsdFixture)} | ${mark(row.docsZh)}/${mark(row.docsEn)} |`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

function checkDocs(whitelist) {
  const problems = []
  const checks = [
    { file: 'docs/ssr.md', count: /共\s*(\d+)\s*tag/ },
    { file: 'packages/docs/docs/guide/ssr.md', count: /共\s*(\d+)\s*tag/ },
    { file: 'packages/docs/docs/en/guide/ssr.md', count: /(\d+)\s*tags in total/ },
  ]
  for (const { file, count } of checks) {
    const src = read(join(ROOT, file))
    const m = src.match(count)
    if (!m) {
      problems.push(`${file} 缺少白名单数量声明`)
    } else if (Number(m[1]) !== whitelist.length) {
      problems.push(`${file} 白名单数量 ${m[1]} != ${whitelist.length}`)
    }
    for (const tag of whitelist) {
      if (!src.includes(tag)) problems.push(`${file} 缺少白名单 tag：${tag}`)
    }
  }
  const roadmap = read(join(ROOT, 'docs/ROADMAP.md'))
  const roadmapCount = roadmap.match(/当前\s*(\d+)/)
  if (roadmapCount && Number(roadmapCount[1]) !== whitelist.length) {
    problems.push(`docs/ROADMAP.md 白名单数量 ${roadmapCount[1]} != ${whitelist.length}`)
  }
  return problems
}

const matrix = buildMatrix()
const whitelist = parseWhitelist()
const docsProblems = checkDocs(whitelist)
const problems = [...matrix.problems, ...docsProblems]
const json = `${JSON.stringify(matrix, null, 2)}\n`
const markdown = renderMarkdown(matrix)

if (CHECK) {
  const currentJson = exists(OUT_JSON) ? read(OUT_JSON) : ''
  const currentMd = exists(OUT_MD) ? read(OUT_MD) : ''
  if (currentJson !== json) problems.push('docs/ssr-matrix.json 与源码不一致，请运行 pnpm ssr:matrix')
  if (currentMd !== markdown) problems.push('docs/ssr-matrix.md 与源码不一致，请运行 pnpm ssr:matrix')
  if (problems.length) {
    console.error(`[ssr:check] ${problems.length} 个问题：`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
  console.log(
    `[ssr:check] ${matrix.totals.components} 组件 = ${matrix.totals.whitelist} 白名单 + ${matrix.totals.noSsr} 不 SSR ✅`,
  )
} else {
  writeFileSync(OUT_JSON, json)
  writeFileSync(OUT_MD, markdown)
  console.log(
    `[ssr:matrix] 写入 ${matrix.totals.components} 行：${matrix.totals.whitelist} 白名单 + ${matrix.totals.noSsr} 不 SSR`,
  )
  if (problems.length) {
    console.warn(`[ssr:matrix] 发现 ${problems.length} 个问题（生成物已写入，修数据源后重跑）：`)
    for (const problem of problems) console.warn(`  - ${problem}`)
    process.exitCode = 1
  }
}
