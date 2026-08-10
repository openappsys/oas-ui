# BottomNavigation

A mobile bottom navigation bar: `role="tablist"` with each item `role="tab"` + synced `aria-selected`; arrow keys move focus (roving tabindex), Enter/Space selects; the active item uses the primary color plus an icon, with a thin top divider.

> The layout is static by default; add the `fixed` attribute to pin it to the bottom of the screen (`position: fixed; bottom: 0` — preferably as a direct child of `body` to avoid being carried away by a scroll container).

## Basic usage

Pass a JSON array via `items` `[{ label, value, icon? }]`; `icon` is an icon name from `@oas-ui/icons` iconRegistry. When `value` is not set, the first item is active by default.

<DemoBlock title="Basic usage">
  <oas-bottom-navigation id="bn-basic" value="home" style="width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"搜索","icon":"search","value":"search"},{"label":"消息","icon":"mail","value":"mail"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## Controlled value

The `value` attribute is controlled: setting it externally switches the active item, and component interaction also writes the attribute back and fires `oas-change`.

<DemoBlock title="Controlled switching">
  <oas-bottom-navigation id="bn-ctrl" value="home" style="width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"收藏","icon":"star","value":"favorite"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
  <oas-button-group>
    <oas-button size="small" type="primary" onclick="bnSet('home')">首页</oas-button>
    <oas-button size="small" onclick="bnSet('favorite')">收藏</oas-button>
    <oas-button size="small" onclick="bnSet('mine')">我的</oas-button>
  </oas-button-group>
  <span id="bn-out" style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Disabled items

`disabled` items sync `aria-disabled`, cannot be selected by click, and are skipped by arrow-key navigation.

<DemoBlock title="Disabled items">
  <oas-bottom-navigation value="home" style="width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"发现","icon":"heart","value":"discover","disabled":true},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## Fixed to the bottom (fixed)

Add the `fixed` attribute to pin it to the bottom of the viewport (`bottom: 0`). This demo page uses a static layout to avoid covering content; use `fixed` in real mobile scenarios.

<DemoBlock title="fixed demo (kept static here)">
  <oas-bottom-navigation fixed style="position: static; width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"搜索","icon":"search","value":"search"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
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

## API

| Property | Description                                          | Type             | Default |
| -------- | ---------------------------------------------------- | ---------------- | ------- |
| `items`  | Navigation items JSON                                | `BottomNavItem[]`| `[]`    |
| `value`  | Value of the active item; defaults to the first available item | `string`     | none    |
| `fixed`  | Pin to the viewport bottom (`position: fixed; bottom: 0`) | `boolean`      | `false` |

`BottomNavItem` fields:

| Field      | Description                                             | Type     |
| ---------- | ------------------------------------------------------- | -------- |
| `label`    | Text                                                    | `string` |
| `value`    | Value (unique identifier)                               | `string` |
| `icon`     | Icon name (a key of `@oas-ui/icons` iconRegistry)     | `string` |
| `disabled` | Disabled (not selectable, skipped by keyboard)          | `boolean`|

| Event        | Description                          |
| ------------ | ------------------------------------ |
| `oas-change` | The active item changed, `detail: { value }` |

Behavior: `role="tablist"` + `role="tab"` + synced `aria-selected` / `aria-disabled`; roving tabindex keeps only the active item focusable; arrow keys (left/right or up/down) cycle focus among available items (Home/End jump to the ends), Enter/Space selects the focused item; clicking an already-active item does not re-fire; empty `items` renders an empty tablist without errors. The active item uses the primary color plus an icon (iconRegistry inline SVG following `currentColor`), with a thin top divider.
