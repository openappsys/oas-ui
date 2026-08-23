# Breadcrumb

Shows the page hierarchy path; the last item is the current page (`aria-current="page"`).

## Basic usage

<DemoBlock title="Basic usage">
  <oas-breadcrumb items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Item icons

Set the `icon` field on an `items` entry to render a leading icon (same registry as `oas-icon`).

<DemoBlock title="Item icons">
  <oas-breadcrumb items='[{"label":"Home","href":"/","icon":"star"},{"label":"Components","href":"/components","icon":"gear"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Custom separator

`separator` accepts any text; when the value matches an icon registry name it renders as an icon separator (e.g. `chevron-right`).

<DemoBlock title="Text separator">
  <oas-breadcrumb separator="›" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

<DemoBlock title="Icon separator">
  <oas-breadcrumb separator="chevron-right" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Per-item separator

The `separator` field on an `items` entry overrides the separator after that item (icon names supported too).

<DemoBlock title="Per-item separator">
  <oas-breadcrumb separator="›" items='[{"label":"Home","href":"/","separator":"heart"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Real links

Items with `href` render as native `<a>` links: clicks do not block the default behavior (native navigation) and still fire `oas-select` (SPA hosts may intercept for routing). `target` opens in a new window; `_blank` automatically adds `noopener noreferrer`.

<DemoBlock title="Real links">
  <oas-breadcrumb id="bc-real" onoas-select="breadcrumbLog(event)" items='[{"label":"Home","href":"/"},{"label":"Open in new tab","href":"/components","target":"_blank"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-real-result" type="info">Nothing clicked</oas-tag>
</DemoBlock>

## Click event

The `oas-select` event: `detail: { value: href }`. This example uses `href="#"` placeholders so clicks show feedback without navigating.

<DemoBlock title="Click event">
  <oas-breadcrumb onoas-select="breadcrumbLog(event)" items='[{"label":"Home","href":"#"},{"label":"Components","href":"#"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-result" type="info">Nothing clicked</oas-tag>
</DemoBlock>

## Disabled items

An item with `disabled: true` renders as non-interactive text (`aria-disabled="true"`); clicks do not fire events.

<DemoBlock title="Disabled items">
  <oas-breadcrumb items='[{"label":"Home","href":"/"},{"label":"Deprecated","href":"/gone","disabled":true},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Collapse mode

`collapsed` + `max-items`: when there are more items than `max-items` (default `4`), the middle items collapse into `…`; click `…` to expand a dropdown with all collapsed items .

<DemoBlock title="Collapse mode">
  <oas-breadcrumb id="bc-collapsed" collapsed max-items="4" onoas-select="breadcrumbLog(event)" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Data Display","href":"/components/table"},{"label":"Settings","href":"/components/settings"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-collapsed-result" type="info">Nothing clicked</oas-tag>
</DemoBlock>

## Collapse retention

`items-before-collapse` / `items-after-collapse` control how many items stay visible before and after the collapse ellipsis (defaults: `1` before, `max-items - 2` after).

<DemoBlock title="Collapse retention">
  <oas-breadcrumb collapsed max-items="4" items-before-collapse="2" items-after-collapse="1" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Data Display","href":"/components/table"},{"label":"Feedback","href":"/components/alert"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Custom ellipsis

`collapse-text` replaces the default `…` text of the collapse ellipsis.

<DemoBlock title="Custom ellipsis">
  <oas-breadcrumb collapsed max-items="4" collapse-text="More" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Data Display","href":"/components/table"},{"label":"Feedback","href":"/components/alert"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Collapse expand event

Clicking the collapse ellipsis to **expand** the dropdown fires `oas-collapse-click` with `detail: { collapsedItems }` (the original array of collapsed items) — hosts can draw their own collapse panel; collapsing does not fire it.

<DemoBlock title="Collapse expand event (oas-collapse-click)">
  <oas-breadcrumb id="bc-collapse-ev" collapsed max-items="4" onoas-collapse-click="breadcrumbCollapseLog(event)" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Data Display","href":"/components/table"},{"label":"Settings","href":"/components/settings"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-collapse-ev-result" type="info">Not expanded yet</oas-tag>
</DemoBlock>

## Declarative child channel

