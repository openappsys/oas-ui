import { escapeText } from '@oas-ui/core/escape'
import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'

/** 希腊字母映射（LaTeX 命令 → Unicode 字符） */
const GREEK: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
}

/** 运算符映射（LaTeX 命令 → Unicode 字符） */
const OPERATORS: Record<string, string> = {
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  cdot: '·',
  ast: '∗',
  leq: '≤',
  geq: '≥',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  emptyset: '∅',
  to: '→',
  gets: '←',
  in: '∈',
  notin: '∉',
  subset: '⊂',
  supset: '⊃',
  cup: '∪',
  cap: '∩',
  forall: '∀',
  exists: '∃',
  neg: '¬',
  land: '∧',
  lor: '∨',
  ldots: '…',
  cdots: '⋯',
  vdots: '⋮',
  prime: '′',
  leftarrow: '←',
  rightarrow: '→',
  leftrightarrow: '↔',
  sum: '∑',
  int: '∫',
  prod: '∏',
}

type Tok =
  | { kind: 'text'; text: string }
  | { kind: 'open' }
  | { kind: 'close' }
  | { kind: 'sup' }
  | { kind: 'sub' }
  | { kind: 'cmd'; name: string }

type Node =
  | { type: 'text'; text: string }
  | { type: 'group'; children: Node[] }
  | { type: 'sup'; body: Node }
  | { type: 'sub'; body: Node }
  | { type: 'frac'; num: Node[]; den: Node[] }
  | { type: 'sqrt'; body: Node[]; index: Node[] | null }
  | { type: 'op'; symbol: string; upper: Node | null; lower: Node | null }

/** LaTeX 子集 tokenizer：`\cmd`、`{}^_` 为结构 token，其余按文本段累积 */
function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  let buf = ''
  const flush = (): void => {
    if (buf) {
      toks.push({ kind: 'text', text: buf })
      buf = ''
    }
  }
  let i = 0
  while (i < src.length) {
    const ch = src[i]!
    if (ch === '\\') {
      const m = /^\\[a-zA-Z]+/.exec(src.slice(i))
      if (m) {
        flush()
        toks.push({ kind: 'cmd', name: m[0].slice(1) })
        i += m[0].length
        continue
      }
      // 非字母转义（如 `\ ` 或 `\\`）：字面保留反斜杠，继续累积后续字符
      buf += ch
      i++
      continue
    }
    if (ch === '{' || ch === '}' || ch === '^' || ch === '_') {
      flush()
      toks.push({ kind: ch === '{' ? 'open' : ch === '}' ? 'close' : ch === '^' ? 'sup' : 'sub' })
      i++
      continue
    }
    buf += ch
    i++
  }
  flush()
  return toks
}

/**
 * 解析一组节点，遇到 `}`（close）停止并停留在 close token（由调用方消费）。
 */
function parseGroup(toks: Tok[], pos: { i: number }): Node[] {
  const nodes: Node[] = []
  while (pos.i < toks.length) {
    const tok = toks[pos.i]!
    if (tok.kind === 'close') break
    if (tok.kind === 'open') {
      pos.i++
      const children = parseGroup(toks, pos)
      if (toks[pos.i]?.kind === 'close') pos.i++
      nodes.push({ type: 'group', children })
      continue
    }
    if (tok.kind === 'sup') {
      pos.i++
      nodes.push({ type: 'sup', body: parseAtom(toks, pos) })
      continue
    }
    if (tok.kind === 'sub') {
      pos.i++
      nodes.push({ type: 'sub', body: parseAtom(toks, pos) })
      continue
    }
    if (tok.kind === 'cmd') {
      pos.i++
      nodes.push(parseCommand(toks, pos, tok.name))
      continue
    }
    nodes.push({ type: 'text', text: tok.text })
    pos.i++
  }
  return nodes
}

/** 解析单个原子（sup/sub 的 body，或 group 内元素） */
function parseAtom(toks: Tok[], pos: { i: number }): Node {
  const tok = toks[pos.i]
  if (!tok) return { type: 'text', text: '' }
  if (tok.kind === 'open') {
    pos.i++
    const children = parseGroup(toks, pos)
    if (toks[pos.i]?.kind === 'close') pos.i++
    return { type: 'group', children }
  }
  if (tok.kind === 'cmd') {
    pos.i++
    return parseCommand(toks, pos, tok.name)
  }
  if (tok.kind === 'text') {
    pos.i++
    return { type: 'text', text: tok.text }
  }
  pos.i++
  return { type: 'text', text: '' }
}

