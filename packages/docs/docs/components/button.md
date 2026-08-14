# Button 按钮

基础按钮组件，原生 `<button>` 增强。

## 类型

<DemoBlock title="按钮类型">
  <oas-button>默认按钮</oas-button>
  <oas-button type="primary">主要按钮</oas-button>
  <oas-button type="success">成功按钮</oas-button>
  <oas-button type="warning">警告按钮</oas-button>
  <oas-button type="danger">危险按钮</oas-button>
  <oas-button type="text">文字按钮</oas-button>
</DemoBlock>

## 尺寸

<DemoBlock title="五种尺寸">
  <oas-button size="xs">超小</oas-button>
  <oas-button size="small">小按钮</oas-button>
  <oas-button size="medium">中按钮</oas-button>
  <oas-button size="large">大按钮</oas-button>
  <oas-button size="xl">超大</oas-button>
</DemoBlock>

`size` 支持 `xs` / `small` / `medium`（默认）/ `large` / `xl` 五档；非法值回落 `medium` 并提示告警。

<DemoBlock title="五种尺寸 · 主要按钮">
  <oas-button type="primary" size="xs">超小</oas-button>
  <oas-button type="primary" size="small">小按钮</oas-button>
  <oas-button type="primary" size="medium">中按钮</oas-button>
  <oas-button type="primary" size="large">大按钮</oas-button>
  <oas-button type="primary" size="xl">超大</oas-button>
</DemoBlock>

<DemoBlock title="五种尺寸 · 图标按钮">
  <oas-button icon="search" size="xs" aria-label="搜索"></oas-button>
  <oas-button icon="search" size="small" aria-label="搜索"></oas-button>
  <oas-button icon="search" size="medium" aria-label="搜索"></oas-button>
  <oas-button icon="search" size="large" aria-label="搜索"></oas-button>
  <oas-button icon="search" size="xl" aria-label="搜索"></oas-button>
</DemoBlock>

## 禁用与加载

<DemoBlock title="禁用与加载态">
  <oas-button disabled>禁用</oas-button>
  <oas-button type="primary" loading>加载中</oas-button>
  <oas-button type="success" loading>提交中</oas-button>
</DemoBlock>

## 事件

<DemoBlock title="点击事件">
  <oas-button type="primary" onoas-click="message.info('触发了 oas-click 事件')">点击我</oas-button>
</DemoBlock>

点击派发 `oas-click` CustomEvent（bubbles + composed），`detail.originalEvent` 为原生 MouseEvent。

## 图标按钮

`icon` 在文字前渲染图标（复用 oas-icon 图标集，`IconName`），图标与文字间距走 `--oas-space-2`。

<DemoBlock title="图标 + 文字">
  <oas-button type="primary" icon="search">搜索</oas-button>
  <oas-button type="success" icon="download">下载</oas-button>
  <oas-button type="danger" icon="trash">删除</oas-button>
  <oas-button icon="plus">新建</oas-button>
</DemoBlock>

无文字时按钮自动等宽正方形，需 `aria-label` 提供可访问名称；未显式设置时兜底取图标名（如 `icon="close"` → `aria-label="close"`），建议显式提供中文名称。

<DemoBlock title="纯图标按钮">
  <oas-button type="primary" icon="check" aria-label="确认"></oas-button>
  <oas-button icon="search" aria-label="搜索"></oas-button>
  <oas-button type="danger" icon="trash" aria-label="删除"></oas-button>
  <oas-button icon="heart" aria-label="收藏"></oas-button>
</DemoBlock>

## 块级

`block` 使按钮占满父容器宽度。

<DemoBlock title="块级按钮">
  <oas-button block type="primary">块级按钮</oas-button>
  <oas-button block type="success" icon="download">下载</oas-button>
</DemoBlock>

## 圆角

`round` 使用胶囊圆角（`--oas-radius-full`，无该 token 时回退 `999px`）。

<DemoBlock title="圆角按钮">
  <oas-button round type="primary" icon="check">完成</oas-button>
  <oas-button round icon="search" aria-label="搜索"></oas-button>
  <oas-button round type="danger">取消订阅</oas-button>
</DemoBlock>

## 幽灵

`ghost` 为透明底 + 描边形态，描边与文字按 `type` 着色，hover 加深。

<DemoBlock title="幽灵按钮">
  <oas-button ghost>默认幽灵</oas-button>
  <oas-button ghost type="primary">主要幽灵</oas-button>
  <oas-button ghost type="success">成功幽灵</oas-button>
  <oas-button ghost type="warning">警告幽灵</oas-button>
  <oas-button ghost type="danger" icon="trash">危险幽灵</oas-button>
</DemoBlock>

## 圆形

`circle` 将按钮变为圆形，纯图标按钮等宽圆角合并为整圆。

<DemoBlock title="圆形按钮">
  <oas-button circle icon="search" aria-label="搜索"></oas-button>
  <oas-button circle type="primary" icon="check" aria-label="确认"></oas-button>
  <oas-button circle type="danger" icon="trash" aria-label="删除"></oas-button>
</DemoBlock>

## 图标位置

`icon-position` 控制图标与文字的相对位置：`start`（默认，图标在左）或 `end`（图标在右）。

<DemoBlock title="图标在右">
  <oas-button icon-position="end" type="primary" icon="download">下载</oas-button>
  <oas-button icon-position="end" icon="chevron-right">下一步</oas-button>
</DemoBlock>

## 链接按钮

设置 `href` 后渲染为原生链接（`<a>`），支持 `target` 指定打开方式（`_blank` / `_self` 等）。

<DemoBlock title="链接按钮">
  <oas-button href="#">默认链接</oas-button>
  <oas-button href="#" target="_blank" type="primary">新窗口打开</oas-button>
