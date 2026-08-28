# Masonry

A masonry layout container based on CSS columns; child items are automatically distributed across columns without being split.

## Basic Usage

<DemoBlock title="Four-column masonry">
  <oas-masonry style="width: 100%">
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>Short card</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>This is taller content, showing how cards of different heights are staggered in a masonry layout; a few more lines are added to increase the height.</p><p>A second paragraph.</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>Medium height</p><p>Additional notes.</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>Another short card</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>A taller card with multiple lines of description and a list.</p><ul><li>Point 1</li><li>Point 2</li></ul></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>Normal card</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>An example in the last column.</p></oas-card>
  </oas-masonry>
</DemoBlock>

## Columns and Gap

<DemoBlock title="Three columns, larger gap">
  <oas-masonry columns="3" gap="16" style="width: 100%">
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>Item A</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>Item B; the masonry auto-fills when heights differ.</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>Item C</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>Item D</p></oas-card>
  </oas-masonry>
</DemoBlock>

## Responsive Columns

<DemoBlock title="1 column at base, 2 at md, 4 at lg">
  <oas-masonry columns="1 md:2 lg:4" style="width: 100%">
    <oas-card><p>Narrow the browser window to watch the column count switch between 1 → 2 → 4.</p></oas-card>
    <oas-card><p>Breakpoints: `sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px (mobile-first min-width); below a breakpoint the base value applies.</p></oas-card>
    <oas-card><p>A third card, demonstrating the multi-column distribution.</p></oas-card>
    <oas-card><p>A fourth card.</p></oas-card>
    <oas-card><p>A fifth card; children reflow automatically when the column count changes, no JS involved.</p></oas-card>
    <oas-card><p>A sixth card.</p></oas-card>
  </oas-masonry>
</DemoBlock>

## Row / Column Gap

<DemoBlock title="Row gap 12, column gap 24">
  <oas-masonry columns="3" gap="12 24" style="width: 100%">
    <oas-card><p>Row gap 12px (children's margin-bottom), column gap 24px (column-gap); two values separated by a space: `gap="row col"`.</p></oas-card>
    <oas-card><p>Item B.</p></oas-card>
    <oas-card><p>Item C.</p></oas-card>
    <oas-card><p>Item D.</p></oas-card>
    <oas-card><p>Item E.</p></oas-card>
  </oas-masonry>
</DemoBlock>

## fresh Continuous Reflow

<DemoBlock title="fresh: watch child size changes">
  <oas-masonry columns="3" fresh style="width: 100%">
    <oas-card><p>With `fresh`, the component keeps listening for child size changes (e.g. height changes when images arrive late) via ResizeObserver and triggers a recompute on each change.</p></oas-card>
    <oas-card><p>Item B.</p></oas-card>
    <oas-card><p>Item C, taller.</p><p>Additional notes.</p></oas-card>
    <oas-card><p>Item D.</p></oas-card>
    <oas-card><p>Item E.</p></oas-card>
  </oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Under the CSS columns implementation the browser already reflows children when their size changes; `fresh` guarantees an extra recompute opportunity (semantic alignment and a hook for a future JS-based layout).
  </p>
</DemoBlock>

## Pin Children to a Column

<DemoBlock title="Specify the target column of children">
  <oas-masonry columns="4" style="width: 100%">
    <oas-card column="2"><p>This card has `column="2"` and is reordered into column 2.</p></oas-card>
    <oas-card column="4"><p>This card has `column="4"` and is reordered into column 4.</p></oas-card>
    <oas-card><p>Normal card A, auto-filled.</p></oas-card>
    <oas-card><p>Normal card B.</p></oas-card>
    <oas-card><p>Normal card C.</p></oas-card>
    <oas-card><p>Normal card D.</p></oas-card>
    <oas-card><p>Normal card E.</p></oas-card>
  </oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    A child's `column` (1-based) pins it to a column; values beyond the current column count or non-numeric values are ignored (with a dev warning). When used with responsive columns, the reorder follows the currently effective column count.
  </p>
</DemoBlock>

## No Children

<DemoBlock title="Empty container">
  <oas-masonry style="width: 100%; min-height: 80px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    With no children it renders an empty container without errors.
  </p>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `columns` | Number of columns (default 4); supports breakpoint shorthand: a base value plus space-separated `breakpoint:value` pairs (e.g. `1 md:2 lg:4`; breakpoints `sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px, mobile-first min-width, base below breakpoints); invalid values (non-positive integers / decimals / 0 / negatives) fall back to 1 | — | — |
| `fresh` | Keep listening for child size changes via ResizeObserver and trigger a recompute; under the CSS columns implementation the browser already reflows automatically, so `fresh` is a semantic hook aligned with a future JS-based layout | `boolean` | — |
| `gap` | Spacing (px, default 8). A single value sets the column gap; two values `row col` (e.g. `8 16`) set the row gap on children's margin-bottom and the column gap; plain numbers get `px` appended; invalid values fall back to the default | — | — |

### Slots

| Name | Description |
| --- | --- |
| default | Masonry child items; children automatically get `break-inside: avoid`; children with a `column` attribute (1-based) are reordered into the target column |

### Child Attributes

| Child Attribute | Description |
| --- | --- |
| `column` | Pin a child to a column (1-based): under the CSS columns implementation the DOM is reordered to physically move the child into the target column; with responsive columns the reorder follows the currently effective column count. Invalid values (non-integers / ≤0 / beyond the current column count) are ignored with a dev warning |

Part: `::part(masonry)` the masonry container.
