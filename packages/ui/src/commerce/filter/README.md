# oas-filter 设计前必答

1. **取消路径**：面板开合是唯一浮层态，随 `open` attribute 落盘（宿主可预置），断连时全局监听（外点 / Esc / drawer Tab 陷阱）经 `unbindOpenListeners` 全量摘除（断连清理只注册一次，开合循环不增长），无孤儿监听；drawer 形态遮罩点击 / 「完成」按钮 / Esc 三路出口都回到「关闭 + 焦点回触发器」，无中间卡死态。dropdown 展开时按视口空间判定翻转（下方放不下贴顶展开），测量全 0（未布局）时维持向下。无异步、无计时器；「条件持久化 / 分页协议」不在本件内（见下方预留能力面）。
2. **属性默认值/空态**：`sorts` 缺省三件套（综合 / 销量 / 价格，价格 toggled——文案走 i18n 非硬编码），非法 JSON 告警一次回落缺省；`groups` 缺省 / 非法 → 空条件组，此时触发器隐藏（无可筛内容不渲染空钮）；`conditions` 缺省 / 非法 → 空条件（排序回落第一项显示），非法告警一次；`panel` 非法回落 dropdown 并告警一次；`order` 仅 toggled 排序项有意义，非 toggled 项无方向；已选计数为 0 时徽标隐藏。
3. **多步交互失败点**：面板开合一步完成（点击立即回写 + 派发，无等待态）；选中值即时同步（aria-checked / chips / 摘要同帧），无「待应用」中间态；重置不派发确认（可逆操作，重置即回缺省）；`disabled` 选项按钮原生禁用，点击无效。
4. **破坏性选项**：无破坏性动作；重置是唯一批量清除，语义为「回到不限」（可逆、无数据删除）；chips 逐项撤销 + 重置双粒度并存。
5. **键盘/ARIA**：触发器 `aria-haspopup` + `aria-expanded` + `aria-controls`（面板 id 由 groups/sorts 派生 `stableHash36`，同页多实例唯一；可访问名从可见内容推导——排序标签 + 计数徽标，不用 aria-label 包裹避免 label-in-name 不一致）；开面板聚焦首个未禁用条件，Esc 关闭焦点回触发器；drawer 形态面板为模态对话框（`role="dialog"` + `aria-modal="true"`），Tab / Shift+Tab 焦点循环限制在面板内（游离面板外的焦点拉回首项），dropdown 非模态不挂 dialog 语义；排序行 `role="radiogroup"`（项 `role="radio"` + `aria-checked`，toggled 项 `aria-label` 附「，升序/降序」）；单选组 `radiogroup`、多选组 `group`（各带组名），选项 `radio`/`checkbox` 语义 + Tab 全可达 + 组内方向键移动焦点（不触发选择）；chips 是按钮，`aria-label` = i18n「移除 {条件名}」，撤销后焦点迁相邻 chip（无相邻回触发器）；汇总摘要进 `role="status"` + `aria-live="polite"` 活区（视觉隐藏），宿主可读 `oas-change` detail.summary 自行播报。
6. **受控/非受控与宿主桥接**：`conditions` / `sorts` / `groups` 均为 get+set 访问器（setter 容忍对象/数组与 JSON 字符串并反射 attribute），Vue/React 按 property 赋值不丢数据；`open` get+set 双通道（宿主直写静默，`setOpen()` / 用户交互才派发 `oas-open-change`）；`oas-change` 在用户交互后派发（宿主写 `conditions` 不派发——受控与非受控同一通道不回环）；属性名避开 DOM 内建（`sorts` / `groups` / `conditions` / `panel` / `open` 均无 HTMLElement 原型成员冲突，`open` 为 get+set 遮蔽形态）。

## 值契约

```html
<oas-filter
  sorts='[{"key":"default","label":"综合"},{"key":"sales","label":"销量"},{"key":"price","label":"价格","toggled":true}]'
  groups='[{"key":"brand","label":"品牌","multiple":true,"options":[{"value":"a","label":"品牌A"},{"value":"b","label":"品牌B"}]},{"key":"color","label":"颜色","options":[{"value":"red","label":"红色"},{"value":"blue","label":"蓝色"}]}]'
  conditions='{"sort":"price","order":"desc","groups":{"brand":["a"]}}'
></oas-filter>
```

- `conditions.order` 只在当前排序项 `toggled` 时有意义（`asc` / `desc`，首次点击 toggled 项 = 降序）。
- `conditions.groups` 恒为 `组key → 字符串数组`：多选组任意项，单选组 ≤1 项（清洗层强制）。
- `oas-change` detail：`{ sort, order, groups, summary }`——summary 是「价格 降序；品牌：品牌A」形态的汇总文本，供 aria-live。

## 预留能力面（包体分级：本体冻结在大众功能集）

以下为「重量级、可选、场景化」增强，**不在本体内联**；落地时走 L3 能力子路径
`commerce/filter/<能力>`（登记 `scripts/perf/lib/l3-registry.mjs` + `docs/perf-baseline.md` §4 独立预算档）：

- **条件持久化**（localStorage / URL search 同步）：历史筛选记忆与深链还原。
- **服务端筛选协议**：条件变更 → 请求取消 / 防抖 / 重试的宿主侧 helper。
- **范围条件组**（价格区间等自定义输入条件）：配置面扩展 + 区间校验。
- **面板位置自适应**（窄屏自动 drawer / 宽屏 dropdown）：视口侦测联动。

当前本体接口（attribute / event / slot）对上述能力保持开放：能力子路径以「读取 conditions / 调用 setOpen / 监听 oas-change」的宿主组合实现，无需改本体 API。
