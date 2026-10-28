/**
 * 发布前硬校验：版本号一致性（防「内容/文档/门禁就绪但 version 未 bump →
 * CI 跳过发布 → npm 停在旧版」事故重演——v2.5.3 第一次发布曾因此空发）。
 *
 * 用法：
 * - 本地（打 tag 前 / pre-push）：`node scripts/release-check.mjs <目标版本，如 2.5.4>`
 *   tag ≠ HEAD 仅警告 + 列出 gap 提交清单，交人工判断（兼容旧语义）
 * - CI publish（严格）：`node scripts/release-check.mjs <版本> --require-tag-head`
 *   tag v<版本> 必须已存在且解析（lightweight/annotated 均可）到 HEAD；若运行环境提供
 *   GITHUB_SHA，HEAD 还必须等于它（checkout 漂移防护）。任何不一致直接失败，无警告通道
 * - CI verify-quality：`node scripts/release-check.mjs --verify-ci`
 *   查询 GitHub API：只接受同仓库、github.sha 对应、ci.yml 完整 completed+success；
 *   其他 SHA / pending / failure / 空结果一律 fail closed（判定矩阵见 release-gate.mjs）
 *
 * 校验：
 * 1. 六个随主版本发布的包（core/icons/theme/i18n/ssr/ui）当前版本 == 目标
 *    （next/nuxt 独立节奏不随主版本，不校验版本；仅做「有改动未 bump」提醒，见 5）
 * 2. CHANGELOG.md 有 [目标] 段
 * 3. 若 tag 已存在（v<目标>），tag 指向提交的 packages/ui/package.json 版本 == 目标
 *    （核心防坑点：tag 指向未 bump 的旧提交）；CI 严格模式下 tag 还必须指向 HEAD
 * 4. 工作流 pnpm 版本一致：.github/workflows 中 pnpm/action-setup 若固定了 version，
 *    必须与 package.json 的 packageManager 一致（v2.5.6 事故：packageManager 升 12.5.1
 *    而 workflows 仍写 11.20.0 → pnpm/action-setup「Multiple versions」Release 首步即挂）
 * 5. 适配层（next/nuxt）提醒：自上个 release tag 以来源码有改动但版本未 bump →
 *    本次发布会被 publish-skip-existing 跳过（版本已存在），改动永远发不出去。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import { CI_WORKFLOW_PATH, evaluateCiRuns, parseReleaseVersion } from './release-gate.mjs'

const MAIN_PACKAGES = ['core', 'icons', 'theme', 'i18n', 'ssr', 'ui']
const GIT_OPTS = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }

/** HEAD 提交 SHA；无提交/非 git 环境返回 null（调用方决定如何处置） */
function headSha() {
  try {
    return execSync('git rev-parse HEAD', GIT_OPTS).trim()
  } catch {
    return null
  }
}

/** tag v<版本> 解析到的提交 SHA（lightweight/annotated 均解引用到 commit）；不存在/不可解析返回 null */
function tagCommitSha(version) {
  try {
    return execSync(`git rev-parse "v${version}^{commit}"`, GIT_OPTS).trim()
  } catch {
    return null
  }
}

const short = (sha) => (typeof sha === 'string' ? sha.slice(0, 9) : String(sha))

// ---------- CI verify-quality：同 SHA 完整 CI 绿才放行 ----------

