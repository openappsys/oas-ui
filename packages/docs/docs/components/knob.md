# Knob 旋钮

把连续/离散数值编码为圆周角度的旋转输入控件，为参数密集面板（音频/工业/3D）而生：紧凑圆形 + 相对拖拽（无跳变）+ 双极零位。

## 基础用法

<DemoBlock title="基础用法">
  <oas-knob value="40"></oas-knob>
</DemoBlock>

旋钮是紧凑的圆形输入控件：拖拽或键盘改值，值域线性映射到扫角（默认 225° → 495°，共 270°，底部留缺口，像面板旋钮的止档）。指针手势是**相对语义**：按下不写值、拖动跟随手（大范围调节不会像线性滑块的点击落点那样跳变）。

## 值域与步长

<DemoBlock title="min / max / step（step=0 视为连续）">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob min="0" max="100" step="10" value="30" show-value></oas-knob>
    <oas-knob min="-50" max="50" step="0" value="12" show-value></oas-knob>
  </div>
</DemoBlock>

`min`/`max` 定义值域（非法或 `min > max` 自动交换容错）；`step` 吸附步长，`0` 或负数视为连续（不吸附）。越界值自动夹取。

## 扫角（start-angle / end-angle）

<DemoBlock title="自定义扫角：300° 满圈感 / 半圆仪表">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob start-angle="210" end-angle="510" include-arc value="60" show-value></oas-knob>
    <oas-knob start-angle="180" end-angle="360" include-arc value="60" show-value></oas-knob>
  </div>
</DemoBlock>

`start-angle`/`end-angle` 自定义扫角（0° = 12 点方向、顺时针，默认 225 → 495 即 270°、底部留缺口）；`end-angle` 可大于 360（如 510 = 210° 起顺时针 300°）；`end-angle <= start-angle` 时归一化为最小 1° 扫角（防除零）。

## 三档手势（interaction）

<DemoBlock title="cursor 圆周跟随 / axis 线性拖拽 / auto 自动解析（默认）">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob interaction="cursor" value="40" label="圆周跟随"></oas-knob>
    <oas-knob interaction="axis" value="40" label="线性拖拽"></oas-knob>
    <oas-knob interaction="auto" value="40" label="自动解析"></oas-knob>
    <oas-knob interaction="axis" axis="horizontal" value="40" label="水平线性"></oas-knob>
  </div>
</DemoBlock>

- `cursor`：指针绕轴心的**方位角增量**驱动值（顺时针增值），旋钮标识性手势；
- `axis`：**线性拖拽**（默认 `axis="vertical"` 竖直、向上增值，150px 拖满量程；`axis="horizontal"` 切水平向右增值）——专业音频插件的通行惯例；
- `auto`（默认）：起手前几像素自动解析——主方向与偏好轴一致走线性、垂直于偏好轴走圆周，**解析后一次锁定**，同一次拖拽内不再切换（中途切换会跳值）。

所有手势均为相对语义：按下不写值、无移动点按零操作；主指针独占（第二指不接管）；Shift 按住拖拽为 0.2× 精调。

## 复位（双击 / Ctrl+单击 / default-value）

<DemoBlock title="双击或 Ctrl+单击复位到 default-value（缺省回落 min）">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob default-value="70" value="20" show-value label="增益"></oas-knob>
    <oas-knob value="80" min="10" show-value label="缺省复位到 min"></oas-knob>
  </div>
</DemoBlock>

**双击**或 **Ctrl/Cmd + 单击**复位到 `default-value`；未设 `default-value` 时回落 `min`。复位派发 `oas-reset`（`detail: { value, defaultValue }`），不派发 `oas-change`（复位不是一次数值确认）；`readonly`/`disabled` 下复位手势全封。程序性复位用 `el.reset()` 方法。

## 值弧与双极零位（include-arc + start-point）

<DemoBlock title="include-arc 值弧；start-point=中心值即双极（pan/gain）">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob include-arc value="70" show-value label="电平"></oas-knob>
    <oas-knob include-arc start-point="50" value="80" min="0" max="100" show-value label="声像"></oas-knob>
    <oas-knob include-arc start-point="50" value="20" min="0" max="100" show-value label="声像 左"></oas-knob>
  </div>
</DemoBlock>

`include-arc` 显示值弧（从 `start-point` 缺省 `min` 端填到当前值）；`start-point` 设为中心值即**双极弧**——值大于起点向一侧延伸、小于向另一侧延伸（pan/gain 以 12 点为中性位的音频惯例）。值与起点重合时值弧隐藏。

## 指示器（indicator）

