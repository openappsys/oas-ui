# Command 命令面板

命令面板（⌘K / Ctrl+K）——搜索过滤、键盘选择、Enter 执行。`open` 受控：可由外部设置，也可用 ⌘K 全局快捷键或 Esc 关闭（关闭时派发 `oas-select` / 移除 `open`）。

## 基础用法

<DemoBlock title="基础用法（⌘K / Ctrl+K 打开）">
  <oas-command id="command-basic" onoas-select="commandLog(event)" items='[{"label":"新建文件","value":"new-file","keywords":["create","file"],"group":"文件"},{"label":"打开文件","value":"open-file","group":"文件"},{"label":"保存文件","value":"save","group":"文件"},{"label":"撤销","value":"undo","keywords":["ctrl z"],"group":"编辑"},{"label":"重做","value":"redo","keywords":["ctrl y"],"group":"编辑"},{"label":"全选","value":"select-all","keywords":["select"],"group":"编辑"}]'></oas-command>
  <oas-tag id="command-result" type="info">按 ⌘K / Ctrl+K 打开命令面板，或外部控制 open</oas-tag>
</DemoBlock>

## 受控打开

`open` 属性由外部控制：外部按钮设置 `open` 打开面板；关闭由 Esc / 点击遮罩 / 选择命令触发（组件移除 `open`，受控关闭由宿主监听 `oas-select` 后决定是否重新打开）。

> 打开时遮罩铺满全屏，因此「关闭」不提供外部按钮，用 Esc / 点击遮罩 / 选择命令关闭。

<DemoBlock title="外部控制 open">
  <oas-space size="small">
    <oas-button type="primary" onclick="cmdOpen()">打开命令面板</oas-button>
    <oas-tag id="command-ctrl-status" type="info">open: false</oas-tag>
    <oas-tag id="command-ctrl-selected" type="success">尚未选择</oas-tag>
  </oas-space>
  <oas-command id="command-controlled" onoas-select="commandCtrlSelect(event)" items='[{"label":"设置主题","value":"theme","group":"外观"},{"label":"切换暗色模式","value":"dark","group":"外观"},{"label":"查看快捷键","value":"shortcuts","group":"帮助"}]'></oas-command>
</DemoBlock>

## 分组与空态

分组标题按 `group` 字段渲染；无匹配时显示「无匹配命令」空态。

<DemoBlock title="分组与空态">
  <oas-command id="command-empty" items='[{"label":"部署","value":"deploy","group":"操作"},{"label":"回滚","value":"rollback","group":"操作"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-empty-btn" type="primary">打开（试试搜「部署」和「xyz」）</oas-button>
    <oas-tag id="command-empty-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.commandLog = (e) => {
    const tag = document.getElementById('command-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }

  const ctrl = document.getElementById('command-controlled')
  const ctrlStatus = document.getElementById('command-ctrl-status')
  const ctrlSelected = document.getElementById('command-ctrl-selected')
  if (ctrl && ctrlStatus) {
    const sync = () => {
      ctrlStatus.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.cmdOpen = () => ctrl.setAttribute('open', '')
    window.commandCtrlSelect = (e) => {
      if (ctrlSelected) ctrlSelected.textContent = `已选择：${e.detail.value}`
    }
    sync()
    // 选择 / Esc / 点击遮罩由组件移除 open，用 MutationObserver 保持状态同步
    new MutationObserver(sync).observe(ctrl, { attributes: true, attributeFilter: ['open'] })
  }

  document.getElementById('command-empty-btn')?.addEventListener('click', () => {
    document.getElementById('command-empty')?.setAttribute('open', '')
  })
  document.getElementById('command-empty')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-empty-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 命令项 JSON | `string` | `[]` |
| `open` | 是否打开（受控；选择 / Esc 后自动移除） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-select` | 执行某项，`detail: { value }` |

`CommandItem` 字段：

| 字段       | 说明                                        | 类型     |
| ---------- | ------------------------------------------- | -------- |
| `label`    | 显示文案                                    | `string` |
| `value`    | 选中值（`oas-select` detail.value）         | `string` |
| `keywords` | 搜索关键词（可选），参与 label 之外的匹配   | `string[]` |
| `group`    | 分组名（可选），同组项渲染分组标题          | `string` |
| `disabled` | 禁用该项（Enter/点击不可选，方向键跳过）    | `boolean` |

键盘：`↑`/`↓` 移动高亮（跳过 disabled），`Enter` 执行并关闭，`Esc` 关闭，`Tab` 在搜索框与选项间循环（焦点陷阱）；打开时自动聚焦搜索框，关闭后焦点归还来源元素。全局快捷键 `⌘K` / `Ctrl+K` 切换开关。
