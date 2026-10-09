# Collapsible

A single-panel disclosure primitive: a standalone collapsible block with no container that manages its own open state. Relationship with `oas-collapse` — collapse orchestrates a container with multiple panels (panel state is driven by the container); collapsible is one independent panel, suited to file-tree nodes, form section folding, sidebar groups, and any "this block folds itself" scenario.

## Basic Usage

<DemoBlock title="Click the trigger to toggle">
  <div style="width: 100%">
    <oas-collapsible header="Advanced filters">
      <p>When expanded, more filters are shown: date range, tags, assignees, and so on.</p>
    </oas-collapsible>
  </div>
</DemoBlock>

Collapsed by default; clicking the trigger area toggles it. The open state is managed by the component itself (uncontrolled).

## Uncontrolled Initial Value

<DemoBlock title="default-open — expanded initially">
  <div style="width: 100%">
    <oas-collapsible header="Frequent contacts" default-open>
      <p>Expanded on the first frame via default-open; afterwards the state is managed internally and never written back to an attribute.</p>
    </oas-collapsible>
  </div>
</DemoBlock>

`default-open` only seeds the uncontrolled initial value; once the `open` attribute is present the component is controlled and `default-open` no longer applies.

## Controlled Mode

<DemoBlock title="Controlled open + oas-toggle event">
  <div style="width: 100%">
    <oas-space style="margin-bottom: 8px">
      <oas-button size="small" onclick="collapsibleToggle()">Toggle externally</oas-button>
    </oas-space>
    <oas-collapsible id="collapsible-ctrl" header="Deploy config" open>
      <p>Controlled mode: when the open attribute is present the displayed state follows the attribute (any value other than "false" means open); clicks write the attribute back and emit the event.</p>
    </oas-collapsible>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      Current state: <span id="collapsible-state">Open</span>
    </p>
  </div>
</DemoBlock>

Controlled contract: the `open` attribute present = controlled (any value other than `"false"` means open, `open="false"` means collapsed); after a click the component writes the attribute back and emits `oas-toggle` (optimistic update). Removing the `open` attribute returns to uncontrolled mode; the internal state is seeded from the last displayed value so nothing jumps.

> Framework binding note: the value semantics of `open` work correctly under Vue CSR, React, and plain HTML (frameworks serialize `:open="false"` into the attribute `open="false"`). However, **Vue SSR/SSG (Nuxt, the Vitepress build) normalizes a boolean `false` into attribute removal** (`open` is an HTML boolean attribute name) — an SSR-rendered controlled collapse degrades to uncontrolled, and a string `"false"` binding is normalized into a valueless `open` (expanded). For SSR hosts, declare the initial state with a static attribute and take over on the client by listening to `oas-toggle`, or bind via a JS property (`el.open = false`) on the host side.

## Events

`oas-toggle` is emitted after every toggle, `detail: { open }`, in both controlled and uncontrolled modes.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // import must stay inside onMounted: top-level await import is evaluated during vitepress build SSR (no HTMLElement in Node) and blanks the page
  const { message } = await import('@oas-ui/ui')
  window.message = message
  // Controlled toggle: property/method calls must wait for the upgrade, otherwise an expando shadows native behavior
  const ctrl = document.querySelector('#collapsible-ctrl')
  const setState = (open) => {
    const state = document.querySelector('#collapsible-state')
    if (state) state.textContent = open ? 'Open' : 'Collapsed'
  }
  window.collapsibleToggle = () =>
    customElements.whenDefined('oas-collapsible').then(() => {
      const open = ctrl?.getAttribute('open') !== 'false'
      ctrl?.setAttribute('open', open ? 'false' : '')
      // External attribute writes do not dispatch oas-toggle (the event fires on user clicks only); sync the feedback text here
      setState(!open)
    })
  ctrl?.addEventListener('oas-toggle', (e) => {
    setState(e.detail.open)
  })
})
</script>

## Disabled

<DemoBlock title="disabled trigger">
  <div style="width: 100%">
    <oas-collapsible header="Disabled panel" disabled>
      <p>Disabled state: the trigger cannot be focused or clicked and emits no events.</p>
    </oas-collapsible>
  </div>
</DemoBlock>

`disabled` renders dimmed; the config-provider global disabled injection applies as well.

## Rich Trigger Content

<DemoBlock title="slot=&quot;header&quot; custom trigger">
  <div style="width: 100%">
    <oas-collapsible>
      <span slot="header"><b>Release plan</b> (a sprint every two weeks)</span>
      <p>Trigger content comes from slot="header" and takes precedence over the header attribute; icons, tags, and any other content are allowed.</p>
    </oas-collapsible>
  </div>
</DemoBlock>

## Custom Toggle Icon

<DemoBlock title="template[slot=&quot;toggle&quot;] custom toggle icon">
  <div style="width: 100%">
    <oas-collapsible header="Custom icon">
      <template slot="toggle">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 6l6 6 6-6"/></svg>
      </template>
      <p>The toggle icon is replaced with a downward chevron that rotates with the open state.</p>
    </oas-collapsible>
  </div>
</DemoBlock>

## Form Section Folding

<DemoBlock title="Scenario: settings page sections">
  <div style="width: 100%">
    <oas-collapsible header="Notifications" default-open>
      <p>Email notifications, desktop notifications, and do-not-disturb hours.</p>
    </oas-collapsible>
    <oas-collapsible header="Privacy">
      <p>Visibility, data sharing, and history cleanup.</p>
    </oas-collapsible>
  </div>
</DemoBlock>

Multiple collapsibles toggle independently (no accordion exclusivity — use `oas-collapse accordion` for orchestrated exclusivity).

## No-JS Fallback

When the component is not upgraded (no JS), the light DOM content renders as plain visible content — folding capability degrades, information is not lost.

## API

### oas-collapsible

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `default-open` | Uncontrolled initial open state (value semantics: anything other than "false" opens, so framework-serialized "false" bindings collapse correctly): seeds the first frame, afterwards self-managed and never written back; ignored when the open attribute is present (controlled mode) | — | — |
| `disabled` | Disables the trigger: not focusable, not clickable, emits no events; the config-provider global disabled injection applies as well | `boolean` | — |
| `header` | Trigger text (rendered inside the trigger button; rich content via slot="header", slot wins) | `string` | — |
| `open` | Open state (controlled switch): attribute absent = uncontrolled self-managed (seeded by default-open on the first frame); attribute present = controlled (any value other than "false" is open, "false" is collapsed), clicks flip, write the attribute back and emit (optimistic update) | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-toggle` | Emitted after the open state changes, detail { open } (both controlled and uncontrolled modes) |

#### Slots

| Name | Description |
| --- | --- |
| default | Collapsible body content |
| `header` | Rich trigger content slot, overrides the header attribute text |
| `template[slot="toggle"]` | Custom toggle icon template (built-in arrow by default) |
