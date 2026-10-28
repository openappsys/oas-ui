/**
 * 废弃台账校验规则自测（node:test，无第三方依赖）。
 *
 * 证明的是判定行为本身（纯函数，fixture 注入），而非「读一遍真仓库恰好一致」：
 * - removeIn 版本纪律：非空必须是高于当前版本的 major；普通 API 面（attribute/event/
 *   method/…）的 minor/patch 移除一律拒绝——checker 对普通 minor 移除保持失败；
 * - 单点例外（经批准的 minor 提升）：仅 `package-export` 面可携带 `minorException`
 *   （必填非空 approvedBy + reason）换取「同 major 且严格高于 currentVersion 的合法
 *   x.y.z」removeIn；更高 major 走普通 major 规则；同版本/降级/更低 minor/非法版本
 *   即使带 minorException 也一律拒绝；该豁免不得泛化到任何组件 API 面；
 * - package-export 面形状：tag 必须是包名，legacy/canonical 必须落在该包路径下；
 * - 既有判定不回归：重复 id、canonical 必须在 manifest、normalizeLegacyAlias 调用
 *   必须登记。
 *
 * 运行：`node --test scripts/api-docs/deprecations.test.mjs`（已接入 `pnpm deprecations:test`）。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

const { collectProblems, isApprovedMinorException } = await import('./deprecations-core.mjs')

const CURRENT = '2.6.4'

/** 一条最小可过的普通 alias 台账条目（canonical 在 manifest 内） */
const manifest = {
  'oas-input': {
    sourceFile: 'packages/ui/src/basic/input/oas-input.ts',
    attrs: [{ name: 'prefix-text' }],
    props: [],
    events: [],
    methods: [],
  },
}

const attrEntry = {
  id: 'DEP-ATTR-9999',
  tag: 'oas-input',
  surface: 'attribute',
  legacy: 'prefix',
  canonical: 'prefix-text',
  kind: 'alias',
  state: 'silent-compat',
  removeIn: null,
  warning: 'none',
  migration: 'prefix -> prefix-text',
}

/** Task 4A 的单点例外条目（package-export，经用户批准的 minor 提升 2.6.4 → 2.6.5） */
const exportEntry = {
  id: 'DEP-EXPORT-0001',
  tag: '@oas-ui/ui',
  surface: 'package-export',
  legacy: '@oas-ui/ui/data/table/core',
  canonical: '@oas-ui/ui/data/table',
  kind: 'alias',
  state: 'removed',
  removeIn: '2.6.5',
  warning: 'none',
  migration: 'import from @oas-ui/ui/data/table',
  minorException: {
    approvedBy: '用户（2026-10-28）',
    reason: '默认入口等价别名，v2.6.4 已预告；用户批准的单点例外',
  },
}

const run = (entries, over = {}) =>
  collectProblems({ entries, currentVersion: CURRENT, manifest, sourceCalls: [], ...over })

test('单点例外：package-export + minorException + removeIn 2.6.5 → 接受', () => {
  const problems = run([exportEntry])
  assert.deepEqual(problems, [], `应无问题：${problems.join(' | ')}`)
  assert.equal(isApprovedMinorException(exportEntry), true)
})

test('普通 minor 移除必须被拒绝：attribute 面 removeIn 2.6.5 → 报版本纪律问题', () => {
  const problems = run([{ ...attrEntry, removeIn: '2.6.5' }])
  assert.equal(problems.length, 1, `应恰好一条问题：${problems.join(' | ')}`)
  assert.match(problems[0], /DEP-ATTR-9999/)
  assert.match(problems[0], /major/)
  assert.equal(isApprovedMinorException({ ...attrEntry, removeIn: '2.6.5' }), false)
})

test('package-export 不带 minorException 的非 major removeIn → 拒绝（例外不得缺省成立）', () => {
  const { minorException, ...bare } = exportEntry
  const problems = run([bare])
  assert.equal(problems.length, 1, `应恰好一条问题：${problems.join(' | ')}`)
  assert.match(problems[0], /major/)
})

test('minorException 泛化防护：普通 API 面携带 minorException → 拒绝（豁免仅限 package-export）', () => {
  const problems = run([
    {
      ...attrEntry,
      removeIn: '2.6.5',
      minorException: { approvedBy: '用户', reason: '想提前删属性别名' },
    },
  ])
  const joined = problems.join(' | ')
  assert.match(joined, /minorException/, '应指出 minorException 仅限 package-export')
  assert.match(joined, /major/, '版本纪律问题也应同时存在')
})

