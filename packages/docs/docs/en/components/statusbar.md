# StatusBar

A bottom silent information strip: left/right segmented cells + clickable items + background activity spinner + warning/progress semantic colors. Distinct from `oas-footer` (a content footer) — the statusbar carries status vocabulary (aggregate counts, current selection, sync state).

## Basic usage

The default slot holds left-segment cells (workspace-wide aggregate state); `slot="end"` holds the right segment (secondary/context items, pushed to the far end, mirrored in RTL). Numeric cells combine `value` + `label` (`value` uses tabular numerals). Fully empty cells (no `label` / `value` / `icon` / `spinning`) render nothing (the host gets `data-empty` and drops out entirely — no layout footprint, no leftover gap).

<DemoBlock title="Scene counts, selection and sync state">
  <div style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item label="Scenes" value="15"></oas-statusbar-item>
      <oas-statusbar-item label="Sources" value="210"></oas-statusbar-item>
      <oas-statusbar-item label="Selected" value="1"></oas-statusbar-item>
      <oas-statusbar-item label="IMG_4038.CR3"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="Branch" value="main"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="UTF-8"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

## Clickable cells (button)

The `button` boolean attribute renders the cell as a native button (keyboard reachable); clicking dispatches `oas-item-click` (detail `{ value, label }`, listenable on the container or the host).

<DemoBlock title="Cells that trigger commands">
  <div style="width: 100%">
    <oas-statusbar id="sb-click">
      <oas-statusbar-item button label="Problems" value="3" status="info"></oas-statusbar-item>
      <oas-statusbar-item button label="Sync" value="1m ago"></oas-statusbar-item>
      <oas-statusbar-item slot="end" button label="Help"></oas-statusbar-item>
    </oas-statusbar>
  </div>
  <p id="sb-click-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click the clickable items in the left segment and watch the oas-item-click feedback.</p>
</DemoBlock>

## Semantic colors and background activity (status / spinning)

The `status` semantic tiers: `default` / `info` / `warning` / `error` / `progress` — warning/error use background fills (reserved for special, necessary cases per status-bar convention), info/progress only tint the text; `spinning` shows a background-activity spinner (stopped under `prefers-reduced-motion`).

<DemoBlock title="Status tiers">
  <div style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item label="Rendering" spinning status="progress"></oas-statusbar-item>
      <oas-statusbar-item label="Sync" status="info"></oas-statusbar-item>
      <oas-statusbar-item label="Warnings" value="2" status="warning"></oas-statusbar-item>
      <oas-statusbar-item label="Offline" status="error"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="48 kHz"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

## Icons (icon)

The `icon` attribute pulls from the built-in icon registry (`@oas-ui/icons`; unknown names render nothing).

<DemoBlock title="Icon cells">
  <div style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item icon="check" label="Saved"></oas-statusbar-item>
      <oas-statusbar-item icon="clock" label="Auto backup" value="5 min ago"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

## RTL

With `dir="rtl"` on the container the component mirrors automatically: `data-rtl` hook + logical-properties-only layout; the `end` segment is pushed to the far end of the writing direction.

<DemoBlock title="RTL mirror">
  <div dir="rtl" style="width: 100%">
    <oas-statusbar>
      <oas-statusbar-item label="المشاهد" value="15"></oas-statusbar-item>
      <oas-statusbar-item slot="end" label="الفرع" value="main"></oas-statusbar-item>
    </oas-statusbar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const bar = document.getElementById('sb-click')
  const out = document.getElementById('sb-click-out')
  bar?.addEventListener('oas-item-click', (e) => {
    out.textContent = `oas-item-click dispatched: label=${e.detail.label}, value=${e.detail.value || '(empty)'}`
  })
})
</script>

## API

### oas-statusbar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Accessible name (falls back to the i18n "Status bar" default) | `string` | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Left-segment status cells (workspace-wide aggregate state) |
| `end` | Right-segment status cells (secondary/context items, pushed to the far end of the writing direction) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-statusbar-bg` | `var(--oas-color-bg-elevated)` |
| `--oas-statusbar-height` | `24px` |

### oas-statusbar-item

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `button` | Renders as a native button (clickable, keyboard reachable); read-only div semantics by default | `boolean` | — |
| `icon` | Built-in icon name (@oas-ui/icons registry; unknown names render nothing) | `string` | — |
| `label` | Text label | `string` | — |
| `spinning` | Background-activity spinner (stopped under prefers-reduced-motion) | `boolean` | — |
| `status` | Semantic color tier: default / info / warning / error / progress — warning/error use background fills (reserved for special, necessary cases), info/progress only tint the text; invalid values fall back to default with a one-time warning | `string` | `default` |
| `value` | Numeric / status value (rendered in tabular numerals) | `string` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-item-click` | Dispatched on click in button mode; detail { value, label }; bubbles + composed (listenable on the container or the host) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-statusbar-error-bg` | `var(--oas-color-danger)` |
| `--oas-statusbar-info-color` | `color-mix(in srgb, var(--oas-color-info-text) 88%, var(--oas-color-text-primary))` |
| `--oas-statusbar-item-height` | `22px` |
| `--oas-statusbar-item-hover-bg` | `var(--oas-color-bg-hover)` |
| `--oas-statusbar-progress-color` | `var(--oas-color-primary-text)` |
| `--oas-statusbar-warning-bg` | `var(--oas-color-warning)` |
