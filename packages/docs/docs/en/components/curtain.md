---
description: A one-time full-screen curtain that opens automatically on first visit and remembers dismissal locally; supports heading, close button, Esc, optional mask click and reset()
---

# Curtain

A full-screen overlay shown once per visitor: it opens automatically on the first visit and writes a local memory when dismissed, so it does not bother the user again. Suitable for announcements, onboarding, and campaign popups that should interrupt only once.

- Reads `localStorage` on first mount: opens automatically unless dismissed before, then records the dismissal
- The host can also control visibility with the `open` attribute (controlled overrides auto); `auto="false"` disables auto-open
- `storage-key` names the memory entry (default `oas-curtain`); instances share state per key
- `persist="false"` skips local memory (always opens); `reset()` clears the memory
- Close paths: close button / Esc / clicking outside when `mask-closable`; `close()` for programmatic control
- `role="dialog"` + `aria-modal="true"`; opening focuses the close button, Tab cycles inside the panel, and focus returns on close

## Basic Usage

<DemoBlock title="Open / clear memory (auto=false lets the docs trigger it manually)">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="ct-open">Open curtain</oas-button>
      <oas-button id="ct-reset" size="small">Clear memory</oas-button>
      <span id="ct-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Memory: not dismissed</span>
    </div>
    <oas-curtain id="ct-demo" heading="Welcome" storage-key="oas-docs-curtain" auto="false">
      <p style="margin: 0 0 var(--oas-space-3)">This is a one-time curtain: dismissing it writes a local memory, so the next visit does not auto-open it.</p>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Use the close button in the corner, or press Esc.</p>
    </oas-curtain>
  </div>
</DemoBlock>

## Auto-open (the real default)

Without `auto="false"` the curtain opens automatically on the first visit (guarded by local memory). The docs disable auto-open on every demo to avoid covering the page; the "Open curtain" button above shows the same state after a first auto-open.

<DemoBlock title="Default auto: opens on real integration">
  <p style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Drop <code>&lt;oas-curtain&gt;</code> into a production page with no script; after one dismissal the local memory prevents it from opening again.</p>
</DemoBlock>

## Click the Mask to Close

By default only the close button and Esc exit; `mask-closable` also allows clicking the mask outside the panel:

<DemoBlock title="mask-closable">
  <oas-curtain id="ct-mask" heading="Click outside to close" mask-closable auto="false" storage-key="oas-docs-curtain-mask">
    <p style="margin: 0">Clicking the empty area outside the card closes it.</p>
  </oas-curtain>
  <oas-button id="ct-mask-open" size="small">Open mask-closable curtain</oas-button>
</DemoBlock>

## Methods

See the "Methods" table in the API section below (`show` / `close` / `reset`).

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-curtain').then(() => {
    const demo = document.querySelector('#ct-demo')
    const output = document.querySelector('#ct-output')
    const refresh = () => {
      const dismissed = window.localStorage.getItem('oas-docs-curtain') === '1'
      if (output) output.textContent = dismissed ? 'Memory: dismissed before' : 'Memory: not dismissed'
    }
    refresh()
    document.querySelector('#ct-open')?.addEventListener('click', () => demo?.show())
    document.querySelector('#ct-reset')?.addEventListener('click', () => {
      demo?.reset()
      refresh()
      if (output) output.textContent = 'Memory: cleared'
    })
    demo?.addEventListener('oas-close', (event) => {
      refresh()
      if (output) output.textContent = `Closed (${event.detail.reason}); memory: dismissed`
    })
    document.querySelector('#ct-mask-open')?.addEventListener('click', () => document.querySelector('#ct-mask')?.show())
  })
})
</script>

## API

### oas-curtain

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `auto` | Auto-open switch: absent = auto-detect; `"false"` disables auto-open (manual control in docs/embeds) | `string` | — |
| `heading` | Heading; empty by default — use the default slot for custom content | `string` | — |
| `mask-closable` | Boolean; when present, clicking the mask outside the panel closes it (by default only the close button / Esc) | — | — |
| `open` | Controlled visibility (present = open; controlled overrides auto-detection) | — | — |
| `persist` | Value boolean: absent/any non-`"false"` = remember dismissal; `"false"` = no local memory, opens every time | `string` | — |
| `storage-key` | Local memory key (default `oas-curtain`); instances share the dismissed state per key | `string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `show` | `show(): void` | Force open (does not clear local memory) |
| `close` | `close(reason: CloseReason): void` | Close and write local memory (when persist applies), dispatching `oas-close` |
| `reset` | `reset(): void` | Clear local memory (does not change current visibility) |

#### Events

| Event | Description |
| --- | --- |
| `oas-close` | Dispatched on close (reason: button / esc / backdrop / api) |

#### Slots

| Name | Description |
| --- | --- |
| default | Curtain body content |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-curtain-bg` | Full-screen background | `var(--oas-color-bg)` |
| `--oas-curtain-color` | Text color | `var(--oas-color-text-primary)` |
| `--oas-curtain-duration` | Fade-in duration | `var(--oas-transition-base)` |
| `--oas-curtain-max-width` | Content card max width | `420px` |
| `--oas-curtain-panel-bg` | Content card background | `var(--oas-color-bg-elevated)` |
