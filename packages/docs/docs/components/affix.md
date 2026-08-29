# Affix 固钉

将内容吸附在视口顶部或底部，页面滚动到指定偏移后自动固定，常用于固定表格操作栏、工具栏等。

## 基础用法

<DemoBlock title="基础用法">
  <oas-affix offset="16">
    <oas-button type="primary">滚动页面时固定到顶部</oas-button>
  </oas-affix>
</DemoBlock>

向下滚动当前页面，观察按钮在接近视口顶部时被固定（`position: fixed`）。

## 自定义偏移

<DemoBlock title="自定义偏移">
  <oas-affix offset="80">
    <oas-button>固定于距视口顶部 80px</oas-button>
  </oas-affix>
</DemoBlock>

## 组合内容

<DemoBlock title="组合内容">
  <oas-affix offset="16">
    <oas-space>
      <oas-tag type="primary">筛选条件</oas-tag>
      <oas-button size="small">重置</oas-button>
      <oas-button size="small" type="primary">查询</oas-button>
    </oas-space>
  </oas-affix>
</DemoBlock>

## 底部吸附

`position="bottom"` 将吸附方向改为底部：元素底缘进入距视口底部 `offset` 距离内时固定于底部。

<DemoBlock title="底部吸附">
  <oas-affix position="bottom" offset="16">
    <oas-button type="primary">滚动页面时固定到底部</oas-button>
  </oas-affix>
</DemoBlock>

向下滚动当前页面，观察按钮在接近视口底部时被固定（`position: fixed; bottom: 16px`）。

## 指定滚动容器

`target` 指定滚动容器（CSS 选择器，默认 window）：容器内滚动时吸附判定相对容器可视区；选择器无匹配时 console 告警并回落 window 滚动。固定定位仍相对视口。

<DemoBlock title="指定滚动容器">
  <div id="affix-sc" style="height: 220px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4); background: var(--oas-color-bg-hover)">
    <oas-affix target="#affix-sc" offset="16">
      <oas-button>随容器滚动吸附</oas-button>
    </oas-affix>
    <p style="margin-top: 520px; color: var(--oas-color-text-secondary)">这是局部滚动容器：向下滚动，按钮吸附到容器可视区顶部（`fixed` 定位相对视口）。容器底部——滚动回来试试。</p>
  </div>
</DemoBlock>

## 吸附状态事件

吸附状态真实翻转时派发 `oas-change`（`detail: { fixed, top }`）——`fixed` 是否吸附；`top` 为吸附参考位置（top 吸附 = `offset`；bottom 吸附 = 元素当前 `top`）。

<DemoBlock title="吸附状态事件">
  <oas-affix id="affix-event" offset="16">
    <oas-button>滚动页面观察状态</oas-button>
  </oas-affix>
  <p id="affix-event-out" style="color: var(--oas-color-text-secondary)">尚未吸附</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.getElementById('affix-event')?.addEventListener('oas-change', (e) => {
    const out = document.getElementById('affix-event-out')
    if (!out) return
    const { fixed, top } = e.detail
    out.textContent = fixed ? `已吸附（top: ${top}px）` : `未吸附（top: ${top}px）`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `offset` | 吸附触发距离（px） | `string` | `0` |
| `position` | 吸附方向：top（默认，顶缘触达吸附）/ bottom（底缘触达吸附）；非法值回落 top | `AffixPosition` | `top` |
| `target` | 滚动容器选择器（CSS 选择器）；选择器无匹配时告警并回落 window 滚动 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 吸附状态翻转时派发，detail { fixed, top }：fixed 是否吸附；top 为吸附参考位置（top 吸附 = offset，bottom 吸附 = 元素当前 rect.top） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

监听 `window`（或 `target` 容器）滚动，元素滚出吸附区后固定，内容通过默认插槽传入。
