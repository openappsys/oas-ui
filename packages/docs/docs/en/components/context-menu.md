# ContextMenu

A right-click menu that opens at the mouse position within its wrapped region.

## Basic usage

<DemoBlock title="Trigger on right-click">
  <oas-context-menu items='[{"label":"Copy","value":"copy"},{"label":"Cut","value":"cut"},{"label":"Paste","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click this area to view the menu</div>
  </oas-context-menu>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-context-menu items='[{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete","disabled":true}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click to view (Delete is disabled)</div>
  </oas-context-menu>
</DemoBlock>

## Nested submenu

<DemoBlock title="Nested submenu">
  <oas-context-menu items='[{"label":"New","value":"new","children":[{"label":"File","value":"new-file"},{"label":"Window","value":"new-window"},{"label":"Project","value":"new-project","children":[{"label":"Git repository","value":"repo"},{"label":"Blank","value":"blank"}]}]},{"label":"Open","value":"open","children":[{"label":"Recent files","value":"recent"},{"label":"Browse…","value":"browse"}]},{"label":"Delete","value":"delete"}]'>
    <div style="width: 260px; height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click to view the nested submenu</div>
  </oas-context-menu>
</DemoBlock>

Items with `children` expand cascading submenus on hover/click; selecting a leaf item collapses them and closes the menu.

## Selection event

<DemoBlock title="Selection event">
  <oas-context-menu id="cm-event" onoas-select="cmLog(event)" items='[{"label":"Copy","value":"copy"},{"label":"Paste","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click this area</div>
  </oas-context-menu>
  <oas-tag id="cm-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Programmatic positioning & controlled open

<DemoBlock title="show(x, y) / close()">
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
    <oas-button size="small" onclick="cmShow($event)">Open at (140, 120)</oas-button>
    <oas-button size="small" onclick="cmClose($event)">Close</oas-button>
    <oas-tag id="cm-open-state" type="info">Not open</oas-tag>
  </div>
  <oas-context-menu id="cm-programmatic" items='[{"label":"Copy","value":"copy"},{"label":"Cut","value":"cut"},{"label":"Paste","value":"paste"}]'>
    <div style="width: 260px; height: 100px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click this area, or open at arbitrary coordinates via the button above</div>
  </oas-context-menu>
</DemoBlock>

`show(x, y)` opens the menu at any coordinates (table rows / canvas / text-selection right-click), `close()` closes it programmatically; the `open` attribute controls visibility, and `oas-open-change` reports the open/close state.

## Long-press trigger (mobile)

Mobile devices have no right-click; a long press (500ms by default) opens the menu. `long-press-delay` adjusts the duration in milliseconds. Verify with DevTools device emulation on desktop.

<DemoBlock title="Long-press trigger">
  <oas-context-menu long-press-delay="400" items='[{"label":"Copy","value":"copy"},{"label":"Paste","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Long-press this area on a touch device</div>
  </oas-context-menu>
</DemoBlock>

## Close on scroll

The menu is fixed-positioned; scrolling the page or an inner scroll container closes it by default (so it never detaches from the content). Set `close-on-scroll="false"` to disable.

<DemoBlock title="Close on scroll">
  <oas-context-menu id="cm-scroll" items='[{"label":"Copy","value":"copy"},{"label":"Paste","value":"paste"}]'>
    <div style="width: 260px; height: 100px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click to open, then scroll the area below — the menu closes</div>
  </oas-context-menu>
  <oas-context-menu id="cm-scroll-keep" close-on-scroll="false" items='[{"label":"Refresh","value":"refresh"}]'>
    <div style="width: 260px; height: 60px; margin-top: var(--oas-space-3); border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click me: close-on-scroll="false" stays open on scroll</div>
  </oas-context-menu>
  <div style="width: 260px; height: 120px; overflow: auto; margin-top: var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
    <div style="height: 320px; padding: var(--oas-space-3); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Scrollable content… (scrolling here while the menu is open closes it automatically)</div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.cmLog = (e) => {
    const tag = document.getElementById('cm-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  // Programmatic positioning + controlled open: stopPropagation prevents the outside-click close
  const cm = document.getElementById('cm-programmatic')
  const stateTag = document.getElementById('cm-open-state')
  cm.addEventListener('oas-open-change', (e) => {
    if (stateTag) stateTag.textContent = e.detail.open ? 'Open' : 'Closed'
  })
  window.cmShow = (e) => {
    e?.stopPropagation()
    cm.show(140, 120)
  }
  window.cmClose = (e) => {
    e?.stopPropagation()
    cm.close()
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `close-on-scroll` | Close the menu on page scroll (default true) | `string` | `true` |
| `items` | Menu items JSON | `string` | `[]` |
| `long-press-delay` | Long-press duration in ms for touch trigger (default 500) | `string` | `500` |
| `open` | Controlled open state (writable externally) | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-open-change` | Menu open state changed, `detail: { open: boolean }` |
| `oas-select` | An item was selected, `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

Opens at the mouse position; closes on Esc / outside click / selection; `role="menu"` + `menuitem`.
