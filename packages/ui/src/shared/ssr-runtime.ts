/**
 * SSR 运行段探测（唯一实现，组件不得各自复制）。
 *
 * `@oas-ui/ssr` 的渲染 shim 同样提供 window/document，只认渲染器显式标记
 * `window.__OAS_SSR__`；真实浏览器/客户端（含测试环境 happy-dom）返回 false。
 * 用途：渲染段不得启动真实计时器、异步观察器、滚动/手势联动等副作用。
 */
export function isSsrRuntime(): boolean {
  return typeof window === 'undefined' || (window as Window & { __OAS_SSR__?: boolean }).__OAS_SSR__ === true
}
