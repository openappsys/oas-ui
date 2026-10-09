# Typography 排版

文本、标题、段落排版组件。

## Text 文本

<DemoBlock title="文本类型">
  <oas-text>默认文本</oas-text>
  <oas-text type="secondary">次要文本</oas-text>
  <oas-text type="success">成功文本</oas-text>
  <oas-text type="warning">警告文本</oas-text>
  <oas-text type="danger">危险文本</oas-text>
  <oas-text type="disabled">禁用文本</oas-text>
</DemoBlock>

<DemoBlock title="修饰样式">
  <oas-text strong>加粗</oas-text>
  <oas-text mark>标记</oas-text>
  <oas-text code>代码</oas-text>
  <oas-text underline>下划线</oas-text>
  <oas-text delete>删除线</oas-text>
  <oas-text italic>斜体</oas-text>
</DemoBlock>

<DemoBlock title="自定义标记色（mark + CSS 变量）">
  <oas-text mark>默认标记色</oas-text>
  <br />
  <oas-text mark style="--oas-text-mark-bg: #7c3aed">自定义标记色（--oas-text-mark-bg）</oas-text>
</DemoBlock>

<DemoBlock title="字重档（weight）">
  <oas-text weight="regular">regular 常规</oas-text>
  <oas-text weight="medium">medium 中等</oas-text>
  <oas-text weight="semibold">semibold 半粗</oas-text>
  <oas-text weight="bold">bold 粗体</oas-text>
  <br />
  <oas-text strong>strong（等价 semibold 字重）</oas-text>
</DemoBlock>

<DemoBlock title="数字等宽（numeric）">
  <div style="display: flex; flex-direction: column; gap: 4px;">
    <oas-text>默认数字：1 2 3 4 5 6 7 8 9 0</oas-text>
    <oas-text numeric>tabular-nums：1 2 3 4 5 6 7 8 9 0</oas-text>
  </div>
  <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
    <oas-text>默认：12,345.67</oas-text>
    <oas-text numeric>等宽：12,345.67</oas-text>
    <oas-text numeric>等宽：1,234.56</oas-text>
  </div>
</DemoBlock>

<DemoBlock title="文本对齐（align）">
  <div style="max-width: 360px; display: flex; flex-direction: column; gap: 4px;">
    <oas-text align="start">start：左对齐（默认起点）</oas-text>
    <oas-text align="center">center：居中对齐（标题居中高频场景）</oas-text>
    <oas-text align="end">end：右对齐</oas-text>
    <oas-paragraph align="justify">justify：两端对齐，适用于段落排版，通过拉伸词间距让左右边缘对齐。</oas-paragraph>
  </div>
</DemoBlock>

<DemoBlock title="文字深度（depth）">
  <oas-text depth="1">一档弱化（说明文字）</oas-text>
  <oas-text depth="2">二档弱化（次要说明）</oas-text>
  <oas-text depth="3">三档弱化（最次要）</oas-text>
</DemoBlock>

<DemoBlock title="换标签（tag）">
  <div style="display: flex; gap: 8px; align-items: baseline;">
    <oas-text tag="sub">下标</oas-text>
    <oas-text tag="sup">上标</oas-text>
    <oas-text tag="ins">插入</oas-text>
    <oas-text tag="mark">标记</oas-text>
    <oas-text tag="b">粗体标签</oas-text>
  </div>
</DemoBlock>

## 省略

<DemoBlock title="文本省略">
  <div style="max-width: 320px">
    <oas-text ellipsis>这是一段很长的文本，超出宽度后将以省略号截断显示，不再换行。</oas-text>
  </div>
</DemoBlock>

<DemoBlock title="多行省略（line-clamp）">
  <div style="max-width: 320px">
    <oas-text line-clamp="2">这是一段更长的文本，line-clamp 属性限制最多显示两行，超出后以省略号截断。多行省略不需要测量，纯 CSS 实现，适合卡片摘要、列表简介等轻截断场景。</oas-text>
  </div>
</DemoBlock>

<DemoBlock title="省略保留后缀（ellipsis-suffix）">
  <div style="max-width: 320px">
    <oas-text ellipsis ellipsis-suffix="--William Shakespeare">To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune</oas-text>
  </div>
