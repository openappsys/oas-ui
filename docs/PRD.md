# OAS-UI PRD（产品需求文档）

> 版本规划见 `docs/ROADMAP.md`，本文档定义各版本详细需求与验收标准。
> 状态标记：✅ 已完成 / 🚧 进行中 / 📋 待开发

---

## v0.1.0 工程骨架 ✅ 起点

### 功能定义

让"一个组件从代码到 npm 产物"的完整链路跑通，作为后续所有组件的地基。

### 详细需求

- pnpm monorepo：`packages/core` `packages/theme` `packages/icons` `packages/ui` `packages/docs` + 根 workspace
- 构建：Vite library mode，ESM 产物 + `vite-plugin-dts` 生成 `.d.ts`，`sideEffects: false`
- 测试：Vitest（jsdom/happy-dom）+ Playwright 基础配置（chromium + axe-core）
- `OASElement` 基类：`HTMLElement` 子类，提供属性观察（`observedAttributes` → 属性代理）、事件工具、CSS 变量注入
- theme token：`:root`（light）+ `[data-theme="dark"]` 双套 CSS 变量（色/字号/间距/圆角/动效，初版定义主色阶）
- 组件 Button 完整落地（作为范例组件）：`<oas-button>`，属性 `type/size/disabled/loading`，事件 `oas-click`，Shadow DOM + `::part(button)` 暴露
- 命令脚本：`dev` `build` `test` `typecheck` `test:e2e` `i18n` 预留位

### 验收标准

- `pnpm test` 全绿；`pnpm typecheck` 零错误；`pnpm build` 成功且 `dist` 含 `.d.ts`
- Button 单测覆盖：属性映射、事件派发、disabled/loading 态
- Button Playwright：点击、键盘 Enter/Space、loading 不可点、axe 无违规
- 文档站能渲染 Button demo 页（本地跑通）

---

## v0.2.0 地基组件 ✅ 已完成

### 功能定义

无状态基础组件，为后续所有组件提供共享积木；同时补齐 v0.1 的构建欠账。

### 详细需求

- **构建补课**：dist 产出 `.d.ts`；多入口 exports（每组件可独立子路径引入）；`sideEffects` 策略与 tree-shaking 验证（产物体积对比）✅
- **`OASElement` 重构**：渲染一次 + 属性增量更新（不重建 shadow DOM），焦点/输入态不因属性变化丢失 ✅
- **icon**：SVG 源目录脚本生成，按名称按需导出，支持 `name/size/color`，tree-shakable ✅（42 个原创线性图标，@oas-ui/icons 独立包）
- **tag**：`type/size/closable/round`，关闭事件 `oas-close` ✅
- **badge**：`value/max/showZero/dot`，红点/数字两种形态 ✅
- **space**：`direction/size/wrap/align`，等距布局 ✅
- **divider**：`direction/dashed/content-position`，分割线 ✅
- **link**：`type/href/target/underline/disabled`，事件 `oas-click` ✅
- **typography**：text/title/paragraph，`type/ellipsis/copyable` ✅
- **文档站**：Vitepress + 组件 demo 自动渲染（每组件 `.demo.ts` 导出 demo 配置）✅（demo 以 markdown 内嵌 + 全局注册实现）

### 验收标准

- 七组件单测全绿 ✅；Playwright 视觉基线 + axe（骨架期延后，v0.9 全量审计）
- dist 含 `.d.ts` ✅；图标按需引入 tree-shaking 验证（产物体积对比）✅（0.36 kB 单图标验证）
- 属性变化不重建组件内部 DOM（元素引用保持的回归测试）✅
- 文档站全部组件 demo 页可用 ✅

---

## v0.3.0 表单组 I ✅ 已完成

### 功能定义

基础表单控件，全部优先用原生元素 + 样式增强，保证无障碍免费获得。

### 详细需求

- **input**：`value/placeholder/disabled/readonly/clearable/type(passwd|number|…)/prefix/suffix`，事件 `oas-input/oas-change/oas-clear`，焦点态样式 ✅（value 受控同步 + clearable）
- **textarea**：input 子集 + `rows/resize`，高度自适应 ✅（auto-height 基础版）
- **checkbox**：`checked/disabled/indeterminate/group`（group 用原生 fieldset + legend）✅
- **radio**：`value/disabled/group` ✅
- **switch**：`checked/disabled/loading`，基于 role="switch" 的 button ✅
- **slider**：`value/min/max/step/disabled/marks`，基于原生 `input[type=range]`，键盘方向键可调 ✅（marks 延后）
- **input-number**：`value/min/max/step/precision/disabled`，基于原生 `input[type=number]` 增强（步进按钮）✅
- **rate**：`value/max/allow-half/disabled`，键盘方向键评分，`oas-change` ✅
- 通用：受控/非受控双模式；`oas-change` 事件统一 detail 结构 `{ value }` ✅

### 验收标准

- 全部单测绿 ✅（101 全量）；Playwright 键盘 + 表单提交行为 + axe（骨架期延后，v0.9 全量审计）
- 受控模式下外部改属性即时反映到 UI（属性观察回归测试）✅

---

## v0.4.0 表单组 II ✅ 已完成

### 功能定义

选择器与校验容器。

### 详细需求

- **select**：`value(multi?)/placeholder/disabled/options`，键盘上下选择 + Enter 确认、多选 chip、空态、外部点击关闭（composedPath）✅（搜索过滤延后）
- **auto-complete**：输入联想，`options` 过滤、键盘选择，与 select 共享选项基础设施 ✅
- **cascader**：级联选项，`options/change-on-select`，value 路径数组 ✅（lazy/键盘穿梭延后）
- **tree-select**：树形选项选择器，多选父子级联 + 单选，展开状态 `expanded` 受控 ✅
- **form**：`rules` 声明式校验（required/minLength/maxLength/pattern），`getErrors()` API、`aria-invalid` 注入子控件、`oas-submit/oas-validate-fail` 事件 ✅（model/custom rule/validate API 延后）

### 验收标准

- select 键盘流（Arrow/Enter/Esc）单测覆盖 ✅
- form 校验：required/pattern、错误标记 aria-invalid、getErrors 结构稳定 ✅

---

## v0.5.0 反馈组 ✅ 已完成

### 功能定义

过程反馈与结果提示。

### 详细需求

- **overlay 管理器**（core 基础设施）：body 统一容器、z-index 递增分配、点击外部 composedPath 检测、统一销毁 ✅
- **message / notification**：命令式 API，`type/info/success/error/warning`、`duration`、自动/手动关闭、栈管理 ✅
- **modal + confirm**：`visible/title/no-footer/no-mask-close`、Esc/遮罩关闭、焦点管理、`oas-ok/oas-cancel`；confirm 命令式 Promise ✅
- **drawer**：modal 变体，`placement`、复用焦点管理与遮罩 ✅
- **popconfirm**：气泡确认，`oas-ok/oas-cancel`、`position`、外部点击关闭 ✅
- **alert**：`type/title/closeable`、`oas-close`、role=alert/status ✅
- **progress**：`percent/status` 线形、role=progressbar ✅（环形延后）
- **loading-bar**：页面顶部加载条，命令式 start/finish/error ✅
- **spin / skeleton**：`size`、嵌套包裹；`rows/title/avatar/active` ✅
- **empty / result**：`description/action 插槽`；`status/title/description` 页状态 ✅

### 验收标准

- 命令式 API 全单测绿 ✅
- 对话框焦点管理 + Esc 关闭 ✅
- 浮层 z-index 层级正确（token 递增分配）✅
- overlay 销毁无孤儿（destroyAll/destroyOverlay）✅
- message 自动销毁计时、命令式 API 可重复调用

---

## v0.6.0 浮层与导航 ✅ 已完成

### 功能定义

浮层定位基础设施 + 面向操作的导航组件。

### 详细需求

- **浮层引擎**：computePosition 锚定/边距/空间不足翻转/视口避让 ✅
- **tooltip**：`content/placement`、hover/focus 触发、role=tooltip ✅
- **popover**：tooltip 超集 + `title/content` 面板、click 触发、外部点击/Esc 关闭 ✅
- **menu**：`items`，键盘 Arrow/Enter/Home/End 导航、oas-select ✅
- **dropdown**：click 触发、浮层定位、oas-select、外部点击/Esc 关闭 ✅
- **contextmenu**：右键触发、鼠标定位、复用 menu 键盘流 ✅
- **hover-card**：悬停/聚焦预览、延迟显隐、浮层定位 ✅
- **breadcrumb**：`items`、分隔符、当前页不可点 ✅
- **tour**：`steps` 定位到锚点、遮罩高亮、上一步/下一步/跳过、Esc 取消 ✅
- **anchor**：`items` 滚动定位（支持 `children` 多级嵌套）、scroll spy 高亮（`scroll-container` 指定滚动容器 / `offset`+`bounds` 判定线 / `get-current-anchor` 自定义策略）、点击落点（`target-offset` / `block` / `duration` / `animation`）、滚动联动 `oas-change`（含新旧值）、`affix` 吸附、轨道+移动墨水条、`variant`/`size` 变体、`hash`/`replace` 历史控制、`internal-scrollable`、`scrollTo` 实例方法、项级 `target` 外部链接 ✅
- **oas-anchor-target**：目标标记组件，`id` 同步到内部 `part=target`，作为锚点项滚动定位目标（替代手写标题 id）✅
- **back-top**：回到顶部、`bottom/right` 定位、平滑滚动 ✅

### 验收标准

- 定位引擎单测覆盖（翻转/避让）✅
- 浮层组件 Esc/外部点击关闭、无孤儿监听 ✅
- menu 键盘导航完整 ✅
- tour 步骤流 + 完成/取消事件 ✅
- 视口翻转（靠边不溢出）Playwright 用例
- tooltip 键盘 focus 触发（非仅 hover）
- menu 方向键高亮循环

---

## v0.7.0 导航与布局 ✅ 已完成

### 功能定义

页面骨架。

### 详细需求

- **tabs**：`active` 受控、懒渲染、`oas-change`、tablist 键盘左右切换 ✅
- **pagination**：`total/pageSize/current`、页码省略、前后按钮、`oas-change` ✅
- **steps**：`current/direction`，finish/current/wait 状态 ✅
- **segmented**：`options/value`、radiogroup、`oas-change` ✅
- **affix**：`offset` 固钉，滚动检测节流 ✅
- **splitter**：面板分割，键盘方向键可调、`percent/min/max`、`oas-resize` ✅
- **flex**：弹性布局容器（`justify/align/gap/wrap`），space 超集 ✅
- **page-header**：`title/subtitle/back` + extra 插槽 ✅
- **float-button**：悬浮按钮，`badge` 角标 ✅（speed-dial 形态延后）
- **layout**：`header/sider/content/footer` 原生语义元素 ✅
- **grid**：`cols/gap`、子项 `span/offset` 24 列栅格 ✅

### 验收标准

- 布局组件单测绿 ✅
- 键盘可达性：tabs 方向键、splitter 方向键 ✅
- 懒渲染（tabs 未激活面板隐藏）✅

---

## v0.8.0 数据展示重头 ✅ 已完成

### 功能定义

最重的两个组件。

### 详细需求

- **table**：`columns/data/sort`、排序、行多选、空态、`oas-row-click/oas-sort-change` ✅；固定列/表头、loading 为 v1 后增强
- **tree**：`data/selected/checked/checkable/expanded`、多选、键盘展开 ✅；懒加载为 v1 后增强
- **card**：`title/hoverable/extra` 容器 ✅
- **avatar**：`src/size/fallback`、文字首字符、圆形 ✅；**avatar-group**（`max/size`，重叠陈列 + 计数圆点）✅
- **image**：`src/alt/fit/preview`，预览点击事件 ✅；`placeholder` 占位 + `fallback` 失败兜底 ✅
- **collapse**：`active/accordion`，折叠面板 + 手风琴 ✅
- **descriptions**：`column/title`，grid 描述列表 ✅
- **timeline**：`time/color`，纵向时间轴 ✅；`pending` 进行中尾节点（空心圆点 + 虚线）✅
- **list**：`bordered/split`，title/description/extra 项 ✅；`loading` 骨架占位 + `empty` 空态 ✅
- **carousel**：`index/autoplay/interval`、指示器、`oas-change` ✅；arrows 为 v1 后增强

### 验收标准

- table 排序稳定、空态占位 ✅
- tree 展开/选中/多选交互 ✅

---

## v0.9.0 主题与无障碍收官 ✅ 已完成

### 功能定义

面向发布的质量收官。

### 详细需求

- 主题：light/dark/高对比三套 ✅ + 自定义主题文档（CSS 变量覆盖指南）✅
- 无障碍：全组件 axe 审计 ✅（10 demo 页零严重违规）+ 键盘流回归矩阵 ✅
- playground：React（表单页）+ Vue（表格页）两个宿主应用 ✅，跑通核心组件与 CustomEvent 桥接

### 验收标准

