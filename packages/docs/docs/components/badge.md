# Badge 徽标

数字/状态徽标，通常用于消息计数或新内容提示。

## 基础用法

<DemoBlock title="数字徽标">
  <oas-badge value="5">
    <oas-tag>通知</oas-tag>
  </oas-badge>
  <oas-badge value="88">
    <oas-tag>未读消息</oas-tag>
  </oas-badge>
</DemoBlock>

## 上限显示

超过 `max` 时显示 `max+`。

<DemoBlock title="上限显示">
  <oas-badge value="120" max="99">
    <oas-tag>评论</oas-tag>
  </oas-badge>
</DemoBlock>

## 小圆点

<DemoBlock title="状态点">
  <oas-badge dot>
    <oas-tag>在线状态</oas-tag>
  </oas-badge>
</DemoBlock>

## 零值

默认隐藏 0，设置 `showZero` 时显示。

<DemoBlock title="零值控制">
  <oas-badge value="0">
    <oas-tag>默认隐藏 0</oas-tag>
  </oas-badge>
  <oas-badge value="0" showZero>
    <oas-tag>显示 0</oas-tag>
  </oas-badge>
</DemoBlock>

## 缎带角标

`ribbon` 布尔属性或 `mode="ribbon"` 开启缎带角标。文本经 `text` 属性提供，默认位于右端（`placement="end"`），可用 `placement="start"` 切到左端。

<DemoBlock title="普通缎带">
  <oas-badge ribbon text="HOT" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>默认缎带（右上角）</p></oas-card>
  </oas-badge>
  <oas-badge mode="ribbon" text="限量" placement="start">
    <oas-card><p>mode="ribbon"（左上角）</p></oas-card>
  </oas-badge>
</DemoBlock>

## 彩色缎带

`color` 支持 `primary` / `success` / `warning` / `danger` 四种语义色，与主题 light/dark 联动。

<DemoBlock title="彩色缎带">
  <oas-badge ribbon text="推荐" color="primary" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>primary</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="免费" color="success" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>success</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="即将结束" color="warning" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>warning</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="已售罄" color="danger">
    <oas-card><p>danger</p></oas-card>
  </oas-badge>
</DemoBlock>

## 自定义缎带内容

除 `text` 属性外，也可用 `slot="ribbon"` 传入任意自定义内容（有插槽内容时优先）。

<DemoBlock title="自定义内容">
  <oas-badge ribbon>
    <span slot="ribbon">新品 8 折起</span>
    <oas-card><p>slot="ribbon" 自定义内容</p></oas-card>
  </oas-badge>
</DemoBlock>

## 与数字/圆点徽标对比

同一 `oas-badge` 可做 count 或 ribbon 两种用途：count 徽标固定在右上角的小圆点/数字，dot 是无文本状态点，ribbon 则横跨卡片上沿的缎带。

<DemoBlock title="count / dot / ribbon 对比">
  <oas-badge value="5" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>count 数字徽标</p></oas-card>
  </oas-badge>
  <oas-badge dot style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>dot 状态点</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="上新">
    <oas-card><p>ribbon 缎带</p></oas-card>
  </oas-badge>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 缎带语义色：`primary` / `success` / `warning` / `danger`（默认 `danger`） | `BadgeColor` | `danger` |
| `dot` | 小圆点模式 | `boolean` | — |
| `max` | 上限 | `string` | — |
| `mode` | 模式：`count`（默认，数字/圆点徽标）或 `ribbon`（缎带角标，等价 `ribbon` 属性） | `BadgeMode` | `count` |
| `placement` | 缎带位置：`start`（行首）/ `end`（行尾，默认） | `BadgePlacement` | `end` |
| `ribbon` | 缎带角标模式（布尔，等价 `mode="ribbon"`） | `boolean` | — |
| `showZero` | value=0 时是否显示 | `boolean` | — |
| `text` | 缎带文本；`slot="ribbon"` 有内容时以插槽为准 | `string` | — |
| `value` | 数字 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 被包裹内容（卡片、按钮等） |
| `ribbon` | 缎带自定义内容 |
