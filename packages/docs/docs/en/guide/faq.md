# Integration FAQ

Common questions and pitfalls from real-world integrations.

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
