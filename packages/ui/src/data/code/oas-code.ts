import { OASElement, escapeText } from '@oas-ui/core'
import { normalizeSizeStrict, type OasSize } from '../../shared/size.js'

export type CodeLanguage = 'js' | 'ts' | 'html' | 'css' | 'json' | string
export type CodeSize = 'xs' | 'small' | 'medium' | 'large'
export type CodeVariant = 'subtle' | 'outline' | 'plain' | 'solid'

/** 本组件支持的档位子集（无 xl）；sm/md/lg 别名由 shared/size 归一 */
const CODE_SIZES: readonly OasSize[] = ['xs', 'small', 'medium', 'large']
const VALID_VARIANTS = ['subtle', 'outline', 'plain', 'solid'] as const

/** 预设色板名（映射 --oas-preset-*-text 达标 token，color 属性支持按名引用；统一协议见 ui-spec §4.1） */
export type CodePresetColor =
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'

export const CODE_PRESET_COLORS: readonly CodePresetColor[] = [
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
]

const warnedValues = new Set<string>()

/** 非法值告警：dev 下 console.warn 一次（同值去重），值本身走调用处的回落 */
function warnOnce(kind: string, raw: string, fallback: string, valid: readonly string[]): void {
  const key = `${kind}:${raw}`
  if (warnedValues.has(key)) return
  warnedValues.add(key)
  console.warn(`[oas-code] 非法 ${kind} "${raw}"，已回落 ${fallback}；合法值：${valid.join('/')}`)
}

/** token 类别 → CSS class（配色见 STYLE 的 .tok-* 规则） */
type TokenClass = 'keyword' | 'string' | 'comment' | 'number' | 'tag' | 'attr' | 'function' | 'operator'

const JS_KEYWORDS = [
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'class',
  'extends',
  'import',
  'export',
  'from',
  'default',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'typeof',
  'instanceof',
  'this',
  'super',
  'null',
  'undefined',
  'true',
  'false',
  'in',
  'of',
  'yield',
  'static',
  'get',
  'set',
  'void',
  'delete',
]

const TS_KEYWORDS = [
  ...JS_KEYWORDS,
  'type',
  'interface',
  'enum',
  'namespace',
  'declare',
  'readonly',
  'implements',
  'keyof',
  'infer',
  'as',
  'abstract',
  'private',
  'protected',
  'public',
  'unknown',
  'never',
  'any',
  'satisfies',
]

const CSS_KEYWORDS = ['@media', '@import', '@keyframes', '@font-face', '@supports', 'important']

interface LangDef {
  keywords: string[]
  operators: boolean
  html?: boolean
  css?: boolean
}

const LANG_DEFS: Record<string, LangDef> = {
  js: { keywords: JS_KEYWORDS, operators: true },
  ts: { keywords: TS_KEYWORDS, operators: true },
  html: { keywords: [], operators: false, html: true },
  css: { keywords: CSS_KEYWORDS, operators: false, css: true },
  json: { keywords: ['true', 'false', 'null'], operators: false },
}

/** 行注释模式：`// ...` */
const LINE_COMMENT_RE = /\/\/[^\n]*/g
/** 块注释：js/ts/css 的 `/* ... *\/`，html 的 `<!-- ... -->` */
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g
/** 字符串：单引号/双引号/模板反引号（含转义字符） */
const STRING_RE = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g
const NUMBER_RE = /\b\d+(?:\.\d+)?\b/g
/** 运算符（排除 & < >，避免二次破坏 &lt;/&gt; 转义实体） */
const OPERATOR_RE = /[+\-*/%=!|^~?:]+/g

type Matcher = (src: string) => string