- 无障碍审计报告零严重违规 ✅（`pnpm test:e2e`，axe wcag2a/2aa/21aa）
- React/Vue 宿主事件/属性桥接用例（`onOasSubmit`/`@oas-sort-change` 监听 CustomEvent）✅

---

## v0.10.0 国际化 ✅ 已完成

### 功能定义

框架无关的国际化机制 + 全组件内置文案收口，发布的最后一块入场券。

### 详细需求

- **locale registry**：`@oas-ui/i18n` 包，`setLocale(locale)` 全局切换；不依赖 vue-i18n/react-intl ✅；config-provider 注入已收编（v0.11）
- **语言包**：zh-CN / en 两个内置包 ✅，tree-shakable（`import zhCN from '@oas-ui/i18n/zh-CN'`）✅
- **文案改造**：68 件组件内置文案全部改为 locale key ✅，禁止硬编码 ✅
- **类型约束**：locale key 全集类型化（66 key）✅，locale-completeness 测试（zh/en key 全集一致）✅
- **格式化规矩**：数字/日期一律 `Intl.*` ✅（组件无手写格式化）
- **RTL 规矩**：布局样式逻辑 CSS 属性 ✅；全量 RTL 视觉审计挪 v1.x

### 验收标准

- `setLocale(en)` 后全组件内置文案即时切换 ✅（i18n-locale 集成测试）
- locale-completeness 测试 ✅
- 语言包按需引入 tree-shaking ✅（子路径入口 + sideEffects 配置）
- 组件级属性/slot 覆盖 locale 默认值 ✅（empty-text/description/okText 等）

---

## v0.11.0 框架级容器 ✅ 已完成（自 v1.6 前移）

### 功能定义

全局配置的注入入口，收编 v0.10 的 locale registry，统一字号/主题/语言的一个开关。

### 详细需求

- **config-provider**：全局注入 `locale` / `size` / `theme` ✅，组件读取顺序：自身属性 > config-provider > 全局默认 ✅；`size` 全局默认值机制 ✅（button/tag 等 size 未显式设置时走注入值）
- **app**：消息上下文容器 ✅，message/notification/loadingBar 命令式 API 的宿主 ✅，与 config-provider 配套 ✅

### 验收标准

- config-provider 包裹内组件正确读取注入的 locale/size/theme，自身属性优先于注入值 ✅
- `setLocale()`（v0.10 全局）与 config-provider 注入并存时，注入值就近优先 ✅
- app 容器内命令式消息 API 正常收发 ✅

---

## v1.0.0 正式发布 ✅ 已完成

### 功能定义

可对外发布。

### 详细需求

- npm 发布（`@oas-ui/ui` / `core` / `theme` / `icons`）、`pnpm release` 流程与 CI 发布（tag 触发）✅
- 文档站上线 + 快速开始（三行 CDN 引入）✅
- CHANGELOG、贡献指南、issue 模板、双许可（MIT OR Apache-2.0） ✅
- SSR 边界策略文档 ✅

### 验收标准

- 三行代码在 React/Vue/原生三端跑通示例 ✅（快速开始 + playground 双宿主）
- 发布流水线自动化（tag → build → publish）✅（`.github/workflows/release.yml`）

---

## v1.x 组件长尾 🎯 目标：通用组件 100% 覆盖（约 115~120 件）

> 以下版本只列组件清单与关键约束，详细属性/事件在对应版本启动前补写本段。

### v1.1 基础补充 ✅ 已完成

### 详细需求

- **button-group**：属性 `type`/`size`（透传子按钮）、`vertical`（纵向堆叠，圆角合并方向改上下）、`value`+`multiple`（选值组）、`disabled`。事件：`oas-change` detail `{ value }`（单选）或 `{ value: [] }`（多选）。实现：slot 放 `<oas-button>`，相邻按钮圆角合并、hover 只亮当前项；容器 `role="group"`+`aria-label`，选中项 `aria-pressed`。边界：零子按钮渲染空组不报错；disabled 全组禁用。
- **label**：属性 `for`（目标控件 id）、`required`（追加 * 标记）、`position`（before/after）。实现：`<label part="label">`，点击代理 `document.getElementById(for)?.focus()`。边界：无 `for` 时仅文本；长文本换行不溢出。
- **kbd**：属性 `keys`（空格分隔，如 "ctrl shift k"，自动渲染多块+加号连接）。实现：`<kbd part="kbd">`，`--oas-color-bg-hover` 底+细边框+内阴影。ARIA：`role="text"`。边界：空 keys 渲染单空块；非交互组件。
- **visually-hidden**：slot 内容原样透出但视觉不可见。要求：屏幕阅读器可读、可被复制、无任何事件。

### 增强

- **flex→wrap/stack**：补 `wrap`（布尔）、`align`/`justify` 枚举补全、`vertical`（=direction:column 简写）。空态：无子元素占位 0 不报错。Stack 即 vertical flex + gap，由 flex 覆盖，不单列。
- **grid→simple-grid**：补 `columns`（数字，`grid-template-columns: repeat(n,1fr)`）、`gap`。有 `columns` 时自动布局，忽略 GridItem 的 span；与现有 Grid/GridItem 并存不冲突。
- **tag→chip**：补 `chip`（布尔，胶囊圆角+紧凑 padding）、`clickable`（整签可点，派发 `oas-click`）。事件走现有 `oas-close`。边界：chip 态下 disabled 不可点不可关。

### 验收标准

- 四个新组件 demo 进文档站，覆盖各属性/事件/键盘/ARIA 边界
- 三个增强组件有对应 demo 场景（flex wrap/stack、grid columns、tag chip）
- 单测 + typecheck + build + e2e 全绿

### v1.2 日期时间族 ✅ 已完成

### 详细需求

- **date-picker**：属性 `value`、`format`（默认 yyyy-MM-dd）、`type`（date/daterange/month/datetime）、`min`/`max`、`disabled`、`placeholder`。事件：`oas-change` detail `{ value }`。实现：复用浮层定位引擎 + 焦点陷阱；日期网格键盘 ↑↓/←→ + Enter 选中；`Intl.DateTimeFormat` 格式化（locale 感知）；内部日文案走 locale key。空态：placeholder。
- **time-picker**：属性 `value`、`format`（默认 HH:mm:ss）、`step`（间隔分钟）、`disabled`。事件：`oas-change`。实现：滚轮列表或数字输入，↑↓ 调整，Enter 确认。
- **calendar**：属性 `value`、`mode`（month/year）、`min`/`max`、`disabled-date`（回调）、`show-week-number`。事件：`oas-change`。实现：月网格 + 上月/下月/今天；`aria-label` 完整日期描述。
- **countdown**：属性 `value`（ms）、`format`。事件：`oas-finish`。实现：倒计时实时刷新、timer 清理；空态 0。
- **statistic**：属性 `value`、`precision`、`prefix`/`suffix`、`group-separator`、`loading`。实现：`Intl.NumberFormat`（locale 感知）；loading 态复用 skeleton。

### 验收标准

- 五个组件 demo 进文档站，覆盖各属性/事件/键盘/ARIA 边界
- date-picker 键盘网格导航、Intl 格式化、locale 文案
- countdown timer 无泄漏（disconnect 清理）
- 单测 + typecheck + build + e2e 全绿

### v1.3 表单增强 ✅ 已完成

### 详细需求

- **upload**：属性 `files`（property）、`accept`、`multiple`、`max`、`disabled`、`auto-upload`。事件：`oas-change`/`oas-remove`/`oas-upload`。实现：原生 input[type=file] + 拖拽区 + 进度（复用 progress）。
- **transfer**：属性 `data`（property）、`value`（`string[]`）、`titles`、`searchable`。事件：`oas-change`。实现：左右双面板 + 穿梭按钮，键盘方向键移动。
- **mentions**：属性 `options`、`value`、`prefix`（默认 @）。事件：`oas-change`/`oas-select`。实现：@ 触发浮层建议，↑↓ 选择 Enter 插入；悬浮层复用 popover 定位。
- **color-picker**：属性 `value`（hex）、`preset`（预设色）、`disabled`。事件：`oas-change`。实现：popover 弹出色板 + 饱和度盘；键盘 ↑↓ 调亮度；`aria-label="颜色选择器"`。
- **toggle-button**：属性 `value`、`pressed`、`disabled`。事件：`oas-change`。实现：`aria-pressed`，切换态样式。
- **pin-input**：属性 `length`（默认 6）、`value`、`mask`（星号）、`disabled`、`readonly`、`type`。事件：`oas-input`（每格）、`oas-change`（完整）、`oas-complete`（填满）。键盘：方向键格间移动、Backspace 删当前并回退、粘贴自动分发。ARIA：容器 `role="group"`+`aria-label`，每格 `aria-label="第 n 位"`、`aria-invalid`。边界：value 超长截断；全空每格有 caret。
- **dynamic-input**：属性 `model-value`（property，`string[]`）、`min`（0）、`max`（Infinity）、`default-value`（''）、`disabled`。事件：`oas-change` detail `{ value: string[] }`。实现：每行 input + 删除按钮 + 末尾「添加」；受控/非受控双模式；行内复用 input 组件。边界：达 max 添加按钮 disabled；min 下最后一行不可删。
- **dynamic-tags**：属性 `model-value`（`string[]`）、`max`、`allow-duplicate`（默认 false）、`disabled`、`placeholder`。事件：`oas-change`/`oas-add`/`oas-remove`。键盘：Enter/逗号提交、空输入 Backspace 删末 tag；超 max input 禁用。ARIA：`role="list"`/`listitem`，删除按钮可聚焦。边界：重复提示（复用 message 或 `aria-invalid`）。
- **editable**：属性 `value`、`placeholder`、`disabled`、`submit-on-enter`（默认 true）、`maxlength`。事件：`oas-change`（提交）、`oas-cancel`。键盘：Enter 提交、Esc 还原失焦；展示态 Enter/空格/点击进入编辑。ARIA：展示态 `role="button"`+`aria-label="编辑"`，编辑态保持 label。边界：空值提交还原旧值并派发 `oas-cancel`（默认非破坏）。

### 增强

- **input→addon**：补 `addon-before`/`addon-after`（addon 文案块）、`prefix-icon`/`suffix-icon`（图标名）。addon 区域走独立 `::part(prepend/append)`，需可访问名称；禁用态 addon 灰化。已有 prefix/suffix 保留，addon 与图标并存不冲突。
- **textarea→autosize**：规范命名 `autosize`（保留 `auto-height` 兼容）+ `min-rows`（默认 1）/`max-rows`（默认 6）边界，超 max-rows 出滚动条，空态回 min-rows。高度自适应走增量渲染规矩（不重建 DOM）。

### 验收标准

- 九个组件 demo 进文档站，覆盖各属性/事件/键盘/ARIA 边界
- 受控/非受控双模式、disabled/empty/max 边界
- 单测 + typecheck + build + e2e 全绿

### v1.4 数据增强 ✅ 已完成

### 详细需求

- **virtual-list**：属性 `items`（property，`unknown[]`）、`height`、`item-height`（定高）。实现：视口窗口渲染 + 首尾 padding 占位 + 滚动事件节流；供 table/tree/select 复用。
- **table 固定列/虚拟滚动**：增强 `oas-table`：`fixed`（列配置 `{key, fixed:'left'|'right'}` 或列固定标记）、表头吸顶、虚拟滚动（配 virtual-list）。与现有排序/分页/多选不冲突。
- **tree 虚拟化**：增强 `oas-tree`：大数据量虚拟渲染（复用 virtual-list），展开状态保持。
- **image-preview**：增强 `oas-image`：补 `preview` 放大浮层（点击放大 + 缩放/旋转/下载 + Esc 关闭 + 焦点陷阱）；`oas-preview` 事件。现有 src/alt/fit/placeholder/fallback 保留。
- **qrcode**：属性 `value`、`size`、`error-correction`。实现：二维码渲染依赖选型（架构决策先行，零依赖原则约束下评估纯 TS 编码器）。
- **watermark**：属性 `text`、`image`、`opacity`、`repeat`。实现：容器绝对定位平铺水印层，pointer-events:none，不拦截交互。
- **ellipsis**：属性 `text`、`rows`（默认 1，多行 `-webkit-line-clamp`）、`tooltip`（默认 true）、`expandable`。事件：`oas-expand`/`oas-collapse`。实现：仅文本溢出时才挂 tooltip（复用 oas-tooltip 定位引擎），无溢出时纯文本——零孤儿浮层。边界：rows>=2 时 tooltip 展示全文。

### 增强

- **progress→circle**：增强 `oas-progress`：新增 `type="line|circle"`（默认 line）、`size`（circle 直径，默认 48）、`stroke-width`（默认 6）、`show-text`。circle 为圆环形态、圆心显示百分比，`role="progressbar"`+`aria-valuenow/min/max`。边界：percent 夹取 0–100；`status="success|error"` 整环变色。

### 验收标准

