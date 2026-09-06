# Textarea

An enhanced native `<textarea>`: auto height (capped or unlimited), character count, clearable, size tiers, variants and validation status.

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

## Unlimited Auto Height

<DemoBlock title="autosize + max-rows=0">
  <oas-textarea autosize max-rows="0" placeholder="Long-form input: height grows without limit, no scrollbar" style="width: 320px"></oas-textarea>
</DemoBlock>

`max-rows="0"` explicitly disables the cap: the height grows indefinitely with content and never shows a scrollbar (long-form writing, log pasting). Omitting `max-rows` keeps the default 6-row cap — unlimited growth must be set explicitly.

## auto-height Compatibility Alias

<DemoBlock title="auto-height">
  <oas-textarea auto-height placeholder="auto-height grows the content height automatically (equivalent to autosize)" style="width: 320px"></oas-textarea>
</DemoBlock>

`auto-height` is a compatibility alias for `autosize` with identical behavior: grows with content, returns to the minimum row height when empty, and shows a scrollbar beyond `max-rows` (default 6). Setting either one enables auto height.

## Size Tiers

<DemoBlock title="size">
  <oas-textarea size="small" placeholder="small compact" style="width: 320px"></oas-textarea>
  <oas-textarea placeholder="medium default" style="width: 320px"></oas-textarea>
  <oas-textarea size="large" placeholder="large spacious" style="width: 320px"></oas-textarea>
</DemoBlock>

`size="small | medium | large"` (default `medium`): font size, vertical padding and minimum height scale with the tier, aligned with the global control size tokens.

## Variants

<DemoBlock title="variant">
  <oas-textarea variant="outlined" placeholder="outlined default border" style="width: 320px"></oas-textarea>
  <oas-textarea variant="filled" placeholder="filled background" style="width: 320px"></oas-textarea>
  <oas-textarea variant="borderless" placeholder="borderless" style="width: 320px"></oas-textarea>
</DemoBlock>

`variant="outlined | filled | borderless"` (default `outlined`). `filled` uses a gray background without a border, showing the border on focus; `borderless` has a transparent background and no border, keeping only the focus ring.

## Validation Status

<DemoBlock title="status">
  <oas-textarea status="error" value="Content does not meet requirements" style="width: 320px"></oas-textarea>
  <oas-textarea status="warning" value="Content has potential issues" style="width: 320px"></oas-textarea>
  <oas-textarea status="success" value="Content passed validation" style="width: 320px"></oas-textarea>
</DemoBlock>

`status="error | warning | success"`: the border and focus ring change color with the validation result; `error` also sets `aria-invalid` on the inner textarea (perceivable by screen readers). When linked with `oas-form-item` validation, form-item writes `aria-invalid` on the host, visually identical to `error`.

## Character Count

<DemoBlock title="maxlength + show-count">
  <oas-textarea maxlength="20" show-count placeholder="Bio limited to 20 characters (n/max at bottom-right)" style="width: 320px"></oas-textarea>
  <oas-textarea show-count placeholder="Without maxlength, only the current length shows" style="width: 320px"></oas-textarea>
</DemoBlock>

`show-count` displays a counter at the bottom-right outside the box: `n/max` when `maxlength` is set (majority convention, turns red when over; `maxlength` is passed through to the native attribute, truncating at the input layer), or just the current length when unset. The counter carries `aria-live="polite"` so screen readers announce count changes.

## Clearable

<DemoBlock title="clearable">
  <oas-textarea id="ta-clear" clearable autosize style="width: 320px">This comment can be cleared and rewritten in one click.</oas-textarea>
  <span id="ta-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`clearable` shows a clear button at the top-right corner when there is a value (hidden when `disabled` / `readonly`): clicking clears the content, emits the `oas-clear` event, and returns focus to the textarea; under autosize the height shrinks back accordingly.

## label Accessible Name

<DemoBlock title="label">
  <oas-textarea label="Remarks" placeholder="Screen readers will announce 'Remarks'" style="width: 320px"></oas-textarea>
</DemoBlock>

`label` is written to the inner `aria-label` as the accessible name, with fallback order: `label` > `placeholder` > built-in default text. For a visible form label use the `oas-form-item` label channel (label layout belongs to form-item).

## Native Attribute Passthrough

<DemoBlock title="Native attribute passthrough">
  <oas-textarea name="bio" required minlength="2" wrap="hard" spellcheck="false" placeholder="Required, at least 2 characters; spellcheck off" style="width: 320px"></oas-textarea>
</DemoBlock>

