#!/usr/bin/env node
/**
 * 源码卫生守卫：未使用 CSS 类 + 魔法间距尺寸 + 孪生协议判定（三维度）。
 *
 * ## 未使用 CSS 类
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
 *   （unused-css-class-exceptions.json，file + class + reason，menu arrow 现状）；
 * - 已知边界：样式模板提取（extractCssBlocks）只认 `const|let|var <名> = \`…\``
 *   这一种声明形态——带类型标注的常量（`const X: string = ...`）、类字段（`static X = ...`
 *   与实例字段 `X = ...`）以及 String.raw 包裹的模板暂不扫描（宁可少报，不把非样式
 *   模板误认成 CSS 块）。
 *
 * 例外：scripts/qa/unused-css-class-exceptions.json，精确到 file + class + reason；
 * 一条例外只消费一条命中，不再命中即报陈旧；只登记真实候选，不修改产品源码清零。
 * i18n 死键精确集合由 packages/i18n/src/slices/completeness.test.ts 的 EXPECTED_DEAD
 * 双向断言覆盖，不在本守卫范围。
 *
 * ## 魔法间距尺寸（magic-spacing）
 *
 * 背景：间距只走 `--oas-space-*` token 是项目硬规；直接写死的 px 会在主题缩放、
 * 紧凑模式和 RTL 下与 token 体系脱节（同一组件出现 2px/3px/4px 混杂的漂移）。
 *
 * 口径（低误报优先，用例见同目录 hygiene-guards.test.mjs）：
 * - 只扫 margin / padding / gap 及其子属性（margin-block-start、padding-top、row-gap 等）；
 *   border / inset / 宽高 / 字号等几何属性不在范围；
 * - 只认声明里的**直接**非零 px：`var()` / `calc()` / `clamp()` / `min()` / `max()` /
 *   `env()` 函数整体剔除后再找 px，所以 `var(--oas-space-2, 8px)`（token 回退）与
 *   `calc(100% - 4px)`（相对计算）都不命中；
 * - `0` / `0px` 是零值不命中，百分比 / em / rem 不命中（单位不是 px）；
 * - 一条声明报一条违规（`padding: 4px 8px` 合并，detail 列出全部 px），行号指向声明行；
 * - 扫描范围 = 与未使用 CSS 类同一个 CSS 块提取口径（样式模板），不含测试文件；
 *   模板里 `${}` 插值被剔除，`padding: ${x}px` 之类的动态值不会命中；
 * - 已知边界：自定义属性声明（`--x: 3px`）不是间距属性、模板 HTML 里的内联
 *   `style="margin: 4px"` 与 JS 内联声明（`style.cssText = 'margin: 4px'`）都不在 CSS
 *   块内——三者都不在扫描范围（前者是 token 定义位，后两者应改写为类规则）；样式模板
 *   提取只认 `const|let|var <名> = \`…\`` 声明形态（带类型标注常量、类字段与 String.raw
 *   包裹的模板不扫描，同一已知边界见「未使用 CSS 类」）。
 *
 * 例外：scripts/qa/magic-spacing-exceptions.json，精确到 file + property + value +
 * reason；一条例外只消费一条命中（同一文件重复出现的同值声明须逐条登记），
 * 不再命中即报陈旧。只登记真实候选（命中区几何、光学对齐、负值缝线等组件自有常量），
 * 不修改产品源码清零。
 *
 * ## 孪生协议判定（twin-predicate）
 *
 * 背景：组件的属性协议判定（`hasAttr('open') && getAttr('mode', '') === 'x'` 同型）是
 * 同一份语义契约，复制到两个函数/两个组件后容易单边漂移——改一处忘另一处，属性行为
 * 就此分裂。守卫只负责让「同一判定被重复实现」可见，不判断该不该抽公共 helper。
 *
 * 口径（低误报优先，用例见同目录 hygiene-guards.test.mjs）：
 * - 有界词法扫描（不引 TypeScript 编译器、不起子进程、不建虚拟文件系统）：源码先抹掉注释
 *   （保留字符串内容），再标出「代码位」——字符串 / 模板静态段的内容不算代码位，结构扫描
 *   只看代码位，所以字符串里的 `&&`、括号、`if` 不会被误判；
 * - 提取三类条件：`if (...)` 的平衡括号内容、`return <expr>`（depth=0 遇 `;` 或换行收口，
 *   换行前行尾是 `&&` / `||` / `?` / `,` 等未收口运算符时继续跨行）、以及其中顶层三元 `?`
 *   之前的条件位（`return a && b ? x : y` 只取 `a && b`；`?.` / `??` 不算三元）。
 *   只取条件位本身，不追踪变量赋值的历史；
 * - 只认**复合布尔判定**：表达式根（剥冗余括号、允许整体 `!` 取反）必须是 `&&` / `||`，
 *   且表达式内出现协议原子调用 `getAttr` / `hasAttr` / `getAttribute` / `hasAttribute`。
 *   单原子守卫（`if (this.hasAttr('x'))`）、普通 `if (x)` / `if (a && b)` 不在范围；
 * - `&&` / `||` 的直接操作数必须是布尔形态（标识符、属性访问、调用、`!`、比较或嵌套逻辑），
 *   所以 `Number(getAttr('height', '320')) || 320`、`getAttr('value', '') || 'on'` 这类
 *   数值/字符串兜底不算布尔判定，不命中；
 * - 归一化只做两件事：折叠代码位空白、剥掉冗余外层括号（含整体取反包裹的括号）；字符串
 *   内容原样保留（不改内容、不折空白）。报文本仍含原始引号与操作数顺序，`!(a && b)` 与
 *   `a && b` 不同组——不做模糊相似度、不做大小写/等值化简，参数不同或操作数顺序不同一律不报；
 * - 同一归一化文本出现在**不同函数**（含模块级作用域）或**不同文件**才报；同一函数内
 *   重复不报。报告按「文件 × 判定」聚合：一条命中列出该文件全部出现行与其它文件位置，
 *   `count` = 该文件出现次数；
 * - 函数作用域由词法结构识别（`=> {`，或参数表 `)` 之后、允许夹一个返回类型注解的 `{`；
 *   参数表前是 if/for/while/switch/catch/with 的 `{` 是语句块不算函数）；
 *   不平衡括号、未闭合字符串/模板等残缺输入一律安全跳过，不抛错。测试文件不参与
 *   （`*.test.ts` 跳过）；
 * - 已知边界（宁可少报）：只取 `if (...)` / `return <expr>` 两个位置的判定——变量初始化
 *   赋值（`const x = a && b`）与赋值/实参里的三元条件位（`const x = a && b ? c : d`）整体
 *   不在提取范围；表达式体箭头（`() => expr`）的表达式体不是 `if`/`return` 位置，其内部
 *   判定不单独成为候选（也不单独成函数作用域）；类属性箭头与回调箭头一律记 `(anonymous)`。
 *
 * 例外：scripts/qa/twin-predicate-exceptions.json，精确到 file + predicate + count +
 * reason；`count` 必须与当前出现次数一致——同一文件再复制一份副本（count 变化）不会被
 * 旧例外放行，反而会重新红灯并提示更新。一条例外只消费一条命中，不再命中即报陈旧。
 * 只登记真实候选，不修改产品源码清零。
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

/**
 * 从 `openIndex`（反引号下标）走到配对反引号，返回 { content, end }；content 只含 ${} 之外的静态文本。
 * `keepLineBreaks` 为真时，插值内部的换行原样保留——CSS 块的行号反查必须与源码对齐
 * （插值跨多行时，不保留换行会让后续声明行号整体前移）。
 */