/** 解析 `{...}` 分组；缺省返回空组 */
function parseBrace(toks: Tok[], pos: { i: number }): Node[] {
  if (toks[pos.i]?.kind === 'open') {
    pos.i++
    const children = parseGroup(toks, pos)
    if (toks[pos.i]?.kind === 'close') pos.i++
    return children
  }
  return []
}

/** 解析 LaTeX 命令（frac/sqrt/sum/int/希腊字母/运算符/未知字面） */
function parseCommand(toks: Tok[], pos: { i: number }, name: string): Node {
  if (name === 'frac') {
    const num = parseBrace(toks, pos)
    const den = parseBrace(toks, pos)
    return { type: 'frac', num, den }
  }
  if (name === 'sqrt') {
    let index: Node[] | null = null
    const next = toks[pos.i]
    // 可选根指数 \sqrt[n]{x}：`[n]` 落在单个 text token 内
    if (next?.kind === 'text') {
      const m = /^\[([^\]]*)\]/.exec(next.text)
      if (m) {
        index = [{ type: 'text', text: m[1]! }]
        next.text = next.text.slice(m[0].length)
        if (next.text === '') pos.i++
      }
    }
    const body = parseBrace(toks, pos)
    return { type: 'sqrt', body, index }
  }
  if (name === 'sum' || name === 'int' || name === 'prod') {
    const node: Node = {
      type: 'op',
      symbol: name === 'sum' ? '∑' : name === 'int' ? '∫' : '∏',
      upper: null,
      lower: null,
    }
    // 吸收后续 _{...} / ^{...} 作为上下限
    for (;;) {
      const t = toks[pos.i]
      if (t?.kind === 'sub') {
        pos.i++
        node.lower = parseAtom(toks, pos)
        continue
      }
      if (t?.kind === 'sup') {
        pos.i++
        node.upper = parseAtom(toks, pos)
        continue
      }
      break
    }
    return node
  }
  const greek = GREEK[name]
  if (greek) return { type: 'text', text: greek }
  const op = OPERATORS[name]
  if (op) return { type: 'text', text: op }
  // 未知命令：按字面显示，不报错
  return { type: 'text', text: `\\${name}` }
}

function render(n: Node | Node[]): string {
  if (Array.isArray(n)) return n.map(render).join('')
  switch (n.type) {
    case 'text':
      return escapeText(n.text)
    case 'group':
      return n.children.map(render).join('')
    case 'sup':
      return `<span class="sup">${render(n.body)}</span>`
    case 'sub':
      return `<span class="sub">${render(n.body)}</span>`
    case 'frac':
      return `<span class="frac"><span class="num">${render(n.num)}</span><span class="den">${render(n.den)}</span></span>`
    case 'sqrt': {
      const idx = n.index ? `<span class="sqrt-index">${render(n.index)}</span>` : ''
      return `<span class="sqrt">${idx}<span class="radicand">${render(n.body)}</span></span>`
    }
    case 'op': {
      const sup = n.upper ? `<span class="sup">${render(n.upper)}</span>` : ''
      const sub = n.lower ? `<span class="sub">${render(n.lower)}</span>` : ''
      return `<span class="op"><span class="op-sym">${n.symbol}</span><span class="op-limits">${sup}${sub}</span></span>`
    }
    default:
      return ''
  }
}

/**
 * 自研简化 LaTeX 子集渲染（零第三方引擎）。
 *
 * 支持：上标/下标（^ _）、分数 \frac{a}{b}、根号 \sqrt{} / \sqrt[n]{}、
 * 求和/积分/连乘（\sum \int \prod，带 _{...}^{...} 上下限）、希腊字母、常用运算符。
 * 未知命令按字面显示，不报错。
 */
export function renderLatex(code: string): string {
  const toks = tokenize(code)
  const ast = parseGroup(toks, { i: 0 })
  return ast.map(render).join('')
}

