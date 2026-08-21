# Dropdown

A click-triggered menu that opens anchored to the trigger element.

## Basic usage

<DemoBlock title="Trigger on click">
  <oas-dropdown items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]' placement="bottom">
    <oas-button type="primary">Actions</oas-button>
  </oas-dropdown>
</DemoBlock>

## Trigger

The `trigger` attribute controls how the menu opens: `click` (default) / `hover` / `focus`, multi-selectable with spaces (e.g. `"click hover"`). With hover, `hover-delay` / `hover-hide-delay` debounce open/close (default 150 / 100ms — without a delay hover flickers). The hover area is the trigger plus the floating panel (moving across the gap does not close it).

<DemoBlock title="Hover trigger">
  <oas-dropdown trigger="hover" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Hover to open</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="Focus trigger">
  <oas-dropdown trigger="focus" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Focus to open (Tab or click)</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="Multiple triggers (click + hover)">
  <oas-dropdown trigger="click hover" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Click or hover</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="Custom hover delays">
  <oas-space size="small">
    <oas-dropdown trigger="hover" hover-delay="400" items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>hover-delay=400</oas-button>
    </oas-dropdown>
    <oas-dropdown trigger="hover" hover-hide-delay="400" items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>hover-hide-delay=400</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-dropdown placement="top" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Up</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="bottom" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Down</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="left" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Left</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="right" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Right</oas-button>
  </oas-dropdown>
</DemoBlock>

## 12-way placement

`placement` supports 12 directions: each of the four bases (`top / bottom / left / right`) pairs with a cross-axis `-start` / `-end` align (`bottom-start` — the panel's left edge aligns with the trigger's left edge — is the most common form). When the panel flips along the main axis due to lack of space, the align suffix is preserved (`bottom-start` → `top-start`), and the aligned position is still clamped to the viewport.

<DemoBlock title="12-way placement">
  <oas-space size="small">
    <oas-dropdown placement="bottom-start" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>bottom-start</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="bottom-end" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>bottom-end</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="right-start" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>right-start</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="top-end" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>top-end</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## Nested submenus

`items` entries support a `children` array for cascading submenus (any depth); hover/click expands, selecting a leaf collapses and closes. The floating menu reuses `oas-menu`, so nested submenus automatically flip left/up near viewport edges to stay fully visible.

<DemoBlock title="Nested submenus">
  <oas-dropdown items='[{"label":"File","value":"file","children":[{"label":"New","value":"new","children":[{"label":"File","value":"new-file"},{"label":"Window","value":"new-window"}]},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit"}]'>
    <oas-button>More actions</oas-button>
  </oas-dropdown>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-dropdown items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete","disabled":true}]'>
    <oas-button>Actions</oas-button>
  </oas-dropdown>
</DemoBlock>

## Disabled dropdown

`disabled` disables the whole dropdown: click / hover / focus triggers are ignored, the split arrow button is disabled, the host is desaturated (opacity .6) and syncs `aria-disabled`.

<DemoBlock title="Disabled dropdown">
  <oas-space size="small">
    <oas-dropdown disabled items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>Disabled (click)</oas-button>
    </oas-dropdown>
    <oas-dropdown disabled split items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>Disabled (split)</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## Arrow

