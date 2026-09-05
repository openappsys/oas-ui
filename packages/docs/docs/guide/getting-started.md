# 快速开始

## CDN 引入

**整包（最简单，注册全部组件）**：`cdn.js` 是打包好的 IIFE 单文件，`<script>` 直接引入即可：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn.js"></script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

**按族引入（体积与覆盖的折中）**：组件按功能分为 7 个族，每族一个独立 IIFE 文件（内置基座：运行时与 config-provider/app/theme-editor，无需额外引入）：

| 族包 | 覆盖组件 |
| --- | --- |
| `cdn/basic.js` | 基础：button、icon、tag、badge、space、divider、link、typography、button-group、label、kbd、visually-hidden |
| `cdn/layout.js` | 布局：layout、sidebar、container、grid、flex、splitter、scroll-area、masonry、aspect-ratio |
| `cdn/form.js` | 表单：input、textarea、checkbox、radio、switch、segmented、slider、input-number、rate、select、auto-complete、combobox、cascader、tree-select、mentions、date-picker、time-picker、calendar、upload、transfer、color-picker、toggle-button、toggle-group、pin-input、dynamic-input、dynamic-tags、editable、form 等 |
| `cdn/feedback.js` | 反馈与浮层：tooltip、popover、hover-card、message、notification、toast、snackbar、backdrop、modal、confirm、drawer、popconfirm、alert、progress、loading-bar、spin、skeleton、empty、result |
| `cdn/navigation.js` | 导航：menu、dropdown、contextmenu、command、menubar、navigation-menu、toolbar、breadcrumb、anchor、back-top、tour、tabs、bottom-navigation、pagination、steps、stepper、affix、page-header、float-button、speed-dial |
| `cdn/data.js` | 数据展示：table、tree、virtual-list、card、avatar、avatar-group、image、qrcode、watermark、collapse、descriptions、timeline、list、carousel、statistic、countdown、ellipsis、chart、code、equation、log、marquee、number-animation、gradient-text、comment 等 |
| `cdn/framework.js` | 框架级：config-provider、app、theme-editor |

只用基础族：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/basic.js"></script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

再加一个反馈族（表单 + 消息提示的组合页）：

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@2/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/basic.js"></script>
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/form.js"></script>
<script src="https://unpkg.com/@oas-ui/ui@2/dist/cdn/feedback.js"></script>
```

> **选型规则**：用到的组件 ≤ 2 个族时按族引族包（比全量小）；用到 ≥ 3 个族时直接引整包 `cdn.js` 更省——族包各自内联基座，多族叠加后基座重复成本超过全量单文件的优势。

**按需引入单个组件**：用 esm.sh 的短路径（自动解析依赖），只注册你用到的那一个：

```html
<script type="module">
  import 'https://esm.sh/@oas-ui/ui@2/basic/button'
</script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

多个组件逐个短路径即可——**只下载用到的组件及其依赖链**（如 button 链 ≈ 21KB gzip，含 core 运行时与图标集），未用到的组件零开销：

```html
<script type="module">
  import 'https://esm.sh/@oas-ui/ui@2/basic/button'
  import 'https://esm.sh/@oas-ui/ui@2/basic/tag'
</script>
```

> **CDN 路径入口说明**：组件目录下的 `oas-*.js` 是纯类定义（供打包器 tree-shaking），**不含注册副作用**；会执行 `customElements.define` 的是 `index.js`。CDN 直引请用上面的整包 `cdn.js` 或按需短路径（走 exports map 自动落到 `index.js`），**不要直引 `dist/basic/button/oas-button.js`**（import 成功但元素不注册、页面不渲染）。

## 安装（npm / pnpm / yarn）

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

## 引入

全量引入（自动注册全部组件）：

```ts
import '@oas-ui/theme'
import '@oas-ui/ui'
```

按需引入单个组件：

```ts
import '@oas-ui/theme'
import '@oas-ui/ui/basic/button'
```

React / Vue 中直接使用：

```tsx
// React
<oas-button type="primary" onOasClick={() => console.log('clicked')}>
  按钮
</oas-button>
```

