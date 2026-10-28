// 静态防回流扫描：docs md 页面脚本里对 oas-* 元素的「升级前裸 property 写入」。
//
// 为什么：页面脚本（onMounted 同步体）可能早于 @oas-ui/ui 动态 import 完成——在未升级元素上
// 写 property 会产生自有属性、遮蔽升级后的 setter/accessor，数据静默丢失（demo 空白且无报错）。
// 已知真实命中历史：transfer/virtual-list/calendar/message-scroller（已统一走
// `.vitepress/theme/when-defined.ts` 的 whenTagDefined 守卫）。
//
// 判定口径（宁漏勿误伤）：
//  - 只查「接收者可静态解析为 oas-* 元素」的 `.prop =` 写入——接收者必须来自字面量
//    getElementById/querySelector('#id')/querySelector('oas-*')/createElement('oas-*')，
//    且 id 能在**同页非代码围栏 HTML**里解析出 oas-* 标签名。解析不了的（普通对象、
//    e.detail、动态选择器、原生元素）一律不报。
//  - 原生 Element/HTMLElement 属性（style/textContent/innerHTML/className/…）写进白名单：
//    升级前写它们不产生 expando 遮蔽问题。
//  - 只拦「同步加载路径」：顶层、onMounted 回调体、以及被同步路径调用的具名函数体。
//    事件回调 / setTimeout / rAF / .then / Observer 回调里的写入执行时机必然晚于组件定义
//    （用户交互/异步边界之后），不报——「已升级元素不得误伤」。
//  - whenTagDefined('tag', () => {...}) 守卫块内不报；async 函数体内 `await
//    customElements.whenDefined(...)` / `await Promise.all([...whenDefined...])` 之后的写入不报。
//  - 附带校验：whenTagDefined 的 tag 必须真实出现在本页 HTML 里（防拼写错误静默空 demo）。
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

export interface Finding {
  file: string
  line: number
  prop: string
  receiver: string
  text: string
}

// ---------- 单文件扫描器（导出供自测 fixture 使用） ----------

// 原生属性白名单：升级前写它们不会遮蔽组件 setter（Element/HTMLElement/Node 自身 API）
const NATIVE_PROPS = new Set([
  'style',
  'textContent',
  'innerText',
  'innerHTML',
  'outerHTML',
  'className',
  'id',
  'title',
  'hidden',
  'dataset',
  'tabIndex',
  'scrollTop',
  'scrollLeft',
  'slot',
  'dir',
  'lang',
  'role',
  'draggable',
  'spellcheck',
  'translate',
])

interface ScriptFinding extends Finding {
  blockLine: number
}

/** 提取 md 里的 <script> 块（返回 { code, startLine }），并同时返回剥掉 script/代码围栏后的 HTML 文本 */
function extractScripts(content: string): { scripts: Array<{ code: string; startLine: number }>; html: string } {
  const scripts: Array<{ code: string; startLine: number }> = []
  const html = content
    .replace(/```[\s\S]*?```/g, (m) => '\n'.repeat(m.split('\n').length - 1)) // 代码围栏不是真实 DOM
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, (m, ...rest) => {
      const offset = (rest[rest.length - 1] as number) ?? 0
      scripts.push({
        code: m.slice(m.indexOf('>') + 1, m.lastIndexOf('<')),
        startLine: content.slice(0, offset).split('\n').length,
      })
      return '\n'.repeat(m.split('\n').length - 1)
    })
  return { scripts, html }
}

/** 从 HTML 建 id → 标签名映射（只关心 oas-*；多行标签用向前找最近 `<` 的方式） */
function buildIdTagMap(html: string): Map<string, string> {
  const map = new Map<string, string>()
  const idRe = /\bid="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = idRe.exec(html))) {
    const before = html.slice(Math.max(0, m.index - 400), m.index)
    const lt = before.lastIndexOf('<')
    if (lt < 0) continue
    const tag = /^<([a-zA-Z][\w-]*)/.exec(before.slice(lt))?.[1] ?? ''
    if (tag.toLowerCase().startsWith('oas-')) map.set(m[1]!, tag.toLowerCase())
  }
  return map
}

