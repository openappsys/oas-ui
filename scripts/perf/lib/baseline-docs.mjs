/**
 * perf-baseline.md 生成块与性能档案一致性校验（单一真源机制）。
 *
 * 背景（2026-10-28 table 批收口）：性能数字此前在 脚本 / JSON / Markdown 三处各自手抄，
 * 已实际漂移：select 选项更新预算（脚本 160 ms vs md 50 ms）、happy-dom 版本（脚本硬编码
 * `20.x` vs 实装 21.x）、§2 包级快照（md 停留在 2026-10-08）。现约定：
 *
 * - **JSON（`docs/perf-baseline.json`）是唯一数据真源**，只能由 perf:size / perf:bench
 *   经 `--update-baseline` 写入（不手改）；
 * - **渲染阈值真源是 `lib/render-budgets.mjs`**，perf:bench 从这里取，写进 JSON；
 * - **md 中的数据表全部为生成块**（`BEGIN/END:generated:perf-baseline:<section>` 标记），
 *   由 `gen-baseline-docs.mjs`（`pnpm perf:docs`）写入；
 * - `perf:size` 内置一致性门禁（本模块 `checkPerfDocs`）：md 生成块 ↔ JSON、JSON ↔ 渲染
 *   阈值库、JSON env ↔ 实装 happy-dom 版本、JSON 预算 pass 布尔自洽，任一漂移即 FAIL——
 *   **只报红不自动刷新**（防止跑一次测量就静默洗白退化），更新必须显式走
 *   `perf:size --update-baseline` / `perf:bench --update-baseline` / `perf:docs`。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fmtKB, fmtMB } from './baseline.mjs'
import { RENDER_BUDGETS, happyDomLabel } from './render-budgets.mjs'

const MARK_BEGIN = (section) => `<!-- BEGIN:generated:perf-baseline:${section} -->`
const MARK_END = (section) => `<!-- END:generated:perf-baseline:${section} -->`

export const DOC_SECTIONS = ['packages', 'components', 'render', 'budgets', 'render-budgets']

/** 提取 md 中某生成块的内部文本；缺块返回 null */
export function extractBlock(mdText, section) {
  const begin = MARK_BEGIN(section)
  const end = MARK_END(section)
  const start = mdText.indexOf(begin)
  if (start < 0) return null
  const from = start + begin.length
  const to = mdText.indexOf(end, from)
  if (to < 0) return null
  return mdText.slice(from, to).replace(/^\n/, '').replace(/\n$/, '')
}

const mdTable = (header, rows) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
const dash = (value) => (value == null ? '—' : value)

// ---------- 各生成块 ----------

function buildPackagesBlock(json) {
  const size = json.size ?? {}
  const ui = size.packages?.['@oas-ui/ui'] ?? {}
  const theme = size.packages?.['@oas-ui/theme'] ?? {}
  const row = (name, files, raw, gzip, brotli = null) => [name, dash(files), dash(raw), dash(gzip), dash(brotli)]
  const rows = [
    row('@oas-ui/ui（dist 总大小，含 map/d.ts）', '—', ui.distTotalBytes == null ? null : fmtMB(ui.distTotalBytes)),
    row(
      '@oas-ui/ui（浏览器可加载 JS）',
      ui.browserJs?.files,
      ui.browserJs && fmtKB(ui.browserJs.rawBytes),
      ui.browserJs && fmtKB(ui.browserJs.gzipBytes),
    ),
    row(
      "@oas-ui/ui（全量入口链 `import '@oas-ui/ui'`）",
      ui.fullEntry?.files,
      ui.fullEntry && fmtKB(ui.fullEntry.rawBytes),
      ui.fullEntry && fmtKB(ui.fullEntry.gzipBytes),
    ),
    row(
      '@oas-ui/ui（dist/cdn.js 单文件全量 bundle）',
      ui.cdn && 1,
      ui.cdn && fmtKB(ui.cdn.rawBytes),
      ui.cdn && fmtKB(ui.cdn.gzipBytes),
      ui.cdn && fmtKB(ui.cdn.brotliBytes),
    ),
    row(
      '@oas-ui/theme（index.css）',
      1,
      theme.indexCss && fmtKB(theme.indexCss.rawBytes),
      theme.indexCss && fmtKB(theme.indexCss.gzipBytes),
    ),
    ...['@oas-ui/core', '@oas-ui/i18n', '@oas-ui/icons', '@oas-ui/ssr'].map((name) => {
      const pkg = size.packages?.[name]
      return row(name, pkg?.files, pkg && fmtKB(pkg.rawBytes), pkg && fmtKB(pkg.gzipBytes))
    }),
  ]
  return mdTable(['包', '文件数', 'raw', 'gzip', 'brotli'], rows)
}

