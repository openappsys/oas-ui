# Breadcrumb

Shows the page hierarchy path; the last item is the current page (not clickable).

## Basic usage

<DemoBlock title="Basic usage">
  <oas-breadcrumb items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Custom separator

<DemoBlock title="Custom separator">
  <oas-breadcrumb separator="›" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Click event

<DemoBlock title="Click event">
  <oas-breadcrumb onoas-select="breadcrumbLog(event)" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-result" type="info">Nothing clicked</oas-tag>
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
    if (tag) tag.textContent = `Clicked: ${e.detail.value}`
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `items` | Breadcrumb items JSON | — | `[]` |
| `separator` | Separator | — | `/` |

### Events

| Event | Description |
| --- | --- |
| `oas-select` | A link item was clicked, `detail: { value: href }` |

`nav` + `aria-label="面包屑"`, the last item has `aria-current="page"` and is not clickable.
