#!/usr/bin/env node
/**
 * 裸导入可解析性门禁：
 *   扫描 workspace 源码里的 `@oas-ui/*` 裸导入，按各包 package.json#exports
 *   的精确/通配映射解析到构建产物，并校验目标文件真实存在。
 *
 * 目的：构建/类型检查只覆盖当前源码能解析的路径；本门禁在 build 后验证
 * 公开 exports 与实际 dist 文件一致，避免发布后消费者 import 失败。
 *
 * 用法：pnpm exports:check（通常由 pnpm build 自动调用；需先构建 dist）
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const packages = new Map()
const packagesDir = join(ROOT, 'packages')
for (const name of readdirSync(packagesDir)) {
  const dir = join(packagesDir, name)
  const pkgFile = join(dir, 'package.json')
  if (!existsSync(pkgFile)) continue
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
  if (typeof pkg.name === 'string' && pkg.name.startsWith('@oas-ui/')) {
    packages.set(pkg.name, { dir, pkg })
  }
}

/** 源码文件（只扫源码，不扫 dist/node_modules） */
function sourceFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(ts|mts|tsx)$/.test(entry.name)) out.push(full)
    }
  }
  for (const { dir } of packages.values()) {
    const src = join(dir, 'src')
    if (existsSync(src)) walk(src)
  }
  return out
}

/** 根据 package.json#exports 把 specifier 解析为相对包目录的目标路径 */
function exportTarget(pkg, specifier) {
  const exportsMap = pkg.exports
  if (exportsMap == null) return null
  if (typeof exportsMap === 'string') {
    return specifier === pkg.name ? exportsMap : null
  }
  const subpath = specifier === pkg.name ? '.' : `.${specifier.slice(pkg.name.length)}`
  const resolveEntry = (entry) => {
    if (typeof entry === 'string') return entry
    if (!entry || typeof entry !== 'object') return null
    return entry.default ?? entry.import ?? entry.types ?? null
  }

  if (Object.hasOwn(exportsMap, subpath)) {
    return resolveEntry(exportsMap[subpath])
  }

  // 通配 key：按前缀长度降序，避免 ./icons/* 被 ./ * 抢先
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

const failures = []
const seen = new Set()
const specifiers = []
const files = sourceFiles()
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](@oas-ui\/[^'"]+)['"]/g)) {
    specifiers.push({ file, specifier: match[1] })
  }
}

for (const { file, specifier } of specifiers) {
  const pkgName = [...packages.keys()]
    .sort((a, b) => b.length - a.length)
    .find((name) => specifier === name || specifier.startsWith(`${name}/`))
  if (!pkgName) {
    failures.push(`${relative(ROOT, file)}: 未找到 workspace 包 ${specifier}`)
    continue
  }
  const { dir, pkg } = packages.get(pkgName)
  const target = exportTarget(pkg, specifier)
  const key = `${specifier} -> ${target ?? '(无 exports 匹配)'}`
  if (seen.has(key)) continue
  seen.add(key)
  if (target == null) {
    failures.push(`${relative(ROOT, file)}: ${specifier} 无 package.json#exports 匹配`)
    continue
  }
  const targetFile = join(dir, target)
  if (!existsSync(targetFile)) {
    failures.push(`${relative(ROOT, file)}: ${specifier} -> ${target} 不存在（请先 pnpm build，或修正 exports）`)
  }
}

if (failures.length) {
  console.error(`[exports:check] 失败 ${failures.length} 条：`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(`[exports:check] ${specifiers.length} 条裸导入 / ${seen.size} 个唯一 specifier 均可解析`)
