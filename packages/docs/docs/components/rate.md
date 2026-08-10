# Rate 评分

星级评分，支持键盘方向键调节，默认点击已选中的同一颗星可清空。

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

## 点击清空

<DemoBlock title="点击清空（allow-clear）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate id="rate-clear" value="3"></oas-rate>
    <span id="rate-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
  </div>
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); margin-top: var(--oas-space-2); flex-wrap: wrap;">
    <oas-rate value="4" allow-clear="false"></oas-rate>
    <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">allow-clear="false"：点已选中的星不清空</span>
  </div>
</DemoBlock>

`allow-clear` 默认开启，再次点击当前已选中的同一颗星会清空为 `0` 并派发 `oas-change`（`detail: { value: 0 }`）；设为 `"false"` 后点击不清空。

## 自定义图标

<DemoBlock title="自定义图标（icon 属性）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate icon="♥" value="3"></oas-rate>
    <oas-rate icon="☕" value="2"></oas-rate>
    <oas-rate icon="⚡" value="5"></oas-rate>
  </div>
</DemoBlock>

通过 `icon` 属性传入字符或 SVG 标记即可替换星星图标：

<DemoBlock title="自定义图标（icon 属性 · SVG）">
  <oas-rate icon="<svg viewBox='0 0 16 16' width='20' height='20' aria-hidden='true' focusable='false'><path d='M8 1 L9.6 5.2 L14 5.8 L10.9 8.8 L11.8 13.2 L8 11 L4.2 13.2 L5.1 8.8 L2 5.8 L6.4 5.2 Z' fill='currentColor'/></svg>" value="4"></oas-rate>
</DemoBlock>

## 自定义图标（slot）

<DemoBlock title="自定义图标（slot）">
  <div style="display: flex; align-items: center; gap: var(--oas-space-3); flex-wrap: wrap;">
    <oas-rate value="4">
      <span slot="icon">★</span>
    </oas-rate>
    <oas-rate value="2">
      <svg slot="icon" viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 2 L10 6.2 L14.5 6.8 L11.2 9.9 L12.2 14.4 L8 12.2 L3.8 14.4 L4.8 9.9 L1.5 6.8 L6 6.2 Z" fill="currentColor"/></svg>
    </oas-rate>
  </div>
</DemoBlock>

通过 `slot="icon"` 传入任意元素，会克隆到每一颗星上。优先级：`icon` 属性 > `slot="icon"` > 默认星形。

## 禁用

<DemoBlock title="禁用">
  <oas-rate value="4" disabled></oas-rate>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-rate id="rate-event" value="2"></oas-rate>
  <span id="rate-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

监听 `oas-change`（点击、清空或键盘调节，`detail: { value }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('rate-event')
  const out = document.getElementById('rate-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })

  const clearEl = document.getElementById('rate-clear')
  const clearOut = document.getElementById('rate-clear-output')
  clearEl?.addEventListener('oas-change', (e) => {
    clearOut.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `allow-clear` | 点击已选中的同一颗星时清空为 `0` | — | `true` |
| `allow-half` | 允许半星 | — | — |
| `disabled` | 禁用 | — | — |
| `icon` | 自定义星星图标（字符或 SVG 标记） | — | — |
| `max` | 星星数量 | — | `5` |
| `value` | 当前分值（受控） | — | `0` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 分值变化，`detail: { value }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `icon` | — |

图标自定义：`icon` 属性 > `slot="icon"`（克隆到每颗星）> 默认星形。

键盘：`←`/`→`（或 `↑`/`↓`）增减，`Home` 归零，`End` 打满。
