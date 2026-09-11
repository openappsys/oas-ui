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

<DemoBlock title="Multi-line ellipsis (lines / rows)">
  <div style="width: 100%">
    <oas-ellipsis lines="2" text="这是一段用于演示多行省略的文本，最多显示两行，超出部分以省略号截断。悬停文字可以查看完整内容，调整 lines 可以改变显示行数。"></oas-ellipsis>
  </div>
</DemoBlock>

From `rows="2"` on, `-webkit-line-clamp` is used; on multi-line ellipsis the tooltip shows the full text. `lines` is equivalent to `rows` (a synonym alias; `lines` wins when both are present) — `lines` is the recommended name for new code.

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

`direction` values: `tail` (default, tail ellipsis) / `start` (head ellipsis) / `middle` (middle ellipsis, keeping both ends). Multi-line (`rows`/`lines` ≥ 2) works with `middle` / `start` too: the component measures text wrapping in a same-width mirror container inside the shadow root and binary-searches the cut per line count — the first line keeps the head and the last line keeps the tail (`middle`), or the head is ellipsized while the tail is kept (`start`). Environments without measurable layout safely fall back to showing the full text.

## Multi-Line Direction

<DemoBlock title="middle: keep head and tail across lines">
  <div style="width: 100%; max-width: 520px">
    <oas-ellipsis rows="3" direction="middle" text="这是一段用于演示多行中部省略的长文本：在限制三行高度的容器里，第一行保留开头、最后一行保留结尾，中间以省略号衔接，哈希值、长 ID 与文件路径在多行场景下也能首尾可辨认，悬停可查看完整内容；宽度变化时组件会通过 ResizeObserver 自动重新测量并校正截断位置，适用于交易流水号、日志追踪 ID 等必须首尾对照才能辨认的字符串。"></oas-ellipsis>
  </div>
  Multi-line middle: head on the first line, tail on the last line, joined by an ellipsis.
</DemoBlock>

<DemoBlock title="start: ellipsize head across lines, keep tail">
  <div style="width: 100%; max-width: 520px">
    <oas-ellipsis rows="2" direction="start" text="/usr/local/lib/node_modules/@oas-ui/ui/dist/data/ellipsis/oas-ellipsis.d.ts.map 是一个用于长文本自动省略的组件实现文件路径示例，配合 direction=start 与 rows=2 展示多行场景下省略头部、完整保留末尾路径的效果，宽度变化时自动重新测量。"></oas-ellipsis>
  </div>
  Multi-line start: the head is ellipsized while the trailing path stays fully visible.
</DemoBlock>

## Preserved Suffix (suffix)

<DemoBlock title="suffix: keep the extension when ellipsized">
  <div style="width: 100%; max-width: 520px">
    <oas-ellipsis suffix=".pdf" text="2026 年度组件库工程化实践报告——从 monorepo 治理、依赖升级、构建提速到发布回滚的完整路线图与复盘清单（最终修订版）.pdf"></oas-ellipsis>
  </div>
</DemoBlock>

`suffix` marks a tail that must survive truncation (e.g. a file extension or email domain): with the default `tail` direction the suffix width is reserved, producing a "body…suffix" result. `middle` / `start` already keep the tail, so `suffix` is not combined with them.

## Click-to-Expand (expand-trigger)

<DemoBlock title="expand-trigger=click: click the text to expand">
  <div style="width: 100%; max-width: 520px">
    <oas-ellipsis rows="2" expandable expand-trigger="click" text="这是一段点文本展开的演示：省略态下直接点击文本本体即可展开查看全文，展开后再次点击收起，没有独立的展开按钮；展开与收起都会同步 aria-expanded 状态并派发对应事件，供宿主框架做无障碍标注与状态回读。省略态文本带 role=button 与 tabindex，Enter / Space 键盘触发等价点击。"></oas-ellipsis>
  </div>
</DemoBlock>

`expand-trigger="click"` (together with `expandable`): the ellipsized text body itself is the expand entry (no separate button). Once expanded the full text is restored; click again to collapse. The ellipsized text carries `role="button"` / `tabindex="0"` with `aria-expanded` kept in sync, and Enter / Space trigger the same action. The default remains the button / link form.

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
| `direction` | Ellipsis direction: `tail` (default, tail) / `start` (head, keep tail) / `middle` (keep both ends, for long paths/hashes); with multiple lines (lines/rows ≥ 2), `middle`/`start` truncate via mirror measurement | `string` | `tail` |
| `expand-text` | Expand link text (inline form, with expandable) | — | — |
| `expand-trigger` | Expand trigger form: with `click` the ellipsized text body expands/collapses on click (with `expandable`; `role=button`, keyboard reachable); defaults to the button/link form | — | — |
| `expandable` | Show an "expand/collapse" button when overflowing | `boolean` | — |
| `expanded` | Controlled expanded state (controlled when present; internal toggles reflect back) | `boolean` | — |
| `lines` | Number of lines to show, equivalent to `rows` (synonym alias; `lines` wins when both are present; 1 is single-line, ≥2 multi-line) | — | — |
| `rows` | Number of lines to show (1 is single-line ellipsis, ≥2 multi-line `-webkit-line-clamp`) | `string` | `1` |
| `suffix` | Tail suffix preserved when ellipsized (e.g. `.pdf`); only with the default `tail` direction (`middle`/`start` already keep the tail) | — | — |
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
