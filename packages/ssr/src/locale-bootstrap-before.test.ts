// @vitest-environment node
import { describe, it, expect } from 'vitest'

/**
 * 自定义 locale 的前置条件（独立模块 / 独立进程）。
 *
 * 历史契约（core barrel 时代）：`@oas-ui/i18n` 主入口静态 import `@oas-ui/core` barrel，
 * barrel 求值 `class OASElement extends HTMLElement`——没有 shim 的裸 Node 进程抛
 * `HTMLElement is not defined`，宿主必须先完成一次 renderToString（渲染器安装 shim）
 * 再 `registerLocale()`。
 *
 * core 子路径导入批（2026-11-03）解除该耦合：i18n 主入口只静态 import
 * `@oas-ui/core/translator`（纯状态模块，零 DOM 顶层访问），裸 Node 可直接 import 与
 * 注册 locale。这放宽了前置条件：原「未 bootstrap 先注册必失败」从硬约束变为可用路径。
 * 成功路径见 `locale-bootstrap-after.test.ts`；core barrel 入口行为未变——直接 import
 * `@oas-ui/core` 在裸 Node 仍因基类求值失败（见末条断言）。
 */
describe('@oas-ui/ssr 自定义 locale 前置条件（未 bootstrap）', () => {
  it('裸 Node 环境没有 DOM 全局', () => {
    expect((globalThis as { HTMLElement?: unknown }).HTMLElement).toBeUndefined()
  })

  it('裸 Node 可直接 import @oas-ui/i18n（i18n 只依赖 core/translator 子路径，不拖 DOM 基类）', async () => {
    const i18n = (await import('@oas-ui/i18n')) as unknown as Record<string, unknown>
    expect(typeof i18n.registerLocale).toBe('function')
    expect(typeof i18n.setLocale).toBe('function')
  })

  it('core barrel 入口在裸 Node 仍因 HTMLElement 求值失败（基类契约未变）', async () => {
    await expect(import('@oas-ui/core')).rejects.toThrow(/HTMLElement is not defined/)
  })
})
