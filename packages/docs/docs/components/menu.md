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

## 水平导航

`mode="horizontal"` 时菜单项横排，呈顶部导航条样式；一级子菜单向下浮出，二级及以上仍向右浮出。

<DemoBlock title="水平导航（顶部导航条样式）">
  <oas-menu mode="horizontal" style="width: 100%" onoas-select="menuHLog(event)" items='[{"label":"首页","value":"home"},{"label":"产品","value":"products","children":[{"label":"组件","value":"components","children":[{"label":"基础","value":"basic"},{"label":"数据","value":"data"}]},{"label":"文档","value":"docs"},{"label":"下载","value":"download"}]},{"label":"关于","value":"about"},{"label":"联系","value":"contact"}]'></oas-menu>
  <oas-tag id="menu-h-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 收起态

`collapsed`（仅 vertical 生效）将菜单收窄为只显示图标，悬停或点击图标项时子菜单向右浮出，子菜单内仍为完整菜单。

<DemoBlock title="收起态（只显示图标）">
  <oas-menu collapsed onoas-select="menuCLog(event)" items='[{"label":"首页","value":"home","icon":"menu"},{"label":"消息","value":"message","icon":"mail","children":[{"label":"收件箱","value":"inbox"},{"label":"已发送","value":"sent"}]},{"label":"用户","value":"user","icon":"user"},{"label":"设置","value":"settings","icon":"gear","children":[{"label":"个人资料","value":"profile"},{"label":"安全","value":"security"}]}]'></oas-menu>
  <oas-tag id="menu-c-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 分组

`type: "group"` 的菜单项渲染为带组标题的分区（组标题小字、次要色、不可点），组内子项平铺在同一层，可继续混入子菜单与分隔线。

<DemoBlock title="分组">
  <oas-menu style="width: 200px" items='[{"type":"group","label":"导航","children":[{"label":"首页","value":"home"},{"label":"关于","value":"about"}]},{"type":"group","label":"操作","children":[{"label":"新建","value":"new"},{"label":"设置","value":"settings","children":[{"label":"个人资料","value":"profile"},{"label":"安全","value":"security"}]}]}]'></oas-menu>
</DemoBlock>

## 带图标

`icon` 使用 `@oas-ui/icons` 的图标名（iconRegistry），以内联 SVG 渲染在文字左侧。

<DemoBlock title="带图标">
  <oas-menu style="width: 200px" items='[{"label":"搜索","value":"search","icon":"search"},{"label":"用户","value":"user","icon":"user"},{"label":"设置","value":"settings","icon":"gear"},{"label":"下载","value":"download","icon":"download"}]'></oas-menu>
</DemoBlock>

## 分隔线

`type: "divider"` 渲染一条细分隔线，不可点、不参与键盘导航。

<DemoBlock title="分隔线">
  <oas-menu style="width: 200px" items='[{"label":"编辑","value":"edit","icon":"edit"},{"label":"复制","value":"copy","icon":"copy"},{"type":"divider"},{"label":"删除","value":"delete","icon":"trash"}]'></oas-menu>
</DemoBlock>

## 暗色菜单

`theme="dark"` 使菜单局部使用暗色 token（深背景 + 浅文字），独立于全局主题；不设置时跟随全局主题。

<DemoBlock title="暗色菜单">
  <oas-space style="padding: 16px; border-radius: 8px; background: var(--oas-color-bg-hover)">
    <oas-menu theme="dark" style="width: 200px" items='[{"label":"编辑","value":"edit","icon":"edit","children":[{"label":"复制","value":"copy","icon":"copy"},{"label":"剪切","value":"cut"}]},{"label":"设置","value":"settings","icon":"gear"},{"type":"divider"},{"label":"删除","value":"delete","icon":"trash"}]'></oas-menu>
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `collapsed` | 收起态（仅 vertical）：只显示图标，子菜单向右浮出 | — | — |
| `items` | 菜单项 JSON | `string` | `[]` |
| `mode` | 布局模式：`vertical` 纵向菜单 / `horizontal` 顶部导航条 | — | — |
| `theme` | 局部主题：`dark` 使用暗色 token（独立于全局主题） | — | — |
| `value` | 当前选中值 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-select` | 选择某项，`detail: { value }` |

`MenuItem` 字段：

| 字段       | 说明                                                                 | 类型         |
| ---------- | -------------------------------------------------------------------- | ------------ |
| `label`    | 菜单项文字                                                           | `string`     |
| `value`    | 选中值                                                               | `string`     |
| `type`     | 菜单项类型：`item`（默认）/ `group`（分组标题）/ `divider`（分隔线） | `string`     |
| `icon`     | 图标名（`@oas-ui/icons` 的 iconRegistry 键）                       | `string`     |
| `disabled` | 禁用该项                                                             | `boolean`    |
| `children` | 子菜单项数组，结构与父项一致（可继续嵌套）                           | `MenuItem[]` |

`children` 为可选子菜单项数组；有 `children` 的项点击/悬停展开子菜单，选中态只落在叶子项。`group` 的 `children` 平铺展示在同一层，组标题不可点、不参与键盘导航；`divider` 不可点、不参与键盘导航。

键盘导航：方向键移动（自动跳过组标题与分隔线）、Enter 选择（含子菜单的项 Enter/ArrowRight 进入）、Home / End 跳转、ArrowLeft 返回父级；`role="menu"` + `menuitemradio`（子菜单父项为 `menuitem`），选中项显示对勾。
