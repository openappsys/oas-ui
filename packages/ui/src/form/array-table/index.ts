import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
// 行内控件由 schema-form 渲染，但独立使用本子路径时也保证 form / form-item 已定义（值收集与单元格壳）
import '../form/index.js'
import '../form-item/index.js'
import { OASArrayTable } from './oas-array-table.js'

if (!customElements.get('oas-array-table')) {
  customElements.define('oas-array-table', OASArrayTable)
}

export { OASArrayTable }
export type { ArrayTableColumn } from './oas-array-table.js'
