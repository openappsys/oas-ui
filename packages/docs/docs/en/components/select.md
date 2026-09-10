# Select

A dropdown selector supporting single/multiple selection, groups, clearable, remote search, and custom creation, with size/status variants, controlled open, and selection limits, fully operable by keyboard.

## Single Select

<DemoBlock title="Single select">
  <oas-select placeholder="Select a fruit" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"}]'></oas-select>
</DemoBlock>

## Preset Value

<DemoBlock title="Preset value">
  <oas-select value="banana" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
</DemoBlock>

## Multiple Select

<DemoBlock title="Multiple">
  <oas-select multiple value='["apple","banana","orange","strawberry"]' placeholder="Multiple" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"}]'></oas-select>
</DemoBlock>

In multiple mode `value` is a JSON array; selected items are shown as tags that can be removed individually. Tags wrap to new lines by default and the trigger grows with the content (no collapsing unless `max-tag-count` is set).

## Disabled

<DemoBlock title="Disabled">
  <oas-select disabled value="apple" placeholder="Disabled" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'></oas-select>
</DemoBlock>

## Size

<DemoBlock title="Size (size)">
  <oas-space size="small">
    <oas-select size="small" placeholder="small" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
    <oas-select placeholder="medium (default)" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
    <oas-select size="large" placeholder="large" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
  </oas-space>
</DemoBlock>

`size` supports `small` / `medium` (default) / `large`; control height and font size follow the global size tokens. When not set explicitly, the nearest `oas-config-provider` `size` injection applies (global density sync). Use `small` inside tables or `large` on filter bars directly.

## Status

<DemoBlock title="Validation status (status)">
  <oas-space size="small">
    <oas-select status="success" value="apple" placeholder="success" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'></oas-select>
    <oas-select status="warning" placeholder="warning" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'></oas-select>
    <oas-select status="error" placeholder="error" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'></oas-select>
  </oas-space>
</DemoBlock>

`status` supports `success` / `warning` / `error`, tinting the trigger border and focus ring. `error` also mirrors `aria-invalid="true"` onto the host (recognizable by screen readers); setting `aria-invalid` directly produces the same visual. Pairs well with form validation.

## Readonly

<DemoBlock title="Readonly (readonly) vs disabled">
  <oas-space size="small">
    <oas-select readonly value="banana" placeholder="Readonly" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
    <oas-select disabled value="banana" placeholder="Disabled" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
    <oas-select readonly multiple value='["apple","banana"]' placeholder="Multiple, readonly" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
  </oas-space>
</DemoBlock>

`readonly` and `disabled` carry different form semantics: readonly is focusable, copyable, never opens the dropdown, and the value still submits (clear and tag-remove affordances are hidden); disabled is not focusable and its value does not submit. Use readonly to display values decided elsewhere, disabled to block interaction.

## Empty State

<DemoBlock title="No data">
  <oas-select placeholder="No options" options='[]'></oas-select>
</DemoBlock>

When options are empty, the dropdown shows "暂无数据".

## Custom Empty

<DemoBlock title="Custom empty (empty slot)">
  <oas-select searchable placeholder="Type a non-matching keyword to see the empty state" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'>
    <template slot="empty">
      <span style="display:inline-flex;align-items:center;gap:4px">🍒 No matching fruit found</span>
    </template>
  </oas-select>
</DemoBlock>

`template[slot="empty"]` overrides both the "no data" and "no match" default texts (which come from the locale registry); the content is cloned into the dropdown empty area.

## Searchable

<DemoBlock title="Searchable">
  <oas-select searchable placeholder="Type a keyword to filter" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"}]'></oas-select>
</DemoBlock>

Once opened, you can type directly to filter; when nothing matches, "无匹配选项" is shown.

## Custom Filtering

<DemoBlock title="Custom filtering (filterMethod)">
  <oas-select id="select-filter" searchable placeholder="Try typing apple / fruit" options='[{"label":"Apple 苹果","value":"apple"},{"label":"Banana 香蕉","value":"banana"},{"label":"Orange 橙子","value":"orange"}]'></oas-select>
</DemoBlock>

