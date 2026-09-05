# Getting Started

## CDN usage

**Full bundle (simplest, registers all components)**: `cdn.js` is a pre-bundled IIFE file; just load it via a `<script>` tag:

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn.js"></script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

**Per-family bundles (a middle ground between size and coverage)**: components are grouped into 7 feature families. Each family ships as its own IIFE file and inlines the base (runtime plus config-provider/app/theme-editor), so no extra script is required:

| Bundle | Components covered |
| --- | --- |
| `cdn/basic.js` | Basic: button, icon, tag, badge, space, divider, link, typography, button-group, label, kbd, visually-hidden |
| `cdn/layout.js` | Layout: layout, sidebar, container, grid, flex, splitter, scroll-area, masonry, aspect-ratio |
| `cdn/form.js` | Form: input, textarea, checkbox, radio, switch, segmented, slider, input-number, rate, select, auto-complete, combobox, cascader, tree-select, mentions, date-picker, time-picker, calendar, upload, transfer, color-picker, toggle-button, toggle-group, pin-input, dynamic-input, dynamic-tags, editable, form, etc. |
| `cdn/feedback.js` | Feedback & Overlays: tooltip, popover, hover-card, message, notification, toast, snackbar, backdrop, modal, confirm, drawer, popconfirm, alert, progress, loading-bar, spin, skeleton, empty, result |
| `cdn/navigation.js` | Navigation: menu, dropdown, contextmenu, command, menubar, navigation-menu, toolbar, breadcrumb, anchor, back-top, tour, tabs, bottom-navigation, pagination, steps, stepper, affix, page-header, float-button, speed-dial |
| `cdn/data.js` | Data display: table, tree, virtual-list, card, avatar, avatar-group, image, qrcode, watermark, collapse, descriptions, timeline, list, carousel, statistic, countdown, ellipsis, chart, code, equation, log, marquee, number-animation, gradient-text, comment, etc. |
| `cdn/framework.js` | Framework containers: config-provider, app, theme-editor |

Basic family only:

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/basic.js"></script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

Add a feedback family (a page that combines forms and message toasts):

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/basic.js"></script>
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/form.js"></script>
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/feedback.js"></script>
```

> **Choosing a rule**: load per-family bundles when the components you need span ≤ 2 families (smaller than the full bundle); when they span ≥ 3 families, load the single full `cdn.js` instead — every family inlines the base, so stacking multiple families costs more duplicated base code than the all-in-one file.

**Import a single component on demand**: use the esm.sh short path (resolves dependencies automatically), which registers only that one component:

```html
<script type="module">
  import 'https://esm.sh/@oas-ui/ui@2/basic/button'
</script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

For multiple components, add one short path each — **only the components you use and their dependency chains are downloaded** (e.g. the button chain is ≈ 21KB gzip, including the core runtime and the icon set); unused components cost nothing:

```html
<script type="module">
  import 'https://esm.sh/@oas-ui/ui@2/basic/button'
  import 'https://esm.sh/@oas-ui/ui@2/basic/tag'
</script>
```

> **CDN entry-point note**: the `oas-*.js` files under each component directory are pure class definitions (for bundler tree-shaking) and do **not** register anything; `customElements.define` runs in `index.js`. For direct CDN usage, use the full `cdn.js` above or the on-demand short path (resolved to `index.js` via the exports map). Do **not** import `dist/basic/button/oas-button.js` directly — the import succeeds but the element never registers, so nothing renders.

## Install (npm / pnpm / yarn)

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

## Import

Full import (auto-registers all components):

```ts
import '@oas-ui/theme'
import '@oas-ui/ui'
```

Import a single component on demand:

```ts
import '@oas-ui/theme'
import '@oas-ui/ui/basic/button'
```

Use directly in React / Vue:

```tsx
// React
<oas-button type="primary" onOasClick={() => console.log('clicked')}>
  Button
</oas-button>
```

```vue
<!-- Vue -->
<oas-button type="primary" @oas-click="onClick">Button</oas-button>
```