<DemoBlock title="line 指针（默认）/ dot 圆点">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob indicator="line" include-arc value="60"></oas-knob>
    <oas-knob indicator="dot" include-arc value="60"></oas-knob>
  </div>
</DemoBlock>

`indicator="line"` 为径向指针线（默认），`indicator="dot"` 为近缘圆点。

## 显示值（show-value / unit / format）

<DemoBlock title="show-value 值文本 + unit 后缀 / format 模板串">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob show-value unit="Hz" min="20" max="20000" step="10" value="440" label="频率"></oas-knob>
    <oas-knob show-value format="${value} dB" value="-6" label="增益"></oas-knob>
  </div>
</DemoBlock>

`show-value` 在旋钮下方显示当前值；`unit` 作值后缀（`Hz`/`%`/`dB`）；`format` 为模板串（`${value}` 占位）。格式化输出同时进 `aria-valuetext`（读屏播报与视觉同源）；更复杂的格式化用 `el.formatValue = (value) => string` 函数 property（优先级最高，置 `null` 清除）。

## 尺寸

<DemoBlock title="size 三档（sm / md / lg），自定义直径走 CSS 变量">
  <div style="display: flex; gap: 32px; align-items: flex-start;">
    <oas-knob size="sm" value="30" include-arc></oas-knob>
    <oas-knob value="50" include-arc></oas-knob>
    <oas-knob size="lg" value="70" include-arc></oas-knob>
    <oas-knob value="60" style="--oas-knob-size: 88px"></oas-knob>
  </div>
</DemoBlock>

`size` 三档对应直径 sm=40px / md=56px（默认）/ lg=72px（也接受 `small`/`medium`/`large` 词表，支持 config-provider 全局注入），非法值回落 md；自定义直径直接覆盖 CSS 变量 `--oas-knob-size`。触屏（粗指针）下 sm 档自动抬到 44px 触控目标下限。

## 滚轮（wheel）

<DemoBlock title="wheel 悬停滚轮调节（默认关），Shift+滚轮精调">
  <oas-knob wheel value="40" show-value label="音量"></oas-knob>
</DemoBlock>

`wheel` 开启后悬停滚轮即可调节（上滚增值、下滚减值，一格 = `step`；连续模式为量程的 1/50），Shift+滚轮为 0.2× 精调。默认关闭（避免抢占页面滚动）。

## 反向（reverse）

<DemoBlock title="reverse 反向：值扫描与圆周手势同步镜像（min 从 end-angle 端起）">
  <oas-knob reverse include-arc value="30" show-value></oas-knob>
</DemoBlock>

`reverse` 反转值扫描方向（min → end-angle、max → start-angle），圆周手势与键盘左右键同步镜像；RTL 书写方向（`dir="rtl"`）自动镜像，与 `reverse` 取异或。

## 键盘

<DemoBlock title="键盘大步进（large-step）">
  <oas-knob large-step="25" include-arc show-value value="50" label="大步进"></oas-knob>
</DemoBlock>

聚焦旋钮后：方向键 ± `step`（上下键恒为增/减值，左右键随镜像翻转）、Shift + 方向键与 PageUp/PageDown ± `large-step`（缺省 10 × step）、Home/End 到极值。每次按键即一次完整提交（派发 `oas-input` + `oas-change`），极值处按键安静（不派发事件）。

## 只读与禁用

<DemoBlock title="readonly 只读（不灰显）/ disabled 禁用（灰显、不可聚焦）">
  <div style="display: flex; gap: 32px; align-items: center;">
    <oas-knob readonly value="40" include-arc></oas-knob>
    <oas-knob disabled value="60" include-arc></oas-knob>
  </div>
</DemoBlock>

`readonly` 与 `disabled` 分立（同 slider 约定）：只读旋钮仍可聚焦、值仍参与宿主收集，但拖拽/键盘/滚轮/复位全部拦截，视觉不降饱和；禁用旋钮不可聚焦（移除 tabindex）、`aria-disabled="true"`、灰显。

## 可访问名（label）

<DemoBlock title="label 可访问名（不渲染可见标签，可见标签由 oas-form-item 承担）">
  <div style="display: flex; flex-direction: column; gap: 12px; width: 320px;">
    <oas-form-item label="增益">
      <oas-knob id="knob-label-demo" label="增益" value="-6" show-value unit="dB"></oas-knob>
    </oas-form-item>
    <oas-button onclick="document.getElementById('knob-label-out').textContent = 'aria-label = ' + document.getElementById('knob-label-demo').getAttribute('aria-label')">查看 aria-label</oas-button>
    <span id="knob-label-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  </div>
</DemoBlock>