</DemoBlock>

## 可复制

<DemoBlock title="可复制文本">
  <oas-text copyable>可复制的文本内容</oas-text>
</DemoBlock>

<DemoBlock title="自定义复制内容（copy-text）">
  <oas-text copyable copy-text="npm i @oas-ui/ui">安装命令：点复制按钮复制 `npm i @oas-ui/ui`</oas-text>
</DemoBlock>

## 操作条（actions）

<DemoBlock title="操作条位置">
  <oas-text copyable actions-position="end">复制按钮在文本后（默认）</oas-text>
  <br />
  <oas-text copyable actions-position="start">复制按钮在文本前</oas-text>
  <br />
  <oas-text>
    自定义操作内容
    <button slot="actions" onclick="alert('自定义操作')">自定义</button>
  </oas-text>
</DemoBlock>

## 字号档位（size）

`size` 提供三档字号：`small`（小字辅助）/ `medium`（基准，缺省回落继承字号）/ `large`（大字强调），映射 `--oas-font-size-*` token；`sm`/`lg` 别名等价，非法值回落 `medium`。仅 `oas-text` 开放（标题字号由 `level` 驱动，避免双轨打架）。

<DemoBlock title="size 字号档">
  <div style="display: flex; flex-direction: column; align-items: flex-start; gap: var(--oas-space-2)">
    <oas-text size="small">small 小字辅助</oas-text>
    <oas-text>medium 基准（缺省继承）</oas-text>
    <oas-text size="large">large 大字强调</oas-text>
  </div>
</DemoBlock>

## Title 标题

<DemoBlock title="标题级别">
  <div style="flex-direction: column; align-items: flex-start; display: flex">
    <oas-title level="1">标题一</oas-title>
    <oas-title level="2">标题二</oas-title>
    <oas-title level="3">标题三</oas-title>
  </div>
</DemoBlock>

## Paragraph 段落

<DemoBlock title="段落">
  <div style="flex-direction: column; align-items: flex-start; display: flex">
    <oas-paragraph>段落文本一</oas-paragraph>
    <oas-paragraph type="secondary">段落文本二</oas-paragraph>
  </div>
</DemoBlock>

## 内容块排版（blockquote / 列表 / 表格）

`tag` 白名单覆盖内容块级形态，三件（text/title/paragraph）通用——不引入独立长文容器，直接在现有 `tag` 体系上扩展：

- `tag="blockquote"`：引用块（起始侧 token 边条 + 逻辑缩进，RTL 随书写方向镜像）；
- `tag="ul"` / `tag="ol"`：列表块（归一缩进，li 间距内建；li 内容放默认插槽）；
- `tag="table"`：内容表（全宽 + 合并边框；th/td 单元细节建议宿主自理或改用 `oas-table` 功能表）；
- 表格部件（`thead`/`tbody`/`tr`/`th`/`td`/`caption`）与描述列表（`dl`/`dt`/`dd`）同在白名单，可按需换标签。

列表/表格块采用解包投影：默认插槽直接挂在根元素上（`ul` 的子元素只能是 `li`、`table` 只收表格部件——content span 包装在这些标签下非法）。

<DemoBlock title="引用块（tag=blockquote）">
  <div style="width: 100%">
    <oas-paragraph tag="blockquote">设计不是把东西加上去，而是再也拿不走任何东西。</oas-paragraph>
    <oas-paragraph tag="blockquote" type="secondary">简洁是终极的复杂。—— 用于帮助文档、说明文字的引用排版。</oas-paragraph>
  </div>
</DemoBlock>

<DemoBlock title="列表块（tag=ul / tag=ol）">
  <div style="display: flex; gap: 32px; flex-wrap: wrap">
    <oas-text tag="ul" style="min-width: 200px">
      <li>安装核心包与图标集</li>
      <li>入口注册组件族</li>
      <li>按需引入单个组件</li>
    </oas-text>
    <oas-text tag="ol" style="min-width: 200px">
      <li>阅读设计规范</li>
      <li>挑选组件组合页面</li>
      <li>接入主题 token</li>
    </oas-text>
  </div>
</DemoBlock>

