#!/usr/bin/env node
/**
 * 测试断言质量审计（只读）。
 *
 * 目标不是把所有弱断言一次清零，而是让“新增假绿”可见：
 * - 无 expect 的测试文件；
 * - 运行时无条件 test.skip(true, ...)；
 * - 固定 waitForTimeout；
 * - 只断言存在/大于 0/truthy 的弱断言；
 * - 事件只断言 length 的模式（启发式）；
 * - OS 派生的绝对量断言（scroll 偏移 / getBoundingClientRect 绝对坐标 / 布局计数常数）。
 *
 * 阈值口径：`--check` 的上限**是防增量，不是要求清零**——历史存量按基线锁住，
 * 新增一条就让总数越过上限即红灯；确属合理新增（如新组件补了一组事件断言）才调阈值，
 * 并在提交说明里写清为什么。各维度各自独立设限（等待/弱断言/事件只断 length/OS 绝对量）。
 *
 * OS 绝对量维度单独说明：CI 跑 Ubuntu、本机跑 Windows，字体度量/滚动条宽度/取整差异会让
 * 「按本机校准的像素与计数常数」在 CI 系统性失配。正确方向是语义不变量（元素相对关系、
 * 前后差值、按 DOM 现算期望值）。例外登记在 `scripts/qa/os-assert-exceptions.json`，
 * 每条必须写 `reason`（为什么这条断言不依赖 OS）。
 *
 * 用法：
 *   node scripts/qa/assert-audit.mjs
 *   node scripts/qa/assert-audit.mjs --json
 *   node scripts/qa/assert-audit.mjs --check
 *   node scripts/qa/assert-audit.mjs --check --max-wait 400 --max-weak 380 --max-event-len 105
 *   node scripts/qa/assert-audit.mjs --check --max-os-absolute 82
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
// 文档站 spec 与组件回归 spec 同一套质量口径（当前 docs 下没有 spec，新增会自动纳入）
const DEFAULT_ROOTS = ['packages/ui/qa-regression', 'packages/ui/src', 'packages/docs']
// OS 绝对量维度只扫真实浏览器的 e2e（组件回归 + 顶层 e2e + 文档站）：
// packages/ui/src 是 happy-dom 单测，滚动值/几何由测试代码直接设定，不做字体度量，
// 不存在按本机校准的问题；把它们算进来只会稀释门禁信号。
const OS_ABSOLUTE_ROOTS = ['packages/ui/qa-regression', 'packages/docs']
const IGNORE_SKIP_FILES = new Set(['packages/ui/demo-coverage.spec.ts'])
// 视觉截图 spec 只产出人工复核素材，不承担断言；不是“忘了写 expect”
const INTENTIONAL_ZERO_EXPECT = new Set(['packages/ui/visual.spec.ts'])
const OS_ASSERT_EXCEPTIONS = 'scripts/qa/os-assert-exceptions.json'

export function walk(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // node_modules 里是 workspace 链接副本，扫进来会重复计数且不可维护
    if (entry.isDirectory() && entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (/\.(?:spec|test)\.ts$/.test(entry.name)) out.push(path)
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* OS 派生绝对量检测器（os-absolute-assertions）                              */
/* -------------------------------------------------------------------------- */

/** 绝对量阈值：scroll 偏移 / 坐标 < 10 视为容差或「回到 0」的语义不变量，不命中。 */
const OS_ABSOLUTE_MIN = 10
/** 计数常数阈值：< 3 多为「有没有 / 单复数」语义，不命中。 */
const OS_COUNT_MIN = 3

const RULE_SCROLL = 'scroll-offset-literal'
const RULE_RECT = 'rect-absolute-coord'
const RULE_COUNT = 'count-literal'

const RULE_META = {
  [RULE_SCROLL]: {
    label: 'scroll 偏移与数值字面量比较',
    suggestion:
      '改为语义不变量：与 DOM 现算期望值（scrollHeight - clientHeight、元素高度）比较，或用前后差值加容差表达「滚动了多少」；不要硬编码按本机校准的滚动像素。',
  },
  [RULE_RECT]: {
    label: 'getBoundingClientRect 绝对坐标与数值字面量比较',
    suggestion:
      '不要断言绝对坐标：改为元素相对关系（a.top ≈ b.bottom、包含关系、与自身 height 比较）或与 DOM 现算值（innerHeight、rect.height）比较；width/height 只做相对关系断言。',
  },
  [RULE_COUNT]: {
    label: '计数与整数常数等值比较',
    suggestion:
      '不要在计数上用按本机校准的常数：改为与 DOM 现算值比较（querySelectorAll().length）、前后差值或 ≥/≤ 下界；确属数据驱动（与布局无关）时登记到 os-assert-exceptions.json 并写 reason。',
  },
}

