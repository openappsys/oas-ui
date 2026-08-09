import { OASElement } from '@oas-ui/core'

/** 希腊字母映射（LaTeX 命令 → Unicode 字符） */
const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
  rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
  Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
}

/** 运算符映射（LaTeX 命令 → Unicode 字符） */
const OPERATORS: Record<string, string> = {
  times: '×', div: '÷', pm: '±', mp: '∓', cdot: '·', ast: '∗',
  leq: '≤', geq: '≥', neq: '≠', approx: '≈', equiv: '≡', sim: '∼',
  infty: '∞', partial: '∂', nabla: '∇', emptyset: '∅',
  to: '→', gets: '←', in: '∈', notin: '∉', subset: '⊂', supset: '⊃',
  cup: '∪', cap: '∩', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨',
  ldots: '…', cdots: '⋯', vdots: '⋮', prime: '′',
  leftarrow: '←', rightarrow: '→', leftrightarrow: '↔',
  sum: '∑', int: '∫', prod: '∏',
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function render(n: Node | Node[]): string {
  if (Array.isArray(n)) return n.map(render).join('')
  switch (n.type) {
    case 'text':
      return escapeHtml(n.text)
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
  font-size: var(--oas-font-size-lg);
  color: var(--oas-color-text-primary);
  line-height: 1.6;
}
.equation {
  font-family: 'Times New Roman', 'STIX Two Math', 'Cambria Math', serif;
  font-style: italic;
  white-space: nowrap;
}
.sup,
.sub {
  font-size: 0.68em;
  font-style: normal;
  line-height: 1;
}
.sup {
  vertical-align: super;
  margin-left: 0.08em;
}
.sub {
  vertical-align: sub;
  margin-left: 0.08em;
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
  margin-right: 0.05em;
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
  margin-left: 0;
}
`

/**
 * oas-equation —— 数学公式组件（自研简化 LaTeX 子集，零第三方引擎）。
 *
 * 属性（kebab-case）：
 * - `code`：LaTeX 子集源文本
 *
 * 渲染为 HTML（span 堆叠 + CSS 排版分数/上下标/根号/求和积分上下限）。
 * 未知命令按字面显示不报错；ARIA：容器 aria-label = 原始 LaTeX。
 */
export class OASEquation extends OASElement {
  static override get observedAttributes(): string[] {
    return ['code']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="equation" part="equation" aria-label=""></div>
    `
    this.update()
  }

  protected override update(): void {
    const eq = this.shadow.querySelector<HTMLElement>('[part="equation"]')
    if (!eq) return
    const code = this.getAttr('code', '')
    eq.setAttribute('aria-label', code)
    eq.innerHTML = renderLatex(code)
  }
}
