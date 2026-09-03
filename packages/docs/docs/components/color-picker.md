# ColorPicker 颜色选择器

触发色块弹出调色面板，支持 2D 饱和度-亮度色域 + hue 竖条选色、预设色、RGB 与 hex 输入、透明度通道、渐变模式（多 stop 编辑）、宽容格式解析、清空与受控开关；面板采用 fixed 视口定位，自动避让边缘翻转，也可 `inline` 就地渲染。

## 基础用法

<DemoBlock title="基础">
  <oas-color-picker id="cp-basic" value="#0b6cff"></oas-color-picker>
</DemoBlock>

点击触发器开关面板；在 2D 色域拖动选饱和度与亮度、右侧 hue 竖条选色相，或修改 RGB 数字 / 点击预设色即时生效。聚焦触发按钮后 `Esc` 或点击外部关闭。

## 自定义预设色

<DemoBlock title="自定义 preset（任意格式 + label 对象 + 行列）">
  <oas-color-picker id="cp-presets" preset-columns="5" preset-rows="2"
    preset='[{"color":"#0b6cff","label":"品牌蓝"},{"color":"#16a34a","label":"成功绿"},{"color":"red","label":"正红"},{"color":"hsl(35,100%,50%)","label":"品牌橙"},{"color":"#9333ea","label":"品牌紫"},{"color":"#18181b","label":"墨黑"},{"color":"transparent","label":"透明"},{"color":"rgba(255,0,0,0.4)","label":"半透明红"},{"color":"#0ea5e9","label":"天蓝"},{"color":"#e4e4e7","label":"浅灰"}]'></oas-color-picker>
</DemoBlock>

`preset` 接受 JSON 数组：字符串可为任意 CSS 颜色（颜色名 / `rgb()` / `hsl()` / hex 均可，宽容解析）；也支持 `{ color, label }` 对象，`label` 作为该色块的可访问名（屏幕阅读器朗读）。`preset-columns` / `preset-rows` 配置每行格数与展示行数（超出部分截断）。

## 禁用与只读

<DemoBlock title="disabled / readonly">
  <oas-color-picker value="#dc2626" disabled></oas-color-picker>
  <oas-color-picker id="cp-readonly" value="#0b6cff" readonly></oas-color-picker>
</DemoBlock>

`disabled` 完全禁用（触发器置灰不可点）；`readonly` 只读展示当前色值，触发器不可展开（不派发开关事件）。

## 尺寸

<DemoBlock title="size 三档">
  <oas-color-picker value="#16a34a" size="small"></oas-color-picker>
  <oas-color-picker value="#16a34a"></oas-color-picker>
  <oas-color-picker value="#16a34a" size="large"></oas-color-picker>
</DemoBlock>

`size="large" / 缺省 / size="small"` 复用 `--oas-control-height-*` 高度档位。

## 透明度通道

<DemoBlock title="透明度（show-alpha / disabled-alpha）">
  <oas-color-picker id="cp-alpha" show-alpha value="#0b6cff80"></oas-color-picker>
  <oas-color-picker id="cp-alpha-lock" show-alpha disabled-alpha value="#9333ea99"></oas-color-picker>
  <span id="cp-alpha-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 120px"></span>
</DemoBlock>

`show-alpha` 开启 alpha 滑杆与棋盘格底：半透明色块显示棋盘格，输出 8 位 hex（`#rrggbbaa`，配合 `color-format="rgb"` 输出 `rgba()`）。`disabled-alpha` 保留通道展示但滑杆禁用（已有透明度不丢）。

## 格式与宽容解析

<DemoBlock title="宽容解析 + color-format + uppercase">
  <oas-color-picker id="cp-format" value="red" color-format="rgb"></oas-color-picker>
  <oas-color-picker id="cp-upper" value="#0b6cff" uppercase></oas-color-picker>
  <oas-color-picker value="hsl(200, 90%, 55%)"></oas-color-picker>
</DemoBlock>

