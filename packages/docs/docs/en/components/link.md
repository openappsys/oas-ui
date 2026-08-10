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

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `href` | Link URL | string | — |
| `type` | Type | `default` / `primary` / `success` / `warning` / `danger` | `default` |
| `underline` | Underline | boolean | `true` |
| `disabled` | Disabled | boolean | `false` |
| `target` | Open behavior | string | — |

| Event | Description |
| --- | --- |
| `oas-click` | Click, `detail: { originalEvent }` |
