# Rate

A star rating supporting keyboard arrow-key adjustment, half-star interaction, hover preview, readonly display, and touch drag; clicking the currently selected star clears the value by default.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-rate value="3"></oas-rate>
</DemoBlock>

## Custom Count

<DemoBlock title="max">
  <oas-rate value="7" max="10"></oas-rate>
</DemoBlock>

Set the number of stars via `max`.

## Half Stars

<DemoBlock title="Half stars (allow-half)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-half" value="3.5" allow-half></oas-rate>
    <span id="rate-half-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
</DemoBlock>

With `allow-half`, half stars are interactive: clicking the **left half** of a star rates `i-0.5`, the **right half** rates `i`; keyboard `←`/`→` step by `0.5`.

## Hover Preview

<DemoBlock title="Hover preview (oas-hover)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-hover" value="2"></oas-rate>
    <span id="rate-hover-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
</DemoBlock>

Stars fill with the preview value while hovering (the `value` is not committed) and `oas-hover` is dispatched (`detail: { value }`); leaving the component dispatches `detail: { value: null }` and the display falls back to the committed value. With `allow-half` the preview also snaps to `0.5` by half region.

## Clear on Click

<DemoBlock title="Clear on click (allow-clear)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-clear" value="3"></oas-rate>
    <span id="rate-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); margin-top: var(--oas-space-2); flex-wrap: wrap;">
    <oas-rate value="4" allow-clear="false"></oas-rate>
    <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">allow-clear="false": clicking the selected star does not clear</span>
  </div>
</DemoBlock>

`allow-clear` is enabled by default: clicking the currently selected star again clears it to `0` and dispatches `oas-change` (`detail: { value: 0 }`); setting it to `"false"` disables clearing on click.

## Sizes

<DemoBlock title="Sizes (size)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate size="small" value="3"></oas-rate>
    <oas-rate value="3"></oas-rate>
    <oas-rate size="large" value="3"></oas-rate>
  </div>
</DemoBlock>

Three size tiers: `small` (16px) / `medium` (default, 20px) / `large` (28px); fine-tune via the `--oas-rate-star-size` CSS variable; invalid values fall back to `medium` with a warning.

## Custom Icon (icon property)

<DemoBlock title="Custom icon (icon property)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate icon="♥" value="3"></oas-rate>
    <oas-rate icon="☕" value="2"></oas-rate>
    <oas-rate icon="⚡" value="5"></oas-rate>
  </div>
</DemoBlock>

Pass a character or SVG markup via the `icon` property to replace the star icon:

<DemoBlock title="Custom icon (icon property · SVG)">
  <oas-rate icon="<svg viewBox='0 0 16 16' width='20' height='20' aria-hidden='true' focusable='false'><path d='M8 1 L9.6 5.2 L14 5.8 L10.9 8.8 L11.8 13.2 L8 11 L4.2 13.2 L5.1 8.8 L2 5.8 L6.4 5.2 Z' fill='currentColor'/></svg>" value="4"></oas-rate>
</DemoBlock>

## Custom Icon (slot)

<DemoBlock title="Custom icon (slot)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4">
      <span slot="icon">★</span>
    </oas-rate>
    <oas-rate value="2">
      <svg slot="icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 2 L10 6.2 L14.5 6.8 L11.2 9.9 L12.2 14.4 L8 12.2 L3.8 14.4 L4.8 9.9 L1.5 6.8 L6 6.2 Z" fill="currentColor"/></svg>
    </oas-rate>
  </div>
</DemoBlock>

Pass any element via `slot="icon"`; it is cloned onto every star. Priority: `icon` property > `slot="icon"` > default star.

## Dual-State Icons

<DemoBlock title="Dual-state icons (void-icon)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="3" icon="❤" void-icon="♡"></oas-rate>
    <oas-rate value="2">
      <span slot="icon">●</span>
      <span slot="void-icon">○</span>
    </oas-rate>
  </div>
</DemoBlock>

Unselected stars use `void-icon` (property or `slot="void-icon"`); selected stars keep the `icon` channel. A half star renders the void icon as its base and the selected icon as the clipped overlay. Without void customization both states share the same icon and differ only by color (the default outlined star is naturally dual-state).

## Per-Value Symbols

