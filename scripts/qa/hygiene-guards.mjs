#!/usr/bin/env node
/**
 * 源码卫生守卫：未使用 CSS 类。
 *
 * 背景：组件样式全部内联在 `const XXX_STYLE = \`...\``（含 `*_CSS`）模板里，类选择器
 * 定义与使用分离——守卫要防的是「样式里定义了类，但任何 DOM 路径都不会把它挂上去」。
 *
 * 口径（低误报优先，用例见同目录 hygiene-guards.test.mjs）：
 * - 定义源：非测试 .ts 中 `const <名>_STYLE = \`` / `const *_CSS = \`` 模板（现有模板全部
 *   遵循该命名约定；另有 CSS 形态兜底识别，防未来命名漂移漏检）。测试文件不产生定义
 *   （style-conventions.test.ts 等含 CSS 示例片段）；
 * - 使用源（usage）从以下上下文提取：
 *   1. `class="..."` / `class='...'` 属性值（值内可含 ${} 插值）；
 *   2. `class=\`...\`` / `className = \`...\`` 模板的全部静态段与 ${} 内字符串；
 *   3. `classList.add/remove/toggle/contains('x', ...)` 字符串/模板参数（多参数全收）；
 *   4. `className = ...`（含 `.className`、默认参数、三元/数组拼接）与
 *      `setAttribute('class', ...)`：语句域内字符串字面量全收；
 *   5. `querySelector(All)/closest/matches` 选择器字符串里的 .class（测试与运行时同口径，
 *      是 DOM 契约级使用）；
 *   6. union 类型字面量（`type X = 'a' | 'b'`，单行单表达式）：枚举值常作为状态类经变量
 *      应用（button type/size）；object 类型别名不是枚举值，不纳入；多行 union 不纳入
 *      扫描，需要时改单行或登记例外；
 *   7. class 数组：`NAME = [ ... ].filter(Boolean)`（可接 `.join(' ')`，含 `obj.className = [...]`
 *      直连）、带类型标注/字段修饰的具名数组（名含 class/cls，如 `const classes: string[] = []`）
 *      及其后续 `NAME.push('x')` / `NAME.push(\`prefix-${v}\`)`；
 *   8. `*CLASS*` 常量数组（SWATCH_CLASSES = ['c0', ...]）：按类查找表使用；
 *   9. 拼接前缀：class 上下文模板静态段以 '-' 结尾的部分（`anchor-`、`oas-stepper--` 等，
 *      长度 ≥3）：定义类以登记前缀开头即视为使用（`tok-${kind}`、`form-${form}`）；
 * - 作用域：定义文件位于 `packages/ui/src/<family>/<component>/` 时，使用源 = 该目录树内
 *   全部文件 + shared / overlay / src 根文件（全局）；定义文件本身在 shared/overlay/根时，
 *   使用源 = 全仓（shared 渲染自身 DOM，其类可被任何组件模板引用）；
 * - 测试文件参与「使用」统计（classList.contains / querySelector 断言是公开 DOM 契约），
 *   但不靠测试兜底：真实使用必须能在上述 1-9 上下文中指认，指认不出的一律报候选；
 * - 已知边界：具名 helper 的第二参数类名（createIcon(name, 'arrow') 同型）不做调用点
 *   数据流追踪——有测试断言（querySelector / classList.contains）覆盖的可被上下文 3/5
 *   自动指认（select chip-icon、menu icon 现状）；无测试断言覆盖时登记精确例外
 *   （unused-css-class-exceptions.json，file + class + reason，menu arrow 现状）。
 *
 * 例外：scripts/qa/unused-css-class-exceptions.json，精确到 file + class + reason；
 * 一条例外只消费一条命中，不再命中即报陈旧；只登记真实候选，不修改产品源码清零。
 * i18n 死键精确集合由 packages/i18n/src/slices/completeness.test.ts 的 EXPECTED_DEAD
 * 双向断言覆盖，不在本守卫范围。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const UI_SRC = 'packages/ui/src'
const GLOBAL_SCOPE_NAMES = new Set(['shared', 'overlay', 'root'])
const CLASS_TOKEN_RE = /^-?[_a-zA-Z][\w-]*$/

/** 路径转仓库相对 POSIX 路径。 */
function relOf(absPath) {
  return relative(ROOT, absPath).replaceAll('\\', '/')
}

