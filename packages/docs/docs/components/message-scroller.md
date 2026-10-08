# MessageScroller 会话滚动容器

会话滚动容器：一套「滚动意图模型」——读者在底部时跟随新内容（AI 式）、IM 式始终钉底可切、跳到底按钮、上翻加载历史不跳动（含异步资源保位）、轮次锚定（AI「回到最后提问」）、首屏防跳。组件不拥有消息（只提供滚动行为），宿主接任意后端。

> 批次说明：A 批交付钉底/跳底/near-bottom 检测/prepend 保位基础；B 批已并入——稳定锚点异步保位、同帧混合插入精确结算、首屏防跳（`data-pending-scroll`）、`last-anchor` 打开位置、轮次锚定（`turn-anchor`）。可见性追踪（视口内消息清单）判定为 v2 候选（牵出大纲/已读等独立语义），暂不提供。

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

## 首屏防跳（data-pending-scroll）

<DemoBlock title="end / last-anchor 打开前的未定位帧不闪现顶部">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <div id="msc-pending-host" style="width: 100%"></div>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="msc-pending-replay" size="small" type="primary">重演首屏挂载</oas-button>
      <span id="msc-pending-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击按钮动态挂载一个 scroller，观察防跳时序。</span>
    </div>
  </div>
</DemoBlock>

`default-position="end"`（及 `last-anchor`）需要真实定位：连接时组件即在宿主上反射 `data-pending-scroll`，此刻 viewport `visibility: hidden`（保留布局供定位测量）；首帧定位与属性移除在同一帧完成——读者看不到「闪现顶部再跳到底」的未定位帧。`default-position="start"` 天然定位（scrollTop=0 就是初始值），不设该反射。读者若在定位前已滚动（让位守卫生效），反射同样移除，viewport 不会被永久隐藏。

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

`pin-to-bottom` 在场即 IM 模式：新内容总是滚到底，读者上翻也会被拉回。裁决优先级：`pin-to-bottom` > `turn-anchor` > `auto-scroll`。

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

## 上翻加载历史（异步资源保位）

<DemoBlock title="滚到顶加载更早消息，阅读位置不跳">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-history" default-position="start" preserve-scroll-on-prepend style="height: 200px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <span id="msc-history-hint" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">滚到顶部触发加载更早 5 条——画面停留位置不变（顶部插入补偿 scrollTop）。</span>
  </div>
</DemoBlock>

<DemoBlock title="历史内图片延迟加载撑高，锚行位置不动">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-async" default-position="start" style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="msc-async-load" size="small" type="primary">在顶部插入一批历史（含延迟加载的图片）</oas-button>
      <span id="msc-async-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">插入后图片延迟撑高——锚行（首行）位置应保持不动。</span>
    </div>
  </div>
</DemoBlock>

顶部插入历史时，`preserve-scroll-on-prepend`（**缺省开启**，显式 `="false"` 关闭）按「插入前首节点的内容坐标位移」精确补偿 scrollTop——同一帧既 prepend 历史又 append 新消息时，只结算顶部插入量（底部追加不参与补偿，不会多补）。补偿后组件锁定**保位锚**（插入前首节点）：历史内的图片等异步资源随后加载撑高上方内容时（ResizeObserver 通道，无 slotchange 信号），按锚点视口位移持续补偿，阅读位置在资源加载完成前不跳。给消息行声明 stable `message-id` 时保位锚优先按 id 重查（宿主重建行后仍能找回）；无 id 用元素引用。

## 打开位置 last-anchor 与 scrollToMessage

<DemoBlock title="default-position=last-anchor：打开即回到最后提问位置">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-last-anchor" default-position="last-anchor" style="height: 220px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center; flex-wrap: wrap">
      <oas-button id="msc-la-first" size="small">scrollToMessage('m1')</oas-button>
      <span id="msc-la-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </div>
  </div>
</DemoBlock>

