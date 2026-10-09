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

`icon` uses icon names from `@oas-ui/icons` (built-in icon set) and renders an inline SVG to the left of the text.

<DemoBlock title="With icons">
  <oas-menu style="width: 200px" items='[{"label":"Search","value":"search","icon":"search"},{"label":"User","value":"user","icon":"user"},{"label":"Settings","value":"settings","icon":"gear"},{"label":"Download","value":"download","icon":"download"}]'></oas-menu>
</DemoBlock>

## Icon color (iconColor)

The `iconColor` field fixes the icon color (overriding the selected/disabled default); any CSS color or token works, and it defaults to `currentColor` following the text color. The declarative child channel uses the `icon-color` attribute.

<DemoBlock title="Icon color (iconColor / icon-color)">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-iconcolor" style="width: 220px" items='[{"label":"Search","value":"search","icon":"search","iconColor":"var(--oas-color-primary)"},{"label":"User","value":"user","icon":"user","iconColor":"#06b6d4"},{"label":"Organization","value":"org","icon":"organization","iconColor":"#8b5cf6"},{"label":"Settings","value":"settings","icon":"gear","iconColor":"var(--oas-color-warning)"}]'></oas-menu>
    <oas-menu id="menu-iconcolor-decl" style="width: 220px">
      <oas-menu-item value="download" icon="download" icon-color="var(--oas-color-success)">Download</oas-menu-item>
      <oas-menu-item value="delete" icon="trash" icon-color="var(--oas-color-danger)">Delete</oas-menu-item>
      <oas-menu-item value="plain" icon="star">No icon-color</oas-menu-item>
    </oas-menu>
  </oas-space>
</DemoBlock>

## Divider

`type: "divider"` renders a thin divider line that is not clickable and not part of keyboard navigation.

<DemoBlock title="Divider">
  <oas-menu style="width: 200px" items='[{"label":"Edit","value":"edit","icon":"edit"},{"label":"Copy","value":"copy","icon":"copy"},{"type":"divider"},{"label":"Delete","value":"delete","icon":"trash"}]'></oas-menu>
</DemoBlock>

## Declarative child channel

Besides the `items` JSON, you can write items declaratively with `<oas-menu-item>` / `<oas-menu-group>` / `<oas-menu-divider>` (the `items` attribute **wins when explicitly set**; otherwise child elements are parsed and converge to the same render path). The default slot text is the label; attributes map to the `items` fields: `value` / `disabled` / `loading` / `icon` / `kind` / `danger` / `href` / `target` / `rel`. Nesting child elements directly inside `<oas-menu-item>` recursively becomes a submenu; `<oas-menu-group>` uses its `label` attribute as the group title (`value` can serve as a radio group id) and flattens its children to the same level. Child additions/removals, attribute and text changes re-render automatically (MutationObserver).

<DemoBlock title="Declarative child channel (group / divider / nesting / checkbox / danger / href)">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-decl" style="width: 240px" value='["grid"]' onoas-select="menuDeclLog(event)">
      <oas-menu-group label="Navigation">
        <oas-menu-item value="home">Home</oas-menu-item>
        <oas-menu-item value="docs" href="/components/" target="_blank" rel="noopener">Component docs</oas-menu-item>
      </oas-menu-group>
      <oas-menu-divider></oas-menu-divider>
      <oas-menu-item value="edit">Edit
        <oas-menu-item value="copy">Copy</oas-menu-item>
        <oas-menu-item value="cut">Cut</oas-menu-item>
      </oas-menu-item>
      <oas-menu-item value="grid" kind="checkbox">Show gridlines</oas-menu-item>
      <oas-menu-item value="wrap" kind="checkbox">Word wrap</oas-menu-item>
      <oas-menu-divider></oas-menu-divider>
      <oas-menu-item value="delete" danger>Delete</oas-menu-item>
    </oas-menu>
    <oas-tag id="menu-decl-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="Dynamic add/remove (MutationObserver auto-refresh)">
  <oas-space direction="vertical" size="small">
    <oas-button size="small" onclick="menuDeclAdd()">Append an item</oas-button>
    <oas-menu id="menu-decl-dyn" style="width: 200px">
      <oas-menu-item value="home">Home</oas-menu-item>
      <oas-menu-item value="settings">Settings</oas-menu-item>
    </oas-menu>
  </oas-space>
