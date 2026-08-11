# Space

A layout container with even horizontal/vertical spacing.

## Horizontal

<DemoBlock title="Horizontal spacing">
  <oas-space>
    <oas-button>Button</oas-button>
    <oas-button type="primary">Button</oas-button>
    <oas-button type="danger">Button</oas-button>
  </oas-space>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical spacing">
  <oas-space direction="vertical">
    <oas-tag>Tag 1</oas-tag>
    <oas-tag type="success">Tag 2</oas-tag>
    <oas-tag type="warning">Tag 3</oas-tag>
  </oas-space>
</DemoBlock>

## Size & wrapping

`size` supports five tiers: `xs` (4px) / `small` (8px) / `medium` (12px, default) / `large` (24px) / `xl` (32px), or a numeric pixel value; invalid values fall back to `medium` with a warning.

<DemoBlock title="Five spacing tiers">
  <oas-space size="xs">
    <oas-tag>xs 4px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="small">
    <oas-tag>small 8px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="medium">
    <oas-tag>medium 12px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="large">
    <oas-tag>large 24px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="xl">
    <oas-tag>xl 32px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="Large spacing & wrapping">
  <oas-space size="large" wrap>
    <oas-button>Button 1</oas-button>
    <oas-button>Button 2</oas-button>
    <oas-button>Button 3</oas-button>
    <oas-button>Button 4</oas-button>
    <oas-button>Button 5</oas-button>
  </oas-space>
</DemoBlock>

## Alignment

<DemoBlock title="Cross-axis alignment">
  <oas-space align="start">
    <oas-tag>start</oas-tag>
    <oas-button type="primary">Button</oas-button>
  </oas-space>
  <oas-space align="center">
    <oas-tag>center</oas-tag>
    <oas-button type="primary">Button</oas-button>
  </oas-space>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Alignment | `string` | — |
| `direction` | Direction | `SpaceDirection` | `horizontal` |
| `size` | Spacing: `xs` (4px) / `small` (8px) / `medium` (12px, default) / `large` (24px) / `xl` (32px), or a numeric pixel value; invalid values fall back to `medium` with a warning | `string` | `medium` |
| `wrap` | Whether to wrap | `boolean` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
