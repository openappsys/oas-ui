# Breadcrumb 面包屑

展示页面层级路径。末项为当前页（`aria-current="page"`）。

## 基础用法

<DemoBlock title="基础用法">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 项图标

`items` 项的 `icon` 字段传入图标名（与 `oas-icon` 同源注册表），在文本前渲染前置图标。

<DemoBlock title="项图标">
  <oas-breadcrumb items='[{"label":"首页","href":"/","icon":"star"},{"label":"组件","href":"/components","icon":"gear"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 自定义分隔符

`separator` 支持任意文本；值匹配图标注册表名时渲染为图标分隔符（如 `chevron-right`）。

<DemoBlock title="文本分隔符">
  <oas-breadcrumb separator="›" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

<DemoBlock title="图标分隔符">
  <oas-breadcrumb separator="chevron-right" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 项级分隔符

`items` 项的 `separator` 字段可单独覆盖该项之后的分隔符（同样支持图标名）。

<DemoBlock title="项级分隔符">
  <oas-breadcrumb separator="›" items='[{"label":"首页","href":"/","separator":"heart"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 真实链接

有 `href` 的项渲染为原生 `<a>` 链接：点击不阻止默认行为（浏览器原生跳转），同时照常派发 `oas-select`（SPA 宿主可拦截做路由）。`target` 支持新窗口打开，`_blank` 自动补 `noopener noreferrer`。

<DemoBlock title="真实链接">
  <oas-breadcrumb id="bc-real" onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"/"},{"label":"新窗口打开","href":"/components","target":"_blank"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-tag id="bc-real-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## 点击事件

`oas-select` 事件：`detail: { value: href }`。本示例用 `href="#"` 占位，点击可见反馈且页面不跳转。

<DemoBlock title="点击事件">
  <oas-breadcrumb onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"#"},{"label":"组件","href":"#"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-tag id="bc-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## 禁用项

`items` 项的 `disabled: true` 渲染为非交互文本（`aria-disabled="true"`），点击不派发事件。

<DemoBlock title="禁用项">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"已下线","href":"/gone","disabled":true},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 折叠模式

`collapsed` + `max-items`：items 数量超过 `max-items`（默认 `4`）时，中间项折叠为 `…`，点击 `…` 展开下拉查看全部折叠项。

<DemoBlock title="折叠模式">
  <oas-breadcrumb id="bc-collapsed" collapsed max-items="4" onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"数据展示","href":"/components/table"},{"label":"设置","href":"/components/settings"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-tag id="bc-collapsed-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## 折叠保留数

`items-before-collapse` / `items-after-collapse` 控制折叠省略号前后各保留几项（默认前 `1`、后 `max-items - 2`）。

<DemoBlock title="折叠保留数">
  <oas-breadcrumb collapsed max-items="4" items-before-collapse="2" items-after-collapse="1" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"数据展示","href":"/components/table"},{"label":"反馈","href":"/components/alert"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 自定义省略号

`collapse-text` 替换折叠省略号的默认 `…` 文本。

<DemoBlock title="自定义省略号">
  <oas-breadcrumb collapsed max-items="4" collapse-text="展开" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"数据展示","href":"/components/table"},{"label":"反馈","href":"/components/alert"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 单行省略

`ellipsis`：面包屑不换行，容器过窄时链接文本以省略号截断，链接保留全文 `title`（悬停可见完整名称）。

<DemoBlock title="单行省略">
  <div style="max-width: 260px; overflow: hidden; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px 12px">
    <oas-breadcrumb id="bc-ellipsis" ellipsis items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"数据展示","href":"/components/table"},{"label":"这是一个比较长的面包屑项标题名称","href":"/components/long-title"}]'></oas-breadcrumb>
  </div>
</DemoBlock>

## 单项宽度截断

`max-item-width`（px）按全局对单项截断，超出省略号 + `title` 悬停全文；项的 `maxWidth` 字段可逐项覆盖。

<DemoBlock title="单项宽度截断">
  <oas-breadcrumb max-item-width="140" items='[{"label":"首页","href":"/"},{"label":"一个特别长的组件名称用于演示全局截断效果","href":"/components/long"},{"label":"自定义宽度","href":"/components/custom","maxWidth":80},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 尺寸

`size` 档位：`small` / `medium`（默认）/ `large`。

<DemoBlock title="尺寸">
  <oas-breadcrumb size="small" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-breadcrumb size="medium" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-breadcrumb size="large" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 项带下拉菜单

`items` 项的 `dropdown` 数组把该项渲染为下拉触发器（点击展开子项菜单，菜单项点击派发 `oas-select`）。

