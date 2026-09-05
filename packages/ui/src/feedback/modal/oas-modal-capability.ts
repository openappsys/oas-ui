import type { ReactiveController } from '@oas-ui/core'

/**
 * modal 能力注册表（能力级按需分包的基础设施，镜像 table 的 oas-table-capability）。
 *
 * 能力包（如 feedback/modal/prompt）各自 import 本模块并 `registerModalCapability`
 * 自注册（静态 import 即注册、零运行时开销）；未 import 的能力不产生任何代码路径。
 * OASModal 构造时遍历注册表，把已注册能力 factory 逐个 addController 注入宿主元素，
 * 命令式层（modal.ts）经宿主元素按名取回 controller 委托（如 prompt 能力包的 openPrompt）。
 *
 * 注册在模块求值期完成，早于任何 <oas-modal> 实例构造（ESM 静态 import 提升），
 * 因此宿主「import 即具备该能力」；仅 import 核心入口（feedback/modal）则能力缺省——
 * 缺省能力的调用（modal.prompt）静默失效并触发 dev 告警（见 modal.ts warnPromptNotImported）。
 */
export type ModalCapabilityFactory = (host: unknown) => ReactiveController

/** 能力注册表：name -> 工厂（同名幂等，重复 import 不重复生效） */
const capabilityRegistry = new Map<string, ModalCapabilityFactory>()

/** 注册一个 modal 能力包（重复注册同名能力被幂等忽略） */
export function registerModalCapability(name: string, factory: ModalCapabilityFactory): void {
  if (capabilityRegistry.has(name)) return
  capabilityRegistry.set(name, factory)
}

/** 当前已注册能力快照（OASModal 构造时遍历注入） */
export function registeredModalCapabilities(): Array<{ name: string; factory: ModalCapabilityFactory }> {
  return [...capabilityRegistry.entries()].map(([name, factory]) => ({ name, factory }))
}

/** 是否已注册某能力（命令式层据此判断可委托/静默失效） */
export function hasModalCapability(name: string): boolean {
  return capabilityRegistry.has(name)
}