function walkTemplate(source, openIndex, keepLineBreaks = false) {
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
    else if (keepLineBreaks && c === '\n') content += '\n'
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
    const { content, end } = walkTemplate(stripped, openIndex, true)
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

/* -------------------------------------------------------------------------- */
/* 魔法间距尺寸（magic-spacing）                                                */
/*                                                                           */
/* 只命中 margin/padding/gap（含逻辑子属性、row/column-gap）声明里的直接非零 px； */
/* var()/calc()/clamp()/min()/max()/env() 包裹的长度、0、百分比/em/rem 都不命中。 */
/* 例外 = scripts/qa/magic-spacing-exceptions.json（file + property + value +  */
/* reason，一条例外消费一条命中）。                                            */
/* -------------------------------------------------------------------------- */

const RULE_SPACING = 'magic-spacing'
const RULE_SPACING_SUGGESTION =
  '间距只走 --oas-space-* token；确属组件自有几何（命中区扩展、光学对齐、边框接缝负偏移、成对的 padding/margin 抵消）请登记 scripts/qa/magic-spacing-exceptions.json 并写清 reason。'

/**
 * 间距属性白名单（大小写不敏感）：
 * - margin/padding（含 -inline/-block/-start/-end 与 -top/-right/-bottom/-left）；
 * - gap / row-gap / column-gap 及其 grid- 前缀别名（grid-gap / grid-row-gap / grid-column-gap）；
 * - grid-template-* / grid-auto-* 是轨道定义，不是间距，不命中。
 */
const SPACING_PROPERTY_RE =
  /^(?:margin|padding)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?$|^(?:grid-)?(?:row-|column-)?gap$/i

/** 参与相对计算的 CSS 函数：整体剔除后再找 px（token 回退、calc 表达式都不算直接值）。 */
const SPACING_FUNCTION_RE = /\b(?:var|calc|clamp|min|max|env)\(/gi
/** px 长度（含小数与负值）；紧跟字母数字的不算（px2、pxx 之类不是长度）。 */
const PX_LENGTH_RE = /(-?\d*\.?\d+)px(?![a-z0-9])/gi

/** 剔除 var()/calc()/clamp()/min()/max()/env() 调用（含嵌套括号），保留其余文本。 */
function stripSpacingFunctions(value) {
  const re = new RegExp(SPACING_FUNCTION_RE.source, 'gi')
  let out = ''
  let cursor = 0
  let m
  while ((m = re.exec(value))) {
    const open = m.index + m[0].length - 1
    let depth = 0
    let i = open
    while (i < value.length) {
      if (value[i] === '(') depth++
      else if (value[i] === ')') {
        depth--
        if (depth === 0) {
          i++
          break
        }
      }
      i++
    }
    out += `${value.slice(cursor, m.index)} `
    cursor = i
    re.lastIndex = i
  }
  return out + value.slice(cursor)
}

/** 声明值里的直接非零 px 长度（保持源码写法，如 `-1px` / `2.5px`）。 */
function collectMagicSpacingPx(value) {
  const out = []
  for (const m of stripSpacingFunctions(value).matchAll(PX_LENGTH_RE)) {
    const number = Number(m[1])
    if (!Number.isFinite(number) || number === 0) continue
    out.push(m[0])
  }
  return out
}

/**
 * 抹掉 CSS 注释但保留换行（行号反查必须与源码对齐；直接换成等长空格会吞掉注释里的换行）。
 */
function blankCssComments(css) {
  const out = css.split('')
  const re = new RegExp(CSS_COMMENT_RE.source, 'g')
  let m
  while ((m = re.exec(css))) {
    for (let k = m.index; k < m.index + m[0].length; k++) {
      if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' '
    }
  }
  return out.join('')
}

/**
 * 从一段 CSS 提取间距声明（含相对块起始的行号）。
 * 声明边界 = `;` 或 `{`（块内首条声明紧跟在选择器的 `{` 后）。
 */
function extractSpacingDeclarations(css, startLine) {
  const cleaned = blankCssComments(css)
  const out = []
  const re = /(?:^|[;{])\s*([a-zA-Z-]+)\s*:\s*([^;{}]*)/g
  let m
  while ((m = re.exec(cleaned))) {
    const property = m[1]
    if (!SPACING_PROPERTY_RE.test(property)) continue
    const value = m[2].trim().replace(/\s+/g, ' ')
    if (!value) continue
    const offset = m.index + m[0].indexOf(property)
    const line = startLine + cleaned.slice(0, offset).split('\n').length - 1
    out.push({ property, value, line })
  }
  return out
}

/**
 * 单文件的魔法间距检测：直接非零 px 的 margin/padding/gap 声明各报一条。
 * @param source 文件源码
 * @param file 仓库相对路径
 */
export function findMagicSpacing(source, file) {
  const lines = source.split(/\r?\n/)
  const violations = []
  for (const block of extractCssBlocks(source)) {
    for (const { property, value, line } of extractSpacingDeclarations(block.content, block.startLine)) {
      const px = collectMagicSpacingPx(value)
      if (px.length === 0) continue
      const declaration = `${property}: ${value}`
      violations.push({
        file,
        line,
        rule: RULE_SPACING,
        detail: `${declaration} 直接使用 ${px.join('、')}（未走间距 token）`,
        snippet: (lines[line - 1] ?? '').trim().slice(0, 240),
        message: `${file}:${line} [${RULE_SPACING}] ${declaration} 直接使用 ${px.join('、')}。${RULE_SPACING_SUGGESTION}`,
        property,
        value,
        px,
      })
    }
  }
  return violations.sort((a, b) => a.line - b.line)
}

/** 全量审计：返回 [{ file, violations }]（仅含存在违规的文件，按文件排序）。 */
export function auditMagicSpacing(root = UI_SRC) {
  const absRoot = join(ROOT, root)
  if (!existsSync(absRoot)) return []
  const results = []
  for (const file of collectAllTsFiles(absRoot).map(relOf).sort()) {
    if (/\.test\.ts$/.test(file)) continue
    const violations = findMagicSpacing(readFileSync(join(ROOT, file), 'utf8'), file)
    if (violations.length > 0) results.push({ file, violations })
  }
  return results
}

/**
 * 读取魔法间距例外表（`{ exceptions: [{ file, property, value, reason }] }`）。
 * 精确到文件 + 属性 + 声明值：属性必须落在间距白名单，value 是 CSS 声明值原文。
 */
export function loadMagicSpacingExceptions(path) {
  if (!existsSync(path)) return []
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.exceptions ?? [])
  return list.map((entry, index) => {
    const where = `${path}#${index}`
    if (!entry || typeof entry !== 'object') throw new Error(`${where}: 例外必须是对象`)
    if (!entry.file) throw new Error(`${where}: 缺少 file`)
    if (typeof entry.property !== 'string' || !SPACING_PROPERTY_RE.test(entry.property)) {
      throw new Error(`${where}: property 必须是间距属性（margin/padding/gap 及其逻辑子属性）`)
    }
    if (typeof entry.value !== 'string' || entry.value.trim().length === 0) {
      throw new Error(`${where}: 缺少 value（CSS 声明值，如 "2px var(--oas-space-1)"）`)
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 4) {
      throw new Error(`${where}: 必须写 reason（为什么这个直接 px 合法）`)
    }
    return entry
  })
}

/** 剔除已登记例外，返回 `{ violations, stale }`（一条例外只消费一条命中）。 */
export function applyMagicSpacingExceptions(violationList, exceptions) {
  const used = new Set()
  const remaining = violationList.filter((violation) => {
    const index = exceptions.findIndex((exception, i) => {
      if (used.has(i)) return false
      return (
        exception.file === violation.file &&
        exception.property === violation.property &&
        exception.value === violation.value
      )
    })
    if (index < 0) return true
    used.add(index)
    return false
  })
  const stale = exceptions.filter((_, i) => !used.has(i))
  return { violations: remaining, stale }
}

/* -------------------------------------------------------------------------- */
/* 孪生协议判定（twin-predicate）                                              */
/*                                                                           */
/* 有界词法扫描（无编译器、无子进程、无虚拟文件系统）提取 if / return / 三元     */
/* 条件里的复合布尔判定（协议原子 getAttr/hasAttr/getAttribute/hasAttribute +   */
/* &&/||），归一化后相同的副本跨函数或跨文件出现即报；单原子、普通变量、         */
/* 不同参数、数值/字符串兜底不命中。                                           */
/* 例外 = scripts/qa/twin-predicate-exceptions.json（file + predicate +       */
/* count + reason，一条例外消费一条命中）。                                    */
/* -------------------------------------------------------------------------- */

const RULE_TWIN = 'twin-predicate'
const RULE_TWIN_SUGGESTION =
  '把重复的复合协议判定抽成具名 helper / 基类方法（同一结论只写一处）；确属不同组件各自必须保留的同型判定，登记 scripts/qa/twin-predicate-exceptions.json（file + predicate + count + reason）。'

/** 协议原子：OASElement 的属性读取 API 与原生 DOM 属性 API（必须是调用形态）。 */
const PROTOCOL_ATOM_NAMES = new Set(['getAttr', 'hasAttr', 'getAttribute', 'hasAttribute'])

/** 控制语句关键字：`kw (...) {` 的 `{` 是语句块，不是函数体（作用域边界判定用）。 */
const CONTROL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with'])

/** 行尾是这类符号说明表达式还没收口（return 跨行延续判定用）。 */
const CONTINUE_CHARS = new Set([
  '&',
  '|',
  '?',
  ':',
  ',',
  '=',
  '+',
  '-',
  '*',
  '/',
  '%',
  '^',
  '<',
  '>',
  '!',
  '~',
  '(',
  '[',
])

/** 前缀关键字形态的操作数不是布尔形态（`typeof x` / `new Foo()` 之类）。 */
const NON_BOOLEAN_PREFIX_RE = /^(?:typeof|void|delete|new|await|yield|function|class)\b/

const IDENT_STICKY = /[A-Za-z_$][\w$]*/y
const IDENT_START_RE = /[A-Za-z_$]/
const WORD_CHAR_RE = /[\w$]/

function isSpaceChar(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v'
}

/** 读一个完整标识符（sticky 正则，不反复 slice 大字符串）。 */
function readIdentifier(source, index, limit) {
  IDENT_STICKY.lastIndex = index
  const match = IDENT_STICKY.exec(source)
  if (!match || match.index !== index) return ''
  if (match.index + match[0].length > limit) return ''
  return match[0]
}

/**
 * 代码位掩码：字面量（单/双引号字符串、模板静态段）内容置 0，其余位置（含引号分隔符与
 * 模板 `${}` 内的代码）置 1。所有结构扫描只看代码位——字符串里的 `&&`、括号、`if`
 * 都不会被误判。未闭合字面量收在行尾 / 文件结尾：损坏输入退化为「少认」，不抛错。
 */
function buildCodeMask(source) {
  const mask = new Uint8Array(source.length)
  markCode(source, mask, 0, false)
  return mask
}

/** 标记 `[from, ...)` 为代码位；`stopAtBrace` 时在配对 `}` 处返回其下标（模板插值用）。 */
function markCode(source, mask, from, stopAtBrace) {
  let i = from
  let braceDepth = 0
  while (i < source.length) {
    const c = source[i]
    if (c === "'" || c === '"') {
      i = markQuoted(source, mask, i)
      continue
    }
    if (c === '`') {
      i = markTemplate(source, mask, i)
      continue
    }
    if (c === '{') braceDepth++
    else if (c === '}') {
      if (braceDepth === 0 && stopAtBrace) return i
      if (braceDepth > 0) braceDepth--
    }
    mask[i] = 1
    i++
  }
  return i
}

/** 标记一个引号字面量（引号本身算代码位）；未闭合时收在行尾，之后按代码继续。 */
function markQuoted(source, mask, quoteIndex) {
  const quote = source[quoteIndex]
  mask[quoteIndex] = 1
  let i = quoteIndex + 1
  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2
      continue
    }
    if (source[i] === quote) {
      mask[i] = 1
      return i + 1
    }
    if (source[i] === '\n') return i
    i++
  }
  return i
}

