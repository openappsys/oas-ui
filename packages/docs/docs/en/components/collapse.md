# Collapse

Stows content in collapsible panels to keep the focus on key information.

## Basic Usage

<DemoBlock title="Multiple panels open at once">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="Project info"><p>Includes basic info such as team, milestones, and budget.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Tech stack"><p>The component library is built on Web Components standards.</p></oas-collapse-item>
      <oas-collapse-item name="c" header="Release plan"><p>Iterates by version, running the engineering discipline checklist before each release.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`active` controls the set of expanded panels (`name` values comma-separated); by default multiple panels can be open at the same time.

## Accordion

<DemoBlock title="Accordion mode">
  <div style="width: 100%">
    <oas-collapse accordion active="a">
      <oas-collapse-item name="a" header="Panel 1"><p>Only one panel can be open at a time.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Opening a new panel automatically collapses the previous one.</p></oas-collapse-item>
      <oas-collapse-item name="c" header="Panel 3"><p>Clicking an already-open panel collapses it.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## All Collapsed

<DemoBlock title="All collapsed by default">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a" header="Panel 1"><p>All panels are collapsed by default.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Click the header to expand.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Expansion state events">
  <div style="width: 100%">
    <oas-collapse accordion active="a" id="collapse-event">
      <oas-collapse-item name="a" header="Panel 1"><p>Content 1</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Content 2</p></oas-collapse-item>
    </oas-collapse>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Currently open: <span id="collapse-state">a</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // import must stay inside onMounted: top-level await import is evaluated during vitepress build SSR (no HTMLElement in Node) and blanks the page
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.querySelector('#collapse-event')?.addEventListener('oas-change', (e) => {
    const active = e.detail.active
    document.querySelector('#collapse-state').textContent = active.length ? active.join(', ') : '(none)'
  })

  // Before-collapse guard: collapsing is blocked once "unsaved" is checked
  const guard = document.querySelector('#collapse-guard')
  let guardDirty = false
  window.collapseGuardDirty = (v) => {
    guardDirty = v
  }
  guard?.addEventListener('oas-before-collapse', (e) => {
    const willCollapse = !e.detail.next.includes(e.detail.name)
    if (guardDirty && willCollapse) {
      e.preventDefault()
      message.warning('Unsaved changes; collapse blocked')
    }
  })

  // Imperative methods: property access must wait for upgrade, otherwise the expando shadows the prototype method
  const methods = document.querySelector('#collapse-methods')
  window.collapseExpandAll = () =>
    customElements.whenDefined('oas-collapse').then(() => methods?.expandAll())
  window.collapseCollapseAll = () =>
    customElements.whenDefined('oas-collapse').then(() => methods?.collapseAll())
})
</script>

## Borderless FAQ

<DemoBlock title="Borderless FAQ (accordion + icon on the left)">
  <div style="width: 100%">
    <oas-collapse variant="borderless" accordion icon-placement="start" active="q1">
      <oas-collapse-item name="q1" header="How do I install the library?"><p>Install the core package with your package manager and register the component families at the entry.</p></oas-collapse-item>
      <oas-collapse-item name="q2" header="Is dark theme supported?"><p>All colors come from design tokens, so dark variants apply automatically.</p></oas-collapse-item>
      <oas-collapse-item name="q3" header="Does it work with SSR?"><p>Yes. The SSR snapshot and client rendering share the same template and hydrate seamlessly.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`variant="borderless"` is a ghost form without borders: the group outline, radius, and item separators are removed — a good fit for FAQs, settings pages, and other weak-boundary scenes.

## Icon Placement

<DemoBlock title='Side-nav style (icon-placement="start")'>
  <div style="width: 100%">
    <oas-collapse icon-placement="start">
      <oas-collapse-item name="guide" header="Guide"><p>Installation, quick start, and theming.</p></oas-collapse-item>
      <oas-collapse-item name="components" header="Components"><p>Browse by basic, form, feedback, navigation, and other families.</p></oas-collapse-item>
      <oas-collapse-item name="resources" header="Resources"><p>Design tokens, icons, and changelogs.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

