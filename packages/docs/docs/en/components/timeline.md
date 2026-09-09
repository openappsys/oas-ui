# Timeline

Displays a series of event nodes in chronological order.

::: warning Breaking change: node color semantics upgrade (v2.4)
`color="green | red | gray"` has been replaced by the semantic color enum **`type`**: `green → success`, `red → danger`, `gray → neutral`. The three legacy `color` values are still mapped for compatibility in this version (scheduled for removal — please migrate soon); other values no longer take effect. For arbitrary custom colors, do not use an attribute — override the CSS variable **`--oas-timeline-dot-color`** in one line (e.g. `style="--oas-timeline-dot-color: var(--oas-color-warning)"`).
:::

## Basic Usage

<DemoBlock title="Basic timeline">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-01-01"><p>Project kickoff; goals and scope defined.</p></oas-timeline-item>
      <oas-timeline-item time="2024-03-01" type="success"><p>Core components developed; unit tests pass.</p></oas-timeline-item>
      <oas-timeline-item time="2024-05-01" type="danger"><p>Fixed production issues and ran regression.</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15"><p>Docs site launched and published.</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Semantic Colors (type)

`type` provides the node semantic color enum: `primary` (default) / `success` / `warning` / `danger` / `info` / `neutral` (gray = archived), aligned with the library semantic color tokens (dark variants included). For arbitrary colors use the `--oas-timeline-dot-color` CSS variable.

<DemoBlock title="Node semantic colors and arbitrary color">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-06-01"><p>Default theme color (primary)</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-02" type="success"><p>success: completed</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-03" type="warning"><p>warning: attention needed</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-04" type="danger"><p>danger: failure / alert</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-05" type="info"><p>info: general information</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-06" type="neutral"><p>neutral: archived (formerly gray)</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-07" style="--oas-timeline-dot-color: var(--oas-color-warning);"><p>Arbitrary color via the --oas-timeline-dot-color variable</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="Legacy color mapping (to be removed, migrate to type)">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01" color="green"><p>color="green" → success</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-02" color="red"><p>color="red" → danger</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-03" color="gray"><p>color="gray" → neutral</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Node Variant (variant)

`variant="outlined"` renders the node as a hollow outlined dot (default `filled` solid), composable with `type`.

<DemoBlock title="outlined nodes">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01" type="success"><p>filled solid (default)</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-02" type="success" variant="outlined"><p>outlined: pending review</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-03" type="warning" variant="outlined"><p>outlined + warning</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Custom Nodes (dot slot / icon attribute)

Nodes can be fully customized with `slot="dot"` (any content), or rendered quickly with the `icon` attribute using library icons (color follows `type`).

