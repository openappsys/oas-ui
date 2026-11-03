import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildContainerArgs,
  buildContainerRepoCheckScript,
  buildContainerScript,
  buildToolchainProbeScript,
  buildVolumeCopyEvidenceArgs,
  buildVolumeCreateArgs,
  buildVolumeHeadCheckArgs,
  buildVolumeRemoveArgs,
  buildVolumeRunArgs,
  buildVolumeSeedArgs,
  buildVolumeSeedScript,
  CONTAINER_PNPM_VERSION,
  decodeWslList,
  DEFAULT_CONTAINER_IMAGE,
  DEFAULT_VOLUME_CPUS,
  DEFAULT_VOLUME_MEMORY,
  DEFAULT_VOLUME_SHM_SIZE,
  defaultContainerImageFromNvmrc,
  findImage,
  normalizeImageRef,
  REHEARSE_VOLUME_NAME,
  VOLUME_EVIDENCE_REL_PATH,
  parseArgs,
  parseContainerToolchain,
  parseImageList,
  parseKv,
  pnpmVersionFromPackageJson,
  sanitizeDistros,
  winToWslPath,
} from './rehearse-wsl-lib.mjs'

/* ------------------------------ winToWslPath ------------------------------ */

// 被测函数就是路径换算器，输入必须是 Windows 盘符 / UNC 路径。源码里把盘符拆开拼接：
// 本文件所在的 scripts/ 受「测试禁硬编码绝对路径」守卫扫描（qa-regression/conventions.test.ts），
// 直接写盘符绝对路径字面量会被当成「本机路径写死」误报。
const DRIVE = 'D'
const UNC = '\\\\?\\'

test('winToWslPath：盘符路径换算为 /mnt/<小写盘符>/…', () => {
  assert.equal(winToWslPath(`${DRIVE}:\\dev\\oas-ui`), '/mnt/d/dev/oas-ui')
  assert.equal(winToWslPath(`${DRIVE}:\\`), '/mnt/d')
  assert.equal(winToWslPath(`${DRIVE.toLowerCase()}:/dev/oas-ui`), '/mnt/d/dev/oas-ui')
})

test('winToWslPath：去掉 \\\\?\\ 前缀与尾部斜杠，非盘符路径返回 null', () => {
  assert.equal(winToWslPath(`${UNC}${DRIVE}:\\dev\\oas-ui\\`), '/mnt/d/dev/oas-ui')
  assert.equal(winToWslPath(`${DRIVE}:\\dev\\oas-ui\\\\\\`), '/mnt/d/dev/oas-ui')
  assert.equal(winToWslPath('\\\\server\\share\\repo'), null)
  assert.equal(winToWslPath('/root/repo'), null)
  assert.equal(winToWslPath(''), null)
})

/* ------------------------------ decodeWslList ----------------------------- */

test('decodeWslList：UTF-16LE 带 BOM', () => {
  const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Ubuntu\r\nDebian\r\n', 'utf16le')])
  assert.equal(decodeWslList(buf), 'Ubuntu\r\nDebian\r\n')
})

test('decodeWslList：UTF-16BE 带 BOM（字节序交换）', () => {
  const le = Buffer.from('Ubuntu\r\n', 'utf16le')
  const be = Buffer.from(le)
  be.swap16()
  const buf = Buffer.concat([Buffer.from([0xfe, 0xff]), be])
  assert.equal(decodeWslList(buf), 'Ubuntu\r\n')
})

test('decodeWslList：无 BOM 的 UTF-16LE（零字节密度判定）与纯 UTF-8', () => {
  assert.equal(decodeWslList(Buffer.from('Ubuntu\r\nDebian\r\n', 'utf16le')), 'Ubuntu\r\nDebian\r\n')
  assert.equal(decodeWslList(Buffer.from('Ubuntu\r\n', 'utf8')), 'Ubuntu\r\n')
})

