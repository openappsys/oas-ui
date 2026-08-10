# NavigationMenu

A website-style multi-level navigation bar: hover / keyboard expands submenus (cascading popups); leaf items with `href` render as links.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-navigation-menu id="nav-basic" onoas-select="navLog(event)" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components"},{"label":"文档","value":"docs","href":"/docs"},{"label":"更多","value":"more","children":[{"label":"博客","value":"blog","href":"/blog"},{"label":"社区","value":"community","href":"/community"}]}]},{"label":"定价","value":"pricing","href":"/pricing"},{"label":"关于","value":"about","href":"/about"}]'></oas-navigation-menu>
  <oas-tag id="nav-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-navigation-menu items='[{"label":"首页","value":"home","href":"/"},{"label":"产品","value":"products","children":[{"label":"组件","value":"components"},{"label":"文档","value":"docs","disabled":true}]}]'></oas-navigation-menu>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.navLog = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
})
</script>

## API

| Property | Description                            | Type        | Default |
| -------- | -------------------------------------- | ----------- | ------- |
| `items`  | Navigation items JSON (hierarchical)   | `NavItem[]` | `[]`    |

`NavItem` fields (inherits `MenuItem`):

| Field      | Description                                                       | Type       |
| ---------- | ----------------------------------------------------------------- | ---------- |
| `label`    | Navigation text                                                   | `string`   |
| `value`    | Selection value                                                   | `string`   |
| `href`     | Link URL (optional); leaf items with `href` render as `<a>` and are navigable | `string` |
| `target`   | Link open target (optional)                                       | `string`   |
| `disabled` | Disabled                                                          | `boolean`  |
| `children` | Sub navigation items (nested recursively, cascading to the right) | `NavItem[]`|

| Event        | Description                         |
| ------------ | ----------------------------------- |
| `oas-select` | An item was selected, `detail: { value }` |

Interaction: hover expands a submenu, click toggles; keyboard `←`/`→` switches top level, `↓`/`Enter` opens, `↑` opens and focuses the last item, `→` enters a cascading submenu, `←` returns to the parent, `Esc` closes everything and refocuses the top level. While a submenu is open, `Tab` cycles among its items (focus trap); after selection it collapses and fires `oas-select`.
