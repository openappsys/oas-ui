# Barrage 设计前必答

1. **取消路径**：`clear()` 清空在场与队列；`pause()` / `resume()` 可逆。所有计时器与 `ResizeObserver` 经 `onCleanup` 释放，离场条目移除 DOM。
2. **属性默认值**：`tracks` 3、`speed` 120、`gap` 48、`max-active` 0（不限）、`paused` 关、`height` 200、默认 `aria-hidden`；空舞台是合法空态。
3. **多步交互 / 失败点**：无空闲轨道或达密度上限时排队，前一条离场后放行；非法参数回落默认；运行中改 `tracks` 会清空在场条目（文档明示）。
4. **破坏性选项**：默认不限密度且不破坏内容；`clear()` 为显式操作；`paused` 默认关。
5. **键盘 / ARIA**：默认装饰性 `aria-hidden`；`accessible` 开启为 `role="log"` + `aria-live="polite"`；无键盘焦点，点击派发 `oas-item-click`。
6. **受控 / 宿主桥接**：`paused` attribute 受控；`add` / `addBatch` 为 JS 方法（命令式通道）；Vue / React 下 attribute 与方法调用均可用。`addBatch` 只做**一层**条目扫描（字符串或 `{ text }` 对象）；嵌套数组不会递归展开（≥4 层嵌套数组按「非法条目」忽略，不抛错，已由测试固化）。
7. **断开重连**：`onReconnect` 按 epoch（`endAt - now`）重算在场条目——CSS 动画以负向 `animation-delay` 定位到剩余进度、离场计时按同一剩余时间重挂，超过剩余时间的立即退场，其余不清空（不整体重播）；`ResizeObserver` 与 `onCleanup` 在重连时重新注册，二次断开同样清理。
