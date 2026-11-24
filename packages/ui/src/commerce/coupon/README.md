# oas-coupon 设计前必答

1. **取消路径**：弹层三种关闭路径（关闭按钮 / 遮罩 / Esc）都回归未开态并归还焦点；无计时器；多次开关不累积监听（监听在 bind 中一次性绑定，幂等）。**层叠协议**：打开即持 body 滚动锁（`overlay-stack` 跨组件引用计数）并压入共享 Esc 层栈，关闭 / 断开连接时释放，重连（打开态）重新持锁——多层浮层同开时一次 Esc 只关最上层，不再由自建面板 keydown 抢 Esc。「不使用优惠券」出口走容器事件委托（分组列表按签名重建后按钮是全新节点，直连监听会随 replaceChildren 丢失）。
2. **属性默认值/空态**：`threshold` 缺省 = 无门槛；`status` 非法值回落 `available`；`list` 为空 → 弹层内空态文案；无 `amount` → 卡片不渲染；已选券面额回显触发按钮；`multiple` / `show-count` 缺省关（单选通道与现状等价）；分组标题只在对应组有券时渲染（空组不占位）。
3. **多步交互失败点**：开→选→关链路；不可用券 input disabled + 标签 `data-status`，即便 change 被程序化派发也在 handler 再判 `status === 'available'`；受控 `open` 写入静默，交互/命令式才派发 `oas-open-change`。多选连续勾选：列表按「list 原文 / 模式 / 计数 / 文案」签名重建——仅勾选态变化时跳过重建、原位同步 checked（重建会打断连续点击）。
4. **破坏性选项**：无破坏性操作；选中只派发事件，不自行提交订单；关闭不丢「已选券」标记（同次会话内）；「不使用优惠券」只清组件内选择状态并派发事件，宿主订单侧是否清券由宿主决定。
5. **键盘/ARIA**：触发按钮 `aria-haspopup="dialog"` + `aria-expanded`；弹层 `role="dialog"` + `aria-modal` + 标题关联；单选列表用原生 radio（分组的 role="radiogroup"），多选用原生 checkbox（分组降级 role="group"）；「不使用优惠券」是原生 button（Tab 可达）；打开时焦点移入（已选 → 首个可用 → 关闭按钮）；Tab 在弹层内循环；Esc 关闭归还焦点。
6. **受控/非受控与宿主桥接**：`open` 受控属性（另有 get+set 访问器，框架按 property 赋值同样生效）+ `openOverlay()`/`closeOverlay()` 命令式（符合 ui-spec §2.5）；`clearSelection()` 供宿主静默重置已选券（单选/多选通道都清）；`list` 走 JSON 属性通道；`code` 回传事件 detail 便于宿主映射；`z-index` 数值属性对齐 modal / drawer。**空选契约**：「不使用优惠券」成对派发 `oas-clear` + 空选 `oas-select`（单选 coupon 为 null / 多选空数组），只监听一个事件的宿主也不会漏。

## 定版前评审记档（不修项）

- **浮层受控面与 `oas-invoice` 的差异**：本组件的券列表弹层是**完整受控面**——`open` 受控属性 + get/set 访问器 + `openOverlay()` / `closeOverlay()` 命令式通道；`oas-invoice` 的「已保存抬头」弹层是纯内部 UI 状态（无受控属性 / 无命令式开关）。两者语义不同（一个是宿主可编排的主要交互面，一个是表单内的辅助选择器），本批不强行统一——统一会新增 invoice 的公开 API 面并带来受控回环风险，留待后续批次与 ui-spec §2.5 一并评审。
