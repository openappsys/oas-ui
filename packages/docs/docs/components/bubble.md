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
})
</script>

## 无障碍

- 方向语义不单靠颜色与对齐传达：发送者名/消息文本由 `oas-message-row` 的 header/内容承载，屏幕阅读器可读。
- `loading` 态打字点包 `role="status"` + locale 可读名称（「正在输入…」），三点本体 `aria-hidden`。
- 气泡无键盘交互（纯展示表面），入不做 tab 序；富内容（链接/按钮）由宿主放默认插槽，各自保持原生可达。

## API

### oas-bubble

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `loading` | 打字中态（布尔在场）：内容切换为三点打字指示，宿主元素反射 aria-busy（AI「正在输入」场景） | `boolean` | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 气泡内容 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-bubble-max-width` | `80%` |
| `--oas-bubble-radius` | `var(--oas-radius-lg)` |

部件：`::part(bubble)` 气泡表面、`::part(content)` 内容区、`::part(typing)` 打字点。`align`（`start` 默认 / `end`）与 `variant`（`default` / `secondary` / `muted` / `outline` / `ghost` / `destructive`）为纯 CSS 消费通道。
