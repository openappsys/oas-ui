import { describe, it, expect } from 'vitest'
import { stripCssComments, stripStyleComments } from '../../scripts/strip-css-comments.js'

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
