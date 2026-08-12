# ThemeEditor

Edit `--oas-*` theme tokens in real time: color tokens use a color picker, numeric tokens use a number input (displayed without the unit, written back with the original unit). Edits are written to host CSS variables immediately, so the subtree previews them live. By default, tokens are grouped into colors / font sizes / spacing / radius / control heights.

## Default token set

Shows the full set of default theme tokens (the semantic tokens from `@oas-ui/theme`); undefined variables are skipped automatically.

<DemoBlock title="Default token set">
  <oas-theme-editor id="te-default" style="max-width: 440px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-4)"></oas-theme-editor>
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

## Export & reset

Call `exportJson()` to get the current token set as JSON; `reset()` clears the inline variables written by the editor and restores the default theme values.

<DemoBlock title="Export theme JSON / reset">
  <oas-button size="small" type="primary" onclick="teExport()">Export theme JSON</oas-button>
  <oas-button size="small" onclick="teReset()">Reset editor</oas-button>
  <pre id="te-json" style="width: 100%; max-height: 320px; overflow: auto; margin: var(--oas-space-3) 0 0; padding: var(--oas-space-3); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-md); font-size: var(--oas-font-size-xs); line-height: 1.6">Click "Export theme JSON" to view the result</pre>
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
  window.teReset = () => {
    document.getElementById('te-default')?.reset()
    document.getElementById('te-in-cp')?.reset()
  }
})
</script>

## API

### Attributes

| Attribute | Description                                        | Type | Default |
| --------- | -------------------------------------------------- | ---- | ------- |
| `token`   | Custom list of tokens to edit (CSS variable names) | —    | —       |

### Events

| Event        | Description                                   |
| ------------ | --------------------------------------------- |
| `oas-change` | Editing any token, `detail: { token, value }` |

| Method         | Description                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| `exportJson()` | Returns the current token set `{ '--oas-*': value }`                                      |
| `reset()`      | Clears the inline CSS variables written to the host and restores the default theme values |

Behavior: tokens are read from the computed style of the host (or the nearest `oas-config-provider`); edits are written back to the host immediately via `style.setProperty`, and the subtree inherits them live. Inside a config-provider, writes go to the nearest provider (inherited by the whole subtree). Color input only accepts hex `#rrggbb`; non-hex current values are displayed but not fed into the color picker. Empty or invalid numeric input is neither written nor dispatched.
