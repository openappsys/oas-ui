#!/usr/bin/env node
/**
 * 跨族边单向依赖登记 + 环检测（2026-11-25 复用基建配套批）。
 *
 * 目标（docs/PRD.md 复用基建配套批 ③）：共享内核（date-grid 日期数学 / virtual-list
 * 虚拟滚动 / overlay-floating 浮层定位）下沉决策需要「族间依赖方向」可审计——
 * form 当前零 commerce import 是加门禁的最佳时机；跨族反边（如 feedback→commerce）
 * 与未留名的新环从此被拦在 CI。
 *
 * 规则（登记表 = scripts/family-deps-registry.json，先全量扫描现状把事实登记为合法边，
 * 再拦登记之外的新边）：
 *   - 扫描 packages/ui/src 下各族目录的全部生产 .ts 文件的相对 import 面（含副作用
 *     import 与动态 import()——懒加载边同样能闭合环，属依赖方向事实；排除
 *     .test.ts / .spec.ts，测试夹具的跨族 import 不属生产依赖面）；
 *   - **import type 与值 import 不区分口径**：类型 import 在编译期
 *     擦除、不影响产物体积，但同样是源码级族间耦合——依赖方向门禁按源码口径收集；
 *   - `@oas-ui/*` workspace 包 = 基座与叶子（core/i18n/icons），放行；外部裸导入
 *     不在本门禁范围（perf:size 裸导入门禁已管辖「产物只允许相对 + @oas-ui/*」）；
 *   - 任意族 → leafLayer（shared）= 叶子方向，放行（基座共享件被全族消费是分层设计）；
 *   - shared → 族 = 叶子反向边，必须逐条登记（现状：shared→data / shared→form）；
 *   - 族 → 族 = 跨组件依赖，必须逐条登记（现状含 commerce→feedback 的 sku→bottom-sheet）；
 *   - entryLayer = CDN 族包入口层：families/ 目录 + 根级 index.ts / ssr.ts
 *     （union 与 SSR 入口同属「按设计 import 任意族」的入口层），按设计
 *     import 任意族，不入图；任意族 → 入口层的 import 一律违规（入口层不被反向依赖）；
 *   - 登记条目必须与现状真实对应：条目在扫描结果里零命中 = 事实已消失（stale），
 *     同样红灯——登记表必须随现状收缩，防止「空头审批」放行未来回潮；
 *   - 环检测：对登记边构成的族级有向图求强连通分量（SCC / 环簇）——稠密登记图里
 *     二元环会组合出大量复合环（逐环留名不可维护），环簇才是稳定留名单位。
 *     knownCycles 留名现状环簇（节点集 + 归因）；环簇扩大/新增/消失（条目失效）均红灯
 *     ——登记即审批，反边审批须先看它把哪个环簇咬合得更大。
 *
 *   **覆盖面声明**：族 → shared 的叶子方向边**不参与环检测**
 *   ——shared ⇄ family 的双向 import（族消费 shared 共享件 + shared→data/form 的
 *   叶子实现反向边）是「叶子实现居 shared」的既定分层设计（lib/l3-registry.mjs 同款
 *   口径），**非依赖异味**。本门禁的环检测覆盖面 = 族间（shared 以外）依赖边；
 *   shared→族 反向边的扩张由「逐条登记 + stale 检测」看管，不与叶子方向边合成环。
 *
 * 自证可红：判定函数为纯函数（fixtures 见 scripts/check-family-deps.test.mjs，
 * `pnpm family-deps:test`）；本脚本对 live 树断言（任何一边未登记即非零退出）。
 *
 * 用法：node scripts/check-family-deps.mjs（CI：ci.yml test job `pnpm family-deps:check`）
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripComments } from './qa/assert-audit.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const SRC = join(ROOT, 'packages/ui/src')
const REGISTRY_PATH = join(ROOT, 'scripts/family-deps-registry.json')

const FROM_RE = /from\s*["']([^"']+)["']/g
// 语句边界（行首 / ; { } 之后的 import），避免把字符串/示例里的 import 当真
const SIDE_IMPORT_RE = /(?:^|[;{}])\s*import\s*["']([^"']+)["']/gm
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g
// 模块说明符合法字符集（形状守卫，同 perf/size.mjs——挡掉 `setAttribute("data-from", …)`
// 这类把属性名当说明符捕获的误报）
const MODULE_SPECIFIER_RE = /^[A-Za-z0-9@_.~:/+-]+$/
const INVALID_BEFORE_FROM = new Set(['"', "'", '-', '.', '`'])

/* -------------------------------------------------------------------------- */
/* 纯函数（--test 覆盖红绿两侧）                                               */
/* -------------------------------------------------------------------------- */

