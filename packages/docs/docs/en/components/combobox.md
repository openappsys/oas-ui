# Combobox

A filterable single-select combobox whose input is the control: **an always-visible editable input** shows the selected label, typing filters options in real time, and `value` takes `option.value` on selection.

> **Choosing among the three (select / combobox / auto-complete)**
>
> | Component | Value source | Input form | One-line positioning |
> | --- | --- | --- | --- |
> | `oas-select` | Must come from the option set | Button-triggered; no always-visible input | The default form of constrained choice (multiple/create/remote full suite) |
> | `oas-combobox` | Must come from the option set | Input is the control; typing only filters | Always-visible-input constrained single select |
> | `oas-auto-complete` | **Any free text** | Input is the control | Suggestion input (value need not come from options) |
>
> combobox keeps the pure-filtering semantics of "value always from options": **no** multiple (use `oas-select multiple searchable`), **no** allow-create (use `oas-select allow-create` or `oas-dynamic-tags` for creation, `oas-auto-complete` for free text) — no duplication with existing capabilities in the library.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-combobox placeholder="Type or select" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-combobox>
</DemoBlock>

Click/focus to open the dropdown; typing filters in real time (`filterable` is enabled by default, substring-matching the label); `↑`/`↓` move the highlight, `Enter` selects, `Esc` closes.

## Preset Value (controlled)

<DemoBlock title="Preset value (controlled)">
  <oas-combobox value="banana" placeholder="Selected value" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

`value` is a controlled property: it is written back after selection; externally changing the property also immediately reflects in the input's label.

## Externally Controlled Value

<DemoBlock title="External controlled value">
  <oas-combobox id="cb-controlled" placeholder="Set value externally via button" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <oas-button id="cb-set-apple" size="small">Set to 苹果</oas-button>
  <oas-button id="cb-clear-value" size="small">Clear value</oas-button>
</DemoBlock>

In controlled mode, the host can drive the component display via the `value` attribute at any time:

## Groups

<DemoBlock title="Groups (group)">
  <oas-combobox placeholder="Browse by group" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"},{"label":"其他","value":"other"}]'></oas-combobox>
</DemoBlock>

Options with a `group` field render group titles (not selectable) with indented options; `↑`/`↓` navigate continuously across groups (same JSON contract as `oas-select`).

## Custom Filter Function

<DemoBlock title="Custom filtering (el.filter)">
  <oas-combobox id="cb-filter" placeholder="Type pinyin initials (pg / xj / cz)" options='[{"label":"苹果","value":"pingguo"},{"label":"香蕉","value":"xiangjiao"},{"label":"橙子","value":"chengzi"}]'></oas-combobox>
  <span id="cb-filter-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

`el.filter = (option, query) => boolean` is a JS property channel (attributes cannot carry functions): it takes over local filtering (e.g. pinyin initials, remote matching); set to `null` to restore the default label-substring filter; not involved when `filterable="false"`.

## Size & Status

<DemoBlock title="Sizes (size)">
  <oas-space size="small" direction="vertical">
    <oas-combobox size="small" placeholder="small" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox placeholder="medium (default)" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox size="large" placeholder="large" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
  </oas-space>
</DemoBlock>

<DemoBlock title="Status (status)">
  <oas-space size="small">
    <oas-combobox status="success" value="apple" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox status="warning" value="apple" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox status="error" value="apple" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
  </oas-space>
</DemoBlock>

`size` supports `small / medium / large` (follows the nearest config-provider injection); `status` supports `success / warning / error` (`error` syncs `aria-invalid`, drivable by `oas-form-item` validation).

## Readonly

<DemoBlock title="Readonly">
  <oas-combobox readonly value="apple" placeholder="Readonly" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-combobox>
</DemoBlock>

`readonly` allows focus & copy but no value change; focus and keyboard no longer open the dropdown.

## Controlled Open

<DemoBlock title="Controlled open + oas-open-change">
  <oas-combobox id="cb-open" placeholder="Host-driven open/close" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <oas-button id="cb-open-toggle" size="small">Toggle open</oas-button>
  <span id="cb-open-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

The `open` attribute is the controlled open state (internal open/close writes back to it); every transition dispatches `oas-open-change` (`detail.open` boolean) — linked scenarios (opening via external buttons/shortcuts) are implemented by the host driving the attribute.

## Large Data (Virtual Scroll)

<DemoBlock title="10k-option virtual scroll">
  <oas-combobox id="cb-virtual" virtual item-height="48" clearable placeholder="10,000 options, smooth scrolling" options='[]'></oas-combobox>
</DemoBlock>

With `virtual`, only the visible window renders (reusing `oas-virtual-list` window computation) — 10k options scroll smoothly; `item-height` adjusts the fixed height (default `36`). Keyboard `↑`/`↓` navigation auto-follows the highlighted item and `aria-activedescendant` keeps pointing at a visible item; options with `group` automatically fall back to full rendering.

## Filtering & Blur Boundaries

<DemoBlock title="Input filtering + blur fallback">
  <oas-combobox value="apple" placeholder="Falls back automatically on blur after typing" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-combobox>
</DemoBlock>

If you type without selecting and then blur/press `Esc`, the input falls back to the currently selected label (non-destructive by default — the selected value is not lost) — combobox values always come from options; for free text use `oas-auto-complete`.

## Not Filterable

<DemoBlock title='Filtering disabled (filterable="false")'>
  <oas-combobox filterable="false" placeholder="No filtering on typing, select via keyboard only" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