By default options are matched by `label` inclusion; assigning `el.filterMethod = (query, option) => boolean` (a JS property channel — attributes cannot carry functions) takes over local filtering, where `query` is the raw input and `option` the full option object. This example (see the page script at the bottom) matches both `value` and `label` (pinyin-initial matching and other custom rules work the same way); in `remote` mode the host owns data-side filtering and `filterMethod` does not apply.

## Groups

<DemoBlock title="Grouped">
  <oas-select placeholder="Browse by group" options='[{"group":"Temperate fruits","label":"Apple","value":"apple"},{"group":"Temperate fruits","label":"Pear","value":"pear"},{"group":"Tropical fruits","label":"Banana","value":"banana"},{"group":"Tropical fruits","label":"Mango","value":"mango"},{"label":"Other","value":"other"}]'></oas-select>
</DemoBlock>

<DemoBlock title="Grouped multiple">
  <oas-select multiple placeholder="Grouped multiple" options='[{"group":"Temperate fruits","label":"Apple","value":"apple"},{"group":"Temperate fruits","label":"Pear","value":"pear"},{"group":"Tropical fruits","label":"Banana","value":"banana"},{"group":"Tropical fruits","label":"Mango","value":"mango"}]'></oas-select>
</DemoBlock>

Options carrying a `group` field are rendered under a group title (not selectable), with items indented; keyboard `↑`/`↓` navigates continuously across groups.

## Clearable

<DemoBlock title="Clearable">
  <oas-select clearable value="apple" placeholder="Clearable" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
  <oas-select clearable multiple value='["apple","banana"]' placeholder="Multiple, clearable" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
</DemoBlock>

When a value is selected, a clear button appears; clicking clears the value and dispatches `oas-clear` and `oas-change`.

## Remote Search

<DemoBlock title="Remote search (remote + loading)">
  <oas-select id="select-remote" remote searchable placeholder="Type a keyword to simulate remote search" options='[]'></oas-select>
  <span id="select-remote-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

In `remote` mode the component does no local filtering: typing dispatches `oas-input` for the host to request data, and the host sets `loading` during the request to show a loading placeholder. This example simulates an 800ms delayed filter:

<DemoBlock title="Remote loading placeholder">
  <oas-select remote searchable loading placeholder="Loading placeholder demo" options='[]'></oas-select>
</DemoBlock>

## Remote Debounce

<DemoBlock title="Remote debounce (debounce)">
  <oas-select id="select-debounce" remote searchable debounce="300" placeholder="Rapid typing dispatches only the last input" options='[]'></oas-select>
  <span id="select-debounce-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

`debounce` (milliseconds, default `0` — dispatch immediately, leaving existing behavior untouched) applies only to `oas-input` dispatching in `remote` mode: rapid inputs within the window collapse into a single last-value dispatch, sparing the host a `setTimeout` boilerplate; local filtering is always instant.

## Tag Collapse

<DemoBlock title="Tag collapse (max-tag-count)">
  <oas-select multiple max-tag-count="2" value='["apple","banana","orange","strawberry"]' placeholder="Collapse into +N when exceeded" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"}]'></oas-select>
</DemoBlock>

Multiple-select tags wrap by default and do not collapse; only when `max-tag-count` is explicitly set do they collapse into `+N` (hover to see the remaining items).

## Max Count

<DemoBlock title="Selection limit (max-count)">
  <oas-space size="small">
    <oas-select id="select-max" multiple max-count="2" placeholder="Pick at most 2" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"}]'></oas-select>
    <oas-tag id="select-max-log" type="warning">Limit hint</oas-tag>
  </oas-space>
</DemoBlock>

With `multiple` and `max-count` set, once the selection reaches the limit, unselected options become disabled and grayed out (selected ones can still be deselected, which re-enables the rest); attempts to exceed the limit — click or keyboard — dispatch `oas-exceed-limit` (`detail: { value, max }`), which this example uses to update the hint tag. `max-count` has no effect in single-select mode. Voting and tag-cap scenarios work out of the box.

## Allow Create

<DemoBlock title="Allow create">
  <oas-select allow-create searchable placeholder="Type a non-existent option to create" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
</DemoBlock>

When search yields no match, a "创建 xxx" item is shown; clicking or pressing Enter creates a new option from the input value and selects it.

