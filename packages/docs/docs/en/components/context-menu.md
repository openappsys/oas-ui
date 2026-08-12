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

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.cmLog = (e) => {
    const tag = document.getElementById('cm-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `items` | Menu items JSON | `string` | `[]` |

### Events

| Event | Description |
| --- | --- |
| `oas-select` | An item was selected, `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

Opens at the mouse position; closes on Esc / outside click / selection; `role="menu"` + `menuitem`.
