/**
 * tree-shakable 单包入口：`import ru from '@oas-ui/i18n/ru'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(ru)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { ru as ruMessages } from './locales/ru.js'
import type { Locale } from './types.js'

export const ru: Locale = { name: 'ru', messages: ruMessages }
export default ru