- 七个组件/增强 demo 进文档站，覆盖各属性/事件/键盘/ARIA 边界
- virtual-list 大数据量渲染、table 固定列与虚拟滚动、qrcode 编码器选型、watermark 不拦截交互、ellipsis 零孤儿浮层
- 单测 + typecheck + build + e2e 全绿

### v1.5 命令与导航增强 ✅ 已完成

### 详细需求

- **command**：属性 `items`（JSON `[{label,value,keywords?,group?}]`）、`open`（受控）。事件：`oas-select`。实现：命令面板（⌘K 交互），搜索过滤、↑↓ 选择、Enter 执行、Esc 关闭；焦点陷阱 + 打开自动聚焦输入框。
- **menubar**：属性 `items`。实现：应用菜单栏，方向键 + Alt 访问键导航；展开态焦点陷阱复用浮层基础设施。
- **navigation-menu**：属性 `items`（层级结构）。实现：多级导航栏，悬停/键盘展开子菜单；方向键导航。
- **toolbar**：无属性（slot）。实现：工具按钮组容器，`role="toolbar"`+`aria-label`，Tab 进入 + 方向键在按钮间移动（roving tabindex）。
- **scroll-area**：属性 `height`/`width`、`auto-hide`。实现：自定义滚动条样式（细条 + hover 变粗），wheel 平滑；滚动事件 `oas-scroll`。
- **toggle-group**：属性 `value`/`multiple`、`items`（JSON）。事件：`oas-change`。实现：单选组（radio 语义）/多选组（checkbox 语义），受控。
- **speed-dial**：属性 `actions`（JSON `[{label,icon?}]`）、`direction`（up/down/left/right）、`open`（受控）。事件：`oas-select`/`oas-open`。实现：悬浮主按钮 + 展开子动作；`aria-expanded`，点击外部收起，无孤儿浮层。
- **toast**：命令式 API `toast.success/error/warning/info/loading(options)` 返回句柄 `.close()`；`toast.promise(promise, {...})`。options：`title`、`description`、`action{label,onClick}`、`duration`（默认 3000，0 不自动关）、`closable`（默认 true）、`position`（top-right 默认）。实现：复用 overlay 管理器 + z-index token + locale `toast.*` key；action `type="button"`；loading 态不可关。边界：自动关闭清理计时器、无泄漏；多开复用单容器。
- **snackbar**：属性 `open`（受控）、`message`、`action-text`、`duration`（默认 4000）、`direction`（top/bottom）、`offset`。事件：`oas-open`/`oas-close`/`oas-action`。ARIA：无 action `role="status"`；有 action `role="alertdialog"`。实现：底部条 + 平移进出场；堆叠上限 3。边界：`open` 受控时必须外部负责关闭。
- **backdrop**：属性 `open`、`transparent`、`blur`、`lock-scroll`（默认 true）。事件：`oas-click` detail `{ originalEvent }`。实现：全屏半透明遮罩 + body scroll 锁定；自身无焦点陷阱（由上层弹窗负责）；`open=false` 卸载节点，无孤儿 DOM。边界：Esc 不自动关闭。

### 验收标准

- 十个组件 demo 进文档站，覆盖各属性/事件/键盘/ARIA 边界
- 命令面板 ⌘K、menubar 方向键、toolbar roving tabindex、toast promise 链、snackbar 堆叠上限、backdrop 无孤儿
- 单测 + typecheck + build + e2e 全绿

### v1.6 内容与展示长尾 ✅ 已完成

### 详细需求

- **chart**：属性 `type`、`data`、`options`。实现：依赖图表引擎选型（架构决策，需先评审：自研 SVG vs 引入引擎与「零依赖」原则的取舍）。若自研，先做基础折线/柱状/饼图三型，数据更新动画；否则最小依赖。
- **code**：属性 `code`（原文）、`language`、`show-line-number`、复制按钮（复用 typography copy 逻辑）。实现：高亮引擎选型（架构决策，零依赖约束下评审：自研简单 token 高亮 vs 引入高亮库）。行内变体并入 typography。
- **log**：属性 `lines`（property）、`auto-scroll`（默认 true）、`line-number`。实现：等宽字体 + 追加后自动滚动到底（仅用户未上翻时）。
- **marquee**：属性 `speed`、`pause-on-hover`。实现：循环滚动动画；hover 暂停；`prefers-reduced-motion` 时静态。
- **number-animation**：属性 `value`、`duration`（默认 1500ms）、`to-fixed`。实现：数字滚动动画、到目标值停止且无泄漏（rAF 清理）。
- **gradient-text**：属性 `gradient`（色标 JSON）、`direction`。实现：文字渐变着色。
- **equation**：属性 `code`。实现：数学公式渲染，依赖选型（架构决策，零依赖约束下评审：自研简化 LaTeX 子集 vs 引入 katex）。
- **aspect-ratio**：属性 `ratio`（如 16/9）。实现：容器 `aspect-ratio` + 内容 slot 铺满，宽度 100%。边界：无子内容仍保比例占位。
- **masonry**：属性 `columns`、`gap`。实现：CSS columns 实现，子项 break-inside:avoid。
- **comment**：无强属性（slot 组装：作者头像、内容、时间、操作区）。实现：非交互纯展示。

### 验收标准

- 十个组件 demo 进文档站，覆盖各属性/事件/ARIA 边界
- chart/code/equation 三个引擎选型决策明确（零依赖 vs 最小依赖），实现前先评审
- 动画类（marquee/number-animation）尊重 prefers-reduced-motion、无泄漏
- 单测 + typecheck + build + e2e 全绿

### v1.7 框架级容器 ✅ 已完成

### 详细需求

- **theme-editor**：token 编辑面板。实现：读取 `--oas-*` 变量集，实时预览 + 导出主题 JSON；与 config-provider 的 theme 注入打通（编辑器改值即时生效到子树）。布局：颜色/字号/间距/圆角分组，每个 token 一个 color input / number input + 值显示。
- **bottom-navigation**：属性 `items`（JSON `[{label,value,icon?}]`）、`value`。事件：`oas-change`。实现：移动端底部导航，`role="tablist"` + 键盘左右切换、`aria-selected`；激活项主色 + 图标。
- **sidebar**：属性 `collapsed`、`items`（可选）。实现：与 layout/sider 对齐的可折叠侧栏，`collapsed` 收窄图标态，移动端抽屉态；与 `oas-layout` 配合。边界：点击外部收起（移动端抽屉）、无孤儿浮层。
- **container**：属性 `size`（xs/sm/md/lg/xl/full，默认 lg，映射 `--oas-container-*` 宽度 token）、`center`（默认 true）、`padding`。实现：定宽居中，布局用逻辑 CSS 属性（RTL 合规）。边界：无子元素不报错；宽度最小 0 不溢出视口。

### 验收标准

- 四个组件 demo 进文档站，覆盖各属性/事件/键盘/ARIA 边界
- theme-editor 实时预览 + 导出 JSON、bottom-navigation 键盘 + aria-selected、sidebar 折叠/抽屉、container 定宽居中
- 单测 + typecheck + build + e2e 全绿

### v1.8 收尾：combobox + 文档站中英双语与完善 ✅ 已完成

### 功能定义

输入即过滤、选中即得值的组合框（combobox）。区别于 **select**（按钮触发、值限定选项）与 **auto-complete**（自由文本联想、值可任意）：combobox 是"输入框即控件"的可过滤单选——输入框常显可编辑、显示选中项 label、输入过滤选项、选中后 value 取 option.value。

### 详细需求

- **combobox**：属性 `value`（受控）、`placeholder`、`options`（property，`[{label,value,disabled?}]`）、`disabled`、`clearable`、`loading`、`filterable`（默认 true 可输入过滤）。事件：`oas-change`（选中，detail `{ value }`）、`oas-input`（过滤词）、`oas-clear`。实现：点击/聚焦展开 listbox，输入实时子串过滤 label；↑↓ 移动高亮、Enter 选中、Esc 关闭；选中后 input 显示该 option 的 label、value 置为 option.value；复用现有浮层定位引擎 + 焦点陷阱。ARIA：input `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-activedescendant`；listbox `role="listbox"`、option `role="option"`。边界：options 空 → 空态文案（locale）；disabled 不可输入；loading 时下拉显示加载占位；失焦未选中时回退为当前选中项 label（默认非破坏）；clearable 清空 value。
- **文档站中英双语**：114 个组件参考页英文版（demo 示例文本同步英文化，中文能力演示示例刻意保留）；EN 侧栏英文化并指向 `/en/components/*`；语言切换统一走内置 locales 下拉（组件内部文案由 Layout 的 lang watcher 同步 `setLocale`）；DemoBlock 文案随 locale 切换
- **文档站完善**：本地搜索（minisearch 中英双索引）、组件总览页（中英，7 分组 114 条）、CHANGELOG 页（include 根 CHANGELOG.md 单一数据源）、icon 图标墙、组件 API 表自动化（源码 AST 扫描 + 语料 harvest + 生成器统一版式，`api:check` 进 CI 防漂移，md 的 `## API` 章节为生成物）

### 验收标准

- combobox demo 进文档站，覆盖 受控/非受控、过滤、键盘（↑↓/Enter/Esc）、clearable、loading、empty、disabled 边界
- 与 select / auto-complete 的定位差异在文档中说清
- 单测 + typecheck + build + e2e 全绿

### v1.9 SSR/DSD + 发布冲刺 ✅ 已完成

### 功能定义

组件库服务端渲染（SSR）完整版 + 公开发布冲刺，走 Declarative Shadow DOM（DSD）路线：服务端输出 shadow 结构+样式的静态快照（`<template shadowrootmode="open">`），浏览器 upgrade 后组件复用已有 shadow root（基类防御已落地）并接管交互。分两层交付：①首版已落地——`@oas-ui/ssr` 渲染器 + 纯展示组件白名单（button/tag/empty/divider/typography），客户端策略为复用 root + 照常重渲染（快照与重渲染一致，视觉无感知）；②本版本继续推进——真水合（跳过重建只绑事件）、测量组件闪动治理、property-only 数据组件声明式通道、框架集成插件，并同步完成 grid 栅格表单布局、CHANGELOG 回填、ssr 首载优化，最终以 v1.9.0 公开发布（GitHub 公开 + npm + CI/CD + 文档站上线）。

### 详细需求

- **Node-safe 入口**：`@oas-ui/ui` 新增 `ssr` 子路径导出——导出全部组件类但不执行 `customElements.define`、不触碰 DOM API；现有主入口行为不变
- **`@oas-ui/ssr` 渲染器**（新包）：Node 环境用 happy-dom（现有测试栈，零新运行时依赖类型）起 Window 并装载最小 DOM shim，注册组件类后按入参写 attributes 与 light DOM，触发首次 render 再把 shadowRoot 序列化为 DSD template，输出完整宿主 HTML 字符串。API：`renderToString(tag, attrs, slotHTML, { locale })`；locale 经 `@oas-ui/i18n` setLocale 生效（i18n 为纯 registry，Node 安全）。渲染器仅对白名单组件开放，其余组件调用抛明确错误
- **试点白名单**：button/tag/empty/divider/typography——五者 render 只依赖 attributes，满足"render 纯函数"纪律
- **e2e 验收**：构建期用渲染器产 DSD 静态页，Playwright 验证四条：禁 JS 时结构样式完整可见；开 JS 后 upgrade 无 `NotSupportedError`、console 零告警；前后截图无闪动；事件可触发
- **文档**：ssr.md 补「服务端渲染（实验）」段（Nuxt/Next 调 renderToString 示例），中英双版同步，措辞中性

#### 首版已完成（v1.9 第一阶段）

Node-safe 入口、`@oas-ui/ssr` 渲染器、白名单试点、e2e 四条验收、ssr.md 实验段落——均已交付。

#### v1.9 第二阶段（进行中）

- **真水合**：✅ 已落地（指纹判定 + 白名单组件 template/bind 拆分 + hydrate 接管跳过重建，DOM 引用保持、回退防御、无双绑）
- **测量组件闪动治理**：✅ 已落地（wasHydrated 暴露水合态；affix/ellipsis/scroll-area 三组件快照场景首帧延迟布局写入，其余 16 个测量组件评估后排除——浮层/交互型仅触发时测量无首帧写入）
- **property-only 数据声明式通道**：✅ 已落地（table/tree/select 全通——attribute JSON 通道 + property 优先单向反射 + hydrate 接管；architecture.md 决策修订已记录；方案评审结论：无回写循环，attribute 为唯一数据源）
- **框架集成插件**：✅ 已落地（`@oas-ui/nuxt` Nuxt 3 module——`vite:extendConfig` 注入 Vue `isCustomElement` 识别 oas-* + `@oas-ui/theme` 自动注入 `nuxt.options.css` + `renderOasToString`/`useOasRender` SSR helper 自动导入；`@oas-ui/next` Next.js App Router 集成——RSC `<OasComponent>` 服务端产 DSD 快照（dangerouslySetInnerHTML 进 SSR 输出流）+ `<OasRegistry>` "use client" 客户端注册引导 + `renderOas` 纯逻辑包装；ssr.md 插件优先示例）
- **grid 栅格表单布局**：✅ 已落地（oas-form-item + form layout/gap/label-align/label-width；错误提示收编 form-item；裸字段向后兼容）
- **CHANGELOG 回填**：✅ 已落地（v1.1~v1.8 补记，v1.9 在 Unreleased）
- **ssr 首载优化**：✅ 已落地（按需 define，纯 Node 冷载 135ms→22ms）
- **SSR 白名单扩充**：✅ 已落地（13 tag：button/tag/empty/divider/text/title/paragraph + table + affix/ellipsis/scroll-area + tree/select）
- **公开发布**：（稍后，用户节点）GitHub 公开 + npm 发布 + CI/CD 打通 + 文档站上线；SEO 表述随发布前补

