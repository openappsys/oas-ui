#!/usr/bin/env node
/**
 * API 表说明文案收割器
 *
 * 把 docs/components（中文）与 docs/en/components（英文）两份 markdown 的 API 表
 * 中的"说明"文案收割为结构化语料（按 tag 名 keyed 的 attrs / events / slots 三组），
 * 输出到 docs/api-descriptions.{zh,en}.json。后续生成器将本语料与另一路扫描器产物
 * docs/api-manifest.json（结构元数据）合并渲染回 md。
 *
 * 仅使用 Node 内置模块，无第三方依赖：node scripts/api-docs/harvest.mjs
 *
 * 已识别的表头变体（中英混存均处理）：
 *   - 属性表：| 属性 | 说明 | 类型? | 默认值? |，以及 | 组件 | 属性 | 说明 | ... | 合并表
 *   - 事件表：| 事件 | 说明 |（三列变体：steps 式 | 事件 | 说明 | detail |、sidebar 式 | 事件 | detail | 触发时机 |）
 *   - 插槽表：| 插槽 | 说明 |、| 名称 | 说明 |、| Slot | Description |、| Name | Description |（含中英混用）
 *   - 默认插槽用空字符串 key（默认插槽 / 默认 / Default / default；含 `oas-xxx` 默认插槽 的 tag 前缀写法）
 *   - 非语料表（方法 / 字段 / 部件 / 组件说明 / 组件-标签-属性映射）跳过并记入报告，不硬猜
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..', '..')
const ZH_DIR = join(ROOT, 'packages', 'docs', 'docs', 'components')
const EN_DIR = join(ROOT, 'packages', 'docs', 'docs', 'en', 'components')
const OUT_ZH = join(ROOT, 'docs', 'api-descriptions.zh.json')
const OUT_EN = join(ROOT, 'docs', 'api-descriptions.en.json')

// ---------- 表头词表（中英文归一化后的小写形式） ----------
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

const CJK_RE = /[\u4e00-\u9fff]/
const TAG_RE = /^`?(oas-[a-z0-9-]+)`?$/

// ---------- 基础解析工具 ----------

/** 归一化表头单元格：去反引号、小写、去空白 */
function normHeader(cell) {
  return cell
    .replace(/^`+|`+$/g, '')
    .trim()
    .toLowerCase()
}

/** 属性/事件/插槽名 key：去反引号与首尾空白 */
function cleanKey(cell) {
  return cell.replace(/^`+|`+$/g, '').trim()
}

/** 拆一个表格行；保留 \| 转义并按 | 还原 */
function splitRow(line) {
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return body.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim())
}

/** 分隔行判定：| --- | --- | */
function isSeparator(line) {
  return /^\|[\s\-:|]+$/.test(line.trim())
}

/**
 * detail 列内容 → `detail: { shape }` 描述片段。
 * 单元格形如 `{ index }`（0 起）/ `{ collapsed: boolean }`：
 * 把内层代码片段提取出来包进 `detail: ...`，后缀（如（0 起））原样保留。
 */
function detailPart(cell) {
  const c = cell.trim()
  const m = c.match(/^`([^`]*)`(.*)$/s)
  if (m) return `\`detail: ${m[1]}\`${m[2]}`
  return `\`detail: ${c}\``
}

// ---------- 表格分类 ----------

/**
 * 依据表头列判定表格类型：
 *   - { type: 'attr', merged: boolean }      属性表（merged 表示带"组件"列）
 *   - { type: 'event' }                      事件表
 *   - { type: 'slot' }                       插槽表
 *   - { type: 'skip', reason }               跳过（方法/字段/部件/组件说明/未知表头）
 */
