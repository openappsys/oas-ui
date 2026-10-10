/**
 * 生成 /llms.txt 与 /llms-full.txt（遵循 llmstxt.org 规范 v2）。
 *
 * - llms.txt：H1 + blockquote 摘要 + 约定（自由 markdown）+ 若干 H2「文件列表」
 *   （`- [名称](url): 说明`）+ `## Optional`。链接指向站点规范 URL（cleanUrls），
 *   组件分组取自 srcDir 侧栏（.vitepress/config.ts 的 componentSidebar）。
 * - llms-full.txt：指南与全部组件文档**原样拼接**（不清理、零信息损失；
 *   去掉 `<script setup>` 属另一路线的旧行为，已废弃），每页前加 `<!-- 站点URL -->` 源标注。
 * - 每页 `.md` 镜像**不在此脚本生成**：由 docs 构建期（.vitepress/config.ts 的 buildEnd）
 *   原样复制到**构建产物 dist**。本脚本仅清理 public/ 下历史遗留的 .md（旧版本误写在此），
 *   因为 public/ 是 Vite 静态根，与 `.md` 页面模块路由同路径会致 dev 整站 404。
 * - 数据源：docs 侧栏分组 + guide 目录 + components 目录各 md 的 H1 与首段（自动提取标题/一句话说明）。
 *
 * 用法：
 *   node scripts/llms/gen.mjs           # 写 llms.txt / llms-full.txt 到 public/，并清理 public 历史 .md 镜像
 *   node scripts/llms/gen.mjs --check   # 校验：llms.txt 与磁盘一致 + public/ 无残留 .md 镜像（漂移即 exit 1）
 * CI 门禁见根 package.json 的 `llms:check`：本脚本 --check 之外再 `git diff` 比对入库版本
 * （因 CI 先跑 `pnpm build` 会重写 public/llms.txt，仅「生成 vs 磁盘」比对会恒绿失效）。
 * 环境变量 SITE_URL 覆盖站点绝对前缀（默认 https://oas-ui.dev）。
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
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
  return existsSync(abs) ? readFileSync(abs, 'utf8').replace(/^\uFEFF/, '') : null
}

function titleOf(md) {
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^#\s+(.+?)\s*$/)
    if (m) return m[1]
  }
  return ''
}

/**
 * 是否为「像正文」的一行。目标是挑出组件/指南 H1 后的**首段简介**：
 * 只需排除结构性行（标题/列表/引用/表格/HTML/代码围栏）与代码行（import/=> / 结尾分号等），
 * 不再因行内含内联代码（`x` / `min()` / `[]`）而误拒——否则真实简介被跳过、抓到后文噪声行。
 * 摘要以中文为主，故要求含 CJK（纯 ASCII 代码行自然出局）。
 */
