# Changelog

所有显著变更记录于此。

## [未发布]

### 构建与性能

- **`@oas-ui/theme` 发布 CSS 最小化**：`index.css` 改为由 `index.source.css` 生成的无注释产物，保留源码文件与既有导出路径；实测 `index.css` 从 10,767 B / 3.8 KB gzip 降至 7,343 B / 1.7 KB gzip。
- **真实浏览器堆内存回归**：新增 Chromium CDP GC soak，覆盖 list / tree / kanban / scheduler 各 8 轮挂载/卸载；本轮实测堆增长为 0。Firefox 无 `performance.memory`，自动跳过该断言。
- **开发依赖安全升级**：同步升级 Playwright、Vitest、Vite、happy-dom 等开发依赖，并将 `@oas-ui/ssr` 的 happy-dom 与测试环境统一到 21.x，消除双版本 `Illegal constructor`；`pnpm audit --prod` 仅剩 VitePress 内置 Vite 5 的 dev server 告警（仅本地文档开发环境，CI/发布产物不暴露）。

### 功能

- **`oas-date-picker` 范围手输**：`daterange` / `datetimerange` / `monthrange` / `yearrange` 触发器由只读回显改为可键入，按 `separator`（默认 `~`）拆分起止；支持 `2026-08-05 ~ 2026-08-15`、`2026-08 ~ 2026-10`、`2024 ~ 2026` 与带时刻的 datetime 范围。起止倒置、越界、禁用日期或非法输入回退当前值，不提交；`datetimerange` 只键入日期时按 `default-time` 补齐时刻。
- **`oas-sidebar` 自定义行内容**：新增 `renderLabel` property 函数通道 `(item) => Node | string | null`，可把菜单项文字区替换为双行文本等富内容；返回字符串按纯文本渲染，返回 `null` 回退 `item.label`。函数不反射 attribute/不参与 SSR，可访问名称仍取 `item.label`，折叠态随文字区隐藏；行内不要放交互元素（整行本身是按钮，交互走 `actions`）。
- **`oas-barcode` 扩展至 10 码制**：新增 GS1-128（首部 FNC1，`|` 分隔字段，括号仅分组）、UPC-E（6/7/8 位，按末位规则展开并补校验位）、Codabar（A–D 起止符）与 MSI（纯数字基础码）；`format` 新增 `gs1-128` / `upce` / `codabar` / `msi`，非法值仍回退 `code128`。补齐编码单测、组件渲染/e2e 覆盖与 zh/en 文档。

### 交互

- **`oas-gantt` / `oas-resource` 文本可选中复制**：任务名、资源名与条标签恢复 `user-select: text`，支持鼠标划选/复制；`oas-gantt` 行拖拽改由右侧重排手柄承载（细指针悬停/聚焦显形，粗指针常显），避免行重排与文本选择互相抢占；`oas-resource` 条标签点击仍冒泡到任务条。新增 Chromium/Firefox 真实拖选回归。
- **`oas-resource` 负载直方图上方分隔线缺失**：`.row:last-child` 把最后一条资源泳道的底边也清掉了，导致直方图标题行上方断线；补回最后泳道底边并加几何回归。

## [2.6.2] - 2026-10-19

### 破坏性变更（迁移）

- **玻璃静态边缘折射移除**：`--oas-glass-refraction` 不再定义，也不再有组件消费。宿主若曾覆盖该变量或依赖 Chromium 独有的边缘外扩/锯齿效果，请删除覆盖；磨砂玻璃基线保留半透明 surface、backdrop 模糊、折光边、阴影和指针动态高光。`glass.css` / `glass-fluid.js` 路径及其余 `--oas-glass-*` 变量不变。
- **对外命名调整**：文档中的“液态玻璃”统一为“磨砂玻璃（Frosted Glass）”，避免与 Apple Liquid Glass 混淆；组件 tag、文件名、CSS 变量和公开 API 不变。

### 特性

- **`oas-gantt` 行斑马纹（`stripe`，默认关）**：按**绝对行号**奇偶给行加底色（虚拟化/窗口化滚动稳定），颜色走新 token `--oas-gantt-row-stripe-bg`（缺省 `--oas-color-bg-hover`）；选中/周末假日等背景覆盖条纹。任务优先级色继续用 `GanttTask.color`（任务条/进度底色）。
- **`oas-kanban` 优先级强调色（`cards[].color` / `columns[].color`，可选）**：仅渲染 3px 强调条（卡片左侧竖条 / 列头顶部横条，逻辑属性 RTL 镜像），不整卡/整列上色、不改变布局；缺省零视觉变化。
- **磨砂玻璃暗色档可感知性**：暗色下 `--oas-glass-ring` / `-sheen` / `-press` 与模糊强度重新标定（高光仍低于浅色档），修复深色背景上边缘高光与透光层次几乎不可见；亮色档不变，`high-contrast` 仍不启用，文字对比度门禁保持。
- **磨砂玻璃（Frosted Glass）命名与降低透明度**：对外文档/画廊/README 将“液态玻璃”统一为“磨砂玻璃（Frosted Glass）”，避免与 Apple Liquid Glass 混淆；文件名与 `--oas-glass-*` API 不变。新增 `prefers-reduced-transparency: reduce` 回退：实心 surface、关闭模糊/折光边/动态高光，保留圆角与阴影。
- **框架接入指南**：新增 `guide/frameworks`（zh/en），集中说明 React 19 原生事件写法、`@oas-ui/react` hooks 的定位与限制、Vue/Nuxt 的 `isCustomElement` 配置、复杂 property/布尔属性/SSR 常见坑；不新增 wrapper 包。
- **`oas-message-scroller` 可见性通道改用 IntersectionObserver**：`track-visible` 不再在每次 scroll 逐行读取 `getBoundingClientRect()`；进入/离开视口写 `data-visible`，仅在交叉变化时重算 `visibleMessageIds` / `currentAnchorId` 并派发 `oas-visible-change`。无 `IntersectionObserver` 的环境自动回退 rect 计算。
- **`oas-button` 补 `formenctype`**：原生表单提交代理支持 `formenctype`（覆盖表单 `enctype`），与 `formaction` / `formmethod` / `formnovalidate` / `formtarget` 同通道转发。
- **真实浏览器规模与生命周期回归**：新增 Playwright `scale-perf`，覆盖 table 10 万行首渲染/滚动帧/DOM 上界、gantt/resource 大数据预算、message-scroller 500 行可见性滚动，以及 overlay 反复挂载/卸载的 document/window 监听净增长；不依赖 happy-dom 计时。

### 修复

- **coarse-tap 监听在 SPA 重挂时重复绑定**：`hover-card` / `tooltip` / `dropdown` 调用 `bindCoarseTap` 后未在 `onCleanup` 执行返回值解绑，重复挂载会叠加 `pointerup` 监听；现解绑并清空引用，补三组件回归。
- **玻璃静态边缘折射移除（跨浏览器一致性）**：`filter: url("data:image/svg+xml,...#id")` 在 Chromium 执行、Firefox 不执行，导致同一组件出现轮廓锯齿与视觉尺寸分叉。移除全部控件上的静态折射与 `--oas-glass-refraction`，保留半透明 surface、backdrop 模糊、折光边、阴影和指针动态高光；组件尺寸/命中区完全由布局决定。API 文档同步删除该变量。
- **`glass-fluid.js` 跨模块单例**：运行时所有权挂 `globalThis`，bundle 与 CDN / 多包各持一份时后续实例的 `startGlassFluid` / `stopGlassFluid` 委托首实例，避免 `pointermove` 监听与注入样式表翻倍；单实例行为不变。
- **`oas-switch` 玻璃态锯齿/膨胀**：关闭 switch 的位移折射滤镜（保留玻璃 surface 与高光），修复 18px 轨道/把手在 Chromium 被位移成锯齿轮廓、并因外扩显得比 Firefox 更高更胖的问题；开关恢复与布局盒一致的尺寸。
- **磨砂玻璃画廊明暗切换失真**：切换器改为全站主题，不再只给舞台写 `data-theme`——后者会让基础 dark token 覆盖玻璃 surface，暗色卡片变成不透明 `#3f3f46`、玻璃透光丢失；新增回归断言暗色卡片保持半透明。
- **SPA 客户端路由下 scheduler / gantt / resource demo 空白**：① 私有成员与单字属性撞名（`scale`/`view`/`expanded`），框架按「key in el」把静态 attribute 写成 property，own 字符串遮蔽方法或 Set 字段导致报错/空白；内部改名（`scaleMode`/`viewMode`/`expandedSet`，公开 API 不变）。② 数据属性的 property setter 统一接受 JSON 字符串（`events`/`resources`/`tasks`/`lines` 等），框架把静态 attribute 当 property 写入时不再被当作非法数组清空。新增 `shared/json-array` 与客户端跳转回归（表格 → 日程 → 甘特 → 资源）。
- **SPA 路由下 card demo 空白/崩溃（`shadow` 属性与基类字段撞名）**：`shadow` 既是卡片阴影属性（`always`/`hover`/`none`），也是 `OASElement` 内部的 ShadowRoot 字段；框架按「key in el」把静态 `shadow` attribute 写成 property 时，字符串覆盖真实 root，后续 `this.shadow.querySelector` 抛错中断渲染。现以原型访问器分通道：字符串写回 attribute；`null` / `undefined`（受控表达式转假）移除 attribute 回缺省无阴影态；仅 ShadowRoot（或带 `querySelector` 的对象）落入内部存储；其他异型忽略并 dev 告警一次——属性、渲染与事件路径不再被污染。
- **布尔 `open` 属性经框架 property 通道写入空串被误判关闭（`oas-select` / `oas-swipe-cell`）**：静态 `<oas-select open>` / `<oas-swipe-cell open>` 在宿主框架下以空串 `''` 写入 property，旧 setter 用真值判断将其当成关闭；现按 presence 语义处理——空串视为打开，仅 `false` / `'false'` / `null` / `undefined` 关闭。
- **`collision-guard` 守卫扩展到基类成员**：源码级撞名检查在组件自身成员之外合并基类实例成员（`OASElement`；表单组件含 `OASFormElement`），attribute 的 camelCase 名撞基类方法/字段/只读访问器时同样报红；`static` 块内经 `Object.defineProperty(this.prototype, ...)` 安装的 get/set 遮蔽纳入识别（设计内 property 双通道豁免），并补「撤掉 card 遮蔽必红」的反证用例。
- **数据属性通道修复（虚拟化 / 跨组件防护强化）**：
  - **`oas-index-bar` `sections` property 通道**：补 getter/setter（运行时接受分节数组或其 JSON 字符串，归一后回写 `sections` 属性）；连接前已被写成 own property（字符串/数组）时在 `connectedCallback` 删除 own 并回收到访问器，修复 SPA 跳转后索引栏空数据（私有字段改名 `sectionsData` 防同名遮蔽）。
  - **多值表单控件 `value` property 字符串容忍**：`oas-cascader` / `oas-select`（multiple）/ `oas-toggle-group`（multiple）/ `oas-slider`（双值）/ `oas-tree-select`（multiple；单选对象字符串同样归一，label-in-value 多选保留树外对象 label 回显）/ `oas-combobox`（multiple）——框架把静态 `value` JSON attribute 写成 property 字符串时先 JSON 归一，不再整串当单值（数组双重编码）或 `Number('[...]') → 0`（slider 双值丢失）；`oas-virtual-list.items` 的 connectedCallback 回收分支同时覆盖 JSON 字符串（此前只回收数组）。
  - **`oas-menu` items 双通道统一（结构过滤 + property 字符串容忍）**：attribute / property 的 items 走同一 `sanitizeMenuItems`（非对象、字符串项、既无 `value` 又无 `label`/`href` 的普通项不渲染；有 `label` 或 `href` 的免 `value` 项保留）；property 通道收到 JSON 字符串先解析为菜单数组，非法 JSON → 空菜单 + devWarn 一次——修复框架把静态 `items` attribute 写成 property 字符串时被当异型丢弃或逐字符渲染成垃圾菜单项。docs-nav 回归补 menu 客户端跳转断言（项数合理）。
  - **`oas-splitter` `sizes` property 通道**：新增 getter/setter（接受百分比数组、文档的逗号分隔写法或其 JSON 字符串，归一总和 100 后写回 JSON attribute）；内部字段改名 `sizesData` 防同名遮蔽，连接前被写成 own property 时回收进 setter，非法/空输入保留既有受控 attribute 并 devWarn 一次；getter 以 attribute 为真源，面板数不匹配回落均分时不再返回与 attribute 矛盾的陈旧值。
  - **`oas-gantt` 排程与窗口化收口**：依赖 `lag` 安全域由 1e15 ms 收紧到 1e12 ms（约 11574 天）并补属性通道越界 devWarn；`writeStartKeepingDuration` 增加写回域守卫（结果无法被 `parseTaskDate` 回读则跳过，防 5 位年份导致 `el.tasks = el.tasks` 静默丢任务）；`auto-schedule` 属性通道事件序统一为 `oas-reschedule → oas-tasks-change`；windowed 切片越界（`window-start + 装载数 > total`）devWarn 一次；行位 ARIA 改回 `treeitem` 合法属性（`posinset`/`setsize`/`level`），移除容器 `aria-rowcount` 与行 `aria-rowindex`。
  - **`oas-table` 横向滚动回锚**：滚动帧重建前保存/恢复 `scrollLeft`，回锚用 `focus({ preventScroll: true })` 且不调 `scrollCellIntoView`——修复 `grid-navigation` 下每帧横向滚动被拉回锚点格（`scrollLeft` 恒 0）。
  - **`oas-scheduler` 当前时间线刷新手势守卫**：每分钟 `show-now` 刷新在拖拽/创建手势进行中跳过整视重建，避免拆掉 pointer capture 导致手势中断。
  - **`oas-bubble` 继承对齐 rAF 单飞**：`syncInheritedAlign` 的下一帧复读改为实例级单飞（同帧多次 update 复用同一帧），断开连接时取消未决帧，避免重复 `getComputedStyle`。
  - **门禁覆盖强化**：`vue-prop-hijack` 契约表扩展到全部数据属性组件页（tree/chart/kanban/calendar/list/scheduler/table/gantt/resource/splitter/virtual-list），attribute 通道以同路由 SSR 静态 HTML 为基线**逐实例**比对缺失（防部分实例被劫持的聚合漏判），property 通道改为逐实例 setter/own property/渲染断言；新增 `qa-regression/windowed-a11y.spec.ts` 覆盖 gantt/table/tree/list/resource 虚拟化行位 ARIA + axe（wcag2a/2aa/21aa）critical/serious 零容忍。
- **其余数据属性 property setter 字符串容忍补齐（rate / list）**：SPA 跳转下框架把静态 JSON attribute 写成 property 字符串——`oas-rate` 的 `colors` / `icons` property 收到字符串曾被当异型丢弃而属性通道又没被写，配置整体失效（现解析生效，非法 JSON 回落属性通道）；`oas-list` 的 `data` property 同口径（公开类型仍为数组，与 gantt/resource 一致）。docs-nav 回归补 rate（colors/icons 生效）客户端跳转断言。
- **布尔属性 property 通道与数字 ID 数据补齐（ellipsis / image / number-animation / speed-dial / upload / tree-select / tree / index-bar）**：
  - **`oas-ellipsis` `expanded` / `oas-image` `preview-open` 布尔属性 property 通道 + 空串语义**：私有布尔字段与同名属性撞名，框架按「key in el」走 property 赋值时写入实例字段、属性通道整体失效。改为 getter/setter 写回同名属性，并按 presence 语义处理——静态 `<oas-ellipsis expanded>` 经框架 property 通道写入的是空串 `''`，空串必须视为 true（`!!value` 会 removeAttribute 导致失效/水合收起），`false` / `'false'` 关闭。
  - **`oas-number-animation` `from` / `oas-speed-dial` `geometry` / `radius` 属性-字段撞名**：私有字段改名（`fromValue` / `geometryMode` / `radiusValue`）并补 property 通道写回同名属性（非法值由渲染合法化回落缺省），框架 property 写入不再被 own 字段遮蔽而静默失效。
  - **`oas-upload` `listType` getter-only 崩溃**：`listType` 曾是私有只读 getter，Vue/React 桥接按「key in el」写 property 时抛「only a getter」TypeError 中断渲染；补 setter 写回 `list-type` 属性（非法值渲染时回落 list，行为不变）。
  - **`oas-tree-select` / `oas-tree` 数字 ID/key 节点**：树数据 id 常为后端数字主键，但 tree-select 的 options 解析按 `typeof !== 'string'` 把数字 id 节点整体丢弃、节点访问器 idOf 对数字返回 ''（tree 同款）——而 value/checked/expanded 通道早已数字 String() 归一，值进得来、节点却不存在。现数据入口与节点访问器统一数字 String() 口径：数字 id 节点正常渲染、可选中/勾选/展开级联、预设数字值回显节点 label；字符串行为不变。
  - **`oas-index-bar` sections 回收首帧误派 oas-change**：连接前被框架写成 own property 的 sections 在 `connectedCallback` 回收进 setter 后触发第二次 update，把首帧高亮初始化误判为用户切换并派发 oas-change；回收时重置首帧标记（回收等价初始渲染，不派发事件）。
- **`oas-table` 导出文件名方法收为内部 API**：`generateExportFileName()`（原公开名 `exportFileName()`）改为内部方法，不再出现在公开类型——公开方法名与 `export-file-name` 属性的 camelCase property 桥接同名冲突（宿主写该属性会遮蔽方法）。自定义导出文件名走 `export-file-name` 属性或 `exportData(format, { fileName })`，行为不变。
- **`oas-table` windowed 切片回填后焦点丢失**：update / 滚动帧清空 tbody 会连带拆掉聚焦单元格，宿主回填新切片（`window-start` / `data` 变化）后焦点静默丢失且 `gridPos` 还是旧渲染矩阵坐标。修复：重渲染前记录聚焦行的**绝对行键**（row-key 值，缺失回落绝对行号）与列，重渲染后该行仍在新窗口内则恢复焦点并把 `gridPos` 重映射到新矩阵坐标；已不在窗口内则不强行聚焦（不回退切片首行）。`oas-window-request` 派发行为不变。
- **`oas-table` 非 windowed 虚拟滚动帧 O(总数据)**：滚动回调曾每帧重跑过滤切片（`computeDisplayRoots`）、全量可见性过滤（`visibleFlat`）与数据行序前缀扫描。修复：展示集（visibleFlat 结果 + 序号前缀 + 数据行数）按「数据/排序/筛选/分组/展开/分页/列」签名缓存，滚动帧只做窗口切片（windowed 同走缓存，行为不变）；新增内部诊断计数 `visibleBuilds` 锁定滚动帧零全量重建。
- **`oas-list` windowed `window-start` 越过 `total` 不夹取**：夹取到全量末尾渲染并 devWarn 一次（对齐 table 的切片越界告警契约）——不夹取会按越界绝对行号铺 spacer，顶部占位撑出 `total×rowH` 之外的巨量空白。
- **`oas-list` 迁移后宿主动态 aria-label / aria-labelledby 不同步**：角色迁移会把可访问名称从宿主移除，此后宿主框架随状态更新把同名属性写回宿主元素时行容器停在首次迁移的旧值。修复：记住 label 迁移来源并随宿主属性变更继续同步到行容器（宿主清空绑定时保留行容器既有名称，不制造未命名 listbox）。

### 特性 · 数据规模与窗口化

- **数据密集型组件规模化（行窗口协议）**：新增共享契约 `shared/window-data.ts`（`oas-window-request` 事件名、`{start,end,reason}` 半开绝对区间、±8 行缓冲、覆盖/去重工具）——`windowed`（布尔）+ `total`（全量行数）+ `window-start`（`data[0]` 绝对行号）三属性的统一语义，宿主只喂可视窗口切片即可支撑十万行级数据。
- **`oas-table` 服务端行窗口模式**：`windowed` + `total` + `window-start` → 组件不持有全量数据，按可视行窗口派发 `oas-window-request` 由宿主回填；本地排序/筛选/分组/分页/树形展开交由宿主（跳过本地执行并 devWarn），行的选中/编辑/点击等按行能力在已装载切片上正常。
- **`oas-resource` 纵向行虚拟化**：资源泳道与负载直方图行按可视窗口渲染（上下 spacer 撑起总滚动高度，滚动位置与 sticky 名列不变），行进出窗口按资源 id 键控增删（聚焦条不重建）；与既有列虚拟化正交。
- **`oas-kanban` 列体卡片虚拟化**：单列大量卡片时按可视窗口渲染（复用 `dynamic-height` 内核支持动态卡片高），上下占位撑起列滚动范围；列头计数/WIP 按全量、拖拽落点用绝对位次、滚动重建后回焦同卡；`overflow-anchor: none` 防锚定放大。
- **`oas-gantt` / `oas-resource` 服务端窗口模式**：`windowed` + `total` + `window-start`（切片绝对行号）→ 组件不持有全量数据，按可视行窗口派发 `oas-window-request` 由宿主回填；新增 `range-start` / `range-end`（宿主托管时间轴范围，切片不含完整日期跨度时必用）与 `oas-range-request`（可视时间窗接近轴端时派发）。windowed 下 gantt 的 `auto-schedule` / 关键路径在部分数据上会算错，跳过并 devWarn。
- **`oas-scheduler` 虚拟化**：资源视图按可视行窗口渲染（spacer 守恒总高，`.res-row` 键控），时间轴（小时轴）刻度与事件块按窗口 ±buffer 渲染（gutter/track 总高守恒，跨窗长事件保留）；滚动 rAF 合帧、窗口未变跳过重建、手势进行中抑制重建（避免销毁 pointer capture）。修复资源视图「滚动跳回顶部」：原先在清空 DOM 后才读 `scrollTop` 被浏览器钳回 0，现改为先算窗口再重建。
- **增量渲染（选择/汇总不重算全量）**：`oas-table` 仅选择变化时不再重跑扁平化（按输入签名缓存）与汇总（值缓存），只 patch 受影响行的选中态/复选态（行节点身份保持；顺带消除无汇总配置时的冗余全量遍历）；`oas-gantt` 选择变化走正式增量路径（复用缓存的 rows/units/关键路径，只 patch 窗口内行/条选中态；行 id→下标索引把行点选/Shift 连选/相邻键盘定位从 O(总量) 降为 O(1)）。修复单选档 radio 选中态（去 `preventDefault`+微任务，改监听器内同步写终态）。万行连选 20 次为「只 patch、不重算不重建」的常数级开销（虚拟窗口下为 O(窗口)）。并行修复：`oas-kanban`/`oas-scheduler` 滚动帧的 O(总量) 扫描改一次性索引（卡/事件按列/资源分桶）；`oas-table` 开启 `grid-navigation` 时行/格点击被吞（`[role]` 通配误伤 `gridcell`）；`:root`/组件文档补 windowed 前提（`height`、扁平行、`total` 双语义、越界 devWarn）。
- **`oas-tree` / `oas-list` 接入服务端窗口协议**：`windowed` + `total` + `window-start` + `oas-window-request`（tree 为**根节点切片**：子节点随根携带、`lazy` 不变；list 为行切片）。a11y 补全：tree 根节点 `aria-setsize=total` / 绝对 `aria-posinset`（子节点为同级已装载数）、选择态同步 `aria-selected`；list 行 `aria-setsize`/绝对 `aria-posinset`（按行角色合规门控）。tree 在切片内保持展开/选择/懒加载；list 在 windowed 下禁用本地拖拽重排。
- **`oas-kanban` 预估卡片步长可配置**：新增属性 `card-estimate`（px，默认 68）与兜底 CSS 变量 `--oas-kanban-card-step`（属性优先）；未实测卡片占位/滚动总高按该步进估算，`ResizeObserver` 实测后自动收敛。
- **`oas-resource` 可读性开关（opt-in）**：`show-load-values`（负载柱顶数字，超载档用 danger 色）、`show-overload-badge`（行头「超载 N 档」徽标）、`bar-label`（条内任务名，单行省略）；`day` 档刻度按列宽自动抽稀（`i % step` 稳定抽稀，网格线保留，周/月档不变）。新增 i18n `resource.overBadge` ×10。`resources` 支持可选 `color`（CSS 颜色或 token）：该泳道的任务条与负载柱按资源着色（缺省走统一 token）；官方组合示例的卡片色点与泳道同源配色。泳道表头纵向吸顶（默认开，滚动泳道时周/日刻度保持可见；`header-sticky="false"` 可关闭），角落名列在横向滚动时保持贴边（LTR/RTL）。
- **官方「资源管理」组合示例**：文档站新增指南页，用 `oas-resource` + `oas-card` + `oas-checkbox` + `levelResources()` 搭出「资源卡 + 任务分配表 + 泳道/负载 + 一键平衡/重置 + 后移天数反馈」的完整页面（卡片与分配表属宿主层，非新组件）。
- **窗口化收口修复**：`oas-tree` windowed 下本地 `filter` / `check-all` 禁用并 devWarn、键盘到切片边界派发窗口请求、回填时按锚点补偿滚动、aria 按可见集/绝对口径夹取；`oas-list` windowed 需可测视口（无 `height`/`max-height` 时不请求并 devWarn）、列表语义改为组件在 shadow 行容器自行落位（宿主无需设 `role`；分组头 `presentation`，axe 零违规）、无视口不铺巨量 spacer；`oas-kanban` 程序化跳滚（`scrollTo`/滚动条甩动）改为滚动事件内同步重算窗口（消除一帧空白/滞后）；`oas-table` 暗色选中行底色改单点 token（`color-mix`，暗色对比由约 1.2 提升到约 2.1）。

- **`oas-scheduler` 资源视图**：新增 `view="resource"`（单日资源时间轴：行为资源、横向为小时）与 `view="resource-week"`（周 × 资源矩阵：行为资源、列为本周 7 天，格内按时刻纵向排布定时事件）。新增 `resources` property / attribute（`SchedulerResource[]`，`[{ id, title, color? }]`）与事件字段 `SchedulerEvent.resource`——缺省或指向未知 id 的事件归「未分配」行。
- **`oas-scheduler` 拖拽创建**：在 `week` / `day` / `resource` 视图的时间格空白处按住拖出 ≥15 分钟区间，派发 `oas-create { date, start, end, resource? }`（组件不自动建事件，宿主接后自行 `addEvent`）；位移不足视作点击，派发 `oas-day-click`（detail 增 `resource`）。`Esc` / `pointercancel` 取消且不派发。
- **`oas-scheduler` 当前时间线**：新增 `show-now`（默认开）——今天所在的时间视图与资源单日视图在当前时刻渲染 now 线，每分钟刷新；`show-now="false"` 关闭。
- **`oas-scheduler` RTL**：资源视图改用逻辑定位（`inset-inline-start`）+ `data-rtl`，RTL 下时间轴与资源列镜像；拖拽创建命中判定随方向翻转；`dir` 补入 `observedAttributes`，运行时切向即时重判定。
- i18n ×10 新增 `scheduler.viewResource` / `scheduler.viewResourceWeek` / `scheduler.unassigned`；文档 zh/en 资源视图节（含 RTL demo）；api-manifest / api-descriptions 同步。

