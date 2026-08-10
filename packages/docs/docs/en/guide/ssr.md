# SSR Strategy

OAS-UI is a Web Components library: components register custom elements,
Shadow DOM and events at runtime in the browser. The following boundaries apply
in SSR / static-generation environments.

## Core rule

**Do not run side-effect imports of the component library during server-side
rendering.**

The library entry `@oas-ui/ui` calls `customElements.define` and DOM APIs,
which throw in Node (no DOM), e.g. `HTMLElement is not defined`.

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

## Three-line setup (client)

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script type="module">
  import '@oas-ui/ui'
</script>
```

## Testing

- Unit tests run in happy-dom (a simulated DOM).
- e2e tests run in real Chromium and also run axe accessibility audits.
- This docs site (Vitepress) is an SSR site: demo pages dynamically import
  components after `onMounted`, serving as an SSR boundary regression case.
