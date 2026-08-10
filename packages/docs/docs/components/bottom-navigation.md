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

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `fixed` | 固定到视口底部（`position: fixed; bottom: 0`） | — | — |
| `items` | 导航项 JSON | — | `[]` |
| `value` | 激活项 value，未指定默认激活第一个可用项 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换激活项，`detail: { value }` |

`BottomNavItem` 字段：

| 字段     | 说明                                                 | 类型     |
| -------- | ---------------------------------------------------- | -------- |
| `label`  | 文案                                                 | `string` |
| `value`  | 值（唯一标识）                                       | `string` |
| `icon`   | 图标名（`@oas-ui/icons` 的 iconRegistry 键）        | `string` |
| `disabled` | 禁用（不可选中、键盘跳过）                         | `boolean` |

行为：`role="tablist"` + `role="tab"` + `aria-selected` / `aria-disabled` 同步；roving tabindex 仅激活项可聚焦；方向键（左右/上下）在可用项间循环移动焦点（Home/End 首尾），Enter/Space 选中当前焦点项；点击已激活项不重复派发；空 `items` 渲染空 tablist 不报错。激活项主色 + 图标（iconRegistry 内联 SVG，跟随 currentColor），顶部细分隔线。
