/**
 * 生成 /llms.txt 与 /llms-full.txt（遵循 llmstxt.org 规范 v2）。
 *
 * - llms.txt：H1 + blockquote 摘要 + 约定（自由 markdown）+ 若干 H2「文件列表」
 *   （`- [名称](url): 说明`）+ `## Optional`。链接指向站点规范 URL（cleanUrls）。
 * - llms-full.txt：把指南与全部组件文档（去 demo 包装与 <script setup>）按层级 +1
 *   拼接成全文，供 agent 一次抓取。
 * - 数据源：docs 侧栏（.vitepress/config.ts 的 componentSidebar 分组）+ guide 目录 +
 *   components 目录各 md 的 H1 与首段（自动提取标题/一句话说明）。
 *
 * 用法：
 *   node scripts/llms/gen.mjs           # 写入 packages/docs/docs/public/{llms,llms-full}.txt
 *   node scripts/llms/gen.mjs --check   # 只校验与磁盘一致（CI 门禁；漂移即 exit 1）
 * 环境变量 SITE_URL 覆盖站点绝对前缀（默认 https://oas-ui.dev）。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const DOCS = join(ROOT, 'packages/docs/docs')
const OUT_DIR = join(DOCS, 'public')
const CHECK = process.argv.includes('--check')
const SITE_URL = (process.env.SITE_URL || 'https://oas-ui.dev').replace(/\/$/, '')

const SUMMARY =
  'OAS-UI 是框架无关的 Web Components UI 组件库：零运行时依赖、Shadow DOM 封装、' +
  'CSS 变量主题令牌、浅色/暗色与 RTL 原生支持，可用于原生 HTML、React、Vue 与 SSR(DSD)。'

const CONVENTIONS = `关键约定：

- 组件标签统一前缀 \`oas-\`，属性用 kebab-case，事件统一 \`oas-*\`（bubbles + composed，可穿出 shadow DOM）。
- 受控 / 非受控双模式；\`disabled\` 支持 config-provider 全局注入。
- 颜色一律走 CSS 变量 token（含暗色变体）；样式隔离在 shadow DOM，跨边界改样式用 CSS 自定义属性或 \`::part()\`。
- 安装、按需引入、图标 opt-in 注册与 CDN 用法见「快速开始」。
- 人类可读的完整文档在站点内；本文件与 \`/llms-full.txt\` 面向 LLM/agent。`

// ---------- 读取：H1 标题 + 首段说明 ----------

function readMd(rel) {
  const abs = join(DOCS, rel)
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null
}

function titleOf(md) {
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^#\s+(.+?)\s*$/)
    if (m) return m[1]
  }
  return ''
}

/** 是否为「像正文」的一行（排除标题/列表/引用/演示/代码行） */
function looksProse(t) {
  if (!t) return false
  if (/^[#<>|`\-*!\[]/.test(t)) return false
  if (/[(){}\[\];]/.test(t)) return false
  if (/=>|\?\.|\/\/|\/\*/.test(t)) return false
  if (/^(import|export|const|let|var|function|class|return)\b/.test(t)) return false
  if (/[{(?.,]\s*$/.test(t)) return false
  if (!/[\u4e00-\u9fff]/.test(t)) return false
  return true
}

/** 首段说明：H1 之后第一个「像正文」的行 */
function describe(md) {
  const lines = md.split(/\r?\n/)
  let h1 = lines.findIndex((l) => /^#\s+/.test(l))
  if (h1 < 0) h1 = -1
  let inFence = false
  for (let i = h1 + 1; i < lines.length; i++) {
    let t = lines[i].trim()
    if (/^```/.test(t)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    // 引用块（> 摘要）也作为说明候选；先内联 markdown 链接
    if (t.startsWith('>')) t = t.replace(/^>\s*/, '')
    t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    if (looksProse(t)) return t.replace(/[*`]/g, '').slice(0, 160)
  }
  return ''
}

function entry(rel) {
  const md = readMd(rel)
  if (md == null) return null
  return { title: titleOf(md) || rel, desc: DESC_OVERRIDE[rel] || describe(md) }
}

/** 少数页首段不适宜作一句话说明时的固定覆盖 */
const DESC_OVERRIDE = {
  'guide/getting-started.md': '安装、按需引入、图标 opt-in 注册与 CDN 用法的入门指南。',
}

// ---------- 解析 config.ts 的 componentSidebar 分组 ----------

function parseComponentGroups() {
  const cfg = readFileSync(join(DOCS, '.vitepress/config.ts'), 'utf8')
  const start = cfg.indexOf('const componentSidebar')
  const end = cfg.indexOf('const enGroupNames')
  const region = cfg.slice(start, end)
  const groups = []
  const re = /text:\s*'([^']+)',\s*collapsed:\s*\w+,\s*items:\s*\[([\s\S]*?)\]/g
  let m
  while ((m = re.exec(region))) {
    const [, name, body] = m
    const items = []
    const ire = /\{\s*text:\s*'([^']+)',\s*link:\s*'([^']+)'\s*\}/g
    let im
    while ((im = ire.exec(body))) items.push({ text: im[1], link: im[2] })
    if (items.length) groups.push({ name, items })
  }
  return groups
}

// ---------- llms.txt ----------

function linkLine(title, link, desc) {
  const url = `${SITE_URL}${link}`
  return `- [${title}](${url})${desc ? `: ${desc}` : ''}`
}

/** 从侧栏条目 text（形如 "Button 按钮"）与 md 首段合成一行 */
function componentLine(item) {
  const rel = item.link.replace(/^\//, '') + '.md'
  const e = entry(rel)
  const title = e?.title || item.text
  return linkLine(title, item.link, e?.desc || '')
}

function guideSection() {
  const guides = readdirSync(join(DOCS, 'guide'))
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .sort()
  return guides
    .filter((f) => f !== 'getting-started.md')
    .map((f) => {
      const e = entry(join('guide', f))
      if (!e) return null
      return linkLine(e.title, `/guide/${f.replace(/\.md$/, '')}`, e.desc)
    })
    .filter(Boolean)
}

function buildLlmsTxt() {
  const out = [`# OAS-UI`, '', `> ${SUMMARY}`, '', CONVENTIONS, '']
  const gs = entry('guide/getting-started.md')
  out.push('## 快速开始', '')
  out.push(linkLine(gs?.title || 'Getting Started', '/guide/getting-started', gs?.desc || ''))
  out.push('')
  const guides = guideSection()
  if (guides.length) {
    out.push('## 指南', '')
    out.push(...guides)
    out.push('')
  }
  for (const g of parseComponentGroups()) {
    out.push(`## ${g.name}`, '')
    for (const item of g.items) out.push(componentLine(item))
    out.push('')
  }
  out.push('## Optional', '')
  out.push(`- [完整参考（全文拼接）](${SITE_URL}/llms-full.txt): 指南与全部组件文档的全文，一次性抓取`)
  out.push('')
  return out.join('\n')
}

// ---------- llms-full.txt ----------

/** 去 Vue <script setup> 块与 DemoBlock 包裹标签，保留内部示例（含代码围栏里的 <script src>） */
function cleanForFull(md) {
  return md
    .replace(/<script\b[^>]*\bsetup\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/^\s*<DemoBlock[^>]*>\s*$/gim, '')
    .replace(/^\s*<\/DemoBlock>\s*$/gim, '')
    .trim()
}

/** 标题层级 +1（H1→H2 ...），便于拼接时嵌套 */
function shiftHeadings(md) {
  return md.replace(/^(#{1,5})\s/gm, '#$1 ')
}

function fullBlock(md) {
  return shiftHeadings(cleanForFull(md)) + '\n'
}

function buildLlmsFullTxt() {
  const out = [`# OAS-UI — Full reference`, '', `> ${SUMMARY}`, '', CONVENTIONS, '', '---', '']
  const gs = readMd('guide/getting-started.md')
  if (gs) out.push(fullBlock(gs), '---', '')
  const guides = readdirSync(join(DOCS, 'guide'))
    .filter((f) => f.endsWith('.md') && f !== 'index.md' && f !== 'getting-started.md')
    .sort()
  for (const f of guides) {
    const md = readMd(join('guide', f))
    if (md) out.push(fullBlock(md), '---', '')
  }
  for (const g of parseComponentGroups()) {
    out.push(`# ${g.name}`, '')
    for (const item of g.items) {
      const rel = item.link.replace(/^\//, '') + '.md'
      const md = readMd(rel)
      if (md) out.push(fullBlock(md), '---', '')
    }
  }
  return out.join('\n')
}

// ---------- 写盘 / 校验 ----------

function emit(name, content, committed) {
  const file = join(OUT_DIR, name)
  if (CHECK) {
    // 构建产物（llms-full.txt 体积大、随产物生成）不参与入库漂移校验
    if (!committed) return
    const current = existsSync(file) ? readFileSync(file, 'utf8') : ''
    if (current !== content) {
      console.error(`[llms:check] ${name} 与生成内容不一致（漂移）——运行 pnpm llms:gen 重新生成`)
      process.exitCode = 1
      return
    }
    console.log(`[llms:check] ${name} ✓ 一致`)
    return
  }
  writeFileSync(file, content)
  console.log(`[llms] 已写入 packages/docs/docs/public/${name}（${content.length} 字节）`)
}

const llms = buildLlmsTxt()
const full = buildLlmsFullTxt()
emit('llms.txt', llms, true)
emit('llms-full.txt', full, false)
if (!CHECK) {
  const groups = parseComponentGroups()
  const n = groups.reduce((a, g) => a + g.items.length, 0)
  console.log(`[llms] 分组 ${groups.length} 个、组件链接 ${n} 条`)
}
