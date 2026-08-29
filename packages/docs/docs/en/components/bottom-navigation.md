# BottomNavigation

A mobile bottom navigation bar: `role="tablist"` with each item `role="tab"` + synced `aria-selected`; arrow keys move focus (roving tabindex), Enter/Space selects; the active item uses the primary color plus an icon, with a thin top divider.

> The layout is static by default; add the `fixed` attribute to pin it to the bottom of the screen (`position: fixed; bottom: 0` — preferably as a direct child of `body` to avoid being carried away by a scroll container).

## Basic usage

Pass a JSON array via `items` `[{ label, value, icon? }]`; `icon` is an icon name from `@oas-ui/icons` iconRegistry. When `value` is not set, the first item is active by default.

<DemoBlock title="Basic usage">
  <oas-bottom-navigation id="bn-basic" value="home" style="width: 100%; max-width: 480px" items='[{"label":"Home","icon":"user","value":"home"},{"label":"Search","icon":"search","value":"search"},{"label":"Messages","icon":"mail","value":"mail"},{"label":"Mine","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## Controlled value

The `value` attribute is controlled: setting it externally switches the active item, and component interaction also writes the attribute back and fires `oas-change`.

<DemoBlock title="Controlled switching">
  <oas-bottom-navigation id="bn-ctrl" value="home" style="width: 100%; max-width: 480px" items='[{"label":"Home","icon":"user","value":"home"},{"label":"Favorites","icon":"star","value":"favorite"},{"label":"Mine","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
  <oas-button-group>
    <oas-button size="small" type="primary" onclick="bnSet('home')">Home</oas-button>
    <oas-button size="small" onclick="bnSet('favorite')">Favorites</oas-button>
    <oas-button size="small" onclick="bnSet('mine')">Mine</oas-button>
  </oas-button-group>
  <span id="bn-out" style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Disabled items

`disabled` items sync `aria-disabled`, cannot be selected by click, and are skipped by arrow-key navigation.

<DemoBlock title="Disabled items">
  <oas-bottom-navigation value="home" style="width: 100%; max-width: 480px" items='[{"label":"Home","icon":"user","value":"home"},{"label":"Discover","icon":"heart","value":"discover","disabled":true},{"label":"Mine","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## Fixed to the bottom (fixed)

Add the `fixed` attribute to pin it to the bottom of the viewport (`bottom: 0`). This demo page uses a static layout to avoid covering content; use `fixed` in real mobile scenarios.

