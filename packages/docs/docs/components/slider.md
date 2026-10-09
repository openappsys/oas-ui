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

右�数�输入框与滑块双向同步：拖动滑块实时更新输入框；输入数字后防抖 300ms 生效并自动夹取到 `min`/`max` 范围，Enter/失焦立即提交。

## 指针微调与双击复位（scrub）

<DemoBlock title="按住读数框横向拖动（scrub）+ 双击轨道复位">
  <oas-slider id="slider-scrub" show-input min="0" max="100" step="1" value="30" reset-value="50" style="width: 360px"></oas-slider>
  <span id="slider-scrub-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
  <oas-slider id="slider-mark-scrub" step="mark" marks="[0,26,60]" min="0" max="60" value="26" show-input style="width: 360px"></oas-slider>
  <span id="slider-mark-scrub-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
  <oas-slider id="slider-float-scrub" show-input min="0" max="1" step="0.1" value="0.2" style="width: 360px"></oas-slider>
  <span id="slider-float-scrub-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

读数区支持指针微调（scrub）：按住数值输入框横向拖动，每 4px 计一步（步长 = `step`），适合密集调参时不精确点按轨迹。修饰键与 knob 同一口径：**Shift 精调（×0.2）、Alt 超精调（×0.04）**，不引入加速档；拖回按下位置即恢复原值（误拖无损撤销）；位移不足一步视为普通点击（仍可聚焦键入）。拖动过程派发 `oas-input`，松手提交 `oas-change`。`step="mark"` 模式下 scrub 值实时吸附最近刻度（第二颗滑块，值恒在档位集合上）。

双击轨道复位到 `reset-value`（未设置回落 `min`）；复位走完整提交链路（`oas-input` + `oas-change`），仅单值模式响应。触屏（coarse pointer）不启用 scrub（点按即聚焦键入优先）；需要完全关闭时设 `scrub="false"`。

## 专业属性（precision / value-width / accent-color / show-track）

<DemoBlock title="precision 修约 + value-width 读数宽度">
  <oas-slider show-input precision="2" value-width="96" min="0" max="1" step="0.01" value="0.3" style="width: 380px"></oas-slider>
</DemoBlock>

<DemoBlock title="accent-color（scrub 强调色）+ show-track=&quot;false&quot;（轨道退场）">
  <div style="display: flex; flex-direction: column; gap: 16px; width: 360px;">
    <oas-slider show-input accent-color="success" value="40" style="width: 360px"></oas-slider>
    <oas-slider show-track="false" value="60" style="width: 360px"></oas-slider>
  </div>
</DemoBlock>

- `precision`：值的小数位，scrub 步进与气泡/`aria-valuetext` 按此修约；未设置时步进值按 `step`/修饰倍率的有效小数位自动收敛浮点尾巴（`0.1 + 0.2` 类实现误差不出现在值通道），显式设置是更严的值约束（如 `0` 时修饰键精调被钳回整数位），优先级低于 `format`/`formatTooltip` 格式化通道；
- `value-width`：读数框宽度，纯数字按 px、带单位值原样透传（缺省 72px）；
- `accent-color`：scrub 拖动中读数框的强调色，预设语义色名映射主题 token（随暗色主题）、其他值原样透传；
- `show-track`：轨道显隐开关，`show-track="false"` 隐藏轨道条与选中填充（把手保留，仍可拖动与键盘操作），适合把滑块嵌进自定义容器只留把手的场景。

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

## 滑块形态（thumb）

<DemoBlock title="thumb 两形态：round 圆推子（默认）/ pointer 细指针">
  <div style="display: flex; flex-direction: column; gap: 16px; width: 360px;">
    <oas-slider thumb="round" value="40"></oas-slider>
    <oas-slider thumb="pointer" value="60"></oas-slider>
  </div>
</DemoBlock>

`thumb` 切换把手形态：`round` 为默认粗圆推子；`pointer` 为细指针（薄条沿轴摆放，适合色轨/波形等需要精细读位、不遮挡轨道的场景）。`pointer` 恒走自定义视觉层（原生拇指隐藏），水平为薄竖条、垂直为薄横条；非法值回落 `round`。

