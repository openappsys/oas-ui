# Changelog

所有显著变更记录于此，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [2.0.0] - 2026-08-17

### 新增

- upload：`list-type="picture-card/picture"` 照片墙 + 拖拽上传补全 + `oas-exceed`（超数提示）/ `oas-preview`（预览）插槽
- date-picker：`shortcuts` 快捷选项 / `disabled-date` 禁用日期 / `multiple` 多选
- select：自定义渲染（`oas-option-render` / `oas-tag-render`）+ 虚拟滚动
- form：`inline` 行内布局
- table：行内编辑 + 吸顶行
- modal：全屏模式 + 命令式确认（loading）
- card：封面 / 操作区 / hoverable / clickable
- badge：缎带 ribbon 角标
- avatar：徽标 + fallback
- tree：自定义节点 + 目录模式
- image：懒加载
- transfer：搜索 / 单向模式 / 虚拟滚动
- notification：进度条 / 可滚动
- slider：输入联动 / 自定义滑块 / reverse / range
- calendar：自定义单元格 / 月年模式切换
- message：分组 / 更新
- tabs：动态增删 + 图标
- steps：点状 / 导航模式
- breadcrumb：折叠 / 省略

### 修复

- tree 自定义节点在 Vue CSR 下空白（Chromium `insertBefore` 直插 template 不填充 content，`slotTemplateFragment` 回退读 childNodes，dev+SSG 双形态渲染）
- tooltip/popover 箭头 4 placement 定位修正（CSS + 几何 left/right 边框对）
- tree 自定义节点 SVG 补 `width/height` 属性（light DOM style 不穿透 shadow DOM，无属性时撑满容器）+ label 最小宽度加固
- upload 预览浮层拦截全页指针、ssr-dsd 水合回归、e2e 异步渲染 flaky 等测试链修复

### 文档

- 指南 CDN 引入示例修正（中英双版）

## [1.9.1] - 2026-08-13

### 工程

- e2e 性能优化：大 spec 文件内并行（`test.describe.configure({ mode: 'parallel' })`）——demo-coverage 10.4min→38s、code 8.3min→45s、visual 6.9min→46s；chromium 全量 ~15min→4.1min，CI e2e 3-shard 每 shard 预计 17min→~5min
- 消灭固定等待：demo-coverage 用 `load` 替代 `networkidle`、等组件 `shadowRoot` upgrade（修并行高负载下探针扑空）、事件缓冲收敛；code/smoke/visual 固定 `waitForTimeout`→`waitForSelector('.demo-block')` 自动等待
- CI webServer 跳过重复 docs build（CI 已先全量 build，直接 preview 省 ~10s/shard）
- 文档站接入 Google Analytics（head 注入 gtag + SPA 路由 `onAfterRouteChange` page_view）
- dark 冒烟背景断言改 `toHaveCSS`，消除 background transition 中间帧竞态（CI 高负载曾采到 rgb(25,25,28)）

### 修复

- GA pageerror：`enhanceApp` 注入的是 vitepress Router（无 vue-router 的 `afterEach`），改用 `onAfterRouteChange`
- Cloudflare 部署：构建命令改全量 `pnpm build`——ui 的 `tsconfig.build.json` paths 依赖 core/i18n 的 dist d.ts，单独 ui build 会报 `extends OASElement` 基类缺失
- 类名规范化 `OAStour` → `OASTour`（PascalCase）

## [1.9.0] - 2026-08-12

### 新增

