# Slider 滑块

原生 `<input type="range">` 增强的滑动条。

## 基础用法

<DemoBlock title="基础用法">
  <oas-slider style="width: 320px"></oas-slider>
</DemoBlock>

## 范围与步长

<DemoBlock title="min / max / step">
  <oas-slider min="0" max="100" step="10" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## 禁用

<DemoBlock title="禁用">
  <oas-slider disabled value="50" style="width: 320px"></oas-slider>
</DemoBlock>

## 只读

<DemoBlock title="readonly 只读（可聚焦、不灰显、不可拖改）">
  <oas-slider readonly value="40" style="width: 320px"></oas-slider>
</DemoBlock>

`readonly` 与 `disabled` 分立：只读滑块仍可聚焦、值仍参与表单收集，但拖动与键盘改值都被拦截；视觉上不降饱和（与禁用的灰显区分，适合配置摘要回显场景）。

## 刻度（marks 对象）

<DemoBlock title="marks 对象：值 → 标签映射">
  <oas-slider marks='{"0":"0°C","26":"26°C","60":"60°C"}' min="0" max="100" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## 刻度（marks 数组）

<DemoBlock title="marks 数组：仅数值，标签回退为数值文本">
  <oas-slider marks="[0,25,50,75,100]" min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

拖动滑块时，当前值已到达的刻度点与标签会以主题色高亮；`marks` 同时支持 JSON 对象 `{"值":"标签"}` 与 JSON 数组 `[值, 值]` 两种写法（数组元素也可用 `{"value": 26, "label": "26°C"}`）。

## 刻度吸附（step="mark"）

<DemoBlock title="step=mark：值只能落在刻度上（尺寸 XS/S/M/XL 离散选择）">
  <oas-slider step="mark" marks='{"0":"XS","30":"S","60":"M","100":"XL"}' min="0" max="100" value="30" style="width: 360px"></oas-slider>
</DemoBlock>

`step="mark"` 特殊值把可选值约束到 `marks` 的刻度值集合：拖动与键盘（方向键在刻度间跳档、Shift/PageUp 一次跳 3 档、Home/End 到首末刻度）都吸附到最近刻度，marks 之外的连续值不可选。需要与 `marks` 搭配使用；未提供 marks 时按普通步长（1）处理。

## 刻度点（show-stops）

<DemoBlock title="show-stops：按 step 画刻度点（无需标签数据）">
  <oas-slider show-stops step="10" min="0" max="100" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

`show-stops` 按 `step` 在轨道上渲染刻度点（无标签），经过处同样高亮；与 `marks` 独立——同时存在时刻度以 `marks` 为准（不叠加）。刻度点超过 100 个时不渲染（防 DOM 爆炸）。

## 带输入框联动

<DemoBlock title="show-input 数值输入联动">
  <oas-slider show-input min="0" max="100" value="40" style="width: 360px"></oas-slider>
</DemoBlock>

右侧数值输入框与滑块双向同步：拖动滑块实时更新输入框；输入数字后防抖 300ms 生效并自动夹取到 `min`/`max` 范围，Enter/失焦立即提交。

## 范围选择

<DemoBlock title="range 双滑块区间 + 双输入框">
  <oas-slider id="slider-range" range show-input min="0" max="100" value="[20, 80]" style="width: 360px"></oas-slider>
</DemoBlock>

`range` 开启双滑块区间选择，`value` 为 JSON 数组 `[lo, hi]` 或逗号分隔字符串 `"lo,hi"`；与 `show-input` 搭配可分别编辑 min/max 两个输入框。输入越界时按「推着走」约束：min 输入超过 max 会推着 max 移动，反之亦然。交互后 `value` 属性写回 JSON 数组字符串，表单收集可直接 `JSON.parse`。

## 自定义滑块

<DemoBlock title="custom-thumb 图标滑块 + 值气泡">
  <oas-slider show-tooltip min="0" max="100" value="60" style="width: 320px">
    <template slot="custom-thumb">🎯</template>
  </oas-slider>
</DemoBlock>

<DemoBlock title="纯值气泡（无自定义内容）">
  <oas-slider show-tooltip min="0" max="100" value="40" style="width: 320px"></oas-slider>