## 立体声电平表（levels）

<DemoBlock title="levels {left,right}：圆推子下方的双条电平（0–1 归一化）">
  <div style="display: flex; gap: 56px; align-items: flex-start;">
    <oas-slider label="左声道" levels='{"left":0.72,"right":0.4}' value="72" style="width: 200px"></oas-slider>
    <oas-slider label="右声道" levels='{"left":0.4,"right":0.72}' value="40" style="width: 200px"></oas-slider>
  </div>
</DemoBlock>

`levels` 在圆推子下方渲染双条立体声电平（`{ left, right }`，0–1 归一化，越界自动夹取），适合音频/混音推子。电平表为装饰性（`aria-hidden`、不参与交互）；仅 `thumb="round"`（默认形态）渲染，`thumb="pointer"` 时忽略。也可用函数式赋值 `el.levels = { left, right }`（置 `null` 清除）。

## 颜色

<DemoBlock title="color / track-color">
  <div style="display: flex; flex-direction: column; gap: 16px; width: 360px;">
    <oas-slider color="success" value="60"></oas-slider>
    <oas-slider color="danger" track-color="var(--oas-color-bg-hover)" value="40"></oas-slider>
  </div>
</DemoBlock>

`color` 控制填充区/滑块/经过刻度色，`track-color` 控制轨道底色：预设语义色名（`primary`/`success`/`warning`/`danger`，自动跟随暗色主题）映射到主题 token；其他值（如 `#ff5500`、`var(--x)`）原样透传为 CSS 色值。

## 色轨（track）

<DemoBlock title="track 色轨：hue 色相 / saturation 饱和度 / luminance 明度 / gradient 渐变">
  <div style="display: flex; flex-direction: column; gap: 24px; width: 360px;">
    <oas-slider track="hue" value="55"></oas-slider>
    <oas-slider track="saturation" value="70"></oas-slider>
    <oas-slider track="luminance" value="40"></oas-slider>
    <oas-slider track="gradient" value="60"></oas-slider>
  </div>
</DemoBlock>

`track` 把轨道底色换成色空间渐变轨，适合取色/亮度/增益等「以轨道本身表达取值」的场景：

- `hue`：色相光谱（红→黄→绿→青→蓝→品红→红）；
- `saturation`：中性灰（`--oas-color-border-strong`）→ 推子色（饱和度）；
- `luminance`：黑 → 白（明度）；
- `gradient`：轨道底色（`--oas-slider-track`）→ 推子色（`--oas-slider-color`）两段 CSS 渐变。

渐变方向随轴向与反转感知：水平从左、垂直从下，`reverse`/RTL 即镜像反向。色轨激活时单色填充自动隐藏（光谱自表达，避免遮挡），轨道仍可用 `track-color` 覆盖底色、`color` 覆盖推子色；非预设值回落普通纯色轨道。

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

`vertical` 切换为垂直滑块（最小值在下、`reverse` 镜像到上）：刻度标签移到轨道右侧、值气泡默认朝右、`show-input` 输入框移到轨道下方。高度默认 200px，通过 CSS 变量 `--oas-slider-height` 调整。把手形态由 `thumb` 控制（`pointer` 细指针 / `round` 圆推子，见「滑块形态」）。

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

## 可访问名（label）

<DemoBlock title="label 可访问名">
  <div style="display: flex; flex-direction: column; gap: 12px; width: 360px;">
    <oas-slider id="slider-label-demo" label="音量" value="40"></oas-slider>
    <oas-slider label="范围" range value="[20, 80]"></oas-slider>
    <oas-button onclick="document.getElementById('slider-label-out').textContent = 'aria-label = ' + document.getElementById('slider-label-demo').shadowRoot.querySelector('input').getAttribute('aria-label')">查看 aria-label</oas-button>
    <span id="slider-label-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

