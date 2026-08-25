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

## 受控高亮

`active` 为受控属性：外部设置 / 清除即可迁移当前高亮菜单项（无需点击）。

<DemoBlock title="受控 active">
  <oas-space>
    <oas-button type="primary" size="small" onclick="document.getElementById('sidebar-active').setAttribute('active','dashboard')">高亮「数据看板」</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-active').setAttribute('active','settings')">高亮「设置」</oas-button>
    <oas-button size="small" onclick="document.getElementById('sidebar-active').removeAttribute('active')">清除高亮</oas-button>
  </oas-space>
  <div style="height: 240px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-active" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dashboard","icon":"📊"},{"label":"订单管理","value":"orders","icon":"📦"},{"label":"设置","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      外部按钮设置 <code>active</code> 控制当前高亮菜单项；清除后恢复默认（无高亮，取末项）。
    </div>
  </div>
</DemoBlock>

## 分组

菜单项 `items` 支持可选 `group` 字段：连续同组项在组首项前渲染组标题（纯展示、不可点）；折叠态组标题隐藏，移动抽屉态正常显示。

<DemoBlock title="分组（items.group）">
  <div style="height: 300px; width: 100%; display: flex">
    <oas-sidebar items='[{"label":"仪表盘","value":"dash","icon":"📊","group":"概览"},{"label":"实时趋势","value":"trend","icon":"📈","group":"概览"},{"label":"订单管理","value":"orders","icon":"📦","group":"业务"},{"label":"商品管理","value":"goods","icon":"🛍️","group":"业务"},{"label":"用户管理","value":"users","icon":"👥","group":"业务"},{"label":"个人中心","value":"me","icon":"👤"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      「概览」「业务」为组标题；「个人中心」无 group 字段，平铺显示。
    </div>
  </div>
</DemoBlock>

## 嵌套子菜单

菜单项支持 `children` 嵌套：父项点击展开/收起（不派发 `oas-select`），含激活子项的父项自动展开；折叠图标条态子树隐藏。

<DemoBlock title="嵌套子菜单（items.children）">
  <div style="height: 340px; width: 100%; display: flex">
    <oas-sidebar active="users" items='[{"label":"仪表盘","value":"dash","icon":"📊"},{"label":"业务管理","value":"biz","icon":"📦","children":[{"label":"订单管理","value":"orders"},{"label":"商品管理","value":"goods"},{"label":"用户管理","value":"users"}]},{"label":"系统设置","value":"sys","icon":"⚙️","children":[{"label":"权限管理","value":"perm"},{"label":"审计日志","value":"audit"}]}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      「业务管理」因含激活子项（用户管理）自动展开；点击父项只切换展开，点击子项才派发选择。
    </div>
  </div>
</DemoBlock>

## 徽标与项操作

菜单项支持 `badge` 计数徽标（色值走 `--oas-sidebar-badge-bg/-color` 变量开口）与 `actions` 悬停操作按钮（点击派发 `oas-action`，不触发选中）。

<DemoBlock title="徽标与项操作">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar id="sidebar-badge-action" items='[{"label":"收件箱","value":"inbox","icon":"📥","badge":"12"},{"label":"通知","value":"notice","icon":"🔔","badge":"3"},{"label":"项目","value":"proj","icon":"📁","actions":[{"icon":"✏️","value":"edit","label":"编辑"},{"icon":"🗑️","value":"delete","label":"删除"}]}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      <p>悬停「项目」项出现操作按钮；点击派发 <code>oas-action</code> 事件。</p>
      <oas-tag id="sidebar-action-log" type="info">尚无操作</oas-tag>
    </div>
  </div>
</DemoBlock>

## 分隔线与骨架屏

`{type:"divider"}` 条目渲染分隔线；`loading` 属性显示脉冲骨架屏（数值为骨架行数，默认 4）。

<DemoBlock title="分隔线 + loading">
  <oas-space style="width: 100%">
    <oas-button size="small" onclick="document.getElementById('sidebar-loading').toggleAttribute('loading')">切换 loading</oas-button>
    <div style="height: 280px; width: 100%; display: flex">
      <oas-sidebar id="sidebar-loading" items='[{"label":"仪表盘","value":"dash","icon":"📊"},{"type":"divider"},{"label":"订单","value":"orders","icon":"📦"},{"label":"用户","value":"users","icon":"👥"}]'></oas-sidebar>
      <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">点击按钮切换骨架屏。</div>
    </div>
  </oas-space>
</DemoBlock>

## 快捷键与键盘导航

`shortcut` 属性开启 `Ctrl/Cmd+B` 折叠切换（默认关闭，避免劫持全局键）；菜单支持 `↑/↓` 移动焦点、`Home/End` 跳首末、`Enter/Space` 激活。

<DemoBlock title="快捷键（shortcut）+ 键盘导航">
  <div style="height: 260px; width: 100%; display: flex">
    <oas-sidebar shortcut items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据","value":"data","icon":"📊"},{"label":"设置","value":"settings","icon":"⚙️"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      按 <oas-kbd>Ctrl</oas-kbd>+<oas-kbd>B</oas-kbd> 折叠/展开；Tab 聚焦到菜单后可用方向键导航。
    </div>
  </div>
