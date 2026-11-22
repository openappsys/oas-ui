# oas-invoice 发票

发票信息表单（commerce 族）：个人 / 企业抬头切换、税号校验、发票内容选择、已保存抬头选择弹层。

## 设计前必答

1. **取消路径**：表单不自动提交；弹层支持 `Esc`、外点关闭并归还焦点，无残留浮层。
2. **属性默认值 / 空态**：`type` 默认 `personal`；`contents` / `save-titles` 缺省或非法 JSON 时分别隐藏内容字段 / 弹层入口（不抛异常）。
3. **多步交互失败点**：提交校验抬头必填、企业抬头税号 15–20 位字母或数字；失败派发 `oas-invalid` 并聚焦首个错误字段；「选择已保存抬头」是纯回填动作，失败只可能是 id 不存在（静默忽略）。
4. **破坏性选项**：无；切换抬头类型保留已输入草稿（切换前固化到属性，避免 update 回写吞输入）。
5. **键盘 / ARIA**：类型切换为 `role="radiogroup"` + 两项 `role="radio"`（`←` / `→`）；弹层触发按钮 `aria-haspopup="listbox"` / `aria-expanded`，列表 `role="listbox"` + `role="option"`，`↑` / `↓` / `Enter` / `Esc` 全支持。
6. **受控 / 非受控**：`type` / `title` / `tax-id` / `content` 受控；输入只派发 `oas-change` 不反写属性；外部属性变化回写输入框。

## 数据契约（宿主注入）

- `contents`：`[{ value, label }]`
- `save-titles`：`[{ id?, type: 'personal' | 'company', title, taxId? }]`
- 提交值：`{ type, title, taxId, content }`

## 事件

| 事件 | detail |
| --- | --- |
| `oas-change` | `{ field, value }`（type / title / taxId / content / saved） |
| `oas-title-select` | `{ id, value }` |
| `oas-invalid` | `{ fields }` |
| `oas-submit` | `{ value }` |
