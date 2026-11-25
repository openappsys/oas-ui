import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  crossFamilyViolations,
  cycleViolations,
  extractSpecs,
  findSccs,
  registryShapeProblems,
  resolveTargetFamily,
  scanGraph,
  staleEdgeViolations,
} from './check-family-deps.mjs'
import { stripComments } from './qa/assert-audit.mjs'

/* ------------------------- extractSpecs（含形状守卫） ------------------------- */

test('extractSpecs：静态 from / 副作用 / 动态 import 都收集', () => {
  const specs = extractSpecs(`
    import { a } from '../shared/x.js'
    import '../basic/icon/index.js'
    const m = import('../feedback/tooltip/index.js')
    export { b } from '../data/virtual-list/index.js'
  `)
  assert.ok(specs.has('../shared/x.js'))
  assert.ok(specs.has('../basic/icon/index.js'))
  assert.ok(specs.has('../feedback/tooltip/index.js'))
  assert.ok(specs.has('../data/virtual-list/index.js'))
})

test('extractSpecs：注释里的示例 import 不算（需先 stripComments）', () => {
  const code = stripComments(`
    // import { x } from '../commerce/cart/index.js'
    /* 按需引入：import { toCsv } from '../data/gantt/export/index.js' */
    import { a } from '../shared/x.js'
  `)
  const specs = extractSpecs(code)
  assert.deepEqual([...specs], ['../shared/x.js'])
})

test('extractSpecs：字符串/属性名中的 from 不误报（形状守卫）', () => {
  const specs = extractSpecs(`n.setAttribute("data-from", t)\nconst v = el.getAttribute("from")`)
  assert.equal(specs.size, 0)
})

test('extractSpecs：单引号字符串里的 https:// 不当副作用 import', () => {
  const specs = extractSpecs(`const u = 'https://example.com/a.js'`)
  assert.equal(specs.size, 0)
})

/* ------------------------- resolveTargetFamily ------------------------- */

const FAMILIES = ['basic', 'commerce', 'form', 'feedback', 'shared']

test('resolveTargetFamily：.js 后缀映射 .ts、index 目录、无后缀兜底', () => {
  const src = makeSrc({
    'basic/icon/index.ts': '',
    'shared/dev-warn.ts': '',
    'form/helper.ts': '',
  })
  try {
    const from = join(src, 'form', 'oas-form.ts')
    assert.equal(resolveTargetFamily(src, from, '../basic/icon/index.js', FAMILIES), 'basic')
    assert.equal(resolveTargetFamily(src, from, '../shared/dev-warn.js', FAMILIES), 'shared')
    assert.equal(resolveTargetFamily(src, from, './helper.js', FAMILIES), 'form')
    assert.equal(resolveTargetFamily(src, from, './helper', FAMILIES), 'form')
    assert.equal(resolveTargetFamily(src, from, './missing.js', FAMILIES), null)
    assert.equal(resolveTargetFamily(src, from, '@oas-ui/core/oas-element', FAMILIES), null)
  } finally {
    rmSync(src, { recursive: true, force: true })
  }
})

/* ------------------------- scanGraph（fixture 树） ------------------------- */

/** 构造临时 src 树；key 为正斜杠相对路径 */
function makeSrc(files) {
  const src = join(mkdtempSync(join(tmpdir(), 'family-deps-')), 'src')
  for (const [rel, content] of Object.entries(files)) {
    const full = join(src, ...rel.split('/'))
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content)
  }
  return src
}

const FIXTURE = {
  // 入口层：整体跳过（里面的跨族 import 不入图）
  'families/form.ts': `import '../basic/icon/index.js'\nimport '../commerce/cart/index.js'\n`,
  // 族 → 族（静态 + 动态 + 副作用三种形态）
  'form/oas-form.ts': `
    import { a } from './helper.js'
    import '../basic/icon/index.js'
    import '../shared/dev-warn.js'
    import '../families/form.js'
    const lazy = () => import('../feedback/tooltip/index.js')
  `,
  'form/helper.ts': `export const a = 1\n`,
  // 测试夹具排除：跨族 import 不计
  'form/oas-form.test.ts': `import '../commerce/cart/index.js'\n`,
  'basic/icon/index.ts': `import '../../shared/dev-warn.js'\n`,
  // 叶子反向边：shared → form
  'shared/dev-warn.ts': `import '../form/helper.js'\n`,
  'feedback/tooltip/index.ts': ``,
  'commerce/cart/index.ts': ``,
}

