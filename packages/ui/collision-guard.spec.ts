import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, basename, relative } from 'node:path'

// 撞名守卫（ratchet）：收集各组件的属性名（取自权威生成物 api-manifest 的**全量 attrs**——含非 observed 的
// property 通道属性；另有遗留别名取 normalizeLegacyAlias 第二参），与真实 DOM 上的「方法 / 只读访问器」求交；凡命中者，**运行时该组件原型上必须存在对应 setter**
// （即已用 Object.defineProperty 遮蔽）。用运行时核验（customElements.get(tag).prototype 的 own descriptor）而非
// 源码字符串匹配——避免「渲染循环里恰好也有同名映射」「注释致正则漏采」等造成的误绿。
// 背景：属性名撞 DOM 只读 getter（Element.prefix）或方法（HTMLElement.blur）时，React/Vue 会按 `key in el`
// 走 property 写入——未遮蔽则抛错崩宿主（历史：715e20b8 删访问器致 React 白屏）。
const MANIFEST = join(import.meta.dirname, '../../docs/api-manifest')
const SRC = join(import.meta.dirname, 'src')
// 基类源码：attribute camelCase 撞基类成员同样会崩（历史：card 的 shadow 撞 OASElement.shadow）
const CORE_SRC = join(import.meta.dirname, '../core/src')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

function collect(): { tag: string; name: string; file: string }[] {
  const map = new Map<string, { tag: string; name: string; file: string }>()
  const add = (tag: string, name: string, file: string): void => {
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) return
    const k = tag + '\u0000' + name
    if (!map.has(k)) map.set(k, { tag, name, file })
  }
  // observed 属性：api-manifest（权威生成物，doc api 章节同源）
  for (const f of readdirSync(MANIFEST)) {
    if (!/^oas-.+\.json$/.test(f)) continue
    let m: { attrs?: { name?: string }[] }
    try {
      m = JSON.parse(readFileSync(join(MANIFEST, f), 'utf8'))
    } catch {
      continue
    }
    const tag = basename(f, '.json')
    for (const a of m.attrs ?? []) if (a?.name) add(tag, a.name, f)
  }
  // 遗留别名：normalizeLegacyAlias('primary', 'legacy')
  for (const f of walk(SRC)) {
    const tag = basename(f, '.ts')
    if (!tag.startsWith('oas-')) continue
    const src = readFileSync(f, 'utf8')
    for (const q of src.matchAll(/normalizeLegacyAlias\(\s*'[^']*'\s*,\s*'([a-zA-Z][a-zA-Z0-9-]*)'/g)) {
      add(tag, q[1]!, relative(SRC, f).replace(/\\/g, '/'))
    }
  }
  return [...map.values()]
}

test('组件属性名撞 DOM 方法/只读访问器时，其原型必须已遮蔽（运行时核验）', async ({ page }) => {
  const entries = collect()
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })

  // 1) 先在探针上分类（不需要组件已注册）
  const kind = await page.evaluate(
    (ns) => {
      const probe = document.createElement('x-unknown')
      const out: Record<string, string> = {}
      for (const n of ns) {
        let proto: object | null = Object.getPrototypeOf(probe)
        out[n] = 'absent'
        while (proto) {
          const d = Object.getOwnPropertyDescriptor(proto, n)
          if (d) {
            out[n] = typeof d.value === 'function' ? 'method' : d.set ? 'writable' : d.get ? 'read-only' : 'data'
            break
          }
          proto = Object.getPrototypeOf(proto)
        }
      }
      return out
    },
    [...new Set(entries.map((e) => e.name))],
  )

  // 2) 只等「可能撞名」的组件注册完成，避免与 docs 主题动态注册竞态
  const relevant = entries.filter((e) => kind[e.name] === 'method' || kind[e.name] === 'read-only')
  const tags = [...new Set(relevant.map((e) => e.tag))]
  await page.waitForFunction((ts) => ts.every((t) => customElements.get(t) != null), tags, { timeout: 30000 })

  // 3) 运行时核验遮蔽：组件原型 own descriptor 必须有 setter
  const offenders = await page.evaluate(
    (rel) => {
      const out: string[] = []
      for (const { tag, name, kind: k } of rel) {
        const ctor = customElements.get(tag)
        const d = ctor ? Object.getOwnPropertyDescriptor(ctor.prototype, name) : undefined
        if (!(d && d.set)) out.push(`${tag} 的 '${name}'（${k}）`)
      }
      return [...new Set(out)]
    },
    relevant.map((e) => ({ tag: e.tag, name: e.name, kind: kind[e.name] })),
  )

  expect(
    offenders.sort(),
    `以下属性名撞 DOM 方法/只读访问器但组件原型上无 setter（未遮蔽）：\n${offenders.join('\n')}\n需用 Object.defineProperty(this.prototype, '<名>', …) 遮蔽`,
  ).toEqual([])
})

