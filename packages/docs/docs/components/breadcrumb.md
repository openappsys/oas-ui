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

## 折叠模式

`collapsed` + `max-items`：items 数量超过 `max-items`（默认 `4`）时，中间项折叠为 `…`，点击 `…` 展开下拉查看全部折叠项。

<DemoBlock title="折叠模式">
  <oas-breadcrumb id="bc-collapsed" collapsed max-items="4" onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"数据展示","href":"/components/table"},{"label":"设置","href":"/components/settings"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-tag id="bc-collapsed-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## 单行省略

`ellipsis`：面包屑不换行，容器过窄时链接文本以省略号截断，链接保留全文 `title`（悬停可见完整名称）。

<DemoBlock title="单行省略">
  <div style="max-width: 260px; overflow: hidden; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px 12px">
    <oas-breadcrumb id="bc-ellipsis" ellipsis items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"数据展示","href":"/components/table"},{"label":"这是一个比较长的面包屑项标题名称","href":"/components/long-title"}]'></oas-breadcrumb>
  </div>
</DemoBlock>

## 边界

<DemoBlock title="空数据">
  <oas-breadcrumb></oas-breadcrumb>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.breadcrumbLog = (e) => {
    for (const id of ['bc-result', 'bc-collapsed-result']) {
      const tag = document.getElementById(id)
      if (tag) tag.textContent = `已点击：${e.detail.value}`
    }
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `collapsed` | 折叠模式：items 数量超过 `max-items` 时中间项折叠为 `…`，点击展开下拉 | `boolean` | — |
| `ellipsis` | 单行省略：面包屑不换行，超宽时链接文本以省略号截断 | `boolean` | — |
| `items` | 面包屑项 JSON | `string` | `[]` |
| `max-items` | 折叠模式下最多可见的项数（含 `…`），非法值回退 `4` | `string` | `4` |
| `separator` | 分隔符 | `string` | `/` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-select` | 点击链接项或折叠下拉项，`detail: { value: href }` |

`nav` + `aria-label="面包屑"`，末项 `aria-current="page"` 且不可点击。
