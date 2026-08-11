import { OASElement } from '@oas-ui/core'

export type CodeLanguage = 'js' | 'ts' | 'html' | 'css' | 'json' | string

/** token 类别 → CSS class（配色见 STYLE 的 .tok-* 规则） */
type TokenClass =
  'keyword' | 'string' | 'comment' | 'number' | 'tag' | 'attr' | 'function' | 'operator'

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

/** HTML 转义（文本节点上下文不转义双引号，保证字符串 token 仍可匹配） */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

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
  if (!def) return escapeHtml(src)
  const matcher = buildMatcher(def)
  return matcher(escapeHtml(src))
}

function span(cls: TokenClass, text: string): string {
  return `<span class="tok-${cls}">${text}</span>`
}

const STYLE = `
:host {
  display: block;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--oas-font-size-sm);
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
  margin-right: auto;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.copy-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
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
  margin-right: var(--oas-space-3);
  text-align: right;
  color: var(--oas-color-text-disabled);
  user-select: none;
  font-variant-numeric: tabular-nums;
}
.line-code {
  white-space: pre;
}
/* 高亮 token 配色（只用 token） */
.tok-keyword { color: var(--oas-color-primary); }
.tok-string { color: var(--oas-color-success); }
.tok-comment { color: var(--oas-color-text-secondary); font-style: italic; }
.tok-number { color: var(--oas-color-warning); }
.tok-tag { color: var(--oas-color-danger); }
.tok-attr { color: var(--oas-color-warning); }
.tok-function { color: var(--oas-color-primary); }
.tok-operator { color: var(--oas-color-text-secondary); }
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
    return ['code', 'language', 'show-line-number', 'copyable']
  }

  private copyTimer: ReturnType<typeof setTimeout> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
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
    if (!inner || !langEl || !copy) return

    const code = this.getAttr('code', '')
    const language = this.getAttr('language', '')

    langEl.textContent = language
    langEl.hidden = language === ''
    copy.hidden = this.getAttr('copyable', 'true') === 'false'
    copy.textContent = this.t('code.copy')
    copy.setAttribute('aria-label', this.t('code.copy'))

    // 按行渲染：可选行号 + 每行高亮
    const showLineNumber = this.hasAttr('show-line-number')
    const lines = code.split('\n')
    // 末行空串（源码常以 \n 结尾）不产生多余空行
    if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
    inner.innerHTML = lines
      .map(
        (line, i) =>
          `<span class="line" part="line">${showLineNumber ? `<span class="line-number" part="line-number" aria-hidden="true">${i + 1}</span>` : ''}<code class="line-code">${highlightLine(line, language)}</code></span>`,
      )
      .join('\n')
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
