# oas-matrix 组件说明

矩阵题（form 族）：行 = 子问题、列 = 选项，行内单选 / 多选。设计前必答清单：

1. **取消路径**：无浮层、无全局监听、无计时器；`clear()` 清空全部选择。骨架构建后只在 `rows` / `columns` / `mode` / `label` 原文变化时重建（原文未变只同步状态），无孤儿节点。
2. **属性默认值 / 空态**：`mode` 缺省 `radio`（非法值回落并告警一次）；`required-scope` 缺省 `row`；`rows` / `columns` 缺省为空并渲染「暂无数据」占位（不渲染空表格）；`value` 缺省 `{}`。
3. **多步交互**：点击 label / input 改变选择 → 归一写回 `value` 属性（JSON）→ 同步可视态 → 派发 `oas-change`。失败点在必答校验：`validate()` 返回 false 并派发 `oas-invalid`；错误显示后用户继续作答会静默复检，补满即自动消失。禁用 / 只读在入口处拦截，不会产生半更新状态。
4. **破坏性选项**：无破坏性操作；`clear()` 是显式方法，不绑定任何按钮。行 / 列级 `disabled` 与组级 `disabled` 都只影响可交互性，不清值。
5. **键盘可达 / ARIA**：每行一个 `fieldset` + `legend`（行标题），选项是原生 `input[type=radio|checkbox]`；列头可见，输入以 `aria-labelledby` 关联行标题 + 列头；radio 行 roving tabindex，方向键行内移动并选中（RTL 镜像左右语义）、Home/End 首末列；只读态 `aria-readonly` 且不响应激活。
6. **受控 / 非受控与宿主桥接**：`rows` / `columns` / `value` 均为 get+set 双通道（对象/数组 property + JSON attribute 双容忍，赋值即生效、不派发事件）；用户交互才派发 `oas-change`。Vue 属性名不撞内建属性（`value` / `rows` / `columns` 在 `HTMLElement` 上无同名成员），契约登记在 `vue-prop-hijack.spec.ts`。

**SSR**：本批登记 `NOT_SSR`（reason `pending`）。快照确定性可行，但行/列标题 IDREF 与数据属性解析需要连同 DSD 快照结构一起验证，本批不扩白名单；`template()` / `render()` 保持纯函数同构写法，后续白名单化只需补 `hydrate()`。