</DemoBlock>

## 朴素

`plain` 为低对比浅色形态（透明底 + 弱化描边与文字），在浅色背景上更柔和。

<DemoBlock title="朴素按钮">
  <oas-button plain>朴素按钮</oas-button>
  <oas-button plain type="primary">主要朴素</oas-button>
  <oas-button plain type="danger">危险朴素</oas-button>
</DemoBlock>

## 形态（variant）

`variant` 控制按钮形态，与 `type` 语义色正交：`solid`（默认实底）/ `outlined`（描边）/ `dashed`（虚线描边）/ `filled`（浅底）/ `text`（纯文字）/ `link`（链接样式）。旧属性 `ghost` 等价 `outlined`、`plain` 等价 `filled`。

<DemoBlock title="描边 / 虚线 / 浅底">
  <oas-button variant="outlined" type="primary">描边</oas-button>
  <oas-button variant="dashed" type="primary">虚线描边</oas-button>
  <oas-button variant="filled" type="primary">浅底</oas-button>
  <oas-button variant="outlined">默认描边</oas-button>
  <oas-button variant="dashed">默认虚线</oas-button>
</DemoBlock>

<DemoBlock title="文字 / 链接">
  <oas-button variant="text">文字按钮</oas-button>
  <oas-button variant="text" type="primary">主色文字</oas-button>
  <oas-button variant="link" href="#">链接按钮</oas-button>
</DemoBlock>

## 自定义颜色

`color` 覆盖 `type` 语义色（任意色值），优先级高于 `type`。

<DemoBlock title="自定义颜色">
  <oas-button color="#7c3aed">紫色实底</oas-button>
  <oas-button color="#0e9f6e" variant="outlined">绿色描边</oas-button>
  <oas-button color="#db2777" variant="filled">粉色浅底</oas-button>
</DemoBlock>

## 按下反馈

`wave` 开启按下反馈（轻微下沉 + 加深，默认开）；`wave="false"` 关闭。

<DemoBlock title="按下反馈">
  <oas-button type="primary">按下试试（默认开）</oas-button>
  <oas-button wave="false">关闭反馈</oas-button>
</DemoBlock>

## 中文间空格

`auto-insert-space` 在两个连续汉字间自动插入空格（中文排版优化，默认关）。

<DemoBlock title="中文间自动空格">
  <oas-button auto-insert-space>保存设置</oas-button>
  <oas-button auto-insert-space type="primary">确认提交订单</oas-button>
</DemoBlock>

## 自动聚焦

`autofocus` 让按钮在页面加载后自动获得焦点（原生 `autofocus` 不穿透 Shadow DOM，组件挂载后转发聚焦到内部按钮）。

<DemoBlock title="autofocus 自动聚焦">
  <oas-button autofocus type="primary">加载后自动聚焦</oas-button>
  <oas-button>普通按钮</oas-button>
</DemoBlock>

## 长内容换行

按钮默认单行不换行（`white-space: nowrap`）；显式加 `wrap` 后，受限宽（父容器或 `width` / `max-width`）的长文本换行显示、高度随内容增长（单行时与默认等高）。

<DemoBlock title="wrap 长内容换行">
  <oas-button wrap style="width: 120px;">这是一段会自动换行的长按钮文本</oas-button>
  <oas-button wrap type="primary" style="max-width: 160px;">窄容器里的主按钮长文本自动换行显示</oas-button>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-insert-space` | 中文间自动空格：两个连续汉字间插入空格（排版优化，默认关） | `string` | — |
| `autofocus` | 自动聚焦：挂载后聚焦内部按钮（原生 autofocus 不穿透 Shadow DOM，组件转发） | `boolean` | — |
| `block` | 占满父容器宽度（块级） | `boolean` | — |
| `circle` | 圆形按钮（纯图标场景，正方形 + 正圆角） | `boolean` | — |
| `color` | 自定义颜色：覆盖 `type` 语义色（任意色值），优先级高于 `type` | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `ghost` | 幽灵/描边形态，透明底 + 按 `type` 着色描边，hover 加深 | `boolean` | — |
| `href` | 链接地址：设置后渲染为原生链接 `<a>` | `string` | — |
| `icon` | 图标名（复用 oas-icon 图标集）；无文字时等宽、以图标名兜底名称 | `string` | — |
| `icon-position` | 图标位置：`start`（默认，图标在左）/ `end`（图标在右） | `string` | `start` |
| `loading` | 加载态 | `boolean` | — |
| `plain` | 朴素形态：低对比浅色（透明底 + 弱化描边文字），等价 `variant="filled"` | `boolean` | — |
| `round` | 胶囊圆角（`--oas-radius-full` / `999px`） | `boolean` | — |
| `size` | 尺寸：`xs` / `small` / `medium`（默认）/ `large` / `xl`；非法值回落 `medium` 并告警 | `ButtonSize` | `medium` |
| `target` | 链接打开方式（`_blank` / `_self` 等），配合 `href` | `string` | — |
| `type` | 类型 | `ButtonType` | `default` |
| `variant` | 形态（与 `type` 正交）：`solid`（默认实底）/ `outlined`（描边）/ `dashed`（虚线描边）/ `filled`（浅底）/ `text`（纯文字）/ `link`（链接样式） | `ButtonVariant \| ''` | — |
| `wave` | 按下反馈：轻微下沉 + 加深（默认开）；`wave="false"` 关闭 | `string` | `true` |
| `wrap` | 长文换行：默认单行不换行（nowrap）；开启后受限宽内容换行、高度随内容增长 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击，`detail: { originalEvent }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
