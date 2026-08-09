# Toolbar 工具栏

工具按钮组容器：`role="toolbar"` + `aria-label`，`Tab` 进入后方向键在按钮间移动（roving tabindex，只聚焦当前项）。

## 基础用法

<DemoBlock title="基础用法（原生按钮）">
  <oas-toolbar>
    <button>加粗</button>
    <button>斜体</button>
    <button>下划线</button>
    <button>删除线</button>
  </oas-toolbar>
</DemoBlock>

## 与 oas-button 组合

slot 里放 `oas-button`（自定义元素自动参与 roving），用 `data-toolbar-ignore` 排除分隔元素。

<DemoBlock title="oas-button + 分隔">
  <oas-toolbar>
    <oas-button>剪切</oas-button>
    <oas-button>复制</oas-button>
    <oas-button>粘贴</oas-button>
    <oas-divider direction="vertical" data-toolbar-ignore></oas-divider>
    <oas-button>撤销</oas-button>
    <oas-button>重做</oas-button>
  </oas-toolbar>
</DemoBlock>

## 禁用项

`disabled` / `aria-disabled` 的按钮不参与方向键导航（roving 跳过）。

<DemoBlock title="禁用项">
  <oas-toolbar>
    <button>保存</button>
    <button disabled>另存为</button>
    <button>打印</button>
  </oas-toolbar>
</DemoBlock>

## API

| 属性    | 说明                          | 默认值 |
| ------- | ----------------------------- | ------ |
| 无      | slot 放按钮 / `oas-button` 等 | —      |

- 宿主 `role="toolbar"`，`aria-label` 走 locale key（`toolbar.label`，默认「工具栏」）
- 参与 roving 的子元素：native 控件（`button`/`input`/`select`/`textarea`/`a[href]`）、交互 `role`、自定义元素（tag 含 `-`）；用 `data-toolbar-ignore` 或 `aria-hidden` 排除，`disabled`/`aria-disabled` 自动跳过
- 键盘：`Tab` 进入（仅当前项可 Tab 到达），`←`/`→`（或 `↑`/`↓`）在按钮间移动，`Home`/`End` 跳转首末
