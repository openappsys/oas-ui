#!/usr/bin/env node
/**
 * API 表生成器（manifest + 语料 → 组件文档 API 章节）
 *
 * 合并两份产物：
 *   - docs/api-manifest.json              结构元数据（attrs/events/slots/props，来自 AST 扫描）
 *   - docs/api-descriptions.{zh,en}.json  说明文案语料（来自现有手写 API 表收割 + 人工补录）
 * 重写 packages/docs/docs/components/*.md（中文）与 docs/en/components/*.md（英文）每页的
 * `## API` 章节为统一版式。此后：
 *   - 改说明文案 → 改 descriptions JSON，重跑本脚本
 *   - 改结构（属性/事件/插槽）→ 改组件源码，先重跑 scan.mjs 再重跑本脚本
 *
 * 替换策略（不丢信息）：
 *   - 把原 API 章节解析为块序列（标题/表格/段落/围栏/空行），识别"属性表/事件表/插槽表"
 *     三类块为"待替换"，其余块（方法表/字段表/部件表/组件说明表/段落/脚本等）原样保留。
 *   - 在首个待替换块位置插入统一版式的生成内容，后续待替换块丢弃；
 *     未识别任何待替换表的页面整页跳过（宁可跳过不可损毁）。
 *   - 属性/事件/插槽行 = manifest ∪ descriptions（并集，防止扫描盲区丢行）；
 *     类型/默认值取自 manifest（缺失填 —）；说明取自 descriptions（缺失填 — 并列入报告）。
 *
 * 用法：
 *   node scripts/api-docs/gen.mjs          # 实写
 *   node scripts/api-docs/gen.mjs --dry    # 只输出计划改动统计，不写文件
 *   node scripts/api-docs/gen.mjs --check  # 与现有文件比对，有漂移则非零退出并列出漂移文件
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..', '..')
const MANIFEST_PATH = join(ROOT, 'docs', 'api-manifest.json')
const DESC_ZH_PATH = join(ROOT, 'docs', 'api-descriptions.zh.json')
const DESC_EN_PATH = join(ROOT, 'docs', 'api-descriptions.en.json')
const ZH_DIR = join(ROOT, 'packages', 'docs', 'docs', 'components')
const EN_DIR = join(ROOT, 'packages', 'docs', 'docs', 'en', 'components')

const MODE = process.argv.includes('--dry')
  ? 'dry'
  : process.argv.includes('--check')
    ? 'check'
    : 'write'

// ---------- 表头词表（与 harvest.mjs 保持一致） ----------
const HEADER = {
  attr: new Set(['属性', 'attribute', 'attributes', 'prop', 'props', 'property', 'properties']),
  component: new Set(['组件', 'component', 'components']),
  event: new Set(['事件', 'event', 'events']),
  slot: new Set(['插槽', '名称', 'name', 'slot', 'slots']),
  field: new Set(['字段', 'field', 'fields']),
  method: new Set(['方法', 'method', 'methods']),
  part: new Set(['部件', 'part', 'parts']),
  desc: new Set(['说明', 'description', 'desc', 'details']),
}
// 会被生成内容取代的分组标题（### 属性 / ### Props 等，仅当其后紧跟可替换表时丢弃）
const GROUP_HEADINGS = new Set(['属性', '事件', '插槽', 'props', 'attributes', 'events', 'slots'])

const TAG_RE = /^oas-[a-z0-9-]+$/

// ---------- 基础工具 ----------
function normHeader(cell) {
  return cell
    .replace(/^`+|`+$/g, '')
    .trim()
    .toLowerCase()
}
function cleanKey(cell) {
  return cell.replace(/^`+|`+$/g, '').trim()
}
function splitRow(line) {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return body.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim())
}
function isSeparator(line) {
  return /^\|[\s\-:|]+$/.test((line ?? '').trim())
}
/** 表格单元格转义：竖线 → \| */
function esc(s) {
  return s.replace(/\|/g, '\\|')
}

/** 表格分类（与 harvest 一致）：attr（可含 merged）/ event / slot / skip */
function classifyTable(headerCells) {
  const norm = headerCells.map(normHeader)
  const first = norm[0] ?? ''
  const second = norm[1] ?? ''

  if (HEADER.event.has(first)) return { type: 'event' }
  if (HEADER.slot.has(first)) return { type: 'slot' }
  if (HEADER.attr.has(first)) return { type: 'attr', merged: false }

  if (HEADER.component.has(first)) {
    if (HEADER.attr.has(second)) return { type: 'attr', merged: true }
    return { type: 'skip', reason: '组件说明/映射表（首列组件/Component）' }
  }
  if (HEADER.field.has(first)) return { type: 'skip', reason: '字段表' }
  if (HEADER.method.has(first)) return { type: 'skip', reason: '方法表' }
  if (HEADER.part.has(first)) return { type: 'skip', reason: '部件表' }
  return { type: 'skip', reason: `表头不识别：${headerCells.join(' | ')}` }
}