/** 标记一个模板字面量：静态段不是代码位，`${}` 内的表达式重新按代码标记。 */
function markTemplate(source, mask, openIndex) {
  mask[openIndex] = 1
  let i = openIndex + 1
  while (i < source.length) {
    const c = source[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '$' && source[i + 1] === '{') {
      mask[i] = 1
      mask[i + 1] = 1
      i = markCode(source, mask, i + 2, true)
      if (i < source.length) {
        mask[i] = 1
        i++
      }
      continue
    }
    if (c === '`') {
      mask[i] = 1
      return i + 1
    }
    i++
  }
  return i
}

/**
 * 括号配对表（双向可查）。错配处丢弃更深未闭合层，保证单次 O(n)：输入残缺时退化为
 * 「认不出」，不会把嵌套里的 `&&` 误当顶层运算符。
 */
function buildPairs(source, mask) {
  const pairs = new Map()
  const stack = []
  const wantOf = { ')': '(', ']': '[', '}': '{' }
  for (let i = 0; i < source.length; i++) {
    if (!mask[i]) continue
    const c = source[i]
    if (c === '(' || c === '[' || c === '{') {
      stack.push(i)
      continue
    }
    const want = wantOf[c]
    if (!want) continue
    let k = stack.length - 1
    while (k >= 0 && source[stack[k]] !== want) k--
    if (k < 0) continue
    const open = stack[k]
    stack.length = k
    pairs.set(open, i)
    pairs.set(i, open)
  }
  return pairs
}

