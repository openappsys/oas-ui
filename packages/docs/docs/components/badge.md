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

## 独立徽标

不包裹任何子内容时，徽标从「贴右上角」回落为静态行内展示（不塌陷），可独立放在文本流或菜单行里。

<DemoBlock title="独立徽标">
  <span>新消息 <oas-badge value="3"></oas-badge></span>
  <span>待办事项 <oas-badge value="12" color="success"></oas-badge></span>
  <span>系统运行中 <oas-badge dot color="green"></oas-badge></span>
</DemoBlock>

## 徽标颜色

`color` 支持四种语义色（`primary` / `success` / `warning` / `danger`）、任意 CSS 色值、以及 11 个预设名（`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`，映射 `--oas-preset-*` token，dark 自动调亮）。count / dot / ribbon 三种模式统一生效，实心文字色按底色亮度自动取黑/白保证可读。

<DemoBlock title="count 语义色">
  <oas-badge value="5" color="primary" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>primary</oas-tag>
  </oas-badge>
  <oas-badge value="5" color="success" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>success</oas-tag>
  </oas-badge>
  <oas-badge value="5" color="warning" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>warning</oas-tag>
  </oas-badge>
  <oas-badge value="5" color="danger">
    <oas-tag>danger</oas-tag>
  </oas-badge>
</DemoBlock>

<DemoBlock title="count 预设色">
  <oas-badge value="3" color="magenta" style="margin-inline-end: var(--oas-space-3)">
    <oas-tag>magenta</oas-tag>
  </oas-badge>
  <oas-badge value="3" color="geekblue" style="margin-inline-end: var(--oas-space-3)">
    <oas-tag>geekblue</oas-tag>
  </oas-badge>
  <oas-badge value="3" color="gold" style="margin-inline-end: var(--oas-space-3)">
    <oas-tag>gold</oas-tag>
  </oas-badge>
  <oas-badge value="3" color="cyan">
    <oas-tag>cyan</oas-tag>
  </oas-badge>
</DemoBlock>

<DemoBlock title="count / dot 自定义色">
  <oas-badge value="8" color="#7c3aed" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>#7c3aed 紫色</oas-tag>
  </oas-badge>
  <oas-badge dot color="#e11d48" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>dot #e11d48</oas-tag>
  </oas-badge>
  <oas-badge dot color="purple">
    <oas-tag>dot purple</oas-tag>
  </oas-badge>
</DemoBlock>

## 偏移

`offset="x,y"`（px 数字）在角标原有右上角定位基础上额外平移；非法值（非数字、缺坐标）静默忽略。

<DemoBlock title="offset 偏移">
  <oas-badge value="5" offset="10,5" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>向右下偏移</oas-tag>
  </oas-badge>
  <oas-badge value="5" offset="0,8">
    <oas-tag>向下偏移</oas-tag>
  </oas-badge>
</DemoBlock>

## 状态点

`status` 渲染「状态点 + `text` 文字」的行内独立元素（非角标定位），与 ribbon / dot / count 模式互斥（设置时优先渲染状态点）。`processing` 圆点带脉冲动画（`prefers-reduced-motion` 下停用）。

<DemoBlock title="状态点">
  <oas-badge status="success" text="已发布" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="processing" text="处理中" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="default" text="默认" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="error" text="错误" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="warning" text="警告"></oas-badge>
</DemoBlock>

## 小尺寸

`size="small"` 提供紧凑档位：数字徽标高约 13px、dot 缩至 6px。

<DemoBlock title="small 小尺寸">
  <oas-badge value="5" size="small" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>小号 count</oas-tag>
  </oas-badge>
  <oas-badge value="99" max="99" size="small" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>小号 99+</oas-tag>
  </oas-badge>
  <oas-badge dot size="small">
    <oas-tag>小号 dot</oas-tag>
  </oas-badge>
</DemoBlock>

## 动态增减

`value` 变化即时反映；宿主可在点击按钮时为徽标添加动画 class 实现过渡反馈（本例通过 `::part(badge)` 做缩放/透明度小动画）。

