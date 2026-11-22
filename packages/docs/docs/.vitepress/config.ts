import { defineConfig } from 'vitepress'
import { componentSidebar, enComponentSidebar } from './sidebar.js'
import type { DefaultTheme, HeadConfig } from 'vitepress'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** docs 根目录（config.ts 位于 docs/.vitepress/）——用于构建期生成每页 markdown 镜像 */
const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
/** 组件库当前版本（导航版本下拉用）——直接读 ui 包 package.json，构建期即取真值、零漂移 */
const VERSION = (JSON.parse(readFileSync(join(DOCS_DIR, '../../..', 'packages/ui/package.json'), 'utf8')) as {
  version: string
}).version

/** 版本下拉导航（Beszel 式）：版本号 + 发布记录 / 站内更新记录 / 提交问题 */
const versionNav = (prefix = ''): DefaultTheme.NavItem[] => [
  {
    text: `v${VERSION}`,
    items: [
      {
        text: prefix === 'en/' ? 'Release Notes' : '发布记录',
        link: 'https://github.com/openappsys/oas-ui/releases',
        target: '_blank',
        rel: 'noopener',
      },
      { text: prefix === 'en/' ? 'Changelog' : '更新记录', link: `${prefix}changelog` },
      {
        text: prefix === 'en/' ? 'Report an Issue' : '提交问题',
        link: 'https://github.com/openappsys/oas-ui/issues',
        target: '_blank',
        rel: 'noopener',
      },
    ],
  },
]

/** 指南根级侧栏条目（中英各一份）。themeConfig.sidebar 与面包屑 JSON-LD 映射共用，防漂移。 */
const guideItemsZh: DefaultTheme.SidebarItem[] = [
  { text: '快速开始', link: '/guide/getting-started' },
  { text: '项目愿景', link: '/guide/vision' },
  { text: '主题与自定义', link: '/guide/theming' },
  { text: '皮肤画廊', link: '/guide/skins' },
  { text: '磨砂玻璃画廊', link: '/guide/glass' },
  { text: '设计 Token', link: '/guide/tokens' },
  { text: '无障碍（A11y）', link: '/guide/accessibility' },
  { text: '框架接入（React、Vue 等）', link: '/guide/frameworks' },
  { text: '集成 FAQ', link: '/guide/faq' },
  { text: '场景方案', link: '/guide/recipes' },
  { text: '导航形态组合', link: '/guide/navigation-patterns' },
  { text: '服务端窗口取数', link: '/guide/windowed-data' },
  { text: 'AI 会话接入', link: '/guide/ai-chat' },
  { text: '资源管理示例', link: '/guide/resource-management' },
  { text: 'SSR 边界策略', link: '/guide/ssr' },
  { text: '组件总览', link: '/components/' },
  { text: '更新记录', link: '/changelog' },
]
const guideItemsEn: DefaultTheme.SidebarItem[] = [
  { text: 'Getting Started', link: '/en/guide/getting-started' },
  { text: 'Vision', link: '/en/guide/vision' },
  { text: 'Theming', link: '/en/guide/theming' },
  { text: 'Skin Gallery', link: '/en/guide/skins' },
  { text: 'Frosted Glass Gallery', link: '/en/guide/glass' },
  { text: 'Design Tokens', link: '/en/guide/tokens' },
  { text: 'Accessibility (A11y)', link: '/en/guide/accessibility' },
  { text: 'Framework Integration (React, Vue, etc.)', link: '/en/guide/frameworks' },
  { text: 'Integration FAQ', link: '/en/guide/faq' },
  { text: 'Scenarios', link: '/en/guide/recipes' },
  { text: 'Navigation patterns', link: '/en/guide/navigation-patterns' },
  { text: 'Server-side windowed data', link: '/en/guide/windowed-data' },
  { text: 'AI chat integration', link: '/en/guide/ai-chat' },
  { text: 'Resource management example', link: '/en/guide/resource-management' },
  { text: 'SSR Strategy', link: '/en/guide/ssr' },
  { text: 'Overview', link: '/en/components/' },
  { text: 'Changelog', link: '/en/changelog' },
]