test('decodeWslList：空输入与 NUL 夹杂', () => {
  assert.equal(decodeWslList(null), '')
  assert.equal(decodeWslList(Buffer.alloc(0)), '')
  // UTF-16LE 未去 BOM 且带尾随 NUL：解码后含 \u0000，交给 sanitizeDistros 清理
  const withNul = Buffer.from('Ubuntu\r\n\u0000', 'utf16le')
  assert.equal(sanitizeDistros(decodeWslList(withNul)).join(','), 'Ubuntu')
})

/* ----------------------------- sanitizeDistros ---------------------------- */

test('sanitizeDistros：去掉默认标记 *、空行、CRLF、BOM/NUL 与装饰行', () => {
  const text = '\uFEFFNAME\r\n* Ubuntu\r\nDebian\r\n\r\n\u0000\r\n(Default)\r\n'
  assert.deepEqual(sanitizeDistros(text), ['Ubuntu', 'Debian'])
})

test('sanitizeDistros：多星号前缀与首尾空白一并清理', () => {
  assert.deepEqual(sanitizeDistros('** Ubuntu  \n  Debian \n'), ['Ubuntu', 'Debian'])
})

/* -------------------------------- parseKv -------------------------------- */

test('parseKv：解析 node_bin / pnpm_ver 等 key=value 行并去空白', () => {
  const text = ['node_bin=/usr/bin/node', 'node_ver=v24.1.0', 'pnpm_ver=12.5.1', ''].join('\n')
  assert.deepEqual(parseKv(text), {
    node_bin: '/usr/bin/node',
    node_ver: 'v24.1.0',
    pnpm_ver: '12.5.1',
  })
})

test('parseKv：忽略非 key=value 行与空值，保留后出现的同名键（CRLF 同解析）', () => {
  const text = ['WARNING: something', 'node_bin=', 'node_bin=/usr/local/bin/node', 'bad line', 'cd_fail=1'].join('\r\n')
  assert.deepEqual(parseKv(text), { node_bin: '/usr/local/bin/node', cd_fail: '1' })
})

/* --------------------------------- parseArgs -------------------------------- */

const EMPTY_ARGS = {
  help: false,
  probeOnly: false,
  container: false,
  volume: false,
  distro: null,
  image: null,
  cpus: null,
  memory: null,
  passthrough: [],
  error: null,
}

test('parseArgs：空参数 = 发行版模式 + 默认层', () => {
  assert.deepEqual(parseArgs([]), EMPTY_ARGS)
})

test('parseArgs：发行版模式 --probe / --distro（两种写法）/ 透传白名单', () => {
  assert.deepEqual(parseArgs(['--probe', '--distro=Ubuntu', '--with-e2e', '--quiet']), {
    ...EMPTY_ARGS,
    probeOnly: true,
    distro: 'Ubuntu',
    passthrough: ['--with-e2e', '--quiet'],
  })
  assert.equal(parseArgs(['--distro', 'Debian']).distro, 'Debian')
})

test('parseArgs：容器模式 --container / --image 两种写法，透传顺序保留', () => {
  assert.deepEqual(parseArgs(['--container', '--probe']), { ...EMPTY_ARGS, container: true, probeOnly: true })
  const spaced = parseArgs(['--container', '--image', 'node:24-bookworm', '--with-ssr-e2e'])
  assert.equal(spaced.container, true)
  assert.equal(spaced.image, 'node:24-bookworm')
  assert.deepEqual(spaced.passthrough, ['--with-ssr-e2e'])
  assert.equal(spaced.error, null)
  // --image 不隐含 --container，也不吞掉后续旗标
  assert.equal(parseArgs(['--container', '--image=node:24-bookworm', '--list']).image, 'node:24-bookworm')
})

test('parseArgs：--distro 与 --container 互斥、--image 必须配 --container 或 --volume', () => {
  assert.match(parseArgs(['--container', '--distro', 'Ubuntu']).error, /互斥/)
  assert.match(parseArgs(['--container', '--distro=Ubuntu']).error, /互斥/)
  assert.match(parseArgs(['--image', 'node:26-bookworm']).error, /--container \/ --volume/)
  assert.match(parseArgs(['--image=node:26-bookworm', '--probe']).error, /--container/)
})