<DemoBlock title="内容表（tag=table）">
  <div style="width: 100%">
    <oas-text tag="table">
      <thead>
        <tr><th>组件</th><th>类别</th><th>状态</th></tr>
      </thead>
      <tbody>
        <tr><td>oas-collapse</td><td>数据展示</td><td>稳定</td></tr>
        <tr><td>oas-list</td><td>数据展示</td><td>稳定</td></tr>
        <tr><td>oas-typography</td><td>基础</td><td>稳定</td></tr>
      </tbody>
    </oas-text>
  </div>
</DemoBlock>

`th` 加粗与 `td` 单元格的边框、内边距等细节样式由宿主自理（shadow 样式无法作用到插槽子树深层）；需要排序/筛选/分页等内容表请直接使用 `oas-table`。

## API

| 组件      | 标签            | 属性                               |
| --------- | --------------- | ---------------------------------- |
| Text      | `oas-text`      | `type`、`ellipsis`、`copyable`     |
| Title     | `oas-title`     | `level`（1-5）、`type`、`ellipsis` |
| Paragraph | `oas-paragraph` | `type`、`ellipsis`                 |

`type` 取值：`default` / `secondary` / `success` / `warning` / `danger` / `disabled`。

### oas-text

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions-position` | 操作条位置：`start`（文字前）/ `end`（默认，文字后），配合 `slot="actions"` | `string` | `end` |
| `align` | 文本对齐：`start`/`center`/`end`/`justify` | `AlignType` | — |
| `code` | 行内代码样式（等宽字体 + 浅底） | `boolean` | — |
| `copy-text` | 自定义复制内容（缺省复制当前文本） | `string` | — |
| `copyable` | 显示复制按钮，点击复制文本内容 | `boolean` | — |
| `delete` | 删除线（`<del>` 语义） | `boolean` | — |
| `depth` | 文字弱化档位：`1` / `2` / `3`（主色渐淡）；仅 `type="default"` 时生效 | `string` | — |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis） | `boolean` | — |
| `ellipsis-suffix` | 省略时保留的后缀（如展开链接），与 `ellipsis` / `line-clamp` 同用 | `string` | — |
| `italic` | 斜体（`<em>` 语义） | — | — |
| `level` | 标题级别（1–5） | `string` | `3` |
| `line-clamp` | 多行省略行数（正整数），超出折叠省略；与 `ellipsis-suffix` 可组合 | `string` | — |
| `mark` | 高亮标记（浅黄底，`<mark>` 语义） | — | — |
| `numeric` | 数字等宽（font-variant-numeric: tabular-nums），表格/统计数字列对齐 | — | — |
| `size` | 三档字号映射 font-size token（medium 缺省回落继承字号） | `string` | — |
| `strong` | 加粗（font-weight 600，`<strong>` 语义） | — | — |
| `tag` | 渲染标签：替换默认元素——行内语义（sub/sup/ins/em/strong 等）与内容块形态（blockquote 引用 / ul·ol 列表 / table 内容表 / dl 描述列表及表格部件）均在白名单内；列表与表格块为解包投影（默认插槽直接挂根） | `string` | — |
| `type` | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | 下划线 | — | — |
| `weight` | 字重：`regular`/`medium`/`semibold`/`bold`（与 strong 布尔兼容） | `WeightType` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-copy` | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 文本内容 |
| `actions` | 操作区插槽（复制/编辑等按钮），位置由 `actions-position` 决定 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-line-clamp` | `2` |
| `--oas-text-mark-bg` | `var(--oas-color-warning)` |

### oas-title

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions-position` | 操作条位置：`start`（文字前）/ `end`（默认，文字后），配合 `slot="actions"` | `string` | `end` |
| `align` | 文本对齐：`start`（默认）/ `center` / `end` / `justify`（start/end 为逻辑值，RTL 安全）；非法值回落默认 | `AlignType` | — |
| `code` | 行内代码样式（等宽字体 + 浅底） | `boolean` | — |
| `copy-text` | 自定义复制内容（缺省复制当前文本） | `string` | — |
| `copyable` | 显示复制按钮，点击复制文本内容 | `boolean` | — |
| `delete` | 删除线（`<del>` 语义） | `boolean` | — |
| `depth` | 文字弱化档位：`1` / `2` / `3`（主色渐淡）；仅 `type="default"` 时生效 | `string` | — |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis） | `boolean` | — |
| `ellipsis-suffix` | 省略时保留的后缀（如展开链接），与 `ellipsis` / `line-clamp` 同用 | `string` | — |
| `italic` | 斜体（`<em>` 语义） | — | — |
| `level` | 标题级别（1–5） | `string` | `3` |
| `line-clamp` | 多行省略行数（正整数），超出折叠省略；与 `ellipsis-suffix` 可组合 | `string` | — |
| `mark` | 高亮标记（浅黄底，`<mark>` 语义） | — | — |
| `numeric` | 数字等宽（`font-variant-numeric: tabular-nums`），表格/统计数字列对齐 | — | — |
| `strong` | 加粗（font-weight 600，`<strong>` 语义） | — | — |
| `tag` | 渲染标签：替换默认元素——行内语义（sub/sup/ins/em/strong 等）与内容块形态（blockquote 引用 / ul·ol 列表 / table 内容表 / dl 描述列表及表格部件）均在白名单内；列表与表格块为解包投影（默认插槽直接挂根） | `string` | — |
| `type` | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | 下划线 | — | — |
| `weight` | 字重档：`regular`(400) / `medium`(500) / `semibold`(600) / `bold`(700)；显式档优先于 `strong` 布尔；非法值回落 | `WeightType` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-copy` | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 标题内容 |
| `actions` | 操作区插槽（复制/编辑等按钮），位置由 `actions-position` 决定 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-line-clamp` | `2` |
| `--oas-text-mark-bg` | `var(--oas-color-warning)` |