function buildComponentsBlock(json) {
  const components = json.size?.components ?? {}
  const rows = Object.entries(components).map(([id, m]) => [
    id,
    `\`@oas-ui/ui/${m.entry}\``,
    m.files,
    fmtKB(m.rawBytes),
    fmtKB(m.gzipBytes),
  ])
  return mdTable(['组件链', '入口', '文件数', 'raw', 'gzip'], rows)
}

function buildRenderBlock(json) {
  const scenarios = json.render?.scenarios ?? {}
  const rows = RENDER_BUDGETS.map(({ id, label, budgetMs }) => {
    const s = scenarios[id]
    if (!s) throw new Error(`[perf:docs] JSON render.scenarios 缺少 '${id}'（先跑 pnpm perf:bench --update-baseline）`)
    return [label, `${s.medianMs.toFixed(1)} / ${s.p95Ms.toFixed(1)}`, String(budgetMs)]
  })
  return mdTable(['场景', 'median / p95（ms）', '门槛（ms）'], rows)
}

function buildBudgetsBlock(json) {
  const budgets = json.size?.budgets ?? []
  const rows = budgets.map((b) => {
    if (!b.kind)
      throw new Error(`[perf:docs] JSON size.budgets['${b.name}'] 缺少 kind（先跑 pnpm perf:size --update-baseline）`)
    return [
      b.name,
      fmtKB(b.actualBytes),
      `${fmtKB(b.limitBytes)}（${b.kind === 'ceiling' ? '天花板' : '绝对值'}）`,
      b.basis,
    ]
  })
  return mdTable(['预算项', '实测 gzip', '预算（制式）', '依据'], rows)
}

function buildRenderBudgetsBlock() {
  const list = RENDER_BUDGETS.map((b) => `${b.label} ${b.budgetMs} ms`).join(' / ')
  return `阈值取多轮实测 p95 的约 3~5 倍取整（happy-dom 下耗时跨轮次波动明显）：${list}。渲染耗时波动大，**不进 CI**。`
}

/** 由 JSON + 阈值库再生全部生成块（gen 写入 / check 比对共用同一实现） */
export function buildAllBlocks(json) {
  return {
    packages: buildPackagesBlock(json),
    components: buildComponentsBlock(json),
    render: buildRenderBlock(json),
    budgets: buildBudgetsBlock(json),
    'render-budgets': buildRenderBudgetsBlock(),
  }
}

/** 把生成块写回 md 文本（只替换标记之间内容，其余手写区不动） */
export function applyBlocks(mdText, blocks) {
  let out = mdText
  for (const section of DOC_SECTIONS) {
    const begin = MARK_BEGIN(section)
    const end = MARK_END(section)
    const start = out.indexOf(begin)
    const stop = start < 0 ? -1 : out.indexOf(end, start)
    if (start < 0 || stop < 0) {
      throw new Error(`[perf:docs] perf-baseline.md 缺少 ${section} 生成块标记，请手工放置 ${begin} / ${end}`)
    }
    out = `${out.slice(0, start)}${begin}\n${blocks[section]}\n${out.slice(stop)}`
  }
  return out
}

