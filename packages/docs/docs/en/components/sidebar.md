# Sidebar

A collapsible side bar: on desktop, `collapsed` narrows it to an icon strip; on mobile (narrower than `mobile-breakpoint`, default 768px) it automatically becomes an overlay drawer with a backdrop. Clicking outside, the close button or Esc collapses it.

## Basic usage

Pass menu JSON via the `items` attribute (`[{label, value, icon?}]`); the default slot holds custom content.

<DemoBlock title="Default sidebar">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-basic" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dashboard","icon":"📊"},{"label":"Orders","value":"orders","icon":"📦"},{"label":"Settings","value":"settings","icon":"⚙️"}]'>
      <oas-tag size="small">Custom content area</oas-tag>
    </oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      Right content area
    </div>
  </div>
</DemoBlock>

## Collapsing

Clicking the bottom「«」button toggles `collapsed` (a controlled attribute; fires `oas-collapse`). In the collapsed state only icons are shown, and menu items without an `icon` are hidden automatically.

<DemoBlock title="collapsed icon state">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button size="small" onclick="document.querySelector('#sidebar-collapsible').toggleAttribute('collapsed')">Toggle collapsed</oas-button>
    <div style="height: 240px; width: 100%; display: flex">
      <oas-sidebar id="sidebar-collapsible" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dashboard","icon":"📊"},{"label":"Settings","value":"settings","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
        Right content area
      </div>
    </div>
  </oas-space>
</DemoBlock>

## Mobile drawer

On narrow screens the sidebar automatically becomes an overlay drawer: the floating ☰ button at the top-left opens it, and the backdrop / close button / Esc collapses it. Tune the breakpoint with `mobile-breakpoint` (this demo uses 700px so it can be observed on a wide screen).

<DemoBlock title="Mobile drawer (breakpoint 700)">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar mobile-breakpoint="700" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dashboard","icon":"📊"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      Shrink the window / preview container below 700px, then click the ☰ at the top-left to open the drawer
    </div>
  </div>
</DemoBlock>

## Controlled mobile drawer

`drawer-open` is a controlled attribute: setting/removing it externally opens/closes the mobile drawer (no need to click the floating ☰). This demo raises the breakpoint to force the mobile form so it can be observed on a wide screen.

<DemoBlock title="Controlled drawer-open">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('sidebar-drawer').setAttribute('drawer-open','')">Open drawer (set drawer-open)</oas-button>
    <oas-button onclick="document.getElementById('sidebar-drawer').removeAttribute('drawer-open')">Close drawer (remove drawer-open)</oas-button>
  </oas-space>
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-drawer" mobile-breakpoint="2000" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dashboard","icon":"📊"},{"label":"Orders","value":"orders","icon":"📦"},{"label":"Settings","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      External buttons set <code>drawer-open</code> to control the drawer; after it is closed via the mask / ✕ / Esc, the attribute is removed.
    </div>
  </div>
</DemoBlock>

## Controlled highlight

`active` is a controlled attribute: setting/removing it externally migrates the currently highlighted item (no click needed).

<DemoBlock title="Controlled active">
  <oas-space>
    <oas-button type="primary" size="small" onclick="document.getElementById('sidebar-active').setAttribute('active','dashboard')">Highlight Dashboard</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-active').setAttribute('active','settings')">Highlight Settings</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-active').removeAttribute('active')">Clear highlight</oas-button>
  </oas-space>
  <div style="height: 240px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-active" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dashboard","icon":"📊"},{"label":"Orders","value":"orders","icon":"📦"},{"label":"Settings","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      External buttons set <code>active</code> to control the current highlighted item; clearing it restores the default (no highlight, last item).
    </div>
  </div>
</DemoBlock>

## Groups

Menu `items` support an optional `group` field: consecutive items in the same group get a group title rendered before the group's first item (display-only, non-clickable). Group titles are hidden in the collapsed icon strip and shown in the mobile drawer.

