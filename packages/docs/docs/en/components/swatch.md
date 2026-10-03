# Swatch

Inline color blocks for quick preset-color selection and display — for theme colors, tag colors, favorite colors and other "pick a color without opening a panel" scenarios. `oas-swatch` is the color block; `oas-swatch-group` is the selection group (single-select radio semantics / multi-select checkbox semantics, roving keyboard navigation).

## Basic usage

Single-select group: click a swatch to select it (selected state = outer ring); `oas-change` carries the selected value.

<DemoBlock title="Single select">
  <oas-swatch-group id="sw-single">
    <oas-swatch color="blue" label="Blue"></oas-swatch>
    <oas-swatch color="green" label="Green"></oas-swatch>
    <oas-swatch color="orange" label="Orange"></oas-swatch>
    <oas-swatch color="#7c3aed" label="Purple"></oas-swatch>
  </oas-swatch-group>
  <span id="sw-single-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Current: —</span>
</DemoBlock>

## Multiple select

With `multiple`, the group uses checkbox semantics; `value` is a comma-separated list of selected values.

<DemoBlock title="Multiple select">
  <oas-swatch-group id="sw-multi" multiple>
    <oas-swatch color="red" label="Red"></oas-swatch>
    <oas-swatch color="gold" label="Gold"></oas-swatch>
    <oas-swatch color="cyan" label="Cyan"></oas-swatch>
    <oas-swatch color="purple" label="Purple"></oas-swatch>
  </oas-swatch-group>
  <span id="sw-multi-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Current: []</span>
</DemoBlock>

## Shapes and sizes

`shape` has three forms (square / rounded / circle); `size` has five steps (xs / small / medium / large / xl).

<DemoBlock title="Shapes and sizes">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-swatch color="blue" shape="square" aria-label="Square"></oas-swatch>
      <oas-swatch color="blue" shape="rounded" aria-label="Rounded"></oas-swatch>
      <oas-swatch color="blue" shape="circle" aria-label="Circle"></oas-swatch>
    </oas-space>
    <oas-space size="small">
      <oas-swatch color="green" size="xs" aria-label="xs"></oas-swatch>
      <oas-swatch color="green" size="small" aria-label="small"></oas-swatch>
      <oas-swatch color="green" size="medium" aria-label="medium"></oas-swatch>
      <oas-swatch color="green" size="large" aria-label="large"></oas-swatch>
      <oas-swatch color="green" size="xl" aria-label="xl"></oas-swatch>
    </oas-space>
  </oas-space>
</DemoBlock>

## Nothing and mixed

`nothing` marks a no-color/transparent swatch (checkerboard base); `mixed` marks a multi-color swatch (mosaic, for merged multi-value scenarios).

<DemoBlock title="Nothing and mixed">
  <oas-space size="small">
    <oas-swatch nothing aria-label="No color"></oas-swatch>
    <oas-swatch mixed aria-label="Mixed"></oas-swatch>
    <oas-swatch color="blue" disabled aria-label="Disabled"></oas-swatch>
  </oas-space>
</DemoBlock>

## Controlled selection (value)

The group `value` is a controlled channel: setting the attribute externally updates the selected state immediately.

<DemoBlock title="Controlled value">
  <oas-swatch-group id="sw-controlled" value="green">
    <oas-swatch color="red" label="Red"></oas-swatch>
    <oas-swatch color="green" label="Green"></oas-swatch>
    <oas-swatch color="blue" label="Blue"></oas-swatch>
  </oas-swatch-group>
  <oas-button id="sw-set-red" size="small">Select red</oas-button>
  <oas-button id="sw-set-blue" size="small">Select blue</oas-button>
</DemoBlock>

## Keyboard navigation

Tab enters the group (single roving stop) → arrow keys move focus (horizontal keys mirror in RTL) → Enter/Space selects → Home/End jump to first/last. Disabled swatches are skipped in the roving order.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-swatch-group').then(() => {
    const single = document.getElementById('sw-single')
    const singleOut = document.getElementById('sw-single-out')
    single?.addEventListener('oas-change', (e) => {
      if (singleOut) singleOut.textContent = 'Current: ' + e.detail.value
    })
    const multi = document.getElementById('sw-multi')
    const multiOut = document.getElementById('sw-multi-out')
    multi?.addEventListener('oas-change', (e) => {
      if (multiOut) multiOut.textContent = 'Current: [' + e.detail.value.join(', ') + ']'
    })
    document.getElementById('sw-set-red')?.addEventListener('oas-click', () => {
      document.getElementById('sw-controlled')?.setAttribute('value', 'red')
    })
    document.getElementById('sw-set-blue')?.addEventListener('oas-click', () => {
      document.getElementById('sw-controlled')?.setAttribute('value', 'blue')
    })
  })
})
</script>

## API

### oas-swatch

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name override (host-written value takes top priority) | — | — |
| `color` | Fill color (any CSS color or one of 11 preset names, unified color protocol) | `string` | — |
| `disabled` | Disable the swatch (not clickable, not focusable) | `boolean` | — |
| `label` | Accessible name (defaults to i18n swatch.color + the color value) | — | — |
| `mixed` | Mixed-color indicator (mosaic, for merged multi-value scenarios) | `boolean` | — |
| `nothing` | No-color/transparent indicator (checkerboard base, color-independent) | `boolean` | — |
| `selected` | Controlled selected state (outer ring; driven by oas-swatch-group inside a group) | `boolean` | — |
| `shape` | Shape: `square` / `rounded` (default) / `circle` | `string` | `rounded` |
| `size` | Side-length step: `xs` / `small` / `medium` (default) / `large` / `xl` | `string` | — |

#### Property (JS property only, not reflected as attribute)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Current value: the swatch color identifier (i.e. the `color` attribute) | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { color }` (intercepted by the group which emits the group-level oas-change) |

### oas-swatch-group

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Group accessible name (locale fallback by default) | — | — |
| `disabled` | Disable the whole group (propagated to children) | `boolean` | — |
| `multiple` | Multiple-select mode (checkbox semantics) | `boolean` | — |
| `value` | Current value: child swatch's color in single select; comma-separated list in multiple select | `string \| string[]` | — |

#### Property (JS property only, not reflected as attribute)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Current value: the selected color string, or an array of colors when `multiple` | `string \| string[]` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection change, `detail: { value: string \| string[] }` |

#### Slots

| Name | Description |
| --- | --- |
| default | Swatch children (`<oas-swatch>`) |