## Custom Option Rendering

<DemoBlock title="Custom options (icons + rich text)">
  <oas-select id="select-custom" multiple searchable placeholder="Select a fruit with icons" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"}]'></oas-select>
</DemoBlock>

Listen to `oas-option-render` (each option row) and `oas-tag-render` (multi-select tags); `detail.element` is the corresponding text container that the host can rewrite into any content (icons, rich text). You can also put `<template slot="option">` / `<template slot="tag">` inside the component for a static skeleton — `[data-option-label]` / `[data-tag-label]` nodes get bound to the option/tag text automatically.

## Large Datasets (Virtual Scrolling)

<DemoBlock title="10k options virtual scrolling">
  <oas-select id="select-virtual" virtual searchable clearable item-height="36" placeholder="10k options, smooth scrolling" options='[]'></oas-select>
</DemoBlock>

With `virtual` set, only the visible window is rendered (reusing the `oas-virtual-list` window math; leading/trailing padding carries the scroll height) — 10k options scroll smoothly. `item-height` tunes the fixed row height (default `36`). Keyboard `↑`/`↓` scrolling follows the highlighted item and `aria-activedescendant` keeps pointing at a visible row; options with a `group` field fall back to full rendering.

## Dropdown Height

<DemoBlock title="Dropdown height (--oas-select-dropdown-height)">
  <oas-space size="small">
    <oas-select style="--oas-select-dropdown-height: 120px" placeholder="Max dropdown height 120px" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"},{"label":"Strawberry","value":"strawberry"},{"label":"Watermelon","value":"watermelon"},{"label":"Grape","value":"grape"}]'></oas-select>
    <oas-select id="select-height-virtual" virtual style="--oas-select-dropdown-height: 160px" placeholder="Works in virtual mode too" options='[]'></oas-select>
  </oas-space>
</DemoBlock>

The dropdown max height goes through the CSS variable `--oas-select-dropdown-height` (default `240px`) — override it to adjust, no attribute API involved; virtual scrolling follows it as well (re-open the dropdown to apply). The dropdown width stays aligned with the trigger (the majority default).

## Declarative Child-Element Channel

Besides the `options` JSON, you can declare options declaratively with `<oas-option>` child elements (matching the native `<select><option>` mental model: the default slot text is the label; attributes map to the `options` fields — `value` / `disabled` / `group` group title). The `options` attribute *takes precedence when explicitly set*; otherwise child elements are parsed and converge into the same rendering path (virtual scrolling, grouping, search etc. are fully identical). Child additions, removals, attribute and text changes re-render automatically (MutationObserver).

<DemoBlock title="Declarative child elements (native select mental model)">
  <oas-space size="small" direction="vertical">
    <oas-select id="select-decl" placeholder="Select a fruit" value="banana">
      <oas-option value="apple" group="Temperate fruits">Apple</oas-option>
      <oas-option value="banana" group="Temperate fruits">Banana</oas-option>
      <oas-option value="orange" group="Tropical fruits">Orange</oas-option>
      <oas-option value="mango" group="Tropical fruits">Mango</oas-option>
      <oas-option value="other" disabled>Other (disabled)</oas-option>
    </oas-select>
    <oas-space size="small">
      <oas-button id="select-decl-add" size="small">Add an option dynamically</oas-button>
      <oas-tag id="select-decl-result" type="info">oas-change: banana</oas-tag>
    </oas-space>
  </oas-space>
</DemoBlock>

## Field Mapping (host .map())

When business field names (`name`/`id`/`team`, etc.) differ from the component contract (`label`/`value`), align them with a one-line host-side `.map()` instead of a field-alias attribute — the JSON serialization boundary of Web Components naturally has the host assemble the data, where field mapping costs nothing:

<DemoBlock title="Business field mapping (.map(), dual channel)">
  <oas-space size="small" direction="vertical">
    <oas-select id="select-map-json" placeholder="Options channel (.map + property assignment)"></oas-select>
    <oas-select id="select-map-child" placeholder="Child-element channel (.map + oas-option)"></oas-select>
  </oas-space>
</DemoBlock>

