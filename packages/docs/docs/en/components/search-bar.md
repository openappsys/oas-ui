---
description: "Search bar: input + clear / cancel / search trigger (Enter or search button) + history & hot-keyword slots (persistence owned by the host) + suggestions slot, with automatic empty-value / filled-value grouping; oas-search / oas-cancel events."
---

# SearchBar

Mobile search convention in one component: pill input (with built-in magnifier) + clear button + search button (Enter works the same) + cancel button (hide with `hide-cancel`) + a convention panel on focus — **when the value is empty it shows the history / hot-keyword slot groups; once a value is typed it switches to the suggestions slot group** (the same grouping mainstream shopping apps use). `value` is dual-channel; `oas-search` / `oas-cancel` events; **history persistence is owned by the host** (the component stores nothing — the host writes localStorage and renders into the slot).

Boundary with `oas-input`: oas-input is the general text input (it already supports `prefix-icon="search"` + `enterkeyhint="search"`); search-bar does not duplicate the input control itself — it owns the search-page conventions: the trigger semantics (single `oas-search` exit), the cancel exit, and the slot grouping for history / hot keywords / suggestions. See the component README for the full boundary.

## Basic search

Enter or the search button fires `oas-search` (detail `{ value }`; **empty values do not fire**); typing writes the `value` attribute in real time and fires `oas-input` (the host can render suggestions from it); the clear button empties and fires `oas-input` (focus returns to the input):

<DemoBlock title="Basic search (Enter / search button / clear)">
  <oas-search-bar id="sb-basic" value="sneakers"></oas-search-bar>
  <p id="sb-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Type and press Enter (or click the search button) to see the oas-search feedback.
  </p>
</DemoBlock>

## History & hot keywords slots

The `history` / `hot` slots render history and hot keywords (persistence owned by the host — the demo keeps an in-memory array), **shown when the value is empty and the input is focused**; clicks inside the panel keep focus via the panel's `pointerdown` guard (history chips stay clickable); Esc collapses the panel, refocusing expands it again:

<DemoBlock title="History + hot keywords (expand on focus, click to fill)">
  <oas-search-bar id="sb-panel" placeholder="Search products"></oas-search-bar>
  <p id="sb-panel-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Focus the input → the panel shows history / hot keywords; click a chip to fill and search.
  </p>
</DemoBlock>

## Suggestions slot

The `suggestions` slot shows **when a value is present and the input is focused** (the empty/filled grouping is driven by the component); the host listens to `oas-input` and renders suggestion items:

<DemoBlock title="Suggestions (type to see suggestions)">
  <oas-search-bar id="sb-suggest"></oas-search-bar>
  <p id="sb-suggest-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Type “shoe” to see suggestions; click one to fill and search.
  </p>
</DemoBlock>

## Variants: cancel / hide-cancel / disabled

`hide-cancel` hides the cancel button (for toolbars that already have an exit); `disabled` disables the input and all buttons; the cancel button fires `oas-cancel` (detail carries the **pre-clear value**, the host may restore it); the component then clears and collapses the panel:

<DemoBlock title="Cancel button / hide-cancel / disabled">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-search-bar id="sb-cancel" value="bluetooth earbuds"></oas-search-bar>
    <oas-search-bar hide-cancel value="no cancel button"></oas-search-bar>
    <oas-search-bar disabled value="disabled state"></oas-search-bar>
    <p id="sb-cancel-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Click the cancel button on the first row to see the oas-cancel feedback.
    </p>
  </div>
</DemoBlock>

## Keyboard & accessibility

- Input uses `type="search"` (implicit searchbox semantics) + `aria-label` (i18n, not placeholder-dependent) + `enterkeyhint="search"`; Enter searches, Esc collapses the panel.
- Search / clear buttons are icon-only with `aria-label` (“Search” / “Clear search input”); the clear button is out of the Tab order (Tab order = input → search → cancel); the cancel button has visible text.
- The panel is companion content (not an overlay): slot content semantics belong to the host (history buttons carry their own accessible names); the panel's `pointerdown` preventDefault keeps focus — input elements inside host slots need their own focus handling.
- RTL mirrors via logical properties; colors are token-based (dark theme follows automatically).

## Custom styling notes

`::part(field)` is the pill row (magnifier `::part(lead-icon)` + `::part(input)` + `::part(clear)`); `::part(go)` is the search button and `::part(cancel)` the cancel button; the convention panel `::part(panel)` contains the three group containers `::part(suggestions)` / `::part(history)` / `::part(hot)` (visibility driven by value). Override `::part(go)` background to restyle the search button.

<script setup lang="ts">
import { onMounted } from 'vue'

