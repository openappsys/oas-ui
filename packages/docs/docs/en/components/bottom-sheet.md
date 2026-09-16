# BottomSheet

Mobile bottom sheet container: a bottom-risen panel with drag handle and backdrop, closable via drag-down / backdrop click / Esc, with safe-area inset and focus trap built in; the `passive` passthrough mode doubles as a structural placeholder for overlay components' PC forms.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-button type="primary" id="bs-open">Open sheet</oas-button>
  </oas-space>
  <p>The panel rises from the bottom with a backdrop; drag the handle past the threshold, click the backdrop, or press <code>Esc</code> to request a close — <code>oas-close</code>'s <code>detail.reason</code> tells them apart (<code>drag</code> / <code>backdrop</code> / <code>esc</code>). The component never mutates the controlled <code>open</code>; the host closes it by removing the attribute.</p>
</DemoBlock>

## max-height and content scrolling

<DemoBlock title="max-height and content scrolling">
  <oas-space>
    <oas-button id="bs-open-capped">Capped sheet (50vh)</oas-button>
  </oas-space>
  <p><code>max-height</code> caps the panel height (default 85vh); overflowing content scrolls inside the panel instead of breaking the viewport.</p>
</DemoBlock>

## Passive passthrough (structural placeholder)

<DemoBlock title="Passive passthrough (structural placeholder)">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2)">
    <oas-bottom-sheet passive open max-height="120px">
      <p style="margin:0">Passive mode: no backdrop, no handle, no overlay positioning or gestures — a static structural placeholder only (the dashed frame marks the carrier bounds; the host is display:contents in passive mode and leaves no box of its own), letting overlay components reuse the same carrier structure in their PC forms (SSR/client structure strictly identical).</p>
    </oas-bottom-sheet>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  const reasonLabel = (reason) =>
    reason === 'drag' ? 'drag handle' : reason === 'backdrop' ? 'backdrop click' : 'Esc key'
  window.openBs = (id, maxHeight) => {
    let el = document.getElementById(id)
    if (el) el.remove()
    el = document.createElement('oas-bottom-sheet')
    el.id = id
    if (maxHeight) el.setAttribute('max-height', maxHeight)
    el.innerHTML =
      '<div style="padding:4px 0">' +
      '<p style="margin:0 0 12px;font-weight:600">Actions</p>' +
      '<oas-button block style="margin-bottom:8px">Favorite</oas-button>' +
      '<oas-button block style="margin-bottom:8px">Share</oas-button>' +
      '<oas-button block type="primary">Done</oas-button>' +
      '</div>'
    el.addEventListener('oas-close', (e) => {
      el.removeAttribute('open')
      toast.info({ title: `Sheet closed (${reasonLabel(e.detail?.reason)})`, duration: 2000 })
    })
    el.setAttribute('open', '')
    document.body.appendChild(el)
  }
  document.getElementById('bs-open')?.addEventListener('click', () => window.openBs('bs-basic'))
  document.getElementById('bs-open-capped')?.addEventListener('click', () => window.openBs('bs-capped', '50vh'))
})
</script>

## API

- `open` is controlled: component gestures (drag / backdrop / Esc) only emit `oas-close`; the host completes closing by removing `open`.
- Focus trap built in: focus is locked inside the panel while open and returned on close; `safe-area-inset-bottom` is honored for gesture-bar devices.
- `passive` mode is meant for overlay components' PC-form structure reuse (the carrier behind select/date-picker mobile forms); standalone it is simply a static panel.

## API

### oas-bottom-sheet

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `max-height` | Panel max height, default 85vh; overflowing content scrolls inside the panel | `string` | — |
| `open` | Controlled open state (single source of truth). Shows the bottom panel and backdrop when open; gestures (drag handle / backdrop click / Esc) only emit oas-close requests — the host removes open to actually close (the component never mutates the controlled value) | `boolean` | — |
| `passive` | Passive passthrough mode — hides backdrop and drag handle, disables overlay positioning and gestures; renders a static structure placeholder only (for overlay components PC-form reuse; SSR/client structure strictly identical) | `boolean` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-close` | Close request; detail.reason is drag (handle dragged past threshold) / backdrop (backdrop click) / esc (Escape key). The component only emits — the host decides to close by removing open |

#### Slots

| Name | Description |
| --- | --- |
| default | Sheet body content |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-bottom-sheet-max-height` | `85vh` |
