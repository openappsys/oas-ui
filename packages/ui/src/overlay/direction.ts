/**
 * 生效书写方向解析（RTL 公共机制）。
 *
 * 优先级：config-provider 的 direction/dir > 最近带 dir 的祖先（含宿主）> document.dir >
 * 当前 locale 的 dir（如 ar 语言包标注 rtl）> ltr。
 * 供浮层定位（computePosition 的 direction 选项）与方向敏感逻辑消费。
 */
import { findConfigProvider } from '@oas-ui/core'
import { getDirection } from '@oas-ui/i18n'

export function resolveDirection(el?: Element | null): 'ltr' | 'rtl' {
  if (el) {
    const provider = findConfigProvider(el)
    const providerDir = provider?.getAttribute('dir') ?? provider?.getAttribute('direction')
    if (providerDir === 'rtl' || providerDir === 'ltr') return providerDir
    const ancestorDir = el.closest('[dir]')?.getAttribute('dir')
    if (ancestorDir === 'rtl' || ancestorDir === 'ltr') return ancestorDir
  }
  if (typeof document !== 'undefined') {
    const docDir = document.documentElement.getAttribute('dir')
    if (docDir === 'rtl' || docDir === 'ltr') return docDir
  }
  return getDirection()
}
