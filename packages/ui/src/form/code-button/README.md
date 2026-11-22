# oas-code-button 组件说明

验证码发送按钮（form 族）。设计前必答清单：

1. **取消路径**：倒计时计时器经 `onCleanup` 清理，断开连接即停；`reset()` 立即结束冷却。无浮层、无全局监听，无孤儿产物。
2. **属性默认值 / 空态**：`cooldown` 缺省 60 秒，非法/非正数回落并单次告警；`loading`、`disabled` 缺省关闭；无插槽内容时用内置文案。
3. **多步交互**：点击 → `oas-send`（可 `preventDefault` 拦截）→ 进入冷却 → 逐秒更新文案 → 结束回到「重新获取」。失败点在宿主请求：拦截事件期间不启动冷却，宿主成功后调用 `start()`。
4. **破坏性选项**：无破坏性选项；冷却/加载态只禁用按钮，不改外部状态。
5. **键盘可达 / ARIA**：原生 `<button>`；冷却与加载态同步 `disabled` / `aria-busy`；发送与可重发经 sr-only `aria-live="polite"` 播报，逐秒倒计时不进 live 区域。
6. **受控 / 非受控与宿主桥接**：倒计时是组件内部态（无属性反射），`counting` / `remaining` 只读属性供宿主读取；`oas-send` 走标准 CustomEvent，Vue/React 均可用 `onOasSend` / `addEventListener` 桥接。
