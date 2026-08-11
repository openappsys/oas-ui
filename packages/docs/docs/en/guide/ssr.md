# SSR Boundaries

OAS-UI is a Web Components library: components register custom elements,
Shadow DOM and events at runtime in the browser. The following boundaries apply
in SSR / static-generation environments.

## Core rule

::: danger Do not run side-effect imports of the component library during server-side rendering
The library entry `@oas-ui/ui` calls `customElements.define` and DOM APIs,
which throw in Node (no DOM), e.g. `HTMLElement is not defined`.
:::

## DSD route (progressive enhancement)

The long-term SSR strategy is Declarative Shadow DOM (DSD): the server outputs
the static structure plus styles inside `<template shadowrootmode="open">`, and
the browser's custom element upgrade takes over interactivity afterwards.

Current progress:

- The base class `OASElement` reuses an existing declarative shadow root: when
  the element already has a shadow root attached by
  `<template shadowrootmode="open">` before upgrade, the constructor reuses it
  instead of calling `attachShadow` (which would throw `NotSupportedError` and
  break the component).
- The `@oas-ui/ssr` renderer has landed: it boots a minimal DOM shim on
  happy-dom in Node, registers the component classes, renders per input, and
  serializes the shadow snapshot as DSD, returning the full host HTML string
  (see "Server rendering (experimental)").
- True hydration: on upgrade the component detects the DSD snapshot fingerprint,
  skips the shadow rebuild, and only caches nodes, binds events, plus runs
  incremental `update()`. If the snapshot structure mismatches, it falls back to
  a full re-render (correctness first).
- A declarative data channel for data components: table / tree / select /
  transfer / toggle-group take `columns` / `data` / `options` / `items` through
  the JSON attribute channel (property assignment reflects to the attribute in
  one direction; invalid JSON falls back to the empty state), and the SSR
  snapshot serializes the header and data rows / tree node rows / dropdown
  options / shuttle panel data / button groups.
- Form components batch 1 (DSD whitelisting): input / textarea / checkbox /
  radio / switch / slider / input-number / rate / auto-complete / combobox /
  cascader / tree-select / mentions / date-picker / time-picker / calendar /
  upload / color-picker / toggle-button / toggle-group / pin-input /
  dynamic-input / dynamic-tags / editable / form / form-item are all split into
  `template()` (pure function) / `bind()` (caches nodes + binds events) /
  `hydrate()` (validates snapshot structure + takes over) — the SSR snapshot
  includes the skeleton and selected values; dropdown panels default to the
  closed state, the upload list is empty, and the textarea autosize height is the
  un-measured state (corrected on the first frame after hydration via rAF, same
  strategy as affix).
- Feedback components batch 2 (DSD whitelisting): alert / progress / spin /
  skeleton / result / backdrop / modal / drawer / popconfirm all follow the same
  three-part split — the visible-state components (alert/progress/spin/skeleton/
  result) snapshot their full visual; backdrop renders a visible mask with
  `open` (its default closed state self-removes on update, so it is not a
  snapshot scenario); modal/drawer snapshot the host skeleton in their default
  closed state (`display: none`, and a server-direct `visible` snapshot includes
  the full dialog); popconfirm snapshots the trigger slot plus the hidden
  popover. The imperative components (message / notification / toast / snackbar /
  loading-bar / confirm) are created dynamically by imperative APIs and do not
  exist in the initial DOM, so SSR is meaningless — they stay out of the
  whitelist.
- First-frame flicker mitigation for layout-measuring components:
  affix / ellipsis / scroll-area defer layout writes to the first frame after
  upgrade when a DSD snapshot is detected (via rAF) — the snapshot is the
  un-measured state, the first frame after upgrade matches it (no jump), and the
  real layout is applied on the next frame.
- Whitelist-finalization batch 5 (DSD whitelisting): the pure-presentation
  components badge / button-group / icon / kbd / label / link / space /
  visually-hidden snapshot their full visual deterministically (badge count,
  kbd key-cap splitting, space host inline layout styles); the floating-trigger
  components tooltip / popover default to the closed state and snapshot the
  trigger slot as-is plus the hidden bubble skeleton (content/title text is
  synced; positioning is computed only when triggered); the framework-level
  containers config-provider / app have no visual of their own and snapshot the
  subtree as-is with their container attributes in place (`data-theme` / `size`,
  etc.), with nested children covered by `injectNestedDSD`. `oas-theme-editor`
  is a dev-tool component (a theme-editing panel for development) with little
  SSR value — it was evaluated and excluded from the whitelist, staying
  client-only.

