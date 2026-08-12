# Space 间距

水平/垂直等距布局容器。

## 水平

<DemoBlock title="水平间距">
  <oas-space>
    <oas-button>按钮</oas-button>
    <oas-button type="primary">按钮</oas-button>
    <oas-button type="danger">按钮</oas-button>
  </oas-space>
</DemoBlock>

## 垂直

<DemoBlock title="垂直间距">
  <oas-space direction="vertical">
    <oas-tag>标签一</oas-tag>
    <oas-tag type="success">标签二</oas-tag>
    <oas-tag type="warning">标签三</oas-tag>
  </oas-space>
</DemoBlock>

## 尺寸与换行

`size` 支持 `xs`（4px）/ `small`（8px）/ `medium`（12px，默认）/ `large`（24px）/ `xl`（32px）五档，或直接写数字像素；非法值回落 `medium` 并提示告警。

<DemoBlock title="五种间距">
  <oas-space size="xs">
    <oas-tag>xs 4px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="small">
    <oas-tag>small 8px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="medium">
    <oas-tag>medium 12px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="large">
    <oas-tag>large 24px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
  <oas-space size="xl">
    <oas-tag>xl 32px</oas-tag>
    <oas-tag>标签</oas-tag>
    <oas-tag>标签</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="大间距与换行">
  <oas-space size="large" wrap>
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
    <oas-button>按钮 4</oas-button>
    <oas-button>按钮 5</oas-button>
  </oas-space>
</DemoBlock>

## 对齐

<DemoBlock title="交叉轴对齐">
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 对齐 | `string` | — |
| `direction` | 方向 | `SpaceDirection` | `horizontal` |
| `size` | 间距：`xs`（4px）/ `small`（8px）/ `medium`（12px，默认）/ `large`（24px）/ `xl`（32px），或数字像素；非法值回落 `medium` 并告警 | `string` | `medium` |
| `wrap` | 是否换行 | `boolean` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