宿主在消息行上标 `anchor` 属性即轮次锚点（AI 场景通常标在用户提问行）；`default-position="last-anchor"` 打开时定位到**最后一个锚点**的顶部——长会话回到「最后提问位置」继续阅读，而不是落底或回顶；锚点靠底（下方内容不足一屏）时贴底显示（滚动上限 clamp，与「最后提问在屏幕底部」的产品直觉一致）。无锚点时回退 `end`。`scrollToMessage(id, opts?)` 按 `message-id` 精确滚到某条消息顶部（命中返回 `true`，未知 id 返回 `false` 且不滚动）。

## 轮次锚定（turn-anchor）

<DemoBlock title="turn-anchor：回答流入时提问钉在视口顶（prev-peek 露上一条语境）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-2)">
    <oas-message-scroller id="msc-turn" turn-anchor style="height: 240px; width: 100%; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-lg); padding: var(--oas-space-3); box-sizing: border-box"></oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center; flex-wrap: wrap">
      <oas-button id="msc-turn-anchor" size="small">跳到当前提问</oas-button>
      <oas-button id="msc-turn-stream" size="small" type="primary">流式追加一段回答</oas-button>
      <span id="msc-turn-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">锚行（提问）在视口顶约 64px 处——追加回答时位置不动。</span>
    </div>
  </div>
</DemoBlock>

