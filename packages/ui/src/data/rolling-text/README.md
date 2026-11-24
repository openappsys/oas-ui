# RollingText 设计前必答

1. **取消路径**：无用户操作；字符翻转定时器在重连/更新/卸载时清理，无孤儿计时器。
2. **属性默认值**：`value` 空串渲染空列；`precision` 缺省保留原文本；`duration` 非法回落默认；前缀/后缀为空时隐藏。
3. **多步交互 / 失败点**：无交互步骤；数字/字符类型变化整列替换，位数增减增删列；无加载态。
4. **破坏性选项**：无。`precision` 只影响展示文本，不改写宿主值。
5. **键盘 / ARIA**：可见列 `aria-hidden`，完整文本（含前缀后缀）放视觉隐藏区；`live` 可选 polite 播报；`prefers-reduced-motion` 关闭过渡。
6. **受控 / 宿主桥接**：`value` 提供 property（number / string）并反射 attribute；其余标准 attribute；Vue / React 双向绑定可用。

## direction / stop-order / start / reset 增量（能力补强批）

- direction：up（恒向上）/ down（恒向下）；缺省最短路径（现状逐字节等价）；非法值 devWarn 一次（per 值去重）并回落最短路径。方向档仍复用越界瞬态 + 归位机制（9→0 向上落 10、0→9 向下落 -1）。
- stop-order：列间 stagger = 时长 × 12%，数字列 transition-delay / 字符列 animation-delay 按位次递增；归位计时覆盖最末列延迟（时长 + stagger × 列数）。
- start()：列整体重建为零档（数字 0 档 / 字符置空）→ 强制重排提交起始帧 → syncColumns 正常翻到目标；eset()：清计时 / 延迟，按目标值静态重建（无过渡）。两者未渲染时 no-op。