### 特性 · `oas-gantt`

- **基线对比**：`GanttTask` 增 `baseline?: { start, end? }`（宿主保存，组件只读）；`show-baseline`（默认关）开启后在实际条下叠浅色基线条，条的 `title` 标差值（比基线晚/早 N 天、或「与基线一致」）。基线条颜色走 `--oas-gantt-baseline-color`。
- **行拖拽改父子 / 重排**：拖左侧名称行到目标，改 `parent` 与同级顺序；落点三档（上半区=目标前 / 下半区=目标后 / 指针深入右侧=成为目标子级），带落点指示线；不允许拖进自身后代（防环）；`readonly` / 任务级 `disabled` 不启动；`Esc` / `pointercancel` 取消。派发 `oas-reparent { id, parent, index }` + `oas-tasks-change`。
- **依赖连线交互编辑**：悬停任务条出连线点，拖到目标任务建依赖（端点定 FS/SS/FF/SF，记在后继任务）；点已有连线选中（高亮），`Delete` / `Backspace` 删除（仅组件持有焦点时响应，不劫持宿主输入）。同源同型去重、同源多型可并存，删除按类型作用域。派发 `oas-dependencies-change { taskId, dependencies }` + `oas-tasks-change`。`readonly` 不渲染连线点与命中区。
- `disabled` 语义：只锁自身数据（不可被拖、不可作依赖后继、不可作重排 drop-inside 目标）；可作他任务前置与重排前/后同级目标。
- 工程：`sanitizeDeps` 同源同型去重；`barUnder`/`oas-reparent` 命中与 RTL 端点修正；`svg.links` 命中外层 `.bars` 放行（`pointer-events`）；`onReconnect` 重挂 document 监听；i18n ×10 新增 `gantt.baselineLater` / `gantt.baselineEarlier` / `gantt.baselineSame`；文档 zh/en 三节 + demo；api-manifest / api-descriptions 同步。
- **拖拽自动滚动**：拖条 / 拉伸 / 拖连线靠近视口边缘时横向与纵向自动滚动（越靠边越快、到边界即停）；行重排仅纵向。自动滚动触发的窗口重建后自动重锚进行中的拖拽（条 / 连线临时线 / 落点线）；RTL 横向按负值 `scrollLeft` 模型分域；条拖拽位移叠加滚动增量（指针静止也能把条拖出视口）。
- **里程碑单连线点**：里程碑 start == end，只渲染完成端单点（fs 惯例；其作为前置的 ss/sf 与 fs/ff 等价）。
- **行重排命中缓存**：`reparentCtx` 在拖拽起点建一次 `id→task`，移动期复用（万级不再每帧 O(n)）。
- **多选与批量**：点击行选中（`Ctrl`/`Cmd` 加选、`Shift` 连选）；新增 `selection` property（`string[]`，可读写）与 `oas-selection-change { ids }` 事件；`removeTasks(ids)` 批量删除（连同后代），删除时清洗其他任务的悬空依赖并对受影响后继补发 `oas-dependencies-change`；`Delete`/`Backspace` 删所选（跳过 disabled）。`readonly`/`disabled` 下仍可选中（选择属查看态）。
- **行内重命名**：双击名称就地编辑（`Enter` 提交 / `Esc` 还原 / 失焦提交），改 `name` 并派发 `oas-tasks-change`。
- **键盘可达与触屏入口**：行聚焦后 `↑/↓` 移焦、`空格` 选择、`Alt+↑/↓` 同级移动、`Alt+→` 降级、`Alt+←` 升级、`F2` 重命名；连线命中路径改为可聚焦 `role=button`（`Enter`/`Delete` 删该依赖，`svg.links` 去 `aria-hidden`、可见线 `aria-hidden`）；触屏点任务条揭示连线点。i18n ×10 新增 `gantt.rename` / `gantt.linkDelete`。
- **任务管理创作能力**：命令式增删改方法 `addTask(task?, opts?)`（返回新 id）/ `moveTask(id, { parent?, index? })` / `duplicateTask(id, opts?)`（深拷贝子树）/ `addDependency` / `removeDependency` / `updateDependency` / `updateTasks(patches)`（批量浅合并，返回生效条数）——写回统一走清洗层，派发既有 `oas-tasks-change` / `oas-reparent` / `oas-dependencies-change`，新增 `oas-task-add { id, task }` 事件；属性 `creatable`（默认关）行内新建（行尾「＋」+ 双击空白按日期建，新建后进入重命名）；`zoomIn()` / `zoomOut()` / `fit()` 缩放。i18n ×10 新增 `gantt.addTask` / `gantt.addChild` / `gantt.newTask`；文档 zh/en 增「任务管理」段（含 `oas-modal` + `oas-form` 详情编辑示例）。
- **任务管理增强**：`auto-schedule`（布尔，默认关）依赖联动排程——日期变更或依赖增改后按 FS/SS/FF/SF 沿依赖图对后继做最小前推（只推迟、保持工期、多前置取最靠后、跳过 disabled 与摘要、成环跳过并 `devWarn`），派发 `oas-reschedule { ids }`；框选多任务（左侧列表行带 / 时间轴条相交，`Ctrl`/`Cmd` 追加，只读可用）；`creatable` 下时间轴空白拖出区间建任务；`Esc` 取消框选/建任务手势。
- **排程深化**：依赖 `lag/lead`（`GanttDependency.lag` 天、可负，并入 `auto-schedule` 四型约束）；关键路径（`show-critical-path` 默认关，以当前排期为基准反向推最晚时间算总时差，零时差任务加 `.critical` 高亮，颜色走 `--oas-gantt-critical-color`）；i18n ×10 新增 `gantt.lagSuffix` / `gantt.leadSuffix`。另：负总时差（违约）标 `.conflict`（虚线描边，`--oas-gantt-conflict-color`）；连线非 0 lag 渲染可见标签；文档新增「宿主集成配方」段（撤销重做 / 编辑弹窗 demo / 导出 demo）。
- **排程约束与工作日日历**：任务约束 `GanttTask.constraint`（`asap`/`snet`/`mso`/`fnlt`）+ `constraintDate`（auto-schedule 生效：snet 下限 / mso 固定 / fnlt 软截止；约束违反在 `show-critical-path` 或 `auto-schedule` 开启时标 `.conflict`（日精度约束按日历日比较；mso 与依赖冲突标在 mso 自身；摘要约束忽略并告警））；工作日日历 `workdays`（JSON 周几，opt-in）+ `holidays`（假日恒为非工作日），前推落点吸附下一工作日。工程修正：`updateDependency` lag 归零删键；依赖图 SCC 分解——仅环内节点让位（排程与关键路径均只跳过环内），关键路径改拓扑序 O(V+E)；示例补 lag 数据。
- **时间轴列虚拟化（横向窗口）**：在既有行窗口之外新增列窗口——长跨度（day 档跨约 10 年 ≈3650 列）时表头刻度（主/辅）与周末/假日底色只渲染可视窗口 ±overscan，任务条沿用行窗口（不按 x 再裁，行为不变）；`.inner` 画布宽保持 `列数×列宽`，滚动范围与 `xOf`/镜像坐标数学不变。滚动改 rAF 合帧（同帧多次 scroll 只重渲染一次，拖拽自动滚动在合帧后重锚），卸载时取消未决帧；`syncHeaderOffset` 平移基准不变；主刻度分组预计算 + 二分渲染（不再逐帧全列扫描）；容器尺寸变化（变宽/变高）经 ResizeObserver 自动补窗口，命令式 `scrollToDate` 返回即出目标窗口并对齐表头。渲染节点与数据总量解耦（万行 × 千列下 DOM 有界）。另修 `height` 属性此前在真实浏览器无效（现映射到 `--oas-gantt-height`；宿主自身 `height` 内联只框定外盒、不拉伸内部画布；**非法值不覆盖宿主 token**——空串/空白按未设置、非法值不写变量、仅清本实例此前自写值）。`oas-resource` 的 `height` 同协议统一（非法值同样不覆盖宿主 token；resource 高度在 `:host` 规则上，宿主内联 `height` 可直接拉伸）。

### 特性 · `oas-resource`

- **`oas-resource` 资源负载 / 泳道视图**（新组件，data 族）：`resources`（含 `capacity`）+ `tasks`（含 `resources` 分配）→ 资源泳道（共享时间轴）+ 负载直方图（超载高亮）；事件 `oas-overload` / `oas-task-click` / `oas-tasks-change`；方法 `scrollToDate`；纯函数 `levelResources()`（保工期、只延后、不自动回写）；i18n ×10（`resource.*`）；文档 zh/en 新页。
- **时间轴列虚拟化（横向窗口）**：`.scroller` 滚动驱动 rAF 合帧的列窗口——刻度与负载直方图列按窗口切片，泳道内任务条按窗口像素相交裁剪（保留 overscan 与最小条宽），画布宽保持 `period 数×列宽`；`scrollToDate` 命中后同帧出窗口；首列分隔线判据由 `:first-child` 改为 period 索引 0（窗口化下 DOM 首元素未必是轴首列）。另：负载矩阵由「资源 × period × 任务」三重循环改为单趟归档 + 二分区间累加（`O(Σspan) + O(S·log P)`），输出逐字节一致。

### 特性 · `oas-chart`

- **x 轴标签自动抽稀**：标签密集（估算标签宽 + 间隙 > 实际间距）时按步长 k 抽稀渲染（每 k 个渲染一个，端点有空间时保留），不再叠成一团；不密集时步长 1 行为不变。宽度以 user 单位估算（SVG 等比缩放比例不变）：CJK 记 1em、其余记 0.55em。
- **柱组水平居中于分类 band**：修正折线点看似落在柱右缘的对位偏差（band 内居中取点）。
- **`options.xLabelRotate`（0–90）**：x 轴标签旋转，与自动抽稀可组合。
- **密集分类 demo**：36 天日请求量演示抽稀效果。
- **文档与 API 语料同步**：chart 页 zh/en 补抽稀与 `xLabelRotate` 说明（API 表走 api-descriptions 语料生成）。
- **指南页「服务端窗口取数」（guide/windowed-data）**：分段 / 取消 / 合并 / 原子回填的取数模式讲解 + gantt / resource 可运行 demo（时间轴托管范围 + range 请求扩轴）与 React / Vue 封装示例；组件页交叉链接。

### 工程

- **大数据规模回归**：新增 `qa-regression/scale.spec.ts`——gantt 万行 × 约 3650 列、resource 5000 任务 × 1096 period 的渲染节点上界 + 中部可见覆盖 + 数据量翻倍对照，锁定「节点数不随数据总量线性增长」。

## [2.6.1] - 2026-10-13

### 破坏性变更（迁移）

- **内置图标集改为 opt-in（按需引入需显式注册）**：内置图标全量集从组件链解耦，按需引入单组件链不再自动携带整套图标（体积收益：button 链 34.1→25.0、table 101.6→93.2 KB gzip）。
  - **不受影响**：全量引入 `import '@oas-ui/ui'`（含 CDN）——已自动注册内置集，行为不变。
  - **需迁移**：**按需引入单个组件**（如 `@oas-ui/ui/basic/button`）且使用**内置图名**（`<oas-button icon="check">`、`<oas-icon name="close">`、table/menu 等的 item `icon`）时，追加一次 `import '@oas-ui/icons/register'`（应用入口一次即可）；否则该图名不渲染（静默空态）。
  - **无需引入**：仅用 `registerIcon()` / `registerIconLibrary()`（远程 / sprite）/ iconfont / slot 提供图标时。
  - 另：`@oas-ui/icons` 主入口不再导出 `iconRegistry` / `iconNames`（内部数据，改从 `@oas-ui/icons/registry` 引入）；`IconName` 类型与注册/查询 API（`registerIcon` / `registerIconAlias` / `registerIconLibrary` / `lookupIcon`）仍从 `@oas-ui/icons` 导出。

### 特性

- **新增组件 `oas-collapsible`（data 族，紧跟 collapse 的 `data/collapsible/`）** —— 无容器、自管理的单面板展开收起原语，面向文件树节点、折叠表单分区与侧栏分组；视觉与 `oas-collapse` 项一致（触发行 + grid 0fr→1fr 展开动画 + 内置 chevron）。双模式 `open` 契约：属性缺失 = 非受控（由 `default-open` 播种一次）；属性存在 = 受控且带值语义（除 `"false"` 外的任何值即展开，`"false"` 即收起）——点击翻转、把属性写回并派发 `oas-toggle { open }`（乐观更新）；移除 `open` 回到非受控，内部状态以最后一次显示值为种（无跳变）。`header` 属性 + `slot="header"` 富触发内容 + `template[slot="toggle"]` 自定义图标；`disabled`（config-provider 全局注入生效）。A11y：触发按钮原生焦点 + Enter/Space，`aria-expanded`/`aria-controls`/`aria-disabled` 同步。无 JS 兜底：未升级时 light DOM 内容保持可见。SSR `template()`/`hydrate()` 双路径（DSD 白名单后续批次）；无内置文案，无需 i18n。
- **`oas-list-item` 前置媒体 + 整行链接**：新增 `slot="icon"`（通用前置图标，尺寸随内容）与 `slot="image"`（方形缩略图槽，尺寸与头像档位一致 sm 24 / md 32 / lg 40，圆角裁切填充）；icon/image/avatar 各自独立切换、可自由组合。新增 `href`/`target`/`rel` 渲染撑满整行的 `<a>` 覆盖层（inset 0，可访问名称取自行标题）——点击行内任意处原生跳转，Tab 聚焦、Enter 激活；`target` 自动补 `rel="noopener noreferrer"`（显式 `rel` 永不被覆盖）。链接行不再派发 `oas-click`（跳转与 `clickable` 语义保持分离，避免双重触发）；`slot="extra"` 区域位于覆盖层之上（z-index 2），行内控件保持可交互。
- **菜单族前置媒体槽（`slot="leading"`）**：`oas-menu-item` / `oas-dropdown-item` / `oas-context-menu-item` 接受 `template[slot="leading"]`（或带 `slot="leading"` 的直接子节点），渲染在标签之前，优先于 `icon` 属性；`loading` 转圈替换它；收起模式下与图标合流（保持可见且间距归零，侧栏保留视觉锚点而非空白可悬停行）。提取辅助方法位于数据载体类（`OASMenuItem.extractLeadingFrom` / `isLeadingNode`），使槽标记被 api:scan 归属到载体。`oas-menu` 新增 `items` **property** 通道（`MenuItem[] | null`，对象数组直接赋值），供宿主交接携带前置节点的已解析 items（JSON 无法序列化它们）；property 按末次写入生效，属性被重新解析时让位。仅声明式子节点——`items` JSON 通道不支持 leading。
- **排版内容块**（不单独设 prose 容器；把既有 `tag` 体系扩展至 `oas-text`/`oas-title`/`oas-paragraph`）：`tag="blockquote"`（引用块，inline-start 侧 token 边框 + 逻辑缩进，RTL 安全）、`tag="ul"/"ol"/"li"/"dl"/"dt"/"dd"`（列表块，缩进归一 + 内置 li 间距）以及 `tag="table"` 加表格分部件（`caption`/`thead`/`tbody`/`tfoot`/`tr`/`th`/`td`）（全宽内容表格，边框合并）。`ul`/`ol`/`dl`/`table`/`caption`/`tr`/`thead`/`tbody`/`tfoot` 走无包裹投影（它们的内容模型不允许 span 包裹——默认槽直接挂到根；切回行内 tag 时重建包裹）。块形态下跳过省略号/line-clamp（其 display/white-space 规则会破坏块布局）；th/td 单元格细节记为宿主级样式（shadow 样式无法深入插槽子树——功能表格请用 `oas-table`）。

- **液态玻璃「动态流动感」v1**（承接玻璃批：静态近似 v2.5.9 + 边缘折射 v2.6.0 之后补「随交互变形」第一层，范围纪律=Apple 定义域）：① **指针镜面高光**——新增主题运行时 `@oas-ui/theme/glass-fluid.js`（单文档 `pointermove` 监听 + `composedPath` 命中注册表 surface → rAF 合批写元素本地归一坐标 `--oas-glass-px`/`--oas-glass-py`；**高光样式表由运行时按注册表经 `adoptedStyleSheets` 注入对应 shadow 根——组件源码零玻璃规则体、零标记属性**，只保留 `--oas-glass-*` 变量消费；指针离开/停用即清理，SPA 泄漏防护）；② **按压收紧**——`命中标记 :active` 把高光色换成更强档（真增强，非压暗；slider 把手另有按压外扩环），纯 CSS 不动 transform（避开 wave/拖拽的既有 transform 语义）。9 控件域组件消费：oas-button / oas-switch / oas-slider（经把手伪元素继承变量）/ oas-app-bar（`:host::after`）/ oas-bottom-navigation / oas-message / oas-toast / oas-snackbar / oas-notification。守卫：无 `data-glass` 零监听、`prefers-reduced-motion` 不启用、粗指针不接、`high-contrast` 不启用；`glass.css` 新增 `--oas-glass-sheen`/`-size`/`-press` 三变量（明暗双档，alpha 压低防拉低文字对比度）；高光层给 surface `isolation: isolate` + 基态 `::after { z-index:-1 }`，落在「背景之上、文字之下」不冲淡标签；**实心语义色/自定义色按钮（primary/success/warning/danger/has-color）hover 保留镜面高光、按压改用边缘内描边（box-shadow inset，不提亮铺底）**——白高光铺底会把白字对比度压到门限下，边缘描边不冲淡文字（与 Apple 镜面描边 / Fluent 内凹按压常态一致）；对比度门禁：玻璃面 hover ≥60（按主题页面底合成）/ 按压 ≥45，实心按钮 hover ≥45（瞬态大字档）/ 静止·按压基线 ≥60。内容面板与随环境内容变化的实时高光不进本批。

- **oas-questionnaire 多步骤问卷（新增，form 族）**：步骤驱动的表单流程编排器——每个步骤面板一个 `<oas-form>`，零侵入复用校验内核。逐步门槛（`next()` 先校验当前步，失败即拦截并派发 `oas-step-validate`；`prev()` 永不校验）、可选步跳过（绕过校验，派发 `oas-skip`；被跳过步在再次访问前离开参与集）、每次跳转均可经 `oas-before-change` 取消拦截（宿主自定义分支跳转）、自渲染进度（"Step n / m" 文案 + `role="progressbar"`，不复用 oas-progress）、面板常驻挂载（返回时保留值）、最终提交重新校验每个参与步并派发 `oas-submit`，值跨参与步合并（值与校验同一作用域：非隐藏、非跳过——需要全量数据的宿主可读内部 `oas-form`）。方法：`next()` / `prev()` / `goto()` / `validate()` / `submit()` / `getValues()` / `reset()`。属性：`steps`（JSON + property 双通道）、受控 `current`、`linear`、`validation`、`progress` / `progress-variant`（both/text/bar）、`prev-text` / `next-text` / `finish-text` / `skip-text`、`hide-header` / `hide-nav`、五档 `size`。隐藏步完全离开流程（表头、进度、导航、值与校验作用域）。键盘/ARIA：表头项可点击且支持 Enter/Space，`aria-current="step"`、`aria-live` 播报、原生导航按钮；RTL 走逻辑属性。i18n ×10。v1 边界：无条件分支（用 `oas-before-change`），无起始/完成页，草稿持久化由宿主负责。
- **oas-form 公开 `validate()`**：校验全部字段并同步错误态（`aria-invalid` + 错误文案），返回 `Promise<boolean>`。纯校验——不派发 `oas-submit` / `oas-validate-fail`，也不滚动到首个错误；让外部把关者（questionnaire 等）复用校验内核而不带提交副作用。异步校验器会被 await，禁用字段跳过，进入时使在途的字段级异步校验失效；`submit()` 契约不变。
- **oas-form 公开 `getValues()`**：全部当前字段值的快照（嵌套结构），形状与 `submit()` 派发的 `detail.values` 一致——不校验，禁用字段不过滤，经 `value` 属性预填的零交互字段也会包含。`oas-questionnaire.getValues()` 现通过它实时读取各步的表单（未升级表单回退到 `initial-values` 基线 + 跟踪快照），因此 `value` 属性预填无需任何交互即进入跨步汇总。

- **新增组件 `oas-knob`（form 族）** —— 旋钮输入，把值编码为绕圆的角度，为参数密集面板（音频/DAW、工业 HMI、3D）而设。经 `interaction` 提供三种手势模型：`cursor`（指针方位角增量驱动值）、`axis`（线性拖拽，默认纵向，满量程 150px）与 `auto`（默认——在前几像素内判定，沿首选轴的主方向走线性、垂直方向走圆周，判定一次并锁定整个手势）。所有手势均为相对：按下不写值，无位移的点按为空操作，主指针独占，Shift 拖拽 0.2× 精调。值弧（`include-arc`）带双极零点（`start-point` 居中 = pan/gain 惯例）、`indicator` 线/点、自定义扫掠（`start-angle`/`end-angle`，默认 225→495 = 270° 带底部缺口，`end-angle` 可超 360）。双击 / Ctrl+点击 / `reset()` 复位到 `default-value`（回退到 `min`），派发 `oas-reset`。值显示经 `show-value` + `unit` 后缀 + `format` 模板 + `formatValue` 函数 property，全部喂给 `aria-valuetext`（屏幕阅读器播报所可见内容）。可选滚轮调节（`wheel`，默认关闭，Shift+滚轮精调）。宿主完整键盘支持（`role="slider"` + tabindex）：方向键按 `step` 步进（上/下保持值语义，左/右随镜像），Shift+方向键与 PageUp/PageDown 按 `large-step` 步进，Home/End 跳到两端，Esc 取消拖拽并回滚。`reverse` 镜像扫掠与手势；RTL 书写方向自动镜像（异或）。`size` sm/md/lg 与库档位对齐，另加 `--oas-knob-size` 自定义直径（触屏把 sm 提升至 44px 目标下限）。取消路径：Esc/pointercancel 回滚且零提交（`oas-drag-end` `cancelled: true`）；拖拽中外部写 `value` 保持拖拽显示，释放时已提交的拖拽胜出，零变化的释放保留外部值。事件：`oas-input` / `oas-change` / `oas-drag-start` / `oas-drag-end` / `oas-reset`。所有颜色经 `--oas-knob-*` token（暗色变体随主题），SSR `template()`/`hydrate()` 双路径，i18n ×10。
- **会话组件族首批五个**（新族目录 `conversation/`；与 oas-comment 并存、不合并）：**oas-bubble**（start/end 对齐，逻辑属性 RTL 镜像，经主题感知 color-mix 的六种语义变体，布尔 `loading` 输入中指示带 aria-busy）；**oas-attachment**（idle/uploading/processing/error/done 状态机，与 oas-upload 用词一致，带钳制的进度条 role=progressbar，媒体图标/缩略图槽，内置下载/移除按钮带具名可访问标签，整卡 href 触发带可取消 oas-open）；**oas-message-scroller**（滚动意图模型、不持有消息：AI 式 `auto-scroll` 底部跟随带近底检测，IM 式 `pin-to-bottom`，内置跳转按钮可自定义 `slot="button"`，`scrollToEnd()/scrollToStart()` 方法，`oas-scroll-state` 事件，`data-scrollable` 反射，前置插入位置保持，region/log ARIA 带可键盘滚动的视口）；**oas-marker**（default/border/separator 变体，装饰性图标槽，文本分隔符 role 纪律）；**oas-message-row**（avatar/header/footer 槽带底对齐头像，方向经逻辑属性，五态送达状态带可见文案，`grouped` 聚类）。i18n ×10 语言，暗色主题 token，支持 reduced-motion，DSD 可水合。批次 B（轮次锚定、last-anchor 打开位置、可见性追踪、首帧防跳）随后。

- **会话族批次 B：滚动精度**（扩展 `oas-message-scroller`）：**异步资源位置保持** —— 前置补偿现按插入前首节点的内容坐标位移结算（同帧 append+prepend 混用只结算顶部插入，底部追加永不过补），随后锁定一个保持锚点：之后撑大上方历史的图片等（ResizeObserver 通道，无 slotchange 信号）持续按锚点的视口漂移补偿；锚点先按稳定的 `message-id` 重新查询（宿主侧重建行可解析）并在读者真实滚动时释放；程序化滚动写入登记一个预期 scrollTop，使异步滚动回声绝不被误当作读者意图。**首帧防跳** —— 对 `end`/`last-anchor` 打开位置在连接时反射 `data-pending-scroll`，此时视口为 `visibility: hidden`（保留布局以定位）；定位与移除在一帧内完成，未定位帧绝不闪出顶部。**`last-anchor` 打开位置** —— `default-position="last-anchor"` 落在最后一条 `anchor` 标记消息行的顶部（AI「回到最后问题」；无锚点时回退 `end`）。**`scrollToMessage(id, opts?)`** 按 `message-id` 精确滚动到某消息行（命中返回 `true`，未知 id 不滚动返回 `false`——无重试循环）。**轮次锚定**（`turn-anchor`，可选；`prev-peek` px 默认 64）—— 一次问答往来为一个锚定单元：锚点在视口顶部时，最后一条 `anchor` 标记行从顶部保持钉在 `prev-peek` 处，而答案在下方流入；在底部时底部跟随继续（新轮次从下方进入）；两者都不在时，读者已接管，一切不动。跟随模式每次跟随周期只解析一次，故底部跟随时越过顶部窗口的锚点绝不会被拽到顶部。可见性追踪（视口内消息列表）推迟到 v2（自带大纲/已读标记语义）。
- **工作台组件族（新族，4 个组件 + 8 个子组件）**：**oas-titlebar**（窗口外框——`drag` 契约写入 `-webkit-app-region` + `data-tauri-drag-region`，交互子元素经 no-drag 自动退出拖拽，`window-actions` 内置按钮派发 `oas-window-action`，`editable` 文档区带 Enter/blur 提交 + Esc 回滚，compact/large 档，安全区内边距变量） + **oas-statusbar**/-item（底部静默状态条——左/右分段，单元格可点击且派发 `oas-item-click`，语义色档，后台活动转圈，`role="status"`） + **oas-inspector**/-tabs/-section/-row（属性检查器——pill 标签条带漫游键盘，专用可折叠分区（`aria-expanded`），键值/控件行，混合值，行级复位，`role="complementary"`，密度档） + **oas-action-bar**/-button/-well + statistic-well + task-progress-well（底部命令条——`theme` 表面由新常墨 token `--oas-color-ink`/`--oas-color-ink-deep`/`--oas-color-on-ink` 支撑、不随宿主主题翻转，`active`/`active-tint`/`plain` 按钮派发 `oas-action`，统计与任务进度读数井派发 `oas-cancel`；媒体传输/音乐井现由 `oas-transport-well`/`oas-music-well` 提供）。i18n ×10，docs zh/en ×4 页，qa-regression 套件（titlebar 拖拽契约 / inspector 折叠 / statusbar 项点击 / action-bar 事件 + console 干净 + 暗色冒烟）。偏差守卫：非法 `size`/`theme`/`density`/`side` 回退并一次性 dev 警告；进度井为受控展示（宿主驱动），完成态保持 100%。全部 12 个类经 `@oas-ui/ui/ssr` SSR 安全；titlebar `subtitle` 在 `editable` 模式下保持可见（文档区状态行）；action-bar `end` 槽在无中央井时推到最边缘；空的 `oas-statusbar-item` 与 `oas-statistic-well` 不渲染任何内容（宿主级 `data-empty` 反射——无空白格、无固定高度胶囊、无残留 flex 间隙）；titlebar 与 action-bar 容器带 `role="group"` + aria-label（裸 div 上的 aria-label 会被辅助技术忽略；action-bar 不声明 `toolbar`，因为其中央槽惯常承载读数井、而井并非命令控件）；`oas-task-progress-well` 完全为空（无 `label`/`detail` 且未设 `progress`）时折叠——无空转胶囊，与统计井一致）。

