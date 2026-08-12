# Command

A command palette (⌘K / Ctrl+K) — search filtering, keyboard selection and Enter to execute. `open` is controlled: it can be set externally, and the global ⌘K shortcut or Esc closes it (closing fires `oas-select` / removes `open`).

## Basic usage

<DemoBlock title="Basic usage (open with ⌘K / Ctrl+K)">
  <oas-command id="command-basic" onoas-select="commandLog(event)" items='[{"label":"New file","value":"new-file","keywords":["create","file"],"group":"File"},{"label":"Open file","value":"open-file","group":"File"},{"label":"Save","value":"save","group":"File"},{"label":"Undo","value":"undo","keywords":["ctrl z"],"group":"Edit"},{"label":"Redo","value":"redo","keywords":["ctrl y"],"group":"Edit"},{"label":"Select all","value":"select-all","keywords":["select"],"group":"Edit"}]'></oas-command>
  <oas-tag id="command-result" type="info">Press ⌘K / Ctrl+K to open the command palette, or control open externally</oas-tag>
</DemoBlock>

## Controlled open

The `open` attribute is externally controlled: an external button sets `open` to open the palette; it closes via Esc / backdrop click / selecting a command (the component removes `open`; for controlled closing, the host decides whether to reopen after listening to `oas-select`).

> When open, the backdrop covers the full screen, so no external "close" button is provided — use Esc / click the backdrop / select a command to close.

<DemoBlock title="Externally controlled open">
  <oas-space size="small">
    <oas-button type="primary" onclick="cmdOpen()">Open command palette</oas-button>
    <oas-tag id="command-ctrl-status" type="info">open: false</oas-tag>
    <oas-tag id="command-ctrl-selected" type="success">Nothing selected</oas-tag>
  </oas-space>
  <oas-command id="command-controlled" onoas-select="commandCtrlSelect(event)" items='[{"label":"Set theme","value":"theme","group":"Appearance"},{"label":"Toggle dark mode","value":"dark","group":"Appearance"},{"label":"View shortcuts","value":"shortcuts","group":"Help"}]'></oas-command>
</DemoBlock>

## Groups and empty state

Group titles render from the `group` field; when nothing matches, an "no matching commands" empty state is shown.

<DemoBlock title="Groups and empty state">
  <oas-command id="command-empty" items='[{"label":"Deploy","value":"deploy","group":"Actions"},{"label":"Rollback","value":"rollback","group":"Actions"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-empty-btn" type="primary">Open (try searching "deploy" and "xyz")</oas-button>
    <oas-tag id="command-empty-result" type="info">Nothing selected</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.commandLog = (e) => {
    const tag = document.getElementById('command-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
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
      if (ctrlSelected) ctrlSelected.textContent = `Selected: ${e.detail.value}`
    }
    sync()
    // Selecting / Esc / clicking the backdrop makes the component remove open; keep status synced with MutationObserver
    new MutationObserver(sync).observe(ctrl, { attributes: true, attributeFilter: ['open'] })
  }

  document.getElementById('command-empty-btn')?.addEventListener('click', () => {
    document.getElementById('command-empty')?.setAttribute('open', '')
  })
  document.getElementById('command-empty')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-empty-result')
    if (tag) tag.textContent = `Selected: ${e.detail.value}`
  })
})
</script>

## API

### Attributes

| Attribute | Description                                                   | Type      | Default |
| --------- | ------------------------------------------------------------- | --------- | ------- |
| `items`   | Command items JSON                                            | `string`  | `[]`    |
| `open`    | Whether open (controlled; auto-removed after selection / Esc) | `boolean` | —       |

### Events

| Event        | Description                                 |
| ------------ | ------------------------------------------- |
| `oas-select` | A command was executed, `detail: { value }` |

`CommandItem` fields:

| Field      | Description                                                               | Type       |
| ---------- | ------------------------------------------------------------------------- | ---------- |
| `label`    | Display text                                                              | `string`   |
| `value`    | Selected value (`oas-select` detail.value)                                | `string`   |
| `keywords` | Search keywords (optional), matched in addition to the label              | `string[]` |
| `group`    | Group name (optional); same-group items render a group title              | `string`   |
| `disabled` | Disables the item (not selectable via Enter/click, skipped by arrow keys) | `boolean`  |

Keyboard: `↑`/`↓` move the highlight (skipping disabled items), `Enter` executes and closes, `Esc` closes, `Tab` cycles between the search input and the options (focus trap); on open the search input is focused, and on close focus returns to the source element. The global `⌘K` / `Ctrl+K` shortcut toggles it.
