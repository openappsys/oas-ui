/**
 * 未使用 CSS 类守卫单元测试（实现见同目录 hygiene-guards.mjs 头注释）。
 *
 * 本文件自包含口径摘要：
 * - 定义源：packages/ui/src 下非测试 .ts 里的 `const XXX_STYLE = \`...\``（含 `*_CSS`）模板；
 * - 使用源：类名出现的所有合法上下文——class 属性（含值内 ${} 插值）/ classList 参数 /
 *   className 与 setAttribute('class') 语句域 / querySelector 系选择器 / union 类型字面量 /
 *   class 数组（filter/join、类型标注、push）/ *CLASS* 常量数组 / 拼接前缀；
 * - 作用域：组件目录（packages/ui/src/<family>/<component>，递归整棵树）内所有文件 +
 *   shared / overlay / 根文件归全局使用源；全局作用域的定义（shared/overlay/根）以全仓为使用源；
 * - 测试文件（*.test.ts）参与「使用」统计（classList.contains / querySelector 断言是公开
 *   DOM 契约），但不产生「定义」（style-conventions.test.ts 等含 CSS 示例片段）。
 *
 * i18n 死键精确集合由 packages/i18n/src/slices/completeness.test.ts 的 EXPECTED_DEAD
 * （当前 8 键）双向断言覆盖（pnpm test），本守卫不重复实现。
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyCssClassExceptions,
  auditUnusedCssClasses,
  collectCssUsageByScope,
  extractClassUsageTokens,
  findUnusedCssClasses,
  loadCssClassExceptions,
  usageTokensFor,
} from './hygiene-guards.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BUTTON = 'packages/ui/src/basic/button/oas-button.ts'

const usageOf = (source) => extractClassUsageTokens(source)

test('union 类型字面量视为使用，但 object 类型别名不得跨语句吞文本', () => {
  // 真 union：枚举值作为状态类（button type/size 同型）
  const unionSource = `
const STYLE = \`
.success { color: red; }
.warning { color: red; }
\`
export type ButtonType = 'default' | 'primary' | 'success' | 'warning'
`
  assert.deepEqual(findUnusedCssClasses(unionSource, BUTTON, usageOf(unionSource)), [])
  // object 类型别名：成员不是枚举值，且不能跨语句把后文引号内/裸词 tab 吃掉
  // （inspector .tab 实发漏检：旧 [^;]+ 吞到后文 'click tab' 字面量，把死类误判为使用）
  const objectSource = `
const STYLE = \`
.tab { color: red; }
\`
type MountOptions<T> = {
  props?: T
  target?: string
}
const tab = document.createElement('button')
const label = 'click tab'
`
  const violations = findUnusedCssClasses(objectSource, BUTTON, usageOf(objectSource))
  assert.deepEqual(
    violations.map((v) => v.className),
    ['tab'],
    'object 类型别名不得把后文裸词 tab 当类使用',
  )
})

test('带类型标注的 class 数组（const classes: string[] = []）及后续 push 视为使用', () => {
  // data/log 同型：ANSI 分段类名 push 进标注数组
  const source = `
const STYLE = \`
.ansi-bold { font-weight: bold; }
.ansi-fg-red { color: red; }
\`
const classes: string[] = []
if (seg.bold) classes.push('ansi-bold')
if (fg) classes.push(\`ansi-fg-\${fg}\`)
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('类字段形态（private data: string[] = []）同样视为使用', () => {
  const source = `
const STYLE = \`
.ansi-dim { opacity: .5; }
\`
class X {
  private classes: string[] = []
  m() {
    this.classes.push('ansi-dim')
  }
}
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('未引用的 CSS 类必报，已引用的不报', () => {
  const source = `
const STYLE = \`
.used { color: red; }
.orphan { color: blue; }
\`
const html = \`<div class="used"></div>\`
`
  const violations = findUnusedCssClasses(source, BUTTON, usageOf(source))
  assert.deepEqual(
    violations.map((v) => v.className),
    ['orphan'],
  )
  assert.equal(violations[0].rule, 'unused-css-class')
  assert.equal(violations[0].file, BUTTON)
  assert.match(violations[0].message, /unused-css-class/)
})

test('同一类多条选择器只报一次，行号落在选择器上', () => {
  const source = `
const STYLE = \`
.dup { color: red; }
.dup:hover,
.dup.active { color: blue; }
\`
`
  const violations = findUnusedCssClasses(source, BUTTON, new Set())
  assert.equal(violations.length, 1)
  assert.equal(violations[0].className, 'dup')
  assert.equal(violations[0].line, 3)
})

test('className 数组拼接（.filter(Boolean).join）里的字符串元素视为使用', () => {
  const source = `
const STYLE = \`
.has-icon { gap: 1px; }
.icon-only { width: 1px; }
\`
btn.className = [hasIcon ? 'has-icon' : '', iconOnly ? 'icon-only' : ''].filter(Boolean).join(' ')
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('class 数组的后续 .push 同样视为使用', () => {
  const source = `
const STYLE = \`
.line-highlight { background: yellow; }
\`
let classes = ['line-number']
if (hot) classes.push('line-highlight')
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('classList.add/toggle/remove 的字符串参数视为使用（多参数全收）', () => {
  const source = `
const STYLE = \`
.aa { color: red; }
.bb { color: red; }
.cc { color: red; }
\`
el.classList.add('aa', 'bb')
el.classList.toggle('cc', on)
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('class="..." 动态模板的静态段与插值内字符串视为使用', () => {
  const source = `
const STYLE = \`
.tail { color: red; }
.head { color: red; }
\`
const html = \`<span class="\${prefix} tail \${cond ? 'head' : ''}">\${icon}</span>\`
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('模板插值里的对象属性访问（obj.method）不误认为类选择器', () => {
  const source = `
const STYLE = \`
.panel { color: red; }
\`
const t = \`\${cfg.method} \${a.b}\`
const html = \`<div class="panel"></div>\`
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('CSS 注释里的 .fake 不算类定义；小数 .5 不算', () => {
  const source = `
const STYLE = \`
/* .fake { color: red; } */
.alpha { opacity: .5; }
\`
const html = \`<div class="alpha"></div>\`
`
  assert.deepEqual(findUnusedCssClasses(source, BUTTON, usageOf(source)), [])
})

