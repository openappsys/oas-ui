# Cascader

Multi-level linked selection: multiple checkboxes, parent-child decoupled checking, value strategies, path search, lazy loading, controlled open and tag collapsing. Fully keyboard operable.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-cascader placeholder="Select province / city / district" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"},{"label":"Wenzhou","value":"wz"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"},{"label":"Suzhou","value":"sz"}]},{"label":"Sichuan","value":"sc","children":[{"label":"Chengdu","value":"cd"}]}]'></oas-cascader>
</DemoBlock>

Click to open the multi-level panel and drill down level by level until a leaf node is submitted.

## Select & Submit

<DemoBlock title="Select to submit (change-on-select)">
  <oas-cascader change-on-select placeholder="Submit at any level" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

With `change-on-select` enabled, clicking an option at any level (including nodes with children) immediately submits the current path.

## Preset Path

<DemoBlock title="Preset value (path array)">
  <oas-cascader value='["zj","hz"]' options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

`value` is a JSON array holding the selected value of each level; it is displayed joined as "Zhejiang / Hangzhou".

## Multiple

<DemoBlock title="Multiple selection (multiple)">
  <oas-cascader id="cs-multi" multiple placeholder="Batch picking" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
  <span id="cs-multi-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

In multiple mode `value` is a JSON array of path arrays. Each panel row has a checkbox: checking a parent cascades to all children, and a partially checked parent shows an indeterminate state. The trigger echoes selections as removable tags; the panel stays open after checking for consecutive picks.

## Check Strictly

<DemoBlock title="Parent-child decoupled (check-strictly)">
  <oas-cascader multiple check-strictly placeholder="Independent checking" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

With `check-strictly`, parent and child checks are independent: checking a parent submits only the parent path, and the value is exactly the checked set (`value-mode` has no effect in this mode).

## Value Mode

<DemoBlock title="Value strategy (value-mode)">
  <oas-cascader multiple value-mode="all" value='[["zj"]]' placeholder="all (default)" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]}]'></oas-cascader>
  <oas-cascader multiple value-mode="parentFirst" value='[["zj"],["zj","hz"]]' placeholder="parentFirst" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]}]'></oas-cascader>
  <oas-cascader multiple value-mode="onlyLeaf" value='[["zj"],["zj","hz"]]' placeholder="onlyLeaf" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]}]'></oas-cascader>
</DemoBlock>

`value-mode` decides which paths are submitted in multiple mode: `all` (default) = every checked node (a parent enters the value once all its children are checked, consistent with the single-select full-path model); `parentFirst` = fully checked children collapse into the parent; `onlyLeaf` = only leaf paths. Echo tags mirror the literal `value` (host presets are never rewritten); interactions converge per strategy on submit.

## Filterable

<DemoBlock title="Searchable (filterable)">
  <oas-cascader id="cs-search" filterable placeholder="Type a city name" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"},{"label":"Wenzhou","value":"wz"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"},{"label":"Suzhou","value":"sz"}]},{"label":"Sichuan","value":"sc","children":[{"label":"Chengdu","value":"cd"}]}]'></oas-cascader>
  <span id="cs-search-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

With `filterable`, a search box appears when the panel opens. Typing matches against the joined labels of every level and results are a flat path list; clicking a result selects that full path (checks it in multiple mode). An `oas-search` event is emitted while typing, and a custom matcher can be provided via `el.filter = (query, path) => boolean` (`path` is the array of option objects along the path).

## Lazy Loading

<DemoBlock title="Lazy loading (lazy + el.load)">
  <oas-cascader id="cs-lazy" placeholder="Load departments on demand" options='[{"label":"Tech Center","value":"tech"},{"label":"Operations","value":"ops"}]'></oas-cascader>
</DemoBlock>

After setting `el.load = ({ option, path, depth }) => Promise<options>`, expanding a not-yet-loaded node shows a loading state and fetches its children (`option` is null for the root level, so the first level can be lazy too). Options may declare `isLeaf: true` as leaves. This demo simulates a 500ms delay.

## Hover Expand

<DemoBlock title="Hover expand (expand-trigger=hover)">
  <oas-cascader expand-trigger="hover" placeholder="Hover to drill down" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

