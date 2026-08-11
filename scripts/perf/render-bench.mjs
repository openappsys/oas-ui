#!/usr/bin/env node
/**
 * 渲染基准（vision §5.8 性能领先落地的一部分）。
 *
 * 环境：happy-dom（与 packages/ssr/src/shim.ts 同思路的最小 DOM shim）——
 * 组件类求值需要全局 HTMLElement/customElements，先装 shim 再动态 import 组件 dist。
 *
 * 测量对象（基于 `pnpm build` 之后的发布产物 dist）：
 *   - 首渲染：button、input、table（100 行）、select（100 选项）、tabs（10 面板）、form（10 字段）
 *   - update 增量：table 数据更新（data attribute 换新）、select 选项更新（options attribute 换新）
 *   每个场景 warmup 5 次 + 正式 100 次迭代，取均值/中位数/p95/min/max（ms）。
 *   时间口径：首渲染 = appendChild 触发 connectedCallback（render() + update()）的同步耗时；
 *   update = setAttribute 触发 attributeChangedCallback → update() 的同步耗时。
 *
 * 预算断言（量级防退化，非 CI 硬门槛）：本地/发布前跑。阈值取多轮实测 p95 的约 3~5 倍取整，
 * 留足机器抖动余量（happy-dom 耗时跨轮次波动明显，故不进 CI，见 .github/workflows/ci.yml 注释）。
 *
 * 产物：docs/perf-baseline.json 的 `render` section（与 size.mjs 各自 merge，互不覆盖）。
 *
 * 用法：先 `pnpm build`，再 `pnpm perf:bench`。
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Window } from 'happy-dom'
import { ROOT, writeSection, today } from './lib/baseline.mjs'

const UI_DIST = join(ROOT, 'packages/ui/dist')

// ---------- 预检：dist 必须先构建 ----------
if (!existsSync(join(UI_DIST, 'index.js'))) {
  console.error('[perf:bench] packages/ui/dist 未构建，请先运行 `pnpm build` 再测渲染。')
  process.exit(1)
}

// ---------- DOM shim（同 packages/ssr/src/shim.ts 思路；此处进程内无既有 DOM，直接覆盖） ----------
const win = new Window({ url: 'http://localhost/' })
const GLOBALS = [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'HTMLTemplateElement',
  'Node',
  'Element',
  'ShadowRoot',
  'DocumentFragment',
  'CustomEvent',
  'Event',
  'MutationObserver',
  'navigator',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'ResizeObserver',
]
for (const name of GLOBALS) {
  const value = win[name]
  if (value === undefined) continue
  try {
    Object.defineProperty(globalThis, name, {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    })
  } catch {
    try {
      globalThis[name] = value
    } catch {
      // 忽略（正常不可达：Node 无内置 DOM 全局）
    }
  }
}
const g = globalThis
if (g.document !== win.document || g.customElements !== win.customElements) {
  console.error('[perf:bench] DOM shim 安装失败：当前环境不允许覆盖全局 document/customElements。')
  process.exit(1)
}
const document = win.document

// ---------- 装载被测组件（先 shim 后 import，dist ESM 经 workspace 链接解析） ----------
await import('@oas-ui/ui/basic/button')
await import('@oas-ui/ui/form/input')
await import('@oas-ui/ui/data/table')
await import('@oas-ui/ui/form/select')
await import('@oas-ui/ui/layout/tabs') // 目录 index 同时 define oas-tabs + oas-tab-panel
await import('@oas-ui/ui/form/form')
await import('@oas-ui/ui/form/form-item')

// ---------- 统计 ----------
const ITERATIONS = 100
const WARMUP = 5

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0
  return {
    meanMs: +mean.toFixed(3),
    medianMs: +median.toFixed(3),
    p95Ms: +p95.toFixed(3),
    minMs: +(sorted[0] ?? 0).toFixed(3),
    maxMs: +(sorted[sorted.length - 1] ?? 0).toFixed(3),
  }
}

function makeElement(tag, attrs = {}) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  return el
}

/** 首渲染：构造元素 → 计时 appendChild（connectedCallback 同步 render+update）→ 移除 */
function benchFirstRender(tag, build) {
  for (let i = 0; i < WARMUP; i++) {
    const el = build(tag)
    document.body.appendChild(el)
    el.remove()
  }
  const times = []
  for (let i = 0; i < ITERATIONS; i++) {
    const el = build(tag)
    const t0 = performance.now()
    document.body.appendChild(el)
    times.push(performance.now() - t0)
    el.remove()
  }
  return stats(times)
}

/** update 增量：已连接元素上反复换属性值，计时 attributeChangedCallback → update() */
function benchUpdate(el, mutate) {
  for (let i = 0; i < WARMUP; i++) mutate(el, i)
  const times = []
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now()
    mutate(el, i)
    times.push(performance.now() - t0)
  }
  return stats(times)
}

// ---------- 场景数据 ----------
const COLUMNS = JSON.stringify([
  { key: 'a', title: '列A' },
  { key: 'b', title: '列B' },
  { key: 'c', title: '列C' },
  { key: 'd', title: '列D' },
  { key: 'e', title: '列E' },
])
const TABLE_ROWS = 100
function tableData(seed = 0) {
  return JSON.stringify(
    Array.from({ length: TABLE_ROWS }, (_, i) => ({
      a: `name-${i}`,
      b: i + seed,
      c: `x${i}`,
      d: i % 7,
      e: `str-${seed}-${i}`,
    })),
  )
}
const SELECT_OPTIONS = 100
function selectOptions(seed = 0) {
  return JSON.stringify(
    Array.from({ length: SELECT_OPTIONS }, (_, i) => ({
      label: `选项${seed}-${i}`,
      value: `v${seed}-${i}`,
    })),
  )
}

