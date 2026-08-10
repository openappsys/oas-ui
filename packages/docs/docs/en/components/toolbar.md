# Toolbar

A container for groups of tool buttons: `role="toolbar"` + `aria-label`, `Tab` enters and arrow keys move between buttons (roving tabindex — only the current item is focused).

## Basic usage

<DemoBlock title="Basic usage (native buttons)">
  <oas-toolbar>
    <button>加粗</button>
    <button>斜体</button>
    <button>下划线</button>
    <button>删除线</button>
  </oas-toolbar>
</DemoBlock>

## Combining with oas-button

Put `oas-button` elements in the slot (custom elements automatically join the roving behavior); use `data-toolbar-ignore` to exclude separators.

<DemoBlock title="oas-button + separator">
  <oas-toolbar>
    <oas-button>剪切</oas-button>
    <oas-button>复制</oas-button>
    <oas-button>粘贴</oas-button>
    <oas-divider direction="vertical" data-toolbar-ignore></oas-divider>
    <oas-button>撤销</oas-button>
    <oas-button>重做</oas-button>
  </oas-toolbar>
</DemoBlock>

## Disabled items

Buttons with `disabled` / `aria-disabled` are skipped by arrow-key navigation (roving skips them).

<DemoBlock title="Disabled items">
  <oas-toolbar>
    <button>保存</button>
    <button disabled>另存为</button>
    <button>打印</button>
  </oas-toolbar>
</DemoBlock>

## API

| Property | Description                          | Default |
| -------- | ------------------------------------ | ------- |
| none     | Put buttons / `oas-button` etc. in the slot | —       |

- The host has `role="toolbar"`; `aria-label` comes from the locale key (`toolbar.label`, default 「工具栏」)
- Children that join roving: native controls (`button`/`input`/`select`/`textarea`/`a[href]`), interactive `role`s, custom elements (tag contains `-`); exclude them with `data-toolbar-ignore` or `aria-hidden`, and `disabled`/`aria-disabled` are skipped automatically
- Keyboard: `Tab` enters (only the current item is tab-reachable), `←`/`→` (or `↑`/`↓`) moves between buttons, `Home`/`End` jumps to the first/last
