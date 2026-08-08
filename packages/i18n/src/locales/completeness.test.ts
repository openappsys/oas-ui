import { describe, it, expect } from 'vitest'
import { zhCN } from './zh-CN.js'
import { en } from './en.js'

const zhKeys = Object.keys(zhCN)
const enKeys = Object.keys(en)

describe('locale-completeness（语言包完整性）', () => {
  it('zh-CN 与 en 的 key 集合完全一致（缺一/多一都报错）', () => {
    const missingInEn = zhKeys.filter((k) => !(k in en))
    const extraInEn = enKeys.filter((k) => !(k in zhCN))
    expect(missingInEn).toEqual([])
    expect(extraInEn).toEqual([])
    expect(zhKeys.length).toBeGreaterThan(0)
  })

  it('每个 key 在两包中都有非空翻译', () => {
    for (const key of zhKeys) {
      const z = zhCN[key as keyof typeof zhCN]
      const e = en[key as keyof typeof en]
      expect(typeof z === 'string' && z.trim().length > 0).toBe(true)
      expect(typeof e === 'string' && e.trim().length > 0).toBe(true)
    }
  })

  it('翻译不只由插值占位符组成（必须含实义文案）', () => {
    const strip = (s: string): string => s.replace(/\{\w+\}/g, '').trim()
    for (const key of zhKeys) {
      expect(strip(zhCN[key as keyof typeof zhCN]).length).toBeGreaterThan(0)
      expect(strip(en[key as keyof typeof en]).length).toBeGreaterThan(0)
    }
  })
})