/**
 * 由侧栏结构推导 链接 → {group, item} 映射（面包屑 JSON-LD 用），支持嵌套 items 递归。
 * 键统一为无前后斜杠的 docs 相对路径（en 前缀已剥），与 transformHead 中 crumbPath 同形。
 */
function buildCrumbMap(groups: DefaultTheme.SidebarItem[]): Map<string, { group: string; item: string }> {
  const map = new Map<string, { group: string; item: string }>()
  const walk = (items: DefaultTheme.SidebarItem[] | undefined, group: string): void => {
    for (const it of items ?? []) {
      if (it.items) walk(it.items, it.text || group)
      else if (it.link && it.text) {
        map.set(it.link.replace(/^\//, '').replace(/\/$/, ''), { group, item: it.text })
      }
    }
  }
  walk(groups, '')
  return map
}
const crumbMapZh = buildCrumbMap([
  { text: '指南', items: guideItemsZh },
  ...componentSidebar,
])
const crumbMapEn = buildCrumbMap([
  { text: 'Guide', items: guideItemsEn },
  ...enComponentSidebar,
])

/** 自定义元素标签清单（API 生成物）；Preflight 原生 reset 需要显式排除这些宿主。 */
const OAS_TAGS = JSON.parse(
  readFileSync(join(DOCS_DIR, '../../..', 'docs/api-manifest/index.json'), 'utf8'),
) as string[]

/**
 * 站点规范域名（SEO 绝对 URL：canonical / OG / sitemap 的基准——这些按规范必须是绝对 URL，
 * SSG 构建期拿不到请求 host，故只能用绝对基准）。默认生产域；换域或预览构建用环境变量
 * `SITE_URL` 覆盖即可，无需改代码。
 */
const SITE_URL = process.env.SITE_URL || 'https://oas-ui.dev'
const SITE_NAME = 'OAS-UI'
/** 英文 locale 的目录前缀（root = 中文，/en/ = 英文） */
const EN_PREFIX = 'en/'
/**
 * 无扩展名 URL：Cloudflare Workers 静态资产默认（auto-trailing-slash）把无扩展名当规范 URL、
 * `.html` 当 307 别名，故构建产物统一输出无扩展名（文件页 `/foo`、目录页 `/foo/`），
 * 使内部链接、canonical、sitemap 全部指向同一规范 URL，零跳转。
 */
const CLEAN_URLS = true

/**
 * VitePress 2 默认主题引入 Tailwind Preflight。其通用 `*` 规则会把
 * margin/padding/border 归零，并作用到自定义元素宿主，覆盖组件 shadow 内
 * `:host` 的容器内边距、卡片边框等。这里保留 reset 对原生元素的作用
 * （VitePress 导航按钮/侧栏 p.text 依赖它），但把选择器改成 `*:not(oas-*)`，
 * 显式排除全部 OAS 自定义元素宿主；其余 Preflight 与 `[hidden]` 规则保留。
 *
 * 若未来 VitePress 改变 base.css 结构，transform 会抛错而不是静默失效。
 */
function stripPreflightHostReset(): {
  name: string
  enforce: 'pre'
  transform: (code: string, id: string) => string | undefined
} {
  return {
    name: 'oas-strip-preflight-host-reset',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/vitepress/dist/client/theme-default/styles/base.css')) return undefined
      const start = code.indexOf('/* #region Tailwind Preflight */')
      const end = code.indexOf('/* #endregion */', start)
      if (start < 0 || end < 0) {
        throw new Error('[oas] VitePress base.css 缺少 Tailwind Preflight 标记，无法保护自定义元素宿主；请复核升级')
      }
      const region = code.slice(start, end)
      const stripped = region.replace(
        /(\*,[\s\S]*?\{[\s\S]*?)\r?\n\s*margin:\s*0;\r?\n\s*padding:\s*0;\r?\n\s*border:\s*0 solid;/,
        '$1',
      )
      if (stripped === region) {
        throw new Error(
          '[oas] VitePress Preflight 通用 reset 结构变化，无法拆分宿主 margin/padding/border；请复核 base.css',
        )
      }
      const hostSelector = OAS_TAGS.length ? `*:not(${OAS_TAGS.join(', ')})` : '*'
      const scopedReset =
        `\n${hostSelector},::after,::before,::backdrop,::file-selector-button {` +
        '\n  margin: 0;\n  padding: 0;\n  border: 0 solid;\n}\n'
      return code.slice(0, start) + stripped + scopedReset + code.slice(end)
    },
  }
}

/**
 * 由页面源文件相对路径推导站点 URL，规则与 VitePress 内置 sitemap 一致（cleanUrls 时去 `.html`）：
 * 文件页 `foo.md` → `/foo`；目录页 `foo/index.md` → `/foo/`（保留斜杠）；根 `index.md` → `/`。
 */
function pageUrl(relativePath: string): string {
  const url = relativePath
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, CLEAN_URLS ? '' : '.html')
  return '/' + url
}

/** 是否为英文 locale 页面 */
function isEnglishPage(relativePath: string): boolean {
  return relativePath.startsWith(EN_PREFIX)
}

/**
 * 一次性读取 git 历史中全部 docs 源文件的最后提交时间（ISO 8601），返回 相对路径 → lastmod。
 * git log 从新到旧输出，首次出现即最后提交；解析失败（无 git/浅克隆等）返回空 Map，
 * sitemap 只是少了 lastmod，不阻断构建。
 * 浅克隆（CI 默认 checkout 即浅克隆）的边界提交会把全部文件表现为「本次新增」，每个文件都拿到
 * 同一个假日期——宁缺勿假：浅克隆整段跳过。
 */
function gitLastmodByFile(): Map<string, string> {
  const map = new Map<string, string>()
  try {
    const repoRoot = join(DOCS_DIR, '../../..')
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: repoRoot })
      .toString()
      .trim()
    if (shallow === 'true') return map
    const out = execFileSync(
      'git',
      ['log', '--format=format:%cI', '--name-only', '--', 'packages/docs/docs'],
      { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
    ).toString()
    let date = ''
    for (const line of out.split(/\r?\n/)) {
      if (/^\d{4}-\d{2}-\d{2}T/.test(line)) {
        date = line
      } else if (date && line.endsWith('.md')) {
        // git 输出仓库相对路径，转成 docs 相对路径（与 transformItems 中 source 一致）
        const rel = line.startsWith('packages/docs/docs/') ? line.slice('packages/docs/docs/'.length) : line
        if (!map.has(rel)) map.set(rel, date)
      }
    }
  } catch {
    // 无 git 环境等：静默降级，sitemap 不含 lastmod
  }
  return map
}

