# Descriptions

Displays read-only information in groups, suitable for detail page scenarios. The default `horizontal` layout places the label and content on the same row (greyed label on the left); `layout="vertical"` stacks the label above the content.

## Basic Usage

<DemoBlock title="Basic description list (vertical layout)">
  <div style="width: 100%">
    <oas-descriptions title="User Info" column="3" layout="vertical">
      <oas-descriptions-item label="Name"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Age"><span>30</span></oas-descriptions-item>
      <oas-descriptions-item label="City"><span>Beijing</span></oas-descriptions-item>
      <oas-descriptions-item label="Phone"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="Email"><span>alice@example.com</span></oas-descriptions-item>
      <oas-descriptions-item label="Position"><span>Frontend Engineer</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Horizontal Layout (Default)

Omitting `layout` renders horizontal: the greyed label sits on the left and the content on the right of the same row:

<DemoBlock title="Horizontal layout (default)">
  <div style="width: 100%">
    <oas-descriptions title="App Info">
      <oas-descriptions-item label="App name"><span>Ops Console</span></oas-descriptions-item>
      <oas-descriptions-item label="Cluster"><span>prod-east-1</span></oas-descriptions-item>
      <oas-descriptions-item label="Version"><span>v2.4.0</span></oas-descriptions-item>
      <oas-descriptions-item label="Owner"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Updated"><span>2024-08-01 10:30</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Columns

<DemoBlock title="Two-column layout">
  <div style="width: 100%">
    <oas-descriptions title="Order Info" column="2" layout="vertical">
      <oas-descriptions-item label="Order No."><span>SO-20240801-001</span></oas-descriptions-item>
      <oas-descriptions-item label="Order time"><span>2024-08-01 10:30</span></oas-descriptions-item>
      <oas-descriptions-item label="Amount"><span>¥ 1,280.00</span></oas-descriptions-item>
      <oas-descriptions-item label="Delivery"><span>Standard delivery</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## No Title

<DemoBlock title="No title">
  <div style="width: 100%">
    <oas-descriptions column="3" layout="vertical">
      <oas-descriptions-item label="Environment"><span>Production</span></oas-descriptions-item>
      <oas-descriptions-item label="Version"><span>v1.0.0</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><span>Running</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Bordered Detail Table

`bordered` renders grid lines as a table: the label cell gets a tinted background (semantic token, dark-mode aware), which fits detail pages such as user profiles:

<DemoBlock title="Bordered detail table">
  <div style="width: 100%">
    <oas-descriptions title="User Info" bordered column="3">
      <oas-descriptions-item label="Name"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Phone"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="Email"><span>alice@example.com</span></oas-descriptions-item>
      <oas-descriptions-item label="Role"><span>Administrator</span></oas-descriptions-item>
      <oas-descriptions-item label="Department"><span>Platform Engineering</span></oas-descriptions-item>
      <oas-descriptions-item label="Joined"><span>2021-07-12</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Column Span (span)

The item's `span="N"` spans N columns — handy for long addresses or remarks. If N exceeds the remaining columns in the current row, the grid wraps it to the next row; there is no "fill the remaining columns" semantics, so pass an explicit column count:

<DemoBlock title="Spanning a long address">
  <div style="width: 100%">
    <oas-descriptions title="Shipping Info" bordered column="3">
      <oas-descriptions-item label="Recipient"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Phone"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="ZIP"><span>100000</span></oas-descriptions-item>
      <oas-descriptions-item label="Address" span="3"><span>Room 1801, 18F, Tower A, No.100 Moumou Rd, Chaoyang District, Beijing</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Colon

`colon` appends a colon after each label (hidden by default):

<DemoBlock title="Label colon">
  <div style="width: 100%">
    <oas-descriptions title="Task Info" colon column="3">
      <oas-descriptions-item label="Task"><span>Component audit</span></oas-descriptions-item>
      <oas-descriptions-item label="Priority"><span>High</span></oas-descriptions-item>
      <oas-descriptions-item label="Due date"><span>2024-08-10</span></oas-descriptions-item>
      <oas-descriptions-item label="Owner"><span>Alice</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Size

`size="small|medium|large"` provides three density levels controlling font size and bordered cell padding (medium is the default; font size follows the outer context):

