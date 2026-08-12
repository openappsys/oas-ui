# Affix

Pins content to the top of the viewport; it becomes fixed once the page scrolls past a given offset. Commonly used for fixed table action bars, toolbars, etc.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-affix offset="16">
    <oas-button type="primary">Pinned to the top when scrolling</oas-button>
  </oas-affix>
</DemoBlock>

Scroll this page down and observe the button being pinned as it approaches the top of the viewport (`position: fixed`).

## Custom offset

<DemoBlock title="Custom offset">
  <oas-affix offset="80">
    <oas-button>Fixed 80px from the viewport top</oas-button>
  </oas-affix>
</DemoBlock>

## Combined content

<DemoBlock title="Combined content">
  <oas-affix offset="16">
    <oas-space>
      <oas-tag type="primary">Filters</oas-tag>
      <oas-button size="small">Reset</oas-button>
      <oas-button size="small" type="primary">Query</oas-button>
    </oas-space>
  </oas-affix>
</DemoBlock>

## API

### Attributes

| Attribute | Description                               | Type     | Default |
| --------- | ----------------------------------------- | -------- | ------- |
| `offset`  | Fixed distance from the viewport top (px) | `string` | `0`     |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

Listens to `window` scroll; the content is pinned once it scrolls out of the viewport and is passed through the default slot.
