import type { ReactiveController } from '@oas-ui/core'

/**
 * popover 能力注册表（能力级按需分包的基础设施，模式同 data/table/oas-table-capability）。
 *
 * 能力包（如 feedback/popover/contextmenu）各自 import 本模块并 `registerPopoverCapability`
 * 自注册（静态 import 即注册、零运行时开销）；未 import 的能力不产生任何代码路径。
 * OASPopover 构造时遍历注册表快照注入已注册能力，并经 `onPopoverCapabilityRegistered`
 * 订阅晚加入（连接期订阅、断开退订）——注册可能晚于元素构造（入口求值顺序、打包器重排、
 * 按需「先组件后能力」、动态 import 等场景），晚加入通知保证宿主不错过。
 */
export type PopoverCapabilityFactory = (host: unknown) => ReactiveController

/** 能力注册表：name -> 工厂（同名幂等，重复 import 不重复生效） */
const capabilityRegistry = new Map<string, PopoverCapabilityFactory>()

/** 晚加入监听：能力在宿主构造后才注册时逐个通知（宿主负责幂等 attach + 断开退订防泄漏） */
const lateJoinListeners = new Set<() => void>()

/** 注册一个 popover 能力包（重复注册同名能力被幂等忽略；新注册时通知全部晚加入监听） */
export function registerPopoverCapability(name: string, factory: PopoverCapabilityFactory): void {
  if (capabilityRegistry.has(name)) return
  capabilityRegistry.set(name, factory)
  for (const cb of [...lateJoinListeners]) cb()
}

/**
 * 订阅能力晚加入，返回退订函数。宿主在 connected 期订阅、disconnected 退订；
 * 订阅回调里按 name 去重幂等 attach（构造快照已注入的不重复注入）。
 */
export function onPopoverCapabilityRegistered(cb: () => void): () => void {
  lateJoinListeners.add(cb)
  return () => {
    lateJoinListeners.delete(cb)
  }
}

/** 当前已注册能力快照（OASPopover 构造时遍历注入） */
export function registeredPopoverCapabilities(): Array<{ name: string; factory: PopoverCapabilityFactory }> {
  return [...capabilityRegistry.entries()].map(([name, factory]) => ({ name, factory }))
}

/** 是否已注册某能力（宿主可据此跳过/降级） */
export function hasPopoverCapability(name: string): boolean {
  return capabilityRegistry.has(name)
}
