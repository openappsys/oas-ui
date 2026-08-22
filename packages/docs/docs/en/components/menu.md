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

## Multi-select (checkbox)

Leaf items with `kind: "checkbox"` render as square checkboxes (`role="menuitemcheckbox"`, distinct from the radio ✓); the checked set is written to `value` as a JSON array, and after a click `oas-select` carries `checked` in its `detail` (the state after this click).

<DemoBlock title="Multi-select (checkbox)">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-cb" style="width: 240px" value='["grid"]' onoas-select="menuCbLog(event)" items='[{"label":"Show grid lines","value":"grid","kind":"checkbox"},{"label":"Auto wrap","value":"wrap","kind":"checkbox"},{"label":"Dark mode","value":"dark","kind":"checkbox"}]'></oas-menu>
    <oas-tag id="menu-cb-result" type="info">Nothing checked</oas-tag>
  </oas-space>
</DemoBlock>

## Destructive items

`danger: true` applies red semantics (`--oas-color-danger`) for destructive actions such as delete or sign out; the red background deepens on hover / keyboard highlight.

<DemoBlock title="Destructive items (danger)">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-danger" style="width: 200px" onoas-select="menuDangerLog(event)" items='[{"label":"Edit","value":"edit","icon":"edit"},{"type":"divider"},{"label":"Delete","value":"delete","icon":"trash","danger":true},{"label":"Sign out","value":"logout","danger":true}]'></oas-menu>
    <oas-tag id="menu-danger-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Link items (href)

`href` renders the item as an `<a>` (anchor semantics: middle-click / right-click in a new window, SEO friendly); `target` / `rel` are passed through as-is. Clicking still fires `oas-select` and writes the selected state. The example links use `target="_blank"` so they open in a new tab and you stay on this page.

<DemoBlock title="Link items (href)">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-href" style="width: 220px" onoas-select="menuHrefLog(event)" items='[{"label":"Components","value":"overview","href":"/components/","icon":"menu","target":"_blank","rel":"noopener"},{"label":"Getting Started","value":"start","href":"/guide/getting-started","icon":"search","target":"_blank","rel":"noopener"},{"label":"Plain item","value":"plain","icon":"star"}]'></oas-menu>
    <oas-tag id="menu-href-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

## Long menu scrolling

`max-height` caps the visible height of the menu (a plain number is treated as `px`); overflowing items scroll inside the menu — handy for long lists.

<DemoBlock title="Long menu scrolling (max-height)">
  <oas-menu style="width: 200px" max-height="200" items='[{"label":"Item 1","value":"p1"},{"label":"Item 2","value":"p2"},{"label":"Item 3","value":"p3"},{"label":"Item 4","value":"p4"},{"label":"Item 5","value":"p5"},{"label":"Item 6","value":"p6"},{"label":"Item 7","value":"p7"},{"label":"Item 8","value":"p8"},{"label":"Item 9","value":"p9"},{"label":"Item 10","value":"p10"},{"label":"Item 11","value":"p11"},{"label":"Item 12","value":"p12"}]'></oas-menu>
</DemoBlock>

## Typeahead

With the menu focused, typing a character jumps to the item whose `label` matches (character buffer with a 500ms idle reset; prefix match first, falls back to substring). The example labels include English so you can type: press `c` to jump to Copy, then `u` (combined `cu`) to jump to Cut.

<DemoBlock title="Typeahead">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-typeahead" style="width: 200px" items='[{"label":"Copy 复制","value":"copy","icon":"copy"},{"label":"Cut 剪切","value":"cut"},{"label":"Paste 粘贴","value":"paste"},{"label":"Undo 撤销","value":"undo"},{"label":"Redo 重做","value":"redo"}]'></oas-menu>
    <oas-tag id="menu-typeahead-hint" type="info">Menu focused — just type (e.g. c → Copy, cu → Cut)</oas-tag>
  </oas-space>
</DemoBlock>

## Inline sidebar navigation

With `mode="inline"` submenus expand in place (no flyout) — the mainstream sidebar navigation form; expanding / collapsing animates the height, and multi-level nesting is supported.

