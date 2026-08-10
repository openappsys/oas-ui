# Menu

A standalone menu list with selection state and keyboard navigation.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
</DemoBlock>

## Default selection

<DemoBlock title="Default selection (value echo)">
  <oas-menu style="width: 200px" value="delete" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete","disabled":true},{"label":"复制","value":"copy"}]'></oas-menu>
</DemoBlock>

## Nested submenu

Menu items with `children` show an expand arrow (›); clicking or hovering expands the submenu, which is rendered indented; press `ArrowRight` to enter and `ArrowLeft` to go back.

<DemoBlock title="Nested submenu">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-nested" style="width: 200px" onoas-select="menuNestedLog(event)" items='[{"label":"编辑","value":"edit","children":[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"}]},{"label":"文件","value":"file","children":[{"label":"新建","value":"new","children":[{"label":"文件","value":"new-file"},{"label":"窗口","value":"new-window"}]},{"label":"打开","value":"open","children":[{"label":"最近文件","value":"recent"},{"label":"项目","value":"project"}]}]},{"label":"视图","value":"view"}]'></oas-menu>
    <oas-tag id="menu-nested-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## Horizontal navigation

With `mode="horizontal"` the items are laid out in a row as a top navigation bar; first-level submenus pop down while second-level and deeper submenus still pop to the right.

<DemoBlock title="Horizontal navigation (top bar style)">
  <oas-menu mode="horizontal" style="width: 100%" onoas-select="menuHLog(event)" items='[{"label":"首页","value":"home"},{"label":"产品","value":"products","children":[{"label":"组件","value":"components","children":[{"label":"基础","value":"basic"},{"label":"数据","value":"data"}]},{"label":"文档","value":"docs"},{"label":"下载","value":"download"}]},{"label":"关于","value":"about"},{"label":"联系","value":"contact"}]'></oas-menu>
  <oas-tag id="menu-h-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## Collapsed state

`collapsed` (vertical only) narrows the menu to show only icons; hovering or clicking an icon item pops its submenu out to the right, still a full menu.

<DemoBlock title="Collapsed (icons only)">
  <oas-menu collapsed onoas-select="menuCLog(event)" items='[{"label":"首页","value":"home","icon":"menu"},{"label":"消息","value":"message","icon":"mail","children":[{"label":"收件箱","value":"inbox"},{"label":"已发送","value":"sent"}]},{"label":"用户","value":"user","icon":"user"},{"label":"设置","value":"settings","icon":"gear","children":[{"label":"个人资料","value":"profile"},{"label":"安全","value":"security"}]}]'></oas-menu>
  <oas-tag id="menu-c-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## Groups

Menu items with `type: "group"` render as a section with a group title (small text, secondary color, not clickable); the group's children are laid out flat on the same level and may mix in submenus and dividers.

<DemoBlock title="Groups">
  <oas-menu style="width: 200px" items='[{"type":"group","label":"导航","children":[{"label":"首页","value":"home"},{"label":"关于","value":"about"}]},{"type":"group","label":"操作","children":[{"label":"新建","value":"new"},{"label":"设置","value":"settings","children":[{"label":"个人资料","value":"profile"},{"label":"安全","value":"security"}]}]}]'></oas-menu>
</DemoBlock>

## With icons

`icon` uses icon names from `@oas-ui/icons` (iconRegistry) and renders an inline SVG to the left of the text.

<DemoBlock title="With icons">
  <oas-menu style="width: 200px" items='[{"label":"搜索","value":"search","icon":"search"},{"label":"用户","value":"user","icon":"user"},{"label":"设置","value":"settings","icon":"gear"},{"label":"下载","value":"download","icon":"download"}]'></oas-menu>
</DemoBlock>

## Divider

`type: "divider"` renders a thin divider line that is not clickable and not part of keyboard navigation.

<DemoBlock title="Divider">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit","icon":"edit"},{"label":"复制","value":"copy","icon":"copy"},{"type":"divider"},{"label":"删除","value":"delete","icon":"trash"}]'></oas-menu>
</DemoBlock>

## Dark menu

`theme="dark"` applies dark tokens locally (dark background + light text) to the menu, independent of the global theme; when unset, it follows the global theme.

<DemoBlock title="Dark menu">
  <oas-space style="padding: 16px; border-radius: 8px; background: var(--oas-color-bg-hover)">
    <oas-menu theme="dark" style="width: 200px" items='[{"label":"编辑","value":"edit","icon":"edit","children":[{"label":"复制","value":"copy","icon":"copy"},{"label":"剪切","value":"cut"}]},{"label":"设置","value":"settings","icon":"gear"},{"type":"divider"},{"label":"删除","value":"delete","icon":"trash"}]'></oas-menu>
  </oas-space>
</DemoBlock>

## Selection event

<DemoBlock title="Selection event">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-event" style="width: 200px" onoas-select="menuLog(event)" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
    <oas-tag id="menu-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menuLog = (e) => {
    const tag = document.getElementById('menu-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuNestedLog = (e) => {
    const tag = document.getElementById('menu-nested-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuHLog = (e) => {
    const tag = document.getElementById('menu-h-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menuCLog = (e) => {
    const tag = document.getElementById('menu-c-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
})
</script>

## API

| Property   | Description                                               | Type                       | Default    |
| ---------- | --------------------------------------------------------- | -------------------------- | ---------- |
| `items`    | Menu items JSON                                           | `MenuItem[]`               | `[]`       |
| `value`    | Current selected value                                    | `string`                   | —          |
| `mode`     | Layout mode: `vertical` menu / `horizontal` top bar       | `vertical` / `horizontal`  | `vertical` |
| `collapsed`| Collapsed state (vertical only): icons only, submenus pop to the right | `boolean`      | `false`    |
| `theme`    | Local theme: `dark` uses dark tokens (independent of the global theme) | `dark` | follows global |

`MenuItem` fields:

| Field      | Description                                                        | Type         |
| ---------- | ------------------------------------------------------------------ | ------------ |
| `label`    | Menu item text                                                     | `string`     |
| `value`    | Selection value                                                    | `string`     |
| `type`     | Item type: `item` (default) / `group` (group title) / `divider`    | `string`     |
| `icon`     | Icon name (a key of `@oas-ui/icons` iconRegistry)                | `string`     |
| `disabled` | Disables the item                                                  | `boolean`    |
| `children` | Submenu items array with the same shape as the parent (nested recursively) | `MenuItem[]` |

`children` is an optional submenu items array; items with `children` expand their submenu on click/hover, and the selected state only lands on leaf items. `group` children are laid out flat on the same level; group titles are not clickable and skipped in keyboard navigation; `divider` items are not clickable and skipped in keyboard navigation.

| Event        | Description                         |
| ------------ | ----------------------------------- |
| `oas-select` | An item was selected, `detail: { value }` |

Keyboard navigation: arrow keys move (auto-skipping group titles and dividers), Enter selects (items with submenus enter via Enter/ArrowRight), Home / End jump, ArrowLeft returns to the parent; `role="menu"` + `menuitemradio` (submenu parents are `menuitem`), the selected item shows a check mark.
