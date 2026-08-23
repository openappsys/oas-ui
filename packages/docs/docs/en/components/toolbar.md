# Toolbar

A container for groups of tool controls: `role="toolbar"` + `aria-label`, `Tab` enters and arrow keys move between controls (roving tabindex — only the current item is focused). Ships with three companion widgets — toggle group, separator, input — plus vertical layout, loop toggle, whole-bar disabled, size steps, overflow collapse and attached look.

## Basic usage (native buttons)

<DemoBlock title="Basic usage (native buttons)">
  <oas-toolbar>
    <button>Bold</button>
    <button>Italic</button>
    <button>Underline</button>
    <button>Strikethrough</button>
  </oas-toolbar>
</DemoBlock>

## Toggle group (editor scenario)

`oas-toolbar-toggle` is the toolbar's toggle-group widget: single-select (default, radio semantics — mutually exclusive, clicking the selected item does nothing) and multiple-select (`multiple`, each item toggles independently). `value` is controlled (string for single / JSON array string for multiple); clicks emit `oas-change`. Use a multiple group for bold/italic/underline and a single group for alignment — the core editor toolbar shape.

<DemoBlock title="Toggle group (bold/italic + alignment)">
  <oas-toolbar id="tb-editor">
    <oas-toolbar-toggle id="tb-style" multiple value='["bold","underline"]' items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"}]'></oas-toolbar-toggle>
    <oas-toolbar-separator></oas-toolbar-separator>
    <oas-toolbar-toggle id="tb-align" value="left" items='[{"label":"Align left","value":"left"},{"label":"Align center","value":"center"},{"label":"Align right","value":"right"}]'></oas-toolbar-toggle>
  </oas-toolbar>
  <oas-tag id="tb-editor-result" type="info">Style: bold, underline | Align: left</oas-tag>
</DemoBlock>

## Separator widget

`oas-toolbar-separator` replaces the old `oas-divider + data-toolbar-ignore` combo: it sets `role="separator"` automatically, is excluded from roving navigation, and its line direction follows the toolbar orientation (vertical line inside a horizontal toolbar, horizontal line inside a vertical one).

<DemoBlock title="oas-button + separator">
  <oas-toolbar>
    <oas-button>Cut</oas-button>
    <oas-button>Copy</oas-button>
    <oas-button>Paste</oas-button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <oas-button>Undo</oas-button>
    <oas-button>Redo</oas-button>
  </oas-toolbar>
</DemoBlock>

## Vertical toolbar

`orientation="vertical"`: `aria-orientation="vertical"` + vertical layout, `↑`/`↓` navigate along the axis (`←`/`→` still work); the separator becomes a horizontal line.

<DemoBlock title="Vertical toolbar">
  <oas-toolbar orientation="vertical">
    <oas-toolbar-toggle value="bold" items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"}]'></oas-toolbar-toggle>
    <oas-toolbar-separator></oas-toolbar-separator>
    <button>Save</button>
    <button>Save as</button>
  </oas-toolbar>
</DemoBlock>

## Loop navigation toggle

`loop` is on by default (arrow keys wrap around the ends); with `loop="false"` navigation stops at the ends.

<DemoBlock title="loop=false no wrap">
  <oas-toolbar loop="false">
    <button>One</button>
    <button>Two</button>
    <button>Three</button>
  </oas-toolbar>
</DemoBlock>

## Size steps

`size`: `small` / `medium` (default) / `large`. Affects toolbar spacing, native buttons and the built-in widgets (toggle group / input follow automatically).

<DemoBlock title="size steps">
  <oas-space size="small">
    <oas-toolbar size="small">
      <button>Save</button>
      <button>Print</button>
      <oas-toolbar-toggle value="bold" items='[{"label":"Bold","value":"bold"}]'></oas-toolbar-toggle>
    </oas-toolbar>
    <oas-toolbar size="large">
      <button>Save</button>
      <button>Print</button>
    </oas-toolbar>
  </oas-space>
</DemoBlock>

## Whole-bar disabled

`disabled` disables the whole toolbar (`aria-disabled` + `inert`, items skip roving); adding `focusable-when-disabled` keeps items focusable (`aria-disabled`, clicks are blocked — handy for tooltips explaining why).

