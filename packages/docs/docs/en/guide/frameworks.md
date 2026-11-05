# Framework Integration (React, Vue, etc.)

> OAS-UI is a Web Components library. **You do not need an official wrapper to use it.** This page covers native usage per framework, common pitfalls, and optional integrations. It does not introduce a new component wrapper layer.
>
> Verified integration paths include React, Vue, Svelte, Angular, Astro, Next.js, Nuxt, and others; frameworks not listed here can use the native Web Components API directly.

## Choose a path

| Scenario | Recommended approach |
| --- | --- |
| React 19 | Native `<oas-*>`; bind events with `on` + all-lowercase event name (`onoas-submit`) |
| React 17/18, or camelCase event names | Vendor the two hooks from the in-repo `@oas-ui/react` (~100 lines; not published to npm, see below) |
| Vue 3 | Set `compilerOptions.isCustomElement`, use `<oas-*>` directly, bind `@oas-*` events |
| Svelte 5 | Event attributes, e.g. `onoas-click={...}` (**case-sensitive**; kebab-case preserved); Svelte 4 uses `on:oas-click` (legacy) |
| Angular | `schemas: [CUSTOM_ELEMENTS_SCHEMA]`; events `(oas-click)` and properties `[options]` bind directly |
| Astro | Zero special handling: write tags in HTML, register in a page `<script>` (islands follow each framework's section) |
| Others (SolidJS, etc.) | No special handling needed; framework-specific interop sections are added when real usage appears |
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

React 17/18 requires manual `addEventListener`. The repo's `packages/react` holds a reference implementation of `useOasEvent` / `useOasEvents` (two hooks, ~100 lines, MIT/Apache-2.0) — **it is not published to npm, and there is no plan for any framework wrapper / bridge package** (assessment: React's native custom-element support keeps improving; a bridge is a shrinking interop gap and not worth an official dependency). When you need the camelCase spelling, copy the two hooks into your project:

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

### Global attributes and the property channel (`title`, verified)

React 19 assigns **existing property names** on Custom Elements (`title` / `dir` / `lang` …) as properties (`el.title = v`) instead of `setAttribute`. For `title` specifically — a *reflecting* HTMLElement property — the assignment synchronously reflects into the same-named attribute, so the component's attribute channel is triggered as usual.

Verified in Chromium (2026-11-04): **`oas-modal` / `oas-drawer` receive `title` through both channels; in React just write `<oas-modal title="…">` — no workaround needed.** One easily-misread detail: these two components *consume* `title` — after rendering it into the internal title bar they **remove the attribute** (to avoid the browser's native tooltip), so not seeing a `title` attribute left in the DOM is expected behavior, not a failure. Judge by the rendered title bar.

```tsx
// Just write it (property → reflected attribute → consumed by the component)
<oas-modal title="Details" />
```

Three scenarios that genuinely need attention:

- **How to verify**: judge `title` by the rendered title bar, not by whether the attribute remains (consuming components remove it).
- **When authoring your own custom elements**: avoid names colliding with **read-only properties or methods** of `Element` / `HTMLElement` (e.g. `prefix` vs read-only `Element.prefix`, `blur` vs the method); shadow them with property accessors when necessary — see the collision section in [Integration FAQ](/en/guide/faq) for how this library normalizes `prefix` / `suffix` / `blur`.
- **Plain elements that don't consume `title`**: a `title` attribute triggers the browser's native tooltip (framework-independent).

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

## Svelte

Svelte 5 listens through **event attributes**, which are **case-sensitive** — `onoas-click` listens to `oas-click` as-is (kebab-case preserved; spelling it `onoasclick` would listen to a different event, `oasclick`, and never receive what the component dispatches):

```svelte
<oas-button type="primary" onoas-click={(e) => console.log(e.detail)}>Save</oas-button>
```

- Svelte 4's `on:oas-click` directive still works but is listed as legacy in Svelte 5; new code should use event attributes.
- Complex data (arrays/objects): attribute expressions are stringified into attributes — take the element with `bind:this` and assign the property in a `$effect`:

```svelte
<script>
  let el = $state(null)
  $effect(() => {
    if (el) el.columns = columns
  })
</script>

<oas-table bind:this={el} />
```

- `bind:value` does **not** sync with the component: Svelte's binding writes back via `input` / `change`, while the component dispatches `oas-change` — sync manually with `onoas-change` (same caveat as Vue's `v-model`).

## Angular

The one required setting: add `CUSTOM_ELEMENTS_SCHEMA` to the `schemas` of a standalone component (the Angular 17+ default) or an NgModule, then write `<oas-*>` directly in templates:

```ts
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core'

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<oas-button type="primary" (oas-click)="onClick($event)">Save</oas-button>`,
})
export class AppComponent {
  onClick(e: Event) {
    console.log((e as CustomEvent).detail)
  }
}
```

- Events: `(oas-click)="handler($event)"` works natively (`$event` is the CustomEvent; read data via `.detail`).
- Data binding: `[options]="rows"` writes the DOM property when it exists — bind objects/arrays directly without serializing.
- `ngModel` does not apply (no ControlValueAccessor bridge): sync manually with `[value]` + `(oas-change)`.

## Astro

Astro is an HTML-first MPA with islands — **zero special handling**: write `<oas-*>` directly in `.astro` files and register components in a page `<script>` (Astro bundles the script and runs it once per page by default):

```astro
<oas-button type="primary">Save</oas-button>

<script>
  import '@oas-ui/theme'
  import '@oas-ui/ui/basic/button'
</script>
```

For interactive components inside islands (React / Vue / Svelte), follow the matching framework section above. SolidJS and other frameworks likewise need no special handling — register and use directly.

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
6. **Global attributes and the property channel**: React assigns native property names such as `title` as properties, but `title` is a reflecting property (the assignment becomes an attribute synchronously) — `oas-modal` / `oas-drawer` receive it through both channels and *consume* it (the attribute is removed after rendering; not seeing it left in the DOM is expected). See [Global attributes and the property channel](#global-attributes-and-the-property-channel-title-verified) above.

## Related

- [Getting started](/en/guide/getting-started)
- [SSR strategy](/en/guide/ssr)
- [Integration FAQ](/en/guide/faq)
- [Server-side windowed data](/en/guide/windowed-data)
