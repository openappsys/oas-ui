---
description: "List page filter bar: sort options (featured / sales / price toggle) + a criteria panel (dropdown / half-screen drawer, single- and multi-select groups) + selected-condition chips (per-item undo / one-click reset) + the `conditions` JSON dual channel with `oas-change`."
---

# Filter

Filter loop for e-commerce list pages: sort options stay on the bar (featured / sales / price, price supports ascending–descending toggle), the criteria panel holds multiple filter groups (single-select / multi-select), and selected conditions are echoed as chips under the panel — undo per chip, reset all at once. The value contract is the `conditions` JSON dual channel: uncontrolled hosts get automatic write-back on user interaction (works out of the box), controlled hosts take over by listening to `oas-change`. The panel comes in **dropdown** and **half-screen drawer** forms; the drawer is recommended on narrow screens.

## Basic usage

`groups` declares filter groups (`multiple: true` for multi-select); clicking a sort option, picking a condition, or removing a chip all emit `oas-change` (detail carries the current sort, selected values per group, and a composed summary text that can feed an `aria-live` region directly):

<DemoBlock title="Sort + criteria groups + selected echo">

<oas-filter id="filter-basic"></oas-filter>
<p id="filter-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
  Click a sort option, open the panel to pick conditions, or remove a chip to see oas-change feedback.
</p>

</DemoBlock>

## Sort options

`sorts` can replace the default trio; sort items with `toggled: true` support an ascending–descending toggle — first click sorts descending, the next click ascending (the e-commerce "price ↓" convention). The direction lands in the `oas-change` `order` field and the summary:

<DemoBlock title="Custom sort options + price toggle">
  <oas-filter
    sorts='[{"key":"new","label":"Newest"},{"key":"hot","label":"Trending","toggled":true},{"key":"price","label":"Price","toggled":true}]'
  ></oas-filter>
</DemoBlock>

## Multiple criteria groups

In single-select groups clicking the selected option cancels it (back to "any"); multi-select groups toggle freely; `disabled` options are greyed out. Selected conditions echo as chips whose `aria-label` is "Remove condition-name"; they are focusable and removable with Enter, and the trailing "Reset" clears everything (sort falls back to the default):

<DemoBlock title="Single-select + multi-select groups + disabled option">
  <oas-filter
    groups='[{"key":"brand","label":"Brand","multiple":true,"options":[{"value":"a","label":"Brand A"},{"value":"b","label":"Brand B"},{"value":"c","label":"Brand C"},{"value":"d","label":"Brand D (sold out)","disabled":true}]},{"key":"color","label":"Color","options":[{"value":"red","label":"Red"},{"value":"blue","label":"Blue"},{"value":"black","label":"Black"}]},{"key":"size","label":"Size","options":[{"value":"s","label":"S"},{"value":"m","label":"M"},{"value":"l","label":"L"}]}]'
  ></oas-filter>
</DemoBlock>

## Drawer form

`panel="drawer"` switches to the half-screen drawer (slides in from the bottom with a mask), recommended on narrow (mobile) screens; the mask, the "Done" button, and Esc all close it, restoring focus to the trigger. The default `panel="dropdown"` is an anchored dropdown that dismisses on outside click:

<DemoBlock title="Drawer form">
  <oas-filter
    panel="drawer"
    groups='[{"key":"brand","label":"Brand","multiple":true,"options":[{"value":"a","label":"Brand A"},{"value":"b","label":"Brand B"}]},{"key":"color","label":"Color","options":[{"value":"red","label":"Red"},{"value":"blue","label":"Blue"}]}]'
  ></oas-filter>
</DemoBlock>

## Controlled usage

The host writes `conditions` (or the property channel `el.conditions = {...}`) to sync the view directly (chip echo, sort selection, badge count) **without** emitting `oas-change`; the component writes `conditions` back after user interactions — controlled hosts listen to `oas-change` and write it again to take over. `open` follows the same dual channel (preset expanding emits no `oas-open-change`):

<DemoBlock title="Preset conditions + host-side reset">
  <div style="display: grid; gap: var(--oas-space-2); width: 100%">
    <oas-filter
      id="filter-controlled"
      conditions='{"sort":"price","order":"desc","groups":{"brand":["a","b"]}}'
      groups='[{"key":"brand","label":"Brand","multiple":true,"options":[{"value":"a","label":"Brand A"},{"value":"b","label":"Brand B"}]}]'
    ></oas-filter>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="filter-clear" size="small">Clear conditions (host side)</oas-button>
      <span id="filter-controlled-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

