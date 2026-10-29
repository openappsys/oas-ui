// 客户端注册：与官方文档一致的唯一方式（全量入口副作用导入）。
// isCustomElement 由 @oas-ui/nuxt module 的 vite:extendConfig 钩子配置，本文件不重复配置。
export default defineNuxtPlugin(async () => {
  await import('@oas-ui/ui')
  ;(window as unknown as { __oasNuxtReady?: boolean }).__oasNuxtReady = true
})
