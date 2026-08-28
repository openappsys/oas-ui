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

## 编程滚动

组件实例暴露 `scrollTo(options)` / `scrollToTop()` / `scrollToBottom()` / `scrollIntoView(selectorOrEl)` 方法（委托视口原生滚动，`behavior` 默认平滑），宿主可按需程序化滚动。

<DemoBlock title="编程滚动方法">
  <div style="width: 320px">
    <oas-scroll-area id="sa-prog" height="180">
      <div style="padding: var(--oas-space-2)">
        <p style="margin: var(--oas-space-2) 0">第 1 行：编程滚动示例（下方按钮调用实例方法）</p>
        <p style="margin: var(--oas-space-2) 0">第 2 行：scrollTo 支持 { top, left, behavior }</p>
        <p style="margin: var(--oas-space-2) 0">第 3 行：scrollToTop / scrollToBottom 一键到位</p>
        <p style="margin: var(--oas-space-2) 0">第 4 行：scrollIntoView 定位容器内元素</p>
        <p style="margin: var(--oas-space-2) 0; padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)" id="sa-prog-target">目标行：被 scrollIntoView 定位到这里</p>
        <p style="margin: var(--oas-space-2) 0">第 6 行：平滑滚动由浏览器接管</p>
        <p style="margin: var(--oas-space-2) 0">第 7 行：适合「返回顶部」「加载更多定位」</p>
        <p style="margin: var(--oas-space-2) 0">第 8 行：继续滚到底部看看</p>
        <p style="margin: var(--oas-space-2) 0">第 9 行：更多内容撑开高度</p>
        <p style="margin: var(--oas-space-2) 0">第 10 行：最后一行</p>
      </div>
    </oas-scroll-area>
    <oas-space style="margin-top: var(--oas-space-2)">
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollToBottom()">滚到底部</oas-button>
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollToTop()">回顶部</oas-button>
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollTo({ top: 120 })">滚到 120px</oas-button>
      <oas-button size="small" onclick="window.saProg && window.saProg.scrollIntoView('#sa-prog-target')">定位目标行</oas-button>
    </oas-space>
  </div>
</DemoBlock>

## 滚动边缘阴影

`scroll-shadow` 开启滚动边缘阴影（CSS-only，与 modal 同款实现）：滚动到边缘时对应方向的阴影渐隐，中部时上下边缘都有阴影提示。

<DemoBlock title="scroll-shadow">
  <oas-scroll-area scroll-shadow height="180" style="width: 320px">
    <div style="padding: var(--oas-space-2)">
      <p style="margin: var(--oas-space-2) 0">第 1 行：scroll-shadow 显示滚动边缘阴影</p>
      <p style="margin: var(--oas-space-2) 0">第 2 行：顶部时上方阴影渐隐</p>
      <p style="margin: var(--oas-space-2) 0">第 3 行：滚到中部时上下边缘都有阴影</p>
      <p style="margin: var(--oas-space-2) 0">第 4 行：提示这个方向还有内容</p>
      <p style="margin: var(--oas-space-2) 0">第 5 行：滚到底部时下方阴影渐隐</p>
      <p style="margin: var(--oas-space-2) 0">第 6 行：适合长列表、聊天记录、新闻详情</p>
      <p style="margin: var(--oas-space-2) 0">第 7 行：纯 CSS 实现，零 JS 开销</p>
      <p style="margin: var(--oas-space-2) 0">第 8 行：继续滚动观察阴影变化</p>
    </div>
  </oas-scroll-area>
</DemoBlock>

## 贴底（stick-to-bottom）

`stick-to-bottom` 时新内容追加后若用户本就停靠在底部（距底 ≤8px）自动滚到底；用户上翻阅读历史时追加不打断。适合聊天、日志等追加场景。

<DemoBlock title="stick-to-bottom">
  <div style="width: 320px">
    <oas-scroll-area id="sa-stick" stick-to-bottom height="200" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
      <div id="sa-chat" style="padding: var(--oas-space-2); display: flex; flex-direction: column; gap: var(--oas-space-2)">
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">消息 1：欢迎使用 stick-to-bottom</div>
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">消息 2：停靠在底部时追加会自动滚到底</div>
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">消息 3：向上翻看历史时追加不打断</div>
        <div style="padding: var(--oas-space-2); background: var(--oas-color-bg-hover); border-radius: var(--oas-radius-sm)">消息 4：先试试滚到底部再点追加</div>
      </div>
    </oas-scroll-area>
    <oas-button size="small" style="margin-top: var(--oas-space-2)" onclick="window.saAppend && window.saAppend()">追加一条消息</oas-button>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      点「追加一条消息」查看自动贴底；先向上翻到中间再追加，观察不会被拉回底部。
    </p>
  </div>
</DemoBlock>

## 到底事件（oas-end-reached）

`oas-end-reached` 在滚动到达容器底部（横向为右边缘）时派发，`detail: { direction: 'bottom' | 'right' }`。`end-distance` 设置距边缘多少 px 内触发（默认 0）。离开边缘后再回到边缘才会再次触发，典型用于无限滚动加载。

