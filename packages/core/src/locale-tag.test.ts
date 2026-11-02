import { describe, expect, it } from 'vitest'
import { normalizeLocaleTag, stripLocaleExtensions } from './locale-tag.js'

describe('normalizeLocaleTag（BCP 47 大小写/分隔符归一）', () => {
  it('语言小写、文字首字母大写、地区大写', () => {
    expect(normalizeLocaleTag('ZH_hant_tw')).toBe('zh-Hant-TW')
    expect(normalizeLocaleTag('pt_br')).toBe('pt-BR')
    expect(normalizeLocaleTag('EN-us')).toBe('en-US')
  })

  it('保留变体/扩展子标签为小写', () => {
    expect(normalizeLocaleTag('en-u-ca-gregory')).toBe('en-u-ca-gregory')
    expect(normalizeLocaleTag('ca-ES-valencia')).toBe('ca-ES-valencia')
  })

  it('私有段（x-…，含独立成标签）全部小写', () => {
    expect(normalizeLocaleTag('x-ABCD-US')).toBe('x-abcd-us')
    expect(normalizeLocaleTag('en-X-ABCD-US')).toBe('en-x-abcd-us')
  })

  it('数字地区与三字母地区正确大写', () => {
    expect(normalizeLocaleTag('es-419')).toBe('es-419')
    expect(normalizeLocaleTag('zh-hans-cn')).toBe('zh-Hans-CN')
  })

  it('空串/空白安全返回', () => {
    expect(normalizeLocaleTag('')).toBe('')
    expect(normalizeLocaleTag('   ')).toBe('')
  })

  it('stripLocaleExtensions：普通扩展剥离、私有段（含 x- 开头）不剥离', () => {
    expect(stripLocaleExtensions('zh-Hant-u-nu-latn')).toBe('zh-Hant')
    expect(stripLocaleExtensions('en-US-u-ca-gregory')).toBe('en-US')
    expect(stripLocaleExtensions('en-x-foo')).toBe('en-x-foo')
    expect(stripLocaleExtensions('x-u-foo')).toBe('x-u-foo')
    expect(stripLocaleExtensions('x-foo-u')).toBe('x-foo-u')
  })
})
