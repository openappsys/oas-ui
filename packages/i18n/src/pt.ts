/**
 * tree-shakable 单包入口：`import pt from '@oas-ui/i18n/pt'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(pt)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { pt as ptMessages } from './locales/pt.js'
import type { Locale } from './types.js'

export const pt: Locale = { name: 'pt', messages: ptMessages }
export default pt