// ---------- API 章节块解析 ----------
/**
 * 把 API 章节的行数组解析为块序列：
 *   { kind: 'blank' }                    空行（连续合并）
 *   { kind: 'heading', level, text }     标题
 *   { kind: 'table', headerCells, rows, cls }  表格（含分隔行，已消费数据行）
 *   { kind: 'text', lines }              其他文本行（连续合并，含代码围栏与 <script>）
 */
function parseBlocks(lines) {
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      const start = i
      while (i < lines.length && lines[i].trim() === '') i++
      blocks.push({ kind: 'blank', lines: lines.slice(start, i) })
      continue
    }

    if (/^```/.test(line.trim())) {
      const start = i
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) i++
      if (i < lines.length) i++ // 闭合围栏
      blocks.push({ kind: 'text', lines: lines.slice(start, i) })
      continue
    }

    if (/^#{1,6}\s/.test(line)) {
      const m = line.match(/^(#+)\s+(.*)$/)
      blocks.push({ kind: 'heading', level: m[1].length, text: m[2].trim(), lines: [line] })
      i++
      continue
    }

    if (line.trim().startsWith('|') && isSeparator(lines[i + 1])) {
      const start = i
      const headerCells = splitRow(line)
      i += 2 // 表头 + 分隔行
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        if (!isSeparator(lines[i])) rows.push(splitRow(lines[i]))
        i++
      }
      blocks.push({
        kind: 'table',
        headerCells,
        rows,
        cls: classifyTable(headerCells),
        lines: lines.slice(start, i),
      })
      continue
    }

    const start = i
    while (i < lines.length) {
      const l = lines[i]
      if (l.trim() === '') break
      if (/^#{1,6}\s/.test(l)) break
      if (/^```/.test(l.trim())) break
      if (l.trim().startsWith('|') && isSeparator(lines[i + 1])) break
      i++
    }
    blocks.push({ kind: 'text', lines: lines.slice(start, i) })
  }
  return blocks
}

// ---------- 页面 tag 集合 ----------
/** 收集页面需要生成的 tag（manifest 内存在者），主 tag 在前，其次按出现顺序 */
function collectPageTags(blocks, primaryTag, manifest) {
  const tags = []
  const seen = new Set()
  const add = (t) => {
    if (!t || !manifest[t] || seen.has(t)) return
    seen.add(t)
    tags.push(t)
  }
  add(primaryTag)
  for (const b of blocks) {
    if (b.kind === 'heading' && b.level === 3 && TAG_RE.test(b.text)) {
      add(b.text)
      continue
    }
    if (b.kind !== 'table') continue
    const n0 = normHeader(b.headerCells[0] ?? '')
    // 合并属性表 / 组件说明表：首列是组件 tag
    if (HEADER.component.has(n0)) {
      for (const row of b.rows) {
        const t = cleanKey(row[0] ?? '')
        if (TAG_RE.test(t)) add(t)
      }
    }
    // 非属性/事件/插槽表（如 typography 的「组件|标签|属性」映射表）：扫全部单元格
    if (b.cls.type === 'skip') {
      for (const row of b.rows) {
        for (const cell of row) {
          const t = cleanKey(cell)
          if (TAG_RE.test(t)) add(t)
        }
      }
    }
  }
  return tags
}

// ---------- 单 tag 行数据（manifest ∪ descriptions） ----------
const MANIFEST = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
const DESC_ZH = JSON.parse(readFileSync(DESC_ZH_PATH, 'utf8'))
const DESC_EN = JSON.parse(readFileSync(DESC_EN_PATH, 'utf8'))

const missingDesc = new Set() // tag:group:name —— 说明缺失清单
const blindSpots = new Set() // tag:name —— 语料有但 manifest 无（扫描盲区，需人工核对）

