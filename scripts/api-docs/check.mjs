/**
 * API manifest 按组件门禁（per-component + WIP 感知）。
 *
 * 对 docs/api-manifest/<tag>.json 逐个校验：源码干净（已提交）的组件必须
 * 已提交 manifest 与源码一致（git diff --exit-code）；源码有未提交改动（WIP）的组件跳过
 * （它不是本次发布内容，其 manifest 条目随其源码提交时再重生成）。
 *
 * 用法：node scripts/api-docs/check.mjs
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const MANIFEST_DIR = join(ROOT, 'docs', 'api-manifest')

function sourceHasWip(sourceFile) {
  try {
    execSync(`git diff --quiet HEAD -- "${sourceFile}"`, { stdio: 'ignore', cwd: ROOT })
    return false
  } catch {
    return true
  }
}

function main() {
  const files = readdirSync(MANIFEST_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')
  const stale = []
  const skipped = []
  for (const f of files) {
    const tag = f.slice(0, -5)
    const tagFile = join(MANIFEST_DIR, f)
    const entry = JSON.parse(readFileSync(tagFile, 'utf8'))
    const sourceFile = entry?.sourceFile
    if (typeof sourceFile !== 'string') continue
    if (sourceHasWip(sourceFile)) {
      skipped.push(tag)
      continue
    }
    try {
      execSync(`git diff --exit-code -- "${tagFile}"`, { stdio: 'ignore', cwd: ROOT })
    } catch {
      stale.push(tag)
    }
  }
  for (const tag of skipped) console.log(`[api:check] 跳过在途 WIP 组件：${tag}`)
  if (stale.length) {
    console.error(`[api:check] 已提交 manifest 与源码不一致（stale）：${stale.join(', ')}`)
    console.error('  → 对这些组件跑 `pnpm api:scan && pnpm api:gen` 并提交其 manifest 文件')
    process.exit(1)
  }
  console.log(`[api:check] manifest 校验通过（跳过 WIP 组件 ${skipped.length} 个）`)
}

main()
