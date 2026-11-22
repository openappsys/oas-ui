---
description: A bottom share panel with a channel grid plus cancel/close actions; clicking a channel dispatches oas-select and closes automatically, with heading and cancel-text overrides
---

# ShareSheet

A share panel that rises from the bottom: heading + channel grid + cancel button. Channels are declared through the `channels` JSON attribute (`[{ key, name, icon? }]`); `icon` is an `oas-icon` name (built-in or host-registered). Clicking a channel dispatches `oas-select` and closes the panel automatically.

- The `open` attribute is controlled; `show()` / `close()` offer programmatic control
- Heading / cancel / close copy comes from i18n and can be overridden with `heading` / `cancel-text`
- Opening moves focus to the first channel; Tab cycles inside the panel, Esc closes, and focus returns to the previously focused element
- `role="dialog"` + `aria-modal="true"`, with the heading as the accessible name

## Basic Usage

<DemoBlock title="Open via button (with channel / close feedback)">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="ss-open">Open share sheet</oas-button>
      <span id="ss-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">No channel selected yet</span>
    </div>
    <oas-share-sheet
      id="ss-demo"
      heading="Share to"
      channels='[{"key":"copy","name":"Copy link","icon":"copy"},{"key":"mail","name":"Email","icon":"mail"},{"key":"star","name":"Favorite","icon":"star"},{"key":"download","name":"Download","icon":"download"},{"key":"more","name":"More","icon":"more"}]'
    ></oas-share-sheet>
  </div>
</DemoBlock>

## Custom Heading / Cancel Text

<DemoBlock title="heading / cancel-text overrides">
  <oas-share-sheet
    id="ss-custom"
    heading="Send to a friend"
    cancel-text="Not now"
    channels='[{"key":"copy","name":"Copy link","icon":"copy"},{"key":"mail","name":"Email","icon":"mail"}]'
  ></oas-share-sheet>
  <oas-button id="ss-custom-open" size="small">Open custom sheet</oas-button>
</DemoBlock>

## Channels Without Icons

When `icon` is missing, the first character of the name is used as a placeholder — handy for channels whose icons are not registered:

<DemoBlock title="No icon → initial placeholder">
  <oas-share-sheet
    id="ss-fallback"
    heading="More channels"
    channels='[{"key":"a","name":"WeChat"},{"key":"b","name":"Weibo"},{"key":"c","name":"Email"}]'
  ></oas-share-sheet>
  <oas-button id="ss-fallback-open" size="small">Open iconless sheet</oas-button>
</DemoBlock>

## Events

`oas-select` (detail `{ key, name, channel }`) fires when a channel is clicked; `oas-close` (detail `{ reason, key? }`) fires on close, where reason is `select` / `cancel` / `close` / `backdrop` / `esc` / `api`.

```js
sheet.addEventListener('oas-select', (e) => console.info(e.detail.key))
sheet.addEventListener('oas-close', (e) => console.info(e.detail.reason))
```

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-share-sheet').then(() => {
    const output = document.querySelector('#ss-output')
    const demo = document.querySelector('#ss-demo')
    document.querySelector('#ss-open')?.addEventListener('click', () => demo?.show())
    demo?.addEventListener('oas-select', (event) => {
      if (output) output.textContent = `Selected: ${event.detail.name} (key: ${event.detail.key}); the sheet closed automatically`
    })
    demo?.addEventListener('oas-close', (event) => {
      if (output && event.detail.reason !== 'select') output.textContent = `Sheet closed: ${event.detail.reason}`
    })
    document.querySelector('#ss-custom-open')?.addEventListener('click', () => document.querySelector('#ss-custom')?.show())
    document.querySelector('#ss-fallback-open')?.addEventListener('click', () => document.querySelector('#ss-fallback')?.show())
  })
})
</script>

## API

### oas-share-sheet

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `cancel-text` | Cancel button copy; defaults to i18n `shareSheet.cancel` | `string` | — |
| `channels` | Channel JSON array `[{ key, name, icon? }]`: `icon` is an `oas-icon` name; missing icons fall back to the first character; invalid JSON is ignored with one dev warning | `ShareSheetChannel[] \| string` | — |
| `heading` | Panel heading; defaults to i18n `shareSheet.title` | `string` | — |
| `open` | Controlled visibility (present = open; host writes are silent) | — | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `channels` | Channel list (property channel): equals the parsed channels attribute; assigning an array serializes and reflects it back to the attribute | `ShareSheetChannel[] \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `show` | `show(): void` | Open the sheet (writes the `open` attribute) |
| `close` | `close(reason: CloseReason): void` | Close the sheet and dispatch `oas-close` (reason defaults to `api`) |

#### Events

| Event | Description |
| --- | --- |
| `oas-close` | Dispatched on close (reason: select / cancel / close / backdrop / esc / api), `detail: key === undefined ? { reason } : { reason, key }` |
| `oas-select` | Dispatched when a channel is clicked; the sheet then closes automatically, `detail: { key: channel.key, name: channel.name, channel }` |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-share-sheet-bg` | Panel background | `var(--oas-color-bg)` |
| `--oas-share-sheet-channel-bg` | Channel icon background | `var(--oas-color-bg-elevated)` |
| `--oas-share-sheet-channel-color` | Channel icon foreground | `var(--oas-color-text-primary)` |
| `--oas-share-sheet-color` | Panel text color | `var(--oas-color-text-primary)` |
| `--oas-share-sheet-columns` | Grid column count | `4` |
| `--oas-share-sheet-mask` | Mask color | `var(--oas-color-overlay)` |
| `--oas-share-sheet-max-height` | Panel max height | `80vh` |