function scanFixture() {
  const src = makeSrc(FIXTURE)
  try {
    return { src, ...scanGraph(src, { entryLayer: 'families', leafLayer: 'shared' }) }
  } finally {
    rmSync(src, { recursive: true, force: true })
  }
}

test('scanGraph：族→族 / 叶子方向 / 叶子反向 / 入口层各归其位', () => {
  const g = scanFixture()
  assert.deepEqual([...g.edges.keys()].sort(), ['form>basic', 'form>families', 'form>feedback', 'shared>form'])
  // 叶子方向（任意族 → shared）放行，不进 edges
  assert.deepEqual([...g.leafEdges.keys()].sort(), ['basic>shared', 'form>shared'])
  // families 入口层文件不计入生产文件数
  assert.ok(![...g.edges.values()].some((files) => [...files].some((f) => f.includes('families'))))
})

test('scanGraph：.test.ts 夹具的跨族 import 被排除', () => {
  const g = scanFixture()
  assert.ok(!g.edges.has('form>commerce'))
})

test('crossFamilyViolations：未登记边与入口层反向依赖报红，已登记边与叶子方向放行', () => {
  const g = scanFixture()
  const registry = {
    entryLayer: 'families',
    leafLayer: 'shared',
    edges: [
      { from: 'form', to: 'basic', reason: 'fixture' },
      { from: 'shared', to: 'form', reason: 'fixture 反向边' },
    ],
    knownCycles: [],
  }
  const violations = crossFamilyViolations(g, registry)
  assert.deepEqual(violations.map((v) => `${v.from}>${v.to}:${v.reason}`).sort(), [
    'form>families:entry-layer',
    'form>feedback:unregistered',
  ])
})

test('staleEdgeViolations：登记条目现状零命中报失效', () => {
  const g = scanFixture()
  const registry = {
    edges: [
      { from: 'form', to: 'basic', reason: 'fixture 真实存在' },
      { from: 'commerce', to: 'form', reason: 'fixture 幽灵条目' },
    ],
  }
  const stale = staleEdgeViolations(g, registry)
  assert.equal(stale.length, 1)
  assert.equal(stale[0].from, 'commerce')
  assert.equal(stale[0].to, 'form')
})

/* ------------------------- 环簇（SCC）红绿两侧 ------------------------- */

const graphOf = (pairs) => {
  const m = new Map()
  for (const [from, to] of pairs) {
    if (!m.has(from)) m.set(from, new Set())
    m.get(from).add(to)
  }
  return m
}

test('findSccs：无环图全单点、二元环、三元环、双环分簇', () => {
  assert.deepEqual(
    findSccs(
      graphOf([
        ['a', 'b'],
        ['b', 'c'],
      ]),
    ),
    [['a'], ['b'], ['c']],
  )
  assert.deepEqual(
    findSccs(
      graphOf([
        ['a', 'b'],
        ['b', 'a'],
      ]),
    ),
    [['a', 'b']],
  )
  assert.deepEqual(
    findSccs(
      graphOf([
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'a'],
      ]),
    ),
    [['a', 'b', 'c']],
  )
  assert.deepEqual(
    findSccs(
      graphOf([
        ['a', 'b'],
        ['b', 'a'],
        ['c', 'd'],
        ['d', 'c'],
      ]),
    ),
    [
      ['a', 'b'],
      ['c', 'd'],
    ],
  )
})

test('findSccs：指向环簇的入边/出边不改变簇边界', () => {
  // a⇄b 为簇；x→a（入边）、b→y（出边）都不入簇
  assert.deepEqual(
    findSccs(
      graphOf([
        ['a', 'b'],
        ['b', 'a'],
        ['x', 'a'],
        ['b', 'y'],
      ]),
    ),
    [['a', 'b'], ['x'], ['y']],
  )
})