// —— 源码级守卫：attribute camelCase 名不得撞同类实例成员 ——
//
// 背景（与上方运行时守卫互补）：`item-height` 这类 kebab attribute 的 camelCase（itemHeight）
// 撞上同类实例成员时，框架按「key in el」把静态 attribute 写成 property：
// - 撞**方法**：实例 own property 遮蔽原型方法，内部 this.xxx() 直接 TypeError（历史缺陷：
//   virtual-list 注释明令「不得叫 buffer」「方法名避开 itemHeight」）；
// - 撞**数据字段**：框架写入的字符串/Set 污染字段语义，布局静默错乱（历史缺陷：scheduler/
//   gantt 的 scale/view/expanded 撞名致 SPA demo 空白，改名 scaleMode/viewMode/expandedSet）；
// - 撞**只读访问器**（只有 get 无 set）：严格模式下 property 写入抛 TypeError，崩宿主；
// - **get + set 成对的访问器**是设计内 attribute↔property 双通道（如 sizes/value/items），
//   不算撞名，豁免。
// 与运行时守卫的差异：本守卫不依赖 api-manifest 生成物与浏览器环境，纯源码扫描——能在
// `observedAttributes` 新增属性的第一时间（CI 单文件级）报警，而不是等 manifest 重生成后。
// 覆盖：packages/ui/src 下全部组件源文件（文件名 oas-*.ts，与元素注册 tag 同名）。
// 采集纪律：observedAttributes 必须**全量采集所有 `static get observedAttributes` 块**（文件内多
// 组件逐块独立、工厂/嵌套 class 不限缩进）；历史缺陷是「indexOf 首块 + return 距 ≤300」启发——
// 接口类型声明（`observedAttributes: string[]`）先命中或块位置偏远即整文件返回 []，导致
// typography/kanban/resource/table/toolbar 等六个组件静默跳过比对（回归见 SCAN_COVERAGE 自检）。

/** 白名单：静态 defineProperty 循环遮蔽、设计内双通道等静态分析无法识别的形态，逐条注明理由 */
const NAME_GUARD_WHITELIST: Record<string, { name: string; why: string }[]> = {
  'oas-tree-select': [
    {
      name: 'prefix',
      why: 'static 块内 Object.defineProperty(this.prototype, name, …) 循环遮蔽 prefix/suffix（变量名动态，静态扫描不可见；运行时守卫已核验 setter 在场）',
    },
    {
      name: 'suffix',
      why: '同 prefix——static defineProperty 循环遮蔽，映射到规范属性 suffix-text',
    },
  ],
  'oas-anchor': [
    {
      name: 'getCurrentAnchor',
      why: '设计内双通道：public getCurrentAnchor 回调 property（函数）与 get-current-anchor attribute（全局函数名）并存，resolveGetCurrentAnchor 以 typeof 防线让 property 函数优先、字符串写入安全回落 attribute 通道',
    },
  ],
}

const kebabToCamel = (attr: string): string => attr.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

type MemberKind = 'method' | 'field' | 'get' | 'set'
type Members = Map<string, MemberKind[]>

const REGEX_KEYWORDS = new Set([
  'return',
  'typeof',
  'case',
  'in',
  'of',
  'delete',
  'void',
  'new',
  'instanceof',
  'do',
  'else',
  'yield',
  'await',
  'throw',
])

/** 代码位置 i 的 `/` 是否正则字面量起点（回溯前一 token：关键词/运算符/标点后为正则，标识符/字面量后为除法） */
function isRegexStart(src: string, i: number): boolean {
  let j = i - 1
  while (j >= 0 && /\s/.test(src[j]!)) j--
  if (j < 0) return true
  const ch = src[j]!
  if (/[)\]}'"]/.test(ch)) return false
  if (/[0-9A-Za-z_$]/.test(ch)) {
    let k = j
    while (k >= 0 && /[0-9A-Za-z_$]/.test(src[k]!)) k--
    return REGEX_KEYWORDS.has(src.slice(k + 1, j + 1))
  }
  return true
}

