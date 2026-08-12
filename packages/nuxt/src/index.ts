/**
 * @oas-ui/nuxt 主入口。
 *
 * - 默认导出：Nuxt 3 module（`modules: ['@oas-ui/nuxt']` 加载）
 * - 具名导出：SSR helper（`renderOasToString` / `useOasRender`，等价
 *   `@oas-ui/nuxt/ssr` 子路径），server/api 显式 import 用
 */
export { default } from './module.js'
export { renderOasToString, useOasRender } from './ssr.js'
export type { OasRenderOptions } from './ssr.js'
export type { ModuleOptions } from './module.js'