const STYLE = `
:host {
  display: inline-block;
  /* 公式是正文内嵌特种文本，跟随外层字号（内部上下标/根号已全 em 相对）；
     定制开口：--oas-equation-font */
  font-size: var(--oas-equation-font, inherit);
  color: var(--oas-color-text-primary);
  line-height: 1.6;
}
:host([hidden]) {
  display: none;
}
/* 块级模式（行间公式）：独立居中行 + 上下间距；字号不放大（display 公式排版惯例） */
:host([display='block']) {
  display: block;
  text-align: center;
  margin-block: var(--oas-equation-block-margin, var(--oas-space-4));
}
:host([display='block']) .equation {
  display: inline-block;
}
/* 外部引擎渲染产物容器：引擎自带样式（如引擎字体/类名）在其自身体内生效 */
.equation[data-engine='injected'] {
  font-style: normal;
}
.equation {
  font-family: 'Times New Roman', 'STIX Two Math', 'Cambria Math', serif;
  font-style: italic;
  white-space: nowrap;
  /* 公式内容恒 LTR：数学排版不做方向镜像（通行做法），RTL 宿主下仅组件布局间距逻辑化，
     公式内部结构（上下标/根号/分式）保持从左到右 */
  direction: ltr;
}
.sup,
.sub {
  font-size: 0.68em;
  font-style: normal;
  line-height: 1;
}
.sup {
  vertical-align: super;
  margin-inline-start: 0.08em;
}
.sub {
  vertical-align: sub;
  margin-inline-start: 0.08em;
}
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: middle;
  text-align: center;
  margin: 0 0.15em;
}
.frac .num {
  border-bottom: 1px solid currentColor;
  padding: 0 0.3em 0.08em;
}
.frac .den {
  padding: 0.08em 0.3em 0;
}
.sqrt {
  display: inline-flex;
  align-items: flex-start;
  vertical-align: middle;
}
.sqrt::before {
  content: '√';
  font-style: normal;
  margin-inline-end: 0.05em;
}
.sqrt .sqrt-index {
  font-size: 0.6em;
  font-style: normal;
  vertical-align: super;
}
.sqrt .radicand {
  border-top: 1px solid currentColor;
  padding: 0 0.2em;
}
.op {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: middle;
  margin: 0 0.15em;
}
.op .op-sym {
  font-style: normal;
  font-size: 1.35em;
}
.op-limits {
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.op-limits .sup,
.op-limits .sub {
  margin-inline-start: 0;
}
`

