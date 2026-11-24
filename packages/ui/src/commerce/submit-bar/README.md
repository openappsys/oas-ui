# oas-submit-bar 设计前必答

1. **取消路径**：无浮层；按钮无动作时整块省略（`action-text` 缺省）；宿主可随时移除组件，无计时器/监听残留。
2. **属性默认值/空态**：`total` 缺省 → 金额区空；`label` 缺省走 i18n；`action-text` 缺省 → 不渲染按钮；`loading` / `disabled` / `danger` 默认关；`tip` / `tip-icon` 缺省 → 提示行整体隐藏（`tip` 空时 `tip-icon` 一并隐藏）。
3. **多步交互失败点**：点击为单步；loading / disabled 时按钮原生 disabled + `aria-busy`，事件入口再判一次（防程序化 click）；config-provider 注入禁用同样拦截。`tip-icon` 未注册 → devWarn 一次（实例级去重）并跳过图标，文案照常可读——不因一个错名把提示行画没。
4. **破坏性选项**：`danger` 是显式 opt-in，默认主色；未被禁用时点击即派发，不做二次确认（确认交互归宿主 popconfirm）。
5. **键盘/ARIA**：原生 `<button>`（Tab/Enter/Space）；合计区 `aria-live="polite"`；spinner 与提示行图标 `aria-hidden`；loading 保留按钮可读名称。
6. **受控/非受控与宿主桥接**：全部为属性通道；Vue 中 `total` / `action-text` 走 attribute 绑定，无 property 冲突（避开 `prepend` 等原生名）。
7. **占位配方（无 placeholder 属性）**：栏体缺省 `position: sticky`（文档流内自带占位，无需占位块）。宿主用 CSS 覆写为 `fixed` 时**自行给页尾留白**（如 `padding-bottom`），高度对齐用 `--oas-submit-bar-height`（栏体最小高度 token，缺省 `--oas-control-height-xl`，写在 `.bar` 上、`box-sizing: border-box` 含内边距）；含 `tip` 提示行时按实际渲染高度另加。曾试过组件内渲染等高占位块：占位块与栏体同属 host，`fixed` 下 host 不占文档流，占位块反而把栏体撑高——已撤，占位责任归宿主。
8. **`::part(bar)` 结构**：bar 内部为 column flex（`.tip` 提示行 + `.row` 主行两层堆叠）；宿主覆写 `::part(bar)` 的 `flex-direction` 会把提示行与主行挤到同一行——覆写布局时须连同 `::part(tip)` / `::part(row)` 一起考虑。