The two channels are equivalent (see the page script at the bottom): `MEMBERS.map((m) => ({ label: m.name, value: m.id }))` then either `el.options = ...` (the setter reflects to the attribute) or `.map()` into `<oas-option>` child elements appended one by one.

## Dropdown Header & Footer

<DemoBlock title="Dropdown header/footer slots">
  <oas-select id="select-header" multiple placeholder="Select-all bar + append action" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'>
    <template slot="header">
      <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;margin:0">
        <input type="checkbox" id="select-header-all" />Select all
      </label>
    </template>
    <template slot="footer">
      <button type="button" id="select-header-add" style="appearance:none;border:none;background:transparent;padding:0;color:var(--oas-color-primary);cursor:pointer;font-size:inherit">＋ Append an item</button>
    </template>
  </oas-select>
</DemoBlock>

`template[slot="header"]` renders below the search box and above the options; `template[slot="footer"]` renders below the options (select-all bars, append buttons, etc.). Note: keyboard `↑`/`↓` navigation does not enter these areas — interactive content inside must be Tab-focusable (like the checkbox/button here) or modeled as an option; the logic is host-managed.

## Controlled Open

<DemoBlock title="Controlled open (open + oas-open-change)">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-select id="select-open-a" placeholder="① Pick a role (auto-opens ②)" options='[{"label":"Admin","value":"admin"},{"label":"Developer","value":"dev"},{"label":"Guest","value":"guest"}]'></oas-select>
      <oas-select id="select-open-b" placeholder="② Pick a permission" options='[{"label":"Read","value":"read"},{"label":"Write","value":"write"},{"label":"Delete","value":"delete"}]'></oas-select>
    </oas-space>
    <oas-tag id="select-open-log" type="info">Event log</oas-tag>
  </oas-space>
</DemoBlock>

Setting the `open` attribute takes control of the dropdown (present = open, removed = closed; the property channel `el.open = true` works too); user gestures (click / Esc / outside click / close-on-select) dispatch `oas-open-change` (`detail: { open }`) without forcing the state back — the host decides whether to add or remove the attribute (the controlled-component convention). In this example, picking ① auto-opens ②, and ②'s close event is arbitrated by the host removing the attribute.

## Placement

<DemoBlock title="Placement (placement)">
  <oas-space size="small">
    <oas-select placement="top" placeholder="Open upward" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
    <oas-select placeholder="auto (default)" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
    <oas-select placement="bottom" placeholder="Open downward" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
  </oas-space>
</DemoBlock>

`placement` supports `auto` (default — prefer bottom, auto-flip when space runs out) / `top` (force above) / `bottom` (force below). Use `top` for bottom-of-form layouts or long lists that feel more natural opening upward.

## Selected Option

<DemoBlock title="Selected option (oas-change carries option)">
  <oas-select id="select-option-detail" placeholder="Pick to see the full object" options='[{"group":"Temperate","label":"Apple","value":"apple"},{"group":"Tropical","label":"Banana","value":"banana"},{"group":"Tropical","label":"Orange","value":"orange"}]'></oas-select>
  <span id="select-option-detail-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

Besides `value`, the `oas-change` `detail` carries the full option object: `option` for single select (`label`/`value`/`group`/`disabled`, `null` when unmatched) and an `options` array for multiple select — no more host-side reverse lookup when a form submit needs the complete object.

## Focus Events

<DemoBlock title="Focus events (oas-focus / oas-blur)">
  <oas-space size="small">
    <oas-select id="select-focus" searchable placeholder="Focus / blur to see the log" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"}]'></oas-select>
    <oas-tag id="select-focus-log" type="info">Focus log</oas-tag>
  </oas-space>
</DemoBlock>

`oas-focus` / `oas-blur` dispatch when the component as a whole gains or loses focus (common for form wiring); internal focus moves (trigger ↔ search box) do not produce spurious events.

## Events

<DemoBlock title="Change events">
  <oas-select id="select-event" multiple placeholder="Select to trigger oas-change" options='[{"label":"Apple","value":"apple"},{"label":"Banana","value":"banana"},{"label":"Orange","value":"orange"}]'></oas-select>
  <span id="select-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

