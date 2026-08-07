/**
 * icons 包生成脚本：
 * 读取 svg/ 目录下的原创线性图标源，生成：
 * - src/icons/<name>.ts  每个图标独立模块（export const <camel>Path，tree-shakable）
 * - src/registry.ts      全量注册表（oas-icon 元素按 name 动态查表用）
 * - src/index.ts         汇总导出
 * 运行：pnpm --filter @oas-ui/icons generate
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, join, basename, extname } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const svgDir = join(root, 'svg')
const iconsDir = join(root, 'src/icons')

function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

rmSync(iconsDir, { recursive: true, force: true })
mkdirSync(iconsDir, { recursive: true })

const files = readdirSync(svgDir)
  .filter((f) => extname(f) === '.svg')
  .sort()

const names: string[] = []

for (const file of files) {
  const name = basename(file, '.svg')
  names.push(name)
  const content = readFileSync(join(svgDir, file), 'utf-8').trim()
  const constName = `${camel(name)}Path`
  writeFileSync(
    join(iconsDir, `${name}.ts`),
    `export const ${constName} = ${JSON.stringify(content)}\n`,
  )
}

const exportLines = names.map((n) => `export { ${camel(n)}Path } from './icons/${n}.js'`).join('\n')

writeFileSync(
  join(root, 'src/icons/index.ts'),
  `${names.map((n) => `export { ${camel(n)}Path } from './${n}.js'`).join('\n')}\n`,
)

writeFileSync(
  join(root, 'src/registry.ts'),
  `import { ${names.map((n) => `${camel(n)}Path`).join(', ')} } from './icons/index.js'

export const iconRegistry = {
${names.map((n) => `  '${n}': ${camel(n)}Path,`).join('\n')}
} as const

export type IconName = keyof typeof iconRegistry

export const iconNames: readonly IconName[] = ${JSON.stringify(names, null, 2)} as const
`,
)

writeFileSync(
  join(root, 'src/index.ts'),
  `${exportLines}
export { iconRegistry, iconNames } from './registry.js'
export type { IconName } from './registry.js'
`,
)

console.log(`generated ${names.length} icons: ${names.join(', ')}`)