function tagRows(tag, lang) {
  const man = MANIFEST[tag] ?? { attrs: [], events: [], slots: [], props: [] }
  const desc = (lang === 'zh' ? DESC_ZH : DESC_EN)[tag] ?? { attrs: {}, events: {}, slots: {} }
  const missing = (group, name) => missingDesc.add(`${tag}.${group}: ${name}`)

  // attrs：manifest attrs ∪ 语料 attrs；type 优先 manifest attr，其次同名的 prop 类型
  const attrNames = new Set(man.attrs.map((a) => a.name))
  for (const k of Object.keys(desc.attrs)) {
    if (!attrNames.has(k)) blindSpots.add(`${tag}.attrs: ${k}`)
    attrNames.add(k)
  }
  const attrs = [...attrNames].sort().map((name) => {
    const a = man.attrs.find((x) => x.name === name)
    // attr(kebab) 与 prop(camel) 规范化互配：model-value ↔ modelValue
    const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const prop = man.props.find((p) => p.name === name || p.name === camel)
    const d = desc.attrs[name] ?? null
    if (d === null) missing('attrs', name)
    let def = a?.default
    if (def === undefined || def === '' || /this\.|\(|String\(/.test(def)) {
      // attr 无可靠默认值 → 回退同名 property 的字面量初始值（如 virtual-list 的
      // items 默认 `[]`）；property 也无则保持 —
      def = prop?.default ?? null
    }
    return {
      name,
      desc: d,
      type: a?.type ?? prop?.type ?? null,
      default: def,
    }
  })

  // events：manifest ∪ 语料；detail 若 manifest 有而说明没有，追加到说明末尾
  const eventNames = new Set(man.events.map((e) => e.name))
  for (const k of Object.keys(desc.events)) eventNames.add(k)
  const events = [...eventNames].sort().map((name) => {
    const ev = man.events.find((e) => e.name === name)
    let d = desc.events[name] ?? null
    if (d === null) missing('events', name)
    if (d !== null && ev?.detail) {
      const body = ev.detail.replace(/^\{/, '').replace(/\}$/, '').trim()
      if (!d.includes('detail') && !(body && d.includes(body))) {
        d = d + (lang === 'zh' ? '，' : ', ') + '`detail: ' + ev.detail + '`'
      }
    }
    return { name, desc: d }
  })

  // slots：manifest ∪ 语料；默认插槽 key 为 ''
  const slotNames = new Set(man.slots.map((s) => s.name))
  for (const k of Object.keys(desc.slots)) {
    if (!slotNames.has(k)) blindSpots.add(`${tag}.slots: ${k || '(默认)'}`)
    slotNames.add(k)
  }
  const slots = [...slotNames]
    .sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a < b ? -1 : 1))
    .map((name) => {
      const d = desc.slots[name] ?? null
      if (d === null) missing('slots', name === '' ? '(默认)' : name)
      return { name, desc: d }
    })

  return { attrs, events, slots }
}

// ---------- markdown 渲染 ----------
function mdTable(header, rows) {
  const lines = [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`]
  for (const r of rows) lines.push(`| ${r.join(' | ')} |`)
  return lines.join('\n')
}

function renderAttrTable(rows, lang) {
  const header =
    lang === 'zh'
      ? ['属性', '说明', '类型', '默认值']
      : ['Attribute', 'Description', 'Type', 'Default']
  return mdTable(
    header,
    rows.map((r) => [
      `\`${esc(r.name)}\``,
      esc(r.desc ?? '—'),
      r.type ? `\`${esc(r.type)}\`` : '—',
      r.default ? `\`${esc(r.default)}\`` : '—',
    ]),
  )
}
function renderEventTable(rows, lang) {
  const header = lang === 'zh' ? ['事件', '说明'] : ['Event', 'Description']
  return mdTable(
    header,
    rows.map((r) => [`\`${esc(r.name)}\``, esc(r.desc ?? '—')]),
  )
}
function renderSlotTable(rows, lang) {
  const header = lang === 'zh' ? ['名称', '说明'] : ['Name', 'Description']
  return mdTable(
    header,
    rows.map((r) => {
      const name = r.name === '' ? (lang === 'zh' ? '默认' : 'default') : `\`${esc(r.name)}\``
      return [name, esc(r.desc ?? '—')]
    }),
  )
}

