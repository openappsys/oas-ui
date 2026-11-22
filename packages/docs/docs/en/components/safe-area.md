---
description: A safe-area spacer for embedded mobile hosts that reserves the notch and home-indicator height from env(safe-area-inset-top/bottom), with an explicit size override
---

# SafeArea

When a mobile app embeds a web view or a full-screen H5 page, the notch and the home-indicator area can cover content. `oas-safe-area` reads `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` and reserves that height as a layout spacer at the top or bottom of the page.

- Pure CSS spacer: no keyboard focus, no interaction, no events
- The default slot can hold decorative dots; accessibility is up to the host
- On desktop `env(...)` is `0` — use `size` to set an explicit height for demos or fallbacks

## Basic Usage

<DemoBlock title="Bottom safe area (size=24 simulates the gesture area)">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <div style="padding: var(--oas-space-3); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Page content</div>
    <oas-safe-area size="24" style="background: var(--oas-color-border)"></oas-safe-area>
  </div>
</DemoBlock>

## Top / Bottom

`position="top"` reads the top notch inset; the default `bottom` reads the home-indicator inset.

<DemoBlock title="Top (size=20) and bottom (size=32)">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <oas-safe-area position="top" size="20" style="background: var(--oas-color-border)"></oas-safe-area>
    <div style="padding: var(--oas-space-3); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Content</div>
    <oas-safe-area size="32" style="background: var(--oas-color-border)"></oas-safe-area>
  </div>
</DemoBlock>

## Explicit size Override

`size` accepts plain numbers (px) or any CSS length (`1rem` / `24px` / `calc(...)`) and writes `--oas-safe-area-size`; removing it restores the `env(...)` fallback.

<DemoBlock title="size=1.5rem (24px)">
  <oas-safe-area size="1.5rem" style="width: 100%; background: var(--oas-color-border); border-radius: var(--oas-radius-sm)"></oas-safe-area>
</DemoBlock>

## Combined with StatusBar

A typical mobile page has the status-bar spacer at the top, the safe-area spacer at the bottom, and business content in between:

<DemoBlock title="StatusBar + content + SafeArea skeleton">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <oas-status-bar height="28" style="--oas-status-bar-bg: var(--oas-color-bg-elevated)">9:41</oas-status-bar>
    <div style="padding: var(--oas-space-4); text-align: center; font-size: var(--oas-font-size-sm)">Business content</div>
    <oas-safe-area size="24" style="background: var(--oas-color-border)"></oas-safe-area>
  </div>
</DemoBlock>

## API

### oas-safe-area

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `position` | Placement direction: `bottom` (default, home-indicator area) / `top` (notch area) | — | — |
| `size` | Height override: plain numbers are px, CSS lengths are accepted (`1rem` / `24px` / `calc(...)`); defaults to `env(safe-area-inset-*)` (0 when unsupported) | `string` | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Decorative content (optional, e.g. a status dot); do not put page content here |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-safe-area-size` | Height override (the `size` attribute writes the same variable) | `var(--oas-safe-area-inset)` |