With `expand-trigger="hover"`, hovering a parent option (after a ~120ms anti-mistap delay) expands its child column; clicking a leaf submits. Default is `click`.

## Large Datasets (virtual scrolling)

<DemoBlock title="Virtual scrolling (1000-item column)">
  <oas-cascader id="cs-virtual" virtual placeholder="1000-item column, smooth scrolling" options='[]'></oas-cascader>
  <span id="cs-virtual-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

With `virtual`, columns above the threshold (50 items) render only the visible window (reusing `oas-virtual-list` window math with top/bottom padding holding the scroll height) — thousands of options scroll smoothly and the panel height stays constant; `item-height` tunes the fixed row height (default `36`). While navigating with `↑`/`↓` the window follows the highlighted row; short columns below the threshold, search results, and loading placeholders keep normal rendering.

## Last Level & Separator

<DemoBlock title="Last level only (show-all-levels) and separator">
  <oas-cascader show-all-levels="false" value='["zj","hz"]' placeholder="Last level only" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]}]'></oas-cascader>
  <oas-cascader separator=" - " value='["zj","hz"]' placeholder="Custom separator" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]}]'></oas-cascader>
</DemoBlock>

`show-all-levels` defaults to true (full path); setting it to `false` shows only the last label in the trigger. `separator` customizes the path separator (default ` / `), also applied in search result rows.

## Clearable

<DemoBlock title="Clearable (clearable)">
  <oas-cascader clearable value='["zj","hz"]' placeholder="Clearable" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]}]'></oas-cascader>
  <oas-cascader clearable multiple value='[["zj","hz"],["js","nj"]]' placeholder="Clearable multiple" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

A clear button appears when a value exists; clicking it emits `oas-clear` (detail is the previous value) and `oas-change` (empty value).

## Tag Collapsing

<DemoBlock title="Tag collapsing (max-tag-count)">
  <oas-cascader multiple max-tag-count="2" value='[["zj","hz"],["zj","nb"],["js","nj"]]' placeholder="Collapse overflow into +N" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

Tags wrap by default; explicitly setting `max-tag-count` folds them into `+N` by count (hover lists the hidden items), consistent with `oas-select`.

## Size & Status

<DemoBlock title="Size">
  <oas-cascader size="small" placeholder="small" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
  <oas-cascader placeholder="medium (default)" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
  <oas-cascader size="large" placeholder="large" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

<DemoBlock title="Validation status">
  <oas-cascader status="error" placeholder="error" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
  <oas-cascader status="warning" placeholder="warning" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
  <oas-cascader status="success" placeholder="success" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

`size` supports `small / medium / large` (inheriting the nearest `oas-config-provider` global size); `status` supports `error / warning / success` (`error` syncs `aria-invalid` on the trigger; forms may also set host-level `aria-invalid` directly).

## Controlled Open

<DemoBlock title="Controlled open (open + oas-open-change)">
  <oas-space size="small">
    <oas-button id="cs-open-btn" size="small">Toggle</oas-button>
    <oas-cascader id="cs-controlled" placeholder="Controlled by open" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]}]'></oas-cascader>
    <oas-tag id="cs-open-state" type="info">open: false</oas-tag>
  </oas-space>
</DemoBlock>

The `open` attribute is the single source of truth for the expanded state (controlled): open/close from inside or outside is written back to it, and `oas-open-change` (`detail.open`) is emitted on every flip; hosts may intercept the event to take full control. `Esc` closes and returns focus to the trigger.

## Empty

<DemoBlock title="Empty state">
  <oas-cascader placeholder="No options" options='[]'></oas-cascader>
</DemoBlock>

When options are empty (and `el.load` is not set) the panel shows the empty placeholder; a search with no matches shows the no-match placeholder.

## Loading state (loading)

<DemoBlock title="Loading state (loading)">
  <oas-space size="small">
    <oas-button size="small" onclick="document.querySelector('#cs-loading').setAttribute('loading','')">Enter loading</oas-button>
    <oas-button size="small" onclick="document.querySelector('#cs-loading').removeAttribute('loading')">Leave loading</oas-button>
    <oas-cascader id="cs-loading" placeholder="Pick a region" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
  </oas-space>