/** 按语言构建单遍组合正则高亮器：互斥分支 + 捕获组分类，一次 replace 完成 */
function buildMatcher(def: LangDef): Matcher {
  const classes: TokenClass[] = []
  const parts: string[] = []
  const add = (cls: TokenClass, source: string): void => {
    classes.push(cls)
    parts.push(`(${source})`)
  }
  if (!def.css) add('comment', LINE_COMMENT_RE.source)
  add('comment', BLOCK_COMMENT_RE.source)
  add('string', STRING_RE.source)
  if (def.html) {
    add('tag', `&lt;\\/?[A-Za-z][\\w-]*`)
    add('attr', `[\\w-]+(?==)`)
  } else if (def.css) {
    add('attr', `[\\w-]+(?=\\s*:)`)
    add('keyword', `@[a-zA-Z-]+|\\bimportant\\b`)
    add('number', NUMBER_RE.source)
  } else {
    if (def.keywords.length > 0) add('keyword', `\\b(?:${def.keywords.join('|')})\\b`)
    add('number', NUMBER_RE.source)
    add('function', `\\b[A-Za-z_$][\\w$]*(?=\\s*\\()`)
    if (def.operators) add('operator', OPERATOR_RE.source)
  }
  const re = new RegExp(parts.join('|'), 'g')
  return (src: string): string =>
    src.replace(re, (m, ...args) => {
      const captures = args.slice(0, classes.length)
      let cls: TokenClass = 'operator'
      for (let i = 0; i < captures.length; i++) {
        if (captures[i] !== undefined) {
          cls = classes[i]!
          break
        }
      }
      if (cls === 'tag') {
        // `&lt;` / `&lt;/` 保留字面，只给标签名包 span
        const name = m.replace(/^&lt;\//, '').replace(/^&lt;/, '')
        const open = m.slice(0, m.length - name.length)
        return `${open}${span('tag', name)}`
      }
      return span(cls, m)
    })
}

/**
 * 行内 token 高亮（自研正则，零第三方高亮引擎）。
 *
 * 算法：先转义 HTML → 用按语言构建的单遍组合正则扫描整行，注释/字符串/关键字/
 * 数字/函数/运算符/标签/属性以捕获组互斥匹配，一次 replace 完成着色——不存在
 * 二次处理导致破坏已生成 span 或转义实体的问题。未知语言返回纯文本（已转义）。
 */
export function highlightLine(src: string, language: string): string {
  const def = LANG_DEFS[language]
  if (!def) return escapeText(src)
  const matcher = buildMatcher(def)
  return matcher(escapeText(src))
}

function span(cls: TokenClass, text: string): string {
  return `<span class="tok-${cls}">${text}</span>`
}

/**
 * 解析行号集合表达式（1-based），供 `highlight-lines` / `focus-lines` 共用。
 *
 * 语法：逗号分隔的单点或闭区间，如 `"1,3-5"`。宽松容错——空白忽略、
 * 倒序区间归一（`5-3` 等价 `3-5`）、非法片段（非数字/0/负号开头）静默跳过，
 * 不抛错也不整体失效（文档站点手写行号常态）。
 */
export function parseLineRanges(input: string): Set<number> {
  const result = new Set<number>()
  for (const part of input.split(',')) {
    const seg = part.trim()
    if (!seg) continue
    const m = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(seg)
    if (!m) continue
    const start = Number(m[1])
    const end = m[2] === undefined ? start : Number(m[2])
    if (start < 1 || end < 1) continue
    const lo = Math.min(start, end)
    const hi = Math.max(start, end)
    for (let i = lo; i <= hi; i++) result.add(i)
  }
  return result
}

/** 解析 `max-rows`：空/非法/0 均视为不折叠（0 = 不封顶，对齐 textarea 批语义） */
function parseMaxRows(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) {
    warnOnce('max-rows', raw, '不折叠', ['正整数', '0'])
    return null
  }
  if (n === 0) return null
  return Math.floor(n)
}