`label` 写入内部滑块的可访问名（对齐 input 的 label 契约）：单值滑块 `aria-label = label`；范围模式组合语义后缀（「音量 最小值」/「音量 最大值」）；缺省回落内置文案。读屏朗读与语音控制据此定位滑块。

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

  // scrub / 双击复位 demo：实时反馈当前值（oas-input 过程值 / oas-change 提交值 / 复位提示）
  const scrubEl = document.getElementById('slider-scrub')
  const scrubOut = document.getElementById('slider-scrub-out')
  if (scrubEl && scrubOut) {
    scrubEl.addEventListener('oas-input', (e) => (scrubOut.textContent = `scrub 中：${e.detail.value}`))
    scrubEl.addEventListener('oas-change', (e) => (scrubOut.textContent = `已提交：${e.detail.value}`))
    scrubEl.addEventListener('oas-input', (e) => {
      if (Number(e.detail.value) === 50) scrubOut.textContent = '已复位：50'
    })
  }

  // mark + scrub demo：刻度吸附值回显（值恒在档位集合上）
  const markScrubEl = document.getElementById('slider-mark-scrub')
  const markScrubOut = document.getElementById('slider-mark-scrub-out')
  if (markScrubEl && markScrubOut) {
    markScrubEl.addEventListener('oas-change', (e) => (markScrubOut.textContent = `已提交：${e.detail.value}`))
  }

  // 小数步长 scrub demo：无 precision 时步进值同样干净（浮点尾巴自动收敛）
  const floatScrubEl = document.getElementById('slider-float-scrub')
  const floatScrubOut = document.getElementById('slider-float-scrub-out')
  if (floatScrubEl && floatScrubOut) {
    floatScrubEl.addEventListener('oas-change', (e) => (floatScrubOut.textContent = `已提交：${e.detail.value}`))
  }
})
</script>

## 多滑块（N 元数组）

<DemoBlock title="三把手：value 为 N 元数组 + 逐把手可访问名">
  <oas-slider id="slider-multi" min="0" max="100" value="[10,30,70]" show-tooltip labels='["低","中","高"]' style="width: 360px"></oas-slider>
</DemoBlock>

<DemoBlock title="多把手 + 数值输入联动">
  <oas-slider id="slider-multi-input" min="0" max="100" value="[10,30,70]" show-input style="width: 440px"></oas-slider>
</DemoBlock>

`value` 支持 N 元数组（JSON 数组或逗号分隔字符串），渲染 N 个把手——`range` 是 N=2 的特例（仍保留 `range-min`/`range-max` 旧契约）；不设 `range` 但 `value` 为二元及以上数组时同样渲染多把手。每把手可独立拖拽与键盘操作，值自动保持升序（拖动越界夹到相邻把手），`oas-input`/`oas-change` 的 `detail.value` 为数组。逐把手可访问名可用 `labels` JSON 数组（`labels='["低","中","高"]'`）或 `label-1`/`label-2`… 属性，缺省回落 `label + 序号`（内置文案 + 序号）。

## API

