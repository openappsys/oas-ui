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

## 周起始覆写

<DemoBlock title="周起始覆写（first-day-of-week）">
  <oas-calendar value="2026-08-09" first-day-of-week="0"></oas-calendar>
</DemoBlock>

`first-day-of-week` 取值 `0`（周日）～`6`（周六），缺省随 locale（中文语言系周一起始，其余周日）。

## 面板月锚点

<DemoBlock title="page-show-date 锚定面板月 + oas-panel-change">
  <oas-calendar id="calendar-page" value="1980-05-03" page-show-date="2026-08"></oas-calendar>
  <span id="calendar-page-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`page-show-date` 把面板初始/受控锚定到指定月份——即使 `value` 在别的年份（如回显出生日期时希望从当月打开）；其优先级高于 value。用户翻页/选月/跳月时派发 `oas-panel-change`（`detail: { date }`）；移除属性后面板回到 value 所在月。

## 边界翻页

<DemoBlock title="min / max 翻页边界">
  <oas-calendar value="2026-06-15" min="2026-06-01" max="2026-09-30"></oas-calendar>
</DemoBlock>

翻页会跨出 `[min, max]` 的整月/整年（月面板为整年、十年面板为整十年页）时，「上一月/下一月」按钮自动置灰。

## 只读日历

<DemoBlock title="readonly：详情页只读 + 事件点">
  <oas-calendar id="calendar-readonly" value="2026-08-09" readonly></oas-calendar>
</DemoBlock>

`readonly` 下可翻页浏览、可进入月/十年面板钻取，但点选与键盘 `Enter` 不提交——配合 `oas-cell-render` 标记事件点，即「可看不可改」的详情日历。

## 全局禁用

<DemoBlock title="disabled：整体不可交互">
  <oas-calendar value="2026-08-09" disabled></oas-calendar>
</DemoBlock>

`disabled` 整体置灰并停止全部交互（点选/翻页/键盘），配合表单禁用场景；`readonly` 仍允许浏览。

## 键盘与快速跳年

<DemoBlock title="扩展键盘 + decade 快速跳远年">
  <oas-calendar value="2026-08-09"></oas-calendar>
</DemoBlock>

- 键盘：`Home`/`End` 跳周首/周尾；`PageUp`/`PageDown` 翻上/下一月，`Shift` 同键翻年；方向键逐格移动，`Enter`/`Space` 选中。
- 快速跳远年：点标题进入月面板，再点年份进入十年网格（按 ±12 年翻页），选年回到该年的月面板、选月回到日视图——从 2026 跳到 1980 只需点 4 次。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 整体禁用：置灰并停止全部交互（点选/翻页/键盘） | `boolean` | — |
| `disabledDate` | 禁用回调（property） | `((d: Date) => boolean) \| null` | — |
| `first-day-of-week` | 周起始覆写：`0`（周日）～`6`（周六）；缺省随 locale（中文周一、其余周日） | `string` | — |
| `max` | 可选范围（ISO 日期）；翻页到整月越界时导航钮自动置灰 | `string` | — |
| `min` | 可选范围（ISO 日期）；翻页到整月越界时导航钮自动置灰 | `string` | — |
| `mode` | `month` / `year`（年模式选中月份后自动切回月视图） | `string` | `month` |
| `page-show-date` | 面板月锚点（ISO `yyyy-MM` 或 `yyyy-MM-dd`）：初始/受控锚定显示的月份，优先级高于 value；移除后回到 value 所在月 | `string` | — |
| `readonly` | 只读：可翻页浏览/钻取面板，点选与键盘 Enter 不提交 | `boolean` | — |
| `show-week-number` | 显示 ISO 周号列 | `boolean` | — |
| `value` | 选中值（ISO） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cell-render` | 每个日单元格渲染时派发，`detail: { date, element }`（element 为日按钮，宿主可追加标记/徽标/富文本） |
| `oas-change` | 选中变化，`detail: { value }` |
| `oas-mode-change` | 年模式选中月份自动切回月视图时派发，`detail: { mode }` |
| `oas-panel-change` | 用户翻页/选月/跳月使面板所在月份变化时派发，`detail: { date }`（date 为变化后面板首日） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="cell"]` | 日单元格静态模板，克隆到每个日按钮；`[data-cell-date]` 节点自动绑定日期数字 |

键盘：`↑`/`↓`/`←`/`→` 在网格内移动（跨月自动翻页），`Home`/`End` 跳周首/周尾，`PageUp`/`PageDown` 翻上/下一月（`Shift` 翻年），`Enter`/`Space` 选中。

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

  // 面板月锚点：显示当前面板（标题读 shadow 内节点），翻页/选月后同步
  const pageCal = document.getElementById('calendar-page')
  const pageOut = document.getElementById('calendar-page-output')
  const syncPage = () => {
    const t = pageCal?.shadowRoot?.querySelector('[part="title"]')?.textContent ?? ''
    if (pageOut) pageOut.textContent = `当前面板：${t}`
  }
  pageCal?.addEventListener('oas-panel-change', (e) => {
    syncPage()
    pageOut.textContent = `${pageOut.textContent}（oas-panel-change: ${e.detail.date}）`
  })
  syncPage()

  // 只读详情日历：标记纪念日（8-08、8-18）
  const ro = document.getElementById('calendar-readonly')
  ro?.addEventListener('oas-cell-render', (e) => {
    const { date, element } = e.detail
    const mark = date.getMonth() === 7 && (date.getDate() === 8 || date.getDate() === 18)
    if (mark && !element.querySelector('.cell-dot')) {
      const dot = document.createElement('span')
      dot.className = 'cell-dot'
      dot.setAttribute('role', 'img')
      dot.setAttribute('aria-label', '纪念日')
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
