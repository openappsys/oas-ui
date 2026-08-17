[中文](README.md) | **English**

# OAS-UI

A framework-agnostic Web Components UI library — one set of components, runs everywhere, zero framework dependency; works with plain HTML / React / Vue / and more.

Full TypeScript types · tree-shakable · light/dark themes · SSR + DSD · framework-agnostic i18n · dual licensed under MIT OR Apache-2.0

## Real Numbers

| Metric | Value |
| --- | --- |
| Components | 117 |
| Full CDN bundle (gzip) | 153.2 KB |
| Button chain (gzip) | 20.7 KB |
| Unit tests | 2200+ |
| Locales | zh-CN / en |
| Current version | v2.0.0 |

## Getting Started

### CDN (zero build)

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@1/dist/cdn.js"></script>

<oas-button type="primary">Primary</oas-button>
<oas-input placeholder="Type here"></oas-input>
```

On-demand (ESM, per-component tree-shakable):

```html
<script type="module">
  import 'https://esm.sh/@oas-ui/ui@1/basic/button'
</script>
```

### Package Manager

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

```ts
import '@oas-ui/theme'
import '@oas-ui/ui'
```

Import only what you use:

```ts
import '@oas-ui/theme'
import '@oas-ui/ui/basic/button'
```

### Framework Glue (optional bonus)

Web Components interoperate with every framework out of the box; these official plugins close the gap on SSR and developer experience:

```bash
pnpm add @oas-ui/nuxt   # Nuxt 3 module: isCustomElement + theme injection + SSR helper
pnpm add @oas-ui/next   # Next.js: RSC OasComponent + OasRegistry client registration bootstrap
```

## Documentation

Full component docs and live demos: [oasui.dev](https://oasui.dev).

SSR / DSD guide: the [SSR page](https://oasui.dev/guide/ssr) on the docs site and the `@oas-ui/ssr` package.

## Package Layout

| Package | Description |
| --- | --- |
| `packages/core` | `OASElement` base class and shared infrastructure |
| `packages/theme` | CSS custom-property design tokens (light/dark), single-source index.css |
| `packages/i18n` | Framework-agnostic locale registry, tree-shakable language packs |
| `packages/icons` | Inline SVG icon set (tree-shakable, no icon fonts) |
| `packages/ui` | 117 components (basic / form / data / floating / navigation / nav-layout / layout / overlay / feedback) |
| `packages/ssr` | DSD snapshot renderer + Node-safe entry + true hydration |
| `packages/nuxt` | Nuxt 3 integration plugin |
| `packages/next` | Next.js (RSC) integration plugin |
| `packages/docs` | Vitepress docs site (English & Chinese) |

## Quality Gates (before every release)

1. `pnpm test` all green (unit + behavior tests)
2. `pnpm typecheck` zero errors
3. `pnpm build` succeeds (with d.ts)
4. `pnpm test:e2e` passes (Playwright: full chromium + sampled firefox; interaction, visual, axe accessibility, console sweep)
5. Performance budgets do not regress (CI size/duration budgets, reproducible via `scripts/perf`)

## Development

```bash
pnpm install
pnpm test        # tests
pnpm typecheck   # types
pnpm build       # build (with d.ts)
pnpm dev         # docs site dev server (component source changes hot-apply)
```

## Product Archives

| Document | Description |
| --- | --- |
| `docs/vision.md` | Vision: positioning, goals, design principles |
| `docs/ROADMAP.md` | Release roadmap |
| `docs/PRD.md` | Per-version requirements and acceptance criteria |
| `docs/architecture.md` | Technical architecture and choices |
| `docs/ui-spec.md` | Visual spec (tokens, type scale, spacing, color conventions) |
| `docs/engineering.md` | Engineering discipline (TDD, testing, release, deployment) |

## License

Released under a dual [MIT OR Apache-2.0](LICENSE) license.
