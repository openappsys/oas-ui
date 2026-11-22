# oas-image-picker 组件说明

多图选择（form 族）。设计前必答清单：

1. **取消路径**：隐藏的 `<input type="file">` 每次选完清空 `value`（可重选同一文件）；对象 URL 在文件移出列表时 `revokeObjectURL` 回收；无浮层、无全局监听。`clear()` 一次清空。
2. **属性默认值 / 空态**：`max` 缺省 9（非法回落并告警）；`accept` 缺省 `image/*`；列表为空时显示添加块 + 拖拽提示；达到上限隐藏添加块并显示 `已选 n / max`。
3. **多步交互**：选图/拖拽 → accept 过滤（`oas-reject`）→ 上限截断（`oas-exceed-limit`）→ 缩略图与计数更新（`oas-change`）。删除与排序同样派发 `oas-change`；`disabled` 全锁，`readonly` 只读预览。
4. **破坏性选项**：删除是显式点击（带序号 aria-label），无「清空」隐藏入口；`max` 截断丢弃超出文件并给出事件，宿主可提示。
5. **键盘可达 / ARIA**：添加块与排序/删除均为原生按钮（Tab 可达、Enter/Space 触发）；网格 `role="list"`，每张缩略图 `alt` 为文件名；计数区 `aria-live="polite"`。
6. **受控 / 非受控与宿主桥接**：`files` 是 JS property（`File[]`，不反射 attribute）；宿主赋值静默生效、不派发事件（避免双向绑定回环）；用户交互才派发 `oas-change`。