</DemoBlock>

### Leading media (slot="leading")

Menu items support a leading media slot: put a `<template slot="leading">` (or a direct child with `slot="leading"`) inside `<oas-menu-item>`; the content renders before the label and takes precedence over the `icon` attribute (when both are given the icon is not rendered); in the `loading` state the spinner replaces the leading media, and in the collapsed state the media converges like icons (kept visible with zeroed spacing — hiding it would leave a hoverable blank item). Suited to avatars, color chips, and any rich leading content (`items` JSON does not support it — declarative children only).

<DemoBlock title="Leading avatars (avatar example)">
  <oas-menu style="width: 240px" value="lin">
    <oas-menu-item value="lin">Lin Xiaoyu<template slot="leading"><oas-avatar size="small">Lin</oas-avatar></template></oas-menu-item>
    <oas-menu-item value="chen">Chen Yining<template slot="leading"><oas-avatar size="small" color="success">Chen</oas-avatar></template></oas-menu-item>
    <oas-menu-item value="zhao">Zhao Qiming<template slot="leading"><oas-avatar size="small" color="warning">Zhao</oas-avatar></template></oas-menu-item>
    <oas-menu-divider></oas-menu-divider>
    <oas-menu-item value="logout" icon="close">Sign out</oas-menu-item>
  </oas-menu>
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

Flyout modes (vertical / horizontal) collapse expanded submenus after a leaf is selected by default (expansion is temporary); `close-on-select="false"` keeps them open — handy for picking several items in a row. `mode="inline"` side navigation keeps submenus open by default (users need to see their section); `close-on-select="true"` changes that to collapse. `kind="checkbox"` items never collapse on toggle. `close-on-select` is a boolean attribute: presence means `true` (including an empty value such as `close-on-select=""`); only an explicit `"false"` disables it — the mode-based defaults above apply only when the attribute is absent.

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

## Hover to Expand Submenus

`open-on-hover` gives parent items in vertical / inline modes hover expansion: hovering for ~150ms opens the submenu, moving away closes it after ~300ms (moving back within the grace period cancels the close); the click path is unchanged (items still toggle on click). The `mode="horizontal"` top nav and the `collapsed` flyout already open instantly on hover and are unaffected by this attribute.

