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

`disabled` 禁用按钮；`loading` 进入加载态——原文字保留占位（宽度不变）、spinner 居中显示，配 `loading-text` 可显示加载文案。

<DemoBlock title="禁用与加载态">
  <oas-button disabled>禁用</oas-button>
  <oas-button type="primary" loading loading-text="加载中…">加载</oas-button>
  <oas-button type="success" loading loading-text="提交中…">提交</oas-button>
</DemoBlock>

### 异步自动加载

`loading="auto"` 时，`oas-click` 宿主处理返回 Promise 期间自动进入加载态，Promise resolve/reject 后自动退出。

<DemoBlock title="异步提交自动 loading">
  <oas-button type="primary" loading="auto" loading-text="提交中…" onoas-click="new Promise((r) => setTimeout(() => { message.success('提交完成'); r() }, 1500))">点击异步提交</oas-button>
  <oas-button type="success" loading="auto" onoas-click="new Promise((r) => setTimeout(() => { message.success('保存成功'); r() }, 1200))">异步保存</oas-button>
</DemoBlock>

### 禁用但可聚焦

`disabled-focusable` 呈现禁用外观（降饱和 + `aria-disabled`），但不设原生 `disabled`——仍可聚焦、可 hover，适合挂在 tooltip 上解释禁用原因；点击被组件拦截，不派发 `oas-click`。

<DemoBlock title="禁用但可聚焦（配 tooltip 解释）">
  <oas-tooltip content="需要先登录后才能执行此操作">
    <oas-button type="primary" disabled-focusable>登录后可操作</oas-button>
  </oas-tooltip>
  <oas-tooltip content="当前没有可下载的文件">
    <oas-button icon="download" disabled-focusable>下载报表</oas-button>
  </oas-tooltip>
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

## 双侧图标

`icon` 渲染文字前图标，`icon-end` 在文字后渲染第二个图标（均复用 oas-icon 图标集），两者可与 `icon-position` 并存。

<DemoBlock title="双侧图标">
  <oas-button type="primary" icon="download" icon-end="arrow-right">下载并继续</oas-button>
  <oas-button icon="user" icon-end="chevron-right">下一步</oas-button>
  <oas-button type="success" icon="check-circle" icon-end="arrow-right">确认并提交</oas-button>
</DemoBlock>

## 副文本（compound 双行变体）

`slot="description"` 副文本行存在时按钮切纵向双行布局：主行（图标+文字）在上、副文本在下（小号次要色）。适合卡片入口、设置项入口、上传入口等「主操作 + 一行说明」场景。与 loading / icon / disabled / href 等既有契约全兼容。

<DemoBlock title="双行按钮">
  <oas-space size="small">
    <oas-button type="primary" icon="upload">上传文件<span slot="description">支持拖拽，单文件不超过 500KB</span></oas-button>
    <oas-button icon="setting">偏好设置<span slot="description">快捷键 ⌘ + ,</span></oas-button>
    <oas-button size="large" type="primary" loading loading-text="提交中">提交订单<span slot="description">预计 3 秒完成</span></oas-button>
  </oas-space>
</DemoBlock>

## 链接按钮

设置 `href` 后渲染为原生链接（`<a>`），支持 `target` 指定打开方式（`_blank` / `_self` 等）；同时透传 `download`（文件下载）与 `rel`（链接关系）属性。

<DemoBlock title="链接按钮">
  <oas-button href="#">默认链接</oas-button>
  <oas-button href="#" target="_blank" type="primary">新窗口打开</oas-button>
</DemoBlock>

<DemoBlock title="下载与 rel">
  <oas-button href="/files/report.zip" download="季度报表.zip" type="primary">下载季度报表</oas-button>
  <oas-button href="https://example.com" target="_blank" rel="noopener">外链（rel=noopener）</oas-button>
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

配色优先级：`--oas-button-bg`（宿主注入 CSS 变量，可放渐变）> `color` 属性 > `type` 语义色 > 默认灰底。`outlined` / `filled` / `dashed` / `text` 形态下 `color` 染边框/文字/浅底；实心形态的文字色按底色亮度自动取黑/白（暗色主题同样可读）。

自定义色值按原值渲染（不自动改写），请自行确保文字与底色对比度达标（WCAG AA 4.5:1）。

<DemoBlock title="自定义颜色">
  <oas-button color="#7c3aed">紫色实底</oas-button>
  <oas-button color="#047857" variant="outlined">绿色描边</oas-button>
  <oas-button color="#be185d" variant="filled">粉色浅底</oas-button>
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