<DemoBlock title="项带下拉菜单">
  <oas-breadcrumb onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"/"},{"label":"更多","dropdown":[{"label":"组件总览","href":"/components"},{"label":"导航组件","href":"/components/anchor"},{"label":"已下线","href":"/gone","disabled":true}]},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-tag id="bc-dropdown-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## 末项可点击 / 当前项语义

- `items` 项的 `active: true` 显式标记当前项（`aria-current="page"` 迁移到该项），其余带 `href` 项照常可点。
- `active-last`：末项（当前页）即使带 `href` 也保持可点击，同时保留 `aria-current="page"`。

<DemoBlock title="active 显式标记">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components","active":true},{"label":"导航","href":"/components/anchor"}]'></oas-breadcrumb>
</DemoBlock>

<DemoBlock title="末项可点击（active-last）">
  <oas-breadcrumb active-last onoas-select="breadcrumbLog(event)" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"当前页","href":"/components/breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-active-last-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## 键盘方向键导航

聚焦任一链接或省略号按钮后，`←` / `→` 在项之间循环移动焦点，`Home` / `End` 跳到首尾。下拉触发器 `Esc` 收起菜单。

<DemoBlock title="键盘导航">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"导航","href":"/components/anchor"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 颜色变体

`color` 指定当前项与链接 hover 的语义色（`primary` / `success` / `warning` / `danger` / `info`），颜色走 token（含 dark 变体）。

<DemoBlock title="颜色变体">
  <oas-breadcrumb color="primary" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-breadcrumb color="danger" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
  <oas-breadcrumb color="success" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 下划线变体

`variant="underline"`：链接与当前项常驻下划线。

<DemoBlock title="下划线变体">
  <oas-breadcrumb variant="underline" items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
</DemoBlock>

## 结构化数据

组件自动向宿主注入 schema.org BreadcrumbList JSON-LD（`<script type="application/ld+json">`，仅含带 `href` 的项），供搜索引擎识别面包屑导航，无需手写微数据。

<DemoBlock title="结构化数据">
  <oas-breadcrumb items='[{"label":"首页","href":"/"},{"label":"组件","href":"/components"},{"label":"面包屑"}]'></oas-breadcrumb>
  <p style="font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">
    查看页面源码：宿主内已有 <code>script[data-oas-breadcrumb-ld]</code>。
  </p>
</DemoBlock>

## 边界

<DemoBlock title="空数据">
  <oas-breadcrumb></oas-breadcrumb>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.breadcrumbLog = (e) => {
    for (const id of ['bc-result', 'bc-collapsed-result', 'bc-dropdown-result', 'bc-active-last-result', 'bc-real-result']) {
      const tag = document.getElementById(id)
      if (tag) tag.textContent = `已点击：${e.detail.value}`
    }
  }
})
</script>

## 字号定制

字号默认跟随外层 `font-size`（继承），可用 CSS 变量 `--oas-breadcrumb-font` 显式定制（如 `18px`）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active-last` | 末项保持可点击：当前页（末项）带 `href` 时渲染为链接（仍带 `aria-current="page"`） | `boolean` | — |
| `collapse-text` | 自定义折叠省略号的文本（默认 `…`） | `string` | `…` |
| `collapsed` | 折叠模式：items 数量超过 `max-items` 时中间项折叠为 `…`，点击展开下拉 | `boolean` | — |
| `color` | 视觉变体：当前项与链接 hover 使用指定语义色（`primary`/`success`/`warning`/`danger`/`info`） | `string` | — |
| `ellipsis` | 单行省略：面包屑不换行，超宽时链接文本以省略号截断 | `boolean` | — |
| `items` | 面包屑项 JSON：`label`/`href`/`icon`/`disabled`/`target`/`separator`/`dropdown`/`maxWidth`/`active` | `string` | `[]` |
| `items-after-collapse` | 折叠省略号之后保留的项数（默认 `max-items - 2`） | `string` | — |
| `items-before-collapse` | 折叠省略号之前保留的项数（默认 `1`） | `string` | — |
| `max-item-width` | 全局单项最大宽度（px）：超出省略号截断 + `title` 悬停提示；项级 `maxWidth` 可覆盖 | `string` | — |
| `max-items` | 折叠模式下最多可见的项数（含 `…`），非法值回退 `4` | `string` | `4` |
| `separator` | 分隔符（支持图标名，如 `chevron-right`） | `string` | `/` |
| `size` | 尺寸档位：`small`/`medium`（默认）/`large` | `string` | `medium` |
| `variant` | 样式变体：`underline`（链接与当前项常驻下划线） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-select` | 点击链接项、折叠下拉项或项下拉菜单项；`detail: { value: href }`（真实链接不阻止默认跳转，宿主可拦截做路由） |

`nav` + `aria-label="面包屑"`，末项 `aria-current="page"` 且不可点击。
