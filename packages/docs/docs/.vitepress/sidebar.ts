import type { DefaultTheme } from 'vitepress'

/**
 * 组件导航单一数据源：中文/英文 sidebar 与总览页共用同一顺序。
 * 分组保留产品语义；组内按 URL slug 字母排序，新增组件后可稳定查找。
 */

/**
 * 组件分组侧栏（中文）。英文侧栏由 enComponentSidebar 派生：
 * 分组名走 enGroupNames 映射，条目名取组件英文名，链接加 /en 前缀。
 */
export const componentSidebar: DefaultTheme.SidebarItem[] = [
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
      { text: 'FloatingPanel 悬浮面板', link: '/components/floating-panel' },
    ],
  },
  {
    text: '数据展示组件',
    collapsed: true,
    items: [
      { text: 'Table 表格', link: '/components/table' },      { text: 'Tree 树', link: '/components/tree' },
      { text: 'VirtualList 虚拟列表', link: '/components/virtual-list' },
      { text: 'JSONViewer JSON 查看器', link: '/components/json-viewer' },
      { text: 'DiffViewer 文本差异', link: '/components/diff-viewer' },
      { text: 'Card 卡片', link: '/components/card' },
      { text: 'Avatar 头像', link: '/components/avatar' },
      { text: 'Image 图片', link: '/components/image' },
      { text: 'QRCode 二维码', link: '/components/qrcode' },
      { text: 'Barcode 条码', link: '/components/barcode' },
      { text: 'Watermark 水印', link: '/components/watermark' },
      { text: 'Collapse 折叠面板', link: '/components/collapse' },
      { text: 'Collapsible 折叠面板', link: '/components/collapsible' },
      { text: 'Descriptions 描述列表', link: '/components/descriptions' },
      { text: 'Timeline 时间线', link: '/components/timeline' },
      { text: 'List 列表', link: '/components/list' },
      { text: 'Carousel 轮播', link: '/components/carousel' },
      { text: 'Statistic 统计数值', link: '/components/statistic' },
      { text: 'Countdown 倒计时', link: '/components/countdown' },
      { text: 'RelativeTime 相对时间', link: '/components/relative-time' },
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
      { text: 'Resource 资源负载', link: '/components/resource' },
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
      { text: 'MessageActions 消息操作', link: '/components/message-actions' },
      { text: 'ToolCall 工具调用', link: '/components/tool-call' },
      { text: 'PromptInput 提示词输入', link: '/components/prompt-input' },
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

/** 组件 sidebar 统一按 URL slug 排序：分组承载语义，组内字母序承载查找效率 */
function sidebarSlug(item: DefaultTheme.SidebarItem): string {
  const match = (item.link ?? '').match(/\/components\/([^/#?]+)/)
  if (!match) throw new Error(`[oas-docs] sidebar 缺少 /components/<slug> 链接: ${item.link ?? ''}`)
  return match[1]!
}

function sortSidebarGroups(groups: DefaultTheme.SidebarItem[]): void {
  for (const group of groups) {
    group.items = [...(group.items ?? [])].sort((a, b) =>
      sidebarSlug(a).localeCompare(sidebarSlug(b), 'en'),
    )
  }
}

sortSidebarGroups(componentSidebar)

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

export const enComponentSidebar: DefaultTheme.SidebarItem[] = componentSidebar.map((group) => ({
  text: enGroupNames[group.text as string] ?? group.text,
  collapsed: group.collapsed,
  items: (group.items ?? []).map((item) => ({
    text: (item.text as string).split(' ')[0],
    link: `/en${item.link}`,
  })),
}))