<DemoBlock title="Whole-bar disabled">
  <oas-space size="small">
    <oas-toolbar disabled>
      <button>Save</button>
      <button>Print</button>
    </oas-toolbar>
    <oas-toolbar disabled focusable-when-disabled>
      <button>Save as</button>
      <button>Print</button>
    </oas-toolbar>
  </oas-space>
</DemoBlock>

## Disabled items

Buttons with `disabled` / `aria-disabled` are skipped by arrow-key navigation (roving skips them).

<DemoBlock title="Disabled items">
  <oas-toolbar>
    <button>Save</button>
    <button disabled>Save as</button>
    <button>Print</button>
  </oas-toolbar>
</DemoBlock>

## Link item

`a[href]` items join roving automatically and get `part="link"` (unified link styling and focus ring).

<DemoBlock title="Link item">
  <oas-toolbar>
    <button>Save</button>
    <button>Print</button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <a href="https://example.com">Help center</a>
  </oas-toolbar>
</DemoBlock>

## Far-aligned group

Add `data-toolbar-far` to an item: everything from that item onward is pushed to the far end (right-aligned in a horizontal toolbar, bottom-aligned in a vertical one) — handy for "primary actions left, settings/help right".

<DemoBlock title="Far-aligned group">
  <oas-toolbar>
    <button>Save</button>
    <button>Print</button>
    <button data-toolbar-far>Settings</button>
    <button>Help</button>
  </oas-toolbar>
</DemoBlock>

## start / end named slots

`slot="start"` content renders at the front of the toolbar, `slot="end"` at the tail (visual order: start → default → end; roving and overflow collapse follow this order). Prefer named slots for grouping; `data-toolbar-far` remains for backward compatibility (pushes an item to the far end — semantically close to the `end` slot), new code should prefer the `end` slot.

<DemoBlock title="start / end slots">
  <oas-toolbar>
    <oas-toolbar-toggle slot="start" multiple value='["bold"]' items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"}]'></oas-toolbar-toggle>
    <button>Save</button>
    <button>Print</button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <oas-toolbar-input slot="end" placeholder="Search…"></oas-toolbar-input>
    <button slot="end">Help</button>
  </oas-toolbar>
</DemoBlock>

## Toolbar input widget

`oas-toolbar-input`: joins roving as a single tab stop (composite special case — while focus is inside the input, arrow keys are consumed by text editing; `Tab` leaves and toolbar navigation continues). `oas-input` fires while typing, `oas-change` on Enter/blur commit.

<DemoBlock title="Toolbar input">
  <oas-toolbar id="tb-input">
    <oas-toolbar-input id="tb-search" placeholder="Search…"></oas-toolbar-input>
    <oas-toolbar-separator></oas-toolbar-separator>
    <button>Search</button>
    <oas-toolbar-input placeholder="Disabled" disabled></oas-toolbar-input>
  </oas-toolbar>
  <oas-tag id="tb-input-result" type="info">input: -</oas-tag>
</DemoBlock>

## Overflow collapse (narrow container)

When the container is too narrow, overflowing items are folded into a "···" popup (`ResizeObserver` watches the width; click "···" to open mirrored items, clicking a mirror dispatches to the original control; the "···" highlights when a selected value is folded inside). Try shrinking the container below.

<DemoBlock title="Overflow collapse">
  <div style="width: 300px; overflow-x: clip">
    <oas-toolbar id="tb-overflow">
      <oas-toolbar-toggle value="bold" items='[{"label":"Bold","value":"bold"},{"label":"Italic","value":"italic"},{"label":"Underline","value":"underline"}]'></oas-toolbar-toggle>
      <oas-toolbar-separator></oas-toolbar-separator>
      <button>Copy</button>
      <button>Cut</button>
      <button>Paste</button>
      <button>Undo</button>
      <button>Redo</button>
      <button>Insert table</button>
      <button>Insert image</button>
      <button>Insert link</button>
    </oas-toolbar>
  </div>
</DemoBlock>

## Attached look (is-attached)

`is-attached`: containerized toolbar appearance (border + background + padding), nice when mounted next to another toolbar/panel.

