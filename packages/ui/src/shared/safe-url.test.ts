import { describe, it, expect } from 'vitest'
import { isSafeUrl, safeUrl } from './safe-url.js'

describe('safeUrl', () => {
  it('保留 http/https/mailto/tel 与相对地址', () => {
    expect(safeUrl('https://example.com/a?x=1')).toBe('https://example.com/a?x=1')
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeUrl('tel:+8610000')).toBe('tel:+8610000')
    expect(safeUrl('/docs/a')).toBe('/docs/a')
    expect(safeUrl('./a')).toBe('./a')
    expect(safeUrl('../a')).toBe('../a')
    expect(safeUrl('#anchor')).toBe('#anchor')
    expect(safeUrl('docs/a')).toBe('docs/a')
  })

  it('拦截可执行/内联文档协议', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('')
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(safeUrl('vbscript:msgbox(1)')).toBe('')
    expect(safeUrl('  javascript:alert(1)  ')).toBe('')
  })

  it('空值回落空串', () => {
    expect(safeUrl('')).toBe('')
    expect(safeUrl(null)).toBe('')
    expect(safeUrl(undefined)).toBe('')
  })

  it('isSafeUrl 与 safeUrl 判定一致', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
    expect(isSafeUrl('/a')).toBe(true)
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('')).toBe(false)
  })
})