- `@oas-ui/ssr` 渲染器包：`renderToString(tag, attrs, slotHTML, options)` 输出 Declarative Shadow DOM（DSD）静态快照；`@oas-ui/ui` 新增 Node-safe `ssr` 子路径导出（不执行 `customElements.define`、不触碰 DOM API）
- DSD 支持全链：基类复用 declarative shadow root、真水合（指纹判定 + hydrate 接管，DOM 引用保持，误判回退重渲染）、测量组件首帧闪动治理、数据组件声明式 JSON 通道（table/tree/select）、嵌套组件递归序列化、SSR 白名单全量覆盖 123/124 tag（表单/反馈/数据展示/导航布局/基础组件五批推进）
- `oas-form-item` 组件 + `oas-form` 栅格布局（`layout="grid"`/`gap`/`label-align`/`label-width`，错误提示收编 form-item，裸字段向后兼容）
- size 尺寸档位扩展：三档 → 五档（xs=20px / small=24 / medium=32 / large=40 / xl=48px），button/tag/switch/space/spin 全档支持（spin 保留旧缩写别名）
- 主题 on-color token（`--oas-color-text-on-primary/success/warning/danger`），全库实心态硬编码白字改走 token（dark 深字对比度 ≥4.5）
- 性能基准体系（vision §5.8）：体积/渲染基线 + CI 体积预算（`pnpm perf:size`）+ 本地渲染基准（`pnpm perf:bench`）
- `dist/cdn.js` 单文件 IIFE bundle（gzip ~116KB）CDN 三行引入可用；theme 包根 index.css 直引
- 9 个表单控件 `focus()` 委托（form-item label 点击聚焦 shadow 主输入）
- dev 链路重构：组件源码 watch 构建 + dev server 自动 full reload（零盲区）；e2e 增加 Firefox 抽样覆盖（visual/smoke/qa-regression）
- `@oas-ui/nuxt`：Nuxt 3 module——`modules: ['@oas-ui/nuxt']` 开箱即用（Vite `vite:extendConfig` 注入 Vue `isCustomElement` 识别 oas-* + `@oas-ui/theme` 自动注入 `nuxt.options.css` + `renderOasToString`/`useOasRender` SSR helper 自动导入）
- `@oas-ui/next`：Next.js App Router 集成——RSC `<OasComponent>`（`@oas-ui/next/server`）服务端产 DSD 快照（dangerouslySetInnerHTML 进 SSR 输出流）+ `<OasRegistry>` "use client" 客户端注册引导 + `renderOas` 纯逻辑包装（attrs 值自动序列化）

### 变更

- select 多选标签默认换行自适应高度，折叠由 `max-tag-count` 显式启用（对齐通用做法）
- slider 补 Firefox 轨道伪元素（`::-moz-range-track/thumb`）
- 多级子菜单视口边界翻转（menu/dropdown/context-menu/menubar，flip-left/flip-right/flip-up）
- rate 半选改 clip-path 半黄半灰垂直分割
- scroll-area 补 thumb 拖拽 + 横向滚轮接管；virtual-list/tree 修复滚轮"一下到底"
- theme CSS 单源化（canonical 收束为包根 index.css）
- SSR 指南转正（摘"实验"标签）、快速开始补浏览器基线声明、核心规则改 ::: danger 容器

### 修复

- DSD 水合动态内容重复渲染（rate/dynamic-input/log/marquee）
- alert 关闭不隐藏（`:host([hidden])` 补位，全库排查）、result 状态图标不随 status 更新、transfer 缺 observedAttributes、textarea autosize 首帧闪动、组件 id 快照确定性
- slider Firefox 轨道不可见（补 `::-moz-range-*` 伪元素）、select 多选折叠吞值（非法 size 回落告警）

## [1.8.0] - 2026-08-11 (internal)

> 内部功能块版本：通用组件 100% 覆盖收口（combobox 落地），仅推进至 tag、未发 npm（随 v1.9.0 一并公开发布）。含 v1.1~v1.7 组件的能力补齐与复核修复批次、文档站中英双语与完善批。

### 新增

- 新增 combobox：可过滤单选组合框——输入框即控件、子串过滤、键盘导航（↑↓/Enter/Esc）、受控、`clearable`/`loading`/`empty`/`disabled`，事件 `oas-change`/`oas-input`/`oas-clear`，全 ARIA 规范（combobox/listbox/option/activedescendant）
- input：`show-password`/`show-count`；select：分组、可清空、远程搜索、多选标签折叠 +N、允许创建；button：`block`/`round`/`ghost`/`width`/`icon`；modal：`centered`/`draggable`
- tabs：`closable`/`badge`/`tab-position`（上/下/左/右）；pagination：`show-total`/`page-sizes`/`jumper`；switch：`checked-text`/`size`/`color`/`allow-clear`；rate：自定义图标
- table：`stripe`/`bordered`/`summary`/可展开行/树形数据/lazy 懒加载/`draggable` 拖拽；tree：lazy 懒加载；steps：每步状态/可点击；drawer：宽度尺寸；slider：刻度；empty：自定义插画；chart：area/donut/stacked-bar 类型
- 补 marquee/carousel/card/list/tag 内容形态 demo（图片墙/图片轮播/封面/图文/图标标签）
- 文档站 114 个组件参考页英文版 + 全部 demo 示例文本英文化（中文能力演示刻意保留）；EN 侧栏指向 `/en/components/*`
- 文档站本地搜索（中英双索引）+ 组件总览页（中英，7 分组）+ CHANGELOG 页（include 根 CHANGELOG.md）+ icon 图标墙
- 文档站示例代码 Shiki 语法高亮（懒加载 + 暗色适配）；侧栏组件分组收起展开
- 文档站组件 API 表自动化：源码 AST 扫描（scan.mjs）+ 说明文案收割（harvest.mjs）+ 统一版式生成器，md `## API` 章节为生成物
- 文档站语言切换统一走内置 locales 下拉（路由驱动 + `setLocale` 同步组件内置文案）

