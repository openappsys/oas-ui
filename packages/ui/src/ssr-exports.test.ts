/**
 * SSR 类导出完整性守卫：`src/index.ts` 导出的每个 OAS* 组件类必须同时出现在
 * `src/ssr.ts`（Node-safe SSR 入口）的导出里（单向：index ⊆ ssr）。
 *
 * 背景：`@oas-ui/ssr` 渲染器按需动态 import 组件目录，而高级用户自建 DOM shim 时
 * 从 `@oas-ui/ui/ssr` 取类注册；ssr.ts 漏登记会导致该入口缺类、组件无法在
 * 自建 shim 场景下使用。历史上多次漏登记（stepper 容器、conversation 五件等），
 * 故以文本解析做静态守卫防复发：不 import 任何模块（避免运行时副作用与 shim 依赖），
 * 纯文本集合比较。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const SRC_DIR = import.meta.dirname

/** 从入口源码文本提取 `export { … } from '…'` 语句里的 OAS* 类名（跳过 export type 与注释） */
function extractOasClasses(file: string): Set<string> {
  const raw = readFileSync(join(SRC_DIR, file), 'utf8')
  // 去块注释与行注释：注释示例里出现的 OASButton 等不得计入
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const names = new Set<string>()
  // `export(?!\s+type) { … } from …`：单行/多行 brace 均覆盖；`export type { … }` 整句跳过
  for (const m of code.matchAll(/export(?!\s+type)\s*\{([^}]*)\}\s*from/g)) {
    for (let name of m[1]!.split(',')) {
      name = name.trim().replace(/^type\s+/, '')
      if (/^OAS[A-Z0-9]/.test(name)) names.add(name)
    }
  }
  return names
}

describe('ssr.ts 类导出完整性守卫（index ⊆ ssr）', () => {
  const indexExports = extractOasClasses('index.ts')
  const ssrExports = extractOasClasses('ssr.ts')

  test('解析器自检：两侧都解析到全量量级的 OAS* 类（防解析失效恒真）', () => {
    // 量级锚点：全库组件类 190+ 个，若导出语法变化导致解析失效，集合会骤降而非误绿
    expect(indexExports.size).toBeGreaterThan(150)
    expect(ssrExports.size).toBeGreaterThan(150)
  })

  test('index.ts 导出的每个 OAS* 类都在 ssr.ts 中导出', () => {
    const missing = [...indexExports].filter((name) => !ssrExports.has(name)).sort()
    expect(
      missing,
      `以下组件类在 index.ts 有导出，但 ssr.ts（Node-safe SSR 入口）漏导出：${missing.join('、')}`,
    ).toEqual([])
  })
})
