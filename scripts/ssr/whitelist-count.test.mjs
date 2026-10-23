/**
 * SSR 白名单计数门禁的自测（node:test，无第三方依赖）。
 *
 * 目的：证明「WHITELIST 数量 ≠ 文档计数」会失败——不只是读一遍真仓库恰好一致。
 * 运行：`node --test scripts/ssr/whitelist-count.test.mjs`（已接入 `pnpm ssr:check`）
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkWhitelistCounts, parseWhitelistSource } from './whitelist-count.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const real = (file) => readFileSync(join(ROOT, file), 'utf8')

/** 构造一组「全部一致」的文档内容 */
function docs(count) {
  return {
    'docs/ssr.md': `- 白名单（…，共 ${count} tag）：\`oas-button\``,
    'packages/docs/docs/guide/ssr.md': `- 白名单（…，共 ${count} tag）：\`oas-button\``,
    'packages/docs/docs/en/guide/ssr.md': `- Whitelist (${count} tags in total): \`oas-button\``,
    'docs/ROADMAP.md': `- SSR 白名单当前 ${count} tag`,
  }
}
const readFrom = (map) => (file) => map[file] ?? ''

test('计数一致时无问题', () => {
  assert.deepEqual(checkWhitelistCounts({ expected: 162, read: readFrom(docs(162)) }), [])
})

test('docs/ssr.md 计数与 WHITELIST 不一致即失败（含两处数值）', () => {
  const map = docs(162)
  map['docs/ssr.md'] = '- 白名单（…，共 163 tag）：`oas-button`'
  const problems = checkWhitelistCounts({ expected: 162, read: readFrom(map) })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /docs\/ssr\.md/)
  assert.match(problems[0], /163/)
  assert.match(problems[0], /162/)
})

test('英文 guide 的 tags in total 同样受校验', () => {
  const map = docs(162)
  map['packages/docs/docs/en/guide/ssr.md'] = '- Whitelist (160 tags in total)'
  const problems = checkWhitelistCounts({ expected: 162, read: readFrom(map) })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /packages\/docs\/docs\/en\/guide\/ssr\.md/)
})

test('缺少计数声明视为失败（防文案改写悄悄绕过门禁）', () => {
  const map = docs(162)
  map['docs/ssr.md'] = '- 白名单：`oas-button`（数量见 WHITELIST）'
  const problems = checkWhitelistCounts({ expected: 162, read: readFrom(map) })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /缺少白名单数量声明/)
})

test('必需文档缺失（read 返回 null）即失败', () => {
  const map = docs(162)
  const read = (file) => (file === 'docs/ssr.md' ? null : (map[file] ?? ''))
  const problems = checkWhitelistCounts({ expected: 162, read })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /docs\/ssr\.md/)
  assert.match(problems[0], /不存在/)
})

test('ROADMAP 计数缺失时不报（保持既有可选口径）', () => {
  const map = docs(162)
  delete map['docs/ROADMAP.md']
  assert.deepEqual(checkWhitelistCounts({ expected: 162, read: readFrom(map) }), [])
})

test('解析 WHITELIST 源码得到 tag 列表', () => {
  const source = `export const WHITELIST = ['oas-button', 'oas-tag'] as const`
  assert.deepEqual(parseWhitelistSource(source), ['oas-button', 'oas-tag'])
})

test('真实仓库：WHITELIST 数量与全部文档计数一致', () => {
  const whitelist = parseWhitelistSource(real('packages/ssr/src/index.ts'))
  assert.ok(whitelist.length > 0)
  assert.deepEqual(checkWhitelistCounts({ expected: whitelist.length, read: real }), [])
})
