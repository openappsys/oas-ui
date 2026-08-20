# Menubar

A desktop-app-style top menu bar (File / Edit / View). Click or hover expands submenus (cascading popups), with arrow key support, `Alt` access keys and a focus trap.

## Multi-group radio (independent checkmarks per group)

The `value` of a `type: "group"` item acts as a **group id**. Leaves inside the same group record their selection independently; when `value` is a JSON object string (`{"group-id":"selected"}`), groups don't interfere — both "Mode" and "Theme" can show a checkmark at once.

<DemoBlock title="Multi-group radio">
  <oas-menubar id="menubar-groups" onoas-select="menubarGroupsLog(event)" value='{"mode":"preview","theme":"dark"}' items='[{"label":"View","value":"view","accessKey":"v","children":[{"type":"group","label":"Mode","value":"mode","children":[{"label":"Edit","value":"edit"},{"label":"Preview","value":"preview"}]},{"type":"group","label":"Theme","value":"theme","children":[{"label":"Light","value":"light"},{"label":"Dark","value":"dark"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-groups-result" type="info">mode: preview, theme: dark</oas-tag>
</DemoBlock>

## Action items (kind: "action")

Leaves with `kind: "action"` render as plain actions (`menuitem`): no checkmark, clicks do **not** write back `value`, and only `oas-select` is dispatched (`detail.kind === "action"`). Fits "Open / Save / About" style items.

<DemoBlock title="Action items (kind: action)">
  <oas-menubar id="menubar-action" onoas-select="menubarActionLog(event)" value="mode" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"Open","value":"open","kind":"action"},{"label":"Save","value":"save","kind":"action"},{"type":"divider"},{"label":"Mode","value":"mode","kind":"radio"},{"label":"Theme","value":"theme","kind":"radio"}]}]'></oas-menubar>
  <oas-tag id="menubar-action-result" type="info">value: mode (actions don't change it)</oas-tag>
</DemoBlock>

## Shortcuts (shortcut)

The `shortcut` field (e.g. `"Ctrl+N"`): renders a key hint on the right, and auto-binds a `document`-level keydown — pressing the combo selects that item (`preventDefault` blocks the browser default).

<DemoBlock title="Shortcuts">
  <oas-menubar id="menubar-shortcut" onoas-select="menubarShortcutLog(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new","shortcut":"Ctrl+N"},{"label":"Open","value":"open","shortcut":"Ctrl+O"},{"type":"divider"},{"label":"Save","value":"save","shortcut":"Ctrl+S","kind":"action"}]}]'></oas-menubar>
  <oas-tag id="menubar-shortcut-result" type="info">Try Ctrl+N / Ctrl+O / Ctrl+S</oas-tag>
</DemoBlock>

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
  window.menubarGroupsLog = (e) => {
    const tag = document.getElementById('menubar-groups-result')
    if (tag) {
      const v = JSON.parse(document.getElementById('menubar-groups')?.getAttribute('value') || '{}')
      tag.textContent = `mode: ${v.mode || '-'}, theme: ${v.theme || '-'}`
    }
  }
  window.menubarActionLog = (e) => {
    const tag = document.getElementById('menubar-action-result')
    if (tag) {
      tag.textContent = e.detail.kind === 'action'
        ? `Action: ${e.detail.value} (value unchanged)`
        : `Selected: ${e.detail.value} (kind: radio)`
    }
  }
  window.menubarShortcutLog = (e) => {
    const tag = document.getElementById('menubar-shortcut-result')
    if (tag) tag.textContent = `Triggered: ${e.detail.value}`
  }
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
| `value` | Selected value. As a plain string it is a single global selection (no-group scenarios, backward compatible); as a JSON object string (e.g. `{"mode":"preview","theme":"dark"}`) selections are recorded per group id — the `value` of a `type:"group"` item acts as the group id | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-select` | An item was selected, `detail: { value, kind? }`. `kind` only appears for action items (`kind: "action"`); radio items omit `detail.kind` |

> **Event detail note**: the `detail` of `oas-select` is a component-internal object (`value`/`kind`) — **not** a native `Event`, so you can't `preventDefault()` on it or read a native `event.target` from it. To reach the native event, use the outer parameter of your listener (e.g. in `addEventListener('oas-select', (e) => ...)`, `e` is a `CustomEvent` and `e.detail` is the component data).

`MenubarItem` fields (inherits `MenuItem`):

| Field       | Description                                                       | Type          |
| ----------- | ----------------------------------------------------------------- | ------------- |
| `label`     | Menu text                                                         | `string`      |
| `value`     | Selection value (declared in the items JSON; after render the host tag carries a `data-value` lowercased attribute for internal lookup — hosts shouldn't rely on it as public API) | `string` |
| `kind`      | Leaf semantics: `radio` (default, checkable, participates in `value`) / `action` (action item, no checkmark, doesn't write back `value` on click) | `string` |
| `shortcut`  | Shortcut hint (e.g. `"Ctrl+N"`); renders as a right-side kbd and auto-binds a `document`-level keydown (selects the item on match, `preventDefault`) | `string` |
| `accessKey` | `Alt` access key (single character); defaults to the first ASCII letter of `label` | `string` |
| `disabled`  | Disabled                                                          | `boolean`     |
| `children`  | Submenu items (nested recursively, cascading to the right)        | `MenubarItem[]` |

Keyboard: at top level `←`/`→` switch, `↓`/`Enter` opens the submenu, `Esc` closes; inside a submenu `↑`/`↓` move, `→` enters a cascading submenu, `←` returns to the parent; `Home`/`End` jump. Pressing `Alt` alone focuses the menu bar, `Alt + access key` opens the matching top-level menu. While a submenu is open, `Tab` cycles among its items (focus trap); `roving tabindex` keeps only the current top-level item tab-reachable.
