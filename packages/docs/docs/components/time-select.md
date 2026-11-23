---
description: 配送时段选择：日期列（今日起 N 天）+ 时段网格，尽快送达 / 预约配送两模式，休息与满约两种不可选语义，JSON 数据属性与对象 property 双通道，日期与时段网格各自 roving tabindex 键盘导航。
---

# TimeSelect 配送时段选择

下单链路的时间选择件：左侧日期列（今日起 `days` 天），右侧时段网格；`mode="express"` 尽快送达（自动取首个可用时段），`mode="schedule"` 预约配送（手动选日期与时段）。值契约为 JSON 对象 `{ date, slot }`。

## 基础用法（尽快送达）

默认模式为「尽快送达」：组件自动取首个可用时段，宿主直接读 `value` 即可。时段数据由 `slots` 注入。

<DemoBlock title="默认尽快送达">
  <oas-time-select id="ts-express" slots='[{"key":"morning","label":"09:00–11:00"},{"key":"afternoon","label":"14:00–16:00"},{"key":"evening","label":"18:00–20:00"}]'></oas-time-select>
  <span id="ts-express-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">尚未选择</span>
</DemoBlock>

## 预约配送（选日期与时段）

`mode="schedule"` 显示日期列与时段网格。点击日期切换当日时段；不可配送的日期（当日全部时段休息或满约）置灰并从键盘导航中跳过。

<DemoBlock title="mode=&quot;schedule&quot;">
  <oas-time-select
    id="ts-schedule"
    mode="schedule"
    days="4"
    slots='[{"key":"morning","label":"09:00–11:00"},{"key":"afternoon","label":"14:00–16:00"},{"key":"evening","label":"18:00–20:00"}]'
  ></oas-time-select>
  <span id="ts-schedule-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">请选择日期与时段</span>
</DemoBlock>

## 休息与满约

两种不可选语义视觉可区分：**休息**（`disabled`）只置灰并标注「休息」；**满约**（`full`）额外加删除线并标注「已满约」。两者都带 `aria-disabled`，点击不改变值。

<DemoBlock title="休息 / 满约">
  <oas-time-select
    id="ts-states"
    mode="schedule"
    days="2"
    slots='[{"key":"a","label":"09:00–11:00"},{"key":"b","label":"11:00–13:00","disabled":true},{"key":"c","label":"14:00–16:00","full":true},{"key":"d","label":"16:00–18:00"},{"key":"e","label":"18:00–20:00","full":true}]'
  ></oas-time-select>
  <span id="ts-states-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 禁用

`disabled` 整组禁用：模式钮、日期、时段都不可操作。

<DemoBlock title="disabled">
  <oas-time-select
    mode="schedule"
    days="3"
    slots='[{"key":"a","label":"09:00–11:00"},{"key":"b","label":"14:00–16:00"}]'
    disabled
  ></oas-time-select>
</DemoBlock>

## 键盘与无障碍

- 日期列是 `role="tablist"`（垂直）内的 `role="tab"`，时段网格是 `role="radiogroup"` 内的 `role="radio"`，选中态分别为 `aria-selected` / `aria-checked`
- 两处各自 roving tabindex：同一时刻各只有一个 Tab 停靠点；方向键在可用项之间移动（跳过休息 / 满约 / 不可配送日），Home / End 到首末可用项，RTL 下左右方向镜像
- 日期文案走 `Intl.DateTimeFormat`（locale 感知），今天 / 明天用相对文案；网格的可访问名称 = 「配送时段 + 当前日期」

## 值契约

`value` 为 `{ date: 'YYYY-MM-DD', slot: 'key' }`：property 赋值对象、attribute 写 JSON 皆可，赋值即生效、不派发事件；用户切换模式 / 日期 / 时段才派发 `oas-change`。**尽快送达模式忽略宿主写入的 `value`**，恒取首个可用时段。

<DemoBlock title="事件与值">
  <oas-time-select
    id="ts-value"
    mode="schedule"
    days="3"
    slots='[{"key":"a","label":"09:00–11:00"},{"key":"b","label":"14:00–16:00"}]'
  ></oas-time-select>
  <span id="ts-value-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../.vitepress/theme/when-defined'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  // 「明天」的时段覆盖在脚本里注入（静态 md 无法计算日期键）
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const key = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  const schedule = document.getElementById('ts-schedule')

  onUpgraded(document.getElementById('ts-express'), () => {
    const el = document.getElementById('ts-express')
    text('ts-express-out', `当前值：${JSON.stringify(el.value)}`)
    el.addEventListener('oas-change', (event) => {
      text('ts-express-out', `oas-change：${JSON.stringify(event.detail.value)}（${event.detail.mode}）`)
    })
  })

  onUpgraded(schedule, () => {
    const el = document.getElementById('ts-schedule')
    el.setAttribute(
      'slots-override',
      JSON.stringify({
        [key]: [
          { key: 'afternoon', label: '14:00–16:00' },
          { key: 'evening', label: '18:00–20:00', full: true },
        ],
      }),
    )
    text('ts-schedule-out', `当前值：${JSON.stringify(el.value)}`)
    el.addEventListener('oas-change', (event) => {
      text('ts-schedule-out', `oas-change：${JSON.stringify(event.detail.value)}`)
    })
  })

  onUpgraded(document.getElementById('ts-states'), () => {
    const el = document.getElementById('ts-states')
    el.addEventListener('oas-change', (event) => {
      text('ts-states-out', `oas-change：${JSON.stringify(event.detail.value)}`)
    })
  })

  onUpgraded(document.getElementById('ts-value'), () => {
    const el = document.getElementById('ts-value')
    const out = () => text('ts-value-out', `当前值：${JSON.stringify(el.value)}`)
    el.addEventListener('oas-change', (event) => {
      text('ts-value-out', `oas-change：${JSON.stringify(event.detail.value)}`)
    })
    out()
  })
})
</script>

## API

### oas-time-select

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `days` | 日期列天数：今日起 N 天（缺省 3，合法范围 1–14；非法值回落默认并告警一次） | `number \| string` | — |
| `disabled` | 整体禁用：模式钮、日期与时段都不可操作 | `boolean` | — |
| `mode` | 配送模式：`express` 尽快送达（缺省，自动取首个可用时段）/ `schedule` 预约配送；非法值回落 `express` 并告警 | `string` | `express` |
| `slots` | 通用时段 JSON 数组 `[{ key, label, disabled?, full? }]`；字符串项按 `key=label` 收敛 | `string` | — |
| `slots-override` | 按日期覆盖的时段 JSON 对象 `{ "YYYY-MM-DD": [...] }`；命中的日期以覆盖值为准，空数组表示该日不可配送 | `string` | — |
| `start-date` | 起始日期 `YYYY-MM-DD`（缺省今天；供宿主指定发货日与固定时点） | `string` | — |
| `value` | 值 JSON 对象 `{ date, slot }`：`date` 为 `YYYY-MM-DD`，`slot` 为时段 key | `TimeSelectValue \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `days` | 日期列天数：get+set 双通道；赋值即生效，不派发事件 | `number \| string` | — |
| `value` | 当前值：get+set 双通道（对象或 JSON 字符串）；赋值即生效，不派发事件 | `TimeSelectValue \| string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 用户切换模式 / 日期 / 时段后派发，`detail: { value, mode, date, slot }` |
