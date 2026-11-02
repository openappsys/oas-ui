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
/** zh-CN 的宽松视图（`as const` 字面量类型不便按动态 key 索引） */
const zhBase: Record<string, string> = zhCN

/** 提取插值占位符 token 序列（`{name}` → name），保留重复与顺序无关的稳定排序 */
const tokensOf = (s: string): string[] => (s.match(/\{\w+\}/g) ?? []).map((m) => m.slice(1, -1)).sort()

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

  it('占位符提取器本身可用（守卫不是恒真断言）', () => {
    expect(tokensOf('第 {current} / {total} 步')).toEqual(['current', 'total'])
    // 重复 token 也计入（数量不符同样要报错）
    expect(tokensOf('{a} · {b} · {a}')).toEqual(['a', 'a', 'b'])
    expect(tokensOf('没有占位符')).toEqual([])
    expect(tokensOf('{count} 条未读通知')).toEqual(['count'])
    // 至少要有带占位符的 key，否则下面的全量比对无意义
    expect(zhKeys.filter((k) => tokensOf(zhBase[k]!).length > 0).length).toBeGreaterThan(20)
  })

  it('每个 key 的占位符 token 序列与 zh-CN 完全一致（8 语言全检，缺/多/改名/数量不符都报错）', () => {
    for (const name of packNames) {
      const pack = packs[name]!
      for (const key of zhKeys) {
        const zhTokens = tokensOf(zhBase[key]!)
        const tokens = tokensOf(pack[key]!)
        expect(tokens, `${name}.${key} 占位符 [${tokens.join(', ')}] 应与 zh-CN [${zhTokens.join(', ')}] 一致`).toEqual(
          zhTokens,
        )
      }
    }
  })

  it('ar 语言包标注 dir: rtl（RTL 书写方向）', () => {
    expect(arEntry.dir).toBe('rtl')
  })
})
