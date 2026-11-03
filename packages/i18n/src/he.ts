/**
 * tree-shakable 单包入口：`import he from '@oas-ui/i18n/he'`。
 * 默认导出完整 Locale（{ name, messages, dir: 'rtl' }），可直接 `setLocale(he)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { he as heMessages } from './locales/he.js'
import type { Locale } from './types.js'

export const he: Locale = { name: 'he', messages: heMessages, dir: 'rtl' }
export default he
