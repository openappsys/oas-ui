/**
 * tree-shakable 单包入口：`import ar from '@oas-ui/i18n/ar'`。
 * 默认导出完整 Locale（{ name, dir, messages }），可直接 `setLocale(ar)`。
 * 阿拉伯语为 RTL 书写方向，dir: 'rtl' 供宿主设置方向。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { ar as arMessages } from './locales/ar.js'
import type { Locale } from './types.js'

export const ar: Locale = { name: 'ar', dir: 'rtl', messages: arMessages }
export default ar
