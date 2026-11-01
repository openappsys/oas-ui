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
//  - 守卫 helper 块内不报：whenTagDefined('tag', () => {...}) / onUpgraded(el, () => {...})
//    （theme/when-defined.ts）；async 函数体内 `await customElements.whenDefined(...)`
//    / `await Promise.all([...whenDefined...])` / `await import('@oas-ui/ui')` 之后的写入不报。
//  - 附带校验：whenTagDefined 的 tag 必须真实出现在本页 HTML 里（防拼写错误静默空 demo）。
//
// 解析前处理（行号/字节长度保持不变）：①代码围栏 → 等量换行；②内联代码 span（`...`）→
// 等量空格。②的教训：form.md 散文「一个 `<script>` 块统一挂接」里的内联 <script> 曾被
// script 剥离正则误认为真脚本开头、惰性吞到 570+ 行的真 </script>——夹在中间的 demo HTML
// 全部从 id 表消失、真脚本体从未被扫描，validatorForm.rules / vmForm.validateMessages
// 两处同步裸写因此漏报（2026-11 批次修复）。
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

/** 提取 md 里的 <script> 块（返回 { code, startLine }），并同时返回剥掉 script/代码围栏后的 HTML 文本 */
function extractScripts(content: string): { scripts: Array<{ code: string; startLine: number }>; html: string } {
  const scripts: Array<{ code: string; startLine: number }> = []
  // 先把代码围栏替换为「等量换行」、内联代码 span 替换为「等量空格」的中间串（行数不变）：
  // 后续提取 script 与绝对行号计算必须都用同一中间串——offset 是中间串里的位置，混用原始
  // content 会在「script 前有围栏/散文」时行号错位。内联 span 必须剥离：散文里 `` `<script>` ``
  // 这类字面样例会劫持 script 剥离正则（惰性吞到真 </script>），见文件头②的 form.md 教训。
  const intermediate = content
    .replace(/```[\s\S]*?```/g, (m) => '\n'.repeat(m.split('\n').length - 1))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length))
  const html = intermediate.replace(/<script[^>]*>[\s\S]*?<\/script>/g, (m, offset: number) => {
    // 无捕获组：replace 回调第 2 参即匹配起点 offset（此前误取 rest 末位的整体字符串，startLine 恒 1）
    scripts.push({
      code: m.slice(m.indexOf('>') + 1, m.lastIndexOf('<')),
      startLine: intermediate.slice(0, offset).split('\n').length,
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
// whenTagDefined('tag', () => { / onUpgraded(el, () => { ——共享守卫 helper（theme/when-defined.ts）
const HELPER_GUARD_RE = /whenTagDefined\s*\(\s*['"][^'"]+['"]\s*,|\bonUpgraded\s*\([^,]*,/

/** 扫描单个 script 块，返回裸写 findings */
export function scanScript(
  code: string,
  opts: { file: string; startLine: number; idTags: Map<string, string> },
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
    const line = lines[i]!

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
  }
  return findings
}

/** 扫描一个 md 文件（真实页面 + fixture 共用） */
export function scanMarkdown(content: string, file: string): Finding[] {
  const { scripts, html } = extractScripts(content)
  const idTags = buildIdTagMap(html)
  const findings: Finding[] = []
  for (const s of scripts) {
    findings.push(...scanScript(s.code, { file, startLine: s.startLine, idTags }))
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
        `修复：用 .vitepress/theme/when-defined.ts 的 whenTagDefined('tag', () => {...}) 或\n` +
        `onUpgraded(el, () => {...}) 包裹，或移入事件回调/whenDefined 之后；详情见文件头判定口径。\n` +
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

  test('自测：finding.line 必须是 md 文件内的绝对行号（非块内相对行号/恒 1）', () => {
    // script 前垫 6 行：script 开标签在文件第 7 行，`el.data = …` 落在文件第 11 行
    const page = [
      '前言段落',
      '',
      '<DemoBlock>',
      '  <oas-transfer id="t-line"></oas-transfer>',
      '</DemoBlock>',
      '',
      '<script setup>',
      'import { onMounted } from "vue"',
      'onMounted(() => {',
      '  const el = document.getElementById("t-line")',
      '  el.data = [{ key: "a" }]',
      '})',
      '</script>',
      '',
    ].join('\n')
    const hits = scanMarkdown(page, 'fixture')
    expect(hits.length, '同步裸写应判红').toBe(1)
    expect(hits[0]!.line, '行号必须是文件内绝对行号（script 开标签第 7 行，写入在其后第 4 行）').toBe(11)
    expect(
      new Set(scanMarkdown(`${page}\n\n${page}`, 'fixture').map((h) => h.line)).size,
      '两个 script 块的同型写入行号不得相同（证明非恒 1）',
    ).toBe(2)
  })

  test('自测：script 前有代码围栏时行号仍为绝对行号，且围栏内 DOM 不产生可解析目标', () => {
    // 围栏（3-5 行）在 script 之前：围栏替换为等量换行后字节数变短——
    // 若行号用原始 content 切 offset（中间串位置）会错位，必须用同一中间串
    const page = [
      '# 标题',
      '',
      '```html',
      '<oas-transfer id="t-fence-ghost"></oas-transfer>',
      '```',
      '',
      '<oas-transfer id="t-fence"></oas-transfer>',
      '',
      '<script setup>',
      'import { onMounted } from "vue"',
      'onMounted(() => {',
      '  const el = document.getElementById("t-fence")',
      '  el.data = [{ key: "a" }]',
      '  const ghost = document.getElementById("t-fence-ghost")',
      '  if (ghost) ghost.data = []',
      '})',
      '</script>',
      '',
    ].join('\n')
    const hits = scanMarkdown(page, 'fixture')
    expect(
      hits.length === 1 && hits[0]!.line === 13,
      `真实元素裸写应恰报 1 条、绝对行号 13（script 开标签第 9 行 + 4），实际 ${JSON.stringify(hits)}`,
    ).toBe(true)
    // 't-fence-ghost' 只存在于围栏内（围栏不是真实 DOM，已从 html 剥离）——对其裸写不可解析，不得误报
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

  test('自测：散文内联代码里的 `<script>` 不得劫持 script 剥离（form.md 曾致守卫分析全盲）', () => {
    // 散文行的 `` `<script>` `` 若不剥离，会被 script 剥离正则当作真脚本开头、惰性吞到
    // 真 </script>——真脚本体从未被扫描，同步裸写漏报（修复前本 fixture 判 0，属假绿）
    const page = [
      '受控同步与事件监听（一个 `<script>` 块统一挂接）：',
      '',
      '<oas-form id="fx"></oas-form>',
      '',
      '<script setup>',
      'import { onMounted } from "vue"',
      'onMounted(() => {',
      '  const el = document.getElementById("fx")',
      '  if (el) el.rules = { a: 1 }',
      '})',
      '</script>',
      '',
    ].join('\n')
    const hits = scanMarkdown(page, 'fixture')
    expect(hits.length, '散文内联 <script> 之后真脚本里的同步裸写必须判红').toBe(1)
    expect(hits[0]!.prop).toBe('rules')
  })

  test('自测：onUpgraded(el, () => {...}) 守卫块内不报（theme/when-defined.ts 元素句柄版）', () => {
    const page = [
      '<oas-form id="fy"></oas-form>',
      '<script setup>',
      'import { onMounted } from "vue"',
      'import { onUpgraded } from "../.vitepress/theme/when-defined"',
      'onMounted(() => {',
      '  const el = document.getElementById("fy")',
      '  onUpgraded(el, () => {',
      '    el.rules = { a: 1 }',
      '  })',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(page, 'fixture'), 'onUpgraded 守卫块内的复杂 property 写入不报').toEqual([])

    const inline = [
      '<oas-form id="fz"></oas-form>',
      '<script setup>',
      'import { onMounted } from "vue"',
      'import { onUpgraded } from "../.vitepress/theme/when-defined"',
      'onMounted(() => {',
      '  const el = document.getElementById("fz")',
      '  if (el) onUpgraded(el, () => (el.rules = { a: 1 }))',
      '})',
      '</script>',
      '',
    ].join('\n')
    expect(scanMarkdown(inline, 'fixture'), 'onUpgraded 单表达式守卫同样不报').toEqual([])
  })
})
