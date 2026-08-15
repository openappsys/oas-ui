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
- **anchor**：`items` 滚动定位、IntersectionObserver scroll spy、当前项高亮 ✅
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

## v2.0 能力补齐（进行中）

> 面向通用组件能力的补充与增强，与既有版本互不冲突。

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

### 验收标准

- 新组件与增强 demo 进文档站（中英双版），覆盖各属性/事件/边界
- tag-group 单选/多选/disabled 场景可交互并有可见反馈
- 单测 + typecheck + build + e2e 全绿
