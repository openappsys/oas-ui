# InputNumber 数字输入框

数字输入组件：内层为文本输入 + 数字键盘（`inputmode="decimal"`），带步进按钮、范围约束与格式化显示，`role="spinbutton"` 提供完整的数值 aria 状态。

## 基础用法

<DemoBlock title="基础用法">
  <oas-input-number value="5" placeholder="请输入数量" style="width: 160px"></oas-input-number>
</DemoBlock>

`placeholder` 透传内层输入框作为占位提示；未设置 `label` 时占位文本同时参与可访问名称回退链（见下方 label 一节）。

## 范围与步长

<DemoBlock title="min / max / step">
  <oas-input-number value="50" min="0" max="100" step="5" style="width: 160px"></oas-input-number>
</DemoBlock>

到达边界时对应步进按钮自动禁用。键入越界值**不会打断逐位输入**（先输 1 再补 00 凑 100 不受影响），失焦时矫正到范围内并临时以红边提示越界（见「校验态与越界提示」）。

## 精度

<DemoBlock title="precision">
  <oas-input-number value="1.5" step="0.1" precision="2" style="width: 160px"></oas-input-number>
</DemoBlock>

`precision` 同时控制显示与提交值的小数位数：`1.5` 显示为 `1.50`，步进与失焦矫正后保持两位小数。

## 尺寸

<DemoBlock title="size（sm / md / lg）">
  <oas-input-number value="5" size="sm" style="width: 140px"></oas-input-number>
  <oas-input-number value="5" style="width: 160px"></oas-input-number>
  <oas-input-number value="5" size="lg" style="width: 180px"></oas-input-number>
</DemoBlock>

`size` 三档对齐全局控件 token（`--oas-control-height-*` / `--oas-font-size-*`），默认 `md`。

## 步进按钮形态

<DemoBlock title="controls 显隐与 controls-position 位置">
  <oas-input-number value="5" controls="false" placeholder="隐藏步进钮（键盘 ↑↓ 仍可步进）" style="width: 220px"></oas-input-number>
  <oas-input-number value="5" style="width: 160px"></oas-input-number>
  <oas-input-number value="5" controls-position="both" style="width: 200px"></oas-input-number>
</DemoBlock>

- `controls` 默认显示步进按钮；`controls="false"` 隐藏（键盘 ↑↓ 步进仍然可用）
- `controls-position="right"`（默认）：输入框右侧上下箭头
- `controls-position="both"`：两侧 `- / +` 大按钮，触屏计数器场景更友好

按住步进按钮 800ms 后进入连击：每 100ms 自动步进一次，松手即停（内置行为，无需配置）。

## 前后缀

<DemoBlock title="prefix / suffix">
  <oas-input-number value="1280" prefix="¥" style="width: 160px"></oas-input-number>
  <oas-input-number value="30" suffix="%" style="width: 160px"></oas-input-number>
  <oas-input-number value="500" prefix="月销" suffix="件" style="width: 180px"></oas-input-number>
</DemoBlock>

`prefix` / `suffix` 为输入框内嵌装饰文案（不参与数值解析）；也支持同名插槽分发任意内容：`<span slot="prefix">…</span>`。

<DemoBlock title="clearable + 步进钮 + 后缀叠加">
  <oas-input-number value="1280" clearable suffix="元" style="width: 200px"></oas-input-number>
  <oas-input-number value="42" clearable prefix="¥" controls-position="both" style="width: 240px"></oas-input-number>
</DemoBlock>

`clearable` / 步进钮 / 前后缀可任意叠加：右侧元素按「步进钮区 → 清除钮 → 后缀」自左向右排布，全部内嵌在输入框内，输入文字按叠加总宽自动让位（`controls-position="both"` 时清除钮/后缀在框内让开右侧 `+` 钮）。

## 千分位与格式化（声明式）

<DemoBlock title="grouping 千分位">
  <oas-input-number value="1234567.89" grouping precision="2" style="width: 200px"></oas-input-number>
</DemoBlock>

