# HoverCard 悬停卡片

悬停或聚焦显示预览卡片，带延迟控制。

## 基础用法

<div class="demo">
  <oas-hover-card title="用户信息" content="悬停查看详情" placement="bottom">
    <oas-button>悬停查看</oas-button>
  </oas-hover-card>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `title` | 标题 | — |
| `content` | 内容 | — |
| `placement` | 方向 | `top` |
| `delay` | 显隐延迟 ms | `100` |
| `open` | 受控显示 | `false` |

hover / focus 触发，`role="dialog"`。
