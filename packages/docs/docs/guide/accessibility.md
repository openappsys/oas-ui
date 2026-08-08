# 无障碍（A11y）

OAS-UI 以 WCAG 2.1 AA 为目标，并有持续的 axe 自动化审计。

## 自动化审计

Playwright + axe-core 对每个组件 demo 页执行审计，零严重违规为通过标准：

```bash
pnpm test:e2e
```

审计范围覆盖 `wcag2a` / `wcag2aa` / `wcag21aa` 规则集，仅检查组件 demo 区域（`.demo`）。

## 键盘流回归矩阵

| 组件                                          | 键盘行为                           | 角色/ARIA                           |
| --------------------------------------------- | ---------------------------------- | ----------------------------------- |
| Button                                        | Enter/Space 触发                   | `button`                            |
| Input / Textarea                              | 原生输入                           | `textbox` + `label`                 |
| Checkbox / Radio / Switch                     | Space 切换、方向键（Radio）        | `checkbox` / `radio` / `switch`     |
| Slider                                        | 方向键 + Home/End                  | `slider`（`aria-valuenow`）         |
| InputNumber                                   | 方向键增减、Home/End               | `spinbutton`                        |
| Rate                                          | 方向键、Enter 确认                 | `radiogroup` + `radio`              |
| Select / AutoComplete / Cascader / TreeSelect | 方向键导航、Enter 选择、Esc 关闭   | `combobox` + `listbox`/`tree`       |
| Menu / Dropdown / ContextMenu                 | 方向键、Home/End、Enter            | `menu` + `menuitemradio`            |
| Tabs                                          | 方向键循环切换                     | `tablist` + `tab` + `aria-selected` |
| Tree                                          | 方向键 + 左右展开/收起             | `tree` + `treeitem`                 |
| Modal / Drawer / Confirm                      | Tab 焦点困在对话框、Esc 关闭       | `dialog` + `aria-modal`             |
| Tooltip / Popover / HoverCard                 | Esc 关闭                           | `tooltip` / `dialog`                |
| Pagination                                    | Tab 到页码按钮                     | 语义按钮 + `aria-current`           |
| Carousel                                      | 指示器可 Tab 聚焦                  | `role="tablist"` + `role="tab"`     |
| Collapse                                      | 表头可 Tab 聚焦 + Enter/Space 展开 | 按钮语义                            |
| Splitter                                      | 方向键调整                         | `separator` + `aria-orientation`    |

## 语义原则

- 表单控件均有可访问名称（`aria-label` 或关联 label）
- 弹层类组件提供 `role` + `aria-modal` + Esc 关闭
- 动态区域（loading / 弹窗打开）提供 `aria-live` 或焦点管理
- 颜色仅用语义 token，确保明暗主题下对比度达标
