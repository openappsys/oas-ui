# Countdown 倒计时

倒计时组件，实时刷新、支持天/时/分/秒格式化模板，到达终点派发 `oas-finish`，断开连接自动清理计时器。

## 基础用法

<DemoBlock title="默认 HH:mm:ss">
  <oas-countdown value="90000"></oas-countdown>
</DemoBlock>

## 天时分秒

<DemoBlock title="DD:HH:mm:ss 模板">
  <oas-countdown value="90061000" format="DD:HH:mm:ss"></oas-countdown>
</DemoBlock>

## 中文单位模板

<DemoBlock title="中文单位">
  <oas-countdown value="90061000" format="D天H时m分s秒"></oas-countdown>
</DemoBlock>

## 毫秒精度

模板加 `SSS` token 输出毫秒（3 位补零），内部刷新自动加速到 50ms 粒度；`aria-live` 保持 off，避免高频文本变化干扰读屏。

<DemoBlock title="SSS 毫秒模板">
  <oas-countdown value="10000" format="ss.SSS"></oas-countdown>
  <oas-countdown value="10000" format="mm分ss秒SSS"></oas-countdown>
</DemoBlock>

## 暂停 / 恢复 / 重置

`active` 受控暂停（`"false"` 停帧且不计时已走过时长，恢复后续走）；`reset()` 方法回到初值重新计时。适合验证码重发、番茄钟等场景。

<DemoBlock title="active 暂停恢复 + reset()">
  <oas-countdown id="countdown-active" value="60000" title="支付剩余时间"></oas-countdown>
  <oas-countdown value="90000" active="false" title="已暂停（active=false，停帧在初值）"></oas-countdown>
  <oas-button id="countdown-toggle" size="sm">暂停</oas-button>
  <oas-button id="countdown-reset" size="sm">重置</oas-button>
</DemoBlock>

## 前缀 / 后缀 / 标题

`title` 属性（或 `slot="title"`）在上方渲染标题；`prefix` / `suffix` 夹在显示值两侧（属性文本或同名 slot 双通道）。

<DemoBlock title="title + prefix / suffix">
  <oas-countdown value="90000" title="距活动开始" prefix="还剩 " suffix=" 结束"></oas-countdown>
  <oas-countdown value="300000">
    <span slot="title">验证码有效期</span>
    <span slot="suffix"> 后失效</span>
  </oas-countdown>
</DemoBlock>

## 结束回调

<DemoBlock title="oas-finish 完成态">
  <oas-countdown id="countdown-event" value="3000"></oas-countdown>
  <span id="countdown-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 字号定制

字号默认固定为 `--oas-font-size-lg`（16px，不随外层变化），可用 CSS 变量 `--oas-countdown-font` 显式定制（如 `32px`）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 受控暂停：`"false"` 停帧且不计时已走过时长，恢复后续走（缺省走表） | `string` | — |
| `format` | 模板：`DD`/`D` 天、`HH`/`H` 时、`mm`/`m` 分、`ss`/`s` 秒、`SSS` 毫秒（含 SSS 时内部 50ms 刷新） | `string` | `HH:mm:ss` |
| `prefix` | 显示值前置文案 | — | — |
| `suffix` | 显示值后置文案 | — | — |
| `title` | 显示值上方标题（原生全局属性，渲染后吸收移除） | `string` | — |
| `value` | 倒计时总时长（毫秒） | `string` | `0` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 剩余显示值变化时节流派发，detail `{ value: 剩余毫秒 }` |
| `oas-finish` | 倒计时归零时派发一次 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `prefix` | 前置内容（分发时优先于 `prefix` 属性文本） |
| `suffix` | 后置内容（分发时优先于 `suffix` 属性文本） |
| `title` | 数值上方标题（分发时优先于 `title` 属性文本） |

模板含 `D`/`DD` 时小时按当天内计（0-23）；不含时天滚入小时（如 `25:01:01`）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 setter（property 赋值/方法调用必须晚于自定义元素定义）
  customElements.whenDefined('oas-countdown').then(() => {
    const el = document.getElementById('countdown-active')
    const toggle = document.getElementById('countdown-toggle')
    const reset = document.getElementById('countdown-reset')
    const eventEl = document.getElementById('countdown-event')
    const out = document.getElementById('countdown-output')
    eventEl?.addEventListener('oas-finish', () => {
      out.textContent = 'oas-finish: 倒计时结束'
    })
    toggle?.addEventListener('click', () => {
      if (!el) return
      const paused = el.getAttribute('active') === 'false'
      el.setAttribute('active', paused ? 'true' : 'false')
      toggle.textContent = paused ? '暂停' : '恢复'
    })
    reset?.addEventListener('click', () => {
      el?.reset()
    })
  })
})
</script>