## 移动端触控

触屏设备（`pointer: coarse`）下按钮最小高度自动抬升至 44px（`--oas-touch-target-min`）：默认 32px、xs 20px 等小尺寸档在触屏上变为 44px 高，已 ≥44px 的档（如 xl）不变；`icon-only` / `circle` 经 `aspect-ratio` 同步变为 44×44 命中。只抬高度，padding、字号、圆角均不动；桌面（fine pointer）零影响。

## 原生表单提交

`html-type` 指定原生表单行为：`button`（默认，无表单行为）/ `submit`（提交）/ `reset`（重置）。Shadow DOM 内的按钮不参与原生表单提交，组件自动桥接：点击时对目标表单（所在 `<form>`，或 `form` 属性指向的表单 id）触发原生提交/重置；`formaction` / `formmethod` / `formnovalidate` / `formtarget` 经原生 submitter 机制生效（覆盖表单自身的 action / method / novalidate / target）。`disabled` / `loading` 态不触发提交；`href` 链接模式下这组属性静默无效。

> 桥接机制说明（边界两条）：① 桥接靠点击期临时注入的原生代理 submitter——表单 `submit` 事件的 `submitter` 是该代理而非 `oas-button`（代理带 `data-oas-form-proxy` 可辨识）；监听表单区域 click 委托的宿主会同时看到宿主的合成 click 与代理的原生 click 两次冒泡。② `html-type="submit"` 在 `oas-form` 内无效：`oas-form` 的真 `<form>` 在 shadow 内，light DOM 代理找不到祖先表单——`oas-form` 场景请用 `oas-form` 的 `submit()` 方法 / `oas-submit` 事件。

<DemoBlock title="原生表单提交（html-type / form 属性组）">
  <form id="btn-native-form" style="display: flex; flex-wrap: wrap; gap: var(--oas-space-3); align-items: flex-end">
    <oas-input name="username" label="用户名" value="OAS-UI"></oas-input>
    <oas-input name="email" label="邮箱" value="hello@example.com"></oas-input>
    <oas-space>
      <oas-button html-type="submit" type="primary">提交</oas-button>
      <oas-button html-type="submit" formtarget="_blank">新窗提交（formtarget）</oas-button>
      <oas-button html-type="reset">重置</oas-button>
      <oas-button html-type="submit" formnovalidate formaction="/search" formmethod="post">免校验提交（formaction/formmethod）</oas-button>
    </oas-space>
  </form>
  <div id="btn-form-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2); min-height: 20px"></div>
</DemoBlock>

点击「提交」按钮：表单触发原生 `submit`（demo 中已 `preventDefault` 并显示将提交的字段）；「重置」恢复输入初始值并触发 `reset`；「免校验提交」演示 `formnovalidate` 跳过必填校验 + `formaction`/`formmethod` 覆盖提交目标。

## 自定义加载图标

`slot="loading-icon"` 自定义加载态图标：插槽有内容时替换内置 spinner 环（定位沿用原 spinner，加载态宽度稳定等行为不变）；缺省回落内置 spinner。常配合 `oas-icon spin` 做主题化加载图标。

<DemoBlock title="loading-icon 自定义加载图标">
  <oas-button loading type="primary" style="margin-inline-end: var(--oas-space-4)">
    <oas-icon slot="loading-icon" name="loading" spin></oas-icon>
    图标加载中
  </oas-button>
  <oas-button loading style="margin-inline-end: var(--oas-space-4)">
    <span slot="loading-icon" style="font-size: 0.9em">⟳</span>
    字符加载中
  </oas-button>
  <oas-button loading type="danger">
    内置 spinner（缺省）
  </oas-button>
</DemoBlock>

## API

