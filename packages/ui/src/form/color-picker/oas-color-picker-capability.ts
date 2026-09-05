import type { ReactiveController } from '@oas-ui/core'

/**
 * color-picker 能力注册表（能力级按需分包的基础设施，对齐 table 能力包先例）。
 *
 * 能力包（如 form/color-picker/designer）各自 import 本模块并 `registerColorPickerCapability`
 * 自注册（静态 import 即注册、零运行时开销）；未 import 的能力不产生任何代码路径。
 * OASColorPicker 构造时遍历注册表，把已注册能力 factory 逐个 addController 注入宿主。
 *
 * 注册在模块求值期完成，早于任何 <oas-color-picker> 实例构造（ESM 静态 import 提升），
 * 因此宿主「import 即具备该能力」；仅 import 核心入口（form/color-picker）则能力缺省——
 * 2D 色域拖拽 / gradient 多 stop 编辑器等 designer 专属 UI 不渲染、相关配置静默失效。
 */
export type ColorPickerCapabilityFactory = (host: unknown) => ReactiveController

/** 能力注册表：name -> 工厂（同名幂等，重复 import 不重复生效） */
const capabilityRegistry = new Map<string, ColorPickerCapabilityFactory>()

/** 注册一个 color-picker 能力包（重复注册同名能力被幂等忽略） */
export function registerColorPickerCapability(
  name: string,
  factory: ColorPickerCapabilityFactory,
): void {
  if (capabilityRegistry.has(name)) return
  capabilityRegistry.set(name, factory)
}

/** 当前已注册能力快照（OASColorPicker 构造时遍历注入） */
export function registeredColorPickerCapabilities(): Array<{
  name: string
  factory: ColorPickerCapabilityFactory
}> {
  return [...capabilityRegistry.entries()].map(([name, factory]) => ({ name, factory }))
}

/** 是否已注册某能力（宿主可据此跳过/降级） */
export function hasColorPickerCapability(name: string): boolean {
  return capabilityRegistry.has(name)
}
