# Anchor

Tracks the current section on scroll and highlights it automatically; clicking an anchor smooth-scrolls to the target.

## Basic usage

<DemoBlock title="Scroll spy">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" items='[{"href":"#anchor-sec-1","title":"第一章"},{"href":"#anchor-sec-2","title":"第二章"},{"href":"#anchor-sec-3","title":"第三章"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">第一节内容：用于演示滚动监听与高亮跟随。</p>
      <h4 id="anchor-sec-2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">滚动到该区域时，左侧锚点自动高亮。</p>
      <h4 id="anchor-sec-3">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击锚点可平滑滚动定位到对应章节。</p>
    </div>
  </div>
</DemoBlock>

## Highlight offset

<DemoBlock title="Highlight offset (offset)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" offset="80" items='[{"href":"#anchor-sec-4","title":"第一章"},{"href":"#anchor-sec-5","title":"第二章"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-4" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">offset 控制顶部高亮判定区的偏移量。</p>
      <h4 id="anchor-sec-5">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">滚动观察高亮切换点与默认值的差异。</p>
    </div>
  </div>
</DemoBlock>

## Click event

<DemoBlock title="Click event">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" onoas-change="anchorLog(event)" items='[{"href":"#anchor-sec-6","title":"第一章"},{"href":"#anchor-sec-7","title":"第二章"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-6" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击左侧锚点，查看事件输出。</p>
      <h4 id="anchor-sec-7">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">事件 detail 携带目标 href。</p>
    </div>
  </div>
  <oas-tag id="anchor-result" type="info">尚未点击</oas-tag>
</DemoBlock>

## Controlled highlight

`active` is a controlled attribute: an external set/remove of `active` directly controls the currently highlighted item (the scroll spy still takes over as you scroll).

<DemoBlock title="Controlled active">
  <oas-space>
    <oas-button onclick="anchorSetActive('#anchor-sec-c1')">高亮第一章</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c2')">高亮第二章</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c3')">高亮第三章</oas-button>
    <oas-button onclick="document.getElementById('anchor-ctrl').removeAttribute('active')">清除高亮</oas-button>
  </oas-space>
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch; margin-top: 8px">
    <oas-anchor id="anchor-ctrl" style="width: 128px; flex-shrink: 0" items='[{"href":"#anchor-sec-c1","title":"第一章"},{"href":"#anchor-sec-c2","title":"第二章"},{"href":"#anchor-sec-c3","title":"第三章"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-c1" style="margin-top: 0">第一章</h4>
      <p style="color: var(--oas-color-text-secondary)">点击左侧按钮设置 <code>active</code>，锚点立即高亮对应项。</p>
      <h4 id="anchor-sec-c2">第二章</h4>
      <p style="color: var(--oas-color-text-secondary)">滚动该容器时，scroll spy 会接管高亮。</p>
      <h4 id="anchor-sec-c3">第三章</h4>
      <p style="color: var(--oas-color-text-secondary)">「清除高亮」移除 <code>active</code>，恢复无高亮状态。</p>
    </div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.anchorLog = (e) => {
    const tag = document.getElementById('anchor-result')
    if (tag) tag.textContent = `已定位：${e.detail.href}`
  }
  window.anchorSetActive = (href) => document.getElementById('anchor-ctrl').setAttribute('active', href)
})
</script>

## API

| Property | Description               | Type                | Default |
| -------- | ------------------------- | ------------------- | ------- |
| `items`  | Anchor items JSON         | `[{ href, title }]` | `[]`    |
| `active` | Currently highlighted href| `string`            | —       |
| `offset` | Highlight offset in px    | `number`            | `0`     |

| Event        | Description                      |
| ------------ | -------------------------------- |
| `oas-change` | An anchor was clicked, `detail: { href }` |

Scroll spy based on `IntersectionObserver`; clicking smooth-scrolls to the target; `nav` + `aria-label="锚点导航"`, the current item has `aria-current="true"`.
