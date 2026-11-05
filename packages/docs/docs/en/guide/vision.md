# Project Vision

## Vision in one sentence

**Foundation**: an **open-source, framework-agnostic, TypeScript-first** general-purpose UI component library: built on Web Components as the runtime, it works with React, Vue, vanilla JS, Svelte, or any other host — the same set of components, out of the box, in any frontend stack.

**Aspiration**: comprehensive, easy to use, and covering the vast majority of business scenarios — OAS-UI alone can power most business UIs, without assembling a second component set.

## Why it exists

- Frontend frameworks come and go, but **interaction behavior and design language stay the same** — yet every framework change means reinventing a component set.
- Most mainstream component libraries are bound to a single framework (Vue-only or React-only). Cross-stack teams, micro-frontends, and long-lived projects are forced to maintain multiple implementations.
- Web Components are now a native browser standard (Custom Elements + Shadow DOM), and since 2024 all major frameworks have closed their interop gaps — the window for a framework-agnostic component library is mature.

## Goals

| Dimension | Goal                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Runtime   | Web Components (Custom Elements + Shadow DOM), no framework runtime dependency — `<oas-button>` just works                        |
| Language  | Full TypeScript coverage with `.d.ts`; fully typed properties and events                                                          |
| Tooling   | Vite build + Vitest unit tests + Playwright visual/interaction tests                                                              |
| Theming   | CSS-variable design tokens + multiple themes (light/dark) + custom theming                                                        |
| i18n      | Framework-agnostic locale registry (no vue-i18n/react-intl), tree-shakable language packs, Intl.* formatting, RTL support         |
| Mobile    | Touch/narrow-screen adaptation: touch targets, bottom-sheet mobile hosting, overlay viewport fitting — ready on any device        |
| Bidi      | Full logical-direction RTL across components (mirrored positioning engine + CSS logical properties) + routine visual audits       |
| SSR       | DSD snapshot rendering + true hydration (zero-flash shadow reuse) + framework integrations (Nuxt/Next) — SSR works out of the box |
| Release   | Semantic versioning, docs site, demos, changelog, tree-shakable                                                                   |

## Design principles

1. **Native first**: where possible, components reuse native semantics/elements (`type=checkbox`, `<select>`, `<dialog>`) — accessibility, keyboard behavior, and screen-reader support come for free.
2. **Dependency-free first**: no third-party runtime dependencies; where needed (e.g. overlay positioning), prefer inline implementations or minimal MIT-licensed dependencies to keep size in check.
3. **Symmetric APIs**: property naming follows mainstream component-library conventions to lower migration cost (e.g. `size`, `disabled`, `loading`, `type`).
4. **Events as the interface**: all component communication goes through CustomEvents with the `oas-*` prefix to avoid collisions.
5. **Accessibility is an acceptance criterion**: no component is done until it passes keyboard navigation + ARIA + screen-reader checks.
6. **Shadow DOM + `::part()` exposure**: style isolation by default, with `::part()` and CSS variables as open customization points.
7. **Docs and code from one source**: component doc comments, demos, and tests are three views of the same source; the docs site is generated from it.
8. **Performance is a first-class goal**: bundle size, render cost, and interaction latency must be measurable, benchmarked, and gated (CI size/time budgets must not regress).

## Out of scope

- **No framework bindings**: no dedicated React/Vue wrapper builds — Web Components interoperate natively; adapters can live as separate sub-packages if the community wants them.
- **No app-level features**: routing, state management, data fetching, and SSR data prefetching are out of scope.
- **No icon fonts**: icons are inline SVG (tree-shakable).
- **No heavy graphics/rendering engines**: zero runtime dependencies and size discipline are preserved; effect/material capabilities ship as optional independent layers with degradation chains (CSS/SVG as the baseline).
