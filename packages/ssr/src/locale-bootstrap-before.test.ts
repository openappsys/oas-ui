// @vitest-environment node
import { describe, it, expect } from 'vitest'

/**
 * 自定义 locale 的前置条件（独立模块 / 独立进程）：**未 bootstrap 直接 registerLocale 会失败**。
 *
 * 本文件刻意使用 `node` 环境（无 happy-dom 全局），不依赖同文件或同 worker 其它用例装过的
 * DOM shim：`@oas-ui/i18n` 主入口静态 import `@oas-ui/core`，而 core 主入口在求值时执行
 * `class OASElement extends HTMLElement`——没有 shim 的裸 Node 进程会抛 `HTMLElement is not defined`。
 *
 * 因此宿主若要在 `renderToString` 里使用自定义语言包，必须先完成一次渲染（渲染器安装 shim），
 * 再 `registerLocale()`；直接先注册会在此处失败。成功路径见 `locale-bootstrap-after.test.ts`。
 */
describe('@oas-ui/ssr 自定义 locale 前置条件（未 bootstrap）', () => {
  it('裸 Node 环境没有 DOM 全局', () => {
    expect((globalThis as { HTMLElement?: unknown }).HTMLElement).toBeUndefined()
  })

  it('未先 renderToString 就 import @oas-ui/i18n / registerLocale 会因缺少 DOM shim 失败', async () => {
    await expect(import('@oas-ui/i18n')).rejects.toThrow(/HTMLElement is not defined/)
  })
})
