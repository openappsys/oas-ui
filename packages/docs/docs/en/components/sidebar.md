# Sidebar

A collapsible side bar: on desktop, `collapsed` narrows it to an icon strip; on mobile (narrower than `mobile-breakpoint`, default 768px) it automatically becomes an overlay drawer with a backdrop. Clicking outside, the close button or Esc collapses it.

## Basic usage

Pass menu JSON via the `items` attribute (`[{label, value, icon?}]`); the default slot holds custom content.

<DemoBlock title="Default sidebar">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-basic" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"},{"label":"订单管理","value":"orders","icon":"📦"},{"label":"设置","value":"settings","icon":"⚙️"}]'>
      <oas-tag size="small">自定义内容区</oas-tag>
    </oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      右侧内容区
    </div>
  </div>
</DemoBlock>

## Collapsing

Clicking the bottom「«」button toggles `collapsed` (a controlled attribute; fires `oas-collapse`). In the collapsed state only icons are shown, and menu items without an `icon` are hidden automatically.

<DemoBlock title="collapsed icon state">
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

## Mobile drawer

On narrow screens the sidebar automatically becomes an overlay drawer: the floating ☰ button at the top-left opens it, and the backdrop / close button / Esc collapses it. Tune the breakpoint with `mobile-breakpoint` (this demo uses 700px so it can be observed on a wide screen).

<DemoBlock title="Mobile drawer (breakpoint 700)">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar mobile-breakpoint="700" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      把窗口 / 预览容器缩到 700px 以下，点击左上角 ☰ 打开抽屉
    </div>
  </div>
</DemoBlock>

## Controlled mobile drawer

`drawer-open` is a controlled attribute: setting/removing it externally opens/closes the mobile drawer (no need to click the floating ☰). This demo raises the breakpoint to force the mobile form so it can be observed on a wide screen.

<DemoBlock title="Controlled drawer-open">
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

## Custom width

The `width` attribute overrides the expanded width (defaults to the `--oas-sidebar-width` token); the collapsed state still narrows to an icon strip.

<DemoBlock title="width attribute">
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

## Combining with oas-layout

`oas-sidebar` can be used directly as the sider of `oas-layout` (slot="sider").

<DemoBlock title="sidebar as the sider">
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

| Property             | Description                                          | Type                             | Default |
| -------------------- | ---------------------------------------------------- | -------------------------------- | ------- |
| `collapsed`          | Controlled collapse to an icon strip (present means collapsed) | boolean                  | `false` |
| `items`              | Menu items JSON `[{label, value, icon?}]`            | string（JSON）                   | —       |
| `width`              | Expanded width; defaults to the `--oas-sidebar-width` token | string (e.g. `280px`)     | token   |
| `mobile-breakpoint`  | Mobile breakpoint (px); narrower than this becomes an overlay drawer | number            | `768`   |

### Events

| Event         | detail                             | When fired                    |
| ------------- | ---------------------------------- | ----------------------------- |
| `oas-collapse`| `{ collapsed: boolean }`           | Desktop collapse button toggled |
| `oas-select`  | `{ value: string, label: string }` | A menu item was selected (also collapses the drawer on mobile) |

### Parts

`root` / `panel` / `head` / `close` / `nav` / `body` / `foot` / `toggle` (desktop collapse) / `trigger` (mobile trigger) / `mask` / `item`; the header and footer content are injected via `slot="header"`, the default slot and `slot="footer"` respectively.
