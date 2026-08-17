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

Line width, color, spacing and the title-side gap are customizable via CSS variables:

<DemoBlock title="CSS variables">
  <oas-divider style="--oas-divider-color: var(--oas-color-primary); --oas-divider-spacing: 8px;">Primary color + compact spacing</oas-divider>
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
| `content-position` | Content position | `DividerPosition` | `center` |
| `dashed` | Dashed | `boolean` | — |
| `direction` | Direction | `DividerDirection` | `horizontal` |
| `inset` | — | `boolean` | — |
| `middle` | — | `boolean` | — |
| `size` | — | `string` | — |
| `strong` | — | `boolean` | — |
| `variant` | — | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
