# Integration FAQ

Common questions and pitfalls from real-world integrations.

## Composition patterns (React migration view)

### Where are asChild / Slot / Portal equivalents here?

The asChild / Slot / Portal concepts from the React ecosystem solve component-composition problems that grew out of the React model (eliminating library-imposed wrapper elements, mounting content elsewhere). Under Web Components those premises either do not exist or already have equivalents:

- **Swapping the root element (the wrapper-elimination job of asChild / Slot)** — a Web Component itself (its host) _is_ a real element in the DOM, so external layouts and selectors act on it directly; there is no library-imposed wrapper to strip. When a component must render as a different semantic element (e.g. a button that behaves as a link), use **attribute-driven root switching**: when `href` is present, buttons/tags render a native `<a>` internally and keep keyboard & disabled semantics (see the oas-button / oas-tag docs).
- **Using an arbitrary element as a trigger** (e.g. the common `Trigger asChild` composition) — the equivalent is the **default slot + a trigger attribute**: overlay components treat the default slot's first child as the trigger (any element / component), and a `trigger` attribute picks the mode (`click` / `hover` / `contextmenu`, …); panel content goes through the `content` attribute or named slots (`title` / `header` / `content` / `footer`, …). Events and ARIA are wired up internally by the component.
- **Mounting content into `body` or another container (Portal / Teleport)** — the equivalent is the **`append-to` system**: overlay/pinned components such as tooltip / popover / modal / drawer accept `append-to="body"` to move the overlay into a target container while preserving style scoping and stacking contexts; removing it returns the node and leaves no orphaned elements.

In short: the composition trio under Web Components is "**attribute-driven root element + named slots + append-to**", which covers the scenarios asChild / Slot / Portal solve — no same-named API is needed when migrating.

### React / Vue: what if an attribute name collides with a native DOM property?

When passing attributes to a custom element, if the name matches an **existing DOM property** on the element, the host writes it as a **property** (`el[name] = value`) instead of `setAttribute` — React 19 does this, and Vue's **bound** syntax (`:name`) hits the same rule for custom elements (source: `key in el`; except `spellcheck` / `draggable` / `translate` / `autocorrect`, which always go through attributes).

How OAS-UI handles it:

