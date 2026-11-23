/**
 * `registerSchemaWidget` —— 自定义 widget 注册（组件层，碰内核注册表）。
 *
 * 语义（设计稿冻结）：
 * - 内部**必须**调 `registerFormControl`（form 内核值收集的唯一扩展口），否则该控件的值
 *   永远收集不到——本实现无条件调用，调用方无需自己再注册；
 * - **硬约束：非自定义元素 widget（Vue / React 组件、原生 div 等）无法参与值收集**——
 *   form 内核按元素 tag 匹配读值通道，组件框架产出的宿主元素既没有 `name` 语义也没有
 *   读值通道。tag 不含连字符时注册即 devWarn 并拒绝；
 * - schema 里只写**注册名**（`uiSchema.widget: 'rich-text'`），不写 tag；
 * - 注册发生在编译前：编译期按注册表解析 widget，未注册名回落默认映射并 devWarn。
 */
import { devWarn } from '../../shared/dev-warn.js'
import { registerFormControl } from '../form/index.js'
import { deleteCustomWidget, setCustomWidget, type SchemaWidgetIO } from './compiler/custom-widgets.js'

export type { SchemaWidgetIO } from './compiler/custom-widgets.js'

const NAME_PATTERN = /^[A-Za-z][\w-]*$/

/**
 * 注册自定义 widget。返回注销函数（同时撤销内核登记，恢复该 tag 未注册状态）。
 */
export function registerSchemaWidget(name: string, tag: string, options: SchemaWidgetIO = {}): () => void {
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    devWarn(`[oas-schema-form] registerSchemaWidget 的注册名非法："${String(name)}"（字母开头，可含数字 / 连字符）`)
    return () => {}
  }
  const normalized = typeof tag === 'string' ? tag.trim().toLowerCase() : ''
  // 自定义元素必须含连字符；组件框架产出的宿主元素 / 原生标签无法走 form 内核的 tag 读值通道
  if (!/^[a-z][a-z0-9]*-[a-z0-9-]+$/.test(normalized)) {
    devWarn(
      `[oas-schema-form] registerSchemaWidget("${name}") 的 tag "${String(tag)}" 不是自定义元素（需含连字符）：` +
        '非自定义元素 widget 无法参与值收集（硬约束），本次注册已拒绝',
    )
    return () => {}
  }
  const unregisterControl = registerFormControl(normalized, options.reader, options.writer)
  setCustomWidget(name, { tag: normalized, ...options })
  return () => {
    unregisterControl()
    deleteCustomWidget(name)
  }
}
