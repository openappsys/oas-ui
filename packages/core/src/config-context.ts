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

/**
 * 读取最近 config-provider 的 `config` JSON 中 `[tag][key]` 的注入值。
 *
 * - 沿祖先链（含 Shadow DOM）找最近的 <oas-config-provider>
 * - 解析其 `config` 属性（JSON：`{"oas-button":{"variant":"outlined"}}`）
 * - 返回 `config[tag][key]`；无 provider / 无 config / 无该键 / 非法 JSON 一律 undefined
 * - 解析结果按「provider 元素 + 属性原文」缓存：config 属性未变化时复用（同值去重）
 * - 非法 JSON 的 dev 告警由 config-provider 组件负责，本 helper 只读不告警
 */
export function readConfigValue<T = string>(
  el: Element,
  tag: string,
  key: string,
): T | undefined {
  const provider = findConfigProvider(el)
  if (!provider) return undefined
  const config = parseProviderConfig(provider)
  if (!config) return undefined
  const entry = config[tag]
  if (entry === null || typeof entry !== 'object') return undefined
  return (entry as Record<string, unknown>)[key] as T
}

/**
 * 就近读取「全局禁用」注入（config-provider 机制），返回元素最终生效的禁用态。
 *
 * 优先级（从高到低）：
 * 1. 元素自身带 `disabled` 属性 → true（显式禁用恒禁，短路）
 * 2. 元素自身带 `disabled-skip` 属性 → false（组件级豁免：注入开启时单个组件保持可用，短路）
 * 3. 最近 config-provider 无 `disabled` 属性 → false（无注入不禁用）
 * 4. 最近 config-provider 的 config JSON 顶层 `disabledExempt` 数组含元素 tag（小写）→ false（整类豁免）
 * 5. 否则 → true（继承全局禁用）
 *
 * 无 provider 时一律返回 false（组件未接入注入时行为不变）。
 * provider 的 disabled/config 变化经 notifyConfigProviders() 通知包裹组件重刷。
 */
export function injectDisabled(el: Element): boolean {
  if (el.hasAttribute('disabled')) return true
  if (el.hasAttribute('disabled-skip')) return false
  const provider = findConfigProvider(el)
  if (!provider) return false
  if (!provider.hasAttribute('disabled')) return false
  const config = parseProviderConfig(provider)
  const exempt = config?.['disabledExempt']
  if (Array.isArray(exempt) && exempt.includes(el.tagName.toLowerCase())) return false
  return true
}

const configCache = new WeakMap<
  HTMLElement,
  { raw: string | null; parsed: Record<string, Record<string, unknown>> | null }
>()

/** 解析 provider 的 config JSON（缓存：属性原文未变化时复用上次解析结果） */
function parseProviderConfig(
  provider: HTMLElement,
): Record<string, Record<string, unknown>> | null {
  const raw = provider.getAttribute('config')
  const hit = configCache.get(provider)
  if (hit && hit.raw === raw) return hit.parsed
  let parsed: Record<string, Record<string, unknown>> | null = null
  if (raw != null && raw !== '') {
    try {
      const v = JSON.parse(raw) as unknown
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        parsed = v as Record<string, Record<string, unknown>>
      }
    } catch {
      parsed = null
    }
  }
  configCache.set(provider, { raw, parsed })
  return parsed
}
