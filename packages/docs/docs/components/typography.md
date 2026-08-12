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

## 省略

<DemoBlock title="文本省略">
  <div style="max-width: 320px">
    <oas-text ellipsis>这是一段很长的文本，超出宽度后将以省略号截断显示，不再换行。</oas-text>
  </div>
</DemoBlock>

## 可复制

<DemoBlock title="可复制文本">
  <oas-text copyable>可复制的文本内容</oas-text>
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

| 属性       | 说明                                                                              | 类型       | 默认值    |
| ---------- | --------------------------------------------------------------------------------- | ---------- | --------- |
| `copyable` | 显示复制按钮，点击复制文本内容                                                    | `boolean`  | —         |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis）                                       | `boolean`  | —         |
| `level`    | 标题级别（1–5）                                                                   | `string`   | `3`       |
| `type`     | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |

| 事件             | 说明                         |
| ---------------- | ---------------------------- |
| `oas-copy`       | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

| 名称 | 说明 |
| ---- | ---- |
| 默认 | —    |

### oas-title

| 属性       | 说明                                                                              | 类型       | 默认值    |
| ---------- | --------------------------------------------------------------------------------- | ---------- | --------- |
| `copyable` | 显示复制按钮，点击复制文本内容                                                    | `boolean`  | —         |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis）                                       | `boolean`  | —         |
| `level`    | 标题级别（1–5）                                                                   | `string`   | `3`       |
| `type`     | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |

| 事件             | 说明                         |
| ---------------- | ---------------------------- |
| `oas-copy`       | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

| 名称 | 说明 |
| ---- | ---- |
| 默认 | —    |

### oas-paragraph

| 属性       | 说明                                                                              | 类型       | 默认值    |
| ---------- | --------------------------------------------------------------------------------- | ---------- | --------- |
| `copyable` | 显示复制按钮，点击复制文本内容                                                    | `boolean`  | —         |
| `ellipsis` | 超出容器宽度后单行省略（nowrap + ellipsis）                                       | `boolean`  | —         |
| `level`    | 标题级别（1–5）                                                                   | `string`   | `3`       |
| `type`     | 文本类型：`default` / `secondary` / `success` / `warning` / `danger` / `disabled` | `TextType` | `default` |

| 事件             | 说明                         |
| ---------------- | ---------------------------- |
| `oas-copy`       | 复制成功，`detail: { text }` |
| `oas-copy-error` | 复制失败，`detail: { text }` |

| 名称 | 说明 |
| ---- | ---- |
| 默认 | —    |