The icon sits on the right of the title by default (`end`); `icon-placement="start"` places it on the left. A single `oas-collapse-item` can also set the attribute to override the container value.

## Rich Header and Extra Actions

<DemoBlock title="Custom header and extra action area">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a">
        <span slot="header"><b>Release plan</b> (biweekly iteration)</span>
        <oas-button slot="extra" size="small" variant="outlined" onclick="message.info('Settings opened')">Settings</oas-button>
        <p>The title comes from <code>slot="header"</code>, which takes precedence over the <code>header</code> attribute.</p>
      </oas-collapse-item>
      <oas-collapse-item name="b" header="Plain attribute title">
        <oas-button slot="extra" size="small" variant="outlined" onclick="message.info('Exported')">Export</oas-button>
        <p><code>slot="extra"</code> sits on the right of the header; clicks inside it never toggle the panel.</p>
      </oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

- `slot="header"`: rich-text title, mutually exclusive with the `header` attribute (slot wins). If you place interactive elements in the title, call `stopPropagation` on `click` in the host to avoid toggling.
- `slot="extra"`: right-side action area. The component already stops its clicks from reaching the collapse interaction, so buttons and controls are safe inside.

## Uncontrolled Initial Value

<DemoBlock title="default-active (uncontrolled)">
  <div style="width: 100%">
    <oas-collapse default-active="a">
      <oas-collapse-item name="a" header="Panel 1"><p>Expanded from default-active on the first frame; state is then self-managed and never written back to the active attribute.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Click any panel to toggle freely.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`default-active` is only the uncontrolled initial value. Once the `active` attribute is set the component becomes controlled and `default-active` no longer applies.

## Disabled Panel

<DemoBlock title="A disabled panel cannot be expanded">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a" header="Enabled panel"><p>Expands normally.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Disabled panel" disabled><p>Disabled: not focusable, not clickable.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

A `disabled` panel is visually de-emphasized and is skipped by keyboard roving and `expandAll()`.

## Locked Open

<DemoBlock title="no-collapse keeps the current panel open">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="Locked panel" no-collapse><p>Once expanded, clicking its own header no longer collapses it.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Normal panel"><p>Other panels are unaffected.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`no-collapse` only guards header clicks; `collapseAll()` still force-collapses everything.

## Before-Collapse Guard

<DemoBlock title="Cancelable oas-before-collapse event">
  <div style="width: 100%">
    <oas-collapse id="collapse-guard" active="draft">
      <oas-collapse-item name="draft" header="Draft (collapse blocked once unsaved)">
        <label style="display: flex; align-items: center; gap: 8px">
          <input type="checkbox" onchange="collapseGuardDirty(this.checked)" /> Mark as "unsaved"
        </label>
        <p>Check the box, then click this panel's header — the collapse is intercepted with a notice.</p>
      </oas-collapse-item>
      <oas-collapse-item name="done" header="Done panel"><p>Not affected by the guard.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`oas-before-collapse` is cancelable, `detail: { name, next }`; the host calls `preventDefault()` to block the toggle (it fires before both expand and collapse).

## Nested Panels

<DemoBlock title="Nested collapse panels">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="outer" header="Outer panel">
        <oas-collapse>
          <oas-collapse-item name="in-a" header="Inner panel A"><p>Inner events never disturb the outer panel.</p></oas-collapse-item>
          <oas-collapse-item name="in-b" header="Inner panel B"><p>Each level manages its own active set.</p></oas-collapse-item>
        </oas-collapse>
      </oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## Custom Toggle Icon

<DemoBlock title='template[slot="toggle"] custom expand icon'>
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="Custom icon">
        <template slot="toggle">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 6l6 6 6-6"/></svg>
        </template>
        <p>The toggle icon becomes a downward chevron that rotates with the expanded state.</p>
      </oas-collapse-item>
      <oas-collapse-item name="b" header="Default arrow"><p>Without a toggle template the default arrow renders.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## Expand All / Collapse All

