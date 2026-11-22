---
description: An offline notice component that follows online/offline events, shows a bar or block while offline, disappears on reconnect, and decides the first frame from navigator.onLine without flashing
---

# Offline

Listens to the browser `online` / `offline` events and keeps the network state in sync: a notice appears when offline and disappears automatically on reconnect. The first frame is decided directly from `navigator.onLine`, so there is no "online first, offline after" flash.

- `variant="bar"` (default) is fixed to the top of the viewport and spans the width; `variant="block"` stays in the document flow
- Copy defaults to the i18n key `offline.message`; override it with `message`
- Dispatches `oas-offline` / `oas-online` only when the state actually changes
- `role="status"` + `aria-live="polite"`; while online the host is `display:none`, leaving no residue in the accessibility tree

## Basic Usage

The default bar is fixed to the top. The interactive demo below uses the `block` variant in the document flow and temporarily shadows `navigator.onLine` to simulate offline / reconnect. The override persists for the whole page session — navigating to other docs pages within the SPA **keeps showing the offline state** (other example instances appear as well); only a full reload (F5) restores it. For debugging demos only; production should rely on real browser network events.

<DemoBlock title="Simulate offline / reconnect (block variant)">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-offline id="of-demo" variant="block"></oas-offline>
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="of-off" size="small">Simulate offline</oas-button>
      <oas-button id="of-on" size="small">Simulate reconnect</oas-button>
      <span id="of-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Not triggered yet</span>
    </div>
  </div>
</DemoBlock>

## Custom Copy

<DemoBlock title="message overrides the default copy">
  <oas-offline variant="block" message="No network. Serving cached content."></oas-offline>
</DemoBlock>

The example is invisible while online; switch DevTools to Offline or use the simulation buttons above to see it (only one notice renders per page — this block just demonstrates the attribute).

## Fixed Bar

`variant="bar"` is fixed to the top of the viewport and spans the width — suitable for full-screen pages without a navbar:

<DemoBlock title="bar variant (always mounted; invisible while online)">
  <oas-offline variant="bar" message="You are offline. Check your network connection."></oas-offline>
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">The bar covers the top of the viewport when actually offline; this block is online, so it is invisible.</p>
</DemoBlock>

## Events

`oas-offline` / `oas-online` are bubbles + composed, so the host can listen directly:

```js
const offline = document.querySelector('oas-offline')
offline.addEventListener('oas-offline', () => console.info('offline'))
offline.addEventListener('oas-online', () => console.info('online'))
```

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-offline').then(() => {
    const demo = document.querySelector('#of-demo')
    const output = document.querySelector('#of-output')
    const setOnline = (value) => {
      if (output) output.textContent = value ? 'Reconnect simulated' : 'Offline simulated'
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
      window.dispatchEvent(new Event(value ? 'online' : 'offline'))
    }
    document.querySelector('#of-off')?.addEventListener('click', () => setOnline(false))
    document.querySelector('#of-on')?.addEventListener('click', () => setOnline(true))
    demo?.addEventListener('oas-offline', () => {
      if (output) output.textContent = 'oas-offline dispatched (simulated offline)'
    })
    demo?.addEventListener('oas-online', () => {
      if (output) output.textContent = 'oas-online dispatched (simulated reconnect)'
    })
  })
})
</script>

## API

### oas-offline

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `message` | Copy override; defaults to i18n `offline.message` | `string` | — |
| `variant` | Presentation: `bar` (default, fixed to the top of the viewport) / `block` (in-flow notice block) | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-offline` | Dispatched when entering the offline state (only on real state changes) |
| `oas-online` | Dispatched when the network recovers (only on real state changes) |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-offline-bg` | Notice background (defaults to the danger semantic color) | `var(--oas-color-danger)` |
| `--oas-offline-color` | Notice text color (defaults to `--oas-color-text-on-danger`) | `var(--oas-color-text-on-danger)` |
