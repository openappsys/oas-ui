# PageLoading 设计前必答

1. **取消路径**：`close()` 或宿主移除 `open`；遮罩 DOM 常驻但 `display:none`，无孤儿浮层/定时器。
2. **属性默认值**：`open` 缺省关闭；`mode` 默认 `spinner`；`value` 0；`rows` 4；`text` 走 i18n `loading.loading`。
3. **多步交互 / 失败点**：非法 `mode` 回落 spinner、非法 `value` 回落 0、`rows` 钳制 1–12；无加载态嵌套。
4. **破坏性选项**：全屏遮罩默认阻断交互（加载态语义），默认关闭即非破坏；无数据操作。
5. **键盘 / ARIA**：`role="status"` + `aria-live="polite"` + `aria-busy`；进度轨道 `role="progressbar"` 同步 `aria-valuenow`；不主动抢焦点。
6. **受控 / 宿主桥接**：`open` attribute 受控 + `show()` / `close()` 命令式；两种通道均有测试，Vue / React 下 attribute 不丢失。
