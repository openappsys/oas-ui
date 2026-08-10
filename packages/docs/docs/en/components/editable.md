# Editable

Click/Enter/Space enters edit mode; Enter submits, Esc cancels, and empty-value submission is non-destructive by default.

## Basic Usage

<DemoBlock title="Click to edit">
  <oas-editable value="Click me to edit"></oas-editable>
</DemoBlock>

Click the text (or press Enter/Space when focused) to enter edit mode; `Enter` submits, `Esc` reverts.

## Placeholder

<DemoBlock title="Empty value placeholder">
  <oas-editable placeholder="No content, click to add"></oas-editable>
</DemoBlock>

`placeholder` is shown when the value is empty.

## submit-on-enter=false

<DemoBlock title="Enter does not submit">
  <oas-editable value="Submit only via the confirm button" submit-on-enter="false"></oas-editable>
</DemoBlock>

With `submit-on-enter=false`, `Enter` does not submit; use the confirm button inside edit mode instead.

## maxlength

<DemoBlock title="Length limit">
  <oas-editable value="Up to 10 characters" maxlength="10"></oas-editable>
</DemoBlock>

## Disabled

<DemoBlock title="disabled">
  <oas-editable disabled value="Not editable"></oas-editable>
</DemoBlock>

## Events

<DemoBlock title="Submit/cancel events">
  <oas-editable id="edit-event" value="Edit me"></oas-editable>
  <span id="edit-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

Listen to `oas-change` (submit) and `oas-cancel` (cancel/empty-value submit):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('edit-event')
  const out = document.getElementById('edit-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-cancel', (e) => {
    out.textContent = `oas-cancel`
  })
})
</script>

## API

| Property           | Description                        | Default |
| ------------------ | ---------------------------------- | ------- |
| `value`            | Current value (controlled)         | `''`    |
| `placeholder`      | Empty value placeholder            | `''`    |
| `disabled`         | Disabled                           | `false` |
| `submit-on-enter`  | Whether Enter submits              | `true`  |
| `maxlength`        | Maximum input length               | `-1`    |

Keyboard: in display mode `Enter`/Space/click enters edit mode; in edit mode `Enter` submits, `Esc` reverts and blurs.

| Event         | Description                                        |
| ------------- | -------------------------------------------------- |
| `oas-change`  | New value submitted, `detail: { value }`           |
| `oas-cancel`  | Cancel/empty-value submit (reverts to old value), non-destructive by default |

ARIA: display mode has `role="button"` + `aria-label="编辑"`; the edit-mode input keeps the same label.
