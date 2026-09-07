# TimePicker 时间选择器

时间选择器，下拉时分秒列选择（12 小时制时附上午/下午列），`↑`/`↓` 调整、`Home`/`End` 跳首末、`Enter` 确认、`Esc` 取消，支持三元步进与禁用时刻；触发器为输入框，可直接键入时刻（失焦或回车提交，非法输入自动回退）。

## 基础用法

<DemoBlock title="基础用法">
  <oas-time-picker value="09:05:30"></oas-time-picker>
</DemoBlock>

## 手动输入

<DemoBlock title="键入时刻（失焦 / 回车提交）">
  <oas-time-picker placeholder="键入 14:30 试试"></oas-time-picker>
</DemoBlock>

整段输入按 `H:mm[:ss]` 解析（容错单位数，如 `9:5`）；12 小时制下可带上午/下午词。非法输入失焦后自动回退，不破坏当前值。

## 自定义格式

<DemoBlock title="format 裁剪列">
  <oas-time-picker value="09:05:30" format="HH:mm"></oas-time-picker>
  <oas-time-picker value="09:05:30" format="HH:mm:ss"></oas-time-picker>
</DemoBlock>

format 含 `HH`/`mm`/`ss` 时对应列才出现。

## 12 小时制

<DemoBlock title="use12-hours（值恒为 24 小时制）">
  <oas-time-picker value="15:30:00" use12-hours></oas-time-picker>
</DemoBlock>

显示与列走 12 小时制（上午/下午词随 locale），第四列为上午/下午切换；`value` 契约不变，恒为 `HH:mm:ss` 24 小时制。

## 步进

<DemoBlock title="step 分钟间隔（单数字向后兼容）">
  <oas-time-picker value="09:15:00" step="15"></oas-time-picker>
</DemoBlock>

<DemoBlock title="step JSON 三元组（时/分/秒独立步进）">
  <oas-time-picker value="09:00:00" step='{"h":2,"m":10}'></oas-time-picker>
</DemoBlock>

`step` 支持 JSON 形态 `{"h":2,"m":5,"s":1}` 分别控制时/分/秒列步进；单数字继续等价于分钟步进。值不在步进集合时列内就近吸附显示，不主动改值。

## 禁用时刻

<DemoBlock title="disabledTime（置灰不隐藏）">
  <oas-time-picker id="time-picker-disabled-time" value="12:00:00"></oas-time-picker>
</DemoBlock>

`disabledTime`（property，`(parts) => { hours?, minutes?, seconds? }`）按当前时刻上下文返回禁用列表，禁用项置灰不可选（点击与键盘均跳过，不隐藏）。

## 此刻与快捷预设

<DemoBlock title="此刻按钮（footer）">
  <oas-time-picker placeholder="点开面板选「此刻」"></oas-time-picker>
</DemoBlock>

面板底部内置「此刻」按钮，一键填入当前时刻并确认（与 date-picker「今天」心智对齐）。

<DemoBlock title="presets 快捷时刻（property）">
  <oas-time-picker id="time-picker-presets" value="10:00:00"></oas-time-picker>
</DemoBlock>

`presets`（property，`{ label, value: 'HH:mm:ss' }` 数组），面板顶部按钮列，点击即应用并关闭。

## 时间范围

<DemoBlock title="is-range（起止双列组，自动排序）">
  <oas-time-picker is-range value='["09:00:00","11:00:00"]'></oas-time-picker>
</DemoBlock>

`is-range` 时值为 JSON 数组 `["HH:mm:ss","HH:mm:ss"]`；起止各自独立选择（`←`/`→` 跨列移动），确认时起止自动排序。

## 表单态

<DemoBlock title="尺寸（size）">
  <oas-time-picker size="small" value="09:05:30"></oas-time-picker>
  <oas-time-picker size="medium" value="09:05:30"></oas-time-picker>
  <oas-time-picker size="large" value="09:05:30"></oas-time-picker>
</DemoBlock>

<DemoBlock title="校验态（status）与清除（clearable）">
  <oas-time-picker status="error" clearable value="09:05:30" placeholder="error 态可清除"></oas-time-picker>
  <oas-time-picker status="warning" value="09:05:30" placeholder="warning 态"></oas-time-picker>
</DemoBlock>

<DemoBlock title="只读（readonly）">
  <oas-time-picker readonly value="09:05:30" placeholder="只读回显"></oas-time-picker>
</DemoBlock>

readonly 下面板可展开浏览，点选 / 此刻 / 预设 / 清除 / 手输均不提交。

## 受控开合与事件

