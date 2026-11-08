import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { toClassicScript } from '../../lib/polyfill-classic'

/**
 * 以**经典脚本**形式提供 `@oas-ui/ssr/polyfill`（`/oas-dsd-polyfill.js`）。
 *
 * 根 layout 用普通 `<script src>` 在 `<head>` 最前面同步加载它：解析器读到该标签时立即执行，
 * 早于 Next 的任何 chunk（Turbopack 的 chunk 都是 `async`，`type="module"` 则一律延迟）。
 * 因此这里必须返回经典脚本（非 ESM）——`dist/polyfill.js` 是 ESM，由 `lib/polyfill-classic.ts`
 * 即时转换。运行时按绝对路径读取 node_modules（与 `lib/ssr-runtime.ts` 同一套 link 包加载方式），
 * 不做构建期拷贝，dist 更新即生效。
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

let cached: string | null = null

export async function GET(): Promise<Response> {
  cached ??= toClassicScript(
    await readFile(join(process.cwd(), 'node_modules', '@oas-ui', 'ssr', 'dist', 'polyfill.js'), 'utf8'),
  )
  return new Response(cached, {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      // 首屏脚本：不允许缓存到旧产物（fixture 里 dist 会随主仓构建变化）
      'cache-control': 'no-store',
    },
  })
}
