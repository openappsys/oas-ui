import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  setTranslator,
  getTranslator,
  onTranslatorChange,
  registerLocaleTranslator,
  getLocaleTranslator,
} from './translator.js'

describe('translator 钩子', () => {
  afterEach(() => {
    setTranslator(null)
  })

  it('默认无 translator', () => {
    expect(getTranslator()).toBeNull()
  })

  it('setTranslator 注入 / getTranslator 读取', () => {
    const fn = (key: string) => `[${key}]`
    setTranslator(fn)
    expect(getTranslator()).toBe(fn)
    setTranslator(null)
    expect(getTranslator()).toBeNull()
  })

  it('onTranslatorChange 在 setTranslator 时触发，返回取消订阅函数', () => {
    let count = 0
    const off = onTranslatorChange(() => count++)
    setTranslator(() => 'x')
    expect(count).toBe(1)
    setTranslator(null)
    expect(count).toBe(2)
    off()
    setTranslator(() => 'y')
    expect(count).toBe(2)
  })

  it('onTranslatorChange 多订阅者依次通知；订阅函数抛错不阻断其余监听者', () => {
    const seen: string[] = []
    const offA = onTranslatorChange(() => seen.push('a'))
    const offB = onTranslatorChange(() => {
      seen.push('b')
      throw new Error('监听者内部错误不应阻断广播')
    })
    const offC = onTranslatorChange(() => seen.push('c'))
    setTranslator(() => 'x')
    expect(seen).toEqual(['a', 'b', 'c'])
    offA()
    offB()
    offC()
  })

  it('同一订阅函数重复注册只通知一次（Set 去重）', () => {
    let count = 0
    const cb = () => count++
    const off1 = onTranslatorChange(cb)
    onTranslatorChange(cb)
    setTranslator(() => 'x')
    expect(count).toBe(1)
    off1()
    setTranslator(null)
    expect(count).toBe(1)
  })

  it('取消订阅函数幂等（重复调用不抛错、不影响其他订阅）', () => {
    let count = 0
    const off = onTranslatorChange(() => count++)
    off()
    off()
    setTranslator(() => 'x')
    expect(count).toBe(0)
  })

  describe('locale 命名翻译器', () => {
    afterEach(() => {
      // localeTranslators 无注销 API（registry 生命周期与页面一致），仅验证读取
    })

    it('registerLocaleTranslator 注册 / getLocaleTranslator 读取 / 未注册返回 null', () => {
      const fn = (key: string) => `ja:${key}`
      registerLocaleTranslator('__test-locale__', fn)
      expect(getLocaleTranslator('__test-locale__')).toBe(fn)
      expect(getLocaleTranslator('__no-such-locale__')).toBeNull()
    })

    it('locale 名按 BCP 47 大小写/分隔符归一（下划线、大小写均可命中）', () => {
      const fn = (key: string) => `tw:${key}`
      registerLocaleTranslator('zh_TW', fn)
      expect(getLocaleTranslator('zh-TW')).toBe(fn)
      expect(getLocaleTranslator('ZH-tw')).toBe(fn)
    })

    it('locale 查询可剥离扩展段（私有段不剥离）', () => {
      const fn = (key: string) => `ext:${key}`
      registerLocaleTranslator('zh-Hant', fn)
      registerLocaleTranslator('en', (key) => `en:${key}`)
      expect(getLocaleTranslator('zh-Hant-u-nu-latn')).toBe(fn)
      // en 已注册：若错误剥离私有段会命中 en；这里必须为 null
      expect(getLocaleTranslator('en-x-foo')).toBeNull()
      expect(getLocaleTranslator('x-u-foo')).toBeNull()
    })

    it('同名重复注册后者覆盖前者', () => {
      registerLocaleTranslator('__test-locale-2__', (key) => `v1:${key}`)
      registerLocaleTranslator('__test-locale-2__', (key) => `v2:${key}`)
      expect(getLocaleTranslator('__test-locale-2__')?.('k')).toBe('v2:k')
    })

    it('locale 翻译器与全局 translator 相互独立（注册 locale 不影响当前 translator）', () => {
      expect(getTranslator()).toBeNull()
      registerLocaleTranslator('__test-locale-3__', (key) => `l:${key}`)
      expect(getTranslator()).toBeNull()
      expect(getLocaleTranslator('__test-locale-3__')?.('k')).toBe('l:k')
    })
  })

  it('重复模块副本共享 translator 状态（globalThis 单例）', async () => {
    setTranslator(() => 'A')
    vi.resetModules()
    const again = await import('./translator.js')
    expect(again.getTranslator()?.('x'), '新副本应读到旧副本注入的 translator').toBe('A')
    again.setTranslator(() => 'B')
    expect(getTranslator()?.('x'), '旧副本应读到新副本的更新').toBe('B')
  })
})
