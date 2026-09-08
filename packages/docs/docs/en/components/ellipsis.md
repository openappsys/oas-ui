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

<DemoBlock title="Expand / collapse (inline link form)">
  <div style="width: 100%">
    <oas-ellipsis rows="3" expandable text="这是一段支持展开与收起的文本，默认只显示三行，点击「展开」链接可以查看完整内容，再次点击「收起」恢复省略状态。展开链接与省略号同行尾随（截断点原位嵌入），文本实际溢出时才会出现。"></oas-ellipsis>
  </div>
</DemoBlock>

With `expandable`, an inline "expand/collapse" link appears only when the text actually overflows — it trails the ellipsis on the same line. Once expanded, no ellipsis is applied, and the `oas-expand` / `oas-collapse` events can track the state.

## Custom Expand / Collapse Labels

<DemoBlock title="expand-text / collapse-text">
  <div style="width: 100%">
    <oas-ellipsis rows="2" expandable expand-text="Read more" collapse-text="Close" text="这是一段使用自定义展开收起文案的长文本，移动端信息流场景常用「全文 / 收起」一类文案，通过 expand-text 与 collapse-text 两个属性即可覆盖 locale 缺省文案。"></oas-ellipsis>
  </div>
</DemoBlock>

The `expand-text` / `collapse-text` attributes override the locale default "Expand / Collapse" labels.

## Controlled Expansion (expanded)

<DemoBlock title="Controlled expanded (attribute-driven)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-3); align-items: center; flex-wrap: wrap">
    <oas-button id="ellipsis-controlled-btn" size="small">Toggle from outside</oas-button>
    <oas-ellipsis id="ellipsis-controlled" style="flex: 1; min-width: 200px" rows="2" expandable text="这是一段受控展开的长文本：外部宿主通过增删 expanded 属性驱动开合，组件内部点击也会把状态反射回该属性（双通道同步），配合 oas-expand / oas-collapse 事件宿主可随时感知变化。"></oas-ellipsis>
  </div>
  <p id="ellipsis-controlled-out" style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Click the button or the inline link to toggle expansion.</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-ellipsis').then(() => {
    const el = document.getElementById('ellipsis-controlled')
    const out = document.getElementById('ellipsis-controlled-out')
    document.getElementById('ellipsis-controlled-btn')?.addEventListener('click', () => {
      if (!el) return
      if (el.hasAttribute('expanded')) el.removeAttribute('expanded')
      else el.setAttribute('expanded', '')
      // Host-driven attribute changes do not fire oas-expand/oas-collapse (the host already knows); read back to verify reflection
      if (out) out.textContent = `expanded attribute: ${el.hasAttribute('expanded')}`
    })
    // Only the inline expand/collapse link (component-internal toggle) fires oas-expand / oas-collapse
    el?.addEventListener('oas-expand', () => {
      if (out) out.textContent = 'oas-expand: expanded (reflected to the expanded attribute)'
    })
    el?.addEventListener('oas-collapse', () => {
      if (out) out.textContent = 'oas-collapse: collapsed (expanded attribute removed)'
    })
  })
  document.getElementById('ellipsis-overflow')?.addEventListener('oas-overflow', (e) => {
    const out = document.getElementById('ellipsis-overflow-out')
    if (out) out.textContent = `oas-overflow: overflow = ${e.detail.overflow}`
  })
})
</script>

With the `expanded` attribute present the text is expanded (host-forced); when absent, internal state drives it. Internal toggles reflect back to the attribute, and the host can add/remove the attribute to drive it too.

## Overflow State Event (oas-overflow)

<DemoBlock title="oas-overflow: watch overflow changes">
  <div style="width: 100%">
    <oas-ellipsis id="ellipsis-overflow" text="这是一段用于演示溢出事件的长文本，当容器宽度变化导致溢出状态翻转时，组件会派发 oas-overflow 事件，detail 携带 { overflow }，宿主可据此驱动业务逻辑（如标记未读全称）。"></oas-ellipsis>
  </div>
  <p id="ellipsis-overflow-out" style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">No event yet (no overflow initially)</p>
</DemoBlock>

`oas-overflow` fires when the overflow state flips (`detail: { overflow }`), without re-firing for the same value; flips detected by the ResizeObserver re-measurement trigger it as well.

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

## Tooltip Placement (tooltip-placement)

<DemoBlock title="tooltip-placement passthrough">
  <div style="width: 100%; display: flex; gap: var(--oas-space-6); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1; min-width: 220px">
      <p style="margin: 0 0 var(--oas-space-1); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">placement=top (default)</p>
      <oas-ellipsis text="这是一段溢出时悬停提示出现在上方（缺省 top）的长文本，宽度受限自动省略。"></oas-ellipsis>
    </div>
    <div style="flex: 1; min-width: 220px">
      <p style="margin: 0 0 var(--oas-space-1); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">placement=bottom</p>
      <oas-ellipsis tooltip-placement="bottom" text="这是一段溢出时悬停提示出现在下方（bottom）的长文本，宽度受限自动省略。"></oas-ellipsis>
    </div>
  </div>
</DemoBlock>

The `tooltip-placement` attribute is passed through to the inner `oas-tooltip` (top / bottom / left / right, default top), so the full-text hover tooltip pops up at the given side.

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
| `collapse-text` | Collapse link text (inline form, with expandable) | — | — |
| `direction` | Ellipsis direction: `end` (default, tail) / `start` (head) / `middle` (keep both ends, for long paths/hashes) | `string` | `tail` |
| `expand-text` | Expand link text (inline form, with expandable) | — | — |
| `expandable` | Show an "expand/collapse" button when overflowing | `boolean` | — |
| `expanded` | Controlled expanded state (controlled when present; internal toggles reflect back) | `boolean` | — |
| `rows` | Number of lines to show (1 is single-line ellipsis, ≥2 multi-line `-webkit-line-clamp`) | `string` | `1` |
| `text` | Text content | `string` | — |
| `tooltip` | Show a full-text tooltip on hover when overflowing | `string` | `true` |
| `tooltip-placement` | Overflow tooltip placement (default `top`) | `string` | `top` |

### Events

| Event | Description |
| --- | --- |
| `oas-collapse` | Collapsed, `detail: { expanded: false }` |
| `oas-expand` | Expanded, `detail: { expanded: true }` |
| `oas-overflow` | Fired when the overflow state changes, `detail: { overflow }` (not re-fired for the same value) |

The tooltip / expand button is only mounted when the text **actually overflows**; with no overflow it is plain text, and on disconnect it is destroyed — no orphaned overlays.