test('minorException 缺批准方 / 缺理由 / 空白 → 拒绝（approvedBy 与 reason 均须非空字符串）', () => {
  const bads = [
    undefined,
    null,
    {},
    { approvedBy: '用户' },
    { reason: '   ' },
    { reason: '有理由但缺批准方' },
    { approvedBy: '   ', reason: 'x' },
    { approvedBy: 42, reason: 'x' },
    '口头批准',
  ]
  for (const bad of bads) {
    const problems = run([{ ...exportEntry, minorException: bad }])
    assert.ok(
      problems.some((p) => /minorException/.test(p)),
      `minorException=${JSON.stringify(bad)} 应被拒：${problems.join(' | ')}`,
    )
    assert.equal(isApprovedMinorException({ ...exportEntry, minorException: bad }), false)
  }
})

test('例外只允许「同 major 且严格高于 currentVersion」的合法 x.y.z minor 提升', () => {
  // 接受：同 major、版本严格更高（patch 或 minor 更高），豁免齐全
  for (const ok of ['2.6.5', '2.6.10', '2.7.0', '2.7.3']) {
    const problems = run([{ ...exportEntry, removeIn: ok }])
    assert.deepEqual(problems, [], `removeIn=${ok}（同 major 严格更高 + 豁免）应接受：${problems.join(' | ')}`)
  }
  // 拒绝：同版本 / patch 降级 / 更低 minor / 更低 major / 非法版本——即使带 minorException
  for (const bad of ['2.6.4', '2.6.3', '2.5.9', '1.9.0', '2.6', '2.6.5-beta.1', 'abc', 'v2.6.5', '']) {
    const problems = run([{ ...exportEntry, removeIn: bad }])
    assert.equal(
      problems.length,
      1,
      `removeIn=${JSON.stringify(bad)}（即使带豁免）应恰有一条拒绝：${problems.join(' | ')}`,
    )
    assert.match(problems[0], /major/)
    assert.match(problems[0], /minor 提升/, '拒绝原因应说明例外仅限经批准的 minor 提升')
  }
})

test('更高 major 走普通 major 规则：无需豁免即放行（豁免只作用于 minor 提升路径）', () => {
  const { minorException, ...bare } = exportEntry
  assert.deepEqual(run([{ ...bare, removeIn: '3.0.0' }]), [], '3.0.0 应由 major 规则放行，无需豁免')
  assert.deepEqual(run([{ ...exportEntry, removeIn: '3.0.0' }]), [], '3.0.0 带豁免同样放行')
})

test('package-export 形状：tag 必须是包名，legacy/canonical 必须落在该包路径下', () => {
  const problems = run([
    { ...exportEntry, tag: 'oas-input' },
    { ...exportEntry, id: 'X1', legacy: '@oas-ui/icons/other' },
    { ...exportEntry, id: 'X2', canonical: 'data/table' },
  ])
  assert.match(problems.join(' | '), /包名/)
  assert.match(problems.join(' | '), /X1/)
  assert.match(problems.join(' | '), /X2/)
})

test('既有判定不回归：重复 id / canonical 不在 manifest / 未登记 normalizeLegacyAlias 调用', () => {
  const dup = run([attrEntry, attrEntry])
  assert.ok(
    dup.some((p) => /重复 id/.test(p)),
    `应报重复 id：${dup.join(' | ')}`,
  )

  const missing = run([{ ...attrEntry, canonical: 'nope' }])
  assert.ok(
    missing.some((p) => /canonical nope 不在/.test(p)),
    `应报 canonical 缺失：${missing.join(' | ')}`,
  )

  const unregistered = run([attrEntry], {
    sourceCalls: [{ file: 'packages/ui/src/basic/input/oas-input.ts', canonical: 'prefix-text', legacy: 'ghost' }],
  })
  assert.ok(
    unregistered.some((p) => /未登记别名/.test(p) && /ghost/.test(p)),
    `应报未登记调用：${unregistered.join(' | ')}`,
  )
})

test('合法既有台账形态继续通过（alias 登记 + removed 墓碑）', () => {
  const problems = run([
    attrEntry,
    {
      id: 'DEP-REMOVED-9999',
      tag: 'oas-input',
      surface: 'attribute',
      legacy: 'arrow-point-at-center',
      canonical: null,
      kind: 'removed',
      state: 'removed',
      removeIn: null,
      warning: 'none',
      migration: 'removed',
    },
  ])
  assert.deepEqual(problems, [], `应无问题：${problems.join(' | ')}`)
})
