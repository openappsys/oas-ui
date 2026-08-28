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
    <span class="demo-flex-label">justify="evenly"</span>
    <oas-flex justify="evenly" style="width: 100%">
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

## Fill

`fill` makes items grow equally to fill the container (the `flex: 1` equivalent); `fill-ratio` (percent, default 100) distributes proportionally — settable per item, with the container-level `fill-ratio` as the default.

<DemoBlock title="fill — equal fill">
  <oas-flex fill gap="8px" style="width: 100%">
    <div class="demo-flex-fill-box">One</div>
    <div class="demo-flex-fill-box">Two</div>
    <div class="demo-flex-fill-box">Three</div>
  </oas-flex>
</DemoBlock>

<DemoBlock title="fill-ratio — proportional">
  <oas-flex fill gap="8px" style="width: 100%">
    <div class="demo-flex-fill-box">1</div>
    <div class="demo-flex-fill-box" fill-ratio="200">2 (200%)</div>
    <div class="demo-flex-fill-box">3</div>
  </oas-flex>
  <oas-flex fill fill-ratio="300" gap="8px" style="width: 100%; margin-top: 8px">
    <div class="demo-flex-fill-box">Container default 300%</div>
    <div class="demo-flex-fill-box">Also 300%</div>
  </oas-flex>
</DemoBlock>

> **About per-item `order`**: `oas-flex` has no child-item component carrier (children are arbitrary host elements), so per-item `order` has no reasonable API and is intentionally not provided in this version. It will be revisited if an item component (`oas-flex-item`) scenario emerges later.

## Responsive

`direction` and `gap` support breakpoint shorthand: a space-separated base value plus several `breakpoint:value` tokens (e.g. `direction="column md:row"`, `gap="8px md:16px"`). Below a breakpoint width the base value applies; from the breakpoint up (mobile-first `min-width`) the breakpoint value applies.

Breakpoints:

| Breakpoint | Width |
| --- | --- |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

<DemoBlock title="Responsive direction: stacked on narrow, row from md">
  <oas-flex direction="column md:row" gap="8px" style="width: 100%">
    <oas-button>Button 1</oas-button>
    <oas-button>Button 2</oas-button>
    <oas-button>Button 3</oas-button>
  </oas-flex>
</DemoBlock>

<DemoBlock title="Responsive gap: 8px base, 24px from md">
  <oas-flex gap="8px md:24px" wrap style="width: 100%">
    <oas-tag>1</oas-tag><oas-tag>2</oas-tag><oas-tag>3</oas-tag>
    <oas-tag>4</oas-tag><oas-tag>5</oas-tag><oas-tag>6</oas-tag>
  </oas-flex>
</DemoBlock>

> Narrow the browser window to watch direction switch from row back to column and the gap tighten.

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
  .demo-flex-fill-box {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    background: var(--oas-color-primary);
    color: var(--oas-color-primary-text);
    border-radius: var(--oas-radius-md);
    font-size: var(--oas-font-size-sm);
  }
</style>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Cross-axis alignment | `string` | `stretch` |
| `direction` | Main-axis direction; supports breakpoint shorthand: space-separated base value + several `breakpoint:value` tokens (e.g. `column md:row`). Breakpoints `sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px (mobile-first min-width); below a breakpoint the base value applies. Illegal breakpoint names/values fall back to the base value with a dev warning | `string` | `row` |
| `fill` | Make items grow equally to fill the container (the `flex: 1` equivalent) | `boolean` | — |
| `fill-ratio` | Distribution ratio for `fill` (percent, default 100): settable per item, container-level as the default | `string` | — |
| `gap` | Gap between items; supports breakpoint shorthand (e.g. `8px md:16px`, breakpoints as `direction`) | `string` | — |
| `justify` | Main-axis alignment: `start`/`center`/`end`/`between`/`around`/`evenly` (bidirectionally compatible with legacy `flex-*`/`space-*` values) | `string` | `start` |
| `vertical` | Vertical shorthand (= direction:column; takes precedence over direction) | `boolean` | — |
| `wrap` | Wrapping (boolean; present means `wrap`) | `boolean` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
