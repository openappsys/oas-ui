# Curtain 设计前必答

1. **取消路径**：关闭按钮 / Esc / `mask-closable` 点遮罩 / `close()`；关闭写本地记忆并恢复焦点，无孤儿浮层。
2. **属性默认值**：`storage-key` 默认 `oas-curtain`；`persist` 缺省记住、`"false"` 关闭记忆；`auto="false"` 关闭自动弹出；`heading` 空时用 i18n 兜底可读名称。
3. **多步交互 / 失败点**：`localStorage` 读写失败静默降级（仅影响持久化）；无网络/加载态；关闭事件 `oas-close` 带 reason。
4. **破坏性选项**：默认一次性自动弹出是产品语义（只打扰一次）；`persist="false"` 与 `reset()` 提供退出路径；默认只能显式关闭（遮罩关闭需开启）。
5. **键盘 / ARIA**：`role="dialog"` + `aria-modal`；打开聚焦关闭按钮、Tab 圈内循环、Esc 关闭；关闭后 `display:none`。
6. **受控 / 宿主桥接**：`open` attribute 受控优先于自动判定；`show()` / `close()` / `reset()` 命令式；Vue / React 下 attribute 与事件均可用。
