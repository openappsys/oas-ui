# ThemeEditor

Edit `--oas-*` theme tokens in real time: edits are written to host CSS variables immediately, so the subtree previews them live. Color token rows use a dual channel of swatch + text box (the swatch only carries `#rrggbb`; the text box can edit any CSS color function such as `rgb()`/`oklch()`/`color-mix()` without corrupting the original value); numeric token rows link a range slider with a number input. The panel has a search box that filters by token name, collapsible groups, built-in compact / comfortable presets, and export / import / reset tools.

## Default token set

Shows the full set of default theme tokens (the semantic tokens from `@oas-ui/theme`); undefined variables are skipped automatically.

<DemoBlock title="Default token set">
  <oas-theme-editor id="te-default" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## Editing color function values

Color token rows are a dual channel of swatch + text box:

- The swatch only carries values parseable to `#rrggbb` — color functions such as `rgb()`/`oklch()` are converted to their hex equivalent automatically and never fall back to black
- The text box always keeps the original value editable (any CSS color function); editing writes back without changing the original format
- Unparseable values (e.g. `color-mix()` containing `var()`) disable the swatch (neutral gray); only the text box is editable
- Invalid color input in the text box is not written back and shows a red outline

<DemoBlock title="Editing color function values">
  <oas-theme-editor id="te-fn"
    token='["--demo-color-rgb","--demo-color-oklch","--demo-color-mix"]'
    style="--demo-color-rgb: rgb(11, 108, 255); --demo-color-oklch: oklch(0.55 0.13 250); --demo-color-mix: color-mix(in srgb, var(--oas-color-primary) 85%, black); max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## Integration with ConfigProvider

When the editor is inside a `<oas-config-provider>`, the write target switches to the nearest provider element — the whole subtree (including Shadow DOM) inherits edited tokens live. The button on the right toggles the provider's dark theme to verify edited values still override the theme.

<DemoBlock title="Live preview in a ConfigProvider subtree">
  <oas-config-provider id="te-cp" theme="" style="display: block; width: 100%">
    <oas-space style="margin-bottom: var(--oas-space-3)">
      <oas-button type="primary">Primary button</oas-button>
      <oas-tag type="primary">Primary tag</oas-tag>
      <oas-button type="primary" size="small" onclick="teSwitchTheme()">Toggle dark theme</oas-button>
    </oas-space>
    <oas-theme-editor id="te-in-cp" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
  </oas-config-provider>
</DemoBlock>

## Custom token list

Pass a JSON string array (CSS variable names) via the `token` attribute to edit only those tokens; variables not defined on the current page are skipped automatically.

<DemoBlock title="Custom tokens">
  <oas-theme-editor token='["--oas-color-primary","--oas-radius-md","--oas-font-size-lg","--oas-does-not-exist"]' style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## Numeric token slider

Numeric token rows link a range slider with a number input (min / max / step come from the token definition): dragging the slider syncs the number box and writes back, and vice versa; the slider is clamped to min/max natively.

<DemoBlock title="Slider sync">
  <oas-theme-editor id="te-slider" token='["--oas-control-height-sm","--oas-control-height-md","--oas-space-3","--oas-space-4"]' style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## Preset themes

`applyPreset(name)` / the `preset` attribute applies a built-in preset theme that only touches size-family tokens (control-height / space), never colors:

- `compact`: control-height -4px per tier, space scaled down proportionally
- `comfortable`: control-height +4px per tier, space scaled up proportionally
- `default`: equivalent to `reset()`, clears the written inline variables

Applied tokens are recorded in writtenTokens and cleared together by `reset()`.

<DemoBlock title="Switching presets">
  <oas-space style="margin-bottom: var(--oas-space-3)">
    <oas-button size="small" type="primary" onclick="tePreset('compact')">Compact</oas-button>
    <oas-button size="small" onclick="tePreset('comfortable')">Comfortable</oas-button>
    <oas-button size="small" onclick="tePreset('default')">Default</oas-button>
    <span id="te-preset-status" style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">Not applied</span>
  </oas-space>
  <oas-theme-editor id="te-preset" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## Collapsible groups & search

Groups are collapsible via details/summary (open by default). The search box at the top filters rows by token name substring (case-insensitive); while filtering, groups auto-expand and groups without matches are hidden; clearing restores the previous fold state.