#### v1.9 第三阶段（已完成）

- **尺寸档位扩展**：✅ 已落地——`size` 扩为五档（xs=20px / small=24 / medium=32 / large=40 / xl=48，ui-spec §2.1 权威定义）；button/tag/switch/space/spin 五组件全档支持（spin 保留 sm/md/lg 旧缩写别名不 breaking）；非法值统一回落 medium + console.warn（同值去重）；tag small 硬编码 token 化、switch 白名单静默吞值修复、文案外置扩至 xs；theme-editor token 清单同步；qa-regression 固化五档渲染断言

#### v1.9 第四阶段（DSD 彻底落地，已完成）

- **白名单全量覆盖**：123/124 tag 可 SSR（仅 theme-editor 工具组件排除 + 5 个命令式组件 message/notification/toast/snackbar/loading-bar 按"无初始 DOM"定论客户端专属）——五批推进：表单 27 类 → 反馈 9 → 数据展示 28 → 导航布局 32 → 收尾 12，每组件均完成 template/bind/hydrate 拆分、数据组件 JSON attribute 通道、测量组件延迟写入
- **嵌套组件递归序列化**：renderToString 递归注入嵌套 DSD template（ensureNestedTags 预装载 + injectNestedDSD 深度优先），descriptions/tabs/form-item/layout 等组合场景快照完整
- **改造中修复的真实缺陷**：水合动态内容重复渲染（rate/dynamic-input/log/marquee）、crypto.randomUUID 破坏快照确定性（改模块级计数器）、transfer 缺 observedAttributes、alert 关闭不隐藏（`:host([hidden])` 补位，全库排查）、result 图标不随 status 更新、carousel 覆写 onCleanup 不调基类、textarea autosize 首帧闪动
- **CDN 发布准备**：`dist/cdn.js` 单文件 IIFE bundle（gzip ~116KB）+ theme 包根 index.css + 文档 CDN 示例修正
- **文档转正**：ssr.md 摘除"实验"标签；浏览器基线声明（Safari ≥ 16.4 等）；核心规则改 ::: danger 容器

### 验收标准

- `renderToString` 对五个白名单组件产出合法 DSD HTML（禁 JS 的浏览器直接渲染出结构+样式）✅
- DSD 静态页 e2e 四条全过 ✅
- 单测 + typecheck + build + e2e + api:check 全绿
- ssr.md 中英双版同步 ✅
- 真水合落地后：白名单组件 upgrade 时 shadow 不再重建（DOM 引用保持），事件/交互正常；误判场景回退重渲染有回归测试
- 测量组件在 DSD 快照场景首帧无布局跳动（e2e 断言 rect 序列稳定）
- 数据组件声明式通道：table/tree/select 至少一个跑通 SSR 快照含数据行（方案评审结论入 architecture.md）
- grid 栅格表单：demo 进文档站，受控/非受控 + 响应式断点行为符合 PRD 定义
- CHANGELOG v1.1~v1.9 回填完整，文档站 CHANGELOG 页可见
- ssr 首载：白名单组件首次 renderToString 不再装载全量组件库（耗时显著下降，量级目标 < 200ms）
- GitHub 公开 + npm 可装 + CI 绿 + 文档站可访问

---

## v2.0 能力补齐第一批（已完成，v2.0.0 已发布）

> 面向通用组件能力的补充与增强第一批：P0/P1 高频能力。tag v2.0.0。

### 已交付内容

- **P0**：upload 照片墙（`list-type="picture-card/picture"`）+ 拖拽 + `oas-exceed`/`oas-preview` 插槽；date-picker `shortcuts`/`disabled-date`/`multiple`；select 自定义渲染（`oas-option-render`/`oas-tag-render`）+ 虚拟滚动；form `inline` 行内布局；table 行内编辑 + 吸顶行；modal 全屏 + 命令式确认（loading）；card 封面/操作区/hoverable/clickable；badge 缎带 ribbon；avatar 徽标 + fallback；tree 自定义节点 + 目录模式；image 懒加载
- **P1**：transfer 搜索/单向/虚拟滚动；notification 进度条/可滚动；slider 输入联动/自定义滑块/reverse/range；calendar 自定义单元格/月年模式切换；message 分组/更新；tabs 动态增删 + 图标；steps 点状/导航模式；breadcrumb 折叠/省略
- **修复批**：tree 自定义节点 Vue CSR 空白、tooltip/popover 箭头 4 placement 定位、tree SVG 尺寸属性等

### 验收标准（均已达成）

- 新能力 demo 进文档站（中英双版），覆盖各属性/事件/边界
- 单测 + typecheck + build + e2e 全绿

---

## v2.1 basic 族组件增强（已完成）

> 原「v2.0 能力补齐」规划的 tag/badge/space/compact 内容整体移入本版本，连同 button/button-group/icon 能力增强、floating 箭头、table 密度、官网首页改版。与既有版本互不冲突。
> 六件深挖（divider/link/typography/kbd/label/visually-hidden）与 code 深挖已全部完成，basic 族 12 件全清。

### 已交付内容

- **basic 族增强**：button（variant 形态/color/wave/auto-insert-space/circle/icon-position/href/plain/target/autofocus/wrap）、button-group（pill/分隔符/嵌套组/拆分按钮）、icon（spin/rotate/flip/图标库注册/动画预设/duotone）、tag（预设色板/dot/processing/avatar 适配/hit/strong/multiline + oas-tag-group）、badge（standalone/color 全模式/offset/status/size/attention/corner/overlap/ribbon-form 七形态 + flag/rolled/premium/ribbon-size/direction/vertical/anchor 体系）、space（separator/justify/reverse/size 数组/fill/响应式断点）+ **oas-compact**
- **floating 箭头**：tooltip/popover/dropdown 统一 arrow（默认显示）/arrow-point-at-center/auto-adjust-overflow
- **table 密度档位**：size small/medium/large（CSS 变量开口）
- **展示型组件字号继承**：A 类跟随外层/B 类组件级变量开口（11 组件）
- **官网首页 v2**：产品力展示方向（hero oas-table demo + 场景卡 + 代码速览 + 真实 perf 数据 + CTA），后迭代 H05 深色沉浸风格
- **六件深挖**：divider（variant 四线型/inset·middle 缩进/size 三档/strong/6 CSS 变量开口/vertical 在 flex·grid 撑满）、link（underline 三态 hover 默认/icon+icon-position/external 自动 target·rel/info 语义色/underline-offset·underline-color 变量开口）、typography（修饰六布尔 strong·mark·code·underline·delete·italic/tag 换标签/depth 三档/line-clamp/copy-text/ellipsis-suffix/actions 操作条）、kbd（variant 四形态 raised·outline·subtle·plain/size 三档/color 统一协议）、label（error 红字/disabled/colon/tooltip 组合演示/color/双击防选中）、visually-hidden（focusable 焦点显形，skip-link 场景）
- **code 深挖**：inline 行内代码（等宽浅底小框 + 高亮）/word-wrap 换行/trim 去首尾空白（默认 true）/size 四档（inline 语境）/variant 四形态（subtle·outline·plain·solid）/color 统一协议
- **无障碍体系**：对比度门禁换 WCAG 3 草案感知对比度算法（自实现公式对拍官方实现 12/12 同值 + contrast-gate 工具）、-text 达标 token 体系（22 预设/语义文字变体，明暗各一套）、color 属性统一协议（11 预设名 + 任意 CSS 色值，ui-spec §4.1）、dark 中间调语义色达标（primary #9ecdff/danger #fbb2b2，粉彩亮化 + 深字，Lc≥71）、a11y 扫描 22 页 + qa-regression 大幅扩充
- **API 表自动化**：api:scan（AST 级扫描）+ api:gen（manifest ∪ descriptions 并集生成）+ CI api:check 防漂移；35 条空描述补录
- **集成反馈批次**（真实项目 oas-md-ka 集成反馈，v2.1 收尾落地）：slider/input-number 受控写回宿主 value 属性（双向受控一致性）；modal 视口高度保护（max-height 90vh + body 滚动，小窗口关闭钮可达）；tabs 非激活项 hover 反馈（line/card 两模式）；间距刻度中间档（space-1_5/2_5/4_5 = 6/10/20px）；集成 FAQ 页 + 快速开始事件前缀专段（`oas-` 前缀设计动机与监听写法）。未纳入项（menubar shortcut 字段 / 多 radio 组 value 作用域 / 动作项 kind / 事件名无前缀属 breaking）待排期
- **收尾**：button demo 自定义色改 WCAG AA 达标值（#047857/#be185d，组件契约不变——自定义色按原值渲染，文档补对比度提醒）+ a11y 门禁转绿

### 验收标准（均已达成）

- 新组件与增强 demo 进文档站（中英双版），覆盖各属性/事件/边界
- 六件（divider/link/typography/kbd/label/visually-hidden）+ code 完成能力深挖并补齐缺口（basic 族 12/12 全清）
- 单测 2360 + typecheck + build + e2e 1283 全绿；perf:size 全过（theme 预算随 token 体系扩充上调 2→3KB）；perf:bench 复跑通过

### 详细需求

- **tag-group**：属性 alue（单选单值 / 多选逗号分隔）、multiple（多选）、disabled（全组禁用）、ria-label（组容器可访问名称，默认走 i18n「标签组」）。事件：oas-change——单选 detail { value }、多选 detail { value: [] }。实现：slot 放 <oas-tag checkable value="x">，组在 capture 阶段拦截子签 oas-change 计算新 value 并同步所有子签 checked（子签事件不外泄，宿主只收到组级事件）；容器 
ole="group"+ria-label。边界：零子签渲染空组不报错；单选不可取消（点已选中项保持选中）；disabled 透传全组不可切。

### 增强（space 第二轮 + compact）

- **space→separator**：`separator` 字符串在子项间插入分隔符（次要文字色）；`slot="separator"` 自定义分隔内容优先于字符串（如竖排分割线）。实现：update 幂等注入 `<span class="oas-space-separator">`（重复 update 不产生重复元素），slot 分隔元素去除 slot 标记后留在原位参与布局（投影到单一命名槽位会破坏「子项间」位置）；分隔符不参与 fill 缩放。SSR：渲染器触发 update 后序列化注入结果，快照确定。
- **space→justify**：`justify="start|center|end|space-between|space-around|space-evenly"`（缺省不设 justify-content）
- **space→reverse**：布尔 `reverse`，horizontal→`row-reverse`、vertical→`column-reverse`
- **space→size 数组**：`size` 接受逗号分隔两值（如 `size="8,16"`）：横向 8px、纵向 16px（wrap 时生效）；单值保持现状；每段独立归一化（token/数字/非法回落告警）
- **space→fill/fill-ratio**：`fill` 子项等分填满容器（flex: 1 等价物）；`fill-ratio`（百分比，默认 100）按比例分配——子项自身可设、容器级作缺省；fill 移除时清空子项 flex
- **space→响应式断点**：`direction` 与 `size` 支持断点简写（空格分隔：基础值 + 若干 `断点:值`，如 `direction="column md:row"`、`size="small md:large"`）。断点常量移动优先 min-width（sm=640px / md=768px / lg=1024px / xl=1280px，@media 不支持 CSS 变量故为字面量）。实现：含断点时宿主内联样式改用 var() 兜底基础值（如 `flex-direction: var(--oas-space-direction, row)`），shadow 模板内置专用 `<style data-oas-space-breakpoints>`，update 生成 `@media (min-width: Npx) { :host { --oas-space-direction: … } }` 写入；SSR 快照同样产出（渲染器触发 update 后序列化 shadowRoot.innerHTML，两段路径一致）。无断点纯值保持原内联直写路径（不破坏既有行为）。非法断点名/非法值回落基础值 + dev 告警（同值去重）。
- **space→行内嵌入**：demo 级能力——`<oas-space style="display: inline-flex">` 嵌在文字段落中间展示行内用法（inline 非组件属性，宿主一行 CSS 即可）。
- **oas-compact**：紧凑容器，slot 内相邻表单控件（oas-button / oas-input / oas-input-number / oas-select）贴边合并边框（相邻 -1px 重叠）+ 首尾圆角、中间直角。圆角合并走 button-group 单一协议（`--oas-button-group-radius` 变量穿透，input/input-number/select 已补同名变量消费钩子）。属性：vertical（纵向贴合，圆角方向改上下）、disabled（透传全组禁用）、block（宽度 100%）。交互态：hover / 聚焦项 z-index 提升盖过相邻边框。边界：空组渲染不报错；slotchange 增减子项自动重算贴合/圆角。