/**
 * 抹掉注释（行注释 + 块注释），保留字符串/模板内容、换行与长度。
 * 与 assert-audit.mjs 的 stripComments 同构：usage 提取要的是字符串内容，
 * 注释里的 `class="x"` 示例不算使用。
 */
export function stripCommentsKeepStrings(source) {
  const out = source.split('')
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' '
  }
  let i = 0
  while (i < source.length) {
    const c = source[i]
    const n = source[i + 1]
    if (c === '/' && n === '/') {
      const start = i
      while (i < source.length && source[i] !== '\n') i++
      blank(start, i)
      continue
    }
    if (c === '/' && n === '*') {
      const start = i
      i += 2
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++
      i = Math.min(i + 2, source.length)
      blank(start, i)
      continue
    }
    if (c === "'" || c === '"') {
      const quote = c
      i++
      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2
          continue
        }
        if (source[i] === quote) {
          i++
          break
        }
        if (source[i] === '\n') break
        i++
      }
      continue
    }
    if (c === '`') {
      i++
      let depth = 0
      while (i < source.length) {
        if (source[i] === '\\') {
          i += 2
          continue
        }
        if (source[i] === '$' && source[i + 1] === '{') {
          depth++
          i += 2
          continue
        }
        if (depth > 0 && source[i] === '}') {
          depth--
          i++
          continue
        }
        if (source[i] === '`' && depth === 0) {
          i++
          break
        }
        i++
      }
      continue
    }
    i++
  }
  return out.join('')
}

/** 从 `openIndex`（反引号下标）走到配对反引号，返回 { content, end }；content 只含 ${} 之外的静态文本。 */
function walkTemplate(source, openIndex) {
  let i = openIndex + 1
  let depth = 0
  let content = ''
  while (i < source.length) {
    const c = source[i]
    if (c === '\\') {
      content += source.slice(i, i + 2)
      i += 2
      continue
    }
    if (c === '$' && source[i + 1] === '{') {
      depth++
      i += 2
      continue
    }
    if (c === '}' && depth > 0) {
      depth--
      i++
      continue
    }
    if (c === '`' && depth === 0) return { content, end: i }
    if (depth === 0) content += c
    i++
  }
  return { content, end: -1 }
}

/**
 * 把一段文本按空白拆成合法 class token。
 */
function tokenize(text, into) {
  for (const piece of text.split(/\s+/)) {
    if (CLASS_TOKEN_RE.test(piece)) into.add(piece)
  }
}

/**
 * 类上下文文本行走：收集静态段（供 tokenize 与前缀判定）和 ${} 内一层的字符串字面量。
 * terminator 为 '`'（模板）或 '"' / "'"（class 属性值——值内可含 ${} 插值，
 * 如 oas-code 的 `<span class="tok-${cls}">`，其静态段属于外层模板文本）。
 * 前缀规则：静态段去首尾空白后，取最后一个空白/引号之后的尾巴（`class="tok-` → `tok-`），
 * 以 '-' 结尾且长度 ≥3 说明类名是拼接生成的（`tok-${kind}`、`form-${form}`）。
 */
