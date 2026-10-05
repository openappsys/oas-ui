# NoticeBar 通告栏

页面顶部/区块内的通告条：图标 + 文本 + 可关闭 + action 链接。文本超长时可横向无缝滚动（内嵌 `oas-marquee` 组合复用其滚动引擎）；多条通告以 `items` 纵向轮播（淡入淡出，`prefers-reduced-motion` 下不自动轮播）。配色走语义 token，暗色主题自动适配。

## 基础用法

<DemoBlock title="默认通告（info）">
  <oas-notice-bar>系统将于今晚 23:00 – 24:00 进行例行维护，期间服务可能出现短暂波动。</oas-notice-bar>
</DemoBlock>

## 通告类型

`type` 支持 `info`（默认，主色系）/ `success` / `warning` / `error`，底色与图标色随语义 token 派生；图标缺省按类型自动匹配（`icon="none"` 不显示，`icon` 属性可指定任意图标名）。

<DemoBlock title="四种类型">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar type="info">info：本周五 18:00 停服维护 30 分钟，请提前保存工作。</oas-notice-bar>
    <oas-notice-bar type="success">success：数据同步已完成，共 128 条记录。</oas-notice-bar>
    <oas-notice-bar type="warning">warning：存储空间剩余不足 10%，请及时清理。</oas-notice-bar>
    <oas-notice-bar type="error">error：网络连接中断，正在自动重试……</oas-notice-bar>
  </div>
</DemoBlock>

## 可关闭

`closable` 显示关闭按钮：点击后派发 `oas-close` 并自隐藏（淡出退场）；宿主重新设置 `open` 属性即可恢复显示（组件关闭时会自移除 open）。

<DemoBlock title="可关闭 + 恢复">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar id="nb-close-demo" closable>点右侧 ✕ 关闭本条通告，再用下方按钮恢复。</oas-notice-bar>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="nb-close-restore" size="small" disabled>恢复显示</oas-button>
      <span id="nb-close-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

## 多条轮播（items）

`items` 传 JSON 字符串数组，多条通告纵向轮播（淡出 → 换文本 → 淡入），间隔 `interval` 毫秒（默认 4000）。`prefers-reduced-motion` 下不自动轮播，静态显示第一条；轮播自动播放时内容区 `aria-live="off"`，不打扰读屏。非法 JSON / 空数组回退默认插槽单条内容。

<DemoBlock title="items 轮播（interval=2500）">
  <oas-notice-bar id="nb-items-demo" items='["第一条：版本 v2.7 已发布","第二条：新版主题编辑器上线","第三条：移动端组件批次立项"]' interval="2500"></oas-notice-bar>
</DemoBlock>

## action 操作

`action-text` 给出右侧操作文字；`href` 在场渲染为 `<a>`（原生导航），缺省渲染为 `<button>`（点击派发 `oas-action-click`）。

<DemoBlock title="action：链接形态与按钮形态">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar action-text="查看详情" href="https://developer.mozilla.org/zh-CN/">链接形态：点击走原生导航（href 在场）。</oas-notice-bar>
    <oas-notice-bar id="nb-action-demo" action-text="立即升级">按钮形态：点击派发 oas-action-click（无 href）。</oas-notice-bar>
    <span id="nb-action-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

## 超长滚动（scrollable）

`scrollable` 开启后，单条内容超长时横向无缝滚动——内嵌 `oas-marquee` 组合复用其滚动引擎（无缝循环、内容不足一屏自动填充、`prefers-reduced-motion` 静态降级均由 marquee 承担）。注意：滚动副本处于组件 shadow 内，页面样式表的 class 选择器不作用于副本（行内样式保留），滚动内容建议用纯文本或行内样式。

<DemoBlock title="scrollable：超长通告横向滚动">
  <oas-notice-bar scrollable>长通告：这是一条特别长的公告文本，用于演示超长内容的横向无缝滚动效果——无缝循环、恒定速度，悬停行为与暗色降级由内嵌走马灯引擎统一处理。</oas-notice-bar>
</DemoBlock>

## 图标自定义

`icon` 属性指定图标名（`oas-icon` 体系），`icon="none"` 隐藏图标；`slot="icon"` 富内容优先。

