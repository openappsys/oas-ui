# oas-form-list 动态字段行

在表单内维护一组可增删的字段行：组件内放一个 `<template>` 作为行模板，克隆出的行内字段 `name`
自动索引化（`users.{index}.name` 或给组件设 `name="users"` + 裸字段名自动加前缀），行删除后
剩余行重新编号、已填值随行保留。字段留在 light DOM，校验 / 提交 / `oas-values-change` 随主表走。

完整用法与取值口径见文档站 form 页的 `oas-form-list` 说明段（本组件无独立文档页）。

## 定版前评审记档（不修项）

- **`add-text` / `remove-text` 文档缺位**：两个属性已在 `docs/api-manifest/oas-form-list.json`
  登记（值为 `api:scan` 的作品，属性本身有单测守护），但组件没有独立文档页、form 页的 API 表只覆盖
  `oas-form`，所以读者在站上查不到这两个属性的说明。补法需要新建 form-list 文档页（或把属性段并入
  form 页 API 表），属文档结构决策，定版前不动；本批只保证行为正确（`add-text` 文案、`remove-text`
  运行时变更时既有行的 `aria-label` 同步刷新）。
