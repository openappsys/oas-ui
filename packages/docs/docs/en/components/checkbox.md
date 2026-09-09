# Checkbox

An enhanced native `<input type="checkbox">` supporting indeterminate state, checkbox groups, select-all linkage, count limits, and a card variant.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-checkbox checked>Checked</oas-checkbox>
    <oas-checkbox>Unchecked</oas-checkbox>
  </oas-space>
</DemoBlock>

## Sizes

<DemoBlock title="Three sizes (size)">
  <oas-space direction="column">
    <oas-checkbox size="small" checked>small (14px)</oas-checkbox>
    <oas-checkbox checked>medium (default, 16px)</oas-checkbox>
    <oas-checkbox size="large" checked>large (18px)</oas-checkbox>
  </oas-space>
</DemoBlock>

`size` controls both the box size and the font size; set on the group it cascades to all items, while an explicit item `size` wins.

## Indeterminate State

<DemoBlock title="Indeterminate">
  <oas-checkbox indeterminate>Indeterminate</oas-checkbox>
</DemoBlock>

Use it with select-all linkage scenarios (see below) to express "partially selected". Indeterminate is a visual state only — clicking still toggles the two-state value (`aria-checked="mixed"` stays in sync).

## Disabled

<DemoBlock title="Disabled">
  <oas-space>
    <oas-checkbox disabled checked>Checked & disabled</oas-checkbox>
    <oas-checkbox disabled>Unchecked & disabled</oas-checkbox>
  </oas-space>
</DemoBlock>

## Readonly

<DemoBlock title="Readonly">
  <oas-space>
    <oas-checkbox readonly checked>Readonly & checked</oas-checkbox>
    <oas-checkbox readonly>Readonly unchecked</oas-checkbox>
  </oas-space>
</DemoBlock>

`readonly` and `disabled` carry distinct form semantics: focusable, reachable via Tab, value still submits, but clicks (and Space) never toggle.

## Validation Status

<DemoBlock title="Validation status (status)">
  <oas-space direction="column">
    <oas-checkbox status="success" checked>Validation passed</oas-checkbox>
    <oas-checkbox status="warning" checked>Warning item</oas-checkbox>
    <oas-checkbox status="error">Required item unchecked</oas-checkbox>
  </oas-space>
</DemoBlock>

`status="error"` automatically sets `aria-invalid="true"`; in the card variant the status color lands on the border.

## Description & Label Position

<DemoBlock title="Description (description) and label position (label-position)">
  <oas-space direction="column">
    <oas-checkbox checked description="We will confirm the shipping address again before checkout">Save shipping address</oas-checkbox>
    <oas-checkbox label-position="start" checked>Label on the start side (label-position="start")</oas-checkbox>
  </oas-space>
</DemoBlock>

The `description` attribute renders as secondary text below the label; a `<span slot="description">` can distribute rich content instead (takes priority over the attribute). `label-position="start"` moves the text to the start side of the box (mirrors automatically in RTL).

## Custom Indicator

<DemoBlock title="Custom indicator (checked-icon / indeterminate-icon slots)">
  <oas-space>
    <oas-checkbox value="fav" checked>
      Favorite
      <template slot="checked-icon"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14 C4 10.5 2 8.5 2 6 A3.2 3.2 0 0 1 8 4.4 A3.2 3.2 0 0 1 14 6 C14 8.5 12 10.5 8 14 Z" fill="var(--oas-color-danger)"/></svg></template>
    </oas-checkbox>
    <oas-checkbox>
      Native (comparison)
    </oas-checkbox>
  </oas-space>
</DemoBlock>

Slot content takes over the checked-state icon (`template[slot]` or a direct element both work); the unchecked state falls back to a default hollow outline, overridable via `::part(box)`. The `indeterminate-icon` slot customizes the half-checked icon, pairing well with `check-all` linkage.

## Checkbox Group

<DemoBlock title="Checkbox group">
  <oas-checkbox-group value='["a"]'>
    <span slot="label">Fruits (multiple selectable)</span>
    <oas-checkbox value="a">Apple</oas-checkbox>
    <oas-checkbox value="b">Banana</oas-checkbox>
    <oas-checkbox value="c">Orange</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

The group is controlled via `value` (a JSON array); each item's `value` acts as the option identifier. `size` / `status` / `readonly` set on the group cascade to items.

## Button-style Multi-select (oas-toggle-group)

