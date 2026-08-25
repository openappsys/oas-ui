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

## 视口锁定布局

`viewport`：admin 后台模式——布局锁定视口高，**顶栏/底栏固定，侧栏与内容各自独立滚动**（页面整体不出滚动条）。默认不带此属性时是整页滚动模型（内容多高页面多高）。

高度默认 `100dvh`（移动端地址栏友好，不支持时级联回退 `100vh`），可用 `--oas-layout-height` 改为 `100%` / `calc(...)` 等（下面 demo 为便于展示锁定为 320px）。

<DemoBlock title="视口锁定（viewport）+ 内嵌侧栏">
  <oas-layout id="layout-viewport" viewport style="--oas-layout-height: 320px; width: 100%">
    <oas-header slot="header">顶栏固定（不随内容滚动）</oas-header>
    <oas-sider slot="sider">
      <oas-sidebar id="layout-viewport-sidebar" collapsible items='[
        {"label":"仪表盘","value":"1","icon":"star"},
        {"label":"订单管理","value":"2","icon":"edit"},
        {"label":"商品管理","value":"3","icon":"heart"},
        {"label":"用户管理","value":"4","icon":"user"},
        {"label":"营销中心","value":"5","icon":"mail"},
        {"label":"财务结算","value":"6","icon":"lock"},
        {"label":"数据报表","value":"7","icon":"calendar"},
        {"label":"物流配置","value":"8","icon":"upload"},
        {"label":"消息通知","value":"9","icon":"info"},
        {"label":"权限管理","value":"10","icon":"filter"},
        {"label":"日志审计","value":"11","icon":"clock"},
        {"label":"系统设置","value":"12","icon":"gear"}
      ]'></oas-sidebar>
    </oas-sider>
    <oas-content slot="content">
      <div id="layout-viewport-content" style="padding: var(--oas-space-4)">
        <p>内容区独立滚动——向下滚动长内容，注意左侧侧栏与顶部顶栏保持不动。</p>
        <p>段落 1：视口锁定模式下，侧栏与内容各自在本区内滚动。</p>
        <p>段落 2：页面（body）不产生滚动条。</p>
        <p>段落 3：内嵌侧栏自动填满轨道宽度（sider 管宽、sidebar 跟随）。</p>
        <p>段落 4：滚动到这里时，顶栏仍然可见。</p>
        <p>段落 5：继续向下……</p>
        <p>段落 6：内容再长也只滚内容区。</p>
        <p>段落 7：侧栏菜单超出视口时，在侧栏内独立滚动。</p>
        <p>段落 8：适合后台管理系统的主框架布局。</p>
        <p>段落 9：顶栏固定 + 双区独立滚动的经典组合。</p>
        <p>段落 10：到 demo 底部了。</p>
      </div>
    </oas-content>
    <oas-footer slot="footer">底部固定</oas-footer>
  </oas-layout>
</DemoBlock>

> 内嵌宽度契约：`oas-sider` 管轨道宽度（`--oas-sider-width`，默认 200px，折叠 64px），内嵌的 `oas-sidebar` 自动填满轨道（不再用自身默认 220px，轨道 padding 同时卸除）；`oas-sidebar` 独立使用时仍走 `--oas-sidebar-width`（默认 220px）。两个变量职责：**sider 管轨道、sidebar 管独立**，改任一侧都不会错位。

## API

| 组件          | 说明                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| `oas-layout`  | 布局容器（含侧栏时自动横向排布）                                       |
| `oas-header`  | 顶栏，渲染为 `<header>`                                                |
| `oas-sider`   | 侧栏，`collapsed` 属性折叠为窄条，渲染为 `<aside aria-label="侧边栏">` |
| `oas-content` | 内容区，渲染为 `<main>`                                                |
| `oas-footer`  | 底部，渲染为 `<footer>`                                                |

子组件需带对应 `slot` 属性（`header` / `sider` / `content` / `footer`）。

### oas-layout

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `viewport` | 视口锁定模式：布局锁定视口高（默认 100dvh，不支持级联回退 100vh；`--oas-layout-height` 可改 100%/calc()），顶栏/底栏固定，侧栏与内容各自独立滚动；默认为整页滚动模型 | `boolean` | — |

| 名称 | 说明 |
| --- | --- |
| `content` | — |
| `footer` | — |
| `header` | — |
| `sider` | — |

### oas-header

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-sider

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-content

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-footer

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