### 修复

- 修复 Vue 宿主下 property 劫持导致的数据型组件异常（table 同类问题全仓排查修复）
- 修复 table：SPA 导航下无数据、滚动刷新弹回顶、固定列表头被正文覆盖
- 修复 tree 虚拟模式行样式全丢（`::part` 后链后代选择器不支持）、virtual-list 视口高度与 items 赋值竞态、timeline 圆线不对齐
- 修复 select 下拉锚定到页面底部、多选标签换行/箭头漂浮、clear-btn 嵌套解析问题
- 修复 date-picker/time-picker 弹层定位逃逸出 shadow 落到页面底部
- 修复 backdrop 锁滚动导致开合遮罩页面位移（最终改为拦截滚动行为方案，滚动条保留则视口宽度不变）
- 修复 switch 带文案时滑块被遮、button ghost success/warning 文字对比度、tabs 可关闭项嵌套交互违规
- 修复 button-group 纵向布局失效、tag hover 不可读、link 视觉问题

## [1.7.0] - 2026-08-09 (internal)

> 内部功能块版本：未发 npm（随 v1.9.0 一并公开发布）。

### 新增

- 新增 theme-editor：主题 token 编辑面板——读取 `--oas-*` 变量集实时预览，导出主题 JSON，与 config-provider 的 theme 注入打通（改值即时生效到子树）
- 新增 bottom-navigation：移动端底部导航，`role="tablist"` + 键盘左右切换 + `aria-selected`
- 新增 sidebar：可折叠侧栏，`collapsed` 收窄图标态、移动端抽屉态、点击外部收起
- 新增 container：定宽居中容器，`size`（xs~xl/full）/`center`/`padding`，逻辑 CSS 属性（RTL 合规）

## [1.6.0] - 2026-08-09 (internal)

> 内部功能块版本：未发 npm（随 v1.9.0 一并公开发布）。

### 新增

- 新增 chart：图表（折线/柱状/饼/面积/环形/堆叠柱，数据更新动画）
- 新增 code：代码展示（语言高亮、行号、复制按钮）
- 新增 log：日志滚动视图（追加后自动滚到底，仅用户未上翻时）
- 新增 marquee：跑马灯（`speed`/`pause-on-hover`，尊重 `prefers-reduced-motion`）
- 新增 number-animation：数字滚动动画（rAF 清理无泄漏）
- 新增 gradient-text：文字渐变着色
- 新增 equation：数学公式渲染
- 新增 aspect-ratio：宽高比容器（无内容仍保比例占位）
- 新增 masonry：瀑布流布局（CSS columns 实现）
- 新增 comment：评论（作者头像/内容/时间/操作区，纯展示）

## [1.5.0] - 2026-08-09 (internal)

> 内部功能块版本：未发 npm（随 v1.9.0 一并公开发布）。

### 新增