/** 生成统一版式的 `## API` 章节内容（不含 `## API` 标题行） */
function buildGenerated(tags, lang) {
  // 多 tag 页：### oas-xxx 小节，表直接跟在标题下（无内容的 tag 跳过不渲染）
  if (tags.length > 1) {
    const parts = []
    for (const tag of tags) {
      const g = tagRows(tag, lang)
      if (!g.attrs.length && !g.events.length && !g.slots.length) continue
      const tables = []
      if (g.attrs.length) tables.push(renderAttrTable(g.attrs, lang))
      if (g.events.length) tables.push(renderEventTable(g.events, lang))
      if (g.slots.length) tables.push(renderSlotTable(g.slots, lang))
      parts.push(`### ${tag}\n\n${tables.join('\n\n')}`)
    }
    return parts.join('\n\n')
  }

  // 单 tag 页：### 属性 / ### 事件 / ### 插槽 分组
  const g = tagRows(tags[0], lang)
  if (!g.attrs.length && !g.events.length && !g.slots.length) return ''
  const heading = {
    attrs: lang === 'zh' ? '属性' : 'Attributes',
    events: lang === 'zh' ? '事件' : 'Events',
    slots: lang === 'zh' ? '插槽' : 'Slots',
  }
  const parts = []
  if (g.attrs.length) parts.push(`### ${heading.attrs}\n\n${renderAttrTable(g.attrs, lang)}`)
  if (g.events.length) parts.push(`### ${heading.events}\n\n${renderEventTable(g.events, lang)}`)
  if (g.slots.length) parts.push(`### ${heading.slots}\n\n${renderSlotTable(g.slots, lang)}`)
  return parts.join('\n\n')
}

// ---------- 单页处理 ----------
function isGroupHeading(b) {
  return b.kind === 'heading' && b.level === 3 && GROUP_HEADINGS.has(b.text.trim().toLowerCase())
}

/** 块是否被"生成内容"取代 */
function isConsumed(b, blocks, i, pageTags) {
  if (b.kind === 'table' && b.cls.type !== 'skip') return true
  if (isGroupHeading(b)) {
    // 分组标题（### 属性 等）仅当其后的非空块是待替换表时才丢弃（幂等：生成内容再次跑也不重复）
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocks[j].kind === 'blank') continue
      return blocks[j].kind === 'table' && blocks[j].cls.type !== 'skip'
    }
    return false
  }
  if (b.kind === 'heading' && b.level === 3 && TAG_RE.test(b.text) && pageTags.includes(b.text))
    return true
  return false
}

/**
 * 处理一个页面。返回：
 *   { status: 'skip', reason }  整页跳过
 *   { status: 'nochange' }      章节无需改动
 *   { status: 'changed', newLines, oldSectionLines, newSectionLines }  需要重写
 */
function processPage(file, lang) {
  const dir = lang === 'zh' ? ZH_DIR : EN_DIR
  const path = join(dir, file)
  const text = readFileSync(path, 'utf8')
  const lines = text.split('\n')
  if (lines.length && lines[lines.length - 1] === '') lines.pop() // 去掉末尾空行（join 时补回）

  const apiIdx = lines.findIndex((l) => l.trim().startsWith('## API'))
  if (apiIdx === -1) return { status: 'skip', reason: '无 ## API 章节' }

  let endIdx = lines.length
  for (let i = apiIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i]) && !lines[i].trim().startsWith('## API')) {
      endIdx = i
      break
    }
  }
  const sectionLines = lines.slice(apiIdx + 1, endIdx)

  const blocks = parseBlocks(sectionLines)
  const hasGenTables = blocks.some((b) => b.kind === 'table' && b.cls.type !== 'skip')
  if (!hasGenTables) return { status: 'skip', reason: '无可替换的属性/事件/插槽表' }

  const primaryTag = `oas-${file.replace(/\.md$/, '')}`
  const tags = collectPageTags(blocks, primaryTag, MANIFEST)
  if (tags.length === 0)
    return { status: 'skip', reason: `无法归属 tag（primary ${primaryTag} 不在 manifest）` }

  const generated = buildGenerated(tags, lang)

  // 块序列 → 输出行
  const outBlocks = []
  let inserted = false
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (isConsumed(b, blocks, i, tags)) {
      if (!inserted) {
        inserted = true
        if (generated) outBlocks.push({ kind: 'gen', lines: generated.split('\n') })
      }
      continue
    }
    outBlocks.push(b)
  }

  // 归一化：去掉首尾空行块、连续空行块只留一个
  const norm = []
  for (const b of outBlocks) {
    if (b.kind === 'blank') {
      if (norm.length && norm[norm.length - 1].kind !== 'blank') norm.push(b)
      continue
    }
    norm.push(b)
  }
  while (norm.length && norm[norm.length - 1].kind === 'blank') norm.pop()
  while (norm.length && norm[0].kind === 'blank') norm.shift()

  const sectionOut = []
  for (const b of norm) {
    const first = b.lines[0] ?? ''
    // 相邻非空块之间补一个空行分隔（空行块自带间距）
    if (sectionOut.length && sectionOut[sectionOut.length - 1] !== '' && first !== '') {
      sectionOut.push('')
    }
    sectionOut.push(...b.lines)
  }

  // 组装新文件
  const newLines = [...lines.slice(0, apiIdx + 1), '', ...sectionOut]
  if (endIdx < lines.length) newLines.push('', ...lines.slice(endIdx))
  const newText = newLines.join('\n').replace(/\n+$/, '') + '\n'

  if (newText === text) return { status: 'nochange' }
  return {
    status: 'changed',
    newText,
    oldSection: sectionLines.join('\n'),
    newSection: sectionOut.join('\n'),
  }
}

