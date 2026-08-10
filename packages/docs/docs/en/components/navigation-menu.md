# NavigationMenu

A website-style multi-level navigation bar: hover / keyboard expands submenus (cascading popups); leaf items with `href` render as links.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-navigation-menu id="nav-basic" onoas-select="navLog(event)" items='[{"label":"Products","value":"products","children":[{"label":"Components","value":"components","href":"/components"},{"label":"Docs","value":"docs","href":"/docs"},{"label":"More","value":"more","children":[{"label":"Blog","value":"blog","href":"/blog"},{"label":"Community","value":"community","href":"/community"}]}]},{"label":"Pricing","value":"pricing","href":"/pricing"},{"label":"About","value":"about","href":"/about"}]'></oas-navigation-menu>
  <oas-tag id="nav-result" type="info">Nothing selected</oas-tag>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-navigation-menu items='[{"label":"Home","value":"home","href":"/"},{"label":"Products","value":"products","children":[{"label":"Components","value":"components"},{"label":"Docs","value":"docs","disabled":true}]}]'></oas-navigation-menu>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.navLog = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
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
