'use client'

import { useEffect } from 'react'

/**
 * 客户端注册引导（与文档「客户端专属」一致：组件库只在浏览器求值后注册）。
 *
 * 为什么不在模块顶层 `import '@oas-ui/ui'`：Next App Router 的 Client Component 在
 * 首次请求时同样会被服务端渲染，模块顶层的 `@oas-ui/ui` 会求值 `class extends HTMLElement`
 * 而服务端没有 DOM（只有 `@oas-ui/ssr` 会安装 happy-dom shim）。放到 `useEffect` 里
 * 只在浏览器执行，DSD 快照在注册后按指纹原地水合。
 *
 * 语言包顺序很关键：先把 en / ar 注册进 i18n registry，再 import `@oas-ui/ui`。
 * 组件 upgrade 时按就近 `<oas-config-provider locale>` 取翻译器；若语言包未注册，
 * 会回落到全局默认 zh-CN，把服务端渲染好的 en/ar 文案「水合改回中文」。
 */
export function OasClientBoot() {
  useEffect(() => {
    void (async () => {
      const [{ registerLocale }, en, ar] = await Promise.all([
        import('@oas-ui/i18n'),
        import('@oas-ui/i18n/en'),
        import('@oas-ui/i18n/ar'),
      ])
      registerLocale(en.default)
      registerLocale(ar.default)
      await import('@oas-ui/ui')
      ;(window as unknown as { __oasClientReady?: boolean }).__oasClientReady = true
    })()
  }, [])
  return null
}
