# OAS-UI PRD（产品需求文档）

> 版本规划见 `docs/ROADMAP.md`，本文档定义各版本详细需求与验收标准。
> 状态标记：✅ 已完成 / 🚧 进行中 / 📋 待开发

---

## v2.6.7：gantt 资源泳道增强批（分配编辑 + reassign 避让 + 泳道内嵌负荷 + 资源日历口径固化）

### 功能定义

pool 资源体系从「检测+负荷」补到「分配-避让-概览」闭环：① 任务-资源分配编辑（文档配方：编辑弹窗 checkbox-group 勾选池内资源 + 未登记 id 只读 chip，updateTask 一次写回）；② `levelConflicts(options.mode)` 新增 `'reassign'`——日期不动，冲突资源改派整段无冲突的池内资源（判据与检测同源：改派后目标不得产生新冲突；找不到目标如实 unresolved 不退化顺延）；③ group-by-resource 泳道行尾内嵌 24 格峰值负荷缩略条（DOM 有界、token 配色、forced-colors 兜底）；④ 资源日历进避让的权威口径回归固化（taskCalendar 交集语义 Z2 已交付，本批补测试与文档）。

### 验收

- 引擎 13 测（reassign 与 shift 对拍/目标择优/不新冲突/多资源替换/截断/确定性）+ 组件 8 测 + helper 3 测 + 回归 6 测；gantt 域 473+39+6 全绿。
- e2e +3（reassign 真实链路/分配编辑双入口/泳道缩略），gantt.spec 157 全绿三引擎。
- 体积：gantt 链 68.1→69.3 KB（预算 80/预警 72 内）。

## v2.6.7：scheduler resource-timeline 视图（第 7 档）

### 功能定义

`view="resource-timeline"`：行 = 资源、横向连续日轴跨多天（range 托管取宿主跨度/未托管当前周）、事件 = 跨列连续横条（resource-week 里跨天断成两截的问题在此视图连续）。横条交互复用 week 视图 band-span 代码（提取 `attachSpanBarInteractions` 共享）：整体拖拽按天吸附、末端手柄缩放、键盘 ←/→/Alt、移出轴视图跟随保焦点。轴 >400 天裁剪 devWarn；重叠条半开贪心分层（≤3 层，静默裁切口径与 resource-week 对齐并文档注明）；windowed 行窗口/spacer 守恒/焦点回焦全套既有口径；print 纳入；i18n `scheduler.viewResourceTimeline` ×10 语言。

### 验收

- scheduler 139 全绿（新增 16）；i18n 28 全绿；e2e +1（连续条宽比/键盘回写/焦点/windowed 守恒/RTL/暗色/console）。
- 体积：scheduler +2.7 KB 进全量入口链；全量入口天花板重定 1180 KB（实测 1027.9）。

## v2.6.7：table 补齐小批（TSV/CSV 导入 L3 helper + 打印视图）

### 功能定义

table 业务对齐层两个小洞：① 数据导入 helper 子路径（`@oas-ui/ui/data/table/import`）——TSV/CSV 文本 → 二维矩阵 → 对象数组，补齐「导入」侧与既有 `parseTsv`/导出矩阵的对称面；② 打印视图（`@media print`）——虚拟滚动/windowed 的窗口外行不在 DOM、CSS 无法唤回，print 媒体下组件感知并全量渲染，打印/导出 PDF 不再缺行缺列。

### 详细需求

- **导入 helper**（纯函数、零 DOM 依赖、不进 L1/CDN，显式 import）：`parseTableText`（文本 → 矩阵；分隔符 `\t`/`,`/`;` 引号外嗅探，TSV 分支复用 `parseTsv`，CSV 走本地 RFC 4180 状态机）、`matrixToRecords`（矩阵 → 对象数组；首行表头列名 → key、重名列加 `.N` 后缀、空名按列序补 `cN`；值保持字符串不推断类型）、`importTableText`（两步合一）、`importTableFile`（File 走 `file.text()`；粘贴板入口只收字符串、由宿主读取）。行列不齐（缺列补空/超长截断）与中间空行**如实计数返回，不静默丢数据**。
- **打印视图**：`matchMedia('print')` 感知 + change 重渲染。本地虚拟（`height`）print 下行窗口恒全量；`column-virtual` 列窗口同口径全列；windowed 全量数据在服务端、客户端只有切片——**无法全量**，守卫 devWarn 一次 + 打印输出 = 已装载切片（文档写明限制，宿主预装载或关闭 windowed 可解）。打印 CSS：滚动限高解除（压过内联 maxHeight）、外框圆角归零、表头吸顶/固定列 sticky 复位、占位行不占纸面；行形态与屏显一致。

### 验收

- 导入 helper 单测 16 条全绿（TSV/CSV/嗅探/转义/重名后缀/不齐计数/File 入口/空文本边界/零 DOM）；table 域 ×2 + 全量 test 绿。
- 打印单测 5 条（print 全量行 / change 双向恢复 / column-virtual 全列 / windowed 守卫去重 / 断开清理）+ e2e 3 条（emulateMedia print 全量行进 DOM + 打印几何 + screen 恢复 / column-virtual 全列 / windowed 切片渲染）。
- perf：`tableImport` 链新预算档（helper 型，实测 gzip 1.4 KB 上浮 25% 定档 1.75 KB）；table 主链 63.7 → 64.2 KB（预算 74 / 预警 66.6 内）；连带 edit 链 93.5 → 94.0 KB 触预警线 93.6（预算饱和 + print 增量 0.5 KB 连带，重定档待批准）。
- zh/en 文档「数据导入」节 + demo（文件 + 粘贴板双入口、结果区反馈 N 行 M 列）+ 虚拟滚动节打印说明 + windowed 节打印限制。

---

## v2.6.7：Z2 gantt 超配自动排程避让（B 路线裁定实施）

### 功能定义

pool 超配检测（T10）只做检测与视觉标注；本批补齐**手动触发的自动排程避让**：组件公开方法
`levelConflicts(options?)` 对当前任务的池内资源冲突做「整体后移受害者」迭代，直到无冲突或达迭代上限。

- **纯引擎** `packages/ui/src/data/gantt/gantt-level.ts`（零组件依赖）：判据与检测同源
  （初始冲突对与终检直接调 `computeResourceConflicts` 扫描线；迭代内同款半开区间谓词局部重检，
  相切不算、日精度 end 含端）。返回 `{ moved, unresolved, truncated, skipped }`，不改入参。
- **受害者排序**（裁定口径）：disabled / 资源日历 days 空集 / constraint==='mso' 永不让位；
  有 deadline 者后让位（都有按最晚 deadline 后让位）；startMs 晚者先让位；输入序靠后者先让位。
- **平移与吸附**：day 步进 `addLocalDays` 保墙钟时刻（DST 不漂移），end 按保工期推导；
  工作日吸附放收敛后最终落点（calendar 回调逐日前进，上限同款 SNAP_MAX_DAYS），吸附后复检一次
  交叠，复检不过继续迭代；每步纯 day 步进保单调；maxIter 缺省 500，达上限 `truncated: true`
  且 unresolved 如实返回（不静默）。
- **组件集成**：`levelConflicts(options?): GanttLevelResult`（守卫：pool 关 / windowed /
  readonly / dates-readonly → devWarn + 空结果）；应用走既有 `updateTasks(patches)`
  （一次提交 = 一条 undo + 一次 oas-tasks-change）；事件序 `oas-level`（detail 带
  moved/unresolved/truncated）→ 应用 → tasks-change；零移动 = 零写入零事件零 history（幂等）。
- 里程碑 / summary / 池外资源不参与（与检测同口径），以 `skipped` 如实回报。

### 验收标准

- 引擎单测：机制（收敛 / 排序各分支 / 截断 / 确定性 / 不改入参）+ DST 对拍（America/New_York
  春秋令跨日避让后 start/end 恒本地零点纯日期、工期日历日不变、复检无冲突）+ 朴素 O(n²) 参考实现
  对拍（固定 seed 500 组：写回后无冲突 + 工期不变量 + 引擎步数 ≤ 参考，不逐值等价）+ 边界
  （单任务 / 池外过滤 / 里程碑 summary / hour 档保时刻）。
- 组件测试：事件序 / 一次事务 / history undo 还原 / 守卫分支 / 无冲突零事件 / 避让后 `.conflict` 缩小。
- 文档 zh/en「超配避让」小节 + demo；API 生成物（api:scan/gen/check）与 llms 同步；gantt 链
  perf:size 预算 80 KB 内（超预警线 72 KB 须报数归因）。

---

## v2.6.7：T 批（T4/T5/T6/T8/T10/T11/T12/T15 立项交付）

### 功能定义

按 demands 编号立项的八项，共用「全部落地、单测 + 三引擎实测实证」收口标准：

1. **T5 tree 虚拟滚动**：`virtual` / `item-height`（`--oas-tree-row-height` token）——1 万节点渲染行数有界，键盘/ARIA 全量序不破；连带修 checked 闭包 O(n²) 与 vlist 尾随帧重建销毁聚焦行。
2. **T6 upload 三件套**：`storage-key` 元数据持久化（不含内容）+ `oas-form` 一等公民注册 + 错误摘要条（retryAll/clearErrors），i18n 4 key ×10 语言。
3. **T8 date-picker 范围完备**：`ranges` 快捷预设（置灰/交换/缓存随 type）+ 倒置自动交换 + confirm 带 start/end。
4. **T10 gantt 资源池**：`pool` 联动共享池 + `computeResourceConflicts` 超配检测 + `oas-resource-conflict` 幂等事件。
5. **T11 table 三 L3**：`pivot`（pivotMatrix）/ `value-format`（createFormatter）/ `query`（applyQuery + createQueryState），按需子路径 + 独立预算档。
6. **T12 resource 技能**：`skills` 字段 + `show-skills` chips（显式 false 口径，真省略号）。
7. **T15 组合配方**：recipes 页 Action Sheet / 终端 / JSON 对照三配方（不加组件）。
8. **T4 command 多级导航**：`children` 声明式 + `levelLoader` 动态子级，面包屑/Esc 逐级/每级过滤，`oas-navigate` 事件。
9. **T10 资源负荷视图**：`show-resource-load` 面板（轴对齐桶条、>100% danger、aria 摘要 + 可聚焦滚动区、max-height token）+ `computeResourceLoad` L3 helper；gantt 链再定档 80 KB。review 修复：滚动路径 forced reflow（读 82→3）+ 高度上限。
10. **T11 values-change 补齐**：upload `oas-change` detail 加 `value` 键（与 form 读取器同串），NO_WRITEBACK 防回环。
11. **T12 axe 扩 guide**：26 页全扫，9 组违规全修（暗色代码主题/5 段对比度/checkbox aria-label 镜像组件级修复/终端配方），baselineKey 目录段消歧。
12. **T13 form 链审计**：无安全冗余可清；「余量 4 B」系过时数据（实际 80.7%）；core 子路径导出列为架构级候选项。
13. **T14 WSL 容器模式**：`--container`（wslc）镜像按 .nvmrc 推导、证据协议兼容；发行版模式 Ubuntu Node 版本由 `.nvmrc` 决定（26.13.0）+ pnpm 12.5.1；首次真跑实证 /mnt/d 全量 Wall-clock 伪影形态。

### 验收标准

- 单测 +136（全量 12197 绿）；新 e2e：tree-virtual 结构回归、upload 错误条/持久化恢复、date-picker 交换契约、form-associated 解绑轮询口径。
- review 2 轮 × 2 模型：0 Critical；C1（gantt demo 监听时序）+ 19 项修复全闭环。
- perf:size 全 PASS（gantt 65.8/75、三新 L3 档、resourcePool capability 口径）；api/llms/stats 生成物同步。

---

## v2.6.7：再捞清零批（WebKit 全量回归 / forced-colors 焦点环 / i18n 补译 / 测试机制）

### 功能定义

四项内容，共用「全部落地、manifest/三引擎实测实证」收口标准：

1. **WebKit 全量 e2e**：webkit project 从代表性 smoke 放开为全量 qa-regression 套件；暴露 5 类跨引擎产品缺陷并全部修复（外点关闭触屏 pointerup 通道、表单回退名让位外部 label、slider RTL/reverse 方向键、sidebar 抽屉回焦回落、marquee 切轴相位钉名）；CI e2e-webkit 改 3 分片。
2. **决策批（再捞待决项按原则清零）**：外点关闭统一通道迁移 19 组件（触屏失效面全清）+ tabs-manager 打开手势免疫 + overlay onOutside 去重；table 滚动竞态修复（写入版本戳 + 意图守卫 + preventScroll）；gantt 冲突行对比度默认值改 danger-text（AA 达标，亮暗 e2e 断言）；gantt 链预算再定档 75 KB（审计无冗余）；core 表单 label 移除名称空窗修复；i18n 包级 vitest 配置补齐。
3. **forced-colors 焦点环批**：88 组件 `@media (forced-colors: active)` 焦点兜底（CanvasText 1px 实线 outline），强制配色环境键盘焦点可见，常规渲染零变化；e2e 计算样式断言（chromium + 反向防外溢）。
4. **i18n 8 语言补译**：jsonViewer / diffViewer / gantt / resource 共 30 key 英文残留补译 + 11 条错译校正 + placeholder token 守卫测试。
5. **测试机制**：e2e 断言 OS 绝对量维度（79→40，CI 增量上限 40）；WSL rehearse 通道（`release:rehearse:wsl`，SKIP 语义）；长稳 soak（`test:soak`，N 轮重复 + flaky 矩阵）；gantt 链归因审计存档（无冗余，扩展前置条件解除）。

### 验收标准

- WebKit 全量 1276 passed / 0 failed；chromium + firefox 回归不破；5 类产品修复各带单测 + 三引擎 e2e。
- forced-colors 焦点环 e2e（chromium）+ 非强制色反向断言 + `pnpm build` scoped CSS 零语法错误。
- i18n completeness + placeholder token 守卫全绿；8 语言 demo 渲染无溢出（抽查 ja / ar）。
- `qa:audit:check` 四维度全过（弱断言 0 / OS 绝对量 ≤40）；soak `--dry` 与沙盒编排自检通过；rehearse-wsl `--probe` 实测 SKIP 路径。

---

## v2.6.7：交互补全与框架集成指南

### 功能定义

① `oas-resource` 负载直方图行补 hover（用户反馈：直方图区与泳道区 hover 观感不一致）；② 框架集成指南（guide/frameworks，zh/en）补强与七框架覆盖。

### 详细需求

- 直方图行（`.row.load`）与泳道行同口径 hover：行底色 + sticky 行头列同 token 链（`--oas-resource-row-hover-bg`）；`hover="false"` 逐元素还原基础底色（行透明 / 行头 `--oas-color-bg`）；同在 `@media (hover: hover)` 内（触屏不粘住）。
- 框架指南新增「全局属性与 property 通道（`title` 的实测行为）」小节：React 19 对原生 property 名走 property 赋值；`title` 是反射型 property（赋值同步成 attribute），Chromium 实测 `oas-modal` / `oas-drawer` 双通道均收到并**消费**（渲染进标题栏后移除 attribute 防原生 tooltip）——**正文与常见坑第 6 条经当日实测修正**（早前版本据过时备注误称「不落 attribute、组件收不到」）；faq 撞名节同步补消费语义并互链；modal e2e 三形态回归固化（property / setAttribute / 插入前赋值）。
- `@oas-ui/react` 定位更新为公开口径：两个 hook 降级为参考出处（约 100 行可 vendor 进项目），官方不发布该 npm 包、不做任何框架 wrapper/桥接包。
- 补齐 Svelte / Angular / Astro 三小节，「先选路径」表覆盖 React / Vue / Svelte / Angular / Astro / Next / Nuxt 七框架 + SolidJS 等兜底行；内容均为各框架官方公开机制（Svelte 5 事件属性大小写敏感语义经官方文档核实），不做未实测的互操作断言。

### 验收

- CSS 单测 + Chromium e2e（真实 hover 直方图行/行头激活、`hover="false"` 关闭态、console 零告警）。
- 指南构建产物双语渲染 + 页内锚点（含全角括号/空格转连字符形态）验证；`llms:gen + llms:check` 通过。
- `title` 消费契约经 Chromium 实测裁决（property 反射 → attribute → 消费即删），modal e2e 三形态断言固化。

---

## v2.6.7：D2 L1 主链归因审计批

### 功能定义

把 gantt 链审计（2026-11-02 存档）方法论复制到全量入口链 / table 默认链 / form 链 / 9 个 CDN 族包：逐模块 gzip 归因 + 死文件 / 双实现 / 未用导出 / 族包重复源扫描，目标 = 冗余清零或修复、解除扩展前置。

### 详细需求

- 遍历规则与 `scripts/perf/size.mjs` 一致（静态 import 闭包，不跟动态 import）；审计报告存档 `.opencode/tmp/archive-2026-11-04/`。
- 死文件扫描核实「不在全量入口闭包」的 34 个文件全部按设计（24 helper 型 L3 + 4 纯核入口 + ssr 子路径 + 5 仅 barrel 无消费者），零真死文件。
- 双实现逐字比对：`normalizeChoice` ×17（15 个 3-arg 逐字相同 + 2 个 2-arg 等价变体）收敛为 `packages/ui/src/shared/choice.ts` 单一实现；input/input-number 的 4-arg warn 集成变体保留本地（告警策略与清洗耦合）。其余命中为同名撞车（`valueOf`/`warnOnce`）或 <120B 低于阈值，记录不修。
- 未用导出扫描的 barrel 命中（icons/i18n/core）为 re-export 链误报，记录为扫描器限制。

### 验收

- 全量单测 12257 绿；全量 Chromium e2e 2566 passed / 0 failed；`perf:size` 全 PASS。
- 量化结果诚实记录：逐文件 gzip 口径修复前后持平（维护性收益为主），bundled 口径被同日并行批次增量盖过无法隔离测量。

---

## v2.6.7：table 多行/动态行高单元格（D1-4，已批准 2026-11-04）

> 探针实证先行（2026-11-04，真实浏览器量测）：**非虚拟多行今天已可用**——td 基础 CSS 无 nowrap/定高强制，列宽受限时长文本换行撑高行；斑马/hover/选中/合计行/编辑浮层定位全过、console 零告警。先前「不工作」的判断是探针未约束表格宽度的假象（auto table-layout 下超额宽度被列分走，长文本一行放下）。**真缺口在虚拟模式**：虚拟 td 无防护（white-space=normal），长文本换行撑高（40px 行被撑到 64px）破坏定高几何、滚动后行错位。
>
> 设计经用户三轮 push 终局裁定：① 排除论被否——「windowed 下未装载行不可观测」的正解是**估计**（主流虚拟化电子表格同款：估计 → 装载测真值 → 锚定收敛），不是弃疗；且「大数据+长文本」恰是 windowed 与动态行高的需求交集核心。② devWarn 全清零——三处候选排除经论证全部不成立或属错误归因，最终**零新增 devWarn**；`row-auto-height` 全模式受支持，无「不支持组合」。③ 引擎不重造——仓库现成 `HeightCache`/`computeDynamicWindow`（virtual-list 动态行高模块，table 列宽前缀和已在复用）接行轴，C 的真实形态是「接线 + 锚定纪律 + 连带面收口」。

### 交付 A：非虚拟多行（文档口径 + e2e 固化，零源码改动）

非虚拟表格（不设 `height`/不启虚拟滚动）长文本按列宽自然换行撑高，属受支持行为。补：zh/en 文档口径一节（含「列宽必须受限才换行——auto table-layout 下表格会分走容器超额宽度」的已知特性说明）+ qa-regression e2e 固化探针矩阵（换行撑高/斑马/hover/选中/合计/编辑浮层对齐/console 零告警）。

### 交付 B：虚拟模式防护 + `wrap` 列定义 + row-height 档位配方

| 项 | 口径 |
| --- | --- |
| 缺口 | 虚拟 td 无内容防护，长文本换行撑高破坏 `rowHeightPx` 定高几何（spacer/窗口数学全部失真） |
| 默认防护 | **仅虚拟模式**数据 td 默认 `nowrap + overflow hidden + ellipsis`（对齐非虚拟 `ellipsis` 列观感）——几何永远可信；非虚拟 td 一律不碰（保交付 A 多行行为，防 breaking） |
| `wrap?: boolean` 列定义 | `undefined`（缺省）→ 各模式维持现状（非虚拟换行 / 虚拟截断），**零变化红线**；`true` → 两模式都换行（虚拟下在定高行内换行、溢出截断）；`false` → 两模式 nowrap+ellipsis（非虚拟侧等价既有 `ellipsis` 列，泛化开口） |
| 配方 | 虚拟 + wrap 列 + `row-height` 调大档（64/96）= 「行内两行/三行备注」官方形态；溢出截断保几何 |
| 连带面 | 编辑浮层（虚拟编辑行内定位按行高，wrap 行 td 高度=行高，天然对齐）；expand 行既有强制定高逻辑不受影响；stripe/hover 行级免疫 |
| 验证 | 单测（wrap 三态渲染 class）+ e2e（虚拟长文本不再撑行、wrap 列换行截断、行号对齐）+ 全量回归 |

### 交付 C：逐行动态行高（`row-auto-height`，注册型 L3，全模式支持，零 devWarn）

**支持矩阵（全受支持，无排除组合）**：本地虚拟 ✅（主场：全量数据在组件内）；windowed ✅（混合模型，见表 1）；column-virtual ✅（双轴今天就是受支持形态，动态行高只是把纵轴常量换成前缀和，补双开回归即可）；merge/span-method 与虚拟的互斥是**既有边界**（动态行高不新增任何限制，不挂告警——挂在 row-auto-height 上是评审否掉的错误归因）。

**表 1 测量模型**：复用 `HeightCache`（实测优先 + 预估兜底 + dirtyFrom 增量前缀）。本地虚拟：全部行可测。windowed 混合模型：**切片内行 RO 测真值，切片外行 = 预估值（缺省 row-height 档）**，前缀和 = 估计与真值拼接——文档如实写「未装载行高度为估计值，装载后收敛」（通行做法：滚动条呼吸、跳远端定位以估计为暂值，落定收敛）。预估值可选增强：逐行宿主高度提示通道（演进位，非必需）。

**表 2 锚定**：锚点 = **（行身份, 行内偏移）**——非「首可见行顶」（wrap 长行可高于视口，顶锚定会跳；现有 virtual-list 锚定判据含跨顶行，有已知多补偿缺陷，不照抄）。RO 测量回填与宿主数据回填两路都走同一身份锚定通道：回填后按身份重算 scrollTop，视口永不跳。table 滚动容器补 `overflow-anchor: none`（virtual-list 有注释记载过不补的事故：浏览器锚定与自身补偿双重补偿）。

**表 3 API**：`row-auto-height` 属性 opt-in（缺省关闭 = 现状定高，零变化红线 + 关闭态渲染快照锁固化）；列 `wrap: true` 参与测量（非 wrap 列恒单行高，测量面收窄）；windowed 下 expand 行维持定高（auto-height 只作用数据行，flow 记账两维度并存，文档写明）。

**表 4 连带面（八条纪律，实现期两处经实证修正——以最终实现为准）**：

1. ~~测量回填走 tbody-only 通道~~ → **实证修正（c80fc963）**：测量回填走**常规 update() 渲染**（先写权威滚动位清吞滚动守卫，再走 battle-tested 的保存/恢复闭环）。自管 tbody 重建路径与滚动帧/焦点的保存恢复机制重叠，是 scrollTop 钳制与弹跳 scroll 事件的温床（windowed 回填被 ping 回起点的雪崩在真实浏览器实抓，happy-dom 无布局不可见）——整类消除，不留半截；
2. **编辑中的行排除**：sync 入口整体跳过（td.editing 检查；测量照常进缓存）——编辑结束后的下一次同步自然带上；
3. 收缩语义：沿用 `tr.style.height` 最小高 = 只增不减（消灭振荡），内容变矮先复位 inline 高再重测；
4. 缓存键按**展示序下标**（rowKey 的 JSON.stringify 回退有撞键病；任意淘汰会破坏前缀和——不设淘汰，随组件生命周期）；
5. 前缀按**展示条目**记账（expand/group 行计入 display——第一版就覆盖，不是禁区）；
6. 动态路径视口高用真实 `clientHeight`（`tableHeight()` 不含横滚条、表头覆盖——定高路径保持零变化）；
7. `rowHeightPx()` 14 处调用点加判空钩子走动态几何（`computeVirtualWindow` 原函数不动）；「零增量」措辞改为「**零行为变化 + 亚 KB 常数**」，perf:size 如实断言；
8. windowed flow 坐标改造（`windowedFlowItems` 前缀和化、像素相交请求映射 `mapVisualWindowToDataDynamic`、expand 行维持定高、滚动帧「请求先于清空 + st 直传 + stableClearBody 垫高」）——**auto-height 关闭时这些路径逐字节不变**（T4 式快照锁 + 既有 windowed 全套回归绿）。

**雪崩修复的附带收益**：滚动帧请求时序修正（先于清空派发 + 权威位直传）修复了**定高 windowed 同样存在**的真实浏览器缺陷——清空 tbody 后 scrollTop 被钳回 0、请求按 0 位计算把宿主回填 ping 回起点（此前无一真实浏览器 e2e 覆盖 windowed 滚动回填，故潜伏）。

**表 5 体积纪律**：注册型 L3 子路径 `@oas-ui/ui/data/table/auto-height`——import 才激活，默认 table 链零行为变化 + 亚 KB 常数（判空钩子）；几何（锚定/窗口/收敛数学）纯函数先行 TDD；预算档新增 + perf:size 断言。

**修旧账（独立小提交）**：虚拟 × merge/span-method 静默忽略 vs windowed × merge 有告警的既有不一致——对齐 windowed 先例补一条组合 devWarn（渲染零变化，只加开发期信号；不加在 `row-auto-height` 上）。

**工序**：修旧账独立提交 → A+B（含 wrap 三态 TDD）→ C 几何纯函数 TDD（含估计-真值拼接前缀和收敛性用例）→ 实现接线 → 两轮交叉审（≥2 模型，修复批再审）→ 全量回归 + 用户视角验证（亮/暗截图、交互真点、console 零告警）。

---

## v2.6.7：table windowed × 树形懒加载（已交付）

> 设计稿（2026-11-04 批准）→ 已交付（同日）：坐标口径按拍平模型自然消解的判断经实现验证成立（data-row-index/事件行号/ARIA 与纯 windowed 同口径）；scrollToRow 收起锚定守卫修复（ignoreNextScroll 吞事件）与 e2e 锚定复位断言为交付后两轮交叉审的增量。验收全绿（单测 T1-T6b、demo e2e、全量回归）。

### 背景与目标

windowed（服务端行窗口）模式现行明确跳过树形（本地不展开 + devWarn）；组织架构树 / 会计科目树 / 品类树等「万级节点 + 树形」场景无法窗口化。目标：windowed 与树形共存、子孙懒装载，**默认零变化**（非树形 windowed 用户零感知——红线：非 windowed 任何路径、纯 windowed 请求语义零变化，改动前后同场景 oas-window-request 逐值快照对比锁定）。

### 关键架构判断：拍平模型下坐标口径问题自然消解

树形输入在组件内本就「嵌套 children 自动拍平」——**children 行拍平后就是普通数据行**，`data-row-index` / 事件 `rowIndex` / ARIA 与纯 windowed 完全同口径（树形缩进与 toggle 只是首列渲染层，不占独立行）。懒装载场景下行号语义不变：未展开 = 子孙不在 data = 不存在这些行。**因此不需要新坐标系，不引入 visual 协议的强制依赖**（visual 协议保持可选优化：宿主想按「展开态全量」表达时可自行启用）。

### 协议形状（全部复用既有通道，零新事件）

| 项 | 契约 |
| --- | --- |
| 展开交互 | windowed + 树形数据在场时，点击树形 toggle **只派发 `oas-expand`（detail { key, expanded }），不本地改 `expanded`**——与 visual 协议生效时的「展开由宿主完全控制」**同款现成口径**，不新造 |
| 数据回填 | 宿主监听 oas-expand → 取子孙 → 合并 children 后**整体重喂 data 属性**（既有通道）；`expanded` 由宿主写回（既有属性） |
| `total` | 宿主维护 = **当前展开态下拍平总行数**（随展开/收起更新，既有属性的语义延伸） |
| 窗口计算/渲染 | 全走**现有 windowed 机制**（行窗口 + 期望区间 + 切片渲染），零改动复用 |
| 子孙标记 | 数据行新增保留键 **`hasChildren: boolean`**（懒装载下未展开父行无 children 数据，组件靠此字段渲染 toggle）——清洗层保留键契约（与 progress/effort 同口径，新增键入透传契约声明） |

### 组件侧改动面（小）

1. windowed 树形分支反转：从「跳过 + devWarn」改为「探测到树形数据（行带 children 或 hasChildren）→ toggle 派发事件等宿主」；纯切片无树形线索 → 行为逐字节不变。
2. **收起滚动锚定**：收起 N 行子孙使 total 突变、滚动位置漂移——展开/收起时若视口位于受影响行域内，锚定到操作父行（收起时）/首个新装孙子行（展开时）。
3. `hasChildren` 清洗保留 + toggle 渲染判定（无 children 数据但 hasChildren=true → 渲染可展开钮，expanded 状态读属性）。
4. 文档与警告文案更新（树形不再「不支持」，改为「树形 + windowed = 宿主托管 expanded/total/hasChildren」三件套说明）。

### 风险与对策（副作用账）

| 风险 | 对策 |
| --- | --- |
| 非树形 windowed 用户感知 | 双条件 gate（windowed && 树形线索）+ 请求快照回归测试（改动前后逐值比对） |
| 写坏宿主数据 | 数学上为零（windowed 从不写回；树形懒装载同为宿主喂数据组件只读） |
| 收起时滚动漂移 | 锚定策略（见改动面 2）+ e2e 断言 |
| 与 column-virtual 交集 | 沿用既有不兼容降级（两 opt-in 交集继续不支持，不扩承诺） |
| aria-level/aria-expanded 树形语义 | 复用非 windowed 树形的现成 ARIA 实现，仅输入源切换（行在切片内才有 ARIA——窗口外不渲染，语义随窗口，文档注明） |

### 验收（待批准后开工时细化）

- 万节点三层组织树 demo（首层 50 节点懒展开）+ windowed e2e（展开→回填→行窗口覆盖子孙；收起→锚定；非树形 windowed 请求快照逐值不变）
- 单测：hasChildren 清洗、toggle 事件反转、锚定数学、非树形零变化
- 全量回归 + 交叉审（动 windowed 渲染路径，审两轮起步）

---

## v2.6.7：D1 table 结构级渲染能力（structural-render，注册型 L3）

### 功能定义

为 `oas-table` 增加结构级渲染钩子：列定义 `render` 只能定制单元格**内容**，本能力接管**结构**（td/tr/th 本体）——「内容级 render 管不了结构」的补位通道。形态定案：依赖框架协调器的「组件整体替换」方案不可直译；headless 表格「渲染全权归宿主」为方向；渲染器实例生命周期（init/refresh/destroy）是重 DOM 复用时代的细粒度优化，本库 tr/td 随窗口化重建，以「默认装配后调用 + 每轮现读 property」的粗粒度模型等价覆盖。

### 详细需求

- 注册型 L3 `@oas-ui/ui/data/table/structural-render`：import 即注册（能力注册表 + 委托控制器，零生命周期）；默认 table 链零增量，全量入口与 CDN data 族含；L3 登记表 + 预算档（实测 0.6 KB / 档 1.2 KB）。
- `table.structuralRenderers = { bodyRow?, bodyCell?, headerRow?, headerCell? }` property 通道：函数不落 attribute、非函数槽静默忽略、赋值即重渲染；多级表头仅叶子格（组列不进 v1）。
- 契约：钩子在元素默认装配完成后调用（默认内容/行事件/edit·format·range 装饰链在内，结构在外）；tr/td 随窗口化重建、监听随元素销毁；每轮渲染现读 property（运行时替换即时生效，无闭包缓存）；`rowIndex` 与 `data-row-index` 同口径（windowed 绝对行号）；替换模式不得移除 role/tabindex（gridcell 语义）。

### 验收

- 单测 6 条：四槽调用与 ctx 字段 / 包裹结构 / 零 property 零调用 / 运行时替换无闭包缓存 / 非函数槽防御 / windowed rowIndex 口径。
- Chromium qa：demo 三槽可见效果真实生效（色点包裹/表头提示/行点击徽标 toggle；headerRow 由单测⑦覆盖）+ 未设 hooks 零开销 + console 零告警。
- 单测补 ⑦-⑪：四槽 parentElement 可用性 / 钩子抛错守卫（不白屏、同错去重、修复后自动恢复）/ paintCell 恢复重跑 bodyCell / merge 列同值判定前置快照（宿主改写实测合并不乱）/ 能力晚注册通知循环隔离。
- `perf:size` 全 PASS（零泄漏 + L1 包含 + 独立预算）；中英文档节 + demo（数据走 attribute、property 用 whenDefined 守卫防 expando 遮蔽——demo 书写遵循 prop-write-timing 纪律）。

---

## v2.6.7：select chip 形态（属性面板编辑模式组件化，E 需求）

### 功能定义

`oas-select` 新增 `variant` 第 4 值 `chip`：把触发器换成属性面板常见的紧凑胶囊编辑形态（真实消费方 = 属性面板字段值胶囊，如项目模板 IssueDetailDrawer 的 FieldChip）。同时扩展 `Option` 接口两个字段：`dot`（选项色点，CSS 颜色值）与 `avatarText`（迷你头像文本，取首字符），选项行首与 chip 触发器首渲染「首元素槽」。

### 属性契约

- **`variant="chip"`**：紧凑胶囊触发器——高 24px 走 `--oas-select-chip-height` token（缺省 24px，宿主覆盖即可调）、弱底（`--oas-color-bg-hover` 级，hover 用 color-mix 微强调）、无边框框选感（选中态不描边，仅 focus-visible / expanded 出焦点环）、宽度随内容收缩（`width: fit-content`，host `width: auto`）。与 size / status / multiple 等既有属性组合不冲突（chip 形态以自身 CSS 为主：size 只联动字号、控高以 chip token 为准；status 语义色按「后定义胜出」约定作用于 focus/expanded 描边与焦点环）。
- **`Option.dot?: string`**：CSS 颜色值（支持 token 名 / var() / hex 等任意颜色写法），选项行首与 chip 触发器首渲染 8px 圆点（清洗后内联写 `style.background`，快照确定性）；非法值（含注入面字符 / 空串 / 非字符串）静默丢弃不渲染。
- **`Option.avatarText?: string`**：迷你头像，取首字符渲染 16px 圆形头像；形态对齐库内头像 token 缺省（主题无 `--oas-color-avatar-*` 族，走 `--oas-avatar-bg` / `--oas-avatar-on-color` 开口、缺省回落 primary 实底 + on-primary 字色，暗色走 token 变体）；空/非字符串清洗丢弃。
- **首元素槽优先级**：`dot` > `avatarText` > `icon`（两字段同时给时 dot 优先，首元素槽只取一个）；chip 触发器 = 首元素槽 + 选中项 label（单行省略）+ chevron。
- **子元素通道**：`<oas-option dot="…" avatar-text="…">` 属性映射同款字段与清洗，运行时改写即时刷新（MutationObserver attributeFilter 扩展）。
- **语义**：单选点选即 `oas-change`（detail 与既有 select 一致）；多选 / filter / clearable 与 chip 组合不禁止（多选标签走既有 chip 通道）；空值走既有 placeholder 机制（chip 态同样生效）；键盘等价（关闭态 ↓/↑/Enter/Space 展开、展开态 ↑/↓ 移动、Enter 选中、Esc 关闭，全走既有链路）；首元素为装饰性节点（`aria-hidden`），可访问名仍来自 label 属性 / placeholder。

### 非目标

- 不新增事件 / 方法 / 插槽；不新增 i18n key（纯呈现）；新增 CSS 变量出口仅 `--oas-select-chip-height` 一个。
- 多选标签（value chips）不渲染 dot / avatarText（首元素槽只作用于下拉选项行与 chip 单选触发器）。

### 验收

- 单测：`pnpm vitest run packages/ui/src/form/select` 全绿（chip 镜像/样式规则/首元素优先级/label+chevron/placeholder 空态/点选即 change/键盘等价/选项行首元素/非法值清洗/avatarText 首字符/multiple 组合/reserve-width 计入首元素/子元素通道映射与运行时刷新，既有 186 条零回归）。
- e2e：`packages/ui/qa-regression/select.spec.ts` 追加 chip 场景（Vue demo 属性存活 + demo 真交互反馈 + 滚动容器底部 fixed 翻转不被裁切夹具 + 外点/Esc 关闭 + 选中即改且 chip 首元素更新），`--project=chromium` 全绿。
- 门禁：`pnpm build` + `pnpm api:check`、`pnpm typecheck`、`pnpm qa:audit:check`、`pnpm format:check`、`pnpm lint:md`、`llms:gen` + `llms:check`、`check-trace` 0 命中、`pnpm perf:size`（select 链增量 < 0.6 KB）。
- 文档：中英 select.md「属性面板模式（variant="chip"）」节 + 可运行 demo（workflow 状态色点场景）；API 表与描述文案经 api:scan/api:gen 同步。

---

## v2.6.6：menubar 可编辑焦点 shortcut 开关（editable-shortcuts）

### 功能定义

`oas-menubar` 新增 `editable-shortcuts` 属性：控制可编辑焦点（`input` / `textarea` / `select` / `contenteditable`）内已定义 shortcut 的放行粒度。v2.6.6 修复「可编辑焦点下快捷键全部失效」时把放行策略定为「Ctrl/Cmd 组合与 F 功能键全放行」，下游编辑器应用若给 Ctrl+C/V/X/A/Z/Y 绑定菜单动作会劫持原生编辑键；本开关提供组件级收口，默认行为不变（向后兼容）。

### 属性契约（三态）

- **缺省 / `all`（默认）**：现行行为——带 Ctrl/Cmd 的已定义 shortcut 与 F1–F24 单键全部放行（编辑器内 Ctrl+S 保存可达）。
- **`safe`**：放行除**编辑键**外的 shortcut——编辑键 = `Ctrl/Cmd + C/V/X/A/Z/Y`（大小写不敏感），让路给浏览器原生复制/粘贴/剪切/全选/撤销/重做；`Ctrl+S`、`Ctrl+N`、F 功能键等其余形态照常放行（即「Ctrl+S 可用、Ctrl+C 让路」）。
- **`none`**：可编辑焦点内一律不放行——所有已定义 shortcut（含 Ctrl/Cmd 组合与 F 功能键）都让路给控件。
- **非法值**：回落 `all` 并在开发环境 `devWarn` 恰一次（同实例同值去重，对齐仓库 warnOnce 惯例）。
- 属性进入 `observedAttributes`，运行时切换即时生效；放行判定在既有调用链（editable 守卫 → matchShortcut → preventDefault）内完成，未放行的 shortcut 不 `preventDefault`（原生编辑链路不受影响）。

### 非目标

- 不改变焦点不在可编辑控件时的任何行为；不改变 Alt 访问键 / AltGr / IME 组合让路规则。
- `safe` 档不做逐键自定义（编辑键清单固定为 C/V/X/A/Z/Y 六键）；不做宿主回调或 `oas-shortcut-blocked` 类事件。
- 不新增事件、方法、插槽、CSS token。

### 验收

- 单测：menubar「输入上下文守卫」组扩展 8 条（safe 下 Ctrl+S 触发且 Ctrl+C/Cmd+C 不触发且不 `preventDefault`、大小写不敏感、F9 不受影响；none 全让路；非法值回落 all + 告警恰一次；all→safe→none 运行时逐态切换；既有默认/all 回归全保），`pnpm vitest run packages/ui/src/navigation/menubar` ×2 全绿。
- 门禁：`pnpm test` 全量、`pnpm build` + `pnpm api:check`、`pnpm typecheck`、`pnpm qa:audit:check`、`pnpm format:check`、`pnpm lint:md`、`llms:gen` + `llms:check`、`check-trace` 0 命中。
- 文档：中英 menubar.md warning 块改写为三态说明（表格 + 编辑键清单 + 示例，保留风险说明）；API 表与描述文案经 api:scan/api:gen 同步。

---

## v2.6.6：gantt / resource 二期核心扩展（4 项 opt-in）

### 功能定义

在 oas-gantt / oas-resource 核心组件上补齐二期 4 项**全部 opt-in、默认关**的能力（**默认视觉零变化**——数据面契约变化单列于「边界与非目标」）：`show-effort` 工时列、`show-status-line` + `status-date` 状态线与计划进度刻度、`baselines` 多基线数据通道与 `baseline-id` 选择、`show-cost` 泳道成本合计。核心改动遵循最小侵入：新增属性走既有 attr 门禁 + 渲染分支模式，不改既有渲染路径的默认产物。

### 详细需求（契约摘要）

- **G1 `show-effort`（oas-gantt）**：`GanttTask.effort?: number`（工时估算，单位天可为小数；**纯展示**，不参与排程/依赖/布局；清洗层保留有限**非负**数值、丢弃 NaN/±Infinity/负数/非数值，与 costRate 同口径）。开启后行标签区两列（名称 | 工时）：工时右对齐、最多两位小数去尾零（超大值转科学计数防超长数字），缺失显示空；列头 i18n `gantt.effort`（zh「工时」/en「Effort」，其余 8 语言英文兜底），单元格可读名 i18n `gantt.effortValue`（zh「工时 N 天」，与 resource 行头「成本 N」前缀方案对齐）；列宽 token `--oas-gantt-effort-width`（缺省 56px）表头/行共用。关闭时不出任何节点。
- **G2 `show-status-line` + `status-date`（oas-gantt）**：状态竖线照 today-line 渲染路径（xOf/mirrorX/行高同算式），独立 token `--oas-gantt-status-line-color`（缺省 `--oas-color-warning`），`status-date` 非法/缺省回落当天（SSR 口径写明：服务器当天，需确定性请显式传值；开关关闭时不解析该属性——默认路径零新增开销）；条内计划进度刻度 = **含端日粒度**口径（status 日与 start 的日历日差含当日，clamp 工期；与 `computeEvm` planned 同构），2px 窄刻度（min() 钳右缘防溢出），并写 `data-plan-ratio`（0-1 两位精度）供宿主消费；里程碑按二值（0/1），summary 不画；只画刻度——不染色、不告警、不参与交互。
- **G3 多基线（oas-gantt）**：新导出接口 `GanttBaseline { id, start, end?, progress? }`；`GanttTask.baselines?: GanttBaseline[]` 清洗层逐条校验（id 唯一非空、start 合法、end/progress 非法降级），全无效整组不落；既有单 `baseline` 字段归一为 `[{ id: 'default', ... }]`（**不 deprecate**，两通道并存时 baselines 优先）；`baseline-id` 属性选择展示基线（缺省第一条，未命中回落第一条并实例级 devWarn 一次）；渲染路径（基线条/偏差徽标/tooltip）参数化取数；`computeVariance(tasks, baselineId?)` 可选第二参数（未命中回落第一条、模块级告警一次；既有单参调用行为不变）。
- **R1 `show-cost`（oas-resource）**：`ResourceItem.costRate?: number` 小时费率（纯展示）；开启后每个有费率 lane 行头显示 Σ(已装载周期内任务天数 × 8h × costRate)，固定两位小数、无货币符号（单位由宿主 CSS/文案自定）；「已装载周期」= 时间轴全域（range-* 托管优先，否则按已装载任务推导），跨轴任务按相交日历日数计；费率缺失/非法 lane 不显示；合计随数据/日期窗口在 update() 重算，滚动可视列窗口不触发；i18n `resource.cost`（zh「成本」/en「Cost」×10）。

### 边界与非目标

- 全部属性默认关：**默认视觉零变化**（新装饰节点模板常驻 + hidden 控制，DOM/aria/SSR 快照缺省形态不变；数据面契约变化见下）。
- G2 刻度口径为**含端日粒度**（status 日与 start 的日历日差含当日，clamp 工期；与 `computeEvm` planned 同构——有跨包对表测试），不做计划落后染色/告警（保持最小展示面）；G3 不做基线对比面板（宿主可消费 data-* 与 computeVariance 自建）；R1 不做货币格式化/汇率（宿主职责），合计按**托管轴端点**求交（无 range-start/range-end 托管时按任务推导轴），不随刻度档漂移。
- **数据面契约变化（默认关下仍生效，需宿主知悉）**：`effort` / `costRate` / `baselines` 成为清洗层保留键（宿主同名**非法**值会被清洗丢弃，合法值不受影响）；单 `baseline` 字段**不物化**派生 baselines——`el.tasks` 读回不再包含派生键，updateTask/updateTasks 对单字段的增/改/删即时生效（读侧归一由 taskBaselines 承担）。
- 不新增事件、方法、插槽；新增 CSS token 仅 2 个（effort-width / status-line-color）。

### 验收

- 单测：gantt 26 条 + resource 8 条新用例（精确断言：默认关形态零变化、开启逐节点、清洗边界、updateTask/updateTasks 单 baseline 增/改/删、两通道并存优先级、computeVariance 双签名、计划刻度与 evm 跨包对表、成本三档一致与托管轴求交、告警恰一次/实例隔离）；`pnpm test` 全量绿。
- e2e：gantt.spec / resource.spec 各加 opt-in 开/关 + 暗色存在性回归。
- 门禁：`pnpm build`（含 exports:check）、`pnpm typecheck`、`pnpm perf:size`（gantt 链 61.1 → 62.7 KB gzip，预算 70 KB 内；resource 链无独立预算档，实测 46.4 KB gzip）、`pnpm qa:audit:check`、`pnpm format:check`、`pnpm lint:md`、api:scan/api:gen 0 漂移、llms:gen/llms:check、check-trace 0 命中。

---

## v2.6.6：gantt / resource Pro helper 分包批（6 个按需 helper）

### 功能定义

把甘特/资源场景的高频数据加工能力做成 **6 个纯函数 helper 子路径**，挂在新分包入口上按需引入：`@oas-ui/ui/data/gantt/export`（CSV 导出）、`@oas-ui/ui/data/gantt/evm`（挣值管理 EVM）、`@oas-ui/ui/data/gantt/alap`（后向 CPM 反推最晚日期）、`@oas-ui/ui/data/gantt/recurring`（周期任务展开）、`@oas-ui/ui/data/resource/cost`（任务成本核算）、`@oas-ui/ui/data/resource/pool`（共享资源池单例）。组件核心（oas-gantt / oas-resource）一行不动；helper 运行闭包零 core / 零 i18n / 零 customElements / 零 CSS / 零模块级副作用（pool 的 globalThis 挂载延迟到 `getSharedResourcePool()` 首次调用）。

### 详细需求（契约摘要）

- **export / toCsv(tasks, opts?)**：按清洗层同款顺序拍平嵌套 children（DFS 前序）；默认列 `id,name,start,end,type,progress,parent,project`；milestone 的 end 回退 start；type 缺省推导（有子=summary、无 end=milestone、其余 task）；CSV 标准转义（含分隔符/引号/换行加引号、引号翻倍、末尾换行）；`bom` 选项控制 `\uFEFF`；数组字段（resources/dependencies）仅自定义列输出（`|` 拼 id）。
- **evm / computeEvm(tasks, opts)**：budget = taskCost 优先，否则 Σ(分配资源 × 工期小时 × 时薪)（milestone 工期 0，预算只看 taskCost）；planned = budget × min(1, 已耗天数/工期天数)（milestone 按 start ≤ statusDate 全计）；earned = budget × clamp(progress,0,100)/100；ac 缺省 = EV（中性口径）；spi/cpi 在 pv/ac 为 0 时为 null。
- **alap / computeLateDates(tasks, opts?)**：输入视为当前排程结果（不做正向重排）；projectEnd 缺省 = max(end)；fs/ss/ff/sf + lag 反推 lateFinish/lateStart（与核心 CPM 同公式、lag 正值推迟后继）；totalFloatDays = lateStart − 当前 start；依赖环 best-effort（单趟松弛、确定有界、不抛）；悬空边跳过；输出 day 精度并保留输入 hour 成分。
- **recurring / expandRecurring(tasks, range, opts?)**：daily/weekly/monthly + interval/byWeekday/count/until；输出 = 非周期任务 + 实例（默认剔除 master，keepMaster 保留）；实例 id `${id}#${seq}`（seq = 序列内发生序号，不随窗口变化）+ masterId + recurringInstance + progress 0，日期平移保工期与 hour 成分，不带 dependencies；count 计整个序列发生（含窗外）；weekly 周锚点 = start 所在周周一；monthly 同月日、短月跳过。
- **cost / computeCost(tasks, resourceIds, opts?)**：工期 = end − start + 1（含当日）；taskCost 优先，否则 Σ(工期 × hoursPerDay × 费率)；resourceIds 限定计费资源集合（不在集合不计费不分摊）；perResource 按「实际计费的分配资源数」均摊，perTask 全额。
- **pool / ResourcePool + getSharedResourcePool()**：id 去重登记表（register/remove/get/list/clear + version 生效变更计数，no-op 不抬版本）；单例挂 `globalThis[Symbol.for('@oas-ui/ui/resource-pool/v1')]`（link/多副本共享）。

### 按需叙事

helper 不进 L1、不进 CDN 族包（`perf:size` 新增 6 条 L3 登记 + 独立预算档断言锁定：helper 必须不在 L1 与族包，否则 FAIL）；消费方显式 `import` 后才进包。首档预算按构建后实测上浮 ~30% 取整：export 1.5 KB（实测 1110 B）/ evm 1.5 KB（1097 B）/ alap 2 KB（1423 B）/ recurring 2 KB（1380 B）/ cost 1.25 KB（828 B）/ pool 0.75 KB（490 B）gzip，六链 core+i18n 闭包复算均为 0 KB。

### 非目标

不进 L1 / CDN 分包（helper 无触发面，进 union 即死重）；不改 oas-gantt / oas-resource 组件核心（不新增属性/事件/插槽）；helper 不做 i18n 文案与 UI 渲染；alap 不做工作日日历吸附（日历口径归核心 auto-schedule）；recurring 不展开 master 的子树、不为实例重建依赖；新增 i18n key 为零。

### 验收

- 6 个 helper 单测 56 条全绿（每文件独立跑 2 次）；`pnpm test` 全量、`pnpm build`（含 exports:check）、`pnpm typecheck`、`pnpm perf:size`（新链独立预算且 [L1 包含关系]/[独立预算]/[族包包含关系]/[Pro 零泄漏] 全 PASS）、`pnpm qa:audit:check`、`pnpm lint:md`、`llms:gen + llms:check` 通过。
- 6 链闭包复算（chain-attribution，与 perf:size 同口径）：core+i18n = 0 KB。

---

## v2.6.6：gantt 斑马纹与周末/假日列视觉修正 + 行高对齐 + 行 hover（gantt / resource）

### 功能定义

修复 `oas-gantt` 开启 `stripe` 后，周末/假日列在斑马行上吸收条纹色、与普通行上颜色不一致的问题；`stripe` 继续保持 opt-in（默认关），并在虚拟滚动 demo 提供真实开关。修正 `row-height` 属性不作用于行名高度导致的错位。为 `oas-gantt` / `oas-resource` 增加整行 hover 底色（默认开，`hover="false"` 关闭，与 `oas-table` 惯例一致）。

### 详细需求

- 周末/假日列默认底色从相对 `transparent` 混合改为相对 `--oas-color-bg` 的不透明混合，确保同一列在斑马行与普通行上颜色一致。
- 保留 `--oas-gantt-weekend-bg` / `--oas-gantt-holiday-bg` 覆盖通道。
- `stripe` 仍为 opt-in：开启时按绝对行号着色，关闭时条纹层整体移除；demo 可用开关即时切换。

### 验收

- CSS 单测锁定不透明混合公式。
- Chromium 像素级回归：暗色下周末列在普通行与斑马行同色，且与纯斑马底色可区分。
- demo 开关真实点击回归：关闭后 `.stripe-canvas` 移除，开启后恢复。
- 行高对齐：`row-height` 属性在场时映射 `--oas-gantt-row-height`（与 height 属性同协议，合法口径为纯数字 ≥20），行名高度与网格行高同源；几何级 e2e 断言斑马行名与条纹顶/底边逐一相等。
- 行 hover（gantt + resource 同形态）：`hover` 属性默认开、`"false"` 关闭（与 oas-table 惯例一致）；gantt 行名/任务条、resource 泳道 hover 时整行点亮；新 token `--oas-gantt-row-hover-bg` / `--oas-resource-row-hover-bg` 与斑马纹、条 hover 色独立；gantt 时间轴装饰层单元素挂绝对行号（条纹 < hover < 选中，周末/假日列仍在其上）；触控不响应。

---

## v2.6.6：issue 反馈批（Select 选项图标 + 文档站导航）

### 功能定义

响应社区 issue 的三点反馈：① `oas-select` 增加数据驱动的选项图标字段，覆盖国家 / 语言 / 状态选择这类高频场景；② 文档站组件侧栏与总览页在保留语义分组的前提下按组件 slug 组内字母排序；③ 英文浏览器首访 landing page 自动进入英文站，中文深链不做语言猜测。

### 详细需求

- **`Option.icon`**：`options` JSON 与 `<oas-option icon>` 子元素通道同名；值为 `@oas-ui/icons` 注册表图标名，选项行、单选触发器与多选 chip 统一渲染 `icon + label`；图标 `aria-hidden`，可访问名称仍来自 `label`；未注册图标回退纯文本并仅 devWarn 一次；富内容仍走 `oas-option-render` / `template[slot="option"]`。
- **组件导航排序**：sidebar 数据抽离为 `.vitepress/sidebar.ts` 单一数据源；每组内按 `/components/<slug>` 字母排序，英文侧栏由同一顺序派生；总览页同步；`sidebar-order.test.ts` 防漂移；llms 生成器同步读取抽离数据源。
- **Landing 语言适配**：无显式偏好且 `navigator.language` 以 `en` 开头时，仅 `/` / `/index.html` 跳 `/en/` 并保留 query/hash；自动猜测不写 `oas-lang`；显式 `oas-lang` 偏好仍全站生效；`/en/` 显式路径永不回弹。

### 非目标

不做任意 HTML / URL 图标字段；不把浏览器语言猜测扩展到深链；不扁平化语义分组；不改变现有自定义 option/tag 渲染事件语义。

### 验收

- `oas-select` 183 条单测、select qa-regression 20 条 Chromium 用例、首页 docs-site 17 条用例、sidebar-order 5 条用例通过。
- `api:check` / `llms:check` / build / typecheck / 中英 demo 与暗色、RTL、console 零告警验证通过。

---

## v2.6.6：Bubble 气泡尾巴（opt-in）

### 功能定义

`oas-bubble` 增加可选 `tail`：在气泡底部外角画一个指向发送者的小尾巴，供 IM/客服式会话在需要「说话人指向」时使用；默认无尾巴，保持现有 AI 会话的克制表面与向后兼容。

### 详细需求

- **`tail`** 取 `none`（默认）| `auto` | `start` | `end`：`auto` 跟随有效对齐（显式 `align`，否则容器 `text-align` 继承反射：start → 左侧、end → 右侧）；`start` / `end` 显式指定；非法值静默回落 `none`。
- **视觉规则**：实底变体（default / secondary / destructive）在底部外角画弧形尾巴，颜色与气泡表面同源（`--_oas-bubble-surface`），暗色自动适配；`outline` 不画突出尾巴、改为底部外角收小圆角（避免描边断口）；`muted` / `ghost` 无表面不画。
- **位置**：底部外角（IM 通行约定）；逻辑属性实现，RTL 自动镜像；装饰性伪元素，不进 DOM/读屏。
- **分组语义**：组件不猜分组，宿主只给同一发送者连续消息的最后一条加 `tail`；文档给出双方对话 demo。
- **Token**：`--oas-bubble-tail-size`（默认 16px）、`--oas-bubble-tail-offset`（默认 0）、`--oas-bubble-tail-corner-radius`（outline 退化圆角，默认 `--oas-radius-sm`）。
- **SSR**：`template()` 首帧按显式 `align` 写入尾巴侧；继承对齐路径由客户端 update/rAF 收敛。

### 非目标

不做 `tail-position="top"`（顶部尾巴）与独立尺寸预设；不自动推断分组/最后一条；不新增 DOM 结构或公开 part；不改 message-row / message-actions / message-scroller 职责。

### 验收

- 单测覆盖：默认 none、非法值、auto 跟随 align、显式覆盖、运行时可改、CSS 规则（实底弧形 / outline 退化 / muted·ghost 不画 / 逻辑属性无物理方向）、SSR 首帧落侧。
- e2e：真实浏览器断言两侧尾巴伪元素存在/尺寸与 offset、outline 圆角与无伪元素、muted/ghost 无伪元素、RTL 镜像、暗色下尾巴背景与气泡表面同色；console 零告警。
- 中英文档 + API 表 + CHANGELOG 同步；亮/暗截图核对尾巴与气泡表面无缝衔接；`api:check` / `llms:check` / build / typecheck 全绿。

---

## v2.6.6：i18n 默认语言包按家族切片（包体止损批）

### 背景

内置 zh-CN 默认文案随 `@oas-ui/i18n` 公共入口整包携带，任何按需组件链都被塞进约 6.8 KB（gzip）的全集文案——单组件按需链的默认文案占比过高，form 链余量已触底；同时旧的裸副作用 import 在部分打包消费方（含 CDN）会被摇掉，默认语言包丢失导致界面出现 raw key。

### 实现要点

- 内置 zh-CN 拆成 **9 个家族切片**：basic / conversation / data / feedback / form / framework / layout / navigation / workbench。
- **单一事实源 + 生成物**：`packages/i18n/src/locales/zh-CN.ts` 保持手写全集；`node scripts/i18n/gen-slices.mjs` 从组件源码静态扫描 key 引用生成 `packages/i18n/src/slices/<family>.ts`（文件头标注生成物），`--check` 防漂移并接入完备性单测。
- **消费形态：值导入 + 显式调用**（不依赖模块副作用 / `sideEffects`）：

  ```ts
  import { registerDefaultMessages } from '@oas-ui/i18n/registry'
  import { dataMessages } from '@oas-ui/i18n/slices/data'

  registerDefaultMessages(dataMessages)
  ```

- **入口分工**：公共入口 `@oas-ui/i18n` 行为不变（9 切片全量注册）；新子路径 `@oas-ui/i18n/registry`（无默认文案）与 `@oas-ui/i18n/slices/<family>`。
- **`getLocale().messages` 语义**：按需消费下只保证已加载的切片；整包仍可 `import zhCN from '@oas-ui/i18n/zh-CN'`。
- **跨家族 key**：被多个族引用的 key 重复写入每个消费族的切片（不按所有者单族分配）；无活代码引用的 8 个死键归 framework。
- **构建**：i18n 发布产物加 `removeComments`（d.ts 保留文档注释）；`packages/i18n` 的 `sideEffects` 增 `./dist/registry.js`。

### 实测收益（gzip，dist 静态闭包口径）

| 按需链                                                    | 前       | 后       | 变化     |
| --------------------------------------------------------- | -------- | -------- | -------- |
| form                                                      | 28.9 KB  | 22.4 KB  | −6.5 KB  |
| table                                                     | 68.8 KB  | 64.3 KB  | −4.5 KB  |
| gantt                                                     | 66.7 KB  | 61.1 KB  | −5.6 KB  |
| json-viewer                                               | 34.0 KB  | 28.4 KB  | −5.6 KB  |
| diff-viewer                                               | 32.7 KB  | 27.1 KB  | −5.6 KB  |
| helper 链（table/advanced、range、detail、glass-fluid） | 不变     | 不变     | —        |

### 修复项

打包消费方（含 CDN）此前可能丢失默认语言包（裸副作用 import 在打包时被摇掉 → raw key）；现组件入口显式注册本族切片，CDN 产物含 9 族文案，`perf:size` 新增 `[CDN 默认文案]` 断言锁定。

### 非目标

其余 9 个语言包不动（`loadLocale` 动态加载，不进口袋）；不改 key 命名与文案；不做跨语言回退。

### 验收

- 全量单测 11805 绿（含切片完备性、注册边界与多副本场景测试）。
- `node scripts/i18n/gen-slices.mjs --check` 防漂移通过。
- `perf:size` 全绿（按需链预算 + `[CDN 默认文案]` 断言）。

## v2.6.7：i18n 语言代码归一 + 多语言扩充（繁体/巴西葡语 + P1）

### 功能定义

补齐明显语言缺口（繁体中文、巴西葡语正名，以及 P1 的印地语、泰语、乌克兰语、希伯来语、波斯语），并建立 BCP 47 语言标签归一/别名层，让 `zh-TW` / `pt` / `en_US` / `he-IL` 等常见写法可直接用于 `setLocale` / `loadLocale` / `config-provider locale` / SSR。`he` / `fa` 新增 RTL 语言包，RTL 覆盖从单一 `ar` 扩到 3 种。

### 详细需求

- **canonical 语言名**：`zh-CN`（默认）/ `zh-Hant` / `en` / `ja` / `ko` / `de` / `fr` / `es` / `pt-BR` / `ru` / `ar` / `hi` / `th` / `uk` / `he` / `fa`；`pt` 保留为 `pt-BR` 兼容别名（历史 `pt` 文案即巴西葡语）。
- **归一化**：BCP 47 大小写 + 下划线转连字符（`zh_hant_tw` → `zh-Hant-TW`）；内置别名表覆盖 `zh` / `zh-Hans` / `zh-CN` / `zh-SG` → `zh-CN`，`zh-TW` / `zh-HK` / `zh-MO` / `zh-Hant` → `zh-Hant`，`pt` / `pt-BR` → `pt-BR`，语言级语言包接受常见地区变体（`en-US` / `en-GB` → `en`、`es-419` → `es`、`ar-EG` → `ar`、`hi-IN` → `hi`、`th-TH` → `th`、`uk-UA` → `uk`、`he-IL` / `iw` → `he`、`fa-IR` → `fa` 等）；`pt-PT` 不映射到 `pt-BR`（不把巴西葡语当欧洲葡语），未识别标签保持归一后的原值；扩展段可剥离回退基础标签、私有段不剥离。
- **作用面**：`setLocale(name)`、`loadLocale(name)`、`getDirection(name)`、`registerLocale({ name })`、core 的按 locale 名翻译器查找、SSR `RenderToStringOptions.locale` 统一走同一套归一；config-provider 的 `locale` 属性经 core 归一即可命中。
- **语言内容**：`zh-Hant`（繁体 + 台湾术语）、`pt-BR`、`hi`、`th`、`uk`、`he`、`fa` 均以 zh-CN 的 450 keys 为基，completeness 测试兜底；`he` / `fa` 标注 `dir: 'rtl'`。
- **入口**：新增 `@oas-ui/i18n/zh-Hant`、`pt-BR`、`hi`、`th`、`uk`、`he`、`fa` 子路径；`@oas-ui/i18n/pt` 保留并指向 `pt-BR`。

### 非目标

不新增 `it` / `nl` / `pl` / `tr` / `vi` / `id` 等其他语言（后续批次）；不拆分 `pt-PT` / `es-419` / `en-GB` 独立语言包；不改默认语言（仍 zh-CN）；不改 `zh-CN` canonical（避免 breaking）。

### 验收

- core `normalizeLocaleTag` / `stripLocaleExtensions` 单测（大小写/脚本/地区/扩展/私有段/空串）；i18n registry 单测（别名归一、`setLocale('pt')` → `pt-BR`、`setLocale('zh-TW')` → `zh-Hant`、`loadLocale` 别名、`getDirection('ar-EG')` / `he-IL` / `fa-IR`、扩展段回退）；SSR 单测（`zh-TW` / `pt` / `en_US` / 自定义别名包 / 冷加载竞态 / `he` RTL）；completeness 覆盖 16 个语言包。
- `typecheck` / `build` / `api:check` / `llms:check` / `format:check` 全绿；中英文 FAQ / SSR / 根 README / i18n README 同步；亮/暗与 RTL 抽检通过。

---

## v2.6.5：工作台悬浮面板 oas-floating-panel（Task 12）✅

### 功能定义

新增 workbench 族 `oas-floating-panel`：一块**非模态**、可移动/可缩放的悬浮面板（调色板 / 图层 / 日志 / 监视器等工具窗语义），宿主属性即状态（`open` / `rect`），指针与键盘等价可操作，同族多实例叠放恒定 overlay 档。不做 portal/teleport、不做布局持久化、不做窗口管理器（平铺/吸附/最小化）、不做模态遮罩。

### 详细契约

- **开合（受控属性 + 命令式动作）**：`open` 布尔属性是唯一状态源；`show()` / `close()` 只写该属性（`close()` 返回是否已关闭）。组件内部交互（关闭钮 / Esc / 方法）派发 `oas-open-change`；宿主直接写 `open` 属性静默吸收（不派发 `open-change`，防双向绑定回环）。`close()` / 关闭钮 / Esc 先派发可取消 `oas-before-close`，`preventDefault()` 即保持打开状态、不写属性、不派发 `open-change`。
- **事件 detail（固定结构）**：`oas-before-close` → `{ reason, source }`；`oas-open-change` → `{ open, reason, source }`；`oas-move` / `oas-resize` → `{ rect, source }`（resize 另带 `edge`）；`oas-activate` → `{ rect, source }`。`reason` ∈ `show | close-button | esc | method`，`source` ∈ `user | api`，移动/缩放 `source` ∈ `pointer | keyboard`，激活 `source` ∈ `pointer | api`（打开边沿只更新叠放顺序，不派发 `activate`）。
- **几何**：`rect="x,y,width,height"`（相对宿主锚点的像素坐标，逗号或空格分隔）；宿主零尺寸、`position: relative`，面板框体 `position: absolute` 相对锚点定位（不 portal、不改宿主 DOM 层级、随容器滚动）。缺省 `48,48,420,300`。`min` / `max` 为 `"宽,高"`（缺省 `min="160,96"`、`max` 不限制；`min` 非正/非法含 `0` 视为未提供并回落缺省 `160,96`，不是 1px 下限）；`min > max` 时以 `min` 为准（退化规则文档化）；非法/非有限值回落，输出取整。外部写 `rect` 立即生效且静默；边界夹取只作用于用户交互（拖动/缩放/键盘），不改写宿主显式写入的坐标。初始 `rect` 完全在边界外时首次拖动会先夹回边界内（瞬移一次，文档记档）；手势进行中改 `boundary` / `boundary-padding` / `min` / `max` 不影响当前手势，下一次手势生效。
- **边界**：`boundary` 缺省 `viewport`（当前视口，按宿主锚点换算）；也可给 CSS 选择器，按该元素的 `getBoundingClientRect()` 夹取；`boundary-padding` 非负像素内缩（非法回落 0）。边界元素缺失或零尺寸时不夹取（dev 告警一次）。SSR 段不测量、不夹取。
- **指针**：`movable` 时标题栏拖动；`resizable` 时八向手柄（四边 + 四角）。仅接受主按键主指针（右键/第二指针不激活、不置前）；`setPointerCapture` 失败回退 document 监听；`pointerup` 提交（属性写入 + 单次 move/resize），`pointercancel` / `window blur` / 交互中 Esc 取消（回到起始 rect、零事件、面板不关闭），`lostpointercapture` 视为结束并提交；零位移零事件。断开连接清理监听/rAF 并取消进行中手势。触屏（`pointer: coarse`）下手柄/关闭钮热区 44px：标题栏（含关闭钮）层级高于手柄，上侧/上角手柄从标题栏下沿起算，保证拖标题栏与点关闭不被缩放手柄侵占。**代价**：coarse 下内容顶部约 44px 为 `n` 手柄缩放带，默认最小尺寸 `160×96` 时内容区几乎不可点——触屏建议用更大 `min`（如 `240,180`），或整体关闭 `resizable`（没有单边手柄开关）。富标题（`title` 插槽）撑高标题栏时，客户端用 `ResizeObserver` 实测标题栏内容高并写回 host `--oas-floating-panel-titlebar-height`（px），上侧/上角手柄随之下移；手势语义不变。
- **键盘**：面板框体可聚焦（`tabindex="0"`，`role="dialog"` + `aria-modal="false"`）。方向键移动、`Shift` + 方向键缩放，步长 8px；RTL 下水平语义镜像（右方向键朝书写前进方向）。焦点在可编辑控件内时不拦截方向键。
- **激活与叠放**：族内恒定 overlay 档（`--oas-z-overlay`，基准值 + 0/1），仅「最前」面板 +1，`z-index` 不随 open 次数增长；首帧即打开（SSR / 首屏受控态）的面板同样落在最前档。`bringToFront()` / 面板内主键 pointerdown 置前并派发 `oas-activate`，同时把该面板的 Esc 层提到栈顶（Esc 顺序跟随视觉最前，而非打开先后）。多实例并列、断开摘除并由下一个打开的面板接任最前。
- **焦点**：打开时聚焦 `initial-focus` 选择器（找不到回退面板框体），关闭时焦点归还打开前的元素（仍在文档内时）。「焦点是否仍在面板内」沿组合链（`parentNode` → `ShadowRoot.host`）向上判定：内容里嵌套组件 shadow 内的焦点同样归还（不丢到 `body`），用户已把焦点移到面板外时不抢。
- **SSR/DSD**：模板/位置由属性纯函数决定，服务端不测量；`open` 快照禁 JS 可见标题与位置，`hydrate()` 校验框体/标题栏/标题/关闭钮/内容槽/八个手柄结构后接管，不重建 shadow（标题快照缺 `id` 时补写并让 `aria-labelledby` 不悬空）；渲染段不挂 document/window 监听、不注册叠放、不抢焦点。SSR 快照仍用默认标题栏 token（客户端连接后由 `ResizeObserver` 实测写回，不产生服务端/客户端差异帧）。
- **无障碍**：`role="dialog"` + `aria-modal="false"` + 标题 `aria-labelledby`；无标题时回落 i18n `aria-label` 且不写悬空/空名称的 `aria-labelledby`（title 槽 fallback 不计为标题；`title` 插槽动态清空后切回 `aria-label`，填回再切回 labelledby）；关闭钮有 i18n 名称；手柄 `aria-hidden`（键盘等价路径为 Shift + 方向键）；`prefers-reduced-motion` 下过渡降级；系统强制色（`forced-colors`）下框体与关闭钮焦点环用 `outline` 兜底（`box-shadow` 被禁用时不丢焦点指示，WCAG 2.4.7）。

- **fix round 1（独立复核）**：① **coarse 44px 手柄覆盖标题栏（Critical）**——标题栏（含关闭钮）层级高于手柄（`z-index: 2` vs `1`），`n`/`ne`/`nw` 手柄与 `e`/`w` 手柄竖向起点改为标题栏高度 token（coarse 下标题栏与关闭钮同高 44px），触屏可拖标题栏、可点关闭。② **Esc 层顺序**——置前（`bringToFront()` / 主键 pointerdown）时把该面板 Esc 层 `promote` 到栈顶：A 开、B 开、点 A 置前后一次 Esc 关 A。③ **forced-colors**——`.frame:focus-visible` / `.close:focus-visible` 补 `outline` 兜底。④ **`rect` property 兼容字符串**——setter 运行时接受对象或同格式字符串（字符串原样走 attribute 通道，公开类型保持 `PanelRect`；Vue property 通道静态模板不丢值）。⑤ **首帧层级**——登记早于 render 时 `applyFront` 无 frame 可写，`update()` 末尾按叠放态补写，单面板首帧即打开落在最前档（+1）。⑥ **断开期间改 `open`**——Esc 层 / 叠放 / `previousFocus` 副作用加 `isConnected` 守卫，重连由 `onReconnect` 补齐（不残留吞 Esc 的幽灵层、不抢焦点）。Minor：`FloatingPanelActivateSource` 收窄为 `pointer | api`；`set open` 对齐族内 presence 约定（`''`/非 `'false'` 为真）；`hydrate()` 校验标题栏/关闭钮并在标题缺 `id` 时写回；边界先 `ceil`/`floor` 再夹取、选择器限定 `getRootNode()`、viewport 用 `documentElement.clientWidth/Height`；标题栏分隔线 token 开口；`onFramePointerDown` 过滤非主键/非主指针；未命中边界告警台账上限 32；键盘缩放映射写进组件页并修正注释。

- **fix round 2（最后一轮小修）**：① **富标题高度（Important）**——`n`/`ne`/`nw` 手柄按 `--oas-floating-panel-titlebar-height` 起算，标题插槽更高时整段手柄被 titlebar（`z-index: 2`）盖住，顶部与两个上角缩放失效。客户端用 `ResizeObserver` 实测标题栏内容高（`clientHeight` 排除 1px 下边框）写回 host token（px），实测 0（关闭态）跳过、同值不重写（防 RO 自激循环）；断开释放、重连重挂；SSR 快照仍用默认 token。回归：48px 富标题下 `elementFromPoint` 在顶部/上角手柄带命中 handle，且顶边拖拽能 resize。② **coarse 缩放带代价记档**——README/PRD/中英组件页写明「上侧/上角手柄从标题栏下沿起算；coarse 下内容顶部约 44px 为缩放带，触屏最小尺寸 160×96 时内容几乎不可点，建议触屏用更大 min 或关闭 n/s 边缩放」，不改手势语义。③ **触摸关闭时序**——确认 `adcb806b` 的触屏拖拽等待两帧修复在交付内；补点关闭前等待两帧。Minor：组件总览中英计数 146 → 147；`FloatingPanelProps.rect` 改为 `string | PanelRect`；`boundary` 选择器改为根树优先 + `document` 回退并补 shadow 边界用例；forced-colors 用 `emulateMedia({ forcedColors: 'active' })` 做真实可见性断言；首帧即打开 +1 的 e2e 改为「页面只有首帧打开面板、不关闭其他面板」的独立 fixture；`previousFocus` 仅在非首帧打开时建立基线（断开重连也不补）。

- **fix round 3（第三轮交叉复核）**：① **无标题面板的可访问名称回落是死代码（Critical）**——`hasSlotContent` 用 `assignedNodes({ flatten: true })`，而 `title` 槽内有 fallback `<span class="title-text">`，真实浏览器 flatten 会返回 fallback → 恒判有标题 → `syncTitle()` 永远走 `aria-labelledby`，i18n `aria-label` 分支不可达；无 `panel-title` 且无 `title` 插槽时 labelledby 指向空元素，dialog 无名（happy-dom 的 flatten 不返回 fallback，单测假绿）。改为 `assignedNodes()`（无 flatten；本组件无重分发），`title` 插槽动态清空经 `slotchange` 切回 `aria-label`、填回再切回 labelledby。回归：真实 Chromium 断言无标题面板 `aria-label = 悬浮面板` 且无 labelledby、labelledby 必须指向真实 title id、title 插槽清空/填回切换，并把无标题面板纳入 axe 扫描。② **嵌套组件 shadow 内的焦点关闭后丢到 body（Important）**——`restoreFocus()` 的 `focusInside` 只看 `contains()` 与 `getRootNode() === this.shadow`，不跨组合边界，而 `deepActiveElement()` 会下钻嵌套 shadow。改为沿 `parentNode` → `ShadowRoot.host` 组合链向上判定是否回到本面板；回归：聚焦面板内 `oas-button` 的内层 `<button>`（嵌套 shadow）→ `close()` → 焦点回到打开前按钮。Minor：`min="0"` 语义定为「非正/非法视为未提供，回落缺省 `160,96`，不是 1px 下限」并写进 README/中英组件页/API 表 + 单测；初始 `rect` 完全在边界外时首次拖动瞬移夹入边界记档；`before-close` 处理器内重入 `close()` 加 `closing` 守卫（一次逻辑关闭只派发一次，重入返回 false）；手势进行中改 `boundary` / `boundary-padding` / `min` / `max` 不生效记档。

- **fix round 4（内容滚动区键盘可达）**：内容区 `.content`（`overflow: auto`）原本不可键盘聚焦——真实溢出时键盘用户无法滚动内容，上一轮靠调小 demo 内容避开 axe `scrollable-region-focusable`，属规避不是修复。现按仓库既有口径（`oas-list` body / `oas-resource` scroller / `oas-scheduler`）：**仅真实溢出**（`scrollHeight > clientHeight + 1` 或 `scrollWidth > clientWidth + 1`）且面板打开时补 `tabindex="0"`，不溢出/关闭态移除，不引入永久 Tab 停靠点。判定时机：`update()`（开合 / `rect` 变更）、内容槽 `slotchange`、`ResizeObserver`（同时观察内容盒与已分配内容元素：面板缩放改盒尺寸、图片加载/列表变长改内容块尺寸）；断开释放观察器、重连重新观察并复判；写 `tabindex` 不触发重排。焦点环复用 `--oas-focus-ring`（`box-shadow: inset`，画在滚动口内侧不被框体 `overflow: hidden` 裁掉），forced-colors 回退 `outline: 2px solid`，不新增颜色 token。取舍记档：溢出且内部已有可聚焦控件时内容区会多一个 Tab 停靠点——这是 axe 规则与「键盘可滚动」的要求，不溢出时该停靠点消失。demo 新增「构建日志」真溢出面板并重新纳入 axe 扫描；qa 断言溢出补 `tabindex`、键盘 Tab 落到内容区并 PageDown 真实滚动、面板放大到不溢出则移除、缩回再补、关闭移除/重开复判，以及 axe `scrollable-region-focusable` 零违规。

### 非目标

不做 portal/teleport、`append-to`、布局持久化（storage）、窗口管理器（吸附/平铺/最小化/最大化）、模态遮罩与焦点陷阱、多显示器坐标、跨文档拖拽；不接管宿主导航/滚动；不新增全局单例浮层宿主。

### 验收标准

- 单测：`geometry`（四边/四角、极小边界、min>max、RTL 键位、取整、非法值）、`panel-stack`（置前顺序、多实例、断开摘除、z 不随次数增长）、开合事件矩阵（受控/非受控、before-close 否决零事件、detail 精确）、指针（第二指针/捕获失败/取消/失焦/Esc 中断）、键盘替代路径、焦点进入与归还、断连重连、SSR 快照与 hydrate。
- qa-regression（Chromium + Firefox 抽样）：真实拖拽、四边/四角缩放、两面板置前、子浮层（dropdown）Esc 优先级、受控回写、coarse 44px 热区 + `elementFromPoint` 不命中手柄 + 真实触摸拖动/点关闭、Esc 跟随置前、单面板首帧最前档、断开期间改 open 的 Esc 回归、dark、reduced-motion、axe、console 零告警。
- 文档：中英组件页 + 侧栏；`## API` 由 `api:scan && api:gen` 生成（方法表同样由 JSDoc 扫描生成，非手工）；`open` 属性类型 `boolean` 来自 property 扫描，`min` / `max` / `panel-title` / `initial-focus` 无对应 property、scanner 推断不出类型故显示 `—`（scanner 限制，非契约缺失）；10 语言文案；SSR 白名单 174 → 175 与 DSD fixture；CHANGELOG `[2.6.5]`。
- 门禁：focused/full `pnpm test`、typecheck、build、全量 e2e、perf:size、api/llms/stats/skill/ssr/lint/format/deprecations/qa:audit/trace。

## v2.6.5：Next / Nuxt 生产 fixture 与真实浏览器性能基线（Task 11）✅

### 功能定义

把 SSR 契约从「happy-dom 合成渲染 + 文档级 smoke」推进到**真实框架生产构建 + 真实浏览器**：新增 Next.js App Router（Next 16 / React 19）与 Nuxt 4（Vue 3）两个独立 fixture，覆盖冷/热混合 locale、禁 JS DSD、真水合不重建、`oas-tool-call` 单次交互与 console/pageerror 零；并新增只观测、不阻断的真实 Chromium 性能基线。不改组件行为与 SSR 白名单。

### 详细契约

- **fixture 隔离**：`packages/ssr/fixtures/{next,nuxt}` 各自独立 `package.json` + `pnpm-lock.yaml`（`--frozen-lockfile`），不属于根 workspace（根仍 `packages/*`），根 install/build 不安装/构建；不进入 `@oas-ui/ssr` npm `files`。fixture 通过 `link:` 消费主仓构建产物，先决条件为主仓 `pnpm build`。
- **Next.js**：生产 `next build` + `next start`（4301）。页面用 `@oas-ui/ssr` 的 `renderToString` 产 DSD，`dangerouslySetInnerHTML` 进 RSC 流；layout 真实挂 `<OasRegistry>{children}</OasRegistry>`（维护批 M1：适配器改浏览器守卫动态导入，SSR 预渲染安全跳过、客户端模块求值期注册），语言包 en / ar 以**静态 import 同步注册**（模块求值期同步执行；`@oas-ui/ui` 的动态导入解析至少晚一个 microtask，同一客户端模块图内注册先于组件 upgrade，避免水合把 en/ar 文案改回默认 zh-CN），`<oas-config-provider locale>` 持久化在页面中。每个请求动态渲染（`force-dynamic`），同一请求内 4 个组件并发生成，证明 locale 请求局部、无全局锁。
- **Nuxt**：生产 `nuxt build` + `node .output/server/index.mjs`（4302）。DSD 页由 Nitro 路由原样输出 HTML（不经过 Vue `v-html` 水合，避免客户端重设 `innerHTML` 冲掉解析期 shadow root）；DSD 渲染放在常驻 worker 线程（happy-dom 全局 shim 与 Vue SSR 进程隔离），Vue 模板页覆盖 `@oas-ui/nuxt` 的 isCustomElement 配置与客户端注册。Nuxt 4 的 isCustomElement 注入修正为写 `nuxt.options.vue.compilerOptions`（保留 `vite:extendConfig` 兼容早期 Nuxt 3）。
- **locale 矩阵**：同一进程连续请求 `zh-CN` → `en-US`（渲染层归一到内置 `en`）→ `ar`（RTL）→ 再回 `zh-CN`（热）；逐 ID 校验 `empty` / `table` / `select` / `tool-call` 文案且其他语言文案（含 `select`）不泄漏。`RenderToStringOptions.locale` 扩为内置语言名子集（`zh-CN`/`en`/`ja`/`ko`/`de`/`fr`/`es`/`pt`/`ru`/`ar`），渲染器按需装载语言包；类型为 `RenderLocale | (string & {})`（内置名保留补全、自定义名无需断言），未注册 locale 显式 `devWarn` 一次并回退内置 `en`；自定义 locale 必须在首次 `renderToString`（安装 DOM shim）之后 `registerLocale()`（裸 Node 先注册会抛 `HTMLElement is not defined`）。`devWarn` 在 `NODE_ENV=production` 下静默。
- **DSD / 水合证据**：`javaScriptEnabled:false` 下逐 ID 断言 shadow 文本/结构存在、组件未注册（文本只能来自服务端）；延迟客户端脚本后给快照 shadow 内 `<style>` 打标，注册完成后标记仍在（shadow root 不重建）、指纹 `meta[data-oas-ssr]` 被消费（`hydrate()` 接管而非 `render()` 回退）。
- **交互与告警**：`oas-tool-call` 真实点击展开/收起，每次点击恰好一次 `oas-toggle`（detail `{open,name}`），`aria-expanded`/`open`/body 可见性同步；三 locale 导航 console error/warning 与 pageerror 均为零。
- **性能基线（只观测）**：`scripts/perf/browser-bench.mjs` 固定生产 dist + Chromium + `workers=1`；CSR 5 warmup + 3×30，DSD 2 warmup + 3×15；记录 LCP/FCP/DCL/load/首批渲染/DOM 节点数/传输体积，保存原始样本与每轮 min/median/p95，写入 `docs/perf-browser-baseline.json`（含 Node/pnpm/OS/CPU/Chromium/Playwright 元数据、gitSha、包版本、同 SHA 噪声字段）。**数值永不阻断**，只有构建失败/选择器缺失/样本不足/任一指标非有限/count ≠ rounds×perRound/pageerror/console error 非零退出；LCP 未采集写 `null`（不写 0）并失败；`--update-baseline` 写盘前走同一校验；`pnpm perf:browser:check` 只校验基线完整并接入 CI，另跑 `perf:browser:selftest`（缺样本/NaN/null LCP/`roundStats[].count` 不符必须非零退出）。参照或本次 `gitDirty=true` 时同 SHA 噪声不比较（`compared:false` + 原因），基线校验对脏参照只 WARN；刷新基线须在干净工作树执行，记录 `gitSha` 为代码修复提交且 `gitDirty:false`。

### 验收标准

- fixture：各自 `pnpm install --frozen-lockfile` → `pnpm build` → e2e（Chromium，零重试）全部通过；Next/Nuxt 首屏 light/dark 真截图（禁 JS 与水合后各一张）。
- 主仓：`pnpm test`、`typecheck`、`build`、`perf:size`、`perf:browser:check`、api/llms/stats/skill/ssr/lint/format/deprecations/qa:audit/trace 全绿；全量 e2e 由控制器另行执行。
- 文档：`engineering.md`（fixture 安装/构建/CI 与性能观测带宽）、`architecture.md`（隔离与 shim 进程边界）、`ROADMAP.md` / `CHANGELOG.md` 同步；README 说明 fixture 不随发布包分发。

## v2.6.5：SSR 白名单收口九件与跨引擎 DSD（Task 10）✅

### 功能定义

把移动端/会话剩余 9 个 standalone 组件纳入 `@oas-ui/ssr` 白名单：conversation `oas-message-actions` / `oas-tool-call`、form `oas-swatch` / `oas-picker`、feedback `oas-pull-refresh` / `oas-notice-bar`、data `oas-image-group` / `oas-swipe-cell`、navigation `oas-index-bar`（白名单 165 → 174，NOT_SSR 47 → 38）。`oas-swatch-group`（swatch 组语义容器）与 `oas-bottom-sheet`（宿主受控浮层）保持不纳入。新增一个最小跨引擎 DSD smoke，在 Firefox 与 WebKit 各跑一次。

### 详细契约

- **快照确定性**：渲染路径不在 SSR 段启动真实计时器/滚动联动/document 广播监听；`__OAS_SSR__` 标记用于区分 happy-dom shim 与真实浏览器。快照结构只由属性决定——picker 列、选中与初始滚动位来自 `value`（不测量；无 JS 时列仍可原生滚动，但选中换算/回写不生效，快照只呈现初始选中位）；swipe-cell 内容层偏移 0（关闭视觉）直出，宿主显式给 `open` 时 SSR 宽度 0 也不得删除该属性（升级后按真实宽度校正）；index-bar 分节/字母节点与 header UID 原样保留；image-group 在 `update()` 内同步收集子图（不等 slotchange 微任务）。
- **可访问性快照**：notice-bar 多条 items 自动轮播时内容区 `aria-live="off"`（不打扰读屏），单条/reduced-motion 静态态为 `polite`；SSR 段无法感知 `prefers-reduced-motion`（Node 无 MQL），多条 items 的快照恒为 `aria-live="off"`，升级后按真实偏好收敛。
- **真水合**：全部 9 个组件 `hydrate()` 缓存与 `render()` 相同的节点引用并恢复内部 raw 缓存，`update()` 不重建快照结构；快照指纹版本（`data-oas-ssr-v`）必须与运行时 `SSR_SNAPSHOT_VERSION` 严格相等，缺失或不等一律回退 render（跨版本错配不得静默接管）；缺关键结构/关键子结构时返回 false 回退全量重建（index-bar 逐节校验条目数，message-actions 校验按钮数，image-group 校验共享预览宿主，notice-bar/pull-refresh/swipe-cell/swatch/tool-call 校验关键 part 与数量）。连接态计时器与 document/滚动/手势监听断开清理、重连重新登记清理（fix round 1 修 notice-bar 重连后 cleanup 丢失、pull-refresh/swipe-cell 手势中断后状态卡死）；进行中手势不跨摘挂续传——按取消处理回弹、不派发事件；单次点击/手势/滚动落停只派发一次事件。
- **DSD fixture 与矩阵**：`ssr-dsd.spec.ts` 为每个新 tag 增加确定性 fixture；`ssr-matrix.json/md`、`docs/ssr.md`、中英 `guide/ssr.md`、ROADMAP 计数同步为 174。
- **跨引擎 smoke**：新建 `packages/ssr/ssr-dsd-cross-engine.spec.ts`，覆盖 A/B/C 各一个代表 tag + `oas-button` 对照，断言禁 JS 关键文本、upgrade 后 shadow 不重建（style 引用保持）、指纹移除、单次交互一次事件（500ms 后显式复核）、console 零 error/warning；Chromium 显式忽略该 spec（由主 DSD spec 覆盖），Firefox/WebKit 各跑一次。WebKit 无 DSD 能力时断言 `shadowRoot === null`，注入 bundle 后以 CSR 渲染替代路径验证同样关键文本/事件（不断言空 light DOM 文本）。
- **fix round 1（独立复核）**：index-bar 程序化平滑滚动落定后若目标不可达（短内容 + 固定高度、scrollTop 未接近目标）保持用户选中项，不得跑 scrollspy 回退并二次派发 `oas-change`；notice-bar 拆「具名 handler 幂等绑定」与「幂等 cleanup 注册」，重连重新登记（二次断开零孤儿计时器）；pull-refresh/swipe-cell 手势中被摘挂按取消复位（pointerState/phase/data-dragging、drag 镜像），重连后完整手势仍恰好一次事件；跨引擎 spec 无 DSD 守卫分支改为 `shadowRoot===null` + CSR 关键文本断言；index-bar fixture 改为真正可滚动列表。
- **fix round 2（交叉复核）**：① `oas-notice-bar[scrollable]` 的 DSD 快照不再物化内嵌 `<oas-marquee>`（渲染器只序列化宿主 light DOM，物化的「源份 + 克隆份」会被当普通内容直出 → 禁 JS 时正文两行、bar 高度翻倍、overflow 裁剪失效）；SSR 段保留 probe 单份插槽投影、`hydrate()` 在 scrollMode 下清空 `lastScrollSig` 保证升级后重新物化（不做则通告栏空白）。② `tryHydrate()` 增加快照版本闸门：`data-oas-ssr-v` 与 `SSR_SNAPSHOT_VERSION` 严格相等才接管，缺失/不等回退 render；notice-bar / pull-refresh / swipe-cell / swatch / tool-call 的 `hydrate()` 补关键子结构校验（≥2 个 part / 数量），残破快照不再静默接管。③ 收口：`isSsrRuntime` 唯一实现（splitter / affix / popover 旧副本迁走）；index-bar 分节容器改 `role="group"`（generic 禁命名）；picker 空列不写悬空 `aria-activedescendant`、option id 加实例 uid；notice-bar `aria-live` 的 SSR 口径与 swipe-cell `open` 在目标侧不可达时的残留语义如实写进文档。

- **fix round 1（独立复核，5 Important + Minor）**：① **Next 16 适配器限制（Ruling：本批不改适配器行为）**——`OasRegistry` 顶层 `import '@oas-ui/ui'` 会在 Client Component 服务端渲染阶段求值 `class extends HTMLElement` 而失败；`docs/ssr.md`、`packages/docs/docs/en/guide/ssr.md`、`packages/next/README.md` 写明限制与 `useEffect` 动态导入临时写法，fixture 的规避注释与文档一致，follow-up 登记到 ROADMAP。② **`perf:browser` 样本校验收紧**——`stats()` 不静默吞 NaN（空样本/非有限值抛错）；每个指标必须 finite；每个场景 `count === rounds×perRound`；LCP 不可用写 `null` 并失败（不再写 0）；`--update-baseline` 写盘前走同一 `validateBaselinePayload`，样本不足非零退出且拒绝写盘；新增 `scripts/perf/browser-bench.test.mjs`（经 `perf:browser:selftest`）构造缺样本/NaN/null LCP 断言非零退出。③ **Nuxt peer**——`@nuxt/kit` 改为 `^3.16.0 || ^4.0.0`；`@nuxt/schema` 仅类型引用，登记同范围 optional peer；Nuxt 4 fixture 以 `--frozen-lockfile` 安装并跑通生产构建 + e2e，即证明 peer 可满足。④ **Next fixture 包边界（Ruling：文档明示，不做 pack smoke）**——fixture README、PRD、`architecture.md` 明示「通过文件 URL 加载主仓 dist 验证 SSR 行为」；`packages/ssr/fixtures/next/package.json` 描述改为准确措辞（Next App Router + `@oas-ui/ssr` 验收，不使用 `@oas-ui/next` 入口）。⑤ **`RenderLocale`**——扩为内置语言名子集（含 `ar`），未注册 locale 显式 devWarn 并回退 `en`，补单测；fixture 移除 `locale as unknown as ...` 双重 cast 与手工 ar 注册。
- **fix round 1（同批 Minor）**：水合断言补 shadow 内 `style` 数量 = 1（防 render 回退重复注入）；locale 负向断言补 `other.select`；Nuxt 末用例改名（Vue 页由独立用例覆盖）；Nuxt `pnpm start` 显式 `PORT=4302 HOST=127.0.0.1`（cross-env，Windows 兼容）；`packages/nuxt/src/module.ts` 头注释与 `app/plugins/oas-ui.client.ts` 注释校正、README 与 HEAD 实现一致；性能基线补 `gitSha` / 包版本 / 「同 SHA 噪声」字段，跨 OS/CPU 或元数据缺失时 WARN；fixture 增加独立 `typecheck` 并纳入 `ssr-fixtures` CI job；`perf:browser` console 过滤口径写进文档，结构校验页补 console/pageerror 监听；`playwright.ssr.config.ts` 的 `reuseExistingServer` 陈旧服务风险写进 fixture README；Next fixture `<html lang>` / `dir` 按 locale 由 middleware 注入。
- **fix round 2（最后一轮小修）**：① **自定义 locale 收口**——`locale` 类型改为 `RenderLocale | (string & {})`（保留内置补全、自定义名无需 cast）；文档写明「首次 `renderToString`（安装 shim）后再 `registerLocale` 自定义语言包」并解释 i18n 主入口求值 `class extends HTMLElement` 的失败原因；新增 node 环境独立测试（未 bootstrap 直接 import/register 失败、bootstrap 后自定义 locale 可用），不依赖同文件前序用例的 shim。② **性能基线口径**——参照或本次 `gitDirty=true` 时 `computeSameShaNoise` 返回 `compared:false` + 原因，`validateBaselinePayload` 对脏参照只 WARN；`roundStats[].count` 与 `samplesPerRound` 做一致性校验；在干净工作树以代码修复提交重跑 `--update-baseline`（`gitSha` = 修复提交、`gitDirty:false`）。③ **文档更正**——Next fixture 的 `package.json` 描述改为「Next App Router + `@oas-ui/ssr` 验收、不使用 `@oas-ui/next` 入口」；PRD/architecture/engineering 改为「fixture 不覆盖 npm 安装 / `exports` 路径，当前无 pack smoke」。Minor：补 `devWarn` 在 `NODE_ENV=production` 静默测试；`--update-baseline` 独立子进程用例需真实浏览器测量，成本高未单列，写盘前校验与 `perf:browser:check` 共用同一函数（已由独立子进程用例覆盖）。

- **维护批 M1（真实缺陷与测试/文档诚信收口）**：① **Next 适配器 SSR 安全**——`OasRegistry` 顶层副作用改浏览器守卫动态导入（客户端注册时机不变），Next fixture 改为真实消费 `<OasRegistry>`（撤销 `useEffect` workaround），README / docs/ssr.md / 中英 SSR 指南撤销临时写法；② **splitter 多面板删栏**——越界折叠索引收敛（`i >= n-1`）、重建后先归一尺寸再应用布局并回写属性/落盘快照（DOM/模型/属性/storage 四方一致）；③ **floating-panel 标题栏 token**——写入目标移入 shadow `.frame`、仅实测高于样式表基准时 pin（基准读取剥离自身内联防写入即回退自激）、动态开启 `resizable` 补挂标题栏观察、非 resizable 不观察不写 token；④ **picker 全禁用列**——`aria-selected` / `aria-activedescendant` 渲染与滚动/键盘重绘路径同口径门控（禁用项不写 `"false"`），id 改身份属性派生（`shared/stable-id.ts` FNV-1a）使 SSR 快照逐字节确定（index-bar 同批）；⑤ **chart formatter**——缓存上限 64 + fallback 双层 try + Intl 完全不可用时 `toFixed` 真兜底；⑥ **cdn-i18n 回归**——假隔离（`setContent` 复用文档 registry）改 route-fulfill 真实导航隔离；⑦ 文档措辞对齐实现（floating-panel 实测写入条件/触屏建议 `≥260,220`/纯文本节点溢出盲区、notice-bar `aria-live` SSR 口径）。

- **维护批 M2（SSR 快照确定性全量收口 + splitter 折叠语义收紧）**：① 全部含 id 输出的白名单组件的快照 id 从模块级或静态自增计数改为身份属性派生（`stable-id.ts`），表驱动 18 形态 + **全白名单 175 tag 穷尽实测**锁「同属性两次渲染逐字节相等、不同属性派生不同 id」；stepper 面板 `id` 不再由组件代生成（宿主显式 `id` 才同步 `aria-controls`），杜绝同 `steps` 多实例的文档级 duplicate id；radio-group 互斥 `name` 不进快照（水合后恢复）。② splitter 多面板增删子元素时折叠态整体收敛（`collapsed` 移除 + 全展开 + 快照落盘）——light DOM 无 key，按索引保留会错配折叠（零宽复发）；组件页与 CHANGELOG 已更新语义说明。

### 非目标

不扩大 `oas-swatch-group` / `oas-bottom-sheet`；不新增组件属性/事件/插槽；不改变主 DSD spec 的全量断言范围与现有 Firefox/WebKit 抽样规则（仅新增该最小 spec）；不为其余 NOT_SSR 子件/命令式组件立项；**本批不修改 `@oas-ui/next` 适配器行为**（`OasRegistry` 的 Next 16 服务端求值限制以文档 + follow-up 处理，不做 pack smoke）。

### 验收标准

- 单测：5 个 family `ssr-hydrate`（conversation 新建 + form/feedback/data/navigation 增补）覆盖真水合接管、缺结构回退、快照版本闸门、update 不重建、单次交互一次事件、断开重连恢复；`packages/ssr/src` 全绿（含 scrollable 快照正文单份与版本常量相等断言）；`packages/ssr/ssr-dsd.spec.ts` 新增 9 tag fixture + notice-bar scrollable 真实浏览器快照（正文一次、高度同单条 items、升级后可滚）。
- 门禁：`ssr:check` 212 组件 = 174 白名单 + 38 不 SSR（白名单/不 SSR 总数守恒）；api/llms/stats/skill/lint/format/deprecations/qa:audit 全绿。
- 浏览器：跨引擎 smoke 在 Chromium（主 spec）/ Firefox / WebKit 通过；受影响组件页 smoke/console 零告警；dark 截图核对 A 批与 C 批各一。

---

## v2.6.5：字节格式化 helper 与 Upload IEC 迁移（Task 9C）✅

### 功能定义

新增 `@oas-ui/core/format-byte` 纯函数 `formatByte(bytes, { locale, unitSystem, precision })`，作为全库唯一的字节量格式化实现；`oas-upload` 的文件大小显示从旧 `KB`（1024 进制但标签写作 KB）迁移为默认 IEC（`KiB`/`MiB`，1024 进制）。这是用户已批准的可见文案变化（`2.0 KB` → `2.0 KiB`），不改大小计算与上传/校验/裁剪主流程（仅扩展 `max-size` 的可解析写法），不迁移其他组件。

### 详细契约

- **签名与默认值**：`formatByte(bytes: number, options?: FormatByteOptions | null): string`（`options` 传 `null` 按缺省值处理）；`unitSystem` 默认 `'iec'`（`B` / `KiB` / `MiB` / `GiB` / `TiB` / `PiB` / `EiB`，1024 进制），传 `'si'` 走 1000 进制（`B` / `KB` / `MB` / `GB` / `TB` / `PB` / `EB`）；`precision` 默认 `1`，非负整数截断，非法/非有限回落默认，上限 20；`locale` 默认 `en-US`（SSR 与客户端确定性一致），**结构非法（`zh_CN`）或结构合法但不受支持（`xx-YY`）的标签统一回落 `en-US`**、不抛错，也不会落到宿主默认 locale。
- **档位与进位**：按 `|bytes|` 与进制幂选单位，进位阈值严格为 `1024^n` / `1000^n`；按 `precision` 定点舍入后若达到进制上限（如 `1023.96` 字节 → `1.0 KiB`、`1023.96 KiB` → `1.0 MiB`）升一档重算；档位封顶 `EiB` / `EB`（极大值停留在最大单位，仍按 `precision` 输出，如 `1024^7` → `1024.0 EiB`，不溢出为 `Infinity`）。
- **精度语义**：`B` 档取整（`512.6` → `513 B`）；非 `B` 档固定 `precision` 位小数（默认 `1`，即 `2.0 KiB`、`5.0 MiB`），保留 Upload 原有的定点小数意图。分组分隔关闭，输出文本只受 locale 小数点/数字字形影响。
- **边界**：`0` / `-0` → `0 B`；负数保留符号（`-2.0 KiB`，按绝对值选档进位）；`NaN` / `±Infinity` / 非 number → `''`（空串，不渲染 `NaN`/`Infinity`）。
- **导出与运行环境**：仅经 `@oas-ui/core/format-byte` 子路径导出，不进 `@oas-ui/core` 主入口；模块零 DOM 引用，Node 可直接导入。
- **Upload 迁移**：`formatSize` 私有实现删除，三处显示（预览浮层、`template[slot="item"]` 绑定、默认行/卡片）统一调用 `formatByte(sizeOf(entry))`（IEC + 1 位小数）；回显记录 `size` 与真实 `File.size` 同口径，不改大小计算与上传主流程，仅扩展 `max-size` 的可解析写法。`max-size` 同时接受 IEC 写法 `KiB` / `MiB` / `GiB` / `TiB` / `PiB` / `EiB` 与 `TB`（`KB` / `MB` / `GB` 保留），均按 1024 进制解析——用户照新的显示文案书写即可生效。边界语义：非空但无法解析的值（如 `2ZB`）按「不限制」处理并 `devWarn` 一次（同一字符串去重）；`devWarn` **只在开发环境输出**（生产构建被摇掉），因此生产中的非法值是**静默不限制**，这是文档明示行为；解析层与乘积层溢出（超长数字字面量超出双精度可表示范围、极大数字 × `TB`）都视为可表示上限，夹到 `Number.MAX_SAFE_INTEGER`，正数写法舍入到 0（如 `0.4B`）按 1 字节，显式 `0` 仍是「不限制」——溢出与舍零都不允许把上限静默变成「无限制」。

### 非目标

不新增组件、属性、事件、插槽或公开方法；`max-size` 仍只按 1024 进制解析（不引入 SI 解析模式），不改变判定流程与事件形态，仅扩展可解析写法与边界夹取；不迁移 attachment 等仅承载展示文案的组件；不引入第二份字节格式化实现；不做 SI 自动探测、bit 单位、科学计数或可配置单位表。

### 验收标准

- 单测：IEC/SI 阈值与进位边界、`0` / 小数 / 极大 / 负数 / 非法 / 非有限、`precision` 0/1/多位/非法、locale（`de-DE` 小数点、结构非法与 `xx-YY` 不受支持均回落 `en-US`）、`options: null`、默认值；Node 环境直接 `import '@oas-ui/core/format-byte'` 与调用不引用 DOM（显式断言无 `document`）；Upload 列表/模板绑定/预览浮层显示 `KiB`/`MiB` 且旧断言按新契约重算并注明原因；`max-size` 的 `2KiB` / `1.5TiB` / `2PiB` / `1EiB` 生效、未知单位 devWarn 且不静默降级、解析层与乘积层溢出都夹到 `MAX_SAFE_INTEGER`、`0.4B` 按 1 字节、显式 `0` 仍不限制。
- qa-regression：真实文档页 Upload 大小文案为 IEC 单位（chromium + firefox），`max-size="2KiB"` 真实拦截、未知单位只在开发环境 devWarn 后按不限制放行（生产构建无告警，属明示行为），dark 主题可读，console 无意外告警。
- 文档：CHANGELOG `[2.6.5]` 记录 KB→KiB 可见变化；upload 中英文页与 API 描述说明 IEC 单位；`@oas-ui/core` README 补 helper 用法；PRD/ROADMAP 登记；全量 test/typecheck/build/e2e/perf:size/api/llms/stats/skill/ssr/lint/format 通过。

---

## v2.6.5：相对时间展示组件 oas-relative-time（Task 9B）✅

### 功能定义

新增独立展示组件 `oas-relative-time`（data 族），把 epoch 毫秒 / ISO 8601 / `Date` 渲染为本地化相对时间（`<time datetime>` 语义），可选开启 `auto-refresh` 按页面可见性自动刷新。不并入 `oas-countdown` / `oas-statistic`，不新增共享控制器，不改既有组件行为。

### 详细契约

- **值输入**：`value` attribute 接受 epoch 毫秒数字串或 ISO 8601；property 额外接受 `number` / `Date`（Date 写回 ISO attribute）。`value` 更新即重算。空串/缺失/`NaN`/非法日期进入空态。
- **语义**：shadow 内渲染 `<time part="time">`；有效值时 `datetime` 为解析时刻的 UTC ISO 8601（与机器可读原值同步），无效时移除 `datetime`、清空文本并隐藏节点；不显示 raw key / `NaN` / `Invalid Date`。
- **单位与进位**：按绝对差值选秒/分/时/天/月/年，文案由 `Intl.RelativeTimeFormat` 产出；单位因子固定（分 60s、时 3600s、天 86400s、月 30.436875 天、年 365.2425 天），四舍五入后触及下一单位上限即进位（59.5s → 1 分钟、23.5h → 1 天、12 个月 → 1 年）；未来为正、过去为负。
- **locale**：`locale` attribute 优先；`locale` property 与 attribute 同源（getter 返回 attribute 原文，setter 写回 attribute，`null` 移除属性）。非法/不支持标签不抛错，回落到最近 `oas-config-provider` 的 `locale`，再回落全局 i18n locale（默认 `zh-CN`），最终 `en-US`（仅作函数兜底）；合法值经 `Intl.getCanonicalLocales` 规范化。
- **numeric**：`auto`（默认，交给 Intl 语义化文案「刚刚/昨天」）/ `always`（始终数字）；其他值按 `auto`。
- **auto-refresh**：布尔在场（`"false"` 视为关闭，缺省关闭）。开启后按单位节流刷新（秒级 1s，其余 30s）；页签隐藏暂停、恢复可见立即重算并续排；断开连接清理定时器与 `visibilitychange` 监听，重连恢复；未开启时不注册任何全局监听、不访问浏览器全局。
- **受控/非受控**：attribute 与 property 同源（`value` / `locale` 的 property 写回 attribute），宿主改值静默重算，不派发事件。
- **SSR/水合**：`render()` / 格式化纯函数不引用浏览器 DOM；DSD 快照与客户端同模板，`hydrate()` 校验 `[part="time"]` 接管，客户端接管后按当前时钟重算（服务端快照以服务端 `Date.now()` 为初值）。

### 非目标

不新增 event / method / slot；不替换 `oas-countdown`；不做绝对时间格式化、时区切换、自定义文案模板或动态 unit 配置；不接管全局定时器 / 共享 controller；不改 Task 9A controller。

### 验收标准

- 单测：epoch/ISO/Date 与 value/locale property 反射、无效/空态、秒/分/时/天/月/年边界与进位、过去/未来、locale 非法回落 + provider locale、numeric auto/always、fake clock 自动刷新、visibility 暂停恢复、断开清理/重连、SSR 快照与 hydrate、纯格式化模块 Node 环境零 DOM。
- qa-regression（Chromium + Firefox）：真实页面相对时间文本与 `<time datetime>`、auto-refresh 真时钟推进、dark 可读、console 零告警。
- 文档：zh/en 新页 + 侧栏；API 表由 `api:scan/gen` 生成；SSR 白名单/DSD fixture/矩阵按生成器更新；CHANGELOG / PRD / ROADMAP；全量 test/typecheck/build/e2e/perf:size/api/llms/stats/skill/lint/format/trace 通过。

---

## v2.6.5：无限滚动 headless 控制器（Task 9A）✅

### 功能定义

新增 `packages/ui/src/layout/scroll-area/infinite` 无渲染控制器（`createInfiniteScroll` / `InfiniteScrollController`），消费 `oas-scroll-area` shadow viewport 或任意滚动根，为「上拉加载更多 / 下拉加载历史」提供方向、阈值、双边缘状态机与 prepend 保位。不新增自定义元素、不复制滚动引擎、不改既有组件行为。

### 详细契约

- **根与内容**：`root` 支持 Element / 惰性 getter / null；ScrollArea 宿主自动解析 shadow `[part~="viewport"]`。`content` 可显式指定内容容器，默认 root（slotted 内容）；静态 root 下 content getter 仍在 update 与结果落地时刷新，宿主整体替换列表容器后按 key 在新容器重查补偿。无 DOM/SSR：attach 返回 false，update no-op，手动 load 仍可用。
- **方向/阈值**：`direction: 'bottom' | 'top' | 'both'`（默认 bottom，非法回退）；`threshold` px（默认 0，负数/非法回退 0）；`reverse: true` 等价 top + attach 初始滚到底（优先于 direction，rAF 再校正一次，读者滚动后不抢回）。
- **状态机**：每 edge 独立 `idle | loading | error | complete`。同 edge 在途去重；不同 edge 可并发；`complete` 后不再自动加载；error 只回调一次，自动 update 不重试，`retry(edge?)` 成功后恢复；`reset()` 中止在途、清空 complete/error/loads 并重新武装；`destroy()` 中止并静默回 idle，此后所有命令 no-op。destroy/reset/complete 后迟到结果按请求代际丢弃，不写状态、不触发回调（含 onLoadStart 内 destroy 不发请求、onLoadEnd 内 destroy 不发 onComplete）。
- **触发与续载**：到达边缘且 armed 时自动触发；离开边缘、内容增长、reset 后重新武装。加载结果带来内容高度增长才允许自动续载，空结果不循环；top 增长但锚点未产生实际补偿时，停在边缘期间封锁自动续载，离开边缘 / reset / 显式 load 后恢复。该封锁不跨 `detach()` 保持（detach 是环境重置，保留会让重挂后停在顶部永久失去自动续载）；同一 viewport 的 `attach()` 重挂会重解析 content getter 并重绑内容侧监听/观察。
- **prepend 保位**：top 触发前记录首个可见内容项视口 y 与稳定 key（`keyAttribute` 默认 `data-key`，缺失回落 id）；结果落地后按锚点位移补偿 scrollTop；宿主重渲染替换节点按 key 重查；ResizeObserver/资源 load 捕获处理异步撑高；程序补偿的 scroll 回声不释放，读者真实滚动接管后释放。
- **回调**：load 注入 `{ edge, direction, signal, retry }`；onLoadStart / onLoadEnd(event, result) / onError / onStateChange / onComplete；返回 `false` / `{ complete: true }` / `{ hasMore: false }` 等价 complete。回调抛错隔离为 devWarn，不破坏状态机。

### 非目标

不新增视觉组件/文档页/demo；不做虚拟化、粘底跟随、Pull-to-refresh；不接管滚动条、滚轮、拖拽；不改变 `oas-scroll-area` 既有属性/事件。

### 验收标准

- 单测：方向/阈值/非法值、双 edge 并发与同 edge 去重、complete、error/retry、reset/destroy 迟到结果、onLoadStart/onLoadEnd 内销毁、detach 的 idle 回调内 update 不新起请求、回调次数与状态序列、keyed prepend 保位、静态 root + content getter 容器替换后补偿、同一 viewport 重挂重绑内容侧观察、未补偿封锁及其不跨 detach 保持、异步撑高 + 用户滚动释放、scroll 回声、reverse、ScrollArea shadow viewport、root=null/手动 load。
- qa-regression（Chromium + Firefox）：真实滚动 prepend/replaceList 锚点、用户滚到顶第二次加载、异步撑高、亚像素距底、滚轮到底、destroy 后监听清空、console 零告警。
- 全量 test/typecheck/build/API/llms/stats/skill/lint/format/trace/perf:size 通过。

---

## v2.6.5：chart 小数刻度与标签留白（Task 8A）✅

### 功能定义

`oas-chart` 的 y 轴刻度从「整数 ceil 步长」升级为 `1 / 2 / 2.5 / 5 / 10 × 10^n` nice 步长序列，单轴 / 双轴 / radar / 堆叠柱共用同一内部 `ticks` 纯函数；标签精度随步长动态推导，刻度列宽按实际格式化文本按需留白。不新增 Chart 对外 API、不改 `options` 契约。版本号未定，不标已发布。

### 详细需求

- **nice 序列唯一**：内部 `packages/ui/src/data/chart/ticks.ts` 产出 `{ max, step, values }`；步长只允许 `1 / 2 / 2.5 / 5 / 10 × 10^n`，阈值向上切换（0.01 → 0.0025、0.2 → 0.05、90 → 25、10 → 2.5）。双轴以主轴档数为锚，副轴同段数共用同一序列；radar 固定 4 层网格、堆叠柱按分类合计同口径。
- **接受并记录顶格变化**：raw max 90 → 顶格 100（旧 ceil 为 92）；双轴右轴 raw max 10 → 顶格 10（旧 ceil 为 12）。属于新契约的可见行为，回归按新量程重算并注明。**任意量程顶格都可能上取接近 2 倍**（如 133→200、1206→2000），文档中英明示；需要更紧顶格时宿主先归一到 nice 边界。
- **动态精度 + 去显示层 Math.round**：标签用 `Intl.NumberFormat` 的 `maximumFractionDigits` 由步长推导（25 → 0 位、2.5 → 1 位、0.05 → 2 位、0.0025 → 4 位），locale 感知小数分隔符；移除 `renderGrid` / radar 标签层的 `Math.round`。步长 ≥1e6 或 <1e-4 时用科学计数（`2.5E8` / `1E-5`，0 仍显示 `0`），避免长数字撑爆轴列。
- **浮点噪声收口**：`values` 按 15 位有效数字归一化（0.1×3 不再产出 0.30000000000000004），标签层再由 Intl 精度收口。
- **尾差与极值严格性（fix round 1）**：选档后再次校验 `max >= rawMax`，浮点尾差（0.4000000000000001 / 4.0000000001 / 10.0000000001）顺延下一合法 nice 档（0.1→0.2、1→2、2.5→5），不得返回 max<rawMax。有效有限渲染域内极值仍给有限结果：上溢（1.7e308 / MAX_VALUE）钳到 `MAX_VALUE` + 等分 step，下溢（5e-324 / MIN_VALUE）用 `MIN_VALUE` 作步长；非有限 rawMax 用文档化零哨兵。**正有限 rawMax** 时 `values` 全有限、严格递增、末值 = max；零/非有限 rawMax 用全零哨兵（不宣称递增）。`formatTick` 非有限 value 返回显式哨兵 `—`（不再静默显示 0）。
- **locale 健壮性（fix round 1/2）**：`Intl.NumberFormat` 构造缓存（locale|notation|精度 键控）；非法 locale（`zh_CN` 下划线 / 任意自定义名 / 非 ASCII 名称 / 空串）只回退一次**固定 `en-US`**（保证 SSR/客户端一致），不再用未校验 locale 二次构造，Chart.update 不得抛 RangeError 致空白图。provider `de-DE` 断言 `0,05`；SSR 通过 provider 子树注入 de-DE 区分默认 locale。`ar` 等跨 ICU 科学计数只断言可渲染/非空，不锁死字形，不新增公共格式 API。
- **次正规步长前进（fix round 2）**：`nextNiceStep` 不再重建 `10 ** exponent`（`10 ** -324 === 0` 会把 `5..10 × MIN_VALUE` 误判为上溢并钳到 `MAX_VALUE`）；改为按当前有限 step 的 mantissa 档位乘 `2 / 1.25 / 2 / 2 / 2`，×1.25 在次正规区被舍入回原值时退化为 ×2，保证 next 严格前进且有限；`niceStep` 对 `[MIN_VALUE, 2×MIN_VALUE)` 返回正有限步长。仅真正接近 `MAX_VALUE` 才走上溢钳制；随机量级覆盖 exponent `-324..308`，并断言正常顶格 ≤ rawMax×10。
- **标签按需留白**：左轴 `padL` 与双轴右轴 `padR` 均由该轴实际格式化标签的最宽值 + 既有轴间距 + 2 user 单位字形余量推导，网格线/绘图区随之收缩；不靠任意硬编码像素加宽，不新增公共配置。单轴右缘与旋转 x 标签留白规则不变。
- **SSR/水合**：Node 侧 Intl 纯计算，DSD 快照与客户端同一模板；SSR 显式 locale 走请求局部 provider，刻度小数/科学计数文案一致。

### 非目标

不新增 Chart 属性/事件/options 键；不改坐标轴语义（仍从 0 起、不做负数轴）；不改 x 轴抽稀/旋转契约；不做 per-dim radar 量程、双轴以上多轴、对数轴。

### 验收标准

- 单测：`ticks.test.ts`（0.01 / 0.2 / 90 / 10、双轴段数、浮点噪声、科学计数、locale 精度、零/非法输入、浮点尾差顺延、上溢/下溢/非有限极值、2×/5×/8×/10×MIN 不误判上溢、固定种子随机量级 -324..308 的 max≥rawMax + 顶格 ≤ rawMax×10 + values 有限性）+ chart 集成断言（小数刻度、radar、双轴小数与留白、provider de-DE `0,05`、非法 provider locale 仍渲染、stacked 0/10/20/30/40 + 最大合计比例、旧几何按新契约重算并注明）；SSR 快照含 `0.0025` / `2.5E8` / de-DE `0,05`；`pnpm test` 全绿。
- qa-regression（Chromium + Firefox）：真实 `getBBox` 证明左轴 / 双轴右轴 / radar 的小数与科学计数标签不越出 520×280 viewBox，dark / RTL 几何不变、console 零告警；非法 provider locale（`zh_CN` / 自定义名）真实浏览器仍渲染且零 pageerror。
- 文档：chart.md zh/en「边界」同步新刻度契约、90→100 / 10→10、任意量程近 2 倍顶格与 locale/ICU 边界；CHANGELOG / PRD / ROADMAP 记录；全量 build / e2e / perf:size / api / llms / stats / skill / lint / format / trace 通过。perf 档案数字统一留到批次 Task 8 final 的 `perf:size --update-baseline` + `perf:docs`，本批不手改 stale 数字。

---

## v2.6.5：Splitter opt-in 尺寸持久化（Task 8B）✅

### 功能定义

`oas-splitter` 新增可选 `storage-key`：显式开启后把尺寸与折叠态持久化到 `localStorage`，刷新/重连新实例恢复；不设 key 时零存储访问。覆盖 legacy（`percent`）与 multi（`sizes`）以及折叠前面板尺寸。版本号未定，不标已发布。

### 详细需求

- **opt-in 与优先级**：无 `storage-key`（缺失/空串）不读写存储。首次连接时按「显式初始属性 > 合法存储 > 默认值」决定布局：连接前采集显式 `percent` / `sizes` / `collapsed`（内部首渲染折叠会写回 sizes，不能事后读属性判断）；显式 `percent` 或数量匹配的显式 `sizes` 胜出时不套用存储布局；显式 `collapsed` 存在时不套用存储折叠态，但折叠前尺寸按恢复后的布局重新采集。
- **版本化快照**：`{ v: 1, mode: 'legacy' | 'multi', percent?, sizes?, collapsed: number[], prev: Record<string, number> }`。legacy 存 `percent`；multi 存完整 `sizes`；`collapsed` 为折叠面板索引，`prev` 为折叠前尺寸（展开还原依据，折叠索引缺失对应 prev 视为形状不符）。`v`、`mode` 与当前模式、数组长度（multi 必须等于面板数）、数值有限非负、总和 > 0 任一不符整体忽略。
- **恢复零事件、事件次数不变**：恢复只写属性/内部态并同步视觉与 ARIA，不派发 `oas-resize` / `oas-collapse`；用户后续拖拽 / 方向键 / 折叠的事件次数与未启用持久化时一致。
- **写入合并**：拖拽与连续键盘调整通过延迟窗口合并，`pointermove` 期间不产生每次同步 `setItem`；`pointerup` 立即 flush 一次；断开连接时 flush 待写。`set` 异常（隐私模式/配额）静默降级，内存布局仍生效。
- **安全降级**：坏 JSON、非对象、版本/模式/形状不符、`getItem`/`setItem` 抛异常均忽略存储并回落默认/显式值，不抛错、不刷告警。
- **key 与实例语义**：改 `storage-key` 不自动重载（只影响后续写入）；不监听 `storage` 事件，同 key 在线实例不 live sync；恢复只在首次连接尝试一次，断开重连保留内存态。
- **SSR / 水合**：服务端渲染（`__OAS_SSR__`）与 DSD 水合同步阶段不读写存储；恢复延迟到微任务，水合首帧结构与快照零差异。legacy 形态随后按存储恢复且不重建 shadow；multi 的既有水合架构未改，不承诺 shadow 不重建。
- **修复**：multi 模式连接前设置的显式 `collapsed` 属性此前被首渲染 `pruneCollapsed` 误删，现仅在确实清理越界折叠态时移除属性；mount 期派发一次 `oas-collapse`（`{ collapsed: true, side: 'left' }`），与 legacy 显式折叠对齐，不派发 `oas-resize`。
- **零交互不写快照（fix round 1）**：首连开始置 `persistSuppressed`，恢复/无 key/SSR/无快照各分支在恢复微任务 `finally`（或无微任务分支的连接末尾）解除；`schedulePersist` / `flushPersist` 抑制期直接返回。mount 期显式 `collapsed` 引发的内部折叠、升级前 own `sizes` 回收触发的 setter 都不得覆盖已有快照；无快照时不得新建 key。用户交互后恢复正常写入。
- **写入语义收口（fix round 1）**：`schedulePersist` 捕获当次 key，120ms 窗口内改 `storage-key` 时本次写回旧 key（后续交互写新 key）；key 被移除则取消本次写入。flush 前比较 `lastWrittenSnapshot` + `lastWrittenKey`，相同快照不重复 `setItem`；恢复成功时把原始字符串记为已写内容。
- **恢复只尝试一次 + 复位基线（fix round 1）**：首连无 key 后补 key 不恢复；恢复微任务前断开（即使同任务重连）标记 aborted，不恢复且不再重试。双击复位基线始终为显式初始属性（否则默认值/均分），恢复不改变基线；复位作为用户操作会写回存储（文档明示，不静默）。
- **`percent:0` 拒绝（fix round 1）**：legacy 快照 `percent` 必须 `> 0 && <= 100`；`0` 在组件里会回落 50，存 0 显 50 属不一致，按形状不符整体忽略。
- **水合限定（fix round 1）**：DSD 水合同步阶段不访问存储、legacy 形态 shadow 不重建；multi 的既有水合架构不改，文档只承诺 legacy 形态的“不重建 shadow”。
- **Deferred（M9，既有相邻缺陷）**：multi 删除第三面板后折叠索引 1 残留 / 重建 flex 的既有问题不在本批修复，控制器裁定仅登记。若该实例启用 `storage-key`，后续交互可能把残留索引写入快照；下次加载会因折叠索引越界整体拒绝该快照（安全降级，不恢复错误布局，但会丢失该次已存尺寸）。

### 非目标

不新增其他 Splitter 能力（不改 `percent`/`sizes` 契约、不加跨实例 live sync、不加 storage 事件监听、不做服务端读取）；不改 Chart。

### 验收标准

- 单测：legacy/multi 恢复、显式属性优先矩阵、折叠前尺寸往返、坏 JSON/版本/模式/形状/面板数不匹配（含 `percent:0`、multi 负数/总和 0、折叠索引越界/非整数、缺/非法 prev）、get/set 异常、恢复零事件与用户事件次数、改 key 不重载、同 key 不 live sync、写入合并、SSR 标记零访问；零交互不写快照（显式 collapsed / own sizes / 无快照不建 key）、断开时 flush、调度捕获 key、相同快照去重、双击复位基线、恢复只尝试一次（补 key / microtask 前断连）、multi 初始折叠事件次数、恢复后 ARIA 与折叠按钮文案；DSD 水合同步阶段零存储访问且 legacy shadow 不重建；SSR `renderToString` 零读写。
- qa-regression（Chromium + Firefox）：真实拖拽 → localStorage 版本化快照 → 刷新恢复；显式初值优先；改 key 不重载；折叠前尺寸刷新恢复（legacy + multi）；多次 pointermove 只落盘一次；dark/RTL 下恢复比例一致、console 零告警。
- 文档：splitter.md zh/en 新增「尺寸持久化（storage-key）」与双 demo；API 表由 `pnpm api:scan && pnpm api:gen` 生成；CHANGELOG / PRD / ROADMAP 记录；全量 test/typecheck/build/e2e/perf:size/api/llms/stats/skill/lint/format/trace 通过。

---

## v2.6.5：主题组合收口（back-top / ThemeEditor / system head 引导 / switch loading）✅

### 功能定义

维护批 final fix wave：不新增组件/API，只收口 7A/7B/7C 组合面——`oas-back-top` 的 `theme` 语义在全局浅色规则真实生效后保持文档既有定义（`light` = 浅色表面）、ThemeEditor 预览桶兼容根 class 式暗色、system `<head>` 引导在 provider 离开 system 时把 root 交接给显式主题、switch checked loading spinner 跟随自定义 on 色。版本号未定，不标已发布。

### 详细需求

- **back-top 可见语义（Ruling）**：`theme="light"`（默认）是浅色表面，暗色页面不隐式继承页面 token；`primary` 无自身主题块继续继承页面 token；`dark` 是自动反色变体，暗色页面反色为亮底深字，不能用于取得深色外观——暗色页要深色按钮请用 `primary` 或覆盖对应 token。保留组件文档既有语义，不改回隐式继承；CHANGELOG 记录可见行为变化；暗色页三变体真实 computed 外观回归锁住取值（含 `data-glass` 无关的几何不变）。
- **ThemeEditor 预览桶**：最近 `[data-theme]` 祖先优先（`dark` → dark 桶；`light` / `high-contrast` / 自定义主题名 → light 桶）；无 `[data-theme]` 祖先时回退根 class 式暗色（`dark` / `dark-theme` / `theme-dark`），文档站 `html.dark` 无需迁移。`.dark` 下双套导出必须不同、编辑 dark 桶必须落预览；高对比/自定义主题按 light 桶预览作为文档化边界。运行时 add/remove 根 class 必须被观察（`document.documentElement` 的 `class`，断开时 disconnect、重连重挂）：变化后 reconcile 内联预览，导出/读取/导入/编辑/预设入口动作前先 `syncPreviewTheme()`——旧桶内联值不得污染另一桶的导出或预览。
- **system head 引导交接**：provider 从 system 显式切到 light/dark（或自定义主题名）时，脚本把该 provider 的新 effective 镜像到 root 并继续跟随其后续显式主题；恢复 system 重新交还 MQL。只要已交接 provider 仍连接且 requested≠system，其 effective 是 root 唯一权威：MQL/storage 可更新其它 system provider，但不得改 root；provider 断开或恢复 system 才交还。观察 `theme` 需 `attributeOldValue` 识别离开 system，所有 root/provider 写入先比较现值防自激。中英文 theming / SSR 四份脚本规范化后必须完全一致。
- **switch checked loading**：spinner 颜色改为 `var(--oas-switch-on-color, var(--oas-color-text-on-primary))`，与轨道内文案同源；自定义浅色轨（如 `#fde68a`）在 glass + loading 下必须实色可见，扩现有自定义色 fixture 并显式断言 `data-glass` / glass token 在场（避免无玻璃时空跑假绿）。
- **ThemeEditor 交互收口**：同一行色板/滑块写入合法值后清 `is-invalid` 并回填新值；切桶/双套导入/reset 等外部同步仍保留非法草稿。数字输入 `.is-invalid` 补可见 danger 红边 + 内描边（不只 class）。
- **文档边界**：ThemeEditor 明确任意 `--*` 变量可导入（未列入 `token` 也可生效但不渲染编辑行，拼写错误不校验）；PRD 36 格口径改为「36 个采样格 = 21 个可区分结果档、15 个不同分数」；spinner「修复前 16.3」改为可复现模型（自定义浅色轨 + 0.6 组透明度 + 感知分对比）。自定义中色轨 loading 不宣称统一 35 门限：浅色轨 `#fde68a` 沿用 disabled/loading 档 35，中色轨 `#16a34a` 实测定档 15（light ≈31.3 / dark ≈20.4，仅防 spinner 完全不可见），口径见下节。
- **perf 预算风险（本批同步）**：`form` 链 gzip 实测 29692 B / 预算 29696 B（余量 4 B，全库最危险档）；预算上限不抬，本批只同步 basis 并标记——后续 form 链任何扩展前必须先评估/瘦身或按流程重新定档，禁止把余量当常量。`glass.css` 实测 3516 B / 6000 B 上限，basis 同步为主险项之外的常规复核。

### 非目标

不改 ConfigProvider 状态机、不迁移文档站主题机制、不扩大 glass token 作用域、不为高对比/自定义主题新增第三编辑桶、不改 back-top `theme` API 默认值或组件契约。

### 验收标准

- 单测：switch spinner 吃 on 色；ThemeEditor 根 class 预览桶（含等价命名与 `[data-theme]` 优先）、运行时 add/remove 根 class 的双桶导出/预览切换与断开停止观察、同行合法写入清草稿；四份 head 脚本规范化一致 + JS 可解析 + 交接权威契约。
- `packages/ui/qa-regression/`（Chromium + Firefox）：back-top 暗色三变体 computed、ThemeEditor `.dark` 双套导出/落预览与运行时切根 class 回归、数字非法态可见红边、同行草稿清除、glass 自定义色 + loading spinner 实色/可见；`packages/ssr/ssr-dsd.spec.ts`（Chromium DSD）锁 system→显式 dark / 显式 light 双向交接、MQL/storage 不改 root、provider 断开交还与真实 token。
- perf 档案按 `perf:size --update-baseline` + `perf:docs` 重生成（不手改）；全量 test / typecheck / build / perf:size / api / llms / stats / skill / lint / format / trace 通过。

---

## v2.6.5：ThemeEditor light/dark 双套编辑与原子导入导出 ✅

### 功能定义

`oas-theme-editor` 新增 `editing-theme` / `editingTheme`（仅 `light` / `dark`，默认与非法回落均为 `light`）与双套 `exportThemes()` / `importThemes()`。light/dark 各自保存独立 overrides；编辑桶只决定编辑、旧扁平导入导出、预设与默认 reset 的目标，实际预览仍由 ConfigProvider / 有效 `data-theme` 决定。

### 详细需求

- **旧 API 兼容**：`token` / `preset` 与扁平 `exportJson()` / `exportCss()` / `importJson()` 结构不变，只作用当前编辑桶；旧 `{ token, value }` 事件消费者继续可读。用户编辑的 `oas-change` 增加真实 `theme` 字段，旧 import / applyPreset / reset 不额外派发事件。
- **双套与预览边界**：两套 overrides 独立写入；编辑非预览桶不改当前内联变量，provider 明暗切换应用对应桶且不反写 editingTheme。双套导出读取各套真实 computed 默认值与自身 overrides，不按页面当前明暗猜测。
- **原子双套导入**：`importThemes()` 只接受明确 `{ light, dark }` 扁平字符串 token map；先完整校验主题形状、未知主题、token 名与全部值，再一次性替换两套。非对象、缺套、未知主题、非法 token、非字符串或嵌套坏值均整体失败，两套导出与内联预览逐字不变。
- **reset 与状态保持**：`reset(theme?)` 传 light/dark 只清指定套，省略只清当前 editingTheme 套；preset 同样只写当前套。切桶、双套导入与 reset 不重建行，搜索、折叠与行内焦点保持，非法中间输入不被无谓重写。选择器支持受控属性、property 与键盘操作，新增文案覆盖 10 locale。
- **SSR 边界**：ThemeEditor 继续 NOT_SSR，不把双套编辑引入 SSR 白名单。

### 非目标

不改 ConfigProvider 状态机或 switch，不扩大任意主题名、多实例同步或原内联值快照重构，不改变旧扁平 API 为双主题嵌套结构。

### 验收标准

- theme-editor 单测覆盖双桶独立、旧 API/事件兼容、原子失败、reset/preset、provider 预览来源、搜索/折叠/焦点与 10 locale；既有 SSR NOT_SSR 测试保持通过。
- `packages/ui/qa-regression/theme-editor.spec.ts` 在真实浏览器锁双套编辑、键盘切桶、provider 明暗切换、未访问 dark 的真实默认值导出、原子失败无部分写入、dark/console 与截图。
- 组件中英文页、PRD/ROADMAP、API 描述与 10 locale 同步；全量 test / typecheck / build / e2e / perf:size / api / llms / stats / skill / lint / format / trace 通过。

## v2.6.5：ConfigProvider 系统自动主题与可选存储 ✅

### 功能定义

`oas-config-provider` 新增 `theme="system"` 与可选 `theme-storage-key`。requested（`theme` attribute）与 effective（宿主 `data-theme`）分离：system 在真实浏览器解析为 `light` / `dark` 并响应系统配色变化；显式主题名语义不变，缺失/空 theme 继续删除局部主题并继承外层。版本号未定，不标已发布。

### 详细需求

- **系统与存储优先级**：无 key 不读写 localStorage；仅在 system 首次连接/换 key 时恢复 `{ "theme": "light" | "dark" | "system" }`，合法显式 light/dark 可覆盖系统默认值。连接后的 theme 写入（含同值 system）视为用户显式选择并保存，重选 system 立即恢复跟随系统；坏 JSON、非法值、get/set 异常均安全降级且不阻塞切换。显式 attribute 永远优先于存储与系统。
- **通知与生命周期**：系统或同键 storage 事件经现有 `notifyConfigProviders` 链只触发一次有效更新；MQL/storage 监听幂等，重复 update 不累积，disconnect 清理，reconnect 按同一优先级恢复。requested 不被 effective 回写。
- **SSR 与首屏**：SSR shim 以 `__OAS_SSR__` 识别，不能因存在 window/document 就当真实浏览器；system 快照确定性输出 light，storage/MQL 零访问。theming/SSR 中英 guide 提供同步 head 引导，读取同一 key 与系统条件，在首帧前校正根节点及同 key provider，水合前后一致；不默认启用全局 system。
- **局部浅色**：完整 light token 规则同时匹配 `[data-theme="light"]`，嵌套 dark 中显式 light 或 system=light 的 computed token/color-scheme 真实回到浅色，而不是只换属性名。

### 非目标

不实现 ThemeEditor 或 switch 改造，不改 ThemeEditor 的 NOT_SSR 决策；不新增组件/事件，不默认读写存储，不把缺失或空 theme 改成 system，不持久化自定义主题名为 system 的有效值。

### 验收标准

- 单测覆盖旧主题兼容、system light/dark 与通知、存储恢复/异常/重选 system、同键 storage 事件、监听幂等与断连重连；SSR index 锁确定性快照和 storage/MQL 零访问；theme 源文件与生成物锁显式 light 规则。
- `packages/ui/qa-regression/config-provider.spec.ts` 在 Chromium + Firefox 锁嵌套 computed token、emulateMedia 实时切换、reload 恢复、demo 点击/键盘可见反馈、dark/console 与截图；`packages/ssr/ssr-dsd.spec.ts` 锁 head 防闪及水合前后有效主题、几何与 shadow 引用一致。
- 文档与 API 同步；全量 test / typecheck / build / e2e / perf:size / api / llms / stats / skill / lint / format / trace 通过。

## v2.6.5：switch 玻璃轨道内文案 36 格对比度矩阵 ✅

### 功能定义

`oas-switch` 轨道内文案在玻璃层下建立独立真实对比度矩阵：2 主题 × 2 checked 状态 × 3 种真实身后底色（页面 / 灰卡 / `bg-elevated`）× 3 种交互态（静止 / hover / press）共 36 个采样格；静止与 hover 每格感知分 ≥60，press 每格 ≥45。版本号未定，不标已发布。

口径说明（诚实计数）：36 个采样格实际只覆盖 **21 个可区分结果档、15 个不同分数**——checked 轨道为不透明 primary（玻璃档只整体加深），3 种身后底色不改变 checked 格的实际混色；同一主题/状态内不同底色的 unchecked 采样也常落在同一分数档。采样计数与「每格真实取样」不变，禁用它把「格数」当作独立视觉结论。

### 详细需求

- **真实采样**：每格使用真实 shadow DOM 中的 `unchecked-text` / `checked-text`、真实轨道计算色、真实容器计算底色与真实 sheen token；半透明轨道与半透明卡片逐层 alpha 合成，不假定玻璃不透明。press 必须由真实指针按下产生 `:active` 后采样 `--oas-glass-sheen-press`，不得改 class 或复用 hover 样本。
- **计数不变量**：总数恰好 36，每格名称唯一；null / 无法解析 / 缺文字 / 状态不符直接失败，禁止 filter 后少样本仍绿。
- **修复点**：选中态轨道内文案从半透明 `--oas-color-bg` 改为实色 `--oas-color-text-on-primary`；浅色玻璃档新增 `--oas-glass-switch-track-mix: 88%`，让开启态轨道按比例掺黑，抵消白色 sheen 叠底后的对比度损失。dark 与 `prefers-reduced-transparency` 回退 100%，无玻璃层原色零变化。自定义 `color` 在 glass 下把该 mix 钉为 100%（移除 color 时清 inline 回退），保持原轨道色与 `pickOnColor` 基于原色择 on 字的既有口径。
- **loading/自定义色可读性**：checked loading spinner 原先固定 `--oas-color-text-on-primary`（light 为白）；glass 下轨道是半透明/浅色表面，白 spinner 在浅色自定义轨上几乎不可读。可复现模型：`color="#fde68a"` + `checked` + `loading` + glass，0.6 组透明度合成到页面底后 spinner 与轨道感知分仅约 7.8（dark 页面 0.0）；现 spinner 与轨道内文案同源取 `--oas-switch-on-color`（无自定义色回落实色 on-primary），同模型提升到约 63.4（dark 约 45.8）并纳入真实浏览器回归。disabled/loading 另做真实 computed 回归（不进入 36 格矩阵；主题默认 disabled/loading 门限 35，实测 light 57.3 / dark 37.2，仅防透明度塌陷）。**自定义中色轨口径**：`#16a34a` 轨 + loading 实际量级为 light ≈31.3 / dark ≈20.4（`pickOnColor` 取深色 on 色 `#18181b`，深字在绿色轨上本就低于浅色轨），回归门限定 15，只保证 spinner 实色可见、不承诺统一 35——浅色自定义轨 `#fde68a` 仍走 35 档。
- **局部 provider × glass mix 继承边界（不扩大 token 作用域）**：`--oas-glass-*`（含 `--oas-glass-switch-track-mix`）只在 `:root[data-glass]` / `:root.dark[data-glass]` 层声明。暗色页面里嵌套显式 `data-theme="light"` 的局部 provider 不会重新绑定 glass mix，其子树 switch 继承根节点的 dark 100%（而非 light 88%）——这是既有单层玻璃 token 作用域的文档化边界，不新增局部 provider 选择器、不把 glass token 下沉到组件或局部 provider。另：glass.css 实测 3516 B / 6 KB 上限，仍属可选层常规余量，与 form 链 4 B 零余量风险分开管理。
- **范围纪律**：自定义 `color` 与不可控复杂背景不纳入 36 格，不新增第二套颜色算法；保留 40×22 几何、键盘/指针、动态高光注入/清理、RTL、disabled/loading 与组件消费点纪律；不改 ConfigProvider / ThemeEditor。

### 非目标

不把任意宿主复杂背景纳入保证范围；不扩大为全部控件的统一矩阵；不改变 glass-fluid 运行时的高光生成机制。

### 验收标准

- `packages/ui/qa-regression/glass.spec.ts` 在 Chromium + Firefox 真实浏览器锁 36 格矩阵、样本计数/唯一性/维度分解、press 真实 `:active` 与更强 sheen、console 零告警及 light/dark 截图；switch/glass 单测锁文字回落实色 token、轨道加深消费与 glass.css 明暗/实心回退值。
- 文档同步 glass/theming 中英文 guide、API 描述与 PRD/ROADMAP；全量 test / typecheck / build / e2e / perf:size / api / llms / stats / skill / lint / format / trace 通过。

## v2.6.5：异步选中与视觉窗口协议 ✅

### 功能定义

维护批二：把 `table/detail` 的 `selectByKey` 未命中等待从「windowed 隐式默认」改为显式 opt-in，并给等待补齐可取消语义（`AbortSignal`）；等待终止只由数据命中、显式取消或 abort 决定，模式与 MutationObserver 批次不再参与。同批还含表格视觉映射与可选视觉协议（见「table：windowed 请求映射与视觉协议」条目）及其数据源助手收口（`advanced/windowed.ts` 可选 `visual` 适配器）。不新增组件与事件，`selectByKey` 增加可选 `options` 参数；table 新增 `visual-total` / `visual-start` 两个可选属性与 `oas-window-request` detail 的可选视觉字段；`createWindowedSource` 新增可选 `visual` 适配器选项。版本号未定，不标已发布。

### 详细需求

- **table/detail：selectByKey 显式等待**：新增 `SelectByKeyOptions { waitForRow?: boolean; signal?: AbortSignal }`。默认（无选项）：有效 windowed（`windowed` + `total` 有限且截断后 > 0）未命中恢复 no-op（保留当前选中/面板、零事件、无可见等待），普通模式未命中仍清空选中并触发 `onClose`。`waitForRow: true`：任何模式下未命中都挂起等待 `data` 命中（保留当前选中/面板、不派发事件），命中后落地一次并派发一次 `oas-detail-change`；等待期间既有选中仍随 `data` 刷新（不重复派发）。等待没有超时，也没有等待失败事件。
- **table/detail：等待终止与可取消**：等待只由 `data` 命中、显式取消或 abort 结束——模式、`windowed` 属性、`total` 变化与 MutationObserver 批次（同批/不同批）不参与终止决策，同批与不同批命中结果一致。`close()`/`select()`/行或单元格点击/`Enter`/`Esc`/`destroy()`/`row-key` 变化/再次 `selectByKey()`（新键覆盖旧等待）均为显式取消。普通模式 `data` 删除选中行走内部 `apply(null, false)`：`onClose` 照发、清空选中，但不清除等待，等待键随后到达仍落地。`signal` 已 aborted 不建立等待（回落默认语义）；等待中 abort 只取消等待（不改选中/面板、零事件）；自然落地后 abort 无副作用；abort 监听以 `{ once: true }` 挂接，并在自然落地、任何取消与 destroy 时移除；多实例各自 signal 互不干扰。无选中时的 Esc 仍限本实例表格/面板内取消等待（不注册 window 全局兜底）。
- **table：windowed 请求映射与可选视觉协议（visual-total / visual-start）**：
  - **请求映射（本地 expand>12 收口）**：windowed 虚拟渲染与期望区间请求共用同一份 abs/flow 记账——切片内存在行内嵌展开条目（或视觉协议生效）时，可视窗口先按视觉总行数（协议未生效 = 数据 `total` + 当前切片合法 expand 数；协议生效 = `visual-total`）计算，再把与可视窗口相交的条目按属主数据行投影（data 条目 = 自身 `[abs, abs+1)`；expand 条目回连属主 `[abs-1, abs)`），取最小 start / 最大 end 夹到 `[0, data total)` 后前后各扩 `WINDOW_MARGIN`；无相交条目时回退可视窗口整体投影。请求区间不再按均匀 data 网格猜测——此前切片展开数超过 buffer + WINDOW_MARGIN（4 + 8 = 12）时渲染窗口与请求区间坐标系错位，快速跨越装载边界可能出现视觉重锚，本条目收口该缺口。`start` / `end` **永远是数据坐标**；映射生效时 detail 附带可选 `visualStart` / `visualEnd`（当前可视窗口的视觉坐标，供宿主视觉取数；不是切片 `visual-start`）。去重升级为「同窗口」= `start`/`end` 与 `visualStart`/`visualEnd` 都相同——展开数或 `visual-total` 变化移动可视区间时，即使数据区间相同也重新派发；覆盖判定仍只用数据 loaded。切片无展开且无协议时 detail 与派发行为逐值不变（既有宿主零感知）。
  - **可选视觉协议**：`visual-total`（全量视觉行数 = 数据行 + 行内嵌展开内容行，有限、截断取整、>0 且不小于数据 `total`）与 `visual-start`（当前切片 `data[0]` 的视觉行号，∈ `[0, visual-total]`）**同时有效**才启用（仅 windowed 叠加）。生效后渲染 flow 从 `visual-start × rowHeight` 起、渲染 count 与滚动总高 = `visual-total × rowHeight`——支持「切片前已有展开行」的宿主场景。协议生效后展开由宿主完全控制：本地 toggle 不改 `expanded`，只派发一次 `oas-expand` 并 devWarn 一次（实例级去重），宿主回写 `expanded` / `data` / visual 属性驱动重渲染。缺失 / 非法 / 只有其一 / `visual-total` 小于数据 `total` → devWarn 一次并**整体回落**当前模型（不部分生效）；两属性都缺席 → 静默（既有宿主零打扰）。`visual-start + 已装载条目数 > visual-total` 时 devWarn 一次，界外条目由视觉窗口裁掉不渲染；原数据越界（`abs ≥ total`）截断与末行合法 expand 保留不变。
  - **不变式**：`abs` 双坐标记账、`data-row-index`、事件 rowIndex、ARIA（`aria-rowcount` = 数据 total、绝对 `aria-rowindex`）、range/displaySnapshot 口径、焦点回锚与非 windowed 路径全部不变；键盘越界请求（`requestWindowForRow`）的数据 need 仍由目标 abs 决定，视觉字段按当前可视窗口补齐。
  - **`advanced/windowed.ts` 视觉适配器（收口）**：`createWindowedSource` 新增可选 `visual` 适配器（`getGeometry(dataStart)` 返回当前快照 `visual-start` / `visual-total`，`getDataRange(visualStart, visualEnd)` 把事件视觉区间映射为数据取数区间）——初始化与每次响应回填都重新求值 geometry（请求与响应之间宿主改变展开布局时用回填时最新快照，不缓存请求时旧值），`writing` 内写 `window-start` + `visual-start` + `data`、`writing` 外写 `total` + `visual-total`（与本次响应同一快照，回声抑制不自拉取）；请求带有效视觉字段时按 `getDataRange` 映射，取数区间为映射结果与事件数据区间的**并集**（事件 `start`/`end` 永远携带键盘目标行与视口缓冲，不被映射裁剪或被覆盖判定吞掉），且仅当协议生效（source 水位线与表格 `visual-total` 一致、表格视觉属性按表格同口径截断后逐项重验）才消费视觉字段，映射非法（非有限 / end ≤ start / adapter 抛错）不 fetch、不残留 filling、派发一次 `oas-window-error`（detail 含视觉区间与原始数据区间，`bubbles` + `composed`）；geometry 非法（非有限、start<0、total≤0、start>total、total<数据 total，total 截断后比较）不写错误视觉属性（陈旧属性移除、表格整体回落），走同一 `oas-window-error`——降级后事件视觉字段为本地口径、助手不再映射（按事件 `start`/`end` 原样取数）。两种失败恢复语义相同：**新窗口**事件可重试，**同窗口**推荐 `source.refresh()` 强制重拉（winReq 同窗口去重与已装载覆盖判定可能吞掉同窗口重试）；初始同步配置错误直接抛给调用方且不留任何半初始化状态；不传 `visual` 不写任何视觉属性（既有行为逐值不变）。此前宿主只能按事件 `start`/`end` 均匀取数（可视窗口与切片不相交时只是夹取猜测）——本地映射已修复切片内的坐标错位，跨切片（切片前已有展开行）由可选协议 + 适配器保证。

### 非目标

不定版本号、不标已发布；等待语义不加超时或失败事件、不改默认（无选项）调用在普通模式的清空语义；视觉协议不做部分生效（整体回落）、不发明切片前的全量展开状态推导、不新增事件（`visualStart`/`visualEnd` 为既有 `oas-window-request` detail 的可选字段）；不改主题与视觉 token；不 dispatch 子任务外的额外产品面。

### 验收标准

- 单测：默认 windowed 未命中 no-op/零事件、`waitForRow` 普通模式等待命中、不同批模式回落仍落地且与同批一致、普通删除选中行 `onClose` 照发但等待保留、`windowed` 属性移除不终止等待、signal 已 aborted/等待中 abort/落地后 abort/destroy 后 abort、多实例 signal 互不扰、既有取消路径（close/select/点击/Enter/Esc/destroy/row-key/新键）全部保留；expand>12 请求映射（scrollTop=4440 → [95,118) + 视觉字段，覆盖真实可见行 104..109 与属主 103..109）、展开数变化同数据 need 重派与同窗口去重、协议生效 flow/总高/abs/ARIA/displaySnapshot 不变、协议下本地 toggle 只发 oas-expand 不改 expanded、协议回落（缺一/非法/小于 total）devWarn 一次、协议越界界外不渲染、键盘越界视觉字段补齐；`mapVisualWindowToData` / `sameWindow` 视觉字段纯函数覆盖；windowed source 视觉适配器（初始化/回填齐写与重求值、回填用最新 geometry、回声抑制、映射/geometry 非法失败事件与重试、无 visual 旧行为逐值不变、destroy 迟到结果不写、协议下焦点回锚）。
- e2e：`qa-regression/table.spec.ts` 真实 Chromium——默认未命中无可见等待（面板/事件不变）、显式等待回填有可见面板反馈、abort 后回填无反馈；expand>12 映射（真实滚动 → 请求 [95,118)+视觉字段 → 渲染 104..109 与属主 expand 可见）与 visual-start 协议（总高 80000、宿主控制展开、ARIA/displaySnapshot 数据口径）两场景；`createWindowedSource × 视觉适配器`（真实 adapter 驱动协议取数、滚动请求按视觉映射覆盖真实可见行、协议下本地 toggle 只派发 oas-expand、宿主回写 expanded/visual-start/data 后焦点仍在同一 row-key、ARIA 不变），含 dark 主题与 console/pageerror 零新增告警。
- 文档 zh/en 同步；`api:check` / `llms:check` / `stats:check` / `lint:md` / `format:check` 通过。

## v2.6.5：SSR locale 请求局部化 ✅

### 功能定义

服务端并发正确性修复：`renderToString(tag, attrs, slotHTML, opts)` 的显式 `opts.locale` 从「全局 `setLocale` 切换 + 渲染段同步」改为**请求局部化**——显式 locale 只影响本次调用及嵌套子树；未传 `locale` 保持旧行为（沿用调用时全局 locale）。不新增组件与事件，不改变白名单与快照格式。

### 详细需求

- **旧行为缺陷**：显式 locale 经全局 i18n registry `setLocale()` 切换，`await` 边界后渲染；同一轮 `Promise.all` 中多请求（冷加载的真实 import 竞态窗口尤甚）会把 setLocale 与渲染错位配对——请求串语言（zh 输出 en 文案）、并把进程级全局 locale 永久改写、触发多次 locale/translator 广播。
- **新语义**：单一 i18n ready Promise 装载 registry 并注册内置 zh-CN / en 语言包（所有并发请求共享同一份，无第二条冷加载路径）；显式 locale 时确保 config-provider 组件已装载，在共享 document 内创建**本次调用独立的临时 `<oas-config-provider locale>`**，目标元素挂其下，组件 `t()` 就近读取 provider 翻译器同步渲染（嵌套子组件同源），输出不含 provider 包装；`try/finally` 清理目标元素与临时 provider（含渲染异常中断路径）。**不调用 `setLocale`**：不改全局 locale、渲染段不触发 locale/translator 广播（i18n registry 一次性装载副作用除外）。
- **同步临界区**：临时 provider 创建、目标渲染、嵌套 DSD 序列化、快照提取全程同步无 await；渲染后的并发准备（装载/ready）都在 await 边界之前收口。冷加载并发不被无意义串行化（无全局 mutex、无 AsyncLocalStorage），不为未来 RTL 强加 direction。

### 非目标

不改未传 `opts.locale` 的旧语义；不引入全局 mutex / AsyncLocalStorage；不新增 provider 包装输出、事件或属性；不动 SSR 白名单与 DSD 快照格式（指纹版本不变）。

### 验收标准

- 新增 `packages/ssr/src/locale-concurrency.test.ts`（RED→GREEN）：32 次冷并发 + 96 次热并发（zh-CN/en 混合、多翻译路径 empty.noData/tag.close/transfer.empty）逐请求 marker 核对语言与嵌套子树；全局 locale 改写与广播次数为 0；成功/人为异常路径后 shim document 无临时 provider/目标宿主且后续请求可继续；测试稳定抓出旧实现（无随机偶发）。
- e2e：`packages/ssr/ssr-dsd.spec.ts` 新增并发混合多语言静态快照用例（16 请求逐 marker 核对禁 JS 可见语言与嵌套关闭按钮 aria-label，console/pageerror 零告警）。
- 文档：`docs/ssr.md` + 中英 guide locale 语义段同步；`ssr:check` / `llms:check` / `api:check` / `typecheck` / `build` / 全量 `test` / 全量 e2e 通过。

## v2.6.5：Release 同 SHA 质量门禁 ✅

### 功能定义

发布链架构决策：`.github/workflows/release.yml` 从单 publish job 拆为 **verify-quality → publish** 两 job——发布前必须证明「tag 指向的提交在**同一仓库**有**完整 CI（ci.yml）completed + success** 记录」，且发布内容固定在验证通过的那个提交上；本地 `release:check` 的「tag ≠ HEAD 仅警告」语义保持兼容。

### 详细需求

- **verify-quality（fail closed）**：只接受同仓库、`github.sha` 对应、`ci.yml` 完整 run `completed + success`；其他 SHA / pending / queued / failure / cancelled / 空结果 / 非 CI workflow 一律不放行（无等待、无重试、无跳过通道）；判定矩阵为纯函数（`scripts/release-gate.mjs`），CLI 入口 `node scripts/release-check.mjs --verify-ci`。
- **publish（依赖 verify）**：checkout 固定 `github.sha`（非 tag ref）+ `fetch-depth: 0`；发布前置 `pnpm release:check <去掉 v 的版本> --require-tag-head`（CI 严格模式）：tag v<版本> 必须存在且解析（lightweight/annotated 均可）到 HEAD，HEAD 必须等于 GITHUB_SHA（checkout 漂移防护），任何不一致直接失败；非 semver tag 直接失败。严格校验先于 build / api:check / OIDC 发布执行；`publish-skip-existing` 幂等保留。
- **权限最小化**：顶层 `permissions: {}`；verify-quality 仅 `contents: read` + `actions: read`；publish 仅 `contents: write`（GitHub Release）+ `id-token: write`（OIDC Trusted Publishing）——verify 不给 publish 任何额外权限。
- **本地兼容**：本地（打 tag 前 / 复核）模式保持原语义——版本/CHANGELOG 硬校验不变，tag 存在但不指向 HEAD 仅警告并列出 gap 提交清单，不拦截；无 tag 时本地流程照常可用。

### 非目标

不重复全量 e2e（发布质量由 CI workflow 的绿色结论覆盖）；不提供任何跳过门禁的后门（无 SKIP / force 类开关）；不改变 npm 发布方式（仍 OIDC Trusted Publishing）与 `publish-skip-existing` 幂等语义。

### 验收标准

- `scripts/release-check.test.mjs`（node:test，fixture git 仓库 + 子进程跑真实脚本）覆盖：同 SHA 绿放行、其他 SHA / pending / failure / cancelled / 空结果 / 非 CI workflow / 异仓库 head 阻断、lightweight/annotated 两种 tag 解引用、tag 验证后移动阻断（本地仅警告）、HEAD≠GITHUB_SHA 阻断、tag 缺失阻断、版本/CHANGELOG 不一致阻断、非 semver 拒绝；并对 release.yml 做静态断言（needs 依赖、固定验证 SHA + 完整 checkout、严格 release:check 顺序、最小权限）。
- `pnpm release:check:test` 接入 CI test job，防 workflow/脚本漂移。
- 工程文档（docs/engineering.md §5）同步两 job 时序与权限模型。

## v2.6.5：CDN i18n（组件内置文案切换）✅

### 功能定义

CDN IIFE 此前内联了 i18n registry 但无切换入口，宿主只能消费恒为 zh-CN 的内置文案。本批给主入口 `@oas-ui/ui` 与 9 个 CDN 族包新增**唯一** registry 透传导出 `setLocale`（IIFE 全局 `OASUI.setLocale`）；不新增组件、事件、属性，不改 `ssr.ts` 与 SSR 白名单。配套：官方模板 admin-pro/cdn 与 cdn-mpa 接入同一链路。版本号未定，不标已发布。

### 详细需求

- **导出面**：仅新增 `setLocale`；`loadLocale` / `t` / `onLocaleChange` / `registerLocale` / `getLocale` / `getLocaleName` / `getDirection` 及语言包本体不进主入口与族包导出面。registry/core 的 globalThis 单例复用，不重写 registry。
- **切换语义**：中文 `setLocale('zh-CN')`（IIFE 内联 registry 已默认注册，同步生效）；英文由宿主动态 import 与 IIFE **同版本**的纯数据 `@oas-ui/i18n/dist/en.js`（内部相对引用 `locales/en.js`，无 registry 副作用）后 `setLocale(module.default)`。已挂载组件经 translator 广播即时刷新；不做同步壳层 API 的 async 化。
- **宿主侧契约（官方模板落地）**：成功 Promise/对象缓存（重复切换零下载）；失败不永久缓存、下次切换自动重试；慢英文包返回前用户已切回中文的迟到结果不得覆盖中文；MPA 切语言仍为「写 storage + 整页 reload」，组件 registry 在页面加载时按当前语言对齐。
- **模板工程配套**：e2e 离线 mock 按真实文件路径回填 unpkg 请求（theme/ui/i18n 三 pin 各回各的真实产物，不得把所有请求当 cdn.js）；`bump-cdn` 同时校验/改写 html 的 theme/ui 与 i18n.js 的语言包版本，避免「新组件 + 旧语言包」。
- **combobox 未升级元素边界（模板全量回归暴露）**：`oas-form` 读取文档序中尚未升级的 `oas-combobox` 时按空值 `''` 处理，不得把 `undefined` 送入 `normalizeValue` 触发 `startsWith` TypeError；正常 string/array 值语义不变。

### 非目标

不导出 loadLocale/全部语言包/t/getDirection/onLocaleChange；不改 ssr.ts 与 SSR locale 语义；不改 React/Vue/Svelte 模板；不在 i18n 包内新增「远程加载器」，语言包获取始终由宿主动态 import 完成。

### 验收标准

- e2e（`packages/ui/qa-regression/cdn-i18n.spec.ts`，真实 dist 产物，chromium + firefox）：真实 cdn.js IIFE 加载后 `OASUI.setLocale` 存在且导出面不扩大（loadLocale/t/onLocaleChange/registerLocale 均为 undefined）；ESM `dist/index.js` 只新增 setLocale 导出；feedback 族包同口径抽验；已挂载 popconfirm/empty 中文 → 英文（真实 en.js + 相对 locales/en.js）→ 中文即时刷新，全程无 raw key / pageerror / console error。
- 模板 e2e（admin-pro/cdn + cdn-mpa，Chromium + Firefox 真实交互）：部门删除 popconfirm 英文 OK/Cancel、中文确定/取消；en-US 首访与刷新一致；延迟英文包先切英文再切中文释放后仍中文；首载 404 组件维持中文、重试成功切英文；console 零告警；`bump-cdn --check` 对 stale i18n pin exit 1。
- qa 回归 `packages/ui/qa-regression/form-unupgraded-combobox.spec.ts`（Chromium + Firefox）：真实 bundle 下 `oas-form` 先升级、子级 combobox 未升级时零 pageerror，`getValues()` 将该字段读为 `''`，不再出现 `startsWith` 崩溃。
- 主仓全量验证：build / typecheck / 全量单测 / 全量 e2e / api:check / llms:check / stats / skill:check / perf:size / lint / format 通过。

## v2.6.5：表格 Pro / JSON 查看器 / Sidebar 维护 ✅

### 功能定义

v2.6.4 后的维护批：补齐 table Pro 能力在 windowed、失败请求与重绘路径上的行为缺口，降低 JSON 查看器的重绘成本，并修复 sidebar 嵌套头像子项的重复行首占位。布局修复包括：windowed 行内嵌 expand（`row.expand` 展开内容行）改占独立视觉槽位；带 `avatar` / `avatarText` 的嵌套子项隐藏空图标槽，普通无图标子项仍保留缩进占位。不新增组件，不改变公开方法签名、属性、事件 detail；除上述布局修复外不改主题/视觉与 token。版本号未定，不标已发布。

### 详细需求

- **table/detail：有效 windowed 判定**：`windowed` 属性在场且 `total` 先截断（非有限数按 0）后 `> 0` 才视为生效，与表格 `readWindowedMode` 同口径；`total` 缺失、非法或截断后为 0（含 `0.5`）按普通模式处理。`refresh()` 与 `selectByKey()` 共用该判定。
- **table/detail：selectByKey 等待与取消**：本批的 windowed 隐式等待已由「v2.6.5：异步选中与视觉窗口协议」批改为显式 `waitForRow` opt-in（含 `AbortSignal` 取消与终止决策收口），此处的隐式默认与批次契约描述作废；普通模式键不存在清空选中、未渲染行保留选中（`rowIndex=-1`）的语义不变。
- **table/detail：pending-only Esc 作用域**：无选中且仅等待时，只有本实例表格/面板内的 `Esc` 取消等待；不注册 window 全局兜底，不抢多实例「最近激活」标记，仍让位 `defaultPrevented`、输入控件与同表其它活动实例。`closeOnEscape: false` 时完全不响应 Esc；启用 range 且存在活动选区时，表格内第一次 Esc 先清选区、等待保留。
- **table/range：tabindex 所有权**：控制器只保存「原值 + 自己最后写入的 `0/-1`」；range 禁用且未交给 grid-navigation 时，仅当当前 `tabindex` 仍等于最后写入值才恢复原值，拥有期间被其它能力改写则保留外部值。grid-navigation 接管时直接放弃记录、不回写陈旧原值。
- **table/advanced：windowed source 覆盖判定**：每次处理 `oas-window-request` 时，覆盖去重都读表格当前真实切片（`window-start` + `data` 长度，有限数、截断、最小 0 的半开区间），不自存装载区间；宿主外部清空/替换 `data` 或切换 `window-start` 后，同窗口请求会重新拉取。保留在途去重、回声抑制、`refresh()` 强制重拉、`destroy()` 中止过期请求与构造首拉行为。
- **table/advanced：windowed source 失败重试**：`fetchRows` 同步 `throw` 与 Promise rejection 走同一失败路径：清在途标记并派发一次 `oas-window-error`（`detail { start, end, error }`，`bubbles` + `composed`），之后同窗口可重试；过期失败不清新请求的在途标记。不自动重试，也不改表格 `oas-window-request` 的派发。
- **table：windowed 行内嵌 expand 视觉槽位**：`renderWindowedBody` 双坐标记账——`abs` 仅数据行递增（`data-row-index`、事件 rowIndex 与 ARIA 口径不变），flow 坐标对每个 display 条目（含 expand 内容行）递增；culling、首尾 spacer 与 tbody 总高一律按 flow 记账，总高 = `total × rowHeight + 当前已装载切片中的 expand 数 × rowHeight`，不随滚动漂移；渲染窗口条目数 = `total + 当前切片 expand 数`（已装载的全量末行数据的 expand 不被窗口上界裁掉）。切片越界（`window-start + 装载数 > total`）时，越界数据行及其 expand 不渲染（对齐既有「越界行不渲染」契约），最后合法数据行的 expand 保留；无 expand 时与旧公式逐值等价（由既有无 expand 的 windowed 用例保持，未新增对照测试）；`oas-window-request` 期望区间、ARIA、range/displaySnapshot 与非 windowed 路径不变；expand 内容按既有定高模型占一行高（富内容归非虚拟模式）。多行展开与已装载的全量末行 expand 均可见。（本批遗留的「展开数 > buffer + WINDOW_MARGIN 时请求区间按均匀网格猜测、可能视觉重锚」边界已由「v2.6.5：异步选中与视觉窗口协议」批的请求映射收口。）
- **sidebar：嵌套头像行首槽位**：`depth > 0` 且没有 icon 时，仅在同时没有 `avatar` / `avatarText` 的情况下保留 18px 空图标槽用于层级缩进；头像子项的空图标设为 `hidden`，不参与 flex 布局，也不产生第二个 gap。普通无图标子项的缩进、头像尺寸、折叠态与公开 API 不变。
- **JSON 查看器：滚动/键盘复用可见行**：窗口内滚动、键盘移动与 `scrollToPath()` 收尾复用最近一次完整计算的可见行；`scrollToPath()` 一次公开调用只完整展开一次。数据源/根节点/展开态/搜索态变化都会置脏，回到完整重算。
- **JSON 查看器：跳过行 DOM 重建**：行渲染签名（可见行数组身份、行容器身份、窗口起止、行高、搜索词、活动路径、自定义 toggle 模板存在性）全部相等时跳过行 DOM 重建，仅更新工具栏/`aria-activedescendant`/`aria-busy`；活动行校正、搜索跳转、空/错误态与模板变更一律重建。
- **JSON 查看器：activeIndex 与搜索祖先缓存**：每次渲染只计算一次活动行下标（滚动校正与 aria 共用）；搜索命中集重算时同步预计算去重后的祖先展开集，后续重绘只遍历缓存，手动收起仍优先。
- **JSON 查看器：自定义 toggle 模板刷新**：存在 `template[slot="toggle-expanded"]` / `toggle-collapsed` 时每次渲染重建行 DOM 以重新 clone（可见行数组仍可复用），覆盖新增/原地改写/移除模板；无模板时保留行 DOM 跳过优化。

### 非目标

不定版本号、不标已发布；不改公开 API/属性/事件（视觉仅限 windowed 行内嵌 expand 与 sidebar 嵌套头像的槽位布局修复：不改主题、视觉 token、expand 行高/边框模型、头像尺寸与普通子项缩进）；不新增 Pro 产品 UI；不把 `oas-markdown` 纳入本库；不删除 `table/core` 别名（v2.6.5 计划）；不改 `perf-baseline.json` 或预算档位。

### 验收标准

- 单测：detail 显式等待/覆盖/取消/终止收口/旧选中刷新/Esc 作用域；range tabindex 所有权与恢复；windowed source 外部清空换窗重拉、同步/异步失败重试、在途去重与 destroy；windowed × 行内嵌 expand 总高记账与边界 culling（scrollTop 变化总高稳定不漂移、1740 边界不误纳入行52、多展开与已装载的全量末行 expand 可见、越界切片不渲染越界行及其 expand、无 expand 逐值等价由既有用例保持）；JSON 查看器滚动零重算、行 DOM 身份复用、`scrollToPath` 单次展开、搜索祖先缓存、模板增改删刷新；sidebar 嵌套头像与普通无图标子项的分支行为。全量 Vitest 与 `stats:check` 均通过。
- e2e：`qa-regression/table.spec.ts`、`qa-regression/json-viewer.spec.ts` 与 `qa-regression/sidebar.spec.ts` 真实 Chromium 用例通过（含 windowed × expand 边界；sidebar 嵌套头像空图标 `display:none`、宽 0、头像到 label 仅一次 gap，普通无图标子项占位与缩进不变；dark 主题、console/pageerror 零新增告警）。
- 文档 zh/en 同步（table Pro 正文、PRD/ROADMAP/CHANGELOG/perf 说明）；`api:check` / `llms:check` / `stats:check` / `skill:check` / `lint:md` / `format:check` 通过。
- 包体：`data/json-viewer` gzip 约 32.8 KB，仍低于 35 KB 硬预算；`perf:size` WARN 为既有预警线，不重定档。

## v2.6.4：N01 JSON 查看器 ✅

### 功能定义

新增只读 JSON 树查看器 `oas-json-viewer`（data 族）：面向「粘贴/加载 JSON 后浏览、搜索、复制路径、大文件滚动」场景，为后续「输入 JSON → 格式化 → 左右对照」工具页提供可嵌入的浏览积木。不负责编辑、Schema 校验、查询执行或差异对比（Diff 归 N02）。

### 详细需求

- **根与层级约定**：始终渲染根行（对象/数组根显示 `{…} N keys` / `[…] N items`）+ 根下第一层子行；根 `aria-level=1`。对象子行显示 `"key":`，数组子行显示 `[i]`；原始值根也占一行。`default-expand-depth=1` 表示「根展开、直接子级可见」；`expandToDepth(0)` 只留根行、`expandToDepth(1)` 根 + 子级，依此类推。
- **数据通道**：`data` property（对象/数组/原始值）+ `text` 属性/property（JSON 原文，声明式/SSR 通道）。**最近一次写入生效**：写 `data` 会移除 `text` 属性（防 SSR 旧快照覆盖）；写 `text` 会清空 `data` 缓存；水合时若 `data` 已在连接前设置则优先，否则解析 `text`。`text` 解析失败进入错误态并派发 `oas-parse-error`（`detail: { message, line?, column?, source }`，纯文本渲染）；之后写 `data` 或合法 `text` 清除错误态。
- **树与展开**：展开/折叠、`default-expand-depth`（默认 1）、`expanded`（JSONPath 数组）。**`expanded` 属性在场 = 受控**：组件不写回，只派发 `oas-toggle`（`{ path, expanded }`）；属性缺席 = 非受控，内部维护状态。批量方法 `expandAll()` / `collapseAll()` / `expandToDepth(n)` 在受控模式派发 `oas-expanded-change`（`{ paths }`）由宿主回写，非受控直接生效；`scrollToPath(path)` 自动展开折叠祖先。深层 path 的祖先按前缀自动补全。
- **搜索**：`search` 属性/property（大小写不敏感子串，v1 不做正则）；输入框与属性双向同步。`matches` = 命中节点数（key/value 同时命中算 1），`activeIndex` 0 基、无命中 -1；自动展开命中祖先但不隐藏其他节点；`searchNext()` / `searchPrev()` 循环；设置搜索自动跳第一个命中并滚动；清空搜索恢复「开始搜索时的展开快照 + 搜索期间用户手动 toggle 的增量」。`oas-search-change`（`{ query, matches, activeIndex }`）。
- **内置 chrome**：顶部工具栏默认开启（`toolbar="false"` 关闭），含搜索框、命中计数、上一个/下一个、全部展开/全部收起、复制当前节点（路径/值/子树 JSON）三个动作；树区域单焦点容器 + `aria-activedescendant`，工具栏控件进 Tab 序。`copyable`（默认 true）只控制复制动作是否显示；`height`（默认 360）是含工具栏的固定视口，内容区占剩余高度。
- **自定义展开图标**：`template[slot="toggle-collapsed"]` / `template[slot="toggle-expanded"]` 分别提供折叠态与展开态内容，支持文本、SVG 与带框元素；未提供对应模板时回落默认三角形，叶节点不显示图标。模板内容可用 `part="toggle-icon"` 参与 `::part()` 定制。
- **复制**：方法 `copyPath(path)` / `copyValue(path)` / `copyJson(path)` 在 `copyable=false` 时仍可用。`copyValue`：原始值输出原文（string 不带引号），对象/数组输出格式化 JSON；`copyJson`：一律 JSON（string 带引号，按 `indent`）；`copyPath`：单引号 JSONPath（`$['a.b'][0]`，单引号/反斜杠转义），与 `expanded` / `scrollToPath()` 输入格式一致（双向可回传）。点击/方法调用先派发可取消的 `oas-copy`（`{ path, kind, text }`），未被取消则在用户手势内写剪贴板，成功派发 `oas-copied`、失败 `oas-copy-error`。
- **大文件**：树虚拟滚动（固定行高 + overscan，只渲染可视区）；`height`（默认 360）、`row-height`（默认 24）、`virtual`（默认自动：可见节点 > 200 启用，`virtual="false"` 强制关闭）；`scrollToPath()` 定位。解析在主线程（超大文件建议宿主预解析后传 `data`）。
- **展示**：类型色走 token；值一律渲染完整文本（DOM 中保留全文保证读屏可读），单行 `text-overflow: ellipsis` + `title` 提示，不引入动态行高/浮层；`indent`（默认 2）、紧凑模式（更小字号/行距，显式 `row-height` 优先）；暗色/RTL 逻辑属性；宿主 `aria-label` 转发命名树。
- **A11y/键盘**：`role="tree"` + `treeitem`、`aria-expanded` / `aria-level` / `aria-posinset` / `aria-setsize`；单焦点容器 + `aria-activedescendant`；↑/↓ 移动、→ 展开/进子级、← 收起/回父级、Home/End 首尾、Enter/Space 切换；`Ctrl/Cmd+F` **仅 focus-within 时**聚焦搜索（`search-shortcut="false"` 关闭，多实例只响应焦点所在实例）；读屏可感知类型与路径。
- **SSR/DSD**：`text` 属性参与 SSR 快照与水合，水合不重建；`data` property 不反射 attribute。
- **i18n**：错误/空态/复制反馈/搜索计数/工具栏标签走 locale key；10 个语言包同步补 key（非中英语言先用英文兜底），保持 locale-completeness 测试通过。

### 非目标

编辑、Schema 校验、JMESPath/JSONPath 查询执行、JSON diff/左右对照、远程加载、Worker 解析、折叠状态持久化、Markdown 渲染。

### 验收标准

- 单测：解析/错误恢复、`data`/`text` 双源、展开受控/非受控、搜索与计数、复制路径转义、虚拟窗口边界、键盘模型、SSR 水合。
- e2e：10k 节点滚动时 DOM 行数有界、搜索跳转命中、复制路径反馈、真实键盘、axe 零严重违规、暗色/RTL。
- 文档 zh/en（含 API/demo）、`api:check` 双向 0、CHANGELOG `[2.6.4]`、PRD/ROADMAP 同步。
- 包体：`data/json-viewer` 按需链 gzip 实测 32.5 KB（链含 core + i18n + 组件），初版目标 ≤ 32 KB，`perf:size` 硬预算 35 KB；零第三方运行时依赖。复制反馈浮层、深嵌套容错与图标模板使本版较初版目标高 0.5 KB，仍在硬预算内；后续优先压缩复制反馈与深嵌套处理路径。

## v2.6.4：N02 文本 Diff 查看器 ✅

### 功能定义

新增只读文本差异查看器 `oas-diff-viewer`（data 族）：面向「配置对比 / 提示词版本对比 / 格式化 JSON 对照」场景，输入两段文本，输出行级差异，支持行内与并排两种视图、未修改区块折叠、行级 + 词级高亮。不负责编辑、合并、接受/拒绝、三方对比、结构级 JSON diff（JSON 走格式化文本）、语法高亮、搜索与远程加载。

### 详细需求

- **数据通道**：`old-text` / `new-text` 属性（文本，声明式/SSR 通道）；property 为 `oldText` / `newText`（避免与 DOM `before()` / `after()` 方法冲突，写入反射同名属性）；缺省空串。两侧都为空白 → 空态提示；内容相同 → 「无差异」提示（仍渲染行号与统计 0/0）。`old-label` / `new-label` 覆盖并排视图列头，缺省走 i18n「修改前 / 修改后」。
- **算法**：按行切分（`\r\n` / `\r` 归一为 `\n`，末尾换行不额外产生空行），行级 Myers 差异（O(ND)，共同前后缀先裁剪）；超过 `max-edits`（默认 1000）时降级为「整块替换」并置 `data-degraded` + 读屏提示，不阻塞主线程。`ignore-whitespace`（默认 false）开启时比较前归一空白（连续空白折叠、行首尾裁剪），但显示仍为原文。
- **词级高亮**：对成对的删除/新增行做共同前缀/后缀裁剪，仅高亮变化片段；token 化覆盖 ASCII 词、数字、标点、空白与 CJK 单字，避免整行标红；一行对多行时（行数不等的替换块）只做行级高亮，不做跨行词级对齐。
- **折叠**：相邻未修改行超过 `context`（默认 3，两侧各保留行数）时折叠中间部分，渲染「展开 N 行未修改」按钮；`context=0` 只保留变更行本身。按钮可 Tab 聚焦、`aria-expanded` 同步、回车由原生按钮行为展开；方法 `expandAll()` / `collapseAll()` 为每个发生变化的折叠区间各派发一次 `oas-hunk-toggle`（`detail: { index, expanded, start, count }`，`index` 为变更块序号）；单块展开后焦点交还视口。数据更新后折叠状态重置。
- **视图**：`mode="unified" | "split"`（默认 `unified`）。`split` 用单一滚动容器 + 对齐行渲染左右两列（天然同步滚动）；容器宽度小于 `split-min-width`（默认 640）时自动降级 `unified`（`mode` 属性值不变，形态跟随可用宽度）。行号 `show-line-numbers`（默认 true）在 unified 下同时显示旧/新行号，空位占位。
- **长文件**：统一以「对齐行」为虚拟单位（固定 `row-height`，默认 22），渲染行数超过 `virtual-threshold`（默认 2000）自动启用窗口渲染，折叠块作为单个虚拟行；`virtual="true"` 强制开启、`"false"` 关闭；`height`（默认 480）为含工具栏的固定视口。
- **统计与事件**：工具栏显示 `+N` / `−N` 与变更块数量（`toolbar="false"` 关闭），`added` / `removed` / `unchanged` / `hunks` 通过只读 property `stats` 暴露；`old-text` / `new-text` 更新（含首次挂载）后派发 `oas-diff-change`（`detail: { added, removed, unchanged, hunks }`）。
- **A11y/键盘**：`role="grid"` + `row` + `gridcell`（并排为四列：旧行号/旧内容/新行号/新内容；隐藏行号时为两列）；行号 `aria-hidden`，变更行带「新增行 N / 删除行 M」可访问名称；`+` / `−` 前缀文字、背景色与可访问名称多通道表达，不单靠颜色。单焦点容器 + `aria-activedescendant`：↑/↓ 移动行、Home/End 首尾、PageUp/PageDown 翻页、Enter/Space 展开/收起当前折叠块；折叠按钮进 Tab 序。宿主 `aria-label` 转发命名表格。
- **展示**：新增/删除背景与词级高亮走 token（暗色变体同步，文本对比度 ≥ 4.5:1）；`wrap`（默认 false）控制长行折行，折行时行高按内容自适应并退出虚拟窗口；RTL 下逻辑属性镜像，split 的旧文本列保持在起始侧。
- **SSR/DSD**：`old-text` / `new-text` 参与 SSR 快照；水合复用 shadow 骨架与行容器（行节点按客户端数据重建），DSD 场景下不重建 shadow。
- **i18n**：空态/无差异/折叠按钮/统计标签/列头/行可访问名称由 locale key 提供；10 个语言包同步补 key（非中英先用英文兜底），保持 locale-completeness 测试通过。

### 非目标

编辑、合并、接受/拒绝变更、三方 diff、结构级 JSON diff、语法高亮、搜索/过滤、patch 导入导出、远程加载、Worker 计算、状态持久化、Markdown 渲染。

### 验收标准

- 单测：行切分与换行归一、Myers 结果与参考 LCS 随机对拍、词级高亮（CJK/空白/整行替换/多行替换）、折叠区间计算（context=0/默认/边界）、split 行对齐、降级路径、SSR 快照。
- e2e：unified/split 切换、折叠块展开收起、真实键盘（方向键/PageUp/End/Enter）、2000+ 行虚拟窗口 DOM 行数有界、窄容器降级、axe 零严重违规、暗色/RTL。
- 文档 zh/en（含 API/demo）、`api:check` 双向 0、CHANGELOG `[2.6.4]`、PRD/ROADMAP 同步。
- 包体：`data/diff-viewer` 按需链 gzip 实测 31.6 KB（链含 core + i18n + 组件），目标 ≤ 32 KB、`perf:size` 预算 34 KB；零第三方运行时依赖。

## v2.6.4：N04 日志 ANSI 着色（可行子集）✅

### 功能定义

在既有 `oas-log` 上增加 opt-in `ansi` 属性：把日志行中的 ANSI SGR 序列解析为颜色/样式，同时保持纯文本日志的默认行为不变。不做终端模拟器（输入、光标、PTY、OSC 8 超链接），不引入运行时依赖。

### 详细需求

- **解析范围**：16 色前景/背景（`30-37` / `90-97` / `40-47` / `100-107`）、256 色（`38;5;n` / `48;5;n`）、truecolor（`38;2;r;g;b` / `48;2;r;g;b`）；加粗/暗淡/斜体/下划线/反显与 `0` / `22` / `23` / `24` / `27` / `39` / `49` 复位。未识别参数忽略，不影响后续文本。
- **控制字符**：非 SGR 的 CSI/OSC/DCS、多字节 ESC、行尾半截序列、孤立 ESC 与 C0 控制字符从显示文本剔除（保留制表符）；全程 `textContent` / class / inline style，不走 `innerHTML`。
- **可读性**：16 色前景走 `light-dark()` 双主题色板，全部前景 ≥62 感知对比度；256/truecolor 前景按浅/暗主题校正；16 色背景保证黑/白至少一档 ≥60，彩色背景自动择优；宿主可在 `oas-log` 上覆盖 `--ansi-*`。
- **组合**：ANSI 前景优先于行 `levels` 语义色；`keyword` / `highlight` 命中仍包 `mark`，跨转义边界也保留；keyword 过滤按可见文本匹配。
- **增量**：reconcile 用原始文本对齐；过滤态顶部插入时按 viewMap 漂移重算行号/levels；通道未变时追加零重建。
- **边界**：SGR 状态按行重置；任意 truecolor 背景只能择优、极端中间色可能需宿主显式前景；elevated 背景/`dim` 下可覆盖变量。

### 非目标

终端模拟、输入/PTY、光标控制、OSC 8 超链接、跨行 SGR 状态延续、`aria-live` 流式播报策略。

### 验收标准

- 单测：转义剔除、16/256/truecolor、样式开关、inverse、跨片段 mark、viewMap 漂移、色板守卫、恶意文本。
- e2e：demo 颜色生效、无转义泄漏、宿主覆盖变量、暗色/浅色 a11y、keyword/levels 组合。
- 文档 zh/en、API 语料/manifest、CHANGELOG `[2.6.4]`、ROADMAP 同步。

## v2.6.4：N05 文件浏览器组合（recipe）✅

### 功能定义

不新建独立文件树组件；用 `oas-tree directory` 作为主体，由宿主组合工具栏、面包屑、选中路径、上传/右键菜单入口与内联重命名，形成文件资源管理器 recipe。

### 详细需求

- `directory` 文件/文件夹图标；`height` 虚拟滚动；`tree-lines` 层级引导线。
- 工具栏展开/收起；面包屑显示根到当前节点的 label 链；选中路径状态。
- `can-rename` + `oas-node-rename` 宿主回写 `data`，Enter 提交 / Esc 取消；宿主不改数据则保持旧值。
- 上传、新建文件夹、右键菜单由宿主组合 `oas-upload` / `oas-context-menu`，本 recipe 只给出组合边界。

### 非目标

独立文件树组件、内置上传/右键菜单 UI、远程文件系统协议、权限模型。

### 验收标准

- zh/en 文档 demo 可展开/收起、选中、重命名并联动面包屑；暗色与 a11y 通过。
- 不新增组件/事件/API；`oas-tree` 行为不变。

## v2.6.4：N06 数据网格高级能力（advanced 入口）✅

### 功能定义

新增独立子路径 `@oas-ui/ui/data/table/advanced`，提供纯函数/列工厂增强 `oas-table`，不注册自定义元素、不引入编辑与表单控件。主 `table` / `table/core` / `table/edit` 边界不变（v2.6.4 起 `table` 默认去 edit、`table/core` 转 deprecated 别名，见 v2.6.4 段）。

### 详细需求

- **透视**：`pivot()` 按行/列字段聚合（sum/avg/count/min/max），输出矩阵与行列合计；空值（null / undefined / ''）忽略，`count` 只计有效值；`pivotTable()` 直接产出 `columns` / `data`，省略 `columnField` 时只输出一列汇总。
- **公式列**：`compileFormula()` / `formulaColumn()` 安全表达式（字段、四则、比较、逻辑、`IF`/`ROUND`/`MIN`/`MAX`/`SUM`/`CONCAT`/`COALESCE`/`LEN` 等），不使用 `eval` / `Function`；不访问原型链。
- **查询构建器**：`compileQuery()` / `filterRows()` 支持 `and`/`or` 任意嵌套与 `eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`contains`/`startsWith`/`endsWith`/`in`/`between`/`exists`/`empty`。
- **TSV**：`toTsv()` / `parseTsv()` 导出与解析表格区域。
- 需要编辑时组合 `table/edit`；本入口默认不引入编辑依赖。

### 非目标

条件格式规则编辑器 UI、视图状态持久化 UI（存储由宿主决定）；区域选择 / 撤销重做 / 主从详情见下方 Pro 能力（第二批）。

### 验收标准

- 单测：透视聚合/合计、公式优先级与安全边界、查询嵌套/算子、TSV 转义。
- `perf:size` 新增 advanced / format / view 链预算；docs zh/en 示例与 API 说明；无 table 运行时依赖（纯函数/能力入口）。

### Pro 能力（第一批）

- **`table/format` 条件格式**：`compileConditionalFormat` 规则引擎（字段/单元格值/`when` 公式、`applyTo: 'cell' | 'row'`、首命中）；`setConditionalFormat()` 写入宿主 capability options，装饰链按 `decorateOrder` 与 edit 共存；规则变化重渲染。
- **`table/view` 视图状态**：`captureViewState()` / `applyViewState()`，覆盖列显隐/顺序/宽度、排序、过滤、分页、分组、展开、吸顶/表头/尺寸；只保存结构态，不含选中与编辑草稿。
- 两者均为独立子路径，默认 table 链不加载；`perf:size` 立独立预算并断言默认链零泄漏。
- 验收：单测条件匹配/样式应用/与 edit 共存/视图往返；docs demo 可点击应用与恢复；暗色/console/a11y 通过。

### Pro 能力（第二批）

- **`table/range` 区域选择 + 剪贴板**：点击/拖拽选区、方向键移动、`Shift+方向键` 扩展、`Esc` 清空、`Ctrl/Cmd+C` 复制 TSV、`Ctrl/Cmd+V` 派发 `oas-range-paste`（宿主写回数据）；选区以**行键 + 列 key** 锚定，排序/过滤/重渲染后跟随原行，windowed 窗口外仅不装饰（逻辑选区保留并支持跨窗口扩展）；roving tabindex（仅焦点格可 Tab 进入）；事件 `oas-range-change` / `oas-range-copy` / `oas-range-paste`。
- **`table/history` 撤销/重做**：`enableHistory()` 记录非受控 `oas-edit`（新增 `detail.oldValue` / `oldRawValue`），按行键定位数据行（含树形子行；行键字段本身被编辑时按另一侧值唯一定位），撤销保留 number / boolean / string[] 原类型；`Ctrl/Cmd+Z` / `Shift+Z` / `Y`（输入框内让位）；`edit-controlled` 与 windowed 不自动记录；`oas-history-change`。
- **`table/detail` 主从详情**：`createMasterDetail()` 宿主侧胶水，点击行（checkable 表用 `oas-cell-click` 补齐）/`Enter` 打开、`Esc` 关闭并回焦；选中行 `tr[data-detail-selected]` 高亮；`data` 变化按行键刷新详情，行从数据中消失才清空（滚出渲染窗口不清空）；面板内容由 helper 管理。
- **advanced 增补**：`createHistory()` 通用撤销栈、`createWindowedSource()` windowed 数据源助手（覆盖区间去重、中止过期请求、`refresh` / `destroy`、`oas-window-error`）。
- 四个入口均为独立子路径，默认 table 链不加载；`perf:size` 立独立预算并断言默认链零泄漏。
- 验收：单测覆盖键锚定/键盘扩展/复制粘贴/窗口失效/撤销边界/详情刷新；docs Pro demo 真点、暗色、console 零告警、a11y 通过。

### Pro 能力（第三批：组件侧闭环）

- **range 剪贴板闭环**：`copyRange` 支持表头；`cutRange`（复制+清空全部多选区的已渲染格）；`applyRangePaste` 从活动选区左上角写回 TSV（可 coerce/skipEmpty）；`edit-controlled` 只发 `oas-range-write`（含 kind=paste/cut/fill 与新旧值明细），由宿主写回。
- **选区 API 与多选区**：`selectByKey` / `selectRow` / `selectColumn` / Ctrl+A；Ctrl 追加矩形且同矩形去重，`getRangeSelections`，旧 `getRangeSelection` 仍返回活动选区。公开 `row` 统一为 `data-row-index` 展示集行号（windowed 为全量绝对行号），与 `oas-cell-click` / `oas-edit` 一致。
- **键盘与窗口**：Home/End/PageUp/PageDown；Shift+方向键到边界时本地虚拟滚动或 windowed `oas-window-request`（带 margin + 滚动到目标行），pending 目标行补齐后落地选区与焦点；已装载未渲染行无需等待新 data。windowed 与本地虚拟滚动均保留离窗锚点；非 windowed 直接读表格展示集快照（行键 → 数据行序 / 扁平滚动序），纯单元格编辑不误清选区，分组折叠与重排按行键重定位，分组头/展开内容不混入滚动坐标。
- **填充柄**：focus 格手柄拖拽复制/序列（按方向记录格数，四方向），`fillRange` API；无位移与 `pointercancel` 不写入，取消恢复源选区，源行缺失不写空串；与 paste/cut 共用 `oas-range-write`。
- **性能与可访问性**：选区与填充 pointermove 均 rAF 合帧、行列索引缓存、批量写回一次行路径索引、`aria-live` 选区播报（`table.rangeSelection` 全语言包）。
- **history 受控与事务**：`recordHistory`（任意 `HistoryEntry`）、`withHistoryBatch`（合并为单条撤销）；`enableHistory` 监听 `oas-range-write` 并合并为一条事务（原类型同值不入栈）；`options.windowed` 允许当前切片内撤销；`options.rangeWrites` 可关。
- **view 持久化适配器**：`saveViewState` / `loadViewState`（宿主注入 adapter、可自定义 key、schemaVersion=1、坏数据/版本不兼容忽略）；恢复为完整快照，缺省字段清旧状态；保存只要求 `setItem`，不内置 UI。
- **detail 收尾**：`selectByKey`（含树形子行）、`close()` / `onClose`、多实例 Esc 只关最近激活实例（关闭/销毁后回退到仍选中的上一个实例）、windowed 换窗保留选中、`closeOnEscape` 可关、destroy 幂等且方法销毁后 no-op。
- 全部仍为独立子路径，默认 table 链不加载；预算与零泄漏断言同步。
- 验收：各包单测 + range 交互 e2e（粘贴写回/填充/多选区/键盘窗口/暗色/console/a11y）通过；不新增 Pro 产品 UI。

## v2.6.4：table 默认入口切换 ✅

### 功能定义

`@oas-ui/ui/data/table` 从「基础表格 + 编辑」改为**基础表格**；编辑能力改为显式 `@oas-ui/ui/data/table/edit`。`@oas-ui/ui/data/table/core` 保留为 deprecated 别名，v2.6.5 删除。Pro 能力（format/view/range/history/detail）继续按 L3 子路径规划，默认不加载。

### 详细需求

- `table` 默认入口不 import edit，`editable` / `actions` 未补 edit 时静默失效 + dev 告警。
- `table/edit` 保持 import 即注册；与 `table` / `table/core` 组合可用（core 为别名）。
- `@oas-ui/ui` 全量入口、CDN 数据族仍显式包含 edit，行为不变。
- `table/core` 为 `table` 的 re-export，JSDoc `@deprecated`，文档标注 v2.6.5 移除。
- 默认入口 budget 按纯核实测重定档；移除 table/core 独立预算与 core<main 断言。

### 非目标

不新增 Pro 能力 UI；不改 `oas-table` 公开属性/事件；不改变全量入口能力集合。

### 验收标准

- entry/core-entry 测试：默认入口无 edit；显式 edit 后编辑可用；core alias 与默认入口同一构造器。
- perf：table 默认链实测 66.3 KB；`table` 链不包含 edit/Pro；全量入口仍含 edit。
- docs zh/en、architecture、ROADMAP、CHANGELOG 同步；`api:check`/`llms:check` 通过。

### 发布验收（2026-10-26）

- 全量单测 **11190 passed**；全量 e2e **3828 passed / 46 skipped**（Chromium 全量 + Firefox/WebKit 抽样；1 条 Firefox scroll-area 用例首次失败，单独复跑通过）。
- `typecheck` / `build` / `api:check` / `stats:check` / `llms:check` / `skill:check` / `deprecations:check` / `ssr:check` / `perf:size` / `format:check` / trace 通过；`perf:bench` 在同一 dist、较大堆复核下全部预算通过。默认 happy-dom 在本机存在 GC 尾延迟，未改预算或基线。

## v2.6.5：移除 table/core ✅

删除 `@oas-ui/ui/data/table/core` 与相关文档/预算/测试；迁移路径统一为 `@oas-ui/ui/data/table`（需要编辑时补 `table/edit`）。

- **SemVer 单点例外（用户批准）**：别名删除落在 minor 而非 major——它是默认入口的等价别名（re-export 同一构造器，非独立 API 面），v2.6.4 已随默认入口语义切换预告移除。例外登记于 `docs/deprecations.json` DEP-EXPORT-0001（`minorException`，必填批准方与理由），`deprecations:check` 仅对 `package-export` 面放行「经批准的非 major 提升」（同 major 且严格高于当前版本的合法 x.y.z，兼容 patch 与 minor 提升），组件 API 面的 minor 移除仍一律拒绝。
- 防回归：`core-removed.test.ts`（src 层）+ `perf:size` 已移除入口零残留门禁（dist 层）；checker 正反用例在 `scripts/api-docs/deprecations.test.mjs`。
- 验收：table 单测全绿；`deprecations:check` / `exports:check` / `typecheck` / `build` / `api:check` / `llms:check` / `perf:size` 通过；全量 e2e 通过。历史 v2.6.4 段与 CHANGELOG 已发布段不改写。

## v2.6.3：date-picker 范围手输 + sidebar 行内容渲染 + barcode 扩展 ✅

### 功能定义

补齐两个已有组件的实际使用缺口：日期范围可直接键入，侧栏菜单行可承载双行等富内容；均为增量能力，不新增组件、不改变既有 value/attribute 契约。

### 详细需求

- **`oas-date-picker` 范围手输**：`daterange` / `datetimerange` / `monthrange` / `yearrange` 触发器开放键入，按 `separator`（默认 `~`）拆分起止；`datetimerange` 只键入日期时按 `default-time` 补齐；起止倒置、越界、禁用日期、非法输入回退当前值且不提交。`multiple` 保持只读回显。
- **`oas-sidebar` 行内容**：新增 `renderLabel` property 函数通道 `(item) => Node | string | null`；Node 直接挂载到 label 区，字符串按纯文本渲染，null/undefined 回退 `item.label`。函数不写 attribute/不参与 SSR；可访问名称仍取 `item.label`，折叠态随文字区隐藏；行内交互统一走 `actions`。
- **`oas-barcode` 扩展码制**：新增 GS1-128（首部 FNC1、`|` 字段分隔、括号仅分组）、UPC-E（6/7/8 位，按末位规则展开并计算校验位）、Codabar（A–D 起止符）与 MSI（纯数字、起始 110 + 12 位/数字 + 停止 1001）；`format` 新增 `gs1-128` / `upce` / `codabar` / `msi`，非法值继续回退 `code128`。

### 验收标准

- 单测覆盖：范围四种类型的合法/倒置/越界/自定义 separator/default-time；sidebar 的 Node/字符串/null/先于连接赋值/aria-label；barcode 四种新码制的合法/非法/校验位与 run 不变量。
- e2e 覆盖真实键入、demo 富内容渲染与十码制切换；a11y（light/dark）无新增严重违规；`pnpm test` / `typecheck` / `build` / `api:check` / `stats:check` / `llms:check` 全绿。

---

## v0.1.0 工程骨架 ✅ 起点

### 功能定义

让"一个组件从代码到 npm 产物"的完整链路跑通，作为后续所有组件的地基。

### 详细需求

- pnpm monorepo：`packages/core` `packages/theme` `packages/icons` `packages/ui` `packages/docs` + 根 workspace
- 构建：Vite library mode，ESM 产物 + `tsc --emitDeclarationOnly` 生成 `.d.ts`，`sideEffects: false`
- 测试：Vitest（happy-dom）+ Playwright 基础配置（chromium + axe-core）
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
- **icon**：SVG 源目录脚本生成，按名称按需导出，支持 `name/size/color`，tree-shakable ✅（**47 个原创线性图标**，`@oas-ui/icons` 独立包）。**内置集边界**：只做「组件自用 + 常用 UI」的最小集，不做通用图标库（依据与三条扩展通路见 `ui-spec` §2.4）
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

- **白名单全量覆盖**：123/124 tag 可 SSR（仅 theme-editor 工具组件排除 + 5 个命令式组件 message/notification/toast/snackbar/loading-bar 按"无初始 DOM"定论客户端专属）——五批推进：表单 27 类 → 反馈 9 → 数据展示 28 → 导航布局 32 → 收尾 12，每组件均完成 template/bind/hydrate 拆分、数据组件 JSON attribute 通道、测量组件延迟写入。（**注：123/124 为 v1.9 时点数据**；白名单随后续版本持续扩充，**当前覆盖 161 个可注册 tag（全库 206）**——权威清单与边界见 `docs/ssr.md`，新增组件强制决策由对账守卫 `packages/ssr/src/whitelist-coverage.test.ts` 把关。）
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

- **basic 族增强**：button（variant 形态/color/wave/auto-insert-space/circle/icon-position/href/plain/target/autofocus/wrap）、button-group（pill/分隔符/嵌套组/拆分按钮）、icon（spin/rotate/flip/图标库注册/动画预设/duotone）、tag（预设色板/dot/processing/avatar 适配/hit/strong/multiline + oas-tag-group）、badge（standalone/color 全模式/offset/status/size/attention/corner/overlap/ribbon-form 十一形态 + flag/rolled/premium/ribbon-size/direction/vertical/anchor 体系）、space（separator/justify/reverse/size 数组/fill/响应式断点）+ **oas-compact**
- **floating 箭头**：tooltip/dropdown 统一 arrow（默认显示）/arrow-point-at-center/auto-adjust-overflow（popover 默认箭头即跟锚点，同名开关从未生效，2026-10 已移除死属性）
- **table 密度档位**：size small/medium/large（CSS 变量开口）
- **展示型组件字号继承**：A 类跟随外层/B 类组件级变量开口（11 组件）
- **官网首页 v2**：产品力展示方向（hero oas-table demo + 场景卡 + 代码速览 + 真实 perf 数据 + CTA），后迭代 H05 深色沉浸风格
- **六件深挖**：divider（variant 四线型/inset·middle 缩进/size 三档/strong/6 CSS 变量开口/vertical 在 flex·grid 撑满）、link（underline 三态 hover 默认/icon+icon-position/external 自动 target·rel/info 语义色/underline-offset·underline-color 变量开口）、typography（修饰六布尔 strong·mark·code·underline·delete·italic/tag 换标签/depth 三档/line-clamp/copy-text/ellipsis-suffix/actions 操作条）、kbd（variant 四形态 raised·outline·subtle·plain/size 三档/color 统一协议）、label（error 红字/disabled/colon/tooltip 组合演示/color/双击防选中）、visually-hidden（focusable 焦点显形，skip-link 场景）
- **code 深挖**：inline 行内代码（等宽浅底小框 + 高亮）/word-wrap 换行/trim 去首尾空白（默认 true）/size 四档（inline 语境）/variant 四形态（subtle·outline·plain·solid）/color 统一协议
- **无障碍体系**：对比度审计换自实现的感知对比度算法、-text 达标 token 体系（22 预设/语义文字变体，明暗各一套）、color 属性统一协议（11 预设名 + 任意 CSS 色值，ui-spec §4.1）、dark 中间调语义色达标（primary #9ecdff/danger #fbb2b2，粉彩亮化 + 深字，感知对比度达标）、a11y 扫描 22 页 + qa-regression 大幅扩充
- **API 表自动化**：api:scan（AST 级扫描）+ api:gen（manifest ∪ descriptions 并集生成）+ CI api:check 防漂移；35 条空描述补录
- **集成反馈批次**（真实项目 oas-md-ka 集成反馈，v2.1 收尾落地）：slider/input-number 受控写回宿主 value 属性（双向受控一致性）；modal 视口高度保护（max-height 90vh + body 滚动，小窗口关闭钮可达）；tabs 非激活项 hover 反馈（line/card 两模式）；间距刻度中间档（space-1_5/2_5/4_5 = 6/10/20px）；集成 FAQ 页 + 快速开始事件前缀专段（`oas-` 前缀设计动机与监听写法）。未纳入项（menubar shortcut 字段 / 多 radio 组 value 作用域 / 动作项 kind / 事件名无前缀属 breaking）待排期
- **收尾**：button demo 自定义色改 WCAG AA 达标值（#047857/#be185d，组件契约不变——自定义色按原值渲染，文档补对比度提醒）+ a11y 门禁转绿

### 验收标准（均已达成）

- 新组件与增强 demo 进文档站（中英双版），覆盖各属性/事件/边界
- 六件（divider/link/typography/kbd/label/visually-hidden）+ code 完成能力深挖并补齐缺口（basic 族 12/12 全清）
- 单测 2360 + typecheck + build + e2e 1283 全绿；perf:size 全过（theme 预算随 token 体系扩充上调 2→3KB）；perf:bench 复跑通过

### 详细需求

- **tag-group**：属性 value（单选单值 / 多选逗号分隔）、multiple（多选）、disabled（全组禁用）、aria-label（组容器可访问名称，默认走 i18n「标签组」）。事件：oas-change——单选 detail { value }、多选 detail { value: [] }。实现：slot 放 <oas-tag checkable value="x">，组在 capture 阶段拦截子签 oas-change 计算新 value 并同步所有子签 checked（子签事件不外泄，宿主只收到组级事件）；容器 role="group"+aria-label。边界：零子签渲染空组不报错；单选不可取消（点已选中项保持选中）；disabled 透传全组不可切。

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
- **tag→avatar 适配**：默认插槽放 oas-avatar/`<img>` 时尺寸随档位、圆形、负 margin 贴左缘
- **tag→hit/strong/multiline**：hit 全不透明语义色描边；strong 加粗（600）；multiline 多行换行（与 max-width 省略互斥时 multiline 优先）

### 增强（badge 第二轮）

- **badge→standalone 独立徽标**：默认插槽无内容时徽标从 absolute 贴右上角回落为静态行内展示（inline-flex 不塌陷，可独立放在文本流/菜单行）
- **badge→color 全模式**：count/dot/ribbon 统一支持 4 语义色（token + on-color 白字）、任意 CSS 色值、11 预设名（解析到 --oas-preset-* token）；实心文字色用 pickOnColor 按 WCAG 对比度在黑/白中择优；ribbon 保留现有语义色 class 逻辑兼容
- **badge→offset**：`offset="x,y"`（px 数字）叠加到 count/dot 角标右上角定位（现有 translate 基础上平移）；非法值静默忽略
- **badge→status 状态点**：`status="success|processing|default|error|warning"` 渲染「状态点 + text 文字」行内独立元素（非角标定位）；processing 圆点脉冲（prefers-reduced-motion 停用）；语义色映射 success→success / processing→primary / error→danger / warning→warning / default→text-secondary；与 ribbon/dot/count 互斥（status 优先）
- **badge→size**：`size="small"` 小尺寸档（count 高度 16→13px 左右、字号更小；dot 8→6px）
- **badge→attention 吸引动画**：`attention="pulse"`（外圈脉冲扩散，脉冲色走 `--oas-badge-pulse-color` 自定义属性、默认跟随徽章底色）/ `attention="bounce"`（轻微上下弹跳，幅度约 -25%）；仅作用于 count/dot/standalone 徽标（ribbon 不受影响）；`prefers-reduced-motion` 下停用
- **badge→corner 四角定位**：`corner="top-right|top-left|bottom-right|bottom-left"`（默认 top-right）定位 count/dot 角标；与 offset 关系：corner 快捷定角，offset 在 corner 结果上做屏幕坐标 px 精确微调（x 正向右、y 正向下，与 corner 朝向无关），先定角再平移可叠加；非法值静默回落 top-right
- **badge→overlap 圆形内收**：包裹圆形内容（如头像）时角标向圆内收进圆边（平移幅度 50%→约 29%，1-√2/2 几何内收）；仅影响角标模式
- **badge→ribbon-form 形态维度**：`ribbon-form="fold|diagonal|triangle|bookmark|side|seal|banner|flag|rounded|zigzag|arrow"`（默认 fold = 现行直条+折叠，向后兼容）。diagonal 45° 对角斜带跨顶角（宿主需 overflow:hidden 裁切，placement start/end 镜像 ±45°，文字随条旋转）；triangle 角落纯三角形 clip-path + 内嵌小图标（slot="ribbon" 内容）；bookmark 顶边垂挂竖条 + 底部燕尾 V 缺口；side 侧边竖挂（start 左/end 右镜像，折叠角在挂点）；seal 圆形锯齿印章（clip-path 锯齿多边形，文字居中）；banner 顶部横贯横幅（两端折角）；flag 侧燕尾横旗（外端贴卡片边线不探出，内端燕尾 V 缺口朝卡片内侧）；rounded 圆头端横条 / zigzag 锯齿端横条 / arrow 箭头端横条（端部造型装饰端均朝卡片内侧）。十一形态全为 clip-path/CSS 几何，与 placement/color 正交；非法值静默回落 fold
- **badge→premium 金属质感**：布尔 `premium` 金色金属渐变底（多段亮金→暗金）+ 深金细描边（clip-path 形态沿轮廓 drop-shadow 描边）+ 文字色固定深色（金底渐变不参与对比度择优）；与 ribbon-form 正交可叠加；优先级 premium > color > 语义色；dark 主题走 `--oas-preset-gold` token 自动适配
- **badge→ribbon-form flag（侧燕尾横旗）**：`ribbon-form="flag"` 横条、外端贴卡片边线不探出，内端燕尾 V 缺口朝卡片内侧（clip-path 多边形在内端切 V 口，placement start/end 镜像）；底部挂点内侧保留折叠角（复用 fold 的 corner 尖三角，因条身 clip-path 会把条外元素裁掉，折叠角置于条身 clip 区域内 bottom 内侧）
- **badge→rolled 端部卷边**：布尔 `rolled` 给卡片内侧端做卷边效果（内侧端大圆角 + 渐暗渐变模拟卷起圆柱，外端顶卡片边线不再探出；纯 CSS、原创）；独立开关，可叠加 fold / flag / rounded / zigzag / arrow（banner 保留自身双端折角不叠卷边；diagonal/triangle/bookmark/side/seal 静默忽略）
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

Tabs 组件按能力清单全量补齐 + 首页页脚打磨：

- **Tabs 能力全量补齐**（能力补齐）：disabled 禁用、size 五档、centered/justified 布局、溢出滚动+箭头（`without-scroll-controls` 可关）、more 溢出（滚动+视口外镜像下拉，含搜索过滤+点选平滑滚动到可见）、panel-mode（keep/lazy/destroy 面板显隐策略）、activation（auto/manual 手动激活）、animated 动画、oas-before-change 切换前拦截（cancelable veto）、editable 双击重命名（失焦保存）、sortable 拖拽换位、嵌套 tabs（:scope 直接子面板）、slot=label 自定义标签
- **Tabs 二次补缺**：滚轮横向滑动、新增/激活标签自动滚到可见、+ 按钮固定标签栏末尾、more 下拉搜索+选中定位；editable 打磨（真实双击、失焦保存、宽高贴合、几何对齐）；more 重构为通用机制（滚动+视口外镜像）
- **Tabs 能力复核补齐**：trigger:hover、allow-deactivation、stacked、icon-only、指示线 CSS 变量+hide-indicator、reserve-selected-space 选中防抖、tab 即链接（href/target/rel）、hide-content 纯导航、items 数据驱动、scroll-position 滚动定位、PageUp/PageDown 键盘溢出滚动、add/close 图标 slot
- **下划线渲染修复**：激活下划线在溢出滚动容器下被裁剪/叠加/亚像素伪影 → 改用 ::after 伪元素（独立 2px 盒子，渲染精确、不被裁剪），card 模式保持边框连通不叠加
- **首页页脚**：页脚品牌位改真实 logo 图标（favicon.svg/dark 用 favicon-dark.svg，与导航栏一致）+ 消除底部 128px 空白（vitepress .VPHome 默认 margin 残留）+ 版权行底部间距 56px→32px
- **验收**：tabs 单测 107（全量 2452）、typecheck/build/api:check 全绿、e2e chromium 935 + firefox 抽样 348 全绿、对比度审计 0 违规、console 零告警；浏览器实测各能力正常渲染可交互

## v2.1.4 basic 组件复核补齐发布（已完成）

basic 族 12 组件按能力补齐复核后的增量能力补齐 + divider 垂直方向能力完善：

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
- **验收**：各组件单测全过（button 58/tag 70/badge 120/button-group 28/typography+ellipsis 24/link+divider 89/kbd 25/label 38）、全量 2599、typecheck/build/api:check 全绿、e2e chromium 935 + firefox 348、对比度审计 0 违规、console 零告警；浏览器复核关键交互（loading 保宽、disabled-focusable、badge 描边、tag 选中√、divider 垂直对齐/竖排/缩进）

## v2.1.5 menu/dropdown/contextmenu 能力补齐发布（已完成）

floating 导航族三组件按能力补齐补齐 + 水平收纳/inline 形态多轮实测修复：

- **menu**：`kind="checkbox"` 多选项、`danger` 危险项、`href/target/rel` 链接项、`max-height` 长菜单滚动、typeahead 字符定位、`mode="inline"` 就地展开（高度过渡+箭头旋转）、`expanded` 受控 + `oas-expand-change`、`accordion` 手风琴同级互斥、horizontal 溢出收纳「···」（ResizeObserver + 镜像弹层 + i18n）、`close-on-select` 选中收起策略（缺省分形态/显式覆盖/checkbox 豁免）、「···」弹层选中反馈（镜像 ✓ + child-selected 高亮）
- **dropdown**：`trigger` click/hover/focus 多选、`hover-delay`/`hover-hide-delay` 防抖、`placement` 12 向、`oas-open-change`、整体 `disabled`、`hide-on-click`、开合动画（transform-origin 感知方向）、`close-on-scroll`、`offset`
- **contextmenu**：`long-press-delay` 长按触发、`show(x,y)`/`close()` 编程式、受控 `open` + `oas-open-change`、右键别处关闭、`close-on-scroll`
- **实测修复**（用户视角验证门禁驱动）：inline hover/click 抵消展不开、inline-sub flex 并排、inline-sub role 嵌套 axe 违规、水平浮层 overflow 裁剪不可见、「···」收纳项自身被收、「···」弹层右缘截断+颜色继承、inline 选中/移出误收起
- **验收**：menu 64 + dropdown 52 + contextmenu 21 单测（全量 2673）、typecheck/build/api:check 全绿、e2e chromium 937 + firefox 350、axe 零严重违规、console 零告警；浏览器实测 light/dark 全交互链（inline 展开/手风琴互斥/受控展开/水平收纳弹层选中反馈/close-on-select 对照/dropdown hover 面板/contextmenu 各触发）

## v2.2.2 v2.2.2 导航与浮层族 11 组件能力补齐

tooltip/popover/hover-card/breadcrumb/anchor/back-top/tour/command/menubar/navigation-menu/toolbar 按能力清单全量补齐（唯一豁免：command 内置模糊搜索并入未来打包勾选特性）：

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

- **验收**：全量单测 3280 / typecheck / build / api:scan+gen / e2e chromium 全量 969 + firefox 抽样（ssr-dsd 真水合 38px 漂移修复后全绿）/ perf:size 六项 PASS（cdn 245.5KB < 300KB 天花板）/ trace 门禁 0 命中 / dev 浏览器实测 40+ 截图 light+dark console 零告警 / 对比度审计通过
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
- **验证**：全量单测 3280 / e2e chromium 969 / 对比度审计通过 / 截图识图 light+dark 全过

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

- **能力**：`hide-toggle`（折叠按钮 opt-out；此时 header 槽为空则头部塌陷，移动抽屉打开态保留）、`accordion` 手风琴同级互斥（menu 同语义）、嵌套子树平滑动画（grid 0fr/1fr 过渡 + visibility 联动 + reduced-motion 降级）、嵌套机制无限级（3 级实证，文档建议 ≤3 级）、图标通道打通 registerIcon 正路（lookupIcon 单一查表点导出）+ `iconColor` 项级着色、`--oas-sidebar-bg` 背景开口（var 链回落）、child-selected 激活后代指示
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

table 组件按能力补齐补齐（列设置/多列排序/多级表头/内置分页/列过滤/合并单元格/子元素声明式通道/单元格模板/自定义列头/编辑校验），core 增 ReactiveController 注入协议。

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
- 对比度审计：文字/背景可读性按感知对比度算法逐节点检查，0 不达标（theme-editor/config-provider/app 三页纳入审计清单）
- 浏览器实测 light+dark：variant 注入切换/RTL/z-index 层序 6080=5000+1080/message 全局时长/禁用双侧豁免/theme-editor 五件/modal 命令式全通；console 零告警
- research 同步：capabilities/floating 三件（29 源全量逐家实查）+ component-matrix 三行更正 + scenario-matrix Confirm 三缺口转 ✅ + run-all 生成物

## v2.3.1 table 可编辑单元格可感知线索 → 已发布

### 特性

- **table 可编辑单元格可感知线索**：此前只有 tabIndex + Enter/F2/双击三个不可见交互，用户无途径得知可编辑。新增 hover/focus-visible 淡底色（`--oas-color-bg-hover`）+ `cursor: text`（sticky 列不透明变体不透底、条纹/选中叠加有序、编辑中不适用）；铅笔编辑图标 hover 显现（复用库内 editPath，平时干净，编辑退出重挂）；`title` 双击提示（zh/en 本地化）。保持双击进入（单击会废掉文本选中复制）

### 验收

- 全量单测 3682 / typecheck / build / api:check PASS
- 全量 e2e 1382 PASS（含 qa-regression 真实 hover 断言：computed 底色变化 + cursor + 图标 opacity 0→1）
- 浏览器实测明暗主题 hover 铅笔可见；console 零告警

## v2.3.2 导航组七组件深挖收口 + oas-stepper 新组件 ✅

### 功能定义

步骤驱动的分步内容面板——头部步骤条（可点击跳步）+ 联动内容面板（仅当前步显示），向导 / 表单分步 / 结账流程场景。双组件同构 `oas-tabs` / `oas-tab-panel` 的 value 关联模式：`oas-stepper` 管步骤头、`oas-stepper-panel` 管内容、value 关联显示。

### 详细需求

- **oas-stepper**（步骤头）：属性 `steps`（JSON 数组 `{title, description?, icon?, disabled?, status?}`，语义对齐 `oas-steps` 的 StepItem 减去面板无关项）、`current`（双向）、`linear`（布尔，禁跳未完成步）、`clickable`（默认 true）、`direction`（horizontal/vertical，默认 horizontal）、`size`（五档 xs~xl，非法值回落 medium + dev 告警）
- **oas-stepper-panel**（内容面板）：属性 `value`（关联步骤序号字符串，如 `value="0"`）；仅 current 匹配的 panel 可见；面板内容走默认插槽
- **事件**：`oas-change` detail `{ index }`（可点击跳步时，bubbles + composed）；prev/next 不内置（宿主用按钮设 current，demo 演示）
- **键盘/ARIA**：头部 `role=tablist` + 每 tab `role=tab` + `aria-selected` + `aria-disabled`（disabled 步）；roving tabindex 左右方向键（横向）/ 上下（纵向）+ Home/End；Enter/Space 激活跳步（linear 时未完成步禁跳）；面板 `role=tabpanel` + `aria-labelledby` 关联
- **SSR**：`template()`/`hydrate()` 双路径（对齐全库惯例）；DSD 白名单暂不进（后续批次）

### 验收标准

1. 双组件 demo 进文档站（中英双版），覆盖基础 / 线性禁跳 / 竖向 / 面板联动 / 自定义步骤内容插槽
2. 单测全覆盖：渲染 / current 双向 / linear 禁跳 / disabled / 键盘 roving+Home/End+Enter / panel 可见性切换 value 关联 / 方向键纵向 / direction vertical / 非法值回落 / DSD 水合双路径
3. current 双向：点击跳步写回 current、外部设 current 即时同步 `aria-selected` 与面板显隐
4. 键盘流：横向左右 / 纵向上下 / Home/End / Enter/Space，禁步跳过、linear 禁跳
5. 颜色只走 token（含 dark）、无硬编码色值；`pnpm test` / typecheck / build / api:check 全绿
6. `oas-change` 事件 bubbles + composed，detail 结构 `{ index }`

### 导航组七组件深挖（同版本收口）

- **oas-steps**：prefix 自定义编号、max-count 中段折叠、reverse 倒序（连接线随 flex 反向延伸）、content-placement 右置、arrow 箭头分格形态（间距/角度/逐块颜色 CSS 变量开口与互嵌重叠修复）、lineless、separator 三形态、simple 紧凑、percent 圆环、responsive 窄屏转竖向、容器 status 覆盖、StepItem id/extra/disabled、oas-before-change 拦截
- **oas-pagination**：disabled、size 五档、simple、show-edges 首尾钮、hide-on-single、prev/next-icon 插槽、total 插槽、pager-count 上限、省略号可点跳页、href-template 链接模式、responsive 窄屏切 simple、page-item 占位符插槽、show-more 总数未知形态、total-boundary 切换器阈值、oas-before-change；当前页 hover 修复
- **oas-affix**：position bottom、append-to 传送、oas-change 事件（placeholder 占位重构）
- **oas-float-button**：shape/type/size 五档/extended 文字胶囊/disabled/href 链接、draggable+magnetic 拖拽磁吸、定位变量开口、tooltip 组合 demo
- **oas-speed-dial**：trigger hover、主钮图标插槽、oas-open reason、hide-label icon-only+悬浮气泡、geometry 圆弧几何（circle/semi/quarter+radius）
- **oas-bottom-navigation**：item badge、safe-area、show-label icon-only、layout 横排、hide-on-scroll 滚动收起、shift 动效、颜色/高度变量开口
- **oas-page-header**：content/footer/breadcrumb/back-icon/title/subtitle/avatar 插槽、ghost 变体、responsive 紧凑
- 全部能力点走六项收口（实现/单测/demo/API/e2e/浏览器实测+识图）

## v2.4.0 源码目录统一 + 族包 + title 双轨 + 15 组件能力增强 ✅

### Breaking（含迁移说明）

- **源码目录统一到文档站语义七组**（目录=语义组单一权威）：floating 拆空（8 件→navigation、3 件→feedback、scroll-area→layout、框架三件→framework）；layout 6 件→navigation、segmented→form；data 2 件→layout。**ESM 旧路径直接 breaking 不保留别名**（`@oas-ui/ui/floating/menu` → `@oas-ui/ui/navigation/menu` 等 24 组件，import 路径机械替换；unpkg 深链 `dist/floating/*` 同步失效）。exports 收敛至四键（`.`/`./ssr`/`./cdn/*`/`./*`）

### 特性

- **15 组件能力增强**：alert/notification/message/toast/drawer/snackbar/popconfirm/backdrop/spin/loading-bar/popover(25 项）/tooltip/modal（三期：prompt 全套+dialog 核心+开关动画等二期）/color-picker（两期：碰撞翻转+alpha/宽容解析 与 2D 色域+gradient）
- **CDN 族包多入口**：七族 IIFE 产物 `dist/cdn/<族>.js`（族包自包含：基座内联运行时+框架级三件）+ cdn.js 全量保留；≤2 族引族包、≥3 族引全量
- **title 双轨**：title 吸收（14 组件，读取渲染后从宿主移除原生 title 消除悬浮 tooltip）+ `slot="title"` 富内容通道（属性简单通道 + slot 富通道）；ui-spec 沉淀原生全局属性吸收约定
- **qa-regression 拆 55 spec + E2E_PORT 覆盖**：巨石串行 8.6m→文件级并行；多 worktree 并行开发端口互抢根治

### 修复

- **demo-coverage/qa-regression 欠账清零（33→0）**：popconfirm 打开焦点从未生效（update 顺序 bug）+ demo-coverage wait 步从未执行（历史约定不一致）
- color-picker placement API 描述补录 + 12 向单测 + 底部上弹回归
- drawer 四向 placement 面板停屏外、message 图标首行对齐、modal no-footer 底角直角

### 验收

- 全量单测 4970 / typecheck 0 / build / api:check / trace 0 命中
- 全量 e2e 1612 全过（chromium 全量 + firefox 抽样 + docs-site）

## v2.4.1 能力子包（L3）+ 反馈/基础/布局组能力收尾 ✅

### 特性

- **组件内能力子包（按需打包第三层）**：table/edit、tabs/manager、modal/prompt、popover/contextmenu、color-picker/designer 五个能力子包（import 即注册、顺序随意）；全量入口与 CDN 族包内含无感知；getting-started 补对照表（中英）
- **能力注册表晚加入订阅**：connected 期订阅 + 断开退订 + 幂等注入，时序竞态（入口求值顺序/打包器重排/反向引入/动态 import）全部自愈
- **能力收尾批**：progress 14 项能力补齐；skeleton 重构（loading 受控+真实内容出口/三档动效/count/widths/delay）+ 新子组件 oas-skeleton-item；empty 七项；result（403/404/500 + 状态图标真 SVG 化等六项）；tag icon-end；grid columns 断点简写 + min-child-width；FAQ 组合模式章节

### 修复

- table 行内编辑真实双击不生效（行选中重建致 dblclick 不派发，改 click 委托 + 手工双击判定）+ 进/出编辑列宽行高跳变（占位保布局贡献 + 编辑器绝对定位 + 操作列同槽叠放）
- table 表头吸顶失效（th[data-key] relative 覆盖 sticky 致非固定列表头滚走）+ 声明式通道 Vue 宿主全空（key 保留字劫持，改 key ?? data-key 双通道）+ cellTemplate demo 模板被编译管线吃空（改 property 通道）+ 多级表头竖线语言归一（非 bordered 零竖线）
- progress SSR 空属性噪声；dev 全新环境 predev 拓扑序

### 验收

- 全量单测 5142 / typecheck 0 / build / api:check / trace 0 命中
- 全量 e2e 1616 全过（chromium 全量 + firefox 抽样 + docs-site）

## v2.5.0 数据组+表单组能力收口 + prefix 冲突根治 ✅

### 特性

- **表单组**：date-picker 全形态补齐（quarter/datetimerange/monthrange/yearrange/week）+ dynamic-tags 编辑/validate + editable icon/dblclick 触发 + calendar 键盘扩展（Home/End/PgUp/PgDn）+ decade 快速跳年 + min/max 翻页边界 + readonly/disabled；mentions 全量（trigger 多触发符/oas-search/loading/富选项/disabled 选项/status/size/readonly/variant/clearable/split/autosize/过滤自定义/IME 守卫/中文紧贴触发/整段删除 whole/type=input 单行）
- **数据组**：tree 节点重命名 + motion 过渡；list 分组吸顶 + 行交互；virtual-list 动态行高（HeightCache + RO 实测 + scrollTop 补偿）；watermark 转 canvas 引擎 + grayscale 灰阶 + fullscreen 全屏 + tile 自适应 + 空容器兜底；log 搜索过滤；gradient-text 描边；carousel 卡片模式 + 显式暂停钮；countdown 正计时；ellipsis 多行省略 + suffix 保留 + 点文本展开；card selectable 可选中卡；image-group 图集容器（新组件）+ image 自定义工具栏
- **prefix/suffix → prefix-text/suffix-text 改名**（DOM 内建只读 prefix 与 Vue property 赋值冲突根治；纯 HTML 遗留别名保留；mentions 触发符 prefix → trigger）

### 修复

- list 选中行 hover 文字不可读（clickable hover 浅灰压盖选中蓝底）；watermark 空容器 flex 宿主塌缩不可见；image trapFocus Tab 逃逸（焦点环绕不命中）；select 字段映射 demo 时序（whenDefined 守卫）

### 验收

- 全量单测 6731 / typecheck 0 / build 0 / api:check（WIP 0）/ trace 0 命中 / perf:size 全 PASS（预算重定档）/ perf:bench 全 PASS
- 全量 e2e（chromium 全量 + firefox 抽样）；各新能力 demo light/dark 截图复核 + 真实交互验证 + console 零告警

## v2.5.0 L3 子路径语义修正 + 可选工具包 @oas-ui/react（不单独发布）

### L3 子路径语义修正（回归根治）

**背景**：v2.4.1 把 tabs/table/modal/color-picker/popover 的重型能力拆成 L3 能力包后，组件子路径入口变成 core-only（如 `@oas-ui/ui/navigation/tabs` 不再含 manager 能力）。既有子路径消费者在 2.4.1 升级后能力静默失效（dev 告警一次、生产无声）——真实回归。

**方案（语义翻转）**：

- **子路径入口默认带能力**：五个组件的主路径 `index.ts` 顶部内置能力 import，恢复 2.4.0 的「同一组件任何主路径引入行为一致」语义——`@oas-ui/ui/data/table` 即含行内编辑、`@oas-ui/ui/navigation/tabs` 即含 manager、`@oas-ui/ui/feedback/modal` 即含 prompt、`@oas-ui/ui/form/color-picker` 即含 designer、`@oas-ui/ui/feedback/popover` 即含 contextmenu
- **新增 `/core` 纯核路径**：五个组件各新建 `core/index.ts`（= 原 core-only 入口），显式 opt-in 才走纯核瘦身；exports 通配 `"./*": "./dist/*/index.js"` + preserveModules，`@oas-ui/ui/<组>/<组件>/core` 自动可解析，无需改 package.json
- **dev 告警文案更新**：五处 hint 由「请按需 import 能力包」改为「主路径已内含该能力；仅 /core 纯核路径需显式 import 能力包或换回主路径」
- **全量入口 / CDN 族包 / 能力晚加入订阅**均不变（注册表同名幂等）

**迁移说明**：2.4.1 期间显式 `import '@oas-ui/ui/<...>/<能力包>'` 的消费者无需改动（幂等冗余）；只 import 子路径入口的消费者升级后自动恢复能力。要用纯核瘦身的消费者从主路径改到 `<组件>/core` 并自行按需补引能力包。

**验收**：五组件各新增入口语义测试对（主路径 `entry.test.ts` 断言能力已激活 / `core-entry.test.ts` 断言纯核静默失效 + 告警一次）；既有 capability/latejoin 测试改引 `core` 后不回归；五组件目录 vitest 全绿 + typecheck 通过。

### 可选工具包 @oas-ui/react（不单独发布）

**决策（2026-09-09）**：不作为独立交付物单独发布，降级为仓库内可选工具包。

- **依据**：实测证实 React 19 原生支持「`on` + 全小写字面量」写法（`<oas-button onoas-submit={...}>` 即收到 `oas-submit`），多数场景零依赖即可；桥接仅解决三类场景——React 惯例 camelCase（`onOasSubmit`）静默失效、小写横线属性名对 TS 类型不友好、React 17/18 不兼容
- **定位**：包保留（`packages/react`：`useOasEvent` / `useOasEvents` + 8 单测 + README），供上述场景按需使用；**不随版本发布、不写入发布清单**（`packages/react/package.json` 已置 `private: true`，`pnpm -r publish` 自动跳过）
- **文档**：getting-started 主推 React 19 原生 `onoas-*` 写法，桥接 hooks 作为可选替代说明

#### 工具包规格（非发布门槛）

- **包结构**照 `packages/next` 约定：`exports` map / `types` 指向 / `sideEffects: false` / `files` / `publishConfig` / `tsc -p tsconfig.build.json` 产物含 d.ts；LICENSE 双许可文件随包
- **`useOasEvent<T>(ref, type, handler)`**：单事件绑定。handler 每次渲染写入 ref（最新化，事件触发走最新闭包、旧闭包不泄漏）；绑定 effect 仅依赖 `[ref, type]`，换 handler 不重复解绑/重绑；卸载自动清理监听
- **`useOasEvents(ref, handlers)`**：多事件批量绑定。单个 useEffect 统一绑定/解绑；handlers 引用每渲染变化不重绑（ref 最新化）；事件名集合变化（增删 key）才重绑
- **类型**：`OasEventHandler<T> = (detail: T, ev: Event) => void`（detail 泛型，默认 `unknown`）、`OasEventHandlers = Record<string, OasEventHandler>`
- **依赖边界**：peerDependencies `react >= 18`；运行时零第三方依赖；devDependencies react/react-dom/@types 仅测试与类型用
- **测试**：vitest + happy-dom，用 react-dom/client 渲染宿主组件断言行为
- **文档**：README 中英双语（照 next/nuxt 结构）；getting-started 补 React 事件小节（React 事件需桥接说明 + hook 用法）

#### 验收标准（包内自洽，非发布门槛）

- 8 单测全绿：detail 送达与泛型、重渲染后走最新 handler 且零重绑、事件名集合增删触发重绑/解绑、卸载后不再触发
- `pnpm --filter @oas-ui/react build` 产物含 `.d.ts`；`pnpm typecheck`（根）全绿
- React / Vue 对照在文档中写清（Vue `@oas-click` 语法可用 / React 19 原生 `onoas-*` 写法或可选 hooks）

---

## v2.5.0 数据组能力扩展三批（tree/list/timeline + collapse/descriptions/card/avatar/image + carousel/marquee/statistic/countdown/number-animation/qrcode/ellipsis/virtual-list）

### 破坏性变更（发布说明须逐项列出迁移指引）

1. **tree `expanded` / `checked`**：逗号分隔字符串 → **JSON 字符串数组**（key 含逗号时串解析错误的根治；与 tree-select 的 expanded/value 形态统一）
2. **timeline 节点色**：`color="green|red|gray"` → **`type` 语义色枚举**（green→success、red→danger、gray→neutral；旧三值当版本兼容映射、按计划移除）
3. **descriptions 默认布局**：恒 vertical → **`layout` 默认 horizontal**（详情页主流默认；`layout="vertical"` 显式保留）
4. **marquee `speed`**：单次循环时长（秒）→ **真实速度（像素/秒）**（默认 48；时长=内容宽÷速度由组件测量推导，速度跨内容/容器恒定）
5. **qrcode 前景色**：默认 `currentColor` → **固定深色 `#18181b`**（与固定白静区配套，dark 主题可扫；`--oas-qrcode-color` / 属性覆盖）

### 能力摘要（按组件）

- **tree**：勾选级联（half/check-strictly/check-strategy 三策略）/搜索过滤（filter+filterNode+filter-highlight）/键盘 roving 全操作/拖拽（allowDrag/allowDrop 守卫）/tree-lines/accordion/expand-trigger/auto-expand-parent/default-expand-all/懒加载失败重试（oas-load-error）/目录模式/多选/虚拟滚动/空态；**共享树内核**（`data/tree/shared/`：fields/model/check/lazy/template 纯函数）与 tree-select 共同消费（净减 357 行）
- **list**：data 双通道 + template[slot=item] 克隆 + oas-item-render 绑定/clickable/selected/内嵌虚拟滚动/max-height + 触底加载（oas-reach-bottom + bottom-offset + load-more 尾区）/loading/empty/split/stripe/size/Meta 结构化；分页/网格走组合 demo
- **timeline**：item 自包含行（克隆机制债根治）/type 语义色 + variant/任意色变量/mode+opposite 对侧/title 插槽/dot 自定义/pending/loading/reverse/横向/oas-click
- **collapse**：disabled/borderless/icon-placement/自定义 toggle 图标/header·extra 富标题（extra 点击解耦）/default-active/heading-level（APG）/键盘 roving/destroy-on-collapse/force-render/no-collapse 强锁 + oas-before-collapse 可取消/expandAll·collapseAll/grid-rows 纯 CSS 展开动画（reduced-motion 停用）
- **descriptions**：layout/bordered 网格表/span 跨列/colon/size 三档/slot=extra/slot=label；column 未设时不写内联变量（宿主媒体查询可响应降列）
- **card**：loading 骨架/size=small/variant=borderless/slot=footer/header-bordered/shadow 三态（hoverable 映射 hover）/Meta（slot=avatar + description 双通道）/href 链接卡/selectable 可选中卡（整卡点选切换选中，primary 描边 + 浅底 + 勾选角标，role=checkbox + aria-checked，受控/非受控双模式 + oas-change；多卡组宿主可挂 role=radio；loading 不可选、href 同设时点选优先不跳转）
- **avatar**：shape 三态/多字测量收缩字号（下限 + ellipsis 收口）/fallback 回退图/slot=icon/fit/color（对比色协议）/oas-error/size 枚举别名；avatar-group：spacing/overlap 变量 + ring 描边、+N hover 弹层（共享定位引擎）、slot=trigger 换头像入口
- **image**：preview-src-list 图集（翻页+键盘+页码+infinite）/preview-src/preview-open 受控 + oas-preview-change + openPreview()/oas-load·oas-error/slot=placeholder·error/flipX·flipY/拖拽平移+滚轮缩放/缩放 CSS 变量/预览浮层 portal teleport（修 transform 祖先内 fixed 失效）/slot=toolbar 自定义工具栏（克隆替换默认按钮组 + oas-toolbar-render 命令通道 element+actions：zoomIn/zoomOut/rotateLeft/rotateRight/flipX/flipY/download/close/prev/next，单图 prev/next no-op；oas-image-group 共享预览透传）
- **image-group**（新组件）：容器收集式图集——light DOM 收集组内 oas-image 子图（preview-src-list 展平 > preview-src > src），点击共享预览浮层（从被点图起开，prev/next 整组切换，复用 image 预览全部能力）；子图 preview 被容器接管；MutationObserver 动态增删同步；current 可选受控 + oas-change{current,prev}；role=group + locale 可访问名称
- **carousel**：indicators/indicator-position/indicator-type/effect=fade/next·prev·goTo 方法 + prevIndex/autoplay 悬停聚焦暂停 + 页面 hidden 停播（WCAG 2.2.2）/direction=vertical/slides-per-view+gap/拖拽切换（pointer 跟手+阈值+回弹）/loop/指示器 dot token 化 + slotchange 监听（机制债修复）
- **marquee**：ResizeObserver 测量 + auto-fill 不足一屏克隆填充（份数封顶）/fade-edges 边缘渐隐（mask-image）/orientation=vertical/reverse/内容更新相位保持（getAnimations 记相位 + 负 delay 恢复）
- **statistic**：title/extra 双通道/trend 涨跌（箭头 + token 涨跌色）/slot=value 组合动画
- **countdown**：SSS 毫秒 token/active 受控暂停/reset()/oas-change 节流/prefix·suffix·title 双通道
- **number-animation**：from 起始值/active 受控 + play()/easing 五档/group-separator（Intl 缓存）
- **qrcode**：纠错 L/M/Q/H 全实现（v1-40，修静默降级）/icon 中心 logo/color·bg-color·margin/status 状态机（expired/loading/scanned + oas-refresh + slot=status）/download() 离屏栅格化（SVG-only 渲染不变）
- **ellipsis**：expand-text/collapse-text/受控 expanded（内部 toggle 反射 + oas-expand/oas-collapse）/oas-overflow/tooltip-placement/行内展开形态（shadow 镜像二分截断）/多行 direction（middle/start 镜像测量截断，无布局环境兜底全显）/suffix 保留后缀（tail 方向预留后缀宽度）/expand-trigger="click" 点文本展开（role=button + Enter/Space，无按钮形态）/lines（rows 同义别名，lines 优先）
- **virtual-list**：scrollToIndex(index, {align, smooth}) 公共方法（start/center/end/auto）+ viewportFocusable property；tree 三处 shadow 内部耦合迁移到公共契约

### 验收标准（已达成）

- 单测 6490+ 全绿 / typecheck 0 / build 0 / api:check 通过（新属性全部进表 + 说明双版）
- demo-coverage 全组件静态属性演示 + 事件探针全绿；全量 e2e 绿
- 浏览器验证：各组件页 light/dark 截图 + 关键交互实点（级联勾选/懒加载重试/触底加载/折叠拦截/图集翻页/受控反射/组弹层/拖拽切换/二维码 dark 可扫）+ console 零告警

---

## v2.5.1 移动端专项（bottom-sheet 浮层协议 + 触摸/触屏适配）✅

### 特性

- **oas-bottom-sheet（新组件，feedback 族）**：移动端底部抽屉统一承载件——backdrop 点击关闭 / drag handle 下滑超阈值关闭 / Esc 关闭 / safe-area-inset-bottom 刘海屏手势区 / 焦点陷阱 / `max-height`（默认 85vh）/ `open` 受控 / `oas-close`（detail `{ reason: drag | backdrop | esc }`）/ **`passive` 被动透传模式**（浮层组件 PC 形态的结构占位，SSR/客户端结构严格一致防水合不一致）
- **移动形态接入（select / date-picker / cascader / tree-select / time-picker / combobox）**：coarse pointer（触屏）或窄视口（<768px）自动把下拉切换为底部抽屉承载——模板恒包 `oas-bottom-sheet`（结构一致），移动端去 passive 变容器（dropdown 静态内嵌、不再 fixed 锚定），PC 恢复 passive + computePosition 锚定；各面板适配（date-picker 双月滚动 / cascader 多级横向滑动 / tree-select 搜索 + 树 / time-picker 时间列滚动 / combobox 输入框原位 + 列表滚动；date-picker 单月面板在抽屉里水平居中 + 触摸友好宽度、范围双月堆叠成单列纵向滚动）
- **触摸目标 ≥44px（P2）**：新 token `--oas-touch-target-min`（默认 44px）+ `@media (pointer: coarse)` 下浮层 option/item 最小高度抬升，桌面（fine pointer）不受影响
- **触屏 hover 降级（P3）**：tooltip / hover-card / popover / dropdown 在 coarse pointer 下 hover 通道停用、改 tap 切换（外点关闭；popover 长按打开 800ms 内抬手跳过防误关）
- **switch 块级整行热区（P5）**：块级拉伸时宿主整行可点（composedPath 防内部按钮双触发），对齐移动端设置项整行点击语义
- **浮层视口适配（P4）**：新增共享 `getViewport()`——浮层碰撞边界优先 `visualViewport`（软键盘/浏览器工具栏/捏合缩放时用户真正能看到的区域），回退 `innerWidth/innerHeight`；17 处浮层边界构造统一消费（avatar-group/hover-card/popconfirm/popover/tooltip/auto-complete/cascader/combobox/color-picker/date-picker/mentions/select/time-picker/tree-select/dropdown/context-menu）+ popover constrainMaxHeight 同步

### 修复

- oas-bottom-sheet 归入 feedback 族（原置于 overlay/ 却在 feedback 族注册，触发族目录不变量断言；overlay/ 只留定位引擎基建）
- tree-select「受控开合」demo 默认收起（原默认 `open`，移动端 bottom-sheet 一展开即全屏遮罩拦截整页交互）
- 浮层组件移动/PC 形态切换不重判定（须强刷）：移动形态此前只在 update()/打开时判定一次，窗口缩放/横竖屏/设备仿真切换后形态冻结——新增共享 `watchMobileSheetMode()`（pointer:coarse + max-width 越界订阅）重判定 + 展开态重排承载方式

### 验收

- 全量单测 6879 / typecheck 0 / build 0 / api:check（WIP 0）/ trace 0 命中
- e2e：移动仿真 qa-regression（select/date-picker/cascader/tree-select/time-picker/combobox bottom-sheet 开合 + 触摸目标 + tap 切换 + switch 整行 + hover-card 不越出 visualViewport + popover/dropdown 触屏降级）+ 全量 smoke/dark/code/visual/console-sweep/vue-prop-hijack/a11y/interaction 全绿；light/dark 截图复核 + console 零告警

### 第二批：硬伤 + 高频缺口收口

**真硬伤（触屏不可用/溢出）**：

- **upload**：picture-card 删除×/操作钮仅 hover 显现 → coarse 下常显可达 + 44px 热区
- **transfer**：固定 ~430px 刚性布局窄屏溢出 → ≤480px 纵向堆叠；HTML5 DnD 触屏不可用 → 按钮式 move-up/down 排序；行/钮 coarse ≥44px
- **stepper**：无窄屏处理 → coarse 下步骤条横向溢出滚动 + tab ≥44px
- **tag**：closable × 钮 ≈12px → coarse 下 44px 隐形热区 + checkable/clickable 整签 ≥44px

**高频缺口**：

- **触摸目标抬升**（`--oas-touch-target-min` + pointer:coarse）：date-picker 日格 / time-picker 列 / combobox 选项 / calendar 日格 / command 选项 / pagination / anchor / breadcrumb / toolbar / tour / tree 展开钮 / carousel 箭头圆点 / table 小钮 / button 本体
- **横幅 vw 宽度保护**：message / notification / toast / popconfirm 面板加 `calc(100vw - …)` 兜底防窄屏溢出；notification peek 栈补触屏 tap 展开
- **popconfirm trigger=hover 触屏降级**为 tap 切换（照 popover 范式）
- **HTML5 DnD 触屏替代**：transfer / dynamic-tags 按钮式排序、table 列重排上移/下移按钮
- **navigation-menu 顶级 bar 溢出「···」收纳**（RO 驱动）+ 面板窄屏宽度兜底
- **image/image-group 预览 pinch 双指缩放**；table 过滤面板改走共享 floating 引擎视口夹取

**缺陷修复（视觉复核实抓）**：calendar 触屏日格 min-width 撑破 7 列致周日列被裁（收窄为只抬高度）；upload picture-card 删除× dark 对比度；docs 演示块按钮行不换行撑宽布局视口致右锚定浮层出屏（docs 侧换行 + overflow-x:clip）；image 预览工具栏窄屏竖排分行（nowrap + 横向滚动收纳）

**验收**：全量单测 6879 / typecheck 0 / build 0 / api:check 0 / trace --all 0 / chromium 全量 e2e 1243 + firefox 抽样 1893 全绿 / 移动仿真 light+dark 截图复核 + 真点交互验证

---

## v2.5.1 bottom-navigation 胶囊形态 pill

### 特性

- **oas-bottom-navigation `pill`**：布尔属性，整条栏呈**浮动胶囊**——`tablist` 全圆角（`--oas-radius-full` 开口）+ 四周描边（替代通栏顶边分隔线）+ 轻投影；宿主左右自动让出留白，`fixed` 下再加底部留白四边悬浮。留白 / 投影走 `--oas-bottom-navigation-pill-inset` / `--oas-bottom-navigation-pill-shadow` 变量开口，dark 自动走 token。
- 默认关闭（零破坏）；语义（`tablist`/`tab`/`aria-selected`）、受控 `value`、roving 键盘契约不变；`pill` 与 `fixed` / `hide-on-scroll` / `safe-area` / `layout` / `show-label` / `shift` 正交组合。

### 验收

- 单测：`pill` 入 observedAttributes + CSS 规则（全圆角 / 四周描边 / 轻投影 / 左右与底部留白）+ 语义与选中切换不受影响；`pnpm test` / typecheck / build / api:check 全绿
- e2e：bottom-navigation 页 smoke / console-sweep / visual 全绿 + light/dark 截图复核

---

## v2.5.2 国际化扩充：多语言 + 按需加载 + RTL 公共机制 ✅

### 特性

- **语言包扩到 10 种**：内置 `zh-CN`（默认）/ `en` / `ja` / `ko` / `de` / `fr` / `es` / `pt` / `ru` / `ar`（RTL），每包与 `zh-CN` 的 key 全集严格一致（`locale-completeness` 测试兜底）。
- **按需加载**：主入口仅带 `zh-CN`；其余为独立子路径（`@oas-ui/i18n/ja` 等，tree-shakable），并提供 `loadLocale(name)`——内部静态 `import()` 映射，bundler 可切独立 chunk，调用时才下载并注册。
- **方向元数据 + RTL 公共机制**：`Locale` 增 `dir?: 'ltr' | 'rtl'`；新增 `getDirection()` 与 `ui` 侧 `resolveDirection(el)`（解析顺序 config-provider > 最近祖先 `dir` > `document.dir` > 当前 locale）；`computePosition` 增 `direction` 选项，RTL 下镜像 `start/end` 与 `left/right` 主轴，接入 select / combobox / auto-complete / tree-select / date-picker / time-picker / mentions。
- **周起始 locale 感知**：`getWeekStart` 由「zh 周一、其余周日」改为查表 + `Intl.Locale.weekInfo` 回退（zh/ru/de/fr/es/pt 周一；ja/ko/en/ar 周日）。
- **格式化沿用原生 `Intl`**：日期/数字（`Intl.DateTimeFormat` / `Intl.NumberFormat`）已本地化，新增语言无需额外翻译。

### 验收

- `pnpm test` 全绿：completeness 覆盖 10 包、`registry` 覆盖 `getDirection`/`loadLocale`、`date-grid` 覆盖周起始、`floating` 覆盖 RTL 镜像；`pnpm typecheck` / `pnpm build` 通过，`@oas-ui/i18n` 各子路径产物 + d.ts 齐全。
- 浏览器验证：切 `ar`（或 `config-provider direction="rtl"`）后重点浮层左/右对齐镜像正确、方向解析按优先级生效。
- 文档（faq / config-provider 中英）补内置语言列表、`loadLocale()` 用法与 RTL 说明。

### 边界（不在本批）

- 其余组件纯 CSS 逻辑属性（硬编码 `left/right/padding-left/text-align/transform` 等）的 RTL 审计与迁移单列专项，本批不做。

---

## v2.5.3 RTL 逻辑方向化：全组件铺开（承接 v2.5.2 边界）✅

### 特性

- **浮层定位接线补全**：v2.5.2 只接了 7 个 form 浮层；本批补齐 avatar-group / table / popconfirm / popover / tooltip / color-picker / cascader / dropdown / tour（含 hints）的 computePosition `direction` 传参——RTL 下主轴 left↔right 与对齐 start↔end 自动镜像，声明值保持物理（零 API 变化）
- **hover-card 自研定位接 RTL**：主轴与对齐同规则镜像（不依赖共享引擎的组件对齐处理）
- **menu 级联子菜单**：定位改逻辑 inset（`inset-inline-start:100%`，RTL 自动开在左侧）；翻转判定接 `isRtl`（LTR 检右缘溢出 / RTL 检左缘）；`data-rtl` 镜像开关
- **组件 CSS 逻辑属性改造**（物理 → inline/block 逻辑值，自动跟随书写方向）：input（prefix/suffix 留位与 affix 定位 24 处）、transfer（75 处）、menubar（24 处）、navigation-menu（13 处）、popover/tooltip/hover-card/dropdown/table/timeline/code/equation/sidebar/layout/splitter/switch/slider/form-item/checkbox/radio/pin-input/rate/segmented/toggle-group/dynamic-tags/dynamic-input/editable/breadcrumb/steps/toolbar/back-top/float-button/page-header 等
- **方向敏感行为镜像**（`data-rtl` + `isRtl`）：switch knob 位移反向；slider 滑选 `reverse XOR isRtl`；rate 半星裁剪与触屏滑选按物理坐标重排；segmented/toggle-group/radio-group/dynamic-tags/tabs/toolbar/navigation-menu 方向键镜像；menubar 竖排缺省弹出侧与汉堡面板镜像；navigation-menu 面板翻转/动画/方向键镜像；speed-dial 展开方向镜像；steps 序号方向与 arrow 形态镜像；sidebar 折叠箭头/阴影/rail 拖拽 delta 取反；splitter 拖拽 delta 取反；page-header 返回箭头翻转；table 列重排触屏按钮语义
- **内容不镜像的例外**（通行做法）：代码块（`direction:ltr` + `unicode-bidi:isolate`）与数学公式内容保持 LTR；显式物理 API 保留（badge corner、float-button 位置、drawer/timeline/sidebar 的 side/mode、speed-dial/back-top 方位枚举、form-item label-align）
- **dir 观察重判定**：menubar / navigation-menu / tabs / toolbar / breadcrumb / steps / back-top / float-button / page-header / speed-dial 的 observedAttributes 增加 `dir`——运行时切换书写方向即时重判定（`dir` 列为全局约定属性，不进 API 表）
- **方向判定收敛单源**：`shared/direction`（resolveDirection：config-provider → 就近 `[dir]` → document.dir → locale 回退；isRtl 布尔口），`overlay/direction` 移除（内部路径直接 breaking 不留别名）；组件 CSS 镜像统一 `data-rtl` 属性方案（不使用 `:host-context`）

### 修复

- ellipsis 3 处断言对齐 i18n「开箱即用」默认翻译行为（方向接线使 i18n 模块进入其模块图后，t() 返回 zh-CN 译文而非裸 key——既定设计）

### 验收

- 全量单测 6968 / typecheck 0 / build 0 / api:check 0（`dir` 全局约定不进 API 表）/ trace --all 0 / perf:size、bench PASS

---

## v2.5.4 导航组件批次（app-bar 新组件 + float-button 家族扩展）✅

### 特性

- **oas-app-bar（新组件，navigation 族，应用栏）**：页面/工具区顶部的应用栏布局条——标题（属性/slot 富内容双通道）+ leading 汉堡钮（`oas-menu-toggle`）+ `slot="actions"` 操作区 + 超宽 overflow「···」收纳（RO 驱动、镜像回派）+ `hide-on-scroll` 滚动折叠 + `slot="extended"` 扩展区（滚动收起）+ `position="static|absolute|fixed|floating"` 四形态 + `elevated` 滚动投影；RTL 逻辑属性 + coarse 触控 44px；role=banner + aria 全同步；SSR/DSD 双路径。i18n 新增 `appBar.*` 4 键（10 语言包齐全）
- **oas-float-button 家族扩展**：`mode="single|group|menu"` 三模式（分组 slot 子钮带 label 气泡与角标、菜单模式 actions JSON 弹出选择并派发 `oas-select`）；受控 `expanded` + `oas-expand-change`；`trigger="click|hover|manual"`；`expand-direction` 四向（RTL 横向镜像）；子钮/主钮链接化（href/target）；徽标状态点与数字 99+ 封顶；Esc/外点收起回焦、reduced-motion 降级
- **RTL 第二批（方向键镜像 + 面板逻辑化收口）**：6 组件水平方向键 RTL 换向（carousel / stepper / bottom-navigation / toolbar-toggle / image / tree）+ carousel 轨道位移取反与箭头逻辑属性镜像 + tree 收起箭头 `data-rtl` 镜像 + scroll-area 方向判定收敛 `shared/direction` 单源 + 浮层面板残留物理 CSS 逻辑属性改造（select / auto-complete / combobox / mentions / cascader / tree-select / date-picker / time-picker / tour / dropdown split / menu / table / slider / collapse-item / theme-editor）+ 约定守卫：全库物理方向 CSS 白名单化（placement 基向箭头绘制、物理命名 API、内容 LTR 锁定、成对对称豁免），白名单外新增一律红灯
- **API 规范统一**：size 档位跨词表别名互认（`shared/size` 单源，五档全称/缩写全组件等价接受）+ 事件同名归一（drawer/modal 增派 `oas-after-close`、upload 增派 `oas-exceed-limit`，旧名兼容别名双发）+ 阴影三档 token（`--oas-shadow-sm/md/lg` light/dark，28 处裸阴影迁移，方向性/inset/形状描边豁免）
- **qa-regression 补位 10 组件**（bottom-sheet/confirm/checkbox/radio/textarea/collapse/speed-dial/editable/dynamic-input/toggle-group，41 用例）；修复 speed-dial 展开自动聚焦失效（visibility 过渡离散翻转致 focus 静默失败，展开向改立即翻转）
- **长尾修复**：stepper 横向连接线 RTL 镜像缺失（物理 left 单向延伸改逻辑属性，与 steps 的 data-rtl 镜像对齐）；core translator 广播隔离（单个监听者抛错不再阻断全库 locale 切换通知）
- **bottom-sheet 文档页补齐**：中英 demo 页（基础 / max-height / passive 被动透传）+ API 表 + 总览与侧边栏接线；app-bar 中英 API 章节补齐；ssr 白名单接入 app-bar 并入档 bottom-sheet 的 SSR 策略
- **oas-editable 原地编辑**：展示态与编辑态同尺寸原地切换——无缝输入框（透明底、聚焦显形）+ 镜像宽度自适应；展示态富内容模板支持迟到填充；修复「展示态 `[hidden]` 规则缺失致编辑框并排」与「展示态自定义模板迟到填充不渲染」两处模型缺失
- **API 规范统一（阴影收口）**：阴影三档 token 落地的收口批次——21 处浮层 `color-mix` overlay 阴影迁移到 `--oas-shadow-*`，双体系（裸阴影 / token）归一

### 修复

- oas-float-button `trigger="manual"` 完全受控语义：外点与 Esc 不再自动收起（收起由宿主 `expanded` 属性全权驱动）；demo 宿主补定位上下文（展开层锚定主钮）+ 回归固化「展开层相对主钮偏移」断言
- oas-carousel 卡片模式 RTL P0×2：卡宽取反符号错误致 RTL 下当前卡偏移、拖拽 delta 未随方向取反致拖拽反向（含松手阈值镜像）
- oas-float-button 展开焦点管理：`syncExpanded` 抢占宿主焦点、选择后不回焦、节点重建丢焦三处修复；补 DSD/水合测试
- oas-table 死 token：`--oas-color-primary-soft` / `--oas-color-danger-soft` / `--oas-shadow-md` 三处引用改主题化 `color-mix` 回退（原为未定义变量，被 token 守卫判红）
- oas-slider 纵向拇指 hover 放大从未生效（死选择器）；oas-toggle-group 纵向贴合首项右上角为直角；oas-snackbar 阴影入 token；抽屉/对话框打开侧事件对称（补 `oas-after-open`）
- 感知质量：CSS 变量引用守卫（无 fallback 且全库无定义 → 红灯）+ 7 处存量裸 token 补 fallback（table / message / notification / tour）
- SSR/DSD 逃生口用例 flake 根治（JS 冒泡派发 + shadowRoot 查询）；白名单补 `oas-app-bar` 与 DSD 验收 fixture

### 工程

- **API 表工具链补全**：CSS 变量出口收割进 manifest → API 表新增「CSS 变量」组（平衡括号扫描不漏变量、源码声明值兜底、组件作用域 theme token 放行、同前缀数字出口折叠 `{1..N}`）；插槽收割补 light-DOM 标记式与代码式读取（去重归一形式、排除内部保留标记与内部管线插槽）；全库 API 段统一为 `### oas-xxx` + `#### 属性/事件/插槽/CSS 变量`，CSS 变量表按需增列「说明」，补齐 68+ 条插槽说明
- perf 预算重定档（cdn/全量入口天花板、table/theme 分量；闭包测量只计静态导入）；`release:check` 版本一致性硬校验 + pre-push 拦截；markdownlint 收口与文档站统计重生成

### 验收

- 全量单测 7101 / typecheck 0 / build 0 / api:check（WIP 0）/ stats:check 0 / lint:md 0 / trace 0 命中
- 全量 e2e（chromium 全量 + firefox 抽样）；新增能力 demo light/dark 截图复核 + 真实交互验证 + console 零告警

> 注：原「后续 backlog」中的 oas-float-button（本批转正）、oas-app-bar（本批立项实现）、oas-sidebar（v2.2.4/v2.2.5 已发布）三条目均已落位，backlog 清空。

---

## v2.5.5 组件笔误修复 + 文档示例对齐 + 工程门禁收口 ✅

### 特性

- **oas-select chevron 图标笔误修复（自 v2.5.1 起带病发布）**：内联 V 形 path 多出一段回折线（几何长度 21.31 vs 规范 11.31），图标渲染成乱纹；除修复外**新增源码级守卫**——全组件 `class=chevron` 的 path 必须与 `@oas-ui/icons` 的 `chevron-down` 一致，补上「visual.spec 只截图不做基线比对」的漏检路径
- **oas-button-group `pill` 端部整形**：端部改由组容器承担（`radius-full` + `overflow: clip`，端弧按容器较短边夹紧），横向 / 纵向宽钮 / 纵向窄高钮都得到真正的半圆胶囊端（原逐按钮圆角在「端边 == 短边」时只圆到 1/4，退化成圆角矩形 / 半椭圆）；纵向端钮外侧留白收口 `space-4`，消除「文字钻进弧端」

### 修复

- **文档站语言适配两处回环**：①首访适配脚本与 theme 的 lang watcher 互踢——zh 浏览器整页打开 `/en/` 深链会无限整页跳转（dev 实测 4s 内 40+ 次 load）；②`/en/` 前缀改为**显式语言指定**、整页打开一律保持英文，不再按浏览器语言回弹（优先级：显式路径 > 偏好 > 浏览器探测）

### 文档

- **radio / checkbox 自定义指示器示例重做**（修 dev 下选中态图标空白、跨引擎看不清选中态）：内联 `<template slot="checked-icon">` 的**内容**在 vitepress dev 下被 Vue 编译管线吞空（生产构建正常，故此前 preview 验证漏掉）→ 改用组件**直接元素**通道；写进 SVG 表现属性的 `var()`（跨引擎脆弱、回落黑色）→ 改 `currentColor` + `::part(indicator-checked)`；弃用 `mask` 剪影（重置在部分引擎不生效会整块空白）；radio 两态自定义示例改同形星标并补「自定义指示器是**项级开关**」说明
- README（根中英 + `@oas-ui/ui` 中英）补官方示例模板站链接

### 工程

- **CI 门禁收口**：`stats:check` 前置到 `perf:size` 之前（后者会改写入库基线，先跑必致统计校验拿环境实测数字比提交版）；tooltip merge 直角三角几何用例改**静止态测量**（入场动画 `scale(0.9→1)` 期间量到缩放后的箭头盒 → CI 两引擎同用例必挂），用 reduced-motion 关动画、容差维持 0.5px 不放宽
- **`perf:size` / `perf:bench` 默认只测不写**（更新基线需显式 `--update-baseline`），消除「本地跑一次 perf 就脏 tracked 文件」与 CI 误报源头；`release-check` 增适配层「有改动未 bump」警告；本地 pre-commit 增 stats 门禁

### 验收

- 全量单测 7103 / typecheck 0 / build 0 / api:check 0 / stats:check 0 / lint:md 0 / biome check 0 / perf:size 全 PASS / trace 0 命中
- 全量 e2e 2111 passed（chromium 全量 + firefox 抽样 + docs-site）；select / button-group 修复项均带 e2e 与源码守卫固化回归；radio / checkbox 新示例 dev 与 prod 双环境实测（含暗色、console 零告警）

## v2.5.6 无障碍一致性批次（设计级冲突收口 + 感知对比度门禁）

### 无障碍

- **可点 / 可选容器去缺省交互角色（card、list）**：可点卡与可点行内常嵌操作控件（按钮 / 开关），缺省 `role=button/checkbox` 会把内部控件裹进交互元素（axe nested-interactive，读屏丢失内部控件可读性）。改为组件不挂缺省角色、只保留 `tabindex` 键盘可达；宿主显式角色（多卡组 `role="radio"`）不被覆盖、仍按 `selected` 同步 `aria-checked`，既有文档用法零变化
- **list 可点行与行内控件双触发**：点击行内开关 / 按钮不再同时触发整行 `oas-click`（补 composedPath 内部交互排除，键盘路径同步生效）——历史缺陷，非本批引入
- **qrcode 图形语义归位**：`role="img"` + `aria-label` 从容器挪到 `<svg>` 自身，解除与容器内刷新按钮的交互嵌套
- **splitter 折叠按钮移出 separator**：按钮与分隔条同级挂在新增 `.sep` 容器、索引由 `data-splitter-index` 携带，消除交互嵌套；折叠面板禁用滚动（0 尺寸滚动区既不可用又触发 scrollable-region-focusable）
- **progress 内嵌百分比文字**：由横跨「填充 + 轨道」改为只压在已填充段（填充过窄时整段隐藏）——原实现白字压浅色轨道，实测感知分 0
- **感知对比度门禁（新建，零容忍，light + dark 双主题）**：117 页 × light/dark 双主题，共 2.4 万+ 文本节点（单主题约 1.2 万），逐节点取 axe 解析出的文字 / 背景实测色，用自实现感知对比度公式打分；`<60` 一个节点都不允许（`<45` / `<30` 同为零），禁用态文字（含 opacity 淡化合成档）按 WCAG 豁免并单列计数；门禁自带「注入低对比文本必须被捕获」自检与「color-contrast 不得进页面级豁免」防绕过守卫
- **暗色主题同规格清偿**（实测 `<60`：亮色 655 → 0、暗色 327 → 0）：暗色次级文字提亮、预设蓝 `-text` 提亮、docs 站内联 `<code>` 与引用块暗色配色、grid demo 暗色梯度重排、label / link / code 三个 demo 的写死 hex 改 token（写死 hex 数学上无法两主题同时达标）
- **自定义色「文字安全档」theme-aware 化**：新增内部 token `--oas-deep-mix` / `--oas-deep-sink`（亮色掺近黑、暗色掺近白），tag / badge / avatar / button 的 hex 自定义色与 button、popconfirm 残留的 `color-mix(… %, black)` 实底派生全部改为掺 `--oas-color-text-primary`
- **预设 `-text` 档改规则推导（OKLCH 亮度阶梯 + 多约束 + 守卫锁死）**：替代逐值手调（手调曾拆东补西），真源 `packages/theme/oklab.ts`（自写 sRGB↔OKLCH，零新依赖）——锁色相 ≤12° 只在 L 取档、双底对比度 ≥65、相邻组 ΔE ≥8、elevated 底 ≥60 硬闸、冲突退让只在更安全方向取样；light 改 2 值 / dark 改 7 值；style-conventions 守卫锁死 + 对比度公式收敛单一真源（a11y.spec 与 theme/oklab 同源）
- **语义色 `-text` 并入同一派生/审计规则**：`success` / `warning` / `danger` / `info` 全部按「目标底 ≥65 / `bg-elevated` ≥60 / 锁色相 ≤12°」审计（`info` 无色板本色，锚定双主题色相中值 `217.3°`）；dark `info-text` 由 `#22d3ee`（elevated 59.96）按派生器输出保色相提亮到 `#23d3ef`（elevated 60.03，相对锚点 `217.3°` 的色相漂移 5.2°（≤12°）；取最近达标档，非手调更亮值），light `#0e7490` 保持（白底 76.2 / 灰卡 70.2）——不再留「双底 57.9 存量欠账」口头豁免
- **存量对比度债务全量清偿**（实测 `<60` 由 655 节点降到 0）：浅底文字统一改用主题 `-text` 文字安全档（亮 / 暗主题各自定义，替换「基色掺黑」启发式——后者在暗色下会反向压暗）；实底浅色（预设色 tag / badge / toggle 选中态、code inline solid）改用 `-text` 档作底；覆盖 tag / badge / toggle-group / toggle-button / breadcrumb / message / switch / list 选中行描述 / tree / transfer / steps / rate / log / code / theme-editor / alert / button 选中态 / anchor / sidebar 徽标，以及 grid、container、flex 三个 demo 的自绘配色（含 demo 引用不存在 token `--oas-color-primary-text` 的真 bug）
- **axe 比值法（WCAG 2.x AA 合规参照）改走 ratchet 基线**：存量违规只许降不许升、逐批清偿，与感知门禁并行看守（合规线与体验线分开盯）

### 测试

- a11y 审计全站零排除页、零整规则豁免：stepper 的「跨 shadow ID 引用」收窄为**节点级豁免**（规则保持启用，只剔除 `role=tab` 的 `aria-controls` 误报节点），命中前校验引用方/目标确为 stepper shadow tab ↔ 另一棵树 tabpanel；同页其它非法 ARIA 取值仍由 axe 判红（a11y.spec 反证用例）+ qa-regression 的 `aria-controls` 目标存在性与全量取值合法性断言兜底
- stepper 整规则豁免债务已清偿：不再存在「整规则禁用导致旁泄」的临时兜底
- 债务：厂商前缀样式通道（backdrop 模糊的 `-webkit-backdrop-filter`）引擎层不在 CI 覆盖（Chromium 已移除该前缀、WebKit 在 Windows CI 不可靠），单测只锁「样式表双规则 + 内联变量」机制，手工核验方法见 `docs/engineering.md` §2
- 新增对比度门禁自检用例与基线生成模式（`CONTRAST_BASELINE=update`，light + dark 双主题逐页落基线）；qa-regression 补 splitter 折叠（含折叠钮居中几何）/ list 双触发 / card radio 组 / stepper aria-controls / qrcode 刷新 / progress 内嵌文字边界六处固化
- tooltip 三个 hover 跟随用例改「关动画 + 等 DOM 静止 + 轮询断言」，消除并行下的时序抖动

### 验收

- 全量单测 186 文件 / 7401 用例 / typecheck 0 / build 0 / api:check 通过（含新增 CSS 变量表生成）/ stats:check 0 / lint:md 0 / format 0 / perf:size 全 PASS（theme index.css 3.1KB / 3.5KB）/ trace 0 命中
- 全量 e2e 2358 passed（chromium 全量 + firefox 抽样，0 failed）；a11y 审计 118 passed（117 页 × light+dark 双主题 + 门禁自检，零严重违规）；对比度硬闸 `<60 = 0`（light 655→0、dark 327→0），axe 比值法 ratchet 基线入库（255 违规 + exempt/skipped 同步 ratchet）

## v2.5.6 form-associated 批次（原生表单集成）

### 特性

- **core 新增 `OASFormElement` 基类（form-associated custom element）**：`static formAssociated = true` + `attachInternals`（不支持环境静默降级）；子类义务 `getFormValue()`（`string | FormData | null`）/ `resetFormValue()` / 值变化点调 `syncFormValue()`
- **`<label for>` 原生关联生效**：label 点击时浏览器向控件本体派发 click → 基类转焦点到 shadow 内真实控件（`innerControl` 钩子，复合控件按组件覆盖）；勾选族（checkbox/radio/switch）label 点击对齐原生「激活控件」（切换 + 聚焦）；upload 的 label 点击激活内层 `input[type=file]`（打开文件选择器）；读屏朗读 label 文本；`labels` / `form` getter 直出
- **原生表单集成**：FormData 收集（无 `name` 自动不提交）、`form.reset()` 回初始值（不派发事件，与原生一致）、`fieldset[disabled]` 联动——**不回写 `disabled` 属性**（回写后元素不再随 fieldset 变化 = 自锁，e2e 抓出），改经内部标志位 + `injectDisabled` 通道并入（组件显式 disabled > 表单链路 > provider 注入）
- **原生校验链路**：`setValidity` + `willValidate / validity / validationMessage / checkValidity() / reportValidity()` 代理；`required` 空值 → valueMissing（消息走 i18n `form.valueMissing`，10 语言包）；宿主匹配 `:valid` / `:invalid` 伪类
- **值语义按组件族对齐原生**：文本族（input/textarea/mentions/auto-complete）提交当前文本；勾选族「勾/开/选中才提交、未勾不提交」（`setFormValue(null)`）；选择族单选提交选中值、多选（select/tree-select/date-picker multiple）**同名多条 FormData**；combobox 选中优先 + 草稿文本兜底（datalist 语义，失焦丢弃）；date/time 范围模式 **`name-start`/`name-end` 两条 entry**；upload 提交 File（回显记录无文件体不提交）
- **reset 基线全批次统一**（initialValue + valueDirty）：初始渲染/受控写入跟随属性刷新基线，用户交互置脏冻结（对齐原生 dirty 语义），reset 恢复基线并清脏；radio 互斥清除视同交互（目标置脏），保住默认选中项的恢复语义
- 与 `oas-form` 自研 `collectFields` 机制并行可用（互不干扰）；`formStateRestore`（bfcache/autofill）明确不做；原生校验 UI（红框/气泡样式）不在本批
- **已知限制**：外部 label 的**文本动态变化**不会即时刷新内层 `aria-label`——命名转发在组件 update 时同步，label 文本变化本身不触发组件 update（下次任意属性/update 触发时收敛）；label 关联关系（for 指向、增删）同理按 update 时机收敛

### 修复

- **下游（示例模板仓）`a11y/noLabelWithoutControl` 42 处告警的根因**：自定义元素默认非 labelable，`<label for>` 对 oas-input 等完全不生效（静态检查可骗过，浏览器无关联）——form-associated 化后 label 关联、读屏朗读、表单提交全链路生效

### 工程

- 落地清单：core 公共机制（OASFormElement 基类 + 校验链路 + 命名转发）+ 15 个表单组件（input / textarea / input-number / checkbox / radio / switch / select / combobox / auto-complete / tree-select / mentions / date-picker / time-picker / upload）
- 批次内实证修复三处共性陷阱：① `setValidity` flag 为 true 时 message 不能为空串（Chromium 抛 TypeError 炸断 update）；② `formDisabledCallback` 回写 disabled 属性自锁（解除 fieldset 时回调不再触发）；③ 内层控件**命名转发**——外部 label 只关联宿主，shadow 内真实控件对 axe/读屏「有名却无名」（axe `label` 规则报缺）；修复为基类把 label 文本复制为内层 `aria-label`（`aria-labelledby` 跨 shadow 引用 light DOM id 不解析，不可用），优先级遵循原生（外部 label > 组件内建回退）
- 体积：core +3.7KB gzip（ui 全量入口预算内；perf 预算已随本批重定档，form 链 20→24KB）

### 验收

- 单测批次新增约 150 条（core 8 + 15 组件各自 form-associated describe）；全量 7401 passed；typecheck 0 / build 0 / format 0 / lint:md 0 / api:check ✓（15 组件 required/name 语料 + manifest 同步）/ perf:size PASS
- 浏览器 e2e（qa-regression/form-associated.spec.ts，chromium + firefox 抽样）15 用例全绿：label 关联与聚焦/激活、FormData（单值/多选多条/范围 name-start/end/File）、reset 基线、required + :invalid + invalid 事件、fieldset 防自锁、label 点击不误开面板
- 全量 e2e 2358 passed / 37 skipped（chromium 全量 + firefox 抽样，0 failed）；a11y 全量 118 页×双主题 axe 零严重违规（命名转发修复后）；demo-coverage 静态属性演示 113 过（12 组件补 required 演示块）
- 视觉核验：form 页「原生表单集成」集中 demo（input/select/date-picker/checkbox/switch）浅/暗截图 + 识图复核（label 点击聚焦环、勾选/切换态、FormData 输出、reset 复位，暗色对比度）；reset 后 select/date 仍显示受控值属**受控写入刷新基线**的设计语义（demo 文案已注明）

## v2.5.6 qrcode 美化维度（码点 / 定位图形形状 + 渐变前景 + logo 挖空）

### 特性

- **`dot-shape` 码点形状**：`square`（默认，渲染与既有版本逐像素一致）/ `rounded`（圆角方块）/ `dots`（圆点，留 0.1 模块间隙防粘连）；非法值静默回落 `square`
- **`corner-shape` 定位图形形状**：`square`（默认）/ `rounded`（三处定位图形圆角）——与码点形状可独立组合
- **`gradient` + `gradient-angle` 渐变前景**：JSON 数组 2–3 色 + CSS 约定角度（0° 自下而上、90° 自左向右，默认 45°），渐变以整码为坐标系连续过渡；生效时覆盖 `color`，非法值回落 `color`
- **`icon-hide-dots`**：中心 logo 覆盖区码点挖空（logo 半透明时点阵不再从边缘透出）

### 工程

- **渲染拆纯函数层** `src/data/qrcode/shapes.ts`（定位图形识别 / 数据区 run-length 路径 / `<use>` 原型 / 定位图形 evenodd 路径 / 渐变 defs），组件与离屏下载共用同一渲染核心——顺带修掉「下载产物与屏幕不一致」的真故障（`download()` 仍调用已移除的旧渲染器，运行即抛 `matrixToPath is not defined`）
- **体积**：square 沿用 run-length 合并单 path；rounded / dots 用不了 run-length（圆点带间隙、圆角需弧线），改为逐模块 `<use>` 引用 defs 单份几何原型（省掉「每模块重复完整几何体」，不省元素数量）——实测 125×125 码约 305 KB（与逐模块内联几何 ~304–320 KB 基本相当，约为 square 合并路径 58 KB 的 5 倍）。**大码形状化偏重，压缩方案（合并路径 + clipPath/pattern 填充、或同形相邻模块合路径）已入 ROADMAP backlog，不在本批范围**
- **可扫性不退化**：默认配置新增区域级等价断言——`dataPath + finderPath(square)` 的覆盖模块集合必须与旧 `matrixToPath` 完全相等（无重叠 / 无遗漏），保证默认外观与旧版本一致
- **源码级守卫**：路径数据合法性检查（剥离合法字符后必须为空）——曾因 `roundRect` 模板串漏 `${}` 在路径里写出字面量 `v-(h - 2 * rr)`，浏览器解析到非法 token 后丢弃后续子路径，右上 / 左下定位图形整块消失、左上糊成实心（单测与既有断言全绿，靠视觉核验才发现）

### 验收

- 单测：qrcode 域 73 用例（含形状 / 渐变 / 挖空 / 路径合法性 / 默认等价）；typecheck 0；build 0
- 浏览器回归（qa-regression，chromium + firefox 抽样）：像素级数三处定位图形暗模块（square 精确 33；rounded 因圆角弧线切到角格、采样点落在抗锯齿带，容 32–34，仍可抓「丢失 0 / 糊成实心 45+」）+ 默认渲染零 defs + 形状 / 渐变 / 挖空按属性生效 + `download()` 产物含形状与渐变且不走合并路径
- 视觉核验：浅色 + 暗色两组截图逐块核对（三眼齐全、圆角「环 + 中心块」结构、整码连续渐变、logo 挖空留白、暗色仍白底深点），console 零告警；smoke / dark / visual / console-sweep 四支 spec 的 qrcode 页均过

## v2.5.6 marquee 循环修复 / SSR 构建环断开 / 依赖升级 / sidebar 公开方法

### 修复

- **oas-marquee 循环接缝顿挫三连修**：克隆份与源份渲染宽不等（每轮 wrap 回跳一个空格宽，实测 4.7px）；相位跳变；克隆份改走 light DOM（页面样式表只能作用于 light DOM，继承宿主样式）+ 份数口径修正 + reverse 切换相位连续（相位按「含方向的位移比例」换算）
- **`[hidden]` 兜底收口（8 处，两笔）**：作者级 `display` 声明压过 UA `[hidden]` 规则的同类缺陷，全库清查补齐
- **真机视觉复核 7 处修复**（含 2 处存量缺陷）+ oas-masonry items getter 契约修复 + 白名单漂移清理
- **oas-input addon 槽放自包含控件时改贴合形态**：修复 append 槽放 `oas-button` 时按钮四周灰带 / 四角双层圆角未与外框合并 / 托盘与输入框 1px 台阶（根因：`.addon` 无条件 padding + 未注入圆角合并协议）；识别自包含控件打内部标记，仅标记存在时归零 padding、对齐控件高度、压边成单线并注入 `--oas-button-group-radius`
- **SSR 测试基建**：DSD 快照匹配改前缀模糊通道（防 DOM 噪声属性误报）；关闭 happy-dom 帧导航（消除单测 fetch 噪声）

### 特性

- **oas-sidebar 抽屉开合方法公开**：`openDrawer()` / `closeDrawer()`（原 private）——编程控制移动端抽屉，等价于点击内置触发钮 / 遮罩 / Esc；幂等、桌面态自动回收不残留浮层、写入 `drawer-open` 受控属性（宿主可观察/回写）

### 工程

- **断开 ui↔ssr 构建环**：`packages/ui` 移除对 `@oas-ui/ssr` 的 devDependency——它使任务图成环（`ui#build → ssr#build → ui#build`，pnpm ERR_PNPM_TASK_CYCLE，dev/build 全挂）；唯一真实引用（e2e spec）`git mv` 到 ssr 包内（依赖方向 ssr → ui 归正）；playwright `testDir` 放宽到 `./packages`；`docs/engineering.md` 同步
- **工具链与依赖升级**：pnpm 11.20.0 → 12.5.1（packageManager）+ biome / playwright / @types/node / happy-dom / markdownlint 等升级；连带回归 8 条修复（含 1 条 SSR 真回归）+ gold 期望同步
- **API 工具链**：反向缺口治理（跨目录基类扫描 + `@apiProperty` 通道 + 双向 0 门禁）；API 语料进 pre-commit；docs 双语镜像守卫；qa-regression 覆盖回填 8 组件
- **perf 预算重定档**（form-associated 批次增量）：cdn.js 575→600 KB、全量入口 870→905 KB（天花板制等比）、button 链 31→35 KB、table 链 65→70 KB、form 链 20→24 KB（绝对值制按实测上浮 ~15%）
- **ui-spec 新增「命令式开合 API 约定」**（抽屉/浮层类公开方法的统一形状，sidebar 为首个落地件）

### 验收

- 全量 e2e 2358 passed / 37 skipped（chromium 全量 + firefox 抽样，0 failed）；全量单测 7401、typecheck、build、api:check、stats:check、trace 全绿（随各笔提交门禁）

## v2.5.7 qrcode 形状化渲染体积优化

### 背景

`dot-shape=rounded/dots`（v2.5.6）采用逐模块 `<use>` 引用 defs 原型——省掉的是「每模块重复完整几何体」而非元素数量，大码产物体积仍与逐模块内联相当（125×125 实测约 305 KB，约为 square 合并路径的 5 倍）。

### 方案

- **合并路径 + pattern 网格平铺**：square 同款 run-length 合并路径划定填充区域，defs 里 1×1 `userSpaceOnUse` pattern 平铺模块原型。原型完整落在各自模块格内，区域裁剪永不切割原型——与逐模块绘制逐像素等价（visual 基线零漂移实证），产物体积回落 square 量级（145×145 实测：dots ≈ 88.3 KB vs 旧方案 ≈ 323.8 KB，约 1/3.7；与 square 仅差 +157 B）
- **渐变 × 形状化联动修复**：形状化模式下 `gradient` 转 `gradientUnits="userSpaceOnUse"` 映射进模块区域——pattern 内容是逐模块小几何，objectBoundingBox 会退化为「每模块各自套全渐变」；square 缺省形状不走 pattern，渐变渲染零变化

### 验收

- 单测：qrcode 域 77 用例全绿（新增体积回归守卫「dots 总量 < square × 1.5」、userSpaceOnUse 映射坐标断言）；typecheck / build 全绿
- e2e：qa-regression 像素级定位图形覆盖（栅格化数暗模块）+ download 产物结构 + pattern 内 `var()` 填充计算值实抓（防静默退黑）全过；visual 基线零漂移；console-sweep 零告警；SSR 真水合 13 用例全绿

## v2.5.7 swatch 新组件 + button compound 变体

### 立项依据

全量能力普查（2026-09-24）核验后立项两件候选：

- **oas-swatch + oas-swatch-group（新组件，form 族）**：色板独立成件是跨库共识形态。场景：内联预设色快选（主题色/tag 色/收藏色）不该弹 color-picker 面板。
- **oas-button compound 变体**：双行按钮（主标题行 + 副文本行），高频于卡片入口/设置项入口。

（第三候选 input formatter 核实为早已落地（415874dc 表单组能力补齐批：input/input-number 的 formatter/parser property 通道 + 千分位 demo），普查档案记录陈旧所致误报，不立项。）

### 功能定义

**oas-swatch**（色块件）：

- 属性：`color`（CSS 色值/11 预设名，color 统一协议 §4.1）、`size`（五档 xs~xl）、`shape`（square/rounded/circle）、`nothing`（无色/透明——棋盘格底）、`mixed`（混色态——多色拼贴指示）、`disabled`、`selected`（受控选中态：选中描边环）、`label`（可访问名）
- 事件：`oas-click`（detail { color }）

**oas-swatch-group**（选择组）：

- 属性：`value`（单选值/多选逗号分隔，对齐 tag-group）、`multiple`、`disabled`（全组）
- 事件：`oas-change`——单选 `{ value }`、多选 `{ value: string[] }`
- ARIA：单选 radiogroup+radio、多选 group+checkbox（aria-checked）；roving tabindex + 方向键 + Enter/Space；空组零子件不报错

**oas-button compound 变体**：`slot="description"` 副文本行存在时切纵向双行布局（主行在上、副文本在下，字号小号次要色）；既有契约（loading/icon/href/disabled）全兼容；副文本自然进入可访问名。

### 验收标准

- 单测：swatch/组契约（value 同步、roving、ARIA、空组、禁用透传）+ button compound 双行布局切换（data-compound + 高度自适应）全绿；typecheck / build / api:check 全绿
- 用户视角：demo 页交互（点选变色、选中环、方向键漫游）在浏览器真点真看，dark 双主题过
- qa-regression 固化：两件各加回归断言

## v2.5.7 sidebar 折叠态 flyout + tabs 右键事件与 title 透传

### 立项依据

- **oas-sidebar 折叠态 × 树形子菜单不可达**（demands 收件箱登记）：collapsed 下图标条内树形父项只渲染父节点，叶子项不渲染，hover 无子菜单弹层，点击父项派发父项 select（父项不是可导航页面——死交互的伪修复）。
- **oas-tabs 标签级右键无原生事件**（下游 oas-md-ka 登记）：shadow DOM 下 contextmenu 的 e.target 重定向到 host，宿主无法得知右键了哪个 tab，只能对 shadow 内部约定做几何匹配（三段绕过，脆弱）。
- **oas-tab-panel 悬停完整标题**（同下游登记）：tab 长标题截断时无全文提示通道，宿主直写 shadow `[role="tab"].title`（同族内部约定问题）。

### 功能定义

**oas-sidebar 折叠态树形子菜单 flyout**：

- 折叠态嵌套父项渲染为图标项：点击（或 hover 延迟 150ms）打开子菜单面板（fixed 定位、定位引擎锚定父项 inline-end（RTL 镜像到左）+ 碰撞避让）；hover 宽限关闭 300ms（指针进入面板即取消关闭计时）；Esc 关闭并回焦父项、点击外部关闭、单开互斥
- 面板 role=menu / 子项 role=menuitem；嵌套子树在面板内内联展开（chevron 内联展开语义）
- 叶子子项点击派发 `oas-select` 并关面板；父项挂 aria-haspopup + aria-expanded 随开合
- **契约变更**：父项点击不再派发父项 select（父项不是可导航页面）
- flyout 内子项 label 不被折叠态 label 隐藏规则误伤（特异性覆盖）
- 浮层定位引擎修复：零尺寸弹层不翻转（fits 因 gap 恒 false 会误翻，翻转把 RTL 镜像抵消）

**oas-tab-contextmenu（标签级右键原生事件）**：

- 可取消事件，detail `{ value, index, clientX, clientY, originalEvent }`；右键标签（或聚焦标签按 Menu 键 / Shift+F10）派发；宿主 preventDefault 时内建菜单（context-menu 属性）与浏览器默认菜单全抑止（capture 阶段先于 manager 委托阻断）；空白处右键不派发；键盘触发坐标取按钮中心；RTL 坐标透传；与 context-menu 属性无关恒派发

**oas-tab-panel `title` 悬停提示透传**：透传 shadow tab 按钮为原生 hover tooltip；tabs 读入 titleCache 并从 panel 宿主移除（防 panel 内容区出现原生 tooltip，ui-spec 原生全局属性吸收 pattern）；宿主改写 title 按钮跟随更新并再次吸收；items JSON 通道 `title` 字段同效；SSR/hydrate 从快照按钮恢复 titleCache

### 验收标准

- 单测：flyout 开合/单开互斥/Esc/外部点击/嵌套内联展开/RTL placement + tabs 事件（detail/preventDefault/空白不派发/键盘路径）+ title（透传/吸收/幂等/改写）全绿；floating 零尺寸不翻转引擎级断言；typecheck / build / api:check 全绿
- 用户视角：真机真实几何（面板 rail 右侧视口内、子项文字可见、hover 打开移入面板驻留不自动关闭）+ tabs 右键三通道（鼠标/宿主拦截/键盘）验证
- qa-regression 固化：flyout（含 hover 链路）与 tabs 两件各加浏览器断言

## v2.5.7 `[hidden]` 兜底全量收口

### 背景与实证

`:host { display }` 是 shadow 作者样式，来源压过 UA `[hidden] { display: none }`——凡 :host 设 display 而缺 `:host([hidden])` 兜底的组件，宿主写 `hidden` 仍可见。2.5.6 曾按报障收口 8 处（症状驱动）；本次 CDN 全量包浏览器实证（163 组件逐个设 `hidden` 读计算 display）发现 **66 个组件失效**（button/icon/tag/space/divider/input/select/date-picker 等全部在列，含 templates 仓字段报告的 button 色块问题），静态扫描与文档站按组件 ESM 复测三路交叉验证一致。

### 修复

- **79 个组件源文件**全量补 `:host([hidden]) { display: none; }`（与既有 80 个组件同款，特异性压过 :host 即可，无需 !important）
- **oas-grid 边角**：update() 内联写 `style.display = 'grid'` 压过 shadow 兜底 → 改为 hidden 时跳过内联写入
- **oas-anchor-target 边角**：单文件多组件（AnchorTarget 独立 shadow root）漏网 → 补规则，守卫升级为逐样式字面量粒度
- **守卫固化**：style-conventions 新增源码级断言（凡 :host display 样式字面量必须带 `:host([hidden])`），防新组件再漏
- 已知非缺陷：oas-backdrop 无 `open` 时自卸载（无孤儿 DOM 设计），实证 sweep 中其「空 display」为断连伪影

### 验收

- 实测 sweep：163 组件 broken 66 → 1（仅剩 backdrop 伪影）；全量单测 7413 全绿；typecheck / build 全绿

## v2.5.7 RTL 全量视觉审计

### 范围与方法

- **sweep 基建**（`scripts/e2e/rtl-audit.mjs`，进 git）：117 组件文档页 LTR/RTL 双跑——几何检查（`<html>` 横向溢出、demo 块越界，双跑取差集只报 RTL 独有）+ RTL 整页截图产出（供识图复核）。`dir=rtl` 于文档解析期经 route 拦截注入 `<html>`（加载后补设会让 JS 方向判定组件停留在 LTR，与真实 RTL 应用不符）；文档站壳层（Vitepress 主题 chrome 物理定位弹层/侧栏）中性化排除站点自身噪声。结果：几何层 117/117 全净。
- **识图 triage**：10 批并行视觉审查产出候选清单；全部候选经 DOM/几何量测（route 注入真 RTL）逐项定责——识图在陈旧 dir 截图上产出的多数 P1（transfer 箭头/page-header 返回钮/message 图标/steps 序/dynamic-input 添加钮/result 居中/app 表格截断）均为伪影，组件实际正确。

### 修复（确认缺陷 5 处）

- **oas-pagination**：RTL 箭头未镜像（`‹«›»` 指向背离目标页）→ `data-rtl` 钩子 + 方向箭头钮 `scaleX(-1)`
- **oas-scroll-area**：RTL 横向 thumb 映射反向（静止态贴左缘呈「已滚到底」观感、拖拽逆指针）→ 起点锚定翻正 + 拖拽同向
- **oas-theme-editor**：色值/token 名 LTR token 被 bidi 重排 → 输入框/只读值/token 名固定 LTR
- **oas-upload**：`template[slot="trigger"]` native slot 不渲染（inert），自绘触发双向空白 → 补克隆通道
- **oas-typography**：`actions-position="start"` 因 order 平局从未生效（LTR/RTL 双坏）→ `order: -1`

### 交互态轮（后续批次补测，2026-09-24）

- 20 个浮层组件真 RTL 打开态 sweep（route 注入 + 逐组件交互 + 面板几何量测 + 截图识读）：面板全部在视口内、方向镜像正确（menubar 下拉向左下、select 选项右对齐、date-picker 周头右→左 + 碰撞上翻均实证）
- **实抓修复 oas-time-picker**：打开瞬间 spinner 列未撑开，end 对齐按旧宽（60px）算 left，内容撑到 198px 后右溢 27px → RO + rAF 重定位固化（LTR 右缘场景同病同修）
- 残余微项：popover 虚拟触发鼠标跟随、tour hints 信标定位（需鼠标轨迹模拟，click 型 sweep 覆盖不到）

### 已知边界（记录不修）

- ~~交互态盲区~~ → 已于 2026-09-24 全部复核定责：20 浮层组件打开态 sweep 全过；popover 虚拟触发鼠标轨迹实测坐标精确跟随无越界；tour hints 信标为居中标点设计形态（LTR/RTL 一致，非缺陷）；snackbar/drawer/menu 打开态 sweep 在视口内
- 文档站生成的 API 表格中代码 token（`--x` 前缀、`fn()` 括号）在强制 RTL 下有 bidi 观感问题——文档站为 LTR 产品，组件库消费场景不受影响，不在组件库修复范围

### 验收

- 单测 7412 全绿（新增 pagination/scroll-area/theme-editor/upload/typography 行为与契约断言）；typecheck / build 全绿
- e2e：speed-dial/qrcode qa-regression 回归全过；RTL sweep 修复后复跑 117/117 全净；修复组件真 RTL 截图逐一人工读图核验

## v2.5.7 能力缺口 P1 立项批（29 项）

> 立项来源：能力缺口甄别（≥3 源共识候选 533 条 → 真缺口 148 条 → P1 29 项，调研仓 `capability-gaps-triage.md`）。命名对照 ui-spec §2（kebab-case 属性 / `oas-*` 事件 / 吸收 pattern）。

### 范围

**表单体系（9 项）**

1. **oas-form `disabled`**：整表禁用（对齐 config-provider 全局禁用语义，字段控件经既有 injectDisabled 通道并入，不回写宿主 disabled 属性防自锁）
2. **oas-form `scroll-to-first-error`**：校验失败后滚动定位到首个错误字段（平滑滚动 + 聚焦，prefers-reduced-motion 降级瞬跳）
3. **oas-form Rule.`validator`**：自定义校验函数（同步返回值或 Promise；与 required/pattern/minLength/maxLength 组合执行，函数不可序列化走 property 通道）
4. **oas-form `validate-trigger`**：校验触发时机（`change`（默认，现状）/ `blur` / `input`，字段级可覆盖表级）
5. **oas-form `initial-values`**：表单初始值（JSON attribute + property 双通道；reset 回到初始值而非空值——与 form-associated reset 基线一致语义）
6. **oas-form 事件 `oas-values-change`**：任一字段值变化时派发，`detail: { name, value, values }`
7. **oas-checkbox `true-value` / `false-value`**：勾选映射值（对齐 switch 既有契约；value 受控写回映射值，oas-change detail 同）
8. **oas-select `label`**：表单标签属性（对齐 input `label` 既有契约，渲染字段标签位）
9. **oas-button 原生表单提交属性组**：`html-type`（button/submit/reset，原生 type 透传）+ `form` / `formaction` / `formmethod` / `formnovalidate` / `formtarget`——shadow 内 button 不参与原生表单提交，经 form-associated 机制桥接（submit 触发表单 requestSubmit、reset 触发原生 reset）

**输入控件一致性（5 项）**

1. **oas-input `autofocus`**：挂载后自动聚焦内层 input（对齐 button 既有 autofocus 转发 pattern）
2. **oas-input `autocomplete`**：透传内层 input（自动填充/密码管理器）
3. **oas-input `loading`**：加载态（尾部 spinner 位 + aria-busy，不禁用输入）
4. **oas-input `inputmode`**：透传内层 input（移动键盘类型）
5. **oas-input-number 事件组**：`oas-focus` / `oas-blur` / `oas-input`（对齐 input 既有事件契约）

**弹层/浮层（7 项）**

1. **oas-modal `z-index`**：层级覆盖（默认走 token，属性显式覆盖写入宿主 style）
2. **oas-drawer `height`**：上下抽屉（placement=top/bottom）高度（默认现状 auto/既有值，属性覆盖）
3. **oas-drawer 事件 `oas-cancel`**：取消语义关闭时派发（Esc/遮罩/取消钮），与确认区分
4. **oas-auto-complete `variant` + 事件 `oas-focus` / `oas-blur`**：对齐 input 三值变体（outline/filled/borderless）；focus/blur 对齐 input 既有事件契约
5. **oas-cascader `loading`**：加载态（面板内加载占位）
6. **oas-cascader `field-names`**：字段映射（对齐 tree-select 既有契约，`{ label, value, children, disabled }`）
7. **oas-cascader 事件 `oas-focus` / `oas-blur`**

**数据展示与导航（8 项）**

1. **oas-select `variant`**：对齐 input 三值变体
2. **oas-table `show-header`**：表头显隐（默认 true 现状；false 时 thead 不渲染）
3. **oas-tabs `actions` 插槽**：标签栏右侧操作区（nav 内固定，不随标签滚动被遮挡，对齐 + 按钮固定惯例）
4. **oas-tree 事件 `oas-expand`**：节点展开/收起时派发，`detail: { key, expanded, node }`
5. **oas-tree 拖拽生命周期事件组**：`oas-node-dragstart` / `oas-node-dragover` / `oas-node-dragleave` / `oas-node-dragend`（既有 drop 契约不变）
6. **oas-calendar `range`**：范围选择模式（起止两点选取 + 区间高亮 + oas-change detail `{ start, end }`；复用 date-grid 内部基础）
7. **oas-carousel `draggable`**：指针拖拽/触摸滑动切换（阈值翻页 + 回弹，触摸设备默认开）
8. **oas-menu `open-on-hover`**：子菜单 hover 展开（vertical/inline 模式，延迟开合防抖，点击路径不变）

### 验收（每簇）

- TDD：每项先 RED（行为/契约断言）后 GREEN；新事件/属性进 api:scan 清单（api:check 双向 0）
- 用户视角：组件 md demo 实跑可见反馈；dark 主题过视觉；RTL 逻辑属性（方向相关项）
- 缺陷/交互项固化 qa-regression；全量单测 + typecheck + build + api:check 全绿

## v2.5.7 能力缺口 P2 立项批（31 组/38 条长尾增强）

> 立项来源：能力缺口甄别 P2 池（已逐条甄别定级）。口径：语义覆盖为准，命名对照 ui-spec §2。

### 范围（按组件分组）

- **oas-affix**：`z-index`（吸附后 fixed 层级覆盖，缺省走 token）
- **oas-auto-complete**：`placement`（面板 12 向，对齐浮层引擎）+ `autofocus`（转发内层）
- **oas-avatar**：`srcset`（透传内层 img，响应式图源）
- **oas-badge**：`shape`（徽标形态：round 默认 / square 方角 / pill 胶囊——数值与 dot 通用）
- **oas-button**：`loading-icon` 插槽（自定义加载图标，缺省内置 spinner）
- **oas-calendar**：`header` 插槽（自定义头部，缺省内置导航）+ `locale`（面板语言覆盖，缺省全局 locale）+ `format`（头部/单元格日期格式串）
- **oas-card**：`disabled`（禁用态：不派交互事件 + 灰化 + aria-disabled）+ `orientation`（horizontal 横向排布：封面左内容右）
- **oas-carousel**：`trigger`（指示器触发方式：click 默认 / hover）
- **oas-cascader**：`label`（触发器命名，对齐 select）+ `placement`（面板 12 向）+ `suffix-icon` 插槽（触发器后缀图标）+ `option` 插槽（选项行自定义渲染，data-option-label 绑定）
- **oas-checkbox**：`tabindex`（透传内层控件）
- **oas-combobox**：`autocomplete`（透传内层 input）
- **oas-date-picker**：`separator`（范围分隔符）+ `suffix-icon` / `prefix-icon` 插槽 + `default-time`（范围起止默认时分秒，对齐时间通道惯例）
- **oas-descriptions**：`items` 数据驱动通道（JSON attribute + property，子元素通道保留）
- **oas-drawer**：`no-mask`（无遮罩模式，点击外部仍关；与 mask 既有契约一致）
- **oas-dropdown**：`size`（触发器尺寸五档透传）+ `type`（触发器按钮类型透传）+ `max-height`（面板限高滚动）
- **oas-form**：`size`（表级尺寸注入字段——全量注册控件含无 name 展示件；嵌套 form 场景外层下发会深入内层 form 字段（与 disabled 下发同款穿透），双层 size 语义由 update 次序决定，立档不阻塞）+ `colon`（标签冒号开关，form 级）+ `help`（form-item 静态帮助文案，独立于校验错误）+ `status-icon`（校验状态图标反馈）+ `validate-messages`（校验文案模板，property 通道覆盖 locale 默认）
- **oas-grid**：grid-item `flex` + `pull` / `push`（偏移，对齐 span/offset 语义）+ 折叠行（`collapsed-rows` + 展开收起尾格）+ 双轴 gap（`gap="x,y"` 或行列分离属性）
- **oas-image**：`width` / `height`（显式尺寸）+ `referrerpolicy`（透传 img）
- **oas-input**：`minlength` / `pattern` / `spellcheck`（透传）+ `min` / `max` / `step`（number 类型透传）+ `clear-icon` 插槽 + `hint`（输入框下方静态提示文案）
- **oas-input-number**：`autofocus` + `decimal-separator`（小数点字符，缺省 locale）+ `variant`（三值对齐 input）+ `align`（数字文本对齐 left/center/right）
- **oas-layout**：sider `width` 属性（轨道宽度，对齐 width 契约变量开口）
- **oas-list**：`hoverable`（行 hover 底色反馈，默认可点行现状不动）
- **oas-menu**：`disabled`（整单禁用）+ `selectable`（关选中态语义，纯动作菜单）+ `persistent`（选中后不自动收起浮出子菜单——对齐 close-on-select 族语义）
- **oas-radio-group**：`required`（组级必校验，form-associated valueMissing）
- **oas-select 长尾组**：`suffix-icon` / `clear-icon` 插槽、`input-value`（filterable 输入值受控）、`show-arrow`、`autofocus`、`suffix` / `prefix` 插槽、`default-active-first-option`、`loading-text`、`reserve-keyword`（多选选中后保留搜索词）、`tabindex`、`auto-width`（触发器宽度随选中项）、`hint`、事件 `oas-create`（allow-create 新选项创建）
- **oas-slider**：`label`（滑块可访问名/值标签，对齐 input label 契约）
- **oas-splitter**：`disabled`（禁用拖拽，面板尺寸冻结）
- **oas-steps**：`size`（五档）
- **oas-table**：`table-layout`（fixed/auto 透传）+ `hover`（行 hover 底色开关）+ `filter-icon` 插槽 + `indent-size`（树形缩进 px）+ `row-expandable`（行展开谓词，property）+ `max-height`（表体限高滚动 + 表头吸顶）+ 事件 `oas-cell-click` / `oas-row-dblclick`
- **oas-tabs**：`tabindex`（标签钮透传）
- **oas-text**：`size`（字号档位，对齐 typography 体系）
- **oas-textarea**：`autocomplete`（透传）
- **oas-time-picker**：`hide-disabled-options`（禁用选项隐藏而非灰显）+ `label`（触发器命名）
- **oas-timeline**：`size`（五档）
- **oas-transfer**：`pagination`（长列表分页，对齐 pagination 组件契约）+ 事件 `oas-scroll`（列表滚动到底/滚动事件，懒加载通道）
- **oas-tree**：`size`（五档）+ `block-node`（整行块级选中态）+ `selectable`（整树选中开关）
- **oas-tree-select**：`input-value`（filterable 输入受控）+ `label-in-value`（value 携 label 对象）+ `suffix-icon` 插槽
- **oas-upload**：事件 `oas-progress`（上传进度回调，内部进度已驱动 UI，补对外事件通道）

### 验收（同 P1 批口径）

- TDD RED→GREEN；api:check 双向 0；组件 md 中英 demo 可见反馈；dark/RTL 过；交互项 qa-regression 固化；门禁全绿 + 收口 review

## v2.5.7 divider 线型扩展（双虚线 / 双点线）

### 特性

- **oas-divider `variant` 新增 `double-dashed`（双虚线）/ `double-dotted`（双点线）**：复用 double 的「加高容器 + 双层」结构（线宽×2 + `--oas-divider-double-gap` 间隙，token 一处调全局）× dashed/dotted 的 repeating-gradient 渐变线型（多重背景分层画上下两条线，段长与单线版完全一致：虚线 4px 实 4px 空、点线 2px 实 4px 空）。仅水平布局生效——垂直方向线型为既有隐式边界（含既有的 dashed/dotted/double），本次随 demo 文档显式注明

### 验收

- 单测：类映射互斥（不含单线类）、双层渐变分层（上线贴顶/下线贴底、层高取线宽）、加高容器与 double 同构；e2e（chromium + firefox）背景含两条 repeating-linear-gradient；浅/暗截图识图复核（双排形态可辨、与单线版可区分、暗底对比正常）

## v2.5.7 浮层箭头形状 token 化（7 组件）

### 特性

- **7 个浮层组件箭头形状/位置/圆角 token 化**（tooltip / popover / popconfirm / dropdown / hover-card / tour / navigation-menu）：
  - `--oas-<comp>-arrow-width` / `--oas-<comp>-arrow-height`（默认各 12px，宽高独立——宽高比即三角的高与角度；tooltip 既有 `--oas-tooltip-arrow-size` 保留为回退别名）
  - `--oas-<comp>-arrow-radius`（箭头圆角，默认 0）
  - `--oas-tooltip-arrow-align-offset` / `--oas-tour-arrow-align-offset`（`*-start/*-end` 对齐侧偏移，默认 16px——命名避开 tooltip 既有 `arrow-offset` 属性〔`arrow-position="side"` 的距端间距，默认 4〕的语义撞名）
- **JS/CSS 同一真源**：popover / popconfirm / dropdown 的 point-at-center 定位 clamp 由写死常量改运行时读 token（共享 `cssVarPx()`，宿主改形状时定位边界同步跟随）；tooltip 的 `arrow-position="side"` JS 定位同步改读宽/高分量的对应轴
- merge 直角三角为独立 8px 校准几何，不受形状 token 影响

### 验收

- 单测：happy-dom 对 `calc(var()/…)` 不求最终数值，悬边断言改锁「token 回退 12px 后半值外探」的表达式形态（真实浏览器数值由 e2e 验证）；全量 7373 passed
- e2e（chromium + firefox）：宽高独立生效（20×8 宽扁）/ 悬边随 height 分量 / align-offset 生效 / radius 生效 / merge 不受影响 / popover clamp 读 width token
- 视觉核验：默认 vs 宽扁(22×8) vs 窄高(8×20) 三对照浅/暗截图 + 识图复核（形状差异两色可辨、暗底对比正常）

## v2.5.7 能力缺口 D 类立项批（27 条）

> 立项来源：场景缺口甄别 D 类池（28 条中 D11 chart 雷达/极坐标/组合图按「chart 不深挖（2026-09-24 用户定）」既定决定排除，实际 27 条）。口径：语义覆盖为准，命名对照 ui-spec §2。

### 新组件（1 条）

- **oas-highlight**（D1，data 族）：文本命中高亮——`text`（原文）+ `highlight`（关键词，多词空格分隔或 JSON 数组）+ 大小写/整词/重音不敏感开关 + 命中片段 mark 渲染（样式走 token，::part(highlight) 开口）+ 命中计数事件；SSR 快照直出

### 既有组件增强（26 条）

- **oas-code**（D2）：行高亮（`highlight-lines`）+ 行聚焦（`focus-lines` 其余淡化）+ diff 模式（`diff` 属性 + `+`/`-` 前缀行红绿着色）+ 最大行数折叠（`max-rows` + 展开尾行）
- **oas-icon**（D12）：`iconfont-url` 脚本加载通道（远程 iconfont 项目集成：加载 + 注册别名前缀）
- **oas-auto-complete**（D3）/ **oas-cascader**（D4）：选项虚拟滚动（`virtual`，长列表性能档，对齐 select 既有虚拟滚动契约）
- **oas-date-picker**（D5）/ **oas-time-picker**（D6）：`timezone`（IANA 名 / UTC / local 默认）——「今天/此刻」锚点与时刻解析按指定时区（Intl 通道）
- **oas-input**（D7）：`mask` 输入掩码（`#` 数字 / `A` 字母 / `*` 任意，如 `###-####`；`mask-raw` 控制提交值为去格式化的原始值）
- **oas-select**（D20）：`hide-selected`（多选时已选选项从下拉隐藏）
- **oas-popover**（D21）：`same-width`（面板与触发器同宽，对齐 select 既有同宽惯例）
- **oas-table**（D8/D9/D15）：`exportable`（导出 CSV/Excel——客户端生成，表头/当前数据）+ 键盘网格导航（`grid-navigation`：方向键在单元格间移动焦点，role=grid 语义）+ 行拖拽排序（`row-draggable` + `oas-row-reorder`）
- **oas-form**（D10）：嵌套 name 路径语义（`users.0.name` 点路径解析进 values 嵌套对象/数组）+ `oas-form-list` 动态字段组（add/remove 项、嵌套 name 自动索引、校验/提交随主表）
- **oas-menu**（D13）：`searchable`（菜单顶部过滤输入框，实时过滤项）+ 菜单项 `shortcut` 字段（kbd 标注，对齐 menubar shortcut 视觉契约）
- **oas-tree**（D16）：整树全选/取消全选（`check-all` 顶部全选项或 selectAll/clearAll 方法，含 indeterminate 态）
- **oas-list**（D14）：`sortable` 行拖拽排序（对齐 tabs sortable 机制惯例 + `oas-reorder`）
- **oas-carousel**（D17）：`thumbs` 缩略图指示器（缩略图条替代圆点，当前项高亮描边）
- **oas-splitter**（D18）：`snap` 拖拽吸附档位（如 `snap="25,50,75"` 百分比，拖到附近吸附）
- **oas-progress**（D22）：`vertical` 垂直方向（circle 之外的第三条形态轴）
- **oas-masonry**（D27）：`sequential` 顺序瀑布流（按原始顺序逐列填充而非最短列优先）
- **oas-modal**（D28）：`maximizable`（标题栏最大化/还原按钮，与 fullscreen 属性同语义联动）
- **oas-calendar**（D24）：`calendar-system`（非公历历法，Intl calendar 选项透传：chinese/islamic/hebrew 等）+ `months`（多月份并排面板数，默认 1）
- **oas-color-picker**（D25）：`recent`（最近使用色条——选中色入栈，面板底部展示；`recent-key` 可配 localStorage 持久化键）
- **oas-slider**（D26）：多滑块泛化（`value` 支持 N 元数组 → N 把手，range 为 N=2 特例；每把手独立 aria-label）
- **oas-marquee**（D23）：`max-loops` 限定循环次数（播完定格末帧 + `oas-finish`）+ RTL 方向复核
- **oas-upload**（D19）：`crop` 图片上传前裁剪（picture/picture-card 形态：选择后弹裁剪对话框——自由/固定比例 + 缩放，确认后入列；canvas 离屏裁剪）

### 验收（同 P1/P2 口径）

- TDD RED→GREEN；api:check 双向 0 + unresolved 零；md 中英 demo 可见反馈；dark/RTL 过；交互项 qa-regression 固化；门禁全绿 + 收口 review

## v2.5.8 table 横向虚拟滚动 + editComponent 组件编辑器

### 特性

- **oas-table `column-virtual` 横向虚拟滚动（双向虚拟补齐）**：非固定列窗口化——DOM 只渲染窗口列 th/td，窗口外列以占位格 colSpan 归并（宽度由 colgroup 对应列求和，`table-layout: fixed` 强制启用）。列宽模型复用 virtual-list 的 HeightCache（横向换轴），全列显式 width；未设宽列按预估 100px 定宽截断（文档注明）。约束（告警降级，对齐行虚拟先例）：多级表头 / span-method / 合计行与列窗口错位不兼容；固定列须两端布局（left 段 → 非固定段 → right 段）且恒渲染
- **oas-table-edit `editComponent` 组件编辑器通道**：列配置 `editComponent`（columns JSON 字段）指定任意 value 语义的 WC（库内 form 组件 / 宿主自定义组件同通道，优先于原生 editor）——双击挂载组件并注入当前值（attribute + property 双通道）、`oas-change`/`change` 提交、Esc 取消；多行编辑器 Enter 让路。单元格编辑器标准化第一期（非浮层组件；浮层类编辑器后续批次）

### 验收

- e2e（chromium）：60 列×40 行大宽表——th/td 窗口化（<30）、scrollWidth >7200（colgroup 撑总宽）、固定列恒渲染、行列双开滚动推移 + thead/tbody 窗口一致性、编辑×列窗口定位回归；全量 8306 passed
- table 域全量单测绿（全仓 8306 passed，含列窗口/编辑协议回归 8 条）；format 0；lint:md 0；api:check 通过（editComponent 语料同步——attribute 收割外字段，说明在正文）

## v2.5.8 table 字段类型系统 + 分组视图

### 背景

多维表格类场景评估（2026-09-28）的组件库边界内立项：字段类型系统是 editComponent 通道的自然下半篇——用户不再自己拼编辑器组件，columns 声明 `type` 即得「展示渲染器 + 编辑器」成套行为。分组视图是表格展示的基础形态之一。

### 特性

- **oas-table 列 `type` 字段类型系统**：columns JSON 加 `type` 字段——`text`（默认，现状）/ `number`（右对齐 + 千分位）/ `currency`（货币符号 + 千分位 + 右对齐，`currency` 列字段配符号，默认 ¥）/ `select`（badge 渲染，`options` 列字段配 value/label/color）/ `multi-select`（badge 组）/ `date`（YYYY-MM-DD 格式化）/ `checkbox`（只读勾选态）/ `link`（主色下划线，新标签页）/ `progress`（0-100 进度条）/ `rate`（0-5 星级）。编辑器复用既有通道：input 系（text/number/currency/link/progress/rate/date 输入校验）→ 原生 input；select → 既有 `editor: 'select'` + editOptions；checkbox → oas-switch（非浮层）。列级 `type` 与 `render`/`cellTemplate` 并存时自定义渲染优先。浮层类编辑器（oas-select / oas-date-picker 挂载编辑）为后续批次
- **oas-table `group-by` 分组视图**：按指定字段值分节——分节头行（字段值 + 组内计数 + 折叠箭头）+ 组内数据行；折叠状态默认全展开，点击分节头切换；排序作用于组内行；分节头作为 flat 行的一种 kind 参与行虚拟滚动（与 expand 行先例同构）；与 column-virtual 正交（分节头 colSpan 全宽行走 columnCount 先例）；group-by 与 merge / span-method / row-draggable 互斥（告警降级）

### 验收

- 10 种字段类型的展示渲染 + 编辑器挂载 + 提交回写全单测；select/badge 颜色 token 化（暗色可读）；分组视图分节/折叠/计数/排序组内/行虚拟双开单测 + e2e（chromium）；全量单测绿；format 0；lint:md 0；api:check 通过（语料同步）

## v2.5.8 oas-kanban 看板组件

### 背景

多维表格类场景评估（2026-09-28）立项：看板是六种视图之一，纯前端可做、组件库边界内。新组件，data 族。

### 特性

- **oas-kanban 看板**：`columns`（JSON [{ key, title }] 列定义）+ `cards`（JSON [{ id, column, title, ...任意字段 }]，column 为所属列 key）声明式数据，attribute JSON + property 数组双通道（setter 反射 attribute）；卡片拖拽换列 + 列内排序（HTML5 DnD，落点主色插入指示线——悬停卡上半/下半区分插前/插后、空列/列尾尾部标记）→ 落定回写 cards attribute 并派发 `oas-change`（detail：{ id, from, to, index }，index 为移除卡片自身后的目标列插入位；拖回原位零操作不派发）；列头标题 + 计数；列体独立纵向滚动；空列占位文案走 i18n（10 语言包），`empty-column-text` 属性覆盖；卡片默认渲染 title，自定义走 `renderCard`（property 函数通道，(card) => Node | string——Node 直挂、字符串纯文本防注入；函数在场时数据不反射）；触屏降级：卡片移动按钮（pointer:coarse 显示）上移/下移/移到指定列（边界项 aria-disabled），菜单支持键盘操作（开菜单焦点移交首项 + 方向键漫游 + Home/End + Esc 回焦锚点）；键盘可达：卡片 tabindex=0（listitem）、非空列体 role=list（空列不设 list 语义）。第一期不做：列拖拽重排、泳道、WIP 限制、卡片多选

### 验收

- 拖拽换列事件与数据回写、同列排序口径、原位零操作、取消路径指示线清除、触屏按钮移动、空列态、renderCard 契约单测 + e2e（chromium 真实拖拽序列 + 触屏按钮）；键盘可达；全量单测绿；api:check 通过（新组件 manifest + 语料 + demo 中英）

## v2.5.8 table 单元格性能专项（单例化 + 内存基线）

### 背景

大数据表格场景的已知性能模式（2026-09-28 工程调研）：单元格内每格一份交互组件实例（tooltip 等）在大宽表下是数百个 WC 实例；频繁创建销毁带来内存压力。立项两件：高频场景单例化 + 内存回归门禁。

### 特性

- **oas-table `cell-tooltip` 单元格溢出提示（单例浮层）**：单元格文本溢出省略号时 hover 显示全文——表格级单一浮层实例（事件委托 + 定位复用 floating 引擎），不为每格创建组件实例；仅对纯文本单元格生效（自定义渲染单元格自管）；`cell-tooltip` 属性开关（默认开）
- **table 内存回归基线（qa-regression）**：大宽表（60 列 × 40 行窗口化渲染）+ 滚动若干帧后 Chromium JS heap 采样——增长阈值断言（heapUsed 滚动后增幅 < 基线 20%）；渲染实例数断言（表格节点数 / WC 实例数上限）

### 验收

- cell-tooltip 溢出显示/非溢出不显示/单例实例数=1/暗色可读单测 + e2e；内存基线用例稳定通过（chromium）；全量单测绿

## v2.5.8 table 编辑器完成度批次（浮层编辑器 + multi-select 升级）

### 背景

editComponent 第一期约定非浮层组件（浮层类的 blur 判定缺口）；multi-select 第一期为逗号分隔 input 占位。本批补齐：浮层类组件挂载编辑 + multi-select 换多选组件。

### 特性

- **浮层类组件编辑器通道**（editComponent 第二期）：`oas-select` / `oas-date-picker` 等浮层组件挂载单元格编辑——浮层面板交互（点选项/翻日历）不触发 focusout 误提交；浮层关闭（选定/外点）即提交；Esc 第一层关浮层、第二层取消编辑；进入编辑自动打开浮层（触发器 click 非受控通道——不写受控 open 属性，组件自身开合语义不受扰）
- **multi-select 编辑器升级**：`type: 'multi-select'` 列的编辑器由逗号分隔 input 换为 oas-select multiple（勾选多个选项，options 同步）；提交回写数组；第一期逗号分隔通道退役（CHANGELOG 记行为变更）

### 验收

- 浮层编辑器（select/date-picker）挂载/选定提交/Esc 双层级/外点提交/编辑中滚动不被拆 全单测 + e2e；multi-select 勾选多个提交回写数组单测 + e2e；全量门禁绿

## v2.5.8 kanban 二期（列重排 + WIP 限制 + 卡片多选 + 泳道）

### 特性

- **列拖拽重排**：列头拖拽手柄换列序 → 派发 `oas-column-reorder`（detail { from, to, keys }）；触屏降级：列头内左移/右移按钮（coarse）
- **WIP 限制**：列定义 `limit`（数字）——超限列头计数转 warning 色 + `data-over-limit` 标记；拖入超限列正常落定（限制为提示语义非阻断）
- **卡片多选**：Ctrl/Cmd 点击逐枚切换、Shift 点击范围选（同列内）；选中态样式（`data-selected` + token 色）；多选拖拽任选一枚移动全部选中卡（派发一条 oas-change，detail 含 `ids` 数组——与单选 detail 兼容（id 取首枚））；触屏不做多选（单卡移动按钮不变）
- **泳道**：`swimlane-by="字段key"`——按该字段值横向分带横贯各列（泳道头行：字段值 + 计数 + 折叠）；卡片拖拽跨泳道即改泳道字段值（oas-change detail 含 swimlane from/to）；泳道带内的空列单元格显示占位（泳道带由现有卡片派生——无整带全空形态）；与列拖拽重排/多选正交。泳道语义对齐分组视图的 flat 行先例

### 验收

- 四项各自的单测 + e2e（真实拖拽/键盘/触屏按钮）；多选批量移动事件契约；泳道折叠/跨带拖拽/空带占位；全量门禁绿

## v2.5.8 core 断开重连架构（render-once 重绑）

### 背景

OASElement 的 render 生命周期只首连一次（`rendered` 门闩），组件断开重连（append/re-parent/路由缓存摘挂——宿主框架常见操作）后 bind 不重跑：shadow 内事件委托/observer 视各组件 cleanup 摘除与否处于失绑或侥幸存活的不一致态（table 的 wrap/tbody 委托摘除后全灭、kanban shadow 根监听保留幸存）。库级统一治理。

### 特性

- **重连重绑统一语义**：`connectedCallback` 在非首次连接时重跑 bind 面（组件 bind 幂等化——addEventListener 同 handler 同 target 天然去重；observer 类（ResizeObserver/MutationObserver）重挂）；`disconnectedCallback` 清理语义统一（document/window 级摘除 + shadow 级随元素 GC 不摘）
- **oas-table / oas-kanban 先行接线**（本批暴露问题的两个组件），其余组件按同模式批量核
- 不重建 shadow DOM（render-once 保留——性能语义不变；只补绑定）

### 后续批输入（报批项——affix 接线与 filter panel 已于同批后续 commit 落地（onReconnect 受益者接线批 + 监听生命周期化），下两条仍为开放报批项）

- **常驻监听型组件接线**：oas-affix（window resize+scroll 常驻监听——断开被 cleanup 摘、重连无钩子 → 吸顶失灵）等「常驻监听型」组件按 table/kanban 同模式接 onReconnect（交叉审补扫全仓发现的 onReconnect 真实受益者）
- **table filter panel 监听残留**：面板开着时断开组件，onDocClick/onKey 监听残留 document（靠监听器自摘兜底）——filter panel 的监听改跟面板生命周期走

### 验收

- core onReconnect 钩子（首连不调/重连调/render 不重建/cleanup 清空重注册）单测 2 条；table 3 条（scroll 监听恢复窗口推移 + 排序委托不重复挂 + ResizeObserver 重挂）与 kanban 2 条（拖拽恢复 + applyMove spy 直接锁调用次数——零操作判定兜底会让 events=1 的假绿无处遁形）的「断开→重连→交互恢复」单测；抽查 dropdown/menu/tooltip/select/date-picker 五组件——全部「监听跟打开态/触发态走」模式（kanban 菜单同款先例），天生免疫重连无需接线；全量门禁绿

## v2.5.8 文档批（表单视图 recipe + i18n 自定义语言包指南）

### 特性

- **表单视图 recipe**：docs 食谱页新增「多维表格式记录编辑」模式——table 字段类型 + oas-form 组合的完整可拷贝示例（记录详情编辑表单 + 校验 + 提交回写链路）
- **画册/日历视图 recipe**：同页补两个场景——画册（按字段分组的卡片墙：oas-card + oas-tag 状态徽章，分组键驱动列）+ 日历（oas-calendar 的 oas-cell-render 铺格：事件点 + 悬停明细，detail.date 为 Date 对象需格式化 ISO key 比对）——表格/画册/日历共用同一份记录数据的三种投影
- **i18n 自定义语言包指南**：README/faq 补 step-by-step——复制 zh-CN 为模板、LocaleMessages 类型标注（缺 key 编译期报错）、dir RTL 标注、registerLocale/setLocale 注册切换、按需分包建议

### 验收

- recipe 页面 demo 真实可交互（e2e 过 demo-coverage/smoke 自动收集）；i18n 指南代码示例真实可编译（类型断言链）

## v2.5.8 宿主属性撞名遮蔽 + 文档批修复

### 特性

- **`prefix` / `suffix` / `blur` / `mentions` 遮蔽（宿主全通道可用）**：这些属性名撞 DOM 只读访问器（`Element.prefix`）或方法（`HTMLElement.blur`）——React 19 / Vue 绑定按 `key in el` 走 property 写入：`prefix` 撞只读 getter 会抛错并**崩掉整棵 React 树**，`blur` 撞方法会**覆盖 `blur()` 方法且属性不落**。用 `Object.defineProperty` 在原型上遮蔽并映射到规范属性（`prefix-text` / `suffix-text` / `blur` / `trigger`），恢复 `715e20b8` 误删的 property 通道；`suffix` 无 DOM 对应为对称处理，`mentions` 的 `prefix` 是 `trigger` 的遗留别名。`prefix-text` / `suffix-text` 仍是规范名，`prefix` / `suffix` 为兼容别名。

### 修复

- **文档批**：recipes 三个 demo 因内联 `<script setup>` 落在 `DemoBlock` 槽内不被 Vue 编译而全部死掉 → 改**页级单脚本** + 修正 API 契约（`oas-dialog`→`oas-modal` + `visible`、`form.validate`→`form.submit` + `oas-submit`、`rules` 上提表单级、switch 初值走 `checked`）；i18n README/faq 修正不存在的 key / spread 目标 / 键数 / 插槽与 CustomEvent 归因；faq 新增「React / Vue 属性名撞 DOM property」冲突清单与解法。
- **宿主 / CDN 验证**：React playground 的 `prefix` 崩溃根治 + kanban 桥接样例；`dist/cdn.js` 的 kanban 一致性；`a11y carousel` autoplay 致对比度实测漂移的 flaky 修复（定时冻结）。

### 验收

- 单测：5 组件 + mentions + backdrop 的 property 通道（含 null→removeAttribute）；`pnpm test` 全绿。
- e2e：`qa-regression/property-shadow`（真浏览器 property 通道）+ `collision-guard`（撞名守卫 ratchet）+ `playground.spec`（React/Vue 宿主 smoke）+ `cdn-kanban` + guide 页 console-sweep；全量 e2e 全绿。
- 文档：FAQ zh/en 镜像；CHANGELOG / PRD / ROADMAP 同步。

## v2.5.9 表单读值通道 + 默认校验时机根治

### 特性

- **oas-input 及「字符串输入系」公开 `value` property（get/set）**：此前 `value` 只有 attribute 写入通道 + `oas-*` 事件通知，宿主程序性读当前值只能监听事件自存 state 或穿透 shadow 读内部控件（脆弱）；字符串输入系组件均无公开 `value` property（`oas-checkbox` / `oas-switch` 等另有既有 `value` property）。补齐 `oas-input` / `oas-textarea` / `oas-input-number` / `oas-auto-complete` / `oas-mentions` / `oas-combobox` 的公开读/写通道：`el.value` 读取该组件 `getFormValue()` 语义的当前值（parser/mask 感知、label/值分离、实时解析等各自口径），`el.value = x` 写受控 `value` 属性并强制回写内部控件、不派发事件（对齐原生 `input.value` / `textarea.value` 的受控赋值即生效语义）。React/Vue 受控集成与宿主读写不再需要样板。

### 修复

- **oas-form 弹窗内两段式提交被布局位移吞掉（默认校验时机对齐主流表单库）**：默认 `validate-trigger` 由 `change`（DOM change = 文本失焦语义）改为 `input`（边输入边校验）——错误在用户点击提交前即已结算，从根上消除「点击瞬间错误文案增删 → 布局位移 → 提交按钮从指针下被顶走 → `click` 按规范落到 mousedown/mouseup 两目标的最近公共祖先而非按钮 → 吞掉整次提交」。原缺陷表现为 `oas-modal` 包裹内「校验失败 → 修正 → 再提交」时 `oas-submit` 不派发 / 弹窗不关 / 表格不更新（直连 oas-form 因残留错误文案恰在点击前已结算而侥幸通过）。`change` / `blur` 档保留，且这些档下已出错字段在输入时亦实时复校、改对即清。
- **oas-form 字段级异步校验 vs 提交跨路径竞态（独立 review 实抓并复现）**：默认 `input` 后每次击键都可能起一笔字段级异步校验；若用户在它落地前提交，其慢旧结果会在 `finalizeValidation` 之后写回，覆盖提交终态——表现为「提交通过却仍标红 / `getErrors()` 含幽灵错误」或「提交失败的错误被静默清掉」。修法：提交与 `reset()` 进入即作废全部在途字段级异步校验（`fieldValidateSeq.clear()`）。回归 I5。

### 验收

- 单测：`oas-form.test.ts` validate-trigger 组（默认 input + blur 档 onTouched）+ 6 个输入系组件各 4 条 value property 断言；`pnpm test` 全绿。
- e2e：`qa-regression/form.spec.ts` 两段式（真实 `oas-modal` + 真实指针点击）+ `qa-regression/input.spec.ts` value property（真浏览器）；**原始缺陷场景实证**：oas-ui-templates cdn-mpa `category.spec.ts:48`（编辑回填 + 必填校验 + 改名校验生效）在 2.5.8 原 dist 下 `1 failed`（表格不更新）、修复 dist 下 `4 passed`（RED→GREEN）；全量 e2e 全绿。
- 文档：`form.md` / 6 组件 md（zh/en）+ `api-descriptions` + `api-manifest` 同步（api:gen 重生成）；CHANGELOG / PRD / ROADMAP 同步。

## v2.5.9 oas-scheduler 日程调度组件（L3 能力子包，分期交付）

> 立项背景：Calendar/Scheduler 级能力按「独立子包隔离大面」落地（L3 能力子包先例），分期交付、每期独立立项与门禁。

### P0 —— 月视图 + events CRUD（本期）

- **oas-scheduler 日程调度组件（data 族，`@oas-ui/ui` L3 能力子路径）**：月视图（复用 calendar 日格引擎），日格内渲染事件芯片（标题 + 色条，>N 合并为「+N 条」）；`events` property 读/写（`SchedulerEvent[]`：`{ id?, date, title, color?, start?, end? }`）+ **CRUD 方法**（`addEvent` / `updateEvent(id, patch)` / `removeEvent(id)`，id 缺省自动分配）→ 数据变更派发 `oas-events-change { events }`；点事件芯片派发 `oas-event-click { id }`、点日格派发 `oas-day-click { date }`（宿主接编辑器/表单，组件不内置表单）。纯 UI 态，不做持久化。
- 边界（后续期）：P1 周/日视图 + 拖拽移动/缩放；P2 重复规则（RRULE 子集）+ 提醒；P3 时区 + 日程（agenda）视图。**P0–P3 均已交付**（P1 周/日时刻表视图 + 拖拽移动/缩放 + oas-view-change；P2 repeat 重复展开 + remind 定时提醒；P3 timezone + agenda 日程视图）

### 验收

- 单测（渲染/CRUD/事件派发/数据变更）+ docs（zh/en）+ api-manifest + i18n ×10 + 全量 e2e 全绿。

## v2.6.2 oas-scheduler 纵深（资源视图 + 拖拽创建 + 当前时间线）

> 立项背景：scheduler 已具月/周/日/日程四视图。本批把它从「日历」升级为「排班工具」，核心是资源维度。版本号由用户定。

### 特性

- **资源视图（两布局）**：`SchedulerView` 联合新增 `'resource' | 'resource-week'`。
  - `view="resource"`（单日横向时间轴）：行 = 资源，列 = 小时（复用 `start-hour` / `end-hour` 与当前日期 `page-show-date`）。事件按 `start` / `end` 渲染为横条；无 `start` 的全天事件排在资源行首的「全天」带。
  - `view="resource-week"`（周 × 资源）：行 = 资源，列 = 本周 7 天。每格渲染该资源当日事件；有 `start` 的按纵向时刻排布，无 `start` 的置格顶「全天」带。
  - 数据：新增 `resources` property + attribute JSON 双通道，`SchedulerResource = { id, title, color? }`；`SchedulerEvent` 增 `resource?: string`（资源 id，缺省归「未分配」行）。
  - 交互：事件可拖拽移动（同时改 `resource` 与时刻）、可拖拽拉伸改时长；点空格派发 `oas-day-click`（detail 增 `resource`）。
  - ARIA：网格 `role="grid"`，资源行为 `role="row"`，事件为 `role="gridcell"`；键盘可达（Tab 进网格、方向键移动、Enter 派发 `oas-event-click`）。
- **拖拽创建 `oas-create`**：在 week / day / resource 视图的空时间格里按住拖动，拖出一个时间段；释放派发 `oas-create` detail `{ date, start, end, resource? }`。组件不自动建事件（不知标题），宿主监听后调 `addEvent`。位移不足 15 分钟视作点击（派发 `oas-day-click`）；`pointercancel` / Esc 取消且不派发。
- **当前时间线 `show-now`**：week / day / resource 视图在今天的时间区显示一条 now 线，每分钟刷新；`show-now="false"` 关闭（默认显示）；时间在可视时窗外时不显示。

### 边界（本批不做）

- 跨日事件连续条（事件仍按单日渲染）。
- 资源容量、冲突检测、超额排班（归宿主）。
- 拖拽创建后的自动编辑表单（仍由宿主接 `oas-create`）。
- 一事件多资源分配（`resource` 为单值）。

### 验收

- 单测：两种资源视图渲染（单日横向 + 周 × 资源）/ 事件按时刻定位 / 跨资源与跨日拖拽 / 拖拽创建阈值与取消 / now 线定位与刷新 / `show-now="false"` / i18n 键 / 非法 `resources` 清洗。
- e2e：`qa-regression/scheduler.spec.ts`（资源视图真拖 / 拖拽创建真拖派发 / now 线存在 + 暗色 + console 零告警）。
- 文档：scheduler.md zh/en 增章节；api-manifest / api-descriptions 同步（`api:check` 双向 0）；i18n ×10。
- 全量 `pnpm test` / `typecheck` / `build` / `api:check` 全绿。

## v2.6.2 oas-gantt 纵深（依赖连线交互编辑 + 行重排 + 基线对比）

> 立项背景：gantt 已具任务树、四种依赖、拖拽三件套、六档刻度、虚拟滚动，摘要进度已按子任务工期加权汇总（`buildRows` 内 `aggregate`）。本批补三项能力。定位不变——组件是宿主数据的可视化与编辑层，不做排程引擎；关键路径等排程计算仍归宿主（见边界）。

### 特性

- **依赖连线交互编辑**：悬停任务条出连线点，拖到目标任务建依赖（端点决定 FS/SS/FF/SF）；点已有连线选中，`Delete` / Backspace 删除。派发 `oas-dependencies-change` detail `{ taskId, dependencies }`。
- **行拖拽改父子 / 重排**：拖左列行到目标行，改 `parent` 与同级顺序；派发 `oas-reparent` detail `{ id, parent, index }`。
- **基线对比**：`GanttTask` 增 `baseline?: { start: string; end?: string }`；`show-baseline` 布尔（默认关）开启后，实际条下叠浅色基线条 + 差值标注。基线数据由宿主保存，组件只读不写回。
- **拖拽自动滚动**：拖条 / 拉伸 / 拖连线靠近视口边缘时横纵自动滚动（越靠边越快、到边界停）；行重排仅纵向；自动滚动触发的窗口重建后自动重锚进行中的拖拽。
- **里程碑连线点单点**：里程碑 start == end，只出完成端单点（fs 惯例）。行重排命中计算加缓存（万级不生每帧 O(n)）。
- **多选与批量**：点击行选中（单选）、`Ctrl`/`Cmd` 加选、`Shift` 连选；`selection` property + `oas-selection-change`；`removeTasks(ids)` 批量删除（连同后代）。`readonly`/`disabled` 下仍可选中（选择属查看态）；键盘 `Delete` 跳过 disabled 任务。
- **行内重命名**：双击名称就地编辑（Enter 提交 / Esc 还原 / 失焦提交），派发 `oas-tasks-change`。
- **键盘与触屏**：行聚焦后 `↑/↓` 移焦、`空格` 选择、`Alt+↑↓` 同级移动、`Alt+←→` 升降级、`F2` 重命名；连线命中路径可聚焦、`Enter`/`Delete` 删除该依赖；触屏点条揭示连线点。

### 边界

- 关键路径、依赖联动排程、undo/redo、编辑表单、导出：归宿主（宿主责任边界）。
- 资源分配 / 资源泳道、资源负载视图、资源平衡：不做（组件无资源实体，另立项）。
- 拖拽建任务：不做（组件无空白行模型，新建由宿主按钮驱动）。
- 依赖 lag/lead：不做（组件不重排后续任务，lag 只改连线视觉会误导）。
- 多任务框选：不做。
- `disabled` 任务语义：**只锁自身数据**——不可被拖（作源）、不可作依赖**后继**、不可作重排 **drop-inside** 目标；但可作他任务的前置（连线源）与重排前/后同级目标（均不改其自身数据）。

### 验收

- 单测：连线创建各型 / 连线删除 / 行重排改 parent 与 index / 基线渲染与差值 / `show-baseline` 关闭不渲染 / i18n 键。
- e2e：`qa-regression/gantt.spec.ts` 增真拖断言 + 暗色 + console 零告警。
- 文档：gantt.md zh/en 增章节；api-manifest / api-descriptions 同步（`api:check` 双向 0）；i18n ×10。
- 全量 `pnpm test` / typecheck / build / api:check 全绿。

## v2.6.2 oas-gantt 任务管理创作能力（命令式增删改 + 行内新建 + 缩放）

> 立项背景：他人用 oas-gantt 搭「任务管理甘特」时，组件只提供「编辑现有数据」，造数据只能整体重写 `tasks`。本批补「创作闭环」——命令式增删改、行内新建、视图缩放，并提供可照抄的完整示例。定位不变：不做排程引擎（关键路径/联动排程仍归宿主）。

### 特性

- **命令式数据操作**：新增方法 `addTask(task?, opts?)`（返回新 id）/ `moveTask(id, { parent, index })` / `duplicateTask(id, opts?)`（深拷贝子树，内部依赖重映射到克隆 id，返回新 id）/ `addDependency(taskId, dep)` / `removeDependency(taskId, dep)` / `updateDependency(taskId, from, to)` / `updateTasks(patches[])`（批量浅合并，返回生效条数）。写回统一反射 `tasks` 属性 + 重渲染（`addTask`/`updateTasks` 经清洗层，非法 `end` 显式拒绝）；派发既有 `oas-tasks-change` / `oas-reparent` / `oas-dependencies-change`，并新增 `oas-task-add`（detail `{ id, task }`）供宿主定位新建项。
- **行内新建**：`creatable` 布尔（默认关，非破坏）开启后——行尾出「＋」（摘要行加子级、叶子行加同级后继）、双击空白区按落点日期建任务；新建后直接进入行内重命名。
- **视图缩放**：`zoomIn()` / `zoomOut()` 沿六档刻度步进；`fit()` 取**最细且能容纳全部任务的档**（全任务可见前提下尽量保留细节）。
- **完整示例**：gantt.md 增「任务管理」段——列表 + 甘特联动、增删改、依赖编辑、导出 JSON，并给出用 `oas-modal` + `oas-form` + `oas-date-picker` 组装任务详情编辑的官方示例。

### 边界

- 关键路径、依赖联动排程、undo/redo、导出、内建编辑弹窗仍归宿主/不做（任务详情编辑器以官方示例提供，不入组件本体）。
- `creatable` 默认关；未开启时零新增交互与 DOM。

### 验收

- 单测：七方法各自增删改语义 + 不合法输入零副作用 + 事件派发；`creatable` 行内新建（摘要加子级/叶子加同级）+ 双击空白按日期建 + 只读/禁用守卫；`zoomIn`/`zoomOut`/`fit` 档位；i18n 键。
- e2e：gantt.md 新示例真点（建/删/改/依赖）+ 暗色 + console 零告警。
- 文档：gantt.md zh/en 增段；api-manifest / api-descriptions 同步（`api:check` 双向 0）；i18n ×10。
- 全量 `pnpm test` / typecheck / build / api:check 全绿。

## v2.6.2 oas-gantt 任务管理增强（依赖联动排程 + 框选多任务 + 拖拽建任务）

> 立项背景：承接「任务管理创作能力」，补齐「改前置、后置顺延」「一次选多条」「空白拖出任务」三项高频诉求，使组件从「能画」到「能用」。定位不变：不做完整排程引擎（关键路径、资源不碰）。

### 特性

- **依赖联动排程**（`auto-schedule` 布尔，默认关）：日期发生变更（拖拽/键盘/`updateTask`/`updateTasks`）或依赖增改后，按 FS/SS/FF/SF 沿依赖图对**后继**做**最小前推**（只推迟、不提前，保持各自工期），级联至稳定；跳过 disabled 与摘要行（摘要日期派生）；成环安全（迭代有界）。收口派发 `oas-reschedule`（detail `{ ids }`，被联动改动的任务）+ 因联动改动的 `oas-tasks-change`（若无联动改动则不发这两个事件）。关闭时不产生任何行为变化。
- **框选多任务（marquee）**：左侧列表空白纵向拖 → 按行带选中；时间轴空白拖（未开 `creatable` 时）→ 按条相交选中。普通替换、`Ctrl`/`Cmd` 追加。结果写入既有 `selection` 并派发 `oas-selection-change`；只读下仍可框选（选择属查看态）。与拖条/拖行/连线点/行内新建互不冲突。
- **拖拽建任务**（`creatable` 开启时，时间轴空白拖出区间）：按起止落点日期建相应跨度任务并进入重命名；双击空白按当天建（既有）保留。

### 边界

- 关键路径、lag/lead、资源分配/泳道/平衡、undo/redo、内建编辑弹窗、图片/打印导出仍归宿主/不做。
- `auto-schedule` 默认关（非破坏）；摘要作前置按后代聚合区间约束；触屏上时间轴的框选/拖建不接管手势（留给原生滚动，触屏走「＋」/双击/左侧列表框选）。

### 验收

- 单测：四型依赖各自最小前推 + 级联 + 环安全 + 跳过 disabled/摘要 + 关闭时零行为；框选（行带/条相交/修饰键/只读）+ 与拖拽互斥；拖拽建任务跨度与守卫。
- e2e：gantt.md 新示例真点（开 auto-schedule 拖前置看后置顺延；框选；空白拖建）+ 暗色 + console 零告警。
- 文档：gantt.md zh/en 增段；api-manifest / api-descriptions 同步（`api:check` 双向 0）。
- 全量 `pnpm test` / typecheck / build / api:check 全绿。

## v2.6.2 oas-gantt 排程深化（依赖 lag/lead + 关键路径）

> 立项背景：承接 `auto-schedule` 排程引擎，补齐排程的两块「能用」要素——依赖偏移（lag/lead）与关键路径，使组件能回答「谁拖了会拖累整体」。

### 特性

- **依赖 lag/lead**：`GanttDependency` 增 `lag?: number`（单位天，可负=提前/重叠）。`auto-schedule` 的约束改为带 lag：`fs: t.start ≥ d.end + lag`、`ss: t.start ≥ d.start + lag`、`ff: t.end ≥ d.end + lag`、`sf: t.end ≥ d.start + lag`。`addDependency` / `updateDependency` 透传 `lag`（缺省 0，向后兼容）。连线命中 `aria-label` / `data-lag` 反映 lag。
- **关键路径**（`show-critical-path` 布尔，默认关）：在依赖图 + 工期上以**当前排期为基准**反向推最晚时间算总时差，总时差=0 的任务高亮（条加 `.critical` 类，颜色走 `--oas-gantt-critical-color`）。只读展示、不改数据；重算随 `update()`。

### 边界

- 仍不做：资源分配/泳道/负载/平衡、undo/redo、内建编辑弹窗、图片/打印导出、工作日日历排程、约束类型（不得早于/固定开始）。
- 两者默认关（非破坏）。

### 验收

- 单测：lag 四型约束（含负 lag）+ lag 透传/deep-clone 保持 + 关键路径判定（链上全关键、并行支路非关键、lag 影响、无依赖/单任务、成环安全）+ `show-critical-path` 关闭不渲染 `.critical`。
- e2e：gantt.md 新示例真点（开 show-critical-path 看高亮）+ 暗色 + console 零告警。
- 文档：gantt.md zh/en 增段；api-manifest / api-descriptions 同步（`api:check` 双向 0）。
- 全量 `pnpm test` / typecheck / build / api:check 全绿。

## v2.6.2 oas-gantt 排程约束与工作日日历

> 立项背景：在「依赖 + lag + 关键路径 + 最小前推」之上补两块排程必需——任务约束与工作日日历（跳过周末/假日）。定位仍为「可视化 + 编辑层 + 轻量排程」，不做资源/平衡与完整 CPM。

### 特性

- **任务约束**：`GanttTask.constraint`（`'asap'` 默认 / `'snet'` 不得早于 / `'mso'` 固定开始 / `'fnlt'` 不得晚于完成）+ `GanttTask.constraintDate`。`auto-schedule` 生效：`snet` 取起始下限、`mso` 固定开始（与依赖冲突时标 `conflict`）、`fnlt` 为软截止（违反标 `conflict`，不自动移动）。
- **工作日日历**：属性 `workdays`（JSON 周几数组，`0`=周日…`6`=周六，**opt-in**，缺省不限制）+ 复用既有 `holidays`。`auto-schedule` 前推结果**吸附到下一个工作日**（跳过非工作日与假日）。
- **工程修正（本批一并）**：① `updateDependency` 把 lag 清为 0/缺省时**删键**而非留 `lag: 0`；② 依赖图 **SCC 分解**——仅**环内**节点让位（`auto-schedule` 与关键路径都只跳过环内、其余正常排程/判关键），替代原「一遇环整图停摆」；③ 关键路径改**按（缩点后）拓扑序**计算，O(V+E)，替代有界迭代松弛；④ 示例补 `lag` 数据以展示连线 lag 标签。

### 边界

- 不做：资源分配/泳道/负载/平衡、ALAP 反向排程、按小时的班次/工时日历、`fnlt` 的自动回拉（只标记违反）。
- `workdays` 缺省不限制（非破坏）；约束缺省 `asap`（非破坏）。

### 验收

- 单测：四型约束各自行为（含与依赖冲突 → conflict）+ `constraintDate` 校验；工作日吸附（跨周末 + 假日）；SCC 环内让位（环外仍排程/判关键）；CP 拓扑序结果与既有用例一致；`updateDependency` 清零删键；缺省无约束/无 workdays 时零行为变化。
- e2e：gantt.md 新示例真点（`workdays` 下拖前置、后置吸附工作日；`auto-schedule`+`show-critical-path` 组合高亮）。
- 文档：gantt.md zh/en 增段；api-manifest / api-descriptions 同步（`api:check` 双向 0）。
- 全量 `pnpm test` / typecheck / build / api:check 全绿。

## v2.6.2 oas-resource 资源负载 / 泳道视图（新组件，data 族）

> 立项背景：让「用 oas-ui 做项目管理」的人能看资源。gantt/scheduler 均不承载资源视图；本件为**纯视图层**：给定资源与任务，渲染资源泳道（共享时间轴）+ 负载直方图（超载高亮）。**不做排程/平衡引擎**（平衡以纯函数导出、由宿主决定是否回写）。定位与边界：组件库只做视图与交互；资源实体与容量由宿主提供。

### 特性

- **属性/property**：`resources`（JSON `[{ id, name, capacity?, color? }]`，`capacity` = 该资源每档（period）可并行任务数，`day` 档即每天，缺省 1；`color` 为可选 CSS 颜色或 token，用于该泳道任务条与负载柱着色）、`tasks`（JSON `[{ id, name, start, end, resources?: string[] }]`；`resources` 为分配的资源 id 列表）、`scale`（day 默认 / week / month）、`height`、`locale`、`capacity`（全局缺省容量）。
- **视图**：左侧资源名列（按资源分组），右侧**共享时间轴的资源泳道**（每资源一行，行内画其任务条——单色条，任务名/起止日期/资源名经 aria-label 可读）；下方**负载直方图**：按档（日/周/月）统计每资源「并行任务数」，`负载 > capacity` → 超载高亮（token 色）。泳道与直方图**列宽/刻度/横向滚动联动**；表头纵向吸顶（默认开，`header-sticky="false"` 可关闭），角落名列横向滚动时保持贴边。
- **事件**：`oas-task-click`（`{ id, task, resourceId }`）、`oas-overload`（`{ overloads: [{ resourceId, period, load, capacity }] }`，超载态变化时派发——每次更新至多一次、同一超载态不重复派发，避免事件风暴）、`oas-tasks-change`（`{ tasks }`，程序写 tasks property 时派发）。
- **可读性开关（opt-in，默认关）**：`show-load-values`（负载柱顶数字，超载 danger 色、`aria-hidden`）、`show-overload-badge`（行头「超载 N 档」徽标，i18n `resource.overBadge`）、`bar-label`（条内任务名，单行省略）；`day` 档刻度按列宽稳定抽稀（网格线保留，周/月档不变）。
- **官方组合示例**：文档站 `guide/resource-management` 用 `oas-resource` + `oas-card` + `oas-checkbox` + `levelResources()` 搭出资源卡/分配表/平衡/后移反馈（宿主层组合，非新组件）。
- **方法**：`scrollToDate(date)`；**平衡（可选，纯函数）**：`levelResources(resources, tasks, opts)` 导出——`mode: 'shift'`（缺省）保工期、把超载档内较晚任务整体顺延；`mode: 'reassign'` **不改日期**、把任务改派给「整段都有余量」的资源（尊重 capacity、按最空闲目标择一；找不到目标即停，不退化顺延；多资源任务只替换超载的那一个）。返回「被改动任务数组」；组件**不自动改数据**（宿主据返回值 `tasks=` 回写）。
- **CSS token**：`--oas-resource-*`（沿用 `--oas-color-*`），暗色/高对比有变体；无硬编码色。

### 边界

- 不做：排程引擎、资源成本/工时日历（capacity 仅并行数）、按资源的时间轴联动之外的复杂视图、自动回写平衡。
- 不反向依赖 gantt/scheduler（只依赖基础 + 容器）。

### 验收

- 单测：`resources`/`tasks` 解析与容错（非法/缺省/未知资源 id）；泳道按资源分组与行高计算；负载统计（day/week/month）与超载判定；`levelResources` 纯函数（保工期/只延后/确定性/无超载收敛/上限；reassign 模式：日期不变、整段容量校验、目标取最空闲、无目标不改派、多资源只替换超载分配、maxIter）；`oas-overload` 派发；`scrollToDate`；缺省/空态零异常。
- e2e：新增 `resource.md` 页 demo 真点（超载高亮可见、平衡按钮回写后超载消失、暗色）+ console 零告警。
- 文档：新增 `resource.md` zh/en（进自动收集面）+ api-manifest / api-descriptions 同步（`api:check` 双向 0）+ i18n ×10（若需文案）+ CHANGELOG `[2.6.2]`。
- 全量 `pnpm test` / typecheck / build / api:check 全绿。

## v2.6.2 时间轴列虚拟化（oas-gantt / oas-resource 横向窗口）

> 立项背景：做「能支撑百万级数据的项目管理产品」时，甘特/资源的纵向已窗口化（行），但**横向时间轴全量渲染**——长跨度（day 档跨约 10 年 ≈3650 列）时表头刻度与底色格按列数线性增长（甘特每次滚动还重建全量周末格），成为第一瓶颈。本批把「行×列」二维窗口补齐。定位：纯渲染层优化，**不改公开 API**（缓冲列数为内部常量）。

### 特性

- **列窗口（两组件共用内核）**：复用 `computeVirtualWindow(scrollPos, viewport, itemSize, count, buffer)`（`data/virtual-list/oas-virtual-list.ts`，轴无关）——横向传 `scrollLeft`（RTL 取绝对值，负值模型）、视口宽、列宽、列数。
- **oas-gantt**：表头主/辅刻度与周末/假日底色格按窗口 ±overscan 渲染；主刻度保留与窗口相交的组；任务条/连线沿用行窗口（不按 x 再裁，行为不变）；`.inner` 画布宽保持 `列数×列宽`（滚动范围与 `xOf`/镜像数学不变）。
- **oas-resource**：`scroller` 滚动驱动窗口——刻度与负载直方图列切片，泳道任务条按窗口像素相交裁剪（保留 overscan 与最小条宽）；画布宽保持 `period 数×列宽`；`scrollToDate` 同帧出窗口。
- **滚动合帧**：滚动改 rAF 合帧（同帧多次 scroll 只渲染一次），拖拽自动滚动在合帧后重锚；组件卸载取消未决帧。
- **容器尺寸自愈**：变宽/变高经 ResizeObserver 触发窗口重算（无需滚动即补齐新暴露区域，不露白）。
- **`height` 修正（gantt）**：属性映射到 `--oas-gantt-height`（此前真实浏览器无效、与文档/demo 声明不符）；宿主自身 `height` 内联**只框定外盒**、不拉伸内部画布（整体调高请用 `height` 属性或 `--oas-gantt-height`）；非法/空串按未设置、仅清本实例自写值，不覆盖宿主 token。
- **`height` 协议对齐（resource）**：与 gantt 同协议——合法值才写 `--oas-resource-height`、非法/空串不写变量（仅清本实例自写值，不覆盖宿主 token）；resource 高度在 `:host` 规则上，宿主内联 `height` 可直接拉伸。
- **视口不可测时回落全量**：测不到 `clientWidth`（SSR / 无布局）时窗口退化为全列，行为与改动前一致。
- **工程**：`oas-resource` 负载矩阵由「资源 × period × 任务」三重循环改单趟归档 + 二分区间累加（`O(Σspan) + O(S·log P)`），输出逐字节一致；泳道任务条裁剪由全量扫描改「升序二分 + 区间最大值段树」下探（帧成本随窗口内条数而非总量）。

### 边界

- 不做：列宽可变（当前同档列宽统一，故无需宽度前缀和/`WidthCache`）、横向按 x 裁剪任务条与依赖连线（避免行为变化）。

### 验收

- 单测：gantt/resource 各自列窗口数学（含 RTL 负 scrollLeft、回落到全量、滚动窗口平移、画布宽不变、条相交裁剪）。
- e2e：`qa-regression/scale.spec.ts`——gantt 万行 × 约 3650 列、resource 5000 任务 × 1096 period 的渲染节点上界 + 中部可见覆盖 + 数据量翻倍对照；gantt/resource 既有 e2e 改按文本/日期定位（不再依赖 DOM 全局索引）。
- 文档：CHANGELOG `[2.6.2]`；公开 API 无变更（`api:check` 双向 0）。
- 全量 `pnpm test` / typecheck / build / api:check 全绿。

## v2.6.2 数据密集型组件规模化（行窗口协议 + 资源/看板虚拟化）

> 立项背景：让组件库能支撑「项目管理软件」的百万级数据——此前只有 table/tree/gantt 有本地行虚拟化，且宿主必须把全量数据喂进组件（内存/传输双输）。本批补「服务端行窗口协议」（宿主只喂可视窗口）+ resource 纵向虚拟化 + kanban 卡片虚拟化。定位：纯前端契约与渲染层；后端由宿主/其他系统负责。

### 特性

- **共享行窗口契约** `shared/window-data.ts`：`oas-window-request` 事件 + `{ start, end, reason }`（半开区间、绝对行号；reason ∈ init/scroll/resize/data）；`windowed` + `total` + `window-start` 三属性统一语义；前后各 8 行缓冲、未被已装载区间覆盖才派发、同一期望区间去重。
- **`oas-table` windowed 模式**：组件不持有全量数据；本地排序/筛选/分组/分页/树形展开交由宿主（跳过本地执行并 devWarn），按行能力（选中/编辑/点击）在已装载切片上正常。
- **`oas-resource` 纵向虚拟化**：泳道与负载行按窗口渲染、spacer 守恒滚动总高、行按资源 id 键控复用（焦点保持）、与列虚拟化正交。
- **`oas-kanban` 卡片虚拟化**：列体按窗口渲染（动态卡片高用 `dynamic-height` 内核）、占位守恒列滚动范围、拖拽落点用绝对位次、滚动重建回焦同卡。
- **`oas-gantt` / `oas-resource` windowed 模式**：`windowed` + `total` + `window-start`（切片绝对行号）+ `range-start` / `range-end`（宿主托管时间轴，ISO 日期；`range-end` 含当日）；事件 `oas-window-request` / `oas-range-request`。windowed 下 gantt 跳过 `auto-schedule` 与关键路径（devWarn）。
- **`oas-scheduler` 虚拟化**：资源行窗口 + 时间轴（小时轴）窗口（DOM 有界、总高守恒、手势期间抑制重建）；修复资源视图滚动跳顶（清空 DOM 前先读 `scrollTop`，否则被钳回 0）。
- **增量渲染**：`oas-table` 仅选择变化时复用扁平化/汇总缓存、只 patch 受影响行（行节点身份保持）；`oas-gantt` 选择变化复用 rows/units/关键路径缓存、只 patch 窗口内行/条，并把行点选/连选/键盘相邻定位改为 O(1) 索引；单选档 radio 选中态改同步写终态。
- **`oas-tree` / `oas-list` windowed**：树为根节点切片（子节点随根、懒加载不变；根级绝对 a11y 口径 + `aria-selected`；windowed 下本地 filter/check-all 禁用、键盘边界派请求、回填滚动锚定），列表为行切片（绝对行号 + 组件自持 `list/listbox` 语义、分组头 presentation、需可测视口否则不请求）。
- **`oas-kanban` 步长可配**：`card-estimate` / `--oas-kanban-card-step`（属性优先，默认 68，实测自动收敛）；程序化跳滚改为滚动事件内同步重算窗口。

### 边界

- 不做：后端/数据源本身、windowed 下的服务端排序/筛选实现（属宿主）；resource/kanban 的横向跨区虚拟化（列/泳道数通常少）。

### 验收

- 单测：共享契约纯函数；table windowed（请求派发/去重/绝对行/本地操作禁用/键盘越界请求/编辑与点击行号口径一致/aria 绝对行号）；resource 行虚拟化（窗口/守恒/焦点/正交）；kanban 卡片虚拟化（窗口/守恒/拖拽/回焦）；gantt windowed（扁平切片/轴托管/能力禁用/键盘越界/aria 绝对口径/状态复位）；resource windowed（RTL×windowed/越界告警/range 非法回落）；scheduler 虚拟化（行窗/小时窗扣 band/回焦/aria/极端行高）。
- e2e：table windowed 滚动→请求→回填渲染绝对行；resource 500 资源行数上界+总高不变+中部覆盖+条可点（含 RTL×windowed）；kanban 3000 卡列内容有界+拖拽落点；gantt windowed 轴托管+range 请求；scheduler 资源行/小时轴窗口覆盖 + 多全天事件（band 多行）顶部刻度/事件可见 + 滚动回焦。
- 文档：table / gantt / resource zh/en windowed 专节；api-descriptions/manifest 同步（`api:check` 双向 0）；CHANGELOG `[2.6.2]`。

## v2.6.2 视觉语义：甘特行斑马纹 + 看板优先级强调色

> 立项背景：甘特行没有横向单元格线、看板需要按优先级快速辨识；统一采用「默认中性、可选强调」：颜色只编码语义，不大面积上色。

### 特性

- **oas-gantt `stripe`（默认关）**：按绝对行号奇偶给行加底色（虚拟化/窗口化稳定），token `--oas-gantt-row-stripe-bg`（缺省 `--oas-color-bg-hover`）；选中/周末覆盖条纹。任务色继续用 `GanttTask.color`。
- **oas-kanban `cards[].color` / `columns[].color`（可选）**：仅 3px 强调条（卡片左侧/列头顶部，逻辑属性 RTL 镜像），不改布局；缺省零变化。

### 边界

- 不做整行/整卡/整列彩虹背景；颜色不承载唯一信息（行名/标题/数值仍可读）。

## v2.5.9 oas-calendar `events` 排期条目通道

### 特性

- **一等公民 `events` 属性/属性通道**：声明式 `[{ date, title?, color? }]`——当日有条目时格内渲染圆点（有 `color` 用之、无则主色），多于 2 条合并为 `+N` 徽标；悬停/聚焦当日出**行内条目浮层**（日历 shadow 内自渲染，标题逐行 + 色点），不经宿主手写 `oas-cell-render` 监听（该事件保留为兜底）。不做：跨日条目、拖拽改期、周/日程视图（属 Scheduler，另行立项）。

### 验收

- 单测（events 解析/标记/徽标/浮层/与 oas-cell-render 共存）+ docs calendar.md（zh/en）+ api-manifest 同步；全量 e2e 全绿。

## v2.6.0 oas-barcode 一维条码组件

> 立项背景：一维条码面向打印标签/扫码枪的 B 端作业场景（WMS 仓储标签、零售 POS、物流单号、箱码），与 vision 的企业后台/作业场景吻合；组件库品类空白位。与 `oas-qrcode` 编码与渲染零共享（条空宽度序列 vs 模块矩阵），仅复用组件骨架惯例（SVG-only 渲染、download() 离屏栅格化、空态/错误占位、role=img 可访问名、i18n ×10）。

### 特性（第一期 6 码制）

- **码制**：`code128`（默认，auto A/B/C 子集自动切换——C 段两位一符密度翻倍、控制字符段自动切 A）/ `ean13` / `ean8` / `upca`（首位 0 退化形态 ⊂ EAN-13，首位/末位按标准渲染在护条外侧）/ `code39`（43 字符表，自动大写化）/ `itf14`（交插 2of5 固定 13+1 位箱码）。编码实现全部原创自公开行业标准（GS1 GenSpec / ISO/IEC 15417 / 16388 / 15420），零第三方依赖。
- **校验位**：EAN/UPC 系给 12/7/11/13 位数据自动补算 GS1 mod10 校验位；给全码则校验末位合法性。
- **非法输入三类**（字符集 / 位数 / 校验位）：渲染错误占位（i18n）+ 派发 `oas-invalid` 事件（detail `{ reason: 'charset' | 'length' | 'checksum' }`，同一非法输入只派发一次），宿主可接管提示；`download()` 对非法值静默返回（不产出不可扫的图）。
- **可扫性内建**：`margin` 静区缺省即 `10 × bar-width`（默认产物即可扫，不依赖宿主设置），显式值低于下限时收敛并 console.warn 一次（护栏：宿主可加大不可破坏）；`bar-width` clamp ≥1；默认深条（`#18181b`）+ 固定白底不随主题（dark 下同样可扫，`--oas-barcode-color` / `--oas-barcode-bg` 双变量可覆）；EAN/UPC 护条按标准向下延伸 5X。
- **宽度由内容决定**：不设 `size`/`width` 属性——整体宽度 = 静区 ×2 + 护条外侧沟槽 + 总模数 × `bar-width`（与 qrcode 最反直觉的 API 差异，文档写清）。
- **人读文字（HRI）**：`display-value` 默认显示（显式 `"false"` 关闭）、`text-position` top/bottom、`font-size`/`text-margin`；文字用 generic sans（OCR-B 无自由许可不内嵌，宿主可 @font-face 自接后经 `::part(text)` 覆盖）。
- **输出**：内联 SVG（crispEdges）+ `role="img"` + aria-label（i18n `barcode.image`）；`download()` 复用 qrcode 式离屏 4× 栅格化 PNG。

### 工程

- 编码器拆纯函数层 `src/data/barcode/encoders.ts`（条/空 run 序列统一产物形状 + 护条/HRI 分段模块坐标，可独立单测，对齐 qrcode shapes.ts 分层惯例）；组件层只做归一/渲染/事件。
- TDD：六码制逐码制已知样例断言（条宽序列/校验位/mod103 校验符/交错对）、非法输入三类 reason、margin clamp+warn、SVG 结构/静区/download 产物、dark 白底。

### 验收

- 单测（编码器 37 + 组件 31）+ docs（zh/en）+ api-manifest + i18n ×10 + qa-regression e2e + 全量门禁全绿。
- 后续期边界：CODE128 强制子集（force A/B/C）、GS1-128（FNC1/AI）、UPC-E、MSI/Codabar/Pharmacode、EAN addon、ITF-14 承载框（bearer bar）——按真实需求逐项立项。

## v2.5.9 主题皮肤预设 + 默认视觉精修

### 特性

- **可选皮肤预设层 `@oas-ui/theme/skins.css`**：6 套品牌色皮肤（`violet` / `emerald` / `rose` / `amber` / `graphite` / `teal`），`data-skin` 叠加于 `data-theme` 之上、与三套内置主题自由组合；皮肤仅覆盖 `--oas-color-primary`，`-hover` / `-active` / `-primary-text` / 焦点环等派生档自动跟随；opt-in 无副作用（不引则完全无影响）。定位为可选增强层，不进核心（核心保持中性 / 框架无关）。
- **默认投影精修**：阴影三档改现代分层投影（两层：近距硬边 + 远距柔和扩散），提升默认观感与层次感。

### 验收

- `packages/theme/skins.css` + `package.json` exports/files + README / `guide/theming.md`(zh/en) 同步；纯 token 层、无组件改动；全量 e2e 全绿（`visual.spec` 只截图不比对基线，阴影改动不触发视觉回归）。

## v2.5.9 移动原生形态批

> 立项背景：组件并集矩阵偏桌面（24 源中移动源仅 Ant Design Mobile / Ionic / Quasar），移动端虽有响应式 + coarse pointer 触屏降级 + bottom-sheet / bottom-navigation，但移动原生交互形态存在 5 项真缺口（2026-10-04 立项评估）。

### 特性

- **oas-notice-bar 通告栏**（feedback 族，低复杂度）：图标 + 滚动文本（复用 marquee 引擎）+ 可关闭 + action 链接 + 多条轮播；i18n ×10。
- **oas-index-bar 索引栏**（navigation 族，低-中）：数据驱动分节列表 + 字母侧栏（点按/拖拽跳转分节）+ 滚动联动当前字母高亮（scrollspy 复用 anchor 先例）；键盘可达。
- **oas-pull-refresh 下拉刷新**（feedback 族，中）：滚动容器顶部下拉手势——scrollTop=0 判定 + 阻力曲线 + 阈值释放进 refreshing 态 + 宿主回调结束复位；状态机 idle/pulling/refreshing/success（release 为 pulling 内文案/箭头相位非独立 phase）走 i18n；与原生滚动协调（touch-action / overscroll-behavior），桌面端不干扰滚轮。
- **oas-swipe-cell 滑动操作**（data 族，中）：列表项横向滑动露出操作按钮组——pointer capture 横滑（slider 拖拽先例）+ 阈值/速度吸附开合 + 单开互斥 + 外点/滚动关闭；操作按钮键盘可达（焦点入列不读屏跳变）。
- **oas-picker 滚轮选择器**（form 族，中-高）：移动式滚轮列（scroll-snap 惯性 + 选中居中）+ 多列 + 列联动（cascade 数据）+ value / oas-change；每列 listbox/option 语义 + 方向键选中；form-associated（OASFormElement）。

### 验收

- 单测：5 组件 TDD（手势走合成 pointer 事件；picker 选中同步/联动/键盘）；`pnpm test` 全绿。
- e2e：qa-regression 各组件固化（pull-refresh 真手势链 / swipe-cell 开合互斥 / picker 滚动选中）+ 移动仿真视口；全量 e2e 全绿。
- 文档：5 组件 md（zh/en）+ api-manifest + i18n ×10 + PRD/ROADMAP 同步；新组件前置规矩（ui-spec §2 命名对照、颜色只走 token 含暗色）。

## v2.5.9 液态玻璃材质层

> 立项背景：液态玻璃（Liquid Glass）材质风格支持——非换色、是材质：半透明 surface + backdrop 模糊 + 高光描边 + 大圆角 + 分层阴影。本库「颜色只走 token」硬约束使 surface 集中于少数变量，可做到一层变量全局切换（2026-10-04 立项）。

### 特性

- **玻璃皮肤包 `packages/theme/glass.css`（opt-in，独立文件）**：surface token（`--oas-color-bg` / `bg-elevated` / `bg-hover` 等）改 rgba 半透明档（明暗两套 alpha）、border 半透明白、radius 档加大、shadow 分层加深；不引则零影响，与 skins.css 机制同构但独立成文（含材质效果变量，不只是品牌色）。
- **全局材质效果变量**：`--oas-glass-blur`（默认 `none`）+ `--oas-glass-ring`（默认 transparent 不可见；立项时曾拟名 specular，实现定为 ring——高光描边环）——surface 类组件（card / modal·drawer·popover 面板 / menu / dropdown / message·notification·toast / bottom-sheet / app-bar / sidebar / table 容器与表头等约 20-30 件，含移动原生批新组件）统一样式接线 `backdrop-filter: var(--oas-glass-blur, none)` + `outline: 1px solid var(--oas-glass-ring, transparent)` 消费；默认零影响，玻璃皮肤置值即全库启用。机制先例：`oas-backdrop` 的 `--oas-backdrop-blur`、modal 的 `--oas-modal-mask-blur`。
- **边界（克制）**：苹果的折射/透镜动态效果属平台级渲染，CSS 只能近似，不做追逐；blur 只上容器级 surface，行级/长列表不上（性能）；提供降级档（变量置 none）。

### 验收

- 感知对比度实测门禁：玻璃皮 alpha 档在代表性渐变/图背景下实测，<60 分零容忍（明暗双主题）。
- 单测：接线组件 backdrop-filter 变量消费断言；`pnpm test` 全绿。
- e2e：明暗双主题截图审 + 真实背景可读性核对；全量 e2e 全绿。
- 文档：theming.md（zh/en）玻璃层用法 + PRD/ROADMAP 同步。

## v2.6.0 玻璃边缘折射 v1

> **v2.6.2 收口更新**：本批静态边缘折射已移除——Chromium 执行 data-URI SVG 位移滤镜，Firefox 忽略，造成同组件轮廓锯齿与视觉尺寸分叉；保留半透明、backdrop 模糊、折光边、阴影和指针动态高光，详见 CHANGELOG。以下内容为历史实现记录。
>
> 承接液态玻璃批的如实口径：静态磨砂近似已发布（v2.5.9），本批补 Apple 定义的标志性特征「边缘折射变形」。**范围纪律（用户定）**：Apple 定义的材料范围是控制/导览/系统体验（按钮、开关、滑块、标签页栏、边栏、通知、控制中心）——本批只在对应元素落地，不无限扩展到全部浮层（内容面板不进 v1；动态流动感/实时光学高光仍属后续）。

### 特性

- **边缘折射滤镜（glass.css 内置 data-URI）**：`--oas-glass-refraction` 指向自包含 SVG 滤镜，法向位移链——① `feComponentTransfer` discrete 阈值（alpha≥0.5→1）把半透明玻璃面与不透明面统一归一为实心剪影（**不归一则玻璃面中心偏离中性**，review 实抓：这是「中心恒不变形」与表面透明度无关的前提）；② `feGaussianBlur` 3px + alpha 入 RGB 生成平滑过渡带；③ Sobel 双卷积（bias 0.5）把轮廓梯度编入 R/G 通道——**每个边缘带获得沿自身法线的位移矢量（轮廓整体微膨胀），平坦区恒 0.5 中性**；④ `feDisplacementMap`（xChannel=R/yChannel=G）scale=10，膨胀峰值实测 ±4px（外包络宽高各 +8px 双轴对称）。**只有边缘环带变形、中间恒不变形**（对照社区「全局折射致浑浊拉丝」教训，限边缘是本批硬要求；初版 45° 对角拖影经实测定为不合格，改法向）。实现选型：`url(#id)` 片段引用在 shadow DOM 内无法跨 shadow 边界解析（实测静默忽略），data-URI 内联滤镜在任何树内天然可解析；CSP 禁 data: 时滤镜引用失效的表现由浏览器决定（主流按忽略滤镜处理），严格 CSP 宿主可显式覆盖 `--oas-glass-refraction: ;`（空值——`none` 与 button 态的 `brightness()` 混排会使整条声明非法，review 实抓）。滤镜区域横向 -50%/200%、纵向 -100%/300%：给位移与分层投影主下探留缓冲（-8%/116% 硬切投影并裁掉 app-bar 溢出弹层、-50%/200% 对矮元素仍可能切在衰减段，review 两轮实抓）。

- **消费范围（对应 Apple 定义域，逐项映射）**：oas-button / oas-switch / oas-slider（把手）/ oas-app-bar / oas-bottom-navigation / oas-message / oas-toast / oas-snackbar / oas-notification（盒体）。统一经 `filter: var(--oas-glass-refraction, none)` 消费——不引 glass.css 或无 `data-glass` 时回落 none，零副作用。三个状态例外：oas-button 的 hover/按下/选中态把 `brightness()` 与折射变量**组合**书写（不互相覆盖；空值 fallback，无 glass.css 时仍只剩 brightness）；禁用态显式关折射跨组件统一——oas-button（`[disabled]` / `aria-disabled` / `disabled-focusable`，含 hover/active/选中反超守卫）、oas-switch（含 busy，busy 同样原生 disabled）、oas-slider（`input:disabled` 双伪元素分条书写）——禁用控件静态无装饰变形（通行做法：禁用只灭交互与装饰，不抹选中态颜色——button-group 禁用 × 选中保留主色描边为有意设计，已加注释与回归锁）；oas-app-bar 溢出弹层打开期间经组件内中性标记 `:host([data-panel-open])` 关折射（filter 非 none 会把向下弹出的面板裁进滤镜区域；该标记由组件维护、不依赖玻璃运行时——仅引 glass.css 或 reduced-motion 下同样安全；宿主在栏内容置浮层时建议容器级关折射，已写入 theming 文档）。
- **画廊 controls 展示行**：舞台加按钮/开关/滑块控件行，静态置换近似可见；文案同步（折射已交付为静态置换，动态流动仍后续）。

### 边界

- 内容面板（modal/drawer/popover/select 系面板）不进 v1——超出 Apple 定义域且大面积置换成本高易翻车；
- 行级/长列表不接（与 blur 同一性能纪律）；
- 滤镜不可用时（如宿主 CSP 禁 data:）表现由浏览器决定（主流按忽略滤镜处理），严格 CSP 宿主可显式覆盖变量为空值；
- **引擎边界（如实）**：折射位移在 Chromium 系真实生效；Firefox 对 CSS `filter` 的 data-URI SVG 滤镜不执行位移（实测开/关仅 ±1 LSB 栅格噪声）——安全无感降级为无折射，不破坏渲染；WebKit 引擎按 engineering §2 方法实测**真实执行**（Playwright WebKit 本机：开/关像素差异 4.55%、backdrop 模糊共存、pageerror 零、画廊渲染与 Chromium 一致——macOS/iOS 真机 Safari 同引擎源码，私有特性差异接受为已知边界）；
- 位移是渲染后像素操作：布局/命中区不受影响（scale=10，膨胀峰值实测 ±4px 约束视觉膨胀与热区偏差）。

### 验收

- 单测：data-URI 滤镜链结构（discrete 阈值归一 + Sobel 梯度入 R/G 双通道 + feDisplacementMap scale=10 + 滤镜区域横向 -50%/200% 纵向 -100%/300%）/ 9 组件消费断言 / 范围纪律（modal/drawer/popover + select 全族不含折射变量）/ app-bar data-panel-open 关折射中性钩子 / 缺省回落 none；
- e2e：data-glass 下 computed filter 生效（含 slider 把手伪元素）/ 无 data-glass 时安全降级 / 像素级断言（Chromium：整体开/关必不同 = 滤镜真实执行 + 中心区开/关一致 = 中间恒不变形硬约束；Firefox：开/关视觉无差 = 无感降级契约，防假绿）/ filter 与 backdrop-filter 共存（折射生效时模糊不丢）/ 文档化降级路径（容器覆盖空值后基础态 none 且 button hover 亮度反馈仍在）/ app-bar 弹层打开期间 filter 回落 none / 布局盒不变（双主题）；
- 全门禁 + 双引擎 + perf:size 预算不突破。

## v2.6.0 oas-gantt 甘特图组件

> 立项背景：项目排期语义（任务/工期/依赖/进度）与 oas-scheduler 的约会语义（日历格/事件）互补不重叠，为独立组件（data 族）。数据契约以扁平 `parent` 指针为主（嵌套 `children` 输入在清洗层自动拍平兼容）；依赖连线用 SVG 单画布覆盖层（FS/SS/FF/SF 四型）；非法/边界约束组件内建（坏数据清洗丢弃、悬空 parent 按根渲染并告警一次、progress 越界 clamp、非法 scale 回退 day），宿主责任（undo/redo、编辑表单、导出）文档明示。

### 特性

- **行树 WBS**：父任务摘要条（时间 = 子任务并集、进度 = 子任务工期加权平均），折叠/展开集合走 `expanded` 属性（JSON 数组，缺省全展开、显式 `[]` 全收起）+ `oas-expand-change`；悬空 parent 按根渲染并 console.warn 一次。
- **任务条三形态**：task（进度填充 + 标签 `label-position` inside/right/left，缺省 none——行名列已承载名称，条旁不重复）/ milestone（无 `end` 推导，菱形）/ summary（摘要条）；条色 `color` 走 CSS 变量解析；`template[slot="task"]` + `oas-task-render` 双通道定制。
- **依赖连线**：`dependencies: [{ id, type?: fs/ss/ff/sf }]`，SVG 单画布绘制折线 + 箭头（虚拟滚动下只画窗口行内的连线，目标悬空跳过）。
- **时间刻度六档**：`scale` hour/day/week/month/quarter/year，双层表头（上层主刻度合并 + 下层辅刻度，列宽被压窄时按 N 抽稀辅刻度标签、保留格线，防日号/月号堆叠；列宽下限保证标签有立足位），非法值回落 day；`snap` 吸附当前刻度（可关，按像素比例平移保留时间精度）；`first-day-of-week` + `locale` 本地化。
- **拖拽三件套**：拖条身改期（保工期）/ 左右手柄拉伸（不越过对侧）/ 条内圆点改进度，pointerup 收口一次性写回并派发 `oas-task-change`（含 old/new）与 `oas-progress-change` + `oas-tasks-change`；零位移零事件；Esc/pointercancel 取消回滚零事件；拖拽中外部重写 `tasks` 终止拖拽回滚；键盘 Shift+←/→ 改期一格（RTL 镜像）。
- **只读三级 + 任务级禁用**：`readonly`（全禁）/ `dates-readonly` / `progress-readonly`；只读态不渲染拖拽手柄（视觉即语义）；数据 `disabled: true` 单条禁拖。
- **今日线与日历底色**：`show-today`（默认开，装饰层 aria-hidden）+ `weekends` 周末列高亮（day/hour 档）+ `holidays` 假日列表。
- **行虚拟滚动**：行数超出视口只渲染窗口行 + buffer（名称列/任务条/连线/底色全部窗口化）；方法 `scrollToTask(id)`（命名避开 DOM 内建 Element.scrollTo）/ `scrollToDate(date)` / `scrollToToday()` / `updateTask(id, patch)`。
- **宿主责任边界**：undo/redo（组件发全量事件，宿主维护历史栈）、编辑表单（`oas-task-dblclick` 宿主接 oas-dialog）、导出（数据转换属业务层）、关键路径与依赖联动排程（排程计算，组件不做）；基线对比改归组件（见「v2.6.5 oas-gantt 纵深」段）。

### 验收

- 单测 69 条（渲染/刻度六档/行树折叠/依赖连线四型/拖拽三件套收口与取消/虚拟滚动/只读三级/今日线/RTL 镜像/暗色 token 纪律/tasks 通道与方法）；`pnpm test` 全绿。
- e2e：`qa-regression/gantt.spec.ts`（渲染/刻度切换/折叠/真指针拖拽改期/tooltip/暗色/console 零告警）；全量 e2e 全绿。
- 文档：gantt.md（zh/en）+ api-manifest + api-descriptions + i18n ×10 + PRD/ROADMAP 同步。

## v2.6.0 chart 图型扩展（radar / polar-area / combo / multi-axis）

> 立项背景：场景缺口甄别 D11（chart 雷达/极坐标/组合/双轴）原随「chart 不深挖（2026-09-24）」定夺排除，2026-10-05 随 BI 议题翻盘重立——立场仍是不做全面深挖，只补这四类图型。已定夺（2026-10-06）：radar 维度走 labels 复用 + `options.max` 全局量程（per-dim 量程留兼容位不做）；alignTicks v1 就做（BI 报表读者误读代价高）；combo 不设 type 值；multi-axis 进 options 层。

### 特性

- **type 新值 ×2**：`radar`（雷达图）/ `polar-area`（极坐标面积图，kebab 对齐 `stacked-bar` 惯例）。**combo 不设 type 值**（三库共识：组合 = 系列级覆盖）——顶层 `type` 为缺省系列型，`series[].type ∈ bar/line/area` 逐系列覆盖，缺省/非法静默回退顶层型；**multi-axis 进 options 层**（三库共识：双轴是坐标系配置不是图型）——`options.yAxis` 数组（第 2 项存在即启用右轴，上限 2 轴），`series[].yAxisIndex: 0|1` 归属绑定。
- **radar**：labels 即维度名（ChartData 零迁移、与折线/柱状共享数据心智）；`options.max` 全局统一量程（缺省取全系列 max 走 nice 刻度）；`options.radarShape: polygon|circle` 网格形态（默认同心多边形）；刻度值沿顶轴标注、维度名在顶点外侧；顶点 `<title>`（维度: 值）与图例/配色/fade 动画全复用。逐维独立量程不做——BI 场景各维通常已归一化，宿主可先行归一化兜底。
- **polar-area**：每分类等角扇区（跨度 360/n）+ 半径编码值（最大值满半径）+ 同心参考圈（1/3、2/3、满半径）提供径向量级读数；tooltip 显示原始数值而非占比（半径是量级刻度不是份额）；单系列取 `series[0]`（与饼/环同一数据格式）；全 0 值不出扇区（与饼图同口径）。不做堆叠与镂空开口（donut 已覆盖镂空心智）。
- **combo**：共享同一 x 分类轴，line/area 点对齐柱组 band 中心（与纯折线的端点对齐是关键差异）；绘制层序固定 bar → area → line（线盖柱的通行读法，不暴露 order）；柱宽按柱型系列数计算（混排 1 柱 1 线时柱不腰斩）；配色/图例按系列声明顺序（与图例一致）；area 层半透明纯色（`gradient` 仅纯 area 型支持）。只允许 bar/line/area 三型互混（同一直角坐标系）。
- **multi-axis（alignTicks v1 就做）**：双轴时以主轴档数为锚、副轴同档数重算 niceStep——左右刻度线一一水平对齐，消除刻度错位误读；右轴刻度贴右缘（padR 对称左轴扩展）、轴名渲染在轴顶（`yAxis[i].name`）；网格线只按左轴画（避免双网格视觉混乱）；右轴启用双条件——`options.yAxis` 第 2 项存在**且左右两侧均有 `series[].yAxisIndex` 绑定系列**，缺任一侧按单轴渲染（不渲染 0 刻度假轴，review 定夺；全部绑右致左轴空置同口径）；堆叠柱/饼系/雷达忽略 `yAxis`（单轴语义）；双轴可与 line/bar/组合图任意叠加。
- i18n ×10：`chart.radar` / `chart.polar-area`（aria-label 缺省按类型走 locale）。

### 已知限制

- **y 轴刻度步长恒为整数（已于 v2.6.5 维护批修复）**：v2.6.0 时 nice 刻度步长 = ceil(max/段数) ≥ 1，小数量程（如 0~0.01）退化为整步刻度、数据压底。v2.6.5 维护批（Task 8A，见文首段）已改走 `1/2/2.5/5/10 × 10^n` nice 序列 + 动态 Intl 精度 + 标签按需留白；90→100、双轴右轴 10→10 为接受的顶格变化。

### 验收

- 单测：chart 文件 41 例（TDD RED→GREEN ×4 轮按 polar-area → radar → multi-axis → combo 推进——combo 回归面最大放最后，每步全量 chart 单测防回归）；全量 `pnpm test` 全绿。
- qa-regression：`chart.spec.ts` 增四图型渲染产出断言（radar 网格/顶点/图例、polar-area 扇区/参考圈、combo 柱线共存、双轴右轴刻度与轴名）+ RTL 不破断言。
- 文档：chart.md zh/en 四图型 DemoBlock（内联 attribute 数据）+ 边界说明；api 语料（type 枚举、options 新键、series 扩展字段）→ `api:gen --check` 全绿。

## v2.6.1 工作台构件族：titlebar / statusbar / inspector / action-bar

> 专业软件（音视频 / 3D / 设计 / IDE / MES 控制台）应用外壳的条形/面板件，围绕「一块主工作区」排布外圈。新建 `packages/ui/src/workbench/` 族目录 + `families/workbench.ts`（第 9 个 CDN 族）。与既有件的边界：titlebar ≠ app-bar（窗口 chrome vs 页面应用栏）、statusbar ≠ footer（状态词汇 vs 内容页脚）、inspector ≠ sidebar（属性编辑 vs 导航菜单）、action-bar ≠ toolbar（底部命令 + 读数井 vs 工具调色板）。

### 已批定夺

- **titlebar 独立薄件**：`drag` 属性写 `-webkit-app-region: drag` + `data-tauri-drag-region`，常用交互子件枚举式自动 no-drag（未枚举者用 `[data-no-drag]`）；纯 Web 下弱化为应用外壳语义（无害空操作）；`window-actions` 内建窗口操作钮 + `oas-window-action` 事件（组件只发事件不执行）；`editable` 文档井（Enter 提交 / Esc 取消回滚）；compact/large 两档高度。
- **inspector 自建 `oas-inspector-section`**（不复用 collapse）——折叠行为对齐 collapse 的 grid rows 过渡经验，API 贴属性面板（heading/name/collapsible/open 受控/default-open）。
- **action-bar v1 仅通用**：统计井 + 任务进度井；媒体 transport / music 井延后 v2（文档标注）。

### 组件清单（4 主件 + 8 子件）

- **oas-titlebar**：`size`（compact 34px / large 68px，控件保持紧凑）、`drag`、`title`/`subtitle`、`editable`、`window-actions`；插槽 leading/center/title/trailing；事件 `oas-title-change`/`oas-window-action`；安全区 `--oas-titlebar-leading-inset`/`-trailing-inset` 变量开口。**oas-traffic-lights**（macOS 交通灯子件）：关闭 / 最小化 / 最大化三圆点（标准色 + 悬停显符号），点击派发 `oas-window-action`（与 `window-actions` 同一契约）；置 titlebar 的 `slot="leading"` 即得 macOS 形态（左侧交通灯 + 居中标题）。
- **oas-statusbar** + **oas-statusbar-item**：底部静默信息条（`role="status"` + 可访问名），默认段（左）+ `end` 段（右）；item 支持 `value`/`label`/`icon`/`button`/`status`（default/info/warning/error/progress 语义色）/`spinning`；可点项派发 `oas-item-click`。
- **oas-inspector** + **oas-inspector-tabs/-section/-row**：属性检视面板（`role="complementary"`），`side`/`density`/`empty`；tabs 胶囊条（tablist + 方向键）；section 折叠分节（aria-expanded）；row 键值行 / 控件行 / `mixed` 混合值 / `reset` 行级复位（`oas-row-reset`）。
- **oas-action-bar** + **oas-action-bar-button/-well** + **oas-statistic-well** + **oas-task-progress-well**：底部命令条（`role="toolbar"`），`theme` 三表体（charcoal/dark/light，恒深表面 token `--oas-color-ink*`）；button 支持 `active`/`active-tint`/`plain`，点击派发 `oas-action`；well 读数容器（`max-width`）；statistic-well 标签+数值+detail；task-progress-well 进度 + `oas-cancel`（组件不自行移除，宿主决定）。

### 边界

- 拖动区内的按钮/输入必须自动 no-drag（titlebar 最易翻车点，qa-regression 固化）；
- titlebar 编辑中外部 `title` 重写 → 终止编辑（防外部状态与输入态冲突）；
- 所有颜色走语义 token（含暗色变体）；`size`/`theme`/`density`/`side` 非法值回落默认并 dev 告警（同值去重）；
- action-bar 任务进度为受控显示（宿主驱动，组件不自涨）；进度到 100% 保留完成态等宿主隐藏。

### 验收

- 单测：渲染/slot/受控/事件/ARIA/RTL/暗色 token（4 主件 + 子件全覆盖）；
- e2e：qa-regression/workbench.spec.ts（titlebar 拖动区契约 / inspector 分节折叠 / statusbar 项点击 / action-bar 事件 + console 零告警 + 暗色）；
- i18n ×10 + API 语料 zh/en + 文档站 4 页 zh/en + a11y 门禁（新页自动进 axe 审计）。

## v2.6.1 液态玻璃动态流动感 v1

> 承接液态玻璃批的如实口径：静态近似（v2.5.9）与边缘折射（v2.6.0）已交付，本批补「随交互变形」的第一层——**指针跟随的镜面高光**与**按压收紧**。范围纪律（用户定）：与折射同域，仅 9 个控件/导航/通知组件消费，内容面板不进；随环境内容变化的实时高光仍属后续。

### 特性

- **指针镜面高光**：主题层运行时（`@oas-ui/theme/glass-fluid.js`）单文档级 `pointermove` 监听 + `composedPath` 命中注册表 surface → rAF 合批写元素本地归一坐标（`--oas-glass-px` / `--oas-glass-py`）→ 组件影子样式经空闲伪元素 `::after` 渲染径向高光；指针离开或元素卸载即淡出并清内联变量（SPA 泄漏防护）。
- **按压收紧**：命中标记 `:active` 态把高光换成**更强的高光色**（真增强，非压暗），slider 把手另有按压外扩环；纯 CSS 实现（不动 transform——避免与 button wave / 拖拽等既有 transform 语义冲突）。
- **消费范围与实现归属（B 档）**：oas-button / oas-switch / oas-slider（把手）/ oas-app-bar / oas-bottom-navigation / oas-message / oas-toast / oas-snackbar / oas-notification——**高光样式表由运行时按注册表注入各 shadow 根（adoptedStyleSheets），组件源码零玻璃规则体/零标记属性，只保留 `--oas-glass-*` 变量消费行**（不引玻璃层 → 组件对 glass 零字节、零副作用）。
- **作用域与按压**：hover 镜面高光对所有玻璃面与按钮生效（含实心语义色/自定义色按钮 primary/success/warning/danger/has-color）；**实心按钮按压改用边缘内描边（`box-shadow inset`，不提亮铺底）**——白高光铺底会把白字对比度压到门限下，边缘描边不冲淡文字（与 Apple 镜面描边 / Fluent 内凹按压常态一致）；玻璃面按压仍是更强高光色（真增强）。实心判定选择器整段用 `:where()` 归零特异性，不得反超禁用守卫。
- **对比度门禁**：玻璃面 hover 按主题页面底（light `#fff` / dark `#18181b`）合成取最坏 ≥60、按压 ≥45；实心按钮 hover（瞬态大字档）≥45、静止/按压基线（底不被提亮）≥60；半透明表面落在极端宿主底色时文字对比度由宿主负责。
- **高光层定位**：注入表给 surface `isolation: isolate` + 基态 `::after { z-index: -1 }`，高光落在「surface 背景之上、文字之下」，镜面反射不冲淡标签文字。

### 边界

- `prefers-reduced-motion: reduce` 不启用；粗指针（`pointer: coarse`）不接（触屏无 hover 语义）；`high-contrast` 不启用；无 `data-glass` 时零监听零开销；
- 性能：单文档监听 + rAF 合批 + passive 监听；每帧至多一次 rect 读取；命中判定走事件 `composedPath`（不查表不遍历）；
- 实心按钮命中后运行时写标记与坐标变量以驱动 hover 高光，按压态由 CSS 换边缘内描边（不提亮）；
- 本批挂账的 `oas-switch` 选中态轨道内文案已由「v2.6.5：switch 玻璃轨道内文案 36 格对比度矩阵」批收口（2 主题 × 2 checked × 3 真实底色 × 3 交互态，静止/hover ≥60、press ≥45）；slider 把手高光仍为纯装饰，不入门禁。
- 更强的「随交互变形」形态（拖拽中塑性形变、随背景内容变化的实时高光）不在 v1。

### 验收

- 单测：运行时（命中/坐标换算/rAF 节流/离开清理/reduced-motion/粗指针/HC/无 data-glass 零监听）+ 9 组件消费与范围纪律断言；
- e2e：真实指针移动 → 变量写入且高光可见；reduced-motion / 无 data-glass 零监听；双主题截图；console 零告警；
- 全门禁 + 双引擎 + perf（theme 运行时新增预算档）。

## v2.6.1 oas-knob 旋钮组件

> 立项背景：参数密集面板（音频/DAW、3D/CAD、工业 HMI、调音台）需要把数值编码为圆周角度的紧凑输入控件——同面积可横排数十个参数、支持双向零位（pan/gain 以 12 点为中性）、相对拖拽大范围值不跳变。与 slider 互补不重叠：slider 做线性区间/多把手/移动端，knob 不做 range/marks 环绕刻度；两者共享 `value/min/max/step`、`show-value`/`format`、`reverse`、`size`、事件命名与 token 策略，宿主可在两种控件间无缝切换（form 族）。

### 特性

- **三档手势 `interaction`**：`cursor`（指针绕轴心方位角增量驱动，顺时针增值）/ `axis`（线性拖拽，`axis` 竖直默认/水平，150px 拖满量程）/ `auto`（默认——起手前几像素解析，主方向与偏好轴一致走线性、垂直走圆周，**解析后一次锁定**不中途切换）。全部为相对语义：按下不写值（无跳变）、无移动点按零操作、主指针独占、Shift 0.2× 精调一档。
- **复位**：双击 / Ctrl+单击 / `reset()` 复位到 `default-value`（缺省回落 `min`），派发 `oas-reset`（不派发 `oas-change`）；`readonly`/`disabled` 全封。
- **值弧与双极零位**：`include-arc` 值弧 + `start-point`（设中心值即双极弧，pan/gain 惯例）；`indicator` line/dot 两形态；`start-angle`/`end-angle` 自定义扫角（默认 225→495 共 270° 底部留缺口，`end-angle` 可 >360）。
- **值显示三通道**：`show-value` + `unit` 后缀 + `format` 模板串 + `formatValue` 函数 property（优先级最高），输出同时进值文本与 `aria-valuetext`（读屏同源）。
- **滚轮**：`wheel` 悬停滚轮调节（默认关，不抢页面滚动），恒按 `step` 调节（修饰键不改变步长——精调走 Shift+拖拽）。
- **键盘/ARIA**：宿主 `role="slider"` + tabindex + `aria-valuemin/max/now` + 格式化 `aria-valuetext` + `aria-label`（`label` 属性或内置文案）；方向键 ±step（上下键恒定值语义、左右键随镜像翻转）、Shift+方向 / PageUp·Down 大步（`large-step`）、Home/End 极值、Esc 取消拖拽回滚。
- **方向**：`reverse` 属性镜像值扫描与手势，RTL 书写方向自动镜像（XOR）；`size` 三档 sm/md/lg 对齐全库 + `--oas-knob-size` 自定义直径 + 触屏 44px 目标下限。
- **取消路径**：Esc / pointercancel 回滚到起点值（零提交，drag-end `cancelled=true`）；拖拽中外部写 `value` 显示保持拖拽值，已提交拖拽拖拽值落盘、零变化松手外部值保留。
- 基建：全 CSS 变量 token（`--oas-knob-*` 六通道含暗色变体）、Pointer Events 统一触屏（touch-action 接管/pointercancel 取消）、SSR `template()`/`hydrate()` 双路径、i18n ×10、事件 `oas-input`/`oas-change`/`oas-drag-start`/`oas-drag-end`/`oas-reset`。

### 验收

- 单测：TDD RED→GREEN（渲染/值域钳制/step 吸附/角度映射/圆周与线性手势/auto 中途解析锁定/键盘全键位/ARIA 三通道/受控 property/事件链/禁用只读/复位/RTL 镜像/token 纪律/SSR 水合）；`pnpm test` 全绿。
- e2e：`qa-regression/knob.spec.ts`（真实指针三手势 + 键盘链路 + 双击复位 + 暗色 token 切换 + console 零告警 + readonly/disabled 拦截）。
- 文档：knob.md zh/en（内联 attribute 演示 + 页级 script 事件反馈）+ api-manifest/api-descriptions + 侧栏；PRD/ROADMAP 同步（版本号未定，标「v2.6.5」）。

## v2.6.1 conversation 会话组件族首批五件

### 立项依据

对话/消息形态立项（能力缺口 D-P2；feedback/message 批次已定性「会话行是另一组件类别，单独立项」）。与 oas-comment（评论区，回复树）**并存不合并**：会话流有方向（我方/对方左右分侧）、动态追加 + 自动滚动 + 流式增长、时间戳/系统事件分隔标记、附件行——评论区均不承载。新族目录 `packages/ui/src/conversation/`（第八个语义族，源码目录 = 文档站语义组），会话行命名 `oas-message-row`（避开全局提示 oas-message）。

本批 = A 批（静态四件 + scroller 钉底/跳底）；B 批已并入本段（精确滚动与会话体验）：稳定锚点异步保位、同帧混合插入精确结算、首屏防跳（data-pending-scroll）、`last-anchor` 打开位置、轮次锚定（`turn-anchor`）、`scrollToMessage`。可见性追踪判定 v2 候选（牵出大纲/已读独立语义，pay-for-use），不随本批交付；后续批次已实现 `track-visible`（IntersectionObserver + `data-visible`，无 IO 回退 rect，见 v2.6.2 段）。

### 功能定义

**oas-bubble（气泡表面）**：纯外观容器——`align` start/end（逻辑属性 RTL 镜像）+ `variant` default/secondary/muted/outline/ghost/destructive（secondary/destructive 用 color-mix 主题语义色浅调，theme-aware 暗色适配）+ `loading` 布尔（三点打字指示 + aria-busy，reduced-motion 停动画）+ `streaming` 布尔（已有内容仍在追加：内容保持可见、宿主 aria-busy、内容区 aria-live=off，终态由宿主 status 区播报）；宽度上限 80%（`--oas-bubble-max-width` 开口，ghost 放开）。头像/名字/时间/发送态不属气泡（归 message-row）。

**oas-attachment（附件行）**：媒体（icon 缺省图形 / slot=media 缩略图）+ 文件名/元数据 + 状态机 idle/uploading/processing/error/done（与 oas-upload 词表一致；进行中 spinner + aria-busy + uploading 细进度条 role=progressbar，progress 0–100 clamp）+ 操作（downloadable/removable 内置钮 + slot=actions 自定义；oas-download/oas-remove detail {name}，删除默认不自移除）+ href 整卡触发器（oas-open detail {href}，cancelable 联动导航阻断）+ size 三档（default/sm/xs）+ orientation 双向。仅图标操作钮 aria-label 含文件名。

**oas-message-scroller（会话滚动容器）**：滚动意图模型，不拥有消息。默认 AI 式（`auto-scroll` 在场时仅读者在底部跟随，near-bottom ≤ `edge-threshold` 默认 8px）；`pin-to-bottom` IM 式始终钉底（同时在场优先）；`default-position` start/end/last-anchor（默认 end；非法回退 end；last-anchor 定位到最后一个 `anchor` 标记消息顶部——AI「回到最后提问位置」，无锚点回退 end）；跳底内置按钮（slot=button 可换内容，显隐组件裁决）+ `scrollToEnd()/scrollToStart()/scrollToMessage(id)` 方法（scrollToMessage 按 `message-id` 精确滚到消息顶，未知 id 返回 false 不重试）；`oas-scroll-state` 事件（detail atBottom/atTop/canScrollStart/canScrollEnd）+ `data-scrollable` 反射 + `data-pending-scroll` 首屏防跳反射（end/last-anchor 初始定位应用前 viewport visibility:hidden，定位/读者让位后移除——未定位帧不闪现顶部）；prepend 保位（`preserve-scroll-on-prepend` 缺省开）：按插入前首节点的内容坐标位移精确结算（同帧 append+prepend 混合只结算顶部插入量，底部追加不参与），补偿后锁定保位锚——历史内异步资源（图片等）撑高上方内容时按锚点视口位移持续补偿（stable `message-id` 优先重查；读者真实滚动即释放）；轮次锚定 `turn-anchor`（可选）：一次「提问+回答」为锚定单元——锚点贴视口顶时把最后 `anchor` 标记消息钉在视口顶 `prev-peek` px 处（默认 64，露上一条语境），回答在锚下方流入；读者在底部延续贴底跟随，上翻即静止（跟随模式按位置一次性定型，贴底中锚点穿越顶部窗口不误拉回）；ARIA：viewport role=region + 可读名称（`label` 属性覆盖，读入即吸收）+ tabindex=0、content role=log + aria-relevant=additions；`announce(text)` 写入 viewport 外隐藏 `role=status` 区（aria-live=polite + aria-atomic），用于生成/完成/停止/失败终态播报，重复文本先清空再下一帧写入。

**oas-marker（会话标记）**：variant default（次级小字）/ border（描边胶囊）/ separator（两侧伸缩线 + 中间文字，时间戳分隔主形态）；icon 装饰槽（包裹 aria-hidden）；role=status 由宿主直接写（原生 ARIA 反射，组件不转发）；空内容 default/border 隐藏、separator 保留线本体；纪律：带文字分隔不得加 role=separator。

**oas-message-row（消息行）**：组合行（行布局所有者）——avatar/header/footer/默认四插槽（空自动收起）+ align start/end（row-reverse 逻辑翻转）+ status 五态 sending/sent/delivered/read/error（可见小字 + 装饰图标，locale 文案，error 追加 danger 色；非法值不渲染）+ grouped 连续同发送者聚拢（--oas-message-gap 收间距）；头像底对齐。

族级：i18n ×10（15 键）；颜色全走语义 token（无硬编码色）；RTL 全逻辑属性；reduced-motion 全覆盖；与 oas-comment 并存不合并。

### 边界（B 批后仍不做）

- 可见性追踪（视口内消息清单，`oas-visible-change`/`data-visible`）：v2 候选（后续批次已实现：`track-visible` + IntersectionObserver + `data-visible`）——牵出大纲菜单/已读标记独立语义，宿主可用 IntersectionObserver 自行组合。
- 虚拟化（数千轮长会话）：**不在 message-scroller 内建窗口化**——组件不拥有消息数据，窗口化会要求行数据/高度模型/移除补偿进入核心，破坏 slotted 契约；`content-visibility` 在 slotted 元素上单独启用会卡占位高度不展开（实测撤回）。长会话由宿主组合 `oas-virtual-list`（虚拟化归 virtual-list，滚动意图归 scroller），或在 scroller 外层用 `track-visible` / `oas-visible-change` 做宿主侧裁剪信号；当前 scroller 与 `oas-virtual-list` 的 `scroll-target` 不能跨 shadow 组合，文档按「二选一」表述，不宣称可直接组合。
- 不做（框架/宿主层）：消息 parts 管线、run 状态机、sendMessage/stop/regenerate、分支/编辑、持久化；文件类型图标库（图标由宿主/slot 传）；长文折叠/浮层/反应条（组合模式或 v2）。
- 首屏防跳只覆盖「连接 → 首帧定位」段；客户端异步拉取首批消息的场景由 auto-scroll/pin-to-bottom 装载行为接管。

### 验收

- 单测：5 组件 61 用例（状态机/事件/ARIA/RTL 逻辑属性/clamp/保位/重连/DSD 水合/i18n 可读名称）+ B 批 scroller 21 用例（首屏防跳/last-anchor/scrollToMessage/异步保位锚含 message-id 重查与回声抑制/混合插入精确结算/turn-anchor 锚顶-贴底-接管三态与 prev-peek）+ families 八族注册一致性 + i18n completeness ×10 全绿。
- e2e：qa-regression/conversation.spec.ts（scroller 钉底/跳底真交互 + B 批异步保位/首屏防跳/last-anchor/turn-anchor 真交互 + 暗色 + console 零告警）+ ai-chat.spec.ts（流式中上翻不被拉回、失败/重试不重复用户行、终态 status）+ demo-coverage 事件探针（attachment 三事件 / scroller scroll-state）+ 新页自动纳入 smoke/dark/code/visual/console-sweep/a11y。
- 文档：zh/en 双语五页（含交互 demo 与 B 批新 demo：异步保位/首屏防跳/last-anchor/轮次锚定）+ 会话组件侧栏组 + API 表 gen 接管 + api:check 双向 0。

## v2.6.1 oas-questionnaire 多步问答组件 + oas-form validate()

> 立项背景：向导式表单 / 问卷 / 多步结算场景需要「步骤 + 每步字段 + 单步校验门控 + 进度 + 汇总」的编排层——steps/stepper 只管导航语义、oas-form 只管单表校验，二者组合的「门控 + 回退保值 + 跨步汇总」宿主每次手搓。定位：questionnaire 是编排层，每步面板内放一个 `<oas-form>` 零侵入复用校验内核；步骤头语义对齐 steps/stepper 但独立实现（不 import 相邻组件内部）。

### 功能定义

**oas-questionnaire（新组件，form 族）**：

- 属性：`steps`（JSON `[{ key?, title, description?, optional?, hidden? }]`，attribute + property 双通道）/ `current`（受控双向，非法回落 0、越界夹取）/ `linear`（默认 true，未来步头部禁点）/ `validation`（默认 true，`"false"`=纯导航）/ `progress` + `progress-variant`（both/text/bar）/ `prev-text`·`next-text`·`finish-text`·`skip-text` / `hide-header`·`hide-nav` / `size` 五档
- 单步门控：`next()` 前对当前步 `oas-form` 校验（委托其公开 `validate()`），未过不放行并派发 `oas-step-validate`；`prev()` 不校验（回退不被错误困住，通行惯例）；无 `oas-form` 的步默认放行；异步 validator 在途时重入直接拒绝
- 跳过：`optional` 步显示「跳过本步」按钮，跳过不校验直接前进（派发 `oas-skip`）；被跳过的步退出「参与步」集合——不进取值与校验，重新进入该步即恢复参与，`reset()` 清全部跳过记录
- `oas-before-change`（cancelable）：一切跳步（按钮 / 头部点击 / next / prev / goto / skip）前派发，宿主 `preventDefault()` 否决——自定义分支跳转挂点
- 进度自渲染：「第 n / m 步」文本 + `role="progressbar"`（aria-valuenow/min/max + aria-label），不复用 oas-progress；`progress-variant` 三档可调
- 面板常驻不卸载（仅切 `hidden`）：回退值保留；提交（末步完成按钮 / `submit()`）**重校全部参与步**（非 `hidden` 且未跳过；防早期步被程序改值绕过）后派发 `oas-submit{values}`（跨步汇总，同口径仅含参与步）
- 方法：`next()` / `prev()` / `goto(index)`（直跳不做门控，语义与 next 分离）/ `validate()`（全部参与步）/ `submit()` / `getValues()` / `reset()`
- 值汇总（参与步口径，与校验同集合——取值=校验）：各参与步 `oas-form` 当前值按步序深合并（与单表 `submit()` 的 `detail.values` 同口径，零交互的 `value` 属性预填同样计入；委托 form 公开 `getValues()` 实时读取，未 upgrade 时回退 `initial-values` 基线 + 内层 `oas-values-change` 跟踪快照）；需全量数据（含 `hidden` / 已跳过步）的宿主可读取各面板内的 `oas-form` 自行汇总；内层值变化事件自然冒泡穿出（转发不重复派发）
- a11y：头部可点项为**内层原生 `<button>`**（`li` 保持 `listitem` 语义——在 `li` 上置 `role="button"` 会使 `<ol>` 的子角色结构非法，axe list 规则）+ Enter/Space 浏览器原生触发、当前步 `aria-current="step"`、`aria-live="polite"` 播报步切换、导航原生按钮；hidden 步不进流程（头部/进度/导航/取值/校验全跳过）；RTL 逻辑属性（连接线 `inset-inline-start`、进度条方向随 dir 自动镜像）

**oas-form `validate()`（公开方法）**：校验全部字段并同步错误态（aria-invalid + 错误文案），返回 `Promise<boolean>`；**纯校验**——不派发 `oas-submit` / `oas-validate-fail`、不做 scroll-to-first-error，供分步容器等外部门控复用校验内核（异步 validator 聚合等待、禁用字段跳过、无 rules 默认放行、提交/reset 同款作废在途异步校验）。`submit()` 事件契约不变。

### 边界（v1 不做，文档标注）

- 条件分支（visibleIf 谓词 / 表达式引擎 / skip logic）：经 `oas-before-change` 由宿主自行实现
- 起始页 / 完成页特型步：普通步 + 宿主组合
- 续填 / 草稿持久化：宿主经 `current` + `getValues()` 自理
- 每步面板经命名插槽（`step-<key|index>`）关联，面板 DOM 不由组件创建——值收集以各步 `oas-form` 实时值为准（与单表提交同口径，`value` 属性预填亦计入）

### 验收标准

- 单测：questionnaire 39 条（steps 数据驱动 / current 受控 / 门控 / 导航 / 进度 / 跳过 / 回退保值 / 提交汇总 / before-change / hidden / 参与步口径（hidden 与已跳过步不进 getValues·oas-submit·重校，重新进入恢复） / i18n / size / 异步防重入 / 在途竞态离开不误推进 / getValues 实时读取含 value 属性预填 / 样式机制）+ oas-form `validate()` 6 条全绿；typecheck / build / api:check 全绿
- e2e：`qa-regression/questionnaire.spec.ts`（多步真点推进 / 门控拦截与放行 / before-change 否决 / 跳过 / 提交回显）
- i18n ×10（`questionnaire.*` 6 键）+ docs zh/en + 交互 demo + a11y 基线（键盘流矩阵）+ qa-regression 固化

## v2.6.1 图标库 opt-in（工程 / 包结构）

背景：内置图标全量集此前被 25+ 组件 eager 引用，任一按需链都背整套 47 图标（≈10.5 KB gzip）。本批把它从组件链解耦（对齐"图标库 / 解析器"通行做法）：动态图名走 `lookupIcon`（`@oas-ui/icons/runtime`），组件内部固定 chrome 图标走精确 path（`@oas-ui/icons/icons/<name>`）；内置全量集改为 **opt-in 注册**（`@oas-ui/icons/register`——全量入口 `@oas-ui/ui` 与各 CDN 族包静态注册，开箱即用不变），全量数据移至 `@oas-ui/icons/registry`。

- **收益（gzip）**：button 34.1→25.0、table 101.6→93.2、table/core 71.4→60.9 KB；全量入口保持含整套图标（开箱即用不变），cdn 无额外增负。
- **破坏性（迁移）**：按需引入使用**内置图名**（`icon="check"`、`<oas-icon name="close">`）需显式 `import '@oas-ui/icons/register'` 一次；主入口不再导出 `iconRegistry`/`iconNames`（改从 `@oas-ui/icons/registry`）；注册 / 查询 API（`registerIcon` / `registerIconAlias` / `registerIconLibrary` / `lookupIcon`）与 `IconName` 类型仍从 `@oas-ui/icons` 导出。
- **门禁**：`perf:size` 断言图标全量注册表 `registry.js` 不进任一按需组件链；源码守卫 `packages/ui/src/shared/icon-optin.test.ts`（组件不得从主入口取 iconRegistry / iconNames、lookupIcon 须走 `/runtime`、全量入口与族入口必须静态注册）；CDN 内置图标回归 `qa-regression/cdn-icons.spec.ts`；文档图名守卫 `docs-icon-names.test.ts`。
- **验收**：见 CHANGELOG `[2.6.1]` 迁移段与 `docs/perf-baseline.md`。

## v2.6.1 专业密度 A 批

### 背景

专业密度（参数密集面板：ERP 录入 / MES 参数 / PLM 属性检视 / BI 阈值）数值录入高频能力的 A 组四件（能力调研已定夺「做」档，全量原创实现）：

### 功能定义

1. **数值 scrub（像素锚定计步）+ 双击复位**
   - 共享纯函数工具 `shared/scrub.ts`：按下记锚点像素 + 基准值，横移每 4px 计一步（步长 = `step`）；**Shift 精调 ×0.2、Alt 超精调 ×0.04**（与 knob `FINE_FACTOR` 同口径，**不引入加速档**——同库修饰键方向唯一）；拖回锚点精确恢复基准值（误拖无损撤销）；位移不足一步视为普通点击（保聚焦/键入）。
   - `oas-slider`：`show-input` 读数框按住横移 scrub（多把手各读数框独立），拖动派发 `oas-input`、松手提交 `oas-change`（值变化才派发）；`reset-value` + 双击轨道复位（缺省回落 min，`step="mark"` 吸附最近刻度，仅单值模式响应）。
   - `oas-input-number`：数字区 scrub，对齐提交制（拖动 `oas-input` 显示文本、松手 `normalizeCommit` 提交写回）；空值从 min/0 起步；步进钮/滚轮/键盘路径不受影响。
   - 两处触屏（coarse pointer）均不启用 scrub（点按聚焦键入优先），CSS `touch-action: pan-y` 放行纵向滚动。
   - **取舍**：`oas-input-number` 不做双击复位（保护原生双击选词）；slider 读数框双击同样不复位（仅轨道双击）。
2. **`oas-collapse-item` 折叠态摘要 `summary`**：收起时头部尾部展示内部值（如「12px 4px」），展开隐藏（避免重复展示/朗读）；单行省略号截断不挤标题；位于可折叠头 button 内（读屏收起态可读），不承担标题语义。
3. **`oas-dropdown`/`oas-select` `reserve-width`（opt-in）**：量测最宽选项 label（select 另含 placeholder）锁触发器最小宽度，切值不抖；文本量测走 shared 三级降级（canvas → 离屏 span → 码点估算，SSR/测试环境可测）；内容变化自动重测；dropdown 清除时恢复触发器原 inline min-width，select 走 `--oas-select-reserve` 变量（缺省 0px 不占宿主盒）。
4. **`oas-slider` 专业属性**：`precision`（scrub 步进与气泡/aria-valuetext 按 precision 修约，收敛浮点尾巴；低于 format/formatTooltip 通道）/ `value-width`（读数框宽度，数字补 px、带单位透传）/ `accent-color`（scrub 拖动强调色，预设语义色映射 token 随暗色主题）/ `show-track`（"false" 隐藏轨道与填充，把手保留）——与既有 color/track-color/format 不冲突。

### 验收

- 单测：`shared/scrub.test.ts` 10 条 + `shared/measure-text.test.ts` 4 条；slider 160（+22）/ input-number 88（+12）/ collapse 46（+5）/ dropdown 78（+6）/ select 165（+5）；全量 `pnpm test` 全绿（含 SSR 快照零漂移——`show-track` 未设置时不写 data-*）。
- e2e：`qa-regression` 五 spec 增补真交互回归（scrub 真拖计步/双击复位/summary 显隐/reserve-width 锁宽）。
- typecheck / build / lint:md / api:check 全绿；docs zh/en 五组件 + api-descriptions + api-manifest 同步；CHANGELOG `[2.6.1]`。

## v2.6.1 表单一致性补齐批

### 特性

- **oas-combobox `multiple` 多选**：可搜索多选闭环，对齐 `oas-select` 多选契约——`value` 走 JSON 数组字符串；已选项渲染为可移除标签（`readonly` 无移除钮）；选中后面板保持展开、过滤词清空便于连续挑选；多选下输入仅作过滤（自由输入/datalist 语义关闭，失焦丢弃过滤词不影响已选）。`max-count` 多选上限（未选项置灰 `aria-disabled` + 拦截派发 `oas-exceed-limit`，已选项仍可取消）；`max-tag-count` 显式设置时标签单行折叠 `+N`（title 汇总被折叠项），未设置默认换行。多选 `oas-change` detail 为 `{ value: string[], options }`（对齐 select 口径）；`oas-clear` detail 为清空前数组；原生表单「同名多条」FormData 语义 + `required` 按至少一项判定；`el.value` 读写数组。多选形态描边/聚焦上移 `.control` 容器（chips + 无边框弹性过滤输入同居），单选 DOM/CSS 零变化（`display: contents` 无盒）；虚拟滚动/分组/移动抽屉在多选下同样可用，浮层定位锚定控件容器。
- **oas-switch `description` + `variant="card"`**：描述副文本渲染在标签下方（`slot[name=description]` 富内容优先于属性文本，契约对齐 checkbox/radio），补齐三件表单控件一致性缺口；`variant="card"` 升级为选择卡：描边容器包住拨杆 + 标签 + 描述、整卡可点（宿主点击委托，disabled/loading/before-change 全拦截）、选中描边主色 + 浅底着色、disabled/status 与 checkbox/radio 选择卡同视觉语言；非法值静默回落 default，默认形态零变化。
- **oas-toggle-button / oas-toggle-group `variant`**（组为组级透传）：对齐 button variant 体系、取切换语义有意义的子集——`solid`（默认描边容器、按下实底）/ `outlined`（透明底描边、按下主色描边 + 淡底）/ `filled`（浅底无描边、按下实底）/ `text`（无框无底、按下淡底 + 主色文字）；非法值静默回落 solid；与 `size`/`color`/`status` 正交（status 语义色源顺序优先）、与 `attached`/`vertical` 正交；形态系禁用态回落统一禁用视觉；`data-variant` 镜像供 `:host()` 样式消费。

### 验收

- 单测：combobox +16 / switch +9 / toggle-button +8 / toggle-group +5 断言（RED→GREEN）；`pnpm test` 全绿。
- e2e：`qa-regression/combobox.spec.ts`（多选真点叠加 chips + chip 移除 + 上限拦截反馈可见 + 折叠 +N）、`qa-regression/switch.spec.ts`（卡片真点切换 + demo 反馈 + 禁用卡拦截）、`qa-regression/toggle-button.spec.ts`（三形态真点 + 静态镜像）、`qa-regression/toggle-group.spec.ts`（四形态镜像 + filled 多选真点反馈）全绿。
- 文档：combobox/switch/toggle-button/toggle-group md（zh/en）新增章节 + 可交互 demo；`api-descriptions.{zh,en}.json` 增补 + api:scan/api:gen 重生成；CHANGELOG `[2.6.1]` 简体中文条目。

## v2.6.1 专业密度 C 批：oas-collapsible 新组件 + list / menu 系 / typography 能力增量

> 立项背景：能力对照第 C/D 组收口后的「做」档四项——单面板自折叠原语（C 组唯一实质缺口）、通用行组件的引导媒体与整行链接、菜单系前置媒体插槽（dropdown avatar 例）、排版内容块（blockquote / list / table）。定位纪律：不另立通用 item 件（扩展 `oas-list-item`）、不新立 prose 长文容器（扩展 typography 的 `tag` 体系）。

### oas-collapsible（新组件，data 族，放 `data/collapsible/` 邻近 collapse）

- **定位**：无容器、自管开合的独立单面板折叠原语；与 `oas-collapse` 的分工——collapse 编排「容器 + 多面板」（面板开合由容器驱动，孤立 item 点击不开合），collapsible 是「一个区块自己开合」的积木（文件树节点 / 表单折叠分区 / 侧栏分组）。视觉与 collapse-item 同源（触发行 + grid 0fr→1fr 展开动画 + 内建箭头）。
- **open 双模式契约**：`open` 属性缺席 = 非受控自管（首帧由 `default-open` 播种一次）；属性在场 = 受控（值语义：非 `"false"` 为展开、`"false"` 为收起），点击翻转后写回属性并派发事件（乐观更新）；受控 → 非受控切换（宿主移除 open）时内部状态播种为移除前显示值，不跳变。
- **其余**：`header` 属性 + `slot="header"` 富触发内容 + `template[slot="toggle"]` 自定义展开图标（与 collapse-item 一致）；`disabled`（含 config-provider 全局禁用注入）；事件 `oas-toggle` detail `{ open }`。
- **a11y**：触发按钮原生 focus + Enter/Space、`aria-expanded`/`aria-controls` 同步、`aria-disabled`；可读名称 = 触发器内容。
- **无 JS 退化**：未升级时 light DOM 内容直接可见（信息不丢失；shadow DOM 架构下原生 `<details>` 兜底不可行，ui-spec 无既有约定，选可见退化并文档说明）。
- SSR：`template()`/`hydrate()` 双路径实现（DSD 白名单另批跟进）；无内置文案，不需 i18n。

### oas-list-item 能力增量

- **前置媒体插槽**：`slot="icon"`（通用图标位，尺寸跟随内容）+ `slot="image"`（方形缩略图位，尺寸与头像同档联动 sm 24 / md 32 / lg 40、小圆角裁剪填充）；三者（icon/image/avatar）各自判空显隐、可组合。
- **整行链接**：`href`/`target`/`rel`——行内渲染覆盖整行的 `<a>`（inset 0、z-index 1，可访问名称取行标题），点击任意空白处即原生导航、Tab 聚焦 Enter 触发；`target` 在场自动补 `rel="noopener noreferrer"`（显式 rel 不覆盖）；链接行点击**不再派发 `oas-click`**（导航与 clickable 语义分离，避免双触发歧义）；`slot="extra"` 操作区置于覆盖层之上（z-index 2），行内操作控件不受遮挡。

### menu 系前置媒体插槽（slot="leading"）

- `oas-menu-item` / `oas-dropdown-item` / `oas-context-menu-item`（数据载体继承体系一致收口）：`<template slot="leading">` 或带 `slot="leading"` 的直接子元素，渲染在 label 前、优先于 `icon`（同给时 icon 不渲染）；`loading` 态 spinner 替位；collapsed 收起态 leading 与 icon 一致**保持可见**（间距归零，作 rail 视觉锚点，不留空白可悬停行）。
- 提取/判定工具挂在数据载体类（`extractLeadingFrom` / `isLeadingNode` 静态方法），宿主（menu/dropdown/context-menu）解析层调用——插槽标记归属载体，api:scan 归属正确。
- **`oas-menu` 新增 `items` property 通道**（对象数组直赋，`MenuItem[] | null`）：携带 leading 克隆节点的项无法 JSON 序列化，宿主以 property 直传渲染；与 attribute JSON / 子元素通道三通道并存（property 最后写入胜出，attribute 重新解析即退位）。
- `items` JSON 通道不支持 leading（文档标注，仅子元素声明式通道可用）。

### typography 内容块排版（不新立 prose 容器）

- `tag` 白名单扩展内容块形态：`blockquote`（引用块：起始侧 token 边条 + 逻辑缩进，RTL 随书写方向镜像）、`ul`/`ol`/`li`/`dl`/`dt`/`dd`（列表块）、`table`/`caption`/`thead`/`tbody`/`tfoot`/`tr`/`th`/`td`（内容表）；三件（text/title/paragraph）通用。
- **解包投影**：`ul`/`ol`/`dl`/`table`/`caption`/`tr`/`thead`/`tbody`/`tfoot` 的 content model 不容 span 包装——换标签时取消 content/suffix 包装、默认 slot 直接挂根；blockquote/li/dt/dd/th/td 允许 flow/phrasing 内容保持包装。块级 ↔ 行内动态切换时包装随标签重建。
- 块级形态下 ellipsis/line-clamp 跳过（display/white-space 规则会破坏块级布局）；suffix 仅行内省略语义不保留。表格 th/td 单元细节样式由宿主自理（shadow 样式无法作用插槽子树深层，文档标注；重内容表用 `oas-table`）。

### 边界（本批不做）

- collapsible 手风琴互斥 / `icon-placement` / `heading-level` / 折叠前可取消事件：宿主可用 `oas-collapse`（编排件）覆盖互斥场景，其余挂账按需。
- 通用 `oas-item` 独立成件：已有 5+ 领域行组件，维持扩展 `oas-list-item` 路线。
- `oas-prose` 长文容器：不立项，内容块走 typography `tag` 体系。
- typographic 表格深样式（th/td 边框/内边距 token 化）：shadow 样式层级限制，文档给宿主指引。

### 验收

- 单测：TDD RED→GREEN——collapsible（双模式/播种值语义/事件/disabled 含注入/插槽/键盘退化/token/水合）+ list-item（icon/image 显隐/链接覆盖层/rel 自动补/aria 名称/焦点分离）+ menu 系（template/元素双通道/优先级/loading 替位/样式）+ dropdown 别名通道 + typography（白名单/解包/切换重建/样式 token）；分多批累计（计数随各轮 review 修复递增，不逐项固化数字）。
- e2e：`qa-regression/collapsible.spec.ts` 新建 7 条（真点开合/受控写回/外部切换联动/disabled/键盘/暗色/console 零告警）+ list 补 2 条（真实点击 hash 导航 + extra 可点 + 焦点分离 / 前置媒体真实渲染）+ typography 补 1 条（块级真渲染断言）+ menu 补 1 条（leading 真实渲染在 label 前）。
- 文档：collapsible.md zh/en 新页（进侧栏与 smoke 等自动收集面）+ list/typography/menu/dropdown zh/en demo 与说明 + api-manifest/api-descriptions 同步（api:check 双向 0）。
- PRD/ROADMAP 标「v2.6.5」；CHANGELOG `[2.6.1]` 简体中文条目。

## v2.6.1 能力补全批：4 新组件 + 多组件增强

### 背景

按既定的组件能力补齐流程，对照公开能力基线与自身实现现状逐项核对，补齐缺口。原则：通用能力默认全做；仅「过时/废弃、逆未来趋势、技术做不到、可论证的不适合」不做。

### 新增组件

- `oas-scope-bar`：过滤药丸行（单选/多选、roving 键盘、RTL；可与 `oas-toolbar` 搭配）
- `oas-transport-well`：媒体运输井（`HH:MM:SS:FF` 时间码 + 键盘 seek，派发 `oas-seek`；空态零足迹）
- `oas-music-well`：音乐节奏井（bars / beats / tempo / meter 读数）
- `oas-attachment-group`：附件组（横向吸附滚动 + 边缘渐隐，`data-scrollable` 反射）

### 既有组件增强

- `oas-button`：`active` / `active-tint`（受控选中态，不自切）
- `oas-slider`：`track` 色轨（hue/saturation/luminance/gradient）、`levels` 立体声电平表、`thumb="pointer|round"`、速度档统一（Shift 精调 / Alt 超精调，与 knob 同口径）
- `oas-questionnaire`：条件分支（宿主组合通道自动对齐）、`animated` 切步动画（reduced-motion 降级）、`shortcuts` 键盘导航
- `oas-input`：块级 addon（`slot="block-start"` / `block-end`）
- `oas-date-picker`：`caption-layout="dropdown"`（月/年下拉，远年跳转）
- `oas-card`：`density="compact"`
- `oas-scroll-area`：`type` 枚举（auto/always/scroll/hover；`auto-hide` 保留为别名）
- `oas-modal`：`slot="media"` + `sticky-footer`
- `oas-table`：`total`（外部/服务端分页）
- `oas-toggle-button`：`icon-toggled`
- `oas-inspector-row`：`align-top` / `striped`
- `oas-marker`：`status`（info/success/warning/danger）+ `shimmer`
- `oas-bubble`：`reactions`
- `oas-message-scroller`：`track-visible`（`oas-visible-change` + 可见集/锚点）

### 验收

- 单测全绿（9710）；`typecheck` / `build` / `api:check` 全绿；本批范围全量 e2e 通过。
- 4 个新组件已注册进 index / ssr / DSD 白名单 + 快照。
- 对比度修复：button text 变体 active、inspector 斑马行标签、info 文字色 token 调深（axe 比值达标，感知门禁不受影响）。

## v2.6.1 oas-swipe-cell 双侧滑动

背景：现 `oas-swipe-cell` 每实例**只能一侧**操作（`slot="actions"` + `side` 二选一）。需求：**同一项两侧各有操作**——向左滑在**右侧**露出操作、向右滑在**左侧**露出操作。

- **DOM**：新增 `slot="actions-start"`（inline-start 侧，右滑露出）；`slot="actions"` 保持 inline-end 侧（默认，左滑露出）。两组可同时在位（双侧）；`side` 保留为**单槽旧用法兼容**（无 `actions-start` 时决定 `actions` 挂侧）。
- **状态**：开态由布尔升级为**侧向**（`'start' | 'end' | null`）。新增 `open-side` 属性（反射当前/目标开侧）；`open` 布尔保留（任一侧开着即真；程序置 `true` 时按可用侧取默认，end 优先）；`oas-open` 事件 `detail` 增 `{ side }`。
- **手势**：同一手势双向拖动，各侧按阈值/速度吸附；跨 0 可端到端切换侧；同 cell 内互斥（仅一侧开）。
- **a11y**：两组各自 `role="group"` + i18n 可访问名（复用 `swipeCell.actionsLabel`）；焦点进入对应侧按钮即开该侧。
- **RTL**：逻辑属性 + 书写方向镜像（start/end 与物理侧随逻辑方向翻转）。
- **兼容**：单侧用法（`side` + `slot="actions"`）行为不变；`open` 语义扩展（detail 新增 `side`）为向后兼容增强。
- **验收**：单测（双侧同现 / 左右滑各自吸附 / 跨侧切换 / `open-side` 反射 / 事件 side / RTL 镜像 / disabled）+ qa-regression e2e + 文档 zh/en。

## v2.6.1 float-button group 自渲染子钮

### 背景

group 子钮此前为宿主自填 light DOM（`slot="action"`），组件用 `::slotted([slot='action'])` 承载子钮全部视觉。CSS 作用域规则「外层树规则胜 shadow ::slotted」→ 宿主页全局样式（如文档站 vitepress reset 的 `button { background-color: transparent }`）直接覆盖子钮背景，子钮在卡片上边界不可辨，组件侧无法根治。

### 方案

- group 复用 menu 的 `actions` JSON（`[{ label, icon?, href?, target?, badge? }]`）：组件在 shadow 内自渲染圆形子钮（`.action-btn`），宿主只给数据，免疫宿主页 CSS；带 `href` 渲染链接子钮（`target` 透传 + 自动补 `rel="noopener noreferrer"`）
- `label` 兼作无障碍名称与 hover/键盘聚焦气泡（纯 CSS 显隐）；`badge` dot/数字 99+ 封顶同既有规则
- 选择复用 `selectItem`：派发 `oas-select`、组收起、非链接项回焦主钮；键盘方向键经 `.actions` 容器委托（展开自动聚焦首项、循环 + Home/End）；actions 更新重建带焦点保持（同 menu）
- slot 通道保留（非废弃）：`slot="action"` 为自定义通道——宿主自填元素/组件（`oas-button`/自定义元素/框架响应式内容）用于数据通道无法表达的场景（自定义视觉、每钮不同行为）；默认形态经 `::slotted` 承载（best-effort，可被宿主页 CSS 覆盖）。与 actions 二选一，并存 → 以 actions 为准（宿主反射 `data-action-rendered`，CSS 隐藏 slot 投影）+ 告警一次；既有 slot 路径行为不变
- 子钮阴影档 `--oas-shadow-sm` → `--oas-shadow-md`（slot 版与 actions 版同步，对齐主钮海拔）

### 验收

- 单测：group+actions 渲染 / 链接化 / 徽标 / oas-select 事件 / 键盘导航 / actions+slot 优先级与冲突告警 / 焦点保持全绿；既有用例零回归
- e2e：vitepress 文档环境下 `.action-btn` 背景非透明（核心断言）、气泡 hover/focus 显隐与文本、键盘导航与 Esc 回焦、RTL 气泡镜像
- 门禁：typecheck / build / api:check / llms:check 全绿

## v2.6.1 — 发布汇总 ✅

> 版本号由用户定。本段为发布收口记录；内容权威见 `CHANGELOG.md [2.6.1]`，各批详情见上方对应批次段。

- **范围**：v2.6.0 之后的全部能力批与修复——新组件 `oas-knob` / conversation 会话族五件 / `oas-questionnaire`（+ `oas-form` `validate()`/`getValues()`）/ `oas-collapsible` / workbench 工作台族（titlebar/statusbar/inspector/action-bar 及子件）；液态玻璃「动态流动感」v1；**破坏性变更**：内置图标集改 opt-in；float-button group 自渲染子钮（`actions` 通道）；专业密度 A/C 批；能力补全批（scope-bar / transport-well / music-well / attachment-group / swipe-cell 双向滑动 等）。
- **测试与门禁**：全量单测 9767 passed；全量 e2e 3301 passed；`typecheck` / `build` / `api:check` / `llms:check` / `stats:check` / `perf:size` / `perf:bench` / `trace --all` 全绿。
- **发布通道**：源码托管于 Gitea（非 GitHub）→ 本地通道 `pnpm release`；tag `v2.6.1` 仅作版本标记。

## v2.6.2 — 发布汇总 ✅

> 版本号由用户定。本段为发布收口记录；内容权威见 `CHANGELOG.md [2.6.2]`。

- **范围**：服务端窗口协议与 table/tree/list/gantt/resource/kanban/scheduler 虚拟化、gantt 任务管理与约束/日历、resource/scheduler 资源视图、chart 抽稀/旋转、数据属性双通道与撞名治理；磨砂玻璃跨浏览器一致性（移除静态边缘折射）、Frosted 命名与 `prefers-reduced-transparency`、`glass-fluid.js` 跨模块单例；框架接入指南。
- **破坏性变更**：`--oas-glass-refraction` 移除，依赖 Chromium 独有边缘折射的覆盖需删除；文档“液态玻璃”改称“磨砂玻璃（Frosted Glass）”，文件名/组件 API 不变。
- **测试与门禁**：全量单测 10497 passed；Chromium e2e 2199 passed / 37 skipped；Firefox e2e 1313 passed / 7 skipped；`typecheck` / `build` / `api:check` / `llms:check` / `stats:check` / `perf:size` / `perf:bench` / `trace --all` 全绿。
- **发布通道**：源码托管于 Gitea（非 GitHub）→ 本地通道 `pnpm release`；tag `v2.6.2` 仅作版本标记。

## v2.6.3：resource 容量日历、技能与优先级均载

- **范围**：`oas-resource` 数据契约扩展：`ResourceItem.workdays / holidays / capacityOverrides / skills`，`ResourceTask.priority / requiredSkills / project`；`levelResources()` 增加 `respectSkills` / `projectOrder`。
- **语义**：未声明 `workdays` 且 `holidays` / `capacityOverrides` 为空时保持旧的每档容量；声明 `workdays`（`[]` 表示全不可用）或非空 `holidays` / `capacityOverrides` 后按逐日容量求和。`capacityOverrides` 优先于假期/工作日，可写小数，但任务负载按整日计数（0.5 日无法容纳整日任务，为后续 effort 模型预留）；空 `holidays` / `capacityOverrides` 视为未声明。reassign 默认要求目标资源具备全部 `requiredSkills`；项目顺序优先，任务 priority 数值小者优先，低优先级先让位；项目名/技能按 trim 后比较。
- **兼容**：全部字段可选；未使用新字段时输出与 v2.6.2 一致。`priority` / `requiredSkills` / `project` / `skills` 等键名被新 API 占用，旧宿主同名字段不再透传；`capacityOverrides` 接受 0，资源 `capacity` 仍要求正数。
- **验收**：单测覆盖工作日/假期/半天/技能/优先级/项目顺序/空声明/非法值/读回/确定性/maxIter；组件 e2e 覆盖 holiday 超载与 `oas-overload.capacity`；文档 zh/en、API 说明、CHANGELOG 与 a11y/性能门禁同步。

## v2.6.3：gantt 截止日、浮时与基线差异

- **范围**：`GanttTask.deadline`（截止日，超期并入 `.conflict` 并渲染 `.deadline` 标记）、`baseline.progress`（基线进度 0-100，基线条内进度覆盖层）、`show-float`（总浮时/自由浮时标签 + `data-total-float`/`data-free-float`）；导出纯函数 `computeVariance(tasks)` 返回 start/end/duration/progress 差值。
- **语义**：总浮时 = LF − EF；自由浮时 = 最近后继允许的延后量（按 FS/SS/FF/SF + lag）；摘要不参与 CPM；windowed 模式跳过浮时/关键路径并在切片上只做截止日违约。正差值 = 当前晚于基线/工期更长/进度更多；无 `baseline.progress` 时 `progressDelta` 为 null。
- **兼容**：新字段/属性均可选；缺省不渲染浮时标签、截止标记或基线进度层，既有渲染与事件不变。
- **验收**：单测覆盖 deadline 违约/未超期、总浮时/自由浮时（自由可小于总）、baseline.progress 清洗/渲染、computeVariance 四类差值/无基线/无进度；e2e 覆盖新 demo 的显示与 console 零告警；文档 zh/en、API 说明与 CHANGELOG 同步。

## v2.6.3：scheduler 服务端资源行窗口、重复语义与打印

- **范围**：resource / resource-week 接入共享行窗口协议（`windowed` + `total` + `window-start` + `oas-window-request`）；windowed 下 `resources` 仅承载切片，组件不自动追加「未分配」行（可用保留 id `__unassigned__` 显式承接）。打印样式 `@media print` 隐藏工具栏/取消滚动限高，`beforeprint` 临时关闭行/小时虚拟化并打印已装载切片（windowed 不输出切片外空白 spacer）、`afterprint` 恢复。新增 `eventsToIcs()` / `el.exportIcs()`：全天/浮动本地时间、RRULE 子集、RFC 5545 转义与折行。
- **重复语义（先落地宿主展开）**：windowed 下组件仍对已装载切片内 `repeat` 做本地展开；宿主展开 occurrence 时必须从基础事件剥离 `repeat`（或不下发基础序列），每个 occurrence 用唯一 id，避免同日重复。行窗口只按资源切片，日期 occurrence 由宿主负责。ICS 导出已在本批落地。
- **兼容**：`windowed` 缺省关，非 windowed 渲染/事件/CRUD 与旧版一致；打印仅在打印上下文改变呈现。
- **验收**：单测覆盖 windowed 绝对行号/aria/spacer/请求去重、off-slice 空交集、beforeprint/afterprint；e2e 覆盖资源切片首屏锚定、宿主回填滚动保持与 @media print；文档 zh/en、API 说明、CHANGELOG 同步。

## v2.6.3：scheduler 跨日连续条、重复规则扩展与 ICS 导出增强

- **范围**：周视图 `endDate` 事件（全天与定时）在顶部跨日带渲染连续长条，定时条带 `开始–结束` 时间标签；支持长条横向拖动整体平移并按列宽吸附到天，键盘聚焦后 `←` / `→` 按天平移（RTL 下按视觉方向镜像）；`repeat` 增加 `byMonth` / `byMonthDay` / `bySetPos` / `exDates`；`eventsToIcs()` 增加 `EXDATE` / `VALARM` / `X-OAS-COLOR` 与 `rangeStart` / `rangeEnd` 过滤；新增窗口日期取数 recipe。
- **语义**：跨日事件（含定时）不再按日拆块；拖动/键盘平移回写 `date` / `endDate` 并派发 `oas-events-change`，保留 `start/end` 时刻；键盘移出当前周时视图跟随，避免条卸载后焦点丢失。`byMonth` 限定月份（1-12）、`byMonthDay` 限定日（1-31）、`bySetPos` 写入 RRULE、`exDates` 同时过滤本地 occurrence 与输出 ICS。`rangeStart` / `rangeEnd` 为含端日期，只导出与区间相交的事件。
- **兼容**：新字段全部可选；未使用时不改变既有渲染与 ICS 输出。连续条仅周视图出现，月/日/agenda 仍按日芯片/行项展示。
- **验收**：单测覆盖连续条、无逐日芯片、键盘平移/视图跟随、BYMONTH/BYMONTHDAY/EXDATE/remind 与 ICS 字段；e2e 覆盖新 demo 的连续条显示、键盘焦点保持与 console 零告警；文档 zh/en、API 说明与 CHANGELOG 同步。

## v2.6.3：scheduler 跨日终点缩放、起止时刻编辑与单步撤销（S03）

- **范围**：跨日连续条末端手柄只改 `endDate`（保持 `date` / `start` / `end`），重叠条自动上下分层避免手柄被盖住；键盘 `Alt+←` / `Alt+→` 按天缩放（RTL 按视觉方向镜像）；时间块新增顶缘手柄改 `start`，既有底缘改 `end`，统一 15 分钟吸附；`updateEvent` 保留单步快照，新增 `canUndo` / `undo()`。
- **语义**：顶缘拖到结束点之前钳制到 15 分钟网格内的 `end - 15`（先吸附再取上界，不产生 09:52 这类非网格值）；同日定时事件 `start >= end`（不含以 `endDate` 表达的跨日事件）拒绝写入且不产生撤销快照。定时跨日条最少保留 2 天（次日端点），全天条缩到单日后清空 `endDate` 回到芯片；缩到可视周之前时视图跟随，避免焦点丢到 body。`repeat` 不与 `endDate` 组合：同时给出时清洗掉 `endDate`，按 occurrence 展开为每日条目，避免既不进跨日条也不进芯片而隐形。重叠事件继续按车道并存，**不视为冲突**——既有产品语义支持并行日程，冲突仅指非法时间区间。`undo()` 回退最近一次 `updateEvent` 并派发 `oas-events-change`；整体 `events` set / `addEvent` / `removeEvent` 清空快照，但受控宿主原样回写相同 events 时保留快照。
- **兼容**：无新 attribute；新增只读 property `canUndo`，合法 `updateEvent` 行为不变；跨日条整体平移与既有键盘 `←` / `→` 不变；未调用 `undo()` 时无行为变化。
- **验收**：单测覆盖终点缩放只改 `endDate`、Alt 键盘与 RTL、顶缘缩放、15 分钟吸附与 `end - 15` 钳制、定时跨日最少 2 天、视图跟随、非法区间/非法 endDate、pointercancel 不写数据、单步撤销与受控回写快照；e2e 覆盖真实鼠标顶缘/末端拖拽、Alt 键盘、重叠条分层、跨日条与单日芯片不遮挡、RTL 与 console 零告警；文档 zh/en、API 说明、PRD/ROADMAP/CHANGELOG 同步。

## v2.6.3：scheduler 日期窗口托管协议（S01）

- **范围**：新增 `range-start` / `range-end`（ISO 日期，end 含端）与 `oas-range-request`（detail `{ startMs, endMs, reason }`）；当前视图可见日期范围未被宿主范围覆盖时派发，同范围去重。
- **语义**：月视图按实际 6 周网格、周/资源周按 7 天、日/资源日按当天、agenda 按 28 天计算可见范围；无 `range-*` 时零行为；`startMs` / `endMs` 为本地时区半开区间，`range-end` 当天仍包含。
- **兼容**：新属性/事件可选；不设置时与既有渲染完全一致；资源行窗口 `oas-window-request` 保持不变。
- **验收**：单测覆盖托管范围派发/去重/覆盖后静默/非法范围；e2e 覆盖真实事件 detail；文档 zh/en、API 说明、PRD/CHANGELOG 同步。

## v2.6.3：gantt 项目自动分组与偏差徽标

- **范围**：`GanttTask.project` + `group-by-project` 自动生成项目根摘要；`show-variance` 在行名后渲染基线偏差徽标；`GanttTask.deadlines` 支持多个截止日。
- **语义**：只收拢 `parent` 为空的根任务；合成行 id 为 `__oas_project__:<project>`（冲突时追加 `#n`），仅修改展示层克隆，原任务数组不变；windowed 模式要求宿主自行展平，不做自动分组。偏差徽标以结束日差值为主，写 `data-start-delta` / `data-end-delta` / `data-duration-delta` / `data-progress-delta`，正值标红、负值标绿，完整差值进 `title` / `aria-label`。`deadlines` 与 `deadline` 合并去重，每个日期渲染一个 `.deadline`，任一超期标 `.conflict`。
- **兼容**：两个属性均缺省关；不改变既有行序、拖拽、选择与事件。
- **验收**：单测覆盖分组行序/原数组不变/关闭回落、偏差徽标 data 与 aria；e2e 覆盖新 demo；文档 zh/en、API 说明与 CHANGELOG 同步。

## v2.6.3：resource 利用率、指派建议与日历交换

- **范围**：新增纯函数 `computeUtilization(resources, tasks, options)`、`suggestAssignments(task, resources, tasks, options)`、`exportResourceCalendars(resources)`、`importResourceCalendars(json)` 及对应类型导出。
- **语义**：利用率负载口径与组件一致（任务与某日相交即给每个 assigned resource 记 1），容量按 workdays/holidays/capacityOverrides 逐日求和，支持 day/week/month 汇总；未声明日历字段时 capacity 作为逐日基数。指派建议按技能缺口优先、利用率/容量次之排序；日历 JSON 版本化为 1，导入时清洗非法日期、负数容量与空技能。
- **兼容**：纯新增导出，不改变组件属性、事件或既有 `levelResources` 行为。
- **验收**：单测覆盖日/周/月汇总、假期/半天 override、空数据、日历往返与非法输入、建议排序；文档 zh/en 与 CHANGELOG 同步。

## v2.6.3：scheduler 资源分组与第二时区

- **范围**：`SchedulerResource.group` 在 resource / resource-week 视图生成分组标题行；新增 `secondary-timezone` 属性，在 day/week/资源单日时间刻度显示第二时区标签。
- **语义**：同名 group 只生成一次标题行，资源保持输入顺序；windowed 切片不自动生成分组行（宿主自行提供切片行）并 devWarn。第二时区仅影响刻度显示，不改变事件定位；非法 IANA 忽略并 devWarn。
- **兼容**：`group`/`secondary-timezone` 均可选；不设置时渲染与旧版一致。
- **验收**：单测覆盖分组行序/组内顺序/resource-week、第二时区标签数量与非法值；e2e 覆盖资源分组 + 第二时区 demo；a11y 零严重违规；文档 zh/en、API 说明与 CHANGELOG 同步。

## v2.6.3：gantt 内建撤销/重做（opt-in）

- **范围**：新增 `history` 属性与 `undo()` / `redo()` / `canUndo` / `canRedo` / `clearHistory()`；新增 `oas-history-change` 事件（`{ canUndo, canRedo, action }`）。
- **语义**：仅 `history` 开启时记录任务提交快照（最多 100 步），覆盖 updateTask/updateTasks/addTask/removeTasks/moveTask/duplicateTask/依赖增删改与拖拽提交；外部整体重写 `tasks` 或关闭 `history` 清空历史。默认关闭，保持受控数据模型与零历史开销。
- **兼容**：默认行为不变；开启后 `tasks-change` 仍按原契约派发，宿主可在 `oas-history-change` 中同步按钮状态。
- **验收**：单测覆盖多步撤销/重做、重做栈清空、外部重写重置、默认关闭不记录；文档 zh/en、API/事件说明与 CHANGELOG 同步。

## v2.6.3：resource 热力图与技能矩阵视图

- **范围**：新增 `heatmap`（负载直方图切热力格 + 图例 + 每格 title）与 `skill-matrix`（行=资源、列=技能并集）两个 opt-in 视图；i18n 新增 `resource.heatLow/heatMid/heatHigh/heatOver`。
- **语义**：热力格按 `load / capacity` 分低/中/高/超载，容量 0 显示不可用；技能矩阵使用 `skills` 并集，✓ 表示具备，不做虚拟化（大规模数据建议宿主分页）。两者均只读展示，不修改数据。
- **兼容**：默认关闭，不改变既有泳道/直方图与 windowed 行为；技能矩阵不参与负载计算。
- **验收**：单测覆盖热力格/图例/超载类与技能矩阵勾选/移除属性恢复；e2e 覆盖两个 demo；resource a11y 零严重违规；文档 zh/en、API 说明与 CHANGELOG 同步。

## v2.6.3：gantt 逐资源日历/班次

- **范围**：新增 resources 属性与 GanttTask.resources；资源项支持 workdays、holidays、shifts；新增 `group-by-resource` 资源泳道（按首个分配资源分组，资源名取 name/缺省 id，多资源任务只出现一次，未分配任务保持顶层）。auto-schedule 按任务全部分配资源的工作日取交集、假期取并集后吸附工作日；hour 档按所有声明 shifts 资源的窗口交集吸附起点；未声明 shifts 的资源不约束。shifts: [] 表示资源无可用班次（日级任务日历同步视为全周不可用）。
- **语义**：未声明 resources 或任务无资源时回退全局 workdays/holidays；资源缺失 id 忽略。日级排程消费 workdays/holidays；资源 `shifts: []` 或 workdays 交集为空时，该任务的日级日历视为全周不可用（v2.6.3 实现：吸附在 400 天上限内找不到工作日时保持原值，任务可能留在不可用日——已知边界）；hour 档班次只吸附起点、不压缩工期；多资源班次取交集，无共同班次时不吸附、不拖到任何一方单边班次。
- **兼容**：新字段/属性全部可选；不设置时与旧版完全一致；group-by-resource 与 group-by-project 同时开启时资源泳道优先。
- **验收**：单测覆盖资源假期、工作日交集、多资源组合、任务 resources 清洗、hour 班次吸附与多资源交集/无交集、资源泳道分组；e2e 覆盖逐资源日历/资源泳道/小时班次 demo；文档 zh/en、API 说明与 CHANGELOG 同步。

## v2.6.3：conversation prompt-input 提示词输入

- **范围**：新增 oas-prompt-input（conversation 族）：多行自增高、Enter 提交 / Shift+Enter 换行、submit-on-enter、clear-on-submit、loading 发送/停止态、disabled/eadonly/maxlength/ows、suggestions 建议项、prefix/ctions/ooter 插槽。
- **事件/方法**：oas-submit（{ value }）、oas-stop、oas-suggestion-select（{ value, label }）；submit() / stop() / ocusInput()。
- **兼容**：新增组件，不影响既有会话族；不依赖外部数据源。
- **验收**：单测覆盖提交/换行/禁用/loading/建议/双通道值；e2e 覆盖真实输入、建议回填与停止；a11y 页面纳入自动收集；文档 zh/en、API/SSR 白名单与 CHANGELOG 同步。

## v2.6.3：conversation 消息操作与工具调用

- **范围**：新增 `oas-message-actions`（复制/重试/编辑/重新生成/分支/反馈等操作条，JSON actions + `oas-action`，只派发事件）与 `oas-tool-call`（工具名/摘要/运行状态/参数/结果，默认折叠，`oas-toggle`，只展示宿主数据）。
- **语义**：组件不内置会话状态、不发请求、不执行工具、不解析函数；`oas-message-actions` 的 `message-id` 原样回传；`oas-tool-call` 的 args/result 只按文本展示，不注入 HTML。
- **兼容**：新增可选组件，不改变 prompt-input/message-row/bubble 既有行为；tool-call 默认折叠，`collapsible=false` 强制展开。
- **验收**：单测覆盖 actions 渲染/事件/disabled/active/危险态、tool-call 折叠/状态/文本转义；e2e 覆盖真实点击与 a11y；文档 zh/en、API 说明、PRD/CHANGELOG 同步。