- 新增 command：命令面板——搜索过滤、↑↓ 选择、Enter 执行、Esc 关闭、焦点陷阱 + 打开自动聚焦
- 新增 menubar：应用菜单栏，方向键 + Alt 访问键导航
- 新增 navigation-menu：多级导航栏，悬停/键盘展开子菜单
- 新增 toolbar：工具按钮组（roving tabindex）
- 新增 scroll-area：自定义滚动条（细条 + hover 变粗），`oas-scroll` 事件
- 新增 toggle-group：单选/多选开关组（radio/checkbox 语义，受控）
- 新增 speed-dial：悬浮主按钮 + 展开子动作（`aria-expanded`，点击外部收起）
- 新增 toast：命令式 API `toast.success/error/warning/info/loading()` + `toast.promise()`，返回句柄 `.close()`，支持 `action`/`duration`/`position`，loading 态不可关
- 新增 snackbar：底部提示条，`open`/`message`/`action-text`/`duration`/`direction`，堆叠上限 3，无 action 走 `role="status"`
- 新增 backdrop：全屏遮罩，`transparent`/`blur`/`lock-scroll`，`oas-click` 事件，关闭即卸载节点（零孤儿 DOM）

## [1.4.0] - 2026-08-09 (internal)

> 内部功能块版本：未发 npm（随 v1.9.0 一并公开发布）。

### 新增

- 新增 virtual-list：定高虚拟列表（视口窗口渲染 + 首尾 padding 占位 + 滚动节流），供 table/tree/select 复用
- 新增 qrcode：二维码（`value`/`size`/`error-correction`）
- 新增 watermark：水印（`text`/`image`/`opacity`/`repeat`，`pointer-events:none` 不拦截交互）
- 新增 ellipsis：文本省略（多行截断、仅溢出时挂 tooltip 展示全文、`expandable` 展开/收起，零孤儿浮层）
- table 增强：固定列（left/right）+ 表头吸顶 + 虚拟滚动，与排序/分页/多选不冲突
- tree 增强：大数据量虚拟化渲染（复用 virtual-list），展开状态保持
- image 增强：`preview` 图片放大预览——点击放大 + 缩放/旋转/下载 + Esc 关闭 + 焦点陷阱，`oas-preview` 事件
- progress 增强：`type="circle"` 环形进度（`size`/`stroke-width`/`show-text`，`role="progressbar"`），整环 success/error 变色

## [1.3.0] - 2026-08-09 (internal)

> 内部功能块版本：未发 npm（随 v1.9.0 一并公开发布）。

### 新增

- 新增 upload：文件上传（原生 input + 拖拽区 + 进度），`accept`/`multiple`/`max`/`auto-upload`，事件 `oas-change`/`oas-remove`/`oas-upload`
- 新增 transfer：穿梭框（左右双面板 + 穿梭按钮 + 搜索，键盘方向键移动）
- 新增 mentions：@ 提及（浮层建议、↑↓ 选择 Enter 插入，复用 popover 定位）
- 新增 color-picker：颜色选择器（色板 + 饱和度盘，`preset` 预设色，键盘 ↑↓ 调亮度）
- 新增 toggle-button：切换按钮（`aria-pressed`）
- 新增 pin-input：逐位输入（自动换位、粘贴分发、Backspace 回退、`mask`），事件 `oas-input`/`oas-change`/`oas-complete`
- 新增 dynamic-input：动态增删行输入（`min`/`max`/`default-value`，受控/非受控双模式）
- 新增 dynamic-tags：动态标签输入（Enter/逗号提交、空输入 Backspace 删末 tag、重复提示）
- 新增 editable：行内编辑（Enter 提交、Esc 还原失焦、空值提交还原旧值默认非破坏）
- input 增强：`addon-before`/`addon-after`（addon 文案块）、`prefix-icon`/`suffix-icon`（图标名），独立 `::part(prepend/append)`
- textarea 增强：`autosize` 高度自适应（规范命名，保留 `auto-height` 兼容）+ `min-rows`/`max-rows` 边界，超限出滚动条

## [1.2.0] - 2026-08-09 (internal)

> 内部功能块版本：未发 npm（随 v1.9.0 一并公开发布）。

### 新增

- 新增 date-picker：日期选择器（date/daterange/month/datetime 四种类型），`format`/`min`/`max`/`placeholder`，日期网格键盘导航、`Intl.DateTimeFormat` locale 感知格式化
- 新增 time-picker：时间选择器（`format`/`step`，滚轮列表或数字输入，↑↓ 调整 Enter 确认）
- 新增 calendar：日历（月/年模式、`disabled-date` 回调、`show-week-number`、今天快捷）
- 新增 countdown：倒计时（毫秒值 + `format`，`oas-finish` 事件，timer 无泄漏）
- 新增 statistic：数值统计（`precision`/`prefix`/`suffix`/`group-separator`/`loading`，`Intl.NumberFormat` locale 感知）

