# Getting Started

## Three-line setup (CDN)

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script type="module">
  import '@oas-ui/ui'
</script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

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

## Theme switching

```html
<html data-theme="dark">
  <!-- switches to dark theme -->
</html>
```

Three built-in themes: `light` / `dark` / `high-contrast`. See the
[Theming guide](./theming) for customization.

## SSR

For server-side rendering, refer to the [SSR strategy](./ssr): side-effect
imports of the component library should only run on the client.
