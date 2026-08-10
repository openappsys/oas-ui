# TimePicker 时间选择器

时间选择器，下拉时分列选择，`↑`/`↓` 调整、`Enter` 确认、`Esc` 取消，支持步进间隔。

## 基础用法

<DemoBlock title="基础用法">
  <oas-time-picker value="09:05:30"></oas-time-picker>
</DemoBlock>

## 自定义格式

<DemoBlock title="format 裁剪列">
  <oas-time-picker value="09:05:30" format="HH:mm"></oas-time-picker>
  <oas-time-picker value="09:05:30" format="HH:mm:ss"></oas-time-picker>
</DemoBlock>

format 含 `HH`/`mm`/`ss` 时对应列才出现。

## 步进

<DemoBlock title="step 分钟间隔">
  <oas-time-picker value="09:15:00" step="15"></oas-time-picker>
</DemoBlock>

分钟列按 `step` 步进（如 0、15、30、45）。

## 事件

<DemoBlock title="oas-change 事件">
  <oas-time-picker id="time-picker-event" value="10:00:00"></oas-time-picker>
  <span id="time-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 禁用

<DemoBlock title="禁用">
  <oas-time-picker disabled value="09:05:30"></oas-time-picker>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | — | — |
| `format` | 展示格式 token | — | `HH:mm:ss` |
| `step` | 分钟步进间隔 | — | `1` |
| `value` | 当前值（`HH:mm:ss`） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 确认值变化，`detail: { value }` |

键盘：`Enter` / `↓` 展开，`↑`/`↓` 调整当前列，`←`/`→` 切换列，`Enter` 确认，`Esc` 取消。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('time-picker-event')
  const out = document.getElementById('time-picker-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>
