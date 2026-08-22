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

## Checkbox items and keep-open (checkbox + close-on-select)

Leaves with `kind: "checkbox"` toggle a multi-select checked set (`value` is a JSON array); toggling a checkbox does **not** close the submenu (continuous toggling). `close-on-select="false"` keeps the submenu open even after radio/action selections.

<DemoBlock title="Checkbox + close-on-select">
  <oas-menubar id="menubar-checkbox" onoas-select="menubarCheckboxLog(event)" close-on-select="false" value='["grid"]' items='[{"label":"View","value":"view","accessKey":"v","children":[{"type":"group","label":"Show","children":[{"label":"Gridlines","value":"grid","kind":"checkbox"},{"label":"Ruler","value":"ruler","kind":"checkbox"}]},{"type":"divider"},{"label":"Fullscreen","value":"fullscreen"}]}]'></oas-menubar>
  <oas-tag id="menubar-checkbox-result" type="info">Checked: ["grid"]</oas-tag>
</DemoBlock>

## Controlled open (open)

The `open` attribute holds the value of the currently open top-level menu (`open=""` closes all). Controlled attribute: an external `setAttribute('open', ...)` opens/switches/closes immediately; internal changes write `open` back and dispatch `oas-open-change` (`detail: { value, open }`) for the host to take over.

<DemoBlock title="Controlled open (open attribute)">
  <oas-space size="small">
    <oas-button size="small" onclick="mbOpen('file')">Open "File"</oas-button>
    <oas-button size="small" onclick="mbOpen('edit')">Open "Edit"</oas-button>
    <oas-button size="small" onclick="mbOpen('')">Close</oas-button>
    <oas-tag id="mb-open-status" type="info">open: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-open" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## Trigger mode and arrow-key wrap (trigger / loop)

`trigger="click"` (default): a top-level menu **opens on click first**; once one is open, hovering another top-level item switches to it (desktop convention). `trigger="hover"` opens directly on hover. `loop="false"` disables wrap-around at the edges.

<DemoBlock title="Hover opens directly (trigger)">
  <oas-menubar onoas-select="menubarLog2(event)" trigger="hover" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag id="menubar-trigger-result" type="info">hover opens directly (no click-first)</oas-tag>
</DemoBlock>

<DemoBlock title="No wrap-around (loop)">
  <oas-menubar loop="false" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]},{"label":"View","value":"view","accessKey":"v","children":[{"label":"Fullscreen","value":"fullscreen"}]}]'></oas-menubar>
  <oas-tag type="info">← stops at the first, → stops at the last</oas-tag>
</DemoBlock>

## Disabled bar (disabled)

`disabled` disables the whole bar: top-level/sub-item clicks, keyboard navigation, shortcut hotkeys and Alt access keys are all blocked.

<DemoBlock title="Disabled bar (disabled)">
  <oas-menubar disabled items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag type="info">The whole bar is inert</oas-tag>
</DemoBlock>

## Popup positioning and arrow (side / align / offset / show-arrow)

`side` controls the first-level popup side (default `bottom`), `align` its alignment (default `start`), `offset` the gap to the trigger (px); `show-arrow` draws a visual arrow pointing at the trigger.

<DemoBlock title="Popup positioning + arrow (side / align / offset / show-arrow)">
  <oas-menubar side="top" align="end" offset="8" show-arrow items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag type="info">side=top / align=end / offset=8 / show-arrow</oas-tag>
</DemoBlock>

## Vertical orientation (orientation)

`orientation="vertical"`: the bar stacks vertically, first-level popups default to the right; ↑/↓ move between top-level items, → opens a submenu.

<DemoBlock title="Vertical (orientation)">
  <oas-menubar orientation="vertical" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"},{"label":"Redo","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

## Mobile hamburger folding (breakpoint)

`breakpoint="600"`: when the viewport is ≤ 600px wide the bar folds into a hamburger button + popup menu (narrow-width folding); widen the window to restore the full bar.

<DemoBlock title="Mobile hamburger (breakpoint)">
  <oas-menubar id="menubar-mobile" breakpoint="600" onoas-select="menubarMobileLog(event)" items='[{"label":"File","value":"file","accessKey":"f","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","accessKey":"e","children":[{"label":"Undo","value":"undo"}]}]'></oas-menubar>
  <oas-tag id="menubar-mobile-result" type="info">Shrink the window (≤600px) to try the hamburger</oas-tag>
</DemoBlock>

## Icons (icon)

Both top-level items and sub-items accept an `icon` field (icon-set name); icons follow the text color.

