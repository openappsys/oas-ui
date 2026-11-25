# oas-invoice 发票

发票信息表单（commerce 族）：个人 / 企业抬头切换、税号校验、发票内容选择、已保存抬头选择弹层。

## 设计前必答

1. **取消路径**：表单不自动提交；弹层支持 `Esc`、外点关闭并归还焦点，无残留浮层。
2. **属性默认值 / 空态**：`type` 默认 `personal`；`contents` / `save-titles` 缺省或非法 JSON 时分别隐藏内容字段 / 弹层入口（不抛异常）。
3. **多步交互失败点**：提交校验抬头必填、企业抬头税号 15–20 位字母或数字；失败派发 `oas-invalid` 并聚焦首个错误字段；「选择已保存抬头」是纯回填动作，失败只可能是 id 不存在（静默忽略）。
4. **破坏性选项**：无；切换抬头类型保留已输入草稿（切换前固化到属性，避免 update 回写吞输入）。
5. **键盘 / ARIA**：类型切换为 `role="radiogroup"` + 两项 `role="radio"`（`←` / `→`）；弹层触发按钮 `aria-haspopup="listbox"` / `aria-expanded`，列表 `role="listbox"` + `role="option"`，`↑` / `↓` / `Enter` / `Esc` 全支持。
6. **受控 / 非受控**：`type` / `title` / `tax-id` / `content` 受控；输入只派发 `oas-change` 不反写属性；外部属性变化回写输入框。
7. **控件选型（复合组件第一决策）**：内部控件（`oas-input` / `oas-select` / `oas-button` 等）**默认优先**——视觉/键盘/a11y 细节已打磨（箭头留白补偿、键盘流、主题跟随），原生控件不会自动继承；选原生必须显式记录理由（跨族体积增量 / 表单语义 / 移动端原生选择器体验），且原生控件须做视觉对齐层（appearance 重置 + token 化箭头/边框，对齐内部组件的间距节奏）。

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

## property 通道

`contents` / `saveTitles` 另有同名 get/set：赋数组时序列化后反射成 attribute（读取返回解析后的
数组），字符串原样写入——框架静态数据绑定无需手写 `JSON.stringify`。

- `content` 值不在 `contents` 选项里（宿主替换过选项）时，dev 环境告警并回落首项、同步写回 attribute。
- `save-titles` 从 0 涨到 N 时 `.empty` 空态同步隐藏（否则弹层里会残留「暂无已保存抬头」）。
- 弹层做了视口空间检测：下缘放不下且上方更宽裕时 `data-placement="up"` 向上翻转。
- 类型切换的方向键按 `direction` 取符号（`segmentedStep`）：RTL 下 `←` 是下一项。
- readonly 走原生 `readOnly`（可聚焦复制），只有 `disabled` 才是禁用。

## 定版前评审记档（不修项）

- **浮层受控面与 `oas-coupon` 的差异**：「选择已保存抬头」弹层是纯内部 UI 状态（由触发按钮 / Esc / 外点控制），没有受控属性或命令式开关；`oas-coupon` 的券列表弹层则有 `open` 受控属性 + `openOverlay()` / `closeOverlay()`。定位不同（辅助选择器 vs 宿主可编排的主要交互面），本批不统一，留待与 ui-spec §2.5 一并评审。