<DemoBlock title="expandAll() / collapseAll() methods">
  <div style="width: 100%">
    <oas-space style="margin-bottom: 8px">
      <oas-button size="small" onclick="collapseExpandAll()">Expand all</oas-button>
      <oas-button size="small" onclick="collapseCollapseAll()">Collapse all</oas-button>
    </oas-space>
    <oas-collapse id="collapse-methods" default-active="a">
      <oas-collapse-item name="a" header="Panel 1"><p>Content 1</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Content 2</p></oas-collapse-item>
      <oas-collapse-item name="c" header="Disabled panel" disabled><p>Methods skip disabled items.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

The container provides the imperative methods `expandAll()` / `collapseAll()`. In accordion mode `expandAll()` expands only the first panel; both methods skip `disabled` items and dispatch `oas-change`.

## Render Strategy & Heading Level

<DemoBlock title="destroy-on-collapse / force-render / heading-level">
  <div style="width: 100%">
    <oas-collapse heading-level="3">
      <oas-collapse-item name="a" header="Default rendering (content kept when collapsed)"><p>Content stays in the DOM; collapsing only hides it.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="destroy-on-collapse" destroy-on-collapse><p>Content is removed from the DOM on collapse and re-mounted on next expand (collapse animation is skipped).</p></oas-collapse-item>
      <oas-collapse-item name="c" header="force-render (rendered up front)" force-render><p>Content is in the DOM even before the first expand (for text-retrieval scenarios).</p></oas-collapse-item>
    </oas-collapse>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
      Container <code>heading-level="3"</code>: panel titles get the heading role (aria-level=3) so screen readers can navigate by headings; items may override it individually.
    </p>
  </div>
</DemoBlock>

## API

### oas-collapse

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `accordion` | Accordion mode; only one panel open at a time | `boolean` | — |
| `active` | Set of expanded panel `name` values (comma-separated) | — | — |
| `default-active` | Uncontrolled initial expanded set (comma-separated `name`s): first-frame seed, then self-managed; controlled when `active` is present | — | — |
| `heading-level` | Panel heading semantic level `1`-`6` / `none` (default): 1-6 attaches heading role + aria-level (a11y) | `string` | — |
| `icon-placement` | Expand icon placement: `start` (left of title) / `end` (default, right); overridable per item | `string` | `end` |
| `variant` | Variant: `outlined` (default, bordered rounded container) / `borderless` (ghost, no border) | — | — |

| Event | Description |
| --- | --- |
| `oas-before-collapse` | Fired before expand/collapse (cancelable), `detail: { name, next }`; `preventDefault()` blocks the toggle (not fired by expandAll/collapseAll) |
| `oas-change` | Expansion state change, `detail: { active: string[] }` |

| Name | Description |
| --- | --- |
| default | — |

### oas-collapse-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `destroy-on-collapse` | Destroy panel content on collapse (re-mounted on next expand; collapse animation skipped) | `boolean` | — |
| `disabled` | Disable the panel: not focusable, not clickable (expandAll skips it) | `boolean` | — |
| `force-render` | Render panel content up front (collapsed content is not rendered by default) | `boolean` | — |
| `header` | Panel title | `string` | — |
| `heading-level` | Per-item override of the heading semantic level (`1`-`6` / `none`) | `string` | — |
| `icon-placement` | Per-item override of the container icon placement (`start` / `end`) | — | — |
| `name` | Unique identifier of the panel | — | — |
| `no-collapse` | Lock the expanded state: clicking itself does not collapse (other panels unaffected) | — | — |
| `open` | Whether it is expanded (managed by the container) | `boolean` | — |

| Name | Description |
| --- | --- |
| default | — |
| `extra` | Panel header right-side action area (clicks inside do not toggle) |
| `header` | Rich panel header (mutually exclusive with the header attribute, slot wins; interactive children should stopPropagation) |
| `template[slot="toggle"]` | Custom expand icon template (built-in arrow by default) |