function walkClassText(stripped, openIndex, terminator, tokens, prefixes) {
  let i = openIndex + 1
  let depth = 0
  let segment = ''
  while (i < stripped.length) {
    const c = stripped[i]
    if (c === '\\') {
      if (depth === 0) segment += stripped.slice(i, i + 2)
      i += 2
      continue
    }
    // 引号属性值内的插值属于外层模板：引号本身在 depth>0 时不作数
    if (c === '$' && stripped[i + 1] === '{') {
      if (depth === 0) {
        const trimmed = segment.trim()
        const cut = Math.max(trimmed.lastIndexOf(' '), trimmed.lastIndexOf('"'), trimmed.lastIndexOf("'"))
        const tail = trimmed.slice(cut + 1)
        if (tail.endsWith('-') && tail.length >= 3) prefixes.add(tail)
        tokenize(segment, tokens)
      }
      depth++
      i += 2
      continue
    }
    if (c === '}' && depth > 0) {
      depth--
      i++
      continue
    }
    if (c === terminator && depth === 0) {
      tokenize(segment, tokens)
      return
    }
    if (depth === 0) {
      segment += c
    } else {
      // ${} 内一层：收集字符串字面量（command 的 `crumb ${x ? 'crumb-current' : 'crumb-link'}`）
      if (c === "'" || c === '"') {
        let j = i + 1
        while (j < stripped.length && stripped[j] !== c && stripped[j] !== '\n') j++
        tokenize(stripped.slice(i + 1, j), tokens)
        i = j + 1
        continue
      }
    }
    i++
  }
}

/** 提取 classList.add/remove/toggle/contains(...) 的全部字符串/模板参数。 */
function collectClassListArgs(stripped, tokens, prefixes) {
  const re = /\bclassList\s*\.\s*(?:add|remove|toggle|contains)\s*\(/g
  for (const m of stripped.matchAll(re)) {
    let i = m.index + m[0].length
    let depth = 1
    while (i < stripped.length && depth > 0) {
      const c = stripped[i]
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '(') depth++
      else if (c === ')') depth--
      else if (c === "'" || c === '"') {
        let j = i + 1
        while (j < stripped.length && stripped[j] !== c && stripped[j] !== '\n') j++
        tokenize(stripped.slice(i + 1, j), tokens)
        i = j + 1
        continue
      } else if (c === '`') {
        walkClassText(stripped, i, '`', tokens, prefixes)
        i = skipTemplateEnd(stripped, i) + 1
        continue
      }
      i++
    }
  }
}

/** 从 `fromIndex` 起收集一条语句（到深度 0 的 `;` 或换行为止）里的全部字符串字面量。 */
function collectStatementStrings(stripped, fromIndex, tokens, prefixes) {
  let i = fromIndex
  let depth = 0
  while (i < stripped.length) {
    const c = stripped[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < stripped.length && stripped[j] !== c && stripped[j] !== '\n') j++
      tokenize(stripped.slice(i + 1, j), tokens)
      i = j + 1
      continue
    }
    if (c === '`') {
      walkClassText(stripped, i, '`', tokens, prefixes)
      i = skipTemplateEnd(stripped, i) + 1
      continue
    }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return
      depth--
    } else if (depth === 0 && (c === ';' || c === '\n')) return
    i++
  }
}

/** class 数组模式：NAME = [ ... ].filter(Boolean)（可接 .join(' ')，含 className 直连）。 */
/** 收集数组元素里的字符串/模板（class 数组元素共用逻辑）。 */
function collectArrayElements(arrayText, tokens, prefixes) {
  const elements = arrayText.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)
  for (const el of elements) {
    const text = el[1] ?? el[2]
    if (text !== undefined) tokenize(text, tokens)
    else if (el[3] !== undefined) {
      const seg = el[3]
      const tail = seg.trim()
      if (tail.endsWith('-') && tail.length >= 3) prefixes.add(tail)
      tokenize(seg, tokens)
    }
  }
}

