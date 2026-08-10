# ScrollArea

A container that wraps content and takes over the scrollbar appearance: a thin custom scrollbar that thickens on hover; with `auto-hide` it is only shown while scrolling or hovering, and scroll events are throttled.

## Basic usage

`height` fixes the viewport height and content that overflows scrolls vertically; the scrollbar renders as a thin bar that thickens on hover.

<DemoBlock title="Fixed-height scrolling">
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

## Width and horizontal scrolling

`width` fixes the viewport width; wide content produces a horizontal scrollbar.

<DemoBlock title="Horizontal scrolling">
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

With `auto-hide` the scrollbar is hidden normally and only appears while scrolling or hovering the viewport, then fades out automatically after stopping.

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

## Scroll event

Scroll events are throttled with rAF and fire `oas-scroll`; `detail` carries `{ scrollTop, scrollLeft }`.

<DemoBlock title="oas-scroll event">
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

| Property    | Description                                            | Type      | Default |
| ----------- | ------------------------------------------------------ | --------- | ------- |
| `height`    | Viewport height (px); when unset, grows with the content | `number`  | —       |
| `width`     | Viewport width (px); when unset, fills the host width   | `number`  | —       |
| `auto-hide` | The scrollbar is shown only while scrolling/hovering, then auto-hides after a timeout | `boolean` | `false` |

| Event        | Description                                                       |
| ------------ | ----------------------------------------------------------------- |
| `oas-scroll` | Scroll event (rAF-throttled), `detail: { scrollTop, scrollLeft }` |

Parts: `::part(viewport)` is the scrolling viewport, `::part(track-v)` / `::part(track-h)` are the scroll tracks, `::part(thumb-v)` / `::part(thumb-h)` are the scroll thumbs. The viewport is focusable (`tabindex="0"`) and scrolls with arrow keys.
