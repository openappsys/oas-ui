# MessageScroller 会话滚动容器

会话滚动容器：一套「滚动意图模型」——读者在底部时跟随新内容（AI 式）、IM 式始终钉底可切、跳到底按钮、上翻加载历史不跳动。组件不拥有消息（只提供滚动行为），宿主接任意后端。

> **本批（A）范围**：钉底/跳底/near-bottom 检测/prepend 保位基础。轮次锚定（`last-anchor` 打开位置）、可见性追踪、首屏防跳随 B 批提供，见文末边界说明。

## 基础用法

<DemoBlock title="会话流（default-position=end 默认打开在底部）">
  <oas-message-scroller id="msc-basic" label="客服会话" style="height: 300px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
    <oas-marker variant="separator">今天 10:00</oas-marker>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">客</oas-avatar>
      <span slot="header">客服小 O · 10:01</span>
      <oas-bubble>您好，请问有什么可以帮您？</oas-bubble>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">我</oas-avatar>
      <span slot="header">我 · 10:02</span>
      <oas-bubble variant="secondary">想了解一下会话滚动容器的用法。</oas-bubble>
    </oas-message-row>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">客</oas-avatar>
      <span slot="header">客服小 O · 10:03</span>
      <oas-bubble>往上翻可以看到更多历史消息；新消息到来时如果您在底部就会自动跟随。</oas-bubble>
    </oas-message-row>
    <oas-marker>系统消息：会话已加密</oas-marker>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">客</oas-avatar>
      <span slot="header">客服小 O · 10:05</span>
      <oas-bubble>还有别的问题吗？</oas-bubble>
    </oas-message-row>
  </oas-message-scroller>
</DemoBlock>

默认 `default-position="end"`：打开即定位到底部。viewport 为 `role="region"` + 可读名称（缺省走 locale「消息列表」，可用 `label` 属性覆盖）+ `tabindex="0"`（Tab 聚焦后方向键滚动）；内容容器 `role="log"` + `aria-relevant="additions"`（屏幕阅读器只播报新增行）。

## AI 式底部跟随（auto-scroll）

<DemoBlock title="auto-scroll：读者在底部才跟随流式输出">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-ai" auto-scroll edge-threshold="24" style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
      <oas-message-row>
        <oas-bubble id="msc-ai-bubble">帮我写一首关于秋天的短诗。</oas-bubble>
      </oas-message-row>
    </oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2)">
      <oas-button id="msc-ai-send" size="small" type="primary">开始流式回答</oas-button>
      <span id="msc-ai-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">先往上翻离底部，再点按钮——阅读不被打断；回到底部后才跟随。</span>
    </div>
  </div>
</DemoBlock>

`auto-scroll` 是 AI 助手的默认安全模式：**仅当读者在底部**（near-bottom ≤ `edge-threshold`，默认 8px）时跟随流式增长；上翻阅读历史时不抢位置——「绝不逆着读者意图移动」。内容高度变化由 slotchange + ResizeObserver 双通道感知（纯文本增长无 slotchange 信号时仍能跟随）。

## IM 式始终钉底（pin-to-bottom）

<DemoBlock title="pin-to-bottom：无论在哪都拉回底部">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-im" pin-to-bottom style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
      <oas-message-row><oas-bubble>IM 群聊场景：新消息必达。</oas-bubble></oas-message-row>
    </oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="msc-im-send" size="small" type="primary">来一条新消息</oas-button>
      <span id="msc-im-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">往上翻再点按钮——也会被拉回底部（典型客服/IM 持续接收）。</span>
    </div>
  </div>
</DemoBlock>

`pin-to-bottom` 在场即 IM 模式：新内容总是滚到底，读者上翻也会被拉回。两种模式互斥时 `pin-to-bottom` 优先。

## 跳底按钮与状态事件

