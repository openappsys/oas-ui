import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { normalizeSpec, plan } from './component.mjs'

const SPEC = {
  name: 'foo-bar',
  group: 'conversation',
  zh: { title: 'FooBar', summary: '示例组件。' },
  en: { title: 'FooBar', summary: 'Example component.' },
  attrs: [{ name: 'label', type: 'string', default: '', desc: { zh: '标签', en: 'Label' } }],
  events: [{ name: 'change', detail: '{ value: string }', desc: { zh: '变化', en: 'Change' } }],
  slots: [{ name: '', desc: { zh: '内容', en: 'Content' } }],
  ssr: false,
}

test('normalizeSpec 归一化默认 className/tag', () => {
  const spec = normalizeSpec(SPEC)
  assert.equal(spec.className, 'OASFooBar')
  assert.equal(spec.tag, 'oas-foo-bar')
  assert.equal(spec.ssr, false)
})

test('normalizeSpec 拒绝非法组/名称', () => {
  assert.throws(() => normalizeSpec({ ...SPEC, name: 'FooBar' }), /kebab-case/)
  assert.throws(() => normalizeSpec({ ...SPEC, group: 'nope' }), /group/)
  assert.throws(() => normalizeSpec({ ...SPEC, en: {} }), /en.title/)
})

test('plan 生成源码/测试/文档并补丁注册入口', () => {
  const result = plan(SPEC)
  const paths = result.files.map((f) => f.path)
  assert.ok(paths.includes('packages/ui/src/conversation/foo-bar/oas-foo-bar.ts'))
  assert.ok(paths.includes('packages/ui/qa-regression/foo-bar.spec.ts'))
  assert.ok(paths.includes('packages/docs/docs/components/foo-bar.md'))
  assert.ok(paths.includes('packages/docs/docs/en/components/foo-bar.md'))
  const patchPaths = result.patches.map((p) => p.path)
  assert.ok(patchPaths.includes('packages/ui/src/index.ts'))
  assert.ok(patchPaths.includes('packages/ui/src/families/conversation.ts'))
  assert.ok(patchPaths.includes('packages/ui/src/ssr.ts'))
  assert.ok(patchPaths.includes('packages/ssr/src/not-ssr.ts'))
})

test('SSR 白名单补丁能在真实 index.ts 上同时写入 WHITELIST 与 TAG_ENTRY', () => {
  const result = plan({ ...SPEC, ssr: true })
  const patch = result.patches.find((p) => p.path === 'packages/ssr/src/index.ts')
  const input = readFileSync(join(process.cwd(), 'packages/ssr/src/index.ts'), 'utf8')
  const output = patch.fn(input)
  assert.match(output, /'oas-foo-bar'/)
  assert.match(output, /'oas-foo-bar': '@oas-ui\/ui\/conversation\/foo-bar'/)
})

test('文档 API 占位表使用规范表头，api:gen 可接管', () => {
  const result = plan(SPEC)
  const zh = result.files.find((f) => f.path.endsWith('/components/foo-bar.md'))
  assert.match(zh.content, /\| 属性 \| 说明 \| 类型 \| 默认值 \|/)
  assert.match(zh.content, /`label`/)
})

test('NOT_SSR 补丁插入到数组末尾且不破坏导出行', () => {
  const result = plan(SPEC)
  const patch = result.patches.find((p) => p.path === 'packages/ssr/src/not-ssr.ts')
  const input = 'export const NOT_SSR = [\n]\n\nexport const NOT_SSR_TAGS = new Set()\n'
  const output = patch.fn(input)
  assert.match(output, /oas-foo-bar/)
  assert.match(output, /NOT_SSR_TAGS/)
})