<DemoBlock title="icon attribute nodes">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01" icon="upload" type="primary"><p>Build package uploaded</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-02" icon="check" type="success"><p>Pre-release checks passed</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-03" icon="close" type="danger"><p>Canary smoke test failed</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-04" icon="refresh" type="warning"><p>Re-release after fix</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="dot slot custom nodes">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01">
        <span slot="dot" style="display: inline-flex; width: 18px; height: 18px; border-radius: 50%; background: var(--oas-color-primary); color: var(--oas-color-text-on-primary); align-items: center; justify-content: center; font-size: 12px;">1</span>
        <p>Step one: submit the request</p>
      </oas-timeline-item>
      <oas-timeline-item time="2024-08-02">
        <span slot="dot" style="display: inline-flex; width: 18px; height: 18px; border-radius: 50%; background: var(--oas-color-success); color: var(--oas-color-text-on-success); align-items: center; justify-content: center; font-size: 12px;">2</span>
        <p>Step two: review approved</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="Dot size and color customization">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-09-01" style="--oas-timeline-dot-size: 6px"><p>Small dot (--oas-timeline-dot-size: 6px)</p></oas-timeline-item>
      <oas-timeline-item time="2024-09-02" style="--oas-timeline-dot-size: 10px"><p>Default size (10px)</p></oas-timeline-item>
      <oas-timeline-item time="2024-09-03" style="--oas-timeline-dot-size: 16px"><p>Large dot (16px)</p></oas-timeline-item>
      <oas-timeline-item time="2024-09-04" style="--oas-timeline-dot-size: 12px; --oas-timeline-dot-color: #7c3aed"><p>Custom color (--oas-timeline-dot-color: #7c3aed)</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Title Structure (title slot)

`slot="title"` renders an emphasized title line, separated from the body (default slot) — great for release records and changelogs.

<DemoBlock title="Title + body">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-07-01">
        <span slot="title">v1.2.0 released</span>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Added data-display components; see the release notes.</p>
      </oas-timeline-item>
      <oas-timeline-item time="2024-07-15" type="success">
        <span slot="title">v1.3.0 released</span>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Improved the dark theme and accessibility.</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Pending and Loading (pending / loading)

`pending` marks an in-progress tail node: hollow dot + dashed connector + pulse animation, showing "Coming soon" when empty. `loading` marks a single loading node (spinner ring), with `aria-busy` synced on the content area.

<DemoBlock title="Pending tail node + loading node">
  <div style="width: 100%">
    <oas-timeline>
      <oas-timeline-item time="2024-08-01"><p>v1.4.0 requirements review completed.</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-10" type="success"><p>Core features developed; unit tests pass.</p></oas-timeline-item>
      <oas-timeline-item time="2024-08-12" loading><p>Running regression tests…</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

Setting `pending` on an `oas-timeline-item` renders that node as a hollow dot with a dashed connector, meaning "in progress / coming soon"; a node without content shows the "Coming soon" text by default.

## Reverse Order (reverse)

`reverse` renders visually in reverse (latest on top) while keeping the DOM order stable (screen-reader and focus order unchanged); commonly combined with `pending` for "latest in-progress activity".

<DemoBlock title="reverse order">
  <div style="width: 100%">
    <oas-timeline reverse>
      <oas-timeline-item time="2024-06-01"><p>The earliest commit</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15" type="success"><p>Intermediate milestone</p></oas-timeline-item>
      <oas-timeline-item time="2024-07-01" type="success"><p>Most recent release (visually on top)</p></oas-timeline-item>
      <oas-timeline-item pending></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Horizontal Timeline (direction)

`direction="horizontal"` lays the axis horizontally with items in a row (great for milestones and release pipelines). In horizontal mode, `mode` maps as: `left` content below the axis (default), `right` content above the axis, `alternate` alternating above/below.

<DemoBlock title="Horizontal timeline">
  <div style="width: 100%">
    <oas-timeline direction="horizontal">
      <oas-timeline-item time="Q1" type="success"><p>Kickoff</p></oas-timeline-item>
      <oas-timeline-item time="Q2" type="success"><p>Core dev</p></oas-timeline-item>
      <oas-timeline-item time="Q3" type="warning"><p>Integration</p></oas-timeline-item>
      <oas-timeline-item time="Q4"><p>Release</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="Horizontal + alternate">
  <div style="width: 100%">
    <oas-timeline direction="horizontal" mode="alternate">
      <oas-timeline-item time="Q1" type="success"><p>Kickoff</p></oas-timeline-item>
      <oas-timeline-item time="Q2" type="success"><p>Core dev</p></oas-timeline-item>
      <oas-timeline-item time="Q3" type="warning"><p>Integration</p></oas-timeline-item>
      <oas-timeline-item time="Q4"><p>Release</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Alternate Mode and Opposite Content (mode / opposite)

`mode` controls the content position relative to the axis: `left` (default, axis on the left) / `right` (axis on the right) / `alternate` (axis centered, content alternating left/right, first item on the left). `slot="opposite"` places content on the opposite side of the axis in `alternate` mode (e.g. time on the outer side, summary on the inner side).

<DemoBlock title="mode=right">
  <div style="width: 100%">
    <oas-timeline mode="right">
      <oas-timeline-item time="2024-06-01"><p>Axis on the right, content on the left</p></oas-timeline-item>
      <oas-timeline-item time="2024-06-15" type="success"><p>A mirrored layout for RTL contexts</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

<DemoBlock title="mode=alternate + opposite slot">
  <div style="width: 100%">
    <oas-timeline mode="alternate">
      <oas-timeline-item>
        <span slot="opposite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">2024-06-01</span>
        <p>First beta</p>
      </oas-timeline-item>
      <oas-timeline-item type="success">
        <span slot="opposite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">2024-06-15</span>
        <p>Public launch</p>
      </oas-timeline-item>
      <oas-timeline-item type="warning">
        <span slot="opposite" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">2024-07-01</span>
        <p>Performance tuning</p>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

The opposite content channel only shows in `alternate` mode; in single-side modes (left/right) `slot="opposite"` is hidden.

## Item Click (oas-click)

Timeline items support a click event `oas-click` (`detail` carries `{ index }`, bubbles + composed) — great for log streams where clicking an item opens details.

<DemoBlock title="Click items">
  <div style="width: 100%">
    <oas-timeline id="tl-click">
      <oas-timeline-item time="09:12" type="success"><p>Order #1024 paid</p></oas-timeline-item>
      <oas-timeline-item time="09:30"><p>Order #1024 shipped from warehouse</p></oas-timeline-item>
      <oas-timeline-item time="10:05" type="warning"><p>Order #1024 transit delay</p></oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Rich Content and Interaction

Node content is distributed in place from the host DOM, so buttons and links inside keep their event handlers (previously the clone-based rendering lost host listeners — fixed).

<DemoBlock title="Rich content nodes (button events work)">
  <div style="width: 100%">
    <oas-timeline id="tl-rich">
      <oas-timeline-item time="2024-07-01">
        <p><strong>v1.2.0 released</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Added data-display components.</p>
        <oas-button size="small" variant="outlined" class="tl-rich-btn">View release notes</oas-button>
      </oas-timeline-item>
      <oas-timeline-item time="2024-07-15" type="success">
        <p><strong>v1.3.0 released</strong></p>
        <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Improved the dark theme and accessibility.</p>
        <oas-button size="small" class="tl-rich-btn">Update now</oas-button>
      </oas-timeline-item>
    </oas-timeline>
  </div>
</DemoBlock>

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-timeline-font` (e.g. `18px`). Node and connector sizing hooks: `--oas-timeline-dot-size` / connector width follows the size.

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Item click feedback
  const clickable = document.querySelector('#tl-click')
  if (clickable) {
    clickable.addEventListener('oas-click', (e) => {
      const item = e.target
      const time = item && item.getAttribute ? item.getAttribute('time') : ''
      message.info(`Clicked the ${time} item (index=${e.detail.index})`)
    })
  }

  // Rich content buttons: verify content event listeners survive rendering
  document.querySelectorAll('.tl-rich-btn').forEach((btn) => {
    btn.addEventListener('click', () => message.success('Content button event fired'))
  })
})
</script>

## API

### oas-timeline

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `direction` | Axis direction: vertical (default) / horizontal (items laid out in a row) | `string` | — |
| `mode` | Content position relative to the axis: left (default, axis on the left) / right (axis on the right) / alternate (axis centered, content alternates sides, first item on the left); in horizontal mode maps to below/above/alternating | `string` | — |
| `reverse` | Visual reverse order (DOM order unchanged); pairs with pending for "newest first" | `boolean` | — |

| Name | Description |
| --- | --- |
| default | — |

### oas-timeline-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | [Migration compat] Legacy node color: green→success, red→danger, gray→neutral; will be removed. Use type for new code; arbitrary colors via --oas-timeline-dot-color | `string` | — |
| `icon` | Node icon (library oas-icon name), colored by type; slot="dot" wins | `string` | — |
| `loading` | Per-node loading: the dot becomes a spinner, content area syncs aria-busy | `boolean` | — |
| `pending` | In-progress node: hollow dot + dashed connector + pulse; shows "敬请期待" when empty | `boolean` | — |
| `time` | Time text of the node | `string` | — |
| `type` | Semantic node color: primary (default) / success / warning / danger / info / neutral | `string` | — |
| `variant` | Node variant: filled (default solid) / outlined (hollow stroke) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-click` | Item click (content area); detail carries { index } |

| Name | Description |
| --- | --- |
| default | Node body content |
| `dot` | Custom node (any content replaces the dot) |
| `opposite` | Opposite-side content (only shown in mode=alternate) |
| `title` | Title emphasis line (separated from the body) |