```vue
<!-- Vue -->
<oas-button type="primary" @oas-click="onClick">按钮</oas-button>
```

原生三端（React/Vue/原生）均无需封装即可使用，事件通过 `oas-*` CustomEvent 桥接。

**能力子包（可选能力按需引入）**：少数组件的重型可选能力拆成了独立子包——按需引入组件时默认**不含**这些能力（对应配置静默失效并在 dev 下给出告警提示），用到哪个引哪个，import 即注册：

| 组件 | 能力 | 子路径 |
| ---- | ---- | ------ |
| `oas-table` | 行内编辑（`editable` / `editor` / `actions`） | `@oas-ui/ui/data/table/edit` |
| `oas-tabs` | 双击重命名 / 右键菜单 / 拖拽排序（`editable` / `context-menu` / `sortable`） | `@oas-ui/ui/navigation/tabs/manager` |
| `oas-modal` | 输入确认（`modal.prompt()`） | `@oas-ui/ui/feedback/modal/prompt` |
| `oas-popover` | 右键光标定位 / 触屏长按 / `placement`·`size` 断点简写 | `@oas-ui/ui/feedback/popover/contextmenu` |
| `oas-color-picker` | 2D 色域 / 渐变设计器（`mode="gradient"`） | `@oas-ui/ui/form/color-picker/designer` |

```ts
import '@oas-ui/ui/data/table'
import '@oas-ui/ui/data/table/edit' // 追加行内编辑能力
```

引入顺序随意：能力注册对**已挂载**的组件元素也会自动补齐。全量入口 `@oas-ui/ui` 与 CDN 族包已内含全部能力，无需额外引用。

> 想看实际效果？仓库里有搭配使用 React / Vue 的 [Playground](https://github.com/openappsys/oas-ui/tree/main/packages/playground)，`pnpm dev:react` / `pnpm dev:vue` 即可本地运行。

## 浏览器基线

现代浏览器 evergreen 版本：Chrome / Edge / Firefox / Safari 最新两个大版本。其中：

- **Chrome / Edge（Chromium）**：全量 e2e 覆盖
- **Firefox**：实测覆盖（slider 轨道等 Firefox 专有伪元素已适配）
- **Safari ≥ 16.4**：WebKit 引擎实测；Declarative Shadow DOM 需 16.4+，实心态用色（`color-mix`）需 16.2+

## 主题切换

```html
<html data-theme="dark">
  <!-- 切换为暗色主题 -->
</html>
```

三套内置主题：`light` / `dark` / `high-contrast`，自定义见[主题指南](./theming)。

> **自定义 CSS 不会自动跟主题**：组件内部变量会随 `data-theme` 切换，但你自己写的样式必须引用 `var(--oas-color-*)` 才会跟着变。最常见的坑是页面 body 没显式设底色，切暗色后组件全暗、页面仍是浏览器默认白底：

> ```css
> body {
>   background: var(--oas-color-bg);
>   color: var(--oas-color-text-primary);
> }
> ```

## 事件约定（重要）

**所有组件事件都带 `oas-` 前缀**：`oas-change`、`oas-select`、`oas-input`、`oas-close` 等（各组件 API 表的「事件」小节列出完整清单与触发时机）。这是刻意设计——Web Components 的事件默认会冒泡到 window，无前缀的 `change`/`select` 会与原生事件及宿主框架的合成事件互相污染；前缀让来源一目了然。

```ts
// 正确：oas- 前缀
menu.addEventListener('oas-select', (e) => console.log(e.detail))

// 错误：永远收不到（常见首坑）
menu.addEventListener('select', (e) => console.log(e.detail))
```

受控组件（switch / radio-group / checkbox-group / slider / input-number 等）在用户交互后会把最新值**写回宿主属性**（如 `value` / `checked`），`el.getAttribute('value')` 可直接读取，与 `oas-change` 事件的 `detail.value` 一致。

## SSR

服务端渲染环境请参考 [SSR 边界策略](./ssr)：组件库副作用导入只应在客户端执行。

更多集成常见问题（`::part()` 定制陷阱、事件触发时机等）见 [FAQ](./faq)。
