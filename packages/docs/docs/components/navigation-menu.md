# NavigationMenu 多级导航

网站式多级导航栏：顶级触发器悬停/点击打开统一视口面板（大面板多列链接卡），支持延迟开合、受控打开项、键盘导航，`href` 叶子项渲染为链接。

## 基础用法（大面板）

<DemoBlock title="基础用法">
  <oas-navigation-menu keep-mounted id="nav-basic" onoas-select="navLog(event)" onoas-change="navChange(event)" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 开箱即用组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"完整 API 文档与指南"},{"label":"更多","value":"more","children":[{"label":"博客","value":"blog","href":"/blog"},{"label":"社区","value":"community","href":"/community"}]}]},{"label":"定价","value":"pricing","href":"/pricing"},{"label":"关于","value":"about","href":"/about"}]'></oas-navigation-menu>
  <oas-tag id="nav-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 受控打开（value + oas-change）

<DemoBlock title="受控打开">
  <oas-button-group>
    <oas-button id="nav-open-a" size="small">打开产品</oas-button>
    <oas-button id="nav-open-b" size="small">打开资源</oas-button>
    <oas-button id="nav-close" size="small">关闭</oas-button>
  </oas-button-group>
  <br />
  <oas-navigation-menu id="nav-controlled" value="products" onoas-change="navControlled(event)" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 开箱即用组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"完整 API 文档与指南"}]},{"label":"资源","value":"resources","children":[{"label":"主题","value":"themes","href":"/themes","icon":"star","description":"主题定制与令牌"},{"label":"指南","value":"guide","href":"/guide","icon":"mail","description":"上手与最佳实践"}]},{"label":"定价","value":"pricing","href":"/pricing"}]'></oas-navigation-menu>
  <oas-tag id="nav-controlled-result" type="info">当前打开：products</oas-tag>
</DemoBlock>

## 延迟开合

<DemoBlock title="延迟开合">
  <oas-navigation-menu delay-duration="300" skip-delay-duration="500" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","description":"API 文档"}]},{"label":"资源","value":"resources","children":[{"label":"主题","value":"themes","href":"/themes","description":"主题定制"},{"label":"指南","value":"guide","href":"/guide","description":"上手指南"}]}]'></oas-navigation-menu>
</DemoBlock>

## 垂直方向

<DemoBlock title="垂直方向">
  <oas-navigation-menu orientation="vertical" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"API 文档"}]},{"label":"定价","value":"pricing","href":"/pricing"},{"label":"关于","value":"about","href":"/about"}]'></oas-navigation-menu>
</DemoBlock>

## 多列网格

<DemoBlock title="多列网格（columns=3）">
  <oas-navigation-menu columns="3" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"API 文档"},{"label":"主题","value":"themes","href":"/themes","icon":"star","description":"主题定制"},{"label":"指南","value":"guide","href":"/guide","icon":"mail","description":"上手实践"},{"label":"博客","value":"blog","href":"/blog","icon":"edit","description":"技术博客"},{"label":"社区","value":"community","href":"/community","icon":"user","description":"用户社区"}]}]'></oas-navigation-menu>
</DemoBlock>

## 遮罩 + 保挂载 + 箭头

<DemoBlock title="遮罩 + 保挂载 + 箭头">
  <oas-navigation-menu backdrop keep-mounted arrow items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components","icon":"grid","description":"30+ 组件"},{"label":"文档","value":"docs","href":"/docs","icon":"book","description":"API 文档"}]}]'></oas-navigation-menu>
  <p class="demo-tip">backdrop 打开时显示遮罩；keep-mounted 关闭后保留面板 DOM；arrow 显示指向箭头。</p>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-navigation-menu items='[{"label":"首页","value":"home","href":"/"},{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components"},{"label":"文档","value":"docs","href":"/docs","disabled":true}]}]'></oas-navigation-menu>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.navLog = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
  window.navChange = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `已选择：${e.detail.value || '（关闭）'}`
  }
  window.navControlled = (e) => {
    const tag = document.getElementById('nav-controlled-result')
    if (tag) tag.textContent = `当前打开：${e.detail.value || '（关闭）'}`
  }
  const controlled = document.getElementById('nav-controlled')
  const setOpen = (v) => controlled && controlled.setAttribute('value', v)
  document.getElementById('nav-open-a')?.addEventListener('click', () => setOpen('products'))
  document.getElementById('nav-open-b')?.addEventListener('click', () => setOpen('resources'))
  document.getElementById('nav-close')?.addEventListener('click', () => setOpen(''))
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrow` | 弹出层指向箭头，默认显示；`arrow="false"` 隐藏 | `string` | `true` |
| `backdrop` | 打开时显示遮罩（点击遮罩关闭） | `boolean` | — |
| `columns` | 面板网格列数，默认 2（大面板多列链接卡） | `string` | `2` |
| `delay-duration` | hover 开合延迟（毫秒），默认 200；点击/键盘立即生效不受影响 | `string` | `200` |
| `items` | 导航项 JSON（层级结构；叶子项可带 `description` 描述与 `icon` 图标渲染大面板链接卡） | `string` | `[]` |
| `keep-mounted` | 关闭时保留面板 DOM 不销毁（供爬虫索引/SEO） | `boolean` | — |
| `orientation` | 布局方向：`horizontal`（默认）/ `vertical`（面板在触发器右侧） | `string` | `horizontal` |
| `skip-delay-duration` | 跳过延迟窗口（毫秒），默认 300：关闭后窗口内再次 hover 其他项直接打开跳过延迟 | `string` | `300` |
| `value` | 受控打开项（顶级触发器 value，空字符串 = 关闭；存在时打开态以属性为准，交互仅派发 `oas-change` 由宿主更新） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 打开项变化，`detail: { value }`（value 为打开的顶级项 value，空字符串 = 关闭） |
| `oas-select` | 选择某项（顶级叶子链接或面板链接卡），`detail: { value }` |

`NavItem` 字段（继承 `MenuItem`）：

| 字段          | 说明                                                | 类型      |
| ------------- | --------------------------------------------------- | --------- |
| `label`       | 导航文字                                            | `string`  |
| `value`       | 选中值                                              | `string`  |
| `href`        | 链接地址（可选）；叶子项带 href 渲染为 `<a>` 可跳转  | `string`  |
| `target`      | 链接打开方式（可选）                                | `string`  |
| `icon`        | 图标名（可选）；面板链接卡图标                      | `string`  |
| `description` | 链接卡描述（可选）；大面板形态下渲染在标题下方      | `string`  |
| `active`      | 当前页标记（可选）；链接渲染 `aria-current="page"`  | `boolean` |
| `disabled`    | 禁用                                              | `boolean` |
| `children`    | 子导航项（可选）；有 children 的顶级项打开大面板，面板内渲染 inline 二级子导航 | `NavItem[]` |

交互：悬停（延迟 `delay-duration` 后）/ 点击顶级触发器打开统一视口面板；点击面板链接卡选择并派发 `oas-select`；打开项变化派发 `oas-change`。外部点击关闭；`Esc` 关闭面板；`←`/`→`（垂直 `↑`/`↓`）顶级切换、`↓`（垂直 `→`）打开面板聚焦首项、面板内 `↓`/`↑` 移动、`→` 展开 inline 二级子导航、`Enter` 选择；面板打开时 `Tab` 在面板项间循环（焦点陷阱）。