function verifyCi() {
  const repo = process.env.GITHUB_REPOSITORY
  const sha = process.env.GITHUB_SHA
  if (!repo || !sha) {
    console.error(
      '✗ [verify-ci] 缺 GITHUB_REPOSITORY / GITHUB_SHA——该模式只能在 GitHub Actions 内运行' +
        '（本地请用 release:check <版本>）',
    )
    process.exit(1)
  }
  // 形状白名单：sha 必须 40 位 hex、repo 必须 owner/name——既是 fail closed，
  // 也保证下面经 shell 调用 gh 时 URL 里不含任何可注入元字符
  if (!/^[0-9a-f]{40}$/i.test(sha) || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    console.error(`✗ [verify-ci] GITHUB_REPOSITORY / GITHUB_SHA 形状非法（repo=${repo}）——fail closed`)
    process.exit(1)
  }
  let runs
  try {
    const url = `repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`
    // 经 shell 解析 gh：Windows 上 gh 常以 gh.cmd shim 安装，无 shell 的 spawn 只找 gh.exe；
    // URL 加引号防 shell 元字符（? & 已由上面的形状白名单保证只可能是合法字面量）
    const out = execFileSync('gh', ['api', `"${url}"`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })
    runs = JSON.parse(out).workflow_runs
  } catch (err) {
    const detail = String((err && err.stderr) || err.message || err)
      .split(/\r?\n/)[0]
      .slice(0, 300)
    console.error(`✗ [verify-ci] 无法查询 CI run（gh api 失败）：${detail}\n  fail closed：查不到证据不放行`)
    process.exit(1)
  }
  const result = evaluateCiRuns({ runs, sha, repo, workflowPath: CI_WORKFLOW_PATH })
  if (!result.ok) {
    for (const r of result.reasons) console.error(`✗ [verify-ci] ${r}`)
    console.error('[verify-ci] 同 SHA 完整 CI 绿色结论不存在，禁止发布（需先让该提交完整跑绿 CI）')
    process.exit(1)
  }
  console.log(
    `[verify-ci] ✓ ${repo}@${short(sha)} 的完整 CI 已跑绿：${result.run.html_url}` +
      `（${result.run.name} #${result.run.run_number}），放行`,
  )
}

// ---------- 主流程：版本一致性 + tag 校验 ----------

