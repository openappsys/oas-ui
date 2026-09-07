# Switch

A switch button with `role="switch"`.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-switch></oas-switch>
  <oas-switch checked></oas-switch>
</DemoBlock>

## Disabled & Loading

<DemoBlock title="disabled / loading">
  <oas-switch disabled checked></oas-switch>
  <oas-switch loading checked></oas-switch>
</DemoBlock>

`loading` shows a loading animation and prevents toggling, for async submit scenarios.

## Label

The `label` attribute renders a text label next to the switch; clicking the label toggles it (native `label` association) and provides the accessible name for `role="switch"`. `label-position="start"` moves the label to the left (default `end`). Custom content can be placed in the default slot (takes precedence over the `label` attribute text).

<DemoBlock title="Label">
  <oas-space direction="vertical" size="small" style="width: 360px; background: var(--oas-color-bg-hover); padding: var(--oas-space-2)">
    <oas-switch label="Notifications"></oas-switch>
    <oas-switch label="Security updates only" label-position="start"></oas-switch>
    <oas-switch label="Slot label"><b>Custom content</b></oas-switch>
    <oas-switch label="Disabled" disabled checked></oas-switch>
  </oas-space>
</DemoBlock>

Hit-area note: the host shrinks to the actual control width (`width: fit-content`), so it is never stretched to full row width inside vertical layout containers (like the `oas-space direction="vertical"` above) — visual width always matches the clickable area; use `label` for a larger text hit target. Without `label`, the host can set `aria-label` (mirrored onto the inner button as the accessible name).

## Switch Labels

`checked-text` / `unchecked-text` render labels on the switch: at medium/large/xl sizes they appear inside the track on the side opposite the thumb; at `size="xs"` / `size="small"` the labels move outside the switch.

<DemoBlock title="Switch labels">
  <oas-switch checked-text="On" unchecked-text="Off"></oas-switch>
  <oas-switch checked checked-text="Enabled" unchecked-text="Disabled"></oas-switch>
  <oas-switch size="xs" checked-text="On" unchecked-text="Off"></oas-switch>
  <oas-switch size="small" checked-text="On" unchecked-text="Off"></oas-switch>
</DemoBlock>

## Sizes