Whitelisted attributes are passed through to the inner native `<textarea>`: `name` / `autofocus` / `minlength` / `required` / `spellcheck` / `wrap`. With native `oas-form` submission, `name` participates in form data and `required` / `minlength` in native constraint validation; `wrap="hard"` requires `cols` to submit hard line breaks.

## Disabled & Readonly

<DemoBlock title="disabled / readonly">
  <oas-textarea disabled value="Disabled content" style="width: 320px"></oas-textarea>
  <oas-textarea readonly value="Read-only content, not editable" style="width: 320px"></oas-textarea>
</DemoBlock>

## Events

<DemoBlock title="Input and focus events">
  <oas-textarea id="ta-event" placeholder="Real-time feedback while typing; blur for oas-change" style="width: 320px"></oas-textarea>
  <span id="ta-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

- `oas-input`: on every keystroke, `detail: { value }`
- `oas-focus` / `oas-blur`: on focus / blur, `detail: { value }`
- `oas-change`: emitted on blur only when the value changed since focus (commit semantics), `detail: { value }`

## Methods

<DemoBlock title="focus() / blur() / select()">
  <oas-textarea id="ta-methods" value="Click 'select()' to highlight this text" style="width: 320px"></oas-textarea>
  <div style="margin-top: 8px; display: flex; gap: 8px">
    <oas-button id="ta-btn-select" size="small">select()</oas-button>
    <oas-button id="ta-btn-focus" size="small">focus()</oas-button>
    <oas-button id="ta-btn-blur" size="small">blur()</oas-button>
  </div>
  <span id="ta-methods-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`focus(options?)` / `blur()` / `select()` all delegate to the inner native textarea.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ta-event')
  const out = document.getElementById('ta-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus: focused'
  })
  el?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur: blurred'
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  const clearEl = document.getElementById('ta-clear')
  const clearOut = document.getElementById('ta-clear-output')
  clearEl?.addEventListener('oas-clear', () => {
    clearOut.textContent = 'Cleared, start over'
  })

  const mEl = document.getElementById('ta-methods')
  const mOut = document.getElementById('ta-methods-output')
  mEl?.addEventListener('oas-focus', () => {
    mOut.textContent = 'Focused (oas-focus)'
  })
  mEl?.addEventListener('oas-blur', () => {
    mOut.textContent = 'Blurred (oas-blur)'
  })
  document.getElementById('ta-btn-select')?.addEventListener('click', () => mEl?.select())
  document.getElementById('ta-btn-focus')?.addEventListener('click', () => mEl?.focus())
  document.getElementById('ta-btn-blur')?.addEventListener('click', () => mEl?.blur())
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto-height` | Legacy name (alias of `autosize`) | `boolean` | — |
| `autofocus` | Autofocus (native passthrough) | — | — |
| `autosize` | Auto height | `boolean` | — |
| `clearable` | Show a clear button (one-click clear; fires oas-clear + oas-input) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `label` | Accessible name (aria-label channel; falls back to placeholder → locale) | — | — |
| `max-rows` | Maximum rows in autosize | `string` | — |
| `maxlength` | Maximum length (native passthrough; pair with show-count) | `string` | — |
| `min-rows` | Minimum rows in autosize | `string` | `1` |
| `minlength` | Minimum length (native passthrough) | — | — |
| `name` | Form field name (native passthrough) | — | — |
| `placeholder` | Placeholder text | `string` | — |
| `readonly` | Readonly | `boolean` | — |
| `required` | Required marker (native passthrough) | — | — |
| `resize` | Resize behavior | `string` | — |
| `rows` | Number of rows | `string` | `3` |
| `show-count` | Show character count (bottom-right n/max; turns red over limit; aria-live announced) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `spellcheck` | Spellcheck (native passthrough) | — | — |
| `status` | Validation status: `error` / `warning` / `success`; error mirrors aria-invalid on the inner textarea | `string` | — |
| `value` | Value (controlled) | `string` | — |
| `variant` | Variant: `outlined` (default) / `filled` / `borderless` | `string` | `outlined` |
| `wrap` | Wrap strategy (native passthrough: soft/hard) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-blur` | Fires on blur, `detail: { value }` |
| `oas-change` | Native change semantics: fires on blur when the value changed, `detail: { value }` |
| `oas-clear` | Fires when the clear button is clicked (oas-input also fires), `detail: { originalEvent: new MouseEvent('click') }` |
| `oas-focus` | Fires on focus, `detail: { value }` |
| `oas-input` | While typing, `detail: { value }` |
