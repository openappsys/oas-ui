# Bubble 气泡

会话消息气泡表面：只负责气泡本身（背景/边框/圆角/宽度上限 + 内容），头像、名字、时间、发送态由 `oas-message-row` 组合行负责。用于 AI 助手、客服会话、IM 聊天等会话流场景。

## 基础用法

<DemoBlock title="默认气泡">
  <div style="width: 100%; max-width: 420px">
    <oas-bubble>你好，介绍一下 OAS-UI 的会话组件族。</oas-bubble>
  </div>
</DemoBlock>

气泡内容走默认插槽；宽度自适应内容、上限 80% 容器宽（可用 `--oas-bubble-max-width` 整链覆盖）。

## 方向（align）

<DemoBlock title="我方 / 对方左右分侧">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-bubble align="start">对方消息：默认靠 start 侧（逻辑属性，RTL 下自动镜像）。</oas-bubble>
    <oas-bubble align="end">我方消息：align="end" 靠 end 侧，与对方视觉分侧。</oas-bubble>
  </div>
</DemoBlock>

`align="start" | "end"` 用逻辑布局实现（`margin-inline-start: auto` + `text-align: end`），RTL 下自动翻转，无物理方向 CSS。

## 尾巴（tail）

<DemoBlock title="分组最后一条 + 双方对话">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">客</oas-avatar>
      <oas-bubble>同一发送者的连续消息，前几条不加尾巴。</oas-bubble>
    </oas-message-row>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">客</oas-avatar>
      <oas-bubble tail="auto">最后一条加 tail，尾巴在头像一侧指向发送者。</oas-bubble>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">我</oas-avatar>
      <oas-bubble align="end" variant="secondary">我方消息默认无尾巴。</oas-bubble>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">我</oas-avatar>
      <oas-bubble align="end" variant="secondary" tail="auto">tail="auto" 跟随 align，指向右侧发送者。</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

<DemoBlock title="变体差异：outline 退化圆角，muted / ghost 不画">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-bubble tail="start" variant="outline">outline：不画突出尾巴，底部外角收小圆角，描边不断口。</oas-bubble>
    <oas-bubble tail="start" variant="muted">muted：无表面，不画尾巴。</oas-bubble>
    <oas-bubble tail="start" variant="ghost">ghost：无表面，不画尾巴。</oas-bubble>
  </div>
</DemoBlock>

`tail="none | auto | start | end"`，默认 `none`。`auto` 跟随 `align`：对方（start）尾巴在底部左侧，我方（end）在底部右侧。实底变体（default / secondary / destructive）画底部外角弧形尾巴，颜色跟随气泡表面；`outline` 退化为底部外角收小圆角（避免描边断口），`muted` / `ghost` 无表面不画。**分组时要只给同一发送者连续消息的最后一条加 `tail`**，与主流会话界面一致。尾巴是装饰性伪元素，不进入 DOM 与读屏；尺寸/偏移/圆角可用 `--oas-bubble-tail-size` / `--oas-bubble-tail-offset` / `--oas-bubble-tail-corner-radius` 调整。

## 变体（variant）

<DemoBlock title="六种语义变体">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-bubble variant="default">default：中性浅底（默认）。</oas-bubble>
    <oas-bubble variant="secondary">secondary：主色浅调，常用于我方消息。</oas-bubble>
    <oas-bubble variant="muted">muted：无底、次级文字色。</oas-bubble>
    <oas-bubble variant="outline">outline：白底描边。</oas-bubble>
    <oas-bubble variant="ghost">ghost：无底无框，宽度上限放开。</oas-bubble>
    <oas-bubble variant="destructive">destructive：危险语义（报错回显等）。</oas-bubble>
  </div>
</DemoBlock>

`variant="secondary" | "destructive"` 的浅调底用 `color-mix()` 与主题语义色混合（theme-aware），暗色下自动适配；ghost 放开 80% 宽度上限，适合长回答整段流式。

## 打字中（loading）

<DemoBlock title="loading 打字指示">
  <div style="width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-bubble id="bubble-loading-demo">帮我总结一下这段文档的要点。</oas-bubble>
    <oas-button id="bubble-loading-btn" size="small" style="align-self: flex-start">模拟回复中…</oas-button>
  </div>
</DemoBlock>

布尔属性 `loading` 在场时内容切换为三点打字指示（AI「正在输入」场景），宿主元素反射 `aria-busy`；动画尊重 `prefers-reduced-motion`。

`streaming` 表示「已有部分内容、仍在追加」：内容保持可见，宿主反射 `aria-busy`，内容区设 `aria-live="off"` 避免逐 token 播报；回答结束移除该属性，由外部 status 区播报完成/停止/失败。`loading` 与 `streaming` 语义不同，不要用 `loading` 表示流式追加。

