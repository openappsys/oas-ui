/**
 * tree-shakable 单包入口：`import fa from '@oas-ui/i18n/fa'`。
 * 默认导出完整 Locale（{ name, messages, dir: 'rtl' }），可直接 `setLocale(fa)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { fa as faMessages } from './locales/fa.js'
import type { Locale } from './types.js'

export const fa: Locale = { name: 'fa', messages: faMessages, dir: 'rtl' }
export default fa
