# Collapse 折叠面板

## 基础用法

<div class="demo">
  <oas-collapse active="a">
    <oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>
    <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
  </oas-collapse>
</div>

## 手风琴

<div class="demo">
  <oas-collapse accordion active="a">
    <oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>
    <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
  </oas-collapse>
</div>

## API

| 组件 | 属性 | 说明 |
|---|---|---|
| `oas-collapse` | `active` | 展开项 name 集合（逗号分隔） |
| `oas-collapse` | `accordion` | 手风琴模式 |
| `oas-collapse-item` | `name` / `header` | 值 / 标题 |

| 事件 | 说明 |
|---|---|
| `oas-change` | `detail: { active: string[] }` |
