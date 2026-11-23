# oas-time-select 组件说明

配送时段选择（commerce 族）：日期列（今日起 N 天）+ 时段网格，「尽快送达 / 预约配送」两模式；不可选时段区分「休息」与「满约」。设计前必答清单：

1. **取消路径**：无浮层、无全局监听、无计时器；空时段集合渲染「暂无可选时段」占位（不是空白块），此时 `value` 为空对象形态（`date` / `slot` 皆空串）。日期与时段按钮集合按属性签名重建，事件委托挂在 shadow 内部容器上，重建不残留监听；键盘选择后焦点留在同一行的可用项上，不因状态同步而丢失。
2. **属性默认值 / 空态**：`days` 缺省 3（合法范围 1–14，非法值回落 3 并告警一次）；`start-date` 缺省今天（非法值回落今天并告警）；`slots` 缺省空（空态文案）；`slots-override` 缺省不覆盖（某日写成空数组 = 该日不可配送）；`mode` 缺省 `express`（非法值回落 `express` 并告警）；`value` 缺省按「首个可用时段」归一。
3. **多步交互失败点**：选模式 → 选日期 → 选时段，每步都写回 `value` 属性后派发 `oas-change`。失败点有三：① 点击休息 / 满约时段——不改变值、不派发事件（`aria-disabled` + 视觉标记）；② 选中日期的时段全部不可用——该日期在列里标 `aria-disabled` 并被键盘导航跳过；③ 宿主写入的 `value` 指向不可选时段——归一为该日首个可用时段（不留「界面无选中但值非空」的静默错位）。尽快送达模式**忽略**宿主 `value`，恒取首个可用时段（值的语义由模式决定，文档写死）。不可选时段是原生 `disabled` 按钮（同时带 `aria-disabled`），与不可配送日期钮同一处理。
4. **破坏性选项**：无破坏性操作。`disabled` 在入口统一拦截（模式钮、日期、时段），`injectDisabled()` 同时尊重 config-provider 注入。
5. **键盘可达 / ARIA**：模式组、日期列、时段网格都是 roving tabindex 的复合控件（同一时刻各一个 Tab 停靠点）：模式组为 `role="radiogroup"` + `role="radio"`，左右方向键切换模式并迁移焦点（RTL 下左右语义镜像，Home / End 到首末模式）；日期列 `role="tablist"`（`aria-orientation="vertical"`）+ `role="tab"`，`aria-selected` 同步；时段网格 `role="radiogroup"` + `role="radio"`，`aria-checked` 同步。日期与时段的方向键在**可用项之间**移动（跳过休息 / 满约 / 不可配送日），Home / End 到首末可用项，RTL 下左右方向语义镜像；网格的 `aria-labelledby` = 视觉隐藏的分组标题 + 当前日期 tab（读屏能说出「配送时段 · 1月5日 周一」）。日期文案走 `Intl.DateTimeFormat`（locale 感知），今天 / 明天用 i18n 相对文案。次要文字（相对日 / 尽快送达详情）落在外观带底色的表面上，用 `--oas-color-text-secondary-strong` 保证 AA（`text-secondary` 在 `bg-hover` 上仅 4.39:1）。
6. **受控 / 非受控与宿主桥接**：`value` 为 get+set 双通道（对象 property + JSON attribute 双容忍，赋值即生效、不派发事件）；`days` 同为 get+set。`mode` 只走 attribute（组件内模式钮写回，宿主可读可写）。属性名 `days` / `mode` / `slots` / `start-date` / `value` 不与 `HTMLElement` 内建成员冲突（撞名守卫已核验）。

**空选态的 attribute 分歧（已知且有意）**：无可选时段（`slots` 缺失 / 非法 / 全部休息或满约）时，组件渲染「暂无可选时段」空态，`value` property 返回 `{ date: '', slot: '' }`，但**不回写 `value` attribute**（`syncValueAttr()` 在 `activeSlot === ''` 时短路）——attribute 会短暂保留宿主上次写入的 JSON。设计取舍：空态下写回空对象会把「宿主写入的原始值」抹成无人可选的空值（不可逆信息丢失），因此宁可让 property / attribute 在空态期间分歧；一旦出现可选时段，选中即回写。宿主应以 **property** 为准（或监听 `oas-change`），不要用 attribute 推断当前选中。

**SSR**：本批登记 `NOT_SSR`（reason `pending`）。日期文案依赖运行期 `Intl` 与时区、选中态依赖「今天」基准，快照确定性需要额外的时区锚定约定；`template()` / `render()` 保持同构写法，后续白名单化需补时钟锚定与 `hydrate()`。