<DemoBlock title="format 货币 / 百分比 / 单位">
  <oas-input-number value="1234.5" format="currency:USD" style="width: 180px"></oas-input-number>
  <oas-input-number value="0.15" format="percent" style="width: 160px"></oas-input-number>
  <oas-input-number value="1024" format="unit:GB" style="width: 160px"></oas-input-number>
</DemoBlock>

- `grouping`：千分位分组显示（解析时自动剥离分组符）
- `format`：Intl 风格声明式格式——`percent`（比率语义：`0.15` 显示 `15%`）、`currency:USD`、`unit:GB` 等，跟随宿主 locale
- 格式化后的可读文本会同步到 `aria-valuetext`，读屏朗读格式化结果

## 格式化（函数式）

<DemoBlock title="formatter / parser 函数 property">
  <oas-input-number id="num-fn-format" value="5" style="width: 200px"></oas-input-number>
</DemoBlock>

attribute 传不了函数，复杂格式通过 JS property 成对设置（优先于声明式格式属性）：

```js
el.formatter = (v) => `≈ ${v.toLocaleString()} 件`
el.parser = (s) => Number(s.replace(/[^0-9.\-]/g, ''))
```

`parser` 返回非有限数按非法输入处理（失焦还原上一个有效值）。上方示例的 `formatter` / `parser` 在本页底部统一的脚本块中挂接。

## 空值与可清空

<DemoBlock title="clearable 与空值语义">
  <oas-input-number id="num-clear" value="" clearable placeholder="未填写" min="0" max="100" style="width: 200px"></oas-input-number>
  <span id="num-clear-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

「未填」≠「0」：`value` 为空串（或未设置）时是空值态，`oas-change` 派发 `detail.value === null`，表单序列化为空串。输入数值后出现清除按钮，一键回到空值态（派发 `oas-clear` + `oas-change null`）。空值时步进从 `min`（设了 `min` 时）或 0 起步。

## 校验态与越界提示

<DemoBlock title="status 与越界临时红显">
  <oas-input-number value="3" status="error" style="width: 160px"></oas-input-number>
  <oas-input-number value="3" status="warning" style="width: 160px"></oas-input-number>
  <oas-input-number value="3" status="success" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-over" value="50" min="0" max="100" style="width: 160px"></oas-input-number>
</DemoBlock>

`status` 三态（`error` / `warning` / `success`）控制边框语义色，用于表单校验联动。第四个示例：键入 `200` 观察越界临时红边（不打断输入），失焦自动矫正回 `100`。

## 严格步进

<DemoBlock title="step-strictly">
  <oas-input-number value="0" step="12" step-strictly style="width: 160px"></oas-input-number>
</DemoBlock>

`step-strictly` 开启后，提交时值吸附到最近的 `step` 倍数（整箱 / 整打采购场景）：键入 `7` 失焦后变为 `12`，键入 `5` 变为 `0`。

## 只读

<DemoBlock title="readonly">
  <oas-input-number value="1280" readonly style="width: 160px"></oas-input-number>
</DemoBlock>

`readonly` 与 `disabled` 语义分立：可聚焦、可复制、值可提交，但步进按钮禁用、键盘与滚轮不改变值（`aria-readonly` 同步）。

## 滚轮步进

<DemoBlock title="wheel（默认关闭）">
  <oas-input-number value="50" wheel style="width: 160px"></oas-input-number>
</DemoBlock>

设置 `wheel` 后聚焦输入框时滚轮步进（上滚增、下滚减），并阻止页面滚动；默认关闭以防误触。

## 禁用

<DemoBlock title="禁用">
  <oas-input-number value="3" disabled style="width: 160px"></oas-input-number>
</DemoBlock>

## 无障碍名称（label）

<DemoBlock title="label（可访问名称）">
  <oas-input-number id="num-label" label="商品数量" value="3" style="width: 160px"></oas-input-number>
  <oas-input-number id="num-label-default" value="5" style="width: 160px"></oas-input-number>
  <span id="num-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 280px"></span>
</DemoBlock>

`label` 作为输入框的可访问名称（`aria-label`）：设置后读屏朗读该名称；未设置时依次回退 `placeholder` → 内置文案「数字输入框」。步进按钮「增加 / 减少」的可访问名称同样走内置文案。

## 事件

