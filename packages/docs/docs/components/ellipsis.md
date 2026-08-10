# Ellipsis 文本省略

用于长文本的自动省略，支持单行/多行截断，溢出时悬停展示全文 tooltip，也可展开/收起。

## 单行省略

<DemoBlock title="单行省略">
  <div style="width: 100%">
    <oas-ellipsis text="这是一段非常长的文本，用于演示单行省略的效果，超出容器宽度时以省略号截断，悬停文字可以查看完整内容。"></oas-ellipsis>
  </div>
</DemoBlock>

在容器上约束宽度即可触发省略；无溢出时渲染纯文本（不挂任何浮层）。

## 多行省略

<DemoBlock title="多行省略（rows）">
  <div style="width: 100%">
    <oas-ellipsis rows="2" text="这是一段用于演示多行省略的文本，最多显示两行，超出部分以省略号截断。悬停文字可以查看完整内容，调整 rows 可以改变显示行数。"></oas-ellipsis>
  </div>
</DemoBlock>

`rows="2"` 起走 `-webkit-line-clamp`，多行省略时 tooltip 展示全文。

## 展开 / 收起

<DemoBlock title="展开 / 收起">
  <div style="width: 100%">
    <oas-ellipsis rows="3" expandable text="这是一段支持展开与收起的文本，默认只显示三行，点击「展开」按钮可以查看完整内容，再次点击「收起」恢复省略状态。内容足够长时会自动出现展开按钮，配合多行省略使用效果最佳。"></oas-ellipsis>
  </div>
</DemoBlock>

`expandable` 仅在文本实际溢出时显示按钮；展开后不再省略，`oas-expand` / `oas-collapse` 事件可追踪状态。

## 关闭 tooltip

<DemoBlock title="关闭 tooltip">
  <div style="width: 100%">
    <oas-ellipsis tooltip="false" text="这是一段关闭了悬停提示的省略文本，超出宽度时只显示省略号，不提供 tooltip。"></oas-ellipsis>
  </div>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `expandable` | 溢出时显示「展开/收起」按钮 | `boolean` | — |
| `rows` | 显示行数（1 为单行省略，≥2 多行 `-webkit-line-clamp`） | `string` | `1` |
| `text` | 文本内容 | `string` | — |
| `tooltip` | 溢出时悬停展示全文 tooltip | `string` | `true` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-collapse` | 收起，`detail: { expanded: false }` |
| `oas-expand` | 展开，`detail: { expanded: true }` |

仅文本**实际溢出**时才会挂载 tooltip / 展开按钮；无溢出时纯文本，断开连接即销毁，零孤儿浮层。
