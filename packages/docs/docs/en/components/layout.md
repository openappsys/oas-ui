# Layout

A classic page skeleton of header + sider + content + footer, used with semantic child components.

## Basic usage

<DemoBlock title="Sider + header + content + footer">
  <oas-layout style="height: 300px; width: 100%">
    <oas-header slot="header">头部区域</oas-header>
    <oas-sider slot="sider">侧边栏</oas-sider>
    <oas-content slot="content">
      <oas-space direction="vertical" style="width: 100%">
        <p>主要内容区，可放置任意内容。</p>
        <oas-tag type="primary">flex 1</oas-tag>
      </oas-space>
    </oas-content>
    <oas-footer slot="footer">底部信息</oas-footer>
  </oas-layout>
</DemoBlock>

## Without sider

<DemoBlock title="Header + content + footer">
  <oas-layout style="height: 260px; width: 100%">
    <oas-header slot="header">头部区域</oas-header>
    <oas-content slot="content">仅含头部与底部的内容布局。</oas-content>
    <oas-footer slot="footer">底部信息</oas-footer>
  </oas-layout>
</DemoBlock>

## Collapsible sider

<DemoBlock title="Collapsible sider (collapsed)">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button size="small" onclick="document.querySelector('#layout-sider').toggleAttribute('collapsed')">切换侧栏折叠</oas-button>
    <oas-layout style="height: 260px; width: 100%">
      <oas-header slot="header">头部区域</oas-header>
      <oas-sider id="layout-sider" slot="sider">侧边栏</oas-sider>
      <oas-content slot="content">点击上方按钮折叠 / 展开侧栏。</oas-content>
      <oas-footer slot="footer">底部信息</oas-footer>
    </oas-layout>
  </oas-space>
</DemoBlock>

## API

| Component    | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `oas-layout` | Layout container (lays out horizontally when a sider is present)         |
| `oas-header` | Top bar, renders as `<header>`                                           |
| `oas-sider`  | Sider; the `collapsed` attribute collapses it to a narrow bar; renders as `<aside aria-label="侧边栏">` |
| `oas-content`| Content area, renders as `<main>`                                        |
| `oas-footer` | Footer, renders as `<footer>`                                            |

Child components must carry the matching `slot` attribute (`header` / `sider` / `content` / `footer`).
