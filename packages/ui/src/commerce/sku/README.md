# oas-sku 设计前必答

1. **取消路径**：内嵌形态无浮层/异步；弹层形态的开合是受控属性 `open`——组件只派发 `oas-close`（来自 `oas-bottom-sheet` 的下滑 / 遮罩 / Esc）与 `oas-open-change`，不擅自改宿主语义；切换 `layout` 时面板节点搬移而非重建，`onCleanup` 释放视口监听。选择可随时改动（单选组天然可换），数量可回退到 1；断开无计时器/监听残留（委托监听随节点释放）。
2. **属性默认值/空态**：`quantity` 缺省 1、非法回 1；`value` 非法 JSON 按未选处理；无 `specs` → 不渲染面板（宿主为空骨架）；无 `skus` → 不做库存约束；有 `skus` 但全无库存 → 全部选项置灰；`layout` 缺省按视口自动（≤480px 弹层 / 宽屏内嵌），非法值告警一次回落 `embedded`；`open` 缺省关闭，仅 popup 形态生效。**联动口径**：内嵌形态下宿主预置的 `open` 属性在形态切到 popup（显式或窄屏自动）时自动弹开——`open` 只在 popup 形态被承载，形态切换时即生效（非幽灵态）；内嵌形态下宿主写入的 `open` 是**待生效意图**，组件不抹除、也不因此派发事件（受控写入静默）。反向切换（popup → embedded，视口变宽或显式改 `layout`）**且弹层当时处于打开态**时，承载弹层已隐藏，组件同步把 `open` 回写 `false` 并派发一次 `oas-open-change`（`{ open: false }`）——受控宿主据此清滚动锁 / 遮罩态，不必回写 `open`；内嵌形态内部的常规更新（`quantity` / `disabled` / 视口重判等）不会动 `open`。
3. **多步交互失败点**：部分选择 → 全选链路；可用性按「其余已选规格吻合 + 在库」逐项判定，避免走到死路；数量上限 = 匹配 sku 库存，输入超库存钳制、加号到顶禁用；缺货组合下数量控件禁用；用户操作回写 `value`/`quantity` 后派发 `oas-change`（程序性写入不回派）。
4. **破坏性选项**：无破坏性行为；缺货仅禁用，不静默改选其他组合；内嵌形态调用 `openOverlay()` / `closeOverlay()` 只告警一次（不产生幽灵 open 态）；切换形态不丢选中与数量。
5. **键盘/ARIA**：每组 `fieldset` + `legend`；选项为原生 radio（方向键/空格）；缺货项原生 disabled 且文本含「缺货」；数量为 number input（spinbutton 语义）+ 加减按钮，均有 i18n 名称与关联标签；价格区 `aria-live="polite"`；移动粗指针下选项/步进抬到触摸目标高度。弹层形态下打开即聚焦面板首个可聚焦控件、Tab 在面板内循环（由 `oas-bottom-sheet` 承载）；关闭时焦点回带打开前触发器，滑出动画结束后承载件补 `hidden`（抽屉内控件退出 Tab 序与读屏树，不滞留屏外）；内嵌形态承载件 `hidden`，不留空 dialog 在读屏树里。
6. **受控/非受控与宿主桥接**：`value` / `quantity` / `open` 为受控属性镜像，用户交互回写并派发事件；`specs` / `skus` / `value` / `quantity` / `open` 均为 get+set 访问器（setter 容忍数组/对象/布尔与 JSON 字符串并反射 attribute），框架按「key in el」写 property 也能落到同一数据入口；实例内 radio name 由数据哈希派生，shadow 作用域内互不串选。

## 形态实现要点（一件两态）

- **同一面板节点**：`.panel` 在「内嵌容器」与 `oas-bottom-sheet` 的默认 slot 之间搬移（`appendChild`），选中态 / 焦点 / 数量输入随节点一起走，不重建 DOM、不复制内容。搬移前记录面板内的深活跃元素（含 shadow 路径），搬移后若活跃元素不再是原焦点（部分环境会退到 body / host），复原到原控件——键盘用户的焦点不因形态切换丢失。
- **只由宿主决定开合**：承载件只发 `oas-close`（协议），组件据此移除 `open` 并派发 `oas-open-change`；下滑 / 遮罩 / Esc 全部由 bottom-sheet 承担，本组件不挂 document 监听。
- **视口重判**：缺省 `layout` 用 `matchMedia('(max-width: 480px)')` 的 `change` 订阅（越界才回调），窄屏 ↔ 宽屏即时切换形态，无需刷新；显式 `layout` 不被视口覆盖。
- **已知边界（本轮记录不改）**：恰 480px 视口边界的形态切换未纳入 e2e（单测已以 matchMedia 桩覆盖 ≤480px 判定与自动切换逻辑，真实浏览器边界像素行为未单独立项）。
