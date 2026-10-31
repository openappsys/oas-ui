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
 * 早于本模块触发的任何动态导入解析（`@oas-ui/ui` 的守卫动态导入至少晚一个
 * microtask）。但 OasRegistry 所在 chunk 与本模块所在 chunk 的**加载完成顺序**
 * 是打包行为而非语言保证——若组件 upgrade 抢先于本模块求值（回落 zh-CN），
 * 下方 useEffect 的「重下发 provider locale」自愈会把文案纠正回来。
 */
registerLocale(en)
registerLocale(ar)

export function OasClientBoot(): null {
  useEffect(() => {
    // chunk 竞态自愈：组件 upgrade 抢先于语言包注册时（upgrade 实例回落 zh-CN），
    // 重下发页面上每个 config-provider 的 locale 属性 → notifyConfigProviders →
    // 子树已升级组件重取 translator（registry 此时已有 en/ar）→ 文案回到正确语言。
    document.querySelectorAll('oas-config-provider[locale]').forEach((cp) => {
      const loc = cp.getAttribute('locale')
      if (loc) {
        cp.removeAttribute('locale')
        cp.setAttribute('locale', loc)
      }
    })
    // e2e 就绪标记：组件库已加载 + 语言包自愈已完成
    void customElements.whenDefined('oas-button').then(() => {
      ;(window as unknown as { __oasClientReady?: boolean }).__oasClientReady = true
    })
  }, [])
  return null
}