function classify(headerCells, lang) {
  const norm = headerCells.map(normHeader)
  const first = norm[0] ?? ''
  const second = norm[1] ?? ''

  if (HEADER.event.has(first)) return { type: 'event' }
  if (HEADER.slot.has(first)) return { type: 'slot' }
  if (HEADER.attr.has(first)) return { type: 'attr', merged: false }

  if (HEADER.component.has(first)) {
    if (HEADER.attr.has(second)) return { type: 'attr', merged: true }
    if (headerCells.length === 2 && HEADER.desc.has(second)) {
      return { type: 'skip', reason: '组件说明表（| 组件 | 说明 |，无属性列）' }
    }
    return { type: 'skip', reason: `表头不识别（首列组件/Component，第二列「${headerCells[1]}」）` }
  }

  if (HEADER.field.has(first))
    return { type: 'skip', reason: '字段表（| 字段 | 说明 | ... |，非组件属性）' }
  if (HEADER.method.has(first))
    return { type: 'skip', reason: '方法表（| 方法 | 说明 |，语料不含方法）' }
  if (HEADER.part.has(first))
    return { type: 'skip', reason: '部件表（| 部件 | 说明 |，语料不含部件）' }

  return { type: 'skip', reason: `表头不识别：${headerCells.join(' | ')}` }
}

/** 组装事件说明：说明列 + detail 列 + 其余列（如 触发时机） */
function assembleEventDesc(headerCells, cells, lang) {
  const sepJoin = lang === 'zh' ? '；' : '; '
  const labelSep = lang === 'zh' ? '：' : ': '
  const parts = []
  for (let i = 1; i < headerCells.length; i++) {
    const cell = (cells[i] ?? '').trim()
    if (!cell) continue
    const h = normHeader(headerCells[i])
    if (HEADER.desc.has(h)) {
      parts.push(cell)
    } else if (h === 'detail') {
      parts.push(detailPart(cell))
    } else {
      parts.push(`${headerCells[i].trim()}${labelSep}${cell}`)
    }
  }
  return parts.join(sepJoin)
}

// ---------- 单文件解析 ----------

/**
 * 解析一个 md 文件的 ## API 段。
 * 返回 { tags, tableStats, skipped }
 *   tags: { [tag]: { attrs:{}, events:{}, slots:{} } }
 *   skipped: { tables: [...], rows: [...], noApi: boolean }
 */