Not yet landed (ROADMAP backlog):

- Framework integration plugins (Nuxt / Next).

Whitelisted components can be rendered on the server directly; the rest keep the
"client-only" approach below.

### Vue (Nuxt / Vite SSR)

Use dynamic import and run it after the client mounts:

```ts
// client only
onMounted(async () => {
  const { OASMessage } = await import('@oas-ui/ui')
  OASMessage?.success?.('Loaded')
})
```

```html
<ClientOnly>
  <oas-table :columns="…"></oas-table>
</ClientOnly>
```

### React (Next.js)

Render components on the client only:

```tsx
'use client'
import { useEffect, useState } from 'react'
```

Or disable SSR with `next/dynamic`:

```tsx
const Table = dynamic(() => import('./TablePage'), { ssr: false })
```

### Vanilla / other frameworks

The server only outputs a static placeholder; the script resource is executed by
the browser to register the components.

## Server rendering (experimental)

The `@oas-ui/ssr` package provides the renderer
`renderToString(tag, attrs, slotHTML, { locale })`: on a Node server it renders
a whitelisted component into a full HTML string made of the host tag plus a
`<template shadowrootmode="open">` snapshot. The browser renders structure and
styles with no JS; loading the component library script afterwards upgrades the
elements and takes over interactivity.

> Note: the shadow inline styles in the snapshot reference `--oas-*` theme
> tokens (defined on `:root` in `@oas-ui/theme`). The page must include
> `@oas-ui/theme` as usual, otherwise the snapshot components render without
> colors (unresolved tokens fall back to transparent).

```ts
import { renderToString } from '@oas-ui/ssr'

const html = await renderToString(
  'oas-button',
  { type: 'primary', size: 'large' },
  'Submit',
  { locale: 'en' },
)
// '<oas-button type="primary" size="large"><template shadowrootmode="open">…</template>Submit</oas-button>'
```

**Why async**: evaluating the component classes needs a global DOM shim
(`class extends HTMLElement` requires `HTMLElement` / `customElements` to be in
place). A static import would evaluate too early to guarantee "shim first, then
components", so the first call dynamically loads the component modules (after
the shim is installed); modules are cached afterwards and later calls only pay
for the rendering itself.

> Note: DSD templates are attached by the browser's **HTML parser**; runtime
> string injection such as `innerHTML` does not attach them. The returned string
> should reach the browser through the SSR output stream (the server-rendered
> HTML response).

> Process-level side effect: on first call the renderer installs happy-dom's
> `document` / `customElements` / `HTMLElement` and other globals onto
> `globalThis` (required for component class evaluation and registration). If
> your Node process uses another global DOM solution (other SSR libraries, test
> framework environments), evaluate coexistence first — the renderer throws a
> clear error when globals cannot be installed. Also, the `locale` option
> switches via the global i18n registry; the rendering segment runs
> synchronously, so there is no interleaving window between requests on a single
> thread.

### Nuxt (Nitro server route)

```ts
// server/api/ssr-demo.ts
import { renderToString } from '@oas-ui/ssr'

export default defineEventHandler(async () => {
  const button = await renderToString('oas-button', { type: 'primary' }, 'Submit')
  const empty = await renderToString('oas-empty', { description: 'No data' })
  return `<div class="ssr-demo">${button}${empty}</div>`
})
```

Merge the returned HTML into the server-rendered output stream on the page side;
the browser renders it on parse, then the library script takes over.

For lists, loop the calls (module caching keeps later calls at render-only cost):

```ts
const items = await Promise.all(
  rows.map((row) =>
    renderToString('oas-tag', { type: row.status }, row.label, { locale: 'en' }),
  ),
)
return `<div class="tags">${items.join('')}</div>`
```

### Next.js (RSC async component)

```tsx
// app/ssr-demo/page.tsx
import { renderToString } from '@oas-ui/ssr'

export default async function SsrDemoPage() {
  const button = await renderToString('oas-button', { type: 'primary' }, 'Submit')
  const divider = await renderToString('oas-divider', { 'content-position': 'left' }, 'Divider')
  return (
    <section
      dangerouslySetInnerHTML={{ __html: `<div class="ssr-demo">${button}${divider}</div>` }}
    />
  )
}
```

The RSC renders on the server; the literal from `dangerouslySetInnerHTML` goes
into the SSR output stream and the browser parser attaches the DSD templates.

### Whitelist and boundaries

