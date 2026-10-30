import { describe, it, expect } from 'vitest'

/**
 * SSR 安全性（node 环境）：Next 会把 Client Component 也放到服务端预渲染，
 * 顶层副作用必须在无 DOM 的 Node 上安全跳过——此前顶层 `import '@oas-ui/ui'`
 * 会在模块求值阶段触发 `class extends HTMLElement` 而直接崩溃。
 *
 * 单独 node 环境文件：不能与 happy-dom 用例同文件（环境由文件级注解决定）。
 */
// @vitest-environment node
describe('@oas-ui/next OasRegistry SSR 安全', () => {
  it('Node 无 DOM 时导入 client 模块不抛错（副作用被守卫跳过）', async () => {
    expect(globalThis.HTMLElement).toBeUndefined()
    await expect(import('./client.js')).resolves.toBeTruthy()
    expect(globalThis.HTMLElement).toBeUndefined()
  })

  it('OasRegistry 在无 DOM 环境仍保持透传契约', async () => {
    const { OasRegistry } = await import('./client.js')
    const children = { $$typeof: Symbol.for('react.element'), key: null, props: {}, type: 'div' }
    expect(OasRegistry({ children })).toBe(children)
    expect(OasRegistry({})).toBeNull()
  })
})