// ---------- 一致性门禁（perf:size 调用；返回问题数组，空 = 通过） ----------

export function checkPerfDocs(root) {
  const problems = []
  let json
  let mdText
  try {
    json = JSON.parse(readFileSync(join(root, 'docs/perf-baseline.json'), 'utf8'))
  } catch (error) {
    return [`docs/perf-baseline.json 不可解析：${error.message}`]
  }
  try {
    mdText = readFileSync(join(root, 'docs/perf-baseline.md'), 'utf8')
  } catch (error) {
    return [`docs/perf-baseline.md 不可读：${error.message}`]
  }

  // 1. JSON render env ↔ 实装 happy-dom 版本（脚本已不再硬编码版本；漂移 = 基线未随升级刷新）
  const expectedHappyDom = happyDomLabel(root)
  const actualHappyDom = json.render?.env?.happyDom
  if (actualHappyDom !== expectedHappyDom) {
    problems.push(
      `perf-baseline.json render.env.happyDom='${actualHappyDom}' 与实装 '${expectedHappyDom}' 不一致：跑 pnpm perf:bench --update-baseline 刷新`,
    )
  }

  // 2. JSON render.budgets ↔ 渲染阈值库（防 JSON 停留在旧阈值，如 select 50→160）
  const libById = new Map(RENDER_BUDGETS.map((b) => [b.id, b]))
  const jsonBudgets = json.render?.budgets ?? []
  for (const b of jsonBudgets) {
    const lib = libById.get(b.id)
    if (!lib) {
      problems.push(`perf-baseline.json render.budgets 含未知场景 '${b.id}'（不在 lib/render-budgets.mjs）`)
      continue
    }
    if (b.budgetMs !== lib.budgetMs) {
      problems.push(
        `渲染阈值漂移：'${b.id}' JSON=${b.budgetMs}ms vs 阈值库=${lib.budgetMs}ms：跑 pnpm perf:bench --update-baseline 刷新`,
      )
    }
  }
  const jsonBudgetIds = new Set(jsonBudgets.map((b) => b.id))
  for (const lib of RENDER_BUDGETS) {
    if (!jsonBudgetIds.has(lib.id)) problems.push(`perf-baseline.json render.budgets 缺少 '${lib.id}'`)
    if (!(lib.id in (json.render?.scenarios ?? {})))
      problems.push(`perf-baseline.json render.scenarios 缺少 '${lib.id}'`)
  }

  // 3. JSON 体积预算布尔自洽（pass 必须等于 actual<=limit；防手改/写坏）
  for (const b of json.size?.budgets ?? []) {
    const expected = b.actualBytes <= b.limitBytes
    if (b.pass !== expected) {
      problems.push(
        `perf-baseline.json size.budgets['${b.name}'] pass=${b.pass} 与 actual(${b.actualBytes})<=limit(${b.limitBytes}) 不自洽`,
      )
    }
    if (!b.kind)
      problems.push(
        `perf-baseline.json size.budgets['${b.name}'] 缺少 kind（ceiling|absolute）：跑 pnpm perf:size --update-baseline 刷新`,
      )
  }

  // 4. md 生成块 ↔ 再生结果
  let blocks
  try {
    blocks = buildAllBlocks(json)
  } catch (error) {
    problems.push(error.message)
    return problems
  }
  for (const section of DOC_SECTIONS) {
    const actual = extractBlock(mdText, section)
    if (actual == null) {
      problems.push(`perf-baseline.md 缺少生成块 ${section}（${MARK_BEGIN(section)}）`)
      continue
    }
    if (actual !== blocks[section]) {
      problems.push(`perf-baseline.md 生成块 ${section} 与基线数据不一致：跑 pnpm perf:docs 刷新（不得手改块内数字）`)
    }
  }
  return problems
}
