# GradientText

A purely presentational component that fills text with a gradient color, implemented with `background-clip: text`; it defaults to a two-color theme-token gradient and supports arbitrary color-stop arrays and directions. No events.

## Basic Usage

<DemoBlock title="Default token gradient (to right)">
  <oas-gradient-text style="font-size: var(--oas-font-size-xl); font-weight: 600;">渐变文字</oas-gradient-text>
</DemoBlock>

## Custom Color Stops

<DemoBlock title="Red → blue two colors">
  <oas-gradient-text gradient='["#f00", "#00f"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">红蓝渐变</oas-gradient-text>
</DemoBlock>

<DemoBlock title="Three-color gradient">
  <oas-gradient-text gradient='["#f00", "#ff0", "#0f0"]' style="font-size: var(--oas-font-size-xl); font-weight: 600;">三色渐变</oas-gradient-text>
</DemoBlock>

## Direction

<DemoBlock title="direction=to bottom">
  <oas-gradient-text gradient='["#0b6cff", "#16a34a"]' direction="to bottom" style="font-size: var(--oas-font-size-xl); font-weight: 600;">自上而下</oas-gradient-text>
</DemoBlock>

<DemoBlock title="direction=135deg">
  <oas-gradient-text gradient='["#0b6cff", "#dc2626"]' direction="135deg" style="font-size: var(--oas-font-size-xl); font-weight: 600;">斜向渐变</oas-gradient-text>
</DemoBlock>

## API

| Attribute   | Description                                                         | Default       |
| ----------- | ------------------------------------------------------------------- | ------------- |
| `gradient`  | JSON color-stop array, e.g. `["#f00","#00f"]`; a single stop renders a solid color; missing / invalid values fall back to the default token gradient | theme primary two-color |
| `direction` | Gradient direction (first argument of `linear-gradient`, e.g. `to right`, `135deg`) | `to right`    |

- The default gradient uses theme tokens (`--oas-color-primary` → `--oas-color-primary-hover`), switching automatically with the light/dark theme — no hardcoded color values.
- Color-stop entries are validated against a whitelist to prevent CSS injection.
- No events; purely presentational.
