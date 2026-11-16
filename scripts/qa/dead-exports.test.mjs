import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPT = fileURLToPath(new URL('./dead-exports.mjs', import.meta.url))

/** 在临时目录里铺一份最小仓库（key 为相对路径） */
function createFixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'oas-dead-exports-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return root
}

function runScript(root, args = []) {
  const result = spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], {
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}

function runJson(root, args = []) {
  const stdout = runScript(root, ['--json', ...args])
  const parsed = JSON.parse(stdout)
  assert.ok(Array.isArray(parsed), '--json 必须输出结构化数组')
  return parsed
}

const names = (candidates) => candidates.map((candidate) => `${candidate.name}:${candidate.kind}`)

test('公共入口的直接导出 / 别名导出 / export * 递归链不报', (t) => {
  const root = createFixture(t, {
    'src/index.ts': [
      "export { A } from './a.js'",
      "export { B as RenamedB } from './b.js'",
      "export * from './barrel.js'",
      "export * from './nested/entry.js'",
      '',
    ].join('\n'),
    'src/ssr.ts': "export { E } from './e.js'\n",
    'src/a.ts': 'export const A = 1\n',
    'src/b.ts': 'export const B = 2\n',
    'src/e.ts': 'export const E = 5\n',
    'src/barrel.ts': ["export * from './deep.js'", "export { C } from './c.js'", ''].join('\n'),
    'src/deep.ts': ['export interface Deep { x: number }', 'export type DeepAlias = string', ''].join('\n'),
    'src/c.ts': 'export type C = string\n',
    'src/nested/entry.ts': 'export class NestedClass {}\n',
  })

  assert.deepEqual(runJson(root), [])
})

test('--root 支持相对当前工作目录的路径', (t) => {
  const root = createFixture(t, {
    'src/index.ts': 'export const Entry = 1\n',
    'src/inner.ts': 'export const lonely = 1\n',
  })
  const result = spawnSync(process.execPath, [SCRIPT, '--root', basename(root), '--json'], {
    cwd: dirname(root),
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(
    JSON.parse(result.stdout).map((candidate) => candidate.file),
    ['src/inner.ts'],
  )
})

test('package.json#exports 指向的源文件同样视为公共入口', (t) => {
  const root = createFixture(t, {
    'packages/demo/package.json': JSON.stringify({
      name: '@demo/demo',
      exports: {
        '.': { types: './dist/types/index.d.ts', default: './dist/index.js' },
        './format': { types: './dist/format.d.ts', default: './dist/format.js' },
      },
    }),
    'packages/demo/src/format.ts': 'export interface FormatOptions { x: string }\n',
    'packages/demo/src/internal.ts': 'export const notExported = 1\n',
  })

  assert.deepEqual(names(runJson(root)), ['notExported:const'])
})

test('内部未引用导出按 kind 报出，行号跳过注释与多行块', (t) => {
  const root = createFixture(t, {
    'src/index.ts': 'export const Entry = 1\n',
    'src/inner.ts': [
      '/* 注释里出现的 UnusedShape 不算导出 */',
      '  继续注释',
      '*/',
      'export interface UnusedShape { a: string }',
      'export type UnusedAlias = string',
      'export const unusedConst = 1',
      'export function unusedFn() {',
      '  return 2',
      '}',
      'export enum UnusedEnum { A }',
      'export class UnusedClass {}',
      'export let unusedLet = 1',
      '',
    ].join('\n'),
  })

  const candidates = runJson(root)
  assert.deepEqual(names(candidates), [
    'UnusedShape:interface',
    'UnusedAlias:type',
    'unusedConst:const',
    'unusedFn:function',
    'UnusedEnum:enum',
    'UnusedClass:class',
    'unusedLet:let',
  ])
  assert.equal(candidates[0].file, 'src/inner.ts')
  assert.equal(candidates[0].line, 4)
  assert.equal(candidates[3].line, 7)
})

test('被外部引用（测试 / 别名导入）不报；仅本文件自引用仍报', (t) => {
  const root = createFixture(t, {
    'src/index.ts': 'export const Entry = 1\n',
    'src/inner.ts': [
      'export const usedByTest = 1',
      'export const usedByAlias = 2',
      'export function selfUsed() {',
      '  return selfUsed',
      '}',
      '',
    ].join('\n'),
    'src/inner.test.ts': ["import { usedByTest } from './inner.js'", 'usedByTest()', ''].join('\n'),
    'src/consumer.ts': ["import { usedByAlias as renamed } from './inner.js'", 'renamed()', ''].join('\n'),
  })

  assert.deepEqual(names(runJson(root)), ['selfUsed:function'])
})

test('注释 / 字符串 / 模板 / 正则中的同名不算引用', (t) => {
  const root = createFixture(t, {
    'src/index.ts': 'export const Entry = 1\n',
    'src/inner.ts': 'export const ghost = 1\n',
    'src/noise.ts': [
      '// ghost 只在行注释里',
      '/* ghost 也在块注释里 */',
      "const text = 'ghost'",
      'const tpl = `ghost ${1}`',
      'const pattern = /ghost/g',
      'const divided = 4 / 2',
      '',
    ].join('\n'),
  })

  assert.deepEqual(names(runJson(root)), ['ghost:const'])
})

test('--only-runtime 排除 type / interface', (t) => {
  const root = createFixture(t, {
    'src/index.ts': 'export const Entry = 1\n',
    'src/inner.ts': [
      'export type OnlyType = string',
      'export interface OnlyShape { a: string }',
      'export const onlyConst = 1',
      'export function onlyFn() {}',
      '',
    ].join('\n'),
  })

  assert.deepEqual(names(runJson(root)), ['OnlyType:type', 'OnlyShape:interface', 'onlyConst:const', 'onlyFn:function'])
  assert.deepEqual(names(runJson(root, ['--only-runtime'])), ['onlyConst:const', 'onlyFn:function'])
})

test('缺失的相对模块安全跳过，不崩溃也不影响其它候选', (t) => {
  const root = createFixture(t, {
    'src/index.ts': ["export * from './missing.js'", "export * from './barrel.js'", ''].join('\n'),
    'src/barrel.ts': "export * from './also-missing.js'\n",
    'src/inner.ts': 'export const lonely = 1\n',
  })

  const candidates = runJson(root)
  assert.deepEqual(names(candidates), ['lonely:const'])
})

test('测试文件中的 export 不作为候选（引用仍计入）', (t) => {
  const root = createFixture(t, {
    'src/index.ts': 'export const Entry = 1\n',
    'src/helpers.test.ts': 'export function testOnlyHelper() {}\n',
    'src/inner.ts': 'export const usedInTest = 1\n',
    'src/use.test.ts': ["import { usedInTest } from './inner.js'", 'usedInTest()', ''].join('\n'),
  })

  assert.deepEqual(runJson(root), [])
})

test('默认文本报告给出总数、kind 分布与逐条位置', (t) => {
  const root = createFixture(t, {
    'src/index.ts': 'export const Entry = 1\n',
    'src/inner.ts': ['export const lonely = 1', 'export interface LonelyShape {}', ''].join('\n'),
  })

  const output = runScript(root)
  assert.match(output, /候选 2 个/)
  assert.match(output, /kind 分布：const 1 \/ interface 1/)
  assert.match(output, /src\/inner\.ts:1 lonely \(const\)/)
  assert.match(output, /src\/inner\.ts:2 LonelyShape \(interface\)/)
  assert.match(output, /报告型输出，不阻断/)
})