// Demo script conventions (do not move): ① must be a page-level script setup — inside DemoBlock
// VitePress does not extract it and the raw text breaks the page (imports fail / hydration mismatch);
// ② placed before `## API`: that section is the api:gen generated region, business scripts must not live there.
onMounted(() => {
  customElements.whenDefined('oas-search-bar').then(() => {
    const basic = document.getElementById('sb-basic')!
    const basicOut = document.getElementById('sb-basic-out')!
    basic.addEventListener('oas-search', (e) => {
      const d = (e as CustomEvent).detail
      basicOut.textContent = `oas-search: ${d.value} (a real page would navigate to results)`
    })

    const panel = document.getElementById('sb-panel')!
    const panelOut = document.getElementById('sb-panel-out')!
    const history = ['running shoes', 'knit cardigan', 'canvas bag']
    const renderHistory = (): void => {
      panel.querySelectorAll('[data-demo-history]').forEach((n) => n.remove())
      for (const word of history) {
        const btn = document.createElement('oas-button')
        btn.dataset.demoHistory = ''
        btn.setAttribute('slot', 'history')
        btn.setAttribute('size', 'small')
        btn.textContent = word
        btn.addEventListener('click', () => {
          panel.setAttribute('value', word)
          panelOut.textContent = `History chip filled: ${word} (the host would also trigger the search)`
        })
        panel.appendChild(btn)
      }
      const hotWords = ['new arrivals', '300 off 50']
      for (const word of hotWords) {
        const btn = document.createElement('oas-button')
        btn.setAttribute('slot', 'hot')
        btn.setAttribute('size', 'small')
        btn.setAttribute('type', 'primary')
        btn.setAttribute('plain', '')
        btn.textContent = word
        btn.addEventListener('click', () => {
          panel.setAttribute('value', word)
          panelOut.textContent = `Hot keyword filled: ${word}`
        })
        panel.appendChild(btn)
      }
    }
    renderHistory()
    panel.addEventListener('oas-search', (e) => {
      panelOut.textContent = `oas-search: ${(e as CustomEvent).detail.value}`
    })

    const suggest = document.getElementById('sb-suggest')!
    const suggestOut = document.getElementById('sb-suggest-out')!
    const pool = ['shoes', 'flat shoes', 'sandals', 'basketball shoes']
    suggest.addEventListener('oas-input', (e) => {
      const d = (e as CustomEvent).detail
      suggest.querySelectorAll('[data-demo-suggest]').forEach((n) => n.remove())
      if (d.value === '') return
      for (const item of pool.filter((p) => p.includes(d.value))) {
        const btn = document.createElement('oas-button')
        btn.dataset.demoSuggest = ''
        btn.setAttribute('slot', 'suggestions')
        btn.setAttribute('size', 'small')
        btn.textContent = item
        btn.addEventListener('click', () => {
          suggest.setAttribute('value', item)
          suggest.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        })
        suggest.appendChild(btn)
      }
    })
    suggest.addEventListener('oas-search', (e) => {
      suggestOut.textContent = `oas-search: ${(e as CustomEvent).detail.value}`
    })

    const cancel = document.getElementById('sb-cancel')!
    const cancelOut = document.getElementById('sb-cancel-out')!
    cancel.addEventListener('oas-cancel', (e) => {
      const d = (e as CustomEvent).detail
      cancelOut.textContent = `oas-cancel: cleared “${d.value}” (detail carries the pre-clear value)`
    })
  })
})
</script>

## API

### oas-search-bar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disables the input and all buttons (config-provider injected disabled applies too) | `boolean` | — |
| `hide-cancel` | Hides the cancel button (for toolbars that already have an exit) | `boolean` | — |
| `placeholder` | Placeholder text, defaults to i18n “Search products” (host overridable) | — | — |
| `value` | Current input value. Typing writes the attribute in real time and fires oas-input (the host can render suggestions); empty values never fire oas-search | `string \| number` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `value` | Current input value: get+set dual channel, writes reflect the `value` attribute (no events on assignment) | `string \| number` | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-cancel` | Cancel button, `detail: { value }` carries the pre-clear value (the host may restore it); the component then clears and collapses the panel |
| `oas-input` | Fires on every input (the clear button fires it too — hosts listening only to oas-input never miss a clear), `detail: { value }` |
| `oas-search` | Enter or the search button, `detail: { value }`; empty values do not fire |

#### Slots

| Name | Description |
| --- | --- |
| `history` | History keywords (shown when empty + focused; persistence owned by the host — render chips and record them yourself) |
| `hot` | Hot keywords (shown when empty + focused, grouped beside history) |
| `suggestions` | Suggestions (shown when filled + focused; render dynamically from oas-input) |