</DemoBlock>

通过 `template[slot="custom-thumb"]`（或普通 `[slot="custom-thumb"]` 元素）定制滑块内容（图标/文字），内容会克隆到每个可见滑块；`show-tooltip` 在滑块上方显示当前值气泡，二者可共存。范围模式下模板会克隆到 min/max 两个滑块。

## 值气泡格式化与常显

<DemoBlock title="format 模板串：${value} 占位（气泡与读屏同源）">
  <oas-slider show-tooltip format="${value}%" min="0" max="100" value="40" style="width: 320px"></oas-slider>
</DemoBlock>

<DemoBlock title="formatTooltip 函数通道 + tooltip-always 常显（货币格式）">
  <oas-slider id="slider-fn-format" tooltip-always min="0" max="500" step="10" value="120" style="width: 360px"></oas-slider>
</DemoBlock>

<DemoBlock title="tooltip-position 气泡方向（bottom）">
  <oas-slider show-tooltip tooltip-position="bottom" min="0" max="100" value="40" style="width: 320px"></oas-slider>
</DemoBlock>

值气泡内容支持双通道格式化，输出同时进气泡与 `aria-valuetext`（读屏播报与视觉一致）：

- `format` 属性：模板串，`${value}` 占位符替换为当前值（如 `"${value}%"`、`"¥${value}"`），不含占位符时原样显示；
- `el.formatTooltip` 函数 property：JS 赋值 `el.formatTooltip = (value) => string`，适合 Intl 货币/单位闭包等动态场景，优先级高于 `format`，置 `null` 清除。

气泡显示时机：默认拖动/键盘聚焦时显示；`tooltip-always` 常显；`tooltip-position` 切换方向（top/bottom/left/right，水平默认 top、垂直默认 right）。

## 填充起点（start-point）

<DemoBlock title="start-point：从中点向两侧填充（温度计）">
  <oas-slider start-point="0" min="-50" max="50" value="12" show-input style="width: 360px"></oas-slider>
</DemoBlock>

`start-point` 指定单值模式的填充起点（缺省从 `min` 端填充）：值大于起点向右延伸、小于起点向左延伸，适合 ± 区间（温度/增益调节）场景。起点自动夹取到 `[min, max]`；`range` 模式下忽略（区间填充由两个滑块决定）。

## 尺寸

<DemoBlock title="size 三档（sm / md / lg）">
  <div style="display: flex; flex-direction: column; gap: 16px; width: 360px;">
    <oas-slider size="sm" value="30"></oas-slider>
    <oas-slider value="50"></oas-slider>
    <oas-slider size="lg" value="70"></oas-slider>
  </div>
</DemoBlock>

`size` 切换轨道高度与滑块直径三档（也接受 `small`/`medium`/`large` 词表，支持 config-provider 全局注入），非法值回落 md。

## 颜色

<DemoBlock title="color / track-color">
  <div style="display: flex; flex-direction: column; gap: 16px; width: 360px;">
    <oas-slider color="success" value="60"></oas-slider>
    <oas-slider color="danger" track-color="var(--oas-color-bg-hover)" value="40"></oas-slider>
  </div>
</DemoBlock>

`color` 控制填充区/滑块/经过刻度色，`track-color` 控制轨道底色：预设语义色名（`primary`/`success`/`warning`/`danger`，自动跟随暗色主题）映射到主题 token；其他值（如 `#ff5500`、`var(--x)`）原样透传为 CSS 色值。

## 垂直模式

<DemoBlock title="vertical 垂直滑块（音量/亮度面板）">
  <div style="display: flex; gap: 56px; align-items: flex-start;">
    <oas-slider vertical value="40"></oas-slider>
    <oas-slider vertical show-tooltip value="65" style="--oas-slider-height: 220px"></oas-slider>
    <oas-slider vertical marks='{"0":"静音","50":"适中","100":"最大"}' value="30"></oas-slider>
    <oas-slider vertical range value="[20, 80]"></oas-slider>
    <oas-slider vertical show-input value="40"></oas-slider>
  </div>
</DemoBlock>

