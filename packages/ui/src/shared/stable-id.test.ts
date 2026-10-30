import { describe, it, expect } from 'vitest'
import { stableHash36 } from './stable-id.js'

describe('stableHash36', () => {
  it('同输入恒等；不同输入不同输出', () => {
    expect(stableHash36('abc')).toBe(stableHash36('abc'))
    expect(stableHash36('abc')).not.toBe(stableHash36('abd'))
  })

  it('恒为非空 base36（字母数字，可安全用于 id 片段）', () => {
    for (const seed of ['', 'a', '中文', 'oas-picker-columns', '\u0000x']) {
      const out = stableHash36(seed)
      expect(out.length).toBeGreaterThan(0)
      expect(out).toMatch(/^[0-9a-z]+$/)
    }
  })

  it('顺序敏感（拼接seed的边界不混淆）', () => {
    expect(stableHash36('a\u0000bc')).not.toBe(stableHash36('ab\u0000c'))
  })
})
