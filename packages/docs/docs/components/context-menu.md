# ContextMenu 右键菜单

在包裹区域内右键弹出菜单。

## 基础用法

<div class="demo">
  <oas-context-menu items='[{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]' style="display: inline-block">
    <div style="width: 240px; height: 120px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">在此区域右键</div>
  </oas-context-menu>
</div>

## API

| 属性 | 说明 |
|---|---|
| `items` | 菜单项 JSON `[{ label, value, disabled }]` |

| 事件 | 说明 |
|---|---|
| `oas-select` | 选择，`detail: { value }` |

鼠标位置弹出，Esc / 外部点击关闭。
