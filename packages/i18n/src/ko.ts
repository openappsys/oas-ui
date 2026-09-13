/**
 * tree-shakable 单包入口：`import ko from '@oas-ui/i18n/ko'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(ko)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { ko as koMessages } from './locales/ko.js'
import type { Locale } from './types.js'

export const ko: Locale = { name: 'ko', messages: koMessages }
export default ko