/** 行号反查用：行首偏移表。 */
function buildLineStarts(source) {
  const starts = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1)
  return starts
}

function lineAt(lineStarts, offset) {
  let low = 0
  let high = lineStarts.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (lineStarts[mid] <= offset) low = mid
    else high = mid - 1
  }
  return low + 1
}

/** 区间去首尾空白。 */
function trimRange(source, from, to) {
  let start = from
  let end = to
  while (start < end && isSpaceChar(source[start])) start++
  while (end > start && isSpaceChar(source[end - 1])) end--
  return [start, end]
}

/** 剥掉冗余外层括号（配对 `)` 必须正好收在区间末位才剥）。 */
function unwrapOuterRange(source, pairs, from, to) {
  let [start, end] = trimRange(source, from, to)
  while (start < end && source[start] === '(' && pairs.get(start) === end - 1) {
    start++
    end--
    ;[start, end] = trimRange(source, start, end)
  }
  return [start, end]
}

/** 顶层（括号外）`&&` / `||` 运算符位置。 */
function findLogicalSplits(source, mask, pairs, from, to) {
  const splits = []
  let i = from
  while (i < to) {
    if (!mask[i]) {
      i++
      continue
    }
    const c = source[i]
    if (c === '(' || c === '[' || c === '{') {
      const close = pairs.get(i)
      i = close !== undefined && close < to ? close + 1 : i + 1
      continue
    }
    if ((c === '&' && source[i + 1] === '&') || (c === '|' && source[i + 1] === '|')) {
      splits.push({ start: i, end: i + 2 })
      i += 2
      continue
    }
    i++
  }
  return splits
}