No wrappers are needed in any of the three environments (React/Vue/vanilla);
events are bridged through `oas-*` CustomEvents.

**Capability sub-packages (opt-in advanced features)**: a few components split heavy optional
capabilities into standalone sub-packages. When importing a component on demand, these capabilities
are **not included by default** (the related options silently no-op with a dev-mode warning) — import
only what you use; importing a sub-package registers it automatically:

| Component | Capability | Subpath |
| --------- | ---------- | ------- |
| `oas-table` | Inline editing (`editable` / `editor` / `actions`) | `@oas-ui/ui/data/table/edit` |
| `oas-tabs` | Double-click rename / context menu / drag-sort (`editable` / `context-menu` / `sortable`) | `@oas-ui/ui/navigation/tabs/manager` |
| `oas-modal` | Prompt dialog (`modal.prompt()`) | `@oas-ui/ui/feedback/modal/prompt` |
| `oas-popover` | Cursor-anchored context menu / touch long-press / `placement`·`size` breakpoint shorthands | `@oas-ui/ui/feedback/popover/contextmenu` |
| `oas-color-picker` | 2D color field / gradient designer (`mode="gradient"`) | `@oas-ui/ui/form/color-picker/designer` |

```ts
import '@oas-ui/ui/data/table'
import '@oas-ui/ui/data/table/edit' // adds inline editing
```

Import order does not matter: capabilities registered later are retroactively applied to
**already-mounted** elements. The full entry `@oas-ui/ui` and the CDN family bundles already
include every capability — no extra imports needed there.

> Want to see it live? The repo ships a [Playground](https://github.com/openappsys/oas-ui/tree/main/packages/playground) for React / Vue — run `pnpm dev:react` / `pnpm dev:vue` locally.

## Browser support

Modern evergreen browsers: latest two major versions of Chrome / Edge / Firefox / Safari. Specifically:

- **Chrome / Edge (Chromium)**: full e2e coverage
- **Firefox**: verified by real-browser testing (Firefox-specific pseudo-elements such as the slider track are adapted)
- **Safari ≥ 16.4**: verified on the WebKit engine; Declarative Shadow DOM requires 16.4+, solid-state coloring (`color-mix`) requires 16.2+

## Theme switching

```html
<html data-theme="dark">
  <!-- switches to dark theme -->
</html>
```

Three built-in themes: `light` / `dark` / `high-contrast`. See the
[Theming guide](./theming) for customization.

> **Your own CSS does not follow the theme automatically**: variables inside
> components switch with `data-theme`, but styles you write yourself must
> reference `var(--oas-color-*)` to follow along. The most common pitfall is a
> page body without an explicit background — after switching to dark, components
> turn dark while the page stays at the browser default white:

> ```css
> body {
>   background: var(--oas-color-bg);
>   color: var(--oas-color-text-primary);
> }
> ```

## Event conventions (important)

**All component events carry the `oas-` prefix**: `oas-change`, `oas-select`,
`oas-input`, `oas-close`, etc. (each component's API table lists the full set
and when they fire). This is deliberate — Web Components events bubble to
window by default, and unprefixed `change`/`select` would collide with native
events and host-framework synthetic events; the prefix makes the origin
unambiguous.

```ts
// correct: oas- prefix
menu.addEventListener('oas-select', (e) => console.log(e.detail))

// wrong: never fires (a common first pitfall)
menu.addEventListener('select', (e) => console.log(e.detail))
```

Controlled components (switch / radio-group / checkbox-group / slider /
input-number, etc.) write the latest value **back to the host attribute** after
user interaction (e.g. `value` / `checked`), so `el.getAttribute('value')`
reads the current state directly, consistent with the `oas-change` event's
`detail.value`.

## SSR

For server-side rendering, refer to the [SSR strategy](./ssr): side-effect
imports of the component library should only run on the client.

For more integration questions (the `::part()` customization trap, event
timing, etc.), see the [FAQ](./faq).
