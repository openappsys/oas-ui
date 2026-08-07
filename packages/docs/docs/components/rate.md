# Rate 评分

星级评分，支持键盘方向键调节。

## 基础用法

<DemoBlock title="基础用法">
  <oas-rate value="3"></oas-rate>
</DemoBlock>

## 自定义数量

<DemoBlock title="max">
  <oas-rate value="7" max="10"></oas-rate>
</DemoBlock>

通过 `max` 设置星星数量。

## 半选

<DemoBlock title="半选（allow-half）">
  <oas-rate value="3.5" allow-half></oas-rate>
</DemoBlock>

`allow-half` 允许通过 `value` 表达半星；点击仍按整星递增。

## 禁用

<DemoBlock title="禁用">
  <oas-rate value="4" disabled></oas-rate>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-rate id="rate-event" value="2"></oas-rate>
  <span id="rate-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

监听 `oas-change`（点击或键盘调节，`detail: { value }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('rate-event')
  const out = document.getElementById('rate-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 当前分值（受控） | `0` |
| `max` | 星星数量 | `5` |
| `allow-half` | 允许半星 | `false` |
| `disabled` | 禁用 | `false` |

键盘：`←`/`→`（或 `↑`/`↓`）增减，`Home` 归零，`End` 打满。

| 事件 | 说明 |
|---|---|
| `oas-change` | 分值变化，`detail: { value }` |
