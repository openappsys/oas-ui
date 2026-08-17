# Link

A text link, an enhanced native `<a>`.

## Types

<DemoBlock title="Link types">
  <oas-link href="#">Default link</oas-link>
  <oas-link href="#" type="primary">Primary link</oas-link>
  <oas-link href="#" type="success">Success link</oas-link>
  <oas-link href="#" type="warning">Warning link</oas-link>
  <oas-link href="#" type="danger">Danger link</oas-link>
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

<DemoBlock title="Underline control">
  <oas-link href="#">Underlined</oas-link>
  <oas-link href="#" underline="false">No underline</oas-link>
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
| `color` | — | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `href` | Link URL | `string` | — |
| `target` | Open behavior | `string` | — |
| `type` | Type | `LinkType` | `default` |
| `underline` | Underline | `string` | `true` |

### Events

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
