# AutoComplete

Type to get suggestions: **the value is free text** (browser address bar / datalist mental model) — the suggestion list only aids input. Keyboard selection, grouping, debounced remote suggestions, and custom rendering are supported.

> **Boundary vs. Select(searchable) / Combobox**
>
> | Component | Value source | Input form | Best for |
> | --- | --- | --- | --- |
> | `oas-auto-complete` | **Any free text**; suggestions are shortcuts | Input is the control | Search-box suggestions, email completion, free-form tags |
> | `oas-select searchable` | Must come from the option set | Button-triggered; search box appears when expanded | Constrained choice (value must be valid) |
> | `oas-combobox` | Must come from the option set | Input is the control; typing only filters | Always-visible-input constrained single select |
>
> When the value must be one of the options, use select(searchable) or combobox instead of trying to add "strict validation" to auto-complete; for multiple/tags scenarios use `oas-select multiple` or `oas-dynamic-tags` — auto-complete stays single-value free text.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-auto-complete placeholder='Type "苹" to try' options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-auto-complete>
</DemoBlock>

Typing auto-filters matching items in the dropdown; the first item is highlighted by default and `Enter` commits it directly; `↑`/`↓` move the highlight, `Esc` closes; **blur does not clear the input** (free text never falls back).

## Preset Value

<DemoBlock title="Preset value">
  <oas-auto-complete value="苹果" placeholder="Selected value" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## Clearable

<DemoBlock title="Clearable">
  <oas-auto-complete id="ac-clear" clearable value="苹果" placeholder="Clearable" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

A clear button appears when the input has content; clicking clears the input and dispatches `oas-clear` and `oas-change` (empty value).

## Remote Suggestions (debounce + loading)

<DemoBlock title="Remote search suggestions">
  <oas-auto-complete id="ac-remote" debounce="300" clearable placeholder="Type a fruit name (simulated remote request)" options='[]'></oas-auto-complete>
  <span id="ac-remote-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`debounce` (ms, default `0` = off) only debounces `oas-input` dispatching and filtering — **the input display is never debounced**; the host sets `loading` while requesting, the dropdown shows a loading placeholder, and refilling `options` renders the suggestions.

## Show on Focus (trigger-on-focus)

<DemoBlock title="Show all suggestions on focus (trigger-on-focus)">
  <oas-auto-complete trigger-on-focus placeholder="Focus to show all suggestions" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

Off by **default** (popping the full list on focusing an empty input disturbs compact forms); enabling it follows the datalist mental model: focus shows suggestions filtered by the current input.

## Grouped Suggestions

<DemoBlock title="Groups (group)">
  <oas-auto-complete placeholder="Type a keyword" options='[{"group":"Recent","label":"iPhone","value":"iphone"},{"group":"Recent","label":"Apple Watch","value":"watch"},{"group":"Trending","label":"Banana milk","value":"banana-milk"},{"group":"Trending","label":"Orange","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

Options with a `group` field render group titles (not selectable) with indented options; `↑`/`↓` navigate continuously across groups.

## Custom Option Rendering

<DemoBlock title="Custom option (oas-option-render event)">
  <oas-auto-complete id="ac-render" placeholder="Type to try (rich suggestions)" options='[{"label":"张伟","value":"zhangwei"},{"label":"王芳","value":"wangfang"},{"label":"李娜","value":"lina"}]'></oas-auto-complete>
</DemoBlock>

<DemoBlock title="Custom option (template slot)">
  <oas-auto-complete id="ac-tpl" placeholder="Type to try (template skeleton)" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'>
    <template slot="option"><span>Fruit: </span><span data-option-label></span></template>
  </oas-auto-complete>
</DemoBlock>

The dual channel matches `oas-select`: listen to `oas-option-render` (`detail.element` is the text container the host can rewrite into icons/rich text); or provide a static skeleton via `<template slot="option">` whose `[data-option-label]` node auto-binds the option text.

## Panel Slots (header / footer / empty)

<DemoBlock title="Panel header/footer and empty slots">
  <oas-auto-complete id="ac-slots" placeholder='Type "梨" to try (custom empty)' options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'>
    <span slot="header">Hint: try a fruit name</span>
    <span slot="footer">View all fruits →</span>
    <span slot="empty">Try another keyword</span>
  </oas-auto-complete>
</DemoBlock>

`header` / `footer` slots render at the top/bottom of the suggestion panel (hint bar, "view all" link); the `empty` slot replaces the default "no match" text.

## Size & Status

<DemoBlock title="Sizes (size)">
  <oas-space size="small" direction="vertical">
    <oas-auto-complete size="small" placeholder="small" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete placeholder="medium (default)" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete size="large" placeholder="large" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
  </oas-space>
</DemoBlock>

<DemoBlock title="Status (status)">
  <oas-space size="small">
    <oas-auto-complete status="success" value="苹果" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete status="warning" value="未知水果" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
    <oas-auto-complete status="error" value="未知水果" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
  </oas-space>
</DemoBlock>