function buildTabs() {
  const el = makeElement('oas-tabs')
  let html = ''
  for (let i = 0; i < 10; i++)
    html += `<oas-tab-panel label="标签${i}" value="${i}"><p>内容${i}</p></oas-tab-panel>`
  el.innerHTML = html
  return el
}
function buildForm() {
  const el = makeElement('oas-form')
  let html = ''
  for (let i = 0; i < 10; i++)
    html += `<oas-form-item label="字段${i}"><oas-input name="f${i}"></oas-input></oas-form-item>`
  el.innerHTML = html
  return el
}

// ---------- 执行 ----------
console.log(`渲染基准（happy-dom 环境，迭代 ${ITERATIONS} 次）\n`)
console.log('=== 首渲染耗时（ms） ===')

const scenarios = {}
function run(id, label, stat) {
  scenarios[id] = { label, ...stat }
  console.log(
    `${label.padEnd(22)} mean ${String(stat.meanMs).padStart(7)}  median ${String(stat.medianMs).padStart(7)}  p95 ${String(stat.p95Ms).padStart(7)}`,
  )
}

run(
  'button-first-render',
  'button',
  benchFirstRender('oas-button', () =>
    makeElement('oas-button', { type: 'primary', size: 'medium' }),
  ),
)
run(
  'input-first-render',
  'input',
  benchFirstRender('oas-input', () =>
    makeElement('oas-input', { placeholder: '请输入', label: '姓名' }),
  ),
)
run(
  'table-100rows-first-render',
  'table(100 行)',
  benchFirstRender('oas-table', () =>
    makeElement('oas-table', { columns: COLUMNS, data: tableData() }),
  ),
)
run(
  'select-100opt-first-render',
  'select(100 选项)',
  benchFirstRender('oas-select', () => makeElement('oas-select', { options: selectOptions() })),
)
run(
  'tabs-10panel-first-render',
  'tabs(10 面板)',
  benchFirstRender('oas-tabs', () => buildTabs()),
)
run(
  'form-10field-first-render',
  'form(10 字段)',
  benchFirstRender('oas-form', () => buildForm()),
)

const tableEl = makeElement('oas-table', { columns: COLUMNS, data: tableData() })
document.body.appendChild(tableEl)
const tableUpdate = benchUpdate(tableEl, (el, i) => el.setAttribute('data', tableData(i + 1)))

const selectEl = makeElement('oas-select', { options: selectOptions() })
document.body.appendChild(selectEl)
const selectUpdate = benchUpdate(selectEl, (el, i) =>
  el.setAttribute('options', selectOptions(i + 1)),
)

console.log('\n=== update 增量耗时（ms） ===')
run('table-data-update', 'table 数据更新', tableUpdate)
run('select-options-update', 'select 选项更新', selectUpdate)

// ---------- 预算断言（量级防退化） ----------
// 阈值 = 2026-08-12 多轮实测 p95 的约 3~5 倍取整（happy-dom 下耗时跨轮次波动明显，
// 如 table 数据更新 p95 曾见 7.6~43 ms），取"量级"而非"精确"：只挡明显退化。
// 本基准不进 CI（见 .github/workflows/ci.yml 注释），本地/发布前核对用。
const RENDER_BUDGETS = [
  { id: 'button-first-render', budgetMs: 5 },
  { id: 'input-first-render', budgetMs: 15 },
  { id: 'table-100rows-first-render', budgetMs: 50 },
  { id: 'select-100opt-first-render', budgetMs: 50 },
  { id: 'tabs-10panel-first-render', budgetMs: 15 },
  { id: 'form-10field-first-render', budgetMs: 40 },
  { id: 'table-data-update', budgetMs: 50 },
  { id: 'select-options-update', budgetMs: 50 },
]

console.log('\n=== 渲染预算断言 ===')
let fail = false
const budgetResults = RENDER_BUDGETS.map((b) => {
  const s = scenarios[b.id]
  const ok = s.p95Ms <= b.budgetMs
  if (!ok) fail = true
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${s.label.padEnd(22)} p95 ${String(s.p95Ms).padStart(7)} ms / 预算 ${String(b.budgetMs).padStart(3)} ms`,
  )
  return { id: b.id, label: s.label, budgetMs: b.budgetMs, p95Ms: s.p95Ms, pass: ok }
})

// ---------- 写入基线（merge，保留 size section） ----------
writeSection('render', {
  generatedAt: today(),
  env: {
    runtime: `node ${process.version}`,
    happyDom: 'happy-dom@20.x',
    iterations: ITERATIONS,
    note: 'happy-dom 合成环境，非真实浏览器渲染口径；耗时仅供相对对比与退化监测',
  },
  scenarios,
  budgets: budgetResults,
})

console.log('\n基线已写入 docs/perf-baseline.json')
if (fail) {
  console.error('[perf:bench] 存在超预算场景，渲染性能疑似退化。')
  process.exit(1)
}
