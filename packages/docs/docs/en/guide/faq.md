# Integration FAQ

Common questions and pitfalls from real-world integrations.

## Composition patterns (React migration view)

### Where are asChild / Slot / Portal equivalents here?

The asChild / Slot / Portal concepts from the React ecosystem solve component-composition problems that grew out of the React model (eliminating library-imposed wrapper elements, mounting content elsewhere). Under Web Components those premises either do not exist or already have equivalents:

- **Swapping the root element (the wrapper-elimination job of asChild / Slot)** — a Web Component itself (its host) *is* a real element in the DOM, so external layouts and selectors act on it directly; there is no library-imposed wrapper to strip. When a component must render as a different semantic element (e.g. a button that behaves as a link), use **attribute-driven root switching**: when `href` is present, buttons/tags render a native `<a>` internally and keep keyboard & disabled semantics (see the oas-button / oas-tag docs).
- **Using an arbitrary element as a trigger** (e.g. the common `Trigger asChild` composition) — the equivalent is a **named slot**: overlay components expose `trigger` / `anchor` slots; whatever element the host places there becomes the trigger, with events and ARIA wired up internally by the component. This is strictly more capable than asChild (multiple triggers, arbitrary content).
- **Mounting content into `body` or another container (Portal / Teleport)** — the equivalent is the **`append-to` system**: overlay/pinned components such as tooltip / popover / modal / drawer accept `append-to="body"` to move the overlay into a target container while preserving style scoping and stacking contexts; removing it returns the node and leaves no orphaned elements.

In short: the composition trio under Web Components is "**attribute-driven root element + named slots + append-to**", which covers the scenarios asChild / Slot / Portal solve — no same-named API is needed when migrating.

## Events

### Why do all events carry the `oas-` prefix?

Web Components CustomEvents are `bubbles + composed` by default and escape the
Shadow DOM to window. Unprefixed `change` / `select` would collide with native
events (e.g. the text-selection `select` event) and host-framework synthetic
events, making debugging painful. The prefix makes the origin unambiguous —
**listen for `oas-change`, not `change`**.

Each component's docs list its events and when they fire (see the "Events"
section of the API table).

### Difference between `oas-input` and `oas-change`?

Same as native semantics: `oas-input` fires during continuous interaction
(e.g. every frame while dragging a slider); `oas-change` fires on commit
(release / Enter / blur). For low-frequency work such as auto-save, listen to
`oas-change` to avoid writing on every pixel of a drag.

### How do I read controlled state?

Controlled components (switch / radio-group / checkbox-group / slider /
input-number, etc.) write the latest value **back to the host attribute** after
interaction: `el.getAttribute('value')` / `el.hasAttribute('checked')` read the
current state directly, consistent with the event `detail` — no caching needed
on your side.

## Style customization

### No attribute selectors after `::part()`

Per the CSS specification, the `::part()` pseudo-element can only be followed
by pseudo-classes (`:hover` / `:focus`, etc.), never attribute selectors.
Writing `::part(item)[aria-expanded='true']` makes the **entire rule get
silently dropped** by the browser — including other comma-separated selectors
in the same rule — with no error whatsoever.

```css
/* correct */
#menu::part(item):hover {
  /* ... */
}

/* wrong: the whole rule dies (comma-separated siblings die with it) */
#menu::part(item):hover,
#menu::part(item)[aria-expanded='true'] {
  /* ... */
}
```

Alternatives for attribute-based states: components usually mirror state to a
CSS class or expose a dedicated `::part()`; prefer those. As a last resort,
operate on `shadowRoot` from JS.

### `::part()` cannot reach shadow-internal descendants

`::part()` only matches elements the component explicitly exposes; you
**cannot select their descendants** (`::part(item) .check` does not work). To
customize internals, look for deeper exposed parts, or pierce with CSS custom
properties (each component's "Style customization" section lists the available
variables).

### How do I make my own CSS follow light/dark themes?

Reference theme variables: `background: var(--oas-color-bg)`,
`color: var(--oas-color-text-primary)`. When `data-theme` switches, the library
variables swap automatically and anything referencing them follows. See
[Design Tokens](./tokens) for the full list.

## Internationalization (i18n)

### What is the placeholder syntax for translation interpolation?

The translation-interpolation placeholder in `@oas-ui/i18n` is **`{name}`** — a
single pair of braces with **no `#` prefix**. Write `{count}` in the language-pack
template and pass `t(key, { count })` to substitute, e.g.
`'pagination.total': '{total} items'` + `t('pagination.total', { total: 42 })` →
`42 items`.

> **`#{name}` is not a valid placeholder**: the `#` is never consumed by the
> interpolation logic and stays verbatim in the output (after substitution it is
> still `#{42}`). Do not carry over `#{var}`-style templating habits when writing
> language packs.

### How do I register a custom language pack / texts?

`@oas-ui/i18n` provides a global locale registry: `registerLocale(locale)`
registers a custom language pack and `setLocale(name)` switches globally; the pack
shape follows the built-in `zh-CN` (the key set is fully typed, missing keys are
compile-time errors). `oas-config-provider` supports local injection (the `locale`
attribute): components inside it prefer the injected locale for built-in texts
without any global setup.

## Theming

### The page body stays white after switching to dark?

The body is outside any component's Shadow DOM and is never styled
automatically. Reference the variables explicitly:

```css
body {
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
}
```
