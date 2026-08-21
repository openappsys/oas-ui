# Ellipsis

Automatically truncates long text with single-line / multi-line clipping; on overflow it shows the full text in a tooltip on hover, and it can also expand / collapse.

## Single-Line Ellipsis

<DemoBlock title="Single-line ellipsis">
  <div style="width: 100%">
    <oas-ellipsis text="这是一段非常长的文本，用于演示单行省略的效果，超出容器宽度时以省略号截断，悬停文字可以查看完整内容。"></oas-ellipsis>
  </div>
</DemoBlock>

Constraining the width on the container is enough to trigger the ellipsis; when there is no overflow it renders plain text (without any overlay).

## Multi-Line Ellipsis

<DemoBlock title="Multi-line ellipsis (rows)">
  <div style="width: 100%">
    <oas-ellipsis rows="2" text="这是一段用于演示多行省略的文本，最多显示两行，超出部分以省略号截断。悬停文字可以查看完整内容，调整 rows 可以改变显示行数。"></oas-ellipsis>
  </div>
</DemoBlock>

From `rows="2"` on, `-webkit-line-clamp` is used; on multi-line ellipsis the tooltip shows the full text.

## Expand / Collapse

<DemoBlock title="Expand / collapse">
  <div style="width: 100%">
    <oas-ellipsis rows="3" expandable text="这是一段支持展开与收起的文本，默认只显示三行，点击「展开」按钮可以查看完整内容，再次点击「收起」恢复省略状态。内容足够长时会自动出现展开按钮，配合多行省略使用效果最佳。"></oas-ellipsis>
  </div>
</DemoBlock>

With `expandable`, the button only appears when the text actually overflows; once expanded, no ellipsis is applied, and the `oas-expand` / `oas-collapse` events can track the state.

## Ellipsis direction (direction)

<DemoBlock title="start: ellipsize head, keep tail">
  <div style="width: 100%">
    <oas-ellipsis direction="start" text="/usr/local/lib/node_modules/@oas-ui/ui/dist/index.js"></oas-ellipsis>
  </div>
  For long paths / file names: the head is truncated with an ellipsis while the trailing file name stays fully visible (pure CSS via `direction: rtl` + `unicode-bidi: plaintext`).
</DemoBlock>

<DemoBlock title="middle: keep head and tail, ellipsize the middle">
  <div style="width: 100%">
    <oas-ellipsis direction="middle" text="a9f3c2b7d4e8f1a6c3b9d2e7f4a8c1b6d3e9f2a7c4b1d8e6f3a9c2b7d4e1f8a6c3b9d2e7f4a8c1b6d3e9f2"></oas-ellipsis>
  </div>
  For hashes / transaction IDs: both ends stay recognizable while the middle is compressed with an ellipsis; hover to see the full text.
</DemoBlock>

`direction` values: `tail` (default, tail ellipsis) / `start` (head ellipsis) / `middle` (middle ellipsis; single-line only, ignored when `rows` ≥ 2).

## Disabling the Tooltip

<DemoBlock title="Tooltip disabled">
  <div style="width: 100%">
    <oas-ellipsis tooltip="false" text="这是一段关闭了悬停提示的省略文本，超出宽度时只显示省略号，不提供 tooltip。"></oas-ellipsis>
  </div>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `direction` | Ellipsis direction: `end` (default, tail) / `start` (head) / `middle` (keep both ends, for long paths/hashes) | `string` | `tail` |
| `expandable` | Show an "expand/collapse" button when overflowing | `boolean` | — |
| `rows` | Number of lines to show (1 is single-line ellipsis, ≥2 multi-line `-webkit-line-clamp`) | `string` | `1` |
| `text` | Text content | `string` | — |
| `tooltip` | Show a full-text tooltip on hover when overflowing | `string` | `true` |

### Events

| Event | Description |
| --- | --- |
| `oas-collapse` | Collapsed, `detail: { expanded: false }` |
| `oas-expand` | Expanded, `detail: { expanded: true }` |

The tooltip / expand button is only mounted when the text **actually overflows**; with no overflow it is plain text, and on disconnect it is destroyed — no orphaned overlays.
