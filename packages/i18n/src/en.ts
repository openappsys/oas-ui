/**
 * tree-shakable 单包入口：`import en from '@oas-ui/i18n/en'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(en)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { en as enMessages } from './locales/en.js'
import type { Locale } from './types.js'

export const en: Locale = { name: 'en', messages: enMessages }
export default en
