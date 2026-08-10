# Flex

A layout container based on CSS Flexbox; attributes control direction, main/cross-axis alignment, gap and wrapping.

## Basic usage

<DemoBlock title="Horizontal and gap">
  <oas-flex gap="12px">
    <oas-tag type="primary">Tag 1</oas-tag>
    <oas-tag type="success">Tag 2</oas-tag>
    <oas-tag type="warning">Tag 3</oas-tag>
  </oas-flex>
</DemoBlock>

## Direction

The `vertical` shorthand equals `direction="vertical"` (stacked vertically).

<DemoBlock title="Vertical direction">
  <oas-flex vertical gap="8px">
    <oas-tag>Stacked vertically</oas-tag>
    <oas-tag type="success">Top to bottom</oas-tag>
    <oas-tag type="info">Adjustable gap</oas-tag>
  </oas-flex>
</DemoBlock>

<DemoBlock title="Equivalent direction syntax">
  <oas-flex direction="vertical" gap="8px">
    <oas-tag>direction="vertical"</oas-tag>
    <oas-tag type="success">Same as vertical</oas-tag>
  </oas-flex>
</DemoBlock>

## Main-axis alignment

<DemoBlock title="justify — full enumeration">
  <div class="demo-flex-col">
    <span class="demo-flex-label">justify="start" (default)</span>
    <oas-flex justify="start" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="center"</span>
    <oas-flex justify="center" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="end"</span>
    <oas-flex justify="end" gap="8px" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="between"</span>
    <oas-flex justify="between" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">justify="around"</span>
    <oas-flex justify="around" style="width: 100%">
      <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    </oas-flex>
  </div>
</DemoBlock>

## Cross-axis alignment

<DemoBlock title="align — full enumeration">
  <div class="demo-flex-col">
    <span class="demo-flex-label">align="stretch" (default)</span>
    <oas-flex align="stretch" gap="8px" style="width: 100%; height: 80px">
      <oas-button>Button</oas-button><oas-tag size="small">Tag</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="start"</span>
    <oas-flex align="start" gap="8px" style="width: 100%; height: 80px">
      <oas-button>Button</oas-button><oas-tag size="small">Tag</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="center"</span>
    <oas-flex align="center" gap="8px" style="width: 100%; height: 80px">
      <oas-button>Button</oas-button><oas-tag size="small">Tag</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="end"</span>
    <oas-flex align="end" gap="8px" style="width: 100%; height: 80px">
      <oas-button>Button</oas-button><oas-tag size="small">Tag</oas-tag>
    </oas-flex>
    <span class="demo-flex-label">align="baseline"</span>
    <oas-flex align="baseline" gap="8px" style="width: 100%; height: 80px">
      <oas-button>Button</oas-button><oas-tag size="small">Tag</oas-tag>
    </oas-flex>
  </div>
</DemoBlock>

> A fixed 80px-height container with items of different heights (button 32px / tag 20px) shows the cross-axis difference of each `align` variant; `stretch` stretches items to the container height.

## Wrapping

`wrap` is a boolean attribute: when present, `flex-wrap: wrap`; otherwise `nowrap`.

<DemoBlock title="Wrap">
  <oas-flex wrap gap="8px" style="width: 100%">
    <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    <oas-tag>4</oas-tag><oas-tag>5</oas-tag><oas-tag>6</oas-tag>
    <oas-tag>7</oas-tag><oas-tag>8</oas-tag><oas-tag>9</oas-tag>
    <oas-tag>10</oas-tag>
  </oas-flex>
</DemoBlock>

## Empty container

With no children the height is 0 — no error, no placeholder.

<DemoBlock title="Empty container">
  <oas-flex style="width: 100%; background: var(--oas-color-bg-hover)"></oas-flex>
</DemoBlock>

<style>
  .demo-flex-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .demo-flex-label {
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
  }
</style>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Cross-axis alignment | — | `stretch` |
| `direction` | Main-axis direction | — | `row` |
| `gap` | Gap between items | — | — |
| `justify` | Main-axis alignment | — | `start` |
| `vertical` | Vertical shorthand | — | — |
| `wrap` | Wrapping (boolean; present means `wrap`) | — | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
