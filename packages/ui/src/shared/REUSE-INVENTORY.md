# 部分代码复用盘点（只读盘点，不实施）

> 2026-11-25 复用基建配套批追加产出。方法：**逐文件读源码核实**（行号与引文以本仓 worktree
> `work/reuse-infra` @ 提交 `170d2dd8` 为准），不转述 review 报告。重构**另立批**——接入改造
> 需本批落地的逐链预算档 / CDN 族包门禁 / qa-regression 做回归背书后再动。
>
> 行号会随代码演化漂移：引用格式 `文件:行区间`，读时以函数名定位为准。
>
> **落地状态（2026-11-26 更新）**：P1 / P2 / P3 / P4 四项已随 shared 原语下沉批落地——触底 →
> `shared/bottom-reach.ts`、roving → `shared/listbox.ts`（落地命名，§1 的「roving 内核」即此）、
> 翻转 → `shared/flip-up.ts`、内联 RTL 判定 → `shared/direction-dom.ts`（自 `direction` 拆分）；
> 八处接入完成，RTL 键盘镜像修复 ×2 随批交付。下文行号与「不实施」结论保留为盘点时快照，
> 接入现状以 `shared` 源码与其单测为准。

## 总览（优先级 = 重复度 × 接入成本）

| # | 候选 | 重复位置 | 重复量级 | 类型 | 优先级 |
|---|------|---------|---------|------|--------|
| 1 | roving 键盘导航内核（已落地 `shared/listbox.ts`） | 6 组（§1） | ~250 行分散 | 语义变体为主、推进逻辑纯重复 | P2 |
| 2 | 视口翻转谓词（已落地 `shared/flip-up.ts`） | 2 处（§2） | ~40 行 | 纯重复（判据同构、属性名各异） | P3 |
| 3 | 触底协议状态机（已落地 `shared/bottom-reach.ts`） | 2 组件（§3） | 骨架 ~50 行 ×2 + verbatim 9 行 ×2 | 纯重复为主 | **P1** |
| 4a | 签名守卫重建 | 14 文件（§4） | 每处 1-3 行 | 形态同构、语义各异 | P5（观察） |
| 4b | 内联 RTL 判定变体（已落地 `shared/direction-dom.ts`） | 4 处（§4） | 每处 1-3 行 | **行为漂移**（未接 config-provider 注入链，下沉批已接） | P4 |
| 4c | Esc 手挂 document keydown | 10 文件（§4） | — | 语义变体居多 | P5（观察） |

---

## §1 listbox / roving 键盘导航（P2）

### 重复位置（逐个核实）

| 组件 | 实现 | 行区间 | 规模 |
|------|------|--------|------|
| `form/select`（最全实现） | `handleTriggerKey` / `handleSearchKey` / `moveActive` / `selectActive` / `navigableCount` / `scrollActiveIntoView` / `syncActive` | oas-select.ts:1288-1360, 1668-1693 | ~80 行 |
| `commerce/invoice` `.saved` picker | `onPickerKey` / `syncActive` + openPicker 首项聚焦 | oas-invoice.ts:704-709, 711-732 | ~30 行 |
| `commerce/filter` | `moveFocusWithin`（排序行 + 组选项共用） | oas-filter.ts:1265-1281 | ~17 行 |
| `commerce/order-list` 页签 | `onTabKeydown` / `moveFocus` | oas-order-list.ts:567-612 | ~44 行 |
| `commerce/time-select` ×3 组 | `onModeKeydown` / `onDateKeydown` / `onSlotKeydown` | oas-time-select.ts:846-870, 933-963, 965-976 | ~90 行 |
| `commerce/search-bar` 联想面板 | `onKeydown` 仅 Enter/Esc，**无方向键导航**（面板是插槽容器非选项列表） | oas-search-bar.ts:399-411 | ~13 行 |

合计 ~285 行，其中「键序解析 + index 推进（回绕 / 跳过不可用）」的纯逻辑在 5 组实现里重复。

### 差异点（语义变体，非纯复制）

