# Menubar 应用菜单栏

桌面应用式顶部菜单条（文件 / 编辑 / 视图），点击 / 悬停展开子菜单（级联浮出），支持方向键、`Alt` 访问键与焦点陷阱。

## 多组单选（radio 组独立勾选）

`type: "group"` 项的 `value` 作为**组 id**，同一组内的叶子按该组独立记录选中值；`value` 属性传 JSON 对象（`{"组id":"选中值"}`）时各组互不干扰——「模式」和「主题」两组可各自显示打勾。

<DemoBlock title="多组单选（组独立勾选）">
  <oas-menubar id="menubar-groups" onoas-select="menubarGroupsLog(event)" value='{"mode":"preview","theme":"dark"}' items='[{"label":"视图","value":"view","accessKey":"v","children":[{"type":"group","label":"模式","value":"mode","children":[{"label":"编辑","value":"edit"},{"label":"预览","value":"preview"}]},{"type":"group","label":"主题","value":"theme","children":[{"label":"浅色","value":"light"},{"label":"暗色","value":"dark"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-groups-result" type="info">mode: preview, theme: dark</oas-tag>
</DemoBlock>

## 动作项（kind: "action"）

`kind: "action"` 的叶子项按普通动作渲染（`menuitem`），无勾选态、点击**不写回** `value`、只派发 `oas-select`（`detail.kind === "action"`）——适合「打开 / 保存 / 关于」这类非设置项。

<DemoBlock title="动作项（kind: action）">
  <oas-menubar id="menubar-action" onoas-select="menubarActionLog(event)" value="mode" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"打开","value":"open","kind":"action"},{"label":"保存","value":"save","kind":"action"},{"type":"divider"},{"label":"模式","value":"mode","kind":"radio"},{"label":"主题","value":"theme","kind":"radio"}]}]'></oas-menubar>
  <oas-tag id="menubar-action-result" type="info">value: mode（动作项点击不改变）</oas-tag>
</DemoBlock>

## 快捷键（shortcut）

`shortcut` 字段（如 `"Ctrl+N"`）：右侧渲染快捷键提示，并自动绑定 `document` 级 keydown——命中即触发对应项选择（`preventDefault` 拦截浏览器默认行为）。

<DemoBlock title="快捷键（shortcut）">
  <oas-menubar id="menubar-shortcut" onoas-select="menubarShortcutLog(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new","shortcut":"Ctrl+N"},{"label":"打开","value":"open","shortcut":"Ctrl+O"},{"type":"divider"},{"label":"保存","value":"save","shortcut":"Ctrl+S","kind":"action"}]}]'></oas-menubar>
  <oas-tag id="menubar-shortcut-result" type="info">按 Ctrl+N / Ctrl+O / Ctrl+S 试试</oas-tag>
</DemoBlock>

## 基础用法

<DemoBlock title="基础用法">
  <oas-menubar id="menubar-basic" onoas-select="menubarLog(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"label":"新建","value":"new"},{"label":"打开","value":"open"},{"type":"divider"},{"label":"退出","value":"quit"}]},{"label":"编辑","value":"edit","accessKey":"e","children":[{"label":"撤销","value":"undo"},{"label":"重做","value":"redo"},{"type":"divider"},{"label":"复制","value":"copy"},{"label":"粘贴","value":"paste"}]},{"label":"视图","value":"view","accessKey":"v","children":[{"label":"全屏","value":"fullscreen"},{"label":"缩放","value":"zoom","children":[{"label":"放大","value":"zoom-in"},{"label":"缩小","value":"zoom-out"}]}]}]'></oas-menubar>
  <oas-tag id="menubar-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 禁用项与分组

子菜单内支持 `disabled`、`type: "divider"` 分隔线与 `type: "group"` 分组标题。