`label` 写入旋钮的 `aria-label`（缺省回落内置文案「旋钮」）。旋钮不内置可见标签——用 `oas-form-item` 的 `label` 提供可见标签（点击可聚焦旋钮）。

## 事件

<DemoBlock title="拖拽 / 键盘 / 复位事件（oas-input 实时、oas-change 提交、oas-drag-* 起止、oas-reset 复位）">
  <div style="display: flex; gap: 24px; align-items: center;">
    <oas-knob id="knob-event" include-arc show-value value="40"></oas-knob>
    <oas-knob id="knob-event-reset" default-value="70" include-arc show-value value="20" label="双击我复位"></oas-knob>
  </div>
  <span id="knob-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-height: 20px"></span>
</DemoBlock>

事件契约（`detail` 均带 `value`）：

- `oas-input`：拖拽中 / 滚轮 / 键盘每次改值（实时）；
- `oas-change`：松手提交 / 键盘、滚轮每次完整确认（取消与零变化松手不派发）；
- `oas-drag-start`：指针按下并发生有效移动（无移动点按不派发）；
- `oas-drag-end`：松手（`cancelled: false`）或取消（`cancelled: true`，此时不派发 `oas-change`）；
- `oas-reset`：双击 / Ctrl+单击 / `reset()` 复位后（`detail: { value, defaultValue }`）。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  customElements.whenDefined('oas-knob').then(() => {
    const el = document.getElementById('knob-event')
    const resetEl = document.getElementById('knob-event-reset')
    const out = document.getElementById('knob-output')
    const show = (label, detail) => {
      if (out) out.textContent = `${label}: ${JSON.stringify(detail)}`
    }
    el?.addEventListener('oas-input', (e) => show('oas-input', e.detail))
    el?.addEventListener('oas-change', (e) => show('oas-change', e.detail))
    el?.addEventListener('oas-drag-start', (e) => show('oas-drag-start', e.detail))
    el?.addEventListener('oas-drag-end', (e) => show('oas-drag-end', e.detail))
    resetEl?.addEventListener('oas-reset', (e) => show('oas-reset', e.detail))
  })
})
</script>

## 触屏与边界

- Pointer Events 统一鼠标/触屏（`touch-action: none` 接管拖拽、主指针独占、`pointercancel` 取消回滚）；
- 拖拽中按 **Esc** 取消：回滚到起点值、零提交（不派发 `oas-change`）；
- 拖拽中外部写 `value`：显示保持拖拽值，松手时若拖拽已产生提交则拖拽值落盘，零变化松手则外部值保留显示；
- 触屏辅助技术对自定义 slider 手势的支持可能不完整（W3C ARIA APG 提示），移动端生产使用前请做真实 AT 测试。

## API