## Preset expansion and preset conditions

The `open` attribute presets the panel expanded (host write, no `oas-open-change`); combined with `conditions` this is the "remember the user's last filter" echo:

<DemoBlock title="Preset expanded + preset conditions (open attribute)">
  <div style="width: 100%">
    <oas-filter
      open
      conditions='{"groups":{"brand":["a"],"color":["red"]}}'
      groups='[{"key":"brand","label":"Brand","multiple":true,"options":[{"value":"a","label":"Brand A"},{"value":"b","label":"Brand B"}]},{"key":"color","label":"Color","options":[{"value":"red","label":"Red"},{"value":"blue","label":"Blue"}]}]'
    ></oas-filter>
    <div style="height: 240px" aria-hidden="true"></div>
  </div>
</DemoBlock>

## Combined with the goods list

Pair it with `oas-goods-list` for a closed list-page loop: filter changes refill the list (this demo simulates filtering over static data):

<DemoBlock title="filter + goods-list recipe">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-filter
      id="filter-combo"
      groups='[{"key":"kind","label":"Category","multiple":true,"options":[{"value":"clothes","label":"Clothing"},{"value":"shoes","label":"Shoes"},{"value":"bag","label":"Bags"}]}]'
    ></oas-filter>
    <oas-goods-list id="goods-combo" columns="3"></oas-goods-list>
  </div>
</DemoBlock>

## Condition persistence (capability subpath)

Persisting `conditions` goes through the **capability subpath** `@oas-ui/ui/commerce/filter/persist` (helper: import on demand, not shipped with the base component). Two backends — URL (query / hash) and Storage (localStorage etc.) — used individually or together: the URL backend powers share / deep-link restore, the Storage backend powers returning-visitor memory. Encoded strings escape CJK characters and reserved characters such as `& = # %` (safe to embed in a hash); decoding applies structural sanitization (garbage input → `null`, output can be fed straight into `filter.conditions`):

<DemoBlock title="URL encode round-trip + localStorage memory (save / load / toQuery / fromQuery)">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <!-- Action buttons above the filter: the open panel (dropdown) overlays the area right below it -->
    <div style="display: flex; flex-wrap: wrap; gap: var(--oas-space-2)">
      <oas-button id="filter-persist-save-en" size="small">Save (URL string + localStorage)</oas-button>
      <oas-button id="filter-persist-restore-en" size="small">Restore from URL string</oas-button>
      <oas-button id="filter-persist-clear-en" size="small">Clear conditions and persistence</oas-button>
    </div>
    <oas-filter
      id="filter-persist-en"
      groups='[{"key":"brand","label":"Brand","multiple":true,"options":[{"value":"a","label":"Brand A"},{"value":"b","label":"Brand B"}]},{"key":"color","label":"Color","options":[{"value":"red","label":"Red"},{"value":"blue","label":"Blue"}]}]'
    ></oas-filter>
    <p id="filter-persist-out-en" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); overflow-wrap: anywhere">
      Pick a sort or a condition, then click "Save" to see the encoded string (CJK fully escaped) and the raw JSON stored in localStorage; change the conditions and click "Restore" to replay the deep-link restore.
    </p>
  </div>
</DemoBlock>

