import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'

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
    text: '表单组件',
    collapsed: false,
    items: [
      { text: 'Input 输入框', link: '/components/input' },
      { text: 'Textarea 文本域', link: '/components/textarea' },
      { text: 'Checkbox 复选框', link: '/components/checkbox' },
      { text: 'Radio 单选框', link: '/components/radio' },
      { text: 'Switch 开关', link: '/components/switch' },
      { text: 'Slider 滑块', link: '/components/slider' },
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
      { text: 'ToggleButton 切换按钮', link: '/components/toggle-button' },
      { text: 'ToggleGroup 切换组', link: '/components/toggle-group' },
      { text: 'PinInput 验证码', link: '/components/pin-input' },
      { text: 'DynamicInput 动态列表', link: '/components/dynamic-input' },
      { text: 'DynamicTags 动态标签', link: '/components/dynamic-tags' },
      { text: 'Editable 就地编辑', link: '/components/editable' },
      { text: 'Form 表单', link: '/components/form' },
    ],
  },
  {
    text: '反馈组件',
    collapsed: true,
    items: [
      { text: 'Message 消息提示', link: '/components/message' },
      { text: 'Notification 通知', link: '/components/notification' },
      { text: 'Toast 轻提示', link: '/components/toast' },
      { text: 'Snackbar 消息条', link: '/components/snackbar' },
      { text: 'Backdrop 遮罩', link: '/components/backdrop' },
      { text: 'Modal 对话框', link: '/components/modal' },
      { text: 'Confirm 确认框', link: '/components/confirm' },
      { text: 'Drawer 抽屉', link: '/components/drawer' },
      { text: 'Popconfirm 气泡确认', link: '/components/popconfirm' },
      { text: 'Alert 警告提示', link: '/components/alert' },
      { text: 'Progress 进度条', link: '/components/progress' },
      { text: 'LoadingBar 顶部加载', link: '/components/loading-bar' },
      { text: 'Spin 加载中', link: '/components/spin' },
      { text: 'Skeleton 骨架屏', link: '/components/skeleton' },
      { text: 'Empty 空状态', link: '/components/empty' },
      { text: 'Result 结果页', link: '/components/result' },
    ],
  },
  {
    text: '导航与浮层组件',
    collapsed: true,
    items: [
      { text: 'Tooltip 文字提示', link: '/components/tooltip' },
      { text: 'Popover 气泡卡片', link: '/components/popover' },
      { text: 'Menu 菜单', link: '/components/menu' },
      { text: 'Dropdown 下拉菜单', link: '/components/dropdown' },
      { text: 'ContextMenu 右键菜单', link: '/components/context-menu' },
      { text: 'HoverCard 悬停卡片', link: '/components/hover-card' },
      { text: 'Breadcrumb 面包屑', link: '/components/breadcrumb' },
      { text: 'Anchor 锚点', link: '/components/anchor' },
      { text: 'BackTop 回到顶部', link: '/components/back-top' },
      { text: 'Tour 引导', link: '/components/tour' },
      { text: 'Command 命令面板', link: '/components/command' },
      { text: 'Menubar 应用菜单栏', link: '/components/menubar' },
      { text: 'NavigationMenu 多级导航', link: '/components/navigation-menu' },
      { text: 'Toolbar 工具栏', link: '/components/toolbar' },
    ],
  },
  {
    text: '导航与布局组件',
    collapsed: true,
    items: [
      { text: 'Tabs 标签页', link: '/components/tabs' },
      { text: 'BottomNavigation 底部导航', link: '/components/bottom-navigation' },
      { text: 'Pagination 分页', link: '/components/pagination' },
      { text: 'Steps 步骤条', link: '/components/steps' },
      { text: 'Segmented 分段器', link: '/components/segmented' },
      { text: 'Affix 固钉', link: '/components/affix' },
      { text: 'Splitter 分割面板', link: '/components/splitter' },
      { text: 'ScrollArea 滚动区域', link: '/components/scroll-area' },
      { text: 'Flex 弹性布局', link: '/components/flex' },
      { text: 'PageHeader 页头', link: '/components/page-header' },
      { text: 'FloatButton 悬浮按钮', link: '/components/float-button' },
      { text: 'SpeedDial 悬浮动作', link: '/components/speed-dial' },
      { text: 'Layout 布局', link: '/components/layout' },
      { text: 'Sidebar 侧栏', link: '/components/sidebar' },
      { text: 'Container 容器', link: '/components/container' },
      { text: 'Grid 栅格', link: '/components/grid' },
    ],
  },
  {
    text: '数据展示组件',
    collapsed: true,
    items: [
      { text: 'Table 表格', link: '/components/table' },
      { text: 'Tree 树', link: '/components/tree' },
      { text: 'VirtualList 虚拟列表', link: '/components/virtual-list' },
      { text: 'Card 卡片', link: '/components/card' },
      { text: 'Avatar 头像', link: '/components/avatar' },
      { text: 'Image 图片', link: '/components/image' },
      { text: 'QRCode 二维码', link: '/components/qrcode' },
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
      { text: 'Masonry 瀑布流', link: '/components/masonry' },
      { text: 'Comment 评论', link: '/components/comment' },
      { text: 'Marquee 跑马灯', link: '/components/marquee' },
      { text: 'NumberAnimation 数字滚动', link: '/components/number-animation' },
      { text: 'GradientText 渐变文字', link: '/components/gradient-text' },
      { text: 'AspectRatio 等比容器', link: '/components/aspect-ratio' },
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
  表单组件: 'Form',
  反馈组件: 'Feedback',
  导航与浮层组件: 'Navigation & Overlays',
  导航与布局组件: 'Navigation & Layout',
  数据展示组件: 'Data Display',
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
      port: 5173,
      strictPort: true, // 固定 5173，端口被占时直接报错而不是自增到 5174/5175
    },
  },
  themeConfig: {
    nav: [{ text: '指南', link: '/guide/getting-started' }],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '主题与自定义', link: '/guide/theming' },
          { text: '无障碍（A11y）', link: '/guide/accessibility' },
          { text: 'SSR 边界策略', link: '/guide/ssr' },
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
        nav: [{ text: 'Guide', link: '/en/guide/getting-started' }],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Getting Started', link: '/en/guide/getting-started' },
              { text: 'Theming', link: '/en/guide/theming' },
              { text: 'Accessibility (A11y)', link: '/en/guide/accessibility' },
              { text: 'SSR Strategy', link: '/en/guide/ssr' },
            ],
          },
          ...enComponentSidebar,
        ],
      },
    },
  },
})
