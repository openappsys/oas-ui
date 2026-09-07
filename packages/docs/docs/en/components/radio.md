# Radio

An enhanced native `<input type="radio">` supporting group keyboard navigation (radiogroup pattern), data-driven options, and a card variant.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-radio name="demo-basic" checked>Option one</oas-radio>
  <oas-radio name="demo-basic">Option two</oas-radio>
</DemoBlock>

Radios sharing a `name` are mutually exclusive (the component syncs across Shadow DOM boundaries); without a name each stays independent — use a shared name or `oas-radio-group` for exclusivity.

## Sizes

<DemoBlock title="Three sizes (size)">
  <oas-space direction="column">
    <oas-radio size="small" name="demo-size" checked>small (14px)</oas-radio>
    <oas-radio name="demo-size" checked>medium (default, 16px)</oas-radio>
    <oas-radio size="large" name="demo-size" checked>large (18px)</oas-radio>
  </oas-space>
</DemoBlock>

`size` controls both the dot size and the font size; set on the group it cascades to all items, while an explicit item `size` wins.

## Radio Group (Keyboard Accessible)

<DemoBlock title="Radio group">
  <oas-radio-group value="wechat">
    <span slot="label">Payment method</span>
    <oas-radio value="wechat">WeChat Pay</oas-radio>
    <oas-radio value="alipay">Alipay</oas-radio>
    <oas-radio value="card">Bank card</oas-radio>
  </oas-radio-group>
</DemoBlock>

The group is controlled via `value`; each item's `value` acts as the option identifier, and the group manages exclusivity.

The group follows the WAI-ARIA radiogroup keyboard pattern: **Tab enters the group once (stopping at the checked item, or the first item when none is checked)**, `↑` `↓` `←` `→` move and select immediately (wrapping around, skipping disabled items), `Home` / `End` jump to the first/last enabled item. Native inputs each live inside their own Shadow DOM, so the browser's same-name arrow grouping breaks across shadow boundaries — the component fills the gap with a host-level roving tabindex and arrow key handling.

## Single Disabled

<DemoBlock title="Single disabled">
  <oas-radio name="radio-item-disabled" checked>Selectable</oas-radio>
  <oas-radio name="radio-item-disabled" disabled>Disabled</oas-radio>
  <oas-radio name="radio-item-disabled" disabled checked>Disabled & checked</oas-radio>
</DemoBlock>

A single item's `disabled` only disables that item: not clickable, not focusable (native disabled semantics); the rest of the group is unaffected. Disable the whole group via `oas-radio-group`'s `disabled` (below).

## Disabled

<DemoBlock title="Disabled">
  <oas-radio-group disabled value="a">
    <oas-radio value="a">Checked & disabled</oas-radio>
    <oas-radio value="b">Disabled</oas-radio>
    <oas-radio value="c">Disabled</oas-radio>
  </oas-radio-group>
</DemoBlock>

## Readonly

<DemoBlock title="Readonly">
  <oas-radio-group value="a" readonly>
    <span slot="label">Readonly group (focusable, arrows do not switch)</span>
    <oas-radio value="a">Option A</oas-radio>
    <oas-radio value="b">Option B</oas-radio>
    <oas-radio value="c">Option C</oas-radio>
  </oas-radio-group>
</DemoBlock>

`readonly` and `disabled` carry distinct form semantics: focusable, reachable via Tab, value still submits, but clicks (and Space) plus arrow keys never switch. Can also be set per item.

## Validation Status

<DemoBlock title="Validation status (status, per-item supported)">
  <oas-space direction="column">
    <oas-radio-group value="a" status="error">
      <span slot="label">Choose a delivery method (required)</span>
      <oas-radio value="a">Same-day courier</oas-radio>
      <oas-radio value="b">Standard express</oas-radio>
    </oas-radio-group>
    <oas-space>
      <oas-radio status="success" name="radio-status" checked>Item success</oas-radio>
      <oas-radio status="warning" name="radio-status">Item warning</oas-radio>
      <oas-radio status="error" name="radio-status">Item error</oas-radio>
    </oas-space>
  </oas-space>
</DemoBlock>

A group-level `status` cascades to all items; an explicit item `status` wins over the group value. `status="error"` automatically sets `aria-invalid="true"`; in the card variant the status color lands on the border.

## Description & Label Position

<DemoBlock title="Description (description) and label position (label-position)">
  <oas-space direction="column">
    <oas-radio-group value="stand">
      <oas-radio value="stand" description="Arrives within 30 minutes, priced by distance">Same-day courier</oas-radio>
      <oas-radio value="expr" description="Next-day delivery, nationwide">Standard express</oas-radio>
      <oas-radio value="pick" description="Pick up in store, free shipping">Store pickup</oas-radio>
    </oas-radio-group>
    <oas-radio label-position="start" name="radio-lp" checked>Label on the start side (label-position="start")</oas-radio>
  </oas-space>
</DemoBlock>

The `description` attribute renders as secondary text below the label (per-option subtext); a `<span slot="description">` can distribute rich content instead (takes priority over the attribute). `label-position="start"` moves the text to the start side of the dot (mirrors automatically in RTL).

## Custom Indicator

<DemoBlock title="Custom indicator (checked-icon slot)">
  <oas-space>
    <oas-radio name="radio-icon" value="like" checked>
      Like
      <template slot="checked-icon"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 7 L7 7 L7 2 L9 2 L9 7 L14 7 L14 9 L9 9 L9 14 L7 14 L7 9 L2 9 Z" fill="var(--oas-color-primary)"/></svg></template>
    </oas-radio>
    <oas-radio name="radio-icon" value="plain">Native (comparison)</oas-radio>
  </oas-space>
