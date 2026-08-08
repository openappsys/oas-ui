# Anchor 锚点

滚动监听当前章节并自动高亮，点击锚点平滑滚动定位。

## 基础用法

<DemoBlock title="滚动监听">
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

## 高亮判定偏移

<DemoBlock title="高亮判定偏移（offset）">
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

## 点击事件

<DemoBlock title="点击事件">
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

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.anchorLog = (e) => {
    const tag = document.getElementById('anchor-result')
    if (tag) tag.textContent = `已定位：${e.detail.href}`
  }
})
</script>

## API

| 属性     | 说明               | 类型                | 默认值 |
| -------- | ------------------ | ------------------- | ------ |
| `items`  | 锚点项 JSON        | `[{ href, title }]` | `[]`   |
| `active` | 当前高亮 href      | `string`            | —      |
| `offset` | 高亮判定偏移（px） | `number`            | `0`    |

| 事件         | 说明                         |
| ------------ | ---------------------------- |
| `oas-change` | 点击锚点，`detail: { href }` |

基于 `IntersectionObserver` 的 scroll spy；点击平滑滚动定位；`nav` + `aria-label="锚点导航"`，当前项 `aria-current="true"`。
