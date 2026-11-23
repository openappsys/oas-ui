import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
// 默认 widget 映射所需的控件（含 uiSchema 常用覆盖项）：组件独立入口下也必须注册
import '../form/index.js'
import '../form-item/index.js'
import '../form-list/index.js'
import '../input/index.js'
import '../input-number/index.js'
import '../select/index.js'
import '../switch/index.js'
import '../checkbox/index.js'
import '../radio/index.js'
import '../date-picker/index.js'
import '../time-picker/index.js'
import '../textarea/index.js'
import '../slider/index.js'
import '../rate/index.js'
import '../pin-input/index.js'
import { OASSchemaForm } from './oas-schema-form.js'

if (!customElements.get('oas-schema-form')) {
  customElements.define('oas-schema-form', OASSchemaForm)
}

export { OASSchemaForm }
export type { JsonSchema, PlanNode } from './compiler/index.js'