test('使用源与定义源同目录跨文件：collectCssUsageByScope 按组件目录聚合', () => {
  const files = [
    'packages/ui/src/basic/button/oas-button.ts',
    'packages/ui/src/basic/button/helper.ts',
    'packages/ui/src/basic/tag/oas-tag.ts',
    'packages/ui/src/shared/aria-named.ts',
  ]
  const sources = new Map([
    ['packages/ui/src/basic/button/oas-button.ts', 'const html = `<div class="from-main"></div>`'],
    ['packages/ui/src/basic/button/helper.ts', "el.classList.add('from-helper')"],
    ['packages/ui/src/basic/tag/oas-tag.ts', 'const html = `<div class="tag-only"></div>`'],
    ['packages/ui/src/shared/aria-named.ts', "el.classList.add('from-shared')"],
  ])
  const scopes = collectCssUsageByScope(files, (f) => sources.get(f) ?? '')
  const buttonScope = 'packages/ui/src/basic/button'
  assert.ok(scopes.get(buttonScope).tokens.has('from-main'))
  assert.ok(scopes.get(buttonScope).tokens.has('from-helper'), '同目录跨文件应聚合')
  assert.ok(!scopes.get(buttonScope).tokens.has('tag-only'), '别的组件目录不算')
  assert.ok(!scopes.get(buttonScope).tokens.has('from-shared'), 'shared token 归全局槽，不进组件槽')
  assert.ok(usageTokensFor(scopes, buttonScope).tokens.has('from-shared'), '组件使用源经 usageTokensFor 合并全局槽')
  const sharedScope = scopes.get('shared')
  assert.equal(sharedScope.isGlobal, true)
  assert.ok(sharedScope.tokens.has('from-shared'))
})

test('usageTokensFor：组件作用域 = 本目录 + 全局；全局作用域 = 全仓', async () => {
  const files = ['packages/ui/src/basic/button/a.ts', 'packages/ui/src/basic/tag/b.ts', 'packages/ui/src/shared/c.ts']
  const sources = new Map([
    ['packages/ui/src/basic/button/a.ts', "el.classList.add('btn-x')"],
    ['packages/ui/src/basic/tag/b.ts', "el.classList.add('tag-x')"],
    ['packages/ui/src/shared/c.ts', "el.classList.add('shared-x')"],
  ])
  const scopes = collectCssUsageByScope(files, (f) => sources.get(f) ?? '')
  const buttonUsage = usageTokensFor(scopes, 'packages/ui/src/basic/button')
  assert.ok(buttonUsage.tokens.has('btn-x'))
  assert.ok(buttonUsage.tokens.has('shared-x'))
  assert.ok(!buttonUsage.tokens.has('tag-x'))
  const sharedUsage = usageTokensFor(scopes, 'shared')
  assert.ok(sharedUsage.tokens.has('tag-x'), 'shared 定义的使用源是全仓')
})

test('例外加载校验：缺 file / class / reason 都抛错', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const dir = mkdtempSync(join(tmpdir(), 'css-exc-'))
  const bad = join(dir, 'bad.json')
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', reason: 'x 合理' }] }))
  assert.throws(() => loadCssClassExceptions(bad), /class/)
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', class: 'x', reason: '短' }] }))
  assert.throws(() => loadCssClassExceptions(bad), /reason/)
})

test('applyCssClassExceptions：精确到 file+class，一条例外消费一条命中并给出 stale', () => {
  const violations = [
    { file: 'a.ts', className: 'one', line: 1 },
    { file: 'a.ts', className: 'two', line: 2 },
    { file: 'b.ts', className: 'one', line: 5 },
  ]
  const { violations: left, stale } = applyCssClassExceptions(violations, [
    { file: 'a.ts', class: 'one', reason: '由宿主外部设置' },
  ])
  assert.deepEqual(
    left.map((v) => `${v.file}:${v.className}`),
    ['a.ts:two', 'b.ts:one'],
  )
  assert.equal(stale.length, 0)
  const again = applyCssClassExceptions(
    [{ file: 'a.ts', className: 'zzz', line: 9 }],
    [{ file: 'a.ts', class: 'gone', reason: '已不再命中的历史例外' }],
  )
  assert.equal(again.stale.length, 1)
})

test('真实仓库：审计可跑、违规结构完整，且登记例外后为零增量', () => {
  const raw = auditUnusedCssClasses().flatMap((item) => item.violations)
  for (const v of raw) {
    assert.equal(v.rule, 'unused-css-class')
    assert.ok(typeof v.className === 'string' && v.className.length > 0)
    assert.ok(Number.isInteger(v.line) && v.line > 0)
    assert.match(v.message, /unused-css-class/)
  }
  const exceptions = loadCssClassExceptions(join(ROOT, 'scripts/qa/unused-css-class-exceptions.json'))
  const { violations, stale } = applyCssClassExceptions(raw, exceptions)
  assert.deepEqual(
    violations,
    [],
    `存在未登记的真实未使用类：${violations.map((v) => `${v.file}:${v.className}`).join(', ')}`,
  )
  assert.deepEqual(stale, [], `存在陈旧例外：${stale.map((e) => `${e.file}:${e.class}`).join(', ')}`)
})
