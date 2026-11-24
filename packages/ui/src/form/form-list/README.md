# oas-form-list 动态字段行

在表单内维护一组可增删的字段行：组件内放一个 `<template>` 作为行模板，克隆出的行内字段 `name`
自动索引化（`users.{index}.name` 或给组件设 `name="users"` + 裸字段名自动加前缀），行删除后
剩余行重新编号、已填值随行保留。字段留在 light DOM，校验 / 提交 / `oas-values-change` 随主表走。

## 行数与行操作（V2 批 1）

- **行数两个来源**：`rows` 只决定初始渲染行数，`min` / `max` 是删行下界 / 增行上界。未提供 `rows`
  时 `min` 兼作初始行数（既有用法不变）；删行下界默认 0——`minItems` 违规交给校验层报错，不再
  「初始 1 行的唯一行删不掉」。
- **行操作区**（行尾）：复制 / 上移 / 下移 / 删除，`part` 分别为 `duplicate` / `move-up` /
  `move-down` / `remove`，可访问名走 `schemaForm.rowDuplicate` 等 i18n 键，也可用
  `duplicate-text` / `move-up-text` / `move-down-text` / `remove-text` 覆盖。
- **语义**：复制 = 内核 `getValues()` 行子树深拷贝插到下一行（upload 跳过——文件体不可序列化）；
  上移 / 下移 = 相邻两行**值交换**（DOM 顺序不动）。值读写都走内核通道
  （`readFormControlValue` / `writeFormControlValue`，未注册 writer 时回落 `value` 属性）。
  操作后按行位置重聚焦（边界处退到反向按钮）+ `aria-live` 播报。
- **事件**：`oas-add` / `oas-remove` `{ index }`，`oas-duplicate` / `oas-move` `{ from, to }`。
- **程序化接口**：`rowCount` 只读、`setRowCount(n)` 收敛行数（增补 / 缩减，不派发事件，
  受控数组缩容与行值内层数组对齐用）、`insertRowAt(index)` 插行。
- **虚拟滚动（v2.6.9）**：`virtual` 开启窗口化渲染（缺省关 = 现状逐字节等价）——只挂载可视窗口
  + `overscan`（上下各 5 行起）的阴影帧，上下 spacer 占位（总高不变、滚动条真实），行高首渲染
  估高（`estimated-row-height`，缺省 56px）→ 窗口内实测校准（实测值同步校准预估，均匀模板一次
  测量即整表对齐）。**字段全部留在 light DOM 不窗口化**：主表收集 / 校验 / 提交 / name 重编号 /
  行操作 / 受控通道语义完全不变，虚拟化只发生在阴影帧层（未 slot 的行 wrapper 不渲染、零布局
  成本）。视口高度 `viewport-height` 属性优先，缺省量测 `.items` 实际高度（CSS
  `--oas-form-list-viewport-height` 覆盖）。高度模型无条件随行操作同步（插入 / 删除按下标平移
  实测高、移动交换实测高），`virtual` 运行时开关不错位。
- **断开重连**：行记录不随断开清理（行 wrapper 留在 light DOM），重连只重挂观察器——否则会按
  初始行数再建一遍（行数翻倍）。

完整用法与取值口径见文档站 form 页的 `oas-form-list` 说明段（本组件无独立文档页）。

## 定版前评审记档（不修项）

- **`add-text` / `remove-text` 文档缺位**：两个属性已在 `docs/api-manifest/oas-form-list.json`
  登记（值为 `api:scan` 的作品，属性本身有单测守护），但组件没有独立文档页、form 页的 API 表只覆盖
  `oas-form`，所以读者在站上查不到这两个属性的说明。补法需要新建 form-list 文档页（或把属性段并入
  form 页 API 表），属文档结构决策，定版前不动；本批只保证行为正确（`add-text` 文案、`remove-text`
  运行时变更时既有行的 `aria-label` 同步刷新）。
