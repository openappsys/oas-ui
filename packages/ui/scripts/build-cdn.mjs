// CDN 族包构建驱动：逐族单独跑 vite build（IIFE 不支持多入口共享 chunk）。
// 全量 cdn.js 由 package.json `vite build --config vite.cdn.config.ts`（无 OAS_CDN_ENTRY）产出，
// 本脚本只循环 7 族 → dist/cdn/<族>.js。基座（core/i18n/icons 运行时 + 框架级三件）由 vite.cdn.config.ts 的
// alias/内联保证每族自包含，组件重复注册靠各 index.js 的幂等守卫兜底。
import { build } from 'vite'
import { resolve } from 'node:path'

const uiRoot = resolve(import.meta.dirname, '..')
const configFile = resolve(uiRoot, 'vite.cdn.config.ts')
const FAMILIES = ['basic', 'layout', 'form', 'feedback', 'navigation', 'data', 'framework']

for (const family of FAMILIES) {
  process.env.OAS_CDN_ENTRY = family
  await build({ configFile, root: uiRoot })
  delete process.env.OAS_CDN_ENTRY
}
