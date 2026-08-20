# 集成 FAQ

来自真实项目集成的常见问题与陷阱。

## 事件

### 为什么事件都带 `oas-` 前缀？

Web Components 的 CustomEvent 默认 `bubbles + composed`，会穿透 Shadow DOM 冒泡到 window。无前缀的 `change` / `select` 会与原生事件（如文本选区 `select`）及宿主框架合成事件互相污染，排查困难。前缀让事件来源一目了然——**监听时写 `oas-change` 而不是 `change`**。

各组件派发的事件名与触发时机见组件文档的「事件」小节。

### `oas-input` 与 `oas-change` 的区别？

与原生语义一致：`oas-input` 在连续交互过程中派发（如滑块拖动中每帧），`oas-change` 在提交时派发（松手 / Enter / 失焦）。自动保存等低频场景监听 `oas-change`，避免拖动每像素触发一次。

### 受控状态怎么读？

受控组件（switch / radio-group / checkbox-group / slider / input-number 等）交互后会把最新值**写回宿主属性**：`el.getAttribute('value')` / `el.hasAttribute('checked')` 直接可读，与事件 `detail` 一致，无需自己缓存。

## 样式定制

### `::part()` 后面不能接属性选择器

CSS 规范限制：`::part()` 伪元素后**只能接伪类**（`:hover` / `:focus` 等），不能接属性选择器。写 `::part(item)[aria-expanded='true']` 会导致**整条规则被浏览器静默丢弃**——包括同规则里逗号分隔的其他合法选择器，且无任何报错。

```css
/* 正确 */
#menu::part(item):hover {
  /* ... */
}

/* 错误：整条规则失效（含逗号分隔的兄弟选择器一起被丢） */
#menu::part(item):hover,
#menu::part(item)[aria-expanded='true'] {
  /* ... */
}
```

按属性区分状态的替代方案：组件一般会把状态同步为 CSS class 或暴露对应 `::part()`，优先用这些；实在没有再在 JS 里操作 `shadowRoot`。

### `::part()` 无法穿透到 shadow 内部后代

`::part()` 只能选中组件显式暴露的 part 元素，**不能再选它的后代**（`::part(item) .check` 不生效）。要定制内部结构，找组件暴露的更深层 part，或用 CSS 自定义属性穿透（组件文档的「样式定制」小节列出可用变量）。

### 自定义 CSS 怎么跟随明暗主题？

引用主题变量即可：`background: var(--oas-color-bg)`、`color: var(--oas-color-text-primary)`。切换 `data-theme` 时组件库变量自动换值，你的样式引用了变量就自动跟随。变量清单见[设计 Token](./tokens)。

## 主题

### 切暗色后页面 body 还是白的？

body 不在组件 Shadow DOM 里，不会被自动染色。给 body 显式引用变量：

```css
body {
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
}
```
