/**
 * rehearse-wsl 的纯函数层（无副作用，可被 node --test 直接导入）。
 *
 * 主脚本 scripts/release/rehearse-wsl.mjs 是 CLI：顶层即探测 WSL / 守卫工作树 / 执行门禁，
 * 被测试导入会真的跑流程（甚至 process.exit）。把解析逻辑拆到这里，测试只覆盖「输入 → 输出」
 * 的确定性部分（wsl.exe 列表编码差异、路径换算、key=value 解析、参数解析、镜像清单解析、
 * 容器命令行组装）。
 */

/**
 * 解码 wsl.exe 的列表输出。Windows 下 `wsl -l -q` 重定向时通常是 UTF-16LE（且版本间有差异：
 * 可能带 BOM、夹杂 NUL、个别版本吐 UTF-8），这里全部兼容：
 * 有 BOM 按 BOM；无 BOM 用「零字节密度」判定（ASCII 走 UTF-16LE 时每隔一字节就是 0x00）。
 *
 * @param {Buffer|Uint8Array|null} buf
 * @returns {string}
 */
export function decodeWslList(buf) {
  if (!buf || buf.length === 0) return ''
  const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString('utf16le')
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.from(bytes.subarray(2))
    // swap16 需要偶数长度；BE 文本落单字节时补一个 0 再交换（尾部多余 NUL 由 sanitizeDistros 清掉）
    if (swapped.length % 2 === 1)
      return Buffer.concat([swapped, Buffer.from([0])])
        .swap16()
        .toString('utf16le')
    return swapped.swap16().toString('utf16le')
  }
  let nul = 0
  for (const byte of bytes) if (byte === 0) nul++
  // UTF-16LE 下 ASCII 文本约一半字节为 0；UTF-8 文本几乎没有 0
  return nul > bytes.length / 4 ? bytes.toString('utf16le') : bytes.toString('utf8')
}

/**
 * 列表输出 → 发行版名数组：去 BOM / NUL / CR / 空行 / `-l -v` 的默认标记 `*` / 装饰行。
 *
 * @param {string} text
 * @returns {string[]}
 */
export function sanitizeDistros(text) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*+\s*/, ''))
    .filter((line) => line !== '' && line !== 'NAME' && line !== '(Default)')
}

/**
 * Windows 路径 → WSL 路径（D:\dev\oas-ui → /mnt/d/dev/oas-ui）；网络盘/UNC 不支持。
 *
 * @param {string} winPath
 * @returns {string|null}
 */
