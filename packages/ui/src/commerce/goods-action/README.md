# oas-goods-action 设计前必答

1. **取消路径**：无浮层、无异步；点击即派发，宿主决定后续；按钮组重建不持有外部引用，无孤儿。
2. **属性默认值/空态**：`items` / `actions` 缺省 → 空骨架；非法 JSON → devWarn 后按空处理；内置 key 有默认文案与图标，未知 key 缺 label 时回退 key 本身；`icon` 名字未注册时 devWarn 一次（实例级去重）并回退该 key 的内置图标，无内置图标则不渲染图标（文字仍可读）。
3. **多步交互失败点**：单步点击；单项 `disabled` 与宿主 `disabled` 均原生禁用；事件委托按 `data-key` 识别，重建子节点不丢监听。
4. **破坏性选项**：主按钮 `primary` 仅为视觉强调，不改变行为；无自动提交。
5. **键盘/ARIA**：`<nav>` + 原生 `<button>`；收藏类 `aria-pressed`；角标数值并入可访问名称；图标 `aria-hidden`；触屏粗指针下按钮抬到 44px 触摸目标。
6. **受控/非受控与宿主桥接**：JSON 属性通道（Vue 用 `:items="JSON.stringify(list)"`）；`items` / `actions` 同时是 get+set 访问器（setter 容忍数组与 JSON 字符串并反射 attribute），框架按 property 赋值不丢数据；无 property/attribute 同名冲突（避开 `title` 等原生全局属性）。
