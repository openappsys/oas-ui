# oas-address 地址

地址簿组件（commerce 族）：地址编辑表单 + 地址列表（默认标记 / 单选）+ 省市区三级联动；含联系人轻模式（姓名 + 电话，不独立成件）。

## 设计前必答

1. **取消路径**：编辑表单不自动提交，宿主可随时卸载；列表单选是幂等选择，无中间态残留。
2. **属性默认值 / 空态**：`mode` 默认 `edit`；`regions` / `items` / `value` 缺省或非法 JSON 均回落空数据（不抛异常），列表空态有文案与「新增地址」入口。
3. **多步交互失败点**：保存时集中校验（姓名 / 电话 / 地区完整性 / 详细地址），失败派发 `oas-invalid` 并聚焦首个错误字段；禁用 / 只读态在输入、下拉、按钮三处同时拦截。
4. **破坏性选项**：无破坏性操作；「新增地址」只派发 `oas-add`，由宿主决定是否插入表单。
5. **键盘 / ARIA**：输入与下拉走原生控件；列表使用原生单选组（`role="radiogroup"`）；错误通过 `aria-invalid` / `aria-describedby` 关联，分组有 `role="group"` 与可访问名。
6. **受控 / 非受控**：`value` / `items` / `selected-id` 为受控通道；用户输入只更新内部草稿并派发 `oas-change`，不反写属性（避免宿主重渲染吞输入）；外部改 `value` 时按签名变化重新预填。

## 省市区数据契约（宿主注入，不内置）

组件不打包行政区划数据：完整县级数据体积大、更新频繁，内置会让按需包体不可控且数据版本不可追溯。`regions` 是唯一契约：

```json
[{ "name": "浙江省", "code": "330000", "children": [{ "name": "杭州市", "children": [{ "name": "西湖区" }] }] }]
```

- 最多三级；节点 `name` 既作展示也作提交值，`code` 可选
- 未注入时地区下拉为空且跳过地区校验，详细地址照常可填

## 事件

| 事件 | detail |
| --- | --- |
| `oas-change` | `{ field, value }` — 字段输入 / 地区变化（value 按 value-format 归档） |
| `oas-submit` | `{ value }` — 编辑模式校验通过（value 按 value-format 归档） |
| `oas-invalid` | `{ fields }` — 校验失败（含 validator 自定义错误键） |
| `oas-select` | `{ id, item }` — 列表选中 |
| `oas-add` | 无 — 列表新增入口 |
| `oas-edit` | `{ id, item }` — 列表行「编辑」钮，宿主据此进编辑模式 |
| `oas-delete` | `{ id, item }` — 列表行「删除」钮（`show-delete` 在场）；确认弹层归宿主 |

## 删除确认配方（popconfirm 组合）

组件的删除钮只报告意图（`oas-delete`），**不内置确认弹层**——确认文案与撤销策略是宿主业务的一部分。宿主配方：

```html
<oas-popconfirm content="确定删除该地址？">
  <oas-button slot="reference" danger>删除</oas-button>
</oas-popconfirm>
```

组件内流程：用户点卡片上的「删除」→ `oas-delete` 冒出 → 宿主弹 `oas-popconfirm`（或自己的确认 UI）→ 确认后宿主改 `items`（组件自愈：选中项被删时 `selected-id` 回落并派发 `oas-select`）。请求删除期间的忙态用 `deleting`（删除钮禁用 + spinner）。

## 设计前必答（新增增量）

- **行内编辑钮**：每张卡恒有（list 模式），点击派发 `oas-edit`；卡片结构是 `div.card > label.card-main(radio + 内容) + .card-actions`——操作钮不嵌进 label（点击钮不会误触选中，也无嵌套交互语义问题）。
- **show-delete**：缺省不渲染删除钮（与现状等价）；在场时每卡一个删除钮。
- **saving / deleting**：忙态与 `disabled` 正交——`saving` 锁保存钮（+ `aria-busy` + spinner），`deleting` 锁删除钮；`submit()` 入口对 saving 再判一次（防程序化 submit）。
- **validator**：function property（`el.validator = (key, value) => 错误串 | null`），内建校验之后逐字段调用；抛错 devWarn 一次并按无错误处理（宿主钩子 bug 不把表单锁死）；错误键并入 `oas-invalid.fields` 且渲染到对应字段下方（province/city/district 归到地区组）。
- **value-format**：`name`（默认，输出与现状等价）/ `code`（提交与 change 的省/市/区输出 `regions` 的 `code`，缺 code 回退名称；回填按 code 匹配下拉）。format 变更会强制重放 value（签名含 format）。

## property 通道

`value` / `items` / `regions` 另有同名 get/set：赋对象/数组时序列化后反射成 attribute（读取返回
归一化后的对象/数组），字符串原样写入——框架静态数据绑定无需手写 `JSON.stringify`。

- 选中项被宿主从 `items` 删掉时，`selected-id` 回落到 `isDefault` / 首项并派发 `oas-select`。
- readonly 走原生 `readOnly`（可聚焦复制、不可编辑），只有 `disabled` 才是禁用。
- contact 轻模式没有提交按钮，输入框 Enter 的隐式提交被拦截（不会冒出无按钮可触发的 `oas-invalid`）。
- 隐藏分区（list 模式的表单、contact 模式的地区组）除 `hidden` 外还挂 `inert`：隐藏控件不该被
  键盘 / 读屏触达，也避免无障碍静态扫描把它们当成「有文字但取不到配色」的噪声。
- 电话校验：`+` 仅首位，总字符长 6–21（`+` 占 1 位时上限 21）且至少 6 位数字（纯符号串不通过）。