`turn-anchor` 在场把「一次提问 + 回答」作为锚定单元：跟随态把最后 `anchor` 标记的轮次锚点钉在视口顶 `prev-peek` px 处（默认 64，露出上一条尾部作语境），回答在锚下方流入。位置即意图——锚点贴视口顶（或处于 peek 对齐窗口）= 锚顶跟随；读者在底部 = 贴底跟随（新轮次从底部流入视野）；两者皆离 = 读者接管，静止不拉回。跟随模式按当前位置一次性定型，贴底跟随中锚点穿越顶部窗口不会被误拉回顶部。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await import('@oas-ui/ui')
  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  // 首屏防跳：动态挂载复现「连接 → pending 反射 → 首帧定位后移除」时序
  const pendingHost = document.querySelector('#msc-pending-host')
  const pendingOut = document.querySelector('#msc-pending-out')
  document.querySelector('#msc-pending-replay')?.addEventListener('click', async () => {
    if (!pendingHost) return
    pendingHost.innerHTML = ''
    const el = document.createElement('oas-message-scroller')
    el.style.height = '160px'
    el.style.width = '100%'
    for (let i = 1; i <= 10; i++) {
      const p = document.createElement('p')
      p.textContent = '消息 ' + i
      el.appendChild(p)
    }
    pendingHost.appendChild(el)
    const duringConnect = el.hasAttribute('data-pending-scroll')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const vp = el.shadowRoot?.querySelector('.viewport')
    const atBottom = vp ? Math.abs(vp.scrollHeight - vp.clientHeight - vp.scrollTop) <= 8 : false
    if (pendingOut) {
      pendingOut.textContent = `连接时 data-pending-scroll 在场：${duringConnect}；首帧后已移除：${!el.hasAttribute('data-pending-scroll')}；定位已落底部：${atBottom}`
    }
  })
  // 初始自动演一遍，静态可见
  document.querySelector('#msc-pending-replay')?.click()

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

  // 异步保位 demo：初始若干行（锚行带 stable message-id），点按钮 prepend 历史块（含延迟撑高的占位图）
  const asyncEl = document.querySelector('#msc-async')
  const asyncOut = document.querySelector('#msc-async-out')
  const addAsyncRows = (from, to) => {
    if (!asyncEl) return
    for (let i = from; i <= to; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `消息 #${i}`
      row.appendChild(bubble)
      asyncEl.appendChild(row)
    }
  }
  addAsyncRows(101, 112)
  // 锚行 = 当前的第一行；stable id 演示
  asyncEl?.querySelector('oas-message-row')?.setAttribute('message-id', 'm-anchor')
  let asyncSeq = 100
  document.querySelector('#msc-async-load')?.addEventListener('click', async () => {
    if (!asyncEl || asyncEl.dataset.loading === '1') return
    asyncEl.dataset.loading = '1'
    const vp = asyncEl.shadowRoot?.querySelector('.viewport')
    const anchorRow = asyncEl.querySelector('[message-id="m-anchor"]')
    if (!vp || !anchorRow) return
    const before = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    // 顶部插入 3 条历史，其中一条内含「图片占位」（初始 36px，延迟撑到 200px 模拟异步加载撑高）
    const first = asyncEl.firstElementChild
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `更早的历史 #${asyncSeq--}`
      if (i === 1) {
        const img = document.createElement('div')
        img.className = 'fake-img'
        img.style.cssText = 'height: 36px; border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); transition: height .2s'
        bubble.appendChild(img)
      }
      row.appendChild(bubble)
      asyncEl.insertBefore(row, first)
    }
    await delay(150)
    const fake = asyncEl.querySelector('.fake-img')
    if (fake) fake.style.height = '200px'
    await delay(500)
    const after = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    const drift = Math.round(Math.abs(after - before))
    if (asyncOut) {
      asyncOut.textContent =
        drift <= 2
          ? `图片加载撑高后锚行位置漂移 ${drift}px——阅读位置稳定（保位锚生效）`
          : `锚行位置漂移 ${drift}px（异常，应 ≤2px）`
    }
    delete asyncEl.dataset.loading
  })

  // last-anchor demo：多轮对话，中间锚点行（提问）标 anchor；打开即定位在最后锚点顶部
  const la = document.querySelector('#msc-last-anchor')
  const laOut = document.querySelector('#msc-la-out')
  const laRound = (q, a, seq) => {
    const qRow = document.createElement('oas-message-row')
    qRow.setAttribute('align', 'end')
    qRow.setAttribute('anchor', '')
    qRow.setAttribute('message-id', seq === 1 ? 'm1' : 'q' + seq)
    const qBubble = document.createElement('oas-bubble')
    qBubble.setAttribute('variant', 'secondary')
    qBubble.textContent = q
    qRow.appendChild(qBubble)
    const aRow = document.createElement('oas-message-row')
    const aBubble = document.createElement('oas-bubble')
    aBubble.textContent = a
    aRow.appendChild(aBubble)
    la?.appendChild(qRow)
    la?.appendChild(aRow)
  }
  laRound('这个组件怎么保位？', '顶部插入历史时按插入前首节点的位移精确补偿。', 1)
  for (let i = 0; i < 6; i++) laRound('中间提问 ' + i, '中间回答 ' + i + '（填充内容，撑出滚动距离）。', 10 + i)
  laRound('最后一问：打开会话在哪里？', 'default-position="last-anchor" 时定位在最后提问行顶部。', 99)
  // 客户端异步填充场景：打开位（last-anchor）只在组件首帧内容已在时自动生效；
  // 填充后由宿主调 scrollToMessage 定位到最后锚点（AI 惯例：拉取历史后回到最后提问）
  const lastAnchorRow = la ? [...la.querySelectorAll('oas-message-row[anchor]')].at(-1) ?? null : null
  // 定位收敛：页面级样式/字体晚应用会让早期几何过期（行高事后变化），rAF+timeout 轮询重定位直至稳定
  let laTries = 0
  const laSettle = () => {
    const vp = la?.shadowRoot?.querySelector('.viewport')
    if (!vp || !lastAnchorRow || laTries++ > 12) return
    const offset = lastAnchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    if (Math.abs(offset) > 2) la?.scrollToMessage(lastAnchorRow.getAttribute('message-id') ?? '')
    requestAnimationFrame(() => window.setTimeout(laSettle, 120))
  }
  laSettle()
  document.querySelector('#msc-la-first')?.addEventListener('click', () => {
    const hit = la?.scrollToMessage('m1')
    if (laOut) laOut.textContent = `scrollToMessage('m1') → ${hit}（滚动到第一条消息顶部）`
  })
  // 打开位置验证输出（定位结算后）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const vp = la?.shadowRoot?.querySelector('.viewport')
      if (vp && lastAnchorRow && laOut) {
        const offset = Math.round(lastAnchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top)
        laOut.textContent = `定位收敛在最后提问行：视口偏移 ${offset}px（顶对齐 ≈0；锚点靠底时为贴底残距）`
      }
    })
  })

  // 轮次锚定 demo：锚行（提问）标 anchor + turn-anchor；流式追加回答时锚顶不动
  const turn = document.querySelector('#msc-turn')
  const turnOut = document.querySelector('#msc-turn-out')
  const turnRound = (q, seq) => {
    const qRow = document.createElement('oas-message-row')
    qRow.setAttribute('align', 'end')
    qRow.setAttribute('anchor', '')
    qRow.setAttribute('message-id', 'tq' + seq)
    const qBubble = document.createElement('oas-bubble')
    qBubble.setAttribute('variant', 'secondary')
    qBubble.textContent = q
    qRow.appendChild(qBubble)
    turn?.appendChild(qRow)
    return qRow
  }
  turnRound('第一轮提问：轮次锚定是什么？', 1)
  for (let i = 0; i < 8; i++) {
    const aRow = document.createElement('oas-message-row')
    const aBubble = document.createElement('oas-bubble')
    aBubble.textContent = `回答内容行 ${i + 1}（跟随流式增长）。`
    aRow.appendChild(aBubble)
    turn?.appendChild(aRow)
  }
  document.querySelector('#msc-turn-anchor')?.addEventListener('click', () => {
    turn?.scrollToMessage('tq1')
  })
  let turnSeq = 2
  document.querySelector('#msc-turn-stream')?.addEventListener('click', async () => {
    if (!turn) return
    const vp = turn.shadowRoot?.querySelector('.viewport')
    const anchorRow = turn ? [...turn.querySelectorAll('oas-message-row[anchor]')].at(-1) ?? null : null
    if (!vp || !anchorRow) return
    // 首行追加：组件把锚从精确顶对齐到 prev-peek 位（64px，露出上一条语境）；对齐后再取漂移基准
    const aRow = document.createElement('oas-message-row')
    const aBubble = document.createElement('oas-bubble')
    aBubble.textContent = `追加回答 ${turnSeq}-1（组件将锚对齐到 peek 位）。`
    aRow.appendChild(aBubble)
    turn.appendChild(aRow)
    await delay(220)
    const before = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    for (let i = 1; i < 4; i++) {
      const row = document.createElement('oas-message-row')
      const bubble = document.createElement('oas-bubble')
      bubble.textContent = `追加回答 ${turnSeq}-${i + 1}（在锚点下方流入，锚顶不动）。`
      row.appendChild(bubble)
      turn.appendChild(row)
      await delay(120)
    }
    turnSeq++
    const after = anchorRow.getBoundingClientRect().top - vp.getBoundingClientRect().top
    const drift = Math.round(Math.abs(after - before))
    if (turnOut) {
      turnOut.textContent =
        drift <= 2
          ? `锚行定位在视口顶 ${Math.round(after)}px 处，追加回答中漂移 ${drift}px——提问钉在视口顶（锚顶跟随）`
          : `锚行位置漂移 ${drift}px（若已上翻接管则属正常）`
    }
  })
})
</script>

