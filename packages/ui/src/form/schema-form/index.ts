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
// 题型控件（matrix / rank）：KNOWN_WIDGETS 已登记，widget 解析可命中——但元素注册必须在入口
// 一并引入，否则只引本子路径的宿主拿到的是「未升级标签」，控件静默不渲染（值也收集不到）
import '../matrix/index.js'
import '../rank/index.js'
import { OASSchemaForm } from './oas-schema-form.js'

if (!customElements.get('oas-schema-form')) {
  customElements.define('oas-schema-form', OASSchemaForm)
}

export { OASSchemaForm }
export { registerSchemaWidget } from './registry.js'
export type { SchemaWidgetIO } from './registry.js'
// 表达式轨公开 API：宿主函数注册 + 编译器类型（子路径入口 `@oas-ui/ui/form/schema-form/expr` 同源）
export { registerExprFunction } from './expr/index.js'
export type { ExprCompileResult, ExprFunction, ExprProgram } from './expr/index.js'
export type { JsonSchema, PlanNode } from './compiler/index.js'
