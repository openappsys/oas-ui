/**
 * tree-shakable 单包入口：`import ptBR from '@oas-ui/i18n/pt-BR'`。
 * 默认导出完整 Locale（{ name, messages }），可直接 `setLocale(ptBR)`。
 * 纯数据模块（无 registry 副作用），未引用时不进产物。
 */
import { ptBR as ptBRMessages } from './locales/pt-BR.js'
import type { Locale } from './types.js'

export const ptBR: Locale = { name: 'pt-BR', messages: ptBRMessages }
export default ptBR