`value` 宽容解析：CSS 颜色名、`rgb()/hsl()`、3/4/6/8 位 hex 均可，统一归一化显示。`color-format="rgb"` 时显示与提交走 `rgb()/rgba()`；`uppercase` 让 hex 输出大写。

## 空值与清除

<DemoBlock title="clearable + value-on-clear">
  <oas-color-picker id="cp-clear" value="#16a34a" clearable></oas-color-picker>
  <span id="cp-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-color-picker value="#16a34a" clearable value-on-clear="#000000"></oas-color-picker>
</DemoBlock>

`clearable` 时展开面板出现清空按钮：清空后 `value` 置空并渲染「未选择」占位，派发 `oas-clear`（detail 为旧值）与 `oas-change`（detail 空串）。`value-on-clear` 配置清空后的回填值（如 `#000000`）。

## 触发器自定义

<DemoBlock title="自定义 trigger 插槽 + show-text">
  <oas-color-picker id="cp-slot" show-text value="#0b6cff">
    <span slot="trigger" style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      主题色
    </span>
  </oas-color-picker>
  <oas-color-picker value="#0b6cff" show-text="false"></oas-color-picker>
</DemoBlock>

`slot="trigger"` 完全自定义触发器内容（色值文本不受影响，可在触发内容旁展示）；`show-text="false"` 隐藏色值文本（默认 `true` 显示）。

## 受控开关

<DemoBlock title="受控 open + oas-open-change">
  <oas-color-picker id="cp-ctrl" value="#d97706"></oas-color-picker>
  <button id="cp-open-btn" type="button" style="height: var(--oas-control-height-md); padding: 0 var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-sm); background: var(--oas-color-bg); color: var(--oas-color-text-primary); cursor: pointer">打开</button>
  <button id="cp-close-btn" type="button" style="height: var(--oas-control-height-md); padding: 0 var(--oas-space-3); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-sm); background: var(--oas-color-bg); color: var(--oas-color-text-primary); cursor: pointer">关闭</button>
  <span id="cp-ctrl-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

`open` 属性为唯一真源（受控双向）：外部 `setAttribute/removeAttribute('open')` 与内部点击/外部点击/Esc 统一收敛，任何变化派发 `oas-open-change`（detail `{ open }`）；初始带 `open` 不派发。

## 吸管取色

<DemoBlock title="吸管（EyeDropper）">
  <oas-color-picker id="cp-eye" value="#dc2626"></oas-color-picker>
  <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">仅 Chromium 支持：展开面板后点击吸管图标，在屏幕任意处取色回填。不支持的环境自动隐藏按钮。</span>
</DemoBlock>

## 边缘自动避让（右缘触发复现）

<DemoBlock title="右缘触发不再溢出/裁切（修复验证）">
  <div style="box-sizing: border-box; width: 240px; margin-left: auto; overflow: hidden; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-3); background: var(--oas-color-bg-hover); display: flex; justify-content: flex-end">
    <oas-color-picker id="cp-edge" placement="bottom-end" value="#0b6cff"></oas-color-picker>
  </div>
  <span id="cp-edge-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin-top: var(--oas-space-2)">外观 tab 式右对齐场景：窄容器 `overflow: hidden` 且靠右。面板为 fixed 视口定位（12 向 `placement`，默认 `bottom`），打开后面板始终在视口内，不再撑出横向滚动条或被祖先裁切；空间不足自动夹取/换方向。</p>
</DemoBlock>

## 2D 色域面板

二期把 HSV 三滑轨重构为更标准的二维取色：SV 色域（横饱和度、纵亮度）+ hue 竖条。色域与竖条支持鼠标拖拽和方向键微调，ARIA 语义为 `role="slider"` + `aria-valuetext`（饱和度/亮度双维度）。

<DemoBlock title="2D 色域 + hue 竖条">
  <oas-color-picker id="cp-2d" value="#0b6cff"></oas-color-picker>
  <span id="cp-2d-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 130px"></span>
</DemoBlock>

## 渐变模式

