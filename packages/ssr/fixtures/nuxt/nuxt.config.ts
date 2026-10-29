export default defineNuxtConfig({
  compatibilityDate: '2026-10-30',
  // 官方接入方式：module 负责 Vue isCustomElement（oas-*）+ theme CSS 注入 + SSR helper 自动导入
  modules: ['@oas-ui/nuxt'],
  oasUi: { theme: true, autoImports: true },
  devtools: { enabled: false },
  // fixture 是独立包（不在根 workspace），禁止 Nuxt 推导到上级 monorepo 根
  telemetry: false,
  typescript: { strict: true },
})
