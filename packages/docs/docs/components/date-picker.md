# DatePicker 日期选择器

日期选择器，支持单日期、日期范围、月份与日期时间四种类型，键盘可操作，`Intl.DateTimeFormat` 格式化。

## 基础选择

<DemoBlock title="基础用法（type=date）">
  <oas-date-picker value="2026-08-09" placeholder="请选择日期"></oas-date-picker>
</DemoBlock>

点击输入框展开日期面板，点击日期选中并关闭。

## 日期范围

<DemoBlock title="日期范围（type=daterange）">
  <oas-date-picker type="daterange" value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

双月网格，先选起点再选终点，提交 JSON 数组 `["start","end"]`；悬停可预览区间。

## 月份选择

<DemoBlock title="月份（type=month）">
  <oas-date-picker type="month" value="2026-08" placeholder="请选择月份"></oas-date-picker>
</DemoBlock>

## 日期时间

<DemoBlock title="日期时间（type=datetime）">
  <oas-date-picker type="datetime" value="2026-08-09T09:30:00"></oas-date-picker>
</DemoBlock>

选择日期与时分秒后点击「确定」提交。

## 禁用范围

<DemoBlock title="min / max 限制">
  <oas-date-picker min="2026-08-01" max="2026-08-31" placeholder="仅可选 8 月"></oas-date-picker>
</DemoBlock>

越界日期不可选。

## 快捷预设

<DemoBlock title="快捷预设（shortcuts）">
  <oas-date-picker id="date-picker-shortcuts" value="2026-08-09"></oas-date-picker>
  <span id="date-picker-shortcuts-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`shortcuts`（property，`{ label, value }` 或 `{ label, getValue() }`），点击即应用并派发 `oas-change`、关闭面板。

## 范围快捷预设

<DemoBlock title="范围快捷预设（shortcuts + daterange）">
  <oas-date-picker id="date-picker-range-shortcuts" type="daterange"></oas-date-picker>
  <span id="date-picker-range-shortcuts-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

daterange 内置「今天 / 本周 / 本月 / 今年」预设；自定义时 `value: [start, end]` 或 `getValue()` 返回 `[Date, Date]`。

## 禁用日期

<DemoBlock title="禁用过去日期（disabled-date）">
  <oas-date-picker id="date-picker-disabled-date" value="2026-08-09"></oas-date-picker>
</DemoBlock>

`disabledDate`（property，`(date: Date) => boolean`）返回 true 的日期置灰不可选（点击与键盘导航均跳过）。

## 多选

<DemoBlock title="多选（multiple）">
  <oas-date-picker multiple value='["2026-08-09","2026-08-11"]'></oas-date-picker>
</DemoBlock>

`multiple` 时连续点选日期累加/取消，面板保持打开；值存 JSON 数组 `["yyyy-MM-dd", ...]`。

## 自定义格式

<DemoBlock title="format 自定义">
  <oas-date-picker value="2026-08-09" format="yyyy/MM/dd"></oas-date-picker>
  <oas-date-picker value="2026-08-09" format="MM月dd日 yyyy"></oas-date-picker>
</DemoBlock>

format 支持 `yyyy`/`MM`/`dd`/`HH`/`mm`/`ss` token。

## 受控与事件

<DemoBlock title="受控 + oas-change 事件">
  <oas-date-picker id="date-picker-event" value="2026-08-09"></oas-date-picker>
  <span id="date-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<button id="date-picker-set" type="button" style="margin-top: 12px">设为 2026-08-20</button>

## 禁用

<DemoBlock title="禁用（disabled）">
  <oas-date-picker disabled value="2026-08-09"></oas-date-picker>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `format` | 展示格式 token（`yyyy`/`MM`/`dd`/`HH`/`mm`/`ss`） | `string` | — |
| `max` | 可选范围（ISO 日期） | `string` | — |
| `min` | 可选范围（ISO 日期） | `string` | — |
| `multiple` | 多选（仅 `type=date`），值存 JSON 数组 | `boolean` | — |
| `placeholder` | 占位提示 | — | — |
| `type` | 类型：`date` / `daterange` / `month` / `datetime` | `string` | `date` |
| `value` | 当前值：`yyyy-MM-dd` / `yyyy-MM` / `yyyy-MM-ddTHH:mm:ss` / JSON 范围数组 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 值变化，`detail: { value }`（daterange 为字符串数组；multiple 为字符串数组） |

### Property

- `shortcuts`：快捷预设（对象数组走 property，`{ label, value }` 或 `{ label, getValue() }`）；未设置时内置默认预设（标签走 locale）
- `disabledDate`：禁用日期回调，返回 `true` 的日期不可选（点击与键盘导航均跳过）

键盘：`Enter` / `↓` 展开，`↑`/`↓`/`←`/`→` 在网格内移动，`Enter` 选中，`Esc` 关闭。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('date-picker-event')
  const out = document.getElementById('date-picker-output')
  const setBtn = document.getElementById('date-picker-set')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  setBtn?.addEventListener('click', () => el?.setAttribute('value', '2026-08-20'))

  // 快捷预设（date）：静态 value + 动态 getValue
  const sc = document.getElementById('date-picker-shortcuts')
  const scOut = document.getElementById('date-picker-shortcuts-output')
  sc?.addEventListener('oas-change', (e) => {
    scOut.textContent = `oas-change: ${e.detail.value}`
  })
  sc.shortcuts = [
    { label: '今天', getValue: () => new Date() },
    {
      label: '明天',
      getValue: () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        return d
      },
    },
    { label: '固定 2026-08-10', value: '2026-08-10' },
  ]

  // 范围快捷预设（daterange）
  const rsc = document.getElementById('date-picker-range-shortcuts')
  const rscOut = document.getElementById('date-picker-range-shortcuts-output')
  rsc?.addEventListener('oas-change', (e) => {
    rscOut.textContent = `oas-change: [${e.detail.value[0]}, ${e.detail.value[1]}]`
  })
  rsc.shortcuts = [
    {
      label: '最近 7 天',
      getValue: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 6)
        return [start, end]
      },
    },
    {
      label: '本月',
      getValue: () => {
        const n = new Date()
        return [new Date(n.getFullYear(), n.getMonth(), 1), n]
      },
    },
    { label: '8 月', value: ['2026-08-01', '2026-08-31'] },
  ]

  // 禁用过去日期（disabled-date 走 property）
  const dd = document.getElementById('date-picker-disabled-date')
  dd.disabledDate = (d) => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return d < t
  }
})
</script>
