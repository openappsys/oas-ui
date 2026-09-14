/**
 * 发布前硬校验：版本号一致性（防「内容/文档/门禁就绪但 version 未 bump →
 * CI 跳过发布 → npm 停在旧版」事故重演——v2.5.3 第一次发布曾因此空发）。
 *
 * 用法：node scripts/release-check.mjs <目标版本，如 2.5.4>
 * 在打 tag 之前跑；也供 pre-push 钩子在推 v* tag 时复用。
 *
 * 校验：
 * 1. 六个随主版本发布的包（core/icons/theme/i18n/ssr/ui）当前版本 == 目标
 *    （next/nuxt 独立节奏不随主版本，不校验）
 * 2. CHANGELOG.md 有 [目标] 段
 * 3. 若 tag 已存在（v<目标>），tag 指向提交的 packages/ui/package.json 版本 == 目标
 *    （核心防坑点：tag 指向未 bump 的旧提交）
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('用法：node scripts/release-check.mjs <目标版本，如 2.5.4>')
  process.exit(1)
}

const MAIN_PACKAGES = ['core', 'icons', 'theme', 'i18n', 'ssr', 'ui']
let fail = 0

// 1) 当前磁盘版本一致性
for (const p of MAIN_PACKAGES) {
  const j = JSON.parse(readFileSync(join('packages', p, 'package.json'), 'utf8'))
  if (j.version !== version) {
    console.error(`✗ ${j.name} 当前版本 ${j.version} ≠ 目标 ${version}`)
    fail++
  }
}

// 2) CHANGELOG 有 [目标] 段
const changelog = readFileSync('CHANGELOG.md', 'utf8')
if (!changelog.includes(`[${version}]`)) {
  console.error(`✗ CHANGELOG.md 缺 [${version}] 段`)
  fail++
}

// 3) tag 已存在时，其指向提交的 ui 包版本必须 == 目标
try {
  const uiPkgAtTag = execSync(`git show "v${version}^{commit}:packages/ui/package.json"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const v = JSON.parse(uiPkgAtTag).version
  if (v !== version) {
    console.error(`✗ tag v${version} 指向提交的 @oas-ui/ui 版本为 ${v} ≠ ${version}（tag 指向了未 bump 的提交！）`)
    fail++
  }
} catch {
  // tag 不存在（git show 抛错）→ 未打，仅校验当前磁盘即可
}

if (fail) {
  console.error(`[release-check] ${fail} 项不满足，禁止打 tag/发布`)
  process.exit(1)
}
console.log(
  `[release-check] 通过：${MAIN_PACKAGES.length} 个发布包均为 ${version}，CHANGELOG 段齐全，tag（若存在）指向一致`,
)