A "button-style" checkbox (like some libraries' `checkbox-button`) is served here by **`oas-toggle-group` in multiple mode** (button-style multi-select group: each item toggles independently via `multiple`, roving-tabindex keyboard, even-width fills, etc.), while the checkbox itself keeps the standard box form. The split mirrors the ecosystem: use checkbox-group for standard multi-select, toggle-group for button-style multi-select.

<DemoBlock title="Button-style multi-select (toggle-group)">
  <oas-toggle-group multiple value='["a"]'>
    <oas-toggle-item value="a">Apple</oas-toggle-item>
    <oas-toggle-item value="b">Banana</oas-toggle-item>
    <oas-toggle-item value="c">Orange</oas-toggle-item>
  </oas-toggle-group>
</DemoBlock>

## Horizontal Group

<DemoBlock title="Horizontal direction (direction)">
  <oas-checkbox-group direction="horizontal" value='["a"]'>
    <span slot="label">Horizontal multiple</span>
    <oas-checkbox value="a">Apple</oas-checkbox>
    <oas-checkbox value="b">Banana</oas-checkbox>
    <oas-checkbox value="c">Orange</oas-checkbox>
    <oas-checkbox value="d">Grape</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

Defaults to `direction="vertical"` (stacked); `horizontal` lays items out in a row and wraps automatically.

## Data-Driven

<DemoBlock title="options data channel">
  <oas-checkbox-group
    value='["wechat"]'
    options='[{"label":"WeChat notify","value":"wechat","description":"Instant push messages"},{"label":"Email notify","value":"email","description":"One digest per day"},{"label":"SMS notify","value":"sms","disabled":true,"description":"Carrier channel under maintenance"}]'
  >
    <span slot="label">Notification channels</span>
  </oas-checkbox-group>
</DemoBlock>

The `options` JSON attribute and declarative child elements form dual channels: when `options` is explicit, data-driven rendering wins (rendered internally; declarative children step aside). Fields: `label` / `value` / `disabled` / `description` / `checkAll`.

## Count Limits

<DemoBlock title="Count limits (max / min)">
  <div>
    <oas-checkbox-group id="cbg-max" value='["a"]' max="2">
      <span slot="label">Pick at most 2 (unchecked items gray out at the cap)</span>
      <oas-checkbox value="a">Apple</oas-checkbox>
      <oas-checkbox value="b">Banana</oas-checkbox>
      <oas-checkbox value="c">Orange</oas-checkbox>
    </oas-checkbox-group>
    <oas-checkbox-group id="cbg-min" value='["a"]' min="1" style="margin-top: var(--oas-space-4)">
      <span slot="label">Keep at least 1 (checked items cannot be unchecked)</span>
      <oas-checkbox value="a">Apple</oas-checkbox>
      <oas-checkbox value="b">Banana</oas-checkbox>
      <oas-checkbox value="c">Orange</oas-checkbox>
    </oas-checkbox-group>
    <div id="cbg-limit-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2); min-height: 20px"></div>
  </div>
</DemoBlock>

When `max` is reached, unchecked items are blocked and `oas-exceed-limit` fires (`detail: { value, max }`); when `min` is reached, checked items cannot be unchecked. Checked items can always be unchecked (max) and unchecked items can always be picked (min) — the limits are symmetric and one-directional.

## Select All / Indeterminate Linkage

<DemoBlock title="Select-all linkage (check-all)">
  <oas-checkbox-group id="cbg-all" value='["a"]'>
    <span slot="label">Permissions</span>
    <oas-checkbox check-all>Select all</oas-checkbox>
    <oas-checkbox value="a">View</oas-checkbox>
    <oas-checkbox value="b">Edit</oas-checkbox>
    <oas-checkbox value="c" disabled>Delete (disabled items skip linkage)</oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

Mark an item with `check-all` and the group links it automatically: clicking it toggles all items, and item changes write back the select-all item's checked/indeterminate state in real time. The select-all item never joins the group `value`; disabled items are skipped; combined with `max`, select-all truncates to the cap and shows indeterminate. No host-side glue script needed.

## Card Variant

<DemoBlock title="Card variant (variant=card)">
  <oas-checkbox-group value='["pro"]' direction="horizontal">
    <span slot="label">Choose a plan</span>
    <oas-checkbox variant="card" value="basic" description="For individuals and teams up to 3">
      <strong>Basic</strong>
      <div style="font-size: var(--oas-font-size-lg); margin-top: 2px">$29 <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">/mo</span></div>
    </oas-checkbox>
    <oas-checkbox variant="card" value="pro" description="Unlimited members and projects">
      <strong>Pro</strong>
      <div style="font-size: var(--oas-font-size-lg); margin-top: 2px">$99 <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">/mo</span></div>
    </oas-checkbox>
    <oas-checkbox variant="card" value="ent" description="Dedicated support and custom integrations" disabled>
      <strong>Enterprise</strong>
      <div style="font-size: var(--oas-font-size-lg); margin-top: 2px">Contact sales</div>
    </oas-checkbox>
  </oas-checkbox-group>
</DemoBlock>

`variant="card"` switches to a card skin: the whole block is clickable, the selected state tints the border, hover gives feedback; put titles/prices in the default slot and use `description` for subtext. Card items can join a group (driven by the group `value` as usual) or stand alone.

## Events

<DemoBlock title="Events (oas-change / oas-focus / oas-blur)">
  <oas-space>
    <oas-checkbox-group id="cbg-event" value='["a"]'>
      <oas-checkbox value="a">Apple</oas-checkbox>
      <oas-checkbox value="b">Banana</oas-checkbox>
      <oas-checkbox value="c">Orange</oas-checkbox>
    </oas-checkbox-group>
    <span id="cbg-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
  </oas-space>
</DemoBlock>

An item dispatches `oas-change` (`detail: { checked, value }`) plus `oas-focus` / `oas-blur`; the group dispatches `oas-change` (`detail: { value: string[] }`) and group-level `oas-focus` / `oas-blur` (moves between items do not misfire).

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const group = document.getElementById('cbg-event')
  const out = document.getElementById('cbg-output')
  group?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })
  group?.addEventListener('oas-focus', () => {
    out.textContent = 'oas-focus (group gained focus)'
  })
  group?.addEventListener('oas-blur', () => {
    out.textContent = 'oas-blur (group lost focus)'
  })

  const maxGroup = document.getElementById('cbg-max')
  const minGroup = document.getElementById('cbg-min')
  const limitOut = document.getElementById('cbg-limit-out')
  maxGroup?.addEventListener('oas-exceed-limit', (e) => {
    limitOut.textContent = `oas-exceed-limit: cap of ${e.detail.max} reached, "${e.detail.value}" cannot be picked`
  })
  minGroup?.addEventListener('oas-change', () => {
    limitOut.textContent = ''
  })
  maxGroup?.addEventListener('oas-change', () => {
    limitOut.textContent = ''
  })
})
</script>

## API

### oas-checkbox

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `check-all` | In-group select-all marker: clicking toggles all items, item changes write back its checked/indeterminate state; the item never joins the group value (cross-component attribute read by oas-checkbox-group) | — | — |
| `checked` | Whether checked | `boolean` | — |
| `description` | Secondary text rendered below the label; a `slot="description"` distribution takes priority | `string` | — |
| `disabled` | Disabled | `boolean` | — |
| `indeterminate` | Indeterminate state (visual only; clicking still toggles the two-state value; aria-checked syncs to mixed) | `boolean` | — |
| `label-position` | Label position: `end` (default, box left / text right) / `start` (text left; mirrors automatically in RTL) | — | — |
| `readonly` | Readonly: focusable and Tab-reachable, value still submits, but clicks (and Space) never toggle (distinct form semantics from disabled) | `boolean` | — |
| `size` | Size: `small` (14px) / `medium` (default 16px) / `large` (18px), box and font scale together; a group-level value cascades to items while an explicit item value wins | `string` | `medium` |
| `status` | Validation status: `error` / `warning` / `success` (tints the box; error also sets host aria-invalid) | `string` | — |
| `value` | Option identifier | `string` | — |
| `variant` | Variant: `default` / `card` (whole block clickable, selected border tint, hover feedback) | `string` | — |

| Event | Description |
| --- | --- |
| `oas-blur` | The checkbox lost focus |
| `oas-change` | Checked change, `detail: { checked, value }` |
| `oas-focus` | The checkbox gained focus |
| `oas-limit-blocked` | Group count-limit block signal (the group re-dispatches it as oas-exceed-limit; no such block when used standalone) |

| Name | Description |
| --- | --- |
| default | Label content (rich text/links allowed) |
| `checked-icon` | Custom checked indicator (template[slot] or a direct element; unchecked falls back to the default hollow outline) |
| `description` | Description distribution channel (takes priority over the description attribute) |
| `indeterminate-icon` | Custom indeterminate indicator (pairs with check-all linkage) |

### oas-checkbox-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `direction` | Layout direction: `vertical` (default) / `horizontal` (row layout with wrapping) | `string` | `vertical` |
| `disabled` | Disable the whole group (cascades to items without overriding their own explicit disabled) | `boolean` | — |
| `max` | Selection cap: at the cap unchecked items gray out and block with oas-exceed-limit; checked items can still be unchecked | — | — |
| `min` | Selection floor: at the floor checked items block unchecking; unchecked items are unaffected | — | — |
| `options` | Data channel: JSON `[{ label, value, disabled?, description?, checkAll? }]`; when explicit, data-driven rendering wins over declarative children | `CheckboxOption[] \| string` | — |
| `readonly` | Readonly (cascades to items): focusable, no toggling | `boolean` | — |
| `size` | Size (cascades to items): `small` / `medium` (default) / `large` | `string` | — |
| `status` | Validation status (cascades to items): `error` / `warning` / `success` | `string` | — |
| `value` | Group value (JSON string array of checked item values) | `string` | `[]` |

| Event | Description |
| --- | --- |
| `oas-blur` | Fired when focus leaves the group |
| `oas-change` | Group value change, `detail: { value: string[] }` (includes select-all linkage and in-limit changes) |
| `oas-exceed-limit` | Out-of-cap check attempt after max is reached, `detail: { value, max }` |
| `oas-focus` | Any item inside the group gained focus (moves between items do not misfire) |

| Name | Description |
| --- | --- |
| default | Declarative item channel (`<oas-checkbox>` children; steps aside when options is explicit) |
| `label` | Group title (rendered into the legend) |