- **专业密度批次 A（数值密集输入，四项）**：**像素锚定数值拖拽**经共享纯函数内核（`shared/scrub.ts` —— 按下记录锚点像素 + 基准值，水平每移动 4px 为一档 `step`；Shift = 精调 ×0.2，Alt = 超精调 ×0.04，与旋钮惯例对齐——无加速度档；拖回锚点精确还原基准值；不足一档的移动计为普通点击，保留焦点/输入）。接入 **oas-slider**（每个 `show-input` 读数独立拖拽，含多滑块；拖拽中 `oas-input`，释放时仅当值变化才 `oas-change`）与 **oas-input-number**（基于提交：拖拽用 `oas-input` 更新显示文本，释放时归一化并提交；空值从 min/0 起；步进器/滚轮/键盘路径不变）。两者在粗指针上均不启用拖拽（点按输入优先），且均设 `touch-action: pan-y`，纵向触摸滚动仍可用。**oas-slider `reset-value` + 双击轨道复位**（回退到 `min`；`step="mark"` 下钳制并对齐最近刻度；仅单值模式）。**oas-collapse-item `summary`**：收起态读数显示在表头尾部（不展开即可报告内部值），展开时隐藏，单行省略号截断，位于表头按钮内以便屏幕阅读器在收起时读到。**oas-dropdown / oas-select `reserve-width`**（opt-in）：测量最宽选项标签（select 还含占位符）并锁定触发器最小宽度，切换值不再抖动；文本测量三级降级（canvas measureText → 离屏 span → 逐码点估算，无需布局即可测试）；内容变化时重测；dropdown 移除时还原触发器此前的内联 min-width，select 经 `--oas-select-reserve` 变量锁定（默认 0px，无宿主足迹）。**oas-slider 专业属性**：`precision`（对拖拽档位与气泡/`aria-valuetext` 取整，折叠 0.30000000000000004 → 0.3 这类浮点尾；优先级低于 format/formatTooltip）、`value-width`（读数宽度，数字带 px）、`accent-color`（拖拽强调色，预设语义名映射到暗色主题感知 token）、`show-track`（隐藏轨道条与填充、保留滑块）。docs zh/en ×5 页 + api-descriptions + 跨五个 spec 的 qa-regression 真实交互回归。
- **oas-combobox `multiple` 多选**：可搜索多选闭环，镜像 oas-select 多选契约——`value` 变为 JSON 数组字符串；选中项渲染为可移除标签（逐标签 `×` 移除；readonly 去除按钮）；每次选择后面板保持打开且过滤清空以便连续选择；输入仅做过滤（多选模式下关闭自由文本/datalist 语义——失焦丢弃过滤且绝不触碰选择集）。`max-count` 限制选择数（未选项置灰带 `aria-disabled`，选择被拦截并派发 `oas-exceed-limit` `{ value, max }`；已选项仍可移除）；`max-tag-count` 显式设定时把标签折成单行 `+N`（title 列出折叠标签），否则标签换行。多选模式下 `oas-change` detail 为 `{ value: string[], options: Array<Option|null> }`；`oas-clear` 携带清空前的数组；`clearable` 清全部。原生表单集成：`name` 下同名多值 FormData 条目，`required` 校验「至少选中一个」，表单 reset 还原初始基线；`el.value` 读写数组（受控，不派发事件）。多选控件把边框/焦点环移到包裹的 `.control` 盒（内含 chips + 无边框弹性过滤输入）；单选 DOM/CSS 行为不变（`display: contents` 包裹，零足迹）。虚拟滚动、分组与移动底部弹层在多选模式均可用；下拉定位锚定该控件盒。
- **oas-switch `description` + `variant="card"`**：description 在标签下渲染一行柔和次级文案（slot[name=description] 富内容优先于属性文本；与 oas-checkbox/oas-radio 同一契约），补齐三方表单控件一致性缺口。`variant="card"` 把开关升级为选择卡：带边框卡片包裹滑块 + 标签 + 描述，整卡可点击（宿主点击委托；disabled/loading/before-change 均拦截），选中态以主色描边叠在浅淡 `color-mix` 背景之上，禁用/状态色沿用 checkbox/radio 选择卡语言；非法 variant 值静默回退默认。默认形态不变。
- **oas-toggle-button / oas-toggle-group `variant`**（组的组级透传）：与 oas-button variant 体系对齐，限定于对切换有意义的子集——`solid`（默认，带边框盒，按下 = 实心强调填充）/ `outlined`（透明背景带边框；按下 = 强调边框 + 浅淡着色 + 强调文字）/ `filled`（柔和着色背景、无边框；按下 = 实心填充）/ `text`（无边框无背景；按下 = 浅淡着色 + 强调文字）。非法值静默回退 solid；与 `size`/`color`/`status`（状态色按源顺序胜出）及 `attached`/`vertical` 正交；感知 variant 的禁用回退保持统一禁用视觉。反射为 `data-variant` 供 `:host()` CSS 消费。
- **新增组件**：`oas-scope-bar`（过滤 pill 行——单选/多选、漫游键盘、RTL；与 `oas-toolbar` 搭配）、`oas-transport-well`（媒体传输井——`HH:MM:SS:FF` 时间码带键盘寻址派发 `oas-seek`，空态零足迹）、`oas-music-well`（小节/拍/速度/拍号读数）、`oas-attachment-group`（横向吸附滚动条带边缘渐隐，`data-scrollable` 反射）。另有 **`oas-traffic-lights`**（macOS 红绿灯窗口控件——关闭/最小化/最大化圆点带悬停符号并派发 `oas-window-action`；置于 `oas-titlebar` `slot="leading"` 得到 macOS 布局；自声明 no-drag，故在可拖拽 titlebar 内仍可点击）。
- **oas-button `active` / `active-tint`**：受控选中态（宿主持有 `aria-pressed`，不自动切换——宿主经 `oas-click` 写回；切换语义仍归 oas-toggle-button）；`active-tint` 接受预设名或字面颜色，经 token 驱动填充/文字。
- **oas-slider 专业密度**：`track` 色轨（`hue`/`saturation`/`luminance`/`gradient`，感知方向与 RTL）、圆形推子下的 `levels` 立体声电平表、`thumb="pointer|round"`，以及统一速度修饰键（Shift = 精调，Alt = 最精，与 oas-knob 对齐；无 ×5）。
- **oas-questionnaire**：经宿主组合通道的条件分支（`current` 落在宿主切换的 `hidden` 步上时自动对齐并派发 `oas-change`）、`animated` 步骤过渡（仅 transform/opacity，感知 `prefers-reduced-motion`），以及 `shortcuts` 键盘步骤导航（任意处 Alt+←/→，焦点不在输入/吞键控件时裸 ←/→）。
- **oas-input 块级附加内容**：`slot="block-start"` / `slot="block-end"` 把附加内容渲染为字段上方/下方的完整块（外部字数统计在有块时折入块行）。
- **oas-date-picker `caption-layout="dropdown"`**：月/年 `<select>` 标题，便于快速跳转遥远年份（如出生日期）；仅导航，绝不改变值。
- **oas-card `density="compact"`**：更紧凑的内边距/间距密度，与 `size` 正交。
- **oas-scroll-area `type` 枚举**（`auto` / `always` / `scroll` / `hover`）：取代布尔 `auto-hide`，后者作为 `type="auto"` 的向后兼容别名保留；默认不变。
- **oas-modal `slot="media"` + `sticky-footer`**：媒体槽（仅有内容时显示）与可选的钉住页脚搭配可滚动主体。
- **oas-table `total`**：外部/服务端分页——`data` 视为当前页切片，total 喂给分页器，越界的 `current` 被钳制。
- **oas-toggle-button `icon-toggled`**：按下时显示的备用图标（回退 `icon`）。
- **oas-inspector-row `align-top` / `striped`**：高控件用顶对齐标签，以及可选的斑马纹背景。
- **oas-marker `status`（`info`/`success`/`warning`/`danger`） + `shimmer`**；**oas-bubble `reactions`**（emoji + 计数，真实按钮上派发 `oas-reaction`）；**oas-message-scroller `track-visible`**（`pay-for-use`；`oas-visible-change` + `visibleMessageIds`/`currentAnchorId`）。
- **`oas-swipe-cell` 双向滑动**：`slot="actions-start"`（inline-start 侧，LTR 下右滑露出）现可与 `slot="actions"`（inline-end，左滑）在同一项上共存。打开态从布尔升级为某侧（`'start' | 'end' | null`）：新增 `open-side` 属性（及 `openSide` property）选择/反射该侧，`open` 布尔保留（任一侧打开即为 true），`oas-open` 事件 `detail` 增加 `{ side }`。单次手势可双向拖拽，可越过零点端到端切换侧，且每项仅一侧打开；`side` 仍是单组旧开关（`actions-start` 存在时忽略）；RTL 经逻辑属性镜像。每侧可访问性不变（各分组是独立的 `role="group"`，共享同一 i18n 标签）；焦点进入某侧 actions 即打开该侧。

- **oas-float-button group 模式自渲染子钮（`actions` 通道，根治宿主页 CSS 覆盖）**：`mode="group"` 现复用 menu 的 `actions` JSON（`[{ label, icon?, href?, target?, badge? }]`）由组件在 shadow 内自渲染圆形子钮——宿主页全局样式（如文档站 reset 的 `button { background: transparent }`）无法再穿透覆盖子钮形态。带 `href` 渲染为链接子钮（`target` 透传 + 自动补 `rel="noopener noreferrer"`）；`label` 兼作无障碍名称与 hover/键盘聚焦气泡（纯 CSS 显隐）；`badge` dot/数字 99+ 封顶同既有规则。点击复用 `selectItem`：派发 `oas-select`、组收起、非链接项回焦主钮；键盘方向键导航经 `.actions` 容器委托（展开自动聚焦首项、循环 + Home/End）、actions 更新重建带焦点保持。**两通道并列**：`actions` 为数据通道（组件自渲染，免疫宿主页 CSS）；既有 `slot="action"` 保留为**自定义通道**（非废弃）——宿主自填元素/组件（`oas-button`/自定义元素/框架响应式内容）用于数据通道无法表达的场景，默认形态经 `::slotted` 承载（best-effort，可被宿主页 CSS 覆盖）。两通道二选一，同时提供以 actions 为准（宿主反射 `data-action-rendered`，CSS 隐藏 slot 投影并 dev 告警一次），既有 slot 路径行为不变。子钮阴影档 `--oas-shadow-sm` → `--oas-shadow-md`（slot 版与 actions 版同步，对齐主钮海拔）。

### 修复

- **oas-bubble `align` 纳入观察属性**：动态 `setAttribute("align", …)` 即时切换对齐（此前仅声明式/首渲染路径生效）；显式 `align` 属性始终优先于容器 `text-align` 继承反射
- **oas-badge rolled+side 误隐藏挂点折叠角**：`rolled` 对 `ribbon-form="side"` 本为整体静默忽略，但 corner 隐藏规则漏排 side——已补排，`rolled+side` 不再误丢挂点折叠角
- **max-tag-count 数值口径五方归一**：select / cascader / combobox / tree-select / dynamic-tags 全部改走 `intAttr` 读取器并加 `>= 0` 钳制——负值/非法值统一视为未设置（不折叠；此前 tree-select/dynamic-tags 会把全部标签折叠为 +N，cascader 负值会出现离群切片丢尾格）；manifest 类型统一为 `number`

- **oas-toast 离场时长 CSS 单位解析**：`--oas-toast-leave-duration` 的秒值（如 `0.2s`）此前被 `parseFloat` 误当毫秒（0.2ms），离场动画被即刻截断；现按 CSS 时间单位正确换算（`s` / `ms`，非法值回落默认 200ms）
- **oas-combobox 虚拟滚动视口 tabindex**：改走 `viewportFocusable` 属性通道（与 cascader 的既有做法一致）——此前 `removeAttribute` 会被 virtual-list 下次 update 重新加回，视口多一个 Tab 停靠点
- **oas-bubble `reactions-side` / `reactions-align` 生效**：宿主改 flex 列容器（原块布局下 `order` / `align-self` 无效）；message-row 的 `text-align` 对齐继承经 `data-inherit-end` 反射保留（`align="end"` 行气气泡仍右对齐），显式 `align` 属性优先于继承反射
- **oas-float-button `trigger="hover"` 触屏回落 click**：粗指针（coarse pointer）下自动按 click 触发（此前触屏 tap 完全不展开，与文档承诺的「触屏回落 click」一致）
- **oas-popover 移除死属性 `arrow-point-at-center`**：popover 箭头默认即跟随锚点（单测 + e2e 佐证），该属性登记在 observedAttributes 却从未被消费；已从属性清单 / manifest / 文档同步移除（tooltip / dropdown / hover-card / tour 的同名属性不受影响）
- **oas-grid 折叠尾格陈旧闩**：`collapseEverExpanded` 先复位再算尾格显隐——展开后内容缩减到不超限的同一帧尾格收起入口即消失（此前滞留一轮重算）
- **dev 告警统一通道 `shared/dev-warn`**：全库 101 处 `console.warn` 迁移到统一 dev 告警通道（下游打包器静态替换 `NODE_ENV=production` 后静默、判定失败时放行），开发期告警行为不变

- **oas-tour `finish-button-props` 现已生效**：最后一步的完成按钮即 `next` 按钮；`finish-button-props`（全局属性 + 步骤级 `finishButtonProps`）现叠加在该步的 `next-button-props` 之上（步骤级胜出），宿主可据此为完成态设样式。此前该 property 在类型/API 中声明却从未应用。
- **工作台外框修复**：`oas-inspector` 的空态不可见——空块原本位于设 `empty` 时会被隐藏的 `.body` 内（已移出 + flex 撑满）；`oas-inspector-row` 行分隔线现默认为 border token（原为 `transparent`，故键值行无发丝线），绘制为上边框以免末行与分区分割线叠压；`oas-titlebar` / `oas-inspector` 表面现默认为细微的主题感知 `color-mix`（明暗对称，原浅色下取页面色）；`oas-traffic-lights` 悬停符号为固定深色调（原暗色下近白、不可读），且控件自声明 `-webkit-app-region: no-drag`。
- **对比度（axe 比率）修复**：oas-button `text` 变体的 `active` 文字现回退到主色文字安全档（原为主色叠主色浅底，不可读）；oas-inspector-row 的 `striped` 标签用强次级色调以在斑马背景上保持 AA；浅色 `--oas-color-info-text` token 加深（原在白底上低于 AA）——感知（<60）门禁不受影响。

- **数值拖拽值通道正确性**（共享拖拽内核，影响 oas-slider 读数与 oas-input-number）：未显式设 `precision` 时，档位组合可能把二进制浮点尾当作提交值（如 `0.1 × 3` 档 → `0.30000000000000004`，Shift 精调档 `10 + 23 × 0.2` → `14.600000000000001`）写入 `value` 属性、`oas-change` detail、读数、气泡与 `aria-valuenow`。拖拽值现按生效 step 与基准值的有效小数位自动收敛到数学预期（无语义变化——仅移除实现误差）；显式 `precision` 在其上作为更严格的值约束（如 `precision="0"` 把修饰键精调档钳回整数）。另：`step="mark"` 下滑块拖拽现先对齐最近刻度再写入，使滑块、`value` 属性与读数一致停留在刻度集上（此前属性可能短暂携带如 `42` 的离刻度值，而仅滑块显示已对齐——宿主属性读取/序列化与 `el.value` 漂移）。docs zh/en 已更新；新增单测 + qa-regression 真实交互回归（刻度对齐 + 分数档洁净）。
- **会话族后续修复**：oas-message-scroller 的 ResizeObserver 现同时观察内容与视口——视口尺寸变化（窗口或容器）会刷新边缘状态、跳转按钮与 `oas-scroll-state`（此前为盲点），断连时清理观察者、重连时重新观察；初始 `oas-scroll-state` 改为首帧（完成初始定位后）广播一次，而非升级过程中同步派发，故在元素升级后才挂监听的宿主仍能收到；oas-message-row 的 `sending` 状态图标重新转圈（`spin` 图标类此前无匹配的 scoped 动画规则）；oas-marker 的空态折叠改用 `data-empty` 反射 + scoped CSS，不再清除宿主显式的 `hidden`；oas-attachment 去掉无用的 `media` 属性（媒体形态由 `slot="media"` 是否有内容决定）；全部 10 个 locale 移除四个未用的 i18n key（`attachment.open/uploading/processing/done`）。
- **oas-questionnaire 陈旧导航竞态**：异步校验器在途时，`prev()` / `goto()` 不被拦截（设计如此——返回绝不能被困住）；校验器解析后，在途的 `next()` 仍把 `current` 推进到陈旧目标，在用户已离开起始步后将其拽向前方。现当 `current` 不再指向起始步时放弃在途导航（已加单测回归）。
- **oas-combobox `multiple` 加固**：运行时 `name` 变化现会重新同步同名 FormData 条目键（`name` 加入 `observedAttributes`，与 oas-select 一致）；`readonly` 隐藏清除按钮并拦截 `clearValue`，`disabled` 去除每个 chip 的移除按钮，不留无作用的可见可供性；被 `max-count` 拦截的选择不再清空内部过滤查询（`valueDirty`/`query` 仅在通过上限检查后才改动），使高亮行保持在过滤集内；无 `name` 时 `getFormValue()` 返回 `null`（自建 FormData 绕过了浏览器「无 name → 不提交」兜底，此前空键条目会泄漏进表单），`required` 多选校验现直接检测选择集，无 name 的选择不再被误标 `valueMissing`。新增单测 + 真实浏览器 qa-regression。

- **`@oas-ui/ui` 主入口导出补全**：顶层入口现也重新导出 `OASBottomSheet`、`OASMenuItem` / `OASMenuGroup` / `OASMenuDivider` 与 `OASMenubarItem` / `OASMenubarGroup` / `OASMenubarDivider`（此前仅能经子路径导入与 `@oas-ui/ui/ssr` 入口取得），主入口与 SSR 入口的类超集对齐。
- **oas-float-button 拖拽 / 磁吸坐标系自适应**：`absolute` 宿主（如卡片内容器）下，拖拽与磁吸原按视口坐标写入、被包含块错位解释，按钮随容器页面偏移量「飘很远」（用户实报）；现按定位上下文（`offsetParent` 包含块 / 固定语义沿用视口）取坐标系，且拖拽后显式 `right/bottom: auto`，防止回落到 `:host` 的固定偏移而把按钮宽度由 shrink-to-fit 拉宽、磁吸目标错乱。
- **内置图标 `star-filled` 改为实心星形**：原内容误为心形且未填充（渲染产物可见修复）。
- **SSR 白名单补齐 `scheduler` / `gantt` / `barcode`**（v2.6.0 遗漏登记）+ `oas-barcode` 补 `hydrate()` 覆写——此前 DSD 快照在浏览器 upgrade 时被 `render()` 全量重建（DOM 引用丢失）；现跳过重建、保留引用，白名单全量对账一致。
- **对比度修复（补充）**：`oas-toggle-button` / `oas-toggle-group` 的 `outlined` / `text` 变体选中态文字改用主色文字安全档 `--oas-color-primary-text`；选择卡描述（switch / checkbox / radio）改用 `text-secondary-strong` 以保证斑马/浅底上 AA（感知 <60 门禁不受影响）。

## [2.6.0] - 2026-10-07

### 特性

- **玻璃边缘折射 v1**（承接液态玻璃批如实口径，范围纪律=Apple 定义域）：`glass.css` 内置 `--oas-glass-refraction` —— data-URI 自包含 SVG 位移滤镜（法向位移链：discrete 阈值把半透明玻璃面与不透明面归一为实心剪影 → blur 边缘过渡带 → Sobel 双卷积把轮廓梯度编入 R/G 通道、每段边缘沿自身法线微膨胀 → `feDisplacementMap` scale=10 膨胀峰值实测 ±4px（外包络宽高各 +8px 双轴对称）），**只有边缘环带变形、中间恒不变形**（布局/命中区不受影响）。实现选型：shadow DOM 内 `url(#id)` 片段引用无法跨 shadow 边界解析（实测静默忽略），data-URI 内联滤镜在任何树内天然可解析；滤镜区域横向 -50%/200%、纵向 -100%/300% 给位移与分层投影主下探留缓冲。引擎边界（如实）：折射位移在 Chromium 系与 WebKit 引擎真实生效（WebKit 按 engineering §2 方法实测：开/关像素差异 4.55%、pageerror 零）；Firefox 对 CSS `filter` 的 data-URI SVG 滤镜不执行位移，安全无感降级为无折射（不破坏渲染）。9 组件经 `filter: var(--oas-glass-refraction, none)` 消费：oas-button / oas-switch / oas-slider（把手）/ oas-app-bar / oas-bottom-navigation / oas-message / oas-toast / oas-snackbar / oas-notification——不引 glass.css 或无 `data-glass` 时回落 none 零副作用；oas-button hover/按下/选中态 `brightness()` 与折射组合书写不互覆（局部停用折射请覆盖为空值而非 none）；禁用态显式关折射跨组件统一（oas-button 含 hover/active/选中反超守卫、oas-switch 含 busy、oas-slider 双伪元素——禁用控件静态无装饰变形）；oas-app-bar 溢出弹层打开期间自动关折射（防弹层被滤镜区域裁切）。内容面板（modal/drawer/popover/select 系）与动态流动感不进本批。画廊 controls 展示行同步；e2e 固化像素级断言（Chromium：开/关必不同 = 真实执行、中心区一致 = 中间恒不变形；Firefox：无差 = 无感降级契约防假绿）+ filter×backdrop-filter 共存断言 + 布局盒不变断言。

- **oas-gantt 甘特图组件（新，data 族）**：项目排期语义（任务/工期/依赖/进度），与 scheduler 的日历约会语义互补。行树 WBS（摘要条：时间=子任务并集、进度=子任务工期加权平均；`expanded` 受控集合，缺省全展开、显式 `[]` 全收起）；任务条三形态（task 进度填充 + `label-position` inside/right/left（缺省不显示） / milestone 无 `end` 推导菱形 / summary 摘要条）；依赖连线 `fs`/`ss`/`ff`/`sf` 四型 SVG 单画布覆盖层；时间刻度六档（hour/day/week/month/quarter/year，双层表头，窄容器辅刻度标签自动抽稀 + 视口自适应列宽）；拖拽三件套（拖身改期/左右手柄拉伸/条内圆点改进度，pointerup 收口一次性写回并派发 `oas-task-change`（含 old/new）与 `oas-progress-change`，Esc/pointercancel 取消零事件，键盘 Shift+←/→ 改期一格（RTL 镜像））；只读三级（`readonly`/`dates-readonly`/`progress-readonly`）+ 任务级 `disabled`（只读不渲染拖拽手柄）；今日线 + 周末/假日列高亮；行虚拟滚动（万级任务窗口化渲染，方法 `scrollToTask`/`scrollToDate`/`scrollToToday`/`updateTask`）；数据契约扁平 `parent` 指针为主（嵌套 `children` 输入自动拍平兼容）。i18n ×10 + qa-regression 浏览器回归。

- **oas-barcode 一维条码组件（新，data 族）**：第一期 6 码制——`code128`（默认，auto A/B/C 子集切换）/ `ean13` / `ean8` / `upca` / `code39` / `itf14`，自研零依赖编码器纯函数层（`encoders.ts`，条空 run 统一产物 + 护条/HRI 模块坐标）；GS1 mod10 校验位对 12/7/11/13 位数据自动补算、全码输入自动校验。非法输入（字符集/位数/校验位）渲染错误占位并派发 `oas-invalid`（detail 带原因，同一输入只派发一次）。可扫性内建：静区 `margin`（默认 10）显式值低于 `10 × bar-width` 时收敛并 console.warn 一次、`bar-width` ≥1 clamp、EAN/UPC 护条按标准向下延伸、默认深条（#18181b）固定白底不随主题（暗色下同样可扫，`--oas-barcode-color`/`--oas-barcode-bg` 可覆写）；整体宽度由内容决定（位数 × 码制 × `bar-width` + 静区，不设 size/width）。人读文字默认显示（`display-value`/`text-position`/`font-size`/`text-margin`，generic sans，OCR-B 不内嵌）。SVG 输出（`role="img"` + aria-label，i18n ×10）+ `download()` 离屏 4× 栅格化 PNG（对齐 oas-qrcode 惯例）。

- **oas-chart 图型扩展（范围纪律：只补四类，不做全面深挖）**：① **radar 雷达图**（`type="radar"`）——维度名复用 `labels`（与折线/柱状同一数据心智零迁移），`options.max` 全局量程（缺省全系列 max 走 nice 刻度），`options.radarShape` 网格同心多边形（默认）/同心圆，刻度值沿顶轴、维度名顶点外侧（顶点文字碰撞自动避让），顶点 `<title>` 与图例/配色/动画全复用；② **polar-area 极坐标面积图**（`type="polar-area"`）——分类等角扇区 + 半径编码值（最大值满半径）+ 同心参考圈，tooltip 显示原始数值而非占比，单系列与饼/环同一数据格式，单分类整圆渲染、全 0 不出扇区（与饼图同口径）；③ **combo 组合图**（不设 type 值）——顶层 `type` 为缺省系列型，`series[].type`（bar/line/area）逐系列覆盖（非法静默回退），线/面点对齐柱组 band 中心，绘制层序固定 bar→area→line；④ **multi-axis 双轴**（进 options 层）——`options.yAxis` 数组 + `series[].yAxisIndex` 归属（字符串 "1" 矫正，非法归左轴），**alignTicks v1 就做**（以主轴档数锚定副轴重算 niceStep，消除刻度错位误读），**仅两侧均有绑定系列时启用**（单侧无绑定不渲染假轴）。四图型 `options.colors` 注入 SVG 前统一转义（防恶意色值注入），SVG 内文字方向钉 LTR（RTL 宿主不翻转，图表为坐标语义内容）。i18n ×10 + qa-regression 四图型浏览器回归。已知限制：小数量程（如 0~0.01）nice 整数步长退化（引擎既有行为，宿主换算兜底，已入 PRD）。

