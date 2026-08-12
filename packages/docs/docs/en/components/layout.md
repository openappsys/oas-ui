# Layout

A classic page skeleton of header + sider + content + footer, used with semantic child components.

## Basic usage

<DemoBlock title="Sider + header + content + footer">
  <oas-layout style="height: 300px; width: 100%">
    <oas-header slot="header">Header area</oas-header>
    <oas-sider slot="sider">Sider</oas-sider>
    <oas-content slot="content">
      <oas-space direction="vertical" style="width: 100%">
        <p>Main content area; place any content here.</p>
        <oas-tag type="primary">flex 1</oas-tag>
      </oas-space>
    </oas-content>
    <oas-footer slot="footer">Footer info</oas-footer>
  </oas-layout>
</DemoBlock>

## Without sider

<DemoBlock title="Header + content + footer">
  <oas-layout style="height: 260px; width: 100%">
    <oas-header slot="header">Header area</oas-header>
    <oas-content slot="content">A layout with only the header and footer.</oas-content>
    <oas-footer slot="footer">Footer info</oas-footer>
  </oas-layout>
</DemoBlock>

## Collapsible sider

<DemoBlock title="Collapsible sider (collapsed)">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button size="small" onclick="document.querySelector('#layout-sider').toggleAttribute('collapsed')">Toggle sider collapse</oas-button>
    <oas-layout style="height: 260px; width: 100%">
      <oas-header slot="header">Header area</oas-header>
      <oas-sider id="layout-sider" slot="sider">Sider</oas-sider>
      <oas-content slot="content">Click the button above to collapse / expand the sider.</oas-content>
      <oas-footer slot="footer">Footer info</oas-footer>
    </oas-layout>
  </oas-space>
</DemoBlock>

## API

| Component     | Description                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| `oas-layout`  | Layout container (lays out horizontally when a sider is present)                                        |
| `oas-header`  | Top bar, renders as `<header>`                                                                          |
| `oas-sider`   | Sider; the `collapsed` attribute collapses it to a narrow bar; renders as `<aside aria-label="侧边栏">` |
| `oas-content` | Content area, renders as `<main>`                                                                       |
| `oas-footer`  | Footer, renders as `<footer>`                                                                           |

Child components must carry the matching `slot` attribute (`header` / `sider` / `content` / `footer`).