`size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning.

<DemoBlock title="Five sizes">
  <oas-switch size="xs" checked></oas-switch>
  <oas-switch size="small" checked></oas-switch>
  <oas-switch size="medium" checked></oas-switch>
  <oas-switch size="large" checked></oas-switch>
  <oas-switch size="xl" checked></oas-switch>
</DemoBlock>

## Custom Color

`color` overrides the primary color of the checked state (defaults to `--oas-color-primary`).

<DemoBlock title="Custom color">
  <oas-switch checked color="#16a34a"></oas-switch>
  <oas-switch checked color="#dc2626" checked-text="Danger on" unchecked-text="Danger off"></oas-switch>
</DemoBlock>

## Thumb Icons

`checked-icon` / `unchecked-icon` render icons on the thumb (oas-icons names); the icon follows the on/off state — favorites, day/night mode and similar scenarios:

<DemoBlock title="Thumb icons">
  <oas-switch checked-icon="star-filled" unchecked-icon="star"></oas-switch>
  <oas-switch checked-icon="check" unchecked-icon="close" size="large"></oas-switch>
</DemoBlock>

## Value Mapping

`true-value` / `false-value` customize the switch value (strings); `detail.value` of `oas-change` returns the mapped value (`true` / `false` booleans when unset). Reading `el.value` also returns the current mapped value — useful for form submissions like `'YES'` / `'NO'`.

<DemoBlock title="true-value / false-value">
  <oas-space direction="vertical" size="small">
    <oas-switch id="switch-value" true-value="YES" false-value="NO" label="Form value mapping"></oas-switch>
    <oas-tag id="switch-value-info" type="info">value: "NO"</oas-tag>
  </oas-space>
</DemoBlock>

## Before Change

`el.beforeChange = (next) => boolean | Promise<boolean>` (JS property channel; attributes cannot carry functions): returning `false` or a rejected Promise cancels the toggle; while an async confirmation is in flight the component enters loading state (spinner + click blocked) to prevent duplicate triggers.

<DemoBlock title="before-change async confirm">
  <oas-space direction="vertical" size="small">
    <oas-switch id="switch-before" checked label="Two-factor auth"></oas-switch>
    <oas-tag id="switch-before-info" type="info">Turning off goes through an async confirm (~800ms)</oas-tag>
  </oas-space>
</DemoBlock>

## Validation Status

`status="success" | "warning" | "error"` tints the control (`error` also sets `aria-invalid`; a host-set `aria-invalid` gets the same error visuals):

<DemoBlock title="status">
  <oas-switch status="success" checked></oas-switch>
  <oas-switch status="warning"></oas-switch>
  <oas-switch status="error"></oas-switch>
</DemoBlock>

## Custom Width

`--oas-switch-width` / `--oas-switch-height` / `--oas-switch-thumb-size` CSS variables override the track width / height / thumb size across size tiers:

<DemoBlock title="CSS variable sizing">
  <oas-switch checked style="--oas-switch-width: 64px"></oas-switch>
  <oas-switch checked size="large" style="--oas-switch-width: 80px; --oas-switch-height: 34px"></oas-switch>
  <oas-switch checked style="--oas-switch-thumb-size: 14px"></oas-switch>
</DemoBlock>

## Events

`oas-change` (`detail: { checked, value }`), `oas-focus` / `oas-blur` (focus enters / leaves the component).

<DemoBlock title="Toggle events">
  <oas-space direction="vertical" size="small">
    <oas-switch id="switch-event" checked label="Events"></oas-switch>
    <span id="switch-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
  </oas-space>
</DemoBlock>

Controlled usage: when the host owns the state, bind the `checked` attribute and write it back on `oas-change` (in Vue: `:checked="x"` + `@oas-change="x = $event.detail.checked"`).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Value mapping demo: shows change detail.value
  const valueEl = document.getElementById('switch-value')
  const valueInfo = document.getElementById('switch-value-info')
  valueEl?.addEventListener('oas-change', (e) => {
    valueInfo.textContent = `value: ${JSON.stringify(e.detail.value)}`
  })

  // before-change demo: async confirm (turning on passes directly; turning off goes through
  // an 800ms confirm with in-flight loading preventing duplicate clicks)
  const beforeEl = document.getElementById('switch-before')
  const beforeInfo = document.getElementById('switch-before-info')
  if (beforeEl) {
    beforeEl.beforeChange = async (next) => {
      if (next) return true
      beforeInfo.textContent = 'Confirming…'
      await new Promise((r) => setTimeout(r, 800))
      beforeInfo.textContent = 'Confirmed, toggle applied'
      return true
    }
  }

  // Events demo: change / focus / blur
  const el = document.getElementById('switch-event')
  const out = document.getElementById('switch-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: checked=${e.detail.checked}, value=${JSON.stringify(e.detail.value)}`
  })
  el?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus'
  })
  el?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur'
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name (host override channel; explicit value wins over label derivation) | — | — |
| `checked` | Whether on | `boolean` | — |
| `checked-icon` | Checked-state thumb icon (oas-icon name) | `string` | — |
| `checked-text` | Label shown when on; inside the track at medium/large/xl, outside at xs/small | — | — |
| `color` | Custom primary color for the on state, overrides `--oas-color-primary` (CSS color value) | — | — |
| `disabled` | Disabled | `boolean` | — |
| `false-value` | Mapped value when unchecked | `string` | — |
| `label` | Label text (label channel; clicking the label toggles; same-named slot for rich content) | `string` | — |
| `label-position` | Label position: `end` (default, right) / `start` (left) | `string` | — |
| `loading` | Loading state, prevents toggling | `boolean` | — |
| `size` | Size: `xs` / `small` / `medium` (default) / `large` / `xl`; invalid values fall back to `medium` with a warning | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success`; error mirrors aria-invalid | `string` | — |
| `true-value` | Mapped value when checked (read via the value getter) | `string` | — |
| `unchecked-icon` | Unchecked-state thumb icon | `string` | — |
| `unchecked-text` | Label shown when off; inside the track at medium/large/xl, outside at xs/small | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-blur` | Fires on blur |
| `oas-change` | Toggle, `detail: { checked }` |
| `oas-focus` | Fires on focus |

### Slots

| Name | Description |
| --- | --- |
| default | — |
