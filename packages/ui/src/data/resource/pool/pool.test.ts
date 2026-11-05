import { describe, expect, it, vi } from 'vitest'
import { createResourcePool, getSharedResourcePool, ResourcePool } from './index.js'
import type { ResourceItem } from '../oas-resource.js'

const res = (id: string, name = `资源-${id}`): ResourceItem => ({ id, name })

describe('resource/pool ResourcePool', () => {
  it('register：按 id 登记/覆盖；list 按登记序返回快照', () => {
    const pool = new ResourcePool()
    pool.register([res('a'), res('b'), res('a', '覆盖')])
    expect(pool.list().map((r) => r.id)).toEqual(['a', 'b'])
    expect(pool.get('a')?.name).toBe('覆盖')
    // 快照隔离：改返回数组不影响池
    const snapshot = pool.list()
    snapshot.pop()
    expect(pool.list().length).toBe(2)
  })

  it('register：非法条目跳过（缺 id/空 id/缺名/非对象）；同引用 no-op', () => {
    const pool = new ResourcePool()
    const same = res('same')
    pool.register([
      same,
      { name: '缺id' },
      { id: '', name: '空id' },
      { id: 'x' } as ResourceItem,
      null as unknown as ResourceItem,
    ])
    expect(pool.list().map((r) => r.id)).toEqual(['same'])
    const v = pool.version
    pool.register([same])
    expect(pool.version).toBe(v) // 同引用 no-op 不抬版本
    pool.register([res('same', '改名')])
    expect(pool.version).toBe(v + 1) // 同 id 新对象 = 覆盖变更
  })

  it('remove / clear：实际移除才抬版本；get 非字符串 id 安全', () => {
    const pool = new ResourcePool()
    pool.register([res('a'), res('b')])
    const v = pool.version
    pool.remove(['a', 'ghost'])
    expect(pool.get('a')).toBeUndefined()
    expect(pool.get('b')).toBeDefined()
    expect(pool.version).toBe(v + 1)
    pool.remove(['ghost'])
    expect(pool.version).toBe(v + 1) // 未移除任何项
    pool.get(undefined as unknown as string)
    pool.clear()
    expect(pool.list()).toEqual([])
    const afterClear = pool.version
    pool.clear()
    expect(pool.version).toBe(afterClear) // 空池 clear 不抬版本
  })

  it('version：初始 0，逐次生效变更 +1', () => {
    const pool = new ResourcePool()
    expect(pool.version).toBe(0)
    pool.register([res('a')])
    expect(pool.version).toBe(1)
    pool.remove(['a'])
    expect(pool.version).toBe(2)
    pool.register([res('a')])
    pool.clear()
    expect(pool.version).toBe(4)
  })

  it('I6 回归：跨模块副本共享同一份 globalThis 状态（副本 A 写入、副本 B 可见）', async () => {
    vi.resetModules()
    const modA = await import('./index.js')
    vi.resetModules() // 关键：让第二个 import 产生真正独立的模块副本（独立 ResourcePool 类）
    const modB = await import('./index.js')
    // 同一副本内两次调用操作同一状态（包装对象每次新建，行为等价即同一份状态）
    const poolA1 = modA.getSharedResourcePool()
    poolA1.register([{ id: 'same-copy-probe', name: '同副本' }])
    expect(modA.getSharedResourcePool().get('same-copy-probe')?.name).toBe('同副本')
    modA.getSharedResourcePool().remove(['same-copy-probe'])
    // 副本类/包装对象可以不同实例，但共享状态必须互见（i18n registry 的 STATE_KEY 模式）
    const poolA = modA.getSharedResourcePool()
    const poolB = modB.getSharedResourcePool()
    const v = poolA.version
    poolA.register([{ id: 'cross-copy-probe', name: '跨副本' }])
    expect(poolB.get('cross-copy-probe')?.name).toBe('跨副本')
    expect(poolB.version).toBe(v + 1)
    poolB.remove(['cross-copy-probe'])
    expect(poolA.get('cross-copy-probe')).toBeUndefined()
    // 共享单例确实挂在 globalThis Symbol.for 的**纯对象状态**上（class 实例不承载状态）
    const store = globalThis as unknown as Record<symbol, unknown>
    const shared = store[Symbol.for('@oas-ui/ui/resource-pool/v1')]
    expect(shared).not.toBeInstanceOf(modA.ResourcePool)
    expect((shared as { version: number }).version).toBe(poolA.version)
    expect(Array.isArray((shared as { items: unknown }).items)).toBe(true)
  })

  it('createResourcePool：两实例互不可见（独立状态，版本各自计）', () => {
    const poolA = createResourcePool()
    const poolB = createResourcePool()
    poolA.register([res('a', '甲池')])
    expect(poolA.get('a')?.name).toBe('甲池')
    expect(poolB.get('a')).toBeUndefined()
    expect(poolB.list()).toEqual([])
    // 版本独立：A 的变更不抬 B 的版本
    expect(poolA.version).toBe(1)
    expect(poolB.version).toBe(0)
    poolB.register([res('b', '乙池')])
    expect(poolA.get('b')).toBeUndefined()
    expect(poolB.get('b')?.name).toBe('乙池')
    // B 的 remove/clear 也不影响 A
    poolB.clear()
    expect(poolA.get('a')?.name).toBe('甲池')
  })

  it('createResourcePool：与共享单例完全隔离；getSharedResourcePool 跨调用仍共享同一状态', () => {
    const sharedV = getSharedResourcePool().version
    const isolated = createResourcePool()
    isolated.register([res('iso', '隔离池')])
    // 独立实例写入不进共享池（双向不可见）
    expect(getSharedResourcePool().get('iso')).toBeUndefined()
    expect(getSharedResourcePool().version).toBe(sharedV)
    const sharedProbe = res('shared-probe', '共享池')
    getSharedResourcePool().register([sharedProbe])
    expect(isolated.get('shared-probe')).toBeUndefined()
    // 同副本 getSharedResourcePool 跨调用仍共享（Symbol.for 全局唯一键 → 同一份纯对象状态）
    expect(getSharedResourcePool().get('shared-probe')?.name).toBe('共享池')
    expect(getSharedResourcePool().version).toBe(sharedV + 1)
    // 清理探测数据（共享池是跨测试全局态，不得泄漏给其他用例）
    getSharedResourcePool().remove(['shared-probe'])
  })

  it('createResourcePool：不触碰 globalThis 共享状态；state 注入路径不回归（注入共享状态即作用于共享）', () => {
    // createResourcePool 每次新建私有状态，不污染 globalThis（即便共享池为空也不挂键外状态）
    const before = (globalThis as unknown as Record<symbol, unknown>)[Symbol.for('@oas-ui/ui/resource-pool/v1')]
    createResourcePool().register([res('probe-never-shared')])
    const after = (globalThis as unknown as Record<symbol, unknown>)[Symbol.for('@oas-ui/ui/resource-pool/v1')]
    if (before === undefined) {
      expect(after).toBeUndefined() // 共享池从未初始化时，独立实例不得触发挂载
    } else {
      expect(after).toBe(before) // 已初始化时引用不变（无写入）
    }
    // state 注入路径：显式传入共享状态对象 → 操作作用于共享状态（getSharedResourcePool 的实现机制）
    const sharedState = (globalThis as unknown as Record<symbol, unknown>)[Symbol.for('@oas-ui/ui/resource-pool/v1')] as
      | { items: ResourceItem[]; version: number }
      | undefined
    const injected = new ResourcePool(sharedState ?? { items: [], version: 0 })
    injected.register([res('via-injection', '注入通道')])
    if (sharedState) {
      expect(getSharedResourcePool().get('via-injection')?.name).toBe('注入通道')
      getSharedResourcePool().remove(['via-injection'])
    } else {
      expect(injected.get('via-injection')?.name).toBe('注入通道')
    }
  })
})
