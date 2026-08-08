import { describe, it, expect, afterEach } from 'vitest'
import { setTranslator, getTranslator, onTranslatorChange } from './translator.js'

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
})
