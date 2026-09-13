/**
 * tree-shakable 单包入口：`import ja from '@oas-ui/i18n/ja'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(ja)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { ja as jaMessages } from './locales/ja.js'
import type { Locale } from './types.js'

export const ja: Locale = { name: 'ja', messages: jaMessages }
export default ja
