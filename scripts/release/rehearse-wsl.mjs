#!/usr/bin/env node
/**
 * WSL rehearse 通道：把发布门禁放进 WSL 的 Linux 发行版里再跑一遍，补上「操作系统差异」这一维。
 *
 * 为什么需要：本地 rehearse 只在 Windows 上重放 CI 步骤，OS 差异维度结构性缺失——
 * 出现过「本地 rehearse 全绿、CI（Ubuntu）连红」的实发事故，根因是字体/排版这类只在
 * Linux 渲染栈下才暴露的差异（行尾、路径分隔符、大小写敏感、renderer 差异同理）。
 * 本脚本不重复实现门禁逻辑，只做「环境搬运」：探测 WSL → 校验工具链与路径 →
 * 在发行版内执行 `pnpm release:rehearse <args>`（即 scripts/release/rehearse.mjs）。
 *
 * 定位：**可选增强层**，不是发布必经步骤。
 * - 未安装 WSL / 没有任何发行版 / 发行版缺 Linux 原生 node+pnpm → 打印一次性安装指引后
 *   exit 0（SKIP 语义，不红：缺环境是「没测到」，不是「测出问题」）。
 * - 真正跑起来后与 rehearse.mjs 完全同门禁、同顺序；非零退出 → exit 1 并贴 WSL 侧日志尾部。
 *
 * 证据文件协议（与 rehearse.mjs 完全一致）：
 * - rehearse 写 `<git-dir>/oas-release-rehearsal.json`。WSL 经 /mnt/<盘>/... 访问的是**同一个
 *   物理文件**，所以 WSL 层证据与 Windows 本地证据**同格式、同文件**：同一 SHA 内按层累积、
 *   成功层刷新为该次执行记录、失败层写 ok:false。
 * - scripts/release/verify-rehearsal.mjs 的判定只看「sha 一致 + testJob/e2e/ssrE2e 三层 ok:true」，
 *   不关心证据由哪一侧产生——WSL 跑出的证据**无需任何改动即可被 pre-push 核验**。
 * - 两侧互为加强，也是有意的 fail closed：WSL 侧跑红同样把该层记 ok:false，覆盖 Windows 侧的
 *   全绿记录——任一侧红都不该放行。
 *
 * ⚠️ 共享工作树的副作用（必读）：
 * - 跑的是同一份工作树（/mnt/<盘>/…），rehearse 里的 `pnpm install --frozen-lockfile` 会重写
 *   共享的 node_modules——Linux 原生二进制（esbuild / rollup / playwright…）会替换掉 Windows 的。
 *   跑完回 Windows 侧建议重跑一次 `pnpm install` 恢复。
 * - 也正因为是同一工作树，git HEAD / 工作树状态与 Windows 侧天然一致，证据才对得上同一棵树。
 * - /mnt 走 drvfs，I/O 比 Linux 原生文件系统慢，全量 e2e 会明显更久（正常现象）。
 *
 * 用法：
 *   node scripts/release/rehearse-wsl.mjs --probe                   # 只探测：发行版 + 工具链 + 路径 + HEAD 比对
 *   node scripts/release/rehearse-wsl.mjs                           # testJob 层（同 rehearse.mjs 默认）
 *   node scripts/release/rehearse-wsl.mjs --with-e2e                # 追加 e2e 层
 *   node scripts/release/rehearse-wsl.mjs --with-e2e --with-ssr-e2e # 三层
 *   node scripts/release/rehearse-wsl.mjs --distro Ubuntu --quiet    # 指定发行版 / 静音成功步
 *   pnpm release:rehearse:wsl --with-e2e                            # 接线后的推荐入口
 *
 * 前置守卫（fail closed）：
 * - 仅 Windows 可跑（要 wsl.exe 驱动）；Linux/macOS 上直接跑 pnpm release:rehearse 即可。
 * - 工作树必须干净（与 rehearse.mjs 同口径、无绕过开关）；--probe 只读，不做该守卫。
 * - Windows 仓库路径必须能换算成 /mnt/... 且 WSL 内 cd 可达、git toplevel 与 HEAD 与 Windows 侧一致
 *   （防止 /mnt 映射到另一个检出，让证据挂到错的树上）。
 * - 本仓库禁止 `pnpm <script> -- --arg`（pnpm 12 会把 `--` 传给脚本）：这里显式拒绝 `--`。
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeWslList, parseKv, sanitizeDistros, winToWslPath } from './rehearse-wsl-lib.mjs'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const LABEL = '[rehearse:wsl]'

/** 允许透传给内部 rehearse 的参数白名单（写死，避免任意串进 shell 命令行） */
const PASSTHROUGH = new Set(['--with-e2e', '--with-ssr-e2e', '--quiet', '--list'])