</DemoBlock>

While `loading` is set the trigger shows a spinner with `aria-busy` (replacing the chevron); an open panel only shows the loading placeholder without rendering options — ideal while the host fetches remote cascading data.

## Field mapping (field-names)

<DemoBlock title="Field mapping (field-names)">
  <oas-cascader id="cs-fields" placeholder="Data fields are name/id/subs/off" options='[{"name":"前端","id":"fe","subs":[{"name":"Vue","id":"vue","off":false}]},{"name":"设计","id":"design","subs":[{"name":"UI","id":"ui","off":true}]}]' field-names='{"label":"name","value":"id","children":"subs","disabled":"off"}'></oas-cascader>
  <span id="cs-fields-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

`field-names` is a JSON field alias (`{ label, value, children, disabled }`, matching the `oas-tree-select` contract); the component reads your raw data through the aliases (`isLeaf` always reads its original key). Data returned from lazy `el.load` goes through the same mapping. In the example above "设计 / UI" is disabled via the `off` field.

## Disabled

<DemoBlock title="Disabled">
  <oas-cascader disabled value='["zj","hz"]' placeholder="Disabled" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

## Accessible Name (label)

<DemoBlock title="label (accessible name)">
  <oas-cascader id="cs-label-set" label="Region" placeholder="Pick a region" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
  <oas-cascader id="cs-label-fallback" placeholder="No label, falls back to placeholder" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
  <span id="cs-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 280px"></span>
</DemoBlock>

`label` is the accessible name (`aria-label`) of the trigger: screen readers announce it and it takes precedence over the selected value text and the placeholder; without it the component falls back to value text / placeholder (matching the `oas-select` contract).

## Placement (placement)

<DemoBlock title="placement (12 directions)">
  <oas-space size="small">
    <oas-cascader placement="top-start" placeholder="top-start" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
    <oas-cascader placement="bottom" placeholder="bottom (default)" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
    <oas-cascader id="cs-placement-right" placement="right-start" placeholder="right-start" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
  </oas-space>
</DemoBlock>

`placement` supports 12 directions: `top` / `bottom` / `left` / `right` × `start` / `end` / centered (e.g. `top-start`, `right-end`), defaulting to `bottom` (opens below, auto-flips when space runs out); invalid values fall back silently. Declare the direction directly for edge-adjacent scenarios such as sidebars or inside tables.

## Custom Suffix Icon (suffix-icon slot)

<DemoBlock title="suffix-icon (replaces the default arrow)">
  <oas-cascader id="cs-suffix-icon" placeholder="Custom suffix icon" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'>
    <template slot="suffix-icon"><span style="display:inline-flex">▤</span></template>
  </oas-cascader>
</DemoBlock>

`template[slot="suffix-icon"]` replaces the default dropdown arrow on the trigger (rotating with the container when expanded; the spinner still takes over during `loading`).

## Custom Option Rendering (option slot)

<DemoBlock title="option (custom option rows)">
  <oas-cascader id="cs-option-slot" placeholder="Option rows with icons" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'>
    <template slot="option"><span style="display:inline-flex">📍</span><span data-option-label></span></template>
  </oas-cascader>
</DemoBlock>

`template[slot="option"]` is cloned into every option row (both panel rows and search-result rows); the `[data-option-label]` node is bound to the display text (the option label for panel rows, the full path text for search rows). Hosts can also rewrite row content via render events.

## Events

<DemoBlock title="Selection events">
  <oas-cascader id="cs-event" placeholder="Select to trigger oas-change" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
  <span id="cs-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

Listen to `oas-change`; `detail.value` is a path array in single mode, or an array of path arrays in multiple mode:

## Focus Events (oas-focus / oas-blur)

<DemoBlock title="focus / blur events">
  <oas-cascader id="cs-focus" placeholder="Focus / blur to see feedback" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
  <span id="cs-focus-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

