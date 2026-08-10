# Command

A command palette (⌘K / Ctrl+K) — search filtering, keyboard selection and Enter to execute. `open` is controlled: it can be set externally, and the global ⌘K shortcut or Esc closes it (closing fires `oas-select` / removes `open`).

## Basic usage

<DemoBlock title="Basic usage (open with ⌘K / Ctrl+K)">
  <oas-command id="command-basic" onoas-select="commandLog(event)" items='[{"label":"新建文件","value":"new-file","keywords":["create","file"],"group":"文件"},{"label":"打开文件","value":"open-file","group":"文件"},{"label":"保存文件","value":"save","group":"文件"},{"label":"撤销","value":"undo","keywords":["ctrl z"],"group":"编辑"},{"label":"重做","value":"redo","keywords":["ctrl y"],"group":"编辑"},{"label":"全选","value":"select-all","keywords":["select"],"group":"编辑"}]'></oas-command>
  <oas-tag id="command-result" type="info">按 ⌘K / Ctrl+K 打开命令面板，或外部控制 open</oas-tag>
</DemoBlock>

## Controlled open

The `open` attribute is externally controlled: an external button sets `open` to open the palette; it closes via Esc / backdrop click / selecting a command (the component removes `open`; for controlled closing, the host decides whether to reopen after listening to `oas-select`).

> When open, the backdrop covers the full screen, so no external "close" button is provided — use Esc / click the backdrop / select a command to close.

<DemoBlock title="Externally controlled open">
  <oas-space size="small">
    <oas-button type="primary" onclick="cmdOpen()">打开命令面板</oas-button>
    <oas-tag id="command-ctrl-status" type="info">open: false</oas-tag>
    <oas-tag id="command-ctrl-selected" type="success">尚未选择</oas-tag>
  </oas-space>
  <oas-command id="command-controlled" onoas-select="commandCtrlSelect(event)" items='[{"label":"设置主题","value":"theme","group":"外观"},{"label":"切换暗色模式","value":"dark","group":"外观"},{"label":"查看快捷键","value":"shortcuts","group":"帮助"}]'></oas-command>
</DemoBlock>

## Groups and empty state

Group titles render from the `group` field; when nothing matches, an "no matching commands" empty state is shown.

<DemoBlock title="Groups and empty state">
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

| Property | Description                                                       | Type                                                            | Default |
| -------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | ------- |
| `items`  | Command items JSON                                                | `CommandItem[]`                                                 | `[]`    |
| `open`   | Whether open (controlled; auto-removed after selection / Esc)     | `boolean`                                                       | `false` |

`CommandItem` fields:

| Field      | Description                                        | Type       |
| ---------- | -------------------------------------------------- | ---------- |
| `label`    | Display text                                       | `string`   |
| `value`    | Selected value (`oas-select` detail.value)         | `string`   |
| `keywords` | Search keywords (optional), matched in addition to the label | `string[]` |
| `group`    | Group name (optional); same-group items render a group title | `string`   |
| `disabled` | Disables the item (not selectable via Enter/click, skipped by arrow keys) | `boolean` |

| Event        | Description                         |
| ------------ | ----------------------------------- |
| `oas-select` | A command was executed, `detail: { value }` |

Keyboard: `↑`/`↓` move the highlight (skipping disabled items), `Enter` executes and closes, `Esc` closes, `Tab` cycles between the search input and the options (focus trap); on open the search input is focused, and on close focus returns to the source element. The global `⌘K` / `Ctrl+K` shortcut toggles it.
