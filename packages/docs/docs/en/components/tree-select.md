# TreeSelect

Tree-structure selection supporting parent-child cascaded multiple selection, search filtering, lazy loading and tag-based display.

## Single Select

<DemoBlock title="Single select">
  <oas-tree-select placeholder="Select a node" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

Click a node to select it and close the dropdown; children can be expanded/collapsed. Keyboard: `Tab` to focus, `Enter/Space/↑/↓` to open, `↑/↓` to move the highlight, `Enter/Space` to select, `→/←` to expand/collapse, `Esc` to close.

## Multiple Select (parent-child linkage + tags)

<DemoBlock title="Multiple (multiple)">
  <oas-tree-select id="ts-multi" multiple placeholder="Select multiple nodes" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

In multiple mode, selecting a parent cascades the selection to all children; clicking again cancels. Parent nodes show an "all / half" selected state. Selected values are displayed as tags (chips) inside the trigger: click the `×` on a tag to remove it; press `Backspace` while the trigger is focused to remove the last one.

> Visual change note: since v2.4 the multiple display switched from joined text ("a、b and N more") to tags (the industry-standard form with per-tag removal) — a breaking visual change; use `max-tag-count` for collapsed display.

## Search Filter (filterable)

<DemoBlock title="Search filter (filterable)">
  <oas-tree-select id="ts-search" filterable placeholder="Open and type to search" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <span id="ts-search-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

With `filterable`, a standalone search box appears at the top of the panel: matched nodes show together with their ancestors (path context) and all descendants (lenient match); an empty state shows when nothing matches. Inside the search box: `↑/↓` move the highlight (it lands on the first match), `Enter` selects, `Esc` closes the panel and returns focus to the trigger. The keyword is cleared after selecting by default; `reserve-keyword` keeps it. Typing emits `oas-search` (`detail.value` is the keyword — pair with `loading` for remote search). Custom matching: `el.filter = (label, option) => boolean`.

## Parent-Child Decoupling (check-strictly)

<DemoBlock title="check-strictly">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; width: 100%">
    <div>
      <oas-tree-select id="ts-cascade" multiple placeholder="Cascaded (default)" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Cascaded: value = <span id="ts-cascade-out">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strictly" multiple check-strictly placeholder="Decoupled" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Decoupled: value = <span id="ts-strictly-out">—</span></p>
    </div>
  </div>
</DemoBlock>

`multiple` cascades parent-child by default (checking a parent checks all children). With `check-strictly`, checks no longer cascade, there is no half state, and `value` is exactly the checked set (`check-strategy` has no effect then) — covering the "independent multi-select at any level" scenario.

## Check Strategy (check-strategy)

`check-strategy` controls which nodes enter `value` in multiple mode: `all` (default) keeps both parents and children; `parent` keeps only parent nodes (a parent represents its fully-checked children); `child` keeps only leaf nodes. All three strategies share the same cascaded checking logic — only the emitted value differs:

<DemoBlock title="Check strategy (all / parent / child)">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; width: 100%">
    <div>
      <oas-tree-select id="ts-strategy-all" multiple check-strategy="all" placeholder="all: check parent → parent + all children" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">all: value = <span id="ts-out-all">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-parent" multiple check-strategy="parent" placeholder="parent: check parent → parents only" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">parent: value = <span id="ts-out-parent">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-child" multiple check-strategy="child" placeholder="child: check parent → leaves only" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">child: value = <span id="ts-out-child">—</span></p>
    </div>
  </div>
</DemoBlock>

