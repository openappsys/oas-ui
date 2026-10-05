# IndexBar 索引栏

移动端分节列表 + 右侧字母索引导航：点按或拖拽字母跳转分节，滚动时反向联动当前字母高亮（scrollspy）。适合通讯录、城市选择等长列表的快速定位。

`items` 数据通过 `sections` 传入；字母侧栏从 `sections` 自动派生，无需单独维护。

## 基础用法

`sections` 传 JSON 数组 `[{ key, title?, items: [{ label, value? }] }]`，`title` 缺省回退 `key`，条目 `value` 缺省回退 `label`。设置 `height` 让列表在固定高度内滚动。

<DemoBlock title="基础用法">
  <div style="width: 100%">
    <oas-index-bar id="ib-basic" height="240" sections='[{"key":"A","title":"A","items":[{"label":"Adam","value":"adam"},{"label":"Anna","value":"anna"}]},{"key":"B","items":[{"label":"Ben","value":"ben"},{"label":"Bella","value":"bella"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]},{"key":"E","items":[{"label":"Eva","value":"eva"}]},{"key":"F","items":[{"label":"Finn","value":"finn"}]},{"key":"G","items":[{"label":"Gina","value":"gina"}]},{"key":"H","items":[{"label":"Hugo","value":"hugo"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## 事件反馈

点击条目派发 `oas-item-click`（`detail: { value, label, section }`）；点按 / 拖拽字母或滚动联动导致高亮字母变化时派发 `oas-change`（`detail: { key }`，初始渲染不派发）。

<DemoBlock title="事件反馈">
  <div style="width: 100%">
    <oas-index-bar id="ib-events" height="240" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"},{"label":"Anna","value":"anna"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]},{"key":"E","items":[{"label":"Eva","value":"eva"}]},{"key":"F","items":[{"label":"Finn","value":"finn"}]}]'></oas-index-bar>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    条目：<span id="ib-item-out">（点击条目查看）</span><br />
    高亮字母：<span id="ib-change-out">（点字母或滚动列表）</span>
  </p>
  </div>
</DemoBlock>

## 关闭吸顶（sticky）

分节头默认吸顶（`position: sticky`）；显式 `sticky="false"` 关闭，分节头随列表滚动。

<DemoBlock title="sticky=false 关闭吸顶">
  <div style="width: 100%">
    <oas-index-bar id="ib-nosticky" height="200" sticky="false" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]},{"key":"E","items":[{"label":"Eva","value":"eva"}]},{"key":"F","items":[{"label":"Finn","value":"finn"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## 滚动联动（scrollspy）

列表滚动时高亮最近一个越过分节头检测线的分节。`height` 缺省时不启用内部滚动，滚动联动改为监听页面视口。

<DemoBlock title="不设 height：列表自适应内容高">
  <div style="width: 100%">
    <oas-index-bar id="ib-auto" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## RTL 方向

侧栏位于 inline-end（逻辑属性，随书写方向翻转）：LTR 下在右侧，RTL 下在左侧。

<DemoBlock title="RTL（侧栏在左）">
  <div style="width: 100%">
    <oas-index-bar id="ib-rtl" dir="rtl" height="200" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

## 变量定制

不加 prop、纯 CSS 变量开口，dark 下自动走 token：

- `--oas-index-bar-letter-color`：字母常态色，默认次要文字 token
- `--oas-index-bar-letter-active-color`：当前字母色，默认主色 token
- `--oas-index-bar-letter-active-bg`：当前字母底色，默认 hover 背景 token
- `--oas-index-bar-header-bg`：分节头背景，默认 hover 背景 token

<DemoBlock title="变量定制（当前字母色 + 分节头底色）">
  <div style="width: 100%">
    <oas-index-bar id="ib-var" height="200" style="--oas-index-bar-letter-active-color: var(--oas-color-success-text); --oas-index-bar-header-bg: var(--oas-color-bg-elevated)" sections='[{"key":"A","items":[{"label":"Adam","value":"adam"}]},{"key":"B","items":[{"label":"Ben","value":"ben"}]},{"key":"C","items":[{"label":"Cara","value":"cara"}]},{"key":"D","items":[{"label":"Dan","value":"dan"}]}]'></oas-index-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const ev = document.getElementById('ib-events')
  const itemOut = document.getElementById('ib-item-out')
  const changeOut = document.getElementById('ib-change-out')
  ev?.addEventListener('oas-item-click', (e) => {
    itemOut.textContent = `oas-item-click: { value: "${e.detail.value}", label: "${e.detail.label}", section: "${e.detail.section}" }`
  })
  ev?.addEventListener('oas-change', (e) => {
    changeOut.textContent = `oas-change: { key: "${e.detail.key}" }`
  })
})
</script>

## API

### oas-index-bar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `height` | 列表区固定高度（px），超出时列表内部滚动；缺省时列表自适应内容高、滚动联动监听视口 | `string` | — |
| `sections` | 分节列表 JSON：`[{ key, title?, items: [{ label, value? }] }]`；字母侧栏从 sections 自动派生（key 唯一，重复保留首个），`title` 缺省回退 `key`，条目 `value` 缺省回退 `label` | `string` | `[]` |
| `sticky` | 分节头吸顶（默认 true）；显式 `sticky="false"` 关闭 | `string` | `true` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 当前高亮字母变化（点按/拖拽跳转或滚动联动），`detail: { key }`；初始渲染不派发 |
| `oas-item-click` | 点击列表条目，`detail: { value, label, section }`（`section` 为分节 key） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-index-bar-header-bg` | `var(--oas-color-bg-hover)` |
| `--oas-index-bar-letter-active-bg` | `var(--oas-color-bg-hover)` |
| `--oas-index-bar-letter-active-color` | `var(--oas-color-primary)` |
| `--oas-index-bar-letter-color` | `var(--oas-color-text-secondary)` |