<DemoBlock title="is-attached">
  <oas-toolbar is-attached>
    <button>Bold</button>
    <button>Italic</button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <button>Save</button>
  </oas-toolbar>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Editor toolbar: oas-change bubbles (toggle group → toolbar → page), read value back to update the tag
  const style = document.getElementById('tb-style')
  const align = document.getElementById('tb-align')
  const editorTag = document.getElementById('tb-editor-result')
  const syncEditor = () => {
    if (!style || !align || !editorTag) return
    const s = JSON.parse(style.getAttribute('value') || '[]')
    editorTag.textContent = `Style: ${s.join(', ') || 'none'} | Align: ${align.getAttribute('value') || 'none'}`
  }
  const tbEditor = document.getElementById('tb-editor')
  if (tbEditor) tbEditor.addEventListener('oas-change', syncEditor)
  syncEditor()

  // Toolbar input: read the inner input value (value attribute is the controlled entry, not written back)
  const search = document.getElementById('tb-search')
  const inputTag = document.getElementById('tb-input-result')
  const syncInput = () => {
    if (!search || !inputTag) return
    const v = search.shadowRoot?.querySelector('input')?.value || ''
    inputTag.textContent = `input: ${v || '-'}`
  }
  if (search) {
    search.addEventListener('oas-input', syncInput)
    search.addEventListener('oas-change', syncInput)
  }
  syncInput()
})
</script>

## API

### oas-toolbar

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disable the whole toolbar (`aria-disabled` + `inert`; items skip roving) | `boolean` | — |
| `focusable-when-disabled` | Keep items focusable while disabled (`aria-disabled` + clicks blocked; handy for tooltips explaining why) | `boolean` | — |
| `loop` | Wrap-around arrow navigation: on by default; `false` stops at the ends | `string` | — |
| `orientation` | Layout direction: `horizontal` (default) / `vertical` (arrow navigation follows the axis; separator becomes a horizontal line) | `string` | `horizontal` |
| `size` | Size step: `small` / `medium` (default) / `large` | `string` | — |

| Name | Description |
| --- | --- |
| default | Toolbar controls: buttons / oas-button / toggle group / input / links / separators, etc. |
| `end` | Content at the tail of the toolbar (rendered after the default content; participates in roving and overflow collapse; semantically close to `data-toolbar-far`, prefer this slot for new code) |
| `start` | Content at the front of the toolbar (rendered before the default content; participates in roving and overflow collapse) |

### oas-toolbar-toggle

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disable the whole group | `boolean` | — |
| `items` | Options JSON (property assignment reflects one-way to the attribute) | `ToolbarToggleItem[] \| string` | `[]` |
| `multiple` | Multiple-select mode (each item toggles independently) | `boolean` | — |
| `size` | Size step (small/medium/large); defaults to the nearest oas-toolbar's size | `string` | — |
| `value` | Current value: string for single-select; JSON array string for multiple-select | `string` | — |

| Event | Description |
| --- | --- |
| `oas-change` | Toggle, `detail: { value: string \| string[] }` |

### oas-toolbar-input

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disabled | `boolean` | — |
| `placeholder` | Placeholder text | `string` | — |
| `size` | Size step (small/medium/large); defaults to the nearest oas-toolbar's size | `string` | — |
| `value` | Preset value (controlled entry; events do not write back, listen to update) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-change` | Committed on Enter or blur, `detail: { value }` |
| `oas-input` | While typing, `detail: { value }` |

- The host has `role="toolbar"` + `aria-orientation`; `aria-label` comes from the locale key (`toolbar.label`)
- Children that join roving: native controls (`button`/`input`/`select`/`textarea`/`a[href]`), interactive `role`s, custom elements (tag contains `-`); `oas-toolbar-separator`, `data-toolbar-ignore` and `aria-hidden` are excluded, `disabled`/`aria-disabled` are skipped automatically (aria-disabled items stay focusable in `focusable-when-disabled` mode)
- Keyboard: `Tab` enters (only the current item is tab-reachable), `←`/`→` (or `↑`/`↓`) moves between controls, `Home`/`End` jumps to the first/last; while focus is inside the toggle group/input the arrow keys belong to the widget (`Tab` leaves and toolbar navigation continues)
- Overflow collapse: `ResizeObserver` watches the width, overflowing items fold into a "···" popup (horizontal only)
