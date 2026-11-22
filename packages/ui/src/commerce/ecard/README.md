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
