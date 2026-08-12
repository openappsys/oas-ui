/**
 * @oas-ui/next 主入口。
 *
 * 仅导出客户端安全内容（OasRegistry + 纯逻辑 renderOas）：
 * - `OasRegistry`（"use client" 注册引导，见 ./client.js）——layout 挂载用
 * - `renderOas`（纯逻辑、无 React 依赖，见 ./ssr.js）——自定义包装场景用
 *
 * RSC 服务端组件 `OasComponent` 走独立子路径 `@oas-ui/next/server`
 * （含 react-dom/server 与 Node 环境依赖，导入主入口会破坏客户端 bundle）。
 */
export { OasRegistry } from './client.js'
export type { OasRegistryProps } from './client.js'
export { renderOas, normalizeAttrs } from './ssr.js'
export type { OasAttrs, OasRenderOptions } from './ssr.js'