/**
 * 把注释与字面量内容抹成空格（保留长度与换行，便于按 offset 反查行号）。
 * 只做「够用」的启发式：目标是让 `expect(...)` 的参数表达式可被结构扫描。
 */
export function maskNonCode(source) {
  const out = source.split('')
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' '
  }
  let i = 0
  let prevCode = ''
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
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      const start = i
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
        // 单双引号不跨行：未闭合就止损，别把后续代码一起吞掉
        if (quote !== '`' && source[i] === '\n') break
        i++
      }
      blank(start, i)
      prevCode = quote
      continue
    }
    if (c === '/') {
      // 正则字面量只在上一个有效字符不可能是表达式结尾时成立（区分除法）
      if (prevCode === '' || '([{=,:;!&|?+-*%^~<>'.includes(prevCode)) {
        const start = i
        i++
        let inClass = false
        while (i < source.length) {
          if (source[i] === '\\') {
            i += 2
            continue
          }
          if (source[i] === '[') inClass = true
          else if (source[i] === ']') inClass = false
          else if (source[i] === '/' && !inClass) {
            i++
            break
          } else if (source[i] === '\n') break
          i++
        }
        blank(start, i)
        prevCode = '/'
        continue
      }
    }
    if (!/\s/.test(c)) prevCode = c
    i++
  }
  return out.join('')
}

/** 返回与 `openIndex` 处括号配对的闭括号下标；配不上返回 -1。 */
function matchClose(masked, openIndex) {
  let depth = 0
  for (let i = openIndex; i < masked.length; i++) {
    const c = masked[i]
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** 从 `)` 之后跳到断言链真正的起点（允许换行后以 `.` 续写）。 */
function chainStart(masked, from) {
  let i = from
  for (;;) {
    while (i < masked.length && (masked[i] === ' ' || masked[i] === '\t' || masked[i] === '\r')) i++
    if (masked[i] !== '\n') return i
    let j = i + 1
    while (j < masked.length && /\s/.test(masked[j])) j++
    if (masked[j] === '.') {
      i = j
      continue
    }
    return i
  }
}

/** 断言链终点：深度 0 的分号或换行。 */
function chainEnd(masked, from) {
  let depth = 0
  for (let i = from; i < masked.length; i++) {
    const c = masked[i]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return i
      depth--
    } else if (depth === 0 && (c === ';' || c === '\n')) return i
  }
  return masked.length
}

const MATCHERS =
  'toBeCloseTo|toBeGreaterThanOrEqual|toBeLessThanOrEqual|toBeGreaterThan|toBeLessThan|toBe|toEqual|toStrictEqual'
const CHAIN_RE = new RegExp(`\\.\\s*(?:not\\s*\\.\\s*)?(?:resolves\\s*\\.\\s*|rejects\\s*\\.\\s*)?(${MATCHERS})\\s*\\(`)

/**
 * 抽取源码里所有 `expect(...)` / `expect.soft(...)` / `expect.poll(...)` 断言。
 * 返回 `{ offset, arg, matcher, matcherArg }`（arg/matcherArg 已抹掉注释与字面量内容）。
 */
export function extractAssertions(source) {
  const masked = maskNonCode(source)
  const out = []
  const re = /\bexpect\s*(?:\.\s*(?:soft|poll)\s*)?\(/g
  for (const m of masked.matchAll(re)) {
    const openIndex = m.index + m[0].length - 1
    const closeIndex = matchClose(masked, openIndex)
    if (closeIndex < 0) continue
    const arg = masked.slice(openIndex + 1, closeIndex)
    const start = chainStart(masked, closeIndex + 1)
    const end = chainEnd(masked, start)
    const chain = masked.slice(start, end)
    const cm = CHAIN_RE.exec(chain)
    if (!cm) continue
    const matcher = cm[1]
    const matcherOpen = start + cm.index + cm[0].length - 1
    const matcherClose = matchClose(masked, matcherOpen)
    const matcherArg = masked.slice(matcherOpen + 1, matcherClose < 0 ? end : matcherClose)
    out.push({ offset: m.index, matcherOffset: start + cm.index, arg, matcher, matcherArg })
  }
  return out
}

function lineIndex(source) {
  const starts = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1)
  return (offset) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

const SCROLL_TERM = '(?:scrollY|scrollX|scrollTop|scrollLeft)'
const COORD_NAMES = 'top|left|bottom|right|x|y'
const COORD_RE = new RegExp(`^(?:${COORD_NAMES})$`)
const COUNT_STOPWORDS = new Set(['discount', 'discounts'])
// 名字里带这些词的多是「按视口/字体度量算出多少条」，是 OS 失配高危；其余 count 多为数据驱动
const LAYOUT_COUNT_HINTS =
  /(?:vis|visible|render|row|line|col|collapsed|drop|fit|window|overflow|truncate|page|chunk|slice|tick|viewport)/i
const IDENT_RE = /[A-Za-z_$][\w$]*/g

function isCountName(name) {
  if (COUNT_STOPWORDS.has(name.toLowerCase())) return false
  return /count/i.test(name)
}

/**
 * 计数表达式识别：显式 `.count()` 与长度属性 `.length`。
 *
 * 覆盖形态：`rows.length` / `querySelectorAll('.x').length` / `Object.keys(v).length` /
 * `dict.count()`。字面量已被 maskNonCode 抹成空格，所以字符串的 `.length` 不会命中；
 * `scrollHeight` / `clientHeight` 这类具名度量属性不含 `.length`，天然不在此维度
 * （它们属于 OS 敏感的像素量，归 scroll/rect 规则）。
 */
function countExpression(arg) {
  const explicit = /(?<![\w$])([A-Za-z_$][\w$]*)\s*\.\s*count\s*\(\s*\)/.exec(arg)
  if (explicit) return `${explicit[1]}.count()`
  if (/(?:\)|\]|[A-Za-z0-9_$])\s*\.\s*length(?![\w$])/.test(arg)) {
    const named = /(?<![\w$])([A-Za-z_$][\w$]*)\s*(?:\([^()]*\))?\s*\.\s*length(?![\w$])/.exec(arg)
    return named ? `${named[1]}.length` : 'length'
  }
  return null
}

