/**
 * 废弃台账校验规则自测（node:test，无第三方依赖）。
 *
 * 证明的是判定行为本身（纯函数，fixture 注入），而非「读一遍真仓库恰好一致」：
 * - removeIn 版本纪律：非空必须是高于当前版本的 major；普通 API 面（attribute/event/
 *   method/…）的 minor/patch 移除一律拒绝——checker 对普通 minor 移除保持失败；
 * - 单点例外：仅 `package-export` 面可携带 `minorException`（用户批准 + 必填理由）
 *   换取非 major 的 removeIn；该豁免不得泛化到任何组件 API 面；
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

/** Task 4A 的单点例外条目（package-export，经用户批准的 minor 移除） */
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

test('minorException 缺理由 / 空白理由 → 拒绝（批准必须携带理由）', () => {
  for (const bad of [undefined, null, {}, { approvedBy: '用户' }, { reason: '   ' }, '口头批准']) {
    const problems = run([{ ...exportEntry, minorException: bad }])
    assert.ok(
      problems.some((p) => /minorException/.test(p)),
      `minorException=${JSON.stringify(bad)} 应被拒：${problems.join(' | ')}`,
    )
  }
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
