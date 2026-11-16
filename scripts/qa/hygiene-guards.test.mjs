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
 *
 * 魔法间距尺寸（magic-spacing）：只命中 margin/padding/gap（含逻辑子属性与 row-gap /
 * column-gap）声明里的直接非零 px；var()/calc()/clamp()/min()/max()/env() 包裹的长度、
 * 0/0px、百分比/em/rem、边框/定位/宽高/字号都不命中。真实候选逐项登记在
 * scripts/qa/magic-spacing-exceptions.json（file + property + value + reason）。
 *
 * 孪生协议判定（twin-predicate）：有界词法扫描提取 if / return / 三元条件里含
 * `getAttr` / `hasAttr` / `getAttribute` / `hasAttribute` 协议原子与 `&&` / `||` 的复合
 * 布尔表达式（不引 TypeScript 编译器、不起子进程），归一化（代码位空白折叠 + 冗余括号剥离，
 * 字符串内容原样保留）后完全相同的副本跨函数或跨文件出现即报；
 * 单原子守卫、普通 `if (x)`、参数不同的同型判定、数值/字符串兜底（`getAttr(...) || 320`
 * 同型）都不命中。不做模糊相似度。真实候选逐项登记在
 * scripts/qa/twin-predicate-exceptions.json（file + predicate + count + reason）。
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyCssClassExceptions,
  applyMagicSpacingExceptions,
  applyTwinPredicateExceptions,
  auditDuplicateDevWarnMessages,
  auditMagicSpacing,
  auditTwinPredicates,
  auditUnusedCssClasses,
  collectCssUsageByScope,
  collectDevWarnLiterals,
  collectTwinPredicates,
  extractClassUsageTokens,
  findDuplicateDevWarnLiterals,
  findMagicSpacing,
  findTwinPredicates,
  findUnusedCssClasses,
  groupTwinPredicates,
  loadCssClassExceptions,
  loadMagicSpacingExceptions,
  loadTwinPredicateExceptions,
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

/* --------------------------- 魔法间距尺寸（magic-spacing） --------------------------- */

const spacingOf = (source) => findMagicSpacing(source, BUTTON)

test('魔法间距：margin/padding/gap 与逻辑/物理子属性的直接 px 命中', () => {
  const source = `
const STYLE = \`
.box {
  margin: 4px;
  padding: 0 6px;
  gap: 2px;
  margin-inline-start: 3px;
  padding-block: 1px 2px;
  row-gap: 1px;
  column-gap: 5px;
  margin-top: 7px;
  padding-right: 9px;
}
\`
`
  const hits = spacingOf(source)
  assert.deepEqual(
    hits.map((h) => `${h.property}:${h.value}`),
    [
      'margin:4px',
      'padding:0 6px',
      'gap:2px',
      'margin-inline-start:3px',
      'padding-block:1px 2px',
      'row-gap:1px',
      'column-gap:5px',
      'margin-top:7px',
      'padding-right:9px',
    ],
  )
  assert.equal(hits[0].rule, 'magic-spacing')
  assert.equal(hits[0].file, BUTTON)
  assert.deepEqual(hits[0].px, ['4px'])
  assert.match(hits[0].message, /magic-spacing/)
  assert.match(hits[0].message, /--oas-space/)
})

test('魔法间距：var()/calc()/clamp()、0、百分比与 em/rem、非间距属性都不命中', () => {
  const source = `
const STYLE = \`
.box {
  margin: 0;
  padding: var(--oas-space-2);
  gap: calc(100% - 4px);
  margin-block: clamp(2px, 1vw, 8px);
  padding-inline: min(4px, 1vw) max(2px, 1rem);
  padding-inline-start: env(safe-area-inset-left, 8px);
  padding-inline-end: 1rem 2em 50%;
  top: 4px;
  border: 1px solid var(--oas-color-border);
  font-size: 12px;
  width: 120px;
  line-height: 20px;
}
\`
`
  assert.deepEqual(spacingOf(source), [])
})

