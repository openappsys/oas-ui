import { describe, it, expect } from 'vitest'
import {
  stripCssComments,
  stripStyleComments,
  foldCssWhitespace,
  foldStyleComments,
} from '../../scripts/strip-css-comments.js'

describe('构建期样式注释清理', () => {
  it('去掉 CSS 注释且长度/换行不变（源映射对齐）', () => {
    const css = `:host {\n  /* 注释 */\n  color: red;\n}`
    const out = stripCssComments(css)
    expect(out).not.toContain('/*')
    expect(out.length).toBe(css.length)
    expect(out.split('\n').length).toBe(css.split('\n').length)
    expect(out).toContain('color: red;')
  })

  it('保留字符串里的 /*（content / url 等）', () => {
    const css = `:host::after { content: "/* not a comment */"; background: url("a/*b.png") }`
    expect(stripCssComments(css)).toBe(css)
  })

  it('只处理 *_STYLE / *_CSS 常量，不碰普通模板', () => {
    const code = [
      'const STYLE = `:host { /* drop */ color: red }`',
      'const MESSAGE = `/* keep */`',
      'const BASE_STYLE = `a { /* drop */ }`',
      'const TOUCH_TARGET_CSS = `b { /* drop */ }`',
    ].join('\n')
    const out = stripStyleComments(code)
    expect(out).toContain('const MESSAGE = `/* keep */`')
    expect(out.match(/\/\*/g)?.length).toBe(1)
    expect(out.length).toBe(code.length)
  })

  it('保留 ${} 插值（含嵌套对象/函数调用）', () => {
    const code = 'const STYLE = `:host { /* x */ width: ${w}px; margin: ${fn({ a: 1 })}px }`'
    const out = stripStyleComments(code)
    expect(out).toContain('${w}')
    expect(out).toContain('${fn({ a: 1 })}')
    expect(out).not.toContain('/* x */')
    expect(out.length).toBe(code.length)
  })

  it('无注释时原样返回（同一引用）', () => {
    const code = 'const STYLE = `:host { color: red }`'
    expect(stripStyleComments(code)).toBe(code)
  })
})

describe('构建期样式空白折叠（安全模式）', () => {
  it('引号外连续空格/Tab 折叠为单个空格', () => {
    const css = ':host  {\t\tcolor:   red;\n}'
    expect(foldCssWhitespace(css)).toBe(':host { color: red;\n}')
  })

  it('空行去重（含缩进空行），保留单个换行', () => {
    const css = ':host {\n  color: red;\n\n   \n  background: blue;\n}'
    expect(foldCssWhitespace(css)).toBe(':host {\n color: red;\n background: blue;\n}')
  })

  it('连续 3 个以上换行折叠为单个换行', () => {
    const css = 'a {\n\n\n\n  color: red;\n}'
    expect(foldCssWhitespace(css)).toBe('a {\n color: red;\n}')
  })

  it('单引号/双引号内容原样保留（content / url 里的空白不动）', () => {
    const css = `:host::after { content: "a  b\\t c"; background: url('x  y.png') }`
    expect(foldCssWhitespace(css)).toBe(css)
  })

  it('引号内转义引号不结束保护状态', () => {
    const css = `:host { content: "say \\"hi  there\\"";  color: red }`
    expect(foldCssWhitespace(css)).toBe(`:host { content: "say \\"hi  there\\""; color: red }`)
  })

  it('值里的单个空格保留（不制造粘连）', () => {
    const css = 'grid-template-columns: 1fr auto;'
    expect(foldCssWhitespace(css)).toBe('grid-template-columns: 1fr auto;')
  })

  it('foldStyleComments 只处理 *_STYLE / *_CSS 常量模板，不碰普通模板与 JS 代码', () => {
    const code = [
      'const STYLE = `:host {  color: red;\n\n  background: blue }`',
      'const MESSAGE = `a  b\n\n c`',
      'function f() {',
      '  return',
      '  x',
      '}',
    ].join('\n')
    const out = foldStyleComments(code)
    expect(out).toContain('const STYLE = `:host { color: red;\n background: blue }`')
    expect(out).toContain('const MESSAGE = `a  b\n\n c`')
    expect(out).toContain('  return\n  x')
  })

  it('foldStyleComments 保留 ${} 插值（只对文本段折叠）', () => {
    const code = 'const STYLE = `:host {  width: ${  w  }px;\n\n  color: red }`'
    const out = foldStyleComments(code)
    expect(out).toContain('${  w  }')
    expect(out).toContain('width: ${  w  }px;')
    expect(out).toContain('color: red')
    expect(out).not.toContain(';\n\n')
  })

  it('无空白可折叠时原样返回（同一引用）', () => {
    const code = 'const STYLE = `:host{color:red}`'
    expect(foldStyleComments(code)).toBe(code)
  })
})
