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

## Variants

`raised` (default, 3D) / `outline` (bordered) / `subtle` (light background) / `plain` (text only):

<DemoBlock title="Four variants">
  <oas-kbd keys="shift tab"></oas-kbd>
  <oas-kbd keys="shift tab" variant="outline"></oas-kbd>
  <oas-kbd keys="shift tab" variant="subtle"></oas-kbd>
  <oas-kbd keys="shift tab" variant="plain"></oas-kbd>
</DemoBlock>

## Sizes

<DemoBlock title="Three sizes">
  <oas-kbd keys="ctrl k" size="small"></oas-kbd>
  <oas-kbd keys="ctrl k"></oas-kbd>
  <oas-kbd keys="ctrl k" size="large"></oas-kbd>
</DemoBlock>

## Color

Accepts 11 preset names (auto-adapting to light/dark themes) or any CSS color value (takes effect immediately, overriding presets and defaults). Tints the keycap background:

<DemoBlock title="Preset palette">
  <oas-kbd keys="ctrl" color="red"></oas-kbd>
  <oas-kbd keys="ctrl" color="orange"></oas-kbd>
  <oas-kbd keys="ctrl" color="green"></oas-kbd>
  <oas-kbd keys="ctrl" color="blue"></oas-kbd>
  <oas-kbd keys="ctrl" color="purple"></oas-kbd>
</DemoBlock>

<DemoBlock title="Custom color values">
  <oas-kbd keys="ctrl" color="#0e7490"></oas-kbd>
  <oas-kbd keys="ctrl" color="#6d28d9"></oas-kbd>
</DemoBlock>

## Composition

Group multiple kbd with `oas-space` (spacing control):

<DemoBlock title="Grouping">
  <oas-space size="4">
    <oas-kbd keys="ctrl"></oas-kbd>
    <oas-kbd keys="shift"></oas-kbd>
    <oas-kbd keys="k"></oas-kbd>
  </oas-space>
</DemoBlock>

Nest inside other components via slot projection:

<DemoBlock title="Nesting in a button">
  <oas-button>Command palette <oas-kbd keys="cmd k" variant="plain"></oas-kbd></oas-button>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | Custom color: accepts 11 preset names (mapped to `--oas-preset-*-text` compliant tokens) or any CSS color value; keycap background is tinted and the border follows | `string` | — |
| `keys` | Space-separated key sequence, e.g. `"ctrl shift k"` | `string` | — |
| `size` | Size tier: `small` / `medium` (default) / `large`; invalid values fall back to `medium` with a warning | `string` | — |
| `variant` | Style: `raised` (default, 3D keycap) / `outline` (bordered) / `subtle` (light background) / `plain` (text only); invalid values fall back to `raised` with a warning | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

> Note: empty `keys` renders a single empty keycap; slot content takes priority when provided. The component is purely presentational with `role="text"` and dispatches no events.
