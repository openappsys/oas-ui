import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '..')

/** 解析 import './xxx/.../index.js'（或 '../xxx/.../index.js'）返回相对路径清单（去掉 ./ 与 ../ 前缀与 /index.js 后缀） */
function parseComponentImports(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/import '\.\.?\/([^']+?)\/index\.js'/g)) {
    const p = m[1]!
    // 跳过包级副作用（@oas-ui/i18n 不含 /index.js 前缀匹配，不会进来）
    if (p.startsWith('@')) continue
    out.push(p)
  }
  return out
}

/** 基座：框架级三件（config-provider/app/theme-editor，每族都 import，幂等守卫防重复注册） */
const BASE_MODULES = ['framework/config-provider', 'framework/app', 'framework/theme-editor']

/** 族文件 → 源码顶层目录（源码目录 = 文档站语义组，单一权威） */
const FAMILY_DIR: Record<string, string> = {
  basic: 'basic',
  layout: 'layout',
  form: 'form',
  feedback: 'feedback',
  navigation: 'navigation',
  data: 'data',
  framework: 'framework',
}

const FAMILY_FILES = Object.keys(FAMILY_DIR)

describe('CDN 按需打包：七族注册文件覆盖全量注册表', () => {
  // 全量注册表 = src/index.ts 的组件 import 清单（每个组件目录一个 index.js 入口）
  const indexText = readFileSync(resolve(srcRoot, 'index.ts'), 'utf8')
  const all = parseComponentImports(indexText)

  it('src/index.ts 全量清单可解析且按顶层目录对齐各族', () => {
    expect(all.length).toBeGreaterThan(0)
    const tops = new Set(all.map((p) => p.split('/')[0]))
    expect(tops).toEqual(new Set(Object.values(FAMILY_DIR)))
    // 每个顶层目录的全部组件都在 index.ts 全量清单里
    for (const dir of Object.values(FAMILY_DIR)) {
      const dirComps = all.filter((p) => p.startsWith(`${dir}/`))
      expect(dirComps.length).toBeGreaterThan(0)
      // 无空目录；framework 目录即基座三件，其余目录不含基座
      if (dir === 'framework') {
        expect(BASE_MODULES.every((b) => dirComps.includes(b))).toBe(true)
      } else {
        expect(BASE_MODULES.some((b) => b.startsWith(`${dir}/`))).toBe(false)
      }
    }
  })

  it('每个族文件 import 的组件与其源码顶层目录一一对应（framework 族即基座三件）', () => {
    for (const fam of FAMILY_FILES) {
      const dir = FAMILY_DIR[fam]!
      const text = readFileSync(resolve(here, `${fam}.ts`), 'utf8')
      const comps = parseComponentImports(text)

      // 族文件只 import 自己目录的组件 + 基座三件（framework 目录的 config-provider/app/theme-editor）
      for (const p of comps) {
        const inOwnDir = p.startsWith(`${dir}/`)
        const isBase = BASE_MODULES.includes(p)
        expect(inOwnDir || isBase, `${fam}.ts 误 import ${p}`).toBe(true)
      }
      // 该目录全量组件都在族文件里（framework 目录的三件是自身族内容，亦属基座）
      const allComps = parseComponentImports(readFileSync(resolve(srcRoot, 'index.ts'), 'utf8'))
      const dirComps = allComps.filter((p) => p.startsWith(`${dir}/`))
      for (const c of dirComps) {
        expect(comps.includes(c), `${fam}.ts 缺少 ${c}`).toBe(true)
      }
      // 族文件不 import 别的目录组件（基座三件除外）
      const extra = comps.filter((p) => !p.startsWith(`${dir}/`) && !BASE_MODULES.includes(p))
      expect(extra, `${fam}.ts import 了目录外组件`).toEqual([])
    }
  })

  it('基座三件在每族都 import（多族并用靠幂等守卫防重注册）', () => {
    for (const fam of FAMILY_FILES) {
      const text = readFileSync(resolve(here, `${fam}.ts`), 'utf8')
      const comps = parseComponentImports(text)
      for (const b of BASE_MODULES) {
        expect(comps.includes(b), `${fam}.ts 缺少基座 ${b}`).toBe(true)
      }
      // @oas-ui/i18n 副作用注入（translator）也应存在
      expect(text).toContain("import '@oas-ui/i18n'")
    }
  })

  it('七族并集 = 全量注册表，无重复无遗漏', () => {
    const union = new Map<string, number>()
    for (const fam of FAMILY_FILES) {
      const text = readFileSync(resolve(here, `${fam}.ts`), 'utf8')
      for (const p of parseComponentImports(text)) {
        union.set(p, (union.get(p) ?? 0) + 1)
      }
    }
    // 每个组件（非基座）恰好出现在一个族文件；基座三件每族各出现一次（7 次）
    for (const c of all) {
      const count = union.get(c) ?? 0
      if (BASE_MODULES.includes(c)) {
        expect(count, `${c} 基座应每族都 import（7 次）`).toBe(FAMILY_FILES.length)
      } else {
        expect(count, `${c} 应恰好在一个族文件`).toBe(1)
      }
    }
    // 无遗漏：族文件 import 集合 == index.ts 全量集合（并集不超全集）
    expect(new Set(union.keys())).toEqual(new Set(all))
  })
})