## 边界

- **可见性追踪（哪些消息在视口内）**：判定为 v2 候选（牵出大纲菜单/已读标记等独立语义，pay-for-use）——本组件不提供 `oas-visible-change` / `data-visible`，宿主可用 IntersectionObserver 自行组合。
- **虚拟化与渲染降耗**：离屏行跳过渲染（`content-visibility` 等）随虚拟化一起提供（slotted 元素上单独启用会卡占位高度不展开，实测撤回）；数千轮长会话接虚拟列表由宿主组合。
- **空态**：无消息时容器照常渲染（空 log），宿主放空态插槽内容即可。
- **prepend 保位边界**：保位锚在读者真实滚动时释放（读者位置优先）；`pin-to-bottom` / 贴底跟随时补偿无意义（钉底后发覆盖）。同帧混合插入的结算依赖插入前首元素仍在 DOM（宿主删除该行时该帧不补偿）。
- **首屏防跳边界**：`data-pending-scroll` 只覆盖「连接 → 首帧定位」这一段；宿主在挂载后异步拉取首批消息的场景由 `auto-scroll`/`pin-to-bottom` 的装载行为接管。pending 期间 viewport 不可聚焦（毫秒级窗口）。
- `label` 覆盖 viewport 可读名称后被组件吸收移除（原生全局属性吸收惯例）。
- `anchor` / `message-id` 是宿主写在 slotted 行上的协作标记（scroller 只读）；Vue 宿主下两属性为普通透传属性，不会被框架剥离。