Listen to `oas-change`; `detail.value` is a string for single select and an array for multiple:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('select-event')
  const out = document.getElementById('select-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })

  // remote search demo: simulate host requests, filter and refill options by label after an 800ms delay
  const remote = document.getElementById('select-remote')
  const remoteOut = document.getElementById('select-remote-output')
  const REMOTE_ALL = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Orange', value: 'orange' },
    { label: 'Strawberry', value: 'strawberry' },
    { label: 'Watermelon', value: 'watermelon' },
  ]
  let remoteTimer = 0
  remote?.addEventListener('oas-input', (e) => {
    const q = e.detail.value
    window.clearTimeout(remoteTimer)
    remote.setAttribute('loading', '')
    remoteTimer = window.setTimeout(() => {
      remote.removeAttribute('loading')
      remote.setAttribute(
        'options',
        JSON.stringify(q ? REMOTE_ALL.filter((o) => o.label.includes(q)) : REMOTE_ALL),
      )
    }, 800)
  })
  remote?.addEventListener('oas-change', (e) => {
    remoteOut.textContent = `oas-change: ${e.detail.value}`
  })

  // custom option rendering demo: icons + rich text (rewrite element via oas-option-render / oas-tag-render)
  const custom = document.getElementById('select-custom')
  const CUSTOM_ICONS = { apple: '🍎', banana: '🍌', orange: '🍊', strawberry: '🍓' }
  custom?.addEventListener('oas-option-render', (e) => {
    const { option, element } = e.detail
    element.innerHTML = ''
    const ic = document.createElement('span')
    ic.textContent = CUSTOM_ICONS[option.value] ?? '•'
    const txt = document.createElement('span')
    txt.textContent = option.label
    element.append(ic, txt)
  })
  custom?.addEventListener('oas-tag-render', (e) => {
    const { value, element } = e.detail
    element.innerHTML = ''
    const ic = document.createElement('span')
    ic.textContent = CUSTOM_ICONS[value] ?? '•'
    element.append(ic)
  })

  // virtual scrolling demo: 10k options
  const virtual = document.getElementById('select-virtual')
  if (virtual) {
    virtual.setAttribute(
      'options',
      JSON.stringify(
        Array.from({ length: 10000 }, (_, i) => ({ label: `Option ${i}`, value: `v${i}` })),
      ),
    )
  }

  // Declarative child-element channel demo: selection feedback + dynamic append (MutationObserver auto-refresh)
  const declSelect = document.getElementById('select-decl')
  const declResult = document.getElementById('select-decl-result')
  declSelect?.addEventListener('oas-change', (e) => {
    declResult.textContent = `oas-change: ${e.detail.value}`
  })
  document.getElementById('select-decl-add')?.addEventListener('click', () => {
    if (!declSelect) return
    const n = declSelect.children.length + 1
    const opt = document.createElement('oas-option')
    opt.setAttribute('value', `dyn-${n}`)
    opt.textContent = `Dynamic fruit ${n}`
    declSelect.appendChild(opt)
  })

  // Custom filtering demo: filterMethod matches both value and label (pinyin-initial rules work the same way)
  const filterEl = document.getElementById('select-filter')
  if (filterEl) {
    filterEl.filterMethod = (query, option) =>
      option.value.includes(query.toLowerCase()) ||
      option.label.toLowerCase().includes(query.toLowerCase())
  }

  // Remote debounce demo: the component already merges dispatches at debounce=300; the host just consumes oas-input
  const debounceEl = document.getElementById('select-debounce')
  const debounceOut = document.getElementById('select-debounce-output')
  let debounceCount = 0
  debounceEl?.addEventListener('oas-input', (e) => {
    debounceCount += 1
    debounceOut.textContent = `Dispatch #${debounceCount}: ${JSON.stringify(e.detail.value)}`
  })

  // Max count demo: oas-exceed-limit feedback
  const maxEl = document.getElementById('select-max')
  const maxLog = document.getElementById('select-max-log')
  maxEl?.addEventListener('oas-exceed-limit', (e) => {
    maxLog.textContent = `Reached the limit of ${e.detail.max}; cannot select "${e.detail.value}"`
  })
  maxEl?.addEventListener('oas-change', () => {
    maxLog.textContent = 'Limit hint'
  })

  // Dropdown height demo: fill the virtual list with data
  const heightVirtual = document.getElementById('select-height-virtual')
  if (heightVirtual) {
    heightVirtual.setAttribute(
      'options',
      JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ label: `Option ${i}`, value: `v${i}` }))),
    )
  }

  // Field mapping demo: business fields (name/id/team) → component contract (label/value), one .map() line
  const MEMBERS = [
    { name: 'Lin Lan', id: 'u1', team: 'Design' },
    { name: 'Chen Mo', id: 'u2', team: 'Frontend' },
    { name: 'Su Qing', id: 'u3', team: 'Frontend' },
    { name: 'Zhou Ye', id: 'u4', team: 'Data' },
  ]
  const mapJson = document.getElementById('select-map-json')
  if (mapJson) {
    // Property assignment must wait for the element upgrade (assigning before upgrade
    // installs an own property that shadows the prototype setter → attribute stays empty
    // → dropdown shows "No data"; the oas-option children channel is timing-safe)
    customElements.whenDefined('oas-select').then(() => {
      mapJson.options = MEMBERS.map((m) => ({ label: `${m.name} (${m.team})`, value: m.id }))
    })
  }
  const mapChild = document.getElementById('select-map-child')
  for (const o of MEMBERS.map((m) => ({ value: m.id, label: m.name }))) {
    const opt = document.createElement('oas-option')
    opt.setAttribute('value', o.value)
    opt.textContent = o.label
    mapChild?.appendChild(opt)
  }

  // Header/footer demo: header select-all / footer append (host-managed logic)
  const headerSelect = document.getElementById('select-header')
  const headerAll = document.getElementById('select-header-all')
  const HEADER_OPTIONS = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Orange', value: 'orange' },
  ]
  headerAll?.addEventListener('change', () => {
    if (!headerSelect || !(headerAll instanceof HTMLInputElement)) return
    headerSelect.setAttribute(
      'value',
      JSON.stringify(headerAll.checked ? HEADER_OPTIONS.map((o) => o.value) : []),
    )
  })
  headerSelect?.addEventListener('oas-change', (e) => {
    if (headerAll instanceof HTMLInputElement) {
      headerAll.checked = e.detail.value.length === HEADER_OPTIONS.length
    }
  })
  let headerAddCount = 0
  document.getElementById('select-header-add')?.addEventListener('click', () => {
    if (!headerSelect) return
    headerAddCount += 1
    const next = [
      ...HEADER_OPTIONS,
      { label: `Extra ${headerAddCount}`, value: `extra-${headerAddCount}` },
    ]
    headerSelect.setAttribute('options', JSON.stringify(next))
  })

  // Controlled open demo: picking ① auto-opens ②; ②'s close event is arbitrated by the host
  const openA = document.getElementById('select-open-a')
  const openB = document.getElementById('select-open-b')
  const openLog = document.getElementById('select-open-log')
  const logOpen = (tag, open) => {
    openLog.textContent = `${tag} oas-open-change: ${open}`
  }
  openA?.addEventListener('oas-change', () => {
    if (openB) {
      openB.setAttribute('open', '')
      logOpen('②', true)
    }
  })
  openA?.addEventListener('oas-open-change', (e) => logOpen('①', e.detail.open))
  openB?.addEventListener('oas-open-change', (e) => {
    logOpen('②', e.detail.open)
    if (!e.detail.open) openB?.removeAttribute('open')
  })

  // Selected option demo: detail.option / detail.options carry full objects
  const detailEl = document.getElementById('select-option-detail')
  const detailOut = document.getElementById('select-option-detail-output')
  detailEl?.addEventListener('oas-change', (e) => {
    const opt = e.detail.option
    detailOut.textContent = opt
      ? `option: { label: ${opt.label}, value: ${opt.value}, group: ${opt.group ?? '—'} }`
      : 'option: null'
  })

  // Focus events demo
  const focusEl = document.getElementById('select-focus')
  const focusLog = document.getElementById('select-focus-log')
  focusEl?.addEventListener('oas-focus', () => {
    focusLog.textContent = 'oas-focus'
  })
  focusEl?.addEventListener('oas-blur', () => {
    focusLog.textContent = 'oas-blur'
  })
})
</script>

