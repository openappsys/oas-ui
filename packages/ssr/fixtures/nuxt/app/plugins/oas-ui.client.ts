// 客户端注册：与官方文档一致的唯一方式（全量入口副作用导入）。
// isCustomElement 由 @oas-ui/nuxt module 写入 nuxt.options.vue.compilerOptions（Nuxt 4），
// 并保留 vite:extendConfig 钩子兼容早期 Nuxt 3；本文件不重复配置。
export default defineNuxtPlugin(async () => {
  await import('@oas-ui/ui')
  ;(window as unknown as { __oasNuxtReady?: boolean }).__oasNuxtReady = true
})
