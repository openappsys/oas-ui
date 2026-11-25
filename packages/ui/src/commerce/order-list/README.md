# oas-order-list 设计前必答

1. **取消路径**：无浮层；触底判定是「状态机 + 事件」——派发 `oas-load-more` 后进入待应答（`loadPending`），宿主置 `loading`（应答）或**插槽内容变化**（追加订单卡，slot 分配数量签名变化）才解除；宿主两者都不做则不再触发（防重复派发打爆宿主）。滚动监听（document capture + rAF 节流）随断连经 `unbindLoadMoreListeners` 全量摘除（含待执行 rAF 句柄），重连恢复；页签切换无中间态（点击即回写 + 派发）。页签切换时宿主换插槽内容 → slotchange → 待应答解除 → 哨兵重新检查，闭环无残留。
2. **属性默认值/空态**：`tabs` 缺省 / 非法 JSON → 空页签（**tablist 隐藏**，无可切内容不渲染空条）；缺 `key` 或 `label` 的条目忽略（非法告警一次）；`active` 缺省解析到第一个 tab（getter 兜底，attribute 可不落盘）；`loading` / `no-more` 缺省关；`count` 非数字不渲染徽标；插槽无卡 → 空态（`empty` 插槽可整体替换，缺省 i18n「暂无订单」）；disabled 页签不可激活（点击无效、焦点序跳过、`aria-disabled`）。
3. **多步交互失败点**：页签切换一步完成（点击 → 回写 `active` → 重渲染 → 派 `oas-tab-change`，detail `{ key, label }`）；已激活页签再点不重复派发（幂等）；加载更多失败态（网络错误）不在本件内——`loading` 归宿主管，错误呈现走宿主既有反馈件；触底失败点见第 1 条（宿主责任：收到事件后置 loading 或追加卡，二选一）。
4. **破坏性选项**：无破坏性动作；页签切换不删除宿主卡（插槽卡是宿主 light DOM 节点，组件**不搬运**——卡的内容、样式与点击行为完全由宿主接管）。
5. **键盘/ARIA**：页签 `role="tablist"` + `role="tab"`（`aria-selected`；**可访问名从可见内容推导**——标签 + count 徽标连续文本，不用 aria-label 包裹破坏 WCAG 2.5.3 label-in-name，对齐 filter 教训）；tab `aria-controls` 指向卡区 `role="tabpanel"`（id 由 tabs 输入派生 `stableHash36`，同页多实例唯一 + SSR 确定性）；键盘 roving tabindex（激活 tab tabindex=0 其余 -1；左右上下方向键移动焦点、Home / End 跳边界——**manual activation**：方向键只移焦点，Enter / Space 才激活，与读屏用户预期一致）；空态 / 加载区 / 哨兵在 tabpanel 语义之外；加载区 `role="status"` + `aria-live="polite"` 活区（loading / 到底文案变化自动播报）；哨兵 `aria-hidden`。
6. **受控/非受控与宿主桥接**：`tabs` / `active` 均为 get+set 访问器（setter 容忍对象/数组与 JSON 字符串并反射 attribute），Vue/React 按 property 赋值不丢数据；`active` 宿主直写静默、用户交互才回写 + 派发（同一通道不回环）；`loading` / `no-more` 走原生 attribute 存在性通道；插槽卡是宿主 light DOM 节点（**不搬运进 shadow**，无捕获集/身份签名的复杂度——这是与 goods-list 的关键差异，轻量容器的取舍）；属性名避开 DOM 内建（`tabs` / `active` / `loading` / `no-more` 均无 HTMLElement 原型成员冲突——`active` 非 Document.activeElement 同名成员，HTMLElement 无此内建）。

## 触底协议内核复用决策（记录）

加载更多判定**直接复用 goods-list 导出的纯函数 `shouldRequestMore`**
（`import { shouldRequestMore } from '../goods-list/column-assign.js'`），不另抽 `commerce/shared/`：
单一函数依赖、goods-list 已将其导出为公共 API（`packages/ui/src/commerce/goods-list/index.ts` re-export），
再抽 shared 需要迁移首波已交付组件的导出面，破坏面大于收益。两件差异仅在「数据变化解除」
的信号源：goods-list 是 `items` attribute 签名，本件是 slot 分配元素数量签名（数据在插槽）。
**首波两个修复都已带上**：① 待应答随数据变化解除（分页只追加场景不永久停摆）；
② `isHiddenInTree()` 隐藏容器守卫（display:none 链路不误派——真实浏览器 `getClientRects`
全链判定 + happy-dom 回退祖先链 computed display）。列分配相关的 `assignColumns` /
`resolveColumns` 与本件无关（无内建卡片渲染），不引入。

## 预留能力面（包体分级：本体冻结在大众功能集）

- **配方版组装指南的固化**（tabs + order-card 手工组装的宿主侧模板生成器）。
- **分页协议**（page / pageSize / 服务端取数状态机与重试 helper）。
- **页签滚动条 / 溢出指示**（tablist 横向溢出的渐隐遮罩与拖拽滚动）。

当前本体接口（slot / event / attribute）对上述能力保持开放。