Host glue (the demo's three steps):

```js
import { toQuery, fromQuery, save, load } from '@oas-ui/ui/commerce/filter/persist'

// (1) On load: URL first, fall back to local memory
const restored = fromQuery(location.search) ?? load(localStorage, 'oas:filter')
if (restored) filter.conditions = restored

// (2) Persist on interaction (dual write; the URL write-back is the host's history.replaceState)
filter.addEventListener('oas-change', () => {
  toQuery(new URLSearchParams(location.search), filter.conditions)
  save(localStorage, 'oas:filter', filter.conditions)
})
```

## Keyboard and accessibility

- The sort row and single-select groups carry `radiogroup` semantics (arrow keys move focus within a group); multi-select groups use `group` + `checkbox` semantics; every option is Tab-reachable.
- The trigger carries `aria-haspopup` / `aria-expanded` / `aria-controls`; its accessible name is derived from the visible content (sort label + count badge — what you see is what a screen reader reads). Opening the panel focuses the first condition, Esc closes and restores focus to the trigger.
- Chips are focusable buttons whose `aria-label` is "Remove condition-name"; after removing, focus moves to the adjacent chip; the composed summary renders into an `aria-live="polite"` region.
- The dropdown dismisses on outside click; **the drawer is a modal dialog** (`role="dialog"` + `aria-modal="true"` on the panel) whose Tab / Shift+Tab focus loop stays inside the panel, closing via the mask / "Done" / Esc. Layout uses logical properties and mirrors automatically under RTL.

## Styling notes

`::part(bar)` lays out both ends (sort row at the inline start, trigger at the end); `::part(panel)` is absolutely positioned under the bar in dropdown form and `position: fixed` to the bottom in drawer form (distinguished by the `data-form` attribute); when the space below is insufficient, the dropdown adds `data-flip="up"` to the panel (it then opens above the bar), so panel-positioning overrides must handle `::part(panel)[data-flip='up']` as well; the panel carries `max-height: 70vh` with vertical scrolling. `::part(chips)` is a flex wrap row. The selected option background is a 10% `color-mix` of the primary color — keep the token linkage when overriding.

<script setup lang="ts">
import { onMounted } from 'vue'
import { fromQuery, save, toQuery, load } from '@oas-ui/ui/commerce/filter/persist'

// Demo script convention (do not move): (1) page-level script setup only — VitePress does not extract
// a script setup written inside a DemoBlock, so it is emitted as page text (Cannot use import statement /
// hydration mismatch, every demo dies); (2) keep it before `## API`, which is the api:gen generated region.
onMounted(() => {
  // —— Basic usage demo ——
  customElements.whenDefined('oas-filter').then(() => {
    const el = document.getElementById('filter-basic')!
    el.setAttribute('groups', JSON.stringify([
      { key: 'brand', label: 'Brand', multiple: true, options: [
        { value: 'a', label: 'Brand A' }, { value: 'b', label: 'Brand B' }, { value: 'c', label: 'Brand C' },
      ] },
      { key: 'color', label: 'Color', options: [
        { value: 'red', label: 'Red' }, { value: 'blue', label: 'Blue' },
      ] },
    ]))
    const out = document.getElementById('filter-basic-out')!
    el.addEventListener('oas-change', (e) => {
      const d = (e as CustomEvent).detail
      out.textContent = `oas-change: sort=${d.sort}${d.order ? ` (${d.order})` : ''}, summary=${d.summary || '(nothing selected)'}`
    })
    el.addEventListener('oas-open-change', (e) => {
      out.textContent = `oas-open-change: panel ${(e as CustomEvent).detail.open ? 'opened' : 'closed'}`
    })
  })

  // —— Combined with the goods list demo ——
  Promise.all([
    customElements.whenDefined('oas-filter'),
    customElements.whenDefined('oas-goods-list'),
  ]).then(() => {
    const filter = document.getElementById('filter-combo')!
    const list = document.getElementById('goods-combo')!
    const catalog = [
      { title: 'Cotton T-shirt', kind: 'clothes', price: 79 },
      { title: 'Canvas sneakers', kind: 'shoes', price: 129 },
      { title: 'Commuter shoulder bag', kind: 'bag', price: 199 },
      { title: 'Knit cardigan', kind: 'clothes', price: 149 },
      { title: 'Running shoes', kind: 'shoes', price: 259 },
      { title: 'Hiking backpack', kind: 'bag', price: 329 },
    ]
    const render = () => {
      const kinds = filter.conditions.groups?.kind ?? []
      const rows = kinds.length > 0 ? catalog.filter((it) => kinds.includes(it.kind)) : catalog
      list.items = rows.map(({ title, price }) => ({ title, price }))
    }
    render()
    filter.addEventListener('oas-change', render)
  })

  // —— Controlled demo: preset conditions + host-side clear ——
  customElements.whenDefined('oas-filter').then(() => {
    const ctl = document.getElementById('filter-controlled')!
    const out = document.getElementById('filter-controlled-out')!
    out.textContent = 'Current conditions: ' + (ctl.getAttribute('conditions') ?? '(empty)')
    ctl.addEventListener('oas-change', () => {
      out.textContent = 'Current conditions: ' + (ctl.getAttribute('conditions') ?? '(empty)')
    })
    document.getElementById('filter-clear')?.addEventListener('click', () => {
      ctl.conditions = {}
    })
  })

  // —— Persistence demo (capability subpath helper; virtual URL string, browser address bar untouched) ——
  customElements.whenDefined('oas-filter').then(() => {
    const filter = document.getElementById('filter-persist-en')!
    const out = document.getElementById('filter-persist-out-en')!
    const KEY = 'oas:filter-doc-demo-en'
    let savedQuery = ''
    const report = (text: string) => {
      const memo = load(localStorage, KEY)
      out.textContent =
        `${text} | URL string: ${savedQuery || '(empty)'} | localStorage: ${memo ? JSON.stringify(memo) : '(empty)'}`
    }
    document.getElementById('filter-persist-save-en')?.addEventListener('click', () => {
      const params = toQuery(new URLSearchParams('page=1'), filter.conditions)
      savedQuery = `?${params.toString()}` // host applies history.replaceState(null, '', savedQuery)
      save(localStorage, KEY, filter.conditions)
      report(`Saved (an empty condition removes the conditions key — no empty tail in the URL)`)
    })
    document.getElementById('filter-persist-restore-en')?.addEventListener('click', () => {
      const restored = savedQuery ? fromQuery(savedQuery) : null
      if (restored === null) {
        report('No valid conditions in the URL string yet — click "Save" first')
        return
      }
      filter.conditions = restored
      report(`Restored: ${JSON.stringify(restored)}`)
    })
    document.getElementById('filter-persist-clear-en')?.addEventListener('click', () => {
      filter.conditions = {}
      savedQuery = ''
      save(localStorage, KEY, {}) // empty condition = removeItem (no empty tail)
      report('Conditions and localStorage memory cleared')
    })
  })
})
</script>

## API

### oas-filter

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `conditions` | Current value as JSON `{ sort?, order?, groups? }` (`order` only matters for toggled sort items: `asc` / `desc`; `groups` maps group key to a value array, single-select groups keep at most 1). The component writes this back and emits oas-change on user interaction; host writes only sync the view | `FilterConditions \| string` | — |
| `groups` | Filter groups as a JSON array `[{ key, label, multiple?, options: [{ value, label, disabled? }] }]`; entries without `options` are ignored, invalid JSON warns once and clears (the trigger hides when no groups remain) | `FilterGroup[] \| string` | — |
| `open` | Panel expanded state: user interaction / `setOpen()` writes it back and emits oas-open-change; host writes only sync the view | `boolean` | — |
| `panel` | Panel form: `dropdown` (default, anchored under the bar, dismisses on outside click) / `drawer` (half-screen sheet with a mask; recommended on narrow screens); invalid values fall back to `dropdown` and warn once | — | — |
| `sorts` | Sort options as a JSON array `[{ key, label, toggled? }]`; defaults to the featured/sales/price trio (price toggled), invalid JSON warns once and falls back; `toggled` items flip descending on first click, ascending on the next | `FilterSortOption[] \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `conditions` | Current value: get+set dual channel (object or JSON string), writes reflect the `conditions` attribute (controlled writes do not emit oas-change) | `FilterConditions \| string` | — |
| `groups` | Filter groups: get+set dual channel (array or JSON string), writes reflect the `groups` attribute | `FilterGroup[] \| string` | — |
| `open` | Panel expanded state: get+set dual channel (boolean), writes reflect the `open` attribute (silent; only `setOpen()` emits) | `boolean` | — |
| `sorts` | Sort options: get+set dual channel (array or JSON string), writes reflect the `sorts` attribute | `FilterSortOption[] \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `setOpen` | `setOpen(open: boolean): void` | Programmatic open/close (equivalent to user interaction): reflects the `open` attribute + emits oas-open-change + focus management (opening focuses the first condition, closing restores the trigger) |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Emitted after sorting / picking conditions / removing a chip / resetting, `detail: { sort, order, groups, summary }` (summary is a composed text for host-side aria-live); host writes to `conditions` do not emit |
| `oas-open-change` | Emitted after the panel opens / closes via user interaction or `setOpen()`, `detail: { open }`; host writes to `open` do not emit |