Besides the `items` JSON, you can write items declaratively with `<oas-breadcrumb-item>` (the `items` attribute **wins when explicitly set**). The default slot text is the label; attributes map to the `items` fields: `href`/`target`/`icon`/`disabled`/`max-width`/`separator`/`dropdown`/`active`. Child additions/removals, attribute and text changes re-render automatically.

<DemoBlock title="Child channel basic">
  <oas-breadcrumb>
    <oas-breadcrumb-item href="/">Home</oas-breadcrumb-item>
    <oas-breadcrumb-item href="/components">Components</oas-breadcrumb-item>
    <oas-breadcrumb-item>Breadcrumb</oas-breadcrumb-item>
  </oas-breadcrumb>
</DemoBlock>

<DemoBlock title="With icons and attributes">
  <oas-breadcrumb>
    <oas-breadcrumb-item href="/" icon="star">Home</oas-breadcrumb-item>
    <oas-breadcrumb-item href="/components" target="_blank">Components (new tab)</oas-breadcrumb-item>
    <oas-breadcrumb-item disabled>Deprecated</oas-breadcrumb-item>
    <oas-breadcrumb-item max-width="110" href="/components/breadcrumb">A rather long breadcrumb item title</oas-breadcrumb-item>
  </oas-breadcrumb>
</DemoBlock>

### Custom separators (child channel)

Place `<oas-breadcrumb-separator>` between two items; its content can be arbitrary nodes (text / icon / inline elements). The per-item `separator` attribute accepts text or icon names, and a `slot="separator"` child element accepts arbitrary nodes.

<DemoBlock title="Standalone separator element">
  <oas-breadcrumb>
    <oas-breadcrumb-item href="/">Home</oas-breadcrumb-item>
    <oas-breadcrumb-separator>→</oas-breadcrumb-separator>
    <oas-breadcrumb-item href="/components">Components</oas-breadcrumb-item>
    <oas-breadcrumb-separator><span style="color: var(--oas-color-primary)">›</span></oas-breadcrumb-separator>
    <oas-breadcrumb-item>Breadcrumb</oas-breadcrumb-item>
  </oas-breadcrumb>
</DemoBlock>

<DemoBlock title="Per-item separator (attribute / slot)">
  <oas-breadcrumb>
    <oas-breadcrumb-item href="/" separator="heart">Home</oas-breadcrumb-item>
    <oas-breadcrumb-item href="/components">Components<span slot="separator">·</span></oas-breadcrumb-item>
    <oas-breadcrumb-item>Breadcrumb</oas-breadcrumb-item>
  </oas-breadcrumb>
</DemoBlock>

## Hierarchy indentation visual

The breadcrumb is flat by default; a pure-CSS trick can produce an indented "level" look (hide separators + indent items in order — no API involved). Idea: make `::part(nav)` vertical, hide `::part(separator)`, and increase `padding-left` on `::part(item):nth-child()` by occurrence order.

<DemoBlock title="Hierarchy indentation (pure CSS)">
  <oas-breadcrumb class="bc-hierarchy" separator="/" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

<style>
.bc-hierarchy::part(nav) {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--oas-space-1);
}
.bc-hierarchy::part(separator) {
  display: none;
}
.bc-hierarchy::part(item):nth-child(3) {
  padding-left: 20px;
}
.bc-hierarchy::part(item):nth-child(5) {
  padding-left: 40px;
}
.bc-hierarchy::part(item):nth-child(7) {
  padding-left: 60px;
}
</style>

## Item with dropdown (oas-dropdown combo)

The `dropdown` attribute on `oas-breadcrumb-item` turns the item into a dropdown trigger (link-list menu; selecting an item fires `oas-select`). Combined with `oas-dropdown` you get richer menu content; selections from both channels can feed one shared state.

<DemoBlock title="Item with dropdown">
  <oas-breadcrumb onoas-select="breadcrumbMenuLog(event)">
    <oas-breadcrumb-item href="/">Home</oas-breadcrumb-item>
    <oas-breadcrumb-item dropdown='[{"label":"Components overview","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Deprecated","href":"/gone","disabled":true}]'>More</oas-breadcrumb-item>
    <oas-breadcrumb-item>Breadcrumb</oas-breadcrumb-item>
  </oas-breadcrumb>
  <div style="margin-top: 8px">
    <oas-dropdown items='[{"label":"Breadcrumb docs","value":"breadcrumb"},{"label":"Anchor docs","value":"anchor"}]' placement="bottom" onoas-select="breadcrumbMenuLog(event)">
      <oas-button type="default" size="small">oas-dropdown combo menu</oas-button>
    </oas-dropdown>
  </div>
  <oas-tag id="bc-menu-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Single-line ellipsis