<DemoBlock title="Collapse & search filter">
  <oas-theme-editor id="te-search" token='["--oas-color-primary","--oas-color-success","--oas-font-size-sm","--oas-font-size-lg","--oas-space-2","--oas-space-5","--oas-radius-md","--oas-control-height-md"]' style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## Export / import / reset

- `exportJson()` returns the current token set as JSON; `exportCss()` returns `:root { ... }` CSS text (same source)
- `importJson(json)` applies a token set to the themeRoot (non-`--` keys are ignored with a warning); the panel refreshes in place without losing focus
- `reset()` clears the inline variables written by the editor and restores the default theme values

<DemoBlock title="Export / import / reset">
  <oas-button size="small" type="primary" onclick="teExport()">Export JSON</oas-button>
  <oas-button size="small" onclick="teExportCss()">Export CSS</oas-button>
  <oas-button size="small" onclick="teImport()">Import sample JSON</oas-button>
  <oas-button size="small" onclick="teReset()">Reset editor</oas-button>
  <pre id="te-json" style="width: 100%; max-height: 320px; overflow: auto; margin: var(--oas-space-3) 0 0; padding: var(--oas-space-3); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md); font-size: var(--oas-font-size-xs); line-height: 1.6">Click a button to view the result</pre>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.teSwitchTheme = () => {
    const cp = document.getElementById('te-cp')
    if (cp?.getAttribute('theme')) cp.removeAttribute('theme')
    else cp?.setAttribute('theme', 'dark')
  }
  window.teExport = () => {
    const el = document.getElementById('te-default')
    const pre = document.getElementById('te-json')
    pre.textContent = JSON.stringify(el?.exportJson() ?? {}, null, 2)
  }
  window.teExportCss = () => {
    const el = document.getElementById('te-default')
    const pre = document.getElementById('te-json')
    pre.textContent = el?.exportCss() ?? ''
  }
  window.teImport = () => {
    const el = document.getElementById('te-default')
    const data = { '--oas-color-primary': '#7c3aed', '--oas-font-size-md': '15px' }
    el?.importJson(data)
    document.getElementById('te-json').textContent = `Imported:\n` + JSON.stringify(data, null, 2)
  }
  window.teReset = () => {
    document.getElementById('te-default')?.reset()
    document.getElementById('te-in-cp')?.reset()
    document.getElementById('te-preset')?.reset()
    document.getElementById('te-preset-status').textContent = 'Not applied'
  }
  window.tePreset = (name) => {
    document.getElementById('te-preset')?.setAttribute('preset', name)
    document.getElementById('te-preset-status').textContent = name
  }
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `preset` | Built-in preset theme: `compact` (tight; control-height -4px, space scaled down proportionally) / `comfortable` (roomy; +4px, space scaled up proportionally) / `default` (equivalent to reset; clears written inline variables). Invalid values are ignored with a dev warning | — | — |
| `token` | Custom list of tokens to edit (CSS variable names) | — | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Editing any token, `detail: { token, value }` |

| Method           | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| `exportJson()`   | Returns the current token set `{ '--oas-*': value }`         |
| `exportCss()`    | Returns `:root { --oas-*: value; ... }` CSS text (same source as exportJson) |
| `importJson(json)` | Applies a token set to the themeRoot: `{ '--oas-*': value }`; non-`--` keys are ignored with a dev warning (deduplicated), then the panel refreshes in place (no rebuild, no focus loss) |
| `applyPreset(name)` | Applies a built-in preset theme (`compact` / `comfortable` / `default`); invalid names are ignored with a dev warning (deduplicated) |
| `reset()`        | Clears the inline CSS variables written to the host and restores the default theme values |

Behavior: tokens are read from the computed style of the host (or the nearest `oas-config-provider`); edits are written back to the host immediately via `style.setProperty`, and the subtree inherits them live. Inside a config-provider, writes go to the nearest provider (inherited by the whole subtree). Color rows are a swatch + text box dual channel: the swatch only carries values parseable to `#rrggbb` (color functions such as `rgb()`/`oklch()` are converted to hex; unparseable values like `color-mix()` containing `var()` disable the swatch); the text box always keeps the original value editable (any CSS color function) and invalid input is neither written nor dispatched, showing a red outline. Numeric rows link a range slider with a number input (min/max/step from the token definition) and write back with the original unit; empty or invalid numeric input is neither written nor dispatched. Groups are collapsible via details/summary (open by default); the search box filters rows by token name substring. Presets only touch size-family tokens (control-height / space); applied tokens are recorded in writtenTokens and cleared together by `reset()`.
