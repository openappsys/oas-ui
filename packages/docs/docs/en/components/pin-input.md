# PinInput

A segmented code input supporting keyboard arrow navigation, Backspace fallback, and paste auto-distribution.

## Basic Usage

<DemoBlock title="Default 6 digits">
  <oas-pin-input></oas-pin-input>
</DemoBlock>

## Custom Length

<DemoBlock title="length=4">
  <oas-pin-input length="4"></oas-pin-input>
</DemoBlock>

Set the number of cells via `length`.

## Mask

<DemoBlock title="mask">
  <oas-pin-input mask value="123456"></oas-pin-input>
</DemoBlock>

`mask` switches the cells to password type, masking the input values.

## Controlled Initial Value

<DemoBlock title="value prefill">
  <oas-pin-input value="25"></oas-pin-input>
</DemoBlock>

`value` is distributed to each cell; the portion beyond `length` is truncated automatically.

## Input Type

<DemoBlock title="type (text / number)">
  <oas-pin-input type="text" length="4" value="ab12"></oas-pin-input>
  <oas-pin-input type="number" length="4" value="1024"></oas-pin-input>
</DemoBlock>

`type` is passed through to the native input type: `text` (default) allows any character; `number` restricts to numeric input (pops up the numeric keyboard on mobile); with `mask` set, it is forced to `password` masking (see above).

## Invalid State

`aria-invalid` is in the observedAttributes: externally calling `setAttribute('aria-invalid', 'true'/'false')` switches immediately — all cells and the container sync this state and get danger-colored borders, with screen readers announcing "无效". Hosts typically set it after validating on `oas-complete` (e.g. wrong/expired code); removing the attribute restores the default state.

<DemoBlock title="aria-invalid dynamic toggle">
  <oas-space size="small">
    <oas-button size="small" type="danger" onclick="pinInvalid('true')">Mark as invalid</oas-button>
    <oas-button size="small" onclick="pinInvalid('false')">Restore normal</oas-button>
  </oas-space>
  <oas-pin-input id="pin-invalid" length="4" value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="aria-invalid static example">
  <oas-pin-input length="4" value="123" aria-invalid="true"></oas-pin-input>
  <oas-pin-input length="4" value="456"></oas-pin-input>
</DemoBlock>

## Disabled / Readonly

<DemoBlock title="disabled">
  <oas-pin-input disabled value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="readonly">
  <oas-pin-input readonly value="456"></oas-pin-input>
</DemoBlock>

## Events

<DemoBlock title="Input & complete events">
  <oas-pin-input id="pin-event" length="4"></oas-pin-input>
  <span id="pin-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

Listen to `oas-input` (per-cell input), `oas-change` / `oas-complete` (filled):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.pinInvalid = (invalid) => {
    const el = document.getElementById('pin-invalid')
    if (invalid === 'true') el?.setAttribute('aria-invalid', 'true')
    else el?.setAttribute('aria-invalid', 'false')
  }

  const el = document.getElementById('pin-event')
  const out = document.getElementById('pin-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-complete', (e) => {
    out.textContent = `oas-complete: ${e.detail.value}`
  })
})
</script>

## API

| Property        | Description                                   | Default |
| --------------- | --------------------------------------------- | ------- |
| `length`        | Number of code digits                         | `6`     |
| `value`         | Current value (controlled)                    | `''`    |
| `mask`          | Asterisk masking                              | `false` |
| `disabled`      | Disabled                                      | `false` |
| `readonly`      | Readonly                                      | `false` |
| `type`          | Cell input type                               | `text`  |
| `aria-invalid`  | Invalid state (synced to container and cells, marked danger) | — |

Keyboard: `←`/`→` to move between cells, `Backspace` deletes the current cell and moves back, paste auto-distribution is supported; when all cells are empty, each cell is focusable (native caret).

| Event           | Description                                    |
| --------------- | ---------------------------------------------- |
| `oas-input`     | Per-cell input, `detail: { value, index }`     |
| `oas-change`    | Dispatched when filled, `detail: { value }`    |
| `oas-complete`  | Dispatched when filled, `detail: { value }`    |

ARIA: the container has `role="group"` + `aria-label`, each cell has `aria-label="第 n 位"`, and `aria-invalid` is synced to both the container and all cells.
