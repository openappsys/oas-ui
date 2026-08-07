# Anchor 锚点

滚动定位导航，自动高亮当前章节。

## 基础用法

<div class="demo">
  <oas-anchor items='[{"href":"#section1","title":"第一节"},{"href":"#section2","title":"第二节"}]'></oas-anchor>
</div>

## API

| 属性 | 说明 |
|---|---|
| `items` | `[{ href, title }]` |
| `active` | 当前高亮锚点 |
| `offset` | 高亮判定偏移 |

| 事件 | 说明 |
|---|---|
| `oas-change` | 切换，`detail: { href }` |

基于 `IntersectionObserver` 的 scroll spy，`nav` + `aria-label="锚点导航"`。