test('parseArgs：缺值 / 未知参数 / `--` 返回 error（主脚本负责打印并退出，不在 lib 里退出）', () => {
  for (const argv of [['--distro'], ['--distro='], ['--image'], ['--image='], ['--'], ['--bogus'], ['-x']]) {
    const result = parseArgs(argv)
    assert.ok(result.error, `${argv.join(' ')} 应解析失败`)
    assert.deepEqual(result.passthrough, [])
  }
  assert.match(parseArgs(['--']).error, /不支持 `--`/)
  assert.match(parseArgs(['--bogus']).error, /未知参数「--bogus」/)
  assert.match(parseArgs(['--distro']).error, /--distro 需要跟一个发行版名/)
  assert.match(parseArgs(['--image']).error, /--image 需要跟镜像名/)
})

test('parseArgs：--help / -h 短路（后续参数不再校验）', () => {
  assert.equal(parseArgs(['--help', '--bogus']).help, true)
  assert.equal(parseArgs(['--help', '--bogus']).error, null)
  assert.equal(parseArgs(['-h']).help, true)
  assert.equal(parseArgs(['--with-e2e', '--help']).help, true)
})

/* ------------------------- 镜像引用 / 镜像清单解析 ------------------------- */

test('normalizeImageRef：无 tag 补 latest，registry 端口不当 tag', () => {
  assert.equal(normalizeImageRef('node'), 'node:latest')
  assert.equal(normalizeImageRef(' node:26-bookworm '), 'node:26-bookworm')
  assert.equal(normalizeImageRef('library/node'), 'library/node:latest')
  assert.equal(normalizeImageRef('localhost:5000/repo'), 'localhost:5000/repo:latest')
  assert.equal(normalizeImageRef('localhost:5000/repo:1.0'), 'localhost:5000/repo:1.0')
  assert.equal(normalizeImageRef('node@sha256:abc'), 'node@sha256:abc')
  assert.equal(normalizeImageRef(''), null)
  assert.equal(normalizeImageRef(null), null)
})

test('parseImageList：--format json 逐行解析，无仓库名（<none>）条目跳过', () => {
  const text = [
    '{"Repository":"node","Tag":"26-bookworm","ID":"eee260898870"}',
    '{"Repository":"node","Tag":"26-bookworm-slim","ID":"08fc0796a2b9"}',
    '{"Repository":"<none>","Tag":"<none>","ID":"deadbeef"}',
    '',
  ].join('\n')
  assert.deepEqual(parseImageList(text), [
    { repo: 'node', tag: '26-bookworm' },
    { repo: 'node', tag: '26-bookworm-slim' },
  ])
})

test('parseImageList：中文表格（wslc 默认输出）跳过表头，按 ≥2 空格分列', () => {
  const text = [
    '存储库                 标记                 图像 ID          已创建       大小',
    'node                26-bookworm        eee260898870   5 天前      1.15GB',
    'alpine              latest             b92841763c5c   12 天前     8.43MB',
    '',
  ].join('\r\n')
  assert.deepEqual(parseImageList(text), [
    { repo: 'node', tag: '26-bookworm' },
    { repo: 'alpine', tag: 'latest' },
  ])
})

test('parseImageList：英文表头同样跳过；坏 JSON 行退回表格解析', () => {
  const english = [
    'REPOSITORY   TAG   IMAGE ID   CREATED   SIZE',
    'node   26-bookworm   eee260898870   5 days ago   1.15GB',
  ].join('\n')
  assert.deepEqual(parseImageList(english), [{ repo: 'node', tag: '26-bookworm' }])

  const broken = ['{oops', 'node   26-bookworm   eee   5 days ago   1.15GB'].join('\n')
  assert.deepEqual(parseImageList(broken), [{ repo: 'node', tag: '26-bookworm' }])
})

test('parseImageList：空输入 / null / 只有表头 → []', () => {
  assert.deepEqual(parseImageList(''), [])
  assert.deepEqual(parseImageList(null), [])
  assert.deepEqual(parseImageList('存储库   标记   图像 ID'), [])
})

