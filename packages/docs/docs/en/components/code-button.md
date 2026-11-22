---
description: "Verification-code send button: dispatches a cancelable oas-send on click, with built-in cooldown countdown and resend, loading/disabled states, a custom-content slot and aria-live announcements."
---

# CodeButton

The full front-end flow of a “get code” button: click → emit `oas-send` → start the cooldown countdown → become resendable. Sending the request is the host's job; the component owns interaction and state.

## Basic usage

Clicking starts the cooldown immediately (60 seconds by default); while cooling down the button is disabled and shows the remaining seconds.

<DemoBlock title="cooldown=10">
  <oas-code-button id="cb-basic" cooldown="10"></oas-code-button>
  <p id="cb-basic-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Waiting to send…</p>
</DemoBlock>

<DemoBlock title="cooldown=3 (see the whole flow quickly)">
  <oas-code-button id="cb-fast" cooldown="3"></oas-code-button>
</DemoBlock>

## Controlled flow (start the cooldown after the request succeeds)

`oas-send` can be intercepted with `preventDefault()`: the cooldown does not start automatically, and the host calls `start()` once the request succeeds. Below simulates a request that succeeds after 800 ms.

<DemoBlock title="intercept → request → start()">
  <oas-code-button id="cb-controlled" cooldown="10"></oas-code-button>
  <p id="cb-controlled-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">Not sent</p>
</DemoBlock>

## Loading and disabled

<DemoBlock title="loading / disabled">
  <oas-code-button loading></oas-code-button>
  <oas-code-button disabled></oas-code-button>
</DemoBlock>

- `loading`: shows the built-in spinner, sets `aria-busy="true"` and blocks repeated clicks
- `disabled`: not clickable and no events are dispatched

## Custom content (default slot)

Slot content is used for the idle state; during the countdown the built-in countdown text is still shown (so custom copy cannot hide the remaining time).

<DemoBlock title="default slot">
  <oas-code-button id="cb-slot" cooldown="5"><span>Send to phone</span></oas-code-button>
</DemoBlock>

## Events

| Event | When | detail |
| --- | --- | --- |
| `oas-send` | Clicked while clickable (`preventDefault` skips the cooldown) | `{ cooldown }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  const basic = document.getElementById('cb-basic')
  const basicOut = document.getElementById('cb-basic-out')
  basic?.addEventListener('oas-send', (e) => log(basicOut, `oas-send: cooldown ${e.detail.cooldown}s`))

  const controlled = document.getElementById('cb-controlled')
  const controlledOut = document.getElementById('cb-controlled-out')
  controlled?.addEventListener('oas-send', (e) => {
    e.preventDefault()
    log(controlledOut, 'Requesting… (auto cooldown intercepted)')
    window.setTimeout(() => {
      controlled.start()
      log(controlledOut, 'Request succeeded, cooldown started')
    }, 800)
  })
})
</script>

## API

### oas-code-button

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `cooldown` | Cooldown seconds (default 60); invalid/non-positive values fall back with a warning | `string` | — |
| `disabled` | Disabled: not clickable and no events are dispatched | `boolean` | — |
| `loading` | Request in flight: spinner + `aria-busy` + blocks repeated clicks | `boolean` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `counting` | Whether the cooldown is running (read-only) | `boolean` | — |
| `remaining` | Remaining cooldown seconds (read-only) | `number` | `0` |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `start` | `start(seconds?: number): void` | Start the cooldown (defaults to `cooldown`) |
| `reset` | `reset(): void` | End the cooldown immediately and return to idle |

#### Events

| Event | Description |
| --- | --- |
| `oas-send` | Fired on click while clickable, `detail: { cooldown }`; call `preventDefault()` to skip the automatic cooldown (host calls `start()` after success) |

#### Slots

| Name | Description |
| --- | --- |
| default | Custom button content (idle state; the built-in countdown text takes over during cooldown) |
