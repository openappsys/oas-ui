// 发布助手：逐包检查 npm 上是否已存在同版本，存在则跳过。
// 场景：`pnpm -r publish` 中途失败（如 provenance 校验），已发布的包重跑会 403，
// 本脚本保证幂等——只补发缺失的版本。顺序按依赖拓扑（core → … → next/nuxt）。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const PACKAGES = ['core', 'icons', 'theme', 'i18n', 'ssr', 'ui', 'next', 'nuxt']

for (const p of PACKAGES) {
  const j = JSON.parse(readFileSync(join('packages', p, 'package.json'), 'utf8'))
  const { name, version } = j
  let exists = false
  try {
    execSync(`npm view ${name}@${version} version`, { stdio: 'pipe' })
    exists = true
  } catch {
    // 未发布或网络异常 → 尝试发布
  }
  if (exists) {
    console.log(`✓ 已存在，跳过: ${name}@${version}`)
    continue
  }
  console.log(`📦 发布: ${name}@${version}`)
  execSync(`pnpm --filter ${name} publish --access public --no-git-checks`, {
    stdio: 'inherit',
  })
}

console.log('发布流程完成')
