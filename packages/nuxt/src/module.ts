/**
 * @oas-ui/nuxt —— Nuxt 3 module。
 *
 * `modules: ['@oas-ui/nuxt']` 引入后自动完成三件事，SSR（DSD 快照）开箱即用：
 *
 * 1. **Vue isCustomElement**：`vite:extendConfig` 钩子把 `oas-*` 前缀注册进
 *    `compilerOptions.isCustomElement`（与既有配置合并，支持函数/RegExp/布尔），
 *    Vue 不再把 `oas-*` 当组件解析、不再告警；
 * 2. **theme CSS 注入**：`@oas-ui/theme` 自动追加到 `nuxt.options.css`（DSD 快照
 *    引用的 `--oas-*` token 定义在 theme 的 `:root`，页面必须引入否则 token 回落透明）。
 *    可用 `oasUi: { theme: false }` 关闭，或传自定义 CSS 入口替换；
 * 3. **SSR helper 自动导入**：`renderOasToString` / `useOasRender`（来自
 *    `@oas-ui/nuxt/ssr`）经 `addImports` 注册，server/api 与 server components
 *    免 import 直接调用；也可显式 `import { renderOasToString } from '@oas-ui/nuxt/ssr'`。
 */
import { addImports, defineNuxtModule } from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'

export interface ModuleOptions {
  /**
   * 是否自动注入 `@oas-ui/theme` 的全局 CSS（默认 `true`）。
   * 传字符串时视为自定义 CSS 入口；传 `false` 关闭自动注入。
   */
  theme?: boolean | string
  /** 是否注册 `renderOasToString` / `useOasRender` 自动导入（默认 `true`） */
  autoImports?: boolean
}

/** Vue 侧 compilerOptions.isCustomElement 的既有取值形态（plugin-vue 允许函数/RegExp/布尔） */

/** 我们只关心最小的 vite vue 配置切片，避免依赖 Nuxt/Vite 的类型版本 */
interface ViteVueOptionsLike {
  compilerOptions?: { isCustomElement?: unknown }
}
interface ViteConfigLike {
  vue?: ViteVueOptionsLike
}

/** 供测试复用的最小 Nuxt 切片 */
export interface NuxtLike {
  options: { css: string[] }
  hook: (name: string, fn: (config: unknown) => void) => void
}

/** `oas-*` 自定义元素判定：Vue 对这类 tag 一律按原生自定义元素处理 */
export function isOasElement(tag: string): boolean {
  return typeof tag === 'string' && tag.startsWith('oas-')
}

/**
 * 合并 isCustomElement：`oas-*` 恒为 true，其余委托给既有配置
 * （函数 / RegExp / true），空则一律 false（保留 Vue 默认行为）。
 */
export function mergeIsCustomElement(existing: unknown): (tag: string) => boolean {
  return (tag: string) => {
    if (isOasElement(tag)) return true
    if (typeof existing === 'function') return (existing as (tag: string) => boolean)(tag)
    if (existing instanceof RegExp) return existing.test(tag)
    return existing === true
  }
}

/** 把 isCustomElement 配置写进 vite 的 vue compilerOptions（就地修改 config） */
export function applyVueIsCustomElement(config: unknown): void {
  const viteConfig = config as ViteConfigLike
  const vue = viteConfig.vue ?? (viteConfig.vue = {})
  const compilerOptions = (vue.compilerOptions ??= {}) as { isCustomElement?: unknown }
  compilerOptions.isCustomElement = mergeIsCustomElement(compilerOptions.isCustomElement)
}

/** theme 选项 → 实际注入的 CSS 入口（仅 false 显式关闭 → 不注入；undefined 视为默认开） */
export function resolveThemeEntry(theme: boolean | string | undefined): string | null {
  if (theme === false) return null
  return typeof theme === 'string' ? theme : '@oas-ui/theme'
}

/** SSR helper 自动导入清单（模块 setup 与测试共用同一数据源） */
export function oasAutoImports(): Array<{ name: string; from: string }> {
  return [
    { name: 'renderOasToString', from: '@oas-ui/nuxt/ssr' },
    { name: 'useOasRender', from: '@oas-ui/nuxt/ssr' },
  ]
}

/**
 * module 安装逻辑（独立函数便于单测直接驱动；defaults 由 defineNuxtModule 合并）。
 */
export function setupOasModule(options: ModuleOptions, nuxt: NuxtLike): void {
  if (options.autoImports !== false) {
    for (const imp of oasAutoImports()) addImports(imp)
  }

  const themeEntry = resolveThemeEntry(options.theme)
  if (themeEntry && !nuxt.options.css.includes(themeEntry)) {
    nuxt.options.css.push(themeEntry)
  }

  nuxt.hook('vite:extendConfig', (config) => {
    applyVueIsCustomElement(config)
  })
}

const oasNuxtModule: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@oas-ui/nuxt',
    configKey: 'oasUi',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    theme: true,
    autoImports: true,
  },
  setup(options, nuxt) {
    setupOasModule(options, nuxt as unknown as NuxtLike)
  },
})

export default oasNuxtModule