/** 跳过正则字面量（处理转义与字符类 [/]），返回结束位置 */
function skipRegex(src: string, i: number): number {
  let k = i + 1
  let inClass = false
  while (k < src.length && src[k] !== '\n') {
    const ch = src[k]!
    if (ch === '\\') k++
    else if (ch === '[') inClass = true
    else if (ch === ']') inClass = false
    else if (ch === '/' && !inClass) return k + 1
    k++
  }
  return k // 未闭合（不该发生）：退化为跳过本行
}

/**
 * 逐行花括号深度表（只计代码上下文的大括号）。字符串/模板内容/正则/注释内的大括号不参与；
 * 模板插值 `${}` 内的代码深度正常累计（支持嵌套模板与插值内对象字面量）。
 * 返回：每行行首花括号深度 / 行末深度 / 行首圆括号深度 / 行首方括号深度 /
 * 行首处于模板内容 / 行首处于块注释。
 * 深度错位的代价是真实的：行级「反引号奇偶翻转 + 裸大括号计数」曾被模板插值内大括号
 * （全库 500+ 处）与正则字面量（28+ 处含 {}）打穿——方法体行被误判为 class 成员，批量假 offender。
 * 圆/方括号深度用于排除**多行方法签名的参数列表行**（`updateLine(\n  type: …,` 的参数行与
 * 成员行花括号深度相同，曾有 progress/list/table 等 8 个组件 25 行参数被误采为字段）。
 */
function lineDepths(src: string): {
  startDepth: number[]
  endDepth: number[]
  startParen: number[]
  startBracket: number[]
  inTemplate: boolean[]
  inComment: boolean[]
} {
  const lines = src.split('\n')
  const n = lines.length
  const startDepth = new Array<number>(n).fill(0)
  const endDepth = new Array<number>(n).fill(0)
  const startParen = new Array<number>(n).fill(0)
  const startBracket = new Array<number>(n).fill(0)
  const inTemplate = new Array<boolean>(n).fill(false)
  const inComment = new Array<boolean>(n).fill(false)
  type Ctx = { kind: 'code' | 'tpl' | 'tplExpr' | 'quote'; quote?: string; entryDepth?: number }
  const stack: Ctx[] = [{ kind: 'code' }]
  const top = (): Ctx => stack[stack.length - 1]!
  let depth = 0
  let paren = 0
  let bracket = 0
  let lineStartDepth = 0
  let lineStartParen = 0
  let lineStartBracket = 0
  let li = 0
  let inLineCmt = false
  let inBlockCmt = false
  const closeLine = (): void => {
    const t = top()
    inTemplate[li] = t.kind === 'tpl'
    inComment[li] = inBlockCmt
    startDepth[li] = lineStartDepth
    endDepth[li] = depth
    startParen[li] = lineStartParen
    startBracket[li] = lineStartBracket
    lineStartDepth = depth
    lineStartParen = paren
    lineStartBracket = bracket
    li++
    inLineCmt = false
  }
  let i = 0
  const len = src.length
  while (i < len) {
    const c = src[i]!
    if (c === '\n') {
      closeLine()
      i++
      continue
    }
    if (inLineCmt) {
      i++
      continue
    }
    if (inBlockCmt) {
      if (c === '*' && src[i + 1] === '/') {
        inBlockCmt = false
        i += 2
      } else {
        i++
      }
      continue
    }
    const t = top()
    if (t.kind === 'quote') {
      if (c === '\\') i++
      else if (c === t.quote) stack.pop()
      i++
      continue
    }
    if (t.kind === 'tpl') {
      if (c === '\\') {
        i += 2 // 跳过转义对（如 \`——转义的反引号不闭合模板）
      } else if (c === '`') {
        stack.pop()
        i++
      } else if (c === '$' && src[i + 1] === '{') {
        stack.push({ kind: 'tplExpr', entryDepth: depth })
        depth++
        i += 2
      } else {
        i++
      }
      continue
    }
    // code / tplExpr 上下文
    if (c === '/' && src[i + 1] === '/') {
      inLineCmt = true
      i += 2
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      inBlockCmt = true
      i += 2
      continue
    }
    if (c === "'" || c === '"') {
      stack.push({ kind: 'quote', quote: c })
      i++
      continue
    }
    if (c === '`') {
      stack.push({ kind: 'tpl' })
      i++
      continue
    }
    if (c === '{') {
      depth++
      i++
      continue
    }
    if (c === '}') {
      depth--
      if (t.kind === 'tplExpr' && depth === t.entryDepth) stack.pop()
      i++
      continue
    }
    if (c === '(') {
      paren++
      i++
      continue
    }
    if (c === ')') {
      paren--
      i++
      continue
    }
    if (c === '[') {
      bracket++
      i++
      continue
    }
    if (c === ']') {
      bracket--
      i++
      continue
    }
    if (c === '/' && isRegexStart(src, i)) {
      i = skipRegex(src, i)
      continue
    }
    i++
  }
  if (li < n) closeLine()
  return { startDepth, endDepth, startParen, startBracket, inTemplate, inComment }
}

