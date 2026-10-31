/**
 * ci-steps.mjs 的自测（node:test，无第三方依赖）：
 * - 单行 / 多行块步骤按序解析；`- uses:` 不收；
 * - job 边界不越界：相邻 job（ssr-fixtures / e2e）的步骤不能混进 test；
 * - job 不存在 / 空 job / 混写 `- name:` / `- run: >` 折叠标量抛错（fail closed，
 *   不能被当成「0 步通过」或悄悄少跑步骤）；
 * - 真实 `.github/workflows/ci.yml` 的 test job 至少包含发布关键门禁
 *   （format:check / qa:audit:check / llms:check）——防「CI 步骤改了但门禁悄悄丢步」。
 *
 * 运行：`node --test scripts/release/ci-steps.test.mjs`（已接入 `pnpm release:check:test`）。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { parseJobRunSteps } from './ci-steps.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CI_YML = join(ROOT, '.github', 'workflows', 'ci.yml')

/** 对照真实 ci.yml 的人工微缩版：三个 job + 单行/多行块/`- name:`+缩进 `run:` 三种形态 */
const FIXTURE = [
  'name: fixture',
  'on: push',
  '',
  'jobs:',
  '  test:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: pnpm format:check',
  '      - run: |',
  '          echo "step A"',
  '          echo "step B"',
  '      - run: pnpm test',
  '  ssr-fixtures:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - name: Install fixture',
  '        run: pnpm install --frozen-lockfile',
  '      - run: pnpm build-fixture',
  '  e2e:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - run: pnpm test:e2e',
  '',
].join('\n')

test('单行 - run: 按出现顺序解析；- uses: 不收', () => {
  const steps = parseJobRunSteps(
    [
      'jobs:',
      '  test:',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - run: pnpm format:check',
      '      - run: pnpm skill:check',
      '',
    ].join('\n'),
    'test',
  )
  assert.deepEqual(steps, ['pnpm format:check', 'pnpm skill:check'])
})

test('多行块 - run: | 按缩进收集并 join 成一条命令，块后步骤不被吞', () => {
  const steps = parseJobRunSteps(
    [
      'jobs:',
      '  test:',
      '    steps:',
      '      - run: |',
      '          echo "step A"',
      '          echo "step B"',
      '      - run: pnpm after-block',
      '',
    ].join('\n'),
    'test',
  )
  assert.deepEqual(steps, ['echo "step A"\necho "step B"', 'pnpm after-block'])
})

test('D1：块内容含 - run: / - name: 行 → 只算块原文，不得重复执行或误触发抛错', () => {
  const steps = parseJobRunSteps(
    [
      'jobs:',
      '  test:',
      '    steps:',
      '      - run: |',
      '          echo a',
      '          - run: evil',
      '          - name: x',
      '',
    ].join('\n'),
    'test',
  )
  assert.equal(steps.length, 1, `块内容必须整体归入块原文（恰好 1 条步骤）：${JSON.stringify(steps)}`)
  assert.equal(steps[0], 'echo a\n- run: evil\n- name: x')
})

test('job 边界：相邻 job 的步骤不混入（ssr-fixtures / e2e 均不泄漏进 test）', () => {
  const testSteps = parseJobRunSteps(FIXTURE, 'test')
  assert.ok(!testSteps.some((s) => s.includes('fixture')), 'ssr-fixtures 的步骤不应混入 test')
  assert.ok(!testSteps.some((s) => s.includes('e2e')), 'e2e 的步骤不应混入 test')
  // test 的多行块步骤完整保留（不因 job 截断丢行）
  assert.ok(testSteps.some((s) => s.includes('step A') && s.includes('step B')))
})

test('单独解析相邻 job：纯 - run: 的 e2e 正常；含 - name: 的 ssr-fixtures 抛错（不静默丢步）', () => {
  assert.deepEqual(parseJobRunSteps(FIXTURE, 'e2e'), ['pnpm test:e2e'])
  // ssr-fixtures 用了 `- name:` + 缩进 `run:` 混写——解析它必须 fail closed，而不是只收 `- run:` 步骤
  assert.throws(() => parseJobRunSteps(FIXTURE, 'ssr-fixtures'), /不支持的步骤写法/)
})

test('C3：被解析 job 内 - name: + 缩进 run: 混写 → 抛错（静默忽略会悄悄少跑步骤）', () => {
  const yml = [
    'jobs:',
    '  test:',
    '    steps:',
    '      - run: pnpm format:check',
    '      - name: Mixed style step',
    '        run: pnpm mixed-step',
    '      - run: pnpm llms:check',
    '',
  ].join('\n')
  assert.throws(() => parseJobRunSteps(yml, 'test'), /不支持的步骤写法/)
})

test('C3：纯 - name: 步骤（无 run）在被解析 job 内同样抛错', () => {
  const yml = [
    'jobs:',
    '  test:',
    '    steps:',
    '      - name: Upload artifacts',
    '        uses: actions/upload@v4',
    '',
  ].join('\n')
  assert.throws(() => parseJobRunSteps(yml, 'test'), /不支持的步骤写法/)
})

test('C3：- run: > 折叠标量 → 抛错（不按块标量误拼换行）', () => {
  for (const marker of ['>', '>-', '>+']) {
    const yml = ['jobs:', '  test:', '    steps:', `      - run: ${marker}`, '          echo folded', ''].join('\n')
    assert.throws(() => parseJobRunSteps(yml, 'test'), /折叠标量/, `- run: ${marker} 应抛错`)
  }
})

test('job 不存在 → 抛错（fail closed）', () => {
  assert.throws(() => parseJobRunSteps(FIXTURE, 'nope'), /找不到 job/)
  assert.throws(() => parseJobRunSteps('', 'test'), /为空/)
})

test('空 job（无 run 步骤）→ 抛错，不能被静默当成「0 步通过」', () => {
  const yml = ['jobs:', '  test:', '    runs-on: ubuntu-latest', '  other:', '    steps:', '      - run: x', ''].join(
    '\n',
  )
  assert.throws(() => parseJobRunSteps(yml, 'test'), /0 个 run: 步骤/)
})

test('真实 ci.yml：test job 含 install 首步与发布关键门禁（防 CI 改步骤悄悄丢步）', () => {
  const steps = parseJobRunSteps(readFileSync(CI_YML, 'utf8'), 'test')
  assert.ok(steps.length >= 16, `test job 应至少 16 步，实得 ${steps.length}`)
  assert.equal(steps[0], 'pnpm install --frozen-lockfile')
  for (const must of ['pnpm format:check', 'pnpm qa:audit:check', 'pnpm llms:check']) {
    assert.ok(steps.includes(must), `test job 缺关键门禁「${must}」——CI 步骤与发布清单脱节？`)
  }
  assert.ok(!steps.some((s) => s.includes('test:e2e')), 'e2e 命令不应出现在 test job 步骤里（job 边界泄漏）')
})
