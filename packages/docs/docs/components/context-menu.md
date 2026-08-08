# ContextMenu 右键菜单

在包裹区域内右键弹出菜单，菜单定位在鼠标位置。

## 基础用法

<DemoBlock title="右键触发">
  <oas-context-menu items='[{"label":"复制","value":"copy"},{"label":"剪切","value":"cut"},{"label":"粘贴","value":"paste"}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">在此区域右键查看菜单</div>
  </oas-context-menu>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-context-menu items='[{"label":"复制","value":"copy"},{"label":"删除","value":"delete","disabled":true}]'>
    <div style="width: 260px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键查看（删除不可用）</div>
  </oas-context-menu>
</DemoBlock>

## 多级子菜单

<DemoBlock title="多级子菜单">
  <oas-context-menu items='[{"label":"新建","value":"new","children":[{"label":"文件","value":"new-file"},{"label":"窗口","value":"new-window"},{"label":"项目","value":"new-project","children":[{"label":"Git 仓库","value":"repo"},{"label":"空白","value":"blank"}]}]},{"label":"打开","value":"open","children":[{"label":"最近文件","value":"recent"},{"label":"浏览…","value":"browse"}]},{"label":"删除","value":"delete"}]'>
    <div style="width: 260px; height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">右键查看多级子菜单</div>
  </oas-context-menu>
</DemoBlock>

带 `children` 的菜单项 hover / 点击展开级联子菜单，选中叶子项后自动收回并关闭。

## 选择事件

<DemoBlock title="选择事件">
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

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `items` | 菜单项 JSON | `[{ label, value, disabled?, children? }]`（`children` 为多级子菜单） | `[]` |

| 事件 | 说明 |
|---|---|
| `oas-select` | 选择某项，`detail: { value }` |

鼠标位置弹出，Esc / 外部点击 / 选择后自动关闭；`role="menu"` + `menuitem`。
