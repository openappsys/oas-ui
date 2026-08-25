/**
 * icons 包生成脚本：
 * 读取 svg/ 目录下的原创线性图标源，生成：
 * - src/icons/<name>.ts  每个图标独立模块（export const <camel>Path，tree-shakable）
 * - src/registry.ts      全量注册表（oas-icon 元素按 name 动态查表用）
 * - src/index.ts         汇总导出
 * 运行：pnpm --filter @oas-ui/icons generate
 *
 * 原子性：全部产物先写入 .gen-tmp/ 临时目录，写齐后一次性 rename 替换目标；
 * 中途失败/中断不会留下空目录或半截产物（教训：先删目录再逐文件写曾被中断致 pnpm dev 起不来）。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from 'node:fs'
import { resolve, join, basename, extname } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const svgDir = join(root, 'svg')
const iconsDir = join(root, 'src/icons')
// 临时目录按进程隔离：并发构建（root build 与 docs build 同时触发 generate）互不踩踏——
// 曾因共享 .gen-tmp 被并发进程清空临时产物，导致 iconsDir 删空后 rename 失败、43 个图标全灭（2026-08 实测）
const tmpDir = join(root, `.gen-tmp-${process.pid}`)

function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/** 单文件原子写：先写临时文件再 rename 覆盖 */
function writeAtomic(target: string, content: string, tmpName: string) {
  const tmp = join(tmpDir, tmpName)
  writeFileSync(tmp, content)
  renameSync(tmp, target)
}

/**
 * 带重试的目录原子替换：Windows 下 dev watch（chokidar/tsc）正读 src/icons 时
 * rmSync/renameSync 会 EPERM（句柄未放，实测发布构建与 pnpm dev 并行时必现级）；
 * 观察到句柄是瞬态的，退避重试即可成功
 */
function swapDirRetry(from: string, to: string, attempts = 4): void {
  for (let i = 0; ; i++) {
    try {
      rmSync(to, { recursive: true, force: true })
      renameSync(from, to)
      return
    } catch (e) {
      if (i >= attempts - 1) throw e
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100 * (i + 1))
    }
  }
}

rmSync(tmpDir, { recursive: true, force: true })

try {
  const files = readdirSync(svgDir)
    .filter((f) => extname(f) === '.svg')
    .sort()

  const names: string[] = []

  // 1. 全部产物写入临时目录
  const tmpIcons = join(tmpDir, 'icons')
  mkdirSync(tmpIcons, { recursive: true })

  for (const file of files) {
    const name = basename(file, '.svg')
    names.push(name)
    const content = readFileSync(join(svgDir, file), 'utf-8').trim()
    const constName = `${camel(name)}Path`
    writeFileSync(
      join(tmpIcons, `${name}.ts`),
      `export const ${constName} = ${JSON.stringify(content)}\n`,
    )
  }

  writeFileSync(
    join(tmpIcons, 'index.ts'),
    `${names.map((n) => `export { ${camel(n)}Path } from './${n}.js'`).join('\n')}\n`,
  )

  // 2. 目录原子替换：rename 同卷原子，窗口只有「删旧 + 改名」一瞬间（EPERM 重试护体）
  swapDirRetry(tmpIcons, iconsDir)

  // 3. 两个单文件原子写
  writeAtomic(
    join(root, 'src/registry.ts'),
    `import { ${names.map((n) => `${camel(n)}Path`).join(', ')} } from './icons/index.js'

export const iconRegistry = {
${names.map((n) => `  '${n}': ${camel(n)}Path,`).join('\n')}
} as const

export type IconName = keyof typeof iconRegistry

export const iconNames: readonly IconName[] = ${JSON.stringify(names, null, 2)} as const
`,
    'registry.ts',
  )

  writeAtomic(
    join(root, 'src/index.ts'),
    `${names.map((n) => `export { ${camel(n)}Path } from './icons/${n}.js'`).join('\n')}
export { iconRegistry, iconNames } from './registry.js'
export type { IconName } from './registry.js'
`,
    'index.ts',
  )

  console.log(`generated ${names.length} icons: ${names.join(', ')}`)
} finally {
  // 失败/中断兜底：不留临时目录残骸
  rmSync(tmpDir, { recursive: true, force: true })
}