// ---------- 0. 运行环境守卫 + 参数解析 ----------

function fail(msg) {
  console.error(`${LABEL} ✗ ${msg}`)
  process.exit(1)
}

const skip = (lines) => {
  for (const line of lines) console.log(line === '' ? '' : `${LABEL} ${line}`)
  console.log(`${LABEL} SKIP 未执行 rehearse（缺环境不等于失败；Windows 侧结果仍作数）`)
  process.exit(0)
}

if (process.platform !== 'win32') {
  fail(
    `本脚本只能在 Windows 侧运行（需要 wsl.exe 驱动 WSL 发行版）；当前 platform=${process.platform}。` +
      '在 Linux/macOS 上你本来就在目标 OS 里，直接跑 pnpm release:rehearse 即可',
  )
}

const argv = process.argv.slice(2)
const passthrough = []
let probeOnly = false
let distroArg = null

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--help' || arg === '-h') {
    console.log(
      [
        '用法：node scripts/release/rehearse-wsl.mjs [--probe] [--distro <名>] [--with-e2e] [--with-ssr-e2e] [--quiet] [--list]',
        '  --probe      只探测发行版 / 工具链 / 路径映射，不执行 rehearse（不做工作树守卫）',
        '  --distro X   指定发行版（默认取 wsl -l -q 里首个工具链齐备者）',
        '  其余参数原样透传给内部 pnpm release:rehearse',
      ].join('\n'),
    )
    process.exit(0)
  }
  if (arg === '--') {
    fail('不支持 `--`（pnpm 12 会把它原样传给脚本，内部 rehearse 会当成未知参数）；直接写 `--with-e2e` 这类旗标即可')
  }
  if (arg === '--probe') {
    probeOnly = true
  } else if (arg === '--distro') {
    distroArg = argv[++i]
    if (!distroArg) fail('--distro 需要跟一个发行版名（用 wsl -l -q 查看）')
  } else if (arg.startsWith('--distro=')) {
    distroArg = arg.slice('--distro='.length)
    if (!distroArg) fail('--distro= 后面需要发行版名')
  } else if (PASSTHROUGH.has(arg)) {
    passthrough.push(arg)
  } else {
    fail(`未知参数「${arg}」——只接受 --probe / --distro <名> / --with-e2e / --with-ssr-e2e / --quiet / --list`)
  }
}

const listOnly = passthrough.includes('--list')
const requestedLayers = [
  'testJob',
  ...(passthrough.includes('--with-e2e') ? ['e2e'] : []),
  ...(passthrough.includes('--with-ssr-e2e') ? ['ssrE2e'] : []),
]

// ---------- 1. Windows 侧 git 守卫（与 rehearse.mjs 同口径） ----------

