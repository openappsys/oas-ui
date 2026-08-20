# Menu

A standalone menu list with selection state and keyboard navigation.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-menu style="width: 200px" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'></oas-menu>
</DemoBlock>

## Default selection

<DemoBlock title="Default selection (value echo)">
  <oas-menu style="width: 200px" value="delete" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'></oas-menu>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-menu style="width: 200px" items='[{"label":"Edit","value":"edit"},{"label":"Delete","value":"delete","disabled":true},{"label":"Copy","value":"copy"}]'></oas-menu>
</DemoBlock>

## Nested submenu

Menu items with `children` show an expand arrow (›); clicking or hovering expands the submenu, which is rendered indented; press `ArrowRight` to enter and `ArrowLeft` to go back.

<DemoBlock title="Nested submenu">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-nested" style="width: 200px" onoas-select="menuNestedLog(event)" items='[{"label":"Edit","value":"edit","children":[{"label":"Copy","value":"copy"},{"label":"Cut","value":"cut"}]},{"label":"File","value":"file","children":[{"label":"New","value":"new","children":[{"label":"File","value":"new-file"},{"label":"Window","value":"new-window"}]},{"label":"Open","value":"open","children":[{"label":"Recent files","value":"recent"},{"label":"Project","value":"project"}]}]},{"label":"View","value":"view"}]'></oas-menu>
    <oas-tag id="menu-nested-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Horizontal navigation

With `mode="horizontal"` the items are laid out in a row as a top navigation bar; first-level submenus pop down while second-level and deeper submenus still pop to the right.

<DemoBlock title="Horizontal navigation (top bar style)">
  <oas-menu mode="horizontal" style="width: 100%" onoas-select="menuHLog(event)" items='[{"label":"Home","value":"home"},{"label":"Products","value":"products","children":[{"label":"Components","value":"components","children":[{"label":"Basic","value":"basic"},{"label":"Data","value":"data"}]},{"label":"Docs","value":"docs"},{"label":"Download","value":"download"}]},{"label":"About","value":"about"},{"label":"Contact","value":"contact"}]'></oas-menu>
  <oas-tag id="menu-h-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Collapsed state

`collapsed` (vertical only) narrows the menu to show only icons; hovering or clicking an icon item pops its submenu out to the right, still a full menu.

<DemoBlock title="Collapsed (icons only)">
  <oas-menu collapsed onoas-select="menuCLog(event)" items='[{"label":"Home","value":"home","icon":"menu"},{"label":"Messages","value":"message","icon":"mail","children":[{"label":"Inbox","value":"inbox"},{"label":"Sent","value":"sent"}]},{"label":"User","value":"user","icon":"user"},{"label":"Settings","value":"settings","icon":"gear","children":[{"label":"Profile","value":"profile"},{"label":"Security","value":"security"}]}]'></oas-menu>
  <oas-tag id="menu-c-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Groups

Menu items with `type: "group"` render as a section with a group title (small text, secondary color, not clickable); the group's children are laid out flat on the same level and may mix in submenus and dividers.

<DemoBlock title="Groups">
  <oas-menu style="width: 200px" items='[{"type":"group","label":"Navigation","children":[{"label":"Home","value":"home"},{"label":"About","value":"about"}]},{"type":"group","label":"Actions","children":[{"label":"New","value":"new"},{"label":"Settings","value":"settings","children":[{"label":"Profile","value":"profile"},{"label":"Security","value":"security"}]}]}]'></oas-menu>
</DemoBlock>

## With icons

`icon` uses icon names from `@oas-ui/icons` (iconRegistry) and renders an inline SVG to the left of the text.

<DemoBlock title="With icons">
  <oas-menu style="width: 200px" items='[{"label":"Search","value":"search","icon":"search"},{"label":"User","value":"user","icon":"user"},{"label":"Settings","value":"settings","icon":"gear"},{"label":"Download","value":"download","icon":"download"}]'></oas-menu>
</DemoBlock>

## Divider

`type: "divider"` renders a thin divider line that is not clickable and not part of keyboard navigation.

<DemoBlock title="Divider">
  <oas-menu style="width: 200px" items='[{"label":"Edit","value":"edit","icon":"edit"},{"label":"Copy","value":"copy","icon":"copy"},{"type":"divider"},{"label":"Delete","value":"delete","icon":"trash"}]'></oas-menu>
</DemoBlock>

## Dark menu

`theme="dark"` applies dark tokens locally (dark background + light text) to the menu, independent of the global theme; when unset, it follows the global theme.

<DemoBlock title="Dark menu">
  <oas-space style="padding: 16px; border-radius: 8px; background: var(--oas-color-bg-hover)">
    <oas-menu theme="dark" style="width: 200px" items='[{"label":"Edit","value":"edit","icon":"edit","children":[{"label":"Copy","value":"copy","icon":"copy"},{"label":"Cut","value":"cut"}]},{"label":"Settings","value":"settings","icon":"gear"},{"type":"divider"},{"label":"Delete","value":"delete","icon":"trash"}]'></oas-menu>
  </oas-space>
</DemoBlock>

## Selection event

<DemoBlock title="Selection event">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-event" style="width: 200px" onoas-select="menuLog(event)" items='[{"label":"Edit","value":"edit"},{"label":"Copy","value":"copy"},{"label":"Delete","value":"delete"}]'></oas-menu>
    <oas-tag id="menu-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menuLog = (e) => {
    const tag = document.getElementById('menu-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menuNestedLog = (e) => {
    const tag = document.getElementById('menu-nested-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menuHLog = (e) => {
    const tag = document.getElementById('menu-h-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menuCLog = (e) => {
    const tag = document.getElementById('menu-c-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `collapsed` | Collapsed state (vertical only): icons only, submenus pop to the right | — | — |
| `items` | Menu items JSON (supports disabled / loading, icon, children submenus) | `string` | `[]` |
| `mode` | Layout mode: `vertical` menu / `horizontal` top bar | — | — |
| `theme` | Local theme: `dark` uses dark tokens (independent of the global theme) | — | — |
| `value` | Current selected value | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-select` | An item was selected, `detail: { value }` |

`MenuItem` fields:

| Field      | Description                                                        | Type         |
| ---------- | ------------------------------------------------------------------ | ------------ |
| `label`    | Menu item text                                                     | `string`     |
| `value`    | Selection value                                                    | `string`     |
| `type`     | Item type: `item` (default) / `group` (group title) / `divider`    | `string`     |
| `kind`     | Leaf semantics: `radio` (default, checkable) / `action` (action item, no checkmark, doesn't write back `value` on click) | `string` |
| `icon`     | Icon name (a key of `@oas-ui/icons` iconRegistry)                | `string`     |
| `disabled` | Disables the item                                                  | `boolean`    |
| `children` | Submenu items array with the same shape as the parent (nested recursively) | `MenuItem[]` |

`children` is an optional submenu items array; items with `children` expand their submenu on click/hover, and the selected state only lands on leaf items. `group` children are laid out flat on the same level; group titles are not clickable and skipped in keyboard navigation; `divider` items are not clickable and skipped in keyboard navigation.

Keyboard navigation: arrow keys move (auto-skipping group titles and dividers), Enter selects (items with submenus enter via Enter/ArrowRight), Home / End jump, ArrowLeft returns to the parent; `role="menu"` + `menuitemradio` (submenu parents are `menuitem`), the selected item shows a check mark.