<DemoBlock title="Groups (items.group)">
  <div style="height: 300px; width: 100%; display: flex">
    <oas-sidebar items='[{"label":"Dashboard","value":"dash","icon":"📊","group":"Overview"},{"label":"Live Trends","value":"trend","icon":"📈","group":"Overview"},{"label":"Orders","value":"orders","icon":"📦","group":"Business"},{"label":"Products","value":"goods","icon":"🛍️","group":"Business"},{"label":"Users","value":"users","icon":"👥","group":"Business"},{"label":"Profile","value":"me","icon":"👤"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      “Overview” and “Business” are group titles; “Profile” has no `group` field and renders flat.
    </div>
  </div>
</DemoBlock>

## Nested submenus

Items support `children` nesting: a parent item toggles expansion on click (without firing `oas-select`); a parent containing the active child auto-expands. Subtrees are hidden in the collapsed icon strip.

<DemoBlock title="Nested submenus (items.children)">
  <div style="height: 340px; width: 100%; display: flex">
    <oas-sidebar active="users" items='[{"label":"Dashboard","value":"dash","icon":"📊"},{"label":"Business","value":"biz","icon":"📦","children":[{"label":"Orders","value":"orders"},{"label":"Products","value":"goods"},{"label":"Users","value":"users"}]},{"label":"System","value":"sys","icon":"⚙️","children":[{"label":"Permissions","value":"perm"},{"label":"Audit Log","value":"audit"}]}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      “Business” auto-expands because it contains the active child (Users); clicking a parent only toggles expansion, clicking a child fires selection.
    </div>
  </div>
</DemoBlock>

## Badges and item actions

Items support `badge` count badges (colors via `--oas-sidebar-badge-bg/-color` variables) and `actions` hover action buttons (clicking fires `oas-action` without selecting).

<DemoBlock title="Badges and item actions">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-badge-action" onoas-action="sidebarActionLog(event)" items='[{"label":"Inbox","value":"inbox","icon":"📥","badge":"12"},{"label":"Notifications","value":"notice","icon":"🔔","badge":"3"},{"label":"Projects","value":"proj","icon":"📁","actions":[{"icon":"✏️","value":"edit","label":"Edit"},{"icon":"🗑️","value":"delete","label":"Delete"}]}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      <p>Hover “Projects” to reveal action buttons; clicking fires an <code>oas-action</code> event.</p>
      <oas-tag id="sidebar-action-log" type="info">No action yet</oas-tag>
    </div>
  </div>
</DemoBlock>

## Dividers and skeleton

A `{type:"divider"}` entry renders a divider line; the `loading` attribute shows a pulsing skeleton (the value sets the row count, default 4).

<DemoBlock title="Divider + loading">
  <oas-space style="width: 100%">
    <oas-button size="small" onclick="document.getElementById('sidebar-loading').toggleAttribute('loading')">Toggle loading</oas-button>
    <div style="height: 280px; width: 100%; display: flex">
      <oas-sidebar id="sidebar-loading" items='[{"label":"Dashboard","value":"dash","icon":"📊"},{"type":"divider"},{"label":"Orders","value":"orders","icon":"📦"},{"label":"Users","value":"users","icon":"👥"}]'></oas-sidebar>
      <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">Click the button to toggle the skeleton.</div>
    </div>
  </oas-space>
</DemoBlock>

## Shortcut and keyboard navigation

The `shortcut` attribute enables `Ctrl/Cmd+B` collapse toggling (off by default to avoid hijacking a global key); the menu supports `↑/↓` focus movement, `Home/End` jumps, and `Enter/Space` activation.

<DemoBlock title="Shortcut + keyboard navigation">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar shortcut items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Data","value":"data","icon":"📊"},{"label":"Settings","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      Press <oas-kbd>Ctrl</oas-kbd>+<oas-kbd>B</oas-kbd> to collapse/expand; focus the menu and navigate with arrow keys.
    </div>
  </div>
</DemoBlock>

## Hover expansion (expand-on-hover)

The `expand-on-hover` attribute temporarily expands the collapsed icon strip on hover (pure visual state — does not change the controlled `collapsed` attribute).