/** 按顶层运算符切出操作数区间。 */
function logicalSegments(splits, from, to) {
  const segments = []
  let cursor = from
  for (const split of splits) {
    segments.push([cursor, split.start])
    cursor = split.end
  }
  segments.push([cursor, to])
  return segments
}

/** 顶层三元 `?`（排除 `?.` 与 `??`）下标；没有返回 -1。 */
function findTopLevelQuestion(source, mask, pairs, from, to) {
  let i = from
  while (i < to) {
    if (!mask[i]) {
      i++
      continue
    }
    const c = source[i]
    if (c === '(' || c === '[' || c === '{') {
      const close = pairs.get(i)
      i = close !== undefined && close < to ? close + 1 : i + 1
      continue
    }
    if (c === '?') {
      const next = source[i + 1]
      if (next === '?') {
        i += 2
        continue
      }
      if (next === '.') {
        i++
        continue
      }
      return i
    }
    i++
  }
  return -1
}

/** 区间内是否出现协议原子调用（`getAttr` / `hasAttr` / `getAttribute` / `hasAttribute`）。 */
function containsProtocolAtom(source, mask, from, to) {
  let i = from
  while (i < to) {
    if (!mask[i]) {
      i++
      continue
    }
    if (!IDENT_START_RE.test(source[i])) {
      i++
      continue
    }
    const word = readIdentifier(source, i, to)
    if (!word) {
      i++
      continue
    }
    if (PROTOCOL_ATOM_NAMES.has(word)) {
      let j = i + word.length
      while (j < to && mask[j] && isSpaceChar(source[j])) j++
      // 可选调用 `getAttribute?.(`：语义上仍是同名协议的调用（词法扫描把 `?.` 视作调用前缀）
      if (source[j] === '?' && source[j + 1] === '.') {
        j += 2
        while (j < to && mask[j] && isSpaceChar(source[j])) j++
      }
      if (source[j] === '(') return true
    }
    i += word.length
  }
  return false
}

/** 顶层比较 / 嵌套逻辑 / 三元：出现即说明操作数是布尔表达式。 */
function hasTopLevelBinaryOperator(source, mask, pairs, from, to) {
  let i = from
  while (i < to) {
    if (!mask[i]) {
      i++
      continue
    }
    const c = source[i]
    if (c === '(' || c === '[' || c === '{') {
      const close = pairs.get(i)
      i = close !== undefined && close < to ? close + 1 : i + 1
      continue
    }
    if ((c === '&' && source[i + 1] === '&') || (c === '|' && source[i + 1] === '|')) return true
    if (c === '=' && source[i + 1] === '=') return true
    if (c === '!' && source[i + 1] === '=') return true
    if (c === '<' || c === '>') return true
    if (c === '?') {
      if (source[i + 1] === '?') {
        i += 2
        continue
      }
      if (source[i + 1] === '.') {
        i++
        continue
      }
      return true
    }
    if (IDENT_START_RE.test(c)) {
      const word = readIdentifier(source, i, to)
      if (!word) {
        i++
        continue
      }
      if (word === 'in' || word === 'instanceof') {
        const before = source[i - 1]
        const after = source[i + word.length]
        const spaced = (!before || !WORD_CHAR_RE.test(before)) && after !== undefined && isSpaceChar(after)
        if (spaced) return true
      }
      i += word.length
      continue
    }
    i++
  }
  return false
}

/** 标识符 / 括号组 / 属性访问 / 调用 / 元素访问链（`a.b(...)[0]!.c`、`(x as T).y`）。 */
function isPostfixChain(source, mask, pairs, from, to) {
  let i = from
  if (source[i] === '(') {
    const close = pairs.get(i)
    if (close === undefined || close >= to) return false
    i = close + 1
  } else {
    const head = readIdentifier(source, from, to)
    if (!head) return false
    i = from + head.length
  }
  while (i < to) {
    while (i < to && mask[i] && isSpaceChar(source[i])) i++
    if (i >= to) return true
    const c = source[i]
    if (c === '.') {
      const name = readIdentifier(source, i + 1, to)
      if (!name) return false
      i += 1 + name.length
      continue
    }
    if (c === '?' && source[i + 1] === '.') {
      i += 2
      const name = readIdentifier(source, i, to)
      if (name) {
        i += name.length
        continue
      }
      // `?.(` / `?.[` 可选调用 / 可选下标
      if (source[i] === '(' || source[i] === '[') {
        const close = pairs.get(i)
        if (close === undefined || close >= to) return false
        i = close + 1
        continue
      }
      return false
    }
    if (c === '(' || c === '[') {
      const close = pairs.get(i)
      if (close === undefined || close >= to) return false
      i = close + 1
      continue
    }
    if (c === '!' && source[i + 1] !== '=') {
      i++
      continue
    }
    return false
  }
  return true
}

/**
 * 操作数是否布尔形态：标识符、属性/元素访问、调用、`!`、比较或嵌套逻辑。
 * 数值/字符串字面量与算术表达式不算——把 `getAttr(...) || 320` 这类兜底默认值排除掉。
 */
function isBooleanOperandRange(source, mask, pairs, from, to) {
  const [start, end] = trimRange(source, from, to)
  if (start >= end) return false
  const [innerStart, innerEnd] = unwrapOuterRange(source, pairs, start, end)
  if (innerStart !== start || innerEnd !== end) {
    return isBooleanOperandRange(source, mask, pairs, innerStart, innerEnd)
  }
  const head = source[start]
  if (head === "'" || head === '"' || head === '`') return false
  if (head === '-' || head === '+' || head === '~') return false
  if (isDigit(head) || (head === '.' && isDigit(source[start + 1]))) return false
  if (head === '!' && source[start + 1] !== '=') return true
  if (hasTopLevelBinaryOperator(source, mask, pairs, start, end)) return true
  const text = source.slice(start, end)
  if (text === 'true' || text === 'false') return true
  if (NON_BOOLEAN_PREFIX_RE.test(text)) return false
  return isPostfixChain(source, mask, pairs, start, end)
}

