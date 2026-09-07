# DatePicker 日期选择器

日期选择器，支持 `date` / `daterange` / `month` / `monthrange` / `year` / `yearrange` / `datetime` / `datetimerange` / `week` / `quarter` 十种类型，键盘可操作，`Intl.DateTimeFormat` 格式化；触发器为输入框，可直接键入日期（失焦或回车提交，非法输入自动回退）。

## 基础选择

<DemoBlock title="基础用法（type=date）">
  <oas-date-picker value="2026-08-09" placeholder="请选择日期"></oas-date-picker>
</DemoBlock>

点击输入框展开日期面板，点击日期选中并关闭；也可直接键入 `2026-08-15`、`2026/8/15` 等形式后按 `Enter` / 失焦提交。

## 日期范围

<DemoBlock title="日期范围（type=daterange）">
  <oas-date-picker type="daterange" value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

双月网格，先选起点再选终点，提交 JSON 数组 `["start","end"]`；悬停可预览区间。每次起止落选都会派发 `oas-calendar-change`（见[事件](#事件)）。

## 月份与月份区间

<DemoBlock title="月份（type=month）">
  <oas-date-picker type="month" value="2026-08" placeholder="请选择月份"></oas-date-picker>
</DemoBlock>

<DemoBlock title="月份区间（type=monthrange）">
  <oas-date-picker type="monthrange" value='["2026-01","2026-06"]'></oas-date-picker>
</DemoBlock>

monthrange 值为 JSON 数组 `["yyyy-MM","yyyy-MM"]`，双年面板起止选月。

## 年份与年份区间

<DemoBlock title="年份（type=year）">
  <oas-date-picker type="year" value="2026" placeholder="请选择年份"></oas-date-picker>
</DemoBlock>

<DemoBlock title="年份区间（type=yearrange）">
  <oas-date-picker type="yearrange" value='["2024","2026"]'></oas-date-picker>
</DemoBlock>

年面板按 12 年一页翻动，值为 `yyyy`；yearrange 值为 JSON 数组 `["yyyy","yyyy"]`。

## 周与季度

<DemoBlock title="周（type=week，ISO 周值 yyyy-Wnn）">
  <oas-date-picker type="week" value="2026-W32" placeholder="请选择周"></oas-date-picker>
</DemoBlock>

<DemoBlock title="季度（type=quarter，值 yyyy-Qn）">
  <oas-date-picker type="quarter" value="2026-Q3" placeholder="请选择季度"></oas-date-picker>
</DemoBlock>

week 类型点击任一天即选中该天所在的整周（整行高亮 + 周号列）；quarter 面板为四格季度选择。

## 日期时间与时间范围

<DemoBlock title="日期时间（type=datetime）">
  <oas-date-picker type="datetime" value="2026-08-09T09:30:00"></oas-date-picker>
</DemoBlock>

<DemoBlock title="日期时间范围（type=datetimerange）">
  <oas-date-picker type="datetimerange" value='["2026-08-10T09:00:00","2026-08-20T18:00:00"]'></oas-date-picker>
</DemoBlock>

datetime 选日期与时分秒后点「确定」提交；datetimerange 双月 + 起止两组时间列，确定后提交 JSON 数组 `["yyyy-MM-ddTHH:mm:ss","yyyy-MM-ddTHH:mm:ss"]`。

## 禁用范围与导航边界

<DemoBlock title="min / max 限制">
  <oas-date-picker min="2026-08-01" max="2026-08-31" placeholder="仅可选 8 月"></oas-date-picker>
</DemoBlock>

越界日期不可选；同时翻页按钮到达 `min` / `max` 边界时置灰，不能再向外翻。

## 快捷预设

<DemoBlock title="快捷预设（shortcuts）">
  <oas-date-picker id="date-picker-shortcuts" value="2026-08-09"></oas-date-picker>
  <span id="date-picker-shortcuts-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`shortcuts`（property，`{ label, value }` 或 `{ label, getValue() }`），点击即应用并派发 `oas-change`、关闭面板。date / datetime / month / week / year / daterange / datetimerange / monthrange / yearrange 内置默认预设（标签走 locale）。

<DemoBlock title="预设侧栏（shortcuts-position=left）">
  <oas-date-picker type="daterange" shortcuts-position="left" placeholder="预设放左侧栏"></oas-date-picker>
</DemoBlock>

预设较多时可用 `shortcuts-position="left"` 将快捷栏改为面板左侧纵栏。

## 禁用日期

<DemoBlock title="禁用过去日期（disabled-date）">
  <oas-date-picker id="date-picker-disabled-date" value="2026-08-09"></oas-date-picker>
</DemoBlock>

`disabledDate`（property，`(date: Date) => boolean`）返回 true 的日期置灰不可选（点击与键盘导航均跳过）；与 `min` / `max` 叠加禁用。

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

format 支持 `yyyy`/`MM`/`dd`/`HH`/`mm`/`ss` token（week / quarter 为固定值格式）。

## 面板能力

<DemoBlock title="双月独立翻页（unlink-panels）">
  <oas-date-picker type="daterange" unlink-panels value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

范围面板默认双月联动翻页；`unlink-panels` 后左右两栏各自独立翻页（长区间跨年选择）。

<DemoBlock title="空值初始月锚定（default-value）">
  <oas-date-picker default-value="2026-08-15" placeholder="空值打开锚定到 2026 年 8 月"></oas-date-picker>
</DemoBlock>

无值时打开面板默认落在当前月；设置 `default-value` 后锚定到指定日期所在月（回显生日月份等场景）。

<DemoBlock title="周号列（show-week-number）与周起始覆写（first-day-of-week）">
  <oas-date-picker value="2026-08-09" show-week-number first-day-of-week="0"></oas-date-picker>
</DemoBlock>

`show-week-number` 显示 ISO 周号列（`type=week` 自带）；`first-day-of-week`（0-6，0=周日）覆写周起始，默认跟随 locale。

## 单元格渲染

<DemoBlock title="日历标记（oas-cell-render / template[slot=cell]）">
  <oas-date-picker id="date-picker-cell-render" value="2026-08-09">
    <template slot="cell">
      <span class="cell-dot"></span>
      <span data-cell-date></span>
    </template>
  </oas-date-picker>
</DemoBlock>

与 `oas-calendar` 同款双通道：`template[slot="cell"]` 克隆进每个日格（`[data-cell-date]` 自动绑定日期数字）；每个日格重建时派发 `oas-cell-render`，`detail: { date, element }`，宿主可追加徽标/价格等标记（监听须幂等）。

## 表单态

<DemoBlock title="尺寸（size）">
  <oas-date-picker size="small" value="2026-08-09"></oas-date-picker>
  <oas-date-picker size="medium" value="2026-08-09"></oas-date-picker>
  <oas-date-picker size="large" value="2026-08-09"></oas-date-picker>
</DemoBlock>

<DemoBlock title="校验态（status）与清除（clearable）">
  <oas-date-picker status="error" clearable value="2026-08-09" placeholder="error 态可清除"></oas-date-picker>
  <oas-date-picker status="warning" value="2026-08-09" placeholder="warning 态"></oas-date-picker>
  <oas-date-picker status="success" value="2026-08-09" placeholder="success 态"></oas-date-picker>
</DemoBlock>

`status=error` 联动 `aria-invalid`；`clearable` 在有值时显示清除钮，点击清空并派发 `oas-clear` + `oas-change`（空值）。

<DemoBlock title="只读（readonly）">
  <oas-date-picker readonly value="2026-08-09" placeholder="只读回显"></oas-date-picker>
</DemoBlock>

readonly 下面板可展开浏览、单元格可键盘导航，但点选 / 快捷 / 清除 / 手输均不提交。

## 受控与事件

<DemoBlock title="受控 + oas-change 事件">
  <oas-date-picker id="date-picker-event" value="2026-08-09"></oas-date-picker>
  <span id="date-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<button id="date-picker-set" type="button" style="margin-top: 12px">设为 2026-08-20</button>

<DemoBlock title="受控开合（open + oas-open-change）">
  <oas-date-picker id="date-picker-open" value="2026-08-09"></oas-date-picker>
  <button id="date-picker-open-toggle" type="button">展开 / 收起</button>
</DemoBlock>

`open` 属性在场为受控模式：手势只派发 `oas-open-change`，开合由宿主增删属性决定。

<DemoBlock title="起止分步提示（oas-calendar-change）">
  <oas-date-picker id="date-picker-calendar-change" type="daterange" default-value="2026-08-01"></oas-date-picker>
  <span id="date-picker-calendar-change-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

范围类型每次起止落选即派发 `oas-calendar-change`（`detail.value` 为 `[start, end|null]`），可做「已选起点」提示或动态换月。

## 禁用

<DemoBlock title="禁用（disabled）">
  <oas-date-picker disabled value="2026-08-09"></oas-date-picker>
</DemoBlock>

## 浮层定位（placement）

<DemoBlock title="右缘触发器（默认 bottom-start，自动翻转）">
  <oas-date-picker style="margin-left: auto; display: block; width: fit-content" value="2026-08-09" placeholder="贴右缘的单选"></oas-date-picker>
</DemoBlock>

<DemoBlock title="右缘宽面板（daterange 双月，自动翻转右对齐）">
  <oas-date-picker type="daterange" style="margin-left: auto; display: block; width: fit-content" placeholder="贴右缘的范围"></oas-date-picker>
</DemoBlock>

<DemoBlock title="显式 placement（top-end：上方弹出右对齐）">
  <oas-date-picker placement="top-end" value="2026-08-09" placeholder="placement=top-end"></oas-date-picker>
</DemoBlock>

<DemoBlock title="右缘宽面板（range 右对齐翻转）">
  <oas-date-picker type="daterange" style="margin-left: auto; display: block; width: fit-content" value='["2026-08-05","2026-08-15"]'></oas-date-picker>
</DemoBlock>

面板默认 `bottom-start`（面板左缘对齐触发器左缘）。触发器贴近视口右缘时自动右对齐翻转（`bottom-end`），右缘仍不足则水平夹取到视口内；下方空间不足时上翻（`top-start`/`top-end`）。`placement` 支持 12 向：`top / bottom / left / right` 各配 `-start` / `-end` 交叉轴对齐。

## 与 oas-calendar 的选择

弹层选择用 `oas-date-picker`（本组件，触发器 + 浮层面板）；筛选侧栏等常驻内嵌日历场景用 `oas-calendar`（纯面板形态，支持 `mode=year`、周号、单元格渲染等同族能力）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clearable` | 可清除：有值时显示清除钮，点击清空并派发 `oas-clear` + `oas-change`（空值） | `boolean` | — |
| `default-value` | 空值时面板初始锚点（如回显生日月份；有值时以值为锚） | `string` | — |
| `disabled` | 禁用 | `boolean` | — |
| `first-day-of-week` | 周起始覆写（0=周日 … 6=周六），默认跟随 locale | `string` | — |
| `format` | 展示格式 token（`yyyy`/`MM`/`dd`/`HH`/`mm`/`ss`；week/quarter 为固定值格式） | `string` | — |
| `max` | 可选范围（ISO 日期）；翻页到界时导航按钮置灰 | `string` | — |
| `min` | 可选范围（ISO 日期）；翻页到界时导航按钮置灰 | `string` | — |
| `multiple` | 多选（仅 `type=date`），值存 JSON 数组；该形态手输通道只读 | `boolean` | — |
| `open` | 受控开合：在场=展开、移除=收起；手势只派发 `oas-open-change` 由宿主回写 | — | — |
| `placeholder` | 占位提示 | — | — |
| `placement` | 浮层位置，12 向：`top`/`bottom`/`left`/`right` × `-start`/`-end`（默认 `bottom-start`）；触发器贴近视口右缘时自动右对齐翻转、下方空间不足时上翻，并夹取到视口内 | `string` | `bottom-start` |
| `readonly` | 只读：面板可展开浏览（单元格可键盘导航），点选/快捷/清除/手输均不提交 | `boolean` | — |
| `shortcuts-position` | 快捷预设位置：`bottom`（默认，顶部横排）/ `left`（左侧纵栏） | `string` | `bottom` |
| `show-week-number` | 显示 ISO 周号列（`type=week` 自带） | `boolean` | — |
| `size` | 尺寸档：`small` / `medium` / `large`（就近读取 config-provider 注入） | `string` | `medium` |
| `status` | 校验态：`success` / `warning` / `error`（`error` 联动 `aria-invalid`） | `string` | — |
| `type` | 类型：`date` / `daterange` / `month` / `monthrange` / `year` / `yearrange` / `datetime` / `datetimerange` / `week` / `quarter` | `string` | `date` |
| `unlink-panels` | 范围双月各自独立翻页（默认联动） | `boolean` | — |
| `value` | 当前值：`yyyy-MM-dd` / `yyyy-MM` / `yyyy` / `yyyy-Wnn` / `yyyy-Qn` / `yyyy-MM-ddTHH:mm:ss` / JSON 范围数组 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 组件整体失焦（组件内转移不误报） |
| `oas-calendar-change` | 范围类型起止落选即派发，`detail: { value: [start, end\|null] }`（宿主可做已选起点提示） |
| `oas-cell-render` | 日格重建时逐格派发，`detail: { date, element }`（标记点/徽标场景，监听须幂等） |
| `oas-change` | 值变化，`detail: { value }`（范围/multiple 为字符串数组） |
| `oas-clear` | 清除，`detail: { value }` 为清空前的值 |
| `oas-confirm` | datetime / datetimerange 点确定提交时派发（与 `oas-change` 并行），`detail: { value }` |
| `oas-focus` | 组件整体获焦 |
| `oas-open-change` | 开合变化，`detail: { open }`（受控/非受控均派发） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `cell` | `template[slot="cell"]` 克隆进每个日格，`[data-cell-date]` 自动绑定日期数字（与 `oas-cell-render` 双通道） |
| `template[slot="cell"]` | — |

### Property

- `shortcuts`：快捷预设

键盘：`Enter` / `↓` 展开，方向键 / `Home` / `End` / `PageUp` / `PageDown`（`Shift` 换年）在网格内移动，`Enter` 选中，`Esc` 关闭。

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

  // 受控开合（open + oas-open-change）
  const openEl = document.getElementById('date-picker-open')
  document.getElementById('date-picker-open-toggle')?.addEventListener('click', () => {
    if (openEl?.hasAttribute('open')) openEl.removeAttribute('open')
    else openEl?.setAttribute('open', '')
  })

  // 起止分步提示（oas-calendar-change）
  const cc = document.getElementById('date-picker-calendar-change')
  const ccOut = document.getElementById('date-picker-calendar-change-output')
  cc?.addEventListener('oas-calendar-change', (e) => {
    const [s, t] = e.detail.value
    ccOut.textContent = t ? `已选区间：${s} ~ ${t}` : `已选起点：${s}，请选择终点`
  })

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

  // 禁用过去日期（disabled-date 走 property）
  const dd = document.getElementById('date-picker-disabled-date')
  dd.disabledDate = (d) => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return d < t
  }

  // 单元格渲染：给固定几天加标记点（oas-cell-render 通道，幂等）
  const cr = document.getElementById('date-picker-cell-render')
  const marks = new Set(['2026-08-10', '2026-08-20', '2026-08-28'])
  cr?.addEventListener('oas-cell-render', (e) => {
    if (marks.has(e.detail.element.getAttribute('data-date'))) {
      e.detail.element.querySelector('.cell-dot')?.style.setProperty('background', 'var(--oas-color-danger)')
    }
  })
})
</script>
