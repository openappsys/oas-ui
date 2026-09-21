import { describe, it, expect, beforeAll } from 'vitest'

/**
 * @oas-ui/next 客户端注册引导单测。
 *
 * 断言 `OasRegistry`（"use client"）的副作用导入 `@oas-ui/ui`
 * 在客户端环境完成组件全局注册（customElements.define），组件本身零 DOM、
 * 原样透传 children。真实 App Router 环境由 Next 的 client reference
 * 机制执行，vitest 在 happy-dom 环境等价验证副作用与渲染契约。
 */
describe('@oas-ui/next OasRegistry', () => {
  let OasRegistry: (props: { children?: unknown }) => unknown

  beforeAll(
    async () => {
      // 动态 import：先触发 @oas-ui/ui 副作用注册，再取组件
      const mod = await import('./client.js')
      OasRegistry = mod.OasRegistry as (props: { children?: unknown }) => unknown
    },
    // 该 hook 要重导入整条 @oas-ui/ui 注册链（数百个组件模块），单跑实测 ≈3.9s；
    // 默认 hookTimeout（10s）在全量 `pnpm test` 高负载并行时会被顶到（曾偶发把 suite 拖红）。
    // 取单跑实测的 ~4 倍（15s）：负载敏感但只在真正卡死时才失败，不再拿临界值赌调度。
    15_000,
  )

  it('副作用注册：import @oas-ui/ui 后 oas-* 组件全局注册（customElements.define）', () => {
    expect(customElements.get('oas-button')).toBeDefined()
    expect(customElements.get('oas-table')).toBeDefined()
    expect(customElements.get('oas-modal')).toBeDefined()
    expect(customElements.get('oas-input')).toBeDefined()
  })

  it('组件零 DOM：原样透传 children', () => {
    const children = createChildren()
    expect(OasRegistry({ children })).toBe(children)
  })

  it('无 children 时返回 null（零 DOM）', () => {
    expect(OasRegistry({})).toBeNull()
    expect(OasRegistry(undefined as never)).toBeNull()
  })
})

function createChildren(): unknown {
  // 用普通对象模拟 ReactNode 引用，直接断言「透传同一引用、无包装」
  return { $$typeof: Symbol.for('react.element'), key: null, props: {}, type: 'div' }
}
