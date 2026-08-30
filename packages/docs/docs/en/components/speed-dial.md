# SpeedDial

A floating main button that expands a list of sub-actions, commonly used for quick actions like "New/Share"; `aria-expanded` stays in sync, clicking outside / Esc collapses it, with no orphan popups.

> The demos add `style="position: static"` to avoid fixed positioning affecting the page layout; in real use it is fixed to the bottom-right by default. The expansion direction of the sub-actions is controlled by `direction`.

## Expansion direction

`direction` supports `up` (default) / `down` / `left` / `right`; the first sub-action is always closest to the main button.

<DemoBlock title="Directions: up / down / left / right">
  <div style="display: flex; gap: var(--oas-space-5); align-items: center; min-height: 200px; width: 100%">
    <div style="width: 96px; height: 160px">
      <oas-speed-dial style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 96px; height: 160px">
      <oas-speed-dial direction="down" style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 220px; height: 80px; display: flex; align-items: center">
      <oas-speed-dial direction="right" style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 220px; height: 80px; display: flex; align-items: center; justify-content: flex-end">
      <oas-speed-dial direction="left" style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
    </div>
  </div>
</DemoBlock>

## Cascade animation

On expansion, the sub-actions fade in one after another (`transition-delay = index × 30ms` per item) and disappear simultaneously on collapse. The animation is built in with no configuration needed; under `prefers-reduced-motion` the cascade delay is zeroed and transitions are disabled (everything appears at once, for accessibility). The demos above already use it when expanded.

## Text-only actions

`icon` can be omitted to show only the label; icon-only actions (no label) are also supported.

<DemoBlock title="Text only / icon only">
  <div style="width: 120px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"Share"},{"label":"Favorite"},{"label":"Report"}]'></oas-speed-dial>
  </div>
</DemoBlock>

## Events

Clicking the main button to expand/collapse fires `oas-open` (`detail: { open, reason }`); clicking a sub-action fires `oas-select` (`detail: { index, label }`) and collapses automatically. `reason` marks the source of the open/collapse: `toggle` (main button click) / `outside` (outside click) / `escape` (Esc) / `select` (action selection) / `hover` (hover trigger).

<DemoBlock title="Event feedback">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial id="sd-event" style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
  </div>
  <span id="sd-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

## Hover trigger

With `trigger="hover"`, hovering the main button expands and moving away collapses after a 120ms grace period (moving back into the panel during the grace period keeps it open); touch devices automatically fall back to `click` behavior.

<DemoBlock title="Hover trigger">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial trigger="hover" id="sd-hover" style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
  </div>
  <span id="sd-hover-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

## Custom main button icon

The main button shows a default "＋"; pass a custom icon through the default slot (it still rotates 45° when expanded).

<DemoBlock title="Custom main button icon">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"}]'>
      <svg viewBox="0 0 16 16" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 3v10M3 8h10"/>
      </svg>
    </oas-speed-dial>
  </div>
</DemoBlock>

## Keyboard navigation

When expanded, the first sub-action is focused automatically; arrow keys move between actions (vertical expansion uses `ArrowUp`/`ArrowDown`, horizontal expansion uses `ArrowLeft`/`ArrowRight`, wrapping around), `Home`/`End` jump to the first/last, and `Esc` collapses and returns focus to the main button.

<DemoBlock title="Keyboard navigation">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
  </div>
</DemoBlock>

## Controlled open

The `open` attribute is controlled: setting/removing it externally expands/collapses, and the component's own clicks also sync the attribute and fire `oas-open` (clicking outside / Esc still collapses).

<DemoBlock title="Controlled expansion">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial id="sd-ctrl" style="position: static" actions='[{"label":"New","icon":"plus"},{"label":"Upload","icon":"upload"},{"label":"Download","icon":"download"}]'></oas-speed-dial>
  </div>
  <oas-button-group>
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); sdCtrl(true)">Expand</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); sdCtrl(false)">Collapse</oas-button>
    <oas-tag id="sd-status" type="info">open: false</oas-tag>
  </oas-button-group>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('sd-event')
  const out = document.getElementById('sd-out')
  el?.addEventListener('oas-open', (e) => {
    out.textContent = `oas-open: { open: ${e.detail.open}, reason: "${e.detail.reason}" }`
  })
  el?.addEventListener('oas-select', (e) => {
    out.textContent = `oas-select: { index: ${e.detail.index}, label: "${e.detail.label}" }`
  })

  const hover = document.getElementById('sd-hover')
  const hoverOut = document.getElementById('sd-hover-out')
  hover?.addEventListener('oas-open', (e) => {
    hoverOut.textContent = `oas-open: { open: ${e.detail.open}, reason: "${e.detail.reason}" }`
  })

  const ctrl = document.getElementById('sd-ctrl')
  const status = document.getElementById('sd-status')
  if (ctrl && status) {
    const sync = () => {
      status.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.sdCtrl = (open) => {
      if (open) ctrl.setAttribute('open', '')
      else ctrl.removeAttribute('open')
    }
    sync()
    // Component clicks, outside clicks and Esc all change `open`; keep the status in sync with a MutationObserver
    new MutationObserver(sync).observe(ctrl, { attributes: true, attributeFilter: ['open'] })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions` | Sub-action JSON | `string` | `[]` |
| `direction` | Expansion direction | `string` | `up` |
| `open` | Expanded state (controlled) | `boolean` | — |
| `trigger` | Trigger mode: `click` (default) \| `hover` (open on hover, collapse on leave with a 120ms grace period; falls back to click on touch devices) | `string` | `click` |

### Events

| Event | Description |
| --- | --- |
| `oas-open` | Expanded/collapsed, `detail: { open, reason }`; reason is `toggle` / `outside` / `escape` / `select` / `hover` (source marker, backward compatible with the open field) |
| `oas-select` | A sub-action was selected, `detail: { index, label }`, then it collapses automatically |

### Slots

| Name | Description |
| --- | --- |
| default | Custom icon for the main button; when provided it replaces the default ＋ (45° rotation on expansion is preserved) |

`SpeedDialAction` fields:

| Field   | Description                                          | Type     |
| ------- | ---------------------------------------------------- | -------- |
| `label` | Action text                                          | `string` |
| `icon`  | Icon name (a key of `@oas-ui/icons` iconRegistry)  | `string` |

Behavior: clicking the main button toggles expansion (`aria-expanded` synced); `trigger="hover"` switches to hover trigger (touch devices fall back to click); clicking outside or pressing Esc collapses (after Esc, focus returns to the main button); clicking a sub-action collapses and fires `oas-select`; when expanded, the first sub-action is focused automatically and arrow keys / Home / End navigate between actions. The default position is `position: fixed; bottom/right`, overridable. The document-level listener is only attached while expanded and disconnected during cleanup — no orphan popups.
