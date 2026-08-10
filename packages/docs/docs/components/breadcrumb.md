# Breadcrumb 面包屑

展示页面层级路径，末项为当前页（不可点击）。

## 基础用法

<DemoBlock title="基础用法">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 自定义分隔符

<DemoBlock title="自定义分隔符">
  <oas-breadcrumb separator="›" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 点击事件

<DemoBlock title="点击事件">
  <oas-breadcrumb onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-tag id="bc-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## 边界

<DemoBlock title="空数据">
  <oas-breadcrumb></oas-breadcrumb>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.breadcrumbLog = (e) => {
    const tag = document.getElementById('bc-result')
    if (tag) tag.textContent = `已点击：${e.detail.value}`
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 面包屑项 JSON | `string` | `[]` |
| `separator` | 分隔符 | `string` | `/` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-select` | 点击链接项，`detail: { value: href }` |

`nav` + `aria-label="面包屑"`，末项 `aria-current="page"` 且不可点击。
