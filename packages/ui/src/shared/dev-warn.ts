/**
 * dev 告警通道（库级统一口径，对齐主流组件库的 dev-only warning 惯例）：
 * - **生产剔除**：`process.env.NODE_ENV === 'production'` 时静默——npm 下游打包器（Vite/webpack）
 *   会在生产构建时把它静态替换为 "production"，告警连同分支一起被摇掉；
 * - **失败放行**：裸 ESM / CDN 场景 `process` 不存在（catch 兜底为 false）时照常告警——
 *   宁可多报不漏报，dev 场景不因此失明；调试期临时禁用可设 `__OAS_DEV_WARN_OFF__`。
 * 本库 dist 刻意不做 NODE_ENV 预替换（库的正确姿势：把环境判定留给使用方的构建）。
 */
const IS_PROD: boolean = (() => {
  try {
    return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
  } catch {
    return false
  }
})()

export function devWarn(message: string, ...args: unknown[]): void {
  if (IS_PROD) return
  if ((globalThis as { __OAS_DEV_WARN_OFF__?: boolean }).__OAS_DEV_WARN_OFF__) return
  console.warn(message, ...args)
}