test('cycleViolations：留名环簇放行、新环簇报红、失效留名报红、单点忽略', () => {
  const known = [{ nodes: ['data', 'form'], reason: '现状环簇' }]
  // 现状簇命中（全量普查：单点分量忽略、已知簇双向通过）
  assert.deepEqual(cycleViolations([['data'], ['form'], ['data', 'form']], known), [])
  // 环簇咬合扩大：新簇未留名（unknown-cycle）+ 旧留名随之失效（stale-cycle）双报
  const grown = cycleViolations([['data', 'form', 'feedback']], known)
  assert.equal(grown.length, 2)
  assert.deepEqual(grown.map((v) => v.reason).sort(), ['stale-cycle', 'unknown-cycle'])
  assert.deepEqual(grown.find((v) => v.reason === 'unknown-cycle').scc, ['data', 'feedback', 'form'])
  // 现状簇溶解后留名未收缩报 stale-cycle
  const dissolved = cycleViolations([['a'], ['b']], known)
  assert.equal(dissolved.length, 1)
  assert.equal(dissolved[0].reason, 'stale-cycle')
  // 全单点图 + 空留名 → 双向通过
  assert.deepEqual(cycleViolations([['a'], ['b']], []), [])
})

/* ------------------------- 登记表形状（fail closed） ------------------------- */

const VALID = {
  entryLayer: 'families',
  leafLayer: 'shared',
  edges: [{ from: 'form', to: 'shared', reason: 'leaf 放行向（示例）' }],
  knownCycles: [],
}

test('registryShapeProblems：合法登记表零问题', () => {
  assert.deepEqual(registryShapeProblems(VALID, ['form', 'shared'], 'families', 'shared'), [])
})

test('registryShapeProblems：缺 reason / 未知族 / 自环 / 指向入口层 / 留名缺节点都报红', () => {
  const problems = registryShapeProblems(
    {
      ...VALID,
      edges: [
        { from: 'form', to: 'shared' },
        { from: 'form', to: 'no-such-family', reason: 'x' },
        { from: 'form', to: 'form', reason: 'x' },
        { from: 'form', to: 'families', reason: 'x' },
      ],
      knownCycles: [{ nodes: ['form'], reason: '' }],
    },
    ['form', 'shared'],
    'families',
    'shared',
  )
  assert.ok(problems.some((p) => p.includes('edges[0]') && p.includes('reason')))
  assert.ok(problems.some((p) => p.includes("edges[1].to 'no-such-family'")))
  assert.ok(problems.some((p) => p.includes('edges[2]') && p.includes('族内边')))
  assert.ok(problems.some((p) => p.includes('edges[3]') && p.includes('入口层')))
  assert.ok(problems.some((p) => p.includes('knownCycles[0].nodes')))
})

test('registryShapeProblems：缺 entryLayer/edges/knownCycles 结构性字段报红', () => {
  const problems = registryShapeProblems({ edges: [] }, ['form'], 'families', 'shared')
  assert.ok(problems.some((p) => p.includes('entryLayer')))
  assert.ok(problems.some((p) => p.includes('edges 必须为非空数组')))
  assert.ok(problems.some((p) => p.includes('knownCycles')))
})

/* ------------------------- live 登记表自检（真实文件） ------------------------- */

test('live 登记表（scripts/family-deps-registry.json）形状合法', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const registry = JSON.parse(readFileSync(join(root, 'scripts/family-deps-registry.json'), 'utf8'))
  const src = join(root, 'packages/ui/src')
  const families = [
    'basic',
    'commerce',
    'conversation',
    'data',
    'feedback',
    'form',
    'framework',
    'layout',
    'navigation',
    'overlay',
    'shared',
    'workbench',
  ]
  assert.deepEqual(registryShapeProblems(registry, families, registry.entryLayer, registry.leafLayer), [])
  assert.equal(existsSync(src), true)
})
