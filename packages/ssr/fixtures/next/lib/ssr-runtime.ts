import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * 运行时装载 `@oas-ui/ssr`（Node 侧真实 ESM 文件）。
 *
 * 为什么不能直接 `import { renderToString } from '@oas-ui/ssr'`：
 * - @oas-ui/ssr 内部按白名单 tag 做 `import(目录入口)` 的**动态导入表**（~200 个组件目录）；
 * - fixture 用 link: 依赖指向仓库内源码包，Next/Turbopack 会把 linked 包当源码打包，并在
 *   遇到动态表达式导入时报 `Cannot find module as expression is too dynamic`（webpack 则退化为
 *   critical dependency，运行期失败）；
 * - Turbopack 还会改写 `require.resolve` / `import.meta.resolve`（实测分别返回 module id /
 *   被裁剪的对象），因此这里用 `new Function('return import(url)')` 让打包器完全跳过静态分析，
 *   由 Node 按**绝对文件 URL**加载真实 dist。
 *
 * 这是 fixture 对「linked 包 + 动态导入」组合的运行时装载方式；真实消费者从 npm 安装时
 * `serverExternalPackages: ['@oas-ui/ssr', 'happy-dom']` 即可（见 fixture README）。
 */
export type SsrModule = typeof import('@oas-ui/ssr')

let ssrPromise: Promise<SsrModule> | null = null

/** 动态 import 的不可分析包装（打包器不重写字符串，Node 按绝对 URL 解析） */
const importByUrl = new Function('url', 'return import(url)') as (url: string) => Promise<SsrModule>

export function loadSsr(): Promise<SsrModule> {
  ssrPromise ??= (async () => {
    // next start 的 cwd = fixture 根；node_modules/@oas-ui/ssr 是主仓 packages/ssr 的 link。
    const entryPath = join(process.cwd(), 'node_modules', '@oas-ui', 'ssr', 'dist', 'index.js')
    if (!existsSync(entryPath)) {
      throw new Error(
        `[next-fixture] 未找到 SSR 引擎 ${entryPath}：请先在 fixture 内 pnpm install，并在主仓 pnpm build`,
      )
    }
    return await importByUrl(pathToFileURL(entryPath).href)
  })().catch((error: unknown) => {
    ssrPromise = null
    throw error
  })
  return ssrPromise
}
