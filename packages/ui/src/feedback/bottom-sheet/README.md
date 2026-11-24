# oas-bottom-sheet 设计前提回答

1. **取消路径**：所有关闭手势（下滑把手超阈值 / 点遮罩 / Esc）都只派发 cancelable 语义之外的 `oas-close` 请求（detail.reason 区分来源），组件不擅自改受控 `open`——宿主不监听则弹层保持打开，无孤儿产物；打开态断开连接时 Esc 层退栈、聚焦兜底排程作废、document 级拖拽监听随 onCleanup 摘除，无残留。
2. **属性默认值/空态**：`max-height` 缺省回落 `--oas-bottom-sheet-max-height`（85vh）；slot 为空时面板仍是可关闭的空面板（把手/遮罩/Esc 全部可用）；`passive` 模式无容器行为——不压 Esc 层、不聚焦、不锁高，仅静态结构占位（SSR/客户端结构严格一致）。
3. **多步交互失败点**：打开态聚焦的失败点是浏览器首帧焦点时序（WebKit 实测 `focus()` 调过但焦点掉 body）——首帧同步尝试失败后 rAF 兜底重试一次，仍失败聚焦面板容器（`tabindex="-1"`，`:focus` outline 与 glass-ring 接线一致不闪环）；重试排程在关闭/断开时作废，不得在关闭后抢焦点。Chromium/Firefox 首帧即成功的路径零额外行为（幂等）。
4. **破坏性选项**：无内建破坏性动作；Esc 层栈 LIFO 保证一次 Esc 只关最上层浮层，不会连环关闭下层；`passive` 是唯一形态开关，移动端移除后即容器行为，切换不改面板内容。
5. **键盘/ARIA**：面板 `role="dialog"` + `aria-modal="true"` + `tabindex="-1"`（焦点兜底目标）；Esc 走 overlay-stack 共享层栈（文档级监听，不依赖焦点路由——点击面板空白焦点落 body 后按 Esc 仍能关闭；多层同开后开者先关；`open` 态才压栈，关闭/断开即退栈防幽灵层）；Tab 焦点陷阱监听挂宿主（light DOM slot 控件的 keydown 冒泡路径不含 shadowRoot，挂 shadowRoot 会漏掉全部真实焦点场景）；把手 `aria-hidden`。
6. **受控/宿主桥接**：`open` 纯属性受控（唯一状态源），组件只发 `oas-close` 请求，Vue/React demo 监听后移除属性完成收起；键盘监听用稳定引用注册，断开重连（onReconnect → bind）幂等重入，`oas-close` 事件 bubbles + composed 可穿透 shadow 边界被宿主框架捕获。