### oas-knob

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `axis` | 线性拖拽轴：`vertical`（默认，向上增值、150px 拖满量程）/ `horizontal`（向右增值）；`interaction=auto` 下作为偏好轴 | `string` | — |
| `default-value` | 复位目标值：双击 / Ctrl+单击 / `reset()` 复位到此值（吸附+夹取）；缺省回落 `min`；复位派发 `oas-reset`（不派发 `oas-change`） | `number \| null` | — |
| `disabled` | 禁用：不可聚焦（移除 tabindex）、拖拽/键盘/滚轮/复位全封、`aria-disabled="true"`、灰显（opacity .6） | `boolean` | — |
| `end-angle` | 扫角终点（默认 495，即 270° 扫角、底部留缺口）；可大于 360（如 510 = 210° 起顺时针 300°），sweep 上限 360 | — | — |
| `format` | 值格式化模板串：`${value}` 占位符替换为当前值（如 `"${value} dB"`）；输出同时进值文本与 `aria-valuetext`；优先级低于 `formatValue` 函数 | `string` | — |
| `include-arc` | 显示值弧：从 `start-point`（缺省 min）端填到当前值；值与起点重合时弧隐藏（防 round linecap 出圆点） | `boolean` | — |
| `indicator` | 指示器形态：`line`（径向指针线，默认）/ `dot`（近缘圆点）；非法值回落 line | `string` | — |
| `interaction` | 手势模型：`cursor`（指针方位角增量驱动，顺时针增值）/ `axis`（线性拖拽）/ `auto`（默认——起手前几像素解析：主方向与偏好轴一致走线性、垂直走圆周，解析后一次锁定不中途切换）；相对语义：按下不写值、无移动点按零操作、主指针独占 | `string` | `auto` |
| `label` | 旋钮可访问名（`aria-label`，不渲染可见标签——可见标签由 oas-form-item 承担）；缺省回落内置 i18n 文案「旋钮」 | `string` | — |
| `large-step` | 键盘大步步进量（Shift+方向键 / PageUp / PageDown 生效）；缺省为 10 × step（连续模式为量程 / 10） | `string` | — |
| `max` | 值域上界（默认 100） | `string` | `100` |
| `min` | 值域下界（默认 0）；非法或 `min > max` 自动交换容错 | `string` | `0` |
| `readonly` | 只读（与 `disabled` 分立）：仍可聚焦、值仍参与宿主收集，拖拽/键盘/滚轮/复位全部拦截，视觉不降饱和，`aria-readonly="true"` | `boolean` | — |
| `reverse` | 反向：值扫描镜像（min → end-angle、max → start-angle），圆周手势与键盘左右键同步镜像；与 RTL 书写方向取异或 | `boolean` | — |
| `show-value` | 在旋钮下方显示当前值文本（经 `formatValue` 函数 / `format` 模板 / `unit` 后缀格式化，与 `aria-valuetext` 同源） | `boolean` | — |
| `size` | 尺寸三档：sm（40px）/ md（56px，默认）/ lg（72px），也接受 small / medium / large 词表（支持 config-provider 注入），非法值回落 md；自定义直径走 CSS 变量 `--oas-knob-size`；触屏下 sm 档自动抬到 44px 触控目标下限 | `string` | `medium` |
| `start-angle` | 扫角起点（0° = 12 点方向、顺时针，默认 225）；`end-angle <= start-angle` 时归一化为最小 1° 扫角 | — | — |
| `start-point` | 值弧起点（缺省/非法回落 `min`，自动夹取到值域）；设为中心值即双极弧——值大于起点向一侧延伸、小于向另一侧延伸（pan/gain 双向零位） | `string` | — |
| `step` | 吸附步长（默认 1）；`0` 或负数视为连续（不吸附） | `string` | `1` |
| `unit` | 值后缀（如 `Hz`/`%`/`dB`）：输出进 show-value 值文本与 `aria-valuetext`；优先级低于 `format` 模板与 `formatValue` 函数 | `string` | — |
| `value` | 当前值（受控）：越界自动夹取到 `[min, max]` 并按 `step` 吸附；交互后写回属性（宿主可直接读属性取最新值） | `number` | `0` |
| `wheel` | 悬停滚轮调节（默认关）：上滚增值、下滚减值，一格 = `step`（连续模式为量程 1/50），Shift+滚轮 0.2× 精调；开启后 preventDefault 阻止页面滚动 | `boolean` | — |

#### Property（仅 JS property，不反射 attribute）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `defaultValue` | 复位目标值：读 `default-value` 属性（未设返回 null = 回落 min）；写数值反射到属性，写 null 清除 | `number \| null` | — |
| `formatValue` | 值格式化函数：`el.formatValue = (value) => string`，输出同时进 show-value 值文本与 `aria-valuetext`，优先级高于 `format` 属性与 `unit` 后缀，置 null 清除 | `((value: number) => string \| number \| null \| undefined) \| null` | — |
| `value` | 当前值：读返回夹取+吸附后的数值（拖拽中为拖拽实时值），写为受控赋值即生效（写受控属性并强制同步，不派发事件） | `number` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 松手提交 / 键盘与滚轮每次完整确认派发，`detail: { value }`；取消（Esc/pointercancel）与零变化松手不派发 |
| `oas-drag-end` | 拖拽结束派发，`detail: { value, cancelled }`；`cancelled=true` 表示取消路径（已回滚到起点值，不派发 `oas-change`） |
| `oas-drag-start` | 指针按下并发生有效移动（≥ 阈值）后派发，`detail: { value }`（起点值）；无移动点按不派发 |
| `oas-input` | 拖拽中 / 滚轮 / 键盘每次改值实时派发，`detail: { value }`（吸附后的当前值） |
| `oas-reset` | 复位手势（双击 / Ctrl+单击 / `reset()`）后派发，`detail: { value, defaultValue }` |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-knob-body` | 旋钮盘体颜色 | `var(--oas-color-bg-elevated)` |
| `--oas-knob-fill` | 值弧颜色（include-arc 开启时） | `var(--oas-color-primary)` |
| `--oas-knob-indicator` | 指示器（指针线/圆点）颜色 | `var(--oas-color-text-secondary-strong)` |
| `--oas-knob-size` | 旋钮直径（尺寸档 sm=40px / md=56px / lg=72px 的档值载体，直接覆盖即自定义直径） | `56px` |
| `--oas-knob-track` | 轨道弧颜色（全量程扫角弧） | `var(--oas-color-border)` |
| `--oas-knob-value-color` | show-value 值文本颜色 | `var(--oas-color-text-secondary)` |
