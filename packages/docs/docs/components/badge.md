# Badge 徽标

数字/状态徽标，通常用于消息计数或新内容提示。

## 基础用法

<DemoBlock title="数字徽标">
  <oas-badge value="5">
    <oas-tag>通知</oas-tag>
  </oas-badge>
  <oas-badge value="88">
    <oas-tag>未读消息</oas-tag>
  </oas-badge>
</DemoBlock>

## 上限显示

超过 `max` 时显示 `max+`。

<DemoBlock title="上限显示">
  <oas-badge value="120" max="99">
    <oas-tag>评论</oas-tag>
  </oas-badge>
</DemoBlock>

## 小圆点

<DemoBlock title="状态点">
  <oas-badge dot>
    <oas-tag>在线状态</oas-tag>
  </oas-badge>
</DemoBlock>

## 零值

默认隐藏 0，设置 `showZero` 时显示。

<DemoBlock title="零值控制">
  <oas-badge value="0">
    <oas-tag>默认隐藏 0</oas-tag>
  </oas-badge>
  <oas-badge value="0" showZero>
    <oas-tag>显示 0</oas-tag>
  </oas-badge>
</DemoBlock>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 数字 | —（空则不显示） |
| `max` | 上限 | 无限制 |
| `dot` | 小圆点模式 | `false` |
| `showZero` | value=0 时是否显示 | `false` |