function collectRectNames(masked) {
  const names = new Set()
  for (const m of masked.matchAll(
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n;]+)?=\s*[^\n;]*?getBoundingClientRect\s*\(\s*\)/g,
  )) {
    names.add(m[1])
  }
  return names
}

/** 解构出来的坐标名：const { top, left: x } = el.getBoundingClientRect() */
function collectDestructuredCoords(masked) {
  const names = new Set()
  for (const m of masked.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*[^\n;]*?getBoundingClientRect\s*\(\s*\)/g)) {
    for (const part of m[1].split(',')) {
      const name = ((part.includes(':') ? part.split(':').pop() : part) ?? '').trim()
      if (COORD_RE.test(name)) names.add(name)
    }
  }
  return names
}

/** 参数里出现的 rect 坐标引用（按出现次数计；width/height 不算）。 */
function coordinatesIn(arg, rectNames, destructuredCoords) {
  const found = []
  // 内联：el.getBoundingClientRect().top / (… as DOMRect).bottom
  for (const m of arg.matchAll(/getBoundingClientRect\s*\(\s*\)[^\n;]{0,60}?\.\s*([A-Za-z]+)/g)) {
    if (COORD_RE.test(m[1])) found.push(m[1])
  }
  for (const name of rectNames) {
    const escaped = name.replace(/\$/g, '\\$')
    const re = new RegExp(`(?<![\\w$])${escaped}\\s*\\.\\s*([A-Za-z]+)`, 'g')
    for (const m of arg.matchAll(re)) if (COORD_RE.test(m[1])) found.push(m[1])
  }
  for (const name of destructuredCoords) {
    if (new RegExp(`(?<![\\w$.])${name}(?![\\w$])`).test(arg)) found.push(name)
  }
  return found
}