function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--verify-ci') return verifyCi()

  const requireTagHead = args.includes('--require-tag-head')
  const version = parseReleaseVersion(args[0])
  if (!version) {
    if (args[0] !== undefined) {
      console.error(
        `✗ 「${args[0]}」不是合法的 x.y.z 目标版本——非 semver tag 直接失败（不支持 prerelease / 短版本 / 其他写法）`,
      )
    }
    console.error('用法：node scripts/release-check.mjs <目标版本，如 2.5.4> [--require-tag-head]')
    process.exit(1)
  }

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

  // 3) tag 校验：存在性、指向提交的 ui 包版本、与 HEAD 的关系
  const tagSha = tagCommitSha(version)
  const tagExists = tagSha !== null
  if (tagExists) {
    // 3a) tag 指向提交的 ui 包版本必须 == 目标（核心防坑点：tag 指向未 bump 的旧提交）
    try {
      const uiPkgAtTag = execSync(`git show "${tagSha}:packages/ui/package.json"`, GIT_OPTS)
      const v = JSON.parse(uiPkgAtTag).version
      if (v !== version) {
        console.error(`✗ tag v${version} 指向提交的 @oas-ui/ui 版本为 ${v} ≠ ${version}（tag 指向了未 bump 的提交！）`)
        fail++
      }
    } catch {
      console.error(`✗ tag v${version} 指向提交缺少 packages/ui/package.json，无法核对版本`)
      fail++
    }
  }

  let head = headSha()
  if (requireTagHead) {
    // CI 严格模式：全部 fail closed，无警告通道
    if (!head) {
      console.error('✗ [strict] 无法解析 HEAD（非 git 仓库或无提交）——CI 严格模式拒绝放行')
      fail++
    } else {
      const envSha = process.env.GITHUB_SHA
      if (envSha && envSha !== head) {
        console.error(
          `✗ [strict] HEAD ${short(head)} ≠ GITHUB_SHA ${short(envSha)}——checkout 未固定在验证通过的提交，禁止发布`,
        )
        fail++
      }
      if (!tagExists) {
        console.error(`✗ [strict] tag v${version} 不存在——发布由 tag 触发，tag 必须已存在且指向验证通过的提交`)
        fail++
      } else if (tagSha !== head) {
        console.error(
          `✗ [strict] tag v${version} 解析到 ${short(tagSha)}，≠ HEAD ${short(head)}` +
            `——tag 在验证后被移动（或未指向验证提交），禁止发布`,
        )
        fail++
      }
    }
  } else if (tagExists && head && tagSha !== head) {
    // 3b) 本地兼容（不拦截）：列出 tag 之后的提交清单。
    //     防的是「tag 打完后又提交了本属于本 release 的修复 → 版本校验照过、发布漏带修复」；
    //     但「tag 后接续做与本 release 无关的工作」同样合法，脚本无法区分二者，
    //     只能把清单摆出来交人判断——若清单里有本 release 的修复，删 tag 重打：
    //     git tag -d v<版本> && git tag -a v<版本> -m "v<版本>"
    const gap = execSync(`git log --oneline "v${version}"..HEAD`, GIT_OPTS).trim()
    console.warn(
      `⚠ [release-check] tag v${version} 指向 ${short(tagSha)}，非 HEAD ${short(head)}。` +
        `tag 之后的提交（发布不会包含它们）：\n${gap}\n` +
        `若其中有本属于 v${version} 的修复，请删 tag 重打后再推；若均为无关新工作，可忽略本警告。`,
    )
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
          // pnpm 12 下 `pnpm <script> -- --arg` 会把多余的 `--` 传进脚本（实测 Playwright 因此吞掉
          // --project 过滤、CI 全量片误跑 WebKit）；工作流里禁止这种写法，参数直接跟在脚本名后。
          if (/pnpm\s+[\w:-]+\s+--\s+--/.test(lines[i])) {
            console.error(
              `✗ .github/workflows/${file}:${i + 1} 使用了 \`pnpm <script> -- --...\`：pnpm 12 会把分隔符传给脚本，改为 \`pnpm <script> --arg\``,
            )
            fail++
          }
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

  // 5) 适配层提醒（警告级，不拦截发布）：自上个 release tag 以来源码有改动、但版本未 bump →
  //    publish-skip-existing 见同名版本已存在会跳过，改动永远发不出去。
  //    （next/nuxt 采用「有改动才发版」的独立节奏，不随主版本 bump，故用提醒而非硬拦。）
  const ADAPTERS = ['next', 'nuxt']
  let baselineTag = ''
  try {
    // 基线必须是「上一个 release tag」：目标 tag 已存在时取其前一个（否则基线就是
    // 目标 tag 本身，diff 恒空，提醒永远不触发）
    if (tagExists) {
      baselineTag = execSync(`git describe --tags --abbrev=0 "v${version}^"`, GIT_OPTS).trim()
    } else {
      baselineTag = execSync('git describe --tags --abbrev=0', GIT_OPTS).trim()
    }
  } catch {
    // 无任何更早的 tag（首次发布）→ 无法比较，跳过提醒
  }
  if (baselineTag) {
    const stale = []
    const bumped = []
    for (const p of ADAPTERS) {
      // 逐适配层判改动（原实现按整个 adapters 集合判「有改动」，
      // 会把未改动的那个也误报为 stale）
      const changed = execSync(
        `git diff --name-only "${baselineTag}"..HEAD -- "packages/${p}" ":(exclude)**/*.test.ts"`,
        GIT_OPTS,
      ).trim()
      if (!changed) continue
      const now = JSON.parse(readFileSync(join('packages', p, 'package.json'), 'utf8')).version
      let at = ''
      try {
        at = JSON.parse(execSync(`git show "${baselineTag}:packages/${p}/package.json"`, GIT_OPTS)).version
      } catch {
        // 基线 tag 里没有该包（首次加入）→ 视为需发布
      }
      if (now !== at) bumped.push(`${p}(${at || '无'}→${now})`)
      else stale.push(p)
    }
    if (stale.length) {
      console.warn(
        `⚠ [release-check] 适配层自 ${baselineTag} 以来有改动但版本未 bump：${stale.join(', ')}` +
          `——publish-skip-existing 会因同名版本已存在而跳过，本次发布不会更新它们；` +
          `若确有需要发布的改动，请 bump 对应 packages/<name>/package.json 版本后重跑。` +
          `${bumped.length ? `（已 bump：${bumped.join(', ')}）` : ''}`,
      )
    }
  }

  const strictNote =
    requireTagHead && tagExists && head ? `；CI 严格模式：tag v${version} 指向验证 SHA ${short(head)}` : ''
  console.log(
    `[release-check] 通过：${MAIN_PACKAGES.length} 个发布包均为 ${version}，CHANGELOG 段齐全，tag（若存在）指向一致${strictNote}`,
  )
}

main()
