/**
 * 资源池（Pro helper 子路径，进程内共享状态可选）：
 * - 按需引入：`@oas-ui/ui/data/resource/pool`（`import { ResourcePool, getSharedResourcePool, createResourcePool }`）；
 *   运行闭包不含 oas-resource 组件本体 / core / i18n（类型仅 `import type`，构建期擦除）。
 * - 纯数据结构：无 customElements、无 i18n、无 CSS、无模块级副作用
 *   （共享状态的 globalThis 挂载发生在 getSharedResourcePool() 首次调用时，非 import 时）。
 * - 双通道（2026-11 Z4 小批）：想跨模块/跨视图共享登记状态的用 `getSharedResourcePool()`
 *   （globalThis 单例，多副本互见，默认推荐）；想多租户/多画布互不干扰的用 `createResourcePool()`
 *   （独立实例，私有状态，不触碰 globalThis）。两态都支持，默认行为不变。
 */

import type { ResourceItem } from '../oas-resource.js'

/**
 * 共享状态（纯对象，挂 globalThis Symbol.for——照 i18n registry 的 STATE_KEY 模式）：
 * - `items`：id 去重的资源登记表（数组，保登记序）
 * - `version`：每次**生效变更** +1（no-op 不抬版本，避免宿主轮询假阳性）
 * 状态与 API 分离：`ResourcePool` 类只是包在状态上的操作面——多个模块副本（link / 多 bundler
 * 实例）各自得到自己的类与包装对象，但 `getSharedResourcePool()` 永远操作同一份纯对象状态，
 * 写入互见、版本号一致（与 i18n `setLocale` 只换内容的模式同源）。
 */
interface PoolState {
  items: ResourceItem[]
  version: number
}

/** 共享状态的 globalThis 挂载键（Symbol.for 跨副本/多实例解析到同一个 Symbol） */
const POOL_STATE_KEY = Symbol.for('@oas-ui/ui/resource-pool/v1')

/** 读取（必要时初始化）共享状态 */
function getOrCreateState(): PoolState {
  const store = globalThis as unknown as Record<symbol, unknown>
  const existing = store[POOL_STATE_KEY]
  // 纯对象状态判定（结构守卫而非 instanceof——跨副本的类身份不同，状态本身必须可认领）
  if (
    existing !== null &&
    typeof existing === 'object' &&
    Array.isArray((existing as PoolState).items) &&
    typeof (existing as PoolState).version === 'number'
  ) {
    return existing as PoolState
  }
  const state: PoolState = { items: [], version: 0 }
  store[POOL_STATE_KEY] = state
  return state
}

/**
 * 资源池：id 去重的资源登记表，供宿主在多个视图/组件间共享资源集合。
 *
 * - `constructor(state?)`：缺省新建私有状态；传入共享状态（见 `getSharedResourcePool`）则
 *   本实例的所有操作都作用于该状态。
 * - `register`：按 id 增量登记（同 id 覆盖；同一对象引用重复登记不算变更）；
 *   与 oas-resource 清洗层同口径：缺 id / 空 id / 缺名 / 非对象条目跳过。
 * - `remove`：按 id 移除（不存在的 id 静默跳过）。
 * - `version`：每次**生效变更**（register 覆盖或新增、remove 实际移除、clear 非空池）+1。
 */
export class ResourcePool {
  #state: PoolState

  constructor(state: PoolState = { items: [], version: 0 }) {
    this.#state = state
  }

  /** 批量登记资源（同 id 覆盖；非法条目跳过；有生效变更时 version +1） */
  register(resources: ResourceItem[]): void {
    let changed = false
    for (const item of resources ?? []) {
      if (typeof item !== 'object' || item === null) continue
      if (typeof item.id !== 'string' || item.id === '') continue
      if (typeof item.name !== 'string' || item.name === '') continue
      const existing = this.#state.items.find((r) => r.id === item.id)
      if (existing === item) continue // 同一引用：no-op
      if (existing !== undefined) {
        this.#state.items[this.#state.items.indexOf(existing)] = item
      } else {
        this.#state.items.push(item)
      }
      changed = true
    }
    if (changed) this.#state.version += 1
  }

  /** 按 id 批量移除（不存在的 id 跳过；有实际移除时 version +1） */
  remove(ids: string[]): void {
    let changed = false
    for (const id of ids ?? []) {
      if (typeof id !== 'string') continue
      const idx = this.#state.items.findIndex((r) => r.id === id)
      if (idx === -1) continue
      this.#state.items.splice(idx, 1)
      changed = true
    }
    if (changed) this.#state.version += 1
  }

  /** 按 id 取资源（缺省/非字符串 id 返回 undefined） */
  get(id: string): ResourceItem | undefined {
    return typeof id === 'string' ? this.#state.items.find((r) => r.id === id) : undefined
  }

  /** 全量资源快照（按登记顺序；返回新数组，修改不影响池） */
  list(): ResourceItem[] {
    return [...this.#state.items]
  }

  /** 清空（非空池时 version +1；空池 clear 不抬版本） */
  clear(): void {
    if (this.#state.items.length === 0) return
    this.#state.items.length = 0
    this.#state.version += 1
  }

  /** 版本号：每次生效变更 +1（初值 0），供宿主轮询/比较 */
  get version(): number {
    return this.#state.version
  }
}

/**
 * 共享资源池：状态挂载在 `globalThis[Symbol.for('@oas-ui/ui/resource-pool/v1')]`（纯对象）。
 * 每次调用返回**当前副本**的 `ResourcePool` 包装，但所有实例操作同一份状态——
 * 多副本共存（link / 多 bundler 实例）时写入互见、版本号一致。
 */
export function getSharedResourcePool(): ResourcePool {
  return new ResourcePool(getOrCreateState())
}

/**
 * 独立资源池实例（实例隔离通道）：返回持有**全新私有状态**的 `ResourcePool`，
 * 与共享单例（`getSharedResourcePool`）及彼此完全隔离，且不触碰 globalThis——
 * 适合多租户 / 多画布各自维护资源集合、或测试需要状态隔离的场景。
 * 需要跨模块/跨视图共享登记状态时用 `getSharedResourcePool()`（默认推荐）。
 */
export function createResourcePool(): ResourcePool {
  return new ResourcePool()
}