test('魔法间距：0px 不命中，负值与小数 px 命中，一行多值合并为一条并列出全部 px', () => {
  const source = `
const STYLE = \`
.a { margin: 0px; }
.b { margin: -1px; }
.c { padding: 2.5px 0; }
.d { padding: 4px 8px; }
\`
`
  const hits = spacingOf(source)
  assert.deepEqual(
    hits.map((h) => `${h.property}:${h.value}`),
    ['margin:-1px', 'padding:2.5px 0', 'padding:4px 8px'],
  )
  assert.deepEqual(hits[2].px, ['4px', '8px'])
  assert.match(hits[2].detail, /4px.*8px/)
})

test('魔法间距：CSS 注释里的声明不命中，行号指向声明行', () => {
  const source = ['const STYLE = `', '/* .ghost { margin: 4px; } */', '.real {', '  margin: 6px;', '}', '`'].join('\n')
  const hits = spacingOf(source)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].line, 4)
  assert.equal(hits[0].snippet, 'margin: 6px;')
})

test('魔法间距：属性名/单位大小写不敏感，grid-gap 系列别名同样命中', () => {
  const source = `
const STYLE = \`
.a { MARGIN: 4PX; }
.b { Padding-Top: 2Px; }
.c { grid-gap: 4px; }
.d { grid-row-gap: 2px; }
.e { grid-column-gap: 3px; }
.f { grid-template-columns: 4px; }
.g { grid-auto-rows: 8px; }
\`
`
  const hits = spacingOf(source)
  assert.deepEqual(
    hits.map((h) => `${h.property}:${h.value}`),
    ['MARGIN:4PX', 'Padding-Top:2Px', 'grid-gap:4px', 'grid-row-gap:2px', 'grid-column-gap:3px'],
    'grid-template-*/grid-auto-* 是轨道定义，不是间距',
  )
})

test('魔法间距例外加载：file/property/value/reason 强制，属性必须是间距属性', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const dir = mkdtempSync(join(tmpdir(), 'spacing-exc-'))
  const bad = join(dir, 'bad.json')
  writeFileSync(bad, JSON.stringify({ exceptions: [{ property: 'margin', value: '4px', reason: '测试留白' }] }))
  assert.throws(() => loadMagicSpacingExceptions(bad), /file/)
  writeFileSync(
    bad,
    JSON.stringify({ exceptions: [{ file: 'a.ts', property: 'top', value: '4px', reason: '测试留白' }] }),
  )
  assert.throws(() => loadMagicSpacingExceptions(bad), /property/)
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', property: 'margin', reason: '测试留白' }] }))
  assert.throws(() => loadMagicSpacingExceptions(bad), /value/)
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', property: 'margin', value: '4px', reason: '短' }] }))
  assert.throws(() => loadMagicSpacingExceptions(bad), /reason/)
})

test('applyMagicSpacingExceptions：file+property+value 精确匹配，重复声明逐条消费并报 stale', () => {
  const hits = [
    { file: 'a.ts', property: 'padding', value: '12px', line: 1 },
    { file: 'a.ts', property: 'padding', value: '12px', line: 2 },
    { file: 'a.ts', property: 'gap', value: '2px', line: 3 },
    { file: 'b.ts', property: 'padding', value: '12px', line: 4 },
  ]
  const one = applyMagicSpacingExceptions(hits, [
    { file: 'a.ts', property: 'padding', value: '12px', reason: '占位区留白，组件自有几何' },
  ])
  assert.deepEqual(
    one.violations.map((v) => `${v.file}:${v.property}:${v.value}:${v.line}`),
    ['a.ts:padding:12px:2', 'a.ts:gap:2px:3', 'b.ts:padding:12px:4'],
    '一条例外只消费一条命中，新增的同值声明仍须红灯',
  )
  assert.equal(one.stale.length, 0)

  const both = applyMagicSpacingExceptions(hits.slice(0, 2), [
    { file: 'a.ts', property: 'padding', value: '12px', reason: '占位区留白，组件自有几何' },
    { file: 'a.ts', property: 'padding', value: '12px', reason: '错误态留白，组件自有几何' },
  ])
  assert.deepEqual(both.violations, [])
  assert.deepEqual(both.stale, [])

  const miss = applyMagicSpacingExceptions(hits.slice(2), [
    { file: 'a.ts', property: 'padding', value: '12px', reason: '已经删掉的声明' },
  ])
  assert.equal(miss.violations.length, 2, '不匹配 file/property/value 的命中不得被例外放行')
  assert.equal(miss.stale.length, 1)
})

