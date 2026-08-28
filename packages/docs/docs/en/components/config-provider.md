# ConfigProvider

The injection entry point for global configuration, centrally managing `locale` / `size` / `theme` / `config` / `direction` / `z-index` for the wrapped subtree. Component resolution order: own attribute > config-provider > global default.

## Locale injection

The config-provider's `locale` takes precedence over the global `setLocale()`: components inside use the injected locale for built-in copy.

<DemoBlock title="Switching locale">
  <oas-space>
    <oas-button type="primary" onclick="setCpLocale('zh-CN')">中文</oas-button>
    <oas-button onclick="setCpLocale('en')">English</oas-button>
  </oas-space>
  <oas-config-provider id="cp-locale" locale="zh-CN">
    <oas-space style="margin-top: 16px">
      <oas-empty></oas-empty>
      <oas-tag closable>可关闭标签</oas-tag>
      <oas-alert>这是一条警告提示</oas-alert>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Size injection

Components inside use the injected `size` unless they set it explicitly; explicitly set `size` always wins. `size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`.

<DemoBlock title="Size injection">
  <oas-space>
    <oas-button type="primary" onclick="setCpSize('xs')">XS</oas-button>
    <oas-button type="primary" onclick="setCpSize('small')">Small</oas-button>
    <oas-button onclick="setCpSize('medium')">Medium</oas-button>
    <oas-button onclick="setCpSize('large')">Large</oas-button>
    <oas-button onclick="setCpSize('xl')">XL</oas-button>
  </oas-space>
  <oas-config-provider id="cp-size" size="medium" style="margin-top: 16px; display: block">
    <oas-space>
      <oas-button>Injected button</oas-button>
      <oas-button size="small">Small by itself</oas-button>
      <oas-tag>Injected tag</oas-tag>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Theme injection

The config-provider's `theme` writes `data-theme` onto itself, and the wrapped subtree (including Shadow DOM) inherits the corresponding theme tokens.

<DemoBlock title="Theme injection">
  <oas-space>
    <oas-button type="primary" onclick="setCpTheme('')">Light</oas-button>
    <oas-button onclick="setCpTheme('dark')">Dark</oas-button>
  </oas-space>
  <oas-config-provider id="cp-theme" theme="" style="margin-top: 16px; display: block; padding: 16px; border-radius: 8px; background: var(--oas-color-bg)">
    <oas-space>
      <oas-button type="primary">Theme button</oas-button>
      <oas-tag>Follows theme</oas-tag>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Config JSON component-level defaults

`config` is a generic channel for component-level default attributes: declare any component's default attribute as JSON (e.g. `{"oas-button":{"variant":"outlined"}}`); components read the injected value unless they set it explicitly. Keys follow the `tag` + attribute name format, resolved from the nearest provider, with explicitly set own attributes taking precedence.

<DemoBlock title="Config JSON injecting button variant">
  <oas-space>
    <oas-button type="primary" onclick="setCpConfig('outlined')">Inject outlined</oas-button>
    <oas-button type="primary" onclick="setCpConfig('filled')">Inject filled</oas-button>
    <oas-button onclick="setCpConfig('')">Clear</oas-button>
  </oas-space>
  <oas-config-provider id="cp-config" style="margin-top: 16px; display: block">
    <oas-space>
      <oas-button type="primary">Injected</oas-button>
      <oas-button>Injected</oas-button>
      <oas-button variant="dashed">Explicit override</oas-button>
    </oas-space>
  </oas-config-provider>
</DemoBlock>

## Direction injection

