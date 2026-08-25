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

## Declarative child-element channel

Besides the `items` JSON, you can declare the menu with `<oas-context-menu-item>` / `<oas-context-menu-group>` / `<oas-context-menu-divider>` child elements (the `items` attribute **wins when set explicitly**; otherwise children are parsed and converge to the same rendering path). Default slot text becomes the label; attributes map to the `items` fields: `value` / `disabled` / `loading` / `icon` / `kind` / `danger` / `href` / `target` / `rel`. Nested elements inside an `<oas-context-menu-item>` become cascading submenus recursively; an `<oas-context-menu-group>`'s `label` is the group title (`value` can act as a radio-group id) and its children flatten to the same level. Adding/removing children or changing their attributes/text re-renders automatically (MutationObserver).

<DemoBlock title="Declarative children (group / divider / nested / danger / href)">
  <oas-context-menu id="cm-decl" onoas-select="cmDeclLog(event)">
    <div style="width: 260px; height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click here to see the declarative menu</div>
    <oas-context-menu-group label="Clipboard">
      <oas-context-menu-item value="copy">Copy</oas-context-menu-item>
      <oas-context-menu-item value="paste">Paste</oas-context-menu-item>
    </oas-context-menu-group>
    <oas-context-menu-divider></oas-context-menu-divider>
    <oas-context-menu-item value="new">New
      <oas-context-menu-item value="new-file">File</oas-context-menu-item>
      <oas-context-menu-item value="new-folder">Folder</oas-context-menu-item>
    </oas-context-menu-item>
    <oas-context-menu-item value="docs" href="/components/" target="_blank" rel="noopener">Component docs</oas-context-menu-item>
    <oas-context-menu-divider></oas-context-menu-divider>
    <oas-context-menu-item value="delete" danger>Delete</oas-context-menu-item>
  </oas-context-menu>
  <oas-tag id="cm-decl-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

<DemoBlock title="Dynamic add/remove (MutationObserver auto refresh)">
  <oas-space size="small" style="margin-bottom: 8px">
    <oas-button size="small" onclick="cmDeclAdd()">Append an item</oas-button>
  </oas-space>
  <oas-context-menu id="cm-decl-dyn">
    <div style="width: 260px; height: 100px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">Right-click me; click the button above to append an item</div>
    <oas-context-menu-item value="copy">Copy</oas-context-menu-item>
    <oas-context-menu-item value="paste">Paste</oas-context-menu-item>
  </oas-context-menu>
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

  // Declarative child-element channel: show selection + append an item at runtime (MutationObserver re-renders)
  window.cmDeclLog = (e) => {
    const tag = document.getElementById('cm-decl-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value} (declarative child channel)`
  }
  const declDyn = document.getElementById('cm-decl-dyn')
  if (declDyn) {
    window.cmDeclAdd = () => {
      const n = declDyn.querySelectorAll('oas-context-menu-item').length
      const item = document.createElement('oas-context-menu-item')
      item.setAttribute('value', `extra-${n}`)
      item.textContent = `Dynamic item ${n}`
      declDyn.appendChild(item)
    }
  }
})
</script>

## API

### oas-context-menu

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `close-on-scroll` | Close the menu on page scroll (default true) | `string` | `true` |
| `items` | Menu items JSON | `string` | `[]` |
| `long-press-delay` | Long-press duration in ms for touch trigger (default 500) | `string` | `500` |
| `open` | Controlled open state (writable externally) | `boolean` | — |

| Event | Description |
| --- | --- |
| `oas-open-change` | Menu open state changed, `detail: { open: boolean }` |
| `oas-select` | An item was selected, `detail: { value }` |

| Name | Description |
| --- | --- |
| default | — |

### oas-context-menu-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `danger` | Destructive item: red semantics (delete/exit etc.) | — | — |
| `disabled` | Disable this item | — | — |
| `href` | Link address: with href the item renders as a native `<a>` (real navigation + still emits `oas-select`) | — | — |
| `icon` | Leading icon (icon name from the `@oas-ui/icons` registry) | — | — |
| `kind` | Leaf semantics: `radio` (default, selectable) / `action` (no checked state, does not write back value) / `checkbox` (multi-select, value is the checked-set array) | — | — |
| `loading` | Loading: renders a spinner and blocks clicks; recovers when data-driven | — | — |
| `rel` | Link rel (with href) | — | — |
| `target` | Link target (with href) | — | — |
| `value` | Selected value (data-carrier field of the declarative child-element channel) | — | — |

| Name | Description |
| --- | --- |
| default | Context-menu item label content (default slot text); direct child `<oas-context-menu-item>` elements recursively become the submenu `children` |

### oas-context-menu-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Group title (small, secondary color, not clickable) | — | — |
| `value` | Radio-group id (selecting inside the group only updates that group's value) | — | — |

| Name | Description |
| --- | --- |
| default | Group items: child `<oas-context-menu-item>` elements flatten to the same level |

### oas-context-menu-divider

| Name | Description |
| --- | --- |
| default | Divider data carrier (no attributes; the host parses it as `type: "divider"`) |

Opens at the mouse position; closes on Esc / outside click / selection; `role="menu"` + `menuitem`.