<DemoBlock title="open-on-hover (vertical, delayed hover expansion)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-6); flex-wrap: wrap">
    <div style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">vertical: hover "Edit" for ~150ms to open; it closes ~300ms after the pointer leaves</p>
      <oas-menu id="menu-hover-v" open-on-hover style="width: 200px" items='[{"label":"Edit","value":"edit","children":[{"label":"Copy","value":"copy"},{"label":"Cut","value":"cut"}]},{"label":"File","value":"file","children":[{"label":"Open","value":"open"},{"label":"Save","value":"save"}]},{"label":"View","value":"view"}]'></oas-menu>
    </div>
    <div style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">inline: hover also expands (multiple branches may stay open); clicking still toggles</p>
      <oas-menu id="menu-hover-i" mode="inline" open-on-hover style="width: 240px" items='[{"label":"Workspace","value":"workspace","children":[{"label":"Overview","value":"overview"},{"label":"Stats","value":"stats"}]},{"label":"Projects","value":"project","children":[{"label":"Active","value":"active"},{"label":"Done","value":"done"}]}]'></oas-menu>
    </div>
  </div>
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
  window.menuDeclLog = (e) => {
    const tag = document.getElementById('menu-decl-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  }
  window.menuDeclAdd = () => {
    const menu = document.getElementById('menu-decl-dyn')
    if (!menu) return
    const n = menu.children.length + 1
    const item = document.createElement('oas-menu-item')
    item.setAttribute('value', `dyn-${n}`)
    item.textContent = `Dynamic item ${n}`
    menu.appendChild(item)
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

  // open-on-hover demo: leaf-selection feedback (expand by hover, then click a leaf to verify the full path)
  const hoverV = document.getElementById('menu-hover-v')
  if (hoverV) {
    const tag = document.createElement('oas-tag')
    tag.setAttribute('type', 'info')
    tag.textContent = 'Nothing selected yet'
    hoverV.parentElement?.appendChild(tag)
    hoverV.addEventListener('oas-select', (e) => {
      tag.textContent = `Selected: ${e.detail.value}`
    })
  }
  const hoverI = document.getElementById('menu-hover-i')
  if (hoverI) {
    const tag = document.createElement('oas-tag')
    tag.setAttribute('type', 'info')
    tag.textContent = 'Nothing selected yet'
    hoverI.parentElement?.appendChild(tag)
    hoverI.addEventListener('oas-select', (e) => {
      tag.textContent = `Selected: ${e.detail.value}`
    })
  }

  // Pure action menu (selectable=false): click feedback (value not written back)
  const menuAction = document.getElementById('menu-action')
  if (menuAction) {
    menuAction.addEventListener('oas-select', (e) => {
      const out = document.getElementById('menu-action-out')
      if (out) out.textContent = `Clicked: ${e.detail.value} (value not written back, no check mark)`
    })
  }

  // persistent: selecting a leaf writes value back while submenus stay open
  const menuPersistent = document.getElementById('menu-persistent')
  if (menuPersistent) {
    menuPersistent.addEventListener('oas-select', (e) => {
      const out = document.getElementById('menu-persistent-out')
      if (out) out.textContent = `Selected: ${e.detail.value} (submenu stays open for more picks)`
    })
  }

  // searchable: selection feedback for the filterable menu
  const menuSearchable = document.getElementById('menu-searchable')
  if (menuSearchable) {
    menuSearchable.addEventListener('oas-select', (e) => {
      const tag = document.getElementById('menu-searchable-result')
      if (tag) tag.textContent = `Selected: ${e.detail.value}`
    })
  }
})
</script>

## Whole-menu disabled

`disabled` disables the entire menu: click / hover / keyboard are all intercepted (href items also get their native navigation blocked), the host is dimmed (opacity .6) and synced with `aria-disabled`; removing the attribute restores interaction.

<DemoBlock title="Whole-menu disabled">
  <oas-menu disabled style="max-width: 220px" items='[{"label":"Home","value":"home"},{"label":"Settings","value":"settings"},{"label":"Delete","value":"delete","danger":true}]'></oas-menu>
</DemoBlock>

## Pure action menu (selectable=false)

`selectable="false"` turns off selection semantics for the whole menu: every leaf item renders as an action item (`menuitem`, no check mark, no `aria-checked`), clicking only emits `oas-select` and **never writes back `value`** — for pure command menus ("click and go"; equivalent to writing every leaf as `kind: "action"`).

<DemoBlock title="Pure action menu (no check marks, value not written back)">
  <oas-menu id="menu-action" selectable="false" style="max-width: 220px" items='[{"label":"Share","value":"share"},{"label":"Favorite","value":"star"},{"label":"Report","value":"report","danger":true}]'></oas-menu>
  <p id="menu-action-out" style="margin-top: var(--oas-space-2); color: var(--oas-color-text-secondary)">Nothing clicked yet</p>
</DemoBlock>

## Keep submenus open on select (persistent)

`persistent` keeps flyout submenus **open after a selection** (the positive switch of the `close-on-select` family; when explicit it wins over `close-on-select`): for continuous-pick scenarios where the menu should stay where it is; `value` is still written back.

<DemoBlock title="persistent: submenu stays open after selecting">
  <oas-menu id="menu-persistent" persistent style="max-width: 220px" items='[{"label":"File","value":"file","children":[{"label":"New","value":"new"},{"label":"Open","value":"open"}]},{"label":"Edit","value":"edit","children":[{"label":"Copy","value":"copy"},{"label":"Cut","value":"cut"}]}]'></oas-menu>
  <p id="menu-persistent-out" style="margin-top: var(--oas-space-2); color: var(--oas-color-text-secondary)">Hover a parent item to open its submenu, then click a leaf</p>
</DemoBlock>

## Searchable (searchable)

`searchable` renders a filter input at the top of the menu and filters visible items live (works in both floating and inline modes): when a nested child matches, its ancestors are kept and the matching path is auto-expanded; when nothing matches, an i18n empty message is shown. `Escape` clears the search, `ArrowDown` moves focus into the menu.

<DemoBlock title="Searchable (floating + inline)">
  <oas-space direction="vertical" size="large">
    <div>
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Floating: type "Win" to filter down to "Window layout"</p>
      <oas-menu id="menu-searchable" searchable style="width: 220px" onoas-select="menuSearchableLog(event)" items='[{"label":"New file","value":"new-file","icon":"edit"},{"label":"Open file","value":"open-file","icon":"search"},{"label":"Window layout","value":"window","icon":"menu"},{"label":"Settings","value":"settings","icon":"gear"}]'></oas-menu>
      <oas-tag id="menu-searchable-result" type="info" style="margin-top: var(--oas-space-2)">Nothing selected</oas-tag>
    </div>
    <div>
      <p style="margin: 0 0 var(--oas-space-2); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Inline: type "Stats" to filter in place and expand the matching path</p>
      <oas-menu id="menu-searchable-inline" mode="inline" searchable style="width: 240px" items='[{"label":"Workspace","value":"workspace","children":[{"label":"Overview","value":"overview"},{"label":"Statistics","value":"stats"}]},{"label":"Projects","value":"project","children":[{"label":"Active","value":"active"},{"label":"Done","value":"done"}]},{"label":"Settings","value":"settings"}]'></oas-menu>
    </div>
  </oas-space>
</DemoBlock>

## Shortcut hints (shortcut)

The menu item `shortcut` field (items JSON) or the `<oas-menu-item shortcut="…">` attribute renders a `kbd` hint at the trailing edge, matching the menubar shortcut visual contract.

<DemoBlock title="Shortcut hints (shortcut)">
  <oas-space>
    <oas-menu style="width: 220px" items='[{"label":"New","value":"new","shortcut":"Ctrl+N"},{"label":"Open","value":"open","shortcut":"Ctrl+O"},{"label":"Save","value":"save","shortcut":"Ctrl+S"},{"label":"Fullscreen","value":"full","shortcut":"F11"}]'></oas-menu>
    <oas-menu style="width: 220px">
      <oas-menu-item value="undo" shortcut="Ctrl+Z">Undo</oas-menu-item>
      <oas-menu-item value="redo" shortcut="Ctrl+Shift+Z">Redo</oas-menu-item>
      <oas-menu-item value="paste" shortcut="Ctrl+V">Paste</oas-menu-item>
    </oas-menu>
  </oas-space>
</DemoBlock>

## API

### oas-menu

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accordion` | Accordion mutual exclusion (inline mode: only one sibling submenu open at a time) | `boolean` | — |
| `close-on-select` | Whether expanded submenus collapse after a leaf item is selected. Defaults by mode: inline side navigation keeps them open, flyout modes collapse; checkbox items never collapse on toggle | `string` | — |
| `collapsed` | Collapsed state (vertical only): icons only, submenus pop to the right | `boolean` | — |
| `disabled` | Disables the whole menu: click/hover/keyboard intercepted, dimmed with aria-disabled | `boolean` | — |
| `expanded` | Controlled expanded set (JSON array string; which submenus are open in inline mode); internally managed when uncontrolled | `string` | — |
| `items` | Menu items JSON (supports disabled / loading, icon, children submenus) | `MenuItem[] \| null` | `[]` |
| `max-height` | Max height of a long menu; scrolls internally beyond it (number gets px appended) | `string` | — |
| `mode` | Layout mode: `vertical` menu / `horizontal` top bar | — | — |
| `open-on-hover` | Hover-opened submenus in vertical/inline modes (~150ms open / ~300ms close delay); clicks unchanged; horizontal and collapsed flyout unaffected | `boolean` | — |
| `persistent` | Keep flyout submenus open after selection (wins over close-on-select) | `string` | — |
| `searchable` | Renders a filter input at the top of the menu and filters visible items live (matching ancestors are kept and auto-expanded; Esc clears) | `boolean` | — |
| `selectable` | With `"false"`, pure action menu: no check marks, clicks never write back value (detail kind=action) | `string` | `true` |
| `theme` | Local theme: `dark` uses dark tokens (independent of the global theme) | — | — |
| `value` | Current selected value. Plain string means global single-select (no group, legacy-compatible); JSON object string (e.g. `{"sort":"name","view":"list"}`) scopes per group id — the `value` of a `type:"group"` item is the group id, picking inside a group only updates that group | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-expand-change` | Submenu expand state changed, `detail: { expanded: string[], value, isExpanded }` (fired both controlled and uncontrolled) |
| `oas-select` | Select an item, `detail: { value, kind? }`. `kind` only appears for action items (`kind: "action"`) as "action"; radio items omit `detail.kind` |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-menu-max-height` | `none` |

### oas-menu-item

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `danger` | Destructive item: danger color semantics (delete/logout operations) | — | — |
| `disabled` | Disable this item | — | — |
| `href` | Link URL: with `href` the item renders as a native `<a>` (real navigation + still fires `oas-select`) | — | — |
| `icon` | Leading icon (`@oas-ui/icons` registry icon name) | — | — |
| `icon-color` | Icon color: fixes the icon to this color (overrides the selected/disabled default); defaults to `currentColor` following the text color | — | — |
| `kind` | Leaf semantics: `radio` (default, selectable) / `action` (no checked state, does not write back `value`) / `checkbox` (multi-select, `value` is the checked-set array) | — | — |
| `loading` | Loading state: renders a spinner and blocks clicks; restored by data updates | — | — |
| `rel` | Link rel (with `href`) | — | — |
| `shortcut` | Shortcut hint rendered as a trailing kbd (aligned with the menubar shortcut contract) | — | — |
| `target` | Link target (with `href`) | — | — |
| `value` | Selection value (data-carrier field of the declarative child channel) | — | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Menu item label content (default slot text); direct child `<oas-menu-item>`/`<oas-menu-group>`/`<oas-menu-divider>` elements recursively become the submenu `children` |
| `template[slot="leading"]` | Leading media template (or a direct child with slot="leading"): avatars/color chips/any rich leading content, rendered before the label and taking precedence over the icon attribute; replaced by the spinner in the loading state; declarative child channel only (not supported by the items JSON) |

### oas-menu-group

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Group title (small secondary text, not clickable) | — | — |
| `value` | Radio group id (picking inside the group only updates that group's selected value) | — | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Group items: child `<oas-menu-item>`/`<oas-menu-group>`/`<oas-menu-divider>` elements flatten to the same level |

### oas-menu-divider

#### Slots

| Name | Description |
| --- | --- |
| default | Divider data carrier (no attributes; the host parses it as `type: "divider"`) |

`MenuItem` fields:

| Field      | Description                                                        | Type         |
| ---------- | ------------------------------------------------------------------ | ------------ |
| `label`    | Menu item text                                                     | `string`     |
| `value`    | Selection value                                                    | `string`     |
| `type`     | Item type: `item` (default) / `group` (group title) / `divider`    | `string`     |
| `kind`     | Leaf semantics: `radio` (default, checkable) / `action` (action item, no checkmark, doesn't write back `value` on click) | `string` |
| `icon`     | Icon name (a key of `@oas-ui/icons` built-in icon set)                | `string`     |
| `disabled` | Disables the item                                                  | `boolean`    |
| `children` | Submenu items array with the same shape as the parent (nested recursively) | `MenuItem[]` |

`children` is an optional submenu items array; items with `children` expand their submenu on click/hover, and the selected state only lands on leaf items. `group` children are laid out flat on the same level; group titles are not clickable and skipped in keyboard navigation; `divider` items are not clickable and skipped in keyboard navigation.

Keyboard navigation: arrow keys move (auto-skipping group titles and dividers), Enter selects (items with submenus enter via Enter/ArrowRight), Home / End jump, ArrowLeft returns to the parent; `role="menu"` + `menuitemradio` (submenu parents are `menuitem`), the selected item shows a check mark.
