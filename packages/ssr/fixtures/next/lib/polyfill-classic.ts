/**
 * 把 `@oas-ui/ssr/polyfill` 的 **ESM** 产物转成可在 HTML `<head>` 里同步执行的**经典脚本**。
 *
 * 为什么要转：严格顺序要求 polyfill 在 Next 任何 chunk 之前求值。Turbopack 产出的 chunk
 * 是 `<script async>`（求值顺序不受保证），而 `<script type="module">` 是延迟执行——两者都不能
 * 用来固定「polyfill 先于组件注册」。唯一确定性做法是 head 里**经典同步脚本**：解析到该标签时
 * 立即执行，后续任何脚本（含 async chunk）都不可能在它之前运行。
 *
 * `@oas-ui/ssr/dist/polyfill.js` 是自包含的无依赖 ESM（只有 `export function` 声明 + 末尾副作用），
 * 因此这里的转换只做两件事：去掉导出关键字（`export function foo` → `function foo`）、包一层 IIFE
 * 避免向页面泄漏全局符号。转换后会校验残留的 `import` / `export` 语句——产物形态一旦变化就直接
 * 报错，绝不吐出非法经典脚本。
 */

/** 顶层导出声明（只接受本包产物实际使用的形态：function / const / let / var / class） */
const EXPORT_DECLARATION = /^export\s+(?=(?:async\s+)?function\b|const\b|let\b|var\b|class\b)/gm

/** sourcemap 注释在 IIFE 包装后位置失效，直接去掉 */
const SOURCE_MAP_COMMENT = /\n\/\/# sourceMappingURL=.*$/

/** 包装后必须仍然存在的符号（产物被改名/裁剪时立刻暴露，而不是静默产出空脚本） */
const REQUIRED_SYMBOL = 'hydrateDeclarativeShadowRoots'

/**
 * ESM 源码 → 经典脚本源码。
 *
 * @param source `@oas-ui/ssr/dist/polyfill.js` 的原始文本
 * @returns 可直接作为 `<script src>`（经典、无 async/defer）内容返回的脚本
 */
export function toClassicScript(source: string): string {
  const body = source.replace(SOURCE_MAP_COMMENT, '\n').replace(EXPORT_DECLARATION, '')
  // 转换后仍有 ESM 语法：说明产物形态变了（如改成 `export { x }` / `export default` / 新增 import），
  // 这里必须失败，不能把浏览器会拒绝执行的脚本发出去。
  const leftover = body
    .split('\n')
    .map((line, index) => ({ line: line.trim(), index: index + 1 }))
    .filter(({ line }) => /^(?:import|export)\s/.test(line))
  if (leftover.length > 0) {
    const first = leftover[0]!
    throw new Error(
      `[next-fixture] @oas-ui/ssr/dist/polyfill.js 出现未支持的 ESM 语法（第 ${first.index} 行：${first.line}）；` +
        ' 请更新 lib/polyfill-classic.ts 的转换规则',
    )
  }
  if (!body.includes(REQUIRED_SYMBOL)) {
    throw new Error(`[next-fixture] 转换结果缺少 ${REQUIRED_SYMBOL}：polyfill 产物形态已变化，请检查转换规则`)
  }
  return `/* @oas-ui/ssr/polyfill · 经典脚本形态（fixture 由 ESM 产物即时转换） */\n(function () {\n'use strict';\n${body}\n})();\n`
}
