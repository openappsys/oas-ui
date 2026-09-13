import type { zhCN } from './locales/zh-CN.js'

/**
 * locale key 全集的字面量联合类型。
 *
 * 以 zh-CN 语言包（完整全集）为单一事实源推导，新增/删除 key 自动反映到类型上；
 * en 语言包标注为 LocaleMessages，缺 key 会在编译期报错。
 */
export type LocaleKey = keyof typeof zhCN

/** 语言消息表：每个 key 必须恰好有字符串翻译 */
export type LocaleMessages = { [K in LocaleKey]: string }

/** 插值参数，如 t('table.selectRow', { key: '1' }) 里的 {key} */
export type LocaleParams = Record<string, string | number>

/** 可按需加载（子路径 import / loadLocale()）的内置语言包名 */
export type LocaleName = 'zh-CN' | 'en' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt' | 'ru' | 'ar'

/** 语言包：name 唯一标识 + 消息表 + 书写方向（RTL 语言包标注 dir: 'rtl'，缺省 ltr） */
export interface Locale {
  name: string
  messages: LocaleMessages
  dir?: 'ltr' | 'rtl'
}