function isDigit(ch) {
  return ch !== undefined && ch >= '0' && ch <= '9'
}

/** 归一化：只折代码位空白，字符串内容原样保留（不做大小写 / 等值化简）。 */
function normalizeRange(source, mask, from, to) {
  let out = ''
  let pendingSpace = false
  for (let i = from; i < to; i++) {
    const c = source[i]
    if (mask[i] && isSpaceChar(c)) {
      pendingSpace = true
      continue
    }
    if (pendingSpace) {
      if (out.length > 0) out += ' '
      pendingSpace = false
    }
    out += c
  }
  return out
}

/**
 * 复合布尔判定的归一化文本；不是「根为 `&&` / `||`（允许整体 `!`）且含协议原子」的
 * 判定返回 null。
 */
function booleanPredicate(source, mask, pairs, from, to) {
  const [start, end] = unwrapOuterRange(source, pairs, from, to)
  if (start >= end) return null
  if (!containsProtocolAtom(source, mask, start, end)) return null
  const splits = findLogicalSplits(source, mask, pairs, start, end)
  if (splits.length > 0) {
    for (const [operandStart, operandEnd] of logicalSegments(splits, start, end)) {
      if (!isBooleanOperandRange(source, mask, pairs, operandStart, operandEnd)) return null
    }
    return normalizeRange(source, mask, start, end)
  }
  // 整体取反：`!(a && b)` 与 `a && b` 不是同一结论，归一化文本保留 `!`
  if (source[start] === '!' && source[start + 1] !== '=') {
    const [innerStart, innerEnd] = unwrapOuterRange(source, pairs, start + 1, end)
    const innerSplits = findLogicalSplits(source, mask, pairs, innerStart, innerEnd)
    if (innerSplits.length === 0) return null
    for (const [operandStart, operandEnd] of logicalSegments(innerSplits, innerStart, innerEnd)) {
      if (!isBooleanOperandRange(source, mask, pairs, operandStart, operandEnd)) return null
    }
    return normalizeRange(source, mask, start, end)
  }
  return null
}

/** 从 `index` 往前找上一个非空白代码位。 */
function previousCodeIndex(source, mask, index) {
  let i = index
  while (i >= 0 && (!mask[i] || isSpaceChar(source[i]))) i--
  return i
}

/** 从 `index` 往后找下一个非空白代码位。 */
function nextCodeIndex(source, mask, index) {
  let i = index
  while (i < source.length && mask[i] && isSpaceChar(source[i])) i++
  return i
}

/** 参数表前面那个词（`if (` → `if`；`foo<T>(` / 返回类型注解 → 空串）。 */
function wordBeforeParen(source, mask, pairs, parenIndex) {
  const before = previousCodeIndex(source, mask, parenIndex - 1)
  if (before < 0) return ''
  let start = before
  while (start >= 0 && WORD_CHAR_RE.test(source[start])) start--
  return source.slice(start + 1, before + 1)
}

/** `{` 前若紧邻参数表 `)`（允许夹一个返回类型注解），返回参数表 `(` 的下标。 */
function parameterListParen(source, mask, pairs, braceIndex) {
  const prev = previousCodeIndex(source, mask, braceIndex - 1)
  if (prev < 0) return undefined
  if (source[prev] === ')') return pairs.get(prev)
  // 返回类型注解：往前的 `:` 前必须是参数表 `)`（`): boolean {` / `): Promise<void> {` /
  // `): Map<string, number> {`）；扫描长度有上限，避免大文件退化成 O(n²)
  let depth = 0
  const limit = Math.max(0, braceIndex - 240)
  for (let i = prev; i >= limit; i--) {
    if (!mask[i]) continue
    const c = source[i]
    if (c === ')' || c === ']' || c === '>' || c === '}') {
      depth++
      continue
    }
    if (c === '(' || c === '[' || c === '<' || c === '{') {
      if (depth === 0) return undefined
      depth--
      continue
    }
    if (depth > 0) continue
    if (c === ':') {
      const before = previousCodeIndex(source, mask, i - 1)
      if (before < 0 || source[before] !== ')') return undefined
      return pairs.get(before)
    }
    if (c === ';' || c === '=' || c === ',') return undefined
  }
  return undefined
}

/** `{` 是否是函数体：`=>` 之后，或参数表 `)` 之后且参数表前不是控制关键字。 */
function isFunctionBodyBrace(source, mask, pairs, braceIndex) {
  const prev = previousCodeIndex(source, mask, braceIndex - 1)
  if (prev < 0) return false
  if (source[prev] === '>' && source[prev - 1] === '=') return true
  const open = parameterListParen(source, mask, pairs, braceIndex)
  if (open === undefined) return false
  return !CONTROL_KEYWORDS.has(wordBeforeParen(source, mask, pairs, open))
}

/** 函数显示名：具名函数/方法取名字，箭头与匿名函数 `(anonymous)`。 */
function functionLabel(source, mask, pairs, braceIndex) {
  const prev = previousCodeIndex(source, mask, braceIndex - 1)
  if (prev < 0) return '(anonymous)'
  if (source[prev] === '>' && source[prev - 1] === '=') return '(anonymous)'
  const open = parameterListParen(source, mask, pairs, braceIndex)
  if (open === undefined) return '(anonymous)'
  const word = wordBeforeParen(source, mask, pairs, open)
  if (!word || word === 'function' || CONTROL_KEYWORDS.has(word)) return '(anonymous)'
  return word
}