/** 提取一段已剥注释源码里的全部 import 说明符（静态 from/副作用/动态） */
export function extractSpecs(code) {
  const out = new Set()
  for (const [re, anchored] of [
    [FROM_RE, false],
    [SIDE_IMPORT_RE, true],
    [DYNAMIC_IMPORT_RE, false],
  ]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(code))) {
      const spec = m[1]
      if (!spec || !MODULE_SPECIFIER_RE.test(spec)) continue
      if (!anchored && INVALID_BEFORE_FROM.has(code[m.index - 1])) continue
      out.add(spec)
    }
  }
  return out
}

/** 解析相对 import 的目标族：返回族目录名；无法定位文件时返回 null */
export function resolveTargetFamily(srcRoot, fromFile, spec, families) {
  if (!spec.startsWith('.')) return null
  const target = resolveRelativeTarget(srcRoot, fromFile, spec)
  if (!target) return null
  const rel = relative(srcRoot, target)
  const top = rel.split(sep)[0]
  return families.includes(top) ? top : null
}

/**
 * 解析相对 import 的目标绝对路径（候选：.js→.ts 映射 / 无后缀兜底 / index 目录）；
 * 无法定位文件时返回 null。resolveTargetFamily 与根级入口判定共用。
 */
function resolveRelativeTarget(srcRoot, fromFile, spec) {
  if (!spec.startsWith('.')) return null
  const base = resolve(dirname(fromFile), spec)
  // 仓库源码 ESM 风格一律带 .js 后缀（编译期映射 .ts）；无后缀写法兜底 base.ts / base/index.ts
  const candidates = base.endsWith('.js')
    ? [base.slice(0, -3) + '.ts', join(base.slice(0, -3), 'index.ts')]
    : [base + '.ts', join(base, 'index.ts')]
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null
}

/**
 * 解析相对 import 是否指向根级入口文件。
 * 返回入口文件名（'index.ts' | 'ssr.ts'）或 null。
 */
export function resolveRootEntryFile(srcRoot, fromFile, spec) {
  const target = resolveRelativeTarget(srcRoot, fromFile, spec)
  if (!target) return null
  const rel = relative(srcRoot, target)
  return rel.split(sep).length === 1 && ROOT_ENTRY_FILES.has(rel) ? rel : null
}

/**
 * 根级入口文件：src 下的 index.ts（全量 union 入口）与 ssr.ts（SSR 入口）。
 * 与 families/ 同属入口层——按设计 import 任意族，出边不入图不登记；
 * 任意族 import 它们 = 入口层反向依赖，违规（入口层不被反向依赖）。
 */
export const ROOT_ENTRY_FILES = new Set(['index.ts', 'ssr.ts'])

function* walkTs(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) yield* walkTs(full)
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.spec.ts')) yield full
  }
}

/**
 * 扫描族目录的相对 import 面。
 * 返回 { edges, leafEdges, fileCount, families }：
 * - edges：Map<'from>to', Set<file>>——族→族 与 叶子反向（shared→族）的待登记边；
 *   目标为入口层（families/ 目录或根级 index.ts / ssr.ts）时记 'from>入口名'，
 *   交违规判定按 entry-layer 报告（入口层不被反向依赖）；
 * - leafEdges：Map<'from>shared', Set<file>>——叶子方向（任意族→shared，放行不登记）。
 * 入口层文件（families/ 目录 + 根级 index.ts / ssr.ts）整体跳过扫描（出边不入图）。
 */