<DemoBlock title="动态增减">
  <oas-badge id="badge-dyn" value="5">
    <oas-tag>动态计数</oas-tag>
  </oas-badge>
  <oas-button id="badge-dec" size="small" aria-label="减少">−</oas-button>
  <oas-button id="badge-inc" size="small" type="primary" aria-label="增加">＋</oas-button>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const badge = document.getElementById('badge-dyn')
  const bump = () => {
    badge.classList.remove('bump')
    void badge.offsetWidth
    badge.classList.add('bump')
  }
  document.getElementById('badge-inc')?.addEventListener('click', () => {
    badge.setAttribute('value', String(Number(badge.getAttribute('value') || 0) + 1))
    bump()
  })
  document.getElementById('badge-dec')?.addEventListener('click', () => {
    badge.setAttribute('value', String(Math.max(0, Number(badge.getAttribute('value') || 0) - 1)))
    bump()
  })
})
</script>

<style>
oas-badge#badge-dyn.bump::part(badge) {
  animation: oas-badge-dyn-bump 220ms var(--oas-ease-out);
}
@keyframes oas-badge-dyn-bump {
  0%,
  100% {
    transform: translate(50%, -50%) scale(1);
    opacity: 1;
  }
  45% {
    transform: translate(50%, -50%) scale(1.22);
    opacity: 0.72;
  }
}
</style>

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

`color` 支持 `primary` / `success` / `warning` / `danger` 四种语义色，与主题 light/dark 联动；同样支持预设名与任意色值（走 `--oas-preset-*` token / 原色值注入）。

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

<DemoBlock title="缎带预设色与自定义色">
  <oas-badge ribbon text="限时" color="geekblue" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>geekblue</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="特惠" color="#7c3aed">
    <oas-card><p>#7c3aed</p></oas-card>
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

同一 `oas-badge` 可做 count 或 ribbon 两种用途：count 徽标固定在右上角的小圆点/数字，dot 是无文本状态点，ribbon 则横跨卡片上沿的缎带；status 是独立行内的「状态点 + 文字」。

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
| `color` | 徽标颜色：4 语义色（`primary` / `success` / `warning` / `danger`）、任意 CSS 色值、或 11 个预设名（`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`，映射 `--oas-preset-*` token，dark 自动调亮）。count / dot / ribbon 三种模式统一生效，实心文字色按底色亮度自动取黑/白保证可读 | `BadgeColor \| BadgePresetColor` | — |
| `dot` | 小圆点模式 | `boolean` | — |
| `max` | 上限 | `string` | — |
| `mode` | 模式：`count`（默认，数字/圆点徽标）或 `ribbon`（缎带角标，等价 `ribbon` 属性） | `BadgeMode` | `count` |
| `offset` | 角标偏移：`"x,y"`（px 数字），在右上角定位基础上额外平移；非法值（非数字、缺坐标）静默忽略 | `string` | — |
| `placement` | 缎带位置：`start`（行首）/ `end`（行尾，默认） | `BadgePlacement` | `end` |
| `ribbon` | 缎带角标模式（布尔，等价 `mode="ribbon"`） | `boolean` | — |
| `showZero` | value=0 时是否显示 | `boolean` | — |
| `size` | 尺寸：`small`（小档，数字徽标高约 13px、dot 6px） | `string` | — |
| `status` | 状态点形态：`success` / `processing` / `default` / `error` / `warning`，渲染「状态点 + `text` 文字」的行内独立元素，与 ribbon / dot / count 模式互斥（设置时优先渲染）；`processing` 圆点带脉冲动画（`prefers-reduced-motion` 下停用） | `BadgeStatus` | — |
| `text` | 缎带或状态点文字；`slot="ribbon"` 有内容时以插槽为准 | `string` | — |
| `value` | 数字 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 被包裹内容（卡片、按钮等）；无内容时徽标回落为独立行内展示 |
| `ribbon` | 缎带自定义内容 |