After checking "Frontend", the three strategies emit: `all` → `["fe","framework","vue","react","css"]`, `parent` → `["fe"]`, `child` → `["vue","react","css"]` (order follows the demo data's declaration order of "Framework" children). Under `parent`, checking leaves one by one converges the value to the parent once all its children are checked.

## Lazy Loading (lazy / load)

<DemoBlock title="Lazy loading (lazy + load)">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select id="ts-lazy" lazy placeholder="Expand a region to load cities" options='[{"label":"East Region","value":"east"},{"label":"North Region","value":"north"}]'></oas-tree-select>
    <oas-tree-select id="ts-cache" lazy multiple value='["js"]' cache-data='[{"value":"js","label":"Jiangsu"}]' placeholder="cache-data label fallback" options='[{"label":"East Region","value":"east"}]'></oas-tree-select>
  </div>
</DemoBlock>

With `lazy`, nodes without `children` and not marked `isLeaf` / `loaded` are treated as "not loaded": expanding shows a spinner, emits `oas-load` (`detail.value`) and calls `el.load({ value })`; after the host merges children into the data and re-sets `options`, the spinner disappears. Explicit leaves are marked with `isLeaf: true`. Right example: a not-yet-loaded value `js` is preset; `cache-data` (JSON: `[{ value, label }]`) makes the display show its label instead of the raw value.

## Path Display (show-path)

<DemoBlock title="Path display (show-path + separator)">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select value="vue" show-path placeholder="Default separator" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
    <oas-tree-select value="vue" show-path separator="-" placeholder="Custom separator" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
  </div>
</DemoBlock>

`show-path` displays the selected value as its full "root → self" path (e.g. `Frontend / Framework / Vue`), useful to disambiguate same-named nodes across subtrees; `separator` customizes the separator (default `" / "`).

## Tag Management (max-tag-count / max)

<DemoBlock title="Tag collapsing and selection limit">
  <oas-tree-select id="ts-tags" multiple max-tag-count="2" placeholder="max-tag-count=2, collapse the rest" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]},{"label":"Algorithms","value":"algo"}]'></oas-tree-select>
  <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">value = <span id="ts-tags-out">—</span></p>
  <oas-tree-select id="ts-max" multiple check-strictly max="3" placeholder="max=3, unchecked items disabled at limit" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Backend","value":"be"},{"label":"Algorithms","value":"algo"}]'></oas-tree-select>
  <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">value = <span id="ts-max-out">—</span></p>
</DemoBlock>

`max-tag-count` limits the tags shown in the trigger; the rest collapse into `+N` (hover the title to list hidden items). `max` limits how many nodes can be selected (counted by checked nodes); once reached, unchecked nodes appear disabled while checked ones can still be unchecked.

## Clearable & Affixes (clearable / prefix / suffix)

<DemoBlock title="clearable + prefix / suffix">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select clearable value="vue" prefix-text="Dept" suffix-text="Required" placeholder="Clearable" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]'></oas-tree-select>
  </div>
</DemoBlock>

With `clearable`, a clear button shows when there is a value (clicking clears and emits `oas-clear`). `prefix-text` / `suffix-text` render affix texts inside the trigger; `template[slot="prefix"]` / `[slot="suffix"]` provide custom content. In plain HTML, the legacy `prefix` / `suffix` still work as aliases.

## Size & Status (size / status)

<DemoBlock title="size tiers + status">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; align-items: center">
    <oas-tree-select size="small" placeholder="small" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select placeholder="medium (default)" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select size="large" placeholder="large" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select status="error" placeholder="error" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select status="warning" placeholder="warning" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
    <oas-tree-select status="success" placeholder="success" options='[{"label":"Vue","value":"vue"}]'></oas-tree-select>
  </div>
</DemoBlock>

`size`: `small` / `medium` (default) / `large` — height and font follow the global size tokens. `status`: `error` / `warning` / `success` validation borders (the host `aria-invalid` attribute remains supported, equivalent to error).

## Field Names (field-names)

<DemoBlock title="field-names">
  <oas-tree-select id="ts-fields" placeholder="Fields are name/id/subs" field-names='{"label":"name","value":"id","children":"subs","disabled":"off"}' options='[{"name":"Frontend","id":"fe","subs":[{"name":"Vue","id":"vue"},{"name":"Locked","id":"lock","off":true}]},{"name":"Backend","id":"be"}]'></oas-tree-select>
</DemoBlock>

When backend field names differ, declare the mapping of `label` / `value` / `children` / `disabled` to raw fields via `field-names` (JSON) — no need to transform the whole tree on the host side.

## Controlled Open (open)

