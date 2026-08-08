# Layout 布局

经典的顶部 + 侧栏 + 内容 + 底部页面骨架，配合语义化子组件使用。

## 基础用法

<DemoBlock title="侧栏 + 头部 + 内容 + 底部">
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

## 无侧栏

<DemoBlock title="头部 + 内容 + 底部">
  <oas-layout style="height: 260px; width: 100%">
    <oas-header slot="header">头部区域</oas-header>
    <oas-content slot="content">仅含头部与底部的内容布局。</oas-content>
    <oas-footer slot="footer">底部信息</oas-footer>
  </oas-layout>
</DemoBlock>

## 可折叠侧栏

<DemoBlock title="折叠侧栏 collapsed">
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

| 组件          | 说明                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| `oas-layout`  | 布局容器（含侧栏时自动横向排布）                                       |
| `oas-header`  | 顶栏，渲染为 `<header>`                                                |
| `oas-sider`   | 侧栏，`collapsed` 属性折叠为窄条，渲染为 `<aside aria-label="侧边栏">` |
| `oas-content` | 内容区，渲染为 `<main>`                                                |
| `oas-footer`  | 底部，渲染为 `<footer>`                                                |

子组件需带对应 `slot` 属性（`header` / `sider` / `content` / `footer`）。
