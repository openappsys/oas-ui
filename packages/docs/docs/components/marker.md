# Marker 会话标记

会话时间戳/系统事件标记：行内小状态、描边胶囊行、带文字分隔线。IM 里的「今天 10:00」时间分隔、「某某 加入群聊」系统事件、AI 流式「生成中」状态都归此类。

## 基础用法（三变体）

<DemoBlock title="default / border / separator">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-marker>系统消息：会话已创建</oas-marker>
    <oas-marker variant="border">新成员加入</oas-marker>
    <oas-marker variant="separator">今天 10:00</oas-marker>
  </div>
</DemoBlock>

`variant="default"`（小号次级文字，默认）适合系统便签；`border` 描边胶囊行适合状态徽标；`separator` 两侧伸缩线 + 中间文字，是时间戳分隔的主形态。

## 时间戳分隔（separator）

<DemoBlock title="会话流里的时间分隔">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-marker variant="separator">昨天</oas-marker>
    <oas-message-row>
      <oas-bubble>昨天最后的消息。</oas-bubble>
    </oas-message-row>
    <oas-marker variant="separator">今天 10:00</oas-marker>
    <oas-message-row align="end">
      <oas-bubble variant="secondary">今天的新消息。</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

分隔线语义纪律：带文字的分隔**不得**加 `role="separator"`——其可读名来自 `aria-label`、文字会被视为装饰，屏幕阅读器反而读不到「昨天/今天」。本组件不加该角色，线只是视觉装饰。

## 图标与流式状态

<DemoBlock title="icon 槽 + role=status">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-marker variant="border" role="status">
      <oas-spin slot="icon" size="14"></oas-spin>
      正在生成回答…
    </oas-marker>
    <oas-marker variant="default">
      <svg slot="icon" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--oas-color-text-secondary)" stroke-width="1.5"/><path d="M5.5 8.5 L7.5 10.5 L11 6.5" stroke="var(--oas-color-text-secondary)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      已全部同步
    </oas-marker>
  </div>
</DemoBlock>

`slot="icon"` 放装饰图标（包裹层 `aria-hidden`，内容承载语义）。流式/进度状态由宿主直接写 `role="status"`（浏览器原生 ARIA 反射，AT 播报状态变化）——组件不重复转发。

## 语义状态（status）与流式微光（shimmer）

<DemoBlock title="info / success / warning / danger + shimmer">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-marker status="info" variant="border">已连接服务器</oas-marker>
    <oas-marker status="success" variant="border">同步完成（12 项）</oas-marker>
    <oas-marker status="warning" variant="border">存储空间不足 10%</oas-marker>
    <oas-marker status="danger" variant="border">连接已断开</oas-marker>
    <oas-marker status="info" variant="separator">今天 10:00</oas-marker>
    <oas-marker status="success" shimmer>正在生成回答…（shimmer 流式微光）</oas-marker>
  </div>
</DemoBlock>

`status`（`info` / `success` / `warning` / `danger`）是语义状态档：文字、描边（border）与分隔线（separator）取语义色 token，暗色下自动适配。`shimmer` 布尔在场开启流式微光（文本渐变扫过，只动背景位置不改尺寸；`prefers-reduced-motion` 降级为静态文字）。`status` 只改视觉语义，**不改 ARIA role**——流式播报仍由宿主声明 `role="status"`。

## 空态

<DemoBlock title="空内容">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-marker></oas-marker>
    <oas-marker variant="separator"></oas-marker>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    第一行（default）无内容整件隐藏；第二行 separator 保留分隔线本体（线是它的存在意义）。
  </p>
</DemoBlock>

## API

### oas-marker

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `shimmer` | 布尔在场：流式微光（文本渐变扫过；prefers-reduced-motion 降级为静态文字） | — | — |
| `status` | 语义状态档：info / success / warning / danger——文字、描边与分隔线取语义色 token（暗色自动适配；不改 ARIA role，流式播报仍由宿主声明） | — | — |
| `variant` | 变体：default（小号次级文字，默认）/ border（描边胶囊行）/ separator（两侧伸缩线 + 中间文字，时间戳分隔主形态）；空内容时 default/border 整件隐藏、separator 保留分隔线本体 | — | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 文字内容 |
| `icon` | 装饰图标槽（包裹层 aria-hidden；流式/进度状态由宿主直接写 role=status，组件不重复转发） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-marker-font` | `inherit` |
| `--oas-marker-shimmer-from` | `var(--oas-color-text-secondary)` |
| `--oas-marker-shimmer-to` | `var(--oas-color-text-primary)` |

CSS 变量：`--oas-marker-font`（字号开口，默认 `inherit`）。部件：`::part(marker)` / `::part(icon)` / `::part(content)`。a11y 纪律：带文字分隔线不得加 `role="separator"`（其可读名来自 aria-label、文字被视为装饰）。