const STYLE = `
:host {
  display: block;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  /* 代码字号跟随外层并略缩（0.875em 是跨库排版共识）；定制开口：--oas-code-font */
  font-size: var(--oas-code-font, 0.875em);
  line-height: 1.6;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.block {
  position: relative;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  overflow: auto;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-bottom: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
}
.lang {
  margin-inline-end: auto;
  /* 次级文本按比例跟随 host（原 xs/sm ≈ 12/13） */
  font-size: 0.923em;
  color: var(--oas-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.copy-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0 var(--oas-space-1);
  font-size: 0.923em;
  color: var(--oas-color-primary);
  cursor: pointer;
  font-family: inherit;
}
.copy-btn:hover {
  color: var(--oas-color-primary-hover);
}
.copy-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: var(--oas-radius-sm);
}
.copy-btn[hidden] {
  display: none;
}
pre.code {
  margin: 0;
  padding: var(--oas-space-3) var(--oas-space-4);
  overflow: auto;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}
.line {
  display: block;
}
.line-number {
  display: inline-block;
  width: 2.5em;
  margin-inline-end: var(--oas-space-3);
  text-align: end;
  color: var(--oas-color-text-secondary);
  user-select: none;
  font-variant-numeric: tabular-nums;
}
.line-code {
  white-space: pre;
  /* 代码内容恒 LTR：代码不做方向镜像（通行做法），RTL 宿主下仅行号区换边，
     代码文本保持从左到右（isolate 隔离宿主 direction 继承） */
  direction: ltr;
  unicode-bidi: isolate;
}
/* word-wrap：长代码换行不横向滚动 */
.block.word-wrap .line-code {
  white-space: pre-wrap;
  word-break: break-all;
}
/* highlight-lines：整行高亮底（token 派生，可经 CSS 变量覆盖） */
.line-highlight {
  background: var(--oas-code-highlight-bg, color-mix(in srgb, var(--oas-color-primary) 12%, transparent));
}
/* focus-lines：非聚焦行淡化（token 透明度可覆盖） */
.line-focus-dim {
  opacity: var(--oas-code-focus-dim-opacity, 0.35);
}
/* diff：+ 增绿 / - 减红（语义 token；行级着色压过行内 token 高亮） */
.line-diff-add {
  background: color-mix(in srgb, var(--oas-color-success) 12%, transparent);
}
.line-diff-remove {
  background: color-mix(in srgb, var(--oas-color-danger) 12%, transparent);
}
.line-diff-add .line-code,
.line-diff-add .line-code * {
  color: var(--oas-color-success-text);
}
.line-diff-remove .line-code,
.line-diff-remove .line-code * {
  color: var(--oas-color-danger-text);
}
/* max-rows 折叠尾行：展开/收起入口 */
.more-line {
  display: block;
}
.more-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: var(--oas-color-primary);
  cursor: pointer;
}
.more-btn:hover {
  color: var(--oas-color-primary-hover);
}
.more-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
  border-radius: var(--oas-radius-sm);
}
/* inline 行内代码：等宽+浅底小框，不块级不换行。
   注意 display 用 inline-block 而非 inline-flex：flex 容器会把内容拆成 flex item，
   文本节点间空格在 flex 布局下被折叠/忽略（实测 const a = 1 渲染成 consta=1）；
   inline-block 保持正常文本流，token 高亮的 span 与相邻文本间的空格完整保留 */
.inline {
  display: inline-block;
  /* 代码内容恒 LTR（同块级代码；inline-block 自身构成 bidi isolate，锁定内部方向即可） */
  direction: ltr;
  unicode-bidi: isolate;
  padding: 0.1em var(--oas-space-1);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-sm);
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: var(--oas-code-color, var(--oas-color-text-primary));
  white-space: nowrap;
}
/* hidden 兜底：作者层 display:inline-block 会压过 UA 的 [hidden]{display:none}，
   块级形态下隐藏的 inline 载体（block variant 时 hidden 属性恒在）会渲染成
   8×3px 灰药丸残片（同 progress 先例：作者级 display 必须显式补回 hidden） */
.inline[hidden] {
  display: none;
}
/* inline variant 形态：subtle 默认浅底/outline 描边/plain 纯文字/solid 实底 */
.inline.outline {
  background: transparent;
  border: 1px solid var(--oas-color-border-strong);
}
.inline.plain {
  background: transparent;
  padding: 0;
}
.inline.solid {
  background: var(--oas-code-color, var(--oas-color-text-primary));
  color: var(--oas-code-on-color, var(--oas-color-bg));
}
/* inline size 档位（字号档，medium 为现状零回归） */
.inline.xs {
  font-size: var(--oas-font-size-xs);
}
.inline.small {
  font-size: var(--oas-font-size-sm);
}
.inline.large {
  font-size: var(--oas-font-size-md);
}
/* 高亮 token 配色（只用 token） */
.tok-keyword { color: var(--oas-color-primary-text); }
.tok-string { color: var(--oas-color-success-text); }
.tok-comment { color: var(--oas-color-text-secondary); font-style: italic; }
.tok-number { color: var(--oas-color-warning-text); }
.tok-tag { color: var(--oas-color-danger-text); }
.tok-attr { color: var(--oas-color-warning-text); }
.tok-function { color: var(--oas-color-primary-text); }
.tok-operator { color: var(--oas-color-text-secondary); }
/* inline solid 实底反转（light 深底 / dark 浅底）：上面的暗色语法档在深底上不达标，
   改为 30% accent 朝 on-color 方向混合——light 主题提亮压深底、dark 主题压暗压浅底，
   双向随主题翻转达标；自定义底色经 --oas-code-on-color 开口跟随 */
.inline.solid .tok-keyword,
.inline.solid .tok-function {
  color: color-mix(in srgb, var(--oas-color-primary-text) 30%, var(--oas-code-on-color, var(--oas-color-bg)));
}
.inline.solid .tok-string {
  color: color-mix(in srgb, var(--oas-color-success-text) 30%, var(--oas-code-on-color, var(--oas-color-bg)));
}
.inline.solid .tok-comment,
.inline.solid .tok-operator {
  color: color-mix(in srgb, var(--oas-color-text-secondary) 30%, var(--oas-code-on-color, var(--oas-color-bg)));
}
.inline.solid .tok-number,
.inline.solid .tok-attr {
  color: color-mix(in srgb, var(--oas-color-warning-text) 30%, var(--oas-code-on-color, var(--oas-color-bg)));
}
.inline.solid .tok-tag {
  color: color-mix(in srgb, var(--oas-color-danger-text) 30%, var(--oas-code-on-color, var(--oas-color-bg)));
}
`