### oas-slider

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accent-color` | 读数区 scrub 拖动中的强调色：预设语义色名（primary / success / warning / danger，随暗色主题）映射主题 token，其他值原样透传；缺省回落主题主色 | — | — |
| `color` | 填充区/滑块/经过刻度颜色：预设语义色名（primary / success / warning / danger，随暗色主题）映射主题 token；其他值原样透传为 CSS 色值 | — | — |
| `disabled` | 禁用 | `boolean` | — |
| `format` | 值气泡模板串：`${value}` 占位符替换为当前值（如 `"${value}%"`），不含占位符时原样显示；输出同时进气泡与 `aria-valuetext`；优先级低于 `formatTooltip` 函数 | `string` | — |
| `label` | 内层滑块可访问名（range 模式自动加「最小值/最大值」后缀） | `string` | — |
| `label-1` | 第 1 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `label-2` | 第 2 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `label-3` | 第 3 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `label-4` | 第 4 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `label-5` | 第 5 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `label-6` | 第 6 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `label-7` | 第 7 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `label-8` | 第 8 个把手的可访问名（多滑块模式；优先于 labels/label） | — | — |
| `labels` | 逐把手可访问名的 JSON 数组（如 `["低","中","高"]`；label-N 属性族优先） | `string` | — |
| `large-step` | 键盘大步步进量（Shift+方向键 / PageUp / PageDown 生效）；缺省为 10 × step；每次按键即派发 `oas-input` + `oas-change` | `string` | — |
| `levels` | 立体声电平表：`{ left, right }` 归一化值（0–1，越界夹取），在圆推子下方渲染双条电平（装饰性 aria-hidden、不参与交互）；仅 `thumb="round"`（默认）渲染，pointer 形态忽略；非法/缺失隐藏 | `{ left?: number; right?: number } \| string \| null` | — |
| `marks` | 刻度：JSON 对象 `{"0":"0°C"}`（值→标签）或 JSON 数组 `[0,26,60]`（也可为 `{"value":26,"label":"26°C"}`）；刻度点与标签显示在轨道下方，值经过处高亮；`reverse` 下位置镜像 | `string \| Record<string, string \| number> \| number[]` | — |
| `max` | 范围 | `string` | `100` |
| `min` | 范围 | `string` | `0` |
| `precision` | 值的小数位（scrub 步进与气泡/aria-valuetext 显示按此修约；未设置时步进值按 step/修饰倍率的有效小数位自动收敛浮点尾巴，显式设置是更严的值约束）；优先级低于 format/formatTooltip 格式化通道 | `string` | — |
| `range` | 范围模式：双滑块区间选择，`value` 为 JSON 数组 `[lo, hi]` 或逗号分隔字符串 `"lo,hi"`；拖动态互相钳制（lo ≤ hi），事件 `detail.value` 为数组 | `boolean` | — |
| `readonly` | 只读（与 `disabled` 分立）：仍可聚焦、值仍参与表单收集，拖动与键盘改值被拦截，视觉不降饱和 | `boolean` | — |
| `reset-value` | 双击轨道复位的目标值：未设置回落 min；自动夹取到 [min, max]，step="mark" 模式吸附最近刻度；仅单值模式响应（range/多把手忽略），复位派发 oas-input + oas-change | `string` | — |
| `reverse` | 方向反转：水平模式最小值在右端（轨道 `dir="rtl"`），垂直模式最小值在上端；填充区/刻度/自定义滑块位置随之镜像 | `boolean` | — |
| `scrub` | 读数区指针微调（scrub，默认开启）：按住读数框横向拖动，每 4px 计一步（步长 = step）；Shift 精调（×0.2）、Alt 超精调（×0.04，与 knob 口径一致，无加速档）；拖回按下位置恢复原值；位移不足一步视为普通点击（保留键入）；scrub="false" 关闭；触屏（coarse pointer）不启用 | `string` | `true` |
| `show-input` | 右侧显示数值输入框，与滑块双向同步：拖动实时更新输入框；输入数字防抖 300ms 后生效并夹取到 `min`/`max`，Enter/失焦立即提交；范围模式显示 min/max 两个输入框（min 超过 max 时推着 max 移动） | `boolean` | — |
| `show-stops` | 按 `step` 在轨道上渲染刻度点（无标签），经过处高亮；与 `marks` 同时存在时刻度以 marks 为准；刻度点超过 100 个时不渲染 | `boolean` | — |
| `show-tooltip` | 滑块上方显示当前值气泡（拖动中临时显示，与 `custom-thumb` 共存） | `boolean` | — |
| `show-track` | 轨道显隐开关（默认显示）；show-track="false" 隐藏轨道条与选中填充（把手保留，仍可拖动与键盘操作） | `string` | `true` |
| `size` | 尺寸三档：sm / md / lg（也接受 small / medium / large 词表，支持 config-provider 注入），轨道高度与滑块直径联动；非法值回落 md | `string` | `medium` |
| `start-point` | 单值模式填充起点（缺省从 `min` 端填充）：值大于起点向右延伸、小于向左延伸；自动夹取到 `[min, max]`；`range` 模式忽略 | `string` | — |
| `step` | 步长；特殊值 `"mark"` 把可选值约束到 `marks` 刻度值集合（拖动/键盘/受控值吸附最近刻度，需搭配 `marks`，缺省回落 1） | `string` | `1` |
| `thumb` | 把手形态：`round` 粗圆推子（默认）/ `pointer` 细指针（薄条沿轴摆放，恒走自定义视觉层、原生拇指隐藏；水平薄竖条、垂直薄横条）；非法值回落 round | `string` | `round` |
| `tooltip-always` | 值气泡常显（默认拖动/键盘聚焦时显示） | `boolean` | — |
| `tooltip-position` | 值气泡方向：top / bottom / left / right；水平默认 top、垂直默认 right，非法值回落默认 | `string` | — |
| `track` | 色轨预设：`hue` 色相光谱 / `saturation` 中性灰→推子色 / `luminance` 黑→白 / `gradient` 轨道色→推子色两段 CSS 渐变；方向随轴向与 `reverse`/RTL 镜像；激活时隐藏单色填充（光谱自表达），非预设值回落纯色轨道 | `string` | — |
| `track-color` | 轨道底色：预设语义色名映射主题 token；其他值原样透传为 CSS 色值 | — | — |
| `value` | 当前值（受控）：单值为数值字符串；`range` 模式为 JSON 数组 `[lo, hi]` 或逗号分隔字符串 `"lo,hi"`，交互后写回 JSON 数组字符串（表单收集可直接 `JSON.parse`） | `number \| number[]` | — |
| `value-width` | show-input 读数框宽度：纯数字按 px、带单位值原样透传（写入 --oas-slider-value-width）；缺省 72px | `string` | — |
| `vertical` | 垂直模式：轨道竖直（最小值在下，`reverse` 镜像到上）；刻度标签移到轨道右侧、值气泡默认朝右、show-input 输入框移到轨道下方；高度默认 200px，用 CSS 变量 `--oas-slider-height` 调整 | `boolean` | — |

#### Property（仅 JS property，不反射 attribute）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `levels` | 立体声电平值 `{ left, right }`（0–1 归一化；对象赋值反射为 JSON attribute，置 `null` 清除） | `{ left?: number; right?: number } \| string \| null` | — |
| `value` | 当前值：单把手为数值，多把手为数值数组 | `number \| number[]` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 松手确定，`detail: { value }`（单值数字；`range` 模式为 `[lo, hi]` 数组） |
| `oas-input` | 拖动中/输入防抖提交，`detail: { value }`（单值数字；`range` 模式为 `[lo, hi]` 数组） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="custom-thumb"]` | 自定义滑块内容（图标/文字）：`template[slot="custom-thumb"]`（静态模板，克隆到每个可见滑块，范围模式两个滑块都会克隆）或普通 `[slot="custom-thumb"]` 元素 |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-glass-refraction` | 液态玻璃边缘折射滤镜（`data-glass` 生效，默认 none）；局部停用覆盖为**空值**（`--oas-glass-refraction: ;`）——不得用 `none`（与 button 态的 brightness() 混排会使整条 filter 声明非法） | `none` |
| `--oas-slider-accent` | — | `var(--oas-color-primary)` |
| `--oas-slider-color` | — | `var(--oas-color-primary)` |
| `--oas-slider-height` | — | `200px` |
| `--oas-slider-thumb-size` | — | `14px` |
| `--oas-slider-track` | — | `var(--oas-color-border)` |
| `--oas-slider-track-image` | 色轨渐变图（`track` 预设时由组件写入；轨道伪元素的 background-image，缺省 none 走纯色轨道底色） | `none` |
| `--oas-slider-track-size` | — | `4px` |
| `--oas-slider-value-width` | — | `72px` |

`marks` 支持 JS property 通道（对象/数组直接赋值，反射为 JSON attribute）；`el.formatTooltip = (value) => string | number` 为值格式化函数 property（输出同时进值气泡与 `aria-valuetext`，优先级高于 `format` 属性，置 `null` 清除）——attribute 无法表达函数语义，函数通道只能走 JS property。