<DemoBlock title="Three sizes">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-descriptions bordered size="small" column="3">
      <oas-descriptions-item label="Name"><span>Small density</span></oas-descriptions-item>
      <oas-descriptions-item label="Code"><span>D-001</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><span>Enabled</span></oas-descriptions-item>
    </oas-descriptions>
    <oas-descriptions bordered size="medium" column="3">
      <oas-descriptions-item label="Name"><span>Medium density</span></oas-descriptions-item>
      <oas-descriptions-item label="Code"><span>D-002</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><span>Enabled</span></oas-descriptions-item>
    </oas-descriptions>
    <oas-descriptions bordered size="large" column="3">
      <oas-descriptions-item label="Name"><span>Large density</span></oas-descriptions-item>
      <oas-descriptions-item label="Code"><span>D-003</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><span>Enabled</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Title Actions (slot="extra")

An action area on the same row as the title, on the right — for entries such as Edit:

<DemoBlock title="Title action area">
  <div style="width: 100%">
    <oas-descriptions title="Profile" bordered column="3">
      <oas-descriptions-item label="Name"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Phone"><span>138-0000-0000</span></oas-descriptions-item>
      <oas-descriptions-item label="Email"><span>alice@example.com</span></oas-descriptions-item>
      <oas-button slot="extra" size="small" variant="outlined" onoas-click="message.info('Navigating to the edit page (demo)')">Edit</oas-button>
    </oas-descriptions>
  </div>
</DemoBlock>

## Rich Label (slot="label")

The item's `slot="label"` accepts rich content such as an icon plus text; it is mutually exclusive with the `label` attribute (the slot wins):

<DemoBlock title="Label with icons">
  <div style="width: 100%">
    <oas-descriptions bordered column="2">
      <oas-descriptions-item>
        <span slot="label"><oas-icon name="user" size="14"></oas-icon> Account</span>
        <span>alice</span>
      </oas-descriptions-item>
      <oas-descriptions-item>
        <span slot="label"><oas-icon name="mail" size="14"></oas-icon> Email</span>
        <span>alice@example.com</span>
      </oas-descriptions-item>
      <oas-descriptions-item>
        <span slot="label"><oas-icon name="organization" size="14"></oas-icon> Department</span>
        <span>Platform Engineering</span>
      </oas-descriptions-item>
      <oas-descriptions-item label="Status"><oas-tag type="success">Employed</oas-tag></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Custom Content

<DemoBlock title="Rich content">
  <div style="width: 100%">
    <oas-descriptions title="Member Info" column="2" layout="vertical">
      <oas-descriptions-item label="Owner"><span>Alice</span></oas-descriptions-item>
      <oas-descriptions-item label="Role"><span>Administrator</span></oas-descriptions-item>
      <oas-descriptions-item label="Bio"><span>Responsible for the component library design system and engineering standards.</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><span>Employed</span></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

## Data-Driven (Host-Generated Items)

Items are generated by the host looping over data — no built-in items data channel: with Web Components, a single `.map()` producing `oas-descriptions-item` children costs zero API surface (same rationale as field mapping):

<DemoBlock title="Data-driven (.map() generates items)">
  <div style="width: 100%">
    <oas-descriptions id="desc-data-driven" title="Service Info" column="2" bordered></oas-descriptions>
  </div>
</DemoBlock>

## Responsive Columns (Host Media Query)

Without the `column` attribute, the column count comes from the CSS variable `--oas-desc-columns` (default 3), so the host can lower it responsively with a media query (setting `column` pins the count and ignores the variable):

<DemoBlock title="Fewer columns on narrow screens">
  <div style="width: 100%">
    <oas-descriptions class="demo-desc-responsive" title="Device Info" bordered>
      <oas-descriptions-item label="Device"><span>edge-gateway-01</span></oas-descriptions-item>
      <oas-descriptions-item label="Model"><span>GW-2000</span></oas-descriptions-item>
      <oas-descriptions-item label="Location"><span>CN-East-1</span></oas-descriptions-item>
      <oas-descriptions-item label="Firmware"><span>v3.2.1</span></oas-descriptions-item>
      <oas-descriptions-item label="Last heartbeat"><span>2024-08-01 10:30</span></oas-descriptions-item>
      <oas-descriptions-item label="Status"><oas-tag type="success">Online</oas-tag></oas-descriptions-item>
    </oas-descriptions>
  </div>
</DemoBlock>

<style>
/* Column-count variable override: 3 columns by default, down to 1 at <=640px viewport */
.demo-desc-responsive {
  --oas-desc-columns: 3;
}
@media (max-width: 640px) {
  .demo-desc-responsive {
    --oas-desc-columns: 1;
  }
}
</style>

## Loading (Skeleton Composition)