## [1.1.0] - 2026-08-09 (internal)

> 内部功能块版本：未发 npm（随 v1.9.0 一并公开发布）。

### 新增

- 新增 button-group：按钮组——`type`/`size` 透传子按钮、`vertical` 纵向堆叠（圆角合并）、`value`+`multiple` 选值组（单选/多选）、`disabled`，事件 `oas-change`
- 新增 label：标签——`for` 点击聚焦目标控件、`required` 星号、`position`（before/after）
- 新增 kbd：键盘按键显示——`keys` 空格分隔自动渲染多块 + 加号连接
- 新增 visually-hidden：视觉隐藏但屏幕阅读器可读/可复制的容器
- flex 增强：`wrap`、`align`/`justify` 枚举补全、`vertical`（=Stack 简写，Stack 由 flex 覆盖不单列）
- grid 增强：`columns`（simple-grid 自动布局）+ `gap`，与 Grid/GridItem 并存不冲突
- tag 增强：`chip` 胶囊形态 + `clickable` 整签可点（`oas-click` 事件）
- 文档站导航栏新增全局语言切换（zh-CN/EN，`setLocale` 全局生效）

## [1.0.0] - 2026-08-08

### 新增

**发布**

- 正式发布 `@oas-ui/ui`、`@oas-ui/core`、`@oas-ui/theme`、`@oas-ui/icons` 至 npm
- 文档站上线 + 快速开始（三行引入）、SSR 边界策略文档
- 开源协议采用双许可（MIT OR Apache-2.0）

**主题与无障碍（v0.9.0）**

- 内置 light / dark / high-contrast 三套主题，`data-theme` 切换
- CSS 变量覆盖自定义主题指南
- 全组件 demo 页 axe 无障碍审计（WCAG 2.1 AA）零严重违规
- React / Vue 双宿主 playground

**数据展示（v0.8.0）**

- 新增 Table（排序/行选中/空态）、Tree（展开/选中/多选）、Card、Avatar、Image、Collapse、Descriptions、Timeline、List、Carousel

**导航与布局（v0.7.0）**

- 新增 Tabs、Pagination、Steps、Segmented、Affix、Splitter、Flex、PageHeader、FloatButton、Layout、Grid

**浮层与导航（v0.6.0）**

- 浮层定位引擎（flip/视口避让）
- 新增 Tooltip、Popover、Menu、Dropdown、ContextMenu、HoverCard、Breadcrumb、BackTop、Anchor、Tour

**反馈（v0.5.0）**

- 浮层管理器（z-index 分级、外部点击）
- 新增 Message、Notification、Modal、Confirm、Drawer、Popconfirm、Alert、Progress、LoadingBar、Spin、Skeleton、Empty、Result
- 命令式 API：`confirm()` / `message()` / `notification()` / `loadingBar()`

**表单 II（v0.4.0）**

- 新增 Select、AutoComplete、Cascader、TreeSelect、Form（原生 form + 校验）

**表单 I（v0.3.0）**

- 新增 Input、Textarea、Checkbox、Radio、Switch、Slider、InputNumber、Rate

**基础（v0.2.0 / v0.1.0）**

- 基础运行时 `@oas-ui/core`、主题 token、图标库
- 新增 Button、Icon、Tag、Badge、Space、Divider、Link、Typography

[1.0.0]: https://github.com/oas-ui/oas-ui/releases/tag/v1.0.0
[1.1.0]: https://github.com/oas-ui/oas-ui/tree/v1.1.0
[1.2.0]: https://github.com/oas-ui/oas-ui/tree/v1.2.0
[1.3.0]: https://github.com/oas-ui/oas-ui/tree/v1.3.0
[1.4.0]: https://github.com/oas-ui/oas-ui/tree/v1.4.0
[1.5.0]: https://github.com/oas-ui/oas-ui/tree/v1.5.0
[1.6.0]: https://github.com/oas-ui/oas-ui/tree/v1.6.0
[1.7.0]: https://github.com/oas-ui/oas-ui/tree/v1.7.0
[1.8.0]: https://github.com/oas-ui/oas-ui/tree/v1.8.0