function collectClassArrays(stripped, tokens, prefixes) {
  const tracked = new Set()
  // a) 具名 class 数组：NAME（名含 class/cls）= [ ... ]，或任何名字但带 .filter(Boolean)/.join(' ')；
  //    支持类型标注（const classes: string[] = []，data/log ANSI 分段同型）与字段修饰（private 等）
  const named =
    /(?:const|let|var|private|public|protected|readonly|static)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=;\n]+?)?\s*=\s*\[([\s\S]*?)\](\s*\.filter\(\s*Boolean\s*\)\s*(?:\.join\(\s*['"][^'"]*['"]\s*\)\s*)?|\s*\.join\(\s*['"][^'"]*['"]\s*\))?/g
  for (const m of stripped.matchAll(named)) {
    const joins = Boolean(m[3])
    if (!joins && !/class|cls/i.test(m[1])) continue
    tracked.add(m[1])
    collectArrayElements(m[2], tokens, prefixes)
  }
  // b) 属性直连：obj.className = [ ... ]（可接 .filter(Boolean).join(' ')），匿名不追踪 push
  const prop =
    /\.(?:className|classList)\s*=\s*\[([\s\S]*?)\]\s*(?:\.filter\(\s*Boolean\s*\)\s*(?:\.join\(\s*['"][^'"]*['"]\s*\)\s*)?|\.join\(\s*['"][^'"]*['"]\s*\))/g
  for (const m of stripped.matchAll(prop)) collectArrayElements(m[1], tokens, prefixes)
  // 数组元素的动态形态：cond ? 'name' : '' —— 三元两个分支都是字符串字面量，上面已收。
  // 后续 classes.push('x') / classes.push(`prefix-${v}`) 增补
  for (const name of tracked) {
    const pushRe = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\s*\\.\\s*push\\(\\s*`, 'g')
    for (const m of stripped.matchAll(pushRe)) {
      let i = m.index + m[0].length
      let depth = 1
      while (i < stripped.length && depth > 0) {
        const c = stripped[i]
        if (c === '\\') {
          i += 2
          continue
        }
        if (c === '(') depth++
        else if (c === ')') depth--
        else if (c === "'" || c === '"') {
          let j = i + 1
          while (j < stripped.length && stripped[j] !== c && stripped[j] !== '\n') j++
          tokenize(stripped.slice(i + 1, j), tokens)
          i = j + 1
          continue
        } else if (c === '`') {
          walkClassText(stripped, i, '`', tokens, prefixes)
          i = skipTemplateEnd(stripped, i) + 1
          continue
        }
        i++
      }
    }
  }
}

/** 从反引号下标跳到配对反引号之后的下标（供收集器复用，避免重复模板跳跃逻辑）。 */
function skipTemplateEnd(stripped, openIndex) {
  let k = openIndex + 1
  let td = 0
  while (k < stripped.length) {
    if (stripped[k] === '\\') {
      k += 2
      continue
    }
    if (stripped[k] === '$' && stripped[k + 1] === '{') {
      td++
      k += 2
      continue
    }
    if (stripped[k] === '}' && td > 0) {
      td--
      k++
      continue
    }
    if (stripped[k] === '`' && td === 0) return k
    k++
  }
  return stripped.length - 1
}

/**
 * 从一份源码提取全部「类使用」：返回 { tokens, prefixes }。
 * prefixes 用于拼接生成的类（`tok-${kind}`）：定义类以登记前缀开头即视为使用。
 */
