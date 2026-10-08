# MessageRow 消息行

会话消息行（组合行）：行布局所有者——负责头像槽、方向、header/footer 排布与发送态；可见表面由 `oas-bubble`（默认插槽内）提供。消息操作（复制/重试等）由 footer 插槽内组件派发，组件不管具体动作。

## 基础用法

<DemoBlock title="双方对话（avatar + header + bubble + footer）">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-message-row>
      <oas-avatar slot="avatar" size="32">客</oas-avatar>
      <span slot="header">客服小 O · 10:01</span>
      <oas-bubble>您好，请问有什么可以帮您？</oas-bubble>
      <span slot="footer">
        <oas-button size="small" type="text">引用</oas-button>
        <oas-button size="small" type="text">转发</oas-button>
      </span>
    </oas-message-row>
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="32">我</oas-avatar>
      <span slot="header">我 · 10:02</span>
      <oas-bubble variant="secondary">想了解消息行的插槽结构。</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

四个插槽：`avatar`（头像）、`header`（发送者名/时间）、默认（放 `oas-bubble`）、`footer`（操作/附加元数据）；空插槽自动收起。头像**底对齐**（长消息贴底，IM 通行细节）。

## 方向与逻辑属性（align）

<DemoBlock title="align=start / end（RTL 自动镜像）">
  <div dir="rtl" style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-message-row align="end">
      <oas-avatar slot="avatar" size="28">我</oas-avatar>
      <oas-bubble variant="secondary">RTL 容器内的我方消息——方向全部逻辑属性，自动镜像。</oas-bubble>
    </oas-message-row>
    <oas-message-row>
      <oas-avatar slot="avatar" size="28">客</oas-avatar>
      <oas-bubble>RTL 容器内的对方消息。</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

`align="end"` 行方向翻转（`flex-direction: row-reverse`）+ 文本列逻辑对齐，无物理方向 CSS，RTL 容器下自动镜像。

## 发送状态（status）

<DemoBlock title="sending / sent / delivered / read / error">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-space-2_5)">
    <oas-message-row align="end" status="sending"><oas-bubble variant="secondary">发送中（spinner）。</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="sent"><oas-bubble variant="secondary">已发送（单勾）。</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="delivered"><oas-bubble variant="secondary">已送达（双勾）。</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="read"><oas-bubble variant="secondary">已读（双勾主色）。</oas-bubble></oas-message-row>
    <oas-message-row align="end" status="error"><oas-bubble variant="secondary">发送失败（圆叉 + danger 文本色）。</oas-bubble></oas-message-row>
  </div>
</DemoBlock>

`status` 是便利属性：渲染**可见小字 + 装饰图标**（文案走 locale，语义不单靠颜色传达；error 用 danger token 色作增强）。非法值/缺省不渲染状态区。重试等操作由宿主在 footer 插槽提供。

## 连续消息聚拢（grouped）

<DemoBlock title="同发送者连续消息">
  <div style="width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: var(--oas-message-gap, var(--oas-space-4))">
    <oas-message-row>
      <oas-avatar slot="avatar" size="32">客</oas-avatar>
      <span slot="header">客服小 O · 10:01</span>
      <oas-bubble>第一条：完整间距与头像。</oas-bubble>
    </oas-message-row>
    <oas-message-row grouped>
      <oas-avatar slot="avatar" size="32">客</oas-avatar>
      <oas-bubble>第二条（grouped）：与上一条同发送者，行间距收拢。</oas-bubble>
    </oas-message-row>
    <oas-message-row grouped>
      <oas-avatar slot="avatar" size="32">客</oas-avatar>
      <oas-bubble>第三条（grouped）：继续聚拢。</oas-bubble>
    </oas-message-row>
  </div>
</DemoBlock>

与上一条同发送者时由宿主声明 `grouped`（布尔在场）——行间距收拢（走 `--oas-message-gap` 变量），视觉聚拢为一组。

## API

### oas-message-row

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 方向：start（对方，默认）/ end（我方）——逻辑属性实现（row-reverse + 逻辑对齐），RTL 自动镜像 | — | — |
| `grouped` | 布尔在场：与上一条同发送者的连续消息（宿主声明），行间距收拢（走 --oas-message-gap） | — | — |
| `status` | 发送状态便利属性：sending / sent / delivered / read / error——渲染可见小字 + 装饰图标（文案走 locale，语义不单靠颜色；error 追加 danger 色作增强）；非法值/缺省不渲染状态区 | `MessageRowStatus` | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 消息内容（放 oas-bubble） |
| `avatar` | 头像槽（底对齐，长消息贴底） |
| `footer` | 尾部槽（操作/附加元数据，随方向对齐） |
| `header` | 头部槽（发送者名/时间） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-message-gap` | `var(--oas-space-4)` |

CSS 变量：`--oas-message-gap`（行间距，默认 `var(--oas-space-4)`）。部件：`::part(row)` / `::part(avatar)` / `::part(main)` / `::part(header)` / `::part(content)` / `::part(footer)` / `::part(status)`。事件：无（消息操作由 footer 插槽内组件派发）。