test('真实仓库：魔法间距审计结构完整，登记例外后零增量', () => {
  const raw = auditMagicSpacing().flatMap((item) => item.violations)
  for (const v of raw) {
    assert.equal(v.rule, 'magic-spacing')
    assert.ok(typeof v.file === 'string' && v.file.length > 0)
    assert.ok(Number.isInteger(v.line) && v.line > 0)
    assert.ok(typeof v.property === 'string' && v.property.length > 0)
    assert.ok(typeof v.value === 'string' && v.value.length > 0)
    assert.ok(Array.isArray(v.px) && v.px.length > 0)
    assert.match(v.message, /magic-spacing/)
  }
  const exceptions = loadMagicSpacingExceptions(join(ROOT, 'scripts/qa/magic-spacing-exceptions.json'))
  const { violations, stale } = applyMagicSpacingExceptions(raw, exceptions)
  assert.deepEqual(
    violations,
    [],
    `存在未登记的直接像素间距：${violations.map((v) => `${v.file}:${v.property}: ${v.value}`).join('；')}`,
  )
  assert.deepEqual(stale, [], `存在陈旧例外：${stale.map((e) => `${e.file}:${e.property}: ${e.value}`).join('；')}`)
})

/* --------------------------- 孪生协议判定（twin-predicate） --------------------------- */

const twinOf = (source, file = BUTTON) => findTwinPredicates(source, file)
const TWIN_TEXT = "this.hasAttr('open') && this.getAttr('mode', '') === 'x'"

test('孪生判定：同一复合协议判定跨函数重复必报，空白差异视为相同', () => {
  const source = [
    'class X {',
    `  a() { if (${TWIN_TEXT}) return 1 }`,
    '  b() {',
    '    if (',
    "      this.hasAttr('open') &&    this.getAttr('mode', '') === 'x'",
    '    ) return 2',
    '  }',
    '}',
  ].join('\n')
  const hits = twinOf(source)
  assert.equal(hits.length, 1, '同一文件同一判定只报一条（按文件聚合，列出全部出现处）')
  const [hit] = hits
  assert.equal(hit.rule, 'twin-predicate')
  assert.equal(hit.file, BUTTON)
  assert.equal(hit.predicate, TWIN_TEXT)
  assert.equal(hit.count, 2)
  assert.deepEqual(
    hit.occurrences.map((o) => o.line),
    [2, 5],
  )
  assert.equal(hit.line, 2)
  assert.match(hit.message, /twin-predicate/)
  assert.match(hit.detail, /2 处/)
})

test('孪生判定：冗余外层括号归一化后相同；取反与原判定不同（不误判）', () => {
  const source = [
    'class X {',
    "  a() { if (this.hasAttr('a') && this.hasAttr('b')) return 1 }",
    "  b() { if (((this.hasAttr('a') && this.hasAttr('b')))) return 1 }",
    "  c() { if (!(this.hasAttr('a') && this.hasAttr('b'))) return 1 }",
    '}',
  ].join('\n')
  const hits = twinOf(source)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].predicate, "this.hasAttr('a') && this.hasAttr('b')")
  assert.equal(hits[0].count, 2, '取反判定不是同一结论，不得合并进同一组')
  assert.deepEqual(
    hits[0].occurrences.map((o) => o.line),
    [2, 3],
  )
})

