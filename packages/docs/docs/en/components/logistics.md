---
description: "Delivery timeline: steps JSON dual-channel (state / time / description, newest-first convention) + current-node highlight (state derived by default) + collapse (latest 2 only) + copy-tracking / copy-address action slots; ol/li timeline semantics."
---

# Logistics

Node timeline: `steps` JSON dual-channel `[{ state?, time?, desc?, title? }]` (**newest-first convention** — the first entry is the latest progress), `reverse` flips the render direction (for hosts whose data is chronological); the current node is highlighted (`state: 'done' | 'current' | 'pending'`, **derived by default** — when nothing is declared the first entry is `current` and the rest are `done`; with explicit declarations, undeclared entries split around the first open entry: earlier = done, later = pending); collapse (`collapsed` shows only the latest 2 + an “expand all N” toggle); **action slots** for copy-tracking / copy-address (the host owns the copy logic, the component provides the slot and layout).

## Basic timeline (default state derivation)

With no `state` declared: the first entry (latest progress) is `current` with `aria-current="step"`, the rest are `done`. Each li's `aria-label` carries the state text (not color-only):

<DemoBlock title="Basic trajectory (newest first, first entry in progress)">
  <oas-logistics
    steps='[{"title":"Package delivered","time":"11-24 18:20","desc":"Signed by: recipient"},{"title":"Out for delivery","time":"11-24 08:05","desc":"Courier: Zhang 138****0000"},{"title":"Arrived at hub","time":"11-23 21:40"},{"title":"Shipped by seller","time":"11-22 12:00"}]'
  ></oas-logistics>
</DemoBlock>

## Explicit states & reverse

Full-flow node data: declare `done` / `current` / `pending` explicitly; undeclared entries derive around the first open entry. `reverse` flips the render order (chronological timeline; `aria-current` follows the semantic node, not the DOM position):

<DemoBlock title="Explicit states + reverse (chronological)">
  <oas-logistics
    reverse
    steps='[{"title":"Order placed","time":"11-20 10:00","state":"done"},{"title":"Shipped by seller","time":"11-21 09:30","state":"done"},{"title":"In transit","time":"11-23 21:40","state":"current"},{"title":"Out for delivery","desc":"Expected today"},{"title":"Delivered","desc":"Address: Chaoyang, Beijing"}]'
  ></oas-logistics>
</DemoBlock>

## Collapse & expand

`collapsed` shows only the latest 2 entries plus an “expand all N” toggle; clicking writes the attribute back and fires `oas-toggle` (detail `{ collapsed }`, the order-card event convention); steps ≤ 2 entries hide the toggle:

<DemoBlock title="Collapsed (latest 2 only) + toggle feedback">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
  <oas-logistics id="lg-collapse" collapsed
    steps='[{"title":"Package delivered","time":"11-24 18:20"},{"title":"Out for delivery","time":"11-24 08:05"},{"title":"Arrived at hub","time":"11-23 21:40"},{"title":"Shipped by seller","time":"11-22 12:00"},{"title":"Order created","time":"11-21 10:00"}]'
  ></oas-logistics>
  <p id="lg-collapse-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click “expand all 5” / “collapse” to see the oas-toggle feedback.
  </p>
  </div>
</DemoBlock>

## Action slots (copy tracking / address)

The `actions` slot: the copy logic belongs to the host (`navigator.clipboard` on your side); the component provides the slot container and layout; with no content the whole action row hides:

<DemoBlock title="Copy tracking number / address actions">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
  <oas-logistics id="lg-actions"
    steps='[{"title":"Package delivered","time":"11-24 18:20","desc":"Tracking no. SF1380000221108"}]'
  >
    <oas-button slot="actions" size="small" data-demo-copy="number">Copy number</oas-button>
    <oas-button slot="actions" size="small" data-demo-copy="address">Copy address</oas-button>
  </oas-logistics>
  <p id="lg-actions-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click an action button to see the host-side copy feedback.
  </p>
  </div>
</DemoBlock>

## Keyboard & accessibility

- Timeline uses a legal `ol > li` combination (ol's native list semantics + `aria-label` “Delivery tracking”; **toggle / actions / empty state live outside the ol** — non-entry nodes never enter list semantics).
- Current node `aria-current="step"`; every li's `aria-label` carries the state text (completed / in progress / pending) plus title / time / desc — **state is not color-only** (visually the current dot is larger and the title bolder).
- Toggle button text is the state (“expand all N” / “collapse”); actions area `role="group"` + `aria-label` “Related actions”.
- Empty / invalid `steps` renders the empty state (invalid JSON warns once and treats it as empty).
- Connector lines and layout mirror via logical properties (RTL safe); colors are token-based (dark theme follows).

## Custom styling notes

`::part(timeline)` is the `ol` container; each `::part(item)` contains `::part(dot)` (target via `data-state="done|current|pending"`) and `::part(title)` / `::part(time)` / `::part(desc)`; connector lines draw on the item's `::before`. Restyle state dots via `::part(dot)` combined with host-side `[data-state]` selectors.

<script setup lang="ts">
import { onMounted } from 'vue'

// Demo script conventions (do not move): ① must be a page-level script setup — inside DemoBlock
// VitePress does not extract it and the raw text breaks the page (imports fail / hydration mismatch);
// ② placed before `## API`: that section is the api:gen generated region, business scripts must not live there.
onMounted(() => {
  customElements.whenDefined('oas-logistics').then(() => {
    const collapse = document.getElementById('lg-collapse')!
    const collapseOut = document.getElementById('lg-collapse-out')!
    collapse.addEventListener('oas-toggle', (e) => {
      const d = (e as CustomEvent).detail
      collapseOut.textContent = d.collapsed ? 'oas-toggle: collapsed (latest 2 only)' : 'oas-toggle: expanded all'
    })

    const actions = document.getElementById('lg-actions')!
    const actionsOut = document.getElementById('lg-actions-out')!
    actions.querySelectorAll('[data-demo-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = (btn as HTMLElement).dataset.demoCopy
        const text = kind === 'number' ? 'SF1380000221108' : 'xx Road, Chaoyang, Beijing'
        void navigator.clipboard?.writeText(text).catch(() => {})
        actionsOut.textContent = `Copied ${kind}: ${text} (copy logic owned by the host, component provides the slot)`
      })
    })
  })
})
</script>

## API

### oas-logistics

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `collapsed` | Collapsed: shows only the latest 2 entries (toggle hidden for ≤2 entries); user toggles write the attribute back and fire oas-toggle | `boolean` | — |
| `reverse` | Flips the render order (for chronological host data; aria-current follows the semantic node, not the DOM position) | `boolean` | — |
| `steps` | Delivery nodes JSON array `[{ state?, time?, desc?, title? }]` (newest-first; entries without title and desc are ignored; invalid JSON warns once and renders the empty state) | `LogisticsStep[] \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `collapsed` | Collapsed state: get+set dual channel (boolean), writes reflect the `collapsed` attribute (host writes are silent; only user clicks fire) | `boolean` | — |
| `steps` | Delivery nodes: get+set dual channel (array or JSON string), writes reflect the `steps` attribute | `LogisticsStep[] \| string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-toggle` | Fires after the user toggles expand / collapse, `detail: { collapsed }` (the new state); host writes to `collapsed` do not fire |

#### Slots

| Name | Description |
| --- | --- |
| `actions` | Action row (copy tracking / copy address — copy logic and accessible names belong to the host buttons; the component provides the slot and layout; hides when empty) |
