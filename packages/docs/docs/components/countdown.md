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

## 结束回调

<DemoBlock title="oas-finish 事件">
  <oas-countdown id="countdown-event" value="3000"></oas-countdown>
  <span id="countdown-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `format` | 模板：`DD`/`D` 天、`HH`/`H` 时、`mm`/`m` 分、`ss`/`s` 秒 | — | `HH:mm:ss` |
| `value` | 倒计时总时长（毫秒） | — | `0` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-finish` | 倒计时归零时派发一次 |

模板含 `D`/`DD` 时小时按当天内计（0-23）；不含时天滚入小时（如 `25:01:01`）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('countdown-event')
  const out = document.getElementById('countdown-output')
  el?.addEventListener('oas-finish', () => {
    out.textContent = 'oas-finish: 倒计时结束'
  })
})
</script>
