/**
 * SSR 白名单计数门禁（纯函数，无第三方依赖）。
 *
 * 为什么需要：`docs/ssr.md` 等文档手写了白名单数量（「共 N tag」），WHITELIST 变更时
 * 极易忘记同步——数字一旦漂移，文档对使用者的承诺就是错的。数量是单调可校验的，
 * 因此把它变成门禁：`packages/ssr/src/index.ts` 的 WHITELIST 长度必须等于各文档声明的数量。
 *
 * 覆盖口径：
 * - 必需：docs/ssr.md、中文 guide、英文 guide（缺声明 = 失败，防止改写文案绕过门禁）
 * - 可选：docs/ROADMAP.md「当前 N」（沿用既有口径：没写就不校验）
 * - 只校验**数量**；tag 清单逐项存在性由 matrix.mjs 的 checkDocs 承担
 *
 * 运行：`pnpm ssr:check`（先跑 whitelist-count.test.mjs 自测，再跑 matrix.mjs --check）
 */

/** 文档计数声明来源（顺序即报错顺序） */
export const WHITELIST_COUNT_SOURCES = [
  { file: 'docs/ssr.md', pattern: /共\s*(\d+)\s*tag/, hint: '「共 <N> tag」' },
  { file: 'packages/docs/docs/guide/ssr.md', pattern: /共\s*(\d+)\s*tag/, hint: '「共 <N> tag」' },
  {
    file: 'packages/docs/docs/en/guide/ssr.md',
    pattern: /(\d+)\s*tags in total/,
    hint: '「<N> tags in total」',
  },
  { file: 'docs/ROADMAP.md', pattern: /当前\s*(\d+)/, hint: '「当前 <N>」', optional: true },
]

/** 从 `packages/ssr/src/index.ts` 源码解析 WHITELIST tag 数组 */
export function parseWhitelistSource(source) {
  const block = source.match(/export const WHITELIST = \[([\s\S]*?)\] as const/)
  if (!block)
    throw new Error(
      '无法解析 WHITELIST：packages/ssr/src/index.ts 结构已变（应为 `export const WHITELIST = [...] as const`）',
    )
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/**
 * 校验各文档声明的白名单数量与 WHITELIST 一致。
 * @param {{ expected: number, read: (file: string) => string | null | undefined }} options
 *   expected：WHITELIST 实际长度；read：按仓库相对路径读取文本（缺失可返回 null/undefined）
 * @returns {string[]} 问题列表（空数组 = 通过）
 */
export function checkWhitelistCounts({ expected, read }) {
  if (!Number.isInteger(expected) || expected <= 0) {
    throw new Error(`checkWhitelistCounts 需要正整数 expected，实得 ${expected}`)
  }
  const problems = []
  for (const source of WHITELIST_COUNT_SOURCES) {
    const text = read(source.file)
    if (text == null) {
      if (!source.optional) problems.push(`${source.file} 不存在，无法校验白名单计数（WHITELIST=${expected}）`)
      continue
    }
    const match = text.match(source.pattern)
    if (!match) {
      if (!source.optional) {
        problems.push(
          `${source.file} 缺少白名单数量声明（应写 ${source.hint}，WHITELIST=${expected}）：文案被改写会绕过门禁，请按格式补回`,
        )
      }
      continue
    }
    const declared = Number(match[1])
    if (declared !== expected) {
      problems.push(`${source.file} 白名单数量 ${declared} != WHITELIST ${expected}（${source.hint}）`)
    }
  }
  return problems
}
