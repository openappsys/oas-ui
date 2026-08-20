# Link

A text link, an enhanced native `<a>`.

## Types

<DemoBlock title="Link types">
  <oas-link href="#">Default link</oas-link>
  <oas-link href="#" type="primary">Primary link</oas-link>
  <oas-link href="#" type="success">Success link</oas-link>
  <oas-link href="#" type="warning">Warning link</oas-link>
  <oas-link href="#" type="danger">Danger link</oas-link>
  <oas-link href="#" type="info">Info link</oas-link>
</DemoBlock>

## Color

The `color` attribute accepts 11 preset names (auto-adapting to light/dark themes) or any CSS color value (takes effect immediately, overriding the `type` semantic color). Custom color values are rendered as-is — make sure the text contrast meets WCAG AA (4.5:1).

<DemoBlock title="Preset palette">
  <oas-link href="#" color="magenta">magenta</oas-link>
  <oas-link href="#" color="red">red</oas-link>
  <oas-link href="#" color="volcano">volcano</oas-link>
  <oas-link href="#" color="orange">orange</oas-link>
  <oas-link href="#" color="gold">gold</oas-link>
  <oas-link href="#" color="lime">lime</oas-link>
  <oas-link href="#" color="green">green</oas-link>
  <oas-link href="#" color="cyan">cyan</oas-link>
  <oas-link href="#" color="blue">blue</oas-link>
  <oas-link href="#" color="geekblue">geekblue</oas-link>
  <oas-link href="#" color="purple">purple</oas-link>
</DemoBlock>

<DemoBlock title="Custom color values (override type)">
  <oas-link href="#" color="#0e7490">Teal link</oas-link>
  <oas-link href="#" type="primary" color="#6d28d9">Purple overriding primary</oas-link>
</DemoBlock>

## Underline

`underline` three modes: `hover` (default, appears on hover) / `always` (persistent) / `never` (none). Compat shorthands: bare `underline` or `underline="true"` = always, `underline="false"` = never.

Underline offset and color are customizable via CSS variables: `--oas-link-underline-offset` (default 2px), `--oas-link-underline-color` (default follows text color).

<DemoBlock title="Underline modes">
  <oas-link href="#">hover (default, on hover)</oas-link>
  <oas-link href="#" underline="always">always</oas-link>
  <oas-link href="#" underline="never">never</oas-link>
  <oas-link href="#" underline="always" style="--oas-link-underline-offset: 4px; --oas-link-underline-color: var(--oas-color-danger);">offset 4px + red underline</oas-link>
</DemoBlock>

## Icon

The `icon` attribute adds an icon (name from the registry); `icon-position="start|end"` controls placement:

<DemoBlock title="Links with icons">
  <oas-link href="#" icon="search">Search docs</oas-link>
  <oas-link href="#" icon="arrow-right" icon-position="end">View details</oas-link>
</DemoBlock>

## External

`external` auto-adds `target="_blank"` + `rel="noopener noreferrer"` + an external-link icon:

<DemoBlock title="External link">
  <oas-link href="https://example.com" external>External docs</oas-link>
</DemoBlock>

## Disabled & new window

<DemoBlock title="Disabled & target">
  <oas-link href="#" disabled>Disabled link</oas-link>
  <oas-link href="https://example.com" target="_blank" type="primary">Open in new window</oas-link>
</DemoBlock>

## Events

<DemoBlock title="Click event">
  <oas-link href="#" type="primary" onoas-click="message.info('oas-click event fired')">Click link</oas-link>
</DemoBlock>

Clicking dispatches the `oas-click` CustomEvent; `detail.originalEvent` is the native MouseEvent.

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | Color: accepts 11 preset names (mapped to `--oas-preset-*-text` compliant tokens) or any CSS color value, overriding the `type` semantic color | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `external` | External link: automatically adds `target="_blank"`, `rel="noopener noreferrer"`, and an external-link icon | `boolean` | — |
| `href` | Link URL | `string` | — |
| `icon` | Icon name (from the oas-icon set), placed before or after the text (see `icon-position`) | `string` | — |
| `icon-position` | Icon position: `start` (default, before the text) / `end` (after the text); defaults to `end` for the `external` icon only | — | — |
| `target` | Open behavior | `string` | — |
| `type` | Type | `LinkType` | `default` |
| `underline` | Underline | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
