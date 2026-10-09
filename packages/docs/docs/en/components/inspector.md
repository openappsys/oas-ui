# Inspector

A right-side (optionally left) property editing panel: tab strip + collapsible sections + label/control rows. Design-tool sidebar semantics (`role="complementary"`) — distinct from `oas-sidebar` (a navigation menu): the inspector is contextual property editing.

## Basic usage

The container hosts `slot="tabs"` (tab strip) and the default slot (sections); `oas-inspector-tabs` takes its `items` via the JSON declarative channel, `value` is attribute-as-state; sections use `oas-inspector-section`, property rows use `oas-inspector-row`.

<DemoBlock title="Tab strip + sections + property rows">
  <oas-inspector style="height: 360px">
    <oas-inspector-tabs slot="tabs" items='[{"label":"Summary","value":"summary"},{"label":"File","value":"file"}]' value="summary"></oas-inspector-tabs>
    <oas-inspector-section heading="Transform" name="transform" collapsible default-open>
      <oas-inspector-row label="Position X" value="128 px"></oas-inspector-row>
      <oas-inspector-row label="Position Y" value="256 px"></oas-inspector-row>
      <oas-inspector-row label="Rotation" value="15°"></oas-inspector-row>
    </oas-inspector-section>
    <oas-inspector-section heading="Appearance" name="appearance" collapsible default-open>
      <oas-inspector-row label="Opacity"><oas-slider value="80"></oas-slider></oas-inspector-row>
      <oas-inspector-row label="Blend mode" value="Normal"></oas-inspector-row>
    </oas-inspector-section>
    <oas-inspector-section heading="Export" name="export" collapsible>
      <oas-inspector-row label="Format" value="PNG"></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
</DemoBlock>

## Tab strip (oas-inspector-tabs)

Click or arrow keys to switch (roving tabindex + Home/End, mirrored in RTL); dispatches `oas-change` (detail `{ value }`); `value` is attribute-as-state (the component reflects it on switch — hosts may coordinate by listening).

<DemoBlock title="Tab switch feedback">
  <oas-inspector id="insp-tabs" style="height: 200px">
    <oas-inspector-tabs id="insp-tabs-bar" slot="tabs" items='[{"label":"Summary","value":"summary"},{"label":"File","value":"file"},{"label":"Marks","value":"marks"}]' value="summary"></oas-inspector-tabs>
    <oas-inspector-row label="Color space" value="Rec. 709"></oas-inspector-row>
  </oas-inspector>
  <p id="insp-tabs-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click a tab or use arrow keys; watch the oas-change feedback.</p>
</DemoBlock>

## Collapsible sections (oas-inspector-section)

`collapsible` enables folding (`aria-expanded` kept in sync); `open` is attribute-as-state (click toggles and reflects); `default-open` expands initially; clicking dispatches `oas-toggle` (detail `{ name, open }`); `slot="extra"` holds end-of-header actions (decoupled from the fold click).

<DemoBlock title="Fold toggle feedback">
  <oas-inspector id="insp-fold" style="height: 240px">
    <oas-inspector-section heading="Typography" name="typography" collapsible>
      <oas-inspector-row label="Font size" value="16 px"></oas-inspector-row>
      <oas-inspector-row label="Line height" value="1.6"></oas-inspector-row>
    </oas-inspector-section>
    <oas-inspector-section heading="Stroke" name="stroke" collapsible>
      <oas-inspector-row label="Width" value="2 px"></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
  <p id="insp-fold-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click section headers to fold/unfold; watch the oas-toggle feedback (name + open).</p>
</DemoBlock>

## Row forms: key-value / control / mixed / row reset

`oas-inspector-row` has two forms: with no default-slot content it is a **key-value row** (`value` in tabular numerals); with slotted content it is a **control row** (50/50 split, form controls provided by the host); `mixed` shows the multi-selection mixed state (built-in copy); `reset` shows a row-level reset button that dispatches `oas-row-reset`.

<DemoBlock title="All row forms">
  <oas-inspector style="height: 260px">
    <oas-inspector-section heading="Camera" collapsible default-open>
      <oas-inspector-row label="Frame rate" value="25 fps"></oas-inspector-row>
      <oas-inspector-row label="Resolution" value="3840 × 2160"></oas-inspector-row>
      <oas-inspector-row label="Exposure" value="-0.5" reset></oas-inspector-row>
      <oas-inspector-row label="Gain (multi)" mixed></oas-inspector-row>
      <oas-inspector-row label="White balance"><oas-slider value="5600"></oas-slider></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