`ellipsis`: the breadcrumb never wraps; link text is truncated with an ellipsis when the container is narrow, and links keep the full `title` (hover to see the complete name).

<DemoBlock title="Single-line ellipsis">
  <div style="max-width: 260px; overflow: hidden; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px 12px">
    <oas-breadcrumb id="bc-ellipsis" ellipsis items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Data Display","href":"/components/table"},{"label":"A rather long breadcrumb item title","href":"/components/long-title"}]'></oas-breadcrumb>
  </div>
</DemoBlock>

## Per-item width truncation

`max-item-width` (px) truncates each item globally with an ellipsis + `title` tooltip; the `maxWidth` field overrides per item.

<DemoBlock title="Per-item width truncation">
  <oas-breadcrumb max-item-width="140" items='[{"label":"Home","href":"/"},{"label":"An unusually long component name to demo global truncation","href":"/components/long"},{"label":"Custom width","href":"/components/custom","maxWidth":80},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Sizes

`size` presets: `small` / `medium` (default) / `large`.

<DemoBlock title="Sizes">
  <oas-breadcrumb size="small" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-breadcrumb size="medium" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-breadcrumb size="large" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Item dropdowns

The `dropdown` array on an `items` entry turns that item into a dropdown trigger (click to expand; selecting a menu item fires `oas-select`).

<DemoBlock title="Item dropdowns">
  <oas-breadcrumb onoas-select="breadcrumbLog(event)" items='[{"label":"Home","href":"/"},{"label":"More","dropdown":[{"label":"Components overview","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Deprecated","href":"/gone","disabled":true}]},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-dropdown-result" type="info">Nothing clicked</oas-tag>
</DemoBlock>

## Clickable last item / current semantics

- `active: true` on an item explicitly marks it as current (`aria-current="page"` moves there); other items with `href` remain clickable.
- `active-last`: the last (current) item stays clickable even with `href`, while keeping `aria-current="page"`.

<DemoBlock title="Explicit active">
  <oas-breadcrumb items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components","active":true},{"label":"Navigation","href":"/components/anchor"}]'></oas-breadcrumb>
</DemoBlock>

<DemoBlock title="Clickable last item (active-last)">
  <oas-breadcrumb active-last onoas-select="breadcrumbLog(event)" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Current page","href":"/components/breadcrumb"}]'></oas-breadcrumb>
  <oas-tag id="bc-active-last-result" type="info">Nothing clicked</oas-tag>
</DemoBlock>

## Keyboard arrow navigation

With focus on any link or the ellipsis button, `←` / `→` cycle focus across items; `Home` / `End` jump to the first/last. `Esc` closes an open dropdown trigger.

<DemoBlock title="Keyboard navigation">
  <oas-breadcrumb items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Navigation","href":"/components/anchor"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Color variants

`color` sets the semantic color of the current item and link hover (`primary` / `success` / `warning` / `danger` / `info`); colors come from tokens (dark variants included).

<DemoBlock title="Color variants">
  <oas-breadcrumb color="primary" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-breadcrumb color="danger" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <oas-breadcrumb color="success" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Underline variant

`variant="underline"`: links and the current item are permanently underlined.

<DemoBlock title="Underline variant">
  <oas-breadcrumb variant="underline" items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
</DemoBlock>

## Structured data

The component injects schema.org BreadcrumbList JSON-LD into the host's light DOM (`<script type="application/ld+json">`, only items with `href`), giving search engines a breadcrumb trail without handwritten microdata.

<DemoBlock title="Structured data">
  <oas-breadcrumb items='[{"label":"Home","href":"/"},{"label":"Components","href":"/components"},{"label":"Breadcrumb"}]'></oas-breadcrumb>
  <p style="font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">
    View page source: a <code>script[data-oas-breadcrumb-ld]</code> already exists inside the host.
  </p>
</DemoBlock>

## Edge cases

