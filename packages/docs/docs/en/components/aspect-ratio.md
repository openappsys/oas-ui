# AspectRatio

A purely presentational component that locks a container's size to a specified aspect ratio: 100% width with height derived from the ratio, content filling the area and cropped to the ratio; with no children it still occupies space at the ratio. No events.

## Basic Usage

<DemoBlock title="16/9 video ratio">
  <oas-aspect-ratio ratio="16/9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">16:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## Common Ratios

<DemoBlock title="4:3 / 1:1 / 21:9">
  <oas-aspect-ratio ratio="4:3" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">4:3</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3); width: 200px;">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">1:1</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="21:9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">21:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## Empty Content Placeholder

<DemoBlock title="Keeps ratio without children (1:1)">
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);"></oas-aspect-ratio>
</DemoBlock>

## API

### Attributes

| Attribute | Description                                                                                        | Type     | Default |
| --------- | -------------------------------------------------------------------------------------------------- | -------- | ------- |
| `ratio`   | Aspect ratio; supports `16/9`, `4:3`, `16 / 9`, decimal `1.5`; invalid values fall back to `1 / 1` | `string` | —       |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

- The host is 100% wide, with height derived from `aspect-ratio`; content fills the area via absolute `inset: 0` and is cropped to the ratio.
- Without children, the host still occupies space at the ratio.
- No events; purely presentational.
