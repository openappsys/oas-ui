---
description: A mobile status-bar spacer that reserves env(safe-area-inset-top) height with optional height and foreground-color overrides; the slot holds host-drawn status content
---

# StatusBar

Reserves the top status-bar height (`env(safe-area-inset-top)`) for pages embedded in a mobile host, with height and foreground-color overrides. The component does not emulate the system status bar — the host container (web view / native shell) owns it; this component only prevents content from being covered and lets the foreground color follow the page theme.

- Default height = `env(safe-area-inset-top)`; `0` on desktop — use `height` for an explicit value
- `color` follows ui-spec §4.1: the 11 preset names resolve to `--oas-preset-*-text` (text-safe tier); any other CSS color is injected as-is
- The default slot holds host-drawn time / battery content

## Basic Usage

<DemoBlock title="height=44 with time content">
  <oas-status-bar height="44" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">9:41</oas-status-bar>
</DemoBlock>

## Foreground Color

<DemoBlock title="Preset color / arbitrary CSS color">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-status-bar height="36" color="blue" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">blue preset</oas-status-bar>
    <oas-status-bar height="36" color="orange" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">orange preset</oas-status-bar>
    <oas-status-bar height="36" color="var(--oas-color-danger-text)" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px; border-radius: var(--oas-radius-md);">CSS variable color</oas-status-bar>
  </div>
</DemoBlock>

## Dark Theme

The default foreground uses `--oas-color-text-primary` and the background is controlled by `--oas-status-bar-bg`; nothing extra is needed in dark mode. The demo previews a locally scoped dark theme:

<DemoBlock title="data-theme=dark local preview">
  <div data-theme="dark" style="background: var(--oas-color-bg); border-radius: var(--oas-radius-md); overflow: hidden; width: 100%;">
    <oas-status-bar height="36" style="width: 100%; --oas-status-bar-bg: var(--oas-color-bg-elevated); outline: 1px dashed var(--oas-color-border); outline-offset: -1px">9:41</oas-status-bar>
    <div style="padding: var(--oas-space-3); font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">Dark page content</div>
  </div>
</DemoBlock>

## API

### oas-status-bar

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | Foreground override (ui-spec §4.1): the 11 preset names resolve to `--oas-preset-<name>-text`; any other CSS color is injected as-is; empty restores the token default | `string` | — |
| `height` | Height override: plain numbers are px, CSS lengths are accepted (`44px` / `1.5rem`); defaults to `env(safe-area-inset-top)` | `string` | — |

#### Slots

| Name | Description |
| --- | --- |
| default | Status content (time / battery drawn by the host) |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-status-bar-bg` | Background (transparent by default; the host decides whether to paint it) | `transparent` |
| `--oas-status-bar-color` | Foreground color (the `color` attribute writes the same variable) | `var(--oas-color-text-primary)` |
| `--oas-status-bar-height` | Height override (the `height` attribute writes the same variable) | `env(safe-area-inset-top, 0px)` |
