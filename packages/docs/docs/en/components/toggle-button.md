# ToggleButton

An `aria-pressed` two-state toggle button; the pressed state uses the primary color background. Supports size steps, icons (including icon-only form), selection color and validation status.

## Basic Usage

<DemoBlock title="Basic">
  <oas-toggle-button value="bold">Bold</oas-toggle-button>
  <oas-toggle-button value="italic" pressed>Italic</oas-toggle-button>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-toggle-button id="tb-event" value="underline">Underline</oas-toggle-button>
  <span id="tb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tb-event')
  const out = document.getElementById('tb-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: { value: ${e.detail.value}, pressed: ${e.detail.pressed} }`
  })
})
</script>

## Disabled

<DemoBlock title="Disabled">
  <oas-toggle-button value="strike" disabled>Strikethrough</oas-toggle-button>
  <oas-toggle-button value="strike" pressed disabled>Strikethrough (pressed)</oas-toggle-button>
</DemoBlock>

## Size Steps (size)

`size` has three steps: `small` / `medium` (default) / `large`; control height and font size follow global tokens. When not set explicitly, the config-provider `size` injection is respected (global density):

<DemoBlock title="Size steps">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-toggle-button size="small" value="sm">Small</oas-toggle-button>
      <oas-toggle-button size="small" value="sm-pressed" pressed>Small (pressed)</oas-toggle-button>
    </oas-space>
    <oas-space size="small">
      <oas-toggle-button value="md">Medium (default)</oas-toggle-button>
      <oas-toggle-button value="md-pressed" pressed>Medium (pressed)</oas-toggle-button>
    </oas-space>
    <oas-space size="small">
      <oas-toggle-button size="large" value="lg">Large</oas-toggle-button>
      <oas-toggle-button size="large" value="lg-pressed" pressed>Large (pressed)</oas-toggle-button>
    </oas-space>
  </oas-space>
</DemoBlock>

## Icons (icon / icon-only)

`icon` takes an `@oas-ui/icons` registry name and renders the icon before the text (spacing via `--oas-space-2`). **Without text it automatically becomes icon-only** (square), with the icon name as the fallback accessible name — prefer providing a precise label via `aria-label`:

<DemoBlock title="Icons and icon-only">
  <oas-space size="small">
    <oas-toggle-button value="favorite" icon="star">Favorite</oas-toggle-button>
    <oas-toggle-button value="like" icon="heart" pressed>Like</oas-toggle-button>
    <oas-toggle-button value="pin" icon="star" aria-label="Favorite"></oas-toggle-button>
    <oas-toggle-button value="share" icon="external-link" aria-label="Share" pressed></oas-toggle-button>
  </oas-space>
</DemoBlock>

## Selection Color (color)

`color` follows the unified ui-spec protocol: any CSS color value (text color auto black/white by luminance) takes precedence; the 11 preset names (`magenta / red / volcano / orange / gold / lime / green / cyan / blue / geekblue / purple`) resolve to `--oas-preset-*` tokens (light/dark adaptive); default is the primary color. Theme-level batch customization goes through the CSS variables `--oas-toggle-color` / `--oas-toggle-on-color`:

<DemoBlock title="Selection color">
  <oas-space size="small">
    <oas-toggle-button color="purple" value="purple" pressed>Purple</oas-toggle-button>
    <oas-toggle-button color="green" value="green" pressed>Green</oas-toggle-button>
    <oas-toggle-button color="#0e7490" value="custom" pressed>Custom</oas-toggle-button>
    <oas-toggle-button color="#e5e7eb" value="light" pressed>Light (auto dark text)</oas-toggle-button>
  </oas-space>
</DemoBlock>

## Validation Status (status)

`status` has three states: `success` / `warning` / `error`: borders take the semantic color and the focus ring is dyed to match; `error` syncs the host `aria-invalid` (a host-set `aria-invalid="true"` is equivalent to the error visuals):

<DemoBlock title="Validation status">
  <oas-space size="small">
    <oas-toggle-button status="success" value="ok" pressed>Success</oas-toggle-button>
    <oas-toggle-button status="warning" value="warn">Warning</oas-toggle-button>
    <oas-toggle-button status="error" value="err" pressed>Error</oas-toggle-button>
  </oas-space>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Accessible name (host override channel, written to the inner button) | — | — |
| `color` | Selected color: preset name (--oas-preset-* token) or any CSS color (auto text color) | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `icon` | Icon (oas-icon name); icon-only renders an equal square | `string` | — |
| `pressed` | Whether pressed (controlled) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success`; error mirrors aria-invalid | `string` | — |
| `value` | Value (returned with events) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Toggle, `detail: { value, pressed }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
