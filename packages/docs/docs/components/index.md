# 组件总览

OAS-UI 提供 115 个框架无关的 Web Components 组件，按用途划分为 7 个分组。点击组件名可查看该组件的完整文档与示例。

## 基础组件

- [Button 按钮](/components/button) —— 基础按钮组件，原生 `<button>` 增强。
- [Icon 图标](/components/icon) —— 原创线性图标集，按名渲染内联 SVG，tree-shakable。
- [Tag 标签](/components/tag) —— 用于标记和分类的小型标签。
- [Badge 徽标](/components/badge) —— 数字/状态徽标，通常用于消息计数或新内容提示。
- [Space 间距](/components/space) —— 水平/垂直等距布局容器。
- [Divider 分割线](/components/divider) —— 区隔内容的水平/垂直分割线。
- [Link 链接](/components/link) —— 原生 `<a>` 增强的文字链接。
- [Typography 排版](/components/typography) —— 文本、标题、段落排版组件。
- [ButtonGroup 按钮组](/components/button-group) —— 按钮组：将多个 `oas-button` 组合为一个选值组，相邻按钮圆角合并、hover 只亮当前项。
- [Label 标签](/components/label) —— 表单标签组件，`for` 指向目标控件 id，点击代理聚焦目标控件；支持必填星号与星号位置。
- [Kbd 键盘按键](/components/kbd) —— 键盘快捷键展示组件，`keys` 按空格拆分自动渲染多块并用 `+` 连接；非交互组件。
- [VisuallyHidden 视觉隐藏](/components/visually-hidden) —— 内容对屏幕阅读器可见、视觉上不可见的容器。常用于辅助说明文案、表单校验提示等无障碍场景。

## 表单组件