/** 全部函数体区间（`{` 起止偏移 + 显示名），供「跨函数」判定用。 */
function collectFunctionBodies(source, mask, pairs) {
  const bodies = []
  for (let i = 0; i < source.length; i++) {
    if (!mask[i] || source[i] !== '{') continue
    const close = pairs.get(i)
    if (close === undefined) continue
    if (!isFunctionBodyBrace(source, mask, pairs, i)) continue
    bodies.push({ start: i, end: close, label: functionLabel(source, mask, pairs, i) })
  }
  return bodies
}

/** 候选所在的最内层函数作用域（模块级兜底）。 */
function scopeAt(file, bodies, offset) {
  let best = null
  for (const body of bodies) {
    if (body.start >= offset || offset >= body.end) continue
    if (!best || body.start > best.start) best = body
  }
  return best ? { key: `${file}#${best.start}`, label: best.label } : { key: `${file}#module`, label: '(module)' }
}

/** 行尾是未收口运算符时，`return` 表达式跨行继续。 */
function continuesExpression(source, mask, newlineIndex) {
  const last = previousCodeIndex(source, mask, newlineIndex - 1)
  if (last < 0) return false
  return CONTINUE_CHARS.has(source[last])
}

/**
 * 取 `return` 后的表达式区间：depth=0 遇 `;` 或换行收口；换行前行尾是未收口运算符时继续；
 * depth>0（括号内）跨行继续；遇到外层结构的收口括号即停。
 */
function readReturnExpression(source, mask, from) {
  let i = from
  while (i < source.length && mask[i] && (source[i] === ' ' || source[i] === '\t')) i++
  if (i >= source.length) return null
  const first = source[i]
  if (first === '\n' || first === '\r' || first === ';' || first === '}' || first === ')' || first === ']') {
    return null
  }
  const start = i
  let depth = 0
  while (i < source.length) {
    if (!mask[i]) {
      i++
      continue
    }
    const c = source[i]
    if (c === '(' || c === '[' || c === '{') {
      depth++
      i++
      continue
    }
    if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break
      depth--
      i++
      continue
    }
    if (depth === 0) {
      if (c === ';') break
      if (c === '\n' && !continuesExpression(source, mask, i)) break
    }
    i++
  }
  return { start, end: i }
}

/**
 * 单文件候选提取（有界词法扫描）：`if (...)` 的平衡括号条件、`return <expr>` 表达式，
 * 以及其中顶层三元 `?` 之前的条件位（`return a && b ? x : y` 只取 `a && b`）。
 * 返回 `{ file, line, predicate, scopeKey, scopeLabel, snippet }[]`。
 */
function scanTwinCandidates(file, source) {
  // 注释先抹空（长度与换行不变，偏移与源码一致），保留字符串内容
  const text = stripCommentsKeepStrings(source)
  const mask = buildCodeMask(text)
  const pairs = buildPairs(text, mask)
  const lineStarts = buildLineStarts(text)
  const bodies = collectFunctionBodies(text, mask, pairs)
  const lines = source.split(/\r?\n/)
  const candidates = []
  const addCandidate = (from, to) => {
    const question = findTopLevelQuestion(text, mask, pairs, from, to)
    const [start, end] = trimRange(text, from, question >= 0 ? question : to)
    if (start >= end) return
    const predicate = booleanPredicate(text, mask, pairs, start, end)
    if (!predicate) return
    const scope = scopeAt(file, bodies, start)
    const line = lineAt(lineStarts, start)
    candidates.push({
      file,
      line,
      predicate,
      scopeKey: scope.key,
      scopeLabel: scope.label,
      snippet: (lines[line - 1] ?? '').trim().slice(0, 240),
    })
  }
  for (const match of text.matchAll(/\bif\b/g)) {
    if (!mask[match.index]) continue
    const open = nextCodeIndex(text, mask, match.index + 2)
    if (text[open] !== '(') continue
    const close = pairs.get(open)
    if (close === undefined) continue
    addCandidate(open + 1, close)
  }
  for (const match of text.matchAll(/\breturn\b/g)) {
    const at = match.index
    if (!mask[at]) continue
    if (at > 0 && text[at - 1] === '.') continue
    const expression = readReturnExpression(text, mask, at + 'return'.length)
    if (!expression) continue
    addCandidate(expression.start, expression.end)
  }
  return candidates.sort((a, b) => a.line - b.line)
}

/**
 * 批量提取候选（纯词法，不依赖编译器 / 子进程 / 虚拟文件系统）。
 * @param entries `{ file, source }[]`，file 为仓库相对 POSIX 路径
 */
