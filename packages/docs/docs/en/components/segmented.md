# Segmented

A single-select linear segmented control for light filtering / view switching, `role="radiogroup"`, with per-item disabling. The selection indicator slides between items.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-segmented options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
</DemoBlock>

## Default selection

<DemoBlock title="Controlled value">
  <oas-segmented value="week" options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled options">
  <oas-segmented options='[{"label":"Enabled","value":"on"},{"label":"Disabled","value":"off","disabled":true},{"label":"Read-only","value":"ro","disabled":true}]'></oas-segmented>
</DemoBlock>

## Sizes

`size` supports `small` / `medium` (default) / `large`, aligned with the input control size system (also follows the config-provider size injection):

<DemoBlock title="Sizes">
  <oas-space direction="vertical" size="small">
    <oas-segmented size="small" options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
    <oas-segmented options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
    <oas-segmented size="large" options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
  </oas-space>
</DemoBlock>

## Block

`block` stretches to the parent width with evenly divided items:

<DemoBlock title="block">
  <oas-segmented block options='[{"label":"Chart","value":"chart"},{"label":"List","value":"list"},{"label":"Board","value":"board"}]'></oas-segmented>
</DemoBlock>

## Icon options

An option's `icon` field (oas-icons name) renders before the text; omitting `label` gives the icon-only form, where the icon name is converted to readable text as the `aria-label` fallback:

<DemoBlock title="Icon options">
  <oas-segmented options='[{"label":"List","value":"list","icon":"menu"},{"label":"Group","value":"group","icon":"organization"},{"label":"Tree","value":"tree","icon":"tree"}]'></oas-segmented>
</DemoBlock>

<DemoBlock title="Icon only">
  <oas-segmented options='[{"label":"","value":"star","icon":"star"},{"label":"","value":"filled","icon":"star-filled"},{"label":"","value":"like","icon":"heart"}]'></oas-segmented>
</DemoBlock>

## Vertical

`direction="vertical"` stacks items vertically (side toolbars and similar); keyboard navigation switches to `↑` / `↓` accordingly:

<DemoBlock title="Vertical">
  <oas-segmented direction="vertical" options='[{"label":"List","value":"list","icon":"menu"},{"label":"Group","value":"group","icon":"organization"},{"label":"Tree","value":"tree","icon":"tree"}]'></oas-segmented>
</DemoBlock>

## Read-only

`readonly` keeps the control focusable but the value cannot change (distinct form semantics from `disabled`):

<DemoBlock title="readonly">
  <oas-segmented readonly value="week" options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'></oas-segmented>
</DemoBlock>

## Custom option rendering

`template[slot="option"]` is cloned into each option (the element with `data-option-label` binds the option text, aligned with the select option slot convention):

<DemoBlock title="option slot">
  <oas-segmented options='[{"label":"Day","value":"day"},{"label":"Week","value":"week"},{"label":"Month","value":"month"}]'>
    <template slot="option">
      <span style="display: inline-flex; align-items: center; gap: var(--oas-space-1)">
        <oas-icon name="arrow-right" size="12"></oas-icon>
        <b data-option-label></b>
      </span>
    </template>
  </oas-segmented>
</DemoBlock>

## Keyboard & accessibility

Built on a hidden native radio group (`input[type="radio"]` grouped by name): `Tab` focuses the current selection, `←` / `→` (vertical: `↑` / `↓`) cycle through items skipping disabled ones, `Home` / `End` jump to the first / last item; focus (roving tabindex) follows the selection. Setting the `name` attribute forwards it to the radio group for native form association (an internal group name is generated when unset, so instances never interfere).

## Switch event

<DemoBlock title="oas-change event">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-segmented id="segmented-demo" options='[{"label":"Chart","value":"chart"},{"label":"List","value":"list"},{"label":"Board","value":"board"}]'></oas-segmented>
    <oas-tag type="primary" id="segmented-info">Currently selected: chart</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const seg = document.getElementById('segmented-demo')
  const info = document.getElementById('segmented-info')
  seg?.addEventListener('oas-change', (e) => {
    const { value } = e.detail
    info.textContent = `Currently selected: ${value}`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `block` | Fill the parent width (options share equally) | — | — |
| `direction` | Orientation: `horizontal` (default) / `vertical` (mirrors aria-orientation and axis keys) | `string` | `horizontal` |
| `disabled` | Disables the whole segmented control (explicitly, or inherited from the config-provider global disabled injection) | `boolean` | — |
| `name` | Native radio group name (native form association; auto-generated unique name when unset) | `string` | — |
| `options` | `[{ label, value, disabled? }]` JSON string | `string` | `[]` |
| `readonly` | Read-only: focusable but selection immutable (radiogroup aria-readonly) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `value` | Selected value (defaults to the first option; controlled) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Switched, `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="option"]` | — |

The container is `role="radiogroup"`; each item is `role="radio"` + `aria-checked` / `aria-disabled`.
