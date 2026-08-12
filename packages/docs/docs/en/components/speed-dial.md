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

## Text-only actions

`icon` can be omitted to show only the label; icon-only actions (no label) are also supported.

<DemoBlock title="Text only / icon only">
  <div style="width: 120px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"Share"},{"label":"Favorite"},{"label":"Report"}]'></oas-speed-dial>
  </div>
</DemoBlock>

## Events

Clicking the main button to expand/collapse fires `oas-open` (`detail: { open }`); clicking a sub-action fires `oas-select` (`detail: { index, label }`) and collapses automatically.

<DemoBlock title="Event feedback">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial id="sd-event" style="position: static" actions='[{"label":"Copy","icon":"copy"},{"label":"Edit","icon":"edit"},{"label":"Delete","icon":"trash"}]'></oas-speed-dial>
  </div>
  <span id="sd-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
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
    out.textContent = `oas-open: { open: ${e.detail.open} }`
  })
  el?.addEventListener('oas-select', (e) => {
    out.textContent = `oas-select: { index: ${e.detail.index}, label: "${e.detail.label}" }`
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

| Attribute   | Description                 | Type      | Default |
| ----------- | --------------------------- | --------- | ------- |
| `actions`   | Sub-action JSON             | `string`  | `[]`    |
| `direction` | Expansion direction         | `string`  | `up`    |
| `open`      | Expanded state (controlled) | `boolean` | —       |

### Events

| Event        | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| `oas-open`   | Expanded/collapsed, `detail: { open }`                                                 |
| `oas-select` | A sub-action was selected, `detail: { index, label }`, then it collapses automatically |

`SpeedDialAction` fields:

| Field   | Description                                         | Type     |
| ------- | --------------------------------------------------- | -------- |
| `label` | Action text                                         | `string` |
| `icon`  | Icon name (a key of `@oas-ui/icons` iconRegistry) | `string` |

Behavior: clicking the main button toggles expansion (`aria-expanded` synced); clicking outside or pressing Esc collapses (after Esc, focus returns to the main button); when expanded, the first sub-action is focused automatically. The default position is `position: fixed; bottom/right`, overridable. The document-level listener is only attached while expanded and disconnected during cleanup — no orphan popups.