<DemoBlock title="跳底按钮 + oas-scroll-state 反馈">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-jump" style="height: 200px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box">
      <div style="display: flex; flex-direction: column; gap: var(--oas-space-3)">
        <p style="margin: 0">占位内容 1——滚动容器内容超过视口高度时，离开底部会出现右下角跳底按钮。</p>
        <p style="margin: 0">占位内容 2</p>
        <p style="margin: 0">占位内容 3</p>
        <p style="margin: 0">占位内容 4</p>
        <p style="margin: 0">占位内容 5</p>
        <p style="margin: 0">占位内容 6（最底部）</p>
      </div>
    </oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-3); align-items: center; flex-wrap: wrap">
      <oas-button id="msc-jump-top" size="small">scrollToStart()</oas-button>
      <oas-button id="msc-jump-bottom" size="small">scrollToEnd()</oas-button>
      <span id="msc-jump-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">滚动后这里显示 oas-scroll-state 状态。</span>
    </div>
  </div>
</DemoBlock>

离开底部且可向下滚时显示内置跳底按钮（`part="button"`，可读名称走 locale；也可 `slot="button"` 自定义）；点击滚到底并消失。滚动位置跨过判定线时派发 `oas-scroll-state`（detail `{ atBottom, atTop, canScrollStart, canScrollEnd }`），并反射 `data-scrollable="start end"`（供边缘渐隐等 CSS 判定）。`scrollToEnd()/scrollToStart()` 方法可编程定位（`behavior` 可传 `'smooth'`）。

## 上翻加载历史（prepend 保位基础）

<DemoBlock title="滚到顶加载更早消息，阅读位置不跳">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-history" default-position="start" preserve-scroll-on-prepend style="height: 200px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <span id="msc-history-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">滚到顶部触发加载更早 5 条——画面停留位置不变（顶部插入补偿 scrollTop）。</span>
  </div>
</DemoBlock>

顶部插入历史消息（首节点变化）时，`preserve-scroll-on-prepend`（**缺省开启**，显式 `="false"` 关闭）按前后 scrollHeight 差补偿 scrollTop，阅读位置不跳。前置插入保位的精确锚定（stable `message-id` 逐行对齐）随 B 批提供——宿主应尽量给消息行稳定 id。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await import('@oas-ui/ui')
  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  // AI 式：流式追加回答（离底时不跟随是组件裁决，无需宿主判断）
  const ai = document.querySelector('#msc-ai')
  const aiBubble = document.querySelector('#msc-ai-bubble')
  const aiHint = document.querySelector('#msc-ai-hint')
  document.querySelector('#msc-ai-send')?.addEventListener('click', async () => {
    ai?.scrollToEnd()
    const text = '好的：秋风起，落叶黄，一杯热茶读时光；雁南飞，夜微凉，灯下纸短情意长。'
    aiBubble.textContent = ''
    for (let i = 0; i < text.length; i++) {
      aiBubble.textContent += text[i]
      await delay(28)
    }
    aiHint.textContent = '回答完毕——过程中在底部才跟随，上翻阅读不被打断。'
  })

  // IM 式：新消息必达
  document.querySelector('#msc-im-send')?.addEventListener('click', () => {
    const row = document.createElement('oas-message-row')
    row.setAttribute('align', 'end')
    const bubble = document.createElement('oas-bubble')
    bubble.setAttribute('variant', 'secondary')
    bubble.textContent = '新消息 ' + new Date().toLocaleTimeString()
    row.appendChild(bubble)
    document.querySelector('#msc-im')?.appendChild(row)
  })

  // 跳底按钮 / 方法 / 状态事件
  const out = document.querySelector('#msc-jump-out')
  const jump = document.querySelector('#msc-jump')
  jump?.addEventListener('oas-scroll-state', (e) => {
    const d = e.detail
    out.textContent = `atBottom=${d.atBottom} atTop=${d.atTop}`
  })
  document.querySelector('#msc-jump-top')?.addEventListener('click', () => {
    jump?.scrollToStart()
  })
  document.querySelector('#msc-jump-bottom')?.addEventListener('click', () => {
    jump?.scrollToEnd()
  })

  // 加载历史 demo：初始 8 条，滚到顶插 5 条（行直放默认插槽——顶部插入改变 slot 首节点，保位补偿生效）
  const scroller = document.querySelector('#msc-history')
  let seq = 8
  // from→to 升序；prepend 时先锚定旧的 firstChild，逐条插到锚前（保持 9,10,… 升序）
  const addRows = (from, to, prepend = false) => {
    const anchor = prepend ? (scroller?.firstChild ?? null) : null
    for (let i = from; i <= to; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `历史消息 #${i}`
      row.appendChild(bubble)
      if (!scroller) return
      if (prepend) scroller.insertBefore(row, anchor)
      else scroller.appendChild(row)
    }
  }
  addRows(1, 8)
  let loading = false
  // 原生 scroll 事件不冒泡、不 composed：必须挂到 shadow 内的 .viewport（挂宿主收不到）
  const bindHistoryLoader = () => {
    const vp = scroller?.shadowRoot?.querySelector('.viewport')
    if (!vp) {
      requestAnimationFrame(bindHistoryLoader)
      return
    }
    vp.addEventListener('scroll', () => {
      if (vp.scrollTop > 4 || loading) return
      loading = true
      window.setTimeout(() => {
        addRows(seq + 1, seq + 5, true)
        seq += 5
        loading = false
      }, 300)
    })
  }
  bindHistoryLoader()
})
</script>

