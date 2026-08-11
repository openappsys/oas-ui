/**
 * theme 构建脚本：把 src/index.css（canonical 源）复制到包根 index.css。
 *
 * 目的：CDN 场景 unpkg 直接访问 @oas-ui/theme@1/index.css（根路径）以及
 * 不带路径按 main 解析时都可用。根 index.css 已提交进仓库，fresh checkout 下
 * docs/playground 的 import '@oas-ui/theme'（走 exports 解析）无需先构建。
 * 本地跑 pnpm build 时此脚本把 src 最新改动同步到根拷贝，保持两者一致。
 */
import { copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
copyFileSync(resolve(root, 'src/index.css'), resolve(root, 'index.css'))
