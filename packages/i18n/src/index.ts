/**
 * @oas-ui/i18n 主入口 —— registry + 默认文案切片全量注册 + 类型。
 *
 * 主入口保持既有公共行为：默认内置 zh-CN 全量文案。
 * ⚠️ 注册必须走**值导入 + 显式调用**（不能只写副作用 import）：
 * 打包器会按 `sideEffects` 判定整模块是否保留，副作用 import 有被摇掉的风险
 * （2026-10-31 实测：副作用 import 在打包消费下导致整个入口文案丢失、渲染 raw key）。
 *
 * 语言包按需单独引入（tree-shakable）：
 *   import zhCN from '@oas-ui/i18n/zh-CN'
 *   import en from '@oas-ui/i18n/en'
 *
 * 组件按需消费（不引入整包时）：
 *   import { registerDefaultMessages } from '@oas-ui/i18n/registry'
 *   import { dataMessages } from '@oas-ui/i18n/slices/data'
 *   registerDefaultMessages(dataMessages)
 */
import { registerDefaultMessages } from './registry.js'
import { basicMessages } from './slices/basic.js'
import { conversationMessages } from './slices/conversation.js'
import { dataMessages } from './slices/data.js'
import { feedbackMessages } from './slices/feedback.js'
import { formMessages } from './slices/form.js'
import { frameworkMessages } from './slices/framework.js'
import { layoutMessages } from './slices/layout.js'
import { navigationMessages } from './slices/navigation.js'
import { workbenchMessages } from './slices/workbench.js'

registerDefaultMessages(basicMessages)
registerDefaultMessages(conversationMessages)
registerDefaultMessages(dataMessages)
registerDefaultMessages(feedbackMessages)
registerDefaultMessages(formMessages)
registerDefaultMessages(frameworkMessages)
registerDefaultMessages(layoutMessages)
registerDefaultMessages(navigationMessages)
registerDefaultMessages(workbenchMessages)

export { canonicalizeLocale, normalizeLocaleTag } from './locale-name.js'
export {
  registerDefaultMessages,
  registerLocale,
  setLocale,
  getLocale,
  getLocaleName,
  getDirection,
  loadLocale,
  t,
  onLocaleChange,
} from './registry.js'
export type { Locale, LocaleKey, LocaleMessages, LocaleName, LocaleParams } from './types.js'
