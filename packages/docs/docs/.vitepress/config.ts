import { defineConfig } from 'vitepress'
import type { DefaultTheme, HeadConfig } from 'vitepress'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

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
 * 组件分组侧栏（中文）。英文侧栏由 enComponentSidebar 派生：
 * 分组名走 enGroupNames 映射，条目名取组件英文名，链接加 /en 前缀。
 */
const componentSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: '基础组件',
    collapsed: false,
    items: [
      { text: 'Button 按钮', link: '/components/button' },
      { text: 'Icon 图标', link: '/components/icon' },
      { text: 'Tag 标签', link: '/components/tag' },
      { text: 'Badge 徽标', link: '/components/badge' },
      { text: 'Space 间距', link: '/components/space' },
      { text: 'Divider 分割线', link: '/components/divider' },
      { text: 'Link 链接', link: '/components/link' },
      { text: 'Typography 排版', link: '/components/typography' },
      { text: 'ButtonGroup 按钮组', link: '/components/button-group' },
      { text: 'Label 标签', link: '/components/label' },
      { text: 'Kbd 键盘按键', link: '/components/kbd' },
      { text: 'VisuallyHidden 视觉隐藏', link: '/components/visually-hidden' },
    ],
  },
  {
    text: '布局组件',
    collapsed: false,
    items: [
      { text: 'Layout 布局', link: '/components/layout' },
      { text: 'Sidebar 侧栏', link: '/components/sidebar' },
      { text: 'Container 容器', link: '/components/container' },
      { text: 'Grid 栅格', link: '/components/grid' },
      { text: 'Flex 弹性布局', link: '/components/flex' },
      { text: 'Splitter 分割面板', link: '/components/splitter' },
      { text: 'ScrollArea 滚动区域', link: '/components/scroll-area' },
      { text: 'Masonry 瀑布流', link: '/components/masonry' },
      { text: 'AspectRatio 等比容器', link: '/components/aspect-ratio' },
    ],
  },
  {
    text: '表单组件',
    collapsed: false,
    items: [
      { text: 'Input 输入框', link: '/components/input' },
      { text: 'Textarea 文本域', link: '/components/textarea' },
      { text: 'Checkbox 复选框', link: '/components/checkbox' },
      { text: 'Radio 单选框', link: '/components/radio' },
      { text: 'Switch 开关', link: '/components/switch' },
      { text: 'Segmented 分段器', link: '/components/segmented' },
              { text: 'Picker 滚轮选择器', link: '/components/picker' },
        { text: 'Slider 滑块', link: '/components/slider' },
      { text: 'Knob 旋钮', link: '/components/knob' },
      { text: 'InputNumber 数字输入', link: '/components/input-number' },
      { text: 'Rate 评分', link: '/components/rate' },
      { text: 'Select 选择器', link: '/components/select' },
      { text: 'AutoComplete 自动完成', link: '/components/auto-complete' },
      { text: 'Combobox 组合框', link: '/components/combobox' },
      { text: 'Cascader 级联选择', link: '/components/cascader' },
      { text: 'TreeSelect 树选择', link: '/components/tree-select' },
      { text: 'Mentions 提及', link: '/components/mentions' },
      { text: 'DatePicker 日期选择', link: '/components/date-picker' },
      { text: 'TimePicker 时间选择', link: '/components/time-picker' },
      { text: 'Calendar 日历', link: '/components/calendar' },
      { text: 'Upload 上传', link: '/components/upload' },
      { text: 'Transfer 穿梭框', link: '/components/transfer' },
      { text: 'ColorPicker 颜色选择器', link: '/components/color-picker' },
      { text: 'Swatch 色板', link: '/components/swatch' },
      { text: 'ToggleButton 切换按钮', link: '/components/toggle-button' },
      { text: 'ToggleGroup 切换组', link: '/components/toggle-group' },
      { text: 'PinInput 验证码', link: '/components/pin-input' },
      { text: 'DynamicInput 动态列表', link: '/components/dynamic-input' },
      { text: 'DynamicTags 动态标签', link: '/components/dynamic-tags' },
      { text: 'Editable 就地编辑', link: '/components/editable' },
      { text: 'Form 表单', link: '/components/form' },
      { text: 'Questionnaire 多步问答', link: '/components/questionnaire' },
    ],
  },
  {
    text: '反馈与浮层组件',
    collapsed: true,
    items: [
      { text: 'Tooltip 文字提示', link: '/components/tooltip' },
      { text: 'Popover 气泡卡片', link: '/components/popover' },
      { text: 'HoverCard 悬停卡片', link: '/components/hover-card' },
      { text: 'Message 消息提示', link: '/components/message' },
      { text: 'Notification 通知', link: '/components/notification' },
      { text: 'Toast 轻提示', link: '/components/toast' },
      { text: 'Snackbar 消息条', link: '/components/snackbar' },
      { text: 'Backdrop 遮罩', link: '/components/backdrop' },
      { text: 'BottomSheet 底部抽屉', link: '/components/bottom-sheet' },
      { text: 'Modal 对话框', link: '/components/modal' },
      { text: 'Confirm 确认框', link: '/components/confirm' },
      { text: 'Drawer 抽屉', link: '/components/drawer' },
      { text: 'Popconfirm 气泡确认', link: '/components/popconfirm' },
      { text: 'Alert 警告提示', link: '/components/alert' },
      { text: 'NoticeBar 通告栏', link: '/components/notice-bar' },
      { text: 'PullRefresh 下拉刷新', link: '/components/pull-refresh' },
      { text: 'Progress 进度条', link: '/components/progress' },
      { text: 'LoadingBar 顶部加载', link: '/components/loading-bar' },
      { text: 'Spin 加载中', link: '/components/spin' },
      { text: 'Skeleton 骨架屏', link: '/components/skeleton' },
      { text: 'Empty 空状态', link: '/components/empty' },
      { text: 'Result 结果页', link: '/components/result' },
    ],
  },
  {
    text: '导航组件',
    collapsed: true,
    items: [
      { text: 'Menu 菜单', link: '/components/menu' },
      { text: 'Dropdown 下拉菜单', link: '/components/dropdown' },
      { text: 'ContextMenu 右键菜单', link: '/components/context-menu' },
      { text: 'Command 命令面板', link: '/components/command' },
      { text: 'Menubar 应用菜单栏', link: '/components/menubar' },
      { text: 'NavigationMenu 多级导航', link: '/components/navigation-menu' },
      { text: 'Toolbar 工具栏', link: '/components/toolbar' },
      { text: 'AppBar 应用栏', link: '/components/app-bar' },
      { text: 'Breadcrumb 面包屑', link: '/components/breadcrumb' },
      { text: 'Anchor 锚点', link: '/components/anchor' },
      { text: 'IndexBar 索引栏', link: '/components/index-bar' },
      { text: 'BackTop 回到顶部', link: '/components/back-top' },
      { text: 'Tour 引导', link: '/components/tour' },
      { text: 'Tabs 标签页', link: '/components/tabs' },
      { text: 'BottomNavigation 底部导航', link: '/components/bottom-navigation' },
      { text: 'Pagination 分页', link: '/components/pagination' },
      { text: 'Steps 步骤条', link: '/components/steps' },
      { text: 'Stepper 步骤面板', link: '/components/stepper' },
      { text: 'Affix 固钉', link: '/components/affix' },
      { text: 'PageHeader 页头', link: '/components/page-header' },
      { text: 'FloatButton 悬浮按钮', link: '/components/float-button' },
      { text: 'SpeedDial 悬浮动作', link: '/components/speed-dial' },
    ],
  },
  {
    text: '工作台构件',
    collapsed: true,
    items: [
      { text: 'TitleBar 标题栏', link: '/components/titlebar' },
      { text: 'StatusBar 状态栏', link: '/components/statusbar' },
      { text: 'Inspector 属性检视面板', link: '/components/inspector' },
      { text: 'ActionBar 操作栏', link: '/components/action-bar' },
    ],
  },
  {
    text: '数据展示组件',
    collapsed: true,
    items: [
      { text: 'Table 表格', link: '/components/table' },      { text: 'Tree 树', link: '/components/tree' },
      { text: 'VirtualList 虚拟列表', link: '/components/virtual-list' },
      { text: 'Card 卡片', link: '/components/card' },
      { text: 'Avatar 头像', link: '/components/avatar' },
      { text: 'Image 图片', link: '/components/image' },
      { text: 'QRCode 二维码', link: '/components/qrcode' },
      { text: 'Barcode 条码', link: '/components/barcode' },
      { text: 'Watermark 水印', link: '/components/watermark' },
      { text: 'Collapse 折叠面板', link: '/components/collapse' },
      { text: 'Descriptions 描述列表', link: '/components/descriptions' },
      { text: 'Timeline 时间线', link: '/components/timeline' },
      { text: 'List 列表', link: '/components/list' },
      { text: 'Carousel 轮播', link: '/components/carousel' },
      { text: 'Statistic 统计数值', link: '/components/statistic' },
      { text: 'Countdown 倒计时', link: '/components/countdown' },
      { text: 'Ellipsis 文本省略', link: '/components/ellipsis' },
      { text: 'Chart 图表', link: '/components/chart' },
      { text: 'Code 代码块', link: '/components/code' },
      { text: 'Equation 数学公式', link: '/components/equation' },
      { text: 'Log 日志流', link: '/components/log' },
      { text: 'Comment 评论', link: '/components/comment' },
      { text: 'Marquee 跑马灯', link: '/components/marquee' },
      { text: 'NumberAnimation 数字滚动', link: '/components/number-animation' },
      { text: 'GradientText 渐变文字', link: '/components/gradient-text' },
      { text: 'Highlight 文本高亮', link: '/components/highlight' },
      { text: 'SwipeCell 滑动操作', link: '/components/swipe-cell' },
      { text: 'Kanban 看板', link: '/components/kanban' },
      { text: 'Scheduler 日程调度', link: '/components/scheduler' },
      { text: 'Gantt 甘特图', link: '/components/gantt' },
    ],
  },
  {
    text: '会话组件',
    collapsed: true,
    items: [
      { text: 'Bubble 气泡', link: '/components/bubble' },
      { text: 'Attachment 附件', link: '/components/attachment' },
      { text: 'MessageScroller 会话滚动容器', link: '/components/message-scroller' },
      { text: 'Marker 会话标记', link: '/components/marker' },
      { text: 'MessageRow 消息行', link: '/components/message-row' },
    ],
  },
  {
    text: '框架级容器',
    collapsed: true,
    items: [
      { text: 'ConfigProvider 全局配置', link: '/components/config-provider' },
      { text: 'App 消息上下文', link: '/components/app' },
      { text: 'ThemeEditor 主题编辑器', link: '/components/theme-editor' },
    ],
  },
]