export function collectTwinPredicates(entries) {
  const candidates = []
  const seen = new Set()
  for (const entry of entries) {
    if (!entry || typeof entry.file !== 'string' || typeof entry.source !== 'string') continue
    if (seen.has(entry.file)) continue
    seen.add(entry.file)
    candidates.push(...scanTwinCandidates(entry.file, entry.source))
  }
  return candidates.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

/** 位置摘要（detail 用）：`path:line（函数名）`。 */
function twinLocation(candidate) {
  return `${candidate.file}:${candidate.line}（${candidate.scopeLabel}）`
}

/**
 * 把候选按归一化判定分组，跨函数/跨文件才输出违规；每条按「文件 × 判定」聚合。
 * @param candidates collectTwinPredicates 的结果
 */
export function groupTwinPredicates(candidates) {
  const groups = new Map()
  for (const candidate of candidates) {
    if (!groups.has(candidate.predicate)) groups.set(candidate.predicate, [])
    groups.get(candidate.predicate).push(candidate)
  }

  const violations = []
  for (const [predicate, list] of groups) {
    const scopes = new Set(list.map((candidate) => candidate.scopeKey))
    if (scopes.size < 2) continue
    const byFile = new Map()
    for (const candidate of list) {
      if (!byFile.has(candidate.file)) byFile.set(candidate.file, [])
      byFile.get(candidate.file).push(candidate)
    }
    const locations = list
      .slice()
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
      .map(twinLocation)
    const summary =
      locations.length > 8 ? `${locations.slice(0, 8).join('、')} 等 ${locations.length} 处` : locations.join('、')
    for (const [file, occurrences] of byFile) {
      const sorted = occurrences.slice().sort((a, b) => a.line - b.line)
      violations.push({
        file,
        line: sorted[0].line,
        rule: RULE_TWIN,
        detail: `${predicate} 在 ${list.length} 处重复：${summary}`,
        snippet: sorted[0].snippet,
        message: `${file}:${sorted[0].line} [${RULE_TWIN}] 复合协议判定重复（本文件 ${sorted.length} 处，全仓 ${list.length} 处）：\`${predicate}\`。${RULE_TWIN_SUGGESTION}`,
        predicate,
        count: sorted.length,
        occurrences: sorted.map((candidate) => ({
          file: candidate.file,
          line: candidate.line,
          scope: candidate.scopeLabel,
        })),
      })
    }
  }
  return violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

/**
 * 单文件孪生判定：跨函数（同文件内）重复即报；跨文件由 audit / group 负责。
 * @param source 文件源码
 * @param file 仓库相对路径
 */
export function findTwinPredicates(source, file) {
  return groupTwinPredicates(collectTwinPredicates([{ file, source }]))
}

/** 全量审计：返回 `[{ file, violations }]`（仅含存在违规的文件，按文件排序）。 */
export function auditTwinPredicates(root = UI_SRC) {
  const absRoot = join(ROOT, root)
  if (!existsSync(absRoot)) return []
  const entries = []
  for (const file of collectAllTsFiles(absRoot).map(relOf).sort()) {
    if (/\.test\.ts$/.test(file)) continue
    const source = readFileSync(join(ROOT, file), 'utf8')
    // 没有协议原子名字的文件不可能产生候选，跳过解析（大文件解析成本不低）
    if (!/getAttr|hasAttr|getAttribute|hasAttribute/.test(source)) continue
    entries.push({ file, source })
  }
  const byFile = new Map()
  for (const violation of groupTwinPredicates(collectTwinPredicates(entries))) {
    if (!byFile.has(violation.file)) byFile.set(violation.file, [])
    byFile.get(violation.file).push(violation)
  }
  return [...byFile.keys()].sort((a, b) => a.localeCompare(b)).map((file) => ({ file, violations: byFile.get(file) }))
}

/**
 * 读取孪生判定例外表（`{ exceptions: [{ file, predicate, count, reason }] }`）。
 * `count` 必须与当前出现次数一致：同文件再复制副本即重新红灯，旧例外不能继续放行。
 */
export function loadTwinPredicateExceptions(path) {
  if (!existsSync(path)) return []
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.exceptions ?? [])
  return list.map((entry, index) => {
    const where = `${path}#${index}`
    if (!entry || typeof entry !== 'object') throw new Error(`${where}: 例外必须是对象`)
    if (!entry.file) throw new Error(`${where}: 缺少 file`)
    if (typeof entry.predicate !== 'string' || entry.predicate.trim().length === 0) {
      throw new Error(`${where}: 缺少 predicate（归一化后的复合判定原文）`)
    }
    if (!Number.isInteger(entry.count) || entry.count < 1) {
      throw new Error(`${where}: count 必须是正整数（当前文件内的出现次数）`)
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 4) {
      throw new Error(`${where}: 必须写 reason（为什么两处重复判定合理保留）`)
    }
    return entry
  })
}

/** 剔除已登记例外，返回 `{ violations, stale }`（一条例外只消费一条命中）。 */
export function applyTwinPredicateExceptions(violationList, exceptions) {
  const used = new Set()
  const remaining = violationList.filter((violation) => {
    const index = exceptions.findIndex((exception, i) => {
      if (used.has(i)) return false
      return (
        exception.file === violation.file &&
        exception.predicate === violation.predicate &&
        exception.count === violation.count
      )
    })
    if (index < 0) return true
    used.add(index)
    return false
  })
  const stale = exceptions.filter((_, i) => !used.has(i))
  return { violations: remaining, stale }
}

/**
 * 重复 devWarn 文案：同一「纯字符串字面量」消息出现在多个 devWarn 调用点。
 *
 * 只统计直接传单/双引号字面量的调用——模板字符串（动态前缀/插值）与常量引用不在内，
 * 后两者正是推荐的去重形态。devWarn 是 dev-only 通道，文案就近组件比集中登记更利于
 * 按需加载与上下文；只有完全相同的字面文案才应抽共享常量。
 */
export function collectDevWarnLiterals(source) {
  const stripped = stripCommentsKeepStrings(source)
  const out = []
  for (const m of stripped.matchAll(/^[ \t]*devWarn\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/gm)) {
    out.push({ line: stripped.slice(0, m.index).split('\n').length, message: m[2] })
  }
  return out
}

/** 按文案聚合，返回出现次数 ≥2 的组（附每处 file/line）。 */
export function findDuplicateDevWarnLiterals(entries) {
  const by = new Map()
  for (const entry of entries) {
    if (!by.has(entry.message)) by.set(entry.message, [])
    by.get(entry.message).push(entry)
  }
  return [...by.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([message, list]) => ({ message, occurrences: list }))
}

/** 全量审计：返回重复文案组（空数组 = 无重复）。 */
export function auditDuplicateDevWarnMessages(root = UI_SRC) {
  const absRoot = join(ROOT, root)
  if (!existsSync(absRoot)) return []
  const entries = []
  for (const file of collectAllTsFiles(absRoot)) {
    if (file.endsWith('.test.ts')) continue
    for (const hit of collectDevWarnLiterals(readFileSync(file, 'utf8'))) {
      entries.push({ ...hit, file: relOf(file) })
    }
  }
  return findDuplicateDevWarnLiterals(entries)
}