<DemoBlock title="expand-on-hover">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button size="small" onclick="document.getElementById('sidebar-hover').toggleAttribute('collapsed')">Collapse to icon strip first</oas-button>
    <div style="height: 260px; width: 100%; display: flex">
      <oas-sidebar id="sidebar-hover" expand-on-hover collapsed items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dash","icon":"📊"},{"label":"Settings","value":"settings","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
        Hover the icon strip to temporarily expand and reveal labels; moving away collapses it again.
      </div>
    </div>
  </oas-space>
</DemoBlock>

## Variants

The `variant` attribute: `sidebar` (default, flush) / `floating` (margin + radius + shadow) / `inset` (margin + radius + background contrast).

<DemoBlock title="variant: floating / inset">
  <oas-space style="width: 100%">
    <div style="height: 240px; flex: 1; display: flex; background: var(--oas-color-bg-hover); padding: var(--oas-space-2)">
      <oas-sidebar variant="floating" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Settings","value":"s","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; padding: var(--oas-space-4)">floating</div>
    </div>
    <div style="height: 240px; flex: 1; display: flex; background: var(--oas-color-bg); padding: var(--oas-space-2)">
      <oas-sidebar variant="inset" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Settings","value":"s","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; padding: var(--oas-space-4)">inset</div>
    </div>
  </oas-space>
</DemoBlock>

## Right side and dual sidebars

`side="right"`: the mobile drawer slides in from the right with the trigger on the right; multiple sidebars can coexist (one on each side, with independent state).

<DemoBlock title="side=right + dual sidebars">
  <div style="height: 280px; width: 100%; display: flex">
    <oas-sidebar mobile-breakpoint="2000" items='[{"label":"Main nav","value":"main","icon":"🏠"},{"label":"Data","value":"data","icon":"📊"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      “Main nav” on the left and “Auxiliary panel” (side=right) on the right — each opens/closes independently (this demo forces the mobile state for observation).
    </div>
    <oas-sidebar side="right" mobile-breakpoint="2000" items='[{"label":"Auxiliary panel","value":"aux","icon":"🔧"},{"label":"Logs","value":"log","icon":"📋"}]'></oas-sidebar>
  </div>
</DemoBlock>

## Resizable width (resizable)

The `resizable` attribute shows a drag rail on the host edge for real-time resizing (writes back to the `width` attribute); `resize-min`/`resize-max` clamp the range (default 160–480); the rail supports arrow keys (±8px, `Home/End` jumps to min/max); `oas-resize` fires on drag end or key adjustments. Desktop non-collapsed only (hidden when collapsed or on mobile).

<DemoBlock title="resizable edge drag-resize">
  <div style="height: 280px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-resizable" resizable resize-min="180" resize-max="400" onoas-resize="sidebarResizeLog(event)" width="220px" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dash","icon":"📊"},{"label":"Settings","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      Drag the rail on the sidebar's right edge to resize in real time; focus the rail and use arrow keys too.
      <oas-tag id="sidebar-resize-log" type="info">Current width 220px</oas-tag>
    </div>
  </div>
</DemoBlock>

## Resizable width (oas-splitter)

For resizable width, compose with `oas-splitter` instead of a built-in rail: place the sidebar in the left pane and drag the splitter handle to resize.

<DemoBlock title="oas-splitter + sidebar">
  <div style="height: 280px; width: 100%">
    <oas-splitter percent="22" min="12" max="45">
      <oas-sidebar slot="left" width="100%" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Data","value":"data","icon":"📊"},{"label":"Settings","value":"s","icon":"⚙️"}]'></oas-sidebar>
      <div slot="right" style="padding: var(--oas-space-4)">Drag the splitter handle to resize the sidebar (it fills the left pane with `width="100%"`, tracking the pane width in real time).</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Custom width

The `width` attribute overrides the expanded width (defaults to the `--oas-sidebar-width` token); the collapsed state still narrows to an icon strip.