The menu panel shows an arrow pointing at the trigger element . The `arrow` attribute toggles it (shown by default; `arrow="false"` hides it). `arrow-point-at-center` pins the arrow to the panel center (by default the arrow follows the trigger's projection, so it still points at the trigger even after viewport-avoidance shifting). `auto-adjust-overflow` controls whether the placement auto-flips when there is not enough viewport space (enabled by default).

<DemoBlock title="With arrow">
  <oas-dropdown id="dd-arrow" placement="bottom" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button type="primary">With arrow</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="Arrow visibility">
  <oas-space size="small">
    <oas-dropdown items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>Default (arrow)</oas-button>
    </oas-dropdown>
    <oas-dropdown id="dd-arrow-none" arrow="false" items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>arrow="false"</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

<DemoBlock title="Arrow at center & no overflow adjust">
  <oas-space size="small">
    <oas-dropdown arrow-point-at-center items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>arrow-point-at-center</oas-button>
    </oas-dropdown>
    <oas-dropdown auto-adjust-overflow="false" items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>auto-adjust-overflow="false"</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## Selection event

<DemoBlock title="Selection event">
  <oas-dropdown id="dd-event" onoas-select="ddLog(event)" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Select an action</oas-button>
  </oas-dropdown>
  <oas-tag id="dd-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Keep open after select

`hide-on-click` controls whether selecting a menu item closes the menu (default `true` — close on select; `"false"` keeps it open, useful for multi-select / check scenarios).

<DemoBlock title="Keep open after select">
  <oas-dropdown id="dd-keep" hide-on-click="false" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Keep open</oas-button>
  </oas-dropdown>
  <oas-tag id="dd-keep-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to show/hide the menu (clicking outside / pressing Esc / selecting an item still closes it).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation; ddOpen(true)">Open</oas-button>
    <oas-button size="small" onclick="event.stopPropagation; ddOpen(false)">Close</oas-button>
    <oas-tag id="dd-open-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-dropdown id="dd-ctrl" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Trigger element</oas-button>
  </oas-dropdown>
</DemoBlock>

## Open-change event

The component fires `oas-open-change` (`detail: { open }`) whenever it opens or closes itself (click / hover / focus / Esc / outside click / select) — the host can sync state in controlled mode (same semantics as tooltip / popover; externally writing `open` also triggers it).

<DemoBlock title="oas-open-change event">
  <oas-space size="small">
    <oas-dropdown id="dd-open-change" trigger="click hover" onoas-open-change="ddOpenChange(event)" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>Click or hover</oas-button>
    </oas-dropdown>
    <oas-tag id="dd-open-change-status" type="info">open: false</oas-tag>
  </oas-space>
</DemoBlock>

## Offset & scroll

`offset` adjusts the gap between the panel and the trigger (default 8px). When the page scrolls, the panel repositions to follow the trigger (fixing the fixed-positioning detachment); `close-on-scroll` closes it on scroll instead.

<DemoBlock title="Offset">
  <oas-space size="small">
    <oas-dropdown placement="bottom-start" items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>Default (8px)</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="bottom-start" offset="16" items='[{"label":"Edit","value":"edit"}]'>
      <oas-button>offset=16</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

<DemoBlock title="Close on scroll">
  <oas-dropdown id="dd-scroll" close-on-scroll items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Open then scroll the page</oas-button>
  </oas-dropdown>
</DemoBlock>

## Controlled selection

The `value` attribute is controlled: an external value sets the selected item (the dropdown shows no check mark, so a tag echoes the current value in real time); selecting a menu item also updates `value` and fires `oas-select`.

<DemoBlock title="Controlled selection (value attribute)">
  <oas-space size="small">
    <oas-button size="small" onclick="ddValue('edit')">Select "Edit"</oas-button>
    <oas-button size="small" onclick="ddValue('copy')">Select "Copy"</oas-button>
    <oas-button size="small" onclick="ddValue('')">Clear</oas-button>
    <oas-tag id="dd-value-status" type="info">value: -</oas-tag>
  </oas-space>
  <oas-dropdown id="dd-value" onoas-select="ddValueLog(event)" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Select an action</oas-button>
  </oas-dropdown>
</DemoBlock>

## Split button

The `split` attribute turns the dropdown into a split button : a main button plus a separate arrow button. Click the arrow to open the menu; clicking the main button fires `oas-action` (bind your primary action, e.g. save); selecting a menu item still fires `oas-select`.

<DemoBlock title="Split button">
  <oas-dropdown split items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button type="primary">Save & submit</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="Main button action event">
  <oas-space size="small">
    <oas-dropdown id="dd-split" split onoas-action="ddSplitAction(event)" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
      <oas-button>More actions</oas-button>
    </oas-dropdown>
    <oas-tag id="dd-split-result" type="info">Not clicked yet</oas-tag>
  </oas-space>
</DemoBlock>

## Loading menu items

A menu item with `loading: true` enters a loading state: it shows a spinning indicator and is not selectable (click / keyboard / hover are all ignored); update `items` to remove `loading` once the async work finishes. The demo below marks "Save" as loading for ~1.5s after you select it.

<DemoBlock title="Loading menu items">
  <oas-dropdown items='[{"label":"Save","value":"save"},{"label":"Syncing…","value":"syncing","loading":true},{"label":"Delete","value":"delete"}]'>
    <oas-button>Actions</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="Async operation demo">
  <oas-space size="small">
    <oas-dropdown id="dd-async" onoas-select="ddAsyncLog(event)" items='[{"label":"Save","value":"save"},{"label":"Save as","value":"save-as"},{"label":"Delete","value":"delete"}]'>
      <oas-button>Select an action</oas-button>
    </oas-dropdown>
    <oas-tag id="dd-async-status" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.ddLog = (e) => {
    const tag = document.getElementById('dd-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }

  const ctrl = document.getElementById('dd-ctrl')
  const openStatus = document.getElementById('dd-open-status')
  if (ctrl && openStatus) {
    const syncOpen = () => {
      openStatus.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.ddOpen = (open) => {
      if (open) ctrl.setAttribute('open', '')
      else ctrl.removeAttribute('open')
    }
    syncOpen
    // Clicking outside / Esc / selecting makes the component remove open; keep status synced with MutationObserver
    new MutationObserver(syncOpen).observe(ctrl, { attributes: true, attributeFilter: ['open'] })
  }

  const val = document.getElementById('dd-value')
  const valueStatus = document.getElementById('dd-value-status')
  if (val && valueStatus) {
    const syncValue = () => {
      valueStatus.textContent = `value: ${val.getAttribute('value') || '-'}`
    }
    window.ddValue = (v) => {
      if (v) val.setAttribute('value', v)
      else val.removeAttribute('value')
    }
    window.ddValueLog = (e) => {
      val.setAttribute('value', e.detail.value)
    }
    syncValue
    // Selecting a menu item updates value in the component; keep status synced with MutationObserver
    new MutationObserver(syncValue).observe(val, { attributes: true, attributeFilter: ['value'] })
  }

  window.ddSplitAction = (e) => {
    const tag = document.getElementById('dd-split-result')
    if (tag) tag.textContent = `Main button clicked (${e.type})`
  }

  const keepDd = document.getElementById('dd-keep')
  const keepResult = document.getElementById('dd-keep-result')
  if (keepDd && keepResult) {
    keepDd.addEventListener('oas-select', (e) => {
      keepResult.textContent = `Selected: ${e.detail.value} (menu stays open)`
    })
  }

  const openChangeDd = document.getElementById('dd-open-change')
  const openChangeStatus = document.getElementById('dd-open-change-status')
  if (openChangeDd && openChangeStatus) {
    window.ddOpenChange = (e) => {
      openChangeStatus.textContent = `open: ${e.detail.open}`
    }
  }

  const asyncDd = document.getElementById('dd-async')
  const asyncStatus = document.getElementById('dd-async-status')
  if (asyncDd && asyncStatus) {
    window.ddAsyncLog = (e) => {
      asyncStatus.textContent = `Selected: ${e.detail.value}`
      if (e.detail.value !== 'save') return
      // Simulate async work: "Save" spins for ~1.5s, then recovers (menu stays open to observe)
      const mark = (loading) => {
        const items = JSON.parse(asyncDd.getAttribute('items') || '[]')
        const target = items.find((i) => i.value === 'save')
        if (!target) return
        if (loading) {
          target.loading = true
          asyncDd.setAttribute('items', JSON.stringify(items))
          // The component closes the menu right after forwarding the select event;
          // reopen on the next frame so the loading state is visible
          window.setTimeout(() => asyncDd.setAttribute('open', ''), 0)
        } else {
          delete target.loading
          asyncDd.setAttribute('items', JSON.stringify(items))
        }
      }
      mark(true)
      window.setTimeout(() => mark(false), 1500)
    }
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `arrow` | Whether to show the arrow pointing at the trigger (`arrow="false"` hides it; the skeleton is kept) | `string` | `true` |
| `arrow-point-at-center` | Pin the arrow to the panel center (by default the arrow follows the trigger's projection, so it still points at the trigger even after viewport-avoidance shifting) | `boolean` | — |
| `auto-adjust-overflow` | Auto-flip/avoid when there is not enough viewport space (`auto-adjust-overflow="false"` disables it; the panel may overflow the viewport) | `string` | `true` |
| `close-on-scroll` | Close the popover on page scroll (default repositions to follow; true closes on scroll) | `boolean` | — |
| `disabled` | Disable entirely: no trigger response | `boolean` | — |
| `hide-on-click` | Close after selecting an item (default true; false keeps it open for multi-select) | `string` | `true` |
| `hover-delay` | Open delay in ms on hover trigger (default 150) | — | — |
| `hover-hide-delay` | Close delay in ms on hover trigger (default 100) | — | — |
| `items` | Menu items JSON | `string` | `[]` |
| `offset` | Gap in px between popover and trigger (default 8) | — | — |
| `open` | Controlled display (boolean attribute; expands when present) | `boolean` | — |
| `placement` | Popup placement | `string` | `bottom` |
| `split` | Split button mode (boolean attribute): main button + arrow button; arrow opens the menu, main button fires oas-action | `boolean` | — |
| `trigger` | Trigger: `click` (default) / `hover` / `focus`; space-separated for multiple (e.g. `"click hover"`) | `string` | `click` |
| `value` | Current selected value | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-action` | Main button clicked in split mode, `detail: { originalEvent }` |
| `oas-open-change` | Popover open state changed, `detail: { open: boolean }` (including external setAttribute; controlled loop) |
| `oas-select` | An item was selected, `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

Clicking the trigger toggles visibility; clicking outside / pressing Esc / selecting an item closes it. The floating menu is an inner `oas-menu` (`role="menu"`, leaf items `menuitemradio`, items with submenus `menuitem`) supporting cascading submenus and keyboard navigation.
