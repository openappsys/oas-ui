import type { ReactiveController } from '@oas-ui/core'

/**
 * popover 能力注册表（能力级按需分包的基础设施，模式同 data/table/oas-table-capability）。
 *
 * 能力包（如 feedback/popover/contextmenu）各自 import 本模块并 `registerPopoverCapability`
 * 自注册（静态 import 即注册、零运行时开销）；未 import 的能力不产生任何代码路径。
 * OASPopover 构造时遍历注册表，把已注册能力 factory 的 controller 逐个 addController 注入宿主。
 *
 * 注册在模块求值期完成，早于任何 <oas-popover> 实例构造（ESM 静态 import 提升），
 * 因此宿主「import 即具备该能力」；仅 import 核心入口（feedback/popover）则全部能力缺省。
 */
export type PopoverCapabilityFactory = (host: unknown) => ReactiveController

/** 能力注册表：name -> 工厂（同名幂等，重复 import 不重复生效） */
const capabilityRegistry = new Map<string, PopoverCapabilityFactory>()

/** 注册一个 popover 能力包（重复注册同名能力被幂等忽略） */
export function registerPopoverCapability(name: string, factory: PopoverCapabilityFactory): void {
  if (capabilityRegistry.has(name)) return
  capabilityRegistry.set(name, factory)
}

/** 当前已注册能力快照（OASPopover 构造时遍历注入） */
export function registeredPopoverCapabilities(): Array<{ name: string; factory: PopoverCapabilityFactory }> {
  return [...capabilityRegistry.entries()].map(([name, factory]) => ({ name, factory }))
}

/** 是否已注册某能力（宿主可据此跳过/降级） */
export function hasPopoverCapability(name: string): boolean {
  return capabilityRegistry.has(name)
}