Combine with `oas-skeleton` for a "loading details" pattern: show the skeleton while loading, then swap in the description list (the loading region carries `aria-busy` for screen readers):

<DemoBlock title="Loading details">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-button id="desc-loading-btn" size="small">Reload</oas-button>
    <div id="desc-loading-area" aria-busy="false">
      <oas-descriptions id="desc-loaded" title="Account Info" bordered column="3">
        <oas-descriptions-item label="Account"><span>alice</span></oas-descriptions-item>
        <oas-descriptions-item label="Balance"><span>¥ 12,800.00</span></oas-descriptions-item>
        <oas-descriptions-item label="Status"><oas-tag type="success">OK</oas-tag></oas-descriptions-item>
      </oas-descriptions>
      <oas-skeleton id="desc-skeleton" title rows="3" active style="display: none"></oas-skeleton>
    </div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

// import must stay inside onMounted: top-level await import is evaluated during build SSR (no HTMLElement in Node) and blanks the page;
// the let binding keeps template inline handlers (onoas-click="message.info(...)") resolving via setup scope
let message
onMounted(async () => {
  ;({ message } = await import('@oas-ui/ui'))
  window.message = message
  // whenDefined guard: property assignment must happen after the element is defined
  // (pre-upgrade expando would shadow the setter in preview builds)
  customElements.whenDefined('oas-skeleton').then(() => {
    const btn = document.getElementById('desc-loading-btn')
    const area = document.getElementById('desc-loading-area')
    const loaded = document.getElementById('desc-loaded')
    const skeleton = document.getElementById('desc-skeleton')
    if (!btn || !area || !loaded || !skeleton) return
    btn.addEventListener('click', () => {
      area.setAttribute('aria-busy', 'true')
      loaded.style.display = 'none'
      skeleton.style.display = ''
      window.setTimeout(() => {
        skeleton.style.display = 'none'
        loaded.style.display = ''
        area.setAttribute('aria-busy', 'false')
        message.success('Details loaded')
      }, 1200)
    })

    // Data-driven demo: host .map() generates oas-descriptions-item children
    const SERVICES = [
      { label: 'Service', value: 'oas-ui-docs' },
      { label: 'Status', value: 'Running' },
      { label: 'Environment', value: 'production / cn-east-1' },
      { label: 'Latest release', value: 'v2.4.1 · 2026-09-06' },
      { label: 'Owner', value: 'Frontend Infra Team' },
      { label: 'Health', value: '99.99% (last 30 days)' },
    ]
    const dd = document.getElementById('desc-data-driven')
    if (dd) {
      for (const item of SERVICES) {
        const node = document.createElement('oas-descriptions-item')
        node.setAttribute('label', item.label)
        const span = document.createElement('span')
        span.textContent = item.value
        node.appendChild(span)
        dd.appendChild(node)
      }
    }
  })
})
</script>

## Font Size

The `oas-descriptions-item` font size follows the outer context (inherited) by default; override with the CSS variable `--oas-descriptions-item-font` (e.g. `18px`). The container's `size` levels are pushed through `--oas-desc-font-size` (the item-level variable wins).

Other style hooks (CSS variable piercing, dark-mode aware):

| Variable | Purpose | Default |
| --- | --- | --- |
| `--oas-desc-label-color` | Field label color | `--oas-color-text-secondary` |
| `--oas-desc-columns` | Column count (applies when `column` is not set; pair with media queries for responsive layouts) | `3` |

## API

### oas-descriptions

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `bordered` | Bordered table form: full grid lines + tinted label cells | `boolean` | — |
| `colon` | Show a colon after the label (default false) | `boolean` | — |
| `column` | Columns per row | `string` | `3` |
| `layout` | Layout: `horizontal` (default, label and content on one row) / `vertical` (label above content) | `string` | `horizontal` |
| `size` | Size: `small` / `medium` (default) / `large` (padding and font size linked) | `string` | `medium` |
| `title` | Title (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use slot="title" for rich content | `string` | — |

| Name | Description |
| --- | --- |
| default | — |
| `extra` | Action area on the same row as the title (right side) |
| `title` | Rich title content slot, overrides the title attribute text when present |

### oas-descriptions-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `label` | Field label | `string` | — |
| `span` | Column span (positive integer, default 1; grid wraps when exceeding remaining columns) | `string` | `1` |

| Name | Description |
| --- | --- |
| default | Field content |
| `label` | Rich label content (icon + text etc.; mutually exclusive with the label attribute, slot wins) |