<DemoBlock title="变化事件">
  <oas-input-number id="num-event" value="5" min="0" max="10" clearable style="width: 200px"></oas-input-number>
  <span id="num-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

监听 `oas-change`（失焦 / Enter / 步进 / 滚轮 / 清空时触发，`detail: { value }`，`value` 为数字或 `null`）与 `oas-clear`（清除按钮点击）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 函数式 formatter/parser demo：千分位 + 前后缀的完全自定义格式（函数通道）
  const fnEl = document.getElementById('num-fn-format')
  if (fnEl) {
    fnEl.formatter = (v) => `≈ ${v.toLocaleString()} 件`
    fnEl.parser = (s) => Number(s.replace(/[^0-9.\-]/g, ''))
  }

  const el = document.getElementById('num-event')
  const out = document.getElementById('num-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = e.detail.value === null ? 'oas-change: null（空值）' : `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-clear', () => {
    out.textContent = 'oas-clear'
  })

  // 空值语义 demo：读回当前值语义
  const clearEl = document.getElementById('num-clear')
  const clearOut = document.getElementById('num-clear-output')
  clearEl?.addEventListener('oas-change', (e) => {
    const attr = clearEl.getAttribute('value')
    clearOut.textContent = e.detail.value === null ? '空值（value="" → null）' : `数字 ${attr}`
  })

  // label（可访问名称）demo：等组件升级后读取内层 input 的 aria-label
  const numLabelSet = document.getElementById('num-label')
  const numLabelFallback = document.getElementById('num-label-default')
  const numLabelOut = document.getElementById('num-label-output')
  const readNumLabel = () => {
    const a = numLabelSet?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    const b = numLabelFallback?.shadowRoot?.querySelector('input')?.getAttribute('aria-label')
    if (a !== undefined && b !== undefined) {
      numLabelOut.textContent = `aria-label：设置「${a}」 / 回退「${b}」`
    } else {
      setTimeout(readNumLabel, 60)
    }
  }
  readNumLabel()
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clearable` | 有值时显示清除按钮（一键回空值态） | `boolean` | — |
| `controls` | 步进按钮显隐（缺省显示；`controls="false"` 隐藏，键盘 ↑↓ 仍可步进） | — | — |
| `controls-position` | 按钮位置：`right`（默认，右侧上下箭头）/ `both`（两侧 −/+，触屏计数器形态） | — | — |
| `disabled` | 禁用 | `boolean` | — |
| `format` | Intl 风格声明式格式：`percent`（0.15→15%）/ `currency:USD` / `unit:GB`，跟随宿主 locale | `string` | — |
| `grouping` | 千分位分组显示（解析时自动剥离分组符） | `boolean` | — |
| `label` | 可访问名称（`aria-label` 来源，未设时回退内置文案「数字输入框」） | `string` | — |
| `max` | 范围，越界自动钳制 | `string` | — |
| `min` | 范围，越界自动钳制 | `string` | — |
| `placeholder` | 占位文本（参与 aria-label 回退链） | `string` | — |
| `precision` | 小数位数 | `string` | — |
| `prefix` | 内嵌前缀文案（slot="prefix" 可分发任意内容，不参与数值解析） | `string` | — |
| `readonly` | 只读：可聚焦可复制可提交，按钮禁用 + aria-readonly，键盘/滚轮不改值 | `boolean` | — |
| `size` | 尺寸档位 `sm` / `md`（默认）/ `lg`：控高与字号联动 | — | — |
| `status` | 校验态：`error` / `warning` / `success` 边框语义色 | — | — |
| `step` | 步长 | `string` | `1` |
| `step-strictly` | 严格步进：提交值吸附最近 step 倍数 | `boolean` | — |
| `suffix` | 内嵌后缀文案（slot="suffix" 同上） | `string` | — |
| `value` | 当前值（受控） | `string` | — |
| `wheel` | 聚焦时滚轮步进（上增下减；默认关防误触） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 步进或失焦变化，`detail: { value }`（数字） |
| `oas-clear` | 点击清除按钮时派发（值回空值态），`detail: {}` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `prefix` | 前缀内容插槽（不参与数值解析） |
| `suffix` | 后缀内容插槽（不参与数值解析） |