### 增强（tag 第二轮）

- **tag→预设色板**：color 支持 11 个预设名（magenta/red/volcano/orange/gold/lime/green/cyan/blue/geekblue/purple，映射 --oas-preset-* token，dark 自动调亮）或任意 CSS 色值（现状逻辑不变）
- **tag→dot/processing**：dot 文字前状态小圆点；processing 脉冲动画（隐含 dot，prefers-reduced-motion 停用）
- **tag→avatar 适配**：默认插槽放 oas-avatar/<img> 时尺寸随档位、圆形、负 margin 贴左缘
- **tag→hit/strong/multiline**：hit 全不透明语义色描边；strong 加粗（600）；multiline 多行换行（与 max-width 省略互斥时 multiline 优先）

### 增强（badge 第二轮）

- **badge→standalone 独立徽标**：默认插槽无内容时徽标从 absolute 贴右上角回落为静态行内展示（inline-flex 不塌陷，可独立放在文本流/菜单行）
- **badge→color 全模式**：count/dot/ribbon 统一支持 4 语义色（token + on-color 白字）、任意 CSS 色值、11 预设名（解析到 --oas-preset-* token）；实心文字色用 pickOnColor 按底色亮度取黑/白；ribbon 保留现有语义色 class 逻辑兼容
- **badge→offset**：`offset="x,y"`（px 数字）叠加到 count/dot 角标右上角定位（现有 translate 基础上平移）；非法值静默忽略
- **badge→status 状态点**：`status="success|processing|default|error|warning"` 渲染「状态点 + text 文字」行内独立元素（非角标定位）；processing 圆点脉冲（prefers-reduced-motion 停用）；语义色映射 success→success / processing→primary / error→danger / warning→warning / default→text-secondary；与 ribbon/dot/count 互斥（status 优先）
- **badge→size**：`size="small"` 小尺寸档（count 高度 16→13px 左右、字号更小；dot 8→6px）
- **badge→attention 吸引动画**：`attention="pulse"`（外圈脉冲扩散，脉冲色走 `--oas-badge-pulse-color` 自定义属性、默认跟随徽章底色）/ `attention="bounce"`（轻微上下弹跳，幅度约 -25%）；仅作用于 count/dot/standalone 徽标（ribbon 不受影响）；`prefers-reduced-motion` 下停用
- **badge→corner 四角定位**：`corner="top-right|top-left|bottom-right|bottom-left"`（默认 top-right）定位 count/dot 角标；与 offset 关系：corner 快捷定角，offset 在 corner 结果上做屏幕坐标 px 精确微调（x 正向右、y 正向下，与 corner 朝向无关），先定角再平移可叠加；非法值静默回落 top-right
- **badge→overlap 圆形内收**：包裹圆形内容（如头像）时角标向圆内收进圆边（平移幅度 50%→约 29%，1-√2/2 几何内收）；仅影响角标模式
- **badge→ribbon-form 形态维度**：`ribbon-form="fold|diagonal|triangle|bookmark|side|seal|banner"`（默认 fold = 现行直条+折叠，向后兼容）。diagonal 45° 对角斜带跨顶角（宿主需 overflow:hidden 裁切，placement start/end 镜像 ±45°，文字随条旋转）；triangle 角落纯三角形 clip-path + 内嵌小图标（slot="ribbon" 内容）；bookmark 顶边垂挂竖条 + 底部燕尾 V 缺口；side 侧边竖挂（start 左/end 右镜像，折叠角在挂点）；seal 圆形锯齿印章（clip-path 锯齿多边形，文字居中）；banner 顶部横贯横幅（两端折角）。七形态全为 clip-path/CSS 几何，与 placement/color 正交；非法值静默回落 fold
- **badge→premium 金属质感**：布尔 `premium` 金色金属渐变底（多段亮金→暗金）+ 深金细描边（clip-path 形态沿轮廓 drop-shadow 描边）+ 文字色按金底亮度取深色；与 ribbon-form 正交可叠加；优先级 premium > color > 语义色；dark 主题走 `--oas-preset-gold` token 自动适配
- **badge→ribbon-form flag（侧燕尾横旗）**：`ribbon-form="flag"` 横条 + 探出外端侧燕尾 V 缺口（clip-path 多边形在端侧切 V 口，缺口始终朝探出端，placement start/end 镜像）；底部挂点内侧保留折叠角（复用 fold 的 corner 尖三角，因条身 clip-path 会把条外元素裁掉，折叠角置于条身 clip 区域内 bottom 内侧）
- **badge→rolled 端部卷边**：布尔 `rolled` 给探出外端做卷边效果（端部大圆角 + 内侧渐暗渐变模拟卷起圆柱感，纯 CSS、原创）；独立开关，可叠加 fold / banner / flag，其余裁剪形态（diagonal/triangle/bookmark/side/seal）静默忽略
- **badge→ribbon-size 斜带档位**：`ribbon-size="sm|md|lg"`（默认 sm）给 diagonal 提供三档（带宽/字号/带中心钉点递增，lg 覆盖电商 % off 大斜幅场景）；档位只改 `--oas-badge-diagonal-*` 的 fallback 默认值，宿主自定义属性优先级更高；仅 diagonal 生效，非法值静默回落 sm
- **badge→ribbon-direction 燕尾尖头方向**：`ribbon-direction="down|left|right"`（默认 down）控制 bookmark 燕尾缺口朝向（down 顶边垂挂尖头朝下；left 条身贴右缘、尖头朝左；right 贴左缘镜像；物理方向语义 RTL 不翻转）；仅 bookmark 生效，非法值回落 down
- **badge→ribbon-vertical 侧挂纵向位置**：`ribbon-vertical="center|top|bottom"`（默认 center）控制 bookmark 侧挂（left/right）的纵向位置（贴顶边 / 垂直居中 / 贴底边）；仅侧挂生效，非法值回落 center
- **badge→offset 缎带任意位置微调**：`offset="x,y"` 给所有缎带形态做 px 平移（先形态锚点再平移，translate 独立属性与形态 transform 叠加，支持负值）；与 placement / ribbon-position / ribbon-vertical 正交叠加；非法值静默忽略

### 增强（table 第二轮）

- **table→size 密度档位**：`size="small|medium|large"`（默认 medium）三档密度——档位只改单元格 padding 与字号的默认值（small：8/12px + sm 字号；medium：12/16px + md 字号＝现状零回归；large：16/24px + lg 字号），全走 CSS 变量（`--oas-table-cell-padding-block` / `--oas-table-cell-padding-inline` / `--oas-table-font-size`），宿主变量覆盖优先级高于档位；行内编辑器 padding/字号跟随档位；非法值回落 medium 并告警（同控件 size 惯例）；与 `row-height` 正交（虚拟滚动等定高场景行高由 row-height 决定，不受档位影响）。命名与控件 size 体系同词（small/medium/large，主流三档密度惯例），对齐 vision「API 对称」与「CSS 变量开放定制点」原则；tree 密度与全局尺寸上下文评估后明确不做（Web Components 无 Provider 机制）

### 官网首页（landing page · v2）

文档站首页（中英）以**产品力展示**为方向——首页是组件 demo 的展厅，不是工程属性卖点清单。

板块流（中英各 6 区段）：hero + 数字一览 + 核心场景 + 代码速览 + 性能速览 + CTA 横幅 + 页脚。

- **Hero 右栏**：oas-table 完整 demo（排序/分页/空态/loading 状态切换控件）——替代 v1 的 9 件套拼盘，传达「这库能做真应用」。
- **核心场景**：3 张卡（表单 / 数据展示 / 反馈），每卡嵌真实可交互的迷你 demo——替代 v1 的 6 张工程属性卡。
- **代码速览**：HTML 单例 + 4 个框架桥接图标卡（HTML/Vue/React/Svelte+Angular）——WC 是 HTML 标准，单例即足够。
- **性能速览**：3 个真实 gzip 数字（CDN/按钮链/全量入口）由 `pnpm stats:gen` 扩 perf 字段从 `docs/perf-baseline.json` 读取，CI `stats:check` 防漂移。
- **CTA 横幅**：三行安装命令 + 快速开始/GitHub 双按钮。

dogfooding 硬性原则：所有自绘区块用自家 `oas-*` 组件搭建，首页即产品展厅。验收：中英首页完整、HeroTableDemo 状态切换真实可交互、三层范式（标题/导言/内容）齐全、`pnpm test:e2e` 全绿（含 homepage.spec）、stats:check 进 CI。

## v2.1.1 文档补丁发布（已完成）

v2.1.0 之后、组件 API 零变更的纯文档补丁，随 npm 分发自动生效：

- **8 个发布包 README 中英双语化**：单文件 `[中文](#中文) | [English](#english)` 锚点切换，默认中文在上，顶部与 English 段前各一条切换栏（任何语言视图开头均可再切）；顺带完善各包安装/使用/相关包引用与文档站链接
- **CDN 引用版本号 `@1` → `@2`**：文档站/README 中 unpkg 引用随主版本升级（2.x，解析最新 v2.1.x），`@N` 大版本区间语义避免写死

## v2.1.2 菜单族反馈批次发布（已完成）

集成反馈第二批（真实项目 oas-md-ka 集成反馈收尾），组件 API 扩展（menubar/menu 双向）：

- **#4 menubar 多组单选独立勾选**：`value` 支持 JSON 对象字符串（`{"mode":"preview","theme":"dark"}`）按组 id 作用域独立记录；`type:"group"` 项的 `value` 作组 id，组内点选只更新该组；纯字符串保持全局单选兼容旧用法
- **#5 动作项 `kind="action"`**：menubar/menu 叶子支持动作语义——渲染 `menuitem`（无 aria-checked、无勾选态）、点击只 emit `{value, kind:'action'}` 不写回 value；默认 radio 兼容
- **#2 shortcut 快捷键**：menubar 叶子 `shortcut` 字段，右侧 kbd 视觉提示 + document 级 keydown 自动绑定（Ctrl+N 等，preventDefault 拦截浏览器默认，裸字母键不响应）
- **#10/#10a 文档标注**：API 表说明事件 `detail` 的 `originalEvent` 非原生 Event、`data-value` 是内部定位属性宿主不应依赖
- **#10-3 oas-menu 组作用域**：与 #4 同根，menu 的 group 项 value 作组 id + JSON value 按组独立勾选，同步生效
- **事件 detail 联合类型**：api:scan 改进，同一事件多处 emit 且 detail 不同时合并为联合类型（如 `oas-select` = `{value} | {value, kind:'action'}`），editable/pagination/input-number 等分支 detail 一并补齐
- **e2e CI flaky 修复**：demo-coverage 事件探针 upgrade 等待 4s→10s + 事件缺失自动重试（2 核 runner 高并发下组件 upgrade 慢所致）
- **验收**：menubar 32 + menu 39 单测（全量 2375）、typecheck/build/api:check 全绿、e2e chromium 930 + firefox 抽样 343 全绿；浏览器实测多组独立勾选/动作项不勾选/Ctrl+N 触发/console 零告警

## v2.1.3 Tabs 能力补齐发布（已完成）

Tabs 组件按能力补齐全量补齐 + 首页页脚打磨：

- **Tabs 能力全量补齐**（能力补齐）：disabled 禁用、size 五档、centered/justified 布局、溢出滚动+箭头（`without-scroll-controls` 可关）、more 溢出（滚动+视口外镜像下拉，含搜索过滤+点选平滑滚动到可见）、panel-mode（keep/lazy/destroy 面板显隐策略）、activation（auto/manual 手动激活）、animated 动画、oas-before-change 切换前拦截（cancelable veto）、editable 双击重命名（失焦保存）、sortable 拖拽换位、嵌套 tabs（:scope 直接子面板）、slot=label 自定义标签
- **Tabs 二次补缺**：滚轮横向滑动、新增/激活标签自动滚到可见、+ 按钮固定标签栏末尾、more 下拉搜索+选中定位；editable 打磨（真实双击、失焦保存、宽高贴合、几何对齐）；more 重构为通用机制（滚动+视口外镜像）
- **Tabs 能力复核补齐**：trigger:hover、allow-deactivation、stacked、icon-only、指示线 CSS 变量+hide-indicator、reserve-selected-space 选中防抖、tab 即链接（href/target/rel）、hide-content 纯导航、items 数据驱动、scroll-position 滚动定位、PageUp/PageDown 键盘溢出滚动、add/close 图标 slot
- **下划线渲染修复**：激活下划线在溢出滚动容器下被裁剪/叠加/亚像素伪影 → 改用 ::after 伪元素（独立 2px 盒子，渲染精确、不被裁剪），card 模式保持边框连通不叠加
- **首页页脚**：页脚品牌位改真实 logo 图标（favicon.svg/dark 用 favicon-dark.svg，与导航栏一致）+ 消除底部 128px 空白（vitepress .VPHome 默认 margin 残留）+ 版权行底部间距 56px→32px
- **验收**：tabs 单测 107（全量 2452）、typecheck/build/api:check 全绿、e2e chromium 935 + firefox 抽样 348 全绿、contrast-gate 0 违规、console 零告警；浏览器实测各能力正常渲染可交互