- Whitelist (pure-presentation components, declarative-data components, the
  layout-measuring pilot, form components batch 1, feedback components
  batch 2, data-display components batch 3, navigation/layout components
  batch 4, and whitelist-finalization batch 5 — 123 tags in total):
  `oas-button`, `oas-tag`,
  `oas-empty`, `oas-divider`, `oas-text`, `oas-title`, `oas-paragraph`,
  `oas-table`, `oas-affix`, `oas-ellipsis`, `oas-scroll-area`, `oas-tree`,
  `oas-select`, `oas-input`, `oas-textarea`, `oas-checkbox`,
  `oas-checkbox-group`, `oas-radio`, `oas-radio-group`, `oas-switch`,
  `oas-slider`, `oas-input-number`, `oas-rate`, `oas-auto-complete`,
  `oas-combobox`, `oas-cascader`, `oas-tree-select`, `oas-mentions`,
  `oas-date-picker`, `oas-time-picker`, `oas-calendar`, `oas-upload`,
  `oas-transfer`, `oas-color-picker`, `oas-toggle-button`, `oas-toggle-group`,
  `oas-pin-input`, `oas-dynamic-input`, `oas-dynamic-tags`, `oas-editable`,
  `oas-form`, `oas-form-item`, `oas-alert`, `oas-progress`, `oas-spin`,
  `oas-skeleton`, `oas-result`, `oas-backdrop`, `oas-modal`, `oas-drawer`,
  `oas-popconfirm`, `oas-card`, `oas-avatar`, `oas-avatar-group`,
  `oas-image`, `oas-qrcode`, `oas-watermark`, `oas-collapse`,
  `oas-collapse-item`, `oas-descriptions`, `oas-descriptions-item`,
  `oas-timeline`, `oas-timeline-item`, `oas-list`, `oas-list-item`,
  `oas-carousel`, `oas-statistic`, `oas-countdown`, `oas-chart`, `oas-code`,
  `oas-equation`, `oas-log`, `oas-masonry`, `oas-comment`, `oas-marquee`,
  `oas-number-animation`, `oas-gradient-text`, `oas-aspect-ratio`,
  `oas-virtual-list`, `oas-tabs`, `oas-tab-panel`, `oas-bottom-navigation`,
  `oas-pagination`, `oas-steps`, `oas-segmented`, `oas-breadcrumb`,
  `oas-anchor`, `oas-back-top`, `oas-menu`, `oas-dropdown`,
  `oas-context-menu`, `oas-menubar`, `oas-navigation-menu`, `oas-toolbar`,
  `oas-command`, `oas-tour`, `oas-hover-card`, `oas-splitter`, `oas-flex`,
  `oas-page-header`, `oas-float-button`, `oas-speed-dial`, `oas-layout`,
  `oas-header`, `oas-sider`, `oas-content`, `oas-footer`, `oas-sidebar`,
  `oas-container`, `oas-grid`, `oas-grid-item`, `oas-badge`,
  `oas-button-group`, `oas-icon`, `oas-kbd`, `oas-label`, `oas-link`,
  `oas-space`, `oas-visually-hidden`, `oas-tooltip`, `oas-popover`,
  `oas-config-provider`, `oas-app`.
- Calling `renderToString` with a non-whitelisted tag throws an explicit error;
  there is no silent fallback.
- The imperative components (message / notification / toast / snackbar /
  loading-bar / confirm) are created dynamically by imperative APIs
  (`document.createElement` appended to a floating layer), so no instance exists
  in the initial DOM and SSR is meaningless — they stay out of the whitelist and
  remain client-only; `confirm()` reuses the `oas-modal` tag (whitelisted), but
  the `confirm()` call itself is still a client-side behavior.
- `oas-theme-editor` (a dev-tool component, a theme-editing panel for
  development) has little SSR value — it stays out of the whitelist and remains
  client-only.
- `oas-table` / `oas-tree` / `oas-select` / `oas-transfer` / `oas-toggle-group`
  take `columns` / `data` / `options` / `items` through the JSON attribute
  channel (property assignment reflects to the attribute; invalid JSON falls
  back to the empty state), and the SSR snapshot includes the header and data
  rows / tree node rows / dropdown options / shuttle panel data / button groups.
- Form components batch 1: dropdown-panel components (auto-complete / combobox /
  cascader / tree-select / mentions / date-picker / time-picker / color-picker)
  snapshot the closed state (the panel skeleton carries no popup content; the
  browser opens it on interaction after upgrade); upload snapshots the empty
  list; the textarea autosize height is the un-measured state (corrected on the
  first frame after hydration via rAF).
