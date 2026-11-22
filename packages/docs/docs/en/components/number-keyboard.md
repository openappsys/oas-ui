---
description: Numeric keyboard with randomized secure key order, delete/done keys and a license-plate layout (province abbreviation + letters + digits); event driven, the value is owned by the host.
---

# NumberKeyboard

A mobile numeric-input helper for codes, amounts and license plates — cases that need only digits and a few letters. The component has no inner input: key results are exposed through the `value` attribute and the `oas-input` / `oas-delete` / `oas-done` events for the host to write into its own control.

## Basic usage

Tap digit keys to append; `value` is written back to the host attribute. Delete removes the last character, Done dispatches `oas-done`.

<DemoBlock title="Default numeric keyboard (maxlength=6)">
  <oas-number-keyboard id="nk-basic" maxlength="6"></oas-number-keyboard>
  <p id="nk-basic-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">value: (empty)</p>
</DemoBlock>

<DemoBlock title="Wired to an input: write the value back on events">
  <oas-input id="nk-target" readonly placeholder="Tap the keyboard below"></oas-input>
  <oas-number-keyboard id="nk-wired" maxlength="6"></oas-number-keyboard>
</DemoBlock>

## Randomized order (`random`)

With `random` the digit order is shuffled (secure keypad scenarios); `randomize()` reshuffles programmatically (e.g. on every focus).

<DemoBlock title="random + reshuffle">
  <oas-number-keyboard id="nk-random" random maxlength="6"></oas-number-keyboard>
  <oas-button id="nk-shuffle" size="small">Reshuffle</oas-button>
</DemoBlock>

## License-plate layout (`layout="plate"`)

`layout="plate"` switches to a plate keyboard: province abbreviations (the “Province” key opens the panel) + letters (A–Z without I / O) + digits.

<DemoBlock title="plate">
  <oas-number-keyboard id="nk-plate" layout="plate" maxlength="8"></oas-number-keyboard>
  <p id="nk-plate-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">value: (empty)</p>
</DemoBlock>

## Disabled and readonly

<DemoBlock title="disabled / readonly">
  <oas-number-keyboard disabled value="123"></oas-number-keyboard>
  <oas-number-keyboard readonly value="456"></oas-number-keyboard>
</DemoBlock>

- `disabled`: every key is disabled and no events are dispatched
- `readonly`: keys stay focusable (screen-reader friendly) but the value cannot change; `oas-done` still fires (readonly is not “cannot submit”)

## Events and physical keyboard

While focus is inside the component, a physical keyboard works too: digits (plus letters in plate layout) and `Backspace`. Keys are native `<button>` elements, so Tab / Enter / Space work.

<DemoBlock title="oas-input / oas-delete / oas-done">
  <oas-number-keyboard id="nk-event" maxlength="8"></oas-number-keyboard>
  <p id="nk-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Waiting for input…</p>
</DemoBlock>

| Event | When | detail |
| --- | --- | --- |
| `oas-input` | A character is appended | `{ value, key }` |
| `oas-delete` | The last character is removed (not emitted when empty) | `{ value }` |
| `oas-done` | The done key is pressed | `{ value }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  const basic = document.getElementById('nk-basic')
  const basicOut = document.getElementById('nk-basic-out')
  const showBasic = (detail) => log(basicOut, `value: ${detail.value || '(empty)'}`)
  basic?.addEventListener('oas-input', (e) => showBasic(e.detail))
  basic?.addEventListener('oas-delete', (e) => showBasic(e.detail))

  const wired = document.getElementById('nk-wired')
  const target = document.getElementById('nk-target')
  wired?.addEventListener('oas-input', (e) => target?.setAttribute('value', e.detail.value))
  wired?.addEventListener('oas-delete', (e) => target?.setAttribute('value', e.detail.value))

  const random = document.getElementById('nk-random')
  document.getElementById('nk-shuffle')?.addEventListener('click', () => random?.randomize())

  const plate = document.getElementById('nk-plate')
  const plateOut = document.getElementById('nk-plate-out')
  const showPlate = (detail) => log(plateOut, `value: ${detail.value || '(empty)'}`)
  plate?.addEventListener('oas-input', (e) => showPlate(e.detail))
  plate?.addEventListener('oas-delete', (e) => showPlate(e.detail))

  const ev = document.getElementById('nk-event')
  const evOut = document.getElementById('nk-event-out')
  ev?.addEventListener('oas-input', (e) => log(evOut, `oas-input: ${e.detail.value} (key ${e.detail.key})`))
  ev?.addEventListener('oas-delete', (e) => log(evOut, `oas-delete: ${e.detail.value || '(empty)'}`))
  ev?.addEventListener('oas-done', (e) => log(evOut, `oas-done: ${e.detail.value || '(empty)'}`))
})
</script>

## API

### oas-number-keyboard

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled: all keys disabled and no events are dispatched | `boolean` | — |
| `layout` | Keyboard layout: `number` (default) / `plate` (license plate: province + letters + digits) | `string` | `number` |
| `maxlength` | Max length in characters (province abbreviations count as one); 0 or absent = unlimited | `string` | `0` |
| `random` | Shuffle the digit key order (secure keypad); reorders when toggled | `boolean` | — |
| `readonly` | Readonly: keys stay focusable but the value is locked; `oas-done` still fires | `boolean` | — |
| `value` | Current value (controlled): keys write back to this attribute and host writes apply immediately | — | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `randomize` | `randomize(): void` | Reshuffle the digit key order (secure keypad refresh) |

#### Events

| Event | Description |
| --- | --- |
| `oas-delete` | The last character is removed (not emitted when empty), `detail: { value }` |
| `oas-done` | The done key is pressed, `detail: { value }` |
| `oas-input` | A character is appended, `detail: { value, key }` |
