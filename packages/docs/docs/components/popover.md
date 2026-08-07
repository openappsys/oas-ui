# Popover 气泡卡片

可承载标题与内容的浮层面板。

## 基础用法

<div class="demo">
  <oas-popover title="卡片标题" content="这里是内容区域" placement="bottom">
    <oas-button>点击打开</oas-button>
  </oas-popover>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `title` | 标题 | — |
| `content` | 内容文本 | — |
| `placement` | `top` / `bottom` / `left` / `right` | `top` |
| `open` | 受控显示 | `false` |

click 触发，外部点击 / Esc 关闭，`role="dialog"`。