</DemoBlock>

Slot content takes over the checked-state icon (`template[slot]` or a direct element both work); the unchecked state falls back to a default hollow circle, overridable via `::part(box)`.

## Horizontal Group

<DemoBlock title="Horizontal direction (direction)">
  <oas-radio-group direction="horizontal" value="male">
    <span slot="label">Gender</span>
    <oas-radio value="male">Male</oas-radio>
    <oas-radio value="female">Female</oas-radio>
    <oas-radio value="secret">Prefer not to say</oas-radio>
  </oas-radio-group>
</DemoBlock>

Defaults to `direction="vertical"` (stacked); `horizontal` lays items out in a row and wraps automatically.

## Data-Driven

<DemoBlock title="options data channel">
  <oas-radio-group
    value="stand"
    options='[{"label":"Same-day courier","value":"stand","description":"Arrives within 30 minutes"},{"label":"Standard express","value":"expr","description":"Next-day delivery, nationwide"},{"label":"Cold chain","value":"cold","disabled":true,"description":"Not yet available in your region"}]'
  >
    <span slot="label">Delivery method</span>
  </oas-radio-group>
</DemoBlock>

The `options` JSON attribute and declarative child elements form dual channels: when `options` is explicit, data-driven rendering wins (rendered internally; declarative children step aside). Fields: `label` / `value` / `disabled` / `description`. Data-driven items participate in keyboard navigation as usual.

## Card Variant

<DemoBlock title="Card variant (variant=card)">
  <oas-radio-group value="card" direction="horizontal">
    <span slot="label">Payment method</span>
    <oas-radio variant="card" value="wallet" description="Balance $128.50">
      <strong>Wallet</strong>
    </oas-radio>
    <oas-radio variant="card" value="card" description="Supports debit and credit cards">
      <strong>Bank card</strong>
    </oas-radio>
    <oas-radio variant="card" value="cod" description="Cash on delivery unavailable for some items" disabled>
      <strong>Cash on delivery</strong>
    </oas-radio>
  </oas-radio-group>
</DemoBlock>

`variant="card"` switches to a card skin: the whole block is clickable, the selected state tints the border, hover gives feedback; put titles in the default slot and use `description` for subtext. Card items can join a group (driven by the group `value`, keyboard navigation intact) or stand alone.

## Events

<DemoBlock title="Events (oas-change / oas-focus / oas-blur)">
  <oas-space>
    <oas-radio-group id="radio-event" value="a">
      <oas-radio value="a">Option A</oas-radio>
      <oas-radio value="b">Option B</oas-radio>
      <oas-radio value="c">Option C</oas-radio>
    </oas-radio-group>
    <span id="radio-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
  </oas-space>
</DemoBlock>

An item dispatches `oas-change` (`detail: { checked, value }`) plus `oas-focus` / `oas-blur`; the group dispatches `oas-change` (`detail: { value }`, fired by both clicks and arrow-key selection) and group-level `oas-focus` / `oas-blur` (moves between items do not misfire).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const group = document.getElementById('radio-event')
  const out = document.getElementById('radio-output')
  group?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  group?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus (group gained focus)'
  })
  group?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur (group lost focus)'
  })
})
</script>

## API

### oas-radio

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `checked` | Whether checked | `boolean` | — |
| `description` | Secondary text rendered below the label; a `slot="description"` distribution takes priority | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `label-position` | Label position: `end` (default, dot left / text right) / `start` (text left; mirrors automatically in RTL) | — | — |
| `name` | Native grouping name (same-name exclusivity across Shadow DOM; a group assigns a unique name automatically) | `string` | — |
| `readonly` | Readonly: focusable and Tab-reachable, value still submits, but clicks (and Space) plus arrow keys never switch | `boolean` | — |
| `size` | Size: `small` (14px) / `medium` (default 16px) / `large` (18px), dot and font scale together; a group-level value cascades to items while an explicit item value wins | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success` (tints the dot; error also sets host aria-invalid) | `string` | — |
| `value` | Option identifier | `string` | — |
| `variant` | Variant: `default` / `card` (whole block clickable, selected border tint, hover feedback) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-blur` | The radio lost focus |
| `oas-change` | Selection change, `detail: { checked, value }` |
| `oas-focus` | The radio gained focus |

| Name | Description |
| --- | --- |
| default | Label content (rich text/links allowed) |
| `checked-icon` | Custom checked indicator (template[slot] or a direct element; unchecked falls back to the default hollow circle) |
| `description` | Description distribution channel (takes priority over the description attribute) |

### oas-radio-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `direction` | Layout direction: `vertical` (default) / `horizontal` (row layout with wrapping) | `string` | `vertical` |
| `disabled` | Disable the whole group (cascades to items without overriding their own explicit disabled) | `boolean` | — |
| `options` | Data channel: JSON `[{ label, value, disabled?, description? }]`; when explicit, data-driven rendering wins over declarative children | `RadioOption[] \| string` | — |
| `readonly` | Readonly (cascades to items): focusable, arrow keys do not switch | `boolean` | — |
| `size` | Size (cascades to items): `small` / `medium` (default) / `large` | `string` | — |
| `status` | Validation status (cascades to items): `error` / `warning` / `success`; an explicit item status wins | `string` | — |
| `value` | Group value (the selected item value) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-blur` | Fired when focus leaves the group |
| `oas-change` | Group value change, `detail: { value }` (fired by both clicks and arrow-key selection) |
| `oas-focus` | Any item inside the group gained focus (moves between items do not misfire) |

| Name | Description |
| --- | --- |
| default | Declarative item channel (`<oas-radio>` children; steps aside when options is explicit) |
| `label` | Group title (rendered into the legend) |