`mode="gradient"` 进入渐变编辑：渐变轴上的每个 stop 独立选色，可添加/删除/拖动/键盘移动位置；value 输出 `linear-gradient(...)`。

<DemoBlock title="渐变（mode=gradient）">
  <oas-color-picker id="cp-grad" mode="gradient"
    value="linear-gradient(90deg, #0b6cff 0%, #16a34a 100%)"></oas-color-picker>
  <span id="cp-grad-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px; word-break: break-all"></span>
</DemoBlock>

<DemoBlock title="渐变 + 透明度（show-alpha）">
  <oas-color-picker mode="gradient" show-alpha
    value="linear-gradient(90deg, #0b6cff 0%, #16a34a 100%)"></oas-color-picker>
</DemoBlock>

## inline 独立面板

`inline` 让面板就地渲染（无 trigger/popup），宿主自组弹层场景下直接复用同一套取色控件。

<DemoBlock title="inline（纯面板）">
  <oas-color-picker inline id="cp-inline" value="#9333ea"></oas-color-picker>
  <oas-color-picker inline mode="gradient" value="linear-gradient(90deg, #d97706 0%, #dc2626 100%)"></oas-color-picker>
  <span id="cp-inline-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-color-picker id="cp-event" value="#0b6cff"></oas-color-picker>
  <span id="cp-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
function on(id, type, fn) {
  document.getElementById(id)?.addEventListener(type, fn)
}
function out(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}
onMounted(() => {
  on('cp-event', 'oas-change', (e) => out('cp-output', `oas-change: ${e.detail.value}`))
  on('cp-alpha', 'oas-change', (e) => out('cp-alpha-output', `oas-change: ${e.detail.value}`))
  on('cp-clear', 'oas-clear', (e) => out('cp-clear-output', `oas-clear: 已清除 ${e.detail.value}`))
  on('cp-ctrl', 'oas-open-change', (e) => out('cp-ctrl-output', `oas-open-change: ${e.detail.open}`))
  on('cp-open-btn', 'click', () => document.getElementById('cp-ctrl')?.setAttribute('open', ''))
  on('cp-close-btn', 'click', () => document.getElementById('cp-ctrl')?.removeAttribute('open'))
  on('cp-edge', 'oas-open-change', (e) =>
    out('cp-edge-output', `打开：面板定位 ${e.target.shadowRoot?.querySelector('[part="panel"]')?.getAttribute('data-placement') ?? ''}，保持在视口内`),
  )
  on('cp-2d', 'oas-change', (e) => out('cp-2d-output', `oas-change: ${e.detail.value}`))
  on('cp-grad', 'oas-change', (e) => out('cp-grad-output', `oas-change: ${e.detail.value}`))
  on('cp-inline', 'oas-change', (e) => out('cp-inline-output', `oas-change: ${e.detail.value}`))
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clearable` | — | `boolean` | — |
| `color-format` | — | `string` | `hex` |
| `disabled` | 禁用 | `boolean` | — |
| `disabled-alpha` | — | `boolean` | — |
| `inline` | — | `boolean` | — |
| `mode` | — | `string` | `single` |
| `open` | — | `boolean` | — |
| `placement` | — | `string` | `bottom` |
| `preset` | 预设色数组（JSON） | `string` | — |
| `preset-columns` | — | `string` | — |
| `preset-rows` | — | `string` | — |
| `readonly` | — | `boolean` | — |
| `show-alpha` | — | `boolean` | — |
| `show-text` | — | `string` | `true` |
| `size` | — | — | — |
| `uppercase` | — | `boolean` | — |
| `value` | 当前颜色（hex） | `string` | — |
| `value-on-clear` | — | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 颜色变化，`detail: { value }` |
| `oas-clear` | — |
| `oas-open-change` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `trigger` | — |

键盘：触发按钮聚焦时 `Enter`/`Space` 开关面板、`Esc` 关闭；面板内输入框聚焦时 `Esc` 关闭，外部点击关闭。
