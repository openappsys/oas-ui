# Offline 设计前必答

1. **取消路径**：无用户操作；网络恢复自动隐藏。`window` 监听经 `onCleanup` 移除，重连重挂，无孤儿监听。
2. **属性默认值**：`variant` 缺省 `bar`；`message` 缺省 i18n `offline.message`。在线即 `display:none`，不占布局。
3. **多步交互 / 失败点**：状态由浏览器 `online` / `offline` 驱动；只在状态真正变化时派发事件，无加载态。
4. **破坏性选项**：默认不阻塞页面交互（提示条本身可拦截顶部区域，属提示语义）；无数据破坏。
5. **键盘 / ARIA**：`role="status"` + `aria-live="polite"` + `aria-atomic`；在线时移出可访问性树。
6. **受控 / 宿主桥接**：网络态不可由宿主伪造（读取真实 `navigator.onLine`）；文案走 attribute，Vue / React 直接透传。