export function scanGraph(srcRoot, { entryLayer, leafLayer }) {
  const families = readdirSync(srcRoot).filter((n) => statSync(join(srcRoot, n)).isDirectory() && n !== entryLayer)
  const edges = new Map()
  const leafEdges = new Map()
  let fileCount = 0
  for (const family of families) {
    for (const file of walkTs(join(srcRoot, family))) {
      fileCount++
      for (const spec of extractSpecs(stripComments(readFileSync(file, 'utf8')))) {
        const to = resolveTargetFamily(srcRoot, file, spec, [...families, entryLayer, leafLayer])
        if (!to || to === family) {
          // 非族目标：根级入口文件（index.ts / ssr.ts）记入口层反向依赖边，
          // 其余（无法定位 / 族内）跳过
          const rootEntry = to ? null : resolveRootEntryFile(srcRoot, file, spec)
          if (!rootEntry) continue
          const key = `${family}>${rootEntry}`
          if (!edges.has(key)) edges.set(key, new Set())
          edges.get(key).add(file)
          continue
        }
        const key = `${family}>${to}`
        if (to === leafLayer) {
          if (!leafEdges.has(key)) leafEdges.set(key, new Set())
          leafEdges.get(key).add(file)
        } else {
          if (!edges.has(key)) edges.set(key, new Set())
          edges.get(key).add(file)
        }
      }
    }
  }
  return { edges, leafEdges, fileCount, families }
}

/**
 * 跨族违规判定：edges 里不在登记表的边（含指向入口层的反向依赖——families/ 目录
 * 与根级 index.ts / ssr.ts）。
 * 违规条目 { from, to, files, reason }；reason: 'unregistered' | 'entry-layer'。
 */
export function crossFamilyViolations(graph, registry) {
  const registered = new Set(registry.edges.map((e) => `${e.from}>${e.to}`))
  const out = []
  for (const [key, files] of [...graph.edges.entries()].sort()) {
    const [from, to] = key.split('>')
    if (to === registry.entryLayer || ROOT_ENTRY_FILES.has(to)) {
      out.push({ from, to, files: [...files], reason: 'entry-layer' })
      continue
    }
    if (!registered.has(key)) out.push({ from, to, files: [...files], reason: 'unregistered' })
  }
  return out
}

/** 登记条目失效判定：登记表里的边在现状扫描里零命中 = 事实已消失（空头审批） */
export function staleEdgeViolations(graph, registry) {
  const out = []
  for (const edge of registry.edges) {
    const key = `${edge.from}>${edge.to}`
    if (!(graph.edges.get(key)?.size > 0)) out.push({ ...edge })
  }
  return out
}

/**
 * 族级有向图强连通分量（Tarjan，递归版——族数 ≤ 13，深度无风险）。
 * edgeMap：Map<from, Set<to>>。返回节点数组数组（每个成员一个 SCC，含单点分量），
 * 分量内部节点排序、分量列表按首节点排序，输出确定性。
 */
export function findSccs(edgeMap) {
  const nodes = [...new Set([...edgeMap.keys(), ...[...edgeMap.values()].flatMap((s) => [...s])])].sort()
  const index = new Map()
  const low = new Map()
  const onStack = new Set()
  const stack = []
  const out = []
  let counter = 0
  const strongconnect = (v) => {
    index.set(v, counter)
    low.set(v, counter)
    counter++
    stack.push(v)
    onStack.add(v)
    for (const w of [...(edgeMap.get(v) ?? [])].sort()) {
      if (!index.has(w)) {
        strongconnect(w)
        low.set(v, Math.min(low.get(v), low.get(w)))
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), index.get(w)))
      }
    }
    if (low.get(v) === index.get(v)) {
      const component = []
      for (;;) {
        const w = stack.pop()
        onStack.delete(w)
        component.push(w)
        if (w === v) break
      }
      out.push(component.sort())
    }
  }
  for (const v of nodes) if (!index.has(v)) strongconnect(v)
  return out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}

/**
 * 环簇违规判定（双向）：
 * - 找到的 SCC（成员 ≥ 2）未被 knownCycles 留名 → `{ scc, reason: 'unknown-cycle' }`
 *   （新环簇 / 既有环簇被登记反边咬合扩大）；
 * - knownCycles 条目与任何找到的 SCC 节点集都不一致 → `{ entry, reason: 'stale-cycle' }`
 *   （环簇已溶解——反边被移除后留名未收缩，同「空头审批」逻辑）。
 */