<DemoBlock title="Icons (icon)">
  <oas-menubar items='[{"label":"File","value":"file","icon":"gear","children":[{"label":"New","value":"new","icon":"plus"},{"label":"Open","value":"open","icon":"search"},{"label":"Save","value":"save","icon":"download"}]},{"label":"Account","value":"account","icon":"user","children":[{"label":"Profile","value":"profile","icon":"user"},{"label":"Log out","value":"logout","icon":"close"}]}]'></oas-menubar>
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

  window.menubarCheckboxLog = (e) => {
    const tag = document.getElementById('menubar-checkbox-result')
    const mb = document.getElementById('menubar-checkbox')
    if (tag && mb) {
      const v = JSON.parse(mb.getAttribute('value') || '[]')
      tag.textContent = `Checked: ${JSON.stringify(v)} (checkbox keeps open)`
    }
  }

  window.menubarMobileLog = (e) => {
    const tag = document.getElementById('menubar-mobile-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value} (hamburger mode)`
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

  const mbOpenEl = document.getElementById('mb-open')
  const mbOpenStatus = document.getElementById('mb-open-status')
  if (mbOpenEl && mbOpenStatus) {
    const syncOpen = () => {
      mbOpenStatus.textContent = `open: ${mbOpenEl.getAttribute('open') || '(closed)'}`
    }
    window.mbOpen = (v) => {
      // open is in observedAttributes: setAttribute triggers an immediate open/close
      mbOpenEl.setAttribute('open', v)
    }
    // Internal changes (clicking a top-level item / hover switch) also write back open + dispatch oas-open-change
    mbOpenEl.addEventListener('oas-open-change', () => syncOpen())
    syncOpen()
    new MutationObserver(syncOpen).observe(mbOpenEl, { attributes: true, attributeFilter: ['open'] })
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | First-level popup alignment: `start` (default) / `center` / `end`; with `side` top/bottom it aligns on the horizontal axis, with left/right on the vertical axis | `string` | — |
| `breakpoint` | Mobile breakpoint (px, e.g. `600`): when the viewport width is ≤ the breakpoint the bar collapses into a hamburger button + popup menu (narrow-width folding) | `string` | — |
| `close-on-select` | Whether selecting a leaf closes the open submenu, default `true` (desktop menubar convention); `close-on-select="false"` keeps it open (multi-select scenario); `kind:"checkbox"` items never close on toggle | `string` | — |
| `disabled` | Disable the whole bar: top-level/sub-item clicks, keyboard navigation, shortcut hotkeys and Alt access keys are all blocked; visually desaturated | `boolean` | — |
| `items` | Top-level menu items JSON (with submenu `children`) | `string` | `[]` |
| `loop` | Arrow-key wrap-around toggle, default `true` (loops at edges); explicit `loop="false"` stops at the edges | `string` | — |
| `offset` | Gap between the first-level popup and its trigger (px, default 4) | `string` | — |
| `open` | Value of the currently open top-level menu (`open=""` closes all). Controlled attribute (in `observedAttributes`): an external `setAttribute('open', ...)` opens/switches/closes immediately; internal click/hover/keyboard changes write it back and dispatch `oas-open-change`, letting the host take over | `string` | — |
| `orientation` | Arrangement direction: `horizontal` (default) / `vertical` (bar stacks vertically, first-level popups default to the right, arrow keys move top-level items up/down) | — | — |
| `show-arrow` | Show a visual arrow on the popup pointing at the trigger | — | — |
| `side` | First-level popup side: `bottom` (default horizontal) / `top` / `left` / `right` (default vertical); cascading submenus are unaffected | `string` | — |
| `trigger` | Top-level menu trigger: `click` (default, click to open first, then hover switches — desktop convention) / `hover` (hover opens directly) | — | — |
| `value` | Selected value. As a plain string it is a single global selection (no-group scenarios, backward compatible); as a JSON object string (e.g. `{"mode":"preview","theme":"dark"}`) selections are recorded per group id — the `value` of a `type:"group"` item acts as the group id; as a JSON array string (e.g. `["grid","wrap"]`) it is the checkbox checked-set (`kind:"checkbox"` items, multi-select) | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-open-change` | The open top-level menu changed, `detail: { value, open }` (`value` = currently open top-level menu value, `open` = whether anything is open). Fired both on controlled `setAttribute('open')` and internal click/hover/keyboard changes (not on the first frame) |
| `oas-select` | An item was selected, `detail: { value, kind?, checked? }`. `kind` only appears for action items (`kind: "action"`); checkbox items carry `checked` (new checked state); radio items omit `detail.kind` |

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
