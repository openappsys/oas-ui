import type { ReactiveController } from '@oas-ui/core'

/**
 * tabs 能力注册表（能力级按需分包的基础设施）。
 *
 * 能力包（如 navigation/tabs/manager）各自 import 本模块并 `registerTabsCapability` 自注册
 * （静态 import 即注册、零运行时开销）；未 import 的能力不产生任何代码路径。
 * OASTabs 构造时遍历注册表快照注入已注册能力，并经 `onTabsCapabilityRegistered` 订阅
 * 晚加入（连接期订阅、断开退订）——注册可能晚于元素构造（入口求值顺序、打包器重排、
 * 按需「先组件后能力」、动态 import 等场景），晚加入通知保证宿主不错过。
 */
export type TabsCapabilityFactory = (host: unknown) => ReactiveController

/** 能力注册表：name -> 工厂（同名幂等，重复 import 不重复生效） */
const capabilityRegistry = new Map<string, TabsCapabilityFactory>()

/** 晚加入监听：能力在宿主构造后才注册时逐个通知（宿主负责幂等 attach + 断开退订防泄漏） */
const lateJoinListeners = new Set<() => void>()

/** 注册一个 tabs 能力包（重复注册同名能力被幂等忽略；新注册时通知全部晚加入监听） */
export function registerTabsCapability(name: string, factory: TabsCapabilityFactory): void {
  if (capabilityRegistry.has(name)) return
  capabilityRegistry.set(name, factory)
  for (const cb of [...lateJoinListeners]) cb()
}

/**
 * 订阅能力晚加入，返回退订函数。宿主在 connected 期订阅、disconnected 退订；
 * 订阅回调里按 name 去重幂等 attach（构造快照已注入的不重复注入）。
 */
export function onTabsCapabilityRegistered(cb: () => void): () => void {
  lateJoinListeners.add(cb)
  return () => {
    lateJoinListeners.delete(cb)
  }
}

/** 当前已注册能力快照（OASTabs 构造时遍历注入） */
export function registeredTabsCapabilities(): Array<{ name: string; factory: TabsCapabilityFactory }> {
  return [...capabilityRegistry.entries()].map(([name, factory]) => ({ name, factory }))
}

/** 是否已注册某能力（宿主可据此跳过/降级） */
export function hasTabsCapability(name: string): boolean {
  return capabilityRegistry.has(name)
}