test('孪生判定：三元条件与 return 布尔表达式同口径，跨函数重复命中', () => {
  const source = [
    'class X {',
    `  a() { return ${TWIN_TEXT} ? 'on' : 'off' }`,
    `  b() { return ${TWIN_TEXT} }`,
    "  c() { return this.hasAttr('open') ? 1 : 2 }",
    '}',
  ].join('\n')
  const hits = twinOf(source)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].predicate, TWIN_TEXT)
  assert.equal(hits[0].count, 2)
})

test('孪生判定：单原子守卫、普通变量、不同参数、非协议复合都不命中', () => {
  const singleAtom = [
    'class X {',
    "  a() { if (this.hasAttr('open')) return 1 }",
    "  b() { if (this.hasAttr('open')) return 2 }",
    "  c() { return this.getAttr('mode', '') === 'x' }",
    "  d() { return this.getAttr('mode', '') === 'x' }",
    '}',
  ].join('\n')
  assert.deepEqual(twinOf(singleAtom), [], '单原子守卫与单比较重复不报')

  const plain = [
    'function a(x) { if (x) return 1 }',
    'function b(x) { if (x) return 2 }',
    'function c(a, b) { return a && b }',
    'function d(a, b) { return a && b }',
  ].join('\n')
  assert.deepEqual(twinOf(plain), [], '普通变量/无协议原子的复合判定不报')

  const differentArgs = [
    'class X {',
    "  a() { if (this.hasAttr('open') && this.hasAttr('disabled')) return 1 }",
    "  b() { if (this.hasAttr('open') && this.hasAttr('readonly')) return 2 }",
    "  c() { if (this.getAttr('mode', '') === 'x' && this.hasAttr('open')) return 3 }",
    '}',
  ].join('\n')
  assert.deepEqual(twinOf(differentArgs), [], '参数不同 / 操作数顺序不同不报（不做模糊相似度）')
})

test('孪生判定：数值/字符串兜底（getAttr(...) || 320 同型）不是布尔判定，不命中', () => {
  const source = [
    'class X {',
    "  a() { return Number(this.getAttr('height', '320')) || 320 }",
    "  b() { return Number(this.getAttr('height', '320')) || 320 }",
    "  c() { return this.getAttr('value', '') || 'on' }",
    "  d() { return this.getAttr('value', '') || 'on' }",
    '}',
  ].join('\n')
  assert.deepEqual(twinOf(source), [])
})

test('孪生判定：跨文件重复按文件各报一条，其它位置写进 detail', () => {
  const candidates = collectTwinPredicates([
    {
      file: 'packages/ui/src/basic/a/one.ts',
      source: `function a() { if (${TWIN_TEXT}) return 1 }`,
    },
    {
      file: 'packages/ui/src/basic/b/two.ts',
      source: `function b() { if (${TWIN_TEXT}) return 1 }`,
    },
  ])
  const hits = groupTwinPredicates(candidates)
  assert.deepEqual(
    hits.map((h) => `${h.file}#${h.count}`),
    ['packages/ui/src/basic/a/one.ts#1', 'packages/ui/src/basic/b/two.ts#1'],
  )
  for (const hit of hits) {
    assert.equal(hit.predicate, TWIN_TEXT)
    assert.equal(hit.occurrences.length, 1)
    assert.match(hit.detail, /one\.ts|two\.ts/, 'detail 要指出另一处，便于人工判断是否抽公共判定')
  }
})

test('孪生判定：语法错误源码不崩溃（解析容错）', () => {
  assert.deepEqual(twinOf('const x = {'), [])
})

