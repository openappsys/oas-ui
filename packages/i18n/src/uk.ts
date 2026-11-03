/**
 * tree-shakable 单包入口：`import uk from '@oas-ui/i18n/uk'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(uk)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { uk as ukMessages } from './locales/uk.js'
import type { Locale } from './types.js'

export const uk: Locale = { name: 'uk', messages: ukMessages }
export default uk
