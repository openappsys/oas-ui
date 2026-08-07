# Tooltip 文字提示

简单的文字提示气泡。

## 基础用法

<div class="demo">
  <oas-tooltip content="这是一个提示" placement="top">
    <oas-button>悬停查看</oas-button>
  </oas-tooltip>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `content` | 提示内容 | — |
| `placement` | `top` / `bottom` / `left` / `right` | `top` |
| `open` | 受控显示 | `false` |

hover / focus 触发，`role="tooltip"`，空间不足自动翻转。