<DemoBlock title="oas-change / oas-confirm 事件">
  <oas-time-picker id="time-picker-event" value="10:00:00"></oas-time-picker>
  <span id="time-picker-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

<DemoBlock title="受控开合（open + oas-open-change）">
  <oas-time-picker id="time-picker-open" value="10:00:00"></oas-time-picker>
  <button id="time-picker-open-toggle" type="button">展开 / 收起</button>
</DemoBlock>

`open` 属性在场为受控模式：手势只派发 `oas-open-change`，开合由宿主增删属性决定；确认提交（`Enter` / 外部点击 / 此刻）时派发 `oas-confirm`（与 `oas-change` 并行）。

## 禁用

<DemoBlock title="禁用">
  <oas-time-picker disabled value="09:05:30"></oas-time-picker>
</DemoBlock>

## 浮层定位（placement）

<DemoBlock title="显式 placement（top-end：上方弹出右对齐）">
  <oas-time-picker placement="top-end" value="09:05:30" placeholder="placement=top-end"></oas-time-picker>
</DemoBlock>

与 date-picker 同定位契约：`fixed` + 碰撞翻转 + 视口夹取，面板宽度对齐触发器；`placement` 支持 12 向（默认 `bottom-start`）。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clearable` | 可清除：有值时显示清除钮，点击清空并派发 `oas-clear` + `oas-change`（空值） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `format` | 展示格式 token；含 `HH`/`mm`/`ss` 时对应列出现 | `string` | `HH:mm:ss` |
| `is-range` | 时间范围：值为 JSON 数组 `["HH:mm:ss","HH:mm:ss"]`，确认时起止自动排序；该形态手输通道只读 | `boolean` | — |
| `open` | 受控开合：在场=展开、移除=收起；手势只派发 `oas-open-change` 由宿主回写 | — | — |
| `placeholder` | 占位提示 | — | — |
| `placement` | 浮层位置，12 向（默认 `bottom-start`），`fixed` + 碰撞翻转 + 视口夹取（与 date-picker 同契约） | `string` | `bottom-start` |
| `readonly` | 只读：面板可展开浏览，点选/此刻/预设/清除/手输均不提交 | `boolean` | — |
| `size` | 尺寸档：`small` / `medium` / `large`（就近读取 config-provider 注入） | `string` | `medium` |
| `status` | 校验态：`success` / `warning` / `error`（`error` 联动 `aria-invalid`） | `string` | — |
| `step` | 步进：JSON 三元组 `{"h":2,"m":5,"s":1}` 分别控制时/分/秒列；单数字等价于分钟步进 | `string` | — |
| `use12-hours` | 12 小时制：显示与列走 12 小时制（附上午/下午列，文案随 locale）；value 恒为 24 小时制 | `boolean` | — |
| `value` | 当前值（`HH:mm:ss`；`is-range` 为 JSON 数组） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 组件整体失焦（组件内转移不误报） |
| `oas-change` | 确认值变化，`detail: { value }`（`is-range` 为字符串数组） |
| `oas-clear` | 清除，`detail: { value }` 为清空前的值 |
| `oas-confirm` | 确认提交时派发（Enter/外部点击/此刻，与 `oas-change` 并行），`detail: { value: detail }` |
| `oas-focus` | 组件整体获焦 |
| `oas-open-change` | 开合变化，`detail: { open }`（受控/非受控均派发） |

键盘：`Enter` / `↓` 展开，`↑`/`↓` 调整当前列，`Home`/`End` 跳首末，`←`/`→` 切换列，`Enter` 确认，`Esc` 取消。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('time-picker-event')
  const out = document.getElementById('time-picker-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-confirm', (e) => {
    out.textContent = `oas-confirm: ${e.detail.value}`
  })

  // 受控开合
  const openEl = document.getElementById('time-picker-open')
  document.getElementById('time-picker-open-toggle')?.addEventListener('click', () => {
    if (openEl?.hasAttribute('open')) openEl.removeAttribute('open')
    else openEl?.setAttribute('open', '')
  })

  // 禁用打烊时段（14:00-17:00 不可选）
  const dt = document.getElementById('time-picker-disabled-time')
  dt.disabledTime = (p) =>
    p.h >= 14 && p.h < 17 ? { hours: [14, 15, 16] } : null

  // 快捷时刻预设
  const pr = document.getElementById('time-picker-presets')
  pr.presets = [
    { label: '上午 9 点', value: '09:00:00' },
    { label: '下午 2 点', value: '14:00:00' },
    { label: '整点', value: '12:00:00' },
  ]
})
</script>