### oas-paragraph

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions-position` | 操作条位置：`start`（文字前）/ `end`（默认，文字后），配合 `slot="actions"` | `string` | `end` |
| `align` | 文本对齐：`start`（默认）/ `center` / `end` / `justify`（start/end 为逻辑值，RTL 安全）；非法值回落默认 | `AlignType` | — |
| `code` | 行内代码样式（等宽字体 + 浅底） | `boolean` | — |
| `copy-text` | 自定义复制内容（缺省复制当前文本） | `string` | — |
| `copyable` | 显示复制按钮，点击复制文本内容 | `boolean` | — |
| `delete` | 删除线（`<del>` 语义） | `boolean` | — |
| `depth` | 文字弱化档位：`1` / `2` / `3`（主色渐淡）；仅 `type="default"` 时生效 | `string` | — |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis） | `boolean` | — |
| `ellipsis-suffix` | 省略时保留的后缀（如展开链接），与 `ellipsis` / `line-clamp` 同用 | `string` | — |
| `italic` | 斜体（`<em>` 语义） | — | — |
| `level` | 标题级别（1–5） | `string` | `3` |
| `line-clamp` | 多行省略行数（正整数），超出折叠省略；与 `ellipsis-suffix` 可组合 | `string` | — |
| `mark` | 高亮标记（浅黄底，`<mark>` 语义） | — | — |
| `numeric` | 数字等宽（`font-variant-numeric: tabular-nums`），表格/统计数字列对齐 | — | — |
| `strong` | 加粗（font-weight 600，`<strong>` 语义） | — | — |
| `tag` | 渲染标签：替换默认元素——行内语义（sub/sup/ins/em/strong 等）与内容块形态（blockquote 引用 / ul·ol 列表 / table 内容表 / dl 描述列表及表格部件）均在白名单内；列表与表格块为解包投影（默认插槽直接挂根） | `string` | — |
| `type` | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | 下划线 | — | — |
| `weight` | 字重档：`regular`(400) / `medium`(500) / `semibold`(600) / `bold`(700)；显式档优先于 `strong` 布尔；非法值回落 | `WeightType` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-copy` | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 段落内容 |
| `actions` | 操作区插槽（复制/编辑等按钮），位置由 `actions-position` 决定 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-line-clamp` | `2` |
| `--oas-text-mark-bg` | `var(--oas-color-warning)` |

同 oas-text 属性（修饰布尔/depth/tag/line-clamp/copy-text/ellipsis-suffix/actions-position 同样生效），`level` 1–5 驱动标签。

同 oas-text 属性。
