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

## System theme and optional storage

`oas-config-provider` supports `theme="system"`: the `theme` attribute keeps the requested value `system`, while the host `data-theme` contains the effective `light` / `dark` value. OS color-scheme changes update the subtree live. Explicit theme names always win; a missing or empty `theme` does not default to system and continues to inherit from the outer context.

Add `theme-storage-key` only when the user's choice should be remembered. Importing the library does not implicitly access storage or enable global system theming. The stored JSON is `{"theme":"light"}`, `{"theme":"dark"}`, or `{"theme":"system"}`. An explicit light/dark preference wins during the initial restore; choosing system afterwards replaces the old preference and resumes following the OS.

SSR deterministically emits `data-theme="light"` for system and never accesses localStorage or media queries on the server. With SSR/DSD, place the following synchronous script in `<head>` so it runs before the first paint, and keep its key identical to the provider's. For a provider without a key, set `const key` to `null`; only the MQL is read and storage get/set calls stay at zero. It corrects both the root and matching system providers to prevent a theme flash during hydration. The initial observer may stop at DOMContentLoaded, while the MQL listener keeps root synchronized for the page lifetime; with a key, corresponding localStorage events are also synchronized, without writing storage. Same-document reselection emits no storage event, so the script watches both requested `theme` and effective `data-theme`: a requested system write directly sets the head preference to system, while an effective change only synchronizes root without restoring stale storage or rewriting the provider in the callback. When a provider switches explicitly from `system` to `light` / `dark` (or a custom theme name), the script mirrors that provider's new effective theme to root and keeps following its later explicit changes (no fallback to the head preference after handover), so root cannot stay on the last system theme. Every root/provider write is guarded by a current-value comparison to prevent observer self-triggering or loops. Client-only pages do not need this bootstrap.

```html
<!-- Provider in <body> -->
<oas-config-provider theme="system" theme-storage-key="oas-app-theme">
  …
</oas-config-provider>
```

Synchronous bootstrap in `<head>`:

```html
<script>
  ;(() => {
    // Use null for a provider without a key: only the MQL is read; storage is never accessed.
    const key = 'oas-app-theme'
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const readPreference = (raw) => {
      try {
        const saved = JSON.parse(raw || 'null')
        return saved && ['light', 'dark', 'system'].includes(saved.theme) ? saved.theme : 'system'
      } catch {
        return 'system'
      }
    }
    const restorePreference = () => {
      if (!key) return 'system'
      try {
        return readPreference(localStorage.getItem(key))
      } catch {
        return 'system'
      }
    }
    let preference = restorePreference()
    const effective = () => (preference === 'system' ? (media.matches ? 'dark' : 'light') : preference)
    const ownsKey = (el) => (el.getAttribute('theme-storage-key') || null) === key
    const matchesProvider = (el) => el.getAttribute('theme') === 'system' && ownsKey(el)
    // Providers that left `system`: their later explicit light/dark takes over root (no fallback to preference).
    const handedOver = new WeakSet()
    const syncRoot = (theme) => {
      if (theme && document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme
    }
    const apply = () => {
      const theme = effective()
      syncRoot(theme)
      document.querySelectorAll('oas-config-provider').forEach((el) => {
        if (matchesProvider(el) && el.dataset.theme !== theme) el.dataset.theme = theme
      })
    }
    apply()
    // The observer only handles the first paint; MQL/storage listeners keep root synchronized for the page lifetime.
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        apply()
        observer.disconnect()
      },
      { once: true },
    )
    // Same-document reselection emits no storage event: requested=system hands off directly; leaving `system`
    // mirrors the provider's new effective theme to root and keeps following explicit changes (compare before writing).
    const effectiveObserver = new MutationObserver((records) => {
      for (const record of records) {
        const el = record.target
        if (!(el instanceof Element) || el.localName !== 'oas-config-provider' || !ownsKey(el)) continue
        if (record.attributeName === 'theme') {
          if (el.getAttribute('theme') === 'system') {
            handedOver.delete(el)
            preference = 'system'
            apply()
          } else if (record.oldValue === 'system' || handedOver.has(el)) {
            handedOver.add(el)
            syncRoot(el.dataset.theme)
          }
        } else if (record.attributeName === 'data-theme') {
          if (matchesProvider(el) || handedOver.has(el)) syncRoot(el.dataset.theme)
        }
      }
    })
    effectiveObserver.observe(document.documentElement, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['theme', 'data-theme'],
      subtree: true,
    })
    media.addEventListener('change', apply)
    if (key) {
      window.addEventListener('storage', (event) => {
        try {
          if (event.storageArea !== localStorage || (event.key !== key && event.key !== null)) return
        } catch {
          return
        }
        preference = readPreference(event.newValue)
        apply()
      })
    }
  })()
</script>
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

## Frosted Glass (glass.css)

`@oas-ui/theme/glass.css` provides a liquid-glass material layer (optional, same mechanism as skins.css: opt-in, zero impact when not loaded)—translucent surfaces + backdrop blur + specular edge ring + larger radii + deeper layered shadows. Stack `data-glass` on top of `data-theme` / `data-skin`; all three compose freely:

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/glass.css" />
<html data-theme="dark" data-glass>
  …
</html>
```