- [Input 输入框](/components/input) —— 原生 `<input>` 增强的基础输入组件。
- [Textarea 文本域](/components/textarea) —— 原生 `<textarea>` 增强，支持高度自适应与尺寸调整。
- [Checkbox 复选框](/components/checkbox) —— 原生 `<input type="checkbox">` 增强，支持半选与多选组。
- [Radio 单选框](/components/radio) —— 原生 `<input type="radio">` 增强，支持单选组与受控 value。
- [Switch 开关](/components/switch) —— `role="switch"` 的开关按钮。
- [Slider 滑块](/components/slider) —— 原生 `<input type="range">` 增强的滑动条。
- [InputNumber 数字输入](/components/input-number) —— 原生 `<input type="number">` 增强，带步进按钮并支持范围约束。
- [Rate 评分](/components/rate) —— 星级评分，支持键盘方向键调节，默认点击已选中的同一颗星可清空。
- [Select 选择器](/components/select) —— 下拉选择器，支持单选、多选、分组、可清空、远程搜索与自定义创建，键盘可操作。
- [AutoComplete 自动完成](/components/auto-complete) —— 输入即推荐，支持键盘上下选择、回车确认、Esc 关闭。
- [Combobox 组合框](/components/combobox) —— 输入框即控件的可过滤单选组合框：**常显可编辑的输入框**显示选中项 label，输入实时过滤选项，选中后 `value` 取 `option.value`。
- [Cascader 级联选择](/components/cascader) —— 多级联动选择，支持任意层级提交与路径回显。
- [TreeSelect 树选择](/components/tree-select) —— 树形结构选择，支持父子级联多选。
- [Mentions 提及](/components/mentions) —— 输入 `@` 触发建议浮层的提及输入组件，适合 @成员 / @任务 等场景。
- [DatePicker 日期选择](/components/date-picker) —— 日期选择器，支持单日期、日期范围、月份与日期时间四种类型，键盘可操作，`Intl.DateTimeFormat` 格式化。
- [TimePicker 时间选择](/components/time-picker) —— 时间选择器，下拉时分列选择，`↑`/`↓` 调整、`Enter` 确认、`Esc` 取消，支持步进间隔。
- [Calendar 日历](/components/calendar) —— 日历组件，月/年两种模式，支持选中、禁用日期、周号与键盘网格导航；日期描述走 `Intl.DateTimeFormat`（locale 感知）。
- [Upload 上传](/components/upload) —— 点击或拖拽选择文件，展示文件列表与上传进度。
- [Transfer 穿梭框](/components/transfer) —— 左右双面板 + 中间穿梭按钮，支持搜索过滤与键盘操作。
- [ColorPicker 颜色选择器](/components/color-picker) —— 触发色块弹出调色面板，支持预设色、HSV 与 RGB 输入。
- [ToggleButton 切换按钮](/components/toggle-button) —— `aria-pressed` 二态切换按钮，按下态使用主色底。
- [ToggleGroup 切换组](/components/toggle-group) —— 单选/多选互斥的按钮组：单选组用 radio 语义、多选组用 checkbox 语义，键盘方向键切换，受控 `value`。
- [PinInput 验证码](/components/pin-input) —— 分格验证码输入，支持键盘方向键移动、Backspace 回退、粘贴自动分发。
- [DynamicInput 动态列表](/components/dynamic-input) —— 数组字段的增删编辑，每行复用 `oas-input` 组件，支持受控/非受控双模式。
- [DynamicTags 动态标签](/components/dynamic-tags) —— 输入框回车/逗号提交生成标签，支持去重、上限与键盘删除。
- [Editable 就地编辑](/components/editable) —— 点击/回车/空格进入编辑态，Enter 提交、Esc 取消，空值提交默认非破坏。
- [Form 表单](/components/form) —— 原生 `<form>` 增强，支持按 `rules` 规则对内部字段做校验与提交。
- [FormItem 表单项](/components/form#栅格表单布局) —— `oas-form-item`：label + 控件容器 + 错误提示位，在 `layout="grid"` 的表单内按 `span` 栅格占列。

## 反馈组件

- [Message 消息提示](/components/message) —— 命令式全局消息提示，支持类型、自定义时长与手动关闭。
- [Notification 通知](/components/notification) —— 右上角通知卡片，支持标题、描述、时长与类型。
- [Toast 轻提示](/components/toast) —— 命令式全局轻提示，支持成功/错误/警告/信息/加载态、操作按钮与 promise 链，默认 3 秒自动关闭。
- [Snackbar 消息条](/components/snackbar) —— 底部（或顶部）弹出的轻量反馈条，`open` 属性受控，可带操作按钮，默认 4 秒后派发 `oas-close` 由外部负责关闭。
- [Backdrop 遮罩](/components/backdrop) —— 全屏半透明遮罩，支持 `transparent`/`blur` 变体与 body 滚动锁定；`open=false` 时自动卸载节点，不留孤儿 DOM。
- [Modal 对话框](/components/modal) —— 模态对话框，用于需要用户确认或输入的中断场景。
- [Confirm 确认框](/components/confirm) —— 命令式确认对话框，基于 Promise，底层复用 `oas-modal`。
- [Drawer 抽屉](/components/drawer) —— 从侧边滑出的面板，常用于筛选条件、详情信息等场景。
- [Popconfirm 气泡确认](/components/popconfirm) —— 在触发元素旁显示确认气泡，常用于删除等危险操作前的二次确认。
- [Alert 警告提示](/components/alert) —— 内嵌式提示条，用于展示成功、信息、警告或错误信息，支持自定义标题与关闭按钮。
- [Progress 进度条](/components/progress) —— 显示任务执行进度，支持线形与圆环两种形态、状态色与隐藏文字。
- [LoadingBar 顶部加载](/components/loading-bar) —— 页面顶部的全局加载进度条，命令式 API 驱动。
- [Spin 加载中](/components/spin) —— 加载指示器，可单独使用，也可包裹内容并叠加遮罩。
- [Skeleton 骨架屏](/components/skeleton) —— 加载时的占位骨架，支持头像、标题、多行段落与流光动画。
- [Empty 空状态](/components/empty) —— 空数据时的占位展示，支持自定义描述、自定义插画与尺寸、隐藏插画与操作区。
- [Result 结果页](/components/result) —— 操作结果反馈页，支持成功、失败、警告、信息四种状态。

## 导航与浮层组件

- [Tooltip 文字提示](/components/tooltip) —— 简单的文字提示气泡，hover 或键盘聚焦触发。
- [Popover 气泡卡片](/components/popover) —— 点击触发，可承载标题、正文与自定义内容的浮层面板。
- [Menu 菜单](/components/menu) —— 独立的菜单列表，支持选中态与键盘导航。
- [Dropdown 下拉菜单](/components/dropdown) —— 点击触发器展开菜单，浮层定位到触发元素旁。
- [ContextMenu 右键菜单](/components/context-menu) —— 在包裹区域内右键弹出菜单，菜单定位在鼠标位置。
- [HoverCard 悬停卡片](/components/hover-card) —— hover / 聚焦触发，可配置延迟的预览卡片。
- [Breadcrumb 面包屑](/components/breadcrumb) —— 展示页面层级路径，末项为当前页（不可点击）。
- [Anchor 锚点](/components/anchor) —— 滚动监听当前章节并自动高亮，点击锚点平滑滚动定位。
- [BackTop 回到顶部](/components/back-top) —— 固定于视口角落的回到顶部按钮，点击平滑滚动到页面顶部。
- [Tour 引导](/components/tour) —— 分步功能引导，带全屏遮罩与目标高亮。
- [Command 命令面板](/components/command) —— 命令面板（⌘K / Ctrl+K）——搜索过滤、键盘选择、Enter 执行。`open` 受控：可由外部设置，也可用 ⌘K 全局快捷键或 Esc 关闭（关闭时派发 `oas-select` / 移除 `open`）。
- [Menubar 应用菜单栏](/components/menubar) —— 桌面应用式顶部菜单条（文件 / 编辑 / 视图），点击 / 悬停展开子菜单（级联浮出），支持方向键、`Alt` 访问键与焦点陷阱。
- [NavigationMenu 多级导航](/components/navigation-menu) —— 网站式多级导航栏：悬停 / 键盘展开子菜单（级联浮出），带 `href` 的叶子项渲染为链接。
- [Toolbar 工具栏](/components/toolbar) —— 工具按钮组容器：`role="toolbar"` + `aria-label`，`Tab` 进入后方向键在按钮间移动（roving tabindex，只聚焦当前项）。

## 导航与布局组件

- [Tabs 标签页](/components/tabs) —— 标签式内容切换，支持键盘方向键导航；未激活面板通过 `hidden` 隐藏。`oas-tabs` + `oas-tab-panel` 配套使用。
- [BottomNavigation 底部导航](/components/bottom-navigation) —— 移动端底部导航栏：`role="tablist"` + 每项 `role="tab"` + `aria-selected` 同步，键盘左右移动焦点（roving tabindex）、Enter/Space 选中，激活项主色 + 图标，顶部细分隔线。
- [Pagination 分页](/components/pagination) —— 数据分页导航，支持页码省略、前后翻页、自定义相邻页码数、总数展示、每页条数切换与快速跳转。
- [Steps 步骤条](/components/steps) —— 引导用户按流程完成任务的步骤指示器，支持等待 / 进行中 / 完成 / 错误四种状态、纵向排布与可点击跳转。
- [Segmented 分段器](/components/segmented) —— 单选的线性分段选择器，用于轻度筛选 / 切换视图，`role="radiogroup"`，可禁用单项。
- [Affix 固钉](/components/affix) —— 将内容吸附在视口顶部，页面滚动到指定偏移后自动固定，常用于固定表格操作栏、工具栏等。
- [Splitter 分割面板](/components/splitter) —— 可调整左右面板宽度的分割组件，支持鼠标拖拽与键盘方向键调整。
- [ScrollArea 滚动区域](/components/scroll-area) —— 包裹内容并接管滚动条外观的容器：细条自定义滚动条、hover 变粗，`auto-hide` 时仅在滚动/悬停时显示，滚动事件节流派发。
- [Flex 弹性布局](/components/flex) —— 基于 CSS Flexbox 的布局容器，通过属性控制方向、主轴/交叉轴对齐、间距与换行。
- [PageHeader 页头](/components/page-header) —— 页面头部信息区，支持标题、副标题、返回按钮与右侧操作区，常用于详情页、编辑页顶部。
- [FloatButton 悬浮按钮](/components/float-button) —— 默认固定于页面右下角的圆形操作按钮，常用于「新建」「反馈」等快捷操作，支持角标与自定义图标。
- [SpeedDial 悬浮动作](/components/speed-dial) —— 悬浮主按钮 + 展开子动作列表，常用于「新建/分享」等快捷操作；`aria-expanded` 同步，点击外部/Esc 收起，无孤儿浮层。
- [Layout 布局](/components/layout) —— 经典的顶部 + 侧栏 + 内容 + 底部页面骨架，配合语义化子组件使用。
- [Sidebar 侧栏](/components/sidebar) —— 可折叠侧栏：桌面端 `collapsed` 收窄为图标条，移动端（窄于 `mobile-breakpoint`，默认 768px）自动切换为覆盖式抽屉 + 遮罩，点击外部 / 关闭按钮 / Esc 收起。
- [Container 容器](/components/container) —— 定宽居中容器：按 `size` 映射 `--oas-container-*` 宽度 token，`margin-inline: auto` 居中（逻辑属性，RTL 自动合规），`max-width: min(100%, token)` 保证窄屏不溢出。
- [Grid 栅格](/components/grid) —— 24 栅格布局系统，配合 `oas-grid-item` 划分列宽，支持间距、偏移与自定义总列数；设置 `columns` 后切换为自动等分布局（simple-grid）。

## 数据展示组件

- [Table 表格](/components/table) —— 用于以行列表格形式展示结构化数据，支持排序、行选中、多选与加载态，可与分页组件联动。
- [Tree 树](/components/tree) —— 用于展示层级数据，支持选中、展开、多选、懒加载与节点拖拽。
- [VirtualList 虚拟列表](/components/virtual-list) —— 用于大数据量列表的视口窗口渲染：只渲染可见项（含上下缓冲），首尾 padding 占位撑起滚动高度，滚动事件按 rAF 节流。通用渲染原语，供 table / tree 复用。
- [Card 卡片](/components/card) —— 用于承载一组相关内容的信息容器。
- [Avatar 头像](/components/avatar) —— 用于展示用户或对象头像，支持文字占位与图片两种形态。
- [Image 图片](/components/image) —— 用于展示图片资源，支持可选预览能力。
- [QRCode 二维码](/components/qrcode) —— 基于**纯 TypeScript 零依赖编码器**（自研）的二维码组件，输出内联 SVG，可扫码、可下载。
- [Watermark 水印](/components/watermark) —— 容器级水印层，铺在内容之上且不拦截任何交互，适合敏感信息防泄露。
- [Collapse 折叠面板](/components/collapse) —— 用于将内容收纳在可折叠的面板中，聚焦关键信息。
- [Descriptions 描述列表](/components/descriptions) —— 用于成组展示只读信息，适合详情页场景。
- [Timeline 时间线](/components/timeline) —— 用于按时间顺序展示一系列事件节点。
- [List 列表](/components/list) —— 用于展示同类信息集合，可承载标题、描述与扩展操作。
- [Carousel 轮播](/components/carousel) —— 用于在同一可视区域循环展示多屏内容，支持手动切换与自动播放。
- [Statistic 统计数值](/components/statistic) —— 统计数值展示，`Intl.NumberFormat` 千分位与精度（locale 感知），支持前后缀与骨架屏加载占位。
- [Countdown 倒计时](/components/countdown) —— 倒计时组件，实时刷新、支持天/时/分/秒格式化模板，到达终点派发 `oas-finish`，断开连接自动清理计时器。
- [Ellipsis 文本省略](/components/ellipsis) —— 用于长文本的自动省略，支持单行/多行截断，溢出时悬停展示全文 tooltip，也可展开/收起。
- [Chart 图表](/components/chart) —— 自研 SVG 图表组件（零第三方图表引擎），支持折线 / 柱状 / 饼图 / 面积 / 环形 / 堆叠柱状六型，数据更新自动重绘，`prefers-reduced-motion` 时关闭动画。
- [Code 代码块](/components/code) —— 代码块组件（自研正则 token 高亮，零第三方高亮引擎），支持常见语言基础着色、行号与复制按钮。
- [Equation 数学公式](/components/equation) —— 数学公式组件（自研简化 LaTeX 子集，零第三方公式引擎），覆盖高中/大学常用公式：上下标、分数、根号、求和/积分（带上下限）、希腊字母与常用运算符。
- [Log 日志流](/components/log) —— 等宽字体的日志展示容器，支持增量追加与"贴底"自动滚动，适合构建控制台/构建输出等场景。
- [Masonry 瀑布流](/components/masonry) —— 基于 CSS columns 的瀑布流布局容器，子项自动均分到各列且不被拆分。
- [Comment 评论](/components/comment) —— 纯展示的评论块容器，通过插槽组装作者头像、名称、时间、内容与操作区；支持嵌套子评论自动缩进。
- [Marquee 跑马灯](/components/marquee) —— 循环水平滚动展示长内容的纯展示组件，内容经 slot 无缝循环；支持悬停暂停与 `prefers-reduced-motion` 静态降级。无事件。
- [NumberAnimation 数字滚动](/components/number-animation) —— 数字从当前值缓动到目标值的动画组件，到目标值停止并派发 `oas-finish`；`prefers-reduced-motion` 时直接跳目标，断开连接自动取消 rAF 无泄漏。
- [GradientText 渐变文字](/components/gradient-text) —— 以渐变色填充文字的纯展示组件，`background-clip: text` 实现；默认走主题 token 双色渐变，支持任意色标数组与方向。无事件。
- [AspectRatio 等比容器](/components/aspect-ratio) —— 按指定宽高比锁定容器尺寸的纯展示组件，宽度 100%、高度由比例推导，内容铺满并按比例裁切；无子内容时仍按比例占位。无事件。

## 框架级容器

- [ConfigProvider 全局配置](/components/config-provider) —— 全局配置的注入入口，统一管理包裹子树的 `locale` / `size` / `theme`。组件读取顺序：自身属性 > config-provider > 全局默认。
- [App 消息上下文](/components/app) —— message / notification / loadingBar 等命令式 API 的宿主容器。app 容器存在时，消息挂载到 app 内（而非 `document.body`）；可与 config-provider 配套使用。
- [ThemeEditor 主题编辑器](/components/theme-editor) —— 实时编辑 `--oas-*` 主题 token：颜色 token 用颜色选择器、数字 token 用数字输入框（去单位显示、写回带原单位），编辑即时写入宿主 CSS 变量，子树实时继承预览。默认按颜色 / 字号 / 间距 / 圆角 / 控件高度分组展示。
