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

## 多级子菜单

带 `children` 的菜单项显示展开箭头（›），点击或悬停展开子菜单，子菜单缩进展示；键盘 `ArrowRight` 进入、`ArrowLeft` 返回。

<DemoBlock title="多级子菜单">
  <oas-space direction="vertical" size="small">
    <oas-menu id="menu-nested" style="width: 200px" onoas-select="menuNestedLog(event)" items='[{"label":"编辑","value":"edit","children":[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"}]},{"label":"文件","value":"file","children":[{"label":"新建","value":"new","children":[{"label":"文件","value":"new-file"},{"label":"窗口","value":"new-window"}]},{"label":"打开","value":"open","children":[{"label":"最近文件","value":"recent"},{"label":"项目","value":"project"}]}]},{"label":"视图","value":"view"}]'></oas-menu>
    <oas-tag id="menu-nested-result" type="info">尚未选择</oas-tag>
  </oas-space>
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
  window.menuNestedLog = (e) => {
    const tag = document.getElementById('menu-nested-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `items` | 菜单项 JSON | `[{ label, value, disabled?, children? }]` | `[]` |
| `value` | 当前选中值 | `string` | — |

`children` 为可选子菜单项数组，结构与父项一致（可继续嵌套）；有 `children` 的项点击/悬停展开子菜单，选中态只落在叶子项。

| 事件 | 说明 |
|---|---|
| `oas-select` | 选择某项，`detail: { value }` |

键盘导航：方向键移动、Enter 选择（含子菜单的项 Enter/ArrowRight 进入）、Home / End 跳转、ArrowLeft 返回父级；`role="menu"` + `menuitemradio`（子菜单父项为 `menuitem`），选中项显示对勾。