export function cycleViolations(foundSccs, knownCycles) {
  const known = new Set(knownCycles.map((c) => [...c.nodes].sort().join('>')))
  const found = new Set(foundSccs.filter((s) => s.length >= 2).map((s) => [...s].sort().join('>')))
  const out = []
  for (const key of found) {
    if (!known.has(key)) out.push({ scc: key.split('>'), reason: 'unknown-cycle' })
  }
  for (const entry of knownCycles) {
    if (!found.has([...entry.nodes].sort().join('>'))) out.push({ entry, reason: 'stale-cycle' })
  }
  return out
}

/**
 * 已批准留名的环簇（与违规判定解耦——cycleViolations 的 stale 检查面向
 * 全量普查，借它逐簇算 named 会把「其它留名条目对不上本簇」误判成失效而污染结果，
 * 导致已批准环簇漏发 PASS、空簇图误报「无环簇」）。
 */
export function namedSccs(foundSccs, knownCycles) {
  const knownKeys = new Set(knownCycles.map((c) => [...c.nodes].sort().join('>')))
  return foundSccs.filter((s) => s.length >= 2 && knownKeys.has([...s].sort().join('>')))
}

/** 登记表形状校验（fail closed：缺字段/未知族/空 reason 一律报错） */
export function registryShapeProblems(registry, families, entryLayer, leafLayer) {
  const problems = []
  const knownFamilies = new Set([...families, entryLayer, leafLayer])
  if (!registry.entryLayer || !registry.leafLayer) problems.push('缺少 entryLayer / leafLayer 定义')
  if (!Array.isArray(registry.edges) || registry.edges.length === 0) problems.push('edges 必须为非空数组')
  if (!Array.isArray(registry.knownCycles)) problems.push('缺少 knownCycles 数组（允许为空，但字段必须在）')
  for (const [i, edge] of (registry.edges ?? []).entries()) {
    const at = `edges[${i}]`
    if (!edge.from || !knownFamilies.has(edge.from)) problems.push(`${at}.from '${edge.from}' 不是族目录`)
    if (!edge.to || !knownFamilies.has(edge.to)) problems.push(`${at}.to '${edge.to}' 不是族目录`)
    if (edge.from === edge.to) problems.push(`${at} 是族内边（from === to），不属跨族登记`)
    if (edge.to === registry.entryLayer) problems.push(`${at} 指向入口层——入口层不被反向依赖，此边不可登记`)
    if (!edge.reason || typeof edge.reason !== 'string') problems.push(`${at} 缺少 reason（登记必须写明归因）`)
  }
  for (const [i, cycle] of (registry.knownCycles ?? []).entries()) {
    const at = `knownCycles[${i}]`
    if (!Array.isArray(cycle.nodes) || cycle.nodes.length < 2) problems.push(`${at}.nodes 至少两个族`)
    for (const n of cycle.nodes ?? []) if (!knownFamilies.has(n)) problems.push(`${at}.nodes 含未知族 '${n}'`)
    if (!cycle.reason || typeof cycle.reason !== 'string') problems.push(`${at} 缺少 reason（留名必须写明归因）`)
  }
  return problems
}

/* -------------------------------------------------------------------------- */
/* 主流程（live 树断言）                                                       */
/* -------------------------------------------------------------------------- */

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    console.error(`[family-deps] 登记表不存在：${relative(ROOT, REGISTRY_PATH).replaceAll(sep, '/')}`)
    process.exit(1)
  }
  let registry
  try {
    registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
  } catch (error) {
    console.error(`[family-deps] 登记表不可解析：${error.message}`)
    process.exit(1)
  }
  if (!existsSync(SRC) || !statSync(SRC).isDirectory()) {
    console.error('[family-deps] packages/ui/src 不存在，请在仓库根运行。')
    process.exit(1)
  }
  return registry
}

