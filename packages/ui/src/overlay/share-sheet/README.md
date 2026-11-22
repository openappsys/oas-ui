# ShareSheet 设计前必答

1. **取消路径**：取消按钮 / 关闭按钮 / 遮罩 / Esc / `close()` 五路关闭；关闭后恢复原焦点，无孤儿浮层。
2. **属性默认值**：`open` 缺省关闭；`heading` / `cancel-text` / 关闭按钮名称走 i18n；`channels` 空数组显示空态文案。
3. **多步交互 / 失败点**：非法 JSON 告警并渲染空态；非法渠道项跳过；点击渠道先派 `oas-select` 再自动关闭。无加载态（渠道由宿主提供）。
4. **破坏性选项**：默认关闭，需显式打开；无数据破坏。空态/单渠道/多行宫格均覆盖。
5. **键盘 / ARIA**：`role="dialog"` + `aria-modal` + 标题可读名称；打开聚焦首个渠道、Tab 圈内循环、Esc 关闭；关闭态 `visibility:hidden` 不可聚焦。
6. **受控 / 宿主桥接**：`open` attribute 受控 + `show()` / `close()`；`channels` 用 JSON attribute，Vue / React 透传；`oas-icon` 名称由宿主注册。
