# Textarea

An enhanced native `<textarea>` supporting auto-height and resize.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-textarea placeholder="Please enter content" style="width: 320px"></oas-textarea>
</DemoBlock>

## Rows & Resize

<DemoBlock title="rows / resize">
  <oas-textarea rows="2" placeholder="Two-row height" style="width: 320px"></oas-textarea>
  <oas-textarea resize="both" placeholder="Drag to resize" style="width: 320px"></oas-textarea>
</DemoBlock>

`resize` is passed through to the native `resize` value (`none` / `both` / `horizontal` / `vertical`), defaulting to `none`.

## Auto Height

<DemoBlock title="autosize">
  <oas-textarea autosize placeholder="Height grows automatically with content" style="width: 320px"></oas-textarea>
</DemoBlock>

`autosize` enables auto height: the height grows with content, returns to the minimum height when empty, and shows a scrollbar when exceeding `max-rows` (default 6).

## Autosize Bounds

<DemoBlock title="autosize + min-rows / max-rows">
  <oas-textarea autosize min-rows="2" max-rows="4" placeholder="Auto-fits between 2~4 rows" style="width: 320px"></oas-textarea>
</DemoBlock>

`min-rows` (default 1) controls the minimum height, `max-rows` (default 6) caps the height and shows a scrollbar. The legacy attribute `auto-height` is kept for compatibility.

## auto-height Compatibility Alias

<DemoBlock title="auto-height">
  <oas-textarea auto-height placeholder="auto-height grows the content height automatically (equivalent to autosize)" style="width: 320px"></oas-textarea>
</DemoBlock>

`auto-height` is a compatibility alias for `autosize` with identical behavior: grows with content, returns to the minimum row height when empty, and shows a scrollbar beyond `max-rows` (default 6). Setting either one enables auto height.

## Disabled & Readonly

<DemoBlock title="disabled / readonly">
  <oas-textarea disabled value="Disabled content" style="width: 320px"></oas-textarea>
  <oas-textarea readonly value="Read-only content, not editable" style="width: 320px"></oas-textarea>
</DemoBlock>

## Events

<DemoBlock title="Input events">
  <oas-textarea id="ta-event" placeholder="Real-time feedback while typing" style="width: 320px"></oas-textarea>
  <span id="ta-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

Listen to `oas-input` (while typing, `detail: { value }`):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ta-event')
  const out = document.getElementById('ta-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
})
</script>

## API

### Attributes

| Attribute     | Description                       | Type      | Default |
| ------------- | --------------------------------- | --------- | ------- |
| `auto-height` | Legacy name (alias of `autosize`) | `boolean` | —       |
| `autosize`    | Auto height                       | `boolean` | —       |
| `disabled`    | Disabled                          | `boolean` | —       |
| `max-rows`    | Maximum rows in autosize          | `string`  | `6`     |
| `min-rows`    | Minimum rows in autosize          | `string`  | `1`     |
| `placeholder` | Placeholder text                  | `string`  | —       |
| `readonly`    | Readonly                          | `boolean` | —       |
| `resize`      | Resize behavior                   | `string`  | —       |
| `rows`        | Number of rows                    | `string`  | `3`     |
| `value`       | Value (controlled)                | `string`  | —       |

### Events

| Event       | Description                       |
| ----------- | --------------------------------- |
| `oas-input` | While typing, `detail: { value }` |