### 修复

- **oas-barcode 默认静区不可扫（默认 5X 低于组件自身强制的 10X 下限）**：`margin` 缺省改为 `10 × bar-width`——默认产物即可扫，不依赖宿主显式设置（此前默认 10px = 5X，与「可扫性内建」承诺自相矛盾）；单测/e2e/文档/API 语料同步。
- **`@oas-ui/ui/ssr` 出口补全**：新增 `OASGantt`/`OASBarcode`/`OASScheduler`/`OASBottomSheet`/`OASAppBar`/`OASStepperPanel`/`OASFormItem`/`OASButtonGroupSeparator` 类导出（此前文件头宣称「re-export 全部组件类」但缺 8 个——含 v2.5.9 的 scheduler；均从类文件直出，不引含 define 副作用的目录入口）。
- **文档站语言偏好污染（满负载实抓）**：首访适配的偏好槽 `oas-lang` 此前只靠 `oldValue === undefined` 判定「落地不写」，路由/水合重算会以 oldValue 有值再次触发 watcher 写回落地页 locale——污染后 en 浏览器访问 zh 深链不再跳转。改为「点击语言下拉才算显式切换」写入 + e2e 回归锁。
- **浅色玻璃面板在白色背景下边界与内部隔断线消失（用户两轮实抓）**：浅色玻璃的 surface（白 0.6~0.75 半透明）与折光边（白 0.55）在白底上同为白色系，面板读作浮字；内部隔断线（modal 标题/底部分割线）走白色 border token，在白面板上同样消失（暗色下白色结构线可见，故只有浅色出问题）。修复双管齐下：① 三档阴影前置发丝线（`0 0 0 1px rgba(0,0,0,0.06~0.08)`）补面板外缘；② 浅色 `--oas-color-border` 系列改深色发丝（`rgba(0,0,0,0.08/0.14)`）补内部隔断——折光边职责仍归白色 `--oas-glass-ring`（outline 内缩），结构线与折光边分工对齐 iOS 浅色半透明面板；dark 段不动（范围纪律）。e2e 固化 computed 阴影含发丝线 + modal 标题分割线为深色系断言 + 白底/渐变双场景截图复核。
- **oas-color-picker 未连接写 `value` 崩溃（React 19 宿主整树中断）**：React 19 在元素已升级、未连接时设置 property，`set value()` 直调 `update()` 读到未渲染内部件（`syncControls` 的 `.r/.g/.b` 非空断言）抛 TypeError。修复：setter 加 `hasRendered` 守卫（属性写入保留，首渲染自然读新值，与基类 `attributeChangedCallback` 早退同语义）。同步落地 29 组件 `value` setter 未连接守卫普查套件 + 真实浏览器 e2e 固化；并把该守卫**统一铺到全部 20 个直调 `update()` 的 value setter**（input/textarea/select/slider/cascader/date-picker/time-picker/rate/radio/segmented/transfer/tree-select 等——此前「恰好不崩」靠各组件 update() 路径容错，现改为构造保证的「廉价 setter」约定：连接安全不依赖实现细节）。
- **high-contrast × class 式暗色（`html.dark`）下玻璃材质泄漏**：`.dark` 选择器补 `:not([data-theme="high-contrast"])`——HC 可访问性强档下 blur/ring/折射全部让位（此前仅 `[data-theme='dark']` 路径排除）。

## [2.5.9] - 2026-10-05

### 特性

- **移动原生形态批（5 个新组件）**：**oas-notice-bar** 通告栏（feedback 族——type 四语义色 / icon / closable+open 恢复 / items 纵向轮播 / scrollable 内嵌 marquee 引擎 / action 双形态）；**oas-index-bar** 索引栏（navigation 族——sections 数据驱动分节列表 + 字母侧栏点按/拖拽跳转 + scrollspy 联动 + sticky 分节头 + RTL）；**oas-pull-refresh** 下拉刷新（feedback 族——滚动盒手势接管 / 阻力曲线 / 阈值释放 oas-refresh / refreshing 受控停驻 / success 回弹 / overscroll+touch-action 滚动协调 / 原生 touchmove 阻断浏览器 pan 接管）；**oas-swipe-cell** 滑动操作（data 族——8px 方向判定放行纵向 / RTL 镜像 / 位移阈值 + flick 速度双吸附 / 单开互斥 / 外点滚动 Esc 关闭 / 焦点入 actions 自动开）；**oas-picker** 滚轮选择器（form 族 form-associated——原生滚动 + scroll-snap 惯性 / columns 独立多列 / options 级联树（深层初值单趟解析）/ disabled 项吸附 / 键盘全操作 / FormData JSON 数组提交）。i18n ×10 + Node 安全类导出（`packages/ui/src/ssr.ts`，供自定义 SSR 渲染；renderToString 白名单不含手势/滚轮类组件）+ qa-regression 固化（含移动仿真触屏用例）
- **theme 默认阴影精修（现代分层投影）+ 可选皮肤预设层 + docs 皮肤画廊**：阴影三档由单层改为两层（近距硬边 + 远距柔和扩散，观感更细腻、边缘不脏）；新增 `@oas-ui/theme/skins.css`——6 套品牌色皮肤预设（`violet` / `emerald` / `rose` / `amber` / `graphite` / `teal`），在 `data-theme` 之上叠加 `data-skin` 切换、与三套内置主题自由组合，仅覆盖 `--oas-color-primary`（`-hover`/`-active`/`-primary-text`/焦点环等派生档自动跟随），opt-in 无副作用（不引则完全无影响）；新增 docs「皮肤画廊」页（`/guide/skins`，6 皮肤 × 3 主题实时切换预览）。暗色变体选择器同时覆盖 `[data-theme='dark']`（库内规范）与 `html.dark`（宿主常见的 class 式暗色，如 docs 站）——初版只覆盖前者，致宿主 class 式暗色下皮肤被默认主色回填而失效（视觉复核实抓并回归固化 `packages/ui/src/skin-presets.test.ts`）
- **oas-scheduler 日程调度组件（新组件，data 族，四期交付）**：月视图事件芯片（标题 + 色条，>2 合并）+ `events` 读/写通道与 `addEvent` / `updateEvent` / `removeEvent` CRUD（派发 `oas-events-change`；点芯片 `oas-event-click`、点日格 `oas-day-click`，宿主接编辑器）；周/日时刻表视图（定时事件块定位 + 全天行，`start-hour`/`end-hour` 限幅）+ 拖拽移动（30 分钟步进）/ 底缘缩放（15 分钟步进）+ `oas-view-change`；重复规则 `repeat`（daily / weekly / monthly + interval + until，渲染层展开）+ 提醒 `remind`（到点派发 `oas-remind`）；`timezone`（IANA 时区影响格式化与今日标记）+ `view="agenda"` 日程视图（28 天时序清单）
- **液态玻璃风格材质层 `@oas-ui/theme/glass.css`**（静态近似——半透明/模糊/折光边/深影四项观感达成，Apple 定义的边缘折射变形与动态流动属后续增强；可选层，与 skins.css 同机制 opt-in）：半透明 surface + backdrop 模糊 + 高光折光边 + 圆角放大 + 分层深影，`data-glass` 叠加于 `data-theme`/`data-skin` 自由组合；25 个浮层 surface 组件（modal/drawer/popover/tooltip/dropdown/select 系面板/message/snackbar/bottom-sheet/app-bar 等）统一消费 `--oas-glass-blur`/`--oas-glass-ring` 两效果变量（缺省回落 none/transparent 零影响）；dark 档高 alpha 保文字安全（感知对比度实测门禁 ≥60 三背板双主题）；blur 只上容器级（行级/长列表不接）；high-contrast 不启用；局部降级变量覆盖即可。新增「液态玻璃画廊」文档页（/guide/glass）
- **oas-calendar `events` 排期条目通道**：声明式 `[{ date, title?, color? }]`——当日格内圆点（color 或主色）、>2 合并 `+N` 徽标、悬停/聚焦当日出行内条目浮层（组件自渲染，不经宿主手写 `oas-cell-render` 监听；该事件保留为兜底）
- **oas-swipe-cell `side` 属性（向右滑开）**：actions 默认挂 inline-end（LTR 右侧、向左滑开）；`side="start"` 改挂 inline-start（LTR 左侧、**向右滑开**）——side 是交互侧选择、与书写方向正交（RTL 整体自动镜像）；同时补「多按钮并排」demo（slot=actions 放多个按钮按总宽度测量整排露出）
- **oas-button 高度公开变量 `--oas-button-height`**（档值兜底、默认行为零变化）：swipe-cell actions 等需要按钮填满行高的场景经 `::slotted` 注入 100%（swipe-cell 已内建注入；此前内层恒定档值高、宿主被 flex 拉伸后按钮顶对齐不居中）
- **oas-input 及「字符串输入系」公开 `value` property（get/set）**（`oas-input` / `oas-textarea` / `oas-input-number` / `oas-auto-complete` / `oas-mentions` / `oas-combobox`）：补上程序性读值的公开通道——此前 `value` 只有 attribute 写入通道与 `oas-*` 事件通知，宿主读当前值只能监听事件自存 state 或穿透 shadow 读内部控件（脆弱）。`el.value` 读取该组件 `getFormValue()` 语义的当前值（parser/mask 感知、label/值分离、实时解析等各自口径），`el.value = x` 写受控 `value` 属性并强制回写内部控件、不派发事件（对齐原生 `input.value` / `textarea.value` 的受控赋值即生效语义）。React/Vue 受控集成与宿主读写不再需要样板。

### 修复

- **oas-form 默认校验时机改为 `input`（边输入边校验）+ 弹窗内两段式提交被布局位移吞掉的根治**：对齐主流表单库「边输入边校验」的通行做法——默认 `validate-trigger` 由 `change`（失焦语义）改为 `input`，错误在用户点击提交前即已结算，从根上消除「点击瞬间错误文案增删 → 布局位移 → 把按钮从指针下顶走、`click` 按规范落到 mousedown/mouseup 目标的最近公共祖先（form）而非按钮、吞掉整次提交」。原 bug 表现为弹窗包裹（`oas-modal`）内「校验失败 → 修正 → 再提交」时 `oas-submit` 不派发、弹窗不关、表格不更新（直连 oas-form 场景此前靠残留错误文案恰在点击前结算而侥幸通过）。`change` / `blur` 档保留，且这些档下已出错字段在输入时亦实时复校、改对即清。回归改用真实 `oas-modal` + 真实指针点击（原用例假 div + 合成 click 恰好绕过了本 bug）
- **oas-table 子元素声明通道 + 列内模板 + 列宽调整不再崩表**：`setColumnWidth` 的 JSON 回写会把 `cellTemplate`/`headerTemplate`（DOM 节点）序列化成 `{}`，重解析后渲染抛错整表 0 行；含模板时回写改为改声明源（子元素 width attribute，模板仍在）
- **oas-kanban 宿主定高后板体不再溢出**：板体补 `height: 100%`——此前宿主设 height 后板体按内容自长溢出宿主盒子、盖住后续兄弟内容，且「列体独立纵向滚动」不成立；泳道模式宿主定高时板体自身 overflow-y 兜底
- **modal.confirm 按钮文案 Firefox 下恢复生效**：自定义 `okText`/`cancelText` 改走 modal 的 `ok-text`/`cancel-text` 属性通道（直戳 shadow textContent 会被 Firefox 重渲染时序覆盖回默认文案）
- **hover-card / dropdown / tooltip 触屏点按在 Firefox 移动环境恢复可用**：Gecko 对 slot 裸文本节点的触屏命中会静默丢弃整串 touch/compat 事件致 click 不到——触屏 tap 切换改走 pointerup 通道（新增 shared/coarse-tap 统一 pointerup + click 去重，fine pointer 回纯 click 语义）
- **oas-snackbar hover 暂停在内容更新后不再失效**：hover 暂停监听由 shadow 内 box 改挂宿主节点——shadow 重建换掉 box 后旧监听消失、暂停静默失效导致提前关闭
- **oas-picker × oas-form 接入表单收集**：picker 注册进 oas-form 控件表——此前 `name` 的 picker 在 oas-form 提交 values 中缺席、required 形同虚设（picker.md 的「oas-form 提交」demo 实际失效）；同时默认 input 档下 `oas-change` 视为选择类控件的编辑事件（picker/select/slider 等只派 oas-change 的控件在默认档此前不触发字段校验、错误文案挂到下次提交）
- **oas-form 字段级异步校验 vs 提交跨路径竞态（独立 review 实抓并复现）**：默认 `input` 后每次击键都可能起一笔字段级异步校验；若用户在它落地前提交，其慢旧结果会在 `finalizeValidation` 之后写回，覆盖提交终态——表现为「提交通过却仍标红 / `getErrors()` 含幽灵错误」或「提交失败的错误被静默清掉」（该竞态在本批前仅显式逐键校验可达——`validate-trigger="input"`，或 `change`/`blur` 档下已出错字段的实时复校；本批因默认改 `input` 扩散为默认路径）。修法：提交与 `reset()` 为最高优先级，进入即作废全部在途字段级异步校验（`fieldValidateSeq.clear()`，其 `apply` 令牌比对随即失效，一并覆盖在途被移除/改名的字段）。补回归 I5（`oas-form.test.ts` 慢旧异步结果不得覆盖提交通过态）

## [2.5.8] - 2026-10-03

### 特性

- **oas-kanban RTL 逻辑方向化 + 键盘多选/移动**：列重排落点判定/指示线/键盘 ←→/触屏按钮语义与 aria-label 按 data-rtl 镜像；键盘多选 Space 切换选中（Ctrl+click 等价键盘路径，renderCard 内可聚焦元素 Space 让路）+ Alt+方向键移动（Alt+←/→ 换列尾部、Alt+↑/↓ 列内移动对齐 table 行重排先例；←/→ 选中集批量一条 oas-change 带 ids，移动后焦点回同 id 新卡）
- **oas-swatch-group 首帧时序防护**：静态 HTML 带 value 时组的首帧 update 可能先于子项 upgrade（白板子项调 syncSelected 即 TypeError）——判空跳过 + microtask 重试一次（防连锁重试风暴；全量包与 form 族包静态 value 首帧 e2e 固化）
- **theme 次级文字安全档 token**：新增 --oas-color-text-secondary-strong（light 混主文字色 88% 实测 5.15 达 WCAG AA；dark/high-contrast 原值已达标保持引用）——secondary on bg-hover 仅 4.39 不达 4.5 的既有债实例换用：table 多级表头 header-group / rate-off / check-off / 禁用行 + kanban 空列与空泳道单元格占位；a11y 基线 kanban 页违规归零、table 8→2、totals 276→265
- **core 断开重连重绑统一语义**：OASElement 新增 onReconnect 可选钩子——断开重连（append/re-parent/路由缓存摘挂）时 render 不重建（布局与内部状态保留）、仅重跑绑定恢复交互；oas-table（wrap 滚动/网格导航/行拖拽/单元格提示委托与 ResizeObserver）与 oas-kanban（shadow 根拖拽/点击/键盘委托）先行接线（thead 排序委托改类字段引用消除重复挂）；dropdown/menu/tooltip/select/date-picker 抽查确认「监听跟打开态走」模式天生免疫
- **oas-kanban 看板（新组件，data 族）**：`columns` / `cards` JSON 双通道声明式数据；卡片 HTML5 DnD 拖拽换列与列内排序（落点主色插入指示线，拖回原位零操作）→ 落定回写并派发 `oas-change`（detail { id, from, to, index }）；列头计数、列体独立滚动、空列占位（i18n ×10）；`renderCard` property 函数通道自定义卡片（Node 直挂 / 字符串防注入）；触屏降级移动按钮（pointer:coarse，上移/下移/移到指定列），移动菜单支持键盘操作（开菜单焦点移交首项 + 方向键漫游 + Home/End + Esc 回焦锚点）；卡片 tabindex=0 键盘可达（非空列体 role=list，空列不设 list 语义）。第一期不含：列拖拽重排、泳道、WIP 限制
- **oas-table 浮层组件编辑器通道（editComponent 第二期）+ multi-select 编辑器升级**：`editComponent: 'oas-select' / 'oas-date-picker'` 自动走浮层编辑器通道——进入编辑自动展开浮层（触发器驱动组件非受控开合，不写 `open` 受控属性）；浮层面板内指针交互（点选项/翻日历/搜索）不再触发失焦误提交（指针落在编辑器子树内的失焦被抑制：单值组件选定即提交、多选组件勾选为中间态失焦一次性提交）；Esc 双层级（浮层开着只关浮层，已关才取消编辑）；点击编辑器与浮层以外区域提交当前值；`oas-select` 编辑选项同步 `editOptions`（回落列 `options`）。`type: 'multi-select'` 列编辑器由第一期逗号分隔 input 升级为 `oas-select multiple`（选项同步、数组初值注入、提交回写字符串数组，清空全部勾选后失焦提交 `[]` 亦为合法值；历史逗号分隔字符串数据进入编辑时自动解析为选中集）；浮层编辑器的 document 级守卫（Esc capture / 指针抑制）随退出编辑、静默取消、宿主断开三路拆除不泄漏
- **oas-kanban 二期（列重排 + WIP 限制 + 卡片多选 + 泳道）**：列头拖拽手柄整列换序（聚焦后 ←/→ 同效；触屏 pointer:coarse 列头内左移/右移按钮，边界 aria-disabled；列间主色插入指示线，原位零操作），落定回写 `columns` 并派发 `oas-column-reorder`（detail { from, to, keys }，卡片数据不动）；列定义 `limit` WIP 限制——超限列头计数转 warning 色 + 列容器 `data-over-limit` 标记（提示语义非阻断，拖入照常落定；泳道下按列跨带合计，缺省/0/负数不限制）；卡片多选——Ctrl/Cmd 点击逐枚切换、Shift 点击同单元格范围选、空白处点击/Esc 清空、普通点击单选（选中态 token 色描边 + 主色弱底），多选拖拽移动全部选中卡并只派发一条 `oas-change`（detail 加 `ids` 数组，`id` 为首枚；触屏菜单仍只作用于所在单卡）；`swimlane-by` 泳道——按字段值横向分带（带头 = 折叠箭头 + 字段值 + 计数，默认全展开，折叠状态在数据变化时保留；缺失/空值归「（空）」带；空单元格显示占位），跨带拖拽改写泳道字段值（`oas-change` detail 加 `swimlane: { from, to }`），拖拽悬停折叠带头自动展开（不中断拖拽）；新 i18n 键 `kanban.groupEmpty` / `toggleLane` / `dragColumn` / `moveLeft` / `moveRight`（10 语言包）
- **oas-table 列 `type` 字段类型系统**：columns JSON 加 `type`——text / number（千分位右对齐）/ currency（货币符号）/ select（badge，`options` 配 value/label/color）/ multi-select（badge 组）/ date（YYYY-MM-DD）/ checkbox（只读勾选态）/ link（主色下划线新标签页，协议白名单防 javascript: 注入）/ progress（0-100 进度条）/ rate（0-5 星级）。编辑器复用既有通道（input 系原生 input、select 走 editor:'select'、checkbox 挂 oas-switch），回写类型按语义（数值/数组/布尔）；排序按列 type 数值序/时间序；自定义渲染（render/cellTemplate）优先于 type
- **oas-table `group-by` 分组视图**：按字段值分节（分节头 = 折叠箭头 + 字段值 + 计数，点击折叠/展开，状态在数据变化时保留）；空值归「（空）」组；分节头作为扁平行参与行虚拟滚动、整行 colSpan 全宽（与 column-virtual 正交）；排序作用于组内行；与 merge 列 / span-method / row-draggable 互斥（告警降级）；与 pagination 同用时为页内分组口径
- **oas-table `cell-tooltip` 单元格溢出提示（单例浮层）**：纯文本单元格溢出（scrollWidth > clientWidth）时悬停显示全文——表格级单一浮层实例（事件委托 + 视口夹取），不为每格创建组件实例；默认开启（`cell-tooltip="false"` 关闭）；滚动 / 重渲染自动隐藏
- **oas-table `column-virtual` 横向虚拟滚动（双向虚拟补齐）**：非固定列窗口化——DOM 只渲染窗口列 th/td，窗口外列以占位格 colSpan 归并（宽度由 colgroup 对应列求和，`table-layout: fixed` 强制启用——auto 布局把 col 宽当建议忽略、总宽塌缩）。列宽模型复用 virtual-list 的 HeightCache（横向换轴），全列显式 width（未设宽按预估 100px 定宽截断，文档注明）；约束（告警降级）：多级表头 / span-method / 合计行；固定列须两端布局（left 段 → 非固定段 → right 段）且恒渲染
- **oas-table-edit `editComponent` 组件编辑器通道**：列配置 `editComponent`（columns JSON 字段）指定任意 value 语义的 WC（库内 form 组件 / 宿主自定义组件同通道，优先于原生 editor）——双击挂载组件并注入当前值、`oas-change`/`change` 提交、Esc 取消。单元格编辑器标准化第一期（非浮层组件；浮层类编辑器后续批次）

### 修复

- **oas-table `editComponent` 通道端到端修复（独立 review 实抓）**：库内 form 组件此前完全不可用——提交事件并听 `oas-change`（库内组件经 core emit 统一前缀）与原生 `change`（宿主自定义 WC）；读值改 `getFormValue()` → value property → value attribute 三级兜底（旧版只读 attribute，而 oas-input 用户输入不回写 attribute，提交恒为初始值）；编辑器初值改 attribute + property 双通道注入。行虚拟 × 列虚拟双开横向滚动时同步重建 thead（表头不再滞留旧窗口列）；编辑单元格定位改 `td[data-col]` 查询（占位 colSpan 归并不再使索引错位）；编辑器失焦改监听 `focusout`（composed，shadow 内控件失焦可感知）；多行编辑器（textarea 内核）Enter 让路换行；列窗口起点扣除前置列与 left 固定段宽度（固定列右侧不再露空洞）；RTL 下 scrollLeft 取绝对值标准化；`setColumnWidth` 后列宽缓存即时失效；expand 列 colgroup 定宽与 sticky 偏移收敛为同一常量（40px）；列宽解析归一（兜底统一 100px）；容器尺寸变化（ResizeObserver）重算列窗口；占位格补 `aria-colspan` 且不入网格导航矩阵

- **`prefix` / `suffix` / `blur` 恢复 property 通道（input / input-number / statistic / countdown / tree-select / backdrop / mentions）**：这些属性名撞上 DOM 的只读访问器（`Element.prefix`）或方法（`HTMLElement.blur()`）。React 19 按 `key in el` 判定走 property 写入：`prefix` 撞只读 getter 会**抛错并崩掉整棵 React 树**，`blur`（backdrop）撞方法则**覆盖 `blur()` 方法且属性不落**（不崩但模糊失效）；`suffix` 无 DOM 对应（为对称与 property 通道一并处理），mentions 的 `prefix` 是 `trigger` 的遗留别名。现用 `Object.defineProperty` 在原型上遮蔽并映射到规范属性（`prefix-text` / `suffix-text` / `blur` / `trigger`），使它们在 React JSX / Vue 绑定 / HTML **全通道可用**（`prefix-text` / `suffix-text` 仍是规范名）；`blur` 被遮蔽后该元素的 `blur()` 方法被属性访问器取代（backdrop 无实际影响）。

## [2.5.7] - 2026-09-27

### 契约变更（升级前必读）

- **oas-sidebar 折叠态树形父项点击不再派发 `oas-select`**：折叠态嵌套父项点击（或悬停）现在打开 flyout 子菜单——此前点击会派发父项的 `oas-select`（父项不是可导航页面，属死交互的伪修复）。若你的宿主在折叠态依赖父项的 `oas-select` 做导航，请改为监听 flyout 内叶子项的 `oas-select`（事件契约不变，仅父项不再派发）。

### 特性