| 维度 | select | invoice | filter | order-list | time-select |
|------|--------|---------|--------|------------|-------------|
| 焦点载体 | `aria-activedescendant`（焦点留 trigger） | DOM focus 移动 | DOM focus 移动 | roving tabindex（显式 tabIndex 重排） | roving tabindex |
| 回绕 | `% n` 回绕 | `% n` 回绕 | **clamp 不回绕** | `% n` 回绕 | `% n` 回绕 |
| Home/End | 无 | 无 | 无 | 有 | 有 |
| RTL 镜像 | 不涉及（纯垂直） | 不涉及 | **无镜像**（Right/Down 合并 forward） | **无镜像**（水平页签 Right 在 RTL 下应反向——见「行为不一致观察」） | 有（`isRtl` 镜像左右） |
| disabled 处理 | selectActive 时判 `option.disabled` | 无 disabled 概念 | 选择器 `:not([disabled])` | enabled 过滤后回绕 | `hasSelectable` 过滤 |
| 激活语义 | Enter 选中（manual） | Enter/Space 选中 | 无激活（点击即选） | manual（方向键只移焦，Enter/Space 激活） | selection-follows-focus（方向键即切换，radiogroup 惯例） |
| 虚拟滚动联动 | scrollActiveIntoView 计算窗口 | 无 | 无 | 无 | 无 |

### 下沉建议

- **shared 模块名**：`shared/roving-nav.ts`
- **可统一内核**：键序解析（垂直/水平/网格 + RTL 镜像）→ 推进量；index 推进（回绕 + 跳过不可用 + Home/End）；返回目标 index。
- **接口面草案**：
  ```ts
  interface RovingNavOptions {
    keys: string[]                     // 该组监听的键集（现状各组不一致，保留声明式）
    count: () => number                // 可导航项数
    current: () => number              // 当前 index（-1 起始）
    rtl?: () => boolean                // RTL 镜像（默认 false）
    wrap?: boolean                     // 回绕（默认 true；filter 传 false）
    skip?: (index: number) => boolean  // 跳过不可用项
    homeEnd?: boolean                  // Home/End 支持
  }
  function resolveRovingMove(event: KeyboardEvent, o: RovingNavOptions): number | null
  // 返回目标 index；非监听键返回 null。焦点迁移与激活派发留在组件（载体/语义各异）
  ```
- **不可统一部分**：焦点载体（activedescendant vs DOM focus vs roving tabindex）与激活派发（manual / follows-focus / enter-select）是组件语义，保留组件侧。
- **预估体积**：纯函数零依赖，核 ~60-80 行 → **gz ≈ 0.6-0.9 KB**（量级估算，未实测；落实施批以 `perf:size` 独立档实测定档）。
- **接入改造面**：5 组 × 平均 ~25 行改写；select 虚拟滚动联动（scrollActiveIntoView）保留组件侧；单测面 = 各组件现有键盘用例回归（select 箭头开合/首项高亮、order-list roving 兜底、time-select RTL）。

### 盘点中发现的行为不一致观察项（重构批顺带评估，本盘点不修）

1. `order-list` 页签水平方向键不镜像 RTL：`ArrowRight || ArrowDown` 恒 forward（oas-order-list.ts:575-585）——RTL 下水平页签的 Right 语义应反向。time-select 同场景已做镜像（oas-time-select.ts:956），两处行为不一致。
2. `filter.moveFocusWithin` 同样合并不镜像（oas-filter.ts:1268-1269）；该组件组内布局含水平排序行，同问题。

---

## §2 视口翻转谓词（P3）

### 重复位置

| 组件 | 实现 | 行区间 | 属性名 | 锚元素 |
|------|------|--------|--------|--------|
| `commerce/invoice` `.saved` picker | `placePicker` | oas-invoice.ts:675-694 | `data-placement='up'`（CSS inset-block-end） | `.saved-trigger` |
| `commerce/filter` dropdown 面板 | `syncPanelFlip` | oas-filter.ts:992-1013 | `data-flip='up'`（CSS 贴顶展开） | `.bar` |
| （已下沉对照基准）`overlay/floating` | `computePosition` | shared 引擎，select/cascader/date-picker/combobox/auto-complete/mentions/tree-select/color-picker/tooltip/popover/hover-card/popconfirm/avatar-group/chart/table/sidebar 共 15+ 处已消费 | — | — |

### 重复度评估

两处判据**同构**：`below = viewportH − anchorRect.bottom`、`above = anchorRect.top`、翻转条件 `below < panelRect.height && above > below`、退化守卫同构（视口/测量值拿不到——SSR、happy-dom——保持向下）。差异仅在属性名、锚元素与是否联动开合状态。这是「判据漂移」隐患：三处（含 floating 引擎内判据）独立演化，某处修翻转 bug 另两处不同步——chevron 统一批的同款教训。

