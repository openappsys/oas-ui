# Kbd

A keyboard shortcut display component. `keys` is split by spaces into multiple keycaps joined with `+`; non-interactive.

## Basic usage

<DemoBlock title="Combined shortcuts">
  <oas-kbd keys="ctrl shift k"></oas-kbd>
  <oas-kbd keys="alt f4"></oas-kbd>
  <oas-kbd keys="cmd c"></oas-kbd>
</DemoBlock>

## Single key & empty state

<DemoBlock title="Single key & empty state">
  <oas-kbd keys="enter"></oas-kbd>
  <oas-kbd keys="esc"></oas-kbd>
  <oas-kbd keys=""></oas-kbd>
</DemoBlock>

## Custom content

<DemoBlock title="Slot content takes priority">
  <oas-kbd>⌘C</oas-kbd>
  <oas-kbd>Space</oas-kbd>
</DemoBlock>

## API

### Attributes

| Attribute | Description                                         | Type     | Default |
| --------- | --------------------------------------------------- | -------- | ------- |
| `keys`    | Space-separated key sequence, e.g. `"ctrl shift k"` | `string` | —       |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

> Note: empty `keys` renders a single empty keycap; slot content takes priority when provided. The component is purely presentational with `role="text"` and dispatches no events.
