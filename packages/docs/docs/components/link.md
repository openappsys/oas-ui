# Link 链接

原生 `<a>` 增强的文字链接。

## 类型

<DemoBlock title="链接类型">
  <oas-link href="#">默认链接</oas-link>
  <oas-link href="#" type="primary">主要链接</oas-link>
  <oas-link href="#" type="success">成功链接</oas-link>
  <oas-link href="#" type="warning">警告链接</oas-link>
  <oas-link href="#" type="danger">危险链接</oas-link>
  <oas-link href="#" type="info">信息链接</oas-link>
</DemoBlock>

## 颜色

`color` 支持 11 个预设色名（明暗主题自动适配）或任意 CSS 色值（直接生效，优先于 `type` 语义色）。承载文字的色值按原值渲染，请自行确保对比度达标（WCAG AA 4.5:1）。

<DemoBlock title="预设色板">
  <oas-link href="#" color="magenta">magenta</oas-link>
  <oas-link href="#" color="red">red</oas-link>
  <oas-link href="#" color="volcano">volcano</oas-link>
  <oas-link href="#" color="orange">orange</oas-link>
  <oas-link href="#" color="gold">gold</oas-link>
  <oas-link href="#" color="lime">lime</oas-link>
  <oas-link href="#" color="green">green</oas-link>
  <oas-link href="#" color="cyan">cyan</oas-link>
  <oas-link href="#" color="blue">blue</oas-link>
  <oas-link href="#" color="geekblue">geekblue</oas-link>
  <oas-link href="#" color="purple">purple</oas-link>
</DemoBlock>

<DemoBlock title="自定义色值（优先于 type）">
  <oas-link href="#" color="#0e7490">青碧色链接</oas-link>
  <oas-link href="#" type="primary" color="#6d28d9">覆盖 primary 为紫色</oas-link>
</DemoBlock>

## 下划线

`underline` 三态：`hover`（默认，悬停出现）/ `always`（常驻）/ `never`（无）。兼容写法：bare `underline` 或 `underline="true"` = always，`underline="false"` = never。

下划线偏移与颜色可走 CSS 变量定制：`--oas-link-underline-offset`（缺省 2px）、`--oas-link-underline-color`（缺省跟随文字色）。

<DemoBlock title="下划线三态">
  <oas-link href="#">hover（默认，悬停出现）</oas-link>
  <oas-link href="#" underline="always">always（常驻）</oas-link>
  <oas-link href="#" underline="never">never（无）</oas-link>
  <oas-link href="#" underline="always" style="--oas-link-underline-offset: 4px; --oas-link-underline-color: var(--oas-color-danger);">偏移 4px + 红色下划线</oas-link>
</DemoBlock>

## 图标

`icon` 属性放图标（图标名走注册表），`icon-position="start|end"` 控制前后：

<DemoBlock title="带图标链接">
  <oas-link href="#" icon="search">搜索文档</oas-link>
  <oas-link href="#" icon="arrow-right" icon-position="end">查看详情</oas-link>
</DemoBlock>

## 外链

`external` 自动补 `target="_blank"` + `rel="noopener noreferrer"` + 外链图标：

<DemoBlock title="外链">
  <oas-link href="https://example.com" external>外部文档</oas-link>
</DemoBlock>

## 禁用与新窗口

<DemoBlock title="禁用与 target">
  <oas-link href="#" disabled>禁用链接</oas-link>
  <oas-link href="https://example.com" target="_blank" type="primary">新窗口打开</oas-link>
</DemoBlock>

## 字号

`size` 三档：`small`（小字辅助链接）/ `medium`（默认）/ `large`（大字标题链接），字号走 `--oas-font-size-*` token。

<DemoBlock title="字号三档">
  <oas-link href="#" size="small">小字辅助链接</oas-link>
  <oas-link href="#">medium（默认）</oas-link>
  <oas-link href="#" size="large">大字标题链接</oas-link>
</DemoBlock>

## 下载

`download` 透传原生 `<a download>`：`download` 空值布尔时浏览器使用原链接文件名，带值时自定义文件名（与 `target="_blank"` 组合时浏览器会忽略 `download`）。

<DemoBlock title="下载链接">
  <oas-link href="/files/oas-ui-guide.pdf" download>下载指南（使用原文件名）</oas-link>
  <oas-link href="/files/oas-ui-guide.pdf" download="oas-guide.pdf" icon="download" icon-position="end">下载指南（自定义文件名）</oas-link>
</DemoBlock>

## 加载中

`loading` 进入加载态：转圈图标替换前置图标（无图标时自动补一个）、点击被拦截（不派发 `oas-click`、不跳转），适合点击后异步跳转/提交场景；`aria-busy` 同步标注。

<DemoBlock title="加载中">
  <oas-link href="#" loading>加载中（无图标自动补转圈）</oas-link>
  <oas-link href="#" icon="search" loading>搜索中（替换前置图标）</oas-link>
</DemoBlock>

## 事件

<DemoBlock title="点击事件">
  <oas-link href="#" type="primary" onoas-click="message.info('触发了 oas-click 事件')">点击链接</oas-link>
</DemoBlock>

点击派发 `oas-click` CustomEvent，`detail.originalEvent` 为原生 MouseEvent。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 颜色：支持 11 个预设名（映射 `--oas-preset-*-text` 达标 token）或任意 CSS 色值，覆盖 `type` 语义色 | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `download` | 链接透传 `download` 属性（原生 `<a download>` 文件下载） | `string` | — |
| `external` | 外部链接：自动补 `target="_blank"`、`rel="noopener noreferrer"` 与外链图标 | `boolean` | — |
| `href` | 链接地址 | `string` | — |
| `icon` | 图标名（复用 oas-icon 图标集），置于文字前或后（见 `icon-position`） | `string` | — |
| `icon-position` | 图标位置：`start`（默认，文字前）/ `end`（文字后）；仅 `external` 图标时缺省 `end` | — | — |
| `loading` | 加载态：转圈图标替换前置图标 + 禁点击（点击后异步跳转/提交场景） | `boolean` | — |
| `size` | 字号档：`small`/`medium`（默认）/`large` | `string` | — |
| `target` | 打开方式 | `string` | — |
| `type` | 类型 | `LinkType` | `default` |
| `underline` | 下划线 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击，`detail: { originalEvent }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