### 下沉建议

- **短期（部分代码下沉）**：`shared/flip-up.ts` 谓词 `shouldFlipUp(anchor: DOMRect, panel: DOMRect, viewportH: number): boolean`（含退化守卫，~12 行，**gz ≈ 0.1 KB**）；两处调用替换，各自 data 属性名保留（CSS 不动）。
- **长期（组件级）**：filter/invoice 浮层迁 `overlay/floating`（filter 预算档 basis 注明「面板自实现轻量浮层，零跨组件依赖」是当初的有意取舍——迁移会让 form→commerce 依赖面反向，须按 family-deps 门禁登记边 + 逐链档重测后再议）。

---

## §3 触底协议状态机（P1）

### 重复位置（goods-list ↔ order-list）

| 片段 | goods-list | order-list | 重复度 |
|------|-----------|------------|--------|
| `checkLoadMore` 判定骨架（守卫链 → rect → state → shouldRequestMore → pending → emit） | oas-goods-list.ts:674-691（18 行） | oas-order-list.ts:489-514（26 行） | 骨架纯重复；差异仅在「有内容」数据源与解除信号源 |
| `isHiddenInTree` 可见性守卫 | oas-goods-list.ts:697-705（9 行） | oas-order-list.ts:520-528（9 行） | **逐字节相同（含注释）** |
| `onScrollOrResize` rAF 节流 | oas-goods-list.ts:710-715 | oas-order-list.ts:533-539 | 逐字节相同 |
| 滚动监听挂载/摘除（document capture + resize + onCleanup） | oas-goods-list.ts:718-720 | oas-order-list.ts:542-545 | 同构 |
| 加载更多区三态渲染（loading / no-more / 缺省 + role=status aria-live） | `syncMore` oas-goods-list.ts:631-643 | `syncMore` oas-order-list.ts:443-455 | 同构（i18n 键各异） |
| 解除信号接线（items 签名 / slot 节点身份签名 → loadPending=false） | oas-goods-list.ts:477 | oas-order-list.ts:494-501 | 语义变体：文本/数量签名 vs 节点身份序列签名 |

**已复用**：`shouldRequestMore` 纯函数（order-list import 自 goods-list/column-assign.js，oas-order-list.ts:5-6 有决策记录）。**未复用**：判定骨架、可见性守卫、节流监听、三态渲染、解除接线。

### 下沉建议

- **shared 模块名**：`shared/bottom-reach.ts`
- **接口面草案**：
  ```ts
  interface BottomReachOptions {
    sentinel: () => HTMLElement | null
    hasContent: () => boolean
    state: () => { loading: boolean; noMore: boolean; pending: boolean }
    onRequestMore: () => void            // 内部置 pending 后调用（组件 emit oas-load-more）
    releaseSignals?: Array<() => void>   // 解除 pending 的订阅（组件接 items/slot 签名）
  }
  export function createBottomReach(host: HTMLElement, o: BottomReachOptions): {
    check(): void
    bind(): void      // document scroll capture + resize + rAF 节流，onCleanup 由组件摘
    unbind(): void
  }
  // isHiddenInTree 一并导出（独立可用）
  ```
- **预估体积**：核 ~70 行（判定骨架 + 节流 + 监听 + 可见性守卫）→ **gz ≈ 0.8-1.0 KB**（量级估算，未实测）。
- **接入改造面**：两组件各改 ~80 行；单测迁移（两组件现有触底用例：首帧不误派 / display:none 链路不派 / 签名解除 / loading 置位解除）；依赖方向 commerce→shared（叶子放行边，无需登记）；order-list 对 goods-list column-assign 的既有单函数依赖不变。**第三个触底消费场景出现前接入收益最大**（再抄一份就是第三份骨架）。

---

## §4 其他候选（全源码扫描结论）

### 4a. 「签名守卫重建」模式（P5 观察项）

14 文件出现 `JSON.stringify(...) !== 存储签名 → 重建/重同步` 模式（commerce address/cart/coupon/ecard/filter×4/invoice/logistics/order-card/order-list；form matrix/rank/segmented；data gantt×2/table-range×2）。样本：
- form/segmented/oas-segmented.ts:293（实例字段 `lastSignature`）
- form/rank/oas-rank.ts:353（实例字段 `renderSignature`）
- commerce/logistics/oas-logistics.ts:389-390（**dataset.sig** 存 DOM）
- commerce/order-card/oas-order-card.ts:550-551（实例字段 `itemsSignature`）

