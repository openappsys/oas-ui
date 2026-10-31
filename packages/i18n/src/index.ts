/**
 * @oas-ui/i18n 主入口 —— registry + 默认文案切片全量注册 + 类型。
 *
 * 主入口保持既有公共行为：默认内置 zh-CN 全量文案（9 个家族切片经
 * `./slices/all-register.js` 逐个注册）。
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
import './slices/all-register.js'
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
