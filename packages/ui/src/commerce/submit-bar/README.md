# oas-submit-bar 设计前必答

1. **取消路径**：无浮层；按钮无动作时整块省略（`action-text` 缺省）；宿主可随时移除组件，无计时器/监听残留。
2. **属性默认值/空态**：`total` 缺省 → 金额区空；`label` 缺省走 i18n；`action-text` 缺省 → 不渲染按钮；`loading` / `disabled` / `danger` 默认关。
3. **多步交互失败点**：点击为单步；loading / disabled 时按钮原生 disabled + `aria-busy`，事件入口再判一次（防程序化 click）；config-provider 注入禁用同样拦截。
4. **破坏性选项**：`danger` 是显式 opt-in，默认主色；未被禁用时点击即派发，不做二次确认（确认交互归宿主 popconfirm）。
5. **键盘/ARIA**：原生 `<button>`（Tab/Enter/Space）；合计区 `aria-live="polite"`；spinner `aria-hidden`；loading 保留按钮可读名称。
6. **受控/非受控与宿主桥接**：全部为属性通道；Vue 中 `total` / `action-text` 走 attribute 绑定，无 property 冲突（避开 `prepend` 等原生名）。