## v2.1.4 basic 组件复核补齐发布（已完成）

basic 族 12 组件按能力并集复核后的增量能力补齐 + divider 垂直方向能力完善：

- **button**：`icon-end` 双侧内容（左图标+右下拉箭头）、loading 保持宽度（spinner 居中不撑宽）、`loading-text` 加载文本、`loading="auto"` 异步自动 loading（Promise 期间自动进出）、`disabled-focusable` 禁用可聚焦（挂 tooltip 解释原因）、`download`/`rel` 链接透传
- **button-group**：`spread` 均分铺满、组级 `variant`/`round` 透传
- **tag**：`close-icon` 自定义关闭图标 + `close-label` 朗读名、`loading` 异步关闭（`oas-close` detail 含 `done()` 回调）、`checked-icon` 选中勾选图标
- **badge**：`bordered` 白描边（从背景分离）、`icon` 徽标内图标、aria-live 数字变化播报（role=status+aria-live=polite）、`variant="outline"` 描边形态、`size` 三档
- **typography**（oas-text/title/paragraph）：`align` 对齐档、`weight` 字重档、`numeric` 数字等宽（表格数字列对齐）、mark 自定义色（`--oas-text-mark-bg` 变量开口）
- **ellipsis**：`direction="start|middle"` 省略方向（保留首尾中部省略，长路径/哈希场景）
- **link**：`download` 透传、`size` 字号档、`loading` 态（转圈+禁点）
- **divider**：`content-position` 垂直分流（top/bottom 贴顶/贴底）、`text-orientation` 文字方向（横排/竖排）、垂直 inset/middle 缩进留空（grid 行留白，相对容器高度）
- **kbd**：语义键名映射（command→⌘ 等 30 键 + abbr title 全称朗读）
- **label**：`size`/`weight` 档
- **space**：弹簧占位 demo（文档级）
- **验收**：各组件单测全过（button 58/tag 70/badge 120/button-group 28/typography+ellipsis 24/link+divider 89/kbd 25/label 38）、全量 2599、typecheck/build/api:check 全绿、e2e chromium 935 + firefox 348、contrast-gate 0 违规、console 零告警；浏览器复核关键交互（loading 保宽、disabled-focusable、badge 描边、tag 选中√、divider 垂直对齐/竖排/缩进）

## v2.1.5 menu/dropdown/contextmenu 能力补齐发布（已完成）

floating 导航族三组件按能力并集补齐 + 水平收纳/inline 形态多轮实测修复：

- **menu**：`kind="checkbox"` 多选项、`danger` 危险项、`href/target/rel` 链接项、`max-height` 长菜单滚动、typeahead 字符定位、`mode="inline"` 就地展开（高度过渡+箭头旋转）、`expanded` 受控 + `oas-expand-change`、`accordion` 手风琴同级互斥、horizontal 溢出收纳「···」（ResizeObserver + 镜像弹层 + i18n）、`close-on-select` 选中收起策略（缺省分形态/显式覆盖/checkbox 豁免）、「···」弹层选中反馈（镜像 ✓ + child-selected 高亮）
- **dropdown**：`trigger` click/hover/focus 多选、`hover-delay`/`hover-hide-delay` 防抖、`placement` 12 向、`oas-open-change`、整体 `disabled`、`hide-on-click`、开合动画（transform-origin 感知方向）、`close-on-scroll`、`offset`
- **contextmenu**：`long-press-delay` 长按触发、`show(x,y)`/`close()` 编程式、受控 `open` + `oas-open-change`、右键别处关闭、`close-on-scroll`
- **实测修复**（用户视角验证门禁驱动）：inline hover/click 抵消展不开、inline-sub flex 并排、inline-sub role 嵌套 axe 违规、水平浮层 overflow 裁剪不可见、「···」收纳项自身被收、「···」弹层右缘截断+颜色继承、inline 选中/移出误收起
- **验收**：menu 64 + dropdown 52 + contextmenu 21 单测（全量 2673）、typecheck/build/api:check 全绿、e2e chromium 937 + firefox 350、axe 零严重违规、console 零告警；浏览器实测 light/dark 全交互链（inline 展开/手风琴互斥/受控展开/水平收纳弹层选中反馈/close-on-select 对照/dropdown hover 面板/contextmenu 各触发）

## v2.2.2 导航与浮层族 11 组件能力补齐（已随 v2.2.2 发布）

tooltip/popover/hover-card/breadcrumb/anchor/back-top/tour/command/menubar/navigation-menu/toolbar 按能力并集全量补齐（唯一豁免：command 内置模糊搜索并入未来打包勾选特性）：

- **tooltip**：placement 12 向、trigger 多选（hover/click/focus/contextmenu/touch/manual）、open/close-delay、富内容插槽、Esc + aria-describedby（WCAG 1.4.13）、max-width token、disabled、方向感知动画、interactive 可悬停、skip-delay 延迟组、append-to portal、双轴偏移、color 变体、禁用触发兼容、collision-padding、箭头 merge/fresh/auto-close/trigger-keys
- **popover**：trigger 多选 + hover 防抖、placement 12 向、宽度定制 + width='trigger'、初始焦点指定、关闭按钮 + 声明式关层、append-to、颜色变体、碰撞细调（fallback-placements/hide-when-detached）、modal 化（backdrop+焦点锁+滚动锁）、arrow-merge/fresh/auto-close/trigger-keys；嵌套级联 + Esc 栈保持领先
- **hover-card**：浮层可悬停不闪关（立身修复）、富内容插槽、open/close-delay 分离、箭头、oas-open-change、role 语义修正（去 dialog）、方向感知动画、延迟组、宽度定制、append-to、碰撞细调
- **breadcrumb**：项 icon、图标分隔符、真实链接 href/target（不再吞默认跳转）、disabled、折叠保留数可配、项下拉菜单、单项截断 + title、size、键盘导航、active 语义、schema.org BreadcrumbList JSON-LD、color/underline 变体、part 扩展
- **anchor**：scroll-container 指定滚动容器、target-offset 落点偏移、children 多级嵌套、横向模式、滚动联动 oas-change（含新旧值）、affix 吸附、轨道+移动墨水条、bounds、get-current-anchor、block 落点、hash/replace、duration、variant/size、scrollTo 方法、oas-anchor-target 新组件
- **back-top**：visibility-height 阈值自动显隐（默认 400）、target 目标容器、默认插槽、duration、进出场动画、shape/size/theme、26 种 easing、显隐受控 + oas-visibility-change、append-to、reduced-motion 降级、进度环、reverse 滚底、expand 撑满条、tooltip/badge、8 方位
- **tour**：placement 12 向 + 溢出翻转、scrollIntoView、滚动/resize 重定位、箭头、mask 开关 + 非模态、type=primary、gap 可配、键盘 ←/→、show-close、step 级覆盖、遮罩点击行为、高亮区可交互、指示器定制、cover 插槽、异步步骤、生命周期事件、dialog 模式、锁滚动、hints 信标、「不再显示」记忆、多页引导、打字机 + 进度条、append-to
- **command**：项图标、快捷键 kbd 标注、loading、should-filter=false 外部过滤、空态插槽、hotkey 可配/可关、oas-open-change、匹配高亮、嵌套页面 + 面包屑回退、最近使用（localStorage）、自定义过滤函数、description、打分排序、limit、footer 插槽、分隔符、搜索/选中受控、close-on-select、forceMount 创建型、虚拟滚动、面板内嵌视图、多选
- **menubar**：checkbox 项、typeahead、打开项受控 + oas-open-change、click 首开语义（开后 hover 切换）、icon、trigger 配置、loop、整栏 disabled、side/align/offset 弹出定位、close-on-select、breakpoint 汉堡收纳、箭头、方向感知动画、竖排
- **navigation-menu**：大面板内容形态（多列网格链接卡 icon+标题+描述）、延迟开合 + skip-delay、value 受控 + oas-change、chevron 箭头、外部点击关闭、Link active/aria-current、viewport 统一容器宽高过渡 + 方向位移动画、indicator 指示条、vertical、面板内二级子导航、backdrop、keep-mounted、箭头、面板滚动兜底；disclosure navigation 语义（不用 menu role）
- **toolbar**：oas-toolbar（orientation vertical/loop/disabled/focusable-when-disabled/size 三档/data-toolbar-far 右对齐/链接项 part/水平溢出收纳「···」镜像弹层/is-attached 贴边形态/复合部件方向键豁免）+ 新部件 oas-toolbar-toggle（单/多选受控 + aria-pressed + 内部 roving）/ oas-toolbar-separator（role=separator 自适应方向）/ oas-toolbar-input（单 Tab 停靠输入）
- **共享**：浮层定位引擎升级 12 向 + skidding + collisionPadding（tooltip/popover/hover-card/tour 复用）
- **实测修复**：toolbar SSR 溢出误判（happy-dom 假溢出致快照隐藏项、水合布局漂移 9px；溢出判定改 scrollWidth>clientWidth 防 shrink-to-fit 假溢出）；popover 退场动画延迟 aria-hidden（语义状态立即落地 + .oas-closing 保显播完）；back-top append-to 竞态致 Vue 水合 mismatch（组件级 load 后 teleport + 站点级注册移至水合后）；toolbar is-attached 样式缺失
- **验收**：单测 tooltip 78 / popover 90 / hover-card 35 / breadcrumb 33 / anchor 41 / back-top 35 / tour 60 / command 67 / menubar 61 / navigation-menu 36 / toolbar 43 / 定位引擎 30（全量 3120）、typecheck/build 全绿、e2e chromium 944 + firefox 抽样 355、ssr-dsd 11/11、console 零告警；识图验收 light+dark 全 11 页通过（33 张截图逐张核对）

## v2.2.3 导航与浮层族复核批（9 组件能力增量与缺陷修复）→ 已发布

对 tooltip/popover 之外的 9 件（hover-card/tour/command/breadcrumb/anchor/menubar/navigation-menu/back-top/toolbar）按组件深挖流程复核：差距补齐 + 缺陷族排查修复 + 浏览器实测验证。三组滚动推进（浮层系→导航系→独立件）。

### 浮层系（tour/hover-card/command）

- **tour 缺陷修复 7 项**：断开重连后 document keydown 丢失（update() 幂等重挂，恢复 Esc/方向键）、advance-on-click 换步旧目标残留 click 监听、append-to 后 slot=cover/indicators/actions 断供（portal host 桥接，连带修 portal 态 overlay 显隐/步骤推进/关闭拆除三处）、-start/-end 箭头被视口夹取后错指（positionArrow 投影+clamp）、auto-reposition 属性实装（原恒真死代码）、mask=false 时 aria-modal 降级、高亮框与遮罩孔过渡对齐（mask-seg 同参 transition）
- **tour 能力 4 项**：gap offset 双轴（[水平,垂直]）、arrow-point-at-center、slot=indicators 自定义指示器、slot=actions 自定义动作区
- **hover-card**：滚动/resize 重定位默认开启（原仅 hide-when-detached 挂监听，锚点滚走卡片悬空——缺陷级）+ sticky 三档（off/partial/always 贴边不消失）+ collision-boundary 自定义碰撞边界（选择器 + property 双通道；**坐标系缺陷修复**：边界解析丢 rect 原点致夹取/翻转按视口原点折算、边界在页面中部时卡片飞向视口左上——单测 stub left=0 掩盖，浏览器实测发现）
- **command**：keydown 重连丢失（幂等重挂）+ 开合过渡动画（reduced-motion 降级）+ search aria-controls 关联 listbox + append-to portal（插槽桥接家族一致化）
- **验证**：tour 75 / hover-card 51 / command 76 单测；16+ 截图 light/dark 识图；collision-boundary 坐标系与几何回归入 qa-regression（双浏览器）

### 导航系（breadcrumb/anchor/menubar/navigation-menu）

