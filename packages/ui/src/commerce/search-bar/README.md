# oas-search-bar 设计前必答

1. **取消路径**：无浮层、无异步计时器；惯例面板（历史词 / 热门词 / 联想位）随聚焦开合（focus 开 / blur 关 / Esc 收），纯状态切换无孤儿产物；取消钮 = 清空 value + 收起面板 + blur + 一次性派 `oas-cancel`（detail 携带清空前值，宿主可按需恢复），三步同帧完成无中间态。**历史词持久化归宿主**（宿主写 localStorage 并渲染进插槽），组件不持有、不落盘任何数据——断连即无痕迹。全局无监听（面板开合不走 outside-dismiss：失焦即收，不需要文档级监听）。
2. **属性默认值/空态**：`value` 缺省空串（placeholder 可见）；`placeholder` 缺省 i18n「搜索商品」；`disabled` 缺省关（config-provider 注入 `disabled` 同样生效）；`hide-cancel` 缺省关（取消钮显示）。三个插槽全空时面板**永不展开**（聚焦也不出空面板）；value 有无决定分组切换（空值 = 历史/热门、有值 = 联想），切换即时跟随。
3. **多步交互失败点**：搜索一步完成（Enter / 搜索钮 → 同帧派 `oas-search` + 收面板），无等待态；**空值搜索不派发**（无意义空搜索，防宿主拿空串打接口）；清除钮清空 + 派 `oas-input`（只听 oas-input 的宿主不漏清除）+ 焦点回输入框；插槽内容点击经面板 `pointerdown` preventDefault 保持焦点（历史词可点中），宿主插槽内若放输入类元素需自行管理焦点。
4. **破坏性选项**：无破坏性动作；清空 / 取消都可逆（detail 携带清空前值）；历史词是宿主数据，组件不删除。
5. **键盘/ARIA**：输入框 `type="search"`（隐式 searchbox）+ `enterkeyhint="search"`（移动虚拟键盘显示「搜索」）+ `aria-label`（i18n，不依赖 placeholder——placeholder 不满足持久可读）；Enter 触发搜索、Esc 收面板；搜索钮 / 清除钮图标无可见文字，`aria-label` 各取 i18n（搜索 / 清除搜索内容）；取消钮可见文本天然可读；清除钮 `tabindex="-1"` 不进 Tab 序（Tab 顺序 = 输入框 → 搜索钮 → 取消钮，清除走鼠标 / 已聚焦场景）。面板非浮层语义（无 role="dialog"/aria-expanded——它是输入框的伴随内容而非独立窗口，读屏经正常 Tab 序可达插槽内容）。
6. **受控/非受控与宿主桥接**：`value` get+set 访问器（写反射 attribute），Vue/React 按 property 赋值不丢数据；输入过程组件**回写 attribute**（静默）+ 派 `oas-input`（宿主联想渲染的信号）；`oas-search` / `oas-cancel` 只在用户触发时派发（宿主写 value 不派发——受控与非受控同一通道不回环）；属性名避开 DOM 内建（`value` 为 get+set 遮蔽形态——HTMLElement 无 value 内建成员，安全；`placeholder` / `disabled` / `hide-cancel` 均无原型冲突）。

## 与 oas-input 的边界（组装口径）

oas-input 是通用文本输入（前后缀文案 / `prefix-icon` 图标 / `enterkeyhint` 虚拟键盘 / clearable / 表单校验 / 加删格式），**已具备** `prefix-icon="search"` + `enterkeyhint="search"` 的组装能力。search-bar 不重复输入控件本体，只封装「搜索页惯例」：Enter / 搜索钮的触发语义（`oas-search` 统一出口）、取消钮的退出语义、历史词 / 热门词 / 联想位的**槽位与显隐分组**（空值 = 历史/热门、有值 = 联想——主流移动搜索惯例）。需要完整输入能力（格式化 / 校验 / 前后缀）的搜索场景直接用 oas-input 组装；搜索页闭环（触发 + 退出 + 槽位惯例）用 search-bar。二者不是替代关系。

## 预留能力面（包体分级：本体冻结在大众功能集）

- **搜索历史持久化协议**（组件内建 localStorage 记录 + 隐私模式降级）：历史数据归宿主是设计内边界，若要组件托管走 L3 子路径。
- **联想防抖 / 取消器**（输入防抖 + AbortController 取消上一次请求的宿主侧 helper）。
- **语音输入 / 扫码入口插槽扩展**。

当前本体接口（slot / event）对上述能力保持开放：能力子路径以「监听 oas-input / 渲染插槽」的宿主组合实现，无需改本体 API。
