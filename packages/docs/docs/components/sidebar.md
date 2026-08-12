# Sidebar 侧栏

可折叠侧栏：桌面端 `collapsed` 收窄为图标条，移动端（窄于 `mobile-breakpoint`，默认 768px）自动切换为覆盖式抽屉 + 遮罩，点击外部 / 关闭按钮 / Esc 收起。

## 基础用法

`items` 属性传菜单 JSON（`[{label, value, icon?}]`）；默认 slot 放自定义内容。

<DemoBlock title="默认侧栏">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-basic" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"},{"label":"订单管理","value":"orders","icon":"📦"},{"label":"设置","value":"settings","icon":"⚙️"}]'>
      <oas-tag size="small">自定义内容区</oas-tag>
    </oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      右侧内容区
    </div>
  </div>
</DemoBlock>

## 折叠

点击底部「«」按钮切换 `collapsed`（受控属性，派发 `oas-collapse`）；折叠态只显示图标，无 icon 的菜单项自动隐藏。

<DemoBlock title="collapsed 图标态">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button size="small" onclick="document.querySelector('#sidebar-collapsible').toggleAttribute('collapsed')">切换折叠 collapsed</oas-button>
    <div style="height: 240px; width: 100%; display: flex">
      <oas-sidebar id="sidebar-collapsible" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"},{"label":"设置","value":"settings","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
        右侧内容区
      </div>
    </div>
  </oas-space>
</DemoBlock>

## 移动端抽屉

窄屏时侧栏自动变覆盖式抽屉：左上角悬浮 ☰ 按钮打开，遮罩 / 关闭按钮 / Esc 收起。用 `mobile-breakpoint` 调断点（此 demo 用 700px 方便在宽屏观察）。

<DemoBlock title="移动端抽屉（breakpoint 700）">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar mobile-breakpoint="700" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      把窗口 / 预览容器缩到 700px 以下，点击左上角 ☰ 打开抽屉
    </div>
  </div>
</DemoBlock>

## 移动端抽屉受控

`drawer-open` 为受控属性：外部设置 / 移除即可开合移动端抽屉（无需点击悬浮 ☰）。此 demo 将断点调高强制移动端形态，方便在宽屏观察。

<DemoBlock title="受控 drawer-open">
  <oas-space>
    <oas-button type="primary" onclick="document.getElementById('sidebar-drawer').setAttribute('drawer-open','')">打开抽屉（设置 drawer-open）</oas-button>
    <oas-button onclick="document.getElementById('sidebar-drawer').removeAttribute('drawer-open')">收起抽屉（移除 drawer-open）</oas-button>
  </oas-space>
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-drawer" mobile-breakpoint="2000" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"},{"label":"订单管理","value":"orders","icon":"📦"},{"label":"设置","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      外部按钮设置 <code>drawer-open</code> 控制抽屉开合；遮罩 / ✕ / Esc 收起后属性被移除。
    </div>
  </div>
</DemoBlock>

## 自定义宽度

`width` 属性覆盖展开宽度（默认走 `--oas-sidebar-width` token）；折叠态仍收窄为图标条。

<DemoBlock title="width 属性">
  <oas-space>
    <oas-button size="small" onclick="document.getElementById('sidebar-width').setAttribute('width','180px')">180px</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-width').setAttribute('width','280px')">280px</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-width').removeAttribute('width')">默认 token</oas-button>
  </oas-space>
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-width" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"},{"label":"设置","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      点击上方按钮切换展开宽度，观察侧栏宽度变化。
    </div>
  </div>
</DemoBlock>

## 与 oas-layout 配合

`oas-sidebar` 可直接作为 `oas-layout` 的 sider（slot="sider"）使用。

<DemoBlock title="sidebar 作 sider 使用">
  <oas-layout style="height: 300px; width: 100%">
    <oas-header slot="header">头部区域</oas-header>
    <oas-sidebar slot="sider" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"}]'>
      <oas-tag size="small">副内容</oas-tag>
    </oas-sidebar>
    <oas-content slot="content">
      <oas-space direction="vertical" style="width: 100%">
        <p>主要内容区。</p>
        <oas-tag type="primary">flex 1</oas-tag>
      </oas-space>
    </oas-content>
    <oas-footer slot="footer">底部信息</oas-footer>
  </oas-layout>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `collapsed` | 受控折叠，收窄为图标条（存在即折叠） | `boolean` | — |
| `drawer-open` | — | `boolean` | — |
| `items` | 菜单项 JSON `[{label, value, icon?}]` | `SidebarItem[] \| string` | `[]` |
| `mobile-breakpoint` | 移动端断点（px），窄于该值变覆盖式抽屉 | — | — |
| `width` | 展开宽度，默认走 `--oas-sidebar-width` token | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-collapse` | `detail: { collapsed: boolean }`；触发时机：桌面折叠按钮切换时 |
| `oas-select` | `detail: { value: string, label: string }`；触发时机：选中菜单项时（移动端同时收起抽屉） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `footer` | — |
| `header` | — |

### 部件（part）

`root` / `panel` / `head` / `close` / `nav` / `body` / `foot` / `toggle`（桌面折叠）/ `trigger`（移动触发）/ `mask` / `item`；头尾与主体内容分别通过 `slot="header"`、默认 slot、`slot="footer"` 注入。
