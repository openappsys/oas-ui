/**
 * tree-shakable 单包入口：`import zhHant from '@oas-ui/i18n/zh-Hant'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(zhHant)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { zhHant as zhHantMessages } from './locales/zh-Hant.js'
import type { Locale } from './types.js'

export const zhHant: Locale = { name: 'zh-Hant', messages: zhHantMessages }
export default zhHant
