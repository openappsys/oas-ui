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

## 自定义单元格

<DemoBlock title="事件标记日历（oas-cell-render 标记节假日）">
  <oas-calendar id="calendar-cell-render" value="2026-08-09"></oas-calendar>
</DemoBlock>

每个日单元格渲染时派发 `oas-cell-render`（`detail: { date, element }`），宿主可在单元格内追加标记/徽标/富文本（如节假日、事件点）；也可在组件内放 `<template slot="cell">` 提供静态骨架，`[data-cell-date]` 节点自动绑定日期数字。`element` 内追加 `<span class="cell-dot">` 即显示内置标记点（`--oas-color-danger` token，明暗主题自适应）。

## 模式切换

<DemoBlock title="模式切换（month ↔ year 快速跳年）">
  <div style="display:flex;gap:var(--oas-space-1);margin-bottom:var(--oas-space-2)">
    <oas-button id="calendar-mode-month" size="small">月视图</oas-button>
    <oas-button id="calendar-mode-year" size="small">年视图</oas-button>
  </div>
  <oas-calendar id="calendar-mode" value="2026-08-09"></oas-calendar>
  <span id="calendar-mode-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`mode="year"` 显示 12 个月网格，标题栏「上一年/下一年」按钮快速切换年份；点击月份选中（派发 `oas-change`，value 为 `yyyy-MM`）并自动切回月视图（派发 `oas-mode-change`）。受控场景监听 `oas-mode-change` 后重新设置 `mode` 属性即可保持指定模式。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabledDate` | 禁用回调（property） | `((d: Date) => boolean) \| null` | — |
| `max` | 可选范围（ISO 日期） | `string` | — |
| `min` | 可选范围（ISO 日期） | `string` | — |
| `mode` | `month` / `year`（年模式选中月份后自动切回月视图） | `string` | `month` |
| `show-week-number` | 显示 ISO 周号列 | `boolean` | — |
| `value` | 选中值（ISO） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cell-render` | 每个日单元格渲染时派发，`detail: { date, element }`（element 为日按钮，宿主可追加标记/徽标/富文本） |
| `oas-change` | 选中变化，`detail: { value }` |
| `oas-mode-change` | 年模式选中月份自动切回月视图时派发，`detail: { mode }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="cell"]` | 日单元格静态模板，克隆到每个日按钮；`[data-cell-date]` 节点自动绑定日期数字 |

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

  // 自定义单元格：标记节假日（建军节 8-01、8-15）
  const cell = document.getElementById('calendar-cell-render')
  cell?.addEventListener('oas-cell-render', (e) => {
    const { date, element } = e.detail
    const holiday = date.getMonth() === 7 && (date.getDate() === 1 || date.getDate() === 15)
    element.classList.toggle('holiday', holiday)
    if (holiday && !element.querySelector('.cell-dot')) {
      const dot = document.createElement('span')
      dot.className = 'cell-dot'
      dot.setAttribute('role', 'img')
      dot.setAttribute('aria-label', '节日')
      element.appendChild(dot)
    }
  })

  // 模式切换：month ↔ year，显示当前模式与选中反馈
  // 年模式选月切回月视图时 oas-mode-change 与 oas-change 同帧先后派发，
  // 反馈文本追加写入（覆盖会吞掉前一个事件，用户看不到完整事件序列）
  const modeCal = document.getElementById('calendar-mode')
  const modeOut = document.getElementById('calendar-mode-output')
  const setMode = (m) => modeCal?.setAttribute('mode', m)
  const appendOut = (text) => {
    modeOut.textContent = `${modeOut.textContent}${modeOut.textContent ? ' · ' : ''}${text}`
  }
  document.getElementById('calendar-mode-month')?.addEventListener('click', () => setMode('month'))
  document.getElementById('calendar-mode-year')?.addEventListener('click', () => setMode('year'))
  modeCal?.addEventListener('oas-mode-change', (e) => {
    appendOut(`oas-mode-change: ${e.detail.mode}`)
  })
  modeCal?.addEventListener('oas-change', (e) => {
    appendOut(`oas-change: ${e.detail.value}`)
  })
})
</script>
