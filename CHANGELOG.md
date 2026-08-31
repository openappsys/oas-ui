# Changelog

所有显著变更记录于此，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [2.3.2] - 2026-08-30

### 特性

- 导航组七组件深挖：oas-steps（prefix/max-count/reverse/content-placement/arrow 分格/lineless/separator/simple/percent/responsive/status/id/extra/disabled/oas-before-change）、oas-pagination（disabled/size/simple/show-edges/hide-on-single/pager-count/省略号跳页/href-template/responsive/page-item/show-more/total-boundary/oas-before-change/当前页 hover 修复）、oas-affix（position bottom/append-to/oas-change）、oas-float-button（shape/type/size/extended/disabled/href/draggable+magnetic/tooltip 组合）、oas-speed-dial（trigger hover/主钮插槽/oas-open reason/hide-label 气泡/geometry 圆弧）、oas-bottom-navigation（badge/safe-area/show-label/layout 横排/hide-on-scroll/shift）、oas-page-header（content/footer/breadcrumb/back-icon/title/subtitle/avatar 插槽/ghost/responsive）
- 新组件 oas-stepper / oas-stepper-panel：步骤面板一体机（linear 禁跳/键盘全矩阵/面板联动/DSD 双路径）
- arrow 分格自定义变量：--oas-steps-arrow-gap / --oas-steps-arrow / --oas-steps-arrow-item-bg-1..8

### 修复

- oas-pagination 当前页 hover 蓝底蓝字不可读
- oas-steps reverse 倒序连接线穿出容器/断档
- oas-steps arrow 分格块间白缝（gap 0 互嵌贴边）
- oas-log demo beforeunload 泄漏阻断整页导航
## [2.3.1] - 2026-08-28

### 特性

- **table**：可编辑单元格可感知线索——hover/focus-visible 淡底色（`--oas-color-bg-hover`）+ `cursor: text`（sticky 列不透明变体不透出下层滚动内容、条纹/选中行叠加有序、编辑中不适用）+ 铅笔编辑图标 hover/focus 显现（库内 editPath，`aria-hidden`、opacity 过渡、编辑退出重挂）+ `title` 双击编辑提示（zh/en 本地化）；保持双击进入（单击会废掉单元格文本选中复制）

### 杂项

- **单测**：+5（图标渲染/title 本地化/STYLE 规则/编辑中移除与退出恢复）；**e2e**：qa-regression 真实 hover 回归 +1；全量 3682

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

### 杂项

- **单测**：新增约 85 条（框架级容器组 + 全局禁用 + modal 命令式）；全量 3677
- **e2e 基建**：qa-regression 新增 theme-editor 颜色函数值回归；contrast-gate 清单补 theme-editor/config-provider/app 三页

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
- **e2e 基建**：Playwright 默认 locale 锁 zh-CN（首访语言适配后 en-US 重定向英文页致批量落空）+ demo-coverage 缺口补全（avatar `text` / table `multi-sort`·`filter-values`·`summary-scope` 演示 + table 分页/过滤/列重排/列宽与 scroll-area 到底事件探针步骤）

### 杂项

- **单测**：新增约 45 条（布局三批 + masonry items + table summary-scope）；全量 3589
- **docs**：layout.md 补职责边界说明（sider 折叠归 sidebar、viewport 覆盖 fixed 场景）；demo-coverage 探针新增 scrollbottom/resizecol 动作

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
- **单测**：新增约 12 条（form 图标/collectFields/registerFormControl/side/escape/avatar text/行点击守卫/popconfirm source）
- **docs**：新增 form 图标 / layout side / HTML 注入安全 相关文档；engineering 发布通道适用范围澄清

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

- **table 单测**：新增约 20 条（列设置/多列排序/多级表头/分页/过滤/合并/子元素通道/模板/校验/拖拽排序）
- **perf**：table 按需链体积随能力增强更新（26KB → 36KB 预算基线，注明依据）；渲染基准同步
- **docs**：table 新增列设置/多列排序/序号省略号/多级表头/内置分页/列过滤/合并/子元素声明式通道/单元格模板/自定义列头/远程排序 loading demo（中英）

