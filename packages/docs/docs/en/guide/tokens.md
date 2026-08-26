# Design Tokens

All of OAS-UI's visual language is driven by CSS variables (semantic tokens). Components reference semantic tokens only — **no hardcoded colors, font sizes or spacing** — so theming means overriding CSS variables, without touching components.

<TokenShowcase />

## Built-in themes

Switch on the root element (`<html>` or any container) via `data-theme`:

| `data-theme`    | Description                                |
| --------------- | ------------------------------------------ |
| `light` (default) | Light                                    |
| `dark`          | Dark                                       |
| `high-contrast` | WCAG AAA friendly, stronger border/text contrast |

```html
<html data-theme="dark">
  …
</html>
```

```js
document.documentElement.dataset.theme = 'high-contrast'
```

## Custom theme by overriding tokens

```css
:root {
  /* brand */
  --oas-color-primary: #7c3aed;
  --oas-color-primary-hover: #8b5cf6;
  --oas-color-primary-active: #6d28d9;

  /* sizing */
  --oas-radius-md: 8px;
  --oas-control-height-md: 36px;
}
```

## Token groups

| Group        | Variables                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------- |
| Brand        | `--oas-color-primary(-hover/-active)`, `--oas-color-success`, `--oas-color-warning`, `--oas-color-danger` |
| Text         | `--oas-color-text-primary/-secondary/-disabled`                                              |
| Border / bg  | `--oas-color-border`, `--oas-color-bg(-hover/-disabled)`, `--oas-color-overlay`              |
| Font size    | `--oas-font-size-xs/sm/md/lg/xl`                                                             |
| Spacing      | `--oas-space-1…6` (4px base)                                                                 |
| Radius       | `--oas-radius-xs/sm/md/lg/xl`                                                                      |
| Control      | `--oas-control-height-xs/sm/md/lg/xl`                                                        |
| Motion       | `--oas-transition-fast/base`, `--oas-ease-out/in-out`                                        |
| Z-index      | `--oas-z-dropdown/sticky/fixed/overlay/modal/message/toast/tooltip`                          |
| Focus ring   | `--oas-focus-ring`                                                                           |

## Reduced motion

The library honors `prefers-reduced-motion` — transitions and animations shorten automatically when the OS prefers reduced motion.

> Spec reference: `docs/ui-spec.md §1` token system.
