# Space 间距

水平/垂直等距布局容器。

## 水平

<div class="demo">
  <oas-space>
    <oas-button>按钮</oas-button>
    <oas-button type="primary">按钮</oas-button>
    <oas-button type="danger">按钮</oas-button>
  </oas-space>
</div>

## 垂直

<div class="demo">
  <oas-space direction="vertical">
    <oas-tag>标签一</oas-tag>
    <oas-tag type="success">标签二</oas-tag>
    <oas-tag type="warning">标签三</oas-tag>
  </oas-space>
</div>

## 尺寸与换行

<div class="demo">
  <oas-space size="large" wrap>
    <oas-button>按钮 1</oas-button>
    <oas-button>按钮 2</oas-button>
    <oas-button>按钮 3</oas-button>
    <oas-button>按钮 4</oas-button>
    <oas-button>按钮 5</oas-button>
  </oas-space>
</div>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `direction` | 方向 | `horizontal` / `vertical` | `horizontal` |
| `size` | 间距 | `small` / `medium` / `large` / number | `medium` |
| `wrap` | 是否换行 | boolean | `false` |
| `align` | 对齐 | `start` / `center` / `end` / `baseline` / `stretch` | — |