function main() {
  const registry = loadRegistry()
  const entryLayer = registry.entryLayer
  const leafLayer = registry.leafLayer

  const graph = scanGraph(SRC, { entryLayer, leafLayer })

  const shapeProblems = registryShapeProblems(registry, graph.families, entryLayer, leafLayer)
  if (shapeProblems.length) {
    for (const p of shapeProblems) console.error(`FAIL [登记表形状] ${p}`)
    console.error('[family-deps] 登记表自身不合法（fail closed），请先修复 scripts/family-deps-registry.json。')
    process.exit(1)
  }

  let fail = false

  // 1. 未登记跨族边（含指向入口层的反向依赖）
  for (const { from, to, files, reason } of crossFamilyViolations(graph, registry)) {
    fail = true
    const label = reason === 'entry-layer' ? '入口层不被反向依赖' : '跨族边未登记'
    console.error(`FAIL [${label}] ${from} → ${to}（${files.length} 个文件）`)
    for (const f of files.slice(0, 10)) console.error(`       ${relative(ROOT, f).replaceAll(sep, '/')}`)
    if (files.length > 10) console.error(`       …共 ${files.length} 个文件`)
    console.error('       先确认方向是否合理：跨族依赖须在本表登记（scripts/family-deps-registry.json，附 reason）；')
    console.error('       若属共享内核复用，优先下沉到 shared 叶子层（任意族 → shared 放行）。')
  }

  // 2. 登记条目失效（现状零命中 = 空头审批）
  for (const edge of staleEdgeViolations(graph, registry)) {
    fail = true
    console.error(
      `FAIL [登记条目失效] ${edge.from} → ${edge.to} 现状零命中：事实已消失，请删除该登记条目（空头审批会放行未来回潮）`,
    )
  }

  // 3. 环簇检测（登记边构成族级有向图；覆盖面 = 族间依赖边——族→shared 叶子方向
  //    不参与环检测，shared⇄family 双向 import 为「叶子实现居 shared」既定分层设计，
  //    非依赖异味，见脚本头注覆盖面声明）
  {
    const edgeMap = new Map()
    for (const edge of registry.edges) {
      if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, new Set())
      edgeMap.get(edge.from).add(edge.to)
    }
    const foundSccs = findSccs(edgeMap)
    const violations = cycleViolations(foundSccs, registry.knownCycles)
    for (const v of violations) {
      fail = true
      if (v.reason === 'unknown-cycle') {
        console.error(
          `FAIL [新环簇] 登记边闭合环簇 ${v.scc.join(' ⇄ ')}：未在 knownCycles 留名——登记反边前先评估能否下沉 shared 叶子层；确属设计内回环请在 knownCycles 留名并写明理由`,
        )
      } else {
        console.error(
          `FAIL [环簇留名失效] knownCycles 留名的环簇（${v.entry.nodes.join('、')}）现状已不存在：环簇已溶解，请删除该留名条目（空头留名会掩盖未来回潮）`,
        )
      }
    }
    // 已批准留名的环簇单独判定（不能借 cycleViolations——其 stale 检查面向
    // 全量普查，会把其它 knownCycles 条目对不上单簇误判为失效，污染 named 集合）
    const named = namedSccs(foundSccs, registry.knownCycles)
    for (const scc of named) console.log(`PASS [环簇已批准留名] ${scc.join(' ⇄ ')}（knownCycles 留名）`)
    if (!violations.length && !named.length) console.log('PASS [环检测] 族级依赖图无环簇（无环）')
  }

  // 汇总
  const leafCount = [...graph.leafEdges.values()].reduce((n, s) => n + s.size, 0)
  if (!fail) {
    console.log(
      `PASS [族间依赖] 扫描 ${graph.families.length} 族 / ${graph.fileCount} 个生产文件：` +
        `${registry.edges.length} 条登记边全部命中（叶子方向 ${graph.leafEdges.size} 族边 ${leafCount} 处放行），无未登记边、无失效条目、无未留名环；` +
        '环检测覆盖面 = 族间（shared 以外）依赖边——族→shared 叶子方向不参与环检测（shared⇄family 双向为「叶子实现居 shared」既定分层设计，非依赖异味）',
    )
    process.exit(0)
  }
  console.error('[family-deps] 族间依赖门禁未通过。')
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
