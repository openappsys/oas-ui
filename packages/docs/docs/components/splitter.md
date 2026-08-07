# Splitter 分割面板

## 基础用法

<div class="demo" style="height: 200px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
  <oas-splitter percent="50">
    <div slot="left">左面板</div>
  </oas-splitter>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `percent` | 左侧占比 % | `50` |
| `min` | 最小占比 | `10` |
| `max` | 最大占比 | `90` |

| 事件 | 说明 |
|---|---|
| `oas-resize` | 调整，`detail: { percent }` |

键盘：左右方向键 ±1，`role="separator"`。
