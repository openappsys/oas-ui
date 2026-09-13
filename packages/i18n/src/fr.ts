/**
 * tree-shakable 单包入口：`import fr from '@oas-ui/i18n/fr'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(fr)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { fr as frMessages } from './locales/fr.js'
import type { Locale } from './types.js'

export const fr: Locale = { name: 'fr', messages: frMessages }
export default fr
