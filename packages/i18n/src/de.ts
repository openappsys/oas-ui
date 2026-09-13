/**
 * tree-shakable 单包入口：`import de from '@oas-ui/i18n/de'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(de)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { de as deMessages } from './locales/de.js'
import type { Locale } from './types.js'

export const de: Locale = { name: 'de', messages: deMessages }
export default de
