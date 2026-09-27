# Splitter

A split component that resizes panel sizes, adjustable via mouse drag, arrow keys, double-click reset, with collapse, lazy rendering, multi-panel and custom handle support.

## Basic usage

<DemoBlock title="Default 50/50">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Custom initial ratio

<DemoBlock title="30% / 70%">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="30">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel 30%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Range limits

<DemoBlock title="min / max as percentages">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" min="20" max="80">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel 20% ~ 80%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Pixel min/max

min / max also accept pixel values: a `200px` suffix clamps in pixels (relative to the container size), plain numbers remain percentages.

<DemoBlock title='min="200px" max="500px"'>
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" min="200px" max="500px">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel 200px ~ 500px</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Snap points (snap)

`snap` defines snap stops (comma-separated percentages such as `25,50,75`; `200px` pixel values are also supported and converted against the container): while dragging, values within **±8px of a stop snap to it**; the arrow keys then **jump between stops** (falling back to ±1% nudging when no stop remains in that direction). Stops outside min / max are unreachable (min/max wins).

<DemoBlock title="snap snapping">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="primary" id="splitter-snap-info">Left ratio: 50%</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter id="splitter-snap-demo" percent="50" snap="25,50,75">
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel</div>
      </oas-splitter>
    </div>
    <oas-tag type="info">Release near 25% / 50% / 75% to snap; focus the divider and ← / → jump between stops</oas-tag>
  </oas-space>
</DemoBlock>

## Vertical direction

The `vertical` attribute stacks panels top-to-bottom with a horizontal divider; use the ↑ / ↓ arrow keys.

<DemoBlock title="vertical stacking">
  <div style="height: 260px; width: 100%">
    <oas-splitter vertical percent="40">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Top panel 40%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Collapse

The `collapsible` attribute shows a collapse button on the divider; click to collapse/expand the preceding panel. The collapsed state is written back to the `collapsed` attribute and an `oas-collapse` event is fired.

<DemoBlock title="collapsible collapse / expand">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="primary" id="splitter-collapse-info">Left panel: expanded</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter id="splitter-collapse-demo" percent="50" collapsible>
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel</div>
      </oas-splitter>
    </div>
  </oas-space>
</DemoBlock>

<DemoBlock title="collapsed — initially folded">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50" collapsible collapsed>
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel (initially collapsed)</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Double-click reset

Double-click a divider to reset it back to the initial ratio (handy after dragging). Reset also fires `oas-resize`.

<DemoBlock title="Double-click to reset">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">Drag the divider, then double-click it to reset to 30%</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter percent="30">
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel (initial 30%)</div>
      </oas-splitter>
    </div>
  </oas-space>
</DemoBlock>

## Lazy rendering

With the `lazy` attribute, dragging only moves the divider visually without re-rendering panel content in real time; sizes are written back and a single `oas-resize` fires on release. Suitable for heavy panels.

<DemoBlock title="lazy drag">
  <div style="height: 200px; width: 100%">
    <oas-splitter lazy percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Disabled

`disabled` freezes adjustments: the divider cannot be dragged, double-click reset and arrow-key nudging are disabled too, the cursor returns to normal and `aria-disabled="true"` is set (the host mirrors `data-disabled` for styling; config-provider global disabled injection works as well) — for display scenarios with locked layout ratios.

<DemoBlock title="disabled">
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="40" disabled>
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel 40% (locked)</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Custom handle

The `slot="handle"` lets you place custom handle content (icons/dots etc.) inside the divider; drag and keyboard still work.

<DemoBlock title='slot="handle" custom handle'>
  <div style="height: 200px; width: 100%">
    <oas-splitter percent="50">
      <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel</div>
      <div slot="handle" style="display: flex; gap: 2px; align-items: center">
        <span style="width: 4px; height: 4px; border-radius: 50%; background: var(--oas-color-primary)"></span>
        <span style="width: 4px; height: 4px; border-radius: 50%; background: var(--oas-color-primary)"></span>
        <span style="width: 4px; height: 4px; border-radius: 50%; background: var(--oas-color-primary)"></span>
      </div>
    </oas-splitter>
  </div>
</DemoBlock>

## Multiple panels

