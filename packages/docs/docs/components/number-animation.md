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

## 起始值 from

`from` 指定新一轮起播的起始值（默认 0）；动画中途改 `value` 仍从当前显示值续动，不受 `from` 影响。

<DemoBlock title="from=500 起播">
  <oas-number-animation value="2000" from="500" duration="1500"></oas-number-animation>
</DemoBlock>

## 受控播放（active + play()）

`active` 控制播放：默认即播；`"false"` 停帧在当前值，改回 `"true"` 从当前值续动到目标。`play()` 手动重播一轮（从 `from` 起播，播放中防重入）——同值刷新数据时无需改 `value` 即可重播。滚动进入视口才播的场景可用 IntersectionObserver 喂 `active` 实现。块内第二个示例静态展示 `active="false"` 停帧态（停在起始值 6666）。

<DemoBlock title="active 暂停/恢复 + play() 重播">
  <oas-number-animation id="num-anim-active" value="8888" from="0" duration="1500"></oas-number-animation>
  <oas-number-animation value="8888" from="6666" active="false" duration="1500"></oas-number-animation>
  <oas-button id="num-anim-toggle" size="sm">暂停</oas-button>
  <oas-button id="num-anim-play" size="sm">重播</oas-button>
</DemoBlock>

## 缓动档 easing

`easing` 四档枚举：`ease-out`（默认，先快后慢）/ `linear`（匀速，下载字节等场景）/ `ease-in` / `ease-in-out` / `spring`（轻度过冲回弹）；非法值回落 `ease-out`。

<DemoBlock title="easing 四档对比">
  <oas-number-animation value="1000" duration="1200" easing="linear"></oas-number-animation>
  <oas-number-animation value="1000" duration="1200" easing="ease-out"></oas-number-animation>
  <oas-number-animation value="1000" duration="1200" easing="ease-in-out"></oas-number-animation>
  <oas-number-animation value="1000" duration="1200" easing="spring"></oas-number-animation>
</DemoBlock>

## 千分位

`group-separator="true"` 按 locale 千分位格式化动画值（Intl.NumberFormat，config-provider / setLocale 感知；格式化器按 locale|小数位缓存，每帧零构造开销）。

<DemoBlock title="group-separator 千分位">
  <oas-number-animation value="1234567" duration="1500" group-separator="true"></oas-number-animation>
  <oas-number-animation value="98765.432" duration="1500" to-fixed="2" group-separator="true"></oas-number-animation>
</DemoBlock>

## 结束事件

<DemoBlock title="oas-finish 回调">
  <oas-number-animation id="number-anim-event" value="88" duration="1200"></oas-number-animation>
  <span id="number-anim-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-left: var(--oas-space-3)"></span>
</DemoBlock>

## 字号定制

字号默认固定为 `--oas-font-size-lg`（16px，不随外层变化），可用 CSS 变量 `--oas-number-animation-font` 显式定制（如 `32px`）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active` | 受控播放：缺省即播；`"false"` 停帧，改回 `"true"` 从当前值续动到目标 | `string` | — |
| `duration` | 动画时长（毫秒）；0 直接跳目标 | `number \| string` | — |
| `easing` | 缓动档：`ease-out`（默认）/ `linear` / `ease-in` / `ease-in-out` / `spring`（轻度过冲）；非法值回落 `ease-out` | `string` | `ease-out` |
| `from` | 起始值（默认 0）；仅新一轮起播生效，续动不受影响 | `string` | `0` |
| `group-separator` | 千分位分组（`"true"` 开启，Intl locale 感知；默认关闭） | `string` | — |
| `to-fixed` | 小数位（Number.prototype.toFixed）；缺省整数显示 | `string` | — |
| `value` | 目标数值；非法按 0 | `string` | `0` |

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
  // whenDefined 防升级前 expando 遮蔽 setter（property 赋值/方法调用必须晚于自定义元素定义）
  customElements.whenDefined('oas-number-animation').then(() => {
    const el = document.getElementById('num-anim-active')
    const toggle = document.getElementById('num-anim-toggle')
    const play = document.getElementById('num-anim-play')
    const eventEl = document.getElementById('number-anim-event')
    const out = document.getElementById('number-anim-output')
    eventEl?.addEventListener('oas-finish', (e) => {
      out.textContent = `oas-finish: ${e.detail.value}`
    })
    toggle?.addEventListener('click', () => {
      if (!el) return
      const paused = el.getAttribute('active') === 'false'
      el.setAttribute('active', paused ? 'true' : 'false')
      toggle.textContent = paused ? '暂停' : '恢复'
    })
    play?.addEventListener('click', () => {
      el?.play()
    })
  })
})
</script>
