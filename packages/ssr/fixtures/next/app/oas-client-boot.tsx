'use client'

import { useEffect } from 'react'
import { registerLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import ar from '@oas-ui/i18n/ar'

/**
 * 语言包注册（客户端）。
 *
 * 顺序很关键：先把 en / ar 注册进 i18n registry，组件 upgrade 时按就近
 * `<oas-config-provider locale>` 取翻译器；若语言包未注册，会回落到全局默认
 * zh-CN，把服务端渲染好的 en/ar 文案「水合改回中文」。
 *
 * 这里用**模块求值期的同步静态 import**：registerLocale 在本模块求值时同步执行，
 * 必然早于 `<OasRegistry>` 守卫的动态 `import('@oas-ui/ui')` 完成（动态导入至少
 * 一个 microtask），不存在「组件先 upgrade、语言包后注册」的竞态。
 * （旧 workaround 在 useEffect 里动态 import 语言包 + 组件库，Adapters 修复后不再需要。）
 */
registerLocale(en)
registerLocale(ar)

export function OasClientBoot(): null {
  useEffect(() => {
    // e2e 就绪标记：OasRegistry 守卫的动态导入完成后 oas-* 全局注册
    void customElements.whenDefined('oas-button').then(() => {
      ;(window as unknown as { __oasClientReady?: boolean }).__oasClientReady = true
    })
  }, [])
  return null
}