<DemoBlock title="Inline expand">
  <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
    <oas-menu mode="inline" style="width: 240px" items='[{"label":"Workspace","value":"workspace","icon":"menu","children":[{"label":"Overview","value":"overview"},{"label":"Stats","value":"stats"}]},{"label":"Projects","value":"project","icon":"star","children":[{"label":"In progress","value":"active","children":[{"label":"Sprint 1","value":"s1"},{"label":"Sprint 2","value":"s2"}]},{"label":"Done","value":"done"}]},{"label":"Settings","value":"settings","icon":"gear"}]'></oas-menu>
  </div>
</DemoBlock>

## Controlled expansion

`expanded` (JSON array) is a controlled attribute: setting / updating it from outside specifies which submenus are open. Every expand / collapse fires `oas-expand-change` (`detail: { expanded, value, isExpanded }`); in the controlled pattern the host writes the state back to `expanded`.

<DemoBlock title="Controlled expanded">
  <oas-space>
    <oas-button onclick="menuCtrlSet('workspace')">Expand "Workspace"</oas-button>
    <oas-button onclick="menuCtrlSet('message')">Expand "Messages"</oas-button>
    <oas-button onclick="menuCtrlCollapse()">Collapse all</oas-button>
  </oas-space>
  <oas-menu id="menu-ctrl" mode="inline" style="width: 240px; margin-top: 8px" onoas-expand-change="menuCtrlChange(event)" items='[{"label":"Workspace","value":"workspace","children":[{"label":"Overview","value":"overview"}]},{"label":"Messages","value":"message","children":[{"label":"Inbox","value":"inbox"}]},{"label":"Settings","value":"settings"}]'></oas-menu>
  <oas-tag id="menu-ctrl-result" type="info">Not touched yet</oas-tag>
</DemoBlock>

## Keep open on select

Flyout modes (vertical / horizontal) collapse expanded submenus after a leaf is selected by default (expansion is temporary); `close-on-select="false"` keeps them open — handy for picking several items in a row. `mode="inline"` side navigation keeps submenus open by default (users need to see their section); `close-on-select="true"` changes that to collapse. `kind="checkbox"` items never collapse on toggle.

<DemoBlock title="Keep open on select (close-on-select)">
  <oas-space direction="vertical" size="large">
    <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">vertical + close-on-select="false": the submenu stays open after picking a leaf</p>
      <oas-menu id="menu-keep-open" close-on-select="false" style="width: 200px" onoas-select="menuKeepOpenLog(event)" items='[{"label":"Edit","value":"edit","children":[{"label":"Copy","value":"copy"},{"label":"Cut","value":"cut"}]},{"label":"File","value":"file","children":[{"label":"Open","value":"open","children":[{"label":"Recent files","value":"recent"},{"label":"Project","value":"project"}]}]},{"label":"View","value":"view"}]'></oas-menu>
      <oas-tag id="menu-keep-open-result" type="info">Nothing selected</oas-tag>
    </div>
    <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">inline + close-on-select="true": the parent collapses after picking a leaf</p>
      <oas-menu id="menu-inline-close" mode="inline" close-on-select="true" style="width: 240px" onoas-select="menuInlineCloseLog(event)" items='[{"label":"Dashboard","value":"dash","children":[{"label":"Overview","value":"dash-overview"},{"label":"Analytics","value":"dash-analytics"}]},{"label":"Settings","value":"settings"}]'></oas-menu>
      <oas-tag id="menu-inline-close-result" type="info">Nothing selected</oas-tag>
    </div>
  </oas-space>
</DemoBlock>

## Accordion

`accordion` (with `mode="inline"`) makes sibling submenus mutually exclusive: expanding one automatically collapses the other open siblings.

<DemoBlock title="Accordion (inline + accordion)">
  <div style="width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
    <oas-menu mode="inline" accordion style="width: 240px" items='[{"label":"Account","value":"account","children":[{"label":"Profile","value":"profile"},{"label":"Security","value":"security"}]},{"label":"Notifications","value":"notice","children":[{"label":"Inbox","value":"inbox"},{"label":"Email alerts","value":"email"}]},{"label":"Preferences","value":"pref","children":[{"label":"Theme","value":"theme"},{"label":"Language","value":"lang"}]}]'></oas-menu>
  </div>