<DemoBlock title="Controlled open (open + oas-open-change)">
  <oas-tree-select id="ts-open" open="" placeholder="Controlled by the open attribute" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]'></oas-tree-select>
  <oas-button id="ts-open-btn" size="small">Toggle open</oas-button>
  <span id="ts-open-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

When the `open` attribute is present the open state is controlled (a value of `false` means controlled-closed): internal clicks no longer change the state directly; they only emit `oas-open-change` (`detail.open`), and the host decides by writing the `open` attribute. Without `open` the component is uncontrolled (the event is still emitted, e.g. to preload data on first open).

## Expand Behavior (default-expand-all / tree-lines / expand-trigger)

<DemoBlock title="Expand all by default / tree lines / node click">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap">
    <oas-tree-select id="ts-expand-all" default-expand-all tree-lines placeholder="Expand all + tree lines" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
    <oas-tree-select expand-trigger="node" placeholder="Parent label click also expands" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"}]}]},{"label":"Backend","value":"be"}]'></oas-tree-select>
  </div>
</DemoBlock>

`default-expand-all` expands all nodes on first open (an explicit `expanded` attribute takes precedence); `tree-lines` shows indent guide lines; with `expand-trigger="node"`, clicking a parent label expands it in addition to selecting (default `toggle` expands only via the arrow).

## Custom Node Rendering

<DemoBlock title="oas-node-render event">
  <oas-tree-select id="ts-node" placeholder="Child-count badge" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

<DemoBlock title="template[slot=node]">
  <oas-tree-select id="ts-node-tpl" v-pre placeholder="Custom node template" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Design","value":"design"}]'>
    <template slot="node">
      <span style="display: inline-flex; align-items: center; gap: var(--oas-space-1); min-width: 0; color: var(--oas-color-primary)">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span data-node-label style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap"></span>
      </span>
    </template>
  </oas-tree-select>
</DemoBlock>

Two channels: listen to `oas-node-render` (`detail: { node, element, level, expanded, selected, checked }`) and mutate `element` in the handler; or provide a static skeleton via `template[slot="node"]` with `[data-node-label]` auto-bound to the node label (same channel as oas-tree). Tree ARIA (`treeitem` / `aria-level`) is unaffected by custom rendering.

## Panel Chrome (header / footer / loading / empty)

<DemoBlock title="Panel header/footer slots + loading mask">
  <oas-tree-select id="ts-panel" v-pre filterable loading placeholder="Header/footer + loading mask" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'>
    <template slot="header"><span style="font-weight: 600">Select members</span></template>
    <template slot="footer"><span>Refreshed every 5 minutes</span></template>
  </oas-tree-select>
  <oas-button id="ts-loading-btn" size="small">Toggle loading</oas-button>
</DemoBlock>

`template[slot="header"]` / `[slot="footer"]` insert arbitrary content at the top / bottom of the panel; `loading` shows a loading mask (pair with remote search and lazy loading); the empty state text can be customized via the `empty` attribute or the `template[slot="empty"]` slot (built-in localized text by default).

## Flat Data (host utility)

<DemoBlock title="Backend flat {id, pId} → tree">
  <oas-tree-select id="ts-flat" placeholder="Flat data composition example" options='[]'></oas-tree-select>
</DemoBlock>

The component intentionally has no flat-data attribute — converting a backend flat list on the host side is a one-line reduce (zero friction); the conversion function used by this page is shown in the script below.

## Preset Value

<DemoBlock title="Preset value">
  <oas-tree-select value="vue" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
</DemoBlock>

## Controlled Expand (expanded)

`expanded` is a JSON array declaring the set of node values to expand (a controlled channel): externally changing the property immediately reflects in the dropdown tree. Below, "Frontend → Framework" is pre-expanded, and buttons drive it externally:

<DemoBlock title="Controlled expand (expanded)">
  <oas-tree-select id="tree-expanded" expanded='["fe","framework"]' placeholder="Click to see pre-expanded nodes" options='[{"label":"Frontend","value":"fe","children":[{"label":"Framework","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Styles","value":"css"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <oas-button id="tree-expand-all" size="small">Expand all</oas-button>
  <oas-button id="tree-collapse-all" size="small">Collapse all</oas-button>
</DemoBlock>

