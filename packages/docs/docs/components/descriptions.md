# Descriptions 描述列表

## 基础用法

<div class="demo">
  <oas-descriptions title="用户信息" column="3">
    <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
    <oas-descriptions-item label="年龄"><span>30</span></oas-descriptions-item>
    <oas-descriptions-item label="城市"><span>北京</span></oas-descriptions-item>
  </oas-descriptions>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `column` | 每行列数 | `3` |
| `title` | 标题 | — |

子组件 `oas-descriptions-item`：`label` 属性 + 默认插槽内容。
