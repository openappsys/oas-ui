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

## 刻度（marks 对象）

<DemoBlock title="marks 对象：值 → 标签映射">
  <oas-slider marks='{"0":"0°C","26":"26°C","60":"60°C"}' min="0" max="100" value="30" style="width: 320px"></oas-slider>
</DemoBlock>

## 刻度（marks 数组）

<DemoBlock title="marks 数组：仅数值，标签回退为数值文本">
  <oas-slider marks="[0,25,50,75,100]" min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

拖动滑块时，当前值已到达的刻度点与标签会以主题色高亮；`marks` 同时支持 JSON 对象 `{"值":"标签"}` 与 JSON 数组 `[值, 值]` 两种写法（数组元素也可用 `{"value": 26, "label": "26°C"}`）。

## 带输入框联动

<DemoBlock title="show-input 数值输入联动">
  <oas-slider show-input min="0" max="100" value="40" style="width: 360px"></oas-slider>
</DemoBlock>

右侧数值输入框与滑块双向同步：拖动滑块实时更新输入框；输入数字后防抖 300ms 生效并自动夹取到 `min`/`max` 范围，Enter/失焦立即提交。

## 范围选择

<DemoBlock title="range 双滑块区间 + 双输入框">
  <oas-slider range show-input min="0" max="100" value="[20, 80]" style="width: 360px"></oas-slider>
</DemoBlock>

`range` 开启双滑块区间选择，`value` 为 JSON 数组 `[lo, hi]` 或逗号分隔字符串 `"lo,hi"`；与 `show-input` 搭配可分别编辑 min/max 两个输入框。输入越界时按「推着走」约束：min 输入超过 max 会推着 max 移动，反之亦然。

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

## 反向

<DemoBlock title="reverse 反向（min 在右）">
  <oas-slider reverse min="0" max="100" value="60" style="width: 320px"></oas-slider>
</DemoBlock>

`reverse` 反转数值方向，最小值在右端；填充区、刻度与自定义滑块位置随之镜像。

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
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `marks` | 刻度：JSON 对象 `{"0":"0°C"}`（值→标签）或 JSON 数组 `[0,26,60]`（也可为 `{"value":26,"label":"26°C"}`）；刻度点与标签显示在轨道下方，值经过处高亮；`reverse` 下位置镜像 | `string \| Record<string, string \| number> \| number[]` | — |
| `max` | 范围 | `string` | `100` |
| `min` | 范围 | `string` | `0` |
| `range` | 范围模式：双滑块区间选择，`value` 为 JSON 数组 `[lo, hi]` 或逗号分隔字符串 `"lo,hi"`；拖动态互相钳制（lo ≤ hi），事件 `detail.value` 为数组 | `boolean` | — |
| `reverse` | 方向反转：最小值在右端（轨道 `dir="rtl"`），填充区/刻度/自定义滑块位置镜像 | `boolean` | — |
| `show-input` | 右侧显示数值输入框，与滑块双向同步：拖动实时更新输入框；输入数字防抖 300ms 后生效并夹取到 `min`/`max`，Enter/失焦立即提交；范围模式显示 min/max 两个输入框（min 超过 max 时推着 max 移动） | `boolean` | — |
| `show-tooltip` | 滑块上方显示当前值气泡（拖动中临时显示，与 `custom-thumb` 共存） | `boolean` | — |
| `step` | 步长 | `string` | `1` |
| `value` | 当前值（受控）：单值为数值字符串；`range` 模式为 JSON 数组或逗号分隔字符串 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 松手确定，`detail: { value }`（单值数字；`range` 模式为 `[lo, hi]` 数组） |
| `oas-input` | 拖动中/输入防抖提交，`detail: { value }`（单值数字；`range` 模式为 `[lo, hi]` 数组） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="custom-thumb"]` | 自定义滑块内容（图标/文字）：`template[slot="custom-thumb"]`（静态模板，克隆到每个可见滑块，范围模式两个滑块都会克隆）或普通 `[slot="custom-thumb"]` 元素 |
