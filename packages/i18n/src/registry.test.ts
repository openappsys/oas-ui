import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerLocale,
  setLocale,
  getLocale,
  getLocaleName,
  t,
  onLocaleChange,
} from './registry.js'
import { zhCN } from './locales/zh-CN.js'
import { en } from './locales/en.js'

// setLocale 接受完整 Locale 对象（name + messages），或已注册的名字
const enLocale = { name: 'en', messages: en }

describe('locale registry', () => {
  beforeEach(() => {
    // 恢复默认 zh-CN，避免用例间状态串扰
    setLocale('zh-CN')
  })

  it('默认内置 zh-CN', () => {
    expect(getLocaleName()).toBe('zh-CN')
    expect(getLocale().name).toBe('zh-CN')
    expect(t('empty.noData')).toBe('暂无数据')
    expect(t('modal.ok')).toBe('确定')
  })

  it('setLocale 传语言包对象自动注册并切换', () => {
    setLocale(enLocale)
    expect(getLocaleName()).toBe('en')
    expect(t('empty.noData')).toBe('No data')
    expect(t('modal.ok')).toBe('OK')
    expect(t('pagination.prev')).toBe('Previous page')
  })

  it('setLocale 按名字切换（需已注册）', () => {
    setLocale(enLocale)
    setLocale('zh-CN')
    expect(getLocaleName()).toBe('zh-CN')
    expect(t('modal.ok')).toBe('确定')
  })

  it('setLocale 未注册的名字抛错', () => {
    expect(() => setLocale('fr-FR')).toThrow()
  })

  it('registerLocale 注册自定义包后可按名切换', () => {
    const custom = {
      name: 'zh-CN-dialect',
      messages: { ...zhCN, 'modal.ok': '好嘞' },
    }
    registerLocale(custom)
    setLocale('zh-CN-dialect')
    expect(t('modal.ok')).toBe('好嘞')
    // 其余 key 沿用基准文案
    expect(t('empty.noData')).toBe('暂无数据')
  })

  it('t 支持 {count} 等插值参数', () => {
    expect(t('treeSelect.andMore', { count: 5 })).toBe('等 5 项')
    expect(t('select.remove', { label: '苹果' })).toBe('移除 苹果')
    expect(t('carousel.dot', { index: 3 })).toBe('第 3 张')
  })

  it('t 未知 key 回退返回 key 本身', () => {
    expect(t('no.such.key' as never)).toBe('no.such.key')
  })

  it('onLocaleChange 订阅切换事件，返回取消订阅函数', () => {
    const names: string[] = []
    const off = onLocaleChange((name) => names.push(name))
    setLocale(enLocale)
    setLocale('zh-CN')
    off()
    setLocale(enLocale)
    expect(names).toEqual(['en', 'zh-CN'])
  })
})
