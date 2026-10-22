#!/usr/bin/env node
/**
 * 手工 Methods 页面 API 覆盖校验。
 *
 * avatar / collapse / form / image / toolbar 这 5 个多 tag 页面保留手工 Methods 表，
 * `api:gen` 为避免生成表与手工表重复而整页跳过。本脚本补上这些页的
 * attrs/props/events/slots/cssVars 名称对账，避免新的 API 漂移完全失去守卫。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANUAL_METHODS_PAGES } from './manual-pages.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const MANIFEST_DIR = join(ROOT, 'docs/api-manifest')
const PAGES = MANUAL_METHODS_PAGES

const manifest = {}
for (const tag of JSON.parse(readFileSync(join(MANIFEST_DIR, 'index.json'), 'utf8'))) {
  const file = join(MANIFEST_DIR, `${tag}.json`)
  if (existsSync(file)) manifest[tag] = JSON.parse(readFileSync(file, 'utf8'))
}

const TYPE_BY_HEADER = new Map([
  ['属性', 'attrs'],
  ['attribute', 'attrs'],
  ['attributes', 'attrs'],
  ['property', 'props'],
  ['properties', 'props'],
  ['props', 'props'],
  ['事件', 'events'],
  ['event', 'events'],
  ['events', 'events'],
  ['插槽', 'slots'],
  ['slot', 'slots'],
  ['slots', 'slots'],
  ['css 变量', 'cssVars'],
  ['css variable', 'cssVars'],
  ['css variables', 'cssVars'],
  ['方法', 'methods'],
  ['method', 'methods'],
  ['methods', 'methods'],
])

function normalizeName(raw) {
  const value = raw.trim().replace(/^`|`$/g, '').trim()
  if (value === '默认' || value === 'default') return ''
  return value
}

function parsePage(path) {
  const lines = readFileSync(join(ROOT, 'packages/docs/docs', path), 'utf8').split('\n')
  const apiIdx = lines.findIndex((line) => line.trim().startsWith('## API'))
  if (apiIdx < 0) return null
  const page = new Map()
  let tag = null
  let kind = null
  for (let i = apiIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    const tagMatch = line.match(/^### (oas-[a-z0-9-]+)\s*$/)
    if (tagMatch) {
      tag = tagMatch[1]
      if (!page.has(tag)) page.set(tag, new Map())
      kind = null
      continue
    }
    const headingMatch = line.match(/^#### (.+?)\s*$/)
    if (headingMatch) {
      kind = TYPE_BY_HEADER.get(headingMatch[1].trim().toLowerCase()) ?? null
      continue
    }
    if (!tag || !kind || !line.startsWith('|')) continue
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    if (!cells.length) continue
    const name = normalizeName(cells[0])
    if ((!name && kind !== 'slots') || name === '---' || /^[-:]+$/.test(name)) continue
    // 表头行后面紧跟分隔行；属性名恰好叫 name 时不能按词表误跳过
    if (/^\|[\s:|-]+\|/.test((lines[i + 1] ?? '').trim())) continue
    if (!page.get(tag).has(kind)) page.get(tag).set(kind, new Map())
    // 行号用于错误定位
    page
      .get(tag)
      .get(kind)
      .set(name, i + 1)
  }
  return page
}

function manifestNames(tag, kind) {
  const man = manifest[tag]
  if (!man) return null
  if (kind === 'attrs') return new Set(man.attrs.map((a) => a.name))
  if (kind === 'props') return new Set(man.props.map((p) => p.name))
  if (kind === 'events') return new Set(man.events.map((e) => e.name))
  if (kind === 'slots') return new Set(man.slots.map((s) => s.name))
  if (kind === 'cssVars') return new Set((man.cssVars ?? []).map((v) => v.name))
  if (kind === 'methods') return new Set((man.methods ?? []).map((m) => m.name))
  return null
}

const problems = []
for (const path of PAGES) {
  const page = parsePage(path)
  if (!page) {
    problems.push(`${path}: 缺少 ## API 章节`)
    continue
  }
  for (const [tag, groups] of page) {
    const man = manifest[tag]
    if (!man) {
      problems.push(`${path}: 页面 tag ${tag} 不在 manifest`)
      continue
    }
    // 整段缺失检查（props 目前有 3 个历史页面没有 Property 段，先 allowlist）
    for (const kind of ['attrs', 'events', 'slots', 'cssVars', 'methods']) {
      const expected = manifestNames(tag, kind)
      if (expected && expected.size > 0 && !groups.has(kind)) {
        problems.push(`${path}: ${tag} 缺少 ${kind} 段`)
      }
    }
    if (
      !['oas-form', 'oas-toolbar-toggle', 'oas-scope-bar'].includes(tag) &&
      manifestNames(tag, 'props')?.size > 0 &&
      !groups.has('props')
    ) {
      problems.push(`${path}: ${tag} 缺少 props 段`)
    }

    for (const [kind, names] of groups) {
      const expected = manifestNames(tag, kind)
      if (!expected) continue
      // Methods 只做「manifest 有的必须出现」子集校验：手工页可能保留扫描器未识别的公开方法。
      if (kind === 'methods') {
        for (const name of expected) {
          if (!names.has(name)) problems.push(`${path}: ${tag} ${kind} 缺 ${name}`)
        }
        continue
      }
      for (const name of expected) {
        if (!names.has(name)) problems.push(`${path}: ${tag} ${kind} 缺 ${name}`)
      }
      for (const name of names.keys()) {
        if (!expected.has(name)) problems.push(`${path}: ${tag} ${kind} 多出 ${name}`)
      }
    }
  }
}

if (problems.length) {
  console.error(`[manual-pages] ${problems.length} 个 API 漂移：`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log(`[manual-pages] ${PAGES.length} 个手工 Methods 页面 API 名称对账通过`)
