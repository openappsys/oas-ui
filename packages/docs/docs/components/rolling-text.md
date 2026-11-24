---
description: 数字与字符逐位翻滚的文本组件，值变化时按列滚动到新字符，支持前缀后缀、小数精度与翻滚时长
---

# RollingText 翻滚文本

数字 / 字符逐位滚动的展示组件：每个字符占一列，数字列是 0–9 的纵向滚轮，值变化时按目标位翻滚；小数点、负号、字母等非数字列做纵向翻转替换。

- `value` 取字符串或数字；`precision` 控制小数位数（补零 / 四舍五入）
- `prefix-text` / `suffix-text` 渲染货币符号、单位等
- `duration` 控制单列翻滚时长；CSS 变量可进一步定制
- 数字按**最短路径**翻滚（`9 → 0` 只滚一格，不整轮倒卷）；数字列恒按 LTR 排列，RTL 页面里 `123` 不会显示成 `321`
- 无障碍：可见列整体 `aria-hidden`，完整文本放进视觉隐藏区；`live` 开启 `polite` 播报
- `prefers-reduced-motion` 下关闭过渡与翻转动画，直接呈现目标值

## 基础用法

<DemoBlock title="金额（¥ 前缀 + 两位小数）">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-3); align-items: flex-start;">
    <oas-rolling-text id="rt-demo" value="1288" prefix-text="¥" precision="2"></oas-rolling-text>
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap;">
      <oas-button id="rt-random" size="small">随机变化</oas-button>
      <oas-button id="rt-reset" size="small">回到初始值</oas-button>
    </div>
  </div>
</DemoBlock>

## 字符列

小数点、负号、百分比等非数字字符同样逐列翻滚：

<DemoBlock title="字符列示例">
  <oas-rolling-text value="-12.5%" precision="1"></oas-rolling-text>
  <oas-rolling-text value="OAS-2026" style="margin-inline-start: var(--oas-space-4)"></oas-rolling-text>
</DemoBlock>

## 速度与尺寸

`duration` 控制翻滚时长（毫秒），`--oas-rolling-text-font` / `--oas-rolling-text-height` 控制字号与列高：

<DemoBlock title="duration=1200 / 大字号">
  <oas-rolling-text id="rt-slow" value="2026" duration="1200" suffix-text=" 年" style="--oas-rolling-text-font: calc(var(--oas-font-size-xl) * 2)"></oas-rolling-text>
</DemoBlock>

## 读屏播报

默认静默（`aria-live="off"`），避免频繁滚动打断读屏；需要播报时加 `live`：

<DemoBlock title="live：polite 播报">
  <oas-rolling-text value="99" prefix-text="库存 " suffix-text=" 件" live></oas-rolling-text>
</DemoBlock>

## 方向与逐位停

`direction="up"` / `direction="down"` 让数字列恒向上 / 向下翻（缺省最短路径，现状不变）；`stop-order` 让各列按位次递增延迟（列间 stagger = 时长 × 12%），从左到右依次停稳：

<DemoBlock title="direction=up + stop-order">
  <oas-rolling-text id="rt-dir" value="90" direction="up" stop-order duration="800"></oas-rolling-text>
  <oas-button id="rt-dir-roll" size="small" style="margin-inline-start: var(--oas-space-3)">随机换数</oas-button>
</DemoBlock>

## 手动控制 start() / reset()

`reset()` 清掉进行中的翻滚，无过渡直接呈现当前 `value`；`start()` 按当前 `value` 重新播放一次完整翻滚（各列先落零档再翻到目标）：

<DemoBlock title="start() / reset() 重播">
  <oas-rolling-text id="rt-ctrl" value="618" duration="700"></oas-rolling-text>
  <div style="display: inline-flex; gap: var(--oas-space-2); margin-inline-start: var(--oas-space-3)">
    <oas-button id="rt-start" size="small">start()</oas-button>
    <oas-button id="rt-ctrl-reset" size="small">reset()</oas-button>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-rolling-text').then(() => {
    const demo = document.querySelector('#rt-demo')
    document.querySelector('#rt-random')?.addEventListener('click', () => {
      const value = Math.round(Math.random() * 99999) / 100
      demo?.setAttribute('value', String(value))
    })
    document.querySelector('#rt-reset')?.addEventListener('click', () => {
      demo?.setAttribute('value', '1288')
    })
    document.querySelector('#rt-slow')?.addEventListener('click', () => {
      const el = document.querySelector('#rt-slow')
      el?.setAttribute('value', String(Math.round(Math.random() * 9000) + 1000))
    })
    document.querySelector('#rt-dir-roll')?.addEventListener('click', () => {
      document.querySelector('#rt-dir')?.setAttribute('value', String(Math.round(Math.random() * 99)))
    })
    document.querySelector('#rt-start')?.addEventListener('click', () => {
      document.querySelector('#rt-ctrl')?.start()
    })
    document.querySelector('#rt-ctrl-reset')?.addEventListener('click', () => {
      document.querySelector('#rt-ctrl')?.reset()
    })
  })
})
</script>

## API

### oas-rolling-text

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `direction` | 翻滚方向：up（恒向上）/ down（恒向下）；缺省最短路径（现状不变），非法值回落最短路径并 devWarn 一次 | `string` | — |
| `duration` | 单列翻滚时长（ms，默认 600）；非法或非正回落默认 | `string` | — |
| `live` | 布尔，存在时读屏活区为 `polite`（默认 off，避免频繁播报） | — | — |
| `precision` | 小数位数（0–10）：补零 / 四舍五入；缺省或非法时保留原文本 | `string` | — |
| `prefix-text` | 前缀文本（如货币符号） | `string` | — |
| `stop-order` | 逐位停：各列按位次递增延迟（列间 stagger = 时长 × 12%），从左到右依次停稳 | — | — |
| `suffix-text` | 后缀文本（如单位） | `string` | — |
| `value` | 显示值（字符串；numeric property 赋值会反射到属性） | `string \| number` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `reset` | `reset(): void` | 清掉进行中的翻滚与延迟，无过渡直接呈现当前 value |
| `start` | `start(): void` | 按当前 value 重新播放一次完整翻滚（各列先落零档 / 字符列置空，再翻到目标） |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-rolling-text-duration` | 翻滚时长 | `var(--oas-transition-base)` |
| `--oas-rolling-text-font` | 字号 | `var(--oas-font-size-xl)` |
| `--oas-rolling-text-height` | 单列高度 | `1em` |
| `--oas-rolling-text-separator-color` | 小数点 / 符号等非数字列颜色 | `var(--oas-color-text-primary)` |