test('孪生判定：不平衡括号 / 未闭合字面量等残缺输入安全跳过（不崩溃、不误报）', () => {
  // 未闭合的 if 括号
  assert.deepEqual(twinOf("function a() { if (this.hasAttr('a') && this.hasAttr('b')\n"), [])
  // 未闭合的 return 表达式 / 深层括号堆叠
  assert.deepEqual(twinOf(`function a() { return ${'['.repeat(20000)}this.hasAttr('a') && this.hasAttr('b')`), [])
  assert.deepEqual(twinOf(`function a() { if (${'('.repeat(20000)}`), [])
  // 未闭合字符串 / 模板
  assert.deepEqual(twinOf(`const s = 'unterminated ${'x'.repeat(20000)}`), [])
  assert.deepEqual(twinOf(`const t = \`open ${'y'.repeat(20000)}`), [])
  // 超大无闭合输入：仍要快速返回（不抛错、不卡死）
  const started = Date.now()
  assert.deepEqual(twinOf('{if('.repeat(30000)), [])
  assert.ok(Date.now() - started < 5000, '超大无闭合输入应在有限时间内返回')
})

test('孪生判定：字符串/模板内容不参与结构判定，归一化也不改写字符串内空白', () => {
  // 字符串与模板里的 `if` / `&&` / 括号是数据，不是代码
  const noise = [
    "const text = \"if (this.hasAttr('a') && this.hasAttr('b')) {\"",
    'const tpl = `return this.hasAttr("x") && this.hasAttr("y")`',
    "function f() { return this.hasAttr('a') && this.hasAttr('b') }",
  ].join('\n')
  assert.deepEqual(twinOf(noise), [], '字符串内容不得产生候选（否则会跨「作用域」误报）')

  // 同一判定的字符串参数含双空格：归一化只折代码位空白，字符串内容原样保留
  const spaced = [
    'class X {',
    "  a() { if (this.hasAttr('open') && this.getAttr('label', 'a  b') === 'a  b') return 1 }",
    "  b() { if (this.hasAttr('open') && this.getAttr('label', 'a  b') === 'a  b') return 2 }",
    '}',
  ].join('\n')
  const hits = twinOf(spaced)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].predicate, "this.hasAttr('open') && this.getAttr('label', 'a  b') === 'a  b'")

  // 字符串内空白不同 = 不同判定，不得合并
  const differ = [
    'class X {',
    "  a() { if (this.hasAttr('open') && this.getAttr('label', 'a  b') === 'a  b') return 1 }",
    "  b() { if (this.hasAttr('open') && this.getAttr('label', 'a b') === 'a b') return 2 }",
    '}',
  ].join('\n')
  assert.deepEqual(twinOf(differ), [])
})

test('孪生例外加载：file/predicate/count/reason 强制', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const dir = mkdtempSync(join(tmpdir(), 'twin-exc-'))
  const bad = join(dir, 'bad.json')
  const predicate = TWIN_TEXT
  writeFileSync(bad, JSON.stringify({ exceptions: [{ predicate, count: 1, reason: '共享判定' }] }))
  assert.throws(() => loadTwinPredicateExceptions(bad), /file/)
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', count: 1, reason: '共享判定' }] }))
  assert.throws(() => loadTwinPredicateExceptions(bad), /predicate/)
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', predicate, reason: '共享判定' }] }))
  assert.throws(() => loadTwinPredicateExceptions(bad), /count/)
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', predicate, count: 0, reason: '共享判定' }] }))
  assert.throws(() => loadTwinPredicateExceptions(bad), /count/)
  writeFileSync(bad, JSON.stringify({ exceptions: [{ file: 'a.ts', predicate, count: 1, reason: '短' }] }))
  assert.throws(() => loadTwinPredicateExceptions(bad), /reason/)
})

