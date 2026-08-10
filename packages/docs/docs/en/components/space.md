# Space

A layout container with even horizontal/vertical spacing.

## Horizontal

<DemoBlock title="Horizontal spacing">
  <oas-space>
    <oas-button>按钮</oas-button>
    <oas-button type="primary">按钮</oas-button>
    <oas-button type="danger">按钮</oas-button>
  </oas-space>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical spacing">
  <oas-space direction="vertical">
    <oas-tag>标签一</oas-tag>
    <oas-tag type="success">标签二</oas-tag>
    <oas-tag type="warning">标签三</oas-tag>
  </oas-space>
</DemoBlock>

## Size & wrapping

<DemoBlock title="Large spacing & wrapping">
  <oas-space size="large" wrap>
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
    <oas-button>按钮 4</oas-button>
    <oas-button>按钮 5</oas-button>
  </oas-space>
</DemoBlock>

## Alignment

<DemoBlock title="Cross-axis alignment">
  <oas-space align="start">
    <oas-tag>start</oas-tag>
    <oas-button type="primary">按钮</oas-button>
  </oas-space>
  <oas-space align="center">
    <oas-tag>center</oas-tag>
    <oas-button type="primary">按钮</oas-button>
  </oas-space>
</DemoBlock>

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `direction` | Direction | `horizontal` / `vertical` | `horizontal` |
| `size` | Spacing | `small` / `medium` / `large` / number | `medium` |
| `wrap` | Whether to wrap | boolean | `false` |
| `align` | Alignment | `start` / `center` / `end` / `baseline` / `stretch` | — |