With `filterable="false"`, typing no longer filters options; select only via keyboard `↑`/`↓` + `Enter` or mouse.

## Clearable

<DemoBlock title="Clearable">
  <oas-combobox clearable value="apple" placeholder="Clearable" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

When a value is selected, a clear button appears; clicking clears `value` and dispatches `oas-clear` and `oas-change`.

## Loading

<DemoBlock title="Loading">
  <oas-combobox loading placeholder="Focus to see the loading placeholder" options='[]'></oas-combobox>
</DemoBlock>

While `loading`, the dropdown shows a loading placeholder (the host sets it during remote data requests).

## Empty State

<DemoBlock title="No options (empty)">
  <oas-combobox placeholder="No options" options='[]'></oas-combobox>
</DemoBlock>

When options are empty, the dropdown shows the empty state; when filtering yields no match, the no-match state is shown.

## Disabled

<DemoBlock title="Disabled">
  <oas-combobox disabled value="apple" placeholder="Disabled" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-combobox>
</DemoBlock>

## Events

<DemoBlock title="Event output">
  <oas-combobox id="cb-event" clearable placeholder="Type or select" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <span id="cb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Listen to `oas-input` (filter keyword), `oas-change` (selection), `oas-clear` (clear), `oas-open-change` (open transitions):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('cb-event')
  const out = document.getElementById('cb-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  el?.addEventListener('oas-input', (e) => set('oas-input', e))
  el?.addEventListener('oas-change', (e) => set('oas-change', e))
  el?.addEventListener('oas-clear', (e) => set('oas-clear', e))
  el?.addEventListener('oas-open-change', (e) => set('oas-open-change', e))

  // controlled value demo: the host drives the value attribute externally
  const controlled = document.getElementById('cb-controlled')
  document.getElementById('cb-set-apple')?.addEventListener('click', () => {
    controlled?.setAttribute('value', 'apple')
  })
  document.getElementById('cb-clear-value')?.addEventListener('click', () => {
    controlled?.removeAttribute('value')
  })

  // custom filter demo: pinyin-initial matching (JS property channel)
  const filterEl = document.getElementById('cb-filter')
  const filterOut = document.getElementById('cb-filter-output')
  if (filterEl) {
    filterEl.filter = (option, query) => {
      const q = query.toLowerCase()
      return option.value.startsWith(q) || option.label.includes(query)
    }
    filterEl.addEventListener('oas-input', (e) => {
      filterOut.textContent = `Query: ${e.detail.value}`
    })
  }

  // controlled open demo: host-driven + event echo
  const openEl = document.getElementById('cb-open')
  const openOut = document.getElementById('cb-open-output')
  openEl?.addEventListener('oas-open-change', (e) => {
    openOut.textContent = `oas-open-change: ${e.detail.open}`
  })
  document.getElementById('cb-open-toggle')?.addEventListener('click', () => {
    if (!openEl) return
    if (openEl.hasAttribute('open')) openEl.removeAttribute('open')
    else openEl.setAttribute('open', '')
  })

  // virtual scroll demo: 10k options
  const virtual = document.getElementById('cb-virtual')
  if (virtual) {
    virtual.setAttribute(
      'options',
      JSON.stringify(
        Array.from({ length: 10000 }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })),
      ),
    )
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clearable` | Clearable (shows a clear button when a value exists; clearing dispatches `oas-clear`) | `boolean` | — |
| `disabled` | Disabled (no input, no dropdown) | `boolean` | — |
| `filter` | Custom filter function (JS property channel `el.filter = fn`): takes over local filtering (pinyin initials/remote matching); set null to restore the default label-substring filter; not involved when `filterable="false"` | `((option: Option, query: string) => boolean) \| null` | — |
| `filterable` | Filter labels in real time while typing (`filterable="false"` disables local filtering) | `string` | `true` |
| `item-height` | Virtual-scroll fixed row height (px, with `virtual`, default 36) | `string` | `36` |
| `loading` | Loading placeholder (dropdown shows "加载中…") | `boolean` | — |
| `open` | Controlled open state (internal open/close writes back to the attribute; every transition dispatches `oas-open-change`; forced closed under readonly/disabled) | `boolean` | — |
| `options` | Options, JSON array `[{ label, value, disabled?, group? }]` (group is the group title, same contract as oas-select) | `Option[] \| string` | `[]` |
| `placeholder` | Placeholder text | — | — |
| `readonly` | Readonly (focusable & copyable, no value change; focus and keyboard never open the dropdown) | `boolean` | — |
| `size` | Size tier: small / medium / large (default medium, follows the nearest config-provider injection) | `string` | `medium` |
| `status` | Validation status: success / warning / error (error syncs aria-invalid, drivable by oas-form-item validation) | `string` | — |
| `value` | Current value (controlled, the selected option's `option.value`) | `string` | — |
| `virtual` | Virtual scroll (reuses oas-virtual-list to render only the visible window; options with group fall back to full rendering) | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection/clear change, `detail: { value }` |
| `oas-clear` | Clear button clicked, `detail: { value }` (value before clearing) |
| `oas-input` | Filter keyword typed, `detail: { value }` |
| `oas-open-change` | Open state transition (both controlled setAttribute and internal toggles dispatch), `detail: { open }` |

Keyboard: `Enter` / focus to open, `↑`/`↓` to move the highlight, `Enter` to select, `Esc` to close and revert.