### oas-button

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-insert-space` | 中文间自动空格：两个连续汉字间插入空格（排版优化，默认关） | `string` | — |
| `autofocus` | 自动聚焦：挂载后聚焦内部按钮（原生 autofocus 不穿透 Shadow DOM，组件转发） | `boolean` | — |
| `block` | 占满父容器宽度（块级） | `boolean` | — |
| `circle` | 圆形按钮（纯图标场景，正方形 + 正圆角） | `boolean` | — |
| `color` | 自定义颜色：覆盖 `type` 语义色（任意色值），优先级高于 `type` | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `disabled-focusable` | 视觉禁用但保持可聚焦/可悬停（aria-disabled + 拦截点击），用于挂 tooltip 解释禁用原因 | `boolean` | — |
| `download` | 链接模式（href）透传 `download` 属性（文件下载按钮） | `string` | — |
| `form` | 关联表单 id：按钮在表单外时指向目标表单（原生 form 关联机制） | `string` | — |
| `formaction` | 本次提交的目标 URL（覆盖表单 action） | `string` | — |
| `formmethod` | 本次提交的 HTTP 方法（get/post/dialog，覆盖表单 method） | `string` | — |
| `formnovalidate` | 本次提交跳过原生校验（仅本次，不等价表单 novalidate） | `boolean` | — |
| `formtarget` | 本次提交响应的展示目标（_blank/_self 等，覆盖表单 target） | `string` | — |
| `ghost` | 幽灵/描边形态，透明底 + 按 `type` 着色描边，hover 加深 | `boolean` | — |
| `href` | 链接地址：设置后渲染为原生链接 `<a>` | `string` | — |
| `html-type` | 原生表单行为：`button`（默认，无行为）/ `submit` 提交所在或 `form` 指向的表单 / `reset` 重置（shadow 内按钮经代理桥接原生激活行为） | `string` | `button` |
| `icon` | 图标名（复用 oas-icon 图标集）；无文字时等宽、以图标名兜底名称 | `string` | — |
| `icon-end` | 文字后的第二个图标（iconRegistry 图标名），与 `icon`/`icon-position` 并存——「左图标+右下拉箭头」等双侧内容形态 | `string` | — |
| `icon-position` | 图标位置：`start`（默认，图标在左）/ `end`（图标在右） | `string` | `start` |
| `loading` | 加载态 | — | — |
| `loading-text` | 加载态显示的文本（如「提交中…」），设置后 loading 时替换标签内容 | `string` | — |
| `plain` | 朴素形态：低对比浅色（透明底 + 弱化描边文字），等价 `variant="filled"` | `boolean` | — |
| `rel` | 链接模式（href）透传 `rel` 属性（`target="_blank"` 时配 `noopener` 安全） | `string` | — |
| `round` | 胶囊圆角（`--oas-radius-full` / `999px`） | `boolean` | — |
| `size` | 尺寸：`xs` / `small` / `medium`（默认）/ `large` / `xl`；非法值回落 `medium` 并告警 | `ButtonSize` | `medium` |
| `target` | 链接打开方式（`_blank` / `_self` 等），配合 `href` | `string` | — |
| `type` | 类型 | `ButtonType` | `default` |
| `variant` | 形态（与 `type` 正交）：`solid`（默认实底）/ `outlined`（描边）/ `dashed`（虚线描边）/ `filled`（浅底）/ `text`（纯文字）/ `link`（链接样式） | `ButtonVariant \| ''` | — |
| `wave` | 按下反馈：轻微下沉 + 加深（默认开）；`wave="false"` 关闭 | `string` | `true` |
| `wrap` | 长文换行：默认单行不换行（nowrap）；开启后受限宽内容换行、高度随内容增长 | `boolean` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击，`detail: { originalEvent }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 按钮内容（文本 / 图标） |
| `description` | 副文本行（compound 双行变体）：有内容时按钮切纵向双行布局（主行在上、副文本在下，字号小号次要色） |
| `loading-icon` | 自定义加载态图标（有内容时替换内置 spinner 环，缺省回落内置） |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-button-bg` | — | `var(--oas-color-primary)` |
| `--oas-button-color` | — | `var(--oas-color-text-primary)` |
| `--oas-button-color-deep` | 自定义色（`color`）的文字安全档：hover/active 及 outlined/dashed/filled 文字的加深混合色（组件按 `--oas-deep-mix` / `--oas-deep-sink` 注入；无自定义色时不生效） | `var(--btn-color, var(--oas-color-text-primary))` |
| `--oas-button-group-radius` | — | `var(--oas-radius-md)` |
| `--oas-button-group-width` | — | `auto` |
| `--oas-button-on-color` | — | `var(--oas-color-text-on-primary)` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const form = document.getElementById('btn-native-form')
  const out = document.getElementById('btn-form-out')
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const entries = [...new FormData(form).entries()].map(([k, v]) => `${k}=${v}`).join(' & ')
    out.textContent = `submit（demo 已拦截，未导航）: ${entries || '（空表单）'}`
  })
  form?.addEventListener('reset', () => {
    out.textContent = 'reset：输入已恢复初始值'
  })
})
</script>
