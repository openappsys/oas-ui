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

## Collapse mode

`collapsed` + `max-items`: when there are more items than `max-items` (default `4`), the middle items collapse into `…`; click `…` to expand a dropdown with all collapsed items .

<DemoBlock title="Collapse mode">
  <oas-breadcrumb id="bc-collapsed" collapsed max-items="4" onoas-select="breadcrumbLog(event)" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Data Display","href":"/components/table"},{"label":"Settings","href":"/components/settings"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-collapsed-result" type="info">Nothing clicked</oas-tag>
</DemoBlock>

## Single-line ellipsis

`ellipsis`: the breadcrumb never wraps; link text is truncated with an ellipsis when the container is narrow, and links keep the full `title` (hover to see the complete name).

<DemoBlock title="Single-line ellipsis">
  <div style="max-width: 260px; overflow: hidden; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px 12px">
    <oas-breadcrumb id="bc-ellipsis" ellipsis items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Data Display","href":"/components/table"},{"label":"A rather long breadcrumb item title","href":"/components/long-title"}]'></oas-breadcrumb>
  </div>
</DemoBlock>

## Edge cases

<DemoBlock title="Empty data">
  <oas-breadcrumb></oas-breadcrumb>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.breadcrumbLog = (e) => {
    for (const id of ['bc-result', 'bc-collapsed-result']) {
      const tag = document.getElementById(id)
      if (tag) tag.textContent = `Clicked: ${e.detail.value}`
    }
  }
})
</script>

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-breadcrumb-font` (e.g. `18px`).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `collapsed` | Collapse mode: when there are more items than `max-items`, middle items collapse into `…`; click to expand the dropdown | `boolean` | — |
| `ellipsis` | Single-line ellipsis: the breadcrumb never wraps; overflowing link text is truncated with an ellipsis | `boolean` | — |
| `items` | Breadcrumb items JSON | `string` | `[]` |
| `max-items` | Maximum number of visible items in collapse mode (including `…`); invalid values fall back to `4` | `string` | `4` |
| `separator` | Separator | `string` | `/` |

### Events

| Event | Description |
| --- | --- |
| `oas-select` | A link item or a collapsed dropdown item was clicked, `detail: { value: href }` |

`nav` + `aria-label="面包屑"`, the last item has `aria-current="page"` and is not clickable.