<DemoBlock title="icon 自定义与隐藏">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-notice-bar icon="star">icon=&quot;star&quot;：指定任意图标名。</oas-notice-bar>
    <oas-notice-bar icon="none">icon=&quot;none&quot;：不显示图标。</oas-notice-bar>
    <oas-notice-bar><oas-tag slot="icon" size="small">置顶</oas-tag>slot=&quot;icon&quot;：富内容覆盖图标（此例用标签充当图标位）。</oas-notice-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 setter（property 赋值/方法调用必须晚于自定义元素定义）
  Promise.all([customElements.whenDefined('oas-notice-bar'), customElements.whenDefined('oas-button')]).then(() => {
    // 可关闭 demo：oas-close → 显示反馈 + 启用恢复按钮；恢复 = 设 open 属性
    const closeDemo = document.getElementById('nb-close-demo')
    const restoreBtn = document.getElementById('nb-close-restore')
    const closeOut = document.getElementById('nb-close-output')
    closeDemo?.addEventListener('oas-close', () => {
      if (closeOut) closeOut.textContent = 'oas-close 已派发，通告已隐藏'
      // oas-button 的 disabled 只走 attribute 通道（无同名 property），须用 attribute API
      restoreBtn?.removeAttribute('disabled')
    })
    restoreBtn?.addEventListener('click', () => {
      closeDemo?.setAttribute('open', '')
      if (closeOut) closeOut.textContent = ''
      restoreBtn?.setAttribute('disabled', '')
    })
    // action 按钮 demo：oas-action-click → 反馈文本更新
    const actionDemo = document.getElementById('nb-action-demo')
    const actionOut = document.getElementById('nb-action-output')
    actionDemo?.addEventListener('oas-action-click', () => {
      if (actionOut) actionOut.textContent = 'oas-action-click 已派发（按钮形态）'
    })
  })
})
</script>

## API

### oas-notice-bar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `action-text` | action 操作文字；缺省不渲染 action 区 | — | — |
| `closable` | 是否显示关闭按钮；点击派发 oas-close 并自隐藏（设 open 恢复） | `boolean` | — |
| `href` | action 链接地址：在场时 action 渲染为 `<a>`（原生导航），缺省渲染为 `<button>`（派发 oas-action-click）；运行时增删切换形态 | — | — |
| `icon` | 图标名（oas-icon 体系）；缺省按 type 自动匹配，icon="none" 不显示，非法名回落 type 默认；slot="icon" 富内容优先 | — | — |
| `interval` | items 轮播间隔（毫秒，默认 4000）；非法/非正数回退默认 | — | — |
| `items` | 多条通告 JSON 字符串数组：纵向轮播（淡入淡出）；非法 JSON/空数组回退默认插槽；items 优先于插槽；prefers-reduced-motion 下不自动轮播 | — | — |
| `open` | 恢复开关：关闭后设置即恢复显示（组件关闭时自移除本属性，在场 = 强制可见） | `boolean` | — |
| `scrollable` | 单条内容超长时横向无缝滚动（内嵌走马灯引擎）；仅插槽单条模式生效（items 优先） | `boolean` | — |
| `type` | 通告类型：info（默认，主色系）/ success / warning / error；底色与图标色走语义 token，暗色自动适配；非法值回落 info | `string` | `info` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-action-click` | action 为按钮形态（无 href）点击时派发 |
| `oas-close` | 点击关闭按钮后派发，随后组件自隐藏（淡出退场）；宿主设 open 可恢复 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 单条通告内容（items 缺省时显示；scrollable 时物化为滚动内容） |
| `icon` | 图标插槽，覆盖默认/type 图标 |

#### Parts

| Part | 说明 |
| --- | --- |
| `bar` | 通告条容器 |
| `icon` | 图标区 |
| `content` | 内容区（插槽投影 / 轮播 / 走马灯的公共容器） |
| `carousel` | items 纵向轮播区 |
| `marquee` | 内嵌走马灯（scrollable 模式） |
| `action` | 右侧操作区（a / button 形态共用） |
| `close` | 关闭按钮 |