function gitOut(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

let winToplevel
try {
  winToplevel = gitOut('rev-parse', '--show-toplevel')
} catch (err) {
  fail(`无法读取仓库根（当前目录不是 git 仓库？）：${String(err.message).split('\n')[0]}`)
}

let headSha
try {
  headSha = gitOut('rev-parse', 'HEAD')
} catch {
  fail('无法解析 HEAD——fail closed')
}
if (!/^[0-9a-f]{40}$/i.test(headSha)) fail(`HEAD sha 形状非法（须 40 位 hex）：${headSha}——fail closed`)

if (!probeOnly) {
  let dirty
  try {
    dirty = gitOut('status', '--porcelain')
  } catch (err) {
    fail(`无法读取 git status：${String(err.message).split('\n')[0]}`)
  }
  if (dirty !== '') {
    const lines = dirty.split('\n')
    console.error(`${LABEL} ✗ 工作树不干净——rehearse 证据必须绑定一个干净的提交树，先提交或 stash（无绕过开关）：`)
    for (const line of lines.slice(0, 10)) console.error(`  ${line}`)
    if (lines.length > 10) console.error('  …')
    process.exit(1)
  }
}

// ---------- 2. WSL 发行版探测（缺失即 SKIP） ----------

/** .nvmrc 的主版本号（给安装指引用；读不到就退回 24） */
function nvmMajor() {
  try {
    const raw = readFileSync(join(ROOT, '.nvmrc'), 'utf8')
    const m = /^v?(\d+)/.exec(raw.trim())
    if (m) return m[1]
  } catch {
    // 忽略：指引文案退回默认值
  }
  return '24'
}

function setupGuide(reason) {
  const major = nvmMajor()
  return [
    `SKIP ${reason}`,
    '',
    '  为什么需要这一层：本地 Windows 全绿 ≠ CI（Ubuntu）全绿；WSL 通道用来在本机 Linux 里重放同一套门禁。',
    '',
    '  1) Windows 侧装 WSL + 发行版（管理员 PowerShell）：',
    '       wsl --install -d Ubuntu',
    '  2) 发行版内装 Linux 原生工具链（别用 /mnt/c 下的 Windows node——那是 Windows 行为，验证不到 OS 差异）：',
    '       sudo apt-get update && sudo apt-get install -y git curl',
    `       curl -fsSL https://deb.nodesource.com/setup_${major}.x | sudo -E bash - && sudo apt-get install -y nodejs`,
    '       sudo corepack enable --install-directory /usr/local/bin && corepack prepare pnpm@12.5.1 --activate',
    '  3) 验证（两条都必须有输出）：',
    "       wsl -d Ubuntu -e bash -lc 'node -v && pnpm -v'",
    '  4) 要用 --with-e2e（浏览器层）时，发行版内再装一次浏览器：',
    '       cd /mnt/<盘>/<仓库> && pnpm exec playwright install --with-deps',
  ]
}

const wslList = spawnSync('wsl.exe', ['-l', '-q'], { windowsHide: true })
if (wslList.error) {
  const code = wslList.error.code
  skip(
    setupGuide(
      code === 'ENOENT'
        ? '未找到 wsl.exe——本机未安装 WSL（或未启用「适用于 Linux 的 Windows 子系统」功能）'
        : `无法调用 wsl.exe（${String(wslList.error.message)}）`,
    ),
  )
}

const distros = sanitizeDistros(decodeWslList(wslList.stdout))
if (distros.length === 0) {
  const errText = sanitizeDistros(decodeWslList(wslList.stderr)).join(' ')
  skip(setupGuide(`wsl -l -q 未列出任何发行版（exit ${wslList.status}${errText ? `：${errText}` : ''}）`))
}

if (distroArg && !distros.includes(distroArg)) {
  fail(`指定的发行版「${distroArg}」不存在；当前可用：${distros.join('、')}（wsl -l -q 可复查）`)
}

// 个别 Windows 版本列表成功却返回非 0；拿到名字就继续，只提示（名字为空才按「没有发行版」SKIP）
if (wslList.status !== 0) {
  console.log(`${LABEL} ⚠ wsl -l -q 退出码 ${wslList.status}，但仍解析到发行版，继续尝试`)
}

console.log(`${LABEL} 发行版清单：${distros.join('、')}`)

// ---------- 3. 逐个发行版探测 Linux 原生 node + pnpm ----------

/** 探测脚本（单 argv 传入 bash，不经 Windows shell）：输出结构化 key=value 便于解析 */
const PROBE_SCRIPT = [
  'echo "node_bin=$(command -v node 2>/dev/null)"',
  'echo "pnpm_bin=$(command -v pnpm 2>/dev/null)"',
  'echo "node_ver=$(node -v 2>/dev/null)"',
  'echo "pnpm_ver=$(pnpm -v 2>/dev/null)"',
].join('; ')

/** /mnt/<盘>/… = Windows 互操作路径：跑的是 Windows 二进制，验证不到 Linux 行为 */
const isWindowsInterop = (p) => /^\/mnt\/[a-z]\//i.test(p)

function wslRun(distro, script) {
  return spawnSync('wsl.exe', ['-d', distro, '-e', 'bash', '-lc', script], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  })
}