<DemoBlock title="流式追加（streaming）">
  <oas-bubble streaming>已经收到部分回答，内容仍在继续追加。</oas-bubble>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await import('@oas-ui/ui')
  const btn = document.querySelector('#bubble-loading-btn')
  const bubble = document.querySelector('#bubble-loading-demo')
  btn?.addEventListener('click', () => {
    if (bubble?.hasAttribute('loading')) return
    bubble?.setAttribute('loading', '')
    window.setTimeout(() => bubble?.removeAttribute('loading'), 2400)
  })
  const reactionsBubble = document.querySelector('#bubble-reactions-demo')
  const reactionsOut = document.querySelector('#bubble-reactions-out')
  reactionsBubble?.addEventListener('oas-reaction', (e) => {
    const d = e.detail
    if (reactionsOut) reactionsOut.textContent = `收到 oas-reaction：${d.emoji}（count=${d.count}，active=${d.active}，index=${d.index}）`
  })
})
</script>

## 表情回应（reactions）

<DemoBlock title="表情 + 计数（side / align）">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-bubble id="bubble-reactions-demo" reactions='[{"emoji":"👍","count":3,"active":true},{"emoji":"🎉","count":1}]'>这个方案我赞成，细节再对一下。</oas-bubble>
    <oas-bubble align="end" variant="secondary" reactions-side="top" reactions-align="end" reactions='[{"emoji":"❤️","count":2}]'>上面的方案我已确认。</oas-bubble>
  </div>
  <p id="bubble-reactions-out" style="margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击表情条上的按钮，这里显示收到的 oas-reaction。</p>
</DemoBlock>

`reactions` 是 JSON 数组（每项 `{ emoji, count?, active?, label? }`，emoji 必填；空数组/非法 JSON 不渲染反应条）；`reactions-side` 控制上下（默认 `bottom`，`top` 放气泡上方），`reactions-align` 覆盖横向对齐（缺省跟随气泡 `align`）。每条反应是**真按钮**（键盘可达 + 焦点环 + `aria-pressed` 反映选中态）：点击派发 `oas-reaction`（detail `{ emoji, count, active, index }`）——反应数据仍由宿主拥有，组件只派发意图。

## 无障碍

- 方向语义不单靠颜色与对齐传达：发送者名/消息文本由 `oas-message-row` 的 header/内容承载，屏幕阅读器可读。
- `loading` 态打字点包 `role="status"` + locale 可读名称（「正在输入…」），三点本体 `aria-hidden`。
- 气泡无键盘交互（纯展示表面），入不做 tab 序；富内容（链接/按钮）由宿主放默认插槽，各自保持原生可达。

## API

### oas-bubble

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 方向：start（对方，默认）/ end（我方）——逻辑属性实现（align-self 镜像），RTL 自动镜像；显式设置时优先于容器 text-align 的继承反射 | — | — |
| `loading` | 打字中态（布尔在场）：内容切换为三点打字指示，宿主元素反射 aria-busy（AI「正在输入」场景） | `boolean` | — |
| `reactions` | 表情回应条 JSON 数组，每项 { emoji, count?, active?, label? }（emoji 必填）；空数组/非法 JSON 不渲染反应条 | — | — |
| `reactions-align` | 反应条横向对齐：start / end；缺省跟随气泡 align | — | — |
| `reactions-side` | 反应条纵向位置：bottom（默认，气泡下方）/ top（气泡上方） | — | — |
| `streaming` | 流式追加态（布尔在场）：内容保持可见，宿主反射 aria-busy；内容区 aria-live=off，避免逐 token 播报，终态由外部 status 区播报 | `boolean` | — |
| `tail` | 尾巴方向：none（默认，无尾巴）/ auto（跟随 align：start 侧或 end 侧）/ start / end——底部外角弧形小尾巴，指向发送者；实底变体绘制，outline 退化为底部外角收小圆角，muted / ghost 不画。分组时只给同一发送者连续消息的最后一条加 | `string` | `none` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-reaction` | 点击某条反应时派发，detail { emoji, count, active, index }（反应数据仍由宿主拥有，组件只派发意图） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 气泡内容 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-bubble-max-width` | `80%` |
| `--oas-bubble-radius` | `var(--oas-radius-lg)` |
| `--oas-bubble-tail-corner-radius` | `var(--oas-radius-sm)` |
| `--oas-bubble-tail-offset` | `0` |
| `--oas-bubble-tail-size` | `16px` |

部件：`::part(bubble)` 气泡表面、`::part(content)` 内容区、`::part(typing)` 打字点、`::part(reactions)` 反应条 / `::part(reaction)` 单个反应钮。`align`（`start` 默认 / `end`）与 `variant`（`default` / `secondary` / `muted` / `outline` / `ghost` / `destructive`）为纯 CSS 消费通道。