- **`prefix` / `suffix` / `blur`**: `prefix` collides with the read-only `Element.prefix`, and `blur` (oas-backdrop) with the `HTMLElement.blur()` method; `suffix` has no DOM counterpart and is handled symmetrically. The relevant components (input / input-number / statistic / countdown / tree-select / backdrop / mentions) **shadow** these names with property accessors mapped to the canonical attributes **`prefix-text` / `suffix-text` / `blur` / `trigger`** (mentions' `prefix` is a legacy alias of `trigger`) — so they work through **both channels**: React's `prefix="¥"` / `blur="blur(8px)"`, Vue's static/bound syntax, and plain HTML all behave. `prefix-text` / `suffix-text` are the canonical names and `prefix` / `suffix` are compatibility aliases; shadowing `blur` replaces that element's **native `blur()` method with the attribute accessor** (no practical impact on a backdrop). Under TypeScript, `blur` still shows the inherited method type (methods can't be declaration-merged), so to assign it as a property use the attribute or `setAttribute` instead.
- **Other writable colliding attributes** (`title`, `dir`, `role`, `hidden`, `draggable`, `spellcheck`, `autofocus`, `id`, …) are **writable** DOM properties, so React / Vue writing them as properties reflects back to attributes normally. Two nuances for `title`: `oas-modal` / `oas-drawer` _consume_ it — rendered into the title bar and then removed, so they do **not** trigger the browser's native tooltip and leave no attribute behind (expected behavior); on plain elements that don't consume it, the `title` attribute does fire the native tooltip. See the "Global attributes and the property channel" section in [Framework integration](/en/guide/frameworks) for the full React 19 mechanism (verified in Chromium, 2026-11-04).
- If you build your **own** custom element, avoid attribute names that match **read-only** `Element` / `HTMLElement` properties or methods (e.g. `prefix`, `blur`) — or shadow them with accessors the same way.

## Events

### Why do all events carry the `oas-` prefix?

`oas-` events are emitted through the core's shared `emit()`, which explicitly
sets `bubbles + composed` so they escape the Shadow DOM to window (note: the
platform's native `CustomEvent` defaults both to `false` — the escape is a
library convention, not a platform default). Unprefixed `change` / `select`
would collide with native events (e.g. the text-selection `select` event) and
host-framework synthetic events, making debugging painful. The prefix makes the
origin unambiguous — **listen for `oas-change`, not `change`**.

Each component's docs list its events and when they fire (see the "Events"
section of the component docs).

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

## Data properties

### Does the property channel of a data attribute accept JSON strings?

Yes. For host-framework compatibility (Vue writes static attributes on custom elements as properties), setters of array data properties such as `tasks` / `data` / `resources` / `events` / `items` accept both arrays and JSON strings at runtime (normalized by `shared/json-array`). **The public type remains an array** (prefer arrays through the property channel and JSON strings through the attribute channel); invalid JSON or non-array input generally falls back to an empty value without throwing.

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
#menu::part(item)[aria-expanded="true"] {
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

For languages beyond the built-in 11 (plus the `pt` alias): use the `zh-CN` pack's messages as a template → spread `...zhCN.messages` to inherit all keys and replace them one by one → tag `messages` as a `Locale` (type guardrail: missing keys fail at compile time) → mark `dir: 'rtl'` for RTL languages → `registerLocale` → `setLocale`. See the `@oas-ui/i18n` package README, "Custom locale packs" section, for the full step-by-step example. Ship custom packs with your own dynamic `import()` for code splitting (`loadLocale()` covers the built-in names; register custom packs first).

### Why isn't `getLocale().messages` the full set when I only import components?

The built-in Chinese default texts of `@oas-ui/i18n` ship as **per-family slices**: importing a component on demand only registers the slice of its family (e.g. a `data` chain carries only the data family's texts). `getLocale().messages` therefore contains just the **loaded slices**, not the complete key set. For the full set, use the whole-package entry `import '@oas-ui/i18n'`, or take the entire pack via `import zhCN from '@oas-ui/i18n/zh-CN'`. When `t()` misses a key it falls back to the key itself; in development each missing key logs a deduplicated warning once (silent in production), which is a useful signal for tracking down a missing slice.

### Why does `setLocale()` not work when ui is linked via `link:` / workspace?

When the host references `@oas-ui/ui` through `link:` (or a pnpm workspace), the `@oas-ui/i18n` resolved inside ui and the one the host depends on from the registry can be **two module instances**: calling `setLocale()` on the host's copy does not reach the instance used by ui components, so built-in texts fall back to raw keys (e.g. `popconfirm.ok`).

The root cause was that the locale registry and the core translator hook lived in **module-level variables**. Both now live on `globalThis` under versioned `Symbol.for` keys, so every copy in the same process shares one locale / translator state. In a linked setup **no import change is needed**: the existing `import { setLocale } from '@oas-ui/i18n'` works. The **family slices** of the default Chinese pack go through the same mechanism: the default-messages object they write to also lives on the shared state, so slices registered by different copies merge into one set — no orphaned writes that nobody reads.

Deduplicating in the host build is still recommended to avoid duplicate code and bundle weight (not required for correctness):

```ts
// Vite (also the vite config of Nuxt)
export default defineConfig({
  resolve: {
    dedupe: ["@oas-ui/i18n", "@oas-ui/core"],
  },
});
```

- With pnpm, pin `@oas-ui/i18n` via `overrides`, or make the link target and host share one copy;
- After deduplication, `pnpm why @oas-ui/i18n` should report a single copy;
- Deduplicating `@oas-ui/core` as well is recommended (the translator hook lives in core).

In a published setup (ui and i18n are same-version registry packages) there is normally a single instance, so no extra configuration is needed.

### Which languages are built in? Can they be loaded on demand?

Eleven locales ship built in (plus the `pt` alias for `pt-BR`): `zh-CN` (default),
`zh-Hant`, `en`, `ja`, `ko`, `de`, `fr`, `es`, `pt-BR`, `ru`, `ar` (RTL). The main entry only carries `zh-CN`; the rest are loaded
**on demand** and never enter the initial bundle:

```ts
import { loadLocale, setLocale } from "@oas-ui/i18n";
await loadLocale("ja"); // dynamic import('@oas-ui/i18n/ja'), a separate chunk
setLocale("ja");
```

Language tags are normalized as BCP 47, so common aliases work directly:
`pt` → `pt-BR`, `zh-TW` / `zh-HK` → `zh-Hant`, `zh-Hans` → `zh-CN`, `en_US` → `en`; tags with BCP 47 extensions fall back to the base language (`en-US-u-ca-gregory` → `en`), while private-use segments (`en-XA` / `en-x-foo`) are never stripped.

You can also import a pack statically (tree-shaking: only what you use ships):

```ts
import ja from "@oas-ui/i18n/ja";
setLocale(ja);
```

Date and number formatting go through native `Intl`
(`Intl.DateTimeFormat` / `Intl.NumberFormat`), so these locales display correctly
with no extra translations; the default `first-day-of-week` is derived from the
locale too (Monday for European/Chinese, Sunday for Japanese/Korean/English/Arabic).

### How are RTL locales handled?

The `ar` pack is tagged `dir: 'rtl'`, so switching to `ar` mirrors floating-layer
positioning automatically (select / combobox / auto-complete / tree-select /
date-picker / time-picker / mentions, …); you can also enable it explicitly or
locally with `oas-config-provider direction="rtl"`. Direction is resolved as
config-provider > nearest ancestor `dir` > `document.dir` > current locale.

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

## Web Components trade-off FAQ

The most common questions when evaluating the library. Each answer is a
deliberate, documented trade-off — with links to the full details.

### How do I use this with RSC / Next.js?

Dynamic registration via `useEffect` is the standard pattern for custom
elements under RSC (React has no native custom-element hydration). But SSR is
not limited to that path: the library supports DSD snapshot rendering with
true hydration (zero-flash shadow reuse), with Nuxt/Next integrations covered
by e2e — see [SSR](/en/guide/ssr).

### No framework wrappers — is event handling in React painful?

Not shipping wrappers is a deliberate decision: React 19+ has largely closed
the CE interop gap, and wrappers would only add runtime overhead and a
maintenance surface. A reference `useOasEvent` helper (vendor it into your
project) plus typed events from the api-manifest cover the gap — see
[framework integration](/en/guide/frameworks).

### What about shared state in complex apps?

The component library intentionally does not do app-level state management
(same boundary as "no routing / no data fetching"). Your own store plus
`oas-*` events is the standard answer; in-library cross-component coordination
uses provider patterns (e.g. config-provider), not bare DOM events.

### Styles inside Shadow DOM are hard to tweak?

Style isolation is by design — it buys zero style leakage and predictable
cascade. Three customization channels cover overrides: CSS variables (tokens,
covers most theming/fine-tuning) → `::part` (internal structure) → slot
replacement (content structure). See [Theming](/en/guide/theming) and
[Design Tokens](/en/guide/tokens).

### How do forms integrate with native protocols / third-party validation?

The library is form-associated: label `for` association, FormData collection,
reset, and the required validation chain all use native protocols, so an outer
`<form>` collects data directly. Adapter cost with libraries like Formik is a
generic boundary for any non-native control, not specific to Web Components.

### Does importing many components stack up bundle redundancy?

No. Deduplication comes from the ES module graph + bundler, independent of any
framework runtime; the base class and shared helpers are single shared modules.
Bundle size is also not a verbal promise: CI enforces a perf:size budget that
must not regress per version, with per-entry audits (both a whole-bundle
ceiling and per-entry absolute limits).
