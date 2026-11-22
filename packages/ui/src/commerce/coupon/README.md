# oas-coupon 设计前必答

1. **取消路径**：弹层三种关闭路径（关闭按钮 / 遮罩 / Esc）都回归未开态并归还焦点；无计时器；多次开关不累积监听（监听在 bind 中一次性绑定，幂等）。
2. **属性默认值/空态**：`threshold` 缺省 = 无门槛；`status` 非法值回落 `available`；`list` 为空 → 弹层内空态文案；无 `amount` → 卡片不渲染；已选券面额回显触发按钮。
3. **多步交互失败点**：开→选→关链路；不可用券 input disabled + 标签 `data-status`，即便 change 被程序化派发也在 handler 再判 `status === 'available'`；受控 `open` 写入静默，交互/命令式才派发 `oas-open-change`。
4. **破坏性选项**：无破坏性操作；选中只派发事件，不自行提交订单；关闭不丢「已选券」标记（同次会话内）。
5. **键盘/ARIA**：触发按钮 `aria-haspopup="dialog"` + `aria-expanded`；弹层 `role="dialog"` + `aria-modal` + 标题关联；列表用原生 radio（方向键可用）；打开时焦点移入（已选 → 首个可用 → 关闭按钮）；Tab 在弹层内循环；Esc 关闭归还焦点。
6. **受控/非受控与宿主桥接**：`open` 受控属性 + `open()`/`close()` 命令式（符合 ui-spec §2.5）；`list` 走 JSON 属性通道；`code` 回传事件 detail 便于宿主映射。
