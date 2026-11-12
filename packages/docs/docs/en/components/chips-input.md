# ChipsInput

Recipient chips input: chips and a borderless input share a single control box. Pasting multiple addresses auto-splits on semicolons / commas / newlines / whitespace; `Enter` / `,` / `;` commits a chip; invalid emails get a red outline and emit `oas-invalid` (submission is not blocked — the host decides on controlled data).

## Basic usage

<DemoBlock title="Email scenario">
  <oas-chips-input id="chips-basic" value='["alice@example.com","bob@example.com"]'></oas-chips-input>
</DemoBlock>

`value` is dual-channel: the property is a string array, the attribute is a JSON-serialized string. Press `Enter` / `,` / `;` to commit the current text as a chip; `placeholder` falls back to the i18n message when absent.

## Paste auto-split

<DemoBlock title="Paste multi-address text split on semicolons/commas/newlines/whitespace">
  <oas-chips-input id="chips-paste" placeholder="Try pasting: a@b.co; c@d.co, e@f.co"></oas-chips-input>
</DemoBlock>

When pasted text contains separators (semicolon / comma / newline / whitespace), it is split, trimmed, and committed as chips in batch (each piece goes through dedup / max / email validation); paste without separators keeps native insertion. A batch addition emits one `oas-change` (`trigger = "paste"`).

## Backspace to edit

<DemoBlock title="Backspace on empty input edits the previous chip">
  <oas-chips-input id="chips-edit" value='["typo@example.com"]'></oas-chips-input>
</DemoBlock>

With an empty input, `Backspace` turns the last chip into editable text (focused and selected): `Enter` / blur commits, `Esc` cancels and restores, committing an empty value removes the chip. The `×` button on a chip removes it individually.

## Inline email validation

<DemoBlock title="Invalid email: red outline + oas-invalid (submission not blocked)">
  <oas-chips-input id="chips-invalid" placeholder="Type not-an-email and press Enter"></oas-chips-input>
  <span id="chips-invalid-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

- Invalid email chips are still created (**submission is not blocked** — the host decides on controlled data), with a red outline (danger token), a `title` tooltip, and an inline hint
- Emits `oas-invalid` (`detail: { value, index }`); **idempotent**: only user-interaction paths emit — re-renders and programmatic `value` writes do not re-emit
- The validation uses a pragmatic email regex (not full RFC 5322 coverage); hosts can listen to `oas-invalid` and decide on their own

## max limit

<DemoBlock title="max=3: exceeding emits oas-exceed-limit and blocks additions">
  <oas-chips-input id="chips-max" max="3" value='["a@b.co","c@d.co"]'></oas-chips-input>
  <span id="chips-max-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

Once `max` is reached, further additions emit `oas-exceed-limit` (`detail: { value, max }`) with an inline hint and are not added; existing chips can still be removed.

## Duplicate handling

Duplicate values are silently dropped (no new chip, no `oas-add`), with a single dev-only warning per component instance (stripped in production). Committing an edit that duplicates another chip is likewise silently restored.

## disabled / readonly / size

<DemoBlock title="disabled / readonly">
  <oas-chips-input disabled value='["a@b.co"]'></oas-chips-input>
  <oas-chips-input readonly value='["a@b.co"]'></oas-chips-input>
</DemoBlock>

<DemoBlock title="size">
  <oas-chips-input size="small" value='["small@b.co"]'></oas-chips-input>
  <oas-chips-input value='["medium@b.co"]'></oas-chips-input>
  <oas-chips-input size="large" value='["large@b.co"]'></oas-chips-input>
</DemoBlock>

- `disabled`: the input and remove buttons are disabled; the control box is desaturated (reads the injected global disabled state)
- `readonly`: chips are display-only; the input and remove buttons are hidden (distinct form semantics from disabled)
- `size`: `small` / `medium` (default) / `large`; the control box height follows the `--oas-control-height-*` tokens

## Events

<DemoBlock title="Add / remove / edit event feedback">
  <oas-chips-input id="chips-event" value='["a@b.co"]'></oas-chips-input>
  <span id="chips-event-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

`oas-change` carries `detail: { value, trigger }` with `trigger ∈ add | remove | edit | paste`; also available: `oas-add` / `oas-remove` (`detail: { value, index }`), `oas-invalid`, `oas-exceed-limit`, `oas-focus` / `oas-blur`:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const invalid = document.getElementById('chips-invalid')
  const invalidOut = document.getElementById('chips-invalid-output')
  invalid?.addEventListener('oas-invalid', (e) => {
    invalidOut.textContent = `oas-invalid: ${e.detail.value} (index ${e.detail.index})`
  })
  const max = document.getElementById('chips-max')
  const maxOut = document.getElementById('chips-max-output')
  max?.addEventListener('oas-exceed-limit', (e) => {
    maxOut.textContent = `oas-exceed-limit: ${e.detail.value} (max ${e.detail.max})`
  })
  const el = document.getElementById('chips-event')
  const out = document.getElementById('chips-event-output')
  el?.addEventListener('oas-add', (e) => { out.textContent = `oas-add: ${e.detail.value}` })
  el?.addEventListener('oas-remove', (e) => { out.textContent = `oas-remove: ${e.detail.value}` })
  el?.addEventListener('oas-change', (e) => { out.textContent = `oas-change(${e.detail.trigger}): ${JSON.stringify(e.detail.value)}` })
})
</script>

## ChipsInput vs DynamicTags

Both are "free input becomes chips" components with different interaction models: DynamicTags is a tag flow plus a persistent input below (sorting / collapse / custom tag templates); ChipsInput keeps chips inline in a single control box (a single-control mental model close to a native input) with built-in per-chip email validation and red outlines. Use **ChipsInput for recipient / email sets**; use DynamicTags for generic tags (keywords, categories) that need sorting / collapsing / template customization.

## API

### oas-chips-input

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | `boolean` | — |
| `max` | Chip count limit; exceeding emits oas-exceed-limit and blocks additions | `string` | — |
| `name` | Form field name (key collected by oas-form; the component is not form-associated and is not submitted via native FormData) | — | — |
| `placeholder` | Input placeholder (i18n default) | `string` | — |
| `readonly` | Readonly (chips are display-only) | `boolean` | — |
| `size` | Size: small / medium / large | `string` | `medium` |
| `value` | Email chip array (property or JSON attribute) | `string[]` | `[]` |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Current value: email string array (writing back to the value attribute emits no events) | `string[]` | `[]` |

#### Events

| Event | Description |
| --- | --- |
| `oas-add` | Dispatched when a chip is added, `detail: { value, index }` |
| `oas-blur` | Dispatched when the input is blurred |
| `oas-change` | Dispatched after chips are added/removed/edited, `detail: { value, trigger }`, trigger ∈ add \| remove \| edit \| paste |
| `oas-exceed-limit` | Dispatched when exceeding the max limit; addition is blocked, `detail: { value, max }` |
| `oas-focus` | Dispatched when the input is focused |
| `oas-invalid` | Dispatched when a chip fails email validation (idempotent: user-interaction paths only; submission not blocked), `detail: { value, index }` |
| `oas-remove` | Dispatched when a chip is removed, `detail: { value, index }` |

Keyboard: `Enter` / `,` / `;` commits a chip; `Backspace` on empty input edits the previous chip; in edit mode `Enter` commits / `Esc` cancels.

ARIA: chips container `role="list"`, chip `role="listitem"`, input and remove buttons carry i18n `aria-label`s, hint area `role="alert"`; the host carries `aria-readonly` when readonly.