// ---------- 行级 diff（LCS，仅统计 +/-） ----------
function diffStats(oldLines, newLines) {
  const a = oldLines.split('\n')
  const b = newLines.split('\n')
  const n = a.length
  const m = b.length
  // DP 求 LCS 长度矩阵（n,m 数百级别，O(n*m) 可接受）
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  return { add: m - dp[0][0], del: n - dp[0][0] }
}

// ---------- 主流程 ----------
function main() {
  const stats = { changed: 0, skip: [], diffs: [] }
  const changedFiles = []

  for (const lang of ['zh', 'en']) {
    const dir = lang === 'zh' ? ZH_DIR : EN_DIR
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort()
    for (const file of files) {
      const res = processPage(file, lang)
      const rel = `${lang === 'zh' ? 'components' : 'en/components'}/${file}`
      if (res.status === 'changed') {
        stats.changed++
        const diff = diffStats(res.oldSection, res.newSection)
        stats.diffs.push({ file: rel, ...diff })
        changedFiles.push({ lang, file, text: res.newText })
      } else if (res.status === 'skip') {
        stats.skip.push(`${rel}（${res.reason}）`)
      }
      // nochange 不记录
    }
  }

  const missingList = [...missingDesc].sort()
  const blindList = [...blindSpots].sort()

  // ---------- 输出报告 ----------
  const line = '─'.repeat(72)
  if (MODE === 'dry') {
    console.log(
      `[api:gen --dry] 计划改动 ${stats.changed} 页，跳过 ${stats.skip.length} 页（不写文件）`,
    )
  } else if (MODE === 'check') {
    console.log(`[api:gen --check] 生成内容与现有文件比对：${stats.changed} 页有漂移`)
  } else {
    console.log(`[api:gen] 已改写 ${stats.changed} 页，跳过 ${stats.skip.length} 页`)
  }

  console.log(line)
  console.log('--- 每页 diff（新增/删除） ---')
  for (const d of stats.diffs) {
    console.log(`  +${String(d.add).padStart(4)} -${String(d.del).padStart(4)}  ${d.file}`)
  }
  if (!stats.diffs.length) console.log('  （无）')

  console.log(line)
  console.log(`--- 说明缺失清单（${missingList.length} 条，渲染为 —） ---`)
  if (missingList.length) {
    for (const m of missingList) console.log(`  - ${m}`)
  } else {
    console.log('  （无）')
  }

  if (blindList.length) {
    console.log(line)
    console.log(
      `--- 语料行但 manifest 缺失（${blindList.length} 条，扫描盲区，行已保留需人工核对） ---`,
    )
    for (const b of blindList) console.log(`  - ${b}`)
  }

  console.log(line)
  console.log(`--- 整页跳过清单（${stats.skip.length} 页） ---`)
  if (stats.skip.length) {
    for (const s of stats.skip) console.log(`  - ${s}`)
  } else {
    console.log('  （无）')
  }

  // ---------- 实写 / check 退出 ----------
  if (MODE === 'write') {
    for (const c of changedFiles) {
      const path = join(c.lang === 'zh' ? ZH_DIR : EN_DIR, c.file)
      writeFileSync(path, c.text, 'utf8')
    }
    console.log(
      `=> 已写入 ${stats.changed} 个文件（${relative(ROOT, ZH_DIR)} / ${relative(ROOT, EN_DIR)}）`,
    )
  } else if (MODE === 'check') {
    if (stats.changed > 0) {
      console.error(
        `\n[api:gen --check] 检测到 ${stats.changed} 个文件与生成内容不一致（上方 diff 列表），请重跑 gen.mjs 或修正语料`,
      )
      process.exit(1)
    } else {
      console.log('[api:gen --check] 全部文件与生成内容一致 ✅')
    }
  }
}

// ---------- 入口 ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}

export { processPage, diffStats }