export default defineConfig({
  title: 'OAS-UI',
  description: '框架无关的 Web Components UI 组件库',
  lang: 'zh-CN',
  cleanUrls: CLEAN_URLS,
  // markdown 围栏代码块双主题：暗色从 github-dark 换 github-dark-high-contrast。
  // 缺陷：github-dark 的 comment(#818e99)/keyword(#F97583)/entity(#B392F0) 压暗色代码底
  // （--vp-code-block-bg #161618）感知分仅 39.8/49.8/51.5，低于 a11y 门禁 60 分线——guide 页
  // 正文代码块纳入 axe 审计后整块红灯。high-contrast 主题全部常规 token 在 #161618/#27272a 上
  // ≥60（comment #bdc4cc=69.5、字符串 #addcff=80.9、关键字紫 #dbb7ff=71.0），离线按
  // packages/theme/oklab.ts 同公式逐色复核；theme/index.css 侧无感（文档站 token 不依赖 shiki）。
  markdown: {
    theme: { light: 'github-light', dark: 'github-dark-high-contrast' },
  },
  // 生成 sitemap.xml；VitePress 会按 locale 分组自动补 <xhtml:link rel="alternate"> hreflang
  sitemap: {
    hostname: SITE_URL,
    // 内置只补各语言版本 alternate（zh-CN/en），缺 x-default；这里补上（指向中文默认版）。
    // 同时按 URL 反查源 md 文件，注入 <lastmod>（git 最后提交时间）——搜索引擎据新鲜度定抓取
    // 优先级。一次性 git log 解析全 docs 目录历史（而非每文件一次调用，Windows 上 340 次
    // fork 开销过大）；从未提交过的新文件拿不到时间则省略该字段，不造假。
    transformItems(items) {
      const lastmodByFile = gitLastmodByFile()
      // 同一页面组的 zh/en 两个 item 共享同一个 links 数组引用：x-default 补链每组只做一次，
      // 否则第二个 item 会因「已存在 x-default」被 skip 连带跳过下面的 lastmod 注入
      const xDefaultDone = new WeakSet<unknown[]>()
      for (const item of items) {
        const links = item.links
        if (links && links.length >= 2 && !xDefaultDone.has(links)) {
          xDefaultDone.add(links)
          if (!links.some((link) => link.lang === 'x-default')) {
            const fallback = links.find((link) => link.lang === 'zh-CN')
            if (fallback) links.push({ lang: 'x-default', url: fallback.url })
          }
        }
        const rel = item.url.startsWith('/') ? item.url.slice(1) : item.url
        // 首页 url 为 ''（index.md 归一的产物）；目录页以 / 结尾（如 en/）
        const source = rel === '' ? 'index.md' : rel.endsWith('/') ? `${rel}index.md` : `${rel}.md`
        const lastmod = lastmodByFile.get(source)
        if (lastmod) item.lastmod = lastmod
      }
      return items
    },
  },
  // robots.txt 由构建期生成（而非 public/ 静态文件），Sitemap 与其余 SEO 绝对 URL 共用同一个 SITE_URL，
  // 避免域名散落多处；buildEnd 在 public 拷贝与 sitemap 生成之后执行，必然覆盖任何同名静态文件。
  buildEnd(siteConfig) {
    writeFileSync(
      join(siteConfig.outDir, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    )
    // 每页 markdown 镜像（llmstxt.org：`/foo.md` 原样 markdown，配合 head 的 rel=alternate）——
    // 写入**构建产物**。**不放 public/**：dev 下 public/ 是 Vite 静态根，会与 VitePress 把同一 `.md`
    // 当作页面模块加载的路由同路径冲突 → 整站该页 404（2026-10-10 实抓）。
    const walk = (rel: string): void => {
      for (const ent of readdirSync(join(DOCS_DIR, rel), { withFileTypes: true })) {
        if (rel === '' && (ent.name === '.vitepress' || ent.name === 'public')) continue
        const child = rel ? `${rel}/${ent.name}` : ent.name
        if (ent.isDirectory()) walk(child)
        else if (ent.name.endsWith('.md')) {
          const dest = join(siteConfig.outDir, child)
          mkdirSync(dirname(dest), { recursive: true })
          copyFileSync(join(DOCS_DIR, child), dest)
        }
      }
    }
    walk('')
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon-180.png' }],
    // OG 大图在 Google 发现/搜索预览中完整展示（theme-color 明暗双值经实测会被 VitePress
    // head 序列化按 name 去重，无法双发，放弃）
    ['meta', { name: 'robots', content: 'max-image-preview:large' }],
    // 语言偏好跳转（仅对显式保存过偏好的回访用户）：localStorage oas-lang=en 时中文 root 与中文
    // 深链跳对应英文页。爬虫没有 localStorage，永远看到 URL 所标示的语言；不做任何基于
    // navigator.language 的自动跳转——语言推荐走 hreflang + 可见的 LangHint 提示条，URL 即真源。
    // 已带 /en/ 前缀的路径视为显式英文，永不回弹。location.replace 不产生历史记录；
    // 脚本内联在 head 尽早执行（减少语言闪烁）。
    // 第二段职责：绘制前按与 LangHint.evaluate() 完全相同的规则预置 oas-lang-hint-predict 类，
    // 让框架提前为提示条让位 36px（消 CLS）；LangHint 挂载后对账撤除（局部存储竞态时自愈）。
    [
      'script',
      {},
      `(function () {
  try {
    var path = location.pathname
    var onEn = path === '/en' || path === '/en/' || path.indexOf('/en/') === 0
    var pref = localStorage.getItem('oas-lang')
    if (pref === 'en' && !onEn) location.replace('/en' + path + location.search + location.hash)
    if (pref == null && !localStorage.getItem('oas-lang-hint-dismissed')) {
      var ls = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
      var hasZh = false
      for (var i = 0; i < ls.length; i++) {
        if (ls[i] && ls[i].toLowerCase().indexOf('zh') === 0) hasZh = true
      }
      if (onEn ? hasZh : !hasZh) document.documentElement.classList.add('oas-lang-hint-predict')
    }
  } catch (e) {}
})()`,
    ] as [string, Record<string, string>, string],
    // Google Analytics 4（统计 ID G-RXS142HBXF）——仅生产构建注入；dev 环境（vitepress dev）不加载
    // e2e 构建显式设置 OAS_DOCS_ANALYTICS=0，避免测试依赖外网 GTM；正式生产构建仍默认注入
    // SPA 路由切换的 page_view 由 theme 里 router.afterEach 补充（同样仅 PROD）
    ...(process.env.NODE_ENV === 'production' && process.env.OAS_DOCS_ANALYTICS !== '0'
      ? [
          [
            'script',
            { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-RXS142HBXF' },
          ] as [string, Record<string, string>],
          [
            'script',
            {},
            `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-RXS142HBXF');`,
          ] as [string, Record<string, string>, string],
        ]
      : []),
  ],
  // 逐页注入 SEO head：canonical、hreflang 中英互指、Open Graph / Twitter 卡片；首页额外补 JSON-LD。
  // title / description 由 VitePress 传入，已含站点后缀与页面级兜底，直接复用避免二次拼接。
  transformHead({ pageData, title, description }) {
    if (pageData.isNotFound) return []
    const rel = pageData.relativePath
    const canonical = SITE_URL + pageUrl(rel)
    const en = isEnglishPage(rel)
    const zhUrl = SITE_URL + pageUrl(en ? rel.slice(EN_PREFIX.length) : rel)
    const enUrl = SITE_URL + pageUrl(en ? rel : EN_PREFIX + rel)
    const isHome = rel === 'index.md' || rel === 'en/index.md'
    const ogImage = SITE_URL + '/og-image.jpg'
    // 分享卡片的 alt 随页面语言——英文页挂中文 alt 会让英文社交时间线的读屏/降级展示失语
    const ogImageAlt = en
      ? 'OAS-UI — Framework-agnostic Web Components UI library'
      : 'OAS-UI — 框架无关的 Web Components UI 组件库'
    const head: HeadConfig[] = [
      ['link', { rel: 'canonical', href: canonical }],
      ['link', { rel: 'alternate', hreflang: 'zh-CN', href: zhUrl }],
      ['link', { rel: 'alternate', hreflang: 'en', href: enUrl }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: zhUrl }],
      ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
      ['meta', { property: 'og:site_name', content: SITE_NAME }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:image', content: ogImage }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:alt', content: ogImageAlt }],
      ['meta', { property: 'og:locale', content: en ? 'en_US' : 'zh_CN' }],
      ['meta', { property: 'og:locale:alternate', content: en ? 'zh_CN' : 'en_US' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:image', content: ogImage }],
      ['meta', { name: 'twitter:image:alt', content: ogImageAlt }],
    ]
    // LLM/agent 友好：每页指到其 markdown 版本（llmstxt.org 规范的 rel 关系）+ 根索引。
    // md 镜像由本文件的 buildEnd 原样复制进**构建产物**（仅生产 dist 可得；dev 下该链接 404 属预期——
    // 绝不能放 public/，否则与 .md 页面模块路由同路径冲突致整站 404）。
    const mdUrl = pageUrl(rel).endsWith('/') ? `${pageUrl(rel)}index.md` : `${pageUrl(rel)}.md`
    head.push(['link', { rel: 'alternate', type: 'text/markdown', href: mdUrl }])
    head.push(['link', { rel: 'describedby', href: '/llms.txt' }])
    if (isHome) {
      head.push([
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: SITE_NAME,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          description,
          url: canonical,
          license: 'https://opensource.org/license/mit',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          sameAs: [
            'https://github.com/openappsys/oas-ui',
            'https://www.npmjs.com/package/@oas-ui/ui',
          ],
        }),
      ])
    } else {
      // 结构化数据：面包屑（全部文档页，层级取自侧栏结构映射）；组件页追加 SoftwareApplication
      const crumbSrc = en ? rel.slice(EN_PREFIX.length) : rel
      const crumbPath = crumbSrc.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1').replace(/\/$/, '')
      const crumb = (en ? crumbMapEn : crumbMapZh).get(crumbPath)
      if (crumb) {
        const localeRoot = en ? '/en/' : '/'
        head.push([
          'script',
          { type: 'application/ld+json' },
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: en ? 'Home' : '首页',
                item: SITE_URL + localeRoot,
              },
              { '@type': 'ListItem', position: 2, name: crumb.group },
              { '@type': 'ListItem', position: 3, name: crumb.item, item: canonical },
            ],
          }),
        ])
        // 组件页：独立 SoftwareApplication 条目（名称/描述随语言，版本取构建期包版本）
        if (crumbPath.startsWith('components/')) {
          head.push([
            'script',
            { type: 'application/ld+json' },
            JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: crumb.item,
              alternateName: `oas-${crumbPath.slice('components/'.length).replace(/\//g, '-')}`,
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              description,
              softwareVersion: VERSION,
              url: canonical,
              license: 'https://opensource.org/license/mit',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              isPartOf: { '@type': 'SoftwareApplication', name: SITE_NAME, url: SITE_URL + localeRoot },
            }),
          ])
        }
      }
    }
    return head
  },
  vue: {
    template: {
      compilerOptions: {
        // oas-* 为原生 custom elements，避免 Vue 组件解析告警并原样透传属性
        isCustomElement: (tag: string) => tag.startsWith('oas-'),
      },
    },
  },
  vite: {
    plugins: [stripPreflightHostReset()],
    server: {
      port: 5175,
      strictPort: true, // 固定 5175，端口被占时直接报错而不是自增到 5176/5177
    },
    optimizeDeps: {
      // workspace 包经 symlink 直接解析 packages/*/dist（与生产同一份产物），
      // 显式 exclude 防止被纳入预构建缓存——否则改 dist 后须清 .vitepress/cache 才生效。
      // 子路径入口（`@oas-ui/core/format-byte`）是独立 dist 模块，同样要排除。
      exclude: ['@oas-ui/ui', '@oas-ui/core', '@oas-ui/core/format-byte', '@oas-ui/i18n', '@oas-ui/icons'],
    },
  },
  themeConfig: {
    logo: { light: '/favicon.svg', dark: '/favicon-dark.svg' },
    nav: [
      ...versionNav(),
      { text: '指南', link: '/guide/getting-started' },
      { text: '设计 Token', link: '/guide/tokens' },
      {
        text: 'GitHub',
        link: 'https://github.com/openappsys/oas-ui',
        target: '_blank',
        rel: 'noopener',
      },
    ],
    footer: {
      message: '基于 MIT OR Apache-2.0 双许可发布',
      copyright: 'Copyright © 2026-present OpenAppSys, https://oas-ui.dev',
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '未找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
          en: {
            translations: {
              button: { buttonText: 'Search', buttonAriaLabel: 'Search the docs' },
              modal: {
                noResultsText: 'No results found',
                resetButtonTitle: 'Reset search',
                footer: {
                  selectText: 'to select',
                  navigateText: 'to navigate',
                  closeText: 'to close',
                },
              },
            },
          },
        },
      },
    },
    sidebar: [
      {
        text: '指南',
        collapsed: false,
        items: guideItemsZh,
      },
      ...componentSidebar,
    ],
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      description: 'Framework-agnostic Web Components UI library',
      themeConfig: {
        logo: { light: '/favicon.svg', dark: '/favicon-dark.svg' },
        nav: [
          ...versionNav('en/'),
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'Tokens', link: '/en/guide/tokens' },
          {
            text: 'GitHub',
            link: 'https://github.com/openappsys/oas-ui',
            target: '_blank',
            rel: 'noopener',
          },
        ],
        footer: {
          message: 'Released under the MIT OR Apache-2.0 License.',
          copyright: 'Copyright © 2026-present OpenAppSys, https://oas-ui.dev',
        },
        search: {
          provider: 'local',
          options: {
            locales: {
              en: {
                translations: {
                  button: { buttonText: 'Search', buttonAriaLabel: 'Search the docs' },
                  modal: {
                    noResultsText: 'No results found',
                    resetButtonTitle: 'Reset search',
                    footer: {
                      selectText: 'to select',
                      navigateText: 'to navigate',
                      closeText: 'to close',
                    },
                  },
                },
              },
            },
          },
        },
        sidebar: [
          {
            text: 'Guide',
            collapsed: false,
            items: guideItemsEn,
          },
          ...enComponentSidebar,
        ],
      },
    },
  },
})