**Mechanism**: 25 floating-surface components (modal / drawer / popover / tooltip / dropdown / select-family panels / message / snackbar / bottom-sheet / app-bar, etc.) uniformly consume `--oas-glass-blur` (backdrop-filter tier) and `--oas-glass-ring` (specular outline ring). Without glass.css everything falls back to `none` / `transparent`, leaving components exactly as before.

**Cross-browser consistency**: this material layer uses cross-browser CSS only (translucent tokens / `backdrop-filter` / `outline` / `box-shadow`) and no SVG displacement filter. The v2.6.0 static edge refraction relied on a data-URI `filter` that Chromium executes but Firefox ignores, so the same component could show jagged edges and different visual sizes per engine; it was removed in v2.6.2. **Dynamic fluidity** (pointer specular highlight + press tightening) remains available via the optional `glass-fluid.js` runtime (see [Frosted Glass](/en/guide/glass)) and does not change geometry.

**Boundaries**:

- the material needs backdrop contrast—richest over colorful gradients/photos, recedes on flat same-hue backgrounds (text stays legible via token safe tiers); busy photo/video backdrops do not guarantee contrast, so raise alpha or disable the glass layer locally when needed;
- text safety is a hard constraint: the dark tier uses low-alpha, high-transparency surfaces (translucency is the signature look of dark glass; alpha tiers are calibrated together with text tiers; perceptual-contrast gate ≥60, see the gallery);
- the switch in-track label has a separate 36-cell gate (2 themes × 2 checked states × 3 real backdrops × 3 interactions; rest/hover ≥60, press ≥45); the checked label uses the solid on-primary color, and the light glass track is slightly deepened via `--oas-glass-switch-track-mix`;
- blur applies only to container-level surfaces (rows/long lists are excluded to avoid the cost of blurring large areas);
- disabled under the `high-contrast` theme (solid accessibility tier wins);
- under `prefers-reduced-transparency: reduce`, falls back to solid surfaces (no blur, edge ring, or dynamic highlight);
- local opt-out: override `--oas-glass-blur: none; --oas-glass-ring: transparent` on any container;

Live preview: [Frosted Glass Gallery](/en/guide/glass).

## Custom themes (CSS variable overrides)

All components in principle reference semantic tokens only (see `docs/ui-spec.md §1`; a few extreme-value/preset exceptions exist), so you
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
| Spacing     | `--oas-space-1/1_5/2/2_5/3/4/4_5/5/6` (4px base, half steps included)                                |
| Radius      | `--oas-radius-xs/sm/md/lg/xl`                                                                        |
| Controls    | `--oas-control-height-xs/sm/md/lg/xl`                                                                |
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
**Boundary**: ① per-component structural variants (`size` / `variant` / `status` / `shape` attributes) are the component's own contract, not a global axis; ② swapping in a wholly different design language (font stack / motion-curve family / contrast tiers) is beyond what a single default token set can express — define it in your own application/design system (override tokens or build a theme layer on top); ③ arbitrarily re-rendering a component's internal structure / DOM is intentionally not supported (keeps components consistent).