/**
 * oas-code —— 代码块组件（自研正则 token 高亮，零第三方引擎）。
 *
 * 属性（kebab-case）：
 * - `code`：源代码原文
 * - `language`：js / ts / html / css / json；未知语言按纯文本渲染不报错
 * - `show-line-number`：显示行号栏
 * - `copyable`：复制按钮（默认 true，false 关闭）
 *
 * 事件（bubbles + composed）：
 * - `oas-copy`：`{ text }` 复制成功
 * - `oas-copy-error`：`{ text }` 复制失败
 *
 * 复制逻辑复用 typography：navigator.clipboard 优先，execCommand 兜底。
 */
export class OASCode extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'code',
      'language',
      'show-line-number',
      'copyable',
      'inline',
      'word-wrap',
      'trim',
      'size',
      'variant',
      'color',
      'highlight-lines',
      'focus-lines',
      'diff',
      'max-rows',
    ]
  }

  private copyTimer: ReturnType<typeof setTimeout> | null = null
  /** max-rows 折叠是否已展开（非受控内部态；max-rows 未启用/无可折叠内容时无意义） */
  private expanded = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <code class="inline" part="inline" hidden></code>
      <div class="block" part="block">
        <div class="toolbar" part="toolbar">
          <span class="lang" part="language"></span>
          <button type="button" class="copy-btn" part="copy" aria-label=""></button>
        </div>
        <pre class="code" part="code"><code class="code-inner" part="code-inner"></code></pre>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector<HTMLButtonElement>('.copy-btn')?.addEventListener('click', () => {
      void this.handleCopy()
    })
    // 折叠尾行按钮每次 update 重建，走事件委托（绑定在常驻的 pre 上）
    this.shadow.querySelector<HTMLElement>('[part="code"]')?.addEventListener('click', (e) => {
      const target = e.target as Element | null
      if (target?.closest('.more-btn')) {
        this.expanded = !this.expanded
        this.update()
      }
    })
    this.onCleanup(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（代码块骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.block')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const inner = this.shadow.querySelector<HTMLElement>('[part="code-inner"]')
    const langEl = this.shadow.querySelector<HTMLElement>('[part="language"]')
    const copy = this.shadow.querySelector<HTMLButtonElement>('[part="copy"]')
    const inlineEl = this.shadow.querySelector<HTMLElement>('[part="inline"]')
    if (!inner || !langEl || !copy) return

    const code = this.getAttr('code', '')
    const language = this.getAttr('language', '')
    const inline = this.hasAttr('inline')

    // trim：默认去首尾空白（多行源码书写惯例），trim="false" 保留
    const trim = this.getAttr('trim', 'true') !== 'false'
    const trimmed = trim ? code.trim() : code

    langEl.textContent = language
    langEl.hidden = language === ''
    copy.hidden = this.getAttr('copyable', 'true') === 'false'
    copy.textContent = this.t('code.copy')
    copy.setAttribute('aria-label', this.t('code.copy'))

    // inline 行内代码：无块级容器、无工具栏、无行号，单行渲染
    if (inlineEl) {
      if (inline) {
        inlineEl.hidden = false
        const blockEl = this.shadow.querySelector<HTMLElement>('.block')
        if (blockEl) blockEl.hidden = true
        // inline 的 variant / size / color 走 class + 变量；size 走 shared/size 归一化
        const variant = this.normalizeAttr('variant', VALID_VARIANTS, 'subtle')
        const sizeRaw = this.getAttr('size', '')
        let size: OasSize = 'medium'
        if (sizeRaw) {
          const { value, isValid } = normalizeSizeStrict(sizeRaw, CODE_SIZES, 'medium')
          size = value
          if (!isValid) warnOnce('size', sizeRaw, 'medium', CODE_SIZES)
        }
        const classes = ['inline', variant !== 'subtle' ? variant : '', size !== 'medium' ? size : '']
          .filter(Boolean)
          .join(' ')
        if (classes) inlineEl.className = classes
        else inlineEl.removeAttribute('class')
        // color 统一协议
        const color = this.getAttr('color', '')
        if (color) {
          const isPreset = (CODE_PRESET_COLORS as readonly string[]).includes(color)
          inlineEl.style.setProperty('--oas-code-color', isPreset ? `var(--oas-preset-${color}-text)` : color)
        } else {
          inlineEl.style.removeProperty('--oas-code-color')
        }
        // inline 内容：单行渲染（trim 后按行取首行——行内代码不跨行），走高亮
        inlineEl.innerHTML = highlightLine(trimmed.split('\n')[0] ?? trimmed, language)
        return
      }
      inlineEl.hidden = true
    }

    // word-wrap：块级容器换行
    const blockEl = this.shadow.querySelector<HTMLElement>('.block')
    if (blockEl) {
      blockEl.classList.toggle('word-wrap', this.hasAttr('word-wrap'))
    }

    // 按行渲染：可选行号 + 每行高亮 / 行聚焦 / diff 着色 / max-rows 折叠
    const showLineNumber = this.hasAttr('show-line-number')
    const lines = trimmed.split('\n')
    // 末行空串（源码常以 \n 结尾）不产生多余空行
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()

    // 行装饰集合（1-based）；非法片段由 parseLineRanges 静默忽略
    const highlightSet = parseLineRanges(this.getAttr('highlight-lines', ''))
    const focusSet = parseLineRanges(this.getAttr('focus-lines', ''))
    const diff = this.hasAttr('diff')

    // max-rows 折叠：仅当确有可折叠内容（行数 > 上限）时出现尾行（含展开后折回入口）
    const maxRows = parseMaxRows(this.getAttr('max-rows', ''))
    const limit = maxRows ?? lines.length
    const collapsible = maxRows !== null && lines.length > limit
    const visible = collapsible && !this.expanded ? limit : lines.length

    const rows: string[] = []
    for (let i = 0; i < visible; i++) {
      const line = lines[i] ?? ''
      const classes = ['line']
      if (highlightSet.has(i + 1)) classes.push('line-highlight')
      if (focusSet.size > 0 && !focusSet.has(i + 1)) classes.push('line-focus-dim')
      if (diff) {
        // diff 语义：`+` 增加行（绿）/ `-` 删除行（红）；`+++`/`---` 文件头同样按行首字符判定
        if (line.startsWith('+')) classes.push('line-diff-add')
        else if (line.startsWith('-')) classes.push('line-diff-remove')
      }
      rows.push(
        `<span class="${classes.join(' ')}" part="line">${showLineNumber ? `<span class="line-number" part="line-number" aria-hidden="true">${i + 1}</span>` : ''}<code class="line-code">${highlightLine(line, language)}</code></span>`,
      )
    }
    if (collapsible) {
      rows.push(
        `<span class="line more-line" part="more"><button type="button" class="more-btn" part="more-btn" aria-expanded="${this.expanded}">${this.t(this.expanded ? 'ellipsis.collapse' : 'ellipsis.expand')}</button></span>`,
      )
    }
    // .line 是块级（行号对齐），行间不 join('\n')——pre 的 white-space:pre 会把
    // 行间换行文本节点渲染成真换行，每行后多一条空行（实测 4 行代码块高度翻倍）
    inner.innerHTML = rows.join('')
  }

  /** 归一化枚举属性：非法值回落 + 告警 */
  private normalizeAttr<T extends string>(name: string, valid: readonly T[], fallback: T): T {
    const raw = this.getAttr(name, '')
    if (!raw) return fallback
    if ((valid as readonly string[]).includes(raw)) return raw as T
    warnOnce(name, raw, fallback, valid)
    return fallback
  }

  private async handleCopy(): Promise<void> {
    const text = this.getAttr('code', '')
    const copy = this.shadow.querySelector<HTMLButtonElement>('[part="copy"]')
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      this.emit('copy', { text })
      // 短暂反馈「已复制」后恢复
      if (copy) {
        const done = this.t('code.copied')
        copy.textContent = done
        copy.setAttribute('aria-label', done)
        if (this.copyTimer) clearTimeout(this.copyTimer)
        this.copyTimer = setTimeout(() => {
          const label = this.t('code.copy')
          copy.textContent = label
          copy.setAttribute('aria-label', label)
        }, 1500)
      }
    } catch {
      this.emit('copy-error', { text })
    }
  }
}
