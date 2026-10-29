#!/usr/bin/env node
/**
 * 把主题 token CSS 内联成 Nitro 可消费的 TS 字符串模块。
 *
 * DSD 页面是 Nitro 原样 HTML 输出（不经 Nuxt 的 Vite HTML 管线），因此主题 CSS 必须在
 * 服务端字符串里自包含——禁 JS 时也要有完整 `--oas-*` token。生成物入库忽略，构建/开发前
 * 由本脚本从 `packages/theme/index.css`（入库产物）刷新，避免手抄漂移。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureRoot = join(here, '..')
const themeCssPath = join(fixtureRoot, '../../../theme/index.css')
const outPath = join(fixtureRoot, 'server/theme-css.generated.mjs')

const css = readFileSync(themeCssPath, 'utf8')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  `// 由 scripts/embed-theme.mjs 从 packages/theme/index.css 生成，请勿手改。\nexport const THEME_CSS = ${JSON.stringify(css)}\n`,
  'utf8',
)
console.log(`[nuxt-fixture] theme CSS embedded (${css.length} bytes) -> server/theme-css.generated.mjs`)
