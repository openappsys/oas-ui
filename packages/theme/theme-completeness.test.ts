import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, 'index.css'), 'utf8')

function block(selector: string): string {
  const at = css.indexOf(selector)
  expect(at, `主题缺少 ${selector} 段`).toBeGreaterThan(-1)
  const start = css.indexOf('{', at)
  const end = css.indexOf('}', start)
  return start >= 0 && end > start ? css.slice(start + 1, end) : ''
}

describe('主题语义 token 完整性', () => {
  const themes = [
    ['light', ':root'],
    ['dark', '[data-theme="dark"]'],
    ['high-contrast', '[data-theme="high-contrast"]'],
  ] as const
  const required = [
    '--oas-color-bg',
    '--oas-color-bg-elevated',
    '--oas-color-text-primary',
    '--oas-color-text-secondary',
    '--oas-color-border',
  ]

  it.each(themes)('%s 主题覆盖核心语义 token', (_name, selector) => {
    const body = block(selector)
    for (const token of required) {
      expect(body, `${selector} 缺少 ${token}`).toContain(`${token}:`)
    }
  })

  it('焦点环 token 至少定义一次（主题可继承）', () => {
    expect(css).toContain('--oas-focus-ring:')
  })
})
