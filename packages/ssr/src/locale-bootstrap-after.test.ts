// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToString } from './index.js'

/**
 * 自定义 locale 的 bootstrap 顺序（独立模块 / 独立进程）：**先首次 `renderToString`（安装 shim），
 * 再 `registerLocale()` 自定义语言包**，之后即可按名传给 `locale`。
 *
 * 本文件用 `node` 环境隔离，不复用 `index.test.ts`（happy-dom 环境）里前序用例的 shim 状态：
 * 这里唯一的 shim 来源就是本文件第一次 `renderToString`。
 */
describe('@oas-ui/ssr 自定义 locale（bootstrap 之后）', () => {
  it('先 renderToString 安装 shim，再 registerLocale 的自定义语言包可按名生效', async () => {
    // 1) bootstrap：首次渲染安装 happy-dom shim，并装载 i18n registry
    const boot = await renderToString('oas-empty', {}, '', { locale: 'en' })
    expect(boot).toContain('No data')

    // 2) bootstrap 之后才 import i18n / registerLocale（裸 Node 下顺序反过来会抛 HTMLElement is not defined）
    const { registerLocale } = await import('@oas-ui/i18n')
    const en = (await import('@oas-ui/i18n/en')).default
    registerLocale({
      ...en,
      name: 'xx-bootstrap',
      messages: { ...en.messages, 'empty.noData': 'Bootstrap custom empty text' },
    })

    // 3) 类型不 cast：`RenderLocale | (string & {})` 允许自定义 locale 名同时保留内置补全
    const html = await renderToString('oas-empty', {}, '', { locale: 'xx-bootstrap' })
    expect(html).toContain('Bootstrap custom empty text')
    expect(html).not.toContain('No data')
    expect(html).not.toContain('暂无数据')
  })
})
