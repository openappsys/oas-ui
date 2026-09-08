# GradientText

A purely presentational component that fills text with a gradient color, implemented with `background-clip: text`; it defaults to a two-color theme-token gradient and supports arbitrary color-stop arrays and directions. No events.

## Basic Usage

<DemoBlock title="Default token gradient (to right)">
  <oas-gradient-text style="font-size: var(--oas-font-size-xl); font-weight: 600;">Gradient Text</oas-gradient-text>
</DemoBlock>

## Custom Color Stops

<DemoBlock title="Red → blue two colors">
  <oas-gradient-text gradient='["#f00", "#00f"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">Red–Blue Gradient</oas-gradient-text>
</DemoBlock>

<DemoBlock title="Three-color gradient">
  <oas-gradient-text gradient='["#f00", "#ff0", "#0f0"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">Three-Color Gradient</oas-gradient-text>
</DemoBlock>

## Direction

<DemoBlock title="direction=to bottom">
  <oas-gradient-text gradient='["#0b6cff", "#16a34a"]' direction="to bottom" style="font-size: var(--oas-font-size-xl); font-weight: 600;">Top to Bottom</oas-gradient-text>
</DemoBlock>

<DemoBlock title="direction=135deg">
  <oas-gradient-text gradient='["#0b6cff", "#dc2626"]' direction="135deg" style="font-size: var(--oas-font-size-xl); font-weight: 600;">Diagonal Gradient</oas-gradient-text>
</DemoBlock>

## Semantic Type Gradients

<DemoBlock title="type semantic gradient pairs">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3); font-size: var(--oas-font-size-xl); font-weight: 600;">
    <oas-gradient-text type="primary">primary semantic gradient</oas-gradient-text>
    <oas-gradient-text type="success">success semantic gradient</oas-gradient-text>
    <oas-gradient-text type="warning">warning semantic gradient</oas-gradient-text>
    <oas-gradient-text type="danger">danger semantic gradient</oas-gradient-text>
    <oas-gradient-text type="info">info semantic gradient</oas-gradient-text>
  </div>
</DemoBlock>

`type` uses token-derived two-stop gradients (dark-theme aware, zero hard-coded colors); when combined with `gradient`, `gradient` wins.

## Animated Gradient

<DemoBlock title="animated flowing gradient">
  <oas-gradient-text animated style="font-size: var(--oas-font-size-xl); font-weight: 600;">Flowing gradient slogan</oas-gradient-text>
</DemoBlock>

<DemoBlock title="animated + multi-stop">
  <oas-gradient-text animated gradient='["#0b6cff", "#16a34a", "#d97706", "#dc2626"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">Four-color flowing gradient</oas-gradient-text>
</DemoBlock>

`animated` slides the background position along the gradient axis (palindrome stops + double-width background for a seamless loop); the duration is customizable via `--oas-gradient-text-duration`, and it stands still automatically under `prefers-reduced-motion`.

## Compatibility Notes

- `background-clip: text` and the transparent color live inside an `@supports` block: browsers without clip support fall back to the normal text color — no invisible-text accident.
- Text stroke (`-webkit-text-stroke`) conflicts with `background-clip: text` at the browser level; for stroked text use plain text with a stroke color instead.
- Multi-line truncation (ellipsis) behaves inconsistently across browsers when combined with `background-clip: text`; keep gradient text to a single line.

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-gradient-text-font` (e.g. `18px`).

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `animated` | Flowing animation (palindrome stops, seamless loop, period via `--oas-gradient-text-duration`; static under prefers-reduced-motion) | `boolean` | — |
| `direction` | Gradient direction (first argument of `linear-gradient`, e.g. `to right`, `135deg`) | `string` | — |
| `gradient` | JSON color-stop array, e.g. `["#f00","#00f"]`; a single stop renders a solid color; missing / invalid values fall back to the default token gradient | `string` | — |
| `type` | Semantic color gradient: `primary` / `success` / `warning` / `danger` / `info` (token-derived two stops; explicit `gradient` wins) | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

- The default gradient uses theme tokens (`--oas-color-primary` → `--oas-color-primary-hover`), switching automatically with the light/dark theme — no hardcoded color values.
- Color-stop entries are validated against a whitelist to prevent CSS injection.
- No events; purely presentational.
