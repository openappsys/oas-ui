/**
 * tree-shakable 单包入口：`import th from '@oas-ui/i18n/th'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(th)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { th as thMessages } from './locales/th.js'
import type { Locale } from './types.js'

export const th: Locale = { name: 'th', messages: thMessages }
export default th
