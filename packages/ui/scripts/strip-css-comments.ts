/**
 * 构建期：去掉组件样式常量里的 CSS 注释。
 *
 * 背景：组件把 CSS 写在 `const *_STYLE / *_CSS = \`...\`` 里，最终进入 JS 字符串。
 * JS 压缩器只处理代码、不改字符串内容，所以注释会随字符串进入 cdn.js（gzip 占比约 20%）。
 *
 * 识别边界：仓库约定样式常量名以 STYLE / STYLES / CSS 结尾（全仓 216 处，已核对无其他用途）。
 * 只处理这类声明里紧跟 `=` 的模板字面量；普通字符串/模板一律不碰。
 *
 * 删除方式：注释字符替换为空格、保留换行——长度与行号不变，源映射仍然对齐；
 * 真正的空白压缩交给后续 JS 压缩器。字符串（'…' / "…"）与 `${…}` 插值内部不处理。
 */

const DECL_RE = /\bconst\s+[A-Za-z0-9_]*(?:STYLE|STYLES|CSS)\s*=\s*`/g

/** 把 CSS 文本里的注释替换为等长空白（保留换行） */
export function stripCssComments(css: string): string {
  let out = ''
  let quote = ''
  let i = 0
  while (i < css.length) {
    const ch = css[i]!
    if (quote) {
      out += ch
      if (ch === '\\') {
        out += css[i + 1] ?? ''
        i += 2
        continue
      }
      if (ch === quote) quote = ''
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      out += ch
      i++
      continue
    }
    if (ch === '/' && css[i + 1] === '*') {
      let j = i + 2
      out += '  ' // 占位 /*
      while (j < css.length && !(css[j] === '*' && css[j + 1] === '/')) {
        out += css[j] === '\n' ? '\n' : ' '
        j++
      }
      out += '  ' // 占位 */
      i = Math.min(j + 2, css.length)
      continue
    }
    out += ch
    i++
  }
  return out
}

/** 从 `${` 之后开始，返回匹配 `}` 之后的下标（跳过 JS 字符串/模板/注释） */
function skipExpr(code: string, start: number): number {
  let depth = 1
  let i = start
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === "'" || ch === '"') {
      const q = ch
      i++
      while (i < code.length) {
        if (code[i] === '\\') i += 2
        else if (code[i] === q) {
          i++
          break
        } else i++
      }
      continue
    }
    if (ch === '`') {
      i = skipTemplate(code, i)
      continue
    }
    if (ch === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++
      continue
    }
    if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i + 1
    }
    i++
  }
  return code.length
}

/** 从反引号开始跳过整段模板（含嵌套插值），返回结束反引号之后的下标 */
function skipTemplate(code: string, start: number): number {
  let i = start + 1
  while (i < code.length) {
    const ch = code[i]
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === '`') return i + 1
    if (ch === '$' && code[i + 1] === '{') {
      i = skipExpr(code, i + 2)
      continue
    }
    i++
  }
  return code.length
}

/**
 * 对整段源码做样式常量注释清理。返回新源码（长度不变；无命中时原样返回）。
 */
export function stripStyleComments(code: string): string {
  if (!code.includes('/*')) return code
  let out = ''
  let last = 0
  DECL_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = DECL_RE.exec(code))) {
    const tick = m.index + m[0].length - 1 // 反引号位置
    let i = tick + 1
    let segStart = i
    const segs: Array<[number, number]> = []
    let end = -1
    while (i < code.length) {
      const ch = code[i]
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === '`') {
        segs.push([segStart, i])
        end = i + 1
        break
      }
      if (ch === '$' && code[i + 1] === '{') {
        segs.push([segStart, i])
        i = skipExpr(code, i + 2)
        segStart = i
        continue
      }
      i++
    }
    if (end < 0) break
    for (const [s, e] of segs) {
      const src = code.slice(s, e)
      if (!src.includes('/*')) continue
      const stripped = stripCssComments(src)
      if (stripped === src) continue
      out += code.slice(last, s) + stripped
      last = e
    }
    DECL_RE.lastIndex = end
  }
  if (last === 0) return code
  return out + code.slice(last)
}