/**
 * 按类分组的实例成员名（方法/字段/访问器），供撞名比对：
 * - **任意缩进/嵌套**：「class 直接体」按花括号深度配对判定（行首深度 === 该 class 体深度），
 *   不依赖 2 空格缩进启发——工厂函数内 class（如 typography 的 OASTypography，成员缩进 4 空格）
 *   曾整类漏扫，成员池为空即撞名比对形同虚设；深度表由 lineDepths 字符级 tokenizer 提供
 *   （字符串/模板/正则/注释内的大括号不参与，模板插值内代码正常累计）；
 * - 跳过 static 成员（不遮蔽实例 property 通道）；static 块内部深度更深自然跳过；
 *   模板字符串内容、interface/type 声明块、块注释行整行跳过（interface/type 与 enum 均在
 *   class 外——栈空或深度不符，天然不落入成员判定）；
 * - static 块内 `Object.defineProperty(this.prototype, …)` 的显式 get/set 视为设计内双通道
 *   （按声明位置归属所属 class；循环动态变量名仍靠白名单）。
 */
function scanClasses(src: string): Map<string, Members> {
  const out = new Map<string, Members>()
  const stack: { name: string; bodyDepth: number; members: Members }[] = []
  const ranges: { name: string; at: number }[] = [] // class 声明位置，供 defineProperty 归属
  const { startDepth, endDepth, startParen, startBracket, inTemplate, inComment } = lineDepths(src)
  const lines = src.split('\n')
  let offset = 0
  const record = (name: string, kind: MemberKind): void => {
    const top = stack[stack.length - 1]
    if (!top) return
    const list = top.members.get(name) ?? []
    list.push(kind)
    top.members.set(name, list)
  }
  for (let li = 0; li < lines.length; li++) {
    const atLineStart = offset
    offset += lines[li]!.length + 1
    if (inTemplate[li] || inComment[li]) continue
    const line = lines[li]!
    const depth = startDepth[li]!
    const classDecl = /^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(line)
    if (classDecl) ranges.push({ name: classDecl[1]!, at: atLineStart })
    // class 直接体内的成员行：行首深度恰为该 class 体深度，且不在跨行圆/方括号内
    //（缩进不限，工厂/嵌套 class 均认；括号内排除多行签名参数行——其 `name: T` 形态与字段同形）
    const atBody =
      !classDecl &&
      stack.length > 0 &&
      depth === stack[stack.length - 1]!.bodyDepth &&
      startParen[li] === 0 &&
      startBracket[li] === 0
    if (atBody) {
      const m =
        /^(?:((?:private|protected|public|static|readonly|override|declare|async)\s+)*)(?:(get|set)\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?\s*(\(|[?!]?:|=)/.exec(
          line.trimStart(),
        )
      if (m) {
        const [, mods, accessor, name] = m
        // static 成员不遮蔽实例 property 通道（el.x = v 只写实例），跳过
        if (name && name !== 'constructor' && !mods?.split(/\s+/).includes('static')) {
          record(name, accessor === 'get' ? 'get' : accessor === 'set' ? 'set' : m[4] === '(' ? 'method' : 'field')
        }
      }
    }
    const endD = endDepth[li]!
    if (classDecl) {
      if (endD > depth) stack.push({ name: classDecl[1]!, bodyDepth: endD, members: new Map() })
      continue
    }
    // 退出 class 体（行末深度回落到体深度之下；嵌套栈：内层先弹，外层继续接收成员）
    while (stack.length > 0 && endD < stack[stack.length - 1]!.bodyDepth) {
      const done = stack.pop()!
      out.set(done.name, done.members)
    }
  }
  while (stack.length > 0) {
    const done = stack.pop()!
    out.set(done.name, done.members)
  }
  // static 块原型遮蔽（TS 不允许 accessor 覆盖基类字段时走 defineProperty）：
  // `Object.defineProperty(this.prototype, 'shadow', { get, set })` 同样是设计内 property 通道，
  // 静态扫描需识别 get/set（否则 card 的正确遮蔽会被误报）。动态变量名的循环遮蔽仍靠白名单。
  for (const dm of src.matchAll(/Object\.defineProperty\(\s*this\.prototype,\s*'([A-Za-z_$][\w$]*)'/g)) {
    const owner = ranges.filter((r) => r.at < dm.index).pop()
    const target = owner ? out.get(owner.name) : undefined
    if (!target) continue
    const chunk = src.slice(dm.index, dm.index + 600)
    const add = (kind: MemberKind): void => {
      const list = target.get(dm[1]!) ?? []
      list.push(kind)
      target.set(dm[1]!, list)
    }
    if (/\bget\s*(?:\(|:)/.test(chunk)) add('get')
    if (/\bset\s*(?:\(|:)/.test(chunk)) add('set')
  }
  return out
}

/** 文件全部 class 成员合并成单一池（基类文件单 class；供 baseMembers 沿继承链合并） */
function scanInstanceMembers(src: string): Members {
  const merged: Members = new Map()
  for (const cls of scanClasses(src).values()) {
    for (const [name, kinds] of cls) merged.set(name, [...(merged.get(name) ?? []), ...kinds])
  }
  return merged
}

type ObservedBlock = { className: string; attrs: string[] }

/**
 * 全量采集所有 `static get observedAttributes` 块的属性名（kebab），按文本位置归属所属 class：
 * - 文件内多组件（多 class）逐块独立，工厂/嵌套 class 不限缩进与位置；
 * - 条件 return（`cond ? [...] : [...]`）取两分支字面量并集（api:scan 的字面量分支约定）；
 * - 块体字符级配对找闭合（跳过字符串字面量与行/块注释），体内多行数组带行注释不致截断或误收。
 * 历史缺陷：本函数曾用「indexOf 首块 + return 距 ≤300」启发——接口类型声明
 * （`observedAttributes: string[]`）先命中即整文件返回 []，六个组件静默跳过源码级比对。
 */
function scanObservedAttributes(src: string): ObservedBlock[] {
  const classStarts: { name: string; at: number }[] = []
  for (const m of src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g)) {
    classStarts.push({ name: m[1]!, at: m.index })
  }
  const ownerOf = (at: number): string => classStarts.filter((c) => c.at < at).pop()?.name ?? '(anonymous)'
  const out: ObservedBlock[] = []
  const head = /static\s+(?:override\s+)?get\s+observedAttributes\s*\(\s*\)\s*(?::\s*[^{]+?)?\s*\{/g
  for (const m of src.matchAll(head)) {
    // 从 getter 体开括号做括号配对到闭合；字符串/注释内的大括号与引号不参与
    let depth = 1
    let i = m.index + m[0].length
    const start = i
    while (i < src.length && depth > 0) {
      const c = src[i]!
      if (c === "'" || c === '"' || c === '`') {
        const q = c
        i++
        while (i < src.length && src[i] !== q) {
          if (src[i] === '\\') i++
          i++
        }
      } else if (c === '/' && src[i + 1] === '/') {
        while (i < src.length && src[i] !== '\n') i++
      } else if (c === '/' && src[i + 1] === '*') {
        i += 2
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
        i += 2
      } else if (c === '{') {
        depth++
      } else if (c === '}') {
        depth--
      }
      i++
    }
    const body = src.slice(start, Math.max(start, i - 1))
    const attrs = [...new Set([...body.matchAll(/(['"])([a-zA-Z][a-zA-Z0-9-]*)\1/g)].map((s) => s[2]!))]
    if (attrs.length === 0) continue
    const className = ownerOf(m.index)
    const prev = out.find((b) => b.className === className)
    if (prev) {
      for (const a of attrs) if (!prev.attrs.includes(a)) prev.attrs.push(a)
    } else {
      out.push({ className, attrs })
    }
  }
  return out
}

/** 合并基类成员：组件继承链决定是否含 OASFormElement 增量（button/slider 继承 OASElement，不能误并表单基类） */
function baseMembers(extendsFormElement: boolean): Members {
  const files = extendsFormElement ? ['oas-element.ts', 'form-element.ts'] : ['oas-element.ts']
  const merged: Members = new Map()
  for (const f of files) {
    const members = scanInstanceMembers(readFileSync(join(CORE_SRC, f), 'utf8'))
    for (const [name, kinds] of members) merged.set(name, [...(merged.get(name) ?? []), ...kinds])
  }
  return merged
}

/** 组件源码声明的直接基类（本库只有两条：OASElement / OASFormElement） */
function extendsFormElement(src: string): boolean {
  return /class\s+\w+\s+extends\s+OASFormElement\b/.test(src)
}

/**
 * 单个文件的撞名判定（含基类成员）。拆成纯函数便于反证测试：
 * 传入「撤掉遮蔽」的合成源码时，必须能报出 shadow 撞名。
 * 文件内多 class（多组件）逐块独立：每个 observedAttributes 块只与所属 class 的成员池比对，
 * 不做文件级并集（避免 A 组件属性误撞 B 组件成员的假阳性）。
 */
function findOffenders(tag: string, src: string, where: string, base: Members): string[] {
  const classes = scanClasses(src)
  const offenders: string[] = []
  for (const { className, attrs } of scanObservedAttributes(src)) {
    if (attrs.length === 0) continue
    const members: Members = new Map(base)
    for (const [name, kinds] of classes.get(className) ?? []) {
      members.set(name, [...(members.get(name) ?? []), ...kinds])
    }
    const whitelisted = new Set((NAME_GUARD_WHITELIST[tag] ?? []).map((w) => w.name))
    for (const attr of attrs) {
      const name = kebabToCamel(attr)
      if (whitelisted.has(name)) continue
      const kinds = members.get(name)
      if (!kinds) continue
      const hasGet = kinds.includes('get')
      const hasSet = kinds.includes('set')
      // get+set 双通道、set-only 写通道（如 list 的 set data——读走 dataItems 避开 dataset 语义）
      // 都是设计内 property 通道：写入走原型 setter，不遮蔽不抛错
      if (hasSet) continue
      const kindDesc = hasGet
        ? '只读访问器（get 无 set，property 写入会抛 TypeError 崩宿主）'
        : kinds.includes('method')
          ? '方法（property 写入会以 own property 遮蔽原型方法，内部 this.' + name + '() 直接 TypeError）'
          : '数据字段（property 写入会污染字段语义，布局静默错乱）'
      offenders.push(
        `${where} 的 ${className}：attribute '${attr}'（camelCase '${name}'）撞同类/基类实例${kindDesc}——请给成员改名（对齐 xxxMode/xxxSet 后缀惯例）或改为 get+set 访问器双通道`,
      )
    }
  }
  return offenders
}

test('attribute camelCase 名不得撞同类/基类实例成员（方法/字段/只读访问器；get+set 双通道豁免）', () => {
  const offenders: string[] = []
  const baseCache = new Map<boolean, Map<string, MemberKind[]>>()
  let scanned = 0
  for (const f of walk(SRC)) {
    const tag = basename(f, '.ts')
    if (!tag.startsWith('oas-')) continue
    const src = readFileSync(f, 'utf8')
    if (scanObservedAttributes(src).length === 0) continue
    scanned++
    const withForm = extendsFormElement(src)
    if (!baseCache.has(withForm)) baseCache.set(withForm, baseMembers(withForm))
    offenders.push(...findOffenders(tag, src, relative(SRC, f).replace(/\\/g, '/'), baseCache.get(withForm)!))
  }
  expect(scanned, '守卫覆盖面自检：扫描到的组件文件数（防止路径/正则失效空转过闸）').toBeGreaterThan(50)
  expect(
    offenders.sort(),
    `以下 attribute 的 camelCase 名撞同类/基类实例成员（框架按「key in el」走 property 写入会遮蔽/污染）：\n${offenders.join('\n')}`,
  ).toEqual([])
})

test('反证：基类成员 shadow 纳入比对——card 撤掉原型遮蔽必红，现行源码（get+set）放行', () => {
  const base = baseMembers(false)
  const real = readFileSync(join(SRC, 'data/card/oas-card.ts'), 'utf8')

  // 反证：把真实 card 的 defineProperty 遮蔽撤掉（其余不变），守卫必须报 shadow 撞基类字段
  const unshadowed = real.replace(/Object\.defineProperty\(this\.prototype, 'shadow', \{[\s\S]*?\n    \}\)/, '')
  expect(unshadowed, '反证夹具：defineProperty 遮蔽块应已被移除').not.toBe(real)
  const caught = findOffenders('oas-card', unshadowed, 'data/card/oas-card.ts（撤掉遮蔽）', base)
  expect(caught, '基类 shadow 未遮蔽时必须报红（守卫有效性反证）').toHaveLength(1)
  expect(caught[0]).toContain("'shadow'")

  // 真实 card 源码：原型 get+set 双通道遮蔽 → 不报 shadow
  const realOffenders = findOffenders('oas-card', real, 'data/card/oas-card.ts', base)
  expect(realOffenders.filter((x) => x.includes("'shadow'"))).toEqual([])
})

// —— 覆盖面自检（回归固化）——
// scanObservedAttributes 曾用「indexOf 首块 + return 距 ≤300」启发：接口类型声明
// （`observedAttributes: string[]`）先命中、工厂 class 块位置偏远，即整文件返回 []——
// 以下六个组件（含 toolbar-separator）曾静默跳过源码级比对（运行时守卫仍在，但未来回归无报警）。
// 新增漏扫场景时在此补行。
const SCAN_COVERAGE: [string, string[]][] = [
  ['basic/typography/oas-typography.ts', ['level', 'copy-text']], // 工厂函数内 class + 条件 return 双分支
  ['data/kanban/oas-kanban.ts', ['columns', 'card-estimate']],
  ['data/resource/oas-resource.ts', ['scale', 'show-load-values']], // 块内多行数组带行注释
  ['data/table/oas-table.ts', ['row-height', 'windowed']],
  ['navigation/toolbar/oas-toolbar.ts', ['orientation', 'focusable-when-disabled']],
]

test('覆盖面自检：历史整文件漏扫组件的 observedAttributes 必须采到（防扫描器静默空转）', () => {
  for (const [rel, names] of SCAN_COVERAGE) {
    const blocks = scanObservedAttributes(readFileSync(join(SRC, ...rel.split('/')), 'utf8'))
    const attrs = blocks.flatMap((b) => b.attrs)
    expect(attrs, `${rel} 的 observedAttributes 漏扫（历史缺陷：indexOf 首块启发遇类型声明/偏远块整文件空转）`).toEqual(
      expect.arrayContaining(names),
    )
  }
})

test('覆盖面自检：工厂函数内嵌套 class 的实例成员必须采到（缩进启发曾整类漏扫）', () => {
  const src = readFileSync(join(SRC, 'basic/typography/oas-typography.ts'), 'utf8')
  const members = scanClasses(src).get('OASTypography')
  expect(members, 'OASTypography（工厂内嵌套 class）成员池必须存在').toBeDefined()
  // 已知实例成员（private 字段/方法）：缩进 4 空格，2 空格启发时代整类漏扫
  for (const name of ['root', 'template', 'syncTag']) {
    expect(members!.has(name), `OASTypography 实例成员 ${name} 必须被采集`).toBe(true)
  }
})

test('反证：attribute 撞同类私有方法必红——resource 注入 private scale() 后守卫必须报出（历史 scale 撞名回归）', () => {
  const base = baseMembers(false)
  const real = readFileSync(join(SRC, 'data/resource/oas-resource.ts'), 'utf8')
  // 真实源码：scale attribute 设计内（无同名实例成员），必须零 offender 放行
  expect(findOffenders('oas-resource', real, 'data/resource/oas-resource.ts', base)).toEqual([])
  // 合成夹具：class 体首行注入 private scale() 方法（判定只看成员名，形态等价于把现有私有方法改名撞 scale），守卫必须报红
  const poisoned = real.replace(
    'export class OASResource extends OASElement {\n',
    'export class OASResource extends OASElement {\n  private scale(): void {}\n',
  )
  expect(poisoned, '反证夹具：private scale 应已注入 class 体').not.toBe(real)
  const caught = findOffenders('oas-resource', poisoned, 'data/resource/oas-resource.ts（注入 private scale）', base)
  expect(
    caught.filter((x) => x.includes("'scale'")),
    `attribute 'scale' 撞私有方法必须报红，实报：\n${caught.join('\n')}`,
  ).toHaveLength(1)
})