<DemoBlock title="end-reached 到底事件">
  <div style="width: 320px">
    <oas-scroll-area id="sa-end" end-distance="10" height="160">
      <div id="sa-end-list" style="padding: var(--oas-space-2)">
        <p style="margin: var(--oas-space-2) 0">初始项 1：滚到底部触发 oas-end-reached</p>
        <p style="margin: var(--oas-space-2) 0">初始项 2：end-distance=10 提前触发</p>
        <p style="margin: var(--oas-space-2) 0">初始项 3：触发后自动追加新内容</p>
        <p style="margin: var(--oas-space-2) 0">初始项 4：离开底部后回底再次触发</p>
        <p style="margin: var(--oas-space-2) 0">初始项 5：典型无限滚动加载场景</p>
      </div>
    </oas-scroll-area>
    <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      触发次数：<span id="sa-end-count">0</span>
    </p>
  </div>
</DemoBlock>

## RTL

宿主设置 `dir="rtl"` 时，横向滚动条位置与滚轮转译按 RTL 语义工作：Chromium/Firefox 下横向 `scrollLeft` 为负值区间 `[-max, 0]`，纵向滚轮转译为横向滚动时方向与 LTR 相反，thumb 位置按绝对值换算。

<DemoBlock title="RTL 横向滚动">
  <oas-scroll-area dir="rtl" height="120" style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-3); padding: var(--oas-space-2); width: max-content">
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 1（右起）</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 2</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 3</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 4</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 5</div>
      <div style="flex-shrink: 0; width: 200px; height: 80px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; color: var(--oas-color-text-secondary)">卡片 6（左端）</div>
    </div>
  </oas-scroll-area>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
    `dir="rtl"` 下内容右对齐起始；滚轮/触控板滚动方向与 LTR 相反。注：横向滚动条实际渲染位置遵循浏览器原生 RTL 行为。
  </p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('sa-event')
  const out = document.getElementById('sa-scrolltop')
  el?.addEventListener('oas-scroll', (e) => {
    out.textContent = String(e.detail.scrollTop)
  })

  // 编程滚动 demo
  window.saProg = document.getElementById('sa-prog')

  // 贴底 demo
  window.saAppend = () => {
    const chat = document.getElementById('sa-chat')
    if (!chat) return
    const now = new Date().toLocaleTimeString()
    const msg = document.createElement('div')
    msg.style.padding = 'var(--oas-space-2)'
    msg.style.background = 'var(--oas-color-bg-hover)'
    msg.style.borderRadius = 'var(--oas-radius-sm)'
    msg.textContent = `消息 ${chat.children.length + 1}：${now} 追加的内容`
    chat.appendChild(msg)
  }

  // end-reached demo：到底追加 + 计数
  const endArea = document.getElementById('sa-end')
  const list = document.getElementById('sa-end-list')
  const count = document.getElementById('sa-end-count')
  let triggered = 0
  endArea?.addEventListener('oas-end-reached', (e) => {
    if (e.detail.direction !== 'bottom') return
    triggered += 1
    count.textContent = String(triggered)
    const p = document.createElement('p')
    p.style.margin = 'var(--oas-space-2) 0'
    p.textContent = `追加项 ${list.children.length + 1}：第 ${triggered} 次触底加载`
    list.appendChild(p)
  })
})
</script>

## API

### 方法

| 方法 | 说明 |
| --- | --- |
| `scrollTo(options)` / `scrollTo(x, y)` | 滚动到指定位置，`options: { top?, left?, behavior?: 'auto' \| 'smooth' }`（委托视口） |
| `scrollToTop(options?)` / `scrollToBottom(options?)` | 滚到顶/底，`options: { behavior? }` 默认平滑 |
| `scrollIntoView(selectorOrEl, options?)` | 容器内元素滚进视口，`options` 的 `block` / `inline` 透传 |

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-hide` | 滚动条仅在滚动/悬停时显示，超时自动隐藏 | `boolean` | — |
| `end-distance` | `oas-end-reached` 触发距离（px，默认 `0`）：距底/右边缘 N px 内即算到底 | `string` | `0` |
| `height` | 视口高度（px），不设置时随内容自然撑开 | — | — |
| `scroll-shadow` | 滚动边缘阴影（CSS-only）：滚动到边缘时阴影渐隐提示还有内容 | — | — |
| `stick-to-bottom` | 贴底：新内容追加时若当前停靠在底部（距底 ≤8px）自动滚到底，上翻阅读时不打断 | `boolean` | — |
| `width` | 视口宽度（px），不设置时铺满宿主宽度 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-end-reached` | 滚动到达容器底部（横向到达右边缘）时派发，`detail: { direction: 'bottom' \| 'right' }`；离开边缘后再回到边缘才可再次触发 |
| `oas-scroll` | 滚动事件（rAF 节流），`detail: { scrollTop, scrollLeft }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

部件：`::part(viewport)` 滚动视口、`::part(track-v)` / `::part(track-h)` 滚动轨道、`::part(thumb-v)` / `::part(thumb-h)` 滚动块。视口可聚焦（`tabindex="0"`），方向键滚动。