export function winToWslPath(winPath) {
  const p = winPath
    .replace(/\\/g, '/')
    .replace(/^\/\/\?\//, '')
    .replace(/\/+$/, '')
  const m = /^([A-Za-z]):(?:\/(.*))?$/.exec(p)
  if (!m) return null
  return m[2] ? `/mnt/${m[1].toLowerCase()}/${m[2]}` : `/mnt/${m[1].toLowerCase()}`
}

/**
 * 解析探测脚本的 `key=value` 行输出（忽略空行 / 非 key=value 行 / 首尾空白）。
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseKv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([a-z_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

/* ------------------------------ 容器模式（wslc） ------------------------------ */

/**
 * 容器模式常量。
 *
 * - 镜像默认从仓库 `.nvmrc` 推导（CI 同款 node 线；slim 变体不带 git（rehearse 需要 git），全量镜像带
 *   git + npm；Node 主版本与 CI / 本机口径一致。
 * - 镜像里没有现成的 pnpm，用镜像自带的 npm 现装一次（秒级）。
 */
export const DEFAULT_CONTAINER_IMAGE = defaultContainerImageFromNvmrc('')

/** 从 .nvmrc 文本推导容器镜像（取主版本号，缺省/异常回落 24——.nvmrc 是 CI 的 node 版本单一事实源） */
export function defaultContainerImageFromNvmrc(nvmrcText) {
  try {
    const m = /\bv?(\d+)\b/.exec(String(nvmrcText ?? '').trim())
    if (m) return `node:${m[1]}-bookworm`
  } catch {
    // 忽略：回落默认
  }
  return 'node:24-bookworm'
}
export const CONTAINER_PNPM_VERSION = '12.5.1'
export const CONTAINER_REPO_PATH = '/repo'

/** 允许透传给内部 rehearse 的参数白名单（写死，避免任意串进 shell 命令行） */
export const PASSTHROUGH_FLAGS = ['--with-e2e', '--with-ssr-e2e', '--quiet', '--list']

const PASSTHROUGH = new Set(PASSTHROUGH_FLAGS)

/**
 * 解析 CLI 参数（纯函数，不做任何 IO）。
 *
 * 返回结构化结果而不是直接退出：主脚本负责把 `error` 打到 stderr 后 exit 1，
 * 测试只验证「输入 argv → 输出结构」。
 *
 * @param {string[]} argv 不含 node / 脚本名的参数列表
 * @returns {{
 *   help: boolean,
 *   probeOnly: boolean,
 *   container: boolean,
 *   distro: string|null,
 *   image: string|null,
 *   passthrough: string[],
 *   error: string|null,
 * }}
 */
export function parseArgs(argv) {
  const out = {
    help: false,
    probeOnly: false,
    container: false,
    distro: null,
    image: null,
    passthrough: [],
    error: null,
  }
  const withError = (error) => ({ ...out, error })

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    // --help 原来在循环里立即生效（后面的参数不再校验），保持同样语义
    if (arg === '--help' || arg === '-h') return { ...out, help: true }
    if (arg === '--') {
      return withError(
        '不支持 `--`（pnpm 12 会把它原样传给脚本，内部 rehearse 会当成未知参数）；直接写 `--with-e2e` 这类旗标即可',
      )
    }
    if (arg === '--probe') {
      out.probeOnly = true
    } else if (arg === '--container') {
      out.container = true
    } else if (arg === '--distro') {
      const value = argv[++i]
      if (!value) return withError('--distro 需要跟一个发行版名（用 wsl -l -q 查看）')
      out.distro = value
    } else if (arg.startsWith('--distro=')) {
      const value = arg.slice('--distro='.length)
      if (!value) return withError('--distro= 后面需要发行版名')
      out.distro = value
    } else if (arg === '--image') {
      const value = argv[++i]
      if (!value) return withError('--image 需要跟镜像名（如 node:24-bookworm；wslc image ls 可查看本地镜像）')
      out.image = value
    } else if (arg.startsWith('--image=')) {
      const value = arg.slice('--image='.length)
      if (!value) return withError('--image= 后面需要镜像名（如 node:24-bookworm）')
      out.image = value
    } else if (PASSTHROUGH.has(arg)) {
      out.passthrough.push(arg)
    } else {
      return withError(
        `未知参数「${arg}」——只接受 --probe / --distro <名> / --container / --image <名:tag> / ` +
          '--with-e2e / --with-ssr-e2e / --quiet / --list',
      )
    }
  }

  // 两种模式互斥：容器模式跑 OCI 容器，不涉及发行版；--image 也只有容器模式认得
  if (out.container && out.distro) {
    return withError('--distro 与 --container 互斥：容器模式在 OCI 容器里跑，不用发行版（去掉 --distro）')
  }
  if (out.image !== null && !out.container) {
    return withError('--image 只在 --container 模式下有效（镜像属于容器模式）')
  }
  return out
}

/**
 * 镜像引用规范化：无 tag 补 `:latest`；registry 端口（host:5000/repo）不当成 tag。
 *
 * @param {string} ref
 * @returns {string|null}
 */
export function normalizeImageRef(ref) {
  const value = String(ref ?? '').trim()
  if (!value) return null
  // 摘要引用（repo@sha256:…）原样保留，由 findImage 单独按 repo 比对
  if (value.includes('@')) return value
  const tail = value.slice(value.lastIndexOf('/') + 1)
  return tail.includes(':') ? value : `${value}:latest`
}

/**
 * 解析 `wslc image ls` 输出，两种形态都认（与本地化无关）：
 * - `--format json`：每行一个 JSON 对象（Repository / Tag 字段）
 * - 表格：`存储库  标记  图像 ID  已创建  大小`（英文版表头为 REPOSITORY TAG …）
 *
 * @param {string} text
 * @returns {Array<{repo: string, tag: string}>}
 */
export function parseImageList(text) {
  const out = []
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    if (line.startsWith('{')) {
      try {
        const obj = JSON.parse(line)
        const repo = typeof obj?.Repository === 'string' ? obj.Repository.trim() : ''
        const tag = obj?.Tag === undefined || obj?.Tag === null ? '' : String(obj.Tag).trim()
        if (repo !== '' && repo !== '<none>') out.push({ repo, tag })
        continue
      } catch {
        // 非法 JSON：落到表格解析，避免整行丢弃后误判「镜像不存在」
      }
    }
    const cols = line
      .split(/\s{2,}/)
      .map((s) => s.trim())
      .filter((s) => s !== '')
    if (cols.length < 2) continue
    if (/^(REPOSITORY|存储库)$/i.test(cols[0])) continue // 表头
    const [repo, tag] = cols
    if (repo === '<none>') continue
    out.push({ repo, tag })
  }
  return out
}