- **oas-divider 线型扩展**：`variant` 新增 `double-dashed`（双虚线）/ `double-dotted`（双点线）——复用 double 的「加高容器 + 双层」结构 × dashed/dotted 的 repeating-gradient 渐变（段长与单线版完全一致），层间间隙共用 `--oas-divider-double-gap`。仅水平布局生效（垂直方向线型为既有边界，含既有的 dashed/dotted/double）
- **浮层箭头形状 token 化（7 组件）**：tooltip / popover / popconfirm / dropdown / hover-card / tour / navigation-menu 的箭头新增 `--oas-<comp>-arrow-width` / `--oas-<comp>-arrow-height`（宽高独立——宽高比即三角的高与角度）、`--oas-<comp>-arrow-radius`（圆角）、`--oas-tooltip-arrow-align-offset` / `--oas-tour-arrow-align-offset`（`*-start/*-end` 对齐侧偏移）；tooltip 既有 `--oas-tooltip-arrow-size` 保留为回退别名；popover / popconfirm / dropdown 的 point-at-center 定位 clamp 改运行时读 token（形状与定位同一真源）；merge 独立 8px 几何不受影响
- **oas-swatch + oas-swatch-group（新组件，form 族）**：色板独立件——内联预设色快选/展示场景（不开 color-picker 面板）。色块件：color（预设名/任意色值）/size 五档/shape 三态（square/rounded/circle）/nothing（棋盘格底无色指示）/mixed（混色拼贴）/disabled/selected（选中环描边）/label（可访问名，i18n ×10）；选择组：单选 radiogroup / 多选 checkbox 语义（aria-checked 同步）+ value/multiple 受控 + oas-change + roving 键盘（方向键漫游 RTL 镜像 + Home/End + Enter/Space 选中）+ 空组/未命中值静默容错
- **oas-button compound 双行变体**：description 具名插槽副文本行——有内容时按钮切纵向双行布局（主行在上、副文本小号次要色在下）；高度自适应不锁尺寸档（与 wrap 同机制，副文本不溢框）；slotchange 动态增删跟随；loading/icon/href/disabled 既有契约全兼容；副文本自然进入可访问名
- **oas-sidebar 折叠态 × 树形子菜单不可达根治**：collapsed 下图标条内的树形父项改走 flyout 子菜单（主流侧栏惯例）——点击/hover 延迟开合 + 定位引擎锚定 inline-end（RTL 镜像）+ 碰撞避让 + Esc 关闭回焦/外部点击关闭/单开互斥 + 嵌套子树面板内内联展开；父项挂 aria-haspopup + aria-expanded，面板 role=menu / 子项 role=menuitem；折叠态 label 隐藏规则不再误伤 flyout 子项；打开期间页面滚动/缩放自动关闭（对齐浮层惯例）
- **浮层定位引擎零尺寸弹层不翻转**：popup 零尺寸（尚未布局/隐藏测量帧）时 fits 因 gap 恒 false 会误翻——RTL 下翻转把镜像抵消（sidebar flyout 实抓）；改为零尺寸跳过翻转；popconfirm/tooltip 两个依赖「零尺寸翻转」的既有测试桩扶正为真实尺寸
- **oas-tabs 标签级右键原生事件 `oas-tab-contextmenu`**（下游自建右键菜单通道）：右键标签（或聚焦标签按 Menu 键 / Shift+F10）派发可取消事件，`detail: { value, index, clientX, clientY, originalEvent }`；宿主 preventDefault 时内建菜单与浏览器默认菜单全抑止（capture 阶段阻断 manager 委托）；空白处右键不派发；键盘坐标取按钮中心；RTL 透传原生坐标；与 context-menu 属性无关恒派发
- **oas-tab-panel 新增 `title` 属性（悬停提示透传）**：透传 shadow tab 按钮为原生 hover tooltip——长标题截断时悬停看全文；ui-spec 原生全局属性吸收 pattern（tabs 读入缓存并从 panel 宿主移除，防 panel 内容区出现原生 tooltip）；宿主改写 title 按钮即时跟随更新并再次吸收；items JSON 通道 `title` 字段同效
- **能力缺口 P1 立项批（29 项增强）**：
  - **表单体系**：oas-form `disabled`（整表禁用，经 form-associated 通道并入不回写防自锁）/ `scroll-to-first-error`（校验失败聚焦首错字段并平滑滚动，reduced-motion 瞬跳）/ Rule.`validator`（自定义校验函数，property 通道，组合既有规则）/ `validate-trigger`（change 默认 / blur / input，规则级可覆盖）/ `initial-values`（初始值 JSON + property 双通道，reset 回初始值）/ 事件 `oas-values-change`（`detail: { name, value, values }` 全表快照）；oas-checkbox `true-value` / `false-value`（勾选映射值，对齐 switch；group 内不生效）；oas-select `label`（触发器 aria-label 命名）；oas-button 原生表单提交属性组（`html-type` submit/reset + `form`/`formaction`/`formmethod`/`formnovalidate`/`formtarget`——shadow 按钮经点击期临时代理 submitter 桥接原生激活行为，loading/disabled 不触发，href 模式静默无效）
  - **输入一致性**：oas-input `autofocus`（转发内层聚焦）/ `autocomplete` / `inputmode`（透传）/ `loading`（行尾 spinner + aria-busy 不禁用输入，优先于 clear 钮）；oas-input-number 事件组 `oas-focus` / `oas-blur` / `oas-input`
  - **弹层浮层**：oas-modal `z-index`（显式层级叠加 base，dialog 比 mask 高 1）；oas-drawer `height`（纵向抽屉高度，优先 width/size）+ 事件 `oas-cancel`（取消语义关闭 `detail: { source }`）；oas-auto-complete `variant` + `oas-focus`/`oas-blur`；oas-cascader `loading`（spinner + 面板加载占位）/ `field-names`（字段别名，对齐 tree-select）/ `oas-focus`/`oas-blur`
  - **数据导航**：oas-select `variant`（outlined/filled/borderless，对齐 input）；oas-table `show-header`（false 不渲染表头行，列配置仍对齐数据行）；oas-tabs `actions` 插槽（标签栏右侧操作区，滚动区外固定）；oas-tree 事件 `oas-expand` + 拖拽生命周期事件组（`oas-node-dragstart/dragover/dragleave/dragend`，drop 契约不变）；oas-calendar `range`（两段式范围选取 + 悬停预览 + 区间高亮，`detail: { start, end }`）；oas-carousel `draggable`（拖拽跟手 + 25%/速度阈值翻页否则回弹）；oas-menu `open-on-hover`（vertical/inline 父项 hover 150ms 延迟开 / 300ms 延迟收，点击路径不变）
- **能力缺口 P2 立项批（31 组/38 条长尾增强，约 70 个新 API）**：原生透传补齐（input `min`/`max`/`step`/`minlength`/`pattern`/`spellcheck`、textarea/combobox `autocomplete`、checkbox/tabs `tabindex`、avatar `srcset`、image `width`/`height`/`referrerpolicy`）+ 插槽开口（button `loading-icon`、calendar `header`、select `prefix`/`suffix`/`suffix-icon`/`clear-icon`、date-picker `prefix-icon`/`suffix-icon`、input `clear-icon`、cascader `option`/`suffix-icon`、tree-select `suffix-icon`、table `filter-icon`）+ 尺寸档位族（form 表级 `size` 全字段下发（core injectValue 通道 + formSizeCallback 动态重渲染）+ steps/timeline/tree/text/dropdown size）+ 表单长尾（form `colon`/`validate-messages`、form-item `help`/`status-icon`、radio-group `required`（升级为 form-associated）、slider `label`）+ 弹层长尾（drawer `no-mask`、affix `z-index`、auto-complete/cascader `placement`、date-picker `separator`/`default-time`、time-picker `hide-disabled-options`/`label`、dropdown `max-height`、tabs `actions` 之外补 `tabindex`）+ 数据组件增强（table `table-layout`/`hover`/`indent-size`/`row-expandable`/`max-height`/`oas-cell-click`/`oas-row-dblclick`、tree `block-node`/`selectable`、list `hoverable`、card `disabled`/`orientation`、descriptions `items` 数据通道、grid 双轴 gap/`collapsed-rows`/item `flex`/`push`/`pull`、transfer `pagination`/`oas-scroll`、splitter `disabled`、sider `width`、badge `shape`、carousel `trigger`、menu `disabled`/`selectable`/`persistent`、select `input-value`/`show-arrow`/`autofocus`/`default-active-first-option`/`loading-text`/`reserve-keyword`/`auto-width`/`hint`/`oas-create`、tree-select `input-value`/`label-in-value`、input-number `autofocus`/`decimal-separator`/`variant`/`align`、upload `oas-progress`）——语义覆盖为准，命名一律走本库 kebab-case / `oas-*` 惯例

- **能力缺口 D 类立项批（27 条）**：新组件 **oas-highlight**（文本命中高亮：多词/JSON 关键词 + 大小写/整词/重音三开关 + mark 命中渲染 + oas-count 事件 + SSR 直出）；oas-code 行高亮/行聚焦/diff/max-rows 折叠；oas-icon iconfont-url 远程加载 + registerIconAlias；oas-auto-complete/oas-cascader virtual 虚拟滚动；oas-date-picker/oas-time-picker timezone 时区锚点；oas-input mask 输入掩码（跳字面量/粘贴过滤/退格停字面量/mask-raw 原始序列提交）；oas-select hide-selected；oas-popover same-width；oas-table exportable 导出（CSV/Excel）/grid-navigation 键盘网格导航/row-draggable 行拖拽排序；oas-form 嵌套 name 路径 + **oas-form-list 动态字段组**（min/max/disabled + 自动索引化 + 主表联动校验提交）；oas-menu searchable 过滤 + 菜单项 shortcut 标注；oas-tree check-all 三态全选；oas-list sortable 行拖拽；oas-carousel thumbs 缩略图指示器；oas-splitter snap 吸附档位；oas-progress vertical；oas-masonry sequential；oas-modal maximizable（最大化等同 fullscreen 语义 + oas-maximize）；oas-calendar calendar-system 非公历历法（Intl 透传）+ months 多面板；oas-color-picker recent 最近使用色；oas-slider 多滑块泛化（N 元数组 → N 把手，range 为 N=2 特例）；oas-marquee max-loops 限定循环 + oas-finish + RTL 镜像复核；oas-upload crop 图片裁剪（内建对话框：比例锁定 + 缩放 + canvas 离屏导出 + oas-crop）。D11 chart 雷达图按「chart 不深挖」既定决定不立项

### 变更

- **oas-stepper / oas-stepper-panel 进 DSD 白名单**（v2.3.2 遗留「后续批次」补位）：whitelist 129 tag、快照直出（steps JSON 标题 + current 联动面板 hidden 同步）+ 真水合（upgrade 后 style 同对象、指纹清理）+ 升级后点击步骤头切面板 e2e 固化；docs ssr.md 白名单清单同步
- **RTL 全量视觉审计（117 组件页 sweep + 识图 triage）**：新增 `scripts/e2e/rtl-audit.mjs`——LTR/RTL 双跑几何检查取差集（横向溢出/demo 越界）、整页截图产出供识图复核；`dir=rtl` 于文档解析期注入（真实 RTL 应用形态），文档站壳层中性化排除站点自身噪声。几何层 117/117 全净；识图 triage 候选经 DOM/几何量测逐项定责后修复 5 处：
  - **oas-pagination RTL 箭头镜像**：页码序由 flex 随 dir 自动右→左，但 `‹«›»` glyph 不自翻、指向背离目标页；新增 `data-rtl` 钩子 + 方向箭头钮 `scaleX(-1)`（`prev-icon`/`next-icon` 自定义图标一并镜像）
  - **oas-scroll-area RTL 横向 thumb 锚定**：原 `|scrollLeft|/max` 映射静止态贴左缘（呈「已滚到底」观感）且拖拽逆指针；翻正为书写起点锚定（静止贴右缘）+ 拖拽与指针同向
  - **oas-theme-editor 色值 LTR 隔离**：hex/颜色函数/token 名是 LTR token，RTL 宿主下被 bidi 重排（`#d97706` 显成 `d97706#`、`color-mix(...)` 逗号乱序）；色值输入框/只读值/token 名标签固定 LTR
  - **oas-upload `template[slot="trigger"]` 克隆通道**：native slot 对 template 元素不生效（inert），自绘触发 demo 双向整块空白；补克隆通道（slot 隐藏 + `.trigger-tpl` 渲染，zone 点击仍打开文件选择）
  - **oas-typography `actions-position="start"` 失效修复**：`order: 0` 与文本缺省 order 平局被 DOM 序裁决，start 从未生效（LTR/RTL 双坏，RTL 审计对比 start/end 两组无差异实抓）；改 `order: -1` 严格前置
- **oas-qrcode 形状化渲染体积优化（rounded / dots）**：数据区由逐模块 `<use href="#oas-qr-mod">` 改为「合并路径 + 1×1 `userSpaceOnUse` pattern 网格平铺原型」——渲染几何与逐模块绘制逐像素等价（visual 基线零漂移），产物体积回落 square 量级（145×145 码实测约 88.3 KB，旧方案约 323.8 KB，约 1/3.7；与 square 合并路径仅差 +157 B）
- **oas-qrcode 渐变 × 形状化修复**：`gradient` 与 `dot-shape=rounded/dots` 同用时，`objectBoundingBox` 渐变会在 pattern 内容里逐模块解析（每个码点各自套全渐变）→ 转为 `gradientUnits="userSpaceOnUse"` 映射进模块区域，渐变跨整码连续；square 缺省形状渲染零变化
- **RTL 交互态轮（20 浮层组件真 RTL 打开态 sweep）**：面板全部在视口内、方向镜像正确；实抓修复 **oas-time-picker** 弹层内容撑宽后 end 对齐右溢 27px（打开瞬间 spinner 列未撑开按旧宽算 left——挂 ResizeObserver + 一帧后复位重定位，LTR 右缘场景同病）
- **文档站 code 元素 bidi 方向隔离**：`.vp-doc code` 加 `direction: ltr; unicode-bidi: isolate`——code token 自成 LTR 隔离区（RTL 下 CSS 变量名/函数括号不再乱序，LTR 零观感变化）
- **vitest 关闭隔离尝试回退**：`poolOptions` 在 Vitest 4 已移除（曾误设 `poolOptions.forks.isolate=false`——死配置）；改顶层 `isolate: false` 真关后跨文件模块状态共享击穿 18 条用例（capability 注册表 / vi.mock 泄漏 / 计时态），不值得为 ~15% wall 逐个扶正——已回退默认逐文件隔离，engineering.md 立档前提
- **oas-carousel 拖拽默认行为调整**：PC（fine pointer）默认关闭拖拽切换（此前恒可拖），触摸设备（coarse）默认开；`draggable` 属性显式开 / `"false"` 显式关——PC 上依赖拖拽手感的宿主请显式加 `draggable`
- **oas-select searchable 选中后默认清空搜索词**（对齐 tree-select 既有契约；保留关键词请显式 `reserve-keyword`）
- **oas-date-picker datetimerange 缺省端点时刻**：值缺时间部分/空值时终点默认补 `23:59:59`（原 `00:00:00`；`default-time` 属性可显式控制两端）
- **oas-radio-group 升级为 form-associated**（P2 required 落地附带）：有 `name` 时组值参与原生 FormData 收集 / `form.reset()` / fieldset 禁用链——向后兼容（无 name 不提交），但依赖「组从不进 FormData」的宿主需留意
- **oas-steps medium 档基准字号 13px→14px**（对齐 stepper 同构密度，其余档不变）

### 修复

- **oas-modal `no-mask` 的 `aria-modal` 语义修正**：非模态（页面可交互）时硬编码 `aria-modal="true"` 会向读屏谎报模态——改为动态（no-mask → false；对齐 dialog.show() 语义与 drawer 的既有修复一致）
- **oas-context-menu `kind="checkbox"` 勾选项链路断裂**（新增 kind demo 时浏览器实抓）：宿主 `value` 从不下传给内层 menu（初始勾选态永不回显）、勾选切换不写回宿主（勾选态丢失）、勾选即关菜单（违反「勾选切换不收起」惯例）——补齐 value 下传 + 勾选写回 + checkbox 切换不收起，转发 detail 带 `checked`；存量「宿主不写回 value」测试锁的正是缺陷行为，已扶正
- **oas-input 未提交输入被无关 update 抹掉**：typing（未提交）期间任何属性变化触发的 update() 都会从 value 属性回写内层 input——用户正在输入的文本被旧属性值覆盖（loading 远程校验主场景实抓：校验请求发出 loading 开、响应回来 loading 关，期间输入全丢；status/size 等切换同病）。改为「value 属性实际变化才回写」（未提交输入保护），受控写回路径不变；单测 + e2e 固化
- **`[hidden]` 兜底全量收口（79 文件/66 组件实证）**：`:host { display }` 是 shadow 作者样式，来源压过 UA `[hidden]` 规则——凡 :host 设 display 而缺 `:host([hidden])` 兜底的组件，宿主写 `hidden` 仍可见。CDN 全量实测 163 组件中 66 个失效（含 button/icon/tag/input/select 等高频件；2.5.6 曾按报障收口 8 处，系症状驱动的局部收口）；本次全量补齐同类规则，另修 oas-grid 内联 `display` 压过兜底、oas-anchor-target（单文件多组件漏网）两处边角。新增 style-conventions 源码级守卫（逐样式字面量粒度，防新组件再漏）+ 实测 sweep 复验归零

## [2.5.6] - 2026-09-23

### 特性

- **oas-qrcode 美化维度**：新增 `dot-shape`（square 默认 / rounded / dots）、`corner-shape`（square 默认 / rounded）、`gradient` + `gradient-angle`（2–3 色 JSON，CSS 约定角度，生效时覆盖 `color`）、`icon-hide-dots`（中心 logo 覆盖区码点挖空）。渲染拆纯函数层 `shapes.ts` 并与离屏下载共用同一核心（顺带修复 `download()` 调用已移除的旧渲染器，运行即抛 `matrixToPath is not defined`）；square 沿用 run-length 合并单 path，rounded/dots 走 defs 几何原型 + `<use>`；默认配置下 `dataPath + finderPath(square)` 覆盖集合与旧 `matrixToPath` 逐模块等价（可扫性不退化，区域级断言兜底）
- **表单类组件 form-associated（原生表单集成，15 组件）**：core 新增 `OASFormElement` 基类（`static formAssociated = true` + `attachInternals`，不支持环境静默降级）——`<label for>` 原生关联（label 点击转焦点到 shadow 内真实控件；勾选族对齐原生「激活控件」切换+聚焦；upload 激活文件选择器）+ 原生 FormData 收集（文本族当前文本 / 勾选族勾才提交 / 多选同名多条 / date·time 范围 `name-start`+`name-end` / upload File）+ `form.reset()` 回初始值（不派发事件）+ `fieldset[disabled]` 联动（不回写 `disabled` 属性防自锁，经 `injectDisabled` 通道并入）+ `required` 原生校验链（valueMissing，i18n `form.valueMissing` ×10 语言包，`:valid`/`:invalid` 伪类）+ 外部 label 命名转发（label 文本复制为内层 `aria-label`）。落地：input / textarea / input-number / checkbox / radio / switch / select / combobox / auto-complete / tree-select / mentions / date-picker / time-picker / upload，与 `oas-form` 自研 `collectFields` 并行可用
- **oas-sidebar 抽屉开合方法公开**：`openDrawer()` / `closeDrawer()`（原 private）——编程控制移动端抽屉，等价于点击内置触发钮/遮罩/Esc；幂等、桌面态自动回收、写入 `drawer-open` 受控属性

### 契约变更（升级前必读）

本批含三类**非 JS API** 的对外契约变更（属性/事件签名未变），升级前请核对：

- **ARIA 语义**：`oas-card` / `oas-list-item` 不再挂缺省交互角色（`role=button/checkbox`）——可点/可选卡与可点行内常嵌操作控件，缺省角色会把它们裹进交互元素（`nested-interactive`，屏幕阅读器丢失内部控件可读性）。需要行级/卡级交互语义时，由宿主显式挂 `role`（组件不覆盖宿主显式角色）并按需自行同步 `aria-checked`；`oas-editable` 只读展示态由 `role=button` 改为 `role=textbox` + `aria-readonly`；`oas-radio` 只读由 `aria-readonly` 改为 `aria-disabled`（radio 不支持前者）。
- **token 语义**：语义色/预设色的 `-text` 变体（如 `--oas-preset-red-text`）现在同时承担「文字色」与「实底底色」（tag、badge、avatar、toggle 的实心与选中态）——只覆写 `--oas-preset-*` / `--oas-color-*` 本色的换肤不再影响这些组件的实底与文字，请改为覆写对应 `-text` 变体。另新增 `--oas-color-primary-text`（primary 的文字安全档，值与 `-active` 相同，交互态仍用 `-active`）；自定义 hex 色的文字安全档改为随主题方向的混合（内部 token `--oas-deep-mix` / `--oas-deep-sink`）。
- **Shadow DOM 结构**：`oas-splitter` 的分隔条外层新增 `.sep` 包裹层（折叠按钮与 separator 同级，消除交互嵌套），`[part="splitter"]` 的宽度语义由 `.sep` 承接；`oas-progress` 内嵌文本（`::part(inside)`）的父节点由 `.track` 变为 `.bar`（文本只压在已填充段内，填充过窄时自动隐藏）。依赖这些结构的宿主 CSS / `::part` 选择器需相应调整。

### 无障碍

- **感知对比度门禁（零容忍，light + dark 双主题）**：117 页 × light/dark 双主题，共 2.4 万+ 文本节点（单主题约 1.2 万），逐节点取 axe 解析出的文字/背景实测色，用自实现的感知对比度公式打分——**`<60` 一个节点都不允许**（`<45`/`<30` 同为零）；禁用态文字（含 opacity 淡化合成档）按 WCAG 豁免并在门禁单列计数；门禁自带「注入低对比文本必须被捕获」自检与「color-contrast 不得进页面级豁免」防绕过守卫
- **存量对比度债务全量清偿**（实测 `<60` 由 655 → 0，暗色另有 327 → 0）：浅底文字统一改用主题 `-text` 文字安全档（亮/暗主题各自定义，替换「基色掺黑」启发式——后者在暗色下会反向压暗）；实底浅色（预设色 tag / badge / avatar / toggle 选中态、code inline solid）改用 `-text` 档作底；自定义色（hex）的「文字安全档」改为 theme-aware 混合（新内部 token `--oas-deep-mix` / `--oas-deep-sink`：亮色掺近黑、暗色掺近白），并同步把 button/popconfirm 等残留的 `color-mix(… %, black)` 实底派生改为掺 `--oas-color-text-primary`
- **暗色调色板与被测面修正**：暗色次级文字提亮（`#b8b8c0 → #c6c6ce`）、预设蓝 `-text` 提亮、docs 站内联 `<code>` 与引用块暗色配色（原 Vitepress 默认色在暗底上贴线/不达标）、grid demo 暗色梯度重排
- **预设 `-text` 安全档改为规则推导（OKLCH 亮度阶梯 + 多约束 + 守卫锁死）**：替代逐值手调（手调曾拆东补西——gold 改值躲 gold↔orange 撞色却让 gold↔lime 从 61 缩到 49.7）。真源 `packages/theme/oklab.ts`（自写 sRGB↔OKLCH，零新依赖）：锁色相 ≤12° 只在 L 取档；双底对比度 ≥65；相邻组（gold↔orange 等四对）ΔE ≥8；任一 `-text` 在 elevated 底上 ≥60 硬闸；冲突退让只在更安全方向取样。light 改 2 值（green/geekblue 加深）、dark 改 7 值（orange/gold/lime/green/cyan/blue/geekblue 提亮）；style-conventions 守卫锁死 + 对比度公式收敛单一真源（a11y.spec 改从 theme/oklab 导入）（对齐亮色「浅底深字 / 实底浅字」两段式）、label/link/code 三个 demo 的写死 hex 改用 token（写死 hex 数学上无法两主题同时达标）
- 覆盖面：tag / badge / avatar / toggle-group / toggle-button / breadcrumb / message / switch / list 选中行描述 / tree / transfer / checkbox / steps / rate / log / code / typography / popconfirm / theme-editor / alert / button / anchor / sidebar / menu，以及 grid、container、flex 三个 demo 的自绘配色（含 demo 引用不存在 token `--oas-color-primary-text` 的真 bug）
- **axe 比值法（WCAG 2.x AA 合规参照）改走 ratchet 基线**：存量违规只许降不许升、逐批清偿，与感知门禁并行看守（合规线与体验线分开盯）

### 修复

- **可点 / 可选容器不再挂缺省交互角色**（card、list）：可点卡与可点行内常嵌操作控件，缺省 `role=button/checkbox` 会把内部控件裹进交互元素（axe nested-interactive，读屏丢失内部控件可读性）；宿主显式角色（多卡组 `role="radio"`）仍同步 `aria-checked`，原有用法零变化。**此为有意的设计取舍而非回归**：组件缺省不再向读屏宣告 button/checkbox 角色，需要选择语义时由宿主显式挂 `role`（组件叠加 `aria-checked` 同步）
- **list 可点行与行内控件双触发**：点行内开关、按钮不再同时触发整行 `oas-click`（补 composedPath 内部交互排除，键盘路径同步生效）
- **qrcode 图形语义归位**：`role="img"` + `aria-label` 从容器挪到 `<svg>` 自身，解除与容器内刷新按钮的交互嵌套
- **splitter 折叠按钮移出 separator**：按钮与分隔条同级挂在新增 `.sep` 容器、索引由 `data-splitter-index` 携带，消除交互嵌套；折叠面板禁用滚动（0 尺寸滚动区既不可用又触发 scrollable-region-focusable）
- **progress 内嵌百分比文字**：由横跨「填充 + 轨道」改为只压在已填充段（填充过窄时整段隐藏）——原实现白字压浅色轨道，实测感知分 0
- **oas-marquee 循环接缝顿挫三连修**：克隆份与源份渲染宽不等（每轮回跳一个空格宽）；相位跳变；克隆份改走 light DOM（继承页面样式）+ 份数口径修正 + reverse 切换相位连续
- **`[hidden]` 兜底收口（8 处）**：作者级 `display` 声明压过 UA `[hidden]` 规则的同类缺陷，全库清查补齐
- **真机视觉复核 7 处修复**（含 2 处存量缺陷）+ oas-masonry items getter 契约修复
- **oas-input addon 槽放自包含控件时改贴合形态**：修复 append 槽放 `oas-button` 时按钮左右各 12px 灰带、四角 6px 未与外框合并（双层圆角嵌套）、托盘与输入框上下 1px 台阶——根因是 `.addon` 无条件 padding（本为文本 addon 留位）且未向被分发按钮注入圆角合并协议；识别自包含控件（oas-button / oas-button-group / oas-compact）打内部标记，仅标记存在时归零 padding、去自身底/边、按尺寸档对齐控件高度、-1px 压边成单线并注入 `--oas-button-group-radius`

### 工程

- **API 工具链**：反向缺口治理（跨目录基类扫描 + `@apiProperty` 通道 + 双向 0 门禁）；API 语料进 pre-commit；docs 双语镜像守卫；qa-regression 覆盖回填 8 组件
- **ui-spec 新增「命令式开合 API 约定」**（抽屉/浮层类公开方法的统一形状，sidebar 为首个落地件）

### 文档

- form 页新增「原生表单集成」集中 demo（label for + FormData + reset + 15 组件支持清单，中英双版）；12 组件补 required 演示块
- qrcode 文档补形状/渐变两节 demo（中英双版）；`error-correction` 说明修正（四级均已实现，非仅 L 级）

### 测试

- tooltip 三个 hover 跟随用例改「关动画 + 等 DOM 静止 + 轮询断言」，消除并行下的时序抖动

## [2.5.5] - 2026-09-17

### 修复

- **oas-select 触发器 chevron 图标被写坏（自 v2.5.1 起带病发布）**：内联 chevron 的 path 存在写字笔误——标准 V 形（`M4 6 L8 10 L12 6`）后多出一段回折线 `L4 12`，图标渲染成乱纹（实测路径几何长度 21.31 vs 规范 V 形 11.31）。修复 path，并**新增源码级守卫**：`style-conventions.test.ts` 扫描全部组件内 `class=chevron` 的 path 必须与 `@oas-ui/icons` 的 `chevron-down` 一致（含检测器自检 + RED/GREEN 实证），堵住「visual.spec 只截图不做基线比对」导致的漏检路径
- **oas-button-group `pill` 胶囊端整形**：端部改由组容器承担（`radius-full` + `overflow: clip`，端弧半径按容器较短边夹紧）——横向 / 纵向宽钮 / 纵向窄高钮都得到真正的半圆胶囊端（原逐按钮各自圆角在「端边 == 短边」时只圆到 1/4，退化成圆角矩形 / 半椭圆）；纵向胶囊端钮外侧内边距收口为 `space-4`（内侧与左右维持 `space-2`），消除「文字钻进弧形端」的观感
- **文档站语言适配两处回环**：①首访适配脚本与 theme 的 lang watcher 互踢——zh 浏览器整页打开 `/en/` 深链会无限整页跳转（dev 实测 4s 内 40+ 次 load），改为只在用户「实际切换」时持久化偏好，首屏落地只同步 i18n、不写偏好槽；②`/en/` 前缀改为**显式语言指定**、整页打开一律保持英文，不再按浏览器语言回弹（优先级：显式路径 > 偏好 > 浏览器探测），`/en/` 页不再产生任何整页跳转

