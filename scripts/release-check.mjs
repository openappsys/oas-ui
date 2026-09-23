/**
 * 发布前硬校验：版本号一致性（防「内容/文档/门禁就绪但 version 未 bump →
 * CI 跳过发布 → npm 停在旧版」事故重演——v2.5.3 第一次发布曾因此空发）。
 *
 * 用法：node scripts/release-check.mjs <目标版本，如 2.5.4>
 * 在打 tag 之前跑；也供 pre-push 钩子在推 v* tag 时复用。
 *
 * 校验：
 * 1. 六个随主版本发布的包（core/icons/theme/i18n/ssr/ui）当前版本 == 目标
 *    （next/nuxt 独立节奏不随主版本，不校验版本；仅做「有改动未 bump」提醒，见 4）
 * 2. CHANGELOG.md 有 [目标] 段
 * 3. 若 tag 已存在（v<目标>），tag 指向提交的 packages/ui/package.json 版本 == 目标
 *    （核心防坑点：tag 指向未 bump 的旧提交）
 * 4. 工作流 pnpm 版本一致：.github/workflows 中 pnpm/action-setup 若固定了 version，
 *    必须与 package.json 的 packageManager 一致（v2.5.6 事故：packageManager 升 12.5.1
 *    而 workflows 仍写 11.20.0 → pnpm/action-setup「Multiple versions」Release 首步即挂）
 * 5. 适配层（next/nuxt）提醒：自上个 release tag 以来源码有改动但版本未 bump →
 *    本次发布会被 publish-skip-existing 跳过（版本已存在），改动永远发不出去。
 */
import { readFileSync, readdirSync } from 'node:fs'
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

// 4) 工作流 pnpm 版本一致性：pnpm/action-setup 若固定 version，必须 == packageManager
//    （不固定则 action 自动读 packageManager，天然不漂移——推荐写法）
const packageManager = JSON.parse(readFileSync('package.json', 'utf8')).packageManager || ''
const pmVersion = packageManager.startsWith('pnpm@') ? packageManager.slice('pnpm@'.length) : ''
if (pmVersion) {
  const WF_DIR = '.github/workflows'
  try {
    for (const file of readdirSync(WF_DIR).filter((n) => /\.ya?ml$/.test(n))) {
      const lines = readFileSync(join(WF_DIR, file), 'utf8').split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].includes('pnpm/action-setup')) continue
        const setupIndent = lines[i].match(/^\s*/)[0].length
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() && lines[j].match(/^\s*/)[0].length <= setupIndent) break
          const m = lines[j].match(/^\s*version:\s*['"]?([^'"\s]+)['"]?/)
          if (m) {
            if (m[1] !== pmVersion) {
              console.error(
                `✗ .github/workflows/${file}:${j + 1} 的 pnpm/action-setup 固定 version: ${m[1]} ≠ packageManager ${packageManager}` +
                  `——pnpm/action-setup 会因「Multiple versions of pnpm specified」直接失败`,
              )
              fail++
            }
            break
          }
        }
      }
    }
  } catch {
    // 无 workflows 目录（非常规环境）→ 跳过
  }
}

if (fail) {
  console.error(`[release-check] ${fail} 项不满足，禁止打 tag/发布`)
  process.exit(1)
}

// 4) 适配层提醒（警告级，不拦截发布）：自上个 release tag 以来源码有改动、但版本未 bump →
//    publish-skip-existing 见同名版本已存在会跳过，改动永远发不出去。
//    （next/nuxt 采用「有改动才发版」的独立节奏，不随主版本 bump，故用提醒而非硬拦。）
const ADAPTERS = ['next', 'nuxt']
let baselineTag = ''
try {
  baselineTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim()
} catch {
  // 无任何 tag（首次发布）→ 无法比较，跳过提醒
}
if (baselineTag) {
  const changed = execSync(
    `git diff --name-only "${baselineTag}"..HEAD -- ${ADAPTERS.map((p) => `packages/${p}`).join(' ')} ":(exclude)**/*.test.ts"`,
    { encoding: 'utf8' },
  ).trim()
  if (changed) {
    const bumped = []
    for (const p of ADAPTERS) {
      const now = JSON.parse(readFileSync(join('packages', p, 'package.json'), 'utf8')).version
      let at = ''
      try {
        at = JSON.parse(execSync(`git show "${baselineTag}:packages/${p}/package.json"`, { encoding: 'utf8' })).version
      } catch {
        // 基线 tag 里没有该包（首次加入）→ 视为需发布
      }
      if (now !== at) bumped.push(`${p}(${at || '无'}→${now})`)
    }
    const stale = ADAPTERS.filter((p) => !bumped.some((b) => b.startsWith(`${p}(`)))
    if (stale.length) {
      console.warn(
        `⚠ [release-check] 适配层自 ${baselineTag} 以来有改动但版本未 bump：${stale.join(', ')}` +
          `——publish-skip-existing 会因同名版本已存在而跳过，本次发布不会更新它们；` +
          `若确有需要发布的改动，请 bump 对应 packages/<name>/package.json 版本后重跑。` +
          `${bumped.length ? `（已 bump：${bumped.join(', ')}）` : ''}`,
      )
    }
  }
}

console.log(
  `[release-check] 通过：${MAIN_PACKAGES.length} 个发布包均为 ${version}，CHANGELOG 段齐全，tag（若存在）指向一致`,
)
