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

## Disabled

<DemoBlock title="Disabled">
  <oas-cascader disabled value='["zj","hz"]' placeholder="Disabled" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

## Events

<DemoBlock title="Selection events">
  <oas-cascader id="cs-event" placeholder="Select to trigger oas-change" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
  <span id="cs-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

Listen to `oas-change`; `detail.value` is a path array in single mode, or an array of path arrays in multiple mode:

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
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `change-on-select` | Submit when selecting any level | `boolean` | — |
| `check-strictly` | Decouple parent/child checking in multi-select (checking a parent does not cascade) | `boolean` | — |
| `clearable` | Clearable (fires oas-clear) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `expand-trigger` | Sub-level expansion trigger: `click` (default) / `hover` (120ms delay to prevent misfires) | `string` | `click` |
| `filterable` | Searchable (flat path results) | `boolean` | — |
| `max-tag-count` | Collapse multi-select tags beyond the count into +N (with title listing hidden items) | `boolean` | — |
| `multiple` | Multi-select (cascading checkboxes; fully-checked children roll the parent into the value) | `boolean` | — |
| `open` | Controlled open state (single source of truth) | `boolean` | — |
| `options` | Cascade options, JSON array, supports `children` / `disabled` | `CascaderOption[] \| string` | `[]` |
| `placeholder` | Placeholder text | — | — |
| `separator` | Path separator (default ` / `) | `string` | ` / ` |
| `show-all-levels` | Show the full path (default true); `false` shows only the leaf | `string` | `true` |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success`; error mirrors aria-invalid | `string` | — |
| `value` | Path array (JSON), e.g. `["zj","hz"]` | `string` | `[]` |
| `value-mode` | Multi-select value strategy: `all` (default, full paths) / `parentFirst` / `onlyLeaf` | `string` | `all` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection change, `detail: { value }` (path array) |
| `oas-clear` | Fires on clear-button click; `detail` is the pre-clear value |
| `oas-open-change` | Open state flips, `detail: { open }` |
| `oas-search` | Fires on filterable input, `detail: { value }` |
