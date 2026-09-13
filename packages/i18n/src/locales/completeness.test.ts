import { describe, it, expect } from 'vitest'
import { zhCN } from './zh-CN.js'
import { en } from './en.js'
import { ja } from './ja.js'
import { ko } from './ko.js'
import { de } from './de.js'
import { fr } from './fr.js'
import { es } from './es.js'
import { pt } from './pt.js'
import { ru } from './ru.js'
import { ar } from './ar.js'
import arEntry from '../ar.js'

const packs: Record<string, Record<string, string>> = { 'zh-CN': zhCN, en, ja, ko, de, fr, es, pt, ru, ar }
const zhKeys = Object.keys(zhCN)
const packNames = Object.keys(packs)

describe('locale-completeness（语言包完整性）', () => {
  it('所有语言包的 key 集合与 zh-CN 完全一致（缺一/多一都报错）', () => {
    expect(zhKeys.length).toBeGreaterThan(0)
    for (const name of packNames) {
      const pack = packs[name]!
      const keys = Object.keys(pack)
      expect(keys.length, `${name} key 数应与 zh-CN 一致`).toBe(zhKeys.length)
      expect(
        zhKeys.filter((k) => !(k in pack)),
        `${name} 缺失的 key`,
      ).toEqual([])
      expect(
        keys.filter((k) => !(k in zhCN)),
        `${name} 多出的 key`,
      ).toEqual([])
    }
  })

  it('每个 key 在所有语言包中都有非空翻译', () => {
    for (const name of packNames) {
      const pack = packs[name]!
      for (const key of zhKeys) {
        const value = pack[key]
        expect(typeof value === 'string' && value.trim().length > 0, `${name}.${key} 应为非空字符串`).toBe(true)
      }
    }
  })

  it('翻译不只由插值占位符组成（必须含实义文案）', () => {
    const strip = (s: string): string => s.replace(/\{\w+\}/g, '').trim()
    for (const name of packNames) {
      const pack = packs[name]!
      for (const key of zhKeys) expect(strip(pack[key]!), `${name}.${key} 不应只有占位符`).not.toBe('')
    }
  })

  it('ar 语言包标注 dir: rtl（RTL 书写方向）', () => {
    expect(arEntry.dir).toBe('rtl')
  })
})