## [2.2.6] - 2026-08-26

### 修复

- **sidebar 内置图标配 iconColor 生效**（实测缺陷）：`SidebarItem.iconColor` 对内置图标不生效（图标仍 currentColor 灰）。根因：`iconSvg(name, iconColor)` 只在 `<svg>` 外层写 stroke，但内置图标 path 自带 `stroke="currentColor"`——path 元素级属性压过 svg 外层 stroke，颜色永远 currentColor（模板侧用官方 iconColor 全灰，仅 active 主题色高亮）。修法：iconColor 显式时对 path 的 `stroke="currentColor"` 做替换（内置单色 path 着色生效；自定义注册的彩色 SVG 天然兼容无需替换；缺省 currentColor 随态零回归）
- **docs**：图标着色 demo 补内置图标场景（内置 `star` 配 `iconColor` 显式着色活示例 + 内置 `heart` 无 iconColor 随态对照）

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
- **icons generate 两项加固**：并发竞态（root build 与 docs build 同时触发 generate 互踩）——临时目录按进程隔离；dev watch 持句柄时目录原子替换 EPERM——退避重试护体（发布构建与 pnpm dev 并行必现级，实测修复）
- **docs 首页**：「性能速览 → 三行代码」两屏间渐变分隔光带缺失（该屏双伪元素被网格/光晕占用）——显式 `.home-divider` 元素承载，与其他屏同位同款

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
- **docs**：端口描述漂移修正 5173→5175；qa-regression.spec 积压 typecheck 错误清理；format 既存漂移两批收敛；sidebar API 描述补录（active/drawer-open）

## [2.2.2] - 2026-08-22


## [2.1.5] - 2026-08-22

### 新增

- **menu/dropdown/contextmenu 三组件能力补齐**（能力并集）：
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

- **basic 族 12 组件能力复核补齐**（能力并集）：
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
- **e2e CI flaky 修复**：demo-coverage 事件探针 upgrade 等待 4s→10s + 事件缺失时自动重试（`__fired` 单调累积不误判）；image 懒加载全图加载判定超时 10s→20s（2 核 runner 高并发下组件 upgrade 慢所致）
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
- 无障碍体系：对比度门禁换 WCAG 3 草案感知对比度算法（自实现公式 + contrast-gate 工具）、`-text` 达标 token 体系（22 预设/语义文字变体）、color 属性统一协议（11 预设名 + 任意 CSS 色值）
- API 表自动化：`api:scan`（AST 扫描）+ `api:gen`（生成中英 API 章节）+ CI `api:check` 防漂移
- 官网首页 v2：hero oas-table 标志性 demo + 场景卡 + HTML 代码速览 + 真实 perf 数据 + CTA，H05 深色沉浸风格

### 修复

- dark 主题中间调语义色不达标：primary `#4d9fff`→`#9ecdff`、danger `#f87171`→`#fbb2b2`（粉彩亮化 + 深字，感知对比度 Lc 50→73/71），hover/active 反转为提亮
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

[1.0.0]: https://github.com/openappsys/oas-ui/releases/tag/v1.0.0
[1.1.0]: https://github.com/openappsys/oas-ui/tree/v1.1.0
[1.2.0]: https://github.com/openappsys/oas-ui/tree/v1.2.0
[1.3.0]: https://github.com/openappsys/oas-ui/tree/v1.3.0
[1.4.0]: https://github.com/openappsys/oas-ui/tree/v1.4.0
[1.5.0]: https://github.com/openappsys/oas-ui/tree/v1.5.0
[1.6.0]: https://github.com/openappsys/oas-ui/tree/v1.6.0
[1.7.0]: https://github.com/openappsys/oas-ui/tree/v1.7.0
[1.8.0]: https://github.com/openappsys/oas-ui/tree/v1.8.0
