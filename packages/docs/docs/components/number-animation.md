# NumberAnimation 数字滚动

数字从当前值缓动到目标值的动画组件，到目标值停止并派发 `oas-finish`；`prefers-reduced-motion` 时直接跳目标，断开连接自动取消 rAF 无泄漏。

## 基础用法

<DemoBlock title="默认 1500ms 从 0 滚到目标">
  <oas-number-animation value="9999"></oas-number-animation>
</DemoBlock>

## 速度与小数位

<DemoBlock title="duration=3000 + to-fixed=2">
  <oas-number-animation value="3.1415926" duration="3000" to-fixed="2"></oas-number-animation>
</DemoBlock>

## 结束事件

<DemoBlock title="oas-finish 回调">
  <oas-number-animation id="number-anim-event" value="88" duration="1200"></oas-number-animation>
  <span id="number-anim-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-left: var(--oas-space-3)"></span>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `duration` | 动画时长（毫秒）；0 直接跳目标 | `number \| string` | — |
| `to-fixed` | 小数位（Number.prototype.toFixed）；缺省整数显示 | — | — |
| `value` | 目标数值；非法按 0 | — | `0` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-finish` | 动画抵达目标时派发一次，detail `{ value: 目标值 }` |

- 动画中途修改 `value` 会从当前显示值续动到新目标。
- 系统开启「减少动态效果」时跳过动画直接显示目标值（同样派发 `oas-finish`）。
- 断开连接时取消未完成的 rAF，无泄漏。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('number-anim-event')
  const out = document.getElementById('number-anim-output')
  el?.addEventListener('oas-finish', (e) => {
    out.textContent = `oas-finish: ${e.detail.value}`
  })
})
</script>