Trigger focus/blur dispatches `oas-focus` / `oas-blur` (`detail.value` shares the `oas-change` shape: a path array in single mode, an array of path arrays in multiple mode). Internal focus transfers between the trigger, search box, and chip buttons do not cause false reports.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const pathText = (paths) => `[${paths.map((p) => p.join('/')).join(', ')}]`

  // Multiple demo: value feedback
  const multi = document.getElementById('cs-multi')
  const multiOut = document.getElementById('cs-multi-output')
  multi?.addEventListener('oas-change', (e) => {
    multiOut.textContent = `oas-change: ${pathText(e.detail.value)}`
  })

  // Search demo: oas-search / oas-change feedback
  const search = document.getElementById('cs-search')
  const searchOut = document.getElementById('cs-search-output')
  search?.addEventListener('oas-search', (e) => {
    searchOut.textContent = `oas-search: ${e.detail.value}`
  })
  search?.addEventListener('oas-change', (e) => {
    searchOut.textContent = `oas-change: ${pathText(e.detail.value)}`
  })

  // Lazy demo: el.load property channel (500ms simulated delay)
  customElements.whenDefined('oas-cascader').then(() => {
    const lazy = document.getElementById('cs-lazy')
    if (lazy) {
      lazy.load = ({ path }) =>
        new Promise((resolve) => {
          setTimeout(() => {
            if (path.length === 0) {
              resolve([
                { label: 'Tech Center', value: 'tech' },
                { label: 'Operations', value: 'ops' },
              ])
            } else if (path[0] === 'tech') {
              resolve([
                { label: 'Frontend', value: 'fe', isLeaf: true },
                { label: 'Backend', value: 'be', isLeaf: true },
                { label: 'QA', value: 'qa' },
              ])
            } else if (path[1] === 'qa') {
              resolve([
                { label: 'Functional', value: 'func', isLeaf: true },
                { label: 'Automation', value: 'auto', isLeaf: true },
              ])
            } else {
              resolve([])
            }
          }, 500)
        })
    }
  })

  // Controlled open demo: button writes the open attribute + state echo
  const btn = document.getElementById('cs-open-btn')
  const controlled = document.getElementById('cs-controlled')
  const state = document.getElementById('cs-open-state')
  btn?.addEventListener('click', () => {
    if (!controlled) return
    if (controlled.hasAttribute('open')) controlled.removeAttribute('open')
    else controlled.setAttribute('open', '')
  })
  controlled?.addEventListener('oas-open-change', (e) => {
    if (state) state.textContent = `open: ${e.detail.open}`
  })

  // Events demo
  const el = document.getElementById('cs-event')
  const out = document.getElementById('cs-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${pathText([e.detail.value])}`
  })

  // Field mapping demo: show the mapped value after selection
  const fields = document.getElementById('cs-fields')
  const fieldsOut = document.getElementById('cs-fields-output')
  fields?.addEventListener('oas-change', (e) => {
    fieldsOut.textContent = `oas-change: ${pathText([e.detail.value])}`
  })

  // Focus events demo: trigger focus/blur feedback
  const focus = document.getElementById('cs-focus')
  const focusOut = document.getElementById('cs-focus-output')
  focus?.addEventListener('oas-focus', () => {
    focusOut.textContent = 'oas-focus'
  })
  focus?.addEventListener('oas-blur', () => {
    focusOut.textContent = 'oas-blur'
  })

  // Virtual scrolling demo: 1000-item column (each with one leaf, injected via the options channel) + selection feedback
  const virtualCs = document.getElementById('cs-virtual')
  const virtualCsOut = document.getElementById('cs-virtual-output')
  if (virtualCs) {
    virtualCs.setAttribute(
      'options',
      JSON.stringify(
        Array.from({ length: 1000 }, (_, i) => ({
          label: `Item ${i}`,
          value: `v${i}`,
          children: [{ label: `${i}-child`, value: `c${i}` }],
        })),
      ),
    )
    virtualCs.addEventListener('oas-change', (e) => {
      if (virtualCsOut) virtualCsOut.textContent = `oas-change: ${(e.detail.value || []).join(' / ')}`
    })
  }

  // Accessible name (label) demo: read the trigger aria-label (label set vs placeholder fallback)
  const readLabel = () => {
    const a = document.getElementById('cs-label-set')?.shadowRoot?.querySelector('[part="trigger"]')?.getAttribute('aria-label')
    const b = document.getElementById('cs-label-fallback')?.shadowRoot?.querySelector('[part="trigger"]')?.getAttribute('aria-label')
    const out = document.getElementById('cs-label-output')
    if (a && b && out) {
      out.textContent = `aria-label: set "${a}" / fallback "${b}"`
    } else {
      setTimeout(readLabel, 60)
    }
  }
  readLabel()
})
</script>

