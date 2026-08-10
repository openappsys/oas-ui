# Divider

A horizontal/vertical divider that separates content.

## Horizontal

<DemoBlock title="Basic divider">
  <oas-divider></oas-divider>
</DemoBlock>

## With content

<DemoBlock title="Content position">
  <oas-divider>文字</oas-divider>
  <oas-divider content-position="left">左对齐</oas-divider>
  <oas-divider content-position="right">右对齐</oas-divider>
</DemoBlock>

## Dashed

<DemoBlock title="Dashed">
  <oas-divider dashed></oas-divider>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical divider">
  <span>文本</span>
  <oas-divider direction="vertical"></oas-divider>
  <span>文本</span>
</DemoBlock>

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `direction` | Direction | `horizontal` / `vertical` | `horizontal` |
| `dashed` | Dashed | boolean | `false` |
| `content-position` | Content position | `left` / `center` / `right` | `center` |
