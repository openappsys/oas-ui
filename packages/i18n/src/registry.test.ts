import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  registerDefaultMessages,
  registerLocale,
  setLocale,
  getLocale,
  getLocaleName,
  getDirection,
  loadLocale,
  t,
  onLocaleChange,
} from './index.js'
import type { LocaleMessages } from './types.js'
import { zhCN } from './locales/zh-CN.js'
import { en } from './locales/en.js'
import arLocale from './ar.js'
import zhHant from './zh-Hant.js'
import ptBR from './pt-BR.js'
import { canonicalizeLocale } from './locale-name.js'
import { getLocaleTranslator } from '@oas-ui/core'
import { basicMessages } from './slices/basic.js'
import { workbenchMessages } from './slices/workbench.js'

// setLocale 接受完整 Locale 对象（name + messages），或已注册的名字
const enLocale = { name: 'en', messages: en }

/** 读共享 registry 状态（globalThis 单例；STATE_KEY 见 registry.ts） */
function sharedState(): { defaultMessages: LocaleMessages } {
  const store = globalThis as unknown as { [key: symbol]: unknown }
  const state = store[Symbol.for('@oas-ui/i18n/registry/v2')] as { defaultMessages: LocaleMessages } | undefined
  expect(state, '共享 registry 状态应已挂载').toBeDefined()
  return state!
}