</DemoBlock>

## Horizontal overflow

With `mode="horizontal"`, when the container is too narrow the overflowing items are automatically folded into a trailing "···" submenu — the nav bar never wraps or truncates.

<DemoBlock title="Horizontal overflow">
  <oas-menu mode="horizontal" style="width: 380px" items='[{"label":"Home","value":"home"},{"label":"Products","value":"products","icon":"menu"},{"label":"Solutions","value":"solutions","icon":"search"},{"label":"Docs","value":"docs"},{"label":"Downloads","value":"download","icon":"download"},{"label":"About","value":"about","icon":"user"},{"label":"Contact","value":"contact"},{"label":"Help","value":"help"}]'></oas-menu>
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
  window.menuCbLog = (e) => {
    const tag = document.getElementById('menu-cb-result')
    const menu = document.getElementById('menu-cb')
    if (tag && menu) {
      let values = []
      try {
        values = JSON.parse(menu.getAttribute('value') || '[]')
      } catch {
        values = []
      }
      tag.textContent = values.length ? `Checked: ${values.join(', ')}` : 'Nothing checked'
    }
  }
  window.menuDangerLog = (e) => {
    const tag = document.getElementById('menu-danger-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menuHrefLog = (e) => {
    const tag = document.getElementById('menu-href-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menuKeepOpenLog = (e) => {
    const tag = document.getElementById('menu-keep-open-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value} (submenu stays open)`
  }
  window.menuInlineCloseLog = (e) => {
    const tag = document.getElementById('menu-inline-close-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value} (parent collapsed)`
  }
  window.menuCtrlSet = (value) => {
    const menu = document.getElementById('menu-ctrl')
    if (menu) menu.setAttribute('expanded', JSON.stringify([value]))
  }
  window.menuCtrlCollapse = () => {
    const menu = document.getElementById('menu-ctrl')
    if (menu) menu.setAttribute('expanded', '[]')
  }
  window.menuCtrlChange = (e) => {
    const { expanded, value, isExpanded } = e.detail
    const menu = document.getElementById('menu-ctrl')
    // Controlled: write the internal expansion state back to the expanded attribute
    if (menu) menu.setAttribute('expanded', JSON.stringify(expanded))
    const tag = document.getElementById('menu-ctrl-result')
    if (tag) {
      tag.textContent = `${isExpanded ? 'Expanded' : 'Collapsed'}: ${value}; now open: ${expanded.length ? expanded.join(', ') : 'none'}`
    }
  }
  // Typeahead: focus the menu so character lookup works immediately
  const ta = document.getElementById('menu-typeahead')
  ta?.shadowRoot?.querySelector('.menu')?.focus({ preventScroll: true })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accordion` | Accordion mutual exclusion (inline mode: only one sibling submenu open at a time) | `boolean` | — |
| `close-on-select` | Whether expanded submenus collapse after a leaf item is selected. Defaults by mode: inline side navigation keeps them open, flyout modes collapse; checkbox items never collapse on toggle | `string` | — |
| `collapsed` | Collapsed state (vertical only): icons only, submenus pop to the right | — | — |
| `expanded` | Controlled expanded set (JSON array string; which submenus are open in inline mode); internally managed when uncontrolled | `string` | — |
| `items` | Menu items JSON (supports disabled / loading, icon, children submenus) | `string` | `[]` |
| `max-height` | Max height of a long menu; scrolls internally beyond it (number gets px appended) | `string` | — |
| `mode` | Layout mode: `vertical` menu / `horizontal` top bar | — | — |
| `theme` | Local theme: `dark` uses dark tokens (independent of the global theme) | — | — |
| `value` | Current selected value. Plain string means global single-select (no group, legacy-compatible); JSON object string (e.g. `{"sort":"name","view":"list"}`) scopes per group id — the `value` of a `type:"group"` item is the group id, picking inside a group only updates that group | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-expand-change` | Submenu expand state changed, `detail: { expanded: string[], value, isExpanded }` (fired both controlled and uncontrolled) |
| `oas-select` | Select an item, `detail: { value, kind? }`. `kind` only appears for action items (`kind: "action"`) as "action"; radio items omit `detail.kind` |

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