/**
 * 在镜像清单里找指定引用；找不到返回 null。
 *
 * @param {Array<{repo: string, tag: string}>} list
 * @param {string} ref
 * @returns {{repo: string, tag: string}|null}
 */
export function findImage(list, ref) {
  const norm = normalizeImageRef(ref)
  if (!norm) return null
  if (norm.includes('@')) {
    const repo = norm.slice(0, norm.indexOf('@'))
    return list.find((item) => item.repo === repo) ?? null
  }
  const cut = norm.lastIndexOf(':')
  const repo = norm.slice(0, cut)
  const tag = norm.slice(cut + 1)
  return list.find((item) => item.repo === repo && item.tag === tag) ?? null
}

/**
 * 组装 `wslc run` 参数（`-v` 直接吃 Windows 路径，不需要 /mnt 换算）。
 *
 * 产物形如：
 *   wslc run --rm -v <winTop>:/repo -w /repo node:24-bookworm bash -lc '<script>'
 * 不传 winTop 时是纯探针（无挂载）：`wslc run --rm <image> bash -c '<script>'`。
 *
 * @param {{ image: string, script: string, winTop?: string|null, loginShell?: boolean }} opts
 * @returns {string[]}
 */
export function buildContainerArgs({ image, script, winTop = null, loginShell = true }) {
  const args = ['run', '--rm']
  if (winTop) {
    const mountSource = String(winTop).replace(/[\\/]+$/, '')
    args.push('-v', `${mountSource}:${CONTAINER_REPO_PATH}`, '-w', CONTAINER_REPO_PATH)
  }
  args.push(image, 'bash', loginShell ? '-lc' : '-c', script)
  return args
}

/**
 * 容器内执行脚本：现装 pnpm 后跑仓库自己的 rehearse（参数透传，已被白名单过滤）。
 *
 * @param {{ passthrough?: string[], pnpmVersion?: string }} [opts]
 * @returns {string}
 */
export function buildContainerScript({ passthrough = [], pnpmVersion = CONTAINER_PNPM_VERSION } = {}) {
  const install = `npm i -g pnpm@${pnpmVersion} --no-audit --no-fund >/dev/null 2>&1`
  const rehearse = `pnpm release:rehearse${passthrough.length ? ` ${passthrough.join(' ')}` : ''}`
  return `${install} && ${rehearse}`
}

/**
 * 容器内工具链探针脚本（用 `&&`：node 缺失时不继续，由解析器定位缺哪个）。
 *
 * @returns {string}
 */
export function buildToolchainProbeScript() {
  return 'node -v && git --version'
}

/**
 * 解析探针输出（`v26.13.0` / `git version 2.39.5`）。
 *
 * @param {string} text
 * @returns {{ok: true, nodeVer: string, gitVer: string}|{ok: false, reason: string}}
 */
export function parseContainerToolchain(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  const nodeVer = lines.map((line) => /^v\d+\.\d+\.\d+/.exec(line)).find(Boolean)?.[0] ?? ''
  const gitVer = lines.map((line) => /^git version (\d+\.\d+\.\d+)/.exec(line)).find(Boolean)?.[1] ?? ''
  if (!nodeVer) {
    return { ok: false, reason: `容器内 node 不可用（node -v 无有效版本输出：${JSON.stringify(lines[0] ?? '')}）` }
  }
  if (!gitVer) {
    return {
      ok: false,
      reason:
        `容器内 git 不可用（git --version 无有效版本输出：${JSON.stringify(lines[1] ?? '')}）` +
        '——slim 镜像不带 git，改用 node:24-bookworm 这类全量镜像',
    }
  }
  return { ok: true, nodeVer, gitVer }
}

/**
 * 容器内仓库校验脚本：cd 可达 + toplevel/HEAD（与发行版模式同口径，防挂载到别的检出）。
 *
 * @returns {string}
 */
export function buildContainerRepoCheckScript() {
  return [
    `cd ${CONTAINER_REPO_PATH} 2>/dev/null || { echo "cd_fail=1"; exit 0; }`,
    'echo "toplevel=$(git rev-parse --show-toplevel 2>&1)"',
    'echo "head=$(git rev-parse HEAD 2>&1)"',
  ].join('; ')
}

/**
 * 从 package.json 的 `packageManager` 字段取 pnpm 版本（取不到退回常量，避免版本漂移）。
 *
 * @param {string} json
 * @returns {string}
 */
export function pnpmVersionFromPackageJson(json) {
  try {
    const m = /"packageManager"\s*:\s*"pnpm@(\d+\.\d+\.\d+)"/.exec(String(json ?? ''))
    if (m) return m[1]
  } catch {
    // 忽略：退回默认版本
  }
  return CONTAINER_PNPM_VERSION
}
