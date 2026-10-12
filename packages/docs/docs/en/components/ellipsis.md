# Ellipsis

Automatically truncates long text with single-line / multi-line clipping; on overflow it shows the full text in a tooltip on hover, and it can also expand / collapse.

## Single-Line Ellipsis

<DemoBlock title="Single-line ellipsis">
  <div style="width: 100%">
    <oas-ellipsis text="This is a very long piece of text used to demonstrate single-line ellipsis: when it exceeds the container width it truncates with an ellipsis, and hovering shows the full content."></oas-ellipsis>
  </div>
</DemoBlock>

Constraining the width on the container is enough to trigger the ellipsis; when there is no overflow it renders plain text (without any overlay).

## Multi-Line Ellipsis

<DemoBlock title="Multi-line ellipsis (lines / rows)">
  <div style="width: 100%">
    <oas-ellipsis lines="2" text="This text demonstrates multi-line ellipsis: at most two lines are shown and the overflow truncates with an ellipsis. Hover to read the full content; adjust `lines` to change the visible line count."></oas-ellipsis>
  </div>
</DemoBlock>

From `rows=2` on, `-webkit-line-clamp` is used; on multi-line ellipsis the tooltip shows the full text. `lines` is equivalent to `rows` (a synonym alias; `lines` wins when both are present) — `lines` is the recommended name for new code.

## Expand / Collapse

<DemoBlock title="Expand / collapse (inline link form)">
  <div style="width: 100%">
    <oas-ellipsis rows="3" expandable text="This text supports expand and collapse: only three lines show by default; click the “expand” link to read the full content, click “collapse” to restore. The expand link trails the ellipsis on the same line (embedded at the truncation point) and only appears when the text actually overflows."></oas-ellipsis>
  </div>
</DemoBlock>

With `expandable`, an inline "expand/collapse" link appears only when the text actually overflows — it trails the ellipsis on the same line. Once expanded, no ellipsis is applied, and the `oas-expand` / `oas-collapse` events can track the state.

## Custom Expand / Collapse Labels

<DemoBlock title="expand-text / collapse-text">
  <div style="width: 100%">
    <oas-ellipsis rows="2" expandable expand-text="Read more" collapse-text="Close" text="This is a long text using custom expand/collapse wording: mobile feeds commonly use “Read more / Close” style labels, and the `expand-text` and `collapse-text` attributes override the locale defaults."></oas-ellipsis>
  </div>
</DemoBlock>

The `expand-text` / `collapse-text` attributes override the locale default "Expand / Collapse" labels.

## Controlled Expansion (expanded)

<DemoBlock title="Controlled expanded (attribute-driven)">
  <div style="width: 100%; display: flex; gap: var(--oas-space-3); align-items: center; flex-wrap: wrap">
    <oas-button id="ellipsis-controlled-btn" size="small">Toggle from outside</oas-button>
    <oas-ellipsis id="ellipsis-controlled" style="flex: 1; min-width: 200px" rows="2" expandable text="This is a long text with controlled expansion: the host toggles it by adding or removing the `expanded` attribute, and clicks inside the component also reflect the state back to the attribute (two-way sync); with the `oas-expand` / `oas-collapse` events the host always knows when it changes."></oas-ellipsis>
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
    <oas-ellipsis id="ellipsis-overflow" text="This is a long text used to demonstrate the overflow event: when a container width change flips the overflow state, the component dispatches `oas-overflow` with `{ overflow }` in detail, letting the host drive business logic (such as flagging unread full text)."></oas-ellipsis>
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
    <oas-ellipsis rows="3" direction="middle" text="This is a long text used to demonstrate multi-line middle ellipsis: inside a three-line clamp, the first line keeps the head and the last line keeps the tail, joined by an ellipsis — hashes, long IDs and file paths stay recognizable at both ends even across lines; hover to read the full content. On width changes the component re-measures via ResizeObserver and corrects the truncation point, which suits strings like transaction numbers and trace IDs that must be matched head to tail."></oas-ellipsis>
  </div>
  Multi-line middle: head on the first line, tail on the last line, joined by an ellipsis.
</DemoBlock>