### 文档

- **radio / checkbox 自定义指示器示例重做**（修 dev 下选中态图标空白、跨引擎看不清选中态）：内联 `<template slot="checked-icon">` 的**内容**在 vitepress dev 下被 Vue 编译管线吞空（template 元素尚在、innerHTML 为空，生产构建正常——此前只在 preview 验证故漏掉），示例改用组件的**直接元素**通道 `<svg slot="checked-icon">`；把写进 SVG 表现属性的 `var()`（跨引擎脆弱，部分引擎回落黑色）改为 `currentColor` + `::part(indicator-checked)` 上色；弃用 `mask` 剪影方案（mask 重置在部分引擎不生效会整块空白）；radio 两态自定义示例改为同形星标（未选灰 → 选中主色）并补「自定义指示器是**项级开关**，组内统一样式需每项都带插槽」的说明
- README（根中英 + `@oas-ui/ui` 中英）补官方示例模板站链接（多套可直接复用的中后台场景）

### 优化

- **`perf:size` / `perf:bench` 默认只测不写**：两者原先每次运行都用当前环境实测值改写入库的 `docs/perf-baseline.json`（本地跑一次就脏一个 tracked 文件，gzip 字节跨 zlib / 平台存在差异），改为默认只测量并打印结果，更新基线需显式加 `--update-baseline`；engineering.md §4 同步

## [2.5.4] - 2026-09-16

### 特性

- **oas-app-bar（新组件，应用栏）**：页面/工具区顶部的应用栏布局条——标题（属性/slot 富内容双通道）+ leading 汉堡钮（`oas-menu-toggle`）+ `slot="actions"` 操作区 + 超宽 overflow「···」收纳（RO 驱动、镜像回派）+ `hide-on-scroll` 滚动折叠 + `slot="extended"` 扩展区（滚动收起）+ `position="static|absolute|fixed|floating"` 四形态 + `elevated` 滚动投影；RTL 逻辑属性 + coarse 触控 44px；role=banner + aria 全同步；SSR/DSD 双路径。i18n 新增 `appBar.*` 4 键（10 语言包齐全）
- **oas-float-button 家族扩展**：`mode="single|group|menu"` 三模式（分组 slot 子钮带 label 气泡与角标、菜单模式 actions JSON 弹出选择并派发 `oas-select`）；受控 `expanded` + `oas-expand-change`；`trigger="click|hover|manual"`；`expand-direction` 四向（RTL 横向镜像）；子钮/主钮链接化（href/target）；徽标状态点与数字 99+ 封顶；Esc/外点收起回焦、reduced-motion 降级
- **oas-editable 原地编辑**：展示态与编辑态同尺寸原地切换——无缝输入框（透明底、聚焦显形）+ 镜像宽度自适应（输入框随内容宽度，不跳版）；展示态富内容模板支持迟到填充（`content` 变更观察）
- **RTL 第二批（方向键镜像 + 面板逻辑化收口）**：6 组件水平方向键 RTL 换向（carousel 双键盘域 / stepper / bottom-navigation / toolbar-toggle / image 图集翻页 / tree 展开收起键）+ carousel 轨道位移取反与 prev/next 箭头逻辑属性镜像 + tree 收起箭头 `data-rtl` 镜像 + scroll-area 方向判定收敛 `shared/direction` 单源（废弃私有实现；语义变化：config-provider 注入现优先于最近祖先显式 `dir`，与全库一致）+ 浮层面板残留物理 CSS 逻辑属性改造（select / auto-complete / combobox / mentions / cascader / tree-select / date-picker / time-picker / tour / dropdown split 接缝与圆角 / menu 间距缩进 / table 表头与过滤面板 / slider / collapse-item / theme-editor）+ 约定守卫：全库物理方向 CSS 白名单化，白名单（placement 基向箭头绘制、物理命名 API、内容 LTR 锁定、成对对称）之外新增一律红灯
- **API 规范统一**：**size 档位跨词表别名互认**（`shared/size` 单源——五档全称/缩写在任何组件等价接受，别名不告警，内部规范化输出不变；button/tag/badge/stepper/pagination/float-button 首批接入）+ **事件同名归一**（drawer/modal 关闭动画完成增派规范名 `oas-after-close` 对齐 after-* 家族、upload 超限增派 `oas-exceed-limit` 对齐 checkbox-group/select/toggle-group——旧名 `oas-closed`/`oas-exceed` 保留为兼容别名双发，API 表标注【兼容别名】；ok（对话框）/confirm（选择器）分工写入 ui-spec）+ **阴影三档 token**（`--oas-shadow-sm/md/lg`，light/dark 双变体；28 处裸海拔阴影迁移 + 收口批次 21 处浮层 `color-mix` overlay 迁移，方向性投影/inset/形状描边豁免并写入 ui-spec §1.1）
- **感知质量收口**：CSS 变量引用守卫（无 fallback 且全库无定义 → 红灯）+ 7 处存量裸 token 补 fallback（table 2xs/weight-medium、message ease-in、notification radius-rounded、tour text-tertiary/fill/base）；a11y 审计改为自动收集全部组件页（原手选 26 页），存量违规建台账

### 修复

- **oas-carousel 卡片模式 RTL P0×2**：卡宽取反符号错误致 RTL 下当前卡偏移、拖拽 delta 未随方向取反致 RTL 拖拽方向相反（含松手阈值镜像）
- **oas-float-button 展开焦点管理**：`syncExpanded` 抢占宿主焦点、选择后不回焦、节点重建丢焦三处修复；补 DSD/水合测试
- **oas-editable 两处模型缺失**：展示态 `[hidden]` 规则缺失致编辑框与文本并排（非原地）；展示态自定义模板迟到填充不渲染（Vue 先渲染空模板）
- **oas-stepper 横向连接线 RTL 镜像缺失**（视觉复核实抓）：连接线用物理 `left:50%; width:100%` 单向延伸且无镜像——RTL 下绿/蓝线段画到上一步、第一步骤多出悬空线到容器边缘、末步骤缺线；改 `inset-inline-start` 随书写方向自动镜像（`oas-steps` 同类线已有 data-rtl 镜像块，仅 stepper 漏网）
- **oas-table 死 token**：`--oas-color-primary-soft`/`--oas-color-danger-soft`/`--oas-shadow-md` 三处引用改为主题化 `color-mix` 回退（原为未定义变量，被 token 守卫判红）
- **oas-slider 纵向拇指 hover 放大从未生效**（死选择器）+ hover 能力守卫补位
- **oas-toggle-group 纵向贴合首项右上角为直角**
- **oas-snackbar 阴影入 token**；抽屉/对话框打开侧事件对称（补 `oas-after-open`）
- **core translator 广播隔离**：locale 切换通知循环中单个监听者（组件文案刷新回调）抛错不再阻断其余监听者——修复前一个组件刷新异常会让全库 locale 切换失效
- **oas-speed-dial 展开自动聚焦失效（键盘可达性）**：`.actions` 的 visibility 在过渡列表中离散翻转（过渡期末端才生效），`syncOpen` 展开后立即 `focus()` 落在不可见元素上静默失败，真实浏览器中焦点留在主钮——展开向 visibility 改为立即翻转（无过渡），收起向保留延迟（淡出完成后再隐藏），两侧动画语义不变；回归断言收紧为「焦点必须落在首个子动作」
- **oas-float-button `trigger="manual"` 完全受控语义**：外点与 Esc 不再自动收起（收起由宿主 `expanded` 属性全权驱动），修复受控 demo 切换钮与文档级捕获监听打架；demo 宿主补定位上下文（展开层锚定主钮）+ 回归固化「展开层相对主钮偏移」断言
- **SSR/DSD 逃生口用例 flake 根治**：JS 冒泡派发 + shadowRoot 查询；SSR 白名单补 `oas-app-bar` 与 DSD 验收 fixture，白名单文档对齐源码

### 文档

- **API 表工具链补全（面板出口自动化）**：CSS 变量出口收割进 `docs/api-manifest` → API 表新增「CSS 变量」组（平衡括号扫描不漏变量、源码声明值兜底、组件作用域 theme token 放行、同前缀数字出口折叠为 `{1..N}`）；插槽收割补 light-DOM 标记式（`[slot="x"]`）与代码式（`getAttribute('slot')`）读取，去重归一形式、排除内部保留标记与内部管线插槽
- **全库 API 段统一版式**：所有组件页统一为 `### oas-xxx` + `#### 属性/事件/插槽/CSS 变量`（单/多标签同一生成路径）；CSS 变量表按需增列「说明」；补齐 68+ 条插槽说明与关键组件变量说明（spin/steps/sidebar/notification/tag 等），旧手写重复段由生成器认领消除
- **英文 demo 页缺块补齐**（6 组件）中英块数全对齐；`ssr` 边界说明、bottom-sheet 文档页与侧边栏/总览接线

### 优化

- perf 预算重定档（cdn/全量入口天花板、table/theme 分量重定；闭包测量只计静态导入，动态 `import()` 不计初始负载）
- `pnpm release:check` 版本一致性硬校验脚本 + pre-push 钩子（tag 指向版本不一致拒推）

## [2.5.3] - 2026-09-14

### 特性

- **RTL 逻辑方向化（全组件批次）**：在 v2.5.2 方向解析基建上全量铺开——浮层定位接线补全（avatar-group / table / popconfirm / popover / tooltip / color-picker / cascader / dropdown / tour 统一传 `direction`，RTL 下主轴与对齐自动镜像）；hover-card 自研定位接镜像；menu 级联子菜单逻辑 inset + 翻转判定接 isRtl；全库物理方向 CSS 逻辑属性改造（input/transfer/menubar/navigation-menu/table/timeline/code 等）；方向敏感行为镜像（switch knob / slider 滑选 / rate 半星 / segmented·toggle-group·radio-group·dynamic-tags·tabs·toolbar·navigation-menu 方向键 / steps 序号与 arrow 形态 / sidebar 折叠与拖拽 / splitter 拖拽 delta / page-header 返回箭头）；代码块与数学公式内容保持 LTR 不镜像；显式物理 API（badge corner、float-button 位置、drawer/timeline/sidebar side 等）保留；`dir` 属性观察触发重判定（运行时切方向即时生效，`dir` 为全局约定属性不进 API 表）

### 修复

- ellipsis 3 处断言对齐 i18n「开箱即用」默认翻译行为（方向接线使 i18n 模块进入其模块图后，t() 返回 zh-CN 译文而非裸 key——既定设计，非行为回归）

## [2.5.2] - 2026-09-13

### 特性

- **国际化扩充（多语言 + 按需加载 + RTL 公共机制）**：内置语言包由 2 种扩到 10 种——`zh-CN`（默认）/ `en` / `ja` / `ko` / `de` / `fr` / `es` / `pt` / `ru` / `ar`（RTL），每包 key 全集与 `zh-CN` 一致（completeness 测试兜底）；主入口仅带 `zh-CN`，其余为 tree-shakable 子路径并提供 `loadLocale(name)` 动态 `import()` 按需加载（独立 chunk，调用时才下载）；`Locale.dir` + `getDirection()` + `resolveDirection()` + `computePosition(direction)` 组成 RTL 公共机制（select / combobox / auto-complete / tree-select / date-picker / time-picker / mentions 的 start/end 对齐镜像）；`getWeekStart` 由写死改为 locale 感知（查表 + `Intl.Locale` 回退）。日期/数字沿用原生 `Intl`，新增语言无需额外翻译

## [2.5.1] - 2026-09-13

### 特性

- **oas-bottom-sheet（新组件，移动端底部抽屉承载件）**：底部升起面板 + drag handle 下滑超阈值关闭 + backdrop 点击关闭 + Esc 关闭 + safe-area-inset-bottom 刘海屏手势区 + 焦点陷阱；`max-height`（默认 85vh）/ `open` 受控 / `oas-close`（detail `{ reason: drag | backdrop | esc }`）；`passive` 被动透传模式供浮层组件 PC 形态结构占位（SSR/客户端结构严格一致）
- **浮层组件移动形态（bottom-sheet 底部抽屉承载）**：select / date-picker / cascader / tree-select / time-picker / combobox 在触屏（coarse pointer）或窄视口（<768px）自动把下拉切换为底部抽屉承载，PC 形态不变；各面板适配（双月滚动/多级横滑/搜索+树/时间列/列表滚动；date-picker 单月面板水平居中 + 触摸友好宽度、范围双月堆叠成单列纵向滚动）
- **触摸目标 ≥44px**：新 token `--oas-touch-target-min`（默认 44px），`@media (pointer: coarse)` 下浮层 option/item 最小高度抬升，桌面（fine pointer）不受影响
- **触屏 hover 降级**：tooltip / hover-card / popover / dropdown 在 coarse pointer 下 hover 触发自动降级为点按切换（外点关闭；长按打开 800ms 内抬手跳过防误关），PC 的 hover 行为不变
- **switch 块级整行热区**：块级拉伸（如竖向 flex 容器）时宿主整行可点，对齐移动端设置项整行点击语义
- **浮层视口适配**：新增共享 `getViewport()`——浮层碰撞边界优先 `visualViewport`（软键盘/浏览器工具栏/捏合缩放时用户真正能看到的区域），回退 `innerWidth/innerHeight`；全部浮层组件统一消费
- **移动端硬伤 + 高频缺口收口（第二批）**：upload picture-card 触屏操作可达（coarse 常显 + 44px 热区）；transfer 窄屏纵向堆叠 + 按钮式排序；stepper 窄屏横向溢出滚动；tag 关闭×/整签、button 本体触控目标 ≥44px；date-picker 日格/time-picker 列/combobox 选项/calendar 日格/command 选项/pagination/anchor/breadcrumb/toolbar/tour/tree 展开钮/carousel 箭头圆点/table 小钮触控目标抬升；message/notification/toast/popconfirm 横幅窄屏 vw 宽度保护 + notification peek 栈触屏 tap 展开；popconfirm trigger=hover 触屏降级 tap；transfer/dynamic-tags/table 拖拽改按钮式（触屏替代 HTML5 DnD）；navigation-menu 顶级 bar 溢出「···」收纳；image/image-group 预览 pinch 双指缩放；table 过滤面板走共享 floating 引擎视口夹取
- **bottom-navigation `pill` 胶囊形态**：悬浮胶囊导航——tablist 全圆角（`--oas-radius-full`）+ 悬浮边框 + 投影 + 窄屏自动收窄，fixed 悬浮加底部留白；内缩/投影走 `--oas-bottom-navigation-pill-inset` / `--oas-bottom-navigation-pill-shadow` 变量开口，dark 自动 token；默认关闭，与 fixed / hide-on-scroll / safe-area / layout / show-label / shift 全兼容；受控 value + roving 键盘 + aria-selected

### 修复

- **浮层组件移动/PC 形态切换不重判定（须强刷）**：select / date-picker / cascader / tree-select / time-picker / combobox 的移动形态此前只在 `update()`/打开时判定一次，窗口缩放、横竖屏、设备仿真切换 PC↔mobile 后形态冻结、要强刷才对。新增共享 `watchMobileSheetMode()`（订阅 `pointer:coarse` + `max-width` 越界才触发）→ 形态一变即重判定，展开态同步重排承载方式（底部抽屉 ↔ fixed 锚定）
- **移动端专项视觉复核实抓修复**：calendar 触屏日格 `min-width` 撑破 7 列致周日列被裁（收窄为只抬高度）；upload picture-card 删除× dark 对比度不足（徽标底色/字色成对 token）；docs 演示块按钮行不换行撑宽布局视口致右锚定 notification/toast 窄屏出屏（docs 侧 flex-wrap + 窄屏 overflow-x:clip）；image 预览工具栏窄屏竖排分行（nowrap + 横向滚动收纳）
- **tree `parseIdList` 数字 key 静默丢弃 + 非法输入零告警**：v2.5.0 契约收紧为 JSON 数组后，`expanded`/`checked`/multiple 态 `selected` 传入数字 key 的合法 JSON 数组（如 `expanded="[1,2]"`）被 `typeof string` 过滤静默丢弃成全折叠/全不选；解析失败（典型：旧版逗号串）无任何提示。修复为数字 key 统一 `String()` 归一化（空串/`undefined`/`null` 项滤除），解析失败按空集合回落并在 dev 下 `console.warn` 一次（同值去重，文案含迁移写法）。回归：oas-tree.test.ts 单测 2 例 + qa-regression/tree.spec.ts 固化断言（oas-ui-templates 三端 menus/dept 页实抓上报）
- **select / combobox / auto-complete / tree-select 浮层首次展开未左对齐**：定位时先用面板固有（塌缩）宽度算 left、之后才把宽度撑到触发器宽 → 首开偏右（实测 +70~89px），再开才对齐。修复为先按触发器宽度撑开、再测量、bottom-start 左缘对齐，首开即与再开一致（cascader 面板取内容固有宽度不受影响）
- **date-picker 面板右侧大片空白**：月/年网格 1fr 轨道在 shrink-to-fit 容器下塌缩到内容宽、把面板撑到 378/431px 且右侧留白。修复为非范围面板收窄为 240（与日网格同宽）+ 月/年网格显式等宽 + 范围面板两栏 flex 均分（month/year/monthrange/yearrange/daterange 留白归零）
- **date-picker 单元格渲染 demo 日期数字丢失 + 每格误现标记点**：内联 `<template slot="cell">` 被 Vue 编译管线吞成空模板，组件克隆空模板后清空日格 → 日期数字全消失。修复为组件侧 `fillCells` 加防御（模板为空不清空日格、保留日期数字）+ demo 改 JS 注入模板；标记点改为只给指定日期追加（原模板内置默认红点导致每格都有点）

## [2.5.0] - 2026-09-09

### 特性

- **card 可选中卡**：`selectable` + `selected`——点击整卡切换选中态（卡内按钮/链接/输入不触发），键盘 Space/Enter 等价，role=checkbox + aria-checked 同步（多卡组宿主可挂 role=radio 自行互斥）；选中态为 primary 描边 + 浅底 + 右上勾选角标；受控/非受控双模式（设了 selected 即受控——组件只派发 `oas-change` 不自改，宿主监听回写）；与 href 同设时点选优先不跳转、loading 不可选
- **image 预览自定义工具栏**：`template[slot="toolbar"]` 克隆替换默认按钮组 + `oas-toolbar-render` 事件（detail `{ element, actions }`）——actions 十命令（缩放±/旋转±/翻转×2/下载/关闭/翻页±）供宿主按钮接线；image-group 共享预览透传
- **image-group（新组件）**：容器收集式图集——把多个 `<oas-image>` 放进 `<oas-image-group>` 自动收集为共享图集，点击任一图片从该张起打开共享预览（prev/next 整组翻页、页码指示、缩放/旋转/翻转/下载全套）；子图动态增删自动同步；`current` 可选受控 + `oas-change`（detail `{ current, prev }`）
- **carousel 卡片模式**：`type="card"`——当前卡居中占主体（卡宽/卡间距/邻卡缩放走 CSS 变量），左右邻卡部分露出并缩小降透明，点击任一邻卡直接切换；与 slides-per-view/fade/vertical 互斥（卡片模式优先），箭头/指示器/自动播放/拖拽/循环全组合；非循环模式首尾屏贴边不悬空
- **carousel 显式暂停按钮**：`pause-button`——自动播放的显式 pause/play 控件（显式暂停优先级最高，暂停后移开鼠标也不自动继续；未开自动播放时点击即开启）；`aria-pressed` 与文案随暂停态同步
- **countdown 正计时**：`type="countup"` + `start`（毫秒起点，默认 0）——从起点往上递增计时、无终止点；`active` 暂停/恢复（冻结真值、恢复续走不重置），`reset()` 归零重新开始；走时变化复用 `oas-change`（detail.value 为已计时毫秒）
- **ellipsis 多行省略**：`lines`（行数，rows 同义别名）+ `direction="tail|start|middle"`——多行中部省略保留首尾（镜像测量截断，无布局环境兜底全显）；`suffix` 保留指定后缀不被裁掉（如 `.pdf`）；`expand-trigger="click"` 省略态点文本本体即展开（键盘可达）
- **watermark 渲染引擎转 canvas**：SVG data-uri → canvas 绘制（特性检测，无 canvas 环境自动回退 SVG 路径），DPR 高清处理防模糊；文字多行/旋转/间隙/偏移/字体/尺寸全量迁移、错位排布/移动拖拽/防篡改机制无损；主题切换自动重绘；**新增 `grayscale` 图片灰阶滤镜**（跨域/加载失败回退原图）
- **watermark 文字 tile 缺省按内容自适应**：`width`/`height` 未显式设置时按「文字旋转外接框 + 内边距」计算 tile 尺寸——修复固定 240×120 大 tile 在窄容器里文字残缺难辨的问题，默认密度下每个平铺单元完整容纳文字（显式设置时行为不变，图片水印缺省维持 240/120）
- **watermark 空容器兜底**：无 slot 内容的宿主在 flex 容器内宽度塌缩为 0 导致水印不可见——空态默认撑满容器宽（`:host(:empty) { width: 100% }`），非空用法零影响
- **watermark 全屏水印**：`fullscreen` 属性——fixed 铺满视口、不拦截交互、滚动不随，`z-index` 属性可覆盖默认最高层级
- **log 搜索过滤**：`keyword` 属性非空时只显示命中行（大小写不敏感），命中片段高亮（warning 语义底色），派发 `oas-search`（detail `{ keyword, matched, total }`）；过滤不改宿主数据、行号与级别着色按原始索引不错位；空命中显示无匹配空态
- **gradient-text 文字描边**：`stroke` 描边宽度 + `stroke-color` 描边颜色（缺省语义色亮暗自适应）——渐变与描边共存（渐变填充覆盖内圈、描边透出外圈），支持 `background-clip` 的浏览器生效、其余回退普通前景色+描边
- **tree 节点重命名**：`can-rename` 总开关（节点数据可加 `renamable: false` 细粒度排除）；双击节点 label 或选中后按 F2 进入内联编辑，Enter/失焦提交、Esc 取消还原；提交派发 `oas-node-rename`（detail `{ key, label, oldLabel }`），宿主受控回写数据；编辑草稿跨树重建保持、虚拟滚动行内可编辑、编辑期方向键归输入框不干扰树键盘导航
- **tree 展开/收起过渡动画**：`motion` 开关（默认关）——展开新增子行从 0 高平滑生长到自然行高、收起先收缩离场再移除；时长/缓动走 `--oas-transition-*` token；虚拟滚动模式降级淡入；`prefers-reduced-motion` 自动停用
- **list 分组吸顶**：`data` 项支持 `group`（同组连续项归一段，自动插入组头）与 `groupLabel`（组头文案，缺省回落 `group`）；普通渲染模式下组头在列表滚动容器内吸顶（`position: sticky`，下一组头到顶顶走上一组头）；虚拟滚动模式自动回退全量渲染、组头不吸顶
- **virtual-list 动态行高**：`dynamic-height` 开启后各行高度可不同——未测行按 `estimated-item-height`（缺省沿用 `item-height`）预估排布，窗口行由 ResizeObserver 实测回写并逐步修正总高与偏移；视口上方行高变化自动补偿 scrollTop 保持视觉锚定（向上滚动不跳动）；`scrollToIndex` 动态模式按高度表定位

### 修复

- **list 选中行 hover 文字不可读**：`clickable` 行 hover 浅灰底压盖 `selected` 选中蓝底（白字白底不可读）——选中态 hover 保持 primary 系底色，文字保持可读
- **`prefix` / `suffix` 属性与 DOM 内建只读 `prefix` 冲突（Vue 下属性被吞 + 控制台告警）**：`prefix` 是 DOM Element 内建只读属性（XML 命名空间前缀），框架（如 Vue）在自定义元素 upgrade 前对其走 property 赋值会撞只读 getter 报错并丢失值。已将视觉前后缀属性迁移到不与内建冲突的 `prefix-text` / `suffix-text`（对齐主流 Web Components 库命名），`prefix` / `suffix` 保留为纯 HTML 使用的遗留别名（组件内自动迁移、文档注明）；触及组件：input / input-number / statistic / countdown / tree-select。**mentions 的触发符属性 `prefix` 改名 `trigger`**（触发符语义，`prefix` 保留为遗留别名），事件 detail 的 `prefix` 字段保持不变（对外契约稳定）。同时删除为对抗该冲突而存在的 `override get/set prefix` 访问器补丁（其既是冲突根源也是 vue-prop-hijack 门禁漏报的原因），`normalizeLegacyAlias` 归入 OASElement 基类统一处理。
- **能力子包子路径语义修正（回归根治）**：v2.4.1 把 tabs/table/modal/color-picker/popover 的重型能力拆成能力子包后，组件子路径入口变成 core-only、既有子路径消费者能力静默失效（dev 告警一次、生产无声）——五组件主路径 `index.ts` 恢复内置能力 import（同一组件任何主路径引入行为一致），各新增 `/core` 纯核路径作显式瘦身 opt-in，五处 dev 告警文案同步翻转；每组件新增入口语义测试对（主路径断言能力已激活 / 纯核断言静默失效 + 告警一次）

### 变更

- **`@oas-ui/react` 不作为独立交付物发布**：降级为仓库内可选工具包（包保留：`useOasEvent`/`useOasEvents` + README + 8 单测；不随版本发布、不写入发布清单）。依据：实测证实 React 19 原生「`on` + 全小写字面量」写法（`<oas-button onoas-submit={...}>`）即可监听 `oas-*`，多数场景零依赖即可；桥接 hooks 仅解决 camelCase 惯例、TS 类型、React 17/18 兼容三类场景。getting-started 中英改为「原生优先、hooks 可选（仓库内提供）」

## [2.4.1] - 2026-09-06

### 特性

- **组件内能力子包（按需打包）**：五个组件的重型可选能力拆为独立子包——`table/edit`（行内编辑）、`tabs/manager`（双击重命名/右键菜单/拖拽排序）、`modal/prompt`（输入确认）、`popover/contextmenu`（右键光标定位/触屏长按/断点简写）、`color-picker/designer`（2D 色域/渐变设计器）。import 即注册、顺序随意（晚加入对已挂载元素自动补齐）；按需引入组件时默认不含（配置静默失效 + dev 告警指引）；全量入口与 CDN 族包内含无感知。getting-started 中英双版补能力子包对照表
- **能力注册表晚加入（late-join）订阅**：宿主构造快照之外，connected 期订阅注册通知 + 断开退订防泄漏 + 按名幂等注入——入口求值顺序、打包器重排、按需「先组件后能力」、运行中动态 import 场景全部自愈
- **反馈/基础/布局组能力收尾**：
  - progress：indeterminate 不确定态 / warning 状态 / color+track-color 自定义色 / striped(-flow) 条纹 / steps 步进分段 / buffer 缓冲段 / dashboard 仪表盘 / 尺寸档 / stroke-linecap / aria label / 状态图标真 SVG / text-inside 内嵌文本 / max 值域；默认 slot 自定义文本
  - skeleton：loading 受控切换 + 默认 slot 真实内容出口 / effect 三档（sheen/pulse/none）/ count 份数 / widths 逐行宽度 / delay 防闪烁；**新子组件 oas-skeleton-item**（text/title/avatar/button/input/image/rect 七形态 + width/height/effect）
  - empty：title 双通道 / description 富内容 slot / size 档位 / 图标型媒体 / 内置简约插画 / 横向布局 / 容器变体
  - result：status 扩 403/404/500（专属自研图标）/ icon slot / 默认 slot 内容区 / 状态图标真 SVG 化（替文字字形）/ description slot / size 档位
  - tag：icon-end 尾部图标；grid：columns 断点简写（对齐 space 协议）+ min-child-width 自适应宫格（auto-fit+minmax）
