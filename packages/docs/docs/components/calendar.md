# Calendar 日历

日历组件，月/年两种模式，支持选中、禁用日期、周号与键盘网格导航；日期描述走 `Intl.DateTimeFormat`（locale 感知）。

## 基础用法

<DemoBlock title="月视图（mode=month）">
  <oas-calendar value="2026-08-09"></oas-calendar>
</DemoBlock>

点击日期选中并派发 `oas-change`；标题可点开月选择面板快速跳月。

## 年视图

<DemoBlock title="年视图（mode=year）">
  <oas-calendar mode="year" value="2026-07"></oas-calendar>
</DemoBlock>

年模式选中月份派发 `yyyy-MM`。

## 禁用范围

<DemoBlock title="min / max 限制">
  <oas-calendar value="2026-08-09" min="2026-08-01" max="2026-08-31"></oas-calendar>
</DemoBlock>

## 禁用回调

<DemoBlock title="disabled-date（禁用周末）">
  <oas-calendar id="calendar-disabled-date" value="2026-08-09"></oas-calendar>
</DemoBlock>

`disabledDate` 走 property 传入回调（JSON 无法表达函数）。

## 周号

<DemoBlock title="显示周号（show-week-number）">
  <oas-calendar value="2026-08-09" show-week-number></oas-calendar>
</DemoBlock>

## 事件

<DemoBlock title="oas-change 事件">
  <oas-calendar id="calendar-event" value="2026-08-09"></oas-calendar>
  <span id="calendar-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabledDate` | 禁用回调（property） | `((d: Date) => boolean) \| null` | — |
| `max` | 可选范围（ISO 日期） | `string` | — |
| `min` | 可选范围（ISO 日期） | `string` | — |
| `mode` | `month` / `year` | `string` | `month` |
| `show-week-number` | 显示 ISO 周号列 | `boolean` | — |
| `value` | 选中值（ISO） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选中变化，`detail: { value }` |

键盘：`↑`/`↓`/`←`/`→` 在网格内移动，`Enter` 选中。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('calendar-disabled-date')
  el.disabledDate = (d) => d.getDay() === 0 || d.getDay() === 6
  const ev = document.getElementById('calendar-event')
  const out = document.getElementById('calendar-output')
  ev?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>