- **breadcrumb 双通道试点（架构决策）**：`<oas-breadcrumb-item>`/`<oas-breadcrumb-separator>` 子元素声明式通道——items 属性显式设置时数据驱动优先，否则子元素解析收敛到同一渲染路径（MutationObserver 响应变化）；分隔符任意节点。全库「声明式子元素通道」的试点范式，验证后分批推广其余 items 组件
- **breadcrumb**：oas-collapse-click 折叠展开事件（detail 带被折叠项）；ellipsis 自裁剪修复（overflow-x:clip + overflow-y:visible）；下拉水平翻转；层级缩进纯 CSS demo、项挂菜单组合 demo
- **anchor**：oas-click 事件分离（与滚动联动 oas-change 区分）；resize 重算（缺陷级补齐）；滚动 rAF 节流；block=nearest 最小滚动落点
- **menubar**：子项 href 真链接（渲染 `<a>` 保留 select/键盘/aria，中键新开可用）；水平溢出收纳「···」（offsetWidth 测量+复位再测+镜像弹层+选中反馈，仅水平模式）；checkbox indeterminate 半选（aria-checked=mixed + 横线减号）；start/end 插槽；缺陷修复三处（scale 动画污染定位测量改布局尺寸、divider role/aria-hidden 互斥、typeaheadTimer 清理）；**SSR 溢出误判三连修（e2e 水合漂移 38px 驱动）**——零宽守卫（clientWidth=0 不判定，防误判态烤进快照）+ 收纳壳创建态整体隐藏（原只藏按钮，快照含 34px 空壳）+ 水合后 rAF 重算（hydrate 路径原无重算通道）
- **navigation-menu**：面板箭头跟随触发器（CSS 引用 --arrow-x/--arrow-y 但 JS 从未写入的 bug 修复）；viewport 碰撞翻转（右缘/下缘/竖排左缘）；面板内二级子导航（sub 字段 + 覆盖式二级面板 + 级联动画 + Esc/← 逐层回退，与 section 折叠并存）；loop 属性对齐 menubar；panel-footer 营销位插槽
- **验证**：breadcrumb 43 / anchor 51 / menubar 79 / navigation-menu 51 单测；箭头跟随与 ellipsis 裁剪入 qa-regression（双浏览器）；17 截图识图；五个初判异常经 DOM 精诊全部洗清（采集探针问题）

### 独立件（back-top/toolbar）

- **back-top**：target 缺省自动探测最近可滚祖先；tooltip 读屏可达（aria-describedby 关联）；draggable 拖拽（pointer 捕获 + 视口夹取 + 4px 点击/拖拽阈值 + 位置持久化恢复）
- **toolbar**：断开重连后 pointerdown/ResizeObserver 永久丢失修复（update() 恢复模式）；弹层下缘翻转；镜像项 menuitemcheckbox 语义（CSS 勾选替换 ✓ 文本）；start/end 插槽；**溢出收纳防收缩（浏览器实测真缺陷）**：slotted 项无 flex-shrink:0 被压扁成窄条、scrollWidth 恒等 clientWidth 收纳永不触发——修复 + 几何回归（双浏览器）
- **验证**：back-top 47 / toolbar 45 单测；拖拽/半选/弹层识图确认

### 复核批汇总

- **验收**：全量单测 3280 / typecheck / build / api:scan+gen / e2e chromium 全量 969 + firefox 抽样（ssr-dsd 真水合 38px 漂移修复后全绿）/ perf:size 六项 PASS（cdn 245.5KB < 300KB 天花板）/ trace 门禁 0 命中 / dev 浏览器实测 40+ 截图 light+dark console 零告警 / 感知对比度门禁 exit 0
- **缺陷固化回归 6 条**：hover-card collision-boundary 坐标系、navigation-menu 箭头跟随、breadcrumb ellipsis 裁剪、toolbar 防收缩、menubar 零宽守卫（单测）、demo-coverage 探针豁免补录
- **demo 探针**：navigation-menu loop 演示补录、oas-collapse-click 纳入事件豁免清单（需折叠交互序列）

### 实测第二批（oas-ui-templates 集成反馈）

- **浮层箭头统一与 merge 修复**：标准菱形箭头全家族统一 12px/-6px（居中 calc -6px、ARROW_SIZE 12 对齐盒尺寸）；merge 贴角直角三角独立固定 8px 盒——popover/hover-card merge 描边三修（去方向性 drop-shadow 致左缘视觉偏移、去贴面板融合边描边线、斜边渐变带加粗同直角边观感）
- **icons**：arrow-up/arrow-down 方向画反修复（svg 源顶点互换 + 方向类几何断言固化）；icon generate 脚本原子化（中断不毁 src/icons）；duotone 分层/双色两处修复
- **tour 缺陷 5 连修**：append-to portal host display:none 致浮层 0×0 不可见、弹窗 pointer-events:none 穿透误关、typewriter 布尔属性误判、首打开目标视口外闪现错位、demo 高亮区可交互化
- **layout/sidebar/sider/table 模板缺陷 9 项**：sidebar active 受控（aria-current）+ drawer-open 纳入观察 + 触发按钮 SVG 化 + items.icon 注册表 SVG 渲染；layout sider slot 判据改 `slot="sider"`；sider 折叠联动内部 sidebar + 宽度 CSS 变量开口；table 单元格 render 支持 Node/元素富内容 + columns property 保留函数 + `:host([hidden])` 修复
- **select 下拉定位**：`.dropdown` 从宿主 absolute 改 `position: fixed` + computePosition 锚定（与 combobox 一致），逃出祖先 overflow 容器不再逼出滚动条
- **tabs more 下拉语义纠偏**：offview 判定从「完全滚出」改为「不完全可见」（部分滚出也算），空下拉消除；ResizeObserver 回调补 syncMore（缩窗不出现/扩窗不撤回双向修复）
- **menubar shortcut 契约**：「修饰键+键」直接绑定；单键仅限功能键（F1-F12）绑定，其余单键仅展示不绑定；文档明示
- **menu checkbox**：多选方格与标签补 margin 间距（深色实测挤文字）
- **sidebar items.group 分组**：连续同组项前渲染组标题节点（part=group，弱化语义色、纯展示；折叠态隐藏/抽屉态显示），items 向后兼容
- **tabs tab-badge 颜色开口**：背景/文字从写死 danger 改 `--oas-tabs-badge-bg/--oas-tabs-badge-color`（默认 danger 兼容）+ part="badge"，宿主可中性化
- **验证**：全量单测 3280 / e2e chromium 969 / 感知对比度门禁 exit 0 / 截图识图 light+dark 全过

## v2.2.4 layout 域深挖批（tabs/sidebar/layout 能力增量与实测缺陷修复）→ 已发布

实测第三批（oas-ui-templates 集成反馈）聚焦 layout 域：tabs 右键菜单新能力、sidebar 全量补齐、layout 视口锁定，连同品牌标识定稿。

### tabs 右键操作菜单（context-menu，新能力）

- 右键任意标签弹操作菜单：新建 / 关闭 / 关闭其他 / 关闭左侧所有 / 关闭右侧所有 / 关闭全部（新建与关闭族间分隔线、关闭全部 danger 色）
- 契约复用零变更：新建派发 `oas-add`（与 addable + 按钮同源）；关闭类按目标集合逐个派发 `oas-close`（与 closable 同源，宿主按 key 移除面板）
- 文案两层语义：菜单项中性「新建」（`tabs.ctxNew`）；`detail.label` 携带 locale 默认产物名（宿主可忽略）；宿主 `setLocale` 展开覆盖业务文案（docs 有示例）
- menu 模式键盘 roving：打开聚焦首项、ArrowUp/Down 循环、Home/End 跳首末、Enter 执行、Escape 关闭；外部点击关闭；光标定位 fixed + 视口夹取

### tabs more 下拉键盘可达（无障碍缺陷修复）

moreBtn 键盘打开聚焦第一项 + 列表 roving（ArrowUp/Down/Home/End/Enter/Space）+ Escape 回焦触发器 + 搜索框 ArrowDown 进列表/Escape 收起——此前仅鼠标可达，键盘用户无法到达溢出标签

### sidebar 全量补齐批（能力补齐 + 实测缺陷修复）

- **能力**：嵌套子菜单（children、激活子项自动展开/折叠隐藏/缩进引导线）、折叠态 tooltip、键盘导航、shortcut（Ctrl/Cmd+B）、badge（`--oas-sidebar-badge-*`）、divider、loading 骨架屏（行数可配）、expand-on-hover（不改 collapsed 受控）、variant（sidebar/floating/inset）、side=right、actions 悬停操作（`oas-action`）、多 sidebar 共存、`items.group` 分组标题
- **resizable 内置拖拽调宽**：宿主边缘拖拽条（part=rail）实时改宽写回 `width` 属性、resize-min/max（默认 160~480）、键盘 ±8/Home/End、`oas-resize`；仅桌面非折叠态
- **实测缺陷修复**：hover 零对比（`--oas-sidebar-item-hover-bg` text-primary 6% + active hover 加深）；嵌套子菜单两视觉缺陷（`.sub` 类名冲突激活背景溢出右缘 → `.submenu` 隔离；无图标子项缩进错乱 → 图标占位 + label 缩进父项右侧）；splitter 组合内联 style 被 update 清除（`width="100%"` 属性化）

### layout 视口锁定 + sider/sidebar 宽度契约（实测两条）

- **`viewport` 属性（新能力）**：admin 场景 opt-in——布局锁定视口高（`var(--oas-layout-height, 100dvh)`，100vh 级联回退，变量开口），顶栏/底栏固定、侧栏/内容各自独立滚动；默认整页滚动模型不变
- **宽度契约「sider 管轨道、sidebar 填满」**：sidebar `:host-context(oas-sider)` width:100%（内嵌填满轨道 200、折叠跟随 64）、sider 内嵌卸轨道 padding 16、height:100% 打通内嵌滚动链；独立使用仍走 `--oas-sidebar-width`（220）——两变量职责清晰，改任一侧不错位
- **工程坑记录**：`:host(:has())` Chromium scoped CSS 不生效（matches true 但声明被忽略）→ MutationObserver 同步 data-embed；`::slotted()` 特异性压不过内层 `:host` → 跨 shadow 覆盖用内层 `:host-context`

### 其他

- **modal body 滚动边缘指示**：CSS-only scroll shadow（顶部无阴影/中部双阴影/底部仅顶阴影），长内容滚动边界可辨
- **card**：无 title 时 header 33px 空占位修复（`.header[hidden]` 兜底）
- **icons generate 加固**：并发竞态（临时目录按进程隔离）+ dev watch 句柄 EPERM（目录原子替换退避重试——发布构建与 pnpm dev 并行必现级）
- **品牌标识定稿**：新 logo `<(w)>` 三版对比定稿紧凑版；favicon 全套重生成（svg 双主题 + 5 尺寸 png）
- **docs 首页**：「性能速览→三行代码」屏间渐变分隔光带补齐（`.home-divider` 元素版，与 `.home-section::before` 同位同款）

### 验收

- 全量单测 3318 / typecheck / build / api:check / perf:size 六项 PASS（cdn 253.8KB < 300KB 天花板）/ e2e 1370（chromium 全量 + firefox 抽样 + docs-site）/ trace 门禁 0 命中 / 浏览器实测截图识图 light+dark 全过 / console 零告警
- 新增回归：tabs context-menu 单测 5 例 + e2e；layout viewport/宽度对齐 e2e 像素断言 2 例；sidebar hover/嵌套/splitter/resize e2e；homepage 分隔线 e2e

## v2.2.5 双通道推广 + sidebar 深挖批 + 浮层定位与 token/图标补齐 → 已发布

三主线：①breadcrumb 双通道试点范式全库推广（12 组件子元素声明式通道）；②sidebar 深挖批（实测驱动的能力增量与系列缺陷修复）；③date-picker 浮层定位引擎接入 + radius scale 补全 + 图标增量 + chart 能力。

### 子元素声明式通道推广（架构决策落地）

- **三批 12 组件**：导航系（menu/menubar/navigation-menu/anchor）→ 浮层触发族（dropdown/context-menu/command）→ 布局/表单族（sidebar/bottom-navigation/select/toggle-group/toolbar-toggle）；virtual-list 豁免（unknown[] 数据型无标量可映射）
- 统一契约：items/options 属性显式时数据驱动优先，否则子元素解析收敛同一渲染路径；MutationObserver 感知增删改；数据载体 `:host{display:none}` 纯数据、默认插槽文本为 label、属性对齐 items 字段、嵌套递归 children
- 子元素命名对齐组件语义（oas-menu-item/oas-option 等；dropdown/context-menu extends menu 数据载体零重复；command keywords 逗号拆分/嵌套递归 page）
- select 顺路补齐（options 模式，`<oas-option>` 对齐 HTML 原生 option 心智；收敛点在虚拟/非虚拟两条渲染路径之前）

### sidebar 深挖批（实测驱动）

- **能力**：`hide-toggle`（折叠按钮 opt-out）、`accordion` 手风琴同级互斥（menu 同语义）、嵌套子树平滑动画（grid 0fr/1fr 过渡 + visibility 联动 + reduced-motion 降级）、嵌套机制无限级（3 级实证，文档建议 ≤3 级）、图标通道打通 registerIcon 正路（lookupIcon 单一查表点导出）+ `iconColor` 项级着色、`--oas-sidebar-bg` 背景开口（var 链回落）、child-selected 激活后代指示
- **修复**：折叠态嵌套父项死交互（纯图标项化）、折叠态徽标溢出走紧凑角标、子菜单 hidden 失效根治（display:flex 压 UA 规则——视觉断言固化：computed visibility/高度而非仅属性）、父子项底色粘连（.item-block 呼吸 gap）、嵌套缩进收敛（61→49px）+ 引导线对比度（text-primary 12% 混色）
- **教训沉淀**：「机制正确 ≠ 用户看到的正确」——显隐类修复必须量真实渲染；hidden 语义与动画不可兼得（display:none 无过渡）→ visibility+0fr 两全

