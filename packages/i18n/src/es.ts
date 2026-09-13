/**
 * tree-shakable 单包入口：`import es from '@oas-ui/i18n/es'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(es)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { es as esMessages } from './locales/es.js'
import type { Locale } from './types.js'

export const es: Locale = { name: 'es', messages: esMessages }
export default es