- **FAQ 新增「组合模式（React 迁移视角）」**：asChild 的包装元素消除问题在 Web Components 下不存在（host 即元素本身）、换根语义走属性驱动、触发器组合走 named slot、Portal 对应 append-to 体系

### 修复

- **table 行内编辑真实双击不生效**：真实双击首击触发行选中重建 tbody → 被击 td 脱离文档 → 浏览器不派发 dblclick（事件流实证），编辑永不进入；修复为 click/dblclick 双委托到 update 中存活的 `<table>` 节点 + 同行同列 500ms 手工双击判定 + 重查活节点 + 同格重入守卫
- **table 进/出编辑列宽行高跳变**：编辑器内在宽度（input size=20 默认 / select 最长选项）成为 auto 布局 min-content 贡献撑宽整列、操作列两态按钮变宽挤压邻列；修复为不可见占位保原文本布局贡献 + 编辑器绝对定位零贡献 + 操作列两态同槽叠放（inline-grid 同格），实测列宽行高三态零跳变
- **table 表头吸顶失效（非固定列）**：`th[data-key] { position: relative }`（列宽拖拽手柄定位上下文）同权重居后覆盖表头吸顶 sticky，年龄/城市/邮箱等表头随表体滚走；删除覆盖（sticky 同为定位上下文，天然供给拖拽手柄）
- **table 子元素声明式通道在 Vue 宿主内容行全空**：列标识 `key` 是 Vue 模板保留字被剥离不到 DOM；改 key 双通道读取（`key ?? data-key`），demo 中英全部改写 `data-key` 并补保留字注记
- **table 多级表头竖线语言归一**：非 bordered 表全表无竖线，删除 `header-group` 左线孤例（曾致「地址有线、成绩没线」不一致）；竖线只属 bordered 全网格模式
- progress SSR 空属性噪声（空 status 不再序列化出空 data-status/class）

### 测试

- tour 滚动隐藏回归用例改不变量断言（rAF 逐帧采样 + 环境分形：有动画帧则途中每帧必须隐藏，瞬跳则断言终态正确；headless Chromium 把 smooth 滚动瞬跳导致旧用例恒红）

## [2.4.0] - 2026-09-01

### 破坏性变更（迁移说明）

- **源码目录统一到文档站语义七组**（`59b45c6`）：源码目录 = 文档站语义组 = 用户心智单一权威。`floating/` 拆空（menu/dropdown/contextmenu/menubar/navigation-menu/toolbar/command/speed-dial → `navigation/`；tooltip/popover/hover-card/backdrop → `feedback/`；scroll-area → `layout/`；config-provider/app/theme-editor → `framework/`）；`layout/` 的 tabs/pagination/steps/affix/page-header/float-button → `navigation/`、segmented → `form/`；`data/` 的 masonry/aspect-ratio → `layout/`。**ESM 旧路径直接 breaking 不保留别名**（`22e8749`）——如 `@oas-ui/ui/floating/menu` → `@oas-ui/ui/navigation/menu`，import 路径机械替换即可；`unpkg` 深链 `dist/floating/*` 同步失效
- **exports 收敛**：仅剩 `.` / `./ssr` / `./cdn/*` / `./*` 四键

### 特性

- **11 组件能力增强**：alert（icon/description/action 插槽/variant/banner/center/max-line/prominent/size）、notification（四角定位/max/hover 暂停/key 更新/进度/footer/priority/折叠层叠/content 富通道/size）、message（类型图标/loading 链/closable/placement/max/Node 富通道/动画/编程暂停/avatar spinner/声明式）、toast（生命周期/onClose/按 id 更新/max priority/全局默认/读屏/进度/去重/滑动/折叠堆叠/受控声明式/plain translucent）、drawer（四向 placement/生命周期/滚动锁/焦点陷阱/before-close/loading/resizable/移动端手势/函数式/嵌套层级/destroy-on-close/初始焦点）、snackbar（堆叠不重叠/hover 暂停/Esc/FIFO 排队/滑动关闭/计时进度/合并徽标/inert Tab 序）、popconfirm（ok-loading 异步/焦点恒定/alertdialog 语义/theme 三态/hide-icon/description 双通道/oas-open-change reason/actions 插槽/show hide 方法/placement 12 向）、backdrop（内容插槽全屏 loading/color 任意值+11 预设/opacity/blur/淡入淡出 afterShow afterClose/persistent/读屏关闭）、spin（delay/tip/自定义指示器/size 任意值/percent/paused/全局默认/SSR 水合）、loading-bar（会话计数/to 局部容器/增量曲线/生命周期/reverse RTL）、popover（25 项：ARIA 关联/trigger-keys/trap-focus/外点 Esc/size 档/available-height/header-footer/finalFocusEl/sticky/contextmenu 光标定位/dismiss-on-select/breakpoints/render-panel）、tooltip（滚动跟随/close-on-scroll 外点/label 语义切换/箭头 side/follow-cursor/宽随触发器/touch 长按）
- **color-picker 两期增强**：一期（placement 12 向碰撞翻转/alpha 通道/color-format 解析宽容 148 命名色表/clearable/size 三档/hex 输入/trigger slot/show-text/open 受控/disabledAlpha readonly uppercase/任意格式预设/EyeDropper 降级）；二期（2D 饱和度-亮度色域+hue 竖条 role=slider 拖拽与方向键/gradient 渐变模式多 stop/inline 纯面板形态）
- **modal 三期增强**：prompt 全套（input-value/validator 三态校验/inputPattern/错误态/初始聚焦/异步 loading）+ dialog 核心（滚动锁嵌套计数/before-close 含来源/Esc 遮罩关闭钮开关/footer 插槽/destroy-on-close/命令式 update/append-to/position top/焦点开关/aria-describedby/alertdialog 语义）+ 二期（开关动画/oas-opened oas-closed/非模态 no-mask/拖拽钳制/声明式 trigger/fullscreen 断点/confirmOnEnter/shake 防误关/close-icon 插槽/options 选择模式）+ no-footer 底角圆角修复
- **title 双轨**（属性简单通道 + slot 富内容通道）：title 吸收（读取渲染后从宿主移除，消除原生 tooltip）+ `slot="title"` 富内容（14 组件）；ui-spec 沉淀原生全局属性吸收约定
- **CDN 族包多入口构建**：七族 IIFE 产物 `dist/cdn/{basic,layout,navigation,form,data,feedback,framework}.js`（族包自包含：基座内联 core+i18n+icons 运行时 + 框架级三件注册）+ `cdn.js` 全量保留；规则「≤2 族引族包、≥3 族引全量」；getting-started 双版新增按族引入段

### 修复

- **demo-coverage/qa-regression 欠账清零（33→0）**：popconfirm 打开焦点从未生效（update 顺序 bug——面板 display:none 时对 ok 调 focus 静默失败，改为先设 aria-hidden 再聚焦）；demo-coverage wait 步从未执行（历史约定参数放 sel 但分发器只读 act）
- drawer 四向 placement 面板停在屏幕外（CSS 顺序依赖）、message 图标首行对齐补偿、modal no-footer 底角直角

### 杂项

- 六发布包 package.json 补 homepage 字段（npm 包页链接指向文档站）

## [2.3.2] - 2026-08-31

### 特性

- 导航组七组件深挖：oas-steps（prefix/max-count/reverse/content-placement/arrow 分格/lineless/separator/simple/percent/responsive/status/id/extra/disabled/oas-before-change）、oas-pagination（disabled/size/simple/show-edges/hide-on-single/pager-count/省略号跳页/href-template/responsive/page-item/show-more/total-boundary/oas-before-change/当前页 hover 修复）、oas-affix（position bottom/append-to/oas-change）、oas-float-button（shape/type/size/extended/disabled/href/draggable+magnetic/tooltip 组合）、oas-speed-dial（trigger hover/主钮插槽/oas-open reason/hide-label 气泡/geometry 圆弧）、oas-bottom-navigation（badge/safe-area/show-label/layout 横排/hide-on-scroll/shift）、oas-page-header（content/footer/breadcrumb/back-icon/title/subtitle/avatar 插槽/ghost/responsive）
- 新组件 oas-stepper / oas-stepper-panel：步骤面板一体机（linear 禁跳/键盘全矩阵/面板联动/DSD 双路径）
- arrow 分格自定义变量：--oas-steps-arrow-gap / --oas-steps-arrow / --oas-steps-arrow-item-bg-1..8

### 修复

- oas-pagination 当前页 hover 蓝底蓝字不可读
- oas-steps reverse 倒序连接线穿出容器/断档
- oas-steps arrow 分格块间白缝（gap 0 互嵌贴边）

## [2.3.1] - 2026-08-28

### 特性

- **table**：可编辑单元格可感知线索——hover/focus-visible 淡底色（`--oas-color-bg-hover`）+ `cursor: text`（sticky 列不透明变体不透出下层滚动内容、条纹/选中行叠加有序、编辑中不适用）+ 铅笔编辑图标 hover/focus 显现（库内 editPath，`aria-hidden`、opacity 过渡、编辑退出重挂）+ `title` 双击编辑提示（zh/en 本地化）；保持双击进入（单击会废掉单元格文本选中复制）

## [2.3.0] - 2026-08-28

### 特性

- **config-provider**：
  - `config` 组件级默认配置 JSON 通道（core 新增 `readConfigValue(el, tag, key)`；首个消费键 `oas-button` variant，显式属性优先）
  - `direction` 全局方向注入（写宿主 `dir` 属性继承穿透；scroll-area 缺省回落注入值）
  - `z-index` 浮层全局起始值（`--oas-z-index-base`；浮层 41 处接线为 `calc(base + 层默认值)`——整体抬升且层间顺序保持；overlay portal 通道起始+递增）
  - `disabled` 全局禁用 + 双侧豁免（`disabled-skip` 单组件逃逸 / `disabledExempt` tag 整类豁免；23 个表单族组件消费；toggle-group/segmented 顺带补宿主级 disabled）
- **oas-app**：`message`/`notification` JSON 全局默认配置（命令式 API 与调用参数合并、调用优先；注册表 DOM 包含关系判定嵌套就近）
- **oas-theme-editor**：颜色函数值双通道编辑（自研确定性 CSS 颜色解析器 hex/rgb/hsl/hwb/oklch/oklab + 浏览器代理解析兜底；`var()`/`calc()` 色板置灰；编辑不再破坏原值）/ `importJson(json)` 导入 + `exportCss()` 导出 / `preset` 属性 + `applyPreset(name)` 三套内置预设（compact/comfortable/default，只调尺寸族）/ 数字 token 滑块（range+number 双向联动）/ 组折叠 + token 名搜索过滤
- **modal 命令式确认框**：`modal.confirm/info/success/warning/error` + `destroyAllModal()`；异步 onOk 加载态（Promise resolve 关闭/reject 保持，复用组件既有 `loading` 属性）；`{ close() }` 句柄、挂最近 oas-app 容器；组件扩 `type`/`ok-text`/`cancel-text`/`no-cancel`/`focus-ok` 五属性 + `close()` 转 public

### 修复

- **app 宿主注册表**：单槽位改栈式——嵌套 app 移除内层后外层自动接管（挂载点与配置都回外层，不再回退 document.body）；并列宿主移除后注册者先注册者接管
- **table 行内编辑退出**：exitEdit 单元格重画改走 cellNode（尊重 render/cellTemplate 富内容）+ Esc 取消时 blur 误提交修复（先置 editState=null 再清 input）

## [2.2.9] - 2026-08-28

### 特性

- **布局组能力补齐三批**：
  - grid：`gap` 两值行列分离 / span·offset 断点简写 / `order` / `justify`·`align` 容器对齐 / `span=auto` 自宽列
  - flex：`space-evenly` / `fill`·`fill-ratio` / direction·gap 断点简写
  - container：`fluid` 流体 / `breakout` 突破（含滚动条溢出裁剪兜底）
  - splitter：`vertical` / `collapsible`（含 `oas-collapse` 事件 + collapsed 回写）/ 双击复位 / `lazy` / `slot=handle` 自定义手柄 / 像素 min-max / `multiple` 多面板（sizes 数组向后兼容）
  - scroll-area：编程滚动四方法 / `scroll-shadow` / `stick-to-bottom` / `oas-end-reached`+`end-distance` / RTL
  - masonry：`columns` 断点简写响应式列数 / `gap` 两值行列分离 / `fresh` 持续监听尺寸 / 子元素 `column` 指定列
  - aspect-ratio：预定义 ratio token 六档（`square`/`landscape`/`portrait`/`wide`/`ultrawide`/`golden`）+ `ratio` 兼容 number
- **masonry**：`items` 数据驱动通道（JSON 数组渲染卡片流，显式优先于 slot、缺省/非法 JSON 回落；字段 `{ text?, height?, column? }`；导出 `MasonryItem` 类型）
- **table**：`summary-scope=all|page` 合计范围（all 默认：分页切片前全量合计翻页不变；page 当前页小计）+ scope=all 聚合性能（全量 flat 记忆化、顺序无关聚合跳过排序）
- **docs**：组件分组侧栏与总览页按语义重构；首访语言适配（zh* 留中文、其余 /en/ 兜底 + 手动选择 localStorage 持久化）；grid demo 色块 4 级主色梯度循环

### 修复

- **grid**：单值 `gap` 真实生效——applyGap 改「先清长hand再写简写」（原顺序在真实浏览器 CSSOM 下简写被清空、computed gap 掉 0；happy-dom 不展开简写单测漏检，ssr-dsd 真水合布局稳定断言暴露）

## [2.2.8] - 2026-08-27

### 特性

- **icons**：新增 `form` 图标（文档框 + 表单横线语义，16×16 线框风，适配 iconColor），图标集 46→47
- **form**：`collectFields()` 覆盖常用控件（switch/date-picker/slider/rate/pin-input/dynamic-tags/transfer/combobox）+ 导出 `registerFormControl(tag, reader?)` 扩展钩子；特殊 value 通道（transfer 读 model-value、switch 读 checked 态）
- **layout**：`oas-layout` 新增 `side` 属性（left/right/top）控制侧栏槽落位，顶部菜单可复用水平导航
- **core**：新增 `escapeHtml`/`escapeText`/`escapeAttr` 转义工具（OWASP 集合、先转 `&`、null 归空）

### 修复

- **table**：行点击忽略交互控件内点击（button/a/input/select/[role]/oas-popconfirm）——修复点单元格内嵌按钮触发行选中+全量重渲染、销毁内嵌 popconfirm 的问题（收敛为 popconfirm 原生自驱动）
- **popconfirm**：emit ok/cancel 带 `detail.source`（宿主可稳定反查来源，`e.target` 经 shadow retarget 指向宿主表不可靠）
- **avatar**：首字符契约收敛——保留响应式 `text` 属性、textContent 为连接时快照（去掉了非标准的宿主文本观察）

### 杂项

- **ui**：统一 HTML 转义——5 组件（code/equation/chart/date-picker/empty/watermark）改用 core escape 工具；ui-spec 新增 §HTML 注入安全规范 + §组件合并验收清单加注入安全检查项（与 axe 并列）

## [2.2.7] - 2026-08-27

### 特性

- **table 能力增强**（列设置/多列排序/多级表头/分页/列过滤/合并单元格/子元素声明式通道/单元格模板/自定义列头/编辑校验）：
  - 列显隐（`TableColumn.hidden` + 受控 `column-keys`）、列拖拽重排、列宽拖拽（`setColumnOrder` / `setColumnWidth`）
  - 多列排序（`multi-sort` / SortState 多级比较，表头 sort-index 徽标）
  - 多级表头（`children` 递归组头：组列 colspan、叶子 rowspan，数据/排序/显隐/拖拽走扁平叶子层）
  - 内置分页（`pagination`/`page-size`/`current` 数据切片 + 复用 oas-pagination，`oas-page-change`）
  - 列过滤（`filterable`/`filters`/`filterMatch` + 表头过滤弹层，`filter-values`，`oas-filter-change`）
  - 合并单元格（`merge` 连续相同显示值行垂直合并）
  - 子元素声明式通道（`<oas-table-column>` 声明列，嵌套表达多级表头；MutationObserver 同步）
  - 单元格模板 `cellTemplate`（`<template>` + `row.字段` 插值水合，声明式替代 `render` 函数）
  - 自定义列头 `headerTemplate`（`<template data-role="header">`）
  - 行内编辑校验 `validate`（提交前校验，失败保持编辑态 + 显示错误）
- **core**：新增 `ReactiveController` 能力注入协议（宿主生命周期钩子接入 + `addController`/`removeController`）

### 修复

- **tabs**：纵向（left/right）nav 残留底部横线——去掉默认 `border-bottom`，仅保留侧边竖线
- **table**：列拖拽重排精确化（落点按目标列左/右半区定插前/插后 + 蓝色插入指示线 + 源列淡化）
- **table**：列过滤触发器 focus-visible 改走统一 `--oas-focus-ring` 焦点环（消除浏览器默认黑框）
- **table**：`columns` property 函数/模板通路补 `filterMatch`/`validate`/`cellTemplate`/`headerTemplate` 序列化豁免

### 杂项

- **perf**：table 按需链体积随能力增强更新（26KB → 36KB 预算基线，注明依据）；渲染基准同步
- **docs**：table 新增列设置/多列排序/序号省略号/多级表头/内置分页/列过滤/合并/子元素声明式通道/单元格模板/自定义列头/远程排序 loading demo（中英）

## [2.2.6] - 2026-08-26

### 修复

- **sidebar 内置图标配 iconColor 生效**（实测缺陷）：`SidebarItem.iconColor` 对内置图标不生效（图标仍 currentColor 灰）。根因：`iconSvg(name, iconColor)` 只在 `<svg>` 外层写 stroke，但内置图标 path 自带 `stroke="currentColor"`——path 元素级属性压过 svg 外层 stroke，颜色永远 currentColor（模板侧用官方 iconColor 全灰，仅 active 主题色高亮）。修法：iconColor 显式时对 path 的 `stroke="currentColor"` 做替换（内置单色 path 着色生效；自定义注册的彩色 SVG 天然兼容无需替换；缺省 currentColor 随态零回归）

## [2.2.5] - 2026-08-26

### 新增

- **子元素声明式通道全库推广**（breadcrumb 试点范式，items/options 属性显式时数据驱动优先、否则子元素解析收敛同一渲染路径，MutationObserver 感知变化）：三批覆盖 12 组件——
  - 导航系：`<oas-menu-item>`/`<oas-menu-group>`/`<oas-menu-divider>`、`<oas-menubar-item/-group/-divider>`、`<oas-navigation-menu-item/-group>`、`<oas-anchor-item>`
  - 浮层触发族：`<oas-dropdown-item/-group/-divider>`、`<oas-context-menu-item/-group/-divider>`（extends menu 数据载体零重复）、`<oas-command-item>`（keywords 逗号拆分/嵌套递归 page/view/force-mount/separator）
  - 布局/表单族：`<oas-sidebar-item>`/`<oas-sidebar-divider>`、`<oas-bottom-navigation-item>`、`<oas-option>`（对齐 HTML 原生 option 心智，options 显式优先，虚拟滚动共存）、`<oas-toggle-item>`、`<oas-toolbar-toggle-item>`（childSig 增量比对）
  - virtual-list 豁免（unknown[] 数据型 + 模板插槽，无标量可映射）
- **sidebar 深挖批**（实测驱动，能力 + 缺陷修复）：
  - `hide-toggle`：隐藏底部折叠按钮（宿主 opt-out，静态侧栏场景）
  - `accordion` 手风琴同级互斥（与 menu 同语义）；嵌套子树平滑展开/收起动画（grid 0fr/1fr 高度过渡 + visibility 联动防聚焦 + reduced-motion 降级）
  - 嵌套深度机制无限级（递归渲染，3 级实证逐级展开/激活级联）+ 文档边界（≤3 级，更深用 oas-tree）
  - 图标通道打通：`oas-icon` 的 lookupIcon 导出为单一查表点（customIcons → iconRegistry），registerIcon 一处注册 sidebar 可见；`SidebarItem.iconColor` 项级着色；彩色自定义 svg 自带色天然兼容；子项 icon 支持实证 + demo
  - `--oas-sidebar-bg` 背景开口（var 链回落基础 token，三形态各自默认）
  - child-selected 激活后代指示（主色淡底 + 图标主色，折叠图标条下激活态经父项保留可见）
- **date-picker 浮层定位引擎接入**：面板从 absolute/left:0 改 `position: fixed` + computePosition 锚定触发器（与 select/combobox 同模式，逃出祖先 overflow）；新增 `placement` 属性 12 向（默认 bottom-start）+ 碰撞自动翻转（右缘右对齐/下方不足上翻/夹取视口内）+ range 双月宽面板同引擎
- **radius scale 补全五档**：`--oas-radius-xs 2px`（控件内微元素）/ `--oas-radius-xl 14px`（大面板/抽屉）——token 按对外能力完备性提供（宿主自定义界面与库设计语言对齐）
- **icons 增量**：organization（组织架构）/ tree（list-tree 泛树形）/ language（globe）/ translate（文A），全部原创线框风（16×16 / 1.5 stroke / currentColor）；图标集 42→46
- **chart 面积图垂直渐变填充**：`options.gradient`（默认 false 保持纯色半透明）——每系列 linearGradient 顶部系列色 0.35→底部全透明，demo 中英双版

### 修复

- **sidebar 折叠态系列**（实测驱动）：
  - 嵌套父项死交互（折叠图标条态仍挂展开箭头/aria-expanded，点击零可见变化）→ 折叠态父项渲染为纯图标项（无箭头/无 aria-expanded，点击派发 select）
  - 折叠态徽标大药丸溢出 64px 图标条 → 改图标右上角紧凑角标（14×14 主色实底白字）
  - 嵌套子菜单点击不折叠根治：`.submenu{display:flex}` 作者级规则压过 UA `[hidden]{display:none}`（hidden 只改属性不改渲染）→ 显式兜底（现由 grid+visibility 机制承接）
- **sidebar 视觉系列**：父子项底色粘连（.item-block 加呼吸 gap）；嵌套缩进收敛（图标占位 24→18 + 容器 padding 12→6，label 距引导线 61→49px）；引导线对比度（--oas-color-border 压灰底亮度差仅 16 几乎不可见 → text-primary 12% 混色亮暗自适应）
- **chart smooth 折线/面积图曲线与末数据点脱节**：smoothPath 二次贝塞尔终点 y 误用 p.y（应为中点 my）且缺收尾段——曲线永远停在末两点中点；终点改中点 + 补 L 收尾到末点
- **icons**：translate 图标「文」字形修正（横下撇捺交叉成乂，此前倒 V 误读为「六」）+ 两字比例与空隙修正（文大 A 小布局、撇捺起点下移拉开倒三角空隙）
- **docs**：icon.md 自定义图标四通道总览 + 勿直接改 iconRegistry 正路指引；menubar .shortcut 引用不存在的 --oas-radius-xs（随 token 补档根治）

## [2.2.4] - 2026-08-25

### 新增

- **tabs 右键操作菜单（`context-menu`）**：右键任意标签弹出——新建 / 关闭 / 关闭其他 / 关闭左侧所有 / 关闭右侧所有 / 关闭全部（新建与关闭族间有分隔线，关闭全部 danger 语义色）
  - 新建派发 `oas-add`（与 `addable` 的 + 按钮同一契约，`detail.label` 为 locale 默认产物名、宿主可忽略自行命名）；关闭类按目标集合逐个派发 `oas-close`（与 `closable` 同一契约，宿主按 key 移除面板）
  - 菜单项文案中性「新建」（`tabs.ctxNew`），宿主可 `setLocale` 展开覆盖为业务文案（如「新建文件」，docs 有示例）；光标定位 fixed 弹层 + 视口夹取 + 外部点击/Escape 关闭
  - menu 模式键盘 roving：打开即聚焦首项，ArrowUp/Down 循环移动、Home/End 跳首末、Enter 执行
- **tabs more 下拉键盘可达**：moreBtn 键盘打开聚焦第一项 + 列表 roving 导航（ArrowUp/Down/Home/End/Enter/Space）+ Escape 回焦触发器 + 搜索框 ArrowDown 进列表（此前仅鼠标可达，键盘用户无法到达溢出标签）
- **sidebar 能力全量补齐**：嵌套子菜单（`items[].children`，激活子项自动展开/折叠隐藏/缩进引导线）、折叠态 tooltip、键盘导航（↑/↓/Home/End）、`shortcut`（Ctrl/Cmd+B 折叠切换，默认关）、`badge`（`--oas-sidebar-badge-bg/-color`）、divider 分隔线条目、`loading` 骨架屏（数值为骨架行数）、`expand-on-hover`（折叠悬停临时展开，不改 collapsed 受控）、`variant`（sidebar 贴边 / floating 悬浮 / inset 内嵌）、`side="right"`、actions 悬停操作按钮（`oas-action`）、多 sidebar 共存
- **sidebar 内置拖拽调宽（`resizable`）**：宿主边缘拖拽条（part=rail）实时改宽并写回 `width` 属性，`resize-min`/`resize-max`（默认 160~480），键盘 ±8/Home/End 微调，`oas-resize` 事件；仅桌面非折叠态可用
- **layout 视口锁定模式（`viewport`）**：admin 场景 opt-in——布局锁定视口高（`var(--oas-layout-height, 100dvh)`，100vh 级联回退，变量开口可改 100%/calc()），顶栏/底栏固定、侧栏与内容各自独立滚动（页面不出滚动条）；默认整页滚动模型不变
- **sider 内嵌 sidebar 宽度自动对齐**：宽度契约「sider 管轨道、sidebar 填满」——sidebar 在 sider 轨道内自动 `width:100%`（折叠跟随 64），内嵌时轨道卸除 padding；独立使用仍走 `--oas-sidebar-width`（220px），改 `--oas-sider-width` 内栏自动跟随，零错位
- **modal body 滚动边缘指示**：CSS-only scroll shadow（bg 覆盖层 local + 径向阴影 scroll 分层）——顶部无阴影/中部双阴影/底部仅顶阴影，长内容滚动边界一眼可辨