<DemoBlock title="fixed demo (kept static here)">
  <oas-bottom-navigation fixed style="position: static; width: 100%; max-width: 480px" items='[{"label":"Home","icon":"user","value":"home"},{"label":"Search","icon":"search","value":"search"},{"label":"Mine","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const ctrl = document.getElementById('bn-ctrl')
  const out = document.getElementById('bn-out')
  ctrl?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: { value: "${e.detail.value}" }`
  })
  window.bnSet = (value) => ctrl?.setAttribute('value', value)
})
</script>

## Declarative child channel

Besides the `items` JSON, items can be declared with `<oas-bottom-navigation-item>` child elements (the `items` attribute **takes priority when explicitly set**; otherwise children are parsed and converge to the same rendering path). The default slot text becomes the label; attributes map to the `BottomNavItem` fields: `value` / `icon` / `disabled` / `badge`. Child additions/removals, attribute and text changes re-render automatically (MutationObserver).

<DemoBlock title="Declarative children (icon / disabled)">
  <oas-bottom-navigation id="bn-decl" value="home" style="width: 100%; max-width: 480px">
    <oas-bottom-navigation-item value="home" icon="user">Home</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="discover" icon="heart" disabled>Discover</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="mine" icon="gear">Mine</oas-bottom-navigation-item>
  </oas-bottom-navigation>
</DemoBlock>

## Corner badge (badge)

Add `badge` (number/text) to an item to render a top-right corner badge overlaid on the icon; unset items render no badge. The badge styling reuses the badge component's tokens (`--oas-badge-bg` / `--oas-badge-on-color`, default danger); the items channel and the declarative child channel behave identically.

<DemoBlock title="Badges (items channel)">
  <oas-bottom-navigation id="bn-badge" value="home" style="width: 100%; max-width: 480px" items='[{"label":"Home","icon":"user","value":"home"},{"label":"Messages","icon":"mail","value":"mail","badge":"5"},{"label":"Mine","icon":"gear","value":"mine","badge":"new"}]'></oas-bottom-navigation>
</DemoBlock>

<DemoBlock title="Badges (child channel)">
  <oas-bottom-navigation id="bn-badge-decl" value="home" style="width: 100%; max-width: 480px">
    <oas-bottom-navigation-item value="home" icon="user">Home</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="mail" icon="mail" badge="99+">Messages</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="mine" icon="gear">Mine</oas-bottom-navigation-item>
  </oas-bottom-navigation>
</DemoBlock>

## Safe area (safe-area)

The `safe-area` boolean attribute (to be combined with `fixed`): in fixed mode it adds `env(safe-area-inset-bottom)` bottom padding to avoid the home indicator of notched screens; it has no effect in non-fixed mode. This demo page stays static; use `fixed` + `safe-area` on real mobile devices.

<DemoBlock title="safe-area demo (kept static here)">
  <oas-bottom-navigation fixed safe-area style="position: static; width: 100%; max-width: 480px" items='[{"label":"Home","icon":"user","value":"home"},{"label":"Search","icon":"search","value":"search"},{"label":"Mine","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## Variable customization

Pure CSS variable openings (no attribute); dark mode picks up tokens automatically:

- `--oas-bottom-navigation-active-color`: active item color, defaults to the primary token
- `--oas-bottom-navigation-height`: bar height, defaults to `56px` (the fixed bar height in fixed mode)

<DemoBlock title="Variable customization (active color + height)">
  <oas-bottom-navigation id="bn-var" value="home" style="width: 100%; max-width: 480px; --oas-bottom-navigation-active-color: var(--oas-color-success); --oas-bottom-navigation-height: 64px" items='[{"label":"Home","icon":"user","value":"home"},{"label":"Search","icon":"search","value":"search"},{"label":"Mine","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## API

### oas-bottom-navigation

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `fixed` | Pin to the viewport bottom (`position: fixed; bottom: 0`) | `boolean` | — |
| `items` | Navigation items JSON | `string` | `[]` |
| `safe-area` | Adds bottom safe-area padding (`env(safe-area-inset-bottom)`) in fixed mode to avoid the home indicator of notched screens; no effect in non-fixed mode | `boolean` | — |
| `value` | Value of the active item; defaults to the first available item | — | — |

| Event | Description |
| --- | --- |
| `oas-change` | The active item changed, `detail: { value }` |

### oas-bottom-navigation-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `badge` | Top-right corner badge (number/text overlaid on the icon; not rendered when unset) | — | — |
| `disabled` | Disable this item (not selectable, skipped by keyboard) | — | — |
| `icon` | Leading icon (`@oas-ui/icons` registry icon name) | — | — |
| `value` | Selection value (data-carrier field of the declarative child channel) | — | — |

| Name | Description |
| --- | --- |
| default | Bottom-navigation item label content (default slot text) |

`BottomNavItem` fields:

| Field      | Description                                             | Type     |
| ---------- | ------------------------------------------------------- | -------- |
| `label`    | Text                                                    | `string` |
| `value`    | Value (unique identifier)                               | `string` |
| `icon`     | Icon name (a key of `@oas-ui/icons` iconRegistry)     | `string` |
| `disabled` | Disabled (not selectable, skipped by keyboard)          | `boolean`|
| `badge`    | Top-right corner badge (number/text overlaid on the icon; not rendered when unset) | `string` |

Behavior: `role="tablist"` + `role="tab"` + synced `aria-selected` / `aria-disabled`; roving tabindex keeps only the active item focusable; arrow keys (left/right or up/down) cycle focus among available items (Home/End jump to the ends), Enter/Space selects the focused item; clicking an already-active item does not re-fire; empty `items` renders an empty tablist without errors. The active item uses the primary color plus an icon (iconRegistry inline SVG following `currentColor`), with a thin top divider; `badge` renders a top-right corner badge (overlaid on the icon, badge tokens); `fixed` + `safe-area` adds bottom safe-area padding.
