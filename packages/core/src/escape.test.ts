import { describe, it, expect } from 'vitest'
import { escapeText, escapeHtml, escapeAttr } from './escape.js'

describe('@oas-ui/core escape', () => {
  it('escapeHtml 转义全量 `& < > " \'`，& 优先', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;')
    // & 必须先转义，否则已存在的 &amp; 会被二次破坏
    expect(escapeHtml('&amp;')).toBe('&amp;amp;')
  })

  it('escapeText 最小集 `& < >`，不转义引号', () => {
    expect(escapeText(`& < > " '`)).toBe('&amp; &lt; &gt; " \'')
  })

  it('escapeAttr 与 escapeHtml 等值（全量）', () => {
    expect(escapeAttr(`a"b&c`)).toBe('a&quot;b&amp;c')
    expect(escapeAttr).toBe(escapeHtml)
  })

  it('null / undefined 归一为空串', () => {
    expect(escapeText(null)).toBe('')
    expect(escapeHtml(null as unknown as string)).toBe('')
    expect(escapeAttr(undefined)).toBe('')
    expect(escapeHtml(0)).toBe('0')
  })

  it('注入样例被中和（不产生可执行内容）', () => {
    const payload = '</script><img src=x onerror=alert(1)>'
    expect(escapeHtml(payload)).toBe(
      '&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;',
    )
    expect(escapeHtml(payload).includes('<script')).toBe(false)
  })

  it('非字符串输入强转', () => {
    expect(escapeHtml('abc' as unknown as string)).toBe('abc')
    expect(escapeText(123)).toBe('123')
  })
})