Presetting `expanded='["fe","framework"]'` expands "Frontend" and "Framework" the first time the dropdown opens; clicking "Expand all" externally writes `expanded='["fe","framework","be"]'`, and "Collapse all" writes `'[]'`, re-rendering immediately when the dropdown opens.

## Large Data (Virtual Scroll)

<DemoBlock title="Ten-thousand-node virtual scroll">
  <oas-tree-select id="ts-virtual" multiple virtual height="288" item-height="36" expanded='["dept-0"]' placeholder="Click to open the 10k dept tree" options='[]'></oas-tree-select>
  <oas-button id="ts-expand-all" size="small">Expand all</oas-button>
  <oas-button id="ts-collapse-all" size="small">Collapse all</oas-button>
</DemoBlock>

Setting `virtual` enables windowed rendering (with `height` for the viewport and `item-height` for the row height): the dropdown reuses `oas-virtual-list` to render only the visible window, so 10,100 nodes (100 departments × 100 members) scroll smoothly; `↑/↓` move the highlight, `Enter` toggles a check, `→/←` expand/collapse, and `aria-activedescendant` stays valid across window re-renders. `filterable` composes with virtual scroll (filtered results feed the window). Data is injected via the `options` property channel, the expanded set is controlled by the `expanded` attribute, and "Expand all" writes the full node set externally.

## Popup Positioning (scroll container)

<DemoBlock title="Inside a scroll container">
  <div style="height: 160px; overflow: auto; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3)">
    <p style="margin: 0 0 var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Tree select inside an overflow container:</p>
    <oas-tree-select id="ts-scroll" placeholder="Panel not clipped by the container" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Backend","value":"be"}]'></oas-tree-select>
    <p style="height: 220px; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">↓ Scroll down: the panel is fixed-positioned to the trigger and not clipped by the container; it flips up automatically when the viewport lacks space.</p>
  </div>
</DemoBlock>

The dropdown uses `fixed` positioning + viewport computation anchored below the trigger (width aligned with the trigger, auto flip when space is insufficient), so it is never clipped by `overflow` containers such as modals and scroll areas. Fine-tune via `::part(dropdown)`.

## Disabled

<DemoBlock title="Disabled">
  <oas-tree-select disabled value="vue" placeholder="Disabled" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'></oas-tree-select>
</DemoBlock>

## Empty State

<DemoBlock title="No data">
  <oas-tree-select placeholder="No data" options='[]'></oas-tree-select>
</DemoBlock>

<DemoBlock title="Custom empty text (empty) + keep keyword (reserve-keyword)">
  <oas-space size="large" wrap>
    <oas-tree-select placeholder="Custom empty text" empty="No nodes yet — create one first" options='[]'></oas-tree-select>
    <oas-tree-select filterable reserve-keyword placeholder="Keyword kept after select" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]'></oas-tree-select>
  </oas-space>
</DemoBlock>

## Events

