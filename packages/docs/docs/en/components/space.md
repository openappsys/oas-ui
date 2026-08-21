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
  <oas-space size="xs" style="width: 100%;">
    <oas-tag>xs 4px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="small" style="width: 100%;">
    <oas-tag>small 8px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="medium" style="width: 100%;">
    <oas-tag>medium 12px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="large" style="width: 100%;">
    <oas-tag>large 24px</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space size="xl" style="width: 100%;">
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

`size` also accepts a comma-separated pair (e.g. `size="8,16"`): the first value is the horizontal spacing, the second is the vertical spacing, which takes effect when `wrap` wraps items onto new lines.

<DemoBlock title="size pair (horizontal / vertical)">
  <oas-space size="8,24" wrap>
    <oas-button>Button 1</oas-button>
    <oas-button>Button 2</oas-button>
    <oas-button>Button 3</oas-button>
    <oas-button>Button 4</oas-button>
    <oas-button>Button 5</oas-button>
    <oas-button>Button 6</oas-button>
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

## Separator

`separator` inserts a separator symbol between items (secondary text color); `slot="separator"` provides custom separator content that takes priority over the string (e.g. a vertical divider).

<DemoBlock title="String separator">
  <oas-space separator="|">
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space separator="·">
    <oas-button type="text">Edit</oas-button>
    <oas-button type="text">Copy</oas-button>
    <oas-button type="text">Delete</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Custom separator (slot=separator)">
  <oas-space>
    <oas-button type="text">Edit</oas-button>
    <oas-divider direction="vertical" slot="separator"></oas-divider>
    <oas-button type="text">Copy</oas-button>
    <oas-divider direction="vertical" slot="separator"></oas-divider>
    <oas-button type="text">Delete</oas-button>
  </oas-space>
</DemoBlock>

## Distribution

`justify` controls main-axis distribution: `start` / `center` / `end` / `space-between` / `space-around` / `space-evenly`; when unset items keep their default start position.

<DemoBlock title="justify distribution">
  <oas-space justify="space-between" style="width: 100%">
    <oas-tag>space-between</oas-tag>
    <oas-tag>flush both ends</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space justify="center" style="width: 100%">
    <oas-tag>center</oas-tag>
    <oas-tag>centered</oas-tag>
  </oas-space>
  <oas-space justify="space-around" style="width: 100%">
    <oas-tag>space-around</oas-tag>
    <oas-tag>equal sides</oas-tag>
    <oas-tag>Tag</oas-tag>
  </oas-space>
  <oas-space justify="end" style="width: 100%">
    <oas-tag>end</oas-tag>
    <oas-tag>flush right</oas-tag>
  </oas-space>
</DemoBlock>

## Reverse order

`reverse` flips the main axis: horizontal → `row-reverse` (right to left), vertical → `column-reverse` (bottom to top).

<DemoBlock title="reverse">
  <oas-space reverse>
    <oas-button>One</oas-button>
    <oas-button>Two</oas-button>
    <oas-button>Three</oas-button>
  </oas-space>
  <oas-space direction="vertical" reverse>
    <oas-tag>Tag 1</oas-tag>
    <oas-tag>Tag 2</oas-tag>
    <oas-tag>Tag 3</oas-tag>
  </oas-space>
</DemoBlock>

## Fill items

`fill` makes items grow equally to fill the container (the `flex: 1` equivalent); `fill-ratio` (percent, default 100) distributes space proportionally — items can set it individually, and the container-level `fill-ratio` acts as the default.

<DemoBlock title="fill">
  <oas-space fill style="width: 100%">
    <oas-button>One</oas-button>
    <oas-button>Two</oas-button>
    <oas-button>Three</oas-button>
  </oas-space>
  <oas-space fill style="width: 100%">
    <oas-button>One</oas-button>
    <oas-button fill-ratio="200">Two (200%)</oas-button>
    <oas-button>Three</oas-button>
  </oas-space>
</DemoBlock>

## Spring spacer

`oas-space` is itself a flex container, so placing an empty element with `style="flex: 1"` between items acts as a spring (spacer): it absorbs the remaining space and pushes the following items to the other end — e.g. a "title on the left + action group on the right" page header or toolbar, with no new attribute needed. To make all items stretch proportionally instead, use `fill` / `fill-ratio` (see "Fill items").

<DemoBlock title="Spring spacer">
  <oas-space style="width: 100%">
    <oas-button type="text">Page title</oas-button>
    <div style="flex: 1"></div>
    <oas-button>Settings</oas-button>
    <oas-button type="primary">Save</oas-button>
  </oas-space>
  <oas-space style="width: 100%">
    <oas-tag>In progress</oas-tag>
    <div style="flex: 1"></div>
    <oas-button type="text">More</oas-button>
    <oas-button type="primary">Submit</oas-button>
  </oas-space>
</DemoBlock>

## Inline embedding

`oas-space` is a block-level flex container by default; to embed it inside a paragraph of text, add `style="display: inline-flex"` on the host — inline display is a host CSS concern, not a component attribute.

