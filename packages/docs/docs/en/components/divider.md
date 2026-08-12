# Divider

A horizontal/vertical divider that separates content.

## Horizontal

<DemoBlock title="Basic divider">
  <oas-divider></oas-divider>
</DemoBlock>

## With content

<DemoBlock title="Content position">
  <oas-divider>Text</oas-divider>
  <oas-divider content-position="left">Left aligned</oas-divider>
  <oas-divider content-position="right">Right aligned</oas-divider>
</DemoBlock>

## Dashed

<DemoBlock title="Dashed">
  <oas-divider dashed></oas-divider>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical divider">
  <span>Text</span>
  <oas-divider direction="vertical"></oas-divider>
  <span>Text</span>
</DemoBlock>

## API

### Attributes

| Attribute          | Description      | Type               | Default      |
| ------------------ | ---------------- | ------------------ | ------------ |
| `content-position` | Content position | `DividerPosition`  | `center`     |
| `dashed`           | Dashed           | `boolean`          | —            |
| `direction`        | Direction        | `DividerDirection` | `horizontal` |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |
