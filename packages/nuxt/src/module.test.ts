import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * @oas-ui/nuxt module 单测。
 *
 * 不要求真跑 Nuxt 全量构建（仓库未装 nuxt，@nuxt/kit 为 peerDeps，消费者侧提供）；
 * 断言维度：module 定义存在、vite 钩子把 isCustomElement 注入、theme CSS 注入、
 * SSR helper 自动导入注册、纯函数合并语义。
 */

// 先 mock @nuxt/kit（hoisted），再动态 import module.js，保证 defineNuxtModule/addImports 被拦截
const { addImportsMock, defineNuxtModuleMock } = vi.hoisted(() => ({
  addImportsMock: vi.fn(),
  defineNuxtModuleMock: vi.fn((def: unknown) => def),
}))

vi.mock('@nuxt/kit', () => ({
  defineNuxtModule: defineNuxtModuleMock,
  addImports: addImportsMock,
}))

const {
  default: nuxtModuleRaw,
  isOasElement,
  mergeIsCustomElement,
  resolveThemeEntry,
  oasAutoImports,
  setupOasModule,
} = await import('./module.js')

/**
 * 运行时 mock 的 defineNuxtModule 直接把定义对象原样返回（不做 NuxtModule 包装），
 * 而类型层面 import 到的是 NuxtModule 包装类型（vi.mock 只改运行时不改类型），
 * 故对 default 导出按「定义对象」形态投射后再断言。
 */
interface ModuleDefShape {
  meta: { name: string; configKey?: string }
  defaults: Record<string, unknown>
  setup: (options: unknown, nuxt: unknown) => void
}
const nuxtModule = nuxtModuleRaw as unknown as ModuleDefShape

function createFakeNuxt() {
  const hooks = new Map<string, Array<(config: unknown) => void>>()
  return {
    options: { css: [] as string[] },
    hook: vi.fn((name: string, fn: (config: unknown) => void) => {
      hooks.set(name, [...(hooks.get(name) ?? []), fn])
    }),
    hooks,
  }
}

