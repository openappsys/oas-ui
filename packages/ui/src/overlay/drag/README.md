# oas-drag 组件说明

自由拖拽浮块（overlay 族）：把默认插槽的内容包成一个可拖拽的浮块，指针统一拖拽、边界钳制、可选惯性与位置记忆、键盘微调。设计前必答清单：

1. **取消路径**：拖拽由 `pointerdown / pointermove / pointerup` + `setPointerCapture` 完成；**`pointercancel` 与 `pointerup` 分离**——取消（滚动 / 系统手势接管）只收尾拖拽（释放捕获、撤 `data-dragging`、派发 `oas-drag-end`），**不写位置记忆、不起惯性**，避免把用户没打算要的位置落盘。惯性动画帧句柄在 `onCleanup` 与每次新拖拽前统一停止（`cancelAnimationFrame`），断连重连不残留帧、不残留捕获。无 `document` / `window` 级全局监听；拖拽结束会在宿主自身挂一枚捕获阶段 click 守卫（见第 3 条），`once` + 下一任务自动卸载。`reset()` 归位并清除位置记忆。
2. **属性默认值 / 空态**：`boundary` 缺省 `viewport`；`axis` 缺省 `both`（非法值回落并告警一次）；`inertia` / `remember` / `announce` 缺省关闭（未启用路径与「无该组件」行为一致）；`storage-key` 缺省 `oas-drag`；`keyboard` 缺省开启（写 `keyboard="false"` 关闭）。空槽（无子元素）时组件只保留空 surface，不产生额外几何。
3. **多步交互失败点**：指针按下 → 位移越过 4px 阈值 → 接管指针并置 `data-dragging`（此前一律视为点击，不 `preventDefault`、不捕获，子元素点击照常）；每次移动按边界钳制后写位移；松手释放捕获、派发 `oas-drag-end`、落盘位置并按需启动惯性。失败点：① 边界选择器未命中 → 告警一次并回落视口；② 边界小于宿主 → 钳到边界起点（不产生负数抖动）；③ `localStorage` 不可用（SSR / 隐私模式 / 配额满）→ 静默降级，拖拽照常；④ 惯性帧内触边 → 立即停止并派发结束事件；⑤ 越过阈值拖完后浏览器补发的那一次 `click` 在捕获阶段被拦下（松手恰好停在子按钮上不误触），守卫 `once` + 下一任务自动撤销，不吞掉之后的正常点击。
4. **破坏性选项**：无破坏性操作。`disabled` 在指针与键盘入口统一拦截（并移除宿主 tabindex），子元素保留原有交互；`position` 赋值只会被钳制，不会把浮块移出边界。
5. **键盘可达 / ARIA**：整宿主拖拽形态下宿主自身是焦点停靠点（`tabindex="0"`，带 i18n `drag.label` 可访问名 + sr-only 操作提示经 `aria-describedby` 关联）；方向键 1px、Shift+方向键 10px，受 `axis` 与边界约束；`announce` 开启时位置经 `aria-live="polite"` 播报（`drag.position` 文案）。**手柄形态下宿主不再抢焦点**——由宿主提供的手柄内容（如按钮）承载焦点，方向键从手柄内冒泡时同样生效；子元素内的输入框保留自身方向键语义（只接管目标为宿主或手柄路径的按键）。
6. **受控 / 非受控与宿主桥接**：拖拽状态非受控（组件自持位移，指针 / 键盘写回样式与存储），对外只暴露 `position` property（get + set，set 立即钳制生效、不派发事件）与 `reset()`；事件只在真实交互时派发。属性名 `boundary` / `axis` / `inertia` / `remember` / `storage-key` / `keyboard` / `announce` / `disabled` 不与 `HTMLElement` 内建成员冲突。

**拖拽面设计论证（整宿主 vs 手柄）**：默认整宿主可拖（零配置即用，符合悬浮客服钮的心智），同时提供 `handle` 插槽——手柄有内容时宿主**只**允许从手柄起拖，其余区域保持原有交互（点击、输入、滚动）；手柄形态下宿主自动不再抢占 Tab 停靠点。二者互斥由插槽内容决定，无需额外开关。

**样式约定**：组件接管宿主的 `transform` 与 `touch-action`。宿主用 CSS 决定自身定位（如 `position: fixed; inset-block-end: 24px; inset-inline-end: 24px`），组件只负责位移；`prefers-reduced-motion: reduce` 下惯性降级为瞬停、过渡关闭。位置记忆恢复的首帧会临时挂 `data-restoring` 关掉过渡（下一帧撤除），避免「页面加载即从原点滑到记忆位置」的可见滑入。

**SSR**：登记 `NOT_SSR`（reason `client-only`）——拖拽依赖指针事件与元素几何测量，位置记忆依赖 `localStorage`；DSD 快照无位置语义。