function looksProse(t) {
  if (!t) return false
  if (/^(#{1,6}\s|`{3,}|~{3,}|>|\||<)/.test(t)) return false
  if (/^[-*+]\s/.test(t)) return false
  if (/^(import|export|const|let|var|function|class|return|if|else|for|while|await|async|yield)\b/.test(t)) return false
  if (/=>|;\s*$/.test(t)) return false
  if (!/[\u4e00-\u9fff]/.test(t)) return false
  return true
}

/** 去行内 markdown：链接留文字、强调去符号；**行内代码内容原样**（保 `*` 等字面量，如 `--oas-container-*`） */
function stripMd(t) {
  const codes = []
  let s = t.replace(/`([^`]*)`/g, (_, c) => {
    codes.push(c)
    return `\u0000${codes.length - 1}\u0000`
  })
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/[*_]/g, '')
    .trim()
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)])
}

/** 取首句作为简介：优先在首个句末标点处收口（≤max 字），过长才截断加省略号 */
function firstSentence(t, max = 200) {
  const clean = stripMd(t)
  const m = clean.match(/^.{6,}?[。！？!?](?=\s|$|[\u4e00-\u9fff])/)
  let s = m ? m[0] : clean
  if (s.length > max) {
    const head = s.slice(0, max)
    // 尽量断在标点/空格，避免把英文词或句读切两半
    const cut = Math.max(
      head.lastIndexOf('；'),
      head.lastIndexOf('，'),
      head.lastIndexOf('、'),
      head.lastIndexOf('）'),
      head.lastIndexOf('。'),
      head.lastIndexOf('/'),
      head.lastIndexOf(' '),
    )
    s = `${(cut > max * 0.6 ? head.slice(0, cut) : head).replace(/[，、,；;：:\s]+$/, '')}…`
  }
  return s
}

/** 首段说明：H1 之后第一个「像正文」的行 */
function describe(md) {
  const lines = md.split(/\r?\n/)
  let h1 = lines.findIndex((l) => /^#\s+/.test(l))
  if (h1 < 0) h1 = -1
  let inFence = false
  for (let i = h1 + 1; i < lines.length; i++) {
    let t = lines[i].trim()
    if (/^(`{3,}|~{3,})/.test(t)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    // 引用块（> 摘要）也作为说明候选
    if (t.startsWith('>')) t = t.replace(/^>\s*/, '')
    if (looksProse(t)) return firstSentence(t)
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

// ---------- llms-full.txt（全文：源文件原样拼接，不清理） ----------

/** 源 md 相对路径 → 规范站点 URL（cleanUrls：去 `.md`；`index` 收成目录） */
function pageUrlFromRel(rel) {
  const u = rel.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')
  return '/' + u
}

/** 参与全文的源 md 顺序：getting-started → 其余 guide → 各组件族组件 */
function fullSourcePaths() {
  const paths = []
  if (readMd('guide/getting-started.md') != null) paths.push('guide/getting-started.md')
  const guides = readdirSync(join(DOCS, 'guide'))
    .filter((f) => f.endsWith('.md') && f !== 'index.md' && f !== 'getting-started.md')
    .sort()
  for (const f of guides) paths.push(join('guide', f))
  for (const g of parseComponentGroups()) {
    for (const item of g.items) paths.push(item.link.replace(/^\//, '') + '.md')
  }
  return paths
}

function buildLlmsFullTxt() {
  const out = [`# OAS-UI — Full reference`, '', `> ${SUMMARY}`, '', CONVENTIONS, '']
  for (const rel of fullSourcePaths()) {
    const md = readMd(rel)
    if (md == null) continue
    out.push(`<!-- ${SITE_URL}${pageUrlFromRel(rel)} -->`, '', md.trim(), '', '---', '')
  }
  return out.join('\n')
}

// ---------- public 下历史 .md 镜像清理 ----------
// 每页 `.md` 镜像现由 Vitepress 构建期写入构建产物（见 packages/docs/docs/.vitepress/config.ts 的 buildEnd）。
// 绝不写 public/：dev 下 public/ 是 Vite 静态根，会与 `.md` 页面模块路由同路径冲突 → 整站 404。
// 此处仅清理历史遗留的 public/.md（旧版本曾写在此处）。

/** 扫描 public 下的 .md 镜像（onHit 非空则对每个执行） */
function scanPublicMdMirrors(onHit) {
  let n = 0
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.md')) {
        n++
        if (onHit) onHit(p)
      }
    }
  }
  walk(OUT_DIR)
  return n
}

/** 清掉 public 下遗留的 .md 镜像（返回删除数） */
function clearPublicMdMirrors() {
  return scanPublicMdMirrors((p) => unlinkSync(p))
}

/** 统计 public 下遗留的 .md 镜像数（不删，供 --check 回归门禁） */
function countPublicMdMirrors() {
  return scanPublicMdMirrors(null)
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
  console.log(`[llms] 已写入 packages/docs/docs/public/${name}（${content.length} 字符）`)
}

const llms = buildLlmsTxt()
const full = buildLlmsFullTxt()
emit('llms.txt', llms, true)
emit('llms-full.txt', full, false)
if (!CHECK) {
  // 每页 `.md` 镜像改由 Vitepress 构建期写入构建产物（见 config.ts buildEnd）——不再写 public/，
  // 否则与 dev 的 `.md` 页面模块路由同路径冲突致整站 404。此处仅清理历史遗留的 public 镜像。
  const cleared = clearPublicMdMirrors()
  if (cleared) console.log(`[llms] 清理 public/ 历史 .md 镜像 ${cleared} 个（镜像现由构建期写入 dist）`)
  const groups = parseComponentGroups()
  const n = groups.reduce((a, g) => a + g.items.length, 0)
  console.log(`[llms] 分组 ${groups.length} 个、组件链接 ${n} 条`)
} else {
  // 回归门禁：public/ 不得残留 .md 镜像（否则与 dev 的 `.md` 页面路由冲突 → 整站 404）
  const stray = countPublicMdMirrors()
  if (stray) {
    console.error(`[llms:check] public/ 残留 ${stray} 个 .md 镜像（镜像应写入构建产物 dist，勿放 public/）`)
    process.exitCode = 1
  } else {
    console.log('[llms:check] public/ 无 .md 镜像 ✓')
  }
}