<DemoBlock title="Per-value symbols (icons property / slot=icon-N)">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4" icons='["😡","😠","😐","🙂","😍"]'></oas-rate>
    <oas-rate value="2" highlight-selected-only icons='["😴","😪","😐","🙂","🤩"]'></oas-rate>
    <oas-rate value="5">
      <span slot="icon-1">1</span>
      <span slot="icon-2">2</span>
      <span slot="icon-3">3</span>
      <span slot="icon-4">4</span>
      <span slot="icon-5">5</span>
    </oas-rate>
  </div>
</DemoBlock>

Each star can have a different symbol via two channels:

- `icons` property: JSON string array (or property `el.icons = [...]`), per-star override;
- `slot="icon-N"`: declarative per-position slot (N starts at 1).

Per-star priority: `icons[i]` > `slot="icon-N"` > `icon` property > `slot="icon"` > default star.

`highlight-selected-only` switches the fill rule to "only the selected star lights up" — essential for per-value emoji grading (otherwise all stars before the selection light up too).

## Emoji Grading

<DemoBlock title="Emoji grading (icons + highlight-selected-only)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-grading" value="4" highlight-selected-only icons='["😞","😞","😐","😄","😄"]'></oas-rate>
    <span id="rate-grading-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
  </div>
</DemoBlock>

The "≤ 2 😞 / ≤ 3 😐 / otherwise 😄" graded-expression effect needs no component-level switch — combine per-value `icons` with `highlight-selected-only` (click the rating above to switch expressions).

## Custom Colors

<DemoBlock title="Custom colors (color / void-color)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4" color="red"></oas-rate>
    <oas-rate value="3" color="#7c3aed" void-color="var(--oas-color-text-secondary)"></oas-rate>
  </div>
</DemoBlock>

`color` sets the active star color and `void-color` the inactive one; both support the 11 preset names (mapped to `--oas-preset-*`, dark-adaptive) and any CSS color value. Defaults fall back to the `--oas-color-warning` / `--oas-color-border` tokens (also customizable in bulk via the `--oas-rate-active` / `--oas-rate-void` variables).

## Threshold Segment Colors

<DemoBlock title="Threshold segment colors (colors)">
  <oas-rate value="2" colors='["red","gold","green"]'></oas-rate>
</DemoBlock>

`colors` changes color by score segment (low scores red, high green): a JSON string array or property `el.colors = [...]`; segment boundaries divide `max` evenly (3 colors = thirds), and the hover preview follows. Priority: `colors` > `color` > default tokens.

## Auxiliary Text

<DemoBlock title="Auxiliary text (texts + show-text)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate value="4" show-text texts="Terrible,Disappointed,Meh,Satisfied,Amazed"></oas-rate>
    <oas-rate value="3.5" allow-half show-text texts="Terrible,Disappointed,Meh,Satisfied,Amazed"></oas-rate>
  </div>
</DemoBlock>

`show-text` displays the text for the current score on the right; `texts` is comma-separated (half values take the `ceil` tier). When `texts` is set, `aria-valuetext` is synchronized for screen readers.

## Score Display

<DemoBlock title="Score display (show-score + score-template)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate value="3.5" allow-half show-score></oas-rate>
    <oas-rate value="4" readonly show-score score-template="Score: {value} / 5"></oas-rate>
  </div>
</DemoBlock>

`show-score` displays the score on the right; `score-template` uses the `{value}` placeholder (defaults to the plain number). When both are set, `show-score` takes precedence over `show-text`.

## Readonly

<DemoBlock title="Readonly (readonly)">
  <div style="display: flex; align-items: center; gap: var(--oas-space-4); flex-wrap: wrap;">
    <oas-rate value="3.7" readonly show-score></oas-rate>
    <oas-rate value="4" readonly></oas-rate>
    <oas-rate value="4" disabled></oas-rate>
  </div>
</DemoBlock>

`readonly` is independent of `disabled`: no dimming, no response to click/keyboard/hover preview; the value displays normally and still submits with the form system (`aria-readonly` synchronized). Readonly display supports **arbitrary decimals** (e.g. `3.7` renders by overlay width). `disabled` dims the control and expresses the disabled semantic instead.

## Disabled

<DemoBlock title="Disabled">
  <oas-rate value="4" disabled></oas-rate>
