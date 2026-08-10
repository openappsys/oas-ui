# SSR Boundaries

OAS-UI is a Web Components library: components register custom elements,
Shadow DOM and events at runtime in the browser. The following boundaries apply
in SSR / static-generation environments.

## Core rule

**Do not run side-effect imports of the component library during server-side
rendering.**

The library entry `@oas-ui/ui` calls `customElements.define` and DOM APIs,
which throw in Node (no DOM), e.g. `HTMLElement is not defined`.

## DSD route (progressive enhancement)

The long-term SSR strategy is Declarative Shadow DOM (DSD): the server outputs
the static structure plus styles inside `<template shadowrootmode="open">`, and
the browser hydrates the component to take over interactivity after the custom
element is upgraded.

Current progress (first step landed):

- The base class `OASElement` now reuses an existing declarative shadow root:
  when the element already has a shadow root attached by
  `<template shadowrootmode="open">` before upgrade, the constructor reuses it
  instead of calling `attachShadow` (which would throw `NotSupportedError` and
  break the component).

Not yet landed (ROADMAP backlog):

- Full SSR serialization toolchain: server-side rendering of each component's
  shadow snapshot, a dual render path (reuse the DSD snapshot without a full
  rebuild), and a declarative channel for property-only data.
- Today `render()` still rebuilds the shadow DOM content on first connect (the
  DSD snapshot gets overwritten), so the static snapshot currently serves only
  as a no-JS-visible placeholder; full hydration awaits the serialization
  toolchain.

Until the serialization toolchain lands, keep using the "client-only" approach
below for SSR scenarios.

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

## Why

1. `customElements.define` requires a real DOM.
2. Shadow DOM styles and layout depend on browser rendering.
3. Event dispatch (`oas-change` and other CustomEvents) only matters in the browser.

A DSD static snapshot solves progressive enhancement ("structure visible without
JS"); interactivity is still hydrated by the browser runtime, so the
`customElements.define` and event-dispatch boundaries are unchanged.

## Three-line setup (client)

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script type="module">
  import '@oas-ui/ui'
</script>
```

## Testing

- Unit tests run in happy-dom (a simulated DOM); a dedicated regression case
  covers the base class reusing an existing declarative shadow root.
- e2e tests run in real Chromium and also run axe accessibility audits.
- This docs site (Vitepress) is an SSR site: demo pages dynamically import
  components after `onMounted`, serving as an SSR boundary regression case.
