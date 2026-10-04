# Theming

## Built-in themes

Set `data-theme` on the root element (`<html>` or any container) to switch
between three built-in themes:

| `data-theme`    | Description                            |
| --------------- | -------------------------------------- |
| `light` (default) | Light                                |
| `dark`          | Dark                                    |
| `high-contrast` | High contrast (WCAG AAA friendly, stronger borders/text contrast) |

```html
<html data-theme="dark">
  …
</html>
```

```js
document.documentElement.dataset.theme = 'high-contrast'
```

## Skin presets (optional)

`@oas-ui/theme/skins.css` ships 6 brand-color skin presets (`violet` / `emerald` / `rose` / `amber` / `graphite` / `teal`): layer `data-skin` on top of `data-theme` to switch, freely combinable with the three built-in themes (a skin only changes the brand hue, not sizes/structure).

```html
<!-- opt-in: no effect unless this file is imported -->
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/skins.css" />
<html data-theme="dark" data-skin="violet">
  …
</html>
```

```js
document.documentElement.dataset.skin = 'emerald' // violet | emerald | rose | amber | graphite | teal
```

A skin only overrides `--oas-color-primary`; the derived steps (`-hover` / `-active` / `-primary-text` / focus ring) follow automatically. For deeper customization (surfaces / radius / density) use the CSS variable overrides below.

## Custom themes (CSS variable overrides)

All components only reference semantic tokens (see `docs/ui-spec.md §1`), so you
can customize brand colors by overriding CSS variables without touching
component code:

```css
:root {
  /* Brand colors */
  --oas-color-primary: #7c3aed;
  --oas-color-primary-hover: #8b5cf6;
  --oas-color-primary-active: #6d28d9;

  /* Text */
  --oas-color-text-primary: #18181b;
  --oas-color-text-secondary: #71717a;

  /* Sizing */
  --oas-radius-md: 8px;
  --oas-control-height-md: 36px;
}
```

### Token overview

| Group       | Variables                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Brand       | `--oas-color-primary(-hover/-active)`、`--oas-color-success`、`--oas-color-warning`、`--oas-color-danger` |
| Text        | `--oas-color-text-primary/-secondary/-disabled`                                                      |
| Border/bg   | `--oas-color-border`、`--oas-color-bg(-hover/-disabled)`、`--oas-color-overlay`                      |
| Font size   | `--oas-font-size-xs/sm/md/lg/xl`                                                                     |
| Spacing     | `--oas-space-1…6`                                                                                    |
| Radius      | `--oas-radius-sm/md/lg`                                                                              |
| Controls    | `--oas-control-height-sm/md/lg`                                                                      |
| Motion      | `--oas-transition-fast/base`、`--oas-ease-out/in-out`                                                |
| Z-index     | `--oas-z-dropdown/sticky/fixed/overlay/modal/message/toast/tooltip`                                  |
| Focus ring  | `--oas-focus-ring`                                                                                   |

## Reduced motion

The library ships `prefers-reduced-motion` support: when the system has
"reduce motion" enabled, all transitions/animations are shortened automatically.

## Customization capability matrix

Theme / skin / layout / style are four **orthogonal, freely combinable** control axes; the final "style" is what they jointly determine:

| Axis | Meaning | Mechanism | How far |
| --- | --- | --- | --- |
| Theme | Color mode (light / dark / contrast) | `data-theme` (light / dark / high-contrast) | Any color mode; custom via tokens |
| Skin | Brand hue (primary) | `data-skin` + `skins.css` (6 presets) | Any primary; derived steps follow automatically |
| Layout | Sizing / spacing / density / radius / container | `--oas-space-*` / `radius-*` / `control-height-*` / `container-*`; size presets | Any density / radius / container; RTL auto-mirrors |
| Style | Typography / motion / elevation / focus ring / contrast | `--oas-font-size-*` / `transition` / `ease` / `shadow-*` / `focus-ring` + `-text` safe grades | Most design languages can be approximated |

**Ceiling**: anything expressible as a CSS variable (token) can be re-skinned purely via CSS, without touching components.
**Boundary**: ① per-component structural variants (`size` / `variant` / `status` / `shape` attributes) are the component's own contract, not a global axis; ② swapping in a wholly different design language (font stack / motion-curve family / contrast tiers) exceeds what a single token set can express and needs a separate initiative; ③ arbitrarily re-rendering a component's internal structure / DOM is intentionally not supported (keeps components consistent).
