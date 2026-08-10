# Menubar

A desktop-app-style top menu bar (File / Edit / View). Click or hover expands submenus (cascading popups), with arrow key support, `Alt` access keys and a focus trap.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-menubar id="menubar-basic" onoas-select="menubarLog(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"},{"type":"divider"},{"label":"退出","value":"quit"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"},{"type":"divider"},{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]},{"label":"视图","value":"view","accessKey":"v","children":[{"label":"全屏","value":"fullscreen"},{"label":"缩放","value":"zoom","children":[{"label":"放大","value":"zoom-in"},{"label":"缩小","value":"zoom-out"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## Disabled items and groups

Submenus support `disabled`, `type: "divider"` separators and `type: "group"` group titles.

<DemoBlock title="Disabled items and groups">
  <oas-menubar onoas-select="menubarLog2(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"type":"group","label":"最近","children":[{"label":"项目 A","value":"proj-a"},{"label":"项目 B","value":"proj-b"}]},{"type":"divider"},{"label":"保存","value":"save"},{"label":"另存为","value":"save-as","disabled":true}]}]'></oas-menubar>
  <oas-tag id="menubar-result-2" type="info">尚未选择</oas-tag>
</DemoBlock>

## Controlled selection

The `value` attribute is controlled (it is in `observedAttributes`): an external `setAttribute('value', ...)` takes effect immediately and syncs the selected item (check/highlight) to the corresponding leaf item; internal clicks also write back to `value` (uncontrolled channel), and the host can listen to `oas-select` to take over.

<DemoBlock title="Controlled selection (value attribute)">
  <oas-space size="small">
    <oas-button size="small" onclick="mbSet('new')">选中「新建」</oas-button>
    <oas-button size="small" onclick="mbSet('undo')">选中「撤销」</oas-button>
    <oas-button size="small" onclick="mbSet('')">清除选中</oas-button>
    <oas-tag id="mb-value-status" type="info">value: -</oas-tag>
  </oas-space>
  <oas-menubar id="mb-value" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"},{"type":"divider"},{"label":"退出","value":"quit"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"}]}]'></oas-menubar>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.menubarLog = (e) => {
    const tag = document.getElementById('menubar-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.menubarLog2 = (e) => {
    const tag = document.getElementById('menubar-result-2')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }

  const mb = document.getElementById('mb-value')
  const status = document.getElementById('mb-value-status')
  if (mb && status) {
    const sync = () => {
      status.textContent = `value: ${mb.getAttribute('value') || '-'}`
    }
    window.mbSet = (v) => {
      // value 在 observedAttributes 中：直接 setAttribute 即触发即时重渲染
      mb.setAttribute('value', v)
    }
    // 受控接管：菜单内点击组件已写回 value；宿主亦可监听 oas-select 自行决定
    mb.addEventListener('oas-select', (e) => mbSet(e.detail.value))
    sync()
    new MutationObserver(sync).observe(mb, { attributes: true, attributeFilter: ['value'] })
  }
})
</script>

## API

| Property | Description                                   | Type          | Default |
| -------- | --------------------------------------------- | ------------- | ------- |
| `items`  | Top-level menu items JSON (with submenu `children`) | `MenubarItem[]` | `[]`    |
| `value`  | Controlled selected value (external change syncs the check immediately; internal selection writes back) | `string` | none |

`MenubarItem` fields (inherits `MenuItem`):

| Field       | Description                                                       | Type          |
| ----------- | ----------------------------------------------------------------- | ------------- |
| `label`     | Menu text                                                         | `string`      |
| `value`     | Selection value                                                   | `string`      |
| `accessKey` | `Alt` access key (single character); defaults to the first ASCII letter of `label` | `string` |
| `disabled`  | Disabled                                                          | `boolean`     |
| `children`  | Submenu items (nested recursively, cascading to the right)        | `MenubarItem[]` |

| Event        | Description                         |
| ------------ | ----------------------------------- |
| `oas-select` | An item was selected, `detail: { value }` |

Keyboard: at top level `←`/`→` switch, `↓`/`Enter` opens the submenu, `Esc` closes; inside a submenu `↑`/`↓` move, `→` enters a cascading submenu, `←` returns to the parent; `Home`/`End` jump. Pressing `Alt` alone focuses the menu bar, `Alt + access key` opens the matching top-level menu. While a submenu is open, `Tab` cycles among its items (focus trap); `roving tabindex` keeps only the current top-level item tab-reachable.
