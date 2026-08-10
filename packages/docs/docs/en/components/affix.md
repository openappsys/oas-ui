# Affix

Pins content to the top of the viewport; it becomes fixed once the page scrolls past a given offset. Commonly used for fixed table action bars, toolbars, etc.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-affix offset="16">
    <oas-button type="primary">滚动页面时固定到顶部</oas-button>
  </oas-affix>
</DemoBlock>

Scroll this page down and observe the button being pinned as it approaches the top of the viewport (`position: fixed`).

## Custom offset

<DemoBlock title="Custom offset">
  <oas-affix offset="80">
    <oas-button>固定于距视口顶部 80px</oas-button>
  </oas-affix>
</DemoBlock>

## Combined content

<DemoBlock title="Combined content">
  <oas-affix offset="16">
    <oas-space>
      <oas-tag type="primary">筛选条件</oas-tag>
      <oas-button size="small">重置</oas-button>
      <oas-button size="small" type="primary">查询</oas-button>
    </oas-space>
  </oas-affix>
</DemoBlock>

## API

| Property | Description                        | Default |
| -------- | ---------------------------------- | ------- |
| `offset` | Fixed distance from the viewport top (px) | `0`     |

Listens to `window` scroll; the content is pinned once it scrolls out of the viewport and is passed through the default slot.