function probeDistro(distro) {
  const r = wslRun(distro, PROBE_SCRIPT)
  if (r.error) return { ok: false, reason: `调用失败（${String(r.error.message)}）` }
  if (r.status !== 0) {
    const tail = (r.stderr || r.stdout || '').trim().split(/\r?\n/).slice(-1)[0] ?? ''
    return { ok: false, reason: `探测命令退出码 ${r.status}${tail ? `（${tail}）` : ''}` }
  }
  const kv = parseKv(r.stdout)
  const nodeBin = kv.node_bin ?? ''
  const pnpmBin = kv.pnpm_bin ?? ''

  if (!nodeBin) {
    return {
      ok: false,
      reason:
        'node 未安装（Linux 侧 command -v node 为空）' +
        (isWindowsInterop(pnpmBin) ? `；pnpm 只找到 Windows 互操作壳 ${pnpmBin}` : ''),
    }
  }
  if (isWindowsInterop(nodeBin)) {
    return { ok: false, reason: `node 指向 Windows 互操作路径 ${nodeBin}（不是 Linux 原生工具链）` }
  }
  if (!/^v\d+\.\d+\.\d+/.test(kv.node_ver ?? '')) {
    return { ok: false, reason: `node 版本不可解析（node -v → ${JSON.stringify(kv.node_ver ?? '')}）` }
  }
  if (!pnpmBin) return { ok: false, reason: 'pnpm 未安装（Linux 侧 command -v pnpm 为空）' }
  if (isWindowsInterop(pnpmBin)) {
    return { ok: false, reason: `pnpm 指向 Windows 互操作路径 ${pnpmBin}（不是 Linux 原生工具链）` }
  }
  if (!/^\d+\.\d+\.\d+/.test(kv.pnpm_ver ?? '')) {
    return { ok: false, reason: `pnpm 版本不可解析（pnpm -v → ${JSON.stringify(kv.pnpm_ver ?? '')}）` }
  }
  return { ok: true, nodeBin, pnpmBin, nodeVer: kv.node_ver, pnpmVer: kv.pnpm_ver }
}

const candidates = distroArg ? [distroArg] : distros
let chosen = null
let chosenProbe = null
const failures = []
for (const distro of candidates) {
  const probe = probeDistro(distro)
  if (probe.ok) {
    console.log(
      `${LABEL} 探测 ${distro} … ✓ node ${probe.nodeVer}（${probe.nodeBin}）、pnpm ${probe.pnpmVer}（${probe.pnpmBin}）`,
    )
    if (!chosen) {
      chosen = distro
      chosenProbe = probe
    }
  } else {
    failures.push({ distro, reason: probe.reason })
    console.log(`${LABEL} 探测 ${distro} … ✗ ${probe.reason}`)
  }
}

// ---------- 4. 仓库路径换算 + WSL 内可达性校验 ----------

const shellQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`

const wslRepo = winToWslPath(winToplevel)
if (!wslRepo) {
  fail(`仓库根「${winToplevel}」无法换算成 WSL 路径（只支持本地盘符 D:\\… → /mnt/d/…；UNC/网络盘请先在本地盘检出）`)
}
if (wslRepo.includes("'")) fail(`换算出的 WSL 路径含单引号，无法安全拼进 shell：${wslRepo}`)

/** 在发行版内验证：cd 可达 + git toplevel/HEAD 与 Windows 侧一致（防 /mnt 映射到别的检出） */
function verifyRepo(distro) {
  const script = [
    `cd ${shellQuote(wslRepo)} 2>/dev/null || { echo "cd_fail=1"; exit 0; }`,
    'echo "toplevel=$(git rev-parse --show-toplevel 2>&1)"',
    'echo "head=$(git rev-parse HEAD 2>&1)"',
  ].join('; ')
  const r = wslRun(distro, script)
  if (r.error) return { ok: false, reason: `调用失败（${String(r.error.message)}）` }
  if (r.status !== 0) {
    const tail = (r.stderr || r.stdout || '').trim().split(/\r?\n/).slice(-1)[0] ?? ''
    return { ok: false, reason: `校验命令退出码 ${r.status}${tail ? `（${tail}）` : ''}` }
  }
  const kv = parseKv(r.stdout)
  if (kv.cd_fail) return { ok: false, reason: `发行版内无法 cd 到 ${wslRepo}（/mnt 未挂该盘？路径不存在？）` }
  const top = kv.toplevel ?? ''
  const head = kv.head ?? ''
  if (/fatal:|command not found/i.test(top) || !top.startsWith('/')) {
    return { ok: false, reason: `发行版内 git 不可用或仓库不可读（${top || '无输出'}）——先按指引在发行版内装 git` }
  }
  if (top.toLowerCase() !== wslRepo.toLowerCase()) {
    return { ok: false, reason: `WSL 内 toplevel=${top} ≠ 期望 ${wslRepo}（/mnt 映射到了别的检出）` }
  }
  if (!/^[0-9a-f]{40}$/i.test(head)) {
    return { ok: false, reason: `WSL 内 HEAD 形状非法（${head || '无输出'}）——fail closed` }
  }
  if (head.toLowerCase() !== headSha.toLowerCase()) {
    return {
      ok: false,
      reason: `WSL 内 HEAD=${head.slice(0, 9)} ≠ Windows 侧 ${headSha.slice(0, 9)}（不同检出/不同工作树，证据会挂错树）`,
    }
  }
  return { ok: true, toplevel: top, head }
}

// 没有工具链齐备的发行版：探针模式借第一个能响应的发行版演示路径换算，然后 SKIP
if (!chosen) {
  if (probeOnly) {
    const diagDistro = candidates[0]
    const diag = verifyRepo(diagDistro)
    console.log(
      `${LABEL} 路径换算：${winToplevel} → ${wslRepo}（${diagDistro} 内${
        diag.ok ? `可达，HEAD=${diag.head.slice(0, 9)} 与 Windows 一致` : `不可用：${diag.reason}`
      }）`,
    )
  }
  skip(
    setupGuide(
      failures.length === 0
        ? '没有可用的 WSL 发行版'
        : `${failures[0].distro} 缺 Linux 原生 node + pnpm：${failures[0].reason}` +
            (failures.length > 1 ? `；另有 ${failures.length - 1} 个发行版同样不可用` : ''),
    ),
  )
}

const repoCheck = verifyRepo(chosen)
if (!repoCheck.ok) fail(`${chosen} 内仓库不可用：${repoCheck.reason}——fail closed`)
console.log(
  `${LABEL} 路径换算：${winToplevel} → ${wslRepo}；${chosen} 内 git 可达（HEAD ${repoCheck.head.slice(0, 9)}，与 Windows 一致）`,
)

// 工具链大版本不一致只是提示（可能造成与 CI 无关的差异，解释结果时要留意）
const winNodeMajor = process.versions.node.split('.')[0]
const wslNodeMajor = (chosenProbe.nodeVer.match(/^v(\d+)/) ?? [])[1]
if (wslNodeMajor && wslNodeMajor !== winNodeMajor) {
  console.log(
    `${LABEL} ⚠ Node 大版本不一致（Windows v${winNodeMajor} / WSL v${wslNodeMajor}）——结果差异可能来自工具链而非 OS，建议对齐后再判断`,
  )
}

// ---------- 5. --probe：只报环境，不执行 ----------

if (probeOnly) {
  console.log(`${LABEL} 选用发行版：${chosen}（${distroArg ? '--distro 指定' : '首个工具链齐备者'}）`)
  console.log(
    `${LABEL} 内部将执行：pnpm release:rehearse${passthrough.length ? ` ${passthrough.join(' ')}` : ''}（层：${requestedLayers.join(' + ')}）`,
  )
  console.log(`${LABEL} 探针结束（--probe 只读：不执行门禁、不写证据）。真跑：pnpm release:rehearse:wsl`)
  process.exit(0)
}

// ---------- 6. 在 WSL 内执行 release:rehearse（实时透传输出 + 保留尾部） ----------

const innerCmd = `cd ${shellQuote(wslRepo)} && pnpm release:rehearse${passthrough.length ? ` ${passthrough.join(' ')}` : ''}`

console.log('')
console.log(`${LABEL} ▶ 在 WSL 发行版 ${chosen}（${chosenProbe.nodeVer} / pnpm ${chosenProbe.pnpmVer}）内执行：`)
console.log(`${LABEL}   ${innerCmd.replace(/^cd '[^']*' && /, '')}`)
console.log(
  `${LABEL}   证据：<git-dir>/oas-release-rehearsal.json —— 与 Windows 侧同文件同格式，verify-rehearsal 直接可核验`,
)
console.log(`${LABEL}   注意：Linux 侧 pnpm install 会重写共享 node_modules；跑完回 Windows 建议重跑 pnpm install`)
console.log('')

/** 边跑边转发输出，同时保留尾部（失败时贴出来，不必让用户往上翻） */
function runStreaming(args) {
  return new Promise((resolve) => {
    const child = spawn('wsl.exe', args, { stdio: ['inherit', 'pipe', 'pipe'], windowsHide: true })
    const tail = []
    let tailChars = 0
    const keep = (chunk) => {
      const text = chunk.toString('utf8')
      tail.push(text)
      tailChars += text.length
      while (tailChars > 32000 && tail.length > 1) tailChars -= tail.shift().length
    }
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk)
      keep(chunk)
    })
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk)
      keep(chunk)
    })
    child.on('error', (err) => resolve({ code: -1, tail: `spawn 失败：${String(err.message)}` }))
    child.on('close', (code, signal) => {
      const lines = tail.join('').split(/\r?\n/)
      resolve({ code: signal ? -1 : (code ?? -1), signal, tail: lines.slice(-120).join('\n').trim() })
    })
  })
}

