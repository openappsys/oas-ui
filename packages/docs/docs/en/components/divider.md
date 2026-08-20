# Divider

A horizontal/vertical divider that separates content.

## Horizontal

<DemoBlock title="Basic divider">
  <oas-divider></oas-divider>
</DemoBlock>

## With content

<DemoBlock title="Content position">
  <oas-divider>Text</oas-divider>
  <oas-divider content-position="left">Left aligned</oas-divider>
  <oas-divider content-position="right">Right aligned</oas-divider>
</DemoBlock>

<DemoBlock title="Emphasized text">
  <oas-divider strong content-position="left">Section title</oas-divider>
</DemoBlock>

`strong` bolds the text (font-weight 600), useful as section titles for content groups.

## Line style

<DemoBlock title="Four variants">
  <oas-divider variant="dashed">dashed</oas-divider>
  <oas-divider variant="dotted">dotted</oas-divider>
  <oas-divider variant="double">double</oas-divider>
</DemoBlock>

`variant` is equivalent to the `dashed` boolean (the `dashed` attribute = `variant="dashed"`; an explicit `variant` takes priority).

## Inset

<DemoBlock title="inset / middle">
  <oas-divider inset>inset — empty on the start side</oas-divider>
  <oas-divider middle>middle — empty on both sides</oas-divider>
</DemoBlock>

## Spacing size

<DemoBlock title="size options">
  <oas-divider size="small">small</oas-divider>
  <oas-divider>medium (default)</oas-divider>
  <oas-divider size="large">large</oas-divider>
</DemoBlock>

## Dashed

<DemoBlock title="Dashed (compat shorthand)">
  <oas-divider dashed></oas-divider>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical divider">
  <span>Text</span>
  <oas-divider direction="vertical"></oas-divider>
  <span>Text</span>
</DemoBlock>

<DemoBlock title="Stretches inside flex containers">
  <div style="display: flex; height: 48px; gap: 8px; border: 1px dashed var(--oas-color-border); padding: 0 12px;">
    <span style="display: flex; align-items: center;">Card A</span>
    <oas-divider direction="vertical"></oas-divider>
    <span style="display: flex; align-items: center;">Card B</span>
    <oas-divider direction="vertical"></oas-divider>
    <span style="display: flex; align-items: center;">Card C</span>
  </div>
</DemoBlock>

A vertical divider stretches to the full row height inside flex/grid containers; in inline context it stays at 1em text height.

## Custom styling

The `color` attribute accepts 11 preset names (auto-adapting to light/dark themes) or any CSS color value (takes effect immediately, overriding presets and defaults); line width, spacing and the title-side gap go through CSS variables:

<DemoBlock title="Preset palette">
  <oas-divider color="magenta">magenta</oas-divider>
  <oas-divider color="red">red</oas-divider>
  <oas-divider color="volcano">volcano</oas-divider>
  <oas-divider color="orange">orange</oas-divider>
  <oas-divider color="gold">gold</oas-divider>
  <oas-divider color="lime">lime</oas-divider>
  <oas-divider color="green">green</oas-divider>
  <oas-divider color="cyan">cyan</oas-divider>
  <oas-divider color="blue">blue</oas-divider>
  <oas-divider color="geekblue">geekblue</oas-divider>
  <oas-divider color="purple">purple</oas-divider>
</DemoBlock>

<DemoBlock title="Custom color values (highest priority)">
  <oas-divider color="#0e7490" dashed>Teal dashed</oas-divider>
  <oas-divider color="#7c3aed">Purple solid</oas-divider>
</DemoBlock>

<DemoBlock title="CSS variables">
  <oas-divider style="--oas-divider-spacing: 8px;">Compact spacing</oas-divider>
  <oas-divider content-position="left" style="--oas-divider-title-inset: 120px;">Fixed 120px gap on the title side</oas-divider>
  <oas-divider style="--oas-divider-width: 2px;">2px thick line</oas-divider>
</DemoBlock>

| Variable | Description | Default |
| --- | --- | --- |
| `--oas-divider-width` | Line width | `1px` |
| `--oas-divider-color` | Line color | border token |
| `--oas-divider-spacing` | Vertical spacing (default for size options; overrides all three once set) | size-matched space token |
| `--oas-divider-title-inset` | Gap on the title side (content-position=left/right and inset) | `5%` |
| `--oas-divider-middle-inset` | Gap on both sides for middle | `16.67%` |
| `--oas-divider-double-gap` | Gap between the two lines of double | `3px` |

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | Color: accepts 11 preset names (mapped to `--oas-preset-*` tokens) or any CSS color value | `string` | — |
| `content-position` | Content position | `DividerPosition` | `center` |
| `dashed` | Dashed | `boolean` | — |
| `direction` | Direction | `DividerDirection` | `horizontal` |
| `inset` | Indent: start-side inset of a horizontal line (default 5%, via `--oas-divider-title-inset`), aligned with the title inset | `boolean` | — |
| `middle` | Symmetric inset: equal insets on both sides of a horizontal line (default 16.67%, via `--oas-divider-middle-inset`) | `boolean` | — |
| `size` | Spacing tier: `small` / `medium` (default) / `large`; horizontal layout only | `string` | — |
| `strong` | Bolder divider title (font-weight 600) | `boolean` | — |
| `variant` | Line style: `solid` / `dashed` / `dotted` / `double`; an explicit value takes precedence over the `dashed` boolean (compat form) | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
