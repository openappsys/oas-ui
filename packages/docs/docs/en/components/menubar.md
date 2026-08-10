# Menubar

A desktop-app-style top menu bar (File / Edit / View). Click or hover expands submenus (cascading popups), with arrow key support, `Alt` access keys and a focus trap.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-menubar id="menubar-basic" onoas-select="menubarLog(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"},{"type":"divider"},{"label":"Quit","value":"quit"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"},{"type":"divider"},{"label":"Copy","value":"copy"},{"label":"Paste","value":"paste"}]},{"label":"View","value":"view","accessKey":"v","children":[{"label":"Fullscreen","value":"fullscreen"},{"label":"Zoom","value":"zoom","children":[{"label":"Zoom in","value":"zoom-in"},{"label":"Zoom out","value":"zoom-out"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Disabled items and groups

Submenus support `disabled`, `type: "divider"` separators and `type: "group"` group titles.

<DemoBlock title="Disabled items and groups">
  <oas-menubar onoas-select="menubarLog2(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"type":"group","label":"Recent","children":[{"label":"Project A","value":"proj-a"},{"label":"Project B","value":"proj-b"}]},{"type":"divider"},{"label":"Save","value":"save"},{"label":"Save as","value":"save-as","disabled":true}]}]'></oas-menubar>
  <oas-tag id="menubar-result-2" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Controlled selection

The `value` attribute is controlled (it is in `observedAttributes`): an external `setAttribute('value', ...)` takes effect immediately and syncs the selected item (check/highlight) to the corresponding leaf item; internal clicks also write back to `value` (uncontrolled channel), and the host can listen to `oas-select` to take over.

<DemoBlock title="Controlled selection (value attribute)">
  <oas-space size="small">
    <oas-button size="small" onclick="mbSet('new')">Select "New"</oas-button>
    <oas-button size="small" onclick="mbSet('undo')">Select "Undo"</oas-button>
    <oas-button size="small" onclick="mbSet('')">Clear selection</oas-button>
    <oas-tag id="mb-value-status" type="info">value: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-value" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"},{"type":"divider"},{"label":"Quit","value":"quit"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menubarLog = (e) => {
    const tag = document.getElementById('menubar-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menubarLog2 = (e) => {
    const tag = document.getElementById('menubar-result-2')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }

  const mb = document.getElementById('mb-value')
  const status = document.getElementById('mb-value-status')
  if (mb && status) {
    const sync = () => {
      status.textContent = `value: ${mb.getAttribute('value') || '-'}`
    }
    window.mbSet = (v) => {
      // value is in observedAttributes: setAttribute triggers an immediate re-render
      mb.setAttribute('value', v)
    }
    // Controlled takeover: clicks inside the menu already write back to value; the host can also listen to oas-select
    mb.addEventListener('oas-select', (e) => mbSet(e.detail.value))
    sync()
    new MutationObserver(sync).observe(mb, { attributes: true, attributeFilter: ['value'] })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `items` | Top-level menu items JSON (with submenu `children`) | `string` | `[]` |
| `value` | Controlled selected value (external change syncs the check immediately; internal selection writes back) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-select` | An item was selected, `detail: { value }` |

`MenubarItem` fields (inherits `MenuItem`):

| Field       | Description                                                       | Type          |
| ----------- | ----------------------------------------------------------------- | ------------- |
| `label`     | Menu text                                                         | `string`      |
| `value`     | Selection value                                                   | `string`      |
| `accessKey` | `Alt` access key (single character); defaults to the first ASCII letter of `label` | `string` |
| `disabled`  | Disabled                                                          | `boolean`     |
| `children`  | Submenu items (nested recursively, cascading to the right)        | `MenubarItem[]` |

Keyboard: at top level `←`/`→` switch, `↓`/`Enter` opens the submenu, `Esc` closes; inside a submenu `↑`/`↓` move, `→` enters a cascading submenu, `←` returns to the parent; `Home`/`End` jump. Pressing `Alt` alone focuses the menu bar, `Alt + access key` opens the matching top-level menu. While a submenu is open, `Tab` cycles among its items (focus trap); `roving tabindex` keeps only the current top-level item tab-reachable.