## API

### oas-select

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `allow-create` | Allow creating new options from the input value when nothing matches | `boolean` | — |
| `clearable` | Clearable (shows a clear button when a value exists; clearing dispatches `oas-clear`) | `boolean` | — |
| `debounce` | Remote search input debounce in ms (default 0 = immediate; only debounces oas-input in remote mode, local filtering stays instant) | — | — |
| `disabled` | Disabled | `boolean` | — |
| `item-height` | Fixed row height (px) when virtual scrolling | `string` | `36` |
| `loading` | Remote loading placeholder (use with `remote`) | `boolean` | — |
| `max-count` | Multi-select limit: at the limit unselected options are disabled-greyed and oas-exceed-limit fires; selected items stay removable; single-select unchanged | — | — |
| `max-tag-count` | Collapse tags beyond this count into `+N` in multiple mode (opt-in; without it tags wrap instead of collapsing) | `boolean` | — |
| `multiple` | Multiple select | `boolean` | — |
| `open` | Controlled open: attribute present = open, removed = closed; host gestures only fire oas-open-change (no forced write-back) | `boolean` | `false` |
| `options` | Options, JSON array `[{ label, value, disabled?, group? }]` | `Option[] \| string` | `[]` |
| `placeholder` | Placeholder text | — | — |
| `placement` | Dropdown direction: `auto` (default, bottom-first with flip) / `top` / `bottom` (forced, no flip) | `string` | `auto` |
| `readonly` | Read-only: focusable and copyable, no dropdown, value immutable (clear/remove buttons hidden) | `boolean` | — |
| `remote` | Remote search: no local filtering, typing dispatches `oas-input` for the host to request | `boolean` | — |
| `searchable` | Searchable (type to filter after opening the dropdown) | `boolean` | — |
| `size` | Size preset `small` / `medium` (default) / `large`: control height/font/chip height scale | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success`; error mirrors aria-invalid on the host | `string` | — |
| `value` | Current value (JSON array in multiple mode) | — | — |
| `virtual` | Virtual scrolling for large datasets: renders only the visible window (reuses oas-virtual-list); options with a `group` field fall back to full rendering | `boolean` | — |

| Event | Description |
| --- | --- |
| `oas-blur` | Fires when the component loses focus |
| `oas-change` | Selection/clear change, `detail: { value }` |
| `oas-clear` | Clear button clicked, `detail: { value }` (value before clearing) |
| `oas-exceed-limit` | Selection attempt past max-count (click/keyboard/create), `detail: { value, max }` |
| `oas-focus` | Fires when the component gains focus (trigger↔search inner moves are not reported) |
| `oas-input` | Input in `remote` mode, `detail: { value }` (for host requests) |
| `oas-open-change` | Open state flips, `detail: { open }` |
| `oas-option-render` | Dispatched for each rendered option row, `detail: { index, option, element }` (element is the option label container; host can rewrite it into icon/rich text) |
| `oas-tag-render` | Dispatched when a multi-select tag renders, `detail: { value, label, element }` (element is the tag text container; host can rewrite it) |

| Name | Description |
| --- | --- |
| `template[slot="empty"]` | Custom empty state (overrides both "no data" and "no match" defaults) |
| `template[slot="option"]` | Static option row template, cloned into each option label container; `[data-option-label]` nodes get bound to the option label |
| `template[slot="tag"]` | Static multi-select tag template, cloned into each chip text container; `[data-tag-label]` nodes get bound to the tag label |

### oas-option

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disable this option (not selectable) | — | — |
| `group` | Group title (optional): options in the same group render a consecutive group title (not selectable), items are indented | — | — |
| `value` | Option value (data-carrier field of the declarative child-element channel) | — | — |

| Name | Description |
| --- | --- |
| default | Option label content (default slot text) |

> Options carrying a `group` field are rendered under a group title (not selectable), items are indented; keyboard navigation continues across groups.

Keyboard: `Enter` / `↓` to open, `↑`/`↓` to move the highlight (works inside the search box too), `Enter` to select, `Esc` to close.