<DemoBlock title="Change events">
  <oas-tree-select id="tree-event" multiple placeholder="Select to trigger oas-change" options='[{"label":"Frontend","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"Backend","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <span id="tree-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Listen to `oas-change`: `detail.value` is a string for single select and an array for multiple; `detail.labels` carries the display labels in value order (paths when `show-path` is on) — hosts needing "value + label" take them from here instead of object-value binding. Other events: `oas-clear` (cleared, `detail.value` is the previous value), `oas-search` (search input), `oas-load` (lazy load), `oas-open-change` (open state), `oas-node-render` (node rendering).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const echo = (elId, outId) => {
    const el = document.getElementById(elId)
    const out = document.getElementById(outId)
    el?.addEventListener('oas-change', (e) => {
      const v = Array.isArray(e.detail.value) ? e.detail.value : [e.detail.value]
      out.textContent = `[${v.join(', ')}]`
    })
  }

  // filterable demo: keyword feedback
  const tsSearch = document.getElementById('ts-search')
  const tsSearchOut = document.getElementById('ts-search-out')
  tsSearch?.addEventListener('oas-search', (e) => {
    tsSearchOut.textContent = e.detail.value ? `search: ${e.detail.value}` : ''
  })

  // cascaded vs strict / strategies / tags demos: value echo
  for (const [elId, outId] of [
    ['ts-cascade', 'ts-cascade-out'],
    ['ts-strictly', 'ts-strictly-out'],
    ['ts-strategy-all', 'ts-out-all'],
    ['ts-strategy-parent', 'ts-out-parent'],
    ['ts-strategy-child', 'ts-out-child'],
    ['ts-tags', 'ts-tags-out'],
    ['ts-max', 'ts-max-out'],
  ]) {
    echo(elId, outId)
  }

  // lazy demo: expand a region, then merge children back after a delay (host owns the data; spinner clears after options re-set)
  const tsLazy = document.getElementById('ts-lazy')
  if (tsLazy) {
    tsLazy.load = ({ value }) => {
      setTimeout(() => {
        const children =
          value === 'east'
            ? [
                { label: 'Shanghai', value: 'sh', isLeaf: true },
                { label: 'Jiangsu', value: 'js', isLeaf: true },
              ]
            : [{ label: 'Beijing', value: 'bj', isLeaf: true }]
        const current = JSON.parse(tsLazy.getAttribute('options') || '[]')
        tsLazy.options = current.map((n) => (n.value === value ? { ...n, children } : n))
      }, 500)
    }
  }

  // controlled open demo: host writes the open attribute back
  const tsOpen = document.getElementById('ts-open')
  const tsOpenOut = document.getElementById('ts-open-out')
  let openState = true
  document.getElementById('ts-open-btn')?.addEventListener('click', () => {
    openState = !openState
    tsOpen?.setAttribute('open', openState ? '' : 'false')
  })
  tsOpen?.addEventListener('oas-open-change', (e) => {
    tsOpenOut.textContent = `oas-open-change: ${e.detail.open}`
  })

  // panel loading demo: toggle the loading attribute externally
  const tsPanel = document.getElementById('ts-panel')
  document.getElementById('ts-loading-btn')?.addEventListener('click', () => {
    if (tsPanel?.hasAttribute('loading')) tsPanel.removeAttribute('loading')
    else tsPanel?.setAttribute('loading', '')
  })

  // custom node demo: append a child-count badge via oas-node-render
  const tsNode = document.getElementById('ts-node')
  tsNode?.addEventListener('oas-node-render', (e) => {
    const { node, element } = e.detail
    if (node.children?.length) {
      const badge = document.createElement('span')
      badge.textContent = String(node.children.length)
      badge.style.cssText =
        'margin-inline-start: var(--oas-space-2); flex: none; font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)'
      element.appendChild(badge)
    }
  })

  // flat data demo: flat {id, pId} → tree (host-side utility, equivalent to flat-data passthrough)
  const flatNodes = [
    { id: 'fe', pId: '', name: 'Frontend' },
    { id: 'framework', pId: 'fe', name: 'Framework' },
    { id: 'vue', pId: 'framework', name: 'Vue' },
    { id: 'react', pId: 'framework', name: 'React' },
    { id: 'be', pId: '', name: 'Backend' },
  ]
  const toTree = (flat) => {
    const byId = new Map()
    for (const n of flat) byId.set(n.id, { label: n.name, value: n.id })
    const roots = []
    for (const n of flat) {
      const node = byId.get(n.id)
      const parent = n.pId ? byId.get(n.pId) : undefined
      if (parent) {
        ;(parent.children = parent.children || []).push(node)
      } else {
        roots.push(node)
      }
    }
    return roots
  }
  const tsFlat = document.getElementById('ts-flat')
  if (tsFlat) tsFlat.options = toTree(flatNodes)

  // events demo: oas-change feedback
  const el = document.getElementById('tree-event')
  const out = document.getElementById('tree-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}] / labels: [${e.detail.labels.join(', ')}]`
  })

  // 10k-node virtual demo: inject 100 departments × 100 members = 10100 nodes, drive expanded externally
  const tsVirtual = document.getElementById('ts-virtual')
  if (tsVirtual) {
    const roots = Array.from({ length: 100 }, (_, i) => ({
      label: `Dept ${i}`,
      value: `dept-${i}`,
      children: Array.from({ length: 100 }, (_, j) => ({
        label: `Member ${i}-${j}`,
        value: `m-${i}-${j}`,
      })),
    }))
    tsVirtual.options = roots
    document.getElementById('ts-expand-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', JSON.stringify(roots.map((r) => r.value)))
    })
    document.getElementById('ts-collapse-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', '[]')
    })
  }

  // expanded (controlled expand) demo: drive the set of expanded nodes externally
  document.getElementById('tree-expand-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '["fe","framework","be"]')
  })
  document.getElementById('tree-collapse-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '[]')
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `cache-data` | Fallback cache (JSON) for echoing values with no matching option label | `string` | `[]` |
| `check-strategy` | Multiple-select check strategy: `all` (default) keeps both parents and children in the value; `parent` keeps only parent nodes (a parent represents its fully-checked children); `child` keeps only leaf nodes | `string` | `all` |
| `check-strictly` | Decouple parent/child checking in multi-select | `boolean` | — |
| `clearable` | Clearable (fires oas-clear) | `boolean` | — |
| `default-expand-all` | Expand all nodes by default (applies when the expanded attribute is absent; frozen after the first internal toggle) | `boolean` | — |
| `disabled` | Disabled | `boolean` | — |
| `empty` | Custom empty-state text/content | `string` | — |
| `expand-trigger` | Node expansion trigger: `toggle` (default, arrow only) / `node` (clicking the node row expands) | `string` | `toggle` |
| `expanded` | Set of expanded node values (JSON array, controlled) | `string` | — |
| `field-names` | Field-alias JSON (e.g. `{"label":"name","value":"id","children":"subs"}`; options are not copy-mapped — node-render receives your original objects) | `string` | — |
| `filterable` | Searchable (dedicated search box at the top of the panel) | `boolean` | — |
| `height` | Virtual-scroll viewport height (px); works with `virtual` | `string` | `288` |
| `item-height` | Fixed row height for virtual scroll (px) | `string` | `36` |
| `lazy` | Lazy loading (pair with the `el.load` function property; nodes carry isLeaf) | `boolean` | — |
| `loading` | Panel loading state (during lazy load / remote search) | `boolean` | — |
| `max` | Multi-select limit (by checked-set size) | `string` | — |
| `max-tag-count` | Collapse multi-select tags beyond the count into +N (title lists hidden items) | `string` | — |
| `multiple` | Multiple select + parent-child cascade | `boolean` | — |
| `open` | Controlled open (presence = controlled; `"false"` = controlled-closed); flips fire oas-open-change | `string` | — |
| `options` | Tree options, JSON array, supports `children` / `disabled` | `TreeOption[] \| string` | `[]` |
| `placeholder` | Placeholder text | — | — |
| `prefix-text` | Trigger prefix content (slot="prefix" accepts any content) | `string` | — |
| `reserve-keyword` | Keep the search keyword after selecting a node (cleared by default) | `boolean` | — |
| `separator` | Path separator (default ` / `, pair with show-path) | `string` | ` / ` |
| `show-path` | Echo the full path (initial echo and multi-select labels use paths) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large` | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success` | `string` | — |
| `suffix-text` | Trigger suffix content (slot="suffix" likewise) | `string` | — |
| `tree-lines` | Tree indentation guide lines | `boolean` | — |
| `value` | Selected value (JSON array in multiple mode) | `string` | `[]` |
| `virtual` | Enable virtual scroll: the dropdown renders only the visible window for large data (reuses oas-virtual-list), keeping keyboard/ARIA intact | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection change, `detail: { value }` |
| `oas-clear` | Fires on clear; `detail` is the pre-clear value |
| `oas-load` | Fires when a lazy node expands to load, `detail: { value }` |
| `oas-node-render` | Fires on node render (custom node rendering channel), `detail: { node, element, level, expanded, selected, checked }` |
| `oas-open-change` | Open state flips, `detail: { open }` |
| `oas-search` | Fires on search input, `detail: { value }` |

### Slots

| Name | Description |
| --- | --- |
| `template[slot="empty"]` | Custom empty-state content |
| `template[slot="node"]` | Custom node template (`[data-node-label]` binds the label) |