- Data-display components batch 3: pure-presentation components
  (card / avatar / qrcode / watermark / descriptions / statistic / masonry /
  comment / gradient-text / aspect-ratio and the sub-components collapse-item /
  descriptions-item / timeline-item / list-item) snapshot the full visuals;
  chart / code / equation are synchronous deterministic renders (SVG paths,
  regex highlighting, and the LaTeX subset are pure computation — no canvas and
  no async work), so the snapshot carries the complete graphics and
  highlighting; dynamic components (carousel / countdown / number-animation /
  marquee) snapshot the initial frame / initial value (carousel syncs the
  transform and indicators from `index`, countdown renders the full initial
  value, number-animation renders the target when `duration=0` or the initial
  value otherwise) and the browser takes over animation and timers after
  upgrade; virtual-list snapshots the first-screen window rows at `scrollTop=0`
  plus top/bottom padding placeholders (the window is computed purely from
  `height` / `item-height` / `buffer` attributes, not scroll measurement), and
  the window recomputed from the same attributes after upgrade is identical;
  log adopts the snapshot rows incrementally and marquee re-syncs its clone
  group idempotently — neither duplicates DOM.
- Navigation/layout components batch 4: static-structure components (tabs /
  steps / pagination / breadcrumb / segmented / flex / page-header / container /
  grid / splitter, etc.) snapshot their full structure; floating-trigger
  components (dropdown / context-menu / hover-card / command / tour / speed-dial)
  default to the closed panel and snapshot the trigger skeleton (a server-direct
  `open` snapshot includes the full overlay), with the browser opening them on
  interaction after upgrade; visible-menu components (menu / menubar /
  navigation-menu / toolbar) snapshot the menu structure (submenus default to
  collapsed).
- Whitelist-finalization batch 5: the pure-presentation components badge /
  button-group / icon / kbd / label / link / space / visually-hidden snapshot
  their full visuals (badge count, kbd key caps, space host inline layout
  styles); tooltip / popover default to the closed state and snapshot the
  trigger slot plus the hidden bubble skeleton (content/title text is synced;
  positioning is computed only when triggered); config-provider / app snapshot
  the subtree as-is with their container attributes in place, with nested
  children covered by `injectNestedDSD`.
- Nested recursive serialization: whitelisted child components upgraded in the
  light DOM (form > form-item > oas-input, tabs > tab-panel,
  descriptions > descriptions-item, layout > sider/header, grid > grid-item,
  timeline > timeline-item, etc.) are recursively wrapped into nested
  `<template shadowrootmode="open">` blocks (including the child fingerprint)
  inserted at the start of each child's content — child shadow content (label
  text, etc.) is visible without JS, and both parent and child go through true
  hydration by fingerprint after upgrade. Child tags are loaded on demand before
  rendering (non-whitelisted children are left as raw markup); the light DOM
  part is emitted from the processed `el.innerHTML` so component light-DOM sync
  (e.g. tabs hiding inactive panels, collapse open state) is preserved.
- The snapshots of the layout-measuring components
  (affix / ellipsis / scroll-area) are the un-measured state (happy-dom reports
  all-zero layout), the first frame after upgrade matches the snapshot, and the
  real layout is applied on the next frame — this is the intended semantics of
  the flicker mitigation.
- True hydration: upgrade skips the shadow rebuild (DOM references are kept),
  only caching nodes, binding events, and running incremental `update()`;
  snapshot structure mismatches fall back to a full re-render.

## Why

1. `customElements.define` requires a real DOM.
2. Shadow DOM styles and layout depend on browser rendering.
3. Event dispatch (`oas-change` and other CustomEvents) only matters in the browser.

A DSD static snapshot solves progressive enhancement ("structure visible without
JS"); interactivity is still handled by the browser runtime, so the
`customElements.define` and event-dispatch boundaries are unchanged.

## Three-line setup (client)

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@1/dist/cdn.js"></script>
```

## Testing

- Unit tests run in happy-dom (a simulated DOM); a dedicated regression case
  covers the base class reusing an existing declarative shadow root.
- e2e tests run in real Chromium and also run axe accessibility audits.
- DSD static-page e2e: a static page is generated with `renderToString` at build
  time, verifying structure and styles are visible without JS, upgrade raises no
  `NotSupportedError` and no console errors, screenshots before/after upgrade
  show no flicker, and events are dispatchable.
- This docs site (Vitepress) is an SSR site: demo pages dynamically import
  components after `onMounted`, serving as an SSR boundary regression case.