export function extractClassUsageTokens(source) {
  const stripped = stripCommentsKeepStrings(source)
  const tokens = new Set()
  const prefixes = new Set()
  // 1) class="..." / class='...' 属性（值内可含 ${} 插值——外层模板文本里的属性）
  for (const m of stripped.matchAll(/\bclass\s*=\s*(['"])/g)) {
    walkClassText(stripped, m.index + m[0].length - 1, m[1], tokens, prefixes)
  }
  // 2) class=`...` / className=`...` 模板
  for (const m of stripped.matchAll(/\b(?:class|className)\s*=\s*`/g)) {
    walkClassText(stripped, m.index + m[0].length - 1, '`', tokens, prefixes)
  }
  // 3) .className = ... / className 默认参数（含三元语句域、模板）：语句内字符串全收
  for (const m of stripped.matchAll(/\bclassName\s*=\s*/g)) {
    collectStatementStrings(stripped, m.index + m[0].length, tokens, prefixes)
  }
  // 4) setAttribute('class', ...)
  for (const m of stripped.matchAll(/\bsetAttribute\(\s*['"]class['"]\s*,/g)) {
    collectStatementStrings(stripped, m.index + m[0].length, tokens, prefixes)
  }
  // 5) querySelector(All)/closest/matches 选择器字符串：其中出现的 .class 是契约级使用（测试与运行时同口径）
  for (const m of stripped.matchAll(
    /\b(?:querySelector|querySelectorAll|closest|matches)\(\s*('([^'\n]*)'|"([^"\n]*)"|`)/g,
  )) {
    if (m[2] !== undefined || m[3] !== undefined) {
      const selector = m[2] ?? m[3] ?? ''
      for (const cm of selector.matchAll(CLASS_SELECTOR_RE)) tokens.add(cm[1])
    } else {
      // 模板选择器：静态段里抽 .class（gantt 的 `.link-hit[data-from="${id}"]`）
      const { content } = walkTemplate(stripped, m.index + m[0].length - 1)
      for (const cm of content.matchAll(CLASS_SELECTOR_RE)) tokens.add(cm[1])
    }
  }
  // 6) union 类型字面量（type X = 'a' | 'b'，单行单表达式）：枚举值常作为状态类经变量应用
  //    （button type/size）。边界必须收在单表达式内——object 别名（type X = { ... }）的成员
  //    不是枚举值，且 [^;\n{] 防跨语句吞文本（inspector .tab 实发漏检：object 别名吞掉后文
  //    出现的 'tab' 字面量，把死类误判为使用）。
  for (const m of stripped.matchAll(/(?:export\s+)?type\s+[A-Za-z_$][\w$]*(?:<[^;=]+>)?\s*=\s*([^;\n{]+)/g)) {
    for (const sm of m[1].matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) tokenize(sm[1] ?? sm[2] ?? '', tokens)
  }
  // 7) *CLASS* 常量数组（SWATCH_CLASSES = ['c0', ...]）：按类查找表使用
  for (const m of stripped.matchAll(/(?:const|let|var)\s+([A-Za-z_$]*CLASS[A-Za-z_$]*)\s*=\s*\[([\s\S]*?)\]/g)) {
    for (const sm of m[2].matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) tokenize(sm[1] ?? sm[2] ?? '', tokens)
  }
  // 8) classList.*(...) 与 class 数组
  collectClassListArgs(stripped, tokens, prefixes)
  collectClassArrays(stripped, tokens, prefixes)
  return { tokens, prefixes }
}

/** 定义文件的作用域键：shared/overlay → 同名全局作用域；src 根文件 → 'root'；其余 → 组件目录树。 */
export function cssScopeOf(file) {
  const rest = file.slice(`${UI_SRC}/`.length)
  const segs = rest.split('/')
  if (segs[0] === 'shared' || segs[0] === 'overlay') return segs[0]
  if (segs.length === 1) return 'root'
  return `${UI_SRC}/${segs[0]}/${segs[1]}`
}

/**
 * 按作用域汇总 usage。返回 Map<scope, { tokens, prefixes, isGlobal }>。
 * @param files 仓库相对路径（POSIX）
 * @param readSource (file) => source；缺省读磁盘
 */
export function collectCssUsageByScope(files, readSource = (f) => readFileSync(join(ROOT, f), 'utf8')) {
  const scopes = new Map()
  const ensure = (key) => {
    if (!scopes.has(key)) {
      scopes.set(key, { tokens: new Set(), prefixes: new Set(), isGlobal: GLOBAL_SCOPE_NAMES.has(key) })
    }
    return scopes.get(key)
  }
  for (const file of files) {
    const scope = cssScopeOf(file)
    const usage = extractClassUsageTokens(readSource(file))
    const slot = ensure(scope)
    for (const t of usage.tokens) slot.tokens.add(t)
    for (const p of usage.prefixes) slot.prefixes.add(p)
  }
  return scopes
}

/**
 * 某个作用域定义文件可用的 usage：
 * - 全局作用域（shared/overlay/root 的定义）：全仓所有 usage；
 * - 组件作用域：本目录树 usage + 全部全局作用域 usage。
 */
export function usageTokensFor(scopes, scope) {
  const tokens = new Set()
  const prefixes = new Set()
  const merge = ({ tokens: t, prefixes: p }) => {
    for (const x of t) tokens.add(x)
    for (const x of p) prefixes.add(x)
  }
  if (GLOBAL_SCOPE_NAMES.has(scope)) {
    for (const usage of scopes.values()) merge(usage)
    return { tokens, prefixes }
  }
  const own = scopes.get(scope)
  if (own) merge(own)
  for (const [key, usage] of scopes) {
    if (GLOBAL_SCOPE_NAMES.has(key)) merge(usage)
  }
  return { tokens, prefixes }
}

/** 变量名是否符合样式模板约定（`<名>STYLE` / `*_CSS`）。 */
const STYLE_NAME_RE = /(?:STYLE|_CSS)$/

/**
 * 提取源码里的 CSS 块（含起始行号）。
 * 主口径：命名约定（现有模板全部遵循）；兜底：非约定命名的模板若内容呈
 * CSS 形态（含 `{}` 且有选择器样式行）也纳入，防未来命名漂移漏检。
 */
export function extractCssBlocks(source) {
  const stripped = stripCommentsKeepStrings(source)
  const blocks = []
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*`/g
  let m
  while ((m = re.exec(stripped))) {
    const openIndex = re.lastIndex - 1
    const { content, end } = walkTemplate(stripped, openIndex)
    if (end < 0) break
    re.lastIndex = end + 1
    if (!content.includes('{') || !content.includes('}')) continue
    const conventional = STYLE_NAME_RE.test(m[1])
    if (!conventional && !/^[^{}\n]+\{\s*$/m.test(content)) continue
    const startLine = stripped.slice(0, openIndex + 1).split('\n').length
    blocks.push({ content, startLine })
  }
  return blocks
}

const CSS_COMMENT_RE = /\/\*[\s\S]*?\*\//g
/** 类选择器：`.` 前不能是 `.`（排除 `...spread`）、单词字符或 `$`（排除属性访问）。 */
const CLASS_SELECTOR_RE = /(?<![.\w$])\.(-?[_a-zA-Z][\w-]*)/g

/** 从 CSS 文本提取类选择器：selector → 首次出现行号（相对 CSS 块起始）。 */
export function extractCssClassSelectors(css, startLine = 1) {
  const cleaned = css.replace(CSS_COMMENT_RE, (s) => ' '.repeat(s.length))
  const found = new Map()
  for (const m of cleaned.matchAll(/[^{}]*\{/g)) {
    const selectorText = m[0].slice(0, -1)
    for (const cm of selectorText.matchAll(CLASS_SELECTOR_RE)) {
      if (!found.has(cm[1])) {
        // 行号要算到类名在 selector 内的绝对偏移（选择器块可能从上一行就开始匹配）
        const abs = m.index + cm.index
        const line = startLine + cleaned.slice(0, abs).split('\n').length - 1
        found.set(cm[1], line)
      }
    }
  }
  return found
}

const RULE = 'unused-css-class'
const RULE_SUGGESTION =
  '确认该类是否仍被使用：删除死样式，或补登记 scripts/qa/unused-css-class-exceptions.json 并写清 reason（宿主类由外部组件设置、动态拼接等）。'

/**
 * 单文件的未使用 CSS 类检测。
 * @param source 文件源码
 * @param file 仓库相对路径（决定报告与作用域）
 * @param usageSource usageTokensFor 的结果，或兼容旧用法的纯 token Set
 */
export function findUnusedCssClasses(source, file, usageSource) {
  const usage = usageSource instanceof Set ? { tokens: usageSource, prefixes: new Set() } : usageSource
  const lines = source.split(/\r?\n/)
  const violations = []
  for (const block of extractCssBlocks(source)) {
    const selectors = extractCssClassSelectors(block.content, block.startLine)
    for (const [className, line] of selectors) {
      const used = usage.tokens.has(className) || [...usage.prefixes].some((p) => className.startsWith(p))
      if (used) continue
      violations.push({
        file,
        line,
        rule: RULE,
        detail: `.${className} 未在使用源中出现`,
        snippet: (lines[line - 1] ?? '').trim().slice(0, 240),
        message: `${file}:${line} [${RULE}] .${className} 未在使用源中出现。${RULE_SUGGESTION}`,
        className,
      })
    }
  }
  return violations.sort((a, b) => a.line - b.line)
}

/** 收集 ui src 下全部 .ts（usage 含测试文件；定义只看非测试文件，见 auditUnusedCssClasses）。 */
function collectAllTsFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectAllTsFiles(path))
    else if (/\.ts$/.test(entry.name)) out.push(path)
  }
  return out
}

/**
 * 全量审计：返回 [{ file, violations }]（仅含存在违规的文件，按文件排序）。
 * 真实候选 = 这里的原始输出；例外过滤在 assert-audit 侧做。
 */
export function auditUnusedCssClasses(root = UI_SRC) {
  const absRoot = join(ROOT, root)
  if (!existsSync(absRoot)) return []
  const files = collectAllTsFiles(absRoot).map(relOf)
  const scopes = collectCssUsageByScope(files)
  const results = []
  for (const file of files) {
    if (/\.test\.ts$/.test(file)) continue
    const source = readFileSync(join(ROOT, file), 'utf8')
    const usage = usageTokensFor(scopes, cssScopeOf(file))
    const violations = findUnusedCssClasses(source, file, usage)
    if (violations.length > 0) results.push({ file, violations })
  }
  return results.sort((a, b) => a.file.localeCompare(b.file))
}

/**
 * 读取未使用 CSS 类例外表（`{ exceptions: [{ file, class, reason }] }`）。
 * 例外精确到文件 + 类名，reason 强制（没有理由的例外会把门禁变成摆设）。
 */
export function loadCssClassExceptions(path) {
  if (!existsSync(path)) return []
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.exceptions ?? [])
  return list.map((entry, index) => {
    const where = `${path}#${index}`
    if (!entry || typeof entry !== 'object') throw new Error(`${where}: 例外必须是对象`)
    if (!entry.file) throw new Error(`${where}: 缺少 file`)
    if (typeof entry.class !== 'string' || !CLASS_TOKEN_RE.test(entry.class)) {
      throw new Error(`${where}: class 必须是合法类名`)
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 4) {
      throw new Error(`${where}: 必须写 reason（为什么这个类合法存在）`)
    }
    return entry
  })
}

/** 剔除已登记例外，返回 `{ violations, stale }`（一条例外只消费一条命中）。 */
export function applyCssClassExceptions(violationList, exceptions) {
  const used = new Set()
  const remaining = violationList.filter((violation) => {
    const index = exceptions.findIndex((exception, i) => {
      if (used.has(i)) return false
      return exception.file === violation.file && exception.class === violation.className
    })
    if (index < 0) return true
    used.add(index)
    return false
  })
  const stale = exceptions.filter((_, i) => !used.has(i))
  return { violations: remaining, stale }
}
