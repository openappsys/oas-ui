/**
 * config-provider 上下文机制 —— core 提供"就近读取 + 变更通知"，不依赖 ui 组件。
 *
 * 约定：
 * - 组件用 OASElement.injectValue() / t() 读取注入值，内部委托到这里的查找逻辑
 * - 沿 DOM 祖先链（含跨 Shadow DOM 边界）找最近的 <oas-config-provider>
 * - 组件连接时订阅最近 provider 的变更回调（provider 属性变化 → 重跑 update()），断开时退订
 * - <oas-config-provider> 在属性变化时调用 notifyConfigProviders() 通知包裹的组件刷新
 */
export const CONFIG_PROVIDER_TAG = 'oas-config-provider'

/** 沿祖先链（含 Shadow DOM 宿主）找最近的 config-provider，找不到返回 null */
export function findConfigProvider(el: Element): HTMLElement | null {
  let node: Node | null = el.parentNode
  while (node) {
    if (node instanceof ShadowRoot) {
      node = node.host
      continue
    }
    if (node instanceof Element) {
      if (node.tagName.toLowerCase() === CONFIG_PROVIDER_TAG) return node as HTMLElement
      node = node.parentNode
      continue
    }
    node = node.parentNode
  }
  return null
}

const consumers = new WeakMap<HTMLElement, Set<() => void>>()

/** 订阅最近 config-provider 的变更（provider 属性变化时触发），返回取消订阅函数 */
export function subscribeConfigProvider(provider: HTMLElement, cb: () => void): () => void {
  let set = consumers.get(provider)
  if (!set) {
    set = new Set()
    consumers.set(provider, set)
  }
  set.add(cb)
  return () => {
    set.delete(cb)
    if (set.size === 0) consumers.delete(provider)
  }
}

/** config-provider 属性变化时通知其包裹的已订阅组件 */
export function notifyConfigProviders(provider: HTMLElement): void {
  const set = consumers.get(provider)
  if (!set) return
  for (const cb of [...set]) cb()
}