const result = await runStreaming(['-d', chosen, '-e', 'bash', '-lc', innerCmd])

if (result.code !== 0) {
  console.log('')
  console.error(
    `${LABEL} ✗ WSL 侧 rehearse 失败（exit ${result.code}${result.signal ? `，signal ${result.signal}` : ''}）`,
  )
  if (result.tail) {
    console.error(`${LABEL} ---- WSL 侧日志尾部（最近 120 行）----`)
    console.error(result.tail)
    console.error(`${LABEL} ---- 日志尾部结束（完整输出见上方）----`)
  }
  console.error(`${LABEL} 该层在证据文件里已记 ok:false（覆盖 Windows 侧的全绿记录，fail closed：任一侧红都不放行）。`)
  console.error(
    `${LABEL} 修复后重跑：pnpm release:rehearse:wsl${passthrough.length ? ` ${passthrough.join(' ')}` : ''}；` +
      `本机复现单步：wsl -d ${chosen} -e bash -lc ${shellQuote(innerCmd)}`,
  )
  process.exit(1)
}

console.log('')
if (listOnly) {
  console.log(`${LABEL} ✓ WSL 侧 --list 已打印步骤（不执行门禁、不写证据）。去掉 --list 才会真跑`)
  process.exit(0)
}
console.log(
  `${LABEL} ✓ WSL 侧 rehearse 通过（层：${requestedLayers.join(' + ')}）；证据与 Windows 侧同文件同格式，` +
    'verify-rehearsal 可直接核验',
)
console.log(
  `${LABEL} 提示：回 Windows 侧重跑一次 pnpm install（Linux 原生二进制替换了共享 node_modules）；` +
    '三层齐全后走 tag 流程',
)
