/**
 * 文档 import 防漂移门禁：扫描 docs 站 markdown 源码（含 zh/en 与 guide）代码块里的
 * `@oas-ui/*` import specifier，逐条按各 workspace 包 package.json#exports 解析到
 * 构建产物并验证真实存在（与 scripts/check-exports.mjs 同一套解析口径）。
 *
 * 背景（C1 复发预防）：helper 分包文档曾把 `@oas-ui/ui/data/resource/cost` 误写成
 * `@oas-ui/ui/resource/cost`（漏掉家族段 `data/`），exports 通配解析不到 dist 文件，
 * 消费者照文档 import 会直接运行时报错——源码级 exports:check 只扫 .ts/.mts/.tsx，
 * 覆盖不到 md 里的示例，故此处单独立门禁。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DOCS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'docs')
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** workspace 内 @oas-ui 包名 → 包目录（读 package.json#name 判定） */
const PACKAGES = new Map<string, string>()
for (const name of readdirSync(join(WORKSPACE_ROOT, 'packages'), { withFileTypes: true })) {
  if (!name.isDirectory()) continue
  const pkgFile = join(WORKSPACE_ROOT, 'packages', name.name, 'package.json')
  if (!existsSync(pkgFile)) continue
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as { name?: string }
  if (typeof pkg.name === 'string' && pkg.name.startsWith('@oas-ui/')) {
    PACKAGES.set(pkg.name, join(WORKSPACE_ROOT, 'packages', name.name))
  }
}

/** 按 package.json#exports 解析 specifier → 目标产物绝对路径；不可解析返回 null（与 check-exports.mjs 同口径） */
export function resolveSpecifier(specifier: string): string | null {
  const m = /^(@oas-ui\/[^/]+)(\/.*)?$/.exec(specifier)
  if (!m) return null
  const pkgDir = PACKAGES.get(m[1]!)
  if (!pkgDir) return null
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as {
    exports?: Record<string, unknown>
  }
  const exportsMap = pkg.exports
  if (exportsMap == null) return null
  // exports key 约定以 `.` 开头（`./data/table`），specifier 的家族段以 `/` 开头，需拼上 `.`
  const subpath = `.${m[2] ?? ''}`
  const resolveEntry = (entry: unknown): string | null => {
    if (typeof entry === 'string') return entry
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>
      const target = (record.default ?? record.import ?? record.types) as unknown
      return typeof target === 'string' ? target : null
    }
    return null
  }
  if (Object.hasOwn(exportsMap, subpath)) return resolveEntry(exportsMap[subpath])
  // 通配 key：按星号位置降序匹配（更具体的前缀优先，同 check-exports.mjs）
  const patterns = Object.keys(exportsMap)
    .filter((key) => key.includes('*'))
    .sort((a, b) => b.indexOf('*') - a.indexOf('*'))
  for (const key of patterns) {
    const star = key.indexOf('*')
    const prefix = key.slice(0, star)
    const suffix = key.slice(star + 1)
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue
    const value = resolveEntry(exportsMap[key])
    if (value == null) continue
    return value.replace('*', subpath.slice(prefix.length, subpath.length - suffix.length))
  }
  return null
}
/** 单条 specifier 判定：可解析且目标产物真实存在时返回 null，否则返回人读的失败原因 */
export function checkSpecifier(specifier: string): string | null {
  const target = resolveSpecifier(specifier)
  if (target == null) return `exports 无匹配（包未登记或路径拼错）`
  const pkgName = /^(@oas-ui\/[^/]+)/.exec(specifier)![1]!
  const absolute = join(PACKAGES.get(pkgName)!, target)
  if (!existsSync(absolute)) return `→ ${target} 不存在（请先 pnpm build，或修正文档路径）`
  return null
}

/** md 源码 → 出现的 @oas-ui import specifier 清单（含行号与来源语句），只认 import/export 语句形态 */
export function collectSpecifiers(md: string): Array<{ specifier: string; line: number; statement: string }> {
  const out: Array<{ specifier: string; line: number; statement: string }> = []
  const re = /(?:from\s*|\bimport\s*\(\s*|\bimport\s+|\bexport\s[^;\n]*?from\s*)['"](@oas-ui\/[^'"]+)['"]/g
  let m
  while ((m = re.exec(md))) {
    const line = md.slice(0, m.index).split('\n').length
    const statement = md
      .slice(
        md.lastIndexOf('\n', m.index) + 1,
        md.indexOf('\n', m.index) === -1 ? undefined : md.indexOf('\n', m.index),
      )
      .trim()
    out.push({ specifier: m[1]!, line, statement })
  }
  return out
}

function walkMarkdown(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.vitepress') continue // 构建产物/缓存目录不扫
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkMarkdown(full, out)
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

describe('docs md import 防漂移（@oas-ui/* specifier 按 package.json#exports 可解析）', () => {
  it('错误形态自验：C1 的 `@oas-ui/ui/resource/cost`（漏 data/ 家族段）必须被判失败，正确路径可解析', () => {
    // RED 自验锚：本用例锁死「文档 import 路径多一段/少一段会被抓出」的判定本身。
    // 错误形态有两种落点：exports 无匹配，或 `./*` 通配解析到不存在的 dist 文件——都算失败。
    expect(checkSpecifier('@oas-ui/ui/resource/cost')).toMatch(/exports 无匹配|不存在/)
    expect(checkSpecifier('@oas-ui/ui/resource/pool')).toMatch(/exports 无匹配|不存在/)
    expect(checkSpecifier('@oas-ui/ui/data/resource/cost')).toBeNull()
    expect(checkSpecifier('@oas-ui/ui/data/resource/pool')).toBeNull()
    expect(checkSpecifier('@oas-ui/ui/data/gantt/export')).toBeNull()
    expect(checkSpecifier('@oas-ui/ui')).toBeNull()
    expect(checkSpecifier('@oas-ui/i18n/slices/data')).toBeNull()
    expect(checkSpecifier('@oas-ui/i18n/zh-CN')).toBeNull()
    expect(checkSpecifier('@oas-ui/icons/register')).toBeNull()
    expect(checkSpecifier('@oas-ui/theme/glass.css')).toBeNull()
    expect(checkSpecifier('@oas-ui/nonexistent/x')).toMatch(/exports 无匹配|不存在/)
  })

  it('全部 md 源码里的 @oas-ui import specifier 均可按 exports 解析到真实产物', () => {
    const failures: string[] = []
    for (const file of walkMarkdown(DOCS_DIR)) {
      const md = readFileSync(file, 'utf8')
      for (const { specifier, line, statement } of collectSpecifiers(md)) {
        const problem = checkSpecifier(specifier)
        if (problem != null) {
          failures.push(`${file}(${line}): ${specifier} ${problem}\n    ${statement}`)
        }
      }
    }
    expect(failures).toEqual([])
  })
})
