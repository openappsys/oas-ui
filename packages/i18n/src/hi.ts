/**
 * tree-shakable 单包入口：`import hi from '@oas-ui/i18n/hi'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(hi)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { hi as hiMessages } from './locales/hi.js'
import type { Locale } from './types.js'

export const hi: Locale = { name: 'hi', messages: hiMessages }
export default hi