## API

### oas-message-scroller

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-scroll` | AI 式底部跟随（布尔在场，默认关）：仅当读者在底部（near-bottom ≤ edge-threshold）时跟随流式增长，上翻阅读不打扰 | `boolean` | — |
| `default-position` | 打开位置：start（顶部）/ end（底部，默认；非法值回退 end）/ last-anchor（定位到最后一个 anchor 标记消息顶部——AI 场景「回到最后提问位置」；无锚点回退 end） | — | — |
| `edge-threshold` | 底部判定阈值 px（默认 8）——距底 ≤ 阈值即视为在底部（near-bottom 检测） | — | — |
| `label` | viewport 可读名称覆盖（缺省走 locale「消息列表」；读入渲染后从宿主移除——原生全局属性吸收惯例） | — | — |
| `pin-to-bottom` | IM 式始终钉底（布尔在场）：新内容总是滚到底、读者上翻也拉回；与 auto-scroll 同时在场时优先 | `boolean` | — |
| `preserve-scroll-on-prepend` | 顶部插入历史时补偿 scrollTop 保持阅读位置（缺省开启；显式 ="false" 关闭）——按插入前首节点位移精确结算（同帧 append+prepend 混合只结算顶部插入量），补偿后锁定保位锚：历史内异步资源（图片等）撑高上方内容时按锚点视口位移持续补偿（message-id 优先重查） | — | — |
| `prev-peek` | 轮次锚定对齐时锚顶上方露出的语境 px（默认 64；非法/负值回退 64） | — | — |
| `turn-anchor` | 轮次锚定（布尔在场）：把一次提问+回答作为锚定单元——锚点贴视口顶时把最后 anchor 标记消息钉在视口顶 prev-peek 处，回答在锚下方流入；读者在底部延续贴底跟随，上翻即静止（绝不逆着读者意图移动） | `boolean` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-scroll-state` | 滚动位置跨过判定线时派发，detail { atBottom, atTop, canScrollStart, canScrollEnd }；首帧（初始定位后）广播一次初始态——宿主监听晚于 upgrade 也能收到 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 消息行列表（oas-message-row / oas-marker 等；行上的 anchor / message-id 属性为 scroller 协作标记） |
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
| `scrollToMessage(id, opts?)` | 按 `message-id` 滚到指定消息行顶部；命中返回 `true`，未知 id 返回 `false` 且不滚动（参数同上） |

状态反射：`data-scrollable`（`"start"` / `"end"` / `"start end"` 空格分隔，无可滚为空）；`data-pending-scroll`（首屏防跳——初始定位应用前在场，定位/读者让位后移除）。ARIA：viewport `role="region"` + 可读名称 + `tabindex="0"`；内容容器 `role="log"` + `aria-relevant="additions"`。CSS 变量：`--oas-message-gap`（行间距，默认 `var(--oas-space-4)`）。部件：`::part(scroller)` / `::part(viewport)` / `::part(content)` / `::part(button)`。