test('applyTwinPredicateExceptions：file+predicate+count 精确匹配，新增一处副本即失效', () => {
  const hits = [
    { file: 'a.ts', predicate: TWIN_TEXT, count: 2, line: 3 },
    { file: 'a.ts', predicate: "this.hasAttr('x') || this.hasAttr('y')", count: 1, line: 9 },
    { file: 'b.ts', predicate: TWIN_TEXT, count: 1, line: 4 },
  ]
  const one = applyTwinPredicateExceptions(hits, [
    { file: 'a.ts', predicate: TWIN_TEXT, count: 2, reason: 'A/B 两条路径共用同一协议判定，待抽 helper' },
  ])
  assert.deepEqual(
    one.violations.map((v) => `${v.file}#${v.count}:${v.line}`),
    ['a.ts#1:9', 'b.ts#1:4'],
  )
  assert.equal(one.stale.length, 0)

  const grew = applyTwinPredicateExceptions(
    [{ file: 'a.ts', predicate: TWIN_TEXT, count: 3, line: 3 }],
    [{ file: 'a.ts', predicate: TWIN_TEXT, count: 2, reason: '登记时只有两处副本' }],
  )
  assert.equal(grew.violations.length, 1, '同一文件再复制一份（count 变化）必须重新红灯，不能被旧例外放行')
  assert.equal(grew.stale.length, 1)

  const miss = applyTwinPredicateExceptions(
    [{ file: 'c.ts', predicate: TWIN_TEXT, count: 2, line: 1 }],
    [{ file: 'a.ts', predicate: TWIN_TEXT, count: 2, reason: '判定已删除' }],
  )
  assert.equal(miss.violations.length, 1, 'file 必须精确匹配')
  assert.equal(miss.stale.length, 1)
})

test('真实仓库：孪生判定审计结构完整，登记例外后零增量', () => {
  const raw = auditTwinPredicates().flatMap((item) => item.violations)
  for (const v of raw) {
    assert.equal(v.rule, 'twin-predicate')
    assert.ok(typeof v.file === 'string' && v.file.length > 0)
    assert.ok(Number.isInteger(v.line) && v.line > 0)
    assert.ok(typeof v.predicate === 'string' && v.predicate.length > 0)
    assert.ok(Number.isInteger(v.count) && v.count > 0)
    assert.equal(v.count, v.occurrences.length)
    assert.match(v.message, /twin-predicate/)
  }
  const exceptions = loadTwinPredicateExceptions(join(ROOT, 'scripts/qa/twin-predicate-exceptions.json'))
  const { violations, stale } = applyTwinPredicateExceptions(raw, exceptions)
  assert.deepEqual(
    violations,
    [],
    `存在未登记的孪生判定：${violations.map((v) => `${v.file}:${v.line} ×${v.count} ${v.predicate}`).join('；')}`,
  )
  assert.deepEqual(stale, [], `存在陈旧例外：${stale.map((e) => `${e.file} ×${e.count} ${e.predicate}`).join('；')}`)
})

test('devWarn 重复文案：只统计行首纯字符串字面量调用', () => {
  const src = [
    "devWarn('[oas-x] 同一句')",
    'devWarn("[oas-x] 同一句")',
    'devWarn(`[oas-x] ${value}`)',
    'devWarn(MSG)',
    "// devWarn('[oas-x] 同一句')",
    'const example = "devWarn(\'[oas-x] 同一句\')"',
  ].join('\n')
  const hits = collectDevWarnLiterals(src)
  assert.deepEqual(
    hits.map((hit) => hit.message),
    ['[oas-x] 同一句', '[oas-x] 同一句'],
    '模板插值、常量引用、注释与字符串内容都不计入',
  )
  const dup = findDuplicateDevWarnLiterals(hits.map((hit, i) => ({ ...hit, file: `f${i}.ts` })))
  assert.equal(dup.length, 1)
  assert.equal(dup[0].message, '[oas-x] 同一句')
  assert.equal(dup[0].occurrences.length, 2)
})

test('真实仓库：devWarn 字面文案零重复', () => {
  const dup = auditDuplicateDevWarnMessages()
  assert.deepEqual(
    dup,
    [],
    `相同 devWarn 文案出现多次，请抽共享常量：${dup
      .map((g) => `「${g.message}」→ ${g.occurrences.map((o) => `${o.file}:${o.line}`).join('、')}`)
      .join('；')}`,
  )
})
