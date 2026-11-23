# oas-ecard 电子卡

电子卡 / 储值卡购买面板（commerce 族）：卡面列表选择、自定义面额、协议勾选确认。

## 设计前必答

1. **取消路径**：确认按钮即提交入口，无中间隐藏态；自定义面额区随选中态显隐，切回卡面即回到确定金额。
2. **属性默认值 / 空态**：`cards` 缺省 / 非法 JSON → 空列表（空态文案）；无可用卡自动回落到 `custom`（自定义面额）保证仍可购买；`min-amount` 默认 1、`max-amount` 默认 10000；自定义面额前缀符号由 `currency` 控制（默认 `¥`）。
3. **多步交互失败点**：点击确认时集中校验面额（整数 / 区间）与协议勾选；失败派发 `oas-invalid`（fields: amount / agreement）并标记对应区域；`disabled` / `readonly` 拦截全部交互。
4. **破坏性选项**：无；协议文案可由 `slot="agreement"` 覆盖（可放链接），默认文案走 i18n。
5. **键盘 / ARIA**：卡面为原生单选组，每项 radio 带卡名 `aria-label`；协议为原生复选框；金额错误通过 `aria-invalid` 关联；`selected-id` / `agreed` 为受控通道。
6. **受控 / 非受控**：用户输入金额只更新输入框（不反写 `amount`，避免重渲染吞输入）；选择卡 / 勾选协议回写 `selected-id` / `agreed` 并派发 `oas-change`。

## 数据契约（宿主注入）

- `cards`：`[{ id, name, value: number, faceValue: string, price?: string, description?: string, disabled?: boolean }]`
- `value` 是提交金额（数值）；`faceValue` / `price` 是展示文案（含币种符号，由宿主决定）
- 提交 detail：`{ card, cardId, amount, custom, agreed }`

## 事件

| 事件 | detail |
| --- | --- |
| `oas-change` | `{ card, cardId, amount, custom, agreed }` |
| `oas-submit` | `{ card, cardId, amount, custom, agreed }` |
| `oas-invalid` | `{ fields }` |

## property 通道

`cards` 另有同名 get/set：赋数组时序列化后反射成 attribute（读取返回解析后的卡面数组），
字符串原样写入——框架静态数据绑定无需手写 `JSON.stringify`。

- 命名纪律：attribute 的 camelCase 不得与实例方法同名（`selected-id` / `min-amount` /
  `max-amount` 的解析方法分别叫 `selectedIdOf` / `resolveMinAmount` / `resolveMaxAmount`），
  否则宿主 property 写入会遮蔽方法，`update()` / `submit()` 直接 TypeError。
- 选中态只用「主色描边 + 1px 内环」，不叠色底：primary 6% 混色会把次要文字压到 WCAG 4.44
  （AA 4.5 不达标）。

## 定版前评审记档（不修项）

- **事件 detail 平铺口径**：`oas-change` / `oas-submit` 的 detail 直接平铺 `{ card, cardId, amount, custom, agreed }`，不套一层 `{ value: {...} }`。与部分表单类控件的 `detail.value` 包裹形态不一致，属**已发布的既有契约**：改为包裹会破坏全部宿主监听器，故定版前不动。新增事件若要包裹，需在文档里对两类形态分别说明（本仓记录，后续批次决定是否引入统一包装）。