<DemoBlock title="Inline in a paragraph">
  <p>
    A paragraph with
    <oas-space style="display: inline-flex" size="small">
      <oas-tag>Tag 1</oas-tag>
      <oas-tag type="success">Tag 2</oas-tag>
    </oas-space>
    tags on the same line, evenly spaced.
  </p>
</DemoBlock>

## Responsive

`direction` and `size` support a breakpoint shorthand: a space-separated base value plus any number of `breakpoint:value` pairs (e.g. `direction="column md:row"`, `size="small md:large"`). Below the breakpoint width the base value applies; once the width reaches a breakpoint (mobile-first `min-width`) the breakpoint value kicks in.

Breakpoint table:

| Breakpoint | Width |
| --- | --- |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

<DemoBlock title="Responsive direction: column on narrow, row from md">
  <oas-space direction="column md:row" style="width: 100%">
    <oas-button>Button 1</oas-button>
    <oas-button>Button 2</oas-button>
    <oas-button>Button 3</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Responsive size: small, then large from md">
  <oas-space size="small md:large" wrap>
    <oas-button>Button 1</oas-button>
    <oas-button>Button 2</oas-button>
    <oas-button>Button 3</oas-button>
    <oas-button>Button 4</oas-button>
    <oas-button>Button 5</oas-button>
  </oas-space>
</DemoBlock>

## Compact group (oas-compact)

`oas-compact` merges adjacent form controls (`oas-button` / `oas-input` / `oas-input-number` / `oas-select`): adjacent edges overlap by -1px to share borders, first/last items keep rounded corners while middle ones are squared; supports `vertical` (vertical grouping), `disabled` (disable the whole group) and `block` (width 100%).

<DemoBlock title="input + button">
  <oas-compact aria-label="Search group">
    <oas-input value="oas-ui" placeholder="Enter a keyword"></oas-input>
    <oas-button type="primary">Search</oas-button>
  </oas-compact>
</DemoBlock>

<DemoBlock title="select + button">
  <oas-compact>
    <oas-select value="all" options='[{"label":"All","value":"all"},{"label":"Active","value":"active"},{"label":"Done","value":"done"}]'></oas-select>
    <oas-button type="primary">Filter</oas-button>
  </oas-compact>
</DemoBlock>

<DemoBlock title="Vertical group">
  <oas-compact vertical>
    <oas-button>Top</oas-button>
    <oas-button>Middle</oas-button>
    <oas-button type="primary">Bottom</oas-button>
  </oas-compact>
</DemoBlock>

<DemoBlock title="block & disabled">
  <oas-compact block>
    <oas-input placeholder="Subscribe email"></oas-input>
    <oas-button type="primary">Subscribe</oas-button>
  </oas-compact>
  <oas-compact disabled>
    <oas-input placeholder="Whole group disabled"></oas-input>
    <oas-button type="primary">Button</oas-button>
  </oas-compact>
</DemoBlock>

## API

### oas-space

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Alignment | `string` | — |
| `direction` | Direction; supports breakpoint shorthand: a space-separated base value plus any `breakpoint:value` pairs (e.g. `column md:row`), breakpoints `sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px (mobile-first min-width), base value applies below the breakpoint | `SpaceDirection` | `horizontal` |
| `fill` | Make items grow equally to fill the container (the `flex: 1` equivalent) | `boolean` | — |
| `fill-ratio` | Ratio for `fill` distribution (percent, default 100): items can set it individually, container-level acts as default | `string` | — |
| `justify` | Main-axis distribution: `start` / `center` / `end` / `space-between` / `space-around` / `space-evenly` (unset by default) | `string` | — |
| `reverse` | Reverse the main axis: horizontal → `row-reverse`, vertical → `column-reverse` | `boolean` | — |
| `separator` | Separator string between items (secondary text color); `slot="separator"` custom content takes priority | `string` | — |
| `size` | Spacing: `xs` (4px) / `small` (8px) / `medium` (12px, default) / `large` (24px) / `xl` (32px), or a numeric pixel value; a comma-separated pair (e.g. `8,16`) controls horizontal/vertical spacing separately; supports breakpoint shorthand (e.g. `small md:large`, breakpoints as in `direction`); invalid values fall back to `medium` with a warning | `string` | `medium` |
| `wrap` | Whether to wrap | `boolean` | — |

| Name | Description |
| --- | --- |
| default | Items |
| `separator` | Custom separator content (e.g. `<oas-divider direction="vertical">`), takes priority over the `separator` string |

### oas-compact

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | — | `boolean` | — |
| `block` | Width 100% (stretch to fill the parent container) | — | — |
| `disabled` | Disable the whole group | `boolean` | — |
| `vertical` | Vertical grouping (adjacent items overlap -1px vertically, corner merging switches to top/bottom) | `boolean` | — |

| Name | Description |
| --- | --- |
| default | Adjacent form controls (`oas-button` / `oas-input` / `oas-input-number` / `oas-select`) |