describe('@oas-ui/nuxt module 定义', () => {
  beforeEach(() => {
    // 只清 addImportsMock（setup 内新增的调用），保留 defineNuxtModuleMock 在
    // module.js 模块装载期的一次调用记录供「module 经 defineNuxtModule 定义」断言
    addImportsMock.mockClear()
  })

  it('module 经 defineNuxtModule 定义：meta.name / configKey / setup 就位', () => {
    expect(defineNuxtModuleMock).toHaveBeenCalledTimes(1)
    expect(nuxtModule.meta?.name).toBe('@oas-ui/nuxt')
    expect(nuxtModule.meta?.configKey).toBe('oasUi')
    expect(typeof nuxtModule.setup).toBe('function')
    // defaults：theme 默认注入、autoImports 默认开启
    expect(nuxtModule.defaults).toMatchObject({ theme: true, autoImports: true })
  })

  it('isOasElement：oas-* 前缀识别', () => {
    expect(isOasElement('oas-button')).toBe(true)
    expect(isOasElement('oas-table')).toBe(true)
    expect(isOasElement('button')).toBe(false)
    expect(isOasElement('o-button')).toBe(false)
    expect(isOasElement('')).toBe(false)
  })

  it('mergeIsCustomElement：oas-* 恒 true，其余委托既有配置', () => {
    const fn = mergeIsCustomElement((tag: string) => tag === 'x-widget')
    expect(fn('oas-button')).toBe(true)
    expect(fn('x-widget')).toBe(true)
    expect(fn('div')).toBe(false)

    // RegExp 形态
    const re = mergeIsCustomElement(/^my-/)
    expect(re('oas-tag')).toBe(true)
    expect(re('my-box')).toBe(true)
    expect(re('div')).toBe(false)

    // 布尔 true 形态：非 oas-* 一律 true（既有配置即全量自定义元素）
    const bool = mergeIsCustomElement(true)
    expect(bool('anything')).toBe(true)
    expect(bool('oas-tag')).toBe(true)

    // 无既有配置：仅 oas-* 命中
    const none = mergeIsCustomElement(undefined)
    expect(none('oas-button')).toBe(true)
    expect(none('div')).toBe(false)
  })

  it('resolveThemeEntry：默认 true → @oas-ui/theme；字符串 → 自定义入口；false → 不注入', () => {
    expect(resolveThemeEntry(true)).toBe('@oas-ui/theme')
    expect(resolveThemeEntry(undefined)).toBe('@oas-ui/theme')
    expect(resolveThemeEntry('~/assets/oas.css')).toBe('~/assets/oas.css')
    expect(resolveThemeEntry(false)).toBeNull()
  })

  it('oasAutoImports：renderOasToString / useOasRender 指向 @oas-ui/nuxt/ssr', () => {
    expect(oasAutoImports()).toEqual([
      { name: 'renderOasToString', from: '@oas-ui/nuxt/ssr' },
      { name: 'useOasRender', from: '@oas-ui/nuxt/ssr' },
    ])
  })

  it('setup：theme CSS 注入 nuxt.options.css（去重）', () => {
    const fake = createFakeNuxt()
    setupOasModule({ theme: true, autoImports: false }, fake)
    expect(fake.options.css).toEqual(['@oas-ui/theme'])

    // 二次注入去重（已有同入口不再 push）
    setupOasModule({ theme: true, autoImports: false }, fake)
    expect(fake.options.css).toEqual(['@oas-ui/theme'])

    // theme: false 不注入
    const off = createFakeNuxt()
    setupOasModule({ theme: false, autoImports: false }, off)
    expect(off.options.css).toEqual([])

    // 自定义 CSS 入口
    const custom = createFakeNuxt()
    setupOasModule({ theme: '~/assets/oas.css', autoImports: false }, custom)
    expect(custom.options.css).toEqual(['~/assets/oas.css'])
  })

  it('setup：注册 vite:extendConfig 钩子，钩子内把 isCustomElement 注入 vue compilerOptions', async () => {
    const fake = createFakeNuxt()
    setupOasModule({ theme: true, autoImports: false }, fake)
    expect(fake.hook).toHaveBeenCalledWith('vite:extendConfig', expect.any(Function))

    const viteHook = fake.hooks.get('vite:extendConfig')![0]!
    const config: { vue?: { compilerOptions?: Record<string, unknown> } } = {
      vue: { compilerOptions: {} },
    }
    viteHook(config)

    const isCustomElement = config.vue!.compilerOptions!.isCustomElement as (tag: string) => boolean
    expect(isCustomElement('oas-button')).toBe(true)
    expect(isCustomElement('oas-form-item')).toBe(true)
    expect(isCustomElement('div')).toBe(false)

    // 既有 isCustomElement 函数被保留
    const config2: { vue?: { compilerOptions?: Record<string, unknown> } } = {
      vue: { compilerOptions: { isCustomElement: (t: string) => t === 'x-widget' } },
    }
    viteHook(config2)
    const merged = config2.vue!.compilerOptions!.isCustomElement as (tag: string) => boolean
    expect(merged('x-widget')).toBe(true)
    expect(merged('oas-table')).toBe(true)
    expect(merged('span')).toBe(false)

    // config.vue 缺省时由钩子补齐
    const config3: { vue?: { compilerOptions?: Record<string, unknown> } } = {}
    viteHook(config3)
    expect(config3.vue).toBeDefined()
    const merged3 = config3.vue!.compilerOptions!.isCustomElement as (tag: string) => boolean
    expect(merged3('oas-empty')).toBe(true)
  })

  it('setup：SSR helper 经 addImports 注册（autoImports 默认开）', () => {
    const fake = createFakeNuxt()
    setupOasModule({}, fake)
    expect(addImportsMock).toHaveBeenCalledWith({
      name: 'renderOasToString',
      from: '@oas-ui/nuxt/ssr',
    })
    expect(addImportsMock).toHaveBeenCalledWith({
      name: 'useOasRender',
      from: '@oas-ui/nuxt/ssr',
    })
  })

  it('setup：autoImports: false 不注册 addImports', () => {
    const fake = createFakeNuxt()
    setupOasModule({ autoImports: false }, fake)
    expect(addImportsMock).not.toHaveBeenCalled()
  })
})
