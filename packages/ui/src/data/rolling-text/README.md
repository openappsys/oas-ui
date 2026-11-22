# RollingText 设计前必答

1. **取消路径**：无用户操作；字符翻转定时器在重连/更新/卸载时清理，无孤儿计时器。
2. **属性默认值**：`value` 空串渲染空列；`precision` 缺省保留原文本；`duration` 非法回落默认；前缀/后缀为空时隐藏。
3. **多步交互 / 失败点**：无交互步骤；数字/字符类型变化整列替换，位数增减增删列；无加载态。
4. **破坏性选项**：无。`precision` 只影响展示文本，不改写宿主值。
5. **键盘 / ARIA**：可见列 `aria-hidden`，完整文本（含前缀后缀）放视觉隐藏区；`live` 可选 polite 播报；`prefers-reduced-motion` 关闭过渡。
6. **受控 / 宿主桥接**：`value` 提供 property（number / string）并反射 attribute；其余标准 attribute；Vue / React 双向绑定可用。
