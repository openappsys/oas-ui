# BottomNavigation 底部导航

移动端底部导航栏：`role="tablist"` + 每项 `role="tab"` + `aria-selected` 同步，键盘左右移动焦点（roving tabindex）、Enter/Space 选中，激活项主色 + 图标，顶部细分隔线。

> 默认是静态布局；需要固定到屏幕底部时加 `fixed` 属性（`position: fixed; bottom: 0`，建议放在 `body` 直接子级避免被滚动容器带偏）。

## 基础用法

`items` 传 JSON 数组 `[{ label, value, icon? }]`，`icon` 取 `@oas-ui/icons` 的 iconRegistry 图标名；未指定 `value` 时默认激活第一项。

<DemoBlock title="基础用法">
  <oas-bottom-navigation id="bn-basic" value="home" style="width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"搜索","icon":"search","value":"search"},{"label":"消息","icon":"mail","value":"mail"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## 受控 value

`value` 属性受控：外部设置即切换激活项，组件交互也会写回属性并派发 `oas-change`。

<DemoBlock title="受控切换">
  <oas-bottom-navigation id="bn-ctrl" value="home" style="width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"收藏","icon":"star","value":"favorite"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
  <oas-button-group>
    <oas-button size="small" type="primary" onclick="bnSet('home')">首页</oas-button>
    <oas-button size="small" onclick="bnSet('favorite')">收藏</oas-button>
    <oas-button size="small" onclick="bnSet('mine')">我的</oas-button>
  </oas-button-group>
  <span id="bn-out" style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 禁用项

`disabled` 项 `aria-disabled` 同步、不可点击选中，键盘方向键自动跳过。

<DemoBlock title="禁用项">
  <oas-bottom-navigation value="home" style="width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"发现","icon":"heart","value":"discover","disabled":true},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## 固定底部（fixed）

加 `fixed` 属性固定在视口底部（`bottom: 0`）。演示页为避免遮挡内容使用静态布局；实际移动端场景请用 `fixed`。

<DemoBlock title="fixed 示意（此处保持 static）">
  <oas-bottom-navigation fixed style="position: static; width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"搜索","icon":"search","value":"search"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const ctrl = document.getElementById('bn-ctrl')
  const out = document.getElementById('bn-out')
  ctrl?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: { value: "${e.detail.value}" }`
  })
  window.bnSet = (value) => ctrl?.setAttribute('value', value)
})
</script>

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-bottom-navigation-item>` 子元素声明式书写（`items` 属性**显式设置时优先**，未设置时解析子元素收敛到同一渲染路径）。默认插槽文本为 label，属性对齐 `BottomNavItem` 字段：`value` / `icon` / `disabled` / `badge`。子元素增删、属性与文本变化会自动重渲染（MutationObserver）。

<DemoBlock title="子元素声明式（icon / disabled）">
  <oas-bottom-navigation id="bn-decl" value="home" style="width: 100%; max-width: 480px">
    <oas-bottom-navigation-item value="home" icon="user">首页</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="discover" icon="heart" disabled>发现</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="mine" icon="gear">我的</oas-bottom-navigation-item>
  </oas-bottom-navigation>
</DemoBlock>

## 角标（badge）

数据项加 `badge`（数字/文本）即渲染右上角标、叠在 icon 上；未设置不渲染。角标样式走 badge 既有 token（`--oas-badge-bg` / `--oas-badge-on-color`，默认 danger），items 通道与子元素通道行为一致。

<DemoBlock title="角标（items 通道）">
  <oas-bottom-navigation id="bn-badge" value="home" style="width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"消息","icon":"mail","value":"mail","badge":"5"},{"label":"我的","icon":"gear","value":"mine","badge":"新"}]'></oas-bottom-navigation>
</DemoBlock>

<DemoBlock title="角标（子元素通道）">
  <oas-bottom-navigation id="bn-badge-decl" value="home" style="width: 100%; max-width: 480px">
    <oas-bottom-navigation-item value="home" icon="user">首页</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="mail" icon="mail" badge="99+">消息</oas-bottom-navigation-item>
    <oas-bottom-navigation-item value="mine" icon="gear">我的</oas-bottom-navigation-item>
  </oas-bottom-navigation>
</DemoBlock>

## 安全区（safe-area）

`safe-area` 布尔属性（需配合 `fixed`）：fixed 模式下底部加 `env(safe-area-inset-bottom)` 内边距，避开刘海屏底部 home 指示条；非 fixed 模式无效果。演示页保持 static，移动端真机请用 `fixed` + `safe-area`。

<DemoBlock title="safe-area 示意（此处保持 static）">
  <oas-bottom-navigation fixed safe-area style="position: static; width: 100%; max-width: 480px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"搜索","icon":"search","value":"search"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## 变量定制

不加 prop、纯 CSS 变量开口，dark 下自动走 token：

- `--oas-bottom-navigation-active-color`：激活项颜色，默认主色 token
- `--oas-bottom-navigation-height`：导航栏高度，默认 `56px`（fixed 模式下固定条高度即此值）

<DemoBlock title="变量定制（激活色 + 高度）">
  <oas-bottom-navigation id="bn-var" value="home" style="width: 100%; max-width: 480px; --oas-bottom-navigation-active-color: var(--oas-color-success); --oas-bottom-navigation-height: 64px" items='[{"label":"首页","icon":"user","value":"home"},{"label":"搜索","icon":"search","value":"search"},{"label":"我的","icon":"gear","value":"mine"}]'></oas-bottom-navigation>
</DemoBlock>

## API

### oas-bottom-navigation

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `fixed` | 固定到视口底部（`position: fixed; bottom: 0`） | `boolean` | — |
| `items` | 导航项 JSON | `string` | `[]` |
| `safe-area` | fixed 模式下底部加安全区内边距（`env(safe-area-inset-bottom)`），避开刘海屏 home 指示条；非 fixed 无效果 | `boolean` | — |
| `value` | 激活项 value，未指定默认激活第一个可用项 | — | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换激活项，`detail: { value }` |

### oas-bottom-navigation-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `badge` | 右上角标（数字/文本，叠在 icon 上；未设置不渲染） | — | — |
| `disabled` | 禁用该项（不可选中、键盘跳过） | — | — |
| `icon` | 前置图标（`@oas-ui/icons` 注册表图标名） | — | — |
| `value` | 选中值（子元素声明式通道的数据载体字段） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 底部导航项 label 内容（默认插槽文本） |

`BottomNavItem` 字段：

| 字段     | 说明                                                 | 类型     |
| -------- | ---------------------------------------------------- | -------- |
| `label`  | 文案                                                 | `string` |
| `value`  | 值（唯一标识）                                       | `string` |
| `icon`   | 图标名（`@oas-ui/icons` 的 iconRegistry 键）        | `string` |
| `disabled` | 禁用（不可选中、键盘跳过）                         | `boolean` |
| `badge`  | 右上角标（数字/文本，叠在 icon 上；未设置不渲染）   | `string` |

行为：`role="tablist"` + `role="tab"` + `aria-selected` / `aria-disabled` 同步；roving tabindex 仅激活项可聚焦；方向键（左右/上下）在可用项间循环移动焦点（Home/End 首尾），Enter/Space 选中当前焦点项；点击已激活项不重复派发；空 `items` 渲染空 tablist 不报错。激活项主色 + 图标（iconRegistry 内联 SVG，跟随 currentColor），顶部细分隔线；`badge` 右上角标（叠在 icon 上，走 badge token）；`fixed` + `safe-area` 加底部安全区内边距。
