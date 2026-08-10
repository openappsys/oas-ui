# Breadcrumb

Shows the page hierarchy path; the last item is the current page (not clickable).

## Basic usage

<DemoBlock title="Basic usage">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## Custom separator

<DemoBlock title="Custom separator">
  <oas-breadcrumb separator="›" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## Click event

<DemoBlock title="Click event">
  <oas-breadcrumb onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-tag id="bc-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## Edge cases

<DemoBlock title="Empty data">
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

| Property    | Description           | Type                 | Default |
| ----------- | --------------------- | -------------------- | ------- |
| `items`     | Breadcrumb items JSON | `[{ label, href? }]` | `[]`    |
| `separator` | Separator             | `string`             | `/`     |

| Event        | Description                                  |
| ------------ | -------------------------------------------- |
| `oas-select` | A link item was clicked, `detail: { value: href }` |

`nav` + `aria-label="面包屑"`, the last item has `aria-current="page"` and is not clickable.