<DemoBlock title="width attribute">
  <oas-space>
    <oas-button size="small" onclick="document.getElementById('sidebar-width').setAttribute('width','180px')">180px</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-width').setAttribute('width','280px')">280px</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-width').removeAttribute('width')">Default token</oas-button>
  </oas-space>
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-width" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dashboard","icon":"📊"},{"label":"Settings","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      Click the buttons above to switch the expanded width and watch the sidebar change.
    </div>
  </div>
</DemoBlock>

## Combining with oas-layout

`oas-sidebar` can be used directly as the sider of `oas-layout` (slot="sider").

<DemoBlock title="sidebar as the sider">
  <oas-layout style="height: 300px; width: 100%">
    <oas-header slot="header">Header area</oas-header>
    <oas-sidebar slot="sider" items='[{"label":"Home","value":"home","icon":"🏠"},{"label":"Dashboard","value":"dashboard","icon":"📊"}]'>
      <oas-tag size="small">Side content</oas-tag>
    </oas-sidebar>
    <oas-content slot="content">
      <oas-space direction="vertical" style="width: 100%">
        <p>Main content area.</p>
        <oas-tag type="primary">flex 1</oas-tag>
      </oas-space>
    </oas-content>
    <oas-footer slot="footer">Footer info</oas-footer>
  </oas-layout>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Value of the currently-highlighted menu item (controlled: set/clear immediately re-renders highlight) | `string` | — |
| `collapsed` | Controlled collapse to an icon strip (present means collapsed) | `boolean` | — |
| `drawer-open` | Mobile drawer open state (controlled: set opens, clear closes; auto-removed when breakpoint returns to desktop) | `boolean` | — |
| `expand-on-hover` | Temporarily expand the collapsed icon strip on hover (visual only; does not change controlled collapsed) | — | — |
| `items` | Menu items JSON `[{label, value, icon?, group?, badge?, children?, actions?}]` (supports divider entries `{type:"divider"}`; children for nested submenus) | `SidebarEntry[] \| string` | `[]` |
| `loading` | Skeleton loading state (shows a pulsing skeleton when present; value sets row count, default 4) | `string` | `4` |
| `mobile-breakpoint` | Mobile breakpoint (px); narrower than this becomes an overlay drawer | — | — |
| `resizable` | Edge drag-resize (shows a drag rail on the host edge; desktop non-collapsed only) | `boolean` | — |
| `resize-max` | Maximum resize width (px, default 480) | `string` | `480` |
| `resize-min` | Minimum resize width (px, default 160) | `string` | `160` |
| `shortcut` | Enable Ctrl/Cmd+B collapse toggling (off by default to avoid hijacking a global key) | `boolean` | — |
| `side` | Drawer side: left (default) / right (mobile drawer slides from the right, trigger on the right) | — | — |
| `variant` | Variant: sidebar (default flush) / floating (radius + shadow) / inset (radius + background contrast) | — | — |
| `width` | Expanded width; defaults to the `--oas-sidebar-width` token | `string` | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-action` | `detail: { value: string, action: string, label: string }`; When fired: an item hover action button is clicked (does not fire oas-select) |
| `oas-collapse` | `detail: { collapsed: boolean }`; When fired: Desktop collapse button toggled |
| `oas-resize` | `detail: { width: number }`; When fired: drag-resize ends / arrow keys adjust the width |
| `oas-select` | `detail: { value: string, label: string }`; When fired: A menu item was selected (also collapses the drawer on mobile) |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `footer` | — |
| `header` | — |

### Parts

`root` / `panel` / `head` / `close` / `nav` / `body` / `foot` / `toggle` (desktop collapse) / `trigger` (mobile trigger) / `mask` / `item`; the header and footer content are injected via `slot="header"`, the default slot and `slot="footer"` respectively.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.sidebarActionLog = (e) => {
    const tag = document.getElementById('sidebar-action-log')
    if (tag) tag.textContent = `Action: ${e.detail.label} (${e.detail.action})`
  }
  window.sidebarResizeLog = (e) => {
    const tag = document.getElementById('sidebar-resize-log')
    if (tag) tag.textContent = `Current width ${e.detail.width}px`
  }
})
</script>