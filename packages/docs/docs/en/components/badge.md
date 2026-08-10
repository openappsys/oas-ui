# Badge

A numeric/status badge, typically used for message counts or new-content indicators.

## Basic usage

<DemoBlock title="Numeric badges">
  <oas-badge value="5">
    <oas-tag>通知</oas-tag>
  </oas-badge>
  <oas-badge value="88">
    <oas-tag>未读消息</oas-tag>
  </oas-badge>
</DemoBlock>

## Max display

When the value exceeds `max`, `max+` is displayed.

<DemoBlock title="Max display">
  <oas-badge value="120" max="99">
    <oas-tag>评论</oas-tag>
  </oas-badge>
</DemoBlock>

## Dot

<DemoBlock title="Status dot">
  <oas-badge dot>
    <oas-tag>在线状态</oas-tag>
  </oas-badge>
</DemoBlock>

## Zero value

`0` is hidden by default; shown when `showZero` is set.

<DemoBlock title="Zero value control">
  <oas-badge value="0">
    <oas-tag>默认隐藏 0</oas-tag>
  </oas-badge>
  <oas-badge value="0" showZero>
    <oas-tag>显示 0</oas-tag>
  </oas-badge>
</DemoBlock>

## API

| Prop | Description | Default |
| --- | --- | --- |
| `value` | Number | — (hidden when empty) |
| `max` | Upper limit | Unlimited |
| `dot` | Dot mode | `false` |
| `showZero` | Whether to show when value=0 | `false` |
