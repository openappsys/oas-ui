---
description: "Goods action bar: icon button group (favorites / shop / cart with badges and pressed state) plus main buttons. Data-driven via JSON attributes; clicks dispatch oas-action-click."
---

# GoodsAction

A product-page bottom bar: icon buttons on the left (favorites / shop / cart, with badges and pressed state) and main buttons on the right (add to cart, buy now). Data comes from the `items` / `actions` JSON attributes; every item can be disabled individually and clicks dispatch `oas-action-click`.

## Basic usage

An item's `key` is its event identity; built-in keys (`favorite` / `shop` / `cart`) get default labels and icons, other keys need their own `label`:

<DemoBlock title="Icon group + main buttons + event feedback">
  <oas-goods-action
    id="ga-basic-en"
    items='[{"key":"favorite","label":"Favorites"},{"key":"shop","label":"Shop"},{"key":"cart","badge":3}]'
    actions='[{"key":"add","text":"Add to cart"},{"key":"buy","text":"Buy now","primary":true}]'
  ></oas-goods-action>
  <p id="ga-basic-out-en" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click any item to see oas-action-click feedback.
  </p>
</DemoBlock>

## Badges and pressed state

`badge` renders when greater than 0 and collapses above 99 to `99+`; `active` marks an icon button as pressed (`aria-pressed="true"`), suited to favorites toggles.

<DemoBlock title="Badge cap + pressed favorites">
  <oas-goods-action
    id="ga-badge-en"
    items='[{"key":"favorite","label":"Favorites","active":true},{"key":"cart","badge":120}]'
    actions='[{"key":"buy","text":"Buy now","primary":true}]'
  ></oas-goods-action>
</DemoBlock>

## Custom icons and disabling

`icon` takes a registered icon name (built-in or `registerIcon`) to override the default icon; an unregistered name warns once in development and falls back to the built-in icon for that key (no built-in icon means no icon, and the text stays readable). `actions[].disabled` disables a single button and the host `disabled` disables everything:

<DemoBlock title="Custom icon / single disabled / globally disabled">
  <oas-goods-action
    items='[{"key":"home","label":"Home","icon":"star"},{"key":"cart","badge":2}]'
    actions='[{"key":"add","text":"Add to cart","disabled":true},{"key":"buy","text":"Buy now","primary":true}]'
  ></oas-goods-action>
  <oas-goods-action
    items='[{"key":"favorite","label":"Favorites"},{"key":"cart","badge":1}]'
    actions='[{"key":"buy","text":"Sold out","primary":true}]'
    disabled
    style="margin-top: var(--oas-space-2)"
  ></oas-goods-action>
</DemoBlock>

## Primary-button loading / visual tiers

`actions[].loading` puts a single primary button into its loading state: clicks are blocked + `aria-busy` + spinner, orthogonal to `disabled` (they can coexist); `actions[].type` switches the visual tier (`default` / `primary` / `success` / `warning` / `danger`), defaulting to the `primary` flag. Without `type` the behavior is unchanged:

<DemoBlock title="Per-item loading + semantic tiers">
  <oas-goods-action
    items='[{"key":"favorite"},{"key":"cart","badge":1}]'
    actions='[{"key":"add","text":"Add to cart","primary":true},{"key":"buy","text":"Submitting","loading":true}]'
  ></oas-goods-action>
  <oas-goods-action
    items='[{"key":"favorite"}]'
    actions='[{"key":"ok","text":"Success","type":"success"},{"key":"warn","text":"Warning","type":"warning"},{"key":"del","text":"Delete","type":"danger"}]'
    style="margin-top: var(--oas-space-2)"
  ></oas-goods-action>
</DemoBlock>

## Custom icon colors

`items[].color` tints an icon button: preset names (`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`) map to the `--oas-preset-<name>-text` safe tokens, other values pass through as declared by the host; once colored, base / hover / pressed states stay pinned to that color:

<DemoBlock title="Custom icon color">
  <oas-goods-action
    items='[{"key":"favorite","color":"red","active":true},{"key":"shop","color":"green"},{"key":"custom","label":"Support","icon":"mail","color":"blue"}]'
    actions='[{"key":"buy","text":"Buy now","primary":true}]'
  ></oas-goods-action>
</DemoBlock>

## Navigation accessible name

`label` overrides the accessible name of the navigation region (`<nav>`), which defaults to the i18n `goodsAction.label`; use it to tell several action bars on one page apart:

<DemoBlock title="Custom accessible name">
  <oas-goods-action
    label="Product actions"
    items='[{"key":"favorite"},{"key":"cart","badge":1}]'
    actions='[{"key":"buy","text":"Buy now","primary":true}]'
  ></oas-goods-action>
</DemoBlock>

## API

### oas-goods-action

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `actions` | Primary buttons JSON array `[{ key, text, primary?, disabled?, loading?, type? }]`; `loading` blocks clicks with `aria-busy` + spinner (orthogonal to disabled); `type` visual tier default / primary / success / warning / danger, defaults to the primary flag | `GoodsActionButton[] \| string` | — |
| `disabled` | Disables everything (honours config-provider injected disabled) | `boolean` | — |
| `items` | Icon buttons JSON array `[{ key, label?, icon?, badge?, active?, color? }]`; built-in keys (`favorite` / `shop` / `cart`) fall back to built-in labels and icons; `color` preset names map to `--oas-preset-<name>-text` tokens, other values pass through as declared | `GoodsActionItem[] \| string` | — |
| `label` | Navigation accessible name, defaults to the i18n `goodsAction.label` | — | — |

#### Events

| Event | Description |
| --- | --- |
| `oas-action-click` | Dispatched when any item is clicked with `{ key, source: 'icon' \| 'button' }`, `detail: { key, source } satisfies GoodsActionDetail` |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-goods-action-item-color` | `var(--oas-color-text-secondary)` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-goods-action').then(() => {
    const out = document.getElementById('ga-basic-out-en')
    document.getElementById('ga-basic-en')?.addEventListener('oas-action-click', (e) => {
      out.textContent = 'oas-action-click: ' + e.detail.key + ' (' + e.detail.source + ')'
    })
  })
})
</script>