## 边界与 B 批预告

- **轮次锚定 / `last-anchor` 打开位置 / 首屏防跳（`data-pending-scroll`）/ 可见性追踪**：随 B 批提供；本批 `default-position` 仅 `start`/`end`。
- **虚拟化与渲染降耗**：离屏行跳过渲染（`content-visibility` 等）随 B 批虚拟化一起提供（slotted 元素上单独启用会卡占位高度不展开，实测撤回）；数千轮长会话接虚拟列表由宿主组合。
- **空态**：无消息时容器照常渲染（空 log），宿主放空态插槽内容即可。
- **prepend 保位的已知边界**：补偿只在顶部插入（slotchange）时按高度差结算一次；历史消息里的异步资源（图片等）在其后加载撑高上方内容时，本批不追踪（阅读位置会被顶走）——精确锚定（stable `message-id` 逐行对齐）随 B 批提供，异步资源多的会话建议先给图片占位尺寸。
- `label` 覆盖 viewport 可读名称后被组件吸收移除（原生全局属性吸收惯例）。

## API

### oas-message-scroller

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-scroll` | AI 式底部跟随（布尔在场，默认关）：仅当读者在底部（near-bottom ≤ edge-threshold）时跟随流式增长，上翻阅读不打扰 | `boolean` | — |
| `default-position` | 打开位置：start（顶部）/ end（底部，默认；非法值回退 end）；last-anchor 随 B 批锚定提供 | — | — |
| `edge-threshold` | 底部判定阈值 px（默认 8）——距底 ≤ 阈值即视为在底部（near-bottom 检测） | — | — |
| `label` | viewport 可读名称覆盖（缺省走 locale「消息列表」；读入渲染后从宿主移除——原生全局属性吸收惯例） | — | — |
| `pin-to-bottom` | IM 式始终钉底（布尔在场）：新内容总是滚到底、读者上翻也拉回；与 auto-scroll 同时在场时优先 | `boolean` | — |
| `preserve-scroll-on-prepend` | 顶部插入历史时补偿 scrollTop 保持阅读位置（缺省开启；显式 ="false" 关闭） | — | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-scroll-state` | 滚动位置跨过判定线时派发，detail { atBottom, atTop, canScrollStart, canScrollEnd }；首帧（初始定位后）广播一次初始态——宿主监听晚于 upgrade 也能收到 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 消息行列表（oas-message-row / oas-marker 等） |
| `button` | 自定义跳底按钮内容（替换内置箭头图形；显隐与点击仍由组件裁决——缺省为内置按钮 part=button） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-message-gap` | `var(--oas-space-4)` |

#### 方法

| 方法 | 说明 |
| --- | --- |
| `scrollToEnd(opts?)` | 滚到底部；`opts.behavior` 可传 `'smooth'`（缺省瞬时） |
| `scrollToStart(opts?)` | 滚到顶部（参数同上） |

状态反射：`data-scrollable`（`"start"` / `"end"` / `"start end"` 空格分隔，无可滚为空）。ARIA：viewport `role="region"` + 可读名称 + `tabindex="0"`；内容容器 `role="log"` + `aria-relevant="additions"`。CSS 变量：`--oas-message-gap`（行间距，默认 `var(--oas-space-4)`）。部件：`::part(scroller)` / `::part(viewport)` / `::part(content)` / `::part(button)`。
