# oas-number-keyboard 组件说明

数字键盘（form 族移动端输入辅助件）。设计前必答清单：

1. **取消路径**：组件不持有浮层/全局监听，无孤儿产物；省份面板展开时再次点击「省份」键或选择任一省份即收起。`value` 由宿主持有，清空即恢复初始态。
2. **属性默认值 / 空态**：`value` 缺省为空串；`maxlength` 缺省 = 不限（宿主决定长度）；`layout` 缺省 `number`，非法值回落并单次告警；`random` 缺省关闭（顺序可预期）。
3. **多步交互**：按键 → 写回 `value` → 派发 `oas-input`；达到 `maxlength` 时静默忽略（不派发、不抖动）。`disabled` 全锁；`readonly` 仍可聚焦/派发 `oas-done`，但不改动值。
4. **破坏性选项**：无破坏性默认项；`readonly` 只读、`disabled` 禁用，均不产生数据变更。
5. **键盘可达 / ARIA**：按键为原生 `<button>`（Tab + Enter/Space）；容器 `role="group"` 带可读名称，删除/完成键有 `aria-label`；组件内聚焦时支持物理键盘（数字/字母/Backspace），`aria-disabled` / `aria-readonly` 同步。
6. **受控 / 非受控与宿主桥接**：`value` 是唯一值通道，宿主可任意时刻改写（组件不缓存副本）；写回走 `setAttribute`，Vue/React 均可监听 attribute/事件桥接。