`size` supports `small / medium / large` (follows the nearest `oas-config-provider` `size` injection); `status` supports `success / warning / error` (`error` syncs `aria-invalid`, drivable by `oas-form-item` validation).

## Readonly

<DemoBlock title="Readonly">
  <oas-auto-complete readonly value="苹果" placeholder="Readonly" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-auto-complete>
</DemoBlock>

`readonly` allows focus & copy but no editing; focus and keyboard no longer open suggestions.

## IME (Input Method Editor)

During IME composition (before confirming the candidate) the component **does not filter, does not dispatch `oas-input`, and Enter never mis-selects a suggestion**; after composition ends, one filtered update fires with the final text. Try typing Chinese in any demo on this page — no extra configuration needed.

## Disabled

<DemoBlock title="Disabled">
  <oas-auto-complete disabled placeholder="Not editable" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
</DemoBlock>

## No Match

<DemoBlock title="Empty state">
  <oas-auto-complete placeholder='Type "梨" to try (no match)' options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## Events

<DemoBlock title="Input & selection events">
  <oas-auto-complete id="ac-event" clearable placeholder="Type or select" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
  <span id="ac-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

Listen to `oas-input` (typing, after debounce), `oas-change` (select or clear), `oas-clear` (clear):

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ac-event')
  const out = document.getElementById('ac-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  el?.addEventListener('oas-input', (e) => set('oas-input', e))
  el?.addEventListener('oas-change', (e) => set('oas-change', e))
  el?.addEventListener('oas-clear', (e) => set('oas-clear', e))

  // remote suggestions demo: simulate a host request (300ms debounce handled by the component)
  const remote = document.getElementById('ac-remote')
  const remoteOut = document.getElementById('ac-remote-output')
  const ALL = ['苹果', '香蕉', '橙子', '草莓', '西瓜', '葡萄', '芒果'].map((label, i) => ({
    label,
    value: `v${i}`,
  }))
  let timer = 0
  remote?.addEventListener('oas-input', (e) => {
    const q = e.detail.value
    window.clearTimeout(timer)
    remote.setAttribute('loading', '')
    remoteOut.textContent = `Requesting: ${q}`
    timer = window.setTimeout(() => {
      remote.removeAttribute('loading')
      remote.setAttribute('options', JSON.stringify(ALL.filter((o) => o.label.includes(q))))
      remoteOut.textContent = `Refilled ${q ? 'matched' : 'full'} suggestions`
    }, 500)
  })

  // rich suggestion demo: rewrite element via oas-option-render (name + email, two lines)
  const render = document.getElementById('ac-render')
  const EMAILS = { zhangwei: 'zhangwei@example.com', wangfang: 'wangfang@example.com', lina: 'lina@example.com' }
  render?.addEventListener('oas-option-render', (e) => {
    const { option, element } = e.detail
    if (!element) return
    element.textContent = ''
    const name = document.createElement('div')
    name.textContent = option.label
    const mail = document.createElement('div')
    mail.textContent = EMAILS[option.value] ?? ''
    mail.style.fontSize = 'var(--oas-font-size-xs)'
    mail.style.color = 'var(--oas-color-text-secondary)'
    element.append(name, mail)
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `clearable` | Clearable (shows a clear button when the input has content; clearing dispatches `oas-clear` and an empty `oas-change`) | `boolean` | — |
| `debounce` | Input debounce (ms, default 0 = off): only debounces `oas-input` dispatch and filtering, never the input display | `string` | `0` |
| `disabled` | Disabled | `boolean` | — |
| `loading` | Loading placeholder (dropdown shows a loading state; remote-suggestion request state) | `boolean` | — |
| `options` | Options, JSON array `[{ label, value, disabled?, group? }]` (group is the group title) | `Option[] \| string` | `[]` |
| `placeholder` | Placeholder text | `string` | — |
| `readonly` | Readonly (focusable & copyable, not editable; focus and keyboard never open suggestions) | `boolean` | — |
| `size` | Size tier: small / medium / large (default medium, follows the nearest config-provider injection) | `string` | `medium` |
| `status` | Validation status: success / warning / error (error syncs aria-invalid, drivable by oas-form-item validation) | `string` | — |
| `trigger-on-focus` | Show suggestions on focus (datalist mental model; off by default — input-first) | `boolean` | — |
| `value` | Preset value | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selected or cleared, `detail: { value, label }` |
| `oas-clear` | Clear button clicked, `detail: { value }` (value before clearing) |
| `oas-input` | While typing (after debounce), `detail: { value }` |
| `oas-option-render` | Dispatched after each option row renders, `detail: { index, option, element }`; the host can rewrite `element` (icons/rich text) |

### Slots

| Name | Description |
| --- | --- |
| `empty` | Custom no-match empty state (replaces the default text) |
| `footer` | Suggestion panel footer content (e.g. a view-all link) |
| `header` | Suggestion panel header content (e.g. a hint bar) |
| `template[slot="option"]` | Custom option template skeleton; the `[data-option-label]` node auto-binds the option text |

Keyboard: `↑`/`↓` to move (looping), `Enter` to select the highlighted item (first item highlighted by default), `Esc` to close.