function parseFile(file, lang) {
  const text = readFileSync(join(lang === 'zh' ? ZH_DIR : EN_DIR, file), 'utf8')
  const lines = text.split(/\r?\n/)
  const tags = {}
  const skipped = { tables: [], rows: [] }

  const primaryTag = `oas-${file.replace(/\.md$/, '')}`
  const primaryTagValid = text.includes(primaryTag)

  const apiIdx = lines.findIndex((l) => l.trim().startsWith('## API'))
  if (apiIdx === -1) {
    return { tags, skipped, noApi: true }
  }

  // 截取 API 段（到下一个非 API 的 ## 标题为止）
  const section = []
  for (let i = apiIdx + 1; i < lines.length; i++) {
    const l = lines[i]
    if (/^##\s+/.test(l) && !l.trim().startsWith('## API')) break
    section.push(l)
  }

  const ensureTag = (tag) => {
    if (!tags[tag]) tags[tag] = { attrs: {}, events: {}, slots: {} }
    return tags[tag]
  }

  let currentTag = primaryTag
  if (!primaryTagValid) {
    currentTag = null // 文件名派生的主 tag 未在文件出现（如 typography/命令式 API 页），需明确归属否则跳过
  }

  let inFence = false

  for (let i = 0; i < section.length; i++) {
    const line = section[i]

    // 代码围栏内跳过
    if (/^```/.test(line.trim())) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    // ### oas-* 小节：切换当前 tag 上下文（如 avatar.md 的 ### oas-avatar-group）
    if (line.startsWith('### ')) {
      const heading = line.slice(4).trim()
      const m = heading.match(TAG_RE)
      if (m) {
        currentTag = m[1]
        ensureTag(currentTag)
      }
      continue
    }

    // 找表头（下一行是分隔行）
    const headerLine = line.trim()
    if (!headerLine.startsWith('|')) continue
    if (!isSeparator(section[i + 1] ?? '')) continue

    const headerCells = splitRow(headerLine)
    if (headerCells.length === 0) continue

    // 收集数据行
    const rows = []
    for (let j = i + 2; j < section.length; j++) {
      const rl = section[j].trim()
      if (!rl.startsWith('|')) break
      if (isSeparator(rl)) continue
      rows.push(splitRow(rl))
    }
    i += 1 + rows.length // 跳过已消费的行（header + separator + data rows）

    const cls = classify(headerCells, lang)

    if (cls.type === 'skip') {
      skipped.tables.push({ file, header: headerCells.join(' | '), reason: cls.reason })
      continue
    }

    if (cls.type === 'attr') {
      if (currentTag === null) {
        skipped.tables.push({
          file,
          header: headerCells.join(' | '),
          reason: `属性表但主 tag ${primaryTag} 未在文件中出现，无法归属`,
        })
        continue
      }
      const descIdx = headerCells.findIndex((h) => HEADER.desc.has(normHeader(h)))
      if (descIdx === -1) {
        skipped.tables.push({ file, header: headerCells.join(' | '), reason: '属性表缺少说明列' })
        continue
      }
      const nameIdx = cls.merged ? 1 : 0
      for (const row of rows) {
        const rawName = row[nameIdx] ?? ''
        const name = cleanKey(rawName)

        // 无属性占位行（`无` / `无属性` / `none` / `No attributes`）：不描述任何真实属性
        if (!name) {
          skipped.rows.push({
            file,
            header: headerCells.join(' | '),
            rowName: row.join(' | '),
            reason: '属性名缺失',
          })
          continue
        }
        if (/^(无|无属性|none|no attributes)$/i.test(name)) {
          skipped.rows.push({
            file,
            header: headerCells.join(' | '),
            rowName: row.join(' | '),
            reason: '无属性占位行，跳过',
          })
          continue
        }

        const desc = (row[descIdx] ?? '').trim()
        const target = cls.merged ? cleanKey(row[0]) : currentTag

        // 一行文档化多个属性的写法：`min` / `max`、`sort-key` / `sort-order`
        const tokens = rawName.split(/\s*\/\s*/).map(cleanKey)
        const multi =
          tokens.length > 1 && tokens.every((t) => t && !CJK_RE.test(t) && !/\s/.test(t))
        if (multi) {
          for (const t of tokens) ensureTag(target).attrs[t] = desc
          continue
        }

        if (CJK_RE.test(name) || /\s/.test(name)) {
          skipped.rows.push({
            file,
            header: headerCells.join(' | '),
            rowName: row.join(' | '),
            reason: '非属性行（属性名非法/缺名）',
          })
          continue
        }
        ensureTag(target).attrs[name] = desc
      }
      continue
    }

    if (cls.type === 'event') {
      if (currentTag === null) {
        skipped.tables.push({
          file,
          header: headerCells.join(' | '),
          reason: `事件表但主 tag ${primaryTag} 未在文件中出现，无法归属`,
        })
        continue
      }
      for (const row of rows) {
        const name = cleanKey(row[0] ?? '')
        if (!name) {
          skipped.rows.push({
            file,
            header: headerCells.join(' | '),
            rowName: row.join(' | '),
            reason: '事件名缺失',
          })
          continue
        }
        const desc = assembleEventDesc(headerCells, row, lang)
        ensureTag(currentTag).events[name] = desc
      }
      continue
    }

    if (cls.type === 'slot') {
      if (currentTag === null) {
        skipped.tables.push({
          file,
          header: headerCells.join(' | '),
          reason: `插槽表但主 tag ${primaryTag} 未在文件中出现，无法归属`,
        })
        continue
      }
      for (const row of rows) {
        const raw = row[0] ?? ''
        const desc = (row[1] ?? '').trim()
        // tag 前缀的默认插槽写法：`oas-descriptions-item` 默认插槽 / default slot
        const prefixed = raw
          .trim()
          .match(/^`?(oas-[a-z0-9-]+)`?\s+(默认插槽|默认|default slot|default)$/i)
        let tag
        let key
        if (prefixed) {
          tag = prefixed[1]
          key = ''
        } else {
          tag = currentTag
          key = cleanKey(raw)
          if (/^(默认插槽|默认|default)$/i.test(key)) key = ''
        }
        if (!raw.trim()) {
          skipped.rows.push({
            file,
            header: headerCells.join(' | '),
            rowName: row.join(' | '),
            reason: '插槽名缺失',
          })
          continue
        }
        ensureTag(tag).slots[key] = desc
      }
      continue
    }
  }

  return { tags, skipped, noApi: false }
}

// ---------- 主流程 ----------

function harvest(lang, dir, outPath) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
  const corpus = {}
  const stats = {
    lang,
    pagesTotal: files.length,
    pagesWithApi: 0,
    tables: { attr: 0, mergedAttr: 0, event: 0, slot: 0, skipped: 0 },
    rows: 0,
    skippedRows: 0,
    failures: [],
    noApiFiles: [],
  }

  for (const file of files) {
    const { tags, skipped, noApi } = parseFile(file, lang)
    if (noApi) {
      stats.noApiFiles.push(file)
      continue
    }
    stats.pagesWithApi++

    for (const t of skipped.tables) {
      stats.tables.skipped++
      stats.failures.push(`[${lang}:${file}] ${t.header}  → ${t.reason}`)
    }
    stats.skippedRows += skipped.rows.length
    for (const r of skipped.rows) {
      stats.failures.push(`[${lang}:${file}] 行「${r.rowName}」 → ${r.reason}`)
    }

    for (const [tag, groups] of Object.entries(tags)) {
      if (!corpus[tag]) corpus[tag] = { attrs: {}, events: {}, slots: {} }
      for (const group of ['attrs', 'events', 'slots']) {
        Object.assign(corpus[tag][group], groups[group])
      }
    }
  }

  // 收尾：排序输出 + 统计
  const ordered = {}
  const perTag = {}
  for (const tag of Object.keys(corpus).sort()) {
    const { attrs, events, slots } = corpus[tag]
    const attrKeys = Object.keys(attrs).sort()
    const eventKeys = Object.keys(events).sort()
    const slotKeys = Object.keys(slots).sort()
    ordered[tag] = {
      attrs: Object.fromEntries(attrKeys.map((k) => [k, attrs[k]])),
      events: Object.fromEntries(eventKeys.map((k) => [k, events[k]])),
      slots: Object.fromEntries(slotKeys.map((k) => [k, slots[k]])),
    }
    perTag[tag] = { attrs: attrKeys.length, events: eventKeys.length, slots: slotKeys.length }
    for (const n of [attrKeys.length, eventKeys.length, slotKeys.length]) stats.rows += n
  }
  stats.perTag = perTag

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(ordered, null, 2) + '\n', 'utf8')
  return { stats, corpus: ordered }
}

// 汇总表格类型统计（直接扫描 API 段分类）
function classifyAllTables(dir, lang) {
  const counts = { attr: 0, mergedAttr: 0, event: 0, slot: 0, skipped: 0 }
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()) {
    const text = readFileSync(join(dir, file), 'utf8')
    const lines = text.split(/\r?\n/)
    const apiIdx = lines.findIndex((l) => l.trim().startsWith('## API'))
    if (apiIdx === -1) continue
    const section = []
    for (let i = apiIdx + 1; i < lines.length; i++) {
      const l = lines[i]
      if (/^##\s+/.test(l) && !l.trim().startsWith('## API')) break
      section.push(l)
    }
    for (let i = 0; i < section.length - 1; i++) {
      if (!section[i].trim().startsWith('|')) continue
      if (!isSeparator(section[i + 1])) continue
      const header = splitRow(section[i].trim())
      const cls = classify(header, lang)
      if (cls.type === 'attr') counts[cls.merged ? 'mergedAttr' : 'attr']++
      else if (cls.type === 'event') counts.event++
      else if (cls.type === 'slot') counts.slot++
      else counts.skipped++
    }
  }
  return counts
}

// ---------- 中英一致性抽查 ----------

function compareKeys(zh, en, sampleSize = 10) {
  const sharedTags = Object.keys(zh.corpus)
    .filter((t) => en.corpus[t])
    .sort()
  const sample = sharedTags.slice(0, sampleSize)
  const issues = []
  for (const tag of sample) {
    const a = zh.corpus[tag]
    const b = en.corpus[tag]
    for (const group of ['attrs', 'events', 'slots']) {
      const ka = new Set(Object.keys(a[group]))
      const kb = new Set(Object.keys(b[group]))
      const onlyZh = [...ka].filter((k) => !kb.has(k))
      const onlyEn = [...kb].filter((k) => !ka.has(k))
      if (onlyZh.length || onlyEn.length) {
        issues.push({ tag, group, onlyZh, onlyEn })
      }
    }
  }
  // 全量不一致 tag 数（用于报告）
  const allMismatchTags = sharedTags.filter((tag) => {
    const a = zh.corpus[tag]
    const b = en.corpus[tag]
    return ['attrs', 'events', 'slots'].some((g) => {
      const ka = new Set(Object.keys(a[g]))
      const kb = new Set(Object.keys(b[g]))
      return [...ka].some((k) => !kb.has(k)) || [...kb].some((k) => !ka.has(k))
    })
  })
  const zhOnly = Object.keys(zh.corpus).filter((t) => !en.corpus[t])
  const enOnly = Object.keys(en.corpus).filter((t) => !zh.corpus[t])
  return { sample, issues, allMismatchTags, sharedCount: sharedTags.length, zhOnly, enOnly }
}

// ---------- 报告 ----------

function printReport(zh, en) {
  const line = '─'.repeat(72)
  console.log(line)
  console.log('OAS-UI API 表说明文案收割报告')
  console.log(line)

  for (const [lang, res] of [
    ['中文', zh],
    ['英文', en],
  ]) {
    const s = res.stats
    const types = classifyAllTables(
      lang === '中文' ? ZH_DIR : EN_DIR,
      lang === '中文' ? 'zh' : 'en',
    )
    console.log(`\n【${lang}】${s.pagesTotal} 页，含 ## API：${s.pagesWithApi} 页`)
    console.log(
      `表格：属性 ${types.attr} / 合并属性 ${types.mergedAttr} / 事件 ${types.event} / 插槽 ${types.slot} / 跳过 ${types.skipped}；` +
        `共收割条目 ${s.rows} 条（另跳过 ${s.skippedRows} 行）`,
    )
    const tags = Object.keys(s.perTag).length
    console.log(`覆盖 tag 数：${tags}`)
    const perTagLine = Object.entries(s.perTag)
      .map(([t, c]) => `${t}(${c.attrs}a/${c.events}e/${c.slots}s)`)
      .join(' ')
    console.log(`每 tag 条数：${perTagLine}`)
  }

  // 一致性抽查
  const cmp = compareKeys(zh, en)
  console.log(
    `\n【中英一致性抽查】共同 tag ${cmp.sharedCount} 个，抽前 ${cmp.sample.length} 个（字母序）`,
  )
  if (cmp.issues.length === 0) {
    console.log('抽查 10 个 tag 的 attrs/events/slots key 集合完全一致 ✅')
  } else {
    for (const it of cmp.issues) {
      console.log(
        `  ⚠ ${it.tag}.${it.group}：仅 zh ${it.onlyZh.join(',') || '—'}；仅 en ${it.onlyEn.join(',') || '—'}`,
      )
    }
  }
  const mismatchCount = cmp.allMismatchTags.length
  console.log(
    `全量 key 不一致 tag 数：${mismatchCount}${mismatchCount ? `（${cmp.allMismatchTags.join(', ')}）` : ''}`,
  )
  if (cmp.zhOnly.length || cmp.enOnly.length) {
    if (cmp.zhOnly.length) console.log(`仅 zh 存在：${cmp.zhOnly.join(', ')}`)
    if (cmp.enOnly.length) console.log(`仅 en 存在：${cmp.enOnly.join(', ')}`)
  }

  // 失败清单
  const allFailures = [...zh.stats.failures, ...en.stats.failures]
  console.log(`\n【解析失败/跳过清单】共 ${allFailures.length} 条`)
  for (const f of allFailures) console.log(`  - ${f}`)
}

// ---------- 入口 ----------

function main() {
  const zh = harvest('zh', ZH_DIR, OUT_ZH)
  const en = harvest('en', EN_DIR, OUT_EN)
  printReport(zh, en)
  console.log(`\n产物：`)
  console.log(`  ${OUT_ZH}`)
  console.log(`  ${OUT_EN}`)
}

main()
