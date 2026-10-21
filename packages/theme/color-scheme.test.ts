import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * 主题必须声明 color-scheme：原生控件（checkbox/radio/滚动条/日期选择器）按它选明暗。
 * 缺省时暗色主题下原生控件仍是浅色（白块），宿主只能自己补 `color-scheme: dark`。
 * 源文件与生成物都要断言：只改源未重建时，生成物断言会失败（避免测试在过期产物上通过）。
 */
const source = readFileSync(join(import.meta.dirname, 'index.source.css'), 'utf8')
const css = readFileSync(join(import.meta.dirname, 'index.css'), 'utf8')

function blockOf(text: string, selector: string): string {
  const at = text.indexOf(selector)
  expect(at, `主题缺少 ${selector} 规则`).toBeGreaterThan(-1)
  const start = text.indexOf('{', at)
  const end = text.indexOf('}', start)
  return text.slice(start + 1, end)
}

describe.each([
  ['index.source.css', source],
  ['index.css（生成物）', css],
])('theme color-scheme: %s', (_name, text) => {
  it('基础主题声明 light', () => {
    expect(blockOf(text, ':root')).toMatch(/color-scheme:\s*light/)
  })

  it('暗色主题声明 dark（原生控件不再白块）', () => {
    expect(blockOf(text, '[data-theme="dark"]')).toMatch(/color-scheme:\s*dark/)
    // html.dark 与 data-theme 同一套变量：选择器块包含两者
    expect(text).toMatch(/\[data-theme="dark"\],\s*html\.dark\s*\{[^}]*color-scheme:\s*dark/)
  })

  it('高对比主题（浅底）声明 light', () => {
    expect(blockOf(text, '[data-theme="high-contrast"]')).toMatch(/color-scheme:\s*light/)
  })
})