### 其他

- **date-picker 浮层定位**：fixed + computePosition 锚定（select/combobox 同模式，逃出祖先 overflow）+ `placement` 12 向 + 碰撞自动翻转 + range 双月同引擎（模板右缘被裁场景修复）
- **radius scale 补全五档**：xs 2 / sm 4 / md 6 / lg 10 / xl 14（token 按对外能力完备性提供，不只按库内消费定档）
- **icons +4**：organization/tree（层级语义缺口，tree 初版与 org 同质化识图复核后重画左根 list-tree）/ language/translate（语言切换与翻译语义；translate「文」字形与比例两轮实测修正）
- **chart**：面积图 `options.gradient` 垂直渐变填充；smooth 曲线与末数据点脱节修复（贝塞尔终点误用 + 缺收尾段）

### 验收

- 全量单测 3419 / typecheck / build / api:check / perf:size 六项 PASS（cdn 263.5KB < 300KB 天花板）/ e2e 1372（chromium 全量 + firefox 抽样 + docs-site）/ trace 门禁 0 命中（全树 + 全历史）
- 新增回归：双通道三批单测 +73 / sidebar 深挖批单测 +30 / date-picker 定位 +6 / qa-regression 视觉断言 3 例（sidebar 折叠态几何、子菜单 visibility、layout viewport）
- demo-coverage 属性全覆盖（placement/hide-toggle 显式演示补齐）

## v2.2.6 iconColor 内置图标着色修复 → 已发布

实测缺陷修复（模板 v2.2.5 使用官方 `iconColor` 全灰）。

### 修复

- **sidebar `iconColor` 对内置图标不生效**：`iconSvg` 只在 `<svg>` 外层写 stroke，内置图标 path 自带 `stroke="currentColor"` 压过外层，颜色永远 currentColor。修法：iconColor 显式时对 path 的 currentColor 做替换——内置单色 path 着色生效；自定义注册彩色 SVG 天然兼容；缺省 currentColor 随态零回归
- docs 图标着色 demo 补内置图标场景（内置 star 配 iconColor 显式着色活示例 + 内置 heart 无 iconColor 随态对照）

### 验收

- 全量单测 3423 / typecheck / build / api:check / perf:size 六项 PASS（cdn 263.7KB < 300KB 天花板）/ e2e 1372 / trace 0
- 单测 +1（内置 star 配 iconColor → path stroke 被替换）；浏览器实测内置 `#f50` / `var(--oas-color-danger)` 生效、缺省 currentColor 零回归；识图复核 demo 内置星标红色可辨

## v2.2.7 table 组件能力补齐 → 已发布

table 组件按能力并集补齐（列设置/多列排序/多级表头/内置分页/列过滤/合并单元格/子元素声明式通道/单元格模板/自定义列头/编辑校验），core 增 ReactiveController 注入协议。

### 特性

- 列显隐（`TableColumn.hidden` + 受控 `column-keys`）、列拖拽重排、列宽拖拽
- 多列排序（`multi-sort` / SortState 多级比较 + 表头 sort-index 徽标）
- 多级表头（`children` 递归组头：组列 colspan、叶子 rowspan）
- 内置分页（`pagination`/`page-size`/`current` 数据切片 + 复用 oas-pagination）
- 列过滤（`filterable`/`filters`/`filterMatch` + 表头过滤弹层、`filter-values`）
- 合并单元格（`merge` 连续相同显示值行垂直合并）
- 子元素声明式通道（`<oas-table-column>` 声明列 + 嵌套多级表头，MutationObserver 同步）
- 单元格模板 `cellTemplate` / 自定义列头 `headerTemplate`
- 行内编辑校验 `validate`（提交前校验，失败保持编辑态 + 错误展示）
- core 新增 `ReactiveController` 能力注入协议
- tabs 纵向 nav 底线修复、table 列拖拽精确化、列过滤触发器 focus-visible 修复

### 验收

- 全量单测 3471 / typecheck / build / api:check / perf:size（table 31.2KB < 36KB 预算）/ perf:bench PASS
- table 页 e2e：a11y（axe 零严重违规）/ dark / visual / console 零告警 / smoke / code 全 PASS；qa-regression 列拖拽 PASS；light+dark 识图复核通过
- research 矩阵（component/scenario/capabilities）+ 生成物（demo-inventory/scenario-coverage/scenario-gaps）已同步；trace（变更区 + --all 全历史）0 命中

## v2.2.8 图标/form 收集/布局位置/注入安全 → 已发布

### 特性

- icons 新增 `form` 图标（文档框 + 表单横线，后台「基础表单」菜单用）
- oas-form `collectFields()` 覆盖常用控件（switch/date-picker/slider/rate/pin-input/dynamic-tags/transfer/combobox）+ `registerFormControl` 扩展钩子
- oas-layout 新增 `side` 属性（left/right/top）控制侧栏槽落位，顶部菜单可复用水平导航
- core 新增 `escapeHtml`/`escapeText`/`escapeAttr` 转义工具 + ui 统一 HTML 转义（5 组件）

### 修复

- oas-table 行点击忽略交互控件内点击（内嵌 popconfirm 原生自驱动，不再被重渲染销毁）
- oas-popconfirm emit ok/cancel 带 `detail.source`
- oas-avatar 首字符契约收敛（响应式 `text` 属性）

### 验收

- 全量单测 3482 / typecheck / build / api:check PASS
- oas-avatar/oas-table/oas-popconfirm/oas-form/oas-layout 组件单测全绿 + 浏览器实测
- ui-spec §组件合并验收清单加「HTML 注入安全」项（与 axe 并列）

## v2.2.9 布局组能力补齐 + table 合计范围 → 已发布

### 特性

- **布局组能力补齐三批**：
  - 排布四原语：grid `gap` 行列分离/span·offset 断点简写/order/justify·align/span=auto 自宽列；flex space-evenly/fill·fill-ratio/direction·gap 断点；container fluid/breakout
  - 交互容器：splitter vertical/collapsible（含 oas-collapse）/双击复位/lazy/slot=handle/像素 min-max/multiple 多面板；scroll-area 编程滚动四方法/scroll-shadow/stick-to-bottom/oas-end-reached+end-distance/RTL
  - 展示容器：masonry 响应式列数（断点简写）/gap 行列分离/fresh 持续监听尺寸/子元素 column 指定列；aspect-ratio 预定义 ratio token 六档（square/landscape/portrait/wide/ultrawide/golden）+ number 兼容；layout 职责边界注明（sider 折叠归 sidebar、viewport 覆盖 fixed 场景）
- **masonry items 数据驱动**：`items` JSON 数组渲染卡片流（显式优先于 slot，缺省/非法回落），字段 `{ text?, height?, column? }`
- **table 合计范围**：`summary-scope=all|page`（all 默认：分页切片前全量合计翻页不变；page 当前页小计）+ scope=all 聚合性能（全量 flat 记忆化 + 顺序无关聚合跳过排序）
- **docs**：组件分组侧栏与总览页按语义重构；首访语言适配（zh* 留中文、其余 /en/ 兜底 + localStorage oas-lang 持久化）；grid demo 色块 4 级主色梯度循环（相邻块可分辨）

### 修复

- **grid 单值 gap 真实生效**：applyGap 单值分支改「先清长hand再写简写」——原顺序在真实浏览器 CSSOM 下简写被长hand清空、computed gap 掉 0（CSR/DSD 两路径失效，happy-dom 不展开简写单测漏检；ssr-dsd 真水合布局稳定断言暴露）
- **e2e 基建**：Playwright 默认 locale 锁 zh-CN（首访语言适配后 en-US 被重定向英文页致批量落空）+ demo-coverage 缺口补全（avatar text / table multi-sort·filter-values·summary-scope 演示 + table 分页/过滤/列重排/列宽与 scroll-area 到底事件探针）

### 验收

- 全量单测 3589 / typecheck / build / api:check PASS
- 全量 e2e 1378 PASS（chromium 全量 + firefox 抽样 + docs-site）
- 浏览器实测：masonry 断点列数 4→1 切换/column 指定列落位/items 渲染、aspect-ratio token 比例实测（square 1.0/wide 1.78/golden 1.62）、grid demo 明暗主题色块梯度、table 合计 all 翻页恒定/page 小计

## v2.3.0 框架级容器能力补齐 + modal 命令式确认框 → 已发布

### 特性

- **config-provider 四通道**：`config` 组件级默认配置 JSON（core `readConfigValue`，首消费键 oas-button variant）/ `direction` 全局 RTL 注入（scroll-area 消费）/ `z-index` 浮层全局起始值（`calc(base + 层默认值)` 层序保持）/ `disabled` 全局禁用 + 双侧豁免（`disabled-skip` 单组件逃逸 + `disabledExempt` tag 整类豁免，23 个表单族组件消费）
- **oas-app**：`message`/`notification` JSON 全局默认配置（命令式 API 合并、调用优先）；宿主注册表栈式管理（嵌套 app 移除内层后外层自动接管）
- **oas-theme-editor**（无外部对照形态）：颜色函数值双通道编辑（自研 CSS 颜色解析器，rgb/oklch/color-mix 不再回落黑色）/ `importJson`+`exportCss` 闭环 / `preset` 三套内置预设 / 数字 token 滑块 / 组折叠+搜索过滤
- **modal 命令式确认框**：`modal.confirm/info/success/warning/error` + `destroyAllModal()`；异步 onOk 加载态（Promise resolve 关闭/reject 保持）；`{ close() }` 句柄、挂最近 oas-app 容器；组件扩 type/ok-text/cancel-text/no-cancel/focus-ok 五属性

### 修复

- **app 宿主注册表**：单槽位→栈式（嵌套 app 移除内层不再回退 body，外层自动接管）
- **table 行内编辑退出**：exitEdit 重画走 cellNode（尊重 render/cellTemplate 富内容）+ Esc 取消时 blur 误提交修复

### 验收

- 全量单测 3677 / typecheck / build / api:check PASS
- 全量 e2e 1380 PASS（chromium 全量 + firefox 抽样 + docs-site；含 axe/vue-prop-hijack/dark/visual）
- 感知对比度门禁 4558 元素采样 0 不达标（theme-editor/config-provider/app 页入清单）
- 浏览器实测 light+dark：variant 注入切换/RTL/z-index 层序 6080=5000+1080/message 全局时长/禁用双侧豁免/theme-editor 五件/modal 命令式全通；console 零告警
- research 同步：capabilities/floating 三件（29 源全量逐家实查）+ component-matrix 三行更正 + scenario-matrix Confirm 三缺口转 ✅ + run-all 生成物

## v2.3.1 table 可编辑单元格可感知线索 → 已发布

### 特性

- **table 可编辑单元格可感知线索**：此前只有 tabIndex + Enter/F2/双击三个不可见交互，用户无途径得知可编辑。新增 hover/focus-visible 淡底色（`--oas-color-bg-hover`）+ `cursor: text`（sticky 列不透明变体不透底、条纹/选中叠加有序、编辑中不适用）；铅笔编辑图标 hover 显现（复用库内 editPath，平时干净，编辑退出重挂）；`title` 双击提示（zh/en 本地化）。保持双击进入（单击会废掉文本选中复制）

### 验收

- 全量单测 3682 / typecheck / build / api:check PASS
- 全量 e2e 1382 PASS（含 qa-regression 真实 hover 断言：computed 底色变化 + cursor + 图标 opacity 0→1）
- 浏览器实测明暗主题 hover 铅笔可见；console 零告警

## 后续 backlog：独立组件条目（按需立项）

部分相邻形态与当前组件边界不同，拆分为独立组件域，按需立项：

### oas-float-button 浮动按钮家族

悬浮于页面或容器边缘的浮动动作按钮。关键能力：单个/分组/菜单三种模式（分组含展开方向、触发方式、受控展开）、链接化（href/target）、徽标集成（状态点/数字封顶）；back-top 为其「回到顶部」形态，现有 back-top 能力保持。

### oas-app-bar 应用栏

页面/工具区顶部的应用栏布局条。关键能力：可收起工具栏（collapse 汉堡收起/展开）、扩展区（extended 扩展内容插槽）、absolute/floating 背景与浮动形态等页头页框布局能力。

### oas-sidebar 侧边导航栏

可折叠成图标栏形态的侧边导航容器。关键能力：collapse 折叠/展开切换、折叠态图标栏（配 tooltip 提示）；menu 的 collapse 形态归属此条目。
