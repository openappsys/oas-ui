# ThemeEditor

Edit `--oas-*` theme tokens in real time: edits are written to host CSS variables immediately, so the subtree previews them live. Light and dark keep independent overrides, so either bucket can be edited without polluting the other. Color token rows use a dual channel of swatch + text box (the swatch only carries `#rrggbb`; the text box can edit any CSS color function such as `rgb()`/`oklch()`/`color-mix()` without corrupting the original value); numeric token rows link a range slider with a number input. The panel has a search box that filters by token name, collapsible groups, built-in compact / comfortable presets, and export / import / reset tools.

## Default token set

Shows the full set of default theme tokens (the semantic tokens from `@oas-ui/theme`); undefined variables are skipped automatically.

<DemoBlock title="Default token set">
  <oas-theme-editor id="te-default" editing-theme="light" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
</DemoBlock>

## Independent light/dark editing

The Editing theme selector maps to `editing-theme` / `editingTheme`, defaults to `light`, and safely falls back to `light` for invalid values. It only selects the editing bucket; **it is not a second theme switch**. The actual preview still follows the nearest ConfigProvider or effective `data-theme`.

- Light and dark keep independent overrides. Editing a bucket that is not currently previewed updates only that bucket and leaves the page's inline variables unchanged.
- Preview bucket resolution: the nearest `[data-theme]` ancestor wins (`dark` → dark bucket; `light` / `high-contrast` / custom theme names → light bucket — the two-bucket model never invents a third). Without a `[data-theme]` ancestor, root-class dark mode is honored (`html.dark` / `html.dark-theme` / `html.theme-dark`; the docs site uses this and needs no migration). An explicit `[data-theme]` ancestor always wins over root classes, so a local light provider is not hijacked by a dark root.
- Runtime root-class changes (for example a site theme switch toggling `html.dark`) are observed and reconciled immediately: the inline preview moves to the new bucket; export/read/import/edit/preset entry points reconcile before acting, so the old bucket's inline values never leak into the other bucket's export or preview (observation stops on disconnect).
- Switching the provider's effective theme applies the corresponding bucket without changing the selected editing bucket. Change events always carry the actual editing `theme`.
- Switching buckets, importing both buckets, and resetting do not rebuild token rows: the search query, group fold state, and inline focus remain intact, and invalid in-progress input is not unnecessarily overwritten.
- Even before the other bucket has been previewed, dual export reads its computed defaults through a temporary hidden probe instead of reusing values from the current theme. The probe is destroyed immediately afterwards.

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

When the editor is inside a `<oas-config-provider>`, the write target switches to the nearest provider element — the whole subtree (including Shadow DOM) inherits the overrides for the currently effective theme bucket. The button on the right toggles the provider's dark theme, demonstrating that the preview follows light/dark while the selected editing bucket remains independent.

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

Presets write only to the current editing bucket. `reset()` without an argument clears that bucket; `reset('light' | 'dark')` clears the named bucket without affecting the other one.

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

- Legacy `exportJson()` / `exportCss()` still return a flat token map / CSS for the current editing bucket only. Legacy `importJson(json)` likewise merges only into that bucket (non-`--` keys are ignored with a warning).
- Imports accept any `--*` CSS variable, not just the built-in token set: values are written to the themeRoot inline style as strings, and variables outside the `token` list still take effect (they simply do not render as editable rows). Existence is not validated, so a typo silently creates an empty variable.
- New `exportThemes()` returns an explicit `{ light, dark }` pair of flat maps. New `importThemes(themes)` validates the complete shape and every token before replacing both buckets in one commit; any invalid item causes no partial writes.
- `reset()` clears only the current editing bucket; `reset('light' | 'dark')` clears only the named bucket.
- Legacy import, applyPreset, and reset emit no extra events. User edits dispatch `oas-change` with `{ token, value, theme }`.

<DemoBlock title="Export / import / reset">
  <oas-button size="small" type="primary" onclick="teExport()">Export current JSON</oas-button>
  <oas-button size="small" onclick="teExportCss()">Export current CSS</oas-button>
  <oas-button size="small" onclick="teImport()">Import current sample</oas-button>
  <oas-button size="small" onclick="teExportThemes()">Export both themes</oas-button>
  <oas-button size="small" onclick="teImportThemes()">Import both themes</oas-button>
  <oas-button size="small" onclick="teReset()">Reset current bucket</oas-button>
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
    document.getElementById('te-json').textContent = `Imported into current bucket:\n` + JSON.stringify(data, null, 2)
  }
  window.teExportThemes = () => {
    const el = document.getElementById('te-default')
    document.getElementById('te-json').textContent = JSON.stringify(el?.exportThemes() ?? {}, null, 2)
  }
  window.teImportThemes = () => {
    const el = document.getElementById('te-default')
    const data = {
      light: { '--oas-color-primary': '#7c3aed', '--oas-font-size-md': '15px' },
      dark: { '--oas-color-primary': '#c4b5fd', '--oas-font-size-md': '16px' },
    }
    el?.importThemes(data)
    document.getElementById('te-json').textContent = `Atomically imported both buckets:\n` + JSON.stringify(data, null, 2)
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

### oas-theme-editor

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `editing-theme` | Selects the light/dark editing bucket (default light; invalid values safely fall back to light). It only selects the edit/import/export target and never controls the actual preview theme | `ThemeEditorTheme` | `light` |
| `preset` | Built-in preset theme: `compact` (tight; control-height -4px, space scaled down proportionally) / `comfortable` (roomy; +4px, space scaled up proportionally) / `default` (equivalent to reset; clears the current editing bucket). Invalid values are ignored with a dev warning | — | — |
| `token` | Custom list of tokens to edit (CSS variable names) | — | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `exportJson` | `exportJson(): ThemeTokenMap` | Export the flat token map for the current editingTheme bucket; the legacy shape is not changed into nested themes |
| `exportThemes` | `exportThemes(): ThemeEditorSnapshot` | Export an explicit `{ light, dark }` pair of flat token maps |
| `exportCss` | `exportCss(): string` | Export `:root` CSS text for the current editingTheme bucket, from the same source as exportJson |
| `importJson` | `importJson(json: Record<string, unknown> \| string): void` | Import only into the current editingTheme bucket, preserving the legacy flat shape, merge behavior, and non-`--` key warnings |
| `importThemes` | `importThemes(themes: ThemeEditorSnapshot): void` | Atomically import both buckets: validate the exact light/dark shape and every string token value before one replacement commit; any invalid item leaves both buckets untouched |
| `applyPreset` | `applyPreset(name: string): void` | Apply a built-in preset to the current editingTheme bucket, changing only size-family tokens and emitting no extra event |
| `reset` | `reset(theme?: ThemeEditorTheme): void` | `reset(theme?)` clears only the named light/dark bucket; without an argument it clears only the current editingTheme bucket and leaves the other bucket intact |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | A user edits a token, `detail: { token, value, theme }`; theme is the actual editingTheme |

Behavior: tokens are read from the computed style of the host (or nearest `oas-config-provider`). Light/dark overrides are stored independently; only the effective theme bucket is applied to the preview, and editingTheme never controls the provider theme. Color rows combine a swatch with a text box that preserves arbitrary CSS color functions; invalid input is neither written nor dispatched and shows a red outline. Numeric rows link a range slider with a number input and preserve the original unit; empty or invalid input is neither written nor dispatched. Groups use collapsible details/summary and the search box filters by token name. Bucket switches, dual imports, and resets sync in place without rebuilding rows. Presets write only size-family tokens in the current editing bucket, and reset clears by bucket.