const enGroupNames: Record<string, string> = {
  基础组件: 'Basic',
  布局组件: 'Layout',
  表单组件: 'Form',
  反馈与浮层组件: 'Feedback & Overlays',
  导航组件: 'Navigation',
  工作台构件: 'Workbench',
  数据展示组件: 'Data Display',
  会话组件: 'Conversation',
  框架级容器: 'Framework Containers',
}

const enComponentSidebar: DefaultTheme.SidebarItem[] = componentSidebar.map((group) => ({
  text: enGroupNames[group.text as string] ?? group.text,
  collapsed: group.collapsed,
  items: (group.items ?? []).map((item) => ({
    text: (item.text as string).split(' ')[0],
    link: `/en${item.link}`,
  })),
}))

export default defineConfig({
  title: 'OAS-UI',
  description: '框架无关的 Web Components UI 组件库',
  lang: 'zh-CN',
  cleanUrls: CLEAN_URLS,
  // 生成 sitemap.xml；VitePress 会按 locale 分组自动补 <xhtml:link rel="alternate"> hreflang
  sitemap: {
    hostname: SITE_URL,
  },
  // robots.txt 由构建期生成（而非 public/ 静态文件），Sitemap 与其余 SEO 绝对 URL 共用同一个 SITE_URL，
  // 避免域名散落多处；buildEnd 在 public 拷贝与 sitemap 生成之后执行，必然覆盖任何同名静态文件。
  buildEnd(siteConfig) {
    writeFileSync(
      join(siteConfig.outDir, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    )
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon-180.png' }],
    // 语言偏好跳转：只认「用户显式切换过」的偏好（localStorage oas-lang=en），中文 root 与中文深链
    // 才跳对应英文页；不再按浏览器语言（navigator.language）自动跳——否则 Googlebot 默认 en-US 会被
    // 从中文页带走、稀释中文页收录（Google 明确建议避免按感知语言自动跳转）。首访一律留中文（默认
    // 语言），已带 /en/ 前缀的路径视为显式英文，永不回弹。location.replace 不产生历史记录；脚本内联
    // 在 head 尽早执行（减少语言闪烁）。
    [
      'script',
      {},
      `(function () {
  try {
    var path = location.pathname
    var onEn = path === '/en' || path.indexOf('/en/') === 0
    if (onEn) return
    if (localStorage.getItem('oas-lang') === 'en') location.replace('/en' + path)
  } catch (e) {}
})()`,
    ] as [string, Record<string, string>, string],
    // Google Analytics 4（统计 ID G-RXS142HBXF）——仅生产构建注入；dev 环境（vitepress dev，NODE_ENV=development）不加载
    // SPA 路由切换的 page_view 由 theme 里 router.afterEach 补充（同样仅 PROD）
    ...(process.env.NODE_ENV === 'production'
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
    const ogImage = SITE_URL + '/favicon-512.png'
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
      ['meta', { property: 'og:locale', content: en ? 'en_US' : 'zh_CN' }],
      ['meta', { property: 'og:locale:alternate', content: en ? 'zh_CN' : 'en_US' }],
      ['meta', { name: 'twitter:card', content: 'summary' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
      ['meta', { name: 'twitter:image', content: ogImage }],
    ]
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
    server: {
      port: 5175,
      strictPort: true, // 固定 5175，端口被占时直接报错而不是自增到 5176/5177
    },
    optimizeDeps: {
      // workspace 包经 symlink 直接解析 packages/*/dist（与生产同一份产物），
      // 显式 exclude 防止被纳入预构建缓存——否则改 dist 后须清 .vitepress/cache 才生效。
      exclude: ['@oas-ui/ui', '@oas-ui/core', '@oas-ui/i18n', '@oas-ui/icons'],
    },
  },
  themeConfig: {
    logo: { light: '/favicon.svg', dark: '/favicon-dark.svg' },
    nav: [
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
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '主题与自定义', link: '/guide/theming' },
          { text: '皮肤画廊', link: '/guide/skins' },
          { text: '液态玻璃画廊', link: '/guide/glass' },
          { text: '设计 Token', link: '/guide/tokens' },
          { text: '无障碍（A11y）', link: '/guide/accessibility' },
          { text: '集成 FAQ', link: '/guide/faq' },
      { text: '场景方案', link: '/guide/recipes' },
          { text: 'SSR 边界策略', link: '/guide/ssr' },
          { text: '组件总览', link: '/components/' },
          { text: '更新记录', link: '/changelog' },
        ],
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
            items: [
              { text: 'Getting Started', link: '/en/guide/getting-started' },
              { text: 'Theming', link: '/en/guide/theming' },
              { text: 'Skin Gallery', link: '/en/guide/skins' },
              { text: 'Design Tokens', link: '/en/guide/tokens' },
              { text: 'Accessibility (A11y)', link: '/en/guide/accessibility' },
              { text: 'Integration FAQ', link: '/en/guide/faq' },
      { text: 'Scenarios', link: '/en/guide/recipes' },
              { text: 'SSR Strategy', link: '/en/guide/ssr' },
              { text: 'Overview', link: '/en/components/' },
              { text: 'Changelog', link: '/en/changelog' },
            ],
          },
          ...enComponentSidebar,
        ],
      },
    },
  },
})