Each direct child element becomes a panel, with dividers automatically inserted between adjacent panels. The `sizes` attribute sets panel ratios as comma-separated percentages; mismatched counts fall back to an equal split. Each divider independently supports drag / keyboard / collapse.

<DemoBlock title="multiple three panels with sizes">
  <div style="height: 200px; width: 100%">
    <oas-splitter sizes="30,40,30" collapsible>
      <div style="height: 100%; display: flex; align-items: center; justify-content: center">Panel 1 30%</div>
      <div style="height: 100%; display: flex; align-items: center; justify-content: center">Panel 2 40%</div>
      <div style="height: 100%; display: flex; align-items: center; justify-content: center">Panel 3 30%</div>
    </oas-splitter>
  </div>
</DemoBlock>

## Resize event

<DemoBlock title="oas-resize event">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="primary" id="splitter-info">Left ratio: 50%</oas-tag>
    <div style="height: 200px; width: 100%">
      <oas-splitter id="splitter-demo" percent="50">
        <div slot="left" style="height: 100%; display: flex; align-items: center; justify-content: center">Left panel</div>
      </oas-splitter>
    </div>
    <oas-tag type="info">Drag the divider, or focus it and use the ← / → arrow keys to adjust</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const splitter = document.getElementById('splitter-demo')
  const info = document.getElementById('splitter-info')
  splitter?.addEventListener('oas-resize', (e) => {
    info.textContent = `Left ratio: ${e.detail.percent}%`
  })
  const collapseDemo = document.getElementById('splitter-collapse-demo')
  const collapseInfo = document.getElementById('splitter-collapse-info')
  collapseDemo?.addEventListener('oas-collapse', (e) => {
    collapseInfo.textContent = `Left panel: ${e.detail.collapsed ? 'collapsed' : 'expanded'}`
  })
  const snapDemo = document.getElementById('splitter-snap-demo')
  const snapInfo = document.getElementById('splitter-snap-info')
  snapDemo?.addEventListener('oas-resize', (e) => {
    snapInfo.textContent = `Left ratio: ${e.detail.percent}%`
  })
})
</script>

## API

### oas-splitter

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `collapsed` | Controlled collapse: when present, collapses the panel before the first divider (written back automatically on collapse; external set/remove takes effect immediately) | `boolean` | — |
| `collapsible` | Show a collapse button on the divider; click to collapse/expand the preceding panel | `boolean` | — |
| `disabled` | Freezes resizing: drag/keyboard/dblclick disabled, normal cursor, aria-disabled | `boolean` | — |
| `lazy` | Lazy rendering: while dragging, only the divider moves visually; sizes are written back and panels re-rendered on release (for heavy panels) | `boolean` | — |
| `max` | Maximum ratio of the preceding panel: numbers as percentage, `200px` suffix clamps in pixels; invalid values fall back to 90 | `string` | `90` |
| `min` | Minimum ratio of the preceding panel: numbers as percentage, `200px` suffix clamps in pixels; invalid values fall back to 10 | `string` | `10` |
| `percent` | Ratio of the preceding panel (%) | `string` | `50` |
| `sizes` | Multi-panel mode panel ratios (comma-separated percentages, e.g. `30,40,30`); falls back to equal split when count mismatches panel count | `string` | — |
| `snap` | Drag snap stops: comma-separated percentages or pixel values; dragging within ±8px of a stop snaps to it, arrow keys jump between stops | `string` | — |
| `vertical` | Vertical direction: panels stack top-to-bottom, divider is horizontal, keyboard uses ArrowUp/Down | `boolean` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-collapse` | Fired when the collapse button toggles, `detail: { collapsed, side }` (side=left means the panel before the divider) |
| `oas-resize` | Fired after resizing. Two-panel mode `detail: { percent }`; multi-panel mode `detail: { percent, index, sizes }` |

#### Slots

| Name | Description |
| --- | --- |
| `handle` | Custom handle content inside the divider (icon/dots etc.); falls back to the default grip |
| `left` | Left panel content (two-panel mode) |
| `right` | Right panel content (two-panel mode) |

The divider is `role="separator"` + `tabindex="0"`; once focused, `←` / `→` adjust by 1% each time.
