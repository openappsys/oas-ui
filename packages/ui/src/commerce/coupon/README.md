# oas-coupon 设计前必答

1. **取消路径**：弹层三种关闭路径（关闭按钮 / 遮罩 / Esc）都回归未开态并归还焦点；无计时器；多次开关不累积监听（监听在 bind 中一次性绑定，幂等）。
2. **属性默认值/空态**：`threshold` 缺省 = 无门槛；`status` 非法值回落 `available`；`list` 为空 → 弹层内空态文案；无 `amount` → 卡片不渲染；已选券面额回显触发按钮。
3. **多步交互失败点**：开→选→关链路；不可用券 input disabled + 标签 `data-status`，即便 change 被程序化派发也在 handler 再判 `status === 'available'`；受控 `open` 写入静默，交互/命令式才派发 `oas-open-change`。
4. **破坏性选项**：无破坏性操作；选中只派发事件，不自行提交订单；关闭不丢「已选券」标记（同次会话内）。
5. **键盘/ARIA**：触发按钮 `aria-haspopup="dialog"` + `aria-expanded`；弹层 `role="dialog"` + `aria-modal` + 标题关联；列表用原生 radio（方向键可用）；打开时焦点移入（已选 → 首个可用 → 关闭按钮）；Tab 在弹层内循环；Esc 关闭归还焦点。
6. **受控/非受控与宿主桥接**：`open` 受控属性（另有 get+set 访问器，框架按 property 赋值同样生效）+ `openOverlay()`/`closeOverlay()` 命令式（符合 ui-spec §2.5）；`clearSelection()` 供宿主静默重置已选券；`list` 走 JSON 属性通道；`code` 回传事件 detail 便于宿主映射。

## 定版前评审记档（不修项）

- **浮层受控面与 `oas-invoice` 的差异**：本组件的券列表弹层是**完整受控面**——`open` 受控属性 + get/set 访问器 + `openOverlay()` / `closeOverlay()` 命令式通道；`oas-invoice` 的「已保存抬头」弹层是纯内部 UI 状态（无受控属性 / 无命令式开关）。两者语义不同（一个是宿主可编排的主要交互面，一个是表单内的辅助选择器），本批不强行统一——统一会新增 invoice 的公开 API 面并带来受控回环风险，留待后续批次与 ui-spec §2.5 一并评审。