</DemoBlock>

## Per-Star Tooltips

<DemoBlock title="Per-star tooltips (tooltips)">
  <oas-rate value="4" tooltips="Very bad,Bad,Average,Good,Great"></oas-rate>
</DemoBlock>

`tooltips` is a comma-separated per-star text list; hovering a star shows a floating tip (light `oas-tooltip` integration with viewport-coordinate positioning). Stars beyond the list length show no tip.

## Touch Drag

<DemoBlock title="Touch drag (slide to rate)">
  <oas-rate value="3" allow-half></oas-rate>
</DemoBlock>

On touch devices, press and slide to rate continuously (`0.5` granularity by half region with `allow-half`); the synthetic click after dragging never triggers the clear-on-click path. Desktop mice keep the hover-preview + click path. Try it on a touch device.

## Events

<DemoBlock title="Change events">
  <oas-rate id="rate-event" value="2"></oas-rate>
  <span id="rate-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

Listen to `oas-change` (on click, clear, or keyboard adjustment, `detail: { value }`):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('rate-event')
  const out = document.getElementById('rate-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  const clearEl = document.getElementById('rate-clear')
  const clearOut = document.getElementById('rate-clear-output')
  clearEl?.addEventListener('oas-change', (e) => {
    clearOut.textContent = `oas-change: ${e.detail.value}`
  })

  const halfEl = document.getElementById('rate-half')
  const halfOut = document.getElementById('rate-half-output')
  halfEl?.addEventListener('oas-change', (e) => {
    halfOut.textContent = `oas-change: ${e.detail.value}`
  })

  const hoverEl = document.getElementById('rate-hover')
  const hoverOut = document.getElementById('rate-hover-output')
  hoverEl?.addEventListener('oas-hover', (e) => {
    hoverOut.textContent = `oas-hover: ${e.detail.value}`
  })

  const gradingEl = document.getElementById('rate-grading')
  const gradingOut = document.getElementById('rate-grading-output')
  gradingEl?.addEventListener('oas-change', (e) => {
    gradingOut.textContent = `Scored ${e.detail.value}`
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `allow-clear` | Clear to `0` when clicking the currently selected star | `string` | `true` |
| `allow-half` | Allow half stars | `boolean` | — |
| `color` | Selected color (preset name or any CSS color) | — | — |
| `colors` | Threshold colors as a JSON array (segments split evenly across max, e.g. `["#f5222d","#faad14","#52c41a"]` for three bands) | `string[] \| null` | — |
| `disabled` | Disabled | `boolean` | — |
| `highlight-selected-only` | Highlight only the selected star (others stay unselected-colored) | `boolean` | — |
| `icon` | Custom star icon (character or SVG markup) | — | — |
| `icons` | Per-value icons as a JSON array (a different icon per value, e.g. grading 😞😞😐😄😄; arrays may also be assigned via property) | `string[] \| null` | — |
| `max` | Number of stars | `string` | `5` |
| `readonly` | Read-only (independent of disabled: non-interactive, normally displayed, still submitted with the form) | `boolean` | — |
| `score-template` | Score template string with a `{value}` placeholder (e.g. `"{value} points"`); takes precedence over show-text | `string` | `{value}` |
| `show-score` | Show the numeric score in read-only scenarios (pair with score-template) | `boolean` | — |
| `show-text` | Show the text for the current value (texts) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default 20px) / `large` (28px) | `string` | — |
| `texts` | Per-value helper texts (comma-separated, pair with show-text) | — | — |
| `tooltips` | Per-star tooltip texts (comma-separated, shown on star hover; light oas-tooltip integration) | — | — |
| `value` | Current score (controlled) | `string` | `0` |
| `void-color` | Unselected color | — | — |
| `void-icon` | Unselected icon name (e.g. heart for a ♥/♡ dual state) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Score change, `detail: { value }` |
| `oas-hover` | Fires on star hover, `detail: { value }`; `{ value: null }` on leave |

### Slots

| Name | Description |
| --- | --- |
| `icon` | — |
| `void-icon` | — |

Icon customization: `icon` property > `slot="icon"` (cloned to each star) > default star.

Keyboard: `←`/`→` (or `↑`/`↓`) to adjust, `Home` to reset to zero, `End` to fill.