describe('locale registry', () => {
  beforeEach(() => {
    // 恢复默认 zh-CN，避免用例间状态串扰
    setLocale('zh-CN')
  })

  it('默认内置 zh-CN（主入口经切片全量注册）', () => {
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

  it('canonicalizeLocale：BCP 47 大小写/分隔符 + 内置别名归一', () => {
    expect(canonicalizeLocale('en_US')).toBe('en')
    expect(canonicalizeLocale('EN-us')).toBe('en')
    expect(canonicalizeLocale('pt')).toBe('pt-BR')
    expect(canonicalizeLocale('pt_br')).toBe('pt-BR')
    expect(canonicalizeLocale('zh-Hans')).toBe('zh-CN')
    expect(canonicalizeLocale('zh_CN')).toBe('zh-CN')
    expect(canonicalizeLocale('zh-TW')).toBe('zh-Hant')
    expect(canonicalizeLocale('zh-hk')).toBe('zh-Hant')
    expect(canonicalizeLocale('zh-Hant-MO')).toBe('zh-Hant')
    expect(canonicalizeLocale('zh-Hans-MY')).toBe('zh-CN')
    // 未映射的变体保持归一后的原值：不把欧洲葡语误当巴西葡语，也不吞掉私有伪语言
    expect(canonicalizeLocale('pt-PT')).toBe('pt-PT')
    expect(canonicalizeLocale('en-XA')).toBe('en-XA')
    // BCP 47 扩展段可剥离后回落到基础 pack；私有段不剥离（不吞自定义伪语言）
    expect(canonicalizeLocale('en-US-u-ca-gregory')).toBe('en')
    expect(canonicalizeLocale('zh-Hant-u-nu-latn')).toBe('zh-Hant')
    expect(canonicalizeLocale('en-x-foo')).toBe('en-x-foo')
    expect(canonicalizeLocale('hi-IN')).toBe('hi')
    expect(canonicalizeLocale('th_TH')).toBe('th')
    expect(canonicalizeLocale('uk-UA')).toBe('uk')
    expect(canonicalizeLocale('he-IL')).toBe('he')
    expect(canonicalizeLocale('iw')).toBe('he')
    expect(canonicalizeLocale('fa-IR')).toBe('fa')
  })

  it('别名可切换已注册语言包：pt → pt-BR、zh-TW → zh-Hant', () => {
    registerLocale(ptBR)
    expect(setLocale('pt')).toBe('pt-BR')
    expect(t('empty.noData')).toBe('Sem dados')

    registerLocale(zhHant)
    expect(setLocale('zh-TW')).toBe('zh-Hant')
    expect(t('empty.noData')).toBe('暫無資料')
    // 别名与 canonical 共享同一翻译器（config-provider locale="zh-TW" 也能就近命中）
    expect(getLocaleTranslator('zh-TW')).not.toBeNull()
    expect(getLocaleTranslator('zh_Hant')?.('empty.noData')).toBe('暫無資料')
  })

  it('loadLocale 接受别名并加载 canonical 语言包', async () => {
    const tw = await loadLocale('zh-TW')
    expect(tw.name).toBe('zh-Hant')
    expect(tw.messages['empty.noData']).toBe('暫無資料')
    const br = await loadLocale('pt')
    expect(br.name).toBe('pt-BR')
    expect(br.messages['empty.noData']).toBe('Sem dados')
  })

  it('loadLocale 加载 P1 语言包（hi / th / uk / he / fa）', async () => {
    for (const code of ['hi', 'th', 'uk', 'he', 'fa'] as const) {
      const pack = await loadLocale(code)
      expect(pack.name).toBe(code)
      expect(Object.keys(pack.messages)).toHaveLength(Object.keys(zhCN).length)
    }
  })

  it('getDirection 接受地区变体（ar-EG → ar，rtl）', async () => {
    await loadLocale('ar')
    expect(getDirection('ar-EG')).toBe('rtl')
    expect(getDirection('ar_SA')).toBe('rtl')
    expect(getDirection('en-US')).toBe('ltr')
    await loadLocale('he')
    expect(getDirection('he-IL')).toBe('rtl')
    await loadLocale('fa')
    expect(getDirection('fa-IR')).toBe('rtl')
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

  it('getDirection：默认 ltr；RTL 语言包（ar）标注 rtl', () => {
    expect(getDirection()).toBe('ltr')
    registerLocale(arLocale)
    expect(getDirection('ar')).toBe('rtl')
    setLocale('ar')
    expect(getDirection()).toBe('rtl')
  })

  it('loadLocale：按需动态加载内置语言包并注册；未知名字报错', async () => {
    const ja = await loadLocale('ja')
    expect(ja.name).toBe('ja')
    expect(typeof ja.messages['modal.ok']).toBe('string')
    expect(ja.messages['modal.ok']!.length).toBeGreaterThan(0)
    setLocale('ja')
    expect(t('modal.ok')).toBe(ja.messages['modal.ok'])
    // 已注册后再取直接返回（不重复加载）
    expect(await loadLocale('ja')).toBe(ja)
    await expect(loadLocale('xx' as never)).rejects.toThrow()
  })

  it('重复模块副本共享 locale 状态（globalThis 单例）', async () => {
    setLocale(enLocale)
    vi.resetModules()
    const again = await import('./registry.js')
    expect(again.getLocaleName(), '新副本应读到旧副本切换的 locale').toBe('en')
    expect(again.t('modal.ok')).toBe('OK')
    again.setLocale('zh-CN')
    expect(getLocaleName(), '旧副本应读到新副本的切换').toBe('zh-CN')
    expect(t('modal.ok')).toBe('确定')
  })

  it('registerDefaultMessages 幂等：重复注册不改变默认文案', () => {
    const snapshot = { ...getLocale().messages }
    registerDefaultMessages(basicMessages)
    registerDefaultMessages(basicMessages)
    expect(getLocale().messages).toEqual(snapshot)
    expect(t('badge.notifications')).toBe('{count} 条未读通知')
  })

  it('跨副本可见性：切片注册写在共享 defaultMessages 上，裸 registry 副本也能读到', async () => {
    vi.resetModules()
    // 新副本只 import registry（不 import 切片/主入口）——defaultLocale.messages 指向共享对象
    const bare = await import('./registry.js')
    expect(bare.t('statusbar.label'), '裸副本应读到此前副本注册的 workbench 切片文案').toBe('状态栏')
    // 裸副本再注册同一切片：写进同一共享对象，幂等无害
    const { workbenchMessages: wb } = await import('./slices/workbench.js')
    bare.registerDefaultMessages(wb)
    expect(bare.t('inspector.label')).toBe('属性面板')
    expect(t('inspector.label'), '旧副本同样读到新副本的注册').toBe('属性面板')
  })

  it("loadLocale('zh-CN')：默认对象在册 → 整包合并进共享 defaultMessages；用户覆盖 → 用户注册优先", async () => {
    const defaultView = getLocale()
    const saved = defaultView.messages
    const state = sharedState()
    expect(state.defaultMessages, '共享 defaultMessages 与默认 locale.messages 应同一对象').toBe(saved)
    // 模拟「切片尚未注册」的裸环境：清空共享默认文案（defaultLocale.messages 与 state 同步换空）
    defaultView.messages = {} as LocaleMessages
    state.defaultMessages = defaultView.messages
    try {
      expect(t('modal.ok'), '空默认文案 → raw key 回退').toBe('modal.ok')
      const locale = await loadLocale('zh-CN')
      expect(locale, '返回默认 locale 对象本身（不得换对象，否则切片注册写孤儿对象）').toBe(defaultView)
      expect(t('modal.ok'), '整包已合并回共享默认文案').toBe('确定')
      expect(t('timePicker.now'), '死键（不在任何切片）经整包装载后可解析').toBe('此刻')
    } finally {
      defaultView.messages = saved
      state.defaultMessages = saved
    }
    // 用户已 registerLocale 覆盖同名 zh-CN → 按用户注册优先：直接返回用户对象，不装载整包
    const userMessages = { ...zhCN, 'modal.ok': '自定义确定' }
    registerLocale({ name: 'zh-CN', messages: userMessages })
    setLocale('zh-CN')
    const user = await loadLocale('zh-CN')
    expect(user.messages).toBe(userMessages)
    expect(t('modal.ok')).toBe('自定义确定')
    // 还原注册表（此后 map 里的 zh-CN 是基准包对象，非默认 locale 引用，行为等价）
    registerLocale({ name: 'zh-CN', messages: zhCN })
    setLocale('zh-CN')
    expect(t('modal.ok')).toBe('确定')
  })

  it('用户 registerLocale(zh-CN) 优先于切片：t() 走用户对象，后续切片注册不覆盖', () => {
    const userMessages = { ...zhCN, 'modal.ok': '自定义文案' }
    registerLocale({ name: 'zh-CN', messages: userMessages })
    setLocale('zh-CN')
    // 即便切片在此之后再注册，也不影响用户对象的生效结果
    registerDefaultMessages(workbenchMessages)
    expect(t('modal.ok'), '用户覆盖的 key 不被切片注册覆盖').toBe('自定义文案')
    expect(t('empty.noData'), '其余 key 沿用用户对象').toBe('暂无数据')
    expect(t('statusbar.label'), '切片 key 在用户对象里同样可解析').toBe('状态栏')
    // 还原：以完整基准包重新注册，避免污染后续用例
    registerLocale({ name: 'zh-CN', messages: zhCN })
    setLocale('zh-CN')
    expect(t('modal.ok')).toBe('确定')
  })
})
