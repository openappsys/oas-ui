/**
 * tree-shakable 单包入口：`import zhCN from '@oas-ui/i18n/zh-CN'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(zhCN)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { zhCN as zhCNMessages } from './locales/zh-CN.js'
import type { Locale } from './types.js'

export const zhCN: Locale = { name: 'zh-CN', messages: zhCNMessages }
export default zhCN