</DemoBlock>

## 悬停展开（expand-on-hover）

`expand-on-hover` 属性：折叠图标条悬停时临时展开（纯视觉态，不改 `collapsed` 受控属性）。

<DemoBlock title="expand-on-hover">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button size="small" onclick="document.getElementById('sidebar-hover').toggleAttribute('collapsed')">先折叠为图标条</oas-button>
    <div style="height: 260px; width: 100%; display: flex">
      <oas-sidebar id="sidebar-hover" expand-on-hover collapsed items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据看板","value":"dash","icon":"📊"},{"label":"设置","value":"settings","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
        图标条态悬停侧栏即临时展开显示文字，移开收回。
      </div>
    </div>
  </oas-space>
</DemoBlock>

## 形态（variant）

`variant` 形态：`sidebar`（默认贴边）/ `floating`（悬浮：外边距 + 圆角 + 阴影）/ `inset`（内嵌：外边距 + 圆角 + 背景对比）。

<DemoBlock title="variant: floating / inset">
  <oas-space style="width: 100%">
    <div style="height: 240px; flex: 1; display: flex; background: var(--oas-color-bg-hover); padding: var(--oas-space-2)">
      <oas-sidebar variant="floating" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"设置","value":"s","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; padding: var(--oas-space-4)">floating</div>
    </div>
    <div style="height: 240px; flex: 1; display: flex; background: var(--oas-color-bg); padding: var(--oas-space-2)">
      <oas-sidebar variant="inset" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"设置","value":"s","icon":"⚙️"}]'></oas-sidebar>
      <div style="flex: 1; padding: var(--oas-space-4)">inset</div>
    </div>
  </oas-space>
</DemoBlock>

## 右侧与双侧栏

`side="right"`：移动抽屉从右侧滑入、触发按钮居右；多个侧栏可并存（左右各一，状态相互独立）。

<DemoBlock title="side=right + 双侧栏">
  <div style="height: 280px; width: 100%; display: flex">
    <oas-sidebar mobile-breakpoint="2000" items='[{"label":"主导航","value":"main","icon":"🏠"},{"label":"数据","value":"data","icon":"📊"}]'></oas-sidebar>
    <div style="flex: 1; min-width: 0; padding: var(--oas-space-4); background: var(--oas-color-bg)">
      左「主导航」、右「辅助面板」（side=right），各自独立开合（本 demo 强制移动态便于观察）。
    </div>
    <oas-sidebar side="right" mobile-breakpoint="2000" items='[{"label":"辅助面板","value":"aux","icon":"🔧"},{"label":"日志","value":"log","icon":"📋"}]'></oas-sidebar>
  </div>
</DemoBlock>

## 拖拽调宽（oas-splitter 组合）

侧栏宽度调整推荐用 `oas-splitter` 分割面板组合实现（无需内置 rail）：侧栏置于分割面板左侧，拖拽分割条即调宽。

<DemoBlock title="oas-splitter + sidebar">
  <div style="height: 280px; width: 100%">
    <oas-splitter percent="22" min="12" max="45">
      <oas-sidebar slot="left" width="100%" items='[{"label":"首页","value":"home","icon":"🏠"},{"label":"数据","value":"data","icon":"📊"},{"label":"设置","value":"s","icon":"⚙️"}]'></oas-sidebar>
      <div slot="right" style="padding: var(--oas-space-4)">拖拽中间分割条调整侧栏宽度（侧栏以 `width="100%"` 填满左面板，宽度实时跟随）。</div>
    </oas-splitter>
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
| `active` | 当前高亮菜单项 value（受控：外部设置/清除立即高亮迁移，重绘） | `string` | — |
| `collapsed` | 受控折叠，收窄为图标条（存在即折叠） | `boolean` | — |
| `drawer-open` | 移动端抽屉打开态（受控：设置即开、清除即收；断点回桌面自动移除） | `boolean` | — |
| `expand-on-hover` | 折叠图标条悬停临时展开（纯视觉态，不改 collapsed 受控） | — | — |
| `items` | 菜单项 JSON `[{label, value, icon?, group?, badge?, children?, actions?}]`（支持分隔线条目 `{type:"divider"}`；children 嵌套子菜单） | `SidebarEntry[] \| string` | `[]` |
| `loading` | 骨架屏加载态（存在即显示脉冲骨架；数值为骨架行数，默认 4） | `string` | `4` |
| `mobile-breakpoint` | 移动端断点（px），窄于该值变覆盖式抽屉 | — | — |
| `shortcut` | 开启 Ctrl/Cmd+B 折叠切换（默认关闭，避免劫持全局键） | `boolean` | — |
| `side` | 抽屉侧向：left（默认）/ right（移动抽屉从右侧滑入、触发按钮居右） | — | — |
| `variant` | 形态：sidebar（默认贴边）/ floating（悬浮圆角阴影）/ inset（内嵌圆角背景） | — | — |
| `width` | 展开宽度，默认走 `--oas-sidebar-width` token | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-action` | `detail: { value: string, action: string, label: string }`；触发时机：点击项悬停操作按钮时（不触发 oas-select） |
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