test('findImage：命中 / 默认 latest / 未命中', () => {
  const images = [
    { repo: 'node', tag: '26-bookworm' },
    { repo: 'node', tag: 'latest' },
    { repo: 'alpine', tag: 'latest' },
  ]
  assert.deepEqual(findImage(images, 'node:26-bookworm'), { repo: 'node', tag: '26-bookworm' })
  assert.deepEqual(findImage(images, 'alpine'), { repo: 'alpine', tag: 'latest' })
  assert.equal(findImage(images, 'node:24-bookworm'), null)
  assert.equal(findImage(images, 'node:26-bookworm-slim'), null)
  assert.equal(findImage([], 'node'), null)
  assert.equal(findImage(images, ''), null)
})

test('findImage：摘要引用（repo@sha256:…）按仓库名比对', () => {
  const images = [{ repo: 'node', tag: '26-bookworm' }]
  assert.deepEqual(findImage(images, 'node@sha256:abc'), { repo: 'node', tag: '26-bookworm' })
  assert.equal(findImage(images, 'php@sha256:abc'), null)
})

/* ------------------------------ 容器命令行组装 ------------------------------ */

test('buildContainerArgs：挂载 Windows 路径（-v 直吃盘符路径，不做 /mnt 换算）', () => {
  const args = buildContainerArgs({
    image: 'node:26-bookworm',
    script: 'echo hi',
    winTop: `${DRIVE}:\\dev\\repo`,
  })
  assert.deepEqual(args, [
    'run',
    '--rm',
    '-v',
    `${DRIVE}:\\dev\\repo:/repo`,
    '-w',
    '/repo',
    'node:26-bookworm',
    'bash',
    '-lc',
    'echo hi',
  ])
})

test('buildContainerArgs：去掉挂载源尾部斜杠，避免 D:/repo/:/repo 这类坏挂载', () => {
  const args = buildContainerArgs({
    image: 'node:26-bookworm',
    script: 'true',
    winTop: `${DRIVE}:\\dev\\repo\\`,
  })
  assert.equal(args[3], `${DRIVE}:\\dev\\repo:/repo`)
  assert.equal(args[4], '-w')
  assert.equal(args[5], '/repo')
})

test('buildContainerArgs：探针无挂载 + 非 login shell（bash -c）', () => {
  assert.deepEqual(buildContainerArgs({ image: 'node:26-bookworm', script: 'node -v', loginShell: false }), [
    'run',
    '--rm',
    'node:26-bookworm',
    'bash',
    '-c',
    'node -v',
  ])
})

test('buildContainerScript：现装 pnpm 后跑 rehearse（默认版本取常量）', () => {
  assert.equal(DEFAULT_CONTAINER_IMAGE, 'node:24-bookworm')
  assert.equal(defaultContainerImageFromNvmrc('24.22.2'), 'node:24-bookworm')
  assert.equal(defaultContainerImageFromNvmrc('v26'), 'node:26-bookworm')
  assert.equal(defaultContainerImageFromNvmrc(''), 'node:24-bookworm')
  assert.equal(defaultContainerImageFromNvmrc('garbage'), 'node:24-bookworm')
  assert.equal(CONTAINER_PNPM_VERSION, '12.5.1')
  assert.equal(
    buildContainerScript(),
    `npm i -g pnpm@${CONTAINER_PNPM_VERSION} --no-audit --no-fund >/dev/null 2>&1 && pnpm release:rehearse`,
  )
})

test('buildContainerScript：透传参数按序追加末尾，pnpm 版本可覆盖', () => {
  assert.equal(
    buildContainerScript({ passthrough: ['--with-e2e', '--with-ssr-e2e', '--quiet'], pnpmVersion: '12.9.9' }),
    'npm i -g pnpm@12.9.9 --no-audit --no-fund >/dev/null 2>&1 && ' +
      'pnpm release:rehearse --with-e2e --with-ssr-e2e --quiet',
  )
})

/* ------------------------------ 主脚本 --help 文案 ------------------------------ */

