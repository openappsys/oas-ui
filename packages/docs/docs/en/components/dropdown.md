# Dropdown

A click-triggered menu that opens anchored to the trigger element.

## Basic usage

<DemoBlock title="Trigger on click">
  <oas-dropdown items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]' placement="bottom">
    <oas-button type="primary">Actions</oas-button>
  </oas-dropdown>
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

## Selection event

<DemoBlock title="Selection event">
  <oas-dropdown id="dd-event" onoas-select="ddLog(event)" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Select an action</oas-button>
  </oas-dropdown>
  <oas-tag id="dd-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to show/hide the menu (clicking outside / pressing Esc / selecting an item still closes it).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); ddOpen(true)">Open</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); ddOpen(false)">Close</oas-button>
    <oas-tag id="dd-open-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-dropdown id="dd-ctrl" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete"}]'>
    <oas-button>Trigger element</oas-button>
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
    syncOpen()
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
    syncValue()
    // Selecting a menu item updates value in the component; keep status synced with MutationObserver
    new MutationObserver(syncValue).observe(val, { attributes: true, attributeFilter: ['value'] })
  }
})
</script>

## API

### Attributes

| Attribute   | Description                                                  | Type        | Default  |
| ----------- | ------------------------------------------------------------ | ----------- | -------- |
| `items`     | Menu items JSON                                              | `string`    | `[]`     |
| `open`      | Controlled display (boolean attribute; expands when present) | `boolean`   | —        |
| `placement` | Popup placement                                              | `Placement` | `bottom` |
| `value`     | Current selected value                                       | `string`    | —        |

### Events

| Event        | Description                               |
| ------------ | ----------------------------------------- |
| `oas-select` | An item was selected, `detail: { value }` |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

Clicking the trigger toggles visibility; clicking outside / pressing Esc / selecting an item closes it. The floating menu is an inner `oas-menu` (`role="menu"`, leaf items `menuitemradio`, items with submenus `menuitem`) supporting cascading submenus and keyboard navigation.