### 修复

- **sidebar 菜单项 hover 零对比**：hover 背景与宿主底色撞 token 无反馈——改走 `--oas-sidebar-item-hover-bg`（默认 text-primary 6% 混色）+ active hover 主色 14%→20% 加深
- **sidebar 嵌套子菜单两个视觉缺陷**：`.sub` 类名冲突致激活背景溢出面板右缘（容器改 `.submenu` 隔离）；无图标子项 label 与父项齐平/偏左（保留图标占位 + label 缩进父项右侧）
- **splitter + sidebar 组合**：sidebar 内联 style 被 update 周期清除致拖拽调宽失效——`width="100%"` 属性化；e2e 真拖回归固化
- **card**：无 title 时 header part 仍渲染 33px 空占位——补 `.header[hidden]` 兜底（对齐 `.cover[hidden]` 先例）
- **docs 首页**：「性能速览 → 三行代码」两屏间渐变分隔光带缺失（该屏双伪元素被网格/光晕占用）——显式 `.home-divider` 元素承载，与其他屏同位一致

### 变更

- **品牌标识定稿**：新 logo `<(w)>`（矮尖括号 Web 标签宿主 + 月牙圆括号 + 连笔波浪 w，三版对比定稿紧凑版），favicon 全套重生成（svg 双主题 + 16/32/180/192/512 透明 png）

## [2.2.3] - 2026-08-25

### 新增

- **导航与浮层族复核批（9 组件能力增量）**：对 tooltip/popover 之外的 9 件按组件深挖流程复核补齐
  - tour：`gap` 双轴偏移（[水平,垂直]）、`arrow-point-at-center`、slot=indicators 自定义指示器、slot=actions 自定义动作区
  - hover-card：滚动/resize 重定位默认开启、`sticky` 三档（off/partial/always 贴边不消失）、`collision-boundary` 自定义碰撞边界（选择器 + property 双通道）
  - command：开合过渡动画（reduced-motion 降级）、search aria-controls 关联 listbox、`append-to` portal
  - breadcrumb：子元素声明式通道试点（`<oas-breadcrumb-item>`/`<oas-breadcrumb-separator>`，items 属性显式时数据驱动优先、否则子元素解析，同一渲染路径收敛）、`oas-collapse-click` 折叠展开事件
  - anchor：`oas-click` 事件分离（与滚动联动 oas-change 区分）、resize 重算、滚动 rAF 节流、`block="nearest"`
  - menubar：子项 `href` 真链接（中键新开）、水平溢出收纳「···」（镜像弹层 + 选中反馈）、checkbox `indeterminate` 半选、start/end 插槽
  - navigation-menu：viewport 碰撞翻转、面板内二级子导航（sub 字段 + 覆盖式二级面板 + 级联动画 + Esc/← 逐层回退）、`loop` 属性、panel-footer 营销位插槽
  - back-top：`target` 缺省自动探测最近可滚祖先、tooltip 读屏可达、`draggable` 拖拽（位置持久化）
  - toolbar：start/end 插槽
- **实测第二批能力**：
  - select：下拉改 `position: fixed` + computePosition 锚定（逃出祖先 overflow 容器，不再逼出滚动条，与 combobox 一致）
  - sidebar：`items.group` 数据驱动分组标题（part=group，弱化语义色、纯展示不可点；折叠态隐藏、移动抽屉态显示，items JSON 向后兼容）
  - tabs：`tab-badge` 颜色开口 `--oas-tabs-badge-bg/--oas-tabs-badge-color`（默认 danger 兼容）+ part="badge"，宿主可中性化徽标配色
  - menubar shortcut 契约：「修饰键+键」直接绑定；单键仅限功能键（F1–F12）绑定，其余单键仅展示不绑定

### 修复

- **tour**：断开重连后 document keydown 丢失；advance-on-click 换步旧目标残留监听；append-to 后 slot 断供（portal host 桥接）；-start/-end 箭头视口夹取错指；auto-reposition 死代码实装；mask=false 时 aria-modal 降级；高亮框与遮罩孔过渡对齐；append-to portal host display:none 致浮窗 0×0 不可见；弹窗 pointer-events:none 穿透误关；typewriter 布尔属性误判；首打开目标视口外闪现错位
- **浮层箭头统一**：标准菱形箭头全家族统一 12px/-6px（居中 calc、ARROW_SIZE 对齐盒尺寸）；merge 贴角直角三角独立固定 8px 盒；popover/hover-card merge 描边三修（方向性 drop-shadow 致左缘视觉偏移、贴面板融合边多余描边线、斜边渐变带过细）
- **tabs more 下拉**：offview 判定从「完全滚出」改为「不完全可见」（部分滚出也算）——部分溢出区间「有按钮 + 空下拉」消除；ResizeObserver 回调补 syncMore（缩窗按钮不出现、扩窗按钮不撤回双向修复）
- **layout/sidebar/sider/table 模板缺陷 9 项**：sidebar active 受控高亮（aria-current=page）+ drawer-open 纳入 observedAttributes + 移动触发按钮 emoji→SVG + items.icon 注册表名渲染内联 SVG；layout 的 sider slot 判据改 `slot="sider"`（任意元素可进左轨）；sider 与内部 sidebar 折叠联动 + 宽度 `--oas-sider-width` 变量开口；table 单元格 render 支持 Node/元素富内容（columns property 保留 render 函数）+ `:host([hidden])` 尊重
- **menubar**：SSR 溢出收纳零宽误判三连修（e2e 水合漂移 38px 根治）；scale 动画污染定位测量；divider role/aria-hidden 互斥；typeaheadTimer 清理；checkbox 多选方格与标签间距
- **breadcrumb**：ellipsis 自裁剪（overflow-x:clip + overflow-y:visible）；下拉水平翻转
- **toolbar**：断开重连后 pointerdown/ResizeObserver 丢失；溢出收纳防收缩（slotted 项被压扁、收纳永不触发）
- **hover-card**：collision-boundary 坐标系缺陷（边界解析丢 rect 原点）
- **command**：keydown 重连丢失
- **navigation-menu**：面板箭头跟随触发器（CSS 引用 --arrow-x/--arrow-y 但 JS 从未写入）
- **icons**：arrow-up/arrow-down 方向画反（svg 源顶点互换 + 方向类几何断言固化）；icon generate 脚本原子化（中断不毁 src/icons）；duotone 分层 fallback 劫持 + secondary 双色被抹
- **menu**：checkbox 多选方格与标签紧贴（补 margin 间距）
- **table**：summary 行 render 返回 Node 时文本路径守卫

## [2.1.5] - 2026-08-22

### 新增

- **menu/dropdown/contextmenu 三组件能力补齐**（能力补齐）：
  - menu：`kind="checkbox"` 多选项（menuitemcheckbox + 方块勾选框，勾选集 JSON 数组写入 value）、`danger` 危险项（红色语义）、`href/target/rel` 链接项、`max-height` 长菜单滚动、typeahead 字符定位（缓冲 + 500ms 超时）、`mode="inline"` 就地展开（高度过渡 + 箭头旋转，侧边导航主流形态）、`expanded` 受控展开 + `oas-expand-change` 事件、`accordion` 手风琴同级互斥、horizontal 溢出收纳「···」（ResizeObserver 检测 + 收纳项镜像弹层 + i18n）、`close-on-select` 选中收起策略（缺省分形态：inline 不收/浮出收，显式覆盖，checkbox 项豁免）
  - dropdown：`trigger` click/hover/focus 多选、`hover-delay`/`hover-hide-delay` 防抖、`placement` 12 向、`oas-open-change` 开合事件、整体 `disabled`、`hide-on-click`、开合动画（fade+scale + transform-origin 感知方向）、`close-on-scroll`、`offset` 偏移
  - contextmenu：`long-press-delay` 长按触发（触屏右键等价）、`show(x, y)`/`close()` 编程式开合、受控 `open` + `oas-open-change`、右键别处关闭、`close-on-scroll`
- **「···」收纳弹层选中反馈**：镜像项 radio 语义（aria-checked + 前导 ✓）、选中项被收纳时「···」child-selected 主色高亮 + aria-current

### 修复

- **menu inline 形态三连修**：hover 展开与 click 收起相互抵消致鼠标用户展不开（inline 改纯 click-to-expand）；inline-sub 作为 flex 子项与箭头并排（子项跑父项右侧 → 整行换行）；inline-sub 包裹层冒充 role=menu 致 axe aria-required-children/parent 严重违规（role 移到内部 ul）
- **menu 水平模式浮层裁剪三连修**：`.menu` 容器 overflow:hidden 双轴裁剪致子菜单浮层不可见（改 overflow-x:clip + overflow-y:visible）；「···」收纳项被误纳入收纳计算致自身隐藏（选择器排除 + 测量前复位 + 收纳项占宽扣除）；「···」弹层右缘截断 + child-selected 高亮色继承进弹层（右对齐右缘 + 颜色字重重置）
- **menu inline 展开态误收**：select() 与 mouseleave 的清空逻辑对全模式生效（inline 侧边导航展开态是持续导航上下文，双双加模式门控；浮出形态保持瞬态收起惯例）
- **docs**：GA 仅生产环境注入（dev 不加载 gtag）

## [2.1.4] - 2026-08-22

### 新增

- **basic 族 12 组件能力复核补齐**（能力补齐）：
  - button：`icon-end` 双侧内容（左图标+右下拉箭头）、loading 保持宽度（spinner 居中不撑宽）、`loading-text` 加载文本、`loading="auto"` 异步自动 loading、`disabled-focusable` 禁用可聚焦、`download`/`rel` 透传
  - button-group：`spread` 均分铺满、组级 `variant`/`round` 透传
  - tag：`close-icon` 自定义关闭图标 + `close-label` 朗读名、`loading` 异步关闭（`oas-close` detail 含 `done()` 回调）、`checked-icon` 选中勾选图标
  - badge：`bordered` 白描边、`icon` 徽标内图标、aria-live 数字变化播报、`variant="outline"` 描边形态、`size` 三档
  - typography：`align` 对齐档、`weight` 字重档、`numeric` 数字等宽、mark 自定义色（`--oas-text-mark-bg`）
  - ellipsis：`direction="start|middle"` 省略方向（保留首尾中部省略）
  - link：`download` 透传、`size` 字号档、`loading` 态
  - divider：垂直 `content-position`（top/bottom 贴顶/贴底）、`text-orientation` 文字方向（横排/竖排）、垂直 `inset`/`middle` 缩进留空
  - kbd：语义键名映射（command→⌘ 等 30 键 + abbr 全称朗读）
  - label：`size`/`weight` 档
  - space：弹簧占位 demo（文档级）

### 修复

- **divider 垂直带文字渲染**：容器宽度被压成线宽致文字竖排 + slot display:contents 致线段不显示 → content 包裹层 + 容器宽度由内容撑；垂直 inset/middle 留空改 grid 行模板（行%相对容器高度，margin%相对宽度不适用垂直）
- **button 链体积预算顶格**：button 能力增强后实测 22.5KB 超预算 29B，预算上调 22KB→26KB

## [2.1.3] - 2026-08-21

### 新增

- **Tabs 能力全量补齐**（能力补齐）：
  - 基础：`oas-tab-panel` `disabled` 禁用、`size` 五档、`centered`/`justified` 布局、溢出滚动+左右箭头（`without-scroll-controls` 关闭）、滚轮横向滑动
  - 溢出 `more`：滚动 + 视口外标签镜像下拉（通用机制，标签不隐藏），搜索过滤、点选平滑滚动到可见区（激活项与相邻项一起进入视口）
  - 面板显隐 `panel-mode`（keep/lazy/destroy）、键盘激活 `activation`（auto/manual）、`animated` 动画、`oas-before-change` 切换前拦截（cancelable，preventDefault veto）
  - `editable` 双击重命名（失焦保存、宽高贴合原标签）、`sortable` 拖拽换位（`oas-reorder`）、嵌套 tabs（`:scope` 只认直接子面板）、`slot="label"` 自定义标签
  - 新增/激活标签自动平滑滚动到可见区、`addable` + 按钮固定标签栏末尾不随滚动遮挡
  - 能力复核补齐：`trigger="hover"`、`allow-deactivation`、`stacked` 图标堆叠、`icon-only` 纯图标、指示线定制（`--oas-tabs-indicator-color`/`--oas-tabs-indicator-size`）+ `hide-indicator`、`reserve-selected-space` 选中防抖、tab 即链接（`href`/`target`/`rel`）、`hide-content` 纯导航、`items` 数据驱动、`scroll-position` 滚动定位、PageUp/PageDown 键盘溢出滚动、`slot="add-icon"`/`slot="close-icon"` 图标自定义

### 修复

- **Tabs 选中下划线渲染**：溢出滚动容器下被裁剪/叠加/亚像素伪影 → 改用 `::after` 伪元素（独立 2px 盒子，渲染精确、不被裁剪、粗细均匀），card 模式保持边框连通不叠加
- **more 下拉搜索过滤视觉不生效**：`.more-item[hidden]` 显式 `display:none`（`.more-item` 的 `display:flex` 曾覆盖 UA hidden 致数据过滤但视觉仍显示）
- **首页页脚**：品牌位 `</>` 符号改真实 logo 图标（favicon.svg / dark 用 favicon-dark.svg，与导航栏一致）；消除底部 128px 空白（vitepress `.VPHome` 默认 margin 残留）；版权行底部间距 56px→32px

## [2.1.2] - 2026-08-20

### 新增

- **menubar/menu 多组单选独立勾选**（集成反馈 #4）：`value` 支持 JSON 对象字符串（`{"mode":"preview","theme":"dark"}`）按组 id 作用域独立记录；`type:"group"` 项的 `value` 作组 id，组内点选只更新该组；纯字符串保持全局单选兼容旧用法（menubar 与 menu 同步生效，即 #10-3）
- **动作项 `kind="action"`**（集成反馈 #5）：menubar/menu 叶子支持动作语义——渲染 `menuitem`（无 aria-checked、无勾选态）、点击只 emit `{value, kind:'action'}` 不写回 value；默认 radio 兼容
- **menubar `shortcut` 快捷键**（集成反馈 #2）：叶子 `shortcut` 字段，右侧 kbd 视觉提示 + document 级 keydown 自动绑定（Ctrl+N 等，preventDefault 拦截浏览器默认，裸字母键不响应）

### 变更

- **事件 detail 联合类型**：api:scan 改进——同一事件多处 emit 且 detail 不同时合并为联合类型（如 `oas-select` = `{value} | {value, kind:'action'}`），editable/pagination/input-number 等分支 detail 一并补齐
- **文档标注**（集成反馈 #10/#10a）：API 表说明事件 `detail` 的 `originalEvent` 非原生 Event（不能直接 `preventDefault()`）、`data-value` 是内部定位属性宿主不应依赖

## [2.1.1] - 2026-08-20

### 变更

- **8 个发布包 README 中英双语化**：单文件 `[中文](#中文) | [English](#english)` 锚点切换，默认中文在上，顶部与 English 段前各一条切换栏；顺带完善各包安装/使用/相关包引用与文档站链接
- **CDN 引用版本号 `@1` → `@2`**：文档站/README 中 unpkg 引用随主版本升级（当前 2.x，解析最新 v2.1.1）

## [2.1.0] - 2026-08-20

### 新增

- **集成反馈批次**（真实项目集成反馈落地）：
  - slider / input-number 受控状态写回宿主 `value` 属性（与 switch/radio-group 一致的双向受控语义，宿主 `getAttribute` / 表单序列化直接可读）
  - modal 视口高度保护：`max-height: 90vh`（`--oas-modal-max-height` 可调）+ body 超出滚动（flex 列布局），小窗口下标题/关闭钮始终可达；fullscreen 不受限高影响
  - tabs 非激活项 hover 反馈（line 模式背景 + 文字向激活态靠拢；card 模式浮起面向内容底色靠拢）
  - 间距刻度补中间档：`--oas-space-1_5: 6px` / `2_5: 10px` / `4_5: 20px`
  - 集成 FAQ 页（`::part()` 不能接属性选择器、无法穿透后代、事件时机、主题跟随等，中英双版）+ 快速开始补「事件约定（重要）」专段与自定义 CSS 主题跟随提示
- button：`variant` 形态维度（solid/outlined/dashed/filled/text/link，与 type 正交）、`color` 自定义色、`wave` 按下反馈、`auto-insert-space` 中文间空格、`autofocus`、`wrap` 长文换行
- button-group：`pill` 胶囊、分隔符（`oas-button-group-separator`）、嵌套组、拆分按钮组合用法
- icon：`spin`/`rotate`/`flip`、`registerIcon` 单个注册、`registerIconLibrary` 远程图标库、`animation` 动画预设、`duotone` 双色、`canvas` 占位框、`depth` 透明度层级
- tag：预设色板（11 色）、`dot`/`processing` 状态点、`hit`/`strong`、`multiline` 多行、`max-width` 省略、`checkable`/`checked` 可选中、`variant` 三形态、`color`、avatar 适配、键盘删除；新增 **oas-tag-group**（单选/多选选值组）
- badge：`standalone` 独立徽标、`color` 全模式（语义/预设/任意色值）、`offset` 偏移、`status` 状态点、`attention` 吸引动画（pulse/bounce）、`corner` 四角定位、`overlap` 圆形内收、ribbon-form 七形态（diagonal/triangle/bookmark/side/seal/banner/flag/rolled/zigzag/rounded/arrow）+ `premium` 金属质感 + `ribbon-size`/`ribbon-direction`/`ribbon-vertical`/`ribbon-anchor` 位置体系 + `ribbon-position`（hang/edge/cross）
- space：`separator` 分隔符（字符串 + `slot="separator"`）、`justify` 分布、`reverse` 反向、`size` 数组（横向/纵向两值）、`fill`/`fill-ratio` 填满、响应式断点简写（`direction="column md:row"`）；新增 **oas-compact**（相邻表单控件贴边合框：`vertical`/`disabled`/`block`）
- divider：`variant` 四线型（solid/dashed/dotted/double）、`inset`/`middle` 缩进、`size` 三档间距、`strong` 强调文字、6 个 CSS 变量开口、vertical 在 flex/grid 容器自动撑满
- link：`underline` 三态（hover 默认/always/never）、`icon` + `icon-position`、`external`（自动 target/rel/外链图标）、`rel` 安全自动补、`info` 语义色、`underline-offset`/`underline-color` 变量开口
- typography：修饰六布尔（strong/mark/code/underline/delete/italic）、`tag` 换标签、`depth` 三档弱化、`line-clamp` 多行省略、`copy-text` 自定义复制内容、`ellipsis-suffix` 后缀保留、`actions` 操作条（slot + `actions-position`）
- kbd：`variant` 四形态（raised/outline/subtle/plain）、`size` 三档、`color` 统一协议
- label：`error` 红字、`disabled` 灰化、`colon` 冒号、`color`、tooltip 组合演示（oas-tooltip 套 label）
- visually-hidden：`focusable` 焦点显形（skip-link 场景）
- code：`inline` 行内代码（等宽浅底小框 + 高亮）、`word-wrap` 换行、`trim` 去首尾空白（默认 true）、`size` 四档（inline 语境）、`variant` 四形态（subtle/outline/plain/solid）、`color` 统一协议
- table：`size` 密度档位（small/medium/large，CSS 变量开口）
- 展示型组件字号继承：A 类跟随外层 / B 类组件级变量开口（11 组件）
- 无障碍体系：对比度审计换自实现的感知对比度算法（不再用比值法判文字可读性）、`-text` 达标 token 体系（22 预设/语义文字变体）、color 属性统一协议（11 预设名 + 任意 CSS 色值）
- 官网首页 v2：hero oas-table 标志性 demo + 场景卡 + HTML 代码速览 + 真实 perf 数据 + CTA，H05 深色沉浸风格

### 修复

- dark 主题中间调语义色不达标：primary `#4d9fff`→`#9ecdff`、danger `#f87171`→`#fbb2b2`（粉彩亮化 + 深字，感知对比度达标），hover/active 反转为提亮
- typography 省略约束链（actions 引入 .wrap 层致 max-width 参照落空）、code 修饰内联框居中
- link 下划线简写重置颜色（text-decoration 简写把 decoration-color 重置回 currentColor，改长写）
- button：solid primary hover/active/选中背景被自定义底色规则压死、href anchor 静止态选中色、icon-only 等宽
- icon：宿主 reset 防御（slot 不出盒 + 克隆表现属性）、inline-flex 收缩包裹防垂直偏心
- 首页 SPA 导航回首页滚动入场动画失效（observer 单例复用）
- kbd/typography slotchange 监听注册 onCleanup 防断开泄漏

### 文档

- basic 族 12 件 demo 中英双版全量补齐（新增能力全覆盖）
- 35 条 API 空描述补录（divider/kbd/label/link/typography）
- ui-spec §4.1 color 属性统一协议 + 色表同步

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

- 文档站接入 Google Analytics（head 注入 gtag + SPA 路由 `onAfterRouteChange` page_view）

### 修复

- GA pageerror：`enhanceApp` 注入的是 vitepress Router（无 vue-router 的 `afterEach`），改用 `onAfterRouteChange`
- 类名规范化 `OAStour` → `OASTour`（PascalCase）

## [1.9.0] - 2026-08-12

### 新增

- `@oas-ui/ssr` 渲染器包：`renderToString(tag, attrs, slotHTML, options)` 输出 Declarative Shadow DOM（DSD）静态快照；`@oas-ui/ui` 新增 Node-safe `ssr` 子路径导出（不执行 `customElements.define`、不触碰 DOM API）
- DSD 支持全链：基类复用 declarative shadow root、真水合（指纹判定 + hydrate 接管，DOM 引用保持，误判回退重渲染）、测量组件首帧闪动治理、数据组件声明式 JSON 通道（table/tree/select）、嵌套组件递归序列化、SSR 白名单全量覆盖 123/124 tag（表单/反馈/数据展示/导航布局/基础组件五批推进）
- `oas-form-item` 组件 + `oas-form` 栅格布局（`layout="grid"`/`gap`/`label-align`/`label-width`，错误提示收编 form-item，裸字段向后兼容）
- size 尺寸档位扩展：三档 → 五档（xs=20px / small=24 / medium=32 / large=40 / xl=48px），button/tag/switch/space/spin 全档支持（spin 保留旧缩写别名）
- 主题 on-color token（`--oas-color-text-on-primary/success/warning/danger`），全库实心态硬编码白字改走 token（dark 深字对比度 ≥4.5）
- `dist/cdn.js` 单文件 IIFE bundle（gzip ~116KB）CDN 三行引入可用；theme 包根 index.css 直引
- 9 个表单控件 `focus()` 委托（form-item label 点击聚焦 shadow 主输入）
- `@oas-ui/nuxt`：Nuxt 3 module——`modules: ['@oas-ui/nuxt']` 开箱即用（Vite `vite:extendConfig` 注入 Vue `isCustomElement` 识别 oas-* + `@oas-ui/theme` 自动注入 `nuxt.options.css` + `renderOasToString`/`useOasRender` SSR helper 自动导入）
- `@oas-ui/next`：Next.js App Router 集成——RSC `<OasComponent>`（`@oas-ui/next/server`）服务端产 DSD 快照（dangerouslySetInnerHTML 进 SSR 输出流）+ `<OasRegistry>` "use client" 客户端注册引导 + `renderOas` 纯逻辑包装（attrs 值自动序列化）

### 变更

- select 多选标签默认换行自适应高度，折叠由 `max-tag-count` 显式启用
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

[2.6.1]: https://github.com/openappsys/oas-ui/compare/v2.6.0...v2.6.1
[2.6.0]: https://github.com/openappsys/oas-ui/releases/tag/v2.6.0
[2.5.9]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.9
[2.5.8]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.8
[2.5.7]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.7
[2.5.6]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.6
[2.5.5]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.5
[2.5.4]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.4
[2.5.3]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.3
[2.5.2]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.2
[2.5.1]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.1
[2.5.0]: https://github.com/openappsys/oas-ui/releases/tag/v2.5.0
[2.4.1]: https://github.com/openappsys/oas-ui/releases/tag/v2.4.1
[2.4.0]: https://github.com/openappsys/oas-ui/releases/tag/v2.4.0
[2.3.2]: https://github.com/openappsys/oas-ui/releases/tag/v2.3.2
[2.3.1]: https://github.com/openappsys/oas-ui/releases/tag/v2.3.1
[2.3.0]: https://github.com/openappsys/oas-ui/releases/tag/v2.3.0
[2.2.9]: https://github.com/openappsys/oas-ui/releases/tag/v2.2.9
[2.2.8]: https://github.com/openappsys/oas-ui/releases/tag/v2.2.8
[2.2.7]: https://github.com/openappsys/oas-ui/releases/tag/v2.2.7
[2.2.6]: https://github.com/openappsys/oas-ui/releases/tag/v2.2.6
[2.2.5]: https://github.com/openappsys/oas-ui/releases/tag/v2.2.5
[2.2.4]: https://github.com/openappsys/oas-ui/releases/tag/v2.2.4
[2.2.3]: https://github.com/openappsys/oas-ui/releases/tag/v2.2.3
[2.1.5]: https://github.com/openappsys/oas-ui/releases/tag/v2.1.5
[2.1.4]: https://github.com/openappsys/oas-ui/releases/tag/v2.1.4
[2.1.3]: https://github.com/openappsys/oas-ui/releases/tag/v2.1.3
[2.1.2]: https://github.com/openappsys/oas-ui/releases/tag/v2.1.2
[2.1.1]: https://github.com/openappsys/oas-ui/releases/tag/v2.1.1
[2.1.0]: https://github.com/openappsys/oas-ui/releases/tag/v2.1.0
[2.0.0]: https://github.com/openappsys/oas-ui/releases/tag/v2.0.0
[1.9.1]: https://github.com/openappsys/oas-ui/releases/tag/v1.9.1
[1.9.0]: https://github.com/openappsys/oas-ui/releases/tag/v1.9.0
[1.0.0]: https://github.com/openappsys/oas-ui/releases/tag/v1.0.0
[1.1.0]: https://github.com/openappsys/oas-ui/tree/v1.1.0
[1.2.0]: https://github.com/openappsys/oas-ui/tree/v1.2.0
[1.3.0]: https://github.com/openappsys/oas-ui/tree/v1.3.0
[1.4.0]: https://github.com/openappsys/oas-ui/tree/v1.4.0
[1.5.0]: https://github.com/openappsys/oas-ui/tree/v1.5.0
[1.6.0]: https://github.com/openappsys/oas-ui/tree/v1.6.0
[1.7.0]: https://github.com/openappsys/oas-ui/tree/v1.7.0
[1.8.0]: https://github.com/openappsys/oas-ui/tree/v1.8.0
