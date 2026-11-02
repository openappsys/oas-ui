import { describe, expect, it, vi } from 'vitest'

// 冷加载窗口：在 mock loader 返回内置包之前注册自定义 fr。
// 此时 ensureLocalePack 的首次 registered-first 检查已经过去，注册发生在 loader resolve 之前；
// 若没有 loader 后的二次检查，内置 fr 会覆盖自定义包，本用例会失败。
vi.mock('@oas-ui/i18n/fr', async () => {
  const actual = await vi.importActual<typeof import('@oas-ui/i18n/fr')>('@oas-ui/i18n/fr')
  const { registerLocale } = await import('@oas-ui/i18n')
  registerLocale({
    name: 'fr',
    messages: { ...actual.default.messages, 'empty.noData': 'CUSTOM-FR' },
  })
  return actual
})

import { renderToString } from './index.js'

describe('SSR locale 冷加载竞态', () => {
  it('loader 返回前注册的自定义包不被内置包覆盖（registered-first 二次检查）', async () => {
    const html = await renderToString('oas-empty', {}, '', { locale: 'fr' })
    expect(html).toContain('CUSTOM-FR')
    expect(html).not.toContain('Aucune donnée')
  })
})