## Mobile form (bottom sheet)

On touch screens (coarse pointer) or narrow viewports (<768px), the multi-level panels are automatically hosted by an `oas-bottom-sheet` bottom sheet: rises from the viewport bottom + backdrop + drag handle swipe-down to close (backdrop click / Esc also close), with bottom safe-area inset; panel columns scroll horizontally inside the sheet; the desktop form keeps the original floating dropdown.

## API

### oas-cascader

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `change-on-select` | Submit when selecting any level | `boolean` | — |
| `check-strictly` | Decouple parent/child checking in multi-select (checking a parent does not cascade) | `boolean` | — |
| `clearable` | Clearable (fires oas-clear) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `expand-trigger` | Sub-level expansion trigger: `click` (default) / `hover` (120ms delay to prevent misfires) | `string` | `click` |
| `field-names` | Field-alias JSON (`{ label, value, children, disabled }`) matching the tree-select contract; lazy-load results are mapped alike | `string` | — |
| `filterable` | Searchable (flat path results) | `boolean` | — |
| `item-height` | Fixed virtual row height in px (with virtual, default 36) | `string` | `36` |
| `label` | Accessible name of the trigger (aria-label), taking priority over value/placeholder | `string` | — |
| `loading` | Loading state: trigger spinner + aria-busy; the panel shows a loading placeholder | `boolean` | — |
| `max-tag-count` | Collapse multi-select tags beyond the count into +N (with title listing hidden items) | `boolean` | — |
| `multiple` | Multi-select (cascading checkboxes; fully-checked children roll the parent into the value) | `boolean` | — |
| `open` | Controlled open state (single source of truth); in the mobile form (touch / viewport <768px) the open panel is hosted by an oas-bottom-sheet bottom sheet (swipe-down/backdrop/Esc to close); desktop keeps the floating dropdown | `boolean` | — |
| `options` | Cascade options, JSON array, supports `children` / `disabled` | `CascaderOption[] \| string` | `[]` |
| `placeholder` | Placeholder text | — | — |
| `placement` | Panel placement in 12 directions (invalid falls back to bottom; auto-flip kept) | `string` | `bottom` |
| `separator` | Path separator (default ` / `) | `string` | ` / ` |
| `show-all-levels` | Show the full path (default true); `false` shows only the leaf | `string` | `true` |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success`; error mirrors aria-invalid | `string` | — |
| `value` | Path array (JSON), e.g. `["zj","hz"]` | `string` | `[]` |
| `value-mode` | Multi-select value strategy: `all` (default, full paths) / `parentFirst` / `onlyLeaf` | `string` | `all` |
| `virtual` | Per-column virtual scrolling (columns above 50 items render via oas-virtual-list; short columns/search/loading keep normal rendering) | `boolean` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-blur` | Dispatched on trigger blur; `detail.value` shares the oas-change shape (inner focus moves do not false-fire) |
| `oas-change` | Selection change, `detail: { value }` (path array) |
| `oas-clear` | Fires on clear-button click; `detail` is the pre-clear value |
| `oas-focus` | Dispatched on trigger focus; `detail.value` shares the oas-change shape (inner focus moves do not false-fire) |
| `oas-open-change` | Open state flips, `detail: { open }` |
| `oas-search` | Fires on filterable input, `detail: { value }` |

#### Slots

| Name | Description |
| --- | --- |
| `template[slot="option"]` | Custom option row template; `[data-option-label]` nodes bind the option text |
| `template[slot="suffix-icon"]` | Custom trailing trigger icon (replaces the default arrow; yields to the spinner while loading) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-cascader-dropdown-height` | `240px` |