/** 编辑实时预览样式（仅 editable 在场时拼进 <style>；默认输出与历史版本逐字节一致） */
const EDIT_STYLE = `
/* ---- 编辑实时预览（editable opt-in） ---- */
:host([editable]) .equation {
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
}
:host([editable]) .equation:hover {
  background: var(--oas-color-bg-hover);
}
:host([editable]) .equation:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 编辑中：equation 切换为实时预览区（虚线框标注预览态，不再是交互入口） */
:host([editable]) .equation[data-preview] {
  cursor: default;
  background: transparent;
  outline: 1px dashed var(--oas-color-border);
  outline-offset: 2px;
}
:host([editable]) .editor {
  display: flex;
  margin-block-end: var(--oas-space-1);
}
:host([editable]) .editor[hidden] {
  display: none;
}
:host([editable]) .field {
  appearance: none;
  outline: none;
  box-sizing: border-box;
  width: 100%;
  min-width: 12ch;
  padding: 2px var(--oas-space-1);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: var(--oas-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
  resize: none;
}
:host([editable]) .field:focus {
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被 UA 弃用：焦点环回退系统色实线 outline（WCAG 2.4.7） */
  :host([editable]) .equation:focus-visible,
  :host([editable]) .field:focus {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

/** 输入法组合态判定：isComposing 或旧浏览器 keyCode 229 均视为组合中（选词 Enter 不触发提交） */
function isComposing(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229
}

/**
 * 可注入的公式渲染引擎协议（薄壳模式的宿主注入对象）：
 * 兼容「renderToString(code, options) → HTML 字符串」形态的 TeX 渲染引擎
 * （如 KaTeX），由宿主自行安装并经 `engine` property 注入。
 *
 * 信任边界：引擎输出作为 innerHTML 直出组件 shadow——注入的引擎是宿主自己的代码，
 * 宿主对其产物负责；SSR 场景引擎需在服务端同样可用（组件 SSR 快照只走属性通道，
 * 引擎属性需宿主在服务端同步注入）。
 */
export interface EquationEngine {
  renderToString(code: string, options?: Record<string, unknown>): string
}

/** 形态校验：注入对象必须携带可调用的 renderToString */
function isEngine(v: unknown): v is EquationEngine {
  return typeof v === 'object' && v !== null && typeof (v as EquationEngine).renderToString === 'function'
}

/**
 * oas-equation —— 数学公式组件（自研简化 LaTeX 子集，零第三方引擎）。
 *
 * 属性（kebab-case）：
 * - `code`：LaTeX 子集源文本
 * - `display`：`'block'` 块级模式（独立居中行间公式），缺省行内
 *
 * Property：
 * - `engine`：注入兼容 TeX 渲染引擎对象（renderToString 协议），注入后委托渲染；
 *   移除（置 null）回到自研子集渲染。非法对象同置 null（丢弃已注入引擎）
 *
 * 渲染为 HTML（span 堆叠 + CSS 排版分数/上下标/根号/求和积分上下限）。
 * 未知命令按字面显示不报错；ARIA：容器 aria-label = 原始 LaTeX。
 * 双轨：自研子集默认（零依赖），引擎注入后薄壳委托（错误静默回退自研）。
 */
export class OASEquation extends OASElement {
  static override get observedAttributes(): string[] {
    return ['code', 'display', 'editable']
  }

  /** 编辑预览节流窗口（ms）：leading 立即渲染 + trailing 带最新值补渲染 */
  private static readonly PREVIEW_THROTTLE_MS = 200

  private injected: EquationEngine | null = null
  /** 编辑态：编辑区显示、equation 切换为实时预览区 */
  private editingState = false
  private fieldEl: HTMLTextAreaElement | null = null
  /** 预览节流：trailing 待触发定时器与上次渲染时刻 */
  private previewTimer: ReturnType<typeof setTimeout> | null = null
  private lastPreviewAt = 0
  /** 预览渲染失败已告警的源码集合（同源码一次性 devWarn，不重复告警） */
  private warnedPreviewFailures = new Set<string>()

  /** 注入/移除渲染引擎（property 通道；非法值同置 null——丢弃已注入引擎，回到自研渲染） */
  get engine(): EquationEngine | null {
    return this.injected
  }

  set engine(value: EquationEngine | null) {
    this.injected = isEngine(value) ? value : null
    if (this.isConnected) this.update()
  }

  /**
   * @apiProperty 当前值：编辑中读内部输入框实时文本，非编辑态读受控 `code` 属性
   * （提交口径与 oas-change 一致）。写入反射到 `code` 属性（受控赋值即生效，不派发事件）。
   */
  get value(): string {
    return this.editingState && this.fieldEl ? this.fieldEl.value : this.getAttr('code', '')
  }

  set value(v: string) {
    const next = v == null ? '' : String(v)
    this.setAttribute('code', next)
    if (this.fieldEl) this.fieldEl.value = next
    if (this.hasRendered) this.update()
  }

  /** SSR 快照与客户端渲染共用同一份模板（editable 在场才含编辑区与编辑态样式，默认输出逐字节一致） */
  private template(): string {
    if (!this.hasAttribute('editable')) {
      return `
      <style>${STYLE}</style>
      <div class="equation" part="equation" aria-label=""></div>
    `
    }
    return `
      <style>${STYLE}${EDIT_STYLE}</style>
      <span class="editor" part="editor" hidden><textarea class="field" part="field" rows="1" spellcheck="false"></textarea></span>
      <div class="equation" part="equation" aria-label=""></div>
    `
  }

  /** 绑定进入编辑事件与编辑框监听（render 与水合路径共用） */
  private bind(): void {
    const eq = this.shadow.querySelector<HTMLElement>('[part="equation"]')
    eq?.addEventListener('click', () => {
      if (this.hasAttr('editable')) this.enterEdit()
    })
    eq?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.hasAttr('editable')) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.enterEdit()
      }
    })
    // 编辑区随 editable 在场由模板/快照带入；动态补挂的由 syncEditable 创建并绑定
    const field = this.shadow.querySelector<HTMLTextAreaElement>('[part="field"]')
    if (field) this.bindField(field)
    this.onCleanup(() => {
      if (this.previewTimer) {
        clearTimeout(this.previewTimer)
        this.previewTimer = null
      }
    })
  }

  /** 编辑框监听（幂等：bind 与 createEditor 共用，同 field 只绑一次） */
  private bindField(field: HTMLTextAreaElement): void {
    if (this.fieldEl === field) return
    this.fieldEl = field
    field.addEventListener('keydown', (e) => this.onFieldKeydown(e as KeyboardEvent))
    field.addEventListener('blur', (e) => this.handleBlur(e as FocusEvent))
    field.addEventListener('input', () => this.onFieldInput())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（equation 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="equation"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const eq = this.shadow.querySelector<HTMLElement>('[part="equation"]')
    if (!eq) return
    this.syncEditable(eq)
    if (this.editingState) {
      // 编辑中：equation 为实时预览区（内容来自内部输入框，输入事件节流刷新）
      this.renderPreview(eq, this.fieldEl?.value ?? this.getAttr('code', ''))
      return
    }
    const code = this.getAttr('code', '')
    // 默认/展示态 aria-label = 原始 LaTeX；editable 展示态为编辑入口（aria-label 由 syncEditable 标注）
    if (!this.hasAttr('editable')) eq.setAttribute('aria-label', code)
    // 双轨：引擎注入则薄壳委托（错误静默回退自研子集，不空白不抛出）
    if (this.injected) {
      try {
        eq.innerHTML = this.injected.renderToString(code, {
          throwOnError: false,
          displayMode: this.getAttr('display', '') === 'block',
        })
        eq.setAttribute('data-engine', 'injected')
        return
      } catch {
        /* 引擎渲染失败：落到下方自研渲染 */
      }
    }
    eq.removeAttribute('data-engine')
    eq.innerHTML = renderLatex(code)
  }

  /** 编辑能力与 editable 属性同步：编辑区节点动态增删 + 展示态交互属性（受控移除时清理） */
  private syncEditable(eq: HTMLElement): void {
    let editor = this.shadow.querySelector<HTMLElement>('[part="editor"]')
    if (!this.hasAttr('editable')) {
      if (editor) {
        editor.remove()
        this.fieldEl = null
        this.editingState = false
      }
      this.removeAttribute('data-editing')
      eq.removeAttribute('role')
      eq.removeAttribute('tabindex')
      eq.removeAttribute('data-preview')
      return
    }
    if (!editor) {
      editor = this.createEditor()
      this.shadow.insertBefore(editor, eq)
    }
    if (this.editingState) return
    eq.setAttribute('role', 'button')
    eq.setAttribute('tabindex', '0')
    eq.setAttribute('aria-label', this.t('equation.edit'))
  }

  /** 动态补建编辑区（editable 属性后置于渲染时由 update 增量插入） */
  private createEditor(): HTMLElement {
    const editor = document.createElement('span')
    editor.className = 'editor'
    editor.setAttribute('part', 'editor')
    editor.hidden = true
    const field = document.createElement('textarea')
    field.className = 'field'
    field.setAttribute('part', 'field')
    field.rows = 1
    field.setAttribute('spellcheck', 'false')
    this.bindField(field)
    editor.appendChild(field)
    return editor
  }

  /** 编辑预览渲染：注入引擎优先（抛错回退源码显示 + 一次性 devWarn），自研子集兜底 */
  private renderPreview(eq: HTMLElement, code: string): void {
    eq.setAttribute('aria-label', code)
    if (this.injected) {
      try {
        eq.innerHTML = this.injected.renderToString(code, {
          throwOnError: false,
          displayMode: this.getAttr('display', '') === 'block',
        })
        eq.setAttribute('data-engine', 'injected')
        return
      } catch {
        // 渲染失败回退显示源码（转义纯文本），同源码只告警一次
        if (!this.warnedPreviewFailures.has(code)) {
          this.warnedPreviewFailures.add(code)
          devWarn(`[oas-equation] 注入引擎渲染失败，预览已回退为源码显示：${code}`)
        }
        eq.removeAttribute('data-engine')
        eq.textContent = code
        return
      }
    }
    eq.removeAttribute('data-engine')
    eq.innerHTML = renderLatex(code)
  }

  /** 进入编辑态：编辑区显示、源码回填聚焦；equation 切换为实时预览区 */
  private enterEdit(): void {
    if (!this.hasAttr('editable') || this.editingState) return
    const editor = this.shadow.querySelector<HTMLElement>('[part="editor"]')
    const eq = this.shadow.querySelector<HTMLElement>('[part="equation"]')
    const field = this.fieldEl
    if (!editor || !eq || !field) return
    this.editingState = true
    editor.hidden = false
    this.setAttribute('data-editing', '')
    eq.removeAttribute('role')
    eq.removeAttribute('tabindex')
    eq.setAttribute('data-preview', '')
    field.value = this.getAttr('code', '')
    field.setAttribute('aria-label', this.t('equation.editing'))
    field.placeholder = this.t('equation.placeholder')
    this.emit('editing', { editing: true })
    field.focus()
    field.select()
  }

  /** 退出编辑态（提交/取消共用）：恢复展示态交互属性 */
  private exitEdit(): void {
    this.editingState = false
    const editor = this.shadow.querySelector<HTMLElement>('[part="editor"]')
    if (editor) editor.hidden = true
    this.removeAttribute('data-editing')
    const eq = this.shadow.querySelector<HTMLElement>('[part="equation"]')
    if (eq) {
      eq.removeAttribute('data-preview')
      if (this.hasAttr('editable')) {
        eq.setAttribute('role', 'button')
        eq.setAttribute('tabindex', '0')
        eq.setAttribute('aria-label', this.t('equation.edit'))
      }
    }
    this.emit('editing', { editing: false })
  }

  /** 提交：写回 code 属性（变化才派发 oas-change），退出编辑态并归还焦点 */
  private submit(): void {
    if (!this.editingState) return
    const oldValue = this.getAttr('code', '')
    const next = this.fieldEl?.value ?? ''
    this.exitEdit()
    if (next !== oldValue) {
      this.setAttribute('code', next)
      this.emit('change', { value: next })
    } else {
      // 同值 setAttribute 不触发 attributeChangedCallback：显式重渲染恢复展示态
      this.update()
    }
    this.shadow.querySelector<HTMLElement>('[part="equation"]')?.focus()
  }

  /** 取消（Esc）：恢复原值显示，不写入受控值 */
  private cancel(): void {
    if (!this.editingState) return
    this.exitEdit()
    this.update()
    this.emit('cancel', { value: this.getAttr('code', '') })
    this.shadow.querySelector<HTMLElement>('[part="equation"]')?.focus()
  }

  private onFieldKeydown(e: KeyboardEvent): void {
    // IME 组合态防护：选词确认的 Enter 不触发提交
    if (isComposing(e)) return
    if (e.key === 'Enter') {
      e.preventDefault()
      this.submit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.cancel()
    }
  }

  private handleBlur(e: FocusEvent): void {
    if (!this.editingState) return
    // 文件内 Node 为公式 AST 节点类型，relatedTarget 用 Element 收窄（focus 相关目标必为元素或 null）
    const related = e.relatedTarget as Element | null
    // 焦点移到组件内部（如预览区）时不提交，交由后续交互处理
    if (related && this.shadow.contains(related)) return
    this.submit()
  }

  /** 输入节流（leading 立即 + trailing 带最新值补渲染）：预览实时跟随输入 */
  private onFieldInput(): void {
    const now = Date.now()
    const elapsed = now - this.lastPreviewAt
    if (this.previewTimer) return // 已有 trailing 待触发（触发时带最新值）
    if (elapsed >= OASEquation.PREVIEW_THROTTLE_MS) {
      this.lastPreviewAt = now
      const eq = this.shadow.querySelector<HTMLElement>('[part="equation"]')
      if (eq) this.renderPreview(eq, this.fieldEl?.value ?? '')
      return
    }
    this.previewTimer = setTimeout(() => {
      this.previewTimer = null
      this.lastPreviewAt = Date.now()
      const eq = this.shadow.querySelector<HTMLElement>('[part="equation"]')
      if (eq && this.editingState) this.renderPreview(eq, this.fieldEl?.value ?? '')
    }, OASEquation.PREVIEW_THROTTLE_MS - elapsed)
  }
}