评估：每处仅 1-3 行，抽 helper（gz ≈ 0.15 KB）省不了多少体积；真正的差异在「哪些属性变化触发重建」的语义层。**建议**：不抽代码，把「签名守卫重建」写成 ui-spec 的组件规范条目（签名存哪里、粒度怎么选——数量签名 vs 节点身份签名的教训已有两轮）。

### 4b. 内联 RTL 判定变体（P4，行为漂移修正）

> 归因更正（2026-11-26 复核）：初版写「config-provider 的 direction 注入对这四处无效」
> **不准确**——config-provider 的 direction 落在宿主 DOM（`dir` attribute），computed style
> 可正常继承读取，该通道并不缺失。真实缺口只有一个：**locale 回退通道**——shared
> `resolveDirection` 在无任何 DOM `dir` 声明时回退到当前 locale 的方向元数据（ar 等语言
> 包自带 rtl），本地实现无此兜底（locale 注入方向时这四处感知不到）。

4 处未走 `shared/direction` 的本地 RTL 判定，检测通道为 **computed style / attribute 直读**，与 shared `resolveDirection`（config-provider → 最近 [dir] 祖先 → document → locale 回退）相比缺 locale 回退通道（漂移面窄于初版判断，非纯重复）：

| 位置 | 现状 | 差异 |
|------|------|------|
| commerce/cart/oas-cart.ts:1195-1197 | computed style + attribute 双分支 | 缺 locale 回退 |
| commerce/invoice/oas-invoice.ts:575 | computed style | 同上 |
| data/table/range/index.ts:1017 | computed style + typeof 守卫 | 同上 |
| form/questionnaire/oas-questionnaire.ts:598-602 | computed style（try/catch ltr 兜底）→ CSS var 符号 `--q-dir` | 符号翻转是合法本地逻辑，检测通道可换 shared |

**建议**：改 import shared `isRtl`/`resolveDirection`（零新增代码，纯接入 + 行为向语义收敛）；属行为修正，须逐组件过 RTL 回归（qa-regression rtl-batch2 / rtl-keyboard 已有基建）。overlay/floating 与 floating-panel/geometry 的 `direction` 是**参数化纯函数**（方向作入参），不属此类。

### 4c. Esc 关闭协议（P5 观察项）

10 文件手挂 `document.addEventListener('keydown', …, capture)` 处理 Esc 且未走 `shared/overlay-stack` 的 escape 层：filter、upload、gantt、image、scheduler、table-edit、command、menubar、navigation-menu、tabs-manager。逐个看语义多为「编辑态/选择态需要优先于浮层栈的 Esc」（gantt/table-edit 明确如此）——**语义变体居多，统一 = 行为变更**。建议：不统一，但 overlay-stack 头注释补一段「何时直接挂 document capture、何时进 escape 层」的判据说明，防新组件乱选。

### 明确排除的候选（核实后不成立）

- **search-bar 联想面板键盘导航**：面板是插槽容器，无选项列表、无方向键导航（仅 Enter/Esc）——不属 listbox 导航重复（§1 已注明）。
- **`:focus-visible`（148 文件命中）**：全是 CSS 选择器样式约定，非 JS 管理逻辑，无重复实现问题。
- **`isRtl` 调用（73 文件）**：绝大多数已走 `shared/direction`——已下沉良好，仅 §4b 四处变体。
- **rAF 节流（37 文件命中）**：除 §3 的 goods-list/order-list 逐字节同款外，其余用途各异（测量重排/绘制循环），非同一段逻辑的复制。

---

## 落地顺序建议（重构批，本盘点不实施）

1. **P3 翻转谓词**（最小、零风险，先打通「shared 下沉 + 逐链档回归」流程）
2. **P1 触底协议内核**（重复度最高，有第三消费场景前接入；单测迁移量大是主要成本）
3. **P2 roving 内核**（先抽 `resolveRovingMove` 纯函数，5 组逐个接入，顺带修 §1 两个 RTL 镜像不一致）
4. **P4 RTL 判定收敛**（行为修正批，RTL 回归背书）
5. P5 两项记录不修