`vertical` 切换为垂直滑块（最小值在下、`reverse` 镜像到上）：刻度标签移到轨道右侧、值气泡默认朝右、`show-input` 输入框移到轨道下方。高度默认 200px，通过 CSS 变量 `--oas-slider-height` 调整。

## 反向

<DemoBlock title="reverse 反向（min 在右）">
  <oas-slider reverse min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

`reverse` 反转数值方向，最小值在右端；填充区、刻度与自定义滑块位置随之镜像。垂直模式下 `reverse` 使最小值在上端。

## 键盘

<DemoBlock title="键盘大步进（large-step）">
  <oas-slider large-step="25" show-tooltip value="50" min="0" max="100" style="width: 320px"></oas-slider>
</DemoBlock>

聚焦滑块后：方向键 / Home / End 保持浏览器原生步进；Shift + 方向键、PageUp / PageDown 为大步进，步进量 = `large-step`（默认 10 × step），跨浏览器行为统一（抹平 Firefox 原生 PageUp 差异）。每次按键即一次完整提交（派发 `oas-input` + `oas-change`）。

## 带标签滑块

<DemoBlock title="oas-form-item 组合（标签 + 滑块排版）">
  <div style="display: flex; flex-direction: column; gap: 12px; width: 420px;">
    <oas-form-item label="音量">
      <oas-slider show-tooltip value="40"></oas-slider>
    </oas-form-item>
    <oas-form-item label="亮度">
      <oas-slider value="65"></oas-slider>
    </oas-form-item>
    <oas-form-item label="对比度">
      <oas-slider range value="[20, 80]"></oas-slider>
    </oas-form-item>
  </div>
</DemoBlock>

滑块自身不内置可见标签（避免与表单标签体系重复）：用 `oas-form-item` 的 `label` 提供可见标签（点击标签可聚焦滑块），或用标题 + 滑块自行排版。

## 事件

<DemoBlock title="实时值与变化事件">
  <oas-slider id="slider-event" value="40" style="width: 320px"></oas-slider>
  <span id="slider-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 140px"></span>
</DemoBlock>

<DemoBlock title="范围模式事件（detail.value 为数组）">
  <oas-slider id="slider-range-event" range min="0" max="100" value="[20, 80]" style="width: 320px"></oas-slider>
  <span id="slider-range-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

