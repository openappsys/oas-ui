# 集成 FAQ

来自真实项目集成的常见问题与陷阱。

## 组合模式（React 迁移视角）

### React 里的 asChild / Slot / Portal 在你们这有对应物吗？

React 生态的 asChild / Slot / Portal 解决的是「库强加的包装元素要消除、内容要挂到别处」这类组件组合问题；Web Components 的组件模型不同，这些前提要么不存在、要么已有等价方案：

- **换根元素（asChild / Slot 的包装消除）**——WC 组件自身（host）就是 DOM 里的真实元素，外部布局与选择器天然直接作用于它，不存在「库强加的 wrapper」问题。需要组件渲染成别的语义元素（如把按钮变成链接）时，走**属性驱动换根**：`href` 存在时按钮 / 标签内部渲染为原生 `<a>`，键盘与禁用语义由组件维护（见 oas-button / oas-tag 文档）。
- **让任意元素当触发器**（React 里常见的 `Trigger asChild` 组合）——对应**默认插槽 + 触发器属性**：浮层组件把默认插槽的首个子元素当作触发元素（可放任意元素 / 组件），`trigger` 属性选择触发方式（`click` / `hover` / `contextmenu` 等）；面板内容走 `content` 属性或命名插槽（`title` / `header` / `content` / `footer` 等）。事件绑定与 ARIA 连接由组件内部完成，宿主无需关心。
- **把内容挂到 body 等容器**（Portal / Teleport）——对应 **`append-to` 体系**：tooltip / popover / modal / drawer 等浮层组件的 `append-to="body"` 把浮层移入目标容器，样式作用域与 z-index 上下文不破，移除时归位、无孤儿节点。

一句话：Web Components 下的组合三件套是「**属性驱动根元素 + 命名插槽 + append-to**」，覆盖 React 的 asChild / Slot / Portal 场景，迁移时无需在组件上寻找同名 API。

### React / Vue 里属性名和 DOM 原生 property 撞名怎么办？

给 custom element 传属性时，若属性名命中元素上**已有的 DOM property**，宿主会按 **property 写入**（`el[name] = value`）而不是 `setAttribute`——React 19 如此，Vue 的**绑定**写法（`:name`）在 custom element 上也走同一判定（源码 `key in el`；`spellcheck` / `draggable` / `translate` / `autocorrect` 除外，恒走 attribute）。

OAS-UI 组的处理：

- **`prefix` / `suffix` / `blur`**：`prefix` 撞只读的 `Element.prefix`、`blur`（oas-backdrop）撞方法 `HTMLElement.blur()`；`suffix` 无 DOM 对应，为对称与 property 通道一并处理。相关组件（input / input-number / statistic / countdown / tree-select / backdrop / mentions）用属性访问器**遮蔽**这些名字并映射到规范属性 **`prefix-text` / `suffix-text` / `blur` / `trigger`**（mentions 的 `prefix` 是 `trigger` 的遗留别名）——因此它们在 **attribute 与 property 两条通道都可用**：React 写 `prefix="¥"` / `blur="blur(8px)"`、Vue 静态/绑定写法、纯 HTML 均正常。`prefix-text` / `suffix-text` 是规范名，`prefix` / `suffix` 为兼容别名；`blur` 被遮蔽后该元素的**原生 `blur()` 方法被属性访问器取代**（backdrop 无实际影响）。TypeScript 下 `blur` 仍按继承的方法类型（因方法类型无法声明合并），需要以 property 赋值时请改走 attribute 或 `setAttribute`。
- **其它可写撞名属性**（`title`、`dir`、`role`、`hidden`、`draggable`、`spellcheck`、`autofocus`、`id` 等）是**可写** DOM property，React / Vue 按 property 写入会正常反射成属性；需留意 `title` 会同时触发浏览器**原生 tooltip**。
- 若你自行封装**自定义**组件，避免使用与 `Element` / `HTMLElement` **只读属性或方法**同名的属性名（如 `prefix`、`blur`），或同样用访问器遮蔽。