<DemoBlock title="禁用项与分组">
  <oas-menubar onoas-select="menubarLog2(event)" items='[{"label":"文件","value":"file","accessKey":"f","children":[{"type":"group","label":"最近","children":[{"label":"项目 A","value":"proj-a"},{"label":"项目 B","value":"proj-b"}]},{"type":"divider"},{"label":"保存","value":"save"},{"label":"另存为","value":"save-as","disabled":true}]}]'></oas-menubar>
  <oas-tag id="menubar-result-2" type="info">尚未选择</oas-tag>
</DemoBlock>

## 受控选中

`value` 属性受控（已列入 observedAttributes）：外部 `setAttribute('value', ...)` 即时生效，选中项（勾选/高亮）同步到对应叶子项；组件内部点击也会写回 `value`（非受控通道），宿主可监听 `oas-select` 自行接管。

<DemoBlock title="受控选中（value 属性）">
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
  window.menubarGroupsLog = (e) => {
    const tag = document.getElementById('menubar-groups-result')
    if (tag) {
      const v = JSON.parse(document.getElementById('menubar-groups')?.getAttribute('value') || '{}')
      tag.textContent = `mode: ${v.mode || '-'}, theme: ${v.theme || '-'}`
    }
  }
  window.menubarActionLog = (e) => {
    const tag = document.getElementById('menubar-action-result')
    if (tag) {
      tag.textContent = e.detail.kind === 'action'
        ? `动作：${e.detail.value}（value 不变）`
        : `选中：${e.detail.value}（kind: radio）`
    }
  }
  window.menubarShortcutLog = (e) => {
    const tag = document.getElementById('menubar-shortcut-result')
    if (tag) tag.textContent = `已触发：${e.detail.value}`
  }
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 顶级菜单项 JSON（含子菜单 children） | `string` | `[]` |
| `value` | 选中值。纯字符串时全局单选（无组场景，兼容旧用法）；JSON 对象字符串（如 `{"mode":"preview","theme":"dark"}`）时按组 id 作用域独立记录——`type:"group"` 项的 `value` 作组 id | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-select` | 选择某项，`detail: { value, kind? }`。`kind` 仅动作项（`kind: "action"`）出现，值为 `"action"`；radio 项 `detail.kind` 不出现 |

> **事件 detail 说明**：`oas-select` 的 `detail` 是组件内部对象（含 `value`/`kind`），**不是**原生 `Event`——不能 `preventDefault()` 或直接读原生 `event.target`。如需原生事件对象，在事件监听器上用外层参数（如 `addEventListener('oas-select', (e) => ...)` 的 `e` 是 CustomEvent，`e.detail` 才是组件数据）。

`MenubarItem` 字段（继承 `MenuItem`）：

| 字段       | 说明                                                        | 类型     |
| ---------- | ----------------------------------------------------------- | -------- |
| `label`    | 菜单文字                                                    | `string` |
| `value`    | 选中值（items JSON 中声明；渲染后宿主标签上对应 `data-value` 小写属性，供内部定位，宿主不应依赖其作为公共 API） | `string` |
| `kind`     | 叶子项语义：`radio`（默认，可勾选、参与 value）/ `action`（动作项，无勾选态、点击不写回 value） | `string` |
| `shortcut` | 快捷键提示（如 `"Ctrl+N"`）；渲染为右侧 kbd，并自动绑定 `document` 级 keydown（命中即选择该项、`preventDefault`） | `string` |
| `accessKey`| `Alt` 访问键（单字符）；缺省取 label 首个 ASCII 字母        | `string` |
| `disabled` | 禁用                                                        | `boolean`|
| `children` | 子菜单项（可继续嵌套，级联向右浮出）                        | `MenubarItem[]` |

键盘：顶级 `←`/`→` 切换、`↓`/`Enter` 打开子菜单、`Esc` 关闭；子菜单内 `↑`/`↓` 移动、`→` 进入级联、`←` 返回父级；`Home`/`End` 跳转。`Alt` 单独按下聚焦菜单栏，`Alt + 访问键` 打开对应顶级菜单。子菜单打开时 `Tab` 在子项间循环（焦点陷阱），`roving tabindex` 只保留当前顶级项可 Tab 到达。