// --help 段住在主脚本里（不是 lib），而主脚本有「仅 Windows 可跑」的平台守卫：
// 直接 spawn 断言在 Linux CI 上会先被守卫挡掉 → 改源码级断言，防这条副作用提示被误删。
test('--help 输出含共享 node_modules 副作用提示（回 Windows 需重跑 pnpm install）', () => {
  const source = readFileSync(new URL('./rehearse-wsl.mjs', import.meta.url), 'utf8')
  const from = source.indexOf('if (args.help)')
  const to = source.indexOf('const probeOnly')
  assert.ok(from > 0 && to > from, '主脚本 --help 段结构变了，请同步本断言')
  const helpBlock = source.slice(from, to)
  assert.match(helpBlock, /node_modules/, '--help 应说明共享 node_modules 被重写')
  assert.match(helpBlock, /pnpm install/, '--help 应提示回 Windows 需重跑 pnpm install')
})

test('--help 输出含三模式对比与卷模式说明（固定卷名单实例 + 9P 墙钟伪影 + 不碰 node_modules）', () => {
  const source = readFileSync(new URL('./rehearse-wsl.mjs', import.meta.url), 'utf8')
  const from = source.indexOf('if (args.help)')
  const to = source.indexOf('const probeOnly')
  const helpBlock = source.slice(from, to)
  assert.match(helpBlock, /--volume/, '--help 应含卷模式入口')
  assert.match(helpBlock, /oas-rehearse/, '--help 应注明固定卷名（单实例语义）')
  assert.match(helpBlock, /9P/, '--help 应说明为何选卷（9P wall-clock 伪影）')
  assert.match(helpBlock, /src:ro/, '--help 应说明卷模式只读挂载工作树')
})

test('buildToolchainProbeScript：node 与 git 版本各一行（&& 保证 node 缺失时不继续）', () => {
  assert.equal(buildToolchainProbeScript(), 'node -v && git --version')
})

test('parseContainerToolchain：正常输出解析出版本', () => {
  assert.deepEqual(parseContainerToolchain('v26.13.0\ngit version 2.39.5\n'), {
    ok: true,
    nodeVer: 'v26.13.0',
    gitVer: '2.39.5',
  })
})

test('parseContainerToolchain：忽略噪声行、空行与 CRLF', () => {
  const text = ['', 'npm notice something', 'v24.1.0  ', '', 'git version 2.43.0', ''].join('\r\n')
  assert.deepEqual(parseContainerToolchain(text), { ok: true, nodeVer: 'v24.1.0', gitVer: '2.43.0' })
})

test('parseContainerToolchain：缺 node / 缺 git 分别给出可定位的原因', () => {
  const noNode = parseContainerToolchain('bash: line 1: node: command not found')
  assert.equal(noNode.ok, false)
  assert.match(noNode.reason, /node/)

  const noGit = parseContainerToolchain('v26.13.0\nbash: line 1: git: command not found')
  assert.equal(noGit.ok, false)
  assert.match(noGit.reason, /git/)
  assert.match(noGit.reason, /slim/)
})

