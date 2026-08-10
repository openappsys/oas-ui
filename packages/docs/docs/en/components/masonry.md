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
| `columns` | Number of columns; invalid values (non-positive integers / decimals / 0 / negatives) fall back to 1 | — | — |
| `gap` | Column gap (px); invalid values fall back to the default | — | — |

### Slots

| Name | Description |
| --- | --- |
| default | Masonry child items; children automatically get `break-inside: avoid` |

Part: `::part(masonry)` the masonry container.
