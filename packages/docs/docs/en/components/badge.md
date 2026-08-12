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

## API

### Attributes

| Attribute  | Description                  | Type      | Default |
| ---------- | ---------------------------- | --------- | ------- |
| `dot`      | Dot mode                     | `boolean` | —       |
| `max`      | Upper limit                  | `string`  | —       |
| `showZero` | Whether to show when value=0 | `boolean` | —       |
| `value`    | Number                       | `string`  | —       |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |
