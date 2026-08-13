# Badge

A numeric/status badge, typically used for message counts or new-content indicators.

## Basic usage

<DemoBlock title="Numeric badges">
  <oas-badge value="5">
    <oas-tag>Notifications</oas-tag>
  </oas-badge>
  <oas-badge value="88">
    <oas-tag>Unread</oas-tag>
  </oas-badge>
</DemoBlock>

## Max display

When the value exceeds `max`, `max+` is displayed.

<DemoBlock title="Max display">
  <oas-badge value="120" max="99">
    <oas-tag>Comments</oas-tag>
  </oas-badge>
</DemoBlock>

## Dot

<DemoBlock title="Status dot">
  <oas-badge dot>
    <oas-tag>Online</oas-tag>
  </oas-badge>
</DemoBlock>

## Zero value

`0` is hidden by default; shown when `showZero` is set.

<DemoBlock title="Zero value control">
  <oas-badge value="0">
    <oas-tag>Hidden by default</oas-tag>
  </oas-badge>
  <oas-badge value="0" showZero>
    <oas-tag>Show 0</oas-tag>
  </oas-badge>
</DemoBlock>

## Ribbon corner

The `ribbon` boolean attribute (or `mode="ribbon"`) enables a ribbon corner — an angled folded ribbon on the top edge of the wrapped content (same style  Ribbon). Text is provided via the `text` attribute; it sits at the inline-end (`placement="end"`) by default and can be moved to `placement="start"`.

<DemoBlock title="Basic ribbon">
  <oas-badge ribbon text="HOT" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>Default ribbon (top-end)</p></oas-card>
  </oas-badge>
  <oas-badge mode="ribbon" text="LIMITED" placement="start">
    <oas-card><p>mode="ribbon" (top-start)</p></oas-card>
  </oas-badge>
</DemoBlock>

## Colored ribbon

`color` supports the four semantic colors `primary` / `success` / `warning` / `danger`, following the theme (light/dark).

<DemoBlock title="Colored ribbon">
  <oas-badge ribbon text="HOT" color="primary" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>primary</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="FREE" color="success" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>success</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="ENDING" color="warning" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>warning</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="SOLD OUT" color="danger">
    <oas-card><p>danger</p></oas-card>
  </oas-badge>
</DemoBlock>

## Custom ribbon content

Besides the `text` attribute, arbitrary content can be passed through `slot="ribbon"` (the slot takes precedence when present).

<DemoBlock title="Custom content">
  <oas-badge ribbon>
    <span slot="ribbon">New - 20% off</span>
    <oas-card><p>Custom content via slot="ribbon"</p></oas-card>
  </oas-badge>
</DemoBlock>

## Comparison with count / dot

The same `oas-badge` can serve as a count badge or a ribbon: the count badge is a small number pinned to the top-end corner, `dot` is a textless status point, while the ribbon spans the top edge of the wrapped content.

<DemoBlock title="count / dot / ribbon comparison">
  <oas-badge value="5" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>count numeric badge</p></oas-card>
  </oas-badge>
  <oas-badge dot style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>dot status point</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="NEW">
    <oas-card><p>ribbon</p></oas-card>
  </oas-badge>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | Ribbon semantic color: `primary` / `success` / `warning` / `danger` (default `danger`) | `BadgeColor` | `danger` |
| `dot` | Dot mode | `boolean` | — |
| `max` | Upper limit | `string` | — |
| `mode` | Mode: `count` (default, numeric/dot badge) or `ribbon` (ribbon corner, same as `ribbon` attribute) | `BadgeMode` | `count` |
| `placement` | Ribbon position: `start` (inline-start) / `end` (inline-end, default) | `BadgePlacement` | `end` |
| `ribbon` | Ribbon corner mode (boolean, same as `mode="ribbon"`) | `boolean` | — |
| `showZero` | Whether to show when value=0 | `boolean` | — |
| `text` | Ribbon text; the `ribbon` slot takes precedence when it has content | `string` | — |
| `value` | Number | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | Wrapped content (card, button, etc.) |
| `ribbon` | Custom ribbon content |
