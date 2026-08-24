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
const tmpDir = join(root, '.gen-tmp')

function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/** 单文件原子写：先写临时文件再 rename 覆盖 */
function writeAtomic(target: string, content: string, tmpName: string) {
  const tmp = join(tmpDir, tmpName)
  writeFileSync(tmp, content)
  renameSync(tmp, target)
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

  // 2. 目录原子替换：rename 同卷原子，窗口只有「删旧 + 改名」一瞬间
  rmSync(iconsDir, { recursive: true, force: true })
  renameSync(tmpIcons, iconsDir)

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