拖动过程派发 `oas-input`，松手派发 `oas-change`：单值模式 `detail.value` 为数值，范围模式为 `[lo, hi]` 数组：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('slider-event')
  const out = document.getElementById('slider-output')
  const show = (label, v) => {
    out.textContent = `${label}: ${v}`
  }
  el?.addEventListener('oas-input', (e) => show('oas-input', e.detail.value))
  el?.addEventListener('oas-change', (e) => show('oas-change', e.detail.value))

  const rel = document.getElementById('slider-range-event')
  const rout = document.getElementById('slider-range-output')
  const showRange = (label, v) => {
    rout.textContent = `${label}: [${v[0]}, ${v[1]}]`
  }
  rel?.addEventListener('oas-input', (e) => showRange('oas-input', e.detail.value))
  rel?.addEventListener('oas-change', (e) => showRange('oas-change', e.detail.value))

  // formatTooltip 函数通道：Intl 货币格式化（优先于 format 模板串）
  const fnEl = document.getElementById('slider-fn-format')
  if (fnEl) {
    fnEl.formatTooltip = (v) =>
      new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(v)
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 填充区/滑块/经过刻度颜色：预设语义色名（primary / success / warning / danger，随暗色主题）映射主题 token；其他值原样透传为 CSS 色值 | — | — |
| `disabled` | 禁用 | `boolean` | — |
| `format` | 值气泡模板串：`${value}` 占位符替换为当前值（如 `"${value}%"`），不含占位符时原样显示；输出同时进气泡与 `aria-valuetext`；优先级低于 `formatTooltip` 函数 | `string` | — |
| `large-step` | 键盘大步步进量（Shift+方向键 / PageUp / PageDown 生效）；缺省为 10 × step；每次按键即派发 `oas-input` + `oas-change` | `string` | — |
| `marks` | 刻度：JSON 对象 `{"0":"0°C"}`（值→标签）或 JSON 数组 `[0,26,60]`（也可为 `{"value":26,"label":"26°C"}`）；刻度点与标签显示在轨道下方，值经过处高亮；`reverse` 下位置镜像 | `string \| Record<string, string \| number> \| number[]` | — |
| `max` | 范围 | `string` | `100` |
| `min` | 范围 | `string` | `0` |
| `range` | 范围模式：双滑块区间选择，`value` 为 JSON 数组 `[lo, hi]` 或逗号分隔字符串 `"lo,hi"`；拖动态互相钳制（lo ≤ hi），事件 `detail.value` 为数组 | `boolean` | — |
| `readonly` | 只读（与 `disabled` 分立）：仍可聚焦、值仍参与表单收集，拖动与键盘改值被拦截，视觉不降饱和 | `boolean` | — |
| `reverse` | 方向反转：水平模式最小值在右端（轨道 `dir="rtl"`），垂直模式最小值在上端；填充区/刻度/自定义滑块位置随之镜像 | `boolean` | — |
| `show-input` | 右侧显示数值输入框，与滑块双向同步：拖动实时更新输入框；输入数字防抖 300ms 后生效并夹取到 `min`/`max`，Enter/失焦立即提交；范围模式显示 min/max 两个输入框（min 超过 max 时推着 max 移动） | `boolean` | — |
| `show-stops` | 按 `step` 在轨道上渲染刻度点（无标签），经过处高亮；与 `marks` 同时存在时刻度以 marks 为准；刻度点超过 100 个时不渲染 | `boolean` | — |
| `show-tooltip` | 滑块上方显示当前值气泡（拖动中临时显示，与 `custom-thumb` 共存） | `boolean` | — |
| `size` | 尺寸三档：sm / md / lg（也接受 small / medium / large 词表，支持 config-provider 注入），轨道高度与滑块直径联动；非法值回落 md | `string` | `medium` |
| `start-point` | 单值模式填充起点（缺省从 `min` 端填充）：值大于起点向右延伸、小于向左延伸；自动夹取到 `[min, max]`；`range` 模式忽略 | `string` | — |
| `step` | 步长；特殊值 `"mark"` 把可选值约束到 `marks` 刻度值集合（拖动/键盘/受控值吸附最近刻度，需搭配 `marks`，缺省回落 1） | `string` | `1` |
| `tooltip-always` | 值气泡常显（默认拖动/键盘聚焦时显示） | `boolean` | — |
| `tooltip-position` | 值气泡方向：top / bottom / left / right；水平默认 top、垂直默认 right，非法值回落默认 | `string` | — |
| `track-color` | 轨道底色：预设语义色名映射主题 token；其他值原样透传为 CSS 色值 | — | — |
| `value` | 当前值（受控）：单值为数值字符串；`range` 模式为 JSON 数组 `[lo, hi]` 或逗号分隔字符串 `"lo,hi"`，交互后写回 JSON 数组字符串（表单收集可直接 `JSON.parse`） | `string` | — |
| `vertical` | 垂直模式：轨道竖直（最小值在下，`reverse` 镜像到上）；刻度标签移到轨道右侧、值气泡默认朝右、show-input 输入框移到轨道下方；高度默认 200px，用 CSS 变量 `--oas-slider-height` 调整 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 松手确定，`detail: { value }`（单值数字；`range` 模式为 `[lo, hi]` 数组） |
| `oas-input` | 拖动中/输入防抖提交，`detail: { value }`（单值数字；`range` 模式为 `[lo, hi]` 数组） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="custom-thumb"]` | 自定义滑块内容（图标/文字）：`template[slot="custom-thumb"]`（静态模板，克隆到每个可见滑块，范围模式两个滑块都会克隆）或普通 `[slot="custom-thumb"]` 元素 |

`marks` 支持 JS property 通道（对象/数组直接赋值，反射为 JSON attribute）；`el.formatTooltip = (value) => string | number` 为值格式化函数 property（输出同时进值气泡与 `aria-valuetext`，优先级高于 `format` 属性，置 `null` 清除）——attribute 无法表达函数语义，函数通道只能走 JS property。