test('buildContainerRepoCheckScript：cd /repo + toplevel/HEAD 输出，cd 失败也退出 0 交给解析器判定', () => {
  const script = buildContainerRepoCheckScript()
  assert.match(script, /cd \/repo/)
  assert.match(script, /cd_fail=1/)
  assert.match(script, /toplevel=\$\(git rev-parse --show-toplevel/)
  assert.match(script, /head=\$\(git rev-parse HEAD/)
})

test('pnpmVersionFromPackageJson：取 packageManager 的 pnpm 版本，取不到退回常量', () => {
  assert.equal(pnpmVersionFromPackageJson('{"packageManager":"pnpm@12.5.1"}'), '12.5.1')
  assert.equal(pnpmVersionFromPackageJson('{"packageManager":"pnpm@13.0.0"}'), '13.0.0')
  assert.equal(pnpmVersionFromPackageJson('{}'), CONTAINER_PNPM_VERSION)
  assert.equal(pnpmVersionFromPackageJson('not json'), CONTAINER_PNPM_VERSION)
  assert.equal(pnpmVersionFromPackageJson('{"packageManager":"npm@10.0.0"}'), CONTAINER_PNPM_VERSION)
  assert.equal(pnpmVersionFromPackageJson(null), CONTAINER_PNPM_VERSION)
})

/* ------------------------------ 卷模式（wslc volume） ------------------------------ */

test('parseArgs：--volume 模式解析；distro/container/volume 三模式两两互斥', () => {
  assert.deepEqual(parseArgs(['--volume', '--with-e2e']), {
    ...EMPTY_ARGS,
    volume: true,
    passthrough: ['--with-e2e'],
  })
  assert.match(parseArgs(['--volume', '--distro', 'Ubuntu']).error, /互斥/)
  assert.match(parseArgs(['--volume', '--distro=Ubuntu']).error, /互斥/)
  assert.match(parseArgs(['--volume', '--container']).error, /互斥/)
  // 原有 container+distro 互斥保持不变
  assert.match(parseArgs(['--container', '--distro', 'Ubuntu']).error, /互斥/)
})

test('parseArgs：--image / --cpus / --memory 对 --volume 生效（含 = 写法）', () => {
  const spaced = parseArgs(['--volume', '--image', 'node:26-bookworm', '--cpus', '4', '--memory', '8G'])
  assert.equal(spaced.volume, true)
  assert.equal(spaced.image, 'node:26-bookworm')
  assert.equal(spaced.cpus, '4')
  assert.equal(spaced.memory, '8G')
  assert.equal(spaced.error, null)
  const eq = parseArgs(['--volume', '--cpus=2', '--memory=512M'])
  assert.equal(eq.cpus, '2')
  assert.equal(eq.memory, '512M')
  // --image 同时认 container 与 volume
  assert.equal(parseArgs(['--volume', '--image=node:26-bookworm']).image, 'node:26-bookworm')
  assert.equal(parseArgs(['--container', '--image=node:26-bookworm']).image, 'node:26-bookworm')
})

test('parseArgs：--cpus/--memory 只在 --volume 下有效；值形状校验；缺值报错', () => {
  assert.match(parseArgs(['--cpus', '4']).error, /只在 --volume/)
  assert.match(parseArgs(['--memory', '8G']).error, /只在 --volume/)
  assert.match(parseArgs(['--container', '--cpus', '4']).error, /只在 --volume/)
  assert.match(parseArgs(['--volume', '--cpus', '0']).error, /正整数/)
  assert.match(parseArgs(['--volume', '--cpus', 'abc']).error, /正整数/)
  assert.match(parseArgs(['--volume', '--cpus', '2.5']).error, /正整数/)
  assert.match(parseArgs(['--volume', '--memory', '12liters']).error, /--memory/)
  assert.match(parseArgs(['--volume', '--cpus']).error, /--cpus 需要跟/)
  assert.match(parseArgs(['--volume', '--memory']).error, /--memory 需要跟/)
  assert.equal(parseArgs(['--volume', '--cpus', '8', '--memory', '12G']).error, null)
  assert.equal(parseArgs(['--volume', '--memory', '1073741824']).error, null)
})

test('buildVolumeCreateArgs / buildVolumeRemoveArgs：卷名固定（单实例语义），先删后建', () => {
  assert.equal(REHEARSE_VOLUME_NAME, 'oas-rehearse')
  assert.deepEqual(buildVolumeCreateArgs(), ['volume', 'create', 'oas-rehearse'])
  assert.deepEqual(buildVolumeRemoveArgs(), ['volume', 'remove', 'oas-rehearse'])
  // 传自定义卷名也可（保留扩展位，脚本固定用默认值）
  assert.deepEqual(buildVolumeCreateArgs('other'), ['volume', 'create', 'other'])
})

test('buildVolumeSeedArgs：播种双挂载——工作树只读（/src:ro）+ 卷可写（/repo）', () => {
  const args = buildVolumeSeedArgs({
    image: 'node:26-bookworm',
    script: 'cp -a /src/. /repo/',
    winTop: `${DRIVE}:\\dev\\repo`,
  })
  assert.deepEqual(args, [
    'run',
    '--rm',
    '-v',
    `${DRIVE}:\\dev\\repo:/src:ro`, // ro 标记：播种源绝不反写工作树
    '-v',
    'oas-rehearse:/repo',
    'node:26-bookworm',
    'bash',
    '-lc',
    'cp -a /src/. /repo/',
  ])
})

test('buildVolumeSeedArgs：去掉挂载源尾部斜杠', () => {
  const args = buildVolumeSeedArgs({ image: 'i', script: 'true', winTop: `${DRIVE}:\\dev\\repo\\` })
  assert.equal(args[3], `${DRIVE}:\\dev\\repo:/src:ro`)
})

test('buildVolumeSeedScript：tar 拷贝（排除 node_modules）+ 现装 pnpm + --frozen-lockfile 安装', () => {
  assert.equal(
    buildVolumeSeedScript(),
    `tar -C /src --exclude=node_modules -cf - . | tar -C /repo -xf - && npm i -g pnpm@${CONTAINER_PNPM_VERSION} --no-audit --no-fund && cd /repo && pnpm install --frozen-lockfile`,
  )
  assert.equal(
    buildVolumeSeedScript({ pnpmVersion: '12.9.9' }),
    'tar -C /src --exclude=node_modules -cf - . | tar -C /repo -xf - && npm i -g pnpm@12.9.9 --no-audit --no-fund && cd /repo && pnpm install --frozen-lockfile',
  )
})

test('buildVolumeRunArgs：默认资源旗标显式（默认限额下全量 vitest 随机超时）+ 卷挂载 + -w /repo', () => {
  assert.equal(DEFAULT_VOLUME_CPUS, 8)
  assert.equal(DEFAULT_VOLUME_MEMORY, '12G')
  assert.equal(DEFAULT_VOLUME_SHM_SIZE, '2G')
  const args = buildVolumeRunArgs({ image: 'node:26-bookworm', script: 'pnpm release:rehearse' })
  assert.deepEqual(args, [
    'run',
    '--rm',
    '--cpus',
    '8',
    '--memory',
    '12G',
    '--shm-size',
    '2G',
    '-v',
    'oas-rehearse:/repo',
    '-w',
    '/repo',
    'node:26-bookworm',
    'bash',
    '-lc',
    'pnpm release:rehearse',
  ])
})

test('buildVolumeRunArgs：--cpus/--memory 覆盖生效（shm-size 固定不暴露覆盖位）', () => {
  const args = buildVolumeRunArgs({ image: 'node:26-bookworm', script: 'true', cpus: 4, memory: '8G' })
  assert.deepEqual(args.slice(2, 8), ['--cpus', '4', '--memory', '8G', '--shm-size', '2G'])
})

test('buildVolumeHeadCheckArgs：挂卷探针（非 login shell）+ 复用容器 repo 校验脚本', () => {
  const args = buildVolumeHeadCheckArgs({ image: 'node:26-bookworm' })
  assert.deepEqual(args, [
    'run',
    '--rm',
    '-v',
    'oas-rehearse:/repo',
    'node:26-bookworm',
    'bash',
    '-c',
    buildContainerRepoCheckScript(),
  ])
})

test('buildVolumeCopyEvidenceArgs：辅助容器把卷内证据拷回真仓 .git/（落点可写，无 ro）', () => {
  assert.equal(VOLUME_EVIDENCE_REL_PATH, '.git/oas-release-rehearsal.json')
  const args = buildVolumeCopyEvidenceArgs({ image: 'node:26-bookworm', winTop: `${DRIVE}:\\dev\\repo` })
  assert.equal(
    args[args.length - 1],
    'cp -f /repo/.git/oas-release-rehearsal.json /src/.git/oas-release-rehearsal.json',
  )
  const mounts = args.flatMap((a, i) => (args[i - 1] === '-v' ? [a] : []))
  assert.deepEqual(mounts, ['oas-rehearse:/repo', `${DRIVE}:\\dev\\repo:/src`])
})
