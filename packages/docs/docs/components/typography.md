# Typography 排版

文本、标题、段落排版组件。

## Text 文本

<DemoBlock title="文本类型">
  <oas-text>默认文本</oas-text>
  <oas-text type="secondary">次要文本</oas-text>
  <oas-text type="success">成功文本</oas-text>
  <oas-text type="warning">警告文本</oas-text>
  <oas-text type="danger">危险文本</oas-text>
  <oas-text type="disabled" data-a11y-exempt>禁用文本</oas-text>
</DemoBlock>

<DemoBlock title="修饰样式">
  <oas-text strong>加粗</oas-text>
  <oas-text mark>标记</oas-text>
  <oas-text code>代码</oas-text>
  <oas-text underline>下划线</oas-text>
  <oas-text delete>删除线</oas-text>
  <oas-text italic>斜体</oas-text>
</DemoBlock>

<DemoBlock title="文字深度（depth）">
  <oas-text depth="1">一档弱化（说明文字）</oas-text>
  <oas-text depth="2" data-a11y-exempt>二档弱化（次要说明）</oas-text>
  <oas-text depth="3" data-a11y-exempt>三档弱化（最次要）</oas-text>
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

## API

| 组件      | 标签            | 属性                               |
| --------- | --------------- | ---------------------------------- |
| Text      | `oas-text`      | `type`、`ellipsis`、`copyable`     |
| Title     | `oas-title`     | `level`（1-5）、`type`、`ellipsis` |
| Paragraph | `oas-paragraph` | `type`、`ellipsis`                 |

`type` 取值：`default` / `secondary` / `success` / `warning` / `danger` / `disabled`。

### oas-text

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions-position` | — | `string` | `end` |
| `code` | — | `boolean` | — |
| `copy-text` | — | `string` | — |
| `copyable` | 显示复制按钮，点击复制文本内容 | `boolean` | — |
| `delete` | — | `boolean` | — |
| `depth` | — | `string` | — |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis） | `boolean` | — |
| `ellipsis-suffix` | — | `string` | — |
| `italic` | — | — | — |
| `level` | 标题级别（1–5） | `string` | `3` |
| `line-clamp` | — | `string` | — |
| `mark` | — | — | — |
| `strong` | — | — | — |
| `tag` | — | `string` | — |
| `type` | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | — | — | — |

| 事件 | 说明 |
| --- | --- |
| `oas-copy` | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `actions` | — |

### oas-title

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions-position` | — | `string` | `end` |
| `code` | — | `boolean` | — |
| `copy-text` | — | `string` | — |
| `copyable` | 显示复制按钮，点击复制文本内容 | `boolean` | — |
| `delete` | — | `boolean` | — |
| `depth` | — | `string` | — |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis） | `boolean` | — |
| `ellipsis-suffix` | — | `string` | — |
| `italic` | — | — | — |
| `level` | 标题级别（1–5） | `string` | `3` |
| `line-clamp` | — | `string` | — |
| `mark` | — | — | — |
| `strong` | — | — | — |
| `tag` | — | `string` | — |
| `type` | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | — | — | — |

| 事件 | 说明 |
| --- | --- |
| `oas-copy` | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `actions` | — |

### oas-paragraph

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions-position` | — | `string` | `end` |
| `code` | — | `boolean` | — |
| `copy-text` | — | `string` | — |
| `copyable` | 显示复制按钮，点击复制文本内容 | `boolean` | — |
| `delete` | — | `boolean` | — |
| `depth` | — | `string` | — |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis） | `boolean` | — |
| `ellipsis-suffix` | — | `string` | — |
| `italic` | — | — | — |
| `level` | 标题级别（1–5） | `string` | `3` |
| `line-clamp` | — | `string` | — |
| `mark` | — | — | — |
| `strong` | — | — | — |
| `tag` | — | `string` | — |
| `type` | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |
| `underline` | — | — | — |

| 事件 | 说明 |
| --- | --- |
| `oas-copy` | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `actions` | — |

同 oas-text 属性（修饰布尔/depth/tag/line-clamp/copy-text/ellipsis-suffix/actions-position 同样生效），`level` 1–5 驱动标签。

同 oas-text 属性。
