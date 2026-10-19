# Framework Integration (React / Vue / Next / Nuxt)

> OAS-UI is a Web Components library. **You do not need an official wrapper to use it.** This page covers native usage per framework, common pitfalls, and optional integrations. It does not introduce a new component wrapper layer.

## Choose a path

| Scenario | Recommended approach |
| --- | --- |
| React 19 | Native `<oas-*>`; bind events with `on` + all-lowercase event name (`onoas-submit`) |
| React 17/18, or camelCase events / TS hints | Use `useOasEvent` / `useOasEvents` from the in-repo `@oas-ui/react` (not published to npm) |
| Vue 3 | Set `compilerOptions.isCustomElement`, use `<oas-*>` directly, bind `@oas-*` events |
| Next.js App Router | Use the RSC/DSD integration in `@oas-ui/next` (see [SSR strategy](/en/guide/ssr)) |
| Nuxt 3 | Use the `@oas-ui/nuxt` module (auto `isCustomElement` + theme CSS + SSR helpers) |

## Register components

```ts
import '@oas-ui/theme'
import '@oas-ui/ui' // register everything
```

On demand:

```ts
import '@oas-ui/theme'
import '@oas-ui/ui/basic/button'
```

## React

### Events

React 19 maps Custom Element events only for the "`on` + all-lowercase literal" spelling:

```tsx
<oas-button type="primary" onoas-submit={(e) => console.log(e.detail)}>
  Submit
</oas-button>
```

CamelCase `onOasSubmit` is **not** mapped to `oas-submit`; do not rely on it.

React 17/18 requires manual `addEventListener`. The in-repo `@oas-ui/react` package provides hooks:

```tsx
import { useRef } from 'react'
import { useOasEvent } from '@oas-ui/react'

const ref = useRef<HTMLElement | null>(null)
useOasEvent(ref, 'oas-submit', (detail) => console.log(detail))
```

### Complex data and boolean attributes

- Strings/numbers: write them as JSX attributes.
- Arrays/objects: prefer assigning the property through a `ref`; otherwise you may write `[object Object]` into an attribute:

```tsx
const tableRef = useRef<HTMLElement & { columns?: unknown; data?: unknown }>(null)

useEffect(() => {
  if (!tableRef.current) return
  tableRef.current.columns = columns
  tableRef.current.data = rows
}, [columns, rows])

return <oas-table ref={tableRef} />
```

- Boolean attributes use presence semantics: `<oas-ellipsis expanded>` means expanded; remove the attribute (or follow the component docs for `false`) to collapse.
- To use `oas-*` tags directly in TypeScript, augment `JSX.IntrinsicElements`; see the `@oas-ui/react` README for an example.

## Vue 3

Vue templates can use Custom Elements directly. The only required compiler setting is:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('oas-'),
        },
      },
    }),
  ],
}
```

```vue
<oas-button type="primary" @oas-click="onClick">Button</oas-button>
```

- Events: bind `@oas-*` directly.
- Complex data: `:columns="columns"` / `:data="rows"` use the property path; a static JSON attribute also works.
- `v-model` is **not** natively supported: Custom Elements do not follow `modelValue / update:modelValue`. Use `:value` + `@oas-change`, or wrap it in a local business component.

Nuxt 3 uses the module and does not need the manual `isCustomElement` config:

```ts
export default defineNuxtConfig({
  modules: ['@oas-ui/nuxt'],
})
```

## SSR / DSD

- Nuxt: `@oas-ui/nuxt`.
- Next.js: `@oas-ui/next`.
- Other SSR setups: see [SSR strategy](/en/guide/ssr) for client registration, DSD hydration, and `isCustomElement` timing.

## Common pitfalls

1. **Event names keep the `oas-` prefix**: components dispatch `oas-change` / `oas-submit`; listening for `change` / `submit` will not work.
2. **Attribute vs property**: prefer properties for arrays/objects; strings/numbers can use attributes.
3. **Boolean empty strings**: Vue writes `''` for static `<oas-ellipsis expanded>`; components treat presence as true. Do not use `expanded="false"` to disable; follow the component docs.
4. **Register before hydration**: do not assign properties to an unupgraded element; wait for `customElements.whenDefined('oas-*')` or use a framework integration package.
5. **`::part()` cannot be chained with pseudo-classes**: `::part(item):hover` does not work; use `::part(item)` plus the component's internal state attributes.

## Related

- [Getting started](/en/guide/getting-started)
- [SSR strategy](/en/guide/ssr)
- [Integration FAQ](/en/guide/faq)
- [Server-side windowed data](/en/guide/windowed-data)