/** 判断字面量选择器/tagName 对应的 oas-* 标签；无法判定返回 null */
function resolveTargetLiteral(arg: string, idTags: Map<string, string>): string | null {
  const sel = arg.trim().replace(/^['"]|['"]$/g, '')
  if (sel.startsWith('oas-')) return sel.split(/[\s.#>[:]/)[0]!.toLowerCase()
  if (sel.startsWith('#')) return idTags.get(sel.slice(1)) ?? null
  // getElementById 的裸 id
  return idTags.get(sel) ?? null
}

/** 判断行是否引入「异步/守卫」回调作用域（写入执行时机必然晚于组件定义） */
const ASYNC_INTRO_RE =
  /\.addEventListener\s*\(|\b(?:setTimeout|setInterval|requestAnimationFrame|queueMicrotask)\s*\(|\.then\s*\(|\.finally\s*\(|new\s+(?:Mutation|Resize|Intersection|Performance)Observer\s*\(|\.observe\s*\(|\.catch\s*\(/
// whenTagDefined('tag', () => { ——共享守卫 helper（theme/when-defined.ts）
const HELPER_GUARD_RE = /whenTagDefined\s*\(\s*['"][^'"]+['"]\s*,/

/** 扫描单个 script 块，返回裸写 findings */
export function scanScript(
  code: string,
  opts: { file: string; startLine: number; idTags: Map<string, string>; html: string },
): Finding[] {
  const findings: Finding[] = []
  const lines = code.split('\n')
  // 作用域栈：sync=同步加载路径；async=异步回调；guard=升级守卫；inherit=普通块（跟随当前）
  type Kind = 'sync' | 'async' | 'guard' | 'inherit'
  const stack: Kind[] = []
  const effective = (): Kind => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const k = stack[i]!
      if (k === 'guard' || k === 'async') return k
    }
    return 'sync'
  }
  const varTags = new Map<string, string>()
  // 具名函数 → 定义处生效类型（在 async/guard 作用域里定义的函数，其函数体执行必然晚于升级）
  const funcKind = new Map<string, Kind>()
  // await Promise.all([...whenDefined...]) 多行表达式的武装标记
  let awaitGuardArmed = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const line = raw
    const depthBefore = stack.length

    // await 多行武装：await Promise.all( 开启 / 单行 await + whenDefined 直接武装本作用域
    if (/\bawait\b[^;]*whenDefined/.test(line) && stack.length > 0) {
      stack[stack.length - 1] = 'guard'
      awaitGuardArmed = true
    } else if (/\bawait\b[^;]*import\(\s*['"]@oas-ui\/ui['"]\s*\)/.test(line) && stack.length > 0) {
      // await import('@oas-ui/ui')：模块求值副作用即 customElements.define 全部组件，
      // 其后的写入必然晚于定义（notification/drawer/upload/sidebar 等页的既有守卫模式）
      stack[stack.length - 1] = 'guard'
    } else if (/\bawait\b[^;]*Promise\.all\s*\(/.test(line)) {
      awaitGuardArmed = true
    } else if (awaitGuardArmed && /whenDefined/.test(line) && stack.length > 0) {
      stack[stack.length - 1] = 'guard'
    } else if (awaitGuardArmed && /^\s*[)\]}],?\s*;?\s*$/.test(line)) {
      awaitGuardArmed = false
    }

    // 变量 → oas-* 目标绑定（仅字面量可解析）
    const bind = line.match(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.(getElementById|querySelector|createElement)\(([^)]*)\)/,
    )
    if (bind) {
      const [, name, api, arg] = bind
      let tag: string | null = null
      if (api === 'createElement') {
        const t = arg!.trim().replace(/^['"]|['"]$/g, '')
        tag = t.toLowerCase().startsWith('oas-') ? t.toLowerCase() : null
      } else {
        tag = resolveTargetLiteral(arg!, opts.idTags)
      }
      varTags.set(name!, tag ?? '')
    }

    // 作用域进出（净花括号计数；well-formatted 源码下成立）
    const net = (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0)
    const kind: Kind = HELPER_GUARD_RE.test(line) ? 'guard' : ASYNC_INTRO_RE.test(line) ? 'async' : 'inherit'
    if (net > 0) {
      stack.push(kind)
      for (let k = 1; k < net; k++) stack.push('inherit')
    } else if (net < 0) {
      for (let k = 0; k < -net && stack.length > 0; k++) stack.pop()
    }

    // 具名函数登记：定义处生效类型（async/guard 定义 → 函数体必然晚于升级；否则继承 sync 风险）
    const fn =
      line.match(
        /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/,
      ) ?? line.match(/(?:^|\s)function\s+([A-Za-z_$][\w$]*)\s*\(/)
    if (fn && net > 0) {
      const enc = effective()
      funcKind.set(fn[1]!, enc === 'sync' ? 'sync' : enc)
    }

    // 裸写检测：`x.prop =` / `if (x) x.prop =` / `document.getElementById('x').prop =`
    const asg =
      line.match(/^\s*(?:if\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*)?([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*=(?![=>])/) ??
      line.match(/^\s*document\.(?:getElementById|querySelector)\(([^)]*)\)\.([A-Za-z_$][\w$]*)\s*=(?![=>])/)
    if (asg) {
      let tag: string | null = null
      let receiver = ''
      let prop = ''
      if (asg[2] !== undefined && asg[3] !== undefined) {
        prop = asg[3]
        receiver = asg[2]
        tag = varTags.get(asg[2]) ?? ''
        // if (cond) 前缀的变量本身也可能是目标
        if (!tag?.startsWith('oas-') && asg[1] && varTags.get(asg[1])?.startsWith('oas-')) {
          tag = varTags.get(asg[1]!)!
          receiver = asg[1]!
        }
      } else {
        prop = asg[2]!
        tag = resolveTargetLiteral(asg[1]!, opts.idTags)
        receiver = `document…(${asg[1]!.trim()})`
      }
      if (tag?.startsWith('oas-') && !NATIVE_PROPS.has(prop)) {
        const scope: Kind = effective()
        const isSync = scope === 'sync' && !(awaitGuardArmed && stack[stack.length - 1] === 'guard')
        if (isSync) {
          findings.push({
            file: opts.file,
            line: opts.startLine + i,
            prop,
            receiver: `${receiver} → ${tag}`,
            text: line.trim().slice(0, 120),
          })
        }
      }
    }
    void depthBefore
  }
  return findings
}

/** 扫描一个 md 文件（真实页面 + fixture 共用） */
export function scanMarkdown(content: string, file: string): Finding[] {
  const { scripts, html } = extractScripts(content)
  const idTags = buildIdTagMap(html)
  const findings: Finding[] = []
  for (const s of scripts) {
    findings.push(...scanScript(s.code, { file, startLine: s.startLine, idTags, html }))
  }
  // whenTagDefined 的 tag 必须真实出现在本页 HTML（防拼写错误 → 永不定义 → 静默空 demo）
  const helperRe = /whenTagDefined\s*\(\s*['"]([^'"]+)['"]/g
  let h: RegExpExecArray | null
  while ((h = helperRe.exec(content))) {
    const tag = h[1]!
    if (!new RegExp('<' + tag + '(\\s|>|$)').test(html)) {
      findings.push({
        file,
        line: content.slice(0, h.index).split('\n').length,
        prop: 'whenTagDefined-tag',
        receiver: tag,
        text: h[0],
      })
    }
  }
  return findings
}

// ---------- 真实页面扫描 ----------

const DOCS_DIR = join(import.meta.dirname, 'docs')
function walkMd(dir: string): string[] {
  // 跳过构建产物/缓存：dist 里的 md 是源页的拷贝，扫描会重复计数
  if (/(^|[\\/])\.vitepress[\\/](dist|cache)([\\/]|$)/.test(dir)) return []
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walkMd(p))
    else if (name.endsWith('.md')) out.push(p)
  }
  return out
}

describe('docs demo 升级前裸 property 写入防回流', () => {
  test('全站 md 无裸写（transfer/virtual-list/calendar/message-scroller 曾真实命中）', () => {
    const all: Finding[] = []
    for (const f of walkMd(DOCS_DIR)) {
      all.push(...scanMarkdown(readFileSync(f, 'utf8'), f.replaceAll('\\', '/')))
    }
    expect(
      all,
      `发现升级前裸 property 写入（未升级元素上写 property 会遮蔽 setter，数据静默丢失）。\n` +
        `修复：用 .vitepress/theme/when-defined.ts 的 whenTagDefined('tag', () => {...}) 包裹，\n` +
        `或移入事件回调/whenDefined 之后；详情见文件头判定口径。\n` +
        all.map((f) => `${f.file}:${f.line} [${f.prop}] ${f.text}（${f.receiver}）`).join('\n'),
    ).toEqual([])
  })

  test('自测：async 函数 await whenDefined 之后不报（含多行 await Promise.all([whenDefined…])）', () => {
    const single = [
      '<oas-gantt id="g"></oas-gantt>',
      '<script setup>',
      'onMounted(async () => {',
      '  await customElements.whenDefined("oas-gantt")',
      '  const g = document.getElementById("g")',
      '  g.tasks = []',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(single, 'fixture')).toEqual([])

    const multi = [
      '<oas-gantt id="g"></oas-gantt>',
      '<script setup>',
      'onMounted(async () => {',
      '  await Promise.all([',
      '    customElements.whenDefined("oas-gantt"),',
      '    customElements.whenDefined("oas-table"),',
      '  ])',
      '  const g = document.getElementById("g")',
      '  g.tasks = []',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(multi, 'fixture'), '多行 await Promise.all 之后的写入不报').toEqual([])

    const awaitImport = [
      '<oas-button id="b"></oas-button>',
      '<script setup>',
      'onMounted(async () => {',
      '  const { message } = await import("@oas-ui/ui")',
      '  const b = document.getElementById("b")',
      '  b.size = "small"',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(awaitImport, 'fixture'), 'await import("@oas-ui/ui") 之后模块已完成 define，写入不报').toEqual(
      [],
    )
  })

  test('自测：whenTagDefined 的 tag 必须在本页 HTML 真实存在', () => {
    const bad = '<script setup>\nwhenTagDefined("oas-no-such-tag", () => {})\n</script>\n'
    expect(scanMarkdown(bad, 'fixture').some((f) => f.prop === 'whenTagDefined-tag')).toBe(true)
    const ok = '<oas-button id="b"></oas-button>\n<script setup>\nwhenTagDefined("oas-button", () => {})\n</script>\n'
    expect(scanMarkdown(ok, 'fixture').filter((f) => f.prop === 'whenTagDefined-tag')).toEqual([])
  })

  test('自测：同步路径裸写必须判红', () => {
    const page = [
      '<DemoBlock>',
      '  <oas-transfer id="t-basic"></oas-transfer>',
      '</DemoBlock>',
      '',
      '<script setup>',
      'import { onMounted } from "vue"',
      'onMounted(() => {',
      '  const el = document.getElementById("t-basic")',
      '  if (el) el.data = [{ key: "a", label: "A" }]',
      '})',
      '</script>',
      '',
    ].join('\n')
    const hits = scanMarkdown(page, 'fixture')
    expect(hits.length, '同步裸写应判红').toBe(1)
    expect(hits[0]!.prop).toBe('data')
    expect(hits[0]!.receiver).toContain('oas-transfer')
  })

  test('自测：守卫块/事件回调/异步路径/普通对象/原生属性/不可解析目标不误伤', () => {
    const page = [
      '<oas-transfer id="t1"></oas-transfer>',
      '<oas-virtual-list id="v1"></oas-virtual-list>',
      '<div id="out"></div>',
      '',
      '<script setup>',
      'import { onMounted } from "vue"',
      'import { whenTagDefined } from "../.vitepress/theme/when-defined"',
      'onMounted(() => {',
      '  // 守卫块内：不报',
      '  const t1 = document.getElementById("t1")',
      '  whenTagDefined("oas-transfer", () => {',
      '    if (t1) t1.data = [{ key: "a" }]',
      '  })',
      '  // 事件回调：执行时机晚于升级，不报',
      '  const v1 = document.querySelector("#v1")',
      '  v1?.addEventListener("oas-scroll", () => {',
      '    v1.items = [1, 2, 3]',
      '  })',
      '  // 定时器回调：不报',
      '  setTimeout(() => {',
      '    v1.items = []',
      '  }, 0)',
      '  // .then 回调：不报',
      '  customElements.whenDefined("oas-transfer").then(() => {',
      '    t1.data = []',
      '  })',
      '  // async 函数 await whenDefined 之后：不报',
      '  onMounted(async () => {',
      '    await customElements.whenDefined("oas-transfer")',
      '    t1.data = []',
      '  })',
      '  // 普通对象写入：不报',
      '  const detail = { value: 1 }',
      '  detail.value = 2',
      '  // 原生属性：不报',
      '  const out = document.getElementById("out")',
      '  if (out) out.textContent = "x"',
      '  // 不可解析目标（非字面量参数）：不报',
      '  const unknown = document.getElementById(someVar)',
      '  if (unknown) unknown.value = "x"',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(page, 'fixture')).toEqual([])
  })

  test('自测：async 作用域内定义的具名函数体不报，同步具名函数体报', () => {
    const syncFn = [
      '<oas-virtual-list id="v"></oas-virtual-list>',
      '<script setup>',
      'onMounted(() => {',
      '  const v = document.getElementById("v")',
      '  const gen = (n) => {',
      '    v.items = [n]',
      '  }',
      '  gen(10)',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(syncFn, 'fixture').length, '同步具名函数体内的裸写应判红（同步调用路径）').toBe(1)

    const asyncFn = [
      '<oas-virtual-list id="v"></oas-virtual-list>',
      '<script setup>',
      'onMounted(() => {',
      '  const v = document.getElementById("v")',
      '  v.addEventListener("click", () => {',
      '    const gen = (n) => {',
      '      v.items = [n]',
      '    }',
      '    gen(10)',
      '  })',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(asyncFn, 'fixture'), '事件回调内定义并调用的函数体不报').toEqual([])
  })
})
