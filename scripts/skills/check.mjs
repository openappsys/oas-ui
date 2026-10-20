#!/usr/bin/env node
/**
 * 消费型 skill 防漂移门禁：
 * - SKILL.md 的 frontmatter / 安装命令 / 关键 API 写法必须仍在；
 * - skill 指向的包与源码入口必须存在；
 * - 已废弃的仓库内路径不得回流。
 *
 * 只校验公开契约，不比对文档全文——文档内容仍由 llms:check 管。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SKILL_DIR = join(ROOT, 'skills/using-oas-ui')
const SKILL_FILE = join(SKILL_DIR, 'SKILL.md')
const README = join(ROOT, 'README.md')
const errors = []

const fail = (message) => errors.push(message)

if (!existsSync(SKILL_FILE)) fail('缺少 skills/using-oas-ui/SKILL.md')
if (!existsSync(join(ROOT, 'skills/using-oas-ui'))) fail('缺少标准 skills/using-oas-ui 目录')

const skill = existsSync(SKILL_FILE) ? readFileSync(SKILL_FILE, 'utf8') : ''
const readme = existsSync(README) ? readFileSync(README, 'utf8') : ''

const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)
if (!frontmatter) {
  fail('SKILL.md 缺少 YAML frontmatter')
} else {
  const meta = frontmatter[1]
  if (!/^name:\s*using-oas-ui\s*$/m.test(meta)) fail('frontmatter name 必须是 using-oas-ui')
  const desc = meta.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? ''
  if (!desc.startsWith('Use when')) fail('frontmatter description 必须以 "Use when" 开头')
  if (desc.length > 1024) fail('frontmatter description 超过 1024 字符')
}

for (const token of [
  'onoas-click',
  '@oas-ui/ui/basic/button',
  '@oas-ui/theme',
  '@oas-ui/icons/register',
  '@oas-ui/nuxt',
  '@oas-ui/next',
  'CustomEvent',
  'data-theme="dark"',
]) {
  if (!skill.includes(token)) fail(`SKILL.md 缺少关键契约：${token}`)
}

if (!readme.includes('npx skills add openappsys/oas-ui --skill using-oas-ui')) {
  fail('README 缺少 npx skills add 安装命令')
}
if (!readme.includes('skills/using-oas-ui/SKILL.md')) fail('README 缺少 skill 源文件路径')
if (readme.includes('.agents/skills/using-oas-ui')) fail('README 仍指向旧 .agents 路径')
if (skill.includes('.agents/skills/using-oas-ui')) fail('SKILL.md 仍指向旧 .agents 路径')

// 包/源码入口存在性：不依赖 dist 是否已构建
for (const rel of [
  'packages/ui/package.json',
  'packages/ui/src/basic/button/index.ts',
  'packages/theme/package.json',
  'packages/next/package.json',
  'packages/nuxt/package.json',
]) {
  if (!existsSync(join(ROOT, rel))) fail(`skill 指向的包/入口不存在：${rel}`)
}

// UI exports 必须仍保留 `./*` 子路径（basic/button 依赖它）
const uiPkg = existsSync(join(ROOT, 'packages/ui/package.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'packages/ui/package.json'), 'utf8'))
  : {}
if (!uiPkg.exports?.['./*']) fail('@oas-ui/ui 的 package.json 缺少 "./*" 子路径导出')

if (errors.length) {
  console.error('[skill:check] 失败：')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log('[skill:check] skills/using-oas-ui/SKILL.md 契约与安装入口一致')
