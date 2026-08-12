# ConfigProvider

The injection entry point for global configuration, centrally managing `locale` / `size` / `theme` for the wrapped subtree. Component resolution order: own attribute > config-provider > global default.

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
  window.setCpLocale = (locale) => document.getElementById('cp-locale')?.setAttribute('locale', locale)
  window.setCpSize = (size) => document.getElementById('cp-size')?.setAttribute('size', size)
  window.setCpTheme = (theme) => document.getElementById('cp-theme')?.setAttribute('theme', theme)
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `locale` | Language for built-in copy in the wrapped subtree (must be registered); takes precedence over global `setLocale()` | — | — |
| `size` | Default size for wrapped components, applied when a component doesn't set it explicitly | — | — |
| `theme` | Theme for the wrapped subtree, written to `data-theme` | — | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

- Component resolution order: own attribute > config-provider > global default.
- `locale` requires the language pack to be registered via `registerLocale()`; falls back to the global translator when unregistered.