<DemoBlock title="start: ellipsize head across lines, keep tail">
  <div style="width: 100%; max-width: 520px">
    <oas-ellipsis rows="2" direction="start" text="/usr/local/lib/node_modules/@oas-ui/ui/dist/data/ellipsis/oas-ellipsis.d.ts.map is a file-path example for automatic long-text truncation: combined with `direction=start` and `rows=2` it shows how the head is ellipsized across lines while the trailing path stays fully visible, re-measuring automatically on width changes."></oas-ellipsis>
  </div>
  Multi-line start: the head is ellipsized while the trailing path stays fully visible.
</DemoBlock>

## Preserved Suffix (suffix)

<DemoBlock title="suffix: keep the extension when ellipsized">
  <div style="width: 100%; max-width: 520px">
    <oas-ellipsis suffix=".pdf" text="2026 Component-Library Engineering Practice Report — the complete roadmap and retrospective checklist from monorepo governance and dependency upgrades to build-speed tuning and release rollbacks (final revised edition).pdf"></oas-ellipsis>
  </div>
</DemoBlock>

`suffix` marks a tail that must survive truncation (e.g. a file extension or email domain): with the default `tail` direction the suffix width is reserved, producing a "body…suffix" result. `middle` / `start` already keep the tail, so `suffix` is not combined with them.

## Click-to-Expand (expand-trigger)

<DemoBlock title="expand-trigger=click: click the text to expand">
  <div style="width: 100%; max-width: 520px">
    <oas-ellipsis rows="2" expandable expand-trigger="click" text="This demonstrates click-to-expand: in the ellipsized state, clicking the text body itself expands it to the full text; click again to collapse — there is no separate expand button. Both actions sync `aria-expanded` and dispatch the matching events so host frameworks can annotate and read back state. The ellipsized text carries `role=button` and `tabindex`, and Enter / Space trigger the same action."></oas-ellipsis>
  </div>
</DemoBlock>

`expand-trigger="click"` (together with `expandable`): the ellipsized text body itself is the expand entry (no separate button). Once expanded the full text is restored; click again to collapse. The ellipsized text carries `role=button` / `tabindex="0"` with `aria-expanded` kept in sync, and Enter / Space trigger the same action. The default remains the button / link form.

## Tooltip Placement (tooltip-placement)

<DemoBlock title="tooltip-placement passthrough">
  <div style="width: 100%; display: flex; gap: var(--oas-space-6); align-items: flex-start; flex-wrap: wrap">
    <div style="flex: 1; min-width: 220px">
      <p style="margin: 0 0 var(--oas-space-1); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">placement=top (default)</p>
      <oas-ellipsis text="This is a long text whose overflow tooltip appears on top (default `top`): it truncates automatically when width is constrained."></oas-ellipsis>
    </div>
    <div style="flex: 1; min-width: 220px">
      <p style="margin: 0 0 var(--oas-space-1); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">placement=bottom</p>
      <oas-ellipsis tooltip-placement="bottom" text="This is a long text whose overflow tooltip appears at the bottom: it truncates automatically when width is constrained."></oas-ellipsis>
    </div>
  </div>
</DemoBlock>

The `tooltip-placement` attribute is passed through to the inner `oas-tooltip` (top / bottom / left / right, default top), so the full-text hover tooltip pops up at the given side.

## Disabling the Tooltip

<DemoBlock title="Tooltip disabled">
  <div style="width: 100%">
    <oas-ellipsis tooltip="false" text="This is a long text with the tooltip disabled: overflow shows only the ellipsis and no tooltip."></oas-ellipsis>
  </div>
</DemoBlock>

## API

### oas-ellipsis

#### Attributes

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

#### Events

| Event | Description |
| --- | --- |
| `oas-collapse` | Collapsed, `detail: { expanded: false }` |
| `oas-expand` | Expanded, `detail: { expanded: true }` |
| `oas-overflow` | Fired when the overflow state changes, `detail: { overflow }` (not re-fired for the same value) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-ellipsis-lines` | `2` |

The tooltip / expand button is only mounted when the text **actually overflows**; with no overflow it is plain text, and on disconnect it is destroyed — no orphaned overlays.
