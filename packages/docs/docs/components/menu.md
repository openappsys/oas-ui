# Menu 菜单

独立的菜单列表，支持选中态与键盘导航。

## 基础用法

<DemoBlock title="基础用法">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
</DemoBlock>

## 默认选中

<DemoBlock title="默认选中（value 回显）">
  <oas-menu style="width: 200px" value="delete" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'></oas-menu>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete","disabled":true},{"label":"复制","value":"copy"}]'></oas-menu>
</DemoBlock>

## 选择事件

<DemoBlock title="选择事件">
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
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `items` | 菜单项 JSON | `[{ label, value, disabled? }]` | `[]` |
| `value` | 当前选中值 | `string` | — |

| 事件 | 说明 |
|---|---|
| `oas-select` | 选择某项，`detail: { value }` |

键盘导航：方向键移动、Enter 选择、Home / End 跳转；`role="menu"` + `menuitemradio`，选中项显示对勾。