## 事件

### 为什么事件都带 `oas-` 前缀？

组件派发的 `oas-` 事件在 core 层统一 `emit()` 时显式设置 `bubbles + composed`，会穿透 Shadow DOM 冒泡到 window（平台原生 `CustomEvent` 默认两者均为 `false`——穿透是本库显式约定，非平台默认）。无前缀的 `change` / `select` 会与原生事件（如文本选区 `select`）及宿主框架合成事件互相污染，排查困难。前缀让事件来源一目了然——**监听时写 `oas-change` 而不是 `change`**。

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

## 国际化（i18n）

### 翻译插值占位符怎么写？

`@oas-ui/i18n` 的翻译插值占位符是 **`{name}`**——单层花括号、**无前缀 `#`**。语言包模板里写 `{count}`，翻译时传 `t(key, { count })` 即完成替换，例如 `'pagination.total': '共 {total} 条'` + `t('pagination.total', { total: 42 })` → `共 42 条`。

> **`#{name}` 不是合法占位符**：`#` 不会被插值逻辑消费，`#{count}` 中的 `#` 会原样保留在输出文案里（替换后仍是 `#{42}`）。写语言包时不要沿用 `#{var}` 这类带 `#` 前缀的模板习惯。

### 自定义语言包/文案怎么注册？

`@oas-ui/i18n` 提供全局 locale registry：`registerLocale(locale)` 注册自定义语言包、`setLocale(name)` 全局切换；语言包结构对齐内置 `zh-CN`（key 全集类型化，缺 key 编译期报错）。`oas-config-provider` 支持就近注入（`locale` 属性），包裹内组件优先用注入的 locale 翻译内置文案，无需全局设置。

内置 10 种之外的新语言：以 `zh-CN` 语言包的消息为模板 → `...zhCN.messages` 全量继承后逐 key 替换 → 把 `messages` 标注为 `Locale`（类型护栏：缺 key 编译期报错）→ RTL 语言标 `dir: 'rtl'` → `registerLocale` 注册 → `setLocale` 切换。**完整 step-by-step 示例见 `@oas-ui/i18n` 包 README「自定义语言包」节**。自定义包的按需分包走宿主自己的动态 `import()`（`loadLocale()` 只认内置 10 种包名）。

### 内置支持哪些语言？可以按需加载吗？

内置 10 种：`zh-CN`（默认）、`en`、`ja`、`ko`、`de`、`fr`、`es`、`pt`、`ru`、`ar`（RTL）。主入口只带 `zh-CN`，其余**按需加载**，不会进首屏：

```ts
import { loadLocale, setLocale } from '@oas-ui/i18n'
await loadLocale('ja') // 动态 import('@oas-ui/i18n/ja')，独立 chunk
setLocale('ja')
```

也可静态按需引入（tree-shaking，只有用到的语言包进产物）：

```ts
import ja from '@oas-ui/i18n/ja'
setLocale(ja)
```

日期与数字格式化走原生 `Intl`（`Intl.DateTimeFormat` / `Intl.NumberFormat`），这些语言无需额外翻译即可正确显示；`first-day-of-week` 缺省值也按 locale 推导（欧陆/中文周一起始，日/韩/英/阿周日起始）。

### RTL 方向语言怎么处理？

`ar` 语言包标注 `dir: 'rtl'`，切到 `ar` 后浮层定位自动镜像（select / combobox / auto-complete / tree-select / date-picker / time-picker / mentions 等）；也可用 `oas-config-provider direction="rtl"` 显式或局部开启，组件按「config-provider > 祖先 `dir` > `document.dir` > 当前 locale」解析方向。

## 主题

### 切暗色后页面 body 还是白的？

body 不在组件 Shadow DOM 里，不会被自动染色。给 body 显式引用变量：

```css
body {
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
}
```
