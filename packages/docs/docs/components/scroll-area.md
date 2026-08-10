# ScrollArea 滚动区域

包裹内容并接管滚动条外观的容器：细条自定义滚动条、hover 变粗，`auto-hide` 时仅在滚动/悬停时显示，滚动事件节流派发。

## 基础用法

`height` 固定视口高度，超出部分纵向滚动；滚动条细条展示，hover 变粗。

<DemoBlock title="定高滚动">
  <oas-scroll-area height="200" style="width: 320px">
    <div style="padding: var(--oas-space-2)">
      <p style="margin: var(--oas-space-2) 0">第 1 行内容：ScrollArea 支持自定义滚动条外观</p>
      <p style="margin: var(--oas-space-2) 0">第 2 行内容：细条 + hover 变粗</p>
      <p style="margin: var(--oas-space-2) 0">第 3 行内容：滚动事件节流派发 oas-scroll</p>
      <p style="margin: var(--oas-space-2) 0">第 4 行内容：wheel 平滑滚动</p>
      <p style="margin: var(--oas-space-2) 0">第 5 行内容：支持 auto-hide 自动隐藏</p>
      <p style="margin: var(--oas-space-2) 0">第 6 行内容：横向内容同样接管滚动条</p>
      <p style="margin: var(--oas-space-2) 0">第 7 行内容：颜色走主题 token</p>
      <p style="margin: var(--oas-space-2) 0">第 8 行内容：适合列表、日志、长文案</p>
      <p style="margin: var(--oas-space-2) 0">第 9 行内容：内容不足时不显示滚动条</p>
      <p style="margin: var(--oas-space-2) 0">第 10 行内容：自定义内容插槽</p>
    </div>
  </oas-scroll-area>
</DemoBlock>

## 宽度与横向滚动

`width` 固定视口宽度，宽内容产生横向滚动条。

<DemoBlock title="横向滚动">
  <oas-scroll-area height="120" style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-3); padding: var(--oas-space-2); width: max-content">
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 1</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 2</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 3</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 4</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 5</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 6</div>
    </div>
  </oas-scroll-area>
</DemoBlock>

## auto-hide

`auto-hide` 时滚动条平时隐藏，滚动或悬停视口时显示，停止后自动淡出。

<DemoBlock title="auto-hide">
  <oas-scroll-area auto-hide height="160" style="width: 320px">
    <div style="padding: var(--oas-space-2)">
      <p style="margin: var(--oas-space-2) 0">滚动我看看滚动条：平时隐藏，滚动时出现</p>
      <p style="margin: var(--oas-space-2) 0">停下来等一秒，滚动条自动淡出</p>
      <p style="margin: var(--oas-space-2) 0">悬停在区域内也会临时显示</p>
      <p style="margin: var(--oas-space-2) 0">适合不希望滚动条干扰阅读的界面</p>
      <p style="margin: var(--oas-space-2) 0">移动端卡片列表场景推荐使用</p>
    </div>
  </oas-scroll-area>
</DemoBlock>

## 滚动事件

滚动事件按 rAF 节流派发 `oas-scroll`，`detail` 携带 `{ scrollTop, scrollLeft }`。

<DemoBlock title="oas-scroll 事件">
  <div style="width: 320px">
    <oas-scroll-area id="sa-event" height="160">
      <div style="padding: var(--oas-space-2)">
        <p style="margin: var(--oas-space-2) 0">第 1 行：滚动事件节流派发</p>
        <p style="margin: var(--oas-space-2) 0">第 2 行：detail 包含 scrollTop / scrollLeft</p>
        <p style="margin: var(--oas-space-2) 0">第 3 行：适合做滚动监听、懒加载</p>
        <p style="margin: var(--oas-space-2) 0">第 4 行：与虚拟列表滚动逻辑互补</p>
        <p style="margin: var(--oas-space-2) 0">第 5 行：滚动条位置同步更新</p>
        <p style="margin: var(--oas-space-2) 0">第 6 行：继续滚动查看输出</p>
        <p style="margin: var(--oas-space-2) 0">第 7 行：节流避免高频事件</p>
        <p style="margin: var(--oas-space-2) 0">第 8 行：最后一个示例</p>
      </div>
    </oas-scroll-area>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      scrollTop：<span id="sa-scrolltop">0</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('sa-event')
  const out = document.getElementById('sa-scrolltop')
  el?.addEventListener('oas-scroll', (e) => {
    out.textContent = String(e.detail.scrollTop)
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-hide` | 滚动条仅在滚动/悬停时显示，超时自动隐藏 | — | — |
| `height` | 视口高度（px），不设置时随内容自然撑开 | — | — |
| `width` | 视口宽度（px），不设置时铺满宿主宽度 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-scroll` | 滚动事件（rAF 节流），`detail: { scrollTop, scrollLeft }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

部件：`::part(viewport)` 滚动视口、`::part(track-v)` / `::part(track-h)` 滚动轨道、`::part(thumb-v)` / `::part(thumb-h)` 滚动块。视口可聚焦（`tabindex="0"`），方向键滚动。