/**
 * 参数里是否有「坐标量 ± 常数」的直接算术（容差写法）。
 * 只认紧邻算术的数字，避免把 poll 回调里的无关数字当成基准值。
 */
function adjacentBase(arg, rectNames, destructuredCoords) {
  const terms = [SCROLL_TERM]
  for (const name of rectNames) terms.push(`${name.replace(/\$/g, '\\$')}\\s*\\.\\s*(?:${COORD_NAMES})`)
  for (const name of destructuredCoords) terms.push(`(?<![\\w$.])${name}(?![\\w$])`)
  const NUM = '-?\\d+(?:\\.\\d+)?'
  for (const term of terms) {
    const re = new RegExp(`(?:${term})\\s*[-+]\\s*(${NUM})|(${NUM})\\s*[-+]\\s*(?:${term})`, 'g')
    for (const m of arg.matchAll(re)) {
      const value = Number(m[1] ?? m[2])
      if (Math.abs(value) >= OS_ABSOLUTE_MIN) return value
    }
  }
  return null
}

/** matcher 参数里的期望值：必须以数字字面量开头才算（排除对象/数组字面量）。 */
function leadingLiteral(matcherArg) {
  const m = matcherArg.trimStart().match(/^(-?\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : null
}

/** 单个文件里的 OS 绝对量断言违规（未过滤例外）。 */
export function findOsAbsoluteAssertions(source, file = '') {
  const masked = maskNonCode(source)
  const toLine = lineIndex(source)
  const lines = source.split(/\r?\n/)
  const rectNames = collectRectNames(masked)
  const destructuredCoords = collectDestructuredCoords(masked)
  const violations = []
  const push = (offset, rule, detail, extra = {}) => {
    const line = toLine(offset)
    violations.push({
      file,
      line,
      rule,
      detail,
      snippet: (lines[line - 1] ?? '').trim().slice(0, 240),
      message: `${file}:${line} [${rule}] ${detail}。${RULE_META[rule].suggestion}`,
      ...extra,
    })
  }

  for (const assertion of extractAssertions(source)) {
    // 行号指向 matcher（`expect` 与断言链可能跨多行，指向 expect 行会给出误导位置）
    const at = assertion.matcherOffset
    const literal = leadingLiteral(assertion.matcherArg)
    const coordinates = coordinatesIn(assertion.arg, rectNames, destructuredCoords)
    const base = adjacentBase(assertion.arg, rectNames, destructuredCoords)

    // 1) scroll 偏移 / 窗口滚动量 vs 字面量
    const scrollTerms = assertion.arg.match(new RegExp(SCROLL_TERM, 'g'))?.length ?? 0
    if (scrollTerms > 0) {
      const kind = scrollTerms > 1 ? '滚动差值' : '滚动位置'
      if (literal !== null && Math.abs(literal) >= OS_ABSOLUTE_MIN) {
        push(at, RULE_SCROLL, `${kind}与常数 ${literal} 直接比较`)
        continue
      }
      if (base !== null) {
        push(at, RULE_SCROLL, `${kind}的容差以常数 ${base} 为基准`)
        continue
      }
    }

    // 2) getBoundingClientRect 的绝对坐标 vs 字面量（width/height 不在此列）
    if (coordinates.length > 0) {
      if (literal !== null && Math.abs(literal) >= OS_ABSOLUTE_MIN) {
        const kind = coordinates.length > 1 ? '相对距离' : `${coordinates[0]} 坐标`
        push(at, RULE_RECT, `${kind}与常数 ${literal} 比较`)
        continue
      }
      if (base !== null) {
        push(at, RULE_RECT, `坐标差值的容差以常数 ${base} 为基准`)
        continue
      }
    }

    // 3) 计数 vs 整数常数（等值比较）：标识符带 count、显式 .count()、或 .length 形态
    if (/^(?:toBe|toEqual|toStrictEqual|toBeCloseTo)$/.test(assertion.matcher)) {
      if (literal !== null && Number.isInteger(literal) && literal >= OS_COUNT_MIN) {
        const identCount = [...assertion.arg.matchAll(IDENT_RE)].map((m) => m[0]).find(isCountName)
        const countName = identCount ?? countExpression(assertion.arg)
        if (countName) {
          push(at, RULE_COUNT, `${countName} 与常数 ${literal} 等值比较`, {
            layoutSensitive: LAYOUT_COUNT_HINTS.test(countName),
          })
        }
      }
    }
  }

  return violations
}

/** OS 绝对量检测只对真实浏览器 e2e 生效（happy-dom 单测见 OS_ABSOLUTE_ROOTS 注释）。 */
export function isOsAbsoluteScope(file) {
  if (/^packages\/(?:ui\/qa-regression|docs)\//.test(file)) return true
  return /^packages\/ui\/[^/]+\.spec\.ts$/.test(file)
}

export function analyzeSource(source, file = '') {
  const testCount = (source.match(/\b(?:test|it)(?:\.(?!skip\b)\w+)?\s*\(/g) ?? []).length
  const expectCount = (source.match(/\bexpect\s*\(/g) ?? []).length
  const unconditionalSkips = [...source.matchAll(/test\.skip\(true\s*,\s*['"`]([^'"`]*)/g)].map((m) => m[1])
  const waitForTimeout = (source.match(/\bwaitForTimeout\s*\(/g) ?? []).length
  const weakAssertions = (source.match(/toBeGreaterThan\(0\)|toBeTruthy\(\)|not\.toBeNull\(\)/g) ?? []).length
  const eventLengthOnly = (source.match(/expect\([^\n]*\b(?:events|fired)\b[^\n]*\.length[^\n]*\)\s*\.toBe\(/g) ?? [])
    .length
  return {
    file,
    testCount,
    expectCount,
    zeroExpect: testCount > 0 && expectCount === 0 && !INTENTIONAL_ZERO_EXPECT.has(file),
    unconditionalSkips: IGNORE_SKIP_FILES.has(file) ? [] : unconditionalSkips,
    waitForTimeout,
    weakAssertions,
    eventLengthOnly,
    osAbsoluteAssertions: isOsAbsoluteScope(file) ? findOsAbsoluteAssertions(source, file) : [],
  }
}

export function collectSpecFiles(roots) {
  const files = roots.flatMap((root) => walk(join(ROOT, root)))
  if (!existsSync(join(ROOT, 'packages/ui'))) return files
  // 顶层 e2e spec（visual-states/smoke/interaction 等）不在 qa-regression 下，也要纳入
  for (const name of readdirSync(join(ROOT, 'packages/ui'))) {
    if (/\.spec\.ts$/.test(name)) files.push(join(ROOT, 'packages/ui', name))
  }
  return [...new Set(files)]
}

export function audit(roots = DEFAULT_ROOTS) {
  return collectSpecFiles(roots)
    .map((file) => analyzeSource(readFileSync(file, 'utf8'), relative(ROOT, file).replaceAll('\\', '/')))
    .sort((a, b) => a.file.localeCompare(b.file))
}

/** 单独跑 OS 绝对量检测（范围 = 既有审计范围 + 文档站）。 */
export function auditOsAbsolute(roots = OS_ABSOLUTE_ROOTS) {
  return audit(roots)
    .map((item) => ({ file: item.file, violations: item.osAbsoluteAssertions }))
    .filter((item) => item.violations.length > 0)
}

export function summarize(results) {
  return results.reduce(
    (acc, item) => ({
      files: acc.files + 1,
      tests: acc.tests + item.testCount,
      expects: acc.expects + item.expectCount,
      zeroExpectFiles: acc.zeroExpectFiles + (item.zeroExpect ? 1 : 0),
      unconditionalSkips: acc.unconditionalSkips + item.unconditionalSkips.length,
      waitForTimeout: acc.waitForTimeout + item.waitForTimeout,
      weakAssertions: acc.weakAssertions + item.weakAssertions,
      eventLengthOnly: acc.eventLengthOnly + item.eventLengthOnly,
      osAbsoluteAssertions: acc.osAbsoluteAssertions + (item.osAbsoluteAssertions?.length ?? 0),
    }),
    {
      files: 0,
      tests: 0,
      expects: 0,
      zeroExpectFiles: 0,
      unconditionalSkips: 0,
      waitForTimeout: 0,
      weakAssertions: 0,
      eventLengthOnly: 0,
      osAbsoluteAssertions: 0,
    },
  )
}

/**
 * 读取例外表。每条必须是 `{ file, rule, line|snippet, reason }`：
 * `reason` 是强制的——没有理由的例外会把门禁变成摆设。
 */
export function loadOsAssertExceptions(path = join(ROOT, OS_ASSERT_EXCEPTIONS)) {
  if (!existsSync(path)) return []
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.exceptions ?? [])
  const rules = new Set(Object.keys(RULE_META))
  return list.map((entry, index) => {
    const where = `${path}#${index}`
    if (!entry || typeof entry !== 'object') throw new Error(`${where}: 例外必须是对象`)
    if (!entry.file) throw new Error(`${where}: 缺少 file`)
    if (!rules.has(entry.rule)) throw new Error(`${where}: rule 必须是 ${[...rules].join(' / ')}`)
    if (entry.line === undefined && !entry.snippet) throw new Error(`${where}: 需要 line 或 snippet 之一`)
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 4) {
      throw new Error(`${where}: 必须写 reason（为什么这条断言不依赖 OS）`)
    }
    return entry
  })
}

/** 剔除已登记例外，返回 `{ violations, stale }`。 */
export function applyOsAssertExceptions(results, exceptions) {
  const violations = results.flatMap((item) => item.violations)
  const used = new Set()
  const remaining = violations.filter((violation) => {
    const index = exceptions.findIndex((exception, i) => {
      if (used.has(i)) return false
      if (exception.file !== violation.file) return false
      if (exception.rule !== violation.rule) return false
      if (exception.snippet) return violation.snippet.includes(exception.snippet)
      return exception.line === violation.line
    })
    if (index < 0) return true
    used.add(index)
    return false
  })
  const stale = exceptions.filter((_, i) => !used.has(i))
  return { violations: remaining, stale }
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index < 0) return fallback
  const raw = process.argv[index + 1]
  const value = Number(raw)
  // 非数字会让 `count > NaN` 恒 false（静默关掉维度），必须显式报错
  if (!raw || !Number.isFinite(value) || value < 0) {
    console.error(`[qa:audit] ${name} 需要非负数字，收到 ${raw ?? '(空)'}`)
    process.exit(1)
  }
  return value
}

function main() {
  const results = audit()
  const summary = summarize(results)
  const check = process.argv.includes('--check')
  const verbose = process.env.QA_AUDIT_VERBOSE === '1'
  // 阈值 = 已收口的历史债快照（2026-11-01 收尾）：waitForTimeout 440 → 26（四批清理后仅剩
  // 已登记的时间流逝/否定断言/测量仪器例外，逐处带 audit-exception 注释）；弱断言 1967 → **0**
  // （单测 1549 + e2e 418 全部换成精确契约；2026-11-01 归 0，maxWeak=0 = 零增量容忍——
  // 新测试不得引入弱断言，确属合理例外须在提交说明写清并调整阈值）。
  // 口径不变：**只防增量、不要求清零**；再改阈值必须在提交说明写清为什么。
  const maxWait = argValue('--max-wait', 28)
  const maxWeak = argValue('--max-weak', 0)
  const maxEventLen = argValue('--max-event-len', 105)
  // OS 绝对量维度：默认上限 = 收口后的存量快照（2026-11-02：79 → 40 → **82**）。
  // 本批已把 17 条布局高危（[layout] 标记：视口内渲染/窗口计数）与 17 条滚动偏移、3 条 rect 绝对
  // 坐标全部改写为语义不变量（元素关系 / 前后差 / DOM 现算期望值），0 条登记例外；
  // **82 的构成**：数据驱动计数 78 条（demo 数据条数、固定配置项数、文档页数等，与字体度量/视口
  // 无关）+ px 固定布局窗口计数 4 条（名字含 vis/row/window 等布局词，已标记 `layoutSensitive`）。
  // 检测口径本轮扩到 `.length` 与显式 `.count()` 形态（此前只认名字带 count 的标识符，漏检了
  // `rows.length` / `querySelectorAll(...).length` / `dict.count()` 这类与 px/字体度量同源的计数
  // 常数）——所以存量从 40 上升到 82，均与字体度量无关，属口径补齐而非新违规。
  // 口径不变「只防增量、不要求清零」：清理一条或登记一条例外后必须同步下调上限，
  // 避免上限虚高把新增违规一起放过。
  const maxOsAbsolute = argValue('--max-os-absolute', 82)

  const exceptions = loadOsAssertExceptions()
  const osRaw = results.flatMap((item) => item.osAbsoluteAssertions)
  const { violations: osViolations, stale } = applyOsAssertExceptions(
    results.map((item) => ({ file: item.file, violations: item.osAbsoluteAssertions })),
    exceptions,
  )
  const registered = osRaw.length - osViolations.length

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          summary,
          results,
          osAbsolute: {
            ruleMeta: RULE_META,
            raw: osRaw.length,
            violations: osViolations,
            exceptions: exceptions.length,
            stale,
          },
        },
        null,
        2,
      ),
    )
  } else {
    console.log(`[qa:audit] ${summary.files} 文件 / ${summary.tests} 测试 / ${summary.expects} expect`)
    console.log(
      `  无 expect 文件 ${summary.zeroExpectFiles}；无条件 skip ${summary.unconditionalSkips}；waitForTimeout ${summary.waitForTimeout}；弱断言 ${summary.weakAssertions}；事件只断 length ${summary.eventLengthOnly}；OS 绝对量断言 ${osViolations.length}（已剔除登记例外 ${registered}）`,
    )
    if (!check || verbose) {
      const noisy = results.filter(
        (item) =>
          item.zeroExpect ||
          item.unconditionalSkips.length > 0 ||
          item.eventLengthOnly > 0 ||
          item.weakAssertions > 0 ||
          item.waitForTimeout > 0 ||
          item.osAbsoluteAssertions.length > 0,
      )
      for (const item of noisy.slice(0, 20)) {
        console.log(
          `  ${item.file}: tests=${item.testCount} expect=${item.expectCount} skip=${item.unconditionalSkips.length} wait=${item.waitForTimeout} weak=${item.weakAssertions} eventLen=${item.eventLengthOnly} osAbs=${item.osAbsoluteAssertions.length}`,
        )
      }
      if (noisy.length > 20) console.log(`  ... 另有 ${noisy.length - 20} 个文件`)
      console.log(`[qa:audit] OS 绝对量断言（未登记例外 ${osViolations.length} 条）`)
      for (const violation of osViolations.slice(0, 40)) console.log(`  ${violation.message}`)
      if (osViolations.length > 40) console.log(`  ... 另有 ${osViolations.length - 40} 条（--json 看全量）`)
      for (const item of stale) {
        console.warn(`[qa:audit] 陈旧例外：${item.file}:${item.line ?? item.snippet} [${item.rule}] 已不再命中，请删除`)
      }
    }
  }

  if (check) {
    const effectiveOs = osViolations.length
    console.log(
      `[qa:audit] 阈值（防增量，非清零）：waitForTimeout ≤ ${maxWait}；弱断言 ≤ ${maxWeak}；事件只断 length ≤ ${maxEventLen}；OS 绝对量断言 ≤ ${maxOsAbsolute}`,
    )
    const problems = []
    if (summary.zeroExpectFiles > 0) problems.push(`无 expect 文件 ${summary.zeroExpectFiles}`)
    if (summary.unconditionalSkips > 0) {
      problems.push(`无条件 test.skip(true) ${summary.unconditionalSkips}`)
    }
    if (summary.waitForTimeout > maxWait) {
      problems.push(`waitForTimeout ${summary.waitForTimeout} > ${maxWait}`)
    }
    if (summary.weakAssertions > maxWeak) {
      problems.push(`弱断言 ${summary.weakAssertions} > ${maxWeak}`)
    }
    if (summary.eventLengthOnly > maxEventLen) {
      problems.push(`事件只断 length ${summary.eventLengthOnly} > ${maxEventLen}`)
    }
    if (effectiveOs > maxOsAbsolute) {
      problems.push(`OS 绝对量断言 ${effectiveOs} > ${maxOsAbsolute}`)
    }
    if (problems.length) {
      if (effectiveOs > maxOsAbsolute) {
        console.error('[qa:audit] OS 绝对量断言违规（改成语义不变量，或登记例外）：')
        for (const violation of osViolations.slice(0, 20)) console.error(`  ${violation.message}`)
        if (effectiveOs > 20) console.error(`  ... 另有 ${effectiveOs - 20} 条（--json 看全量）`)
      }
      console.error(`[qa:audit] 未通过：${problems.join('；')}`)
      process.exit(1)
    }
    console.log('[qa:audit] 通过')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
