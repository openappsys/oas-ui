# ContextMenu

A right-click menu that opens at the mouse position within its wrapped region.

## Basic usage

<DemoBlock title="Trigger on right-click">
  <oas-context-menu items='[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">在此区域右键查看菜单</div>
  </oas-context-menu>
</DemoBlock>

## Disabled items

<DemoBlock title="Disabled items">
  <oas-context-menu items='[{"label":"复制","value":"copy"},{"label":"删除","value":"delete","disabled":true}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键查看（删除不可用）</div>
  </oas-context-menu>
</DemoBlock>

## Nested submenu

<DemoBlock title="Nested submenu">
  <oas-context-menu items='[{"label":"新建","value":"new","children":[{"label":"文件","value":"new-file"},{"label":"窗口","value":"new-window"},{"label":"项目","value":"new-project","children":[{"label":"Git 仓库","value":"repo"},{"label":"空白","value":"blank"}]}]},{"label":"打开","value":"open","children":[{"label":"最近文件","value":"recent"},{"label":"浏览…","value":"browse"}]},{"label":"删除","value":"delete"}]'>
    <div style="width: 260px; height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键查看多级子菜单</div>
  </oas-context-menu>
</DemoBlock>

Items with `children` expand cascading submenus on hover/click; selecting a leaf item collapses them and closes the menu.

## Selection event

<DemoBlock title="Selection event">
  <oas-context-menu id="cm-event" onoas-select="cmLog(event)" items='[{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">在此区域右键</div>
  </oas-context-menu>
  <oas-tag id="cm-result" type="info">尚未选择</oas-tag>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.cmLog = (e) => {
    const tag = document.getElementById('cm-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
})
</script>

## API

| Property | Description | Type                                                                    | Default |
| -------- | ----------- | ----------------------------------------------------------------------- | ------- |
| `items`  | Menu items JSON | `[{ label, value, disabled?, children? }]` (`children` is a nested submenu) | `[]`    |

| Event        | Description                         |
| ------------ | ----------------------------------- |
| `oas-select` | An item was selected, `detail: { value }` |

Opens at the mouse position; closes on Esc / outside click / selection; `role="menu"` + `menuitem`.