<DemoBlock title="Empty data">
  <oas-breadcrumb></oas-breadcrumb>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.breadcrumbLog = (e) => {
    for (const id of ['bc-result', 'bc-collapsed-result', 'bc-dropdown-result', 'bc-active-last-result', 'bc-real-result']) {
      const tag = document.getElementById(id)
      if (tag) tag.textContent = `Clicked: ${e.detail.value}`
    }
  }
  window.breadcrumbCollapseLog = (e) => {
    const tag = document.getElementById('bc-collapse-ev-result')
    if (tag) {
      const labels = e.detail.collapsedItems.map((i) => i.label).join(', ')
      tag.textContent = `Expanded: ${e.detail.collapsedItems.length} collapsed (${labels})`
    }
  }
  window.breadcrumbMenuLog = (e) => {
    const tag = document.getElementById('bc-menu-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value ?? e.detail.href ?? ''}`
  }
})
</script>

## Font Size

Font size follows the outer context (inherited) by default; override with the CSS variable `--oas-breadcrumb-font` (e.g. `18px`).

## API

### oas-breadcrumb

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active-last` | Keep the last item clickable: when the current (last) item has `href`, render it as a link (still carrying `aria-current="page"`) | `boolean` | — |
| `collapse-text` | Custom text for the collapse ellipsis (default `…`) | `string` | `…` |
| `collapsed` | Collapse mode: when there are more items than `max-items`, middle items collapse into `…`; click to expand the dropdown | `boolean` | — |
| `color` | Visual variant: the current item and link hover use the specified semantic color (`primary`/`success`/`warning`/`danger`/`info`) | `string` | — |
| `ellipsis` | Single-line ellipsis: the breadcrumb never wraps; overflowing link text is truncated with an ellipsis | `boolean` | — |
| `items` | Breadcrumb items JSON: `label`/`href`/`icon`/`disabled`/`target`/`separator`/`dropdown`/`maxWidth`/`active` | `string` | `[]` |
| `items-after-collapse` | Number of items kept after the collapse ellipsis (default `max-items - 2`) | `string` | — |
| `items-before-collapse` | Number of items kept before the collapse ellipsis (default `1`) | `string` | — |
| `max-item-width` | Global max width per item (px): overflow is truncated with an ellipsis + `title` tooltip; per-item `maxWidth` overrides | `string` | — |
| `max-items` | Maximum number of visible items in collapse mode (including `…`); invalid values fall back to `4` | `string` | `4` |
| `separator` | Separator (supports icon names, e.g. `chevron-right`) | `string` | `/` |
| `size` | Size preset: `small`/`medium` (default)/`large` | `string` | `medium` |
| `variant` | Style variant: `underline` (links and the current item are permanently underlined) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-collapse-click` | Fired when the collapse ellipsis is clicked to expand the dropdown (not fired when collapsing), `detail: { collapsedItems }` (the original array of collapsed items, for hosts that want a custom collapse panel) |
| `oas-select` | A link item, a collapsed dropdown item, or an item dropdown item was clicked; `detail: { value: href }` (real links do not block default navigation; hosts may intercept for routing) |

### oas-breadcrumb-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Explicitly mark this item as current (`aria-current="page"`); defaults to the last item | — | — |
| `disabled` | Disabled item: rendered as non-interactive text (`aria-disabled`) | — | — |
| `dropdown` | Link-list dropdown for the item (JSON, e.g. `[{"label":"Child","href":"/a"}]`); the item renders as a dropdown trigger | — | — |
| `href` | Link URL: with `href` the item renders as a native `<a>` (real navigation + still fires `oas-select`) | — | — |
| `icon` | Leading icon (`@oas-ui/icons` registry icon name) | — | — |
| `max-width` | Per-item max width (px): overflow is truncated with an ellipsis + `title` tooltip | — | — |
| `separator` | Per-item separator: overrides the global `separator` (text or icon name); a `slot="separator"` child element also accepts arbitrary nodes | — | — |
| `target` | Link target (`_blank` automatically adds `noopener noreferrer`) | — | — |

| Name | Description |
| --- | --- |
| default | Breadcrumb item label content (default slot text) |

### oas-breadcrumb-separator

| Name | Description |
| --- | --- |
| default | Separator content: arbitrary nodes (text / icon / inline elements) |

`nav` + `aria-label="面包屑"`, the last item has `aria-current="page"` and is not clickable.
