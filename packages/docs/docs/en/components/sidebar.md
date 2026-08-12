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
| `collapsed` | Controlled collapse to an icon strip (present means collapsed) | `boolean` | — |
| `drawer-open` | — | `boolean` | — |
| `items` | Menu items JSON `[{label, value, icon?}]` | `SidebarItem[] \| string` | `[]` |
| `mobile-breakpoint` | Mobile breakpoint (px); narrower than this becomes an overlay drawer | — | — |
| `width` | Expanded width; defaults to the `--oas-sidebar-width` token | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-collapse` | `detail: { collapsed: boolean }`; When fired: Desktop collapse button toggled |
| `oas-select` | `detail: { value: string, label: string }`; When fired: A menu item was selected (also collapses the drawer on mobile) |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `footer` | — |
| `header` | — |

### Parts

`root` / `panel` / `head` / `close` / `nav` / `body` / `foot` / `toggle` (desktop collapse) / `trigger` (mobile trigger) / `mask` / `item`; the header and footer content are injected via `slot="header"`, the default slot and `slot="footer"` respectively.