</DemoBlock>

## Striping and top alignment (striped / align-top)

`striped` adds a zebra background (value goes through `--oas-inspector-row-striped-bg`, falling back to the theme-aware `--oas-color-bg-hover`); `align-top` aligns the label with the top of the control, for rows with tall controls (e.g. multiline text).

<DemoBlock title="striped + align-top">
  <oas-inspector style="height: 220px">
    <oas-inspector-section heading="Alignment &amp; striping" collapsible default-open>
      <oas-inspector-row label="Plain row" value="Centered"></oas-inspector-row>
      <oas-inspector-row label="Striped row" value="Tinted" striped></oas-inspector-row>
      <oas-inspector-row label="Notes (top-aligned)" align-top><oas-textarea rows="3" placeholder="Multiline notes"></oas-textarea></oas-inspector-row>
    </oas-inspector-section>
  </oas-inspector>
</DemoBlock>

## Empty state (empty)

The `empty` boolean attribute switches to the no-selection state: the default slot hides and `slot="empty"` shows (built-in copy "No selection" by default).

<DemoBlock title="No-selection empty state">
  <div style="display: flex; gap: var(--oas-space-3); align-items: stretch">
    <oas-inspector empty style="height: 160px"></oas-inspector>
    <oas-inspector empty style="height: 160px">
      <div slot="empty">Select a layer on the canvas first</div>
    </oas-inspector>
  </div>
</DemoBlock>

## Density (density), panel side (side) and RTL

`density="compact"` tightens row height / spacing (24px row tier, delivered to children via tokens); `side="left"` switches the divider-direction semantic hook (positioning stays with the host layout); with `dir="rtl"` on the container the component mirrors automatically.

<DemoBlock title="default / compact / side=left comparison">
  <div style="display: flex; gap: var(--oas-space-3); align-items: stretch">
    <oas-inspector style="height: 180px">
      <oas-inspector-section heading="Default density" collapsible default-open>
        <oas-inspector-row label="Position" value="128, 256"></oas-inspector-row>
        <oas-inspector-row label="Scale" value="100%"></oas-inspector-row>
      </oas-inspector-section>
    </oas-inspector>
    <oas-inspector density="compact" style="height: 180px">
      <oas-inspector-section heading="Compact density" collapsible default-open>
        <oas-inspector-row label="Position" value="128, 256"></oas-inspector-row>
        <oas-inspector-row label="Scale" value="100%"></oas-inspector-row>
      </oas-inspector-section>
    </oas-inspector>
    <oas-inspector side="left" style="height: 180px">
      <oas-inspector-section heading="Left panel (side=left)" collapsible default-open>
        <oas-inspector-row label="Divider at inline-end" value="—"></oas-inspector-row>
      </oas-inspector-section>
    </oas-inspector>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tabsBar = document.getElementById('insp-tabs-bar')
  const tabsOut = document.getElementById('insp-tabs-out')
  tabsBar?.addEventListener('oas-change', (e) => {
    tabsOut.textContent = `oas-change dispatched: value=${e.detail.value} (value attribute reflected)`
  })
  const fold = document.getElementById('insp-fold')
  const foldOut = document.getElementById('insp-fold-out')
  fold?.addEventListener('oas-toggle', (e) => {
    foldOut.textContent = `oas-toggle dispatched: name=${e.detail.name}, open=${e.detail.open}`
  })
})
</script>

## API

### oas-inspector

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active-tab` | Current tab (paired with oas-inspector-tabs; attribute-as-state) | — | — |
| `density` | Density tier: default (row height 28px) / compact (row height 24px, tightened spacing, delivered to children via tokens); invalid values fall back to default with a one-time warning | `string` | `default` |
| `empty` | No-selection state: the default slot hides and the empty slot (built-in "No selection" copy by default) shows | `boolean` | — |
| `label` | Accessible name (falls back to the i18n "Inspector" default) | `string` | — |
| `side` | Panel side: right (default) / left (divider-direction semantic hook only; positioning is decided by host layout); invalid values fall back to right with a one-time warning | `string` | `right` |

#### Slots

| Name | Description |
| --- | --- |
| default | Sections / content area (oas-inspector-section etc.) |
| `empty` | No-selection content (overrides the built-in copy) |
| `footer` | Bottom area |
| `header` | Top area |
| `tabs` | Tab strip channel (oas-inspector-tabs) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-inspector-bg` | `var(--oas-color-bg)` |
| `--oas-inspector-gap` | `var(--oas-space-2)` |
| `--oas-inspector-width` | `280px` |
