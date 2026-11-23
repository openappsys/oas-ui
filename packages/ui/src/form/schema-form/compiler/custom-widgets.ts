/**
 * 自定义 widget 注册表（纯数据，无 DOM / 无内核依赖）。
 *
 * 编译层 `resolveWidget` 查该表把 `uiSchema.widget` 的**名字**解析为自定义元素 tag；
 * 组件层 `registerSchemaWidget` 负责把同一 tag 登记进 form 内核的 `FORM_CONTROLS`
 * （值收集的唯一扩展口）。拆成两层是为了让编译层保持纯函数（node 环境可直接单测）。
 */

/** 自定义 widget 的值读写通道（与内核 registerFormControl 同签名） */
export interface SchemaWidgetIO {
  /** 读取表单值（字符串形态；复杂控件返回 JSON 字符串）；返回 null 视为空值 */
  reader?: (el: Element) => string | null
  /** 写回控件的受控值（初始值 / reset / 受控 values 通道） */
  writer?: (el: Element, value: string) => void
}

export interface SchemaWidgetEntry extends SchemaWidgetIO {
  /** 自定义元素 tag（必须含连字符） */
  tag: string
}

const CUSTOM_WIDGETS = new Map<string, SchemaWidgetEntry>()

/** 登记（由 `registerSchemaWidget` 调用；编译层只读） */
export function setCustomWidget(name: string, entry: SchemaWidgetEntry): void {
  CUSTOM_WIDGETS.set(name, entry)
}

/** 注销（返回是否命中） */
export function deleteCustomWidget(name: string): boolean {
  return CUSTOM_WIDGETS.delete(name)
}

/** 名称 → 自定义 widget（未登记返回 null） */
export function getCustomWidget(name: string): SchemaWidgetEntry | null {
  return CUSTOM_WIDGETS.get(name) ?? null
}

/** 已登记的自定义 widget 名（文档 / 调试用） */
export function customWidgetNames(): string[] {
  return [...CUSTOM_WIDGETS.keys()]
}