`direction` writes the host `dir` attribute: CSS `direction` inherits through light/shadow subtrees, and components (e.g. scroll-area's RTL horizontal wheel translation) consume it via the injected value.

<DemoBlock title="Direction injection">
  <oas-space>
    <oas-button type="primary" onclick="setCpDirection('rtl')">RTL</oas-button>
    <oas-button onclick="setCpDirection('ltr')">LTR</oas-button>
  </oas-space>
  <oas-config-provider id="cp-direction" direction="ltr" style="margin-top: 16px; display: block; padding: 16px; border-radius: 8px; background: var(--oas-color-bg)">
    <oas-space>
      <oas-tag>Direction follows injection</oas-tag>
      <oas-button>Button</oas-button>
    </oas-space>
    <oas-scroll-area height="120" style="margin-top: 16px; display: block; width: 260px; border: 1px solid var(--oas-color-border); border-radius: 8px">
      <div style="width: 400px; padding: 8px">Horizontally scrollable content: under RTL the wheel direction flips and the horizontal scrollbar mirrors (negative `scrollLeft` range).</div>
    </oas-scroll-area>
  </oas-config-provider>
</DemoBlock>

## z-index floating layer base

`z-index` writes `--oas-z-index-base` on the host: every floating layer in the subtree (messages / notifications / dropdowns / overlays, etc.) stacks its own layer offset on top of that base via `calc(var(--oas-z-index-base, 0) + var(--oas-z-X, <layer default>))` — lifting everything while preserving the layer order (tooltip stays above modal).

<DemoBlock title="z-index floating layer base">
  <oas-space style="margin-bottom: 12px">
    <oas-button type="primary" onclick="setCpZ(5000)">Base 5000</oas-button>
    <oas-button onclick="setCpZ('')">Reset</oas-button>
  </oas-space>
  <oas-config-provider id="cp-z" style="display: block">
    <oas-app>
      <oas-space>
        <oas-button type="primary" onclick="zMsg()">Message</oas-button>
        <oas-tooltip content="Floating layer base applies">Hover for tooltip</oas-tooltip>
      </oas-space>
    </oas-app>
  </oas-config-provider>
</DemoBlock>

## Nearest provider wins

An inner config-provider overrides an outer one: components wrapped by the inner provider use its config, while components under the outer provider (not nested further) use the outer config.

<DemoBlock title="Nearest provider wins">
  <oas-config-provider locale="en">
    <oas-space style="margin-bottom: 8px"><oas-tag>Outer en</oas-tag></oas-space>
    <oas-config-provider locale="zh-CN">
      <oas-space><oas-tag>Inner zh-CN</oas-tag></oas-space>
    </oas-config-provider>
  </oas-config-provider>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { registerLocale } = await import('@oas-ui/i18n')
  const en = (await import('@oas-ui/i18n/en')).default
  registerLocale(en)
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.setCpLocale = (locale) => document.getElementById('cp-locale')?.setAttribute('locale', locale)
  window.setCpSize = (size) => document.getElementById('cp-size')?.setAttribute('size', size)
  window.setCpTheme = (theme) => document.getElementById('cp-theme')?.setAttribute('theme', theme)
  window.setCpConfig = (variant) => {
    const cp = document.getElementById('cp-config')
    if (variant) cp?.setAttribute('config', JSON.stringify({ 'oas-button': { variant } }))
    else cp?.removeAttribute('config')
  }
  window.setCpDirection = (direction) => document.getElementById('cp-direction')?.setAttribute('direction', direction)
  window.setCpZ = (z) => {
    const cp = document.getElementById('cp-z')
    if (z) cp?.setAttribute('z-index', String(z))
    else cp?.removeAttribute('z-index')
  }
  window.zMsg = () => message.success('Floating layer base applies')
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `config` | Component-level default config JSON (e.g. `{"oas-button":{"variant":"outlined"}}`); components read `[tag][key]` from the nearest provider, own explicit attributes win; invalid JSON is ignored with a dev warning | `string` | — |
| `direction` | Global direction injection (`ltr`/`rtl`); writes the host `dir` attribute (CSS direction inheritance pierces light/shadow subtrees); components can consume it via `injectValue('direction')`; invalid values fall back to `ltr` with a dev warning | `string` | — |
| `locale` | Language for built-in copy in the wrapped subtree (must be registered); takes precedence over global `setLocale()` | — | — |
| `size` | Default size for wrapped components, applied when a component doesn't set it explicitly | — | — |
| `theme` | Theme for the wrapped subtree, written to `data-theme` | — | — |
| `z-index` | Global starting value for floating layers (positive integer); writes `--oas-z-index-base` on the host, lifting all floating layers in the subtree; invalid values are ignored with a dev warning | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

- Component resolution order: own attribute > config-provider > global default.
- `locale` requires the language pack to be registered via `registerLocale()`; falls back to the global translator when unregistered.
